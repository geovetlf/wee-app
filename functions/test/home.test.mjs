/*
 * EL HOME REDISEÑADO.
 *
 * El Home dejó de abrir con un carrusel y de filtrar por tipo de archivo: ahora
 * abre diciendo quién eres, y las pastillas del muro son SECCIONES de Weë —de
 * dónde viene cada publicación—, no formatos.
 *
 * Son dos cambios que se rompen en silencio:
 *
 *  1. el criterio de las pastillas. Si `filterBySection` dejara de mirar los
 *     destinos, el muro seguiría enseñando publicaciones y nadie lo notaría
 *     hasta que alguien buscara las suyas de Weë Travel y no estuvieran;
 *  2. los filtros por tipo de contenido, que NO cambiaron. Las paredes de cada
 *     experiencia —ya retiradas— pedían
 *     "imágenes" y "tutoriales", y ya se rompieron una vez al tocar este mismo
 *     archivo. Aquí se vigila que las dos familias convivan.
 *
 * La parte de lógica se EJECUTA de verdad —sin red, sin Firestore y sin tocar un
 * solo dato—; de la parte visual se lee el código, que es lo único que se puede
 * comprobar sin abrir la aplicación. Cada grupo lleva un control para que un
 * verde no pueda ser un verde vacío.
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
const aModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const transpilar = (ruta) =>
  ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;

/*
 * `feedFilters` importa a `sectionFeed`, y un módulo cargado desde una URL de
 * datos no sabe resolver "./sectionFeed". Se le da ya resuelto: el mismo archivo
 * de verdad, transpilado, metido como dirección. Nada de dobles.
 */
const seccionesUrl = aModulo(transpilar('utils/sectionFeed.ts'));
const secciones = await import(seccionesUrl);
const filtros = await import(
  aModulo(transpilar('utils/feedFilters.ts').replace(/(['"])\.\/sectionFeed\1/, JSON.stringify(seccionesUrl)))
);

/** Una publicación de mentira. Sin `destinations` es de las de antes. */
const post = (id, extra = {}) => ({ id, userId: 'u', content: '', likes: 0, comments: 0, ...extra });
const ids = (lista) => lista.map((p) => p.id);

console.log('\n── A · Las pastillas del Home son secciones ──');
{
  const { HOME_SECTION_FILTERS } = filtros;
  /* Siete desde el carrusel de secciones (2026-09-12): entraron Weë Design y Weë Business. */
  check('1) son siete, en el orden pedido',
    JSON.stringify(HOME_SECTION_FILTERS.map((f) => f.id)) === JSON.stringify(['all', 'studio', 'travel', 'music', 'chef', 'design', 'business'])
  );
  /*
   * LA GRAFÍA APROBADA DE PRODUCTO (fase 5P): con diéresis y separada. Los
   * `id` —'studio', 'travel'…— mandan el reparto del muro y viajan en lo ya
   * publicado, así que esos NO se tocan; lo que cambió es lo que se lee.
   */
  check('2) con los nombres de las experiencias',
    JSON.stringify(HOME_SECTION_FILTERS.map((f) => f.label)) ===
      JSON.stringify(['Todo', 'Weë Studio', 'Weë Travel', 'Weë Music', 'Weë Chef', 'Weë Design', 'Weë Business'])
  );
  /* Y los identificadores internos, intactos: son los que reparten el muro. */
  check('2) y los identificadores internos no se movieron',
    JSON.stringify(HOME_SECTION_FILTERS.map((f) => f.id)) ===
      JSON.stringify(['all', 'studio', 'travel', 'music', 'chef', 'design', 'business'])
  );
  /*
   * Control: los identificadores no son inventados aquí. Si alguien renombrara
   * una sección en `sectionFeed`, estas pastillas filtrarían por un nombre que
   * ya no existe y el muro saldría vacío sin un solo error.
   */
  const destinos = secciones.destinosDisponibles().map((d) => d.id);
  const huerfanas = HOME_SECTION_FILTERS.filter((f) => f.id !== 'all' && !destinos.includes(f.id)).map((f) => f.id);
  check('3) control: toda pastilla es un destino donde se puede publicar', huerfanas.length === 0, huerfanas.join(', ') || 'ninguna huérfana');
  /*
   * Y una advertencia escrita, no un fallo: Weë Music y Weë Business todavía
   * no tienen palabras clave (`SECTION_MARKERS`). Sus pastillas enseñan lo que
   * eligió publicarse en ellas y nada más; lo publicado antes de que existieran
   * los destinos no aparece ahí. Cuando tengan marcas, esta comprobación lo
   * dirá.
   */
  const conMarcas = Object.keys(secciones.SECTION_MARKERS);
  const sinMarcas = HOME_SECTION_FILTERS.filter((f) => f.id !== 'all' && !conMarcas.includes(f.id)).map((f) => f.id);
  check('4) las pastillas sin palabras clave solo leen destinos elegidos',
    JSON.stringify(sinMarcas) === JSON.stringify(['music', 'business']),
    sinMarcas.length ? `sin marcas: ${sinMarcas.join(', ')}` : 'todas tienen marcas'
  );
}

console.log('\n── B · filterBySection, ejecutado de verdad ──');
{
  const { filterBySection } = filtros;
  const viaje = post('viaje', { destinations: ['travel'] });
  const cocina = post('cocina', { destinations: ['chef'] });
  const soloGeneral = post('solo-general', { destinations: ['general'] });
  const antigua = post('antigua', { content: 'Mi receta de pan con IA' });
  const todos = [viaje, cocina, soloGeneral, antigua];

  check('5) "Todo" no filtra nada', JSON.stringify(ids(filterBySection(todos, 'all'))) === JSON.stringify(ids(todos)));
  check('6) manda el destino elegido', JSON.stringify(ids(filterBySection(todos, 'travel'))) === JSON.stringify(['viaje']));
  check('7) lo publicado antes de los destinos se sigue leyendo por sus palabras',
    ids(filterBySection(todos, 'chef')).includes('antigua')
  );
  /*
   * Control: si el filtro no filtrara —devolver la lista entera, por ejemplo—
   * las dos comprobaciones de arriba podrían pasar igual. Esta no.
   */
  check('8) control: quien publicó solo en el muro general no aparece en ninguna sección',
    ['studio', 'travel', 'music', 'chef', 'design', 'business'].every((s) => !ids(filterBySection(todos, s)).includes('solo-general'))
  );
  check('9) es exactamente el reparto de los muros de sección, sin criterio nuevo',
    ['studio', 'travel', 'music', 'chef', 'design', 'business'].every(
      (s) => JSON.stringify(ids(filterBySection(todos, s))) === JSON.stringify(ids(secciones.postsDeLaSeccion(todos, s)))
    )
  );
  /* Las dos nuevas filtran de verdad: lo publicado en Weë Design solo sale en Weë Design. */
  const cartel = post('cartel', { destinations: ['design'] });
  const tienda = post('tienda', { destinations: ['business'] });
  check('9b) Weë Design y Weë Business reparten como las demás',
    JSON.stringify(ids(filterBySection([...todos, cartel, tienda], 'design'))) === JSON.stringify(['cartel'])
    && JSON.stringify(ids(filterBySection([...todos, cartel, tienda], 'business'))) === JSON.stringify(['tienda'])
    && !ids(filterBySection([...todos, cartel, tienda], 'travel')).includes('cartel')
  );
  const antes = ids(todos).join();
  filterBySection(todos, 'travel');
  check('10) no toca la lista que recibe', ids(todos).join() === antes);
}

console.log('\n── B2 · Selección múltiple, ejecutada de verdad ──');
{
  const { alternarSeccion, estaActiva, filterBySections, HOME_SECTION_FILTERS } = filtros;
  const viaje = post('viaje', { destinations: ['travel'] });
  const cocina = post('cocina', { destinations: ['chef'] });
  const cancion = post('cancion', { destinations: ['music'] });
  const doble = post('doble', { destinations: ['travel', 'chef'] });
  const soloGeneral = post('solo-general', { destinations: ['general'] });
  const todos = [viaje, cocina, cancion, doble, soloGeneral];
  const activas = (elegidas) => HOME_SECTION_FILTERS.filter((f) => estaActiva(elegidas, f.id)).map((f) => f.id).join('+');

  /*
   * La selección es la lista de secciones puestas; "Todo" es la lista vacía.
   * Cada caso de abajo es uno de los pedidos: A) entrada, B) una, C) segunda,
   * D) tercera, E) quitar una, F) quitar la última, G) "Todo" se apaga solo,
   * H) varias a la vez. Y un control: nada de esto toca la lista que recibe.
   */
  const entrada = [];
  check('A) al entrar, "Todo" está puesta y el muro sale entero',
    activas(entrada) === 'all' && JSON.stringify(ids(filterBySections(todos, entrada))) === JSON.stringify(ids(todos)));
  const unaSola = alternarSeccion(entrada, 'travel');
  check('B) Todo → WeeTravel: solo WeeTravel, y "Todo" se apaga',
    activas(unaSola) === 'travel' && JSON.stringify(ids(filterBySections(todos, unaSola))) === JSON.stringify(['viaje', 'doble']));
  const dos = alternarSeccion(unaSola, 'chef');
  check('C) + WeeChef: las dos puestas, y el muro es la unión',
    activas(dos) === 'travel+chef' && JSON.stringify(ids(filterBySections(todos, dos))) === JSON.stringify(['viaje', 'cocina', 'doble']));
  const tres = alternarSeccion(dos, 'music');
  check('D) + WeeMusic: las tres, y el muro suma la tercera',
    activas(tres) === 'travel+music+chef' && JSON.stringify(ids(filterBySections(todos, tres))) === JSON.stringify(['viaje', 'cocina', 'cancion', 'doble']));
  const sinChef = alternarSeccion(dos, 'chef');
  check('E) WeeTravel + WeeChef → tocar WeeChef: queda solo WeeTravel',
    activas(sinChef) === 'travel' && JSON.stringify(ids(filterBySections(todos, sinChef))) === JSON.stringify(['viaje', 'doble']));
  const ninguna = alternarSeccion(unaSola, 'travel');
  check('F) quitar la última vuelve a "Todo" sola',
    ninguna.length === 0 && activas(ninguna) === 'all' && JSON.stringify(ids(filterBySections(todos, ninguna))) === JSON.stringify(ids(todos)));
  check('G) tocar "Todo" con secciones puestas las quita todas',
    alternarSeccion(tres, 'all').length === 0 && activas(alternarSeccion(tres, 'all')) === 'all');
  const siete = HOME_SECTION_FILTERS.filter((f) => f.id !== 'all').reduce((elegidas, f) => alternarSeccion(elegidas, f.id), []);
  check('H) pueden quedar dos, tres o las siete puestas a la vez, sin convertirse a "Todo"',
    dos.length === 2 && tres.length === 3 && siete.length === 6 && !estaActiva(siete, 'all')
    && JSON.stringify(ids(filterBySections(todos, siete))) === JSON.stringify(['viaje', 'cocina', 'cancion', 'doble']));
  /* Excluyentes por construcción: con alguna sección puesta, "Todo" nunca lo está, y al revés. */
  check('control: "Todo" y las secciones nunca están puestas a la vez',
    [entrada, unaSola, dos, tres, sinChef, ninguna, siete].every((e) => estaActiva(e, 'all') === (e.length === 0)));
  /* Control: una publicación que pertenece a dos secciones puestas sale una sola vez, en su sitio. */
  check('control: sin repetidos y en el orden del muro',
    ids(filterBySections(todos, dos)).filter((id) => id === 'doble').length === 1
    && JSON.stringify(ids(filterBySections(todos, ['chef', 'travel']))) === JSON.stringify(['viaje', 'cocina', 'doble']));
  const antesDeTocar = JSON.stringify(dos);
  alternarSeccion(dos, 'music'); filterBySections(todos, dos);
  check('control: no tocan la selección ni la lista que reciben', JSON.stringify(dos) === antesDeTocar && ids(todos).length === 5);
}

console.log('\n── C · Los filtros por tipo de contenido no se movieron ──');
{
  const { FEED_FILTER_OPTIONS, filterPosts } = filtros;
  check('11) siguen siendo los cinco de siempre',
    JSON.stringify(FEED_FILTER_OPTIONS.map((f) => f.id)) === JSON.stringify(['all', 'images', 'videos', 'questions', 'tutorials'])
  );
  const conImagen = post('img', { imageUrls: ['x'] });
  const conVideo = post('vid', { videoUrl: 'x' });
  check('12) y siguen funcionando', JSON.stringify(ids(filterPosts([conImagen, conVideo], 'images'))) === JSON.stringify(['img']));
  /*
   * Control: las dos familias son distintas. Si `filterPosts` hubiera quedado
   * apuntando al reparto por secciones, "imágenes" no distinguiría nada.
   */
  check('13) control: no son el mismo filtro', filterPosts !== filtros.filterBySection);
  /*
   * El filtro por tipo de contenido lo usaban las paredes de cada experiencia.
   * Esas paredes se retiraron —Weë tiene un solo muro— y la función se queda:
   * sigue siendo una forma válida de acotar y no la usa nadie por error.
   */
  check('14) el filtro por tipo sigue existiendo y separado del de secciones',
    typeof filterPosts === 'function' && filterPosts !== filtros.filterBySection);
  check('15) y las pastillas del Home son las únicas que reparten por sección',
    /HOME_SECTION_FILTERS/.test(leer('screens/LandingScreen.tsx')) && !/SectionWall/.test(leer('screens/SpecialistScreen.tsx')));
}

console.log('\n── D · El Home abre diciendo quién eres ──');
{
  const saludo = leer('components/HomeGreeting.tsx');
  check('16) saluda por tu nombre, y el nombre entra como valor',
    /t\('home\.greeting', \{ nombre \}\)/.test(saludo));
  /*
   * Y NADA MÁS. El "Crea. Conecta. Sé tú." que iba debajo del nombre se quitó:
   * la firma de marca vive ahora arriba, junto al logo, y dos frases de
   * bienvenida a dos dedos de distancia cargaban el bloque sin decir nada nuevo.
   * Tampoco puede quedar hueco reservado, así que el nombre es el único hijo.
   */
  check('17) ya no lleva una segunda frase debajo del nombre', !/Crea\. Conecta\. Sé tú\./.test(saludo));
  /* Control: el lema de la marca sí sigue existiendo, pero en el encabezado. */
  check('18) control: la firma de marca sigue viva, arriba', /Imagina · Crea · Conecta/.test(leer('components/Header.tsx')));
  check('19) y con tu cara', /AvatarDisplay/.test(saludo));
  /*
   * El nombre y el avatar salen del PERFIL ACTIVO. Si vinieran de `useAuth`,
   * al cambiar al Perfil Weë el Home seguiría llamándote por tu nombre real.
   */
  check('20) del perfil activo, no de la cuenta', /useUserProfile\(\)/.test(saludo) && /userProfile\?\.displayName/.test(saludo));
  check('21) la lupa se anuncia', /accessibilityLabel=\{t\('home\.search'\)\}/.test(saludo));
  /*
   * Control: en web `scale()` multiplica por 0,9, así que un 44 escalado son 39
   * puntos y deja de ser un objetivo táctil cómodo. Tiene que ser literal.
   */
  const lupa = /lupa: \{([^}]*)\}/.exec(saludo);
  check('22) control: el objetivo táctil no se encoge en web', !!lupa && /width: 44,/.test(lupa[1]) && !/scale\(/.test(lupa[1]));
  check('23) no duplica ningún buscador: abre el que ya existe', !/searchPosts|SearchScreen|TextInput/.test(saludo));
  /*
   * Control de la comprobación de arriba: una negación pasa sola si el patrón no
   * encuentra nada en ningún sitio. El buscador de verdad sí lo trae, así que el
   * patrón busca algo que existe y el 22 dice lo que parece decir.
   */
  check('24) control: el buscador de verdad sí escribe', /TextInput/.test(leer('screens/SearchScreen.tsx')));
}

console.log('\n── E · Los Credits dejan de verse en el Home ──');
{
  const nativo = leer('screens/LandingScreen.tsx');
  const web = leer('screens/WebLandingScreen.tsx');
  const sinSaldo = (fuente) => !/CreditsPill|useWallet|creditsBalance/.test(fuente);
  check('25) el Home nativo no enseña saldo', sinSaldo(nativo));
  check('26) el Home web tampoco', sinSaldo(web));
  /*
   * Control: se quitaron del Home, no del sistema. Si esto fallara, la orden se
   * habría cumplido borrando los Credits, que es justo lo contrario.
   */
  const menu = leer('components/DrawerMenu.tsx');
  const barra = leer('components/Sidebar.tsx');
  check('27) control: siguen en el menú, con su saldo', /Credits`/.test(menu) && /Credits`/.test(barra));
  check('28) y la píldora de saldo sigue existiendo', fs.existsSync(path.resolve(here, '../../components/CreditsPill.tsx')));
}

console.log('\n── F · Ẅall y Ẅells ──');
{
  const nativo = leer('screens/LandingScreen.tsx');
  const web = leer('screens/WebLandingScreen.tsx');
  /*
   * El Home ya no rotula Ẅall ni Ẅells en ningún selector, porque no hay
   * selector: hubo dos pestañas subrayadas, luego una píldora con dos mitades,
   * y la decisión final las quitó. La única palabra "Ẅells" del Home es el
   * título de la fila de Weëls, que sigue abriendo WeëlsScreen.
   */
  check('29) el Home nativo no tiene selector Ẅall/Ẅells', !/mitad\('flow'|mitad\('weels'|accessibilityRole="tab"/.test(nativo));
  check('30) y el web tampoco', !/etiqueta: 'Ẅall'|etiqueta: 'Ẅells'|accessibilityRole="tab"/.test(web));
  check('31) ya no dice "Comunidad" ni "Creado por la comunidad"', !/>\s*Comunidad\s*</.test(nativo) && !/Creado por la comunidad</.test(nativo));
  check('32) la fila de Weëls se sigue llamando Ẅells', /<Text style=\{\[styles\.title[^>]*>Ẅells<\/Text>/.test(leer('components/WeelsRow.tsx')));
  /* Ẅells es una puerta a WeëlsScreen, no una página del Home: la fila abre el visor de siempre. */
  check('33) y sigue abriendo WeëlsScreen, en la web', /<WeelsRow[^>]*onOpenWeels=\{handleOpenWeels\}/.test(web));
  check('33) y en el móvil', /onOpenWeels=\{\(\) => abrirElVisor\(\)\}/.test(nativo));
}

console.log('\n── F2 · El Home es un solo muro ──');
{
  const nativo = leer('screens/LandingScreen.tsx');
  const web = leer('screens/WebLandingScreen.tsx');
  const fila = leer('components/WeelsRow.tsx');
  const pila = leer('navigation/MainStackNavigator.tsx');
  const publicacion = leer('components/PostCard.tsx');

  /*
   * DECISIÓN FINAL: NI PAGER, NI PÍLDORA, NI FILA DE FILTROS.
   *
   * El Home enseña siempre el Wäll: saludo, compositor y fila de Weëls arriba,
   * y debajo las publicaciones con sus WeeTags. Lo que hubo —un pager
   * Wäll ↔ Weëls con su píldora, un bloque flotante que subía con la lista
   * activa y una fila de pastillas de sección— se fue entero. A los Weëls se
   * entra desde su fila, que abre WeëlsScreen, la experiencia de siempre.
   *
   * Aquí se vigila que no vuelva a medias: ni estado, ni gesto, ni cálculo de
   * página, ni transform, ni estilo huérfano.
   */
  const arbolNativo = nativo.slice(nativo.indexOf('{/* Content area wrapper */}'), nativo.indexOf('<DrawerMenu'));
  const cabecera = nativo.slice(nativo.indexOf('const listHeader = useMemo'), nativo.indexOf('const renderPostItem'));
  check('33a) el Home nativo es una sola lista vertical',
    /<FlatList\s*\n\s*ref=\{flatListRef\}/.test(arbolNativo) && /data=\{filteredFeedPosts\}/.test(arbolNativo)
    && /ListHeaderComponent=\{listHeader\}/.test(arbolNativo) && (arbolNativo.match(/<FlatList/g) || []).length === 1);
  /* Ningún `horizontal` como prop en el árbol del Home: el único ScrollView horizontal es el carrusel, en la cabecera. */
  check('33a) y nada se mueve de lado', !/pagingEnabled|\n\s+horizontal\s*\n|Animated\.FlatList|translateX|onMomentumScrollEnd/.test(arbolNativo));
  check('33a) sin estado de página, sin gesto y sin cálculo de página',
    !/activeTab|useState<'flow' \| 'weels'>|scrollToTab|paginaObjetivo|handleTabScroll|tabScrollRef|weelsListRef|paginaEn\(/.test(nativo));
  check('33a) y sin bloque flotante ni copia del selector',
    !/bloqueDeArriba|altoDelBloque|subidaDelBloque|desplazamiento|tabBarStickyWrapper|stickyAnim|renderTabBar/.test(nativo));
  check('33b) la web es un solo muro: sin páginas, sin gesto y sin selector',
    !/useState<'muro' \| 'weels'>|estiloDePagina|irALaPagina|onTouchStart|onTouchEnd|translateX|paginasRef|selectorRef|RECORRIDO_MINIMO/.test(web));
  check('33b) y sin paginación aparte para una página de Ẅells',
    !/cargarMasWeels|hayMasWeels|weelsLastDoc|WEELS_POR_TANDA/.test(web) && /getVideoPostsPaginated\(10\)/.test(web));
  /* La píldora Ẅall/Ẅells desapareció del todo, en las dos plataformas. */
  check('33c) no queda píldora Ẅall/Ẅells',
    !/accessibilityRole="tab"|mitad\(|tabItem|selectorMitad|etiqueta: 'Ẅall'/.test(nativo)
    && !/accessibilityRole="tab"|selectorMitad|etiqueta: 'Ẅall'|aria-selected/.test(web));
  /*
   * EL CARRUSEL DE SECCIONES NO ES LA PÍLDORA. Volvió el filtro del Wäll —Todo ·
   * WeeStudio · WeeTravel · WeeMusic · WeeChef · WeeDesign · WeeBusiness—, pero
   * como lo que es: un ScrollView horizontal POR DENTRO, entre la fila de Weëls
   * y las publicaciones, que solo acota el muro. Tocar una sección cambia
   * `feedFilter` y nada más: ni navega, ni abre Weëls, ni cambia de página.
   */
  const carruselNativo = nativo.slice(nativo.indexOf('const renderFeedFilters = () => ('), nativo.indexOf('const filteredFeedPosts'));
  check('33c) el carrusel de secciones vuelve como filtro del Wäll, por dentro',
    /<ScrollView\s*\n\s*horizontal\s*\n\s*showsHorizontalScrollIndicator=\{false\}/.test(carruselNativo)
    && /directionalLockEnabled/.test(carruselNativo) && /HOME_SECTION_FILTERS\.map\(\(f\) => \{/.test(carruselNativo)
    && /onPress=\{\(\) => setFeedFilter\(\(elegidas\) => alternarSeccion\(elegidas, f\.id\)\)\}/.test(carruselNativo)
    && !/navigate\(|abrirElVisor|scrollTo\(/.test(carruselNativo));
  /*
   * Selección múltiple con la MISMA lógica en las dos plataformas: el estado es
   * la lista de secciones puestas (vacía = "Todo"), cada pastilla pregunta a
   * `estaActiva`, cada toque pasa por `alternarSeccion` y el muro por
   * `filterBySections`. Nada de eso se reimplementa en las pantallas.
   */
  check('33c) y el muro se acota con él, en el acto, con una o varias secciones',
    /const \[feedFilter, setFeedFilter\] = useState<SeccionesElegidas>\(\[\]\);/.test(nativo)
    && /const active = estaActiva\(feedFilter, f\.id\);/.test(carruselNativo)
    && /const filteredFeedPosts = useMemo\(\(\) => filterBySections\(feedPosts, feedFilter\), \[feedPosts, feedFilter\]\);/.test(nativo)
    && /data=\{filteredFeedPosts\}/.test(arbolNativo));
  check('33c) en la web, lo mismo',
    /const \[feedFilter, setFeedFilter\] = useState<SeccionesElegidas>\(\[\]\);/.test(web)
    && /const active = estaActiva\(feedFilter, f\.id\);/.test(web)
    && /onPress=\{\(\) => setFeedFilter\(\(elegidas\) => alternarSeccion\(elegidas, f\.id\)\)\}/.test(web)
    && /const filteredPosts = useMemo\(\(\) => filterBySections\(posts, feedFilter\), \[posts, feedFilter\]\);/.test(web)
    && /<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} contentContainerStyle=\{styles\.filters\} style=\{styles\.filtersScroll\}>/.test(web)
    && /filteredPosts\.map\(\(post\) =>/.test(web));
  /* Control: la lógica de selección está en un solo sitio; las pantallas no la duplican. */
  check('33c) control: las pantallas no reimplementan la selección',
    !/feedFilter\.includes|feedFilter === f\.id|feedFilter\.filter\(/.test(nativo) && !/feedFilter\.includes|feedFilter === f\.id|feedFilter\.filter\(/.test(web)
    && /export const alternarSeccion/.test(leer('utils/feedFilters.ts')) && /export const filterBySections/.test(leer('utils/feedFilters.ts')));
  /* Control: el carrusel va DESPUÉS de la fila de Weëls y ANTES del muro, y la fila no sabe nada de él. */
  check('33c) control: va entre la fila de Weëls y el muro',
    cabecera.indexOf('renderWeelsRow()') < cabecera.indexOf('renderFeedFilters()')
    && web.indexOf('<WeelsRow ') < web.indexOf('HOME_SECTION_FILTERS.map') && web.indexOf('HOME_SECTION_FILTERS.map') < web.indexOf('filteredPosts.map((post) =>')
    && !/feedFilter|HOME_SECTION_FILTERS/.test(fila));
  check('33c) las secciones siguen en el WeeTag de cada publicación',
    /import WeeTag from '\.\/WeeTag';/.test(publicacion)
    && /const seccion = useMemo\(\(\) => seccionDe\(post\), \[post\]\);/.test(publicacion)
    && /<WeeTag nombre=\{seccion\.nombre\} icono="sparkles-outline" \/>/.test(publicacion));
  /* El orden del Home: saludo · compositor · fila de Weëls · carrusel de secciones, y debajo el Wäll. */
  check('33d) el Home nativo: saludo · compositor · fila de Weëls · secciones, y debajo el Wäll',
    cabecera.indexOf('renderHero()') > 0 && cabecera.indexOf('renderHero()') < cabecera.indexOf('renderComposer()')
    && cabecera.indexOf('renderComposer()') < cabecera.indexOf('renderWeelsRow()')
    && cabecera.indexOf('renderWeelsRow()') < cabecera.indexOf('renderFeedFilters()')
    && !/renderTabBar/.test(cabecera) && /renderItem=\{renderPostItem\}/.test(nativo));
  const entreFilaYMuro = web.slice(web.indexOf('<WeelsRow '), web.indexOf('filteredPosts.map((post) =>'));
  check('33d) y en la web lo mismo, con solo el carrusel entre la fila y el muro',
    web.indexOf('<HomeGreeting ') > 0 && web.indexOf('<HomeGreeting ') < web.indexOf('<ComposerEntry ')
    && web.indexOf('<ComposerEntry ') < web.indexOf('<WeelsRow ') && web.indexOf('<WeelsRow ') < web.indexOf('filteredPosts.map((post) =>')
    && /HOME_SECTION_FILTERS\.map/.test(entreFilaYMuro) && !/selectorZona|role="tab"|estiloDePagina/.test(entreFilaYMuro));
  /* Las dos puertas de la fila: cualquier tarjeta y "Ver todos →" abren WeëlsScreen. */
  check('33e) en la fila, las tarjetas y "Ver todos →" llaman a la misma puerta',
    (fila.match(/onPress=\{onOpenWeels\}/g) || []).length >= 3 && /accessibilityLabel=\{t\('weels\.seeAll'\)\}/.test(fila));
  check('33e) y esa puerta abre WeëlsScreen en el móvil',
    /onOpenWeels=\{\(\) => abrirElVisor\(\)\}/.test(nativo)
    && /const abrirElVisor = useCallback\(\(desde\?: Post\) => \{\s*if \(videoPosts\.length === 0\) return crearWeel\(\);[\s\S]{0,200}navigate\('Reels', \{ initialPost: desde \|\| videoPosts\[0\], initialVideoPosts: videoPosts \}\)/.test(nativo));
  check('33e) y en la web',
    /<WeelsRow[^>]*onOpenWeels=\{handleOpenWeels\}/.test(web)
    && /const handleOpenWeels = \(\) => \{\s*if \(weels\.length === 0\) return handleCreateWeel\(\);\s*navigation\.navigate\('Reels', \{ initialPost: weels\[0\], initialVideoPosts: weels \}\);/.test(web));
  check('33e) "Explora → Weëls" del menú también abre WeëlsScreen, sin página intermedia',
    /if \(!openWeelsParam \|\| videosLoading\) return;[\s\S]{0,160}abrirElVisor\(\);/.test(nativo)
    && /if \(!route\.params\?\.openWeels\) return;[\s\S]{0,120}handleOpenWeels\(\);/.test(web));
  /* WeëlsScreen intacta: registrada igual, y el Home no la importa ni la reemplaza. */
  check('33f) WeëlsScreen sigue registrada tal cual',
    /name="Reels"\s*\n\s*component=\{ReelsScreen\}\s*\n\s*options=\{\{\s*presentation: 'modal',/.test(pila)
    && !/ReelsScreen/.test(nativo) && !/ReelsScreen/.test(web));
  check('33f) control: la fila de Weëls no cambió',
    !/pagina|activeTab|scrollToTab|irALaPagina|navigate\(/.test(fila) && /onOpenWeels: \(\) => void;/.test(fila));
  /* Control: la web sigue recortando de lado y el muro nativo sigue avisando a la barra de abajo. */
  check('33g) control: la web recorta de lado y el muro nativo avisa a la barra',
    /overflowY: 'auto', overflowX: 'hidden'/.test(web) && /onScroll=\{reportarScroll\}/.test(arbolNativo));
}

console.log('\n── F3 · WeëlsScreen encaja en el viewport ──');
{
  const visor = leer('screens/ReelsScreen.tsx');
  /*
   * CADA WEËL MIDE EXACTAMENTE EL VISOR.
   *
   * La lista pagina por su alto real; si cada Weël midiera otra cosa, a cada
   * paso se colaría un trozo del siguiente. Eso pasaba con
   * `Dimensions.get('window').height`, que en Android no es el alto del visor
   * modal de borde a borde. Ahora el alto y el ancho se MIDEN del contenedor y
   * la lista no se monta hasta tenerlos: `getItemLayout`, `initialScrollIndex`
   * y cada Weël usan la misma medida.
   */
  check('33j) el tamaño de cada Weël no sale de Dimensions',
    !/height: SCREEN_HEIGHT|SCREEN_HEIGHT \*|height: SCREEN_HEIGHT \*/.test(visor) && !/height: SCREEN_HEIGHT\b/.test(visor)
    && /const \{ width: SCREEN_WIDTH \} = Dimensions\.get\('window'\);/.test(visor));
  check('33j) se mide del contenedor del visor',
    /onLayout=\{medirViewport\}/.test(visor)
    && /const \{ width, height \} = e\.nativeEvent\.layout;/.test(visor)
    && /setViewport\(\(actual\) => \(actual && actual\.width === width && actual\.height === height \? actual : \{ width, height \}\)\);/.test(visor));
  check('33j) y cada Weël ocupa exactamente esa medida',
    /<View style=\{\[styles\.reelContainer, \{ width: viewport\.width, height: viewport\.height \}\]\}>/.test(visor)
    && !/reelContainer: \{[^}]*width: SCREEN_WIDTH/.test(visor));
  check('33j) la paginación usa la misma medida, y la lista no nace sin ella',
    /const altoDelWeel = viewport\?\.height \?\? 0;/.test(visor)
    && /length: altoDelWeel,\s*offset: altoDelWeel \* index,/.test(visor)
    && /\{viewport && \(\s*<FlatList/.test(visor) && /initialScrollIndex=\{initialIndex\}/.test(visor));
  /* Control: sigue paginando de uno en uno en el móvil y la navegación no cambió. */
  check('33j) control: pagina de uno en uno y el gesto de volver sigue igual',
    /pagingEnabled=\{!isWeb\}/.test(visor) && /if \(dx > SCREEN_WIDTH \* 0\.3\)/.test(visor) && /presentation: 'modal'/.test(leer('navigation/MainStackNavigator.tsx')));
}

console.log('\n── G · Los Weëls pesan menos ──');
{
  const fila = leer('components/WeelsRow.tsx');
  const medida = (nombre) => {
    const bloque = new RegExp(nombre + ': \\{[^}]*width: scale\\((\\d+)\\),\\s*height: scale\\((\\d+)\\)').exec(fila);
    return bloque ? { w: Number(bloque[1]), h: Number(bloque[2]) } : null;
  };
  const normal = medida('card');
  const compacta = medida('cardCompacta');
  check('34) hay un modo compacto', !!compacta && !!normal);
  check('35) y de verdad es más pequeño', !!compacta && !!normal && compacta.w < normal.w && compacta.h < normal.h,
    compacta && normal ? `${compacta.w}×${compacta.h} frente a ${normal.w}×${normal.h}` : '');
  check('36) lo usan las dos pantallas del Home',
    /<WeelsRow[^>]*compacta|compacta\n/.test(leer('screens/WebLandingScreen.tsx')) && /compacta/.test(leer('screens/LandingScreen.tsx')));
  /*
   * Control: compacta encoge y quita adorno —el subtítulo, las visitas, el
   * emoji, la duración—, pero NO decide qué Weëls se ven ni qué hace cada uno.
   *
   * Esa es la línea que no se puede cruzar: en cuanto `compacta` tocara `posts`,
   * `onOpenWeels` o `onCreateWeel`, la fila del Home y la de los muros de
   * sección dejarían de ser la misma fila y habría dos comportamientos que
   * mantener. Que quite una etiqueta es presentación; que cambie la lista o el
   * destino de un toque, no.
   */
  const mencionan = (fila.match(/\bcompacta\b/g) || []).length;
  /* Ningún toque cambia de destino según el tamaño… */
  const enManejadores = [...fila.matchAll(/onPress=\{([^}]+)\}/g)].filter((m) => /compacta/.test(m[1]));
  /* …la lista de Weëls es la misma… */
  const enLaLista = /posts\.slice\([^)]*compacta/.test(fila);
  /* …y compacta solo puede QUITAR adorno (`!compacta && <…>`), nunca poner ni cambiar un elemento. */
  const ponePiezas = /(^|[^!])compacta\s*&&\s*</.test(fila) || /compacta\s*\?\s*</.test(fila);
  check('37) control: no decide qué Weëls se ven ni qué hacen',
    mencionan > 0 && enManejadores.length === 0 && !enLaLista && !ponePiezas,
    `${mencionan} apariciones; manejadores intactos: ${enManejadores.length === 0}`);
}

console.log('\n── H · Lo que no se tocó ──');
{
  const nativo = leer('screens/LandingScreen.tsx');
  const web = leer('screens/WebLandingScreen.tsx');
  check('38) el compositor sigue en el Home', /ComposerEntry/.test(nativo) && /ComposerEntry/.test(web));
  check('39) el ☰ sigue abriendo el menú de siempre', /DrawerMenu/.test(web) && /setDrawerVisible\(true\)/.test(web));
  check('40) el Home no publica: solo abre la pantalla de crear', !/createPost\(/.test(nativo) && !/createPost\(/.test(web));
  /*
   * Control: la lupa lleva a la pantalla de Buscar que ya existe, y Buscar es una
   * pestaña, así que hay que subir un nivel. Sin eso el botón no haría nada.
   */
  check('41) control: la lupa sube al navegador de pestañas', /getParent\(\)/.test(nativo) && /navigate\('Search'\)/.test(nativo));
  check('42) y en web navega a Buscar', /navigation\.navigate\('Search'\)/.test(web));
}


console.log('\n── I · El refinamiento visual ──');
{
  const saludo = leer('components/HomeGreeting.tsx');
  const puerta = leer('components/creator/ComposerEntry.tsx');
  const fila = leer('components/WeelsRow.tsx');
  const nativo = leer('screens/LandingScreen.tsx');
  const web = leer('screens/WebLandingScreen.tsx');
  const publicacion = leer('components/PostCard.tsx');

  /*
   * UNA SOLA PANTALLA, NO TRES BLOQUES.
   *
   * Saludo, compositor y Weëls comparten el fondo. Cuando cada uno traía el suyo
   * se veían franjas grises entre el encabezado y el muro, y el Home parecía
   * montado a trozos. Lo único que se despega del fondo es la tarjeta de
   * publicar, que es donde se actúa.
   */
  check('43) el saludo comparte el fondo de la pantalla', /styles\.fila, \{ backgroundColor: theme\.colors\.background \}/.test(saludo));
  check('44) y la fila de Weëls también', /<View style=\{\{ backgroundColor: theme\.colors\.background \}\}>/.test(nativo));

  /*
   * Un solo tamaño en el saludo. Al quedarse sin la segunda frase, el bloque
   * tiene una sola cosa que decir y un solo tamaño con el que decirla: meter
   * otro aquí arriba es lo que lo hacía pesar más de lo que dice.
   */
  const tamanos = [...saludo.matchAll(/fontSize: ([^,\n]+)/g)].map((m) => m[1].trim());
  check('45) el saludo usa un solo tamaño de letra', tamanos.length === 1, tamanos.join(' · '));

  /* El amarillo es de crear y elegir. Buscar es descubrir. */
  check('46) la lupa no compite con el "+": no es amarilla', !/lupa[\s\S]{0,320}accent/.test(saludo));
  check('47) y sigue midiendo 44 sin escalar', /lupa: \{\s*width: 44,\s*height: 44,/.test(saludo));

  /*
   * EL "+" DEL COMPOSITOR.
   *
   * Solo en el Home, donde tu cara ya está en el saludo. En los muros de sección
   * la tarjeta sigue enseñando tu avatar, porque allí no está en ninguna otra
   * parte de la pantalla.
   */
  check('48) la tarjeta de publicar nace como siempre', /variante = 'muro'/.test(puerta));
  check('49) el "+" solo sale en el Home', /variante === 'home' \? \([\s\S]{0,600}accessibilityLabel=\{t\('composer\.createPost'\)\}/.test(puerta));
  check('50) mide 44 sin escalar', /crear: \{\s*width: 44,\s*height: 44,/.test(puerta));
  check('51) y responde al dedo', /onPressIn=\{\(\) => hundir\(0\.92\)\}/.test(puerta) && /useNativeDriver: true/.test(puerta));
  check('52) las dos pantallas del Home lo piden', /variante="home"/.test(nativo) && /variante="home"/.test(web));
  /*
   * Control: los muros de sección NO lo piden, así que siguen exactamente como
   * estaban. Si esto fallara, el rediseño se habría salido del Home.
   */
  /*
   * La variante del Home es la que cambia el avatar por el "+". Es OPCIONAL, y
   * ese es el control: quien no la pide —hoy nadie más, antes los muros de
   * sección— conserva el avatar sin tener que decir nada.
   */
  check('53) control: la variante es opcional, y sin ella se conserva el avatar',
    /variante\?: /.test(leer('components/creator/ComposerEntry.tsx')));

  /*
   * WEËLS COMPACTOS: menos cosas encima de cada miniatura.
   */
  check('54) compacta no lleva subtítulo', /\{!compacta && \(\s*<Text style=\{\[styles\.subtitle/.test(fila));
  check('55) ni cuentas de visitas', /!compacta && typeof post\.views/.test(fila));
  check('56) ni emoji ni duración', /\{!compacta && <Text style=\{styles\.sampleEmoji/.test(fila) && /\{!compacta && <Text style=\{styles\.duration/.test(fila));
  /*
   * NI MARCA DE WEË ENCIMA DE LA MINIATURA (fase 2E-78).
   *
   * Abajo a la derecha de cada tarjeta iba una pastilla con la W y la palabra
   * "Weë". A 74 u 92 puntos ese sello tapaba parte del fotograma, que es lo
   * único que ayuda a decidir si un vídeo interesa, así que se fue de la fila.
   * No es la marca de agua del producto —la que viaja dentro del vídeo al
   * compartirlo fuera de Weë—, que no se ha tocado.
   */
  check('57) la miniatura no lleva la marca de Weë encima',
    !/watermark/i.test(fila) && !/<Watermark/.test(fila));
  /*
   * NI SELLO DE REPRODUCCIÓN.
   *
   * Por lo mismo que la marca, y encima peor colocado: el círculo blanco con el
   * triángulo caía en el CENTRO del fotograma, justo donde está lo que ayuda a
   * decidir. En una fila que solo tiene Weëls, avisar de que son vídeos no
   * aporta nada: la fila ya se llama Ẅells y la tarjeta ya se abre al tocarla.
   */
  check('58) la miniatura tampoco lleva sello de reproducción',
    !/<PlayCircle \/>/.test(fila) && !/const PlayCircle/.test(fila)
    && !/name="play"/.test(fila) && !/play: \{/.test(fila));
  /* Y lo que sí lleva sigue donde estaba: título y visitas, sin moverse. */
  const alturaDe = (nombre) => {
    const m = new RegExp(nombre + ': \\{[^}]*bottom: scale\\((\\d+)\\)').exec(fila);
    return m ? Number(m[1]) : null;
  };
  check('58) el título y las visitas siguen igual',
    alturaDe('sampleLabel') === 24 && alturaDe('views') === 24,
    `título a ${alturaDe('sampleLabel')}, visitas a ${alturaDe('views')}`);
  /* Control: la marca de agua del vídeo compartido sigue existiendo, aparte de esto. */
  check('58) control: la marca de agua del vídeo compartido no se tocó',
    /watermark/i.test(leer('services/videoDownload.ts')));

  /*
   * PASTILLAS: bajas de altura, cómodas de tocar.
   *
   * El carrusel de secciones volvió al Wäll (la píldora Ẅall/Ẅells no). Lo
   * segundo NO sale de lo primero: el `hitSlop` añade por fuera lo que la
   * pastilla no tiene por dentro. Sin él, 34 puntos de alto son 10 menos que
   * un dedo.
   */
  const alturaPastilla = (fuente, nombre) => {
    const m = new RegExp(nombre + ': \\{[^}]*height: scale\\((\\d+)\\)').exec(fuente);
    return m ? Number(m[1]) : null;
  };
  const pastillaNativa = alturaPastilla(nativo, 'feedFilterChip');
  const pastillaWeb = alturaPastilla(web, 'chip');
  /* Medidas de verdad, no ausencias: sin el `!== null` un estilo que desapareciera pasaría. */
  check('59) la pastilla es baja', pastillaNativa !== null && pastillaWeb !== null && pastillaNativa <= 36 && pastillaWeb <= 36,
    `${pastillaNativa} en móvil, ${pastillaWeb} en web`);
  check('60) y aun así se toca cómoda', /hitSlop=\{\{ top: 8, bottom: 8/.test(nativo) && /hitSlop=\{\{ top: 8, bottom: 8/.test(web));
  check('61) la apagada lleva borde para que se lea como tocable',
    /feedFilterChip: \{[^}]*borderWidth: StyleSheet\.hairlineWidth/.test(nativo) && /borderColor: active \? theme\.colors\.accent : theme\.colors\.border/.test(web));
  /*
   * Y el texto de la apagada toma el color del tema. Con un gris fijo, sobre el
   * fondo casi negro del Perfil Weë, las secciones eran invisibles.
   */
  check('62) el texto de la pastilla apagada sigue al tema', /color: active \? '#1F2937' : theme\.colors\.text/.test(web) && /color: active \? '#1F2937' : theme\.colors\.text/.test(nativo));
  /* Y ninguna píldora Ẅall/Ẅells volvió con ellas. */
  check('63) control: la píldora Ẅall/Ẅells no volvió con el carrusel', !/tabItem|tabBarZona|mitad\('flow'|accessibilityRole="tab"/.test(nativo) && !/selectorMitad|selectorZona|irALaPagina|accessibilityRole="tab"/.test(web));
  /* Lo que sí queda: la sección de cada publicación, en su WeeTag, sin tocar. */
  check('64) la sección se sigue leyendo en el WeeTag de cada publicación',
    /<WeeTag nombre=\{seccion\.nombre\} icono="sparkles-outline" \/>/.test(publicacion) && /const seccion = useMemo\(\(\) => seccionDe\(post\), \[post\]\);/.test(publicacion));

  /*
   * ESTADOS QUE SE PUEDEN OÍR.
   *
   * En el móvil manda `accessibilityState`. En web no: se comprobó en el DOM que
   * React Native Web no lo traduce a ningún atributo, así que el estado va
   * escrito a mano o no existe para un lector de pantalla.
   */
  check('65) el móvil dice qué sección está puesta',
    /accessibilityState=\{\{ selected: active \}\}/.test(nativo)
    && /accessibilityLabel=\{t\('home\.filterBy', \{ nombre: etiqueta \}\)\}/.test(nativo)
    && /filterBy: 'Filtrar: \{\{nombre\}\}'/.test(leer('i18n/textos/es/home.ts')));
  check('66) y la web también, con su propio atributo', /aria-pressed=\{active\}/.test(web) && !/aria-selected/.test(web));

  /*
   * LOS BOTONES DE UNA PUBLICACIÓN.
   *
   * Los iconos miden 20 y el dedo necesita 44. Se añade por fuera: nada se mueve
   * de sitio. Es el único cambio fuera del Home y es invisible.
   */
  const conArea = (publicacion.match(/style=\{styles\.actionButton\} hitSlop=\{AREA_TACTIL\}/g) || []).length;
  const total = (publicacion.match(/style=\{styles\.actionButton\}/g) || []).length;
  check('67) todos los botones de una publicación se pueden tocar', conArea === total && total === 5, `${conArea} de ${total}`);
  /*
   * CINCO, NO SIETE. Opinar a favor, en contra, comentar, guardar y compartir.
   *
   * Republicar y enviar salieron de la fila al menú de los tres puntos: eran
   * los dos que menos se usan y los que convertían la fila en una hilera de
   * iconos donde no se distinguía ninguno. No se ha perdido ninguna acción, y
   * eso es lo que de verdad hay que vigilar, así que se comprueba abajo.
   */
  check('67) y son exactamente esas cinco, en ese orden',
    (() => {
      const fila = publicacion.slice(publicacion.indexOf('LA FILA DE ACCIONES: CINCO'), publicacion.indexOf('Hidden shareable'));
      const iconos = (fila.match(/thumbs-up|thumbs-down|chatbubble-outline|isBookmarked \? 'bookmark'|share-social-outline/g) || []);
      return iconos[0].startsWith('thumbs-up') && iconos.includes('thumbs-down')
        && iconos.includes('chatbubble-outline') && iconos.some((i) => i.includes('bookmark'))
        && iconos[iconos.length - 1] === 'share-social-outline'
        && !/name="repeat"/.test(fila) && !/paper-plane-outline/.test(fila);
    })());
  /* Y las dos que salieron siguen existiendo, en el menú y con su lógica de siempre. */
  check('67) republicar y enviar no se perdieron: viven en el menú',
    /const republicarDesdeElMenu = \(\) => \{[\s\S]{0,200}toggleRepost\(\);/.test(publicacion)
    && /const enviarDesdeElMenu = \(\) => \{[\s\S]{0,400}onPrivateMessage\(displayPost\.userId/.test(publicacion)
    && /onPress=\{republicarDesdeElMenu\}/.test(publicacion)
    && /onPress=\{enviarDesdeElMenu\}/.test(publicacion));
  /* Las opciones del menú se escriben una sola vez y las usan las dos ramas. */
  check('67) el menú no está duplicado entre web y teléfono',
    (publicacion.match(/\{opcionesDelMenu\}/g) || []).length === 2
    && (publicacion.match(/const opcionesDelMenu =/g) || []).length === 1);
  /* Guardar sigue usando el sistema que ya existía: ni servicio nuevo ni lógica repetida. */
  check('67) guardar sigue siendo el Guardados de siempre',
    /const \{ isSaved, toggle: toggleBookmark \} = useBookmarks\(\);/.test(publicacion)
    && /toggleBookmark\(targetPostId\)/.test(publicacion)
    && !/bookmarksService/.test(publicacion));
  /*
   * COMPARTIR UN VÍDEO FUERA DE WEË MANDA EL ENLACE, NO EL ARCHIVO.
   *
   * Esto ya cambió dos veces, y las dos por el mismo motivo: lo que llegaba al
   * otro lado no era la publicación. Primero se mandaba una captura PNG y
   * Android anunciaba "1 imagen" con un fotograma quieto. Luego se mandaba el
   * mp4: eso sí era el vídeo, pero era un archivo suelto —sin autor, sin texto
   * y sin vuelta a Weë—, había que esperar a que bajara y gastaba los datos dos
   * veces.
   *
   * Ahora va el ENLACE, que es lo que hacen Facebook, Instagram y YouTube: la
   * app de destino pide `https://wee.zone/post/{postId}`, lee las etiquetas Open
   * Graph de la página pública y arma ella la tarjeta con miniatura, título y
   * marca. Aquí no se genera nada, no se sube nada y no se espera nada.
   */
  {
    const desde = publicacion.indexOf('if (postToShare.videoUrl) {');
    const rama = publicacion.slice(desde, publicacion.indexOf('    }', publicacion.indexOf('return;', desde)) + 5);

    check('69) el vídeo del Wäll se comparte como enlace, por el flujo común',
      /const compartido = await compartirFueraDeWee\(postToShare\.id\);/.test(rama)
      && /import \{ compartirFueraDeWee \} from '\.\.\/utils\/compartirFuera';/.test(publicacion));

    /*
     * Y NO HAY SALIDA HACIA ABAJO. Ni al mp4 ni al PNG: la rama termina siempre
     * en `return`, así que ninguno de los dos caminos viejos se puede alcanzar
     * desde aquí.
     */
    check('69) esa rama no baja ningún archivo ni cae al PNG',
      /\}\s*\n\s*return;\s*\n\s*\}/.test(rama)
      && !/shareCardRef|setShowShareCard|image\/png|compartirVideo|\.mp4/.test(rama));
    check('69) y avisa si no se pudo',
      /notify\(t\('wall\.shareFailed'\)\)/.test(rama));

    /* Ni el componente entero vuelve a saber del bajador de vídeos. */
    check('69) PostCard ya no usa videoDownload para compartir fuera',
      !/videoDownload|compartirVideo/.test(publicacion));

    /*
     * NO HAY NADA QUE PREPARAR, ASÍ QUE NO HAY CARTEL. El velo con "Preparando
     * video..." existía porque había una descarga detrás; sin descarga, un
     * cartel sería una espera inventada.
     */
    check('69) desaparece el "Preparando video..." y su estado',
      !/Preparando video/.test(publicacion)
      && !/preparandoVideo/.test(publicacion)
      && /disabled=\{isSharing\}/.test(publicacion));

    /*
     * UN WEËL ES UNA PUBLICACIÓN, ASÍ QUE VA POR LA MISMA PUERTA. Antes esta
     * pantalla mandaba la dirección cruda del mp4 en Cloudinary; ahora llama al
     * MISMO flujo con el mismo `post.id`, sin ruta nueva ni lógica repetida.
     */
    const weels = leer('screens/ReelsScreen.tsx');
    check('69) el Weël se comparte por el mismo flujo y con su postId',
      /onPress=\{\(\) => \{ void compartirFueraDeWee\(post\.id\); \}\}/.test(weels)
      && /import \{ compartirFueraDeWee \} from '\.\.\/utils\/compartirFuera';/.test(weels));
    check('69) y ya no manda la dirección del mp4 ni arma su propio Share',
      !/post\.videoUrl \|\| ''/.test(weels) && !/Share\.share/.test(weels));

    /*
     * LA DIRECCIÓN ES LA QUE YA HABÍA. `generatePostUrl` vive en config/linking.ts
     * desde antes y da la misma ruta que la app abre en `PostDetail`. No se
     * escribe "wee.zone" a mano en ningún sitio nuevo.
     */
    const comun = leer('utils/compartirFuera.ts');
    check('69) el enlace sale de generatePostUrl, no de una constante nueva',
      /import \{ generatePostUrl \} from '\.\.\/config\/linking';/.test(comun)
      && !/https:\/\/wee\.zone/.test(comun.replace(/\/\*[\s\S]*?\*\//g, '')));
    check('69) y config/linking sigue apuntando a /post/{postId}',
      /export const generatePostUrl = \(postId: string\): string => \{[\s\S]{0,120}wee\.zone\/post\/\$\{postId\}/.test(leer('config/linking.ts'))
      && /PostDetail: \{\s*\n\s*path: 'post\/:postId',/.test(leer('config/linking.ts')));

    /*
     * ── Y AHORA EJECUTÁNDOLO ────────────────────────────────────────────
     *
     * Lo de arriba lee el código; esto lo CORRE. Se transpila el flujo común y
     * se le cambian sus dos importaciones por dobles, para poder mirar qué
     * recibe de verdad `Share.share` en cada plataforma. Es la única forma de
     * demostrar que lo que sale es una dirección y no un archivo.
     */
    const ts = require('typescript');
    const aModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
    const dobleDeLinking = aModulo("export const generatePostUrl = (id) => 'https://wee.zone/post/' + id;");
    const correr = async (plataforma) => {
      globalThis.__weeCompartido = null;
      const dobleDeRN = aModulo(
        'export const Platform = { OS: ' + JSON.stringify(plataforma) + ' };\n'
        + 'export const Share = { share: async (c, o) => { globalThis.__weeCompartido = { c, o }; return { action: "sharedAction" }; } };'
      );
      const js = ts.transpileModule(leer('utils/compartirFuera.ts'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
      }).outputText
        .replace(/from ['"]react-native['"]/, "from '" + dobleDeRN + "'")
        .replace(/from ['"]\.\.\/config\/linking['"]/, "from '" + dobleDeLinking + "'");
      const m = await import(aModulo(js));
      return m;
    };

    {
      const m = await correr('android');
      const ok = await m.compartirFueraDeWee('abc123XYZ');
      const enviado = globalThis.__weeCompartido;
      /* En Android `Share` ignora `url`: si el enlace no va en `message`, no viaja. */
      check('69) ejecutado · en Android sale la URL dentro de message',
        ok === true && enviado.c.message === 'https://wee.zone/post/abc123XYZ' && !enviado.c.url,
        JSON.stringify(enviado && enviado.c));
      /* Lo que sale NO es un archivo: ni mp4, ni file://, ni un tipo MIME. */
      check('69) ejecutado · lo compartido no es un archivo',
        !/\.mp4|file:\/\/|image\/png|video\//.test(JSON.stringify(enviado.c)));
      /* Y lleva el postId correcto, que es lo que abre ESA publicación. */
      check('69) ejecutado · la URL lleva el postId, no el Home',
        enviado.c.message.endsWith('/post/abc123XYZ')
        && m.enlaceParaCompartir('otro') === 'https://wee.zone/post/otro');
    }
    {
      const m = await correr('ios');
      await m.compartirFueraDeWee('abc123XYZ');
      const enviado = globalThis.__weeCompartido;
      /* En iOS `url` entrega una dirección de verdad a la hoja del sistema. */
      check('69) ejecutado · en iOS sale como url',
        enviado.c.url === 'https://wee.zone/post/abc123XYZ' && !enviado.c.message,
        JSON.stringify(enviado.c));
    }
    {
      /* Sin identificador no hay enlace posible: se dice que no, y no se abre nada. */
      const m = await correr('android');
      const ok = await m.compartirFueraDeWee(undefined);
      check('69) ejecutado · sin postId no se comparte nada',
        ok === false && globalThis.__weeCompartido === null);
    }
  }
  /* Control: la foto sigue por el camino de siempre, la captura de la tarjeta. */
  check('69) control: una foto sigue compartiéndose como la tarjeta de siempre',
    /mimeType: 'image\/png',/.test(publicacion)
    && /shareCardRef\.current\.capture\(\)/.test(publicacion));
  /*
   * Control: COMPARTIR DENTRO DE WEË no es esto y no se ha tocado. Republicar y
   * enviar por WeeTalk siguen donde estaban, con sus servicios de siempre.
   */
  check('69) control: compartir dentro de Weë sigue intacto',
    /const republicarDesdeElMenu = \(\) => \{[\s\S]{0,200}toggleRepost\(\);/.test(publicacion)
    && /const enviarDesdeElMenu = \(\) => \{[\s\S]{0,400}onPrivateMessage\(displayPost\.userId/.test(publicacion)
    && /useReposts/.test(publicacion));

  {
    const compartir = leer('services/videoDownload.ts');
    /*
     * ESTE SERVICIO YA NO COMPARTE NADA.
     *
     * Compartir fuera de Weë manda el enlace, así que aquí no pasa. Lo que se
     * vigila es lo único que sigue importando de él mientras exista: que su
     * copia viva en el caché y se borre, y que no suba nada a Storage. Si
     * algún día alguien lo vuelve a enchufar a compartir, la comprobación de
     * arriba —"PostCard ya no usa videoDownload"— lo cazará.
     */
    check('69) el bajador que queda usa el caché y borra su copia',
      /FileSystem\.cacheDirectory\}wee_downloads\//.test(compartir)
      && /await Sharing\.shareAsync\(destino, \{/.test(compartir)
      && /FileSystem\.deleteAsync\(destino, \{ idempotent: true \}\)/.test(compartir));
    check('69) control: y no sube ninguna copia a Storage',
      !/storageService|uploadBytes|getDownloadURL|firebase\/storage/.test(compartir));

    /*
     * LA REGLA DEL TIPO, EJECUTADA. Es lo único que decide si Android ve un
     * vídeo o una imagen, así que se comprueba con direcciones de verdad y no
     * mirando si una constante existe.
     */
    const ts = require('typescript');
    const desde = compartir.indexOf('const TIPOS_DE_VIDEO');
    const hasta = compartir.indexOf('export async function compartirVideo');
    const trozo = compartir.slice(desde, hasta).replace('const TIPOS_DE_VIDEO', 'export const TIPOS_DE_VIDEO');
    const js = ts.transpileModule(trozo, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const { tipoDelVideo } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

    check('69b) un mp4 de Cloudinary sale como video/mp4',
      tipoDelVideo('https://res.cloudinary.com/x/video/upload/v1/wee/abc.mp4').mime === 'video/mp4');
    /* Cloudinary añade transformaciones y parámetros detrás; no deben confundir. */
    check('69b) y también con parámetros detrás',
      tipoDelVideo('https://res.cloudinary.com/x/video/upload/q_auto/v1/wee/abc.mp4?_a=BAA').mime === 'video/mp4'
      && tipoDelVideo('https://ejemplo.com/a.mp4#t=3').mime === 'video/mp4');
    check('69b) un .MOV en mayúsculas también se reconoce',
      tipoDelVideo('https://ejemplo.com/clip.MOV').mime === 'video/quicktime');
    check('69b) webm y 3gp conservan el suyo',
      tipoDelVideo('https://ejemplo.com/c.webm').mime === 'video/webm'
      && tipoDelVideo('https://ejemplo.com/c.3gp').mime === 'video/3gpp');
    /* Sin extensión reconocible se usa MP4, que es lo que Weë sube. */
    check('69b) sin extensión, mp4 y no una imagen',
      tipoDelVideo('https://ejemplo.com/sin-extension').mime === 'video/mp4');
    /*
     * Y LO QUE DE VERDAD IMPORTA: pase lo que pase, nunca sale un tipo de
     * imagen. Ese era el fallo.
     */
    check('69b) ninguna dirección devuelve jamás un tipo de imagen',
      ['https://a.com/x.mp4', 'https://a.com/x.jpg', 'https://a.com/x', 'https://a.com/x.png?y=1', '']
        .every((u) => tipoDelVideo(u).mime.startsWith('video/')));
  }

  /*
   * Control: se añadió área, no altura. Si `actionButton` hubiera crecido, la
   * fila de acciones cambiaría de tamaño en las ocho pantallas que la usan.
   */
  check('68) control: y la fila de acciones no cambió de tamaño', !/actionButton: \{[^}]*(height|minHeight|padding)/.test(publicacion));
}

console.log('\n── J · El selector de identidad ──');
{
  const cabecera = leer('components/Header.tsx');

  /*
   * Las dos opciones a la vista, en una sola cápsula. Antes era un botón que
   * decía dónde estabas; había que adivinar que se tocaba para ir al otro sitio.
   */
  check('69) Real y Weë se ven a la vez', /etiqueta: 'Real'[\s\S]{0,120}etiqueta: 'Weë'/.test(cabecera));
  check('70) en una sola pastilla', /styles\.selector,/.test(cabecera) && /selector: \{[\s\S]{0,200}borderRadius: BORDER_RADIUS\.full/.test(cabecera));
  check('71) el encendido va en amarillo', /puesta && \{ backgroundColor: theme\.colors\.accent \}/.test(cabecera));
  check('72) y sin icono de persona', !/name="person"/.test(cabecera) && !/'color-wand'/.test(cabecera));
  /*
   * Se escribe "Weë", no "WEE": lo manda CLAUDE.md para todo texto visible y el
   * botón anterior ya lo escribía así.
   */
  check('73) con la diéresis de la marca', /etiqueta: 'Weë'/.test(cabecera) && !/etiqueta: 'WEE'/.test(cabecera));

  /*
   * LO QUE HACE NO CAMBIÓ. Tocar el lado apagado llama al mismo
   * `handleSwitchIdentity` de siempre; tocar el encendido no hace nada.
   */
  check('74) tocar donde ya estás no hace nada', /const efectiva = identidadPedida\.current \?\? activeProfileType;\s*if \(efectiva === destino\) return;/.test(cabecera));
  /*
   * El cuerpo de `elegirIdentidad`: comprueba, y si procede pide el destino. Se
   * mira el cuerpo entero, no una ventana de caracteres: al añadirle la guarda
   * de toques repetidos, una ventana fija se quedó corta y falló sin que nada
   * estuviera mal.
   */
  const elegir = /const elegirIdentidad = useCallback\(\(destino: 'real' \| 'hidi'\) => \{[\s\S]*?\n  \}, \[activeProfileType, irAIdentidad\]\);/.exec(cabecera);
  check('75) y el cambio sigue siendo el de siempre', !!elegir && /irAIdentidad\(destino\);/.test(elegir[0]));
  /*
   * Control: la función que cambia de identidad está intacta. Sigue llamando a
   * `switchIdentity` y a `switchToBiz`, y el tema sale del DESTINO —no de
   * `activeProfileType`, que en dos cambios seguidos todavía es el viejo y
   * dejaba el Perfil Weë con el tema claro—.
   */
  const cambio = /const handleSwitchIdentity = \(\) => \{[\s\S]*?\n  \};/.exec(cabecera);
  check('76) control: la lógica de cambio no se tocó',
    !!cambio && /switchToBiz\(\);/.test(cambio[0]) && /irAIdentidad\(activeProfileType === 'real' \? 'hidi' : 'real'\);/.test(cambio[0])
      && /const irAIdentidad = useCallback\(\(destino: 'real' \| 'hidi'\) => \{\s*switchIdentity\(\);\s*setThemeMode\(destino === 'hidi' \? 'dark' : 'light'\);/.test(cabecera));
  check('77) el modo Biz conserva su pastilla', /activeProfileType === 'biz' \? \([\s\S]{0,400}styles\.switchButton/.test(cabecera));

  /* Cada mitad se anuncia y se toca cómoda: 24 puntos de alto más 10 por lado. */
  check('78) cada mitad dice quién es y si está puesta', /accessibilityState=\{\{ selected: puesta \}\}/.test(cabecera) && /aria-selected=\{puesta\}/.test(cabecera));
  check('79) y se alcanza con el dedo', /hitSlop=\{\{ top: 10, bottom: 10/.test(cabecera));
  /* Control: el ☰ sigue exactamente donde estaba y haciendo lo de siempre. */
  check('80) control: el Burger no se tocó',
    /accessibilityLabel=\{t\('home\.openMenu'\)\}/.test(cabecera) && /openMenu: 'Abrir menú'/.test(leer('i18n/textos/es/home.ts'))
    && /onPress=\{onMenuPress\}/.test(cabecera));
}

console.log('\n── K · La última pasada del Home ──');
{
  const puerta = leer('components/creator/ComposerEntry.tsx');
  const fila = leer('components/WeelsRow.tsx');
  const nativo = leer('screens/LandingScreen.tsx');

  /*
   * El compositor cerrado: manda el texto. La carita se comía el sitio de la
   * única frase que tiene que leerse entera, y en un teléfono de 375 puntos
   * "¿Qué quieres compartir?" se cortaba a media palabra.
   */
  check('81) en el Home no hay carita robando sitio', /!compact && variante !== 'home' && <Ionicons name="happy-outline"/.test(puerta));
  check('82) y la tarjeta es más baja', /composerHome: \{\s*paddingVertical: SPACING\.sm,/.test(puerta));
  /* Control: en los muros de sección la frase es corta y la carita sigue ahí. */
  check('83) control: la variante es opcional, así que quien no la pide no cambia', /variante\?: /.test(leer('components/creator/ComposerEntry.tsx')));

  /*
   * Un mismo sitio, un mismo nombre. La fila se llama Ẅells y es la única que
   * lo dice: el Home ya no lo repite en ningún selector.
   */
  check('84) la fila se llama Ẅells', /<Text style=\{\[styles\.title[^>]*>Ẅells<\/Text>/.test(fila));
  check('85) y el Home no lo repite en ningún selector', !/mitad\('weels'|etiqueta: 'Ẅells'|accessibilityRole="tab"/.test(nativo));
  /* Control: por dentro sigue diciendo weel/weels; no se migró ningún dato. */
  check('86) control: por dentro no cambió nada',
    /onOpenWeels/.test(fila) && /onCreateWeel/.test(fila) && /t\('weels\.create'\)/.test(fila));

  /* Accesos rápidos, no contenido principal: la tarjeta baja a 68×92. */
  const medida = (nombre) => {
    const m = new RegExp(nombre + ': \\{[^}]*width: scale\\((\\d+)\\),\\s*height: scale\\((\\d+)\\)').exec(fila);
    return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
  };
  const compacta = medida('cardCompacta');
  check('87) el Weël compacto encogió otra vez', !!compacta && compacta.w <= 68 && compacta.h <= 92,
    compacta ? `${compacta.w}×${compacta.h}` : 'sin medida');
  /*
   * Y "Crear Weël" deja de ser una tarjeta dorada maciza: pesaba más que los
   * Weëls de la gente, que es lo que la fila viene a enseñar.
   */
  check('88) "Crear Weël" ya no domina la fila', /\{!compacta && <LinearGradient/.test(fila));
  check('89) pero su "+" sigue siendo la acción', /compacta && \{ backgroundColor: theme\.colors\.accent \}/.test(fila));
}

console.log('\n── L · La transición Real ↔ Weë ──');
{
  const tema = leer('contexts/ThemeContext.tsx');
  const cabecera = leer('components/Header.tsx');

  /*
   * EL APAGÓN ERA UN TELÓN.
   *
   * El cambio de tema tapaba la aplicación entera con una lámina opaca —blanca
   * al ir a oscuro, `#0A0A0A` al volver— puesta de golpe a opacidad 1 y
   * desvanecida en 800 ms. Volver del Perfil Weë al Real ponía literalmente una
   * pantalla negra encima de todo durante casi un segundo.
   *
   * Estas comprobaciones existen para que no vuelva: ni láminas, ni colores
   * sólidos a pantalla completa, ni opacidades que escondan el contenido.
   */
  check('90) ya no hay láminas que tapen la aplicación', !/overlayBlack|overlayWhite|lightOverlay|darkOverlay/.test(tema));
  check('91) ni un solo color sólido a pantalla completa', !/absoluteFillObject/.test(tema) && !/backgroundColor: '#0A0A0A'/.test(tema.split('const styles')[1] || ''));
  check('92) ni un zIndex que se ponga por encima de todo', !/zIndex: 9999/.test(tema));

  /* La interfaz nunca desaparece: baja un punto y vuelve. */
  const minima = /const PRESENCIA_MINIMA = ([\d.]+);/.exec(tema);
  check('93) la aplicación sigue visible durante todo el cambio',
    !!minima && Number(minima[1]) >= 0.85 && Number(minima[1]) < 1,
    minima ? `baja al ${Math.round(Number(minima[1]) * 100)} %` : 'sin medida');

  /* Corta y natural: entre 200 y 300 ms, como se pidió. */
  const duracion = /const DURACION_CAMBIO_DE_TEMA = (\d+);/.exec(tema);
  check('94) dura entre 200 y 300 ms',
    !!duracion && Number(duracion[1]) >= 200 && Number(duracion[1]) <= 300,
    duracion ? `${duracion[1]} ms` : 'sin medida');
  check('95) y no hay rastro de los 800 ms de antes', !/duration: 800/.test(tema));

  /*
   * Control: una sola transición, sin ramas por dirección. El telón tenía dos
   * —una lámina blanca y otra negra según hacia dónde ibas— y era la rama negra
   * la que producía la pantalla negra. Con un solo camino, ir y volver se ven
   * exactamente igual y no existe un caso "de vuelta" que pueda apagarse.
   */
  const cambiar = /const setThemeMode = \(mode: ThemeMode\) => \{[\s\S]*?\n  \};/.exec(tema);
  check('96) control: ir y volver recorren el mismo camino',
    !!cambiar && !/targetDark|currentDark/.test(cambiar[0]) && /presencia\.setValue\(PRESENCIA_MINIMA\)/.test(cambiar[0]));
  /* Y solo se hunde si de verdad cambia algo: pedir el tema que ya tienes no parpadea. */
  check('97) pedir el tema que ya tienes no parpadea', /if \(mode !== themeMode\) presencia\.setValue/.test(tema));
  /* La recuperación va después del pintado, no dentro del manejador. */
  check('98) la vuelta al 100 % ocurre ya con el tema nuevo pintado', /useEffect\(\(\) => \{\s*Animated\.timing\(presencia[\s\S]*?\}, \[themeMode, presencia\]\);/.test(tema));

  /*
   * Un toque, un cambio. Dos toques seguidos en el mismo lado pedirían el mismo
   * destino dos veces y el segundo desharía el primero.
   */
  /*
   * Un toque, un cambio. Dos toques seguidos en el mismo lado pedirían el mismo
   * destino dos veces y el segundo desharía el primero. La comparación es
   * contra lo ÚLTIMO PEDIDO, no contra la identidad de verdad: durante la
   * transición esa todavía es la vieja, y comparar con ella se comía el
   * arrepentimiento —tocar Weë y volver a Real al instante se quedaba en Weë—.
   */
  check('99) un toque repetido no cambia dos veces', /const efectiva = identidadPedida\.current \?\? activeProfileType;/.test(cabecera));
  check('100) y arrepentirse al instante sigue funcionando',
    /identidadPedida = useRef<'real' \| 'hidi' \| null>/.test(cabecera)
    && !/if \(activeProfileType === destino\) return;/.test(cabecera));

  /*
   * ─── Y TAMBIÉN SE CAMBIA DESLIZANDO (fase 2E-79) ───────────────────────────
   *
   * A la píldora se le da al lado o se le empuja. El gesto se reclama por
   * movimiento, nunca al empezar el toque, y de ahí salen las tres garantías:
   * un toque no mueve el dedo y sigue siendo un toque; un gesto vertical no se
   * reclama y se queda para el scroll de debajo; y solo cuenta si el dedo
   * empezó sobre la píldora, porque un PanResponder solo ve lo que nace en su
   * vista.
   */
  /*
   * Con los toques CRUDOS, que es el mecanismo con el que ya funcionan en el
   * teléfono el gesto de volver del visor y el carrusel del Home. No con
   * `PanResponder`: su `onResponderGrant` pone `dx` a cero justo antes de
   * avisar, así que el sentido del gesto se leía siempre como "derecha" y,
   * estando en Real, pedir Real no hacía nada. Eso es lo que no funcionaba en
   * el aparato.
   */
  /*
   * EL DESLIZAMIENTO SE RECONOCE FUERA DE JAVASCRIPT, Y VA HACIA DONDE VA EL DEDO.
   *
   * Cinco intentos no funcionaron en el teléfono —`PanResponder`, toques crudos
   * en el contenedor, el contenedor como responder (que además rompió el toque
   * leyendo `locationX`), toques crudos en la mitad, y la negociación en
   * captura con `onPressMove`/`touchHistory`—, y todos compartían la misma
   * causa: el reconocimiento vivía en JS y dependía de que los eventos de
   * MOVIMIENTO llegaran a un manejador de JavaScript. En ese aparato no llegan.
   *
   * El sexto trajo a Gesture Handler, que reconoce en nativo, y ahí sí llegaba;
   * lo que fallaba entonces era medir el recorrido en `onStart`, donde vale
   * cero porque `activate()` reinicia la traslación. Y una vez arreglado eso,
   * quedó lo último: el MAPEO iba al revés que el control. La píldora es un
   * interruptor `[ Real ][ Weë ]` y el dedo tiene que ir HACIA la mitad que se
   * quiere, no al contrario.
   */
  const utilGesto = leer('utils/gestoHorizontal.ts');
  /* Sin notas: la cabecera cuenta su propia historia y nombra lo que ya no usa. */
  const sinNotas = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const codigo = sinNotas(cabecera) + sinNotas(utilGesto);
  const mitad = /<Pressable\s*\n\s*key=\{opcion\.id\}[\s\S]{0,2200}?<\/Pressable>/.exec(cabecera)?.[0] ?? '';
  check('102) cada mitad sigue siendo el mismo botón, con su toque de siempre',
    mitad.length > 0 && /onPress=\{\(\) => tocarMitad\(opcion\.id\)\}/.test(mitad)
    && /hitSlop=\{\{ top: 10, bottom: 10, left: 4, right: 4 \}\}/.test(mitad));
  check('102) y el deslizamiento lo reconoce Gesture Handler, envolviendo la píldora entera',
    /import \{ Gesture, GestureDetector \} from 'react-native-gesture-handler';/.test(cabecera)
    && /<GestureDetector gesture=\{gestoDeLaPildora\}>\s*\n\s*<View\s*\n\s*style=\{\[styles\.selector,/.test(cabecera)
    && /const gestoDeLaPildora = useMemo\(\(\) => Gesture\.Pan\(\)/.test(cabecera)
    /* En el hilo de JS: aquí no hay Reanimated, y el cambio de identidad es de React. */
    && /\.runOnJS\(true\)/.test(cabecera));
  check('102) control: ninguna de las cinco vías anteriores queda en pie',
    !/PanResponder|panHandlers|location[XY]|touchHistory|onPressMove|onTouch(Start|Move|End|Cancel)|ShouldSetResponder|onResponderMove/.test(codigo));
  check('102) control: Gesture Handler ya estaba en el proyecto; no se añade ninguna dependencia',
    /"react-native-gesture-handler":/.test(leer('package.json')) && /import 'react-native-gesture-handler';/.test(leer('index.ts')));
  check('102) control: las mitades siguen siendo Pressable, no TouchableOpacity',
    !/<TouchableOpacity[\s\S]{0,200}styles\.selectorSegmento/.test(cabecera) && /import \{[^}]*Pressable[^}]*\} from 'react-native'/.test(cabecera));
  check('103) el umbral son 18 puntos, y es el mismo para activar y para decidir',
    /const RECORRIDO_DEL_GESTO = 18;/.test(cabecera)
    && /\.activeOffsetX\(\[-RECORRIDO_DEL_GESTO, RECORRIDO_DEL_GESTO\]\)/.test(cabecera)
    && /maquinaDeLaPildora\(RECORRIDO_DEL_GESTO,/.test(cabecera));
  check('103) y se pide más recorrido a lo ancho que a lo alto',
    /if \(Math\.abs\(dx\) < recorridoMinimo\) return null;\s*if \(Math\.abs\(dx\) <= Math\.abs\(dy\)\) return null;/.test(utilGesto));
  /* Solo distancia: sin velocidad mínima, un deslizamiento lento vale igual que uno rápido. */
  check('103) el gesto no mira la velocidad: lento y rápido valen igual',
    !/minVelocity/.test(codigo) && /\.shouldCancelWhenOutside\(false\)/.test(cabecera));
  /*
   * EL DEDO VA HACIA LA MITAD QUE SE QUIERE. La píldora se pinta `[ Real ][ Weë ]`,
   * así que deslizar a la derecha pide Weë y a la izquierda pide Real. No es el
   * convenio de un carrusel —donde deslizar a la izquierda trae lo de la
   * derecha—, y confundirlos hacía que todo gesto pidiera la identidad que ya
   * estaba puesta y pareciera que el deslizamiento no funcionaba.
   */
  check('103) el dedo va hacia la mitad que se quiere: derecha → Weë, izquierda → Real',
    /const identidadDelGesto = \(direccion: DireccionDelGesto\) => \(direccion === 'izquierda' \? 'real' : 'hidi'\);/.test(cabecera)
    && /return dx < 0 \? 'izquierda' : 'derecha';/.test(utilGesto));
  /* Y el orden en pantalla es el que sostiene ese mapeo: Real a la izquierda, Weë a la derecha. */
  check('103) control: el orden pintado es Real y luego Weë',
    /\{ id: 'real' as const, etiqueta: 'Real', clave: 'menu\.realProfile' \},\s*\n\s*\{ id: 'hidi' as const, etiqueta: 'Weë', clave: 'menu\.weeProfile' \},/.test(cabecera)
    && /realProfile: 'Perfil Real'/.test(leer('i18n/textos/es/menu.ts'))
    && /weeProfile: 'Perfil Weë'/.test(leer('i18n/textos/es/menu.ts')));
  /*
   * EL RECORRIDO SE MIDE CONTRA UN ORIGEN PROPIO, no contra el `translationX`
   * de Gesture Handler. Al activarse, el reconocedor de Android llama a
   * `resetProgress()` y pone su traslación a cero desde el punto de activación,
   * así que en `onStart` vale ~0 y un umbral de 18 no se cumple jamás.
   */
  check('103) el recorrido se mide contra el origen apuntado al posar el dedo',
    /alEmpezarElGesto\(x: number, y: number\): void \{\s*origen = \{ x, y \};\s*deslizado = false;/.test(utilGesto)
    && /const recorrido = \{ dx: x - origen\.x, dy: y - origen\.y \};/.test(utilGesto)
    && /if \(!origen\) return null;/.test(utilGesto));
  /* Las notas de los dos archivos SÍ lo nombran, para explicar por qué no se usa. */
  check('103) control: ya no se decide con el translationX del reconocedor',
    !/translationX/.test(codigo) && /translationX/.test(cabecera + utilGesto));
  /* Una sola vez por gesto: el segundo aviso del mismo gesto sale por la primera línea. */
  check('103) decide una vez por gesto',
    /if \(deslizado\) return recorrido;/.test(utilGesto)
    && /deslizado = true;\s*alDeslizar\(direccion\);/.test(utilGesto));
  /*
   * Y el toque no deshace el gesto. En Android ni llega —al activarse, Gesture
   * Handler cancela los toques de React Native—, pero la máquina lo consume
   * igual: así la regla no depende de la plataforma.
   */
  check('103) tras un deslizamiento, el toque se consume y no deshace nada',
    /alTocar\(\): boolean \{\s*if \(deslizado\) \{\s*deslizado = false;\s*return false;\s*\}\s*return true;/.test(utilGesto)
    && /if \(maquina\.alTocar\(\)\) elegirIdentidad\(destino\);/.test(cabecera));
  /* Cada mitad sigue anunciándose como botón, con su estado. */
  check('103) las mitades siguen anunciándose y siendo pulsables',
    /accessibilityRole="button"/.test(mitad) && /accessibilityState=\{\{ selected: puesta \}\}/.test(mitad) && /aria-selected=\{puesta\}/.test(mitad));
  /*
   * SIN DESFASE: el gesto y el toque entran por la MISMA puerta, y esa puerta
   * cambia la única fuente de verdad. La píldora no guarda ningún estado suyo:
   * cada mitad se pinta leyendo `activeProfileType`, así que no puede ir por
   * detrás del contenido.
   */
  check('104) el gesto y el toque piden lo mismo por la misma puerta',
    /* Dos llamadas y solo dos: la del deslizamiento y la del toque. */
    (cabecera.match(/elegirIdentidad\(/g) || []).length === 2
    && /alDeslizar\.current = \(direccion\) => elegirIdentidad\(identidadDelGesto\(direccion\)\);/.test(cabecera)
    && /if \(maquina\.alTocar\(\)\) elegirIdentidad\(destino\);/.test(cabecera));
  check('104) y la píldora no tiene estado propio: lee la identidad de verdad',
    /const puesta = activeProfileType === opcion\.id;/.test(cabecera)
    && !/useState<'real' \| 'hidi'>/.test(cabecera));
  /*
   * El cambio se pide mientras el dedo se mueve, no al levantarlo. Y se escucha
   * en las TRES puertas que pueden traer movimiento —los avisos crudos, la
   * activación y las actualizaciones—, todas contra el mismo origen y con la
   * misma máquina detrás, que decide como mucho una vez.
   */
  check('104) el cambio ocurre mientras el dedo se mueve, por las tres puertas',
    /\.onTouchesMove\(\(evento\) => \{ const d = dedoDelGesto\(evento\); if \(d\) maquina\.alSeguirElDedo\(d\.absoluteX, d\.absoluteY\); \}\)/.test(cabecera)
    && /\.onStart\(\(evento\) => maquina\.alSeguirElDedo\(evento\.absoluteX, evento\.absoluteY\)\)/.test(cabecera)
    && /\.onUpdate\(\(evento\) => maquina\.alSeguirElDedo\(evento\.absoluteX, evento\.absoluteY\)\)/.test(cabecera));
  check('104) y el origen se apunta al posar el dedo, en las dos puertas de inicio',
    /\.onTouchesDown\(\(evento\) => \{ const d = dedoDelGesto\(evento\); if \(d\) maquina\.alEmpezarElGesto\(d\.absoluteX, d\.absoluteY\); \}\)/.test(cabecera)
    && /\.onBegin\(\(evento\) => maquina\.alEmpezarElGesto\(evento\.absoluteX, evento\.absoluteY\)\)/.test(cabecera));
  /* Y al terminar NO se decide nada: ahí es donde el toque tiene que poder mandar. */
  check('104) control: al terminar el gesto no se decide nada',
    !/\.onEnd\(/.test(cabecera) && !/\.onFinalize\(/.test(cabecera));
  /*
   * Y NO QUEDA NADA DEL DIAGNÓSTICO. Hizo falta para encontrar todo esto —el
   * rastro en pantalla, los registros de cada etapa, las coordenadas en
   * crudo—, y se fue entero con él: ni franja, ni registros, ni estado propio.
   */
  check('105) control: no queda ni rastro de la instrumentación temporal',
    !/WEE_GESTURE_DEBUG|console\.log|__DEV__|diagnostico|Diagnostico|rastro|lineaDe|registrarCoordenadas|fisicaDe|conSigno/.test(cabecera)
    && !/TOUCHES_DOWN|TOUCHES_MOVE|STATE_BEFORE|STATE_AFTER|CHANGE_REQUEST|THRESHOLD|COORDS/.test(cabecera)
    && !/useState/.test(cabecera) && !/console\./.test(utilGesto));
  /*
   * Control: esto es SOLO el selector del encabezado. Ni el Home ni sus
   * pantallas recuperan un pager, y el gesto no vive en ninguna de las dos.
   */
  check('105) control: no vuelve ningún pager al Home',
    !/PanResponder|panHandlers|onTouchStart/.test(leer('screens/LandingScreen.tsx'))
    && !/PanResponder|panHandlers|onTouchStart/.test(leer('screens/WebLandingScreen.tsx')));
}

console.log('\n── M2 · El gesto de la píldora, recorrido de verdad ──');
{
  /*
   * ESTO NO SE LEE: SE EJECUTA.
   *
   * La versión anterior del gesto pasaba todas las pruebas de código y no
   * funcionaba en el teléfono, porque el fallo no estaba en lo que decidía sino
   * en el número con el que decidía: `PanResponder` pone `dx` a cero justo
   * antes de avisar. Aquí se recorre el gesto con coordenadas de verdad y se
   * mira el resultado, que es lo único que habría cazado aquello.
   */
  const gesto = await import(aModulo(transpilar('utils/gestoHorizontal.ts')));
  const { direccionDelGesto, maquinaDeLaPildora } = gesto;
  const MINIMO = 18;

  /*
   * D1–D4) LA REGLA, con el recorrido tal y como lo entrega Gesture Handler:
   * `translationX` y `translationY`, lo que el dedo lleva andado desde que se
   * posó. No hay puntos de pantalla ni estado: dos números y una decisión.
   */
  /* La regla solo dice el SENTIDO; qué identidad pide cada sentido se decide en el Header. */
  check('D1) un recorrido negativo es izquierda —la mitad de Real—', direccionDelGesto(-30, 2, MINIMO) === 'izquierda');
  check('D1) y uno positivo es derecha —la mitad de Weë—', direccionDelGesto(30, -2, MINIMO) === 'derecha');
  /* Justo en el mínimo cuenta; un punto menos, no. Sin sorpresas en el borde. */
  check('D2) el mínimo es el mínimo, y por debajo no cuenta',
    direccionDelGesto(-18, 0, MINIMO) === 'izquierda' && direccionDelGesto(-17, 0, MINIMO) === null);
  check('D2) un toque quieto no es un gesto', direccionDelGesto(0, 0, MINIMO) === null);
  check('D2) ni un temblor de dos puntos', direccionDelGesto(-2, 1, MINIMO) === null);
  /* Vertical: se descarta aunque recorra mucho. */
  check('D3) un arrastre vertical no cambia de identidad', direccionDelGesto(5, 100, MINIMO) === null);
  check('D3) ni uno en diagonal con más alto que ancho', direccionDelGesto(-40, 100, MINIMO) === null);
  check('D3) pero uno en diagonal más ancho que alto sí', direccionDelGesto(-60, 30, MINIMO) === 'izquierda');
  /* Y el empate no cuenta: se pide MÁS ancho que alto, no igual. */
  check('D4) un empate exacto no es un gesto de lado', direccionDelGesto(-40, 40, MINIMO) === null);
  check('D4) el sentido lo da el recorrido, no por dónde pasó el dedo',
    direccionDelGesto(-40, 0, MINIMO) === 'izquierda' && direccionDelGesto(40, 0, MINIMO) === 'derecha');

  /*
   * D5–D7) LA PÍLDORA ENTERA, EJECUTADA, con Gesture Handler alrededor.
   *
   * Se reproduce cómo llega cada gesto a la máquina:
   *
   *  · un TOQUE: el dedo se posa (`onBegin`) y se levanta; el gesto nunca se
   *    activa porque no recorre los 18 puntos, así que el `Pressable` dispara
   *    su `onPress`;
   *  · un DESLIZAMIENTO: `onBegin`, y al cruzar el umbral Gesture Handler
   *    activa el gesto (`onStart`) con lo recorrido. En Android, al activarse,
   *    cancela los toques de React Native y el `onPress` NO llega; se recorren
   *    los dos casos —cancelado y llegando igual— porque la máquina tiene que
   *    dar el mismo resultado en los dos, y el segundo es el exigente;
   *  · un ARRASTRE VERTICAL: `onBegin` y nada más, porque solo se mira lo
   *    ancho; si el dedo se va lejos, el botón pierde su toque, y si apenas se
   *    mueve, es un toque de verdad.
   */
  const pildora = () => {
    let activa = 'real'; const cambios = [];
    const elegirIdentidad = (destino) => { if (destino === activa) return; activa = destino; cambios.push(destino); };
    /* El dedo va HACIA la mitad que se quiere: `[ Real ][ Weë ]`. */
    const identidadDelGesto = (d) => (d === 'izquierda' ? 'real' : 'hidi');
    const maquina = maquinaDeLaPildora(MINIMO, (d) => elegirIdentidad(identidadDelGesto(d)));
    /* Lo que hace `Header.tsx` en el `onPress` de cada mitad, tal cual. */
    const tocarMitad = (destino) => { if (maquina.alTocar()) elegirIdentidad(destino); };
    /* El dedo se posa aquí; los avisos traen su posición absoluta, como en el aparato. */
    const O = { x: 200, y: 40 };
    return {
      cambios,
      activa: () => activa,
      tap: (mitadTocada) => { maquina.alEmpezarElGesto(O.x, O.y); tocarMitad(mitadTocada); },
      /*
       * Un deslizamiento como llega de verdad: el dedo se posa y luego avisa
       * VARIAS veces con el recorrido creciendo. El primer aviso reproduce el
       * `onStart` real, que llega con recorrido casi nulo porque el reconocedor
       * reinicia su traslación al activarse: si eso volviera a decidir el
       * gesto, aquí no se decidiría nada.
       */
      swipe: (mitadTocada, dx, dy, { toqueDeCortesia = false, pasos = 4 } = {}) => {
        maquina.alEmpezarElGesto(O.x, O.y);
        maquina.alSeguirElDedo(O.x, O.y);
        for (let i = 1; i <= pasos; i += 1) {
          maquina.alSeguirElDedo(O.x + (dx * i) / pasos, O.y + (dy * i) / pasos);
        }
        if (toqueDeCortesia) tocarMitad(mitadTocada);
      },
      arrastreSinActivar: (mitadTocada, { conToque }) => {
        maquina.alEmpezarElGesto(O.x, O.y);
        if (conToque) tocarMitad(mitadTocada);
      },
    };
  };
  /* El toque de cortesía es el caso exigente: si se colara, se vería como un cambio de más. */
  for (const toqueDeCortesia of [false, true]) {
    const modo = toqueDeCortesia ? 'y aunque el toque llegue igual' : 'con el toque cancelado, como en Android';
    const p = pildora();
    const desde = (n) => p.cambios.slice(n).join(',') || 'nada';
    let n = 0;
    p.tap('hidi');
    check(`D5) tocar Weë → Weë (${modo})`, p.activa() === 'hidi' && p.cambios.length === n + 1, desde(n));
    n = p.cambios.length; p.tap('real');
    check(`D5) tocar Real → Real (${modo})`, p.activa() === 'real' && p.cambios.length === n + 1, desde(n));
    /* PRUEBA A: desde Real, el dedo va a la DERECHA, hacia Weë. Acaba sobre Weë. */
    n = p.cambios.length; p.swipe('hidi', 30, 2, { toqueDeCortesia });
    check(`D6) desde Real, deslizar hacia Weë (derecha) → Weë (${modo})`, p.activa() === 'hidi' && p.cambios.length === n + 1, desde(n));
    /* PRUEBA B: desde Weë, el dedo va a la IZQUIERDA, hacia Real. Acaba sobre Real. */
    n = p.cambios.length; p.swipe('real', -30, -1, { toqueDeCortesia });
    check(`D6) desde Weë, deslizar hacia Real (izquierda) → Real (${modo})`, p.activa() === 'real' && p.cambios.length === n + 1, desde(n));
    /* Manda el SENTIDO del dedo, no la mitad donde se suelta: aquí se suelta sobre la contraria. */
    n = p.cambios.length; p.swipe('real', 40, 0, { toqueDeCortesia });
    check(`D6) deslizar hacia Weë soltando sobre Real → Weë (${modo})`, p.activa() === 'hidi' && p.cambios.length === n + 1, desde(n));
    n = p.cambios.length; p.swipe('hidi', -40, 0, { toqueDeCortesia });
    check(`D6) deslizar hacia Real soltando sobre Weë → Real (${modo})`, p.activa() === 'real' && p.cambios.length === n + 1, desde(n));
    /* Un deslizamiento largo o corto da lo mismo: solo cuenta el sentido, y una sola vez. */
    n = p.cambios.length; p.swipe('hidi', 300, 12, { toqueDeCortesia });
    check(`D6) un deslizamiento largo cambia una sola vez (${modo})`, p.activa() === 'hidi' && p.cambios.length === n + 1, desde(n));
    /* Repetidos, uno detrás de otro: alternan sin quedarse pegados. */
    n = p.cambios.length;
    p.swipe('real', -25, 0, { toqueDeCortesia }); p.swipe('hidi', 25, 0, { toqueDeCortesia });
    p.swipe('real', -25, 0, { toqueDeCortesia }); p.swipe('hidi', 25, 0, { toqueDeCortesia });
    check(`D6) deslizamientos repetidos alternan (${modo})`, desde(n) === 'real,hidi,real,hidi', desde(n));
    /* Y después de todo eso, un toque sigue siendo un toque. */
    n = p.cambios.length; p.tap('real');
    check(`D7) después de deslizar, un toque sigue siendo un toque (${modo})`, p.activa() === 'real' && p.cambios.length === n + 1, desde(n));
    /*
     * Vertical: el gesto no se activa. Si el dedo se fue lejos, el botón perdió
     * su toque y no pasa nada; si apenas se movió, es un toque de verdad y hace
     * lo que hace un toque.
     */
    n = p.cambios.length; p.arrastreSinActivar('hidi', { conToque: false });
    check(`D7) un arrastre vertical no cambia el perfil (${modo})`, p.activa() === 'real' && p.cambios.length === n, desde(n));
    n = p.cambios.length; p.arrastreSinActivar('hidi', { conToque: true });
    check(`D7) y un temblor vertical mínimo sigue siendo el toque de esa mitad (${modo})`, p.activa() === 'hidi' && p.cambios.length === n + 1, desde(n));
    /*
     * Diagonal con más alto que ancho: el gesto se activa pero la regla lo
     * descarta, así que NO hay deslizamiento. Con el toque cancelado —Android—
     * no pasa nada; si el toque llegara, es un toque de la mitad y nada más.
     */
    p.tap('real');
    n = p.cambios.length; p.swipe('hidi', -40, 100, { toqueDeCortesia });
    check(`D7) una diagonal más alta que ancha no se toma como deslizamiento (${modo})`,
      toqueDeCortesia
        ? (p.activa() === 'hidi' && p.cambios.length === n + 1)
        : (p.activa() === 'real' && p.cambios.length === n), desde(n));
  }

}

console.log('\n── M · La marca en el centro del Home ──');
{
  const cabecera = leer('components/Header.tsx');
  const nativo = leer('screens/LandingScreen.tsx');
  const web = leer('screens/WebLandingScreen.tsx');

  /* El lema, letra por letra: sin emojis, sin comillas y sin punto final. */
  const lema = /const LEMA_DE_MARCA = '([^']*)';/.exec(cabecera);
  check('102) el lema dice exactamente lo que tiene que decir',
    !!lema && lema[1] === 'Imagina · Crea · Conecta',
    lema ? lema[1] : 'no encontrado');

  /*
   * CENTRADO DE VERDAD.
   *
   * El logo no comparte fila con los controles: vive en su propio bloque a todo
   * lo ancho. Es lo único que garantiza que su centro sea el de la pantalla —si
   * compartiera línea quedaría centrado en el hueco que le dejan el ☰ y el
   * selector, y ese hueco cambia de ancho—. Medido en el navegador: 187 frente a
   * un centro de 187,5 en 375 puntos, con y sin el selector a la vista.
   */
  check('103) la marca va en su propia fila, centrada', /marca: \{[\s\S]{0,40}alignItems: 'center',/.test(cabecera));
  check('104) fuera de la fila de los controles', /<\/View>\s*\{\/\*[\s\S]*?\*\/\}\s*\{conMarca && \(\s*<View style=\{\[styles\.marca/.test(cabecera));

  /*
   * ─── Y LOS TRES, EN LA MISMA BANDA ──────────────────────────────────────
   *
   * El bloque de la marca mide el encabezado; los controles se ponen ENCIMA,
   * estirados de borde a borde y centrados en esa misma banda. Así el ☰ y el
   * selector quedan a la altura de la marca —una sola línea visual— sin dejar
   * de estar el logo centrado respecto a la PANTALLA: nadie le roba sitio,
   * porque los controles ya no ocupan fila propia.
   *
   * Medido en el navegador a 375: ☰ y campana en y=34, el bloque de la marca
   * de 11 a 58 —centro 34,5— y el logo en x=187 frente a un centro de 187,5.
   */
  check('104b) los controles se estiran sobre la marca',
    /contentConMarca: \{\s*position: 'absolute',\s*top: 0,\s*left: 0,\s*right: 0,\s*height: LINEA_DEL_LOGO,/.test(cabecera));
  check('104b) y se dibujan por encima, no por debajo', /contentConMarca: \{[\s\S]{0,220}zIndex: 1,/.test(cabecera));
  check('104b) la marca deja el mismo aire arriba y abajo', /marca: \{[\s\S]{0,140}paddingVertical: AIRE_DE_LA_MARCA,/.test(cabecera));
  /*
   * Y se ciñen a la LÍNEA DEL LOGO, no a la banda entera: sobre la banda
   * quedarían centrados entre el logo y el lema, un pelo por debajo del logo.
   * Con el alto de su línea, el centro de la píldora y el del logo coinciden.
   * Medido en el navegador a 375: logo, ☰, campana y píldora, todos en y=27.
   */
  /*
   * Y TODO ELLO DENTRO DEL ÁREA SEGURA.
   *
   * El hueco de la barra de estado es `paddingTop` del CONTENEDOR. A una capa
   * absoluta con `top: 0` no se le puede confiar que lo respete —Yoga y CSS no
   * tratan igual el relleno del padre—, y en el teléfono los controles salían
   * pegados a la hora y a la batería mientras el logo sí bajaba. La banda
   * arregla el origen: `top: 0` pasa a ser su borde, y la banda empieza donde
   * acaba el hueco del sistema.
   *
   * Comprobado en el navegador metiéndole 44 px de hueco al contenedor: el
   * logo, el ☰ y la campana bajaron los 44 y siguieron los tres en la misma
   * línea (25 → 69).
   */
  /* Y sin trucos: ni desplazamientos negativos ni translate en las tres capas del encabezado. */
  const capasDelEncabezado = ['container: {', 'banda: {', 'contentConMarca: {', 'marca: {']
    .map((k) => cabecera.slice(cabecera.indexOf(k), cabecera.indexOf('},', cabecera.indexOf(k))))
    .join('\n');
  check('104b) el hueco del sistema lo pone el contenedor, no la capa',
    /paddingTop: insets\.top,/.test(cabecera) && /const insets = useSafeAreaInsets\(\);/.test(cabecera)
      && !/top: -|translateY|marginTop: -/.test(capasDelEncabezado), capasDelEncabezado.match(/top: -[^,]*|translateY[^,]*/g)?.join(' · ') || '');
  check('104b) y la capa se mide desde dentro del área segura, no desde la pantalla',
    /<View style=\{conMarca \? styles\.banda : undefined\}>\s*<View style=\{\[styles\.content, conMarca && styles\.contentConMarca\]\}/.test(cabecera)
      && /banda: \{\s*position: 'relative',\s*\}/.test(cabecera));

  check('104b) a la altura del logo, no del bloque entero',
    /const LINEA_DEL_LOGO = scale\(55\);/.test(cabecera) && /const ALTO_DEL_LOGO = scale\(36\);/.test(cabecera)
      && /const AIRE_DE_LA_MARCA = \(LINEA_DEL_LOGO - ALTO_DEL_LOGO\) \/ 2;/.test(cabecera)
      && /weeLogo: \{\s*height: ALTO_DEL_LOGO,/.test(cabecera));
  /*
   * `box-none` en las dos capas: la de arriba no tapa el logo y la de la marca
   * no se come los toques del ☰ ni del selector. Sin esto, la capa que quede
   * encima dejaría muerta a la otra.
   */
  check('104b) el dedo llega a las dos capas', (cabecera.match(/pointerEvents="box-none"/g) || []).length === 2);
  /* Control: fuera del Home la fila sigue siendo una fila normal, con su alto. */
  check('104b) control: sin marca, el encabezado no se estira sobre nada', /content: \{\s*flexDirection: 'row',[\s\S]{0,200}paddingVertical: SPACING\.md,/.test(cabecera) && !/content: \{[\s\S]{0,200}position: 'absolute'/.test(cabecera));

  /*
   * Un solo logo. El de la fila y el del centro son excluyentes: `!conMarca` y
   * `conMarca`. Si los dos pudieran salir a la vez habría dos logos.
   */
  check('105) el logo no se duplica', /\{!conMarca && \(/.test(cabecera) && /\{conMarca && \(/.test(cabecera));
  check('106) y hace lo de siempre al tocarlo', (cabecera.match(/onPress=\{handleLogoPress\}/g) || []).length === 2);

  /*
   * ─── Y TODO CABE EN EL TELÉFONO ─────────────────────────────────────────
   *
   * Con el selector de identidad puesto, el logo y la píldora Real/Weë se
   * rozaban en 375. La banda entera encogió un punto —logo, lema, píldora,
   * campana y márgenes— y, sobre todo, la marca ya no puede crecer más allá del
   * hueco que le dejan los controles: se le pone un ancho máximo que sale de
   * restar al ancho de la pantalla DOS veces el lado ancho (el logo va centrado
   * respecto a la pantalla, así que el sobrante de la izquierda no cuenta).
   *
   * Calculado en puntos nativos, con el selector a la vista: en 320 la píldora
   * empieza en 196 y la marca acaba en 194; en 375, 251 contra 248; en 430, 306
   * contra 275. Nunca se tocan, y en ningún ancho hay un punto de ruptura: es
   * una resta con el ancho real.
   */
  /* 126 → 90 al irse la campana: ese sitio se le devuelve a la marca. */
  check('106b) la marca no puede meterse debajo de los controles',
    /const ANCHO_CON_SELECTOR = scale\(90\);/.test(cabecera) && /const ANCHO_SIN_SELECTOR = scale\(52\);/.test(cabecera)
      && /anchoDePantalla - \(conSelectorDeIdentidad \? ANCHO_CON_SELECTOR : ANCHO_SIN_SELECTOR\) \* 2/.test(cabecera)
      && /<View style=\{\[styles\.marca, \{ maxWidth: anchoDeLaMarca \}\]\}/.test(cabecera));
  check('106b) y el hueco se recalcula con el ancho de verdad, no con un breakpoint',
    /useWindowDimensions\(\)/.test(cabecera) && !/Dimensions\.get/.test(cabecera));
  check('106b) reserva menos sitio cuando no hay selector que esquivar',
    /const conSelectorDeIdentidad = !!user && \(hasWeeProfile \|\| activeProfileType === 'biz'\);/.test(cabecera));
  /* Ceñirse no puede descentrar el logo: la marca se centra ella sola. */
  check('106b) y ceñirse no la descentra', /marca: \{\s*alignSelf: 'center',\s*alignItems: 'center',/.test(cabecera));
  /* Todo un punto más pequeño, en proporción: logo, píldora, campana y márgenes. */
  check('106c) el logo encoge y puede ceñirse sin deformarse',
    /weeLogo: \{\s*height: ALTO_DEL_LOGO,\s*width: scale\(102\),\s*maxWidth: '100%',/.test(cabecera) && /const ALTO_DEL_LOGO = scale\(36\);/.test(cabecera) && /contentFit="contain"/.test(cabecera));
  /*
   * La caja va SIEMPRE más holgada de ancho que de alto: la proporción del logo
   * es 101/36 ≈ 2,81, así que con una caja más ancha que eso manda el alto y el
   * dibujo crece de verdad. Si la caja se quedara corta de ancho, subir el alto
   * no se notaría —el dibujo se frenaría por el otro lado—.
   */
  check('106c) y la caja deja crecer al dibujo: manda el alto, no el ancho',
    (() => { const alto = Number(cabecera.match(/const ALTO_DEL_LOGO = scale\((\d+)\);/)?.[1]); const ancho = Number(cabecera.match(/weeLogo: \{\s*height: ALTO_DEL_LOGO,\s*width: scale\((\d+)\)/)?.[1]); return !!alto && !!ancho && ancho / alto > 101 / 36; })());
  /*
   * Y el logo puede crecer sin mover a nadie: lo que se le suma de alto se le
   * resta al aire, así que la línea del logo mide lo mismo y los controles no
   * se enteran. Medido a 375 y a 430: logo, ☰ y campana siguen en y=25.
   */
  /*
   * Crecer no mueve la banda, y ahora por construcción: la línea del logo es la
   * medida FIJA —de ella cuelga la alineación de todo el encabezado— y el aire
   * es lo que sobra alrededor del logo. Subir el logo le quita aire; no le suma
   * alto a la banda ni baja su centro.
   */
  check('106c) crecer no mueve la banda: la línea es fija y el aire se reparte',
    /const LINEA_DEL_LOGO = scale\(55\);/.test(cabecera)
      && /const AIRE_DE_LA_MARCA = \(LINEA_DEL_LOGO - ALTO_DEL_LOGO\) \/ 2;/.test(cabecera)
      && /height: LINEA_DEL_LOGO,/.test(cabecera) && /paddingVertical: AIRE_DE_LA_MARCA,/.test(cabecera));
  /* Y el logo nunca puede ser más alto que su línea: se comprueba con los números. */
  check('106c) el logo cabe en su línea, con aire a los dos lados',
    (() => { const linea = Number(cabecera.match(/const LINEA_DEL_LOGO = scale\((\d+)\);/)?.[1]); const alto = Number(cabecera.match(/const ALTO_DEL_LOGO = scale\((\d+)\);/)?.[1]); return !!linea && !!alto && alto < linea && (linea - alto) / 2 >= 8; })());
  check('106c) la píldora encoge sin perder sus dos mitades',
    /selectorSegmento: \{\s*minWidth: scale\(36\),\s*paddingHorizontal: SPACING\.xs,/.test(cabecera) && /etiqueta: 'Real'[\s\S]{0,120}etiqueta: 'Weë'/.test(cabecera));
  /*
   * La campana ya no está aquí: bajó a la barra inferior (fase 2E-77). Lo que
   * queda a la derecha con sesión es SOLO el selector de identidad, y sin
   * sesión el botón de entrar. Ni icono, ni contador, ni el hueco de ninguno.
   */
  check('106c) la campana ya no está en el encabezado',
    !/notifications/i.test(cabecera) && !/unreadCount/.test(cabecera) && !/onNotificationsPress/.test(cabecera));
  check('106c) y con ella se fue su contador, sin tocar el servicio',
    !/notificationService/.test(cabecera) && /subscribeToUnreadCount/.test(leer('services/notificationService.ts')));
  check('106c) los márgenes de la fila también', /content: \{[\s\S]{0,160}paddingHorizontal: SPACING\.md,/.test(cabecera) && /marca: \{[\s\S]{0,160}paddingHorizontal: SPACING\.md,/.test(cabecera));
  /* Control: el lema sigue entero. No se corta ni se esconde en ningún ancho. */
  check('106c) control: el lema sigue completo', /\{LEMA_DE_MARCA\}/.test(cabecera) && !/conMarca && ancho|ocultarLema|width < /.test(cabecera));

  /* El lema acompaña: pequeño, peso normal y gris del tema. Nunca el color del texto. */
  check('107) el lema es discreto', /lema: \{\s*fontSize: scale\(10\),\s*fontWeight: FONT_WEIGHT\.regular,/.test(cabecera));
  check('108) y gris, no oscuro', /transparent \? 'rgba\(255,255,255,0\.65\)' : theme\.colors\.textSecondary/.test(cabecera));

  /*
   * Solo lo pide el Home, y una vez por pantalla. Hubo un tiempo en que el
   * Home nativo montaba DOS encabezados —el normal y uno transparente para
   * los Weëls a pantalla completa—; desde que Ẅells es una página más de la
   * portada, con su fondo, esa segunda capa se fue. Un solo encabezado.
   */
  check('109) las dos pantallas del Home la piden, una vez cada una',
    (nativo.match(/conMarca \/>/g) || []).length === 1
    && (web.match(/conMarca \/>/g) || []).length === 1
    && !/transparent conMarca/.test(nativo));
  /*
   * Control: las otras pantallas que usan este mismo encabezado —Notificaciones,
   * WeeTalk y HomeScreen— NO la piden, así que siguen con el logo a la izquierda
   * junto al ☰. Si esto fallara, el cambio se habría colado fuera del Home.
   */
  const fuera = ['screens/NotificationsScreen.tsx', 'screens/InboxScreen.tsx', 'screens/HomeScreen.tsx']
    .filter((p) => /conMarca/.test(leer(p)));
  check('110) control: fuera del Home el encabezado no cambia', fuera.length === 0, fuera.join(', ') || 'ninguna la pide');

  /*
   * Control: el selector y el ☰ siguen en la fila de arriba, que es la razón por
   * la que no pueden correr el logo.
   */
  check('111) control: los controles siguen en su fila, encima de la marca',
    /<View style=\{\[styles\.content, conMarca && styles\.contentConMarca\]\}[^>]*>[\s\S]*?accessibilityLabel=\{t\('home\.openMenu'\)\}/.test(cabecera)
      && /<View style=\{\[styles\.content, conMarca && styles\.contentConMarca\]\}[^>]*>[\s\S]*?styles\.selector,/.test(cabecera));
}

console.log('\n── N · Inter, la tipografía de Weë ──');
{
  const tipografia = leer('constants/typography.ts');
  const aplicador = leer('utils/aplicarInter.ts');
  const app = leer('App.tsx');
  const paquete = JSON.parse(leer('package.json'));

  /* La fuente está de verdad, con sus cuatro pesos y ninguno más. */
  check('111) Inter es una dependencia del proyecto', !!paquete.dependencies['@expo-google-fonts/inter']);
  check('112) y expo-font también, para poder cargarla', !!paquete.dependencies['expo-font']);
  const caras = ['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold'];
  check('113) se cargan las cuatro caras', caras.every((c) => new RegExp(c).test(app)));
  /*
   * Control: SOLO esas cuatro. La familia trae dieciocho pesos y sus cursivas;
   * meterlas todas serían megabytes que nadie usa y una primera carga más lenta.
   */
  const pedidas = (app.match(/Inter_\d{3}\w+/g) || []).filter((c) => !caras.includes(c));
  check('114) control: y ninguna más', pedidas.length === 0, pedidas.join(', ') || 'solo las cuatro');

  /*
   * NADA SE PINTA ANTES DE QUE LA FUENTE ESTÉ.
   *
   * Si se pintara y luego llegara Inter, se vería el cambio de fuente a medio
   * arranque, que es justo lo que no puede pasar.
   */
  check('115) no se pinta nada hasta que la fuente está', /if \(!fuentesListas && !errorDeFuentes\) \{/.test(app));
  /*
   * Control: y si la carga falla, se sigue adelante. Quedarse en el hueco para
   * siempre por una fuente sería cambiar la tipografía por una app que no abre.
   */
  check('116) control: un fallo de fuente no deja la app colgada', /&& !errorDeFuentes/.test(app));
  /* Instalado al evaluar el módulo, no en un efecto: el primer render ya lleva Inter. */
  check('117) Inter queda puesta antes del primer render', /^aplicarInter\(\);$/m.test(app));

  /*
   * EL PESO SE TRADUCE A UNA CARA. En React Native cada peso es una fuente
   * distinta: pedir "Inter" en negrita sin decir cuál es la negrita da una
   * negrita falsa calculada por el sistema, distinta en cada teléfono.
   */
  check('118) cada peso tiene su cara', /familiaDelPeso/.test(tipografia) && /'500':\s*\n?\s*return INTER\.medium/.test(tipografia.replace(/\r/g, '')));
  check('119) y se aplica a Text y a TextInput', /envolver\(Text\)/.test(aplicador) && /envolver\(TextInput\)/.test(aplicador));
  /*
   * Control: quien ya trae familia propia se respeta. Hay dos sitios que piden
   * monoespaciada a conciencia —el prompt de "Cómo lo hice" y la pantalla de
   * error— y una tipografía única no es excusa para pisarlos.
   */
  check('120) control: quien pide otra fuente la conserva', /if \(plano\.fontFamily\) return null;/.test(tipografia));
  check('121) y esos dos sitios siguen en monoespaciada',
    /fontFamily: 'monospace'/.test(leer('components/ErrorBoundary.tsx')) && /monospace/.test(leer('components/HowIMadeIt.tsx')));

  /*
   * La navegación escribe con su propia fuente si no se le dice otra cosa: las
   * etiquetas de la barra inferior salían en la fuente del sistema con el resto
   * del Home ya en Inter. Se comprobó en el DOM.
   */
  check('122) la navegación también escribe en Inter', /fonts: FUENTES_WEE/.test(app) && /regular: \{ fontFamily: INTER\.regular/.test(app));
}

console.log('\n── Ñ · La escala de pesos de Weë ──');
{
  const peso = (archivo, estilo) => {
    const m = new RegExp('\\b' + estilo + ':\\s*\\{[^}]*?fontWeight:\\s*FONT_WEIGHT\\.(\\w+)').exec(leer(archivo));
    return m ? m[1] : null;
  };

  /* 700 solo para el título del bloque de bienvenida. */
  check('123) el saludo es el énfasis fuerte del Home', peso('components/HomeGreeting.tsx', 'saludo') === 'bold');
  /* 600: nombres, navegación activa y datos importantes. */
  check('124) los nombres van en 600', peso('components/PostCard.tsx', 'username') === 'semibold');
  /*
   * La única navegación con estado "puesto" que queda en el Home es el selector
   * Real/Weë del encabezado (la píldora Ẅall/Ẅells y los filtros se fueron).
   * Su peso va en línea, no en un estilo con nombre, así que se lee directo.
   */
  check('125) la navegación activa, en 600',
    /fontWeight: puesta \? FONT_WEIGHT\.semibold : FONT_WEIGHT\.medium/.test(leer('components/Header.tsx')));
  check('126) los contadores y el saldo, en 600',
    peso('components/PostCard.tsx', 'actionText') === 'semibold' && peso('components/DrawerMenu.tsx', 'creditsBadgeText') === 'semibold' && peso('components/CreditsPill.tsx', 'value') === 'semibold');
  /* 500: acciones y controles. */
  check('127) los botones, en 500',
    peso('components/creator/ComposerEntry.tsx', 'publishText') === 'medium' && peso('components/Header.tsx', 'loginButtonText') === 'medium' && peso('screens/WebLandingScreen.tsx', 'emptyButtonText') === 'medium');
  check('128) los filtros en reposo y "Ver todos", en 500',
    peso('screens/LandingScreen.tsx', 'feedFilterText') === 'medium' && peso('components/WeelsRow.tsx', 'viewAll') === 'medium');
  /* 400: lectura normal. */
  check('129) el menú se lee en 400',
    peso('components/DrawerMenu.tsx', 'rowText') === 'regular' && peso('components/Sidebar.tsx', 'itemLabel') === 'regular');
  check('130) y el texto secundario también', peso('components/PostCard.tsx', 'timestamp') === 'regular');

  /*
   * Control: 700 es la excepción, no la norma. En todo el Home y en los
   * componentes que reutiliza queda UN solo texto en 700 —el saludo—; los
   * pocos que restan son marcas sobre imagen, donde el peso es legibilidad.
   */
  const textosDelHome = [
    ['components/HomeGreeting.tsx', 'saludo'],
    ['components/creator/ComposerEntry.tsx', 'composerPlaceholder'],
    ['components/creator/ComposerEntry.tsx', 'publishText'],
    ['components/WeelsRow.tsx', 'title'],
    ['components/WeelsRow.tsx', 'viewAll'],
    ['components/WeelsRow.tsx', 'createText'],
    ['screens/LandingScreen.tsx', 'tabItemText'],
    ['screens/LandingScreen.tsx', 'tabItemTextActive'],
    ['screens/LandingScreen.tsx', 'feedFilterText'],
    ['screens/LandingScreen.tsx', 'feedFilterTextActive'],
    ['components/PostCard.tsx', 'username'],
    ['components/PostCard.tsx', 'timestamp'],
    ['components/PostCard.tsx', 'actionText'],
    ['components/Header.tsx', 'lema'],
    ['components/Header.tsx', 'loginButtonText'],
  ];
  const fuertes = textosDelHome.filter(([a, e]) => peso(a, e) === 'bold').map(([, e]) => e);
  check('131) control: 700 se usa con cuentagotas', fuertes.length === 1 && fuertes[0] === 'saludo',
    fuertes.join(' · ') || 'ninguno');
}

console.log('\n── O · La navegación inferior, una sola para todo Weë ──');
{
  const barra = leer('components/BarraInferior.tsx');
  const global = leer('navigation/NavegacionGlobal.tsx');
  const pila = leer('navigation/MainStackNavigator.tsx');
  const pestanas = leer('navigation/TabNavigator.tsx');

  /* Cinco destinos, los de siempre, en el mismo orden. */
  const ids = [...barra.matchAll(/\{ id: '(\w+)', etiqueta: '([^']+)'/g)].map((m) => [m[1], m[2]]);
  check('132) son exactamente cinco destinos', ids.length === 5, ids.map(([, e]) => e).join(' · '));
  /*
   * El quinto dejó de ser Perfil y pasó a ser Notificaciones (fase 2E-77): la
   * campana estaba en el encabezado y bajó aquí.
   */
  check('133) con las rutas de siempre',
    JSON.stringify(ids.map(([i]) => i)) === JSON.stringify(['Home', 'Search', 'Create', 'Inbox', 'Notifications']));
  check('134) y los nombres de siempre',
    JSON.stringify(ids.map(([, e]) => e)) === JSON.stringify(['Inicio', 'Buscar', 'Crear', 'WeeTalk', 'Notificaciones']));
  /*
   * Control: las cuatro que son pestañas siguen declaradas como pestañas, y la
   * de Perfil TAMBIÉN, aunque ya no esté en la barra: su pantalla y su pila no
   * se han tocado y por ahí siguen entrando el menú ☰ y la barra lateral.
   */
  const declaradas = ['Home', 'Search', 'Create', 'Inbox', 'Profile'].filter((r) =>
    new RegExp('<Tab\\.Screen\\s+name="' + r + '"').test(pestanas)
  );
  check('135) control: las cinco siguen existiendo como pestañas', declaradas.length === 5, declaradas.join(', '));

  /*
   * UNA SOLA INSTANCIA. Se monta en la pila principal, que es el único nivel
   * desde el que se ven todas las pantallas, y las pestañas dejaron de dibujar
   * la suya. Si alguna pantalla montara otra, habría dos.
   */
  check('136) se monta una sola vez, en la pila principal', (pila.match(/<NavegacionGlobal \/>/g) || []).length === 1);
  check('137) y las pestañas ya no dibujan la suya', /tabBar=\{\(\) => null\}/.test(pestanas));
  /*
   * Control: nadie más la monta. Se recorre TODA la aplicación, no una lista
   * escrita a mano — una lista se queda vieja en cuanto alguien añade una
   * pantalla.
   */
  const raiz = path.resolve(here, '../..');
  const recorrer = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      if (e.name === 'node_modules' || e.name.startsWith('.')) return [];
      const completo = path.join(dir, e.name);
      return e.isDirectory() ? recorrer(completo) : completo.endsWith('.tsx') ? [completo] : [];
    });
  const montan = recorrer(raiz).filter((f) => /<(NavegacionGlobal|BarraInferior)[\s/>]/.test(fs.readFileSync(f, 'utf8')));
  check('138) control: nadie más la monta', montan.length === 2,
    montan.map((f) => path.basename(f)).join(' · '));

  /*
   * QUÉ VA ENCENDIDO. Dentro de las pestañas, la pestaña; fuera, la ruta si se
   * conoce y si no Inicio, porque todo lo demás se alcanza desde ahí.
   */
  check('139) el activo sale de dónde estás', /pestanaPuesta\(estado\) \|\| DESTINO_DE_RUTA\[rutaRaiz\] \|\| 'Home'/.test(global));
  check('140) y se anuncia como tal', /accessibilityState=\{\{ selected: activo \}\}/.test(barra) && /aria-selected=\{activo\}/.test(barra));

  /*
   * ─── LA CAMPANA BAJÓ A LA BARRA (fase 2E-77) ────────────────────────────────
   *
   * Notificaciones es el quinto destino y Perfil salió de la barra. No es una
   * pestaña: es una pantalla DENTRO de la pila del Home, así que se abre por el
   * mismo camino que ya usaban el menú ☰ y la barra lateral, y por eso lo que
   * enciende el destino es la ruta más honda y no la pestaña —estando en
   * Notificaciones, la pestaña sigue siendo Inicio—.
   */
  check('141) Notificaciones es el quinto, con el icono de la familia',
    /*
     * Entre la etiqueta y el icono puede haber más campos —hoy la clave de
     * traducción—. Lo que se exige es que el quinto destino siga siendo
     * Notifications y siga llevando el icono de la familia.
     */
    /\{ id: 'Notifications', etiqueta: 'Notificaciones',[^}]*icono: 'notifications-outline', iconoPuesto: 'notifications' \}/.test(barra)
    && ids[4][0] === 'Notifications');
  check('141) y abre la pantalla que ya existía, sin ruta nueva',
    /if \(destino === 'Notifications'\) \{\s*return irARaiz\('Main', \{ screen: 'Home', params: \{ screen: 'Notifications' \} \}\);/.test(global)
    && /name="Notifications"/.test(leer('navigation/HomeStackNavigator.tsx'))
    && (leer('navigation/HomeStackNavigator.tsx').match(/name="Notifications"/g) || []).length === 1);
  check('141) se enciende estando en ella, aunque la pestaña sea Inicio',
    /const enNotificaciones = rutaHonda\(estado\) === 'Notifications';/.test(global)
    && /enNotificaciones\s*\n?\s*\? 'Notifications'/.test(global));
  /* Perfil sale de la BARRA, no de la aplicación: su pantalla y sus puertas siguen. */
  check('142) Perfil ya no está en la barra', !/'Profile'/.test(barra) && !/etiqueta: 'Perfil'/.test(barra));
  check('142) pero su pantalla y su pila siguen enteras',
    /<Tab\.Screen\s+name="Profile"/.test(pestanas) && /ProfileStackNavigator/.test(pestanas));
  check('142) y se sigue abriendo desde el menú ☰ y la barra lateral',
    /navigateTab\('Profile'\)/.test(leer('components/DrawerMenu.tsx')) && /goTab\('Profile'\)/.test(leer('components/Sidebar.tsx')));
  /* Control: una sola puerta a Notificaciones desde la barra, y ninguna campana arriba. */
  check('142) control: ni campana arriba ni Perfil duplicado abajo',
    !/notifications/i.test(leer('components/Header.tsx'))
    && (barra.match(/\{ id: 'Notifications'/g) || []).length === 1
    && !/person-outline|AvatarDisplay|person'/.test(barra));

  /* Las pantallas que de verdad piden pantalla completa se quedan sin barra. */
  ['Login', 'Register', 'Create', 'Reels', 'Settings'].forEach((r) => {
    if (!new RegExp("'" + r + "'").test(global.split('const DESTINO_DE_RUTA')[0])) {
      check(`141) excepción declarada: ${r}`, false);
    }
  });
  check('141) modales, autenticación y pantalla completa quedan fuera',
    /SIN_BARRA = new Set\(\[[\s\S]*?'Login',[\s\S]*?'Register',[\s\S]*?'Create',[\s\S]*?'Reels',[\s\S]*?'Settings',/.test(global));
  check('142) y una conversación abierta también', /ANIDADAS_SIN_BARRA = new Set\(\['Conversation'\]\)/.test(global));

  /*
   * SITIO Y ZONA SEGURA. La barra se aparta de los controles del sistema con
   * `insets.bottom`, y la pila reserva su alto en las pantallas que antes no
   * tenían barra —las de las pestañas ya dejaban hueco desde siempre—.
   */
  check('143) respeta la zona segura del sistema', /paddingBottom: insets\.bottom/.test(barra));
  /*
   * El sitio se reserva solo fuera de las pestañas —dentro ya lo dejaban ellas—
   * y desde que la barra se desliza, el hueco acompaña al movimiento en vez de
   * ser un número fijo. Lo que importa sigue siendo lo mismo: se reserva, y solo
   * donde hace falta.
   */
  check('144) y reserva su sitio donde antes no había barra',
    /barra\.visible && !barra\.enPestanas[\s\S]{0,200}ALTO_BARRA \+ insets\.bottom/.test(pila));
  /* Control: quieta abajo mientras el contenido se desplaza por detrás. */
  check('145) control: no se va con el scroll', /anclada: \{[\s\S]{0,160}position: 'absolute'[\s\S]{0,120}bottom: 0/.test(global));

  /*
   * ICONOS DE UNA SOLA FAMILIA, y los mismos en móvil y en navegador. Antes la
   * web enseñaba emojis y el teléfono iconos de línea.
   */
  check('146) todos los iconos son de la misma familia', (barra.match(/<Ionicons/g) || []).length >= 1 && !/TAB_EMOJIS|fontSize: 22/.test(barra));
  check('147) contorno en reposo y relleno cuando está puesto',
    /icono: '(\w+)-outline'/.test(barra) && /activo \? destino\.iconoPuesto : destino\.icono/.test(barra));
  /* El dibujo encoge; el sitio donde se toca, no. */
  check('148) el objetivo táctil no encoge', /minHeight: 44,/.test(barra));
}

console.log('\n── P · La barra se aparta al bajar y vuelve al subir ──');
{
  const hook = leer('hooks/useScrollDeBarra.ts');
  const global = leer('navigation/NavegacionGlobal.tsx');
  const pila = leer('navigation/MainStackNavigator.tsx');
  const contexto = leer('contexts/ScrollContext.tsx');

  /*
   * Se reutiliza el contexto de scroll que YA existía. Declaraba `scrollY` e
   * `isScrollingDown` desde antes de esta fase y no los escribía nadie: eran
   * andamio. Ahora los llena el hook, en vez de levantar un contexto paralelo.
   */
  check('149) usa la infraestructura de scroll que ya había',
    /isScrollingDown/.test(contexto) && /useScroll\(\)/.test(hook) && /setIsScrollingDown/.test(hook));

  /*
   * ─── LA CAUSA DE LOS ~2 SEGUNDOS, VIGILADA ─────────────────────────────────
   *
   * El hook escribía `scrollY` en el contexto en CADA evento de scroll. El
   * proveedor construye su valor como un objeto nuevo en cada render, así que
   * cada escritura repintaba a sus seis consumidores —entre ellos el muro
   * entero, con sus vídeos—, sesenta veces por segundo. El hilo de JavaScript se
   * quedaba sin aire y el cambio de dirección hacía cola detrás. No era la
   * animación ni el umbral: era la cola.
   *
   * Estas tres comprobaciones existen para que nadie lo reintroduzca sin darse
   * cuenta de lo que cuesta.
   */
  check('149b) no publica la posición del scroll en cada evento', !/setScrollY/.test(hook));
  /* Al contexto solo se le habla cuando el sentido CAMBIA, no por fotograma. */
  const escrituras = (hook.match(/setIsScrollingDown\(/g) || []).length;
  const guardadas = (hook.match(/if \(bajando\.current\) \{[\s\S]{0,80}setIsScrollingDown|&& !bajando\.current|&& bajando\.current/g) || []).length;
  check('149c) y solo cuando cambia el sentido', escrituras === 3 && guardadas === 3,
    `${escrituras} escrituras, las ${guardadas} protegidas por el estado actual`);
  /*
   * Control: la posición vive en una referencia, que no repinta. Si volviera a
   * un `useState`, cada evento de scroll repintaría otra vez.
   */
  check('149d) control: la posición vive en una referencia', /const ultimaY = useRef\(0\);/.test(hook) && !/useState/.test(hook));

  /* Y nada de esperas artificiales en el camino del gesto. */
  const caminoDelGesto = hook + global.split('const elegir')[0];
  check('149e) sin temporizadores ni esperas en el camino del gesto',
    !/setTimeout|setInterval|debounce|throttle\(/.test(caminoDelGesto));

  /*
   * MANDA EL CAMINO RECORRIDO, NO EL ÚLTIMO EVENTO. Un dedo suelta decenas de
   * eventos de dos píxeles en los dos sentidos; sin umbral la barra entraría y
   * saldría sin parar.
   */
  /*
   * Y NO CUESTAN LO MISMO LOS DOS GESTOS. Apartar la navegación es una
   * concesión y conviene pedir intención; recuperarla es una PETICIÓN, y ahí
   * esperar es lo que hace que una aplicación se sienta lenta.
   *
   * Con el umbral simétrico de antes hacían falta 12 px hacia arriba y un golpe
   * de rueda ronda los 10: casi siempre eran DOS eventos, y la barra parecía
   * pegada. Medido en el navegador con el umbral nuevo: un solo golpe hacia
   * arriba la pone en marcha (46,8 → 30,6 → 0).
   */
  const ocultar = /const UMBRAL_OCULTAR = (\d+);/.exec(hook);
  const mostrar = /const UMBRAL_MOSTRAR = (\d+);/.exec(hook);
  check('150) esconderla pide intención', !!ocultar && Number(ocultar[1]) >= 6, ocultar ? `${ocultar[1]} px` : 'sin umbral');
  check('150b) recuperarla responde al primer movimiento',
    !!mostrar && Number(mostrar[1]) > 0 && Number(mostrar[1]) <= 4, mostrar ? `${mostrar[1]} px` : 'sin umbral');
  check('150c) control: cuesta bastante menos volver que irse',
    !!ocultar && !!mostrar && Number(mostrar[1]) * 3 <= Number(ocultar[1]),
    ocultar && mostrar ? `${mostrar[1]} px para volver frente a ${ocultar[1]} para irse` : '');
  /* Y cada umbral se aplica en su rama: el de mostrar solo cuando está oculta. */
  check('150d) cada umbral en su sitio',
    /recorrido\.current > UMBRAL_OCULTAR && !bajando\.current/.test(hook) &&
      /recorrido\.current < -UMBRAL_MOSTRAR && bajando\.current/.test(hook));
  check('151) y cambiar de sentido reinicia la cuenta', /if \(dy > 0 !== recorrido\.current > 0\) recorrido\.current = 0;/.test(hook));
  /* Control: arriba del todo siempre se ve. Llegar a una pantalla sin navegación es raro. */
  check('152) control: arriba del todo siempre está', /if \(y <= ZONA_ALTA\)/.test(hook) && /setIsScrollingDown\(false\)/.test(hook));

  /*
   * SE DESLIZA, NO SE DIFUMINA. Y recorre su alto entero más la zona segura,
   * así que sale completa en vez de dejar media navegación asomando.
   */
  check('153) se mueve con translateY', /transform: \[\{ translateY: apartada\.interpolate/.test(global));
  check('154) y no con opacidad', !/opacity: apartada/.test(global));
  check('155) recorre su alto más la zona segura', /const salida = ALTO_BARRA \+ insets\.bottom;/.test(global));
  /*
   * Tampoco duran lo mismo. Irse puede tomarse su tiempo —nadie la espera—;
   * volver es la respuesta a un gesto, y a una respuesta se le mira el reloj.
   */
  const dOcultar = /const DURACION_OCULTAR = (\d+);/.exec(global);
  const dMostrar = /const DURACION_MOSTRAR = (\d+);/.exec(global);
  check('156) irse es suave', !!dOcultar && Number(dOcultar[1]) >= 150 && Number(dOcultar[1]) <= 240,
    dOcultar ? `${dOcultar[1]} ms` : 'sin duración');
  check('156b) volver es casi inmediato', !!dMostrar && Number(dMostrar[1]) >= 60 && Number(dMostrar[1]) <= 140,
    dMostrar ? `${dMostrar[1]} ms` : 'sin duración');
  /*
   * Control: hay recorrido, no un salto. Duración cero haría que la barra
   * apareciera de la nada y el ojo no entendería de dónde salió.
   */
  check('156c) control: volver tiene recorrido, no es un salto', !!dMostrar && Number(dMostrar[1]) > 0);
  check('156d) y cada duración se usa según el sentido',
    /duration: isScrollingDown \? DURACION_OCULTAR : DURACION_MOSTRAR/.test(global));

  /*
   * Y EL HUECO SE SUELTA CON ELLA: mientras está escondida el contenido llega
   * hasta abajo y no queda una franja vacía esperándola.
   */
  check('157) el hueco reservado se va con la barra',
    /paddingBottom:[\s\S]{0,120}apartada\.interpolate\(\{[\s\S]{0,120}outputRange: \[ALTO_BARRA \+ insets\.bottom, 0\]/.test(pila));
  /*
   * Control: un solo número mueve las dos cosas. Con un valor por componente
   * cada uno animaría por su cuenta y se verían desacompasados.
   */
  check('158) control: barra y hueco comparten el mismo número',
    /export const apartada = new Animated\.Value\(0\);/.test(global) && /apartada/.test(pila));

  /* Al cambiar de pantalla vuelve: nadie llega a un sitio nuevo sin navegación. */
  check('159) al cambiar de pantalla reaparece', /apartada\.setValue\(0\);/.test(global));

  /*
   * Enganchada donde de verdad se desplaza Weë: el muro del Home —nativo y web—
   * y el contenedor de TODAS las experiencias.
   */
  check('160) el Home nativo lo reporta', /onScroll=\{reportarScroll\}/.test(leer('screens/LandingScreen.tsx')));
  check('161) el Home web también', /onScroll=\{reportarScroll\}/.test(leer('screens/WebLandingScreen.tsx')));
  check('162) y todas las experiencias de Weë, de una vez',
    /\{\.\.\.scrollDeBarra\}/.test(leer('components/creator/CreatorShell.tsx')));
  /*
   * Control: el hook entiende las dos formas de desplazarse que hay en Weë —el
   * `ScrollView` de React Native y el contenedor del navegador—, así que el
   * enganche web no necesita un segundo hook.
   */
  check('163) control: entiende el scroll de móvil y el del navegador',
    /nativeEvent\?\.contentOffset\?\.y/.test(hook) && /currentTarget\?\.scrollTop/.test(hook));
}

console.log('\n── Q · El Home va directo a "Crear publicación" ──');
{
  const nativo = leer('screens/LandingScreen.tsx');
  const web = leer('screens/WebLandingScreen.tsx');
  const puerta = leer('components/creator/ComposerEntry.tsx');
  const crear = leer('screens/CreateScreen.tsx');
  const pila = leer('navigation/MainStackNavigator.tsx');
  const pestanas = leer('navigation/TabNavigator.tsx');

  /*
   * LA BARRA DEL HOME YA NO SE DESPLIEGA. Antes, tocar "¿Qué quieres
   * compartir?" abría dentro del Home una fila de atajos, los destinos y un
   * botón Publicar: un compositor a medias creciendo en el muro, y luego había
   * que tocar otra vez para llegar al de verdad. Ahora la pregunta, el "+" y el
   * chevron llevan directamente a "Crear publicación", que es donde de verdad
   * están Cámara, Foto o vídeo, ËContact, Ubicación y Encuesta.
   *
   * El comportamiento de la puerta se ejecuta en composer-entry.test.mjs (I);
   * aquí se vigila el cableado del Home: que las dos pantallas lo pidan, a
   * dónde llevan y que el compositor sea uno.
   */
  check('164) el Home nativo pide la barra directa', /<ComposerEntry [^>]*variante="home" directo \/>/.test(nativo));
  check('165) y la portada web también', /<ComposerEntry [^>]*variante="home" directo \/>/.test(web));

  /* 3 y 4: la pregunta y el "+" acaban en el MISMO handler, y ese handler navega. */
  const handlerNativo = nativo.slice(nativo.indexOf('const handleCompose ='), nativo.indexOf('const handleCompose =') + 400);
  const handlerWeb = web.slice(web.indexOf('const handleCompose ='), web.indexOf('const handleCompose =') + 200);
  check('166) en nativo el handler navega a Create con el kind', /navigate\('Create', \{ kind \}\)/.test(handlerNativo) && /mainNavigation/.test(handlerNativo));
  check('167) en web el handler navega a Create con el kind', /irAlCompositor\(\{ kind \}\)/.test(handlerWeb) && /navigate\('Create', params\)/.test(web));
  /*
   * Sube DOS niveles a propósito: hay un `Create` en la barra de pestañas que
   * no tiene pantalla —solo dibuja el "+"—. Un navigate lanzado desde el Home
   * sin subir acabaría en esa ruta vacía.
   */
  check('168) y suben hasta el navegador de arriba, saltando la pestaña vacía',
    /navigation\.getParent\(\);\s*const mainNavigation = tabNavigation\?\.getParent\(\);/.test(nativo) && /navigation\.getParent\(\);\s*const mainNavigation = tabNavigation\?\.getParent\(\);/.test(web) &&
    /name="Create"\s*component=\{CreateTabPlaceholder\}/.test(pestanas));
  check('169) sin sesión, el Home lleva a registrarse en vez de al compositor', /if \(!user\) return handleRegister\(\);/.test(handlerNativo) && /if \(!user\) return navigation\.navigate\('Register'\);/.test(handlerWeb));

  /* 5: una puerta por pantalla, y un solo compositor de verdad. */
  check('170) una sola barra en cada pantalla del Home', (nativo.match(/<ComposerEntry/g) || []).length === 1 && (web.match(/<ComposerEntry/g) || []).length === 1);
  check('171) el Home no monta el compositor dentro: solo navega a él', !/import CreateScreen|<CreateScreen/.test(nativo) && !/import CreateScreen|<CreateScreen/.test(web));
  const rutaCrear = pila.slice(pila.indexOf('const CreateWrapper'), pila.indexOf('const CreateWrapper') + 300);
  check('172) "Crear publicación" está registrada una sola vez',
    (pila.match(/name="Create"\s*component=\{CreateWrapper\}/g) || []).length === 1 && /isDesktop \? \([\s\S]{0,80}<CreateScreen \/>[\s\S]{0,80}\) : \([\s\S]{0,40}<CreateScreen \/>/.test(rutaCrear) && !/CreateScreen/.test(pestanas));

  /* 6 y 7: el workspace no cambia, y Back vuelve a donde estabas: el Home. */
  check('173) el compositor no sabe nada de la barra ni de `directo`', !/ComposerEntry|directo/.test(crear));
  check('174) sigue leyendo el kind con el que llega', /const presetKind: string \| null = routeParams\.kind \|\| null;/.test(crear));
  check('175) y Back deshace la navegación: vuelve al Home', /const handleClose = \(\) => \{\s*navigation\.goBack\(\);/.test(crear) && /onPress=\{handleClose\}[\s\S]{0,300}accessibilityLabel=\{t\('common\.back'\)\}/.test(crear));

  /* 8: nada más cambia. `directo` solo lo piden las dos pantallas del Home. */
  const etiquetas = [];
  for (const carpeta of ['screens', 'components']) {
    for (const nombre of fs.readdirSync(path.resolve(here, '../../' + carpeta), { recursive: true })) {
      const archivo = carpeta + '/' + String(nombre).replace(/\\/g, '/');
      if (!/\.tsx$/.test(archivo)) continue;
      for (const etiqueta of leer(archivo).match(/<ComposerEntry\b[^>]*>/g) || []) etiquetas.push({ archivo, directo: / directo(\s|\/|=)/.test(etiqueta) });
    }
  }
  const directas = etiquetas.filter((e) => e.directo).map((e) => e.archivo).sort();
  check('176) control: solo las dos pantallas del Home piden la barra directa',
    directas.join(' · ') === 'screens/LandingScreen.tsx · screens/WebLandingScreen.tsx',
    etiquetas.map((e) => e.archivo + (e.directo ? ' (directo)' : '')).join(' · '));
  check('177) control: la barra nace sin `directo`, así que quien no lo pide no cambia', /directo = false \}\) =>/.test(puerta) && /const desplegable = !compact && !directo;/.test(puerta));
  /*
   * La barra del Home es el "+" y la pregunta, sin chevron: una flecha de
   * desplegar donde no hay nada que desplegar sería un acordeón mintiendo. El
   * mismo `desplegable` que decide si se abre decide si se dibuja la flecha, y
   * el campo ya ocupa el ancho (`flex: 1`), así que el hueco no queda vacío.
   */
  /*
   * LA BARRA DE ABAJO ES UNA, Y NO SE DUPLICA AL IR AL COMPOSITOR.
   *
   * Vive en un solo sitio —`NavegacionGlobal`, montada una vez en la pila
   * principal— y la barra de pestañas no dibuja la suya (`tabBar={() => null}`).
   * "Crear publicación" no monta ninguna: si lo hiciera, se verían dos.
   */
  check('179) la barra inferior se dibuja en un solo sitio',
    (leer('navigation/NavegacionGlobal.tsx').match(/<BarraInferior /g) || []).length === 1 &&
    (pila.match(/<NavegacionGlobal \/>/g) || []).length === 1 &&
    /tabBar=\{\(\) => null\}/.test(pestanas));
  check('179) y el compositor no trae una segunda', !/BarraInferior|NavegacionGlobal/.test(crear));

  /*
   * Y EL HOME NO SE MUEVE DE SITIO. El orden de la portada es el aprobado:
   * saludo, la barra de publicar, los Ẅells, las pestañas Ẅall/Ẅells, los
   * filtros y el muro. Llevar el compositor a su pantalla no reordena nada.
   */
  /* La cabecera de la lista es el orden del Home; ya no hay pestañas, y los filtros van al final. */
  const cabeceraDelHome = nativo.slice(nativo.indexOf('const listHeader'), nativo.indexOf('const renderPostItem'));
  const bloques = ['renderHero()', 'renderComposer()', 'renderWeelsRow()', 'renderFeedFilters()'];
  check('180) el Home mantiene su orden: saludo · compositor · Ẅells · secciones, y debajo el muro',
    bloques.every((b, i) => cabeceraDelHome.indexOf(b) >= 0 && (i === 0 || cabeceraDelHome.indexOf(bloques[i - 1]) < cabeceraDelHome.indexOf(b)))
    && !/renderTabBar/.test(cabeceraDelHome),
    bloques.filter((b) => cabeceraDelHome.includes(b)).join(' · '));
  check('180) y el muro va después, como contenido de la lista', /ListHeaderComponent=\{listHeader\}/.test(nativo) && /renderItem=\{renderPostItem\}/.test(nativo));

  check('178) la barra cerrada del Home es el "+" y la pregunta, sin chevron',
    /variante === 'home' \? \([\s\S]{0,600}accessibilityLabel=\{t\('composer\.createPost'\)\}/.test(puerta) &&
    /\{desplegable && \(\s*<TouchableOpacity\s*onPress=\{\(\) => setAbierta[\s\S]{0,700}name="chevron-down"/.test(puerta) && !/conChevron/.test(puerta) &&
    /composerField: \{\s*flex: 1,/.test(puerta));
}

console.log('\n── R · La conversación se abre desde abajo, no en otra pantalla ──');
{
  /*
   * TOCAR "COMENTAR" ABRE LA CONVERSACIÓN, NO OTRO SITIO.
   *
   * Antes el contador de comentarios llevaba a la pantalla de la publicación:
   * salías del muro, perdías el sitio y la conversación quedaba detrás del
   * contenido, a un scroll de distancia. Ahora sube una hoja por encima del
   * muro y al cerrarla sigues donde estabas.
   *
   * Lo que NO cambia: tocar la publicación en sí sigue abriéndola entera. Son
   * dos intenciones distintas y ahora hacen dos cosas distintas.
   */
  const hoja = leer('components/HojaDeComentarios.tsx');
  const enganche = leer('contexts/ComentariosContext.tsx');
  const gancho = leer('hooks/useComentarios.ts');
  const muros = [
    ['el muro del Home', leer('screens/LandingScreen.tsx')],
    ['la portada web', leer('screens/WebLandingScreen.tsx')],
  ];

  for (const [nombre, texto] of muros) {
    check(`181) ${nombre} abre la conversación, no navega`,
      /abrirComentarios\(post\)/.test(texto) && /useComentariosDeLaPublicacion\(\)/.test(texto));
  }
  /* Y ninguno de los tres manda a un perfil al comentar: ese era el problema. */
  check('181) control: comentar no lleva a ningún perfil',
    muros.every(([, texto]) => !/(handleComment|openComments)[\s\S]{0,200}navigate\('UserProfile'/.test(texto)));
  /* La publicación entera sigue abriéndose al tocarla: no se ha perdido nada. */
  check('181) control: tocar la publicación sigue abriéndola entera',
    muros.every(([, texto]) => /navigate\('PostDetail'/.test(texto)));

  /*
   * UNA SOLA HOJA. Las publicaciones se pintan en varios muros; si cada uno
   * montara la suya habría cuatro copias del mismo panel.
   */
  check('182) la hoja se monta una vez, arriba del todo',
    /<HojaDeComentarios/.test(enganche) && (leer('App.tsx').match(/<ComentariosProvider>/g) || []).length === 1
    && muros.every(([, texto]) => !/<HojaDeComentarios/.test(texto)));

  /* Sube desde abajo, con el fondo atenuado y las esquinas de arriba redondeadas. */
  check('183) es una hoja que sube desde abajo, como la de Crear',
    /animationType=\{isWeb \? 'none' : 'slide'\}/.test(hoja)
    && /justifyContent: 'flex-end'/.test(hoja)
    && /borderTopLeftRadius: BORDER_RADIUS\.xl/.test(hoja)
    && /backgroundColor: 'rgba\(31,41,55,0\.45\)'/.test(hoja));
  check('183) se cierra por el botón, por fuera y con el botón atrás de Android',
    /accessibilityLabel=\{t\('wall\.closeComments'\)\}/.test(hoja) && /onRequestClose=\{onClose\}/.test(hoja));

  /*
   * La lista es una lista de verdad: `FlatList`, no un `map`. Una conversación
   * larga no puede montar todas las tarjetas de golpe.
   */
  check('184) la lista se desplaza y no monta todo de golpe',
    /<FlatList/.test(hoja) && !/comentarios\.map\(/.test(hoja) && /keyboardShouldPersistTaps="handled"/.test(hoja));
  /* Y el orden es el de siempre: del más antiguo al más nuevo. No se toca. */
  check('184) el orden de los comentarios es el que ya tenía Weë',
    /'createdAt', 'asc'/.test(leer('services/firestoreService.ts')) && !/orderBy|'desc'/.test(gancho));

  /* El compositor, abajo y siempre visible, con lo que ya sabía hacer Weë. */
  check('185) el compositor va abajo, fijo, con adjunto y envío',
    /accessibilityLabel=\{t\('wall\.attachImage'\)\}/.test(hoja)
    && /accessibilityLabel=\{t\('wall\.sendComment'\)\}/.test(hoja)
    && /placeholder=\{t\('wall\.commentPlaceholder'\)\}/.test(hoja));
  check('185) el adjunto se ve antes de enviarlo y se puede quitar',
    /\{!!adjunto && \(/.test(hoja) && /accessibilityLabel=\{t\('wall\.removeImage'\)\}/.test(hoja) && /onPress=\{quitarAdjunto\}/.test(hoja));
  /*
   * EL TECLADO NO TAPA EL COMPOSITOR, y no con una cuenta propia.
   *
   * Weë se dibuja de borde a borde, y con eso el `ADJUST_RESIZE` que React
   * Native le pone al `Modal` queda inerte: la ventana no se encoge y el
   * teclado se dibuja encima. Tampoco vale `KeyboardAvoidingView` en Android,
   * que mide el solapamiento contra una ventana que no se movió y da cero. Weë
   * ya resolvió esto en `EspacioDeEscritura`, con la regla de cada plataforma,
   * y es lo que la hoja usa: nada de medir el teclado por su cuenta.
   */
  /* Las notas de la hoja SÍ nombran lo que no vale, para explicar por qué; se miran sin ellas. */
  const hojaSinNotas = hoja.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('185) el teclado no tapa el compositor, con la pieza que ya tenía Weë',
    /<EspacioDeEscritura style=\{styles\.marco\} activo=\{visible\}>/.test(hoja)
    && !/keyboardDidShow|altoDelTeclado|Keyboard\.addListener|KeyboardAvoidingView/.test(hojaSinNotas));
  /* Y la altura de la hoja va en porcentaje, para que se recalcule con el sitio que quede. */
  check('185) la hoja se mide en porcentaje, no en píxeles',
    /minHeight: '55%'/.test(hoja) && /maxHeight: '92%'/.test(hoja) && !/height: altoDeLaHoja/.test(hoja));
  /*
   * LOS COMENTARIOS RESPIRAN, sin caja y sin raya. Y se valoran con el pulgar,
   * con el voto que Weë ya tenía: ni servicio nuevo, ni colección nueva.
   */
  const tarjetaDeComentario = leer('components/CommentCard.tsx');
  check('185) un comentario no es una tarjeta ni lleva raya debajo',
    !/borderBottomWidth|borderWidth|shadowColor|elevation/.test(tarjetaDeComentario));
  check('185) se valora con pulgares, no con corazones',
    /thumbs-up/.test(tarjetaDeComentario) && /thumbs-down/.test(tarjetaDeComentario)
    && !/heart/.test(tarjetaDeComentario));
  check('185) y el voto es el que ya existía',
    /voteService\.voteOnComment\(comment\.id, user\.uid, tipo\)/.test(tarjetaDeComentario)
    && /voteService\.getUserCommentVote/.test(tarjetaDeComentario)
    && /commentVotes/.test(leer('services/voteService.ts')));

  /*
   * NADA DE ESTO ES INFRAESTRUCTURA NUEVA. Misma colección, mismo servicio,
   * misma subida, misma tarjeta de comentario. Y una sola copia de la lógica:
   * la hoja y la pantalla de la publicación usan el MISMO hook.
   */
  check('186) reutiliza lo que ya había: colección, servicio, subida y tarjeta',
    /commentsService/.test(gancho) && /uploadCommentImage/.test(gancho)
    && /notificationService/.test(gancho) && /CommentCard/.test(hoja));
  check('186) y no hay dos copias de la lógica de comentar',
    /useComentarios\(/.test(hoja) && /useComentarios\(post\)/.test(leer('screens/PostDetailScreen.tsx'))
    && !/commentsService\.create/.test(leer('screens/PostDetailScreen.tsx')));
  check('186) control: ninguna colección nueva',
    !/collection\(db, 'comentarios'|'commentThreads'|'postComments'/.test(gancho + hoja + enganche));

  /*
   * Los comentarios que ya existen siguen siendo los mismos: el modelo no se
   * toca —ni el `postId` al que pertenecen, ni las respuestas—, así que no hay
   * nada que migrar.
   */
  const modelo = leer('services/firestoreService.ts');
  check('187) el modelo de comentario no cambia: mismos campos, mismas respuestas',
    /parentCommentId\?: string;/.test(modelo) && /imageUrl\?: string;/.test(modelo) && /postId: string;/.test(modelo));
  check('187) y se publica en el mismo sitio, con el mismo contador',
    /postId,\s*\n\s*userId: uidActivo,/.test(gancho) && /postsService\.update\(postId, \{ comments:/.test(gancho));

  /*
   * El perfil no desaparece: desde un comentario se sigue llegando al de quien
   * lo escribió. Lo que ya no pasa es lo contrario.
   */
  check('188) desde un comentario se sigue pudiendo abrir su perfil',
    /onAbrirPerfil=\{abrirPerfil\}/.test(enganche) && /navigate\('UserProfile', \{ userId \}\)/.test(enganche)
    && /onProfilePress=\{onAbrirPerfil\}/.test(hoja));
}

console.log('\nHome: quién eres arriba, secciones en el muro');
if (failures > 0) {
  console.error(`\n${failures} comprobación(es) fallida(s)`);
  process.exit(1);
}
