/**
 * PRE-F1-D · UN requestId ES UNA OPERACIÓN: la misma clave con otro contenido no es un reintento.
 *
 * El hueco que se cierra: `generateVideo` daba por «suyo» el requestId de OTRA operación ya cobrada —una
 * respuesta de Weë Brain, `brain_<messageId>`, COMPLETED—, no encontraba ningún vídeo y seguía hasta generar:
 * un vídeo sin cobro. Y un vídeo COMPLETED cuyo resultado no aparecía se volvía a generar gratis.
 *
 *   A · El Credit Engine: la misma clave solo es la misma operación con la misma cuenta y el mismo servicio;
 *       con huella, además, con la misma huella y el mismo importe.
 *   B · La puerta de vídeo de verdad (`generateVideo.run`) con Firestore en memoria y el motor de vídeo espiado:
 *       qué se genera, qué se cobra y qué se devuelve, caso por caso (A–J del encargo y la prueba especial).
 *   C · Las fronteras: la huella la pone el servidor, se compara dentro de la transacción del cobro y nada de
 *       esto abre otra puerta, otro conductor ni otro motor.
 *
 * Sin red, sin proveedor, sin emulador. Usa el compilado: `npm run build` antes.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

/* ═══ Firestore en memoria: el de `credits.test.mjs`, con los centinelas y las horas de verdad ═══ */
const fa = require('firebase-admin/firestore');
const esTipo = (v, nombre) => !!v && typeof v === 'object' && v.constructor?.name === nombre;
const esPlano = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
/* Copia lo plano y deja tal cual lo que no lo es (un Timestamp es inmutable y tiene que seguir siéndolo). */
const copia = (v) => (Array.isArray(v) ? v.map(copia) : esPlano(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copia(x)])) : v);
const resolver = (valor, previo, profundo) => {
  if (esTipo(valor, 'NumericIncrementTransform')) return (typeof previo === 'number' ? previo : 0) + valor.operand;
  if (esTipo(valor, 'ServerTimestampTransform')) return fa.Timestamp.now();
  if (Array.isArray(valor)) return valor.map((x) => resolver(x, undefined, true));
  if (profundo && esPlano(valor)) {
    const out = esPlano(previo) ? { ...previo } : {};
    for (const [k, v] of Object.entries(valor)) out[k] = resolver(v, out[k], true);
    return out;
  }
  return copia(valor);
};
const leerCampo = (d, f) => f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);

class Base {
  constructor() { this.docs = new Map(); this.cola = Promise.resolve(); this.auto = 0; }
  collection(p) { return new Consulta(this, p); }
  doc(p) { return new Ref(this, p); }
  /* Transacciones en fila, como las serializa Firestore: lo que una escribe lo lee la siguiente. */
  runTransaction(fn) {
    const correr = async () => { const tx = new Tx(this); const r = await fn(tx); tx.confirmar(); return r; };
    const p = this.cola.then(correr, correr);
    this.cola = p.catch(() => {});
    return p;
  }
  leer(p) { return this.docs.has(p) ? copia(this.docs.get(p)) : undefined; }
  de(c) { return [...this.docs.entries()].filter(([p]) => p.startsWith(`${c}/`) && !p.slice(c.length + 1).includes('/')).map(([p, d]) => ({ id: p.slice(c.length + 1), ...d })); }
}
const escribir = (base, w) => {
  const previo = base.docs.get(w.ref.path);
  if (w.tipo === 'delete') { base.docs.delete(w.ref.path); return; }
  if (w.tipo === 'set') { base.docs.set(w.ref.path, resolver(w.data, w.merge ? (previo || {}) : undefined, true)); return; }
  if (!previo) throw new Error(`update sobre un documento que no existe: ${w.ref.path}`);
  const out = { ...previo };
  for (const [k, v] of Object.entries(w.data)) out[k] = resolver(v, out[k], false);
  base.docs.set(w.ref.path, out);
};
class Ref {
  constructor(base, p) { this.base = base; this.path = p; this.id = p.split('/').pop(); }
  collection(c) { return new Consulta(this.base, `${this.path}/${c}`); }
  async get() { const d = this.base.leer(this.path); return { exists: d !== undefined, id: this.id, ref: this, data: () => d }; }
  async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
  async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
  async delete() { this.base.docs.delete(this.path); }
}
class Consulta {
  constructor(base, p, filtros = [], tope = null) { Object.assign(this, { base, path: p, filtros, tope }); }
  doc(id) { return new Ref(this.base, `${this.path}/${id ?? `auto_${++this.base.auto}`}`); }
  where(campo, op, valor) {
    if (op !== '==') throw new Error(`esta base de prueba solo sabe «==»: ${op}`);
    return new Consulta(this.base, this.path, [...this.filtros, [campo, valor]], this.tope);
  }
  limit(tope) { return new Consulta(this.base, this.path, this.filtros, tope); }
  async get() {
    let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.filtros.every(([f, v]) => leerCampo(d, f) === v));
    if (this.tope) filas = filas.slice(0, this.tope);
    const docs = filas.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: new Ref(this.base, p), data: () => copia(d) }));
    return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
  }
}
class Tx {
  constructor(base) { this.base = base; this.escrituras = []; }
  get(objetivo) { return objetivo.get(); }
  set(ref, data, opts) { this.escrituras.push({ tipo: 'set', ref, data, merge: !!opts?.merge }); return this; }
  update(ref, data) { this.escrituras.push({ tipo: 'update', ref, data }); return this; }
  delete(ref) { this.escrituras.push({ tipo: 'delete', ref }); return this; }
  confirmar() { for (const w of this.escrituras) escribir(this.base, w); }
}

const perfil = (base, uid, saldo = 5000) => {
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid });
  return async (motor) => {
    await motor.ensureAccount(uid);
    base.docs.get(`users/doc_${uid}`).creditsBalance = saldo;
  };
};
const saldoEn = (base, uid) => base.docs.get(`users/doc_${uid}`).creditsBalance;
const huellaDePrueba = (texto) => createHash('sha256').update(texto).digest('hex');

/* ═══ A · EL CREDIT ENGINE ════════════════════════════════════════════════ */
console.log('\n── A · El Credit Engine: la misma clave es la misma operación, o no es un reintento ──');
const { createCreditEngine } = lib('credits/creditEngine.js');
const baseA = new Base();
const motorA = createCreditEngine({
  db: () => baseA,
  increment: (x) => fa.FieldValue.increment(x),
  now: () => fa.Timestamp.now(),
  welcomeCredits: 240,
  loadCosts: async () => {},
});
const rechazaA = async (fn) => { const r = await intento(fn); return r.ok ? null : r.error; };
await perfil(baseA, 'ana')(motorA);
await perfil(baseA, 'bea')(motorA);
{
  /* Weë Brain cobró una respuesta y la cerró. */
  await motorA.spendCredits({ userId: 'ana', service: 'ai_brain', amount: 1, requestId: 'brain_123', source: 'weë-brain' });
  await motorA.completeCredits({ userId: 'ana', requestId: 'brain_123' });
  const antes = JSON.stringify(baseA.leer('creditTransactions/usage_brain_123'));
  const saldo = saldoEn(baseA, 'ana');
  const e = await rechazaA(() => motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'brain_123', source: 'weë-studio', fingerprint: huellaDePrueba('video') }));
  check('A1) el requestId de una respuesta de Brain COMPLETED no sirve para otro servicio: INVALID_REQUEST · idempotency_conflict',
    e?.code === 'INVALID_REQUEST' && e?.details?.reason === 'idempotency_conflict', `${e?.code} · ${e?.details?.reason}`);
  check('A2) y no toca nada: ni la reserva de Brain ni el saldo',
    JSON.stringify(baseA.leer('creditTransactions/usage_brain_123')) === antes && saldoEn(baseA, 'ana') === saldo);
  /* D, sin huella de por medio: el servicio es identidad en TODAS las puertas. */
  await motorA.spendCredits({ userId: 'ana', service: 'ai_image', requestId: 'img_1', source: 'test' });
  const d = await rechazaA(() => motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 50, requestId: 'img_1', source: 'test' }));
  check('A3) D · el mismo requestId con otro servicio se rechaza aunque nadie traiga huella', d?.code === 'INVALID_REQUEST' && d?.details?.reason === 'idempotency_conflict');
}
{
  const H = huellaDePrueba('el vídeo de ana');
  const primera = await motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_a', source: 'weë-studio', fingerprint: H });
  const guardada = baseA.leer('creditTransactions/usage_vid_a');
  check('A4) la reserva guarda su huella', primera.status === 'AUTHORIZED' && guardada.fingerprint === H && guardada.authorizedAmount === 160);
  const saldo = saldoEn(baseA, 'ana');
  const e = await rechazaA(() => motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 182, requestId: 'vid_a', source: 'weë-studio', fingerprint: H }));
  check('A5) E · la misma huella con OTRO importe es otra operación', e?.code === 'INVALID_REQUEST' && e?.details?.reason === 'idempotency_conflict');
  const f = await rechazaA(() => motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_a', source: 'weë-studio', fingerprint: huellaDePrueba('otro vídeo') }));
  check('A6) otra huella con el mismo importe, también', f?.code === 'INVALID_REQUEST' && f?.details?.reason === 'idempotency_conflict');
  const g = await rechazaA(() => motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_a', source: 'weë-studio' }));
  check('A7) y quien no trae huella no se cuela en una reserva que la tiene', g?.code === 'INVALID_REQUEST' && g?.details?.reason === 'idempotency_conflict');
  const otra = await rechazaA(() => motorA.spendCredits({ userId: 'bea', service: 'ai_video', amount: 160, requestId: 'vid_a', source: 'weë-studio', fingerprint: H }));
  check('A8) C · otra cuenta con la misma clave: FORBIDDEN, como antes', otra?.code === 'FORBIDDEN');
  check('A9) ningún rechazo cobró ni escribió nada', saldoEn(baseA, 'ana') === saldo && baseA.de('creditTransactions').filter((t) => t.requestId === 'vid_a').length === 1);
  const repetida = await motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_a', source: 'weë-studio', fingerprint: H });
  check('A10) B · la MISMA operación repetida es un duplicado sin cobro', repetida.duplicate && repetida.status === 'AUTHORIZED' && saldoEn(baseA, 'ana') === saldo);
  await motorA.completeCredits({ userId: 'ana', requestId: 'vid_a' });
  const tras = await motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_a', source: 'weë-studio', fingerprint: H });
  check('A11) G · y ya COMPLETED, igual: duplicado, sin volver a cobrar', tras.duplicate && tras.status === 'COMPLETED' && saldoEn(baseA, 'ana') === saldo);
}
{
  /* El reverso, que se deja fijado para que nadie lo cambie sin decidirlo: sin huella, el importe no es identidad. */
  await motorA.spendCredits({ userId: 'ana', service: 'ai_brain', amount: 1, requestId: 'brain_7', source: 'weë-brain' });
  const r = await motorA.spendCredits({ userId: 'ana', service: 'ai_brain', amount: 2, requestId: 'brain_7', source: 'weë-brain' });
  check('A12) sin huella —Brain, avatar, creatorRun—, el mismo servicio con otro importe sigue siendo un duplicado: Brain recalcula el precio del mismo mensaje con el historial',
    r.duplicate && r.amount === 1);
  const e = await rechazaA(() => motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_x', source: 'weë-studio', fingerprint: 'NO-ES-HEX' }));
  check('A13) una huella con mala forma se rechaza antes de tocar nada', e?.code === 'INVALID_REQUEST' && !baseA.leer('creditTransactions/usage_vid_x'));
}
{
  const H = huellaDePrueba('carrera');
  const saldo = saldoEn(baseA, 'ana');
  const dos = await Promise.allSettled([
    motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_par', source: 'weë-studio', fingerprint: H }),
    motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_par', source: 'weë-studio', fingerprint: H }),
  ]);
  const hechas = dos.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  check('A14) I · dos cobros a la vez con la misma clave: uno cobra y el otro es su duplicado',
    hechas.length === 2 && hechas.filter((x) => !x.duplicate).length === 1 && saldoEn(baseA, 'ana') === saldo - 160);
  await motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_j1', source: 'weë-studio', fingerprint: huellaDePrueba('j1') });
  await motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_j2', source: 'weë-studio', fingerprint: huellaDePrueba('j2') });
  check('A15) J · dos claves distintas son dos operaciones', saldoEn(baseA, 'ana') === saldo - 480);
  await motorA.refundCredits({ userId: 'ana', requestId: 'vid_j2', reason: 'prueba' });
  const e = await rechazaA(() => motorA.spendCredits({ userId: 'ana', service: 'ai_video', amount: 160, requestId: 'vid_j2', source: 'weë-studio', fingerprint: huellaDePrueba('j2') }));
  check('A16) un requestId reembolsado sigue sin servir: ALREADY_REFUNDED, como antes', e?.code === 'ALREADY_REFUNDED');
}

/* ═══ B · LA PUERTA DE VÍDEO DE VERDAD ════════════════════════════════════ */
console.log('\n── B · generateVideo, ejecutada: qué se genera, qué se cobra y qué se devuelve ──');
let base = new Base();
const getFirestoreReal = fa.getFirestore;
fa.getFirestore = () => base;

const video = lib('creator/video.js');
const motorDeVideo = lib('engine/video.js').videoEngine;
const libro = lib('engine/ledger.js').firestoreLedger;
const contenido = lib('content/index.js');
const runtime = lib('runtime/index.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const { creditEngine } = lib('credits/creditEngine.js');
const { ProviderError } = lib('engine/http.js');

const espia = { generar: [], conductor: 0, material: [], liquidar: [] };
let comportamiento;
const generar = async (req, ctx) => { espia.generar.push({ req, ctx }); return comportamiento(req, ctx); };
motorDeVideo.generate = generar;
const conductorEspia = async () => { espia.conductor++; throw new Error('el conductor no tenía que montarse'); };
runtime.conductorDeWee = conductorEspia;
contenido.crearMaterialDesdeUrl = async (datos) => {
  const assetId = `asset_${createHash('md5').update(`${espia.material.length}|${datos.url}`).digest('hex')}`;
  espia.material.push(datos);
  base.docs.set(`assets/${assetId}`, { assetId, ownerAccountId: datos.ownerAccountId, kind: datos.kind, status: 'ready', provenance: datos.provenance });
  return { assetId };
};
libro.settle = async (x) => { espia.liquidar.push(x); };
check('B0) los dobles están puestos donde la puerta los busca: el motor de vídeo, el conductor, el material y el libro',
  motorDeVideo.generate === generar && runtime.conductorDeWee === conductorEspia && typeof contenido.crearMaterialDesdeUrl === 'function' && typeof libro.settle === 'function');

/* Lo que haría el motor de verdad al terminar bien: su fila del libro, COMPLETED, con la clave de la petición. */
const generaBien = async (req, ctx) => {
  const i = espia.generar.length;
  const generationId = `gen_${i}`;
  base.docs.set(`aiGenerations/${generationId}`, { requestId: ctx.requestId, userId: ctx.userId, capability: 'video.generate', provider: 'seedance', status: 'COMPLETED', creditTransactionId: ctx.creditTransactionId });
  return { generationId, output: { url: `https://almacen.invalid/video_${i}.mp4`, durationSec: 5 }, demo: false, provider: 'seedance', modelId: 'seedance-2-0-fast' };
};
const mundo = async (cuentas = ['ana']) => {
  base = new Base();
  olvidarLaPuerta();
  Object.assign(espia, { generar: [], conductor: 0, material: [], liquidar: [] });
  comportamiento = generaBien;
  for (const uid of cuentas) await perfil(base, uid)(creditEngine);
};
const pedir = (uid, datos) => intento(() => video.generateVideo.run({ auth: { uid }, data: datos }));
const PETICION = { prompt: 'Un faro al amanecer, olas suaves', durationSec: 5, aspectRatio: '16:9' };
const saldo = (uid) => saldoEn(base, uid);
const usos = (requestId) => base.de('creditTransactions').filter((t) => t.requestId === requestId && t.type === 'usage');
const esperarA = async (cond) => { for (let i = 0; i < 400 && !cond(); i++) await new Promise((r) => setTimeout(r, 1)); return cond(); };

console.log('\n── PRUEBA ESPECIAL · el requestId de una respuesta de Brain COMPLETED entrando por generateVideo ──');
{
  await mundo();
  await creditEngine.spendCredits({ userId: 'ana', service: 'ai_brain', amount: 1, requestId: 'brain_123', reason: 'Weë Brain · 12 respuestas', source: 'weë-brain', meta: { chatId: 'c1' } });
  await creditEngine.completeCredits({ userId: 'ana', requestId: 'brain_123', meta: { generationId: 'gen_brain' } });
  /* Y la fila de texto que deja Brain en el libro: COMPLETED y sin vídeo, justo lo que antes dejaba seguir de largo. */
  base.docs.set('aiGenerations/gen_brain', { requestId: 'brain_123', userId: 'ana', capability: 'text.generate', provider: 'gemini', status: 'COMPLETED', creditTransactionId: 'usage_brain_123' });
  const usoDeBrain = JSON.stringify(base.leer('creditTransactions/usage_brain_123'));
  const saldoAntes = saldo('ana');
  const transacciones = base.de('creditTransactions').length;
  const filas = base.de('aiGenerations').length;
  const r = await pedir('ana', { ...PETICION, requestId: 'brain_123' });
  check('E1) se rechaza con el error del contrato: invalid-argument · INVALID_REQUEST · idempotency_conflict',
    !r.ok && r.error.code === 'invalid-argument' && r.error.details?.code === 'INVALID_REQUEST' && r.error.details?.reason === 'idempotency_conflict',
    r.ok ? 'generó' : `${r.error.code} · ${r.error.details?.code} · ${r.error.details?.reason}`);
  check('E2) no se genera ningún vídeo: el motor de vídeo no se llama', espia.generar.length === 0, `${espia.generar.length} llamadas`);
  check('E3) no se crea ningún trabajo de vídeo: ni jobs, ni workflowRuns, ni una fila nueva en el libro, y el conductor no se monta',
    base.de('jobs').length === 0 && base.de('workflowRuns').length === 0 && base.de('aiGenerations').length === filas && espia.conductor === 0);
  check('E4) no se consume ningún crédito de vídeo: el saldo es el mismo y no aparece ninguna reserva nueva',
    saldo('ana') === saldoAntes && base.de('creditTransactions').length === transacciones
    && base.de('creditTransactions').every((t) => !String(t.service ?? '').startsWith('ai_video')));
  check('E5) el cobro de Brain no se reutiliza ni se toca: la misma reserva, sin reembolso ni ajuste',
    JSON.stringify(base.leer('creditTransactions/usage_brain_123')) === usoDeBrain
    && !base.leer('creditTransactions/refund_brain_123') && !base.leer('creditTransactions/adjust_brain_123'));
  check('E6) ni material ni liquidación: no hay nada que catalogar ni que cerrar',
    espia.material.length === 0 && espia.liquidar.length === 0 && base.de('assets').length === 0);
}

console.log('\n── B · el mismo vídeo otra vez: idempotente, y sin regalar un segundo vídeo ──');
{
  await mundo();
  const r1 = await pedir('ana', { ...PETICION, requestId: 'video_a_0001' });
  const uso = usos('video_a_0001');
  check('B1) la primera vez: genera una vez y cobra una vez, y la reserva queda COMPLETED con su huella',
    r1.ok && espia.generar.length === 1 && saldo('ana') === 5000 - r1.valor.credits && r1.valor.credits > 0
    && uso.length === 1 && uso[0]?.status === 'COMPLETED' && /^[a-f0-9]{64}$/.test(String(uso[0]?.fingerprint ?? '')) && String(uso[0]?.service ?? '').startsWith('ai_video'),
    r1.ok ? `${r1.valor.credits} Credits · ${uso[0]?.service}` : r1.error.message);
  check('B2) la huella resume la petición y no la guarda: ni la descripción ni la URL están dentro', /^[a-f0-9]{64}$/.test(String(uso[0]?.fingerprint ?? '')) && !JSON.stringify(uso[0] ?? {}).includes('Un faro'));
  check('B3) el vídeo pasa a ser material de la cuenta', r1.ok && typeof r1.valor.assetId === 'string' && base.de('assets').length === 1);
  const r2 = await pedir('ana', { ...PETICION, requestId: 'video_a_0001' });
  check('B4) repetir EXACTAMENTE la misma petición devuelve el mismo vídeo, sin generar ni cobrar',
    r2.ok && r2.valor.duplicate === true && r2.valor.credits === 0 && r2.valor.url === r1.valor.url
    && espia.generar.length === 1 && saldo('ana') === 5000 - r1.valor.credits && usos('video_a_0001').length === 1 && base.de('assets').length === 1);

  /* G · terminó y se cobró, pero su resultado no está: la anotación se perdió o lo cerró la liquidación del Core. */
  const fila = base.de('aiGenerations').find((g) => g.requestId === 'video_a_0001');
  if (fila) {
    const sinVideo = { ...base.docs.get(`aiGenerations/${fila.id}`) };
    delete sinVideo.videoUrl;
    base.docs.set(`aiGenerations/${fila.id}`, sinVideo);
  }
  const saldoAntes = saldo('ana');
  const r3 = await pedir('ana', { ...PETICION, requestId: 'video_a_0001' });
  check('G1) COMPLETED sin resultado recuperable: NO se vuelve a generar, y se dice (already-exists · DUPLICATE_REQUEST · result_not_available)',
    !r3.ok && r3.error.code === 'already-exists' && r3.error.details?.code === 'DUPLICATE_REQUEST' && r3.error.details?.reason === 'result_not_available'
    && espia.generar.length === 1, r3.ok ? 'generó otra vez' : `${r3.error.code} · ${r3.error.details?.reason}`);
  check('G2) ni un Credit ni un cobro de más', saldo('ana') === saldoAntes && usos('video_a_0001').length === 1);
}

console.log('\n── C · D · E · la misma clave con OTRA operación ──');
{
  await mundo(['ana', 'bea']);
  const r1 = await pedir('ana', { ...PETICION, requestId: 'video_c_0001' });
  const usoDeAna = JSON.stringify(base.leer('creditTransactions/usage_video_c_0001'));
  const rB = await pedir('bea', { ...PETICION, requestId: 'video_c_0001' });
  check('C1) C · la clave de ana en manos de bea: permission-denied · FORBIDDEN, sin generar ni cobrar',
    r1.ok && !rB.ok && rB.error.code === 'permission-denied' && rB.error.details?.code === 'FORBIDDEN'
    && espia.generar.length === 1 && saldo('bea') === 5000 && JSON.stringify(base.leer('creditTransactions/usage_video_c_0001')) === usoDeAna);
  const rD = await pedir('ana', { ...PETICION, requestId: 'video_c_0001', quality: 'max' });
  check('D1) D · la misma clave para un vídeo de OTRO servicio (calidad máxima): idempotency_conflict, sin generar',
    !rD.ok && rD.error.details?.code === 'INVALID_REQUEST' && rD.error.details?.reason === 'idempotency_conflict' && espia.generar.length === 1);
  const rE = await pedir('ana', { ...PETICION, requestId: 'video_c_0001', durationSec: 15 });
  check('E7) E · la misma clave con OTRO importe (15 s en vez de 5, mismo servicio): idempotency_conflict, sin generar',
    !rE.ok && rE.error.details?.code === 'INVALID_REQUEST' && rE.error.details?.reason === 'idempotency_conflict' && espia.generar.length === 1);
  const rP = await pedir('ana', { ...PETICION, requestId: 'video_c_0001', prompt: 'Otra cosa: un tren de noche' });
  check('E8) y otra descripción con el mismo precio es otra operación: idempotency_conflict, sin devolver el vídeo de antes',
    !rP.ok && rP.error.details?.reason === 'idempotency_conflict' && espia.generar.length === 1);
  check('E9) ninguno de los rechazos cobró', saldo('ana') === 5000 - r1.valor.credits && usos('video_c_0001').length === 1);
}

console.log('\n── F · H · un fallo definitivo, uno recuperable, y sus reintentos ──');
{
  await mundo();
  comportamiento = async () => { throw new ProviderError('seedance: rechazo de entrada: InputImageSensitiveContentDetected', 'seedance', 400, false); };
  const rF = await pedir('ana', { ...PETICION, requestId: 'video_f_0001' });
  const uso = base.leer('creditTransactions/usage_video_f_0001');
  const reembolso = base.leer('creditTransactions/refund_video_f_0001');
  check('F1) fallo definitivo tras reservar: se reembolsa EXACTAMENTE lo reservado y la reserva queda REFUNDED',
    !rF.ok && rF.error.details?.code === 'INVALID_REQUEST' && rF.error.details?.reason === 'input_rejected'
    && uso?.status === 'REFUNDED' && reembolso?.amount === uso?.authorizedAmount && saldo('ana') === 5000);
  check('F2) el libro se liquida a cero y no queda material', espia.liquidar.some((x) => x.creditTransactionId === 'usage_video_f_0001' && x.finalAmount === 0) && base.de('assets').length === 0);
  const rF2 = await pedir('ana', { ...PETICION, requestId: 'video_f_0001' });
  check('H1) reintentar con la MISMA clave: ALREADY_REFUNDED, sin generar (el contrato de siempre: una clave devuelta no se reutiliza)',
    !rF2.ok && rF2.error.code === 'failed-precondition' && rF2.error.details?.code === 'ALREADY_REFUNDED' && espia.generar.length === 1 && saldo('ana') === 5000);

  comportamiento = async () => { throw new ProviderError('seedance: 503 upstream', 'seedance', 503, true); };
  const rR = await pedir('ana', { ...PETICION, requestId: 'video_h_0001' });
  check('H2) un fallo recuperable del proveedor también reembolsa y se dice como tal (unavailable · PROVIDER_ERROR)',
    !rR.ok && rR.error.code === 'unavailable' && rR.error.details?.code === 'PROVIDER_ERROR' && base.leer('creditTransactions/usage_video_h_0001')?.status === 'REFUNDED' && saldo('ana') === 5000);
  comportamiento = generaBien;
  const rR2 = await pedir('ana', { ...PETICION, requestId: 'video_h_0001' });
  const rR3 = await pedir('ana', { ...PETICION, requestId: 'video_h_0002' });
  check('H3) el reintento va con una clave NUEVA: la de antes sigue devuelta, la nueva genera y cobra una sola vez',
    !rR2.ok && rR2.error.details?.code === 'ALREADY_REFUNDED' && rR3.ok && espia.generar.length === 3 && saldo('ana') === 5000 - rR3.valor.credits);
}

console.log('\n── I · J · a la vez ──');
{
  await mundo();
  let soltar;
  comportamiento = (req, ctx) => new Promise((resolve, reject) => { soltar = { bien: () => resolve(generaBien(req, ctx)), mal: (e) => reject(e) }; });
  const a = pedir('ana', { ...PETICION, requestId: 'video_i_0001' });
  const b = pedir('ana', { ...PETICION, requestId: 'video_i_0001' });
  await esperarA(() => espia.generar.length === 1 && !!soltar);
  soltar.bien();
  const [ra, rb] = await Promise.all([a, b]);
  const unaHecha = [ra, rb].filter((x) => x.ok);
  const otra = [ra, rb].find((x) => !x.ok);
  check('I1) dos peticiones a la vez con la misma clave: una sola generación y un solo cobro; la otra, DUPLICATE_REQUEST',
    unaHecha.length === 1 && otra?.error.details?.code === 'DUPLICATE_REQUEST' && espia.generar.length === 1
    && usos('video_i_0001').length === 1 && saldo('ana') === 5000 - unaHecha[0].valor.credits);

  /* Una reserva que se quedó colgada (el proceso murió): pasado el plazo de la función, se devuelve. Una sola vez. */
  soltar = undefined;
  comportamiento = (req, ctx) => new Promise((resolve, reject) => { soltar = { bien: () => resolve(generaBien(req, ctx)), mal: (e) => reject(e) }; });
  const colgada = pedir('ana', { ...PETICION, requestId: 'video_i_0002' });
  await esperarA(() => espia.generar.length === 2 && !!soltar);
  const usoColgado = base.docs.get('creditTransactions/usage_video_i_0002');
  if (usoColgado) usoColgado.createdAt = fa.Timestamp.fromMillis(Date.now() - 30 * 60_000);
  const tarde = await pedir('ana', { ...PETICION, requestId: 'video_i_0002' });
  check('H4) la misma clave de una reserva abandonada: se devuelve (deadline-exceeded · TIMEOUT) y NO se genera otra vez',
    !tarde.ok && tarde.error.code === 'deadline-exceeded' && espia.generar.length === 2
    && base.leer('creditTransactions/usage_video_i_0002')?.status === 'REFUNDED');
  soltar?.mal(new ProviderError('seedance: 503 upstream', 'seedance', 503, true));
  await colgada;
  check('H5) y cuando el intento viejo acaba mal, no se devuelve dos veces', base.de('creditTransactions').filter((t) => t.requestId === 'video_i_0002' && t.type === 'refund').length === 1
    && saldo('ana') === 5000 - unaHecha[0].valor.credits);

  comportamiento = generaBien;
  const saldoAntes = saldo('ana');
  const [j1, j2] = await Promise.all([pedir('ana', { ...PETICION, requestId: 'video_j_0001' }), pedir('ana', { ...PETICION, requestId: 'video_j_0002' })]);
  check('J1) J · dos claves distintas a la vez son dos operaciones: dos vídeos, dos cobros, dos materiales',
    j1.ok && j2.ok && j1.valor.url !== j2.valor.url && usos('video_j_0001').length === 1 && usos('video_j_0002').length === 1
    && saldo('ana') === saldoAntes - j1.valor.credits - j2.valor.credits && espia.generar.length === 4);
}

fa.getFirestore = getFirestoreReal;

/* ═══ C · LAS FRONTERAS ══════════════════════════════════════════════════ */
console.log('\n── C · Las fronteras ──');
{
  const VIDEO = sinComentarios(leer('functions/src/creator/video.ts'));
  const MOTOR = sinComentarios(leer('functions/src/credits/creditEngine.ts'));
  check('K1) la huella la calcula la puerta con lo ya validado; el cliente no la manda',
    /fingerprint: huellaDelVideo\(videoRequest\),/.test(VIDEO) && !/fingerprint\??:/.test(VIDEO.slice(VIDEO.indexOf('interface GenerateVideoInput'), VIDEO.indexOf('const ownUrls'))));
  const dentro = MOTOR.slice(MOTOR.indexOf('const spendCredits'), MOTOR.indexOf('const completeCredits'));
  check('K2) y el motor la compara DENTRO de la transacción que cobra, después de leer la reserva y antes de devolver el duplicado',
    dentro.indexOf('tx.get(transactions().doc(id))') > 0
    && dentro.indexOf('esLaMismaOperacion(data, service, amount, fingerprint)') > dentro.indexOf('tx.get(transactions().doc(id))')
    && dentro.indexOf('esLaMismaOperacion(data, service, amount, fingerprint)') < dentro.indexOf('duplicate: true'));
  check('K3) ni otro Credit Engine, ni otra puerta, ni otro conductor: sigue habiendo UN `createCreditEngine` y `decidirRuntime` solo en las dos puertas',
    (leer('functions/src/credits/creditEngine.ts').match(/export function createCreditEngine/g) || []).length === 1
    && !/createCreditEngine\(/.test(VIDEO) && (VIDEO.match(/conductorDeWee\(\{/g) || []).length === 1);
  check('K4) esta suite está en la cadena de `npm test`', /idempotencia-de-cobro\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ PRE-F1-D: un requestId es una operación (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
