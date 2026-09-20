/**
 * F12-D · LA LIQUIDACIÓN QUE SOBREVIVE AL PROCESO QUE LA EMPEZÓ.
 *
 * Hoy el dinero de una operación se cierra en el `try/catch` de la llamada que
 * la empezó. Para un texto de dos segundos basta, y está probado en producción.
 * Para un vídeo de veinte minutos no: la llamada devuelve antes, y si el
 * proceso desaparece no queda NADIE que cobre o devuelva lo reservado.
 *
 * Esta suite prueba la pieza que lo resuelve, con el Credit Engine DE VERDAD
 * sobre un Firestore en memoria:
 *
 *   A · La decisión: qué toca hacer con el dinero, leyendo solo el trabajo.
 *   B · El proceso muere en cada momento posible.
 *   C · El barrendero: qué encuentra y qué hace.
 *   D · Concurrencia: exactamente UNA transición financiera, siempre.
 *   E · Lo que nunca pasa: reembolsos que no tocan.
 *   F · Estructura: qué se añadió y qué NO se tocó.
 *
 * NADA DE ESTO ESTÁ CONECTADO. No hay barrendero programado, no hay capacidad
 * asíncrona migrada y no se desplegó nada.
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
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const { decidirLiquidacion, reservaDe } = lib('runtime/liquidacion.js');
const { barrerLiquidaciones } = lib('runtime/barrendero.js');
const { createCreditEngine } = lib('credits/creditEngine.js');

/* ── Un trabajo, con solo lo que la liquidación mira ───────────────────────── */

const AHORA = 1_000_000;
const RESERVA = { creditTransactionId: 'usage_op_0001', creditRequestId: 'op_0001', creditsEstimated: 3, service: 'ai_video' };

const trabajo = (o = {}) => ({
  jobId: o.jobId ?? 'j1',
  state: o.state ?? 'queued',
  owner: { userId: o.userId ?? 'usuario1' },
  context: { operationId: 'oper-1' },
  trace: { traceId: 'tr-1', requestId: 'req-1', userId: o.userId ?? 'usuario1' },
  capability: 'video.generate',
  implementation: { providerId: 'x', modelId: 'x-1', adapterId: 'adapter:x' },
  metadata: o.metadata === null ? undefined : { ...RESERVA, ...(o.metadata ?? {}) },
  attempts: o.attempts ?? [],
  attemptCount: (o.attempts ?? []).length,
  revision: 1, createdAt: AHORA, updatedAt: AHORA, availableAt: AHORA,
  ...(o.deadlineAt !== undefined ? { deadlineAt: o.deadlineAt } : {}),
});
const intento = (o = {}) => ({
  attemptId: o.attemptId ?? 'a1', attempt: 1,
  ...(o.dispatched !== undefined ? { dispatched: o.dispatched } : {}),
  ...(o.outcome ? { outcome: o.outcome } : {}),
  ...(o.lease ? { lease: o.lease } : {}),
  startedAt: AHORA,
});
const vivo = { owner: 'w-A', until: AHORA + 60_000 };
const caducada = { owner: 'w-A', until: AHORA - 1 };

/* ── A · La decisión ───────────────────────────────────────────────────────── */
console.log('\n── A · Qué toca hacer con el dinero, leyendo solo el trabajo ──');
{
  const d = (job) => decidirLiquidacion(job, AHORA);

  check('sin reserva declarada no hay nada que cerrar', d(trabajo({ metadata: null })).tipo === 'nada');
  check('y tampoco si falta la petición con la que se reservó: no se adivina a partir del nombre de la transacción',
    d(trabajo({ metadata: { creditRequestId: undefined, creditTransactionId: 'usage_op_0001', creditsEstimated: 3 } })).tipo === 'nada');
  check('la reserva se LEE del trabajo, con su importe y su servicio', (() => {
    const r = reservaDe(trabajo());
    return r.requestId === 'op_0001' && r.transactionId === 'usage_op_0001' && r.importe === 3 && r.service === 'ai_video';
  })());
  check('un importe de cero es legítimo: hay respuestas que no cobran', reservaDe(trabajo({ metadata: { creditsEstimated: 0 } })).importe === 0);

  check('TERMINÓ BIEN: se cobra lo que se cotizó, ni un Credit más', (() => {
    const a = d(trabajo({ state: 'completed', attempts: [intento({ dispatched: true, outcome: 'succeeded' })] }));
    return a.tipo === 'liquidar' && a.importe === 3;
  })());
  check('NUNCA SALIÓ y terminó mal: se devuelve entero', (() => {
    const a = d(trabajo({ state: 'failed', attempts: [intento({ dispatched: false, outcome: 'failed' })] }));
    return a.tipo === 'reembolsar' && a.motivo === 'no_salio';
  })());
  check('SALIÓ y se sabe que acabó mal: también se devuelve', (() => {
    const a = d(trabajo({ state: 'failed', attempts: [intento({ dispatched: true, outcome: 'failed' })] }));
    return a.tipo === 'reembolsar' && a.motivo === 'fallo_definitivo';
  })());
  check('cancelado sin haber salido: se devuelve', d(trabajo({ state: 'cancelled', attempts: [intento({ dispatched: false, outcome: 'cancelled' })] })).tipo === 'reembolsar');

  check('EN MARCHA con la concesión viva: NO se toca, por mucho que tarde', (() => {
    const a = d(trabajo({ state: 'running', attempts: [intento({ dispatched: true, lease: vivo })] }));
    return a.tipo === 'esperar' && a.motivo === 'en_marcha';
  })());
  check('y con la concesión caducada tampoco: eso es del motor de trabajos, no del dinero', (() => {
    const a = d(trabajo({ state: 'queued', attempts: [intento({ dispatched: false, outcome: 'failed', lease: caducada })] }));
    return a.tipo === 'esperar' && a.motivo === 'recuperable';
  })());
  /* Lo destapó el emulador: un fallo REINTENTABLE devuelve el trabajo a la cola. Ahí no se devuelve dinero: todavía puede salir bien. */
  check('un fallo que se va a reintentar NO es un reembolso: el trabajo volvió a la cola y el dinero espera',
    d(trabajo({ state: 'queued', attempts: [intento({ dispatched: false, outcome: 'failed' })] })).tipo === 'esperar');

  check('SALIÓ Y NO SE SABE: se RECONCILIA, no se reembolsa', (() => {
    const a = d(trabajo({ state: 'waiting', attempts: [intento({ dispatched: true, outcome: 'unknown' })] }));
    return a.tipo === 'reconciliar' && a.motivo === 'desenlace_desconocido';
  })());
  check('y sigue siendo reconciliar aunque el trabajo acabe en `timed_out`: puede haber un vídeo hecho al otro lado',
    d(trabajo({ state: 'timed_out', attempts: [intento({ dispatched: true, outcome: 'unknown' })] })).tipo === 'reconciliar');
  check('un intento viejo con desenlace desconocido pesa aunque el último fuera otro', (() => {
    const a = d(trabajo({ state: 'failed', attempts: [intento({ attemptId: 'a1', dispatched: true, outcome: 'unknown' }), intento({ attemptId: 'a2', dispatched: false, outcome: 'failed' })] }));
    return a.tipo === 'reconciliar';
  })());

  check('QUE SE PASE EL PLAZO NO ES UNA RAZÓN: un trabajo vencido pero vivo sigue sin tocarse',
    d(trabajo({ state: 'running', deadlineAt: AHORA - 10_000, attempts: [intento({ dispatched: true, lease: vivo })] })).tipo === 'esperar');
  check('ni que la llamada que lo empezó ya no exista: eso no está escrito en ningún sitio y no se pregunta',
    !/callable|invocacion|proceso vivo|processAlive/i.test(sinComentarios(leer('functions/src/runtime/liquidacion.ts'))));
  check('la decisión es pura: ni reloj propio, ni azar, ni Firestore, ni Credits', (() => {
    const s = sinComentarios(leer('functions/src/runtime/liquidacion.ts'));
    return !/Date\.now\(|Math\.random\(|firebase|firestore|creditEngine|spendCredits/i.test(s);
  })());
  check('y con el mismo trabajo dice lo mismo dos veces: la puede tomar otro proceso media hora después', (() => {
    const j = trabajo({ state: 'completed', attempts: [intento({ dispatched: true, outcome: 'succeeded' })] });
    return JSON.stringify(d(j)) === JSON.stringify(decidirLiquidacion(j, AHORA + 1_800_000));
  })());
}

/* ── El banco de verdad ────────────────────────────────────────────────────── */

/* El mismo Firestore de mentira que usa `runtime-premigracion` § F, para que el Credit Engine sea el DE VERDAD. */
const INC = Symbol('inc');
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && !v[INC];
const resolve = (value, existing, deep) => {
  if (value && typeof value === 'object' && value[INC] !== undefined) return (typeof existing === 'number' ? existing : 0) + value[INC];
  if (deep && isObj(value)) { const out = isObj(existing) ? { ...existing } : {}; for (const [k, v] of Object.entries(value)) out[k] = resolve(v, out[k], true); return out; }
  return value;
};
class Ref { constructor(db, p) { this.db = db; this.path = p; this.id = p.split('/').pop(); } async get() { const data = this.db.read(this.path); return { exists: data !== undefined, id: this.id, ref: this, data: () => data }; } }
class Coll {
  constructor(db, p, filters = [], max = null) { Object.assign(this, { db, path: p, filters, max }); }
  doc(id) { return new Ref(this.db, `${this.path}/${id || 'auto_' + ++this.db.autoId}`); }
  where(field, _op, value) { return new Coll(this.db, this.path, [...this.filters, [field, value]], this.max); }
  orderBy() { return this; }
  limit(x) { return new Coll(this.db, this.path, this.filters, x); }
  async get() { let rows = [...this.db.docs.entries()].filter(([p]) => p.startsWith(this.path + '/') && !p.slice(this.path.length + 1).includes('/')).filter(([, d]) => this.filters.every(([f, v]) => d[f] === v)); if (this.max) rows = rows.slice(0, this.max); const docs = rows.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: new Ref(this.db, p), data: () => clone(d) })); return { docs, empty: docs.length === 0 }; }
}
class Tx {
  constructor(db) { this.db = db; this.writes = []; }
  get(t) { return t.get(); }
  set(ref, data, opts) { this.writes.push({ kind: 'set', ref, data, merge: !!(opts && opts.merge) }); }
  update(ref, data) { this.writes.push({ kind: 'update', ref, data }); }
  commit() { for (const w of this.writes) { const ex = this.db.docs.get(w.ref.path); if (w.kind === 'set') this.db.docs.set(w.ref.path, resolve(w.data, w.merge ? ex || {} : ex, true)); else { if (!ex) throw new Error('update sobre documento inexistente'); const out = { ...ex }; for (const [k, v] of Object.entries(w.data)) out[k] = resolve(v, out[k], false); this.db.docs.set(w.ref.path, out); } } }
}
class FakeDb {
  constructor() { this.docs = new Map(); this.queue = Promise.resolve(); this.autoId = 0; }
  collection(p) { return new Coll(this, p); }
  read(p) { return this.docs.has(p) ? clone(this.docs.get(p)) : undefined; }
  /* EN SERIE, que es lo que hace Firestore con contención: justo lo que hay que probar. */
  runTransaction(fn) { const run = async () => { const tx = new Tx(this); const r = await fn(tx); tx.commit(); return r; }; const p = this.queue.then(run, run); this.queue = p.catch(() => {}); return p; }
}

const USUARIO = 'usuario1';
const nuevoBanco = async () => {
  const db = new FakeDb(); let reloj = 0;
  const engine = createCreditEngine({ db: () => db, increment: (x) => ({ [INC]: x }), now: () => ++reloj, welcomeCredits: 100, loadCosts: async () => {} });
  db.docs.set(`users/doc_${USUARIO}`, { uid: USUARIO, displayName: USUARIO });
  await engine.ensureAccount(USUARIO);
  return {
    db, engine,
    saldo: () => db.read(`users/doc_${USUARIO}`).creditsBalance,
    tx: (id) => db.read(`creditTransactions/${id}`),
    asientos: () => [...db.docs.keys()].filter((k) => k.startsWith('creditTransactions/')).map((k) => ({ id: k.split('/').pop(), ...db.read(k) })),
  };
};
/* El puerto de liquidación, sobre el Credit Engine de verdad y un libro que solo cuenta. */
const puerto = (banco, libro = { settles: [] }) => ({
  libro,
  async liquidar({ userId, reserva, importe }) {
    try {
      const r = await banco.engine.completeCredits({ userId, requestId: reserva.requestId, finalAmount: importe });
      libro.settles.push({ id: reserva.transactionId, importe });
      return { desenlace: r.status === 'COMPLETED' ? 'liquidada' : 'ya_estaba', estado: r.status };
    } catch (e) { return { desenlace: 'fallo', error: e.code ?? 'error' }; }
  },
  async reembolsar({ userId, reserva }) {
    try {
      const r = await banco.engine.refundCredits({ userId, requestId: reserva.requestId, reason: 'x', source: 'weë-runtime' });
      libro.settles.push({ id: reserva.transactionId, importe: 0 });
      return { desenlace: r.duplicate ? 'ya_estaba' : 'reembolsada', estado: 'REFUNDED' };
    } catch (e) {
      if (e.code === 'ALREADY_REFUNDED' || e.code === 'ALREADY_COMPLETED') return { desenlace: 'ya_estaba', estado: e.code };
      return { desenlace: 'fallo', error: e.code ?? 'error' };
    }
  },
});
/* Un almacén en memoria con lo que el barrendero pide. */
const almacen = (jobs = []) => {
  const porId = new Map(jobs.map((j) => [j.jobId, { job: j, marcado: false }]));
  return {
    porId,
    marcados: () => [...porId.values()].filter((x) => x.marcado).map((x) => x.job.jobId),
    async porLiquidar({ limit }) {
      const pendientes = [...porId.values()].filter((x) => !x.marcado && !!reservaDe(x.job)).slice(0, limit);
      return { jobs: pendientes.map((x) => x.job) };
    },
    async marcarLiquidado(jobId) { const x = porId.get(jobId); if (x) x.marcado = true; },
  };
};
const reservar = async (banco, requestId, amount) =>
  banco.engine.spendCredits({ userId: USUARIO, service: 'ai_video', amount, requestId, reason: 'prueba', source: 'weë' });

/* ── B · El proceso muere ──────────────────────────────────────────────────── */
console.log('\n── B · El proceso muere, y el dinero se cierra igual ──');
{
  /* A · muere ANTES de salir hacia el proveedor. */
  let banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  let antes = banco.saldo();
  let alm = almacen([trabajo({ state: 'failed', attempts: [intento({ dispatched: false, outcome: 'failed', lease: caducada })] })]);
  let r = await barrerLiquidaciones({ trabajos: alm, liquidacion: puerto(banco), ahora: () => AHORA });
  check('A · murió ANTES de salir: se devuelve entero y el saldo vuelve', r.reembolsados === 1 && banco.saldo() === antes + 3 && banco.tx('usage_op_0001').status === 'REFUNDED');

  /* B · muere DESPUÉS del proveedor, antes de liquidar. */
  banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  antes = banco.saldo();
  alm = almacen([trabajo({ state: 'completed', attempts: [intento({ dispatched: true, outcome: 'succeeded' })] })]);
  const libro = { settles: [] };
  r = await barrerLiquidaciones({ trabajos: alm, liquidacion: puerto(banco, libro), ahora: () => AHORA });
  check('B · murió DESPUÉS del proveedor: otro proceso cobra lo reservado, y el saldo no cambia', r.liquidados === 1 && banco.saldo() === antes && banco.tx('usage_op_0001').status === 'COMPLETED');
  check('C · y la fila del libro se cierra con el mismo identificador de transacción', libro.settles.length === 1 && libro.settles[0].id === 'usage_op_0001' && libro.settles[0].importe === 3);

  /* D · muere DURANTE el proveedor: la concesión sigue viva. */
  banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  antes = banco.saldo();
  alm = almacen([trabajo({ state: 'running', attempts: [intento({ dispatched: true, lease: vivo })] })]);
  r = await barrerLiquidaciones({ trabajos: alm, liquidacion: puerto(banco), ahora: () => AHORA });
  check('D · murió DURANTE el proveedor y la concesión sigue viva: no se toca nada', r.esperando === 1 && r.reembolsados === 0 && banco.saldo() === antes && banco.tx('usage_op_0001').status === 'AUTHORIZED');
  check('   y NO se marca: la siguiente pasada lo volverá a mirar', alm.marcados().length === 0);

  /* E/F · la concesión caduca y la recuperación puede seguir. */
  banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  alm = almacen([trabajo({ state: 'queued', attempts: [intento({ dispatched: false, outcome: 'failed', lease: caducada })] })]);
  r = await barrerLiquidaciones({ trabajos: alm, liquidacion: puerto(banco), ahora: () => AHORA });
  check('E/F · la concesión caducó pero el trabajo puede recuperarse: el dinero espera, no se devuelve', r.esperando === 1 && banco.tx('usage_op_0001').status === 'AUTHORIZED');
}

/* ── C · El barrendero ─────────────────────────────────────────────────────── */
console.log('\n── C · El barrendero: qué encuentra y qué hace ──');
{
  const banco = await nuevoBanco();
  for (const [id, n] of [['op_a', 1], ['op_b', 2], ['op_c', 3], ['op_d', 1], ['op_e', 2]]) await reservar(banco, id, n);
  const saldoAntes = banco.saldo();
  const meta = (id, credits) => ({ creditTransactionId: `usage_${id}`, creditRequestId: id, creditsEstimated: credits, service: 'ai_video' });
  const alm = almacen([
    trabajo({ jobId: 'j-vivo', metadata: meta('op_a', 1), state: 'running', attempts: [intento({ dispatched: true, lease: vivo })] }),
    trabajo({ jobId: 'j-hecho', metadata: meta('op_b', 2), state: 'completed', attempts: [intento({ dispatched: true, outcome: 'succeeded' })] }),
    trabajo({ jobId: 'j-fallido', metadata: meta('op_c', 3), state: 'failed', attempts: [intento({ dispatched: false, outcome: 'failed' })] }),
    trabajo({ jobId: 'j-desconocido', metadata: meta('op_d', 1), state: 'waiting', attempts: [intento({ dispatched: true, outcome: 'unknown' })] }),
    trabajo({ jobId: 'j-recuperable', metadata: meta('op_e', 2), state: 'queued', attempts: [intento({ dispatched: false, outcome: 'failed', lease: caducada })] }),
    trabajo({ jobId: 'j-sin-dinero', metadata: null, state: 'completed', attempts: [intento({ dispatched: true, outcome: 'succeeded' })] }),
  ]);
  const r = await barrerLiquidaciones({ trabajos: alm, liquidacion: puerto(banco), ahora: () => AHORA });

  check('G · distingue los seis casos en una pasada', r.mirados === 5 && r.liquidados === 1 && r.reembolsados === 1 && r.esperando === 2 && r.aReconciliar === 1, JSON.stringify({ ...r, vistos: undefined }));
  check('   el vivo sigue AUTHORIZED', banco.tx('usage_op_a').status === 'AUTHORIZED');
  check('   el terminado se cobró', banco.tx('usage_op_b').status === 'COMPLETED');
  check('   el fallido se devolvió', banco.tx('usage_op_c').status === 'REFUNDED');
  check('   el desconocido NI se cobró NI se devolvió', banco.tx('usage_op_d').status === 'AUTHORIZED');
  check('   el recuperable sigue esperando', banco.tx('usage_op_e').status === 'AUTHORIZED');
  check('el saldo cuadra: se devolvieron 3 y se cobraron 2 que ya estaban retenidos', banco.saldo() === saldoAntes + 3);
  check('marca lo que ya no hay que volver a mirar, y solo eso', alm.marcados().sort().join(',') === 'j-desconocido,j-fallido,j-hecho', alm.marcados().join(','));
  check('lo que observa lleva identificadores, no contenido', (() => {
    const v = r.vistos.find((x) => x.jobId === 'j-hecho');
    return v.requestId === 'op_b' && v.attemptId === 'a1' && v.capability === 'video.generate' && v.providerId === 'x' && v.operationId === 'oper-1' && v.traceId === 'tr-1' && !JSON.stringify(r.vistos).includes('prompt');
  })());
  check('no es un bucle: entra, recorre lo que le dejan y sale', !/while \(true\)|for \(;;\)|setInterval|setTimeout/.test(sinComentarios(leer('functions/src/runtime/barrendero.ts'))));
  check('y no reclama, ni ejecuta, ni habla con ningún proveedor', !/reclamar\(|\.ejecutar\(|gateway|adapter|\.run\(/i.test(sinComentarios(leer('functions/src/runtime/barrendero.ts'))));
}

/* ── D · Concurrencia ──────────────────────────────────────────────────────── */
console.log('\n── D · Exactamente UNA transición financiera ──');
{
  /* H · dos barrenderos a la vez, sobre el mismo trabajo terminado. */
  let banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  let antes = banco.saldo();
  const hecho = () => almacen([trabajo({ state: 'completed', attempts: [intento({ dispatched: true, outcome: 'succeeded' })] })]);
  const a1 = hecho(); const a2 = hecho();
  let [r1, r2] = await Promise.all([
    barrerLiquidaciones({ trabajos: a1, liquidacion: puerto(banco), ahora: () => AHORA }),
    barrerLiquidaciones({ trabajos: a2, liquidacion: puerto(banco), ahora: () => AHORA }),
  ]);
  /*
   * Los dos informan «queda liquidado», porque ninguno puede saber cuál de los
   * dos lo cobró: el motor contesta `COMPLETED` a los dos. Lo que importa es que
   * el dinero se movió una sola vez, y eso sí se puede comprobar.
   */
  check('H · dos barrenderos a la vez: los dos ven la reserva cerrada…', r1.liquidados === 1 && r2.liquidados === 1 && r1.fallos + r2.fallos === 0);
  check('   …y el dinero se movió UNA sola vez', banco.saldo() === antes && banco.asientos().filter((t) => t.type === 'usage').length === 1 && banco.tx('usage_op_0001').status === 'COMPLETED');
  check('   sin ningún apunte de ajuste ni de reembolso por el camino', banco.asientos().filter((t) => t.type === 'refund').length === 0);

  /* I · barrendero y «trabajador» (el camino síncrono) a la vez. */
  banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  antes = banco.saldo();
  const alm = hecho();
  const [, comoElTrabajador] = await Promise.all([
    barrerLiquidaciones({ trabajos: alm, liquidacion: puerto(banco), ahora: () => AHORA }),
    banco.engine.completeCredits({ userId: USUARIO, requestId: 'op_0001', finalAmount: 3 }),
  ]);
  check('I · barrendero y el camino de siempre a la vez: un solo cobro', banco.asientos().filter((t) => t.type === 'usage').length === 1 && banco.tx('usage_op_0001').status === 'COMPLETED' && comoElTrabajador.status === 'COMPLETED');

  /* J · liquidación y reembolso compitiendo. */
  banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  antes = banco.saldo();
  const p = puerto(banco);
  const res = reservaDe(trabajo());
  const [x, y] = await Promise.all([
    p.liquidar({ userId: USUARIO, reserva: res, importe: 3, jobId: 'j1' }),
    p.reembolsar({ userId: USUARIO, reserva: res, motivo: 'fallo_definitivo', jobId: 'j1' }),
  ]);
  const cerrada = banco.tx('usage_op_0001').status;
  check('J · cobrar y devolver a la vez: gana uno, y el otro no hace nada', (cerrada === 'COMPLETED' || cerrada === 'REFUNDED') && [x, y].filter((z) => z.desenlace === 'fallo' || z.desenlace === 'ya_estaba').length === 1);
  check('   y el saldo acaba en uno de los dos valores posibles, nunca en los dos', banco.saldo() === antes || banco.saldo() === antes + 3);

  /* M/N · repetir la misma operación. */
  banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  const q = puerto(banco);
  await q.liquidar({ userId: USUARIO, reserva: res, importe: 3, jobId: 'j1' });
  const otra = await q.liquidar({ userId: USUARIO, reserva: res, importe: 3, jobId: 'j1' });
  check('M · liquidar dos veces: sigue habiendo un solo apunte y un solo cobro', otra.desenlace === 'liquidada' && banco.asientos().filter((t) => t.type === 'usage').length === 1 && banco.asientos().filter((t) => t.type === 'refund').length === 0);
  banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  const z = puerto(banco);
  await z.reembolsar({ userId: USUARIO, reserva: res, motivo: 'no_salio', jobId: 'j1' });
  const otro = await z.reembolsar({ userId: USUARIO, reserva: res, motivo: 'no_salio', jobId: 'j1' });
  check('N · reembolsar dos veces: la segunda no devuelve nada', otro.desenlace === 'ya_estaba' && banco.asientos().filter((t) => t.type === 'refund').length === 1);
  check('R · y en ningún caso el libro tiene dos apuntes para la misma operación', banco.asientos().filter((t) => t.requestId === 'op_0001').length <= 2);
}

/* ── E · Lo que nunca pasa ─────────────────────────────────────────────────── */
console.log('\n── E · Lo que el barrendero nunca hace ──');
{
  /* P · un trabajo vivo no lo reembolsa ni aunque se pase mil veces. */
  const banco = await nuevoBanco();
  await reservar(banco, 'op_0001', 3);
  const antes = banco.saldo();
  const alm = almacen([trabajo({ state: 'running', attempts: [intento({ dispatched: true, lease: vivo })] })]);
  for (let i = 0; i < 5; i++) await barrerLiquidaciones({ trabajos: alm, liquidacion: puerto(banco), ahora: () => AHORA });
  check('P · cinco pasadas sobre un trabajo vivo: cero reembolsos', banco.tx('usage_op_0001').status === 'AUTHORIZED' && banco.saldo() === antes);

  /* K/O · desenlace desconocido, muchas pasadas. */
  const banco2 = await nuevoBanco();
  await reservar(banco2, 'op_0001', 3);
  const alm2 = almacen([trabajo({ state: 'waiting', attempts: [intento({ dispatched: true, outcome: 'unknown' })] })]);
  const r = await barrerLiquidaciones({ trabajos: alm2, liquidacion: puerto(banco2), ahora: () => AHORA });
  check('K/O · desenlace DESCONOCIDO: no produce reembolso automático, nunca', r.aReconciliar === 1 && r.reembolsados === 0 && banco2.tx('usage_op_0001').status === 'AUTHORIZED');
  check('   y se marca, para no repetir la pregunta en cada pasada: esto lo resuelve un aviso, no el tiempo', alm2.marcados().length === 1);

  /* L · el duplicado concurrente no es esto. */
  check('L · un duplicado concurrente NO es un desenlace desconocido: son dos avisos distintos, en dos ramas distintas', (() => {
    const s = sinComentarios(leer('functions/src/runtime/conductor.ts'));
    /* `waiting` (salió y no se sabe) da `outcome_unknown`; seguir `running` (lo tiene otro) da `leased_elsewhere`. */
    return /job\.state === 'waiting'\) avisos\.add\('outcome_unknown'\)/.test(s) && /avisos\.add\('leased_elsewhere'\);\s*enOtrasManos = true;/.test(s);
  })());
  check('   y la liquidación tampoco los mezcla: solo `unknown` lleva a reconciliar', (() => {
    const s = sinComentarios(leer('functions/src/runtime/liquidacion.ts'));
    return /saliaYNoSeSabe\(job\)\) return \{ tipo: 'reconciliar'/.test(s) && !/leased_elsewhere/.test(s);
  })());

  /* S · nada se queda AUTHORIZED sin una razón que se pueda nombrar. */
  check('S · lo que se queda sin cerrar dice POR QUÉ: en marcha, recuperable o a reconciliar', (() => {
    const s = leer('functions/src/runtime/liquidacion.ts');
    return /'en_marcha'/.test(s) && /'recuperable'/.test(s) && /'desenlace_desconocido'/.test(s);
  })());

  /* Q · el resumen de todo: una transición por operación. */
  const banco3 = await nuevoBanco();
  for (const [id, n] of [['op_a', 1], ['op_b', 2]]) await reservar(banco3, id, n);
  const meta = (id, c) => ({ creditTransactionId: `usage_${id}`, creditRequestId: id, creditsEstimated: c, service: 'ai_video' });
  const mundo = () => almacen([
    trabajo({ jobId: 'j-a', metadata: meta('op_a', 1), state: 'completed', attempts: [intento({ dispatched: true, outcome: 'succeeded' })] }),
    trabajo({ jobId: 'j-b', metadata: meta('op_b', 2), state: 'failed', attempts: [intento({ dispatched: false, outcome: 'failed' })] }),
  ]);
  await Promise.all([1, 2, 3].map(() => barrerLiquidaciones({ trabajos: mundo(), liquidacion: puerto(banco3), ahora: () => AHORA })));
  check('Q · tres barrenderos a la vez sobre dos operaciones: exactamente una transición cada una',
    banco3.tx('usage_op_a').status === 'COMPLETED' && banco3.tx('usage_op_b').status === 'REFUNDED'
    && banco3.asientos().filter((t) => t.type === 'refund').length === 1
    && banco3.asientos().filter((t) => t.type === 'usage').length === 2, JSON.stringify(banco3.asientos().map((t) => `${t.id}:${t.type}:${t.status}`)));
  check('   y el saldo refleja exactamente eso: se cobró 1 y se devolvieron 2', banco3.saldo() === 100 - 1);
}

/* ── F · Estructura ────────────────────────────────────────────────────────── */
console.log('\n── F · Qué se añadió, y qué NO se tocó ──');
{
  const dir = 'functions/src/runtime';
  check('dos archivos nuevos: la decisión y el barrendero', ['liquidacion.ts', 'barrendero.ts'].every((f) => fs.existsSync(path.resolve(RAIZ, dir, f))));
  check('ninguno sabe de Firestore', ['liquidacion.ts', 'barrendero.ts'].every((f) => !/firebase|firestore/i.test(sinComentarios(leer(`${dir}/${f}`)))));
  check('el barrendero no conoce el Credit Engine: lo mueve por un puerto', !/creditEngine|spendCredits|completeCredits|refundCredits/.test(sinComentarios(leer(`${dir}/barrendero.ts`))));
  check('la composición usa el Credit Engine QUE YA EXISTE, no otro', /credits\.completeCredits\(/.test(leer(`${dir}/index.ts`)) && /credits\.refundCredits\(/.test(leer(`${dir}/index.ts`)));
  check('y el libro se cierra con `settle`, como siempre', /ledger\.settle\(\{ creditTransactionId, finalAmount \}\)/.test(leer(`${dir}/index.ts`)));

  const FINANCIERO = ['functions/src/credits/creditEngine.ts', 'functions/src/credits/creditCosts.ts', 'functions/src/credits/aiPricing.ts', 'functions/src/credits/creditTransactions.ts', 'functions/src/engine/ledger.ts'];
  check('NO se tocó el Financial Core ni el Credit Engine: no hacía falta', FINANCIERO.every((f) => fs.existsSync(path.resolve(RAIZ, f))) && (() => {
    /* Los estados que hacían falta ya existían: AUTHORIZED → COMPLETED y AUTHORIZED → FAILED → REFUNDED. */
    const s = leer('functions/src/credits/creditEngine.ts');
    return /AUTHORIZED/.test(s) && /COMPLETED/.test(s) && /REFUNDED/.test(s) && /statusHistory/.test(s);
  })());
  check('no se inventó ningún estado financiero nuevo', !/REQUIRES_RECONCILIATION|SETTLED|PARTIALLY/.test(leer(`${dir}/liquidacion.ts`)));
  check('la reconciliación es una ACCIÓN del barrendero, no un estado del libro', /tipo: 'reconciliar'/.test(leer(`${dir}/liquidacion.ts`)) && !/status: 'RECONCIL/.test(leer(`${dir}/index.ts`)));

  check('la política de Brain 1/12 y los precios siguen intactos', /RESPUESTAS_POR_CREDIT/.test(leer('functions/src/creator/brainUsage.ts')) && !/RESPUESTAS_POR_CREDIT|creditsPerUsd|margin/.test(leer(`${dir}/liquidacion.ts`) + leer(`${dir}/barrendero.ts`)));
  check('el almacén es el MISMO, con un papel más: no hay un segundo almacén', /export type AlmacenDeTrabajosDeWee = JobStore & FuenteDeTrabajosPorLiquidar/.test(leer(`${dir}/almacen.ts`)));
  check('la consulta del barrendero es de campo único, como la de recuperación', /where\('liquidacion', '==', 'pendiente'\)\.orderBy\(FieldPath\.documentId\(\)\)/.test(leer(`${dir}/almacen.ts`)));
  check('y la marca no toca la verdad del trabajo: escribe un campo, no el `json`', /update\(\{ liquidacion: 'hecha' \}\)/.test(leer(`${dir}/almacen.ts`)));

  check('NADIE LO LLAMA: no hay barrendero programado ni nada asíncrono conectado', (() => {
    const vivos = ['functions/src/index.ts', 'functions/src/creator/index.ts', 'functions/src/creator/brain.ts', 'functions/src/creator/video.ts'];
    return vivos.every((f) => !/barrerLiquidaciones|barrendero/.test(sinComentarios(leer(f))));
  })());
  check('ni hay una Function nueva, ni un scheduler', !/onSchedule|pubsub\.schedule|CloudScheduler/.test(leer('functions/src/index.ts')));
  check('y el trabajo ya lleva lo que haría falta para cerrarlo desde fuera', /creditRequestId: requestId/.test(leer('functions/src/creator/brain.ts')));
}

/* ── G · El Gateway puede decir «lo tengo» ─────────────────────────────────── */
console.log('\n── G · ACCEPTED: el proveedor la cogió, y eso no es ni terminada ni desconocida ──');
{
  const core = lib('core/index.js');
  const registroDeWee = lib('registry/index.js');

  const adaptador = (id, caps = ['video.generate']) => ({
    id, name: id, modalities: ['video'], models: [{ id: `${id}-1`, provider: id, capabilities: caps, quality: 3, speed: 3, cost: { unit: 'call', usd: 0.5 } }],
    isConfigured: () => true, supports: (c) => caps.includes(c),
    async run() { throw new Error('no se usa: el ejecutor es de mentira'); },
  });
  const mundoGateway = (ejecutor) => {
    const adapters = { v: adaptador('v') };
    const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, {}));
    const trazas = [];
    return { trazas, gateway: core.crearGateway({ registry: registro, executor: ejecutor, tracer: { record: (t) => trazas.push(t) }, now: () => AHORA }) };
  };
  const peticion = (extra = {}) => ({
    contract: '1.0', capability: 'video.generate',
    implementation: { providerId: 'v', modelId: 'v-1' },
    input: { prompt: 'un gato con sombrero' },
    trace: { traceId: 'trace-acc', requestId: 'req-acc-0001', userId: USUARIO },
    idempotencyKey: 'idem-acc-0001',
    execution: { mode: 'sync' },
    ...extra,
  });
  const OP = { providerId: 'v', operationId: 'task_abc123' };

  /* A · síncrono. */
  const RESPUESTA = { kind: 'video', urls: ['https://x/v.mp4'], durationSec: 5, actual: { provider: { lines: [], usd: 0.4, model: 'v-1' }, latencyMs: 30 }, model: 'v-1' };
  const sincrono = mundoGateway({ async run() { return { ok: true, response: RESPUESTA, usage: { inputTokens: 9, outputTokens: 4 } }; } });
  const rA = await sincrono.gateway.ejecutar(peticion());
  check('A · proveedor síncrono → COMPLETED, con su respuesta', rA.status === 'completed' && rA.response?.kind === 'video' && rA.operation === undefined, `${rA.status} ${JSON.stringify(rA.error ?? '')}`);

  /* B · asíncrono. */
  const asincrono = mundoGateway({ async run() { return { ok: true, accepted: true, operation: OP, usage: { inputTokens: 9, outputTokens: 4 } }; } });
  const rB = await asincrono.gateway.ejecutar(peticion());
  check('B · proveedor asíncrono → ACCEPTED, con el nombre que él le da a la tarea', rB.status === 'accepted' && rB.operation?.operationId === 'task_abc123' && rB.operation?.providerId === 'v');
  check('C · ACCEPTED no es COMPLETED: no trae respuesta', rB.status !== 'completed' && rB.response === undefined);
  check('D · ni es FAILED: no trae error', rB.status !== 'failed' && rB.error === undefined);
  check('G · conserva los identificadores de quien lo pidió', rB.requestId === 'req-acc-0001' && rB.traceId === 'trace-acc' && rB.idempotencyKey === 'idem-acc-0001' && rB.implementation.modelId === 'v-1');
  check('y lo que el proveedor ya dijo haber consumido al aceptar viaja también', rB.usage?.inputTokens === 9, JSON.stringify(rB.usage ?? null));
  check('sin inventarse el aviso de «falta el uso»: un acuse no tiene por qué traerlo', !(await mundoGateway({ async run() { return { ok: true, accepted: true, operation: OP }; } }).gateway.ejecutar(peticion())).warnings.includes('usage_missing'));
  check('K · es idempotente: la misma petición dos veces da lo mismo', JSON.stringify({ ...(await asincrono.gateway.ejecutar(peticion())), timing: 0 }) === JSON.stringify({ ...rB, timing: 0 }));
  check('deja UNA traza, y dice que fue aceptada', asincrono.trazas.length === 2 && asincrono.trazas[0].status === 'ok');

  /* L · aceptar sin decir cómo se llama la tarea no es aceptar. */
  const manco = mundoGateway({ async run() { return { ok: true, accepted: true, operation: undefined }; } });
  const rL = await manco.gateway.ejecutar(peticion());
  check('L · «aceptada» sin referencia del proveedor NO se da por buena: sería un callejón sin salida', rL.status === 'failed' && rL.error?.details?.reason === 'accepted_without_operation');
  const raro = mundoGateway({ async run() { return { ok: true, accepted: true, operation: { providerId: 'v', operationId: 'con espacios y /' } }; } });
  check('   ni una referencia con cualquier cosa dentro', (await raro.gateway.ejecutar(peticion())).status === 'failed');

  /* M · los proveedores síncronos no cambian. */
  check('M · un ejecutor que nunca dice «aceptada» se comporta EXACTAMENTE igual que antes', (() => {
    const s = sinComentarios(leer('functions/src/core/gateway.ts'));
    /* La rama nueva está DESPUÉS de los errores y ANTES de validar la respuesta, y no toca ninguna de las dos. */
    return s.indexOf('if (!salida.ok)') < s.indexOf('salida.accepted === true') && s.indexOf('salida.accepted === true') < s.indexOf('respuestaCanonicaValida(salida.response)');
  })());

  /* H/I/J · qué hace el Job Engine con eso. */
  const trabajosDeWee = lib('job/index.js');
  const dispatch = {
    jobId: 'j-acc', attemptId: 'a-acc', attempt: 1, capability: 'video.generate',
    implementation: { providerId: 'v', modelId: 'v-1', adapterId: 'adapter:v' },
    input: { prompt: 'x' }, trace: { traceId: 'trace-acc', requestId: 'req-acc-0001', userId: USUARIO }, idempotencyKey: 'idem-acc-0001',
  };
  const informe = trabajosDeWee.informeDelGateway(dispatch, rB, { providerId: 'v', operationId: 'task_abc123' });
  check('H · el intento se cierra como SALIDO y con el desenlace todavía sin conocer', informe.dispatched === true && informe.outcome === 'unknown');
  check('I · y se queda anotado cómo llama el proveedor a la tarea: por ahí se preguntará después', informe.providerRef?.operationId === 'task_abc123');
  check('E/F · no trae resultado ni error: ni se cobra ni se devuelve por esto', informe.result === undefined && informe.error === undefined);
  const informeDeFallo = trabajosDeWee.informeDelGateway(dispatch, { ...rB, status: 'failed', error: { code: 'PROVIDER_ERROR', source: 'gateway' } });
  check('J · un fallo de verdad sigue siendo un fallo, no una aceptación', informeDeFallo.outcome === 'failed');

  /* Y lo que la liquidación hace con la diferencia. */
  const conRef = trabajo({ state: 'waiting', attempts: [{ ...intento({ dispatched: true, outcome: 'unknown' }), providerRef: { providerId: 'v', operationId: 'task_abc123' } }] });
  const sinRef = trabajo({ state: 'waiting', attempts: [intento({ dispatched: true, outcome: 'unknown' })] });
  check('ACEPTADA: el dinero ESPERA, y se dice por qué', (() => { const a = decidirLiquidacion(conRef, AHORA); return a.tipo === 'esperar' && a.motivo === 'aceptada_por_el_proveedor'; })());
  check('SIN NOTICIAS: eso sí es incertidumbre, y se reconcilia', decidirLiquidacion(sinRef, AHORA).tipo === 'reconciliar');
  check('y una aceptada que muere por plazo tampoco se devuelve sola: se le pregunta al proveedor',
    decidirLiquidacion({ ...conRef, state: 'timed_out' }, AHORA).tipo === 'reconciliar');
  check('UNKNOWN sigue reservado para la incertidumbre de verdad', decidirLiquidacion(sinRef, AHORA).motivo === 'desenlace_desconocido');
}

/* ── H · Quién le pide al barrendero que pase ──────────────────────────────── */
console.log('\n── H · El programador: dispara una pasada, y nada más ──');
{
  const { pasarElBarrendero, CADA_CUANTO_POR_DEFECTO_MIN } = lib('runtime/barrido.js');
  let reloj = 100;
  const reloj_ = () => (reloj += 10);
  let nombre = 0;
  const base = (barrer) => ({ barrer, ahora: reloj_, identificador: () => `sweep-${++nombre}` });

  /* 1 · dispara una pasada. */
  let veces = 0;
  const r1 = await pasarElBarrendero(base(async () => { veces++; return { mirados: 3, liquidados: 1, reembolsados: 1, esperando: 1, aReconciliar: 0, yaEstaban: 0, fallos: 0, vistos: [] }; }));
  check('1 · dispara UNA pasada y devuelve sus metadatos', veces === 1 && r1.examined === 3 && r1.settled === 1 && r1.refunded === 1 && r1.skipped === 1 && r1.sweepId === 'sweep-1' && r1.durationMs >= 0);
  check('   y solo metadatos: ni prompts, ni respuestas, ni identificadores de nadie', !/prompt|text|content|userId|apiKey/i.test(JSON.stringify(r1)));

  /* 2/3 · dos a la vez, y una lenta. */
  let dentro = 0; let maximoALaVez = 0;
  const lenta = async () => { dentro++; maximoALaVez = Math.max(maximoALaVez, dentro); await new Promise((s) => setTimeout(s, 20)); dentro--; return { mirados: 1, liquidados: 1, reembolsados: 0, esperando: 0, aReconciliar: 0, yaEstaban: 0, fallos: 0, vistos: [] }; };
  const [a, b] = await Promise.all([pasarElBarrendero(base(lenta)), pasarElBarrendero(base(lenta))]);
  check('2/3 · dos pasadas a la vez: las dos corren, sin cerrojo y sin estorbarse', maximoALaVez === 2 && a.examined === 1 && b.examined === 1 && a.sweepId !== b.sweepId);
  check('   y no hay ningún candado en memoria: sería un candado que solo vale con una instancia', !/let (corriendo|enMarcha|lock)|Mutex|global\./.test(sinComentarios(leer('functions/src/runtime/barrido.ts'))));

  /* 4 · sin pendientes. */
  const r4 = await pasarElBarrendero(base(async () => ({ mirados: 0, liquidados: 0, reembolsados: 0, esperando: 0, aReconciliar: 0, yaEstaban: 0, fallos: 0, vistos: [] })));
  check('4 · sin nada pendiente: una pasada en blanco, sin errores', r4.examined === 0 && r4.errors === 0 && r4.pending === false);

  /* 7 · con UNKNOWN. */
  const r7 = await pasarElBarrendero(base(async () => ({ mirados: 1, liquidados: 0, reembolsados: 0, esperando: 0, aReconciliar: 1, yaEstaban: 0, fallos: 0, vistos: [] })));
  check('7 · lo que hay que reconciliar se cuenta aparte, y NO como reembolso', r7.unknown === 1 && r7.refunded === 0 && r7.settled === 0);

  /* 11/12 · falla la pasada. */
  let intentos = 0;
  const rota = base(async () => { intentos++; if (intentos === 1) throw new Error('firestore se cayó'); return { mirados: 2, liquidados: 2, reembolsados: 0, esperando: 0, aReconciliar: 0, yaEstaban: 0, fallos: 0, vistos: [] }; });
  const r11 = await pasarElBarrendero(rota);
  check('11 · si la pasada revienta NO lanza: se cuenta el error y queda pendiente', r11.errors === 1 && r11.pending === true && r11.examined === 0);
  const r12 = await pasarElBarrendero(rota);
  check('12 · y la siguiente pasada sigue como si nada: no se perdió ningún trabajo', r12.errors === 0 && r12.settled === 2);

  /* Quedan páginas. */
  const r13 = await pasarElBarrendero(base(async () => ({ mirados: 100, liquidados: 100, reembolsados: 0, esperando: 0, aReconciliar: 0, yaEstaban: 0, fallos: 0, cursor: 'j.x', vistos: [] })));
  check('si quedan páginas sin mirar, lo dice: la siguiente sigue por ahí', r13.pending === true && r13.examined === 100);

  /* La frecuencia. */
  check('la frecuencia es configuración razonada, no una constante escondida', CADA_CUANTO_POR_DEFECTO_MIN === 5 && /timeoutsMs\.video/.test(leer('functions/src/runtime/barrido.ts')));
  check('y se puede cambiar sin tocar código', /SETTLEMENT_SWEEP_MINUTES/.test(leer('functions/src/settlement/programado.ts')));

  /* Lo que el programador NO decide. */
  const PROG = sinComentarios(leer('functions/src/settlement/programado.ts'));
  check('el programador no decide nada: ni cobros, ni reembolsos, ni recuperación, ni propiedad', !/completeCredits|refundCredits|decidirLiquidacion|reclamar|owner|recuperables/.test(PROG));
  check('ni guarda estado entre pasadas', !/^(let|var) /m.test(PROG.replace(/^import[\s\S]*?;$/gm, '')) && !/new Map\(|new Set\(/.test(PROG));
  check('y el runtime no sabe de Firebase Scheduler: la dependencia va al revés', !/onSchedule|firebase-functions/.test(sinComentarios(leer('functions/src/runtime/barrido.ts')) + sinComentarios(leer('functions/src/runtime/barrendero.ts'))));
  /*
   * ESTO CAMBIÓ CON EL PASO I: la tarea programada SÍ está desplegada. Lo que
   * NO cambió es qué decide —nada— ni quién decide: sigue siendo `runtime/`.
   * Se mira el código sin comentarios a propósito: nombrar algo al explicarlo
   * no es exportarlo, y la comprobación anterior confundía las dos cosas.
   */
  const INDEX = sinComentarios(leer('functions/src/index.ts'));
  check('la tarea programada SÍ está desplegada: `index.ts` la exporta', /export \{ barridoDeLiquidacion \} from '\.\/settlement\/programado'/.test(INDEX));
  check('y es lo ÚNICO que sale de settlement/: una tarea, no un módulo entero', (INDEX.match(/from '\.\/settlement\//g) || []).length === 1);
  check('cada cinco minutos, que es el valor razonado y no uno cualquiera', CADA_CUANTO_POR_DEFECTO_MIN === 5 && /every \$\{minutosDelBarrido\(\)\} minutes/.test(PROG));
  check('no hay temporizadores por trabajo, ni sondeo ocupado, ni nada dentro de Brain', !/setInterval|setTimeout/.test(sinComentarios(leer('functions/src/runtime/barrendero.ts'))) && !/barrer|barrendero|sweep/i.test(sinComentarios(leer('functions/src/creator/brain.ts'))));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
