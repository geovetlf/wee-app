/*
 * WEË VERSIÓN CREATOR · FASE FINAL (2026-11-06, autorizada por el dueño: diseño y correcciones visuales de Creator).
 *
 * Vigila, sin tocar nada de la versión app:
 *   A) el degradado de marca en las acciones principales de creator, con el MISMO sistema que la App
 *      (`constants/marca.ts` + `components/GradienteDeMarca.tsx`, docs/COLOR-DE-MARCA.md), y solo ahí;
 *   B) la identidad activa: la secuencia del dueño, EJECUTADA con el código de verdad de
 *      `RecuerdoDelPerfil` e `IdentidadEnCreator` y dobles del contexto compartido, del navegador y de React:
 *        entrar en creator desde el Perfil Real → cambiar al Perfil Weë → recargar → se conserva → salir →
 *        App → cambiar de identidad en la App → volver a creator → sin identidad vieja ni cambio accidental;
 *   C) un solo Credits Wallet (los mismos hook y servicio que la App, sin recargas);
 *   D) la configuración de creator: Idioma, Privacidad (política), Acerca de, Ayuda, Weë AI Engine, cerrar sesión.
 *
 * Lo que no prueba: el diseño en un navegador, ni la sesión de verdad (Auth del emulador). Eso va en el informe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearCargador, RAIZ, leer, sinComentarios } from './filmmaker-cliente.mjs';

let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

/* ═════════════════════ A) EL DEGRADADO DE MARCA EN CREATOR ═════════════════════ */

const MARCA_TS = leer('constants/marca.ts');
const GRADIENTE = leer('components/GradienteDeMarca.tsx');
const TEMA = leer('contexts/ThemeContext.tsx');
check('A1) el sistema de marca es el de la App: marca.ts con el degradado #FFD12A → #FFB51B → #FF850D',
  MARCA_TS.includes("colores: ['#FFD12A', '#FFB51B', '#FF850D'] as const") && MARCA_TS.includes("sobrePrimario: '#1F2937'"));
check('A2) una sola pieza de degradado: GradienteDeMarca y RellenoDeMarca {radio, apagada}, sin toques',
  /export const RellenoDeMarca: React\.FC<\{ radio\?: number \| string; apagada\?: boolean \}>/.test(GRADIENTE) && /pointerEvents="none"/.test(GRADIENTE));
check('A3) el tema lee la marca (accent = MARCA.primario, extremos del degradado, texto encima)',
  /accent: MARCA\.primario/.test(TEMA) && /primaryGradientStart: MARCA\.degradado\.colores\[0\]/.test(TEMA) && /onPrimary: MARCA\.sobrePrimario/.test(TEMA));
check('A4) creator no define otro color ni otro degradado de marca', !fs.existsSync(path.resolve(RAIZ, 'components/workspace/GradienteDeCreator.tsx'))
  && !/#F5B731|#FFD766|LinearGradient/i.test(['components/workspace/MarcoProfesional.tsx', 'components/workspace/ConCuentaEnCreator.tsx', 'components/workspace/IdentidadEnCreator.tsx', 'screens/AjustesCreatorScreen.tsx', 'screens/WalletCreatorScreen.tsx', 'screens/FashionCreatorScreen.tsx', 'screens/ProInicioScreen.tsx', 'components/creator/PiezasDeCreator.tsx'].map((f) => sinComentarios(leer(f))).join('\n')));

/*
 * El detector de la suite de la App (functions/test/degradado-de-marca.test.mjs), acotado a lo que se ve en
 * creator: un `backgroundColor:` con el acento de marca sin velo tiene que llevar la lámina dentro del mismo botón,
 * o estar en la lista de excepciones con su motivo.
 */

const PROGRESO = 'barra, onda o paso de progreso: relleno sólido de estado, no una acción (regla 2)';
const EXCEPCIONES = {
  'components/creator/PlanCard.tsx#stepDot': 'el número de cada paso del plan: indicador, no acción (regla 2)',
  'components/creator/RejillaDeCreaciones.tsx#statusBadge': 'insignia de estado de una creación (en curso / fallo): estado, no acción',
  'components/creator/ResultCard.tsx#variantTag': 'etiqueta de variante sobre una imagen: rótulo, no acción',
  'components/creator/ResultCard.tsx#pairTag': 'etiqueta «antes/después» sobre una imagen: rótulo, no acción',
  'components/creator/ResultCard.tsx#waveBar': PROGRESO,
  'components/creator/ui.tsx#handwrittenLine': 'el subrayado manuscrito bajo un título: trazo, no relleno de botón',
  'components/creator/ComposerEntry.tsx#crear': 'compositor del Home de la versión app: no se monta en creator; llega con la integración (fusión de tres vías)',
  'components/creator/ComposerEntry.tsx#publishButton': 'compositor del Home de la versión app: publicar no existe en creator; llega con la integración',
  'components/music/EstudioDeEjemplo.tsx#pico': 'picos de la forma de onda del estudio de ejemplo: dibujo, cada pista con su tinta',
  'components/music/EstudioDeEjemplo.tsx#barraRelleno': PROGRESO,
  'components/music/EstudioDeEjemplo.tsx#cursor': 'el cursor de reproducción de 1,5 px del estudio de ejemplo: línea, no relleno',
  'components/music/MelodiaDeReferencia.tsx#nivelRelleno': 'el medidor de nivel del micrófono: relleno de estado (regla 2)',
  'components/music/piezas.tsx#relleno': PROGRESO,
  'components/music/piezas.tsx#onda': PROGRESO,
  'components/studio/produccion/ProductionTimelinePreview.tsx#tramo': 'un tramo de la línea de tiempo de Producción: bloque de la escala temporal, no un botón',
  'screens/BusinessScreen.tsx#dayPost': 'casilla destacada del calendario: celda de calendario, no acción',
};
const EN_CREATOR = [
  'navigation/EspacioProfesionalNavigator.tsx', 'components/workspace', 'components/creator', 'components/sectores',
  'components/travel', 'screens/travel',
  'components/studio', 'components/music', 'components/fashion', 'components/CreditsPill.tsx',
  'screens/ProInicioScreen.tsx', 'screens/AjustesCreatorScreen.tsx', 'screens/WalletCreatorScreen.tsx', 'screens/FashionCreatorScreen.tsx',
  'screens/SpecialistScreen.tsx', 'screens/CreatorFlowScreen.tsx', 'screens/WriterEditorScreen.tsx', 'screens/ProjectsScreen.tsx',
  'screens/ProjectScreen.tsx', 'screens/MisCreacionesScreen.tsx', 'screens/HelpScreen.tsx', 'screens/EngineAdminScreen.tsx',
  'screens/IdiomaScreen.tsx', 'screens/Mundo3DScreen.tsx', 'screens/ProductionScreen.tsx', 'screens/BusinessScreen.tsx',
];
const archivos = EN_CREATOR.flatMap((p) => {
  const abs = path.resolve(RAIZ, p);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [p];
  return fs.readdirSync(abs, { recursive: true }).map(String).filter((f) => /\.tsx?$/.test(f)).map((f) => `${p}/${f.replace(/\\/g, '/')}`);
});
const HEX = '#(?:F5B731|FFC928|FFD12A|FFA51F|FFB817|FF850D|F47700|FFB51B|E5A020|FFC94D|FF910F)';
const TOKEN = new RegExp(String.raw`(?:\bcolors\.(?:accent|primary|accentLight|primaryLight|accentDark|primaryDark)\b|\bMARCA\.(?:primario|primarioClaro|primarioOscuro|activo)\b|\bDORADO\b|'${HEX}'|"${HEX}")`, 'gi');
const esVelo = (expr, fin) => /^\s*\+\s*['"`]/.test(expr.slice(fin)) || /^\}[0-9A-Fa-f]{2}/.test(expr.slice(fin));
const LAMINA = /<(?:RellenoDeMarca|GradienteDeMarca)\b/;
const nombreDelEstilo = (lineas, i) => {
  for (let k = i; k >= Math.max(0, i - 20); k--) {
    const l = lineas[k];
    if (k < i && /^\s*\}/.test(l)) break;
    const usos = [...l.slice(0, k === i ? l.indexOf('backgroundColor') : undefined).matchAll(/\b(?:styles|[a-z])\.([A-Za-z_]\w*)/g)];
    if (usos.length) return { nombre: usos[usos.length - 1][1], entrada: false };
    const entrada = l.match(/^\s*([A-Za-z_]\w*):\s*\{/);
    if (entrada) return { nombre: entrada[1], entrada: true };
  }
  return { nombre: null, entrada: false };
};
const encontrados = [];
for (const rel of archivos) {
  const fuente = leer(rel);
  if (!/backgroundColor/.test(fuente)) continue;
  const lineas = fuente.split(/\r?\n/);
  const cubiertaJunto = (i) => {
    for (let k = Math.max(0, i - 1); k <= Math.min(lineas.length - 1, i + 60); k++) {
      if (LAMINA.test(lineas[k])) return true;
      if (k > i && /<\/[A-Za-z.]+>/.test(lineas[k])) return false;
    }
    return false;
  };
  lineas.forEach((linea, i) => {
    const t = linea.trim();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
    for (const m of linea.matchAll(/backgroundColor:\s*([^,}\n]+(?:\}[0-9A-Fa-f]{2}[^,}\n]*)?)/g)) {
      const expr = m[1];
      if (![...expr.matchAll(TOKEN)].some((tk) => !esVelo(expr, tk.index + tk[0].length))) continue;
      const { nombre, entrada } = nombreDelEstilo(lineas, i);
      const clave = `${rel}#${nombre ?? `L${i + 1}`}`;
      const usos = entrada ? lineas.map((l, k) => (new RegExp(String.raw`\.${nombre}\b(?!\.)`).test(l) ? k : -1)).filter((k) => k >= 0) : [];
      const cubierto = entrada ? usos.length > 0 && usos.every(cubiertaJunto) : cubiertaJunto(i);
      encontrados.push({ clave, linea: i + 1, cubierto });
    }
  });
}
const sinCubrir = encontrados.filter((e) => !e.cubierto && !EXCEPCIONES[e.clave]);
check(`A5) ninguna acción principal de creator en color liso (${archivos.length} archivos, ${encontrados.length} rellenos de marca, ${encontrados.filter((e) => e.cubierto).length} con degradado)`,
  sinCubrir.length === 0, sinCubrir.map((e) => `${e.clave} L${e.linea}`).join(' · '));
const claves = new Set(encontrados.map((e) => e.clave));
const huerfanas = Object.keys(EXCEPCIONES).filter((k) => !claves.has(k));
check('A6) cada excepción sigue existiendo y dice por qué', huerfanas.length === 0 && Object.values(EXCEPCIONES).every((m) => m.length >= 12), huerfanas.join(' · '));

const MARCO = leer('components/workspace/MarcoProfesional.tsx');
const CUENTA = leer('components/workspace/ConCuentaEnCreator.tsx');
const INICIO = leer('screens/ProInicioScreen.tsx');
check('A7) «Entrar» de la cabecera de creator lleva el degradado (la misma línea que la App)', /accessibilityLabel=\{t\('menu\.signIn'\)\}\s*>\s*<RellenoDeMarca radio=\{999\} \/>/.test(MARCO));
check('A8) «Iniciar sesión» de lo que es de la cuenta lleva el degradado, texto oscuro encima', /<RellenoDeMarca radio=\{999\} \/>\s*<Text style=\{styles\.botonTexto\}>/.test(CUENTA) && /botonTexto: \{ color: MARCA\.sobrePrimario/.test(CUENTA));
check('A9) «Crear con IA» del Inicio de creator lleva el degradado', /style=\{\[styles\.crear, \{ backgroundColor: theme\.colors\.accent \}\]\}\s*>\s*<RellenoDeMarca radio=\{999\} \/>/.test(INICIO));
check('A10) la navegación activa NO lleva degradado: velo suave e icono de acento (indicador, regla 2)',
  /activa && \{ backgroundColor: theme\.colors\.glow \}/.test(MARCO) && (MARCO.match(/<RellenoDeMarca\b/g) || []).length === 1);
check('A11) la caja común de Weë AI (también la de creator) envía con el degradado de marca, no con uno propio',
  !/#FFD766/i.test(sinComentarios(leer('components/creator/CajaDePrompt.tsx'))) && (leer('components/creator/CajaDePrompt.tsx').match(/<RellenoDeMarca\b/g) || []).length >= 3);
check('A12) el negro de Weë Fashion se respeta: ni su composer ni la entrada de creator meten el degradado',
  !/RellenoDeMarca|GradienteDeMarca/.test(leer('screens/FashionCreatorScreen.tsx')) && !fs.readdirSync(path.resolve(RAIZ, 'components/fashion')).some((f) => /RellenoDeMarca|GradienteDeMarca/.test(leer(`components/fashion/${f}`))));
check('A13) la billetera y la configuración de creator no tienen acción principal de marca (solo leer y navegar)',
  !/RellenoDeMarca/.test(leer('screens/WalletCreatorScreen.tsx') + leer('screens/AjustesCreatorScreen.tsx')));
check('A14) Mis creaciones, Proyectos y un proyecto: sus botones principales llevan el degradado',
  ['screens/MisCreacionesScreen.tsx', 'screens/ProjectsScreen.tsx', 'screens/ProjectScreen.tsx'].every((f) => /<RellenoDeMarca radio=\{BORDER_RADIUS\.full\} \/>/.test(leer(f))));

/* ═════════════════════ B) LA IDENTIDAD ACTIVA, EJECUTADA ═════════════════════ */

/* Un React mínimo: el código de verdad de los componentes, con estado, refs y efectos que sí se ejecutan. */
const crearReact = () => {
  let actual = null;
  const R = { __esModule: true };
  R.default = R;
  R.Fragment = 'Fragment';
  R.createElement = (type, props, ...hijos) => ({ type, props: { ...(props || {}), children: hijos.length <= 1 ? hijos[0] : hijos } });
  const slot = (ini) => { const inst = actual; const i = inst.i++; if (!(i in inst.hooks)) inst.hooks[i] = ini(); return inst.hooks[i]; };
  R.useState = (inicial) => {
    const inst = actual;
    const s = slot(() => ({ v: typeof inicial === 'function' ? inicial() : inicial }));
    return [s.v, (nv) => { const v = typeof nv === 'function' ? nv(s.v) : nv; if (!Object.is(v, s.v)) { s.v = v; inst.sucio = true; } }];
  };
  R.useRef = (inicial) => slot(() => ({ current: inicial }));
  /* Como React: devuelven lo mismo mientras no cambien sus dependencias (si no, cada efecto que dependa de ellos se repetiría). */
  R.useMemo = (fn, deps) => {
    const s = slot(() => ({ deps: undefined, v: undefined, nuevo: true }));
    if (s.nuevo || !deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) { s.v = fn(); s.deps = deps; s.nuevo = false; }
    return s.v;
  };
  R.useCallback = (fn, deps) => R.useMemo(() => fn, deps);
  R.useEffect = (fn, deps) => {
    const inst = actual;
    const s = slot(() => ({ deps: undefined, limpiar: null, nuevo: true }));
    const cambia = s.nuevo || !deps || deps.some((d, k) => !Object.is(d, s.deps[k]));
    if (cambia) inst.pendientes.push({ s, fn, deps });
  };
  const montar = (Comp, props = {}) => {
    const inst = { hooks: [], i: 0, pendientes: [], sucio: false, arbol: null, vivo: true };
    inst.dibujar = () => {
      for (let vuelta = 0; vuelta < 50 && inst.vivo; vuelta++) {
        actual = inst; inst.i = 0; inst.pendientes = []; inst.sucio = false;
        inst.arbol = Comp(props);
        actual = null;
        for (const p of inst.pendientes) {
          if (p.s.limpiar) p.s.limpiar();
          const r = p.fn();
          p.s.limpiar = typeof r === 'function' ? r : null;
          p.s.deps = p.deps; p.s.nuevo = false;
        }
        if (!inst.sucio) break;
      }
      return inst.arbol;
    };
    inst.desmontar = () => { inst.vivo = false; for (const s of inst.hooks) if (s && s.limpiar) s.limpiar(); };
    inst.dibujar();
    return inst;
  };
  return { R, montar };
};

const nodos = (arbol, acc = []) => {
  if (!arbol || typeof arbol !== 'object') return acc;
  if (Array.isArray(arbol)) { arbol.forEach((x) => nodos(x, acc)); return acc; }
  acc.push(arbol);
  nodos(arbol.props?.children, acc);
  return acc;
};
const buscar = (inst, etiqueta) => nodos(inst.arbol).find((n) => n.props?.accessibilityLabel === etiqueta);
const tPrueba = (k, p) => (p ? `${k}${JSON.stringify(p)}` : k);

/* El navegador: el almacenamiento sobrevive a recargar; la memoria de la app, no. */
const almacen = new Map();
globalThis.window = {
  location: { pathname: '/' },
  localStorage: {
    getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => { almacen.set(k, String(v)); },
    removeItem: (k) => { almacen.delete(k); },
  },
};
const guardado = () => { const v = almacen.get('wee.creator.perfilActivo'); return v ? JSON.parse(v) : null; };

/* El estado compartido de la cuenta, como `UserProfileContext` (en memoria) y `AuthContext`. */
const crearPagina = ({ ruta, uid = 'u1', tieneWee = true, sesionLista = true }) => {
  window.location.pathname = ruta;
  const pagina = {
    auth: { user: { uid, displayName: 'Ana' }, loading: !sesionLista },
    activo: 'real',
    tieneWee,
    cambios: 0,
    temas: [],
    montados: [],
  };
  const { R, montar } = crearReact();
  pagina.refrescar = () => pagina.montados.filter((m) => m.vivo).forEach((m) => m.dibujar());
  pagina.switchIdentity = () => { pagina.activo = pagina.activo === 'real' ? 'hidi' : 'real'; pagina.cambios++; pagina.montados.forEach((m) => { m.sucio = true; }); };
  const dobles = {
    react: R,
    'react-native': {
      View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: (x) => x, absoluteFill: {}, hairlineWidth: 1 }, Platform: { OS: 'web' },
    },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    '../../contexts/AuthContext': { useAuth: () => pagina.auth },
    '../../contexts/UserProfileContext': {
      useUserProfile: () => ({
        activeProfileType: pagina.activo, hasWeeProfile: pagina.tieneWee, realProfile: { uid: pagina.auth.user.uid },
        userProfile: { displayName: 'Ana' }, loading: false, error: null, switchIdentity: pagina.switchIdentity,
      }),
    },
    '../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: { background: '#fff', card: '#fff', border: '#eee', text: '#111', textSecondary: '#666', glow: 'x', accent: 'y', accentDark: 'z', surface: 's' } }, setThemeMode: (m) => pagina.temas.push(m) }) },
    '../../contexts/IdiomaContext': { useT: () => tPrueba },
    '../../hooks/useDireccion': { useDireccion: () => ({ esRTL: false, direccion: 'ltr', texto: {} }) },
    '../avatars/AvatarDisplay': { __esModule: true, default: 'AvatarDisplay' },
  };
  /* Un cargador nuevo por carga de página: el módulo se vuelve a evaluar, como en el navegador. */
  const cargar = crearCargador({ dobles });
  const Recuerdo = cargar('components/workspace/RecuerdoDelPerfil.tsx').default;
  const Identidad = cargar('components/workspace/IdentidadEnCreator.tsx').default;
  pagina.entrarEnCreator = () => {
    const recuerdo = montar(Recuerdo, { children: 'trabajo' });
    const identidad = montar(Identidad, { onAjustes: () => { pagina.ajustes = (pagina.ajustes || 0) + 1; } });
    pagina.montados.push(recuerdo, identidad);
    pagina.refrescar();
    return { recuerdo, identidad };
  };
  pagina.salirDeCreator = ({ recuerdo, identidad }) => { identidad.desmontar(); recuerdo.desmontar(); };
  pagina.velo = (recuerdo) => nodos(recuerdo.arbol).some((n) => n.type === 'ActivityIndicator');
  return pagina;
};
const PUESTA = (perfil) => tPrueba('menu.profileActive', { perfil: tPrueba(perfil) });
const CAMBIAR = (perfil) => tPrueba('menu.switchToProfile', { perfil: tPrueba(perfil) });

/* 1. La app arranca en la versión app («/»), con el Perfil Real, y se entra en creator. */
almacen.clear();
let p = crearPagina({ ruta: '/' });
let creator = p.entrarEnCreator();
check('B1) entrar en creator desde el Perfil Real no cambia la identidad', p.activo === 'real' && p.cambios === 0 && p.temas.length === 0);
check('B2) creator recuerda la cara puesta mientras se está dentro', guardado()?.uid === 'u1' && guardado()?.tipo === 'real');
check('B3) el avatar dice con qué cara se trabaja', !!buscar(creator.identidad, PUESTA('menu.realProfile')));

/* 2. Dentro de creator se cambia al Perfil Weë. */
buscar(creator.identidad, PUESTA('menu.realProfile')).props.onPress();
creator.identidad.dibujar();
const aWee = buscar(creator.identidad, CAMBIAR('menu.weeProfile'));
check('B4) con Perfil Weë, el panel ofrece las dos caras', !!aWee && !!buscar(creator.identidad, PUESTA('menu.realProfile')));
aWee.props.onPress();
p.refrescar();
check('B5) cambiar en creator es el switchIdentity de siempre y el tema oscuro de la app', p.activo === 'hidi' && p.cambios === 1 && p.temas.join() === 'dark');
check('B6) lo elegido queda recordado para una recarga', guardado()?.tipo === 'hidi');
buscar(creator.identidad, PUESTA('menu.weeProfile')).props.onPress();
creator.identidad.dibujar();
buscar(creator.identidad, PUESTA('menu.weeProfile'))?.props.onPress?.();
p.refrescar();
check('B7) tocar la cara que ya está puesta no hace nada', p.activo === 'hidi' && p.cambios === 1);

/* 3. Recargar en /creator: la memoria vuelve al Real, la sesión tarda en llegar. */
p = crearPagina({ ruta: '/creator', sesionLista: false });
creator = p.entrarEnCreator();
check('B8) al recargar, mientras la sesión no llega, creator espera (no enseña la cara equivocada)', p.velo(creator.recuerdo) && p.activo === 'real' && guardado()?.tipo === 'hidi');
p.auth = { ...p.auth, loading: false };
p.refrescar();
check('B9) llegada la sesión, se conserva el Perfil Weë', p.activo === 'hidi' && p.cambios === 1 && p.temas.join() === 'dark' && !p.velo(creator.recuerdo));
check('B10) y sigue recordado', guardado()?.tipo === 'hidi');

/* 4. Se sale a la versión app y allí se cambia de identidad. */
p.salirDeCreator(creator);
check('B11) al salir de creator se olvida lo guardado (la app manda fuera)', guardado() === null && p.activo === 'hidi');
p.switchIdentity();
check('B12) en la app se cambia al Perfil Real', p.activo === 'real');

/* 5. Se vuelve a creator en la misma carga de página. */
const antes = p.cambios;
creator = p.entrarEnCreator();
check('B13) al volver, creator enseña la identidad de la app: sin identidad vieja ni cambio accidental',
  p.activo === 'real' && p.cambios === antes && !p.velo(creator.recuerdo) && !!buscar(creator.identidad, PUESTA('menu.realProfile')));
check('B14) y recuerda la nueva', guardado()?.tipo === 'real');

/* 6. Recargar ahora en /creator: lo recordado es el Real, no se toca nada. */
p = crearPagina({ ruta: '/creator' });
creator = p.entrarEnCreator();
check('B15) recargar con el Real recordado no cambia nada', p.activo === 'real' && p.cambios === 0 && p.temas.length === 0);

/* 7. Casos que nunca deben cambiar la identidad compartida. */
almacen.set('wee.creator.perfilActivo', JSON.stringify({ uid: 'otra', tipo: 'hidi' }));
p = crearPagina({ ruta: '/creator' });
creator = p.entrarEnCreator();
check('B16) lo recordado de OTRA cuenta no se aplica', p.activo === 'real' && p.cambios === 0);
almacen.set('wee.creator.perfilActivo', JSON.stringify({ uid: 'u1', tipo: 'hidi' }));
p = crearPagina({ ruta: '/creator', tieneWee: false });
creator = p.entrarEnCreator();
check('B17) sin Perfil Weë en la cuenta no se cambia, ni se crea', p.activo === 'real' && p.cambios === 0);
buscar(creator.identidad, PUESTA('menu.realProfile')).props.onPress();
creator.identidad.dibujar();
check('B18) sin Perfil Weë, el panel no ofrece cambiar de cara', !buscar(creator.identidad, CAMBIAR('menu.weeProfile')));
buscar(creator.identidad, 'menu.settings').props.onPress();
check('B19) el panel lleva a la configuración de creator', p.ajustes === 1);
almacen.set('wee.creator.perfilActivo', JSON.stringify({ uid: 'u1', tipo: 'hidi' }));
p = crearPagina({ ruta: '/' });
creator = p.entrarEnCreator();
check('B20) una carga que empezó en la app nunca aplica lo recordado de creator', p.activo === 'real' && p.cambios === 0);

const IDENTIDAD = sinComentarios(leer('components/workspace/IdentidadEnCreator.tsx'));
check('B21) la pieza de identidad nunca crea perfiles ni escribe datos', !/ensureWeeProfile|setWeeProfile|usersService|updateProfile|setDoc|updateDoc|httpsCallable/.test(IDENTIDAD));
check('B22) solo cambia al tocar: switchIdentity vive dentro de elegir()', (IDENTIDAD.match(/switchIdentity\(\)/g) || []).length === 1 && /const elegir = useCallback\(\(destino: Identidad\) => \{[\s\S]*switchIdentity\(\);\s*setThemeMode\(destino === 'hidi' \? 'dark' : 'light'\);/.test(IDENTIDAD));
check('B23) el marco monta la pieza en lugar del avatar suelto, y sigue sin cambiar nada por sí mismo',
  /<IdentidadEnCreator onAjustes=\{\(\) => abrir\('Settings'\)\} \/>/.test(MARCO) && !/switchIdentity|setThemeMode/.test(MARCO));

/* ═════════════════════ C) UN SOLO CREDITS WALLET ═════════════════════ */

const BILLETERA = sinComentarios(leer('screens/WalletCreatorScreen.tsx'));
check('C1) la billetera de creator lee el mismo hook y el mismo servicio que la App', /useWallet\(\)/.test(BILLETERA) && /creditsService\.subscribeToTransactions\(/.test(BILLETERA)
  && /from '\.\.\/hooks\/useWallet'/.test(BILLETERA) && /from '\.\.\/services\/creditsService'/.test(BILLETERA));
check('C2) sin recargar, sin tienda, sin compra, sin escribir Credits', !/topUp|CreditStore|purchase|comprar|spendCredits|httpsCallable|paquete|navigate\(/i.test(BILLETERA));
check('C3) el saldo de la cabecera es el CreditsPill de la App, abierto en la billetera de creator', /<CreditsPill compact=\{!isDesktop\} onPress=\{\(\) => abrir\('Wallet'\)\} \/>/.test(MARCO));
check('C4) creator no tiene servicio, hook ni colección de Credits propios',
  !fs.readdirSync(path.resolve(RAIZ, 'services')).some((f) => /creator.*credit|credit.*creator/i.test(f)) && !fs.readdirSync(path.resolve(RAIZ, 'hooks')).some((f) => /creator.*wallet|wallet.*creator/i.test(f)));

/* ═════════════════════ D) LA CONFIGURACIÓN DE CREATOR ═════════════════════ */

const AJUSTES = leer('screens/AjustesCreatorScreen.tsx');
check('D1) Idioma, Privacidad (política), Acerca de, Ayuda y Cuenta, con claves que ya existen',
  ['settings.sectionPreferences', 'settings.sectionPrivacy', 'settings.sectionInfo', 'settings.sectionAccount', 'settings.language', 'settings.privacyPolicy', 'settings.about', 'settings.help', 'settings.signOut']
    .every((k) => AJUSTES.includes(`t('${k}'`)));
check('D2) la política de privacidad vive en su bloque de Privacidad', /const privacidad: Fila\[\] = \[\s*\{ id: 'privacy'/.test(AJUSTES) && /bloque\(t\('settings\.sectionPrivacy'\), privacidad\)/.test(AJUSTES));
check('D3) nada social: ni comunidades, ni respuestas privadas, ni ubicación, ni notificaciones push', !/myCommunities|privateReplies|settings\.location|pushNotifications/.test(AJUSTES));
check('D4) cerrar sesión pide confirmación', /await confirmAction\(t\('settings\.signOut'\), t\('menu\.signOutConfirm'\)/.test(AJUSTES));

/* ═════════════════════ E) WEË TRAVEL COMPLETO, DENTRO DEL MARCO DE CREATOR ═════════════════════ */

const NAV = leer('navigation/EspacioProfesionalNavigator.tsx');
const APP = leer('App.tsx');
const DATOS = leer('constants/espacioProfesional.ts');
const ESP = sinComentarios(leer('screens/SpecialistScreen.tsx'));
const MARCO_TRAVEL = leer('components/travel/MarcoDeTravel.tsx');
const SHELL = leer('components/creator/CreatorShell.tsx');
const PANTALLAS_TRAVEL = fs.readdirSync(path.resolve(RAIZ, 'screens/travel')).filter((f) => /\.tsx$/.test(f));
check('E1) la pila de creator registra la MISMA ruta `Travel` (screens/travel/TravelScreen.tsx)', /import TravelScreen from '\.\.\/screens\/travel\/TravelScreen';/.test(NAV) && /<Pila\.Screen name="Travel" component=\{TravelScreen\} \/>/.test(NAV));
check('E2) /creator/travel/<pantalla>/<id> con la misma lectura de la dirección que la app',
  (APP.match(/Travel: \{ path: 'travel\/:pantalla\/:id\?', parse: \{ pantalla: \(v: string\) => \(esPantallaDeTravel\(v\) \? v : 'descubrir'\)/g) || []).length === 2
  && /Wallet: 'billetera',[\s\S]{0,200}Travel: \{ path: 'travel\/:pantalla/.test(APP));
check('E3) dentro del workspace, la entrada Weë Travel de la navegación sigue encendida', /if \(ruta === 'Travel'\) return 'travel';/.test(DATOS));
check('E4) la portada de Travel (héroe + caja + workspace) es la misma en creator', /const portadaDeTravel = lanzador && spec\.id === 'travel';/.test(ESP) && /<CuerpoDeTravel\b/.test(ESP));
check('E5) un solo punto de presentación: MarcoDeTravel monta CreatorShell, que en creator quita la barra y la cabecera de la app',
  /<CreatorShell activeId="travel"/.test(MARCO_TRAVEL) && /\{!enProfesional && <CreatorSidebar activeId=\{activeId\} \/>\}/.test(SHELL) && /\{!enProfesional && <View style=\{\[styles\.topBar/.test(SHELL));
check('E6) los seis módulos y sus pantallas están (una implementación, sin copia de creator)',
  ['Descubrir', 'Planear', 'Viajes', 'Explorar', 'Asistente', 'Comunidad', 'TravelScreen'].every((n) => PANTALLAS_TRAVEL.includes(`${n}.tsx`))
  && !fs.existsSync(path.resolve(RAIZ, 'screens/travel-creator')) && !fs.existsSync(path.resolve(RAIZ, 'components/travel-creator')));
check('E7) pedir Weë Studio desde Travel (recuerdos) abre la sección de creator, dentro del marco', /<Pila\.Screen name="Studio" component=\{StudioEnCreator\} \/>/.test(NAV) && /navigation\.replace\('Specialist', \{ id: 'studio' \}\)/.test(NAV));
check('E8) las claves travel.* existen en los 42 diccionarios', fs.readdirSync(path.resolve(RAIZ, 'i18n/textos')).filter((d) => fs.statSync(path.resolve(RAIZ, 'i18n/textos', d)).isDirectory())
  .every((d) => fs.existsSync(path.resolve(RAIZ, 'i18n/textos', d, 'travel.ts')) && /import \{ travel \} from '\.\/travel';/.test(leer(`i18n/textos/${d}/index.ts`))));

/* ═════════════ F) TRAVEL · COMUNIDAD Y RECUERDOS: EN CREATOR SOLO RECUERDOS, EN LA APP IGUAL (ejecutado) ═════════════ */

const dibujarComunidad = async (enCreator) => {
  const { R, montar } = crearReact();
  const registro = { lecturasDelMuro: 0, navegar: [], navegarFuera: [] };
  const Stub = (nombre) => Object.assign(() => null, { displayName: nombre });
  const PostCard = Stub('PostCard');
  const Marco = Stub('MarcoDeTravel');
  const piezas = Object.fromEntries(['AvisoDemo', 'Boton', 'Campo', 'Chip', 'EstadoCarga', 'EstadoError', 'EstadoVacio', 'FilaDeChips', 'Fila', 'Pestanas', 'SelloDemo', 'Tarjeta', 'TituloDeSeccion'].map((n) => [n, Stub(n)]));
  const cargar = crearCargador({
    dobles: {
      react: R,
      'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: (x) => x } },
      '../../components/travel/MarcoDeTravel': { __esModule: true, default: Marco },
      '../../components/travel/Piezas': piezas,
      '../../components/travel/Tarjetas': { GaleriaFotos: Stub('GaleriaFotos'), TarjetaActividad: Stub('TarjetaActividad'), TarjetaViajeCompartido: Stub('TarjetaViajeCompartido'), VistaMapa: Stub('VistaMapa') },
      '../../components/travel/Brain': { SugerenciaIA: Stub('SugerenciaIA') },
      '../../components/PostCard': { __esModule: true, default: PostCard },
      '../../components/travel/tema': { TRAVEL: {} },
      '../../contexts/AuthContext': { useAuth: () => ({ user: { uid: 'u1' } }) },
      '../../contexts/EspacioProfesionalContext': { useEnEspacioProfesional: () => enCreator },
      '../../hooks/useDireccion': { useDireccion: () => ({ contenedor: {} }) },
      '../../hooks/useTravelDemo': { useTravelDemo: () => ({ viajes: [], diario: [], guardadosDeComunidad: [], lugaresGuardados: [] }) },
      '../../hooks/useTextosDeTravel': { useTextosDeTravel: () => ({ t: tPrueba, locale: 'es', nombreDestino: () => '', pais: () => '' }) },
      '../../services/firestoreService': { postsService: { getPublicPostsPaginated: async () => { registro.lecturasDelMuro++; return {}; } } },
      '../../utils/sectionFeed': { sobreconsulta: (n) => n, paginaDeLaSeccion: async (leerPagina) => { await leerPagina(null); return { visibles: [{ id: 'p1', content: 'Kioto' }, { id: 'p2', content: 'Lima' }] }; } },
      '../../constants/travelDemo': { CATEGORIAS: [], DESTINOS: [], ITINERARIOS_COMPARTIDOS: [], LUGARES: [], destinoPorId: () => undefined },
      '../../utils/travelItinerario': { estadoDe: () => 'pasado', generarItinerario: () => [], nuevoId: () => 'x' },
      './rutas': {
        useTravelNav: () => ({
          ir: () => {}, preguntarABrain: () => {},
          navigation: { navigate: (...a) => registro.navegar.push(a), getParent: () => ({ navigate: (...a) => registro.navegarFuera.push(a) }) },
        }),
      },
    },
  });
  const { ComunidadScreen } = cargar('screens/travel/Comunidad.tsx');
  const inst = montar(ComunidadScreen, {});
  await new Promise((r) => setTimeout(r, 0));
  inst.dibujar();
  const todo = nodos(inst.arbol);
  return {
    registro,
    postCards: todo.filter((n) => n.type === PostCard).length,
    botones: todo.filter((n) => n.type === piezas.Boton).map((n) => n.props),
    recuerdos: todo.some((n) => typeof n.type === 'function' && n.type.name === 'EntradaARecuerdos'),
    pestanas: todo.some((n) => n.type === piezas.Pestanas),
    marco: todo.find((n) => n.type === Marco)?.props,
  };
};
const enApp = await dibujarComunidad(false);
const enCreatorTravel = await dibujarComunidad(true);
check('F1) en la App el módulo sigue igual: muro con PostCard, pestañas, publicar y Weëls',
  enApp.postCards === 2 && enApp.pestanas && enApp.registro.lecturasDelMuro === 1
  && enApp.botones.some((b) => b.texto === 'travel.shareExperience') && enApp.botones.some((b) => b.texto === 'travel.weels'),
  JSON.stringify({ p: enApp.postCards, t: enApp.pestanas, l: enApp.registro.lecturasDelMuro }));
check('F2) en creator no se renderiza el muro ni PostCard, y ni siquiera se lee', enCreatorTravel.postCards === 0 && enCreatorTravel.registro.lecturasDelMuro === 0 && !enCreatorTravel.pestanas);
check('F3) en creator no hay publicar, ni Weëls, ni WeeTalk', !enCreatorTravel.botones.some((b) => ['travel.shareExperience', 'travel.weels'].includes(b.texto)));
check('F4) en creator quedan los recuerdos (diario, álbumes, vídeos, mapa, resumen) con su título', enCreatorTravel.recuerdos && enCreatorTravel.marco?.titulo === 'travel.memories');
const verEnApp = enCreatorTravel.botones.find((b) => b.texto === 'profesional.switchToApp');
verEnApp?.onPress();
check('F5) «Ver en la App» (clave existente profesional.switchToApp) sale a la pila principal, al mismo módulo',
  !!verEnApp && JSON.stringify(enCreatorTravel.registro.navegarFuera) === JSON.stringify([['Travel', { pantalla: 'comunidad' }]]) && enCreatorTravel.registro.navegar.length === 0);
check('F6) una sola versión del archivo: la diferencia la decide useEnEspacioProfesional()', /const enCreator = useEnEspacioProfesional\(\);/.test(leer('screens/travel/Comunidad.tsx')) && !fs.existsSync(path.resolve(RAIZ, 'screens/travel/ComunidadCreator.tsx')));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
