/*
 * WeëTravel · el workspace completo (prototipo navegable con datos DEMO, 2026-11-06).
 *
 * Comprobaciones estáticas sobre el código —sin comentarios— de screens/travel, components/travel y sus datos:
 * seis módulos registrados, ninguna pantalla sin ruta, nada de emojis como iconos, ningún texto escrito a mano,
 * los datos DEMO aparte y marcados, ninguna llamada a Firestore ni a la red desde la interfaz de Travel, ninguna
 * dependencia nueva, las cajas de escribir son la caja común de Weë Brain, y la rama de Weë Creator (`pro`) intacta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const soloCodigo = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const listar = (d) => fs.readdirSync(path.resolve(RAIZ, d)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${d}/${f}`);
const UI = [...listar('screens/travel'), ...listar('components/travel'), 'components/sectores/PortadaTravel.tsx'];
const TODO = [...UI, 'constants/travelDemo.ts', 'utils/travelItinerario.ts', 'services/travelDemoStore.ts', 'hooks/useTravelDemo.ts', 'hooks/useTextosDeTravel.ts'];
const codigo = Object.fromEntries(TODO.map((f) => [f, soloCodigo(leer(f))]));

console.log('\n── A · Seis módulos, todas las pantallas con ruta ──');
{
  const demo = codigo['constants/travelDemo.ts'];
  const ids = [...(demo.match(/export const MODULOS[\s\S]*?\n\];/) || [''])[0].matchAll(/id: '(\w+)'/g)].map((m) => m[1]);
  check('1) MODULOS declara los seis módulos', JSON.stringify(ids) === JSON.stringify(['descubrir', 'planear', 'viajes', 'explorar', 'asistente', 'comunidad']), ids.join(','));
  const rutas = codigo['screens/travel/rutas.ts'];
  const pantallas = [...(rutas.match(/PANTALLAS_DE_TRAVEL: PantallaDeTravel\[\] = \[([\s\S]*?)\];/) || ['', ''])[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
  const mapa = codigo['screens/travel/TravelScreen.tsx'];
  const sinPantalla = pantallas.filter((p) => !new RegExp(`\\b${p}: \\w+Screen`).test(mapa));
  check(`2) cada una de las ${pantallas.length} pantallas tiene su componente en TravelScreen`, pantallas.length >= 38 && sinPantalla.length === 0, sinPantalla.join(','));
  check('3) cada módulo tiene su pantalla principal', ids.every((id) => pantallas.includes(id)));
  const sinModulo = pantallas.filter((p) => !new RegExp(`\\b${p}: '(descubrir|planear|viajes|explorar|asistente|comunidad)'`).test(rutas));
  check('4) cada pantalla pertenece a un módulo (su tono la diferencia visualmente)', sinModulo.length === 0, sinModulo.join(','));
  const pila = soloCodigo(leer('navigation/MainStackNavigator.tsx'));
  check('5) la ruta Travel está en la pila principal, con su tipo', /<Stack\.Screen name="Travel" component=\{TravelScreen\} \/>/.test(pila) && /Travel: ParametrosDeTravel;/.test(pila));
  check('6) y tiene dirección web propia que solo deja pasar identificadores', /Travel: \{ path: 'travel\/:pantalla\/:id\?'/.test(soloCodigo(leer('App.tsx'))));
  const tema = codigo['components/travel/tema.ts'];
  const tonos = ['descubrir', 'planear', 'viajes', 'explorar', 'asistente', 'comunidad'].map((m) => (tema.match(new RegExp(`${m}: \\{ fuerte: '(#[0-9A-F]{6})'`)) || [])[1]);
  check('7) seis tonos distintos, uno por módulo', tonos.every(Boolean) && new Set(tonos).size === 6, tonos.join(' '));
}

console.log('\n── B · Iconos de línea, sin emojis; ningún texto a mano ──');
{
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
  const conEmoji = TODO.filter((f) => EMOJI.test(codigo[f]));
  check('8) ningún emoji en la interfaz ni en los datos de Travel', conEmoji.length === 0, conEmoji.join(', '));
  const es = leer('i18n/textos/es/travel.ts');
  const definidas = new Set([...es.matchAll(/^  (\w+):/gm)].map((m) => m[1].replace(/_(one|other)$/, '')));
  const usadas = new Set();
  for (const f of TODO) for (const m of codigo[f].matchAll(/['"`]travel\.(\w+)['"`]/g)) usadas.add(m[1]);
  for (const id of ['cusco', 'santorini', 'kyoto', 'paris', 'oaxaca', 'lisboa', 'islandia', 'marrakech', 'bali', 'costaRica']) for (const s of ['Name', 'Desc', 'A1', 'A2', 'A3', 'F1', 'F2', 'Transport']) usadas.add(id + s);
  const faltan = [...usadas].filter((k) => !definidas.has(k));
  check(`9) las ${usadas.size} claves usadas existen en el español`, faltan.length === 0, faltan.join(' '));
  const sueltos = UI.filter((f) => f.endsWith('.tsx')).flatMap((f) => [...codigo[f].matchAll(/(?<!=)>\s*([A-Za-zÀ-ÿ][^<>{}()&=!?\n]{2,})\s*</g)].map((m) => `${f}: ${m[1].trim()}`)).filter((x) => !/: (Weë|Travel)$/.test(x));
  check('10) ningún texto JSX escrito a mano', sueltos.length === 0, sueltos.slice(0, 5).join(' | '));
  const idiomas = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos')).filter((d) => fs.existsSync(path.resolve(RAIZ, `i18n/textos/${d}/index.ts`)));
  const sinModulo = idiomas.filter((l) => !fs.existsSync(path.resolve(RAIZ, `i18n/textos/${l}/travel.ts`)) || !/import \{ travel \} from '\.\/travel';/.test(leer(`i18n/textos/${l}/index.ts`)) || !/^\s*travel,\s*$/m.test(leer(`i18n/textos/${l}/index.ts`)));
  check(`11) el módulo travel está en los ${idiomas.length} diccionarios y registrado`, idiomas.length === 42 && sinModulo.length === 0, sinModulo.join(','));
  check('12) las fechas, el dinero y las distancias salen de i18n/formato (sin toLocaleString a mano)', TODO.every((f) => !/toLocale(Date|Time)?String\(/.test(codigo[f])));
  check('13) los países, de Intl.DisplayNames (nombreDeLaRegion), no escritos a mano', /nombreDeLaRegion/.test(codigo['hooks/useTextosDeTravel.ts']) && /nombreDeLaRegion/.test(codigo['components/travel/Selectores.tsx']));
}

console.log('\n── C · Datos DEMO aparte y marcados ──');
{
  const demo = leer('constants/travelDemo.ts');
  check('14) los datos de ejemplo viven en constants/travelDemo.ts y se declaran DEMO', /TODO lo de este archivo es DEMO/.test(demo));
  check('15) el catálogo guarda claves, no frases', !/: '[A-ZÁÉÍÓÚ][a-záéíóúñ]+ [a-záéíóúñ]+/.test(codigo['constants/travelDemo.ts'].replace(/autor: '[^']*'/g, '')));
  const conDemo = listar('screens/travel').filter((f) => /<MarcoDeTravel/.test(codigo[f]));
  const sinMarca = conDemo.filter((f) => !/\bdemo\b|AvisoDemo|SelloDemo/.test(codigo[f]));
  check('16) cada archivo de pantallas marca DEMO donde enseña datos de ejemplo', sinMarca.length === 0, sinMarca.join(', '));
  const seg = codigo['screens/travel/Seguridad.tsx'];
  check('17) Travel Safe y el modo emergencia llevan el aviso fuerte de «no son datos reales»', (seg.match(/<AvisoNoReal \/>/g) || []).length === 2 && /AvisoDemo fuerte texto=\{t\('travel\.notRealEmergency'\)\}/.test(seg));
  check('18) y los teléfonos de ejemplo son marcadores, no números reales', !/telefono: '(1\d\d|9\d\d|0\d{2,}\d)'/.test(codigo['constants/travelDemo.ts']) && /telefono: '000'/.test(codigo['constants/travelDemo.ts']));
}

console.log('\n── D · Sin Firestore ni red; sin dependencias nuevas ──');
{
  const RED = /firebase|firestore|getFirestore|\bfetch\(|axios|XMLHttpRequest|WebSocket|storage\(\)/i;
  const conRed = TODO.filter((f) => f !== 'screens/travel/Comunidad.tsx' && RED.test(codigo[f]));
  check('19) ninguna llamada a Firestore ni a la red desde Travel', conRed.length === 0, conRed.join(', '));
  const com = codigo['screens/travel/Comunidad.tsx'];
  check('20) el muro de la comunidad reutiliza el sistema social de siempre (postsService + PostCard + paginaDeLaSeccion), solo lectura',
    /postsService\.getPublicPostsPaginated/.test(com) && /<PostCard /.test(com) && /paginaDeLaSeccion\(/.test(com) && !/postsService\.(create|update|delete)/.test(com) && !RED.test(com.replace(/firestoreService/g, '')));
  check('21) publicar abre el compositor de siempre, con la sección travel', /navigate\('Create', \{ kind: 'post', sourceSection: 'travel' \}\)/.test(com));
  check('22) el almacén del prototipo es local (AsyncStorage), sin servicios remotos', /AsyncStorage/.test(codigo['services/travelDemoStore.ts']) && !RED.test(codigo['services/travelDemoStore.ts']));
  const PERMITIDOS = /^(react|react-native|@expo\/vector-icons|expo-image|expo-linear-gradient|expo-image-picker|@react-navigation\/native|@react-native-async-storage\/async-storage)$/;
  const externos = TODO.flatMap((f) => [...codigo[f].matchAll(/from '([^.][^']*)'/g)].map((m) => m[1])).filter((m) => !PERMITIDOS.test(m));
  check('23) solo dependencias que la app ya tenía', externos.length === 0, [...new Set(externos)].join(', '));
  const pkg = JSON.parse(leer('package.json'));
  check('24) y todas están en package.json', ['expo-image', 'expo-linear-gradient', 'expo-image-picker', '@react-native-async-storage/async-storage'].every((d) => pkg.dependencies[d]));
}

console.log('\n── E · Weë Brain es la única inteligencia; la rama creator intacta ──');
{
  const conCampo = UI.filter((f) => /<TextInput\b/.test(codigo[f]));
  const CAMPOS_PERMITIDOS = ['components/travel/Piezas.tsx', 'components/travel/Selectores.tsx', 'screens/travel/Descubrir.tsx', 'screens/travel/Explorar.tsx'];
  check('25) las cajas donde se escribe a Weë Brain son la común (CajaDePrompt); los TextInput son buscadores y formularios', conCampo.every((f) => CAMPOS_PERMITIDOS.includes(f)), conCampo.join(', '));
  const conCaja = ['screens/travel/Asistente.tsx', 'screens/travel/Itinerario.tsx', 'screens/travel/Herramientas.tsx'];
  check('26) asistente, replanificar y traductor usan CajaDePrompt', conCaja.every((f) => /<CajaDePrompt/.test(codigo[f])));
  const rutas = codigo['screens/travel/rutas.ts'];
  check('27) «Preguntar a Weë Brain» abre la conversación de siempre (CreatorFlow, travel), con login si hace falta',
    /navigation\.navigate\('CreatorFlow', \{ experienceId: 'travel'/.test(rutas) && /navigation\.navigate\('Login'\)/.test(rutas));
  check('28) ninguna pantalla de Travel llama a un servicio de IA por su cuenta', TODO.every((f) => !/creatorService|brainService|aiEngineService|httpsCallable/.test(codigo[f])));
  const esp = soloCodigo(leer('screens/SpecialistScreen.tsx'));
  check('29) la portada nueva solo en la app; en Weë Creator (pro) la de siempre', /const portadaDeTravel = lanzador && !pro && spec\.id === 'travel';/.test(esp) && /<TravelLauncher/.test(esp));
  const portada = codigo['components/sectores/PortadaTravel.tsx'];
  check('30) «Planear con IA» va a la conversación de siempre (la función plan)', /onPress=\{\(\) => onAccion\('plan'\)\}/.test(portada) && /t\('travel\.planWithAi'\)/.test(portada));
}

check('esta suite está en la cadena de `npm test`', /travel-workplace\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
