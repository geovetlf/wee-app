/**
 * LA PANTALLA DEL FLUJO GUIADO DE WEË AI (`CreatorFlowScreen`), DIBUJADA Y TOCADA DESDE NODE, CON SUS EFECTOS.
 *
 * Es un módulo, no una suite (el guion bajo lo dice: `ci-workflow` 13 solo exige en la cadena las `*.test.mjs`). Lo usa
 * `weeai-cliente-cierre.test.mjs`. Sigue el método de `_pantallas.mjs` —el código de VERDAD de la pantalla transpilado al
 * vuelo, `react-dom/server` para dibujarla y dobles mínimos de lo que no es de Weë— y le añade lo único que ese entorno no
 * tiene y esta pantalla necesita para probarse de verdad:
 *
 *   · EFECTOS. `react-dom/server` dibuja una vez y no ejecuta `useEffect`; esta pantalla EMPIEZA en un efecto (crea el trabajo
 *     al entrar), se suscribe al trabajo en otro y pinta lo que llega por esa suscripción. Aquí los efectos se ejecutan tras
 *     cada dibujado, con las mismas reglas de dependencias que React (y su limpieza antes de repetirse).
 *   · REFERENCIAS Y MEMOS QUE SOBREVIVEN. `useRef`, `useMemo` y `useCallback` conservan su valor entre dibujados, por orden de
 *     llamada, como en React: una referencia que se pierde en cada dibujado no prueba nada de una referencia.
 *   · UN SERVIDOR DE MENTIRA QUE ANOTA. El servicio de la app (`services/creatorService.ts`) NO se sustituye: es el de verdad,
 *     y lo único doblado es lo de debajo (`httpsCallable` y `onSnapshot`). Así lo que se comprueba es lo que de verdad saldría
 *     de la app hacia `creatorChat`, `creatorQuote` y `creatorRun`: el nombre del callable y su carga, en orden.
 *
 * ── Qué se puede hacer con él ───────────────────────────────────────────────
 *
 *   const f = await crearFlujo({ params: { experienceId: 'design', goal: '…' } });   // dibuja, ejecuta efectos y espera
 *   f.servidor.fallar('creatorQuote', f.errores.sinRed);                            // el próximo creatorQuote falla
 *   await f.tocar('Intentar de nuevo');                                             // un dedo (por etiqueta o por texto)
 *   f.servidor.llamadas                                                             // [{ nombre, datos }, …] en orden
 *   f.capturas.PlanCard                                                             // con qué propiedades montó la pieza
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No es React Native ni un reconciliador: cada dibujado vuelve a llamar a la pantalla entera y los huecos de estado se
 * asignan por orden de llamada (válido aquí porque las piezas hijas son dobles sin ganchos). No prueba diseño, ni
 * desplazamiento, ni teclado, ni el web de verdad. Tampoco prueba el servidor: eso lo hacen `creator.test.mjs`, las
 * suites `aceptacion-*` y los emuladores. Un fallo de red se imita con un error con la forma que usa Firebase.
 */
import { crearEntorno, React, h, textoDelHtml } from './_pantallas.mjs';
import { crearCargador } from './filmmaker-cliente.mjs';

/* ── 1 · LOS GANCHOS DE REACT, CON EFECTOS Y MEMORIA ─────────────────────────────────────────────────────────────── */

const iguales = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

/**
 * Una versión de los ganchos que guarda su valor por orden de llamada (como React), ejecuta los efectos DESPUÉS de dibujar y
 * apunta si algún estado cambió desde el último dibujado (`sucio`). No dibuja sola: quien la conduce llama a `empezar()`,
 * dibuja, y llama a `terminar()`.
 */
const crearGanchos = () => {
  const huecos = [];
  let i = 0;
  let efectos = [];
  let sucio = false;

  const useState = (inicial) => {
    const k = i++;
    if (!(k in huecos)) {
      const hueco = { valor: typeof inicial === 'function' ? inicial() : inicial };
      /* El mismo `set` en cada dibujado, como React: una función que se guarda en una referencia sigue valiendo. */
      hueco.poner = (nuevo) => {
        const siguiente = typeof nuevo === 'function' ? nuevo(hueco.valor) : nuevo;
        if (!Object.is(siguiente, hueco.valor)) { hueco.valor = siguiente; sucio = true; }
      };
      huecos[k] = hueco;
    }
    return [huecos[k].valor, huecos[k].poner];
  };
  const useRef = (inicial) => {
    const k = i++;
    if (!(k in huecos)) huecos[k] = { current: inicial };
    return huecos[k];
  };
  const useMemo = (fabricar, deps) => {
    const k = i++;
    const previo = huecos[k];
    if (previo && deps && iguales(previo.deps, deps)) return previo.valor;
    huecos[k] = { deps, valor: fabricar() };
    return huecos[k].valor;
  };
  const useCallback = (f, deps) => useMemo(() => f, deps);
  const useEffect = (efecto, deps) => {
    const k = i++;
    const hueco = huecos[k] ?? (huecos[k] = { montado: false, deps: undefined, limpieza: undefined });
    const toca = !hueco.montado || !deps || !iguales(hueco.deps, deps);
    hueco.deps = deps;
    hueco.montado = true;
    if (toca) efectos.push(() => { if (typeof hueco.limpieza === 'function') hueco.limpieza(); hueco.limpieza = efecto(); });
  };

  return {
    ganchos: { useState, useRef, useMemo, useCallback, useEffect },
    empezar() { i = 0; efectos = []; sucio = false; },
    /** Ejecuta los efectos que tocan, en orden. Devuelve si algo pidió volver a dibujar. */
    terminar() { const lista = efectos; efectos = []; lista.forEach((f) => f()); return sucio; },
    get sucio() { return sucio; },
    reiniciar() { huecos.length = 0; i = 0; efectos = []; sucio = false; },
  };
};

/* ── 2 · UN SERVIDOR DE MENTIRA QUE ANOTA CADA LLAMADA ───────────────────────────────────────────────────────────── */

/** Un error con la forma que tiene el de Firebase cuando no hay red: lo reconoce `humanizeCreatorError` por su código. */
export const errorDeRed = () => Object.assign(new Error('Failed to fetch'), { code: 'functions/unavailable' });
/** Un error controlado del motor (`HttpsError` con `details.code`), como los que manda el servidor de verdad. */
export const errorControlado = (codigo, mensaje) => Object.assign(new Error(mensaje), { code: 'functions/failed-precondition', details: { code: codigo } });

const PRECIOS = { standard: 12, high: 24, max: 48 };
const OPCIONES = [
  { quality: 'standard', label: 'Estándar', credits: PRECIOS.standard },
  { quality: 'high', label: 'Alta calidad', credits: PRECIOS.high },
  { quality: 'max', label: 'Máxima', credits: PRECIOS.max },
];
const precioDe = (nivel) => ({ total: PRECIOS[nivel || 'standard'], steps: [], options: OPCIONES });

/**
 * El servidor, lo justo para recorrer la pantalla: `creatorChat` crea un trabajo YA PLANIFICADO (así se llega al presupuesto
 * sin conversar), `creatorQuote` devuelve el precio del nivel pedido y `creatorRun` lo termina. Todo lo que recibe se
 * APUNTA en `llamadas` —el nombre y la carga, tal como salieron de la app— y cualquier llamada puede hacerse fallar.
 */
export const crearServidor = () => {
  const llamadas = [];
  const trabajos = {};
  const oyentes = {};
  const fallos = { creatorChat: [], creatorQuote: [], creatorRun: [] };
  let contador = 0;

  const documento = (id) => { const { id: _quitado, ...resto } = trabajos[id]; return structuredClone(resto); };
  const instantanea = (id) => ({ exists: () => id in trabajos, id, data: () => documento(id) });
  const publicar = (id, parche) => {
    trabajos[id] = { ...trabajos[id], ...parche };
    (oyentes[id] || []).forEach((o) => o.ok(instantanea(id)));
  };
  const planificado = (id, datos) => ({
    id, userId: 'u1', experienceId: datos.experienceId, goal: datos.goal, questions: [], answers: [],
    plan: { experience: datos.experienceId, goal: datos.goal, steps: [{ id: 'images', capability: 'image.generate', purpose: 'las propuestas' }], explainToUser: '' },
    steps: [{ id: 'images', capability: 'image.generate', purpose: 'las propuestas', status: 'pending' }],
    results: [], status: 'planned', progressText: '', creditsEstimated: PRECIOS.standard, creditsCharged: 0, demo: true,
    ...(datos.projectId ? { projectId: datos.projectId } : {}),
  });
  const respuestaDe = (id) => ({ jobId: id, status: trabajos[id].status, question: null, plan: trabajos[id].plan, creditsEstimated: trabajos[id].creditsEstimated, demo: true, pricing: precioDe() });

  const responder = {
    creatorChat: async (datos) => {
      if (datos.jobId) return respuestaDe(datos.jobId);
      const id = `job-${++contador}`;
      trabajos[id] = planificado(id, datos);
      return respuestaDe(id);
    },
    creatorQuote: async (datos) => {
      publicar(datos.jobId, { creditsEstimated: PRECIOS[datos.quality || 'standard'] });
      return { jobId: datos.jobId, quality: datos.quality ?? null, creditsEstimated: PRECIOS[datos.quality || 'standard'], pricing: precioDe(datos.quality) };
    },
    creatorRun: async (datos) => {
      publicar(datos.jobId, { status: 'done', creditsCharged: trabajos[datos.jobId].creditsEstimated, results: [{ stepId: 'images', kind: 'image', title: 'Propuestas', urls: ['https://x.test/a.png'] }] });
      return { jobId: datos.jobId, status: 'done' };
    },
  };

  const httpsCallable = (_functions, nombre) => async (datos) => {
    llamadas.push({ nombre, datos: structuredClone(datos) });
    const fallo = fallos[nombre]?.shift();
    if (fallo) throw fallo;
    return { data: await responder[nombre](datos) };
  };
  /* Lo único de Firestore que toca esta pantalla: escuchar un trabajo. Lo demás no se llama, y si se llamara, falla. */
  const firestore = new Proxy({
    doc: (_db, coleccion, id) => ({ coleccion, id }),
    onSnapshot: (ref, ok, err) => {
      const o = { ok, err };
      (oyentes[ref.id] ??= []).push(o);
      if (ref.id in trabajos) ok(instantanea(ref.id));
      return () => { oyentes[ref.id] = (oyentes[ref.id] || []).filter((x) => x !== o); };
    },
  }, { get: (obj, k) => (k in obj ? obj[k] : () => { throw new Error(`Firestore: «${String(k)}» no está doblado en esta prueba`); }) });

  return {
    llamadas, trabajos, httpsCallable, firestore, publicar,
    /** Las llamadas a un callable, con su carga. */
    de: (nombre) => llamadas.filter((l) => l.nombre === nombre).map((l) => l.datos),
    /** El próximo `veces` callable `nombre` falla con `error`. */
    fallar: (nombre, error, veces = 1) => { for (let n = 0; n < veces; n++) fallos[nombre].push(error); },
    /** Se rompe la escucha del trabajo (sin red, permisos…): la app recibe `null`, como en `subscribeToJob`. */
    romperLaEscucha: (id) => (oyentes[id] || []).forEach((o) => o.err(new Error('permission-denied'))),
  };
};

/* ── 3 · EL TRADUCTOR DE VERDAD ──────────────────────────────────────────────────────────────────────────────────── */

const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const DICCIONARIOS = { es: base('i18n/textos/es/index.ts').es, en: base('i18n/textos/en/index.ts').en };
const formatoReal = base('i18n/formato.ts');
export const traductorDe = (idioma) => crearTraductor(idioma, DICCIONARIOS, {});

/* ── 4 · LA PANTALLA ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** El texto que se lee dentro de un botón: lo que hay entre sus etiquetas, sin marcado. */
const textoDe = (hijos) => React.Children.toArray(hijos).map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : c?.props ? textoDe(c.props.children) : '')).join('').replace(/\s+/g, ' ').trim();

/**
 * Dibuja `screens/CreatorFlowScreen.tsx` con el servicio de la app de verdad y un servidor de mentira debajo.
 *
 * @param {object} o
 * @param {object} [o.params]    Lo que trae la ruta (`ContextoDeExperiencia`): `experienceId`, `goal`, `projectId`, `jobId`…
 * @param {object|null} [o.usuario]
 * @param {'es'|'en'} [o.idioma]
 * @param {object} [o.servidor]  Un servidor de `crearServidor()`; por defecto uno nuevo.
 * @param {object} [o.proyectos] `{ id: { id, name } }`: lo que contestaría `projectsService.get`.
 */
export const crearFlujo = async ({ params = {}, usuario = { uid: 'u1' }, idioma = 'es', servidor = crearServidor(), proyectos = {} } = {}) => {
  const rutaParams = { ...params };
  const g = crearGanchos();
  const asignaciones = [];
  const rechazos = [];
  const t = traductorDe(idioma);

  const entorno = crearEntorno({
    pantalla: 'screens/CreatorFlowScreen.tsx',
    usuario,
    dobles: (ctx) => {
      const { h: hh, capturar, Toque, navegacion } = ctx;
      const tema = { useTheme: () => ({ theme: { colors: ctx.colores } }), enTemaClaro: (C) => C };
      const habla = { useIdioma: () => ({ t, formato: { numero: (v, o) => formatoReal.formatearNumero(v, idioma, o), lista: (c, tipo) => formatoReal.formatearLista(c, idioma, tipo) }, locale: idioma }) };
      const navegador = {
        useNavigation: () => ({
          navigate: (...a) => navegacion.push(['navigate', ...a]),
          push: (...a) => navegacion.push(['push', ...a]),
          goBack: () => navegacion.push(['goBack']),
          setParams: (p) => { navegacion.push(['setParams', p]); Object.assign(rutaParams, p); },
          canGoBack: () => true,
        }),
        useRoute: () => ({ params: rutaParams }),
        useFocusEffect: () => {},
      };
      /* El botón del entorno solo conoce `accessibilityLabel`; los de esta pantalla a veces solo tienen su texto. */
      const tocable = (p) => Toque({ ...p, accessibilityLabel: p.accessibilityLabel ?? textoDe(p.children) });
      const reactNative = { ...ctx.reactNative, TouchableOpacity: tocable };
      const pieza = (nombre) => capturar(nombre);
      return {
        react: { ...React, ...g.ganchos },
        'react-native': reactNative,
        '@react-navigation/native': navegador,
        'expo-image': { Image: () => hh('img') },
        'firebase/functions': { httpsCallable: servidor.httpsCallable },
        'firebase/firestore': servidor.firestore,
        '../contexts/ThemeContext': tema,
        '../contexts/IdiomaContext': habla,
        '../contexts/AuthContext': { useAuth: () => ({ user: usuario }) },
        '../components/creator/CreatorShell': { __esModule: true, default: capturar('CreatorShell', (p) => hh('main', null, p.children)) },
        '../components/creator/UploadBox': { __esModule: true, default: pieza('UploadBox') },
        '../components/creator/GuidedQuestion': { __esModule: true, default: pieza('GuidedQuestion') },
        '../components/creator/PlanCard': { __esModule: true, default: pieza('PlanCard') },
        '../components/creator/JobProgress': { __esModule: true, default: pieza('JobProgress') },
        '../components/creator/ResultCard': { __esModule: true, default: pieza('ResultCard') },
        '../components/creator/ProjectPicker': { __esModule: true, default: pieza('ProjectPicker') },
        '../components/creator/FichaDeContexto': { __esModule: true, default: pieza('FichaDeContexto') },
        '../services/projectsService': {
          projectsService: {
            get: async (id) => proyectos[id] ?? null,
            assignJob: async (jobId, projectId) => { asignaciones.push({ jobId, projectId }); },
          },
        },
        '../services/creatorUploads': { uploadCreatorImage: async () => 'https://x.test/foto.png' },
        '../services/documentsService': { documentsService: { save: async () => {} } },
      };
    },
  });

  /* Una promesa rechazada que nadie atiende no debe pasar sin que se vea: es un fallo de la pantalla. */
  const alRechazar = (e) => rechazos.push(e instanceof Error ? e.message : String(e));
  process.on('unhandledRejection', alRechazar);

  let ultimo = null;
  const dibujar = () => {
    g.empezar();
    ultimo = entorno.dibujar();
    g.terminar();
    return ultimo;
  };
  const asentar = async () => {
    for (let ronda = 0; ronda < 60; ronda++) {
      await entorno.calma();
      if (!g.sucio) { await entorno.calma(); if (!g.sucio) return ultimo; }
      dibujar();
    }
    throw new Error('la pantalla no se asienta: sigue pidiendo dibujarse');
  };
  /** Pulsa el botón con esa etiqueta (o ese texto) y espera a que todo se asiente. Falla si no está o está apagado. */
  const tocar = async (etiqueta) => {
    const d = ultimo ?? dibujar();
    const resultado = entorno.tocar(etiqueta, d);
    await resultado;
    return asentar();
  };

  dibujar();
  await asentar();

  return {
    servidor, t, params: rutaParams, asignaciones, rechazos,
    capturas: entorno.capturas, navegacion: entorno.navegacion,
    dibujar, asentar, tocar,
    /** Lo último dibujado: su texto y sus botones. */
    get vista() { return ultimo; },
    /** ¿Hay un botón con esa etiqueta o texto en lo último dibujado? */
    hayBoton: (etiqueta) => !!ultimo && ultimo.botones.some((b) => b.etiqueta === etiqueta),
    /** Lo que se ve como texto, sin marcado. */
    texto: () => (ultimo ? ultimo.texto : ''),
    /** Una pulsación que ya no hace falta: se suelta lo que la pantalla tenía abierto. */
    cerrar: () => process.off('unhandledRejection', alRechazar),
    errores: { sinRed: errorDeRed, controlado: errorControlado },
  };
};

export { textoDelHtml, h };
