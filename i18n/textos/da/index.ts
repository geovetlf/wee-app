/*
 * DANÉS — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los demás idiomas: un módulo es un archivo y una línea
 * aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave que
 * falte o sobre en danés no compila; y un módulo nuevo que se añada al español
 * no compila hasta que exista también aquí.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact,
 *     Credits, Weë AI, Weë Studio…—, que son marca y se escriben igual en todos
 *     los idiomas. En danés eso significa también no declinarlas: ni forma
 *     definida ni genitivo pegado a la marca; la frase lleva una preposición
 *     («på Weë», «i WeeTalk») o un compuesto con guion («din Weë-profil»);
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── LO QUE ES DEL DANÉS ─────────────────────────────────────────────────────
 *
 * 1 · SE TUTEA. «Du» en toda la app, y «vi» cuando Weë habla de lo que hace;
 *     nunca el «De» de cortesía ni «venligst». Mayúscula solo al principio.
 *
 * 2 · LAS PALABRAS COMPUESTAS VAN JUNTAS. «profilbillede», «brugernavn»,
 *     «e-mailadresse»: partirlas («profil billede») es el error más visible de
 *     una traducción al danés.
 *
 * 3 · EL PLURAL SÍ CAMBIA, Y EL `one` NO ES SOLO EL 1. `Intl.PluralRules('da')`
 *     tiene `one` y `other`: «1 kommentar», «3 kommentarer»; pero 0,5 y 1,5
 *     también son `one`, así que ningún `_one` escribe un «1» a mano.
 *
 * 4 · LAS LETRAS æ ø å SIEMPRE, ni noruego ni sueco, y las cifras como las
 *     escribe `Intl` («1.234,5», «40 %», «1. oktober 2026», «14.30»).
 *
 * La guía de estilo y el glosario están en `docs/I18N-DANES.md`, y lo que se
 * puede comprobar lo comprueba `functions/test/i18n-danes.test.mjs`.
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

export const da: FormaDelDiccionario = {
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
