/**
 * EL MONTAJE DE LA INTERFAZ DE MIS PROYECTOS / MIS CREACIONES (R9, línea B), compartido por `pc-interfaz-pantallas` y
 * `f11-ui` (comprobación 21). Es un módulo, no una suite. Método de `_pantallas.mjs`: el código de VERDAD transpilado,
 * `react-dom/server`, un `useState` que sobrevive entre dibujados y dobles mínimos; el CONTRATO (`services/cicloDeTrabajo.ts`)
 * se sustituye por uno que anota cada llamada y contesta datos, un fallo de red o `pendiente`/`no_disponible`.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { RAIZ, crearCargador } from './filmmaker-cliente.mjs';

export const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
export const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
export const h = React.createElement;
export const textoDelHtml = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export const calma = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };

/* ── El traductor y los formatos de VERDAD ── */
export const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
export const { crearTraductor } = base('i18n/traducir.ts');
export const DICCIONARIOS = {
  es: { ...base('i18n/textos/es/index.ts').es, ...base('i18n/textos/es/servidor/index.ts').servidor },
  en: { ...base('i18n/textos/en/index.ts').en, ...base('i18n/textos/en/servidor/index.ts').servidor },
};
export const formatoReal = base('i18n/formato.ts');
export const t = crearTraductor('es', DICCIONARIOS, {});
export const formato = {
  numero: (v, o) => formatoReal.formatearNumero(v, 'es', o),
  tiempoRelativo: (f, a) => formatoReal.formatearTiempoRelativo(f, 'es', a),
  lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo),
  fecha: (f, o) => formatoReal.formatearFecha(f, 'es', o),
};

/* ── El contrato de mentira: anota y contesta lo que diga el escenario ── */
export const pendiente = () => Object.assign(new Error('pendiente'), { code: 'pendiente' });
export const sinRed = () => Object.assign(new Error('sin red'), { code: 'unavailable' });
export const crearContrato = () => {
  const c = {
    llamadas: [],
    proyectos: [], creaciones: [], siguiente: undefined,
    falla: {}, /* nombre → () => Error */
    diferir: {}, /* nombre → true: la promesa queda colgada en `pendientes` */
    pendientes: [],
    reabrir: { proyectoId: 'p-origen', nuevo: false },
    finalizar: { creacionId: 'c-1', yaExistia: false },
  };
  const responder = (nombre, valor) => {
    if (c.falla[nombre]) return Promise.reject(c.falla[nombre]());
    if (c.diferir[nombre]) return new Promise((ok, ko) => c.pendientes.push({ ok: () => ok(valor), ko }));
    return Promise.resolve(valor);
  };
  c.modulo = {
    listarProyectosEnCurso: (uid) => { c.llamadas.push(['listarProyectosEnCurso', uid]); return responder('listarProyectosEnCurso', c.proyectos); },
    listarCreacionesFinales: (uid, cursor) => { c.llamadas.push(['listarCreacionesFinales', uid, cursor]); return responder('listarCreacionesFinales', { creaciones: c.creaciones, ...(c.siguiente ? { siguiente: c.siguiente } : {}) }); },
    finalizarCreacion: (entrada) => { c.llamadas.push(['finalizarCreacion', entrada]); return responder('finalizarCreacion', c.finalizar); },
    reabrirParaEditar: (id) => { c.llamadas.push(['reabrirParaEditar', id]); return responder('reabrirParaEditar', c.reabrir); },
    /* Como hoy en la app: el callable `cicloDeTrabajo` no está exportado y lo que va por él contesta `no_disponible`. */
    listarSinDecidir: (uid, cursor) => { c.llamadas.push(['listarSinDecidir', uid, cursor]); return Promise.reject(Object.assign(new Error('no_disponible'), { code: 'no_disponible' })); },
    guardarTextoFinal: (entrada) => { c.llamadas.push(['guardarTextoFinal', entrada]); return Promise.reject(Object.assign(new Error('no_disponible'), { code: 'no_disponible' })); },
    __esModule: true,
    ErrorDeCiclo: class ErrorDeCiclo extends Error { constructor(code, m) { super(m ?? code); this.code = code; } },
  };
  /* D-1 / D-3: listarSinDecidir y guardarTextoFinal (publicadas por la línea A). `publicar()` las añade; sin él, el escenario las hace fallar con `no_disponible` (callable sin exportar). */
  c.sinDecidir = []; c.siguienteSinDecidir = undefined;
  c.publicar = () => Object.assign(c.modulo, {
    listarSinDecidir: (uid, cursor) => { c.llamadas.push(['listarSinDecidir', uid, cursor]); return responder('listarSinDecidir', { assets: c.sinDecidir, ...(c.siguienteSinDecidir ? { siguiente: c.siguienteSinDecidir } : {}) }); },
    guardarTextoFinal: (entrada) => { c.llamadas.push(['guardarTextoFinal', entrada]); return responder('guardarTextoFinal', { creacionId: 'c-texto', yaExistia: false }); },
  });
  c.de = (nombre) => c.llamadas.filter((l) => l[0] === nombre);
  return c;
};

/* ── Un entorno para dibujar y tocar un componente con props ── */
export const crearMontaje = (rel, extra = () => ({})) => {
  let almacen = [];
  let indice = 0;
  const useState = (inicial) => {
    const i = indice++;
    if (!(i in almacen)) almacen[i] = typeof inicial === 'function' ? inicial() : inicial;
    return [almacen[i], (v) => { almacen[i] = typeof v === 'function' ? v(almacen[i]) : v; }];
  };
  let botones = [];
  let etiquetas = [];
  let enfoques = [];
  const navegacion = [];
  const avisos = [];
  const estado = { usuario: { uid: 'u1' }, contrato: crearContrato(), proyectosGuardados: [], falloProyectosGuardados: false };

  const Caja = ({ children, accessibilityLabel }) => {
    if (accessibilityLabel) etiquetas.push(accessibilityLabel);
    return h('div', { 'aria-label': accessibilityLabel }, children);
  };
  const Texto = ({ children }) => h('span', null, children);
  const Toque = ({ children, onPress, disabled, accessibilityLabel }) => {
    botones.push({ etiqueta: accessibilityLabel, apagado: !!disabled, tocar: onPress });
    return h('button', { 'aria-label': accessibilityLabel, disabled: !!disabled }, children);
  };
  const reactNative = {
    View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, ActivityIndicator: () => h('progress'),
    TextInput: ({ onChangeText }) => { estado.escribir = onChangeText; return h('textarea'); }, Image: () => h('img'),
    StyleSheet: { create: (s) => s, flatten: (s) => s, hairlineWidth: 1, absoluteFill: {} },
    Platform: { OS: 'android', select: (o) => o.android ?? o.default },
    Dimensions: { get: () => ({ width: 390, height: 800 }), addEventListener: () => ({ remove() {} }) },
    Linking: { openURL: async () => {} }, Alert: { alert: () => {} },
  };
  const colores = new Proxy({}, { get: () => '#000000' });
  const tema = { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (C) => C };
  const habla = { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) };
  const proyectosGuardados = {
    projectsService: {
      list: async () => { if (estado.falloProyectosGuardados) throw sinRed(); return estado.proyectosGuardados; },
      create: async () => ({ id: 'nuevo' }), get: async () => estado.proyecto(), jobsForProject: async () => estado.trabajos(), rename: async (...a) => { estado.renombrados.push(a); }, remove: async () => {},
    },
    PROJECT_EMOJIS: ['📁', '🍔'],
  };
  estado.renombrados = [];
  estado.proyecto = () => null;
  estado.trabajos = () => [];
  const notify = { notify: (m) => avisos.push(m), confirmAction: async () => true };
  const shell = { __esModule: true, default: ({ children }) => h('main', null, children) };
  const ui = {
    SectionTitle: ({ title, action, onAction }) => h('section', null, h('h2', null, title), action ? Toque({ accessibilityLabel: action, onPress: onAction, children: action }) : null),
    Chip: ({ label, onPress }) => Toque({ accessibilityLabel: label, onPress, children: label }),
    ClosingBanner: ({ title }) => h('aside', null, title),
  };
  const comunes = {
    react: { ...React, useState },
    'react-native': reactNative,
    'expo-image': { Image: () => h('img', { 'data-imagen': '1' }) },
    'expo-av': { Audio: { Sound: { createAsync: async () => ({ sound: {} }) }, setAudioModeAsync: async () => {} }, ResizeMode: {}, Video: () => h('video') },
    '@expo/vector-icons': { Ionicons: ({ name }) => h('i', { 'data-icono': name }) },
    '@react-navigation/native': {
      useNavigation: () => ({ navigate: (...a) => navegacion.push(['navigate', ...a]), goBack: () => navegacion.push(['goBack']) }),
      useFocusEffect: (cb) => { enfoques.push(cb); },
      useRoute: () => ({ params: estado.params ?? {} }),
    },
  };
  for (const pre of ['../', '../../']) {
    Object.assign(comunes, {
      [`${pre}contexts/ThemeContext`]: tema,
      [`${pre}contexts/IdiomaContext`]: habla,
      [`${pre}contexts/AuthContext`]: { useAuth: () => ({ user: estado.usuario }) },
      [`${pre}hooks/useResponsive`]: { useResponsive: () => ({ isMobile: true, isTablet: false, isDesktop: false }) },
      [`${pre}services/cicloDeTrabajo`]: new Proxy({}, { get: (_o, k) => estado.contrato.modulo[k] }),
      [`${pre}services/projectsService`]: proyectosGuardados,
      [`${pre}utils/notify`]: notify,
      [`${pre}config/firebase`]: { db: {}, functions: {}, storage: {} },
    });
  }
  Object.assign(comunes, {
    '../components/creator/CreatorShell': shell,
    '../components/creator/ui': ui,
    '../components/creator/SeccionDelDispositivo': { __esModule: true, default: () => h('aside', { 'data-seccion': 'dispositivo' }) },
    'firebase/firestore': new Proxy({}, { get: () => () => { throw sinRed(); } }),
    'firebase/functions': { httpsCallable: () => () => Promise.reject(sinRed()) },
  }, extra({ h, Toque }));
  const cargar = crearCargador({ dobles: comunes });
  const Componente = cargar(rel).default;

  const dibujar = (props = {}) => {
    botones = []; etiquetas = []; enfoques = []; indice = 0;
    const html = renderToStaticMarkup(h(Componente, props));
    return { html, texto: textoDelHtml(html), botones: botones.slice(), etiquetas: etiquetas.slice() };
  };
  const boton = (d, etiqueta) => d.botones.find((b) => b.etiqueta === etiqueta);
  const tocar = (d, etiqueta) => {
    const b = boton(d, etiqueta);
    if (!b) throw new Error(`no hay ningún botón «${etiqueta}» (hay: ${d.botones.map((x) => x.etiqueta).join(' · ')})`);
    if (b.apagado) throw new Error(`el botón «${etiqueta}» está apagado`);
    return b.tocar();
  };
  const enfocar = () => enfoques.map((cb) => cb());
  const reiniciar = () => { almacen = []; navegacion.length = 0; avisos.length = 0; estado.contrato = crearContrato(); estado.proyectosGuardados = []; estado.falloProyectosGuardados = false; estado.usuario = { uid: 'u1' }; estado.renombrados = []; };
  /* Montar = dibujar la primera vez, enfocar (cargar) y esperar a que se asiente. */
  const montar = async (props) => { dibujar(props); enfocar(); await calma(); return dibujar(props); };
  return { dibujar, tocar, boton, enfocar, reiniciar, montar, navegacion, avisos, estado, cargar };
};

