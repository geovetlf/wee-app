/*
 * CHINO TRADICIONAL (繁體中文, norma de Taiwán) — un archivo por módulo, y aquí se juntan.
 *
 * Mismo reparto que los ocho idiomas anteriores: un módulo es un archivo y una
 * línea aquí. El tipo `FormaDelDiccionario` sale del español, así que una clave
 * que falte o sobre en chino no compila.
 *
 * QUÉ NO ENTRA NUNCA EN ESTOS ARCHIVOS:
 *   · los nombres de Weë —Weë, Wäll, Weëls, WeeTalk, ËContact, Credits, Weë AI,
 *     Weë Studio…—, que son marca. En chino eso significa tres cosas a la vez:
 *     no se traducen (Credits no es 积分), no se transliteran (Weë no es 微),
 *     y no se pasan a hanzi de ninguna otra forma. Dentro de la frase en
 *     caracteres chinos, la marca se queda en alfabeto latino;
 *   · nada que escriba una persona: publicaciones, comentarios, nombres de
 *     comunidades, proyectos o prompts. Eso es contenido, no interfaz.
 *
 * ── ESTE ARCHIVO ES LA BASE DE UN IDIOMA CON DOS ESCRITURAS ─────────────────
 *
 * Esta es la VARIANTE TRADICIONAL, y no es una conversión carácter a carácter
 * del simplificado: es una traducción propia. Lo que separa a Taiwán de China
 * continental no son solo los trazos, es el vocabulario —影片 y no 視頻, 專案 y
 * no 項目, 使用者 y no 用戶, 人工智慧 y no 人工智能—, y eso ninguna tabla lo sabe.
 *
 * No está en `IDIOMAS` como idioma aparte: es una VARIANTE de `zh`. Se registra
 * en `diccionarios.ts` bajo su locale y bajo los alias Hant, y el traductor la
 * encuentra sola porque ya buscaba `zh-TW` antes que `zh`.
 *
 * ── TRES COSAS QUE ESTE IDIOMA HACE DISTINTO ───────────────────────────────
 *
 * 1 · NO HAY PLURAL. `Intl.PluralRules('zh')` declara una sola categoría,
 *     `other`, igual que el coreano. La forma `_one` no se lee nunca, así que
 *     lleva el mismo texto que su `_other`.
 *
 * 2 · UN ESPACIO ENTRE HANZI Y LATÍN. «打开 Weë Studio», «剩余 10 MB». Aquí no
 *     es cosmética: las marcas van en alfabeto latino dentro de frases chinas, y
 *     sin ese espacio se pegan a los caracteres y se leen mal.
 *
 * 3 · PUNTUACIÓN DE ANCHO COMPLETO: 。，、？！：；. La occidental se reserva
 *     para lo que de verdad es código, cifras o identificadores.
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

export const zhTW: FormaDelDiccionario = {
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
