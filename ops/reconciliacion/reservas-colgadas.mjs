#!/usr/bin/env node
/*
 * RESERVAS DE CREDITS COLGADAS — SOLO LECTURA. Weë Agent Harness (auditoría H0, #15).
 *
 *   node ops/reconciliacion/reservas-colgadas.mjs [--horas 2] [--limite 500] [--project get-wee]
 *
 * Una reserva (`creditTransactions`, `type: usage`, `status: AUTHORIZED`) es dinero
 * que ya salió del saldo de una persona y todavía no se ha liquidado ni devuelto.
 * Lo normal es que viva segundos o minutos: lo que tarda la IA. Si el proceso que
 * la abrió muere a mitad (un tiempo agotado, una instancia que se cae), la reserva
 * se queda ahí: la persona pagó y no recibió nada, y nadie la devuelve. Los
 * trabajos del Core (`jobs/`) los cierra el barrido; los de los caminos legacy
 * (búsqueda de Weë Brain, avatar, creatorRun y la rama legacy de generateVideo)
 * solo se cierran si se repite la misma llamada (H0 #15).
 *
 * Este informe SOLO las enseña: cuántas, cuántos Credits, de qué servicio y de qué
 * edad. No devuelve nada, no escribe nada y no llama a ninguna IA (lo fija
 * functions/test/reservas-colgadas.test.mjs). Devolverlas es una decisión del
 * dueño y se hace por la API del Credit Engine (`refundCredits`, idempotente):
 * repetir un reembolso no devuelve dos veces.
 *
 * Lee datos REALES de producción: lo ejecuta el dueño, con sus credenciales.
 * Usa el índice que ya existe (status ASC + createdAt DESC).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const HORAS_POR_DEFECTO = 2;

const enMs = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : typeof t === 'number' ? t : t instanceof Date ? t.getTime() : NaN);

/**
 * Pura: de las transacciones leídas, las reservas que llevan más de `horas` sin cerrarse, y un resumen
 * por servicio. Solo cuenta reservas de uso (`usage` + AUTHORIZED); cualquier otra cosa se ignora.
 */
export const clasificar = (transacciones, ahoraMs, horas = HORAS_POR_DEFECTO) => {
  const corte = ahoraMs - horas * 3600_000;
  const colgadas = transacciones
    .filter((t) => t && t.type === 'usage' && t.status === 'AUTHORIZED')
    .map((t) => ({ id: t.id, servicio: t.service || t.source || 'desconocido', credits: Math.abs(Number(t.authorizedAmount ?? t.amount) || 0), desdeMs: enMs(t.createdAt), requestId: t.requestId }))
    .filter((t) => Number.isFinite(t.desdeMs) && t.desdeMs < corte)
    .sort((a, b) => a.desdeMs - b.desdeMs);
  const porServicio = {};
  for (const t of colgadas) {
    const s = (porServicio[t.servicio] ||= { reservas: 0, credits: 0, masAntiguaHoras: 0 });
    s.reservas++;
    s.credits += t.credits;
    s.masAntiguaHoras = Math.max(s.masAntiguaHoras, Math.floor((ahoraMs - t.desdeMs) / 3600_000));
  }
  return { colgadas, porServicio, total: { reservas: colgadas.length, credits: colgadas.reduce((n, t) => n + t.credits, 0) } };
};

const arg = (nombre, defecto) => { const i = process.argv.indexOf(nombre); return i >= 0 ? process.argv[i + 1] : defecto; };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const horas = Number(arg('--horas', HORAS_POR_DEFECTO));
  const limite = Number(arg('--limite', 500));
  const proyecto = arg('--project', 'get-wee');
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId: proyecto });
  const ahora = Date.now();
  const corte = admin.firestore.Timestamp.fromMillis(ahora - horas * 3600_000);
  console.log(`\nRESERVAS DE CREDITS COLGADAS — ${proyecto} — más de ${horas} h — SOLO LECTURA\n`);
  const snap = await admin.firestore().collection('creditTransactions')
    .where('status', '==', 'AUTHORIZED').where('createdAt', '<', corte).orderBy('createdAt', 'desc').limit(limite).get();
  const { colgadas, porServicio, total } = clasificar(snap.docs.map((d) => ({ id: d.id, ...d.data() })), ahora, horas);
  if (!total.reservas) { console.log('✔ Ninguna reserva colgada.'); process.exit(0); }
  console.log(`✘ ${total.reservas} reserva(s), ${total.credits} Credits retenidos${snap.size === limite ? ` (al menos: se leyeron ${limite}; sube --limite)` : ''}\n`);
  for (const [s, r] of Object.entries(porServicio)) console.log(`  · ${s}: ${r.reservas} reserva(s), ${r.credits} Credits, la más antigua de ${r.masAntiguaHoras} h`);
  console.log('\nLas 20 más antiguas (id de la transacción, servicio, Credits, horas):');
  for (const t of colgadas.slice(0, 20)) console.log(`  ${t.id}  ${t.servicio}  ${t.credits}  ${Math.floor((ahora - t.desdeMs) / 3600_000)} h`);
  console.log('\nDevolverlas es decisión del dueño, por refundCredits (idempotente). Este informe no cambia nada.');
  process.exit(1);
}
