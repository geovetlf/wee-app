/*
 * SUECO — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los demás idiomas: un módulo es un archivo y una línea
 * aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave que
 * falte o sobre en sueco no compila; y un módulo nuevo que se añada al español
 * no compila hasta que exista también aquí.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact,
 *     Credits, Weë AI, Weë Studio…—, que son marca y se escriben igual en todos
 *     los idiomas. En sueco eso significa también no declinarlas: ni forma
 *     definida ni genitivo pegado a la marca; la frase lleva una preposición
 *     («på Weë», «i WeeTalk») o un compuesto con guion, según la guía;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── LO QUE ES DEL SUECO ─────────────────────────────────────────────────────
 *
 * 1 · SE TUTEA. «Du» en toda la app, como toda la interfaz sueca desde la
 *     reforma del «du». Mayúscula solo al principio de la frase.
 *
 * 2 · LAS PALABRAS COMPUESTAS VAN JUNTAS. «profilbild», «användarnamn»,
 *     «e-postadress»: partirlas («profil bild») es el error más visible de una
 *     traducción al sueco.
 *
 * 3 · EL PLURAL SÍ CAMBIA. `Intl.PluralRules('sv')` tiene `one` y `other`, y el
 *     sustantivo cambia con la cifra: «1 kommentar», «3 kommentarer».
 *
 * 4 · LAS LETRAS å ä ö SIEMPRE, y las cifras como las escribe `Intl`
 *     («1 234,5», «40 %», «30 september 2026»).
 *
 * La guía de estilo y el glosario están en `docs/I18N-SUECO.md`, y lo que se
 * puede comprobar lo comprueba `functions/test/i18n-sueco.test.mjs`.
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

export const sv: FormaDelDiccionario = {
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
