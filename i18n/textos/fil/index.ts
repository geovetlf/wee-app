/*
 * FILIPINO (fil-PH) — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los demás idiomas: un módulo es un archivo y una línea
 * aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave que
 * falte o sobre en filipino no compila.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact,
 *     Credits, Weë AI, Weë Studio…—, que son marca y se escriben igual en todos
 *     los idiomas. En filipino eso significa también no pegarles afijos ni el
 *     enlace: ni «i-Weë» ni «Weëng»; la marca va con su marcador de cosa
 *     («sa Weë», «ng Weë Studio», «ang Weë AI»), nunca con «si/ni»;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── LO QUE ES DEL FILIPINO ──────────────────────────────────────────────────
 *
 * 1 · «KA / MO / IKAW / IYO», Y NUNCA «PO». La voz de las apps que la gente usa
 *     (Android, Facebook, YouTube); ni «kayo/ninyo» ni «po/opo».
 *
 * 2 · NI TAGLISH IMPROVISADO NI FILIPINO DE DICCIONARIO. Una palabra por
 *     concepto, la del glosario: «Ibahagi», «komento», «larawan», pero
 *     «I-save», «I-delete», «post», «app». El préstamo lleva guion tras el
 *     afijo filipino («I-save», «Na-upload»).
 *
 * 3 · EL PLURAL ESTÁ EN EL ENLACE DEL NÚMERO, NO EN EL SUSTANTIVO.
 *     `Intl.PluralRules('fil')` da `other` a lo que acaba en 4, 6 o 9 (apat,
 *     anim, siyam: acaban en consonante y piden «na»): «3 komento», «4 na
 *     komento». Ningún `_one` escribe «1» ni «isang»; nunca «mga» junto a la cifra.
 *
 * 4 · «ng/nang» y «din/rin» según la KWF, y las cifras como las escribe `Intl`
 *     («Oktubre 1, 2026», «2:30 PM», «₱1,234.50»).
 *
 * La guía de estilo y el glosario están en `docs/I18N-FILIPINO.md`, y lo que se
 * puede comprobar lo comprueba `functions/test/i18n-filipino.test.mjs`.
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
import { pages } from './pages';
import { boost } from './boost';
import { weeai } from './weeai';
import { writer } from './writer';
import { settings } from './settings';
import { language } from './language';
import { catalogo } from './catalogo';
import { business } from './business';
import { projects } from './projects';
import { profesional } from './profesional';
import { fashion } from './fashion';
import { music } from './music';
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
import { moderation } from './moderation';
import { filmmaker } from './filmmaker';
import { travel } from './travel';
import { FormaDelDiccionario } from '../es';

export const fil: FormaDelDiccionario = {
  common,
  help,
  search,
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
  pages,
  boost,
  weeai,
  writer,
  settings,
  language,
  catalogo,
  business,
  projects,
  profesional,
  fashion,
  music,
  creaciones,
  studio,
  design,
  chef,
  brain,
  moderation,
  filmmaker,
  travel,
};
