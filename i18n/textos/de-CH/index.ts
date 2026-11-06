/*
 * ALEMÁN SUIZO (de-CH) — un archivo por módulo, y aquí se juntan.
 *
 * Variante del alemán (`textos/de/`): misma lengua, ortografía suiza (ss en vez de ß), comillas «…» y el léxico que de
 * verdad cambia en Suiza. El tipo `FormaDelDiccionario` sale del español, así que una clave que falte o sobre no compila.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS: las marcas de Weë traducidas (Weë, Wäll, Weëls —nunca «Reels»—, WeeTalk, ËContact,
 * ẄContact, Credits, Weë AI, Weë Studio…) ni lo que escribe una persona.
 *
 * Adaptación hecha por agentes y SIN revisión humana nativa (2026-10-30). Guía en `docs/I18N-ALEMAN-SUIZO.md`.
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

export const deCH: FormaDelDiccionario = {
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
