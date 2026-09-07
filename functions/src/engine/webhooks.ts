import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

/**
 * Webhook preparado para Seedance (BytePlus ModelArk `callback_url`).
 *
 * Cuando SEEDANCE_CALLBACK_URL apunta a esta función (URL pública en producción)
 * y SEEDANCE_CALLBACK_TOKEN protege la llamada, ModelArk avisa aquí al terminar
 * cada tarea; el aviso se guarda en aiProviderCallbacks/{taskId} y el adaptador
 * lo usa para terminar antes su sondeo. Sin webhook, el sondeo a la API basta.
 * El cuerpo llega tal cual lo manda el proveedor (id, status, content, usage, error).
 */
export const seedanceCallback = onRequest({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB' }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('POST only');
    return;
  }
  const expected = process.env.SEEDANCE_CALLBACK_TOKEN;
  if (!expected || String(request.query.token || '') !== expected) {
    response.status(401).send('unauthorized');
    return;
  }
  const body = (request.body || {}) as Record<string, unknown>;
  const taskId = String(body.id ?? body.task_id ?? '');
  if (!taskId) {
    response.status(400).send('missing task id');
    return;
  }
  await getFirestore()
    .collection('aiProviderCallbacks')
    .doc(taskId)
    .set({ provider: 'seedance', status: String(body.status ?? ''), payload: body, receivedAt: Timestamp.now() }, { merge: true });
  response.status(200).json({ ok: true });
});
