/**
 * MIS PROYECTOS / MIS CREACIONES — REGRESIÓN DEL ESTADO ACTUAL (R9 · línea D).
 *
 *   node test/pc-regresion.test.mjs          (desde functions/)
 *
 * La regla de producto que se protege:
 *   · Mis proyectos  = trabajo EN PROCESO, que se puede continuar.
 *   · Mis creaciones = lo TERMINADO que la persona ha elegido conservar.
 *   · Local / Weë Cloud = DÓNDE está el archivo; no cambia el estado.
 *   · El muro (Wall) y los Weëls son lo PÚBLICO: no leen la biblioteca personal, y la biblioteca no lee el muro.
 *
 * Esta suite fija lo que YA es verdad en el código y no puede romperse mientras se construye el ciclo de vida
 * (`services/cicloDeTrabajo.ts`, línea A). Lo que depende de ese contrato vive en `pc-ciclo-de-vida.test.mjs.pendiente`.
 *
 *   A · Las dos bibliotecas existen y se alcanzan: menú ☰ (DrawerMenu), barra lateral (Sidebar), navegador, y su
 *       nombre está traducido en los 16 idiomas (CLAUDE.md §8).
 *   B · Ninguna pantalla de la biblioteca personal llega al muro, y ninguna del muro / Weëls / compositor llega a la
 *       biblioteca: se recorre el grafo REAL de imports de cada pantalla y las colecciones que tocan sus servicios.
 *   C · Las reglas (`firestore.rules`, `storage.rules`) aíslan `assets`, `creatorProjects`, `creatorJobs` y
 *       `users/{uid}/…` por cuenta. Cada detector se prueba también contra una copia MUTADA de las reglas que tiene
 *       que hacerle fallar (un verde no puede ser vacío). La prueba con el motor de reglas de verdad está en
 *       `pc-aislamiento.emulator.mjs`.
 *   D · Los servicios de verdad (transpilados con `filmmaker-cliente.mjs`, Firestore doblado que APUNTA): cada lectura
 *       de biblioteca va filtrada por la cuenta que la pide; publicar un Weël escribe UN documento en `posts`, referencia
 *       los materiales por id, y no toca `assets` ni `creatorProjects` ni `creatorJobs`.
 *   E · Lo de demostración no se cuela en la biblioteca, y el `demo` de un trabajo (modo de ejecución simulado) NO es
 *       la marca de contenido demo: las bibliotecas no filtran por él.
 *
 * Cada detector tiene su CONTROL: se le enseña un caso que debe disparar y se comprueba que dispara.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearCargador, RAIZ } from './filmmaker-cliente.mjs';

const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8').replace(/\r\n/g, '\n');
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));
let failures = 0;
let total = 0;
const check = (name, cond, extra = '') => {
  total++;
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const norm = (f) => path.relative(RAIZ, f).split(path.sep).join('/');

/* ─────────────────────────── A · Se alcanzan ─────────────────────────── */
console.log('\n── A · Mis proyectos y Mis creaciones existen y se alcanzan ──');
{
  const drawer = sinComentarios(leer('components/DrawerMenu.tsx'));
  const sidebar = sinComentarios(leer('components/Sidebar.tsx'));
  const nav = sinComentarios(leer('navigation/MainStackNavigator.tsx'));
  const menu = sinComentarios(leer('constants/weeMenu.ts'));

  const enCajon = (id, ruta, src = drawer) => new RegExp(`fila\\('${id}',[^\\n]*navigateRoot\\('${ruta}'\\)`).test(src);
  const enBarra = (id, ruta, src = sidebar) => new RegExp(`<Opcion id="${id}"[^\\n]*navigation\\.navigate\\('${ruta}'\\)`).test(src);
  const enPila = (ruta, componente, src = nav) =>
    new RegExp(`<Stack\\.Screen name="${ruta}" component=\\{${componente}\\}`).test(src)
    && new RegExp(`import ${componente} from '\\.\\./screens/${componente}'`).test(src)
    && existe(`screens/${componente}.tsx`);

  check('1) el menú ☰ abre Mis proyectos (fila «projects» → Projects)', enCajon('projects', 'Projects'));
  check('2) el menú ☰ abre Mis creaciones (fila «creations» → MisCreaciones)', enCajon('creations', 'MisCreaciones'));
  check('3) la barra lateral abre Mis proyectos', enBarra('projects', 'Projects'));
  check('4) la barra lateral abre Mis creaciones', enBarra('creations', 'MisCreaciones'));
  check('5) el navegador registra Projects → ProjectsScreen y MisCreaciones → MisCreacionesScreen (y el archivo existe)',
    enPila('Projects', 'ProjectsScreen') && enPila('MisCreaciones', 'MisCreacionesScreen') && enPila('Project', 'ProjectScreen'));
  check('6) sin sesión, las dos piden entrar en vez de abrir (requireLogin)',
    /fila\('projects', \(\) => \(user \?[^\n]*: requireLogin\(\)\)/.test(drawer) && /fila\('creations', \(\) => \(user \?[^\n]*: requireLogin\(\)\)/.test(drawer)
    && /id="projects"[^\n]*user \?[^\n]*: requireLogin\(\)/.test(sidebar) && /id="creations"[^\n]*user \?[^\n]*: requireLogin\(\)/.test(sidebar));
  /* CONTROL: los mismos detectores sobre una ruta que no existe, y sobre el cajón sin la fila, NO dan verde. */
  check('6c) CONTROL: los detectores no aprueban una ruta inexistente ni un cajón al que le quitan la fila',
    !enCajon('projects', 'NoExiste') && !enBarra('creations', 'NoExiste') && !enPila('NoExiste', 'NoExisteScreen')
    && !enCajon('projects', 'Projects', drawer.replace(/fila\('projects'[^\n]*\n/, '\n')));

  /* Las etiquetas: claves (no frases) en el catálogo, y traducidas en los 16 idiomas. */
  const claveDe = (id) => (menu.match(new RegExp(`${id}: \\{[^}]*clave: '([^']+)'`)) || [])[1];
  const claves = { projects: claveDe('projects'), creations: claveDe('creations') };
  check('7) el catálogo del menú guarda CLAVES para las dos opciones (menu.projects, creaciones.title)',
    claves.projects === 'menu.projects' && claves.creations === 'creaciones.title', JSON.stringify(claves));
  const idiomas = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const cargar = crearCargador();
  const valor = (idioma, clave) => {
    const [modulo, ...resto] = clave.split('.');
    const archivo = `i18n/textos/${idioma}/${modulo}.ts`;
    if (!existe(archivo)) return undefined;
    let v = cargar(archivo)[modulo];
    for (const k of resto) v = v?.[k];
    return v;
  };
  const faltan = [];
  for (const idioma of idiomas) for (const clave of Object.values(claves)) {
    const v = valor(idioma, clave);
    if (typeof v !== 'string' || !v.trim()) faltan.push(`${idioma}:${clave}`);
  }
  check(`8) las dos etiquetas existen y no están vacías en los ${idiomas.length} idiomas`, idiomas.length >= 16 && faltan.length === 0, faltan.join(', '));
  check('8c) CONTROL: el lector de claves no inventa una clave que no existe', valor('es', 'menu.noExisteEstaClave') === undefined && valor('es', 'menu.projects') === 'Mis proyectos');
}

/* ─────────────────────────── B · Separación de lecturas ─────────────────────────── */
console.log('\n── B · La biblioteca personal y el muro no se leen el uno al otro ──');
/*
 * El grafo de imports de verdad, desde cada pantalla. Se detiene en la infraestructura compartida
 * (contexts/, config/, i18n/, navigation/): la sesión y el idioma los usa todo el mundo y no son una lectura de datos
 * de la pantalla. Todo lo demás (servicios, hooks, utilidades, componentes) se recorre entero, incluidos los import()
 * dinámicos.
 */
const PARO = /^(contexts|config|i18n|navigation)\//;
const resolverImport = (desde, spec) => {
  const d = path.resolve(path.dirname(desde), spec);
  for (const f of [`${d}.ts`, `${d}.tsx`, path.join(d, 'index.ts'), path.join(d, 'index.tsx'), d]) {
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
};
const cierre = (inicio, fuentes = null) => {
  const vistos = new Set();
  const pila = [path.resolve(RAIZ, inicio)];
  while (pila.length) {
    const f = pila.pop();
    if (vistos.has(f)) continue;
    vistos.add(f);
    const rel = norm(f);
    if (rel !== inicio && PARO.test(rel)) continue;
    if (!/\.tsx?$/.test(f)) continue;
    const src = sinComentarios(fuentes?.[rel] ?? fs.readFileSync(f, 'utf8'));
    for (const m of src.matchAll(/(?:from\s+|import\s*\(\s*|require\(\s*)['"](\.[^'"]+)['"]/g)) {
      const r = resolverImport(f, m[1]);
      if (r) pila.push(r);
    }
  }
  return [...vistos].map(norm);
};
/* Las colecciones que un archivo nombra al leer o escribir en Firestore. */
const coleccionesDe = (src) => {
  const s = sinComentarios(src);
  const out = new Set();
  for (const m of s.matchAll(/\b(?:collection|doc|collectionGroup)\(\s*db\s*,\s*'([A-Za-z0-9_]+)'/g)) out.add(m[1]);
  for (const m of s.matchAll(/\bfirestoreService\.\w+(?:<[^>]*>)?\(\s*'([A-Za-z0-9_]+)'/g)) out.add(m[1]);
  return out;
};
const coleccionesDelCierre = (archivos, fuentes = null) => {
  const out = new Set();
  for (const a of archivos) if (/\.tsx?$/.test(a) && !PARO.test(a)) for (const c of coleccionesDe(fuentes?.[a] ?? leer(a))) out.add(c);
  return out;
};
const BIBLIOTECA = ['services/assetsService.ts', 'services/projectsService.ts', 'services/creatorService.ts', 'services/assetDownload.ts'];
const COLECCIONES_DE_BIBLIOTECA = ['assets', 'creatorProjects', 'creatorJobs', 'projectItems'];
const MURO = ['services/firestoreService.ts'];
const COLECCIONES_DEL_MURO = ['posts'];
{
  const personales = ['screens/ProjectsScreen.tsx', 'screens/ProjectScreen.tsx', 'screens/MisCreacionesScreen.tsx', 'components/creator/RejillaDeCreaciones.tsx'];
  const publicas = ['screens/HomeScreen.tsx', 'screens/LandingScreen.tsx', 'screens/WebLandingScreen.tsx', 'screens/ReelsScreen.tsx', 'components/WeelsRow.tsx', 'components/PostCard.tsx', 'screens/CreateScreen.tsx'];
  for (const p of personales) check(`(existe) ${p}`, existe(p));
  for (const p of publicas) check(`(existe) ${p}`, existe(p));

  let n = 9; /* 9–19 por pantalla; los controles siguen la cuenta */
  for (const p of personales) {
    const c = cierre(p);
    const muro = c.filter((x) => MURO.includes(x));
    const cols = [...coleccionesDelCierre(c)].filter((x) => COLECCIONES_DEL_MURO.includes(x));
    check(`B${n++}) ${p} no llega al muro (ni firestoreService ni la colección posts) — recorre ${c.length} archivos`, muro.length === 0 && cols.length === 0, [...muro, ...cols].join(', '));
  }
  for (const p of publicas) {
    const c = cierre(p);
    const lib = c.filter((x) => BIBLIOTECA.includes(x));
    const cols = [...coleccionesDelCierre(c)].filter((x) => COLECCIONES_DE_BIBLIOTECA.includes(x));
    check(`B${n++}) ${p} no llega a la biblioteca personal (assets / creatorProjects / creatorJobs) — recorre ${c.length} archivos`, lib.length === 0 && cols.length === 0, [...lib, ...cols].join(', '));
  }
  /* Las pantallas personales SÍ llegan a lo suyo: si no, el detector de arriba podría estar mirando un grafo vacío. */
  check(`B${n++}) CONTROL: Mis creaciones SÍ llega a assets; Mis proyectos y el proyecto SÍ llegan a creatorProjects`,
    coleccionesDelCierre(cierre('screens/MisCreacionesScreen.tsx')).has('assets')
    && coleccionesDelCierre(cierre('screens/ProjectsScreen.tsx')).has('creatorProjects')
    && coleccionesDelCierre(cierre('screens/ProjectScreen.tsx')).has('creatorJobs'));
  check(`B${n++}) CONTROL: el Home y los Weëls SÍ llegan al muro (posts)`,
    coleccionesDelCierre(cierre('screens/HomeScreen.tsx')).has('posts') && coleccionesDelCierre(cierre('screens/ReelsScreen.tsx')).has('posts'));
  /* Un import inyectado en memoria (sin tocar el disco) tiene que aparecer en el grafo y en sus colecciones. */
  const inyectado = { 'components/WeelsRow.tsx': `${leer('components/WeelsRow.tsx')}\nimport { assetsService } from '../services/assetsService';\n` };
  const cInyectado = cierre('components/WeelsRow.tsx', inyectado);
  check(`B${n++}) CONTROL: si los Weëls importaran assetsService, el detector lo vería (grafo y colección)`,
    cInyectado.includes('services/assetsService.ts') && coleccionesDelCierre(cInyectado, inyectado).has('assets'));
  check(`B${n++}) CONTROL: el lector de colecciones ve collection(db,…), doc(db,…) y firestoreService.x('…')`,
    [...coleccionesDe("collection(db, 'a'); doc(db, 'b', id); firestoreService.create<Post>('c', d); /* collection(db, 'z') */")].sort().join() === 'a,b,c');
}

/* ─────────────────────────── C · Reglas ─────────────────────────── */
console.log('\n── C · Las reglas aíslan la biblioteca por cuenta ──');
/* El bloque `match <cabecera> { … }` con sus llaves emparejadas (incluidos sus `match` hijos). */
const bloque = (reglas, cabecera) => {
  const i = reglas.indexOf(`match ${cabecera} {`);
  if (i < 0) return null;
  let nivel = 0;
  /* La llave que abre el bloque es la que sigue a la cabecera entera, no la de `{assetId}`. */
  for (let j = i + `match ${cabecera} `.length; j < reglas.length; j++) {
    if (reglas[j] === '{') nivel++;
    else if (reglas[j] === '}' && --nivel === 0) return reglas.slice(i, j + 1);
  }
  return null;
};
/* Las reglas solo tienen comentarios de línea: quitar los de bloque se comería rutas como `/{documento=**}`. */
const sinComentariosDeReglas = (s) => s.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const reglasFs = sinComentariosDeReglas(leer('firestore.rules'));
const reglasSt = sinComentariosDeReglas(leer('storage.rules'));

const auditarFirestore = (r) => {
  const out = {};
  const a = bloque(r, '/assets/{assetId}');
  out.assets = !!a && /allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid;/.test(a)
    && /allow create, update, delete: if false;/.test(a) && !/if true/.test(a);
  const p = bloque(r, '/creatorProjects/{projectId}');
  out.creatorProjects = !!p && /allow read: if isAuthenticated\(\) && resource\.data\.userId == request\.auth\.uid;/.test(p)
    && /allow create: if isAuthenticated\(\) && request\.resource\.data\.userId == request\.auth\.uid;/.test(p)
    && /allow update: if isAuthenticated\(\) && resource\.data\.userId == request\.auth\.uid &&\s*request\.resource\.data\.userId == resource\.data\.userId;/.test(p)
    && /allow delete: if isAuthenticated\(\) && resource\.data\.userId == request\.auth\.uid;/.test(p) && !/if true/.test(p);
  const j = bloque(r, '/creatorJobs/{jobId}');
  out.creatorJobs = !!j && /allow read: if isAuthenticated\(\) && resource\.data\.userId == request\.auth\.uid;/.test(j)
    && /allow create, delete: if false;/.test(j)
    && /allow update: if isAuthenticated\(\) && resource\.data\.userId == request\.auth\.uid &&\s*request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['projectId', 'updatedAt'\]\);/.test(j)
    && !/if true/.test(j);
  const pi = bloque(r, '/projectItems/{itemId}');
  out.projectItems = !!pi && /resource\.data\.ownerAccountId == request\.auth\.uid/.test(pi) && /allow create, update, delete: if false;/.test(pi);
  const u = bloque(r, '/users/{userId}');
  out.bookmarks = !!u && /match \/bookmarks\/\{postId\} \{\s*allow read, write: if isAuthenticated\(\) && request\.auth\.uid == userId;\s*\}/.test(u);
  out.writerDocuments = !!u && /match \/writerDocuments\/\{docId\} \{\s*allow read, write: if isAuthenticated\(\) && request\.auth\.uid == userId;\s*\}/.test(u);
  /* Ninguna regla comodín abre de más lo que no tiene regla propia. */
  out.sinComodin = !/match \/\{[a-zA-Z]+=\*\*\}\s*\{[^}]*allow (read|write|get|list)[^}]*if (true|isAuthenticated\(\));/.test(r);
  return out;
};
const auditarStorage = (r) => {
  const ruta = (nombre) => bloque(r, `/users/{userId}/${nombre}/{fileName}`);
  const lecturaPropia = (b) => !!b && /allow read: if request\.auth != null && request\.auth\.uid == userId;/.test(b) && !/allow read: if true/.test(b);
  return {
    aiGenerations: lecturaPropia(ruta('ai-generations')) && /allow write: if false;/.test(ruta('ai-generations') ?? ''),
    creatorInputs: lecturaPropia(ruta('creator-inputs')) && /allow update, delete: if false;/.test(ruta('creator-inputs') ?? ''),
    brainAttachments: lecturaPropia(ruta('brain-attachments')),
    catchAll: /match \/\{allPaths=\*\*\} \{\s*allow read, write: if false;\s*\}/.test(r),
  };
};
{
  const fsA = auditarFirestore(reglasFs);
  check('20) assets: cada cuenta lee SOLO lo suyo (ownerAccountId) y el cliente no crea, cambia ni borra', fsA.assets);
  check('21) creatorProjects: lee/edita/borra solo su dueño, crea solo a su nombre y no puede cambiar de dueño', fsA.creatorProjects);
  check('22) creatorJobs: lee solo su dueño; el cliente no crea ni borra; solo puede mover projectId/updatedAt', fsA.creatorJobs);
  check('23) projectItems (F11): lee solo su dueño, el cliente no escribe', fsA.projectItems);
  check('24) users/{uid}/bookmarks y writerDocuments: solo el propio uid', fsA.bookmarks && fsA.writerDocuments);
  check('25) ninguna regla comodín abre todo el árbol', fsA.sinComodin);
  const stA = auditarStorage(reglasSt);
  check('26) Storage: lo generado (ai-generations) y lo subido (creator-inputs, brain-attachments) lo lee solo su dueño', stA.aiGenerations && stA.creatorInputs && stA.brainAttachments);
  check('27) Storage: cualquier otra ruta queda denegada (catch-all en false)', stA.catchAll);

  /* CONTROLES: cada mutación tiene que tumbar exactamente el detector de su colección. */
  const mutaciones = [
    ['assets', reglasFs.replace(/(match \/assets\/\{assetId\} \{\s*allow read: if isAuthenticated\(\))[^;]*;/, '$1;')],
    ['creatorProjects', reglasFs.replace(/(match \/creatorProjects\/\{projectId\} \{[\s\S]*?)request\.resource\.data\.userId == resource\.data\.userId;/, '$1true;')],
    ['creatorJobs', reglasFs.replace("hasOnly(['projectId', 'updatedAt'])", "hasOnly(['projectId', 'updatedAt', 'status'])")],
    ['bookmarks', reglasFs.replace(/(match \/bookmarks\/\{postId\} \{\s*allow read, write: if )isAuthenticated\(\) && request\.auth\.uid == userId;/, '$1isAuthenticated();')],
    ['sinComodin', `${reglasFs}\n    match /{document=**} { allow read: if isAuthenticated(); }\n`],
  ];
  for (const [clave, mutada] of mutaciones) {
    const r = auditarFirestore(mutada);
    const otras = Object.entries(r).filter(([k, v]) => k !== clave && !v).map(([k]) => k);
    check(`27c) CONTROL: una regla mutada en «${clave}» hace fallar su detector (y solo ese)`, mutada !== reglasFs && r[clave] === false && otras.length === 0, otras.join(', '));
  }
  const stMut = reglasSt.replace(/(match \/users\/\{userId\}\/ai-generations\/\{fileName\} \{\s*)allow read: if request\.auth != null && request\.auth\.uid == userId;/, '$1allow read: if true;');
  check('27c) CONTROL: ai-generations con lectura pública hace fallar el detector de Storage', stMut !== reglasSt && auditarStorage(stMut).aiGenerations === false);
}

/* ─────────────────────────── D · Servicios de verdad ─────────────────────────── */
console.log('\n── D · Los servicios: cada lectura va por la cuenta; publicar no toca la biblioteca ──');
/*
 * Firestore doblado que APUNTA cada operación: qué función, sobre qué colección, con qué filtros y qué datos.
 * Las lecturas devuelven vacío; las escrituras devuelven un id. Nada sale de Node.
 */
const crearFirestoreQueApunta = () => {
  const registro = [];
  const ref = (nombre, id) => ({ __ref: true, nombre, id });
  const api = {
    collection: (_db, nombre) => ({ __col: true, nombre }),
    collectionGroup: (_db, nombre) => ({ __col: true, nombre }),
    doc: (_dbOrCol, a, b) => (_dbOrCol && _dbOrCol.__col ? ref(_dbOrCol.nombre, a) : ref(a, b)),
    where: (campo, op, valor) => ({ tipo: 'where', campo, op, valor }),
    orderBy: (campo, dir) => ({ tipo: 'orderBy', campo, dir }),
    limit: (n) => ({ tipo: 'limit', n }),
    startAfter: (c) => ({ tipo: 'startAfter', c }),
    query: (col, ...partes) => ({ ...col, partes }),
    getDocs: async (q) => { registro.push({ op: 'getDocs', col: q.nombre, partes: q.partes ?? [] }); return { docs: [], empty: true, size: 0, forEach() {} }; },
    getDoc: async (r) => { registro.push({ op: 'getDoc', col: r.nombre, id: r.id }); return { exists: () => false, data: () => undefined, id: r.id }; },
    addDoc: async (col, datos) => { registro.push({ op: 'addDoc', col: col.nombre, datos }); return { id: `nuevo_${registro.length}` }; },
    setDoc: async (r, datos) => { registro.push({ op: 'setDoc', col: r.nombre, id: r.id, datos }); },
    updateDoc: async (r, datos) => { registro.push({ op: 'updateDoc', col: r.nombre, id: r.id, datos }); },
    deleteDoc: async (r) => { registro.push({ op: 'deleteDoc', col: r.nombre, id: r.id }); },
    deleteField: () => '__deleteField__',
    serverTimestamp: () => '__serverTimestamp__',
    increment: (n) => ({ __increment: n }),
    arrayUnion: (...v) => ({ __arrayUnion: v }),
    arrayRemove: (...v) => ({ __arrayRemove: v }),
    Timestamp: { now: () => ({ __ts: 'now', toMillis: () => 0 }), fromMillis: (ms) => ({ __ts: ms, toMillis: () => ms }), fromDate: (d) => ({ __ts: +d, toMillis: () => +d }) },
  };
  /* Lo que firestoreService importa y esta suite no usa: si alguien lo llama, se APUNTA y se ve. */
  const firestore = new Proxy(api, {
    get: (t, k) => (k in t ? t[k] : (...args) => { registro.push({ op: `otro:${String(k)}`, args }); return {}; }),
  });
  const llamadas = [];
  const functions = { httpsCallable: (_f, nombre) => async (datos) => { llamadas.push({ nombre, datos }); return { data: {} }; } };
  return { firestore, functions, registro, llamadas };
};
const cargarServicios = () => {
  const doble = crearFirestoreQueApunta();
  const config = { db: { __db: true }, functions: {}, auth: { currentUser: null }, storage: {} };
  const cargar = crearCargador({
    dobles: { 'firebase/firestore': doble.firestore, 'firebase/functions': doble.functions, '../config/firebase': config },
  });
  return { ...doble, cargar };
};
const filtroDeCuenta = (entrada, campo, uid) => entrada.partes.some((p) => p.tipo === 'where' && p.campo === campo && p.op === '==' && p.valor === uid);
{
  const s = cargarServicios();
  const { projectsService } = s.cargar('services/projectsService.ts');
  const { assetsService } = s.cargar('services/assetsService.ts');

  await projectsService.list('ana');
  await projectsService.jobsForProject('ana', 'p1');
  await assetsService.listar('ana');
  await assetsService.listar('ana', { kind: 'video', orden: 'oldest' });
  const lecturas = s.registro.filter((e) => e.op === 'getDocs');
  check('30) Mis proyectos: la lista de proyectos se pide a creatorProjects filtrada por userId == la cuenta',
    lecturas[0]?.col === 'creatorProjects' && filtroDeCuenta(lecturas[0], 'userId', 'ana'));
  check('31) un proyecto: sus trabajos se piden a creatorJobs filtrados por userId == la cuenta Y projectId',
    lecturas[1]?.col === 'creatorJobs' && filtroDeCuenta(lecturas[1], 'userId', 'ana') && filtroDeCuenta(lecturas[1], 'projectId', 'p1'));
  check('32) Mis creaciones: cada página se pide a assets filtrada por ownerAccountId == la cuenta (también con filtro y orden)',
    lecturas.slice(2).length === 2 && lecturas.slice(2).every((e) => e.col === 'assets' && filtroDeCuenta(e, 'ownerAccountId', 'ana')));
  check('33) ninguna lectura de biblioteca va sin límite (nunca la colección entera)', lecturas.every((e) => e.partes.some((p) => p.tipo === 'limit' && p.n <= 51)));
  check('34) ninguna de esas lecturas toca posts', !s.registro.some((e) => e.col === 'posts'));
  check('34c) CONTROL: el filtro de cuenta se lee de verdad (con otra cuenta, no casa)', !filtroDeCuenta(lecturas[0], 'userId', 'beto') && lecturas.length === 4);

  /* Las escrituras del cliente sobre un proyecto: solo creatorProjects y, al mover, el projectId del trabajo. */
  s.registro.length = 0;
  await projectsService.create('ana', 'Mi restaurante', '🍔');
  await projectsService.assignJob('j1', 'p1');
  const esc = s.registro.filter((e) => e.op !== 'getDocs');
  check('35) crear un proyecto escribe UN documento en creatorProjects, a nombre de la cuenta',
    esc[0]?.op === 'addDoc' && esc[0].col === 'creatorProjects' && esc[0].datos.userId === 'ana');
  check('36) mover un trabajo a un proyecto solo cambia projectId/updatedAt del trabajo (lo que permiten las reglas) y la fecha del proyecto',
    esc[1]?.op === 'updateDoc' && esc[1].col === 'creatorJobs' && Object.keys(esc[1].datos).sort().join() === 'projectId,updatedAt'
    && esc[2]?.op === 'updateDoc' && esc[2].col === 'creatorProjects' && Object.keys(esc[2].datos).join() === 'updatedAt');
  check('37) ninguna escritura del cliente toca assets (eso solo lo hace el servidor)', !s.registro.some((e) => e.col === 'assets'));

  /* Publicar un Weël. */
  const p = cargarServicios();
  const { postsService } = p.cargar('services/firestoreService.ts');
  const weel = {
    userId: 'ana', content: 'mi weël', imageUrls: [], videoUrl: 'https://res.cloudinary.com/x/video/upload/v1/w.mp4', isWeel: true,
    assetIds: ['asset_1'], videoAssetId: 'asset_1', likes: 0, comments: 0, shares: 0, views: 0, isPrivate: false, hashtags: [],
  };
  const copiaAntes = JSON.stringify(weel);
  const id = await postsService.create(weel);
  const tocadas = [...new Set(p.registro.map((e) => e.col).filter(Boolean))];
  const escrito = p.registro.find((e) => e.op === 'addDoc');
  check('38) publicar un Weël escribe UN documento y solo en posts', typeof id === 'string' && tocadas.join() === 'posts'
    && p.registro.filter((e) => e.op === 'addDoc').length === 1, tocadas.join(', '));
  check('39) …que referencia el material por id (assetIds / videoAssetId) en vez de moverlo o copiarlo',
    escrito?.datos.isWeel === true && JSON.stringify(escrito.datos.assetIds) === '["asset_1"]' && escrito.datos.videoAssetId === 'asset_1');
  check('40) …sin tocar assets, creatorProjects ni creatorJobs, sin llamar a ningún callable (deleteAsset…) y sin cambiar lo que recibió',
    !p.registro.some((e) => COLECCIONES_DE_BIBLIOTECA.includes(e.col)) && p.llamadas.length === 0 && JSON.stringify(weel) === copiaAntes
    && !p.registro.some((e) => e.op.startsWith('otro:') || e.op === 'deleteDoc' || e.op === 'updateDoc'));
  /* CONTROL: el mismo doble SÍ ve una escritura en la biblioteca cuando la hay. */
  const c = cargarServicios();
  await c.cargar('services/projectsService.ts').projectsService.remove('p1');
  await c.cargar('services/assetsService.ts').assetsService.eliminar('asset_1');
  check('40c) CONTROL: el doble apunta un borrado de proyecto (creatorProjects) y la llamada a deleteAsset',
    c.registro.some((e) => e.op === 'deleteDoc' && e.col === 'creatorProjects' && e.id === 'p1') && c.llamadas.some((l) => l.nombre === 'deleteAsset' && l.datos.assetId === 'asset_1'));

  /* El compositor: el único camino de publicar no importa nada de la biblioteca (ya lo mira B) ni la nombra. */
  const compositor = sinComentarios(leer('screens/CreateScreen.tsx'));
  check('41) el compositor (CreateScreen) publica con postsService.create y no nombra deleteAsset, creatorProjects ni projectsService',
    /postsService\.create\(postData\)/.test(compositor) && !/deleteAsset|creatorProjects|projectsService|assetsService/.test(compositor));
}

/* ─────────────────────────── E · Demo ─────────────────────────── */
console.log('\n── E · Lo de demostración no entra en la biblioteca ──');
{
  /*
   * Hoy un trabajo de Weë AI lleva `demo: true` cuando la IA se SIMULÓ (sin claves, o resultados de muestra:
   * functions/src/creator/index.ts). Eso es trabajo REAL de la persona, en modo simulado, y tiene que seguir en su
   * biblioteca. La marca de CONTENIDO de demostración (el modo demo de los emuladores, línea r9/demo-ecosistema) es
   * otra cosa: `procedenciaDemo` y un id `demo_*`. Si alguien filtrase la biblioteca por `demo`, borraría de la vista
   * el trabajo de quien no tiene claves. Esta parte fija que hoy no se filtra por `demo`, y que nadie escribe la
   * marca de contenido demo en la biblioteca.
   */
  const creatorIdx = sinComentarios(leer('functions/src/creator/index.ts'));
  check('50) el trabajo de Weë AI nace con demo: true (modo de ejecución simulado), no como contenido de demostración',
    /jobs\(\)\.doc\(\);[\s\S]{0,400}demo: true,/.test(creatorIdx));
  const lectores = ['services/projectsService.ts', 'services/assetsService.ts', 'screens/ProjectsScreen.tsx', 'screens/ProjectScreen.tsx', 'screens/MisCreacionesScreen.tsx', 'components/creator/RejillaDeCreaciones.tsx'];
  const filtraPorDemo = (src) => /where\(\s*'demo'|\.filter\([^\n]*\.demo\b|esContenidoDemo|filtrarContenidoDemo/.test(sinComentarios(src));
  const filtran = lectores.filter((f) => filtraPorDemo(leer(f)));
  check('51) ninguna lectura de la biblioteca filtra por `demo` (el trabajo simulado de la persona sigue viéndose)', filtran.length === 0, filtran.join(', '));
  check('51c) CONTROL: el detector ve un where("demo"…), un .filter(x => !x.demo) y el filtro del modo demo',
    filtraPorDemo("query(c, where('demo', '==', false))") && filtraPorDemo('items.filter((x) => !x.demo)') && filtraPorDemo('filtrarContenidoDemo(docs, p)'));

  const escritores = [
    ...fs.readdirSync(path.resolve(RAIZ, 'functions/src'), { recursive: true }).filter((f) => /\.ts$/.test(f)).map((f) => `functions/src/${String(f).split(path.sep).join('/')}`),
    ...['services/projectsService.ts', 'services/assetsService.ts', 'services/creatorService.ts', 'services/creatorUploads.ts'],
  ];
  const marcan = escritores.filter((f) => /procedenciaDemo/.test(sinComentarios(leer(f))));
  check('52) ningún escritor de la biblioteca (servidor de Weë AI / contenido, servicios del cliente) pone procedenciaDemo', marcan.length === 0, marcan.join(', '));
  check('52c) CONTROL: el detector ve procedenciaDemo fuera de un comentario y no dentro', /procedenciaDemo/.test(sinComentarios("x = { procedenciaDemo: 'wee-demo-r9' }")) && !/procedenciaDemo/.test(sinComentarios('/* procedenciaDemo */ x = 1')));
}

console.log(`\n${failures === 0 ? '✔' : '✘'} pc-regresion: ${total - failures}/${total}${failures ? ` — ${failures} fallo(s)` : ''}`);
process.exit(failures ? 1 : 0);
