/*
 * EL PERFIL PROPIO, CERRADO (fase 5N).
 *
 * La 5M abrió la pantalla por una esquina —el hueco de la portada— y dejó dicho
 * lo que faltaba. Esta prueba defiende el resto: los dos estados con los que
 * puede abrirse, las siete alertas, el formulario de editar entero, los tres
 * botones, las cuatro pestañas, la lista de publicaciones y los cuatro huecos
 * vacíos, cada uno con su frase.
 *
 * CINCO COSAS QUE DEFIENDE Y NO SON OBVIAS:
 *
 *   · EL ERROR DE LA LISTA SE GUARDA COMO CLAVE, NO COMO FRASE. Guardado ya
 *     traducido se congelaba en el idioma que hubiera puesto cuando falló:
 *     cambiar de idioma con el error en pantalla dejaba la frase anterior;
 *
 *   · EL MOTIVO DE UN AVATAR QUE NO SUBE ES DEL SERVIDOR. Entra por `{{motivo}}`
 *     y sale crudo: traducir lo que dijo el almacén sería inventárselo. El único
 *     motivo que escribe Weë —la URL que no llega— sí se traduce, porque si no
 *     la frase saldría medio en un idioma y medio en el otro;
 *
 *   · EL NOMBRE DE QUIEN MIRA VIAJA POR HUECO. Aparece en el mensaje de
 *     compartir: es un valor, nunca una clave;
 *
 *   · TRES PESTAÑAS SE DICEN IGUAL EN LOS DOS IDIOMAS —Media, Reposts, Likes—.
 *     La lista es cerrada: cualquier otra clave que coincida es una traducción
 *     que falta;
 *
 *   · LO QUE SE REPITE POR TODA LA APP NO SE COPIÓ. "Guardar", "Compartir",
 *     "Error" y "Error desconocido" se piden donde ya viven.
 *
 * Se usa el traductor de verdad de Weë, como en `i18n-polls.test.mjs`.
 */
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const ES = await traductorDe('es');
const EN = await traductorDe('en');
const esT = textosDe('es');
const enT = textosDe('en');

const CRUDO = leer('screens/ProfileScreen.tsx');
/* Sin `console.*`: lo que se escribe en la consola no se lee en pantalla. */
const PERFIL = soloCodigo(CRUDO).replace(/console\.(log|error|warn|info)\([^;]*\);/g, '');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Ni una frase española suelta en toda la pantalla ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 1 · LA PASADA DE VERDAD. No una lista de frases conocidas: TODAS las
   * cadenas del archivo. La que lleve acentos, eñes o signos de apertura, o una
   * palabra funcional del español, se enseña aquí con nombre y apellidos.
   */
  const ACENTOS = /[áéíóúÁÉÍÓÚñÑ¿¡]/;
  const PALABRAS = /(^|\s)(el|la|los|las|de|del|no|se|un|una|para|con|que|tu|tus|sin|por|al|ya|más|aún)(\s|$)/i;
  const RE = new RegExp("'((?:[^'\\\\]|\\\\.)*)'|\"([^\"]*)\"|`([^`]*)`", 'g');
  const sueltas = [];
  for (const m of PERFIL.matchAll(RE)) {
    const v = m[1] ?? m[2] ?? m[3];
    if (!v || v.length < 3) continue;
    if (ACENTOS.test(v) || PALABRAS.test(v)) sueltas.push(v);
  }
  check('1) no queda ninguna cadena española escrita a mano', sueltas.length === 0, [...new Set(sueltas)].join(' · '));

  /* 2 · Ni texto suelto dentro del JSX, que es la otra forma de colarse. */
  const enJsx = [];
  for (const m of PERFIL.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}]{2,})\s*</g)) enJsx.push(m[1].trim());
  check('2) ni texto suelto dentro del JSX', enJsx.length === 0, [...new Set(enJsx)].join(' · '));

  /* 3 · La pantalla usa el sistema de Weë, y solo ese. */
  /* useIdioma es el mismo proveedor: la pantalla lo pide para bajar el nombre a minúsculas con las reglas del idioma. */
  check('3) usa el traductor de Weë', /import \{ (useT|useIdioma) \} from '\.\.\/contexts\/IdiomaContext';/.test(PERFIL)
    && /const (t = useT\(\)|\{ t, locale \} = useIdioma\(\));/.test(PERFIL));
  check('3) sin diccionario propio ni ternarios de idioma',
    !/idioma === 'e[ns]'/.test(PERFIL) && !/locale === 'e[ns]'/.test(PERFIL)
    && !/i18next|react-intl|formatjs|lingui/.test(CRUDO)
    && !/const (TEXTOS|TRADUCCIONES|STRINGS|LABELS) =/.test(PERFIL));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Los dos estados con los que puede abrirse ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('4) cargando', /\{t\('profile\.loading'\)\}/.test(PERFIL));
  check('5) el error, con su título', /\{t\('profile\.loadFailed'\)\}/.test(PERFIL));
  /*
   * 6 · El detalle es el que MANDE EL ERROR, si lo trae, y si no el del
   * diccionario. Desde la fase 5O lo que manda el contexto es una CLAVE, no una
   * frase, así que los dos caminos pasan por el traductor y los dos cambian de
   * idioma en caliente. Se comprueba la pantalla Y quien le da el error.
   */
  check('6) y su detalle, con el respaldo traducido detrás',
    /\{t\(profileError \|\| 'profile\.loadFailedDetail'\)\}/.test(PERFIL)
    && /setError\('profile\.loadFailedDetail'\)/.test(soloCodigo(leer('contexts/UserProfileContext.tsx'))));
  check('7) y el botón de volver', /\{t\('profile\.backToLogin'\)\}/.test(PERFIL));

  for (const [clave, es, en] of [
    ['loading', 'Cargando perfil...', 'Loading profile...'],
    ['loadFailed', 'Error al cargar el perfil', 'The profile could not be loaded'],
    ['loadFailedDetail', 'No se pudo cargar la información del usuario', 'Your account information could not be loaded'],
    ['backToLogin', 'Volver al Login', 'Back to sign in'],
  ]) {
    check('8) es · ' + clave + ': ' + ES('profile.' + clave), ES('profile.' + clave) === es);
    check('9) en · ' + clave + ': ' + EN('profile.' + clave), EN('profile.' + clave) === en);
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Las siete alertas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * + cierre 2026-10-01: las seis que eran `Alert.alert` pasan a `notify` —en React Native Web `Alert.alert` es una
   * función vacía y la persona no veía ninguna—. Mismas claves, mismo número, ninguna `Alert.alert` de vuelta.
   */
  const alertas = PERFIL.match(/\bnotify\([^;]*\);/g) || [];
  check('10) hay siete, ni una más', alertas.length === 7 && !/Alert\.alert\(/.test(PERFIL)
    && (PERFIL.match(/notify\(t\('common\.error'\), t\('profile\.avatarUpdateFailed'\)\)/g) || []).length === 1, String(alertas.length));
  check('10) y ninguna lleva una frase escrita a mano',
    alertas.every((a) => !/'[^']*[a-záéíóúñ]{4,}[^']*'/.test(a.replace(/t\('[^']*'/g, 't('))),
    alertas.filter((a) => /'[^']*[a-záéíóúñ]{4,}[^']*'/.test(a.replace(/t\('[^']*'/g, 't('))).join(' · '));

  check('11) el nombre vacío', /notify\(t\('common\.error'\), t\('profile\.nameRequired'\)\)/.test(PERFIL));
  check('12) el perfil que no se actualiza', /notify\(t\('common\.error'\), t\('profile\.updateFailed'\)\)/.test(PERFIL));
  check('13) la sesión que no se cierra', /notify\(t\('common\.error'\), t\('profile\.signOutFailed'\)\)/.test(PERFIL));
  check('14) la sesión que no hay', /notify\(t\('common\.error'\), t\('profile\.noSession'\)\)/.test(PERFIL));
  check('15) la portada que no sube', /notify\(t\('common\.error'\), t\('profile\.coverUploadFailed'\)\)/.test(PERFIL));
  check('16) el permiso de la galería', /notify\(t\('profile\.permissionsTitle'\), t\('profile\.galleryPermission'\)\)/.test(PERFIL));

  /*
   * 17 · EL AVATAR. El motivo técnico —el almacén, la red— va al registro; la
   * persona ve una frase entera de Weë, también en web (`notify`, porque en
   * React Native Web `Alert.alert` no enseña nada). Y el único motivo que
   * escribe Weë, la URL que no llega, también está traducido. (Cierre de F11:
   * antes el motivo crudo viajaba por `{{motivo}}` hasta la pantalla.)
   */
  check('17) el avatar que no sube avisa con una frase de Weë, también en web',
    /notify\(t\('common\.error'\), t\('profile\.avatarUpdateFailed'\)\)/.test(PERFIL)
    && !/avatarUpdateFailed', \{ motivo/.test(PERFIL) && !/composer\.unknownError/.test(PERFIL));
  check('17) y el único motivo que escribe Weë está traducido',
    /throw new Error\(t\('profile\.imageUrlMissing'\)\)/.test(PERFIL) && !/No se recibió URL de imagen/.test(PERFIL));
  check('17) sin hueco en ningún idioma',
    !/\{\{/.test(esT.profile.avatarUpdateFailed) && !/\{\{/.test(enT.profile.avatarUpdateFailed));
  check('18) y es una frase entera — ' + EN('profile.avatarUpdateFailed'),
    EN('profile.avatarUpdateFailed') === 'The avatar could not be updated. Please try again.');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · El formulario de editar ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('19) el título', /\{t\('profile\.editTitle'\)\}/.test(PERFIL));
  /* 20 · "Guardar" ya existía en común: no se copió. */
  check('20) guardar reutiliza common.save', /\{t\('common\.save'\)\}/.test(PERFIL));
  check('20) y no se duplicó en el módulo del perfil', !('save' in esT.profile));

  check('21) los tres rótulos',
    /\{t\('profile\.displayNameLabel'\)\}/.test(PERFIL)
    && /\{t\('profile\.bioLabel'\)\}/.test(PERFIL)
    && /\{t\('profile\.websiteLabel'\)\}/.test(PERFIL));
  check('22) y los tres huecos',
    /placeholder=\{t\('profile\.displayNamePlaceholder'\)\}/.test(PERFIL)
    && /placeholder=\{t\('profile\.bioPlaceholder'\)\}/.test(PERFIL)
    && /placeholder=\{t\('profile\.websitePlaceholder'\)\}/.test(PERFIL));
  check('22) ningún placeholder quedó escrito a mano', !/placeholder="/.test(PERFIL));

  /*
   * 23 · EL CONTADOR DE LOS TRES CAMPOS ES UNA SOLA CLAVE. Gastados y tope
   * entran por hueco, así que 30 y 100 no están escritos en ninguna frase.
   */
  const contadores = PERFIL.match(/t\('profile\.charCount', \{ usados: [A-Za-z]+\.length, maximo: \d+ \}\)/g) || [];
  check('23) los tres contadores salen de la misma clave', contadores.length === 3, contadores.length + ' contadores');
  check('23) con los topes por hueco, no escritos en la frase',
    !/\d\/\d/.test(esT.profile.charCount) && !/\d\/\d/.test(enT.profile.charCount));
  check('24) es: ' + ES('profile.charCount', { usados: 12, maximo: 30 }),
    ES('profile.charCount', { usados: 12, maximo: 30 }) === '12/30 caracteres');
  check('25) en: ' + EN('profile.charCount', { usados: 12, maximo: 30 }),
    EN('profile.charCount', { usados: 12, maximo: 30 }) === '12/30 characters');

  /* 26 · Y lo que se escribe en los tres campos sigue siendo de quien lo escribe. */
  check('26) los tres campos siguen atados a su estado, sin traductor',
    /value=\{tempDisplayName\}/.test(PERFIL) && /value=\{tempBio\}/.test(PERFIL) && /value=\{tempWebsite\}/.test(PERFIL)
    && !/t\(\s*temp(DisplayName|Bio|Website)/.test(PERFIL));
  check('26) y sus topes de escritura no se movieron',
    /maxLength=\{30\}/.test(PERFIL) && (PERFIL.match(/maxLength=\{100\}/g) || []).length === 2);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Los botones, las pestañas y la cifra ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('27) editar perfil', /\{t\('profile\.editProfile'\)\}/.test(PERFIL));
  /* 28 · "Compartir" ya existía en común: no se copió. */
  check('28) compartir reutiliza common.share', /\{t\('common\.share'\)\}/.test(PERFIL));
  check('28) y no se duplicó en el módulo del perfil', !('share' in esT.profile));
  check('29) crear perfil Weë', /\{t\('profile\.createWeeProfile'\)\}/.test(PERFIL));

  /* 30 · La cifra y la primera pestaña dicen lo mismo y piden la misma clave. */
  check('30) la cifra de publicaciones', /\{t\('profile\.posts'\)\}/.test(PERFIL));
  check('31) las cuatro pestañas salen del diccionario',
    /renderTabButton\('posts', t\('profile\.posts'\)\)/.test(PERFIL)
    && /renderTabButton\('media', t\('profile\.tabMedia'\)\)/.test(PERFIL)
    && /renderTabButton\('reposts', t\('profile\.tabReposts'\)\)/.test(PERFIL)
    && /renderTabButton\('likes', t\('profile\.tabLikes'\)\)/.test(PERFIL));
  check('31) y el identificador de cada pestaña NO se tradujo',
    /useState<'posts' \| 'media' \| 'reposts' \| 'likes'>\('posts'\)/.test(PERFIL));

  for (const [clave, es, en] of [
    ['editProfile', 'Editar perfil', 'Edit profile'],
    ['createWeeProfile', 'Crear perfil Weë', 'Create Weë profile'],
    ['posts', 'Publicaciones', 'Posts'],
  ]) {
    check('32) ' + clave + ': ' + ES('profile.' + clave) + ' / ' + EN('profile.' + clave),
      ES('profile.' + clave) === es && EN('profile.' + clave) === en);
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · La lista y los cuatro huecos vacíos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('33) cargando publicaciones', /\{t\('profile\.loadingPosts'\)\}/.test(PERFIL));
  check('34) reintentar', /\{t\('profile\.retry'\)\}/.test(PERFIL));
  /* 34b · No se reutilizó common.retry, que dice otra cosa ("Inténtalo de nuevo"). */
  check('34) y no se confundió con common.retry, que dice otra cosa',
    ES('profile.retry') === 'Reintentar' && ES('common.retry') === 'Inténtalo de nuevo');

  /*
   * 35 · EL ERROR DE LA LISTA SE GUARDA COMO CLAVE. Es lo que hace que el
   * cambio de idioma en caliente funcione también con el error en pantalla.
   */
  const guardados = PERFIL.match(/setPostsError\('[^']*'\)/g) || [];
  check('35) el error se guarda como clave, no como frase',
    guardados.length === 2 && guardados.every((g) => g === "setPostsError('profile.postsFailed')"),
    guardados.join(' · '));
  check('35) y quien lo pinta lo traduce', /\{t\(postsError\)\}/.test(PERFIL));

  /* 36 · Los cuatro huecos, con su título y su pie. */
  for (const clave of ['emptyPosts', 'emptyMedia', 'emptyReposts', 'emptyLikes']) {
    check('36) ' + clave + ' + pista', new RegExp("'profile\\." + clave + "'").test(PERFIL)
      && new RegExp("'profile\\." + clave + "Hint'").test(PERFIL));
  }
  check('37) los ocho están en los dos idiomas',
    ['emptyPosts', 'emptyPostsHint', 'emptyMedia', 'emptyMediaHint', 'emptyReposts', 'emptyRepostsHint', 'emptyLikes', 'emptyLikesHint']
      .every((k) => !!esT.profile[k] && !!enT.profile[k]));
  check('38) es: ' + ES('profile.emptyPosts'), ES('profile.emptyPosts') === 'Aún no tienes publicaciones');
  check('39) en: ' + EN('profile.emptyPosts'), EN('profile.emptyPosts') === 'You have no posts yet');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Lo que NO se traduce ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 40 · Lo que escribe una persona se pinta crudo. */
  check('40) el nombre, el usuario y la biografía se pintan crudos',
    /\{userProfile\.displayName\}/.test(PERFIL)
    && /\{userProfile\.username \|\| userProfile\.displayName\.toLocaleLowerCase\(locale\)/.test(PERFIL)
    && /\{userProfile\.bio\}/.test(PERFIL));
  check('40) y ninguno entra como clave en el traductor',
    !/t\(\s*userProfile/.test(PERFIL) && !/t\(`/.test(PERFIL));

  /*
   * 41 · EL MENSAJE DE COMPARTIR. El nombre entra por hueco: es un valor. Y la
   * marca se queda escrita en la frase, que es donde tiene que estar.
   */
  check('41) compartir pide la clave y le pasa el nombre',
    /message: t\('profile\.shareMessage', \{ nombre: userProfile\?\.displayName \?\? '' \}\)/.test(PERFIL));
  check('41) el hueco está en los dos idiomas',
    /\{\{nombre\}\}/.test(esT.profile.shareMessage) && /\{\{nombre\}\}/.test(enT.profile.shareMessage));
  check('42) es: ' + ES('profile.shareMessage', { nombre: 'Jazmín' }),
    ES('profile.shareMessage', { nombre: 'Jazmín' }) === 'Mira el perfil de Jazmín en Weë');
  check('43) en: ' + EN('profile.shareMessage', { nombre: 'Jazmín' }),
    EN('profile.shareMessage', { nombre: 'Jazmín' }) === 'Take a look at Jazmín on Weë');

  /* 44 · La marca se escribe Weë en los dos idiomas, y no aparece ninguna prohibida. */
  const conMarca = Object.entries(esT.profile).concat(Object.entries(enT.profile)).filter(([, v]) => /We[eë]/.test(v));
  check('44) la marca se escribe siempre Weë', conMarca.every(([, v]) => !/\bWee\b|\bWEE\b|WEË/.test(v)),
    conMarca.filter(([k, v]) => /\bWee\b|\bWEE\b|WEË/.test(v)).map(([k]) => k).join(' · '));
  check('44) ni "Reels" ni "hidi" asoman como palabra de producto',
    !Object.values(esT.profile).concat(Object.values(enT.profile)).some((v) => /Reels|hidi/i.test(v)));
  /* Y el identificador heredado del Perfil Weë sigue donde estaba: es técnico. */
  check('44) el identificador heredado sigue siendo técnico, no una palabra',
    /activeProfileType === 'hidi'/.test(PERFIL) && !/>.*hidi.*</.test(PERFIL));

  /* 45 · ËContacts: marca, y además sale de la identidad puesta, no de la frase. */
  check('45) el nombre de la agenda se pinta crudo', /\{misEcontacts\.nombrePlural\}/.test(PERFIL));
  check('45) y en la etiqueta del lector entra por hueco',
    /accessibilityLabel=\{t\('profile\.viewMyEcontacts', \{ nombre: misEcontacts\.nombrePlural, total: misEcontacts\.total \}\)\}/.test(PERFIL));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Accesibilidad: la que había, ni una más ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const etiquetas = (PERFIL.match(/accessibilityLabel=/g) || []).length;
  const pistas = (PERFIL.match(/accessibilityHint=/g) || []).length;
  const roles = PERFIL.match(/accessibilityRole="[a-z]+"/g) || [];
  check('46) sigue habiendo una etiqueta y ninguna pista', etiquetas === 1 && pistas === 0,
    etiquetas + ' etiqueta(s) · ' + pistas + ' pista(s)');
  check('46) y un solo rol, el mismo', roles.length === 1 && roles[0] === 'accessibilityRole="button"', roles.join(' · '));
  check('47) la etiqueta que hay está traducida en los dos idiomas',
    ES('profile.viewMyEcontacts', { nombre: 'ËContacts', total: 7 }) === 'Ver mis ËContacts, 7'
    && EN('profile.viewMyEcontacts', { nombre: 'ËContacts', total: 7 }) === 'View my ËContacts, 7');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Control: la pantalla es la misma ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 48 · Los manejadores siguen siendo los suyos y siguen colgados donde estaban. */
  for (const h of ['handleBannerSelect', 'handleShareProfile', 'handleEditProfile', 'handleSaveProfile',
    'handleSettingsPress', 'handleLogout', 'handleAvatarSelect', 'handleAvatarLongPress', 'irAEContact']) {
    check('48) ' + h + ' sigue definido', new RegExp('const ' + h + ' =').test(PERFIL));
  }
  check('49) y siguen colgados de los mismos botones',
    /onPress=\{handleBannerSelect\}/.test(PERFIL) && /onPress=\{handleShareProfile\}/.test(PERFIL)
    && /onPress=\{handleEditProfile\}/.test(PERFIL) && /onPress=\{handleSaveProfile\}/.test(PERFIL)
    && /onPress=\{handleSettingsPress\}/.test(PERFIL) && /onPress=\{irAEContact\}/.test(PERFIL)
    && /onLongPress=\{handleAvatarLongPress\}/.test(PERFIL));

  /* 50 · Medidas, iconos y navegación: nada se movió. */
  check('50) las medidas siguen donde estaban',
    /const BANNER_HEIGHT = 180;/.test(CRUDO) && /size=\{90\}/.test(PERFIL) && /size=\{32\}/.test(PERFIL) && /size=\{48\}/.test(PERFIL));
  check('50) y los iconos de los cuatro huecos vacíos siguen siendo los suyos',
    /'document-text-outline'/.test(PERFIL) && /'image-outline'/.test(PERFIL)
    && /'repeat-outline'/.test(PERFIL) && /'heart-outline'/.test(PERFIL));
  check('51) la navegación no cambió',
    /navigation\.navigate\('Settings'\)/.test(PERFIL) && /navigate\('EContact'\)/.test(PERFIL)
    && /navigate\('WeeProfileCreation'\)/.test(PERFIL) && /navigate\('PostDetail'/.test(PERFIL));
  check('52) el muro del Perfil Weë sigue decidiéndose igual',
    /const enPerfilWee = activeProfileType === 'hidi';/.test(PERFIL)
    && /variante=\{enPerfilWee \? 'muro' : 'tarjeta'\}/.test(PERFIL));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── J · El módulo, cuadrado ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const clavesEs = Object.keys(esT.profile || {});
  const clavesEn = Object.keys(enT.profile || {});
  check('53) cuadrado en los dos idiomas — ' + clavesEs.length,
    clavesEs.length === clavesEn.length && clavesEs.every((k) => clavesEn.includes(k)),
    clavesEs.filter((k) => !clavesEn.includes(k)).join(' · '));
  check('53) ninguna traducción inglesa está vacía', clavesEn.every((k) => enT.profile[k].trim().length > 0));

  /* 54 · Cada clave del módulo se USA. Una que sobre es una que se olvidó quitar. */
  /*
   * En la fase 6 el módulo pasó a servir también al PERFIL AJENO, que es la
   * misma pantalla vista desde fuera. Se miran las dos: una clave que no use
   * ninguna de ellas sigue siendo una clave que sobra.
   */
  const AJENO = leer('screens/UserProfileScreen.tsx');
  const sinUsar = clavesEs.filter((k) => !new RegExp("'profile\\." + k + "'").test(PERFIL + AJENO));
  check('54) todas las claves del módulo se usan en una de las dos pantallas', sinUsar.length === 0, sinUsar.join(' · '));

  /*
   * 55 · Y todas las que la pantalla pide existen. Se miran TODAS las llamadas,
   * también las de otros módulos: `common.save`, `composer.unknownError`…
   */
  const pedidas = [...new Set([...PERFIL.matchAll(/t\('([a-z][A-Za-z0-9]*\.[A-Za-z0-9_]+)'/g)].map((m) => m[1]))];
  const faltan = pedidas.filter((c) => {
    const [mod, k] = c.split('.');
    return !(esT[mod] && esT[mod][k] !== undefined) || !(enT[mod] && enT[mod][k] !== undefined);
  });
  check('55) todas las claves que pide existen en los dos idiomas — ' + pedidas.length, faltan.length === 0, faltan.join(' · '));

  /* 56 · Las tres pestañas que se dicen igual, y solo esas tres. */
  const IGUALES = ['tabMedia', 'tabReposts', 'tabLikes'];
  const quietas = clavesEs.filter((k) => ES('profile.' + k) === EN('profile.' + k));
  check('56) solo coinciden las tres palabras que se dicen igual',
    quietas.length === IGUALES.length && IGUALES.every((k) => quietas.includes(k)), quietas.join(' · '));

  /* 57 · Y la inglesa está en inglés. */
  check('57) la inglesa está en inglés',
    clavesEn.every((k) => !/[áéíóúñ¿¡]/.test(enT.profile[k].replace(/Weë/g, ''))),
    clavesEn.filter((k) => /[áéíóúñ¿¡]/.test(enT.profile[k].replace(/Weë/g, ''))).join(' · '));

  /*
   * 58 · CONTROL. Lo de las fases anteriores sigue en su sitio: si esta hubiera
   * arrastrado algo de Configuración, de comunidades o de la 5M, se vería aquí.
   */
  check('58) control: lo que cerraron 5K, 5L y 5M sigue intacto',
    ES('settings.myCommunities') === 'Mis comunidades'
    && EN('communities.join') === 'Join'
    && ES('profile.addCover') === 'Agregar portada'
    && EN('profile.addCover') === 'Add cover');
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
