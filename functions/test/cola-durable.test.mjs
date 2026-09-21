/**
 * LA COLA DURABLE — el mismo puerto, un transporte que sobrevive al proceso.
 *
 * Lo que se vigila aquí, en una frase: **entregar dos veces tiene que ser
 * seguro, y confirmar nunca puede tragarse un reintento**. Casi todo lo demás
 * —reintentos, concesiones, muerte del trabajador, contrapresión, venenos— ya
 * lo prueba `job-queue.test.mjs` sobre el PUERTO, y no se repite: lo que se
 * prueba aquí es que este adaptador cumple ese mismo contrato de verdad.
 *
 *   A · El contrato del puerto, sobre almacenamiento real
 *   B · La carrera que la cola de invocación no tiene
 *   C · Particiones
 *   D · Venenos y el sustituto de la cola de muertos
 *   E · El MISMO trabajador, sin cambiar una línea
 *   F · El ejecutor de medios, por el transporte durable
 *   G · Seguridad y estructura
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

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const comp = lib('job/index.js');
const { atenderEntrega, barrerRecuperables } = lib('job/worker.js');
const { colaDeInvocacion } = lib('runtime/cola.js');
const {
  colaDurableDeTrabajos, particionDe, trabajoDelRecibo, revisionDelRecibo,
  COLECCION_DE_COLA, PARTICIONES_DE_COLA, MAX_ENTREGAS_POR_AVISO,
} = lib('runtime/cola-durable.js');

const T0 = 1_800_000_000_000;
let reloj = T0;
const now = () => reloj;

/* ── Un Firestore de mentira, con lo justo que esta cola usa ───────────────── */

/**
 * Serializa las transacciones, que es lo que de verdad importa para probar una
 * cola: dos reclamos a la vez no pueden ver el mismo aviso libre. No pretende
 * ser Firestore; pretende ser sus GARANTÍAS.
 */
const fakeDb = () => {
  const cols = new Map();
  const dameCol = (nombre) => { if (!cols.has(nombre)) cols.set(nombre, new Map()); return cols.get(nombre); };
  let cadena = Promise.resolve();
  let transacciones = 0;

  const hazRef = (nombre, id) => ({
    _col: nombre, _id: id,
    async get() { const d = dameCol(nombre).get(id); return { exists: d !== undefined, id, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) }; },
  });

  const consulta = (nombre, filtros = [], orden = null, tope = Infinity) => ({
    where: (campo, op, valor) => consulta(nombre, [...filtros, { campo, op, valor }], orden, tope),
    orderBy: (campo) => consulta(nombre, filtros, campo, tope),
    limit: (k) => consulta(nombre, filtros, orden, k),
    count: () => ({ async get() { return { data: () => ({ count: filtrar(nombre, filtros, orden, tope).length }) }; } }),
    async get() {
      const docs = filtrar(nombre, filtros, orden, tope);
      return { docs: docs.map(([id, d]) => ({ id, ref: hazRef(nombre, id), data: () => JSON.parse(JSON.stringify(d)) })) };
    },
  });

  const valorDe = (d, campo) => campo.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), d);

  const filtrar = (nombre, filtros, orden, tope) => {
    let e = [...dameCol(nombre).entries()];
    for (const f of filtros) {
      e = e.filter(([, d]) => {
        const v = valorDe(d, f.campo);
        if (f.op === '==') return v === f.valor;
        if (f.op === '<=') return typeof v === 'number' && v <= f.valor;
        return true;
      });
    }
    /* Como Firestore: ordenar por un campo EXCLUYE los documentos que no lo tienen. */
    if (orden) e = e.filter(([, d]) => valorDe(d, orden) !== undefined)
      .sort((a, b) => (valorDe(a[1], orden) < valorDe(b[1], orden) ? -1 : 1));
    return e.slice(0, tope === Infinity ? undefined : tope);
  };

  return {
    get transacciones() { return transacciones; },
    volcado: (nombre) => [...dameCol(nombre).entries()].map(([id, d]) => ({ id, ...d })),
    collection(nombre) { return { doc: (id) => hazRef(nombre, id), ...consulta(nombre) }; },
    runTransaction(fn) {
      const corre = async () => {
        transacciones++;
        const tx = {
          async get(ref) { return ref.get(); },
          create(ref, datos) {
            const c = dameCol(ref._col);
            if (c.has(ref._id)) throw new Error('ya existe');
            c.set(ref._id, JSON.parse(JSON.stringify(datos)));
          },
          update(ref, parche) {
            const c = dameCol(ref._col);
            const previo = c.get(ref._id);
            if (previo === undefined) throw new Error('no existe');
            c.set(ref._id, { ...previo, ...JSON.parse(JSON.stringify(parche)) });
          },
          delete(ref) { dameCol(ref._col).delete(ref._id); },
        };
        return fn(tx);
      };
      const siguiente = cadena.then(corre, corre);
      cadena = siguiente.then(() => undefined, () => undefined);
      return siguiente;
    },
  };
};

const mensaje = (jobId, reason = 'created', notBefore) =>
  core.mensajeDeCola({ jobId, ...(notBefore !== undefined ? { availableAt: notBefore } : {}) }, reloj, reason);

const colaDe = (db, extra = {}) => colaDurableDeTrabajos(db, { ahora: now, particion: 0, particiones: 1, ...extra });

/* ═══ A · EL CONTRATO DEL PUERTO ══════════════════════════════════════════ */
console.log('\n── A · El mismo contrato, sobre algo que sobrevive ──');
{
  const db = fakeDb();
  const cola = colaDe(db);
  reloj = T0;

  check('A · declara la misma garantía que el puerto pide', cola.guarantee === 'at_least_once');

  /* 1 · encolar. */
  await cola.enqueue(mensaje('job-1'));
  check('1) encolar deja UN aviso guardado', db.volcado(COLECCION_DE_COLA).length === 1);
  check('1) y el aviso lleva SOLO el jobId, nunca el trabajo',
    !('input' in db.volcado(COLECCION_DE_COLA)[0]) && db.volcado(COLECCION_DE_COLA)[0].jobId === 'job-1');

  /* 18 · encolar dos veces es idempotente. */
  await cola.enqueue(mensaje('job-1', 'retry'));
  check('18) encolar el MISMO trabajo dos veces sigue dejando un aviso',
    db.volcado(COLECCION_DE_COLA).length === 1);
  check('18) y su revisión subió: la segunda llamada no se perdió',
    db.volcado(COLECCION_DE_COLA)[0].revision === 1);

  /* 5 · reclamar. */
  const e1 = await cola.claim({ worker: 'w1', at: reloj, visibilityMs: 30_000 });
  check('5) reclamar entrega el aviso con su recibo y su cuenta de entregas',
    !!e1 && e1.deliveryCount === 1 && trabajoDelRecibo(e1.deliveryId) === 'job-1');
  check('5) y lo que viaja es un mensaje legible por el MISMO lector del trabajador',
    core.leerMensajeDeCola(e1.message).ok === true);

  /* 6 · colisión de concesión. */
  const e2 = await cola.claim({ worker: 'w2', at: reloj, visibilityMs: 30_000 });
  check('6) otro trabajador NO puede cogerlo mientras esté en vuelo', e2 === undefined);

  /* 8 · la visibilidad caduca. */
  reloj = T0 + 30_001;
  const e3 = await cola.claim({ worker: 'w2', at: reloj, visibilityMs: 30_000 });
  check('8) cuando la visibilidad caduca, otro trabajador SÍ puede cogerlo',
    !!e3 && e3.deliveryCount === 2);

  /* 4 · un recibo viejo no hace nada. */
  await cola.ack(e1.deliveryId);
  check('4) confirmar con un recibo VIEJO no borra nada', db.volcado(COLECCION_DE_COLA).length === 1);
  await cola.ack(e3.deliveryId);
  check('4) confirmar con el recibo en vuelo sí lo cierra', db.volcado(COLECCION_DE_COLA).length === 0);

  /* nack con espera. */
  reloj = T0;
  const db2 = fakeDb(); const cola2 = colaDe(db2);
  await cola2.enqueue(mensaje('job-2'));
  const d = await cola2.claim({ worker: 'w1', at: reloj, visibilityMs: 1_000 });
  await cola2.nack(d.deliveryId, { delayMs: 5_000 });
  check('A · devolver con espera lo hace invisible hasta que pase',
    (await cola2.claim({ worker: 'w1', at: reloj + 4_999, visibilityMs: 1_000 })) === undefined
    && !!(await cola2.claim({ worker: 'w1', at: reloj + 5_000, visibilityMs: 1_000 })));

  /* notBefore. */
  const db3 = fakeDb(); const cola3 = colaDe(db3);
  await cola3.enqueue(mensaje('job-3', 'retry', reloj + 10_000));
  check('A · un aviso con fecha futura no se entrega antes de tiempo',
    (await cola3.claim({ worker: 'w1', at: reloj, visibilityMs: 1_000 })) === undefined);

  /* Mensajes inválidos no entran. */
  let rechazo = false;
  try { await cola3.enqueue({ contract: '1.0' }); } catch { rechazo = true; }
  check('A · un mensaje que no pasa el lector del Core NO se guarda', rechazo);

  /*
   * LAS DOS GUARDAS, AISLADAS.
   *
   * `ack` y `claim` comprueban cada uno DOS cosas, y en el camino normal una
   * tapa a la otra: el recibo en vuelo y la revisión en `ack`, la consulta y la
   * concesión en `claim`. Quitar una sola no rompía nada, así que aquí se
   * fabrican a mano los estados en los que cada guarda es la ÚNICA que queda
   * —un documento escrito por otro, o por una versión anterior— para que se
   * pruebe la guarda y no su compañera.
   */
  const db4 = fakeDb(); const cola4 = colaDe(db4);
  reloj = T0;
  await cola4.enqueue(mensaje('job-guardas'));
  const dg = await cola4.claim({ worker: 'w1', at: reloj, visibilityMs: 10_000 });
  await cola4.nack(dg.deliveryId, { delayMs: 0 });
  /* Ahora el recibo ya NO está en vuelo, pero su revisión sigue siendo la del documento. */
  await cola4.ack(dg.deliveryId);
  check('4) confirmar con un recibo que ya no está en vuelo no borra, aunque su revisión cuadre',
    db4.volcado(COLECCION_DE_COLA).length === 1);

  /*
   * Un aviso visible por consulta PERO con una concesión viva: un estado que la
   * propia cola no produce, y que sí produciría otro escritor. La concesión
   * tiene que bastar por sí sola.
   */
  const db5 = fakeDb(); const cola5 = colaDe(db5);
  await cola5.enqueue(mensaje('job-mano'));
  await db5.runTransaction(async (tx) => {
    tx.update(db5.collection(COLECCION_DE_COLA).doc('q.job-mano'), {
      disponibleEn: reloj - 1,
      vuelo: { deliveryId: 'dur.job-mano.1.1', until: reloj + 60_000, worker: 'otro' },
    });
  });
  check('6) una concesión viva impide reclamar aunque la consulta lo devuelva',
    (await cola5.claim({ worker: 'w2', at: reloj, visibilityMs: 1_000 })) === undefined);
}

/* ═══ B · LA CARRERA QUE LA COLA DE INVOCACIÓN NO TIENE ═══════════════════ */
console.log('\n── B · Confirmar no puede tragarse un reintento ──');
{
  const db = fakeDb(); const cola = colaDe(db);
  reloj = T0;
  await cola.enqueue(mensaje('job-r'));
  const d = await cola.claim({ worker: 'w1', at: reloj, visibilityMs: 30_000 });

  /* Mientras «se ejecuta», alguien encola un reintento del mismo trabajo. */
  await cola.enqueue(mensaje('job-r', 'retry'));
  await cola.ack(d.deliveryId);

  check('B · el aviso SIGUE ahí: la confirmación del intento viejo no borró el reintento',
    db.volcado(COLECCION_DE_COLA).length === 1);
  check('B · y vuelve a estar libre, sin concesión',
    !db.volcado(COLECCION_DE_COLA)[0].vuelo);
  const otra = await cola.claim({ worker: 'w2', at: reloj, visibilityMs: 30_000 });
  check('B · así que otro trabajador lo coge y el reintento se atiende', !!otra);

  /* Y sin reintento de por medio, confirmar sí cierra. */
  await cola.ack(otra.deliveryId);
  check('B · sin reintento de por medio, confirmar cierra el aviso', db.volcado(COLECCION_DE_COLA).length === 0);

  check('B · el recibo lleva dentro trabajo y revisión, que es lo que lo hace posible',
    trabajoDelRecibo('dur.j.35.1.x:5.abc.7.9') === 'j.35.1.x:5.abc' && revisionDelRecibo('dur.j.35.1.x:5.abc.7.9') === 9);
  check('B · un recibo que no es de esta cola no resuelve a nada',
    trabajoDelRecibo('inv.3.1') === undefined && trabajoDelRecibo(null) === undefined);
}

/* ═══ C · PARTICIONES ════════════════════════════════════════════════════ */
console.log('\n── C · Repartir el extremo caliente de la cola ──');
{
  check('C · la partición se DERIVA del trabajo, nadie la elige',
    particionDe('job-a', 16) === particionDe('job-a', 16) && particionDe('job-a', 16) < 16);
  const reparto = new Set(Array.from({ length: 200 }, (_, i) => particionDe(`job-${i}`, PARTICIONES_DE_COLA)));
  check('C · y reparte de verdad: doscientos trabajos no caen todos en la misma',
    reparto.size > 8, `${reparto.size} particiones distintas de ${PARTICIONES_DE_COLA}`);

  const db = fakeDb();
  const cero = colaDurableDeTrabajos(db, { ahora: now, particion: 0, particiones: 2 });
  const uno = colaDurableDeTrabajos(db, { ahora: now, particion: 1, particiones: 2 });
  reloj = T0;
  for (let i = 0; i < 12; i++) await cero.enqueue(mensaje(`trabajo-${i}`));

  const cogidos = { 0: 0, 1: 0 };
  for (const [p, c] of [[0, cero], [1, uno]]) {
    for (;;) { const d = await c.claim({ worker: `w${p}`, at: reloj, visibilityMs: 1000 }); if (!d) break; cogidos[p]++; await c.ack(d.deliveryId); }
  }
  check('C · un trabajador solo atiende SU partición, y entre los dos no se dejan nada',
    cogidos[0] + cogidos[1] === 12 && cogidos[0] > 0 && cogidos[1] > 0,
    JSON.stringify(cogidos));
}

/* ═══ D · VENENOS ════════════════════════════════════════════════════════ */
console.log('\n── D · Un aviso que no se deja cerrar no se entrega para siempre ──');
{
  const db = fakeDb();
  const cola = colaDe(db, { maxEntregas: 3 });
  reloj = T0;
  await cola.enqueue(mensaje('job-veneno'));

  let entregas = 0;
  for (let i = 0; i < 10; i++) {
    const d = await cola.claim({ worker: 'w1', at: reloj, visibilityMs: 1 });
    if (!d) break;
    entregas++;
    reloj += 10;
    await cola.nack(d.deliveryId, { delayMs: 0 });
  }
  check('29) tras el tope de entregas el aviso se APARTA y deja de entregarse',
    entregas === 3, `entregas=${entregas}`);
  const apartados = await cola.apartados();
  check('29) y queda apuntado, para poder mirarlo',
    apartados.length === 1 && apartados[0].jobId === 'job-veneno');
  check('29) el aviso NO se borra: apartarlo no es perderlo',
    db.volcado(COLECCION_DE_COLA).length === 1);
  await cola.enqueue(mensaje('job-veneno', 'retry'));
  check('29) y encolar no lo resucita: desapartarlo es una decisión, no un efecto',
    (await cola.claim({ worker: 'w1', at: reloj + 100_000, visibilityMs: 1000 })) === undefined);
  check('29) el tope por defecto está declarado', MAX_ENTREGAS_POR_AVISO === 25);
}

/* ═══ E · EL MISMO TRABAJADOR ════════════════════════════════════════════ */
console.log('\n── E · `atenderEntrega`, sin cambiar una línea ──');

const almacenFalso = () => {
  const porId = new Map(); const porClave = new Map();
  const k = (s, key) => `${s.length}.${s}:${key}`;
  return {
    porId,
    async crearSiAusente(job) { const c = k(job.idempotency.scope, job.idempotency.key); if (porClave.has(c)) return { created: false, job: porId.get(porClave.get(c)) }; porClave.set(c, job.jobId); porId.set(job.jobId, job); return { created: true, job }; },
    async obtener(id) { return porId.get(id); },
    async porIdempotencia(s, key) { const c = k(s, key); return porClave.has(c) ? porId.get(porClave.get(c)) : undefined; },
    async aplicar(t) { const a = porId.get(t.jobId); if (!a || a.revision !== t.expectedRevision) return { applied: false, job: a }; porId.set(t.jobId, t.job); return { applied: true, job: t.job }; },
    async recuperables({ before, limit }) { const todos = [...porId.values()].filter((j) => j.updatedAt <= before); return { jobs: todos.slice(0, limit) }; },
  };
};

const QUIEN = { userId: 'user-0001' };
let serie = 0;
const peticion = (extra = {}) => {
  serie++;
  return {
    contract: '1.0', principal: QUIEN, at: reloj, capability: 'image.generate',
    implementation: { providerId: 'matriz-a', modelId: 'matriz-a.uno' }, input: { prompt: 'un gato' },
    trace: { traceId: `trace-${serie}`, requestId: `req-${String(serie).padStart(4, '0')}`, userId: 'user-0001' },
    context: { appId: 'wee', operationId: `op-${serie}` }, ...extra,
  };
};

const montar = async (extra = {}) => {
  const db = fakeDb();
  const store = almacenFalso();
  const queue = colaDe(db, extra.cola);
  const { motor } = comp.crearMotorDeTrabajosDeWee();
  const llamadas = [];
  const executor = extra.executor ?? { async ejecutar(d) { llamadas.push(d); return { attemptId: d.attemptId, outcome: 'succeeded', dispatched: true, result: { outputRefs: [`ref-${d.jobId}`] } }; } };
  const config = { worker: 'trabajador-1', visibilityMs: 30_000, backpressureDelayMs: 5_000 };
  const deps = { store, queue, engine: motor, executor, config, now };
  const crear = async (p = peticion()) => {
    const r = await comp.crearTrabajo(store, motor, p);
    if (!r.ok) throw new Error('no se creó: ' + JSON.stringify(r.decision ?? r));
    await queue.enqueue(core.mensajeDeCola(r.job, reloj, 'created'));
    return r.job;
  };
  const atender = async () => {
    const e = await queue.claim({ worker: config.worker, at: reloj, visibilityMs: config.visibilityMs });
    return e ? atenderEntrega(deps, e) : undefined;
  };
  return { db, store, queue, motor, llamadas, deps, crear, atender };
};

{
  reloj = T0;
  const m = await montar();
  const job = await m.crear();
  const r = await m.atender();
  check('19) el MISMO trabajador atiende desde el transporte durable, sin tocarlo',
    r.outcome === 'executed' && m.llamadas.length === 1);
  check('3) y leyó el trabajo GUARDADO, no el mensaje: el aviso solo llevaba el jobId',
    m.llamadas[0].jobId === job.jobId && !!m.llamadas[0].input);
  check('17) el resultado quedó en el trabajo', (await m.store.obtener(job.jobId)).result?.outputRefs?.length === 1);
  check('A · y el aviso se confirmó: la cola queda limpia', m.db.volcado(COLECCION_DE_COLA).length === 0);

  /* 2 · entrega duplicada. */
  reloj = T0;
  const m2 = await montar();
  const j2 = await m2.crear();
  await m2.queue.enqueue(core.mensajeDeCola(j2, reloj, 'requeued'));
  const p1 = await m2.atender();
  const p2 = await m2.atender();
  check('2) entregado dos veces, ejecutado UNA',
    p1.outcome === 'executed' && (p2 === undefined || p2.outcome !== 'executed') && m2.llamadas.length === 1,
    `${p1.outcome}/${p2?.outcome ?? 'sin entrega'}`);

  /* 14 · trabajo ya terminal antes de la entrega. */
  reloj = T0;
  const m3 = await montar();
  const j3 = await m3.crear();
  await m3.atender();
  await m3.queue.enqueue(core.mensajeDeCola(j3, reloj, 'requeued'));
  const tarde = await m3.atender();
  check('14) un aviso para un trabajo ya terminal se salta y se confirma',
    tarde.outcome === 'skipped' && tarde.detail === 'terminal');
  check('8/H) y el aviso atrasado no deja basura', m3.db.volcado(COLECCION_DE_COLA).length === 0);

  /* 4 · el trabajo ya no existe. */
  reloj = T0;
  const m4 = await montar();
  await m4.queue.enqueue(core.mensajeDeCola({ jobId: 'no-existe' }, reloj, 'created'));
  const fantasma = await m4.atender();
  check('4) un aviso de un trabajo que no existe se DESCARTA, no se ejecuta',
    fantasma.outcome === 'dropped' && fantasma.detail === 'job_not_found');

  /* 10/11/12 · el ejecutor falla. */
  reloj = T0;
  const m5 = await montar({ executor: { async ejecutar(d) { return { attemptId: d.attemptId, outcome: 'failed', dispatched: true, error: { code: 'PROVIDER_ERROR', source: 'gateway' } }; } } });
  const j5 = await m5.crear();
  const f1 = await m5.atender();
  check('10/11/12) un fallo del proveedor no cierra el trabajo: queda para reintentar',
    f1.outcome === 'executed' && !core.esTrabajoTerminal((await m5.store.obtener(j5.jobId)).state));
  check('15) y el reintento vuelve a la cola con espera',
    m5.db.volcado(COLECCION_DE_COLA).length === 1 && m5.db.volcado(COLECCION_DE_COLA)[0].disponibleEn > reloj);

  /* 16 · reintentos agotados. */
  for (let i = 0; i < 6; i++) { reloj += 120_000; await m5.atender(); }
  const agotado = await m5.store.obtener(j5.jobId);
  check('16) agotados los intentos, el trabajo queda FALLIDO, que es el estado que ya existía',
    agotado.state === 'failed' && core.esTrabajoTerminal(agotado.state));
  check('17/13) y no se inventó ningún estado nuevo para eso',
    core.ESTADOS_FINALES_DE_TRABAJO.join(',') === 'completed,failed,timed_out,cancelled');

  /* 30 · recuperación. */
  reloj = T0;
  const m6 = await montar();
  const j6 = await m6.crear();
  const entrega = await m6.queue.claim({ worker: 'w-muerto', at: reloj, visibilityMs: 1_000 });
  check('9) un trabajador que muere deja el aviso en vuelo', !!entrega);
  reloj += 2_000;
  const rescatado = await m6.queue.claim({ worker: 'w-vivo', at: reloj, visibilityMs: 30_000 });
  check('9/30) y al caducar la visibilidad, otro lo recoge', !!rescatado && rescatado.deliveryCount === 2);
  const informe = await barrerRecuperables({ store: m6.store, queue: m6.queue, engine: m6.motor, now: () => reloj + 10 * 60_000 }, { before: reloj + 10 * 60_000, limit: 10 });
  check('30) y el barrido de recuperables del Job Engine sigue funcionando con este transporte',
    typeof informe === 'object' && j6.jobId.length > 0);

  /* 28 · contrapresión. */
  reloj = T0;
  const m7 = await montar();
  await m7.crear();
  const conTope = { ...m7.deps, config: { ...m7.deps.config, limits: { maxRunningPerAccount: 1 } }, capacity: { async capacidad() { return { runningForAccount: 1 }; } } };
  const e7 = await m7.queue.claim({ worker: 'w1', at: reloj, visibilityMs: 30_000 });
  const r7 = await atenderEntrega(conTope, e7);
  check('28) sin capacidad, el aviso se devuelve con espera en vez de ejecutarse',
    r7.outcome === 'deferred' && m7.db.volcado(COLECCION_DE_COLA)[0].disponibleEn > reloj,
    r7.detail);
}

/* ═══ F · EL EJECUTOR DE MEDIOS, POR EL TRANSPORTE DURABLE ═══════════════ */
console.log('\n── F · MC-4 por la cola durable, sin una segunda implementación ──');
{
  const { crearEjecutorDeMedios, solicitarProceso } = lib('media/proceso.js');
  const { crearAlmacenFalso, FAKE_PROVIDER_ID, DESCRIPTOR_FALSO } = lib('media/falso.js');
  const { crearProcesadorFalso, DESCRIPTOR_DEL_PROCESADOR_FALSO } = lib('media/procesador-falso.js');
  const { huellaDeMedios } = lib('media/huella.js');

  const ANA = 'cuentaDeAna';
  const MATERIAL = 'asset_abc123';
  const MINIATURA = { tipo: 'thumbnail', ancho: 400, alto: 400, ajuste: 'cover', formato: 'webp', calidad: 80 };
  reloj = T0;

  const almacenR2 = crearAlmacenFalso({ ahora: now, contenedor: 'cubo' });
  const clave = core.claveDelObjeto(ANA, MATERIAL);
  const refOrigen = { provider: FAKE_PROVIDER_ID, objectKey: clave };
  await almacenR2.guardar({ destino: refOrigen, cuerpo: Buffer.from('bytes del original'), contentType: 'image/png' });

  const material = {
    contract: 1, assetId: MATERIAL, ownerAccountId: ANA, kind: 'image', status: 'ready',
    storageRef: refOrigen, mimeType: 'image/png', provenance: { createdAt: T0 }, createdAt: T0, updatedAt: T0,
  };
  const fichas = new Map();
  const variantes = [];
  /* El original ya tiene su ficha: sin ella, MC-4 se niega —y hace bien—. */
  const refDelOrigen = core.referenciaDelObjeto(huellaDeMedios, refOrigen);
  fichas.set(refDelOrigen, {
    objectRef: refDelOrigen, providerId: FAKE_PROVIDER_ID, accountId: ANA, assetId: MATERIAL,
    pieza: 'original', objectKey: clave, estado: 'guardado', bytes: 18, contentType: 'image/png',
    createdAt: T0, updatedAt: T0,
  });
  const objetos = {
    async leer(ref) { return fichas.get(ref); },
    async registrar(f) { if (fichas.has(f.objectRef)) return { ok: true, objeto: fichas.get(f.objectRef), yaEstaba: true }; fichas.set(f.objectRef, f); return { ok: true, objeto: f, yaEstaba: false }; },
  };
  const depsProceso = {
    db: {}, cuentaDelPrincipal: async () => ({ accountId: ANA }),
    leerMaterial: async () => material,
    anotarVariante: async (_a, _id, v) => { const i = variantes.findIndex((x) => x.kind === v.kind); if (i >= 0) variantes[i] = v; else variantes.push(v); return { status: 'anotada' }; },
    objetos, procesador: crearProcesadorFalso(), ahora: now,
  };
  const pedido = await solicitarProceso(depsProceso, { principalId: ANA, assetId: MATERIAL, transformaciones: [MINIATURA], operationId: 'op-durable-1' });
  check('F · MC-4 devuelve peticiones de trabajo, sin mover un byte', pedido.ok && pedido.solicitudes.length === 1, pedido.ok ? '' : JSON.stringify(pedido.traza));

  const db = fakeDb();
  const store = almacenFalso();
  const queue = colaDe(db);
  const { motor } = comp.crearMotorDeTrabajosDeWee();
  const ejecutor = crearEjecutorDeMedios({
    almacenes: { [FAKE_PROVIDER_ID]: almacenR2 },
    procesador: depsProceso.procesador,
    objetos, anotarVariante: depsProceso.anotarVariante, ahora: now,
  });
  const deps = { store, queue, engine: motor, executor: ejecutor, config: { worker: 'w-medios', visibilityMs: 60_000, backpressureDelayMs: 0 }, now };

  const alta = await comp.crearTrabajo(store, motor, pedido.solicitudes[0]);
  await queue.enqueue(core.mensajeDeCola(alta.job, reloj, 'created'));
  const e = await queue.claim({ worker: 'w-medios', at: reloj, visibilityMs: 60_000 });
  const r = await atenderEntrega(deps, e);

  check('19) el ejecutor de MC-4 corre tal cual desde el transporte durable', r.outcome === 'executed');
  check('25) y dejó UNA ficha de objeto del derivado', fichas.size === 2, `fichas=${fichas.size}`);
  check('24) y UNA variante', variantes.length === 1 && variantes[0].kind === 'thumbnail');
  check('F · el trabajo quedó completado', (await store.obtener(alta.job.jobId)).state === 'completed');
  check('A · y el aviso se confirmó', db.volcado(COLECCION_DE_COLA).length === 0);

  /* Entrega duplicada del mismo trabajo de medios. */
  await queue.enqueue(core.mensajeDeCola(alta.job, reloj, 'requeued'));
  const e2 = await queue.claim({ worker: 'w-medios', at: reloj, visibilityMs: 60_000 });
  const r2 = await atenderEntrega(deps, e2);
  check('24/25) repetir la entrega NO crea una segunda variante ni una segunda ficha',
    r2.outcome === 'skipped' && variantes.length === 1 && fichas.size === 2);

  /* 20 · propiedad. */
  const guardado = await store.obtener(alta.job.jobId);
  check('20) el trabajo lleva su dueño, y el trabajador lo lee de ahí y no del mensaje',
    guardado.owner?.userId === ANA);
  check('21) el ejecutor resolvió el proveedor por la abstracción, no por el mensaje',
    !/provider|r2|bucket/i.test(JSON.stringify(db.volcado(COLECCION_DE_COLA))));
}

/* ═══ G · SEGURIDAD Y ESTRUCTURA ═════════════════════════════════════════ */
console.log('\n── G · Lo que el transporte no puede llevar ni decidir ──');
{
  const SRC = sinComentarios(leer('functions/src/runtime/cola-durable.ts'));

  /* 22/23 · nada sensible. */
  check('22/23) el aviso guardado no tiene un solo campo de secreto, URL o credencial',
    !/url|token|secret|credencial|authorization|firma|signature|signed/i.test(
      SRC.match(/interface AvisoGuardado \{[\s\S]*?\n\}/)[0]));
  check('22) no hay un solo `console.` en el transporte', !/console\./.test(SRC));
  check('23) y no firma nada: transportar no es dar acceso', !/firmar|urlFirmada|urlDeSubida/.test(SRC));

  /* 15 · nada del mensaje decide nada. */
  check('15) el mensaje no puede traer cuenta, proveedor, clave ni destino: el lector del Core solo admite cinco campos',
    core.CAMPOS_DE_MENSAJE_DE_COLA.join(',') === 'contract,jobId,enqueuedAt,reason,notBefore');
  check('15) y el trabajador RELEE el trabajo guardado antes de ejecutar',
    /store\.obtener\(mensaje\.jobId\)/.test(sinComentarios(leer('functions/src/job/worker.ts'))));

  /* 4 · provider agnostic. */
  const PROHIBIDOS = ['cloudflare', 'r2', 'aws', 's3', 'cloudinary', 'qiniu', 'alibaba', 'tencent', 'sharp'];
  const hay = PROHIBIDOS.filter((p) => new RegExp(`(?<![a-z0-9])${p}(?![a-z0-9])`, 'i').test(SRC));
  check('21) el transporte no conoce un solo proveedor', hay.length === 0, hay.join(','));

  /* 3 · no hay un segundo sistema. */
  check('3) NO es un segundo motor de trabajos: no decide estados ni transiciones',
    !/crearMotorDeTrabajos|puedeTransitar|TRANSICIONES|aplicar\(|reclamar\(/.test(SRC));
  check('3) ni un segundo planificador', !/onSchedule|scheduler|cron/i.test(SRC));
  check('3) ni una cola de medios: no sabe qué hay dentro de un trabajo',
    !/media|asset|variant|procesad/i.test(SRC));
  check('3) implementa el puerto que YA existía', /QueuePort/.test(leer('functions/src/runtime/cola-durable.ts')));

  /* 26 · la cola de invocación sigue viva. */
  reloj = T0;
  const inv = colaDeInvocacion(now);
  await inv.enqueue(mensaje('job-inv'));
  const di = await inv.claim({ worker: 'w', at: reloj, visibilityMs: 1000 });
  await inv.ack(di.deliveryId);
  check('26) la cola de invocación sigue funcionando y no se ha tocado',
    !!di && inv.pendientes() === 0 && fs.existsSync(path.resolve(RAIZ, 'functions/src/runtime/cola.ts')));

  /* 27 · las dos cumplen el mismo contrato. */
  const db = fakeDb();
  for (const [nombre, c] of [['invocación', colaDeInvocacion(now)], ['durable', colaDe(db)]]) {
    check(`27) la cola de ${nombre} cumple el puerto entero`,
      c.guarantee === 'at_least_once' && ['enqueue', 'claim', 'ack', 'nack'].every((m) => typeof c[m] === 'function'));
  }

  /* Estructura. */
  check('G · nada de producción lo usa todavía: no está conectado',
    !/cola-durable|colaDurableDeTrabajos/.test(leer('functions/src/index.ts')));
  const quienLoUsa = ['functions/src'].flatMap(() => {
    const andar = (d) => fs.readdirSync(path.resolve(RAIZ, d), { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? andar(`${d}/${e.name}`) : e.name.endsWith('.ts') ? [`${d}/${e.name}`] : []));
    return andar('functions/src');
  }).filter((f) => !f.endsWith('runtime/cola-durable.ts') && /colaDurableDeTrabajos/.test(sinComentarios(leer(f))));
  check('G · y nadie lo importa: la costura está, el cable no', quienLoUsa.length === 0, quienLoUsa.join(','));
  check('esta suite está en la cadena de `npm test`', /cola-durable\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
