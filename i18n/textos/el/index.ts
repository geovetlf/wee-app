/*
 * GRIEGO (el-GR) — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los demás idiomas: un módulo es un archivo y una línea aquí. El tipo `FormaDelDiccionario` sale
 * del español, así que una clave que falte o sobre en griego no compila, y un módulo nuevo del español no compila
 * hasta que exista también aquí.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact, Credits, Weë AI, Weë Studio…—, que son marca:
 *     en alfabeto latino, sin transliterar («Κρέντιτς» está mal) ni traducir («Weë Μουσική» está mal), con artículo
 *     griego neutro cuando la frase lo pide («στο Weë», «τα Credits»);
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de comunidades, proyectos o prompts.
 *
 * ── LO QUE ES DEL GRIEGO ─────────────────────────────────────────────────────
 *
 * 1 · «εσύ» en toda la app; los botones, sustantivo de acción («Αποθήκευση», «Ακύρωση»).
 * 2 · El cero es `other`: ninguna forma `_one` escribe un «1» a mano.
 * 3 · Nada en mayúsculas sostenidas con tono: lo que el español escribe en mayúsculas va sin tono («ΠΡΟΦΙΛ»), y lo que
 *     se pasa a mayúsculas en pantalla lo hace `enMayusculas` (`i18n/caja.ts`).
 * 4 · Puntuación griega: «;» para preguntar (el U+037E se normaliza a «;»), comillas « », «·» como punto alto.
 *
 * Traducción hecha por agentes y SIN revisión humana nativa (2026-10-29). La guía y el glosario están en
 * `docs/I18N-GRIEGO.md`; lo comprobable lo comprueba `functions/test/i18n-griego.test.mjs`.
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

export const el: FormaDelDiccionario = {
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
