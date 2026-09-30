/*
 * JAPONÉS — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los demás idiomas: un módulo es un archivo y una línea
 * aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave que
 * falte o sobre en japonés no compila; y un módulo nuevo que se añada al
 * español no compila hasta que exista también aquí.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact,
 *     Credits, Weë AI, Weë Studio…—, que son marca y se escriben igual en todos
 *     los idiomas. En japonés eso significa algo más que «no traducir»:
 *     significa NO PASARLOS A KATAKANA, que es lo que el japonés hace con todo
 *     nombre extranjero. Dentro de la frase, la marca se queda en alfabeto
 *     latino y la partícula va pegada: 「Weë Studioで作成」, 「Creditsが不足
 *     しています」. «Credits» no es «クレジット» y «Weë» no es «ウィー»;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── LO QUE ES DEL JAPONÉS ────────────────────────────────────────────────────
 *
 * 1 · NO HAY PLURAL. `Intl.PluralRules('ja')` declara una sola categoría,
 *     `other`, así que `_one` no se lee nunca, ni con 1. Las claves `_one`
 *     siguen ahí porque el español las exige, y llevan EL MISMO texto que su
 *     `_other`: si dijeran otra cosa, nadie la vería.
 *
 * 2 · LAS PARTÍCULAS NO CAMBIAN, al contrario que en coreano: pueden ir pegadas
 *     a un `{{hueco}}` sin reescribir la frase.
 *
 * 3 · SIN ESPACIOS entre japonés y latino o cifras, ni entre palabras
 *     japonesas; puntuación de ancho completo (、。「」（）！？); letras y
 *     cifras latinas de ancho medio.
 *
 * La guía de estilo y el glosario están en `docs/I18N-JAPONES.md`, y lo que se
 * puede comprobar lo comprueba `functions/test/i18n-japones.test.mjs`.
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

export const ja: FormaDelDiccionario = {
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
