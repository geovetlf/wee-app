/**
 * EL MUNDO DEL CONDUCTOR, para suites que lo ejercitan (módulo, no suite).
 *
 * Copia FIEL del mundo de `runtime-conductor.test.mjs` (los motores son los de verdad; solo son de mentira el adaptador y
 * los dos almacenes). Está duplicado a propósito y no importado: esa suite ejecuta sus comprobaciones al cargarse y no
 * exporta nada, y tocarla para exportar sería modificar una suite de fase cerrada.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
export const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));

const core = lib('core/index.js');
const motorDelGateway = lib('engine/gateway.js');
const registroDeWee = lib('registry/index.js');
const ajustes = lib('engine/registry.js');
const http = lib('engine/http.js');
const trabajosDeWee = lib('job/index.js');
const { memoryLedger } = lib('engine/ledger.js');
const { crearConductor } = lib('runtime/conductor.js');
const { colaDeInvocacion } = lib('runtime/cola.js');
const { crearEjecutor } = lib('runtime/ejecutor.js');
const { resolutorDelRouter, resolutorPorCadena } = lib('runtime/resolucion.js');
const { decidirRuntime, leerPuerta, PUERTA_CERRADA } = lib('runtime/puerta.js');

/* ── El mundo de prueba ────────────────────────────────────────────────────── */

const T0 = 1_000_000;
export let reloj = T0;
export const fijarReloj = (v) => { reloj = v; };
export const avanzarReloj = (ms) => { reloj += ms; };
const now = () => reloj;
const QUIEN = { userId: 'user-0001' };
const { ProviderError } = http;

/** Un adaptador de mentira. Lo ÚNICO de mentira de la cadena. */
const adaptador = (id, run, caps = ['text.generate', 'image.generate', 'video.image_to_video', 'voice.tts'], extra = {}) => {
  const a = {
    id, name: id, modalities: ['text', 'image', 'video', 'voice'], llamadas: [],
    models: [{ id: `${id}-1`, provider: id, capabilities: caps, quality: extra.quality ?? 3, speed: 3, cost: { unit: 'call', usd: extra.usd ?? 0.01 } }],
    isConfigured: () => true,
    supports: (c) => caps.includes(c),
    async run(req) { a.llamadas.push(req); return run(req, a.llamadas.length); },
  };
  return a;
};
const texto = (contenido = 'listo') => async () => ({ output: { kind: 'text', content: contenido }, usage: { inputTokens: 5, outputTokens: 6 }, costUSD: 0.002, latencyMs: 7 });
const imagen = (url) => async () => ({ output: { kind: 'image', urls: [url] }, usage: { images: 1 }, costUSD: 0.04, latencyMs: 9 });

/** El almacén de la Fase 8, tal cual: crear solo si no está, escribir solo si la revisión es la esperada. */
const almacen = () => {
  const porId = new Map(); const porClave = new Map();
  const k = (s, key) => `${s.length}.${s}:${key}`;
  const s = {
    porId, escrituras: 0, fallarEn: undefined,
    async crearSiAusente(job) { await null; const c = k(job.idempotency.scope, job.idempotency.key); if (porClave.has(c)) return { created: false, job: porId.get(porClave.get(c)) }; porClave.set(c, job.jobId); porId.set(job.jobId, job); return { created: true, job }; },
    async obtener(id) { await null; return porId.get(id); },
    async porIdempotencia(sc, key) { await null; const c = k(sc, key); return porClave.has(c) ? porId.get(porClave.get(c)) : undefined; },
    async aplicar(t) {
      await null;
      /* Para matar al trabajador en un punto exacto: la N-ésima escritura revienta, como un proceso que muere ahí. */
      if (s.fallarEn !== undefined && s.escrituras + 1 === s.fallarEn) { s.fallarEn = undefined; throw new Error('el proceso murió'); }
      const a = porId.get(t.jobId);
      if (!a || a.revision !== t.expectedRevision) return { applied: false, job: a };
      porId.set(t.jobId, t.job); s.escrituras++;
      return { applied: true, job: t.job };
    },
    async recuperables() { return { jobs: [] }; },
  };
  return s;
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

/** El mundo entero, con los motores de verdad. Devuelve también todo lo que hace falta para mirar dentro. */
const mundo = (opciones = {}) => {
  const adapters = opciones.adapters ?? { x: adaptador('x', texto()) };
  /* El vídeo encendido (Línea B · X2): esta suite prueba el camino cuando SÍ se puede generar; el apagado tiene su suite (linea-b-finanzas). */
  const config = { providers: opciones.providers ?? {}, settings: { ...ajustes.DEFAULT_SETTINGS, videoHabilitado: true } };
  const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers));
  const trazas = [];
  const gateway = opciones.gateway ?? core.crearGateway({
    registry: registro,
    executor: motorDelGateway.crearEjecutorDelMotor({
      adapters, config: () => config, now,
      /*
       * G8: la puerta que resuelve lo que produjo un paso anterior. Aquí se
       * imita su CONTRATO —material ya resuelto— sin base de datos.
       */
      ...(opciones.upstream !== false
        ? {
            upstream: async (_cuenta, pasos) => ({
              materiales: pasos.flatMap((x) => x.outputRefs.map((ref) => ({
                stepId: x.stepId, capability: x.capability,
                materialType: x.produces === 'text' ? 'text' : 'image',
                assetId: ref,
                ...(x.produces === 'text' ? { contenido: 'lo que escribió ' + x.stepId } : { url: 'https://llave.invalido/' + ref }),
              }))),
              fallos: [],
            }),
          }
        : {}),
    }),
    tracer: { record: (t) => { trazas.push(t); } }, now,
  });
  const router = core.crearRouter({ registry: registro });
  const consultas = [];
  const base = opciones.cadena ? resolutorPorCadena(router, opciones.cadena) : resolutorDelRouter(router);
  const resolver = { async resolver(c) { consultas.push(c); return base.resolver(c); } };
  const trabajos = opciones.trabajos ?? almacen();
  const runs = opciones.ejecuciones ?? ejecuciones();
  const libro = opciones.libro ?? memoryLedger();
  const filas = [];
  const libroDePrueba = {
    async abrir(d) { const id = await libro.open({ userId: d.trace.userId, jobId: d.trace.runId, stepId: d.trace.stepId, requestId: d.trace.requestId, capability: d.capability, modality: 'text', provider: d.implementation.providerId, model: d.implementation.modelId, attempt: d.attempt, estimatedUsd: 0, pricingMode: 'simulated', service: d.metadata?.service, creditTransactionId: d.metadata?.creditTransactionId }); filas.push({ id, attempt: d.attempt, attemptId: d.attemptId, meta: d.metadata }); return id; },
    async cerrar(id, c) { await libro.close(id, { status: c.resultado.status === 'failed' ? 'FAILED' : 'COMPLETED', providerCost: c.resultado.response?.actual.provider.usd ?? 0, durationMs: c.durationMs, usage: c.resultado.usage }); },
  };
  const entregas = [];
  const puertos = {
    trabajos, ejecuciones: runs, cola: colaDeInvocacion(now),
    motor: trabajosDeWee.crearMotorDeTrabajosDeWee().motor,
    resolver,
    ejecutor: crearEjecutor({ gateway, libro: libroDePrueba, ahora: now, repetir: () => () => {} }),
    trabajador: { worker: opciones.worker ?? 'w-1', visibilityMs: 30_000, backpressureDelayMs: 1_000, ...(opciones.limites ? { limits: opciones.limites } : {}) },
    ahora: now,
    observar: (e) => entregas.push(e),
    ...(opciones.esperar ? { esperar: opciones.esperar } : {}),
    ...(opciones.material ? { material: opciones.material } : {}),
    ...(opciones.paralelismo ? { paralelismo: opciones.paralelismo } : {}),
    ...(opciones.capacidad ? { capacidad: opciones.capacidad } : {}),
    ...(opciones.capacidadAlCrear ? { capacidadAlCrear: opciones.capacidadAlCrear } : {}),
    ...(opciones.limites ? { limites: opciones.limites } : {}),
  };
  return { conductor: crearConductor(puertos), adapters, trabajos, runs, libro, filas, consultas, trazas, entregas, puertos, registro, router, gateway };
};

let serie = 0;
const traza = (extra = {}) => { serie++; const id = `brain_t_${String(serie).padStart(4, '0')}`; return { traceId: id, requestId: id, userId: 'user-0001', workplace: 'brain', ...extra }; };
const unPaso = (extra = {}) => ({ id: 'pensar', capability: 'text.generate', purpose: 'Contestar a la persona', input: { prompt: 'hola' }, ...extra });
const workflow = (steps = [unPaso()], extra = {}) => { serie++; return { id: `wf_${serie}`, contract: '1.1', goal: 'una prueba', steps, ...extra }; };
const pedir = (w, extra = {}) => ({ principal: QUIEN, trace: traza(), workflow: w, ...extra });
const trabajosDe = (m) => [...m.trabajos.porId.values()];
/** La espera de un reintento, sin esperar de verdad: mueve el reloj. */
const esperar = async (ms) => { reloj += ms + 1; };
const lanza = (e) => async () => { throw e; };
const e429 = () => new ProviderError('x respondió 429: slow down', 'x', 429, true);


export { core, T0, now, QUIEN, ProviderError, adaptador, texto, imagen, almacen, ejecuciones, mundo, traza, unPaso, workflow, pedir, trabajosDe, esperar, lanza, e429 };
