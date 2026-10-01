/*
 * EL TECLADO NO TAPA LO QUE SE ESCRIBE.
 *
 * Weë se dibuja de borde a borde en Android (`edgeToEdgeEnabled=true`), así que
 * React Native llama a `setDecorFitsSystemWindows(false)` al arrancar y el
 * `adjustResize` del manifiesto queda inerte: la ventana YA NO SE ENCOGE cuando
 * sale el teclado.
 *
 * Eso rompe el `KeyboardAvoidingView` de React Native, que calcula el solape así:
 *
 *     Math.max(frame.y + frame.height - keyboardY, 0)
 *
 * `keyboardY` sale de `screenY`, y `ReactRootView` lo mide sobre la ventana
 * entera —que no se encogió—, de modo que cualquier contenedor que llegue abajo
 * da CERO. Cero relleno, la interfaz no se mueve, el teclado tapa el campo.
 *
 * Tres pantallas ya lo habían resuelto a mano, cada una a su manera, y el resto
 * de Weë se quedó sin acomodo. `components/EspacioDeEscritura.tsx` recoge ese
 * patrón y lo deja en un sitio.
 *
 * Son cosas que se rompen en silencio: nadie ve un error, simplemente el campo
 * queda debajo del teclado. Por eso aquí se vigilan tres cosas distintas:
 *
 *  1. la REGLA DE PLATAFORMA del componente, ejecutándolo de verdad;
 *  2. el INVENTARIO: que ninguna superficie con campos se quede sin acomodo,
 *     para que una experiencia nueva no herede el fallo sin que nadie lo note;
 *  3. que los scroll que conviven con un campo dejen pasar el primer toque.
 *
 * La parte de lógica se EJECUTA —sin red, sin Firestore, sin abrir la app—; del
 * resto se lee el código. Cada grupo lleva un control para que un verde no pueda
 * ser un verde vacío.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');

console.log('\n─── A. La regla de plataforma, ejecutada ───');

/*
 * Se ejecuta el componente de verdad. Para eso se transpila el TSX a
 * `React.createElement`, se le quitan los imports y se le inyectan un React y un
 * react-native de mentira: así se puede llamar a la función con cada plataforma
 * y mirar QUÉ DEVUELVE, que es lo que de verdad importa.
 */
const fuenteEspacio = leer('components/EspacioDeEscritura.tsx');
const jsEspacio = ts.transpileModule(fuenteEspacio, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React,
  },
}).outputText;

/* Fuera los imports y los export: los sustituyen las piezas de mentira. */
const cuerpoEspacio = jsEspacio
  .replace(/^\s*import[^;]*;\s*$/gm, '')
  .replace(/^\s*export default .*;\s*$/gm, '')
  .replace(/^(\s*)export (const|function|let|var) /gm, '$1$2 ');

const construir = (plataforma, cuerpo = cuerpoEspacio) => {
  const React = {
    createElement: (type, props, ...children) => ({
      tipo: typeof type === 'string' ? type : type?.nombre || String(type),
      props: props || {},
      children,
    }),
  };
  const Platform = { OS: plataforma };
  const KeyboardAvoidingView = { nombre: 'KeyboardAvoidingView' };
  const View = { nombre: 'View' };
  const Keyboard = { addListener: () => ({ remove: () => {} }) };
  /* Sin teclado abierto: es el estado en el que arranca cualquier pantalla. */
  const useState = (inicial) => [inicial, () => {}];
  const useEffect = () => {};

  const fabrica = new Function(
    'React', 'Platform', 'KeyboardAvoidingView', 'View', 'Keyboard', 'useState', 'useEffect',
    `${cuerpo}\n return { EspacioDeEscritura, useAlturaDelTeclado };`
  );
  return fabrica(React, Platform, KeyboardAvoidingView, View, Keyboard, useState, useEffect);
};

const render = (plataforma, props = {}, cuerpo) => {
  const { EspacioDeEscritura } = construir(plataforma, cuerpo);
  return EspacioDeEscritura({ children: 'contenido', ...props });
};

const enIos = render('ios', { desplazamientoIos: 44 });
check(
  'en iOS sí usa KeyboardAvoidingView, que allí mide bien',
  enIos.tipo === 'KeyboardAvoidingView',
  `devolvió ${enIos.tipo}`
);
check(
  "en iOS el comportamiento es 'padding'",
  enIos.props.behavior === 'padding',
  `behavior=${JSON.stringify(enIos.props.behavior)}`
);
check(
  'en iOS el desplazamiento llega como keyboardVerticalOffset',
  enIos.props.keyboardVerticalOffset === 44,
  `keyboardVerticalOffset=${enIos.props.keyboardVerticalOffset}`
);

const enAndroid = render('android', { desplazamientoIos: 44 });
check(
  'en Android NO usa KeyboardAvoidingView: allí siempre calcularía cero',
  enAndroid.tipo === 'View',
  `devolvió ${enAndroid.tipo}`
);
check(
  'en Android no queda ningún behavior colgando',
  enAndroid.props.behavior === undefined,
  `behavior=${JSON.stringify(enAndroid.props.behavior)}`
);
check(
  'en Android el desplazamiento de iOS no se aplica',
  enAndroid.props.keyboardVerticalOffset === undefined,
  `keyboardVerticalOffset=${enAndroid.props.keyboardVerticalOffset}`
);

const enWeb = render('web');
check('en web es un View normal: el navegador ya se encarga', enWeb.tipo === 'View', `devolvió ${enWeb.tipo}`);

/* El `style` que le pasa cada pantalla tiene que sobrevivir al cambio. */
const conEstilo = render('android', { style: { flex: 1 } });
const estiloPlano = JSON.stringify(conEstilo.props.style);
check(
  'el style de la pantalla se conserva',
  estiloPlano.includes('"flex":1'),
  `style=${estiloPlano}`
);

/*
 * CONTROL, por mutación: se fuerza el error antiguo —tratar Android como iOS— y
 * se comprueba que la prueba de arriba SÍ lo caza. Sin esto, "en Android devuelve
 * un View" podría estar pasando por cualquier motivo.
 */
const cuerpoMutado = cuerpoEspacio.replace(/Platform\.OS === 'ios'/g, 'true');
check(
  'CONTROL: la mutación de prueba es distinta del original',
  cuerpoMutado !== cuerpoEspacio,
  'si no cambiara nada, el control no probaría nada'
);
const androidMutado = render('android', {}, cuerpoMutado);
check(
  'CONTROL: tratar Android como iOS vuelve a dar KeyboardAvoidingView, y se detecta',
  androidMutado.tipo === 'KeyboardAvoidingView',
  `devolvió ${androidMutado.tipo}`
);

console.log('\n─── B. Inventario: ninguna superficie con campos sin acomodo ───');

const recorrer = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.')) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? recorrer(p) : p.endsWith('.tsx') ? [p] : [];
  });

const superficies = [...recorrer(path.join(RAIZ, 'screens')), ...recorrer(path.join(RAIZ, 'components'))]
  .map((f) => ({ rel: path.relative(RAIZ, f).replace(/\\/g, '/'), src: fs.readFileSync(f, 'utf8') }))
  .filter((x) => /<TextInput/.test(x.src));

check('el inventario encuentra superficies de escritura', superficies.length >= 25, `${superficies.length} superficies`);

/*
 * Un campo que vive ARRIBA —un buscador bajo la cabecera— no necesita acomodo:
 * el teclado sale por debajo y el campo se queda a la vista. Se listan uno a uno,
 * con su motivo, para que la excepción sea una decisión y no un olvido.
 */
const ARRIBA_DEL_TECLADO = {
  'components/CommunitiesEntry.tsx': 'buscador de comunidades, bajo la cabecera del Home',
  'components/RightSidebar.tsx': 'columna derecha de escritorio: no hay teclado de teléfono',
  'screens/InboxScreen.tsx': 'buscador en la cabecera de WeeTalk',
  'screens/SearchScreen.tsx': 'buscador en la cabecera',
  'screens/WeeBizScreen.tsx': 'buscador en la cabecera de Weë Biz',
  'screens/ChatScreen.tsx': 'pantalla sin ruta: no está enlazada en la navegación',
};

/*
 * Las piezas de `components/creator/` y `components/business/` no se pintan
 * nunca solas: viven dentro de `CreatorShell`, que ya acomoda el teclado para
 * toda la pantalla. Pedirles que lo hagan otra vez sería acomodarlo dos veces.
 */
const acomoda = (x) =>
  /EspacioDeEscritura/.test(x.src) ||
  /useAlturaDelTeclado/.test(x.src) ||
  /Keyboard\.addListener/.test(x.src) ||
  /CreatorShell/.test(x.src) ||
  x.rel.startsWith('components/creator/') ||
  x.rel.startsWith('components/business/');

const desatendidas = superficies.filter((x) => !acomoda(x) && !(x.rel in ARRIBA_DEL_TECLADO));

check(
  'ninguna superficie con campos se queda sin acomodo',
  desatendidas.length === 0,
  desatendidas.length ? desatendidas.map((x) => x.rel).join(', ') : 'todas atendidas'
);

/* Las excepciones tienen que seguir existiendo: si una se va, sobra en la lista. */
const excepcionesFantasma = Object.keys(ARRIBA_DEL_TECLADO).filter(
  (rel) => !superficies.some((x) => x.rel === rel)
);
check(
  'la lista de excepciones no tiene fantasmas',
  excepcionesFantasma.length === 0,
  excepcionesFantasma.join(', ') || 'todas siguen existiendo'
);

/* CONTROL: una superficie inventada sin acomodo TIENE que caer. */
const falsa = { rel: 'screens/PantallaInventada.tsx', src: '<TextInput value={x} />' };
check(
  'CONTROL: una pantalla nueva sin acomodo sería detectada',
  !acomoda(falsa) && !(falsa.rel in ARRIBA_DEL_TECLADO),
  'si esto pasara, el inventario no protegería nada'
);

console.log('\n─── C. El primer toque llega a su destino ───');

/*
 * Sin `keyboardShouldPersistTaps`, un scroll se traga el primer toque mientras
 * el teclado está abierto: en vez de llegar al botón, solo cierra el teclado.
 */
const CON_SCROLL_Y_CAMPO = [
  'components/creator/CreatorShell.tsx',
  'components/creator/ProjectPicker.tsx',
  'components/RightSidebar.tsx',
  'screens/CommunitiesManagementScreen.tsx',
  'screens/InboxScreen.tsx',
  'screens/PostDetailScreen.tsx',
  'screens/WeeBizProfileScreen.tsx',
  'screens/WeeBizScreen.tsx',
];

for (const rel of CON_SCROLL_Y_CAMPO) {
  const src = leer(rel);
  const pasa = /keyboardShouldPersistTaps=["{]?["']?handled/.test(src);
  check(`${rel} deja pasar el toque`, pasa, pasa ? '' : 'falta keyboardShouldPersistTaps="handled"');
}

/* CONTROL: el patrón que se busca no casa con cualquier cosa. */
check(
  'CONTROL: el patrón de persistencia no casa con un archivo sin él',
  !/keyboardShouldPersistTaps=["{]?["']?handled/.test('<ScrollView style={x}>'),
  'el patrón sería demasiado laxo'
);

console.log('\n─── D. Weë Creator lo hereda de un solo sitio ───');

const shell = leer('components/creator/CreatorShell.tsx');
/*
 * El scroll del shell es `PaginaDeCajas` (components/creator/CajaQueCrece.tsx):
 * un ScrollView que además deja crecer las cajas de Weë AI sin perder sus
 * botones. Lo que se vigila aquí no cambia: que vaya DENTRO del acomodo.
 */
check(
  'CreatorShell envuelve su contenido en EspacioDeEscritura',
  /<EspacioDeEscritura[\s\S]{0,200}<(ScrollView|PaginaDeCajas)\b/.test(shell),
  'las 11 experiencias dependen de esto'
);

/* Quien usa el shell no necesita repetirlo: se comprueba que de verdad lo usan. */
const porElShell = superficies.filter((x) => /CreatorShell/.test(x.src)).map((x) => x.rel);
check(
  'varias experiencias de Weë Creator heredan el acomodo del shell',
  porElShell.length >= 3,
  porElShell.join(', ')
);

console.log('\n─── E. La causa de fondo sigue siendo la que se documentó ───');

/*
 * Si algún día se apagara el borde a borde, el KeyboardAvoidingView volvería a
 * funcionar en Android y esta pieza sobraría. Mientras siga encendido, la regla
 * de arriba es la correcta.
 */
/*
 * `android/` lo genera `expo prebuild` y no se versiona (.gitignore): en una
 * copia limpia —la de CI— no existe. Entonces se mira la fuente de la que sale,
 * app.json, con la misma regla que aplica Expo 54: borde a borde salvo
 * `android.edgeToEdgeEnabled: false` (`withEdgeToEdge` de prebuild-config), y
 * `softwareKeyboardLayoutMode: 'resize'` se escribe como adjustResize.
 */
if (fs.existsSync(path.resolve(RAIZ, 'android/gradle.properties'))) {
  const gradle = leer('android/gradle.properties');
  check(
    'Android sigue dibujando de borde a borde',
    /^edgeToEdgeEnabled=true$/m.test(gradle),
    'si esto cambiara, habría que revisar EspacioDeEscritura'
  );

  const manifiesto = leer('android/app/src/main/AndroidManifest.xml');
  check(
    'el manifiesto sigue pidiendo adjustResize (inerte, pero declarado)',
    /windowSoftInputMode="adjustResize"/.test(manifiesto),
    'es el valor que escribe softwareKeyboardLayoutMode de app.json'
  );
} else {
  const android = (JSON.parse(leer('app.json')).expo || {}).android || {};
  check(
    'Android sigue dibujando de borde a borde (app.json; android/ no está generado)',
    android.edgeToEdgeEnabled !== false,
    'si esto cambiara, habría que revisar EspacioDeEscritura'
  );
  check(
    'app.json sigue pidiendo adjustResize (inerte, pero declarado)',
    android.softwareKeyboardLayoutMode === 'resize',
    'es el valor que prebuild escribe en el manifiesto como windowSoftInputMode'
  );
}

console.log(
  '\n' + (failures === 0 ? 'Todo en orden.' : `${failures} comprobacion(es) fallaron.`)
);
process.exit(failures === 0 ? 0 : 1);
