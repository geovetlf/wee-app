/**
 * P11 · «AÑADIR» Y «CREAR ALGO NUEVO» DE UN PROYECTO LLEVAN EL PROYECTO HASTA CREATORFLOW, POR TODAS LAS ENTRADAS (R8, CL-20).
 *
 *   node test/proyecto-en-las-entradas.test.mjs
 *
 * `CreatorFlow` ya manda `projectId` en su primera llamada (`creatorChat`) cuando lo recibe en la ruta (R7-Design, CL-20), y la
 * fila de un proyecto lo pasa al reabrir una creación. Lo que faltaba eran las puertas por donde se entra DESDE un proyecto:
 * «Añadir» y «Crear algo nuevo» iban al selector de Weë AI sin nada, y un parámetro que no reenvía ninguna pantalla intermedia se
 * pierde en el primer salto. Conectarlo a medias —solo el selector, por ejemplo— deja unas puertas con proyecto y otras sin él,
 * que es peor que ninguna: por eso esta suite recorre TODAS las entradas con las pantallas de verdad.
 *
 *   A · La ruta declara lo que se manda (`projectId` en `WeeCreator` y en `Specialist`) y el enlace no lo cuela sin validar.
 *   B · La página de un proyecto: «Añadir» y «Crear algo nuevo» llevan el proyecto al selector.
 *   C · El selector (`WeeCreator`): cada categoría y «Empezar».
 *   D · La ficha de un especialista (`Specialist`): cada entrada de la ficha, y el reparto a las cinco pantallas de especialista.
 *   E · Weë Studio, Weë Chef, Weë Business y Weë Brain: cada una lleva el proyecto de SU ruta a `CreatorFlow`.
 *   F · De punta a punta: lo que navega cada entrada entra en `CreatorFlow` y sale hacia `creatorChat` con el proyecto.
 *   G · Cobertura: ninguna llamada nueva a `CreatorFlow`/`Specialist`/`WeeCreator` de estas pantallas se queda sin decidir.
 *   H · CL-25: los restos de lo que ya no existe en Weë Design no vuelven (el comentario del muro y la rama inalcanzable).
 *
 * Cada entrada se prueba DOS veces: con proyecto en la ruta (lo lleva) y sin él (la llamada es EXACTAMENTE la de siempre: ni la
 * clave `projectId` vacía ni con valor `undefined`; se comparan las claves y su orden). Sin red, sin emulador, sin secretos.
 *
 * ── Lo que NO se prueba aquí ────────────────────────────────────────────────
 *
 * `DesignScreen` (lo edita la tarea del puente: su «Crear» todavía no llega a `CreatorFlow`; cuando llegue, la sección G exige
 * que lleve el proyecto), el aspecto, el desplazamiento y la navegación de verdad de React Navigation (el cambio de pila no se
 * ejecuta: se mira qué pide cada pantalla). Reabrir una creación (`jobId`), «Ver todas» y los menús globales NO llevan el
 * proyecto, a propósito (G lo lista con su motivo).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearComprobador } from './_aceptacion.mjs';
import { crearEntorno, React, h } from './_pantallas.mjs';
import { crearCargador, leer, RAIZ } from './filmmaker-cliente.mjs';
import { crearFlujo, crearProyecto } from './_creatorflow-en-proceso.mjs';

const { check, titulo, aviso, terminar } = crearComprobador();
const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
const ts = requerir('typescript');

/* ── Lo de verdad que hace falta saber: el traductor, el catálogo y las constantes ─────────────────────────────────────── */
const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const DICCIONARIOS = { es: base('i18n/textos/es/index.ts').es, en: base('i18n/textos/en/index.ts').en };
const formatoReal = base('i18n/formato.ts');
const t = crearTraductor('es', DICCIONARIOS, {});
const formato = {
  numero: (v, o) => formatoReal.formatearNumero(v, 'es', o),
  lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo),
  hora: () => '12:00',
};
const { WEE_EXPERIENCES, getExperienceById } = base('constants/weeExperiences.ts');
const CHEF = base('constants/chefTools.ts');
const BUSINESS = base('constants/businessModules.ts');

/* ── Cómo se comparan las llamadas: claves Y orden Y valores `undefined`, que es lo que `JSON.stringify` esconde ────────── */
const forma = (v) => JSON.stringify(v, (_k, x) => (x === undefined ? '«undefined»' : x));
const igual = (a, b) => forma(a) === forma(b);
const copiar = (navegacion) => navegacion.map((paso) => structuredClone(paso));
const PROYECTO = 'proj-7';

/* ── Un entorno por pantalla: el código de verdad, con dobles de lo que no es de Weë ──────────────────────────────────── */
const textoDe = (hijos) => React.Children.toArray(hijos).map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : c?.props ? textoDe(c.props.children) : '')).join(' ').replace(/\s+/g, ' ').trim();

const dobleDelContexto = (ctx) => ({
  '../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: ctx.colores } }), enTemaClaro: (C) => C },
  '../contexts/IdiomaContext': { useIdioma: () => ({ t, formato, locale: 'es' }), useT: () => t },
  '../contexts/AuthContext': { useAuth: () => ({ user: ctx.usuario }) },
  '../hooks/useResponsive': { useResponsive: () => ({ isMobile: true, isTablet: false, isDesktop: false }) },
  /* Un botón sin etiqueta propia se encuentra por su texto, como en `_creatorflow-en-proceso.mjs`. */
  'react-native': { ...ctx.reactNative, TouchableOpacity: (p) => ctx.Toque({ ...p, accessibilityLabel: p.accessibilityLabel ?? textoDe(p.children) }), TextInput: ctx.capturar('TextInput') },
});

/**
 * El navegador de mentira: anota cada `navigate` y devuelve como ruta lo que la prueba ponga en `actual.ruta`. `useRoute` es lo
 * que esta ronda añade a las pantallas de especialista: sin él, ninguna sabría de qué proyecto viene.
 */
const dobleDelNavegador = (ctx, actual) => ({
  '@react-navigation/native': {
    useNavigation: () => ({
      navigate: (...a) => ctx.navegacion.push(['navigate', ...a]),
      push: (...a) => ctx.navegacion.push(['push', ...a]),
      goBack: () => ctx.navegacion.push(['goBack']),
      setParams: (...a) => ctx.navegacion.push(['setParams', ...a]),
      canGoBack: () => true,
    }),
    useRoute: () => ({ params: actual.ruta }),
    useFocusEffect: () => {},
  },
});

const pantalla = (archivo, piezas) => {
  const actual = { ruta: {} };
  const env = crearEntorno({
    pantalla: archivo,
    dobles: (ctx) => ({ ...dobleDelContexto(ctx), ...dobleDelNavegador(ctx, actual), ...piezas(ctx) }),
  });
  /**
   * Un escenario: la ruta que trae, lo que se hace (con la pantalla ya dibujada) y las llamadas a `navigate` que salen. La
   * pantalla empieza de cero cada vez; si no recibe `proyecto`, la ruta NO lleva la clave `projectId` (no una vacía).
   */
  const correr = (ruta, proyecto, hacer) => {
    actual.ruta = proyecto ? { ...ruta, projectId: proyecto } : { ...ruta };
    env.reiniciar();
    env.dibujar();
    hacer(env);
    return copiar(env.navegacion);
  };
  return { env, actual, correr };
};

const pieza = (ctx, nombre, dibujo) => ({ __esModule: true, default: ctx.capturar(nombre, dibujo) });
const marco = (ctx, nombre = 'CreatorShell') => pieza(ctx, nombre, (p) => h('main', null, p.children));

/* El selector de Weë AI */
const selector = pantalla('screens/WeeCreatorScreen.tsx', (ctx) => ({
  '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: null, hasWeeProfile: false }) },
  '../hooks/useWallet': { useWallet: () => ({ balance: 100 }) },
  '../services/creatorInterestService': { creatorInterestService: { getMyCategoryIds: async () => [], register: async () => {}, remove: async () => {} } },
  '../services/creatorService': { creatorService: { getMyJobs: async () => [] }, claveDelEstado: {} },
  '../components/creator/CreatorShell': marco(ctx),
}));

/* La ficha de un especialista, con las cinco pantallas de especialista como marcas (lo que dibujan por dentro es de otra sección) */
const ficha = pantalla('screens/SpecialistScreen.tsx', (ctx) => ({
  '../services/creatorService': { creatorService: { getMyJobsDe: async () => [] }, claveDelEstado: {} },
  './BrainChatScreen': pieza(ctx, 'BrainChatScreen'),
  './StudioScreen': pieza(ctx, 'StudioScreen'),
  './DesignScreen': pieza(ctx, 'DesignScreen'),
  './ChefScreen': pieza(ctx, 'ChefScreen'),
  './BusinessScreen': pieza(ctx, 'BusinessScreen'),
  '../components/creator/CreatorShell': marco(ctx),
  '../components/creator/CabeceraDeSeccion': pieza(ctx, 'CabeceraDeSeccion'),
  '../components/creator/ActionGrid': pieza(ctx, 'ActionGrid'),
  '../components/creator/IdeaBox': pieza(ctx, 'IdeaBox'),
  '../components/creator/TravelLauncher': pieza(ctx, 'TravelLauncher'),
  '../components/creator/TravelMark': pieza(ctx, 'TravelMark'),
  '../components/creator/UploadBox': pieza(ctx, 'UploadBox'),
  '../components/creator/ExamplesRow': pieza(ctx, 'ExamplesRow'),
  '../components/creator/WriterDocuments': pieza(ctx, 'WriterDocuments'),
  '../components/creator/ui': { SectionTitle: ctx.capturar('SectionTitle'), ClosingBanner: ctx.capturar('ClosingBanner') },
}));

/* Weë Studio */
const studio = pantalla('screens/StudioScreen.tsx', (ctx) => ({
  '../components/creator/CajaQueCrece': { PaginaDeCajas: ctx.capturar('PaginaDeCajas') },
  '../components/studio/StudioHeader': pieza(ctx, 'StudioHeader'),
  '../components/studio/StudioPromptComposer': pieza(ctx, 'StudioPromptComposer'),
  '../components/creator/AjustesContextuales': pieza(ctx, 'AjustesContextuales'),
  '../components/EspacioDeEscritura': { __esModule: true, default: ctx.capturar('EspacioDeEscritura'), useAlturaDelTeclado: () => 0 },
  '../components/BarraInferior': { ALTO_BARRA: 64 },
  '../components/studio/StudioEntradas': pieza(ctx, 'StudioEntradas'),
  '../components/studio/StudioPanel': pieza(ctx, 'StudioPanel'),
  '../components/creator/AvisoDeCreacion': pieza(ctx, 'AvisoDeCreacion'),
  '../components/creator/FilaDeCreaciones': pieza(ctx, 'FilaDeCreaciones'),
  '../components/studio/StudioControles': {},
  '../components/creator/FichaDeContexto': pieza(ctx, 'FichaDeContexto'),
}));

/* Weë Chef */
const chef = pantalla('screens/ChefScreen.tsx', (ctx) => ({
  '../hooks/useEspecialista': { useEspecialista: () => ({ headline: 'La cocina, sin complicarte' }) },
  '../services/creatorService': { creatorService: { getMyJobsDe: async () => [] } },
  '../components/BarraInferior': { ALTO_BARRA: 64 },
  '../components/EspacioDeEscritura': pieza(ctx, 'EspacioDeEscritura'),
  '../components/creator/CajaQueCrece': { PaginaDeCajas: ctx.capturar('PaginaDeCajas') },
  '../components/creator/CabeceraDeSeccion': pieza(ctx, 'CabeceraDeSeccion'),
  '../components/creator/CajaDePrompt': pieza(ctx, 'CajaDePrompt'),
  '../components/creator/AjustesContextuales': pieza(ctx, 'AjustesContextuales'),
  '../components/chef/ChefAcciones': pieza(ctx, 'ChefAcciones'),
  '../components/chef/ChefPanel': pieza(ctx, 'ChefPanel'),
  '../components/chef/ChefProyectos': pieza(ctx, 'ChefProyectos'),
}));

/* Weë Business: sus piezas con nombre se capturan por el nombre con que se piden */
const business = pantalla('screens/BusinessScreen.tsx', (ctx) => ({
  'react-native': { ...ctx.reactNative, TouchableOpacity: (p) => ctx.Toque({ ...p, accessibilityLabel: p.accessibilityLabel ?? textoDe(p.children) }), Share: { share: async () => {} } },
  '../hooks/useEspecialista': { useEspecialista: () => ({ intro: 'Crea, administra, promociona.', headline: 'Business', actions: [] }) },
  '../components/business/BusinessModulos': pieza(ctx, 'BusinessModulos'),
  '../components/business/BusinessPricing': pieza(ctx, 'BusinessPricing'),
  '../components/business/BusinessPanel': new Proxy({}, { get: (_o, k) => (k === '__esModule' ? false : ctx.capturar(String(k))) }),
  '../components/creator/CabeceraDeSeccion': pieza(ctx, 'CabeceraDeSeccion'),
  '../components/creator/CreatorShell': marco(ctx),
  '../components/studio/StudioPromptComposer': pieza(ctx, 'StudioPromptComposer'),
}));

/* Weë Brain: una conversación con una sugerencia de Weë Brain a la vista (le propone ir a Weë Design) */
const conversacion = {
  messages: [
    { id: 'm1', role: 'user', text: 'quiero un logo para mi cafetería' },
    { id: 'm2', role: 'assistant', text: 'Eso lo hace mejor Weë Design.', suggestedExperience: 'design' },
  ],
  busy: false, quoting: false, quote: { credits: 1, usd: 0 }, quoteError: null, error: null, shortfall: null, bloque: null,
  user: { uid: 'u1' }, send: async () => {}, reset: () => {}, refreshQuote: async () => {},
};
const fichasDeBrain = [];
const brain = pantalla('screens/BrainChatScreen.tsx', (ctx) => ({
  'expo-image': { Image: () => h('img') },
  '../hooks/useEspecialista': { useEspecialista: () => ({ actions: [], intro: '', headline: '' }) },
  '../hooks/useBrainChat': { useBrainChat: () => conversacion },
  '../hooks/useWallet': { useWallet: () => ({ balance: 10 }) },
  '../components/brain/CabeceraDeWeeBrain': pieza(ctx, 'CabeceraDeWeeBrain'),
  '../components/brain/SistemaDeWeeBrain': { __esModule: true, default: ctx.capturar('SistemaDeWeeBrain'), CEREBRO_DE_WEE: 1 },
  '../components/creator/AjustesContextuales': pieza(ctx, 'AjustesContextuales'),
  '../components/creator/CajaDePrompt': pieza(ctx, 'CajaDePrompt'),
  '../components/creator/CreatorShell': marco(ctx),
  '../components/creator/ui': { Chip: (p) => { fichasDeBrain.push(p); return h('i'); } },
}));

/* ═══ A · LA RUTA DECLARA LO QUE SE MANDA ═════════════════════════════════════════════════════════════════════════════ */
titulo('A · La ruta declara lo que se manda');
{
  /* Lo que declara `MainStackParamList` para una ruta, leído del código (sin cargar el programa entero de TypeScript: eso lo hace `navegacion-parametros`). */
  const fuenteNav = ts.createSourceFile('MainStackNavigator.tsx', leer('navigation/MainStackNavigator.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaradas = (ruta) => {
    let claves = null;
    const buscar = (n) => {
      if (ts.isTypeAliasDeclaration(n) && n.name.text === 'MainStackParamList' && ts.isTypeLiteralNode(n.type)) {
        const miembro = n.type.members.find((m) => ts.isPropertySignature(m) && m.name.getText(fuenteNav) === ruta);
        const literales = (tipo) => (ts.isTypeLiteralNode(tipo) ? [tipo] : ts.isUnionTypeNode(tipo) ? tipo.types.flatMap(literales) : []);
        if (miembro?.type) claves = literales(miembro.type).flatMap((l) => l.members.map((m) => m.name?.getText(fuenteNav)).filter(Boolean));
      }
      ts.forEachChild(n, buscar);
    };
    buscar(fuenteNav);
    return claves;
  };
  const selectorDeclara = declaradas('WeeCreator');
  const especialistaDeclara = declaradas('Specialist');
  check('A1 · `WeeCreator` declara el proyecto (`projectId`), además de su categoría', !!selectorDeclara && selectorDeclara.includes('projectId') && selectorDeclara.includes('category'), (selectorDeclara || []).join(', '));
  check('A2 · `Specialist` declara el proyecto (`projectId`), además de su `id`', !!especialistaDeclara && especialistaDeclara.includes('projectId') && especialistaDeclara.includes('id'), (especialistaDeclara || []).join(', '));
  check('A3 · `CreatorFlow` lo sigue declarando (es `ContextoDeExperiencia.projectId`), y la dirección /weeai lo valida con `esId`',
    /export interface ContextoDeExperiencia \{[\s\S]*?\n  projectId\?: string;/.test(leer('constants/weeWorkspaces.ts')) && /projectId: \(v: string\) => \(esId\(v\) \? v : undefined\)/.test(leer('App.tsx')));

  /*
   * El enlace: `WeeCreator` y `Specialist` NO tienen configuración de enlaces (`App.tsx` no las nombra: React Navigation escribe su
   * nombre y no sabe leerlas al recargar; es lo de siempre y no cambia). Por eso `App.tsx` no se toca. Si algún día se les da una
   * dirección con parámetros, `projectId` tiene que validarse como el resto de identificadores: la dirección la escribe cualquiera.
   */
  const app = leer('App.tsx');
  const config = app.slice(app.indexOf('const linking'), app.indexOf('// Global error handler'));
  for (const ruta of ['WeeCreator', 'Specialist']) {
    const entrada = config.match(new RegExp(`\\b${ruta}\\s*:\\s*(\\{[\\s\\S]*?\\n      \\}|'[^']*')`));
    check(`A4 · ${ruta}: sin dirección propia no hay nada que validar; con ella, \`projectId\` pasa por \`esId\``,
      !entrada || /projectId:\s*\(v: string\) => \(esId\(v\) \? v : undefined\)/.test(entrada[1]), entrada ? entrada[0].slice(0, 80) : 'sin entrada de enlace (como hasta hoy)');
  }
}

/* ═══ B · LA PÁGINA DE UN PROYECTO ════════════════════════════════════════════════════════════════════════════════════ */
titulo('B · La página de un proyecto: «Añadir» y «Crear algo nuevo»');
{
  const p = await crearProyecto({ id: 'proj-1', trabajos: [] });
  p.capturas.SectionTitle.onAction();
  const trasAnadir = copiar(p.navegacion);
  p.navegacion.length = 0;
  p.capturas.ClosingBanner.onPress();
  const trasCrear = copiar(p.navegacion);
  check('B1 · «Añadir» (el botón de la sección de creaciones) abre el selector de Weë AI LLEVANDO el proyecto',
    igual(trasAnadir, [['navigate', 'WeeCreator', { projectId: 'proj-1' }]]), forma(trasAnadir));
  check('B2 · «Crear algo nuevo» (el cierre de la página) también', igual(trasCrear, [['navigate', 'WeeCreator', { projectId: 'proj-1' }]]), forma(trasCrear));
  check('B3 · y los textos de los dos botones son los de siempre («Añadir», «Crear algo nuevo»): no se cambia ninguna pantalla ni ninguna palabra',
    p.capturas.SectionTitle.action === t('projects.add') && p.capturas.ClosingBanner.button === t('projects.createSomethingNew'), `${p.capturas.SectionTitle.action} · ${p.capturas.ClosingBanner.button}`);
  p.cerrar();
}

/* ═══ C-G · TODAS LAS ENTRADAS, CON PROYECTO Y SIN ÉL ═════════════════════════════════════════════════════════════════ */
/**
 * El catálogo de entradas: de qué pantalla, con qué ruta, qué se toca y qué tiene que salir. `salida(proyecto)` es lo que sale
 * CON proyecto y SIN él: sin él, es exactamente lo que salía antes de P11 (claves, orden y valores `undefined` incluidos).
 */
const conProyecto = (proyecto) => (proyecto ? { projectId: proyecto } : {});
const tocarCategoria = (nombreDelEspecialista) => (env) => {
  const exp = WEE_EXPERIENCES.find((e) => e.id === nombreDelEspecialista);
  const boton = env.dibujar().botones.find((b) => String(b.etiqueta).startsWith(`${exp.emoji} ${exp.name}`));
  if (!boton) throw new Error(`el selector no pinta la categoría «${exp.name}»`);
  boton.tocar();
};
const aMano = (accion) => ({ goal: accion.goal, preset: accion.preset });
const casos = [];

/* — C · el selector — */
for (const exp of WEE_EXPERIENCES) {
  casos.push({
    id: `C1-${exp.id}`, donde: `el selector · la categoría «${exp.name}»`, pantalla: selector, ruta: {}, hacer: tocarCategoria(exp.id),
    salida: (p) => [['navigate', 'Specialist', { id: exp.id, ...conProyecto(p) }]],
  });
}
casos.push({
  id: 'C2', donde: 'el selector · «Empezar» con una categoría elegida y sin frase', pantalla: selector, ruta: { category: 'chef' },
  hacer: (env) => { env.tocar(t('weeai.startWith', { nombre: getExperienceById('chef').name })); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'chef', goal: undefined, ...conProyecto(p) }]],
});
casos.push({
  id: 'C3', donde: 'el selector · «Empezar» con lo que se buscó escrito', pantalla: selector, ruta: { category: 'chef' },
  hacer: (env) => { env.capturas.TextInput.onChangeText('una cena para cuatro'); env.dibujar(); env.tocar(t('weeai.startWith', { nombre: getExperienceById('chef').name })); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'chef', goal: 'una cena para cuatro', ...conProyecto(p) }]],
});

/* — D · la ficha de un especialista — */
const delCatalogo = (env, pieza_, propiedad) => env.capturas[pieza_][propiedad];
casos.push({
  id: 'D1', donde: 'la ficha de Weë Music · la caja de la idea', pantalla: ficha, ruta: { id: 'music' },
  hacer: (env) => { env.capturas.IdeaBox.onSubmit('una canción para mi madre'); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'music', goal: 'una canción para mi madre', preset: undefined, imageUri: undefined, ...conProyecto(p) }]],
});
casos.push({
  id: 'D2', donde: 'la ficha de Weë Music · una acción de la cuadrícula', pantalla: ficha, ruta: { id: 'music' },
  hacer: (env) => { env.capturas.ActionGrid.onPress(delCatalogo(env, 'ActionGrid', 'actions').find((a) => a.preset)); },
  salida: (p, env) => {
    const accion = delCatalogo(env, 'ActionGrid', 'actions').find((a) => a.preset);
    return [['navigate', 'CreatorFlow', { experienceId: 'music', goal: accion.goal, preset: accion.preset, imageUri: undefined, ...conProyecto(p) }]];
  },
});
casos.push({
  id: 'D3', donde: 'la ficha de Weë Music · un ejemplo', pantalla: ficha, ruta: { id: 'music' },
  hacer: (env) => { env.capturas.ExamplesRow.onPressItem(delCatalogo(env, 'ExamplesRow', 'examples')[0]); },
  salida: (p, env) => {
    const ejemplo = delCatalogo(env, 'ExamplesRow', 'examples')[0];
    return [['navigate', 'CreatorFlow', { experienceId: 'music', goal: ejemplo.subtitle ? `${ejemplo.title} · ${ejemplo.subtitle}` : ejemplo.title, preset: undefined, imageUri: undefined, ...conProyecto(p) }]];
  },
});
casos.push({
  id: 'D4', donde: 'la ficha de Weë Music · «Ver más» de los ejemplos', pantalla: ficha, ruta: { id: 'music' },
  hacer: (env) => { env.capturas.ExamplesRow.onAction(); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'music', goal: undefined, preset: undefined, imageUri: undefined, ...conProyecto(p) }]],
});
casos.push({
  id: 'D5', donde: 'la ficha de Weë Music · el cierre', pantalla: ficha, ruta: { id: 'music' },
  hacer: (env) => { env.capturas.ClosingBanner.onPress(); },
  salida: (p, env) => [['navigate', 'CreatorFlow', { experienceId: 'music', goal: env.capturas.ClosingBanner.title, preset: undefined, imageUri: undefined, ...conProyecto(p) }]],
});
casos.push({
  id: 'D6', donde: 'la ficha de Weë Photo · subir la foto', pantalla: ficha, ruta: { id: 'photo' },
  hacer: (env) => { env.capturas.UploadBox.onPick('file:///foto-de-mi-gato.jpg'); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'photo', goal: undefined, preset: undefined, imageUri: 'file:///foto-de-mi-gato.jpg', ...conProyecto(p) }]],
});
casos.push({
  id: 'D7', donde: 'la ficha de Weë Travel · la frase del viaje', pantalla: ficha, ruta: { id: 'travel' },
  hacer: (env) => { env.capturas.TravelLauncher.onSubmit('un fin de semana en Lisboa'); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'travel', goal: 'un fin de semana en Lisboa', preset: undefined, imageUri: undefined, ...conProyecto(p) }]],
});
casos.push({
  id: 'D8', donde: 'la ficha de Weë Travel · una de sus funciones', pantalla: ficha, ruta: { id: 'travel' },
  hacer: (env) => { env.capturas.TravelLauncher.onAction(delCatalogo(env, 'TravelLauncher', 'actions').find((a) => a.preset)); },
  salida: (p, env) => {
    const accion = delCatalogo(env, 'TravelLauncher', 'actions').find((a) => a.preset);
    return [['navigate', 'CreatorFlow', { experienceId: 'travel', goal: accion.goal, preset: accion.preset, imageUri: undefined, ...conProyecto(p) }]];
  },
});
casos.push({
  id: 'D9', donde: 'una acción que abre la conversación de OTRA experiencia (`opens`)', pantalla: ficha, ruta: { id: 'music' },
  hacer: (env) => { env.capturas.ActionGrid.onPress({ id: 'otra', goal: 'una receta', opens: 'chef' }); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'chef', goal: 'una receta', preset: undefined, imageUri: undefined, ...conProyecto(p) }]],
});
casos.push({
  id: 'D10', donde: 'una acción que abre la PANTALLA de otra sección (`opensSection`)', pantalla: ficha, ruta: { id: 'music' },
  hacer: (env) => { env.capturas.ActionGrid.onPress({ id: 'documentos', goal: 'mis textos', opens: 'writer', opensSection: true }); },
  salida: (p) => [['navigate', 'Specialist', { id: 'writer', ...conProyecto(p) }]],
});

/* — E · las pantallas de especialista — */
casos.push({
  id: 'E1', donde: 'Weë Studio · crear una imagen', pantalla: studio, ruta: {},
  hacer: (env) => { env.capturas.StudioPromptComposer.onCambiar('Una foto de mi gato'); env.dibujar(); env.capturas.StudioPromptComposer.onCrear(); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'photo', workspace: 'studio', goal: 'Una foto de mi gato', ...conProyecto(p) }]],
});
casos.push({
  id: 'E2', donde: 'Weë Studio · crear un video', pantalla: studio, ruta: {},
  hacer: (env) => { env.capturas.StudioPromptComposer.onCambiar('Un video de 10 segundos para mi cafetería'); env.dibujar(); env.capturas.StudioPromptComposer.onCrear(); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'studio', workspace: 'studio', goal: 'Un video de 10 segundos para mi cafetería', ...conProyecto(p) }]],
});
casos.push({
  id: 'E3', donde: 'Weë Chef · la idea escrita en la caja', pantalla: chef, ruta: {},
  hacer: (env) => { env.capturas.CajaDePrompt.onCambiar('Una cena para mis amigos'); env.dibujar(); env.capturas.CajaDePrompt.onEnviar(); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'chef', goal: 'Una cena para mis amigos', preset: undefined, imageUri: undefined, ...conProyecto(p) }]],
});
casos.push({
  id: 'E4', donde: 'Weë Chef · una de sus funciones', pantalla: chef, ruta: {},
  hacer: (env) => { env.capturas.ChefAcciones.onElegir(CHEF.TARJETAS_DE_CHEF.find((x) => x.preset)); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'chef', goal: undefined, preset: CHEF.TARJETAS_DE_CHEF.find((x) => x.preset).preset, imageUri: undefined, ...conProyecto(p) }]],
});
casos.push({
  id: 'E5', donde: 'Weë Business · la caja de la portada', pantalla: business, ruta: {},
  hacer: (env) => { env.capturas.StudioPromptComposer.onCambiar('Quiero vender más este mes'); env.dibujar(); env.capturas.StudioPromptComposer.onCrear(); },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'business', goal: 'Quiero vender más este mes', preset: undefined, ...conProyecto(p) }]],
});
{
  const accion = BUSINESS.ACCIONES_POR_MODULO.myBusiness.find((a) => !a.conversacional);
  casos.push({
    id: 'E6', donde: 'Weë Business · una función de un módulo', pantalla: business, ruta: {},
    hacer: (env) => { env.capturas.BusinessModulos.onAbrir({ id: 'myBusiness' }); env.dibujar(); env.capturas.ListaDeAcciones.onElegir(accion); },
    salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'business', goal: t(accion.claveObjetivo), preset: { questionId: 'what', optionId: accion.optionId }, ...conProyecto(p) }]],
  });
}
casos.push({
  id: 'E7', donde: 'Weë Brain · «Ir a» el especialista que propone', pantalla: brain, ruta: {},
  hacer: (env) => {
    fichasDeBrain.length = 0;
    env.dibujar();
    const ir = fichasDeBrain.find((c) => c.active);
    if (!ir) throw new Error('Weë Brain no ofrece ir al especialista que sugiere');
    ir.onPress();
  },
  salida: (p) => [['navigate', 'CreatorFlow', { experienceId: 'design', goal: 'quiero un logo para mi cafetería', ...conProyecto(p) }]],
});
casos.push({
  id: 'E8', donde: 'Weë Brain · tocar un satélite (la sección de Weë Chef)', pantalla: brain, ruta: {},
  hacer: (env) => { env.capturas.SistemaDeWeeBrain.onSatelite(getExperienceById('chef')); },
  salida: (p) => [['navigate', 'Specialist', { id: 'chef', ...conProyecto(p) }]],
});

titulo('C-E · Cada entrada: con proyecto lo lleva; sin proyecto, la llamada es exactamente la de siempre');
const salidasConProyecto = {};
for (const caso of casos) {
  let con;
  let sin;
  let fallo = '';
  try {
    con = caso.pantalla.correr(caso.ruta, PROYECTO, caso.hacer);
    const esperadoCon = caso.salida(PROYECTO, caso.pantalla.env);
    sin = caso.pantalla.correr(caso.ruta, undefined, caso.hacer);
    const esperadoSin = caso.salida(undefined, caso.pantalla.env);
    check(`${caso.id} · ${caso.donde}: CON el proyecto en la ruta, lo lleva`, igual(con, esperadoCon), `salió ${forma(con)} · esperado ${forma(esperadoCon)}`);
    check(`${caso.id} · ${caso.donde}: SIN proyecto, la llamada es la de siempre (ni la clave \`projectId\`, vacía o no)`,
      igual(sin, esperadoSin) && sin.every((paso) => !JSON.stringify(paso).includes('projectId')), `salió ${forma(sin)} · esperado ${forma(esperadoSin)}`);
    salidasConProyecto[caso.id] = { con, sin };
  } catch (e) {
    fallo = e.message;
    check(`${caso.id} · ${caso.donde}`, false, `la prueba no pudo recorrerla: ${fallo}`);
  }
}

/* El reparto: la ficha dibuja la pantalla de cada especialista sin pasarle nada (cada una lee SU ruta) */
{
  const REPARTO = { brain: 'BrainChatScreen', business: 'BusinessScreen', studio: 'StudioScreen', design: 'DesignScreen', chef: 'ChefScreen' };
  const vistas = Object.entries(REPARTO).map(([id, nombre]) => {
    ficha.actual.ruta = { id, projectId: PROYECTO };
    ficha.env.reiniciar();
    ficha.env.dibujar();
    return { id, nombre, dibuja: !!ficha.env.capturas[nombre], props: Object.keys(ficha.env.capturas[nombre] || {}).filter((k) => k !== 'children') };
  });
  check('D11 · la ficha reparte a las cinco pantallas de especialista (Brain, Business, Studio, Design y Chef) según el `id` de su ruta', vistas.every((v) => v.dibuja), vistas.filter((v) => !v.dibuja).map((v) => v.id).join(' · '));
  check('D12 · y no les pasa nada por propiedades: cada una lee `projectId` de la ruta en la que está, como `useRoute()` ya lo permite (así `DesignScreen`, que es de otra tarea, lo recibirá igual)',
    vistas.every((v) => v.props.length === 0), vistas.map((v) => `${v.id}: ${v.props.join(',') || 'ninguna'}`).join(' · '));
}

/* ═══ F · DE PUNTA A PUNTA: DE LA ENTRADA AL SERVIDOR ═════════════════════════════════════════════════════════════════ */
titulo('F · De cada entrada a la llamada al servidor: lo que navega entra en CreatorFlow y sale hacia creatorChat');
{
  /* `Home` espera una foto antes de empezar (el espacio que se transforma): con ella en la ruta empieza igual que las demás. */
  const conFoto = (params) => (['home'].includes(params.experienceId) && !params.imageUri ? { ...params, imageUri: 'https://x.test/foto.png' } : params);
  const llegan = [];
  for (const caso of casos) {
    const r = salidasConProyecto[caso.id];
    if (!r) continue;
    for (const [variante, pasos] of [['con', r.con], ['sin', r.sin]]) {
      const paso = pasos.find((x) => x[1] === 'CreatorFlow');
      if (paso) llegan.push({ caso, variante, params: paso[2] });
    }
  }
  const alServidor = async (params) => {
    const f = await crearFlujo({ params: conFoto(params) });
    const cargas = f.servidor.de('creatorChat');
    f.cerrar();
    return cargas;
  };
  let probadas = 0;
  const malas = [];
  for (const { caso, variante, params } of llegan) {
    const cargas = await alServidor(params);
    probadas++;
    const bien = cargas.length === 1 && (variante === 'con' ? cargas[0].projectId === PROYECTO : !('projectId' in cargas[0]));
    if (!bien) malas.push(`${caso.id}/${variante}: ${JSON.stringify(cargas.map((c) => c.projectId ?? '(sin clave)'))}`);
  }
  check(`F1 · de las ${probadas} llamadas a CreatorFlow que salen de las entradas, CON proyecto toda primera llamada a creatorChat lo lleva y SIN proyecto ninguna lo lleva (ni vacío)`,
    probadas >= 20 && malas.length === 0, malas.join(' · ') || `${probadas} recorridas`);
}

/* ═══ G · COBERTURA: NINGUNA LLAMADA SE QUEDA SIN DECIDIR ═════════════════════════════════════════════════════════════ */
titulo('G · Cobertura: cada llamada a CreatorFlow, Specialist o WeeCreator de estas pantallas lleva el proyecto o está en la lista de las que no');
{
  const ARCHIVOS = ['ProjectScreen', 'WeeCreatorScreen', 'SpecialistScreen', 'StudioScreen', 'ChefScreen', 'BusinessScreen', 'BrainChatScreen'].map((n) => `screens/${n}.tsx`);
  const DESTINOS = new Set(['CreatorFlow', 'Specialist', 'WeeCreator']);
  const llamadasEn = (texto, rel) => {
    const src = ts.createSourceFile(rel, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    /* Un argumento que es un nombre (`navigate('CreatorFlow', contexto)`) se lee por lo que vale esa variable en el archivo. */
    const valorDe = (nombre) => {
      let valores = '';
      const buscar = (n) => { if (ts.isVariableDeclaration(n) && n.name.getText(src) === nombre && n.initializer) valores += n.initializer.getText(src); ts.forEachChild(n, buscar); };
      buscar(src);
      return valores;
    };
    const halladas = [];
    const visitar = (n) => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['navigate', 'push'].includes(n.expression.name.text)) {
        const [primero, segundo] = n.arguments;
        if (primero && ts.isStringLiteral(primero) && DESTINOS.has(primero.text)) {
          const args = segundo ? segundo.getText(src).replace(/\s+/g, ' ') : '';
          const leido = segundo && ts.isIdentifier(segundo) ? valorDe(segundo.text) : args;
          halladas.push({ rel, destino: primero.text, args, lleva: /projectId/.test(leido), linea: src.getLineAndCharacterOfPosition(n.getStart()).line + 1 });
        }
      }
      ts.forEachChild(n, visitar);
    };
    visitar(src);
    return halladas;
  };
  const llamadasDe = (rel) => llamadasEn(leer(rel), rel);

  /* Las que NO llevan el proyecto, y por qué. Una nueva sin decidir rompe esta suite: o lleva el proyecto, o se anota aquí con su motivo. */
  const SIN_PROYECTO = [
    { rel: 'screens/WeeCreatorScreen.tsx', destino: 'CreatorFlow', args: '{ experienceId: job.experienceId, jobId: job.id }', cuantas: 1, motivo: 'REABRIR una creación de «Mis creaciones»: el trabajo ya existe y su proyecto, si lo tiene, está guardado en él (`job.projectId`). Lo que se pida desde ahí hereda el proyecto de la ruta, no el del trabajo: eso es F-11, una decisión de producto, y no se toma aquí.' },
    { rel: 'screens/SpecialistScreen.tsx', destino: 'CreatorFlow', args: '{ experienceId: job.experienceId, jobId: job.id }', cuantas: 1, motivo: 'REABRIR una creación de «Mis creaciones» (igual que en el selector).' },
    { rel: 'screens/SpecialistScreen.tsx', destino: 'WeeCreator', args: '', cuantas: 2, motivo: 'volver al selector: la ficha que no existe y «Ver todas» (mirar creaciones, no crear). Perder aquí el proyecto se arregla con «Guardar en proyecto»; llevarlo por error a un proyecto que no se buscaba no se deshace igual de fácil.' },
    { rel: 'screens/ChefScreen.tsx', destino: 'CreatorFlow', args: '{ experienceId: job.experienceId, jobId: job.id }', cuantas: 1, motivo: 'REABRIR una creación de cocina («Mis proyectos» dentro de Weë Chef son sus creaciones, no los proyectos de «Mis proyectos»).' },
  ];
  const todas = ARCHIVOS.flatMap(llamadasDe);
  const sinDecidir = [];
  const usadas = new Map(SIN_PROYECTO.map((e) => [e, 0]));
  for (const l of todas.filter((x) => !x.lleva)) {
    const entrada = SIN_PROYECTO.find((e) => e.rel === l.rel && e.destino === l.destino && e.args === l.args);
    if (entrada) usadas.set(entrada, usadas.get(entrada) + 1);
    else sinDecidir.push(`${l.rel}:${l.linea} ${l.destino}(${l.args})`);
  }
  const sobran = [...usadas].filter(([e, n]) => n !== e.cuantas).map(([e, n]) => `${e.rel} ${e.destino}(${e.args}): ${n} de ${e.cuantas}`);
  const llevan = todas.filter((x) => x.lleva);
  const anotadas = todas.length - llevan.length - sinDecidir.length;
  check(`G1 · ninguna de las ${todas.length} llamadas a CreatorFlow, Specialist o WeeCreator de las siete pantallas se queda sin decidir: ${llevan.length} llevan el proyecto y ${anotadas} están en la lista de las que no (con su motivo)`,
    todas.length >= 15 && sinDecidir.length === 0, sinDecidir.join(' · ') || `${llevan.length} + ${anotadas}`);
  for (const e of SIN_PROYECTO) aviso(`NO lleva el proyecto, a propósito (${e.cuantas} × ${e.destino} en ${e.rel}): ${e.motivo}`);
  check('G2 · y ninguna entrada de la lista de excepciones se quedó vieja (cada una sigue existiendo, con el número que se anotó)', sobran.length === 0, sobran.join(' · ') || `${SIN_PROYECTO.length} excepciones`);
  check('G3 · el selector, la ficha y las cuatro pantallas de especialista que esta ronda toca (Studio, Chef, Business y Brain) leen su ruta con `useRoute()`',
    ['WeeCreatorScreen', 'SpecialistScreen', 'StudioScreen', 'ChefScreen', 'BusinessScreen', 'BrainChatScreen'].every((n) => /useRoute/.test(leer(`screens/${n}.tsx`))));

  /* Weë Design: es de otra tarea y su «Crear» todavía no llega a CreatorFlow. Cuando llegue, tiene que llevar el proyecto como las demás. */
  const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  /* Reabrir una creación por su `jobId` (la fila «Mis creaciones», CL-04) no es «Crear»: abre lo que ya existe, como las excepciones de G1. */
  const sinReabrir = (texto) => texto.replace(/navigate\(\s*['"]CreatorFlow['"]\s*,\s*\{[^}]*jobId[^}]*\}\s*\)/g, ' ');
  const cumpleConElProyecto = (texto) => !/navigate\(\s*['"]CreatorFlow['"]/.test(sinReabrir(texto)) || /projectId/.test(texto);
  const design = sinComentarios(leer('screens/DesignScreen.tsx'));
  const navegaAlFlujo = /navigate\(\s*['"]CreatorFlow['"]/.test(sinReabrir(design));
  check('G4 · Weë Design: si su «Crear» ya navega a CreatorFlow, lleva el proyecto (si todavía es un temporizador —CL-01—, no hay nada que llevar)',
    cumpleConElProyecto(design), navegaAlFlujo ? 'navega a CreatorFlow' : 'hoy no navega a CreatorFlow (CL-01 abierto: lo conecta la tarea del puente)');
  if (!navegaAlFlujo) aviso('PENDIENTE (tarea del puente): cuando DesignScreen navegue a CreatorFlow, el proyecto de su ruta (`useRoute().params.projectId`) tiene que viajar con él: es UNA línea, como en Weë Chef.');

  /* CONTROLES: las guardas ven el fallo (si no, un verde no probaría nada). */
  const sinProyecto = llamadasEn("const a = () => navigation.navigate('CreatorFlow', { experienceId: 'x', goal: 'y' });", 'control.tsx');
  const conElLiteral = llamadasEn("const a = () => navigation.navigate('CreatorFlow', { experienceId: 'x', ...(projectId ? { projectId } : {}) });", 'control.tsx');
  const porNombre = llamadasEn("const ctx = { experienceId: 'x', ...(projectId ? { projectId } : {}) };\nconst a = () => navigation.navigate('CreatorFlow', ctx);", 'control.tsx');
  check('CONTROL · G1: una llamada nueva a CreatorFlow sin proyecto se ve como «sin proyecto»; con él, en el literal o en una variable, como «lleva»',
    sinProyecto.length === 1 && !sinProyecto[0].lleva && conElLiteral.length === 1 && conElLiteral[0].lleva && porNombre.length === 1 && porNombre[0].lleva);
  check('CONTROL · G4: Weë Design navegando a CreatorFlow sin proyecto incumpliría la guarda; con él, o sin navegar todavía, la cumple',
    !cumpleConElProyecto("navigation.navigate('CreatorFlow', { experienceId: 'design' })")
    && cumpleConElProyecto("navigation.navigate('CreatorFlow', { experienceId: 'design', ...(projectId ? { projectId } : {}) })")
    && cumpleConElProyecto('setTimeout(() => setEstado(1), 1)')
    && cumpleConElProyecto("navigation.navigate('CreatorFlow', { experienceId: t.experienceId, jobId: t.id })")
    && !cumpleConElProyecto("navigation.navigate('CreatorFlow', { experienceId: t.experienceId, jobId: t.id }); navigation.navigate('CreatorFlow', { experienceId: 'design', goal })"));
  check('CONTROL · C-E: una llamada con `projectId: undefined` no es la que no manda la clave, y el orden de las claves cuenta (la suite compara la forma, no solo los valores)',
    !igual({ id: 'x', projectId: undefined }, { id: 'x' }) && igual({ id: 'x' }, { id: 'x' }) && !igual({ a: 1, b: 2 }, { b: 2, a: 1 }));
}

/* ═══ H · CL-25: LO QUE YA NO EXISTE EN WEË DESIGN NO VUELVE ══════════════════════════════════════════════════════════ */
titulo('H · CL-25: nada que describa lo que ya no existe en Weë Design');
{
  const catalogo = leer('constants/specialists.ts');
  const ficha_ = leer('screens/SpecialistScreen.tsx');
  check('H1 · `constants/specialists.ts` ya no dice que Weë Design «estrena el muro social»: el muro de sección se retiró el 2026-09-13 (`4ff271e`) y Design no tiene muro propio',
    !/estrena el muro social/.test(catalogo) && !/Debajo de un muro con trabajos/.test(catalogo) && !/el muro enseña lo que hay/.test(catalogo));
  check('H2 · `SpecialistScreen` ya no tiene la rama de Weë Design que no se podía alcanzar (devuelve `DesignScreen` antes de llegar a ella)',
    !/spec\.id === 'design'/.test(ficha_) && /if \(id === 'design'\) return <DesignScreen \/>;/.test(ficha_));
  /* Lo que SÍ tiene que seguir (pines de otras suites): el comentario del piloto del muro de Chef, hasta que Chef lo invierta (D-CHEF-10). */
  check('H3 · y lo que otras suites fijan sigue: el comentario del piloto del muro de Weë Chef (D-CHEF-10) y la rama de Design de `SpecialistScreen` hacia su pantalla',
    /Weë Chef es el piloto del muro social dentro de una sección/.test(catalogo) && /sinListaDeTrabajos = [^;]*id === 'design'/.test(ficha_));
}

check('esta suite está en la cadena de `npm test`', /proyecto-en-las-entradas\.test\.mjs/.test(leer('functions/package.json')));
terminar();
