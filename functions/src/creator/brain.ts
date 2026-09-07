import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { engine } from '../engine';
import { assertText, EngineError, toEngineHttpsError } from '../engine/errors';
import { limiter } from '../engine/limits';
import { loadConfig } from '../engine/config';
import { SourceRef } from '../engine/types';
import { creditEngine } from '../credits/creditEngine';
import { assertRequestId } from '../credits/creditValidation';
import { usageTransactionId } from '../credits/creditTransactions';
import { ensureAccount } from './credits';
import { assertInputImageUrl } from './inputs';
import { BRAIN_CHAT_SYSTEM, BRAIN_SPECIALISTS } from './prompts';

/**
 * Weë Brain — el asistente general de Weë (docs/CREATOR.md §4).
 * Conversa con contexto, explica, investiga (búsqueda web con fuentes),
 * planifica, analiza fotos y detecta cuándo otro Weë lo hace mejor.
 *
 *   brainChats/{chatId}                { userId, title, lastMessage, messageCount, createdAt, updatedAt }
 *   brainChats/{chatId}/messages/{id}  { role: user | wee, text, imageUrl?, sources?, suggestedExperience?, credits?, createdAt }
 *
 * Cada respuesta pasa por el Credit Engine (ai_text, o ai_search con búsqueda):
 * requestId = brain_<messageId>, así que reenviar el mismo mensaje no cobra dos veces.
 * Motor: WEË AI ENGINE (text.generate / text.search → Gemini; modo demo sin clave).
 */
const MAX_HISTORY = 20;
const now = () => Timestamp.now();

export interface BrainAnswer {
  text: string;
  suggestedExperience?: string;
}

/** Saca la marca [[WEE:id]] con la que el modelo deriva a un especialista. */
export const parseSuggestion = (raw: string): BrainAnswer => {
  const match = raw.match(/\[\[\s*WEE\s*:\s*([a-z]+)\s*\]\]/i);
  const id = match?.[1]?.toLowerCase();
  const text = raw.replace(/\n?\s*\[\[\s*WEE\s*:\s*[a-z]+\s*\]\]\s*/gi, '').trim();
  return { text, suggestedExperience: id && BRAIN_SPECIALISTS[id] ? id : undefined };
};

/** Detección de intención por palabras clave (respaldo cuando el modelo no marca nada). */
const KEYWORDS: Record<string, string[]> = {
  design: ['logo', 'afiche', 'poster', 'póster', 'flyer', 'diseñ', 'ilustraci', 'portada', 'banner', 'personaje'],
  studio: ['video', 'anima', 'reel', 'weel', 'weël', 'anuncio en video', 'clip'],
  photo: ['foto', 'retocar', 'restaurar', 'quitar el fondo', 'fondo de', 'colorizar', 'imagen borrosa'],
  writer: ['escrib', 'redact', 'cuento', 'novela', 'guion', 'guión', 'artículo', 'articulo', 'email', 'correo', 'carta', 'traduc', 'resum', 'corrige', 'corregir', 'cv', 'currícul', 'curricul'],
  beauty: ['maquill', 'peinado', 'corte de pelo', 'cabello', 'barba', 'outfit', 'uñas', 'look'],
  chef: ['receta', 'cocin', 'menú', 'menu semanal', 'ingredientes', 'cena', 'almuerzo', 'postre'],
  home: ['sala', 'dormitorio', 'cuarto', 'cocina', 'decorar', 'remodel', 'jardín', 'jardin', 'mueble'],
  business: ['negocio', 'emprend', 'marketing', 'vender', 'ventas', 'clientes', 'campaña', 'campana', 'redes de mi', 'estrategia', 'presentación para', 'inversor'],
};

export const guessExperience = (message: string): string | undefined => {
  const lower = message.toLowerCase();
  const scores = Object.entries(KEYWORDS)
    .map(([id, words]) => [id, words.filter((w) => lower.includes(w)).length] as [string, number])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return scores[0]?.[0];
};

const stripUndefined = <T extends Record<string, unknown>>(value: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = v;
  return out as T;
};

export interface BrainChatInput {
  chatId?: string;
  message?: string;
  /** Id único del mensaje (lo genera la app): idempotencia del cobro y del registro. */
  messageId?: string;
  imageUrl?: string;
  webSearch?: boolean;
}

export const brainChat = onCall({ region: 'us-central1', timeoutSeconds: 120, memory: '512MiB' }, async (request) => {
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as BrainChatInput;
    const message = assertText(data.message, 'tu mensaje', 4000);
    const messageId = assertRequestId(data.messageId);
    const webSearch = data.webSearch === true;
    const imageUrl = data.imageUrl ? assertInputImageUrl(data.imageUrl, uid) : undefined;

    const db = getFirestore();
    let chatRef;
    let isNew = false;
    if (data.chatId) {
      chatRef = db.collection('brainChats').doc(String(data.chatId));
      const snap = await chatRef.get();
      if (!snap.exists || snap.data()?.userId !== uid) throw new EngineError('INVALID_REQUEST', 'No encontramos esta conversación.');
    } else {
      chatRef = db.collection('brainChats').doc();
      isNew = true;
    }
    const messages = chatRef.collection('messages');

    // Misma petición repetida (doble toque, reintento): se devuelve la respuesta ya dada
    const existing = await messages.doc(`${messageId}_wee`).get();
    if (existing.exists) {
      const prev = existing.data() || {};
      return { chatId: chatRef.id, messageId: existing.id, text: prev.text, sources: prev.sources || [], suggestedExperience: prev.suggestedExperience ?? null, credits: prev.credits || 0, demo: !!prev.demo, duplicate: true };
    }

    // Límites y Credits antes de llamar a la IA
    const { settings } = await loadConfig();
    await limiter.reserve(uid, { text: 1 }, settings.limits);
    await ensureAccount(uid);
    const service = webSearch ? 'ai_search' : 'ai_text';
    const requestId = `brain_${messageId}`;
    const spend = await creditEngine.spendCredits({
      userId: uid,
      service,
      requestId,
      reason: webSearch ? 'Weë Brain · búsqueda' : 'Weë Brain',
      source: 'weë-brain',
      meta: { chatId: chatRef.id },
    });

    if (isNew) await chatRef.set({ userId: uid, title: message.slice(0, 60), messageCount: 0, createdAt: now(), updatedAt: now() });
    const historySnap = await messages.orderBy('createdAt', 'desc').limit(MAX_HISTORY).get();
    const history = historySnap.docs
      .map((d) => d.data())
      .reverse()
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: String(m.text || '') }));
    await messages.doc(messageId).set(stripUndefined({ role: 'user', text: message, imageUrl, webSearch, createdAt: now() }));

    try {
      const run = await engine.generate({
        capability: webSearch ? 'text.search' : 'text.generate',
        input: { system: BRAIN_CHAT_SYSTEM, prompt: message, history, imageUrl, kind: 'answer', maxOutputTokens: 1400, temperature: 0.7 },
        userId: uid,
        jobId: chatRef.id,
        stepId: messageId,
        experienceId: 'brain',
        goal: message,
        requestId,
        service,
        creditTransactionId: usageTransactionId(requestId),
      });
      const parsed = parseSuggestion(run.output.content || '');
      const suggestedExperience = parsed.suggestedExperience || guessExperience(message);
      const sources: SourceRef[] = run.output.sources || [];
      const credits = spend.duplicate ? 0 : spend.amount;
      await messages.doc(`${messageId}_wee`).set(
        stripUndefined({ role: 'wee', text: parsed.text, sources, suggestedExperience, credits, generationId: run.generationId, demo: run.demo, webSearch, createdAt: now() })
      );
      await chatRef.set(
        { updatedAt: now(), messageCount: FieldValue.increment(2), lastMessage: parsed.text.slice(0, 120), ...(historySnap.empty ? { title: message.slice(0, 60) } : {}) },
        { merge: true }
      );
      await creditEngine.completeCredits({ userId: uid, requestId, meta: { chatId: chatRef.id, generationId: run.generationId } });
      return { chatId: chatRef.id, messageId: `${messageId}_wee`, text: parsed.text, sources, suggestedExperience: suggestedExperience ?? null, credits, demo: run.demo, duplicate: false };
    } catch (error) {
      await creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Brain · no pudo responder', source: 'weë-brain' }).catch((refundError) => {
        console.error('Weë Brain: no se pudo reembolsar', requestId, refundError);
      });
      throw error;
    }
  } catch (error) {
    throw toEngineHttpsError(error);
  }
});
