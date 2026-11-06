/*
 * EL MODO DEMO, AISLADO Y HONESTO (docs/WEE-DEMO.md). Sin emuladores: datos puros y fuentes.
 *
 * Vigila que la demo no pueda tocar producción, que todo lo sembrado esté marcado, que el reinicio sea determinista y
 * que «Cómo lo hice» cuente solo lo que dice el registro de medios.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COLECCIONES_DEMO, CREADORES, ESPECTADOR, PUBLICACIONES, WEELS, comoLoHice, construirDocumentos, recontar, validarBaseMedios,
} from '../../scripts/demo/datos.mjs';
import { TOPE_ABSOLUTO_USD, cabeOtroIntento, decidirGeneracion, gastoAcumulado, planDeMedios, presupuesto, sinSecretos } from '../../scripts/demo/medios.mjs';
import { decidirModo } from '../../scripts/sembrar-demo.mjs';
import { resolverMedio } from '../../scripts/demo/servidor-medios.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fuente = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
let fallos = 0;
let total = 0;
const check = (nombre, ok, detalle = '') => {
  total++;
  if (!ok) fallos++;
  console.log(`${ok ? 'OK ' : 'NO '} ${nombre}${!ok && detalle ? ` — ${detalle}` : ''}`);
};

/* Un registro completo, todo generado con IA salvo lo planeado como stock. */
const registroCompleto = () => Object.fromEntries(planDeMedios().map((m) => [m.id, m.origen === 'stock'
  ? { archivo: `${m.id}.mp4`, origen: 'stock', licencia: 'Pexels License', fuente: 'https://example.test/v', autor: 'Autor' }
  : { archivo: `${m.id}.${m.tipo === 'video' ? 'mp4' : 'png'}`, origen: 'ia', modelo: 'modelo', prompt: m.prompt }]));
const AHORA = 1_800_000_000_000;
const BASE = 'http://192.168.0.39:8096';
const { documentos, omitidos } = construirDocumentos({ ahoraMs: AHORA, baseMedios: BASE, registro: registroCompleto() });
const r = recontar(documentos);

/* 1. Lo que pide el encargo */
check('1a) 15–20 creadores', CREADORES.length >= 15 && CREADORES.length <= 20, String(CREADORES.length));
check('1b) 20–30 publicaciones', PUBLICACIONES.length >= 20 && PUBLICACIONES.length <= 30, String(PUBLICACIONES.length));
check('1c) 15–25 Weëls', WEELS.length >= 15 && WEELS.length <= 25, String(WEELS.length));
check('1d) con todos los medios no se omite nada', omitidos.length === 0);
check('1e) las categorías de Weëls están todas', ['AI filmmaking', 'Food', 'Music', 'Digital art', 'Travel', 'Fashion', 'Architecture', 'Technology'].every((c) => WEELS.some((w) => w.tema === c)));
check('1f) hay respuestas a comentarios', r.respuestas > 0);
check('1g) los oficios pedidos están todos', ['artist', 'filmmaker', 'musician', 'chef', 'photographer', 'fashion', 'traveler', 'entrepreneur', 'enthusiast'].every((o) => CREADORES.some((c) => c.oficio === o)));
check('1h) cada creador tiene bio, país e intereses', CREADORES.every((c) => c.bio && c.pais && c.intereses.length));
check('1i) la IA manda sobre el stock en los Weëls', WEELS.filter((w) => w.origen === 'ia').length > WEELS.filter((w) => w.origen === 'stock').length);

/* 2. Todo marcado */
check('2a) todo documento lleva isDemo: true', documentos.every((d) => d.datos.isDemo === true));
check('2b) solo escribe en sus colecciones', documentos.every((d) => COLECCIONES_DEMO.includes(d.coleccion.split('/')[0])));
check('2c) todo id delata que es demo', documentos.every((d) => /demo/i.test(d.id)));
const persona = /(gmail|outlook|yahoo|hotmail)\.com/i;
check('2d) ningún correo real', !persona.test(JSON.stringify(documentos)) && ESPECTADOR.correo.endsWith('.test'));

/* 3. Solo emuladores */
const envOk = { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' };
check('3a) se niega con un proyecto real', !decidirModo({ argv: ['--project', 'get-wee', '--retirar'], env: envOk }).ok);
check('3b) se niega sin emulador de Firestore', !decidirModo({ argv: ['--retirar'], env: { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' } }).ok);
check('3c) se niega sin emulador de Auth', !decidirModo({ argv: ['--retirar'], env: { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' } }).ok);
check('3d) se niega con un emulador que no es local', !decidirModo({ argv: ['--retirar'], env: { ...envOk, FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' } }).ok);
check('3e) se niega con credenciales de servicio', !decidirModo({ argv: ['--retirar'], env: { ...envOk, GOOGLE_APPLICATION_CREDENTIALS: 'x.json' } }).ok);
check('3f) control: un demo-* con emuladores sí puede', decidirModo({ argv: ['--retirar'], env: envOk }).ok === true);
const sembrador = fuente('scripts/sembrar-demo.mjs');
check('3g) vaciar solo usa la API del emulador', sembrador.includes('/emulator/v1/projects/') && !/recursiveDelete|listCollections/.test(sembrador));
check('3h) la base de medios no puede ser pública', !validarBaseMedios('https://storage.googleapis.com/x').ok && validarBaseMedios(BASE).ok);
const web = fuente('scripts/demo/entorno.mjs');
check('3i) el arranque web/nativo exige un proyecto demo-*', web.includes("startsWith('demo-')"));

/* 4. Reinicio determinista */
const quitarFechas = (ds) => JSON.stringify(ds.map((d) => ({ ...d, datos: { ...d.datos, createdAt: 0, updatedAt: 0, respondedAt: 0 } })));
const otraVez = construirDocumentos({ ahoraMs: AHORA, baseMedios: BASE, registro: registroCompleto() });
check('4a) dos siembras iguales dan lo mismo', JSON.stringify(otraVez.documentos) === JSON.stringify(documentos));
const masTarde = construirDocumentos({ ahoraMs: AHORA + 86_400_000, baseMedios: BASE, registro: registroCompleto() });
check('4b) el orden no depende del día', masTarde.documentos.map((d) => d.id).join() === documentos.map((d) => d.id).join());
check('4c) sin relojes ni azar propios', !/Date\.now|Math\.random/.test(fuente('scripts/demo/datos.mjs')));
void quitarFechas;

/* 5. Honestidad de «Cómo lo hice» y de los medios */
const posts = documentos.filter((d) => d.coleccion === 'posts');
const stock = posts.filter((d) => d.datos.medioDemo?.origen === 'stock');
check('5a) lo de stock no presume de IA', stock.length > 0 && stock.every((d) => !d.datos.aiTools && !d.datos.aiPrompt && !d.datos.aiProcess));
check('5b) lo de stock lleva su licencia', stock.every((d) => d.datos.medioDemo.licencia && d.datos.medioDemo.fuente));
const ia = posts.filter((d) => d.datos.medioDemo?.origen === 'ia');
const registro = registroCompleto();
check('5c) el prompt que se ve es el del registro', ia.length > 0 && ia.every((d) => d.datos.aiPrompt === registro[d.datos.medioDemo.id].prompt));
check('5d) lo provisional lo dice y no se atribuye herramientas', (() => {
  const c = comoLoHice({ herramienta: 'Weë Studio', proceso: 'x' }, { origen: 'provisional' });
  return !c.aiTools && !c.aiPrompt && /placeholder/i.test(c.aiProcess);
})());
check('5e) un origen desconocido no cuenta nada', Object.keys(comoLoHice({ herramienta: 'x' }, { origen: 'otro' })).length === 0);
check('5f) sin su medio el elemento no existe', (() => {
  const { documentos: ds, omitidos: om } = construirDocumentos({ ahoraMs: AHORA, baseMedios: BASE, registro: {} });
  return om.length > 0 && !ds.some((d) => d.coleccion === 'posts' && (d.datos.videoUrl || d.datos.imageUrls.length));
})());
const weels = posts.filter((d) => d.datos.isWeel);
check('5g) un Weël siempre tiene vídeo de verdad', weels.length > 0 && weels.every((d) => /\.(mp4|webm)$/.test(d.datos.videoUrl)));
check('5h) los recuentos salen de lo sembrado', posts.every((d) => d.datos.agreementCount === documentos.filter((x) => x.coleccion === 'votes' && x.datos.postId === d.id).length));
check('5i) los comentarios también', posts.every((d) => d.datos.comments === documentos.filter((x) => x.coleccion === 'comments' && x.datos.postId === d.id).length));
check('5j) nombres sin sufijo y sin personas conocidas', CREADORES.every((c) => !/demo/i.test(c.nombre)));

/* 6. Gasto: nada sin tope autorizado */
const envGen = { FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199' };
check('6a) sin tope no se genera', !decidirGeneracion({ argv: ['--ejecutar'], env: envGen }).ok);
check('6b) un tope no válido no vale', !decidirGeneracion({ argv: ['--autorizado-usd', '0'], env: envGen }).ok);
check('6c) sin emulador de Storage no se genera', !decidirGeneracion({ argv: ['--autorizado-usd', '10'], env: {} }).ok);
check('6d) proyecto real, no', !decidirGeneracion({ argv: ['--autorizado-usd', '10', '--project', 'get-wee'], env: envGen }).ok);
check('6e) control: con todo, sí', decidirGeneracion({ argv: ['--autorizado-usd', '10'], env: envGen }).ok === true);
const coste = presupuesto(planDeMedios(), {});
check('6f) el presupuesto cuadra con lo pendiente', coste.imagenes > 0 && coste.videos === WEELS.filter((w) => w.origen === 'ia').length && coste.usd > 0);
check('6g) lo ya generado no se vuelve a pagar', presupuesto(planDeMedios(), registroCompleto()).usd === 0);
check('6j) un tope mayor que lo autorizado no se acepta', !decidirGeneracion({ argv: ['--autorizado-usd', String(TOPE_ABSOLUTO_USD + 1)], env: envGen }).ok);
check('6k) los fallos cuentan como gasto', gastoAcumulado({ intentos: [{ usd: 1, estado: 'fallo' }, { usd: 2, estado: 'hecho' }] }) === 3);
check('6l) no cabe lo que pasaría del tope', !cabeOtroIntento({ intentos: [{ usd: 19.5 }] }, 0.72, 100) && cabeOtroIntento({ intentos: [{ usd: 19 }] }, 0.72, 20));
check('6m) un secreto no sale en un mensaje', sinSecretos('fallo con clave-muy-secreta', ['clave-muy-secreta']) === 'fallo con [oculto]');
const planActual = planDeMedios();
const video07 = planActual.find((m) => m.id === 'weel-07');
check('6p) weel-07 parte de una referencia sin personas', video07.primerFotograma === 'weel-07-ref' && !planActual.some((m) => m.id === 'weel-07-thumb') && !/\bmodel\b|\bwoman\b|\bperson\b/i.test(video07.prompt));
check('6q) la referencia prohíbe personas, siluetas y maniquíes', /No people, no faces, no human silhouettes, no mannequins/.test(planActual.find((m) => m.id === 'weel-07-ref').prompt));
const conPersona = planActual.filter((m) => m.tipo === 'video' && /\b(woman|man|model|person)\b/i.test(m.prompt));
check('6s) ningún vídeo planeado pide una persona', conPersona.length === 0, conPersona.map((m) => m.id).join());
const generador = fuente('scripts/demo/generar-medios.mjs');
check('6t) «--solo imagenes» no deja pasar vídeos', generador.includes("m.tipo === 'imagen'") && generador.includes('soloImagenes'));
check('6u) varios fallos seguidos detienen el gasto', generador.includes('FALLOS_SEGUIDOS_MAXIMOS'));
check('6r) cada ejecución puede llevar su propio tope', generador.includes('--tope-ejecucion') && generador.indexOf('> topeEjecucion') < generador.indexOf('geminiAdapter.run('));
check('6n) las claves no se aceptan por argumento', !/valor\(argv, '--(clave|key|api)/i.test(generador) && generador.includes('setRawMode(true)'));
check('6o) sin reintentos automáticos: el intento se apunta antes de llamar', generador.indexOf('libro.intentos.push(intento)') < generador.indexOf('geminiAdapter.run('));
check('6h) la generación pasa por los adaptadores', generador.includes('engine/providers/gemini.js') && generador.includes('engine/providers/seedance.js') && !/generativelanguage|bytepluses/.test(generador));
check('6i) el generador no imprime claves', !/console\.[a-z]+\([^)]*(API_KEY|apiKey)/.test(generador));

/* 7. El servidor de medios */
const tmp = path.join(RAIZ, 'scripts/demo');
check('7a) no sale de su carpeta', resolverMedio(tmp, '/../datos.mjs') === null && resolverMedio(tmp, '/%2e%2e%2fdatos.mjs') === null);
check('7b) no sirve lo que no es un medio', resolverMedio(tmp, '/datos.mjs') === null);

check('7a2) un error de lectura no tumba el servidor', fuente('scripts/demo/servidor-medios.mjs').includes("lectura.on('error'") && fuente('scripts/demo/servidor-medios.mjs').split('.pipe(res)').length === 2);

/* 7b. Copias ligeras */
const { anchosDe, cajasDe, moovDelante } = await import('../../scripts/demo/optimizar-medios.mjs');
const caja = (tipo, cuerpo) => { const b = Buffer.alloc(8 + cuerpo.length); b.writeUInt32BE(b.length, 0); b.write(tipo, 4, 'latin1'); cuerpo.copy(b, 8); return b; };
const stco = Buffer.alloc(12); stco.writeUInt32BE(1, 4); stco.writeUInt32BE(100, 8);
const mp4 = Buffer.concat([caja('ftyp', Buffer.from('isom')), caja('mdat', Buffer.from('datos')), caja('moov', caja('trak', caja('mdia', caja('minf', caja('stbl', caja('stco', stco))))))]);
const reordenado = moovDelante(mp4);
const tiposMp4 = cajasDe(reordenado).map((c) => c.tipo).join();
const moovLargo = cajasDe(mp4).find((c) => c.tipo === 'moov').largo;
const pos = reordenado.indexOf(Buffer.from('stco', 'latin1'));
check('7c) el índice del vídeo pasa delante', tiposMp4 === 'ftyp,moov,mdat', tiposMp4);
check('7d) sus desplazamientos se corrigen', reordenado.readUInt32BE(pos + 12) === 100 + moovLargo);
check('7e) lo ya ordenado no cambia', moovDelante(reordenado) === reordenado);
check('7f) los avatares se piden pequeños', anchosDe('avatar-01').mini <= 160 && anchosDe('post-01').ligero <= 1080);
const conCopias = construirDocumentos({ ahoraMs: AHORA, baseMedios: BASE, registro: { ...registroCompleto(), 'post-02': { archivo: 'post-02.jpg', ligero: 'l-post-02.webp', mini: 'm-post-02.webp', origen: 'ia', prompt: 'p' } } }).documentos.find((d) => d.id === 'demoPost02');
check('7g) se ve la copia, y el original sigue registrado', conCopias.datos.imageUrls[0].endsWith('l-post-02.webp') && conCopias.datos.imageUrlsThumbnails[0].endsWith('m-post-02.webp') && conCopias.datos.medioDemo.archivo === 'post-02.jpg');

/* 7h. Píldoras del Home */
const { seccionDe } = await import('../../scripts/demo/datos.mjs');
check('7i) moda va a la píldora Weë Fashion', seccionDe('fashion').destinations.includes('business') && seccionDe('fashion').sourceSection === 'business');
check('7j) lo de negocios no se cuela en Weë Fashion', !seccionDe('business').destinations.includes('business'));
check('7k) toda publicación sigue en el muro general', posts.every((d) => d.datos.destinations.includes('general')));
check('7l) cada píldora tiene publicaciones', ['studio', 'travel', 'music', 'chef', 'design', 'business'].every((s) => posts.some((d) => d.datos.destinations.includes(s))));

/* 7q. El perfil de quien mira */
const { DEL_ESPECTADOR, DEL_PERFIL_WEE } = await import('../../scripts/demo/datos.mjs');
const registroReal = Object.fromEntries(Object.entries(registroCompleto()).filter(([k, v]) => v.origen === 'ia' && !['post-15', 'weel-10'].includes(k)));
const docsReales = construirDocumentos({ ahoraMs: AHORA, baseMedios: BASE, registro: registroReal }).documentos;
const postsReales = docsReales.filter((d) => d.coleccion === 'posts');
check('7r) quien mira tiene publicaciones, repartidas entre sus dos caras', postsReales.filter((d) => d.datos.userId === ESPECTADOR.uid).length === DEL_ESPECTADOR.length - DEL_PERFIL_WEE.length
  && postsReales.filter((d) => d.datos.userId === ESPECTADOR.uidWee).length === DEL_PERFIL_WEE.length);
check('7s) ningún creador se queda vacío', CREADORES.every((c) => postsReales.some((d) => d.datos.userId === c.id)), CREADORES.filter((c) => !postsReales.some((d) => d.datos.userId === c.id)).map((c) => c.nombre).join());
check('7t) su recuento sale de lo sembrado', docsReales.find((d) => d.id === ESPECTADOR.uid).datos.posts === DEL_ESPECTADOR.length - DEL_PERFIL_WEE.length
  && docsReales.find((d) => d.id === ESPECTADOR.uidWee).datos.posts === DEL_PERFIL_WEE.length);

/* 7u. WeeTalk */
const conv = documentos.find((d) => d.coleccion === 'conversations');
const msgs = documentos.filter((d) => d.coleccion === `conversations/${conv.id}/messages`);
check('7v) una conversación entre dos perfiles', conv.datos.participants.length === 2 && conv.datos.participants.includes(ESPECTADOR.uid));
check('7w) con mensajes de los dos, en orden y marcada demo', new Set(msgs.map((m) => m.datos.senderId)).size === 2 && msgs.every((m, i) => i === 0 || m.datos.timestamp >= msgs[i - 1].datos.timestamp) && conv.datos.isDemo === true && msgs.every((m) => m.datos.isDemo === true));

/* Sin bono de bienvenida (dueño, 2026-11-04): la cuenta queda sembrada inicializada, a 0 y sin movimientos. */
check('7aa) el saldo inicial queda sembrado: inicializado y en 0, sin bienvenida',
  (() => { const d = documentos.find((x) => x.id === ESPECTADOR.uid).datos; return d.creditsBalance === 0 && d.creditsLifetimeEarned === 0 && !!d.creditsInitializedAt; })()
  && !documentos.some((d) => d.coleccion === 'creditTransactions'));

/* 7x. Proyectos de Chef */
const proyectos = documentos.filter((d) => d.coleccion === 'creatorJobs');
check('7y) quien mira tiene proyectos de Chef con foto', proyectos.length === 4 && proyectos.every((d) => d.datos.userId === ESPECTADOR.uid && d.datos.experienceId === 'chef' && d.datos.results[0].url && d.datos.isDemo === true));
check('7z) no costaron Credits', proyectos.every((d) => d.datos.creditsCharged === 0));

/* 7m. Entrada automática */
const entrada = fuente('components/EntradaDemo.tsx');
const modeloDemo = fuente('utils/contenidoDemo.ts');
check('7n) solo entra sola en un proyecto demo y con la cuenta pasada', entrada.includes('debeEntrarSolaLaDemo(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID') && /esProyectoDemo\(projectId\) && !!correo && !!clave/.test(modeloDemo));
check('7o) no lleva contraseña escrita en la app', !entrada.includes(ESPECTADOR.clave) && !fuente('App.tsx').includes(ESPECTADOR.clave));
check('7p) la cuenta solo la pasa el arranque de la demo', fuente('scripts/demo/entorno.mjs').includes('EXPO_PUBLIC_DEMO_CLAVE') && !fuente('metro.config.js').includes('EXPO_PUBLIC_DEMO'));

/* 8. La app */
const contenido = fuente('utils/contenidoDemo.ts');
check('8a) la marca que decide es isDemo', contenido.includes('doc.isDemo === true') && !contenido.includes('doc.demo'));
check('8b) los servicios compartidos no saben nada de la demo', !/isDemo|contenidoDemo/.test(fuente('services/firestoreService.ts')));
check('8c) la etiqueta «Demo» sigue en el perfil', fuente('screens/UserProfileScreen.tsx').includes('<EtiquetaDemo'));
check('8d) el aviso fijo ya no está', !fs.existsSync(path.join(RAIZ, 'components/AvisoDemo.tsx')) && !fuente('App.tsx').includes('AvisoDemo'));
check('8f) los medios no se versionan', fuente('.gitignore').includes('demo-medios'));

console.log(`\n${total - fallos}/${total}`);
if (fallos) process.exit(1);
