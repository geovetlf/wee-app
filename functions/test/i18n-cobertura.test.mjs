/*
 * EL DETECTOR DE COBERTURA DE i18n — para TODOS los idiomas registrados, los de hoy y los que entren.
 *
 * `i18n.test.mjs` ya exige que cada diccionario tenga todas las claves del español (24), solo las formas de
 * plural de su idioma (24b, 24c) y el texto en NFC (24d). Lo que faltaba, y que ninguna prueba por idioma
 * vigilaba para todos a la vez, son los errores que no rompen el tipo y sí la pantalla:
 *
 *  · un HUECO cambiado: `{{nombre}}` escrito `{{name}}`, `{nombre}` o `{{ nombre }}` sale tal cual, y uno
 *    que falta pierde el dato («Has recibido  Credits»);
 *  · un texto VACÍO donde el español dice algo;
 *  · un ESPACIO DE BORDE perdido en las piezas que la pantalla concatena (`auth`, `onboarding`): «Iniciar
 *    sesión» + «con Google» se pegan en «Iniciar sesióncon Google»;
 *  · un EMOJI perdido o cambiado: son parte del diseño y se copian byte a byte;
 *  · y, como informe, cuántas frases de cada idioma son idénticas al inglés o al español donde esos dos
 *    difieren: el respaldo es clave a clave hacia el inglés, así que una frase sin traducir no rompe nada y
 *    NADIE la ve en una prueba. Para un idioma nuevo, la cifra la acota su propia suite.
 *
 * Se mira cada diccionario con las reglas de SU escritura: los idiomas que no separan palabras (japonés y
 * chino) no tienen espacios de borde que conservar. Un idioma nuevo queda vigilado sin tocar esta prueba.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts';
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const resultado = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, resultado);
  return resultado;
};

const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const plano = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => typeof v === 'object' && v !== null ? plano(v, pre + k + '.') : [[pre + k, v]]);
const es = Object.fromEntries(plano(DICCIONARIOS.es));
const en = Object.fromEntries(plano(DICCIONARIOS.en));
const unicos = new Map();
for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!unicos.has(d)) unicos.set(d, codigo);

/* Lo que se compara de cada frase. */
const huecos = (s) => [...String(s).matchAll(/\{\{([^{}]*)\}\}/g)].map((m) => m[1]).sort();
const huecosRaros = (s) => String(s).replace(/\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/g, '').match(/\{\{[^}]*\}?\}?|\{[A-Za-z_][A-Za-z0-9_]*\}/g) || [];
const EMOJI = /\p{Extended_Pictographic}/gu;
const emojis = (s) => (String(s).match(EMOJI) || []).sort().join('');
/* La referencia de una forma de plural que el español no tiene (_few, _many…) es su `_other`. */
const referencia = (k) => (k in es ? es[k] : es[k.replace(/_(zero|two|few|many)$/, '_other')]);
/* Escrituras sin espacios entre palabras: allí un espacio de borde no significa nada. */
const SIN_ESPACIOS = (codigo) => /^(ja|zh)/.test(codigo);

const idiomas = [...unicos.entries()].filter(([, c]) => c !== 'es');
const fallos = { huecos: [], raros: [], vacios: [], bordes: [], emojis: [] };
const informe = [];
for (const [d, codigo] of idiomas) {
  const suyo = plano(d);
  let igualEn = 0;
  let igualEs = 0;
  let comparables = 0;
  for (const [k, v] of suyo) {
    const ref = referencia(k);
    if (ref === undefined) continue; // una clave sobrante ya la caza i18n.test.mjs (24)
    /*
     * Un singular (`_one`) puede llevar los huecos de su plural en vez de los suyos: donde el español escribe
     * un «1» a mano («1 {{lista}}»), un idioma cuyo `one` cubre más que el 1 (el 0 en francés, el 1,5 en danés;
     * en japonés o chino `_one` ni se lee y debe ser igual a `_other`) TIENE que escribir `{{contador}}`.
     */
    const plural = k.endsWith('_one') ? es[k.replace(/_one$/, '_other')] : undefined;
    const huecosBien = JSON.stringify(huecos(v)) === JSON.stringify(huecos(ref)) || (plural !== undefined && JSON.stringify(huecos(v)) === JSON.stringify(huecos(plural)));
    if (!huecosBien) fallos.huecos.push(`${codigo} ${k}: {{${huecos(v).join(',')}}} ≠ {{${huecos(ref).join(',')}}}`);
    const raros = huecosRaros(v).filter((r) => !huecosRaros(ref).includes(r));
    if (raros.length) fallos.raros.push(`${codigo} ${k}: ${raros.join(' ')}`);
    if (String(ref).trim() && !String(v).trim()) fallos.vacios.push(`${codigo} ${k}`);
    if (!SIN_ESPACIOS(codigo) && (/^\s/.test(ref) !== /^\s/.test(v) || /\s$/.test(ref) !== /\s$/.test(v))) fallos.bordes.push(`${codigo} ${k}: «${v}»`);
    if (emojis(v) !== emojis(ref)) fallos.emojis.push(`${codigo} ${k}: ${emojis(v) || '∅'} ≠ ${emojis(ref) || '∅'}`);
    if (k in es && k in en && es[k] !== en[k] && /\p{L}{3}/u.test(es[k])) {
      comparables++;
      if (codigo !== 'en' && v === en[k]) igualEn++;
      if (v === es[k]) igualEs++;
    }
  }
  informe.push(`${codigo}: ${igualEn} iguales al inglés y ${igualEs} al español de ${comparables} que difieren entre los dos`);
}

const muestra = (xs) => `${xs.length}${xs.length ? `: ${xs.slice(0, process.env.TODOS ? 999 : 4).join(' | ')}${xs.length > 4 ? ' …' : ''}` : ''}`;
check(`1) en los ${idiomas.length} idiomas, cada frase lleva EXACTAMENTE los huecos del español (un singular puede llevar los de su plural)`, fallos.huecos.length === 0, muestra(fallos.huecos));
check('2) y ningún hueco mal escrito ({nombre}, {{ nombre }}, {{nombre}) que saldría tal cual en pantalla', fallos.raros.length === 0, muestra(fallos.raros));
check('3) ninguna frase vacía donde el español dice algo', fallos.vacios.length === 0, muestra(fallos.vacios));
check('4) los espacios de borde de las piezas que se concatenan se conservan (idiomas con espacios)', fallos.bordes.length === 0, muestra(fallos.bordes));
check('5) los emojis, los mismos que en el español', fallos.emojis.length === 0, muestra(fallos.emojis));
console.log(`\n   Informe (no falla): frases idénticas al inglés o al español donde esos dos difieren —\n   ${informe.join('\n   ')}`);

/* Control: el detector caza lo que dice cazar. */
const prueba = (v, ref) => ({
  huecos: JSON.stringify(huecos(v)) !== JSON.stringify(huecos(ref)),
  raros: huecosRaros(v).some((r) => !huecosRaros(ref).includes(r)),
  bordes: /^\s/.test(ref) !== /^\s/.test(v) || /\s$/.test(ref) !== /\s$/.test(v),
  emojis: emojis(v) !== emojis(ref),
});
check('6) control: caza un hueco renombrado, uno perdido, uno de una llave, un espacio de borde perdido y un emoji perdido',
  prueba('Hej {{name}}', 'Hola {{nombre}}').huecos && prueba('Du har fået Credits', 'Has recibido {{n}} Credits').huecos
  && prueba('Hej {nombre}', 'Hola {{nombre}}').raros && prueba('med Google', ' con Google').bordes && prueba('Klar', 'Listo 🎉').emojis
  && !prueba('Hej {{nombre}} 🎉', 'Hola {{nombre}} 🎉').huecos && !prueba(' med Google', ' con Google').bordes);

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
