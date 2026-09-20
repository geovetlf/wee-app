import { timingSafeEqual } from 'node:crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CALLBACK_SECRETS } from '../secrets';
import { onRequest } from 'firebase-functions/v2/https';
import { atenderAviso } from '../runtime/atencion';
import { atencionDeWee } from '../runtime';
import { leerAvisoDeSeedance } from './providers/seedance';
import { sanitizeForLog } from './sanitize';

/**
 * Webhook preparado para Seedance (BytePlus ModelArk `callback_url`).
 *
 * Cuando SEEDANCE_CALLBACK_URL apunta a esta función (URL pública en producción)
 * y SEEDANCE_CALLBACK_TOKEN protege la llamada, ModelArk avisa aquí al terminar
 * cada tarea; el aviso se guarda en aiProviderCallbacks/{taskId} y el adaptador
 * lo usa para terminar antes su sondeo. Sin webhook, el sondeo a la API basta.
 * El cuerpo llega tal cual lo manda el proveedor (id, status, content, usage, error).
 */
export const seedanceCallback = onRequest({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', secrets: CALLBACK_SECRETS }, async (request, response) => {
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

/* ── El receptor que mueve trabajos ────────────────────────────────────────── */

/**
 * AVISO DE PROVEEDOR → TRABAJO. El camino asíncrono de verdad.
 *
 * El de arriba (`seedanceCallback`) aparca el aviso para que el sondeo termine
 * antes; sigue intacto y es el que usa el camino de siempre. Este es otra cosa:
 * coge el aviso y MUEVE un trabajo del Job Engine —lo cierra, lo cobra o lo
 * deja esperando—, que es lo que hace falta cuando nadie está sondeando porque
 * nadie se quedó esperando.
 *
 * ── Qué hace, en orden ──────────────────────────────────────────────────────
 *
 *    1. método y tamaño        un cuerpo sin medir es una forma de tumbarlo
 *    2. quién llama            comparación en tiempo constante
 *    3. qué dice               lo traduce el adaptador de su proveedor
 *    4. de quién es            lo dice lo GUARDADO, buscando la operación
 *    5. está en casa           un final bueno se guarda antes de cerrarse
 *    6. aplicar                el motor de siempre, con el aviso deduplicado
 *    7. contestar              rápido, y siempre lo mismo
 *
 * ── Lo que se contesta, y por qué siempre lo mismo ──────────────────────────
 *
 * `202` a todo lo que se entienda, exista o no el trabajo. Un aviso sobre una
 * operación que no es de nadie y uno sobre una que sí se contestan IGUAL: si
 * se distinguieran, este puerto sería un buscador de cuentas ajenas —se prueban
 * nombres hasta que uno conteste distinto—. Y el proveedor no tiene por qué
 * enterarse de si acertó.
 *
 * `401` solo cuando el testigo no vale; `413` si el cuerpo no cabe; `400` si no
 * hay forma de leerlo. Nada más, y nunca un detalle interno.
 *
 * ── Sobre la firma que no hay ───────────────────────────────────────────────
 *
 * ModelArk NO publica HMAC ni firma para sus callbacks: lo que se puede
 * comprobar es un testigo que viaja en la URL, y eso es lo que se comprueba, en
 * tiempo constante. NO se inventa una firma que no existe. El sitio donde
 * enchufarla cuando la haya está marcado: `comprobarFirma`.
 *
 * ── NO ESTÁ DESPLEGADO ──────────────────────────────────────────────────────
 *
 * `index.ts` no lo exporta, igual que el barrido programado. Encenderlo es un
 * paso aparte y requiere autorización: mientras ninguna capacidad asíncrona
 * esté migrada, no hay ningún aviso legítimo que pueda llegar aquí.
 */

/** Lo más grande que se acepta. El aviso de ModelArk son unos pocos kilobytes. */
export const MAX_CUERPO_DE_AVISO = 64 * 1024;

/**
 * Comparar dos testigos SIN QUE EL TIEMPO LO CUENTE.
 *
 * `a !== b` sale antes cuanto antes se diferencien, y eso, medido muchas veces,
 * deja adivinar el testigo carácter a carácter. Se comparan las longitudes por
 * separado —esa sí se filtra, y no hay forma de evitarlo— y los bytes en tiempo
 * constante.
 */
export const mismoTestigo = (recibido: unknown, esperado: string | undefined): boolean => {
  if (typeof esperado !== 'string' || !esperado.length) return false;
  if (typeof recibido !== 'string' || recibido.length !== esperado.length) return false;
  const a = Buffer.from(recibido, 'utf8');
  const b = Buffer.from(esperado, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * EL HUECO DE LA FIRMA. Hoy devuelve `true` porque no hay nada que comprobar:
 * el proveedor no firma. Está escrito para que el día que firme se cambie AQUÍ
 * y no haya que tocar nada más — y para que se vea que la ausencia es del
 * proveedor y no un olvido.
 */
export const comprobarFirma = (_cabeceras: unknown, _cuerpo: unknown): boolean => true;

export const avisoDeProveedor = onRequest(
  { region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', secrets: CALLBACK_SECRETS },
  async (request, response) => {
    if (request.method !== 'POST') { response.status(405).send('POST only'); return; }

    /* 1 · TAMAÑO. Antes de mirar nada: lo que no cabe no se procesa. */
    const declarado = Number(request.get('content-length') ?? 0);
    if (Number.isFinite(declarado) && declarado > MAX_CUERPO_DE_AVISO) { response.status(413).send('too large'); return; }

    /* 2 · QUIÉN LLAMA. */
    if (!mismoTestigo(request.query.token, process.env.SEEDANCE_CALLBACK_TOKEN) || !comprobarFirma(request.headers, request.body)) {
      response.status(401).send('unauthorized');
      return;
    }

    const cuerpo = request.body;
    if (!cuerpo || typeof cuerpo !== 'object') { response.status(400).send('bad request'); return; }
    if (Buffer.byteLength(JSON.stringify(cuerpo)) > MAX_CUERPO_DE_AVISO) { response.status(413).send('too large'); return; }

    /* 3 · QUÉ DICE. El proveedor lo fija la RUTA, no el cuerpo: nadie elige desde fuera qué adaptador lo lee. */
    const aviso = leerAvisoDeSeedance(cuerpo);
    if (!aviso) { response.status(400).send('bad request'); return; }

    try {
      /* 4–6 · De quién es, está en casa, y aplicar. Todo eso ya está decidido en el runtime. */
      const desenlace = await atenderAviso(atencionDeWee(), aviso);
      /*
       * Se registra POR IDENTIFICADORES: ni el enlace del resultado, ni el
       * cuerpo, ni el testigo. Y nunca se dice de quién era: eso es justo lo
       * que este puerto no puede revelar.
       */
      console.log(`WEË AVISO: ${aviso.providerId}/${aviso.providerStatus} → ${desenlace.estado}`);
    } catch (error) {
      /*
       * Un fallo nuestro NO se le cuenta al proveedor como «lo tengo»: se
       * contesta 500 para que reintente, porque perder el aviso es perder el
       * desenlace. Lo que no se hace nunca es contarle qué falló.
       */
      console.error(`WEË AVISO: no se pudo atender (${aviso.providerId}): ${sanitizeForLog(error, 300)}`);
      response.status(500).send('retry');
      return;
    }

    /* 7 · SIEMPRE LO MISMO. Exista el trabajo o no, sea de quien sea. */
    response.status(202).json({ ok: true });
  },
);
