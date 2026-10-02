/**
 * «¿QUIEN MIRA LEE EN ESPAÑOL?» SE PREGUNTA EN UN SOLO SITIO.
 *
 *   node test/i18n-idioma-del-locale.test.mjs
 *
 * Varios archivos decidían si enseñar tal cual un texto del servidor —que escribe en español— con su propia copia de
 * `/^es(-|$)/` sobre el LOCALE, con y sin `i`: la cartera, el error de Weë AI, el texto de un resultado y dos sitios de
 * `i18n/servidor.ts`. El locale decide los FORMATOS; el idioma de un locale lo dice el resolutor de Weë, `idiomaDe`
 * (`i18n/resolver.ts`). Una expresión copiada no normaliza (`ES_pe` no era español para la que no llevaba `i`) y cada
 * copia es un sitio más donde equivocarse.
 *
 * Tres de los cinco sitios hacían además LA MISMA pregunta —«¿este texto del servidor se puede enseñar tal cual?»—:
 * ahora la hace una función de `i18n/servidor.ts`, `textoDelServidorLegible`, y la cartera y el error de Weë AI la
 * llaman. Así ninguna pantalla compara idiomas (las guardas de «ningún ternario de idioma» siguen valiendo).
 *
 * Esta prueba comprueba que el ayudante canónico existe y hace lo que se espera, que los cinco sitios lo usan, que
 * su comportamiento no cambió, y que la expresión no vuelve a aparecer en el cliente.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const ts = require('typescript');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

/* ── El cargador de siempre: transpila y ejecuta los módulos de la app, con sus imports relativos. ── */
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const url = comoModulo(js);
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

console.log('\n── A · El ayudante: idiomaDe, en i18n/resolver.ts ──');
const { idiomaDe } = (await cargar('i18n/resolver.ts')).ns;
{
  const CASOS = [['es', 'es'], ['es-PE', 'es'], ['es-419', 'es'], ['ES_pe', 'es'], ['es_ES', 'es'], ['en-US', 'en'],
    ['pt-BR', 'pt'], ['da-DK', 'da'], ['zh-Hant-TW', 'zh'], ['', ''], ['basura!', '']];
  const malos = CASOS.filter(([entra, sale]) => idiomaDe(entra) !== sale).map(([e, s]) => `${e}→${idiomaDe(e)} (≠${s})`);
  check('1) idiomaDe da el idioma de un locale, normalizado', typeof idiomaDe === 'function' && malos.length === 0, malos.join(' · '));
  /* Lo que una expresión copiada no veía. */
  check('2) y ve español donde la copia sin `i` no lo veía (ES_pe, es_ES)', idiomaDe('ES_pe') === 'es' && !/^es(-|$)/.test('ES_pe')
    && idiomaDe('es_ES') === 'es' && !/^es(-|$)/.test('es_ES'));
}

console.log('\n── B · Los cinco sitios lo usan ──');
{
  const SERVIDOR = leer('i18n/servidor.ts');
  check('3) i18n/servidor.ts lo importa del resolutor', /import \{ idiomaDe \} from '\.\/resolver';/.test(SERVIDOR));
  /*
   * «¿Este texto del servidor se puede enseñar tal cual?» es UNA decisión, y vive con los textos del servidor:
   * `textoDelServidorLegible`. El error de Weë AI, el concepto de un movimiento de Credits y el mensaje de un error la
   * hacían cada uno con su copia; ahora la llaman.
   */
  check('4) y lo usa en las fechas del encargo y en el texto del servidor que se puede enseñar',
    /if \(fechas\) return idiomaDe\(ctx\.locale\) === 'es' \? valor : fechasEscritas\(/.test(SERVIDOR)
    && /export const textoDelServidorLegible = \(texto: string, ctx: Contexto\): string \| undefined => \{[\s\S]{0,200}return idiomaDe\(ctx\.locale\) === 'es' \? texto : undefined;/.test(SERVIDOR)
    && /return textoDelServidorLegible\(mensaje, ctx\);/.test(SERVIDOR));
  const CREATOR = leer('services/creatorService.ts');
  check('5) services/creatorService.ts (humanizeCreatorError) llama a esa decisión, no la copia',
    /import \{ textoDelServidorLegible \} from '\.\.\/i18n\/servidor';/.test(CREATOR)
    && /const legible = textoDelServidorLegible\(message, \{ t: t as Traductor, locale \}\);\s*\n\s*if \(legible !== undefined\) return legible;/.test(CREATOR));
  const RESULTADO = leer('utils/textoDeResultado.ts');
  check('6) utils/textoDeResultado.ts usa idiomaDe',
    /import \{ idiomaDe \} from '\.\.\/i18n\/resolver';/.test(RESULTADO) && /const enEspanol = \(locale: string\): boolean => idiomaDe\(locale\) === 'es';/.test(RESULTADO));
  /* La cartera tampoco pregunta en qué idioma está: le pide al módulo del servidor el texto que se puede enseñar. */
  const CARTERA = leer('screens/WalletScreen.tsx');
  check('7) screens/WalletScreen.tsx llama a esa decisión y no compara idiomas',
    /return textoDelServidorLegible\(view\.title, \{ t, locale \}\) \?\? t\(view\.tituloClave\);/.test(CARTERA)
    && !/(?:idioma|locale|idiomaDe\([^)]*\))\s*===\s*'es'/.test(CARTERA));
}

console.log('\n── C · Lo que se ve no cambió ──');
{
  const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
  const { crearTraductor } = (await cargar('i18n/traducir.ts')).ns;
  const servidor = (await cargar('i18n/servidor.ts')).ns;
  const RES = (await cargar('utils/textoDeResultado.ts')).ns;
  const tEs = crearTraductor('es-PE', DICCIONARIOS, { modoDesarrollo: false });
  const tDa = crearTraductor('da-DK', DICCIONARIOS, { modoDesarrollo: false });
  const tEn = crearTraductor('en-US', DICCIONARIOS, { modoDesarrollo: false });
  /* Un error del servidor que el catálogo no conoce: en español, tal cual; en otro idioma, nada (la pantalla pone su título). */
  const error = { message: 'Una frase nueva del servidor que nadie ha traducido todavía.' };
  check('8) un error sin reconocer: en español se enseña tal cual',
    servidor.mensajeDelServidor(error, { t: tEs, locale: 'es-PE' }) === error.message);
  check('9) y en danés o en inglés no se enseña en español',
    servidor.mensajeDelServidor(error, { t: tDa, locale: 'da-DK' }) === undefined && servidor.mensajeDelServidor(error, { t: tEn, locale: 'en-US' }) === undefined);
  /* La decisión, sola: lo reconocido se traduce; lo demás, tal cual en español o nada. */
  const legible = typeof servidor.textoDelServidorLegible === 'function' ? servidor.textoDelServidorLegible : () => '(no existe)';
  check('9) textoDelServidorLegible: lo reconocido, en el idioma de quien mira; lo demás, en español tal cual o nada',
    legible('Creando tu imagen…', { t: tDa, locale: 'da-DK' }) === tDa('progreso.creandoImagen')
    && tDa('progreso.creandoImagen') !== 'Creando tu imagen…'
    && legible(error.message, { t: tEs, locale: 'es-PE' }) === error.message
    && legible(error.message, { t: tEs, locale: 'es_MX' }) === error.message
    && legible(error.message, { t: tDa, locale: 'da-DK' }) === undefined,
    String(legible('Creando tu imagen…', { t: tDa, locale: 'da-DK' })));
  const guion = 'Escena 2 (3–6 s): un perro corre';
  check('10) un resultado en español se deja como lo escribió el modelo', RES.textoParaLeer(guion, tEs, 'es-PE') === guion);
  check('11) y en danés dice «Scene 2»', /^Scene 2/.test(RES.textoParaLeer(guion, tDa, 'da-DK')), RES.textoParaLeer(guion, tDa, 'da-DK'));
}

console.log('\n── D · La expresión no vuelve al cliente ──');
{
  /* Las maneras de deducir «español» de un locale a mano. */
  const PATRONES = [
    /\/\^es(?:\((?:\?:)?-\|\$\)|\[[-_]{1,2}\]|\\b|-)/, // /^es(-|$)/, /^es(?:-|$)/, /^es[-_]/, /^es\b/, /^es-/
    /\.startsWith\(\s*['"`]es(?:-|_)?['"`]\s*\)/,
    /\.(?:slice|substring|substr)\(\s*0\s*,\s*2\s*\)(?:\.toLowerCase\(\))?\s*===?\s*['"`]es['"`]/,
    /\.split\([^)]*\)\[0\](?:\.toLowerCase\(\))?\s*===?\s*['"`]es['"`]/,
  ];
  /*
   * LO QUE QUEDA, CON SU MOTIVO. La lista solo encoge: si uno de estos deja de tener la expresión, la prueba pide
   * quitarlo de aquí, para que no quede un hueco por el que vuelva.
   */
  const PENDIENTES = {
    /* Cinco suites (location, cercania, travel, composer-ubicacion-econtact, i18n-auditoria) cargan places.ts pegando sus
       imports a mano: un import nuevo exige tocar sus cinco cargadores. La regla es la misma; se migra en su propio cambio. */
    'data/places.ts': 'la séptima copia (`enEspanol` del catálogo de lugares): pendiente por el coste de sus cargadores de prueba',
  };
  const listar = (d) => fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [`${d}/${e.name}`] : []));
  const ARCHIVOS = ['App.tsx', ...['components', 'screens', 'services', 'utils', 'hooks', 'contexts', 'navigation', 'constants', 'data', 'i18n', 'config']
    .filter((d) => fs.existsSync(path.resolve(raiz, d))).flatMap(listar)];
  const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
  const conLaExpresion = ARCHIVOS.filter((a) => PATRONES.some((p) => p.test(sinComentarios(leer(a)))));
  const nuevos = conLaExpresion.filter((a) => !(a in PENDIENTES));
  check(`12) ningún archivo del cliente deduce «español» del locale a mano (${ARCHIVOS.length} archivos)`, nuevos.length === 0, nuevos.join(' · '));
  const resueltos = Object.keys(PENDIENTES).filter((a) => !conLaExpresion.includes(a));
  check('13) y los pendientes siguen pendientes (si uno ya usa idiomaDe, se quita de la lista)', resueltos.length === 0,
    resueltos.map((a) => `quitar ${a} de PENDIENTES`).join(' · '));
  /*
   * El espejo del Core de Filmmaker (`services/filmmaker/espejo/`) se GENERA desde `functions/src/core` y tiene su
   * propio `idiomaDe` sobre etiquetas del Core: no es una copia del de la app ni se edita a mano.
   */
  const GENERADO = /^\/\/ GENERADO por scripts\/espejo-filmmaker\.mjs/;
  const declaran = ARCHIVOS.filter((a) => !GENERADO.test(leer(a)) && /export const idiomaDe\b|function idiomaDe\b/.test(leer(a)));
  check('14) el ayudante no se copió: en la app, idiomaDe se declara una sola vez', declaran.join() === 'i18n/resolver.ts', declaran.join(' · '));
  /* CONTROL: la guarda ve las formas del fallo. */
  const CONTROLES = ["/^es(-|$)/.test(locale)", "/^es(-|$)/i.test(locale)", "locale.startsWith('es')", "locale.slice(0, 2) === 'es'", "locale.split('-')[0] === 'es'"];
  check('15) control: las cinco formas se detectan', CONTROLES.every((c) => PATRONES.some((p) => p.test(c))));
  check('16) control: y lo canónico no', !PATRONES.some((p) => p.test("idiomaDe(locale) === 'es'")) && !PATRONES.some((p) => p.test("idioma === 'es'")));
}

check('esta suite está en la cadena de `npm test`', /i18n-idioma-del-locale\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
