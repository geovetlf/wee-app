/*
 * TURCO — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los demás idiomas: un módulo es un archivo y una línea
 * aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave que
 * falte o sobre en turco no compila; y un módulo nuevo que se añada al español
 * no compila hasta que exista también aquí.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact,
 *     Credits, Weë AI, Weë Studio…—, que son marca y se escriben igual en todos
 *     los idiomas. En turco la tentación es adaptarlos, porque se escriben casi
 *     igual: «Credits» no es «Kredi» y «Weë Studio» no es «Weë Stüdyo». Si una
 *     marca lleva sufijo, va con apóstrofo y solo con las terminaciones de la
 *     tabla de `docs/I18N-TURCO.md` § 9 («Weë'de», «WeeTalk'ta»); en los demás
 *     casos la frase lleva un sustantivo detrás («ËContact listen»);
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── LO QUE ES DEL TURCO ─────────────────────────────────────────────────────
 *
 * 1 · SE TUTEA. «Sen» en toda la app, como Instagram, Facebook y Spotify, y
 *     como el español de Weë. Botones en imperativo desnudo: Kaydet, Paylaş.
 *
 * 2 · LA CAJA. La mayúscula de «i» es «İ» y la minúscula de «I» es «ı»: estos
 *     archivos se escriben ya con su caja, y el código no cambia mayúsculas ni
 *     minúsculas sin su locale (`i18n/caja.ts`).
 *
 * 3 · NINGÚN SUFIJO PEGADO A UN {{hueco}}. La vocal de la terminación depende
 *     de una palabra que no se conoce al traducir: «{{nombre}} adlı kullanıcı»,
 *     «Paylaşan: {{nombre}}», nunca «{{nombre}}'in».
 *
 * 4 · LAS CIFRAS. «%60», con el signo delante; y tras un número, singular:
 *     «3 gönderi». `_one` y `_other` suelen decir lo mismo.
 *
 * La guía de estilo y el glosario están en `docs/I18N-TURCO.md`, y lo que se
 * puede comprobar lo comprueba `functions/test/i18n-turco.test.mjs`.
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

export const tr: FormaDelDiccionario = {
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
