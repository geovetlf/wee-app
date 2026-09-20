/**
 * F12-D · RUNTIME CONSOLIDATION — EL CONDUCTOR.
 *
 * Las Fases 3 a 8 dejaron seis motores terminados y ninguno llamaba a otro. El
 * conductor (`functions/src/runtime/`) es lo que los une. Esta suite lo prueba
 * contra lo único que importa: que la cadena ENTERA funcione con los motores de
 * verdad, y que ninguna repetición, ninguna muerte y ninguna carrera ejecute
 * dos veces, cobre dos veces o se invente un final.
 *
 *   A · La cadena, de punta a punta: Brain → Planner → Workflow → Orchestrator →
 *       Router → Job Engine → cola → trabajador → Gateway → adaptador → proveedor.
 *   B · Varios pasos: dependencias, material y paralelismo.
 *   C · Con qué se atiende: el Router decide quién puede; la cadena, en qué orden.
 *   D · Cuando algo falla: fallo definitivo, reintento, plazo y lo que NO se sabe.
 *   E · Muertes, repeticiones y carreras.
 *   F · Cancelar y contrapresión.
 *   G · Idempotencia: requestId → operationId → jobId → attemptId.
 *   H · Dinero: el conductor no toca Credits, y el libro recibe lo que hace falta.
 *   I · Identidad, seguridad y un solo camino para todos los productos.
 *   J · Observabilidad.
 *   K · La puerta: CORE o LEGACY, y volver atrás con un booleano.
 *   L · Estructura: qué se añadió, qué NO se tocó y qué sigue sin conectar.
 *
 * TODO ES DE VERDAD MENOS EL PROVEEDOR: el Planner, el Workflow, el
 * Orchestrator, el Router, el Job Engine, el trabajador y el Gateway son los
 * del Core, sin dobles. Lo único de mentira es el adaptador —ninguna prueba
 * sale a la red— y los dos almacenes, que viven aquí y cumplen las mismas
 * garantías que el de Firestore (ese se prueba aparte, contra el emulador).
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
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
let reloj = T0;
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
  const config = { providers: opciones.providers ?? {}, settings: ajustes.DEFAULT_SETTINGS };
  const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers));
  const trazas = [];
  const gateway = opciones.gateway ?? core.crearGateway({
    registry: registro,
    executor: motorDelGateway.crearEjecutorDelMotor({ adapters, config: () => config, now }),
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

/* ── A · La cadena, de punta a punta ───────────────────────────────────────── */
console.log('\n── A · La cadena, de punta a punta ──');
{
  /* Brain → Planner → Workflow, con los motores de verdad, y de ahí al conductor. */
  const tracer = { record() {} };
  const planner = core.crearPlanner({ availability: { disponible: () => true }, tracer, now });
  const t = traza();
  const entendido = {
    intent: 'creation', confidence: 'high', goal: 'un texto para mi restaurante',
    inputs: { text: 'un texto para mi restaurante', attachments: [] }, references: [], constraints: {},
    needsPlanning: true, missing: [], assumptions: [], capability: 'text.generate', capabilities: ['text.generate'],
  };
  const planeado = await planner.planificar({ contract: core.PLANNER_CONTRACT_VERSION, trace: t, understanding: entendido });
  check('Brain → Planner: de un entendimiento sale un plan de capacidades', planeado.status === 'ready' && planeado.plan?.steps.length === 1 && planeado.plan.steps[0].capability === 'text.generate', planeado.status);

  const construido = await core.crearWorkflowEngine({ tracer, now }).construir({ contract: core.WORKFLOW_CONTRACT_VERSION, trace: t, plan: planeado.plan });
  check('Planner → Workflow: el plan se convierte en un workflow listo', construido.status === 'ready' && construido.workflow?.steps.length === 1, construido.status);

  const m = mundo();
  const r = await m.conductor.ejecutar({ principal: QUIEN, trace: t, workflow: construido.workflow });
  check('Workflow → Orchestrator → … → proveedor: la ejecución TERMINA', r.estado === 'terminada' && r.cierre?.state === 'done', `${r.estado}/${r.cierre?.state}`);
  check('Orchestrator → Job: un paso, un trabajo, y está completado', trabajosDe(m).length === 1 && trabajosDe(m)[0].state === 'completed');
  check('Job → cola → trabajador: una entrega, ejecutada', m.entregas.length === 1 && m.entregas[0].outcome === 'executed');
  check('Router → Gateway: lo que eligió el Router es lo que ejecutó el Gateway', r.pasos[0].implementation?.providerId === 'x' && m.adapters.x.llamadas[0]?.model.id === 'x-1');
  check('Gateway → adaptador → proveedor: salió UNA vez', m.adapters.x.llamadas.length === 1);
  check('y lo que contestó vuelve a quien lo pidió, en la misma invocación', r.pasos[0].respuesta?.content === 'listo' && r.pasos[0].usage?.inputTokens === 5);
  check('el trabajo guarda REFERENCIAS, nunca el contenido', !JSON.stringify(trabajosDe(m)[0]).includes('listo'));
  check('el orden es el contrato: reclamar, marcar que sale, informar — tres escrituras', m.trabajos.escrituras === 3, String(m.trabajos.escrituras));
  check('y el Gateway dejó su rastro', m.trazas.length === 1 && m.trazas[0].status === 'ok');
}

/* ── B · Varios pasos ──────────────────────────────────────────────────────── */
console.log('\n── B · Varios pasos: dependencias, material y paralelismo ──');
{
  const recibido = [];
  const material = { async registrar({ dispatch, respuesta }) { recibido.push({ stepId: dispatch.stepId, urls: respuesta?.urls }); return [`asset_${dispatch.stepId}`]; } };
  const a = adaptador('x', async (req) => (req.capability === 'image.generate'
    ? { output: { kind: 'image', urls: ['https://almacen.invalido/u/a.png?alt=media&token=abc'] }, costUSD: 0.04, latencyMs: 5 }
    : { output: { kind: 'video', urls: ['https://almacen.invalido/u/v.mp4?token=zzz'] }, costUSD: 0.4, latencyMs: 9 }));
  const m = mundo({ adapters: { x: a }, material });
  const w = workflow([
    { id: 'imagen', capability: 'image.generate', purpose: 'Crear la imagen', input: { brief: 'un plato' } },
    { id: 'video', capability: 'video.image_to_video', purpose: 'Animarla', dependsOn: ['imagen'] },
  ]);
  const r = await m.conductor.ejecutar(pedir(w));
  check('dos pasos dependientes terminan, y en su orden', r.estado === 'terminada' && a.llamadas.map((l) => l.capability).join('>') === 'image.generate>video.image_to_video');
  check('resultado del proveedor → MATERIAL: el paso deja la referencia del material, no la URL', r.pasos[0].outputRefs[0] === 'asset_imagen' && !JSON.stringify(r.run.steps).includes('token='));
  check('y el paso siguiente recibe ESA referencia como material de su dependencia', a.llamadas[1].input.upstream?.[0]?.outputRefs?.[0] === 'asset_imagen' && a.llamadas[1].input.upstream[0].stepId === 'imagen');
  check('el material se pidió una vez por paso, con lo que dejó el proveedor', recibido.length === 2 && recibido[0].urls[0].includes('a.png'));

  const sinPuerto = mundo({ adapters: { x: adaptador('x', imagen('https://almacen.invalido/u/a.png?token=abc')) } });
  const r2 = await sinPuerto.conductor.ejecutar(pedir(workflow([{ id: 'imagen', capability: 'image.generate', purpose: 'Crear', input: {} }])));
  check('sin puerto de material, una URL con token NO se le pasa a ningún paso, y se avisa', r2.estado === 'terminada' && r2.pasos[0].outputRefs.length === 0 && r2.avisos.includes('output_refs_dropped'));

  const orden = [];
  const lento = adaptador('x', async (req) => { orden.push('entra:' + req.ctx.stepId); await new Promise((ok) => setTimeout(ok, 15)); orden.push('sale:' + req.ctx.stepId); return { output: { kind: 'text', content: 'ok' }, costUSD: 0, latencyMs: 1 }; });
  const par = mundo({ adapters: { x: lento }, paralelismo: 2 });
  const dos = workflow([unPaso({ id: 'a' }), unPaso({ id: 'b' })]);
  const rp = await par.conductor.ejecutar(pedir(dos));
  check('dos pasos sin dependencia entre sí corren A LA VEZ cuando se pide', rp.estado === 'terminada' && orden.slice(0, 2).every((o) => o.startsWith('entra:')), orden.join(' '));

  const ordenSerie = [];
  const serieAd = adaptador('x', async (req) => { ordenSerie.push(req.ctx.stepId); return { output: { kind: 'text', content: 'ok' }, costUSD: 0, latencyMs: 1 }; });
  await mundo({ adapters: { x: serieAd } }).conductor.ejecutar(pedir(workflow([unPaso({ id: 'a' }), unPaso({ id: 'b' }), unPaso({ id: 'c', dependsOn: ['a'] })])));
  check('por defecto, uno detrás de otro y en el orden del workflow: lo mismo que hace el bucle de hoy', ordenSerie.join('') === 'abc', ordenSerie.join(''));
}

/* ── C · Con qué se atiende ────────────────────────────────────────────────── */
console.log('\n── C · El Router dice quién puede; la cadena de producto, en qué orden ──');
{
  const mejor = adaptador('alfa', texto('de alfa'), ['text.generate'], { quality: 5 });
  const peor = adaptador('beta', texto('de beta'), ['text.generate'], { quality: 2 });
  const adapters = { alfa: mejor, beta: peor };

  const solo = mundo({ adapters });
  const rs = await solo.conductor.ejecutar(pedir(workflow()));
  check('sin cadena decide la puntuación del Router', rs.pasos[0].implementation.providerId === 'alfa' && rs.pasos[0].origenDeLaRuta === 'router');

  const cadena = { async cadena() { return [{ providerId: 'beta', modelId: 'beta-1', estimatedUsd: 0.003, estimatedCredits: 2 }, { providerId: 'alfa', modelId: 'alfa-1' }]; } };
  const conCadena = mundo({ adapters: { alfa: adaptador('alfa', texto('de alfa'), ['text.generate'], { quality: 5 }), beta: adaptador('beta', texto('de beta'), ['text.generate'], { quality: 2 }) }, cadena });
  const rc = await conCadena.conductor.ejecutar(pedir(workflow()));
  check('con cadena manda el ORDEN de producto, aunque el Router puntúe mejor a otro', rc.pasos[0].implementation.providerId === 'beta' && rc.pasos[0].respuesta.content === 'de beta' && rc.pasos[0].origenDeLaRuta === 'cadena');
  check('y lo que se estimó viaja con el trabajo hasta el libro', trabajosDe(conCadena)[0].metadata.estimatedUsd === 0.003 && trabajosDe(conCadena)[0].metadata.estimatedCredits === 2);

  const apagado = mundo({ adapters: { alfa: adaptador('alfa', texto('de alfa'), ['text.generate']), beta: adaptador('beta', texto('de beta'), ['text.generate']) }, providers: { beta: { enabled: false, priority: 1 } }, cadena });
  const ra = await apagado.conductor.ejecutar(pedir(workflow()));
  check('la cabeza de la cadena está apagada: el Router dice que NO puede, y se pasa al siguiente eslabón', ra.pasos[0].implementation.providerId === 'alfa' && apagado.adapters.beta.llamadas.length === 0);

  const fuera = { async cadena() { return [{ providerId: 'gamma', modelId: 'gamma-1' }]; } };
  const nadie = mundo({ adapters: { alfa: adaptador('alfa', texto(), ['text.generate']) }, cadena: fuera });
  const rn = await nadie.conductor.ejecutar(pedir(workflow()));
  check('hay quien puede, pero NO en la cadena: no se sale de ella — el paso falla y el proveedor no se llama', rn.estado === 'terminada' && rn.cierre.state === 'failed' && rn.pasos[0].error?.code === 'PROVIDER_UNAVAILABLE' && nadie.adapters.alfa.llamadas.length === 0, rn.pasos[0].error?.details?.reason);
  check('y no se creó ningún trabajo para algo que no se va a ejecutar', trabajosDe(nadie).length === 0);

  const sinCadena = mundo({ adapters: { alfa: adaptador('alfa', texto('de alfa'), ['text.generate']) }, cadena: { async cadena() { return undefined; } } });
  const ru = await sinCadena.conductor.ejecutar(pedir(workflow()));
  check('una capacidad sin cadena declarada la decide el Router solo', ru.pasos[0].origenDeLaRuta === 'router');

  const preferencias = { allowedProviders: ['beta'], modelId: 'beta-1' };
  const espia = mundo({ adapters, cadena: { async cadena(c) { espia.vista = c.preferencias; return [{ providerId: 'beta', modelId: 'beta-1' }]; } } });
  await espia.conductor.ejecutar(pedir(workflow(), { ruteo: { pensar: preferencias } }));
  check('lo que el SERVIDOR ya tiene decidido llega a la cadena por su puerto', espia.vista?.modelId === 'beta-1');
  const colado = await mundo({ adapters }).conductor.ejecutar(pedir(workflow([unPaso({ input: { prompt: 'hola', providerId: 'beta' } })])));
  check('pero NUNCA puede viajar dentro del workflow: un proveedor en la entrada lo invalida entero', colado.estado === 'invalida' && colado.error?.details?.reason === 'implementation_not_allowed', colado.error?.details?.reason);
}

/* ── D · Cuando algo falla ─────────────────────────────────────────────────── */
console.log('\n── D · Fallo definitivo, reintento, plazo y lo que NO se sabe ──');
{
  const rechazo = mundo({ adapters: { x: adaptador('x', lanza(new ProviderError('x: rechazo de entrada: sensitive content', 'x', 400, false))) } });
  const rr = await rechazo.conductor.ejecutar(pedir(workflow()));
  check('un fallo que es DE LA PETICIÓN no se reintenta: un intento, y el paso falla con su código', rr.estado === 'terminada' && rr.cierre.state === 'failed' && rechazo.adapters.x.llamadas.length === 1 && rr.pasos[0].error?.code === 'CONTENT_POLICY', rr.pasos[0].error?.code);

  reloj = T0;
  const intermitente = mundo({ adapters: { x: adaptador('x', async (_r, vez) => { if (vez === 1) throw e429(); return { output: { kind: 'text', content: 'a la segunda' }, costUSD: 0.002, latencyMs: 3 }; }) }, esperar });
  const ri = await intermitente.conductor.ejecutar(pedir(workflow()));
  const ji = trabajosDe(intermitente)[0];
  check('un fallo del proveedor que admite otro intento se REINTENTA, y termina bien', ri.estado === 'terminada' && ri.cierre.state === 'done' && ri.pasos[0].respuesta.content === 'a la segunda' && ji.attemptCount === 2);
  check('cada intento tiene su identidad, y no se reutiliza', ji.attempts[0].attemptId !== ji.attempts[1].attemptId && ji.attempts[0].providerKey !== ji.attempts[1].providerKey);
  check('quién decide reintentar y cuándo es el Job Engine: el conductor solo esperó lo que él dijo', ji.attempts[1].startedAt - ji.attempts[0].endedAt >= core.POLITICA_DE_TRABAJO.retry.backoffMs);
  check('el reintento usa la MISMA implementación: no se vuelve a elegir', intermitente.consultas.length === 1 && intermitente.adapters.x.llamadas.every((l) => l.model.id === 'x-1'));
  check('y el libro tiene una fila por intento, con el número de intento de verdad', intermitente.filas.length === 2 && intermitente.filas[0].attempt === 1 && intermitente.filas[1].attempt === 2);

  reloj = T0;
  const sinEspera = mundo({ adapters: { x: adaptador('x', async (_r, vez) => { if (vez === 1) throw e429(); return { output: { kind: 'text', content: 'luego' }, costUSD: 0, latencyMs: 1 }; }) } });
  const ped = pedir(workflow());
  const r1 = await sinEspera.conductor.ejecutar(ped);
  check('si esta invocación no puede esperar al reintento, NO inventa un final: devuelve en_curso y lo dice', r1.estado === 'en_curso' && r1.avisos.includes('retry_pending') && r1.run.steps[0].state === 'running');
  reloj += 10_000;
  const otro = mundo({ adapters: sinEspera.adapters, trabajos: sinEspera.trabajos, ejecuciones: sinEspera.runs, worker: 'w-2' });
  const r2 = await otro.conductor.retomar({ principal: QUIEN, trace: ped.trace, runId: r1.runId });
  check('OTRO proceso lo retoma con lo que quedó guardado, y termina', r2.estado === 'terminada' && r2.cierre.state === 'done' && trabajosDe(otro)[0].attemptCount === 2);
  check('al retomar NO se vuelve a preguntar al Router: el trabajo ya lleva la que se eligió', otro.consultas.length === 0);

  reloj = T0;
  const colgado = mundo({ adapters: { x: adaptador('x', () => new Promise(() => {})) }, esperar });
  const rt = await colgado.conductor.ejecutar(pedir(workflow([unPaso({ timeoutMs: 25 })])));
  check('un proveedor que no contesta VENCE, se reintenta lo que el Job Engine permite y el paso falla con TIMEOUT', rt.estado === 'terminada' && rt.cierre.state === 'failed' && rt.pasos[0].error?.code === 'TIMEOUT' && trabajosDe(colgado)[0].state === 'timed_out', `${rt.pasos[0].error?.code}/${trabajosDe(colgado)[0].state}`);
  check('con el plazo del paso, no con uno universal', colgado.adapters.x.llamadas.every((l) => l.timeoutMs <= 25));

  reloj = T0;
  const roto = mundo({ adapters: { x: adaptador('x', texto()) }, gateway: { async ejecutar() { throw new Error('se cayó la red a media llamada'); } }, esperar });
  const pedRoto = pedir(workflow());
  const rd = await roto.conductor.ejecutar(pedRoto);
  const jd = trabajosDe(roto)[0];
  check('SALIÓ Y NO SE SABE CÓMO ACABÓ: el intento queda `unknown` y el trabajo esperando, no fallado', jd.state === 'waiting' && jd.attempts[0].outcome === 'unknown' && jd.attempts[0].dispatched === true);
  check('el conductor NO le inventa un final al paso: sigue `running`, y devuelve en_curso', rd.estado === 'en_curso' && rd.avisos.includes('outcome_unknown') && rd.run.steps[0].state === 'running');
  const buenGateway = mundo({ adapters: roto.adapters, trabajos: roto.trabajos, ejecuciones: roto.runs, worker: 'w-9', esperar });
  const rd2 = await buenGateway.conductor.retomar({ principal: QUIEN, trace: pedRoto.trace, runId: rd.runId });
  check('y NADIE lo repite, ni retomando: repetirlo podría ser pagar dos veces', rd2.estado === 'en_curso' && roto.adapters.x.llamadas.length === 0 && trabajosDe(roto)[0].attemptCount === 1 && trabajosDe(roto)[0].state === 'waiting');
  check('ni se queda la invocación ESPERANDO a que venza: eso no lo resuelve ningún trabajador', buenGateway.entregas.length === 0 && reloj === T0);
}

/* ── E · Muertes, repeticiones y carreras ──────────────────────────────────── */
console.log('\n── E · Muertes, repeticiones y carreras ──');
{
  reloj = T0;
  const a = adaptador('x', texto('tras la muerte'));
  const t1 = almacen(); t1.fallarEn = 2;   /* la 2.ª escritura es «marcar que sale»: muere ANTES de salir hacia el proveedor */
  const vivo = mundo({ adapters: { x: a }, trabajos: t1 });
  const ped = pedir(workflow());
  const r1 = await vivo.conductor.ejecutar(ped);
  check('el trabajador muere ANTES de salir: el proveedor no se llamó y la ejecución queda en_curso', r1.estado === 'en_curso' && r1.avisos.includes('delivery_failed') && a.llamadas.length === 0 && trabajosDe(vivo)[0].state === 'running');
  reloj += core.POLITICA_DE_TRABAJO.leaseMs + 1;
  const sucesor = mundo({ adapters: { x: a }, trabajos: t1, ejecuciones: vivo.runs, worker: 'w-2' });
  const r2 = await sucesor.conductor.retomar({ principal: QUIEN, trace: ped.trace, runId: r1.runId });
  const j = trabajosDe(sucesor)[0];
  check('caducada su concesión, OTRO trabajador lo recupera: intento nuevo, identidad nueva, y termina', r2.estado === 'terminada' && j.state === 'completed' && j.attemptCount === 2 && j.attempts[0].outcome === 'failed' && j.attempts[0].attemptId !== j.attempts[1].attemptId);
  check('y hacia el proveedor salió UNA sola vez', a.llamadas.length === 1);

  reloj = T0;
  const b = adaptador('x', texto('se ejecutó'));
  const t2 = almacen(); t2.fallarEn = 3;   /* la 3.ª escritura es el informe: muere DESPUÉS de que el proveedor contestara */
  const vivo2 = mundo({ adapters: { x: b }, trabajos: t2 });
  const ped2 = pedir(workflow());
  const r3 = await vivo2.conductor.ejecutar(ped2);
  check('el trabajador muere DESPUÉS de salir: el proveedor SÍ se llamó, y no se pudo guardar cómo acabó', r3.estado === 'en_curso' && b.llamadas.length === 1 && trabajosDe(vivo2)[0].attempts[0].dispatched === true);
  reloj += core.POLITICA_DE_TRABAJO.leaseMs + 1;
  const sucesor2 = mundo({ adapters: { x: b }, trabajos: t2, ejecuciones: vivo2.runs, worker: 'w-2' });
  const r4 = await sucesor2.conductor.retomar({ principal: QUIEN, trace: ped2.trace, runId: r3.runId });
  check('quien llega después NO lo repite: salió y no se sabe cómo acabó → esperando, y se dice', r4.estado === 'en_curso' && r4.avisos.includes('outcome_unknown') && b.llamadas.length === 1 && trabajosDe(sucesor2)[0].state === 'waiting');

  reloj = T0;
  const c = adaptador('x', texto());
  const triple = mundo({ adapters: { x: c } });
  const cola = triple.puertos.cola;
  const encolar = cola.enqueue.bind(cola);
  cola.enqueue = async (msg) => { await encolar(msg); await encolar(msg); await encolar(msg); };   /* una cola «al menos una vez», exagerada */
  const rt = await triple.conductor.ejecutar(pedir(workflow()));
  check('el mismo aviso entregado TRES veces: una ejecución, y las otras dos no hacen nada', rt.estado === 'terminada' && c.llamadas.length === 1 && triple.entregas.filter((e) => e.outcome === 'executed').length === 1 && triple.entregas.filter((e) => e.outcome === 'skipped').length === 2, triple.entregas.map((e) => e.outcome).join(','));

  reloj = T0;
  const d = adaptador('x', async () => { await new Promise((ok) => setTimeout(ok, 10)); return { output: { kind: 'text', content: 'una vez' }, costUSD: 0, latencyMs: 1 }; });
  const compartidoT = almacen(); const compartidoE = ejecuciones();
  const uno = mundo({ adapters: { x: d }, trabajos: compartidoT, ejecuciones: compartidoE, worker: 'w-1' });
  const dos = mundo({ adapters: { x: d }, trabajos: compartidoT, ejecuciones: compartidoE, worker: 'w-2' });
  const misma = pedir(workflow());
  const [ra, rb] = await Promise.all([uno.conductor.ejecutar(misma), dos.conductor.ejecutar(misma)]);
  check('DOS conductores a la vez sobre la misma operación: el proveedor se llama UNA vez', d.llamadas.length === 1, String(d.llamadas.length));
  check('y un solo trabajo, completado una sola vez', trabajosDe(uno).length === 1 && trabajosDe(uno)[0].state === 'completed' && trabajosDe(uno)[0].attemptCount === 1);
  const terminadas = [ra, rb].filter((r) => r.estado === 'terminada').length;
  check('ninguno de los dos se inventa nada: el que no ejecutó dice en_curso o ve la ejecución ya terminada', terminadas >= 1 && [ra, rb].every((r) => r.estado !== 'invalida'), `${ra.estado}/${rb.estado}`);
  const despues = await mundo({ adapters: { x: d }, trabajos: compartidoT, ejecuciones: compartidoE, worker: 'w-3' }).conductor.ejecutar(misma);
  check('y una tercera llamada, ya con todo hecho, ve la ejecución terminada sin tocar nada', despues.estado === 'terminada' && d.llamadas.length === 1);

  reloj = T0;
  let soltar;
  const e = adaptador('x', () => new Promise((ok) => { soltar = () => ok({ output: { kind: 'text', content: 'tarde' }, costUSD: 0, latencyMs: 1 }); }));
  const tz = almacen(); const ez = ejecuciones();
  const zombi = mundo({ adapters: { x: e }, trabajos: tz, ejecuciones: ez, worker: 'w-zombi' });
  const pz = pedir(workflow());
  const enVuelo = zombi.conductor.ejecutar(pz);
  await new Promise((ok) => setTimeout(ok, 20));
  reloj += core.POLITICA_DE_TRABAJO.leaseMs + 1;
  const rescate = mundo({ adapters: { x: e }, trabajos: tz, ejecuciones: ez, worker: 'w-nuevo' });
  await rescate.conductor.retomar({ principal: QUIEN, trace: pz.trace, runId: `run_${pz.trace.requestId}` });
  soltar();
  await enVuelo;
  check('EL ZOMBI: su concesión caducó mientras ejecutaba; nadie volvió a salir hacia el proveedor', e.llamadas.length === 1, String(e.llamadas.length));
  check('y el trabajo no tiene dos finales: un intento, y el estado que decidió el Job Engine', trabajosDe(zombi)[0].attemptCount === 1 && ['waiting', 'completed'].includes(trabajosDe(zombi)[0].state), trabajosDe(zombi)[0].state);
}

/* ── F · Cancelar y contrapresión ──────────────────────────────────────────── */
console.log('\n── F · Cancelar y contrapresión ──');
{
  reloj = T0;
  const a = adaptador('x', async (_r, vez) => { if (vez === 1) throw e429(); return { output: { kind: 'text', content: 'no debería' }, costUSD: 0, latencyMs: 1 }; });
  const m = mundo({ adapters: { x: a } });
  const ped = pedir(workflow());
  const r1 = await m.conductor.ejecutar(ped);
  const rc = await m.conductor.cancelar({ principal: QUIEN, runId: r1.runId });
  check('cancelar una ejecución con un reintento pendiente: el trabajo en cola se cancela y la ejecución cierra', rc.estado === 'terminada' && rc.cierre.state === 'cancelled' && trabajosDe(m)[0].state === 'cancelled', `${rc.estado}/${rc.cierre?.state}/${trabajosDe(m)[0].state}`);
  reloj += 60_000;
  const tras = await mundo({ adapters: { x: a }, trabajos: m.trabajos, ejecuciones: m.runs, worker: 'w-2' }).conductor.retomar({ principal: QUIEN, trace: ped.trace, runId: r1.runId });
  check('y después de cancelar no se ejecuta nada más', a.llamadas.length === 1 && tras.cierre.state === 'cancelled');
  const ajeno = await m.conductor.cancelar({ principal: { userId: 'user-9999' }, runId: r1.runId });
  check('quien no es el dueño NO puede cancelarla', ajeno.estado === 'invalida' && ajeno.error?.code === 'AUTH_ERROR');

  const lleno = mundo({ limites: { maxQueuedPerAccount: 1 }, capacidadAlCrear: async () => ({ queuedForAccount: 1 }) });
  const rl = await lleno.conductor.ejecutar(pedir(workflow()));
  check('CONTRAPRESIÓN AL CREAR: una cuenta con la cola llena no consigue otro trabajo, y el proveedor no se llama', rl.cierre.state === 'failed' && rl.pasos[0].error?.code === 'RATE_LIMIT' && trabajosDe(lleno).length === 0 && lleno.adapters.x.llamadas.length === 0, rl.pasos[0].error?.details?.reason);

  const saturado = mundo({ limites: { maxRunningPerAccount: 1 }, capacidad: { async capacidad() { return { runningForAccount: 1 }; } } });
  const rs = await saturado.conductor.ejecutar(pedir(workflow()));
  check('CONTRAPRESIÓN AL RECLAMAR: si no cabe, la entrega se devuelve para más tarde y nada se ejecuta', rs.estado === 'en_curso' && saturado.entregas[0]?.outcome === 'deferred' && saturado.adapters.x.llamadas.length === 0);

  const sinCuenta = mundo({ limites: { maxQueuedPerAccount: 5 } });
  await sinCuenta.conductor.ejecutar(pedir(workflow()));
  check('la cola de una invocación no crece sin fin: tiene un tope', /MAX_AVISOS_VIVOS = 1_024/.test(leer('functions/src/runtime/cola.ts')));
}

/* ── G · Idempotencia ──────────────────────────────────────────────────────── */
console.log('\n── G · Idempotencia: requestId → operationId → jobId → attemptId ──');
{
  reloj = T0;
  const m = mundo();
  const ped = pedir(workflow(), { contexto: { appId: 'wee', workspaceId: 'ws_1', operationId: 'op_0001' } });
  const r1 = await m.conductor.ejecutar(ped);
  const r2 = await m.conductor.ejecutar(ped);
  const j = trabajosDe(m)[0];
  check('la MISMA operación pedida dos veces: un trabajo, una ejecución, una llamada al proveedor', trabajosDe(m).length === 1 && m.adapters.x.llamadas.length === 1 && r2.estado === 'terminada' && r1.pasos[0].jobId === r2.pasos[0].jobId);
  const clavePaso = core.claveDePaso(r1.runId, 'pensar', 1);
  check('requestId: la traza del paso lleva el de ESA operación, derivado de ejecución, paso e intento', j.trace.requestId === clavePaso && j.idempotency.key === clavePaso, j.trace.requestId);
  check('operationId: viaja en el contexto del trabajo, que sí lo conserva', j.context.operationId === 'op_0001' && j.context.workflowRunId === r1.runId && j.context.stepId === 'pensar');
  check('jobId: derivado de la CUENTA y de la clave de la operación, sin azar', j.jobId === core.claveDeIdempotencia(core.alcanceDeIdempotencia('user-0001'), clavePaso));
  check('attemptId: derivado del trabajo y del número de intento', j.attempts[0].attemptId === core.claveDeIntento(j.jobId, 1));
  check('la clave que baja al proveedor es la DEL INTENTO', j.attempts[0].providerKey === core.claveDeProveedor(j.jobId, 1));
  check('la traza pierde workspaceId y operationId por el camino (leerTraza, Fase 2): por eso van en el contexto', j.trace.workspaceId === undefined && j.trace.operationId === undefined && j.context.workspaceId === 'ws_1');
}

/* ── H · Dinero ────────────────────────────────────────────────────────────── */
console.log('\n── H · El conductor no toca Credits, y el libro recibe lo que hace falta ──');
{
  reloj = T0;
  const m = mundo();
  const contabilidad = { pensar: { service: 'ai_brain', creditTransactionId: 'usage_brain_msg_0001', creditsEstimated: 1 } };
  await m.conductor.ejecutar(pedir(workflow(), { contabilidad }));
  check('lo que quien llama sabe del cobro viaja con el trabajo hasta la fila del libro', m.filas[0].meta.service === 'ai_brain' && m.filas[0].meta.creditTransactionId === 'usage_brain_msg_0001' && m.filas[0].meta.creditsEstimated === 1);
  const fila = Object.values(m.libro.records)[0];
  check('la fila se abre ANTES de salir y se cierra con el coste medido del proveedor', fila.status === 'COMPLETED' && fila.providerCost === 0.002 && fila.attempt === 1);
  check('y el conductor NO liquida: eso es de quien reservó los Credits', m.libro.usage.credits === 0 && fila.creditsCharged === undefined);

  /*
   * EL DINERO SIGUE FUERA DEL CONDUCTOR, y ahora se puede decir con más
   * precisión que antes. La fundación de liquidación asíncrona (F12-D) añadió
   * UN sitio en todo `runtime/` que habla con el Credit Engine: la composición,
   * y solo para implementar el puerto de liquidación con las dos llamadas que
   * ya existían. Ni el conductor, ni el ejecutor, ni el barrendero lo tocan.
   */
  const archivos = fs.readdirSync(path.resolve(RAIZ, 'functions/src/runtime'));
  const tocanDinero = archivos.filter((f) => /spendCredits|completeCredits|refundCredits|holdCredits|creditEngine|\.settle\(/.test(sinComentarios(leer('functions/src/runtime/' + f))));
  check('en todo runtime/ hay UN solo sitio que mueve dinero: la composición', tocanDinero.join(',') === 'index.ts', tocanDinero.join(','));
  check('y el conductor, el ejecutor y el barrendero no están entre ellos', !['conductor.ts', 'ejecutor.ts', 'barrendero.ts', 'liquidacion.ts', 'almacen.ts'].some((f) => tocanDinero.includes(f)));
  check('lo que usa son las dos operaciones del Credit Engine que ya existían: nada nuevo', (() => {
    const s = sinComentarios(leer('functions/src/runtime/index.ts'));
    return /credits\.completeCredits\(/.test(s) && /credits\.refundCredits\(/.test(s) && !/spendCredits|holdCredits|crearTransaccion|nuevoAsiento/.test(s);
  })());
  check('ni el Financial Core se importa desde aquí', !archivos.map((f) => sinComentarios(leer('functions/src/runtime/' + f))).join('\n').match(/from '\.\.\/financial|core\/financial/));

  const sinLibro = mundo({ libro: { async open() { throw new Error('Firestore caído'); }, async close() {} } });
  const rs = await sinLibro.conductor.ejecutar(pedir(workflow([unPaso()]), {}));
  check('si no se puede anotar, NO sale: una operación que cuesta dinero no puede existir sin rastro', sinLibro.adapters.x.llamadas.length === 0 && trabajosDe(sinLibro)[0].attempts.every((a) => a.dispatched === false) && rs.estado !== 'invalida');
}

/* ── I · Identidad, seguridad y multiproducto ──────────────────────────────── */
console.log('\n── I · Identidad, seguridad y un solo camino para todos los productos ──');
{
  reloj = T0;
  const m = mundo();
  const suplantado = await m.conductor.ejecutar({ principal: { userId: 'user-9999' }, trace: traza(), workflow: workflow() });
  check('una ejecución cuya traza es de OTRA cuenta no arranca, y no se crea nada', suplantado.estado === 'invalida' && suplantado.error?.code === 'AUTH_ERROR' && trabajosDe(m).length === 0 && m.adapters.x.llamadas.length === 0);

  const ped = pedir(workflow());
  const r = await m.conductor.ejecutar(ped);
  const intruso = await m.conductor.retomar({ principal: { userId: 'user-9999' }, trace: { ...ped.trace, userId: 'user-9999' }, runId: r.runId });
  check('retomar la ejecución de OTRA persona no funciona, y no cuenta nada de ella', intruso.estado === 'invalida' && intruso.pasos.length === 0);
  const fantasma = await m.conductor.retomar({ principal: QUIEN, trace: traza(), runId: 'run_que_no_existe' });
  check('ni una que no existe', fantasma.estado === 'invalida' && fantasma.error?.details?.reason === 'run_not_found');
  check('quién actúa se LEE del trabajo guardado: la cuenta de cada entrega es la dueña del trabajo', m.entregas.every((e) => e.accountId === 'user-0001'));
  check('y un aviso de la cola no puede llevar ni cuenta, ni proveedor, ni modelo', Object.keys(core.mensajeDeCola(trabajosDe(m)[0], reloj, 'created')).every((k) => core.CAMPOS_DE_MENSAJE_DE_COLA.includes(k)));

  const productos = [];
  for (const appId of ['wee', 'wee-studio', 'wee-chef', 'wee-travel']) {
    const mp = mundo();
    const rp = await mp.conductor.ejecutar({ principal: { userId: 'user-0001', appId }, trace: traza({ appId }), workflow: workflow(), contexto: { appId } });
    productos.push({ estado: rp.estado, impl: rp.pasos[0].implementation.modelId, escrituras: mp.trabajos.escrituras, appId: trabajosDe(mp)[0].context.appId });
  }
  check('cuatro productos, UN camino: mismo desenlace, misma implementación, mismas escrituras', new Set(productos.map((p) => `${p.estado}|${p.impl}|${p.escrituras}`)).size === 1);
  check('lo único que cambia es el contexto que cada uno trae', productos.map((p) => p.appId).join(',') === 'wee,wee-studio,wee-chef,wee-travel');
}

/* ── J · Observabilidad ────────────────────────────────────────────────────── */
console.log('\n── J · Observabilidad ──');
{
  reloj = T0;
  const m = mundo();
  const r = await m.conductor.ejecutar(pedir(workflow(), { contexto: { appId: 'wee', operationId: 'op_obs_1' } }));
  const e = r.entregas[0];
  check('cada entrega se puede seguir: trabajo, intento, petición, traza, operación, cuenta y producto', !!e.jobId && !!e.attemptId && !!e.requestId && !!e.traceId && e.operationId === 'op_obs_1' && e.accountId === 'user-0001' && e.appId === 'wee');
  check('con sus tiempos y cómo acabó', typeof e.queueLatencyMs === 'number' && typeof e.executionMs === 'number' && e.attemptOutcome === 'succeeded' && e.jobState === 'completed');
  check('y el paso dice con qué se atendió y qué costó', r.pasos[0].implementation.providerId === 'x' && r.pasos[0].respuesta.actual.provider.usd === 0.002);
  const todo = JSON.stringify({ r, trabajos: trabajosDe(m), filas: m.filas });
  check('nada de lo que se guarda o se devuelve lleva claves, tokens ni contraseñas', !/apiKey|api_key|authorization|password|secret|bearer/i.test(todo));
}

/* ── K · La puerta ─────────────────────────────────────────────────────────── */
console.log('\n── K · La puerta: CORE o LEGACY, y volver atrás con un booleano ──');
{
  const ctx = { capability: 'text.generate', userId: 'user-0001', experienceId: 'brain' };
  const abierta = { habilitado: true, capacidades: ['text.generate'] };
  check('CERRADA POR DEFECTO: sin configuración, por donde siempre', decidirRuntime(undefined, ctx).runtime === 'legacy' && decidirRuntime(null, ctx).runtime === 'legacy' && PUERTA_CERRADA.habilitado === false);
  check('una configuración que no se entiende NO abre nada', ['si', 42, [], { habilitado: 'true', capacidades: [] }, { habilitado: true }, { habilitado: true, capacidades: ['TEXT GENERATE'] }, { habilitado: true, capacidades: ['text.generate'], cuentas: [7] }]
    .every((c) => decidirRuntime(c, ctx).runtime === 'legacy'));
  check('abierta para una capacidad: esa va por el Core', decidirRuntime(abierta, ctx).runtime === 'core');
  check('y las demás siguen por donde siempre', decidirRuntime(abierta, { ...ctx, capability: 'video.generate' }).motivo === 'capacidad_no_migrada');
  check('con lista de cuentas, SOLO esas: así se prueba en producción sin usar a nadie de sujeto', decidirRuntime({ ...abierta, cuentas: ['cuenta-de-prueba'] }, ctx).motivo === 'cuenta_fuera_de_la_prueba' && decidirRuntime({ ...abierta, cuentas: ['user-0001'] }, ctx).runtime === 'core');
  check('y con lista de productos, solo esos', decidirRuntime({ ...abierta, experiencias: ['studio'] }, ctx).motivo === 'experiencia_no_migrada');
  check('VOLVER ATRÁS ES UN BOOLEANO: `habilitado: false` manda sobre todo lo demás', decidirRuntime({ ...abierta, habilitado: false, cuentas: ['user-0001'] }, ctx).runtime === 'legacy');
  check('la puerta no decide ni proveedor, ni modelo, ni precio', !/provider|model|credit|price|usd/i.test(sinComentarios(leer('functions/src/runtime/puerta.ts'))));
  check('y leerla es estricto: no «limpia» una lista rara, descarta la configuración entera', leerPuerta({ habilitado: true, capacidades: ['text.generate', 7] }).ok === false);
}

/* ── L · Estructura ────────────────────────────────────────────────────────── */
console.log('\n── L · Qué se añadió, qué NO se tocó y qué sigue sin conectar ──');
{
  const dir = 'functions/src/runtime';
  const archivos = fs.readdirSync(path.resolve(RAIZ, dir)).sort();
  check('el conductor vive en su propio directorio', archivos.join(',') === 'almacen.ts,atencion.ts,aviso.ts,barrendero.ts,barrido.ts,cola.ts,conductor.ts,configuracion.ts,contexto.ts,conversaciones.ts,ejecutor.ts,index.ts,liquidacion.ts,materializacion.ts,medios.ts,pensador.ts,plazos.ts,politica.ts,proveedor.ts,puerta.ts,reconciliacion.ts,reconciliador.ts,resolucion.ts', archivos.join(','));
  /* Y la infraestructura que lo programa vive FUERA: el runtime no sabe quién le pide que pase. */
  check('el programador de tareas no está en runtime/, y el runtime no lo nombra', fs.existsSync(path.resolve(RAIZ, 'functions/src/settlement/programado.ts'))
    && !archivos.some((f) => /onSchedule|firebase-functions/.test(leer(`${dir}/${f}`))));
  const puros = ['conductor.ts', 'cola.ts', 'ejecutor.ts', 'resolucion.ts', 'puerta.ts'].map((f) => sinComentarios(leer(`${dir}/${f}`)));
  check('conductor, cola, ejecutor, resolución y puerta NO saben de Firestore: todo les entra por puertos', puros.every((s) => !/firebase|firestore/i.test(s)));
  check('ni leen el reloj ni tiran dados: el tiempo entra por la puerta', puros.every((s) => !/Date\.now\(|Math\.random\(|new Date\(/.test(s)));
  check('ni nombran a ningún proveedor', puros.every((s) => !/gemini|deepseek|seedance|seedream|elevenlabs|openai|claude|anthropic|minimax|flux/i.test(s)));
  const conductor = sinComentarios(leer(`${dir}/conductor.ts`));
  check('el conductor no guarda nada a nivel de módulo', !/^(let|var) /m.test(conductor) && !/^const \w+ = new (Map|Set)\(/m.test(conductor));
  check('NO decide: no ordena candidatos, no puntúa, no calcula esperas ni reintentos', !/\.sort\(|score|backoff|maxAttempts|Math\.pow/.test(conductor));
  /* Resuelve CONTEXTO (una referencia a una conversación), que no es elegir: del Router no sabe nada. */
  check('el ejecutor NO elige implementación: usa la que trae el trabajo', !/crearRouter|resolverConContexto|resolutorPorCadena|resolutorDelRouter|ResolutorDeImplementacion|\.candidates|\.selected/.test(sinComentarios(leer(`${dir}/ejecutor.ts`))) && /peticionDeGateway\(/.test(leer(`${dir}/ejecutor.ts`)) && /implementation/.test(leer(`${dir}/ejecutor.ts`)));
  check('las dos conversiones trabajo ↔ Gateway son las de la Fase 8: no se reescribieron', /import \{ informeDelGateway, peticionDeGateway \} from '\.\.\/job'/.test(leer(`${dir}/ejecutor.ts`)));
  check('la capa de compatibilidad no filtra por su cuenta: la elegibilidad se LEE de la decisión del Router', /c\.eligible/.test(leer(`${dir}/resolucion.ts`)) && !/puedeEjecutarse|.health|provider.status|model.status|.enabled/.test(sinComentarios(leer(`${dir}/resolucion.ts`))));
  check('la cadena de producto sale de la función de decisión que YA usa producción, no de una copia', /engine\.route\(/.test(leer(`${dir}/index.ts`)) && !/linksFor|pickModel|byPolicy/.test(leer(`${dir}/index.ts`)));
  check('Router y Gateway miran el MISMO registro, el de la configuración viva', /crearRegistro\(datosDelRegistro\(ADAPTERS, config\.providers\)\)/.test(leer(`${dir}/index.ts`)));

  const vivos = ['functions/src/index.ts', 'functions/src/creator/index.ts', 'functions/src/creator/brain.ts', 'functions/src/creator/video.ts', 'functions/src/creator/planner.ts', 'functions/src/gateway/index.ts', 'functions/src/engine/index.ts', 'functions/src/generateAvatar.ts'];
  /*
   * ESTO DECÍA «NADA DE PRODUCCIÓN PASA POR AQUÍ». Ya no es verdad, y se cambia
   * a propósito: el canary de F12-D conectó UNA ruta —`brainChat` con
   * `text.generate`— y ninguna más. La guarda no se quita; se estrecha, para que
   * siga cazando al segundo módulo que entre sin que nadie lo autorice.
   */
  /*
   * Y AHORA SON DOS, no una. El canary de vídeo (M-1) abrió la segunda puerta:
   * `generateVideo` con `video.generate`. La guarda sigue sin quitarse —se
   * vuelve a estrechar— y lo que fija es lo que importa: CADA puerta declara en
   * su propio código la ÚNICA capacidad que puede mandar al Core, y ninguna
   * puede abrir la de la otra. Un tercer módulo que entre hace fallar esto.
   */
  const entran = vivos.filter((f) => /from '\.\.?\/runtime'/.test(sinComentarios(leer(f))));
  check('CONECTADO SOLO PARA DOS CANARIES: texto en Brain y vídeo en Studio, y nadie más',
    entran.join(',') === 'functions/src/creator/brain.ts,functions/src/creator/video.ts', entran.join(','));
  const videoVivo = sinComentarios(leer('functions/src/creator/video.ts'));
  check('el de vídeo también entra por la PUERTA, con una sola decisión', /decidirRuntime\(await configuracionDeLaPuerta\(getFirestore\(\)\)/.test(videoVivo) && videoVivo.match(/decidirRuntime\(/g).length === 1);
  check('y con SU capacidad escrita en SU código: la configuración puede cerrar, nunca ampliar',
    /CAPACIDAD_DEL_CANARY: CapabilityId = 'video\.generate'/.test(videoVivo) && /normalizado\.capability === CAPACIDAD_DEL_CANARY/.test(videoVivo));
  check('los dos candados son independientes: ninguna puerta puede abrir la capacidad de la otra',
    /CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate'/.test(sinComentarios(leer('functions/src/creator/brain.ts'))));
  const brainVivo = sinComentarios(leer('functions/src/creator/brain.ts'));
  check('y entra por la PUERTA: una sola decisión, cerrada por defecto', /decidirRuntime\(await configuracionDeLaPuerta\(db\)/.test(brainVivo) && brainVivo.match(/decidirRuntime\(/g).length === 1);
  check('con UNA capacidad autorizada en el código: la configuración puede cerrar, nunca ampliar', /CAPACIDAD_DEL_CANARY: CapabilityId = 'text\.generate'/.test(brainVivo) && /puerta\.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY/.test(brainVivo));
  check('CORE o LEGACY, nunca los dos: un pensador, elegido una vez', /const pensador: Thinker = porElCore \? await pensadorDelConductor\(\) : pensadorDeSiempre\(\)/.test(brainVivo) && brainVivo.match(/engine\.generate\(/g).length === 1);
  check('y la cuenta con la que se decide es la del principal autenticado, no la que mande el cliente', /userId: uid, experienceId: EXPERIENCIA_DE_BRAIN/.test(brainVivo) && /const uid = request\.auth\.uid/.test(brainVivo));
  /*
   * Con el paso I, `index.ts` despliega UNA tarea programada de mantenimiento
   * —preguntar y liquidar—, y eso NO es una entrada al conductor. Lo que se
   * fija sigue siendo lo mismo: nadie puede pedirle al conductor que ejecute
   * algo salvo por la puerta de `brainChat`. Se mira sin comentarios, porque
   * nombrar algo al explicarlo no es exportarlo.
   */
  const INDEX_VIVO = sinComentarios(leer('functions/src/index.ts'));
  check('e index.ts sigue sin exportar el conductor: la única entrada es la puerta de brainChat',
    !/conductorDeWee|crearConductor|from '\.\/runtime'/.test(INDEX_VIVO));
  check('lo único que despliega del runtime es la pasada de mantenimiento, que no ejecuta trabajos',
    (INDEX_VIVO.match(/from '\.\/settlement\//g) || []).length === 1 && /barridoDeLiquidacion/.test(INDEX_VIVO));
  check('las cabeceras lo dicen donde se lee', ['conductor.ts', 'almacen.ts', 'index.ts', 'puerta.ts'].every((f) => /NADA DE PRODUCCIÓN (PASA POR AQUÍ|LEE ESTA PUERTA) TODAVÍA/.test(leer(`${dir}/${f}`))));
  check('esta suite está en la cadena de `npm test`', /runtime-conductor\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
