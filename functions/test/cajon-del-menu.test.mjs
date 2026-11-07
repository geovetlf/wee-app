/*
 * EL CAJÓN DEL ☰, ALCANZABLE HASTA EL FINAL (components/DrawerMenu.tsx). Sin emuladores ni red.
 *
 * B1 · P1-3 de las pruebas con sesión del 2026-11-06: a 390 px el final del menú —«Cerrar sesión» incluido— quedaba
 * debajo de la barra inferior y no se podía tocar. El cajón se abre dentro de las pestañas (Home, WeeTalk, Perfil) y la
 * barra global se pinta ENCIMA de ellas (navigation/NavegacionGlobal.tsx, `zIndex` 50 sobre la pila), así que el relleno
 * de abajo del cajón tiene que guardarle su alto; en escritorio no hay barra y no se guarda nada.
 * B1 · P2-9: «Cerrar sesión» del ☰ salía sin preguntar, cuando la barra lateral, Configuración y los Ajustes de Creator
 * confirman con `confirmAction`. Ahora pregunta lo mismo y, si se cancela, nada cambia.
 *
 * Método (el de `_pantallas.mjs`): el código de verdad del cajón, transpilado por `filmmaker-cliente.mjs`, dibujado con
 * `react-dom/server` y dobles mínimos de lo que no es de Weë. Las medidas (`ALTO_BARRA`, `SPACING`) y la regla de
 * escritorio (`useResponsive`) son las REALES. Lo que no prueba —la geometría pintada, el desplazamiento con el dedo,
 * RTL en pantalla— es de un navegador: va en el informe del bloque.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, RAIZ, leer, sinComentarios } from './filmmaker-cliente.mjs';

const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
const h = React.createElement;

let fallos = 0;
let total = 0;
const check = (nombre, ok, detalle = '') => {
  total++;
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};
const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const t = (clave) => clave; // el traductor doblado devuelve la clave: así se ve QUÉ texto pide cada sitio

/**
 * Un cajón listo para dibujar. `ancho` decide teléfono, tableta o escritorio con el `useResponsive` real.
 * `confirmar` es lo que contesta la persona al diálogo de salir.
 */
const crearCajon = ({ so = 'web', ancho = 390, inferior = 0, usuario = { uid: 'demoViewer' }, perfil = 'real', confirmar = true } = {}) => {
  const registro = { toques: [], scroll: null, preguntas: [], salidas: 0, cierres: 0, navegaciones: [] };
  const Caja = ({ children }) => h('div', null, children);
  const Texto = ({ children }) => h('span', null, children);
  const Toque = ({ children, onPress, accessibilityLabel }) => {
    registro.toques.push({ etiqueta: accessibilityLabel, tocar: onPress });
    return h('button', { 'aria-label': accessibilityLabel }, children);
  };
  class Valor { constructor(v) { this.v = v; } setValue(v) { this.v = v; } interpolate() { return this; } }
  const animacion = { start: (fin) => fin && fin({ finished: true }) };
  const reactNative = {
    View: Caja, Text: Texto, TouchableOpacity: Toque, TouchableWithoutFeedback: ({ children }) => children,
    ScrollView: ({ children, contentContainerStyle }) => { registro.scroll = contentContainerStyle; return h('div', { 'data-scroll': '1' }, children); },
    Animated: { View: Caja, Value: Valor, timing: () => animacion, parallel: () => animacion },
    StyleSheet: { create: (s) => s, flatten: (s) => s, hairlineWidth: 1, absoluteFill: {}, absoluteFillObject: {} },
    Platform: { OS: so, select: (o) => o[so] ?? o.default },
    Dimensions: { get: () => ({ width: ancho, height: 844, scale: 1, fontScale: 1 }), addEventListener: () => ({ remove() {} }) },
    Alert: { alert() {} }, Linking: { openURL: async () => {} },
  };
  const Nada = () => null;
  const dobles = {
    react: React,
    'react-native': reactNative,
    '@expo/vector-icons': { Ionicons: Nada },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: inferior, left: 0, right: 0 }) },
    '@react-navigation/native': {
      useNavigation: () => ({ navigate: (...a) => registro.navegaciones.push(a), getParent: () => null }),
      useNavigationState: (sel) => sel({ index: 0, routes: [{ name: 'Main', state: { index: 0, routes: [{ name: 'Home' }] } }] }),
    },
    './IconoDireccional': { __esModule: true, default: Nada },
    './icons/IconoWee': { IconoWee: Nada },
    './icons/trazosDeWee': {},
    './CreditsPill': { MarcaDeCredits: Nada },
    './icons/MarcaDeWeeAi': { MarcaDeWeeAi: Nada },
    './avatars/AvatarDisplay': { __esModule: true, default: Nada },
    './GradienteDeMarca': { RellenoDeMarca: Nada },
    '../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ formato: { numero: String } }) },
    '../i18n/caja': { sinEspaciadoSiSeUne: () => null },
    '../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: new Proxy({}, { get: () => '#000000' }) }, setThemeMode() {} }) },
    '../contexts/TabBarContext': { useTabBar: () => ({ scrollProgress: new Valor(0), isTransparent: false }) },
    '../contexts/AuthContext': { useAuth: () => ({ user: usuario, logout: async () => { registro.salidas++; } }) },
    '../contexts/UserProfileContext': {
      useUserProfile: () => ({ userProfile: usuario ? { uid: usuario.uid, displayName: 'Geovet' } : null, activeProfileType: perfil, hasWeeProfile: true, switchIdentity() {} }),
    },
    '../hooks/useWallet': { useWallet: () => ({ balance: 0 }) },
    '../hooks/useEContact': { useIdentidadActiva: () => ({ nombreLista: perfil === 'hidi' ? 'ẄContact' : 'ËContact' }) },
    '../utils/notify': {
      notify() {},
      confirmAction: async (...args) => { registro.preguntas.push(args); return confirmar; },
    },
  };
  const cargar = crearCargador({ dobles });
  const DrawerMenu = cargar('components/DrawerMenu.tsx').default;
  const dibujar = () => {
    registro.toques = [];
    renderToStaticMarkup(h(DrawerMenu, { visible: true, onClose: () => { registro.cierres++; } }));
    return registro;
  };
  /* Las medidas de verdad, cargadas con el mismo cargador (y por tanto con el mismo `Platform.OS`). */
  const { ALTO_BARRA } = cargar('components/BarraInferior.tsx');
  const { SPACING } = cargar('constants/design.ts');
  return { dibujar, registro, ALTO_BARRA, SPACING };
};

const rellenoDeAbajo = (estilo) => [estilo].flat(Infinity).filter(Boolean).reduce((n, e) => (typeof e.paddingBottom === 'number' ? e.paddingBottom : n), 0);
const salir = (r) => r.toques.find((x) => x.etiqueta === 'menu.signOut');

/* ── A · El final del menú queda por encima de la barra de abajo ─────────────────────────────────────────────── */
console.log('\n── A · El final del cajón (con «Cerrar sesión») se puede alcanzar por encima de la barra inferior ──');
for (const ancho of [320, 360, 390]) {
  const c = crearCajon({ ancho });
  const r = c.dibujar();
  const relleno = rellenoDeAbajo(r.scroll);
  check(`1.${ancho}) a ${ancho} px el relleno de abajo guarda la barra entera más el margen de siempre`,
    relleno === c.ALTO_BARRA + c.SPACING.xl && relleno >= c.ALTO_BARRA, `relleno ${relleno} · barra ${c.ALTO_BARRA}`);
}
{
  const c = crearCajon({ ancho: 390 });
  const r = c.dibujar();
  check('2) «Cerrar sesión» es lo último del cajón: con el relleno, al bajar del todo queda por encima de la barra',
    r.toques.length > 10 && r.toques.at(-1)?.etiqueta === 'menu.signOut');
}
{
  /* Con zona segura abajo (un iPhone con barra de gestos): la barra mide su alto MÁS esa zona, y el cajón guarda las dos. */
  const c = crearCajon({ so: 'ios', ancho: 390, inferior: 34 });
  const relleno = rellenoDeAbajo(c.dibujar().scroll);
  check('3) con zona segura inferior (34) guarda la barra y la zona segura: la barra entera queda debajo del final',
    relleno === 34 + c.SPACING.xl + c.ALTO_BARRA && relleno >= c.ALTO_BARRA + 34, `relleno ${relleno}`);
}
{
  /* La tableta (768–1023) también lleva barra inferior: `useBarraInferior` solo la quita en escritorio. */
  const c = crearCajon({ ancho: 800 });
  check('4) en tableta (800 px) también se guarda la barra', rellenoDeAbajo(c.dibujar().scroll) === c.ALTO_BARRA + c.SPACING.xl);
}
for (const ancho of [1024, 1440]) {
  const c = crearCajon({ ancho });
  const relleno = rellenoDeAbajo(c.dibujar().scroll);
  check(`5.${ancho}) en escritorio (${ancho} px) no hay barra inferior y no se guarda su hueco`, relleno === c.SPACING.xl, `relleno ${relleno}`);
}
{
  const real = crearCajon({ perfil: 'real' });
  const wee = crearCajon({ perfil: 'hidi' });
  const rr = real.dibujar();
  const rw = wee.dibujar();
  check('6) con el Perfil Real y con el Perfil Weë: el mismo hueco y «Cerrar sesión» al final',
    rellenoDeAbajo(rr.scroll) === rellenoDeAbajo(rw.scroll) && rr.toques.at(-1)?.etiqueta === 'menu.signOut' && rw.toques.at(-1)?.etiqueta === 'menu.signOut');
}
{
  /* Sin sesión no hay «Cerrar sesión», pero el final (Términos · Privacidad) también tiene que verse: el hueco no depende de la sesión. */
  const c = crearCajon({ usuario: null });
  const r = c.dibujar();
  check('7) sin sesión no se ofrece salir, y el final del cajón guarda igualmente la barra', !salir(r) && rellenoDeAbajo(r.scroll) === c.ALTO_BARRA + c.SPACING.xl);
}
{
  const fuente = sinComentarios(leer('components/DrawerMenu.tsx'));
  check('8) el alto de la barra sale de la barra (ALTO_BARRA de BarraInferior), no de un número escrito a mano',
    /import \{ ALTO_BARRA \} from '\.\/BarraInferior';/.test(fuente) && /paddingBottom: insets\.bottom \+ SPACING\.xl \+ \w+/.test(fuente));
  check('9) y la regla de cuándo hay barra es la del resto de Weë (isDesktop de useResponsive, como en NavegacionGlobal)',
    /useResponsive\(\)/.test(fuente) && /isDesktop \? 0 : ALTO_BARRA/.test(fuente) && /isDesktop \|\|/.test(leer('navigation/NavegacionGlobal.tsx')));
}

/* ── B · Salir pregunta antes, como el resto de la app ───────────────────────────────────────────────────────── */
console.log('\n── B · «Cerrar sesión» del ☰ pide confirmación, como la barra lateral y Configuración ──');
for (const so of ['web', 'android']) {
  {
    const c = crearCajon({ so, confirmar: false });
    const r = c.dibujar();
    await salir(r).tocar();
    await esperar(300);
    const [titulo, mensaje, boton, destructivo] = r.preguntas[0] || [];
    check(`10.${so}) pregunta con el mismo diálogo y las mismas palabras que la barra lateral`,
      r.preguntas.length === 1 && titulo === 'menu.signOut' && mensaje === 'menu.signOutConfirm' && boton === 'menu.signOut' && destructivo === true, JSON.stringify(r.preguntas[0]?.slice(0, 4)));
    check(`11.${so}) si se cancela, no sale y el cajón no se cierra`, r.salidas === 0 && r.cierres === 0, `salidas ${r.salidas} · cierres ${r.cierres}`);
  }
  {
    const c = crearCajon({ so, confirmar: true });
    const r = c.dibujar();
    await salir(r).tocar();
    await esperar(300);
    check(`12.${so}) si se acepta, cierra el cajón y sale UNA vez`, r.preguntas.length === 1 && r.salidas === 1 && r.cierres === 1, `salidas ${r.salidas} · cierres ${r.cierres}`);
  }
}
{
  const barra = sinComentarios(leer('components/Sidebar.tsx'));
  const cajon = sinComentarios(leer('components/DrawerMenu.tsx'));
  const pregunta = "confirmAction(t('menu.signOut'), t('menu.signOutConfirm'), t('menu.signOut'), true, t)";
  check('13) el ☰ y la barra lateral dicen lo mismo: misma llamada, mismas claves (ninguna nueva)', barra.includes(pregunta) && cajon.includes(pregunta));
}

console.log(`\n${total - fallos}/${total}`);
if (fallos) process.exit(1);
