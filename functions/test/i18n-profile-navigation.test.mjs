/*
 * LA RUTA QUE FALTABA Y LA PORTADA DEL PERFIL (fase 5M).
 *
 * Dos arreglos pequeños que arrastraban dos fallos distintos:
 *
 *   · CONFIGURACIÓN → MIS COMUNIDADES NO HACÍA NADA. Configuración se monta en
 *     DOS sitios —dentro de la pila del perfil y dentro de la pila principal,
 *     que es la que abren la barra lateral, el ☰ y /settings—. La pantalla de
 *     comunidades solo estaba declarada en la primera, así que desde la segunda
 *     `navigate('CommunitiesManagement')` no encontraba a dónde ir y la fila se
 *     quedaba muerta. Un bug de verdad, no de traducción;
 *
 *   · "AGREGAR PORTADA" SEGUÍA ESCRITO A MANO. Con el inglés puesto, el hueco
 *     de la portada seguía hablando español. Y con él, lo que ese mismo toque
 *     contesta cuando no puede —el permiso denegado y la subida fallida—, que
 *     son la peor mezcla posible: pantalla en un idioma, aviso en otro.
 *
 * LO QUE ESTA PRUEBA DEFIENDE Y NO ES OBVIO:
 *
 *   · LA PANTALLA DE DESTINO ES LA MISMA. No se duplicó, no se copió, no se
 *     hizo una segunda: el mismo archivo, alcanzable desde donde ya se pedía;
 *
 *   · LOS OTROS DOS REGISTROS SIGUEN EN PIE. El de la pila del perfil hace
 *     falta —por ahí se entra desde el Perfil— y el del Home se llama distinto
 *     a propósito (`ExploreCommunities`) y no se toca;
 *
 *   · NADIE CREÓ UN DEEP LINK. El mapa de enlaces de App.tsx no se abre en esta
 *     fase: la ruta se resuelve dentro de la aplicación, como Ayuda o Idioma;
 *
 *   · EL NOMBRE DE LA AGENDA Y LA CIFRA NO SE TRADUCEN. ËContacts es marca y el
 *     número es un dato: entran por hueco en la etiqueta del lector de pantalla.
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
const PERFIL = soloCodigo(CRUDO);

const PRINCIPAL = soloCodigo(leer('navigation/MainStackNavigator.tsx'));
const DEL_PERFIL = soloCodigo(leer('navigation/ProfileStackNavigator.tsx'));
const DEL_HOME = soloCodigo(leer('navigation/HomeStackNavigator.tsx'));
const AJUSTES = soloCodigo(leer('screens/SettingsScreen.tsx'));
const APP = leer('App.tsx');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · "Agregar portada", el leak que abrió la fase ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 1 y 2 · Ya no está escrito a mano, y sale de su clave. */
  check('1) "Agregar portada" ya no está escrito a mano', !/Agregar portada/.test(PERFIL));
  check('2) el hueco de la portada pide profile.addCover',
    /\{t\('profile\.addCover'\)\}/.test(PERFIL));

  /* 3, 4, 5 y 6 · La clave, en los dos idiomas, con el traductor de verdad. */
  check('3) existe en español', !!esT.profile?.addCover);
  check('4) y en inglés', !!enT.profile?.addCover);
  check('5) en español: ' + ES('profile.addCover'), ES('profile.addCover') === 'Agregar portada');
  check('6) en inglés: ' + EN('profile.addCover'), EN('profile.addCover') === 'Add cover');

  /*
   * 7 · Y no hay duplicado. La frase vive en UN solo módulo del diccionario:
   * si alguien la vuelve a escribir en otro, esto lo caza.
   */
  const modulosConLaFrase = Object.entries(esT)
    .filter(([, m]) => Object.values(m).includes('Agregar portada'))
    .map(([nombre]) => nombre);
  check('7) la frase vive en un solo módulo del diccionario',
    modulosConLaFrase.length === 1 && modulosConLaFrase[0] === 'profile',
    modulosConLaFrase.join(' · '));
  check('7) y la clave está declarada una sola vez',
    (leer('i18n/textos/es/profile.ts').match(/^ {2}addCover:/gm) || []).length === 1
    && (leer('i18n/textos/en/profile.ts').match(/^ {2}addCover:/gm) || []).length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Lo que ESE MISMO toque contesta cuando no puede ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * El hueco de la portada y estos dos avisos son el mismo control: el
   * `onPress` de la misma tarjeta. Traducir el rótulo y dejar los avisos en
   * español es exactamente el fallo que se viene cerrando.
   */
  check('8) el permiso de la galería ya no está escrito a mano',
    !/'Permisos'/.test(PERFIL) && !/Se necesitan permisos para acceder a la galería/.test(PERFIL));
  check('9) lo pide por clave, título y cuerpo',
    /Alert\.alert\(t\('profile\.permissionsTitle'\), t\('profile\.galleryPermission'\)\)/.test(PERFIL));

  check('10) la subida fallida ya no está escrita a mano',
    !/No se pudo subir la imagen de portada/.test(PERFIL));
  check('11) y reutiliza common.error, que ya existía',
    /Alert\.alert\(t\('common\.error'\), t\('profile\.coverUploadFailed'\)\)/.test(PERFIL));

  /* 12 y 13 · Las tres frases, en los dos idiomas. */
  for (const [clave, es, en] of [
    ['permissionsTitle', 'Permisos', 'Permissions'],
    ['galleryPermission', 'Se necesitan permisos para acceder a la galería', 'Weë needs permission to access your gallery'],
    ['coverUploadFailed', 'No se pudo subir la imagen de portada', 'The cover image could not be uploaded'],
  ]) {
    check('12) es · profile.' + clave + ': ' + ES('profile.' + clave), ES('profile.' + clave) === es);
    check('13) en · profile.' + clave + ': ' + EN('profile.' + clave), EN('profile.' + clave) === en);
  }

  /*
   * 14 · Y en el bloque de la portada no queda ni una palabra suelta. Se mira
   * el trozo de fuente que va del renderizado del hueco al cierre, más el
   * manejador que lo atiende.
   */
  const bloque = PERFIL.slice(PERFIL.indexOf('const handleBannerSelect'), PERFIL.indexOf('const handleShareProfile'))
    + PERFIL.slice(PERFIL.indexOf('styles.bannerPlaceholder'), PERFIL.indexOf('avatarOverlapContainer'));
  check('14) el bloque de la portada no tiene ni una frase española escrita a mano',
    !/'[^']*[áéíóúñ¿¡][^']*'/.test(bloque), (bloque.match(/'[^']*[áéíóúñ¿¡][^']*'/g) || []).join(' · '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Accesibilidad: la que había, ni una más ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 15 · La pantalla tenía UNA etiqueta de lector de pantalla y decía "Ver mis
   * ËContacts, 12" con el "Ver mis" a mano. Ahora sale del diccionario.
   */
  check('15) la única etiqueta de accesibilidad está traducida',
    /accessibilityLabel=\{t\('profile\.viewMyEcontacts', \{ nombre: misEcontacts\.nombrePlural, total: misEcontacts\.total \}\)\}/.test(PERFIL));
  check('15) y ya no queda el "Ver mis" escrito a mano', !/Ver mis /.test(PERFIL));

  /* 16 · Ni una etiqueta nueva: sigue habiendo exactamente una. */
  const etiquetas = (PERFIL.match(/accessibilityLabel=/g) || []).length;
  const pistas = (PERFIL.match(/accessibilityHint=/g) || []).length;
  check('16) sigue habiendo exactamente una etiqueta y ninguna pista',
    etiquetas === 1 && pistas === 0, etiquetas + ' etiqueta(s) · ' + pistas + ' pista(s)');

  /* 17 · Y los roles no se tocan: el que había sigue tal cual. */
  const roles = (PERFIL.match(/accessibilityRole="[a-z]+"/g) || []);
  check('17) el único rol sigue siendo el mismo',
    roles.length === 1 && roles[0] === 'accessibilityRole="button"', roles.join(' · '));

  /* 18 y 19 · La etiqueta, en los dos idiomas, con la marca y la cifra puestas. */
  check('18) en español: ' + ES('profile.viewMyEcontacts', { nombre: 'ËContacts', total: 12 }),
    ES('profile.viewMyEcontacts', { nombre: 'ËContacts', total: 12 }) === 'Ver mis ËContacts, 12');
  check('19) en inglés: ' + EN('profile.viewMyEcontacts', { nombre: 'ẄContacts', total: 12 }),
    EN('profile.viewMyEcontacts', { nombre: 'ẄContacts', total: 12 }) === 'View my ẄContacts, 12');
  check('19) la marca no se traduce: viaja por hueco en los dos idiomas',
    /\{\{nombre\}\}/.test(esT.profile.viewMyEcontacts) && /\{\{nombre\}\}/.test(enT.profile.viewMyEcontacts));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Lo que escribe una persona sigue crudo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * El nombre visible, el usuario, la biografía y el enlace son de quien mira.
   * Se pintan tal cual: ni traducidos, ni pasados por `t`.
   */
  for (const campo of ['username', 'bio', 'website']) {
    check('20) ' + campo + ' se pinta crudo',
      !new RegExp("t\\([^)]*userProfile[?.]*\\." + campo).test(PERFIL));
  }
  /*
   * Desde la fase 5N el nombre visible SÍ entra en una llamada al traductor —el
   * mensaje de compartir—, pero entra por HUECO: es un valor, no una clave. Se
   * comprueba que ese es su único uso y que la frase lo recibe en `{{nombre}}`,
   * en los dos idiomas.
   */
  const usosDelNombre = PERFIL.split('\n').map((l) => l.trim()).filter((l) => /\bt\('/.test(l) && /userProfile\??\.displayName/.test(l));
  check('20) displayName solo entra en el traductor como valor, nunca como clave',
    usosDelNombre.length === 1
    && /t\('profile\.shareMessage', \{ nombre: userProfile\?\.displayName \?\? '' \}\)/.test(usosDelNombre[0])
    && /\{\{nombre\}\}/.test(esT.profile.shareMessage)
    && /\{\{nombre\}\}/.test(enT.profile.shareMessage),
    usosDelNombre.join(' · '));
  check('21) ningún dato del perfil entra en el traductor',
    !/t\(\s*(?:userProfile|tempDisplayName|tempBio|tempWebsite)/.test(PERFIL));
  check('22) el nombre y el usuario siguen saliendo del perfil, sin envoltorio',
    /\{userProfile\.displayName\}/.test(PERFIL) && /userProfile\.username/.test(PERFIL));

  /* 23 · Y el módulo nuevo no guarda nada que escriba una persona. */
  check('23) el módulo profile solo guarda interfaz',
    Object.values(esT.profile).every((v) => typeof v === 'string' && v.length > 0));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · La ruta que faltaba ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 24, 25 y 26 · Declarada en la pila principal: en el tipo, en el import y en
   * el navegador. Es la pila que monta Configuración cuando se abre desde la
   * barra lateral, el ☰ o /settings.
   */
  check('24) el tipo de la pila principal la declara',
    /^ {2}CommunitiesManagement: undefined;$/m.test(PRINCIPAL));
  check('25) y la pila principal la registra',
    /<Stack\.Screen name="CommunitiesManagement" component=\{CommunitiesManagementScreen\} \/>/.test(PRINCIPAL));
  check('26) apuntando a la pantalla de siempre',
    /import CommunitiesManagementScreen from '\.\.\/screens\/CommunitiesManagementScreen';/.test(PRINCIPAL));

  /* 27 · Una sola vez: registrarla dos veces en la misma pila rompe la navegación. */
  check('27) una sola vez en la pila principal',
    (PRINCIPAL.match(/name="CommunitiesManagement"/g) || []).length === 1
    && (PRINCIPAL.match(/^ {2}CommunitiesManagement: undefined;$/gm) || []).length === 1);

  /* 28 · Configuración sigue pidiéndola con el mismo nombre. */
  check('28) Configuración navega con el mismo nombre de ruta',
    /navigation\.navigate\('CommunitiesManagement'\)/.test(AJUSTES));
  check('28) y sigue siendo la fila de "Mis comunidades"',
    /const handleCommunities = \(\) => \{\s*navigation\.navigate\('CommunitiesManagement'\);/.test(AJUSTES));

  /*
   * 29 · El registro de la pila del perfil SIGUE EN PIE. Por ahí se entra desde
   * el Perfil, y quitarlo rompería justo el camino que sí funcionaba.
   */
  check('29) la pila del perfil la sigue registrando',
    /<Stack\.Screen name="CommunitiesManagement" component=\{CommunitiesManagementScreen\} \/>/.test(DEL_PERFIL)
    && /^ {2}CommunitiesManagement: undefined;$/m.test(DEL_PERFIL));
  check('29) y la pila del perfil sigue teniendo su Configuración',
    /<Stack\.Screen name="Settings" component=\{SettingsScreen\} \/>/.test(DEL_PERFIL));

  /*
   * 30 · El Home la monta con OTRO nombre a propósito —`ExploreCommunities`, la
   * entrada de "Encuentra las tuyas"—. No se toca.
   */
  check('30) el Home sigue montándola como ExploreCommunities',
    /<Stack\.Screen\s+name="ExploreCommunities"\s+component=\{CommunitiesManagementScreen\}\s*\/>/.test(DEL_HOME));
  check('30) y el Home no gana un nombre de ruta nuevo',
    !/name="CommunitiesManagement"/.test(DEL_HOME));

  /* 31 · Ni una pantalla de comunidades de más: la misma, en todas partes. */
  const pantallas = fs.readdirSync(new URL('../../screens/', import.meta.url))
    .filter((f) => /^Communit(y|ies).*Screen\.tsx$/.test(f));
  check('31) siguen siendo dos pantallas de comunidades, las de siempre',
    pantallas.length === 2 && pantallas.includes('CommunitiesManagementScreen.tsx') && pantallas.includes('CommunityScreen.tsx'),
    pantallas.join(' · '));

  /*
   * 32 · Ni un navegador nuevo. Weë tiene SEIS: cinco pilas —Auth, Home, Inbox,
   * la principal y la del perfil— y la barra de pestañas. `NavegacionGlobal` no
   * es un navegador, es la barra que se pinta encima.
   */
  const navegadores = fs.readdirSync(new URL('../../navigation/', import.meta.url)).filter((f) => f.endsWith('.tsx'));
  const fabricas = navegadores
    .map((f) => (leer('navigation/' + f).match(/create(?:Stack|BottomTab|MaterialTopTab)Navigator[<(]/g) || []).length)
    .reduce((a, b) => a + b, 0);
  check('32) no se creó ningún navegador nuevo', fabricas === 6, fabricas + ' navegadores');
  check('32) ni ningún archivo de navegación nuevo', navegadores.length === 7, navegadores.join(' · '));

  /*
   * 33 · Y NADIE ABRIÓ UN DEEP LINK. El mapa de enlaces de App.tsx no menciona
   * la ruta: se resuelve dentro de la aplicación, como Ayuda, Idioma o el panel
   * del motor. Ese problema —el de /Login y compañía— es otra fase.
   */
  check('33) el mapa de deep links no cambió', !/CommunitiesManagement/.test(APP));
  check('33) y sigue teniendo las rutas que ya tenía',
    /Settings: 'settings',/.test(APP) && /Search: 'search',/.test(APP));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Control: no se rediseñó nada ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * La pantalla de destino no cambia en esta fase: se llega a ella, no se toca.
   * Lo que se mira es lo que la hace ser ella.
   */
  const COMUNIDADES = soloCodigo(leer('screens/CommunitiesManagementScreen.tsx'));
  check('34) la pantalla de comunidades sigue igual por dentro',
    /communityService\.joinCommunity/.test(COMUNIDADES)
    && /communityService\.leaveCommunity/.test(COMUNIDADES)
    && /communityService\.createCommunity/.test(COMUNIDADES)
    && /navigation\.goBack\(\)/.test(COMUNIDADES));
  check('34) y su texto sigue saliendo del diccionario de la fase anterior',
    /t\('communities\.searchPlaceholder'\)/.test(COMUNIDADES) && /t\('menu\.communities'\)/.test(COMUNIDADES));

  /* 35 · La pila principal conserva su presentación y sus transiciones. */
  check('35) Configuración sigue abriéndose como hoja',
    /name="Settings"\s+component=\{SettingsWrapper\}\s+options=\{\{ presentation: 'modal' \}\}/.test(PRINCIPAL));
  check('35) y las transiciones de la pila no se tocaron',
    /detachPreviousScreen: false,/.test(PRINCIPAL) && /cardStyle: \{ flex: 1, backgroundColor: theme\.colors\.background \}/.test(PRINCIPAL));

  /*
   * 36 · El perfil no se rediseñó: el hueco de la portada conserva su icono, su
   * tamaño, su fondo y su alto, y los botones del encabezado flotante siguen
   * donde estaban.
   */
  check('36) el hueco de la portada conserva icono y medidas',
    /<Ionicons name="camera-outline" size=\{32\} color=\{theme\.colors\.textSecondary\} \/>/.test(PERFIL)
    && /const BANNER_HEIGHT = 180;/.test(CRUDO));
  check('36) y el encabezado flotante sigue con sus dos botones',
    /<Ionicons name="menu" size=\{22\} color="#fff" \/>/.test(PERFIL)
    && /<Ionicons name="settings-outline" size=\{20\} color="#fff" \/>/.test(PERFIL));
  check('36) el toque de la portada sigue siendo el mismo',
    /onPress=\{handleBannerSelect\}/.test(PERFIL)
    && /onLongPress=\{\(\) => userProfile\?\.bannerURL && setShowBannerViewer\(true\)\}/.test(PERFIL));

  /* 37 · Sin traductores propios ni ternarios de idioma en ninguno de los dos. */
  for (const [nombre, fuente] of [['el perfil', PERFIL], ['la pila principal', PRINCIPAL]]) {
    check('37) ' + nombre + ' no se inventa un traductor',
      !/idioma === 'en'/.test(fuente) && !/locale === 'en'/.test(fuente) && !/i18next|react-intl/.test(fuente));
  }
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · El módulo, cuadrado en los dos idiomas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const clavesEs = Object.keys(esT.profile || {});
  const clavesEn = Object.keys(enT.profile || {});
  check('38) el módulo está cuadrado en los dos idiomas — ' + clavesEs.length,
    clavesEs.length > 0 && clavesEs.length === clavesEn.length && clavesEs.every((k) => clavesEn.includes(k)),
    clavesEs.filter((k) => !clavesEn.includes(k)).join(' · '));
  check('38) ninguna traducción inglesa está vacía',
    clavesEn.every((k) => enT.profile[k].trim().length > 0));

  /* 39 · Registrado en los dos índices, que es lo que lo hace existir. */
  for (const idioma of ['es', 'en']) {
    const indice = leer('i18n/textos/' + idioma + '/index.ts');
    check('39) registrado en el índice ' + idioma,
      /import \{ profile \} from '\.\/profile';/.test(indice) && /^ {2}profile,$/m.test(indice));
  }

  /*
   * 40 · ES → EN mueve TODAS, y EN → ES las devuelve. Una clave que salga igual
   * en los dos idiomas es una traducción que falta.
   */
  /*
   * TRES PALABRAS SE DICEN IGUAL EN LOS DOS IDIOMAS: Media, Reposts y Likes,
   * los nombres de tres pestañas. La lista es cerrada a propósito: cualquier
   * OTRA clave que salga igual en español y en inglés es una traducción que
   * falta, y esto la caza.
   */
  const IGUALES = ['tabMedia', 'tabReposts', 'tabLikes'];
  const movidas = clavesEs.filter((k) => ES('profile.' + k) !== EN('profile.' + k));
  const quietas = clavesEs.filter((k) => !movidas.includes(k));
  check('40) ES → EN mueve todas las claves salvo las tres que se dicen igual',
    quietas.length === IGUALES.length && IGUALES.every((k) => quietas.includes(k)),
    quietas.join(' · '));
  check('40) y EN → ES las devuelve',
    clavesEs.every((k) => ES('profile.' + k) === esT.profile[k]));

  /* 41 · Y la inglesa está en inglés: ni acentos, ni signos de apertura. */
  check('41) la inglesa está en inglés',
    clavesEn.every((k) => !/[áéíóúñ¿¡]/.test(enT.profile[k].replace(/Weë/g, ''))),
    clavesEn.filter((k) => /[áéíóúñ¿¡]/.test(enT.profile[k].replace(/Weë/g, ''))).join(' · '));

  /*
   * 42 · CONTROL. Lo de las fases anteriores sigue en su sitio: si esta fase
   * hubiera arrastrado algo de Configuración o de comunidades, se vería aquí.
   */
  check('42) control: Configuración y comunidades siguen intactas',
    ES('settings.myCommunities') === 'Mis comunidades'
    && EN('settings.myCommunities') === 'My communities'
    && ES('communities.searchPlaceholder') === 'Buscar comunidades...'
    && EN('communities.join') === 'Join');
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
