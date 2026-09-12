/*
 * La puerta de publicar de Weë: `components/creator/ComposerEntry.tsx`.
 *
 * Weë tiene UN compositor —`CreateScreen`— y debe tener UNA sola puerta para
 * llegar a él. Antes esa puerta estaba escrita dentro de `SectionWall` y no era
 * un componente, así que llevarla al Home habría significado tener dos copias
 * del mismo bloque envejeciendo por separado. Aquí se vigila justo eso: que la
 * puerta sea una, que esté en los cuatro sitios, y que siga siendo una PUERTA
 * —no publica nada, solo abre— (fase 2E-77).
 *
 * Se lee el código, nunca los comentarios: `soloCodigo` los quita antes de
 * mirar. Y se evita a propósito la aserción floja —"existe esta cadena"— cuando
 * puede pasar por casualidad: donde importa el comportamiento se aísla el
 * bloque que lo decide y se comprueba dentro.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ruta = (p) => path.resolve(here, '../../' + p);
const leer = (p) => fs.readFileSync(ruta(p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/** El código sin comentarios: lo que se prueba es lo que se ejecuta. */
const soloCodigo = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** El cuerpo de una función, desde su nombre hasta que se cierra su llave. */
const cuerpoDe = (fuente, arranque) => {
  const i = fuente.indexOf(arranque);
  if (i < 0) return '';
  let profundidad = 0;
  for (let j = fuente.indexOf('{', i); j < fuente.length; j++) {
    if (fuente[j] === '{') profundidad++;
    else if (fuente[j] === '}' && --profundidad === 0) return fuente.slice(i, j + 1);
  }
  return '';
};

const PUERTA = 'components/creator/ComposerEntry.tsx';
const SUPERFICIES = [
  { nombre: 'SectionWall', archivo: 'components/creator/SectionWall.tsx', handler: 'const compose =', invitado: /navigation\.navigate\('Login'\)/ },
  { nombre: 'Home', archivo: 'screens/LandingScreen.tsx', handler: 'const handleCompose =', invitado: /handleRegister\(\)/ },
  { nombre: 'portada web', archivo: 'screens/WebLandingScreen.tsx', handler: 'const handleCompose =', invitado: /navigate\('Register'\)/ },
];

console.log('\n── A · Una puerta, y una sola ──');
{
  // 1) Existe de verdad, no solo en un import.
  check('1) el componente existe', fs.existsSync(ruta(PUERTA)));

  const puerta = soloCodigo(leer(PUERTA));

  /*
   * 2-5) Las cuatro superficies la usan. No basta con que la importen: se
   * comprueba que la PINTEN, porque un import sin uso no publica nada.
   */
  for (const s of SUPERFICIES) {
    const codigo = soloCodigo(leer(s.archivo));
    // Puede traerse además el tipo `ComposerKind` de la misma puerta: es la
    // fuente única de con qué intenciones se abre el compositor.
    const importa = /import ComposerEntry(?:, \{[^}]*\})? from '[^']*ComposerEntry'/.test(codigo);
    const pinta = /<ComposerEntry\b/.test(codigo);
    check(`2-5) ${s.nombre} usa la puerta compartida`, importa && pinta, importa ? (pinta ? '' : 'la importa pero no la pinta') : 'ni la importa');
  }

  /*
   * 6) Y NINGUNA escribe la suya. Se buscan las piezas que solo existen dentro
   * del compositor —el campo, los chips, el botón—: si reaparecieran en una
   * pantalla, alguien habría copiado el bloque en vez de reutilizarlo.
   */
  const PIEZAS = ['composerField', 'composerChip', 'composerShortcuts', 'publishButton', 'composerFotoCompacta'];
  for (const s of SUPERFICIES) {
    const codigo = soloCodigo(leer(s.archivo));
    const copiadas = PIEZAS.filter((p) => codigo.includes(p));
    check(`6) ${s.nombre} no tiene un compositor propio`, copiadas.length === 0, copiadas.join(', '));
  }
  // Y las piezas sí están donde deben: en la puerta.
  check('6) las piezas del compositor viven en la puerta', PIEZAS.every((p) => puerta.includes(p)));
}

console.log('\n── B · Es una puerta, no un compositor ──');
{
  const puerta = soloCodigo(leer(PUERTA));

  /*
   * 7 y 11) La puerta no publica. Ni escribe en Firestore, ni sabe de destinos,
   * ni pagina. Si algún día alguien intenta "resolverlo aquí para no navegar",
   * esto lo para.
   */
  check('7) no crea publicaciones', !/postsService|addDoc|setDoc|updateDoc|writeBatch/.test(puerta));
  /*
   * Desde el rediseño la puerta SÍ enseña los destinos, y por eso lee sus
   * nombres de la fuente única. Lo que no hace —y es lo que hay que vigilar— es
   * DECIDIRLOS: no guarda estado de selección, no filtra y no escribe el campo.
   * Elegir destinos se hace en `CreateScreen` y solo ahí.
   */
  check('7) los nombres de los destinos salen de la fuente única', /destinosDisponibles\(\)/.test(puerta) && !/'Weë Chef'|'Weë Design'|'Muro general'/.test(puerta));
  /*
   * La puerta puede tener estado SUYO —desde 2E-80 se pliega—, pero nunca
   * estado de lo que se publica: ni destinos elegidos, ni texto, ni medios. Por
   * eso se mira qué guarda, no si guarda algo.
   */
  // El paréntesis va pegado: si no, el `useState` del import se comía hasta el siguiente.
  const loQueGuarda = [...puerta.matchAll(/useState(?:<[^>]*>)?\(([^)]*)\)/g)].map((m) => m[1].trim());
  check('7) solo guarda si está abierta o cerrada', loQueGuarda.join(' | ') === 'false', loQueGuarda.join(' | '));
  check('7) y no decide destinos', !/destinations:/.test(puerta) && !/postsDeLaSeccion|alternarDestino|setDestino/.test(puerta));
  check('7) ni de paginación', !/paginaDelMuroGeneral|paginaDeLaSeccion|getMuroGeneralPaginado|sobreconsulta|hayMas|lastDoc/.test(puerta));
  check('11) lo único que hace al tocarla es avisar a quien la puso', /onCompose\(/.test(puerta) && !/navigation|navigate/.test(puerta));

  /*
   * 12) Los controles completos son de `CreateScreen` y solo de ahí. La puerta
   * lleva los tres atajos de siempre —Foto, Video, Pregunta— y ninguno de los
   * cinco del compositor.
   */
  const compositor = leer('screens/CreateScreen.tsx');
  const CONTROLES = ['Cámara', 'Foto o vídeo', 'ËContact', 'Ubicación', 'Encuesta'];
  check('12) los cinco controles están en CreateScreen', CONTROLES.every((c) => compositor.includes(`texto="${c}"`)));
  /*
   * La puerta los NOMBRA —son sus cinco atajos y cada uno lleva su nombre para
   * el lector de pantalla— pero no los IMPLEMENTA: ni abre la galería, ni la
   * cámara, ni monta una encuesta. Eso es lo que separa un atajo de una copia.
   */
  check('12) la puerta nombra los cinco atajos', CONTROLES.every((c) => puerta.includes(`etiqueta: '${c}'`)));
  check('12) pero no implementa ninguno', !/ImagePicker|expo-image-picker|launchCamera|MediaTypeOptions|PostPoll|etiquetaDeLugar/.test(puerta));

  /*
   * 12b) Solo iconos en esas cinco pastillas (fase 2E-78): cinco nombres en 375
   * puntos obligan a letra diminuta. El nombre viaja en `accessibilityLabel`.
   */
  // Del estilo de la pastilla hasta que se cierra: `[^>]*` tropezaba con la flecha del onPress.
  const iChip = puerta.indexOf('styles.composerChip,');
  const pastilla = iChip < 0 ? '' : puerta.slice(iChip, puerta.indexOf('</TouchableOpacity>', iChip));
  check('12b) las cinco pastillas son solo icono', /<Ionicons/.test(pastilla) && !/<Text/.test(pastilla));
  check('12b) foto y vídeo comparten una sola pastilla', (puerta.match(/etiqueta: 'Foto o vídeo'/g) || []).length === 1 && !/etiqueta: 'Foto'|etiqueta: 'Video'/.test(puerta));
  check('12b) y ya no hay atajo de "Pregunta"', !/etiqueta: 'Pregunta'/.test(puerta));
}

console.log('\n── C · A dónde lleva, y con quién ──');
{
  /*
   * 8, 9 y 10) El flujo, comprobado DENTRO del handler de cada superficie y no
   * en el archivo entero: una pantalla puede nombrar 'Create' en cualquier otro
   * sitio, y entonces la prueba pasaría sin comprobar nada.
   */
  for (const s of SUPERFICIES) {
    const codigo = soloCodigo(leer(s.archivo));
    const handler = cuerpoDe(codigo, s.handler);
    /*
     * "Lleva al compositor" puede escribirse de dos formas: pidiéndolo aquí
     * mismo, o llamando al ayudante que esa pantalla tenga para ello. Lo que se
     * comprueba es que el handler LLEVE, no cómo se escribe la llamada.
     */
    const alCompositor = /navigate\('Create'|irAlCompositor\(/;
    check(`8) ${s.nombre}: la puerta lleva al compositor de siempre`, alCompositor.test(handler), handler ? '' : 'no encuentro el handler');
    check(`9) ${s.nombre}: sin sesión no se llega a publicar`, /!user/.test(handler) && s.invitado.test(handler));
    // 10) Con sesión, y solo con sesión, se abre CreateScreen.
    const trasElGuardia = handler.slice(handler.indexOf('!user'));
    check(`10) ${s.nombre}: con sesión abre CreateScreen`, alCompositor.test(trasElGuardia));
  }

  /*
   * 10b) Y llega al compositor DE VERDAD.
   *
   * Hay dos rutas llamadas `Create`: la del MainStack, que es el compositor, y
   * la de la barra de pestañas, que no tiene pantalla y devuelve null. Pedirlo a
   * un solo nivel se queda en la pestaña y deja a la persona en una pantalla
   * vacía. Por eso hay que subir dos: al padre del padre.
   */
  for (const archivo of ['screens/LandingScreen.tsx', 'screens/WebLandingScreen.tsx']) {
    const codigo = soloCodigo(leer(archivo));
    const sube = /navigation\.getParent\(\)[\s\S]{0,160}\?\.getParent\(\)[\s\S]{0,200}navigate\('Create'/.test(codigo);
    check(`10b) ${archivo.split('/').pop()} sube hasta el navegador que tiene el compositor`, sube);
  }

  /*
   * El contexto viaja donde tiene sentido: una sección dice de dónde viene, y
   * el Home no viene de ninguna, así que no manda `sourceSection` y el
   * compositor preselecciona el muro general él solo.
   */
  const muro = soloCodigo(leer('components/creator/SectionWall.tsx'));
  check('8) publicar desde una sección conserva su contexto', /navigate\('Create', \{ kind, sourceSection: sectionId \}\)/.test(muro));
  for (const s of SUPERFICIES.filter((x) => x.nombre !== 'SectionWall')) {
    const handler = cuerpoDe(soloCodigo(leer(s.archivo)), s.handler);
    check(`8) ${s.nombre} no inventa una sección de origen`, !/sourceSection/.test(handler));
  }
}

console.log('\n── D · El Home, después del cambio ──');
{
  const home = leer('screens/LandingScreen.tsx');
  const homeWeb = leer('screens/WebLandingScreen.tsx');

  /*
   * 14) El bloque de Comunidades no vuelve al Home. Es decisión de producto: se
   * llega a comunidades por Buscar y se crean desde el menú, así que repetir el
   * acceso arriba solo quitaba sitio a lo que la gente publica.
   */
  const RASTROS = ['Encuentra las tuyas.', 'Buscar comunidades...', 'Crear comunidad'];
  check('14) el Home no trae de vuelta el bloque de Comunidades', !RASTROS.some((r) => home.includes(r) || homeWeb.includes(r)));
  check('14) ni lo importa', !/CommunitiesEntry/.test(home) && !/CommunitiesEntry/.test(homeWeb));
  check('14) ni deja handlers muertos de aquello', !/handleSearchCommunities|handleCreateCommunity/.test(home + homeWeb));

  // 15) Y el orden: publicar antes que los Weëls, en las dos portadas.
  const antesDeWeels = (fuente, marca) => {
    const puerta = fuente.indexOf('<ComposerEntry');
    const weels = fuente.indexOf(marca);
    return puerta > 0 && weels > 0 && puerta < weels;
  };
  check('15) en el Home se publica antes de los Weëls', antesDeWeels(soloCodigo(home), 'renderWeelsRow'));
  check('15) y en la portada web también', antesDeWeels(soloCodigo(homeWeb), '<WeelsRow'));
}

console.log('\n── E · Lo que NO se ha roto ──');
{
  /*
   * 16) Comunidades sigue teniendo sus dos caminos, y el componente sigue vivo
   * donde de verdad se usa. Quitarlo del Home no podía dejar a nadie sin llegar.
   */
  check('16) se descubren comunidades desde Buscar', /communityService/.test(leer('screens/SearchScreen.tsx')));
  check('16) y se crean desde ☰ → Explora → Comunidades', /navigate\('ExploreCommunities'\)/.test(soloCodigo(leer('components/DrawerMenu.tsx'))));
  check('16) el bloque de comunidades sigue usándose en la barra lateral', /<CommunitiesEntry\b/.test(soloCodigo(leer('components/RightSidebar.tsx'))));

  // 17) El muro de una sección sigue respetando los destinos (Bloque 2, intacto).
  const muro = soloCodigo(leer('components/creator/SectionWall.tsx'));
  check('17) la sección sigue filtrando por destinos', /postsDeLaSeccion\(posts, sectionId\)/.test(muro));
  check('17) y sigue paginando con cursor', /paginaDeLaSeccion\(pagina, sectionId, VISIBLES, desde\)/.test(muro) && /hayMas/.test(muro));

  // 18) Travel sigue siendo el muro general, sin feed propio ni pestañas.
  check('18) Travel no filtra por sección', /if \(general\) return posts;/.test(muro));
  check('18) y no ha recuperado pestañas propias', !/Muro Travel/.test(muro) && !/tabs: \[/.test(soloCodigo(leer('constants/specialists.ts')).slice(soloCodigo(leer('constants/specialists.ts')).indexOf('  travel: {'))));

  /*
   * 19) Y nada del muro de previsualización se ha colado por el camino: es del
   * Bloque 3 y todavía no ha entrado.
   */
  const TOCADOS = [PUERTA, 'components/creator/SectionWall.tsx', 'screens/LandingScreen.tsx', 'screens/WebLandingScreen.tsx'];
  const PREVIEW = ['previewWall', 'publicacionesDePreview', 'WALL_PREVIEW'];
  check('19) no se ha reintroducido el muro de previsualización', !TOCADOS.some((f) => PREVIEW.some((p) => leer(f).includes(p))));
}

console.log('\n── F · Lo que se toca, se toca ──');
{
  const puerta = leer(PUERTA);
  /*
   * 13) `scale()` quita un 10% en web, así que un objetivo táctil que pase por
   * ella deja de cumplir el mínimo justo donde el ratón no perdona. El atajo de
   * foto se declara con 44 literales, y así se queda.
   */
  check('13) el atajo de foto conserva su mínimo táctil sin escalar', /composerFotoCompacta: \{\s*width: 44,\s*height: 44,/.test(puerta));
  /*
   * La caja FIJA de 44 no pasa por `scale()`; el `minHeight` del campo sí, y
   * está bien: no es una caja táctil, es un mínimo que crece con la letra. La
   * primera versión de esta prueba prohibía `scale(44)` a secas y se
   * contradecía con la de abajo.
   */
  check('13) y esa caja fija no pasa por scale()', !/width: scale\(44\)|height: scale\(44\)/.test(puerta));
  // El campo y las pastillas siguen siendo cómodos de tocar.
  const alturaCampo = Number((puerta.match(/composerField: \{[\s\S]*?minHeight: scale\((\d+)\)/) || [])[1]);
  check('13) el campo mantiene alto de sobra para el pulgar', alturaCampo >= 44, `${alturaCampo}`);
  check('13) y las pastillas de atajo también', /composerChip: \{[\s\S]*?minHeight: 44,/.test(puerta));
  check('13) el botón de publicar es el más grande de la tarjeta', /publishButton: \{[\s\S]*?minHeight: 48,/.test(puerta));

  /*
   * Y lo que el rediseño promete a la vista: los destinos SÍ llevan su nombre
   * escrito —al revés que los atajos— y publicar es la acción principal.
   */
  check('13) los destinos enseñan su nombre', /styles\.destinoTexto[\s\S]*?\{destino\.nombre\}/.test(puerta));
  check('13) y publicar lleva su icono de enviar', /paper-plane-outline/.test(puerta) && /styles\.publishText/.test(puerta));
}

console.log('\n── G · La fila de destinos es un carrusel ──');
{
  const puerta = soloCodigo(leer(PUERTA));
  // El bloque de la fila: desde el ScrollView hasta que se cierra.
  const iFila = puerta.indexOf('<ScrollView');
  const fila = iFila < 0 ? '' : puerta.slice(iFila, puerta.indexOf('</ScrollView>', iFila));

  /*
   * 2, 3 y 9) Una sola fila que se desliza. Ni envuelve a una segunda línea
   * —`flexWrap` la partiría y encarecería la tarjeta— ni deja la barra de scroll
   * a la vista.
   */
  check('2) los destinos van en una fila horizontal', /<ScrollView\s+horizontal/.test(fila));
  check('3) y esa fila se desliza sin barra a la vista', /showsHorizontalScrollIndicator=\{false\}/.test(fila));
  check('9) no se parte en una segunda fila', !/flexWrap/.test(puerta.slice(puerta.indexOf('destinos: {'))));

  /*
   * 4) Sin tope artificial: se pintan TODOS los que devuelva la fuente. El
   * `.slice()` que hay es una copia para poder ordenar sin tocar el original,
   * no un recorte —por eso se busca `slice(0, n)` y no `slice(`—.
   */
  check('4) se pintan todos los destinos, sin recortar', /destinosDisponibles\(\)/.test(fila) && !/\.slice\(\s*0\s*,\s*\d+\s*\)/.test(puerta) && !/\.filter\(/.test(fila));

  /*
   * Y que se note que hay más: la fila sangra hasta el borde de la tarjeta, así
   * que lo que sobra lo corta el borde redondeado y no el padding interior.
   */
  check('carrusel) la fila llega al borde de la tarjeta', /filaDestinos: \{\s*marginHorizontal: -SPACING\.md,/.test(puerta) && /destinos: \{[\s\S]*?paddingHorizontal: SPACING\.md,/.test(puerta));

  // 8) Y tocar un destino sigue abriendo el compositor, como el resto de la tarjeta.
  const iDestino = puerta.indexOf('styles.destino,');
  const pastillaDestino = iDestino < 0 ? '' : puerta.slice(puerta.lastIndexOf('<TouchableOpacity', iDestino), puerta.indexOf('</TouchableOpacity>', iDestino));
  check('8) tocar un destino abre el compositor, no lo selecciona', /onPress=\{\(\) => onCompose\('post'\)\}/.test(pastillaDestino) && !/setDestino|alternar|selected/.test(pastillaDestino));
}

console.log('\n── H · La tarjeta se pliega ──');
{
  const puerta = soloCodigo(leer(PUERTA));

  /*
   * Cerrada es una fila con la pregunta; abierta, todo lo de siempre. Abierta
   * ocupaba media pantalla antes del primer post, y en el Home lo primero que
   * se ve debe ser gente (fase 2E-80).
   */
  check('pliegue) arranca cerrada', /useState\(false\)/.test(puerta));
  check('pliegue) cerrada no enseña ni atajos, ni destinos, ni Publicar', /\{desplegable && abierta && \(/.test(puerta));
  check('pliegue) la pregunta se ve siempre', puerta.indexOf('styles.composerField') < puerta.indexOf('desplegable && abierta'));

  // Tocar la fila cerrada la abre; abierta, el campo lleva al compositor como siempre.
  check('pliegue) cerrada, tocarla despliega', /desplegable && !abierta \? setAbierta\(true\) : onCompose\('post'\)/.test(puerta));

  // Y se cierra: el chevron va en los dos sentidos y lo dice en accesibilidad.
  check('pliegue) se puede volver a cerrar', /setAbierta\(\(estaba\) => !estaba\)/.test(puerta));
  check('pliegue) el estado se anuncia a quien no ve', (puerta.match(/expanded: abierta/g) || []).length >= 2);

  /*
   * La variante de una sola fila (Weë Travel) no se pliega: ya es el mínimo, y
   * darle un chevron que no abre nada sería mentir.
   */
  check('pliegue) la fila compacta no gana chevron', /const desplegable = !compact && !directo;/.test(puerta) && /\{desplegable && \(/.test(puerta));
  /*
   * Y el Home tampoco se pliega, pero por otra razón: va DIRECTO a "Crear
   * publicación" (grupo I). Sin pliegue no hay chevron: el mismo `desplegable`
   * que decide si se abre decide si se dibuja la flecha.
   */
  check('pliegue) el Home no se pliega ni lleva chevron: va directo',
    /const desplegable = !compact && !directo;/.test(puerta) && /\{desplegable && \(\s*<TouchableOpacity\s*onPress=\{\(\) => setAbierta/.test(puerta) && !/conChevron/.test(puerta));
}

console.log('\n── I · El Home va directo al compositor ──');
{
  /*
   * Aquí se EJECUTA la puerta, no se lee. Se transpila `ComposerEntry.tsx` tal
   * cual está, se le dan por debajo unas piezas mínimas en lugar de React
   * Native —una caja, un texto, un botón que recuerda qué hace al tocarlo— y se
   * dibuja con el renderizador de servidor de React. El estado de apertura se
   * guarda entre dibujados, así que se puede tocar un control y volver a
   * dibujar para ver qué pasó: exactamente lo que haría una persona.
   *
   * Lo que se afirma: en el Home (`directo`) la barra cerrada es lo único que
   * hay, tocar la pregunta, el "+" o el chevron avisa a quien la puso —que es
   * quien navega a "Crear publicación"— y NADA se despliega. Y el control: un
   * muro de sección, sin `directo`, sigue desplegándose como siempre.
   */
  const { createRequire } = await import('node:module');
  const requerir = createRequire(ruta('package.json'));
  const React = requerir('react');
  const { renderToStaticMarkup } = requerir('react-dom/server');
  const ts = requerir('typescript');
  const h = React.createElement;

  /* Lo que cada dibujado deja: los botones con lo que hacen, en orden. */
  let botones = [];
  /* El estado entre dibujados: `useState` de verdad no sobrevive al servidor. */
  let estados = [];
  let indice = 0;
  const useState = (inicial) => {
    const i = indice++;
    if (!(i in estados)) estados[i] = typeof inicial === 'function' ? inicial() : inicial;
    const poner = (valor) => { estados[i] = typeof valor === 'function' ? valor(estados[i]) : valor; };
    return [estados[i], poner];
  };

  const Caja = ({ children, accessibilityLabel }) => h('div', accessibilityLabel ? { 'aria-label': accessibilityLabel } : null, children);
  const Texto = ({ children }) => h('span', null, children);
  const Boton = ({ children, onPress, accessibilityLabel, accessibilityState }) => {
    botones.push({ etiqueta: accessibilityLabel, tocar: onPress, expandido: accessibilityState ? accessibilityState.expanded : undefined });
    return h('button', { 'aria-label': accessibilityLabel }, children);
  };
  class Valor { constructor(v) { this.v = v; } interpolate() { return '0deg'; } setValue() {} }
  const animacion = () => ({ start() {} });
  const reactNative = {
    View: Caja, Text: Texto, ScrollView: Caja, TouchableOpacity: Boton,
    StyleSheet: { create: (s) => s },
    Animated: { Value: Valor, spring: animacion, timing: animacion, View: Caja },
  };
  const colores = new Proxy({}, { get: () => '#000000' });

  const aCommonJS = (archivo) =>
    ts.transpileModule(leer(archivo), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
  /* Módulos de verdad (puros) o piezas mínimas, según lo que pide cada import. */
  const cargar = (archivo) => {
    const modulo = { exports: {} };
    new Function('require', 'module', 'exports', aCommonJS(archivo))(pedir, modulo, modulo.exports);
    return modulo.exports;
  };
  const cache = {};
  const pedir = (peticion) => {
    if (peticion === 'react') return { ...React, useState };
    if (peticion === 'react-native') return reactNative;
    if (peticion === '@expo/vector-icons') return { Ionicons: ({ name }) => h('i', { 'data-icono': name }) };
    if (/ThemeContext$/.test(peticion)) return { useTheme: () => ({ theme: { colors: colores } }) };
    if (/UserProfileContext$/.test(peticion)) return { useUserProfile: () => ({ userProfile: null }) };
    if (/AvatarDisplay$/.test(peticion)) return { __esModule: true, default: () => h('span', null, 'avatar') };
    if (/utils\/scale$/.test(peticion)) return { scale: (n) => n };
    if (/firestoreService$/.test(peticion)) return {};
    const real = { 'utils/sectionFeed': 'utils/sectionFeed.ts', 'constants/weeExperiences': 'constants/weeExperiences.ts', 'constants/design': 'constants/design.ts' };
    const clave = Object.keys(real).find((k) => peticion.endsWith(k));
    if (!clave) throw new Error('import sin pieza en la prueba: ' + peticion);
    return (cache[clave] ||= cargar(real[clave]));
  };

  const ComposerEntry = cargar(PUERTA).default;

  /* Una barra recién montada, con quien la puso apuntando cada aviso. */
  const montar = (props) => {
    const avisos = [];
    estados = [];
    const dibujar = () => {
      botones = [];
      indice = 0;
      const html = renderToStaticMarkup(h(ComposerEntry, { ...props, onCompose: (kind) => avisos.push(kind) }));
      return { html, botones: botones.slice() };
    };
    const boton = (dibujo, etiqueta) => dibujo.botones.find((b) => b.etiqueta === etiqueta);
    return { avisos, dibujar, boton };
  };
  const DESPLEGADO = ['Cámara', 'Foto o vídeo', 'Ubicación', 'ËContact', 'Encuesta', 'Publicar'];
  const desplegado = (dibujo) => DESPLEGADO.filter((e) => dibujo.botones.some((b) => b.etiqueta === e));

  /* ── 1 · El Home muestra únicamente el Composer cerrado: el "+" y la pregunta ── */
  const home = montar({ placeholder: '¿Qué quieres compartir?', variante: 'home', directo: true });
  const cerrado = home.dibujar();
  check('1) el Home dibuja la barra cerrada: el "+" y la pregunta, nada más',
    cerrado.botones.map((b) => b.etiqueta).join(' · ') === 'Crear una publicación · ¿Qué quieres compartir?',
    cerrado.botones.map((b) => b.etiqueta).join(' · '));
  check('1) sin chevron ni flecha alguna', !/chevron/.test(cerrado.html) && !cerrado.botones.some((b) => /opciones de publicar/.test(b.etiqueta)));
  check('1) y nada más: ni atajos, ni destinos, ni Publicar', desplegado(cerrado).length === 0 && !/Publicar/.test(cerrado.html), desplegado(cerrado).join(' · '));
  check('1) la pregunta se lee entera', /¿Qué quieres compartir\?/.test(cerrado.html));
  check('1) y ningún control se anuncia como desplegable', cerrado.botones.every((b) => b.expandido === undefined));

  /* ── 2 y 3 · Tocar la barra NO la despliega: navega ── */
  home.boton(cerrado, '¿Qué quieres compartir?').tocar();
  check('2) tocar la pregunta avisa a quien puso la barra, con kind "post"', home.avisos.join(',') === 'post', home.avisos.join(','));
  const trasTocar = home.dibujar();
  check('2) y la barra sigue cerrada después de tocarla', trasTocar.html === cerrado.html && desplegado(trasTocar).length === 0);
  check('2) el estado de apertura ni se ha tocado', estados.every((e) => e === false), JSON.stringify(estados));

  /* ── 4 · El "+" hace exactamente lo mismo ── */
  home.boton(trasTocar, 'Crear una publicación').tocar();
  check('4) el "+" avisa igual, con el mismo kind', home.avisos.join(',') === 'post,post', home.avisos.join(','));
  check('4) y tras los dos toques la barra sigue igual de cerrada', home.dibujar().html === cerrado.html);

  /* ── 8 · Control: un muro de sección, sin `directo`, se despliega como siempre ── */
  const muro = montar({ placeholder: 'Comparte tu plato…', seccion: 'chef' });
  const muroCerrado = muro.dibujar();
  check('8) control: el muro arranca cerrado', desplegado(muroCerrado).length === 0 && muro.boton(muroCerrado, 'Comparte tu plato… Abre las opciones de publicar.')?.expandido === false);
  check('8) control: y conserva su chevron', /chevron-down/.test(muroCerrado.html) && muro.boton(muroCerrado, 'Mostrar las opciones de publicar')?.expandido === false);
  muro.boton(muroCerrado, 'Comparte tu plato… Abre las opciones de publicar.').tocar();
  const muroAbierto = muro.dibujar();
  check('8) control: tocarlo lo despliega en vez de navegar', muro.avisos.length === 0 && desplegado(muroAbierto).length === DESPLEGADO.length, desplegado(muroAbierto).join(' · '));
  check('8) control: y ahora lo anuncia abierto', muro.boton(muroAbierto, 'Comparte tu plato…')?.expandido === true && muro.boton(muroAbierto, 'Ocultar las opciones de publicar') !== undefined);
  muro.boton(muroAbierto, 'Publicar').tocar();
  check('8) control: abierto, Publicar sí avisa', muro.avisos.join(',') === 'post');
  /* Y la fila compacta (Weë Travel) sigue sin chevron y sin pliegue. */
  const compacta = montar({ placeholder: 'Comparte tu viaje…', compact: true, seccion: 'travel' });
  const compactaDibujo = compacta.dibujar();
  check('8) control: la fila compacta sigue sin chevron', compactaDibujo.botones.map((b) => b.etiqueta).join(' · ') === 'Comparte tu viaje… · Compartir una foto', compactaDibujo.botones.map((b) => b.etiqueta).join(' · '));
  compacta.boton(compactaDibujo, 'Comparte tu viaje…').tocar();
  check('8) control: y va al compositor sin desplegarse', compacta.avisos.join(',') === 'post' && desplegado(compacta.dibujar()).length === 0);

  /* ── 5 · Una sola puerta, y `directo` es una decisión de quien la pone ── */
  const puerta = soloCodigo(leer(PUERTA));
  check('5) `directo` nace apagado: nadie lo hereda sin pedirlo', /directo = false \}\) =>/.test(puerta));
  check('5) y solo quita el pliegue y su chevron: el "+" y la pregunta no cambian',
    /const desplegable = !compact && !directo;/.test(puerta) && /variante === 'home' \? \(/.test(puerta) && /onPress=\{tocarCampo\}/.test(puerta) && !/conChevron/.test(puerta));
  check('5) el Home lo pide en sus dos pantallas',
    /<ComposerEntry placeholder="¿Qué quieres compartir\?" onCompose=\{handleCompose\} variante="home" directo \/>/.test(leer('screens/LandingScreen.tsx')) &&
    /<ComposerEntry placeholder="¿Qué quieres compartir\?" onCompose=\{handleCompose\} variante="home" directo \/>/.test(leer('screens/WebLandingScreen.tsx')));
  check('5) una sola instancia por pantalla del Home',
    (leer('screens/LandingScreen.tsx').match(/<ComposerEntry/g) || []).length === 1 && (leer('screens/WebLandingScreen.tsx').match(/<ComposerEntry/g) || []).length === 1);
  check('5) control: el muro de sección no lo pide', !/directo/.test(soloCodigo(leer('components/creator/SectionWall.tsx'))));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nUna sola puerta para publicar en todo Weë, y sigue siendo una puerta');
process.exit(failures ? 1 : 0);
