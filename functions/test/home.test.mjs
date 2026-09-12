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
 *     experiencia (`components/creator/SectionWall.tsx`) siguen pidiendo
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
  check('1) son cinco, en el orden pedido',
    JSON.stringify(HOME_SECTION_FILTERS.map((f) => f.id)) === JSON.stringify(['all', 'studio', 'travel', 'music', 'chef'])
  );
  check('2) con los nombres de las experiencias',
    JSON.stringify(HOME_SECTION_FILTERS.map((f) => f.label)) ===
      JSON.stringify(['Todo', 'WeeStudio', 'WeeTravel', 'WeeMusic', 'WeeChef'])
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
   * Y una advertencia escrita, no un fallo: Weë Music todavía no tiene palabras
   * clave (`SECTION_MARKERS`), porque la experiencia está sin conectar. Su
   * pastilla enseña lo que eligió publicarse en Weë Music y nada más; lo
   * publicado antes de que existieran los destinos no aparece ahí. Cuando Weë
   * Music se conecte y tenga marcas, esta comprobación lo dirá.
   */
  const conMarcas = Object.keys(secciones.SECTION_MARKERS);
  const sinMarcas = HOME_SECTION_FILTERS.filter((f) => f.id !== 'all' && !conMarcas.includes(f.id)).map((f) => f.id);
  check('4) las pastillas sin palabras clave solo leen destinos elegidos',
    JSON.stringify(sinMarcas) === JSON.stringify(['music']),
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
    ['studio', 'travel', 'music', 'chef'].every((s) => !ids(filterBySection(todos, s)).includes('solo-general'))
  );
  check('9) es exactamente el reparto de los muros de sección, sin criterio nuevo',
    ['studio', 'travel', 'music', 'chef'].every(
      (s) => JSON.stringify(ids(filterBySection(todos, s))) === JSON.stringify(ids(secciones.postsDeLaSeccion(todos, s)))
    )
  );
  const antes = ids(todos).join();
  filterBySection(todos, 'travel');
  check('10) no toca la lista que recibe', ids(todos).join() === antes);
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
  const muroSeccion = leer('components/creator/SectionWall.tsx');
  check('14) la pared de cada experiencia sigue pidiendo tipos de contenido', /filterPosts\(mine, 'images'\)/.test(muroSeccion));
  check('15) y no usa las pastillas del Home', !/HOME_SECTION_FILTERS|filterBySection/.test(muroSeccion));
}

console.log('\n── D · El Home abre diciendo quién eres ──');
{
  const saludo = leer('components/HomeGreeting.tsx');
  check('16) saluda por tu nombre', /Hola, \$\{nombre\}/.test(saludo));
  /*
   * Y NADA MÁS. El "Crea. Conecta. Sé tú." que iba debajo del nombre se quitó:
   * la firma de marca vive ahora arriba, junto al logo, y dos frases de
   * bienvenida a dos dedos de distancia cargaban el bloque sin decir nada nuevo.
   * Tampoco puede quedar hueco reservado, así que el nombre es el único hijo.
   */
  check('17) ya no lleva una segunda frase debajo del nombre', !/Crea\. Conecta\. Sé tú\./.test(saludo));
  /* Control: el lema de la marca sí sigue existiendo, pero en el encabezado. */
  check('18) control: la firma de marca sigue viva, arriba', /Imagina · Crea · Comparte/.test(leer('components/Header.tsx')));
  check('19) y con tu cara', /AvatarDisplay/.test(saludo));
  /*
   * El nombre y el avatar salen del PERFIL ACTIVO. Si vinieran de `useAuth`,
   * al cambiar al Perfil Weë el Home seguiría llamándote por tu nombre real.
   */
  check('20) del perfil activo, no de la cuenta', /useUserProfile\(\)/.test(saludo) && /userProfile\?\.displayName/.test(saludo));
  check('21) la lupa se anuncia', /accessibilityLabel="Buscar en Weë"/.test(saludo));
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
   * Las dos etiquetas ya no van escritas dentro del JSX: las pone `pestana()`,
   * que construye las dos igual. Se comprueban donde viven ahora.
   */
  check('29) el Home nativo rotula Ẅall', /pestana\('flow', 'Ẅall'/.test(nativo));
  check('30) y Ẅells', /pestana\('weels', 'Ẅells'/.test(nativo));
  check('31) ya no dice "Comunidad" ni "Creado por la comunidad"', !/>\s*Comunidad\s*</.test(nativo) && !/Creado por la comunidad</.test(nativo));
  check('32) el Home web tiene la misma fila', /Ẅall<\/Text>/.test(web) && /Ẅells<\/Text>/.test(web));
  /*
   * Control: Ẅells no es un feed nuevo. Abre el visor de Weëls que ya existía,
   * el mismo de la fila de arriba.
   */
  check('33) control: Ẅells reutiliza el visor de siempre', /accessibilityLabel="Ẅells, los videos cortos"/.test(web) && /onPress=\{handleOpenWeels\}/.test(web));
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
  const muroSeccion = leer('components/creator/SectionWall.tsx');
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
  check('49) el "+" solo sale en el Home', /variante === 'home' \? \([\s\S]{0,600}accessibilityLabel="Crear una publicación"/.test(puerta));
  check('50) mide 44 sin escalar', /crear: \{\s*width: 44,\s*height: 44,/.test(puerta));
  check('51) y responde al dedo', /onPressIn=\{\(\) => hundir\(0\.92\)\}/.test(puerta) && /useNativeDriver: true/.test(puerta));
  check('52) las dos pantallas del Home lo piden', /variante="home"/.test(nativo) && /variante="home"/.test(web));
  /*
   * Control: los muros de sección NO lo piden, así que siguen exactamente como
   * estaban. Si esto fallara, el rediseño se habría salido del Home.
   */
  check('53) control: los muros de sección siguen con su avatar', !/variante/.test(muroSeccion));

  /*
   * WEËLS COMPACTOS: menos cosas encima de cada miniatura.
   */
  check('54) compacta no lleva subtítulo', /\{!compacta && \(\s*<Text style=\{\[styles\.subtitle/.test(fila));
  check('55) ni cuentas de visitas', /!compacta && typeof post\.views/.test(fila));
  check('56) ni emoji ni duración', /\{!compacta && <Text style=\{styles\.sampleEmoji/.test(fila) && /\{!compacta && <Text style=\{styles\.duration/.test(fila));
  /*
   * El título iba a la misma altura que la marca de Weë y a 74 puntos de ancho
   * se escribían uno encima del otro. Apilados caben los dos.
   */
  const alturaDe = (nombre) => {
    const m = new RegExp(nombre + ': \\{[^}]*bottom: scale\\((\\d+)\\)').exec(fila);
    return m ? Number(m[1]) : null;
  };
  const marca = alturaDe('watermark');
  const titulo = alturaDe('sampleLabel');
  const visitas = alturaDe('views');
  check('57) el título no se escribe encima de la marca', marca !== null && titulo !== null && titulo > marca,
    `título a ${titulo}, marca a ${marca}`);
  check('58) y las visitas tampoco', marca !== null && visitas !== null && visitas > marca,
    `visitas a ${visitas}`);

  /*
   * PASTILLAS: bajas de altura, cómodas de tocar.
   *
   * Lo segundo NO sale de lo primero: el `hitSlop` añade por fuera lo que la
   * pastilla no tiene por dentro. Sin él, 34 puntos de alto son 10 menos que un
   * dedo.
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
  check('61) la apagada lleva borde para que se lea como tocable', /borderWidth: StyleSheet\.hairlineWidth/.test(nativo) && /borderColor: active \? theme\.colors\.accent : theme\.colors\.border/.test(web));
  /*
   * Y el texto de la apagada toma el color del tema. Con un gris fijo, sobre el
   * fondo casi negro del Perfil Weë, cuatro de las cinco secciones eran
   * invisibles. Este era un fallo de verdad, no una preferencia.
   */
  check('62) el texto de la pastilla apagada sigue al tema', /color: active \? '#1F2937' : theme\.colors\.text/.test(web));

  /*
   * ẄALL / ẄELLS: la raya va pegada a la palabra, no de lado a lado.
   */
  check('63) la raya es del ancho de la palabra', /tabIndicator: \{[^}]*borderBottomWidth: 2/.test(nativo) && /experienciaIndicador: \{[^}]*borderBottomWidth: 2/.test(web));
  check('64) y la pestaña ya no la lleva entera', !/tabItem: \{[^}]*borderBottomWidth/.test(nativo));

  /*
   * ESTADOS QUE SE PUEDEN OÍR.
   *
   * En el móvil manda `accessibilityState`. En web no: se comprobó en el DOM que
   * React Native Web no lo traduce a ningún atributo, así que el estado va
   * escrito a mano o no existe para un lector de pantalla.
   */
  check('65) el móvil dice qué filtro y qué pestaña están puestos', /accessibilityState=\{\{ selected: active \}\}/.test(nativo) && /accessibilityState=\{\{ selected: puesta \}\}/.test(nativo));
  check('66) y la web también, con su propio atributo', /aria-pressed=\{active\}/.test(web) && /aria-selected/.test(web));

  /*
   * LOS BOTONES DE UNA PUBLICACIÓN.
   *
   * Los iconos miden 20 y el dedo necesita 44. Se añade por fuera: nada se mueve
   * de sitio. Es el único cambio fuera del Home y es invisible.
   */
  const conArea = (publicacion.match(/style=\{styles\.actionButton\} hitSlop=\{AREA_TACTIL\}/g) || []).length;
  const total = (publicacion.match(/style=\{styles\.actionButton\}/g) || []).length;
  check('67) todos los botones de una publicación se pueden tocar', conArea === total && total === 7, `${conArea} de ${total}`);
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
  check('74) tocar donde ya estás no hace nada', /if \(activeProfileType === destino\) return;/.test(cabecera));
  /*
   * El cuerpo de `elegirIdentidad`: comprueba, y si procede llama al cambio de
   * siempre. Se mira el cuerpo entero, no una ventana de caracteres: al añadirle
   * la guarda de toques repetidos, una ventana fija se quedó corta y falló sin
   * que nada estuviera mal.
   */
  const elegir = /const elegirIdentidad = \(destino: 'real' \| 'hidi'\) => \{[\s\S]*?\n  \};/.exec(cabecera);
  check('75) y el cambio sigue siendo el de siempre', !!elegir && /handleSwitchIdentity\(\);/.test(elegir[0]));
  /*
   * Control: la función que cambia de identidad está intacta, letra por letra.
   * Si alguien la tocara al rediseñar el selector, esto se caería —que es justo
   * lo que esta fase no podía permitirse.
   */
  const cambio = /const handleSwitchIdentity = \(\) => \{[\s\S]*?\n  \};/.exec(cabecera);
  check('76) control: la lógica de cambio no se tocó',
    !!cambio && /switchToBiz\(\);/.test(cambio[0]) && /switchIdentity\(\);/.test(cambio[0])
      && /setThemeMode\(nextType === 'hidi' \? 'dark' : 'light'\)/.test(cambio[0]));
  check('77) el modo Biz conserva su pastilla', /activeProfileType === 'biz' \? \([\s\S]{0,400}styles\.switchButton/.test(cabecera));

  /* Cada mitad se anuncia y se toca cómoda: 24 puntos de alto más 10 por lado. */
  check('78) cada mitad dice quién es y si está puesta', /accessibilityState=\{\{ selected: puesta \}\}/.test(cabecera) && /aria-selected=\{puesta\}/.test(cabecera));
  check('79) y se alcanza con el dedo', /hitSlop=\{\{ top: 10, bottom: 10/.test(cabecera));
  /* Control: el ☰ sigue exactamente donde estaba y haciendo lo de siempre. */
  check('80) control: el Burger no se tocó', /accessibilityLabel="Abrir menú"/.test(cabecera) && /onPress=\{onMenuPress\}/.test(cabecera));
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
  check('83) control: los muros de sección no cambian', !/variante/.test(leer('components/creator/SectionWall.tsx')));

  /*
   * Un mismo sitio, un mismo nombre. La fila se llama igual que la pestaña de
   * abajo; solo cambia lo que se lee.
   */
  check('84) la fila se llama Ẅells', /<Text style=\{\[styles\.title[^>]*>Ẅells<\/Text>/.test(fila));
  check('85) igual que la pestaña', /pestana\('weels', 'Ẅells'/.test(nativo));
  /* Control: por dentro sigue diciendo weel/weels; no se migró ningún dato. */
  check('86) control: por dentro no cambió nada', /onOpenWeels/.test(fila) && /onCreateWeel/.test(fila) && /Crear Weël/.test(fila));

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
  check('99) un toque repetido no cambia dos veces', /if \(identidadPedida\.current === destino\) return;/.test(cabecera));
  check('100) y arrepentirse al instante sigue funcionando', /identidadPedida = useRef<'real' \| 'hidi' \| null>/.test(cabecera));
  /*
   * Control: la identidad no se tocó. Esta fase era de presentación; si
   * `handleSwitchIdentity` hubiera cambiado, esto se cae.
   */
  const cambio = /const handleSwitchIdentity = \(\) => \{[\s\S]*?\n  \};/.exec(cabecera);
  check('101) control: la lógica de identidad sigue intacta',
    !!cambio && /switchIdentity\(\);/.test(cambio[0]) && /switchToBiz\(\);/.test(cambio[0])
      && /setThemeMode\(nextType === 'hidi' \? 'dark' : 'light'\)/.test(cambio[0]));
}

console.log('\n── M · La marca en el centro del Home ──');
{
  const cabecera = leer('components/Header.tsx');
  const nativo = leer('screens/LandingScreen.tsx');
  const web = leer('screens/WebLandingScreen.tsx');

  /* El lema, letra por letra: sin emojis, sin comillas y sin punto final. */
  const lema = /const LEMA_DE_MARCA = '([^']*)';/.exec(cabecera);
  check('102) el lema dice exactamente lo que tiene que decir',
    !!lema && lema[1] === 'Imagina · Crea · Comparte',
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
  check('103) la marca va en su propia fila, centrada', /marca: \{\s*alignItems: 'center',/.test(cabecera));
  check('104) fuera de la fila de los controles', /<\/View>\s*\{\/\*[\s\S]{0,600}\*\/\}\s*\{conMarca && \(\s*<View style=\{styles\.marca\}>/.test(cabecera));

  /*
   * Un solo logo. El de la fila y el del centro son excluyentes: `!conMarca` y
   * `conMarca`. Si los dos pudieran salir a la vez habría dos logos.
   */
  check('105) el logo no se duplica', /\{!conMarca && \(/.test(cabecera) && /\{conMarca && \(/.test(cabecera));
  check('106) y hace lo de siempre al tocarlo', (cabecera.match(/onPress=\{handleLogoPress\}/g) || []).length === 2);

  /* El lema acompaña: pequeño, peso normal y gris del tema. Nunca el color del texto. */
  check('107) el lema es discreto', /lema: \{\s*fontSize: scale\(11\),\s*fontWeight: FONT_WEIGHT\.regular,/.test(cabecera));
  check('108) y gris, no oscuro', /transparent \? 'rgba\(255,255,255,0\.65\)' : theme\.colors\.textSecondary/.test(cabecera));

  /* Solo lo pide el Home. */
  check('109) las dos pantallas del Home la piden', /conMarca \/>/.test(nativo) && /transparent conMarca \/>/.test(nativo) && /conMarca \/>/.test(web));
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
    /<View style=\{\[styles\.content, conMarca && styles\.contentConMarca\]\}>[\s\S]*?accessibilityLabel="Abrir menú"/.test(cabecera)
      && /<View style=\{\[styles\.content, conMarca && styles\.contentConMarca\]\}>[\s\S]*?styles\.selector,/.test(cabecera));
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
  check('125) la navegación activa, en 600',
    peso('screens/LandingScreen.tsx', 'tabItemTextActive') === 'semibold' && peso('screens/LandingScreen.tsx', 'feedFilterTextActive') === 'semibold');
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
  check('133) con las rutas de siempre',
    JSON.stringify(ids.map(([i]) => i)) === JSON.stringify(['Home', 'Search', 'Create', 'Inbox', 'Profile']));
  check('134) y los nombres de siempre',
    JSON.stringify(ids.map(([, e]) => e)) === JSON.stringify(['Inicio', 'Buscar', 'Crear', 'WeeTalk', 'Perfil']));
  /* Control: esas cinco rutas siguen declaradas en el navegador de pestañas. */
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
  check('160) el Home nativo lo reporta', /reportarScroll\(event\);/.test(leer('screens/LandingScreen.tsx')));
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
  check('175) y Back deshace la navegación: vuelve al Home', /const handleClose = \(\) => \{\s*navigation\.goBack\(\);/.test(crear) && /onPress=\{handleClose\}[\s\S]{0,200}>Back<\/Text>/.test(crear));

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
  check('176) control: solo las dos pantallas del Home piden la barra directa; los muros de sección, no',
    directas.join(' · ') === 'screens/LandingScreen.tsx · screens/WebLandingScreen.tsx' && etiquetas.some((e) => e.archivo === 'components/creator/SectionWall.tsx' && !e.directo),
    etiquetas.map((e) => e.archivo + (e.directo ? ' (directo)' : '')).join(' · '));
  check('177) control: la barra nace sin `directo`, así que quien no lo pide no cambia', /directo = false \}\) =>/.test(puerta) && /const desplegable = !compact && !directo;/.test(puerta));
  /*
   * La barra del Home es el "+" y la pregunta, sin chevron: una flecha de
   * desplegar donde no hay nada que desplegar sería un acordeón mintiendo. El
   * mismo `desplegable` que decide si se abre decide si se dibuja la flecha, y
   * el campo ya ocupa el ancho (`flex: 1`), así que el hueco no queda vacío.
   */
  check('178) la barra cerrada del Home es el "+" y la pregunta, sin chevron',
    /variante === 'home' \? \([\s\S]{0,600}accessibilityLabel="Crear una publicación"/.test(puerta) &&
    /\{desplegable && \(\s*<TouchableOpacity\s*onPress=\{\(\) => setAbierta[\s\S]{0,700}name="chevron-down"/.test(puerta) && !/conChevron/.test(puerta) &&
    /composerField: \{\s*flex: 1,/.test(puerta));
}

console.log('\nHome: quién eres arriba, secciones en el muro');
if (failures > 0) {
  console.error(`\n${failures} comprobación(es) fallida(s)`);
  process.exit(1);
}
