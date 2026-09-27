/*
 * PORTUGUÉS — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que el español y el inglés: un módulo es un archivo y una línea
 * aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave que
 * falte o sobre en portugués no compila.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, Credits, Weë AI,
 *     Weë Studio…—, que son marca y se escriben igual en todos los idiomas;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * VARIANTE OFICIAL: PORTUGUÉS BRASILEÑO (pt-BR). No es una elección de
 * conveniencia ni algo provisional: es una decisión de producto del usuario
 * (2026-09-16), porque Brasil es el mercado internacional más cercano de Weë y
 * la experiencia en portugués se optimiza para quien vive allí. Este archivo NO
 * se pasa a portugués europeo; si algún día Weë lo ofrece, será un diccionario
 * aparte. Se tutea con «você», y donde las dos normas se separan gana siempre
 * la brasileña: «arquivo» y no «ficheiro», «tela» y no «ecrã», «celular» y no
 * «telemóvel», «Cadastre-se» y no «Registe-se», «Boas-vindas» y no la forma
 * europea. La regla entera está en `i18n/diccionarios.ts`.
 *
 * Y UNA REGLA QUE AQUÍ NO ES LA DEL ESPAÑOL: EL CERO ES SINGULAR. En portugués
 * —como en francés, y al revés que en español, italiano, alemán e inglés—
 * `Intl.PluralRules` mete el 0 en la categoría `one`. O sea que la forma `_one`
 * se lee también cuando no hay nada. Por eso ninguna clave `_one` escribe un
 * «1» a pelo: todas llevan {{contador}}, que con cero dice «0 produto».
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

export const pt: FormaDelDiccionario = {
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
