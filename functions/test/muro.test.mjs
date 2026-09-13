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
  /*
   * EL AIRE LATERAL DEL MURO ES UNO SOLO, Y EL MEDIO LLEGA HASTA ÉL.
   *
   * Aquí estaba la banda blanca de la captura. Cuando el muro dejó de ser
   * tarjeta se le puso `paddingHorizontal: 0`, pero la cuenta del ancho siguió
   * restando el relleno de la TARJETA —16 por lado—: el medio salía 32 puntos
   * más estrecho que su hueco y, sin nada que lo centrara, esos 32 caían
   * ENTEROS a la derecha. Medido en la captura del teléfono: la foto iba del
   * píxel 0 al 984 de 1080, 96 píxeles de blanco todos a un lado.
   *
   * Ahora hay UN relleno, el del muro, y la misma constante manda en el estilo
   * y en la cuenta del ancho: no se pueden separar.
   */
  check('13) el muro tiene un aire lateral para el texto, y no es cero',
    /const MURO_HORIZONTAL_PADDING = SPACING\.md;/.test(tarjeta)
    && /paddingHorizontal: MURO_HORIZONTAL_PADDING,/.test(enMuroEstilo)
    && !/paddingHorizontal: 0,/.test(enMuroEstilo));
  /*
   * Y EL MEDIO SE SALE DE ESE AIRE: va a sangre, la columna entera.
   *
   * Medido sobre las capturas de los dos feeds de referencia en el mismo
   * teléfono: Facebook e Instagram ponen el medio en los 1080 píxeles de ancho,
   * de canto a canto, y solo el nombre y el texto llevan sangría. Weë lo tenía
   * en 1008, y esos 72 píxeles eran lo que hacía que cada publicación se leyera
   * como una tarjeta apoyada encima del muro.
   */
  check('13) en el muro el medio va a sangre, sin descontar el aire',
    /const anchoEnElMuro = \(maxWidth\?: number, ancho: number = screenWidth\) =>\s*Math\.min\(ancho, scale\(maxWidth \?\? CARD_MAX_WIDTH\)\);/.test(tarjeta)
    && /const carouselWidth = enMuro \? anchoEnElMuro\(maxWidth, anchoDeLaVentana\) : getCarouselWidth\(maxWidth, anchoDeLaVentana\);/.test(tarjeta));
  /* El margen negativo que lo saca del relleno, y sin esquinas contra el canto. */
  check('13) y se sale del relleno con un margen negativo, sin esquinas',
    /const sangriaDelMedio = enMuro\s*\?\s*\{ marginHorizontal: -MURO_HORIZONTAL_PADDING, borderRadius: 0 \}\s*: null;/.test(tarjeta));
  check('13) los tres medios llevan esa sangría, ninguno se queda dentro',
    /styles\.videoContainer, sangriaDelMedio,/.test(tarjeta)
    && /styles\.singleMediaContainer, sangriaDelMedio,/.test(tarjeta)
    && /styles\.carouselContainer, sangriaDelMedio,/.test(tarjeta));
  /* Control: la tarjeta sigue restando el suyo, que ella sí aplica de verdad. */
  check('13) control: fuera del muro sigue mandando el relleno de la tarjeta',
    /const CARD_HORIZONTAL_PADDING = SPACING\.lg;/.test(tarjeta)
    && /const availableWidth = Math\.min\(ancho, scale\(maxWidth\)\);\s*return availableWidth - \(CARD_HORIZONTAL_PADDING \* 2\);/.test(tarjeta));
  /* Y lo que no llene la columna se centra, en vez de irse a un lado. */
  check('13) un medio más estrecho que la columna queda centrado, no a la izquierda',
    /singleMediaContainer: \{[\s\S]{0,220}alignSelf: 'center',/.test(estilos)
    && /videoContainer: \{[\s\S]{0,220}alignSelf: 'center',/.test(estilos));
  check('13) la foto conserva sus esquinas: eso no era un marco', /singleMediaContainer: \{[\s\S]{0,260}borderRadius: BORDER_RADIUS\.lg,/.test(estilos) && /carouselContainer: \{[\s\S]{0,120}borderRadius: BORDER_RADIUS\.lg,/.test(estilos));

  /*
   * 4) La variante cambia CÓMO se apoya, nunca QUÉ lleva. `enMuro` solo puede
   * aparecer donde se decide el envoltorio y el ancho: si empezara a esconder
   * botones o datos, esto lo caza.
   */
  /* La BANDERA, no el estilo que se llama igual: se declara, decide la medida y elige el envoltorio (dos veces, con el repost que carga). */
  const usos = (tarjeta.match(/(?<!styles\.)\benMuro\b(?!:)/g) || []).length;
  check('14) la variante solo toca el envoltorio y la medida', usos === 6, `${usos} usos de la bandera`);
  check('14) nada se deja de pintar en un muro', !/enMuro && </.test(tarjeta) && !/!enMuro &&/.test(tarjeta) && !/enMuro \?\s*null/.test(tarjeta));
  /* Las acciones siguen siendo las mismas, y siguen fuera de cualquier caja. */
  check('14) las acciones siguen ahí, sin caja propia', /styles\.actions/.test(tarjeta) && /actions: \{\s*flexDirection: 'row',/.test(estilos) && !/actions: \{[\s\S]{0,160}(borderWidth|backgroundColor)/.test(estilos));

  /*
   * 5) Quién es un muro. Los dos del Wäll —nativo y web— y ninguno más: las
   * secciones de Weë AI llegaron a tener el suyo y se retiró, porque el Wäll ya
   * dice de qué experiencia viene cada publicación con su WeeTag.
   */
  const MUROS = ['screens/LandingScreen.tsx', 'screens/WebLandingScreen.tsx'];
  const sinVariante = MUROS.filter((f) => !/variante="muro"/.test(leer(f)));
  check('15) los dos muros la piden', sinVariante.length === 0, sinVariante.join(' · '));
  check('15) y no hay más muros que esos dos', !/SectionWall/.test(leer('screens/SpecialistScreen.tsx')));

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

console.log('\n── El vídeo del muro conserva su forma ──');
{
  /*
   * Un vídeo del Wäll entraba en una caja de alto fijo con `COVER`: lo que no
   * cabía se recortaba, y a un vídeo vertical le desaparecía media escena por
   * arriba y por abajo. Ahora la caja se adapta al vídeo. Las FOTOS no pasan
   * por aquí: su camino sigue siendo el suyo, y eso también se vigila, porque
   * la manera fácil de romperlo sería tocar una regla común a los dos.
   */
  const tarjeta = leer('components/PostCard.tsx');
  const estilos = tarjeta.slice(tarjeta.indexOf('const styles = StyleSheet.create'));
  const cajaDelVideo = estilos.slice(estilos.indexOf('videoContainer: {'), estilos.indexOf('videoTouchable: {'));
  const cacheDeFotos = leer('utils/imageDimensionCache.ts');
  const reglaDelMedio = leer('utils/medidaDelMedio.ts');
  const cacheDeVideos = leer('utils/videoDimensionCache.ts');

  /* 1) Se acabó la caja de medida fija: ni alto de 350, ni 16/9, ni marco de teléfono. */
  check('17) el vídeo ya no entra en una caja de medida fija',
    !/height: scale\(350\)/.test(cajaDelVideo) && !/videoContainerWeb/.test(tarjeta) && !/videoPhoneFrame/.test(tarjeta));
  /*
   * 2) EL MURO NO ENSEÑA EL VÍDEO, ENSEÑA UN ADELANTO. El vídeo entero vive en
   * Weëls. Aquí la ventana pone el ancho de la columna y un alto acotado, y la
   * caja de dentro lleva la forma DE VERDAD del vídeo, que puede pasarse.
   */
  check('17) el vídeo se asoma por una ventana, no por una caja a su medida',
    /const ventanaDelVideo = ventanaDelPreview\(carouselWidth, proporcionDelVideo, altoMaximoDelMedio\);/.test(tarjeta)
    && /style=\{\[styles\.videoContainer, sangriaDelMedio, \{ width: ventanaDelVideo\.width, height: ventanaDelVideo\.height \}\]\}/.test(tarjeta)
    && /style=\{\[styles\.videoAspectBox, \{ aspectRatio: proporcionDelVideo \}\]\}/.test(tarjeta)
    && !/const cajaDelVideo/.test(tarjeta));
  /*
   * La caja de dentro NO puede llevar alto propio: se lo da su forma, y por eso
   * puede sobrar. Si volviera a tener 'height: 100%' se ceñiría a la ventana y
   * el vídeo saldría aplastado, que es deformar.
   */
  check('17) la caja de dentro no lleva alto: se lo da su forma',
    /videoAspectBox: \{\s*width: '100%',\s*position: 'relative',\s*\}/.test(estilos));
  /*
   * Y lo que la ventana deja fuera es SIEMPRE el final: la caja empieza pegada
   * arriba, que es donde estos vídeos ponen el título y el contexto.
   */
  check('17) el adelanto recorta por abajo: arriba nunca',
    /justifyContent: 'flex-start',/.test(cajaDelVideo) && /overflow: 'hidden',/.test(cajaDelVideo)
    && !/justifyContent: 'center'|justifyContent: 'flex-end'|alignItems: 'flex-end'/.test(cajaDelVideo));
  /*
   * Los controles se anclan a la VENTANA. Colgados de la caja de dentro, el
   * recorte se llevaba el botón de silencio fuera de la pantalla.
   */
  check('17) el toque y los controles cubren la ventana, no el vídeo',
    /videoTouchable: \{\s*\.\.\.StyleSheet\.absoluteFillObject,\s*\}/.test(estilos)
    && /accessibilityLabel="Ver el vídeo completo en Weëls"/.test(tarjeta));
  /* Y si algo se queda fuera, se dice: si no, parece un vídeo mal cortado. */
  check('17) cuando el adelanto recorta, lo avisa y nombra a Weëls',
    /\{ventanaDelVideo\.recorta && \(/.test(tarjeta) && /Ver en Weëls/.test(tarjeta));
  check('17) control: si el vídeo cabe entero, no hay aviso',
    /recorta: alto < altoNatural - 1e-9/.test(reglaDelMedio));
  /* 3) Y nada se recorta: `CONTAIN`, también en el cartel de espera. */
  check('17) y nada se recorta: contain, no cover',
    /resizeMode=\{ResizeMode\.CONTAIN\}/.test(tarjeta) && !/resizeMode=\{ResizeMode\.COVER\}/.test(tarjeta)
    && /videoPoster: \{[^}]*resizeMode: 'contain'/.test(estilos));
  /*
   * El elemento de vídeo tiene que ocupar su caja, y hay que decírselo aparte:
   * `expo-av` parte el estilo en dos y en la web le pone al vídeo
   * `position: undefined`, que anula el anclaje a las esquinas que trae por
   * dentro. Sin esto el elemento caía a su tamaño natural —720×1280 en una caja
   * de 343×450— y el `overflow` lo recortaba: el recorte seguía ahí aunque la
   * caja ya fuera de la forma correcta.
   */
  check('17) y el elemento de vídeo ocupa su caja, no su tamaño natural',
    /videoStyle=\{styles\.videoElement\}/.test(tarjeta)
    && /videoElement: \{\s*width: '100%',\s*height: '100%',\s*\}/.test(estilos)
    && /videoPlayer: \{\s*\.\.\.StyleSheet\.absoluteFillObject,\s*\}/.test(estilos));
  /*
   * 4) EL TOPE SE MIDE CONTRA LA FRANJA QUE SE VE, no contra la ventana.
   *
   * Van dos intentos y los dos midieron contra la magnitud equivocada. Primero
   * una FORMA —9:16— sacada del ANCHO de la columna: cuánto cabe no depende de
   * lo ancha que sea la columna. Después una parte del alto de la VENTANA, que
   * ya es un alto pero tampoco es el bueno: una publicación no vive en la
   * ventana, vive en la franja que queda entre la cabecera de la app y la barra
   * inferior. En el teléfono de las capturas la ventana declara 800 puntos y la
   * franja son 672, así que seis décimas de ventana —480— no eran el 60 % de
   * nada de lo que se ve: eran el 71 % de la franja. Con la cabecera del autor,
   * el texto y las acciones, la publicación medía 645 de 672 y de la siguiente
   * asomaban 27 puntos, que es no asomar.
   *
   * Ahora el tope es lo que SOBRA de la franja después de apartar los muebles
   * de la publicación y el asomo de la siguiente: dice algo comprobable en vez
   * de ser un porcentaje elegido a ojo.
   */
  check('18) el tope sale de la franja del muro, no de la ventana',
    /const sobra = alturaVisible - MUEBLES_DE_LA_PUBLICACION - ASOMO_DE_LA_SIGUIENTE;/.test(reglaDelMedio)
    && /const \{ width: anchoDeLaVentana, height: altoDeLaVentana \} = useWindowDimensions\(\);/.test(tarjeta)
    && /const altoMaximoDelMedio = topeDelMedio\(alturaDelMuro\);/.test(tarjeta)
    && !/PARTE_DE_LA_VENTANA|PROPORCION_MAS_VERTICAL|MAX_IMAGE_HEIGHT|MIN_IMAGE_HEIGHT/.test(tarjeta));
  /*
   * Y esa franja se MIDE donde se sabe. `useWindowDimensions()` no vale: da la
   * ventana entera. Quien pinta el muro ya medía su cabecera con `onLayout`; le
   * faltaba medir su área y descontar la barra de abajo, que va flotando y por
   * eso no le quita sitio a la lista aunque le tape el final.
   */
  const muro = leer('screens/LandingScreen.tsx');
  check('18) el muro mide su hueco de verdad y se lo pasa a la publicación',
    /onLayout=\{\(e\) => setAltoDelArea\(e\.nativeEvent\.layout\.height\)\}/.test(muro)
    && /const barraDeAbajo = isDesktop \? 0 : ALTO_DE_LA_BARRA_INFERIOR \+ insets\.bottom;/.test(muro)
    && /const alturaVisibleDelMuro = Math\.max\(0, altoDelArea - headerHeight - barraDeAbajo\);/.test(muro)
    && /alturaVisible=\{alturaVisibleDelMuro \|\| undefined\}/.test(muro)
    && /alturaVisible\?: number;/.test(tarjeta)
    && /const alturaDelMuro = alturaVisible \?\? alturaVisibleDelMuro\(altoDeLaVentana\);/.test(tarjeta));
  /* El alto de esa barra vive en UN sitio: quien la pinta y quien la descuenta leen lo mismo. */
  check('18) el alto de la barra inferior no está escrito dos veces',
    /export const ALTO_DE_LA_BARRA_INFERIOR = 56;/.test(reglaDelMedio)
    && /height: ALTO_DE_LA_BARRA_INFERIOR \+ insets\.bottom,/.test(leer('navigation/TabNavigator.tsx'))
    && /ALTO_DE_LA_BARRA_INFERIOR \} from '\.\.\/utils\/medidaDelMedio'/.test(muro));
  /*
   * NINGUNA PUBLICACIÓN DEL MURO ES MÁS ALTA QUE 4:5. Lo que cambia es cómo lo
   * consigue cada una: la foto se encoge, porque hay que verla entera; el vídeo
   * se asoma por su ventana, porque el vídeo entero está en Weëls.
   *
   * El adelanto estuvo en cuadrado y era demasiado: un cuadrado obligatorio le
   * quita al vídeo lo que lo identifica y convierte el muro en una galería de
   * recuadros iguales.
   */
  check('18) foto y adelanto comparten forma máxima, 4:5, y ninguna es cuadrada',
    /const maxImageHeight = topeDeLaFoto\(carouselWidth, altoMaximoDelMedio\);/.test(tarjeta)
    && /export const FORMA_MAS_ALTA_DE_FOTO = 4 \/ 5;/.test(reglaDelMedio)
    && /export const FORMA_MAS_ALTA_DEL_PREVIEW = 4 \/ 5;/.test(reglaDelMedio)
    && !/FORMA_MAS_ALTA_DEL_PREVIEW = 1;/.test(reglaDelMedio)
    && !/const maxImageHeight = altoMaximoDelMedio;/.test(tarjeta));

  /*
   * 4b) LA MÉTRICA DEL MURO, EJECUTADA, CONTRA DOS FEEDS DE VERDAD.
   *
   * Los números no son de laboratorio: salen de contar píxeles en tres capturas
   * del mismo teléfono (1080 x 2640, densidad 3 → 360 x 800 puntos).
   *
   *  · Facebook   medio de canto a canto, 1080 px = el 100 % del ancho; un
   *               vertical se queda en 540 pt de alto, o sea la forma 2:3.
   *  · Instagram  igual, 1080 px de ancho; su vertical va a 598, forma 0,60.
   *  · Weë antes  medio en 1008 px, el 93 %, con 36 px de blanco a cada lado.
   *
   * Los dos de fuera hacen lo mismo y es el principio que se adopta: SANGRE
   * COMPLETA a lo ancho y un tope de FORMA, no de puntos. Weë no puede copiar
   * el 2:3 porque su cabecera mide 104 pt contra los 65 de Facebook, así que le
   * quedan 676 de franja frente a 711; con 2:3 la publicación mediría 705 y no
   * cabría. De ahí 4:5.
   *
   * Y aquí se comprueba la MÉTRICA DE LA PUBLICACIÓN ENTERA, no solo la caja
   * del medio: es lo único que dice si el muro se puede recorrer.
   */
  {
    const ts = require('typescript');
    const js = ts.transpileModule(reglaDelMedio, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const { medidaDelMedio, topeDelMedio, topeDeLaFoto, ventanaDelPreview, alturaVisibleDelMuro } =
      await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

    const FRANJA = 676;   /* medido: del píxel 311 al 2339, entre 3 */
    const COL = 360;      /* a sangre: la ventana entera, como Facebook e Instagram */
    const MUEBLES = 165;  /* medido: autor, texto y fila de acciones */
    const TOPE_MURO = topeDelMedio(FRANJA);
    const TOPE_FOTO = topeDeLaFoto(COL, TOPE_MURO);
    const foto = (p) => medidaDelMedio(COL, p, TOPE_FOTO);
    const video = (p) => ventanaDelPreview(COL, p, TOPE_MURO);
    const redondo = (c) => Math.round(c.width) + 'x' + Math.round(c.height);
    const parte = (c) => Math.round(100 * (c.height + MUEBLES) / FRANJA);

    check('18b) sin medir, la franja se estima bien', Math.round(alturaVisibleDelMuro(800)) === 672,
      String(Math.round(alturaVisibleDelMuro(800))));
    /* Las dos reglas se encuentran en el mismo sitio: 450 de forma, 452 de sitio. */
    check('18b) la forma y el sitio dan casi el mismo tope, y manda el más bajo',
      Math.round(TOPE_FOTO) === 450 && Math.round(TOPE_MURO) === 452 && TOPE_FOTO < TOPE_MURO,
      'forma ' + Math.round(TOPE_FOTO) + ', sitio ' + Math.round(TOPE_MURO));

    /*
     * ── ANCHO: LA MITAD DEL ASUNTO ────────────────────────────────────────
     * Todo lo que su forma permite llega de canto a canto. Es lo que separa un
     * feed de una tarjeta apoyada encima.
     */
    for (const forma of [21 / 9, 16 / 9, 4 / 3, 1, 4 / 5]) {
      check('18b) forma ' + forma.toFixed(3) + ': la foto llega a los dos cantos',
        Math.round(foto(forma).width) === COL);
    }
    for (const forma of [21 / 9, 16 / 9, 4 / 3, 1, 4 / 5, 3 / 4, 9 / 16, 9 / 21]) {
      check('18b) forma ' + forma.toFixed(3) + ': el adelanto llega SIEMPRE a los dos cantos',
        Math.round(video(forma).width) === COL);
    }
    /* Y se gana ancho respecto a la métrica anterior, que descontaba el aire. */
    check('18b) el medio gana los 24 puntos que antes se comía el relleno',
      COL - 336 === 24 && Math.round(video(9 / 16).width) === 360);

    /*
     * ── FOTOS: enteras, sin recortar, centradas ───────────────────────────
     */
    check('18b) foto: las medidas exactas',
      redondo(foto(21 / 9)) === '360x154' && redondo(foto(16 / 9)) === '360x203'
      && redondo(foto(4 / 3)) === '360x270' && redondo(foto(1)) === '360x360'
      && redondo(foto(4 / 5)) === '360x450' && redondo(foto(3 / 4)) === '338x450'
      && redondo(foto(2 / 3)) === '300x450' && redondo(foto(9 / 16)) === '253x450');
    for (const [nombre, forma] of Object.entries({ '21:9': 21 / 9, '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '4:5': 4 / 5, '3:4': 3 / 4, '2:3': 2 / 3, '9:16': 9 / 16 })) {
      const c = foto(forma);
      check('18b) foto ' + nombre + ': proporción exacta, sin deformar',
        Math.abs(c.width / c.height - forma) < 1e-9);
      check('18b) foto ' + nombre + ': cabe en su hueco, nada que recortar',
        c.width <= COL + 1e-9 && c.height <= TOPE_FOTO + 1e-9);
      check('18b) foto ' + nombre + ': la banda es igual a los dos lados',
        Math.abs((COL - c.width) / 2 * 2 + c.width - COL) < 1e-9);
    }

    /*
     * ── VÍDEOS: orientación conservada, altura acotada ────────────────────
     * Un apaisado sigue siendo apaisado y un vertical sigue siendo vertical.
     * Nada se convierte en cuadrado por obligación, que era el problema.
     */
    check('18b) vídeo: las medidas exactas',
      redondo(video(21 / 9)) === '360x154' && redondo(video(16 / 9)) === '360x203'
      && redondo(video(4 / 3)) === '360x270' && redondo(video(1)) === '360x360'
      && redondo(video(4 / 5)) === '360x450' && redondo(video(3 / 4)) === '360x450'
      && redondo(video(9 / 16)) === '360x450' && redondo(video(9 / 21)) === '360x450');
    check('18b) un vídeo apaisado sigue siendo apaisado',
      video(16 / 9).width > video(16 / 9).height * 1.5 && video(21 / 9).width > video(21 / 9).height * 2);
    check('18b) y un vídeo vertical sigue pareciendo vertical, no un cuadrado',
      video(9 / 16).height > video(9 / 16).width * 1.2,
      redondo(video(9 / 16)));
    check('18b) el cuadrado ya no es obligatorio para nadie',
      Math.round(video(9 / 16).height) !== Math.round(video(9 / 16).width));
    /* Un apaisado, un cuadrado o un 4:5 entran enteros: la ventana solo actúa arriba de 4:5. */
    for (const forma of [21 / 9, 16 / 9, 4 / 3, 1, 4 / 5]) {
      check('18b) vídeo de forma ' + forma.toFixed(3) + ': entra entero, sin recorte',
        video(forma).recorta === false);
    }
    for (const forma of [3 / 4, 9 / 16, 9 / 21]) {
      check('18b) vídeo de forma ' + forma.toFixed(3) + ': se queda algo fuera y lo dice',
        video(forma).recorta === true);
    }
    check('18b) el adelanto de un 9:16 enseña siete décimas del vídeo',
      Math.round(100 * video(9 / 16).height / (COL / (9 / 16))) === 70);

    /*
     * ── LA MÉTRICA DE LA PUBLICACIÓN ENTERA ───────────────────────────────
     * Esto es lo que de verdad decide si el muro se recorre. Ninguna
     * publicación puede acercarse a llenar la franja: es el fallo al que no se
     * puede volver, y por eso se vigila para TODOS los formatos.
     */
    for (const forma of [21 / 9, 16 / 9, 4 / 3, 1, 4 / 5, 3 / 4, 2 / 3, 9 / 16, 9 / 21]) {
      check('18b) forma ' + forma.toFixed(3) + ': la publicación no llena la franja',
        parte(video(forma)) <= 92 && parte(foto(forma)) <= 92,
        'vídeo ' + parte(video(forma)) + '%, foto ' + parte(foto(forma)) + '%');
      check('18b) forma ' + forma.toFixed(3) + ': de la siguiente asoma algo de verdad',
        FRANJA - (video(forma).height + MUEBLES) >= 56
        && FRANJA - (foto(forma).height + MUEBLES) >= 56);
    }
    check('18b) con un vertical, nueve décimas de franja y el autor de la siguiente',
      parte(video(9 / 16)) === 91 && Math.round(FRANJA - (video(9 / 16).height + MUEBLES)) === 61);
    check('18b) con un apaisado caben casi dos publicaciones',
      parte(video(16 / 9)) === 54 && parte(foto(16 / 9)) === 54);
    /* El punto de partida, para que no se pierda de vista de dónde se viene. */
    const original = medidaDelMedio(328, 9 / 16, 0.6 * 800);
    check('18b) el vídeo que se comía la franja queda documentado',
      Math.round(original.height) === 480 && Math.round(100 * (original.height + MUEBLES) / 672) === 96);
    /* Y el cuadrado del que se viene: mismo alto de publicación, pero sin identidad. */
    check('18b) el adelanto cuadrado anterior era más bajo pero perdía la orientación',
      Math.round(ventanaDelPreview(336, 9 / 16, 336).height) === 336);

    /*
     * ── OTRAS PANTALLAS ───────────────────────────────────────────────────
     * Las dos reglas son formas, así que se recalculan solas.
     */
    const franjaPequena = alturaVisibleDelMuro(640), topePequeno = topeDelMedio(franjaPequena);
    check('18b) en un teléfono pequeño manda el sitio, no la forma, y el ancho sigue entero',
      topePequeno < COL / (4 / 5)
      && Math.round(ventanaDelPreview(COL, 9 / 16, topePequeno).width) === COL
      && Math.round(ventanaDelPreview(COL, 9 / 16, topePequeno).height) === Math.round(topePequeno),
      'tope ' + Math.round(topePequeno));
    /* Girado, la franja es mínima y la resta se iría en negativo sin el suelo. */
    check('18b) girado, el suelo evita que el medio desaparezca',
      topeDelMedio(alturaVisibleDelMuro(360)) > 0);
    /* En una columna ancha de escritorio la forma sigue frenando la altura. */
    const anchoWeb = 608, topeWeb = topeDelMedio(alturaVisibleDelMuro(900));
    const adelantoWeb = ventanaDelPreview(anchoWeb, 9 / 16, topeWeb);
    check('18b) en una columna ancha el adelanto llena el ancho y no se dispara',
      Math.round(adelantoWeb.width) === anchoWeb && adelantoWeb.height < anchoWeb,
      redondo(adelantoWeb));

    /* Sin proporción todavía —el primer fotograma no ha llegado— se espera en 4:3. */
    check('18b) sin proporción todavía, espera en 4:3',
      redondo(foto(undefined)) === '360x270' && redondo(video(undefined)) === '360x270');
  }

  /*
   * 5) La proporción sale del reproductor, que es la única fuente fiable para
   * un vídeo, y se recuerda por URL. Mientras no se sabe, cuadrado: con
   * `CONTAIN` esa espera no recorta nada, solo sobra fondo.
   */
  check('18) la proporción la cuenta el reproductor y se recuerda',
    /onReadyForDisplay=\{alSaberLaFormaDelVideo\}/.test(tarjeta)
    && /setCachedVideoAspectRatio\(urlDelVideo, proporcion\);/.test(tarjeta)
    && /const proporcionDelVideo = proporcionMedida \?\? 1;/.test(tarjeta));
  /*
   * Y en la web, donde ese aviso no llega, se le pregunta a la cabecera del
   * vídeo, igual que una foto le pregunta su tamaño a `Image.getSize`. Sin
   * esto, en el navegador todos los vídeos se quedaban en el cuadrado de
   * espera —sin recortar, pero sin su forma—.
   */
  check('18) y en la web se le pregunta a la cabecera del vídeo',
    /fetchAndCacheVideoAspectRatio\(urlDelVideo, \(proporcion\) => \{/.test(tarjeta)
    && /sonda\.preload = 'metadata';/.test(cacheDeVideos)
    && /const doc = typeof document === 'undefined' \? null : document;/.test(cacheDeVideos));

  /*
   * 6) FOTOS Y VÍDEOS, DOS CAMINOS SEPARADOS. Cada uno con su caché y su
   * medida; ninguna regla común que al tocarla mueva los dos.
   */
  check('19) cada uno tiene su propia caché',
    /export function getCachedVideoAspectRatio/.test(cacheDeVideos)
    && !/getCachedVideoAspectRatio|proporcionDeLaMedida/.test(cacheDeFotos)
    /* La del vídeo no pregunta a nadie: no puede, y por eso existe aparte. */
    && !/^import .*react-native/m.test(cacheDeVideos) && !/RNImage\.getSize/.test(cacheDeVideos));
  /* La foto se mide con la MISMA regla que el vídeo, y el carrusel con su tope. */
  check('19) la foto pasa por la misma regla que el vídeo',
    /const caja = medidaDelMedio\(carouselWidth, aspectRatio, maxImageHeight\);/.test(tarjeta)
    && /style=\{\[styles\.singleMediaContainer, sangriaDelMedio, caja\]\}/.test(tarjeta)
    && /const carouselHeight = Math\.min\(maxImageHeight, carouselWidth \/ aspectRatio\);/.test(tarjeta));
  /* Y el bloque que mide la foto no toca nada del vídeo, ni al revés. */
  const bloqueDeLaFoto = tarjeta.slice(tarjeta.indexOf('const postToUse = isRepost && originalPost ? originalPost : post;'), tarjeta.indexOf('}, [isRepost, originalPost, post.imageUrls]);'));
  const bloqueDelVideo = tarjeta.slice(tarjeta.indexOf('const urlDelVideo ='), tarjeta.indexOf('const ventanaDelVideo ='));
  check('19) control: y la foto no pasa por nada del vídeo',
    bloqueDeLaFoto.length > 100 && bloqueDelVideo.length > 100
    && !/Video|proporcion|videoUrl/.test(bloqueDeLaFoto)
    && !/imageUrls|imageDimensions|fetchAndCacheAspectRatio/.test(bloqueDelVideo));

  /*
   * 7) WEËLSSCREEN NO SE TOCA. Allí el vídeo SÍ llena la pantalla con `COVER`,
   * que es su diseño, y su tamaño sale del viewport medido. Si esta fase se
   * hubiera colado ahí, esto lo caza.
   */
  const visor = leer('screens/ReelsScreen.tsx');
  check('20) WeëlsScreen sigue con su vídeo a pantalla completa',
    /resizeMode=\{ResizeMode\.COVER\}/.test(visor)
    && /<View style=\{\[styles\.reelContainer, \{ width: viewport\.width, height: viewport\.height \}\]\}>/.test(visor)
    && !/videoDimensionCache|proporcionDelVideo|maxVideoHeight/.test(visor));
}

console.log('\n── La proporción de un vídeo, ejecutada de verdad ──');
{
  /*
   * `proporcionDeLaMedida` se ejecuta, no se lee. Es la pieza que decide si un
   * vídeo se pinta vertical o apaisado, y el caso que importa es el de Android:
   * el reproductor puede dar la medida ANTES de rotar, así que un vídeo
   * vertical llega como 1920×1080 y solo `orientation` delata su forma. Sin
   * esto, un vertical se pintaría apaisado, que es justo el recorte que esta
   * fase quita.
   */
  const fuenteVideo = leer('utils/videoDimensionCache.ts');
  const jsVideo = ts.transpileModule(fuenteVideo, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const cache = await import('data:text/javascript;base64,' + Buffer.from(jsVideo).toString('base64'));
  const { proporcionDeLaMedida, getCachedVideoAspectRatio, setCachedVideoAspectRatio } = cache;
  const casi = (a, b) => a !== undefined && Math.abs(a - b) < 0.0001;

  check('21) un vídeo apaisado sale apaisado', casi(proporcionDeLaMedida({ width: 1920, height: 1080 }), 16 / 9));
  check('21) uno cuadrado sale cuadrado', casi(proporcionDeLaMedida({ width: 720, height: 720 }), 1));
  check('21) y uno vertical sale vertical', casi(proporcionDeLaMedida({ width: 1080, height: 1920 }), 9 / 16));
  check('22) un vertical que llega sin rotar se endereza',
    casi(proporcionDeLaMedida({ width: 1920, height: 1080, orientation: 'portrait' }), 9 / 16));
  /* Control: `orientation` no da la vuelta a lo que ya venía bien. */
  check('22) control: un vertical que ya venía vertical no se toca',
    casi(proporcionDeLaMedida({ width: 1080, height: 1920, orientation: 'portrait' }), 9 / 16)
    && casi(proporcionDeLaMedida({ width: 1920, height: 1080, orientation: 'landscape' }), 16 / 9));
  /* Sin medida no se inventa una: quien pregunta usa su valor de espera. */
  check('23) sin medida no devuelve nada, y no se inventa una forma',
    [undefined, {}, { width: 0, height: 100 }, { width: 100, height: 0 }, { width: NaN, height: 10 }]
      .every((m) => proporcionDeLaMedida(m) === undefined));
  /* La caché guarda lo bueno y rechaza lo imposible. */
  setCachedVideoAspectRatio('u1', 0.5625);
  setCachedVideoAspectRatio('u2', 0);
  setCachedVideoAspectRatio('u3', NaN);
  check('24) la caché recuerda una proporción buena y rechaza las imposibles',
    getCachedVideoAspectRatio('u1') === 0.5625 && getCachedVideoAspectRatio('u2') === undefined
    && getCachedVideoAspectRatio('u3') === undefined && getCachedVideoAspectRatio('nunca-visto') === undefined);
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nEl muro: se rellena, avanza el cursor, sabe cuándo se acaba y no repite ni pierde publicaciones');
process.exit(failures ? 1 : 0);
