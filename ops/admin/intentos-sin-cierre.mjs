#!/usr/bin/env node
/*
 * CONCILIAR `adminAudit` CON EL LIBRO. SOLO LEE Y SOLO INFORMA: no repite operaciones, no devuelve Credits y no escribe
 * ni en `adminAudit` ni en ningún otro sitio. Decidir qué hacer es de una persona.
 *
 *   Emulador (demo-*):
 *     FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *       node ops/admin/intentos-sin-cierre.mjs --proyecto demo-wee [--horas 72] [--minutos 30]
 *
 *   Proyecto real (lo ejecuta SOLO la persona dueña, con SUS credenciales):
 *     node ops/admin/intentos-sin-cierre.mjs --proyecto get-wee --confirmar-proyecto get-wee
 *
 * Tres preguntas, y cada una distingue algo:
 *   · `intento` sin `ok` ni `error`, y más viejo que cualquier llamada viva (`--minutos`): ¿se hizo? El libro lo dice.
 *     Si consta, falló la auditoría o el proceso murió tras actuar; si no consta, murió antes.
 *   · `error` con movimiento en el libro: el cliente recibió un fallo y el dinero se movió. Un `error` no prueba que no pasó.
 *   · Movimiento de `source: admin` sin ninguna constancia: se hizo por fuera de la puerta, con el SDK o con código antiguo.
 *
 * Por qué no repara solo: que algo no conste no prueba que nadie deba hacerlo, y solo una persona sabe si sigue haciendo
 * falta. Si hay que hacerlo, se repite con el MISMO `requestId`: el motor lo trata como duplicado y no paga dos veces.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { conectar, leerArgumentos, motivosDeProyecto } from './_comun.mjs';

const LLAVE_DEL_LIBRO = { grantCredits: (r) => `grant_${r}`, refundCredits: (r) => `refund_${r}`, spendCredits: (r) => `usage_${r}` };
const CIERRES = new Set(['ok', 'error', 'denegado']);

/**
 * Pura. `enLibro(accion, requestId)` responde `{ existe, estado? }`. Las operaciones sin libro (motor, moderación, evals,
 * canary) se quedan en `revisar-a-mano`: de ellas no se puede saber si ocurrieron mirando un solo documento.
 */
export const clasificarIntentos = async ({ entradas, enLibro, ahora, minutos }) => {
  const porCorrelacion = new Map();
  for (const e of entradas) {
    if (!porCorrelacion.has(e.correlationId)) porCorrelacion.set(e.correlationId, []);
    porCorrelacion.get(e.correlationId).push(e);
  }
  const hallazgos = [];
  const limite = ahora - minutos * 60_000;
  for (const [correlationId, grupo] of porCorrelacion) {
    const intento = grupo.find((e) => e.resultado === 'intento');
    if (!intento) continue;
    const cierre = grupo.find((e) => CIERRES.has(e.resultado));
    const base = { correlationId, accion: intento.accion, en: intento.en, actorUid: intento.actorUid, recurso: intento.recurso, requestId: intento.metadatos?.requestId ?? null };
    const clave = LLAVE_DEL_LIBRO[intento.accion];
    const libro = clave && base.requestId ? await enLibro(intento.accion, base.requestId) : null;
    if (!cierre) {
      if (intento.en > limite) continue;
      if (!clave) hallazgos.push({ ...base, clase: 'revisar-a-mano', detalle: 'sin cierre, y esta operación no tiene libro donde mirar' });
      else if (!base.requestId) hallazgos.push({ ...base, clase: 'revisar-a-mano', detalle: 'sin cierre y sin requestId' });
      else if (libro.existe) hallazgos.push({ ...base, clase: 'ocurrio-sin-cierre', estado: libro.estado ?? null, detalle: 'el libro lo tiene: falló la auditoría o el proceso murió tras actuar. No hay que repetirlo' });
      else hallazgos.push({ ...base, clase: 'no-consta', detalle: 'el libro no lo tiene: murió antes de actuar. Si sigue haciendo falta, se repite con el MISMO requestId' });
    } else if (cierre.resultado === 'error' && libro?.existe) {
      hallazgos.push({ ...base, clase: 'error-con-movimiento', estado: libro.estado ?? null, detalle: 'se registró un error y el libro tiene el movimiento: quien llamó puede creer que no pasó' });
    }
  }
  return hallazgos;
};

/** Pura: movimientos de administración sin ninguna entrada de auditoría con ese `requestId`. */
export const movimientosSinConstancia = (movimientos, entradas) => {
  const conocidos = new Set(entradas.map((e) => e.metadatos?.requestId).filter(Boolean));
  return movimientos.filter((m) => !conocidos.has(m.requestId)).map((m) => ({ clase: 'movimiento-sin-constancia', transaccion: m.id, tipo: m.type ?? null, requestId: m.requestId ?? null, detalle: 'se hizo por fuera de la puerta, o antes de que existiera' }));
};

const principal = async () => {
  const a = leerArgumentos(process.argv.slice(2));
  const motivos = motivosDeProyecto({ proyecto: a.proyecto, confirmarProyecto: a['confirmar-proyecto'], env: process.env });
  if (motivos.length) {
    console.error('✘ No se hace nada:');
    for (const m of motivos) console.error(`  · ${m}`);
    process.exit(1);
  }
  const ahora = Date.now();
  const horas = Number(a.horas ?? 72);
  /* Más que el plazo más largo de una callable de administración (300 s de evalRun): antes, puede seguir viva. */
  const minutos = Number(a.minutos ?? 30);
  const desde = ahora - horas * 3_600_000;
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { db } = conectar(raiz, a.proyecto);

  const snap = await db.collection('adminAudit').where('en', '>=', desde).orderBy('en', 'asc').get();
  const entradas = snap.docs.map((d) => d.data());
  const enLibro = async (accion, requestId) => {
    const d = await db.collection('creditTransactions').doc(LLAVE_DEL_LIBRO[accion](requestId)).get();
    return { existe: d.exists, estado: d.exists ? d.data().status ?? null : undefined };
  };
  const hallazgos = await clasificarIntentos({ entradas, enLibro, ahora, minutos });
  const movimientos = (await db.collection('creditTransactions').where('source', '==', 'admin').get()).docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => (m.createdAt?.toMillis?.() ?? 0) >= desde);
  const fuera = movimientosSinConstancia(movimientos, entradas);
  console.log(JSON.stringify({ proyecto: a.proyecto, horas, minutos, entradasMiradas: entradas.length, movimientosMirados: movimientos.length, hallazgos: [...hallazgos, ...fuera] }, null, 2));
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => {
    console.error('✘ Falló:', e?.code ?? 'error');
    process.exit(1);
  });
}
