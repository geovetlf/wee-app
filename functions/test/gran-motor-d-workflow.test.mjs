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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

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


/* ── M · El Job Engine, explorado al azar con semilla fija: seguridad y vivacidad ───────────────────
 *
 * No repite lo que ya prueba `core-job` (la tabla de transiciones, una a una). Lo que añade es lo que una tabla no dice:
 * recorrer MILES de secuencias de operaciones intercaladas —reclamar, marcar envío, renovar, informar con cada desenlace,
 * cancelar, evaluar, dejar pasar el tiempo, y que el trabajador MUERA en cualquier punto— y comprobar, después de cada
 * paso, las propiedades que importan:
 *
 *   SEGURIDAD   toda flecha está en la tabla · lo terminal no se mueve · la revisión solo sube · nunca dos concesiones vivas
 *               · los intentos no pasan de la política.
 *   VIVACIDAD   desde CUALQUIER estado alcanzado, dejando pasar el plazo y llamando a `evaluar`, el trabajo acaba en un
 *               estado final. Es decir: el motor, SI alguien lo evalúa, no deja ningún trabajo vivo para siempre.
 *
 * Quién lo evalúa en producción es otra pregunta (sección N) y la contesta la lectura de código, no el azar.
 */
{
  console.log('\n── M · Job Engine: exploración con semilla fija ──');
  const core = lib('core/index.js');
  const { TRANSICIONES_DE_TRABAJO } = lib('core/job.js');
  const motor = core.crearJobEngine();
  const T0 = 1_000_000;
  const QUIEN = { userId: 'user-0001' };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pet = (n) => ({ contract: '1.0', principal: QUIEN, at: T0, capability: 'image.generate', implementation: { providerId: 'matriz-a', modelId: 'matriz-a.uno' }, input: { prompt: 'x' }, trace: { traceId: `trace-${n}`, requestId: `req-${n}`, userId: QUIEN.userId } });
  const err = (code) => core.errorDelCore(code, 'job', { details: { reason: 'prueba' } });
  const TERMINAL = new Set(['completed', 'failed', 'timed_out', 'cancelled']);
  const viva = (j) => j.attempts.filter((a) => a.lease && a.endedAt === undefined);

  const violaciones = []; const noTerminan = []; let pasos = 0; let caminos = 0; const finales = {}; const destino = {};
  const aplicar = (j, d, quien) => {
    if (d.status !== 'transition' || !d.transition) return j;
    const n = d.transition.job;
    pasos++;
    if (n.state !== j.state && !(TRANSICIONES_DE_TRABAJO[j.state] ?? []).includes(n.state)) violaciones.push(`flecha fuera de tabla ${j.state}→${n.state} (${quien})`);
    if (TERMINAL.has(j.state)) violaciones.push(`un trabajo terminal (${j.state}) se movió (${quien})`);
    if (!(n.revision > j.revision)) violaciones.push(`la revisión no subió (${quien})`);
    if (viva(n).length > 1) violaciones.push(`dos concesiones vivas (${quien})`);
    if (n.attemptCount > n.policy.retry.maxAttempts) violaciones.push(`más intentos que la política (${quien})`);
    return n;
  };
  const sondeoDeVida = (j, t, traza) => {
    /* Se deja pasar el plazo entero y se evalúa: tiene que acabar en un estado final. */
    let x = j; let tt = Math.max(t, j.deadlineAt + 1);
    for (let i = 0; i < 8 && !TERMINAL.has(x.state); i++) {
      const n = aplicar(x, motor.evaluar(x, tt), 'evaluar-final');
      if (n === x) { tt += 600_000; } else x = n;
    }
    if (!TERMINAL.has(x.state)) noTerminan.push(`${traza}: quedó ${x.state}`);
    else destino[`${j.state}→${x.state}`] = (destino[`${j.state}→${x.state}`] ?? 0) + 1;
  };

  const CAMINOS = 1500; const LARGO = 24;
  for (let c = 0; c < CAMINOS; c++) {
    const az = mulberry(1000 + c);
    const elige = (xs) => xs[Math.floor(az() * xs.length)];
    let t = T0;
    let job = motor.crear(pet(c)).transition.job;
    const trabajadores = { w1: undefined, w2: undefined };
    caminos++;
    for (let k = 0; k < LARGO; k++) {
      const w = elige(['w1', 'w2']);
      const op = elige(['claim', 'claim', 'mark', 'report', 'report', 'renew', 'cancel', 'evaluar', 'tick', 'tick', 'crash']);
      const traza = `camino ${c} paso ${k} ${op}/${w}`;
      if (op === 'tick') t += elige([1, 1_000, 30_000, 61_000, 130_000, 700_000]);
      else if (op === 'claim') {
        const d = motor.reclamar(job, { principal: QUIEN, at: t, worker: w });
        const n = aplicar(job, d, traza);
        if (n !== job && d.dispatch) trabajadores[w] = { attemptId: d.dispatch.attemptId };
        job = n;
      } else if (op === 'mark' && trabajadores[w]) job = aplicar(job, motor.marcarEnvio(job, { principal: QUIEN, at: t, worker: w, attemptId: trabajadores[w].attemptId }), traza);
      else if (op === 'renew' && trabajadores[w]) job = aplicar(job, motor.renovar(job, { principal: QUIEN, at: t, worker: w }), traza);
      else if (op === 'report' && trabajadores[w]) {
        const salida = elige(['succeeded', 'failed', 'timed_out', 'unknown']);
        const informe = { attemptId: trabajadores[w].attemptId, outcome: salida, dispatched: az() < 0.7,
          ...(salida === 'failed' ? { error: err('PROVIDER_UNAVAILABLE') } : salida === 'timed_out' ? { error: err('TIMEOUT') } : salida === 'unknown' ? { error: err('INTERNAL_ERROR'), dispatched: true } : {}),
          ...(salida === 'succeeded' ? { result: { outputRefs: ['asset_x'] } } : {}),
          ...(az() < 0.3 ? { providerRef: { providerId: 'matriz-a', operationId: `op-${c}-${k}` } } : {}) };
        job = aplicar(job, motor.informar(job, { principal: QUIEN, at: t, worker: w, report: informe }), traza);
        if (job.state !== 'running') trabajadores[w] = undefined;
      } else if (op === 'cancel') job = aplicar(job, motor.cancelar(job, QUIEN, t), traza);
      else if (op === 'evaluar') job = aplicar(job, motor.evaluar(job, t), traza);
      else if (op === 'crash') trabajadores[w] = undefined; /* el trabajador muere: nadie informará de lo suyo */
      if (k % 6 === 5 || k === LARGO - 1) sondeoDeVida(job, t, traza);
    }
    finales[job.state] = (finales[job.state] ?? 0) + 1;
  }
  check(`M1 SEGURIDAD: ${caminos} caminos al azar (${pasos} transiciones) sin una sola flecha fuera de tabla, terminal movido, revisión que no sube, doble concesión ni exceso de intentos`, violaciones.length === 0, violaciones.slice(0, 3).join(' | '));
  check('M2 VIVACIDAD: desde CUALQUIER punto alcanzado, dejando pasar el plazo y evaluando, el trabajo acaba en un estado final', noTerminan.length === 0, noTerminan.slice(0, 3).join(' | '));
  check('M3 la exploración no se quedó en el camino feliz: llegó a trabajos vivos y a los cuatro finales', ['completed', 'failed', 'timed_out', 'cancelled', 'queued', 'running', 'waiting'].filter((e) => finales[e] > 0).length >= 6, JSON.stringify(finales));

  /* M4 · quién mueve cada estado vivo: lo que el motor SOLO hace si alguien se lo pide. */
  const base = motor.crear(pet('m4')).transition.job;
  const corriendo = motor.reclamar(base, { principal: QUIEN, at: T0 + 10, worker: 'w1' }).transition.job;
  check('M4a un trabajo `running` cuyo trabajador murió NO se mueve solo: sin `evaluar` sigue `running` con la concesión caducada (la recuperación es una petición, no un efecto del tiempo)', corriendo.state === 'running' && corriendo.attempts[0].lease.until < corriendo.deadlineAt);
  const recuperado = motor.evaluar(corriendo, corriendo.attempts[0].lease.until + 1);
  check('M4b y `evaluar` con la concesión caducada SÍ lo recupera: cierra el intento que no salió y deja otro programado (queued)', recuperado.status === 'transition' && recuperado.transition.to === 'queued', `${recuperado.status} → ${recuperado.transition?.to}`);
  const salido = motor.marcarEnvio(corriendo, { principal: QUIEN, at: T0 + 20, worker: 'w1', attemptId: corriendo.attempts[0].attemptId }).transition.job;
  const salidoCaducado = motor.evaluar(salido, salido.attempts[0].lease.until + 1);
  check('M4c si el trabajador muere DESPUÉS de salir, evaluar NO reintenta: el trabajo queda `waiting` con el intento `unknown` (pagar dos veces es peor que esperar)', salidoCaducado.status === 'transition' && salidoCaducado.transition.to === 'waiting' && salidoCaducado.transition.job.attempts[0].outcome === 'unknown', `${salidoCaducado.transition?.to}/${salidoCaducado.transition?.job.attempts[0].outcome}`);
  const vencido = motor.evaluar(salidoCaducado.transition.job, salido.deadlineAt + 1);
  check('M4d y un `waiting` sin noticias termina en `timed_out` al llegar su plazo: tiene final, pero SOLO si alguien evalúa', vencido.status === 'transition' && vencido.transition.to === 'timed_out', `${vencido.transition?.to}`);

  /* M5 · SABOTAJE: el explorador tiene que NOTAR una violación de verdad (si no, M1 no probaría nada). */
  const fin = vencido.transition.job;
  const n0 = violaciones.length;
  aplicar(fin, { status: 'transition', transition: { job: { ...fin, state: 'running', revision: fin.revision + 1 } } }, 'sabotaje-1');
  aplicar(corriendo, { status: 'transition', transition: { job: { ...corriendo, state: 'completed', revision: corriendo.revision } } }, 'sabotaje-2');
  aplicar(corriendo, { status: 'transition', transition: { job: { ...corriendo, state: 'queued', revision: corriendo.revision + 1, attempts: [{ ...corriendo.attempts[0] }, { ...corriendo.attempts[0], attemptId: 'otro' }] } } }, 'sabotaje-3');
  const notadas = violaciones.splice(n0);
  check('M5 sabotaje: terminal que se mueve, flecha fuera de tabla, revisión que no sube y doble concesión se NOTAN (4+ violaciones detectadas)', notadas.length >= 4, notadas.join(' | ').slice(0, 300));
}


/* ── O · El Workflow/Orchestrator, explorado al azar con semilla fija ─────────────────────────────────
 *
 * Mismo método que M, sobre el otro autómata: la ejecución de un workflow (un grafo de pasos con dependencias).
 * Cada camino mezcla avanzar, informar un paso (bien, mal, cancelado), cancelar, pausar, reanudar, aprobar/rechazar y que
 * el proceso MUERA (se pierde lo que el conductor tenía en la mano: lo único que queda es la ejecución guardada, que el
 * Orchestrator —puro— devuelve en `inFlight` al volver a preguntar).
 *
 *   SEGURIDAD  paso final no se mueve · ejecución final no se mueve · `done` solo con todos los pasos hechos o saltados ·
 *              un paso solo empieza con sus dependencias hechas · informar de un paso que no corre no inventa un final.
 *   VIVACIDAD  desde CUALQUIER punto alcanzado, informando como se debe y reanudando, la ejecución acaba en un final;
 *              la única excepción es esperar a una persona (`awaiting_approval`), que se mide y se dice.
 */
{
  console.log('\n── O · Workflow/Orchestrator: exploración con semilla fija ──');
  const core = lib('core/index.js');
  const { orquestadorDeWee } = lib('orchestrator/index.js');
  const QUIEN = { userId: 'user-0001' };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const paso = (id, extra = {}) => ({ id, capability: 'text.generate', purpose: id, input: { prompt: 'x' }, ...extra });
  const DEFS = {
    diamante: { id: 'wf_diamante', contract: '1.1', goal: 'x', steps: [paso('a'), paso('b', { dependsOn: ['a'] }), paso('c', { dependsOn: ['a'] }), paso('d', { dependsOn: ['b', 'c'] })] },
    cadena: { id: 'wf_cadena', contract: '1.1', goal: 'x', steps: [paso('a'), paso('b', { dependsOn: ['a'] }), paso('c', { dependsOn: ['b'] })] },
    paralelo: { id: 'wf_paralelo', contract: '1.1', goal: 'x', steps: [paso('a'), paso('b'), paso('c')] },
    aprobacion: { id: 'wf_aprobacion', contract: '1.1', goal: 'x', steps: [paso('a'), paso('b', { dependsOn: ['a'], requiresApproval: true }), paso('c', { dependsOn: ['b'] })] },
  };
  const FINAL_PASO = new Set(['done', 'failed', 'skipped', 'cancelled']);
  const FINAL_RUN = new Set(['done', 'failed', 'cancelled']);
  const violaciones = []; const noTerminan = []; const esperaHumana = []; const combinaciones = {};
  let operaciones = 0; let caminos = 0; let tardios = 0;

  for (const [nombre, def] of Object.entries(DEFS)) {
    const montado = orquestadorDeWee(def);
    if (!montado.ok) { check(`O0 el workflow de prueba ${nombre} es válido`, false, JSON.stringify(montado.error)); continue; }
    const { prepared, orchestrator } = montado;
    const dependencias = Object.fromEntries(def.steps.map((s) => [s.id, s.dependsOn ?? []]));
    for (let c = 0; c < 600; c++) {
      const az = mulberry(7000 + c);
      const elige = (xs) => xs[Math.floor(az() * xs.length)];
      const t0 = { traceId: `brain_t_${nombre}${c}`, requestId: `brain_t_${nombre}${c}`, userId: QUIEN.userId, workplace: 'brain' };
      const ini = prepared.iniciar(t0);
      let run = ini.run; let at = 1;
      caminos++;
      const pet = (r) => ({ contract: core.ORCHESTRATOR_CONTRACT_VERSION, principal: QUIEN, run: r, at: ++at });
      const mirar = (antes, d, quien) => {
        operaciones++;
        const despues = d.run;
        if (!despues) return antes;
        for (const p of antes.steps) {
          const q = despues.steps.find((x) => x.stepId === p.stepId);
          if (FINAL_PASO.has(p.state) && q.state !== p.state) violaciones.push(`${nombre}/${c} ${quien}: el paso ${p.stepId} final (${p.state}) pasó a ${q.state}`);
        }
        if (FINAL_RUN.has(antes.state) && despues.state !== antes.state) {
          /* LA ÚNICA EXCEPCIÓN CONOCIDA (D-W1): cancelada con un paso aún corriendo, y ese paso informa que FALLÓ → la ejecución pasa a `failed`. "Lo que ya corría puede informar: lo que pasó, pasó" (core-orchestrator 66). */
          const tardio = antes.state === 'cancelled' && despues.state === 'failed' && antes.steps.some((p) => p.state === 'running' && despues.steps.find((q) => q.stepId === p.stepId).state === 'failed');
          if (tardio) tardios++; else violaciones.push(`${nombre}/${c} ${quien}: la ejecución final (${antes.state}) pasó a ${despues.state}`);
        }
        if (despues.state === 'done' && !despues.steps.every((s) => s.state === 'done' || s.state === 'skipped')) violaciones.push(`${nombre}/${c} ${quien}: done con pasos sin hacer`);
        for (const s of despues.steps) {
          if ((s.state === 'running' || s.state === 'done') && !dependencias[s.stepId].every((dep) => ['done', 'skipped'].includes(despues.steps.find((x) => x.stepId === dep).state))) violaciones.push(`${nombre}/${c} ${quien}: ${s.stepId} ${s.state} sin sus dependencias hechas`);
        }
        combinaciones[`${despues.state}:${despues.steps.map((s) => s.state).sort().join(',')}`] = true;
        return despues;
      };
      for (let k = 0; k < 18; k++) {
        const op = elige(['avanzar', 'avanzar', 'informar', 'informar', 'informar', 'cancelar', 'pausar', 'reanudar', 'aprobar', 'crash', 'informarAjeno']);
        const corriendo = run.steps.filter((s) => s.state === 'running').map((s) => s.stepId);
        const traza = `${op}@${k}`;
        if (op === 'avanzar') run = mirar(run, orchestrator.avanzar(pet(run)), traza);
        else if (op === 'informar' && corriendo.length) {
          const stepId = elige(corriendo); const kind = elige(['succeeded', 'succeeded', 'succeeded', 'failed', 'cancelled']);
          run = mirar(run, orchestrator.informar({ ...pet(run), outcome: { stepId, kind, at, ...(kind === 'failed' ? { error: core.errorDelCore('PROVIDER_UNAVAILABLE', 'job', { details: { reason: 'prueba' } }) } : {}) } }), traza);
        } else if (op === 'informarAjeno') {
          /* informar de un paso que NO corre: no puede inventar un final */
          const noCorre = run.steps.filter((s) => s.state !== 'running').map((s) => s.stepId);
          if (noCorre.length) {
            const antes = run;
            const stepId = elige(noCorre);
            const d = orchestrator.informar({ ...pet(run), outcome: { stepId, kind: 'succeeded', at } });
            const q = d.run?.steps.find((x) => x.stepId === stepId);
            const p = antes.steps.find((x) => x.stepId === stepId);
            if (q && q.state !== p.state) violaciones.push(`${nombre}/${c}: informar de ${stepId} (${p.state}) que no corría lo movió a ${q.state}`);
            run = mirar(run, d, traza);
          }
        } else if (op === 'cancelar') run = mirar(run, orchestrator.cancelar(pet(run)), traza);
        else if (op === 'pausar') run = mirar(run, orchestrator.pausar(pet(run)), traza);
        else if (op === 'reanudar') run = mirar(run, orchestrator.reanudar(pet(run)), traza);
        else if (op === 'aprobar') {
          const esperando = run.steps.filter((s) => s.state === 'awaiting_approval').map((s) => s.stepId);
          if (esperando.length) run = mirar(run, orchestrator.informar({ ...pet(run), outcome: { stepId: esperando[0], kind: elige(['approved', 'approved', 'rejected']), at } }), traza);
        }
        /* 'crash': nada que hacer. Lo que el conductor tenía en la mano se pierde y lo único que queda es `run`, que ya es lo guardado. */

        if (k % 6 === 5) {
          /* VIVACIDAD desde aquí, sobre una copia (el Orchestrator es puro): informar como se debe y reanudar. */
          let x = run; let humana = false;
          for (let i = 0; i < 40 && !FINAL_RUN.has(x.state); i++) {
            if (x.state === 'paused') { x = orchestrator.reanudar(pet(x)).run ?? x; continue; }
            const d = orchestrator.avanzar(pet(x)); x = d.run ?? x;
            const vivos = x.steps.filter((s) => s.state === 'running').map((s) => s.stepId);
            const aprobar = x.steps.filter((s) => s.state === 'awaiting_approval').map((s) => s.stepId);
            if (!vivos.length && aprobar.length) { humana = true; x = orchestrator.informar({ ...pet(x), outcome: { stepId: aprobar[0], kind: 'approved', at } }).run ?? x; continue; }
            for (const stepId of vivos) x = orchestrator.informar({ ...pet(x), outcome: { stepId, kind: 'succeeded', at } }).run ?? x;
          }
          if (!FINAL_RUN.has(x.state)) noTerminan.push(`${nombre}/${c} ${traza}: quedó ${x.state} [${x.steps.map((s) => s.state).join(',')}]`);
          if (humana) esperaHumana.push(`${nombre}/${c}`);
        }
      }
    }
  }
  check(`O1 SEGURIDAD: ${caminos} caminos al azar (${operaciones} operaciones) sin un solo paso final que se mueva, ejecución final que se mueva (salvo D-W1), done con pasos sin hacer, paso empezado sin sus dependencias, ni un final inventado al informar de un paso que no corre`, violaciones.length === 0, violaciones.slice(0, 3).join(' | '));
  check('O1b D-W1 EXCEPCIÓN MEDIDA: una ejecución `cancelled` con un paso aún corriendo pasa a `failed` si ese paso informa un fallo (la cancelación no es absorbente mientras algo informe); el diseño dice «lo que pasó, pasó»', tardios > 0, `${tardios} casos`);
  check('O2 VIVACIDAD: desde cualquier punto, informando como se debe y reanudando, la ejecución acaba en un final (hecha, fallada o cancelada)', noTerminan.length === 0, noTerminan.slice(0, 3).join(' | '));
  check('O3 lo único que se queda esperando de verdad es una persona: la aprobación (`requiresApproval`) NO tiene plazo ni caducidad en el Workflow', esperaHumana.length > 0 && esperaHumana.every((x) => x.startsWith('aprobacion/')), `${esperaHumana.length} caminos esperaron a una persona, todos en el workflow con aprobación`);
  check('O4 la exploración llegó a muchas combinaciones distintas (no un solo camino)', Object.keys(combinaciones).length >= 30, `${Object.keys(combinaciones).length} combinaciones`);
}


/* ── N · Qué mueve a un trabajo abandonado EN PRODUCCIÓN: lo que existe, lo que falta, con los trabajos de verdad ─
 *
 * M demuestra que el motor, SI se le evalúa, no deja ningún trabajo vivo para siempre. Aquí se contesta la otra pregunta:
 * ¿quién lo evalúa en lo que está DESPLEGADO? Se recorre el camino real de un trabajo cuyo proceso murió, con las dos
 * piezas que corren cada 5 minutos —la reconciliación y el barrendero de liquidación— y se mide qué hacen con él.
 *
 * El resultado es un ESTADO CONOCIDO, no una propiedad deseable (RUNTIME §21.4, «quién recupera los trabajos pendientes»,
 * es una decisión diferida del dueño): lo que se comprueba es que NO ES SILENCIOSO —queda detectable y explicado— y que
 * el dinero no se mueve donde no debe (nada se cobra ni se devuelve a ciegas).
 */
{
  console.log('\n── N · Trabajo abandonado: qué lo mueve en lo desplegado ──');
  const core = lib('core/index.js');
  const { decidirLiquidacion } = lib('runtime/liquidacion.js');
  const { decidirReconciliacion } = lib('runtime/reconciliacion.js');
  const { PLAZOS_DE_VIDEO } = lib('runtime/plazos.js');
  const motor = core.crearJobEngine();
  const T0 = 1_000_000;
  const QUIEN = { userId: 'user-0001' };
  const pet = (n) => ({ contract: '1.0', principal: QUIEN, at: T0, capability: 'image.generate', implementation: { providerId: 'matriz-a', modelId: 'matriz-a.uno' }, input: { prompt: 'x' }, trace: { traceId: `trace-${n}`, requestId: `req-${n}`, userId: QUIEN.userId }, metadata: { creditTransactionId: `usage_${n}`, creditRequestId: n, creditsEstimated: 5, service: 'ai_image' } });
  const nuevo = (n) => motor.crear(pet(n)).transition.job;
  const reclama = (j, at) => motor.reclamar(j, { principal: QUIEN, at, worker: 'w1' }).transition.job;
  const sale = (j, at) => motor.marcarEnvio(j, { principal: QUIEN, at, worker: 'w1', attemptId: j.attempts.at(-1).attemptId }).transition.job;
  const r = (j, at) => decidirReconciliacion(j, at, PLAZOS_DE_VIDEO);
  const l = (j, at) => decidirLiquidacion(j, at);
  const estados = [];

  /* A · murió ANTES de salir hacia el proveedor. */
  let a = reclama(nuevo('opA'), T0 + 10);
  const tardeA = a.attempts[0].lease.until + 5_000;
  estados.push(['A murió antes de salir', a.state, r(a, tardeA).tipo + '/' + r(a, tardeA).motivo, l(a, tardeA).tipo + '/' + l(a, tardeA).motivo]);
  check('N1 muerto ANTES de salir: la reconciliación no lo toca (`no_salio`) y el barrendero lo deja esperando como `recuperable`: ni cobra ni devuelve', a.state === 'running' && r(a, tardeA).tipo === 'nada' && r(a, tardeA).motivo === 'no_salio' && l(a, tardeA).tipo === 'esperar' && l(a, tardeA).motivo === 'recuperable');

  /* B · murió DESPUÉS de salir y sin saber cómo llamó el proveedor a la tarea. */
  let b = sale(reclama(nuevo('opB'), T0 + 10), T0 + 20);
  const tardeB = b.attempts[0].lease.until + 5_000;
  estados.push(['B murió tras salir, sin referencia', b.state, r(b, tardeB).tipo + '/' + r(b, tardeB).motivo, l(b, tardeB).tipo + '/' + l(b, tardeB).motivo]);
  const bEsperando = motor.evaluar(b, tardeB).transition.job;
  check('N2 muerto DESPUÉS de salir y sin referencia del proveedor: mientras nadie evalúe sigue `running` (la reconciliación dice `sin_referencia`: no hay a quién preguntar); si se evalúa pasa a `waiting`/`unknown` y entonces el dinero se aparta para RECONCILIAR, nunca se devuelve a ciegas', r(b, tardeB).tipo === 'nada' && r(b, tardeB).motivo === 'sin_referencia' && l(b, tardeB).tipo === 'esperar' && bEsperando.state === 'waiting' && l(bEsperando, tardeB).tipo === 'reconciliar');

  /* C · el reintento programado (queued) tras un fallo, sin trabajador que lo recoja. */
  const informe = { attemptId: a.attempts[0].attemptId, outcome: 'failed', dispatched: false, error: core.errorDelCore('PROVIDER_UNAVAILABLE', 'job', { details: { reason: 'p' } }) };
  const c = motor.informar(sale(reclama(nuevo('opC'), T0 + 10), T0 + 20), { principal: QUIEN, at: T0 + 30, worker: 'w1', report: { ...informe, attemptId: reclama(nuevo('opC'), T0 + 10).attempts[0].attemptId, dispatched: true } });
  const cJob = c.transition?.job;
  estados.push(['C reintento programado', cJob?.state, cJob ? l(cJob, cJob.availableAt + 1).tipo + '/' + l(cJob, cJob.availableAt + 1).motivo : '-']);
  check('N3 un fallo reintentable deja el trabajo en `queued` con su hora: es lo que NADIE ejecuta en producción si no hay trabajador (RUNTIME §20.4/§21.4); el dinero espera como `recuperable`', cJob?.state === 'queued' && l(cJob, cJob.availableAt + 1).tipo === 'esperar' && l(cJob, cJob.availableAt + 1).motivo === 'recuperable');

  /* D · lo que daría la recuperación que NO está conectada: evaluar al llegar el plazo. */
  const aFin = motor.evaluar(a, a.deadlineAt + 1);
  const aTerminal = aFin.transition?.job;
  const aFin2 = aTerminal && !['completed', 'failed', 'timed_out', 'cancelled'].includes(aTerminal.state) ? motor.evaluar(aTerminal, a.deadlineAt + 2) : aFin;
  const aCerrado = aFin2.transition?.job ?? aTerminal;
  estados.push(['A tras evaluar al plazo', aCerrado?.state, aCerrado ? l(aCerrado, a.deadlineAt + 3).tipo + '/' + (l(aCerrado, a.deadlineAt + 3).motivo ?? '') : '-']);
  check('N4 si se evaluara al llegar el plazo, A acabaría en un final SIN haber salido y el barrendero ya sabría qué hacer: devolver la reserva (`no_salio`)', ['timed_out', 'failed'].includes(aCerrado?.state) && l(aCerrado, a.deadlineAt + 3).tipo === 'reembolsar' && l(aCerrado, a.deadlineAt + 3).motivo === 'no_salio', `${aCerrado?.state}`);
  const bFin = motor.evaluar(motor.evaluar(b, tardeB).transition.job, b.deadlineAt + 1).transition?.job;
  check('N5 …y B acabaría en `timed_out` pero con el intento `unknown`: el barrendero NO lo devolvería (`reconciliar`): sigue siendo decisión de una persona o del aviso del proveedor', bFin?.state === 'timed_out' && l(bFin, b.deadlineAt + 2).tipo === 'reconciliar');

  /* E · el estado del código: quién llama a la recuperación. */
  const recorre = (dir, out = []) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { if (f.name !== 'node_modules') recorre(p, out); } else if (/\.ts$/.test(f.name)) out.push(p); } return out; };
  const fuentes = recorre(path.join(here, '../src')).map((f) => [path.relative(path.join(here, '..'), f).split(path.sep).join('/'), fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')]);
  const llamanARecuperar = fuentes.filter(([f, t]) => /barrerRecuperables\s*\(/.test(t) && !f.endsWith('job/worker.ts'));
  const evaluanFueraDelCore = fuentes.filter(([f, t]) => /\bmotor\.evaluar\(|\bengine\.evaluar\(/.test(t) && !f.startsWith('src/core/'));
  check('N6 ESTADO CONOCIDO (D-J1, decisión del dueño): `barrerRecuperables` NO lo llama ningún código desplegado, y la única evaluación fuera del Core es la del trabajador al reclamar', llamanARecuperar.length === 0 && evaluanFueraDelCore.every(([f]) => f === 'src/job/worker.ts'), `llamadores: ${llamanARecuperar.map(([f]) => f).join(',') || 'ninguno'} · evalúan: ${evaluanFueraDelCore.map(([f]) => f).join(',')}`);
  const prog = fuentes.find(([f]) => f === 'src/settlement/programado.ts')[1];
  check('N7 y la tarea programada de producción hace SOLO tres cosas: reconciliar, liquidar y el barrido legacy', /mantenimientoDeWee\(/.test(prog) && /barrerTrabajosLegacy\(/.test(prog) && !/barrerRecuperables|\.evaluar\(/.test(prog));
  console.log('   (estados recorridos) ' + estados.map((e) => e.join(' · ')).join('\n   '));
}


/* ── P · El barrendero y su tope de páginas: lo que alcanza, y que NO calla cuando no alcanza ─────────────────
 *
 * El barrendero lee de 100 en 100 y mira como mucho 10 páginas por pasada (1000 trabajos). Lo que espera —un trabajo vivo,
 * uno recuperable que nadie mueve— se queda `pendiente` y se vuelve a mirar CADA pasada (runtime-liquidacion 250: es una
 * decisión de diseño, no un descuido). La consecuencia, medida aquí con un almacén que ordena y pagina como Firestore
 * (por identificador, sin cursor entre pasadas): si más de 1000 trabajos que esperan ocupan los primeros identificadores,
 * un trabajo ya terminado que cae DESPUÉS no se liquida, pasada tras pasada. Hoy no ocurre (dos puertas canary cerradas y
 * un vídeo con un solo intento); es el siguiente techo si se migra más tráfico o si se acumulan trabajos abandonados (N).
 *
 * Lo que sí se exige y se prueba: que NO sea silencioso (la pasada dice `pending` y el cursor) y que hasta el tope se
 * alcance todo. La corrección (un cursor que continúe entre pasadas, o aparcar lo que espera con la revisión que se vio)
 * toca el diseño de runtime-liquidacion 250 y el estado de la tarea programada: queda como decisión del dueño.
 */
{
  console.log('\n── P · Barrendero: tope de páginas y no callar ──');
  const core = lib('core/index.js');
  const { barrerLiquidaciones } = lib('runtime/barrendero.js');
  const motor = core.crearJobEngine();
  const T0 = 1_000_000;
  const QUIEN = { userId: 'user-0001' };
  const pet = (n) => ({ contract: '1.0', principal: QUIEN, at: T0, capability: 'image.generate', implementation: { providerId: 'matriz-a', modelId: 'matriz-a.uno' }, input: { prompt: 'x' }, trace: { traceId: `trace-${n}`, requestId: n, userId: QUIEN.userId }, metadata: { creditTransactionId: `usage_${n}`, creditRequestId: n, creditsEstimated: 5, service: 'ai_image' } });
  const completado = (n) => {
    const q = motor.crear(pet(n)).transition.job;
    const run = motor.reclamar(q, { principal: QUIEN, at: T0 + 10, worker: 'w1' }).transition.job;
    const out = motor.marcarEnvio(run, { principal: QUIEN, at: T0 + 11, worker: 'w1', attemptId: run.attempts[0].attemptId }).transition.job;
    return motor.informar(out, { principal: QUIEN, at: T0 + 12, worker: 'w1', report: { attemptId: out.attempts[0].attemptId, outcome: 'succeeded', dispatched: true, result: { outputRefs: ['asset_x'] } } }).transition.job;
  };
  const almacenFalso = (jobs) => {
    const marcados = new Set();
    const ordenados = [...jobs].sort((x, y) => (x.jobId < y.jobId ? -1 : 1));
    return {
      marcados,
      async porLiquidar({ limit, cursor }) {
        const pendientes = ordenados.filter((j) => !marcados.has(j.jobId) && (!cursor || j.jobId > cursor));
        const pagina = pendientes.slice(0, limit);
        return { jobs: pagina, ...(pagina.length === limit ? { cursor: pagina.at(-1).jobId } : {}) };
      },
      async marcarLiquidado(id) { marcados.add(id); },
    };
  };
  const liquidadas = [];
  const liquidacion = { async liquidar({ reserva }) { liquidadas.push(reserva.requestId); return { desenlace: 'liquidada', estado: 'COMPLETED' }; }, async reembolsar() { return { desenlace: 'reembolsada', estado: 'REFUNDED' }; } };
  const pasada = (alm) => barrerLiquidaciones({ trabajos: alm, liquidacion, ahora: () => T0 + 20 });

  /* P1 · hasta el tope (1000), se alcanza todo, también lo que cae el último. */
  const vivos = Array.from({ length: 999 }, (_, i) => motor.crear(pet(`a${String(i).padStart(4, '0')}`)).transition.job);
  const ultimo = completado('zfinal');
  const alm1 = almacenFalso([...vivos, ultimo]);
  const r1 = await pasada(alm1);
  check('P1 con 999 trabajos esperando y uno terminado al final (1000 en total), UNA pasada liquida el terminado', liquidadas.includes('zfinal') && r1.esperando === 999 && r1.liquidados === 1, JSON.stringify({ ...r1, vistos: undefined }));

  /* P2 · pasado el tope, el terminado NO se alcanza… y la pasada lo DICE. */
  liquidadas.length = 0;
  const muchos = Array.from({ length: 1050 }, (_, i) => motor.crear(pet(`a${String(i).padStart(4, '0')}`)).transition.job);
  const alm2 = almacenFalso([...muchos, ultimo]);
  const r2 = await pasada(alm2);
  const r2b = await pasada(alm2);
  const r2c = await pasada(alm2);
  check('P2 LÍMITE CONOCIDO (D-J2): con 1050 trabajos que esperan por delante, el terminado del final NO se liquida ni en tres pasadas seguidas (lo que espera se vuelve a mirar y ocupa las 10 páginas)', !liquidadas.includes('zfinal') && r2.mirados === 1000 && r2b.mirados === 1000 && r2c.mirados === 1000, `mirados ${r2.mirados}/${r2b.mirados}/${r2c.mirados}`);
  check('P3 …pero NO CALLA: cada pasada trunca devuelve el cursor, y la tarea lo vuelve `pending` (`quedan páginas` en el registro)', typeof r2.cursor === 'string' && typeof r2b.cursor === 'string');
  const { pasarElBarrendero } = lib('runtime/barrido.js');
  const informe = await pasarElBarrendero({ barrer: () => pasada(alm2), ahora: () => T0 + 30, identificador: () => 'sweep-prueba' });
  check('P4 y el informe de la tarea lo marca `pending: true`, que es lo que sale en el log cada 5 minutos', informe.pending === true && informe.skipped === 1000 && informe.settled === 0);

  /* P5 · se resuelve en cuanto lo que espera deja de ocupar: aquí, marcando los que ya no hay que mirar. */
  for (const j of muchos) alm2.marcados.add(j.jobId);
  liquidadas.length = 0;
  const r5 = await pasada(alm2);
  check('P5 en cuanto lo que esperaba sale de la consulta, el terminado se liquida en la pasada siguiente', liquidadas.includes('zfinal') && r5.liquidados === 1);
}


/* ── Q · Cancelar: qué para DE VERDAD y qué solo cambia de estado ──────────────────────────────────────────────
 *
 * La pregunta del paquete: ¿cancelar para al proveedor o solo anota que se pidió? La respuesta, por estado del trabajo,
 * con los motores de verdad. Es un mapa de lo que HAY, no un juicio: lo que no para (un vídeo ya aceptado por Seedance)
 * no se puede arreglar desde aquí —el proveedor no ofrece parada— y lo que importa es que NO se mienta con el dinero.
 */
{
  console.log('\n── Q · Cancelación: qué para de verdad ──');
  const core = lib('core/index.js');
  const { decidirLiquidacion } = lib('runtime/liquidacion.js');
  const { RESOLUTORES_DE_ESTADO } = lib('engine/registry.js');
  const motor = core.crearJobEngine();
  const T0 = 1_000_000;
  const QUIEN = { userId: 'user-0001' };
  const pet = (n) => ({ contract: '1.0', principal: QUIEN, at: T0, capability: 'image.generate', implementation: { providerId: 'matriz-a', modelId: 'matriz-a.uno' }, input: { prompt: 'x' }, trace: { traceId: `trace-${n}`, requestId: n, userId: QUIEN.userId }, metadata: { creditTransactionId: `usage_${n}`, creditRequestId: n, creditsEstimated: 5, service: 'ai_video' } });
  const nuevo = (n) => motor.crear(pet(n)).transition.job;
  const corre = (j, at = T0 + 10) => motor.reclamar(j, { principal: QUIEN, at, worker: 'w1' }).transition.job;
  const sale = (j, at, ref) => motor.marcarEnvio(j, { principal: QUIEN, at, worker: 'w1', attemptId: j.attempts.at(-1).attemptId, ...(ref ? { providerRef: ref } : {}) }).transition.job;

  /* Q1 · en la cola de Weë: parada REAL (no salió nada). */
  const cQ = motor.cancelar(nuevo('req-q1'), QUIEN, T0 + 5);
  check('Q1 cancelar un trabajo en cola lo cancela de verdad en el acto (no había nada que parar) y su dinero se devuelve', cQ.transition?.to === 'cancelled' && decidirLiquidacion(cQ.transition.job, T0 + 6).tipo === 'reembolsar');

  /* Q2 · corriendo: se PIDE parar; si llega el final bueno, gana el final (y se cobra). */
  const r = sale(corre(nuevo('req-q2')), T0 + 20);
  const pedida = motor.cancelar(r, QUIEN, T0 + 30);
  check('Q2 cancelar un trabajo que ya salió solo registra la PETICIÓN (`cancel_requested`): el proveedor sigue con lo suyo', pedida.transition?.to === 'cancel_requested');
  const llegaElFinal = motor.informar(pedida.transition.job, { principal: QUIEN, at: T0 + 40, worker: 'w1', report: { attemptId: r.attempts[0].attemptId, outcome: 'succeeded', dispatched: true, result: { outputRefs: ['asset_x'] } } });
  check('Q2b si el proveedor termina bien después de pedir parar, GANA EL FINAL: `completed` y se cobra (el resultado existe y costó dinero)', llegaElFinal.transition?.to === 'completed' && decidirLiquidacion(llegaElFinal.transition.job, T0 + 41).tipo === 'liquidar');
  const llegaElFallo = motor.informar(pedida.transition.job, { principal: QUIEN, at: T0 + 40, worker: 'w1', report: { attemptId: r.attempts[0].attemptId, outcome: 'failed', dispatched: true, error: core.errorDelCore('PROVIDER_UNAVAILABLE', 'job', { details: { reason: 'p' } }) } });
  check('Q2c y si falla, la parada se consuma: `cancelled`, y el barrendero devuelve la reserva', llegaElFallo.transition?.to === 'cancelled' && decidirLiquidacion(llegaElFallo.transition.job, T0 + 41).tipo === 'reembolsar');

  /* Q3 · en manos del proveedor, con su referencia: también solo la petición… salvo que el proveedor sepa parar. */
  const w = motor.informar(sale(corre(nuevo('req-q3')), T0 + 20, { providerId: 'seedance', operationId: 'cgt-1' }), { principal: QUIEN, at: T0 + 25, worker: 'w1', report: { attemptId: 'x', outcome: 'unknown', dispatched: true, error: core.errorDelCore('INTERNAL_ERROR', 'job', { details: { reason: 'p' } }) } });
  check('Q3 la parada por proveedor depende de que su resolutor sepa parar: fal SÍ, Seedance NO (un vídeo de Seedance ya aceptado NO se puede parar desde Weë; si termina, se cobra)', typeof RESOLUTORES_DE_ESTADO.fal?.cancelar === 'function' && RESOLUTORES_DE_ESTADO.seedance?.cancelar === undefined, `resolutores: ${Object.keys(RESOLUTORES_DE_ESTADO).join(',')}`);
  void w;

  /* Q4 · quién pide parar al proveedor: la reconciliación (cada 5 min), NO `conductor.cancelar`. */
  const fuente = (f) => fs.readFileSync(path.join(here, '../src/runtime', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  check('Q4 `conductor.cancelar` solo anota la petición en el Job Engine; pedirle parar al proveedor (`pedirParada`) lo hace únicamente la reconciliación programada', !/pedirParada|resolutor/.test(fuente('conductor.ts')) && /pedirParada\(/.test(fuente('reconciliador.ts')));
  check('Q5 una llamada síncrona en vuelo NO se aborta al cancelar: el ejecutor del conductor no lleva señal de cancelación (la petición termina, su resultado se anota y se descarta o se cobra según el caso)', !/AbortController|AbortSignal|\.abort\(/.test(fuente('ejecutor.ts')));
}

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ todo en orden');
process.exit(fallos ? 1 : 0);
