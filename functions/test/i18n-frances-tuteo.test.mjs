/*
 * EL FRANCÉS DE WEË TUTEA. EN TODA LA EXPERIENCIA.
 *
 *   node test/i18n-frances-tuteo.test.mjs
 *
 * Decisión del dueño (2026-11-05): Weë habla a cada persona de «tu» en francés —la compra de Credits, Boost, Studio,
 * WeeTalk, los ajustes, los errores y los textos del servidor—, como ya hacía casi todo el diccionario. La compra de
 * Credits era la excepción («Combien de Credits voulez-vous ?», «votre solde») y se corrigió; esta prueba evita que
 * vuelva a colarse un «vous» de cortesía por la puerta de una clave nueva.
 *
 * Lee el diccionario `fr` REAL —el registrado en `i18n/diccionarios.ts`, con `servidor/` dentro— y busca en cada
 * texto lo que delata el tratamiento formal dirigido a quien usa la app:
 *   · «vous», «votre», «vos» (también «-vous» pegado a un verbo: «voulez-vous», «connectez-vous»);
 *   · palabras acabadas en «-ez», que en un texto de interfaz son el imperativo o el presente de «vous»
 *     («Réessayez», «Choisissez», «Vous avez…»).
 *
 * LISTA BLANCA — cada entrada con su motivo, y la prueba exige que el texto siga siendo exactamente ese: si alguien lo
 * cambia, la excepción deja de cubrirlo y hay que volver a mirarlo.
 *   · Palabras en «-ez» que no son verbos: «assez», «chez», «nez», «rez».
 *   · «rendez-vous» es un sustantivo (una cita), no un tratamiento: se ignora como locución entera.
 *   · `nav.brandSlogan` = «Imaginez · Créez · Connectez»: EXCEPCIÓN EXPLÍCITA. Las cuatro palabras del eslogan
 *     francés las FIJÓ el dueño (docs/ESLOGAN.md, `eslogan-localizado.test.mjs`); es un lema de marca dirigido a
 *     todo el mundo, no una instrucción a una persona, y no se tutea.
 *   · `social.ecYaSonContactos` = «Vous êtes déjà ËContacts.»: «vous» PLURAL (tú y la otra persona), como el
 *     «Ya sois ËContacts» del español. Al tutear en francés el plural sigue siendo «vous»; no es cortesía.
 */
import { cargarDiccionarios, aplanar } from '../../scripts/i18n-lib.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── El detector ─────────────────────────────────────────────────────────────────────────────────────────── */
const NO_VERBOS_EN_EZ = new Set(['assez', 'chez', 'nez', 'rez']);
const LOCUCIONES = [/rendez-vous/giu];
const EXCEPCIONES = {
  'nav.brandSlogan': {
    valor: 'Imaginez · Créez · Connectez',
    motivo: 'eslogan fijado por el dueño: lema de marca, no tratamiento (docs/ESLOGAN.md)',
  },
  'social.ecYaSonContactos': {
    valor: 'Vous êtes déjà ËContacts.',
    motivo: '«vous» plural (tú y la otra persona), como el «Ya sois» del español',
  },
};

const formales = (texto) => {
  let t = String(texto);
  for (const re of LOCUCIONES) t = t.replace(re, ' ');
  const hallados = [];
  for (const m of t.matchAll(/(?<!\p{L})(vous|votre|vos)(?!\p{L})/giu)) hallados.push(m[1]);
  for (const m of t.matchAll(/(?<!\p{L})(\p{L}+ez)(?!\p{L})/giu)) if (!NO_VERBOS_EN_EZ.has(m[1].toLowerCase())) hallados.push(m[1]);
  return hallados;
};

/* ── A · El detector ve lo que tiene que ver (y nada más) ────────────────────────────────────────────────── */
console.log('\n── A · El detector ──');
for (const frase of ['Combien de Credits voulez-vous ?', 'Rien n’a été débité et votre solde reste inchangé.', 'Réessayez plus tard.',
  'Choisissez vos photos', 'Vous avez reçu un message', 'Connectez-vous pour continuer']) {
  check(`A) detecta el tratamiento formal en «${frase}»`, formales(frase).length > 0, formales(frase).join(', '));
}
for (const frase of ['Tu n’as pas assez de Credits', 'Avec ce que tu as déjà chez toi.', '💘 Un rendez-vous', 'Rendez-vous',
  'Combien de Credits veux-tu ?', 'Réessaie.', 'Choisis tes photos', 'Nous construisons Weë AI']) {
  check(`A) no confunde «${frase}» con cortesía`, formales(frase).length === 0, formales(frase).join(', '));
}

/* ── B · El diccionario francés real, clave a clave ──────────────────────────────────────────────────────── */
console.log('\n── B · El diccionario fr (app + servidor) ──');
const { DICCIONARIOS } = await cargarDiccionarios();
const pares = aplanar(DICCIONARIOS.fr);
check('B) el diccionario francés se cargó entero (app + servidor)', pares.length > 4000, `${pares.length} textos`);
const fallos = pares
  .filter(([k]) => !EXCEPCIONES[k])
  .map(([k, v]) => [k, v, formales(v)])
  .filter(([, , f]) => f.length);
check('B) ningún texto francés trata de «vous» a quien usa Weë', fallos.length === 0,
  fallos.map(([k, v, f]) => `${k} [${f.join(', ')}] «${v}»`).join(' | '));

/* ── C · Las excepciones siguen siendo exactamente lo que se aprobó ──────────────────────────────────────── */
console.log('\n── C · Excepciones ──');
const FR = Object.fromEntries(pares);
for (const [k, { valor, motivo }] of Object.entries(EXCEPCIONES)) {
  check(`C) excepción ${k} sigue siendo «${valor}» (${motivo})`, FR[k] === valor, `hoy: «${FR[k]}»`);
}
check('C) el eslogan francés sigue registrado tal cual en docs/ESLOGAN.md', leer('docs/ESLOGAN.md').includes('Imaginez · Créez · Connectez'));

/* ── D · Las correcciones del 2026-11-05 siguen puestas ──────────────────────────────────────────────────── */
console.log('\n── D · Correcciones ──');
const CORREGIDAS = {
  'credits.buyTitle': 'Combien de Credits veux-tu ?',
  'credits.buyNoticeBody': 'Rien n’a été débité et ton solde reste inchangé.',
  'weetalk.conversationStart': 'C’est le début de ta conversation privée',
};
for (const [k, v] of Object.entries(CORREGIDAS)) check(`D) ${k} = «${v}»`, FR[k] === v, `hoy: «${FR[k]}»`);

/* ── E · Esta suite está en la cadena ────────────────────────────────────────────────────────────────────── */
check('E) esta suite está en la cadena de `npm test`', /i18n-frances-tuteo\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
