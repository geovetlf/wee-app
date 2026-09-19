/*
 * PORTUGUÉS DE PORTUGAL — un archivo por módulo, y aquí se juntan.
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
 * VARIANTE: PORTUGUÉS DE PORTUGAL. El brasileño sigue siendo la base del
 * idioma y vive en `../pt`; esto es la otra norma, añadida el 2026-09-17, y
 * NO es una conversión de aquél.
 *
 * Lo que de verdad separa a Portugal de Brasil es la GRAMÁTICA, no una lista de
 * palabras. Aquí se dice «está a carregar» donde allí «está carregando», se
 * tutea con «tu» y no con «você», el clítico va detrás —«levo-te lá», no «te
 * levo»—, vive el futuro de subjuntivo —«o que precisares»— y el posesivo lleva
 * artículo: «os meus projetos». Ninguna de esas cosas la produce un conversor.
 *
 * El léxico va después, y también cambia: «ficheiro» y no «arquivo», «ecrã» y
 * no «tela», «telemóvel» y no «celular», «utilizador» y no «usuário»,
 * «palavra-passe» y no «senha», «definições» y no «configurações».
 *
 * Los ocho locales que caen aquí —Portugal, Angola, Mozambique, Cabo Verde,
 * Guinea-Bisáu, Santo Tomé, Timor y Macao— están declarados en `idiomas.ts` y
 * registrados en `diccionarios.ts`. Lo comprueba `i18n-portugues.test.mjs`.
 *
 * Y EL CERO CAE AL REVÉS QUE EN BRASIL. `Intl.PluralRules` mete el 0 en `one`
 * para `pt-BR` y en `other` para `pt-PT`: Brasil dice «0 produto» y Portugal «0
 * produtos». No hace falta nada especial —las claves usan {{contador}} en las
 * dos formas—, pero conviene saberlo antes de "arreglar" una que parezca rara.
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
import { FormaDelDiccionario } from '../es';

export const ptPT: FormaDelDiccionario = {
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
};
