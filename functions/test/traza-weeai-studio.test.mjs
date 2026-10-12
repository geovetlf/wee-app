/**
 * TRAZABILIDAD DE WEË AI · WEË STUDIO (R9 · E2).
 *
 * La auditoría de trazabilidad encontró en la portada de Weë Studio cuatro cosas que la persona ve y que no llegaban a
 * ninguna parte, o que fingían:
 *
 *   A · Sin destino, un TEMPORIZADOR encendía «Creación lista» sin haber creado nada.
 *   B · Los AJUSTES de la hoja (formato, duración, estilo…) se elegían y no viajaban a `CreatorFlow`.
 *   C · El MICRÓFONO abría el selector de fotos («añadía una referencia»).
 *   D · «Mis creaciones» enseñaba cuatro piezas de MUESTRA como si fueran de la persona, con un «⋯» que no hacía nada.
 *
 * Esta suite monta `screens/StudioScreen.tsx` DE VERDAD (`_traza-weeai.mjs`, con efectos) y lo toca. Lo que se dobla son las
 * piezas de dibujo y el servicio de trabajos (por debajo del hook real `useCreacionesDelStudio`); el catálogo de puertas, el
 * destino por palabras, la hoja de ajustes y el traductor son los de verdad. Cada grupo lleva su CONTROL.
 */
import { montarConEfectos, traductorDe, cargarBase, h, React } from './_traza-weeai.mjs';
import { leer, sinComentarios, crearCargador } from './filmmaker-cliente.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const titulo = (x) => console.log(`\n─── ${x} ───`);

/* Los temporizadores se APUNTAN: la pantalla no debe programar ninguno al crear. */
const temporizadores = [];
const setTimeoutReal = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms) => { temporizadores.push({ fn, ms }); return temporizadores.length; };

const tEs = traductorDe('es');
const AJ = cargarBase('constants/ajustesContextuales.ts');

/** Lo que devolvería `creatorService.getMyJobsDe`: el filtro (`pertenece`) es el de verdad, el de `utils/creacionesDelStudio.ts`. */
const trabajo = (id, experienceId, status, extra = {}) => ({
  id, userId: 'u1', experienceId, goal: `Objetivo ${id}`, questions: [], answers: [], plan: null, steps: [],
  results: [{ stepId: 's', kind: 'image', title: 'x', url: `https://x.test/${id}.png` }], status, progressText: '',
  creditsEstimated: 1, creditsCharged: 1, demo: false, ...extra,
});

const pantalla = async ({ trabajos = [], fallaLaLista = false, usuario = { uid: 'u1' }, params = {} } = {}) => {
  const lecturas = [];
  const llamadasProhibidas = [];
  const servicio = {
    creatorService: new Proxy({}, { get: (_, k) => {
      if (k === 'getMyJobsDe') return async (uid, pertenece, cantidad) => {
        lecturas.push({ uid, cantidad });
        if (fallaLaLista) throw new Error('sin red');
        return trabajos.filter(pertenece).slice(0, cantidad);
      };
      if (k !== '__esModule' && k !== 'then') llamadasProhibidas.push(String(k));
      return () => undefined;
    } }),
    claveDelEstado: { asking: 'weeai.jobAsking', planned: 'weeai.jobPlanned', running: 'weeai.jobRunning', done: 'weeai.jobDone', failed: 'weeai.jobFailed', cancelled: 'weeai.jobCancelled' },
  };
  const p = await montarConEfectos({
    pantalla: 'screens/StudioScreen.tsx',
    usuario,
    params,
    dobles: ({ capturar }) => ({
      '../hooks/useResponsive': { useResponsive: () => ({ isMobile: true, isTablet: false, isDesktop: false }) },
      '../components/BarraInferior': { ALTO_BARRA: 64 },
      '../services/creatorService': servicio,
      '../components/creator/CajaQueCrece': { PaginaDeCajas: capturar('PaginaDeCajas') },
      '../components/studio/StudioHeader': { __esModule: true, default: capturar('StudioHeader') },
      '../components/studio/StudioPromptComposer': { __esModule: true, default: capturar('StudioPromptComposer') },
      '../components/studio/StudioEntradas': { __esModule: true, default: capturar('StudioEntradas') },
      '../components/studio/StudioPanel': { __esModule: true, default: capturar('StudioPanel') },
      '../components/creator/AjustesContextuales': { __esModule: true, default: capturar('AjustesContextuales') },
      '../components/creator/AvisoDeCreacion': { __esModule: true, default: capturar('AvisoDeCreacion') },
      '../components/creator/FilaDeCreaciones': { __esModule: true, default: capturar('FilaDeCreaciones') },
      '../components/creator/FichaDeContexto': { __esModule: true, default: capturar('FichaDeContexto') },
      '../components/EspacioDeEscritura': { __esModule: true, default: capturar('EspacioDeEscritura'), useAlturaDelTeclado: () => 0 },
    }),
  });
  return Object.assign(p, { lecturas, llamadasProhibidas });
};
const escribir = (p, texto) => { p.dibujar(); p.capturas.StudioPromptComposer.onCambiar(texto); p.dibujar(); };
const crear = (p) => { p.capturas.StudioPromptComposer.onCrear(); p.dibujar(); };

/* ═══ A · SIN DESTINO NO HAY CREACIÓN FINGIDA ═══════════════════════════════════════════════════════════════════════ */
titulo('A · sin destino: se dice la verdad y se ofrece Weë Brain');
{
  const p = await pantalla();
  escribir(p, 'Hola, no sé qué quiero hacer');
  const antes = temporizadores.length;
  crear(p);
  const aviso = p.capturas.AvisoDeCreacion;
  check('A1) una frase sin sitio en el Studio enciende el aviso «sin destino», no «creando» ni «listo»', aviso?.estado === 'sinDestino', aviso?.estado);
  check('A2) y NO programa ningún temporizador (antes, 1,6 s después decía «Creación lista»)', temporizadores.length === antes, `${temporizadores.length - antes} temporizadores`);
  check('A3) ni navega a ninguna parte por su cuenta', p.navegacion.length === 0, JSON.stringify(p.navegacion));
  check('A4) la salida que ofrece es real: «Preguntar a Weë Brain», con su clave', aviso?.claveAccion === 'studio.askBrain' && typeof aviso?.onAccion === 'function');
  aviso.onAccion();
  p.dibujar();
  check('A5) tocarla lleva a Weë Brain (la ficha `brain`) y cierra el aviso', p.navegacion.some((n) => n[1] === 'Specialist' && n[2]?.id === 'brain') && p.capturas.AvisoDeCreacion.estado === 'quieto', JSON.stringify(p.navegacion));
}
{
  const p = await pantalla({ params: { projectId: 'proj-9' } });
  escribir(p, 'Hola, no sé qué quiero hacer');
  crear(p);
  p.capturas.AvisoDeCreacion.onAccion();
  check('A6) si se venía de un proyecto, Weë Brain lo recibe (P11)', p.navegacion.some((n) => n[1] === 'Specialist' && n[2]?.id === 'brain' && n[2]?.projectId === 'proj-9'), JSON.stringify(p.navegacion));
}
{
  const p = await pantalla();
  escribir(p, 'Quiero un video de 10 segundos para mi cafetería');
  crear(p);
  check('CONTROL · A7) una frase CON sitio sigue yendo a CreatorFlow y no enciende el aviso', p.navegacion.some((n) => n[1] === 'CreatorFlow') && p.capturas.AvisoDeCreacion.estado === 'quieto');
}
{
  /* El aviso real pinta el estado nuevo con sus textos y sus dos acciones. */
  const vistos = { textos: [], botones: [] };
  const textoDe = (c) => (Array.isArray(c) ? c.map(textoDe).join('') : typeof c === 'string' ? c : '');
  const cargar = crearCargador({ dobles: {
    react: React,
    'react-native': {
      View: (p) => h('div', null, p.children),
      Text: (p) => { vistos.textos.push(textoDe(p.children)); return h('span', null, p.children); },
      TouchableOpacity: (p) => { vistos.botones.push({ etiqueta: p.accessibilityLabel, rol: p.accessibilityRole, tocar: p.onPress }); return h('button', null, p.children); },
      StyleSheet: { create: (s) => s, hairlineWidth: 1 }, Platform: { OS: 'android', select: (o) => o.android ?? o.default },
    },
    '@expo/vector-icons': { Ionicons: () => h('i') },
    '../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: new Proxy({}, { get: () => '#000000' }) } }) },
    '../../contexts/IdiomaContext': { useT: () => tEs },
  } });
  const { renderToStaticMarkup } = (await import('node:module')).createRequire(import.meta.url)('react-dom/server');
  const Aviso = cargar('components/creator/AvisoDeCreacion.tsx').default;
  let accion = 0; let cerrado = 0;
  renderToStaticMarkup(h(Aviso, { estado: 'sinDestino', bottom: 0, onCerrar: () => cerrado++, claveAccion: 'studio.askBrain', onAccion: () => accion++ }));
  check('A8) el aviso real dice que no hay destino y cómo seguir, en el idioma de la persona',
    vistos.textos.includes(tEs('studio.noDestination')) && vistos.textos.includes(tEs('studio.noDestinationHint')), vistos.textos.join(' | '));
  check('A9) y NO dice «Creación lista» ni que sea una demostración', !vistos.textos.includes(tEs('studio.ready')) && !vistos.textos.includes(tEs('studio.readyHint')));
  vistos.botones.find((b) => b.etiqueta === tEs('studio.askBrain'))?.tocar();
  vistos.botones.find((b) => b.etiqueta === tEs('studio.dismiss'))?.tocar();
  check('A10) sus dos botones son botones (rol) y hacen lo suyo: preguntar a Weë Brain y cerrar', accion === 1 && cerrado === 1 && vistos.botones.every((b) => b.rol === 'button'), `${accion}/${cerrado}`);
}

/* ═══ B · LOS AJUSTES VIAJAN ════════════════════════════════════════════════════════════════════════════════════════ */
titulo('B · los ajustes de la hoja llegan a CreatorFlow, en palabras');
const VIDEO = 'Quiero un video para mi cafetería';
const goalDe = (p) => p.navegacion.find((n) => n[1] === 'CreatorFlow')?.[2]?.goal ?? '';
{
  const p = await pantalla();
  escribir(p, VIDEO);
  const hoja = p.capturas.AjustesContextuales;
  check('B0) la hoja pregunta los ajustes de VÍDEO por lo escrito (contexto real)', hoja?.contexto === 'video', hoja?.contexto);
  hoja.onElegir('style', 'realistic'); p.dibujar();
  p.capturas.AjustesContextuales.onElegir('duration', '10s'); p.dibujar();
  crear(p);
  const goal = goalDe(p);
  check('B1) el estilo elegido viaja en el objetivo, en palabras del idioma', goal.includes(tEs('studio.valRealistic').toLocaleLowerCase('es')), goal);
  check('B2) y la duración también', goal.includes(tEs('studio.valSec10').toLocaleLowerCase('es')), goal);
  check('B3) sin identificadores crudos (realistic, 10s, style)', !/\brealistic\b|\b10s\b|\bstyle\b/.test(goal), goal);
  check('B4) lo escrito por la persona sigue entero', goal.includes(VIDEO), goal);
}
{
  const p = await pantalla();
  escribir(p, VIDEO);
  for (const g of AJ.ajustesDe('video')) if (g.opciones.length) p.capturas.AjustesContextuales.onElegir(g.id, 'auto');
  p.dibujar();
  crear(p);
  check('CONTROL · B5) con todo en «Automático» el objetivo es la frase sola: Automático no dice nada', goalDe(p) === VIDEO, goalDe(p));
}
{
  const p = await pantalla();
  escribir(p, VIDEO);
  p.capturas.AjustesContextuales.onElegir('tone', 'close'); p.dibujar();
  crear(p);
  check('B6) un ajuste que la hoja NO pregunta para vídeo (tono) no se cuela', !goalDe(p).includes(tEs('studio.valClose').toLocaleLowerCase('es')), goalDe(p));
}
{
  const { palabrasDeLosAjustesDelStudio } = cargarBase('utils/ajustesDelStudio.ts');
  const ps = palabrasDeLosAjustesDelStudio({ style: 'realistic', inventado: 'x', duration: 'auto', format: 'nada' }, 'video', tEs);
  check('B7) la regla pura: solo opciones conocidas y preguntadas, sin «auto», en palabras', ps.join('|') === tEs('studio.valRealistic'), ps.join('|'));
}

/* ═══ C · EL MICRÓFONO DICE LA VERDAD ═══════════════════════════════════════════════════════════════════════════════ */
titulo('C · el micrófono no abre el selector de fotos');
{
  const p = await pantalla();
  const caja = p.capturas.StudioPromptComposer;
  check('C1) el micrófono y la referencia ya no comparten manejador', typeof caja.onVoz === 'function' && caja.onVoz !== caja.onReferencia);
  caja.onVoz();
  check('C2) pulsarlo avisa, con las palabras de Weë Brain, de que dictar llegará más adelante', p.avisos.includes(tEs('weeai.comingVerySoon')), JSON.stringify(p.avisos));
  check('C3) y no añade ninguna referencia', !p.capturas.FichaDeContexto);
  const fuente = sinComentarios(leer('screens/StudioScreen.tsx'));
  check('CONTROL · C4) en el código, `onVoz` no apunta al selector', !/onVoz=\{alAnadirReferencia\}/.test(fuente) && /onVoz=\{alDictar\}/.test(fuente));
}

/* ═══ D · MIS CREACIONES, LAS DE VERDAD ═════════════════════════════════════════════════════════════════════════════ */
titulo('D · «Mis creaciones» del Studio son los trabajos de la cuenta');
{
  const trabajos = [
    trabajo('a', 'studio', 'done', { results: [{ stepId: 's', kind: 'video', title: 'v', url: 'https://x.test/a.mp4' }] }),
    trabajo('b', 'photo', 'done'),
    trabajo('c', 'design', 'done'),       // de Weë Design: no es del Studio
    trabajo('d', 'photo', 'asking'),      // una conversación a medias: no es una creación
    trabajo('e', 'beauty', 'running'),
  ];
  const p = await pantalla({ trabajos });
  const fila = p.capturas.FilaDeCreaciones;
  check('D1) la fila se pide a la CUENTA por el camino de siempre (getMyJobsDe), una vez al enfocar', p.lecturas.length === 1 && p.lecturas[0].uid === 'u1', JSON.stringify(p.lecturas));
  check('D2) y enseña SOLO lo creado en el Studio, terminado o en marcha', fila?.creaciones.map((c) => c.id).join() === 'a,b,e', fila?.creaciones.map((c) => c.id).join());
  check('D3) ninguna pieza es de muestra (sin títulos de catálogo)', fila.creaciones.every((c) => !c.claveTitulo));
  check('D4) la etiqueta dice el TIPO del resultado o su estado, como clave', fila.creaciones[0].claveTipo === 'creaciones.kindVideo' && fila.creaciones[2].claveTipo === 'weeai.jobRunning', fila.creaciones.map((c) => c.claveTipo).join());
  check('D5) una imagen trae su miniatura', fila.creaciones[1].uri === 'https://x.test/b.png');
  fila.onAbrir('b');
  check('D6) tocar una la reabre en CreatorFlow con su experiencia y su trabajo, y nada más', p.navegacion.some((n) => n[1] === 'CreatorFlow' && n[2]?.experienceId === 'photo' && n[2]?.jobId === 'b' && Object.keys(n[2]).length === 2), JSON.stringify(p.navegacion));
  check('D7) ya no hay un «⋯» que no hace nada', fila.onOpciones === undefined);
  fila.onVerTodas();
  check('D8) «Ver todas» lleva a Mis creaciones (lo que dice el título de la fila)', p.navegacion.some((n) => n[1] === 'MisCreaciones'));
  check('D9) y la pantalla no llama a nada más del servicio (no crea, no cotiza, no cobra)', p.llamadasProhibidas.length === 0, p.llamadasProhibidas.join());
}
{
  const p = await pantalla({ trabajos: [trabajo('c', 'design', 'done')] });
  check('D10) sin creaciones del Studio no se pinta una fila vacía ni de muestra', !p.capturas.FilaDeCreaciones);
}
{
  const p = await pantalla({ fallaLaLista: true });
  const fila = p.capturas.FilaDeCreaciones;
  check('D11) si la lista no se puede leer, se dice (estado de error) y se puede reintentar', fila?.estado === 'error' && typeof fila.onReintentar === 'function');
}
{
  const p = await pantalla({ usuario: null });
  check('D12) sin sesión no se lee nada ni se enseña nada', p.lecturas.length === 0 && !p.capturas.FilaDeCreaciones);
}
{
  const fuente = sinComentarios(leer('screens/StudioScreen.tsx'));
  check('CONTROL · D13) la pantalla ya no importa las creaciones de muestra', !/studioMocks|CREACIONES_DEL_STUDIO/.test(fuente));
  check('CONTROL · D14) y sigue sin nombrar ningún servicio de creación (lee por su hook)', !/creatorService|brainService|httpsCallable/.test(leer('screens/StudioScreen.tsx')));
}

globalThis.setTimeout = setTimeoutReal;
console.log(failures === 0 ? '\n✔ traza-weeai-studio: todo en orden' : `\n✘ traza-weeai-studio: ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
