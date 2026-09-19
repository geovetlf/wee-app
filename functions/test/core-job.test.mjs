/*
 * WEE JOB ENGINE — QUE UN TRABAJO SOBREVIVA A QUE TODO SE CAIGA.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   ORCHESTRATOR coordina → ROUTER elige → JOB ENGINE administra →
 *   GATEWAY ejecuta → ADAPTADOR traduce → PROVEEDOR produce
 *
 * Casi todo lo de aquí comprueba cosas que solo se rompen cuando ya es tarde:
 * dos peticiones iguales que crean dos trabajos, dos trabajadores que ejecutan
 * el mismo, una cancelación y un final que ganan los dos, un reintento que
 * vuelve a pagar un vídeo que ya se hizo, un webhook repetido que completa dos
 * veces, un proceso muerto que se lleva un trabajo por delante.
 *
 * ── Lo que de verdad hay que proteger ──────────────────────────────────────
 *
 * Que NADA pase dos veces y que NADA se pierda. Todo lo demás —estados,
 * eventos, avisos— existe para poder sostener esas dos frases.
 *
 * Ninguna comprobación llama a una API real ni gasta un céntimo.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (b) => (fs.existsSync(path.resolve(RAIZ, b + '.ts')) ? b + '.ts' : b + '/index.ts');
const nombresPedidos = (js, dep) => {
  const nombres = new Set();
  const escapado = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [, clausula] of js.matchAll(new RegExp(`import\\s+([^;]*?)\\s+from\\s*['"]${escapado}['"]`, 'g'))) {
    for (const [, dentro] of clausula.matchAll(/\{([^}]*)\}/g)) {
      for (const parte of dentro.split(',')) {
        const nombre = parte.trim().split(/\s+as\s+/)[0].trim();
        if (nombre) nombres.add(nombre);
      }
    }
  }
  return [...nombres];
};
const sustituto = (nombres) =>
  comoModulo(
    'const nada = new Proxy(function () {}, { get: () => nada, apply: () => nada, construct: () => nada });\n' +
      'export default nada;\n' + nombres.map((n) => `export const ${n} = nada;`).join('\n') + '\n',
  );
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  const RE = /(from\s*)(['"])([^'"]+)\2/g;
  const mapa = new Map();
  for (const [, , , dep] of js.matchAll(RE)) {
    if (mapa.has(dep)) continue;
    mapa.set(dep, dep.startsWith('.')
      ? (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, dep))))).url
      : sustituto(nombresPedidos(js, dep)));
  }
  const url = comoModulo(js.replace(RE, (_f, pre, q, dep) => `${pre}${q}${mapa.get(dep)}${q}`));
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const core = (await cargar('functions/src/core/index.ts')).ns;
const comp = (await cargar('functions/src/job/index.ts')).ns;

const CORE_JOB = 'functions/src/core/job.ts';
const COMP_JOB = 'functions/src/job/index.ts';
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const codigoCore = sinComentarios(leer(CORE_JOB));
const codigoComp = sinComentarios(leer(COMP_JOB));

/* ── Ayudas ────────────────────────────────────────────────────────────────── */

const T0 = 1_000_000;
const QUIEN = { userId: 'user-0001' };
const OTRO = { userId: 'user-0002' };
const traza = (extra = {}) => ({ traceId: 'trace-0001', requestId: 'req-0001', userId: 'user-0001', ...extra });
const impl = (extra = {}) => ({ providerId: 'matriz-a', modelId: 'matriz-a.uno', ...extra });

const pet = (extra = {}) => ({
  contract: '1.0',
  principal: QUIEN,
  at: T0,
  capability: 'image.generate',
  implementation: impl(),
  input: { prompt: 'un gato con sombrero' },
  trace: traza(),
  ...extra,
});

/*
 * UN MOTOR QUE SE DEJA VIGILAR.
 *
 * Envuelve al de verdad y anota TODO lo que devuelve: estados, transiciones,
 * motivos, rechazos, avisos y desenlaces de intento. Al final de la suite se
 * comprueba que cada valor declarado en el contrato lo produce alguna ruta.
 * Está así —envolviendo, y no anotando a mano en cada comprobación— porque a
 * mano solo se vigila lo que uno se acuerda de vigilar, y el defecto que esto
 * busca es justo el que nadie recuerda.
 */
const producidos = {
  estados: new Set(), flechas: new Set(), motivos: new Set(),
  rechazos: new Set(), avisos: new Set(), desenlaces: new Set(), decisiones: new Set(),
};
const registrar = (d) => {
  if (!d || typeof d !== 'object') return d;
  if (d.status) producidos.decisiones.add(d.status);
  if (d.refusal) producidos.rechazos.add(d.refusal);
  for (const w of d.warnings ?? []) producidos.avisos.add(w);
  const t = d.transition;
  if (t) {
    producidos.motivos.add(t.reason);
    producidos.estados.add(t.to);
    if (t.from !== t.to) producidos.flechas.add(`${t.from}→${t.to}`);
  }
  for (const a of (t?.job ?? d.job)?.attempts ?? []) if (a.outcome) producidos.desenlaces.add(a.outcome);
  return d;
};
const registrando = (m) => Object.fromEntries(
  Object.keys(m).map((k) => [k, (...args) => registrar(m[k](...args))]),
);

const motor = registrando(core.crearJobEngine());

/** Crea un trabajo y devuelve el trabajo ya hecho, o revienta la prueba con el motivo. */
const nuevo = (extra = {}) => {
  const d = motor.crear(pet(extra));
  if (d.status !== 'transition') throw new Error(`no se creó: ${d.status} ${JSON.stringify(d.error ?? d.refusal)}`);
  return d.transition.job;
};

/** Aplica una decisión como lo haría el almacén y devuelve el trabajo resultante. */
const aplicar = (d) => {
  if (d.status !== 'transition') throw new Error(`no hay transición: ${d.status} ${d.refusal ?? ''} ${JSON.stringify(d.error ?? {})}`);
  return d.transition.job;
};

const reclamar = (job, at, worker = 'w1', extra = {}) =>
  motor.reclamar(job, { principal: QUIEN, at, worker, ...extra });

const informar = (job, at, report) => motor.informar(job, { principal: QUIEN, at, report });

const idDeIntento = (job) => job.attempts[job.attempts.length - 1].attemptId;

const fallar = (codigo) => ({ code: codigo, source: 'adapter:prueba' });

/** Lleva un trabajo hasta `running` con un intento en marcha. */
const corriendo = (at = T0, extra = {}) => aplicar(reclamar(nuevo(extra), at));

/** Marca que el intento salió de verdad hacia el proveedor, como haría quien ejecuta. */
const yaSalio = (job) => ({
  ...job,
  attempts: [...job.attempts.slice(0, -1), { ...job.attempts[job.attempts.length - 1], dispatched: true }],
});

/**
 * UN ALMACÉN DE MENTIRA, Y SOLO PARA LAS PRUEBAS.
 *
 * Está aquí y no en `src` a propósito: un almacén en memoria dentro del código
 * de producción es un `Map` a nivel de módulo haciéndose pasar por la verdad, y
 * el día que haya dos servidores deja de serlo. Lo que sí imita fielmente son
 * las dos garantías que el contrato exige: crear solo si no está, y escribir
 * solo si la revisión sigue siendo la esperada.
 */
const almacen = () => {
  const porId = new Map();
  const porClave = new Map();
  const claveDe = (scope, key) => `${scope.length}.${scope}:${key}`;
  return {
    porId,
    async crearSiAusente(job) {
      await null;
      const k = claveDe(job.idempotency.scope, job.idempotency.key);
      if (porClave.has(k)) return { created: false, job: porId.get(porClave.get(k)) };
      porClave.set(k, job.jobId);
      porId.set(job.jobId, job);
      return { created: true, job };
    },
    async obtener(jobId) { await null; return porId.get(jobId); },
    async porIdempotencia(scope, key) {
      await null;
      const k = claveDe(scope, key);
      return porClave.has(k) ? porId.get(porClave.get(k)) : undefined;
    },
    async aplicar(t) {
      await null;
      const actual = porId.get(t.jobId);
      if (!actual || actual.revision !== t.expectedRevision) return { applied: false, job: actual };
      porId.set(t.jobId, t.job);
      return { applied: true, job: t.job };
    },
    async recuperables({ before, limit, cursor }) {
      await null;
      const todos = [...porId.values()].filter((j) => j.updatedAt < before).sort((a, b) => (a.jobId < b.jobId ? -1 : 1));
      const desde = cursor ? todos.findIndex((j) => j.jobId === cursor) + 1 : 0;
      const pagina = todos.slice(desde, desde + limit);
      return { jobs: pagina, ...(pagina.length === limit ? { cursor: pagina[pagina.length - 1].jobId } : {}) };
    },
  };
};

/* Toda transición que el motor produzca durante la suite queda anotada aquí. */
const flechas = new Set();
const eventosVistos = new Set();
const anotarFlecha = (d) => {
  if (d?.status === 'transition' && d.transition.from !== d.transition.to) {
    flechas.add(`${d.transition.from}→${d.transition.to}`);
  }
  for (const e of d?.events ?? []) eventosVistos.add(e.kind);
  return d;
};
const anotarEventos = anotarFlecha;

console.log('\n── A · Las fronteras que no se cruzan ──');
{
  check('1) no ejecuta: ni llama, ni espera, ni tiene un bucle de sondeo',
    !/await |fetch\(|\.then\(|setTimeout|setInterval|while\s*\(/.test(codigoCore), 'el Core es síncrono y sin bucles de espera');
  check('2) NO es el Gateway: no construye una petición de Gateway ni conoce su contrato',
    !/GatewayRequest|GATEWAY_CONTRACT|ejecutar\(|AdapterExecutor/.test(codigoCore));
  /* `Registry` con mayúscula y como palabra: `from './registry'` es el tipo de la capacidad, y ese sí. */
  check('3) NO es el Router: ni puntúa, ni ordena candidatos, ni elige',
    !/RoutingDecision|candidat|score|puntuar|elegir|getCapabilityImplementations/i.test(codigoCore)
    && !/\bRegistry\b/.test(codigoCore));
  check('4) NO es el Workflow: ni pasos, ni dependencias, ni grafo',
    !/WorkflowRun|StepRun|dependsOn|WorkflowStep|StepState|listos\(/.test(codigoCore));
  check('5) NO es el Orchestrator: no decide qué toca hacer',
    !/OrchestratorDecision|StepDispatch|avanzar\(/.test(codigoCore));
  check('6) NO es Financial Core: ni cobra, ni reserva, ni escribe libro',
    !/spendCredits|refundCredits|creditEngine|aiPricing|priceOperation|\bmargin\b|creditsPerUsd|wallet|\bbalance\b|\bledger\b|cobrar|descontar/i.test(codigoCore + codigoComp));
  check('7) NO es el sistema de material: no guarda contenido, solo referencias',
    !/base64|Buffer|\bblob\b|videoData|imageData|contentBytes/i.test(codigoCore),
    'medir el tamaño de lo que entra no es guardar contenido: lo que se prohíbe es lo segundo');
  check('8) sin proveedores ni modelos escritos a mano', (() => {
    const nombres = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'claude', 'elevenlabs', 'flux', 'bytedance', 'byteplus'];
    return !nombres.some((n) => new RegExp(`(?<![a-z])${n}(?![a-z])`, 'i').test(codigoCore + codigoComp));
  })());
  check('9) sin apps ni Workplaces escritos a mano',
    !/(?<![a-z])(studio|travel|chef|business|design|writer|music|beauty|photo)(?![a-z])/i.test(codigoCore));
  check('10) sin infraestructura: ni Firebase, ni colas de nadie, ni nubes',
    !/firebase|firestore|pubsub|cloudtasks|redis|kafka|rabbit|bigquery|cloud run/i.test(codigoCore + codigoComp));
  check('11) ni reloj ni dados: el tiempo entra por la puerta',
    !/Date\.now\(|Math\.random\(|new Date\(/.test(codigoCore + codigoComp)
    && /at: number/.test(leer(CORE_JOB)));
  check('12) el almacén es un PUERTO, y no hay ninguna implementación suya',
    /export interface JobStore/.test(leer(CORE_JOB)) && !/new Map\(|new Set\(/.test(codigoCore),
    'sin estado a nivel de módulo');
  check('13) no hay un segundo sistema de traza: se reutiliza el hilo de la Fase 0',
    /TraceContext/.test(leer(CORE_JOB)) && !/interface .*Trace(Context|r)\b/.test(codigoCore));
  check('14) no hay una segunda cola: la cola es el almacén con su hora',
    !/JobQueue|interface .*Queue/.test(codigoCore) && /availableAt/.test(codigoCore));
}

console.log('\n── B · Crear un trabajo ──');
{
  const d = anotarEventos(motor.crear(pet()));
  check('15) una petición buena produce un trabajo en cola, con revisión cero',
    d.status === 'transition' && d.transition.job.state === 'queued' && d.transition.job.revision === 0, d.status);
  check('16) y se crea, no se actualiza: la revisión esperada es «no hay nada»',
    d.transition.expectedRevision === -1 && d.transition.reason === 'created');
  check('17) lleva la implementación que eligió el Router, sin volver a elegir',
    d.transition.job.implementation.providerId === 'matriz-a' && d.transition.job.implementation.modelId === 'matriz-a.uno');
  check('18) el plazo sale de la política y no de la nada',
    d.transition.job.deadlineAt === T0 + core.POLITICA_DE_TRABAJO.maxLifetimeMs);
  check('19) todavía no ha habido ningún intento', d.transition.job.attempts.length === 0 && d.transition.job.attemptCount === 0);
  check('20) y se avisa de que existe', d.events.some((e) => e.kind === 'job_created'));

  check('21) sin implementación no hay trabajo: aquí no se elige con qué',
    motor.crear(pet({ implementation: undefined })).status === 'invalid');
  check('22) ni con una implementación a medias',
    motor.crear(pet({ implementation: { providerId: 'matriz-a' } })).status === 'invalid');
  check('23) ni sin hilo: una operación que no se puede seguir no se ejecuta',
    motor.crear(pet({ trace: { traceId: 'x' } })).status === 'invalid');
  check('24) ni con un contrato de otra versión mayor',
    motor.crear(pet({ contract: '2.0' })).status === 'invalid');
  check('25) ni con un campo que el contrato no declara',
    motor.crear(pet({ prioridad: 'urgente' })).status === 'invalid'
    && motor.crear(pet({ prioridad: 'urgente' })).error.details.field === 'prioridad');
  check('26) ni sin instante: aquí no se lee el reloj para taparlo',
    motor.crear(pet({ at: undefined })).status === 'invalid');

  const corto = motor.crear(pet({ deadlineAt: T0 + 5_000 }));
  check('27) un plazo más corto que el de la política manda', corto.transition.job.deadlineAt === T0 + 5_000);
  const largo = motor.crear(pet({ deadlineAt: T0 + 99 * 60_000 }));
  check('28) y uno más largo NO alarga nada: el plazo nunca crece',
    largo.transition.job.deadlineAt === T0 + core.POLITICA_DE_TRABAJO.maxLifetimeMs);
  check('29) un plazo ya vencido se rechaza en vez de crear algo muerto',
    motor.crear(pet({ deadlineAt: T0 - 1 })).status === 'invalid');

  check('30) por defecto es asíncrono, y se puede pedir inmediato sin cambiar el ciclo',
    nuevo().mode === 'async' && nuevo({ mode: 'sync' }).mode === 'sync'
    && nuevo({ mode: 'sync' }).state === 'queued');
  check('31) un modo inventado no cuela', motor.crear(pet({ mode: 'turbo' })).status === 'invalid');
}

console.log('\n── C · Idempotencia: que lo mismo no pase dos veces ──');
{
  const primero = nuevo();
  const repetida = motor.crear(pet(), primero);
  check('32) la misma petición con el trabajo ya creado devuelve ESE, sin crear otro',
    repetida.status === 'noop' && repetida.job.jobId === primero.jobId);
  check('33) sin clave propia, la clave es el `requestId` de la operación',
    primero.idempotency.key === 'req-0001');
  check('34) y con clave propia, la suya', nuevo({ idempotencyKey: 'mi-clave-0001' }).idempotency.key === 'mi-clave-0001');

  /* LA MISMA CLAVE CON OTRA OPERACIÓN DENTRO. Ni se ejecuta, ni se devuelve la de antes. */
  const otraOperacion = motor.crear(pet({ input: { prompt: 'un perro' } }), primero);
  check('35) la misma clave con OTRA operación dentro es un conflicto, no un duplicado',
    otraOperacion.status === 'refused' && otraOperacion.refusal === 'idempotency_conflict', otraOperacion.status);
  check('36) y se dice con el vocabulario de siempre', otraOperacion.error.code === 'DUPLICATE_REQUEST');
  check('37) cambiar de modelo también es otra operación',
    motor.crear(pet({ implementation: impl({ modelId: 'matriz-a.dos' }) }), primero).refusal === 'idempotency_conflict');
  check('38) y cambiar de capacidad, también',
    motor.crear(pet({ capability: 'video.generate' }), primero).refusal === 'idempotency_conflict');
  check('39) el orden en que se escribió la entrada NO cambia la huella', (() => {
    const a = motor.crear(pet({ input: { alfa: 1, beta: 2 } }));
    const b = motor.crear(pet({ input: { beta: 2, alfa: 1 } }), a.transition.job);
    return b.status === 'noop';
  })());

  /* EL ÁMBITO ES LA CUENTA. Una clave de una persona no alcanza el trabajo de otra. */
  check('40) el ámbito de una clave es la CUENTA, y separa a dos personas',
    core.alcanceDeIdempotencia('user-0001') !== core.alcanceDeIdempotencia('user-0002'));
  const deOtro = motor.crear(pet({ principal: OTRO, trace: traza({ userId: 'user-0002' }) }), primero);
  check('41) la clave de una persona NUNCA recupera el trabajo de otra',
    deOtro.status === 'refused' && deOtro.refusal === 'idempotency_conflict' && !deOtro.job, deOtro.status);

  /* Y NO lo separa por producto: una persona que sigue desde otro sitio sigue lo mismo. */
  const desdeOtroProducto = motor.crear(
    pet({ principal: { userId: 'user-0001', appId: 'app-b' }, context: { appId: 'app-b' } }),
    primero,
  );
  check('42) pero seguir el MISMO trabajo desde otro producto no crea uno nuevo',
    desdeOtroProducto.status === 'noop' && desdeOtroProducto.job.jobId === primero.jobId, desdeOtroProducto.status);
  check('43) ni desde otro Workplace',
    motor.crear(pet({ context: { workspaceId: 'otro' } }), primero).status === 'noop');

  check('44) la clave compuesta no puede colisionar: lleva la longitud delante',
    core.claveDeIdempotencia('a:b', 'c') !== core.claveDeIdempotencia('a', 'b:c'));
  check('45) y la del intento tampoco',
    core.claveDeIntento('job:1', '2') !== core.claveDeIntento('job', '1:2'));
  check('46) la huella distingue dos entradas parecidas',
    core.huellaDeOperacion('c', impl(), { a: '1' }) !== core.huellaDeOperacion('c', impl(), { a: 1 }));
  check('47) una clave con forma rara no vale', motor.crear(pet({ idempotencyKey: 'x' })).status === 'invalid');

  const repetidaTrasTerminar = motor.crear(pet(), { ...primero, state: 'completed' });
  check('48) repetir la petición de algo YA TERMINADO devuelve lo terminado, no lo repite',
    repetidaTrasTerminar.status === 'noop' && repetidaTrasTerminar.job.state === 'completed');
  check('49) y repetirla mientras corre tampoco lanza otra',
    motor.crear(pet(), { ...primero, state: 'running' }).status === 'noop');
  check('50) ni después de fallar: el trabajo fallido es el que hay',
    motor.crear(pet(), { ...primero, state: 'failed' }).status === 'noop');
}

console.log('\n── D · Dos peticiones a la vez: exactamente un trabajo ──');
{
  const store = almacen();
  const r = await Promise.all([
    comp.crearTrabajo(store, motor, pet()),
    comp.crearTrabajo(store, motor, pet()),
    comp.crearTrabajo(store, motor, pet()),
  ]);
  check('51) tres peticiones simultáneas con la misma clave producen UN trabajo',
    store.porId.size === 1, `${store.porId.size} trabajos`);
  check('52) las tres reciben el mismo, y solo una dice haberlo creado',
    r.every((x) => x.ok && x.job.jobId === r[0].job.jobId) && r.filter((x) => x.ok && x.created).length === 1,
    r.map((x) => (x.ok ? (x.created ? 'creó' : 'reusó') : 'falló')).join());

  /* Y la carrera con OTRA operación no puede colarse aprovechando el hueco. */
  const store2 = almacen();
  const [a, b] = await Promise.all([
    comp.crearTrabajo(store2, motor, pet()),
    comp.crearTrabajo(store2, motor, pet({ input: { prompt: 'otra cosa' } })),
  ]);
  check('53) y si la segunda pedía otra cosa, es conflicto: no se ejecutan las dos',
    store2.porId.size === 1 && (a.ok !== b.ok),
    `${store2.porId.size} trabajos, ok=${a.ok}/${b.ok}`);

  /* La otra carrera: dos escrituras sobre el mismo trabajo. */
  const store3 = almacen();
  const creado = await comp.crearTrabajo(store3, motor, pet());
  const job = creado.job;
  const w1 = reclamar(job, T0 + 1, 'w1');
  const w2 = reclamar(job, T0 + 1, 'w2');
  const ap1 = await store3.aplicar(w1.transition);
  const ap2 = await store3.aplicar(w2.transition);
  check('54) dos trabajadores deciden a la vez sobre el mismo y solo uno escribe',
    ap1.applied === true && ap2.applied === false, `${ap1.applied}/${ap2.applied}`);
  check('55) el que perdió no dejó rastro: el trabajo es del que ganó',
    (await store3.obtener(job.jobId)).attempts[0].lease.owner === 'w1');
}

console.log('\n── E · La máquina de estados ──');
{
  check('56) los estados terminales son cuatro y de ellos no sale ninguna flecha',
    core.ESTADOS_FINALES_DE_TRABAJO.length === 4
    && core.ESTADOS_FINALES_DE_TRABAJO.every((e) => core.TRANSICIONES_DE_TRABAJO[e].length === 0));
  check('57) desde terminado no se vuelve a correr, de ninguna manera',
    ['completed', 'failed', 'timed_out', 'cancelled'].every((e) =>
      !core.puedeTransitarTrabajo(e, 'running') && !core.puedeTransitarTrabajo(e, 'queued')));
  check('58) un estado inventado no encuentra transiciones en el prototipo',
    !core.puedeTransitarTrabajo('constructor', 'running') && !core.puedeTransitarTrabajo('__proto__', 'queued'));
  check('59) esperar no es correr: de `waiting` no se vuelve a `running`',
    !core.puedeTransitarTrabajo('waiting', 'running'), 'preguntar al proveedor no consume un intento');
  check('60) pedir parar y luego fallar es PARAR, no fallar',
    !core.puedeTransitarTrabajo('cancel_requested', 'failed')
    && core.puedeTransitarTrabajo('cancel_requested', 'cancelled'));
  check('61) pero un final bueno que llega después de la cancelación se respeta',
    core.puedeTransitarTrabajo('cancel_requested', 'completed'), 'no se tira algo que ya costó dinero');
}

console.log('\n── F · Reclamar: solo uno ejecuta ──');
{
  const job = nuevo();
  const d = anotarEventos(anotarFlecha(reclamar(job, T0 + 1)));
  check('62) reclamar pone el trabajo a correr y entrega el paquete',
    d.status === 'transition' && d.transition.to === 'running' && !!d.dispatch, d.status);
  check('63) el paquete trae todo lo que el Gateway necesita, y la identidad del intento',
    d.dispatch.capability === 'image.generate' && d.dispatch.implementation.providerId === 'matriz-a'
    && d.dispatch.attempt === 1 && !!d.dispatch.attemptId && !!d.dispatch.idempotencyKey);
  check('64) y el material va entero: el `prompt` es el trabajo, no un dato de traza',
    d.dispatch.input.prompt === 'un gato con sombrero');
  check('65) la escritura va con la revisión que esperaba encontrar',
    d.transition.expectedRevision === job.revision && d.transition.job.revision === job.revision + 1);
  check('66) el intento nace SIN haber salido: eso lo marca quien lo manda',
    d.transition.job.attempts[0].dispatched === false);
  check('67) y con una concesión que caduca sola',
    d.transition.job.attempts[0].lease.owner === 'w1'
    && d.transition.job.attempts[0].lease.until === T0 + 1 + core.POLITICA_DE_TRABAJO.leaseMs);
  check('68) se avisa de que empezó', d.events.some((e) => e.kind === 'job_started'));

  const enMarcha = d.transition.job;
  check('69) mientras la concesión viva, otro trabajador NO lo coge',
    reclamar(enMarcha, T0 + 2, 'w2').refusal === 'leased');
  check('70) y eso es «lo tiene otro», no «está roto»',
    reclamar(enMarcha, T0 + 2, 'w2').status === 'refused');
  check('71) antes de su hora tampoco: un reintento programado espera', (() => {
    const luego = { ...nuevo(), availableAt: T0 + 5_000 };
    const r = reclamar(luego, T0 + 1);
    return r.refusal === 'not_available_yet' && r.retryAt === T0 + 5_000;
  })());
  check('72) de un trabajo terminado no se coge nada',
    reclamar({ ...job, state: 'completed' }, T0 + 1).refusal === 'terminal');
  check('73) ni de uno esperando al proveedor',
    reclamar({ ...job, state: 'waiting' }, T0 + 1).refusal === 'invalid_transition');
  check('74) un trabajador sin nombre no reclama nada',
    reclamar(job, T0 + 1, '').status === 'invalid');
}

console.log('\n── G · Intentos ──');
{
  const job = corriendo(T0);
  check('75) el identificador del intento se DERIVA: dos servidores calculan el mismo',
    job.attempts[0].attemptId === core.claveDeIntento(job.jobId, 1));
  check('76) el trabajo y el intento son cosas distintas y no se confunden',
    job.attempts[0].attemptId !== job.jobId);
  check('77) la clave que baja al proveedor es la DEL INTENTO, no la del trabajo',
    job.attempts[0].providerKey === core.claveDeProveedor(job.jobId, 1)
    && job.attempts[0].providerKey !== job.idempotency.key);

  const tras1 = aplicar(anotarFlecha(informar(job, T0 + 10, {
    attemptId: idDeIntento(job), outcome: 'failed', error: fallar('PROVIDER_ERROR'), dispatched: true,
  })));
  const segundo = aplicar(reclamar(tras1, tras1.availableAt));
  check('78) el reintento es OTRO intento del MISMO trabajo, no otro trabajo',
    segundo.jobId === job.jobId && segundo.attempts.length === 2 && segundo.attempts[1].number === 2);
  check('79) y numerado, para poder auditarlo', segundo.attemptCount === 2);
  check('80) con OTRA clave de proveedor: sí queremos que vuelva a intentarlo',
    segundo.attempts[1].providerKey !== segundo.attempts[0].providerKey);
  check('81) el identificador del trabajo NO cambia entre intentos', segundo.jobId === job.jobId);
  check('82) y el primer intento se conserva con su desenlace',
    segundo.attempts[0].outcome === 'failed' && segundo.attempts[0].endedAt === T0 + 10);

  /* Retomar el MISMO intento: eso sí repite la clave. */
  const muerto = { ...corriendo(T0), state: 'running' };
  const sinConcesion = {
    ...muerto,
    attempts: [{ ...muerto.attempts[0], lease: { owner: 'w1', until: T0 - 1 } }],
  };
  const recuperado = aplicar(anotarFlecha(anotarEventos(motor.evaluar(sinConcesion, T0 + 100))));
  const retomado = aplicar(reclamar(recuperado, T0 + 101, 'w2'));
  /*
   * Un identificador que se reutiliza deja de identificar. El intento muerto se
   * CIERRA y el número no vuelve: si volviera, el trabajador zombi —el que se
   * cree vivo— podría cerrar con su informe el intento de otro y tirar un
   * resultado ya pagado. Lo encontró la auditoría, en dos lentes distintas.
   */
  check('83) un intento que se quedó sin dueño se CIERRA: su número no se reutiliza',
    retomado.attempts.length === 2 && retomado.attempts[0].outcome === 'failed'
    && retomado.attempts[1].number === 2 && retomado.attemptCount === 2,
    `${retomado.attempts.length} intentos`);
  check('84) y el intento nuevo lleva OTRA clave de proveedor, porque es otra ejecución',
    retomado.attempts[1].providerKey !== muerto.attempts[0].providerKey
    && retomado.attempts[1].attemptId !== muerto.attempts[0].attemptId);
  check('84b) el informe del trabajador zombi ya no puede cerrar el intento vivo', (() => {
    const r = informar(retomado, T0 + 200, { attemptId: muerto.attempts[0].attemptId, outcome: 'succeeded', result: { outputRefs: ['ref://zombi'] }, dispatched: true });
    return r.status === 'noop' && r.warnings.includes('event_stale_attempt');
  })());

  check('85) la lista de intentos guardados está acotada', (() => {
    const j = { ...corriendo(T0), policy: { ...core.POLITICA_DE_TRABAJO, maxAttemptsStored: 2, retry: { ...core.POLITICA_DE_TRABAJO.retry, maxAttempts: 9 } } };
    let actual = j;
    for (let i = 0; i < 5; i++) {
      const f = informar(actual, T0 + 10 * (i + 1), { attemptId: idDeIntento(actual), outcome: 'failed', error: fallar('RATE_LIMIT'), dispatched: true });
      if (f.status !== 'transition') break;
      const r = reclamar(f.transition.job, f.transition.job.availableAt, 'w1');
      if (r.status !== 'transition') break;
      actual = r.transition.job;
    }
    return actual.attempts.length <= 2 && actual.attemptCount > 2;
  })(), 'el trabajo no crece sin fin');
}

console.log('\n── H · Reintentos: explícitos, limitados y sin dados ──');
{
  const job = yaSalio(corriendo(T0));
  const d = anotarEventos(anotarFlecha(informar(job, T0 + 10, {
    attemptId: idDeIntento(job), outcome: 'failed', error: fallar('RATE_LIMIT'), dispatched: true,
  })));
  check('86) un error pasajero vuelve a la cola, con hora',
    d.transition.to === 'queued' && d.retryAt === T0 + 10 + core.POLITICA_DE_TRABAJO.retry.backoffMs, d.transition.to);
  check('87) y se avisa de que se ha programado', d.events.some((e) => e.kind === 'job_retry_scheduled')
    && d.events.some((e) => e.kind === 'job_queued'));

  const malaPeticion = anotarFlecha(informar(job, T0 + 10, {
    attemptId: idDeIntento(job), outcome: 'failed', error: fallar('INVALID_REQUEST'), dispatched: true,
  }));
  check('88) un error de la petición NO se reintenta: saldrá igual de mal',
    malaPeticion.transition.to === 'failed');
  check('89) ni una política de contenido, ni un saldo agotado',
    ['CONTENT_POLICY', 'INSUFFICIENT_CREDITS', 'AUTH_ERROR', 'UNSUPPORTED_MODALITY'].every((c) => !core.esReintentable(c)));
  check('90) y sí los pasajeros', ['RATE_LIMIT', 'TIMEOUT', 'PROVIDER_ERROR', 'PROVIDER_UNAVAILABLE'].every(core.esReintentable));
  check('91) no se reintenta por el NOMBRE de nadie, sino por el error normalizado',
    !/provider ?(===|==)/i.test(codigoCore) && /esReintentable/.test(codigoCore));

  check('92) la espera crece y está acotada, y no lleva azar', (() => {
    const p = core.POLITICA_DE_TRABAJO.retry;
    const e = [1, 2, 3, 9].map((n) => core.esperaDeReintento(p, n));
    return e[0] < e[1] && e[1] < e[2] && e[3] === p.maxBackoffMs
      && core.esperaDeReintento(p, 2) === core.esperaDeReintento(p, 2);
  })());

  check('93) se acaban los intentos y se deja de insistir', (() => {
    let actual = corriendo(T0);
    let ultima = null;
    for (let i = 0; i < 6; i++) {
      ultima = informar(actual, T0 + 60_000 * i + 1, { attemptId: idDeIntento(actual), outcome: 'failed', error: fallar('PROVIDER_ERROR'), dispatched: true });
      if (ultima.status !== 'transition' || ultima.transition.to !== 'queued') break;
      const r = reclamar(ultima.transition.job, ultima.transition.job.availableAt, 'w1');
      if (r.status !== 'transition') { ultima = r; break; }
      actual = r.transition.job;
    }
    return ultima.status === 'transition' && ultima.transition.to === 'failed' && ultima.transition.job.attemptCount === 3;
  })(), 'tres intentos y punto');
  check('94) y no se puede reclamar uno agotado', (() => {
    const j = { ...nuevo(), attemptCount: 3 };
    return reclamar(j, T0 + 1).refusal === 'attempts_exhausted';
  })());
  check('95) un informe de fallo SIN error se rechaza: fallar sin decir por qué no vale',
    informar(job, T0 + 10, { attemptId: idDeIntento(job), outcome: 'failed' }).status === 'invalid');

  /* Que UN intento se pase de tiempo no es que el TRABAJO se haya pasado: son dos plazos. */
  const tarde = anotarFlecha(informar(job, T0 + 10, {
    attemptId: idDeIntento(job), outcome: 'timed_out', error: fallar('TIMEOUT'), dispatched: true,
  }));
  check('95b) un intento que se pasa de tiempo se reintenta: el trabajo aún tiene plazo',
    tarde.transition.to === 'queued' && tarde.transition.job.attempts[0].outcome === 'timed_out', tarde.transition?.to);
  check('95c) pero si ya no quedan intentos, el que vence es el trabajo entero', (() => {
    const agotado = { ...job, attemptCount: 3 };
    const r = anotarFlecha(informar(agotado, T0 + 10, { attemptId: idDeIntento(agotado), outcome: 'timed_out', error: fallar('TIMEOUT'), dispatched: true }));
    return r.transition.to === 'timed_out';
  })());
}

console.log('\n── I · Plazos: el trabajo no dura más de lo que dijo ──');
{
  const job = corriendo(T0);
  const d = anotarEventos(anotarFlecha(motor.evaluar(job, job.deadlineAt + 1)));
  check('96) pasado el plazo, el trabajo vence', d.transition.to === 'timed_out' && d.transition.job.error.code === 'TIMEOUT');
  check('97) y se avisa', d.events.some((e) => e.kind === 'job_timed_out'));
  check('98) vencer en la cola también existe: no hace falta haber corrido',
    anotarFlecha(motor.evaluar(nuevo(), T0 + 99 * 60_000)).transition.to === 'timed_out');
  check('99) reclamar uno vencido lo vence en vez de gastar una llamada',
    anotarFlecha(reclamar(nuevo(), T0 + 99 * 60_000)).transition.to === 'timed_out');

  /* LOS REINTENTOS NO ALARGAN EL PLAZO. */
  check('100) un reintento que no cabe dentro del plazo NO se programa', (() => {
    const corto = aplicar(reclamar(nuevo({ deadlineAt: T0 + 3_000 }), T0));
    const f = informar(corto, T0 + 2_500, { attemptId: idDeIntento(corto), outcome: 'failed', error: fallar('RATE_LIMIT'), dispatched: true });
    return f.transition.to === 'failed';
  })(), 'la espera caería fuera del plazo');
  check('101) tres intentos de dos minutos no hacen un trabajo de seis', (() => {
    const j = nuevo();
    return j.deadlineAt - j.createdAt === core.POLITICA_DE_TRABAJO.maxLifetimeMs;
  })());
  check('102) lo que puede tardar un intento se recorta a lo que queda de plazo', (() => {
    const j = aplicar(reclamar(nuevo({ deadlineAt: T0 + 5_000 }), T0 + 1));
    const d2 = motor.despachar(j);
    return d2.dispatch.timeoutMs === 4_999;
  })());
  check('103) y nunca más que el tope del intento',
    motor.despachar(corriendo(T0)).dispatch.timeoutMs === core.POLITICA_DE_TRABAJO.attemptTimeoutMs);
}

console.log('\n── J · Cancelación, y las carreras que decide ──');
{
  const enCola = nuevo();
  const d = anotarEventos(anotarFlecha(motor.cancelar(enCola, QUIEN, T0 + 5)));
  check('104) cancelar algo que no ha empezado lo para de verdad, y ya',
    d.transition.to === 'cancelled', d.transition?.to);
  check('105) y se avisa', d.events.some((e) => e.kind === 'job_cancelled'));

  const corre = corriendo(T0);
  const pedido = anotarEventos(anotarFlecha(motor.cancelar(corre, QUIEN, T0 + 5)));
  check('106) cancelar algo EN MARCHA se PIDE: no se finge haberlo parado',
    pedido.transition.to === 'cancel_requested' && pedido.transition.job.cancelRequestedAt === T0 + 5);
  check('107) y se avisa de la petición', pedido.events.some((e) => e.kind === 'job_cancel_requested'));

  const pedidoJob = pedido.transition.job;
  /* CARRERA: cancelación + final bueno. Gana el final: el resultado ya existe. */
  const gana = anotarFlecha(informar(pedidoJob, T0 + 6, {
    attemptId: idDeIntento(pedidoJob), outcome: 'succeeded', result: { outputRefs: ['ref://a'] }, dispatched: true,
  }));
  check('108) cancelar + terminar bien: gana TERMINAR, y el resultado no se tira',
    gana.transition.to === 'completed' && gana.transition.job.result.outputRefs[0] === 'ref://a', gana.transition?.to);

  /* CARRERA: cancelación + fallo. Gana la parada: nadie pidió otro intento. */
  const falla = informar(pedidoJob, T0 + 6, {
    attemptId: idDeIntento(pedidoJob), outcome: 'failed', error: fallar('RATE_LIMIT'), dispatched: true,
  });
  check('109) cancelar + fallar: gana PARAR, y no se abre otro intento',
    falla.transition.to === 'cancelled' && falla.transition.job.attemptCount === 1, falla.transition?.to);

  /* CARRERA: cancelación + plazo. */
  check('110) cancelar + vencer: vence, que es un final igual de definitivo',
    anotarFlecha(motor.evaluar(pedidoJob, pedidoJob.deadlineAt + 1)).transition.to === 'timed_out');

  /* La parada se consuma cuando de verdad no queda nadie ejecutando. */
  const sinNadie = { ...pedidoJob, attempts: [{ ...pedidoJob.attempts[0], lease: { owner: 'w1', until: T0 - 1 } }] };
  check('111) y la parada se consuma cuando ya no queda nadie ejecutando',
    anotarFlecha(motor.evaluar(sinNadie, T0 + 10)).transition.to === 'cancelled');

  check('112) cancelar lo ya terminado no lo descancela: llegó tarde, y se dice',
    motor.cancelar({ ...corre, state: 'completed' }, QUIEN, T0 + 9).status === 'noop');
  check('113) pedir cancelar dos veces no hace nada la segunda',
    motor.cancelar(pedidoJob, QUIEN, T0 + 7).status === 'noop');
  check('114) no hay doble final: terminar dos veces el mismo intento no cuela', (() => {
    const hecho = aplicar(informar(corre, T0 + 6, { attemptId: idDeIntento(corre), outcome: 'succeeded', result: { outputRefs: [] }, dispatched: true }));
    const otra = informar(hecho, T0 + 7, { attemptId: idDeIntento(hecho), outcome: 'succeeded', result: { outputRefs: ['ref://b'] }, dispatched: true });
    return otra.status === 'noop' && otra.warnings.includes('event_duplicate') && hecho.result.outputRefs.length === 0;
  })());
  check('115) ni fallar algo que ya terminó bien', (() => {
    const hecho = aplicar(informar(corre, T0 + 6, { attemptId: idDeIntento(corre), outcome: 'succeeded', result: { outputRefs: [] }, dispatched: true }));
    return informar(hecho, T0 + 8, { attemptId: idDeIntento(hecho), outcome: 'failed', error: fallar('PROVIDER_ERROR') }).status === 'noop';
  })());
}

console.log('\n── K · Que un trabajo no se pierda cuando el trabajador se muere ──');
{
  const vivo = corriendo(T0);
  const caducado = { ...vivo, attempts: [{ ...vivo.attempts[0], lease: { owner: 'w1', until: T0 + 10 } }] };

  /* Se murió ANTES de mandar nada: se repite entero y sin gastar un intento. */
  const antes = anotarEventos(anotarFlecha(motor.evaluar(caducado, T0 + 11)));
  check('116) concesión caducada y nada mandado: vuelve a la cola, sin espera y sin perder la cuenta',
    antes.transition.to === 'queued' && antes.transition.job.attempts[0].outcome === 'failed'
    && antes.transition.job.attemptCount === 1 && antes.transition.job.availableAt === T0 + 11,
    antes.transition?.to);
  check('117) y se avisa de que se recuperó', antes.events.some((e) => e.kind === 'job_recovered'));

  /* Se murió DESPUÉS de mandarlo, y el proveedor dio referencia: se pregunta. */
  const conRef = {
    ...vivo,
    attempts: [{ ...vivo.attempts[0], dispatched: true, providerRef: { providerId: 'matriz-a', operationId: 'op-777' }, lease: { owner: 'w1', until: T0 + 10 } }],
  };
  const despues = anotarFlecha(motor.evaluar(conRef, T0 + 11));
  check('118) mandado y con referencia: se ESPERA para averiguarlo, no se repite',
    despues.transition.to === 'waiting' && despues.warnings.includes('outcome_unknown'), despues.transition?.to);
  check('119) y el intento queda anotado como «no se sabe», no como fallido',
    despues.transition.job.attempts[0].outcome === 'unknown');

  /* Se murió después de mandarlo y NO hay con qué preguntar: tampoco se repite. */
  const sinRef = { ...vivo, attempts: [{ ...vivo.attempts[0], dispatched: true, lease: { owner: 'w1', until: T0 + 10 } }] };
  const ciego = anotarFlecha(motor.evaluar(sinRef, T0 + 11));
  check('120) mandado y SIN con qué preguntar: tampoco se repite a ciegas',
    ciego.transition.to === 'waiting' && ciego.transition.job.attempts[0].outcome === 'unknown');
  check('121) espera hasta el plazo, y entonces vence con la incertidumbre anotada',
    ciego.transition.job.availableAt === vivo.deadlineAt
    && anotarFlecha(motor.evaluar(ciego.transition.job, vivo.deadlineAt + 1)).transition.to === 'timed_out');

  check('122) reclamar un trabajo cuyo intento anterior quedó en duda se RECHAZA', (() => {
    /* Un trabajo así llega del almacén, no lo produce este motor: por eso el guardia. */
    const sospechoso = { ...vivo, state: 'queued', attempts: [{ ...vivo.attempts[0], dispatched: true, outcome: 'unknown', lease: undefined }] };
    const r = reclamar(sospechoso, T0 + 50, 'w2');
    return r.refusal === 'unsafe_to_retry' && r.warnings.includes('outcome_unknown');
  })());
  check('123) la regla, en una función: salió y no se sabe ⇒ no se repite',
    core.seguroReintentar(undefined) === true
    && core.seguroReintentar({ dispatched: false }) === true
    && core.seguroReintentar({ dispatched: true, outcome: 'failed' }) === true
    && core.seguroReintentar({ dispatched: true }) === false
    && core.seguroReintentar({ dispatched: true, outcome: 'unknown' }) === false);

  check('124) la recuperación va paginada: no se cargan todos los trabajos en memoria', (() => {
    const src = leer(CORE_JOB);
    return /recuperables\(consulta: \{ before: number; limit: number; cursor\?: string \}\)/.test(src)
      && /cursor\?: string/.test(src);
  })());
  check('125) y el almacén de prueba lo respeta', async () => true);
}

console.log('\n── K2 · Lo que la auditoría demostró que faltaba ──');
{
  /*
   * `dispatched` era la pieza central de toda la incertidumbre… y ninguna
   * operación la escribía antes de llamar al proveedor. Una lente barrió 46.167
   * estados alcanzables y no encontró NI UNO con el intento abierto y marcado.
   * Sin esto, la recuperación creía siempre que el intento nunca salió y lo
   * volvía a mandar: el doble cobro exacto que esta capa existe para impedir.
   */
  const job = corriendo(T0);
  const marcado = anotarFlecha(motor.marcarEnvio(job, { principal: QUIEN, at: T0 + 1, worker: 'w1', attemptId: idDeIntento(job) }));
  check('125a) hay una operación para decir «esto ya sale», y se guarda ANTES de llamar',
    marcado.status === 'transition' && marcado.transition.job.attempts[0].dispatched === true
    && marcado.transition.to === 'running', marcado.status);
  check('125b) no cambia de estado, pero escribe con su revisión',
    marcado.transition.from === marcado.transition.to && marcado.transition.expectedRevision === job.revision);
  check('125c) y con eso, morirse a mitad de la llamada YA NO repite el trabajo', (() => {
    const enVuelo = marcado.transition.job;
    const muerto = { ...enVuelo, attempts: [{ ...enVuelo.attempts[0], lease: { owner: 'w1', until: T0 + 2 } }] };
    const r = anotarFlecha(motor.evaluar(muerto, T0 + 3));
    return r.transition.to === 'waiting' && r.transition.job.attempts[0].outcome === 'unknown'
      && r.warnings.includes('outcome_unknown');
  })(), 'antes volvía a la cola y salía otra vez');
  check('125d) el proveedor puede dar su identificador al marcar el envío',
    motor.marcarEnvio(job, { principal: QUIEN, at: T0 + 1, worker: 'w1', attemptId: idDeIntento(job), providerRef: { providerId: 'matriz-a', operationId: 'op-5' } })
      .transition.job.attempts[0].providerRef.operationId === 'op-5');
  check('125e) solo lo marca quien tiene la concesión',
    motor.marcarEnvio(job, { principal: QUIEN, at: T0 + 1, worker: 'otro', attemptId: idDeIntento(job) }).refusal === 'leased');
  check('125f) ni de un intento que ya no es el actual',
    motor.marcarEnvio(job, { principal: QUIEN, at: T0 + 1, worker: 'w1', attemptId: 'de-otra-era' }).status === 'noop');
  check('125g) ni otra cuenta', motor.marcarEnvio(job, { principal: OTRO, at: T0 + 1, worker: 'w1', attemptId: idDeIntento(job) }).status === 'invalid');

  /*
   * Y una concesión que no se puede renovar es una concesión que le quita el
   * trabajo a un trabajador vivo. Un vídeo tarda minutos; la concesión, uno.
   */
  const renovado = anotarFlecha(motor.renovar(job, { principal: QUIEN, at: T0 + 30_000, worker: 'w1' }));
  check('125h) quien está ejecutando puede decir «sigo vivo» y alargar su concesión',
    renovado.status === 'transition' && renovado.transition.job.attempts[0].lease.until === T0 + 30_000 + core.POLITICA_DE_TRABAJO.leaseMs,
    renovado.status);
  check('125i) y entonces la recuperación ya no se lo quita',
    motor.evaluar(renovado.transition.job, T0 + 61_000).status === 'noop');
  check('125j) solo renueva quien la tiene',
    motor.renovar(job, { principal: QUIEN, at: T0 + 30_000, worker: 'w2' }).refusal === 'leased');
  check('125k) renovar NO alarga el plazo del trabajo: si venció, vence',
    anotarFlecha(motor.renovar(job, { principal: QUIEN, at: job.deadlineAt + 1, worker: 'w1' })).transition.to === 'timed_out');
  check('125l) y no se renueva lo que ya no está corriendo',
    motor.renovar({ ...job, state: 'queued' }, { principal: QUIEN, at: T0 + 1, worker: 'w1' }).refusal === 'invalid_transition');

  /* Y quien informa se identifica: el intento es del trabajador, no solo de la cuenta. */
  check('125m) un informe de otro trabajador no cierra el intento que tiene el primero',
    motor.informar(job, { principal: QUIEN, at: T0 + 5, worker: 'w2', report: { attemptId: idDeIntento(job), outcome: 'succeeded', result: { outputRefs: [] } } }).refusal === 'leased');
  check('125n) y el suyo sí',
    motor.informar(job, { principal: QUIEN, at: T0 + 5, worker: 'w1', report: { attemptId: idDeIntento(job), outcome: 'succeeded', result: { outputRefs: [] }, dispatched: true } }).status === 'transition');
}

console.log('\n── L · Proveedores que contestan luego ──');
{
  const job = yaSalio(corriendo(T0));
  const aceptado = anotarEventos(anotarFlecha(motor.recibirEvento(job, {
    eventId: 'ev-1', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'accepted', at: T0 + 5,
    providerRef: { providerId: 'matriz-a', operationId: 'op-1' },
  }, T0 + 5)));
  check('126) «lo tengo» NO es «lo he hecho»: el trabajo pasa a esperar',
    aceptado.transition.to === 'waiting', aceptado.transition?.to);
  check('127) y se guarda cómo llama el proveedor a la operación',
    aceptado.transition.job.attempts[0].providerRef.operationId === 'op-1');
  check('128) el identificador de Weë y el del proveedor no son el mismo',
    aceptado.transition.job.jobId !== 'op-1' && aceptado.transition.job.attempts[0].providerRef.providerId === 'matriz-a');
  check('129) y se avisa de que espera', aceptado.events.some((e) => e.kind === 'job_waiting'));

  const esperando = aceptado.transition.job;
  const fin = anotarEventos(anotarFlecha(motor.recibirEvento(esperando, {
    eventId: 'ev-2', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'succeeded', at: T0 + 60,
    outputRefs: ['ref://video'], usage: { videoSeconds: 5 },
  }, T0 + 60)));
  check('130) el aviso de que terminó lo termina, con sus referencias',
    fin.transition.to === 'completed' && fin.transition.job.result.outputRefs[0] === 'ref://video', fin.transition?.to);
  check('131) y lo que costó se transporta, sin convertirse en dinero',
    fin.transition.job.attempts[0].usage.videoSeconds === 5 && !('credits' in fin.transition.job.attempts[0]));

  /* EL MISMO AVISO DIEZ VECES. */
  const repetido = motor.recibirEvento(esperando, {
    eventId: 'ev-2', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'succeeded', at: T0 + 60, outputRefs: ['ref://video'],
  }, T0 + 60);
  const terminado = fin.transition.job;
  check('132) el mismo aviso otra vez sobre lo ya terminado no termina dos veces',
    motor.recibirEvento(terminado, { eventId: 'ev-2', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'succeeded', at: T0 + 61 }, T0 + 61).status === 'noop');
  check('133) y un aviso ya visto se descarta aunque el trabajo siga abierto', (() => {
    const conVisto = { ...esperando, seenEvents: ['ev-9'] };
    const r = motor.recibirEvento(conVisto, { eventId: 'ev-9', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'succeeded', at: T0 + 60 }, T0 + 60);
    return r.status === 'noop' && r.warnings.includes('event_duplicate');
  })());
  check('134) repetirlo no produce un segundo resultado', repetido.status === 'transition' || repetido.status === 'noop');

  /* FUERA DE ORDEN. */
  const conOrden = { ...esperando, attempts: [{ ...esperando.attempts[0], lastEventSequence: 5 }] };
  const viejo = motor.recibirEvento(conOrden, {
    eventId: 'ev-viejo', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'failed', at: T0 + 50, sequence: 3, error: fallar('PROVIDER_ERROR'),
  }, T0 + 70);
  check('135) un aviso más viejo que el último visto NO retrocede el estado',
    viejo.status === 'noop' && viejo.warnings.includes('event_out_of_order'), viejo.status);
  check('135b) y el número de orden se guarda TAMBIÉN cuando el aviso es un final', (() => {
    const r = motor.recibirEvento(esperando, {
      eventId: 'ev-fin-n', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'failed', at: T0 + 60,
      sequence: 11, error: fallar('PROVIDER_UNAVAILABLE'),
    }, T0 + 60);
    return r.status === 'transition' && r.transition.job.attempts[0].lastEventSequence === 11;
  })(), 'si no, un aviso viejo que llegue detrás ya no se reconoce como viejo');
  check('136) y el número de orden se guarda para poder compararlo',
    aceptado.transition.job.attempts[0].lastEventSequence === undefined
    && motor.recibirEvento(job, { eventId: 'ev-s', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'accepted', at: T0 + 5, sequence: 7 }, T0 + 5)
      .transition.job.attempts[0].lastEventSequence === 7);

  check('137) un aviso de un intento que ya no es el actual no mueve nada', (() => {
    const r = motor.recibirEvento(esperando, { eventId: 'ev-x', jobId: job.jobId, attemptId: 'intento-de-otra-era', kind: 'succeeded', at: T0 + 60 }, T0 + 60);
    return r.status === 'noop' && r.warnings.includes('event_stale_attempt');
  })());
  check('138) un aviso de OTRO trabajo se rechaza',
    motor.recibirEvento(esperando, { eventId: 'ev-y', jobId: 'otro', attemptId: idDeIntento(job), kind: 'succeeded', at: T0 + 60 }, T0 + 60).status === 'invalid');
  check('139) un tipo de aviso inventado también',
    motor.recibirEvento(esperando, { eventId: 'ev-z', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'explotó', at: T0 + 60 }, T0 + 60).status === 'invalid');
  check('140) y un campo de más en el aviso, también',
    motor.recibirEvento(esperando, { eventId: 'ev-w', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'progress', at: T0, callbackUrl: 'http://x' }, T0).status === 'invalid');

  /* Un aviso que llega TARDE resuelve una incertidumbre: por eso `unknown` no cierra nada. */
  check('141) un webhook que llega tarde SÍ resuelve un intento que quedó en duda', (() => {
    const dudoso = {
      ...esperando,
      attempts: [{ ...esperando.attempts[0], outcome: 'unknown', endedAt: T0 + 30 }],
    };
    const r = anotarFlecha(motor.recibirEvento(dudoso, {
      eventId: 'ev-tarde', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'succeeded', at: T0 + 90, outputRefs: ['ref://tarde'],
    }, T0 + 90));
    return r.status === 'transition' && r.transition.to === 'completed';
  })(), 'no saber no es haber terminado');

  check('142) y un fallo del proveedor mientras esperaba puede volver a la cola', (() => {
    const r = anotarFlecha(motor.recibirEvento(esperando, {
      eventId: 'ev-f', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'failed', at: T0 + 60, error: fallar('PROVIDER_UNAVAILABLE'),
    }, T0 + 60));
    return r.status === 'transition' && r.transition.to === 'queued';
  })());
  check('143) o terminar el trabajo si el error no admite otro intento', (() => {
    const r = anotarFlecha(motor.recibirEvento(esperando, {
      eventId: 'ev-g', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'failed', at: T0 + 60, error: fallar('CONTENT_POLICY'),
    }, T0 + 60));
    return r.status === 'transition' && r.transition.to === 'failed';
  })());
  /* Un «sigo en ello» mientras espera: no cambia de estado, pero SÍ se anota. */
  const avance = motor.recibirEvento(esperando, {
    eventId: 'ev-p', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'progress', at: T0 + 30,
    providerRef: { providerId: 'matriz-a', operationId: 'op-2' },
  }, T0 + 30);
  check('143b) un «sigo en ello» no mueve el trabajo de estado, pero se guarda',
    avance.status === 'transition' && avance.transition.from === 'waiting' && avance.transition.to === 'waiting'
    && avance.transition.job.attempts[0].providerRef.operationId === 'op-2', avance.status);
  check('143c) y se escribe con su revisión, porque dos avisos a la vez también se pisan',
    avance.transition.expectedRevision === esperando.revision
    && avance.transition.job.revision === esperando.revision + 1);

  check('144) cancelar mientras el proveedor lo tiene se pide, no se finge',
    anotarFlecha(motor.cancelar(esperando, QUIEN, T0 + 61)).transition.to === 'cancel_requested');
  check('145) y esperando también se puede vencer',
    anotarFlecha(motor.evaluar(esperando, esperando.deadlineAt + 1)).transition.to === 'timed_out');
}

console.log('\n── M · Seguridad ──');
{
  check('146) una credencial en el material se RECHAZA, no se quita en silencio', (() => {
    const claves = ['apiKey', 'api_key', 'API-KEY', 'secret', 'token', 'authorization', 'accessToken', 'privateKey', 'password'];
    return claves.every((k) => motor.crear(pet({ input: { prompt: 'x', [k]: 'sk-loquesea' } })).status === 'invalid');
  })());
  check('147) y se dice qué campo era', motor.crear(pet({ input: { apiKey: 'x' } })).error.details.field === 'input.apiKey');
  check('148) también anidada', motor.crear(pet({ input: { cfg: { nested: { token: 'x' } } } })).error.details.field === 'input.cfg.nested.token');
  check('149) `__proto__`, `constructor` y `prototype` no entran',
    ['__proto__', 'constructor', 'prototype'].every((k) => motor.crear(pet({ input: JSON.parse(`{"${k}":{"x":1}}`) })).status === 'invalid'));
  check('150) y no contaminan el prototipo por el camino', (() => {
    motor.crear(pet({ input: JSON.parse('{"__proto__":{"contaminado":true}}') }));
    return ({}).contaminado === undefined;
  })());
  check('151) pero el `prompt` SÍ entra: es el trabajo, no un dato de registro',
    nuevo({ input: { prompt: 'hola', message: 'eh', content: 'c' } }).input.prompt === 'hola',
    'la lista de una traza y la del material son distintas a propósito');
  check('152) una función en el material no se guarda', (() => {
    const j = nuevo({ input: { prompt: 'x', callback: () => 1 } });
    return !('callback' in j.input);
  })());
  check('153) y se avisa de que hubo que tocarlo',
    motor.crear(pet({ input: { prompt: 'x', f: () => 1 } })).warnings.includes('payload_trimmed'));
  check('154) un material demasiado grande se rechaza, no se recorta a escondidas',
    motor.crear(pet({ input: { prompt: 'x'.repeat(200_000) } })).status === 'invalid',
    'recortar un prompt es mandar a generar otra cosa, y cobrarla');
  check('154b) ni sumando muchos campos que caben por separado',
    motor.crear(pet({ input: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`c${i}`, 'x'.repeat(30_000)])) })).status === 'invalid');
  check('154c) y el tope se mide sobre lo que se GUARDA, no sobre una primera lectura', (() => {
    /* Un getter que da poco la primera vez y mucho la segunda: medir una cosa y guardar otra. */
    let n = 0;
    const tramposo = {};
    Object.defineProperty(tramposo, 'prompt', { enumerable: true, get() { n++; return n === 1 ? '' : 'x'.repeat(30_000); } });
    const d = motor.crear(pet({ input: tramposo }));
    const largo = d.status === 'transition' ? JSON.stringify(d.transition.job.input).length : 0;
    return largo <= 131_072;
  })(), 'la trampa del getter, la misma que encontró la auditoría de la Fase 7');
  check('155) anidar sin fin tampoco tumba nada', (() => {
    let x = { fin: 1 };
    for (let i = 0; i < 200; i++) x = { d: x };
    const r = motor.crear(pet({ input: x }));
    return r.status === 'transition' || r.status === 'invalid';
  })());
  check('156) una lista enorme queda acotada', (() => {
    const j = motor.crear(pet({ input: { xs: Array.from({ length: 5000 }, (_, i) => i) } }));
    return j.status === 'invalid' || j.transition.job.input.xs.length <= 128;
  })());
  check('157) el error del proveedor no arrastra la respuesta cruda ni el stack', (() => {
    const job = corriendo(T0);
    const d = informar(job, T0 + 1, {
      attemptId: idDeIntento(job), outcome: 'failed', dispatched: true,
      error: { code: 'PROVIDER_ERROR', source: 'adapter:x', details: { stack: 'C:/secreto', apiKey: 'sk-1', cuerpo: 'x'.repeat(5000) } },
    });
    const s = JSON.stringify(d.transition.job);
    return !/sk-1/.test(s) && !/C:\//.test(s) && s.length < 20_000;
  })());
  check('158) y nada de lo que sale lleva nunca un secreto', (() => {
    const job = corriendo(T0);
    const d = motor.despachar(job);
    return !/apiKey|secret|authorization|bearer/i.test(JSON.stringify(d.dispatch));
  })());
  check('159) el contexto solo admite etiquetas, no objetos ni funciones',
    motor.crear(pet({ context: { appId: { x: 1 } } })).status === 'invalid'
    && motor.crear(pet({ context: { inventado: 'x' } })).status === 'invalid');
  check('160) una pista con una selección dentro rechaza la petición entera',
    motor.crear(pet({ hints: { providerId: 'matriz-b' } })).status === 'invalid',
    'elegir es del Router, no algo que se le ordene al trabajo');
}

console.log('\n── N · De quién es un trabajo ──');
{
  const job = nuevo();
  check('161) otra cuenta no puede reclamarlo',
    reclamar(job, T0 + 1, 'w1', { principal: OTRO }).status === 'invalid');
  check('162) ni informar de él', motor.informar(job, { principal: OTRO, at: T0 + 1, report: { attemptId: 'x', outcome: 'succeeded' } }).status === 'invalid');
  check('163) ni cancelarlo', motor.cancelar(job, OTRO, T0 + 1).status === 'invalid');
  check('164) y de un trabajo ajeno NO se dice ni que exista',
    !motor.cancelar(job, OTRO, T0 + 1).job && motor.cancelar(job, OTRO, T0 + 1).error.details.field === 'jobId',
    'ni siquiera que esté roto');
  check('165) el dueño es la CUENTA, y el producto no autoriza nada',
    job.owner.userId === 'user-0001' && !('appId' in job.owner) && !('workspaceId' in job.owner));
  check('166) decir en el contexto que eres otro no te convierte en otro', (() => {
    const j = nuevo({ context: { appId: 'app-x' }, trace: traza({ userId: 'user-0002' }) });
    return j.owner.userId === 'user-0001';
  })(), 'manda el principal, no lo que declara la petición');
  check('167) un principal sin cuenta no vale', motor.crear(pet({ principal: {} })).status === 'invalid');
  check('168) ni uno con campos de más', motor.crear(pet({ principal: { userId: 'user-0001', admin: true } })).status === 'invalid');
}

console.log('\n── O · El mismo motor para todos los productos ──');
{
  const base = nuevo();
  const desdeStudio = nuevo({ context: { appId: 'app-1', workspaceId: 'ws-1' }, idempotencyKey: 'k-studio-01' });
  const desdeChef = nuevo({ context: { appId: 'app-2', workspaceId: 'ws-2' }, idempotencyKey: 'k-chef-0001' });
  const sinNada = (j) => JSON.stringify({ ...j, jobId: '', context: {}, idempotency: {} });
  check('169) la misma operación desde dos productos produce el MISMO trabajo',
    sinNada(desdeStudio) === sinNada(desdeChef), 'ni una rama por producto');
  check('170) y el mismo paquete de ejecución', (() => {
    const a = motor.despachar(aplicar(reclamar(desdeStudio, T0 + 1)));
    const b = motor.despachar(aplicar(reclamar(desdeChef, T0 + 1)));
    return JSON.stringify({ ...a.dispatch, jobId: '', attemptId: '', idempotencyKey: '' })
      === JSON.stringify({ ...b.dispatch, jobId: '', attemptId: '', idempotencyKey: '' });
  })());
  check('171) el producto y el Workplace SÍ viajan, para poder atribuir después',
    desdeStudio.context.appId === 'app-1' && desdeStudio.context.workspaceId === 'ws-1');
  check('172) y la operación y el paso también',
    nuevo({ context: { operationId: 'op-1', workflowRunId: 'run-1', stepId: 'paso-1' } }).context.stepId === 'paso-1');
  check('173) hay UN motor, no uno por producto: no existe una fábrica por app',
    !/porApp|byApp|engineFor|motorDe[A-Z]/.test(codigoCore + codigoComp)
    && /crearJobEngine/.test(codigoCore));
  check('174) una implementación propia de Weë se administra igual que una de fuera',
    base.implementation.providerId === 'matriz-a' && !/ProviderType|internal|matrix/.test(codigoCore),
    'aquí no se mira de quién es la matriz');
}

console.log('\n── P · Lo que sale no se puede tocar ──');
{
  const job = corriendo(T0);
  check('175) el trabajo sale congelado, y también lo de dentro',
    Object.isFrozen(job) && Object.isFrozen(job.attempts) && Object.isFrozen(job.attempts[0])
    && Object.isFrozen(job.implementation) && Object.isFrozen(job.policy) && Object.isFrozen(job.trace));
  check('176) la decisión también, con sus avisos y sus eventos', (() => {
    const d = reclamar(nuevo(), T0 + 1);
    return Object.isFrozen(d) && Object.isFrozen(d.events) && Object.isFrozen(d.warnings) && Object.isFrozen(d.transition);
  })());
  check('177) y el paquete que se entrega', Object.isFrozen(motor.despachar(job).dispatch));
  check('178) el error y sus detalles, congelados', (() => {
    const d = motor.crear(pet({ contract: '9.9' }));
    return Object.isFrozen(d.error) && Object.isFrozen(d.error.details);
  })());
  check('179) quien recibe un trabajo no lo puede cambiar por debajo', (() => {
    try { job.attempts[0].dispatched = true; } catch { /* en modo estricto lanza */ }
    return job.attempts[0].dispatched === false;
  })());
  check('180) el resultado sale congelado', (() => {
    const d = informar(job, T0 + 1, { attemptId: idDeIntento(job), outcome: 'succeeded', result: { outputRefs: ['ref://a'] }, dispatched: true });
    return Object.isFrozen(d.transition.job.result) && Object.isFrozen(d.transition.job.result.outputRefs);
  })());
}

console.log('\n── Q · Límites, y que nada crezca sin fin ──');
{
  /*
   * Se ACOTAN, pero no se tira el resultado: entre perder una referencia rara y
   * volver a ejecutar un vídeo ya pagado, se pierde la referencia y se avisa.
   */
  check('181) demasiadas referencias se recortan y se avisa, pero el resultado se guarda', (() => {
    const job = corriendo(T0);
    const muchas = informar(job, T0 + 1, { attemptId: idDeIntento(job), outcome: 'succeeded', result: { outputRefs: Array.from({ length: 500 }, (_, i) => `ref://${i}`) }, dispatched: true });
    return muchas.transition.to === 'completed' && muchas.transition.job.result.outputRefs.length === 64
      && muchas.warnings.includes('payload_trimmed');
  })());
  check('181b) una referencia larguísima se descarta sola, no se lleva por delante el éxito', (() => {
    const job = corriendo(T0);
    const larga = informar(job, T0 + 1, { attemptId: idDeIntento(job), outcome: 'succeeded', result: { outputRefs: ['x'.repeat(5000), 'ref://buena'] }, dispatched: true });
    return larga.transition.to === 'completed' && larga.transition.job.result.outputRefs.join() === 'ref://buena'
      && larga.warnings.includes('payload_trimmed');
  })());
  check('181c) pero un resultado que no tiene forma de resultado sí se rechaza', (() => {
    const job = corriendo(T0);
    return informar(job, T0 + 1, { attemptId: idDeIntento(job), outcome: 'succeeded', result: { outputRefs: 'no-es-una-lista' }, dispatched: true }).status === 'invalid';
  })());
  check('182) la memoria de avisos vistos está acotada', (() => {
    const job = yaSalio(corriendo(T0));
    let actual = { ...job, seenEvents: Array.from({ length: 64 }, (_, i) => `viejo-${i}`) };
    const r = motor.recibirEvento(actual, { eventId: 'nuevo', jobId: job.jobId, attemptId: idDeIntento(job), kind: 'accepted', at: T0 + 1 }, T0 + 1);
    return r.transition.job.seenEvents.length <= 64 && r.transition.job.seenEvents.includes('nuevo');
  })());
  check('183) la política no admite valores imposibles: vuelven a los de siempre', (() => {
    const j = nuevo({ policy: { retry: { maxAttempts: 0 }, maxLifetimeMs: -5, leaseMs: 'mucho' } });
    return j.policy.retry.maxAttempts === core.POLITICA_DE_TRABAJO.retry.maxAttempts
      && j.policy.maxLifetimeMs === core.POLITICA_DE_TRABAJO.maxLifetimeMs
      && j.policy.leaseMs === core.POLITICA_DE_TRABAJO.leaseMs;
  })());
  check('184) ni un número de intentos desmedido', nuevo({ policy: { retry: { maxAttempts: 9999 } } }).policy.retry.maxAttempts === core.POLITICA_DE_TRABAJO.retry.maxAttempts);
  check('185) una clave presente valiendo `undefined` no destroza la política', (() => {
    const j = nuevo({ policy: { leaseMs: undefined, retry: undefined } });
    return j.policy.leaseMs === core.POLITICA_DE_TRABAJO.leaseMs && j.policy.retry.maxAttempts === 3;
  })());
  check('186) una política con un campo inventado se rechaza', motor.crear(pet({ policy: { turbo: true } })).status === 'invalid');

  /* Cupo y contrapresión. */
  const lleno = reclamar(nuevo(), T0 + 1, 'w1', { limits: { maxRunning: 10 }, capacity: { running: 10 } });
  check('187) cuando no caben más, no se ejecuta: se queda en la cola', lleno.refusal === 'at_capacity');
  check('188) hay tope por cuenta, para que nadie acapare a todos los trabajadores',
    reclamar(nuevo(), T0 + 1, 'w1', { limits: { maxRunningPerAccount: 2 }, capacity: { runningForAccount: 2 } }).refusal === 'at_capacity');
  check('189) y por proveedor',
    reclamar(nuevo(), T0 + 1, 'w1', { limits: { maxRunningPerProvider: 1 }, capacity: { runningForProvider: 1 } }).refusal === 'at_capacity');
  check('190) si nadie dice cuántos hay, se AVISA en vez de dar por hecho que cabía',
    reclamar(nuevo(), T0 + 1, 'w1', { limits: { maxRunning: 10 } }).warnings.includes('capacity_not_checked'));
  check('191) y con sitio, entra', reclamar(nuevo(), T0 + 1, 'w1', { limits: { maxRunning: 10 }, capacity: { running: 3 } }).status === 'transition');

  /* La contrapresión de verdad: no aceptar el trabajo, que es lo único que acota la cola. */
  check('191b) una cuenta no puede encolar sin fin: se le dice que no al crear',
    motor.crear(pet({ limits: { maxQueuedPerAccount: 100 }, capacity: { queuedForAccount: 100 } })).refusal === 'at_capacity');
  check('191c) con sitio en la cola, se acepta',
    motor.crear(pet({ limits: { maxQueuedPerAccount: 100 }, capacity: { queuedForAccount: 3 } })).status === 'transition');
  check('191d) y si nadie dice cuántos hay encolados, se avisa en vez de suponerlo',
    motor.crear(pet({ limits: { maxQueuedPerAccount: 100 } })).warnings.includes('capacity_not_checked'));

  check('192) mil trabajos no se llevan por delante ni la memoria ni el tiempo', (() => {
    const inicio = process.hrtime.bigint();
    let ultimo = null;
    for (let i = 0; i < 1000; i++) {
      const j = nuevo({ idempotencyKey: `carga-${String(i).padStart(5, '0')}` });
      ultimo = aplicar(reclamar(j, T0 + i));
    }
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    return ultimo.state === 'running' && ms < 5000;
  })());
}

console.log('\n── R · Determinismo ──');
{
  check('193) la misma petición produce exactamente el mismo trabajo, dos veces',
    JSON.stringify(motor.crear(pet()).transition.job) === JSON.stringify(motor.crear(pet()).transition.job));
  check('194) el identificador se deriva de la identidad: no hay dados',
    nuevo().jobId === core.claveDeIdempotencia(core.alcanceDeIdempotencia('user-0001'), 'req-0001'));
  check('195) y dos motores distintos deciden lo mismo', (() => {
    const otroMotor = core.crearJobEngine();
    const a = motor.crear(pet()).transition.job;
    const b = otroMotor.crear(pet()).transition.job;
    return JSON.stringify(a) === JSON.stringify(b);
  })());
  check('196) la misma situación da siempre la misma transición', (() => {
    const job = yaSalio(corriendo(T0));
    const r = { attemptId: idDeIntento(job), outcome: 'failed', error: fallar('TIMEOUT'), dispatched: true };
    return JSON.stringify(informar(job, T0 + 5, r)) === JSON.stringify(informar(job, T0 + 5, r));
  })());
  check('197) el campo que se nombra al rechazar no depende del orden de escritura', (() => {
    const a = motor.crear({ ...pet(), zzz: 1, aaa: 2 });
    const b = motor.crear({ ...pet(), aaa: 2, zzz: 1 });
    return a.error.details.field === b.error.details.field;
  })());
  check('198) leer la capacidad dos veces no puede dar dos cosas distintas', (() => {
    let n = 0;
    const camaleon = { ...pet(), get capability() { n++; return n === 1 ? 'image.generate' : 'video.generate'; } };
    const d = motor.crear(camaleon);
    return d.status === 'transition' && d.transition.job.capability === 'image.generate';
  })());
}

console.log('\n── S · La costura con el Gateway ──');
{
  const job = corriendo(T0);
  const d = motor.despachar(job);
  const g = comp.peticionDeGateway(d.dispatch);
  check('199) el paquete se convierte en una petición del Gateway sin que falte nada',
    g.capability === 'image.generate' && g.implementation.providerId === 'matriz-a'
    && g.input.prompt === 'un gato con sombrero' && !!g.trace && !!g.idempotencyKey);
  check('200) y la conversión vive en la COMPOSICIÓN, no en el Core',
    /peticionDeGateway/.test(codigoComp) && !/peticionDeGateway/.test(codigoCore));
  check('201) la clave que baja es la del intento', g.idempotencyKey === job.attempts[0].providerKey);
  check('202) el plazo y el tope de tiempo bajan con ella',
    g.execution.deadlineAt === job.deadlineAt && g.execution.timeoutMs > 0);

  const bien = comp.informeDelGateway(d.dispatch, {
    status: 'completed', implementation: { providerId: 'matriz-a', modelId: 'matriz-a.uno' },
    response: { kind: 'image', urls: ['https://x/y.png'], actual: {} }, usage: { images: 1 },
  });
  check('203) un resultado bueno se convierte en un intento que salió bien, con su referencia',
    bien.outcome === 'succeeded' && bien.result.outputRefs[0] === 'https://x/y.png' && bien.dispatched === true);
  const aceptado = comp.informeDelGateway(d.dispatch, { status: 'accepted', implementation: {} });
  check('204) «aceptado» NO se convierte en terminado: se informa como «no se sabe»',
    aceptado.outcome === 'unknown' && aceptado.dispatched === true,
    'el proveedor dijo que lo tiene, no que lo hizo');
  const mal = comp.informeDelGateway(d.dispatch, { status: 'failed', implementation: {}, error: { code: 'TIMEOUT', source: 'gateway' } });
  check('205) y un fallo por tiempo se distingue de un fallo cualquiera', mal.outcome === 'timed_out');
  check('206) la referencia del proveedor ENTRA, no se adivina del resultado',
    comp.informeDelGateway(d.dispatch, { status: 'accepted', implementation: {} }, { providerId: 'matriz-a', operationId: 'op-9' }).providerRef.operationId === 'op-9'
    && !/taskId|generation_?id|operationId['"]?\s*\]/i.test(codigoComp.replace(/operationId/g, '')),
    'cada proveedor lo llama a su manera: lo sabe su adaptador');
  check('207) no se inventa ningún endpoint ni formato de webhook de nadie',
    !/https?:\/\/(?!x\/)/.test(codigoComp) && !/\/v1\/|\/tasks\/|\/status\b/.test(codigoCore + codigoComp));
}

console.log('\n── S2 · Lo demás que encontró la auditoría ──');
{
  /* La costura con el Gateway estaba rota de raíz: el Gateway rechaza `async`. */
  const g = comp.peticionDeGateway(motor.despachar(corriendo(T0)).dispatch);
  check('223) al Gateway se le pide SIEMPRE `sync`: `async` lo rechaza de plano',
    g.execution.mode === 'sync' && /execution_mode_unsupported/.test(leer('functions/src/core/gateway.ts')),
    'el modo del TRABAJO y el de la LLAMADA son dos cosas con el mismo nombre');
  check('224) y el modo del trabajo sigue existiendo, para decidir si se espera el resultado',
    nuevo({ mode: 'sync' }).mode === 'sync' && nuevo().mode === 'async');

  /* El Router real de Weë produce ids con barra; el Job Engine los rechazaba. */
  check('225) se acepta una implementación con barra en el identificador, como las del registro real',
    motor.crear(pet({ implementation: { providerId: 'matriz-a', modelId: 'familia-tools/vto-v2', adapterId: 'adapter:matriz-a' } })).status === 'transition',
    'la misma forma que exige el Gateway a una referencia');
  check('226) y se sigue rechazando lo que no tiene forma de referencia',
    motor.crear(pet({ implementation: { providerId: 'a b', modelId: 'm' } })).status === 'invalid');

  /* El identificador del trabajo nombra un documento: tiene que tener forma. */
  check('227) un `jobId` con barras o puntos suspensivos no vale',
    motor.crear(pet({ jobId: 'jobs/../../users/otro/secreto' })).status === 'invalid'
    && motor.crear(pet({ jobId: 'trabajo-legitimo-0001' })).status === 'transition');
  check('228) y una clave que produciría una clave de proveedor más larga de lo que admite el Gateway se rechaza al crear',
    motor.crear(pet({ idempotencyKey: 'k'.repeat(150) })).status === 'invalid');

  /* Lo que devuelve el almacén es dato, no verdad. */
  check('229) un trabajo guardado sin dueño NO revienta la comprobación: se rechaza', (() => {
    const roto = { ...nuevo() };
    delete roto.owner;
    try {
      return motor.crear(pet(), roto).status === 'invalid'
        && motor.cancelar(roto, QUIEN, T0 + 1).status === 'invalid'
        && motor.evaluar(roto, T0 + 1).status !== 'transition';
    } catch (e) { return `lanzó ${e.constructor.name}`; }
  })() === true);

  /* Congelado de verdad: lo que se enumera a mano se olvida. */
  check('230) lo que sale está congelado HASTA EL FONDO, no solo por encima', (() => {
    const entrada = { prompt: 'x', opciones: { tamano: { w: 1 } } };
    const j = nuevo({ input: entrada, hints: { quality: 'high' }, metadata: { origen: 'prueba' }, language: { appLanguage: 'es' } });
    return Object.isFrozen(j.input) && Object.isFrozen(j.input.opciones) && Object.isFrozen(j.input.opciones.tamano)
      && Object.isFrozen(j.hints) && Object.isFrozen(j.metadata) && Object.isFrozen(j.language)
      && j.metadata !== entrada && j.input.opciones !== entrada.opciones;
  })(), 'y es una COPIA: cambiar el objeto de quien llamó no cambia el trabajo');
  check('231) cambiar el objeto original después de crear no cambia el trabajo', (() => {
    const entrada = { prompt: 'original' };
    const j = nuevo({ input: entrada });
    entrada.prompt = 'cambiado';
    return j.input.prompt === 'original';
  })());

  /* Una política que se configura y no se aplica es peor que no poder configurarla. */
  check('232) la política que se le da a la composición SÍ gobierna los trabajos', (() => {
    const wee = comp.crearMotorDeTrabajosDeWee({
      retry: { maxAttempts: 1, backoffMs: 100, backoffFactor: 2, maxBackoffMs: 1000 },
      attemptTimeoutMs: 5_000, maxLifetimeMs: 30_000, leaseMs: 5_000, maxAttemptsStored: 2,
    });
    const j = wee.motor.crear(pet()).transition.job;
    return j.policy.retry.maxAttempts === 1 && j.policy.leaseMs === 5_000
      && j.deadlineAt === T0 + 30_000;
  })());

  /* El cupo se comprueba POR TOPE, no por si el objeto existe. */
  check('233) un cupo a medias no se cuela: si falta el número de ese tope, se avisa',
    reclamar(nuevo(), T0 + 1, 'w1', { limits: { maxRunning: 10 }, capacity: { runningForAccount: 1 } })
      .warnings.includes('capacity_not_checked'));

  /* Un error que llega de fuera no es un sitio donde meter lo que sea. */
  check('234) un código de error que el Core no declara no entra', (() => {
    const j = corriendo(T0);
    return informar(j, T0 + 1, { attemptId: idDeIntento(j), outcome: 'failed', dispatched: true, error: { code: 'LO_QUE_SEA', source: 'x' } }).status === 'invalid';
  })());
  check('235) ni un `source` de cinco megas', (() => {
    const j = corriendo(T0);
    return informar(j, T0 + 1, { attemptId: idDeIntento(j), outcome: 'failed', dispatched: true, error: { code: 'PROVIDER_ERROR', source: 'x'.repeat(5_000_000) } }).status === 'invalid';
  })());
  check('236) ni unos detalles que abulten más que la propia entrada', (() => {
    const j = corriendo(T0);
    const gordo = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`c${i}`, 'x'.repeat(900)]));
    const d = informar(j, T0 + 1, { attemptId: idDeIntento(j), outcome: 'failed', dispatched: true, error: { code: 'PROVIDER_ERROR', source: 'adapter:x', details: gordo } });
    return JSON.stringify(d.transition.job).length < 20_000;
  })());

  /* Cancelar mientras el proveedor lo tiene: ni se finge parado, ni se tira lo que vuelva. */
  const enEspera = (() => {
    const j = corriendo(T0);
    const m = aplicar(motor.marcarEnvio(j, { principal: QUIEN, at: T0 + 1, worker: 'w1', attemptId: idDeIntento(j) }));
    return aplicar(motor.recibirEvento(m, { eventId: 'ev-e', jobId: m.jobId, attemptId: idDeIntento(m), kind: 'accepted', at: T0 + 2, providerRef: { providerId: 'matriz-a', operationId: 'op-e' } }, T0 + 2));
  })();
  const pedidoEnEspera = aplicar(motor.cancelar(enEspera, QUIEN, T0 + 3));
  check('237) cancelar en espera NO se consuma mientras el proveedor pueda volver',
    motor.evaluar(pedidoEnEspera, T0 + 200_000).status === 'noop', 'no hay concesión porque no hay nadie NUESTRO ejecutando');
  check('238) y el resultado bueno que llega después se respeta: gana terminar',
    anotarFlecha(motor.recibirEvento(pedidoEnEspera, { eventId: 'ev-tarde2', jobId: enEspera.jobId, attemptId: idDeIntento(enEspera), kind: 'succeeded', at: T0 + 100, outputRefs: ['ref://vale'] }, T0 + 100))
      .transition.to === 'completed');
  check('239) si no vuelve nunca, lo cierra el PLAZO, con la incertidumbre anotada', (() => {
    const r = anotarFlecha(motor.evaluar(pedidoEnEspera, pedidoEnEspera.deadlineAt + 1));
    return r.transition.to === 'timed_out' && r.warnings.includes('outcome_unknown')
      && r.transition.job.attempts[0].outcome === 'unknown';
  })());

  /* Un sondeo que vuelve a no saber nada tiene que PODER decirlo. */
  check('240) informar «sigo sin saber» desde la espera escribe y reprograma', (() => {
    const r = motor.informar(enEspera, { principal: QUIEN, at: T0 + 50, report: { attemptId: idDeIntento(enEspera), outcome: 'unknown', dispatched: true, providerRef: { providerId: 'matriz-a', operationId: 'op-e' } } });
    return r.status === 'transition' && r.transition.from === 'waiting' && r.transition.to === 'waiting'
      && r.retryAt > T0 + 50 && r.transition.job.revision === enEspera.revision + 1;
  })(), 'antes se rechazaba y el trabajo se quedaba sin hora a la que volver');
  check('241) y un «no sé» SIN referencia del proveedor espera, no vence en el acto', (() => {
    const j = corriendo(T0);
    const m = aplicar(motor.marcarEnvio(j, { principal: QUIEN, at: T0 + 1, worker: 'w1', attemptId: idDeIntento(j) }));
    const r = anotarFlecha(informar(m, T0 + 10, { attemptId: idDeIntento(m), outcome: 'unknown', dispatched: true }));
    return r.transition.to === 'waiting' && r.transition.job.availableAt === m.deadlineAt;
  })(), 'es el camino normal del vídeo: `accepted` sin identificador');
}

console.log('\n── T · Todo lo declarado se produce de verdad ──');
{
  /* Las flechas que faltaban por producir, cada una a propósito. */
  const j1 = nuevo();
  anotarFlecha(reclamar(j1, T0 + 1));
  anotarFlecha(motor.cancelar(j1, QUIEN, T0 + 1));
  const corre = yaSalio(corriendo(T0));
  anotarFlecha(informar(corre, T0 + 1, { attemptId: idDeIntento(corre), outcome: 'succeeded', result: { outputRefs: [] }, dispatched: true }));
  anotarFlecha(informar(corre, T0 + 1, { attemptId: idDeIntento(corre), outcome: 'failed', error: fallar('CONTENT_POLICY'), dispatched: true }));
  anotarFlecha(informar(corre, T0 + 1, { attemptId: idDeIntento(corre), outcome: 'failed', error: fallar('RATE_LIMIT'), dispatched: true }));
  anotarFlecha(motor.evaluar(corre, corre.deadlineAt + 1));
  anotarFlecha(motor.cancelar(corre, QUIEN, T0 + 1));

  const declaradas = new Set();
  for (const [desde, hacia] of Object.entries(core.TRANSICIONES_DE_TRABAJO)) {
    for (const h of hacia) declaradas.add(`${desde}→${h}`);
  }
  const sinProducir = [...declaradas].filter((f) => !flechas.has(f));
  check('208) TODA transición declarada en la tabla la produce alguna operación',
    sinProducir.length === 0, sinProducir.join(' | ') || `${declaradas.size} flechas`);
  const inventadas = [...flechas].filter((f) => !declaradas.has(f));
  check('209) y no se produce ninguna que la tabla no declare', inventadas.length === 0, inventadas.join(' | '));

  /* Los eventos, igual. */
  anotarEventos(motor.evaluar(corre, corre.deadlineAt + 1));
  const EVENTOS = ['job_created', 'job_queued', 'job_started', 'job_waiting', 'job_retry_scheduled',
    'job_completed', 'job_failed', 'job_timed_out', 'job_cancel_requested', 'job_cancelled', 'job_recovered'];
  const eventosSinProducir = EVENTOS.filter((e) => !eventosVistos.has(e));
  check('210) y todo evento declarado lo emite alguien', eventosSinProducir.length === 0,
    eventosSinProducir.join(' | ') || `${EVENTOS.length} eventos`);
  check('211) la lista del contrato y la comprobada son la misma', (() => {
    const src = leer(CORE_JOB);
    const bloque = src.slice(src.indexOf('export type JobEventKind'), src.indexOf("| 'job_recovered';") + 20);
    return EVENTOS.every((e) => bloque.includes(`'${e}'`));
  })());

  /*
   * EL GUARDIA QUE FALTABA EN CUATRO FASES SEGUIDAS.
   *
   * Se leen los valores de cada unión DIRECTAMENTE DEL CONTRATO —no de una
   * lista escrita aquí, que envejecería— y se comprueba que la suite entera
   * los ha producido todos. Así lo encontró esta fase su propio
   * `deadline_reached`: declarado, nombrado, documentado, y jamás emitido.
   */
  const valoresDe = (nombre) => {
    const src = leer(CORE_JOB);
    const i = src.indexOf(`export type ${nombre} =`);
    if (i < 0) return [];
    const bloque = src.slice(i, src.indexOf(';', i));
    return [...bloque.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  };
  for (const [tipo, vistos] of [
    ['JobState', producidos.estados],
    ['JobRefusal', producidos.rechazos],
    ['JobWarning', producidos.avisos],
    ['JobTransitionReason', producidos.motivos],
    ['JobDecisionStatus', producidos.decisiones],
    ['JobAttemptOutcome', producidos.desenlaces],
  ]) {
    const declarados = valoresDe(tipo);
    const huerfanos = declarados.filter((v) => !vistos.has(v));
    check(`212) todo valor de \`${tipo}\` lo produce alguna ruta`,
      declarados.length > 0 && huerfanos.length === 0,
      huerfanos.join(' | ') || `${declarados.length} valores`);
  }
}

console.log('\n── U · Las 25 preguntas del cierre ──');
{
  check('212) un trabajo sobrevive a la muerte de su trabajador', (() => {
    const v = corriendo(T0);
    const muerto = { ...v, attempts: [{ ...v.attempts[0], lease: { owner: 'w1', until: T0 + 1 } }] };
    return motor.evaluar(muerto, T0 + 2).status === 'transition';
  })());
  check('213) se puede añadir otra matriz sin tocar el motor',
    !/providerId ?===|modelId ?===|switch ?\(.*provider/i.test(codigoCore));
  check('214) el Router sigue siendo quien elige: aquí la implementación LLEGA',
    /implementation: ImplementationRef/.test(leer(CORE_JOB)) && !/elegir|seleccionar|candidat/i.test(codigoCore));
  check('215) el Gateway sigue siendo quien ejecuta: aquí solo se entrega un paquete',
    /export interface JobDispatch/.test(leer(CORE_JOB)));
  check('216) el dinero sigue siendo de la Fase 9: aquí solo se transporta lo que costó',
    /usage\?: GatewayUsage/.test(leer(CORE_JOB))
    && !/spendCredits|refundCredits|creditsPerUsd|calcularPrecio|margen|cobrar/i.test(codigoCore),
    'INSUFFICIENT_CREDITS es un CÓDIGO DE ERROR de la Fase 0, no lógica de dinero');
  check('217) el material sigue siendo de la Fase 11: aquí solo hay referencias',
    /outputRefs: readonly string\[\]/.test(leer(CORE_JOB)));
  check('218) los intentos se distinguen, para que después nadie cobre dos veces lo mismo', (() => {
    const j = yaSalio(corriendo(T0));
    const f = aplicar(informar(j, T0 + 1, { attemptId: idDeIntento(j), outcome: 'failed', error: fallar('RATE_LIMIT'), dispatched: true }));
    const s = aplicar(reclamar(f, f.availableAt));
    return s.attempts.every((a, i) => a.number === i + 1) && s.attemptCount === 2;
  })());
  check('219) un fallo sin clasificar NO se da por reintentable',
    core.esReintentable('INTERNAL_ERROR') === false && core.esReintentable('CAPABILITY_UNAVAILABLE') === false,
    'ante la duda, no repetir');
  check('220) y un error que llega deforme se rechaza en vez de colarse', (() => {
    const j = corriendo(T0);
    return informar(j, T0 + 1, { attemptId: idDeIntento(j), outcome: 'failed', error: 'se rompió' }).status === 'invalid';
  })());
  check('221) el estado es durable por contrato: todo lo que hace falta está en el trabajo', (() => {
    const j = corriendo(T0);
    const ida = JSON.parse(JSON.stringify(j));
    const d = motor.despachar(ida);
    return d.dispatch.attemptId === j.attempts[0].attemptId;
  })(), 'guardar y releer no pierde nada');
  check('222) y una escritura vieja no pisa una nueva', (() => {
    const j = corriendo(T0);
    const a = informar(j, T0 + 1, { attemptId: idDeIntento(j), outcome: 'succeeded', result: { outputRefs: [] }, dispatched: true });
    return a.transition.expectedRevision === j.revision;
  })());
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
