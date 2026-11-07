/*
 * CIERRE DE LA FASE i18n: LO QUE ENCONTRÓ LA AUDITORÍA FINAL Y QUE NINGUNA SUITE MIRABA.
 *
 *   node test/i18n-cierre-final.test.mjs
 *
 * La auditoría final (2026-10-03) recorrió las capas que los detectores no cubren —hooks, servicios, utilidades, el
 * servidor— y encontró textos que llegaban a la pantalla en el idioma equivocado. Cada uno queda aquí, con el código
 * de verdad cuando se puede ejecutar:
 *   A · el objetivo por defecto que escribe el servidor (en español) se enseñaba tal cual en cuatro sitios de
 *       CreatorFlowScreen: el título del documento de Weë Writer, la sugerencia de nombre de proyecto, el «objetivo
 *       con un cambio» y el objetivo con el que se sigue en otra experiencia;
 *   B · el nombre de una creación que el catálogo no conoce (el «Crear un vídeo» del Core Runtime) salía en español en
 *       Mis creaciones: ahora, fuera del español, la tarjeta pone su tipo traducido;
 *   C · la sugerencia de nombre de proyecto aplicaba la regla española «mi …» en cualquier idioma, y «mis redes» daba
 *       «Mi redes»;
 *   D · un código de error del SDK («internal», «deadline-exceeded») se enseñaba como mensaje a quien lee en español;
 *   E · la gestión de comunidades buscaba solo por el nombre español de las comunidades de Weë;
 *   F · la documentación seguía diciendo que solo es/en/da declaran la sección del servidor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const sinComentarios = (t) => t.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

/* El cargador de siempre: transpila y ejecuta los módulos de verdad, con sus imports relativos. */
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const transpilar = (fuente) => ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const cargar = async (ruta, fuente) => {
  if (!fuente && cargados.has(ruta)) return cargados.get(ruta);
  let js = transpilar(fuente ?? leer(ruta));
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  if (!fuente) cargados.set(ruta, r);
  return r;
};

const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const { crearTraductor } = (await cargar('i18n/traducir.ts')).ns;
const SERVIDOR = (await cargar('i18n/servidor.ts')).ns;
const tr = (locale) => crearTraductor(locale, DICCIONARIOS, { modoDesarrollo: false });

// ── A · El objetivo por defecto, en el idioma de quien mira ─────────────────
const FLUJO = sinComentarios(leer('screens/CreatorFlowScreen.tsx'));
check('A) el título del documento de Weë Writer sale de textoDeObjetivo, no del objetivo crudo',
  /navigation\.navigate\('WriterEditor', \{ text: content, title: textoDeObjetivo\(t, experience\.id, job\.goal\)\.slice\(0, 60\) \}\)/.test(FLUJO)
  && !/title: job\.goal\.slice/.test(FLUJO));
check('A) el «objetivo con un cambio» y el objetivo con el que se sigue en otra experiencia, también',
  /objetivo: \(job\?\.goal \? textoDeObjetivo\(t, experience\.id, job\.goal\) : params\.goal\) \|\| nombre/.test(FLUJO)
  && /goal: textoDeObjetivo\(t, experience\.id, job\.goal\),/.test(FLUJO) && !/\n\s*goal: job\.goal,/.test(FLUJO));
check('A) y la sugerencia de nombre de proyecto recibe el objetivo traducido',
  /goal=\{job\?\.goal \? textoDeObjetivo\(t, experience\.id, job\.goal\) : params\.goal \|\| ''\}/.test(FLUJO) && !/goal=\{job\?\.goal \|\| params\.goal \|\| ''\}/.test(FLUJO));
const tDa = tr('da-DK');
const objetivoChef = 'Algo rico para comer hoy';
check('A) textoDeObjetivo dice el objetivo por defecto en el idioma de quien mira (danés), y lo escrito por la persona tal cual',
  SERVIDOR.textoDeObjetivo(tDa, 'chef', objetivoChef) !== objetivoChef && SERVIDOR.textoDeObjetivo(tDa, 'chef', 'Lasagne til fire') === 'Lasagne til fire',
  SERVIDOR.textoDeObjetivo(tDa, 'chef', objetivoChef));

// ── B · El nombre de una creación que el catálogo no conoce ─────────────────
const REJILLA = sinComentarios(leer('components/creator/RejillaDeCreaciones.tsx'));
check('B) Mis creaciones lee el nombre con textoDelServidorLegible y, si no lo conoce, pone el tipo traducido',
  /nombre \? textoDelServidorLegible\(nombre, \{ t, locale \}\) : undefined/.test(REJILLA) && /\{nombreDe\(asset\.name\) \|\| t\(claveDeTipo\)\}/.test(REJILLA)
  && !/textoDelServidor\(nombre/.test(REJILLA));
check('B) «Crear un vídeo» (sin entrada en el catálogo) no se enseña en danés ni en filipino; en español, sí',
  SERVIDOR.textoDelServidorLegible('Crear un vídeo', { t: tDa, locale: 'da-DK' }) === undefined
  && SERVIDOR.textoDelServidorLegible('Crear un vídeo', { t: tr('fil-PH'), locale: 'fil-PH' }) === undefined
  && SERVIDOR.textoDelServidorLegible('Crear un vídeo', { t: tr('es-PE'), locale: 'es-PE' }) === 'Crear un vídeo');

// ── C · La sugerencia de nombre de proyecto ──────────────────────────────────
/* Se ejecuta la función de verdad, sin Firebase: su fuente con sus dos imports (caja y resolver). */
const PROYECTOS = leer('services/projectsService.ts');
const fuenteSugerencia = (PROYECTOS.match(/export const suggestProjectName = [\s\S]*?\n};/) || [''])[0];
const { suggestProjectName } = (await cargar('services/_sugerencia.ts',
  `import { conMayusculaInicial } from '../i18n/caja';\nimport { idiomaDe } from '../i18n/resolver';\n${fuenteSugerencia}`)).ns;
check('C) en español: «…mi restaurante» → «Mi restaurante», y «…mis redes» → «Mis redes» (ya no «Mi redes»)',
  suggestProjectName('Un video para promocionar mi restaurante', 'es-PE') === 'Mi restaurante'
  && suggestProjectName('Un video corto para mis redes', 'es') === 'Mis redes', suggestProjectName('Un video corto para mis redes', 'es'));
check('C) en otro idioma no se busca el «mi» español: «Un logo che mi rappresenti» (italiano) da «Un logo che», no «Mi rappresenti»',
  suggestProjectName('Un logo che mi rappresenti', 'it-IT') === 'Un logo che' && suggestProjectName('Un logo che mi rappresenti', 'es') === 'Mi rappresenti'
  && suggestProjectName('istanbul gezisi planı', 'tr-TR') === 'İstanbul gezisi planı',
  suggestProjectName('Un logo che mi rappresenti', 'it-IT'));

// ── D · Un código de error no es una frase ───────────────────────────────────
const tEs = tr('es-PE');
check('D) a quien lee en español no se le enseña un código del SDK como mensaje («internal», «deadline-exceeded», «functions/unavailable»)',
  ['internal', 'deadline-exceeded', 'functions/unavailable'].every((m) => SERVIDOR.mensajeDelServidor({ message: m }, { t: tEs, locale: 'es-PE' }) === undefined));
check('D) y una frase del servidor que no está en el catálogo sí se enseña en español (y en danés no)',
  SERVIDOR.mensajeDelServidor({ message: 'No se pudo completar la operación.' }, { t: tEs, locale: 'es-PE' }) === 'No se pudo completar la operación.'
  && SERVIDOR.mensajeDelServidor({ message: 'No se pudo completar la operación.' }, { t: tDa, locale: 'da-DK' }) === undefined);

// ── E · La gestión de comunidades busca también por el nombre traducido ─────
const GESTION = sinComentarios(leer('screens/CommunitiesManagementScreen.tsx'));
check('E) la gestión de comunidades busca también por nombreDeComunidad y descripcionDeComunidad, como el buscador',
  /paraBuscar\(nombreDeComunidad\(c, t, locale\)\)\.includes\(normalizedQuery\)/.test(GESTION)
  && /paraBuscar\(descripcionDeComunidad\(c, t, locale\)\)\.includes\(normalizedQuery\)/.test(GESTION));

// ── F · La documentación dice lo que hay ─────────────────────────────────────
const I18N = leer('docs/I18N.md');
check('F) docs/I18N.md: la sección del servidor la declaran es, en, da y fil, y trece idiomas caen al inglés',
  /hoy la declaran `es`, `en`, `da` y `fil`/.test(I18N) && /en trece idiomas, sale en inglés/.test(I18N) && !/en doce idiomas/.test(I18N));
check('F) y describe la búsqueda por idioma activo (palabra entera, forma, lo que se escribe)', /Palabras clave por idioma activo/.test(I18N));

// ── G · Un documento sin título no guarda «Sin título» en español ───────────
const DOCUMENTOS = sinComentarios(leer('services/documentsService.ts'));
check('G) un documento sin título se guarda vacío (no «Sin título») y lo de antes se reconoce como sin título',
  /const titleOf = [^\n]*\|\| ''\)\.trim\(\)\.slice\(0, 60\);/.test(DOCUMENTOS) && !/\|\| 'Sin título'/.test(DOCUMENTOS)
  && /export const sinTitulo = \(title: string \| undefined\): boolean => !title\?\.trim\(\) \|\| title\.trim\(\) === TITULO_GUARDADO_ANTES;/.test(DOCUMENTOS));
check('G) la lista de documentos y el editor pintan writer.untitled (o el campo vacío) en el idioma de quien mira',
  /sinTitulo\(doc\.title\) \? t\('writer\.untitled'\) : doc\.title/.test(sinComentarios(leer('components/creator/WriterDocuments.tsx')))
  && (sinComentarios(leer('screens/WriterEditorScreen.tsx')).match(/setTitle\(sinTitulo\(/g) || []).length === 3);
const sinTraducir = Object.keys(DICCIONARIOS).filter((c) => !/^es(-|$)/.test(c) && !/^pt/.test(c)).filter((c) => { const v = tr(c)('writer.untitled'); return !v.trim() || v === 'Sin título'; });
check('G) writer.untitled existe en todos los idiomas y fuera del español no es «Sin título» (filipino «Walang pamagat»)',
  sinTraducir.length === 0 && tr('fil-PH')('writer.untitled') === 'Walang pamagat' && tDa('writer.untitled') === 'Uden titel', sinTraducir.join(' '));

check('esta suite está en la cadena de `npm test`', /i18n-cierre-final\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
