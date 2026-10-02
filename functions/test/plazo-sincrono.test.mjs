/**
 * WEË — EL PRESUPUESTO DE UN INTENTO QUE SE ESPERA.
 *
 * ── Qué se mide aquí ────────────────────────────────────────────────────────
 *
 * Que un paso pueda decir cuánto dura SU intento, y que eso llegue de verdad
 * hasta el adaptador, sin que el Job Engine cambie para nadie más.
 *
 *     WorkflowStep.timeoutMs → Orchestrator → StepDispatch.timeoutMs
 *       → conductor → job.policy.attemptTimeoutMs
 *       → paqueteDe: min(attemptTimeoutMs, lo que queda de plazo)
 *       → Gateway: min(execution.timeoutMs, deadlineAt − now)
 *       → adapter.run({ timeoutMs })  → pollUntil
 *
 * Ninguna de esas capas es nueva. Lo único que faltaba era que quien pide un
 * medio pudiera declararlo, y el hueco estaba en `PasoDeMedioDeps`.
 *
 * ── Por qué hacía falta ─────────────────────────────────────────────────────
 *
 * Dos minutos es la vara de un POST asíncrono. El único vídeo real medido en
 * producción tardó 78 931 ms sondeando. Medir el sondeo con la vara del POST
 * declara vencido un trabajo que iba bien y deja la ejecución abierta: es
 * exactamente el estado en que se quedó `canary-m1b`.
 *
 * La cadena se recorre ENTERA con los motores de verdad. Lo único de mentira es
 * el adaptador, que apunta lo que le llega. Usa el compilado: `npm run build`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const motorDelGateway = lib('engine/gateway.js');
const registroDeWee = lib('registry/index.js');
const ajustes = lib('engine/registry.js');
const trabajosDeWee = lib('job/index.js');
const { memoryLedger } = lib('engine/ledger.js');
const { crearConductor, MARGEN_DE_CIERRE_MS } = lib('runtime/conductor.js');
const { colaDeInvocacion } = lib('runtime/cola.js');
const { crearEjecutor } = lib('runtime/ejecutor.js');
const { resolutorDelRouter } = lib('runtime/resolucion.js');
const { pedirMedio } = lib('runtime/medios.js');

const VIDEO = sinComentarios(leer('functions/src/creator/video.ts'));

/* ── El mundo ─────────────────────────────────────────────────────────────── */

const T0 = 1_000_000;
const now = () => T0;
const QUIEN = { userId: 'user-0001' };

/** Apunta lo que le llega y contesta como contestaría Seedance sin aceptar. */
const adaptadorEspia = (caps) => {
  const a = {
    id: 'seedance', name: 'seedance', modalities: ['video', 'text'], llamadas: [],
    models: [{ id: 'seedance-1', provider: 'seedance', capabilities: caps, quality: 3, speed: 3, cost: { unit: 'second', usd: 0.01 } }],
    isConfigured: () => true,
    supports: (c) => caps.includes(c),
    async run(req) {
      a.llamadas.push({ timeoutMs: req.timeoutMs, acceptAsync: req.acceptAsync, capability: req.capability });
      return req.capability === 'text.generate'
        ? { output: { kind: 'text', content: 'listo' }, costUSD: 0.002, latencyMs: 7 }
        : { output: { kind: 'video', url: 'https://x/y.mp4', durationSec: 4 }, costUSD: 0.22, latencyMs: 11 };
    },
  };
  return a;
};

const almacen = () => {
  const porId = new Map(); const porClave = new Map();
  const k = (s, key) => `${s.length}.${s}:${key}`;
  return {
    porId,
    async crearSiAusente(job) { await null; const c = k(job.idempotency.scope, job.idempotency.key); if (porClave.has(c)) return { created: false, job: porId.get(porClave.get(c)) }; porClave.set(c, job.jobId); porId.set(job.jobId, job); return { created: true, job }; },
    async obtener(id) { await null; return porId.get(id); },
    async porIdempotencia(sc, key) { await null; const c = k(sc, key); return porClave.has(c) ? porId.get(porClave.get(c)) : undefined; },
    async aplicar(t) { await null; const a = porId.get(t.jobId); if (!a || a.revision !== t.expectedRevision) return { applied: false, job: a }; porId.set(t.jobId, t.job); return { applied: true, job: t.job }; },
    async recuperables() { return { jobs: [] }; },
  };
};

const ejecuciones = () => {
  const m = new Map();
  return {
    m,
    async crearSiAusente({ run, workflow }) { await null; if (m.has(run.id)) return { created: false, guardada: m.get(run.id) }; const g = { run, workflow, revision: 0 }; m.set(run.id, g); return { created: true, guardada: g }; },
    async obtener(id) { await null; return m.get(id); },
    async guardar(run, rev) { await null; const a = m.get(run.id); if (!a || a.revision !== rev) return { saved: false, guardada: a }; const g = { run, workflow: a.workflow, revision: rev + 1 }; m.set(run.id, g); return { saved: true, guardada: g }; },
  };
};

const mundo = (caps = ['video.generate', 'text.generate']) => {
  const espia = adaptadorEspia(caps);
  const adapters = { seedance: espia };
  const config = { providers: {}, settings: ajustes.DEFAULT_SETTINGS };
  const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers));
  const gateway = core.crearGateway({
    registry: registro,
    executor: motorDelGateway.crearEjecutorDelMotor({ adapters, config: () => config, now }),
    tracer: { record: () => {} },
    now,
  });
  const libro = memoryLedger();
  const trabajos = almacen();
  const conductor = crearConductor({
    trabajos,
    ejecuciones: ejecuciones(),
    cola: colaDeInvocacion(now),
    motor: trabajosDeWee.crearMotorDeTrabajosDeWee().motor,
    resolver: resolutorDelRouter(core.crearRouter({ registry: registro })),
    ejecutor: crearEjecutor({
      gateway,
      libro: {
        async abrir(d) { return libro.open({ userId: d.trace.userId, jobId: d.trace.runId, stepId: d.trace.stepId, requestId: d.trace.requestId, capability: d.capability, modality: 'video', provider: d.implementation.providerId, model: d.implementation.modelId, attempt: d.attempt, estimatedUsd: 0, pricingMode: 'simulated' }); },
        async cerrar() { await null; },
      },
      ahora: now,
      repetir: () => () => {},
    }),
    trabajador: { worker: 'w-1', visibilityMs: 30_000, backpressureDelayMs: 1_000 },
    ahora: now,
  });
  return { conductor, espia, trabajos };
};

let serie = 0;
const pedir = async (extra = {}) => {
  serie++;
  const id = `s6f2_t_${String(serie).padStart(4, '0')}`;
  const m = extra.mundo ?? mundo();
  const desenlace = await pedirMedio({
    conductor: m.conductor,
    principal: QUIEN,
    trace: { traceId: id, requestId: id, userId: QUIEN.userId, workplace: 'studio' },
    capability: extra.capability ?? 'video.generate',
    input: { prompt: 'una taza de cafe' },
    proposito: 'Crear un vídeo',
    deadlineAt: extra.deadlineAt ?? now() + 600_000,
    ...(extra.timeoutMs !== undefined ? { timeoutMs: extra.timeoutMs } : {}),
  });
  const trabajo = [...m.trabajos.porId.values()].pop();
  return { desenlace, trabajo, espia: m.espia, mundo: m };
};

/* ── Los números que NO se tocan ──────────────────────────────────────────── */

const P = core.POLITICA_DE_TRABAJO;
const ESPERADO = P.maxLifetimeMs - MARGEN_DE_CIERRE_MS;

console.log('\n── A · Lo que el Job Engine sigue siendo para todos los demás ──');

check('I) `maxLifetimeMs` sigue siendo 600 000', P.maxLifetimeMs === 600_000, String(P.maxLifetimeMs));
check('J) `maxAttempts` sigue siendo 3', P.retry.maxAttempts === 3, String(P.retry.maxAttempts));
check('K) el backoff sigue intacto', P.retry.backoffMs === 2_000 && P.retry.backoffFactor === 2 && P.retry.maxBackoffMs === 60_000,
  `${P.retry.backoffMs}/${P.retry.backoffFactor}/${P.retry.maxBackoffMs}`);
check('L) el margen de cierre del conductor sigue siendo 5 000', MARGEN_DE_CIERRE_MS === 5_000, String(MARGEN_DE_CIERRE_MS));
check('y el `attemptTimeoutMs` GLOBAL sigue siendo 120 000: esto no cambió para nadie', P.attemptTimeoutMs === 120_000, String(P.attemptTimeoutMs));
check('el presupuesto del sondeo es una RESTA de los dos, no un número suelto', ESPERADO === 595_000, `${P.maxLifetimeMs} − ${MARGEN_DE_CIERRE_MS} = ${ESPERADO}`);

console.log('\n── B · Sin declararlo, no cambia nada ──');

const a = await pedir();
check('A) un paso SIN timeout propio conserva el defecto del Job Engine',
  a.trabajo.policy.attemptTimeoutMs === 120_000, String(a.trabajo.policy.attemptTimeoutMs));
check('A) y eso es lo que baja al adaptador', a.espia.llamadas[0]?.timeoutMs === 120_000, String(a.espia.llamadas[0]?.timeoutMs));
check('A) el paso terminó bien: la cadena se recorrió de verdad', a.desenlace.estado === 'terminado', a.desenlace.estado);

console.log('\n── C · Declarándolo, llega entero hasta el adaptador ──');

const b = await pedir({ timeoutMs: ESPERADO });
check('B) `step.timeoutMs` se convierte en el `attemptTimeoutMs` DEL TRABAJO',
  b.trabajo.policy.attemptTimeoutMs === ESPERADO, String(b.trabajo.policy.attemptTimeoutMs));
check('C/D) y el Gateway se lo entrega al adaptador, que es quien sondea',
  b.espia.llamadas[0]?.timeoutMs === ESPERADO, String(b.espia.llamadas[0]?.timeoutMs));
check('C) el valor efectivo SUPERA los 120 s, que es el problema que esto resuelve',
  b.espia.llamadas[0]?.timeoutMs > 120_000, `${b.espia.llamadas[0]?.timeoutMs} > 120000`);
check('F) y con la aceptación apagada el adaptador ejecuta y contesta',
  b.desenlace.estado === 'terminado' && b.espia.llamadas[0]?.acceptAsync === false, `${b.desenlace.estado}/${b.espia.llamadas[0]?.acceptAsync}`);
check('el resto de la política del trabajo NO se movió: solo cambió el intento',
  b.trabajo.policy.maxLifetimeMs === P.maxLifetimeMs
  && b.trabajo.policy.retry.maxAttempts === P.retry.maxAttempts
  && b.trabajo.policy.retry.backoffMs === P.retry.backoffMs
  && b.trabajo.policy.leaseMs === P.leaseMs,
  `vida=${b.trabajo.policy.maxLifetimeMs} intentos=${b.trabajo.policy.retry.maxAttempts} concesion=${b.trabajo.policy.leaseMs}`);

console.log('\n── D · Y no se contagia ──');

const g = await pedir({ capability: 'text.generate' });
check('G) otra capability, sin timeout propio, sigue con los 120 s de siempre',
  g.trabajo.policy.attemptTimeoutMs === 120_000 && g.espia.llamadas[0]?.timeoutMs === 120_000,
  `trabajo=${g.trabajo.policy.attemptTimeoutMs} adaptador=${g.espia.llamadas[0]?.timeoutMs}`);
check('el defecto del Job Engine NO se movió después de haber usado uno específico',
  core.POLITICA_DE_TRABAJO.attemptTimeoutMs === 120_000, String(core.POLITICA_DE_TRABAJO.attemptTimeoutMs));
/*
 * El plazo manda sobre el presupuesto. Si el trabajo vive menos de lo que el
 * paso pide, gana el plazo: `min(attemptTimeoutMs, lo que queda)`. Sin esto, un
 * paso podría pedir diez minutos dentro de un trabajo de dos y nadie lo pararía.
 */
const c = await pedir({ timeoutMs: ESPERADO, deadlineAt: now() + 90_000 });
check('un paso no puede pedir más de lo que le queda de plazo: gana el plazo',
  c.espia.llamadas[0]?.timeoutMs === 90_000, String(c.espia.llamadas[0]?.timeoutMs));

console.log('\n── E · La puerta del canary, leída en su código ──');

check('el presupuesto NO es un número mágico: se deriva de las dos constantes',
  /POLITICA_DE_TRABAJO\.maxLifetimeMs - MARGEN_DE_CIERRE_MS/.test(VIDEO) && !/595[_ ]?000/.test(VIDEO),
  'derivado, y 595000 no aparece escrito');
check('H) el camino de siempre sigue intacto: su plazo y su motor no se tocaron',
  /PLAZO_DE_VIDEO_MS = 1_500_000/.test(VIDEO) && /videoEngine\.generate\(/.test(VIDEO) && /PLAZO_DE_VIDEO_MS - RESERVA_PARA_LIQUIDAR_MS/.test(VIDEO));
/*
 * PRE-F1-D (autorizado el 2026-09-27): el trabajo asíncrono ya no se mide con el
 * margen de la invocación. Con ciento veinte segundos, un reintento tardío
 * vencía un vídeo ACEPTADO que ModelArk seguía haciendo. Ahora vive lo que
 * `plazos.ts` le da a un vídeo, y ese número no se escribe en la puerta.
 */
check('E) el trabajo asíncrono vive lo que plazos.ts da al vídeo, no el margen de la invocación',
  !/MARGEN_DEL_CANARY_MS/.test(VIDEO) && /PLAZOS_DE_VIDEO\.vidaDelTrabajoMs/.test(VIDEO) && !/120_000/.test(VIDEO));
check('E) y el presupuesto SOLO se pasa cuando la aceptación está apagada',
  /ACEPTA_ASINCRONO \? \{\} : \{ timeoutMs: PRESUPUESTO_DEL_SONDEO_MS \}/.test(VIDEO));
check('E) el plazo del trabajo también depende de esa misma decisión, no de dos',
  /PLAZO_DEL_TRABAJO_MS = ACEPTA_ASINCRONO \? PLAZOS_DE_VIDEO\.vidaDelTrabajoMs : POLITICA_DE_TRABAJO\.maxLifetimeMs/.test(VIDEO));
check('D) y el adaptador sigue sondeando con lo que le den, sin plazo propio',
  /timeoutMs: request\.timeoutMs/.test(sinComentarios(leer('functions/src/engine/providers/seedance.ts'))));
check('nadie tocó el `attemptTimeoutMs` del Job Engine',
  /attemptTimeoutMs: 120_000/.test(leer('functions/src/core/job.ts')));
check('y el timeout por paso viaja por la costura que ya existía, no por una nueva',
  /dispatch\.timeoutMs !== undefined \? \{ policy: \{ attemptTimeoutMs: dispatch\.timeoutMs \} \}/.test(sinComentarios(leer('functions/src/runtime/conductor.ts'))));

/*
 * Y QUÉ PIDE LA PUERTA HOY. S6-F la apagó: el canario de vídeo recorría el Core
 * de punta a punta con el proveedor real y quería el desenlace DENTRO de la
 * llamada. PRE-F1-D la vuelve a encender (autorizado el 2026-09-27): el sondeo
 * dentro de la llamada devolvía el dinero de tareas que ModelArk seguía
 * haciendo. Con eso encendido, la llamada se va en cuanto el proveedor acepta,
 * el presupuesto del sondeo NO viaja y el trabajo vive lo que `plazos.ts` da
 * al vídeo — que es justo lo que las comprobaciones de arriba miden.
 */
check('la puerta pide que el proveedor acepte y suelte: el vídeo es asíncrono',
  /const ACEPTA_ASINCRONO: boolean = true;/.test(VIDEO), 'ACEPTA_ASINCRONO = true');

check('esta suite está en la cadena de `npm test`', /plazo-sincrono\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
