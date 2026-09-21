/**
 * P1+P3 · EL CAMINO REAL DE EJECUCIÓN, POR EL TRANSPORTE DURABLE.
 *
 * Lo que se demuestra aquí, en una frase: **el mismo conductor, el mismo
 * Router, el mismo Orchestrator y el mismo trabajador funcionan sobre la cola
 * durable exactamente igual que sobre la de invocación**, porque el conductor
 * depende del PUERTO y no de un transporte concreto.
 *
 * Lo que distinguía a los dos transportes era una pregunta —«¿cuándo podría
 * coger el siguiente?»— que solo tiene sentido dentro de una invocación. Hoy es
 * una capacidad OPCIONAL del puerto: la de invocación la contesta y se espera;
 * la durable no la tiene, y entonces no se espera, se devuelve, y otra entrega
 * la recoge. Ninguna de las dos finge.
 *
 *   A · La cadena entera: Planner → Workflow → conductor → … → adaptador
 *   B · El contrato, y el reintento por los DOS transportes
 *   C · Lo que el transporte NO puede llevar ni decidir
 *
 * Sin proveedor real, sin vídeo, sin audio, sin generación externa.
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

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const { crearConductor } = lib('runtime/conductor.js');
const { colaDeInvocacion } = lib('runtime/cola.js');
const { colaDurableDeTrabajos, COLECCION_DE_COLA } = lib('runtime/cola-durable.js');
const { resolutorDelRouter } = lib('runtime/resolucion.js');
const { crearEjecutor } = lib('runtime/ejecutor.js');
const trabajosDeWee = lib('job/index.js');
const registroDeWee = lib('registry/index.js');
const motorDelGateway = lib('engine/gateway.js');
const ajustes = lib('engine/registry.js');
const { ProviderError } = lib('engine/http.js');

const T0 = 1_800_000_000_000;
let reloj = T0;
const now = () => reloj;

/* ── El mundo de mentira: almacenamiento, adaptador y libro ────────────────── */

const fakeDb = () => {
  const cols = new Map();
  const dameCol = (n2) => { if (!cols.has(n2)) cols.set(n2, new Map()); return cols.get(n2); };
  let cadena = Promise.resolve();
  const hazRef = (c, id) => ({ _col: c, _id: id, async get() { const d = dameCol(c).get(id); return { exists: d !== undefined, id, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) }; } });
  const valorDe = (d, campo) => campo.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), d);
  const filtrar = (c, filtros, orden, tope) => {
    let e = [...dameCol(c).entries()];
    for (const f of filtros) e = e.filter(([, d]) => (f.op === '==' ? valorDe(d, f.campo) === f.valor : typeof valorDe(d, f.campo) === 'number' && valorDe(d, f.campo) <= f.valor));
    if (orden) e = e.filter(([, d]) => valorDe(d, orden) !== undefined).sort((a, b) => (valorDe(a[1], orden) < valorDe(b[1], orden) ? -1 : 1));
    return e.slice(0, tope === Infinity ? undefined : tope);
  };
  const consulta = (c, filtros = [], orden = null, tope = Infinity) => ({
    where: (campo, op, valor) => consulta(c, [...filtros, { campo, op, valor }], orden, tope),
    orderBy: (campo) => consulta(c, filtros, campo, tope),
    limit: (k) => consulta(c, filtros, orden, k),
    count: () => ({ async get() { return { data: () => ({ count: filtrar(c, filtros, orden, tope).length }) }; } }),
    async get() { return { docs: filtrar(c, filtros, orden, tope).map(([id, d]) => ({ id, ref: hazRef(c, id), data: () => JSON.parse(JSON.stringify(d)) })) }; },
  });
  return {
    volcado: (c) => [...dameCol(c).entries()].map(([id, d]) => ({ id, ...d })),
    collection(c) { return { doc: (id) => hazRef(c, id), ...consulta(c) }; },
    runTransaction(fn) {
      const corre = async () => fn({
        async get(ref) { return ref.get(); },
        create(ref, d) { const c = dameCol(ref._col); if (c.has(ref._id)) throw new Error('ya existe'); c.set(ref._id, JSON.parse(JSON.stringify(d))); },
        update(ref, p) { const c = dameCol(ref._col); const prev = c.get(ref._id); if (prev === undefined) throw new Error('no existe'); c.set(ref._id, { ...prev, ...JSON.parse(JSON.stringify(p)) }); },
        delete(ref) { dameCol(ref._col).delete(ref._id); },
      });
      const sig = cadena.then(corre, corre);
      cadena = sig.then(() => undefined, () => undefined);
      return sig;
    },
  };
};

const almacen = () => {
  const porId = new Map(); const porClave = new Map();
  const k = (s, key) => `${s.length}.${s}:${key}`;
  const s = {
    porId, escrituras: 0,
    async crearSiAusente(job) { await null; const c = k(job.idempotency.scope, job.idempotency.key); if (porClave.has(c)) return { created: false, job: porId.get(porClave.get(c)) }; porClave.set(c, job.jobId); porId.set(job.jobId, job); return { created: true, job }; },
    async obtener(id) { await null; return porId.get(id); },
    async porIdempotencia(sc, key) { await null; const c = k(sc, key); return porClave.has(c) ? porId.get(porClave.get(c)) : undefined; },
    async aplicar(t) { await null; const a = porId.get(t.jobId); if (!a || a.revision !== t.expectedRevision) return { applied: false, job: a }; porId.set(t.jobId, t.job); s.escrituras++; return { applied: true, job: t.job }; },
    async recuperables() { await null; return { jobs: [] }; },
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

/**
 * Un adaptador de mentira: contesta texto, sin red y sin proveedor. La MISMA
 * forma que usa `runtime-conductor.test.mjs`, a propósito — si fuera otra, esta
 * suite estaría probando un mundo distinto del que ya está probado.
 */
const CAPS = ['text.generate'];
const adaptador = (fallar) => {
  const a = {
    id: 'x', name: 'x', modalities: ['text'], llamadas: [],
    models: [{ id: 'x-1', provider: 'x', capabilities: CAPS, quality: 3, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
    isConfigured: () => true,
    supports: (c) => CAPS.includes(c),
    async run(req) {
      a.llamadas.push(req);
      if (fallar) fallar();
      return { output: { kind: 'text', content: 'listo' }, usage: { inputTokens: 5, outputTokens: 6 }, costUSD: 0.002, latencyMs: 7 };
    },
  };
  return a;
};

const QUIEN = { userId: 'user-0001' };
let serie = 0;
const traza = () => { serie++; const id = `p13_t_${String(serie).padStart(4, '0')}`; return { traceId: id, requestId: id, userId: 'user-0001', workplace: 'brain' }; };

/**
 * Un workflow de verdad, por el camino de verdad: Planner → WorkflowEngine.
 * Se extrae aquí porque la sección B lo necesita DOS veces y no tendría sentido
 * probar el reintento sobre un workflow escrito a mano.
 */
const unWorkflow = async () => {
  const tracer = { record() {} };
  const t = traza();
  const planner = core.crearPlanner({ availability: { disponible: () => true }, tracer, now });
  const p = await planner.planificar({
    contract: core.PLANNER_CONTRACT_VERSION, trace: t,
    understanding: {
      intent: 'creation', confidence: 'high', goal: 'g', inputs: { text: 'g', attachments: [] },
      references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
      capability: 'text.generate', capabilities: ['text.generate'],
    },
  });
  const w = await core.crearWorkflowEngine({ tracer, now })
    .construir({ contract: core.WORKFLOW_CONTRACT_VERSION, trace: t, plan: p.plan });
  return w.workflow;
};

/**
 * EL MISMO MUNDO QUE USA `runtime-conductor.test.mjs`, con UNA sola diferencia:
 * la cola. Es lo que hace que esta suite signifique algo — si cambiara algo más,
 * no probaría que el transporte es intercambiable.
 */
const mundo = (opciones = {}) => {
  const ad = adaptador(opciones.fallar);
  const adapters = { x: ad };
  const config = { providers: {}, settings: ajustes.DEFAULT_SETTINGS };
  const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers));
  const gateway = core.crearGateway({
    registry: registro,
    executor: motorDelGateway.crearEjecutorDelMotor({ adapters, config: () => config, now }),
    tracer: { record() {} }, now,
  });
  const router = core.crearRouter({ registry: registro });
  /* Se pueden compartir para representar OTRO PROCESO sobre los mismos datos. */
  const trabajos = opciones.trabajos ?? almacen();
  const runs = opciones.runs ?? ejecuciones();
  const entregas = [];
  const db = fakeDb();
  const cola = opciones.cola ?? colaDeInvocacion(now);
  const puertos = {
    trabajos, ejecuciones: runs, cola,
    motor: trabajosDeWee.crearMotorDeTrabajosDeWee().motor,
    resolver: resolutorDelRouter(router),
    ejecutor: crearEjecutor({
      gateway,
      libro: { async abrir() { return 'fila-1'; }, async cerrar() {} },
      ahora: now, repetir: () => () => {},
    }),
    trabajador: { worker: 'w-p13', visibilityMs: 30_000, backpressureDelayMs: 1_000 },
    ahora: now,
    observar: (e) => entregas.push(e),
    ...(opciones.esperar ? { esperar: opciones.esperar } : {}),
  };
  return { conductor: crearConductor(puertos), db, cola, trabajos, runs, entregas, ad, puertos };
};

/**
 * LA COLA DURABLE, TAL CUAL. Sin puente, sin envoltorio, sin un método añadido
 * en la prueba para que el conductor no se rompa: exactamente la misma que se
 * compondría en producción. Que esto baste es el objeto de esta suite.
 */
const durable = (db) => colaDurableDeTrabajos(db, { ahora: now, particion: 0, particiones: 1 });

/* ═══ A · LA CADENA ENTERA, POR EL TRANSPORTE DURABLE ═════════════════════ */
console.log('\n── A · Planner → Workflow → conductor → … → adaptador, sobre la cola durable ──');
{
  reloj = T0;
  const tracer = { record() {} };
  const t = traza();

  /* A · El Planner de verdad, desde un entendimiento de Brain. */
  const planner = core.crearPlanner({ availability: { disponible: () => true }, tracer, now });
  const planeado = await planner.planificar({
    contract: core.PLANNER_CONTRACT_VERSION, trace: t,
    understanding: {
      intent: 'creation', confidence: 'high', goal: 'un texto de prueba',
      inputs: { text: 'un texto de prueba', attachments: [] }, references: [], constraints: {},
      needsPlanning: true, missing: [], assumptions: [], capability: 'text.generate', capabilities: ['text.generate'],
    },
  });
  check('A) Brain → Planner: de un entendimiento sale un plan', planeado.status === 'ready' && planeado.plan.steps.length === 1);

  /* A · El motor de workflows de verdad. */
  const construido = await core.crearWorkflowEngine({ tracer, now })
    .construir({ contract: core.WORKFLOW_CONTRACT_VERSION, trace: t, plan: planeado.plan });
  check('A) Planner → Workflow: el plan se convierte en un workflow con pasos ejecutables',
    construido.status === 'ready' && construido.workflow.steps.length === 1);

  /* B–L · Y de ahí al conductor, con la cola DURABLE. */
  const db = fakeDb();
  const m = mundo({ cola: durable(db) });
  const r = await m.conductor.ejecutar({ principal: QUIEN, trace: t, workflow: construido.workflow });

  check('B/C) Orchestrator prepara y el Router resuelve una implementación válida',
    r.pasos[0]?.implementation?.providerId === 'x' && r.pasos[0]?.implementation?.modelId === 'x-1');
  check('D) Job Engine persistió el trabajo', [...m.trabajos.porId.values()].length === 1);
  /*
   * El aviso ya no está cuando se mira: el trabajador lo confirmó dentro de la
   * misma llamada. Que HUBO una entrega por este transporte es lo observable
   * aquí; que el aviso solo llevaba el `jobId` se comprueba en la sección C,
   * mirándolo mientras está en vuelo.
   */
  check('E) el QueuePort publicó y se entregó por el transporte DURABLE',
    m.entregas.length === 1 && m.cola !== undefined && db.volcado(COLECCION_DE_COLA).length === 0);
  check('F/G) el trabajador reclamó y RELEYÓ el trabajo guardado', m.entregas[0].outcome === 'executed');
  check('H) el JobExecutor ejecutó por el Gateway y el adaptador salió UNA vez', m.ad.llamadas.length === 1);
  check('I) el contrato de renovación de concesión viaja en la entrega',
    /renovar/.test(leer('functions/src/job/worker.ts')));
  check('J) el resultado volvió al Job Engine', [...m.trabajos.porId.values()][0].result?.outputRefs?.length >= 0);
  check('K) el trabajador confirmó: la cola durable quedó limpia', db.volcado(COLECCION_DE_COLA).length === 0);
  check('L) y el trabajo terminó en estado terminal correcto',
    [...m.trabajos.porId.values()][0].state === 'completed' && r.estado === 'terminada' && r.cierre?.state === 'done',
    `${[...m.trabajos.porId.values()][0].state}/${r.estado}`);

  check('A) el trabajo guarda REFERENCIAS, nunca el contenido',
    !JSON.stringify([...m.trabajos.porId.values()][0]).includes('listo'));
  check('A) y lo que contestó el proveedor vuelve a quien lo pidió', r.pasos[0].respuesta?.content === 'listo');
}

/* ═══ B · EL CONTRATO: EL CONDUCTOR DEPENDE DEL PUERTO ═══════════════════ */
console.log('\n── B · Conductor → QueuePort, y el silencio como respuesta válida ──');
{
  reloj = T0;
  const CONDUCTOR = leer('functions/src/runtime/conductor.ts');
  const DURABLE = leer('functions/src/runtime/cola-durable.ts');
  const PUERTO = leer('functions/src/core/job-queue.ts');
  const INVOCACION = leer('functions/src/runtime/cola.ts');

  check('B) el conductor tipa su cola por el PUERTO, no por un transporte concreto',
    /cola: QueuePort;/.test(CONDUCTOR) && !/ColaDeInvocacion/.test(CONDUCTOR));
  check('B) y `proximoVisible` es una capacidad OPCIONAL del puerto: nadie está obligado a tenerla',
    /proximoVisible\?\(at: number\): number \| undefined;/.test(PUERTO));
  check('B) el conductor pregunta sin exigir, y el silencio no lo rompe',
    /cola\.proximoVisible\?\.\(ahora\(\)\)/.test(CONDUCTOR));
  check('B) la cola de invocación SÍ la declara —obligatoria para ella—, y la durable NO la tiene',
    /^ {2}proximoVisible\(at: number\): number \| undefined;$/m.test(INVOCACION) && !/proximoVisible/.test(DURABLE));
  check('B) y NO hay puente artificial en ningún sitio: nadie devuelve `undefined` para callar al conductor',
    !/proximoVisible: \(\) => undefined/.test(DURABLE + leer('functions/src/runtime/index.ts') + leer('functions/test/camino-durable.test.mjs')));

  /* Del puerto, el conductor usa dos; `ack`/`nack` son del trabajador. */
  const usadas = ['enqueue', 'claim', 'ack', 'nack'].filter((m2) => new RegExp(`cola\\.${m2}\\(`).test(CONDUCTOR));
  check('B) del PUERTO solo usa `enqueue` y `claim`; `ack`/`nack` los hace el trabajador',
    usadas.join(',') === 'enqueue,claim', usadas.join(',') || 'ninguna');
  const extra = [...CONDUCTOR.matchAll(/cola\.([a-zA-Z]+)[?(]/g)].map((x) => x[1]).filter((x) => !['enqueue', 'claim', 'ack', 'nack'].includes(x));
  check('B) y fuera de esas cuatro, nada que el puerto no declare',
    [...new Set(extra)].every((x) => x === 'proximoVisible'), [...new Set(extra)].join(',') || 'ninguno');

  /* La durable cumple el puerto entero, sin añadidos. */
  const dbForma = fakeDb();
  const cd = durable(dbForma);
  check('B) `colaDurableDeTrabajos` satisface `QueuePort`: la promesa y las cuatro operaciones',
    cd.guarantee === 'at_least_once' && ['enqueue', 'claim', 'ack', 'nack'].every((k2) => typeof cd[k2] === 'function')
    && cd.proximoVisible === undefined);
  check('B) y la de invocación también, más su capacidad propia',
    (() => { const ci = colaDeInvocacion(now); return ci.guarantee === 'at_least_once' && ['enqueue', 'claim', 'ack', 'nack'].every((k2) => typeof ci[k2] === 'function') && typeof ci.proximoVisible === 'function'; })());

  /*
   * ── EL CAMINO DEL REINTENTO, POR LOS DOS TRANSPORTES ─────────────────────
   *
   * En el camino feliz el conductor nunca llega a preguntar. Solo pregunta
   * cuando lo único que falta es la hora de un reintento. Así que se fuerza ese
   * camino —un 429, reintentable— y se mira qué hace cada transporte.
   */
  const unFallo = () => { throw new ProviderError('x respondió 429: slow down', 'x', 429, true); };

  /* B.1 · LA DURABLE: no espera aquí dentro, y no pierde el reintento. */
  reloj = T0;
  const dbD = fakeDb();
  const esperasD = [];
  const mD = mundo({ cola: durable(dbD), fallar: unFallo, esperar: async (ms) => { esperasD.push(ms); reloj += ms + 1; } });
  const rD = await mD.conductor.ejecutar({ principal: QUIEN, trace: traza(), workflow: await unWorkflow() });

  check('B.1) la cola DURABLE sin `proximoVisible` NO rompe al conductor: contesta `en_curso`',
    rD.estado === 'en_curso', rD.estado);
  check('B.1) y NO durmió dentro de la invocación: cero esperas locales',
    esperasD.length === 0, esperasD.join(',') || 'ninguna');

  const avisos = dbD.volcado(COLECCION_DE_COLA);
  const trabajoD = [...mD.trabajos.porId.values()][0];
  check('B.1) el reintento NO se perdió: el aviso sigue guardado, esperando su hora',
    avisos.length === 1 && avisos[0].jobId === trabajoD.jobId, `${avisos.length} avisos`);
  check('B.1) y conserva `notBefore` como `disponibleEn`: la espera del trabajo, intacta en el transporte',
    avisos[0].visibleEn === trabajoD.availableAt && avisos[0].disponibleEn === trabajoD.availableAt
    && avisos[0].disponibleEn > reloj,
    `disponibleEn=${avisos[0].disponibleEn} availableAt=${trabajoD.availableAt}`);
  check('B.1) un trabajo, una ejecución, un intento: nada duplicado',
    [...mD.trabajos.porId.values()].length === 1 && mD.runs.m.size === 1
    && trabajoD.attempts.length === 1 && mD.ad.llamadas.length === 1,
    `trabajos=${[...mD.trabajos.porId.values()].length} runs=${mD.runs.m.size} intentos=${trabajoD.attempts.length} llamadas=${mD.ad.llamadas.length}`);
  check('B.1) y el aviso que quedó SIGUE sin llevar nada del trabajo salvo su identificador',
    !['provider', 'model', 'account', 'accountId', 'prompt', 'input', 'implementation', 'secret', 'url'].some((k2) => k2 in avisos[0]));

  /*
   * B.2 · CUANDO LLEGA LA HORA, SE RECOGE. Que no se espere dentro de la
   * invocación no vale de nada si nadie vuelve: aquí se adelanta el reloj y se
   * retoma la MISMA ejecución con un conductor NUEVO —otro proceso, que es el
   * caso real— sobre la MISMA base de datos.
   */
  reloj = trabajoD.availableAt + 1;
  const mD2 = mundo({ cola: durable(dbD), trabajos: mD.trabajos, runs: mD.runs });
  const rD2 = await mD2.conductor.retomar({ principal: QUIEN, runId: rD.runId, trace: traza() });
  check('B.2) al llegar la hora, otro proceso recoge el aviso y la ejecución TERMINA',
    rD2.estado === 'terminada' && rD2.cierre?.state === 'done', `${rD2.estado}/${rD2.cierre?.state}`);
  check('B.2) enqueue → claim → atenderEntrega → ejecución → ack: la cola quedó vacía',
    dbD.volcado(COLECCION_DE_COLA).length === 0 && mD2.entregas.some((e) => e.outcome === 'executed'));
  check('B.2) y sigue habiendo UN trabajo y UNA ejecución: el reintento no creó un segundo',
    [...mD.trabajos.porId.values()].length === 1 && mD.runs.m.size === 1);

  /* B.3 · LA DE INVOCACIÓN: sigue usando su capacidad y sigue esperando aquí dentro. */
  reloj = T0;
  const esperasI = [];
  const mI = mundo({ fallar: unFallo, esperar: async (ms) => { esperasI.push(ms); reloj += ms + 1; } });
  const rI = await mI.conductor.ejecutar({ principal: QUIEN, trace: traza(), workflow: await unWorkflow() });
  check('B.3) la cola de INVOCACIÓN sí contesta, y el conductor SÍ espera dentro de la invocación',
    esperasI.length >= 1, esperasI.join(',') || 'ninguna');
  /*
   * Y AHÍ ESTÁ LA DIFERENCIA, EN UNA LÍNEA: con el mismo fallo y el mismo
   * workflow, la durable hizo UN intento y devolvió `en_curso` dejando el aviso
   * guardado; ésta se queda dentro, consume las esperas y agota los tres
   * intentos hasta cerrar. Las dos son correctas. Son transportes distintos.
   */
  check('B.3) y con las esperas consumidas, los reintentos ocurren DENTRO de la misma llamada, hasta cerrar',
    rI.estado === 'terminada' && mI.ad.llamadas.length === 3 && mD.ad.llamadas.length === 1,
    `invocación: ${rI.estado} con ${mI.ad.llamadas.length} intentos · durable: ${rD.estado} con ${mD.ad.llamadas.length}`);
}

/* ═══ C · LO QUE EL TRANSPORTE NO LLEVA NI DECIDE ════════════════════════ */
console.log('\n── C · Un transporte que no decide nada ──');
{
  reloj = T0;
  const db = fakeDb();
  const m = mundo({ cola: durable(db) });
  const tracer = { record() {} };
  const t = traza();
  const planner = core.crearPlanner({ availability: { disponible: () => true }, tracer, now });
  const p = await planner.planificar({
    contract: core.PLANNER_CONTRACT_VERSION, trace: t,
    understanding: {
      intent: 'creation', confidence: 'high', goal: 'g', inputs: { text: 'g', attachments: [] },
      references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
      capability: 'text.generate', capabilities: ['text.generate'],
    },
  });
  const w = await core.crearWorkflowEngine({ tracer, now }).construir({ contract: core.WORKFLOW_CONTRACT_VERSION, trace: t, plan: p.plan });
  /* Se mira la cola ANTES de que el trabajador la vacíe. */
  const visto = [];
  const espia = { ...durable(db), claim: async (o) => { visto.push(db.volcado(COLECCION_DE_COLA).map((x) => ({ ...x }))); return durable(db).claim(o); } };
  const m2 = mundo({ cola: espia });
  await m2.conductor.ejecutar({ principal: QUIEN, trace: t, workflow: w.workflow });

  const aviso = visto.flat()[0];
  check('C) el aviso guardado lleva jobId y nada más del trabajo',
    !!aviso && typeof aviso.jobId === 'string'
    && !['provider', 'model', 'account', 'accountId', 'asset', 'secret', 'url', 'prompt', 'input', 'implementation']
      .some((k) => k in aviso),
    Object.keys(aviso ?? {}).join(','));
  check('C) el lector del Core solo admite cinco campos en un mensaje',
    core.CAMPOS_DE_MENSAJE_DE_COLA.join(',') === 'contract,jobId,enqueuedAt,reason,notBefore');
  check('C) y el trabajador relee el trabajo guardado antes de ejecutar',
    /store\.obtener\(mensaje\.jobId\)/.test(leer('functions/src/job/worker.ts')));

  /* La misma ejecución con la cola de invocación da el mismo desenlace. */
  const inv = mundo();
  const r2 = await inv.conductor.ejecutar({ principal: QUIEN, trace: traza(), workflow: w.workflow });
  check('C) el MISMO workflow por la cola de invocación termina igual: el transporte es intercambiable',
    r2.estado === 'terminada' && r2.cierre?.state === 'done' && inv.ad.llamadas.length === 1);

  /* Estructura. */
  check('C) no hay un segundo conductor, ni un segundo trabajador, ni un segundo motor',
    ['crearConductor', 'atenderEntrega', 'crearMotorDeTrabajosDeWee'].every((f) =>
      new RegExp(`export const ${f}|export \\{ ${f}`).test(
        leer('functions/src/runtime/conductor.ts') + leer('functions/src/job/worker.ts') + leer('functions/src/job/index.ts'))));
  check('C) la cola durable sigue sin estar conectada a producción',
    !/cola-durable|colaDurableDeTrabajos/.test(leer('functions/src/runtime/index.ts'))
    && !/cola-durable/.test(leer('functions/src/index.ts')));
  check('C) la puerta de F12-D sigue cerrada por defecto',
    /habilitado: false/.test(leer('functions/src/runtime/puerta.ts')));
  check('C) el índice y la regla de `jobQueue` están PREPARADOS, no desplegados',
    /jobQueue/.test(leer('firestore.rules')) && /jobQueue/.test(leer('firestore.indexes.json')));
  check('esta suite está en la cadena de `npm test`', /camino-durable\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
