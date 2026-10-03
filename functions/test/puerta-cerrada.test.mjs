/*
 * LA PUERTA DEL RUNTIME FALLA CERRADA — `aiSettings/runtime` (runtime/puerta.ts + runtime/configuracion.ts).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * La puerta decide si `brainChat` (text.generate) y `generateVideo` (video.generate) van por el Core. Hasta el
 * 2026-10-03 había UNA forma de abrirla por accidente: `{ habilitado: true, capacidades: [...] }` SIN `cuentas`
 * mandaba al Core a TODA la base. Ahora la lista de cuentas es obligatoria. Esta suite prueba cada caso:
 *
 *   configuración ausente → LEGACY · vacía → LEGACY · inválida → LEGACY · error al leer → LEGACY
 *   válida → solo las cuentas de la lista
 *
 * y busca los rodeos (comodines, listas falsas, uid del cliente, otra capacidad, otro escritor del documento, una
 * rama del emulador). «LEGACY» es el camino de siempre: la persona sigue atendida; lo que no se abre es el Core.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { decidirRuntime, leerPuerta, LECTURA_FALLIDA, PUERTA_CERRADA } = lib('runtime/puerta.js');
const { configuracionDeLaPuerta, olvidarLaPuerta, VIGENCIA_DE_LA_PUERTA_MS } = lib('runtime/configuracion.js');

const AUTORIZADA = 'cuenta_de_prueba_0001';
const OTRA = 'persona_real_0002';
const VALIDA = { habilitado: true, capacidades: ['text.generate', 'video.generate'], cuentas: [AUTORIZADA] };
const ctx = (extra = {}) => ({ capability: 'text.generate', userId: AUTORIZADA, experienceId: 'brain', ...extra });
const d = (crudo, extra) => decidirRuntime(crudo, ctx(extra));
const legacy = (r, motivo) => r.runtime === 'legacy' && (!motivo || r.motivo === motivo);

/* ── A. Cuenta autorizada / no autorizada ───────────────────────────────── */
check('A1) cuenta AUTORIZADA + capacidad abierta → CORE', d(VALIDA).runtime === 'core' && d(VALIDA).motivo === 'abierta');
check('A2) la misma configuración para otra capacidad abierta → CORE (video)', d(VALIDA, { capability: 'video.generate', experienceId: 'studio' }).runtime === 'core');
check('A3) cuenta NO autorizada → LEGACY (cuenta_fuera_de_la_prueba)', legacy(d(VALIDA, { userId: OTRA }), 'cuenta_fuera_de_la_prueba'));
check('A4) sin cuenta en la petición (uid vacío o ausente) → LEGACY', legacy(d(VALIDA, { userId: '' })) && legacy(d(VALIDA, { userId: undefined })));
check('A5) la lista se compara por IGUALDAD exacta: ni mayúsculas, ni prefijos, ni espacios',
  [AUTORIZADA.toUpperCase(), AUTORIZADA.slice(0, -1), AUTORIZADA + 'x', ' ' + AUTORIZADA].every((u) => legacy(d(VALIDA, { userId: u }), 'cuenta_fuera_de_la_prueba')));

/* ── B. Configuración AUSENTE ───────────────────────────────────────────── */
check('B1) sin documento (undefined) → LEGACY (deshabilitada)', legacy(d(undefined), 'deshabilitada'));
check('B2) null → LEGACY (deshabilitada)', legacy(d(null), 'deshabilitada'));
check('B3) la puerta por defecto es la cerrada', PUERTA_CERRADA.habilitado === false && legacy(d(PUERTA_CERRADA), 'deshabilitada'));

/* ── C. Configuración VACÍA ─────────────────────────────────────────────── */
check('C1) documento vacío `{}` → LEGACY', legacy(d({}), 'configuracion_ilegible'));
check('C2) habilitada SIN lista de cuentas → LEGACY (sin_lista_de_cuentas) — el fallo que se cierra',
  legacy(d({ habilitado: true, capacidades: ['text.generate'] }), 'sin_lista_de_cuentas'));
check('C3) habilitada con la lista de cuentas VACÍA → LEGACY (sin_lista_de_cuentas)',
  legacy(d({ habilitado: true, capacidades: ['text.generate'], cuentas: [] }), 'sin_lista_de_cuentas'));
check('C4) habilitada sin capacidades → LEGACY', legacy(d({ habilitado: true, capacidades: [], cuentas: [AUTORIZADA] }), 'capacidad_no_migrada'));
check('C5) cadena vacía, lista vacía, 0, false → LEGACY', ['', [], 0, false].every((c) => legacy(d(c))));

/* ── D. Configuración INVÁLIDA ──────────────────────────────────────────── */
const INVALIDAS = [
  { habilitado: 'true', capacidades: ['text.generate'], cuentas: [AUTORIZADA] },
  { habilitado: 1, capacidades: ['text.generate'], cuentas: [AUTORIZADA] },
  { habilitado: true, capacidades: 'text.generate', cuentas: [AUTORIZADA] },
  { habilitado: true, capacidades: ['text.generate', 7], cuentas: [AUTORIZADA] },
  { habilitado: true, capacidades: ['TEXT GENERATE'], cuentas: [AUTORIZADA] },
  { habilitado: true, capacidades: ['text.generate'], cuentas: AUTORIZADA },
  { habilitado: true, capacidades: ['text.generate'], cuentas: [AUTORIZADA, 7] },
  { habilitado: true, capacidades: ['text.generate'], cuentas: [AUTORIZADA, null] },
  { habilitado: true, capacidades: ['text.generate'], cuentas: [AUTORIZADA, 'con espacio'] },
  { habilitado: true, capacidades: ['text.generate'], cuentas: { includes: () => true, length: 1 } },
  { habilitado: true, capacidades: ['text.generate'], cuentas: Array.from({ length: 257 }, (_, i) => `c${i}`) },
  { habilitado: true, capacidades: ['text.generate'], cuentas: [AUTORIZADA], experiencias: 'brain' },
  'abierta', 42, [VALIDA],
];
check(`D1) ${INVALIDAS.length} configuraciones inválidas → LEGACY (configuracion_ilegible), ninguna abre`,
  INVALIDAS.every((c) => legacy(d(c), 'configuracion_ilegible')),
  INVALIDAS.filter((c) => !legacy(d(c), 'configuracion_ilegible')).map((c) => JSON.stringify(c).slice(0, 60)).join(' | '));
check('D2) estricta: una lista con UN elemento raro descarta la configuración entera (no se «limpia»)',
  leerPuerta({ habilitado: true, capacidades: ['text.generate'], cuentas: [AUTORIZADA, 7] }).ok === false);

/* ── E. Error al LEER ───────────────────────────────────────────────────── */
const dbQue = ({ revienta = false, existe = true, datos } = {}) => {
  const lecturas = { n: 0 };
  return {
    lecturas,
    collection: (c) => ({ doc: (id) => ({ get: async () => {
      lecturas.n++;
      if (c !== 'aiSettings' || id !== 'runtime') throw new Error(`leyó ${c}/${id}`);
      if (revienta) throw new Error('UNAVAILABLE: Firestore no contesta');
      return { exists: existe, data: () => datos };
    } }) }),
  };
};
{
  let t = 1_000_000;
  const ahora = () => t;
  olvidarLaPuerta();
  const roto = dbQue({ revienta: true, datos: VALIDA });
  const leida = await configuracionDeLaPuerta(roto, ahora);
  check('E1) si Firestore no contesta, la lectura devuelve LECTURA_FALLIDA (no undefined, no la última buena)', leida === LECTURA_FALLIDA);
  check('E2) …y la decisión es LEGACY con su propio motivo (lectura_fallida)', legacy(decidirRuntime(leida, ctx()), 'lectura_fallida'));
  t += 1000;
  await configuracionDeLaPuerta(roto, ahora);
  check('E3) …y se recuerda cerrada durante la vigencia: no castiga cada mensaje con un reintento', roto.lecturas.n === 1);
  t += VIGENCIA_DE_LA_PUERTA_MS + 1;
  const sana = dbQue({ datos: VALIDA });
  check('E4) pasada la vigencia vuelve a leer, y una configuración válida abre solo para la cuenta autorizada',
    decidirRuntime(await configuracionDeLaPuerta(sana, ahora), ctx()).runtime === 'core'
    && legacy(decidirRuntime(await configuracionDeLaPuerta(sana, ahora), ctx({ userId: OTRA }))));
  olvidarLaPuerta();
  check('E5) documento inexistente → undefined → LEGACY (deshabilitada)',
    legacy(decidirRuntime(await configuracionDeLaPuerta(dbQue({ existe: false }), ahora), ctx()), 'deshabilitada'));
  olvidarLaPuerta();
  check('E6) documento existente sin lista de cuentas → LEGACY (sin_lista_de_cuentas)',
    legacy(decidirRuntime(await configuracionDeLaPuerta(dbQue({ datos: { habilitado: true, capacidades: ['text.generate'] } }), ahora), ctx()), 'sin_lista_de_cuentas'));
  olvidarLaPuerta();
  check('E7) solo lee `aiSettings/runtime`: ningún otro documento decide la puerta', await configuracionDeLaPuerta(dbQue({ datos: VALIDA }), ahora).then((v) => v === VALIDA, () => false));
  olvidarLaPuerta();
}

/* ── F. Válida: se aplica la lista, y nada más la amplía ────────────────── */
check('F1) un comodín en las cuentas NO es un comodín: `*` ni siquiera es una etiqueta válida', legacy(d({ ...VALIDA, cuentas: ['*'] })));
check('F2) un comodín en las capacidades tampoco (ni siquiera tiene forma de capacidad)', legacy(d({ ...VALIDA, capacidades: ['*'] }), 'configuracion_ilegible'));
check('F3) `habilitado: false` manda sobre una lista con la cuenta', legacy(d({ ...VALIDA, habilitado: false }), 'deshabilitada'));
check('F4) con `experiencias`, la experiencia también tiene que estar', legacy(d({ ...VALIDA, experiencias: ['studio'] }), 'experiencia_no_migrada')
  && d({ ...VALIDA, experiencias: ['brain'] }).runtime === 'core');

/* ── G. Los rodeos, en el código que llama ──────────────────────────────── */
const BRAIN = leer('functions/src/creator/brain.ts');
const VIDEO = leer('functions/src/creator/video.ts');
check('G1) las dos puertas deciden con el uid de la SESIÓN (request.auth), nunca con lo que mande el cliente',
  /const uid = request\.auth\.uid;/.test(BRAIN) && /decidirRuntime\(await configuracionDeLaPuerta\(db\), \{ capability: capacidad, userId: uid,/.test(BRAIN)
  && /decidirRuntime\(await configuracionDeLaPuerta\(getFirestore\(\)\), \{[\s\S]{0,120}?userId: uid,/.test(VIDEO));
check('G2) cada puerta solo manda al Core la capacidad declarada EN SU CÓDIGO (la configuración no la amplía)',
  /const porElCore = puerta\.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY;/.test(BRAIN)
  && /const porElCore = puerta\.runtime === 'core' && normalizado\.capability === CAPACIDAD_DEL_CANARY;/.test(VIDEO));
check('G3) el conductor solo se monta detrás de `porElCore` (no hay otro camino al Core en estas puertas)',
  (BRAIN.match(/conductorDeWee\(\{/g) || []).length === 1 && (VIDEO.match(/conductorDeWee\(\{/g) || []).length === 1
  && VIDEO.indexOf('conductorDeWee({') > VIDEO.indexOf('if (porElCore) {') && /porElCore \? await pensadorDelConductor\(\)/.test(BRAIN));
const usos = spawnSync('git', ['grep', '-l', '-E', 'decidirRuntime|conductorDeWee\\(', '--', 'functions/src'], { cwd: RAIZ, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean).sort();
check('G4) nadie más decide la puerta ni monta el conductor fuera del runtime y de las dos puertas',
  usos.every((f) => /^functions\/src\/runtime\//.test(f) || ['functions/src/creator/brain.ts', 'functions/src/creator/video.ts'].includes(f)), usos.join(', '));
const escritores = spawnSync('git', ['grep', '-n', '-E', "collection\\('aiSettings'\\)\\.doc\\('runtime'\\)|DOCUMENTO_DE_LA_PUERTA", '--', 'functions/src'], { cwd: RAIZ, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
check('G5) ningún código del servidor escribe `aiSettings/runtime` (solo lo lee configuracion.ts)',
  escritores.every((l) => /^functions\/src\/runtime\/configuracion\.ts:/.test(l)) && !/\.set\(|\.update\(/.test(sinComentarios(leer('functions/src/runtime/configuracion.ts'))), escritores.join(' | '));
check('G6) los clientes no leen ni escriben `aiSettings` (firestore.rules)', /match \/aiSettings\/\{settingId\} \{\s*allow read, write: if false;/.test(leer('firestore.rules')));
check('G7) emulador y producción deciden igual: ni la puerta ni su lectura miran el entorno',
  ['functions/src/runtime/puerta.ts', 'functions/src/runtime/configuracion.ts'].every((f) => !/process\.env|FUNCTIONS_EMULATOR|GCLOUD_PROJECT|get-wee/.test(sinComentarios(leer(f)))));

/* ── H. SABOTAJE: la puerta de main (acf1f56) se abría para todo el mundo sin lista ─ */
const anterior = spawnSync('git', ['show', 'acf1f56:functions/src/runtime/puerta.ts'], { cwd: RAIZ, encoding: 'utf8' });
if (anterior.status !== 0) {
  console.log('· sin acf1f56 en este clon: el sabotaje contra la puerta anterior se salta');
} else {
  const ts = require(path.resolve(here, '../node_modules/typescript'));
  const js = ts.transpileModule(anterior.stdout, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', js)(m, m.exports, require);
  const vieja = m.exports.decidirRuntime;
  const sinLista = { habilitado: true, capacidades: ['text.generate'] };
  check('H1) sabotaje: con la puerta anterior, SIN lista de cuentas, una persona cualquiera iba al Core',
    vieja(sinLista, ctx({ userId: OTRA })).runtime === 'core');
  check('H2) sabotaje: con la de ahora, la misma configuración no abre para nadie',
    legacy(decidirRuntime(sinLista, ctx({ userId: OTRA })), 'sin_lista_de_cuentas') && legacy(decidirRuntime(sinLista, ctx()), 'sin_lista_de_cuentas'));
  const comunes = [VALIDA, undefined, {}, { ...VALIDA, cuentas: [] }, ...INVALIDAS];
  check('H3) en todo lo demás las dos deciden lo mismo (no se rompe a nadie autorizado)',
    comunes.every((c) => [ctx(), ctx({ userId: OTRA })].every((x) => vieja(c, x).runtime === decidirRuntime(c, x).runtime)));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
