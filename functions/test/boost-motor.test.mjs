/*
 * BOOST — EL MOTOR CON EL CREDIT ENGINE DE VERDAD (functions/src/boost). Sin emuladores.
 *
 * Firestore en memoria (el mismo doble que `credits.test.mjs`) y, encima, el Credit Engine REAL
 * (`createCreditEngine`) y el motor de Boost REAL (`createBoostEngine`). Lo que se prueba:
 *   · que no se reserva nada hasta confirmar y validar en el servidor;
 *   · que la reserva es exactamente el presupuesto validado (lo que mande el cliente se ignora);
 *   · que un reintento no cobra dos veces y que otra operación con el mismo requestId se rechaza;
 *   · que la liquidación cobra solo los días entregados y devuelve el resto, una sola vez;
 *   · que nadie promociona ni lee lo ajeno, y que la entrega respeta el público, el país y la frecuencia.
 *
 * DEPENDENCIA PENDIENTE (docs/BOOST.md §7): el servicio `social_boost` todavía no está en el catálogo del Credit Engine,
 * y Boost no lo puede añadir. Para ejercitar el motor real, ESTA PRUEBA lo registra en memoria, en su propio proceso,
 * exactamente como quedaría cuando el Credit Engine lo incorpore. El código de producción no se toca: sin el registro,
 * la sección «Puerta» comprueba que Boost no reserva nada y responde `servicio-pendiente`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));

const { createCreditEngine } = lib('credits/creditEngine.js');
const costes = lib('credits/creditCosts.js');
const modelo = lib('boost/modelo.js');
const { createBoostEngine } = lib('boost/motor.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (!cond && extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const motivo = async (fn) => {
  try {
    await fn();
    return 'sin-error';
  } catch (e) {
    return e?.motivo ?? e?.code ?? String(e);
  }
};

// ─── Firestore en memoria (copia del doble de credits.test.mjs) ───
const INC = Symbol('inc');
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && !v[INC];
const resolve = (value, existing, deep) => {
  if (value && typeof value === 'object' && value[INC] !== undefined) return (typeof existing === 'number' ? existing : 0) + value[INC];
  if (deep && isObj(value)) {
    const out = isObj(existing) ? { ...existing } : {};
    for (const [k, v] of Object.entries(value)) out[k] = resolve(v, out[k], true);
    return out;
  }
  return value;
};
class FakeDb {
  constructor() { this.docs = new Map(); this.queue = Promise.resolve(); this.autoId = 0; }
  collection(p) { return new Coll(this, p); }
  runTransaction(fn) {
    const run = async () => { const tx = new Tx(this); const r = await fn(tx); tx.commit(); return r; };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }
  read(p) { return this.docs.has(p) ? clone(this.docs.get(p)) : undefined; }
}
class Ref {
  constructor(db, p) { this.db = db; this.path = p; this.id = p.split('/').pop(); }
  async get() { const data = this.db.read(this.path); return { exists: data !== undefined, id: this.id, ref: this, data: () => data }; }
}
class Coll {
  constructor(db, p, filters = [], order = null, max = null) { Object.assign(this, { db, path: p, filters, order, max }); }
  doc(id) { return new Ref(this.db, `${this.path}/${id || 'auto_' + ++this.db.autoId}`); }
  where(field, _op, value) { return new Coll(this.db, this.path, [...this.filters, [field, value]], this.order, this.max); }
  orderBy(field, dir = 'asc') { return new Coll(this.db, this.path, this.filters, [field, dir], this.max); }
  limit(n) { return new Coll(this.db, this.path, this.filters, this.order, n); }
  async get() {
    let rows = [...this.db.docs.entries()].filter(([p]) => p.startsWith(this.path + '/') && !p.slice(this.path.length + 1).includes('/'));
    rows = rows.filter(([, d]) => this.filters.every(([f, v]) => d[f] === v));
    if (this.order) { const [f, dir] = this.order; rows.sort(([, a], [, b]) => (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * (dir === 'desc' ? -1 : 1)); }
    if (this.max) rows = rows.slice(0, this.max);
    const docs = rows.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: new Ref(this.db, p), data: () => clone(d) }));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}
class Tx {
  constructor(db) { this.db = db; this.writes = []; }
  /* Como Firestore: dentro de una transacción, todas las lecturas antes que cualquier escritura. */
  get(t) { if (this.writes.length) throw new Error('Firestore transactions require all reads to be executed before all writes.'); return t.get(); }
  set(ref, data, opts) { this.writes.push({ kind: 'set', ref, data, merge: !!(opts && opts.merge) }); }
  update(ref, data) { this.writes.push({ kind: 'update', ref, data }); }
  commit() {
    for (const w of this.writes) {
      const existing = this.db.docs.get(w.ref.path);
      if (w.kind === 'set' && !w.merge) this.db.docs.set(w.ref.path, resolve(w.data, existing, true));
      else if (w.kind === 'set') this.db.docs.set(w.ref.path, resolve(w.data, existing || {}, true));
      else {
        if (!existing) throw new Error('update sobre documento inexistente: ' + w.ref.path);
        const out = { ...existing };
        for (const [k, v] of Object.entries(w.data)) out[k] = resolve(v, out[k], false);
        this.db.docs.set(w.ref.path, out);
      }
    }
  }
}

// ─── El escenario ───
const DIA = modelo.DIA_MS;
let ahora = Date.UTC(2026, 10, 4, 12, 0, 0);
const db = new FakeDb();
const creditos = createCreditEngine({ db: () => db, increment: (n) => ({ [INC]: n }), now: () => ahora, welcomeCredits: 0, loadCosts: async () => {} });
let config = { ...modelo.CONFIG_POR_DEFECTO, durations: [1, 3, 7], enabled: true };
let registrado = true;
/* Un Credit Engine que puede fallar a propósito, para probar que la liquidación se reintenta sin cobrar dos veces. */
let fallarCompletar = 0;
const creditosConFallos = {
  ...creditos,
  completeCredits: async (i) => { if (fallarCompletar > 0) { fallarCompletar--; throw new Error('caída simulada'); } return creditos.completeCredits(i); },
};
const motor = createBoostEngine({ db: () => db, creditos: creditosConFallos, servicioRegistrado: () => registrado, ahora: () => ahora, config: async () => modelo.leerConfig(config) });

const perfil = (uid, extra = {}) => db.docs.set(`users/${uid}`, { uid, profileType: uid.startsWith('hidi_') ? 'hidi' : 'real', displayName: uid, ...extra });
const saldo = (uid) => db.read(`users/${uid}`).creditsBalance;
const usos = (uid) => [...db.docs.entries()].filter(([p, d]) => p.startsWith('creditTransactions/') && d.userId === uid).map(([p, d]) => ({ id: p.split('/').pop(), ...d }));
const post = (id, userId, extra = {}) => db.docs.set(`posts/${id}`, { userId, content: `texto de ${id}`, isPrivate: false, createdAt: ahora, ...extra });
const cargar = async (uid, n) => creditos.grantCredits({ userId: uid, amount: n, reason: 'prueba', source: 'test', requestId: `carga_${uid}_${n}_${ahora}` });

perfil('ana', { country: 'PE', joinedCommunities: ['cine'] });
perfil('hidi_ana', { linkedAccountId: 'ana' });
perfil('hidi_falso'); // una cara sin vínculo: no es de nadie
perfil('bob', { country: 'MX' });
perfil('carla', { country: 'PE', joinedCommunities: ['cine'] });
perfil('dani', { country: 'PE' });
for (const u of ['ana', 'bob', 'carla', 'dani']) await creditos.ensureAccount(u);
await cargar('ana', 20_000);
await cargar('bob', 600);
post('p_ana', 'ana', { communityId: 'cine' });
post('p_ana_wee', 'hidi_ana');
post('p_ana_2', 'ana');
post('p_ana_3', 'ana');
post('p_ana_4', 'ana');
post('p_bob', 'bob');
post('p_falso', 'hidi_falso');
post('p_privado', 'ana', { isPrivate: true });
post('p_repost', 'ana', { isRepost: true, originalPostId: 'p_bob' });

const pedir = (extra = {}) => ({ requestId: `req_${Math.random().toString(36).slice(2, 12)}`, postId: 'p_ana', objective: 'reach', segment: 'everyone', budgetCredits: 1500, durationDays: 3, ...extra });

// ═══ Modelo ═══
console.log('\n── Modelo: validación en el servidor ──');
{
  const c = modelo.leerConfig({ enabled: true });
  const ok = modelo.validarPeticion({ ...pedir(), amount: 1, total: 1, price: 0 }, c);
  check('M1) los totales del cliente no existen: solo se leen los campos conocidos', ok.budgetCredits === 1500 && !('amount' in ok) && !('total' in ok) && !('price' in ok));
  check('M2) objetivo fuera del catálogo → objetivo', (await motivo(() => modelo.validarPeticion(pedir({ objective: 'sales' }), c))) === 'objetivo');
  check('M3) segmento fuera del catálogo → segmento', (await motivo(() => modelo.validarPeticion(pedir({ segment: 'lookalike' }), c))) === 'segmento');
  check('M4) duración no permitida → duracion', (await motivo(() => modelo.validarPeticion(pedir({ durationDays: 2 }), c))) === 'duracion');
  check('M5) presupuesto bajo el mínimo, sobre el máximo, fuera del paso o no entero → presupuesto',
    (await Promise.all([400, 10_500, 1200, 1500.5, '1500', -500].map((b) => motivo(() => modelo.validarPeticion(pedir({ budgetCredits: b }), c))))).every((m) => m === 'presupuesto'));
  check('M6) país con formato inválido → pais', (await motivo(() => modelo.validarPeticion(pedir({ country: 'peru' }), c))) === 'pais');
  check('M7) país con los contactos no aplica → pais', (await motivo(() => modelo.validarPeticion(pedir({ segment: 'contacts', country: 'PE' }), c))) === 'pais');
  check('M8) requestId inválido → peticion', (await motivo(() => modelo.validarPeticion(pedir({ requestId: 'x' }), c))) === 'peticion');
  check('M9) consumo: 1500 en 3 días con entrega en 1 día = 500', modelo.consumoDe(1500, 3, { 0: 4 }).consumido === 500);
  check('M10) consumo: nunca de más (redondeo hacia abajo) y sin días fuera de la duración', modelo.consumoDe(1000, 3, { 0: 1, 1: 1 }).consumido === 666 && modelo.consumoDe(1000, 3, { 0: 1, 5: 9 }).diasConEntrega === 1);
  check('M11) consumo: sin entregas, 0', modelo.consumoDe(1500, 3, {}).consumido === 0 && modelo.consumoDe(1500, 3, { 0: 0 }).consumido === 0);
  check('M12) configuración absurda → por defecto y CERRADA', modelo.leerConfig({ enabled: true, minBudget: 900, maxBudget: 10 }).enabled === false);
  check('M13) por defecto Boost está cerrado', modelo.leerConfig(null).enabled === false && modelo.CONFIG_POR_DEFECTO.enabled === false);
  const h1 = modelo.huellaDe('ana', modelo.validarPeticion(pedir({ requestId: 'aaaaaaaaaa' }), c));
  const h2 = modelo.huellaDe('ana', modelo.validarPeticion(pedir({ requestId: 'aaaaaaaaaa', budgetCredits: 2000 }), c));
  check('M14) la huella cambia con lo que se pide y es aceptable para el Credit Engine', h1 !== h2 && /^[a-f0-9]{32}$/.test(h1));
}

// ═══ Puerta ═══
console.log('\n── Puerta: nada se reserva sin servicio, sin abrir o sin confirmar ──');
{
  const antes = saldo('ana');
  const n = usos('ana').length;
  check('P0) hoy el catálogo del Credit Engine NO tiene `social_boost` (dependencia documentada)', costes.isCreditService('social_boost') === false || (console.log('   (nota: el Credit Engine ya lo registró)'), true));
  registrado = false;
  check('P1) sin el servicio en el catálogo → servicio-pendiente', (await motivo(() => motor.crear('ana', pedir()))) === 'servicio-pendiente');
  registrado = true;
  config = { ...config, enabled: false };
  check('P2) con Boost cerrado → cerrado', (await motivo(() => motor.crear('ana', pedir()))) === 'cerrado');
  check('P3) cerrado tampoco entrega nada en el feed', (await motor.servir('carla')).promoted === null);
  config = { ...config, enabled: true };
  await motor.opciones('ana');
  await motor.estimar('ana', pedir());
  check('P4) ver opciones y estimar no reserva nada', saldo('ana') === antes && usos('ana').length === n);
  check('P5) ninguna de las puertas cerradas tocó el saldo ni el historial', saldo('ana') === antes && usos('ana').length === n);
}

// Desde aquí, el servicio está registrado EN ESTE PROCESO (simula la incorporación pendiente al catálogo).
costes.CREDIT_COSTS.social_boost = 1;
costes.SERVICE_LABEL.social_boost = 'Boost de una publicación';
if (!costes.CREDIT_SERVICES.includes('social_boost')) costes.CREDIT_SERVICES.push('social_boost');

// ═══ Autorización ═══
console.log('\n── Autorización: solo lo propio ──');
{
  const antes = saldo('ana');
  check('A1) promocionar la publicación de otra cuenta → ajena', (await motivo(() => motor.crear('ana', pedir({ postId: 'p_bob' })))) === 'ajena');
  check('A2) una cara sin vínculo no es de nadie → ajena', (await motivo(() => motor.crear('ana', pedir({ postId: 'p_falso' })))) === 'ajena');
  check('A3) publicación privada → no-promocionable', (await motivo(() => motor.crear('ana', pedir({ postId: 'p_privado' })))) === 'no-promocionable');
  check('A4) un repost → no-promocionable', (await motivo(() => motor.crear('ana', pedir({ postId: 'p_repost' })))) === 'no-promocionable');
  check('A5) publicación inexistente → publicacion', (await motivo(() => motor.crear('ana', pedir({ postId: 'nada' })))) === 'publicacion');
  check('A6) público de comunidad sin comunidad → sin-comunidad', (await motivo(() => motor.crear('ana', pedir({ postId: 'p_ana_2', segment: 'community' })))) === 'sin-comunidad');
  check('A7) ningún rechazo reservó nada', saldo('ana') === antes && usos('ana').filter((t) => t.type === 'usage').length === 0);
  const mias = await motor.misPublicaciones('ana');
  const ids = mias.posts.map((p) => p.id);
  check('A8) «mis publicaciones» trae las dos caras de la cuenta y nada ajeno, privado ni repost',
    ids.includes('p_ana') && ids.includes('p_ana_wee') && !ids.includes('p_bob') && !ids.includes('p_privado') && !ids.includes('p_repost') && !ids.includes('p_falso'));
  check('A9) y marca de qué cara es cada una', mias.posts.find((p) => p.id === 'p_ana_wee')?.identityKind === 'wee' && mias.posts.find((p) => p.id === 'p_ana')?.identityKind === 'real');
}

// ═══ Reserva ═══
console.log('\n── Reserva: exactamente el presupuesto, una sola vez ──');
let campanaA;
{
  const antes = saldo('ana');
  const p = pedir({ requestId: 'reserva_a_001', amount: 1, total: 1 });
  const r = await motor.crear('ana', p);
  campanaA = r.campaign;
  const uso = db.read('creditTransactions/usage_bst_reserva_a_001');
  check('R1) reserva exactamente el presupuesto validado (1500), aunque el cliente dijera 1', saldo('ana') === antes - 1500 && uso.amount === -1500);
  check('R2) la reserva es del Credit Engine: AUTHORIZED, servicio social_boost, huella, fuente boost', uso.status === 'AUTHORIZED' && uso.service === 'social_boost' && /^[a-f0-9]{32}$/.test(uso.fingerprint) && uso.source === 'boost');
  check('R3) la campaña queda activa con su ventana y sin métricas inventadas',
    campanaA.status === 'active' && campanaA.endsAt - campanaA.startsAt === 3 * DIA && campanaA.metrics.impressions === 0 && campanaA.metrics.reach === 0 && campanaA.metrics.clicks === 0);
  check('R4) la publicación queda bloqueada para otra campaña', db.read('boostPostLocks/p_ana').activeCampaignId === 'bst_reserva_a_001');
  const otra = await motor.crear('ana', p);
  check('R5) el mismo requestId con lo mismo → la misma campaña, sin cobrar otra vez', otra.duplicate === true && saldo('ana') === antes - 1500 && usos('ana').filter((t) => t.type === 'usage').length === 1);
  check('R6) el mismo requestId con otro presupuesto → conflicto y el saldo no se mueve',
    (await motivo(() => motor.crear('ana', { ...p, budgetCredits: 2000 }))) === 'conflicto' && saldo('ana') === antes - 1500);
  check('R7) otra campaña sobre la misma publicación → ya-promocionada, sin reservar',
    (await motivo(() => motor.crear('ana', pedir({ requestId: 'reserva_a_002' })))) === 'ya-promocionada' && saldo('ana') === antes - 1500 && !db.read('creditTransactions/usage_bst_reserva_a_002'));
  const dobles = await Promise.all([motor.crear('ana', pedir({ requestId: 'doble_clic_01', postId: 'p_ana_2' })), motor.crear('ana', pedir({ requestId: 'doble_clic_01', postId: 'p_ana_2' }))]);
  check('R8) doble clic simultáneo → una sola reserva', dobles.filter((d) => !d.duplicate).length === 1 && saldo('ana') === antes - 3000 && usos('ana').filter((t) => t.type === 'usage').length === 2);
  const bobAntes = saldo('bob');
  check('R9) sin saldo suficiente → saldo, sin campaña y sin moverse nada',
    (await motivo(() => motor.crear('bob', pedir({ requestId: 'bob_pobre_01', postId: 'p_bob', budgetCredits: 1000 })))) === 'saldo' && saldo('bob') === bobAntes && !db.read('boostCampaigns/bst_bob_pobre_01'));
  const wee = await motor.crear('ana', pedir({ requestId: 'cara_wee_001', postId: 'p_ana_wee', budgetCredits: 500, durationDays: 1 }));
  check('R10) la publicación del Perfil Weë se paga con la MISMA billetera de la cuenta', wee.campaign.status === 'active' && saldo('ana') === antes - 3500 && db.read('creditTransactions/usage_bst_cara_wee_001').userId === 'ana');
}

// ═══ Privacidad ═══
console.log('\n── Privacidad: nadie lee las campañas de otro ──');
{
  check('V1) Bob no puede leer la campaña de Ana (no existe para él)', (await motivo(() => motor.detalle('bob', { campaignId: campanaA.id }))) === 'no-existe');
  check('V2) ni terminarla', (await motivo(() => motor.terminar('bob', { campaignId: campanaA.id }))) === 'no-existe' && db.read(`boostCampaigns/${campanaA.id}`).status === 'active');
  check('V3) la lista de Bob no trae nada de Ana', (await motor.listar('bob')).campaigns.length === 0);
  const lista = (await motor.listar('ana')).campaigns;
  check('V4) la de Ana trae las suyas y sin datos internos (sin huella)', lista.length === 3 && lista.every((c) => !('fingerprint' in c) && !('requestId' in c)));
}

// ═══ Entrega ═══
console.log('\n── Entrega: público, país, frecuencia; impresiones reales ──');
{
  // Termina la de Perfil Weë y la de p_ana_2 para que solo quede la de p_ana (público everyone) en juego.
  await motor.terminar('ana', { campaignId: 'bst_cara_wee_001' });
  await motor.terminar('ana', { campaignId: 'bst_doble_clic_01' });
  check('E1) quien promociona no se ve a sí mismo', (await motor.servir('ana')).promoted === null);
  const s1 = await motor.servir('carla');
  check('E2) otra cuenta recibe la publicación promocionada, con su campaña', s1.promoted?.campaignId === campanaA.id && s1.promoted.post.id === 'p_ana');
  let c = db.read(`boostCampaigns/${campanaA.id}`);
  check('E3) se registró UNA impresión real, un alcance y el día 0', c.metrics.impressions === 1 && c.metrics.reach === 1 && c.metrics.byDay['0'] === 1);
  check('E4) la misma cuenta, el mismo día → nada (una vez por cuenta y día)', (await motor.servir('carla')).promoted === null && db.read(`boostCampaigns/${campanaA.id}`).metrics.impressions === 1);
  check('E5) abrir la publicación cuenta un clic, una vez', (await motor.interaccion('carla', { campaignId: campanaA.id })).counted === true && (await motor.interaccion('carla', { campaignId: campanaA.id })).counted === false);
  check('E6) quien nunca la vio no puede sumar clics', (await motor.interaccion('dani', { campaignId: campanaA.id })).counted === false && db.read(`boostCampaigns/${campanaA.id}`).metrics.clicks === 1);

  // País: una campaña acotada a México.
  await motor.crear('ana', pedir({ requestId: 'pais_mx_0001', postId: 'p_ana_3', country: 'MX', budgetCredits: 500, durationDays: 1 }));
  const sDani = await motor.servir('dani');
  check('E7) el país es el DECLARADO en el perfil: Dani (PE) no recibe la campaña de MX', sDani.promoted === null || sDani.promoted.campaignId !== 'bst_pais_mx_0001');
  const sBob = await motor.servir('bob');
  check('E8) Bob (MX) sí', sBob.promoted?.campaignId === 'bst_pais_mx_0001' || (await motor.servir('bob')).promoted?.campaignId === 'bst_pais_mx_0001');

  // Contactos.
  await motor.crear('ana', pedir({ requestId: 'contactos_01', postId: 'p_ana_4', segment: 'contacts', budgetCredits: 500, durationDays: 1 }));
  ahora += 60_000;
  const antesDeContacto = await motor.servir('dani');
  check('E9) sin ËContact aceptado no se entrega a los contactos', antesDeContacto.promoted?.campaignId !== 'bst_contactos_01');
  db.docs.set('econtacts/ana_dani', { users: ['ana', 'dani'], status: 'pending' });
  check('E10) pendiente tampoco', (await motor.servir('dani')).promoted?.campaignId !== 'bst_contactos_01');
  db.docs.set('econtacts/ana_dani', { users: ['ana', 'dani'], status: 'accepted' });
  check('E11) aceptado, sí', (await motor.servir('dani')).promoted?.campaignId === 'bst_contactos_01');
}

// ═══ Liquidación ═══
console.log('\n── Liquidación: se cobra lo entregado, se devuelve el resto, una sola vez ──');
{
  // La de Perfil Weë se terminó sin ninguna entrega: devolución completa.
  const w = db.read('boostCampaigns/bst_cara_wee_001');
  const uw = db.read('creditTransactions/usage_bst_cara_wee_001');
  check('L1) cancelada sin entregas → se devuelve TODO (REFUNDED) y consumo 0', w.status === 'ended' && w.settlement.consumed === 0 && w.settlement.refunded === 500 && uw.status === 'REFUNDED' && db.read('creditTransactions/refund_bst_cara_wee_001').amount === 500);
  check('L2) y la publicación queda libre otra vez', db.read('boostPostLocks/p_ana_wee').activeCampaignId === null);

  // Campaña A: entrega el día 0; se cancela el día 1 → consume 1/3 de 1500 = 500, devuelve 1000.
  ahora += DIA;
  const antes = saldo('ana');
  const r = await motor.terminar('ana', { campaignId: campanaA.id });
  const ua = db.read(`creditTransactions/usage_${campanaA.id}`);
  check('L3) cancelada tras un día con entrega → consume 500 y devuelve 1000', r.campaign.status === 'ended' && r.campaign.settlement.consumed === 500 && r.campaign.settlement.refunded === 1000 && saldo('ana') === antes + 1000);
  check('L4) en el Credit Engine: COMPLETED con finalAmount 500 y el ajuste de +1000', ua.status === 'COMPLETED' && ua.finalAmount === 500 && db.read(`creditTransactions/adjust_${campanaA.id}`).amount === 1000);
  const otra = await motor.terminar('ana', { campaignId: campanaA.id });
  check('L5) terminarla otra vez no devuelve nada más', otra.campaign.status === 'ended' && saldo('ana') === antes + 1000);
  check('L6) ya terminada no se entrega a nadie', (await motor.servir('bob')).promoted?.campaignId !== campanaA.id);

  // Fallo del Credit Engine al liquidar: se queda en settling y el barrido reintenta con el MISMO número.
  await motor.crear('ana', pedir({ requestId: 'caida_cred_1', postId: 'p_ana', budgetCredits: 3000, durationDays: 3 }));
  await motor.servir('carla');
  ahora += DIA;
  await motor.servir('carla');
  const antesCaida = saldo('ana');
  fallarCompletar = 1;
  const caida = await motor.terminar('ana', { campaignId: 'bst_caida_cred_1' });
  check('L7) si el Credit Engine falla, la campaña queda en settling y el saldo no cambia', caida.campaign.status === 'settling' && saldo('ana') === antesCaida && db.read('creditTransactions/usage_bst_caida_cred_1').status === 'AUTHORIZED');
  check('L8) y deja de entregarse mientras tanto', (await motor.servir('dani')).promoted?.campaignId !== 'bst_caida_cred_1');
  const inf = await motor.barrer();
  const cc = db.read('boostCampaigns/bst_caida_cred_1');
  check('L9) el barrido la liquida: 2 días de 3 con entrega → 2000 consumidos, 1000 devueltos', inf.liquidadas >= 1 && cc.status === 'ended' && cc.settlement.consumed === 2000 && saldo('ana') === antesCaida + 1000);
  await motor.barrer();
  check('L10) un segundo barrido no vuelve a devolver', saldo('ana') === antesCaida + 1000);
}

// ═══ Barrido ═══
console.log('\n── Barrido: vencidas, publicaciones que desaparecen y reservas huérfanas ──');
{
  // Vencida: 3 días, entrega solo el día 0.
  await motor.crear('ana', pedir({ requestId: 'vence_00001', postId: 'p_ana_2', budgetCredits: 1500, durationDays: 3 }));
  await motor.servir('carla');
  const antes = saldo('ana');
  ahora += 3 * DIA + 1;
  check('B1) al vencer, ya no se entrega aunque el barrido no haya pasado', (await motor.servir('bob')).promoted?.campaignId !== 'bst_vence_00001');
  await motor.barrer();
  const v = db.read('boostCampaigns/bst_vence_00001');
  check('B2) vencida → completed: 1 día de 3 → 500 consumidos, 1000 devueltos', v.status === 'ended' && v.endedReason === 'completed' && v.settlement.consumed === 500 && saldo('ana') >= antes + 1000);

  // La publicación desaparece.
  await motor.crear('ana', pedir({ requestId: 'borrado_0001', postId: 'p_ana_3', budgetCredits: 500, durationDays: 1 }));
  const antesBorrado = saldo('ana');
  db.docs.delete('posts/p_ana_3');
  await motor.barrer();
  const b = db.read('boostCampaigns/bst_borrado_0001');
  check('B3) publicación borrada → post_unavailable y devolución completa (no hubo entrega)', b.status === 'ended' && b.endedReason === 'post_unavailable' && saldo('ana') === antesBorrado + 500);

  // Reserva huérfana: se reservó y el proceso murió antes de crear la campaña.
  await creditos.spendCredits({ userId: 'ana', service: 'social_boost', requestId: 'bst_huerfana_01', amount: 500, reason: 'Boost', source: 'boost', fingerprint: 'a'.repeat(32) });
  const antesH = saldo('ana');
  await motor.barrer();
  check('B4) huérfana reciente: todavía no se toca (podría estar creándose)', saldo('ana') === antesH);
  ahora += 20 * 60 * 1000;
  await motor.barrer();
  check('B5) huérfana vieja: se devuelve entera, una vez', saldo('ana') === antesH + 500 && db.read('creditTransactions/usage_bst_huerfana_01').status === 'REFUNDED');
  await motor.barrer();
  check('B6) y no dos', saldo('ana') === antesH + 500);
}

// ═══ Cuadre ═══
console.log('\n── Cuadre: el saldo final es lo cargado menos lo entregado ──');
{
  const consumido = [...db.docs.entries()].filter(([p]) => p.startsWith('boostCampaigns/') && p.split('/').length === 2)
    .map(([, c]) => c).filter((c) => c.ownerAccountId === 'ana' && c.status === 'ended').reduce((s, c) => s + c.settlement.consumed, 0);
  const vivas = [...db.docs.entries()].filter(([p]) => p.startsWith('boostCampaigns/') && p.split('/').length === 2)
    .map(([, c]) => c).filter((c) => c.ownerAccountId === 'ana' && c.status !== 'ended').reduce((s, c) => s + c.budgetCredits, 0);
  check('C1) 20 000 − lo consumido − lo todavía reservado = saldo de Ana', saldo('ana') === 20_000 - consumido - vivas, `saldo ${saldo('ana')}, consumido ${consumido}, reservado ${vivas}`);
  check('C2) ningún documento de Boost escribe en el saldo: solo creditTransactions del motor', [...db.docs.keys()].filter((p) => p.startsWith('boostCampaigns/')).every((p) => !('creditsBalance' in db.read(p))));
}

// ═══ La callable ═══
console.log('\n── La callable `boost` ──');
{
  const index = lib('index.js');
  check('K1) `boost` y `boostSweep` están exportadas', typeof index.boost === 'function' && !!index.boost.__endpoint && !!index.boostSweep?.__endpoint);
  let codigo = null;
  try { await index.boost.run({ data: { action: 'list' }, auth: undefined, rawRequest: {} }); } catch (e) { codigo = e.code; }
  check('K2) sin sesión → unauthenticated, antes de leer nada', codigo === 'unauthenticated');
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
