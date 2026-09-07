"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAtLeast = exports.DECLARED = void 0;
exports.recordRealSuccess = recordRealSuccess;
exports.verificationStatus = verificationStatus;
const firestore_1 = require("firebase-admin/firestore");
/**
 * HASTA DÓNDE ESTÁ COMPROBADA CADA INTEGRACIÓN.
 *
 * Weë distingue cinco estados y no se salta ninguno:
 *
 *   CODE_COMPLETE          El adaptador está escrito y compila.
 *   TESTED_WITH_MOCK       Hay pruebas con respuestas simuladas de esa API.
 *   DOCUMENTATION_VERIFIED El contrato se leyó en la documentación oficial del proveedor.
 *   REAL_API_VERIFIED      El proveedor respondió de verdad al menos una vez.
 *   PRODUCTION_READY       Además se midió el coste real y el precio está ajustado.
 *
 * Los tres primeros se declaran aquí. Los dos últimos NO se ponen a mano: el
 * router escribe `aiProviderVerification/{proveedor}` la primera vez que ese
 * proveedor devuelve un resultado real, y de ahí sale REAL_API_VERIFIED.
 */
/** Estado declarado de cada proveedor, sin contar las llamadas reales. */
exports.DECLARED = {
    gemini: {
        state: 'DOCUMENTATION_VERIFIED',
        credential: 'GEMINI_API_KEY',
        docsUrl: 'https://ai.google.dev/gemini-api/docs',
        firstTest: 'Poner la clave de Google AI Studio y pedir un texto corto en Weë Brain.',
        documentedAt: '2026-09-07',
    },
    seedance: {
        state: 'DOCUMENTATION_VERIFIED',
        credential: 'ARK_API_KEY',
        docsUrl: 'https://docs.byteplus.com/en/docs/ModelArk',
        firstTest: 'Activar los modelos en la consola de BytePlus y generar un clip de 5 s a 480p en Weë Studio (unos USD 0.27).',
        documentedAt: '2026-09-07',
    },
    seedream: {
        state: 'DOCUMENTATION_VERIFIED',
        credential: 'ARK_API_KEY',
        docsUrl: 'https://docs.byteplus.com/en/docs/ModelArk/1541523',
        firstTest: 'Con la misma clave de ModelArk, generar una imagen desde Weë Design.',
        documentedAt: '2026-09-07',
    },
    flux: {
        state: 'DOCUMENTATION_VERIFIED',
        credential: 'BFL_API_KEY',
        docsUrl: 'https://docs.bfl.ai',
        firstTest: 'Poner la clave de Black Forest Labs y crear una imagen sencilla (unos USD 0.015 con FLUX.2 klein).',
        documentedAt: '2026-09-07',
    },
    elevenlabs: {
        state: 'DOCUMENTATION_VERIFIED',
        credential: 'ELEVENLABS_API_KEY',
        docsUrl: 'https://elevenlabs.io/docs/api-reference/text-to-speech/convert',
        firstTest: 'Poner la clave y una voz en español en ELEVENLABS_VOICE_ID, y grabar una narración corta en Weë Studio.',
        documentedAt: '2026-09-07',
    },
    claude: {
        state: 'DOCUMENTATION_VERIFIED',
        credential: 'ANTHROPIC_API_KEY',
        docsUrl: 'https://platform.claude.com/docs/en/api/messages',
        firstTest: 'Poner la clave y pedir un guion largo en Weë Writers, que es lo que sube al modelo de razonamiento.',
        documentedAt: '2026-09-07',
    },
    openai: {
        state: 'DOCUMENTATION_VERIFIED',
        credential: 'OPENAI_API_KEY',
        docsUrl: 'https://developers.openai.com/api/docs',
        firstTest: 'Poner la clave y desactivar temporalmente gemini en aiProviders para que la cadena llegue a OpenAI.',
        documentedAt: '2026-09-07',
    },
    minimax: {
        state: 'TESTED_WITH_MOCK',
        credential: 'MINIMAX_API_KEY',
        docsUrl: 'https://platform.minimax.io/docs/api-reference/speech-t2a-http',
        firstTest: 'Poner la clave y confirmar el precio por carácter en la consola de MiniMax antes de usarlo en producción.',
        documentedAt: '2026-09-07',
    },
    'music-pending': {
        state: 'CODE_COMPLETE',
        credential: '—',
        docsUrl: '—',
        firstTest: 'Weë Music está pausada: no hay proveedor que probar.',
    },
    mock: {
        state: 'PRODUCTION_READY',
        credential: '—',
        docsUrl: '—',
        firstTest: 'No llama a ninguna API: es el modo demo.',
    },
};
const ORDER = ['CODE_COMPLETE', 'TESTED_WITH_MOCK', 'DOCUMENTATION_VERIFIED', 'REAL_API_VERIFIED', 'PRODUCTION_READY'];
const isAtLeast = (state, minimum) => ORDER.indexOf(state) >= ORDER.indexOf(minimum);
exports.isAtLeast = isAtLeast;
const collection = () => (0, firestore_1.getFirestore)().collection('aiProviderVerification');
/**
 * Deja constancia de que un proveedor respondió de verdad. Lo llama el router
 * tras una generación real (nunca en modo demo). Solo escribe la primera vez y
 * después actualiza la última, para no castigar Firestore en cada llamada.
 */
async function recordRealSuccess(provider, model, capability, generationId) {
    var _a;
    if (!provider || provider === 'mock')
        return;
    try {
        const ref = collection().doc(provider);
        const snap = await ref.get();
        const now = new Date().toISOString();
        if (!snap.exists) {
            await ref.set({ provider, firstSuccessAt: now, lastSuccessAt: now, model, capability, generationId: generationId !== null && generationId !== void 0 ? generationId : null, successes: 1 });
            console.log(`WEË AI ENGINE: primera llamada real verificada con ${provider} (${model})`);
            return;
        }
        await ref.set({ lastSuccessAt: now, model, capability, successes: (Number((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.successes) || 0) + 1 }, { merge: true });
    }
    catch (error) {
        // Registrar la verificación nunca puede tumbar una generación que ya salió bien
        console.error(`WEË AI ENGINE: no se pudo registrar la verificación de ${provider}:`, error);
    }
}
/** Estado de verificación de todos los proveedores, para el panel de administración. */
async function verificationStatus(configured) {
    let real = {};
    try {
        const snap = await collection().get();
        for (const doc of snap.docs)
            real[doc.id] = doc.data();
    }
    catch (_a) {
        real = {};
    }
    return Object.entries(exports.DECLARED).map(([provider, declared]) => {
        const seen = real[provider];
        const effective = (seen === null || seen === void 0 ? void 0 : seen.firstSuccessAt) && !(0, exports.isAtLeast)(declared.state, 'REAL_API_VERIFIED') ? 'REAL_API_VERIFIED' : declared.state;
        return Object.assign(Object.assign({ provider }, declared), { effective, configured: !!configured[provider], firstSuccessAt: seen === null || seen === void 0 ? void 0 : seen.firstSuccessAt, lastSuccessAt: seen === null || seen === void 0 ? void 0 : seen.lastSuccessAt, successes: seen === null || seen === void 0 ? void 0 : seen.successes });
    });
}
//# sourceMappingURL=verification.js.map