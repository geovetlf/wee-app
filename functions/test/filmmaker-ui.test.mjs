/**
 * F1-C · WEË FILMMAKER — LA PANTALLA DE PRODUCCIÓN, DIBUJADA.
 *
 * Se dibujan las piezas de verdad (`components/studio/produccion/`, la pantalla
 * `screens/ProductionScreen.tsx` y el campo `components/creator/CampoQueCrece.tsx`)
 * con `react-dom/server` y dobles mínimos de React Native. Los textos salen del
 * traductor DE VERDAD con el diccionario español, así que una clave que falte se
 * nota; el estado sale del controlador DE VERDAD contra un servidor en memoria, y
 * la producción, del dominio de F1-A (el espejo).
 *
 *   A · Vacíos: la lista sin producciones y una producción sin escenas.
 *   B · Una producción cargada: escenas, planos y lo que dice cada tarjeta.
 *   C · Selección y el panel Director.
 *   D · Gestos: reordenar, alargar, dividir, quitar; y el formato 4:5.
 *   E · Recomendaciones: aceptar y rechazar, nunca solas.
 *   F · Guardar: pendiente, guardando, guardado y error.
 *   G · Conflicto y archivada.
 *   H · La pantalla: cargando, error y cargada.
 *   I · Lo que no hay: ni progreso, ni precio, ni generación, ni claves sin texto.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { crearCargador, leer, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = async (letra, fn) => {
  try { await fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
};

const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
const h = React.createElement;
/*
 * El estado entre dos dibujados: `useState` de verdad no sobrevive al servidor. Solo cuando una prueba lo pide
 * (`recordar()`): se guarda por orden de llamada, igual que hace React, para un mismo árbol dibujado dos veces.
 */
let almacen = null;
let indiceDeEstado = 0;
const useStatePersistente = (inicial) => {
  if (!almacen) return React.useState(inicial);
  const i = indiceDeEstado++;
  if (!(i in almacen)) almacen[i] = typeof inicial === 'function' ? inicial() : inicial;
  return [almacen[i], (v) => { almacen[i] = typeof v === 'function' ? v(almacen[i]) : v; }];
};
const recordar = (si) => { almacen = si ? [] : null; };

/* ── Lo que se toca: cada botón, cada pestaña, cada campo, con su etiqueta ── */
let botones = [];
let campos = [];
const quitarEstilo = ({ style, ...resto }) => resto;
const Caja = ({ children, accessibilityLabel, accessibilityRole }) => h('div', { 'aria-label': accessibilityLabel, role: accessibilityRole }, children);
const Texto = ({ children, accessibilityRole }) => h('span', { role: accessibilityRole }, children);
const Toque = ({ children, onPress, disabled, accessibilityLabel, accessibilityState, accessibilityRole }) => {
  botones.push({ etiqueta: accessibilityLabel, tocar: onPress, apagado: !!disabled, elegido: accessibilityState?.selected, rol: accessibilityRole });
  return h('button', { 'aria-label': accessibilityLabel, disabled: !!disabled, 'aria-selected': accessibilityState?.selected }, children);
};
const Campo = (props) => {
  campos.push({ etiqueta: props.accessibilityLabel, valor: props.value, cambiar: props.onChangeText, maximo: props.maxLength });
  return h('textarea', { 'aria-label': props.accessibilityLabel, defaultValue: props.value });
};
const reactNative = {
  View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, ActivityIndicator: ({ accessibilityLabel }) => h('progress', { 'aria-label': accessibilityLabel }),
  TextInput: Campo, StyleSheet: { create: (s) => s, flatten: (s) => s }, Platform: { OS: 'web', select: (o) => o.web ?? o.default },
  Dimensions: { get: () => ({ width: 1280, height: 800 }), addEventListener: () => ({ remove() {} }) },
};
const colores = new Proxy({}, { get: () => '#000000' });

/* ── El traductor de verdad, con el español de verdad ── */
const cargarReal = crearCargador({ dobles: { 'react-native': reactNative } });
const { crearTraductor } = cargarReal('i18n/traducir.ts');
const formatoReal = cargarReal('i18n/formato.ts');
const ES = cargarReal('i18n/textos/es/index.ts').es;
const faltan = new Set();
const t = crearTraductor('es', { es: ES }, { alFaltarUnaClave: (clave) => faltan.add(clave) });
const formato = {
  numero: (v, o) => formatoReal.formatearNumero(v, 'es', o),
  lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo),
  tiempoRelativo: (f, a) => formatoReal.formatearTiempoRelativo(f, 'es', a ?? 10_000_000),
  fecha: (f, o) => formatoReal.formatearFecha(f, 'es', o),
};

/* ── Los dobles de lo que no se prueba aquí ── */
const avisos = [];
let confirmar = true;
const listas = { active: { carga: 'lista', producciones: [], fallo: null, hayMas: false }, archived: { carga: 'lista', producciones: [], fallo: null, hayMas: false } };
const creadas = [];
let usoDeProduccion = null;
let ruta = { params: {} };
const navegacion = { llamadas: [], goBack() { this.llamadas.push(['goBack']); }, canGoBack: () => true, navigate(...a) { this.llamadas.push(['navigate', ...a]); }, push(...a) { this.llamadas.push(['push', ...a]); }, replace(...a) { this.llamadas.push(['replace', ...a]); } };
const shell = [];
const dobles = {
  'react-native': reactNative,
  '@expo/vector-icons': { Ionicons: ({ name }) => h('i', { 'data-icono': name }) },
  '@react-navigation/native': { useRoute: () => ruta, useNavigation: () => navegacion },
  '../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (P) => P },
  '../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (P) => P },
  '../../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (P) => P },
  '../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
  '../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
  '../../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
  '../utils/scale': { scale: (x) => x },
  '../../utils/scale': { scale: (x) => x },
  '../../../utils/scale': { scale: (x) => x },
  '../utils/notify': { notify: (...a) => avisos.push(a), confirmAction: async () => confirmar },
  '../../../utils/notify': { notify: (...a) => avisos.push(a), confirmAction: async () => confirmar },
  '../../../hooks/useProducciones': {
    useProducciones: (estado) => ({ ...listas[estado], recargar: async () => {}, cargarMas: async () => {}, quitar: () => {} }),
    crearProduccion: async (p) => { creadas.push(p); return { ok: true, valor: { created: true, produccion: { productionId: p.productionId, revision: 0, status: 'active', createdAt: 1, updatedAt: 1, production: p.production } } }; },
    nuevoIdDeProduccion: () => 'abcdefghijklmnopqrstuvwx',
  },
  '../hooks/useResponsive': { useResponsive: () => ({ isDesktop: true, isMobile: false, isTablet: false }) },
  '../hooks/useProduccion': { useProduccion: () => usoDeProduccion, nuevoIdDeEscena: () => 'sc_nueva0001', nuevoIdDePlano: () => 'sh_nuevo0001' },
  '../components/creator/CreatorShell': { __esModule: true, default: ({ title, overline, breadcrumb, children }) => { shell.push({ title, overline, breadcrumb }); return h('main', { 'aria-label': title }, children); } },
};
const cargar = crearCargador({ dobles: { ...dobles, react: { ...React, useState: useStatePersistente } } });
const P = (nombre) => cargar(`components/studio/produccion/${nombre}.tsx`).default;
const dibujar = (elemento) => { botones = []; campos = []; indiceDeEstado = 0; const html = renderToStaticMarkup(elemento); return { html, botones: botones.slice(), campos: campos.slice(), texto: html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ') }; };
const boton = (d, etiqueta) => d.botones.find((b) => b.etiqueta === etiqueta);
const botonesQue = (d, etiqueta) => d.botones.filter((b) => b.etiqueta === etiqueta);

/* ── El dominio y el estado de verdad ── */
const D = cargar('services/filmmaker/dominio.ts');
const K = cargar('utils/controladorDeProduccion.ts');
const R = cargar('utils/produccionOptimista.ts');
const PR = cargar('utils/presentacionDeProduccion.ts');
const PID = 'abcdefghijklmnopqrstuvwx';
const clon = (x) => JSON.parse(JSON.stringify(x));
const produccion = () => clon({
  ...D.produccionVacia({ title: 'El día de una panadería', aspectRatio: '4:5', id: PID }),
  ...D.configuracionDePreset('ads'),
  intent: { freeText: 'El día de una panadería, de madrugada al cierre' },
  creativeDirection: { cinematography: { version: 1, lighting: { type: 'golden_hour' } } },
  characters: [{ id: 'char-ana', name: 'Ana', identityDescription: 'la panadera' }],
  audio: { cues: [{ id: 'cue-horno', kind: 'sfx', description: 'el horno', target: { scope: 'shot', shotId: 'sh-0102' } }] },
  scenes: [
    { id: 'sc-0001', order: 0, title: 'Madrugada', timeOfDay: 'dawn', weather: 'fog', shots: [
      { id: 'sh-0101', order: 0, durationSec: 3, description: 'Se enciende la luz del obrador', visual: { creative: { version: 1, shot: { type: 'close_up' } } },
        subject: { characterId: 'char-ana', focus: 'hands' }, referenceIds: [] },
      { id: 'sh-0102', order: 1, durationSec: 4, description: 'La masa entra al horno', dependsOn: ['sh-0101'],
        dialogue: [{ id: 'ln-1', kind: 'dialogue', characterId: 'char-ana', text: 'Buenos días, horno' }] },
    ] },
    { id: 'sc-0002', order: 1, title: 'Mostrador', shots: [{ id: 'sh-0201', order: 0, durationSec: 5 }] },
  ],
});
const guardada = (p, rev = 0, extra = {}) => ({ productionId: PID, revision: rev, status: 'active', createdAt: 1, updatedAt: 1, production: p, ...extra });
const servidor = (inicial) => {
  const s = { vista: guardada(inicial), fallar: null };
  s.api = {
    getProduction: async () => (s.fallar ? { ok: false, fallo: s.fallar } : { ok: true, valor: clon(s.vista) }),
    applyProductionOperations: async (l) => {
      if (s.fallar) return { ok: false, fallo: s.fallar };
      const r = D.aplicarOperaciones(s.vista.production, l.operations);
      const revision = s.vista.revision + 1;
      s.vista = guardada({ ...r.production, metadata: { ...r.production.metadata, revision } }, revision);
      return { ok: true, valor: { produccion: clon(s.vista), applied: r.applied, pending: r.pending, timelineChanged: r.timelineChanged, operationId: l.operationId, alreadyApplied: false } };
    },
    archiveProduction: async () => { s.vista = { ...s.vista, status: 'archived', archivedAt: 5 }; return { ok: true, valor: { changed: true, resumen: { productionId: PID, title: 'x', status: 'archived', aspectRatio: '4:5', revision: s.vista.revision, createdAt: 1, updatedAt: 5, archivedAt: 5 } } }; },
    unarchiveProduction: async () => ({ ok: true, valor: { changed: true, resumen: { productionId: PID, title: 'x', status: 'active', aspectRatio: '4:5', revision: s.vista.revision, createdAt: 1, updatedAt: 6 } } }),
  };
  return s;
};
const reloj = () => { const cola = []; return { programar: (fn) => { const tarea = { fn, vivo: true }; cola.push(tarea); return () => { tarea.vivo = false; }; }, pasar: () => cola.splice(0).filter((x) => x.vivo).forEach((x) => x.fn()) }; };
const calma = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)); };
let lotes = 0;
const abrir = async (inicial = produccion()) => {
  const srv = servidor(inicial); const r = reloj();
  const c = K.crearControladorDeProduccion(PID, { servicio: srv.api, programar: r.programar, nuevoIdDeOperacion: () => `op_ui${String(++lotes).padStart(5, '0')}` });
  await c.cargar();
  return { srv, r, c };
};
/** Lo que el hook entregaría a la pantalla, calculado igual: el dominio sobre lo que se ve. */
const derivar = (e) => (e.vista ? { recomendaciones: D.recomendar(e.vista), tarjetas: D.tarjetasDeStoryboard(e.vista), linea: D.lineaDeTiempo(e.vista), lista: D.validarProduccion(e.vista, { stage: 'ready' }) } : null);
const ids = { escena: () => 'sc_nueva0001', plano: () => 'sh_nuevo0001' };

const Storyboard = P('ProductionStoryboard');
const Director = P('ProductionDirectorPanel');
const Header = P('ProductionHeader');
const Avisos = P('ProductionAvisos');
const Lista = P('ProductionList');
const Nueva = P('ProductionNewCard');
const Timeline = P('ProductionTimelinePreview');
const storyboard = (c, seleccion = null, onSeleccionar = () => {}) => {
  const e = c.leer().estado;
  return dibujar(h(Storyboard, { produccion: e.vista, tarjetas: D.tarjetasDeStoryboard(e.vista), seleccion, porRehacer: [...e.porRehacer.shots, ...e.porRehacer.scenes], editable: R.esEditable(e), ids, onSeleccionar, onGesto: c.gesto }));
};
const director = (c, seleccion = null, rechazadas = new Set(), onRechazar = () => {}) => {
  const e = c.leer().estado; const d = derivar(e);
  return dibujar(h(Director, { produccion: e.vista, seleccion, recomendaciones: d.recomendaciones, lista: d.lista, porRehacer: e.porRehacer, rechazadas, editable: R.esEditable(e), onGesto: c.gesto, onRechazar }));
};

/* ═══ A · VACÍOS ═══════════════════════════════════════════════════════════ */
console.log('\n── A · Vacíos: se dice qué hacer, sin ejemplos inventados ──');
await seccion('A', async () => {
  const vacia = dibujar(h(Lista, { onAbrir: () => {}, onIrAlStudio: () => navegacion.navigate('Studio') }));
  check('A1) la lista vacía dice que no hay producciones y dónde empezar', /Todavía no tienes producciones/.test(vacia.texto) && /Empieza en Weë Studio/.test(vacia.texto));
  boton(vacia, 'Ir a Weë Studio').tocar();
  check('A2) y su botón lleva a Weë Studio, que es donde se escribe', navegacion.llamadas.at(-1)?.[1] === 'Studio');
  check('A3) con las dos pestañas: activas y archivadas', !!boton(vacia, 'Activas') && !!boton(vacia, 'Archivadas') && boton(vacia, 'Activas').elegido === true);
  check('A4) sin ni una producción de muestra', !/Anuncio|Ejemplo|Demo/.test(vacia.texto));
  const { c } = await abrir(D.produccionVacia({ title: 'Nada todavía', aspectRatio: '9:16', id: PID }));
  const sb = storyboard(c);
  check('A5) una producción sin escenas lo dice, y ofrece añadir la primera', /Esta producción aún no tiene escenas/.test(sb.texto) && !!boton(sb, 'Añadir la primera escena'));
  boton(sb, 'Añadir la primera escena').tocar();
  const tras = storyboard(c);
  check('A6) tocarlo añade una escena con su plano, al momento', /Escena 1/.test(tras.texto) && /Plano 1/.test(tras.texto) && c.leer().estado.guardado === 'pendiente');
});

/* ═══ B · UNA PRODUCCIÓN CARGADA ═══════════════════════════════════════════ */
console.log('\n── B · Una producción cargada: escenas, planos y lo que dice cada tarjeta ──');
await seccion('B', async () => {
  const { c } = await abrir();
  const sb = storyboard(c);
  check('B1) las escenas, en orden, con su número, su título y su duración', /Escena 1 Madrugada/.test(sb.texto) && /Escena 2 Mostrador/.test(sb.texto)
    && sb.texto.indexOf('Madrugada') < sb.texto.indexOf('Mostrador') && /7 s/.test(sb.texto) && /2 planos/.test(sb.texto) && /1 plano/.test(sb.texto));
  check('B2) cada plano con su número, su duración y su descripción', /Plano 1 3 s Se enciende la luz del obrador/.test(sb.texto) && /Plano 2 4 s La masa entra al horno/.test(sb.texto));
  check('B3) el tipo de plano con el nombre de la biblioteca de Weë Studio', /Primer plano/.test(sb.texto));
  check('B4) el sujeto: el personaje y la parte', /Sujeto: Ana y Manos/.test(sb.texto));
  check('B5) de qué depende un plano', /Depende de: Escena 1 · Plano 1/.test(sb.texto));
  check('B6) el audio que le toca: su diálogo y sus sonidos', /1 línea de diálogo/.test(sb.texto) && /1 sonido/.test(sb.texto));
  check('B7) lo que le falta a un plano sin descripción, dicho como F1-A', /Le falta: la descripción/.test(sb.texto) && /Sin descripción/.test(sb.texto));
  check('B8) y lo completo, completo', (sb.texto.match(/Completo/g) ?? []).length === 2);
  check('B9) el clima y el momento del día de la escena', /Amanecer/.test(sb.texto) && /Niebla/.test(sb.texto));
  check('B10) la miniatura: no hay vista previa y se dice; ninguna imagen de ejemplo', (sb.texto.match(/Sin vista previa/g) ?? []).length === 3 && !/<img/.test(sb.html));
  const tl = dibujar(h(Timeline, { produccion: c.leer().estado.vista, linea: D.lineaDeTiempo(c.leer().estado.vista), seleccion: null, porRehacer: [], onSeleccionar: () => {} }));
  check('B11) la línea de tiempo: un tramo por plano y el total', tl.botones.length === 3 && /Total: 12 s/.test(tl.texto));
});

/* ═══ C · SELECCIÓN Y DIRECTOR ═════════════════════════════════════════════ */
console.log('\n── C · Seleccionar y dirigir ──');
await seccion('C', async () => {
  const { c } = await abrir();
  let seleccion = null;
  const sb = storyboard(c, null, (s) => { seleccion = s; });
  boton(sb, 'Dirigir Plano 2').tocar();
  check('C1) tocar un plano lo selecciona', seleccion?.tipo === 'plano' && seleccion.id === 'sh-0102');
  const marcado = storyboard(c, seleccion);
  check('C2) y el storyboard lo marca', boton(marcado, 'Dirigir Plano 2').elegido === true && boton(marcado, 'Dirigir Plano 1').elegido === false);
  const dp = director(c, seleccion);
  check('C3) el Director dirige lo elegido: su nombre y su descripción, editable', /Escena 1 · Plano 2/.test(dp.texto)
    && dp.campos.some((f) => f.etiqueta === 'Descripción' && f.valor === 'La masa entra al horno'));
  check('C4) con la cámara, el movimiento y la luz de la biblioteca de Weë Studio', !!boton(dp, 'Primer plano') && !!boton(dp, 'Acercarse') && !!boton(dp, 'Hora dorada'));
  check('C5) el panel entero: intención, dirección creativa, formato, duración, resumen, recomendaciones, advertencias, por rehacer, personajes, audio y acciones',
    ['Director', 'Intención', 'Dirección creativa', 'Formato', 'Duración', 'Resumen', 'Recomendaciones', 'Advertencias', 'Por rehacer', 'Personajes', 'Audio', 'Acciones'].every((x) => dp.texto.includes(x)));
  check('C6) la intención, tal como se escribió', /El día de una panadería, de madrugada al cierre/.test(dp.texto));
  check('C7) la dirección creativa, en palabras', /Hora dorada/.test(dp.texto));
  check('C8) los personajes se ven, no se editan', /Ana: la panadera/.test(dp.texto) && /todavía no se editan aquí/.test(dp.texto));
  boton(dp, 'Acercarse').tocar();
  const e = c.leer().estado;
  check('C9) elegir un movimiento es `change_movement` sobre ESE plano', e.pendientes.at(-1).operaciones[0].op === 'change_movement'
    && e.pendientes.at(-1).operaciones[0].target.shotId === 'sh-0102' && D.valorCreativo(D.buscarPlano(e.vista, 'sh-0102').shot.visual.creative, 'movement.type') === 'push_in');
  const campo = director(c, seleccion).campos.find((f) => f.etiqueta === 'Descripción');
  check('C10) la descripción cabe lo que F1-A deja', campo.maximo === D.LIMITES.texto);
  const escena = director(c, { tipo: 'escena', id: 'sc-0002' });
  boton(escena, 'Lluvia').tocar();
  boton(escena, 'Noche').tocar();
  check('C11) en una escena, el clima y el momento del día son sus operaciones', c.leer().estado.vista.scenes[1].weather === 'rain' && c.leer().estado.vista.scenes[1].timeOfDay === 'night'
    && c.leer().estado.pendientes.slice(-2).map((g) => g.operaciones[0].op).join() === 'change_weather,change_time_of_day');
  check('C12) sin nada elegido, dice cómo elegir', /Toca una escena o un plano para dirigirlo/.test(director(c, null).texto));
});

/* ═══ D · GESTOS ═══════════════════════════════════════════════════════════ */
console.log('\n── D · Gestos: reordenar, alargar, dividir, quitar, formato ──');
await seccion('D', async () => {
  const { c } = await abrir();
  const sb = storyboard(c);
  botonesQue(sb, 'Bajar')[1].tocar();
  let e = c.leer().estado;
  check('D1) «Bajar» un plano lo reordena al momento', e.vista.scenes[0].shots.map((p) => p.id).join() === 'sh-0102,sh-0101' && e.pendientes.at(-1).operaciones[0].op === 'reorder_shot');
  botonesQue(storyboard(c), 'Bajar')[0].tocar();
  e = c.leer().estado;
  check('D2) y «Bajar» una escena, también', e.vista.scenes.map((s) => s.id).join() === 'sc-0002,sc-0001');
  check('D3) lo que ya no puede subir o bajar está apagado', botonesQue(storyboard(c), 'Subir')[0].apagado === true);
  const alargar = botonesQue(storyboard(c), 'Alargar 0,5 s');
  alargar[0].tocar();
  check('D4) «Alargar 0,5 s» suma medio segundo con `extend_duration`', D.buscarPlano(c.leer().estado.vista, 'sh-0201').shot.durationSec === 5.5);
  boton(storyboard(c), 'Dividir en dos').tocar();
  check('D5) «Dividir en dos» parte el plano por la mitad con `split_shot`', c.leer().estado.vista.scenes[0].shots.length === 2
    && c.leer().estado.pendientes.at(-1).operaciones[0].op === 'split_shot' && c.leer().estado.pendientes.at(-1).operaciones[0].atSec === 2.8);
  const antes = c.leer().estado.vista.scenes.flatMap((s) => s.shots).length;
  confirmar = false;
  botonesQue(storyboard(c), 'Quitar el plano')[0].tocar(); await calma();
  check('D6) quitar pregunta antes, y si se dice que no, no se quita', c.leer().estado.vista.scenes.flatMap((s) => s.shots).length === antes);
  confirmar = true;
  const unPlano = c.leer().estado.vista.scenes[1].shots.find((p) => p.id === 'sh-0102') ? 'sh-0102' : null;
  const indice = c.leer().estado.vista.scenes.flatMap((s) => s.shots).findIndex((p) => p.id === 'sh-0102');
  botonesQue(storyboard(c), 'Quitar el plano')[indice].tocar(); await calma();
  check('D7) un plano con sonido: F1-A avisa de lo que se llevaría, se pregunta otra vez y se quita con su sonido',
    !!unPlano && !D.buscarPlano(c.leer().estado.vista, 'sh-0102') && c.leer().estado.vista.audio.cues.length === 0
    && c.leer().estado.pendientes.at(-1).operaciones[0].cascade === true);
  const dp = director(c);
  check('D8) el formato: los seis presets, y el de ahora (4:5, Anuncios) marcado tal cual', boton(dp, 'Anuncios').elegido === true
    && ['TikTok', 'Video de Instagram', 'YouTube Shorts', 'YouTube', 'Anuncios', 'Historias'].every((x) => !!boton(dp, x)) && /4:5/.test(dp.texto));
  check('D9) ni asoma la palabra prohibida para Instagram', !/Reels?/.test(dp.texto));
  boton(dp, 'Historias').tocar();
  check('D10) elegir un preset es `change_format`', c.leer().estado.vista.format.preset === 'stories' && c.leer().estado.vista.format.aspectRatio === '9:16');
  const proporcion = dibujar(h(P('ProductionFormatSelector'), { aspectRatio: '4:5', editable: true, onPreset: () => {}, onProporcion: () => {} }));
  check('D11) y un 4:5 sin preset se enseña como 4:5, nunca convertido', proporcion.botones.filter((b) => b.elegido === true).length === 1 && /4:5/.test(proporcion.texto));
});

/* ═══ E · RECOMENDACIONES ══════════════════════════════════════════════════ */
console.log('\n── E · Recomendaciones: con propuesta, y nunca solas ──');
await seccion('E', async () => {
  const cargada = produccion();
  cargada.duration = { targetSec: 3, strict: true };
  const { c } = await abrir(cargada);
  const rs = D.recomendar(c.leer().estado.vista);
  const dp = director(c);
  check('E1) las recomendaciones de F1-A se ven, con su frase', rs.some((r) => r.code === 'too_many_scenes_for_duration') && /Tienes 2 escenas para 3 s: caben como mucho 1/.test(dp.texto));
  check('E2) con sus alternativas y un «Aceptar» cada una', /Opción 1: Cambiar la duración objetivo a 4 s/.test(dp.texto) && /Opción 2: Juntar escenas hasta que quepan/.test(dp.texto)
    && botonesQue(dp, 'Aceptar').length >= 2);
  check('E3) mostrarlas no cambia nada: nada se aplica solo', c.leer().estado.pendientes.length === 0);
  botonesQue(dp, 'Aceptar')[1].tocar();
  check('E4) «Aceptar» aplica ESA propuesta, entera, como un gesto', c.leer().estado.pendientes.length === 1 && c.leer().estado.pendientes[0].operaciones[0].op === 'merge_scenes'
    && c.leer().estado.vista.scenes.length === 1);
  let rechazada = null;
  const otra = await abrir(cargada);
  const dp2 = director(otra.c, null, new Set(), (k) => { rechazada = k; });
  botonesQue(dp2, 'Rechazar')[0].tocar();
  const sin = director(otra.c, null, new Set([rechazada]));
  check('E5) «Rechazar» la aparta y no toca la producción', !!rechazada && !/Tienes 2 escenas para 3 s/.test(sin.texto) && otra.c.leer().estado.pendientes.length === 0);
});

/* ═══ F · GUARDAR ══════════════════════════════════════════════════════════ */
console.log('\n── F · Guardar: pendiente, guardando, guardado y error ──');
await seccion('F', async () => {
  const { c, r, srv } = await abrir();
  const cabecera = () => {
    const e = c.leer().estado;
    return dibujar(h(Header, { titulo: e.vista.title, estados: PR.estadosDeLaProduccion(e, derivar(e).lista, derivar(e).tarjetas), guardado: e.guardado, fallo: e.fallo,
      hayCambios: R.hayCambiosSinGuardar(e), onGuardarAhora: c.guardarAhora, onReintentar: c.reintentar, onDuplicar: () => {}, onArchivar: () => {}, onDesarchivar: () => {}, onLista: () => {} }));
  };
  check('F1) recién abierta: guardada', /Guardado/.test(cabecera().texto));
  c.gesto([{ op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }]);
  const pendiente = cabecera();
  check('F2) tras un gesto: «Cambios sin guardar» y «Guardar ahora»', /Cambios sin guardar/.test(pendiente.texto) && !!boton(pendiente, 'Guardar ahora'));
  check('F3) con cambios sin guardar no se duplica ni se archiva', boton(pendiente, 'Duplicar').apagado && boton(pendiente, 'Archivar').apagado);
  boton(pendiente, 'Guardar ahora').tocar();
  check('F4) mientras viaja: «Guardando…»', /Guardando…/.test(cabecera().texto));
  await calma();
  check('F5) y cuando el servidor lo tiene: «Guardado», en la revisión 1', /Guardado/.test(cabecera().texto) && srv.vista.revision === 1);
  srv.fallar = { tipo: 'sin_conexion', code: 'network', messageKey: 'filmmaker.persistence.network', problems: [], reintentable: true };
  c.gesto([{ op: 'change_weather', sceneId: 'sc-0002', weather: 'snow' }]);
  r.pasar(); await calma();
  const error = cabecera();
  check('F6) sin red: «No se pudo guardar», por qué, y cómo repetirlo', /No se pudo guardar/.test(error.texto) && /Sin conexión: no se pudo hablar con Weë/.test(error.texto) && !!boton(error, 'Inténtalo de nuevo'));
  check('F7) y lo tuyo sigue ahí', c.leer().estado.vista.scenes[1].weather === 'snow');
  srv.fallar = null;
  boton(error, 'Inténtalo de nuevo').tocar(); await calma();
  check('F8) reintentar lo guarda', /Guardado/.test(cabecera().texto) && srv.vista.production.scenes[1].weather === 'snow');
  check('F9) el estado de la producción: borrador mientras le falte algo, con dependencias pendientes si algo depende de un plano incompleto',
    /Borrador/.test(cabecera().texto) && !/Lista para generar/.test(cabecera().texto) && !/Con dependencias pendientes/.test(cabecera().texto));
  c.gesto([{ op: 'edit_text', target: { shotId: 'sh-0201' }, description: 'Llega el primer cliente' }]);
  check('F10) con todo lo que F1-A pide para darla por lista: «Lista para generar»', /Lista para generar/.test(cabecera().texto) && !/Borrador/.test(cabecera().texto));
  c.gesto([{ op: 'edit_text', target: { shotId: 'sh-0101' }, description: null }]);
  check('F11) y si un plano del que otro depende se queda incompleto: «Con dependencias pendientes»', /Con dependencias pendientes/.test(cabecera().texto) && /Borrador/.test(cabecera().texto));
});

/* ═══ G · CONFLICTO Y ARCHIVADA ════════════════════════════════════════════ */
console.log('\n── G · Conflicto y archivada ──');
await seccion('G', async () => {
  const { c } = await abrir();
  const base = c.leer().estado;
  const conflicto = R.reducirProduccion(R.reducirProduccion(base, { tipo: 'gesto', gesto: { id: 'g1', operaciones: [{ op: 'change_time_of_day', sceneId: 'sc-0002', timeOfDay: 'night' }] } }),
    { tipo: 'reconstruir', produccion: guardada({ ...produccion(), scenes: produccion().scenes.slice(0, 1) }, 3) });
  let vistos = false;
  const av = dibujar(h(Avisos, { estado: conflicto, onVistos: () => { vistos = true; }, onDesarchivar: () => {} }));
  check('G1) conflicto: se dice que otra versión se guardó, y que lo tuyo se aplicó encima', /Otra versión se guardó a la vez/.test(av.texto) && /volvió a aplicar tus cambios encima/.test(av.texto));
  check('G2) lo que ya no cabía, uno por uno y con su porqué', /1 cambio tuyo ya no se podía aplicar/.test(av.texto) && /Lo que querías cambiar ya no existe/.test(av.texto));
  boton(av, 'Entendido').tocar();
  check('G3) «Entendido» lo da por visto', vistos);
  const archivada = R.reducirProduccion(R.ESTADO_INICIAL, { tipo: 'cargada', produccion: guardada(produccion(), 2, { status: 'archived', archivedAt: 9 }) });
  const ava = dibujar(h(Avisos, { estado: archivada, onVistos: () => {}, onDesarchivar: () => {} }));
  check('G4) archivada: se dice, y cómo volver a editarla', /Esta producción está archivada/.test(ava.texto) && !!boton(ava, 'Desarchivar'));
  const sbA = dibujar(h(Storyboard, { produccion: archivada.vista, tarjetas: D.tarjetasDeStoryboard(archivada.vista), seleccion: null, porRehacer: [], editable: R.esEditable(archivada), ids, onSeleccionar: () => {}, onGesto: () => ({ ok: true }) }));
  check('G5) y se lee pero no se edita: sin gestos en el storyboard', !boton(sbA, 'Bajar') && !boton(sbA, 'Añadir escena') && /Madrugada/.test(sbA.texto));
  const hdA = dibujar(h(Header, { titulo: 'x', estados: PR.estadosDeLaProduccion(archivada, undefined, []), guardado: 'guardado', fallo: null, hayCambios: false,
    onGuardarAhora: () => {}, onReintentar: () => {}, onDuplicar: () => {}, onArchivar: () => {}, onDesarchivar: () => {}, onLista: () => {} }));
  check('G6) la cabecera lo dice y ofrece desarchivar', /Archivada/.test(hdA.texto) && !!boton(hdA, 'Desarchivar') && !boton(hdA, 'Archivar'));
});

/* ═══ H · LA PANTALLA ══════════════════════════════════════════════════════ */
console.log('\n── H · La pantalla: cargando, error y cargada ──');
await seccion('H', async () => {
  const Pantalla = cargar('screens/ProductionScreen.tsx').default;
  const conControlador = async (inicial, carga = 'lista') => {
    const { c } = await abrir(inicial);
    const i = c.leer();
    usoDeProduccion = { controlador: c, carga, falloDeCarga: null, estado: i.estado, derivado: derivar(i.estado), duplicar: async () => null };
    return c;
  };
  ruta = { params: { productionId: PID } };
  usoDeProduccion = { controlador: { cargar: async () => {} }, carga: 'cargando', falloDeCarga: null, estado: R.ESTADO_INICIAL, derivado: null, duplicar: async () => null };
  shell.length = 0;
  const cargando = dibujar(h(Pantalla));
  check('H1) cargando: un indicador, y nada inventado', /<progress/.test(cargando.html) && !/Escena/.test(cargando.texto));
  check('H2) dentro de Weë Studio, con «Varias escenas» encima', shell.at(-1)?.overline === 'Varias escenas' && shell.at(-1)?.breadcrumb === 'Weë Studio');
  usoDeProduccion = { ...usoDeProduccion, carga: 'error', falloDeCarga: { tipo: 'no_encontrada', code: 'production_not_found', messageKey: 'filmmaker.persistence.production_not_found', problems: [], reintentable: false } };
  const error = dibujar(h(Pantalla));
  check('H3) error: qué pasó, con la frase de su código, y cómo repetirlo', /No se pudo abrir la producción/.test(error.texto) && /No encontramos esta producción/.test(error.texto) && !!boton(error, 'Inténtalo de nuevo'));
  await conControlador(produccion());
  const lista = dibujar(h(Pantalla));
  check('H4) cargada: el título, el storyboard, la línea de tiempo y el Director, a dos columnas', /El día de una panadería/.test(lista.texto) && /Madrugada/.test(lista.texto)
    && /Línea de tiempo/.test(lista.texto) && /Director/.test(lista.texto) && shell.at(-1)?.title === 'El día de una panadería');
  ruta = { params: {} };
  const inicio = dibujar(h(Pantalla));
  check('H5) sin producción: tus producciones', shell.at(-1)?.title === 'Tus producciones' && /Todavía no tienes producciones/.test(inicio.texto) && !/Nueva producción/.test(inicio.texto));
  ruta = { params: { intencion: 'El día de una panadería', creativo: { 'lighting.type': 'golden_hour' } } };
  recordar(true);
  const nueva = dibujar(h(Pantalla));
  check('H6) desde el Studio: la idea tal cual, dónde se va a ver, y tus producciones debajo', /Nueva producción/.test(nueva.texto) && /El día de una panadería/.test(nueva.texto)
    && /¿Dónde se va a ver\?/.test(nueva.texto) && /O sigue con una de tus producciones/.test(nueva.texto));
  check('H7) la idea no se edita aquí: no hay una segunda caja donde escribir', nueva.campos.length === 0 && /La idea se escribe en Weë Studio/.test(nueva.texto));
  boton(nueva, 'Anuncios').tocar();
  const nueva2 = dibujar(h(Pantalla));
  boton(nueva2, 'Crear producción').tocar(); await calma();
  recordar(false);
  const creada = creadas.at(-1);
  check('H8) «Crear producción» crea con la callable: el borrador en su revisión 0, la idea como intención, el preset y la luz elegida',
    creada && creada.productionId === 'abcdefghijklmnopqrstuvwx' && creada.production.metadata.revision === 0 && creada.production.intent.freeText === 'El día de una panadería'
    && creada.production.format.aspectRatio === '4:5' && creada.production.format.preset === 'ads' && D.valorCreativo(creada.production.creativeDirection.cinematography, 'lighting.type') === 'golden_hour'
    && creada.production.scenes.length === 0);
  check('H9) y abre la producción creada, sustituyendo la ruta', navegacion.llamadas.at(-1)?.[0] === 'replace' && navegacion.llamadas.at(-1)?.[2]?.productionId === 'abcdefghijklmnopqrstuvwx');
});

/* ═══ I · LO QUE NO HAY ════════════════════════════════════════════════════ */
console.log('\n── I · Ni progreso, ni precio, ni generación, ni claves sin texto ──');
await seccion('I', async () => {
  const { c } = await abrir();
  const dp = director(c);
  check('I1) «Generar» se ve como lo que es: todavía no disponible', boton(dp, 'Generar')?.apagado === true && /Todavía no disponible: Weë aún no genera varias escenas en un solo vídeo/.test(dp.texto));
  check('I2) el coste, pendiente de cotización: ni un precio', /Pendiente de cotización/.test(dp.texto) && !/Credits|\d+\s*(€|\$|USD)/.test(dp.texto));
  check('I3) el audio es estructura: lo que hay, y que hacerlo no está disponible', /Efectos 1 sonido/.test(dp.texto) && /Música Nada todavía/.test(dp.texto) && /Todavía no disponible/.test(dp.texto));
  const todo = [dp.html, storyboard(c).html].join('');
  check('I4) ni un porcentaje, ni un «generando», ni una barra de progreso', !/\d\s*%|[Gg]enerando|<progress/.test(todo));
  const fuentes = fs.readdirSync(path.resolve(RAIZ, 'components/studio/produccion')).map((f) => leer(`components/studio/produccion/${f}`)).concat(leer('screens/ProductionScreen.tsx'));
  check('I5) ninguna pieza llama a generar, al motor, a Brain ni a los Credits', fuentes.every((s) => !/generateVideo|creatorRun|brainChat|spendCredits|creditsService|CreditsPill|httpsCallable|firebase\//.test(s)));
  check('I6) ninguna pieza usa temporizadores ni simula progreso', fuentes.every((s) => !/setTimeout|setInterval|progress|progreso/.test(s.replace(/\/\*[\s\S]*?\*\//g, ''))));
  check('I7) en todo lo dibujado no faltó ni una clave', faltan.size === 0, [...faltan].join(', '));
  check('I8) esta suite está en la cadena de `npm test`', /filmmaker-ui\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ Filmmaker F1-C: la pantalla de producción, dibujada de verdad (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
