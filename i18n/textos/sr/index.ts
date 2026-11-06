/*
 * СРПСКИ (sr-RS) — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los demás idiomas: el tipo `FormaDelDiccionario` sale del español, así que una clave que falte o
 * sobre no compila, y un módulo nuevo del español no compila hasta que exista aquí.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS: las marcas de Weë traducidas (Weë, Wäll, Weëls —nunca «Reels»—, WeeTalk, ËContact,
 * ẄContact, Credits, Weë AI, Weë Studio…) ni lo que escribe una persona.
 *
 * Traducción hecha por agentes y SIN revisión humana nativa (2026-10-30). Guía y glosario en `docs/I18N-SERBIO.md`.
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

export const sr: FormaDelDiccionario = {
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
