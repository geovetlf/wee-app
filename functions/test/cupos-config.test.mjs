/*
 * LOS CUPOS POR PERSONA SE FUSIONAN, NO SE SUSTITUYEN — auditoría H0, escenario #20.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * `loadConfig` mezclaba `aiSettings/global` de forma plana: guardar
 * `limits: { perUserPerDay: { video: 5 } }` dejaba SIN límite diario el texto,
 * la imagen, la voz…, y `limits: {}` hacía que el limitador lanzara un
 * TypeError en cada llamada (todas las IA caídas por un ajuste).
 *
 * Aquí se EJECUTA `loadConfig` con una Firestore de mentira y se pasa lo que
 * devuelve al limitador real.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const firestore = require('firebase-admin/firestore');
let ajustes = null;
const vacia = { size: 0, forEach: () => {} };
const baseFalsa = {
  collection: (c) => ({
    get: async () => vacia,
    doc: () => ({ get: async () => (c === 'aiSettings' && ajustes !== null ? { exists: true, data: () => ajustes } : { exists: false, data: () => undefined }) }),
  }),
};
const getFirestoreReal = firestore.getFirestore;
firestore.getFirestore = () => baseFalsa;

const { loadConfig, cuposLimpios } = lib('engine/config.js');
const { DEFAULT_LIMITS, createLimiter } = lib('engine/limits.js');
const cuposCon = async (limits) => { ajustes = { limits }; return (await loadConfig(true)).settings.limits.perUserPerDay; };
const D = DEFAULT_LIMITS.perUserPerDay;

/* ── A. La fusión ───────────────────────────────────────────────────────── */
const parcial = await cuposCon({ perUserPerDay: { video: 5 } });
check('1) un ajuste parcial cambia SOLO lo que nombra', parcial.video === 5);
check('2) …y conserva el resto de cupos por defecto (antes quedaban sin límite)',
  parcial.text === D.text && parcial.image === D.image && parcial.voice === D.voice && parcial.vision === D.vision && parcial.doc === D.doc,
  JSON.stringify(parcial));
check('3) `limits: {}` deja los cupos por defecto', JSON.stringify(await cuposCon({})) === JSON.stringify(D));
check('4) `limits: null` también', JSON.stringify(await cuposCon(null)) === JSON.stringify(D));
const raros = await cuposCon({ perUserPerDay: { image: -3, voice: 'diez', text: 1.5, telepatia: 9, video: 0 } });
check('5) un valor negativo, no numérico o con decimales se ignora', raros.image === D.image && raros.voice === D.voice && raros.text === D.text);
check('6) una modalidad desconocida se ignora', !('telepatia' in raros));
check('7) 0 sigue significando «sin límite» (lo fija creator.test.mjs)', raros.video === 0);
check('8) la limpieza es pura: {} para lo que no es un objeto', JSON.stringify(cuposLimpios([1, 2])) === '{}' && JSON.stringify(cuposLimpios('x')) === '{}');

/* ── B. Lo que importa: el limitador no se cae y sigue limitando ─────────── */
const usado = new Map();
const dbLimites = {
  collection: () => ({ doc: (id) => ({ id, get: async () => ({ exists: usado.has(id), data: () => usado.get(id) }) }) }),
  runTransaction: async (fn) => fn({
    get: async (r) => r.get(),
    set: (r, d) => usado.set(r.id, { ...(usado.get(r.id) || {}), ...d }),
  }),
};
const limitador = createLimiter({ db: () => dbLimites, now: () => 1 });
let error = null;
try { await limitador.reserve('u1', { text: 1 }, { perUserPerDay: await cuposCon({}) }); } catch (e) { error = e; }
check('9) con `limits: {}` reservar ya no lanza TypeError (antes caían todas las IA)', error === null, String(error));
const conVideo = { perUserPerDay: await cuposCon({ perUserPerDay: { video: 5 } }) };
usado.clear();
usado.set(`u2_${new Date().toISOString().slice(0, 10)}`, { image: D.image });
let limitado = null;
try { await limitador.reserve('u2', { image: 1 }, conVideo); } catch (e) { limitado = e; }
check('10) con un ajuste solo de vídeo, la imagen SIGUE limitada (RATE_LIMITED en el cupo por defecto)',
  limitado && limitado.code === 'RATE_LIMITED', String(limitado && limitado.code));

firestore.getFirestore = getFirestoreReal;
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
