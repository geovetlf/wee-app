"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.brainChat = exports.brainQuote = exports.guessExperience = exports.parseSuggestion = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const engine_1 = require("../engine");
const errors_1 = require("../engine/errors");
const limits_1 = require("../engine/limits");
const config_1 = require("../engine/config");
const aiPricing_1 = require("../credits/aiPricing");
const pricing_1 = require("../engine/pricing");
const deepseek_1 = require("../engine/providers/deepseek");
const creditEngine_1 = require("../credits/creditEngine");
const creditValidation_1 = require("../credits/creditValidation");
const brainUsage_1 = require("./brainUsage");
const creditTransactions_1 = require("../credits/creditTransactions");
const ledger_1 = require("../engine/ledger");
const credits_1 = require("./credits");
const inputs_1 = require("./inputs");
const prompts_1 = require("./prompts");
const secrets_1 = require("../secrets");
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
/**
 * CON QUÉ MODELO CONVERSA WEË BRAIN (decisión del usuario, 2026-09-16).
 *
 * DeepSeek-V4.1-Flash, por su API oficial. Se elige por COSTE y por nada más:
 * conversar cuesta aquí la mitad que con el modelo de texto más barato de
 * Google, y Brain es la puerta que más se abre en Weë.
 *
 * Se pide POR SU NOMBRE, no por la cadena. El router descarta solo a los demás
 * proveedores —ninguno tiene este identificador— y así ninguna otra sección de
 * Weë cambia de modelo: Studio, Writer, Chef, Business, Travel y Design siguen
 * entrando por donde entraban.
 *
 * Esto NO es un orquestador ni un router nuevo: es un modelo fijo, elegido a
 * mano, con el mecanismo que el motor ya tenía (`prefs.modelId`). El día que
 * Weë Brain tenga su orquestador, esta constante desaparece y la elección la
 * hará él (CLAUDE.md §10).
 *
 * La BÚSQUEDA con fuentes no pasa por aquí: la sirve Gemini con Google Search
 * grounding, y se queda como estaba.
 */
const MODELO_DE_BRAIN = ((_a = process.env.BRAIN_TEXT_MODEL) === null || _a === void 0 ? void 0 : _a.trim()) || deepseek_1.DEEPSEEK_TEXT_MODEL;
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
function brainInput(message, history, files, locale) {
    return {
        /* El prompt de siempre, más en qué idioma toca contestar hoy. */
        system: `${prompts_1.BRAIN_CHAT_SYSTEM} ${(0, prompts_1.instruccionDeIdioma)(locale)}`,
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
    /*
     * Weë Brain se cobra con SU servicio, no con el de todo el texto de Weë.
     *
     * `ai_text` lo comparten la receta de Weë Chef y los pasos de texto de Studio,
     * Travel, Business y Design; `ai_brain` es solo de aquí, y por eso puede tener
     * su propio margen y su propio modo sin tocarles el precio a ellas. La búsqueda
     * con fuentes sigue siendo `ai_search`, como siempre.
     */
    const service = webSearch ? 'ai_search' : 'ai_brain';
    /*
     * Se cotiza con la tarifa del modelo que VA a responder, que aquí se conoce de
     * antemano porque Brain lo pide por su nombre. La búsqueda no lo pide, así que
     * sigue cotizándose con el techo por nivel, como siempre.
     */
    const modelo = webSearch ? undefined : (0, pricing_1.tarifaDeModeloDeTexto)(MODELO_DE_BRAIN);
    const price = (0, aiPricing_1.priceOperation)(capability, input, service, settings, modelo);
    return { price, settings, capability, service };
}
/**
 * Cuánto costaría el siguiente mensaje, antes de enviarlo. La app lo llama para
 * enseñar el precio junto al botón de enviar; no cobra ni escribe nada.
 */
exports.brainQuote = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', secrets: secrets_1.AI_SECRETS }, async (request) => {
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
        /* El idioma entra ya en la cotización: la instrucción va en el prompt y cuenta tokens. */
        const { price, settings, service } = await priceBrainMessage(brainInput(message, history, files, data.locale), webSearch);
        /*
         * Lo que va a costar ESTE mensaje, que en la conversación ya no es siempre lo
         * mismo: once de cada doce respuestas no cobran nada, y la duodécima cobra el
         * Credit del bloque entero. La búsqueda sigue cobrando por mensaje.
         *
         * El coste del proveedor (`usd`) se sigue enseñando tal cual: es lo que
         * REALMENTE cuesta esa respuesta, y no cambia porque el cobro vaya por bloques.
         */
        const bloque = webSearch ? undefined : await (0, brainUsage_1.bloqueDe)(uid);
        const cobra = !bloque || bloque.usadas === brainUsage_1.RESPUESTAS_POR_CREDIT - 1;
        return {
            service,
            label: webSearch ? 'Búsqueda con fuentes' : 'Respuesta de Weë Brain',
            credits: cobra ? price.credits : 0,
            usd: Number(price.usd.toFixed(5)),
            creditsPerUsd: settings.creditsPerUsd,
            detail: price.detail,
            bloque,
        };
    }
    catch (error) {
        throw (0, errors_1.toEngineHttpsError)(error);
    }
});
exports.brainChat = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 120, memory: '512MiB', secrets: secrets_1.AI_SECRETS }, async (request) => {
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
            return { chatId: chatRef.id, messageId: existing.id, text: prev.text, sources: prev.sources || [], suggestedExperience: (_b = prev.suggestedExperience) !== null && _b !== void 0 ? _b : null, credits: prev.credits || 0, demo: !!prev.demo, duplicate: true, bloque: await (0, brainUsage_1.bloqueDe)(uid) };
        }
        // Límites y Credits antes de llamar a la IA
        const { settings } = await (0, config_1.loadConfig)();
        await limits_1.limiter.reserve(uid, { text: 1 }, settings.limits);
        await (0, credits_1.ensureAccount)(uid);
        /* El mismo servicio con el que se cotizó: lo que se enseña y lo que se cobra son uno. */
        const service = webSearch ? 'ai_search' : 'ai_brain';
        const requestId = `brain_${messageId}`;
        // El historial se lee ANTES de cobrar: encarece la petición y tiene que
        // estar dentro del precio, igual que las fotos y los documentos adjuntos.
        const history = await readHistory(messages);
        const engineInput = brainInput(message, history, { imageUrl, documentUrl, audioUrl }, data.locale);
        const { price } = await priceBrainMessage(engineInput, webSearch);
        /*
         * ── QUIÉN COBRA Y CUÁNDO ─────────────────────────────────────────────────
         *
         * La BÚSQUEDA con fuentes se cobra como siempre, por mensaje y por adelantado:
         * es otra operación, con otro servicio (`ai_search`) y otro precio, y no entra
         * en el bloque de doce.
         *
         * La CONVERSACIÓN va por bloques (decisión del usuario, 2026-09-16): doce
         * respuestas por un Credit. Y eso obliga a cambiar el orden de las cosas. Antes
         * se cobraba primero y se generaba después; ahora no se puede saber si toca
         * cobrar hasta que la respuesta EXISTE, porque lo que cuenta son respuestas
         * entregadas y no mensajes enviados.
         *
         * Lo que no se pierde por el camino es la promesa de que nada se ejecuta sin
         * saldo: cuando la siguiente respuesta es la que cierra el bloque, el saldo se
         * comprueba ANTES de llamar al modelo, con el mismo error de siempre. Así nadie
         * llega a generar algo que luego no puede pagar.
         */
        let spend = null;
        /*
         * ¿Le va a costar algo ESTE mensaje? Es la misma cuenta que hace `brainQuote`
         * para enseñarle el precio a la persona antes de enviar: la búsqueda siempre
         * cobra, y la conversación solo cuando la respuesta cierra el bloque de doce.
         *
         * Se calcula una vez y sirve para dos cosas: comprobar el saldo antes de
         * llamar al modelo, y decirle al libro lo que de verdad se le cobra. Así lo
         * que ve la persona, lo que se cobra y lo que queda anotado son el mismo número.
         */
        const cierraElBloque = !webSearch && (await (0, brainUsage_1.bloqueDe)(uid)).usadas === brainUsage_1.RESPUESTAS_POR_CREDIT - 1;
        const creditsDelMensaje = webSearch || cierraElBloque ? price.credits : 0;
        if (webSearch) {
            spend = await creditEngine_1.creditEngine.spendCredits({
                userId: uid,
                service,
                amount: price.credits,
                requestId,
                reason: 'Weë Brain · búsqueda',
                source: 'weë-brain',
                meta: Object.assign({ chatId: chatRef.id, estimatedUsd: price.usd }, price.detail),
            });
        }
        else if (cierraElBloque) {
            const saldo = await creditEngine_1.creditEngine.getBalance(uid);
            if (saldo.balance < price.credits) {
                throw new creditValidation_1.CreditError('INSUFFICIENT_CREDITS', 'No tienes suficientes Credits', {
                    required: price.credits,
                    available: saldo.balance,
                    service,
                });
            }
        }
        if (isNew)
            await chatRef.set({ userId: uid, title: message.slice(0, 60), messageCount: 0, createdAt: now(), updatedAt: now() });
        await messages.doc(messageId).set(stripUndefined({ role: 'user', text: message, imageUrl, documentUrl, audioUrl, webSearch, createdAt: now() }));
        try {
            const run = await engine_1.engine.generate(Object.assign(Object.assign({ capability: webSearch ? 'text.search' : 'text.generate' }, (webSearch ? null : { prefs: { modelId: MODELO_DE_BRAIN, allowedProviders: ['deepseek'] } })), { input: engineInput, userId: uid, jobId: chatRef.id, stepId: messageId, experienceId: 'brain', goal: message, requestId,
                service, 
                /* Lo que el libro tiene que anotar: el motor no conoce el bloque de doce. */
                creditsEstimated: creditsDelMensaje, creditTransactionId: (0, creditTransactions_1.usageTransactionId)(requestId) }));
            const parsed = (0, exports.parseSuggestion)(run.output.content || '');
            const suggestedExperience = parsed.suggestedExperience || (0, exports.guessExperience)(message);
            const sources = run.output.sources || [];
            /*
             * La respuesta ya existe: ahora sí cuenta, y ahora sí se sabe si cobra.
             *
             * `contarRespuesta` es idempotente por `messageId`: si esta misma respuesta
             * ya se apuntó —un reintento, una repetición de la llamada—, devuelve lo que
             * se decidió entonces y no mueve el bloque. Y `spendCredits` lo es por
             * `requestId`, que es el mismo mensaje. Las dos puertas cierran el doble cobro.
             */
            if (!webSearch) {
                const consumo = await (0, brainUsage_1.contarRespuesta)(uid, messageId);
                if (consumo.cobrada) {
                    try {
                        spend = await creditEngine_1.creditEngine.spendCredits({
                            userId: uid,
                            service,
                            amount: price.credits,
                            requestId,
                            reason: `Weë Brain · ${brainUsage_1.RESPUESTAS_POR_CREDIT} respuestas`,
                            source: 'weë-brain',
                            meta: Object.assign({ chatId: chatRef.id, estimatedUsd: price.usd, respuestasDelBloque: brainUsage_1.RESPUESTAS_POR_CREDIT }, price.detail),
                        });
                    }
                    catch (error) {
                        /*
                         * Generó, cerró el bloque y el cobro no pasó (saldo justo que cambió
                         * entre la comprobación y el cobro). Se devuelve el bloque a donde
                         * estaba: ni doce respuestas regaladas, ni nadie atascado en el 12.
                         */
                        await (0, brainUsage_1.deshacerRespuesta)(uid, messageId).catch((e) => console.error('Weë Brain: no se pudo deshacer el bloque', messageId, e));
                        throw error;
                    }
                }
            }
            const credits = !spend || spend.duplicate ? 0 : spend.amount;
            await messages.doc(`${messageId}_wee`).set(stripUndefined({ role: 'wee', text: parsed.text, sources, suggestedExperience, credits, generationId: run.generationId, demo: run.demo, webSearch, createdAt: now() }));
            await chatRef.set(Object.assign({ updatedAt: now(), messageCount: firestore_1.FieldValue.increment(2), lastMessage: parsed.text.slice(0, 120) }, (history.length === 0 ? { title: message.slice(0, 60) } : {})), { merge: true });
            /* Solo hay libro que liquidar si hubo cobro: once de cada doce respuestas no lo tienen. */
            if (spend) {
                await creditEngine_1.creditEngine.completeCredits({ userId: uid, requestId, meta: { chatId: chatRef.id, generationId: run.generationId } });
                // El desenlace ya se conoce: se liquida el libro con lo capturado.
                await ledger_1.firestoreLedger
                    .settle({ creditTransactionId: (0, creditTransactions_1.usageTransactionId)(requestId), finalAmount: spend.amount })
                    .catch((error) => console.error('Weë Brain: no se pudo liquidar el libro', requestId, error));
            }
            return { chatId: chatRef.id, messageId: `${messageId}_wee`, text: parsed.text, sources, suggestedExperience: suggestedExperience !== null && suggestedExperience !== void 0 ? suggestedExperience : null, credits, demo: run.demo, duplicate: false, bloque: await (0, brainUsage_1.bloqueDe)(uid) };
        }
        catch (error) {
            /*
             * Solo se reembolsa lo que se llegó a cobrar. En la conversación por bloques
             * el cobro va DESPUÉS de responder, así que una generación fallida no dejó
             * nada cobrado —ni gastó bloque, porque `contarRespuesta` tampoco llegó a
             * ejecutarse—. La búsqueda sí cobra por delante, y esa sí se devuelve.
             */
            if (spend) {
                await creditEngine_1.creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Brain · no pudo responder', source: 'weë-brain' }).catch((refundError) => {
                    console.error('Weë Brain: no se pudo reembolsar', requestId, refundError);
                });
                // Reembolsado: ninguna fila puede quedar diciendo que cobró.
                await ledger_1.firestoreLedger
                    .settle({ creditTransactionId: (0, creditTransactions_1.usageTransactionId)(requestId), finalAmount: 0 })
                    .catch((error) => console.error('Weë Brain: no se pudo liquidar el libro', requestId, error));
            }
            throw error;
        }
    }
    catch (error) {
        throw (0, errors_1.toEngineHttpsError)(error);
    }
});
//# sourceMappingURL=brain.js.map