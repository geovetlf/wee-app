/*
 * BOOST: LA INTERFAZ (screens/Boost*.tsx, components/boost/, services/boostService.ts). Sin emuladores: fuentes.
 *
 * Esta suite vigilaba la pantalla de Boost cuando NO había backend (no cobrar, no reservar, botón «muy pronto»). Desde
 * docs/BOOST.md Boost tiene servidor (functions/src/boost) y la vigilancia cambia de objeto, no de rigor: el cliente
 * sigue sin tocar Credits ni escribir en Firestore, no reserva nada antes de la confirmación, no pinta cifras que el
 * servidor no haya dado, no promete resultados, todo texto sale de i18n y Boost vive solo en la versión App.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\{\s*\}/g, '');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${!ok && detalle ? ` — ${detalle}` : ''}`);
};

const ARCHIVOS = ['screens/BoostScreen.tsx', 'screens/BoostCampaignsScreen.tsx', 'screens/BoostCampaignScreen.tsx',
  'components/boost/PiezasDeBoost.tsx', 'components/boost/MarcoDeBoost.tsx', 'components/boost/PromotedSlot.tsx', 'services/boostService.ts'];
const codigo = Object.fromEntries(ARCHIVOS.map((f) => [f, sinComentarios(leer(f))]));
const todo = Object.values(codigo).join('\n');
const B = codigo['screens/BoostScreen.tsx'];
const D = codigo['screens/BoostCampaignScreen.tsx'];
const S = codigo['services/boostService.ts'];

check('1) el cliente no toca Credits: ni creditsService, ni useWallet, ni el Credit Engine, ni callables de Credits',
  !/creditsService|useWallet|spendCredits|refundCredits|completeCredits|creditEngine|getCreditsBalance/.test(todo));
check('2) el cliente no escribe en Firestore: todo por la callable `boost`',
  !/setDoc|addDoc|updateDoc|deleteDoc|writeBatch|runTransaction/.test(todo) && /httpsCallable<.*>\(functions, 'boost'/.test(S));
check('3) la única llamada que reserva (`crear`) vive en `confirmar`, que solo se pinta en la fase de confirmación',
  (B.match(/boostService\.crear\(/g) || []).length === 1 && /const confirmar = async[\s\S]{0,200}boostService\.crear\(/.test(B)
  && /fase === 'confirm' && peticion && post/.test(B) && /onPress=\{confirmar\}/.test(B) && /onPress=\{\(\) => setFase\('confirm'\)\}/.test(B));
check('4) confirmar no reserva si Boost está cerrado, sin servicio o sin saldo', /deshabilitado=\{!sePuedeContratar \|\| sinSaldo\}/.test(B)
  && /const sePuedeContratar = !!\(opciones\?\.enabled && opciones\.serviceReady\)/.test(B));
check('5) un requestId por petición: reintentar lo mismo no cobra dos veces', /requestIdDe\(clavePeticion\)/.test(B) && /requestIds\.current\.has\(clave\)/.test(B));
check('6) el cliente no manda ningún total, precio ni importe: solo lo elegido',
  !/\b(total|price|amount|cost)\s*:/.test(S) && /budgetCredits: presupuesto/.test(B));
check('7) la estimación sale del servidor y, si no hay, se dice; nunca se multiplica nada',
  /estimacion\.audience\.cuentas/.test(B) && /boost\.estimateNone/.test(B) && /boost\.estimateExplain/.test(B)
  && !/audience\.cuentas\s*\*|Math\.random|\*\s*estimacion/.test(B));
check('8) los resultados son los del servidor y, sin eventos, «Todavía no hay datos»',
  /c\.metrics\.impressions === 0 && c\.metrics\.clicks === 0/.test(D) && /boost\.noData/.test(D) && /boost\.resultsReal/.test(D) && !/Math\.random/.test(D));
check('9) terminar pide confirmación diciendo cuánto se consume y cuánto vuelve', /confirmAction\(/.test(D) && /boost\.endConfirmBody/.test(D) && /consumido:/.test(D) && /devuelto:/.test(D));
const textoSuelto = ARCHIVOS.filter((f) => f.endsWith('.tsx')).filter((f) => /(?<![=\w-])>\s*[A-Za-zÁÉÍÓÚáéíóúÑñ¿¡][^<>{}()=;]*<\//.test(codigo[f]));
check('10) ningún texto de interfaz escrito a mano: todo pasa por t()', textoSuelto.length === 0, textoSuelto.join(', '));
check('11) nada físico de izquierda/derecha ni mayúsculas forzadas (RTL)', !/marginLeft|marginRight|paddingLeft|paddingRight|textAlign: '(left|right)'|textTransform|letterSpacing/.test(todo));
check('12) los números y fechas, con el locale activo', /formato\.numero\(/.test(B) && /formato\.fecha\(/.test(D) && !/toLocaleString\(/.test(todo));

const PILA = leer('navigation/MainStackNavigator.tsx');
const APP = leer('App.tsx');
check('13) rutas registradas: Boost, BoostCampaigns y BoostCampaign, con dirección propia',
  ['name="Boost" component={BoostScreen}', 'name="BoostCampaigns" component={BoostCampaignsScreen}', 'name="BoostCampaign" component={BoostCampaignScreen}'].every((x) => PILA.includes(x))
  && /BoostCampaigns: 'boost\/promociones'/.test(APP) && /BoostCampaign: 'boost\/promocion\/:campaignId'/.test(APP));
check('14) se llega desde una publicación propia y desde una página',
  /navigate\('Boost', \{ tipo: 'post', id: displayPost\.id! \}\)/.test(leer('components/PostCard.tsx'))
  && /navigate\('Boost', \{ tipo: 'page', id: pagina\.id \}\)/.test(leer('screens/WeePageScreen.tsx')));
check('15) las páginas todavía no se impulsan, y la pantalla lo dice', /tipo === 'page'/.test(B) && /boost\.pageNotAvailable/.test(B));

const WEB = leer('screens/WebLandingScreen.tsx');
const NAT = leer('screens/LandingScreen.tsx');
const P = codigo['components/boost/PromotedSlot.tsx'];
check('16) la distribución está en el Inicio de la App (web y nativo), marcada como «Promocionado»',
  /<PromotedSlot pintar=/.test(WEB) && /<PromotedSlot pintar=/.test(NAT) && /boost\.promoted/.test(P) && /boostService\.servir\(\)/.test(P) && /boostService\.clic\(/.test(P));
check('17) sin promoción no se pinta nada (ni hueco, ni relleno)', /if \(!servida\) return null;/.test(P));
const creator = ['constants/espacioProfesional.ts']
  .concat(fs.readdirSync(path.join(RAIZ, 'components/workspace')).map((f) => `components/workspace/${f}`))
  .filter((f, i, a) => a.indexOf(f) === i && fs.existsSync(path.join(RAIZ, f)) && fs.statSync(path.join(RAIZ, f)).isFile());
check('18) Boost no aparece en Weë Creator (versión profesional, sin nada social)', creator.length > 1 && creator.every((f) => !/Boost|PromotedSlot|boostService/.test(leer(f))), creator.join(','));

/* i18n: el módulo existe en TODOS los diccionarios, con las mismas claves que el español. */
/* Las formas de plural extra no cuentan como claves distintas: `_few`/`_many` (ruso, polaco…) y también `_zero`/`_two`, que
 * árabe, irlandés y hebreo llevan legítimamente con su `ConPlurales` (integración i18n global, 2026-11-05). */
const claves = (src) => [...src.matchAll(/^  ([A-Za-z0-9_]+): '/gm)].map((m) => m[1]).filter((k) => !/_(zero|two|few|many)$/.test(k)).sort().join(',');
const ES = claves(leer('i18n/textos/es/boost.ts'));
const idiomas = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((d) => fs.existsSync(path.join(RAIZ, `i18n/textos/${d}/index.ts`)));
const malos = idiomas.filter((l) => !fs.existsSync(path.join(RAIZ, `i18n/textos/${l}/boost.ts`)) || claves(leer(`i18n/textos/${l}/boost.ts`)) !== ES || !/import \{ boost \} from '\.\/boost';/.test(leer(`i18n/textos/${l}/index.ts`)));
check(`19) el módulo boost está en los ${idiomas.length} diccionarios con las mismas claves y registrado`, idiomas.length >= 16 && malos.length === 0, malos.join(','));
check('20) las claves que usa la interfaz existen en el español',
  [...todo.matchAll(/'boost\.([A-Za-z0-9_]+)'/g)].map((m) => m[1]).every((k) => ES.split(',').includes(k) || ES.split(',').includes(`${k}_one`)));
check('21) ningún texto promete resultados: el español lo dice', /no promete/.test(leer('i18n/textos/es/boost.ts')));

const REGLAS = leer('firestore.rules');
check('22) reglas: campañas solo legibles por su cuenta y nunca escritas por un cliente; bloqueos, ajustes y registros cerrados',
  /match \/boostCampaigns\/\{campaignId\} \{\s*allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid;\s*allow create, update, delete: if false;\s*match \/\{sub=\*\*\} \{\s*allow read, write: if false;/.test(REGLAS)
  && /match \/boostPostLocks\/\{postId\} \{\s*allow read, write: if false;/.test(REGLAS) && /match \/boostSettings\/\{docId\} \{\s*allow read, write: if false;/.test(REGLAS));

const pkg = JSON.parse(leer('functions/package.json'));
check('23) las suites de Boost están en la cadena', ['boost-interfaz', 'boost-motor'].every((s) => pkg.scripts.test.includes(`test/${s}.test.mjs`)));

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
