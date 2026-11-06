/*
 * WEË VERSIÓN CREATOR: LA CUENTA DENTRO DEL MARCO (2026-11-05, segunda fase).
 *
 * Vigila lo que creator hace con lo que es de la cuenta sin tocar nada de la versión app:
 *   A) el perfil puesto sobrevive a recargar /creator, y solo así;
 *   B) Configuración y la billetera se ven dentro del marco, sin tienda ni recargas;
 *   C) lo que es de la cuenta, abierto sin sesión, pide iniciarla;
 *   D) los títulos de marca en latín empiezan, en RTL, del lado del texto traducido.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (rel) => readFileSync(join(RAIZ, rel), 'utf8');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

const NAV = leer('navigation/EspacioProfesionalNavigator.tsx');
const MARCO = leer('components/workspace/MarcoProfesional.tsx');
const RECUERDO = leer('components/workspace/RecuerdoDelPerfil.tsx');
const CTX = leer('contexts/UserProfileContext.tsx');
const BILLETERA = leer('screens/WalletCreatorScreen.tsx');
/* El código, sin comentarios: el docblock explica precisamente lo que no hay. */
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CODIGO_BILLETERA = sinComentarios(BILLETERA);
const CUENTA = leer('components/workspace/ConCuentaEnCreator.tsx');
const TITULOS = leer('components/workspace/titulosDeCreator.ts');
const APP = leer('App.tsx');

/* A) EL PERFIL PUESTO, AL RECARGAR. */
check('A1) el contexto del perfil sigue igual: en memoria, sin almacenamiento ni modo', /useState<ProfileType>\('real'\)/.test(CTX) && !/localStorage|EspacioProfesional|creator/i.test(CTX));
check('A2) solo devuelve en una carga que EMPEZÓ en /creator, mirada una vez al cargar el módulo',
  RECUERDO.includes(String.raw`const CARGA_DIRECTA_EN_CREATOR = EN_LA_WEB && /^\/creator(\/|$)/.test(window.location.pathname);`)
  && RECUERDO.includes('const A_DEVOLVER: Guardado | null = CARGA_DIRECTA_EN_CREATOR ? leer() : null;'));
check('A3) una sola vez por carga de página', /let yaDecidido = false;/.test(RECUERDO) && /!yaDecidido && A_DEVOLVER\?\.tipo === 'hidi'/.test(RECUERDO));
check('A4) solo si lo guardado es de esta cuenta', /A_DEVOLVER\.uid !== user\.uid\) \{ terminar\(\); return; \}/.test(RECUERDO));
check('A5) solo el Perfil Weë, si la cuenta lo tiene, y desde el Real', /A_DEVOLVER\.tipo === 'hidi' && hasWeeProfile && activeProfileType === 'real'/.test(RECUERDO));
check('A6) espera a la sesión y a los perfiles de ESTA sesión', /if \(!esperando \|\| cargandoSesion\) return;/.test(RECUERDO) && /realProfile\?\.uid === user\.uid/.test(RECUERDO));
check('A7) hace lo mismo que el cajón: switchIdentity y el tema oscuro de la app', /switchIdentity\(\);\s*setThemeMode\('dark'\);/.test(RECUERDO) && /switchIdentity\(\);\s*setThemeMode\('dark'\);/.test(leer('components/DrawerMenu.tsx')));
check('A8) nunca crea perfiles', !/ensureWeeProfile|setWeeProfile|ensureRealProfile|usersService/.test(RECUERDO));
check('A9) el almacenamiento, siempre dentro de try/catch', (RECUERDO.match(/window\.localStorage\./g) || []).length === 3 && (RECUERDO.match(/try \{/g) || []).length >= 3);
check('A10) no guarda antes de decidir (pisaría lo guardado con el Real del arranque)', /if \(!EN_LA_WEB \|\| esperando \|\| cargandoSesion\) return;/.test(RECUERDO));
check('A11) al salir de creator se olvida', /useEffect\(\(\) => \(\) => \{\s*yaDecidido = true;\s*if \(EN_LA_WEB\) borrar\(\);/.test(RECUERDO));
check('A12) se monta solo en la pila de creator, y creator sigue clara', /<RecuerdoDelPerfil>/.test(NAV) && NAV.includes('<TemaClaro>'));
check('A13) entrar en creator desde la app no cambia nada: ni la pila ni el marco cambian el perfil', !/switchIdentity|setThemeMode/.test(NAV + MARCO));

/* B) CONFIGURACIÓN Y BILLETERA, DENTRO DEL MARCO. */
check('B1) la pila de creator registra Configuración, la billetera y la tienda con el mismo nombre', /name="Settings" component=\{AjustesDeCreator\}/.test(NAV) && /name="Wallet" component=\{BilleteraDeCreator\}/.test(NAV) && /name="CreditStore" component=\{SinTiendaEnCreator\}/.test(NAV));
check('B2) la tienda, en creator, lleva a la billetera', /navigation\.replace\('Wallet'\)/.test(NAV) && !/CreditStoreScreen/.test(NAV));
check('B3) el marco abre Configuración y el saldo DENTRO de su pila', /alPulsar: \(\) => abrir\('Settings'\)/.test(MARCO) && /<CreditsPill compact=\{!isDesktop\} onPress=\{\(\) => abrir\('Wallet'\)\} \/>/.test(MARCO) && !/navigate\('Settings'\)/.test(MARCO));
check('B4) la billetera de creator lee de los mismos sitios: useWallet y el historial del servicio', /useWallet\(\)/.test(BILLETERA) && /creditsService\.subscribeToTransactions\(/.test(BILLETERA));
check('B5) sin recargar, sin tienda, sin compra, sin escribir Credits', !/topUp|CreditStore|navigate\(|purchase|comprar|spendCredits|httpsCallable|paquete/i.test(CODIGO_BILLETERA));
check('B6) dirección propia dentro de /creator, sin tocar la de la app', /MisCreaciones: 'creaciones',\s*\/\*[^*]*\*\/\s*Settings: 'ajustes',\s*Wallet: 'billetera',\s*(?:\/\*[^*]*\*\/\s*Travel: \{ path: 'travel\/:pantalla\/:id\?'[^\n]*\n\s*)?\},\s*\} \}\),/.test(APP) && /^      Settings: 'settings',$/m.test(APP) && /CreditStore: \{ path: 'credits'/.test(APP) && /Wallet: \{ path: 'wallet'/.test(APP));
check('B7) la WalletScreen de la app no se toca: sigue con su botón de recargar', /t\('credits\.topUp'\)/.test(leer('screens/WalletScreen.tsx')));

/* C) LO DE LA CUENTA, SIN SESIÓN. */
check('C1) flujo, proyectos, proyecto, creaciones y billetera piden cuenta', ['CreatorFlowScreen', 'ProjectsScreen', 'ProjectScreen', 'MisCreacionesScreen', 'WalletCreatorScreen'].every((n) => NAV.includes(`conCuentaEnCreator(${n})`)));
check('C2) espera a la sesión antes de decidir', /if \(loading\) return <Esperando \/>;\s*if \(!user\) return <PideCuentaEnCreator \/>;/.test(CUENTA));
check('C3) con textos que ya existen', /t\('auth\.signInToContinue'\)/.test(CUENTA) && /t\('menu\.signIn'\)/.test(CUENTA));

/* D) TÍTULOS EN RTL. */
check('D1) la cabecera compartida no se toca para esto', !/creatorDir|titulosDeCreator/.test(leer('components/creator/CabeceraDeSeccion.tsx')));
check('D2) la regla solo vale dentro del marco de creator en RTL', TITULOS.includes(`'[data-creator-dir="rtl"] h1[dir="auto"]{direction:rtl}'`) && /dataSet: \{ creatorDir: dir\.direccion \}/.test(MARCO) && /alinearTitulosDeCreator\(\);/.test(MARCO));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
