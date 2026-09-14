/*
 * CONFIGURACIÓN, ENTERA (fase 5K).
 *
 * La pantalla estaba a medias desde hacía tiempo y de una forma que engañaba:
 * los rótulos de sección y el idioma ya venían del diccionario, así que parecía
 * migrada, pero OCHO DE SUS NUEVE FILAS pasaban su título y su subtítulo en
 * español escritos a mano. Y lo más llamativo: las claves de casi todas YA
 * EXISTÍAN sin que nadie las usara —`myCommunities`, `privateReplies`,
 * `pushNotifications`, `about`, `help`, `privacyPolicy`, `signOut`—.
 *
 * TRES COSAS QUE ESTA PRUEBA DEFIENDE Y NO SON OBVIAS:
 *
 *   · LOS NOMBRES DE RUTA NO SE TRADUCEN. 'Settings', 'Help', 'EngineAdmin',
 *     'CommunitiesManagement', 'Idioma' y 'Main' son identificadores de
 *     navegación: si se tradujeran, la pantalla dejaría de abrirse;
 *
 *   · EL CONTADOR DE COMUNIDADES USA PLURALES DE VERDAD. Antes era un ternario
 *     que además decía "1 comunidad unidas"; ahora lo decide Intl.PluralRules;
 *
 *   · LA LÍNEA DE LA UBICACIÓN LLEVA SU ESTADO DENTRO, por hueco. Pegar la
 *     advertencia de privacidad detrás obligaría a todos los idiomas a ponerla
 *     en ese orden.
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

const CRUDO = leer('screens/SettingsScreen.tsx');
const AJUSTES = soloCodigo(CRUDO);

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Ninguna fila escribe ya en español ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const FRASES = ['Mis comunidades', 'comunidades unidas', 'Respuestas privadas',
    'Permitir que otros te envíen', '📍 Ubicación', 'Política de privacidad',
    'Qué hacemos con tus datos', 'Notificaciones push', 'Recibe notificaciones de nuevos',
    'Acerca de Weë', 'Qué es Weë y en qué versión', 'Preguntas frecuentes y contacto',
    'Salir de tu cuenta', 'No pudimos cerrar la sesión', 'Inténtalo de nuevo',
    'Este dispositivo no puede darnos', 'La ubicación está apagada', 'Le dijiste que no al sistema',
    'Weë te pedirá permiso', 'Weë sabe tu zona', 'Weë puede usar tu ubicación con detalle',
    'Desactivada. Permite que Weë', 'Tu ubicación exacta nunca', 'es la red social de las personas',
    'Todos los derechos reservados'];
  const quedan = FRASES.filter((f) => AJUSTES.includes(f));
  check('1) ninguna de las 25 frases sigue en la pantalla', quedan.length === 0, quedan.join(' | '));

  /* Y los rótulos de sección, que también estaban a medias. */
  const secciones = ['>\n            Notificaciones\n', '>\n            Información\n', '>\n            Cuenta\n']
    .filter((f) => CRUDO.includes(f));
  check('1) ni los tres rótulos de sección que faltaban', secciones.length === 0, String(secciones.length));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Las nueve filas, título y subtítulo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Cada fila con su par de claves. La del motor usa `engine.rowSubtitle`, que
   * se creó en la 5J y aquí se comprueba que sigue en su sitio.
   */
  const FILAS = [
    ['2) Mis comunidades', /t\('settings\.myCommunities'\),\s*\n[\s\S]{0,140}t\('settings\.communitiesJoined', \{ contador: joinedCommunitiesCount \}\)/],
    ['2) Idioma', /t\('settings\.language'\),\s*\n\s*disponibles\.find/],
    ['2) Respuestas privadas', /t\('settings\.privateReplies'\),\s*\n\s*t\('settings\.privateRepliesHint'\)/],
    ['2) Ubicación', /t\('settings\.location'\),\s*\n\s*textoUbicacion/],
    ['2) Política de privacidad', /t\('settings\.privacyPolicy'\),\s*\n\s*t\('settings\.privacyPolicyHint'\)/],
    ['3) Notificaciones push', /t\('settings\.pushNotifications'\),\s*\n\s*t\('settings\.pushNotificationsHint'\)/],
    ['3) Acerca de Weë', /t\('settings\.about'\),\s*\n\s*t\('settings\.aboutHint'\)/],
    ['3) Ayuda', /t\('settings\.help'\),\s*\n\s*t\('settings\.helpHint'\)/],
    ['3) Weë AI Engine', /'Weë AI Engine',\s*\n\s*t\('engine\.rowSubtitle'\)/],
  ];
  for (const [nombre, patron] of FILAS) check(`${nombre} sale de sus claves`, patron.test(AJUSTES));

  /* Y la décima, la de cerrar sesión, que no pasa por renderSettingItem. */
  check('3) Cerrar sesión, con su subtítulo',
    /\{t\('settings\.signOut'\)\}/.test(AJUSTES) && /\{t\('settings\.signOutHint'\)\}/.test(AJUSTES));

  /* Los cuatro rótulos de sección que faltaban o ya estaban. */
  check('3) los seis rótulos de sección salen del diccionario',
    ['sectionContent', 'sectionPreferences', 'sectionPrivacy', 'sectionNotifications', 'sectionInfo', 'sectionAccount']
      .every((k) => new RegExp(`t\\('settings\\.${k}'\\)`).test(AJUSTES)));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Las claves: reutilizadas, completas, sin duplicar ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 4 · LO QUE YA EXISTÍA SE REUTILIZA. Estas siete estaban en el diccionario
   * desde antes, sin que nadie las usara: no se creó ninguna gemela.
   */
  const REUSADAS = ['myCommunities', 'communitiesJoined_one', 'communitiesJoined_other', 'privateReplies',
    'privateRepliesHint', 'pushNotifications', 'about', 'help', 'privacyPolicy', 'signOut', 'signOutFailed',
    'language', 'languageSubtitle', 'title', 'sectionContent', 'sectionPrivacy', 'sectionPreferences'];
  const faltanReusadas = REUSADAS.filter((k) => !esT.settings?.[k]);
  check('4) las 17 claves que ya existían siguen ahí y se reutilizan', faltanReusadas.length === 0, faltanReusadas.join(' '));
  check('4) y también common.retry y engine.rowSubtitle, de otros módulos',
    /t\('common\.retry'\)/.test(AJUSTES) && /t\('engine\.rowSubtitle'\)/.test(AJUSTES)
    && !!esT.common.retry && !!esT.engine.rowSubtitle);

  /* 5 · Sin duplicados semánticos. */
  check('5) no se creó una gemela de ninguna de ellas',
    !esT.settings?.communities && !esT.settings?.aboutTitle && !esT.settings?.logout
    && !esT.settings?.engineRowSubtitle && !esT.settings?.retry);
  /*
   * "Cerrar sesión" vive en DOS módulos —`menu` y `settings`— y así estaba
   * desde antes de esta fase: el cajón del ☰ lee la suya y Configuración la
   * suya. No es duplicación de aquí y no se toca; queda fuera de la lista.
   */
  const repetidas = ['Mis comunidades', 'Respuestas privadas', 'Notificaciones push', 'Acerca de Weë',
    'Política de privacidad']
    .filter((f) => Object.values(esT).filter((m) => Object.values(m).includes(f)).length > 1);
  check('5) y ninguna frase de Settings está dos veces en el diccionario', repetidas.length === 0, repetidas.join(' | '));

  /* 6, 7 y 8 · Completas en los dos idiomas. */
  const TODAS = Object.keys(esT.settings || {});
  check('6) el módulo settings está completo en español', TODAS.length === 40, String(TODAS.length));
  const faltanEn = TODAS.filter((k) => !enT.settings?.[k]);
  check('7) y cuadrado en inglés', faltanEn.length === 0, faltanEn.join(' '));
  const vacias = TODAS.filter((k) => !String(enT.settings[k] ?? '').trim() || !String(esT.settings[k] ?? '').trim());
  check('8) ninguna traducción está vacía', vacias.length === 0, vacias.join(' '));
  /* `engineAdmin` dice "Weë AI Engine" en los dos porque es el nombre del motor. */
  const copiadas = TODAS.filter((k) => esT.settings[k] === enT.settings[k] && k !== 'engineAdmin');
  check('8) y todas están traducidas de verdad, salvo el nombre del motor', copiadas.length === 0, copiadas.join(' '));
  const conAcento = TODAS.filter((k) => /[áéíóúñ¿¡]/i.test(String(enT.settings[k]).replace(/Weë/g, '')));
  check('8) la inglesa está en inglés', conAcento.length === 0, conAcento.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Idioma, ubicación, push, motor y sesión ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 9 · El idioma: su fila no duplica la lógica y enseña el nombre nativo. */
  check('9) la fila del idioma enseña el nombre nativo, sin traducirlo',
    /disponibles\.find\(\(i\) => i\.codigo === idioma\)\?\.nombreNativo \?\? t\('settings\.languageSubtitle'\)/.test(AJUSTES)
    && !/t\(.*nombreNativo/.test(AJUSTES));
  check('9) y lo que se lee en cada idioma',
    ES('settings.language') === 'Idioma' && EN('settings.language') === 'Language');

  /*
   * 10 · LA UBICACIÓN. Sus seis estados guardan clave —el mapa se declara
   * dentro del componente, pero se resuelve al pintar— y la advertencia de
   * privacidad viaja DENTRO de la frase.
   */
  check('10) los seis estados de la ubicación guardan clave',
    /const CLAVE_DEL_ESTADO: Record<string, string> = \{/.test(AJUSTES)
    && ['unavailable', 'disabled', 'permissionDenied', 'permissionNotDetermined', 'approximate', 'precise']
      .every((e) => new RegExp(`${e}: 'settings\\.location`).test(AJUSTES)));
  check('10) y la línea se arma con un hueco, no pegando la advertencia',
    /t\('settings\.locationLine', \{\s*\n?\s*estado:/.test(AJUSTES)
    && /\{\{estado\}\}/.test(esT.settings.locationLine) && /\{\{estado\}\}/.test(enT.settings.locationLine));
  check('10) en español: ' + ES('settings.locationLine', { estado: ES('settings.locationApproximate') }),
    ES('settings.locationLine', { estado: ES('settings.locationApproximate') })
      === 'Weë sabe tu zona, no el punto exacto. Tu ubicación exacta nunca se muestra públicamente.');
  check('10) en inglés: ' + EN('settings.locationLine', { estado: EN('settings.locationApproximate') }),
    EN('settings.locationLine', { estado: EN('settings.locationApproximate') })
      === 'Weë knows your area, not the exact spot. Your exact location is never shown publicly.');
  check('10) el emoji del título se queda donde estaba',
    /📍/.test(esT.settings.location) && /📍/.test(enT.settings.location),
    ES('settings.location') + ' / ' + EN('settings.location'));

  /* 11 · Push: solo la interfaz. */
  check('11) push traducido, y su interruptor sin tocar',
    ES('settings.pushNotifications') === 'Notificaciones push' && EN('settings.pushNotifications') === 'Push notifications'
    && /onValueChange=\{setNotificationsEnabled\}/.test(AJUSTES));

  /* 12 · El motor usa la clave de la 5J. */
  check('12) el motor usa engine.rowSubtitle',
    EN('engine.rowSubtitle') === 'Providers, fallback chains and settings (administrators only)');

  /* 13 · La sesión reutiliza las claves de la 5H. */
  check('13) cerrar sesión reutiliza las claves de la fase 5H',
    /confirmAction\(t\('settings\.signOut'\), t\('menu\.signOutConfirm'\), t\('settings\.signOut'\), true, t\)/.test(AJUSTES));
  check('13) y el fallo al cerrar usa las suyas',
    /notify\(t\('settings\.signOutFailed'\), t\('common\.retry'\)\)/.test(AJUSTES));

  /* 14 · El aviso de "Acerca de", con el año por hueco. */
  check('14) el aviso de Acerca de Weë sale del diccionario',
    /notify\(t\('settings\.about'\), t\('settings\.aboutBody', \{ anio: new Date\(\)\.getFullYear\(\) \}\)\)/.test(AJUSTES));
  const cuerpo = EN('settings.aboutBody', { anio: 2026 });
  check('14) y lleva el año, la marca y la licencia de GeoNames',
    cuerpo.includes('2026') && cuerpo.includes('Weë (World Encode Entity)')
    && cuerpo.includes('GeoNames (geonames.org), CC BY 4.0'), cuerpo.slice(0, 60) + '…');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo dinámico, lo técnico y lo que no se movió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 17 · EL CONTADOR DE COMUNIDADES. Antes era un ternario que decía "1
   * comunidad unidas"; ahora lo decide Intl.PluralRules y de paso concuerda.
   */
  check('17) el contador usa plurales de verdad',
    ES('settings.communitiesJoined', { contador: 1 }) === '1 comunidad unida'
    && ES('settings.communitiesJoined', { contador: 5 }) === '5 comunidades unidas'
    && EN('settings.communitiesJoined', { contador: 1 }) === '1 community joined'
    && EN('settings.communitiesJoined', { contador: 5 }) === '5 communities joined',
    ES('settings.communitiesJoined', { contador: 1 }) + ' / ' + EN('settings.communitiesJoined', { contador: 5 }));
  check('17) y el cero también se dice bien',
    ES('settings.communitiesJoined', { contador: 0 }) === '0 comunidades unidas'
    && EN('settings.communitiesJoined', { contador: 0 }) === '0 communities joined');

  /*
   * 18 y 19 · LOS NOMBRES DE RUTA SON IDENTIFICADORES. Si se tradujeran, la
   * pantalla dejaría de abrir lo que abre.
   */
  const RUTAS = ['Settings', 'Help', 'CommunitiesManagement', 'Idioma', 'EngineAdmin', 'Main'];
  check('18) los seis nombres de ruta siguen escritos tal cual',
    RUTAS.every((r) => new RegExp(`'${r}'`).test(AJUSTES)));
  /*
   * Lo que importa no es que la palabra no exista en el diccionario —"Idioma"
   * es a la vez el nombre de una ruta y una palabra que se lee en una fila—,
   * sino que NINGUNA navegación pase por el traductor.
   */
  check('19) y ninguna navegación pasa por el traductor',
    !/navigate\(t\(/.test(AJUSTES) && !/navigate\(`/.test(AJUSTES));
  check('19) la marca tampoco se traduce',
    /Weë v1\.0\.0/.test(CRUDO) && /World Encode Entity/.test(CRUDO) && /'Weë AI Engine',/.test(AJUSTES));

  /* 15 y 16 · Accesibilidad: no había ninguna y no se añadió ninguna. */
  check('15) no se añadió ninguna etiqueta de accesibilidad',
    (CRUDO.match(/accessibilityLabel=/g) || []).length === 0
    && (CRUDO.match(/accessibilityHint=/g) || []).length === 0);

  /* 20 y 21 · La lógica y la navegación, donde estaban. */
  check('20) la lógica de la pantalla no cambió',
    /const \[allowPrivateReplies, setAllowPrivateReplies\] = useState\(true\);/.test(AJUSTES)
    && /await ubicacion\.activar\('aproximada'\)/.test(AJUSTES) && /await ubicacion\.desactivar\(\)/.test(AJUSTES)
    && /AsyncStorage\.getItem\(ENGINE_ADMIN_FLAG\)/.test(AJUSTES)
    && /const ubicacionNecesitaAjustes =/.test(AJUSTES));
  check('20) ni los interruptores ni sus estados',
    /value=\{ubicacion\.preferencia !== 'off'\}/.test(AJUSTES)
    && /disabled=\{ubicacion\.cargando \|\| pidiendoUbicacion\}/.test(AJUSTES)
    && /onValueChange=\{cambiarUbicacion\}/.test(AJUSTES) && /onValueChange=\{setAllowPrivateReplies\}/.test(AJUSTES));
  check('21) y la navegación tampoco',
    /navigation\.navigate\('CommunitiesManagement'\)/.test(AJUSTES)
    && /\(navigation as any\)\.navigate\('Help', \{ section: 'legal' \}\)/.test(AJUSTES)
    && /\(navigation as any\)\.navigate\('Idioma'\)/.test(AJUSTES)
    && /\(navigation as any\)\.navigate\('EngineAdmin'\)/.test(AJUSTES)
    && /CommonActions\.reset\(\{/.test(AJUSTES));

  /* 22 y 23 · Un solo sistema, y vivo. */
  check('22) sin traductores propios ni ternarios de idioma',
    !/i18next|react-intl|idioma === 'en'|locale === 'en'/.test(AJUSTES)
    && /const \{ t, idioma, disponibles \} = useIdioma\(\);/.test(AJUSTES));
  check('23) nada se congela en el estado: todo se resuelve al pintar',
    !/useState\([^)]*t\('/.test(AJUSTES) && !/useMemo\(\(\) => t\(/.test(AJUSTES));

  /* CONTROL de fase: no se tocó nada de lo ya cerrado. */
  check('23) control: ni notify, ni el panel del motor, ni el perfil',
    /confirmLabel: string,/.test(leer('utils/notify.ts'))
    && /\{t\('engine\.adminOnly'\)\}/.test(leer('screens/EngineAdminScreen.tsx'))
    && /t\('econtact\.acceptLabel', \{ lista: nombreLista \}\)/.test(leer('screens/UserProfileScreen.tsx')));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
