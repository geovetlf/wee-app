/**
 * CORRECCIÓN P0 DEL ADAPTADOR SEEDANCE (2026-10-07) · el texto no es un parámetro y lo cobrado es lo enviado.
 *
 * La auditoría de solo lectura del 2026-10-07 encontró dos cosas:
 *   1. ModelArk documenta un «método heredado» que lee `--rs`, `--rt`, `--dur`, `--wm`… escritos tras el prompt, sin
 *      decir quién gana frente a los campos del cuerpo. Weë mandaba el texto de la persona tal cual.
 *   2. En imagen a vídeo se cotizaba con la proporción declarada y se enviaba `adaptive`.
 *
 *   A · La neutralización, pura: lo que tiene forma de parámetro deja de serlo; lo demás llega igual.
 *   B · Una sola verdad: el precio y el cuerpo salen de la misma petición efectiva, para cada modelo, resolución,
 *       duración y proporción, y se comprueba contra la tabla oficial de BytePlus calculada aparte.
 *   C · Imagen a vídeo: viaja `adaptive` y se cotiza su techo, declare quien llame la proporción que declare.
 *   D · El prompt no elige el modelo.
 *   E · La puerta de verdad (`generateVideo.run`): cliente → callable → servidor → adaptador → POST interceptado, con
 *       prompts maliciosos y campos contradictorios, y un ModelArk HOSTIL que obedecería al texto antes que al cuerpo.
 *   F · El modo demo con el proveedor desactivado: qué se cobra (hallazgo documentado aparte).
 *   G · Las fronteras: ninguna puerta cotiza por otro camino.
 *
 * Sin red, sin proveedor, sin claves, sin emulador. Usa el compilado: `npm run build` antes.
 */
import { createRequire } from 'node:module';
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

const seedance = lib('engine/providers/seedance.js');
const { neutralizarParametrosEnLinea, peticionEfectivaDeSeedance, buildSeedanceBody, SEEDANCE_MODEL_IDS: SM, SEEDANCE_SPECS, seedanceUsd } = seedance;
const { priceVideoRequest } = lib('credits/aiPricing.js');
const { normalizeVideoRequest, videoParamsForQuote, chooseSeedanceModel } = lib('engine/video.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const REAL = { ...DEFAULT_SETTINGS, pricingMode: 'real', creditsPerUsd: 100, margin: 0.3 };

/* ── La sintaxis de parámetros, leída como la leería un ModelArk laxo: guiones de cualquier clase, sin invisibles ── */
const RESERVADOS = ['rs', 'resolution', 'rt', 'ratio', 'dur', 'duration', 'frames', 'fps', 'wm', 'watermark', 'seed', 'cf', 'camerafixed', 'camera_fixed'];
const GUIONES = '[-\\u2010-\\u2015\\u2212\\uFE58\\uFE63\\uFF0D]';
const plano = (t) => t.normalize('NFKC').replace(/[­᠎​-‏‪-‮⁠-⁤﻿]/gu, '');
const SINTAXIS = new RegExp(`${GUIONES}+\\s*(${RESERVADOS.join('|')})(?![\\p{L}\\p{N}_])|${GUIONES}{2,}(?=\\p{L})`, 'iu');
const tieneSintaxis = (t) => SINTAXIS.test(plano(t));

/* ═══ A · LA NEUTRALIZACIÓN ═══════════════════════════════════════════════ */
console.log('\n── A · Lo que tiene forma de parámetro deja de serlo; lo demás llega igual ──');
{
  const casos = [
    ['Un perro corriendo --dur 30 --rs 4k', 'Un perro corriendo dur 30 rs 4k', 2],
    ['Una ciudad futurista --rs 1080p', 'Una ciudad futurista rs 1080p', 1],
    ['Retrato cinematográfico --rt 21:9', 'Retrato cinematográfico rt 21:9', 1],
    ['usa el texto literal --dur como parte de la descripción', 'usa el texto literal dur como parte de la descripción', 1],
  ];
  for (const [entrada, esperado, veces] of casos) {
    const r = neutralizarParametrosEnLinea(entrada);
    check(`A) «${entrada}» → «${r.texto}»`, r.texto === esperado && r.neutralizados === veces && !tieneSintaxis(r.texto));
  }
  const intactos = [
    'escena normal con -- palabra',
    'Lima de noche -- con lluvia y neones',
    'una casa de alta-resolución y bien-hecha',
    'la x-ratio del cuadro, temperatura -5 grados',
    'Él dijo —ven— y salió',
    'familia 👨‍👩‍👧 en la playa, cámara lenta',
    'un plano con guiones - sueltos - y nada más',
  ];
  for (const t of intactos) {
    const r = neutralizarParametrosEnLinea(t);
    check(`A) se respeta el guion normal: «${t}»`, r.texto === t && r.neutralizados === 0);
  }
  const variantes = [
    'perro --RS 4K', 'perro --Dur 30', 'perro --dur=30', 'perro --rs:1080p', 'perro -rs 4k', 'perro ---rs 4k', 'perro -- rs 4k',
    'perro —rs 4k', 'perro –dur 30', 'perro −−rs 4k', 'perro ‐‐rs 4k', 'perro ﹣﹣wm true', 'perro －－ｒｓ ４ｋ', 'perro --​rs 4k',
    'perro -­dur 30', 'perro --ⓡⓢ 4k', 'perro --ⓓⓤⓡ 30', 'cielo--rs 1080p', 'perro --resolution 4k --ratio 21:9 --duration 15', 'perro --frames 289 --fps 24',
    'perro --wm true --watermark true', 'perro --seed 7 --cf true --camerafixed true --camera_fixed true',
    'perro --draft true --priority 9 --service_tier flex', 'perro --cualquiera valor', 'perro\n--rs 4k\n--dur 15',
  ];
  for (const t of variantes) {
    const r = neutralizarParametrosEnLinea(t);
    check(`A) variante neutralizada: ${JSON.stringify(t)} → ${JSON.stringify(r.texto)}`, !tieneSintaxis(r.texto) && r.neutralizados > 0 && /perro|cielo/.test(r.texto));
  }
  const muestra = ['Un perro --dur 30', 'escena normal con -- palabra', 'perro －－ｒｓ ４ｋ', 'cielo--rs 1080p'];
  check('A) es idempotente: limpiar dos veces es limpiar una', muestra.every((t) => {
    const una = neutralizarParametrosEnLinea(t).texto;
    const dos = neutralizarParametrosEnLinea(una);
    return dos.texto === una && dos.neutralizados === 0;
  }));
  check('A) lo disfrazado se cierra en falso (NFKC) solo cuando hace falta: el texto normal no se normaliza',
    neutralizarParametrosEnLinea('ｃａｆé con ｌｅｃｈｅ').texto === 'ｃａｆé con ｌｅｃｈｅ'
    && neutralizarParametrosEnLinea('perro --ⓡⓢ 4k').texto === 'perro rs 4k'
    && neutralizarParametrosEnLinea('perro －－ｒｓ ４ｋ').texto === 'perro ｒｓ ４ｋ');
}

/* ═══ B · UNA SOLA VERDAD: PRECIO = CUERPO ════════════════════════════════ */
console.log('\n── B · El precio y el cuerpo salen de la misma petición efectiva (tabla oficial calculada aparte) ──');
/* La tabla oficial de BytePlus, escrita aquí a mano y no importada: si el adaptador se equivoca, esto no se equivoca con él. */
const TABLA = {
  '480p': { '16:9': [854, 480], '9:16': [854, 480], '4:3': [640, 480], '3:4': [640, 480], '1:1': [480, 480], '21:9': [1120, 480] },
  '720p': { '16:9': [1280, 720], '9:16': [1280, 720], '4:3': [960, 720], '3:4': [960, 720], '1:1': [720, 720], '21:9': [1680, 720] },
  '1080p': { '16:9': [1920, 1080], '9:16': [1920, 1080], '4:3': [1440, 1080], '3:4': [1440, 1080], '1:1': [1080, 1080], '21:9': [2520, 1080] },
  '4k': { '16:9': [3840, 2160], '9:16': [3840, 2160], '4:3': [2880, 2160], '3:4': [2880, 2160], '1:1': [2160, 2160], '21:9': [5040, 2160] },
};
const pixeles = (res, ratio) => (ratio === 'adaptive' ? TABLA[res]['21:9'] : TABLA[res][ratio]);
const tokensOficiales = (body, modelId, inputSec) => {
  const [w, h] = pixeles(body.resolution, body.ratio);
  const salida = body.duration === -1 ? SEEDANCE_SPECS[modelId].maxDurationSec : body.duration;
  return Math.round(((inputSec + salida) * w * h * 24) / 1024);
};
const ctx = { userId: 'prueba' };
const cuerpoDe = (nrm) => buildSeedanceBody({ capability: nrm.capability, model: { id: nrm.modelId }, input: nrm.input, prefs: nrm.prefs, ctx, timeoutMs: 1 });
const IMAGEN = 'data:image/png;base64,iVBORw0KGgo=';

const igual = async (req, settings = REAL) => {
  const nrm = normalizeVideoRequest(req, settings);
  const precio = priceVideoRequest(nrm, settings);
  const { body, estimatedTokens, efectiva } = await cuerpoDe(nrm);
  const inputSec = efectiva.inputVideoSec;
  const oficiales = tokensOficiales(body, body.model, inputSec);
  const tarifa = SEEDANCE_SPECS[body.model].rates[body.resolution][inputSec > 0 ? 'video' : 'text'];
  const ok = body.model === precio.model
    && body.resolution === precio.detail.resolution
    && body.ratio === precio.detail.ratio
    && body.duration === precio.detail.durationSec
    && body.watermark === false
    && estimatedTokens === precio.detail.estimatedTokens
    && precio.detail.estimatedTokens === oficiales
    && Math.abs(precio.usd - seedanceUsd(oficiales, tarifa)) < 1e-9;
  return { ok, body, precio, oficiales };
};

{
  const COMBOS = [['480p', 4], ['720p', 5], ['1080p', 10], ['1080p', 15], ['4k', 15], ['720p', -1]];
  const PROPORCIONES = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
  let total = 0; let bien = 0; const malos = [];
  for (const clave of Object.keys(SM)) {
    const spec = SEEDANCE_SPECS[SM[clave]];
    const maxima = spec.resolutions[spec.resolutions.length - 1];
    for (const [res, dur] of [...COMBOS, [maxima, spec.maxDurationSec], [maxima, 999]]) {
      for (const ratio of PROPORCIONES) {
        total++;
        const r = await igual({ prompt: 'Un faro al amanecer', model: clave, resolution: res, durationSec: dur, aspectRatio: ratio });
        if (r.ok) bien++; else malos.push(`${clave} ${res} ${dur}s ${ratio}`);
      }
    }
  }
  check(`B) texto a vídeo: precio = cuerpo = tabla oficial en ${bien}/${total} combinaciones (4 modelos × resoluciones × duraciones × 6 proporciones, con techos y valores fuera de rango)`, bien === total && total > 150, malos.slice(0, 5).join(' | '));

  const r480 = await igual({ prompt: 'p', model: 'SEEDANCE_2_0', resolution: '480p', durationSec: 4, aspectRatio: '16:9' });
  const r720 = await igual({ prompt: 'p', model: 'SEEDANCE_2_0', resolution: '720p', durationSec: 5, aspectRatio: '16:9' });
  const r1080a = await igual({ prompt: 'p', model: 'SEEDANCE_2_5', resolution: '1080p', durationSec: 10, aspectRatio: '16:9' });
  const r1080b = await igual({ prompt: 'p', model: 'SEEDANCE_2_0', resolution: '1080p', durationSec: 15, aspectRatio: '16:9' });
  check('B) 480p/4 s, 720p/5 s, 1080p/10 s y 1080p/15 s: lo enviado es lo cotizado',
    r480.ok && r480.body.resolution === '480p' && r480.body.duration === 4
    && r720.ok && r720.precio.detail.estimatedTokens === 108000
    && r1080a.ok && r1080a.body.duration === 10 && r1080b.ok && r1080b.body.duration === 15);
  const techo25 = await igual({ prompt: 'p', model: 'SEEDANCE_2_5', resolution: '1080p', durationSec: 999, aspectRatio: '21:9' });
  const techo20 = await igual({ prompt: 'p', model: 'SEEDANCE_2_0', resolution: '4k', durationSec: 999, aspectRatio: '21:9' });
  const rapido = await igual({ prompt: 'p', model: 'SEEDANCE_2_0_FAST', resolution: '1080p', durationSec: 999 });
  check('B) los techos de cada modelo: 2.5 → 1080p/30 s, 2.0 → 4K/15 s, fast → 720p/15 s (lo que no admite baja igual en el precio y en el cuerpo)',
    techo25.ok && techo25.body.duration === 30 && techo25.body.resolution === '1080p'
    && techo20.ok && techo20.body.duration === 15 && techo20.body.resolution === '4k'
    && rapido.ok && rapido.body.resolution === '720p' && rapido.body.duration === 15);
  const conVideo = await igual({ prompt: 'continúa el clip', model: 'SEEDANCE_2_0', resolution: '720p', durationSec: 5, references: { videos: ['https://x/c.mp4'], videoSeconds: 2 }, mode: 'extend' });
  check('B) con vídeo de referencia: se cotiza y se describe el techo de entrada del modelo (R22), no lo que declara quien llama',
    conVideo.ok && conVideo.precio.detail.inputVideoSec === SEEDANCE_SPECS[SM.SEEDANCE_2_0].maxReferenceTotalSec);
  /* Editar es el único caso en que el input (-1) y las preferencias (la duración pedida) no coinciden: manda la petición efectiva en los dos lados. */
  const editar = await igual({ prompt: 'cambia el cielo', model: 'SEEDANCE_2_0', resolution: '720p', durationSec: 8, references: { videos: ['https://x/c.mp4'] }, mode: 'edit' });
  check('B) editar un clip (input -1, preferencias 8 s): el cuerpo y el precio leen la misma duración', editar.ok && editar.body.duration === editar.precio.detail.durationSec,
    `cuerpo ${editar.body.duration} · precio ${editar.precio.detail.durationSec}`);
  /* Un input que llegue por otro camino (el Core, un paso del plan) con marca de agua o parámetros sueltos no cambia nada. */
  const raro = normalizeVideoRequest({ prompt: 'p', model: 'SEEDANCE_2_0', resolution: '480p', durationSec: 4 }, REAL);
  const conRuido = { ...raro, input: { ...raro.input, watermark: true, ratio: '21:9', duration: 15, frames: 289 } };
  const { body: cuerpoRuido } = await cuerpoDe(conRuido);
  check('B) un input con watermark/duration/frames sueltos no los cuela: la marca de agua es siempre false y el resto, el de la petición efectiva',
    cuerpoRuido.watermark === false && cuerpoRuido.duration === 4 && !('frames' in cuerpoRuido) && cuerpoRuido.ratio === '16:9');
}

/* ═══ C · IMAGEN A VÍDEO ══════════════════════════════════════════════════ */
console.log('\n── C · Imagen a vídeo: viaja «adaptive» y se cotiza su techo, sea cual sea la proporción declarada ──');
{
  const declaradas = ['1:1', '16:9', '9:16', '21:9', '4:3', '3:4', undefined, 'adaptive', '2:1'];
  for (const clave of ['SEEDANCE_2_5', 'SEEDANCE_2_0', 'SEEDANCE_2_0_FAST', 'SEEDANCE_2_0_MINI']) {
    const filas = [];
    for (const ratio of declaradas) filas.push(await igual({ prompt: 'anima la foto', inputImage: IMAGEN, model: clave, resolution: '720p', durationSec: 5, aspectRatio: ratio }));
    const creditos = new Set(filas.map((f) => f.precio.credits));
    check(`C) ${clave}: ${declaradas.length} proporciones declaradas → todas viajan como adaptive, precio = cuerpo, y el mismo importe (el del techo 21:9)`,
      filas.every((f) => f.ok && f.body.ratio === 'adaptive' && f.precio.detail.ratio === 'adaptive')
      && creditos.size === 1 && filas[0].oficiales === Math.round((5 * 1680 * 720 * 24) / 1024));
  }
  const declarada = normalizeVideoRequest({ prompt: 'anima', inputImage: IMAGEN, aspectRatio: '1:1', durationSec: 5, model: 'SEEDANCE_2_0' }, REAL);
  const antes = { ...declarada, capability: 'video.generate' };
  check('C) declarar 1:1 ya no abarata: antes se cobraba 1:1 y se enviaba adaptive (hasta 2,33 veces menos de lo que podía costar)',
    priceVideoRequest(declarada, REAL).credits > priceVideoRequest(antes, REAL).credits);
}

/* ═══ D · EL PROMPT NO ELIGE EL MODELO ════════════════════════════════════ */
console.log('\n── D · El modelo sale de los campos, nunca del texto ──');
{
  const conf = { defaultPolicy: 'balanced', video: { defaultModel: 'SEEDANCE_2_5' } };
  const textos = ['un borrador rápido', 'boceto de prueba', 'prueba rápida', 'cinematográfico 4k ultra premium', 'x --model seedance-2-0-mini'];
  check('D) ninguna palabra del prompt mueve el modelo (antes «borrador», «rápido» o «de prueba» elegían 2.0 fast)',
    textos.every((t) => chooseSeedanceModel({ prompt: t }, conf) === SM.SEEDANCE_2_5 && chooseSeedanceModel({ prompt: t }) === chooseSeedanceModel({ prompt: 'x' })));
  check('D) la calidad y el modelo explícitos siguen mandando', chooseSeedanceModel({ prompt: 'x', quality: 'standard' }) === SM.SEEDANCE_2_0_FAST
    && chooseSeedanceModel({ prompt: 'x', model: 'SEEDANCE_2_0_MINI' }) === SM.SEEDANCE_2_0_MINI);
  const cotizado = videoParamsForQuote({ prompt: '', durationSec: 10, aspectRatio: '9:16', quality: 'high' }, REAL);
  const ejecutado = normalizeVideoRequest({ prompt: 'Un anuncio. Escena 1: borrador rápido. Style: --rs 4k', durationSec: 10, aspectRatio: '9:16', quality: 'high' }, REAL);
  check('D) Weë Creator cotiza sin texto y ejecuta con él: los mismos parámetros, el mismo precio',
    cotizado.modelId === ejecutado.modelId && JSON.stringify({ ...cotizado.input, prompt: '' }) === JSON.stringify({ ...ejecutado.input, prompt: '' })
    && priceVideoRequest(cotizado, REAL).credits === priceVideoRequest(ejecutado, REAL).credits);
}

/* ═══ E · LA PUERTA DE VERDAD ═════════════════════════════════════════════ */
console.log('\n── E · generateVideo, ejecutada: cliente → callable → servidor → adaptador → POST interceptado ──');
/* Firestore en memoria: el de `idempotencia-de-cobro.test.mjs`, con `batch` para el libro. */
const fa = require('firebase-admin/firestore');
const esTipo = (v, nombre) => !!v && typeof v === 'object' && v.constructor?.name === nombre;
const esPlano = (v) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
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
  runTransaction(fn) {
    const correr = async () => { const tx = new Tx(this); const r = await fn(tx); tx.confirmar(); return r; };
    const p = this.cola.then(correr, correr);
    this.cola = p.catch(() => {});
    return p;
  }
  batch() { const tx = new Tx(this); return { set: (...a) => tx.set(...a), update: (...a) => tx.update(...a), delete: (...a) => tx.delete(...a), commit: async () => tx.confirmar() }; }
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
  async get() { const d = this.base.leer(this.path); return { exists: d !== undefined, id: this.id, ref: this, data: () => d, get: (f) => (d === undefined ? undefined : leerCampo(d, f)) }; }
  async set(data, opts) { escribir(this.base, { tipo: 'set', ref: this, data, merge: !!opts?.merge }); }
  async update(data) { escribir(this.base, { tipo: 'update', ref: this, data }); }
  async delete() { this.base.docs.delete(this.path); }
}
class Consulta {
  constructor(base, p, filtros = [], tope = null) { Object.assign(this, { base, path: p, filtros, tope }); }
  doc(id) { return new Ref(this.base, `${this.path}/${id ?? `auto_${++this.base.auto}`}`); }
  async add(data) { const ref = this.doc(); await ref.set(data); return ref; }
  where(campo, op, valor) {
    if (op !== '==') throw new Error(`esta base de prueba solo sabe «==»: ${op}`);
    return new Consulta(this.base, this.path, [...this.filtros, [campo, valor]], this.tope);
  }
  orderBy() { return this; }
  limit(tope) { return new Consulta(this.base, this.path, this.filtros, tope); }
  async get() {
    let filas = [...this.base.docs.entries()].filter(([p]) => p.startsWith(`${this.path}/`) && !p.slice(this.path.length + 1).includes('/'));
    filas = filas.filter(([, d]) => this.filtros.every(([f, v]) => leerCampo(d, f) === v));
    if (this.tope) filas = filas.slice(0, this.tope);
    const docs = filas.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: new Ref(this.base, p), data: () => copia(d), get: (f) => leerCampo(d, f) }));
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

let base = new Base();
fa.getFirestore = () => base;
/* Una app sin credenciales ni red: solo para que el Storage sepa el nombre del cubo de Weë (nada se sube: persistRemoteFile es un doble). */
const { initializeApp, getApps } = require('firebase-admin/app');
if (!getApps().length) initializeApp({ projectId: 'demo-seedance-p0', storageBucket: 'demo-seedance-p0.appspot.com' });
const http = lib('engine/http.js');
const ark = lib('engine/providers/ark.js');
const contenido = lib('content/index.js');
const { invalidateConfig } = lib('engine/config.js');
const { olvidarLaPuerta } = lib('runtime/configuracion.js');
const { creditEngine } = lib('credits/creditEngine.js');
const video = lib('creator/video.js');

/* Sin red: ni clave, ni host de verdad. Lo que el adaptador ENVIARÍA se guarda aquí y se contesta con un doble. */
const posts = [];
let modelArk;
ark.arkBase = () => 'https://modelark.invalid/api/v3';
ark.arkHeaders = () => ({ Authorization: 'Bearer doble-de-prueba' });
seedance.seedanceAdapter.isConfigured = () => true;
http.fetchJson = async (url, opciones) => {
  if (!String(url).startsWith('https://modelark.invalid/')) throw new Error(`red no permitida en la prueba: ${url}`);
  if (opciones?.body) { posts.push(opciones.body); return { id: `cgt-prueba-${posts.length}` }; }
  return modelArk(posts[posts.length - 1]);
};
http.readImage = async () => ({ buffer: Buffer.from('foto'), contentType: 'image/png' });
http.persistRemoteFile = async (_uid, remoto) => `https://almacen.invalid/${encodeURIComponent(remoto)}`;
contenido.crearMaterialDesdeUrl = async () => ({ assetId: `asset_${posts.length}` });

/*
 * MODELARK HOSTIL: el peor caso de la precedencia que BytePlus no documenta. Obedece al texto ANTES que al cuerpo, con
 * la gramática del método heredado y leyendo laxo (guiones de cualquier clase, NFKC, sin invisibles). Si un comando
 * llegara vivo, el vídeo saldría más caro de lo cotizado y la prueba lo vería.
 */
const ALIAS = { rs: 'resolution', resolution: 'resolution', rt: 'ratio', ratio: 'ratio', dur: 'duration', duration: 'duration', wm: 'watermark', watermark: 'watermark' };
const efectivoSegunHostil = (body) => {
  const texto = plano(String(body.content?.[0]?.text ?? ''));
  const efectivo = { resolution: body.resolution, ratio: body.ratio, duration: body.duration, watermark: body.watermark };
  const re = new RegExp(`${GUIONES}+\\s*(rs|resolution|rt|ratio|dur|duration|wm|watermark)\\s*[=:]?\\s*([\\w:.]+)`, 'giu');
  for (const m of texto.matchAll(re)) {
    const campo = ALIAS[m[1].toLowerCase()];
    const valor = m[2].toLowerCase();
    efectivo[campo] = campo === 'duration' ? Number(valor) : campo === 'watermark' ? valor === 'true' : valor;
  }
  return efectivo;
};
const modelArkHostil = (body) => {
  const e = efectivoSegunHostil(body);
  const salida = e.duration === -1 ? 15 : e.duration;
  const [w, h] = (TABLA[e.resolution] || TABLA['720p'])[e.ratio] || pixeles(e.resolution, 'adaptive');
  return { id: 'cgt', status: 'succeeded', content: { video_url: 'https://modelark.invalid/out.mp4' }, duration: salida, resolution: e.resolution, ratio: e.ratio, usage: { completion_tokens: Math.round((salida * w * h * 24) / 1024) } };
};

const perfil = async (uid, saldo = 50000) => {
  /* Integración P0 + edad 18: la cuenta de prueba es ADULTA de verdad (fecha AAAA-MM-DD), así que la condición real
   * `exigirCuentaWeeValida` (que valida la fecha con identity/edad.ts) deja pasar; sin ella rechaza ANTES de cotizar.
   * Y con Fase 1: Perfil Real con país permitido (ES), porque Seedance es territorial (US, IN, CN fuera). */
  /* Simplificación definitiva (2026-10-07): ENROLADA de verdad —su `private/account` con la fecha que solo las reglas
   * dejan escribir (18+) y su país del catálogo—, así que la condición real `exigirCuentaWeeValida` deja pasar. */
  base.docs.set(`users/doc_${uid}`, { uid, displayName: uid, profileType: 'real', country: 'ES' });
  base.docs.set(`users/doc_${uid}/private/account`, { birthDate: '1990-01-01' });
  await creditEngine.ensureAccount(uid);
  base.docs.get(`users/doc_${uid}`).creditsBalance = saldo;
};
const saldoDe = (uid) => base.docs.get(`users/doc_${uid}`).creditsBalance;
const mundo = async (config = {}) => {
  base = new Base();
  invalidateConfig();
  olvidarLaPuerta();
  posts.length = 0;
  modelArk = modelArkHostil;
  const global = { pricingMode: 'real', ...(config['aiSettings/global'] || {}) };
  for (const [ruta, datos] of Object.entries({ ...config, 'aiSettings/global': global })) base.docs.set(ruta, datos);
  await perfil('ana');
};
const pedir = (datos) => intento(() => video.generateVideo.run({ auth: { uid: 'ana', token: { firebase: { sign_in_provider: 'password' } } }, data: datos }));
/* Lo que la puerta lee de la configuración: los valores por defecto con el modo de precios real, como en producción. */
const AJUSTES_E = { ...DEFAULT_SETTINGS, pricingMode: 'real' };
let rid = 0;
const id = () => `vid_prueba_${String(++rid).padStart(4, '0')}`;

{
  const MALICIOSOS = [
    'Un perro corriendo --dur 30 --rs 4k',
    'Una ciudad futurista --rs 1080p',
    'Retrato cinematográfico --rt 21:9',
    'Un faro --RS 1080P --Dur=15 --wm true',
    'Un faro －－ｒｓ ４ｋ ——dur 15 --​rt 21:9',
    'Un faro --resolution 4k --ratio 21:9 --duration 15 --watermark true --model seedance-2-5',
  ];
  for (const prompt of MALICIOSOS) {
    await mundo();
    const datos = { requestId: id(), prompt, durationSec: 4, resolution: '480p', aspectRatio: '16:9', model: 'SEEDANCE_2_0' };
    const antes = saldoDe('ana');
    const r = await pedir(datos);
    const body = posts[0];
    const esperado = priceVideoRequest(normalizeVideoRequest({ prompt: 'x', durationSec: 4, resolution: '480p', aspectRatio: '16:9', model: 'SEEDANCE_2_0' }, AJUSTES_E), AJUSTES_E);
    const hostil = body ? efectivoSegunHostil(body) : null;
    check(`E) «${prompt.replace(/​/g, '‹ZW›')}»: el POST lleva 480p/4 s/16:9/sin marca/2.0, el texto ya no manda nada, y se cobra lo cotizado`,
      r.ok && posts.length === 1 && body.model === SM.SEEDANCE_2_0 && body.resolution === '480p' && body.duration === 4 && body.ratio === '16:9' && body.watermark === false
      && !tieneSintaxis(body.content[0].text)
      && hostil.resolution === '480p' && hostil.duration === 4 && hostil.ratio === '16:9' && hostil.watermark === false
      && antes - saldoDe('ana') === esperado.credits && r.valor.credits === esperado.credits,
      r.ok ? `${JSON.stringify(body?.content?.[0]?.text)} · ${antes - saldoDe('ana')} Credits` : String(r.error?.message));
  }

  /* Campos contradictorios: lo que no cabe se recorta por las mismas reglas en el precio y en el cuerpo. */
  await mundo();
  const raros = { requestId: id(), prompt: 'Un faro --dur 30', durationSec: 999, resolution: '8k', aspectRatio: '32:9', model: 'SEEDANCE_9_9', quality: 'turbo', generateAudio: 'sí' };
  const antesRaros = saldoDe('ana');
  const rr = await pedir(raros);
  const nrm = normalizeVideoRequest({ prompt: 'x', durationSec: 999, aspectRatio: '32:9', model: 'auto', quality: 'auto', generateAudio: true }, AJUSTES_E);
  const precioRaro = priceVideoRequest(nrm, AJUSTES_E);
  check('E) campos contradictorios (999 s, «8k», «32:9», un modelo que no existe): se recortan igual en el precio y en el cuerpo, y se cobra exactamente eso',
    rr.ok && posts[0].model === precioRaro.model && posts[0].duration === precioRaro.detail.durationSec && posts[0].resolution === precioRaro.detail.resolution
    && posts[0].ratio === precioRaro.detail.ratio && antesRaros - saldoDe('ana') === precioRaro.credits,
    rr.ok ? JSON.stringify({ m: posts[0].model, d: posts[0].duration, r: posts[0].resolution, ra: posts[0].ratio }) : String(rr.error?.message));

  /* La configuración elige 2.5 por defecto: ninguna palabra del prompt lo cambia a fast, ni en el cobro ni en el POST. */
  await mundo({ 'aiSettings/global': { video: { defaultModel: 'SEEDANCE_2_5' } } });
  const rb = await pedir({ requestId: id(), prompt: 'un borrador rápido de prueba --model seedance-2-0-fast', durationSec: 5, aspectRatio: '16:9' });
  check('E) «un borrador rápido de prueba» ya no elige el modelo: viaja el que fija la configuración', rb.ok && posts[0]?.model === SM.SEEDANCE_2_5, rb.ok ? posts[0]?.model : String(rb.error?.message));

  /* Imagen a vídeo por la puerta: la proporción declarada no abarata y viaja adaptive. */
  await mundo();
  const foto = 'https://firebasestorage.googleapis.com/v0/b/demo-seedance-p0.appspot.com/o/users%2Fana%2Fcreator-inputs%2Ff.png';
  const ri = await intento(() => video.generateVideo.run({ auth: { uid: 'ana', token: { firebase: { sign_in_provider: 'password' } } }, data: { requestId: id(), prompt: 'anima --rt 1:1', inputImage: foto, aspectRatio: '1:1', durationSec: 5, model: 'SEEDANCE_2_0' } }));
  const nrmFoto = normalizeVideoRequest({ prompt: 'x', inputImage: foto, aspectRatio: '1:1', durationSec: 5, model: 'SEEDANCE_2_0' }, AJUSTES_E);
  const techoFoto = priceVideoRequest(nrmFoto, AJUSTES_E);
  const comoUnoAUno = priceVideoRequest({ ...nrmFoto, capability: 'video.generate' }, AJUSTES_E);
  check('E) imagen a vídeo por la puerta: declarar 1:1 (y escribir --rt 1:1) no abarata; viaja adaptive y se cobra su techo',
    ri.ok && posts[0]?.ratio === 'adaptive' && !tieneSintaxis(posts[0].content[0].text) && 50000 - saldoDe('ana') === techoFoto.credits
    && techoFoto.detail.ratio === 'adaptive' && techoFoto.credits > comoUnoAUno.credits,
    ri.ok ? `${posts[0]?.ratio} · ${50000 - saldoDe('ana')} Credits` : String(ri.error?.code ?? ri.error?.message));
}

/* ═══ F · EL MODO DEMO CON EL PROVEEDOR DESACTIVADO ══════════════════════ */
console.log('\n── F · Proveedor real desactivado: ¿el modo demo cobra como si hubiera vídeo? ──');
let demoCobra = null;
{
  await mundo({ 'aiProviders/seedance': { enabled: false, priority: 1 } });
  const antes = saldoDe('ana');
  const r = await pedir({ requestId: id(), prompt: 'Un faro al amanecer', durationSec: 5, aspectRatio: '16:9' });
  const cobrado = antes - saldoDe('ana');
  demoCobra = r.ok && r.valor.demo === true && cobrado > 0;
  check('F) con Seedance desactivado no se llama a ModelArk', posts.length === 0);
  /*
   * HALLAZGO P1 SEPARADO (no se corrige aquí, por decisión del encargo): si esto sale «cobra», el camino demo cobra
   * los Credits de un vídeo real. La comprobación FIJA el comportamiento actual para que nadie lo cambie sin verlo,
   * y el informe lo documenta. Cuando se corrija, esta línea falla y hay que darle la vuelta.
   */
  check(`F) FIJADO — VULNERABILIDAD CONOCIDA P1-DEMO: ${demoCobra ? `el modo demo COBRA ${cobrado} Credits por un vídeo de muestra` : 'el modo demo no cobra'}`,
    demoCobra === true, r.ok ? `demo=${r.valor.demo} · ${cobrado} Credits` : String(r.error?.code ?? r.error?.message));
}

/* ═══ G · LAS FRONTERAS ═══════════════════════════════════════════════════ */
console.log('\n── G · Ninguna puerta cotiza por otro camino ──');
{
  const VIDEO = sinComentarios(leer('functions/src/creator/video.ts'));
  const CREDITOS = sinComentarios(leer('functions/src/creator/credits.ts'));
  const MOTOR = sinComentarios(leer('functions/src/engine/video.ts'));
  const ADAPTADOR = sinComentarios(leer('functions/src/engine/providers/seedance.ts'));
  check('G) generateVideo cotiza con `priceVideoRequest(normalizado` y le pasa ese mismo objeto al motor',
    /priceVideoRequest\(normalizado, settings\)/.test(VIDEO) && /videoEngine\.generate\(videoRequest, \{[^}]*normalizado/.test(VIDEO)
    && !/\bpriceVideo\(/.test(VIDEO) && !/chooseSeedanceModel\(/.test(VIDEO));
  check('G) el presupuesto de Weë Creator cotiza con la misma normalización y la capacidad del paso',
    /videoParamsForQuote\(/.test(CREDITOS) && /priceVideoRequest\(\{ \.\.\.parametros, capability: step\.capability \}/.test(CREDITOS) && !/\bpriceVideo\(/.test(CREDITOS));
  const elegir = MOTOR.slice(MOTOR.indexOf('export function chooseSeedanceModel'), MOTOR.indexOf('export function normalizeVideoRequest'));
  check('G) la elección del modelo no lee el texto', elegir.length > 100 && !/\.test\(/.test(elegir) && !/prompt/.test(elegir.replace(/request: VideoRequest/, '')));
  const cuerpo = ADAPTADOR.slice(ADAPTADOR.indexOf('export async function buildSeedanceBody'), ADAPTADOR.indexOf('export const seedanceAdapter'));
  check('G) el adaptador limpia el texto ANTES de ponerlo en el cuerpo, y los campos salen de la petición efectiva',
    cuerpo.indexOf('neutralizarParametrosEnLinea(') > 0 && cuerpo.indexOf('neutralizarParametrosEnLinea(') < cuerpo.indexOf("type: 'text'")
    && /peticionEfectivaDeSeedance\(capability, model\.id, input, prefs\)/.test(cuerpo)
    && /resolution: efectiva\.resolution/.test(cuerpo) && /ratio: efectiva\.ratio/.test(cuerpo) && /duration: efectiva\.duration/.test(cuerpo) && /watermark: efectiva\.watermark/.test(cuerpo));
  const precio = sinComentarios(leer('functions/src/credits/aiPricing.ts'));
  const bloqueVideo = precio.slice(precio.indexOf('export interface VideoPriceInput'), precio.indexOf('export const PRO_IMAGE_KINDS'));
  check('G) el precio de vídeo no tiene reglas propias: todo pasa por `peticionEfectivaDeSeedance`',
    /peticionEfectivaDeSeedance\(/.test(bloqueVideo) && !/resolveResolution\(|clampDuration\(|seedanceTokens\(|seedanceCostUsd\(/.test(bloqueVideo));
}

/* ── I · Arquitectura definitiva (2026-10-07): cuenta enrolada y RUTA antes del dinero ────────────────────────
 * La edad ya no se calcula aquí: se validó en el registro. Se exige «cuenta Weë válida» (el `private/account` que las
 * reglas solo dejan nacer con 18+, y el país) y, después, una ruta elegible con la jurisdicción de la cuenta.
 * Sin ruta: ni cupo, ni reserva, ni cargo, ni reembolso (antes: −35 +35 y un vídeo del cupo gastado). */
console.log('\n── I · Enrolamiento y ruta frente a la cotización ──');
{
  const casos = [
    ['sin registro terminado (sin private/account)', (d) => { d.delete('users/doc_ana/private/account'); }, (r) => r.error?.details?.code === 'ACCOUNT_REQUIRED'],
    ['sin país en el Perfil Real', (d) => { delete d.get('users/doc_ana').country; }, (r) => r.error?.details?.code === 'ACCOUNT_REQUIRED'],
    ['país sin ruta elegible (US), cuenta enrolada', (d) => { d.get('users/doc_ana').country = 'US'; }, (r) => r.error?.details?.code === 'NOT_AVAILABLE'
      && r.error?.details?.reason === 'no_disponible'
      && !/seedance|byteplus|regi[oó]n|pa[ií]s|\bUS\b/i.test(`${r.error?.message} ${JSON.stringify(r.error?.details)}`)],
  ];
  for (const [nombre, preparar, esperado] of casos) {
    await mundo();
    preparar(base.docs);
    const antes = saldoDe('ana');
    const cupoAntes = JSON.stringify([...base.docs.entries()].filter(([k]) => /usage|limit/i.test(k) && !/creditTransactions/.test(k)));
    const r = await pedir({ requestId: id(), prompt: 'Un perro corriendo --dur 30 --rs 4k', durationSec: 4, resolution: '480p', aspectRatio: '16:9', model: 'SEEDANCE_2_0' });
    /* El regalo de bienvenida lo pone `perfil()` al montar el mundo; no es de esta petición. */
    const movimientos = base.de('creditTransactions').filter((m) => m.type !== 'grant');
    const cupoDespues = JSON.stringify([...base.docs.entries()].filter(([k]) => /usage|limit/i.test(k) && !/creditTransactions/.test(k)));
    check(`I) ${nombre}: se rechaza con su código, ningún POST, saldo intacto y CERO movimientos (sin reserva, sin cargo+reembolso)`,
      !r.ok && esperado(r) && posts.length === 0 && saldoDe('ana') === antes && movimientos.length === 0,
      `${r.ok ? 'aceptada' : `${r.error?.message} ${JSON.stringify(r.error?.details)}`} · posts ${posts.length} · saldo ${antes}→${saldoDe('ana')} · movimientos ${JSON.stringify(movimientos.map((m) => [m.type, m.status]))}`);
    check(`I) ${nombre}: tampoco se gasta cupo`, cupoAntes === cupoDespues);
  }
  /* Con ruta: el flujo normal (ES), un POST y un cobro. */
  await mundo();
  const antes = saldoDe('ana');
  const ok = await pedir({ requestId: id(), prompt: 'Un perro corriendo', durationSec: 4, resolution: '480p', aspectRatio: '16:9', model: 'SEEDANCE_2_0' });
  check('I) con ruta elegible (ES): flujo normal, un POST y se cobra lo cotizado', ok.ok && posts.length === 1 && saldoDe('ana') < antes, ok.ok ? '' : ok.error?.message);
}

console.log(failures
  ? `\n✘ ${failures} fallo(s) de ${n}`
  : `\n✔ Seedance P0: el texto no es un parámetro y lo cobrado es lo enviado (${n} comprobaciones${demoCobra ? '; P1-DEMO fijado y documentado' : ''})`);
process.exit(failures ? 1 : 0);
