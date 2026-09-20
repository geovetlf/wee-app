/*
 * COREANO — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los siete idiomas anteriores: un módulo es un archivo y una
 * línea aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave
 * que falte o sobre en coreano no compila.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, Credits, Weë AI,
 *     Weë Studio…—, que son marca y se escriben igual en todos los idiomas. En
 *     coreano eso significa algo más que «no traducir»: significa NO
 *     TRANSLITERAR. Dentro de la frase en hangul, la marca se queda en alfabeto
 *     latino. «Credits» no es «크레딧» y «Weë Brain» no es «Weë 브레인»;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── DOS COSAS DEL COREANO QUE NO PASAN EN NINGÚN OTRO IDIOMA DE WEË ─────────
 *
 * 1 · NO HAY PLURAL. `Intl.PluralRules('ko')` declara UNA sola categoría,
 *     `other`, así que la forma `_one` NO SE LEE NUNCA, ni siquiera con 1. Es
 *     el espejo del ruso, que necesitaba dos formas más. Las claves `_one`
 *     siguen ahí porque el español las exige, pero llevan el MISMO texto que su
 *     `_other`: si dijeran otra cosa, nadie la vería y nadie se enteraría.
 *     Por eso el coreano no usa `ConPlurales`, que es cosa del ruso.
 *
 * 2 · LAS PARTÍCULAS NO PUEDEN IR PEGADAS A UN HUECO. 은/는, 이/가, 을/를,
 *     와/과 y (으)로 cambian según si la palabra anterior acaba en consonante o
 *     en vocal, y lo que salga de un `{{hueco}}` no se sabe de antemano. Así que
 *     las frases están REESCRITAS para que eso no ocurra —con el patrón
 *     etiqueta «이름: {{nombre}}», o moviendo el hueco—, en vez de recurrir al
 *     feo «{{nombre}}을(를)».
 *
 * Las dos las comprueba `functions/test/i18n-coreano.test.mjs`.
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
import { FormaDelDiccionario } from '../es';

export const ko: FormaDelDiccionario = {
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
};
