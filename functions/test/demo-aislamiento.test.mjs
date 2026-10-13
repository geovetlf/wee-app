/*
 * EL MODO DEMO SE QUEDA EN LOS EMULADORES — sin emulador, sin red.
 *
 *   A · Los datos (scripts/demo/datos.mjs) son deterministas, con ids únicos `demo_*`, la marca en todo, uid con
 *       prefijo, avatares predefinidos de la app, y los recuentos esperados. Un medio que falta = elemento que no existe.
 *   B · La base de medios es un servidor de desarrollo local (http(s) a localhost/IP privada), nunca otra cosa.
 *   C · El sembrador se niega —código ≠ 0 y SIN conectarse a nada— con un proyecto que no es demo-*, sin
 *       FIRESTORE_EMULATOR_HOST o con GOOGLE_APPLICATION_CREDENTIALS (lanzado de verdad con spawnSync).
 *   D · `--retirar` solo elige lo marcado; un conflicto es un documento en un id demo sin la marca.
 *   E · La app: `esContenidoDemo`, el filtro de los feeds fuera de demo-*, la etiqueta «Demo» por i18n en las tres
 *       pantallas y en los 16 diccionarios, y nada de Storage ni Cloudinary en el modo demo.
 * Cada detector lleva su CONTROL: se le enseña lo que debe cazar y lo caza.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const datos = await import(pathToFileURL(path.join(RAIZ, 'scripts/demo/datos.mjs')).href);
const sembrador = await import(pathToFileURL(path.join(RAIZ, 'scripts/sembrar-demo.mjs')).href);
const { construirDocumentos, recontar, seleccionarParaRetirar, conflictosDeSiembra, validarBaseMedios, PROCEDENCIA_DEMO, AVATARES_PREDEFINIDOS } = datos;

const TODOS = [...datos.PUBLICACIONES.map((p) => p.imagen).filter(Boolean), ...datos.WEELS.map((w) => w.archivo)];
const BASE = 'http://192.168.0.39:8096/demo';
const AHORA = Date.UTC(2026, 9, 12, 12, 0, 0);
const construir = (medios = TODOS, ahoraMs = AHORA) => construirDocumentos({ ahoraMs, baseMedios: BASE, mediosDisponibles: medios });

console.log('── A · Los datos ──');
const uno = construir();
const otro = construir();
const docs = uno.documentos;
check('1) deterministas: dos construcciones con el mismo instante dan exactamente lo mismo', JSON.stringify(uno) === JSON.stringify(otro));
const r = recontar(docs);
check('2) recuentos: 10 creadores, 20 publicaciones (3 encuestas), 14 Weëls', r.creadores === 10 && r.publicaciones === 20 && r.encuestas === 3 && r.weels === 14, JSON.stringify(r));
check('3) hay comentarios, likes, acuerdos y seguimientos', r.comentarios > 0 && r.likes > 0 && r.acuerdos === r.likes && r.seguimientos === 30, JSON.stringify(r));
const claves = docs.map((d) => `${d.coleccion}/${d.id}`);
check('4) ids únicos por colección', new Set(claves).size === claves.length);
const sinPrefijo = docs.filter((d) => !d.id.startsWith('demo_'));
check('5) todo id empieza por demo_', sinPrefijo.length === 0, sinPrefijo.slice(0, 3).map((d) => d.id).join(', '));
const sinMarca = docs.filter((d) => d.datos.demo !== true || d.datos.procedenciaDemo !== PROCEDENCIA_DEMO);
check('6) todo documento lleva demo: true y procedenciaDemo wee-demo-r9', sinMarca.length === 0);
const CAMPOS_DE_UID = ['uid', 'userId', 'followerId', 'followingId'];
const uidsSinPrefijo = docs.flatMap((d) => CAMPOS_DE_UID.filter((c) => c in d.datos && !String(d.datos[c]).startsWith('demo_creador_')).map((c) => `${d.id}.${c}`));
check('7) ningún dato demo usa un uid sin prefijo (uid, userId, followerId, followingId)', uidsSinPrefijo.length === 0, uidsSinPrefijo.slice(0, 3).join(', '));
const postIds = new Set(docs.filter((d) => d.coleccion === 'posts').map((d) => d.id));
const huerfanos = docs.filter((d) => 'postId' in d.datos && !postIds.has(d.datos.postId));
check('8) comentarios, likes y acuerdos cuelgan de publicaciones demo que existen', huerfanos.length === 0);
const users = docs.filter((d) => d.coleccion === 'users');
check('9) creadores: nombre « (demo)», bio «Perfil de demostración.», avatar predefinido',
  users.every((u) => u.datos.displayName.endsWith(' (demo)') && u.datos.bio.startsWith('Perfil de demostración.') && u.datos.avatarType === 'predefined' && AVATARES_PREDEFINIDOS.includes(u.datos.avatarId)));
const catalogo = [...leer('components/avatars/AvatarSVGs.tsx').matchAll(/\{\s*id:\s*'([a-z]+)'/g)].map((m) => m[1]);
check('10) los avatares predefinidos existen en el catálogo de la app', AVATARES_PREDEFINIDOS.every((a) => catalogo.includes(a)) && catalogo.length >= 6, catalogo.join(','));
const posts = docs.filter((d) => d.coleccion === 'posts');
check('11) toda publicación declara isPrivate: false (la regla exige declararlo)', posts.every((p) => p.datos.isPrivate === false));
const weels = posts.filter((p) => p.datos.isWeel);
check('12) Weëls: isWeel, videoUrl .webm a la base de medios, y medioDemo generado-local/desarrollo',
  weels.every((w) => w.id.startsWith('demo_weel_') && w.datos.videoUrl.startsWith(BASE + '/') && /\.webm$/.test(w.datos.videoUrl)
    && w.datos.medioDemo.origen === 'generado-local' && w.datos.medioDemo.servidor === 'desarrollo' && /\.webm$/.test(w.datos.medioDemo.archivo)));
const conImagen = posts.filter((p) => (p.datos.imageUrls || []).length > 0);
check('13) las publicaciones con imagen apuntan a un .png de la base y no llevan vídeo',
  conImagen.length >= 10 && conImagen.every((p) => /\.png$/.test(p.datos.imageUrls[0]) && !p.datos.videoUrl && p.datos.medioDemo.archivo.endsWith('.png')));
const conIA = posts.filter((p) => p.datos.aiTools || p.datos.aiPrompt || p.datos.aiProcess);
check('14) varias llevan «Cómo lo hice» (aiTools/aiPrompt/aiProcess)', conIA.length >= 5, String(conIA.length));
const encuestas = posts.filter((p) => p.datos.poll);
check('15) encuestas con la estructura real: ids, counts por id, totalVotes = suma, endsAt futuro, allowChange',
  encuestas.length === 3 && encuestas.every(({ datos: { poll } }) => poll.options.every((o) => typeof o.id === 'string' && o.id && poll.counts[o.id] >= 0 && !('votes' in o) && !('votedBy' in o))
    && Object.keys(poll.counts).length === poll.options.length && poll.totalVotes === Object.values(poll.counts).reduce((a, b) => a + b, 0)
    && poll.endsAt > AHORA && poll.allowChange === true && typeof poll.question === 'string'));
const fechas = docs.filter((d) => d.coleccion === 'posts').map((d) => d.datos.createdAt);
check('16) fechas repartidas en los últimos 10 días, relativas al instante de sembrar', fechas.every((f) => f <= AHORA && f >= AHORA - 10 * 24 * 3600 * 1000));
const secciones = new Set(posts.map((p) => p.datos.sourceSection).filter(Boolean));
check('17) variadas: Weë Studio, Design, Chef y viajes como sección; arte y tecnología como temas',
  ['studio', 'design', 'chef', 'travel'].every((s) => secciones.has(s)) && posts.some((p) => p.datos.tags.includes('arte')) && posts.some((p) => p.datos.tags.includes('tecnologia')));
const likesIds = docs.filter((d) => d.coleccion === 'likes');
check('18) likes con id {userId}_{postId} (= demo_<creador>_<post>) y nadie se da like a sí mismo',
  likesIds.every((l) => l.id === `${l.datos.userId}_${l.datos.postId}`) && likesIds.every((l) => posts.find((p) => p.id === l.datos.postId).datos.userId !== l.datos.userId));
check('19) los contadores de cada publicación cuadran con sus likes y comentarios',
  posts.every((p) => p.datos.likes === docs.filter((d) => d.coleccion === 'likes' && d.datos.postId === p.id).length
    && p.datos.comments === docs.filter((d) => d.coleccion === 'comments' && d.datos.postId === p.id).length));
{
  const sinUno = construir(TODOS.filter((f) => f !== 'weel-03.webm' && f !== 'img-02.png'));
  const ids = new Set(sinUno.documentos.map((d) => d.id));
  check('20) CONTROL: si falta un medio, ese elemento no se crea (ni sus likes/comentarios) y se dice',
    !ids.has('demo_weel_03') && !ids.has('demo_post_03') && sinUno.omitidos.length === 2
    && !sinUno.documentos.some((d) => d.datos.postId === 'demo_weel_03' || d.datos.postId === 'demo_post_03'));
  const sinNada = construir([]);
  check('21) sin medios, ningún Weël y ninguna publicación con imagen (nunca una imagen haciéndose pasar por vídeo)',
    recontar(sinNada.documentos).weels === 0 && !sinNada.documentos.some((d) => (d.datos.imageUrls || []).length > 0 || d.datos.videoUrl));
}
{
  /* El disparador nacimientoDeCuenta ignora identidades con «_» (FORMA_DE_IDENTIDAD): un creador demo nunca nace como cuenta. */
  const forma = leer('functions/src/social/econtact.ts').match(/const FORMA_DE_IDENTIDAD = \/(.+)\/;/);
  const re = forma && new RegExp(forma[1]);
  check('22) los uid demo no son identidades válidas: nacimientoDeCuenta no les crea cuenta, entidad ni billetera',
    !!re && users.every((u) => !re.test(u.datos.uid)) && re.test('abcDEF123'), forma ? forma[1] : 'sin regex');
}

console.log('\n── B · La base de medios ──');
const aceptadas = ['http://192.168.0.39:8096/demo', 'http://127.0.0.1:8096', 'http://localhost:8096/demo/', 'https://10.0.0.5/m', 'http://172.16.3.4:9000', 'http://[::1]:8096/x'];
const rechazadas = ['https://example.com/demo', 'http://8.8.8.8/demo', 'ftp://192.168.0.39/demo', 'http://u:p@192.168.0.39/demo', 'http://172.32.0.1/x', 'http://192.168.0.39/demo?x=1', '', undefined, 'gs://bucket/x', 'https://res.cloudinary.com/x'];
check('23) acepta http(s) a localhost y a IP privadas', aceptadas.every((b) => validarBaseMedios(b).ok), aceptadas.filter((b) => !validarBaseMedios(b).ok).join(', '));
check('24) CONTROL: rechaza dominios públicos, IP públicas, otros protocolos, credenciales, query, vacío, Storage y Cloudinary',
  rechazadas.every((b) => !validarBaseMedios(b).ok), rechazadas.filter((b) => validarBaseMedios(b).ok).join(', '));
check('25) normaliza la barra final', validarBaseMedios('http://localhost:8096/demo/').base === 'http://localhost:8096/demo');

console.log('\n── C · El sembrador se niega antes de conectarse ──');
const MEDIOS_FALSOS = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-demo-medios-'));
try {
  const base = ['--medios', MEDIOS_FALSOS, '--base-medios', BASE];
  const entornoLimpio = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(FIRESTORE_EMULATOR_HOST|GOOGLE_APPLICATION_CREDENTIALS|GCLOUD_PROJECT|GOOGLE_CLOUD_PROJECT|FIREBASE_)/.test(k)));
  /* Un emulador que no existe: si el sembrador llegara a conectarse, se vería (cabecera «MODO DEMO» o error de red). */
  const MUERTO = '127.0.0.1:1';
  const lanzar = (args, extra) => spawnSync(process.execPath, [path.join(RAIZ, 'scripts/sembrar-demo.mjs'), ...args], { cwd: RAIZ, encoding: 'utf8', env: { ...entornoLimpio, ...extra }, timeout: 60000 });
  const noConecta = (x) => !/MODO DEMO/.test(x.stdout);
  const real = lanzar(['--project', 'get-wee', '--ejecutar', ...base], { FIRESTORE_EMULATOR_HOST: MUERTO });
  check('26) proyecto real (get-wee) → código 2, sin conectarse', real.status === 2 && noConecta(real) && /demo-\*/.test(real.stderr), `${real.status} ${real.stderr.trim()}`);
  const otroReal = lanzar(['--ejecutar', ...base], { FIRESTORE_EMULATOR_HOST: MUERTO, GCLOUD_PROJECT: 'wee-dev-geovet' });
  check('27) proyecto real por el entorno (GCLOUD_PROJECT) → código 2', otroReal.status === 2 && noConecta(otroReal), `${otroReal.status}`);
  const sinEmu = lanzar(['--project', 'demo-wee-design', '--ejecutar', ...base], {});
  check('28) sin FIRESTORE_EMULATOR_HOST → código 2, sin conectarse', sinEmu.status === 2 && noConecta(sinEmu) && /FIRESTORE_EMULATOR_HOST/.test(sinEmu.stderr), `${sinEmu.status} ${sinEmu.stderr.trim()}`);
  const conCred = lanzar(['--project', 'demo-wee-design', '--ejecutar', ...base], { FIRESTORE_EMULATOR_HOST: MUERTO, GOOGLE_APPLICATION_CREDENTIALS: path.join(MEDIOS_FALSOS, 'no-existe.json') });
  check('29) con GOOGLE_APPLICATION_CREDENTIALS → código 2, sin conectarse', conCred.status === 2 && noConecta(conCred) && /GOOGLE_APPLICATION_CREDENTIALS/.test(conCred.stderr), `${conCred.status} ${conCred.stderr.trim()}`);
  const retirarReal = lanzar(['--project', 'get-wee', '--retirar'], { FIRESTORE_EMULATOR_HOST: MUERTO });
  check('30) --retirar tampoco corre fuera de demo-*', retirarReal.status === 2 && noConecta(retirarReal));
  const basePublica = lanzar(['--project', 'demo-wee-design', '--medios', MEDIOS_FALSOS, '--base-medios', 'https://example.com/x'], { FIRESTORE_EMULATOR_HOST: MUERTO });
  check('31) base de medios pública → código 2, sin conectarse', basePublica.status === 2 && noConecta(basePublica));
  const sinBase = lanzar(['--project', 'demo-wee-design', '--medios', MEDIOS_FALSOS], { FIRESTORE_EMULATOR_HOST: MUERTO });
  check('32) sin --base-medios → código 2', sinBase.status === 2 && /base-medios/.test(sinBase.stderr));
  /* CONTROL de la decisión (pura): con todo en orden, pasa; y cada guarda, por separado, la tumba. */
  const bien = sembrador.decidirModo({ argv: ['--project', 'demo-wee-design', ...base], env: { FIRESTORE_EMULATOR_HOST: MUERTO } });
  check('33) CONTROL: con proyecto demo-*, emulador, sin credenciales y base local, el modo es ENSAYO por defecto', bien.ok && bien.accion === 'ensayo');
  const ejecutar = sembrador.decidirModo({ argv: ['--project', 'demo-wee-design', '--ejecutar', ...base], env: { FIRESTORE_EMULATOR_HOST: MUERTO } });
  const retirar = sembrador.decidirModo({ argv: ['--project', 'demo-wee-design', '--retirar'], env: { FIRESTORE_EMULATOR_HOST: MUERTO } });
  const ensayoRetirar = sembrador.decidirModo({ argv: ['--project', 'demo-wee-design', '--retirar', '--ensayo'], env: { FIRESTORE_EMULATOR_HOST: MUERTO } });
  check('34) --ejecutar siembra; --retirar retira (sin pedir medios); --retirar --ensayo solo enseña',
    ejecutar.accion === 'sembrar' && retirar.accion === 'retirar' && ensayoRetirar.accion === 'ensayo-retirar');
  const codigo = leer('scripts/sembrar-demo.mjs');
  const iDecide = codigo.indexOf('const modo = decidirModo(');
  const iAdmin = codigo.indexOf("require('firebase-admin')");
  check('35) el SDK de administración se carga DESPUÉS de las guardas', iDecide > 0 && iAdmin > iDecide);
} finally {
  fs.rmSync(MEDIOS_FALSOS, { recursive: true, force: true });
}

console.log('\n── D · Retirar y conflictos ──');
{
  const marcado = (coleccion, id) => ({ coleccion, id, datos: { demo: true, procedenciaDemo: PROCEDENCIA_DEMO } });
  const mezcla = [
    marcado('posts', 'demo_post_01'), marcado('users', 'demo_creador_01'), marcado('likes', 'demo_creador_02_demo_post_01'),
    { coleccion: 'posts', id: 'demo_post_99', datos: { content: 'real, con id demo_ y sin marca' } },
    { coleccion: 'posts', id: 'abc123', datos: { content: 'real' } },
    { coleccion: 'posts', id: 'demo_post_98', datos: { demo: true } },
    { coleccion: 'posts', id: 'demo_post_97', datos: { procedenciaDemo: 'otra-siembra' } },
    { coleccion: 'creditTransactions', id: 'demo_x', datos: { procedenciaDemo: PROCEDENCIA_DEMO } },
  ];
  const elegidos = seleccionarParaRetirar(mezcla).map((d) => d.id);
  check('36) --retirar elige SOLO lo que lleva procedenciaDemo wee-demo-r9, en las colecciones demo',
    elegidos.length === 3 && elegidos.includes('demo_post_01') && elegidos.includes('demo_creador_01'), elegidos.join(', '));
  check('37) CONTROL: un documento con id demo_ pero sin la marca (o con otra procedencia, o solo demo:true) se queda',
    !elegidos.includes('demo_post_99') && !elegidos.includes('demo_post_98') && !elegidos.includes('demo_post_97') && !elegidos.includes('abc123') && !elegidos.includes('demo_x'));
  const conflictos = conflictosDeSiembra([{ coleccion: 'posts', id: 'demo_post_01', datos: null }, marcado('posts', 'demo_post_02'), { coleccion: 'posts', id: 'demo_post_03', datos: { content: 'ajeno' } }]);
  check('38) conflicto = id demo ocupado por algo sin la marca (vacío o ya demo no lo son)', conflictos.length === 1 && conflictos[0].id === 'demo_post_03');
  const codigo = leer('scripts/sembrar-demo.mjs');
  check('39) con conflicto sale con código 3 ANTES de escribir', /return CODIGO_CONFLICTO;[\s\S]*lote\.set/.test(codigo) && sembrador.CODIGO_CONFLICTO === 3);
}

console.log('\n── E · La app ──');
const require = createRequire(path.join(RAIZ, 'functions/package.json'));
const ts = require('typescript');
const js = ts.transpileModule(leer('utils/contenidoDemo.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const app = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
check('40) esContenidoDemo decide por procedenciaDemo wee-demo-r9 y no por lo demás',
  app.esContenidoDemo({ procedenciaDemo: 'wee-demo-r9' }) && app.esContenidoDemo({ procedenciaDemo: 'wee-demo-r9', demo: true })
  && !app.esContenidoDemo({ procedenciaDemo: 'otra' }) && !app.esContenidoDemo({}) && !app.esContenidoDemo(null) && !app.esContenidoDemo(undefined));
check('40b) CONTROL: `demo: true` sin procedencia NO es contenido demo (en creatorJobs significa «trabajo real en modo simulado»)',
  !app.esContenidoDemo({ demo: true }) && !app.esContenidoDemo({ demo: true, id: 'demo_post_01' }));
check('41) la procedencia es la misma en la app y en el sembrador', app.PROCEDENCIA_DEMO === PROCEDENCIA_DEMO);
const lista = [{ id: 'a' }, { id: 'b', demo: true }, { id: 'c', procedenciaDemo: 'wee-demo-r9', demo: true }];
check('42) fuera de demo-* (get-wee, wee-dev-geovet, sin proyecto) el filtro descarta lo marcado con la procedencia, y deja un `demo: true` suelto',
  ['get-wee', 'wee-dev-geovet', undefined, ''].every((p) => JSON.stringify(app.filtrarContenidoDemo(lista, p).map((x) => x.id)) === '["a","b"]'));
check('43) CONTROL: en un proyecto demo-* se enseña todo', app.filtrarContenidoDemo(lista, 'demo-wee-design').length === 3);
{
  const servicio = leer('services/firestoreService.ts');
  const usaFiltro = (s, metodo) => {
    const i = s.indexOf(`${metodo}: async`);
    const j = s.indexOf('\n  },', i);
    return i > 0 && /sinDemoFueraDeLosEmuladores\(/.test(s.slice(i, j));
  };
  const feeds = ['getMuroGeneralPaginado', 'getVideoPostsPaginated', 'getByCommunityIdPaginated', 'getByCommunitySlugPaginated'];
  check('44) los feeds (muro, Weëls, comunidad por id y por slug) pasan por el filtro', feeds.every((f) => usaFiltro(servicio, f)), feeds.filter((f) => !usaFiltro(servicio, f)).join(', '));
  check('45) el filtro mira el proyecto de la app (EXPO_PUBLIC_FIREBASE_PROJECT_ID)', /filtrarContenidoDemo\(docs, process\.env\.EXPO_PUBLIC_FIREBASE_PROJECT_ID\)/.test(servicio));
  const sinFiltro = servicio.replace(/sinDemoFueraDeLosEmuladores\(result\.documents\.filter\(p => !!p\.videoUrl\)\)/, 'result.documents.filter(p => !!p.videoUrl)');
  check('46) CONTROL: el detector caza un feed que no filtra', !usaFiltro(sinFiltro, 'getVideoPostsPaginated'));
}
{
  const etiqueta = leer('components/EtiquetaDemo.tsx');
  check('47) la etiqueta pinta t(\'wall.demoBadge\') con accessibilityLabel t(\'wall.demoBadgeLabel\') y usa esContenidoDemo',
    /t\('wall\.demoBadge'\)/.test(etiqueta) && /t\('wall\.demoBadgeLabel'\)/.test(etiqueta) && /esContenidoDemo/.test(etiqueta));
  const aMano = (s) => /<Text[^>]*>\s*(?:\{['"]\s*['"]\}\s*)?(Demo|Démo|デモ)\s*</.test(s) || /['"](Demo|Démo)['"]/.test(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));
  check('48) y no lleva «Demo» escrito a mano', !aMano(etiqueta));
  check('49) CONTROL: el detector caza un «Demo» escrito a mano', aMano('<Text style={s}>Demo</Text>') && aMano("const x = 'Demo';"));
  const pantallas = { 'components/PostCard.tsx': /<EtiquetaDemo de=\{\[post, postAuthor\]\}/, 'screens/ReelsScreen.tsx': /<EtiquetaDemo de=\{\[post, postAuthor\]\}/, 'screens/UserProfileScreen.tsx': /<EtiquetaDemo de=\{\[userProfile\]\}/ };
  const faltan = Object.entries(pantallas).filter(([f, re]) => !re.test(leer(f))).map(([f]) => f);
  check('50) PostCard, la cabecera del Weël y el perfil dicen «Demo» junto al nombre', faltan.length === 0, faltan.join(', '));
  const idiomas = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((d) => fs.statSync(path.join(RAIZ, 'i18n/textos', d)).isDirectory());
  const sinClaves = idiomas.filter((l) => {
    const s = leer(`i18n/textos/${l}/wall.ts`);
    return !/\n\s*demoBadge: '[^']+',/.test(s) || !/\n\s*demoBadgeLabel: '[^']+',/.test(s);
  });
  check(`51) las dos claves están en los ${idiomas.length} diccionarios`, idiomas.length === 16 && sinClaves.length === 0, sinClaves.join(', '));
}
{
  const fuentes = ['scripts/sembrar-demo.mjs', 'scripts/demo/datos.mjs'].map((f) => leer(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')).join('\n');
  const almacenamiento = (s) => /storage\(\)|FIREBASE_STORAGE_EMULATOR_HOST|images\/posts|cloudinary|\.upload\(|getDownloadURL|:9199/i.test(s);
  check('52) el modo demo no sube nada: ni Storage, ni Cloudinary, ni rutas images/posts', !almacenamiento(fuentes));
  check('53) CONTROL: el detector caza una subida a Storage o a Cloudinary', almacenamiento('admin.storage().bucket()') && almacenamiento('https://api.cloudinary.com/v1_1/x/upload'));
}
check('54) esta suite está en la cadena de npm test', /node test\/demo-aislamiento\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
