/*
 * EL WÄLL INMERSIVO (screens/WallScreen.tsx + components/wall/PublicacionInmersiva.tsx). Sin emuladores: fuentes.
 *
 * Vigila que el muro de una publicación a la vez reutilice la lógica social de siempre en vez de copiarla, que no haya
 * una segunda consulta del muro, que solo suene el vídeo de la publicación activa y que tenga todos sus estados.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${!ok && detalle ? ` — ${detalle}` : ''}`);
};

const PANTALLA = leer('screens/WallScreen.tsx');
const PIEZA = leer('components/wall/PublicacionInmersiva.tsx');
const PILA = leer('navigation/MainStackNavigator.tsx');
const HOME_WEB = leer('screens/WebLandingScreen.tsx');
const HOME_APP = leer('screens/LandingScreen.tsx');

console.log('\n── A · Ruta y entrada ──');
check('1) la ruta Wall está en la pila principal', /name="Wall" component=\{WallScreen\}/.test(PILA) && /Wall: undefined;/.test(PILA));
check('2) tocar una publicación del Home abre el Wäll en la web y en la app', [HOME_WEB, HOME_APP].every((s) => /sembrarMuro\(/.test(s) && /navigate\('Wall'\)/.test(s)));
check('3) el Home le pasa lo que ya tiene cargado: publicaciones, índice, cursor y si queda muro', [HOME_WEB, HOME_APP].every((s) => /sembrarMuro\(\{ posts: [^,]+, indice[^}]*cursor: [^,]+, hayMas/.test(s)));

console.log('\n── B · Un solo muro ──');
check('4) pide el muro por el único sitio que sabe pedirlo', /postsService\.getMuroGeneralPaginado\(/.test(PANTALLA) && !/getPublicPostsPaginated|collection\(|query\(/.test(PANTALLA));
check('5) al seguir cargando no repite publicaciones', /new Set\(antes\.map\(\(p\) => p\.id\)\)/.test(PANTALLA));

console.log('\n── C · La lógica social es la de siempre ──');
check('6) votar es useVote, que vota la cuenta', /useVote\(\{[\s\S]*?userId: user\?\.uid/.test(PIEZA));
check('7) guardar es useBookmarks', /useBookmarks\(\)/.test(PIEZA));
check('8) comentar abre la hoja única de ComentariosContext', /useComentariosDeLaPublicacion\(\)/.test(PIEZA) && /abrirComentarios\(visible\)/.test(PIEZA));
check('9) denunciar es ReportSheet sobre la publicación', /<ReportSheet[\s\S]*?objetivo=\{\{ type: 'POST', id: visible\.id! \}\}/.test(PIEZA));
check('10) el perfil se abre por la referencia pública, no por el uid', /referenciaPublicaDe\(perfil\) \?\? uid/.test(PIEZA) && /navigate\('UserProfile'/.test(PIEZA));
check('11) un repost enseña la original y quién la compartió', /postsService\.getById\(post\.originalPostId!\)/.test(PIEZA) && /wall\.repostedBy/.test(PIEZA));
check('12) sin sesión, las acciones piden entrar en vez de fallar', /const conSesion = /.test(PIEZA) && /conSesion\(\(\) => abrirComentarios/.test(PIEZA));
check('13) compartir un vídeo es el enlace público de siempre', /compartirFueraDeWee\(visible\.id!/.test(PIEZA));

console.log('\n── D · Medios y rendimiento ──');
check('14) solo se reproduce la publicación activa, y empieza en silencio', /shouldPlay=\{activa\}/.test(PIEZA) && /useState\(true\)[\s\S]{0,40}|const \[silencio, setSilencio\] = useState\(true\)/.test(PIEZA));
check('15) un medio que no llega pinta MedioNoDisponible con reintentar', /<MedioNoDisponible[\s\S]*?alReintentar=/.test(PIEZA) && /onError=\{\(\) => setMedioRoto\(true\)\}/.test(PIEZA));
check('16) las imágenes usan la miniatura de marcador y caché en disco', /placeholder=\{visible\.imageUrlsThumbnails/.test(PIEZA) && /cachePolicy="memory-disk"/.test(PIEZA));
check('17) la lista monta poco: ventana corta y altura fija por publicación', /windowSize=\{3\}/.test(PANTALLA) && /getItemLayout=/.test(PANTALLA) && /pagingEnabled/.test(PANTALLA));
check('18) las encuestas y el texto se pintan, no se pierden', /<Poll postId=\{visible\.id!\}/.test(PIEZA) && /soloTexto/.test(PIEZA));

console.log('\n── E · Estados y adaptación ──');
check('19) carga, error con reintentar, vacío y final del muro', ['wall.loadingPosts', 'wall.immersiveError', 'wall.retry', 'wall.immersiveEmpty', 'wall.immersiveEnd'].every((k) => PANTALLA.includes(k)));
check('20) en escritorio es una columna centrada, no una publicación estirada', /const ANCHO_MAXIMO = \d+/.test(PANTALLA) && /Math\.min\(width, ANCHO_MAXIMO\)/.test(PANTALLA));
check('21) en la web se pasa de publicación con el teclado y la rueda encaja cada una', /useAjusteVerticalWeb<Post>\(/.test(PANTALLA) && /onScroll=\{alDesplazar\}/.test(PANTALLA) && /onScroll=\{alDesplazar\}/.test(leer('screens/ReelsScreen.tsx')) && /ArrowDown/.test(leer('hooks/useAjusteVerticalWeb.ts')));
check('22) el texto y las acciones quedan por encima de la barra global', /ALTO_BARRA/.test(PANTALLA) && /margenInferior/.test(PIEZA));
check('23) ningún texto de interfaz escrito a mano: todo pasa por t()', !/>[A-Za-zÁÉÍÓÚáéíóúñ]{3,}[^<{]*</.test(PIEZA.replace(/>Wäll</g, '')) && !/>[A-Za-zÁÉÍÓÚáéíóúñ]{3,}[^<{]*</.test(PANTALLA.replace(/>Wäll</g, '')));

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
