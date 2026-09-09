"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedanceCallback = void 0;
const firestore_1 = require("firebase-admin/firestore");
const secrets_1 = require("../secrets");
const https_1 = require("firebase-functions/v2/https");
/**
 * Webhook preparado para Seedance (BytePlus ModelArk `callback_url`).
 *
 * Cuando SEEDANCE_CALLBACK_URL apunta a esta función (URL pública en producción)
 * y SEEDANCE_CALLBACK_TOKEN protege la llamada, ModelArk avisa aquí al terminar
 * cada tarea; el aviso se guarda en aiProviderCallbacks/{taskId} y el adaptador
 * lo usa para terminar antes su sondeo. Sin webhook, el sondeo a la API basta.
 * El cuerpo llega tal cual lo manda el proveedor (id, status, content, usage, error).
 */
exports.seedanceCallback = (0, https_1.onRequest)({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', secrets: secrets_1.CALLBACK_SECRETS }, async (request, response) => {
    var _a, _b, _c;
    if (request.method !== 'POST') {
        response.status(405).send('POST only');
        return;
    }
    const expected = process.env.SEEDANCE_CALLBACK_TOKEN;
    if (!expected || String(request.query.token || '') !== expected) {
        response.status(401).send('unauthorized');
        return;
    }
    const body = (request.body || {});
    const taskId = String((_b = (_a = body.id) !== null && _a !== void 0 ? _a : body.task_id) !== null && _b !== void 0 ? _b : '');
    if (!taskId) {
        response.status(400).send('missing task id');
        return;
    }
    await (0, firestore_1.getFirestore)()
        .collection('aiProviderCallbacks')
        .doc(taskId)
        .set({ provider: 'seedance', status: String((_c = body.status) !== null && _c !== void 0 ? _c : ''), payload: body, receivedAt: firestore_1.Timestamp.now() }, { merge: true });
    response.status(200).json({ ok: true });
});
//# sourceMappingURL=webhooks.js.map