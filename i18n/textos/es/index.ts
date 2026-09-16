/*
 * ESPAÑOL — un archivo por módulo, y aquí se juntan.
 *
 * Se parte por módulos porque un único archivo con todas las claves de Weë
 * sería imposible de revisar en un diff. Añadir un módulo es un archivo y una
 * línea aquí.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, Credits, Weë AI,
 *     Weë Studio…—, que son marca y se escriben igual en todos los idiomas;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
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
import { studio } from './studio';
import { design } from './design';
import { chef } from './chef';
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
export const es = {
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
  studio,
  design,
  chef,
};

/**
 * La forma que tiene que cumplir CUALQUIER diccionario de Weë.
 *
 * Sale del español porque es el que está completo. Un idioma nuevo se escribe
 * contra este tipo y, si le falta una clave, no compila: el fallo aparece al
 * escribirlo y no en la pantalla de alguien.
 */
export type FormaDelDiccionario = {
  [Seccion in keyof typeof es]: { [Clave in keyof (typeof es)[Seccion]]: string };
};
