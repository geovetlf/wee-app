/*
 * HINDI — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los demás idiomas: un módulo es un archivo y una línea
 * aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave que
 * falte o sobre en hindi no compila; y un módulo nuevo que se añada al español
 * no compila hasta que exista también aquí.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact,
 *     Credits, Weë AI, Weë Studio…—, que son marca y se escriben igual en todos
 *     los idiomas. En hindi eso significa escribirlas en LATINO dentro de la
 *     frase, nunca transliteradas al devanagari («क्रेडिट्स», «वीटॉक» están
 *     mal), y con la posposición separada por un espacio: «Weë पर»,
 *     «WeeTalk में», «Credits बैलेंस»;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── LO QUE ES DEL HINDI ─────────────────────────────────────────────────────
 *
 * 1 · «आप» EN TODA LA APP. Botones en el imperativo de cortesía («सेव करें»,
 *     «रद्द करें»); nunca «तुम», «तू» ni imperativos en -ओ.
 *
 * 2 · EL CERO ES `one`. `Intl.PluralRules('hi')` pone el 0 y el 1 en `one`: por
 *     eso cada forma `_one` lleva `{{contador}}` y jamás un «1» o un «एक»
 *     escritos a mano, que con cero dirían una mentira.
 *
 * 3 · LA NUKTA, BIEN ESCRITA. «फ़ोटो», «ज़रूरी»: letra + U+093C, nunca las letras
 *     precompuestas (U+0958–U+095F), que NFC deshace. ड़ y ढ़ siempre llevan su
 *     punto; क ख ग, nunca. Chandrabindu donde la norma la pide («हाँ», «जाएँ»,
 *     «टिप्पणियाँ») y anusvara bajo una matra de arriba («में», «करें»).
 *
 * 4 · SIN GÉNERO. Weë no sabe el de nadie: imperativo, ergativo con «ने»,
 *     «क्या आपको … है?» o pasiva; nunca «सकता/सकती».
 *
 * 5 · CIFRAS LATINAS Y FORMATOS DE `Intl` («12,34,567», «₹1,500.00», «60%»,
 *     «30 सितंबर 2026»), y la frase acaba en «.», nunca en «।».
 *
 * La guía de estilo y el glosario están en `docs/I18N-HINDI.md`, y lo que se
 * puede comprobar lo comprueba `functions/test/i18n-hindi.test.mjs`.
 */
import { common } from './common';
import { nav } from './nav';
import { menu } from './menu';
import { creator } from './creator';
import { home } from './home';
import { wall } from './wall';
import { weels } from './weels';
import { composer } from './composer';
import { credits } from './credits';
import { econtact } from './econtact';
import { weetalk } from './weetalk';
import { notifications } from './notifications';
import { saved } from './saved';
import { weeai } from './weeai';
import { writer } from './writer';
import { settings } from './settings';
import { language } from './language';
import { catalogo } from './catalogo';
import { business } from './business';
import { projects } from './projects';
import { creaciones } from './creaciones';
import { studio } from './studio';
import { design } from './design';
import { chef } from './chef';
import { brain } from './brain';
import { auth } from './auth';
import { engine } from './engine';
import { communities } from './communities';
import { profile } from './profile';
import { avatar } from './avatar';
import { help } from './help';
import { search } from './search';
import { onboarding } from './onboarding';
import { aiAvatar } from './aiAvatar';
import { weebiz } from './weebiz';
import { moderation } from './moderation';
import { filmmaker } from './filmmaker';
import { FormaDelDiccionario } from '../es';

export const hi: FormaDelDiccionario = {
  common,
  help,
  search,
  weebiz,
  onboarding,
  aiAvatar,
  auth,
  engine,
  communities,
  profile,
  avatar,
  nav,
  menu,
  creator,
  home,
  wall,
  weels,
  composer,
  credits,
  econtact,
  weetalk,
  notifications,
  saved,
  weeai,
  writer,
  settings,
  language,
  catalogo,
  business,
  projects,
  creaciones,
  studio,
  design,
  chef,
  brain,
  moderation,
  filmmaker,
};
