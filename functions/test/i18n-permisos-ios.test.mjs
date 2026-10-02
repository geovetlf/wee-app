/*
 * LOS PERMISOS NATIVOS DE iOS, POR IDIOMA — `app.json` → `expo.locales` + `locales/<idioma>.json`.
 *
 *   node test/i18n-permisos-ios.test.mjs
 *
 * iOS enseña la frase de un permiso (cámara, micrófono, fotos, ubicación) ANTES de que la app pueda decir nada, y
 * la saca del `InfoPlist.strings` de cada idioma, no de los diccionarios de `i18n/`. Lo que se fija:
 *
 *   A. cada idioma declarado tiene su archivo, y todos llevan EXACTAMENTE las mismas claves;
 *   B. esas claves son todas las frases de permiso que la configuración base declara (infoPlist + plugins);
 *   C. el español de `locales/es.json` es el MISMO texto que la base (si no, un aparato en español y la base dicen
 *      cosas distintas), con la precedencia de Expo: el texto del plugin gana al de `infoPlist`;
 *   D. cada archivo dice algo de verdad (no vacío, nombra a Weë, sin huecos sin rellenar), fuera del español está
 *      traducido, y ningún idioma repite la frase de otro;
 *   E. EL TRINQUETE: cada idioma `listo` de `i18n/idiomas.ts` tiene su archivo o figura en PENDIENTES. Esa lista
 *      solo puede encoger —no puede nombrar un idioma que no estuviera en la del 2026-10-01—: un idioma listo
 *      nuevo llega con su archivo, como pide docs/I18N.md § 5, paso 7;
 *   F. las frases dicen el uso REAL: Apple exige que la frase de propósito describa para qué se usa el permiso, y
 *      aquí se ata al código que lo pide (micrófono = audios de WeeTalk; cámara = fotos, nunca vídeo).
 *
 * Historia de PENDIENTES. El 2026-10-01 solo había `locales/` para es/en/da y los otros trece idiomas listos veían el
 * español: sus catálogos no tenían un texto EQUIVALENTE para las cinco frases (lo que hay son avisos de después de
 * negar un permiso, más cortos y con otro propósito). Ese mismo día se tradujeron por el proceso de idioma —traducción
 * desde el español con el vocabulario y el registro de cada catálogo o guía, y una revisión nativa independiente— y la
 * lista quedó vacía. Esa revisión la hizo un agente de IA, no una persona: la revisión humana sigue pendiente, igual
 * que en el resto de los diccionarios (docs/I18N-REVISION.md).
 *
 * pt-BR y pt-PT son DOS textos, no un alias: `i18n/textos/pt-PT/` es portugués europeo de verdad («tu», «câmara»,
 * «guardar», «transferir», «a app»), así que D3 también les exige decir cada frase a su manera. Y zh-Hant sigue la
 * norma de Taiwán, como su catálogo `i18n/textos/zh-TW/`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* Los idiomas listos, del catálogo de verdad (transpilado; `i18n/idiomas.ts` no importa nada). */
const ts = createRequire(path.resolve(RAIZ, 'functions/package.json'))('typescript');
const js = ts.transpileModule(leer('i18n/idiomas.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { IDIOMAS } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

/* La carpeta `.lproj` que pide iOS para cada variante: el chino va por escritura, no por país. */
const LPROJ = { 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant' };
const clavesIos = IDIOMAS.filter((i) => i.listo).flatMap((i) => (i.variantes ? i.variantes.map((v) => LPROJ[v.locale] || v.locale) : [i.codigo]));

/* Los idiomas listos que todavía no tienen su archivo (ver la cabecera). Solo puede encoger: E5 no deja meter aquí
   nada que no estuviera en la lista del 2026-10-01, que se guarda tal cual para eso. Hoy está vacía. */
const PENDIENTES = [];
const PENDIENTES_2026_10_01 = ['de', 'fr', 'it', 'pt-BR', 'pt-PT', 'sv', 'tr', 'ru', 'hi', 'ko', 'zh-Hans', 'zh-Hant', 'ja'];

/* Las cinco frases de hoy. */
const CLAVES = [
  'NSCameraUsageDescription',
  'NSMicrophoneUsageDescription',
  'NSPhotoLibraryUsageDescription',
  'NSPhotoLibraryAddUsageDescription',
  'NSLocationWhenInUseUsageDescription',
];

const app = JSON.parse(leer('app.json')).expo;
const declarados = app.locales || {};
const archivos = Object.fromEntries(Object.entries(declarados).map(([idioma, ruta]) => [idioma, existe(ruta) ? JSON.parse(leer(ruta)) : null]));

/* ── A. archivos y claves ───────────────────────────────────────────────── */
const faltanArchivos = Object.entries(archivos).filter(([, j]) => !j || typeof j.ios !== 'object').map(([i]) => i);
check('A1) cada idioma declarado en app.json tiene su archivo con una sección `ios`', faltanArchivos.length === 0, faltanArchivos.join(', ') || Object.keys(declarados).join(', '));
check('A2) el español está declarado (es la base de las frases)', !!archivos.es);
const clavesDe = (i) => Object.keys(archivos[i]?.ios || {}).sort().join(',');
const distintos = Object.keys(archivos).filter((i) => clavesDe(i) !== clavesDe('es'));
check('A3) todos los archivos llevan exactamente las mismas claves que el español', distintos.length === 0, distintos.join(', '));
const sinLasCinco = Object.keys(archivos).filter((i) => clavesDe(i) !== [...CLAVES].sort().join(','));
check('A4) y cada archivo declara las cinco, ni una más ni una menos', sinLasCinco.length === 0, sinLasCinco.join(', '));

/* ── B. las claves son todas las frases de permiso de la base ───────────── */
const plugin = (nombre) => (app.plugins || []).find((p) => Array.isArray(p) && p[0] === nombre)?.[1] || {};
const ubicacion = plugin('expo-location');
const galeria = plugin('expo-media-library');
/* Lo que acaba en el Info.plist base, con la precedencia de `applyPermissions` de @expo/config-plugins:
   el texto que se le pasa al plugin, si no el de `infoPlist`. */
const base = {};
for (const [k, v] of Object.entries(app.ios?.infoPlist || {})) if (/UsageDescription$/.test(k)) base[k] = v;
if (typeof ubicacion.locationWhenInUsePermission === 'string') base.NSLocationWhenInUseUsageDescription = ubicacion.locationWhenInUsePermission;
if (typeof galeria.photosPermission === 'string') base.NSPhotoLibraryUsageDescription = galeria.photosPermission;
if (typeof galeria.savePhotosPermission === 'string') base.NSPhotoLibraryAddUsageDescription = galeria.savePhotosPermission;
check('B1) los archivos traducen todas las frases de permiso de la base, y solo esas',
  Object.keys(base).sort().join(',') === clavesDe('es'), `base: ${Object.keys(base).sort().join(', ')}`);
check('B2) y son las cinco de hoy (cámara, micrófono, fotos, guardar en fotos, ubicación mientras se usa)', Object.keys(base).length === 5);

/* ── C. el español es la base ───────────────────────────────────────────── */
const desalineadas = Object.keys(base).filter((k) => archivos.es?.ios?.[k] !== base[k]);
check('C1) locales/es.json dice lo mismo que la base (el plugin gana a infoPlist)', desalineadas.length === 0, desalineadas.join(', '));

/* ── D. cada frase dice algo ────────────────────────────────────────────── */
const malas = [];
for (const [i, j] of Object.entries(archivos)) for (const [k, v] of Object.entries(j?.ios || {})) {
  if (typeof v !== 'string' || v.trim().length < 20 || !v.includes('Weë') || /\{\{|\}\}|TODO|PENDIENTE/.test(v)) malas.push(`${i}.${k}`);
}
check('D1) ninguna frase vacía, sin Weë o con huecos sin rellenar', malas.length === 0, malas.join(', '));
const sinTraducir = Object.keys(archivos).filter((i) => i !== 'es').flatMap((i) => Object.keys(base).filter((k) => archivos[i]?.ios?.[k] === archivos.es?.ios?.[k]).map((k) => `${i}.${k}`));
check('D2) fuera del español, ninguna frase es la española copiada', sinTraducir.length === 0, sinTraducir.join(', '));
/* D2 solo mira contra el español; esto, contra todos: ni el inglés copiado en otro idioma, ni pt-PT = pt-BR, ni
   zh-Hant = zh-Hans. Cada idioma dice cada frase a su manera. */
const repetidasEn = (arch) => {
  const acc = [];
  for (const k of CLAVES) {
    const quien = new Map();
    for (const [i, j] of Object.entries(arch)) {
      const v = j?.ios?.[k];
      if (typeof v === 'string') quien.set(v, [...(quien.get(v) || []), i]);
    }
    for (const idiomas of quien.values()) if (idiomas.length > 1) acc.push(`${k}: ${idiomas.join(' = ')}`);
  }
  return acc;
};
const repetidas = repetidasEn(archivos);
check('D3) ningún idioma repite la frase de otro', repetidas.length === 0, repetidas.join('; '));

/* ── E. el trinquete ────────────────────────────────────────────────────── */
const sinArchivo = clavesIos.filter((c) => !(c in declarados));
check('E1) cada idioma listo tiene su archivo o está en PENDIENTES', sinArchivo.every((c) => PENDIENTES.includes(c)), sinArchivo.filter((c) => !PENDIENTES.includes(c)).join(', '));
check('E2) PENDIENTES no guarda idiomas que ya tienen archivo (sácalos de la lista)', PENDIENTES.every((c) => !(c in declarados)), PENDIENTES.filter((c) => c in declarados).join(', '));
check('E3) PENDIENTES solo nombra idiomas listos', PENDIENTES.every((c) => clavesIos.includes(c)), PENDIENTES.filter((c) => !clavesIos.includes(c)).join(', '));
check('E4) no se declara un archivo para un idioma que la app no ofrece', Object.keys(declarados).every((c) => clavesIos.includes(c)), Object.keys(declarados).filter((c) => !clavesIos.includes(c)).join(', '));
check('E5) PENDIENTES solo encoge: no nombra nada que no estuviera en la lista del 2026-10-01', PENDIENTES.every((c) => PENDIENTES_2026_10_01.includes(c)), PENDIENTES.filter((c) => !PENDIENTES_2026_10_01.includes(c)).join(', '));
check('E6) hoy, todos los idiomas listos tienen su archivo', clavesIos.every((c) => c in declarados), clavesIos.filter((c) => !(c in declarados)).join(', '));
console.log(`· con archivo (${Object.keys(declarados).length}): ${Object.keys(declarados).join(', ')} · pendientes (${PENDIENTES.length}): ${PENDIENTES.join(', ') || 'ninguno'}`);

/* ── F. el uso real ─────────────────────────────────────────────────────── */
/* Apple rechaza una frase de propósito que no describe para qué se usa el permiso. Se ata a lo que el código hace:
   si un día la cámara graba vídeo, o el micrófono se usa para otra cosa, esto falla y obliga a reescribir la frase
   en los dieciséis idiomas, no solo en español. */
const fuentesCliente = (() => {
  const acc = [];
  const recorrer = (rel) => {
    for (const e of fs.readdirSync(path.resolve(RAIZ, rel), { withFileTypes: true })) {
      const hijo = rel + '/' + e.name;
      if (e.isDirectory()) recorrer(hijo);
      else if (/\.tsx?$/.test(e.name)) acc.push([hijo, leer(hijo)]);
    }
  };
  for (const d of ['screens', 'components', 'hooks', 'services', 'contexts', 'utils']) if (existe(d)) recorrer(d);
  return acc;
})();
const conversacion = existe('screens/ConversationScreen.tsx') ? leer('screens/ConversationScreen.tsx') : '';
const grabanAudio = fuentesCliente.filter(([, s]) => /Audio\.Recording|requestRecordingPermissionsAsync|useAudioRecorder|useMicrophonePermissions/.test(s)).map(([f]) => f);
check('F1) el micrófono solo lo pide WeeTalk (las notas de voz de ConversationScreen)',
  grabanAudio.length === 1 && grabanAudio[0] === 'screens/ConversationScreen.tsx' && /Audio\.requestPermissionsAsync/.test(conversacion), grabanAudio.join(', '));
check('F2) y la frase del micrófono lo dice: WeeTalk, sin prometer audio en vídeos', /WeeTalk/.test(base.NSMicrophoneUsageDescription || '') && !/v[ií]deo/i.test(base.NSMicrophoneUsageDescription || ''));
const GRABA_VIDEO = /recordAsync\(|launchCameraAsync\(\{[^}]*(videos|MediaTypeOptions\.(All|Videos))/;
const grabanVideo = fuentesCliente.filter(([, s]) => GRABA_VIDEO.test(s)).map(([f]) => f);
check('F3) la cámara solo hace fotos: nadie graba vídeo con ella', grabanVideo.length === 0, grabanVideo.join(', '));
check('F4) y la frase de la cámara no promete vídeos', !/v[ií]deo/i.test(base.NSCameraUsageDescription || ''));
const guardanEnGaleria = fuentesCliente.filter(([, s]) => /saveToLibraryAsync|createAssetAsync/.test(s)).map(([f]) => f);
check('F5) a la galería solo se guarda al descargar una creación de Weë AI, y la frase lo dice',
  guardanEnGaleria.join(',') === 'services/assetDownload.ts' && /Weë AI/.test(base.NSPhotoLibraryAddUsageDescription || ''), guardanEnGaleria.join(', '));

/* ── Control: las comprobaciones distinguen ─────────────────────────────── */
const sinUna = { ...archivos.es.ios };
delete sinUna.NSMicrophoneUsageDescription;
check('X1) control: a un archivo le falta una clave → A3 lo ve', Object.keys(sinUna).sort().join(',') !== clavesDe('es'));
check('X2) control: un idioma listo nuevo sin archivo ni pendiente → E1 lo ve', !['xx'].every((c) => c in declarados || PENDIENTES.includes(c)));
check('X3) control: la variante china va por escritura', clavesIos.includes('zh-Hans') && clavesIos.includes('zh-Hant') && !clavesIos.includes('zh-CN'));
check('X4) control: meter en PENDIENTES un idioma que no estaba → E5 lo ve', !['ar'].every((c) => PENDIENTES_2026_10_01.includes(c)));
check('X5) control: pt-PT con el texto de pt-BR → D3 lo ve',
  repetidasEn({ 'pt-BR': archivos['pt-BR'], 'pt-PT': archivos['pt-BR'] }).length === CLAVES.length);
check('X6) control: una cámara que grabara vídeo → F3 lo ve',
  GRABA_VIDEO.test("ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'] })") && GRABA_VIDEO.test('await camara.current.recordAsync()'));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
