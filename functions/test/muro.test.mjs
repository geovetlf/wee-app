/*
 * El paginador del muro (fase 2E-75).
 *
 * Hasta ahora `paginaDelMuroGeneral` solo estaba comprobada con una expresión
 * regular sobre el código de una pantalla: la pieza más delicada de todo el muro
 * —el relleno, el cursor y el "queda más"— no se ejecutaba en ninguna prueba.
 * Aquí se ejecuta de verdad, con una colección de mentira en memoria: sin red,
 * sin Firestore y sin tocar un solo dato.
 *
 * Los tres defectos que esta fase arregló eran todos de este contrato, así que
 * son exactamente los que se vigilan:
 *
 *  1. el cursor avanza aunque la tanda no deje ni una publicación visible;
 *  2. `hayMas` mira los documentos leídos, no los que pasaron el filtro;
 *  3. el relleno tiene tope y no puede girar sin fin.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const fuente = leer('utils/sectionFeed.ts');
const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const feed = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

/** Una publicación de mentira. Sin destinos es de las de antes. */
const post = (id, extra = {}) => ({ id, userId: 'u', content: 'hola', likes: 0, comments: 0, ...extra });

/*
 * Una colección de mentira que se comporta como Firestore: ordenada, con cursor
 * y sin solaparse. `desde` es el id del último documento leído, igual que un
 * `startAfter`. Cuenta las llamadas para poder demostrar que el bucle no gira
 * más de la cuenta.
 */
const coleccion = (todos, porPagina) => {
  let llamadas = 0;
  const pedir = async (desde) => {
    llamadas += 1;
    const inicio = desde == null ? 0 : todos.findIndex((p) => p.id === desde) + 1;
    const documents = todos.slice(inicio, inicio + porPagina);
    return { documents, lastDoc: documents.length ? documents[documents.length - 1].id : null };
  };
  return { pedir, llamadas: () => llamadas };
};

console.log('\n── A · Rellenar sin perder nada ──');
{
  /*
   * Una de cada tres va al muro general. Para juntar 5 visibles hace falta más de
   * una tanda de 6 documentos, que es justo el caso que antes devolvía una página
   * corta y hacía creer que el muro se había acabado.
   */
  const todos = Array.from({ length: 60 }, (_, i) =>
    post('p' + i, i % 3 === 0 ? { destinations: ['general'] } : { destinations: ['travel'] })
  );
  const c = coleccion(todos, 6);
  const pagina = await feed.paginaDelMuroGeneral(c.pedir, 5);

  check('1) junta las que se le piden aunque la primera tanda venga filtrada', pagina.visibles.length >= 5, `${pagina.visibles.length} visibles en ${c.llamadas()} tandas`);
  check('1) y todas las que devuelve van de verdad al muro general', pagina.visibles.every((p) => p.destinations.includes('general')));
  /*
   * Devuelve las de la última tanda completa, que pueden pasar de las pedidas.
   * Es a propósito: recortar a N obligaría a inventar un cursor a mitad de página
   * —el contrato solo da el último documento leído— y las de después se perderían.
   * Más vale una página un poco larga que una publicación que nadie vuelve a ver.
   */
  check('1) nunca devuelve menos de las pedidas habiendo material', pagina.visibles.length >= 5);
  check('1) y deja el cursor donde se quedó', pagina.lastDoc !== null && pagina.hayMas === true);
}

console.log('\n── B · Una tanda sin nada no es el final del muro ──');
{
  // Las 40 primeras no van al muro general; detrás hay muchas que sí.
  const todos = [
    ...Array.from({ length: 40 }, (_, i) => post('x' + i, { destinations: ['travel'] })),
    ...Array.from({ length: 20 }, (_, i) => post('g' + i, { destinations: ['general'] })),
  ];
  const c = coleccion(todos, 10);
  const pagina = await feed.paginaDelMuroGeneral(c.pedir, 5);

  check('2) el cursor AVANZA aunque no haya salido ni una visible', pagina.lastDoc === 'x39', `cursor: ${pagina.lastDoc}`);
  check('2) y hayMas sigue siendo cierto porque quedan documentos detrás', pagina.hayMas === true);
  check('2) sin haber devuelto ninguna todavía', pagina.visibles.length === 0);

  // Y siguiendo desde ese cursor, aparecen. Esto es lo que antes no ocurría:
  // la pantalla apagaba el scroll y además repetía la misma página.
  const siguiente = await feed.paginaDelMuroGeneral(c.pedir, 5, pagina.lastDoc);
  check('2) desde ese cursor sí aparecen', siguiente.visibles.length >= 5);
  check('2) y son las de después, no las mismas', siguiente.visibles.every((p) => p.id.startsWith('g')));
}

console.log('\n── C · El bucle tiene tope ──');
{
  // Nada va al muro general en 1000 documentos: el relleno no puede recorrerlos.
  const todos = Array.from({ length: 1000 }, (_, i) => post('n' + i, { destinations: ['travel'] }));
  const c = coleccion(todos, 10);
  const pagina = await feed.paginaDelMuroGeneral(c.pedir, 15);

  check('3) no gira más de cuatro veces', c.llamadas() === 4, `${c.llamadas()} tandas`);
  check('3) devuelve lo que hay —nada— sin colgarse', pagina.visibles.length === 0);
  check('3) y dice que queda muro por leer', pagina.hayMas === true);
}

console.log('\n── D · Qué significa exactamente "hayMas" ──');
{
  // Caso 1: quedan documentos, pero esta tanda no dio visibles.
  const conMas = coleccion(Array.from({ length: 100 }, (_, i) => post('a' + i, { destinations: ['travel'] })), 10);
  const p1 = await feed.paginaDelMuroGeneral(conMas.pedir, 5);
  check('4) "esta tanda no tenía nada para ti" -> hayMas true', p1.hayMas === true && p1.visibles.length === 0);

  // Caso 2: la colección se acabó de verdad.
  const cortita = coleccion([post('u1', { destinations: ['travel'] }), post('u2', { destinations: ['travel'] })], 10);
  const p2 = await feed.paginaDelMuroGeneral(cortita.pedir, 5);
  check('4) "ya no quedan documentos" -> hayMas false', p2.hayMas === false);

  // Caso 3: colección vacía del todo.
  const vacia = coleccion([], 10);
  const p3 = await feed.paginaDelMuroGeneral(vacia.pedir, 5);
  check('4) una colección vacía se acaba a la primera', p3.hayMas === false && p3.visibles.length === 0 && vacia.llamadas() === 1);
}

console.log('\n── E · Página tras página, sin repetir ni saltarse nada ──');
{
  const todos = Array.from({ length: 90 }, (_, i) =>
    post('p' + i, i % 2 === 0 ? { destinations: ['general'] } : { destinations: ['chef'] })
  );
  const c = coleccion(todos, 10);

  const acumuladas = [];
  let cursor;
  let vueltas = 0;
  let quedaMas = true;
  while (quedaMas && vueltas < 20) {
    const pagina = await feed.paginaDelMuroGeneral(c.pedir, 5, cursor);
    acumuladas.push(...pagina.visibles);
    cursor = pagina.lastDoc;
    quedaMas = pagina.hayMas;
    vueltas += 1;
  }

  const ids = acumuladas.map((p) => p.id);
  check('5) ningún id aparece dos veces', new Set(ids).size === ids.length, `${ids.length} publicaciones`);
  check('5) y no se ha quedado ninguna por el camino', acumuladas.length === 45, `${acumuladas.length} de 45`);
  check('5) el orden de la colección se respeta', ids.join(',') === todos.filter((p) => p.destinations.includes('general')).map((p) => p.id).join(','));
  check('6) al agotarse la colección, hayMas se apaga', quedaMas === false);
}

console.log('\n── F · Lo mismo, pero para el muro de una sección ──');
{
  /*
   * Una publicación con destino solo `chef` NO va al muro general, así que el muro
   * de una sección tiene que leer la colección entera y no el muro general ya
   * filtrado. Si esto se rompiera, Weë Chef no vería nunca lo suyo.
   */
  // Una de cada cinco es de Chef: hay que volver a pedir para juntar cinco.
  const todos = Array.from({ length: 100 }, (_, i) =>
    post(i % 5 === 0 ? 'c' + i : 'g' + i, { destinations: i % 5 === 0 ? ['chef'] : ['general'] })
  );
  const c = coleccion(todos, 8);
  const pagina = await feed.paginaDeLaSeccion(c.pedir, 'chef', 5);

  check('11) la sección junta las suyas aunque vengan salteadas', pagina.visibles.length >= 5, `${pagina.visibles.length} en ${c.llamadas()} tandas`);
  check('11) y no se conforma con la primera tanda', c.llamadas() > 1, `${c.llamadas()} tandas`);
  check('11) y son solo suyas', pagina.visibles.every((p) => p.destinations.includes('chef')));
  check('11) una publicación de destino solo "chef" SÍ llega a Chef', pagina.visibles.some((p) => p.id.startsWith('c')));

  // Y esas mismas publicaciones no aparecen en el muro general.
  const general = await feed.paginaDelMuroGeneral(coleccion(todos, 8).pedir, 5);
  check('11) pero NO aparecen en el muro general', !general.visibles.some((p) => p.id.startsWith('c')));

  /*
   * Y el caso que descubrió esta prueba: si lo de la sección está MÁS ALLÁ del
   * tope de cuatro vueltas, devuelve lo que encontró y deja `hayMas` encendido.
   * No es un fallo, es el tope haciendo su trabajo: la pantalla sigue pidiendo
   * desde el cursor en vez de recorrer la colección entera de una sentada.
   */
  const enterradas = [
    ...Array.from({ length: 200 }, (_, i) => post('g' + i, { destinations: ['general'] })),
    ...Array.from({ length: 10 }, (_, i) => post('c' + i, { destinations: ['chef'] })),
  ];
  const lejos = coleccion(enterradas, 8);
  const p = await feed.paginaDeLaSeccion(lejos.pedir, 'chef', 5);
  check('11) enterradas más allá del tope: devuelve poco pero no miente', p.visibles.length < 5 && p.hayMas === true && lejos.llamadas() === 4);
  check('11) y el cursor deja seguir buscando desde donde se quedó', p.lastDoc === 'g31', `cursor: ${p.lastDoc}`);
}

console.log('\n── G · Las reglas de destino, ejecutadas ──');
{
  const soloGeneral = post('a', { destinations: ['general'] });
  const generalYChef = post('b', { destinations: ['general', 'chef'] });
  const historica = post('c', { content: 'una receta de cocina de la abuela' });

  // CASO 1: general y nada más.
  check('10) general: en el muro y en ninguna sección', feed.vaAlMuroGeneral(soloGeneral)
    && !['travel', 'design', 'studio', 'chef'].some((s) => feed.vaALaSeccion(soloGeneral, s)));

  // CASO 2: general + chef.
  check('10) general + chef: en el muro y en Chef', feed.vaAlMuroGeneral(generalYChef) && feed.vaALaSeccion(generalYChef, 'chef'));
  check('10) y en ninguna otra', !['travel', 'design', 'studio'].some((s) => feed.vaALaSeccion(generalYChef, s)));

  // CASO 3: histórica, por palabras, como siempre.
  check('10) sin destinos: sigue en el muro general', feed.vaAlMuroGeneral(historica));
  check('10) y las palabras la siguen llevando a su sección', feed.vaALaSeccion(historica, 'chef'));
  check('10) sin que nadie le escriba el campo', historica.destinations === undefined);

  // Y lo que esta fase prohíbe: adivinar por palabras cuando ya se eligió.
  const viajeEnGeneral = post('d', { content: 'me voy de viaje a un hotel', destinations: ['general'] });
  check('10) elegir destinos apaga la adivinanza por palabras', !feed.vaALaSeccion(viajeEnGeneral, 'travel'));
}

console.log('\n── El muro no es una pila de tarjetas ──');
{
  /*
   * En un muro TODO lo que hay son publicaciones, así que enmarcar cada una es
   * enmarcar la pantalla entera. Antes se veían dos marcos: la tarjeta con su
   * fondo y su sombra, y dentro la foto metida en el hueco que dejaba el
   * relleno —más estrecha de lo que daba el sitio—. Los dos se van cuando la
   * publicación se pinta en un muro; fuera de un muro, la tarjeta sigue igual.
   */
  const tarjeta = leer('components/PostCard.tsx');
  const estilos = tarjeta.slice(tarjeta.indexOf('const styles = StyleSheet.create'));
  const enMuroEstilo = estilos.slice(estilos.indexOf('enMuro: {'), estilos.indexOf('repostHeader: {'));

  /* 1) La variante existe, es opcional y por defecto NO cambia nada. */
  check('11) la publicación sabe si está en un muro', /variante\?: 'tarjeta' \| 'muro';/.test(tarjeta) && /variante = 'tarjeta',/.test(tarjeta));
  check('11) y por defecto sigue siendo la tarjeta de siempre', /const enMuro = variante === 'muro';/.test(tarjeta));

  /* 2) Primer marco: la tarjeta. En el muro no hay fondo, ni sombra, ni esquinas. */
  check('12) en el muro no hay tarjeta: ni fondo, ni esquinas, ni sombra',
    /marginBottom: 0,\s*borderRadius: 0,/.test(enMuroEstilo) && /shadowOpacity: 0,/.test(enMuroEstilo) && /elevation: 0,/.test(enMuroEstilo) && !/backgroundColor/.test(enMuroEstilo));
  check('12) y se separan por el aire y un pelo de línea', /paddingVertical: SPACING\.lg,/.test(enMuroEstilo) && /borderBottomWidth: StyleSheet\.hairlineWidth,/.test(enMuroEstilo));
  /* Control: fuera del muro la tarjeta conserva su fondo y su sombra. */
  check('12) control: fuera del muro sigue habiendo tarjeta',
    /backgroundColor: theme\.colors\.card,\s*shadowColor: theme\.dark \? theme\.colors\.glow/.test(tarjeta) && /borderRadius: BORDER_RADIUS\.lg,\s*padding: SPACING\.lg,/.test(estilos));

  /* 3) Segundo marco: el relleno que encajonaba la foto. */
  check('13) en el muro el contenido llega a los bordes de la columna', /paddingHorizontal: 0,/.test(enMuroEstilo));
  check('13) y la foto se mide con la columna entera, no con el hueco de antes',
    /const anchoEnElMuro = \(maxWidth\?: number\) =>/.test(tarjeta) && /const carouselWidth = enMuro \? anchoEnElMuro\(maxWidth\) : getCarouselWidth\(maxWidth\);/.test(tarjeta));
  check('13) la foto conserva sus esquinas: eso no era un marco', /singleMediaContainer: \{[\s\S]{0,120}borderRadius: BORDER_RADIUS\.lg,/.test(estilos) && /carouselContainer: \{[\s\S]{0,120}borderRadius: BORDER_RADIUS\.lg,/.test(estilos));

  /*
   * 4) La variante cambia CÓMO se apoya, nunca QUÉ lleva. `enMuro` solo puede
   * aparecer donde se decide el envoltorio y el ancho: si empezara a esconder
   * botones o datos, esto lo caza.
   */
  /* La BANDERA, no el estilo que se llama igual: se declara, decide la medida y elige el envoltorio (dos veces, con el repost que carga). */
  const usos = (tarjeta.match(/(?<!styles\.)\benMuro\b(?!:)/g) || []).length;
  check('14) la variante solo toca el envoltorio y la medida', usos === 4, `${usos} usos de la bandera`);
  check('14) nada se deja de pintar en un muro', !/enMuro && </.test(tarjeta) && !/!enMuro &&/.test(tarjeta) && !/enMuro \?\s*null/.test(tarjeta));
  /* Las acciones siguen siendo las mismas, y siguen fuera de cualquier caja. */
  check('14) las acciones siguen ahí, sin caja propia', /styles\.actions/.test(tarjeta) && /actions: \{\s*flexDirection: 'row',/.test(estilos) && !/actions: \{[\s\S]{0,160}(borderWidth|backgroundColor)/.test(estilos));

  /*
   * 5) Quién es un muro. El Wall del Home —nativo y web— y el muro de cada
   * sección de Weë, que es el mismo componente para las ocho.
   */
  const MUROS = ['screens/LandingScreen.tsx', 'screens/WebLandingScreen.tsx', 'components/creator/SectionWall.tsx'];
  const sinVariante = MUROS.filter((f) => !/variante="muro"/.test(leer(f)));
  check('15) los tres muros la piden', sinVariante.length === 0, sinVariante.join(' · '));
  check('15) y el muro de sección vale para todas las secciones', /<SectionWall /.test(leer('screens/SpecialistScreen.tsx')) && /import PostCard from '\.\.\/PostCard'/.test(leer('components/creator/SectionWall.tsx')));

  /*
   * Y EL PERFIL WEË, que también es un muro: con esa identidad activa, la
   * pestaña de publicaciones es una detrás de otra y nada más. Con el Perfil
   * Real la tarjeta se queda: ese perfil no cambia.
   *
   * `hidi` es el identificador heredado del Perfil Weë y no se renombra.
   */
  const perfil = leer('screens/ProfileScreen.tsx');
  check('15b) el Perfil Weë pinta su muro sin tarjeta', /const enPerfilWee = activeProfileType === 'hidi';/.test(perfil) && /variante=\{enPerfilWee \? 'muro' : 'tarjeta'\}/.test(perfil));
  check('15b) y el Perfil Real conserva la suya', !/variante="muro"/.test(perfil) && /'tarjeta'/.test(perfil));
  /* Control: la publicación del perfil sigue siendo la misma, con todo dentro. */
  check('15b) control: es la misma publicación, con su avatar, su fecha y sus acciones',
    /<PostCard/.test(perfil) && /onComment=\{handleComment\}/.test(perfil) && /onPress=\{handlePostPress\}/.test(perfil) && /onVideoPress=\{handleVideoPress\}/.test(perfil));

  /*
   * 6) Y NADIE MÁS. El perfil de otra persona, la comunidad, Guardados y el
   * feed heredado siguen con su tarjeta: allí la publicación es una pieza entre
   * otras cosas y tiene que verse aparte. (El perfil propio va arriba: depende
   * de con qué identidad estés.)
   */
  const OTRAS = ['screens/UserProfileScreen.tsx', 'screens/CommunityScreen.tsx', 'screens/SavedPostsScreen.tsx', 'screens/HomeScreen.tsx'];
  const contagiadas = OTRAS.filter((f) => /variante="muro"/.test(leer(f)));
  check('16) ninguna otra pantalla cambia de aspecto', contagiadas.length === 0, contagiadas.join(' · '));
  check('16) pero todas siguen pintando la misma publicación', OTRAS.every((f) => /<PostCard/.test(leer(f))));
  /* Y el detalle de una publicación no pinta PostCard: no le afecta nada de esto. */
  check('16) el detalle de una publicación no usa la tarjeta del muro', !/<PostCard/.test(leer('screens/PostDetailScreen.tsx')));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nEl muro: se rellena, avanza el cursor, sabe cuándo se acaba y no repite ni pierde publicaciones');
process.exit(failures ? 1 : 0);
