/*
 * EL CIERRE DE LA MIGRACIÓN (fase 5P).
 *
 * Lo que quedaba suelto después de dieciséis fases: el alta, la entrada de
 * comunidades del Home, el selector de avatar, los Credits que hablaban en
 * español con el inglés puesto, la grafía de los filtros, el "volver" repetido
 * en cuatro sitios, la cotización de Weë Brain y las treinta y ocho etiquetas
 * de lector de pantalla escritas a mano.
 *
 * SEIS COSAS QUE ESTA PRUEBA DEFIENDE Y NO SON OBVIAS:
 *
 *   · HAY UNA SOLA CLAVE DE VOLVER. Había cuatro diciendo lo mismo —`common`,
 *     `econtact`, `saved`, `weeai`— y nueve sitios con la palabra a mano, unos
 *     en español y otros en inglés dentro de la interfaz española;
 *
 *   · EL IDENTIFICADOR NO ES LA ETIQUETA. Los filtros del Home cambian de
 *     grafía visible y NO de `id`: los `id` reparten el muro y viajan dentro de
 *     lo ya publicado;
 *
 *   · EL CÓDIGO DE FIREBASE SIGUE SIENDO UN CÓDIGO. El alta lo traduce a una
 *     frase de Weë; lo que manda el proveedor se enseña tal cual;
 *
 *   · LA COTIZACIÓN NO DEPENDE DE LO QUE DIGA EL SERVIDOR. El cliente ya sabe
 *     si pidió búsqueda: elige la frase él, y las Functions no se tocan;
 *
 *   · EL SELECTOR DE AVATAR SE ABRE DESDE CUATRO PANTALLAS y en las cuatro dice
 *     lo mismo, porque el texto vive en un módulo, no en una de ellas;
 *
 *   · NI "Reels", NI "hidi", NI "WEË AI" ASOMAN A LA INTERFAZ. Los tres siguen
 *     existiendo como nombres técnicos, que es donde deben estar.
 *
 * Se usa el traductor de verdad de Weë, el mismo que corre en la aplicación.
 */
import fs from 'node:fs';
import { textosDe, traductorDe } from './i18n-ayuda.mjs';

const RAIZ = new URL('../../', import.meta.url);
const leer = (p) => fs.readFileSync(new URL(p, RAIZ), 'utf8');
/*
 * EL CÓDIGO SIN COMENTARIOS. Con una trampa que costó encontrar: los de bloque
 * se quitan SOLO cuando abren la línea, porque `input.accept = 'image/*'` es una
 * cadena y no un comentario, y sin el ancla se tragaba doscientas líneas hasta
 * el siguiente cierre —con las cuatro alertas del selector de avatar dentro—.
 */
const soloCodigo = (t) => t
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/console\.(log|error|warn|info)\([^;]*\);/g, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const ES = await traductorDe('es');
const EN = await traductorDe('en');
const esT = textosDe('es');
const enT = textosDe('en');

const ACENTOS = /[áéíóúÁÉÍÓÚñÑ¿¡]/;
const PALABRAS = /(^|\s)(el|la|los|las|de|del|no|se|un|una|para|con|que|tu|tus|sin|por|al|ya|más|aún)(\s|$)/i;
const RE_CADENA = new RegExp("'((?:[^'\\\\]|\\\\.)*)'|\"([^\"]*)\"", 'g');

/** Lo que queda escrito a mano y se lee en pantalla. */
const frasesSueltas = (ruta) => {
  const s = soloCodigo(leer(ruta));
  const fuera = [];
  for (const m of s.matchAll(/>\s*([A-Za-zÀ-ÿ][^<>{}]{2,70})\s*</g)) fuera.push(m[1].trim());
  for (const m of s.matchAll(RE_CADENA)) {
    const v = m[1] ?? m[2];
    if (v && v.length > 3 && (ACENTOS.test(v) || PALABRAS.test(v))) fuera.push(v);
  }
  return [...new Set(fuera)];
};

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El alta, entera ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const ALTA = soloCodigo(leer('screens/RegisterScreen.tsx'));

  check('1) no queda ni una frase escrita a mano', frasesSueltas('screens/RegisterScreen.tsx').length === 0,
    frasesSueltas('screens/RegisterScreen.tsx').join(' · '));
  check('2) usa el traductor de Weë', /import \{ useT \} from '\.\.\/contexts\/IdiomaContext';/.test(ALTA) && /const t = useT\(\);/.test(ALTA));
  check('2) y comparte módulo con el acceso, que es la misma puerta',
    /t\('auth\.createAccount'\)/.test(ALTA) && !/t\('register\./.test(ALTA));

  /* 3 · Las cinco comprobaciones previas, con su título y su explicación. */
  const PREVIAS = ['emailMissing', 'emailCheck', 'passwordMissing', 'passwordShort', 'passwordsMismatch'];
  for (const c of PREVIAS) {
    check('3) ' + c + ' avisa con título y explicación',
      new RegExp(`notify\\(t\\('auth\\.${c}Title'\\), t\\('auth\\.${c}'\\)\\)`).test(ALTA)
      && !!esT.auth[c + 'Title'] && !!enT.auth[c + 'Title'] && !!esT.auth[c] && !!enT.auth[c]);
  }

  /*
   * 4 · EL CÓDIGO DE FIREBASE SIGUE SIENDO UN CÓDIGO. La pantalla lo traduce a
   * una frase de Weë; el identificador no se toca, y lo que mande el proveedor
   * por su cuenta se enseña tal cual.
   */
  for (const [codigo, clave] of [
    ['auth/email-already-in-use', 'auth.errEmailInUse'],
    ['auth/invalid-email', 'auth.errInvalidEmail'],
    ['auth/weak-password', 'auth.errWeakPassword'],
    ['auth/operation-not-allowed', 'auth.errSignUpNotAllowed'],
  ]) {
    check('4) ' + codigo + ' → ' + clave,
      new RegExp(`case '${codigo.replace(/\//g, '\\/')}':\\s*\\n\\s*errorMessage = t\\('${clave.replace('.', '\\.')}'\\);`).test(ALTA));
  }
  /* El detalle técnico del proveedor va al registro; la persona ve la frase genérica de Weë (cierre de F11). */
  /* `soloCodigo` quita los `console.*`; el aviso al registro se busca en el fuente crudo. */
  check('4) y el mensaje técnico del proveedor no se enseña: al registro y frase de Weë',
    /default:\s*\n\s*errorMessage = t\('auth\.signUpFailed'\);/.test(ALTA)
    && !/errorMessage = error\.message/.test(ALTA) && !/notify\([^\n]*error\.message\)/.test(ALTA)
    && /console\.warn\('Alta fallida:', error\?\.code \|\| error\);/.test(leer('screens/RegisterScreen.tsx')));
  check('4) los códigos siguen siendo identificadores, no frases', /'auth\/email-already-in-use'/.test(ALTA));

  /* 5 · Lo que reutiliza en vez de copiar. */
  for (const clave of ['auth.email', 'auth.emailPlaceholder', 'auth.password', 'auth.continueWithGoogle', 'auth.enterAsGuest', 'settings.privacyPolicy']) {
    check('5) reutiliza ' + clave, new RegExp(`t\\('${clave.replace('.', '\\.')}'\\)`).test(ALTA));
  }
  check('5) y no duplicó la política de privacidad', !('privacyPolicy' in esT.auth));

  /* 6 · El aviso legal, en cuatro trozos porque dos son enlaces. */
  check('6) el aviso legal va por partes y ninguna está a medias',
    /t\('auth\.termsIntro'\)/.test(ALTA) && /t\('auth\.termsOfService'\)/.test(ALTA)
    && /t\('auth\.termsAnd'\)/.test(ALTA) && /t\('settings\.privacyPolicy'\)/.test(ALTA));

  /* 7 · Y los dos idiomas dicen lo que tienen que decir. */
  check('7) es: ' + ES('auth.createAccount') + ' / ' + ES('auth.createAccountButton'),
    ES('auth.createAccount') === 'Crea tu cuenta' && ES('auth.createAccountButton') === 'Crear cuenta');
  check('8) en: ' + EN('auth.createAccount') + ' / ' + EN('auth.createAccountButton'),
    EN('auth.createAccount') === 'Create your account' && EN('auth.createAccountButton') === 'Create account');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · La entrada de comunidades del Home ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const ENTRADA = soloCodigo(leer('components/CommunitiesEntry.tsx'));
  check('9) no queda ni una frase escrita a mano', frasesSueltas('components/CommunitiesEntry.tsx').length === 0,
    frasesSueltas('components/CommunitiesEntry.tsx').join(' · '));
  check('10) el título reutiliza menu.communities', /\{t\('menu\.communities'\)\}/.test(ENTRADA));
  check('10) el hueco y el botón reutilizan los de comunidades',
    /placeholder=\{t\('communities\.searchPlaceholder'\)\}/.test(ENTRADA) && /\{t\('communities\.create'\)\}/.test(ENTRADA));
  check('11) y las dos etiquetas también salen del diccionario',
    /accessibilityLabel=\{t\('communities\.searchLabel'\)\}/.test(ENTRADA)
    && /accessibilityLabel=\{t\('nav\.search'\)\}/.test(ENTRADA)
    && /accessibilityLabel=\{t\('communities\.create'\)\}/.test(ENTRADA));
  check('12) es: ' + ES('communities.findYours'), ES('communities.findYours') === 'Encuentra las tuyas.');
  check('13) en: ' + EN('communities.findYours'), EN('communities.findYours') === 'Find yours.');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El selector de avatar, el mismo en cuatro pantallas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const AVATAR = soloCodigo(leer('components/avatars/AvatarPicker.tsx'));
  check('14) no queda ni una frase escrita a mano', frasesSueltas('components/avatars/AvatarPicker.tsx').length === 0,
    frasesSueltas('components/avatars/AvatarPicker.tsx').join(' · '));

  /* 15 · Tiene módulo propio porque lo abren cuatro pantallas distintas. */
  const QUIENES = ['screens/OnboardingScreen.tsx', 'screens/WeeProfileCreationScreen.tsx', 'screens/ProfileScreen.tsx'];
  check('15) lo abren tres pantallas, y por eso el texto vive en su módulo',
    QUIENES.every((p) => /AvatarPicker/.test(leer(p))) && !!esT.avatar && !!enT.avatar);

/* + cierre 2026-10-01: estos avisos pasan de Alert.alert (vacío en la web) a notify; mismas claves. */
  check('16) las dos alertas piden clave', /notify\(t\('common\.error'\), t\('avatar\.pickFailed'\)\)/.test(AVATAR)
    && /notify\(t\('common\.error'\), t\('avatar\.photoFailed'\)\)/.test(AVATAR) && !/Alert\.alert\(/.test(AVATAR));
  /* El motivo técnico va al registro (`console.error`), no a la persona: cierre de F11. */
  check('16) y el motivo del sistema queda en el registro, no en la frase',
    !/motivo: error\?\.message/.test(AVATAR) && /console\.error\('Error picking image:', error\)/.test(leer('components/avatars/AvatarPicker.tsx'))
    && !/\{\{/.test(esT.avatar.pickFailed) && !/\{\{/.test(enT.avatar.pickFailed));
  check('17) los dos permisos reutilizan composer.permissionsNeeded',
    (AVATAR.match(/notify\(t\('composer\.permissionsNeeded'\)/g) || []).length === 2
    && !('permissionsNeeded' in esT.avatar));
  check('18) el "volver" es el común, en el texto y en la etiqueta',
    (AVATAR.match(/t\('common\.back'\)/g) || []).length === 2);
  check('19) es: ' + ES('avatar.title') + ' · en: ' + EN('avatar.title'),
    ES('avatar.title') === 'Seleccionar Avatar' && EN('avatar.title') === 'Choose an avatar');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · "Volver": una sola clave en toda la aplicación ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 20 · Había CUATRO claves diciendo lo mismo y nueve sitios con la palabra
   * escrita a mano —unos en español y otros en inglés dentro de la interfaz
   * española—. Ahora hay una, y esto lo caza el día que vuelva a haber dos.
   */
  const conBack = Object.entries(esT).filter(([, m]) => typeof m.back === 'string').map(([n]) => n);
  check('20) solo un módulo guarda la palabra', conBack.length === 1 && conBack[0] === 'common', conBack.join(' · '));
  check('20) y en inglés igual',
    Object.entries(enT).filter(([, m]) => typeof m.back === 'string').length === 1);
  check('21) es: ' + ES('common.back') + ' · en: ' + EN('common.back'),
    ES('common.back') === 'Volver' && EN('common.back') === 'Back');

  /* 22 · Y los nueve sitios la piden a ella. */
  const SITIOS = ['screens/AgregarUbicacionScreen.tsx', 'screens/CreateScreen.tsx', 'screens/CommunityScreen.tsx',
    'screens/UserProfileScreen.tsx', 'screens/PostDetailScreen.tsx', 'screens/EngineAdminScreen.tsx',
    'screens/HelpScreen.tsx', 'screens/EContactScreen.tsx', 'screens/SavedPostsScreen.tsx',
    'components/Header.tsx', 'components/avatars/AvatarPicker.tsx', 'components/creator/CreatorShell.tsx'];
  const sinMigrar = SITIOS.filter((p) => !/t\('common\.back'\)/.test(leer(p)));
  check('22) los doce sitios piden la clave común', sinMigrar.length === 0, sinMigrar.join(' · '));
  const conPalabra = SITIOS.filter((p) => /accessibilityLabel="(Back|Volver)"|>\s*(Back|Volver)\s*</.test(soloCodigo(leer(p))));
  check('22) y ninguno la lleva escrita a mano', conPalabra.length === 0, conPalabra.join(' · '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Los Credits, en palabras ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const FLUJO = soloCodigo(leer('screens/CreatorFlowScreen.tsx'));
  const PLAN = soloCodigo(leer('components/creator/PlanCard.tsx'));
  const RESULTADO = soloCodigo(leer('components/creator/ResultCard.tsx'));
  const AVATARIA = soloCodigo(leer('screens/AiAvatarScreen.tsx'));

  check('23) lo disponible y lo que cuesta',
    /t\('weeai\.creditsAvailable', \{ saldo: formato\.numero\(shortfall\.available\) \}\)/.test(FLUJO)
    && /t\('weeai\.costLine', \{ coste: formato\.numero\(shortfall\.required\) \}\)/.test(FLUJO));
  check('24) el precio de prueba del plan', /t\('weeai\.testPriceSuffix'\)/.test(PLAN));
  check('25) lo que se gastó, con la nota por hueco',
    /t\('weeai\.youSpent', \{/.test(RESULTADO) && /nota: job\.pricingMode === 'simulated' \? t\('weeai\.testPriceParenthesis'\) : ''/.test(RESULTADO)
    && /t\('weeai\.spentNothing'\)/.test(RESULTADO));
  check('26) el costo del avatar, con los tres estados',
    /t\('weeai\.costFailed'\)/.test(AVATARIA) && /t\('weeai\.calculatingTheCost'\)/.test(AVATARIA)
    && /t\('weeai\.avatarCost', \{/.test(AVATARIA) && /t\('weeai\.youHaveLeft', \{ saldo: formato\.numero\(walletBalance\) \}\)/.test(AVATARIA));

  /* 27 · Las cifras siguen saliendo del formato de la fase 5O, no de una plantilla. */
  check('27) las cifras siguen pasando por el formato de Weë',
    (FLUJO.match(/formato\.numero\(/g) || []).length === 2
    && /formato\.numero\(creditsEstimated\)/.test(PLAN)
    && /formato\.numero\(job\.creditsCharged\)/.test(RESULTADO)
    && /formato\.numero\(walletBalance\)/.test(AVATARIA));
  check('27) y no volvió ningún toLocaleString con el idioma clavado',
    ![FLUJO, PLAN, RESULTADO, AVATARIA].some((f) => /toLocaleString\('e[sn]'\)/.test(f)));

  /* 28 · Los dos idiomas, con una cifra real dentro. */
  check('28) es: ' + ES('weeai.creditsAvailable', { saldo: '12.400' }),
    ES('weeai.creditsAvailable', { saldo: '12.400' }) === 'Credits disponibles: 12.400');
  check('29) en: ' + EN('weeai.creditsAvailable', { saldo: '12,400' }),
    EN('weeai.creditsAvailable', { saldo: '12,400' }) === 'Credits available: 12,400');
  check('30) "Credits" sigue siendo marca en los dos idiomas',
    ES('weeai.creditsAvailable', { saldo: '1' }).includes('Credits') && EN('weeai.creditsAvailable', { saldo: '1' }).includes('Credits'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · La cotización de Weë Brain ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const BRAIN = soloCodigo(leer('screens/BrainChatScreen.tsx'));
  /*
   * 31 · El cliente YA SABE si pidió búsqueda: elige la frase él, en vez de
   * pintar la que manda el servidor. Así no hay español dentro de la pantalla
   * ni hace falta tocar las Functions.
   */
  check('31) la frase la elige el cliente con lo que ya sabe',
    /\{t\(webSearch \? 'weeai\.quoteSearch' : 'weeai\.quoteBrain'\)\}/.test(BRAIN));
  check('31) y ya no pinta la etiqueta que manda el servidor', !/chat\.quote\.label/.test(BRAIN));
  check('32) es: ' + ES('weeai.quoteSearch') + ' / ' + ES('weeai.quoteBrain'),
    ES('weeai.quoteSearch') === 'Búsqueda con fuentes' && ES('weeai.quoteBrain') === 'Respuesta de Weë Brain');
  check('33) en: ' + EN('weeai.quoteSearch') + ' / ' + EN('weeai.quoteBrain'),
    EN('weeai.quoteSearch') === 'Search with sources' && EN('weeai.quoteBrain') === 'Weë Brain answer');
  /* 34 · Y las Functions no se tocaron: eso es otra cosa y otro despliegue. */
  check('34) el servidor sigue como estaba',
    /label: webSearch \? 'Búsqueda con fuentes' : 'Respuesta de Weë Brain'/.test(leer('functions/src/creator/brain.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Los filtros: identificador ≠ etiqueta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const FILTROS = leer('utils/feedFilters.ts');
  /* 35 · Los identificadores mandan el reparto del muro: intactos. */
  check('35) los identificadores internos no se movieron',
    ['all', 'studio', 'travel', 'music', 'chef', 'design', 'business'].every((id) => FILTROS.includes(`{ id: '${id}'`)));
  check('35) y el tipo tampoco',
    /export type HomeSectionId = 'all' \| 'studio' \| 'travel' \| 'music' \| 'chef' \| 'design' \| 'business';/.test(FILTROS));

  /* 36 · Las etiquetas visibles, con la grafía aprobada de producto. */
  check('36) las seis marcas llevan la grafía aprobada',
    ['Weë Studio', 'Weë Travel', 'Weë Music', 'Weë Chef', 'Weë Design', 'Weë Business']
      .every((n) => FILTROS.includes(`label: '${n}' }`)));
  check('36) y no queda ninguna de las viejas',
    !/WeeStudio|WeeTravel|WeeMusic|WeeChef|WeeDesign|WEEBusiness/.test(FILTROS));

  /* 37 · "Todo" sigue siendo la única que es interfaz, y sigue siendo clave. */
  check('37) solo "Todo" lleva clave, y el catálogo no traduce',
    (FILTROS.match(/clave: '/g) || []).length === 1
    && /\{ id: 'all', label: 'Todo', clave: 'home\.filterAll' \}/.test(FILTROS)
    && !/\bt\(/.test(soloCodigo(FILTROS)));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Las etiquetas de lector de pantalla ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 38 · LA AUDITORÍA GLOBAL. Se recorren todos los .tsx del cliente buscando
   * etiquetas escritas a mano. Quedan cuatro, y las cuatro por un motivo:
   * "Weë" es marca; `ErrorBoundary` es una clase y no puede usar hooks;
   * `HomeGreeting` tiene cambios locales ajenos que no se tocan; y la de
   * `TravelLauncher` es solo datos, sin ninguna palabra de interfaz.
   */
  const archivos = [];
  for (const dir of ['screens', 'components', 'components/avatars', 'components/creator', 'navigation']) {
    for (const f of fs.readdirSync(new URL(dir + '/', RAIZ))) {
      if (f.endsWith('.tsx')) archivos.push(dir + '/' + f);
    }
  }
  const RE = /accessibility(Label|Hint|Value)=(?:"([^"]*)"|\{'([^']*)'\}|\{`([^`]*)`\})/g;
  const aMano = [];
  for (const ruta of archivos) {
    const s = leer(ruta).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    for (const m of s.matchAll(RE)) {
      const v = m[2] ?? m[3] ?? m[4];
      if (v) aMano.push(ruta + ' → ' + v);
    }
  }
  /*
   * `ErrorBoundary` SALIÓ de esta lista al llegar el chino: su botón ya no dice
   * «Intentar de nuevo» a pelo. No pasó por i18n —esa pantalla vive fuera del
   * proveedor de idioma a propósito, para sobrevivir a que reviente—, sino por
   * `i18n/emergencia.ts`, que es un módulo sin dependencias con las tres frases
   * de la pantalla de error en los idiomas que Weë habla.
   */
  /*
   * Al entrar el japonés salieron dos más: la pista de la lupa de `HomeGreeting`
   * pasó a `home.searchHint`, y la etiqueta de las filas de `TravelLauncher`
   * —que pegaba título y detalle con un punto latino— a `weeai.titleWithDetail`,
   * porque la puntuación también es de cada idioma (en japonés, 「。」).
   */
  const PERMITIDAS = [
    'screens/AgregarUbicacionScreen.tsx → Weë',
  ];
  const nuevas = aMano.filter((e) => !PERMITIDAS.includes(e));
  check('38) no queda ninguna etiqueta localizable escrita a mano', nuevas.length === 0, nuevas.join(' | '));
  check('38) y la única que queda es la conocida, ni una más', aMano.length === PERMITIDAS.length, String(aMano.length));

  /* 39 · Las que se migraron dicen lo mismo en los dos idiomas. */
  for (const [clave, es, en] of [
    ['wall.closeComments', 'Cerrar comentarios', 'Close comments'],
    ['wall.sendComment', 'Enviar comentario', 'Send comment'],
    ['common.loadMore', 'Cargar más publicaciones', 'Load more posts'],
    ['writer.titleLabel', 'Título del documento', 'Document title'],
    ['weeai.previousMonth', 'Mes anterior', 'Previous month'],
  ]) {
    check('39) ' + clave + ': ' + ES(clave) + ' / ' + EN(clave), ES(clave) === es && EN(clave) === en);
  }

  /* 40 · Y las que llevan un dato lo reciben por hueco, no pegado. */
  for (const clave of ['home.bannerOf', 'home.weelSample', 'credits.youHaveLabel', 'weeai.startWith',
    'weeai.optionCredits', 'weeai.emojiLabel', 'weeai.chooseProposal', 'weeai.continueVia']) {
    const [mod, k] = clave.split('.');
    check('40) ' + clave + ' recibe su dato por hueco',
      /\{\{[a-z]+\}\}/.test(esT[mod][k]) && /\{\{[a-z]+\}\}/.test(enT[mod][k]));
  }
  check('41) y funcionan con un dato real — ' + ES('home.bannerOf', { numero: 2, total: 4 }),
    ES('home.bannerOf', { numero: 2, total: 4 }) === 'Banner 2 de 4'
    && EN('home.bannerOf', { numero: 2, total: 4 }) === 'Banner 2 of 4');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Los términos prohibidos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 42 · "Reels", "hidi" y "WEË AI" no pueden asomar a la interfaz. Siguen
   * existiendo como nombres técnicos —la ruta `Reels`, el `profileType: 'hidi'`,
   * el WEË AI ENGINE en los comentarios— y ahí se quedan.
   */
  const diccionarios = [esT, enT];
  const conProhibido = [];
  for (const T of diccionarios) {
    for (const [modulo, claves] of Object.entries(T)) {
      for (const [k, v] of Object.entries(claves)) {
        if (/\bReels?\b|\bhidi\b|WEË AI/.test(v)) conProhibido.push(modulo + '.' + k + ' = ' + v);
      }
    }
  }
  check('42) ningún diccionario los enseña', conProhibido.length === 0, conProhibido.join(' | '));

  /* 43 · Ni el texto suelto de ninguna pantalla. */
  const archivos = [];
  for (const dir of ['screens', 'components', 'components/avatars', 'components/creator']) {
    for (const f of fs.readdirSync(new URL(dir + '/', RAIZ))) if (f.endsWith('.tsx')) archivos.push(dir + '/' + f);
  }
  const enPantalla = [];
  for (const ruta of archivos) {
    const s = soloCodigo(leer(ruta));
    /*
     * Solo TEXTO: si el trozo lleva paréntesis, punto y coma o igual, es código
     * que quedó entre un mayor y un menor, no algo que alguien lea.
     */
    for (const m of s.matchAll(/>\s*([^<>{}();=]{2,80})\s*</g)) {
      if (/\bReels?\b|\bhidi\b|WEË AI/.test(m[1])) enPantalla.push(ruta + ' → ' + m[1].trim());
    }
  }
  check('43) ni el texto suelto de ninguna pantalla', enPantalla.length === 0, enPantalla.join(' | '));

  /* 44 · Y la marca correcta sí está donde tiene que estar. */
  check('44) la marca de la IA se escribe Weë AI', ES('menu.creator') === 'Weë AI' && EN('menu.creator') === 'Weë AI');
  check('44) y el visor de videos se llama Weëls', ES('wall.viewInWeels').includes('Weëls') && EN('wall.viewInWeels').includes('Weëls'));

  /* 45 · Lo técnico sigue intacto: es lo que hace que esto no sea un renombrado. */
  check('45) la ruta Reels sigue existiendo como nombre técnico',
    /<Stack\.Screen\s*\n?\s*name="Reels"/.test(leer('navigation/MainStackNavigator.tsx')));
  check('45) y el identificador heredado del Perfil Weë también',
    /activeProfileType === 'hidi'/.test(leer('screens/ProfileScreen.tsx')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── J · El diccionario, cuadrado de punta a punta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 46 · Los dos idiomas tienen los mismos módulos y las mismas claves. */
  const modEs = Object.keys(esT).sort();
  const modEn = Object.keys(enT).sort();
  check('46) los mismos módulos en los dos idiomas — ' + modEs.length,
    JSON.stringify(modEs) === JSON.stringify(modEn),
    modEs.filter((m) => !modEn.includes(m)).concat(modEn.filter((m) => !modEs.includes(m))).join(' · '));

  const descuadradas = [];
  let total = 0;
  for (const m of modEs) {
    for (const k of Object.keys(esT[m])) {
      total++;
      if (enT[m]?.[k] === undefined) descuadradas.push(m + '.' + k + ' (falta en inglés)');
    }
    for (const k of Object.keys(enT[m] || {})) {
      if (esT[m]?.[k] === undefined) descuadradas.push(m + '.' + k + ' (sobra en inglés)');
    }
  }
  check('46) y las mismas claves — ' + total, descuadradas.length === 0, descuadradas.join(' · '));

  /* 47 · Ninguna inglesa vacía, y ninguna con acentos españoles. */
  const vacias = [];
  const conAcento = [];
  for (const m of modEn) {
    for (const [k, v] of Object.entries(enT[m])) {
      if (!String(v).trim()) vacias.push(m + '.' + k);
      /* Las marcas de Weë, y los préstamos que en inglés también llevan tilde. */
      const sinMarcas = String(v).replace(/Weë|Weël|Weëls|Wäll|ËContacts?|ẄContacts?|Résumé|café/g, '');
      if (ACENTOS.test(sinMarcas)) conAcento.push(m + '.' + k + ' = ' + v);
    }
  }
  check('47) ninguna traducción inglesa está vacía', vacias.length === 0, vacias.join(' · '));
  check('47) y la inglesa está en inglés', conAcento.length === 0, conAcento.join(' · '));

  /* 48 · Los dos módulos nuevos, registrados donde tienen que estar. */
  for (const idioma of ['es', 'en']) {
    const indice = leer('i18n/textos/' + idioma + '/index.ts');
    check('48) el módulo del avatar está registrado en ' + idioma,
      /import \{ avatar \} from '\.\/avatar';/.test(indice) && /^ {2}avatar,$/m.test(indice));
  }

  /* 49 · Ni un diccionario paralelo, ni un ternario de idioma, en todo el cliente. */
  const archivos = [];
  for (const dir of ['screens', 'components', 'components/avatars', 'components/creator', 'utils', 'hooks', 'contexts']) {
    for (const f of fs.readdirSync(new URL(dir + '/', RAIZ))) {
      if (/\.(tsx|ts)$/.test(f)) archivos.push(dir + '/' + f);
    }
  }
  const conTernario = archivos.filter((p) => /(idioma|locale) === '(es|en)'\s*\?/.test(soloCodigo(leer(p))));
  check('49) ningún ternario de idioma decide un texto', conTernario.length === 0, conTernario.join(' · '));
  const conLibreria = archivos.filter((p) => /i18next|react-intl|formatjs|lingui|react-i18next/.test(leer(p)));
  check('49) ni se coló otra librería de traducción', conLibreria.length === 0, conLibreria.join(' · '));
  const conDiccionario = archivos.filter((p) => /const (TEXTOS|TRADUCCIONES|STRINGS|LABELS|DICCIONARIO) = \{/.test(soloCodigo(leer(p))));
  check('49) ni un diccionario paralelo dentro de un componente', conDiccionario.length === 0, conDiccionario.join(' · '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── K · Control: lo cerrado en las fases anteriores sigue cerrado ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('50) los números siguen con el formato de la 5O',
    ES('communities.members', { contador: 12400 }) === '12.400 miembros'
    && EN('communities.members', { contador: 12400 }) === '12,400 members');
  check('50) y los plurales siguen siendo de Intl.PluralRules',
    ES('wall.pollVotes', { contador: 1 }) === '1 voto' && EN('wall.pollVotes', { contador: 0 }) === '0 votes');
  check('51) el perfil, las comunidades y Configuración siguen en su sitio',
    ES('profile.addCover') === 'Agregar portada' && EN('profile.addCover') === 'Add cover'
    && ES('settings.myCommunities') === 'Mis comunidades' && EN('communities.join') === 'Join');
  check('52) y el año sigue sin separador', ES('settings.aboutBody', { anio: 2026 }).includes('2026'));
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
