"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brainChat = exports.guessExperience = exports.parseSuggestion = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const engine_1 = require("../engine");
const errors_1 = require("../engine/errors");
const limits_1 = require("../engine/limits");
const config_1 = require("../engine/config");
const creditEngine_1 = require("../credits/creditEngine");
const creditValidation_1 = require("../credits/creditValidation");
const creditTransactions_1 = require("../credits/creditTransactions");
const credits_1 = require("./credits");
const inputs_1 = require("./inputs");
const prompts_1 = require("./prompts");
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
const now = () => firestore_1.Timestamp.now();
/** Saca la marca [[WEE:id]] con la que el modelo deriva a un especialista. */
const parseSuggestion = (raw) => {
    var _a;
    const match = raw.match(/\[\[\s*WEE\s*:\s*([a-z]+)\s*\]\]/i);
    const id = (_a = match === null || match === void 0 ? void 0 : match[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    const text = raw.replace(/\n?\s*\[\[\s*WEE\s*:\s*[a-z]+\s*\]\]\s*/gi, '').trim();
    return { text, suggestedExperience: id && prompts_1.BRAIN_SPECIALISTS[id] ? id : undefined };
};
exports.parseSuggestion = parseSuggestion;
/** Detección de intención por palabras clave (respaldo cuando el modelo no marca nada). */
const KEYWORDS = {
    design: ['logo', 'afiche', 'poster', 'póster', 'flyer', 'diseñ', 'ilustraci', 'portada', 'banner', 'personaje'],
    studio: ['video', 'anima', 'reel', 'weel', 'weël', 'anuncio en video', 'clip'],
    photo: ['foto', 'retocar', 'restaurar', 'quitar el fondo', 'fondo de', 'colorizar', 'imagen borrosa'],
    writer: ['escrib', 'redact', 'cuento', 'novela', 'guion', 'guión', 'artículo', 'articulo', 'email', 'correo', 'carta', 'traduc', 'resum', 'corrige', 'corregir', 'cv', 'currícul', 'curricul'],
    beauty: ['maquill', 'peinado', 'corte de pelo', 'cabello', 'barba', 'outfit', 'uñas', 'look'],
    chef: ['receta', 'cocin', 'menú', 'menu semanal', 'ingredientes', 'cena', 'almuerzo', 'postre'],
    home: ['sala', 'dormitorio', 'cuarto', 'cocina', 'decorar', 'remodel', 'jardín', 'jardin', 'mueble'],
    business: ['negocio', 'emprend', 'marketing', 'vender', 'ventas', 'clientes', 'campaña', 'campana', 'redes de mi', 'estrategia', 'presentación para', 'inversor'],
};
const guessExperience = (message) => {
    var _a;
    const lower = message.toLowerCase();
    const scores = Object.entries(KEYWORDS)
        .map(([id, words]) => [id, words.filter((w) => lower.includes(w)).length])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]);
    return (_a = scores[0]) === null || _a === void 0 ? void 0 : _a[0];
};
exports.guessExperience = guessExperience;
const stripUndefined = (value) => {
    const out = {};
    for (const [k, v] of Object.entries(value))
        if (v !== undefined)
            out[k] = v;
    return out;
};
exports.brainChat = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 120, memory: '512MiB' }, async (request) => {
    var _a, _b;
    try {
        if (!request.auth)
            throw new errors_1.EngineError('UNAUTHORIZED');
        const uid = request.auth.uid;
        const data = (request.data || {});
        const message = (0, errors_1.assertText)(data.message, 'tu mensaje', 4000);
        const messageId = (0, creditValidation_1.assertRequestId)(data.messageId);
        const webSearch = data.webSearch === true;
        const imageUrl = data.imageUrl ? (0, inputs_1.assertInputImageUrl)(data.imageUrl, uid) : undefined;
        const db = (0, firestore_1.getFirestore)();
        let chatRef;
        let isNew = false;
        if (data.chatId) {
            chatRef = db.collection('brainChats').doc(String(data.chatId));
            const snap = await chatRef.get();
            if (!snap.exists || ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.userId) !== uid)
                throw new errors_1.EngineError('INVALID_REQUEST', 'No encontramos esta conversación.');
        }
        else {
            chatRef = db.collection('brainChats').doc();
            isNew = true;
        }
        const messages = chatRef.collection('messages');
        // Misma petición repetida (doble toque, reintento): se devuelve la respuesta ya dada
        const existing = await messages.doc(`${messageId}_wee`).get();
        if (existing.exists) {
            const prev = existing.data() || {};
            return { chatId: chatRef.id, messageId: existing.id, text: prev.text, sources: prev.sources || [], suggestedExperience: (_b = prev.suggestedExperience) !== null && _b !== void 0 ? _b : null, credits: prev.credits || 0, demo: !!prev.demo, duplicate: true };
        }
        // Límites y Credits antes de llamar a la IA
        const { settings } = await (0, config_1.loadConfig)();
        await limits_1.limiter.reserve(uid, { text: 1 }, settings.limits);
        await (0, credits_1.ensureAccount)(uid);
        const service = webSearch ? 'ai_search' : 'ai_text';
        const requestId = `brain_${messageId}`;
        const spend = await creditEngine_1.creditEngine.spendCredits({
            userId: uid,
            service,
            requestId,
            reason: webSearch ? 'Weë Brain · búsqueda' : 'Weë Brain',
            source: 'weë-brain',
            meta: { chatId: chatRef.id },
        });
        if (isNew)
            await chatRef.set({ userId: uid, title: message.slice(0, 60), messageCount: 0, createdAt: now(), updatedAt: now() });
        const historySnap = await messages.orderBy('createdAt', 'desc').limit(MAX_HISTORY).get();
        const history = historySnap.docs
            .map((d) => d.data())
            .reverse()
            .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: String(m.text || '') }));
        await messages.doc(messageId).set(stripUndefined({ role: 'user', text: message, imageUrl, webSearch, createdAt: now() }));
        try {
            const run = await engine_1.engine.generate({
                capability: webSearch ? 'text.search' : 'text.generate',
                input: { system: prompts_1.BRAIN_CHAT_SYSTEM, prompt: message, history, imageUrl, kind: 'answer', maxOutputTokens: 1400, temperature: 0.7 },
                userId: uid,
                jobId: chatRef.id,
                stepId: messageId,
                experienceId: 'brain',
                goal: message,
                requestId,
                service,
                creditTransactionId: (0, creditTransactions_1.usageTransactionId)(requestId),
            });
            const parsed = (0, exports.parseSuggestion)(run.output.content || '');
            const suggestedExperience = parsed.suggestedExperience || (0, exports.guessExperience)(message);
            const sources = run.output.sources || [];
            const credits = spend.duplicate ? 0 : spend.amount;
            await messages.doc(`${messageId}_wee`).set(stripUndefined({ role: 'wee', text: parsed.text, sources, suggestedExperience, credits, generationId: run.generationId, demo: run.demo, webSearch, createdAt: now() }));
            await chatRef.set(Object.assign({ updatedAt: now(), messageCount: firestore_1.FieldValue.increment(2), lastMessage: parsed.text.slice(0, 120) }, (historySnap.empty ? { title: message.slice(0, 60) } : {})), { merge: true });
            await creditEngine_1.creditEngine.completeCredits({ userId: uid, requestId, meta: { chatId: chatRef.id, generationId: run.generationId } });
            return { chatId: chatRef.id, messageId: `${messageId}_wee`, text: parsed.text, sources, suggestedExperience: suggestedExperience !== null && suggestedExperience !== void 0 ? suggestedExperience : null, credits, demo: run.demo, duplicate: false };
        }
        catch (error) {
            await creditEngine_1.creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Brain · no pudo responder', source: 'weë-brain' }).catch((refundError) => {
                console.error('Weë Brain: no se pudo reembolsar', requestId, refundError);
            });
            throw error;
        }
    }
    catch (error) {
        throw (0, errors_1.toEngineHttpsError)(error);
    }
});
//# sourceMappingURL=brain.js.map