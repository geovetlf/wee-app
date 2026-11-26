/**
 * EL ESLOGAN DE WEË SE LOCALIZA (decisión del dueño, 2026-11-04).
 *
 * Sustituye a la decisión anterior —el lema igual en todos los idiomas—. Ahora el eslogan dice lo mismo en la lengua
 * que la persona eligió: tres imperativos de marca (IMAGINAR · CREAR · CONECTAR) separados por « · », y «Weë», que es
 * marca, no se traduce nunca. Vive en UNA clave, `nav.brandSlogan`, y de ella beben la firma del Home
 * (`components/Header.tsx`) y el título de la pestaña (`nav.documentTitle`, por interpolación en `App.tsx`).
 *
 * Lo que vigila esta suite:
 *   A · cada idioma activo tiene el eslogan, no vacío, en tres partes con « · » exacto, y sin «Weë» traducido;
 *   B · los cuatro ejemplos que fijó el dueño, letra por letra;
 *   C · ningún idioma lleva el eslogan de otro por error;
 *   D · el título de la pestaña lleva el eslogan en todos los idiomas, por interpolación;
 *   E · el encabezado lo pide con t() y no queda ninguno escrito a mano;
 *   F · la frase de Weë Brain (`brain.slogan`) sigue aparte y sin tocar;
 *   G · controles: la suite falla si falta un idioma o si el formato se rompe.
 *
 *   node test/eslogan-localizado.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarDiccionarios, diccionariosUnicos } from '../../scripts/i18n-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '..', '..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

let fallos = 0;
let pasan = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pasan++; console.log(`  ✔ ${name}`); } else { fallos++; console.log(`  ✘ ${name}${extra ? ` — ${extra}` : ''}`); }
};

const { DICCIONARIOS } = await cargarDiccionarios();
/* Los idiomas activos: una carpeta en i18n/textos y su registro en DICCIONARIOS. */
const CARPETAS = fs.readdirSync(path.join(RAIZ, 'i18n/textos'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const UNICOS = diccionariosUnicos(DICCIONARIOS);

const SEPARADOR = ' · '; // U+0020 U+00B7 U+0020
/** Lo que se le pide a un eslogan; devuelve el problema o null. */
const problemaDelEslogan = (v) => {
  if (typeof v !== 'string' || !v.trim()) return 'vacío o ausente';
  if (v !== v.trim()) return 'espacios sobrantes en los extremos';
  if (/Weë|Wee|WEE|WEË/u.test(v)) return 'no lleva la marca dentro';
  if (/[·•∙⋅]/u.test(v.split(SEPARADOR).join(''))) return 'separador mal escrito';
  if (/[   ]/u.test(v)) return 'espacio no normal junto al separador';
  const partes = v.split(SEPARADOR);
  if (partes.length !== 3) return `${partes.length} partes, no 3`;
  if (partes.some((p) => !p || p !== p.trim())) return 'una parte vacía o con espacios';
  if (/[.!?¡¿。！？]$/u.test(v)) return 'sin punto final';
  return null;
};
/** Los idiomas que deberían estar y no están, o que no cumplen. */
const revisar = (carpetas, dics) => carpetas.flatMap((c) => {
  const d = dics[c];
  if (!d) return [`${c}: sin diccionario registrado`];
  const p = problemaDelEslogan(d.nav && d.nav.brandSlogan);
  return p ? [`${c}: ${p}`] : [];
});

console.log('\n── A · Cada idioma activo tiene su eslogan ──');
{
  check('1) hay 42 idiomas con carpeta en i18n/textos', CARPETAS.length === 42, `${CARPETAS.length}: ${CARPETAS.join(' ')}`);
  check('2) cada carpeta está registrada en DICCIONARIOS', CARPETAS.every((c) => DICCIONARIOS[c]), CARPETAS.filter((c) => !DICCIONARIOS[c]).join(' '));
  const malos = revisar(CARPETAS, DICCIONARIOS);
  check('3) todos: no vacío, tres partes, « · » exacto, sin «Weë» dentro', malos.length === 0, malos.join(' | '));
  const sinClave = UNICOS.filter(([, d]) => !(d.nav && typeof d.nav.brandSlogan === 'string'));
  check('4) ningún diccionario registrado (alias incluidos) se queda sin la clave', sinClave.length === 0, sinClave.map(([c]) => c).join(' '));
  /* Cada carpeta, leída como archivo: la clave está escrita en su nav.ts y no llega por respaldo de otro idioma. */
  const sinEscribir = CARPETAS.filter((c) => !/\n  brandSlogan: '[^']+',\n/.test(leer(`i18n/textos/${c}/nav.ts`)));
  check('5) la clave está escrita en el nav.ts de cada idioma, no heredada', sinEscribir.length === 0, sinEscribir.join(' '));
}

console.log('\n── B · Los cuatro ejemplos del dueño ──');
{
  const FIJOS = { en: 'Imagine · Create · Connect', es: 'Imagina · Crea · Conecta', fr: 'Imaginez · Créez · Connectez', it: 'Immagina · Crea · Connetti' };
  for (const [c, s] of Object.entries(FIJOS)) {
    check(`6) ${c}: «${s}», exacto`, DICCIONARIOS[c]?.nav?.brandSlogan === s, DICCIONARIOS[c]?.nav?.brandSlogan);
  }
}

console.log('\n── C · Ningún idioma lleva el eslogan de otro ──');
{
  /*
   * Dos idiomas con el mismo eslogan casi siempre es una copia por error (un sueco con el inglés). Solo se acepta un
   * GRUPO exacto de esta lista, con su motivo: si se cuela otro idioma en el grupo, o falta uno, la suite falla.
   */
  const IGUALES_A_PROPOSITO = [
    /* Las normas serbocroatas en alfabeto latino dicen estas tres palabras igual (sr-Latn es la transliteración de sr). */
    ['bs', 'cnr', 'hr', 'sr-Latn'],
    /* El alemán escrito de Suiza no difiere del estándar en estas tres palabras (no llevan ß). */
    ['de', 'de-CH'],
  ].map((g) => g.join('='));
  const porTexto = new Map();
  for (const c of CARPETAS) {
    const s = DICCIONARIOS[c].nav.brandSlogan;
    porTexto.set(s, [...(porTexto.get(s) || []), c]);
  }
  const repetidos = [...porTexto.entries()].filter(([, cs]) => cs.length > 1 && !IGUALES_A_PROPOSITO.includes([...cs].sort().join('=')));
  check('7) los 42 eslóganes son distintos entre sí, salvo las coincidencias reales declaradas', repetidos.length === 0, repetidos.map(([s, cs]) => `${cs.join('=')}: «${s}»`).join(' | '));
  check('7b) CONTROL: un idioma colado en un grupo declarado no pasa', !IGUALES_A_PROPOSITO.includes(['de', 'de-CH', 'nb'].sort().join('=')));
  const comoIngles = CARPETAS.filter((c) => c !== 'en' && DICCIONARIOS[c].nav.brandSlogan === DICCIONARIOS.en.nav.brandSlogan);
  check('8) ninguno se quedó en inglés', comoIngles.length === 0, comoIngles.join(' '));
  const comoEspanol = CARPETAS.filter((c) => c !== 'es' && DICCIONARIOS[c].nav.brandSlogan === DICCIONARIOS.es.nav.brandSlogan);
  check('9) ninguno se quedó en español', comoEspanol.length === 0, comoEspanol.join(' '));
  /* La escritura que toca: el que no es latino no puede venir en latino. */
  const ESCRITURA = {
    ru: /\p{Script=Cyrillic}/u, sr: /\p{Script=Cyrillic}/u, mn: /\p{Script=Cyrillic}/u, el: /\p{Script=Greek}/u,
    ar: /\p{Script=Arabic}/u, fa: /\p{Script=Arabic}/u, he: /\p{Script=Hebrew}/u, hi: /\p{Script=Devanagari}/u, km: /\p{Script=Khmer}/u,
    ja: /\p{Script=Han}|\p{Script=Hiragana}/u, ko: /\p{Script=Hangul}/u, zh: /\p{Script=Han}/u, 'zh-TW': /\p{Script=Han}/u,
  };
  const malaEscritura = Object.entries(ESCRITURA).filter(([c, re]) => !DICCIONARIOS[c].nav.brandSlogan.split(SEPARADOR).every((p) => re.test(p)) || /[A-Za-z]/.test(DICCIONARIOS[c].nav.brandSlogan));
  check('10) cirílico, griego, árabe, hebreo, devanagari, jemer, japonés, coreano y chino en su propia escritura, sin letras latinas', malaEscritura.length === 0, malaEscritura.map(([c]) => c).join(' '));
  /* El groenlandés (kalaallisut) es su propia lengua: nunca el danés ni el noruego; el islandés tampoco. */
  const nordicos = ['da', 'nb', 'sv'].map((c) => DICCIONARIOS[c].nav.brandSlogan);
  check('10b) kl en kalaallisut e is en islandés, nunca el eslogan danés, noruego o sueco',
    !nordicos.includes(DICCIONARIOS.kl.nav.brandSlogan) && !nordicos.includes(DICCIONARIOS.is.nav.brandSlogan)
    && !/(^|\s)(Drøm|Skab|Skap|Forbind)(\s|$)/u.test(DICCIONARIOS.kl.nav.brandSlogan));
  /* Chino simplificado y tradicional no se cruzan: 创/連 delatan la mezcla. */
  check('11) zh simplificado y zh-TW tradicional, sin cruzarse',
    /创/.test(DICCIONARIOS.zh.nav.brandSlogan) && !/[創連]/.test(DICCIONARIOS.zh.nav.brandSlogan)
    && /創/.test(DICCIONARIOS['zh-TW'].nav.brandSlogan) && !/[创连]/.test(DICCIONARIOS['zh-TW'].nav.brandSlogan));
  /* El portugués oficial es el brasileño (você): «Crie», no el «Cria» del europeo. */
  check('12) pt brasileño (Crie) y pt-PT europeo (Cria), cada uno el suyo',
    /\bCrie\b/u.test(DICCIONARIOS.pt.nav.brandSlogan) && /\bCria\b/u.test(DICCIONARIOS['pt-PT'].nav.brandSlogan));
}

console.log('\n── D · El título de la pestaña lleva el eslogan ──');
{
  const malos = CARPETAS.filter((c) => !/^Weë [-–] \{\{eslogan\}\}$/u.test(DICCIONARIOS[c].nav.documentTitle));
  check('13) en los 42 idiomas: «Weë - {{eslogan}}» (raya media donde el idioma ya la usaba)', malos.length === 0, malos.map((c) => `${c}: ${DICCIONARIOS[c].nav.documentTitle}`).join(' | '));
  check('14) ningún título conserva el lema viejo', !CARPETAS.some((c) => /futur|Fremtid|Framtid|Zukunft|Gelecek|будущего|भविष्य|未来|未來|미래/u.test(DICCIONARIOS[c].nav.documentTitle)));
  const app = leer('App.tsx');
  check('15) App.tsx lo compone por interpolación, con el mismo traductor',
    /t\('nav\.documentTitle', \{ eslogan: t\('nav\.brandSlogan'\) \}\)/.test(app));
  check('16) y no pega cadenas para hacerlo', !/['"]Weë - ['"]\s*\+|\+\s*t\('nav\.brandSlogan'\)|`Weë - \$\{/.test(app));
  check('17) el título se recalcula al cambiar de idioma, no solo al navegar',
    /const TituloAlCambiarDeIdioma[\s\S]{0,600}document\.title = documentTitle\.formatter\(refNavegacion\.getCurrentOptions\(\)/.test(app)
    && /\}, \[t\]\);/.test(app) && /<TituloAlCambiarDeIdioma \/>/.test(app));
  /* Resuelto como lo hace el traductor: «Weë», el guion del idioma y su eslogan. */
  const resuelto = (c) => DICCIONARIOS[c].nav.documentTitle.replace('{{eslogan}}', DICCIONARIOS[c].nav.brandSlogan);
  check('18) resuelto en español: «Weë - Imagina · Crea · Conecta»', resuelto('es') === 'Weë - Imagina · Crea · Conecta', resuelto('es'));
  check('19) resuelto en japonés empieza por «Weë» en latino', resuelto('ja').startsWith('Weë - ') && /[぀-ヿ一-鿿]/u.test(resuelto('ja')));
}

console.log('\n── E · El encabezado lo traduce ──');
{
  const cabecera = leer('components/Header.tsx');
  check('20) Header.tsx pinta {t(\'nav.brandSlogan\')}', /\{t\('nav\.brandSlogan'\)\}/.test(cabecera));
  const ESLOGANES = CARPETAS.map((c) => DICCIONARIOS[c].nav.brandSlogan);
  const aMano = ESLOGANES.filter((s) => cabecera.includes(s));
  check('21) ningún eslogan escrito a mano en Header.tsx', aMano.length === 0 && !/LEMA_DE_MARCA/.test(cabecera), aMano.join(' | '));
  /* Ni en otro sitio del cliente: ni el lema nuevo ni el viejo fuera de los diccionarios. */
  const fuentes = ['App.tsx', 'components/Header.tsx', 'components/Sidebar.tsx', 'screens/WebLandingScreen.tsx', 'screens/LandingScreen.tsx'];
  const sueltos = fuentes.filter((f) => fs.existsSync(path.join(RAIZ, f)) && /Imagina · Crea · Conecta|Imagine · Create · Connect|comunidad del futuro/.test(leer(f)));
  check('22) ni en App, Sidebar ni las portadas', sueltos.length === 0, sueltos.join(' '));
}

console.log('\n── F · La frase de Weë Brain va aparte ──');
{
  check('23) brain.slogan en español sigue siendo «Imagina · Consulta · Crea · Conecta»', DICCIONARIOS.es.brain.slogan === 'Imagina · Consulta · Crea · Conecta');
  check('24) brain.slogan en inglés sigue siendo «Imagine · Ask · Create · Connect»', DICCIONARIOS.en.brain.slogan === 'Imagine · Ask · Create · Connect');
  const iguales = CARPETAS.filter((c) => DICCIONARIOS[c].brain.slogan === DICCIONARIOS[c].nav.brandSlogan);
  check('25) en ningún idioma el eslogan de Weë pisa la frase de Weë Brain', iguales.length === 0, iguales.join(' '));
  const cuatro = CARPETAS.filter((c) => DICCIONARIOS[c].brain.slogan.split(SEPARADOR).length !== 4);
  check('26) la frase de Weë Brain conserva sus cuatro partes en los 42', cuatro.length === 0, cuatro.join(' '));
}

console.log('\n── G · Controles ──');
{
  /* Si un idioma activo se queda sin diccionario, la revisión lo dice. */
  const sinUno = { ...DICCIONARIOS };
  delete sinUno.sv;
  check('27) CONTROL: falta un idioma → la suite lo detecta', revisar(CARPETAS, sinUno).some((m) => m.startsWith('sv:')));
  const sinClave = { ...DICCIONARIOS, ko: { ...DICCIONARIOS.ko, nav: { ...DICCIONARIOS.ko.nav, brandSlogan: undefined } } };
  check('28) CONTROL: falta la clave en un idioma → la suite lo detecta', revisar(CARPETAS, sinClave).some((m) => m.startsWith('ko:')));
  const MALOS = ['Imagina · Crea', 'Imagina·Crea·Conecta', 'Imagina - Crea - Conecta', 'Imagina · Crea · Conecta', 'Weë · Crea · Conecta', 'Imagina · Crea · Conecta.', '', ' Imagina · Crea · Conecta'];
  const dejados = MALOS.filter((m) => problemaDelEslogan(m) === null);
  check('29) CONTROL: el formato roto no pasa', dejados.length === 0, dejados.map((m) => JSON.stringify(m)).join(' '));
  check('30) CONTROL: lo bien escrito sí pasa', ['Imagina · Crea · Conecta', 'Hayal et · Yarat · Bağlan', '상상 · 창작 · 연결'].every((m) => problemaDelEslogan(m) === null));
}

console.log(`\n${fallos === 0 ? '✔ todo bien' : `✘ ${fallos} fallo(s)`} — ${pasan} comprobaciones`);
process.exit(fallos === 0 ? 0 : 1);
