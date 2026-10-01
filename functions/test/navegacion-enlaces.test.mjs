/**
 * CADA DIRECCIÓN QUE ESCRIBE LA APP SE PUEDE ABRIR Y RECARGAR.
 *
 *   node test/navegacion-enlaces.test.mjs
 *
 * React Navigation escribe en la barra de direcciones el nombre de la ruta cuando la configuración de enlaces no la
 * nombra —/Wallet, /CreditStore—, pero solo sabe LEER las que nombra. Así que abrir /Wallet, o recargar estando en la
 * billetera, llevaba al Inicio. Esta prueba carga la configuración REAL de `App.tsx` (con la puerta de Filmmaker
 * abierta y cerrada) y la pasa por las funciones REALES de la librería (`getStateFromPath`, `getPathFromState`):
 * enlace directo, recarga (ida y vuelta) y las direcciones de siempre, intactas.
 *
 * Y una guarda para que no vuelva: cada pantalla que nombra la configuración existe en algún navegador (la de WeeTalk
 * decía «InboxMain» y la ruta es «InboxList»).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const ts = require('typescript');
const { getStateFromPath, getPathFromState } = require('@react-navigation/core');

/* La configuración de verdad: el objeto `config` de `linking` en App.tsx, recortado por sus llaves y ejecutado. */
const app = leer('App.tsx');
const inicio = app.indexOf('{', app.indexOf('config: {', app.indexOf('const linking')));
let nivel = 0;
let fin = inicio;
for (; fin < app.length; fin++) {
  if (app[fin] === '{') nivel++;
  else if (app[fin] === '}' && --nivel === 0) break;
}
/* Lo que la configuración usa de navigation/enlaces.ts, ejecutado de verdad. */
const jsEnlaces = ts.transpileModule(leer('navigation/enlaces.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const urlEnlaces = 'data:text/javascript;base64,' + Buffer.from(jsEnlaces).toString('base64');
const E = await import(urlEnlaces);
const fuente = `import { ${Object.keys(E).join(', ')} } from '${urlEnlaces}';\nexport const crear = (FILMMAKER_EN_LA_APP) => (${app.slice(inicio, fin + 1)});`;
const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { crear } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const enfocada = (estado) => {
  const nombres = [];
  let e = estado;
  while (e) {
    const r = e.routes[e.index ?? e.routes.length - 1];
    nombres.push(r.name);
    e = r.state;
  }
  return nombres;
};
const ultima = (estado) => {
  let e = estado;
  let r;
  while (e) { r = e.routes[e.index ?? e.routes.length - 1]; e = r.state; }
  return r;
};

for (const filmmaker of [false, true]) {
  const config = crear(filmmaker);
  const leerRuta = (ruta) => getStateFromPath(ruta, config);
  console.log(`\n── Con Filmmaker ${filmmaker ? 'abierto' : 'cerrado'} ──`);
  check('1) /wallet abre la billetera, con el Inicio debajo para volver', enfocada(leerRuta('/wallet') || {}).join('>') === 'Wallet' && leerRuta('/wallet')?.routes[0].name === 'Main');
  check('2) y /Wallet, la que la app escribía hasta hoy, también', enfocada(leerRuta('/Wallet') || {}).join('>') === 'Wallet');
  check('3) /credits y /CreditStore abren Credits', enfocada(leerRuta('/credits') || {}).join('>') === 'CreditStore' && enfocada(leerRuta('/CreditStore') || {}).join('>') === 'CreditStore');
  const escrita = getPathFromState({ routes: [{ name: 'Main' }, { name: 'Wallet' }], index: 1 }, config);
  check('4) recargar: la dirección que escribe la app vuelve a abrir la billetera', escrita === '/wallet' && enfocada(leerRuta(escrita)).join('>') === 'Wallet', escrita);
  const SIN_PARAMS = ['Wallet', 'CreditStore', 'Search', 'Settings', 'Studio', 'Design'];
  const perdidas = SIN_PARAMS.filter((n) => {
    const ruta = getPathFromState({ routes: [{ name: 'Main' }, { name: n }], index: 1 }, config);
    return enfocada(leerRuta(ruta) || {}).at(-1) !== n;
  });
  check('5) ninguna pantalla principal sin parámetros escribe una dirección que luego no sabe leer', perdidas.length === 0, perdidas.join(', '));
  const post = leerRuta('/post/abc');
  check('6) las de siempre siguen: /post/abc abre esa publicación', ultima(post)?.name === 'PostDetail' && ultima(post)?.params?.postId === 'abc');
  check('7) / y /home abren el Inicio; /studio, el Studio; /community/x, esa comunidad',
    enfocada(leerRuta('/home')).join('>') === 'Main>Home>Landing' && enfocada(leerRuta('/studio')).at(-1) === 'Studio'
    && ultima(leerRuta('/community/x'))?.params?.communityId === 'x' && enfocada(leerRuta('/') || { routes: [{ name: 'Main' }], index: 0 })[0] === 'Main');
  check('8) recargar en WeeTalk vuelve a WeeTalk', enfocada(leerRuta('/inbox/messages') || {}).join('>') === 'Main>Inbox>InboxList');
}

console.log('\n── La configuración solo nombra pantallas que existen ──');
{
  const config = crear(true);
  const nombrados = [];
  const recorrer = (screens) => {
    for (const [nombre, v] of Object.entries(screens || {})) {
      nombrados.push(nombre);
      if (v && typeof v === 'object' && v.screens) recorrer(v.screens);
    }
  };
  recorrer(config.screens);
  const existen = new Set(fs.readdirSync(path.resolve(raiz, 'navigation')).filter((f) => /\.tsx$/.test(f))
    .flatMap((f) => [...leer(`navigation/${f}`).matchAll(/<(?:Stack|Tab)\.Screen\s+name="(\w+)"/g)].map((m) => m[1])));
  const fantasma = nombrados.filter((n) => !existen.has(n));
  check('9) cada pantalla de la configuración de enlaces existe en un navegador', fantasma.length === 0, fantasma.join(', ') || `${nombrados.length} pantallas`);
  check('10) y la pila principal va siempre debajo de lo que se abre por enlace', config.initialRouteName === 'Main');
}

console.log('\n── Los parámetros: forma estable, recuperable al recargar, y nada privado ──');
{
  const config = crear(false);
  /* Lo que hace App.tsx al escribir la dirección: la red de seguridad y después la librería. */
  const escribir = (estado) => getPathFromState(E.sinObjetosSueltos(estado, config.screens).estado, config);
  const leerRuta = (ruta) => getStateFromPath(ruta, config);
  const OBJETO = /\[object|%5Bobject/i;

  /* Parámetros simples. */
  const busqueda = escribir({ routes: [{ name: 'Main' }, { name: 'Search', params: { query: 'film og animation' } }], index: 1 });
  check('11) un parámetro simple va y vuelve igual', ultima(leerRuta(busqueda))?.params?.query === 'film og animation', busqueda);

  /* WEË AI: lo complejo viaja como JSON validado; lo privado, nunca. */
  const flujo = {
    experienceId: 'chef', jobId: 'job_123',
    preset: { questionId: 'people', optionId: 'family' },
    presets: [{ questionId: 'people', optionId: 'family' }, { questionId: 'time', optionId: 'half' }],
    creative: { 'camera.shot': 'wide', 'lighting.type': 'natural' },
    goal: 'Mi receta secreta para la cena', imageUri: 'blob:http://localhost:8083/abc', adjuntos: [{ clase: 'imagen', uri: 'blob:http://localhost:8083/def' }],
  };
  const rutaFlujo = escribir({ routes: [{ name: 'Main' }, { name: 'CreatorFlow', params: flujo }], index: 1 });
  const vuelta = ultima(leerRuta(rutaFlujo))?.params || {};
  check('12) WEË AI: la dirección es estable y no lleva ningún «[object Object]»', /^\/weeai\/chef\?/.test(rutaFlujo) && !OBJETO.test(rutaFlujo), rutaFlujo.slice(0, 90));
  check('13) al recargar vuelven la respuesta elegida, las respuestas, las elecciones creativas y el trabajo',
    JSON.stringify(vuelta.preset) === JSON.stringify(flujo.preset) && JSON.stringify(vuelta.presets) === JSON.stringify(flujo.presets)
    && JSON.stringify(vuelta.creative) === JSON.stringify(flujo.creative) && vuelta.jobId === 'job_123' && vuelta.experienceId === 'chef');
  check('14) y no viajan ni el objetivo escrito, ni la foto, ni los adjuntos',
    !/receta|secreta|blob|adjuntos|imageUri|goal/i.test(decodeURIComponent(rutaFlujo)) && vuelta.goal === undefined && vuelta.imageUri === undefined && vuelta.adjuntos === undefined);
  const leer1 = (q) => ultima(leerRuta(`/weeai/chef?${q}`))?.params || {};
  check('15) una dirección manipulada o la de antes no se cuela: forma incompleta, «[object Object]», un id con espacios',
    leer1('preset=%7B%22questionId%22%3A%22x%22%7D').preset === undefined && leer1('preset=%5Bobject%20Object%5D').preset === undefined
    && leer1('jobId=job%20malo').jobId === undefined && leer1('presets=%5B%5D').presets === undefined
    && leer1('creative=%7B%22a%22%3A%7B%22b%22%3A1%7D%7D').creative === undefined);

  /* El compositor: el lugar —público— va y vuelve; la zona y el borrador, nunca. */
  const lugar = { kind: 'catalog', id: 'DK-CPH', label: 'Copenhague', countryCode: 'DK' };
  const compositor = { kind: 'post', lugarElegido: lugar, ubicacionElegida: { zona: '55.7,12.6', ciudad: 'X' }, selloUbicacion: '1790878134374', prefill: { content: 'Borrador privado', media: [{ uri: 'blob:x' }] } };
  const rutaCompositor = escribir({ routes: [{ name: 'Main' }, { name: 'Create', params: compositor }], index: 1 });
  const vueltaC = ultima(leerRuta(rutaCompositor))?.params || {};
  check('16) el compositor tiene dirección propia, sin «[object Object]»', /^\/publicar\?/.test(rutaCompositor) && !OBJETO.test(rutaCompositor), rutaCompositor.slice(0, 80));
  check('17) al recargar vuelven el tipo y el lugar elegido, idénticos', vueltaC.kind === 'post' && JSON.stringify(vueltaC.lugarElegido) === JSON.stringify(lugar) && vueltaC.selloUbicacion === '1790878134374');
  check('18) la zona de la ubicación y el borrador no salen nunca a la dirección', !/zona|55\.7|Borrador|blob/.test(decodeURIComponent(rutaCompositor)) && vueltaC.ubicacionElegida === undefined && vueltaC.prefill === undefined);
  check('19) un lugar con otra forma no vuelve', E.leerJson('{"kind":"catalog","label":"x","extra":"<script>"}', E.esLugar) === undefined && E.leerJson('"[object Object]"', E.esLugar) === undefined);
  const rutaLugar = escribir({ routes: [{ name: 'Main' }, { name: 'AgregarUbicacion', params: { place: lugar, ubicacion: { zona: '55.7,12.6' } } }], index: 1 });
  check('20) el selector de lugar también: el lugar va y vuelve, la zona no sale', JSON.stringify(ultima(leerRuta(rutaLugar))?.params?.place) === JSON.stringify(lugar) && !/zona/.test(decodeURIComponent(rutaLugar)), rutaLugar.slice(0, 80));

  /* Una publicación: se escribe por su id y se relee por su id. */
  const rutaPost = escribir({ routes: [{ name: 'Main' }, { name: 'PostDetail', params: { postId: 'abc', post: { id: 'abc', content: 'de otra persona' } } }], index: 1 });
  check('21) una publicación abierta desde el muro se escribe como /post/<id>, sin la publicación dentro', rutaPost === '/post/abc', rutaPost);
  check('22) y una dirección de antes con «post=[object Object]» ya no se toma por una publicación (se lee por su id)',
    !E.esPublicacion('[object Object]') && E.esPublicacion({ id: 'abc' }) && /const hasPost = esPublicacion\(route\.params\?\.post\);/.test(leer('screens/PostDetailScreen.tsx')));
  const llamadas = [...['CommunityScreen', 'HomeScreen', 'LandingScreen', 'ProfileScreen', 'ReelsScreen', 'SavedPostsScreen', 'SearchScreen', 'UserProfileScreen', 'WebLandingScreen']
    .flatMap((p) => [...leer(`screens/${p}.tsx`).matchAll(/navigate\('PostDetail', \{([^}]*)\}\)/g)].map((m) => m[1]))];
  check('23) cada pantalla que abre una publicación da su id', llamadas.length >= 13 && llamadas.every((m) => /postId/.test(m)), `${llamadas.length} llamadas`);

  /* La red de seguridad: en una pantalla sin dirección propia, ningún objeto sale como texto. */
  const { estado, quitados } = E.sinObjetosSueltos({ routes: [{ name: 'Main' }, { name: 'Reels', params: { initialPost: { id: '1' }, initialVideoPosts: [{ id: '1' }], communitySlug: 'cine' } }], index: 1 }, config.screens);
  const rutaReels = getPathFromState(estado, config);
  check('24) red de seguridad: los objetos de una pantalla que no declara su forma no salen a la dirección', !OBJETO.test(rutaReels) && quitados.join() === 'Reels.initialPost,Reels.initialVideoPosts' && /communitySlug=cine/.test(rutaReels), rutaReels);
  check('25) y App.tsx la aplica a cada dirección que escribe', /getPathFromState\(estado: Parameters<typeof rutaDesdeEstado>\[0\], opciones\?: Parameters<typeof rutaDesdeEstado>\[1\]\) \{\s*\n\s*const \{ estado: limpio, quitados \} = sinObjetosSueltos\(estado, opciones\?\.screens\);/.test(app) && /return rutaDesdeEstado\(limpio, opciones\);/.test(app));

  /* Recargar reconstruye: WEË AI deja su trabajo en la dirección en cuanto existe. */
  check('26) recargar en WEË AI reabre el mismo trabajo: el trabajo queda en la dirección al empezar',
    /setJobId\(response\.jobId\);\s*\n[^\n]*\n\s*\(navigation as any\)\.setParams\(\{ jobId: response\.jobId \}\);/.test(leer('screens/CreatorFlowScreen.tsx'))
    && /const \[jobId, setJobId\] = useState<string \| null>\(params\.jobId \|\| null\);/.test(leer('screens/CreatorFlowScreen.tsx')));
  /* Escritorio y móvil comparten la misma configuración: no depende del ancho. */
  const bloqueLinking = app.slice(app.indexOf('const linking'), app.indexOf('// Global error handler'));
  check('27) escritorio y móvil: la misma configuración de enlaces, que no depende del ancho de la pantalla', !/useResponsive|width|isDesktop|isMobile/.test(bloqueLinking));
}

check('esta suite está en la cadena de `npm test`', /navegacion-enlaces\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
