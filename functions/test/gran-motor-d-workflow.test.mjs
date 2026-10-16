/*
 * GRAN MOTOR · PAQUETE D — WORKFLOW, ORCHESTRATOR, JOB ENGINE Y CONDUCTOR (2026-10-16).
 *
 * Una suite para lo que este paquete demuestra con regresiones deterministas (sin red, sin emulador, sin reloj real):
 *
 *   L  L-5 (heredado del paquete C): `completeCredits` distingue «cobré yo» de «ya estaba cobrada» (`duplicate`) y el
 *      recuento `liquidados` del barrendero deja de contar las repeticiones concurrentes. El dinero no cambia.
 *
 * Usa el compilado (`npm run build` antes) y el Credit Engine REAL sobre la Firestore en memoria del repositorio.
 */
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';

let fallos = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallos++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` · ${evidencia}` : ''}\n`); };

/* ── L · L-5: «liquidada» solo para quien cobró de verdad ─────────────────── */
{
  console.log('\n── L · completeCredits distingue la repetición; el recuento deja de inflarse ──');
  const base = new BaseEnMemoria();
  const restaurar = instalarLaBase(() => base);
  try {
    const { creditEngine } = lib('credits/creditEngine.js');
    const { liquidacionDeWee } = lib('runtime/index.js');
    await darDeAlta(base, 'ana', { saldo: 100 });
    const gasta = (id, amount = 30) => creditEngine.spendCredits({ userId: 'ana', service: 'ai_image', requestId: id, amount, source: 'test' });

    /* L1 · el motor: la primera llamada cobra (duplicate false), las siguientes son repetición (duplicate true). */
    await gasta('job_L1');
    const [a, b, c] = await Promise.all([1, 2, 3].map(() => creditEngine.completeCredits({ userId: 'ana', requestId: 'job_L1', finalAmount: 30 })));
    const reales = [a, b, c].filter((x) => x.duplicate === false);
    check('L1 tres completeCredits a la vez: exactamente UNA cobra (duplicate:false) y las otras dos son repetición (duplicate:true)', reales.length === 1 && [a, b, c].filter((x) => x.duplicate === true).length === 2, JSON.stringify([a, b, c].map((x) => x.duplicate)));
    check('L2 el dinero es el de siempre: saldo 70, una sola reserva COMPLETED, estado COMPLETED en las tres', saldoDe(base, 'ana') === 70 && [a, b, c].every((x) => x.status === 'COMPLETED') && base.leer('creditTransactions/usage_job_L1').status === 'COMPLETED');

    /* L3 · contra una reserva ya devuelta o ya cobrada: repetición, y sin mover nada. */
    await gasta('job_L3');
    await creditEngine.refundCredits({ userId: 'ana', requestId: 'job_L3', reason: 'prueba' });
    const tarde = await creditEngine.completeCredits({ userId: 'ana', requestId: 'job_L3', finalAmount: 30 });
    check('L3 cerrar tarde una reserva ya DEVUELTA: duplicate:true, estado REFUNDED, no cobra', tarde.duplicate === true && tarde.status === 'REFUNDED' && saldoDe(base, 'ana') === 70);

    /* L4 · la liquidación del Core Runtime: de tres liquidaciones simultáneas, UNA es «liquidada» y las otras «ya_estaba». */
    const filas = []; const cerradas = new Set(); let averia = false;
    /* El libro real contesta `already` cuando la fila ya estaba cerrada; este lo imita (y puede averiarse). */
    const settle = async (p) => { if (averia) throw new Error('libro caído'); filas.push(p); const ya = cerradas.has(p.creditTransactionId); cerradas.add(p.creditTransactionId); return ya ? { rows: 0, credited: 0, already: true } : { rows: 1, credited: 0 }; };
    const puerto = liquidacionDeWee({ credits: creditEngine, ledger: { settle, closeAccepted: async () => ({}) }, cupo: { liberar: async () => {} } });
    const reserva = (id) => ({ requestId: id, transactionId: `usage_${id}`, importe: 30 });
    await gasta('job_L4');
    const r = await Promise.all([1, 2, 3].map(() => puerto.liquidar({ userId: 'ana', reserva: reserva('job_L4'), importe: 30, jobId: 'j', job: undefined })));
    const nLiquidadas = r.filter((x) => x.desenlace === 'liquidada').length;
    const nYaEstaba = r.filter((x) => x.desenlace === 'ya_estaba').length;
    check('L4 tres liquidar() simultáneos: 1 «liquidada» y 2 «ya_estaba» (antes: 3 «liquidada»)', nLiquidadas === 1 && nYaEstaba === 2 && r.every((x) => x.desenlace !== 'fallo'), JSON.stringify(r.map((x) => x.desenlace)));
    check('L5 y ninguno deja de cerrar la fila del libro (cierre idempotente): las tres filas dicen 30', filas.filter((f) => f.creditTransactionId === 'usage_job_L4').length === 3 && filas.filter((f) => f.creditTransactionId === 'usage_job_L4').every((f) => f.finalAmount === 30));
    check('L6 el saldo sigue en 40: el dinero se movió una vez', saldoDe(base, 'ana') === 40);

    /* L7b · el cierre a medias: el dinero se movió y el libro falló; la pasada siguiente SÍ termina el cobro («liquidada»), la tercera ya no tiene nada que hacer. */
    await gasta('job_L7b', 10);
    averia = true;
    const p1 = await puerto.liquidar({ userId: 'ana', reserva: reserva('job_L7b'), importe: 10, jobId: 'j', job: undefined });
    averia = false;
    const p2 = await puerto.liquidar({ userId: 'ana', reserva: reserva('job_L7b'), importe: 10, jobId: 'j', job: undefined });
    const p3 = await puerto.liquidar({ userId: 'ana', reserva: reserva('job_L7b'), importe: 10, jobId: 'j', job: undefined });
    check('L7b cobro a medias: pasada 1 mueve el dinero («liquidada») aunque el libro esté caído; la 2 cierra la fila («liquidada»); la 3 «ya_estaba»', p1.desenlace === 'liquidada', JSON.stringify([p1, p2, p3].map((x) => x.desenlace)));
    check('L7c la pasada 2 cuenta como liquidada porque terminó el cobro, y la 3 no', p2.desenlace === 'liquidada' && p3.desenlace === 'ya_estaba' && saldoDe(base, 'ana') === 30);

    /* L7 · compatibilidad hacia atrás: un motor que no dice `duplicate` (anterior) sigue contando como «liquidada». */
    const viejo = { completeCredits: async () => ({ status: 'COMPLETED', refunded: 0, balanceAfter: 1 }), refundCredits: async () => ({ duplicate: false }) };
    const pViejo = liquidacionDeWee({ credits: viejo, ledger: { settle: async () => ({}), closeAccepted: async () => ({}) }, cupo: { liberar: async () => {} } });
    const rv = await pViejo.liquidar({ userId: 'ana', reserva: reserva('x'), importe: 1, jobId: 'j', job: undefined });
    check('L7 un motor sin el campo `duplicate` conserva el comportamiento anterior («liquidada»)', rv.desenlace === 'liquidada');
  } finally { restaurar(); }
}

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ todo en orden');
process.exit(fallos ? 1 : 0);
