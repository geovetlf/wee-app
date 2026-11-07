/*
 * EL WÄLL INMERSIVO (screens/WallScreen.tsx + components/wall/PublicacionInmersiva.tsx). Sin emuladores: fuentes.
 *
 * Vigila que el muro de una publicación a la vez reutilice la lógica social de siempre en vez de copiarla, que no haya
 * una segunda consulta del muro, que solo suene el vídeo de la publicación activa y que tenga todos sus estados.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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

/*
 * ── F · SE ABRE EN LA PUBLICACIÓN TOCADA, TAMBIÉN EN LA WEB (B1, P1-1 de las pruebas con sesión del 2026-11-06) ──
 *
 * En la web el Wäll se abría siempre en la primera publicación y ni la rueda ni las flechas lo movían. No era
 * `initialScrollIndex`: la tarjeta de la pila. `cardStyle` de una pantalla SUSTITUYE al de `screenOptions` (React
 * Navigation los junta con `Object.assign`, no los suma), y el del Wäll —solo el fondo negro— perdía el `flex: 1` de
 * la tarjeta por defecto. En la web, una pantalla NO modal que ocupa la ventana entera se pinta en «modo página»
 * (`CardContent`: `minHeight: '100%'`), así que sin `flex: 1` la tarjeta crecía con la lista entera, la lista dejaba de
 * ser un contenedor que se desplaza y se veía la primera publicación. Los Weëls no lo notaban porque son `modal`.
 * Reproducido en un Chrome real con el FlatList de react-native-web 0.21 y una réplica de la tarjeta (informe B1).
 *
 * Se lee el árbol de la pila con el analizador de TypeScript —no con expresiones sueltas— y se calcula la tarjeta
 * EFECTIVA de cada pantalla igual que React Navigation: `Object.assign({}, screenOptions, options)`.
 */
console.log('\n── F · Se abre en la publicación tocada (la tarjeta de la pila deja desplazar la lista) ──');
const requerirDeLaRaiz = createRequire(path.join(RAIZ, 'package.json'));
const ts = requerirDeLaRaiz('typescript');

/** Las opciones de la pila principal: las de `screenOptions` y las de cada `Stack.Screen`, como objetos. */
const opcionesDeLaPila = (fuente) => {
  const sf = ts.createSourceFile('MainStackNavigator.tsx', fuente, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const valor = (n) => {
    if (ts.isParenthesizedExpression(n)) return valor(n.expression);
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isObjectLiteralExpression(n)) {
      const o = {};
      for (const p of n.properties) {
        if (ts.isPropertyAssignment(p)) o[p.name.getText(sf)] = valor(p.initializer);
        else if (ts.isShorthandPropertyAssignment(p)) o[p.name.getText(sf)] = `<${p.name.getText(sf)}>`;
        /* Un `...(cond ? null : {…})` se anota aparte: no se adivina qué aporta. */
        else if (ts.isSpreadAssignment(p)) (o['…'] ||= []).push(p.expression.getText(sf));
      }
      return o;
    }
    return `<${n.getText(sf)}>`;
  };
  const atributo = (el, nombre) => el.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === nombre);
  const expresion = (a) => (a?.initializer && ts.isJsxExpression(a.initializer) ? a.initializer.expression : a?.initializer);
  let porDefecto = null;
  const pantallas = [];
  const visitar = (n) => {
    if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
      const etiqueta = n.tagName.getText(sf);
      if (etiqueta === 'Stack.Navigator') porDefecto = valor(expresion(atributo(n, 'screenOptions')));
      if (etiqueta === 'Stack.Screen') {
        const nombre = expresion(atributo(n, 'name'));
        const opciones = expresion(atributo(n, 'options'));
        pantallas.push({ nombre: nombre && ts.isStringLiteral(nombre) ? nombre.text : nombre?.getText(sf), opciones: opciones ? valor(opciones) : {} });
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return { porDefecto, pantallas };
};

const { porDefecto, pantallas } = opcionesDeLaPila(PILA);
/* La tarjeta efectiva, como la calcula React Navigation (useDescriptors: Object.assign de screenOptions y options). */
const efectiva = (p) => Object.assign({}, porDefecto, typeof p.opciones === 'object' ? p.opciones : {});
const esModal = (o) => o.presentation === 'modal' || o.presentation === 'transparentModal';
const wall = pantallas.find((p) => p.nombre === 'Wall');
const tarjetaDelWall = wall && efectiva(wall).cardStyle;

check('24) la tarjeta por defecto de la pila ocupa su sitio (flex: 1)', porDefecto?.cardStyle?.flex === 1, JSON.stringify(porDefecto?.cardStyle));
check('25) la tarjeta EFECTIVA del Wäll conserva flex: 1 (si no, en la web crece con la lista y abre siempre en la primera)',
  tarjetaDelWall?.flex === 1, JSON.stringify(tarjetaDelWall));
check('26) y sigue siendo negra: el arreglo no cambia cómo se ve', tarjetaDelWall?.backgroundColor === '#000');
const sinFlex = pantallas.filter((p) => typeof p.opciones === 'object' && p.opciones.cardStyle && !esModal(efectiva(p)) && efectiva(p).cardStyle?.flex !== 1).map((p) => p.nombre);
/* El analizador ve TODAS las pantallas que hay escritas (también las que van tras una condición): si no, el control no vale. */
const escritas = (PILA.match(/<Stack\.Screen\b/g) || []).length;
check('27) ninguna pantalla no modal de la pila sustituye la tarjeta perdiendo flex: 1 (la misma trampa en otra pantalla)',
  escritas >= 30 && pantallas.length === escritas && sinFlex.length === 0, sinFlex.join(', ') || `${pantallas.length} de ${escritas} pantallas`);
check('28) los Weëls (modal) siguen con su tarjeta negra: en una modal la web no pinta en modo página',
  (() => { const r = pantallas.find((p) => p.nombre === 'Reels'); return !!r && esModal(efectiva(r)) && efectiva(r).cardStyle?.backgroundColor === '#000'; })());

/*
 * El PORQUÉ, fijado en la librería instalada: si React Navigation cambiara esto, que alguien lo vuelva a mirar.
 * (Se lee la fuente publicada en node_modules; las suites que cargan la app ya dependen de ese node_modules.)
 */
const fuenteDeLaPila = (rel) => {
  for (const base of ['node_modules/@react-navigation/stack/src/views/Stack', 'node_modules/@react-navigation/stack/lib/module/views/Stack']) {
    for (const ext of ['.tsx', '.js']) {
      const f = path.join(RAIZ, base, rel + ext);
      if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
    }
  }
  return '';
};
const CONTENIDO = fuenteDeLaPila('CardContent');
const CONTENEDOR = fuenteDeLaPila('CardContainer');
check('29) la librería: en la web una tarjeta no modal pinta en «modo página» (minHeight 100%, sin flex) si ocupa la ventana',
  /enabled && fill \? styles\.page : styles\.card/.test(CONTENIDO) && /page:\s*\{\s*minHeight:\s*'100%',?\s*\}/.test(CONTENIDO)
  && /pageOverflowEnabled(?:=\{|:\s*)headerMode !== 'float' && presentation !== 'modal'/.test(CONTENEDOR));
const DESCRIPTORES = (() => { const f = path.join(RAIZ, 'node_modules/@react-navigation/core/src/useDescriptors.tsx'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; })();
check('30) la librería: las opciones de una pantalla se juntan con Object.assign (cardStyle se sustituye, no se suma)', /Object\.assign\(\s*acc,/.test(DESCRIPTORES));
check('31) la lista abre en la semilla: initialScrollIndex y la página inicial del ajuste salen del mismo índice, con altura fija',
  /initialScrollIndex=\{Math\.min\(semilla\?\.indice \?\? 0, /.test(PANTALLA) && /useAjusteVerticalWeb<Post>\(alto, posts\.length, semilla\?\.indice \?\? 0\)/.test(PANTALLA)
  && /getItemLayout=\{\(_, index\) => \(\{ length: alto, offset: alto \* index, index \}\)\}/.test(PANTALLA));

console.log(fallos ? `\n✘ ${fallos} fallos` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
