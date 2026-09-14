/*
 * QUIÉN ERES Y CÓMO ENTRAS, EN EL IDIOMA DE QUIEN MIRA (fase 5F).
 *
 * Dos frases que sobrevivieron a todas las fases anteriores por la misma razón:
 * SOLO SE VEN EN ESTADOS QUE LA CUENTA DE PRUEBAS NUNCA ENSEÑABA.
 *
 *   · el botón "Iniciar sesión" de la cabecera aparece cuando NO hay sesión, y
 *     las pruebas siempre se hicieron dentro;
 *   · la fila de la cuenta de la barra lateral dice quién eres y qué identidad
 *     tienes puesta: "Invitado" sin sesión, "Perfil Weë activo" o "Perfil Biz
 *     activo" con esas identidades. Ninguna de las tres se llegó a ver.
 *
 * Las cinco claves YA EXISTÍAN y el cajón del ☰ ya las resolvía. Esta fase no
 * inventa ninguna: pone las dos superficies a leer de donde lee el cajón, que
 * es lo que impide que los dos menús vuelvan a llamar distinto a lo mismo.
 *
 * LO QUE NO SE TOCA: cómo se decide qué identidad está puesta —`hidi` sigue
 * siendo `hidi`, que es el identificador guardado—, la autenticación, las rutas
 * y el nombre de la persona, que se pinta crudo.
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

const CABECERA = soloCodigo(leer('components/Header.tsx'));
const LATERAL = soloCodigo(leer('components/Sidebar.tsx'));
const CAJON = soloCodigo(leer('components/DrawerMenu.tsx'));

const CLAVES = [['menu', 'signIn'], ['common', 'guest'], ['menu', 'tapToSignIn'],
  ['menu', 'activeReal'], ['menu', 'activeWee'], ['menu', 'activeBiz']];

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El botón de entrar de la cabecera ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('1) la cabecera ya no escribe "Iniciar sesión"', !/'Iniciar sesión'|>Iniciar sesión</.test(CABECERA));
  check('2) y lo pide a menu.signIn',
    /<Text style=\{styles\.loginButtonText\}>\{t\('menu\.signIn'\)\}<\/Text>/.test(CABECERA));

  /* CONTROL: el botón sigue siendo el mismo botón. */
  check('2) control: sigue apareciendo solo sin sesión y llevando a lo mismo',
    /\{!user && \(/.test(CABECERA) && /onPress=\{handleLoginPress\}/.test(CABECERA)
    && /style=\{\[styles\.loginButton, \{ backgroundColor: theme\.colors\.accent \}\]\}/.test(CABECERA));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · La fila de la cuenta de la barra lateral ──');
// ════════════════════════════════════════════════════════════════════════════
{
  check('3) ya no escribe "Invitado"', !/'Invitado'/.test(LATERAL));
  check('4) y lo pide a common.guest',
    /\{userProfile\?\.displayName \|\| user\?\.displayName \|\| t\('common\.guest'\)\}/.test(LATERAL));

  check('5) ya no escribe "Toca para iniciar sesión"', !/'Toca para iniciar sesión'/.test(LATERAL));
  check('6) y lo pide a menu.tapToSignIn', /\{!user \? t\('menu\.tapToSignIn'\)/.test(LATERAL));

  check('7) el Perfil Real activo sale de menu.activeReal',
    /t\('menu\.activeReal'\)/.test(LATERAL) && !/'Perfil Real activo'/.test(LATERAL));
  check('8) el Perfil Weë activo, de menu.activeWee',
    /t\('menu\.activeWee'\)/.test(LATERAL) && !/'Perfil Weë activo'/.test(LATERAL));
  check('9) y el Perfil Biz activo, de menu.activeBiz',
    /t\('menu\.activeBiz'\)/.test(LATERAL) && !/'Perfil Biz activo'/.test(LATERAL));

  /* Y lo hace exactamente igual que el cajón: dos menús que son el mismo menú. */
  check('9) las mismas claves que ya resolvía el cajón del ☰',
    /t\('menu\.tapToSignIn'\)/.test(CAJON) && /t\('menu\.activeWee'\)/.test(CAJON)
    && /t\('menu\.activeBiz'\)/.test(CAJON) && /t\('menu\.activeReal'\)/.test(CAJON)
    && /t\('common\.guest'\)/.test(CAJON));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Las seis claves, en los dos idiomas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const faltanEs = CLAVES.filter(([m, k]) => !esT[m]?.[k]).map(([m, k]) => m + '.' + k);
  check('10) las seis existen en español', faltanEs.length === 0, faltanEs.join(' '));
  const faltanEn = CLAVES.filter(([m, k]) => !enT[m]?.[k]).map(([m, k]) => m + '.' + k);
  check('11) y en inglés', faltanEn.length === 0, faltanEn.join(' '));
  const vacias = CLAVES.filter(([m, k]) => !String(enT[m][k] ?? '').trim() || !String(esT[m][k] ?? '').trim())
    .map(([m, k]) => m + '.' + k);
  check('12) ninguna traducción está vacía', vacias.length === 0, vacias.join(' '));

  const fila = (t) => CLAVES.map(([m, k]) => t(`${m}.${k}`)).join(' · ');
  check('13) en español: ' + fila(ES),
    fila(ES) === 'Iniciar sesión · Invitado · Toca para iniciar sesión · Perfil Real activo · Perfil Weë activo · Perfil Biz activo');
  check('14) en inglés: ' + fila(EN),
    fila(EN) === 'Sign in · Guest · Tap to sign in · Real profile active · Weë profile active · Biz profile active');

  /* 15 · Real, Weë y Biz son identidad y sobreviven al viaje. */
  check('15) "Weë" y "Biz" siguen escritos igual en inglés',
    /Weë/.test(EN('menu.activeWee')) && /Biz/.test(EN('menu.activeBiz'))
    && /Real/.test(EN('menu.activeReal')));
  check('15) y "Real profile active" no se convirtió en otra cosa',
    EN('menu.activeReal') === 'Real profile active');

  /* 20 · Sin duplicar: no se crearon gemelas de ninguna de las seis. */
  const gemelas = ['signIn', 'guest', 'tapToSignIn', 'activeReal', 'activeWee', 'activeBiz']
    .filter((k) => Object.entries(esT).filter(([, m]) => k in m).length > 1);
  check('20) ninguna de las seis está repetida en otro módulo', gemelas.length === 0, gemelas.join(' '));
  check('20) y esta fase no añadió ninguna clave nueva',
    !esT.menu?.headerSignIn && !esT.menu?.sidebarGuest && !esT.common?.signIn);

  /* 21 y 22 · El viaje de ida y de vuelta. */
  const iguales = CLAVES.filter(([m, k]) => ES(`${m}.${k}`) === EN(`${m}.${k}`)).map(([m, k]) => m + '.' + k);
  check('21) ES → EN mueve las seis', iguales.length === 0, iguales.join(' '));
  check('22) y EN → ES las devuelve',
    CLAVES.every(([m, k]) => ES(`${m}.${k}`) === esT[m][k] && EN(`${m}.${k}`) === enT[m][k]));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Nada más se movió ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * 16 · LA CONDICIÓN QUE DECIDE QUÉ IDENTIDAD ESTÁ PUESTA ES LA MISMA. Solo
   * cambió lo que hay al otro lado de cada `?`. `hidi` sigue siendo `hidi`:
   * es el identificador guardado y renombrarlo rompería los datos de la gente.
   */
  check('16) la condición del perfil activo no cambió',
    /\{!user \? t\('menu\.tapToSignIn'\) : activeProfileType === 'hidi' \? t\('menu\.activeWee'\) : activeProfileType === 'biz' \? t\('menu\.activeBiz'\) : t\('menu\.activeReal'\)\}/.test(LATERAL));
  check('16) y la identidad activa se sigue leyendo de su contexto',
    /const \{ userProfile, activeProfileType, hasWeeProfile \} = useUserProfile\(\);/.test(LATERAL)
    && /const \{ hasWeeProfile, hasBizProfile, activeProfileType, switchIdentity, switchToBiz \} = useUserProfile\(\);/.test(CABECERA));

  /* 17 · La autenticación, intacta en las dos. */
  check('17) la autenticación no se tocó',
    /const \{ user, logout \} = useAuth\(\);/.test(LATERAL) && /const \{ user \} = useAuth\(\);/.test(CABECERA)
    && /onPress=\{requireLogin\}/.test(LATERAL) && /onPress=\{handleLogout\}/.test(LATERAL));

  /* 18 y 19 · Navegación y rutas, donde estaban. */
  check('18) la navegación de la fila de la cuenta es la de siempre',
    /onPress=\{\(\) => \(user \? goTab\('Profile'\) : requireLogin\(\)\)\}/.test(LATERAL));
  check('19) y las rutas no cambiaron',
    /navigation\.navigate\('WeeProfileCreation'\)/.test(LATERAL) && /navigation\.navigate\('Settings'\)/.test(LATERAL)
    && /navigation\.navigate\('WeeCreator'\)/.test(LATERAL));

  /* 23 y 24 · Ni el diseño ni el responsive: los estilos son los de antes. */
  const estilosLateral = leer('components/Sidebar.tsx');
  check('23) los estilos de la fila de la cuenta no cambiaron',
    /cuentaTextos:/.test(estilosLateral) && /cuentaNombre:/.test(estilosLateral)
    && /cuentaEstado:/.test(estilosLateral) && /numberOfLines=\{1\}/.test(LATERAL));
  check('23) ni los del botón de la cabecera',
    /loginButton:/.test(leer('components/Header.tsx')) && /loginButtonText:/.test(leer('components/Header.tsx')));
  check('24) y el responsive tampoco: el ancho lo sigue poniendo la pantalla',
    /useWindowDimensions\(\)/.test(CABECERA) && /const isWeb = Platform\.OS === 'web';/.test(LATERAL));

  /* El nombre de la persona se pinta crudo, como siempre. */
  check('24) el nombre de quien entra no pasa por el traductor',
    !/t\(userProfile\?\.displayName\)|t\(user\?\.displayName\)/.test(LATERAL));

  /* Sin sistemas paralelos ni ternarios de idioma. */
  check('24) sin traductores propios ni ternarios de idioma',
    !/i18next|react-intl|idioma === 'en'|locale === 'en'/.test(CABECERA + LATERAL)
    && /from '\.\.\/contexts\/IdiomaContext'/.test(leer('components/Header.tsx'))
    && /from '\.\.\/contexts\/IdiomaContext'/.test(leer('components/Sidebar.tsx')));

  /* Y lo que esta fase NO debía tocar sigue igual. */
  const aviso = leer('utils/notify.ts');
  check('24) control: utils/notify.ts y LoginScreen siguen intactos',
    /confirmLabel = 'Sí'/.test(aviso) && !/useT|IdiomaContext/.test(aviso)
    && /<Text style=\{styles\.primaryButtonText\}>Iniciar sesión<\/Text>/.test(leer('screens/LoginScreen.tsx')));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
