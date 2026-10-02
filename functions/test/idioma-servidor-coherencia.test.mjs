/*
 * EL SERVIDOR DECIDE EL IDIOMA CON UNA SOLA REGLA — revisión post-auditoría 2026-10-01,
 * hallazgos server/sistemas-paralelos-idioma (INTRODUCIDO por la fase da-DK) y server/duplicacion/public/postPageHtml.ts.
 *
 *   node test/idioma-servidor-coherencia.test.mjs        (usa el compilado)
 *
 * Había tres maneras de decir «esto es una etiqueta de idioma»: la del Core (`normalizarEtiqueta`), la de Weë Brain
 * (`localeDeBrain`, misma forma) y la del servidor de la app (`etiquetaDeIdioma`, MÁS permisiva). Con una etiqueta
 * que solo aceptaba la tercera, el encargo pedía «español neutro» mientras el observador del idioma esperaba otra
 * cosa. Ahora `etiquetaDeIdioma` toma la forma del Core; esta suite comprueba que las tres CONTESTAN LO MISMO.
 *
 * Y `rellenarTexto` existe dos veces a propósito: la página pública (`public/postPageHtml.ts`) no importa NADA para
 * poder probarse sola (lo dice su cabecera). Duplicado deliberado = vigilado: las dos copias se comportan igual.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const lib = (p) => require(path.resolve(here, '../lib', p));
const ts = require(path.resolve(RAIZ, 'node_modules/typescript'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { etiquetaDeIdioma, rellenarTexto } = lib('shared/idiomaDelServidor.js');
const { localeDeBrain } = lib('creator/prompts.js');
const { normalizarEtiqueta } = lib('core/language.js');

console.log('\n── A · Una etiqueta de idioma es lo mismo para todo el servidor ──');
const MUESTRAS = ['da-DK', 'da-dk', 'es', 'pt-BR', 'zh-Hant-TW', 'zh-hant-tw', 'en-US', 'es-419', 'sr-Latn-RS', 'tr', 'hi-IN',
  // las que solo aceptaba la expresión vieja de `etiquetaDeIdioma`:
  'de-a', 'en-u-ca-gregory', 'x-klingon', 'da-DK-x-a-b-c', 'en-GB-oed-x',
  // basura:
  '', 'e', 'español', 'es_ES', 'da DK', '../x', 'a'.repeat(40), 'es-ES;q=0.9', null, 42];
{
  const desacuerdos = MUESTRAS.filter((m) => {
    const servidor = etiquetaDeIdioma(m);
    const core = normalizarEtiqueta(m);
    const brainAcepta = typeof m === 'string' && localeDeBrain(m) === m;
    return (servidor !== null) !== (core !== null) || (servidor !== null && servidor !== core) || (typeof m === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/.test(m.trim()) && m === m.trim() && (servidor !== null) !== brainAcepta);
  });
  check('1) el servidor de la app, el Core y Weë Brain aceptan exactamente las mismas etiquetas', desacuerdos.length === 0, desacuerdos.map(String).join(' | '));
  check('2) y las dejan en la misma forma canónica (da-dk → da-DK, zh-hant-tw → zh-Hant-TW)', etiquetaDeIdioma('da-dk') === 'da-DK' && etiquetaDeIdioma('zh-hant-tw') === 'zh-Hant-TW');
  check('3) CONTROL: lo que antes colaba por la expresión permisiva ya no cuela', ['de-a', 'en-u-ca-gregory', 'x-klingon'].every((m) => etiquetaDeIdioma(m) === null));
  const fuente = fs.readFileSync(path.resolve(RAIZ, 'functions/src/shared/idiomaDelServidor.ts'), 'utf8');
  check('4) `etiquetaDeIdioma` usa la regla del Core, no una expresión propia', /import \{ normalizarEtiqueta \} from '\.\.\/core\/language';/.test(fuente) && !/\^\[A-Za-z\]\{2,3\}/.test(fuente));
}

console.log('\n── B · Las dos copias de `rellenarTexto` hacen lo mismo ──');
{
  const html = fs.readFileSync(path.resolve(RAIZ, 'functions/src/public/postPageHtml.ts'), 'utf8');
  const m = html.match(/const rellenarTexto = \([\s\S]*?\n {2}texto\.replace\([\s\S]*?\);\n/);
  check('5) la página pública sigue sin importar nada (por eso tiene su copia)', !/^import /m.test(html) && !!m);
  const js = ts.transpileModule(`${m[0]}\nmodule.exports = rellenarTexto;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const deLaPagina = new Function('module', `${js}; return module.exports;`)({ exports: {} });
  const casos = [
    ['{{nombre}} en Weë', { nombre: 'Ana' }], ['{{ nombre }} y {{otro}}', { nombre: 'Bo' }], ['+{{contador}}', { contador: 3 }],
    ['sin huecos', {}], ['{{a}}{{a}}', { a: 0 }], ['{{x}}', { x: '' }], ['{{$}} {{a-b}}', { a: 1 }],
  ];
  const distintos = casos.filter(([t, v]) => rellenarTexto(t, v) !== deLaPagina(t, v));
  check('6) mismas entradas, mismo resultado (duplicado deliberado, sin deriva)', distintos.length === 0, JSON.stringify(distintos));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
