/*
 * RUSO — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los seis idiomas anteriores: un módulo es un archivo y una
 * línea aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave
 * que falte en ruso no compila.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, Credits, Weë AI,
 *     Weë Studio…—, que son marca y se escriben igual en todos los idiomas. En
 *     ruso eso significa algo más que «no traducir»: significa NO TRANSLITERAR.
 *     Dentro de una frase en cirílico, la marca se queda en alfabeto latino.
 *     «Credits» no es «Кредиты» y «Weë Brain» no es «Weë Мозг»;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── LO ÚNICO EN QUE ESTE IDIOMA SE SEPARA DE LOS DEMÁS ──────────────────────
 *
 * El ruso tiene CUATRO formas de plural y el español dos, así que unos cuantos
 * módulos añaden claves `_few` y `_many` que el español no tiene. No es un
 * apaño: `i18n/traducir.ts` ya buscaba `clave_<categoría>` antes que
 * `clave_other` y su comentario nombraba el ruso desde el primer día. Lo único
 * que faltaba era poder DECLARARLAS, y de eso se encarga `./plurales.ts`.
 *
 * Los módulos que no tienen cantidades se declaran exactamente igual que en
 * alemán o en italiano, con el tipo estricto de siempre. La divergencia es la
 * mínima que el idioma exige, y ni una clave más.
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

export const ru: FormaDelDiccionario = {
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
