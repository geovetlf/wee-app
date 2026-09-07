"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brainChat = exports.brainQuote = exports.guessExperience = exports.parseSuggestion = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const engine_1 = require("../engine");
const errors_1 = require("../engine/errors");
const limits_1 = require("../engine/limits");
const config_1 = require("../engine/config");
const aiPricing_1 = require("../credits/aiPricing");
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
/** Salida máxima de una respuesta de Weë Brain. Es el techo del coste de salida. */
const BRAIN_MAX_OUTPUT_TOKENS = 1400;
/** Últimos mensajes de la conversación, en el formato que entiende el motor. */
async function readHistory(messages) {
    const snap = await messages.orderBy('createdAt', 'desc').limit(MAX_HISTORY).get();
    return snap.docs
        .map((d) => d.data())
        .reverse()
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: String(m.text || '') }));
}
/**
 * Input EXACTO que recibe el motor. Lo usan por igual la cotización previa
 * (brainQuote) y el cobro real (brainChat): así el precio que ve la persona
 * y el que se le cobra salen del mismo sitio.
 */
function brainInput(message, history, files) {
    return {
        system: prompts_1.BRAIN_CHAT_SYSTEM,
        prompt: message,
        history,
        imageUrl: files.imageUrl,
        documentUrl: files.documentUrl,
        audioUrl: files.audioUrl,
        kind: 'answer',
        maxOutputTokens: BRAIN_MAX_OUTPUT_TOKENS,
        temperature: 0.7,
    };
}
/**
 * Precio de un mensaje de Weë Brain. Pasa por el mismo suelo que el resto:
 * coste oficial estimado del proveedor, margen y Credits por dólar del Credit
 * Engine. Si el historial, una foto, un documento o un audio encarecen la
 * petición, el precio sube solo; nunca baja del coste estimado.
 */
async function priceBrainMessage(input, webSearch) {
    const { settings } = await (0, config_1.loadConfig)();
    const capability = webSearch ? 'text.search' : 'text.generate';
    const service = webSearch ? 'ai_search' : 'ai_text';
    const price = (0, aiPricing_1.priceOperation)(capability, input, service, settings);
    return { price, settings, capability, service };
}
/**
 * Cuánto costaría el siguiente mensaje, antes de enviarlo. La app lo llama para
 * enseñar el precio junto al botón de enviar; no cobra ni escribe nada.
 */
exports.brainQuote = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB' }, async (request) => {
    var _a, _b;
    try {
        if (!request.auth)
            throw new errors_1.EngineError('UNAUTHORIZED');
        const uid = request.auth.uid;
        const data = (request.data || {});
        const message = (0, errors_1.assertText)((_a = data.message) !== null && _a !== void 0 ? _a : ' ', 'tu mensaje', 4000);
        const webSearch = data.webSearch === true;
        const files = {
            imageUrl: data.imageUrl ? (0, inputs_1.assertInputImageUrl)(data.imageUrl, uid) : undefined,
            documentUrl: data.documentUrl ? (0, inputs_1.assertAttachmentUrl)(data.documentUrl, uid, 'document') : undefined,
            audioUrl: data.audioUrl ? (0, inputs_1.assertAttachmentUrl)(data.audioUrl, uid, 'audio') : undefined,
        };
        let history = [];
        if (data.chatId) {
            const chatRef = (0, firestore_1.getFirestore)().collection('brainChats').doc(String(data.chatId));
            const snap = await chatRef.get();
            if (!snap.exists || ((_b = snap.data()) === null || _b === void 0 ? void 0 : _b.userId) !== uid)
                throw new errors_1.EngineError('INVALID_REQUEST', 'No encontramos esta conversación.');
            history = await readHistory(chatRef.collection('messages'));
        }
        const { price, settings, service } = await priceBrainMessage(brainInput(message, history, files), webSearch);
        return {
            service,
            label: webSearch ? 'Búsqueda con fuentes' : 'Respuesta de Weë Brain',
            credits: price.credits,
            usd: Number(price.usd.toFixed(5)),
            creditsPerUsd: settings.creditsPerUsd,
            detail: price.detail,
        };
    }
    catch (error) {
        throw (0, errors_1.toEngineHttpsError)(error);
    }
});
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
        const documentUrl = data.documentUrl ? (0, inputs_1.assertAttachmentUrl)(data.documentUrl, uid, 'document') : undefined;
        const audioUrl = data.audioUrl ? (0, inputs_1.assertAttachmentUrl)(data.audioUrl, uid, 'audio') : undefined;
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
        // El historial se lee ANTES de cobrar: encarece la petición y tiene que
        // estar dentro del precio, igual que las fotos y los documentos adjuntos.
        const history = await readHistory(messages);
        const engineInput = brainInput(message, history, { imageUrl, documentUrl, audioUrl });
        const { price } = await priceBrainMessage(engineInput, webSearch);
        const spend = await creditEngine_1.creditEngine.spendCredits({
            userId: uid,
            service,
            amount: price.credits,
            requestId,
            reason: webSearch ? 'Weë Brain · búsqueda' : 'Weë Brain',
            source: 'weë-brain',
            meta: Object.assign({ chatId: chatRef.id, estimatedUsd: price.usd }, price.detail),
        });
        if (isNew)
            await chatRef.set({ userId: uid, title: message.slice(0, 60), messageCount: 0, createdAt: now(), updatedAt: now() });
        await messages.doc(messageId).set(stripUndefined({ role: 'user', text: message, imageUrl, documentUrl, audioUrl, webSearch, createdAt: now() }));
        try {
            const run = await engine_1.engine.generate({
                capability: webSearch ? 'text.search' : 'text.generate',
                input: engineInput,
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
            await chatRef.set(Object.assign({ updatedAt: now(), messageCount: firestore_1.FieldValue.increment(2), lastMessage: parsed.text.slice(0, 120) }, (history.length === 0 ? { title: message.slice(0, 60) } : {})), { merge: true });
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