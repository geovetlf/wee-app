/*
 * LA PUERTA DE ENTRADA, EN EL IDIOMA DE QUIEN LLAMA (fase 5G).
 *
 * `LoginScreen` era la última pantalla entera sin traducir. Se había salvado de
 * todas las fases por la misma razón que el botón de la cabecera: SOLO SE VE SIN
 * SESIÓN, y las pruebas siempre se hicieron dentro.
 *
 * TRES COSAS QUE ESTA PRUEBA DEFIENDE Y QUE NO SON OBVIAS:
 *
 *   · LOS CÓDIGOS DE ERROR NO SE TRADUCEN. `auth/user-not-found` y sus hermanos
 *     los manda Firebase y son identificadores; lo que cambia es la frase a la
 *     que lleva cada uno. El `switch` sigue mirando los mismos cuatro códigos;
 *
 *   · EL DETALLE DEL PROVEEDOR TAMPOCO. Cuando Google o el acceso anónimo
 *     fallan, el mensaje del SDK entra por `{{detalle}}` y sale sin tocar: es lo
 *     que dijo el servidor, y traducirlo sería inventárselo;
 *
 *   · Y EL `default` DEL `switch` SIGUE ENSEÑANDO `error.message`, que es lo que
 *     enseñaba antes. Esta fase no decide qué error se ve, solo en qué idioma.
 *
 * Además: la pantalla no se rediseñó. Los estilos, el teclado, el scroll, el
 * área segura y los caminos de autenticación son los de antes, y hay controles
 * para cada uno.
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

const CRUDO = leer('screens/LoginScreen.tsx');
const LOGIN = soloCodigo(CRUDO);

/* Las 26 claves del módulo nuevo, tal y como las usa la pantalla. */
const PANTALLA = ['welcome', 'signInToContinue', 'email', 'emailPlaceholder', 'password',
  'passwordPlaceholder', 'forgotPassword', 'orContinueWith', 'continueWithGoogle',
  'enterAsGuest', 'noAccount', 'registerHere', 'signingIn'];
const ERRORES = ['fillAllFields', 'signInFailed', 'authErrorTitle', 'errUserNotFound',
  'errWrongPassword', 'errInvalidEmail', 'errUserDisabled', 'googleFailed', 'anonymousFailed',
  'emailRequiredTitle', 'emailRequired', 'emailSentTitle', 'resetEmailSent', 'resetFailed'];
const CLAVES = [...PANTALLA, ...ERRORES];

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Ya no queda español escrito a mano ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const FRASES = ['Bienvenido a Weë', 'Inicia sesión para continuar', 'Contraseña', 'Tu contraseña',
    '¿Olvidaste tu contraseña?', 'Iniciar sesión', 'O continúa con', 'Continuar con Google',
    'Entrar como invitado', '¿No tienes cuenta?', 'Regístrate aquí', 'Iniciando sesión',
    'Por favor completa todos los campos', 'No existe una cuenta con este email',
    'Contraseña incorrecta', 'Email inválido', 'Esta cuenta ha sido deshabilitada',
    'Error de Autenticación', 'Error al iniciar sesión', 'Error al acceder de forma anónima',
    'Email requerido', 'Email enviado', 'Revisa tu correo electrónico',
    'Error al enviar email de restablecimiento', 'tu@email.com'];
  const quedan = FRASES.filter((f) => LOGIN.includes(f));
  check('1) ninguna de las 25 frases sigue en la pantalla', quedan.length === 0, quedan.join(' | '));

  check('1) y no se coló un traductor propio ni un ternario de idioma',
    !/i18next|react-intl|idioma === 'en'|locale === 'en'|TEXTOS\s*=/.test(LOGIN)
    && /import \{ useT \} from '\.\.\/contexts\/IdiomaContext';/.test(CRUDO)
    && /const t = useT\(\);/.test(LOGIN));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Las claves, en los dos idiomas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const faltanEs = CLAVES.filter((k) => !esT.auth?.[k]);
  check('2) las 27 claves existen en español', faltanEs.length === 0, faltanEs.join(' '));
  const faltanEn = CLAVES.filter((k) => !enT.auth?.[k]);
  check('3) y en inglés', faltanEn.length === 0, faltanEn.join(' '));

  const vacias = CLAVES.filter((k) => !String(esT.auth[k] ?? '').trim() || !String(enT.auth[k] ?? '').trim());
  check('4) ninguna traducción está vacía', vacias.length === 0, vacias.join(' '));

  /*
   * "Email" se escribe igual en los dos idiomas a propósito: es la misma
   * palabra. Es la ÚNICA que puede coincidir; cualquier otra sería un olvido.
   */
  const copiadas = CLAVES.filter((k) => esT.auth[k] === enT.auth[k] && k !== 'email');
  check('4) y ninguna se quedó en español, salvo "Email", que es la misma palabra',
    copiadas.length === 0, copiadas.join(' '));

  const conAcento = CLAVES.filter((k) => /[áéíóúñ¿¡]/i.test(String(enT.auth[k]).replace(/Weë/g, '')));
  check('4) la inglesa está en inglés', conAcento.length === 0, conAcento.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Lo que se lee en la pantalla ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 5 · Títulos y subtítulo. */
  check('5) el título y el subtítulo salen de sus claves',
    /<Text style=\{styles\.title\}>\{t\('auth\.welcome'\)\}<\/Text>/.test(LOGIN)
    && /<Text style=\{styles\.subtitle\}>\{t\('auth\.signInToContinue'\)\}<\/Text>/.test(LOGIN));

  /*
   * 6 · LOS BOTONES. El de entrar reutiliza `menu.signIn`, la misma clave que la
   * cabecera: es la misma acción y tiene que decir lo mismo en los dos sitios.
   */
  check('6) el botón de entrar reutiliza menu.signIn',
    /<Text style=\{styles\.primaryButtonText\}>\{t\('menu\.signIn'\)\}<\/Text>/.test(LOGIN)
    && !esT.auth?.signIn, 'sin duplicar en auth');
  check('6) y los otros dos botones, sus claves',
    /\{t\('auth\.continueWithGoogle'\)\}/.test(LOGIN) && /\{t\('auth\.enterAsGuest'\)\}/.test(LOGIN));

  /* 7 · Los dos campos: etiqueta y placeholder. */
  check('7) las etiquetas y los placeholders de los dos campos',
    /\{t\('auth\.email'\)\}/.test(LOGIN) && /placeholder=\{t\('auth\.emailPlaceholder'\)\}/.test(LOGIN)
    && /\{t\('auth\.password'\)\}/.test(LOGIN) && /placeholder=\{t\('auth\.passwordPlaceholder'\)\}/.test(LOGIN));

  /* 9 · El estado de carga. */
  check('9) el estado de carga',
    /<Text style=\{styles\.loadingText\}>\{t\('auth\.signingIn'\)\}<\/Text>/.test(LOGIN));

  /* Y el resto de la pantalla. */
  check('9) el separador, el enlace de la contraseña y el de registro',
    /\{t\('auth\.orContinueWith'\)\}/.test(LOGIN) && /\{t\('auth\.forgotPassword'\)\}/.test(LOGIN)
    && /\{t\('auth\.noAccount'\)\}/.test(LOGIN) && /\{t\('auth\.registerHere'\)\}/.test(LOGIN));

  /*
   * 10 · ACCESSIBILITY. La pantalla no tenía ninguna etiqueta y esta fase no
   * añade ninguna: sería rediseñar, no traducir. Se comprueba que no se PERDIÓ
   * nada —no había nada— y queda anotado como pendiente.
   */
  check('10) no se eliminó ninguna etiqueta de accesibilidad',
    (CRUDO.match(/accessibilityLabel|accessibilityHint|accessibilityRole/g) || []).length === 0);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Los errores: la frase sí, el código no ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 8 · Los cuatro errores con frase propia, más los títulos de los avisos. */
  check('8) los cuatro códigos llevan ahora a una clave',
    /case 'auth\/user-not-found':\s*\n\s*errorMessage = t\('auth\.errUserNotFound'\);/.test(LOGIN)
    && /case 'auth\/wrong-password':\s*\n\s*errorMessage = t\('auth\.errWrongPassword'\);/.test(LOGIN)
    && /case 'auth\/invalid-email':\s*\n\s*errorMessage = t\('auth\.errInvalidEmail'\);/.test(LOGIN)
    && /case 'auth\/user-disabled':\s*\n\s*errorMessage = t\('auth\.errUserDisabled'\);/.test(LOGIN));

  check('8) y los avisos de campos, correo pedido y correo enviado',
    /alert\(t\('auth\.fillAllFields'\)\)/.test(LOGIN)
    && /t\('auth\.emailRequired'\)/.test(LOGIN) && /t\('auth\.emailRequiredTitle'\)/.test(LOGIN)
    && /t\('auth\.resetEmailSent'\)/.test(LOGIN) && /t\('auth\.emailSentTitle'\)/.test(LOGIN)
    && /Alert\.alert\(t\('auth\.authErrorTitle'\), errorMessage\)/.test(LOGIN));

  /* Cuatro avisos usan el título genérico: campos, Google, invitado y reenvío. */
  check('8) el título genérico reutiliza common.error',
    (LOGIN.match(/Alert\.alert\(t\('common\.error'\)/g) || []).length === 4
    && !/Alert\.alert\('Error'/.test(LOGIN));

  /*
   * 17 · LOS CÓDIGOS SIGUEN SIENDO LOS MISMOS CUATRO, escritos igual. Si alguien
   * los tradujera, el `switch` dejaría de reconocer lo que manda Firebase y
   * todos los errores caerían en el `default`.
   */
  const CODIGOS = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email', 'auth/user-disabled'];
  check('17) los cuatro códigos de Firebase están intactos',
    CODIGOS.every((c) => LOGIN.includes(`case '${c}':`)) && !/case t\(/.test(LOGIN));
  check('17) y ninguno acabó en el diccionario',
    !CODIGOS.some((c) => JSON.stringify(esT).includes(c) || JSON.stringify(enT).includes(c)));

  /*
   * 16 · EL DETALLE DEL PROVEEDOR ENTRA POR HUECO Y SALE TAL CUAL. Se prueba con
   * lo que de verdad manda un SDK, incluido un texto que ya lleva llaves.
   */
  check('16) el mensaje del proveedor viaja por {{detalle}}, sin traducir',
    /t\('auth\.googleFailed', \{ detalle: error\.message \}\)/.test(LOGIN)
    && /t\('auth\.anonymousFailed', \{ detalle: error\.message \}\)/.test(LOGIN)
    && /t\('auth\.resetFailed', \{ detalle: error\.message \}\)/.test(LOGIN)
    && !/t\(error\.message\)/.test(LOGIN));
  const DETALLES = ['Network request failed', 'auth/popup-closed-by-user', '{{detalle}}', 'ERROR: 400'];
  const rotos = DETALLES.filter((d) =>
    !ES('auth.googleFailed', { detalle: d }).endsWith(d) || !EN('auth.resetFailed', { detalle: d }).endsWith(d));
  check('16) y sale exactamente como entró', rotos.length === 0, rotos.join(' | '));

  /* Y el `default` sigue enseñando lo que dijo el proveedor. */
  check('16) el default del switch no cambió',
    /default:\s*\n\s*errorMessage = error\.message;/.test(LOGIN));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · ES y EN, ejecutado ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const fila = (t) => [t('auth.welcome'), t('auth.signInToContinue'), t('menu.signIn'),
    t('auth.enterAsGuest'), t('auth.registerHere')].join(' · ');

  check('11) en español: ' + fila(ES),
    fila(ES) === 'Bienvenido a Weë · Inicia sesión para continuar · Iniciar sesión · Entrar como invitado · Regístrate aquí');
  check('12) en inglés: ' + fila(EN),
    fila(EN) === 'Welcome to Weë · Sign in to continue · Sign in · Continue as a guest · Sign up here');

  const errores = (t) => [t('auth.errWrongPassword'), t('auth.errUserNotFound'), t('auth.fillAllFields')].join(' · ');
  check('11) y los errores en español: ' + errores(ES),
    errores(ES) === 'Contraseña incorrecta · No existe una cuenta con este email · Por favor completa todos los campos');
  check('12) y en inglés: ' + errores(EN),
    errores(EN) === 'Incorrect password · There is no account with this email · Please fill in every field');

  /* 13 y 14 · El viaje de ida y de vuelta. */
  const iguales = CLAVES.filter((k) => ES(`auth.${k}`) === EN(`auth.${k}`) && k !== 'email');
  check('13) ES → EN mueve las 26 que tienen que moverse', iguales.length === 0, iguales.join(' '));
  check('14) y EN → ES las devuelve',
    CLAVES.every((k) => ES(`auth.${k}`) === esT.auth[k] && EN(`auth.${k}`) === enT.auth[k]));

  /* 15 · Los nombres propios sobreviven al viaje. */
  check('15) "Weë" y "Google" no se traducen',
    /Weë/.test(EN('auth.welcome')) && /Google/.test(EN('auth.continueWithGoogle'))
    && /Google/.test(EN('auth.googleFailed', { detalle: 'x' })),
    EN('auth.welcome') + ' · ' + EN('auth.continueWithGoogle'));

  /* 21 · Sin duplicar. */
  check('21) el módulo auth es nuevo y no repite ninguna clave de otro',
    !esT.auth?.signIn && !esT.auth?.error && !esT.auth?.guest
    && Object.values(esT).filter((m) => Object.values(m).includes('Iniciar sesión')).length === 1);
  check('22) y está registrado en los dos índices, sin diccionario paralelo',
    /import \{ auth \} from '\.\/auth';/.test(leer('i18n/textos/es/index.ts'))
    && /import \{ auth \} from '\.\/auth';/.test(leer('i18n/textos/en/index.ts'))
    && /^ {2}auth,$/m.test(leer('i18n/textos/es/index.ts')) && /^ {2}auth,$/m.test(leer('i18n/textos/en/index.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Ni el diseño, ni el teclado, ni la autenticación ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* 18 · Los cuatro caminos de entrada y la recuperación, intactos. */
  check('18) los caminos de autenticación son los de siempre',
    /const \{ user, signIn, signInWithGoogle, signInAnonymously, resetPassword \} = useAuth\(\);/.test(LOGIN)
    && /await signIn\(email, password\);/.test(LOGIN) && /await signInWithGoogle\(\);/.test(LOGIN)
    && /await signInAnonymously\(\);/.test(LOGIN) && /await resetPassword\(email\);/.test(LOGIN));
  check('18) y el botón de Google sigue apareciendo solo si puede funcionar',
    /const conGoogle = googleSignInDisponible\(\);/.test(LOGIN) && /\{conGoogle && \(/.test(LOGIN));

  /* 19 y 24 · Las rutas y la salida de la modal. */
  check('19) la navegación no cambió',
    /navigation\.navigate\('Register' as never\)/.test(LOGIN)
    && (LOGIN.match(/navigation\.canGoBack\(\)/g) || []).length === 5);
  check('24) y sigue cerrándose sola al entrar',
    /useEffect\(\(\) => \{\s*\n\s*if \(user\) \{/.test(LOGIN));

  /* 20 · Cada botón sigue llamando a lo suyo. */
  check('20) las acciones de los botones son las mismas',
    /onPress=\{handleEmailLogin\}/.test(LOGIN) && /onPress=\{handleGoogleLogin\}/.test(LOGIN)
    && /onPress=\{handleAnonymousLogin\}/.test(LOGIN) && /onPress=\{handleForgotPassword\}/.test(LOGIN)
    && /onPress=\{navigateToRegister\}/.test(LOGIN));

  /*
   * 23 · LA ESTRUCTURA VISUAL ES LA MISMA. Ni un estilo nuevo, ni uno menos:
   * se cuentan los del archivo y se comprueban los que sostienen la pantalla.
   */
  check('23) los estilos son exactamente los mismos',
    /container: \{\s*\n\s*flex: 1,\s*\n\s*backgroundColor: '#FFFFFF',/.test(CRUDO)
    && /primaryButton: \{\s*\n\s*backgroundColor: '#F5B731',\s*\n\s*borderRadius: 10,\s*\n\s*padding: 12,/.test(CRUDO)
    && /registerContainer: \{\s*\n\s*flexDirection: 'row',\s*\n\s*justifyContent: 'center',/.test(CRUDO)
    && /divider: \{\s*\n\s*flexDirection: 'row',/.test(CRUDO));
  check('23) y la jerarquía de la pantalla no se movió',
    /styles\.header[\s\S]{0,400}styles\.title[\s\S]{0,200}styles\.subtitle/.test(LOGIN)
    && /styles\.form[\s\S]{0,4000}styles\.registerContainer/.test(LOGIN));

  /*
   * 11 y 23 · EL TECLADO Y EL MÓVIL. Nada de esto se tocó, y si se tocara la
   * pantalla se rompería en el teléfono sin que se notara en la web.
   */
  check('23) el teclado, el scroll y el área segura siguen igual',
    /<SafeAreaView style=\{styles\.container\}>/.test(LOGIN)
    && /<EspacioDeEscritura/.test(LOGIN) && /keyboardShouldPersistTaps="handled"/.test(LOGIN)
    && /keyboardType="email-address"/.test(LOGIN) && /autoCapitalize="none"/.test(LOGIN)
    && /secureTextEntry=\{!showPassword\}/.test(LOGIN));

  /* CONTROL de fase: no se tocó nada de lo que ya estaba cerrado. */
  check('23) control: ni utils/notify, ni la cabecera, ni el registro',
    /confirmLabel = 'Sí'/.test(leer('utils/notify.ts'))
    && /<Text style=\{styles\.loginButtonText\}>\{t\('menu\.signIn'\)\}<\/Text>/.test(leer('components/Header.tsx'))
    && /'Crear cuenta'|Registr/.test(leer('screens/RegisterScreen.tsx')));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
