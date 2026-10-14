/**
 * WEË BRAIN · LA IDENTIDAD DE LA OPERACIÓN Y EL RECLAMO DEL MENSAJE (A-02 / A-03).
 *
 * Regresión permanente de F-01, F-01b, M-1, M-2 y M-3 (ronda-r9/AUDITORIA-MOTOR/a02-ronda2-informe.md):
 *
 *   F-01  reutilizar el `messageId` en otra conversación daba respuestas sin contar ni cobrar.
 *   F-01b el cobro era global: otra cuenta con el mismo id recibía FORBIDDEN tras llamar al modelo.
 *   M-1   el reclamo se toma ANTES de reservar la búsqueda o mirar el saldo.
 *   M-2   el reclamo se suelta AL FINAL, tras deshacer y reembolsar.
 *   M-3   un intento que pierde el reclamo no toca dinero.
 *   y la regla de Firestore «todas las lecturas antes de la primera escritura» en cada transacción (caso 9).
 *
 * Ejecuta el `brainChat` COMPILADO con el Credit Engine real sobre la Firestore en memoria
 * (`_firestore-en-memoria.mjs`), sin red (fetch y sockets cortados y contados), sin claves y con el proveedor `mock`.
 * Las aserciones expresan el comportamiento correcto y comprueban dinero de verdad: saldo, asientos, contador del
 * bloque de doce, reembolsos y llamadas al modelo simulado. La contención real de Firestore la cubre
 * `brain-operacion.emulator.mjs`.
 *
 * Usa el compilado (`npm run build` antes).
 */
import net from 'node:net';
import { createRequire } from 'node:module';

/* ── Aislamiento, ANTES de cargar nada del servidor (igual que A-01) ─────────── */
const CLAVES = ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'FAL_KEY',
  'GEMINI_API_KEY', 'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'SEEDANCE_CALLBACK_TOKEN'];
const ENTORNO_GOOGLE = ['GOOGLE_APPLICATION_CREDENTIALS', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST', 'FUNCTIONS_EMULATOR', 'FIREBASE_CONFIG', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT'];
const clavesAlArrancar = CLAVES.filter((k) => process.env[k]).length;
for (const k of [...CLAVES, ...ENTORNO_GOOGLE]) delete process.env[k];
process.env.GCLOUD_PROJECT = 'demo-wee-brain';
const intentosDeRed = [];
globalThis.fetch = async (url) => { intentosDeRed.push(`fetch ${String(url).slice(0, 80)}`); throw new Error('brain-operacion: red cortada'); };
const conectar = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...a) { intentosDeRed.push(`socket ${JSON.stringify(a[0])?.slice(0, 80)}`); throw new Error('brain-operacion: red cortada'); };

const { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } = await import('./_firestore-en-memoria.mjs');
const { acelerarLasEsperasCortas, apuntarLaConsola } = await import('./_aceptacion.mjs');
const firestoreAdmin = () => createRequire(import.meta.url)('firebase-admin/firestore').getFirestore();
let base = new BaseEnMemoria();
instalarLaBase(() => base);
acelerarLasEsperasCortas();
const consola = apuntarLaConsola();
const decir = (...p) => process.stdout.write(p.join(' ') + '\n');

const brain = lib('creator/brain.js');
const uso = lib('creator/brainUsage.js');
const { ADAPTERS } = lib('engine/registry.js');
const { ProviderError } = lib('engine/http.js');
const { RESPUESTAS_POR_CREDIT, operacionDeBrain, soltarMensaje, PLAZO_DEL_RECLAMO_MS, claveDelMensaje } = uso;
/* Ronda 2: el reclamo vive aparte, en brainUsage/{uid}/reclamos/{claveDelMensaje}. */
const rutaReclamo = (uid, chatId, messageId) => `brainUsage/${uid}/reclamos/${claveDelMensaje({ userId: uid, chatId, messageId })}`;
if (typeof operacionDeBrain !== 'function') { decir('BLOQUEADO: el compilado no trae la corrección de A-02 (operacionDeBrain)'); process.exit(2); }
const reales = Object.entries(ADAPTERS).filter(([id, a]) => id !== 'mock' && a.isConfigured?.()).map(([id]) => id);
if (reales.length) { decir('BLOQUEADO: proveedores reales configurados:', reales.join(',')); process.exit(2); }

/* Contador de llamadas al modelo simulado, y un interruptor para provocar UN fallo controlado. */
let llamadas = 0;
let fallarProximas = 0;
const correMock = ADAPTERS.mock.run;
ADAPTERS.mock.run = async (req) => {
  llamadas++;
  if (fallarProximas > 0) { fallarProximas--; throw new ProviderError('fallo controlado de A-02', 'mock', 503, false); }
  /* Un respiro para que dos peticiones simultáneas se crucen de verdad. */
  await new Promise((r) => setImmediate(r));
  return correMock.call(ADAPTERS.mock, req);
};

const ANA = 'A02anaAAAAAAAAAAAAAAAAAAAA01';
const BEA = 'A02beaBBBBBBBBBBBBBBBBBBBB02';
const enviar = (uid, data, auth = { uid }) => brain.brainChat.run({ auth, data: { locale: 'es', ...data } });
const intento = async (fn) => { try { return { ok: true, v: await fn() }; } catch (e) { return { ok: false, e: { code: e.code, motivo: e.details?.code, message: e.message } }; } };
const mundo = async (saldos = {}) => {
  base = new BaseEnMemoria();
  await darDeAlta(base, ANA, saldos.ana === undefined ? {} : { saldo: saldos.ana });
  await darDeAlta(base, BEA, saldos.bea === undefined ? {} : { saldo: saldos.bea });
  llamadas = 0; fallarProximas = 0;
};
const txDe = (uid) => base.de('creditTransactions').filter((t) => t.userId === uid);
const usosDe = (uid) => txDe(uid).filter((t) => t.type === 'usage');
const devolucionesDe = (uid) => txDe(uid).filter((t) => t.type === 'refund');
const contador = (uid) => base.leer(`brainUsage/${uid}`) || {};
const foto = (uid) => ({ saldo: saldoDe(base, uid), bloque: contador(uid).bloque ?? 0, totales: contador(uid).respuestasTotales ?? 0,
  registros: base.de(`brainUsage/${uid}/respuestas`).length,
  cobros: usosDe(uid).map((t) => `${t.requestId}:${t.amount}:${t.status}`), devoluciones: devolucionesDe(uid).length });

const resultados = [];
let falloDeEntorno = null;
const check = (caso, nombre, ok, evidencia) => {
  resultados.push({ caso, nombre, ok });
  decir(`${ok ? 'PASA ' : 'FALLA'} [${caso}] ${nombre}${evidencia !== undefined ? `  ← ${JSON.stringify(evidencia)}` : ''}`);
};
const exigir = (r, donde) => { if (!r.ok) { falloDeEntorno ??= { donde, error: r.e }; throw new Error(`${donde}: ${r.e.code}/${r.e.motivo} ${r.e.message}`); } return r.v; };
/** Lleva una cuenta a «11 usadas» en una conversación propia. Devuelve el chatId. */
const hastaOnce = async (uid, prefijo) => {
  let chatId;
  for (let i = 1; i < RESPUESTAS_POR_CREDIT; i++) chatId = exigir(await intento(() => enviar(uid, { message: `${prefijo} ${i}`, messageId: `${prefijo}_msg_${i}`, chatId })), `${prefijo} #${i}`).chatId;
  return chatId;
};

/* ── C0 · control: el entorno cobra como producción ─────────────────────────── */
async function control() {
  await mundo();
  const chat = await hastaOnce(ANA, 'ctl');
  exigir(await intento(() => enviar(ANA, { message: 'ctl 12', messageId: 'ctl_12', chatId: chat })), 'ctl 12');
  const f = foto(ANA);
  check('C0', '12 respuestas distintas: 1 cobro de 1, saldo 240→239, bloque 0, 12 llamadas', f.cobros.length === 1 && f.saldo === 239 && f.bloque === 0 && f.totales === 12 && llamadas === 12, { ...f, llamadas });
}

/* ── 1 · misma cuenta, mismo messageId, conversaciones diferentes (F-01) ────── */
async function caso1() {
  await mundo();
  const M = 'reuso_msg_0001';
  const rs = [];
  for (let i = 1; i <= 24; i++) rs.push(exigir(await intento(() => enviar(ANA, { message: `pregunta ${i}`, messageId: M })), `1a #${i}`));
  const f = foto(ANA);
  decir('  1a:', JSON.stringify(f), '· llamadas', llamadas);
  check('1a', '24 respuestas en 24 conversaciones con el mismo id cuentan 24', f.totales === 24 && f.registros === 24, f);
  check('1a', 'y cobran 2 bloques: 2 asientos, saldo 240→238', f.cobros.length === 2 && f.saldo === 238, f);
  check('1a', 'cada conversación es una operación distinta (24 requestId distintos posibles; los 2 cobrados son distintos)', new Set(f.cobros.map((c) => c.split(':')[0])).size === 2);
  check('1a', '24 llamadas al modelo = 24 respuestas entregadas, ninguna gratis', llamadas === 24 && rs.every((r) => !r.duplicate));

  await mundo();
  const chat = await hastaOnce(ANA, 'b');
  const r12 = exigir(await intento(() => enviar(ANA, { message: 'doce', messageId: 'reuso_cobrado_12', chatId: chat })), '1b 12ª');
  const trasCobro = foto(ANA);
  llamadas = 0;
  const reusos = [];
  for (let i = 1; i <= 13; i++) reusos.push(exigir(await intento(() => enviar(ANA, { message: `nueva ${i}`, messageId: 'reuso_cobrado_12' })), `1b reuso #${i}`));
  const f2 = foto(ANA);
  decir('  1b tras la 12ª:', JSON.stringify(trasCobro), '· tras 13 reusos:', JSON.stringify(f2));
  check('1b', 'la 12ª cobró 1', trasCobro.cobros.length === 1 && r12.credits === 1, trasCobro.cobros);
  check('1b', 'reutilizar el id de la cobrada en 13 conversaciones nuevas cuenta 13 (totales 25)', f2.totales === 25, f2);
  check('1b', 'y cobra otro bloque: 2 asientos, saldo 239→238', f2.cobros.length === 2 && f2.saldo === 238, f2);
  check('1b', 'ninguna de las 13 devolvió un asiento ajeno como «ya pagado» con credits 0 en la que cierra bloque', reusos.filter((r) => r.credits === 1).length === 1, reusos.map((r) => r.credits));
}

/* ── 2 · dos cuentas, mismo messageId (F-01b) ───────────────────────────────── */
async function caso2() {
  await mundo();
  const a = exigir(await intento(() => enviar(ANA, { message: 'hola A', messageId: 'compartido_0001' })), '2a A');
  const b = await intento(() => enviar(BEA, { message: 'hola B', messageId: 'compartido_0001' }));
  check('2a', 'B recibe su propia respuesta en su propia conversación; cada una cuenta 1', b.ok && b.v.chatId !== a.chatId && !b.v.duplicate && foto(ANA).totales === 1 && foto(BEA).totales === 1, b.ok ? undefined : b.e);

  await mundo();
  const ca = await hastaOnce(ANA, 'a'); const cb = await hastaOnce(BEA, 'b');
  exigir(await intento(() => enviar(ANA, { message: 'a 12', messageId: 'compartido_cobro_12', chatId: ca })), '2b A 12ª');
  const ll = llamadas;
  const b12 = await intento(() => enviar(BEA, { message: 'b 12', messageId: 'compartido_cobro_12', chatId: cb }));
  decir('  2b A:', JSON.stringify(foto(ANA)), '· B:', JSON.stringify(foto(BEA)), '· respuesta B:', JSON.stringify(b12.ok ? { credits: b12.v.credits } : b12.e));
  check('2b', 'la 12ª de B con el id cobrado de A se atiende y se le cobra a B', b12.ok && b12.v.credits === 1 && foto(BEA).cobros.length === 1 && foto(BEA).saldo === 239, b12.ok ? foto(BEA) : b12.e);
  check('2b', 'una sola llamada al modelo para B, y el cobro de A intacto', llamadas - ll === 1 && foto(ANA).cobros.length === 1 && foto(ANA).cobros[0].endsWith('COMPLETED'), foto(ANA).cobros);
  check('2b', 'los requestId de A y de B son distintos', foto(ANA).cobros[0].split(':')[0] !== foto(BEA).cobros[0]?.split(':')[0]);

  await mundo();
  const as = exigir(await intento(() => enviar(ANA, { message: 'busca algo', messageId: 'compartido_busqueda', webSearch: true })), '2c A');
  const bs = await intento(() => enviar(BEA, { message: 'busca otra cosa', messageId: 'compartido_busqueda', webSearch: true }));
  decir('  2c A:', JSON.stringify(foto(ANA)), '· B:', JSON.stringify(foto(BEA)));
  check('2c', 'la búsqueda de B con el mismo id se atiende y se le cobra a B (3 cada una)', as.credits === 3 && bs.ok && bs.v.credits === 3 && foto(BEA).saldo === 237 && foto(ANA).saldo === 237, bs.ok ? undefined : bs.e);
}

/* ── 3 · repeticiones legítimas en la misma conversación ───────────────────── */
async function caso3() {
  await mundo();
  const r1 = exigir(await intento(() => enviar(ANA, { message: 'una pregunta', messageId: 'repetido_0001' })), '3a');
  const f1 = foto(ANA); const l1 = llamadas;
  const r2 = exigir(await intento(() => enviar(ANA, { message: 'una pregunta', messageId: 'repetido_0001', chatId: r1.chatId })), '3a bis');
  check('3a', 'conversación repetida: duplicate, mismo texto, sin llamada ni cambio de contador/saldo', r2.duplicate === true && r2.text === r1.text && llamadas === l1 && JSON.stringify(foto(ANA)) === JSON.stringify(f1));

  await mundo();
  const chat = await hastaOnce(ANA, 'c');
  const p = exigir(await intento(() => enviar(ANA, { message: 'doce', messageId: 'repetido_cobro_12', chatId: chat })), '3b');
  const fp = foto(ANA); const lp = llamadas;
  const q = exigir(await intento(() => enviar(ANA, { message: 'doce', messageId: 'repetido_cobro_12', chatId: chat })), '3b bis');
  check('3b', 'la 12ª repetida: duplicate, mismos credits, sin cobro ni llamada', q.duplicate && q.credits === p.credits && llamadas === lp && JSON.stringify(foto(ANA)) === JSON.stringify(fp), foto(ANA));

  /* 5 · búsqueda repetida legítimamente. */
  await mundo();
  const s1 = exigir(await intento(() => enviar(ANA, { message: 'busca', messageId: 'busqueda_rep', webSearch: true })), '3c');
  const fs1 = foto(ANA); const ls1 = llamadas;
  const s2 = exigir(await intento(() => enviar(ANA, { message: 'busca', messageId: 'busqueda_rep', webSearch: true, chatId: s1.chatId })), '3c bis');
  check('3c', 'búsqueda repetida: duplicate, mismos credits (3), 1 solo cobro, sin llamada nueva', s2.duplicate && s2.credits === 3 && llamadas === ls1 && fs1.cobros.length === 1 && JSON.stringify(foto(ANA)) === JSON.stringify(fs1), foto(ANA));
}

/* ── 4 · rechazos ANTES del proveedor ──────────────────────────────────────── */
async function caso4() {
  /* 6 · sin Credits. */
  await mundo({ bea: 0 });
  const cb = await hastaOnce(BEA, 'pobre');
  const l = llamadas; const f = foto(BEA);
  const r = await intento(() => enviar(BEA, { message: 'doce', messageId: 'pobre_12', chatId: cb }));
  check('4a', 'la 12ª sin saldo se rechaza (INSUFFICIENT_CREDITS) sin llamar al modelo ni mover nada', !r.ok && /INSUFFICIENT/.test(JSON.stringify(r.e)) && llamadas === l && JSON.stringify(foto(BEA)) === JSON.stringify(f), r.ok ? 'ok' : r.e);
  const s = await intento(() => enviar(BEA, { message: 'busca', messageId: 'pobre_busqueda', webSearch: true }));
  check('4a', 'la búsqueda sin saldo se rechaza sin llamar al modelo', !s.ok && llamadas === l && foto(BEA).cobros.length === 0, s.ok ? 'ok' : s.e);

  /* 7 · identidad y autorización. */
  await mundo();
  const a = exigir(await intento(() => enviar(ANA, { message: 'mía', messageId: 'privada_1' })), '4b A');
  const l2 = llamadas;
  const sinSesion = await intento(() => brain.brainChat.run({ auth: undefined, data: { message: 'x', messageId: 'anon_1' } }));
  check('4b', 'sin sesión: UNAUTHORIZED, sin llamada', !sinSesion.ok && sinSesion.e.motivo === 'UNAUTHORIZED' && llamadas === l2, sinSesion.ok ? 'ok' : sinSesion.e);
  const ajena = await intento(() => enviar(BEA, { message: 'colarme', messageId: 'privada_1', chatId: a.chatId }));
  check('4b', 'conversación de otra cuenta: rechazada, sin llamada, sin datos de A y sin mover nada de nadie', !ajena.ok && ajena.e.motivo === 'INVALID_REQUEST' && llamadas === l2 && foto(BEA).totales === 0 && !JSON.stringify(ajena.e).includes(a.text), ajena.ok ? 'ok' : ajena.e);
  const repetidaAjena = await intento(() => enviar(BEA, { message: 'x', messageId: 'privada_1', chatId: a.chatId }));
  check('4b', 'ni siquiera la repetición exacta de un mensaje ajeno devuelve la respuesta de A', !repetidaAjena.ok && llamadas === l2);
}

/* ── 5 · reintentos después de un fallo controlado ─────────────────────────── */
async function caso5() {
  await mundo();
  const chat = exigir(await intento(() => enviar(ANA, { message: 'primera', messageId: 'base_1' })), '5 base').chatId;
  const f0 = foto(ANA);
  fallarProximas = 1;
  const falla = await intento(() => enviar(ANA, { message: 'falla', messageId: 'reintento_1', chatId: chat }));
  const tras = foto(ANA);
  const msg = base.leer(rutaReclamo(ANA, chat, 'reintento_1'));
  check('5a', 'conversación: el fallo no cuenta, no cobra y suelta el reclamo', !falla.ok && JSON.stringify(tras) === JSON.stringify(f0) && msg?.estado === 'fallido', { error: falla.ok ? 'ok' : falla.e.motivo, estado: msg?.estado });
  const l = llamadas;
  const otra = exigir(await intento(() => enviar(ANA, { message: 'falla', messageId: 'reintento_1', chatId: chat })), '5a reintento');
  check('5a', 'el reintento con el mismo id responde, llama 1 vez y cuenta 1', !otra.duplicate && llamadas - l === 1 && foto(ANA).totales === f0.totales + 1, foto(ANA));

  await mundo();
  fallarProximas = 1;
  const fs = await intento(() => enviar(ANA, { message: 'busca', messageId: 'busq_falla', webSearch: true }));
  const f1 = foto(ANA);
  check('5b', 'búsqueda: el fallo reembolsa UNA vez y el saldo vuelve a 240', !fs.ok && f1.saldo === 240 && f1.devoluciones === 1 && f1.cobros[0]?.endsWith('REFUNDED'), f1);
  const chatS = base.de('brainChats').find((c) => c.userId === ANA)?.id;
  const l3 = llamadas;
  const rs = await intento(() => enviar(ANA, { message: 'busca', messageId: 'busq_falla', webSearch: true, chatId: chatS }));
  const f2 = foto(ANA);
  check('5b', 'repetir la búsqueda reembolsada se rechaza (contrato vigente) sin llamar al modelo, sin cobrar ni reembolsar otra vez', !rs.ok && llamadas === l3 && f2.saldo === 240 && f2.devoluciones === 1 && f2.cobros.length === 1, { r: rs.ok ? 'ok' : rs.e.motivo, f2 });
}

/* ── 6 · concurrencia ───────────────────────────────────────────────────────── */
async function caso6() {
  /* 11 · dos peticiones simultáneas de la MISMA operación. */
  await mundo();
  const chat = exigir(await intento(() => enviar(ANA, { message: 'abre', messageId: 'abre_1' })), '6 base').chatId;
  const f0 = foto(ANA); llamadas = 0;
  const [x, y] = await Promise.all([1, 2].map(() => intento(() => enviar(ANA, { message: 'a la vez', messageId: 'doble_1', chatId: chat }))));
  const ok = [x, y].filter((r) => r.ok);
  const rechazos = [x, y].filter((r) => !r.ok);
  decir('  6a:', JSON.stringify([x, y].map((r) => (r.ok ? { dup: r.v.duplicate } : r.e.motivo))), '· llamadas', llamadas, JSON.stringify(foto(ANA)));
  check('6a', 'misma operación a la vez: 1 sola llamada al modelo', llamadas === 1, { llamadas });
  check('6a', 'una responde y la otra es DUPLICATE_REQUEST o la repetición', ok.length >= 1 && rechazos.every((r) => r.e.motivo === 'DUPLICATE_REQUEST'));
  check('6a', 'el contador sube 1', foto(ANA).totales === f0.totales + 1, foto(ANA));

  await mundo();
  llamadas = 0;
  const chatS = exigir(await intento(() => enviar(ANA, { message: 'abre', messageId: 'abre_s' })), '6 base s').chatId;
  llamadas = 0;
  const par = await Promise.all([1, 2].map(() => intento(() => enviar(ANA, { message: 'busca a la vez', messageId: 'doble_s', webSearch: true, chatId: chatS }))));
  const fS = foto(ANA);
  decir('  6b:', JSON.stringify(par.map((r) => (r.ok ? { dup: r.v.duplicate, credits: r.v.credits } : r.e.motivo))), '· llamadas', llamadas, JSON.stringify(fS));
  check('6b', 'búsqueda igual a la vez: 1 llamada, 1 cobro de 3, saldo 237, sin reembolso', llamadas === 1 && fS.cobros.length === 1 && fS.cobros[0].endsWith('COMPLETED') && fS.saldo === 237 && fS.devoluciones === 0, fS);

  /* 12 · dos operaciones distintas de la misma cuenta a la vez, rondando el 12. */
  await mundo();
  const c12 = await hastaOnce(ANA, 'e');
  const [p, q] = await Promise.all(['msg_zA', 'msg_zB'].map((m) => intento(() => enviar(ANA, { message: m, messageId: m, chatId: c12 }))));
  const fE = foto(ANA);
  decir('  6c:', JSON.stringify([p, q].map((r) => (r.ok ? r.v.credits : r.e.motivo))), JSON.stringify(fE));
  check('6c', 'dos mensajes distintos a la vez con 11 usadas: los dos responden, 1 solo cobro, totales 13, bloque 1', p.ok && q.ok && fE.cobros.length === 1 && fE.totales === 13 && fE.bloque === 1 && fE.saldo === 239, fE);

  /* 13 · dos cuentas a la vez con el mismo id de cliente, las dos en su 12ª. */
  await mundo();
  const ca = await hastaOnce(ANA, 'fa'); const cb = await hastaOnce(BEA, 'fb');
  const [ra, rb] = await Promise.all([[ANA, ca], [BEA, cb]].map(([u, c]) => intento(() => enviar(u, { message: 'doce', messageId: 'mismo_12', chatId: c }))));
  decir('  6d A:', JSON.stringify(foto(ANA)), '· B:', JSON.stringify(foto(BEA)));
  check('6d', 'dos cuentas a la vez con el mismo id: las dos atendidas y cobradas una vez cada una', ra.ok && rb.ok && foto(ANA).cobros.length === 1 && foto(BEA).cobros.length === 1 && foto(ANA).saldo === 239 && foto(BEA).saldo === 239, [ra.ok || ra.e, rb.ok || rb.e]);
}

/* ── 7 · el reclamo: plazo, caída y propiedad ──────────────────────────────── */
async function caso7() {
  await mundo();
  const chat = exigir(await intento(() => enviar(ANA, { message: 'abre', messageId: 'abre_r' })), '7 base').chatId;
  const ruta = rutaReclamo(ANA, chat, 'colgado_1');
  base.docs.set(ruta, { estado: 'pensando', intento: 'otro-intento', reclamadoHasta: Date.now() + 60_000 });
  const l = llamadas;
  const vivo = await intento(() => enviar(ANA, { message: 'x', messageId: 'colgado_1', chatId: chat }));
  check('7a', 'un reclamo vivo de otro intento: DUPLICATE_REQUEST sin llamar al modelo y sin tocar su reclamo', !vivo.ok && vivo.e.motivo === 'DUPLICATE_REQUEST' && llamadas === l && base.leer(ruta).intento === 'otro-intento', vivo.ok ? 'ok' : vivo.e);
  base.docs.set(ruta, { estado: 'pensando', intento: 'muerto', reclamadoHasta: Date.now() - 1 });
  const tras = await intento(() => enviar(ANA, { message: 'x', messageId: 'colgado_1', chatId: chat }));
  check('7b', 'un reclamo caducado (proceso caído) no bloquea: se retoma, 1 llamada, cuenta 1', tras.ok && llamadas === l + 1 && foto(ANA).totales === 2, tras.ok ? foto(ANA) : tras.e);
  check('7c', 'el plazo es mayor que el tiempo máximo de la función (120 s)', PLAZO_DEL_RECLAMO_MS > 120_000, PLAZO_DEL_RECLAMO_MS);
  const ajeno = rutaReclamo(ANA, chat, 'ajeno_1');
  base.docs.set(ajeno, { estado: 'pensando', intento: 'suyo', reclamadoHasta: Date.now() + 60_000 });
  const db = firestoreAdmin();
  const soltado = await soltarMensaje(db, db.doc(ajeno), 'mio', 'fallido');
  check('7d', 'soltar con un intento que no es el dueño no suelta nada', soltado === false && base.leer(ajeno).estado === 'pensando' && base.leer(ajeno).intento === 'suyo');
  /* Identidad: pura y separada por cada componente. */
  const k = (o) => operacionDeBrain({ userId: ANA, chatId: 'c1', messageId: 'm1', service: 'ai_brain', ...o }).requestId;
  check('7e', 'la identidad cambia con la cuenta, la conversación, el mensaje y el servicio, y es estable', new Set([k({}), k({ userId: BEA }), k({ chatId: 'c2' }), k({ messageId: 'm2' }), k({ service: 'ai_search' })]).size === 5 && k({}) === k({}) && /^brain_[a-f0-9]{40}$/.test(k({})));
  check('7f', 'sin ambigüedad por separadores: (c1_x, m) ≠ (c1, x_m)', k({ chatId: 'c1_x', messageId: 'm' }) !== k({ chatId: 'c1', messageId: 'x_m' }));
}

/* ── 8 · regresiones de la ronda 2 (M-1, M-2, M-3) ─────────────────────────── */
async function caso8() {
  const { creditEngine } = lib('credits/creditEngine.js');
  const db = firestoreAdmin();

  /* M-1 · con el mismo mensaje EN CURSO, una búsqueda con ese id se va sin reservar NADA. */
  await mundo();
  const chat = exigir(await intento(() => enviar(ANA, { message: 'abre', messageId: 'abre_m1' })), '8 base').chatId;
  base.docs.set(rutaReclamo(ANA, chat, 'm1_en_curso'), { estado: 'pensando', intento: 'conversacion-en-marcha', reclamadoHasta: Date.now() + 60_000 });
  const l0 = llamadas; const f0 = foto(ANA);
  const busq = await intento(() => enviar(ANA, { message: 'busca', messageId: 'm1_en_curso', webSearch: true, chatId: chat }));
  check('8a', 'M-1: búsqueda contra un mensaje en curso → DUPLICATE_REQUEST, sin reserva AUTHORIZED, sin llamada, saldo intacto',
    !busq.ok && busq.e.motivo === 'DUPLICATE_REQUEST' && llamadas === l0 && JSON.stringify(foto(ANA)) === JSON.stringify(f0)
    && !txDe(ANA).some((t) => t.status === 'AUTHORIZED'), { r: busq.ok ? 'ok' : busq.e.motivo, f: foto(ANA) });
  /* …y lo mismo sin saldo: el rechazo por duplicado llega antes de mirar el saldo. */
  await mundo({ ana: 0 });
  const chat0 = exigir(await intento(() => enviar(ANA, { message: 'abre', messageId: 'abre_m1b' })), '8 base0').chatId;
  base.docs.set(rutaReclamo(ANA, chat0, 'm1b_msg'), { estado: 'pensando', intento: 'otro', reclamadoHasta: Date.now() + 60_000 });
  const pobre = await intento(() => enviar(ANA, { message: 'busca', messageId: 'm1b_msg', webSearch: true, chatId: chat0 }));
  check('8a', 'M-1: el duplicado se decide ANTES que el saldo (DUPLICATE_REQUEST, no INSUFFICIENT_CREDITS)', !pobre.ok && pobre.e.motivo === 'DUPLICATE_REQUEST', pobre.ok ? 'ok' : pobre.e);

  /* M-2 · el reclamo sigue tomado MIENTRAS se reembolsa y mientras se deshace el bloque. */
  await mundo();
  const refund = creditEngine.refundCredits;
  let estadoAlReembolsar = null;
  creditEngine.refundCredits = async (x) => {
    const chats = base.de('brainChats').filter((c) => c.userId === ANA);
    estadoAlReembolsar = chats.map((c) => base.leer(rutaReclamo(ANA, c.id, 'm2_busq'))?.estado).find(Boolean) ?? null;
    return refund.call(creditEngine, x);
  };
  fallarProximas = 1;
  const r2 = await intento(() => enviar(ANA, { message: 'busca', messageId: 'm2_busq', webSearch: true }));
  creditEngine.refundCredits = refund;
  const chatS = base.de('brainChats').find((c) => c.userId === ANA)?.id;
  check('8b', 'M-2: durante el reembolso el reclamo sigue «pensando» (nadie puede entrar en medio); después queda «fallido»',
    !r2.ok && estadoAlReembolsar === 'pensando' && base.leer(rutaReclamo(ANA, chatS, 'm2_busq'))?.estado === 'fallido' && foto(ANA).devoluciones === 1 && foto(ANA).saldo === 240,
    { estadoAlReembolsar, despues: base.leer(rutaReclamo(ANA, chatS, 'm2_busq'))?.estado, f: foto(ANA) });
  /* El reintento DURANTE la compensación: se cuela en mitad del reembolso y debe recibir DUPLICATE_REQUEST. */
  await mundo();
  let colado = null;
  creditEngine.refundCredits = async (x) => {
    const c = base.de('brainChats').find((k) => k.userId === ANA)?.id;
    colado = await intento(() => enviar(ANA, { message: 'busca', messageId: 'm2_colado', webSearch: true, chatId: c }));
    return refund.call(creditEngine, x);
  };
  fallarProximas = 1;
  await intento(() => enviar(ANA, { message: 'busca', messageId: 'm2_colado', webSearch: true }));
  creditEngine.refundCredits = refund;
  const fc = foto(ANA);
  check('8b', 'M-2: un reintento que llega en mitad del reembolso → DUPLICATE_REQUEST; ni búsqueda gratis ni doble reembolso',
    colado && !colado.ok && colado.e.motivo === 'DUPLICATE_REQUEST' && fc.saldo === 240 && fc.devoluciones === 1 && fc.cobros.length === 1 && fc.cobros[0].endsWith('REFUNDED'), { colado: colado?.ok ? colado.v : colado?.e, fc });
  /* Conversación: mientras se DESHACE el bloque, el reclamo sigue tomado. */
  await mundo();
  const cD = await hastaOnce(ANA, 'm2d');
  const deshacer = uso.deshacerRespuesta;
  let estadoAlDeshacer = null;
  uso.deshacerRespuesta = async (u, k, v) => { estadoAlDeshacer = base.leer(rutaReclamo(ANA, cD, 'm2d_doce'))?.estado; return deshacer(u, k, v); };
  const spend = creditEngine.spendCredits;
  creditEngine.spendCredits = async () => { throw new Error('fallo de cobro simulado'); };
  const rd = await intento(() => enviar(ANA, { message: 'doce', messageId: 'm2d_doce', chatId: cD }));
  creditEngine.spendCredits = spend; uso.deshacerRespuesta = deshacer;
  check('8b', 'M-2: al deshacer el bloque el reclamo sigue «pensando»; el bloque vuelve a 11 y no se cobra',
    !rd.ok && estadoAlDeshacer === 'pensando' && foto(ANA).bloque === 11 && foto(ANA).cobros.length === 0, { estadoAlDeshacer, f: foto(ANA) });

  /* M-3 · un intento que se queda colgado y PIERDE el reclamo no toca dinero. */
  await mundo();
  const cZ = await hastaOnce(ANA, 'm3');
  const rZ = rutaReclamo(ANA, cZ, 'm3_doce');
  const correAntes = ADAPTERS.mock.run;
  ADAPTERS.mock.run = async (req) => { const v = await correAntes(req); base.docs.set(rZ, { ...base.leer(rZ), intento: 'dueno-nuevo', reclamadoHasta: Date.now() + 60_000 }); return v; };
  const zombi = await intento(() => enviar(ANA, { message: 'doce', messageId: 'm3_doce', chatId: cZ }));
  ADAPTERS.mock.run = correAntes;
  const fz = foto(ANA);
  check('8c', 'M-3: el intento que perdió el reclamo durante el modelo NO cuenta, NO cobra y NO escribe la respuesta (DUPLICATE_REQUEST)',
    !zombi.ok && zombi.e.motivo === 'DUPLICATE_REQUEST' && fz.totales === 11 && fz.cobros.length === 0 && !base.leer(`brainChats/${cZ}/messages/m3_doce_wee`) && base.leer(rZ).intento === 'dueno-nuevo', { r: zombi.ok ? 'ok' : zombi.e, fz });
  /* El dueño nuevo (cuando su reclamo vence porque, en esta simulación, no existe) retoma y cobra UNA vez. */
  base.docs.set(rZ, { ...base.leer(rZ), reclamadoHasta: Date.now() - 1 });
  const nuevo = await intento(() => enviar(ANA, { message: 'doce', messageId: 'm3_doce', chatId: cZ }));
  check('8c', 'M-3: la recuperación sigue funcionando: el siguiente intento cuenta la 12ª y cobra exactamente 1', nuevo.ok && nuevo.v.credits === 1 && foto(ANA).cobros.length === 1 && foto(ANA).saldo === 239 && foto(ANA).totales === 12, foto(ANA));

  /* M-3 · perder el reclamo DESPUÉS de contar: el zombi no deshace el apunte, el dueño nuevo lo reutiliza y cobra una vez. */
  await mundo();
  const cY = await hastaOnce(ANA, 'm3b');
  const rY = rutaReclamo(ANA, cY, 'm3b_doce');
  const contar = uso.contarRespuesta;
  uso.contarRespuesta = async (u, k, v) => { const r = await contar(u, k, v); base.docs.set(rY, { ...base.leer(rY), intento: 'dueno-nuevo', reclamadoHasta: Date.now() - 1 }); return r; };
  const zb = await intento(() => enviar(ANA, { message: 'doce', messageId: 'm3b_doce', chatId: cY }));
  uso.contarRespuesta = contar;
  const fy = foto(ANA);
  check('8c', 'M-3: perder el reclamo tras contar: el zombi no cobra ni deshace (el apunte de la 12ª se queda)', !zb.ok && fy.totales === 12 && fy.cobros.length === 0, { r: zb.ok ? 'ok' : zb.e, fy });
  const zb2 = await intento(() => enviar(ANA, { message: 'doce', messageId: 'm3b_doce', chatId: cY }));
  check('8c', 'M-3: el siguiente intento reutiliza el apunte (no cuenta otra vez) y cobra exactamente 1', zb2.ok && zb2.v.credits === 1 && foto(ANA).totales === 12 && foto(ANA).cobros.length === 1 && foto(ANA).saldo === 239, foto(ANA));

  /* M-3 · una búsqueda zombi que falla tras perder el reclamo NO reembolsa la reserva de la operación. */
  await mundo();
  const correS = ADAPTERS.mock.run;
  ADAPTERS.mock.run = async () => {
    const c = base.de('brainChats').find((k) => k.userId === ANA)?.id;
    const r = rutaReclamo(ANA, c, 'm3_busq');
    base.docs.set(r, { ...base.leer(r), intento: 'dueno-nuevo', reclamadoHasta: Date.now() + 60_000 });
    throw new ProviderError('fallo tras perder el reclamo', 'mock', 503, false);
  };
  const zs = await intento(() => enviar(ANA, { message: 'busca', messageId: 'm3_busq', webSearch: true }));
  ADAPTERS.mock.run = correS;
  const fs3 = foto(ANA);
  check('8c', 'M-3: la búsqueda zombi no reembolsa la reserva (la cierra el dueño actual): 0 devoluciones, asiento AUTHORIZED', !zs.ok && fs3.devoluciones === 0 && fs3.cobros.length === 1 && fs3.cobros[0].endsWith('AUTHORIZED'), fs3);

  /* A-1 · el mensaje de la persona vuelve a guardarse como siempre: SIN campos del reclamo. */
  await mundo();
  const a1 = exigir(await intento(() => enviar(ANA, { message: 'hola', messageId: 'a1_limpio' })), '8 a1');
  const m = base.leer(`brainChats/${a1.chatId}/messages/a1_limpio`);
  check('8d', 'el mensaje de la persona no lleva estado/intento/plazo (el reclamo vive aparte, solo servidor)', m?.role === 'user' && !('estado' in m) && !('intento' in m) && !('reclamadoHasta' in m), Object.keys(m || {}));
}

/*
 * ── 9 · Firestore exige TODAS las lecturas antes de la primera escritura en una transacción ──
 * La base en memoria no lo comprueba; el emulador sí (así se encontró el defecto de la ronda 2). Esta envoltura
 * ESTRICTA lanza lo mismo que Firestore real, y se aplica a todo el recorrido de `brainChat` y a cada función del reclamo.
 */
const estricta = (b, lecturasTrasEscritura) => new Proxy(b, {
  get(o, k) {
    const v = o[k];
    if (k !== 'runTransaction') return typeof v === 'function' ? v.bind(o) : v;
    return (fn, ...resto) => v.call(o, (tx) => {
      let escribio = false;
      const t = new Proxy(tx, {
        get(x, kk) {
          const w = x[kk];
          if (typeof w !== 'function') return w;
          if (kk === 'get') return (...a) => { if (escribio) { lecturasTrasEscritura.push(a[0]?.path ?? '?'); throw new Error('Firestore transactions require all reads to be executed before all writes.'); } return w.apply(x, a); };
          if (['set', 'update', 'delete', 'create'].includes(kk)) return (...a) => { escribio = true; return w.apply(x, a); };
          return w.bind(x);
        },
      });
      return fn(t);
    }, ...resto);
  },
});
async function caso9() {
  const lecturas = [];
  await mundo();
  const original = base;
  base = estricta(original, lecturas);
  try {
    const chat = await hastaOnce(ANA, 'r9').catch((e) => { base = original; check('9', 'recorrido con la regla «lecturas antes que escrituras»: 0 violaciones', false, { violaciones: lecturas, error: e.message }); return null; });
    if (!chat) return;
    const doce = await intento(() => enviar(ANA, { message: 'doce', messageId: 'r9_msg_12', chatId: chat }));
    const busq = await intento(() => enviar(ANA, { message: 'busca', messageId: 'r9_busq', webSearch: true, chatId: chat }));
    fallarProximas = 1;
    const falla = await intento(() => enviar(ANA, { message: 'falla', messageId: 'r9_falla', chatId: chat }));
    const db = firestoreAdmin();
    const R = db.doc(rutaReclamo(ANA, chat, 'r9_directo'));
    const rec = await uso.reclamarMensaje(db, { reclamo: R, respuesta: db.doc(`brainChats/${chat}/messages/r9_directo_wee`) });
    const ren = await uso.renovarReclamo(db, R, rec.intento);
    const sol = await uso.soltarMensaje(db, R, rec.intento, 'fallido');
    base = original;
    check('9', 'recorrido completo (11 + la 12ª + búsqueda + fallo con compensación) y reclamar/renovar/soltar con la regla «lecturas antes que escrituras»: 0 violaciones',
      lecturas.length === 0 && doce.ok && doce.v.credits === 1 && busq.ok && !falla.ok && rec.estado === 'reclamado' && ren && sol,
      { violaciones: lecturas, doce: doce.ok || doce.e, busq: busq.ok || busq.e, falla: falla.ok || falla.e.motivo });
  } finally { base = original; }
}

decir(`Weë Brain · operación y reclamo · claves al arrancar ${clavesAlArrancar} (borradas) · proveedores reales 0 · GCLOUD_PROJECT ${process.env.GCLOUD_PROJECT}`);
const estado = {};
for (const [id, fn] of [['C0', control], ['1', caso1], ['2', caso2], ['3', caso3], ['4', caso4], ['5', caso5], ['6', caso6], ['7', caso7], ['8', caso8], ['9', caso9]]) {
  decir(`\n── ${id} ──`);
  try { await fn(); estado[id] = 'ejecutado'; } catch (e) { estado[id] = `BLOQUEADO (${e.message})`; decir('  BLOQUEADO:', e.message); }
}
net.Socket.prototype.connect = conectar;
consola.restaurar();
const pasan = resultados.filter((r) => r.ok).length;
decir(`\nResumen: ${pasan}/${resultados.length} pasan · estados ${JSON.stringify(estado)}`);
decir(`Llamadas al modelo simulado (último escenario): ${llamadas} · intentos de red: ${intentosDeRed.length}${intentosDeRed.length ? ' ' + JSON.stringify(intentosDeRed) : ''}`);
const avisos = consola.lineas.filter((l) => l.nivel !== 'log');
decir(`Avisos/errores del servidor apuntados: ${avisos.length}`);
for (const l of avisos.slice(0, 15)) decir(`  [${l.nivel}] ${l.texto.slice(0, 220)}`);
if (falloDeEntorno) decir('Primer fallo de entorno:', JSON.stringify(falloDeEntorno));
process.exit(resultados.some((r) => !r.ok) || falloDeEntorno ? 1 : 0);
