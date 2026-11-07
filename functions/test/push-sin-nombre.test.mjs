/*
 * UN PUSH SIN NOMBRE DE REMITENTE DICE UNA FRASE, NO «USER».
 *
 *   node test/push-sin-nombre.test.mjs
 *
 * Cuando quien provoca un aviso no tiene un nombre que enseñar, el servidor rellenaba `{{nombre}}` con
 * `avisos.alguien`. En filipino ese hueco cae detrás de «si»/«ni», que no admiten un sustantivo común, y el diccionario
 * ponía «User»: «Nagustuhan ni User ang post mo», y el push de un mensaje de WeeTalk llevaba «User» de título. Ahora
 * cada frase tiene su gemela `<clave>SinNombre` en el diccionario del servidor (`i18n/textos/<idioma>/servidor/
 * avisos.ts`), como la pantalla (`notifications.<clave>SinNombre`): en español, inglés y danés es la MISMA frase con
 * «Alguien» en el hueco —allí no cambia nada—, y en filipino otra, «May nag-like sa post mo».
 *
 * Se ejecuta el código de verdad (`functions/src/social/avisos.ts` y la tabla generada), en el idioma de quien recibe,
 * en todos los idiomas que ofrece la app.
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
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

/* El cargador de siempre: transpila y ejecuta los módulos de verdad, con sus imports relativos. */
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
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};

const { IDIOMAS } = (await cargar('i18n/idiomas.ts')).ns;
const { AVISOS } = (await cargar('functions/src/shared/textosDelServidor.ts')).ns;
const { rellenarTexto, tablaDelIdioma } = (await cargar('functions/src/shared/idiomaDelServidor.ts')).ns;
const avisos = (await cargar('functions/src/social/avisos.ts')).ns;

const TIPOS = ['like', 'comment', 'follow', 'econtact_request', 'econtact_accepted', 'mention', 'repost', 'reply', 'message'];
const CUERPOS = ['likeCuerpo', 'comentarioCuerpo', 'seguidorCuerpo', 'solicitudCuerpo', 'aceptadaCuerpo', 'mencionCuerpo', 'repostCuerpo', 'respuestaCuerpo', 'mensajeCuerpo'];
/* Los idiomas que la app ofrece, con sus variantes, y `tl-PH`, que es filipino para el teléfono. */
const LOCALES = [...IDIOMAS.filter((i) => i.listo).flatMap((i) => (i.variantes ? i.variantes.map((v) => v.locale) : [i.codigo])), 'tl-PH'];
check('0) se prueba en todos los idiomas que ofrece la app (y en tl-PH)', LOCALES.length >= 18 && LOCALES.includes('fil') && LOCALES.includes('es'), LOCALES.join(' '));

/* Lo que se le enseña a alguien con un push sin nombre: los avisos de todos los tipos y el de un mensaje. */
const lecturasSinNombre = (idioma) => [
  ...TIPOS.map((tipo) => [tipo, avisos.avisoPush(tipo, null, idioma)]),
  ['mensaje vacío', avisos.avisoDeMensaje(null, '', idioma)],
  ['mensaje con texto', avisos.avisoDeMensaje(null, 'Kumusta?', idioma)],
  ['mensaje con foto', avisos.avisoDeMensaje(null, '📷 Imagen', idioma)],
];
/* «User» como palabra suelta: el respaldo equivocado. «Isang user» (minúscula) no es un nombre, y no sale en el push. */
const conUser = (aviso) => /\bUser\b/.test(`${aviso?.title} ${aviso?.body}`);
const conHueco = (aviso) => /\{\{|\}\}/.test(`${aviso?.title} ${aviso?.body}`);

/* A · Ningún push sin nombre enseña «User», en ningún idioma, ni deja un hueco a la vista. */
const malUser = [];
const malHueco = [];
for (const idioma of LOCALES) {
  for (const [que, aviso] of lecturasSinNombre(idioma)) {
    if (!aviso || conUser(aviso)) malUser.push(`${idioma}:${que}`);
    if (conHueco(aviso)) malHueco.push(`${idioma}:${que}`);
  }
}
check('A) ningún push sin nombre enseña «User», en ningún idioma', malUser.length === 0, malUser.slice(0, 6).join(' '));
check('A) ni deja un {{hueco}} a la vista', malHueco.length === 0, malHueco.slice(0, 6).join(' '));
/* SABOTAJE: lo de antes —rellenar el hueco filipino con el «User» que ponía el diccionario— lo caza la misma regla. */
const antes = { title: AVISOS.fil.likeTitulo, body: rellenarTexto(AVISOS.fil.likeCuerpo, { nombre: 'User' }) };
check('A) SABOTAJE: «Nagustuhan ni User ang post mo», lo de antes, no pasaría', conUser(antes) && antes.body === 'Nagustuhan ni User ang post mo');

/* B · En filipino, frases sin «si»/«ni» delante de nadie; el título del mensaje no es un nombre inventado. */
const filSinNombre = lecturasSinNombre('fil');
const conParticula = filSinNombre.filter(([, a]) => /(^|\s)(si|ni)\s/i.test(`${a.title} ${a.body}`)).map(([q]) => q);
check('B) en filipino, ningún push sin nombre lleva «si»/«ni» (no van delante de un sustantivo común)', conParticula.length === 0, conParticula.join(' '));
check('B) en filipino, «May nag-like sa post mo» y «May nagpadala sa iyo ng mensahe»',
  avisos.avisoPush('like', null, 'fil').body === 'May nag-like sa post mo' && avisos.avisoPush('message', null, 'fil').body === 'May nagpadala sa iyo ng mensahe');
const vacio = avisos.avisoDeMensaje(null, '', 'fil');
check('B) el push de un mensaje sin nombre: «Bagong mensahe» de título y una frase con sujeto si no trae palabras',
  vacio.title === AVISOS.fil.mensajeTitulo && vacio.body === 'May nagpadala sa iyo ng mensahe');
check('B) con palabras, lo que escribió la persona tal cual; con una foto, la marca en filipino',
  avisos.avisoDeMensaje(null, 'Kumusta?', 'fil').body === 'Kumusta?' && avisos.avisoDeMensaje(null, '📷 Imagen', 'fil').body === AVISOS.fil.imagen);
const tl = lecturasSinNombre('tl-PH').map(([, a]) => JSON.stringify(a));
check('B) un teléfono en tl-PH lee lo mismo que en filipino', JSON.stringify(filSinNombre.map(([, a]) => JSON.stringify(a))) === JSON.stringify(tl));

/* C · En español, inglés y danés —y en los idiomas que caen en el inglés— no cambia nada: «Alguien» en el hueco. */
const cambian = [];
for (const idioma of LOCALES.filter((l) => !/^(fil|tl)(-|$)/.test(l))) {
  const tabla = tablaDelIdioma(AVISOS, idioma);
  TIPOS.forEach((tipo, i) => {
    const visto = avisos.avisoPush(tipo, null, idioma).body;
    if (visto !== rellenarTexto(tabla[CUERPOS[i]], { nombre: tabla.alguien })) cambian.push(`${idioma}:${tipo}`);
  });
  const m = avisos.avisoDeMensaje(null, '', idioma);
  if (m.title !== tabla.alguien || m.body !== tabla.teEnvioUnMensaje) cambian.push(`${idioma}:mensaje`);
}
check('C) en los demás idiomas, el push sin nombre es el de siempre, con «Alguien»/«Someone»/«Nogen»', cambian.length === 0, cambian.slice(0, 6).join(' '));
check('C) en español, «Alguien comentó en tu post» y el título «Alguien» de un mensaje',
  avisos.avisoPush('comment', null, 'es').body === 'Alguien comentó en tu post' && avisos.avisoDeMensaje(null, 'Hola', 'es').title === 'Alguien');
check('C) sin idioma, el español de siempre', avisos.avisoPush('comment', null).body === 'Alguien comentó en tu post');

/* D · Con nombre, nada cambia: el nombre va donde iba, en todos los idiomas. */
const conNombreMal = [];
for (const idioma of LOCALES) {
  const tabla = tablaDelIdioma(AVISOS, idioma);
  TIPOS.forEach((tipo, i) => {
    if (avisos.avisoPush(tipo, 'Ana', idioma).body !== rellenarTexto(tabla[CUERPOS[i]], { nombre: 'Ana' })) conNombreMal.push(`${idioma}:${tipo}`);
  });
  const m = avisos.avisoDeMensaje('Ana', '', idioma);
  if (m.title !== 'Ana' || m.body !== tabla.teEnvioUnMensaje) conNombreMal.push(`${idioma}:mensaje`);
}
check('D) con nombre, el push de siempre en todos los idiomas', conNombreMal.length === 0, conNombreMal.slice(0, 6).join(' '));

/* E · El diccionario: cada frase con nombre tiene su gemela; fuera del filipino, es la misma frase. */
const gemelas = [...CUERPOS, 'tituloDelMensaje', 'teEnvioUnMensaje'].map((k) => `${k}SinNombre`);
const faltan = Object.entries(AVISOS).flatMap(([c, t]) => gemelas.filter((k) => typeof t[k] !== 'string' || !t[k].trim()).map((k) => `${c}:${k}`));
check('E) cada idioma del servidor tiene las once frases sin nombre', faltan.length === 0, faltan.slice(0, 6).join(' '));
const distintas = ['es', 'en', 'da'].flatMap((c) => CUERPOS.filter((k) => AVISOS[c][`${k}SinNombre`] !== AVISOS[c][k]).map((k) => `${c}:${k}`));
check('E) en español, inglés y danés, cada <clave>SinNombre es la MISMA frase', distintas.length === 0, distintas.join(' '));
const filConHueco = gemelas.filter((k) => /\{\{\s*nombre\s*\}\}/.test(AVISOS.fil[k]));
check('E) en filipino, ninguna frase sin nombre lleva {{nombre}}', filConHueco.length === 0, filConHueco.join(' '));
check('E) y el respaldo filipino ya no es «User»', AVISOS.fil.alguien !== 'User' && !/\bUser\b/.test(AVISOS.fil.alguien), AVISOS.fil.alguien);

/* F · El servidor decide en el idioma de quien RECIBE, y nadie más pone un nombre de respaldo en el título. */
const indice = sinComentarios(leer('functions/src/index.ts'));
check('F) los dos push pasan el idioma de la cuenta que recibe',
  /avisoPush\(type, nombreVisible\(remitente\?\.data\(\)\), destino\.idioma\)/.test(indice)
    && /const idioma = destino\.idioma;/.test(indice) && /avisoDeMensaje\(senderName, content, idioma\)/.test(indice));
check('F) y ninguno usa el nombre de respaldo a pelo', !/nombreDeRespaldo/.test(indice));

check('esta suite está en la cadena de `npm test`', /push-sin-nombre\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
