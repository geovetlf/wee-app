/*
 * WEË BRAIN · CONCURRENCIA DEL RECLAMO Y DEL COBRO — MÓDULO COMÚN (A-02 / A-03).
 *
 * No es una suite: lo lanzan `brain-operacion-1|2|3.emulator.mjs` (cada una con sus escenarios en
 * BRAIN_EMU_ESCENARIOS) y él mismo en modo `worker` para la concurrencia entre procesos. Partido en tres porque entero
 * tardaba ~325 s y el corredor de emuladores corta a los 300 s.
 *
 * Ejecuta el `brainChat` COMPILADO contra el emulador de Firestore: transacciones, contención y reintentos son los de
 * Firestore, no los de una base en memoria (así se encontró que una transacción escribía antes de terminar de leer).
 * Concurrencia dentro del proceso (Promise.all) y entre PROCESOS, soltados a la vez por una hora común. Después de cada
 * escenario se comprueban los invariantes de dinero contra lo guardado: saldo ≥ 0, saldo = inicial + movimientos,
 * cobros = bloques cerrados, contador = respuestas entregadas, ≤ 1 reembolso por operación y ninguna reserva colgada.
 *
 * Aislamiento: el proyecto lo da `proyectoDeEmulador()` (demo-* y emulador presente, o no arranca); la red está cortada
 * salvo el emulador de `FIRESTORE_EMULATOR_HOST`; sin claves de proveedor; proveedor `mock`.
 * BRAIN_EMU_FACTOR (por defecto 0.25) escala las repeticiones; con 1 se corre la versión completa de la auditoría.
 */
import net from 'node:net';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROYECTO = proyectoDeEmulador();
const [HOST_EMU, PUERTO_EMU] = String(process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
if (!HOST_EMU || !PUERTO_EMU) { console.error('✘ Esta suite necesita el emulador de Firestore (FIRESTORE_EMULATOR_HOST).'); process.exit(2); }
const HOST = HOST_EMU, PUERTO = Number(PUERTO_EMU);
const FACTOR = Number(process.env.BRAIN_EMU_FACTOR || 0.25);
const R = (n) => Math.max(1, Math.round(n * FACTOR));
const ESTE = fileURLToPath(import.meta.url);

/* ── Aislamiento, antes de cargar nada ─────────────────────────────────────── */
for (const k of ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'FAL_KEY', 'GEMINI_API_KEY',
  'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'SEEDANCE_CALLBACK_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_AUTH_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST', 'FUNCTIONS_EMULATOR', 'FIREBASE_CONFIG', 'GOOGLE_CLOUD_PROJECT']) delete process.env[k];
process.env.GCLOUD_PROJECT = PROYECTO;
/*
 * Sin sondeo del servidor de metadatos de Google Cloud. En los ejecutores Linux de GitHub, la librería de
 * autenticación intenta detectar si corre en GCE llamando a 169.254.169.254 / metadata.google.internal; la valla de
 * red de abajo lo cortaba y lo contaba como intento de red (así falló la primera CI). `none` es el valor documentado de
 * gcp-metadata para «no lo sondees ni lo uses». La valla sigue cortando y contando cualquier otra conexión.
 */
process.env.METADATA_SERVER_DETECTION = 'none';
const intentosDeRed = [];
globalThis.fetch = async (url) => { intentosDeRed.push(`fetch ${String(url).slice(0, 80)}`); throw new Error('A-02 emu: red cortada'); };
const conectarOriginal = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...a) {
  /* Node normaliza los argumentos de net.connect en un array ([opciones, cb]) antes de llegar aquí. */
  const crudo = Array.isArray(a[0]) ? a[0][0] : a[0];
  const o = typeof crudo === 'object' && crudo !== null ? crudo : { port: crudo, host: a[1] };
  const host = String(o.host ?? 'localhost'), port = Number(o.port);
  if ((host === HOST || host === '127.0.0.1' || host === 'localhost' || host === '::1') && port === PUERTO) return conectarOriginal.apply(this, a);
  intentosDeRed.push(`socket ${host}:${port}`);
  throw new Error(`A-02 emu: conexión no permitida a ${host}:${port}`);
};

const req = createRequire(import.meta.url);
const { initializeApp } = req('firebase-admin/app');
const { getFirestore } = req('firebase-admin/firestore');
initializeApp({ projectId: PROYECTO });
const db = getFirestore();
const lib = (p) => req(`../lib/${p}`);

const consolaOriginal = { log: console.log, warn: console.warn, error: console.error, info: console.info };
const avisos = [];
for (const n of ['log', 'warn', 'error', 'info']) console[n] = (...p) => { if (n !== 'log') avisos.push(`[${n}] ${p.map((x) => (x instanceof Error ? x.message : String(x))).join(' ').slice(0, 200)}`); };
const decir = (...p) => process.stdout.write(p.join(' ') + '\n');

const brain = lib('creator/brain.js');
const uso = lib('creator/brainUsage.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { ADAPTERS } = lib('engine/registry.js');
const { ProviderError } = lib('engine/http.js');
if (typeof uso.operacionDeBrain !== 'function') { decir('BLOQUEADO: el compilado no trae A-02'); process.exit(2); }
const reales = Object.entries(ADAPTERS).filter(([id, a]) => id !== 'mock' && a.isConfigured?.()).map(([id]) => id);
if (reales.length) { decir('BLOQUEADO: proveedores reales configurados', reales.join(',')); process.exit(2); }

/* Modelo simulado: cuenta llamadas, puede tardar y puede fallar una vez. */
let llamadas = 0, demoraMs = Number(process.env.A02_DEMORA_MS || 25), fallarProximas = 0;
const correMock = ADAPTERS.mock.run;
ADAPTERS.mock.run = async (r) => {
  llamadas++;
  if (fallarProximas > 0) { fallarProximas--; throw new ProviderError('fallo controlado A-02 emu', 'mock', 503, false); }
  await new Promise((ok) => setTimeout(ok, demoraMs));
  if (process.env.A02_FALLAR_TRAS_DEMORA === '1') throw new ProviderError('fallo tras la demora (zombi)', 'mock', 503, false);
  return correMock.call(ADAPTERS.mock, r);
};

/*
 * B4-03 (2026-10-14): una respuesta de MUESTRA ya no cobra, así que el proveedor `mock` no sirve de vehículo para medir el
 * dinero del bloque de doce. El vehículo es una IA «real» SIMULADA: DeepSeek (la conversación) y Gemini (la búsqueda) dicen estar
 * configurados y delegan en el mismo mock contador de arriba. Sigue sin haber claves ni red; lo que cambia es que sus respuestas NO
 * son de muestra. La regla de que lo de muestra no cobra la fija brain-demo-no-cobra.
 */
for (const id of ['deepseek', 'gemini']) {
  ADAPTERS[id].isConfigured = () => true;
  ADAPTERS[id].run = async (r) => ADAPTERS.mock.run.call(ADAPTERS.mock, r);
}

const enviar = (uid, data) => brain.brainChat.run({ auth: { uid }, data: { locale: 'es', ...data } });
const intento = async (fn) => { try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, e: { code: e.code, motivo: e.details?.code ?? e.code, message: String(e.message).slice(0, 120) } }; } };

/* ══ MODO WORKER: una petición, soltada a una hora común ══════════════════════ */
if (process.argv[2] === 'worker') {
  const [, , , uid, chatId, messageId, webSearch, hora] = process.argv;
  const espera = Number(hora) - Date.now();
  if (espera > 0) await new Promise((ok) => setTimeout(ok, espera));
  const r = await intento(() => enviar(uid, { message: `worker ${messageId}`, messageId, chatId: chatId === '-' ? undefined : chatId, webSearch: webSearch === '1' }));
  process.stdout.write(JSON.stringify({ r: r.ok ? { dup: r.v.duplicate, credits: r.v.credits } : { error: r.e.motivo }, llamadas, red: intentosDeRed }) + '\n');
  process.exit(0);
}

/* ══ MODO PRINCIPAL ═══════════════════════════════════════════════════════════ */
const RUN = Date.now().toString(36);
let n = 0;
const nuevaCuenta = () => `E${RUN}u${++n}`;
const saldoInicial = new Map();

const alta = async (uid, saldo) => {
  await db.collection('users').doc(`doc_${uid}`).set({ uid, displayName: uid });
  await creditEngine.ensureAccount(uid);
  if (saldo !== undefined) {
    await db.collection('users').doc(`doc_${uid}`).update({ creditsBalance: saldo });
    /* F-06: el saldo que manda vive en `creditAccounts/{uid}` (el perfil solo lo espeja): un saldo de prueba que solo toca el perfil no se aplicaría. */
    const privado = db.collection('creditAccounts').doc(uid);
    if ((await privado.get()).exists) await privado.update({ creditsBalance: saldo });
  }
  saldoInicial.set(uid, saldo ?? 240);
  return uid;
};
/* F-06: primero la cuenta privada (la que manda); el perfil solo si todavía no existe. */
const saldo = async (uid) => {
  const privado = (await db.collection('creditAccounts').doc(uid).get()).data();
  return typeof privado?.creditsBalance === 'number' ? privado.creditsBalance : (await db.collection('users').doc(`doc_${uid}`).get()).data()?.creditsBalance;
};
const txs = async (uid) => (await db.collection('creditTransactions').where('userId', '==', uid).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const contador = async (uid) => (await db.collection('brainUsage').doc(uid).get()).data() || {};
const registros = async (uid) => (await db.collection('brainUsage').doc(uid).collection('respuestas').get()).docs.map((d) => d.data());
const entregadas = async (uid) => {
  let conv = 0, busq = 0;
  for (const c of (await db.collection('brainChats').where('userId', '==', uid).get()).docs) {
    for (const m of (await c.ref.collection('messages').where('role', '==', 'wee').get()).docs) (m.data().webSearch ? busq++ : conv++);
  }
  return { conv, busq };
};
const refReclamo = (uid, chatId, messageId) => db.collection('brainUsage').doc(uid).collection('reclamos').doc(uso.claveDelMensaje({ userId: uid, chatId, messageId }));
const reclamos = async (uid) => (await db.collection('brainUsage').doc(uid).collection('reclamos').get()).docs.map((d) => d.data().estado);

const resultados = [];
const check = (caso, nombre, ok, evid) => { resultados.push({ caso, nombre, ok }); decir(`${ok ? 'PASA ' : 'FALLA'} [${caso}] ${nombre}${evid !== undefined ? '  ← ' + JSON.stringify(evid) : ''}`); };

/** Los invariantes financieros de una cuenta, contra lo que hay de verdad en Firestore. */
async function invariantes(caso, uid, { permitirAutorizadas = false } = {}) {
  const [s, t, c, rs, e] = [await saldo(uid), await txs(uid), await contador(uid), await registros(uid), await entregadas(uid)];
  const movimientos = t.filter((x) => x.type === 'usage' || x.type === 'refund');
  const suma = movimientos.reduce((a, x) => a + Number(x.amount || 0), 0);
  const usoBrain = t.filter((x) => x.type === 'usage' && x.service === 'ai_brain');
  const usoBusq = t.filter((x) => x.type === 'usage' && x.service === 'ai_search');
  const cobradas = rs.filter((r) => r.cobrada).length;
  const reemb = t.filter((x) => x.type === 'refund');
  const reembPorOp = {}; for (const r of reemb) reembPorOp[r.requestId] = (reembPorOp[r.requestId] || 0) + 1;
  const autorizadas = t.filter((x) => x.type === 'usage' && x.status === 'AUTHORIZED').length;
  const f = { saldo: s, inicial: saldoInicial.get(uid), suma, totales: c.respuestasTotales ?? 0, registros: rs.length, cobradas,
    cobrosBrain: usoBrain.map((x) => x.status), cobrosBusq: usoBusq.map((x) => x.status), reembolsos: reemb.length, entregadas: e, autorizadas };
  const ok = s >= 0
    && saldoInicial.get(uid) + suma === s
    && usoBrain.filter((x) => x.status === 'COMPLETED').length === cobradas
    && (c.respuestasTotales ?? 0) === rs.length && rs.length === e.conv
    && usoBusq.filter((x) => x.status === 'COMPLETED').length === e.busq
    && Object.values(reembPorOp).every((k) => k <= 1)
    && (permitirAutorizadas || autorizadas === 0);
  check(caso, `invariantes de ${uid.slice(-3)}: saldo≥0, saldo=inicial+Σmovimientos, cobros=bloques cerrados, contador=registros=respuestas entregadas, búsquedas cobradas=entregadas, ≤1 reembolso por operación, sin reservas colgadas`, ok, f);
  return f;
}

const hastaOnce = async (uid, pre) => {
  let chatId;
  for (let i = 1; i < 12; i++) {
    const r = await intento(() => enviar(uid, { message: `${pre} ${i}`, messageId: `${pre}_msg_${i}`, chatId }));
    if (!r.ok) throw new Error(`preparación ${pre} #${i}: ${r.e.motivo}`);
    chatId = r.v.chatId;
  }
  return chatId;
};
const nuevoChat = async (uid, pre) => { const r = await intento(() => enviar(uid, { message: 'abre', messageId: `${pre}_abre` })); if (!r.ok) throw new Error(`nuevoChat(${pre}): ${r.e.motivo}`); return r.v.chatId; };

/** Lanza `k` procesos que mandan a la vez la misma petición. Devuelve sus salidas. */
const workers = (k, uid, chatId, messageId, webSearch = false, demora = 300) => {
  const hora = Date.now() + 2500;
  return Promise.all(Array.from({ length: k }, () => new Promise((ok) => {
    const p = spawn(process.execPath, [ESTE, 'worker', uid, chatId ?? '-', messageId, webSearch ? '1' : '0', String(hora)], { env: { ...process.env, A02_DEMORA_MS: String(demora) } });
    let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', () => {});
    p.on('close', () => { try { ok(JSON.parse(out.trim().split('\n').pop())); } catch { ok({ r: { error: 'SALIDA_ILEGIBLE' }, llamadas: 0, red: [], crudo: out.slice(0, 300) }); } });
  })));
};

/* ── Comprobación previa: el emulador está vacío y es el nuestro ───────────── */
const previas = await db.listCollections();
decir(`Weë Brain · emulador · ${process.env.BRAIN_EMU_ESCENARIOS || 'todos'} · ${HOST}:${PUERTO} · proyecto ${PROYECTO} · ejecución ${RUN} · colecciones al empezar: ${previas.length ? previas.map((c) => c.id).join(',') : '(ninguna)'}`);

const ESCENARIOS = {
  /* E0 · control: el entorno cobra como producción. */
  async E0() {
    const u = await alta(nuevaCuenta());
    llamadas = 0;
    const chat = await hastaOnce(u, 'ctl');
    await intento(() => enviar(u, { message: 'ctl 12', messageId: 'ctl_msg_12', chatId: chat }));
    const f = await invariantes('E0', u);
    check('E0', '12 respuestas → 1 cobro, saldo 239, 12 llamadas', f.cobrosBrain.length === 1 && f.saldo === 239 && llamadas === 12, { llamadas });
  },

  /* E1 · la MISMA operación a la vez: en el proceso (×20) y entre procesos (3 procesos ×6). */
  async E1() {
    let malas = 0;
    for (let i = 0; i < R(20); i++) {
      const u = await alta(nuevaCuenta());
      const chat = await nuevoChat(u, `e1_${i}`); llamadas = 0;
      const rs = await Promise.all([1, 2, 3].map(() => intento(() => enviar(u, { message: 'a la vez', messageId: 'doble_msg', chatId: chat }))));
      const entregadasAqui = rs.filter((r) => r.ok && !r.v.duplicate).length;
      const raras = rs.filter((r) => !r.ok && r.e.motivo !== 'DUPLICATE_REQUEST');
      const c = await contador(u);
      if (llamadas !== 1 || entregadasAqui !== 1 || raras.length || c.respuestasTotales !== 2) { malas++; decir('  E1 ronda', i, JSON.stringify({ llamadas, entregadasAqui, raras, totales: c.respuestasTotales })); }
      if (i === R(20) - 1) await invariantes('E1', u);
    }
    check('E1', 'en el proceso, varias rondas de 3 peticiones iguales: siempre 1 llamada, 1 respuesta nueva, el resto DUPLICATE_REQUEST/repetición, contador +1', malas === 0, { rondasMalas: malas });

    let malasP = 0;
    for (let i = 0; i < R(6); i++) {
      const u = await alta(nuevaCuenta());
      const chat = await nuevoChat(u, `e1p_${i}`);
      const outs = await workers(3, u, chat, 'doble_proc');
      const llam = outs.reduce((a, o) => a + o.llamadas, 0);
      const nuevas = outs.filter((o) => o.r.dup === false).length;
      const raras = outs.filter((o) => o.r.error && o.r.error !== 'DUPLICATE_REQUEST');
      const c = await contador(u);
      if (llam !== 1 || nuevas !== 1 || raras.length || c.respuestasTotales !== 2 || outs.some((o) => o.red.length)) { malasP++; decir('  E1p ronda', i, JSON.stringify({ outs, totales: c.respuestasTotales })); }
      if (i === R(6) - 1) await invariantes('E1p', u);
    }
    check('E1p', 'entre PROCESOS, varias rondas de 3: siempre 1 llamada en total, 1 respuesta nueva, contador +1', malasP === 0, { rondasMalas: malasP });

    let malasS = 0;
    for (let i = 0; i < R(6); i++) {
      const u = await alta(nuevaCuenta());
      const chat = await nuevoChat(u, `e1s_${i}`);
      const outs = await workers(3, u, chat, 'doble_busq', true);
      const llam = outs.reduce((a, o) => a + o.llamadas, 0);
      const f = await invariantes(`E1s#${i}`, u);
      if (llam !== 1 || f.cobrosBusq.length !== 1 || f.cobrosBusq[0] !== 'COMPLETED' || f.saldo !== 237 || f.reembolsos) { malasS++; decir('  E1s ronda', i, JSON.stringify({ outs, f })); }
    }
    check('E1s', 'búsqueda igual entre procesos, varias rondas: 1 llamada, 1 cobro de 3 COMPLETED, saldo 237, 0 reembolsos', malasS === 0, { rondasMalas: malasS });
  },

  /* E2 · el mismo messageId en conversaciones distintas. */
  async E2() {
    const u = await alta(nuevaCuenta()); llamadas = 0;
    for (let i = 0; i < 25; i++) await intento(() => enviar(u, { message: `conv ${i}`, messageId: 'mismo_en_todas' }));
    const f = await invariantes('E2', u);
    check('E2', '25 conversaciones con el mismo id: 25 contadas, 2 cobros, saldo 238, 25 llamadas', f.totales === 25 && f.cobrosBrain.length === 2 && f.saldo === 238 && llamadas === 25, { llamadas });
  },

  /* E3 · el mismo messageId en cuentas distintas, a la vez, todas en su 12ª (×varias rondas, 3 cuentas). */
  async E3() {
    let malas = 0;
    for (let i = 0; i < R(5); i++) {
      const cuentas = [];
      for (let k = 0; k < 3; k++) { const u = await alta(nuevaCuenta()); cuentas.push([u, await hastaOnce(u, `e3_${i}_${k}`)]); }
      const rs = await Promise.all(cuentas.map(([u, c]) => intento(() => enviar(u, { message: 'doce', messageId: 'compartido_12', chatId: c }))));
      const prohibidos = rs.filter((r) => !r.ok);
      for (const [u] of cuentas) { const f = await invariantes(`E3#${i}`, u); if (f.cobrosBrain.length !== 1 || f.saldo !== 239) malas++; }
      if (prohibidos.length) { malas++; decir('  E3 errores', JSON.stringify(prohibidos.map((r) => r.e))); }
    }
    check('E3', 'varias rondas × 3 cuentas a la vez con el mismo id en su 12ª: todas atendidas, ningún FORBIDDEN, 1 cobro cada una', malas === 0, { malas });
    const u1 = await alta(nuevaCuenta()), u2 = await alta(nuevaCuenta());
    const a = await intento(() => enviar(u1, { message: 'busca', messageId: 'busq_compartida', webSearch: true }));
    const b = await intento(() => enviar(u2, { message: 'busca', messageId: 'busq_compartida', webSearch: true }));
    check('E3', 'búsqueda con el mismo id en dos cuentas: las dos cobradas a su dueña, sin FORBIDDEN', a.ok && b.ok && (await saldo(u1)) === 237 && (await saldo(u2)) === 237, [a.ok || a.e, b.ok || b.e]);
  },

  /* E4 · reintentos antes y después de terminar, y tras un fallo. */
  async E4() {
    const u = await alta(nuevaCuenta());
    const chat = await nuevoChat(u, 'e4'); llamadas = 0;
    demoraMs = 400;
    const p = intento(() => enviar(u, { message: 'lenta', messageId: 'lenta_msg', chatId: chat }));
    await new Promise((ok) => setTimeout(ok, 150));
    const durante = await intento(() => enviar(u, { message: 'lenta', messageId: 'lenta_msg', chatId: chat }));
    const primera = await p;
    demoraMs = 25;
    const despues = await intento(() => enviar(u, { message: 'lenta', messageId: 'lenta_msg', chatId: chat }));
    check('E4', 'reintento DURANTE la ejecución: DUPLICATE_REQUEST sin llamada', !durante.ok && durante.e.motivo === 'DUPLICATE_REQUEST', durante.ok ? durante.v : durante.e);
    check('E4', 'reintento DESPUÉS: la misma respuesta (duplicate), mismo texto, 1 sola llamada en total', primera.ok && despues.ok && despues.v.duplicate && despues.v.text === primera.v.text && llamadas === 1, { llamadas });
    fallarProximas = 1;
    const falla = await intento(() => enviar(u, { message: 'falla', messageId: 'falla_msg', chatId: chat }));
    const otra = await intento(() => enviar(u, { message: 'falla', messageId: 'falla_msg', chatId: chat }));
    check('E4', 'tras un fallo del modelo: no cuenta; el reintento con el mismo id se ejecuta y cuenta 1', !falla.ok && otra.ok && !otra.v.duplicate && (await contador(u)).respuestasTotales === 3, { falla: falla.e?.motivo });
    await invariantes('E4', u);
  },

  /* E5 · fallos durante el cobro y durante la liberación del reclamo. */
  async E5() {
    /* a) el cobro del bloque falla una vez (transitorio). */
    const u = await alta(nuevaCuenta());
    const chat = await hastaOnce(u, 'e5a');
    const spend = creditEngine.spendCredits;
    let fallos = 1;
    creditEngine.spendCredits = async (x) => { if (fallos-- > 0) throw new Error('fallo transitorio de Firestore (simulado)'); return spend.call(creditEngine, x); };
    llamadas = 0;
    const r1 = await intento(() => enviar(u, { message: 'doce', messageId: 'e5a_doce', chatId: chat }));
    creditEngine.spendCredits = spend;
    const c1 = await contador(u); const reclamosTras1 = await reclamos(u); const saldoTras1 = await saldo(u);
    const r2 = await intento(() => enviar(u, { message: 'doce', messageId: 'e5a_doce', chatId: chat }));
    check('E5a', 'el cobro falla: error, bloque devuelto a 11, sin cobro, reclamo «fallido»', !r1.ok && c1.bloque === 11 && reclamosTras1.includes('fallido') && saldoTras1 === 240, { r1: r1.e, bloque: c1.bloque, reclamos: reclamosTras1, saldo: saldoTras1 });
    check('E5a', 'el reintento se ejecuta y cobra UNA vez (239); 2 llamadas en total (la primera se perdió sin cobro)', r2.ok && r2.v.credits === 1 && (await saldo(u)) === 239 && llamadas === 2, { llamadas });
    await invariantes('E5a', u);

    /* b) cerrar el reclamo tras ENTREGAR falla: la respuesta ya es de la persona y la repetición sale por {M}_wee. */
    const v = await alta(nuevaCuenta());
    const chatV = await nuevoChat(v, 'e5b');
    const soltar = uso.soltarMensaje;
    uso.soltarMensaje = async () => { throw new Error('fallo al soltar (simulado)'); };
    llamadas = 0;
    const b1 = await intento(() => enviar(v, { message: 'x', messageId: 'e5b_msg', chatId: chatV }));
    uso.soltarMensaje = soltar;
    const b2 = await intento(() => enviar(v, { message: 'x', messageId: 'e5b_msg', chatId: chatV }));
    check('E5b', 'si falla cerrar el reclamo tras entregar: la respuesta se entrega igual y la repetición es duplicate sin llamada', b1.ok && b2.ok && b2.v.duplicate && llamadas === 1, { llamadas, b1: b1.ok || b1.e });
    await invariantes('E5b', v);

    /* c) soltar tras un FALLO del modelo también falla: el reclamo queda «pensando» hasta su plazo. */
    const w = await alta(nuevaCuenta());
    const chatW = await nuevoChat(w, 'e5c');
    uso.soltarMensaje = async () => { throw new Error('fallo al soltar (simulado)'); };
    fallarProximas = 1; llamadas = 0;
    const c1r = await intento(() => enviar(w, { message: 'x', messageId: 'e5c_msg', chatId: chatW }));
    uso.soltarMensaje = soltar;
    const c2r = await intento(() => enviar(w, { message: 'x', messageId: 'e5c_msg', chatId: chatW }));
    check('E5c', 'fallo + soltar falla: el reintento inmediato recibe DUPLICATE_REQUEST sin llamar (bloqueado hasta el plazo; ver hallazgo)', !c1r.ok && !c2r.ok && c2r.e.motivo === 'DUPLICATE_REQUEST' && llamadas === 1, { c2: c2r.e });
    await refReclamo(w, chatW, 'e5c_msg').update({ reclamadoHasta: Date.now() - 1 });
    const c3r = await intento(() => enviar(w, { message: 'x', messageId: 'e5c_msg', chatId: chatW }));
    check('E5c', '…y al vencer el plazo se retoma, 1 llamada más, cuenta 1', c3r.ok && llamadas === 2 && (await contador(w)).respuestasTotales === 2, { c3: c3r.ok || c3r.e });
    await invariantes('E5c', w);

    /* d) el proceso MUERE en plena llamada al modelo (en la 12ª): reclamo colgado → reintento tras el plazo cobra una vez. */
    const z = await alta(nuevaCuenta());
    const chatZ = await hastaOnce(z, 'e5d');
    const hora = Date.now() + 1500;
    const p = spawn(process.execPath, [ESTE, 'worker', z, chatZ, 'e5d_doce', '0', String(hora)], { env: { ...process.env, A02_DEMORA_MS: '6000' } });
    /* Se mata SOLO cuando el reclamo ya está tomado (antes era una espera fija de 3,5 s: con carga el proceso aún no había reclamado). */
    const refZ = refReclamo(z, chatZ, 'e5d_doce');
    for (let t = 0; t < 200 && (await refZ.get()).data()?.estado !== 'pensando'; t++) await new Promise((ok) => setTimeout(ok, 100));
    await new Promise((ok) => setTimeout(ok, 300));
    p.kill('SIGKILL');
    await new Promise((ok) => p.on('close', ok));
    const colgado = (await refZ.get()).data();
    const d1 = await intento(() => enviar(z, { message: 'doce', messageId: 'e5d_doce', chatId: chatZ }));
    await refZ.update({ reclamadoHasta: Date.now() - 1 });
    llamadas = 0;
    const d2 = await intento(() => enviar(z, { message: 'doce', messageId: 'e5d_doce', chatId: chatZ }));
    check('E5d', 'proceso muerto a mitad: queda «pensando»; reintento antes del plazo → DUPLICATE_REQUEST', colgado?.estado === 'pensando' && !d1.ok && d1.e.motivo === 'DUPLICATE_REQUEST', { estado: colgado?.estado, d1: d1.ok || d1.e });
    check('E5d', '…tras el plazo se retoma y cobra exactamente 1 (saldo 239, un solo asiento)', d2.ok && d2.v.credits === 1 && (await saldo(z)) === 239 && llamadas === 1, { d2: d2.ok || d2.e });
    await invariantes('E5d', z);
  },

  /* E6 · concurrencia rondando el 12 con saldo justo (×varias rondas cada variante). */
  async E6() {
    let malasA = 0, malasB = 0, malasC = 0, perdidas = 0;
    for (let i = 0; i < R(5); i++) {
      /* a) saldo 1, 11 usadas, 3 mensajes distintos a la vez: 1 cobro, saldo 0, los tres entregados. */
      const u = await alta(nuevaCuenta(), 1);
      const chat = await hastaOnce(u, `e6a_${i}`);
      const rs = await Promise.all(['x1', 'x2', 'x3'].map((m) => intento(() => enviar(u, { message: m, messageId: `e6a_${i}_${m}`, chatId: chat }))));
      const f = await invariantes(`E6a#${i}`, u);
      if (!rs.every((r) => r.ok) || f.cobrosBrain.length !== 1 || f.saldo !== 0 || f.totales !== 14) { malasA++; decir('  E6a', i, JSON.stringify({ rs: rs.map((r) => r.ok || r.e), f })); }
      /* b) saldo 0, 11 usadas, 3 a la vez: todas rechazadas ANTES del modelo. */
      const v = await alta(nuevaCuenta(), 0);
      const chatV = await hastaOnce(v, `e6b_${i}`); llamadas = 0;
      const rb = await Promise.all(['y1', 'y2', 'y3'].map((m) => intento(() => enviar(v, { message: m, messageId: `e6b_${i}_${m}`, chatId: chatV }))));
      const fb = await invariantes(`E6b#${i}`, v);
      if (rb.some((r) => r.ok) || llamadas !== 0 || fb.saldo !== 0 || fb.totales !== 11) { malasB++; decir('  E6b', i, JSON.stringify({ rb: rb.map((r) => r.ok || r.e), llamadas, fb })); }
      /* c) LA CARRERA DEL SALDO: saldo 3, 11 usadas; una búsqueda (3) y la 12ª a la vez. */
      const w = await alta(nuevaCuenta(), 3);
      const chatW = await hastaOnce(w, `e6c_${i}`); llamadas = 0;
      const [busq, doce] = await Promise.all([
        intento(() => enviar(w, { message: 'busca', messageId: `e6c_${i}_busq`, webSearch: true })),
        intento(() => enviar(w, { message: 'doce', messageId: `e6c_${i}_doce`, chatId: chatW })),
      ]);
      const fc = await invariantes(`E6c#${i}`, w);
      const entregadasYCobradas = (busq.ok ? 1 : 0) + (doce.ok ? 1 : 0);
      perdidas += llamadas - entregadasYCobradas;
      decir(`  E6c#${i}: búsqueda ${busq.ok ? 'ok' : busq.e.motivo} · 12ª ${doce.ok ? 'ok credits=' + doce.v.credits : doce.e.motivo} · llamadas ${llamadas} · saldo ${fc.saldo}`);
      if (fc.saldo < 0 || (doce.ok && doce.v.credits !== 1) || (busq.ok && doce.ok)) malasC++;
    }
    check('E6a', 'saldo 1 + 3 mensajes a la vez en la 12ª: 1 solo cobro, saldo 0, nunca negativo, todos entregados (varias rondas)', malasA === 0, { malasA });
    check('E6b', 'saldo 0 + 3 a la vez en la 12ª: todos rechazados SIN llamar al modelo (varias rondas)', malasB === 0, { malasB });
    check('E6c', 'carrera búsqueda + 12ª con saldo 3: saldo nunca negativo, ninguna respuesta facturable entregada sin cobro (varias rondas)', malasC === 0, { malasC });
    decir(`  E6c · llamadas al modelo SIN respuesta entregada (coste del proveedor sin ingreso) en varias rondas: ${perdidas}`);
  },

  /* E8 · ronda 2: M-1, M-2, M-3 entre procesos y un fallo entre cada transición financiera. */
  async E8() {
    /* M-1 entre PROCESOS: una conversación lenta en curso y una búsqueda con el mismo id a la vez → la búsqueda no reserva nada. */
    let malasM1 = 0;
    for (let i = 0; i < R(4); i++) {
      const u = await alta(nuevaCuenta());
      const chat = await nuevoChat(u, `e8m1_${i}`);
      const hora = Date.now() + 2500;
      const lanzar = (busqueda, demora) => new Promise((ok) => {
        const p = spawn(process.execPath, [ESTE, 'worker', u, chat, `e8m1_${i}_msg`, busqueda ? '1' : '0', String(hora + (busqueda ? 600 : 0))], { env: { ...process.env, A02_DEMORA_MS: String(demora) } });
        let out = ''; p.stdout.on('data', (d) => (out += d)); p.on('close', () => { try { ok(JSON.parse(out.trim().split('\n').pop())); } catch { ok({ r: { error: 'ILEGIBLE' }, llamadas: 0 }); } });
      });
      const [conv, busq] = await Promise.all([lanzar(false, 2500), lanzar(true, 25)]);
      const f = await invariantes(`E8-M1#${i}`, u);
      if (busq.r.error !== 'DUPLICATE_REQUEST' || f.cobrosBusq.length !== 0 || f.autorizadas !== 0 || conv.r.dup !== false) { malasM1++; decir('  M1', i, JSON.stringify({ conv, busq, f })); }
    }
    check('E8-M1', 'entre procesos, varias rondas: búsqueda contra una conversación en curso con el mismo id → DUPLICATE_REQUEST, 0 reservas', malasM1 === 0, { malasM1 });

    /* M-2: un reintento que se cuela en mitad del reembolso → DUPLICATE_REQUEST; un solo reembolso. */
    const u2 = await alta(nuevaCuenta());
    const refund = creditEngine.refundCredits;
    let colado = null;
    creditEngine.refundCredits = async (x) => {
      const c = (await db.collection('brainChats').where('userId', '==', u2).get()).docs[0]?.id;
      colado = await intento(() => enviar(u2, { message: 'busca', messageId: 'e8m2_msg', webSearch: true, chatId: c }));
      return refund.call(creditEngine, x);
    };
    fallarProximas = 1;
    await intento(() => enviar(u2, { message: 'busca', messageId: 'e8m2_msg', webSearch: true }));
    creditEngine.refundCredits = refund;
    const f2 = await invariantes('E8-M2', u2);
    check('E8-M2', 'reintento en mitad del reembolso → DUPLICATE_REQUEST; saldo 240, 1 reembolso, sin búsqueda gratis', colado && !colado.ok && colado.e.motivo === 'DUPLICATE_REQUEST' && f2.saldo === 240 && f2.reembolsos === 1, { colado: colado?.ok ? colado.v : colado?.e, f2 });

    /* M-3 ENTRE PROCESOS: un intento zombi (proceso aparte, modelo lento) pierde el reclamo; el dueño nuevo termina; el zombi no toca dinero. */
    let malasM3 = 0;
    for (let i = 0; i < R(3); i++) {
      const z = await alta(nuevaCuenta());
      const chatZ = await hastaOnce(z, `e8m3_${i}`);
      const refZ = refReclamo(z, chatZ, 'e8m3_doce');
      const salidaZ = new Promise((ok) => {
        const p = spawn(process.execPath, [ESTE, 'worker', z, chatZ, 'e8m3_doce', '0', String(Date.now() + 1500)], { env: { ...process.env, A02_DEMORA_MS: '5000' } });
        let out = ''; p.stdout.on('data', (d) => (out += d)); p.on('close', () => { try { ok(JSON.parse(out.trim().split('\n').pop())); } catch { ok({ r: { error: 'ILEGIBLE' } }); } });
      });
      for (let t = 0; t < 200 && (await refZ.get()).data()?.estado !== 'pensando'; t++) await new Promise((ok) => setTimeout(ok, 100));
      await refZ.update({ reclamadoHasta: Date.now() - 1 });
      llamadas = 0;
      const nuevo = await intento(() => enviar(z, { message: 'doce', messageId: 'e8m3_doce', chatId: chatZ }));
      const zombi = await salidaZ;
      const f = await invariantes(`E8-M3#${i}`, z);
      if (!nuevo.ok || nuevo.v.credits !== 1 || zombi.r.error !== 'DUPLICATE_REQUEST' || f.cobrosBrain.length !== 1 || f.saldo !== 239 || f.totales !== 12) { malasM3++; decir('  M3', i, JSON.stringify({ nuevo: nuevo.ok ? nuevo.v.credits : nuevo.e, zombi, f })); }
    }
    check('E8-M3', 'entre procesos, varias rondas: el zombi que pierde el reclamo termina en DUPLICATE_REQUEST sin contar ni cobrar; el dueño nuevo cobra 1', malasM3 === 0, { malasM3 });

    /* M-3 búsqueda zombi entre procesos: falla DESPUÉS de que el dueño nuevo completó → no reembolsa nada. */
    let malasM3s = 0;
    for (let i = 0; i < R(3); i++) {
      const z = await alta(nuevaCuenta());
      const chatZ = await nuevoChat(z, `e8m3s_${i}`);
      const refZ = refReclamo(z, chatZ, 'e8m3s_busq');
      const salidaZ = new Promise((ok) => {
        const p = spawn(process.execPath, [ESTE, 'worker', z, chatZ, 'e8m3s_busq', '1', String(Date.now() + 1500)], { env: { ...process.env, A02_DEMORA_MS: '5000', A02_FALLAR_TRAS_DEMORA: '1' } });
        let out = ''; p.stdout.on('data', (d) => (out += d)); p.on('close', () => { try { ok(JSON.parse(out.trim().split('\n').pop())); } catch { ok({ r: { error: 'ILEGIBLE' } }); } });
      });
      for (let t = 0; t < 200 && (await refZ.get()).data()?.estado !== 'pensando'; t++) await new Promise((ok) => setTimeout(ok, 100));
      await refZ.update({ reclamadoHasta: Date.now() - 1 });
      const nuevo = await intento(() => enviar(z, { message: 'busca', messageId: 'e8m3s_busq', webSearch: true, chatId: chatZ }));
      const zombi = await salidaZ;
      const f = await invariantes(`E8-M3s#${i}`, z);
      if (!nuevo.ok || f.cobrosBusq.length !== 1 || f.cobrosBusq[0] !== 'COMPLETED' || f.reembolsos !== 0 || f.saldo !== 237) { malasM3s++; decir('  M3s', i, JSON.stringify({ nuevo: nuevo.ok || nuevo.e, zombi, f })); }
    }
    check('E8-M3s', 'entre procesos, varias rondas: la búsqueda zombi que falla tras perder el reclamo NO reembolsa; 1 cobro COMPLETED, saldo 237', malasM3s === 0, { malasM3s });

    /* Fallos entre cada transición financiera (reclamo · cobro de búsqueda · contador · completar), con reintento. */
    const transicion = async (nombre, preparar, deshacer, data, esperado) => {
      const slug = nombre.normalize('NFD').replace(/[^a-z0-9]/gi, '_');
      const u = await alta(nuevaCuenta());
      const chat = data.cerca12 ? await hastaOnce(u, `e8t_${slug}`) : await nuevoChat(u, `e8t_${slug}`);
      preparar();
      const r1 = await intento(() => enviar(u, { message: 'x', messageId: `e8t_${slug}_msg`, chatId: chat, webSearch: !!data.busqueda }));
      deshacer();
      const fTras = await invariantes(`E8-T ${nombre} tras el fallo`, u, { permitirAutorizadas: false });
      const r2 = await intento(() => enviar(u, { message: 'x', messageId: `e8t_${slug}_msg`, chatId: chat, webSearch: !!data.busqueda }));
      const fFin = await invariantes(`E8-T ${nombre} tras el reintento`, u);
      check(`E8-T`, `fallo en «${nombre}»: ${esperado.texto}`, esperado.ok(r1, r2, fTras, fFin), { r1: r1.ok ? (r1.v.duplicate ? 'dup' : 'ok') : r1.e.motivo, r2: r2.ok ? (r2.v.duplicate ? 'dup' : `ok credits=${r2.v.credits}`) : r2.e.motivo, fTras: { saldo: fTras.saldo, totales: fTras.totales, reemb: fTras.reembolsos }, fFin: { saldo: fFin.saldo, totales: fFin.totales, cobros: [...fFin.cobrosBrain, ...fFin.cobrosBusq] } });
    };
    const reclamar = uso.reclamarMensaje, spend = creditEngine.spendCredits, contar = uso.contarRespuesta, completar = creditEngine.completeCredits;
    let una1 = 0;
    await transicion('reclamo', () => { una1 = 1; uso.reclamarMensaje = async (...a) => { if (una1-- > 0) throw new Error('fallo de transacción'); return reclamar(...a); }; }, () => { uso.reclamarMensaje = reclamar; }, { busqueda: true },
      { texto: 'nada reservado; el reintento cobra 3 una vez', ok: (r1, r2, t, f) => !r1.ok && t.saldo === 240 && t.autorizadas === 0 && r2.ok && f.saldo === 237 && f.cobrosBusq.length === 1 });
    await transicion('cobro de la búsqueda', () => { una1 = 1; creditEngine.spendCredits = async (x) => { if (una1-- > 0) throw new Error('fallo del cobro'); return spend.call(creditEngine, x); }; }, () => { creditEngine.spendCredits = spend; }, { busqueda: true },
      { texto: 'reclamo suelto, sin reserva; el reintento cobra una vez', ok: (r1, r2, t, f) => !r1.ok && t.saldo === 240 && r2.ok && f.saldo === 237 && f.cobrosBusq.length === 1 && f.reembolsos === 0 });
    await transicion('contador', () => { una1 = 1; uso.contarRespuesta = async (...a) => { if (una1-- > 0) throw new Error('fallo del contador'); return contar(...a); }; }, () => { uso.contarRespuesta = contar; }, { cerca12: true },
      { texto: 'nada contado ni cobrado; el reintento cuenta la 12ª y cobra 1', ok: (r1, r2, t, f) => !r1.ok && t.totales === 11 && t.saldo === 240 && r2.ok && r2.v.credits === 1 && f.totales === 12 && f.saldo === 239 });
    await transicion('completar el cobro', () => { una1 = 1; creditEngine.completeCredits = async (x) => { if (una1-- > 0) throw new Error('fallo al completar'); return completar.call(creditEngine, x); }; }, () => { creditEngine.completeCredits = completar; }, { cerca12: true },
      { texto: 'la respuesta ya entregada se cobra (COMPLETED, sin reserva colgada); el reintento es la misma respuesta', ok: (r1, r2, t, f) => t.totales === 12 && t.saldo === 239 && t.autorizadas === 0 && r2.ok && r2.v.duplicate && f.saldo === 239 && f.cobrosBrain.length === 1 });
  },

  /* E7 · reclamos: vencido, intento distinto, soltar sin ser dueño (contra Firestore real). */
  async E7() {
    const u = await alta(nuevaCuenta());
    const chat = await nuevoChat(u, 'e7');
    const msgs = db.collection('brainChats').doc(chat).collection('messages');
    const R = (m) => refReclamo(u, chat, m);
    await R('ajeno_vivo').set({ estado: 'pensando', intento: 'suyo', reclamadoHasta: Date.now() + 60_000 });
    llamadas = 0;
    const vivo = await intento(() => enviar(u, { message: 'x', messageId: 'ajeno_vivo', chatId: chat }));
    check('E7', 'reclamo vivo de otro intento: DUPLICATE_REQUEST, sin llamada, reclamo intacto', !vivo.ok && vivo.e.motivo === 'DUPLICATE_REQUEST' && llamadas === 0 && (await R('ajeno_vivo').get()).data().intento === 'suyo');
    await R('ajeno_vencido').set({ estado: 'pensando', intento: 'muerto', reclamadoHasta: Date.now() - 1 });
    const vencido = await intento(() => enviar(u, { message: 'x', messageId: 'ajeno_vencido', chatId: chat }));
    check('E7', 'reclamo vencido: se retoma, 1 llamada', vencido.ok && llamadas === 1);
    await R('ajeno_suelta').set({ estado: 'pensando', intento: 'dueno', reclamadoHasta: Date.now() + 60_000 });
    const res = await uso.soltarMensaje(db, R('ajeno_suelta'), 'intruso', 'fallido');
    const ren = await uso.renovarReclamo(db, R('ajeno_suelta'), 'intruso');
    check('E7', 'soltar o renovar con un intento que no es el dueño: false y nada cambia', res === false && ren === false && (await R('ajeno_suelta').get()).data().estado === 'pensando' && (await R('ajeno_suelta').get()).data().intento === 'dueno');
    /* reclamar a la vez el MISMO mensaje directamente: exactamente un ganador (×20). */
    let ganadoresMal = 0;
    for (let i = 0; i < R(20); i++) {
      const outs = await Promise.all([1, 2, 3, 4].map(() => uso.reclamarMensaje(db, { reclamo: R(`carrera_${i}`), respuesta: msgs.doc(`carrera_${i}_wee`) })));
      if (outs.filter((o) => o.estado === 'reclamado').length !== 1) ganadoresMal++;
    }
    check('E7', 'varias rondas de 4 reclamos simultáneos del mismo mensaje: exactamente 1 ganador cada vez', ganadoresMal === 0, { ganadoresMal });
  },
};

const pedido = [...process.argv.slice(2).filter((a) => /^E\d$/.test(a)), ...String(process.env.BRAIN_EMU_ESCENARIOS || '').split(',').filter(Boolean)];
for (const [id, fn] of Object.entries(ESCENARIOS)) {
  if (pedido.length && !pedido.includes(id)) continue;
  decir(`\n── ${id} ──`);
  try { await fn(); } catch (e) { check(id, `BLOQUEADO: ${e.message}`, false); }
}
Object.assign(console, consolaOriginal);
const pasan = resultados.filter((r) => r.ok).length;
decir(`\nResumen: ${pasan}/${resultados.length} pasan · intentos de red fuera del emulador: ${intentosDeRed.length}${intentosDeRed.length ? ' ' + JSON.stringify(intentosDeRed.slice(0, 5)) : ''}`);
decir(`Avisos/errores del servidor: ${avisos.length}`);
for (const a of [...new Set(avisos)].slice(0, 12)) decir('  ' + a);
process.exit(resultados.some((r) => !r.ok) ? 1 : 0);
