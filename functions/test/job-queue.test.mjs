/**
 * JOB ENGINE — COLA Y TRABAJADORES HORIZONTALES (preparación, antes de F12-D).
 *
 * El Job Engine de la Fase 8 ya sabía que varios trabajadores compitan por un
 * trabajo sin ejecutarlo dos veces. Lo que no tenía nombre era por dónde LLEGA
 * el trabajo al trabajador. Esta suite comprueba los dos puertos nuevos
 * (`core/job-queue.ts`) y el protocolo de una entrega (`job/worker.ts`) contra
 * lo único que importa: que ninguna entrega repetida, ninguna muerte y ninguna
 * carrera produzcan una segunda ejecución válida.
 *
 *   A · El mensaje es un aviso, y no puede llevar nada que falsear.
 *   B · Una entrega, de punta a punta, y lo que deja para seguirle la pista.
 *   C · Entregado dos veces, ejecutado una.
 *   D · Dos trabajadores a la vez.
 *   E · El trabajador muere: antes de salir, después de salir, y el zombi.
 *   F · Reintento con espera, y contrapresión.
 *   G · Venenos, huérfanos y el barrido que rescata lo que la cola perdió.
 *   H · Un solo camino para todos los productos, y nada en la memoria del proceso.
 *   I · Estructura: qué se añadió, qué NO se tocó y qué sigue sin conectar.
 *
 * LA COLA Y EL ALMACÉN DE ESTA SUITE VIVEN AQUÍ, no en `src`, por lo mismo que
 * en la Fase 8: un `Array` en el código de producción sería infraestructura de
 * mentira. No son una cola distribuida ni lo fingen: imitan SUS GARANTÍAS
 * —entrega al menos una vez, visibilidad que caduca, compare-and-set—, que es
 * contra lo que hay que probar.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REVISION_POSTAUDITORIA, REVISION_CIERRE } from './_bloques-autorizados.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const core = lib('core/index.js');
const comp = lib('job/index.js');
const { atenderEntrega, barrerRecuperables } = lib('job/worker.js');

/* ── El mundo de prueba ────────────────────────────────────────────────────── */
const T0 = 1_000_000;
let reloj = T0;
const now = () => reloj;
const POL = core.POLITICA_DE_TRABAJO;

/** El almacén de la Fase 8, tal cual: crear solo si no está, escribir solo si la revisión es la esperada. */
const almacen = () => {
  const porId = new Map(); const porClave = new Map();
  const k = (s, key) => `${s.length}.${s}:${key}`;
  let escrituras = 0;
  return {
    porId, get escrituras() { return escrituras; },
    async crearSiAusente(job) { await null; const c = k(job.idempotency.scope, job.idempotency.key); if (porClave.has(c)) return { created: false, job: porId.get(porClave.get(c)) }; porClave.set(c, job.jobId); porId.set(job.jobId, job); return { created: true, job }; },
    async obtener(id) { await null; return porId.get(id); },
    async porIdempotencia(s, key) { await null; const c = k(s, key); return porClave.has(c) ? porId.get(porClave.get(c)) : undefined; },
    async aplicar(t) { await null; const a = porId.get(t.jobId); if (!a || a.revision !== t.expectedRevision) return { applied: false, job: a }; porId.set(t.jobId, t.job); escrituras++; return { applied: true, job: t.job }; },
    async recuperables({ before, limit, cursor }) { await null; const todos = [...porId.values()].filter((j) => j.updatedAt <= before).sort((a, b) => (a.jobId < b.jobId ? -1 : 1)); const d = cursor ? todos.findIndex((j) => j.jobId === cursor) + 1 : 0; const p = todos.slice(d, d + limit); return { jobs: p, ...(p.length === limit ? { cursor: p[p.length - 1].jobId } : {}) }; },
  };
};

/** Una cola EN PROCESO: al menos una vez, con visibilidad que caduca y devolución con espera. Nada más. */
const colaEnProceso = () => {
  const items = []; let n = 0;
  const enVuelo = (id) => items.find((i) => i.vuelo?.deliveryId === id);
  return {
    guarantee: 'at_least_once', items,
    async enqueue(message) { items.push({ id: ++n, message, visibleAt: message?.notBefore ?? 0, entregas: 0, vuelo: null, hecho: false }); },
    async claim({ worker, at, visibilityMs }) {
      const it = items.find((i) => !i.hecho && i.visibleAt <= at && (!i.vuelo || i.vuelo.until <= at));
      if (!it) return undefined;
      it.entregas++; it.vuelo = { deliveryId: `d${it.id}.${it.entregas}`, until: at + visibilityMs, worker };
      return { deliveryId: it.vuelo.deliveryId, message: it.message, deliveryCount: it.entregas, receivedAt: at };
    },
    async ack(id) { const it = enVuelo(id); if (it) { it.hecho = true; it.vuelo = null; } },
    async nack(id, { delayMs = 0 } = {}) { const it = enVuelo(id); if (it) { it.visibleAt = reloj + delayMs; it.vuelo = null; } },
    pendientes: () => items.filter((i) => !i.hecho).length,
  };
};

const QUIEN = { userId: 'user-0001' };
const impl = { providerId: 'matriz-a', modelId: 'matriz-a.uno' };
let serie = 0;
const pet = (extra = {}) => {
  serie++;
  return { contract: '1.0', principal: QUIEN, at: reloj, capability: 'image.generate', implementation: impl, input: { prompt: 'un gato con sombrero' },
    trace: { traceId: `trace-${serie}`, requestId: `req-${String(serie).padStart(4, '0')}`, userId: 'user-0001' }, context: { appId: 'wee', operationId: `op-${serie}` }, ...extra };
};
const exito = (d) => ({ attemptId: d.attemptId, outcome: 'succeeded', dispatched: true, result: { outputRefs: [`https://ejemplo.invalido/${d.jobId}/${d.attempt}.png`] }, usage: { costUSD: 0.02 } });
const falloReintentable = (d) => ({ attemptId: d.attemptId, outcome: 'failed', dispatched: true, error: { code: 'PROVIDER_ERROR', source: 'gateway' } });

const montar = (extra = {}) => {
  const store = extra.store ?? almacen();
  const queue = extra.queue ?? colaEnProceso();
  const { motor } = comp.crearMotorDeTrabajosDeWee();
  const llamadas = [];
  const executor = extra.executor ?? { async ejecutar(d) { llamadas.push(d); return exito(d); } };
  const config = { worker: 'trabajador-1', visibilityMs: 30_000, backpressureDelayMs: 5_000, ...(extra.config || {}) };
  const deps = { store, queue, engine: motor, executor, config, now, ...(extra.capacity ? { capacity: extra.capacity } : {}) };
  const crear = async (p = pet()) => { const r = await comp.crearTrabajo(store, motor, p); if (!r.ok) throw new Error('no se creó: ' + JSON.stringify(r.decision)); await queue.enqueue(core.mensajeDeCola(r.job, reloj, 'created')); return r.job; };
  const atender = async (d = deps) => { const e = await d.queue.claim({ worker: d.config.worker, at: reloj, visibilityMs: d.config.visibilityMs }); return e ? atenderEntrega(d, e) : undefined; };
  return { store, queue, motor, llamadas, deps, crear, atender, otro: (nombre, ex) => ({ ...deps, config: { ...config, worker: nombre }, ...(ex ? { executor: ex } : {}) }) };
};

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El mensaje es un aviso, y no puede llevar nada que falsear ──');
{
  const m = montar(); reloj = T0;
  const job = await m.crear();
  const msg = core.mensajeDeCola(job, reloj, 'created');
  check('1) un mensaje son cuatro campos —contrato, trabajo, cuándo, por qué— y sale congelado', igual(Object.keys(msg).sort(), ['contract', 'enqueuedAt', 'jobId', 'reason']) && Object.isFrozen(msg) && msg.contract === '1.0');
  check('2) `notBefore` aparece solo cuando el trabajo todavía no toca', core.mensajeDeCola({ jobId: job.jobId, availableAt: reloj + 5000 }, reloj, 'retry').notBefore === reloj + 5000 && !('notBefore' in msg));
  check('3) solo se puede construir desde el trabajo, y no lleva ni el proveedor, ni el modelo, ni lo que se pidió', core.mensajeDeCola.length === 3 && !JSON.stringify(msg).includes('matriz-a') && !JSON.stringify(msg).includes('gato') && !JSON.stringify(msg).includes('image.generate'));
  /*
   * Un dato que conviene tener delante: el `jobId` que DERIVA la Fase 8 —cuando nadie da uno— sale de la identidad de
   * idempotencia, así que lleva dentro la cuenta. No es autoridad: quién actúa se lee del trabajo guardado (62). Pero
   * viajará por los registros de la cola que se enchufe, y quien no lo quiera ahí da su propio `jobId` al crear.
   */
  const propio = await comp.crearTrabajo(m.store, m.motor, pet({ jobId: 'job_opaco_0001' }));
  check('3b) el identificador derivado lleva la cuenta dentro; uno propio, no — y los dos caben en un mensaje', msg.jobId.includes('user-0001') && propio.ok && !core.mensajeDeCola(propio.job, reloj, 'created').jobId.includes('user-0001')
    && core.leerMensajeDeCola(core.mensajeDeCola(propio.job, reloj, 'created')).ok);
  /*
   * El lector no puede ser más estricto que quien crea. El identificador más largo que la Fase 8 produce hoy ronda los
   * 140 —exige que la clave de proveedor derivada quepa en 160—, y el tope que DECLARA para un trabajo es 400.
   */
  const u28 = 'u'.repeat(28);
  const largo = await comp.crearTrabajo(m.store, m.motor, pet({ principal: { userId: u28 }, trace: { traceId: 't-largo', requestId: 'req-largo', userId: u28 }, idempotencyKey: 'k'.repeat(100) }));
  const demasiado = await comp.crearTrabajo(m.store, m.motor, pet({ principal: { userId: u28 }, trace: { traceId: 't-largo', requestId: 'req-largo', userId: u28 }, idempotencyKey: 'k'.repeat(140) }));
  check('3c) el lector de mensajes nunca es más estricto que el motor: lee el identificador más largo que el motor crea, y admite hasta su tope declarado',
    largo.ok && largo.job.jobId.length > 130 && core.leerMensajeDeCola(core.mensajeDeCola(largo.job, reloj, 'created')).ok && !demasiado.ok
    && core.leerMensajeDeCola({ ...msg, jobId: 'x'.repeat(400) }).ok && core.leerMensajeDeCola({ ...msg, jobId: 'x'.repeat(401) }).code === 'invalid_job_id'
    && /const MAX_ID = 400;/.test(leer('functions/src/core/job.ts')));
  const FALSEAR = ['providerId', 'modelId', 'accountId', 'entityId', 'cost', 'credits', 'implementation', 'capability', 'input', 'principal', 'owner', 'userId', 'policy', 'attemptId', 'worker', 'usage'];
  const colados = FALSEAR.filter((k) => { const r = core.leerMensajeDeCola({ ...msg, [k]: 'x' }); return r.ok || r.code !== 'unknown_field'; });
  check(`4) ninguno de los ${FALSEAR.length} campos con los que se podría dirigir una ejecución cabe en un mensaje`, colados.length === 0, colados.join(', '));
  check('5) lo que no es un objeto llano no es un mensaje, y un prototipo envenenado tampoco',
    [null, 'x', 7, [], [msg], Object.create(msg), new (class M { constructor() { Object.assign(this, msg); } })()].every((v) => core.leerMensajeDeCola(v).code === 'malformed'));
  check('6) contrato, identificador, instante y motivo se comprueban uno a uno',
    core.leerMensajeDeCola({ ...msg, contract: '9.9' }).code === 'unsupported_contract' && core.leerMensajeDeCola({ ...msg, jobId: '../x y' }).code === 'invalid_job_id'
    && core.leerMensajeDeCola({ ...msg, jobId: 7 }).code === 'invalid_job_id' && core.leerMensajeDeCola({ ...msg, enqueuedAt: 'ayer' }).code === 'invalid_field'
    && core.leerMensajeDeCola({ ...msg, reason: 'porque sí' }).code === 'invalid_field' && core.leerMensajeDeCola({ ...msg, notBefore: -1 }).code === 'invalid_field');
  const leido = core.leerMensajeDeCola(JSON.parse(JSON.stringify(msg)));
  check('7) uno bueno se lee, y lo que sale es un objeto NUEVO y congelado', leido.ok && igual(leido.mensaje, msg) && Object.isFrozen(leido.mensaje));
  check('8) la cola promete lo único que una cola puede prometer: al menos una vez', m.queue.guarantee === 'at_least_once' && !/exactly_once/.test(sinComentarios(leer('functions/src/core/job-queue.ts'))));
}

console.log('\n── B · Una entrega, de punta a punta ──');
{
  const m = montar(); reloj = T0;
  const job = await m.crear(pet({ context: { appId: 'wee-studio', workspaceId: 'ws-1', operationId: 'op-b', workflowId: 'wf-1', stepId: 'imagen' } }));
  reloj = T0 + 1_500;
  const r = await m.atender();
  const final = await m.store.obtener(job.jobId);
  check('9) mensaje → reclamar → guardar → marcar → guardar → ejecutar → informar → guardar: el trabajo termina `completed`', r.outcome === 'executed' && final.state === 'completed' && m.llamadas.length === 1);
  check('10) lo que se ejecutó salió del TRABAJO GUARDADO, no del mensaje', m.llamadas[0].implementation.providerId === 'matriz-a' && m.llamadas[0].capability === 'image.generate' && m.llamadas[0].input.prompt === 'un gato con sombrero' && m.llamadas[0].jobId === job.jobId);
  check('11) antes de ejecutar ya estaba guardado que salía: `dispatched` se escribe ANTES de la llamada', final.attempts[0].dispatched === true && m.store.escrituras === 3, `${m.store.escrituras} escrituras`);
  check('12) la entrega queda confirmada y la cola vacía', m.queue.pendientes() === 0);
  const campos = ['jobId', 'attemptId', 'attempt', 'requestId', 'traceId', 'accountId', 'operationId', 'appId', 'worker', 'deliveryId', 'deliveryCount', 'enqueuedAt', 'receivedAt', 'startedAt', 'endedAt', 'queueLatencyMs', 'executionMs', 'attemptOutcome', 'jobState'];
  const faltan = campos.filter((c) => r[c] === undefined);
  check('13) OBSERVABILIDAD: cada entrega cuenta qué trabajo, qué intento, qué petición, de quién, desde dónde, quién lo cogió y cuánto tardó', faltan.length === 0, faltan.join(', '));
  check('14) y esos datos salen del almacén: la cuenta, la petición y el producto son los del trabajo', r.accountId === 'user-0001' && r.requestId === job.trace.requestId && r.appId === 'wee-studio' && r.operationId === 'op-b' && r.queueLatencyMs === 1_500 && r.worker === 'trabajador-1');
  check('15) lo que costó viaja en el intento, intacto, para quien tenga que leerlo: el trabajador no cobra nada', final.attempts[0].usage?.costUSD === 0.02 && !('credits' in r) && !('cost' in r));
}

console.log('\n── C · Entregado dos veces, ejecutado una ──');
{
  const m = montar(); reloj = T0;
  const job = await m.crear();
  await m.queue.enqueue(core.mensajeDeCola(job, reloj, 'requeued'));
  await m.queue.enqueue(core.mensajeDeCola(job, reloj, 'requeued'));
  const r = [await m.atender(), await m.atender(), await m.atender()];
  check('16) el mismo trabajo avisado tres veces se ejecuta UNA', m.llamadas.length === 1 && igual(r.map((x) => x.outcome), ['executed', 'skipped', 'skipped']) && r[1].detail === 'terminal');
  check('17) y un solo intento, un solo resultado', (await m.store.obtener(job.jobId)).attempts.length === 1 && m.queue.pendientes() === 0);
  /* La misma PETICIÓN dos veces tampoco crea dos trabajos: eso ya lo garantizaba la Fase 8, y sigue. */
  const p = pet({ idempotencyKey: 'clave-unica-0001' });
  const a = await comp.crearTrabajo(m.store, m.motor, p), b = await comp.crearTrabajo(m.store, m.motor, p);
  check('18) la misma petición dos veces es UN trabajo', a.created && !b.created && a.job.jobId === b.job.jobId);
}

console.log('\n── D · Dos trabajadores a la vez ──');
{
  const m = montar(); reloj = T0;
  const job = await m.crear();
  await m.queue.enqueue(core.mensajeDeCola(job, reloj, 'requeued'));
  const ejecuciones = [];
  const lento = (nombre) => ({ async ejecutar(d) { ejecuciones.push(nombre); await new Promise((r) => setTimeout(r, 5)); return exito(d); } });
  const w1 = m.otro('trabajador-1', lento('trabajador-1')), w2 = m.otro('trabajador-2', lento('trabajador-2'));
  const [e1, e2] = await Promise.all([m.atender(w1), m.atender(w2)]);
  const final = await m.store.obtener(job.jobId);
  check('19) dos trabajadores con el mismo trabajo en la mano: lo ejecuta UNO', ejecuciones.length === 1 && [e1.outcome, e2.outcome].filter((o) => o === 'executed').length === 1, `${e1.outcome}/${e1.detail} · ${e2.outcome}/${e2.detail}`);
  check('20) el otro no falla: o perdió la carrera, o vio la concesión y volverá más tarde', ['lost', 'deferred', 'skipped'].includes(e1.outcome === 'executed' ? e2.outcome : e1.outcome));
  check('21) y el intento es de quien lo ejecutó', final.state === 'completed' && final.attempts.length === 1 && ejecuciones[0] === (e1.outcome === 'executed' ? 'trabajador-1' : 'trabajador-2'));
}

console.log('\n── E · El trabajador muere ──');
{
  /* E1 · Muere con el trabajo reclamado y SIN haber salido hacia el proveedor. */
  const m = montar(); reloj = T0;
  const job = await m.crear();
  const entrega = await m.queue.claim({ worker: 'trabajador-1', at: reloj, visibilityMs: 30_000 });
  const reclamo = m.motor.reclamar(job, { principal: QUIEN, at: reloj, worker: 'trabajador-1' });
  await m.store.aplicar(reclamo.transition);
  const intentoMuerto = reclamo.dispatch.attemptId;
  /* …y aquí se muere: ni marca el envío, ni ejecuta, ni confirma la entrega. */
  reloj = T0 + POL.leaseMs + 1;
  const r = await m.atender(m.otro('trabajador-2'));
  const final = await m.store.obtener(job.jobId);
  check('22) la concesión caduca, la cola vuelve a entregar, y OTRO trabajador lo termina', entrega.deliveryCount === 1 && r.deliveryCount === 2 && r.outcome === 'executed' && final.state === 'completed' && r.worker === 'trabajador-2');
  check('23) con un `attemptId` NUEVO: el del muerto se cerró y no se reutiliza jamás', final.attempts.length === 2 && final.attempts[0].attemptId === intentoMuerto && final.attempts[0].outcome === 'failed'
    && final.attempts[0].error?.details?.reason === 'lease_expired' && final.attempts[1].attemptId !== intentoMuerto && r.attemptId === final.attempts[1].attemptId && r.attempt === 2);
  check('24) y con otra clave de proveedor: es otra ejecución', final.attempts[0].providerKey !== final.attempts[1].providerKey && m.llamadas[0].idempotencyKey === final.attempts[1].providerKey);
  const INMUTABLES = ['jobId', 'owner', 'context', 'capability', 'implementation', 'input', 'trace', 'idempotency', 'createdAt', 'deadlineAt', 'policy', 'mode'];
  check('25) el trabajo ORIGINAL no se altera: qué era, de quién y hasta cuándo siguen igual', INMUTABLES.every((k) => igual(final[k], job[k])), INMUTABLES.filter((k) => !igual(final[k], job[k])).join(', '));
  check('26) recuperar no gasta más que un intento de los tres', final.attemptCount === 2 && m.llamadas.length === 1);

  /* E2 · Muere DESPUÉS de marcar que salía: no se sabe si el proveedor lo hizo. */
  const n = montar(); reloj = T0;
  const j2 = await n.crear();
  await n.queue.claim({ worker: 'trabajador-1', at: reloj, visibilityMs: 30_000 });
  const rec = n.motor.reclamar(j2, { principal: QUIEN, at: reloj, worker: 'trabajador-1' });
  const tras = (await n.store.aplicar(rec.transition)).job;
  await n.store.aplicar(n.motor.marcarEnvio(tras, { principal: QUIEN, at: reloj, worker: 'trabajador-1', attemptId: rec.dispatch.attemptId }).transition);
  reloj = T0 + POL.leaseMs + 1;
  const r2 = await n.atender(n.otro('trabajador-2'));
  const f2 = await n.store.obtener(j2.jobId);
  check('27) si murió DESPUÉS de salir hacia el proveedor, NADIE lo repite: repetirlo podría cobrarse dos veces', n.llamadas.length === 0 && r2.outcome === 'skipped' && f2.state === 'waiting' && f2.attempts.length === 1 && f2.attempts[0].outcome === 'unknown');
  check('28) y la entrega se confirma: lo cerrará el aviso del proveedor o el plazo, no otra ejecución', n.queue.pendientes() === 0);
  reloj = f2.deadlineAt + 1;
  await n.queue.enqueue(core.mensajeDeCola(f2, reloj, 'requeued'));
  const r3 = await n.atender(n.otro('trabajador-3'));
  check('29) si nunca vuelve nada, lo vence el plazo — sin ejecutarlo', r3.outcome === 'skipped' && (await n.store.obtener(j2.jobId)).state === 'timed_out' && n.llamadas.length === 0);

  /* E3 · El zombi: se cree vivo, pero su concesión caducó y otro ya hizo el trabajo. */
  const z = montar(); reloj = T0;
  const j3 = await z.crear();
  await z.queue.enqueue(core.mensajeDeCola(j3, reloj, 'requeued'));
  const w2 = z.otro('trabajador-2');
  let escriturasDelZombi = 0;
  /* Al zombi se le para el mundo justo entre «guardé que es mío» y «guardé que sale». */
  const almacenDelZombi = { ...z.store, porId: z.store.porId, async aplicar(t) {
    escriturasDelZombi++;
    if (escriturasDelZombi === 2) { reloj = T0 + POL.leaseMs + 1; await z.atender(w2); }
    return z.store.aplicar(t);
  } };
  const ejecucionesDelZombi = [];
  const zombi = { ...z.deps, store: almacenDelZombi, config: { ...z.deps.config, worker: 'zombi' }, executor: { async ejecutar(d) { ejecucionesDelZombi.push(d); return exito(d); } } };
  const rz = await z.atender(zombi);
  const f3 = await z.store.obtener(j3.jobId);
  check('30) el ZOMBI no ejecuta: cuando despierta, su escritura ya no vale y se entera', rz.outcome === 'lost' && rz.detail === 'dispatch_mark_race' && ejecucionesDelZombi.length === 0);
  check('31) el trabajo lo terminó quien tenía la concesión válida, una sola vez', f3.state === 'completed' && z.llamadas.length === 1 && f3.attempts.length === 2 && f3.attempts[1].outcome === 'succeeded');
  const tardio = z.motor.informar(f3, { principal: QUIEN, at: reloj, worker: 'zombi', report: { attemptId: f3.attempts[0].attemptId, outcome: 'succeeded', dispatched: true, result: { outputRefs: ['https://ejemplo.invalido/zombi.png'] } } });
  check('32) y aunque el zombi informe después, su informe no mueve nada: solo el dueño válido completa un intento', tardio.status === 'noop' && !JSON.stringify(f3.result).includes('zombi'));

  /* E4 · El ejecutor revienta a mitad. */
  const x = montar({ executor: { async ejecutar() { throw new Error('se cayó la red'); } } }); reloj = T0;
  const j4 = await x.crear();
  const rx = await x.atender();
  const f4 = await x.store.obtener(j4.jobId);
  check('33) si el ejecutor revienta tras salir, el desenlace es `unknown` —no «falló»— y no se reintenta a ciegas', rx.outcome === 'executed' && rx.attemptOutcome === 'unknown' && f4.state === 'waiting' && f4.attempts[0].outcome === 'unknown' && x.queue.pendientes() === 0);
}

console.log('\n── F · Reintento con espera, y contrapresión ──');
{
  let veces = 0;
  const m = montar({ executor: { async ejecutar(d) { veces++; return veces === 1 ? falloReintentable(d) : exito(d); } } }); reloj = T0;
  const job = await m.crear();
  const r1 = await m.atender();
  const medio = await m.store.obtener(job.jobId);
  check('34) un fallo reintentable devuelve el trabajo a la cola, con su espera', r1.outcome === 'executed' && r1.attemptOutcome === 'failed' && medio.state === 'queued' && medio.availableAt > reloj && r1.requeuedFor === medio.availableAt);
  check('35) y se AVISA antes de confirmar la entrega: caerse entre medias deja un aviso de más, nunca uno de menos', m.queue.items.length === 2 && m.queue.items[1].message.reason === 'retry' && m.queue.items[1].message.notBefore === medio.availableAt && m.queue.items[0].hecho === true);
  check('36) antes de su hora la cola ni lo entrega', (await m.atender()) === undefined);
  /* Un transporte que ignore `notBefore` no rompe nada: el que decide es `reclamar`. */
  m.queue.items[1].visibleAt = 0;
  const pronto = await m.atender();
  check('37) y si un transporte lo entregara antes de tiempo, se devuelve para su hora: la pista no es la verdad', pronto.outcome === 'deferred' && pronto.detail === 'not_available_yet' && pronto.requeuedFor === medio.availableAt && veces === 1);
  reloj = medio.availableAt;
  const r2 = await m.atender();
  const final = await m.store.obtener(job.jobId);
  check('38) a su hora, segundo intento: otro `attemptId`, otra clave, y termina', r2.outcome === 'executed' && r2.attempt === 2 && final.state === 'completed' && final.attempts[0].attemptId !== final.attempts[1].attemptId && veces === 2);

  /* Contrapresión: los topes son del Job Engine (Fase 8); el trabajador solo le da con qué decidir. */
  const lleno = montar({ config: { limits: { maxRunningPerAccount: 1 } }, capacity: { async capacidad() { return { runningForAccount: 1 }; } } }); reloj = T0;
  const jc = await lleno.crear();
  const rc = await lleno.atender();
  check('39) CONTRAPRESIÓN por cuenta: si no cabe, no se reclama ni se ejecuta; vuelve más tarde', rc.outcome === 'deferred' && rc.detail === 'at_capacity' && rc.requeuedFor === T0 + 5_000 && lleno.llamadas.length === 0 && (await lleno.store.obtener(jc.jobId)).state === 'queued' && lleno.store.escrituras === 0);
  const prov = montar({ config: { limits: { maxRunningPerProvider: 2, maxRunning: 100 } }, capacity: { async capacidad(j) { return { running: 3, runningForProvider: j.implementation.providerId === 'matriz-a' ? 2 : 0 }; } } }); reloj = T0;
  await prov.crear();
  check('40) y por capacidad del proveedor, que el contador conoce porque LEE el trabajo', (await prov.atender()).detail === 'at_capacity' && prov.llamadas.length === 0);
  const cabe = montar({ config: { limits: { maxRunningPerAccount: 2 } }, capacity: { async capacidad() { return { runningForAccount: 1 }; } } }); reloj = T0;
  await cabe.crear();
  check('41) cuando cabe, pasa', (await cabe.atender()).outcome === 'executed');
  const ciego = montar({ config: { limits: { maxRunningPerAccount: 1 } } }); reloj = T0;
  const jx = await ciego.crear();
  const aviso = ciego.motor.reclamar(jx, { principal: QUIEN, at: reloj, worker: 'w', limits: { maxRunningPerAccount: 1 } });
  check('42) un tope que nadie pudo comprobar NO se da por cumplido: el Job Engine lo avisa', aviso.warnings.includes('capacity_not_checked'));
}

console.log('\n── G · Venenos, huérfanos y el barrido ──');
{
  const m = montar(); reloj = T0;
  const job = await m.crear();
  m.queue.items.length = 0;
  await m.queue.enqueue({ ...core.mensajeDeCola(job, reloj, 'created'), providerId: 'otra-matriz', modelId: 'el-caro', accountId: 'user-0002', credits: 0 });
  await m.queue.enqueue({ contract: '1.0', jobId: 'job-que-no-existe', enqueuedAt: reloj, reason: 'created' });
  await m.queue.enqueue('esto no es un mensaje');
  const r = [await m.atender(), await m.atender(), await m.atender()];
  check('43) un mensaje con proveedor, modelo, cuenta o Credits dentro se TIRA entero: no se ejecuta nada con él', r[0].outcome === 'dropped' && r[0].detail === 'message_unknown_field' && m.llamadas.length === 0);
  check('44) un aviso de un trabajo que no existe, y algo que ni es un mensaje, también', r[1].detail === 'job_not_found' && r[2].detail === 'message_malformed' && m.llamadas.length === 0);
  check('45) y se CONFIRMAN: un veneno que vuelve siempre es una cola parada', m.queue.pendientes() === 0 && m.store.escrituras === 0);
  check('46) el trabajo de verdad sigue intacto, esperando', (await m.store.obtener(job.jobId)).state === 'queued' && (await m.store.obtener(job.jobId)).implementation.providerId === 'matriz-a');

  /* La cola perdió el aviso Y el trabajador murió. Queda el almacén, que es la verdad. */
  const p = montar(); reloj = T0;
  const j1 = await p.crear(), j2 = await p.crear(), j3 = await p.crear();
  const rec = p.motor.reclamar(j1, { principal: QUIEN, at: reloj, worker: 'trabajador-muerto' });
  await p.store.aplicar(rec.transition);
  p.queue.items.length = 0;
  reloj = T0 + POL.leaseMs + 1;
  const pag1 = await barrerRecuperables(p.deps, { limit: 2 });
  const pag2 = await barrerRecuperables(p.deps, { limit: 2, cursor: pag1.cursor });
  check('47) EL BARRIDO: recorre el almacén por páginas, recupera lo que tiene la concesión caducada y vuelve a avisar', pag1.revisados === 2 && !!pag1.cursor && pag1.recuperados + pag2.recuperados === 1 && pag1.avisados + pag2.avisados === 3 && !pag2.cursor);
  check('48) lo recuperado se avisa como `recovered`; lo que solo esperaba, como `requeued`', p.queue.items.filter((i) => i.message.reason === 'recovered').length === 1 && p.queue.items.filter((i) => i.message.reason === 'requeued').length === 2);
  while (await p.atender());
  const finales = await Promise.all([j1, j2, j3].map((j) => p.store.obtener(j.jobId)));
  check('49) y los tres terminan, cada uno UNA vez: que la cola pierda un mensaje no pierde un trabajo', finales.every((f) => f.state === 'completed') && p.llamadas.length === 3 && finales[0].attempts.length === 2);
}

console.log('\n── H · Un solo camino para todos los productos ──');
{
  const m = montar(); reloj = T0;
  const APPS = ['wee', 'wee-studio', 'wee-design', 'wee-travel', 'wee-music', 'wee-chef', 'wee-business'];
  const trabajos = [];
  for (const appId of APPS) trabajos.push(await m.crear(pet({ context: { appId, operationId: `op-${appId}` } })));
  const resultados = [];
  for (let r = await m.atender(); r; r = await m.atender()) resultados.push(r);
  check('50) siete productos, UNA cola y UN trabajador: todos terminan', resultados.length === 7 && resultados.every((r) => r.outcome === 'executed') && igual(resultados.map((r) => r.appId), APPS));
  const forma = (d) => { const { jobId, attemptId, idempotencyKey, trace, deadlineAt, ...resto } = d; return resto; };
  check('51) y se ejecutan EXACTAMENTE igual: de qué producto viene no decide nada', m.llamadas.every((d) => igual(forma(d), forma(m.llamadas[0]))));
  check('52) no hay una cola por Workplace, ni un trabajador por producto', !/porApp|byApp|colaDe[A-Z]|queueFor|workerFor|appId\s*===/.test(sinComentarios(leer('functions/src/job/worker.ts')) + sinComentarios(leer('functions/src/core/job-queue.ts'))));

  /* Horizontal: otro «proceso» —otro motor, otra configuración, nada compartido salvo almacén y cola— coge lo que creó el primero. */
  const procesoA = montar(); reloj = T0;
  const creado = await procesoA.crear();
  const procesoB = montar({ store: procesoA.store, queue: procesoA.queue, config: { worker: 'proceso-b' } });
  const rb = await procesoB.atender();
  check('53) ESCALADO HORIZONTAL: un trabajador nuevo, en otro proceso, coge un trabajo que creó otro', rb.outcome === 'executed' && rb.worker === 'proceso-b' && rb.jobId === creado.jobId && procesoB.llamadas.length === 1 && procesoA.llamadas.length === 0);
  const estadoDeModulo = (src) => [...(src.match(/^(let|var)\s+\w+/gm) || []), ...(src.match(/^const\s+\w+[^=\n]*=\s*(new (Map|Set|WeakMap|WeakSet)\(\s*\)|\[\s*\])/gm) || [])];
  check('54) nada vive en la memoria del proceso: ni una variable mutable a nivel de módulo', estadoDeModulo(sinComentarios(leer('functions/src/job/worker.ts'))).length === 0 && estadoDeModulo(sinComentarios(leer('functions/src/core/job-queue.ts'))).length === 0);
}

console.log('\n── I · Estructura: qué se añadió, qué NO se tocó, y qué sigue sin conectar ──');
{
  const PUERTOS = sinComentarios(leer('functions/src/core/job-queue.ts'));
  const WORKER = sinComentarios(leer('functions/src/job/worker.ts'));
  check('55) los puertos son Core: ni Firebase, ni red, ni reloj, ni dados, y solo importan del Core',
    !/firebase|firestore|node:|axios|fetch\(|require\(/.test(PUERTOS) && !/Date\.now\(|Math\.random\(|new Date\(/.test(PUERTOS) && [...PUERTOS.matchAll(/from ['"]([^'"]+)['"]/g)].every(([, d]) => d.startsWith('./')));
  check('56) NINGUNA infraestructura: ni un producto de colas, ni un corredor de mensajes, ni un planificador',
    !/redis|celery|kafka|rabbit|pub\/?sub|pubsub|cloud ?tasks|sqs|kubernetes|bullmq|setInterval|cron/i.test(PUERTOS + WORKER));
  check('57) el trabajador tampoco lee el reloj por su cuenta ni guarda nada: el reloj entra por la puerta', !/Date\.now\(|Math\.random\(|new Date\(/.test(WORKER) && /now: \(\) => number;/.test(leer('functions/src/job/worker.ts')));
  check('58) el trabajador atiende UNA entrega: no hay bucle de sondeo', !/while\s*\(|setTimeout|for\s*\(\s*;\s*;/.test(WORKER.slice(0, WORKER.indexOf('export const barrerRecuperables'))));
  check('59) ni la cola ni el trabajador saben de Credits, de la billetera ni del Financial Core', !/credit|wallet|billetera|financial|spend|refund|cobr|precio|price/i.test(PUERTOS + WORKER));
  check('60) ni eligen proveedor ni llaman a ninguno: eso es del Router y del Gateway', !/crearRouter|resolverDeWee|gatewayDeWee|crearGateway|engine\.generate|runCapability|adapter/i.test(PUERTOS + WORKER) && !/(gemini|seedance|deepseek|openai|elevenlabs|anthropic)/i.test(PUERTOS + WORKER));
  const interfaz = (nombre, src) => (src.match(new RegExp(`export interface ${nombre} \\{[\\s\\S]*?\\n\\}`)) || [''])[0];
  const PROHIBIDOS = /\b(providerId|modelId|accountId|entityId|cost|credits|implementation|capability)\b\??:/;
  check('61) SEGURIDAD: ni el mensaje, ni la entrega, ni el puerto de la cola, ni la configuración del trabajador tienen por dónde recibir proveedor, modelo, cuenta, entidad, coste o Credits',
    ['QueueMessage', 'QueueDelivery', 'QueuePort', 'WorkerConfig'].every((n) => interfaz(n, leer('functions/src/core/job-queue.ts')).length > 0 && !PROHIBIDOS.test(sinComentarios(interfaz(n, leer('functions/src/core/job-queue.ts'))))));
  check('62) la identidad de quien actúa sale del almacén, no del mensaje', /const principal: Principal = \{ userId: job\.owner\.userId/.test(WORKER) && !/mensaje\.(userId|accountId|owner|principal)/.test(WORKER));

  const tocados = execSync('git diff --name-only c3515b3 -- functions/src/core/router.ts functions/src/core/financial functions/src/credits', { cwd: RAIZ, encoding: 'utf8' }).trim();
  /*
   * CREDITS SALIÓ DE LA LISTA POR UN ARCHIVO, y con el mismo trato que
   * recibieron en su día el Gateway, el Workflow y el Orchestrator: algo
   * autorizado, medido y vigilado de otra forma.
   *
   * `credits/aiPricing.ts` guardaba un máximo de propuestas propio —`Math.min(8,
   * …)`, escrito el 2026-09-07— mientras los cuatro adaptadores guardaban otro
   * —4, del día anterior—. Entre los dos había una ventana: pedir ocho retoques
   * costaba 108 Credits y devolvía cuatro imágenes. Eso no se arregla
   * congelando el archivo: se arregla quitándole el número, y para quitárselo
   * hay que tocarlo.
   *
   * Así que la afirmación cambia de forma, no de fuerza. Antes decía «este
   * archivo es byte a byte el desplegado»; ahora dice «este archivo ya no tiene
   * un máximo propio». Lo primero era una foto; lo segundo es la regla que la
   * foto protegía, y es la que de verdad importa. El resto de Credits
   * —`creditCosts`, `index` y los demás— sigue congelado exactamente igual que
   * antes; `creditEngine`, `creditValidation` y `creditTransactions` salieron
   * después, en PRE-F1-D, con una afirmación más estrecha todavía (63p).
   *
   * Lo que sigue a esto NO es la política del techo ni su valor: eso vive en
   * `test/techo-de-propuestas.test.mjs`, que es de quien es el tema. Aquí solo
   * se comprueba el radio de acción: qué se ha tocado de lo cerrado, y por qué.
   */
  const AI_PRICING = 'functions/src/credits/aiPricing.ts';
  /*
   * Y `credits/index.ts` (los callables, no el motor) salió con el mismo trato
   * el 2026-09-30, por el escenario #24 de la auditoría H0: `spendCredits`,
   * abierto al cliente, dejaba pagar 1 Credit por una operación cara. El
   * arreglo autorizado es un candado de administración en ese callable, y la
   * afirmación vuelve a cambiar de forma sin perder fuerza: en ese archivo no
   * se ha QUITADO nada y la única línea de código nueva es el candado, dentro
   * de `spendCredits`. `creditEngine` sigue congelado igual que antes.
   */
  const CALLABLES_DE_CREDITS = 'functions/src/credits/index.ts';
  /* Los de la identidad del cobro (PRE-F1-D): qué se les permite lo dice 63p, línea a línea. */
  const DE_LA_IDENTIDAD = ['functions/src/credits/creditEngine.ts', 'functions/src/credits/creditValidation.ts', 'functions/src/credits/creditTransactions.ts'];
  /*
   * Y los de la MISIÓN fal (2026-10-05), con autorización del dueño y del tamaño exacto (63fal): el Router del Core gana
   * la modalidad '3d' en su lista y en su guardia —lo que esa guardia exige cuando cambia la unión `Modality`—, y
   * creditCosts gana el servicio `ai_world` (su precio de prueba, su etiqueta y su capacidad). Ni gasto, ni cobro, ni
   * reembolso, ni ningún otro servicio se mueven.
   */
  const DE_LA_MISION_FAL = ['functions/src/core/router.ts', 'functions/src/credits/creditCosts.ts'];
  /* Un archivo nuevo también es tocar lo cerrado, aunque aún no esté en git: `git diff` no lo ve y esto sí. */
  const sinSeguir = execSync('git ls-files --others --exclude-standard -- functions/src/core/router.ts functions/src/core/financial functions/src/credits', { cwd: RAIZ, encoding: 'utf8' }).trim();
  const fueraDelPermiso = [...tocados.split('\n'), ...sinSeguir.split('\n')].map((l) => l.trim())
    .filter((l) => l && l !== AI_PRICING && l !== CALLABLES_DE_CREDITS && !DE_LA_IDENTIDAD.includes(l) && !DE_LA_MISION_FAL.includes(l));
  check('63) CONTRATOS CERRADOS SIN TOCAR: Router, Financial y el resto de Credits son los del commit desplegado', fueraDelPermiso.length === 0, fueraDelPermiso.join(' '));
  {
    const lineas = (archivo) => {
      const d = execSync(`git diff -U0 c3515b3 -- ${archivo}`, { cwd: RAIZ, encoding: 'utf8' }).split('\n');
      const codigo = (signo) => d.filter((l) => l.startsWith(signo) && !l.startsWith(signo.repeat(3)))
        .map((l) => l.slice(1).trim()).filter((l) => l && !/^(\*|\/\*|\/\/)/.test(l));
      return { quitadas: codigo('-'), nuevas: codigo('+') };
    };
    const delRouter = lineas('functions/src/core/router.ts');
    const deCostes = lineas('functions/src/credits/creditCosts.ts');
    check('63fal) y de la misión fal, exacto: el Router del Core solo gana la modalidad 3d (lista y guardia) y creditCosts solo el servicio ai_world',
      JSON.stringify(delRouter.quitadas) === JSON.stringify([
        "const MODALIDADES = ['text', 'vision', 'image', 'video', 'voice', 'music', 'doc'] as const;",
        'const MODALIDADES_COMPLETAS: Record<Modality, true> = { text: true, vision: true, image: true, video: true, voice: true, music: true, doc: true };',
      ]) && JSON.stringify(delRouter.nuevas) === JSON.stringify([
        "const MODALIDADES = ['text', 'vision', 'image', 'video', 'voice', 'music', 'doc', '3d'] as const;",
        "const MODALIDADES_COMPLETAS: Record<Modality, true> = { text: true, vision: true, image: true, video: true, voice: true, music: true, doc: true, '3d': true };",
      ]) && deCostes.quitadas.length === 0 && JSON.stringify(deCostes.nuevas) === JSON.stringify([
        'ai_world: 39,', "ai_world: 'Generación de mundo 3D',", "case 'world.generate':", "return 'ai_world';",
      ]), JSON.stringify({ delRouter, deCostes }));
  }
  {
    const delCallable = execSync('git diff -U0 c3515b3 -- ' + CALLABLES_DE_CREDITS, { cwd: RAIZ, encoding: 'utf8' });
    const quitadas = delCallable.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
    const codigoNuevo = delCallable.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
      .map((l) => l.slice(1).trim()).filter((l) => l && !/^(\*|\/\*|\/\/)/.test(l));
    const fuente = leer(CALLABLES_DE_CREDITS);
    const cuerpoSpend = fuente.slice(fuente.indexOf('export const spendCredits'), fuente.indexOf('export const grantCredits'));
    /*
     * Y el cierre post-auditoría del 2026-10-01 toca, con autorización, DOS casos de `creditsAdmin` (solo
     * administración) y el import que lo permite:
     *  · `balance` lee con `readBalance` (money/admin-balance-con-efecto): consultar el saldo de alguien ya no le
     *    inicializa la cuenta, ni le migra la billetera, ni le da la bienvenida;
     *  · `failed` pasa su `limit` por `assertLimit` (50 por defecto, 200 como mucho), el techo que ya usaba el
     *    historial: un número cualquiera del panel no lee la colección entera.
     * Por eso esto ya no dice «nada quitado»: dice QUÉ se quitó y QUÉ código entró, exacto y en su orden (las tres
     * líneas que se sustituyen; el import, el candado de #24 y las dos líneas nuevas). Ni gasto, ni reembolso, ni
     * `grantCredits`, ni `refundCredits` se mueven; una línea más, una menos o una distinta, y 63k cae.
     */
    const QUITADAS_AUTORIZADAS = [
      "import { assertRequestId, cleanText, toHttpsError } from './creditValidation';",
      "        return creditEngine.getBalance(String(data.userId || ''));",
      "        const snap = await db.collection('creditTransactions').where('status', '==', 'REFUNDED').orderBy('createdAt', 'desc').limit(Number(data.limit) || 50).get();",
    ];
    const CODIGO_NUEVO_AUTORIZADO = [
      "import { assertLimit, assertRequestId, cleanText, toHttpsError } from './creditValidation';",
      "assertAdmin(request.auth as any);",
      "return creditEngine.readBalance(String(data.userId || ''));",
      "const snap = await db.collection('creditTransactions').where('status', '==', 'REFUNDED').orderBy('createdAt', 'desc').limit(assertLimit(data.limit)).get();",
    ];
    const cuerpoAdmin = fuente.slice(fuente.indexOf('export const creditsAdmin'));
    const caso = (nombre) => cuerpoAdmin.slice(cuerpoAdmin.indexOf(`case '${nombre}':`), cuerpoAdmin.indexOf('case ', cuerpoAdmin.indexOf(`case '${nombre}':`) + 5));
    check('63k) y en los callables de Credits lo único nuevo es el candado de administración de spendCredits (#24) y los dos casos del cierre en creditsAdmin: quitadas y nuevas, exactas',
      JSON.stringify(quitadas.map((l) => l.slice(1))) === JSON.stringify(QUITADAS_AUTORIZADAS)
      && JSON.stringify(codigoNuevo) === JSON.stringify(CODIGO_NUEVO_AUTORIZADO)
      && cuerpoSpend.includes('assertAdmin(request.auth as any);')
      && caso('balance').includes('return creditEngine.readBalance(String(data.userId || \'\'));')
      && caso('failed').includes('.limit(assertLimit(data.limit)).get();'),
      `${quitadas.length} líneas quitadas · código nuevo: ${codigoNuevo.join(' | ') || 'ninguno'}`);
  }
  const PRECIO = sinComentarios(leer(AI_PRICING));
  const TECHO = /const count = Math\.max\(1, Math\.min\(MAX_PROPUESTAS_POR_PASO, Number\(input\.count \?\? 1\)\)\);/;
  check('63o) y `aiPricing`, el que se tocó por G13.4, ya no guarda un máximo de propuestas propio: lo lee de la autoridad compartida',
    TECHO.test(PRECIO) && /import \{ MAX_PROPUESTAS_POR_PASO \} from '[^']+';/.test(PRECIO)
    && !/Math\.min\(\s*\d+\s*,\s*Number\(input\.count/.test(PRECIO),
    'G13.4 · el 8 ya no está, y no se ha puesto otro número en su sitio · dónde vive lo vigila `techo-de-propuestas`');
  /*
   * PRE-F1-D SACA TRES ARCHIVOS MÁS DE LA LISTA, y con una afirmación más
   * estrecha que la de `aiPricing`. No dice «este archivo cumple una regla»:
   * dice «este archivo es el desplegado MÁS exactamente este bloque».
   *
   * El Credit Engine daba por repetida cualquier operación cuyo `requestId` ya
   * existiera. Una respuesta de Weë Brain cobrada y cerrada (`brain_…`,
   * COMPLETED) servía así de pase para un vídeo: la reserva decía «ya está
   * pagado», nadie volvía a cobrar y el vídeo salía gratis. Se corrige donde se
   * decide si una reserva es la de esta operación —dentro de la transacción del
   * gasto— y con la regla que el Core ya tenía para la misma clave con otro
   * contenido (`idempotency_conflict`). Para eso hay que tocar tres archivos de
   * Credits, y lo autorizado (2026-09-27) es exactamente eso: `esLaMismaOperacion`
   * y su llamada en esa transacción; la huella (`fingerprint`) de la entrada,
   * validada por `assertFingerprint` y guardada con la reserva; y el rechazo con
   * INVALID_REQUEST · `idempotency_conflict`. Ni precios, ni reembolsos, ni
   * cuotas, ni ledger, ni Router, ni `creditCosts`, ni `index`, ni lógica de
   * vídeo dentro del motor, ni un retoque fuera del bloque.
   *
   * Por eso aquí no se mira una propiedad: se RECONSTRUYE cada archivo desde el
   * commit desplegado aplicándole ese bloque, y el resultado tiene que ser el
   * archivo de hoy byte a byte. Una línea más, una menos o una distinta —dentro
   * o fuera del bloque, código o comentario— y 63p cae. Las anclas son líneas
   * del commit desplegado, que no se mueve, y también se comprueban.
   */
  const IDENTIDAD_AUTORIZADA = {
    'functions/src/credits/creditEngine.ts': [
      { linea: 3,
        era: "import { assertAmount, assertLimit, assertRequestId, assertService, assertUserId, cleanText, CreditError } from './creditValidation';",
        queda: "import { assertAmount, assertFingerprint, assertLimit, assertRequestId, assertService, assertUserId, cleanText, CreditError } from './creditValidation';" },
      { tras: 92, es: '  meta?: Record<string, unknown>;', añade: [
        '  /**',
        '   * LA HUELLA DE LA OPERACIÓN. Solo código de servidor, y solo quien sabe',
        '   * exactamente qué se pide —`generateVideo`: el vídeo pedido—. Se guarda con la',
        '   * reserva, y entonces un `requestId` repetido solo es la MISMA operación si',
        '   * trae la misma huella y el mismo importe. Sin huella, la identidad es la',
        '   * cuenta y el servicio.',
        '   */',
        '  fingerprint?: string;',
      ] },
      { tras: 330, es: '', añade: [
        '  /**',
        '   * ¿ES LA RESERVA GUARDADA LA DE ESTA OPERACIÓN?',
        '   *',
        '   * El mismo servicio, siempre. Y si alguno de los dos lados trae huella, la',
        '   * misma huella y el mismo importe autorizado. Es la regla que el Core ya',
        '   * escribió para la misma clave con otro contenido —`idempotency_conflict` en',
        '   * el Financial Core y en el Job Engine—, aplicada al motor que cobra de verdad.',
        '   *',
        '   * El importe solo cuenta con huella, y a propósito: sin ella, quien cobra no',
        '   * dice qué operación es, y hay puertas —Weë Brain— donde el precio del mismo',
        '   * mensaje puede moverse de un intento a otro porque el historial ya lo incluye.',
        '   */',
        '  const esLaMismaOperacion = (guardada: Record<string, unknown>, service: CreditService, amount: number, fingerprint: string | undefined): boolean => {',
        '    if (guardada.service !== service) return false;',
        "    const suya = typeof guardada.fingerprint === 'string' ? guardada.fingerprint : undefined;",
        '    if (suya === undefined && fingerprint === undefined) return true;',
        '    const autorizado = num(guardada.authorizedAmount) || Math.abs(num(guardada.amount));',
        '    return suya === fingerprint && autorizado === amount;',
        '  };',
        '',
      ] },
      { tras: 335, es: '    const requestId = assertRequestId(input.requestId);', añade: [
        '    const fingerprint = input.fingerprint !== undefined ? assertFingerprint(input.fingerprint) : undefined;',
      ] },
      { tras: 351, es: '        }', añade: [
        '        /*',
        '         * LA MISMA CLAVE TIENE QUE SER LA MISMA OPERACIÓN.',
        '         *',
        '         * Antes bastaba con que el `requestId` existiera: una respuesta de Weë',
        '         * Brain ya cobrada (`brain_<messageId>`, COMPLETED) servía de pase para un',
        '         * vídeo, porque la reserva decía «ya está pagado» y nadie volvía a cobrar.',
        '         * Una clave prestada de otra operación no es un reintento: se rechaza sin',
        '         * tocar nada, ni la reserva de antes ni el saldo.',
        '         */',
        '        if (!esLaMismaOperacion(data, service, amount, fingerprint)) {',
        "          throw new CreditError('INVALID_REQUEST', 'Ese requestId pertenece a otra operación; inicia una nueva', { requestId, reason: 'idempotency_conflict' });",
        '        }',
      ] },
      { tras: 390, es: '        authorizedAmount: amount,', añade: [
        '        fingerprint,',
      ] },
    ],
    'functions/src/credits/creditValidation.ts': [
      { tras: 88, es: '', añade: [
        'const FINGERPRINT = /^[a-f0-9]{16,128}$/;',
        '',
        '/** La huella de una operación: la calcula el servidor que sabe qué se pide, nunca el cliente. Hexadecimal, 16–128. */',
        'export const assertFingerprint = (fingerprint: unknown): string => {',
        "  if (typeof fingerprint !== 'string' || !FINGERPRINT.test(fingerprint)) throw new CreditError('INVALID_REQUEST', 'Huella de operación inválida', { field: 'fingerprint' });",
        '  return fingerprint;',
        '};',
        '',
      ] },
    ],
    'functions/src/credits/creditTransactions.ts': [
      { tras: 30, es: '  authorizedAmount?: number;', añade: [
        '  /** Para usage: la huella de la operación, si quien cobró la dio (ver `SpendInput.fingerprint`). */',
        '  fingerprint?: string;',
      ] },
    ],
  };
  const desplegado = (p) => execSync('git show c3515b3:' + p, { cwd: RAIZ, encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const reconstruido = (p) => {
    const lineas = desplegado(p).split('\n');
    let anclas = true;
    /* De abajo arriba, para que cada ancla siga siendo la línea del desplegado que dice ser. */
    for (const c of [...IDENTIDAD_AUTORIZADA[p]].sort((a, b) => (b.tras ?? b.linea) - (a.tras ?? a.linea))) {
      if (c.tras === undefined) { anclas = anclas && lineas[c.linea - 1] === c.era; lineas[c.linea - 1] = c.queda; }
      else { anclas = anclas && lineas[c.tras - 1] === c.es; lineas.splice(c.tras, 0, ...c.añade); }
    }
    return { anclas, texto: lineas.join('\n') };
  };
  const primeraDistinta = (esperado, hoy) => {
    const a = esperado.split('\n');
    const b = hoy.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) return `línea ${i + 1}: «${String(b[i] ?? '(no está)').trim().slice(0, 70)}»`;
    }
    return '';
  };
  /*
   * Y LO AUTORIZADO DESPUÉS —la revisión post-auditoría y el cierre del 2026-10-01—: bloques EXACTOS que se aplican
   * encima de la reconstrucción, en ese orden. Viven en `_bloques-autorizados.mjs` (solo datos, con su porqué).
   */
  const conLaRevision = (p, { anclas, texto }) => {
    let t = texto;
    let ok = anclas;
    for (const b of [...(REVISION_POSTAUDITORIA[p] ?? []), ...(REVISION_CIERRE[p] ?? [])]) {
      const era = b.eran.join('\n');
      const veces = t.split(era).length - 1;
      ok = ok && veces === 1;
      if (veces === 1) t = t.replace(era, () => b.quedan.join('\n'));
    }
    return { anclas: ok, texto: t };
  };
  const deLaIdentidad = DE_LA_IDENTIDAD.map((p) => {
    const { anclas, texto } = conLaRevision(p, reconstruido(p));
    const hoy = leer(p).replace(/\r\n/g, '\n');
    return { archivo: path.basename(p), anclas, exacto: texto === hoy, donde: primeraDistinta(texto, hoy) };
  });
  check('63p) de creditEngine, creditValidation y creditTransactions solo cambió la regla de identidad: cada uno es el desplegado MÁS ese bloque, byte a byte',
    deLaIdentidad.every((x) => x.anclas && x.exacto),
    deLaIdentidad.filter((x) => !x.anclas || !x.exacto).map((x) => `${x.archivo}: ${x.anclas ? x.donde : 'las anclas del desplegado no cuadran'}`).join(' · ') || 'los tres, exactos');
  {
    const MOTOR = sinComentarios(leer('functions/src/credits/creditEngine.ts'));
    const gasto = MOTOR.slice(MOTOR.indexOf('const spendCredits = async'), MOTOR.indexOf('const completeCredits = async'));
    const abre = gasto.indexOf('return db().runTransaction(');
    const transaccion = gasto.slice(abre);
    const reembolsada = transaccion.indexOf("throw new CreditError('ALREADY_REFUNDED'");
    const regla = transaccion.indexOf('if (!esLaMismaOperacion(data, service, amount, fingerprint))');
    const duplicado = transaccion.indexOf('duplicate: true');
    const valida = gasto.indexOf('assertFingerprint(input.fingerprint)');
    check('63q) y ese bloque es la regla, donde tiene que estar: dentro de la transacción del gasto, entre «ya reembolsada» y «es un duplicado», y rechazando como el Core',
      abre > 0 && reembolsada > 0 && reembolsada < regla && regla < duplicado
      && /throw new CreditError\('INVALID_REQUEST', '[^']+', \{ requestId, reason: 'idempotency_conflict' \}\);/.test(transaccion.slice(regla, duplicado))
      && valida > 0 && valida < abre
      && /authorizedAmount: amount,\s*fingerprint,/.test(transaccion)
      && (MOTOR.match(/\besLaMismaOperacion\b/g) || []).length === 2,
      'una regla, llamada una vez, dentro de la transacción · qué más cambió lo dice 63p');
  }
  /*
   * EL WORKFLOW Y EL ORCHESTRATOR SALIERON DE ESA LISTA, y con el mismo trato
   * que recibió el Gateway: algo autorizado, medido y vigilado de otra forma.
   *
   * C11.1 encontró que los recursos que una persona aporta —su foto— existen en
   * el entendimiento y NO tienen camino hasta el paso que los necesita. Hoy
   * llegan porque `creator/inputs.ts` los inyecta en ejecución, que es Legacy
   * siendo autoridad de algo que es del Core. C11.2 abre ese camino:
   * `Plan.references` → `Workflow.references` → `PlanStep.uses` → despacho.
   *
   * Y lo que se vigila ahora es MÁS fuerte que «no se tocó»: que el cambio sea
   * estrictamente ADITIVO. Las únicas líneas que desaparecen son las que se
   * alargaron en su sitio, y las cuatro listas de claves conservan todas las
   * que ya tenían.
   */
  const RECURSOS = 'functions/src/core/workflow.ts functions/src/core/orchestrator.ts';
  const delTransporte = execSync('git diff -U0 c3515b3 -- ' + RECURSOS, { cwd: RAIZ, encoding: 'utf8' });
  const fuera = delTransporte.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1));
  const alargada = (l) => /^import \{|^const CLAVES_DE_|^\s*const hints = leerPistas\(crudo\.hints/.test(l);
  check('63g) del Workflow y el Orchestrator no se ha QUITADO nada: todo lo que desaparece es una línea alargada',
    fuera.length > 0 && fuera.every(alargada),
    fuera.length + ' líneas · ' + fuera.filter((l) => !alargada(l)).length + ' sin justificar');
  {
    const WF = leer('functions/src/core/workflow.ts');
    const lista = (nombre) => {
      const desde = WF.indexOf(`const ${nombre} = [`);
      if (desde < 0) return [];
      return WF.slice(desde + `const ${nombre} = [`.length, WF.indexOf(']', desde))
        .split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean);
    };
    const ANTES = {
      CLAVES_DE_PLAN: ['id', 'contract', 'goal', 'intent', 'steps', 'capabilities', 'language', 'workplace', 'projectId', 'constraints', 'hints', 'explainToUser', 'assumptions', 'warnings'],
      CLAVES_DE_PASO_DE_PLAN: ['id', 'capability', 'purpose', 'dependsOn', 'input', 'produces', 'hints'],
      CLAVES_DE_WORKFLOW: ['id', 'contract', 'goal', 'workplace', 'steps', 'budget', 'explainToUser', 'metadata', 'planId', 'intent', 'projectId', 'language', 'constraints', 'hints', 'assumptions', 'warnings'],
      CLAVES_DE_PASO: ['id', 'capability', 'purpose', 'dependsOn', 'input', 'when', 'retry', 'onFailure', 'timeoutMs', 'requiresApproval', 'quality', 'budget', 'produces', 'hints'],
    };
    const perdidas = Object.entries(ANTES).flatMap(([nombre, ks]) => ks.filter((k) => !lista(nombre).includes(k)).map((k) => nombre + '.' + k));
    check('63h) las cuatro listas de claves solo han CRECIDO: ni una de las de antes se ha caído',
      perdidas.length === 0, perdidas.length ? perdidas.join(' ') : 'ninguna perdida');
    check('63i) y lo que han ganado es exactamente el transporte de recursos',
      lista('CLAVES_DE_PLAN').includes('references') && lista('CLAVES_DE_WORKFLOW').includes('references')
      && lista('CLAVES_DE_PASO_DE_PLAN').includes('uses') && lista('CLAVES_DE_PASO').includes('uses'));
  }
  /*
   * EL JOB ENGINE Y SU COMPOSICIÓN SALEN TAMBIÉN, y con la prueba más fuerte
   * que hay: de esos dos archivos no desaparece NI UNA LÍNEA.
   *
   * C11.3 midió el seam que faltaba: el recurso que la persona aporta llegaba
   * al despacho del Orchestrator y ahí se quedaba, porque `JobDispatch` no
   * tenía dónde ponerlo. Con mecanismo pero sin material, el Gateway rechazaba
   * por `missing_material`: no era cosmético, cortaba la ejecución. C11.4 abre
   * ese paso, y lo abre AÑADIENDO.
   */
  const DEL_TRABAJO = 'functions/src/core/job.ts functions/src/job/index.ts';
  const delTrabajo = execSync('git diff -U0 c3515b3 -- ' + DEL_TRABAJO, { cwd: RAIZ, encoding: 'utf8' });
  const fueraDelTrabajo = delTrabajo.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  /*
   * G8 alargó una línea: el import del Job, que ahora también trae el contrato
   * del material de upstream. Sigue sin desaparecer NADA — lo que se va es una
   * línea que vuelve más larga, igual que en 63g.
   */
  const alargadaDelTrabajo = (l) => /^import {$|^import {/.test(l.trim());
  check('63j) del Job Engine y su composición no se QUITA nada: lo que desaparece es una línea alargada',
    delTrabajo.length > 0 && fueraDelTrabajo.every((l) => alargadaDelTrabajo(l.slice(1))),
    fueraDelTrabajo.length + ' líneas · ' + fueraDelTrabajo.filter((l) => !alargadaDelTrabajo(l.slice(1))).length + ' sin justificar');
  {
    const JOB = leer('functions/src/core/job.ts');
    const COMPOSICION = leer('functions/src/job/index.ts');
    const dentro = [...delTrabajo.matchAll(/^\+\s*(\w+)\??:/gm)].map((m) => m[1]);
    /*
     * DOS transportes, y los dos nombrados: `references` es lo que aportó la
     * persona (C11.4) y `upstream` lo que produjo otro paso del mismo plan (G8).
     * Son cosas distintas a propósito, y por eso son dos campos y no uno.
     */
    check('63k) y lo único que gana son los dos transportes autorizados',
      dentro.every((c) => c === 'references' || c === 'upstream'),
      dentro.length ? [...new Set(dentro)].join(',') : 'ningún campo nuevo');
    check('63l) el trabajo TRANSPORTA el recurso: no lo resuelve, no lo firma y no sabe de quién es',
      !/solicitarEntrega|urlFirmada|leerElemento|leerMaterial|ownerAccountId|getFirestore|https:\/\/|firmar|signUrl/i.test(sinComentarios(JOB + COMPOSICION)),
      'la autorización sigue siendo de la puerta de C8');
    check('63m) y no entra por `input`: el recurso tiene su propio canal',
      !/input\.references|input\.assetId|input\.attachments/.test(JOB + COMPOSICION));
  }

  /*
   * EL GATEWAY SALIÓ DE ESA LISTA A PROPÓSITO, y por DOS cosas, las dos
   * autorizadas y las dos del bloque F12-D:
   *
   *   1. `leerTraza` —de la Fase 2— se comía en silencio los cinco campos que la
   *      Fase 10 añadió a la traza. Defecto demostrado de una fase cerrada.
   *   2. `accepted` estaba DECLARADO desde el primer día y no podía producirse
   *      nunca, porque un adaptador no tenía cómo decir «el proveedor la cogió».
   *      Se añadió esa tercera respuesta y el camino que lleva a `status:
   *      'accepted'`. No es un contrato nuevo: es el que había, terminado.
   *
   * Lo que se vigila es que siga siendo ESO y nada más: que no se haya tocado la
   * rama del resultado normal, ni la de los errores, ni la validación de entrada.
   */
  const GATEWAY = leer('functions/src/core/gateway.ts');
  const delGateway = execSync('git diff -U0 c3515b3 -- functions/src/core/gateway.ts', { cwd: RAIZ, encoding: 'utf8' });
  const trozos = delGateway.split('\n').filter((l) => l.startsWith('@@'));
  const añadidas = delGateway.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
  const quitadas = delGateway.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1));
  check('63b) del Gateway cambió `leerTraza`, y nada más de la traza',
    trozos.length > 0 && añadidas.includes("import { esTipoDeEntidad } from './identity';")
    && quitadas.filter((l) => /for \(const opcional of \[/.test(l)).length === 1,
    `${trozos.length} trozos · quitadas: ${quitadas.length}`);
  check('63c) y se completó `accepted`: una respuesta más del adaptador y su camino, sin tocar las otras dos',
    /\| \{ ok: true; accepted: true; operation: GatewayOperationRef/.test(GATEWAY)
    && /status: 'accepted'/.test(GATEWAY)
    /* La rama nueva va DESPUÉS de los errores y ANTES de validar la respuesta: no se metió en medio de ninguna. */
    && GATEWAY.indexOf('if (!salida.ok)') < GATEWAY.indexOf("salida.accepted === true")
    && GATEWAY.indexOf("salida.accepted === true") < GATEWAY.indexOf('respuestaCanonicaValida(salida.response)'));
  check('63d) sin inventar un modo de ejecución: el del Gateway sigue siendo SIEMPRE `sync`',
    /mode: 'sync' as const/.test(leer('functions/src/job/index.ts'))
    && /if \(mode === 'async'\) return \{ ok: false/.test(GATEWAY)
    && /execution: ExecutionOptions & \{ mode: 'sync' \}/.test(GATEWAY));
  /*
   * 63e CUENTA DOS FASES, Y LAS DISTINGUE. Sigue vigilando lo mismo —que del
   * Gateway no se haya quitado nada que nadie autorizó— pero ya no puede
   * hacerlo con un número, porque S2 tocó la costura de las pistas:
   * `ExecutionHints` ganó `creative`, la lista blanca lo admite y el lector lo
   * devuelve. Son tres líneas modificadas y su comentario, todas en el mismo
   * sitio y todas del lenguaje creativo.
   *
   * Lo que se comprueba es que CADA línea quitada sea de una de las dos fases,
   * y que las dos de F12-D sigan siendo exactamente dos. Una línea que no
   * encaje en ninguna de las dos listas hace fallar esto, que es el punto.
   */
  const deF12D = (l) => /for \(const opcional of \[/.test(l) || /\| \{ ok: true; response: CanonicalResponse/.test(l);
  const deS2 = (l) => /CLAVES_DE_HINTS|return \{ ok: true, hints:|Lo ÚNICO que un adaptador lee|calidad y duración describen el resultado/.test(l);
  /*
   * Y AHORA CUENTA TRES FASES. C11.4 abrió el seam del recurso, y para eso
   * alargó UNA línea más: la lista de claves de la petición, que ahora admite
   * `references`. Es la misma clase de cambio que hizo S2 con las pistas —una
   * costura que gana un inquilino— y por eso va en su propia lista en vez de
   * ensanchar la de nadie.
   */
  const deC114 = (l) => /^const CLAVES_DE_PETICION = /.test(l.trim());
  check('63e) del Gateway solo se han quitado las de F12-D, la costura de pistas de S2 y la de recursos de C11.4',
    quitadas.filter(deF12D).length === 2 && quitadas.filter(deC114).length <= 1
    && quitadas.every((l) => deF12D(l) || deS2(l) || deC114(l)),
    `${quitadas.length} quitadas · ${quitadas.filter((l) => !deF12D(l) && !deS2(l) && !deC114(l)).length} sin justificar`);
  check('63n) y las claves que ganó la petición son SOLO los dos transportes',
    (() => {
      const claves = (l) => (l.match(/'([a-zA-Z]+)'/g) ?? []).map((x) => x.replace(/'/g, ''));
      const nueva = añadidas.find((l) => /^const CLAVES_DE_PETICION = /.test(l.trim()));
      const vieja = quitadas.find((l) => /^const CLAVES_DE_PETICION = /.test(l.trim()));
      if (!nueva || !vieja) return false;
      return claves(vieja).every((c) => claves(nueva).includes(c))
        && claves(nueva).filter((c) => !claves(vieja).includes(c)).sort().join() === 'references,upstream';
    })());
  /*
   * 63f VIGILA LA COSTURA, NO SUS INQUILINOS.
   *
   * Escrito como la lista literal, este guard fijaba qué claves de pista
   * existían, y eso es lo contrario de lo que dice defender: la costura se
   * abrió justamente para que quepan requisitos nuevos sin tubería nueva. C2
   * metió `continuity` por ella y esto rompía sin que nada se hubiera roto.
   *
   * Lo que de verdad hay que sostener son tres cosas, y ahora se comprueban
   * sobre las claves que HAYA, sean las que sean:
   *
   *   1 · las dos escalares de siempre siguen estando;
   *   2 · toda clave que no sea escalar DELEGA entera en su propio contrato
   *       —se valida con una llamada suya, no a trozos aquí—;
   *   3 · y el Gateway no aprende ni una palabra de ninguno de esos
   *       vocabularios. En los comentarios sí, que para eso están.
   */
  const clavesDeHints = (GATEWAY.match(/const CLAVES_DE_HINTS = \[([^\]]*)\]/) ?? [, ''])[1]
    .split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
  const ESCALARES = ['quality', 'durationSec'];
  const delegadas = clavesDeHints.filter((k) => !ESCALARES.includes(k));
  check('63f) y lo que se abrió en el Gateway son claves de pista que delegan en su propio contrato',
    ESCALARES.every((k) => clavesDeHints.includes(k))
    && delegadas.length > 0
    && delegadas.every((k) => new RegExp(`${k}\\?: `).test(GATEWAY))
    && delegadas.every((k) => new RegExp(`!\\w+\\(crudo\\.${k}\\)`).test(GATEWAY))
    && !/aerial|dolly_out|golden_hour|CameraType|MovementType|ContinuityAspect|identity\.face|architecture\./.test(sinComentarios(GATEWAY)),
    `escalares=${ESCALARES.join(',')} delegadas=${delegadas.join(',') || '(ninguna)'}`);
  check('64) sigue habiendo UN motor de trabajos y UN almacén por contrato: aquí no se escribió un segundo', !/crearJobEngine\s*=|createJobEngine|implements JobStore|crearSiAusente\s*[:(]/.test(PUERTOS + WORKER) && /crearJobEngine/.test(leer('functions/src/core/job.ts')));
  const fuentes = (dir) => fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fuentes(`${dir}/${e.name}`) : e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : []));
  /*
   * 65 Y 66 DECÍAN «TODAVÍA NO HAY NADIE» HASTA LA FASE 12-D, que es la que
   * construyó a ese alguien: el conductor (`functions/src/runtime/`). Lo que se
   * vigila ahora es que sea UNO. Un segundo módulo que llame al trabajador sería un
   * segundo runtime; una segunda cola, o una a nivel de módulo, sería el `Array`
   * haciéndose pasar por infraestructura contra el que avisa `core/job-queue.ts`.
   * Y sigue siendo verdad lo que importa: nada de esto lo exporta `index.ts`.
   */
  const quienLoUsa = fuentes('functions/src').filter((f) => !f.endsWith('job/worker.ts') && /job\/worker|atenderEntrega|barrerRecuperables/.test(sinComentarios(leer(f))));
  /*
   * DOS COMPOSICIONES DESDE MC-4.5, y siguen siendo composiciones: el conductor
   * de F12-D para las operaciones de IA, y el puente del canary de Media Cloud.
   * Lo que se vigila no es el número sino que ninguna REIMPLEMENTE al trabajador
   * —cada una le pasa sus dependencias y le llama— y que NADA de esto lo exporte
   * `index.ts`. Un tercero que copiara la lógica sí sería un segundo runtime.
   */
  /*
   * LO QUE `index.ts` PUEDE EXPORTAR, Y LO QUE NO. La regla ya no es «nada»:
   * la puerta del canary de Media Cloud SÍ se exporta a propósito —es admin y
   * deriva su propio material—, y el conductor de F12-D sigue sin exportarse.
   * Lo que no puede salir nunca son las TRIPAS: el trabajador, la cola y el
   * módulo del runtime. Exportar eso sí sería poner infraestructura en la calle.
   */
  const INDICE = sinComentarios(leer('functions/src/index.ts'));
  check('65) solo COMPOSICIONES atienden entregas, ninguna reimplementa al trabajador',
    quienLoUsa.join(',') === 'functions/src/media/canary.ts,functions/src/runtime/conductor.ts', quienLoUsa.join(', '));
  check('65b) y `index.ts` no exporta las tripas: ni trabajador, ni cola, ni el runtime',
    !/job-queue|job\/worker|atenderEntrega|barrerRecuperables|from '\.\/runtime'/.test(INDICE));
  check('65c) el conductor de F12-D sigue SIN exportarse; la puerta del canary, sí y a propósito',
    !/conductor|crearConductor/.test(INDICE) && /export \{ mediaCanary \}/.test(INDICE));
  const estadoDeModulo = (src) => [...(src.match(/^(let|var)\s+\w+/gm) || []), ...(src.match(/^const\s+\w+[^=\n]*=\s*(new (Map|Set|WeakMap|WeakSet)\(\s*\)|\[\s*\])/gm) || [])];
  const colas = fuentes('functions/src').filter((f) => /guarantee: 'at_least_once',/.test(sinComentarios(leer(f))));
  const COLA = leer('functions/src/runtime/cola.ts');
  /*
   * DOS colas, y solo dos: la de una invocación y la durable. Son dos
   * TRANSPORTES del mismo puerto, no dos sistemas — ninguna decide nada sobre
   * un trabajo. Que aparezca una tercera sin que nadie lo decida hace fallar
   * esto, que es para lo que está.
   */
  const DURABLE = leer('functions/src/runtime/cola-durable.ts');
  check('66) DOS colas y ninguna más, y las dos son transportes del mismo puerto',
    colas.join(',') === 'functions/src/runtime/cola-durable.ts,functions/src/runtime/cola.ts',
    colas.join(', '));
  check('66) la de invocación sigue sin guardar nada a nivel de módulo y dice de sí misma lo que es',
    estadoDeModulo(sinComentarios(COLA)).length === 0
    && /NO es una cola distribuida y NO es durable/.test(COLA) && /LO DURABLE ES EL ALMACÉN/.test(COLA)
    && fuentes('functions/src').every((f) => !/colaEnProceso|InMemoryQueue/.test(leer(f)))
    && /No hay almacén\. `JobStore` es un puerto/.test(leer('functions/src/job/index.ts')));
  check('66) y la durable tampoco guarda estado de módulo: lo durable está en el almacenamiento, no en el proceso',
    estadoDeModulo(sinComentarios(DURABLE)).length === 0 && /runTransaction/.test(DURABLE));
  check('67) esta suite está en la cadena de `npm test`', leer('functions/package.json').includes('node test/job-queue.test.mjs'));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
