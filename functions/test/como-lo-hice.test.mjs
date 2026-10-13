/**
 * R9 · LÍNEA C — «CÓMO LO HICE» SEGÚN LA REFERENCIA DEL DUEÑO.
 *
 * Tres pantallas de referencia (`wee-trabajo/ronda-r9/COMO/referencia.jpg`): el compositor con «Compartir cómo lo
 * hice» apagado, el mismo encendido con la fila gris «Revisar y seleccionar qué información quieres compartir», y una
 * publicación del Wäll con el bloque «CÓMO LO HICE» desplegado debajo de la fila de interacciones.
 *
 * Lo que se vigila:
 *   A · las reglas puras (`utils/comoLoHice.ts`): apagado no publica nada, el prompt solo si se autoriza, los pasos
 *       salen de la historia del trabajo y nunca se inventan, lo guardado se vuelve a leer igual.
 *   B · el compositor DE VERDAD (`screens/CreateScreen.tsx` en `_pantallas.mjs`): el interruptor, la fila, la hoja de
 *       revisión, la selección que sobrevive al volver y lo que llega a `postsService.create`.
 *   C · el bloque del Wäll (`components/HowIMadeIt.tsx`): plegar y desplegar, sin bloque vacío, publicaciones antiguas.
 *   D · dónde va en la tarjeta, sin IA de más, sin desbordar en el móvil, y los 16 diccionarios.
 *
 * Cada regla que se puede invertir lleva su CONTROL. Sin red, sin emulador.
 */
import { crearComprobador } from './_aceptacion.mjs';
import { crearEntorno, h } from './_pantallas.mjs';
import { crearCargador, leer } from './filmmaker-cliente.mjs';

const { check, titulo, terminar } = crearComprobador();

/* El traductor y los diccionarios de VERDAD (los de la app, con los catálogos del servidor). */
const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const { DICCIONARIOS } = base('i18n/diccionarios.ts');
const ES = base('i18n/textos/es/index.ts').es;
const EN = base('i18n/textos/en/index.ts').en;
const traductor = (locale) => crearTraductor(locale, DICCIONARIOS, {});
const tEs = traductor('es');
const lector = (locale) => ({ t: traductor(locale), locale });
const LES = lector('es');
const R = base('utils/comoLoHice.ts');

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('A · Las reglas, sin pantalla');
/* ════════════════════════════════════════════════════════════════════════════ */
{
  const vacio = R.borradorInicial();
  check('A1) el interruptor empieza APAGADO', vacio.activo === false);
  check('A1) y el prompt empieza sin marcar', vacio.compartirPrompt === false);
  check('A1) sin historia, la lista de pasos empieza vacía para escribirla a mano', vacio.pasos.length === 0 && vacio.origen === 'ninguno');

  const deWeeAI = R.borradorInicial({ aiTools: ['Weë Chef'], aiProcess: 'Creado con Weë Chef en Weë AI' });
  check('A2) lo que trae Weë AI solo se PROPONE: herramienta y resumen', deWeeAI.herramienta === 'Weë Chef' && deWeeAI.pasos.length === 1 && deWeeAI.origen === 'resumen');
  check('A2) y sigue apagado: proponer no es publicar', deWeeAI.activo === false);
  const conResumen = R.borradorInicial({ aiTools: ['Weë Chef'], aiProcess: 'texto viejo', aiResumen: { clave: 'composer.aiProcessCreatedWith', valores: { nombre: 'Weë Chef' } } });
  check('A2) con el resumen traducible, se propone ESE (clave + valores), no el texto', 'clave' in conResumen.pasos[0] && conResumen.pasos.length === 1);
  check('A2) CONTROL: un resumen sin forma de paso se ignora y queda el texto', 'texto' in R.borradorInicial({ aiProcess: 'x', aiResumen: '[object Object]' }).pasos[0]);
  check('A2) una clave fuera de la lista cerrada no vale como paso', R.pasoValido({ clave: 'auth.password' }) === null && R.pasoValido({ clave: 'composer.aiProcessCreatedWith' }) !== null);

  check('A3) apagado no publica NADA, aunque haya herramienta y pasos', Object.keys(R.datosParaPublicar(deWeeAI, LES)).length === 0);
  const encendido = { ...deWeeAI, activo: true };
  const datos = R.datosParaPublicar(encendido, LES);
  check('A3) CONTROL: encendido publica herramienta y proceso', JSON.stringify(datos.aiTools) === '["Weë Chef"]' && datos.aiProcess === 'Creado con Weë Chef en Weë AI');
  check('A3) pero no el prompt, que no se marcó', !('aiPrompt' in datos));
  check('A3) y si todo lo escribió la persona no hace falta `aiSteps`', !('aiSteps' in datos));

  const conPrompt = { ...encendido, prompt: 'Una ensalada fresca con sandía' };
  check('A4) un prompt escrito y SIN autorizar no se publica', !('aiPrompt' in R.datosParaPublicar(conPrompt, LES)));
  check('A4) CONTROL: autorizado, sí', R.datosParaPublicar({ ...conPrompt, compartirPrompt: true }, LES).aiPrompt === 'Una ensalada fresca con sandía');

  check('A5) cada elemento se elige por separado: sin herramienta', !('aiTools' in R.datosParaPublicar({ ...encendido, compartirHerramienta: false }, LES)));
  check('A5) y sin proceso', !('aiProcess' in R.datosParaPublicar({ ...encendido, compartirProceso: false }, LES)));
  check('A5) encendido sin nada marcado no deja un bloque vacío', Object.keys(R.datosParaPublicar({ ...encendido, compartirHerramienta: false, compartirProceso: false }, LES)).length === 0);

  /* Los pasos REALES del trabajo: los ejecutados, guardados como los escribió el servidor (se traducen al pintar). */
  const trabajo = {
    goal: 'Una ensalada con lo que tengo: sandía, feta y menta',
    experienceId: 'chef',
    plan: { steps: [{ id: 'a', purpose: 'Mirar los ingredientes' }, { id: 'b', purpose: 'Escribir la receta paso a paso' }, { id: 'c', purpose: 'Crear la imagen del plato' }] },
    steps: [
      { id: 'a', purpose: 'Mirar los ingredientes', status: 'done' },
      { id: 'b', purpose: 'Escribir la receta paso a paso', status: 'done' },
      { id: 'c', purpose: 'Crear la imagen del plato', status: 'failed' },
    ],
  };
  const pasos = R.pasosDelTrabajo(trabajo);
  check('A6) los pasos salen de lo que se EJECUTÓ, no del plan entero', JSON.stringify(pasos.map((p) => p.servidor)) === '["Mirar los ingredientes","Escribir la receta paso a paso"]', JSON.stringify(pasos));
  check('A6) y se guardan con su experiencia, sin traducir', pasos.every((p) => p.experiencia === 'chef' && !('texto' in p)));
  check('A6) CONTROL: un trabajo que aún no apuntó su avance usa los del plan', R.pasosDelTrabajo({ ...trabajo, steps: [] }).length === 3);
  check('A6) un trabajo de PRUEBA (demo) no tiene pasos de verdad que contar', R.pasosDelTrabajo({ ...trabajo, demo: true }).length === 0);
  check('A6) y sin trabajo no se inventa ninguno', R.pasosDelTrabajo(null).length === 0 && R.pasosDelTrabajo({}).length === 0);

  const completado = R.conHistorial(deWeeAI, trabajo);
  check('A7) la historia sustituye el resumen por los pasos reales', completado.origen === 'historial' && completado.pasos.length === 2);
  check('A7) propone como prompt lo que ESCRIBIÓ la persona, pero no lo marca', completado.prompt === trabajo.goal && completado.compartirPrompt === false && completado.activo === false);
  const editado = { ...deWeeAI, editado: true, pasos: [{ texto: 'Lo escribí yo' }] };
  check('A7) lo que la persona ya editó no lo pisa la historia', JSON.stringify(R.conHistorial(editado, trabajo).pasos) === '[{"texto":"Lo escribí yo"}]');
  check('A7) CONTROL: sin trabajo, el borrador no cambia', R.conHistorial(deWeeAI, null) === deWeeAI);

  /* Lo que se guarda se vuelve a leer igual, también después de pasar por Firestore (JSON). */
  const guardado = JSON.parse(JSON.stringify(R.datosParaPublicar({ ...completado, activo: true, compartirPrompt: true }, LES)));
  const leido = R.lecturaDePublicacion(guardado, LES);
  check('A8) persistido y recuperado: mismos pasos, misma herramienta, el prompt autorizado',
    leido.pasos.length === 2 && leido.pasos[1] === 'Escribir la receta paso a paso' && leido.herramientas[0] === 'Weë Chef' && leido.prompt === trabajo.goal);
  check('A8) `aiProcess` sigue con el texto (clientes viejos) y `aiSteps` con la forma traducible', guardado.aiProcess.split('\n').length === 2
    && Array.isArray(guardado.aiSteps) && guardado.aiSteps[1].servidor === 'Escribir la receta paso a paso' && Object.keys(guardado).sort().join() === 'aiProcess,aiPrompt,aiSteps,aiTools');

  const antigua = R.lecturaDePublicacion({ aiTools: ['Kling', 'ElevenLabs'], aiProcess: 'Un párrafo de antes, sin pasos.' }, lector('en'));
  check('A9) una publicación ANTIGUA se lee igual en cualquier idioma: un párrafo es un paso', antigua.pasos.length === 1 && antigua.pasos[0] === 'Un párrafo de antes, sin pasos.' && antigua.herramientas.length === 2 && !antigua.vacio);
  check('A9) y una sin nada está vacía', R.lecturaDePublicacion({}, LES).vacio && R.lecturaDePublicacion({ aiTools: [], aiProcess: '  ', aiPrompt: '' }, LES).vacio);
  check('A9) `aiSteps` mal formado no rompe: se lee `aiProcess`', R.lecturaDePublicacion({ aiSteps: [{ clave: 'auth.password' }, 7, null], aiProcess: 'Uno' }, LES).pasos.join() === 'Uno');

  const largos = R.datosParaPublicar({ ...encendido, pasos: Array.from({ length: 15 }, (_, i) => ({ texto: `Paso ${i} ${'x'.repeat(400)}` })) }, LES);
  const lineas = largos.aiProcess.split('\n');
  check('A10) como mucho diez pasos y cada uno con su tope', lineas.length === R.MAX_PASOS && lineas.every((l) => l.length <= R.MAX_LARGO_PASO));
}

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('L · En el idioma de quien lo ve');
/* ════════════════════════════════════════════════════════════════════════════ */
{
  /* Una publicación como la que guarda el compositor: dos pasos de Weë (uno del servidor, uno con clave) y uno escrito a mano. */
  const post = {
    aiTools: ['Weë Chef'],
    aiProcess: 'Escribir la receta paso a paso\nCreado con Weë Chef en Weë AI\nLo terminé con lima.',
    aiSteps: [
      { servidor: 'Escribir la receta paso a paso', experiencia: 'chef' },
      { clave: 'composer.aiProcessCreatedWith', valores: { nombre: 'Weë Chef' } },
      { texto: 'Lo terminé con lima.' },
    ],
  };
  const en = R.lecturaDePublicacion(post, lector('en'));
  const es = R.lecturaDePublicacion(post, LES);
  const pt = R.lecturaDePublicacion(post, lector('pt-BR'));
  const da = R.lecturaDePublicacion(post, lector('da'));
  check('L1) el paso del servidor se dice en el idioma de quien mira: es', es.pasos[0] === 'Escribir la receta paso a paso');
  check('L1) en', en.pasos[0] === 'Write the step-by-step recipe', en.pasos[0]);
  check('L1) da (catálogo del servidor propio)', da.pasos[0] === 'Skrive opskriften trin for trin', da.pasos[0]);
  check('L1) pt-BR: el servidor no tiene catálogo portugués y cae, como en todo Weë, al respaldo inglés (nunca español)', pt.pasos[0] === 'Write the step-by-step recipe', pt.pasos[0]);
  check('L2) la frase con clave, en cada idioma', es.pasos[1] === 'Creado con Weë Chef en Weë AI' && en.pasos[1] === 'Made with Weë Chef in Weë AI'
    && pt.pasos[1] === traductor('pt-BR')('composer.aiProcessCreatedWith', { nombre: 'Weë Chef' }) && pt.pasos[1] !== es.pasos[1], pt.pasos[1]);
  check('L3) lo escrito a mano se ve IGUAL en todos', [es, en, pt, da].every((x) => x.pasos[2] === 'Lo terminé con lima.'));
  check('L4) el chip de herramienta (marca) no se traduce', [es, en, pt, da].every((x) => x.herramientas.join() === 'Weë Chef'));
  check('L5) CONTROL: sin `aiSteps`, el mismo post se ve tal cual en inglés (como las antiguas)', R.lecturaDePublicacion({ ...post, aiSteps: undefined }, lector('en')).pasos[0] === 'Escribir la receta paso a paso');
  const demo = R.textoDePaso({ servidor: 'Escribir la receta paso a paso', experiencia: 'chef', demo: true }, lector('en'));
  check('L6) el aviso de demo también se traduce', demo === 'Write the step-by-step recipe (demo mode preview)', demo);
  check('L7) un paso de Weë que se edita pasa a texto de la persona', !R.esPasoDeWee({ texto: 'x' }) && R.esPasoDeWee({ servidor: 'x' }));
  const reglas = leer('utils/comoLoHice.ts').replace(/\/\*[\s\S]*?\*\//g, '');
  check('L8) traducir no llama a nadie: solo el diccionario', !/creatorService|httpsCallable|fetch\(|brainService/.test(reglas) && /textoDelServidor\(/.test(reglas));
}

/* ════════════════════════════════════════════════════════════════════════════ */
/* Lo común a las pantallas: tema, idioma y los controles que el entorno no trae. */
/* ════════════════════════════════════════════════════════════════════════════ */
const comunes = (ctx, idioma = 'es') => {
  const { h: hh, reactNative, Caja, capturas } = ctx;
  const tema = { useTheme: () => ({ theme: { dark: false, colors: ctx.colores } }) };
  const t = traductor(idioma);
  const habla = { useT: () => t, useIdioma: () => ({ t, locale: idioma, formato: {} }) };
  const valor = () => ({ setValue() {}, interpolate: () => 0 });
  return {
    'react-native': {
      ...reactNative,
      /* El interruptor: se apunta por su etiqueta con lo que la pantalla le pasa (valor y a quién avisa). */
      Switch: (props) => { capturas[`Switch:${props.accessibilityLabel}`] = props; return hh('input', { type: 'checkbox', 'aria-label': props.accessibilityLabel, checked: !!props.value, readOnly: true }); },
      TextInput: (props) => { capturas[`Campo:${props.accessibilityLabel}`] = props; return hh('textarea', { 'aria-label': props.accessibilityLabel, value: props.value ?? '', readOnly: true }); },
      Modal: ({ visible, children }) => (visible ? hh('div', { 'data-hoja': 'si' }, children) : null),
      Animated: { View: Caja, Value: function Value() { return valor(); }, spring: () => ({ start() {} }), loop: () => ({ start() {}, stop() {} }), sequence: () => ({}), timing: () => ({}) },
      Easing: { inOut: () => 0, ease: 0 },
      Alert: { alert() {} },
      LayoutAnimation: { configureNext() {}, Presets: { easeInEaseOut: {} } },
    },
    '../contexts/ThemeContext': tema,
    '../contexts/IdiomaContext': habla,
    './EspacioDeEscritura': { __esModule: true, default: ({ children }) => hh('div', null, children) },
  };
};

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('B · El compositor de verdad');
/* ════════════════════════════════════════════════════════════════════════════ */
const guardados = [];
const lecturasDeTrabajo = [];
const compositor = (params) => crearEntorno({
  pantalla: 'screens/CreateScreen.tsx',
  params,
  dobles: (ctx) => ({
    ...comunes(ctx),
    '@react-navigation/native': {
      useNavigation: () => ({ navigate: (...a) => ctx.navegacion.push(['navigate', ...a]), goBack: () => ctx.navegacion.push(['goBack']), canGoBack: () => true, setParams() {}, dispatch() {} }),
      useRoute: () => ({ params }),
      CommonActions: { reset: (x) => x },
    },
    '../contexts/AuthContext': { useAuth: () => ({ user: ctx.usuario }) },
    '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: { uid: 'u1', displayName: 'Laura' } }) },
    '../contexts/ScrollContext': { useScroll: () => ({ triggerScrollToTop() {}, triggerRefresh() {} }) },
    '../hooks/useResponsive': { useResponsive: () => ({ contentMaxWidth: 640, isMobile: true }) },
    '../services/firestoreService': { postsService: { create: async (d) => { guardados.push(d); return 'p1'; } } },
    '../services/storageService': { uploadPostImage: async () => { throw new Error('sin subidas en pruebas'); } },
    '../services/cloudinaryService': { uploadVideoToCloudinary: async () => { throw new Error('sin subidas en pruebas'); } },
    '../services/avatarGenerationService': { performAvatarReplacement() {}, uploadImageForSwap() {}, saveFaceSwapResult() {} },
    /* El hook que lee el trabajo: aquí se apunta CUÁNDO se le pide (en la app es una lectura de Firestore). */
    '../hooks/useTrabajoDeOrigen': { useTrabajoDeOrigen: (id, pedir) => { if (pedir && id) lecturasDeTrabajo.push(id); return { leyendo: false }; } },
    '../i18n/servidor': { textoDelServidor: (x) => x },
    '../data/places': { etiquetaDeLugar: () => '' },
    '../utils/sectionFeed': { MURO_GENERAL: 'general', destinosDisponibles: () => [{ id: 'general', nombre: 'Muro general', clave: 'composer.generalWall' }] },
    '../constants/weeExperiences': { getExperienceById: () => undefined },
    'expo-image': { Image: () => h('img') },
    'expo-av': { Video: () => h('video'), ResizeMode: {} },
    'firebase/firestore': { Timestamp: { now: () => 'ahora', fromMillis: (ms) => ms } },
    '../components/avatars/AvatarDisplay': { __esModule: true, default: ctx.capturar('AvatarDisplay') },
    '../components/EspacioDeEscritura': { __esModule: true, default: ({ children }) => h('div', null, children) },
    '../components/SelectorDeEContacts': { __esModule: true, default: ctx.capturar('SelectorDeEContacts') },
  }),
});

const TITULO = tEs('composer.howShareTitle');
const FILA = tEs('composer.howReviewRow');
const PUBLICAR = tEs('composer.publish');
const LISTO = tEs('common.done');
const prefillDeChef = { content: 'Ensalada de verano en diez minutos', aiTools: ['Weë Chef'], aiProcess: 'Creado con Weë Chef en Weë AI', jobId: 'job_1' };

{
  check('B0) CONTROL de las claves: el traductor resuelve las nuevas en español', TITULO === 'Compartir cómo lo hice' && FILA === 'Revisar y seleccionar qué información quieres compartir');

  const e = compositor({ prefill: prefillDeChef, sourceSection: 'chef' });
  let d = e.dibujar();
  const sw = () => e.capturas[`Switch:${TITULO}`];
  check('B1) al fondo del compositor está «Compartir cómo lo hice» con su frase', d.texto.includes(TITULO) && d.texto.includes(tEs('composer.howShareHint')));
  check('B1) el interruptor empieza APAGADO, también viniendo de Weë AI', sw() && sw().value === false);
  check('B1) apagado, la fila de revisar NO está', !d.botones.some((b) => b.etiqueta === FILA));
  check('B1) apagado, la hoja ni se monta', !d.html.includes('data-hoja'));
  check('B1) y no se ha leído ningún trabajo', lecturasDeTrabajo.length === 0);

  /* Publicar apagado: como siempre, sin proceso, aunque Weë AI lo trajera. */
  e.tocar(PUBLICAR, d);
  await e.calma();
  const apagada = guardados.pop();
  check('B2) publicar apagado guarda la publicación de siempre…', apagada && apagada.content === prefillDeChef.content && apagada.sourceSection === 'chef');
  check('B2) …sin herramienta, sin proceso y sin prompt', apagada && !('aiTools' in apagada) && !('aiProcess' in apagada) && !('aiPrompt' in apagada));

  /* Encender. */
  const e2 = compositor({ prefill: prefillDeChef, sourceSection: 'chef' });
  e2.dibujar();
  e2.capturas[`Switch:${TITULO}`].onValueChange(true);
  d = e2.dibujar();
  check('B3) encendido, el interruptor lo dice', e2.capturas[`Switch:${TITULO}`].value === true);
  check('B3) CONTROL: encendido aparece la fila «Revisar y seleccionar…»', d.botones.some((b) => b.etiqueta === FILA) && d.texto.includes(FILA));
  check('B3) la hoja aún no se abre sola', !d.html.includes('data-hoja'));
  check('B3) encendido, y solo entonces, se pide leer el trabajo del que sale', lecturasDeTrabajo.includes('job_1'));

  /* Abrir la revisión: propone lo real, el prompt sin marcar. */
  e2.tocar(FILA, d);
  d = e2.dibujar();
  check('B4) tocar la fila abre la hoja de revisión', d.html.includes('data-hoja') && d.texto.includes(tEs('composer.howReviewTitle')));
  check('B4) propone la herramienta que trajo Weë AI', e2.capturas[`Campo:${tEs('composer.howToolLabel')}`]?.value === 'Weë Chef');
  check('B4) el prompt empieza SIN marcar y su campo no está a la vista', e2.capturas[`Switch:${tEs('composer.howPromptLabel')}`]?.value === false && !e2.capturas[`Campo:${tEs('composer.howPromptLabel')}`]);
  check('B4) y la vista previa es el bloque del Wäll, abierto', d.texto.includes(tEs('wall.howIMadeIt')) && d.texto.includes(tEs('wall.madeWith')));

  /* Editar el proceso, añadir un paso y escribir un prompt SIN autorizarlo. */
  const paso1 = tEs('composer.howStepPlaceholder', { n: 1 });
  e2.capturas[`Campo:${paso1}`].onChangeText('Le dije los ingredientes que tenía en la nevera.');
  d = e2.dibujar();
  e2.tocar(tEs('composer.howAddStep'), d);
  d = e2.dibujar();
  e2.capturas[`Campo:${tEs('composer.howStepPlaceholder', { n: 2 })}`].onChangeText('Weë me propuso una receta.');
  d = e2.dibujar();
  check('B5) el proceso se puede editar y crecer', e2.capturas[`Campo:${paso1}`].value === 'Le dije los ingredientes que tenía en la nevera.' && !!e2.capturas[`Campo:${tEs('composer.howStepPlaceholder', { n: 2 })}`]);
  check('B5) y la vista previa ya los numera', d.texto.includes('1. Le dije los ingredientes') && d.texto.includes('2. Weë me propuso una receta.'));

  e2.capturas[`Switch:${tEs('composer.howPromptLabel')}`].onValueChange(true);
  d = e2.dibujar();
  e2.capturas[`Campo:${tEs('composer.howPromptLabel')}`].onChangeText('Ensalada de sandía, feta, menta y lima');
  d = e2.dibujar();
  e2.capturas[`Switch:${tEs('composer.howPromptLabel')}`].onValueChange(false);
  d = e2.dibujar();

  /* Volver al compositor y volver a entrar: todo sigue como se dejó. */
  e2.tocar(LISTO, d);
  d = e2.dibujar();
  check('B6) «Listo» vuelve al compositor', !d.html.includes('data-hoja') && d.botones.some((b) => b.etiqueta === FILA));
  e2.tocar(FILA, d);
  d = e2.dibujar();
  check('B6) al volver a entrar, lo editado SIGUE ahí', e2.capturas[`Campo:${paso1}`]?.value === 'Le dije los ingredientes que tenía en la nevera.' && e2.capturas[`Campo:${tEs('composer.howStepPlaceholder', { n: 2 })}`]?.value === 'Weë me propuso una receta.');
  check('B6) y la elección del prompt también (sin marcar)', e2.capturas[`Switch:${tEs('composer.howPromptLabel')}`]?.value === false);
  e2.tocar(LISTO, d);
  d = e2.dibujar();

  e2.tocar(PUBLICAR, d);
  await e2.calma();
  const encendida = guardados.pop();
  check('B7) publicar encendido guarda lo AUTORIZADO: herramienta y pasos editados', encendida && JSON.stringify(encendida.aiTools) === '["Weë Chef"]'
    && encendida.aiProcess === 'Le dije los ingredientes que tenía en la nevera.\nWeë me propuso una receta.', JSON.stringify(encendida && { t: encendida.aiTools, p: encendida.aiProcess }));
  check('B7) el prompt escrito pero NO autorizado no viaja', encendida && !('aiPrompt' in encendida));
  check('B7) ni el id del trabajo, que es privado', encendida && !JSON.stringify(encendida).includes('job_1'));

  /* CONTROL del prompt: autorizado, sí viaja. */
  const e3 = compositor({ prefill: prefillDeChef });
  e3.dibujar();
  e3.capturas[`Switch:${TITULO}`].onValueChange(true);
  e3.tocar(FILA, e3.dibujar());
  e3.dibujar();
  e3.capturas[`Switch:${tEs('composer.howPromptLabel')}`].onValueChange(true);
  e3.dibujar();
  e3.capturas[`Campo:${tEs('composer.howPromptLabel')}`].onChangeText('Ensalada de sandía, feta, menta y lima');
  e3.tocar(LISTO, e3.dibujar());
  e3.tocar(PUBLICAR, e3.dibujar());
  await e3.calma();
  const conPrompt = guardados.pop();
  check('B8) CONTROL: el prompt autorizado sí se publica', conPrompt?.aiPrompt === 'Ensalada de sandía, feta, menta y lima');

  /* Encender y volver a apagar: la fila se va y no se comparte nada. */
  const e4 = compositor({ prefill: prefillDeChef });
  e4.dibujar();
  e4.capturas[`Switch:${TITULO}`].onValueChange(true);
  e4.dibujar();
  e4.capturas[`Switch:${TITULO}`].onValueChange(false);
  d = e4.dibujar();
  check('B9) apagarlo esconde la fila', !d.botones.some((b) => b.etiqueta === FILA));
  e4.tocar(PUBLICAR, d);
  await e4.calma();
  const reapagada = guardados.pop();
  check('B9) y la publicación no comparte el proceso', reapagada && !('aiTools' in reapagada) && !('aiProcess' in reapagada) && !('aiPrompt' in reapagada));

  /* Con origen en Weë AI pero sin pasos apuntados (solo la herramienta): encendido sin historia, se escriben a mano. */
  const e5 = compositor({ prefill: { content: 'Hecho con Weë', aiTools: ['Weë Chef'] } });
  e5.dibujar();
  e5.capturas[`Switch:${TITULO}`].onValueChange(true);
  e5.tocar(FILA, e5.dibujar());
  d = e5.dibujar();
  check('B10) con origen y sin historia lo dice, y deja escribir los pasos', d.texto.includes(tEs('composer.howNoHistory')) && d.botones.some((b) => b.etiqueta === tEs('composer.howAddStep')));
  check('B10) y la vista previa enseña lo que sí hay (la herramienta), sin pasos inventados', d.texto.includes(tEs('wall.howIMadeIt')) && d.texto.includes('Weë Chef') && !d.texto.includes('1. '));

  /*
   * REGLA DEL DUEÑO (2026-10-13): «Cómo lo hice» SOLO con origen en Weë AI o en Mis creaciones. Publicar directo
   * —escribir, adjuntar lo propio, un enlace, un hashtag— no tiene fila, ni interruptor, ni proceso a mano.
   */
  const directo = compositor({});
  d = directo.dibujar();
  check('B11) publicación directa: NO hay «Compartir cómo lo hice», ni su interruptor, ni la fila de revisar',
    !d.texto.includes(TITULO) && !directo.capturas[`Switch:${TITULO}`] && !d.botones.some((b) => b.etiqueta === FILA));
  directo.capturas[`Campo:${tEs('composer.postTextLabel')}`]?.onChangeText?.('Mi café favorito del día #cafe');
  d = directo.dibujar();
  directo.tocar(PUBLICAR, d);
  await directo.calma();
  const directa = guardados.pop();
  check('B11) y lo publicado no lleva aiTools, aiProcess, aiPrompt ni aiSteps',
    !!directa && directa.content === 'Mi café favorito del día #cafe' && ['aiTools', 'aiProcess', 'aiPrompt', 'aiSteps'].every((k) => !(k in directa)), JSON.stringify(directa && Object.keys(directa)));
  check('B11) CONTROL: desde Weë AI la fila SÍ está, apagada', (() => { const w = compositor({ prefill: prefillDeChef }); const x = w.dibujar(); return x.texto.includes(TITULO) && w.capturas[`Switch:${TITULO}`]?.value === false; })());

  /* Desde un material de la cuenta (la biblioteca de Weë Design publica así: media con assetId, sin trabajo). */
  const material = { media: [{ type: 'image', uri: 'https://firebasestorage.googleapis.com/v0/b/x/o/a.png?alt=media&token=t', assetId: 'asset_1' }] };
  const m = compositor({ prefill: material, sourceSection: 'design' });
  d = m.dibujar();
  check('B12) desde Mis creaciones / biblioteca (material con assetId): la fila está, apagada', d.texto.includes(TITULO) && m.capturas[`Switch:${TITULO}`]?.value === false);
  /* Quitar el último material de Weë: la fila se va (el origen ya no está en el borrador). */
  const quitar = d.botones.find((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 1 }));
  check('B12) CONTROL: hay aspa para quitar ese material', !!quitar);
  if (quitar) m.tocar(quitar.etiqueta, d);
  d = m.dibujar();
  check('B12) sin el material de Weë en el borrador, la fila desaparece', !d.texto.includes(TITULO) && !m.capturas[`Switch:${TITULO}`]);
}

/* La regla, pura. */
{
  const conJob = R.tieneOrigenDeWee({ jobId: 'j1' }, []);
  const conHerr = R.tieneOrigenDeWee({ aiTools: ['Weë Chef'] }, []);
  const conMaterial = R.tieneOrigenDeWee({ media: [{ uri: 'u', assetId: 'a1' }] }, [{ assetId: 'a1' }]);
  const materialQuitado = R.tieneOrigenDeWee({ media: [{ uri: 'u', assetId: 'a1' }] }, [{}]);
  const trabajoMasFotos = R.tieneOrigenDeWee({ jobId: 'j1', aiTools: ['Weë Studio'] }, [{}, {}]);
  check('B13) origen: trabajo de Weë AI, herramienta o material de la cuenta → sí', conJob && conHerr && conMaterial);
  check('B13) sin prefill, o con un prefill sin nada de Weë → no', !R.tieneOrigenDeWee(undefined, []) && !R.tieneOrigenDeWee({ content: 'hola' }, [{}]) && !R.tieneOrigenDeWee({ media: [{ uri: 'u' }] }, [{}]));
  check('B13) quitar el último material de Weë lo quita; añadir fotos propias a un trabajo de Weë, no', !materialQuitado && trabajoMasFotos);
  const encendido = { ...R.borradorInicial({ aiTools: ['Weë Chef'], aiProcess: 'Paso' }), activo: true };
  const lector = { t: tEs, locale: 'es' };
  check('B13) sin origen, datosDeComoLoHice no publica nada aunque el borrador esté encendido', JSON.stringify(R.datosDeComoLoHice(encendido, lector, false)) === '{}');
  check('B13) CONTROL: con origen, publica lo autorizado', JSON.stringify(R.datosDeComoLoHice(encendido, lector, true).aiTools) === '["Weë Chef"]');
}

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('C · El bloque del Wäll');
/* ════════════════════════════════════════════════════════════════════════════ */
const bloque = (props, so = 'android', idioma = 'es') => {
  globalThis.__comoLoHice = { componente: 'bloque', props };
  return crearEntorno({ so, pantalla: 'functions/test/_envoltorio-como-lo-hice.ts', dobles: (ctx) => comunes(ctx, idioma) });
};
{
  const post = { aiTools: ['Weë Chef'], aiProcess: 'Le dije los ingredientes que tenía en la nevera.\nWeë me propuso una receta.\nAjusté los pasos y generé la imagen.\nPubliqué el resultado en mi Wäll.' };
  /* La referencia (3.ª pantalla) lo enseña DESPLEGADO: así empieza en el Wäll. */
  const e = bloque({ post });
  let d = e.dibujar();
  check('C1) empieza DESPLEGADO, como en la referencia: «Creado con» y la herramienta', d.texto.includes('CÓMO LO HICE') && d.texto.includes(tEs('wall.madeWith')) && d.texto.includes('Weë Chef'));
  check('C1) «Proceso:» con los CUATRO pasos que existen, numerados y en orden', d.texto.includes(tEs('wall.process'))
    && /1. Le dije.*2. Weë me propuso.*3. Ajusté.*4. Publiqué/.test(d.texto) && !d.texto.includes('5.'));
  check('C1) libro abierto, chevrón hacia arriba y la cabecera dice «Ocultar»', d.html.includes('data-icono="book-outline"') && d.html.includes('data-icono="chevron-up"')
    && d.botones.some((b) => b.etiqueta === tEs('wall.howCollapse') && b.rol === 'button'));
  check('C1) sin prompt autorizado, «Ver prompt» no aparece', !d.texto.includes(tEs('wall.showPrompt')));

  e.tocar(tEs('wall.howCollapse'), d);
  d = e.dibujar();
  check('C2) tocar la cabecera lo pliega: solo la cabecera', d.texto.includes('CÓMO LO HICE') && !d.texto.includes(tEs('wall.madeWith')) && !d.texto.includes(tEs('wall.process')));
  check('C2) chevrón hacia abajo y la cabecera dice «Mostrar»', d.html.includes('data-icono="chevron-down"') && d.botones.some((b) => b.etiqueta === tEs('wall.howExpand')));
  check('C2) plegarlo no navega ni avisa de nada', e.navegacion.length === 0 && e.avisos.length === 0);

  e.tocar(tEs('wall.howExpand'), d);
  d = e.dibujar();
  check('C3) y vuelve a desplegarse; el estado se mantiene mientras se mira', d.texto.includes(tEs('wall.madeWith')) && e.dibujar().texto.includes(tEs('wall.madeWith')));
  const plegado = bloque({ post, abiertoAlEmpezar: false }).dibujar();
  check('C3) CONTROL: con el valor viejo (plegado) solo se ve la cabecera', plegado.texto.includes('CÓMO LO HICE') && !plegado.texto.includes(tEs('wall.madeWith')));

  const dos = bloque({ post: { aiTools: ['Weë Studio'], aiProcess: 'Uno.\nDos.' }, abiertoAlEmpezar: true }).dibujar();
  check('C4) solo los pasos que existen: dos son dos', dos.texto.includes('1. Uno.') && dos.texto.includes('2. Dos.') && !dos.texto.includes('3.'));

  const conPrompt = bloque({ post: { ...post, aiPrompt: 'Ensalada de sandía, feta y menta' }, abiertoAlEmpezar: true });
  d = conPrompt.dibujar();
  check('C5) con prompt AUTORIZADO aparece «Ver prompt»', d.botones.some((b) => b.etiqueta === tEs('wall.showPrompt')));
  conPrompt.tocar(tEs('wall.showPrompt'), d);
  d = conPrompt.dibujar();
  check('C5) y al tocarlo se ve el prompt', d.texto.includes('Ensalada de sandía, feta y menta'));
  const enWeb = bloque({ post: { aiPrompt: 'P' }, abiertoAlEmpezar: true }, 'web');
  enWeb.tocar(tEs('wall.showPrompt'), enWeb.dibujar());
  check('C5) en web sigue estando «Copiar prompt»', enWeb.dibujar().botones.some((b) => b.etiqueta === tEs('wall.copyPrompt')));

  check('C6) una publicación SIN proceso compartido no dibuja nada', bloque({ post: {} }).dibujar().html === '');
  check('C6) ni con los campos vacíos', bloque({ post: { aiTools: [], aiProcess: '', aiPrompt: '' } }).dibujar().html === '');
  check('C6) CONTROL: con solo la herramienta, sí hay bloque', bloque({ post: { aiTools: ['Weë Design'] } }).dibujar().texto.includes('CÓMO LO HICE'));

  const antigua = bloque({ post: { aiTools: ['Kling', 'ElevenLabs'], aiProcess: 'Hice el guion, generé el vídeo y le puse voz.' }, abiertoAlEmpezar: true }).dibujar();
  check('C7) una publicación ANTIGUA (un párrafo) se ve entera y sin número', antigua.texto.includes('Hice el guion, generé el vídeo y le puse voz.') && !antigua.texto.includes('1.'));
  check('C7) con sus dos herramientas', antigua.texto.includes('Kling') && antigua.texto.includes('ElevenLabs'));
}

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('D · Dónde va, sin IA de más, móvil y diccionarios');
/* ════════════════════════════════════════════════════════════════════════════ */
{
  const tarjeta = leer('components/PostCard.tsx');
  const iBloque = tarjeta.indexOf('<HowIMadeIt post={displayPost} />');
  const iAcciones = tarjeta.indexOf('<View style={styles.actions}>');
  const iCompartir = tarjeta.indexOf('onPress={handleShare}');
  const iFinContenido = tarjeta.indexOf('{/* Video rendered outside the content TouchableOpacity');
  check('D1) en la tarjeta va DESPUÉS de la fila de interacciones', iBloque > iAcciones && iBloque > iCompartir && iAcciones > 0);
  check('D1) y fuera del toque del contenido (no encima del multimedia)', iBloque > iFinContenido && iFinContenido > 0);
  check('D1) una sola vez', tarjeta.split('<HowIMadeIt').length === 2);
  check('D2) opinar, comentar, guardar y compartir siguen en su fila', ['handleVoteAgree', 'handleVoteDisagree', 'onComment(post.id!)', 'toggleBookmark(targetPostId)', 'onPress={handleShare}'].every((x) => tarjeta.slice(iAcciones, iBloque).includes(x)));

  const bloqueFuente = leer('components/HowIMadeIt.tsx');
  const revision = leer('components/ComoLoHiceRevision.tsx');
  const reglas = leer('utils/comoLoHice.ts');
  const crear = leer('screens/CreateScreen.tsx');
  const IA = /creatorService|brainService|httpsCallable|aiEngineService|functions\/src\/engine/;
  check('D3) el bloque, la revisión y las reglas no llaman a ninguna IA', ![bloqueFuente, revision, reglas].some((s) => IA.test(s.replace(/\/\*[\s\S]*?\*\//g, ''))));
  const hook = leer('hooks/useTrabajoDeOrigen.ts').replace(/\/\*[\s\S]*?\*\//g, '');
  check('D3) el compositor no habla con Weë AI: ni lo importa', !/creatorService|brainService|httpsCallable/.test(crear));
  check('D3) el trabajo se LEE con una suscripción y nada más, nunca se vuelve a ejecutar',
    /creatorService\.subscribeToJob\(jobId/.test(hook) && !/creatorService\.(run|start|answer|quote|attachImage|deleteJob)\(/.test(hook) && !/httpsCallable|spendCredits/.test(hook));
  check('D3) solo con el interruptor encendido, y se suelta al llegar',
    /useTrabajoDeOrigen\(trabajoDeOrigen, conOrigenDeWee && comoLoHice\.activo\)/.test(crear) && /if \(!pedir \|\| !jobId \|\| pedido\.current\) return;/.test(hook) && /if \(dejar\) dejar\(\);/.test(hook));
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  /* Solo la publicación de un resultado (handlePublish): otras navegaciones de la pantalla no son asunto de esta prueba. */
  const publicar = flujo.slice(flujo.indexOf('const handlePublish'), flujo.indexOf('const subidaConfig')).replace(/\/\*[\s\S]*?\*\//g, '');
  check('D4) Weë AI pasa el id del trabajo y NO su objetivo ni sus pasos por la ruta', publicar.length > 200 && /jobId: job\.id,/.test(publicar) && !/goal:|job\.steps|plan\.steps/.test(publicar));

  check('D5) móvil: cada paso ocupa lo que queda y parte sus líneas', /stepText: \{\s*flex: 1,\s*minWidth: 0/.test(bloqueFuente));
  check('D5) las herramientas saltan de línea en vez de desbordar', /toolsRow: \{[^}]*flexWrap: 'wrap'/.test(bloqueFuente));
  check('D5) ningún texto encoge la letra ni se corta para caber', ![bloqueFuente, revision].some((s) => /adjustsFontSizeToFit|minimumFontScale/.test(s)) && !/numberOfLines/.test(bloqueFuente));
  check('D5) sin anchos fijos en píxeles que puedan salirse de la pantalla', !/\bwidth: scale\(\d{3}/.test(bloqueFuente) && !/\bwidth: \d{3}/.test(bloqueFuente));
  check('D5) la fila de revisar y los textos del compositor también parten línea', /comoRevisarTexto: \{\s*flex: 1,\s*minWidth: 0/.test(crear) && /comoTextos: \{\s*flex: 1,\s*minWidth: 0/.test(crear));
  check('D6) la revisión es una función, no un componente anidado (el campo no pierde el foco)', !/const Seccion: React\.FC/.test(revision) && /const seccion = \(/.test(revision));

  /* Los 16 diccionarios, por el mecanismo de siempre. */
  const IDIOMAS = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'sv', 'da', 'tr', 'hi', 'ja', 'ko', 'zh', 'zh-TW'];
  const NUEVAS_C = Object.keys(ES.composer).filter((k) => k.startsWith('how'));
  const NUEVAS_W = ['howExpand', 'howCollapse', 'howStepNumber'];
  check('D7) control: hay claves nuevas que mirar', NUEVAS_C.length >= 20);
  const faltan = [];
  for (const l of IDIOMAS) {
    const c = leer(`i18n/textos/${l}/composer.ts`);
    const w = leer(`i18n/textos/${l}/wall.ts`);
    for (const k of NUEVAS_C) if (!new RegExp(`\\n  ${k}: '[^']+',`).test(c)) faltan.push(`${l}:composer.${k}`);
    for (const k of NUEVAS_W) if (!new RegExp(`\\n  ${k}: '[^']+',`).test(w)) faltan.push(`${l}:wall.${k}`);
  }
  check('D7) las claves nuevas están en los 16 diccionarios', faltan.length === 0, faltan.slice(0, 6).join(' '));
  const pt = leer('i18n/textos/pt/composer.ts');
  check('D8) el portugués es el de Brasil: «Compartilhar», no «Partilhar»', /howShareTitle: 'Compartilhar como eu fiz'/.test(pt) && !/howShare\w*: '[^']*Partilh/.test(pt));
  check('D8) las marcas no se traducen', IDIOMAS.every((l) => /howToolPlaceholder: '[^']*Weë Studio/.test(leer(`i18n/textos/${l}/composer.ts`))));
  check('D9) en inglés se lee como en la referencia', EN.composer.howShareTitle === 'Share how I made it' && EN.wall.howIMadeIt === 'HOW I MADE IT');
}

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('W · Solo en el Wäll: imagen y vídeo, nunca en Weëls; en el idioma de quien mira');
/* ════════════════════════════════════════════════════════════════════════════ */
{
  /* El mismo bloque, pintado por dos lectores: los pasos de Weë cambian de idioma, lo escrito a mano no. */
  const post = {
    aiTools: ['Weë Chef'],
    aiProcess: 'Escribir la receta paso a paso\nLo terminé con lima.',
    aiSteps: [{ servidor: 'Escribir la receta paso a paso', experiencia: 'chef' }, { texto: 'Lo terminé con lima.' }],
  };
  const enEs = bloque({ post }, 'android', 'es').dibujar();
  const enEn = bloque({ post }, 'android', 'en').dibujar();
  const enPt = bloque({ post }, 'android', 'pt-BR').dibujar();
  check('W1) en español: «CÓMO LO HICE», «Creado con» y el paso en español', enEs.texto.includes('CÓMO LO HICE') && enEs.texto.includes('Creado con') && enEs.texto.includes('1. Escribir la receta paso a paso'));
  check('W1) en inglés: las etiquetas Y el paso de Weë en inglés', enEn.texto.includes('HOW I MADE IT') && enEn.texto.includes('Made with') && enEn.texto.includes('1. Write the step-by-step recipe') && !enEn.texto.includes('Escribir la receta'));
  check('W1) en portugués de Brasil: las etiquetas del bloque en portugués', enPt.texto.includes('COMO EU FIZ') && enPt.texto.includes('Criado com'));
  check('W1) lo escrito a mano y la herramienta, iguales para todos', [enEs, enEn, enPt].every((d) => d.texto.includes('2. Lo terminé con lima.') && d.texto.includes('Weë Chef')));
  check('W1) CONTROL: una publicación antigua (solo aiProcess) se ve tal cual también en inglés', bloque({ post: { aiProcess: 'Uno.\nDos.' } }, 'android', 'en').dibujar().texto.includes('1. Uno.'));

  /* Vídeo en el Wäll: el bloque va igual debajo de la fila de interacciones, fuera de lo que abre Weëls. */
  const tarjeta = leer('components/PostCard.tsx');
  const iBloque = tarjeta.indexOf('<HowIMadeIt post={displayPost} />');
  const iVideoFuera = tarjeta.indexOf('{!!(displayPost.videoUrl && onVideoPress) && renderMedia()}');
  const iAcciones = tarjeta.indexOf('<View style={styles.actions}>');
  check('W2) una publicación de VÍDEO también lleva el bloque, y después de las interacciones', iVideoFuera > 0 && iAcciones > iVideoFuera && iBloque > iAcciones);
  const antes = tarjeta.slice(Math.max(0, iBloque - 400), iBloque).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  check('W2) el bloque no depende del tipo de publicación (ni de videoUrl ni de imágenes)', !/videoUrl|imageUrls|isWeel/.test(antes) && /<HowIMadeIt post=\{displayPost\} \/>/.test(tarjeta));
  const renderMedia = tarjeta.slice(tarjeta.indexOf('const renderMedia'), tarjeta.indexOf('const renderMedia') + 20000);
  check('W2) el bloque no está dentro del vídeo: tocarlo no dispara onVideoPress', !renderMedia.slice(0, renderMedia.indexOf('\n  };\n')).includes('HowIMadeIt') && /onPress=\{onVideoPress \? \(\) => onVideoPress\(displayPost, playbackPositionRef\.current\) : handleVideoTap\}/.test(tarjeta));
  const video = bloque({ post: { ...post, videoUrl: 'https://v/a.mp4' } });
  let d = video.dibujar();
  video.tocar(tEs('wall.howCollapse'), d);
  check('W2) tocar la cabecera de un post de vídeo no navega (no abre Weëls)', video.navegacion.length === 0);

  /* En Weëls no se ve: ni la pantalla ni ninguna pieza que monte lo pinta. */
  const reels = leer('screens/ReelsScreen.tsx');
  const vistos = new Set();
  const piezas = [];
  const recorrer = (rel) => {
    if (vistos.has(rel)) return;
    vistos.add(rel);
    const src = leer(rel);
    piezas.push([rel, src]);
    for (const m of src.matchAll(/^import (?!type )[^;]*?from '(\.{1,2}\/[^']+)'/gm)) {
      const destino = new URL(m[1], 'file:///' + rel).pathname.slice(1);
      if (!/^components\//.test(destino)) continue;
      for (const ext of ['.tsx', '.ts', '/index.tsx']) { try { leer(destino + ext); recorrer(destino + ext); break; } catch { /* siguiente */ } }
    }
  };
  recorrer('screens/ReelsScreen.tsx');
  const conBloque = piezas.filter(([, src]) => /HowIMadeIt|lecturaDePublicacion|ComoLoHice/.test(src)).map(([rel]) => rel);
  check('W3) Weëls (ReelsScreen y sus componentes) NO pinta «Cómo lo hice»', conBloque.length === 0, conBloque.join(' ') || piezas.length + ' archivos mirados');
  check('W3) ni monta la tarjeta del Wäll', !/<PostCard|components\/PostCard'/.test(reels));
  check('W3) CONTROL: el detector sí lo ve donde está (la tarjeta del Wäll)', /HowIMadeIt/.test(tarjeta) && piezas.length >= 2);
}

terminar();
