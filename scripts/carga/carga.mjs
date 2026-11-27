/*
 * FRENTE I · CARGA CONTROLADA DE LOS CALLABLES CRÍTICOS DE WEË (en el emulador de Firestore).
 *
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:18100 GCLOUD_PROJECT=demo-wee-carga \
 *     node scripts/carga/carga.mjs --escenarios dinero,cupo --escalones 1,10,25,50,100 --salida resultados.json
 *
 * Cada escenario se mide por ESCALONES de concurrencia: N operaciones soltadas a la vez (Promise.all) y repetidas hasta
 * juntar ~CARGA_MUESTRAS muestras (por defecto 60). De cada escalón sale: latencia p50/p95/p99/máx, errores por código,
 * transacciones de Firestore y cuántas se REINTENTARON (contención) o acabaron ABORTED, los documentos más escritos,
 * y la memoria/CPU del proceso. Los escenarios con dinero o cupo comprueban además sus invariantes contra lo guardado.
 *
 * Escenarios:
 *   dinero      spendCredits+completeCredits del Credit Engine — cuentas distintas / la MISMA cuenta.
 *   dinero-ab   lo mismo en cuentas distintas, con y sin las escrituras a creditStats (experimento: aísla su coste).
 *   callables   getCreditsBalance y spendCredits por su callable compilado (`.run`).
 *   cupo        limiter.reserve — cuentas distintas / la misma cuenta contra un tope de 12 (vídeo).
 *   libro       ledger.open + ledger.close (aiGenerations + aiUsage/{día}) — cuentas distintas.
 *   brain       brainChat compilado — cuentas distintas (chat nuevo) / la misma cuenta (mensajes distintos).
 *   creator     creatorChat → creatorQuote → creatorRun compilados, proveedor mock — cuentas distintas.
 *
 * Solo emulador, proyecto demo-*, red cortada, proveedor mock (ver _entorno.mjs). Nada de esto es capacidad en
 * usuarios reales: es contención y lógica.
 */
import fs from 'node:fs';
import {
  alta, avisos, conRecursos, contarErrores, creditEngine, cronometrar, db, decir, intentosDeRed, lib, medidor, mock,
  movimientosDe, nuevaCuenta, resumenLatencias, RUN, saldoDe,
} from './_entorno.mjs';

const arg = (nombre, defecto) => { const i = process.argv.indexOf(`--${nombre}`); return i > 0 ? process.argv[i + 1] : defecto; };
const ESCENARIOS = String(arg('escenarios', 'dinero')).split(',');
const ESCALONES = String(arg('escalones', '1,10,25,50,100')).split(',').map(Number);
const MUESTRAS = Number(process.env.CARGA_MUESTRAS || 60);
const SALIDA = arg('salida', null);
const LIMITE_MS = Number(process.env.CARGA_LIMITE_MS || 270_000);
const inicio = Date.now();
const resultados = [];

/** k cuentas nuevas ya inicializadas (alta directa, ver _entorno.mjs), fuera del reloj. */
const altas = (k) => Promise.all(Array.from({ length: k }, () => alta(nuevaCuenta())));
const rondasPara = (n) => Math.max(1, Math.ceil(MUESTRAS / n));

/** Mide un escalón: `preparar(ronda)` fuera del reloj; `operaciones(ctx)` devuelve N funciones que se sueltan a la vez. */
async function escalon({ escenario, variante, n, preparar, operaciones, comprobar }) {
  if (process.env.CARGA_VARIANTES && !new RegExp(process.env.CARGA_VARIANTES).test(`${escenario}/${variante}`)) return;
  if (Date.now() - inicio > LIMITE_MS) { decir(`  (omitido ${escenario}/${variante} N=${n}: se acaba el tiempo de la tanda)`); return; }
  const rondas = rondasPara(n);
  const lat = [];
  const todas = [];
  const fallosInvariante = [];
  medidor.reiniciar();
  const llamadasAntes = mock.llamadas;
  const { recursos } = await conRecursos(async () => {
    for (let r = 0; r < rondas; r++) {
      const ctx = preparar ? await preparar(r, n) : {};
      const pausaMedidor = medidor.foto();
      const fns = operaciones(ctx, n);
      const rs = await Promise.all(fns.map((f) => cronometrar(f)));
      for (const x of rs) { lat.push(x.ms); todas.push(x); }
      void pausaMedidor;
      if (comprobar) { const fallo = await comprobar(ctx, rs, n); if (fallo) fallosInvariante.push(fallo); }
    }
  });
  const fila = {
    escenario, variante, n, rondas, ...resumenLatencias(lat),
    ok: todas.filter((x) => x.ok).length, errores: contarErrores(todas),
    tx: medidor.foto(), calientes: medidor.calientes(5), llamadasMock: mock.llamadas - llamadasAntes,
    invariantes: fallosInvariante.length ? fallosInvariante.slice(0, 3) : 'OK', recursos,
  };
  resultados.push(fila);
  decir(`  ${escenario}/${variante} N=${String(n).padStart(3)} ×${rondas}  p50 ${fila.p50} · p95 ${fila.p95} · p99 ${fila.p99} · máx ${fila.max} ms  ok ${fila.ok}/${lat.length}`
    + `  err ${JSON.stringify(fila.errores)}  tx ${fila.tx.transacciones} reint ${fila.tx.reintentadas} maxInt ${fila.tx.maxIntentos} abort ${fila.tx.abortadas}`
    + `  inv ${fila.invariantes === 'OK' ? 'OK' : 'FALLA ' + JSON.stringify(fila.invariantes)}  cpu ${recursos.cpuPorPared} rss ${recursos.picoRssMB} MB`);
}

/* ══ dinero ══════════════════════════════════════════════════════════════════ */
const gastarYCompletar = (motor, uid, requestId) => async () => {
  const s = await motor.spendCredits({ userId: uid, service: 'ai_brain', amount: 1, requestId, source: 'carga' });
  if (!s.duplicate) await motor.completeCredits({ userId: uid, requestId });
  return s;
};
async function invariantesDeDinero(uid, inicial) {
  const [s, mov] = [await saldoDe(uid), await movimientosDe(uid)];
  const usos = mov.filter((m) => m.type === 'usage');
  const suma = mov.filter((m) => m.type === 'usage' || m.type === 'refund').reduce((a, m) => a + Number(m.amount || 0), 0);
  const colgadas = usos.filter((m) => m.status === 'AUTHORIZED').length;
  if (s < 0 || inicial + suma !== s || colgadas) return { uid: uid.slice(-5), saldo: s, inicial, suma, colgadas };
  return null;
}

async function escenarioDinero() {
  decir('▶ dinero');
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'dinero', variante: 'cuentas-distintas', n,
      preparar: async (r, k) => ({ cuentas: await altas(k) }),
      operaciones: ({ cuentas }) => cuentas.map((u, i) => gastarYCompletar(creditEngine, u, `carga_${RUN}_${u}_${i}`)),
      comprobar: async ({ cuentas }) => {
        for (const u of cuentas.slice(0, 5)) { const f = await invariantesDeDinero(u, 240); if (f) return f; }
        return null;
      },
    });
  }
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'dinero', variante: 'misma-cuenta', n,
      preparar: async () => { const u = await alta(nuevaCuenta(), 100_000); return { u }; },
      operaciones: ({ u }, k) => Array.from({ length: k }, (_, i) => gastarYCompletar(creditEngine, u, `carga_${RUN}_${u}_m${i}`)),
      comprobar: async ({ u }, rs) => {
        const f = await invariantesDeDinero(u, 100_000);
        if (f) return f;
        const cobradas = rs.filter((x) => x.ok).length;
        const s = await saldoDe(u);
        return s === 100_000 - cobradas ? null : { u: u.slice(-5), saldo: s, cobradas };
      },
    });
  }
}

/* Experimento A/B: el MISMO motor, con y sin las dos escrituras a creditStats (global y diario) de cada transacción. */
async function escenarioDineroAB() {
  decir('▶ dinero-ab');
  const { createCreditEngine } = lib('credits/creditEngine.js');
  const { FieldValue, Timestamp } = await import('./_entorno.mjs');
  const sinStats = () => ({
    collection: (p) => db.collection(p),
    runTransaction: (fn) => db.runTransaction((tx) => fn(new Proxy(tx, {
      get(t, prop) {
        if (prop === 'set') return (ref, ...resto) => (String(ref.path).startsWith('creditStats/') ? t : t.set(ref, ...resto));
        const v = t[prop];
        return typeof v === 'function' ? v.bind(t) : v;
      },
    }))),
  });
  const motorSinStats = createCreditEngine({ db: sinStats, increment: (n) => FieldValue.increment(n), now: () => Timestamp.now(), welcomeCredits: 240, loadCosts: async () => {} });
  const motorCon = createCreditEngine({ db: () => db, increment: (n) => FieldValue.increment(n), now: () => Timestamp.now(), welcomeCredits: 240, loadCosts: async () => {} });
  for (const [variante, motor] of [['con-creditStats', motorCon], ['sin-creditStats', motorSinStats]]) {
    for (const n of ESCALONES) {
      await escalon({
        escenario: 'dinero-ab', variante, n,
        preparar: async (r, k) => ({ cuentas: await altas(k) }),
        operaciones: ({ cuentas }) => cuentas.map((u, i) => gastarYCompletar(motor, u, `ab_${RUN}_${variante}_${u}_${i}`)),
      });
    }
  }
}

/* ══ callables de Credits ════════════════════════════════════════════════════ */
async function escenarioCallables() {
  decir('▶ callables');
  const cred = lib('credits/index.js');
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'getCreditsBalance', variante: 'cuentas-distintas', n,
      preparar: async (r, k) => ({ cuentas: await altas(k) }),
      operaciones: ({ cuentas }) => cuentas.map((uid) => () => cred.getCreditsBalance.run({ auth: { uid }, data: {} })),
    });
  }
  for (const n of ESCALONES) {
    /* Primera apertura: la cuenta NO está inicializada y la misma persona abre el saldo N veces a la vez (bienvenida una vez). */
    await escalon({
      escenario: 'getCreditsBalance', variante: 'misma-cuenta-primera-vez', n,
      preparar: async () => { const u = nuevaCuenta(); await db.collection('users').doc(`doc_${u}`).set({ uid: u, displayName: u }); return { u }; },
      operaciones: ({ u }, k) => Array.from({ length: k }, () => () => cred.getCreditsBalance.run({ auth: { uid: u }, data: {} })),
      comprobar: async ({ u }) => {
        const mov = await movimientosDe(u);
        const bienvenidas = mov.filter((m) => m.source === 'welcome').length;
        const s = await saldoDe(u);
        return bienvenidas === 1 && s === 240 ? null : { u: u.slice(-5), bienvenidas, saldo: s };
      },
    });
  }
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'spendCredits(callable)', variante: 'misma-cuenta', n,
      preparar: async () => ({ u: await alta(nuevaCuenta(), 100_000) }),
      operaciones: ({ u }, k) => Array.from({ length: k }, (_, i) => () => cred.spendCredits.run({ auth: { uid: u, token: { admin: true } }, data: { service: 'ai_brain', requestId: `cb_${RUN}_${u}_${i}` } })),
      comprobar: async ({ u }, rs) => {
        const s = await saldoDe(u);
        const mov = (await movimientosDe(u)).filter((m) => m.type === 'usage');
        const cobrado = mov.reduce((a, m) => a - Number(m.amount), 0);
        return s === 100_000 - cobrado && mov.length === rs.filter((x) => x.ok).length ? null : { saldo: s, cobrado, usos: mov.length };
      },
    });
  }
}

/* ══ cupo ════════════════════════════════════════════════════════════════════ */
async function escenarioCupo() {
  decir('▶ cupo');
  const { limiter, DEFAULT_LIMITS } = lib('engine/limits.js');
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'limiter.reserve', variante: 'cuentas-distintas', n,
      preparar: async (r, k) => ({ cuentas: Array.from({ length: k }, () => nuevaCuenta()) }),
      operaciones: ({ cuentas }) => cuentas.map((u) => () => limiter.reserve(u, { text: 1 }, DEFAULT_LIMITS)),
    });
  }
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'limiter.reserve', variante: 'misma-cuenta-tope-12', n,
      preparar: async () => ({ u: nuevaCuenta() }),
      operaciones: ({ u }, k) => Array.from({ length: k }, (_, i) => () => limiter.reserve(u, { video: 1 }, DEFAULT_LIMITS, `op_${i}`)),
      comprobar: async ({ u }, rs, k) => {
        const dia = new Date().toISOString().slice(0, 10);
        const usado = (await db.collection('aiRateLimits').doc(`${u}_${dia}`).get()).data()?.video ?? 0;
        const ok = rs.filter((x) => x.ok).length;
        const esperado = Math.min(k, DEFAULT_LIMITS.perUserPerDay.video);
        /* Nunca por encima del tope y el contador = lo concedido. Un ABORTED (contención agotada) no ocupa hueco: se informa, no falla. */
        const soloLimiteOAbort = rs.filter((x) => !x.ok).every((x) => x.codigo === 'RATE_LIMITED' || x.codigo === '10');
        return ok <= esperado && usado === ok && soloLimiteOAbort ? null : { ok, usado, esperado, errores: contarErrores(rs) };
      },
    });
  }
}

/* ══ libro ═══════════════════════════════════════════════════════════════════ */
async function escenarioLibro() {
  decir('▶ libro');
  const { firestoreLedger } = lib('engine/ledger.js');
  const dia = new Date().toISOString().slice(0, 10);
  const proveedor = `carga${RUN}`;
  let esperadas = 0;
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'ledger.open+close', variante: 'cuentas-distintas', n,
      preparar: async (r, k) => ({ cuentas: Array.from({ length: k }, () => nuevaCuenta()) }),
      operaciones: ({ cuentas }) => cuentas.map((u, i) => async () => {
        const id = await firestoreLedger.open({ requestId: `lib_${u}_${i}`, userId: u, capability: 'text.generate', modality: 'text', provider: proveedor,
          model: 'mock', attempt: 1, estimatedUsd: 0.001, creditsEstimated: 1 });
        await firestoreLedger.close(id, { status: 'COMPLETED', providerCost: 0.001, durationMs: 10 });
        esperadas++;
      }),
      comprobar: async () => {
        const u = (await db.collection('aiUsage').doc(dia).get()).data()?.byProvider?.[proveedor]?.calls ?? 0;
        return u === esperadas ? null : { aiUsageCalls: u, esperadas };
      },
    });
  }
}

/* ══ brain ═══════════════════════════════════════════════════════════════════ */
async function escenarioBrain() {
  decir('▶ brain');
  const brain = lib('creator/brain.js');
  const enviar = (uid, data) => () => brain.brainChat.run({ auth: { uid }, data: { locale: 'es', ...data } });
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'brainChat', variante: 'cuentas-distintas', n,
      preparar: async (r, k) => ({ cuentas: await altas(k) }),
      operaciones: ({ cuentas }) => cuentas.map((u, i) => enviar(u, { message: `hola ${i}`, messageId: `m_${RUN}_${i}` })),
    });
  }
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'brainChat', variante: 'misma-cuenta', n,
      preparar: async () => ({ u: await alta(nuevaCuenta()) }),
      operaciones: ({ u }, k) => Array.from({ length: k }, (_, i) => enviar(u, { message: `pregunta ${i}`, messageId: `mm_${RUN}_${i}` })),
      comprobar: async ({ u }, rs) => {
        const c = (await db.collection('brainUsage').doc(u).get()).data() || {};
        const regs = (await db.collection('brainUsage').doc(u).collection('respuestas').get()).size;
        const mov = await movimientosDe(u);
        const cobros = mov.filter((m) => m.type === 'usage' && m.status === 'COMPLETED').length;
        const s = await saldoDe(u);
        const entregadas = rs.filter((x) => x.ok).length;
        const ok = (c.respuestasTotales ?? 0) === entregadas && regs === entregadas && cobros === Math.floor(entregadas / 12) && s === 240 - cobros
          && mov.filter((m) => m.status === 'AUTHORIZED').length === 0;
        return ok ? null : { totales: c.respuestasTotales, regs, entregadas, cobros, saldo: s };
      },
    });
  }
}

/* ══ creator ═════════════════════════════════════════════════════════════════ */
async function escenarioCreator() {
  decir('▶ creator');
  const cr = lib('creator/index.js');
  const EXP = process.env.CARGA_EXPERIENCIA || 'writer';
  const preguntar = async (uid) => {
    let r = await cr.creatorChat.run({ auth: { uid }, data: { experienceId: EXP, goal: 'un poema corto sobre el mar', locale: 'es' } });
    for (let i = 0; i < 8 && r.status === 'asking' && r.question; i++) {
      const q = r.question;
      const answer = q.options?.length ? { questionId: q.id, optionId: q.options[0].id } : { questionId: q.id, text: 'no sé' };
      r = await cr.creatorChat.run({ auth: { uid }, data: { jobId: r.jobId, answer } });
    }
    return r;
  };
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'creatorChat(hasta-plan)', variante: 'cuentas-distintas', n,
      preparar: async (r, k) => ({ cuentas: await altas(k) }),
      operaciones: ({ cuentas }) => cuentas.map((u) => async () => { const r = await preguntar(u); if (r.status !== 'planned') throw Object.assign(new Error(`sin plan: ${r.status}`), { code: 'SIN_PLAN' }); return r; }),
    });
  }
  /* Quote y Run sobre trabajos ya planificados (preparación fuera del reloj). */
  const planificados = async (k) => Promise.all(Array.from({ length: k }, async () => { const u = await alta(nuevaCuenta()); const r = await preguntar(u); return { u, jobId: r.jobId, status: r.status }; }));
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'creatorQuote', variante: 'cuentas-distintas', n,
      preparar: async (r, k) => ({ trabajos: await planificados(k) }),
      operaciones: ({ trabajos }) => trabajos.map(({ u, jobId }) => () => cr.creatorQuote.run({ auth: { uid: u }, data: { jobId, quality: 'standard' } })),
    });
  }
  for (const n of ESCALONES) {
    await escalon({
      escenario: 'creatorRun', variante: 'cuentas-distintas', n,
      preparar: async (r, k) => ({ trabajos: await planificados(k) }),
      operaciones: ({ trabajos }) => trabajos.map(({ u, jobId }) => () => cr.creatorRun.run({ auth: { uid: u }, data: { jobId } })),
      comprobar: async ({ trabajos }) => {
        for (const { u } of trabajos.slice(0, 5)) { const f = await invariantesDeDinero(u, 240); if (f) return f; }
        return null;
      },
    });
  }
  /* Ráfaga sobre el MISMO trabajo: N creatorRun a la vez → uno trabaja, el resto DUPLICATE_REQUEST, un solo cobro. */
  for (const n of ESCALONES.filter((x) => x > 1)) {
    await escalon({
      escenario: 'creatorRun', variante: 'mismo-trabajo', n,
      preparar: async () => (await planificados(1))[0],
      operaciones: ({ u, jobId }, k) => Array.from({ length: k }, () => () => cr.creatorRun.run({ auth: { uid: u }, data: { jobId } })),
      comprobar: async ({ u }, rs) => {
        const f = await invariantesDeDinero(u, 240);
        const usos = (await movimientosDe(u)).filter((m) => m.type === 'usage');
        const raros = rs.filter((x) => !x.ok && x.codigo !== 'DUPLICATE_REQUEST' && !/marcha/i.test(x.mensaje));
        return !f && usos.length <= 1 && rs.filter((x) => x.ok).length >= 1 && raros.length === 0 ? null : { f, usos: usos.length, errores: contarErrores(rs) };
      },
    });
  }
}

/* ══ sonda del emulador: ¿de dónde sale la contención entre cuentas DISTINTAS? ════════════════════════════
 * Tres transacciones mínimas sobre cuentas distintas (nada compartido en los datos), que solo cambian en UNA cosa:
 *   get-por-ref        tx.get(users/doc_X) + tx.update(users/doc_X)
 *   consulta-uid       tx.get(users where uid == X limit 10) + tx.update(...)   ← lo que hace findAccount del Credit Engine
 *   ref+global         get-por-ref + tx.set(cargaSonda/global, increment) en merge ← lo que hace writeStats */
async function escenarioSonda() {
  decir('▶ sonda');
  const { FieldValue } = await import('./_entorno.mjs');
  const variantes = {
    'get-por-ref': (u) => db.runTransaction(async (tx) => { const r = db.collection('users').doc(`doc_${u}`); const s = await tx.get(r); tx.update(r, { n: (s.data()?.n || 0) + 1 }); }),
    'consulta-uid': (u) => db.runTransaction(async (tx) => { const q = await tx.get(db.collection('users').where('uid', '==', u).limit(10)); tx.update(q.docs[0].ref, { n: (q.docs[0].data()?.n || 0) + 1 }); }),
    'ref+global': (u) => db.runTransaction(async (tx) => { const r = db.collection('users').doc(`doc_${u}`); const s = await tx.get(r); tx.update(r, { n: (s.data()?.n || 0) + 1 });
      tx.set(db.collection('cargaSonda').doc('global'), { n: FieldValue.increment(1) }, { merge: true }); }),
  };
  for (const [variante, fn] of Object.entries(variantes)) {
    for (const n of ESCALONES) {
      await escalon({ escenario: 'sonda', variante, n, preparar: async (r, k) => ({ cuentas: await altas(k) }), operaciones: ({ cuentas }) => cuentas.map((u) => () => fn(u)) });
    }
  }
}

const TABLA = { sonda: escenarioSonda, dinero: escenarioDinero, 'dinero-ab': escenarioDineroAB, callables: escenarioCallables, cupo: escenarioCupo, libro: escenarioLibro, brain: escenarioBrain, creator: escenarioCreator };
decir(`Frente I · carga · ejecución ${RUN} · escalones ${ESCALONES.join(',')} · muestras≈${MUESTRAS} · demora mock ${mock.demoraMs} ms · node ${process.version}`);
for (const e of ESCENARIOS) {
  if (!TABLA[e]) { decir(`escenario desconocido: ${e}`); process.exit(2); }
  await TABLA[e]();
}
const informe = { run: RUN, fecha: new Date().toISOString(), escalones: ESCALONES, muestras: MUESTRAS, demoraMock: mock.demoraMs, duracionMs: Date.now() - inicio,
  red: intentosDeRed.slice(0, 10), avisos: avisos.length, avisosMuestra: [...new Set(avisos)].slice(0, 8), resultados };
if (SALIDA) fs.writeFileSync(SALIDA, JSON.stringify(informe, null, 2));
decir(`fin · ${Math.round(informe.duracionMs / 1000)} s · intentos de red ${intentosDeRed.length} · avisos ${avisos.length}`);
const fallos = resultados.filter((r) => r.invariantes !== 'OK');
process.exit(intentosDeRed.length || fallos.length ? 1 : 0);
