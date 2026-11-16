/*
 * MYWEËS — el organizador personal de accesos directos (rediseño del 2026-11-15). Sin emuladores ni red.
 *
 * Prueba el código DE VERDAD del modelo (`utils/myWees.ts`) y del almacén (`services/myWeesStore.ts`), transpilado por
 * `filmmaker-cliente.mjs`, con un AsyncStorage en memoria como único doble. Lo que decide el dueño y aquí se fija:
 *
 *   · empieza vacío, sin precargas;
 *   · se añade, se quita, se reordena y se restaura; sin duplicados;
 *   · lo guardado va por CUENTA y por PERFIL, con versión, y nunca es autoridad: de un acceso se guarda qué destino
 *     es, no a dónde navega, así que un JSON manipulado no puede llevar a una ruta que la app no ofrezca;
 *   · leer aguanta JSON roto, campos que faltan y versiones desconocidas;
 *   · una Weë Page ajena se abre por su id, en su pantalla de siempre, sin ningún parámetro de edición.
 *
 * Lo que NO prueba —la pantalla pintada, el selector con datos reales, el foco, RTL— es de un navegador: va en el informe.
 */
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let fallos = 0;
let total = 0;
const check = (nombre, ok, detalle = '') => {
  total++;
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Un AsyncStorage en memoria. `romper` hace que la siguiente operación lance, para probar el fallo del almacenamiento. */
const crearAlmacen = () => {
  const datos = new Map();
  const estado = { romper: false };
  const api = {
    getItem: async (k) => { if (estado.romper) throw new Error('disco'); return datos.has(k) ? datos.get(k) : null; },
    setItem: async (k, v) => { if (estado.romper) throw new Error('disco'); datos.set(k, String(v)); },
    removeItem: async (k) => { datos.delete(k); },
  };
  return { datos, estado, api };
};

const almacen = crearAlmacen();
const cargar = crearCargador({ dobles: { '@react-native-async-storage/async-storage': { __esModule: true, default: almacen.api } } });
const M = cargar('utils/myWees.ts');
const { myWeesStore } = cargar('services/myWeesStore.ts');

const ids = (lista) => lista.map((a) => a.id);

/* ── A · El modelo ─────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nA · El modelo');
check('A1) el estado inicial es vacío: nada precargado ni recomendado', igual(M.restaurar(), []) && igual(M.leerMyWees(null), []) && igual(M.leerMyWees(undefined), []) && igual(M.leerMyWees(''), []));

const studio = M.crearAcceso('experiencia', 'studio');
const proyectos = M.crearAcceso('funcion', 'projects');
const mia = M.crearAcceso('pagina', 'paginaMia123', 'Mi página', 1000);
const ajena = M.crearAcceso('pagina', 'paginaAjena456', 'La página de otra persona', 2000);
const proyecto = M.crearAcceso('proyecto', 'proy789', 'Mi proyecto');
check('A2) un acceso lleva tipo, referencia e id estable `<tipo>:<ref>`', studio?.id === 'experiencia:studio' && mia?.id === 'pagina:paginaMia123' && proyecto?.id === 'proyecto:proy789');
check('A3) el título solo se guarda en lo que tiene nombre propio (páginas y proyectos)', studio.titulo === undefined && proyectos.titulo === undefined && mia.titulo === 'Mi página' && M.crearAcceso('experiencia', 'chef', 'colado').titulo === undefined);

let lista = M.restaurar();
lista = M.anadir(lista, studio);
check('A4) añadir una experiencia', igual(ids(lista), ['experiencia:studio']));
lista = M.anadir(lista, mia);
check('A5) añadir una página propia', igual(ids(lista), ['experiencia:studio', 'pagina:paginaMia123']));
lista = M.anadir(lista, ajena);
check('A6) añadir una página pública ajena', igual(ids(lista), ['experiencia:studio', 'pagina:paginaMia123', 'pagina:paginaAjena456']));
check('A7) sin duplicados: añadir lo que ya está no cambia nada', igual(ids(M.anadir(M.anadir(lista, ajena), M.crearAcceso('pagina', 'paginaAjena456', 'otro título'))), ids(lista)));
check('A8) añadir algo que no es un acceso no cambia nada', igual(ids(M.anadir(lista, null)), ids(lista)) && igual(ids(M.anadir(lista, { id: 'x', tipo: 'ruta', ref: 'Settings' })), ids(lista)));
const antes = JSON.stringify(lista);
M.anadir(lista, proyecto); M.quitar(lista, studio.id); M.mover(lista, mia.id, -1);
check('A9) ninguna operación toca la lista que recibe', JSON.stringify(lista) === antes);

check('A10) reordenar: subir un puesto', igual(ids(M.mover(lista, 'pagina:paginaAjena456', -1)), ['experiencia:studio', 'pagina:paginaAjena456', 'pagina:paginaMia123']));
check('A11) reordenar: bajar un puesto', igual(ids(M.mover(lista, 'experiencia:studio', 1)), ['pagina:paginaMia123', 'experiencia:studio', 'pagina:paginaAjena456']));
check('A12) en los extremos, mover no hace nada', igual(ids(M.mover(lista, 'experiencia:studio', -1)), ids(lista)) && igual(ids(M.mover(lista, 'pagina:paginaAjena456', 1)), ids(lista)) && igual(ids(M.mover(lista, 'no-existe', 1)), ids(lista)));
check('A13) eliminar quita el acceso y conserva el orden de los demás', igual(ids(M.quitar(lista, 'pagina:paginaMia123')), ['experiencia:studio', 'pagina:paginaAjena456']));
check('A14) restaurar deja la lista vacía', igual(M.restaurar(), []));
const muchos = Array.from({ length: M.MAXIMO_DE_ACCESOS + 30 }, (_, i) => M.crearAcceso('pagina', `p${i}`, `Página ${i}`)).reduce((l, a) => M.anadir(l, a), []);
check('A15) escala a muchos accesos, con tope', muchos.length === M.MAXIMO_DE_ACCESOS && M.MAXIMO_DE_ACCESOS >= 100, String(muchos.length));

/* ── B · A dónde lleva, y que lo guardado no decide nada ───────────────────────────────────────────────────────── */
console.log('\nB · Destinos');
const dAjena = M.destinoDeAcceso(ajena);
check('B1) una página ajena abre la página ORIGINAL por su id (`WeePage { pageId }`)', dAjena?.ruta === 'WeePage' && igual(dAjena.params, { pageId: 'paginaAjena456' }));
check('B2) y no concede edición: ni la ruta de gestionar ni ningún parámetro de edición', dAjena.ruta !== 'WeePages' && !('editPageId' in dAjena.params) && Object.keys(dAjena.params).length === 1);
check('B3) la página propia se abre igual que la ajena: el acceso no distingue dueños', igual(M.destinoDeAcceso(mia), { ruta: 'WeePage', params: { pageId: 'paginaMia123' }, pideCuenta: false }));
check('B4) una experiencia abre `Specialist { id }`, como el centro creativo', igual(M.destinoDeAcceso(studio), { ruta: 'Specialist', params: { id: 'studio' }, pideCuenta: false }));
check('B5) un proyecto abre `Project { id }` y pide cuenta', igual(M.destinoDeAcceso(proyecto), { ruta: 'Project', params: { id: 'proy789' }, pideCuenta: true }));
const rutasDeFunciones = M.FUNCIONES_DE_MYWEES.map((f) => M.destinoDeAcceso(M.crearAcceso('funcion', f)));
check('B6) todas las funciones añadibles tienen destino', rutasDeFunciones.every((d) => d && typeof d.ruta === 'string' && d.ruta.length > 0));
const pila = sinComentarios(leer('navigation/MainStackNavigator.tsx'));
const rutasUsadas = [...new Set([...rutasDeFunciones.map((d) => d.ruta), 'WeePage', 'Specialist', 'Project'])];
const sinRuta = rutasUsadas.filter((r) => !new RegExp(`<Stack\\.Screen\\s+name="${r}"`).test(pila));
check('B7) y todos los destinos son rutas REALES de la pila principal', sinRuta.length === 0, sinRuta.join(' '));
check('B8) la agenda es UNA función («contacts») que abre `EContact`: la pantalla enseña la del perfil activo', igual(M.destinoDeAcceso(M.crearAcceso('funcion', 'contacts')), { ruta: 'EContact', pideCuenta: true }));
check('B9) un acceso de un tipo inventado no lleva a ningún sitio', M.destinoDeAcceso({ id: 'ruta:Settings', tipo: 'ruta', ref: 'Settings' }) === null);
check('B10) ni una función o experiencia que no esté en el catálogo', M.crearAcceso('funcion', 'EngineAdmin') === null && M.crearAcceso('experiencia', 'admin') === null && M.destinoDeAcceso({ id: 'funcion:EngineAdmin', tipo: 'funcion', ref: 'EngineAdmin' }) === null);
const manipulado = JSON.stringify({ v: 1, accesos: [{ tipo: 'pagina', ref: 'abc', ruta: 'EngineAdmin', params: { admin: true }, destino: { ruta: 'Settings' }, uid: 'otro', perfil: 'hidi' }] });
const leidoManipulado = M.leerMyWees(manipulado);
check('B11) un JSON con rutas, parámetros o identidades colados los pierde al leer', leidoManipulado.length === 1 && igual(Object.keys(leidoManipulado[0]).sort(), ['id', 'ref', 'tipo']) && M.destinoDeAcceso(leidoManipulado[0]).ruta === 'WeePage');
check('B12) el modelo no importa nada: ni identidad, ni permisos, ni red', !/^import /m.test(sinComentarios(leer('utils/myWees.ts'))));

/* ── C · Lectura tolerante ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nC · Lectura tolerante');
const rotos = ['{', 'no soy json', '[]', '"texto"', '42', 'null', '{"v":1}', '{"v":1,"accesos":"no"}', '{"v":1,"accesos":{}}', '{"accesos":[]}'];
check('C1) JSON roto o con otra forma → lista vacía, sin lanzar', rotos.every((r) => { try { return igual(M.leerMyWees(r), []); } catch { return false; } }));
check('C2) una versión desconocida → lista vacía (no se adivina el formato)', igual(M.leerMyWees(JSON.stringify({ v: 2, accesos: [studio] })), []) && igual(M.leerMyWees(JSON.stringify({ v: '1', accesos: [studio] })), []) && igual(M.leerMyWees(JSON.stringify({ v: 0, accesos: [studio] })), []));
const sucio = JSON.stringify({ v: 1, accesos: [null, 7, 'x', {}, { tipo: 'pagina' }, { ref: 'solo-ref' }, { tipo: 'pagina', ref: '' }, { tipo: 'pagina', ref: '../../etc' }, { tipo: 'pagina', ref: 'a b' }, { tipo: 'pagina', ref: 'x'.repeat(200) }, { tipo: 'pagina', ref: 'buena', titulo: 99, anadidoEn: 'ayer' }, { tipo: 'experiencia', ref: 'studio' }] });
const limpio = M.leerMyWees(sucio);
check('C3) las piezas rotas se saltan y las buenas se quedan', igual(ids(limpio), ['pagina:buena', 'experiencia:studio']), ids(limpio).join(' '));
check('C4) y los campos de tipo equivocado se descartan sin tirar el acceso', limpio[0].titulo === undefined && limpio[0].anadidoEn === undefined);
check('C5) duplicados guardados: se queda el primero', igual(ids(M.leerMyWees(JSON.stringify({ v: 1, accesos: [studio, mia, studio, mia, ajena] }))), ['experiencia:studio', 'pagina:paginaMia123', 'pagina:paginaAjena456']));
check('C6) lo que se escribe se vuelve a leer igual', igual(M.leerMyWees(M.escribirMyWees(lista)), lista));
check('C7) y escribir pasa por el mismo filtro: no se puede guardar basura', igual(JSON.parse(M.escribirMyWees([studio, { tipo: 'x', ref: 'y', id: 'x:y' }, studio])).accesos.map((a) => a.id), ['experiencia:studio']));
check('C8) lo guardado lleva versión', JSON.parse(M.escribirMyWees([])).v === M.VERSION_DE_MYWEES && M.VERSION_DE_MYWEES === 1);

/* ── D · La clave: por cuenta y por perfil ─────────────────────────────────────────────────────────────────────── */
console.log('\nD · La clave');
check('D1) una clave por cuenta y por perfil, con la versión dentro', M.claveDeMyWees('cuentaA', 'real') === 'wee.mywees.v1.cuentaA.real' && M.claveDeMyWees('cuentaA', 'hidi') === 'wee.mywees.v1.cuentaA.hidi');
check('D2) cuentas distintas, claves distintas', M.claveDeMyWees('cuentaA', 'real') !== M.claveDeMyWees('cuentaB', 'real'));
check('D3) sin cuenta no hay clave: un invitado no tiene MyWeës', M.claveDeMyWees(null, 'real') === null && M.claveDeMyWees('', 'real') === null && M.claveDeMyWees(undefined, 'hidi') === null);
check('D4) un perfil que no es ninguno de los dos cae en el Real, nunca en una tercera clave', M.claveDeMyWees('cuentaA', 'biz') === 'wee.mywees.v1.cuentaA.real');
check('D5) una «cuenta» con forma rara no produce clave', M.claveDeMyWees('a.b', 'real') === null && M.claveDeMyWees('a/b', 'real') === null);

/* ── E · El almacén (AsyncStorage) ─────────────────────────────────────────────────────────────────────────────── */
console.log('\nE · El almacén');
check('E1) al empezar, vacío', igual(await myWeesStore.leer('cuentaA', 'real'), []));
check('E2) guardar', (await myWeesStore.guardar('cuentaA', 'real', lista)) === true && almacen.datos.has('wee.mywees.v1.cuentaA.real'));
check('E3) persiste: una lectura nueva (como tras reiniciar la app) trae lo mismo y en el mismo orden', igual(await myWeesStore.leer('cuentaA', 'real'), lista));
const otroCargador = crearCargador({ dobles: { '@react-native-async-storage/async-storage': { __esModule: true, default: almacen.api } } });
check('E3b) también desde un módulo recién cargado (ninguna memoria en el módulo)', igual(await otroCargador('services/myWeesStore.ts').myWeesStore.leer('cuentaA', 'real'), lista));
check('E4) aislamiento de PERFIL: el Perfil Weë de la misma cuenta no ve lo del Real', igual(await myWeesStore.leer('cuentaA', 'hidi'), []));
check('E5) aislamiento de CUENTA: otra cuenta en el mismo dispositivo no ve nada', igual(await myWeesStore.leer('cuentaB', 'real'), []) && igual(await myWeesStore.leer('cuentaB', 'hidi'), []));
await myWeesStore.guardar('cuentaA', 'hidi', [proyectos]);
await myWeesStore.guardar('cuentaB', 'real', [ajena]);
check('E6) y cada una conserva lo suyo', igual(ids(await myWeesStore.leer('cuentaA', 'real')), ids(lista)) && igual(ids(await myWeesStore.leer('cuentaA', 'hidi')), ['funcion:projects']) && igual(ids(await myWeesStore.leer('cuentaB', 'real')), ['pagina:paginaAjena456']));
await myWeesStore.guardar('cuentaA', 'real', M.restaurar());
check('E7) restaurar persiste el vacío, solo en ese perfil', igual(await myWeesStore.leer('cuentaA', 'real'), []) && (await myWeesStore.leer('cuentaA', 'hidi')).length === 1 && (await myWeesStore.leer('cuentaB', 'real')).length === 1);
almacen.datos.set('wee.mywees.v1.cuentaA.real', '{"v":1,"accesos":[{"tipo":"pagina","ref":"buena"},{"tipo":"pagi');
check('E8) datos corruptos en el dispositivo: la lectura devuelve vacío y no lanza', igual(await myWeesStore.leer('cuentaA', 'real'), []));
check('E9) y se recupera: se puede volver a guardar y leer encima', (await myWeesStore.guardar('cuentaA', 'real', [studio])) && igual(ids(await myWeesStore.leer('cuentaA', 'real')), ['experiencia:studio']));
almacen.estado.romper = true;
const leidoRoto = await myWeesStore.leer('cuentaA', 'real');
const guardadoRoto = await myWeesStore.guardar('cuentaA', 'real', lista);
almacen.estado.romper = false;
check('E10) si el almacenamiento falla, leer devuelve vacío y guardar avisa con `false`', igual(leidoRoto, []) && guardadoRoto === false);
check('E11) sin cuenta, ni se lee ni se escribe', igual(await myWeesStore.leer(null, 'real'), []) && (await myWeesStore.guardar(null, 'real', lista)) === false);
const claves = [...almacen.datos.keys()];
check('E12) todo lo escrito está bajo `wee.mywees.v1.`', claves.length > 0 && claves.every((k) => k.startsWith('wee.mywees.v1.')), claves.join(' '));

/* ── F · Enlaces de página ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nF · Enlaces de página');
check('F1) de un enlace de página sale su id', M.idDePaginaDesdeTexto('https://wee.zone/page/abcDEF123') === 'abcDEF123' && M.idDePaginaDesdeTexto('wee://page/abcDEF123') === 'abcDEF123' && M.idDePaginaDesdeTexto(' /page/abcDEF123?x=1 ') === 'abcDEF123');
check('F2) el id a secas vale; un texto cualquiera, una dirección o un @usuario con puntos, no', M.idDePaginaDesdeTexto('abcDEF123') === 'abcDEF123' && M.idDePaginaDesdeTexto('hola mundo') === null && M.idDePaginaDesdeTexto('https://wee.zone/user/abc') === null && M.idDePaginaDesdeTexto('') === null);

/* ── G · Lo que no se toca, y por dónde se llega ───────────────────────────────────────────────────────────────── */
console.log('\nG · Fronteras');
const almacenFuente = sinComentarios(leer('services/myWeesStore.ts'));
const hook = sinComentarios(leer('hooks/useMyWees.ts'));
const pantalla = sinComentarios(leer('screens/MyWeesScreen.tsx'));
const selector = sinComentarios(leer('components/mywees/SelectorDeDestinos.tsx'));
check('G1) el almacén solo conoce AsyncStorage y el modelo: ni Firestore, ni Functions', /async-storage/.test(almacenFuente) && !/firebase|firestore|httpsCallable/.test(almacenFuente));
check('G2) el hook LEE la identidad (cuenta y perfil activo) y no la cambia', /useAuth\(\)/.test(hook) && /activeProfileType/.test(hook) && !/switchIdentity|setThemeMode|setWeeProfile/.test(hook));
check('G3) la pantalla y el selector no escriben en ningún servicio: solo leen páginas y proyectos con las funciones que ya existían',
  !/pagesService\.(guardar|seguir)|projectsService\.(create|rename|remove|assignJob)|httpsCallable|setDoc|updateDoc|addDoc|deleteDoc/.test(pantalla + selector)
  && /pagesService\.leer/.test(pantalla) && /projectsService\.get/.test(pantalla) && /pagesService\.mias/.test(selector) && /pagesService\.publicadas/.test(selector) && /projectsService\.list/.test(selector));
check('G4) no se añade ninguna consulta: el servicio de páginas no cambió sus lecturas', (leer('services/pagesService.ts').match(/getDocs\(/g) || []).length === 2 && !/orderBy|startAfter/.test(sinComentarios(leer('services/pagesService.ts'))));
check('G5) navegar sale de `destinoDeAcceso`, no de lo guardado', /destinoDeAcceso\(a\)/.test(pantalla) && /navigation\.navigate\(destino\.ruta, destino\.params\)/.test(pantalla));
check('G6) restaurar pide confirmación', /confirmAction\(t\('mywees\.restore'\), t\('mywees\.restoreConfirm'\)/.test(pantalla));
check('G7) reordenar es con botones de subir y bajar, cada uno con su nombre accesible', /mover\(a\.id, -1\)/.test(pantalla) && /mover\(a\.id, 1\)/.test(pantalla) && /mywees\.moveUp/.test(pantalla) && /mywees\.moveDown/.test(pantalla));
check('G8) el aviso de que vive en el dispositivo está en el vacío y en la lista', (pantalla.match(/mywees\.localNotice/g) || []).length === 2);
check('G9) un destino que no existe se dice y se puede quitar sin entrar a organizar', /noDisponible/.test(pantalla) && /common\.notAvailable/.test(pantalla));
check('G10) la agenda se nombra con la identidad activa (ËContact o ẄContact), nunca las dos', /useIdentidadActiva\(\)/.test(pantalla) && /useIdentidadActiva\(\)/.test(selector) && !/ËContact|ẄContact/.test(pantalla + selector));
check('G11) las rutas nuevas existen en la pila y tienen dirección', /<Stack\.Screen name="MyWees"/.test(pila) && /<Stack\.Screen name="Historial"/.test(pila) && /MyWees: \{ path: 'mywees'/.test(leer('App.tsx')) && /Historial: \{ path: 'historial'/.test(leer('App.tsx')));
const pkg = JSON.parse(leer('package.json'));
check('G12) sin dependencias nuevas para MyWeës (ni librería de arrastre)', !Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some((d) => /draggable|sortable|dnd/.test(d)));

/* H · MyWeës se despliega en el ☰ (decisión del dueño, 2026-11-15): la flecha abre los atajos ahí mismo, sin ir a otra pantalla. */
{
  const cajon = leer('components/DrawerMenu.tsx');
  check('H1) la fila de MyWeës del cajón despliega y pliega, y lo dice a la accesibilidad',
    cajon.includes('onPress={alternarMyWees}') && cajon.includes('accessibilityState={{ expanded: myWeesAbierto }}') && cajon.includes('aria-expanded={myWeesAbierto}'));
  check('H2) los atajos salen del mismo almacén que la pantalla y se nombran con la misma función',
    cajon.includes('const myWees = useMyWees();') && cajon.includes('myWees.accesos.map(') && cajon.includes('pintarAcceso(a, t, nombreDeLaAgenda)')
    && leer('screens/MyWeesScreen.tsx').includes('pintarAcceso(a, t, nombreLista, estados[a.id]?.nombre)'));
  check('H3) cada atajo va a su destino con la tabla de rutas de siempre; sin atajos no hay segunda leyenda y «Personalizar» invita a elegirlos',
    cajon.includes('const destino = destinoDeAcceso(a);') && !cajon.includes("t('mywees.emptyHint')") && cajon.includes("t('menu.myWeesHint')") && cajon.includes('onPress={goCustomizeMyWees}'));
  check('H4) la flecha gira sin animación si se prefiere menos movimiento, y el estado no se guarda en el dispositivo',
    cajon.includes('if (quietud) giroDeLaFlecha.setValue(') && !/AsyncStorage/.test(cajon));
}

console.log(`\n${total - fallos}/${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
