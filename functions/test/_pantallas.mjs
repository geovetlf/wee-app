/**
 * UN ENTORNO PARA DIBUJAR Y TOCAR UNA PANTALLA DE LA APP DESDE NODE.
 *
 * Es un módulo, no una suite. Lo usa `aceptacion-pantallas.test.mjs`, y sigue el mismo método que
 * `filmmaker-ui.test.mjs` y `f1d-cliente.test.mjs`: el código de verdad de la pantalla (transpilado al vuelo por
 * `filmmaker-cliente.mjs`), `react-dom/server` para dibujarla y dobles mínimos de lo que no es de Weë (React Native, la
 * navegación, Firebase). No hay ningún marco de pruebas de interfaz nuevo: es React y el cargador que ya tiene el repo.
 *
 * ── Qué se puede hacer con él ───────────────────────────────────────────────
 *
 *   dibujar()      Dibuja la pantalla UNA vez con el estado actual. Devuelve su HTML, su texto y todo lo que se puede tocar.
 *   tocar(etiqueta) Pulsa el botón con esa etiqueta accesible (o falla si no está): es lo que hace un dedo.
 *   enfocar()      Hace lo que React Navigation hace al volver a la pantalla: ejecuta los `useFocusEffect` pendientes.
 *   capturas.X     Las propiedades con que la pantalla montó el componente doblado X (la última vez que se dibujó).
 *   navegacion     Cada `navigate`/`push`/`goBack` que pidió la pantalla, en orden.
 *   atras()        El gesto de atrás de Android: llama al último manejador registrado. Devuelve lo que éste devolvió.
 *
 * ── La limitación que hay que conocer ───────────────────────────────────────
 *
 * `react-dom/server` dibuja una vez y no ejecuta efectos. Para que un `useState` sobreviva entre dos dibujados se
 * sustituye por una versión que guarda el valor por orden de llamada (como hace React) y NO vuelve a dibujar sola:
 * después de un gesto se llama a `dibujar()` para ver lo que cambió. Es lo bastante para probar la lógica de una
 * pantalla —qué hace cada botón, qué estado cambia, a dónde navega—; lo que no prueba es el diseño, el desplazamiento, el
 * teclado ni nada que dependa de un motor de renderizado real. Eso es de un navegador o de un dispositivo.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, RAIZ } from './filmmaker-cliente.mjs';

const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
export const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
export const h = React.createElement;

export const textoDelHtml = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/**
 * @param {object} o
 * @param {'android'|'ios'|'web'} [o.so]       El sistema (`Platform.OS`): cambia el gesto de atrás y los permisos de fotos.
 * @param {object|null} [o.usuario]            La sesión (`useAuth().user`); null = sin entrar.
 * @param {boolean} [o.movil]                  Teléfono (`useResponsive`).
 * @param {Array} [o.trabajos]                 Los `creatorJobs` que devolvería `getMyJobsDe`.
 * @param {object} [o.fotos]                   Lo que contestan el permiso y el selector de fotos.
 * @param {string} [o.pantalla]                Ruta de la pantalla desde la raíz del repo.
 * @param {(ctx: object) => object} o.dobles   Los dobles propios de esa pantalla (componentes y constantes que no se cargan de verdad).
 */
export const crearEntorno = ({ so = 'android', usuario = { uid: 'u1' }, movil = true, trabajos = [], fotos = {}, pantalla, dobles }) => {
  /* ── el estado que sobrevive entre dibujados ── */
  let almacen = [];
  let indice = 0;
  const useState = (inicial) => {
    const i = indice++;
    if (!(i in almacen)) almacen[i] = typeof inicial === 'function' ? inicial() : inicial;
    return [almacen[i], (v) => { almacen[i] = typeof v === 'function' ? v(almacen[i]) : v; }];
  };

  /* ── lo que se registra ── */
  let botones = [];
  const capturas = {};
  let enfoques = [];
  const navegacion = [];
  const manejadoresDeAtras = [];
  const avisos = [];
  const consultasDeTrabajos = [];

  /* ── React Native, lo mínimo ── */
  const Caja = ({ children, accessibilityLabel, accessibilityRole, style }) => h('div', { 'aria-label': accessibilityLabel, role: accessibilityRole, 'data-ancho': style && !Array.isArray(style) && typeof style.width === 'string' ? style.width : undefined }, children);
  const Texto = ({ children }) => h('span', null, children);
  const Toque = ({ children, onPress, disabled, accessibilityLabel, accessibilityRole }) => {
    botones.push({ etiqueta: accessibilityLabel, rol: accessibilityRole, apagado: !!disabled, tocar: onPress });
    return h('button', { 'aria-label': accessibilityLabel, disabled: !!disabled }, children);
  };
  const reactNative = {
    View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, FlatList: Caja, ActivityIndicator: () => h('progress'),
    TextInput: () => h('textarea'), Image: () => h('img'),
    StyleSheet: { create: (s) => s, flatten: (s) => s, hairlineWidth: 1 },
    Platform: { OS: so, select: (o) => o[so] ?? o.default },
    Dimensions: { get: () => ({ width: movil ? 390 : 1280, height: 800 }), addEventListener: () => ({ remove() {} }) },
    BackHandler: { addEventListener: (_evento, manejador) => { manejadoresDeAtras.push(manejador); return { remove: () => { const i = manejadoresDeAtras.indexOf(manejador); if (i >= 0) manejadoresDeAtras.splice(i, 1); } }; } },
    Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) },
    Linking: { openURL: async () => {} },
  };

  /* ── el selector de fotos ── */
  const selector = {
    requestCameraPermissionsAsync: async () => ({ granted: fotos.permiso !== false }),
    requestMediaLibraryPermissionsAsync: async () => ({ granted: fotos.permiso !== false }),
    launchCameraAsync: async () => fotos.resultado ?? { canceled: true },
    launchImageLibraryAsync: async () => fotos.resultado ?? { canceled: true },
  };

  const colores = new Proxy({}, { get: () => '#000000' });
  /*
   * Un componente doblado: apunta con qué propiedades lo montó la pantalla y dibuja su nombre (y sus hijos). Lo que la
   * pantalla le pasa a un componente es el CONTRATO entre los dos, y es lo que se quiere mirar.
   */
  const capturar = (nombre, dibujo) => (props) => {
    capturas[nombre] = props;
    return dibujo ? dibujo(props) : h('div', { 'data-componente': nombre }, props.children);
  };
  const ctx = { React, h, reactNative, Caja, Texto, Toque, capturar, capturas, navegacion, avisos, colores, usuario, movil, trabajos, consultasDeTrabajos };
  const propios = dobles(ctx);

  const todos = {
    react: { ...React, useState },
    'react-native': reactNative,
    'react-native-safe-area-context': { SafeAreaView: Caja },
    '@expo/vector-icons': { Ionicons: ({ name }) => h('i', { 'data-icono': name }) },
    '@react-navigation/native': {
      useNavigation: () => ({
        navigate: (...a) => navegacion.push(['navigate', ...a]), push: (...a) => navegacion.push(['push', ...a]),
        goBack: () => navegacion.push(['goBack']), setParams: (...a) => navegacion.push(['setParams', ...a]), canGoBack: () => true,
      }),
      useFocusEffect: (cb) => { enfoques.push(cb); },
    },
    'expo-image-picker': selector,
    'firebase/functions': { httpsCallable: () => { throw new Error('sin red'); } },
    'firebase/firestore': new Proxy({}, { get: () => () => { throw new Error('sin red'); } }),
    '../config/firebase': { db: {}, functions: {}, storage: {} },
    '../../config/firebase': { db: {}, functions: {}, storage: {} },
    '../utils/notify': { notify: (m) => avisos.push(m), confirmAction: async () => true },
    ...propios,
  };
  const cargar = crearCargador({ dobles: todos });
  const Pantalla = cargar(pantalla).default;

  const dibujar = () => {
    botones = [];
    enfoques = [];
    indice = 0;
    /* Lo que no se dibuja en ESTA pasada no está: así «ya no se ve el panel» se puede comprobar. */
    Object.keys(capturas).forEach((k) => delete capturas[k]);
    const html = renderToStaticMarkup(h(Pantalla));
    return { html, texto: textoDelHtml(html), botones: botones.slice() };
  };
  const tocar = (etiqueta, d = dibujar()) => {
    const b = d.botones.find((x) => x.etiqueta === etiqueta);
    if (!b) throw new Error(`no hay ningún botón «${etiqueta}» (hay: ${d.botones.map((x) => x.etiqueta).join(' · ')})`);
    if (b.apagado) throw new Error(`el botón «${etiqueta}» está apagado`);
    return b.tocar();
  };
  /* Volver a la pantalla: antes se «desenfoca» lo que había (sus limpiezas), y después se ejecutan los efectos de foco del último dibujado. */
  let limpiezas = [];
  const enfocar = () => {
    limpiezas.forEach((f) => f());
    limpiezas = enfoques.map((cb) => cb()).filter((x) => typeof x === 'function');
    return limpiezas;
  };
  const atras = () => manejadoresDeAtras.length ? manejadoresDeAtras[manejadoresDeAtras.length - 1]() : undefined;
  const calma = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
  /* Borra solo lo que se APUNTÓ (navegaciones, avisos, consultas): el estado de la pantalla se queda como estaba. */
  const olvidar = () => { navegacion.length = 0; avisos.length = 0; consultasDeTrabajos.length = 0; };
  const reiniciar = () => { limpiezas = []; almacen = []; navegacion.length = 0; avisos.length = 0; manejadoresDeAtras.length = 0; consultasDeTrabajos.length = 0; Object.keys(capturas).forEach((k) => delete capturas[k]); };

  return { dibujar, tocar, enfocar, atras, calma, reiniciar, olvidar, capturas, navegacion, avisos, consultasDeTrabajos, cargar, ctx, manejadoresDeAtras };
};
