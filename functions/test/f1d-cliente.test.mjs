/**
 * F1-D · LA TOMA DE UN PLANO, EN LA APP.
 *
 * Lo que la app hace con una toma, probado con el código de verdad:
 *
 *   E · Qué unidad se generaría: de lo GUARDADO, con su requisito de F1-A.
 *   C · El controlador: consultar, cotizar, generar, escuchar, enlazar; y lo que
 *       NO hace —ni un segundo pedido, ni un id propio, ni reloj—.
 *   S · Los servicios, con Firebase doblado: qué se manda y qué no.
 *   R · Lo que se ve, dibujado con el español de verdad.
 *   M · Cada motivo del servidor tiene su frase en cada diccionario del registro de idiomas.
 *   G · Nadie más llama, nadie cobra ni compone nada en la app.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { crearCargador, leer, sinComentarios, archivosDeLaApp, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = async (letra, fn) => {
  try { await fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
};
const calma = async () => { for (let i = 0; i < 40; i++) await new Promise((r) => setImmediate(r)); };

const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
const h = React.createElement;

/* ── Dobles de React Native: cada botón, con su etiqueta ── */
let botones = [];
const abiertos = [];
const Caja = ({ children, accessibilityLabel, accessibilityRole }) => h('div', { 'aria-label': accessibilityLabel, role: accessibilityRole }, children);
const Texto = ({ children, accessibilityRole }) => h('span', { role: accessibilityRole }, children);
const Toque = ({ children, onPress, disabled, accessibilityLabel, accessibilityState }) => {
  botones.push({ etiqueta: accessibilityLabel, tocar: onPress, apagado: !!disabled, elegido: accessibilityState?.selected });
  return h('button', { 'aria-label': accessibilityLabel, disabled: !!disabled, 'aria-selected': accessibilityState?.selected }, children);
};
const reactNative = {
  View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, ActivityIndicator: ({ accessibilityLabel }) => h('progress', { 'aria-label': accessibilityLabel }),
  TextInput: () => h('textarea'), StyleSheet: { create: (s) => s, flatten: (s) => s }, Platform: { OS: 'web', select: (o) => o.web ?? o.default },
  Dimensions: { get: () => ({ width: 1280, height: 800 }), addEventListener: () => ({ remove() {} }) },
  Linking: { openURL: async (u) => { abiertos.push(u); } },
};
const colores = new Proxy({}, { get: () => '#000000' });

/* ── El traductor de verdad, con el español de verdad ── */
const cargarReal = crearCargador({ dobles: { 'react-native': reactNative } });
const { crearTraductor } = cargarReal('i18n/traducir.ts');
const formatoReal = cargarReal('i18n/formato.ts');
const ES = cargarReal('i18n/textos/es/index.ts').es;
const faltan = new Set();
const t = crearTraductor('es', { es: ES }, { alFaltarUnaClave: (clave) => faltan.add(clave) });
const formato = { numero: (v, o) => formatoReal.formatearNumero(v, 'es', o), lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo) };

/* ── Firebase, doblado: se apunta todo lo que se pide ── */
const llamadas = [];
const escuchas = [];
let respuestaCallable = async () => ({ data: {} });
const firebaseFunctions = {
  httpsCallable: (_fns, nombre, opciones) => async (datos) => { llamadas.push({ nombre, datos, opciones }); return respuestaCallable(nombre, datos); },
};
const firebaseFirestore = {
  doc: (_db, ...partes) => ({ path: partes.join('/') }),
  onSnapshot: (ref, siguiente, fallo) => { const e = { path: ref.path, siguiente, fallo, viva: true }; escuchas.push(e); return () => { e.viva = false; }; },
  getDoc: async (ref) => ({ exists: () => ref.path === `assets/asset_${'a'.repeat(32)}`, data: () => ({ status: 'ready', delivery: { url: 'https://cdn.invalid/a.mp4' } }) }),
  collection: () => ({}), query: () => ({}), where: () => ({}), orderBy: () => ({}), limit: () => ({}), startAfter: () => ({}), getDocs: async () => ({ docs: [] }),
  Timestamp: { now: () => 0 },
};

const dobles = {
  react: React,
  'react-native': reactNative,
  '@expo/vector-icons': { Ionicons: ({ name }) => h('i', { 'data-icono': name }) },
  '@react-navigation/native': { useRoute: () => ({ params: {} }), useNavigation: () => ({}) },
  'firebase/functions': firebaseFunctions,
  'firebase/firestore': firebaseFirestore,
  '../config/firebase': { db: {}, functions: {} },
  './creditsService': { newRequestId: () => 'id-del-cliente-que-no-debe-viajar' },
  '../../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
  '../../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
  '../../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
  '../../contexts/IdiomaContext': { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) },
  /* Los rótulos en mayúsculas: la caja la decide TextoEnMayusculas (lo prueba i18n-turco 34–36c); aquí, el mismo texto, como hacía el estilo. */
  '../../TextoEnMayusculas': ({ children, ...p }) => reactNative.Text({ ...p, children }),
  '../TextoEnMayusculas': ({ children, ...p }) => reactNative.Text({ ...p, children }),
  '../utils/scale': { scale: (x) => x },
  '../../utils/scale': { scale: (x) => x },
  '../../../utils/scale': { scale: (x) => x },
  '../../../utils/notify': { notify: () => {}, confirmAction: async () => true },
};
const cargar = crearCargador({ dobles });
const K = cargar('utils/controladorDeToma.ts');
const D = cargar('services/filmmaker/dominio.ts');
const MSJ = cargar('utils/mensajesDeFilmmaker.ts');
const dibujar = (el) => { botones = []; const html = renderToStaticMarkup(el); return { html, botones: botones.slice(), texto: html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() }; };
const boton = (d, etiqueta) => d.botones.find((b) => b.etiqueta === etiqueta);

/* ── Una producción lista, con el dominio de la app ── */
const PID = 'abcdefghijklmnopqrstuvwx';
const clon = (x) => JSON.parse(JSON.stringify(x));
const produccion = () => clon({
  ...D.produccionVacia({ title: 'El faro', aspectRatio: '16:9', resolution: '1080p', id: PID }),
  intent: { objective: 'Un faro al amanecer' },
  scenes: [
    { id: 'sc-0001', order: 0, title: 'Amanecer', description: 'El sol sale detrás del faro', shots: [
      { id: 'sh-0101', order: 0, durationSec: 5, description: 'Marina sube la escalera del faro' },
      { id: 'sh-0102', order: 1, durationSec: 2.5, description: 'La lámpara se enciende' },
    ] },
    { id: 'sc-0002', order: 1, title: 'Mediodía', description: 'Las gaviotas vuelan sobre el faro', durationSec: 6, shots: [] },
  ],
});
const guardada = (p = produccion(), extra = {}) => ({ productionId: PID, revision: 3, status: 'active', createdAt: 1, updatedAt: 1, production: p, ...extra });

/* ═══ E · QUÉ UNIDAD SE GENERARÍA ════════════════════════════════════════ */
console.log('\n── E · La unidad sale de lo guardado, con su requisito de F1-A ──');
await seccion('E', async () => {
  const g = guardada();
  const req = D.requisitosDeProduccion(g.production);
  check('E0) la producción de prueba está lista para F1-A', req.ok === true);
  check('E1) sin nada elegido: nada', K.entradaDeToma(g, false, null).tipo === 'sin_unidad' && K.entradaDeToma(null, false, { tipo: 'plano', id: 'sh-0101' }).porque === 'nada');
  const conPlanos = K.entradaDeToma(g, false, { tipo: 'escena', id: 'sc-0001' });
  check('E2) una escena con planos no es una unidad: lo son sus planos', conPlanos.tipo === 'sin_unidad' && conPlanos.porque === 'escena_con_planos');
  check('E3) archivada: no se genera', K.entradaDeToma(guardada(produccion(), { status: 'archived' }), false, { tipo: 'plano', id: 'sh-0101' }).porque === 'archivada');
  check('E4) con cambios sin guardar: no se genera', K.entradaDeToma(g, true, { tipo: 'plano', id: 'sh-0101' }).porque === 'sin_guardar');
  const incompleta = produccion(); delete incompleta.scenes[0].shots[0].durationSec;
  check('E5) sin terminar para F1-A: no se genera', K.entradaDeToma(guardada(incompleta), false, { tipo: 'plano', id: 'sh-0101' }).porque === 'sin_terminar');
  const plano = K.entradaDeToma(g, false, { tipo: 'plano', id: 'sh-0101' });
  const suyo = req.requirements.shots.find((s) => s.unitId === 'sh-0101');
  check('E6) un plano: su producción, su escena, su revisión GUARDADA y su requisito de F1-A tal cual',
    plano.tipo === 'unidad' && plano.unidad.productionId === PID && plano.unidad.sceneId === 'sc-0001' && plano.unidad.unitId === 'sh-0101'
    && plano.unidad.revision === 3 && JSON.stringify(plano.unidad.requirement) === JSON.stringify(suyo));
  const escena = K.entradaDeToma(g, false, { tipo: 'escena', id: 'sc-0002' });
  check('E7) una escena sin planos es su propia unidad', escena.tipo === 'unidad' && escena.unidad.unitId === 'sc-0002' && escena.unidad.sceneId === 'sc-0002');
  check('E8) lo que la distingue: la producción, la revisión y la unidad',
    K.claveDeEntrada(plano) !== K.claveDeEntrada(K.entradaDeToma(guardada(produccion(), { revision: 4 }), false, { tipo: 'plano', id: 'sh-0101' }))
    && K.claveDeEntrada(plano) === K.claveDeEntrada(K.entradaDeToma(guardada(), false, { tipo: 'plano', id: 'sh-0101' })));
  check('E9) no hay calidad por defecto: la elige la persona', K.INSTANTANEA_INICIAL.calidad === null && JSON.stringify(K.CALIDADES_DE_TOMA) === JSON.stringify(['standard', 'high', 'max']));
});

/* ═══ C · EL CONTROLADOR ═════════════════════════════════════════════════ */
const UNIDAD = { productionId: PID, sceneId: 'sc-0001', unitId: 'sh-0101', revision: 3, requirement: { id: 'x' } };
const RID = (k) => `fm.${'7'.repeat(32)}.${k}`;
const tomas = (current = null, next = { take: 1, requestId: RID(1) }, node = null) => ({ current, next, node });
const EFECTIVA = { requestedDurationSec: 5, durationSec: 5, aspectRatio: '16:9', resolution: '1080p', quality: 'high', withSound: true };
const falso = () => {
  const f = {
    llamadas: [], escuchas: new Map(), urls: new Map([[`asset_${'b'.repeat(32)}`, 'https://cdn.invalid/b.mp4']]),
    cotizar: async (u, c) => { f.llamadas.push(['cotizar', u.unitId, c ?? null]); return f.alCotizar(u, c); },
    generar: async (u, c, toma, creditos) => { f.llamadas.push(['generar', u.unitId, c, toma, creditos]); return f.alGenerar(u, c, toma, creditos); },
    enlazar: async (u, toma) => { f.llamadas.push(['enlazar', u.unitId, toma]); return f.alEnlazar(u, toma); },
    observarReserva: (rid, alCambiar, alFallar) => {
      f.llamadas.push(['escuchar', rid]);
      const e = { alCambiar, alFallar, viva: true };
      f.escuchas.set(rid, e);
      return () => { e.viva = false; f.llamadas.push(['callar', rid]); };
    },
    urlDelMaterial: async (id) => f.urls.get(id) ?? null,
    emitir: (rid, estado) => { const e = f.escuchas.get(rid); if (e?.viva) e.alCambiar(estado); },
    romper: (rid) => { const e = f.escuchas.get(rid); if (e?.viva) e.alFallar(); },
    alCotizar: async (_u, c) => (c
      ? { ok: true, valor: { status: 'QUOTED', allowed: true, credits: 740, effective: { ...EFECTIVA, quality: c }, takes: tomas() } }
      : { ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'quality_required', takes: tomas() } }),
    alGenerar: async (_u, _c, toma) => ({ ok: true, valor: { status: 'ACCEPTED', requestId: RID(toma), take: toma } }),
    alEnlazar: async () => ({ ok: true, valor: { status: 'linked', shotNodeId: 'fm_x', assetId: `asset_${'b'.repeat(32)}`, version: 2 } }),
  };
  return f;
};
const que = (f, tipo) => f.llamadas.filter((l) => l[0] === tipo);

console.log('\n── C · El controlador: consultar, cotizar, generar, escuchar y enlazar ──');
await seccion('C', async () => {
  const f = falso();
  const c = K.crearControladorDeToma(f);
  c.abrir({ tipo: 'unidad', unidad: UNIDAD });
  check('C1) abrir una unidad consulta: una cotización SIN calidad', c.leer().fase.fase === 'consultando' && JSON.stringify(que(f, 'cotizar')) === JSON.stringify([['cotizar', 'sh-0101', null]]));
  await calma();
  check('C2) y queda esperando a que la persona elija la calidad', c.leer().fase.fase === 'elige_calidad' && c.leer().calidad === null);
  c.generar(); await calma();
  check('C3) sin cotización no se genera nada', que(f, 'generar').length === 0);
  c.elegirCalidad('high'); await calma();
  check('C4) elegir la calidad es pedir precio: cotizada, con lo que de verdad se genera', c.leer().fase.fase === 'cotizada' && c.leer().fase.creditos === 740 && c.leer().fase.toma === 1 && c.leer().calidad === 'high');
  c.generar(); c.generar(); c.generar();
  check('C5) tres clics seguidos: UNA petición, por el precio enseñado, de la toma que dijo el servidor', JSON.stringify(que(f, 'generar')) === JSON.stringify([['generar', 'sh-0101', 'high', 1, 740]]));
  await calma();
  check('C6) ACCEPTED: en proceso, escuchando la reserva con el requestId que devolvió el SERVIDOR', c.leer().fase.fase === 'en_proceso' && JSON.stringify(que(f, 'escuchar')) === JSON.stringify([['escuchar', RID(1)]]));
  f.emitir(RID(1), 'AUTHORIZED'); await calma();
  check('C7) AUTHORIZED sigue siendo «en proceso»: ni porcentaje ni reloj', c.leer().fase.fase === 'en_proceso');
  c.elegirCalidad('max'); c.generar(); await calma();
  check('C8) mientras está en proceso no se cotiza ni se genera otra', que(f, 'cotizar').length === 2 && que(f, 'generar').length === 1);
  f.emitir(RID(1), 'COMPLETED'); await calma();
  const i = c.leer();
  check('C9) COMPLETED: el servidor la pone en su plano, deja de escuchar y se enseña el vídeo',
    JSON.stringify(que(f, 'enlazar')) === JSON.stringify([['enlazar', 'sh-0101', 1]]) && que(f, 'callar').length === 1
    && i.fase.fase === 'elige_calidad' && i.calidad === null && i.ultima?.estado === 'lista' && i.ultima.toma === 1 && i.enElPlano?.url === 'https://cdn.invalid/b.mp4');
  f.emitir(RID(1), 'REFUNDED'); await calma();
  check('C10) y lo que llegue después ya no cambia nada', c.leer().ultima?.estado === 'lista');

  /* Falla: se devuelve y se dice. */
  const f2 = falso(); const c2 = K.crearControladorDeToma(f2);
  c2.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma(); c2.elegirCalidad('standard'); await calma(); c2.generar(); await calma();
  f2.emitir(RID(1), 'REFUNDED'); await calma();
  check('C11) REFUNDED: la toma falló y se devolvió; no se enlaza nada', c2.leer().ultima?.estado === 'fallida' && que(f2, 'enlazar').length === 0 && c2.leer().fase.fase === 'elige_calidad');

  /* El plano cambió mientras se hacía. */
  const f3 = falso(); f3.alEnlazar = async () => ({ ok: true, valor: { status: 'stale', motivo: 'production_changed' } });
  const c3 = K.crearControladorDeToma(f3);
  c3.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma(); c3.elegirCalidad('high'); await calma(); c3.generar(); await calma();
  f3.emitir(RID(1), 'COMPLETED'); await calma();
  check('C12) stale: no se pone en el plano, y se dice por qué', c3.leer().ultima?.estado === 'sin_enlazar' && c3.leer().ultima.motivo === 'production_changed' && !c3.leer().enElPlano);

  /* El precio cambió entre la cotización y el clic. */
  const f4 = falso(); let veces = 0;
  f4.alCotizar = async (_u, c) => (c
    ? { ok: true, valor: { status: 'QUOTED', allowed: true, credits: veces++ ? 800 : 740, effective: EFECTIVA, takes: tomas() } }
    : { ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'quality_required', takes: tomas() } });
  f4.alGenerar = async () => ({ ok: false, rechazo: { motivo: 'price_changed', detalle: { credits: 800 } } });
  const c4 = K.crearControladorDeToma(f4);
  c4.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma(); c4.elegirCalidad('high'); await calma(); c4.generar(); await calma();
  check('C13) price_changed: se vuelve a cotizar con la misma calidad, se avisa y NO se genera otra vez',
    c4.leer().fase.fase === 'cotizada' && c4.leer().fase.creditos === 800 && c4.leer().aviso === 'precio_cambiado' && que(f4, 'generar').length === 1);

  /* Otra pestaña ya la pidió. */
  const f5 = falso(); let consulta = 0;
  f5.alCotizar = async (_u, c) => {
    if (c) return { ok: true, valor: { status: 'QUOTED', allowed: true, credits: 740, effective: EFECTIVA, takes: tomas() } };
    return consulta++ === 0
      ? { ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'quality_required', takes: tomas() } }
      : { ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'take_in_flight', takes: tomas({ take: 1, requestId: RID(1), status: 'AUTHORIZED' }, null) } };
  };
  f5.alGenerar = async () => ({ ok: false, rechazo: { motivo: 'DUPLICATE_REQUEST' } });
  const c5 = K.crearControladorDeToma(f5);
  c5.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma(); c5.elegirCalidad('high'); await calma(); c5.generar(); await calma();
  check('C14) duplicado: se consulta y se sigue LA toma que ya existe, sin pedir otra', c5.leer().fase.fase === 'en_proceso' && JSON.stringify(que(f5, 'escuchar')) === JSON.stringify([['escuchar', RID(1)]]) && que(f5, 'generar').length === 1);

  /* Al volver a la pantalla. */
  const f6 = falso();
  f6.alCotizar = async () => ({ ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'take_in_flight', takes: tomas({ take: 2, requestId: RID(2), status: 'AUTHORIZED' }, null, { shotNodeId: 'fm_x', producedAssetId: `asset_${'b'.repeat(32)}`, version: 2 }) } });
  const c6 = K.crearControladorDeToma(f6);
  c6.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma();
  check('C15) al volver: la toma 2 sigue en proceso, y el plano enseña el vídeo que ya tiene', c6.leer().fase.fase === 'en_proceso' && c6.leer().fase.toma === 2
    && JSON.stringify(que(f6, 'escuchar')) === JSON.stringify([['escuchar', RID(2)]]) && c6.leer().enElPlano?.url === 'https://cdn.invalid/b.mp4');
  const f7 = falso();
  f7.alCotizar = async () => ({ ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'quality_required', takes: tomas({ take: 1, requestId: RID(1), status: 'COMPLETED' }, { take: 2, requestId: RID(2) }) } });
  f7.alEnlazar = async () => ({ ok: true, valor: { status: 'already', shotNodeId: 'fm_x', assetId: `asset_${'b'.repeat(32)}`, version: 2 } });
  const c7 = K.crearControladorDeToma(f7);
  c7.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma();
  check('C16) una toma terminada: el servidor dice si está en su plano (ya estaba) y se ofrece la siguiente', c7.leer().ultima?.estado === 'lista' && c7.leer().fase.fase === 'elige_calidad' && que(f7, 'enlazar').length === 1);

  /* Un motivo que no depende de la calidad. */
  const f8 = falso();
  f8.alCotizar = async () => ({ ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'aspect_ratio_not_supported', detail: { aspectRatio: '4:5', suggestions: ['9:16', '1:1'] }, takes: tomas() } });
  const c8 = K.crearControladorDeToma(f8);
  c8.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma();
  check('C17) un rechazo se enseña con su motivo y su detalle, sin generar', c8.leer().fase.fase === 'rechazada' && c8.leer().fase.rechazo.motivo === 'aspect_ratio_not_supported'
    && c8.leer().fase.rechazo.detalle.aspectRatio === '4:5' && que(f8, 'generar').length === 0);

  /* Sin red: reintentar vuelve a MIRAR, nunca a generar. */
  const f9 = falso(); let caida = true;
  f9.alCotizar = async (_u, c) => (caida ? { ok: false, rechazo: { motivo: 'network' } } : falso().alCotizar(_u, c));
  const c9 = K.crearControladorDeToma(f9);
  c9.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma();
  check('C18) sin red: error, con su motivo', c9.leer().fase.fase === 'error' && c9.leer().fase.rechazo.motivo === 'network');
  caida = false; c9.reintentar(); await calma();
  check('C19) reintentar vuelve a consultar, no a generar', c9.leer().fase.fase === 'elige_calidad' && que(f9, 'generar').length === 0 && que(f9, 'cotizar').length === 2);

  /* Lo que llega tarde no pisa lo de ahora. */
  const f10 = falso(); let soltar;
  f10.alCotizar = (u, c) => (u.unitId === 'sh-0101' && !c ? new Promise((r) => { soltar = () => r({ ok: true, valor: { status: 'QUOTED', allowed: false, reason: 'take_in_flight', takes: tomas({ take: 1, requestId: RID(1), status: 'AUTHORIZED' }, null) } }); }) : falso().alCotizar(u, c));
  const c10 = K.crearControladorDeToma(f10);
  c10.abrir({ tipo: 'unidad', unidad: UNIDAD });
  c10.abrir({ tipo: 'unidad', unidad: { ...UNIDAD, unitId: 'sh-0102' } }); await calma();
  soltar(); await calma();
  check('C20) cambiar de plano con una respuesta en camino: la del plano anterior se ignora', c10.leer().fase.fase === 'elige_calidad' && que(f10, 'escuchar').length === 0);
  const f11 = falso(); const pendientes = [];
  f11.alCotizar = (u, c) => (c ? new Promise((r) => pendientes.push(() => r({ ok: true, valor: { status: 'QUOTED', allowed: true, credits: c === 'max' ? 900 : 740, effective: { ...EFECTIVA, quality: c }, takes: tomas() } }))) : falso().alCotizar(u, c));
  const c11 = K.crearControladorDeToma(f11);
  c11.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma();
  c11.elegirCalidad('high'); c11.elegirCalidad('max');
  pendientes[1](); await calma(); pendientes[0](); await calma();
  check('C21) dos calidades seguidas: gana la última, aunque su precio llegue antes', c11.leer().calidad === 'max' && c11.leer().fase.creditos === 900);

  /* Salir de la pantalla. */
  const f12 = falso(); const c12 = K.crearControladorDeToma(f12);
  c12.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma(); c12.elegirCalidad('high'); await calma(); c12.generar(); await calma();
  c12.cerrar();
  f12.emitir(RID(1), 'COMPLETED'); await calma();
  check('C22) cerrar deja de escuchar: lo que pase después no se atiende aquí', que(f12, 'callar').length === 1 && que(f12, 'enlazar').length === 0);
  const f13 = falso(); const c13 = K.crearControladorDeToma(f13);
  c13.abrir({ tipo: 'unidad', unidad: UNIDAD }); await calma(); c13.elegirCalidad('high'); await calma(); c13.generar(); await calma();
  f13.romper(RID(1)); await calma();
  check('C23) si la escucha se rompe: error de red, y reintentar vuelve a mirar', c13.leer().fase.fase === 'error' && c13.leer().fase.rechazo.motivo === 'network');
  const c14 = K.crearControladorDeToma(falso());
  c14.abrir({ tipo: 'no_disponible', porque: 'sin_guardar' });
  check('C24) sin unidad que generar, no se pide nada', c14.leer().fase.fase === 'no_disponible' && c14.leer().fase.porque === 'sin_guardar');
  const fuente = sinComentarios(leer('utils/controladorDeToma.ts'));
  check('C25) el controlador no tiene reloj, ni azar, ni ids propios, ni texto para el proveedor',
    !/setTimeout|setInterval|Date\.now|Math\.random|newRequestId|prompt|`fm\.|'fm\./.test(fuente));
});

/* ═══ S · LOS SERVICIOS ══════════════════════════════════════════════════ */
console.log('\n── S · Qué se manda: el plano, la calidad y el precio visto; nunca un id ──');
await seccion('S', async () => {
  const { videoService } = cargar('services/videoService.ts');
  const { tomaService } = cargar('services/tomaService.ts');
  respuestaCallable = async (nombre, datos) => ({ data: nombre === 'shots' ? { result: { status: 'linked', assetId: 'x' } } : datos.cotizar ? { status: 'QUOTED', allowed: true } : { status: 'ACCEPTED', requestId: RID(1), take: 1 } });
  llamadas.length = 0;
  const q = await videoService.quoteTake({ ...UNIDAD, quality: 'high' });
  const g = await videoService.generateTake({ ...UNIDAD, quality: 'high', take: 1 }, 740);
  const [lq, lg] = llamadas;
  check('S1) cotizar: la callable del vídeo con el plano y `cotizar`, sin requestId', q.ok && lq.nombre === 'generateVideo' && lq.datos.cotizar === true && lq.datos.plano.unitId === 'sh-0101'
    && !JSON.stringify(lq.datos).includes('requestId'), JSON.stringify(lq.datos).slice(0, 120));
  check('S2) generar: el plano, la toma y el precio que se enseñó, sin requestId', g.ok && g.valor.requestId === RID(1) && lg.datos.creditosCotizados === 740 && lg.datos.plano.take === 1
    && !JSON.stringify(lg.datos).includes('requestId') && !JSON.stringify(lg.datos).includes('id-del-cliente'));
  check('S3) y ni el texto ni el proveedor: lo que manda la app es el plano', !('prompt' in lg.datos) && !('prompt' in lg.datos.plano) && !/seedance|model/i.test(JSON.stringify(lg.datos)));
  respuestaCallable = async () => { throw Object.assign(new Error('x'), { code: 'functions/invalid-argument', details: { code: 'INVALID_REQUEST', reason: 'price_changed', credits: 800 } }); };
  const mal = await videoService.generateTake({ ...UNIDAD, quality: 'high', take: 1 }, 740);
  respuestaCallable = async () => { throw Object.assign(new Error('x'), { code: 'functions/unavailable' }); };
  const red = await videoService.quoteTake(UNIDAD);
  respuestaCallable = async () => { throw Object.assign(new Error('x'), { code: 'functions/already-exists', details: { code: 'DUPLICATE_REQUEST' } }); };
  const dup = await videoService.generateTake({ ...UNIDAD, quality: 'high', take: 1 }, 740);
  check('S4) los fallos vuelven como motivo: el `reason` del servidor, su código, o la red',
    !mal.ok && mal.rechazo.motivo === 'price_changed' && mal.rechazo.detalle.credits === 800 && !red.ok && red.rechazo.motivo === 'network' && !dup.ok && dup.rechazo.motivo === 'DUPLICATE_REQUEST');
  respuestaCallable = async (nombre) => ({ data: nombre === 'shots' ? { result: { status: 'linked', shotNodeId: 'fm_x', assetId: 'asset_x', version: 2 } } : {} });
  llamadas.length = 0;
  const e = await tomaService.enlazar({ productionId: PID, sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 });
  check('S5) enlazar: `shots`, `shot.result`, qué toma de qué plano — nada de cuentas ni de materiales',
    e.ok && e.valor.status === 'linked' && llamadas[0].nombre === 'shots' && JSON.stringify(llamadas[0].datos) === JSON.stringify({ op: 'shot.result', productionId: PID, sceneId: 'sc-0001', unitId: 'sh-0101', take: 1 }));
  const vistos = [];
  let roto = false;
  const soltar = tomaService.observarReserva(RID(1), (s) => vistos.push(s), () => { roto = true; });
  const escucha = escuchas.at(-1);
  escucha.siguiente({ exists: () => true, data: () => ({ status: 'AUTHORIZED' }) });
  escucha.siguiente({ exists: () => true, data: () => ({ status: 'COMPLETED' }) });
  escucha.siguiente({ exists: () => true, data: () => ({ status: 'INVENTADO' }) });
  escucha.fallo(new Error('permiso'));
  soltar();
  check('S6) escuchar: la reserva de ESA operación, su estado tal cual, y dejar de escuchar',
    escucha.path === `creditTransactions/usage_${RID(1)}` && JSON.stringify(vistos) === JSON.stringify(['AUTHORIZED', 'COMPLETED', null]) && roto && escucha.viva === false);
  const url = await tomaService.urlDelMaterial(`asset_${'a'.repeat(32)}`);
  const nada = await tomaService.urlDelMaterial(`asset_${'c'.repeat(32)}`);
  check('S7) la dirección del vídeo, con la regla de Mis creaciones; si no hay material, ninguna', url === 'https://cdn.invalid/a.mp4' && nada === null);
});

/* ═══ R · LO QUE SE VE ═══════════════════════════════════════════════════ */
console.log('\n── R · Lo que se ve, con el español de verdad ──');
await seccion('R', async () => {
  const Toma = cargar('components/studio/produccion/ProductionShotGeneration.tsx').default;
  const acciones = { elegidas: [], generadas: 0, reintentos: 0 };
  const toma = (i) => ({ fase: { fase: 'sin_unidad', porque: 'nada' }, calidad: null, enElPlano: null, ultima: null, aviso: null,
    elegirCalidad: (c) => acciones.elegidas.push(c), generar: () => { acciones.generadas++; }, reintentar: () => { acciones.reintentos++; }, ...i });
  const ver = (i, tipo = 'plano') => dibujar(h(Toma, { toma: toma(i), tipo }));
  check('R1) sin unidad: no se pinta nada', ver({}).html === '');
  check('R2) una escena con planos: que se elija un plano', /Esta escena tiene planos: elige uno para generar su vídeo\./.test(ver({ fase: { fase: 'sin_unidad', porque: 'escena_con_planos' } }, 'escena').texto));
  check('R3) con cambios sin guardar, archivada o sin terminar: por qué no', /Guarda tus cambios para generar/.test(ver({ fase: { fase: 'no_disponible', porque: 'sin_guardar' } }).texto)
    && /desarchívala para generar/.test(ver({ fase: { fase: 'no_disponible', porque: 'archivada' } }).texto) && /Completa lo que le falta/.test(ver({ fase: { fase: 'no_disponible', porque: 'sin_terminar' } }).texto));
  const elegir = ver({ fase: { fase: 'elige_calidad' } });
  check('R4) elegir: las tres calidades, ninguna marcada, y que nada se genera ni se cobra hasta confirmar',
    ['Estándar', 'Alta', 'Máxima'].every((x) => boton(elegir, x)?.elegido === false) && /No se genera ni se cobra nada hasta que lo confirmes/.test(elegir.texto) && !boton(elegir, 'Generar este plano'));
  boton(elegir, 'Máxima').tocar();
  check('R5) tocar una calidad la pide', acciones.elegidas.at(-1) === 'max');
  const cotizada = ver({ fase: { fase: 'cotizada', creditos: 1240, efectiva: EFECTIVA, toma: 1 }, calidad: 'high' });
  check('R6) cotizada: el precio en Credits con el formato del idioma, lo que se generará y el sonido',
    /Coste 1240 Credits|Coste 1\.240 Credits/.test(cotizada.texto) && /Se generará: 5 s · 16:9 · 1080p/.test(cotizada.texto) && /Con sonido/.test(cotizada.texto) && boton(cotizada, 'Alta')?.elegido === true, cotizada.texto.slice(0, 200));
  boton(cotizada, 'Generar este plano').tocar();
  check('R7) «Generar este plano» genera', acciones.generadas === 1 && boton(cotizada, 'Generar este plano')?.apagado === false);
  check('R8) y de una escena, «Generar esta escena»', !!boton(ver({ fase: { fase: 'cotizada', creditos: 10, efectiva: EFECTIVA, toma: 1 }, calidad: 'high' }, 'escena'), 'Generar esta escena'));
  const corta = ver({ fase: { fase: 'cotizada', creditos: 10, efectiva: { ...EFECTIVA, requestedDurationSec: 2.5, durationSec: 4, withSound: false }, toma: 1 }, calidad: 'high' });
  check('R9) lo pedido y lo que se genera, cuando no coinciden', /El plano dura 2,5 s; el vídeo más corto que se puede generar es de 4 s\./.test(corta.texto) && /Sin sonido/.test(corta.texto));
  const largo = ver({ fase: { fase: 'rechazada', rechazo: { motivo: 'duration_too_long', detalle: { requestedSec: 20, maxSec: 15 } } } });
  check('R10) demasiado largo: cuánto, el máximo y qué hacer', /Dura 20 s y lo máximo son 15 s: divídelo en planos más cortos\./.test(largo.texto));
  const formatoMal = ver({ fase: { fase: 'rechazada', rechazo: { motivo: 'aspect_ratio_not_supported', detalle: { aspectRatio: '4:5', suggestions: ['9:16', '1:1'] } } } });
  check('R11) 4:5: no se convierte, y se proponen los que sí', /El formato 4:5 no se puede generar sin convertirlo\. Cambia la producción a 9:16 o 1:1\./.test(formatoMal.texto), formatoMal.texto);
  const calidadMal = ver({ fase: { fase: 'rechazada', rechazo: { motivo: 'quality_not_representable', detalle: { quality: 'max', resolution: '4k', reachable: '1080p' } } }, calidad: 'max' });
  check('R12) una calidad que no llega: hasta dónde llega, sin rebajar nada', /La calidad Máxima llega hasta 1080p y la producción es 4K: elige otra calidad\./.test(calidadMal.texto));
  const proceso = ver({ fase: { fase: 'en_proceso', toma: 1 } });
  check('R13) en proceso: se dice, sin porcentajes, sin «generando», sin barra y sin botones',
    /En proceso\. El vídeo aparecerá aquí y en «Mis creaciones» cuando esté listo/.test(proceso.texto) && !/\d\s*%|[Gg]enerando|<progress/.test(proceso.html) && proceso.botones.length === 0);
  const lista = ver({ fase: { fase: 'elige_calidad' }, ultima: { toma: 1, estado: 'lista', assetId: 'asset_b', url: 'https://cdn.invalid/b.mp4' }, enElPlano: { assetId: 'asset_b', url: 'https://cdn.invalid/b.mp4' } });
  boton(lista, 'Ver vídeo').tocar();
  check('R14) lista: «Toma 1 lista.» y «Ver vídeo» abre SU vídeo', /Toma 1 lista\./.test(lista.texto) && abiertos.at(-1) === 'https://cdn.invalid/b.mp4');
  const otra = ver({ fase: { fase: 'cotizada', creditos: 10, efectiva: EFECTIVA, toma: 2 }, calidad: 'high', enElPlano: { assetId: 'asset_b', url: null } });
  check('R15) con vídeo ya puesto, la siguiente es «otra toma», y se dice que se cobra aparte',
    !!boton(otra, 'Generar otra toma') && /Cada toma nueva se genera y se cobra aparte\./.test(otra.texto) && /Ya tiene su vídeo\./.test(otra.texto) && !boton(otra, 'Ver vídeo'));
  check('R16) fallida y devuelta; y generada sobre un plano que cambió',
    /La toma 2 no se pudo generar\. Te devolvimos sus Credits\./.test(ver({ fase: { fase: 'elige_calidad' }, ultima: { toma: 2, estado: 'fallida' } }).texto)
    && /no se puso aquí: el plano cambió mientras se hacía/.test(ver({ fase: { fase: 'elige_calidad' }, ultima: { toma: 3, estado: 'sin_enlazar', motivo: 'production_changed' } }).texto));
  const error = ver({ fase: { fase: 'error', rechazo: { motivo: 'network' } } });
  boton(error, 'Inténtalo de nuevo').tocar();
  check('R17) sin red: la frase de siempre, y reintentar vuelve a mirar', /Sin conexión: no se pudo hablar con Weë/.test(error.texto) && acciones.reintentos === 1);
  const pidiendo = ver({ fase: { fase: 'pidiendo' }, calidad: 'high' });
  check('R18) mientras se envía: «Enviando…», el botón apagado y las calidades quietas', /Enviando…/.test(pidiendo.texto) && boton(pidiendo, 'Generar este plano')?.apagado === true && boton(pidiendo, 'Alta')?.apagado === true);
  check('R19) si el precio cambió, se avisa', /El precio cambió desde que lo viste/.test(ver({ fase: { fase: 'cotizada', creditos: 800, efectiva: EFECTIVA, toma: 1 }, calidad: 'high', aviso: 'precio_cambiado' }).texto));
  check('R20) ninguna clave sin texto en todo lo dibujado', faltan.size === 0, [...faltan].join(', '));
});

/* ═══ R2 · EN EL PANEL DIRECTOR ══════════════════════════════════════════ */
console.log('\n── R2 · En el panel Director: solo con una unidad elegida ──');
await seccion('R2', async () => {
  const Director = cargar('components/studio/produccion/ProductionDirectorPanel.tsx').default;
  const p = produccion();
  const props = { produccion: p, recomendaciones: [], lista: D.validarProduccion(p, { stage: 'ready' }), porRehacer: { scenes: [], shots: [], audio: [], removed: [] }, rechazadas: new Set(), editable: true, onGesto: () => {}, onRechazar: () => {} };
  const toma = { fase: { fase: 'elige_calidad' }, calidad: null, enElPlano: null, ultima: null, aviso: null, elegirCalidad: () => {}, generar: () => {}, reintentar: () => {} };
  const con = dibujar(h(Director, { ...props, seleccion: { tipo: 'plano', id: 'sh-0101' }, toma }));
  const sin = dibujar(h(Director, { ...props, seleccion: { tipo: 'plano', id: 'sh-0101' } }));
  const nada = dibujar(h(Director, { ...props, seleccion: null, toma }));
  check('R2a) con un plano elegido y su toma: la sección «Vídeo de este plano»', /Vídeo de este plano/.test(con.texto) && !!boton(con, 'Alta'));
  check('R2b) sin toma, o sin nada elegido: no está', !/Vídeo de este plano/.test(sin.texto) && !/Vídeo de este plano/.test(nada.texto));
  check('R2c) y el «Generar» de la producción entera sigue sin estar', boton(con, 'Generar')?.apagado === true && /Todavía no disponible: Weë aún no genera varias escenas en un solo vídeo/.test(con.texto));
});

/* ═══ M · CADA MOTIVO, SU FRASE ══════════════════════════════════════════ */
console.log('\n── M · Cada motivo del servidor tiene su frase en cada diccionario del registro ──');
await seccion('M', async () => {
  const union = (archivo, tipo) => { const s = leer(archivo); const i = s.indexOf(`export type ${tipo}`); return [...s.slice(i, s.indexOf(';', i)).matchAll(/'([a-z_]+)'/g)].map((m) => m[1]); };
  const DEL_PLANO = union('functions/src/creator/plano.ts', 'MotivoDePlano');
  const DE_LA_TOMA = union('functions/src/creator/toma.ts', 'MotivoDeToma');
  const DE_LA_PUERTA = ['route_unavailable', 'price_changed', 'result_not_available'];
  const DE_FUERA = ['idempotency_conflict', 'INSUFFICIENT_CREDITS', 'RATE_LIMITED', 'DUPLICATE_REQUEST', 'UNAUTHORIZED', 'network', 'session_required', 'unknown'];
  const TODOS = [...DEL_PLANO, ...DE_LA_TOMA, ...DE_LA_PUERTA, ...DE_FUERA];
  check('M1) los motivos, contados de su fuente: 11 del plano, 8 de la toma, 3 de la puerta y 8 de fuera', DEL_PLANO.length === 11 && DE_LA_TOMA.length === 8 && TODOS.length === 30, `${DEL_PLANO.length}+${DE_LA_TOMA.length}+${DE_LA_PUERTA.length}+${DE_FUERA.length}`);
  const video = leer('functions/src/creator/video.ts');
  check('M2) y los de la puerta son los que la puerta dice', DE_LA_PUERTA.every((m) => video.includes(`'${m}'`)));
  const tabla = leer('utils/mensajesDeFilmmaker.ts');
  const sinEntrada = TODOS.filter((m) => !new RegExp(`\\n  ${m}: 'filmmaker\\.`).test(tabla));
  check('M3) cada uno tiene su entrada en la tabla, no la frase de reserva', sinEntrada.length === 0, sinEntrada.join(', '));
  /*
   * Los diccionarios salen del REGISTRO (`i18n/idiomas.ts`), no de una lista escrita aquí: antes eran once a mano y el
   * registro ya tenía dieciséis. Uno por idioma ofrecido (`listo`) y uno más por cada variante con diccionario propio;
   * la variante que cubre el código base del idioma (pt-BR, zh-CN) ES ese diccionario. La carpeta de cada uno tiene
   * que existir, y ninguna carpeta de `i18n/textos` queda fuera.
   */
  const { IDIOMAS: REGISTRO } = crearCargador()('i18n/idiomas.ts');
  const IDIOMAS = REGISTRO.filter((i) => i.listo)
    .flatMap((i) => [i.codigo, ...(i.variantes || []).filter((v) => !v.cubre.includes(i.codigo)).map((v) => v.locale)]);
  const carpetas = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  check('M3b) los diccionarios, contados del registro, son exactamente las carpetas de i18n/textos',
    IDIOMAS.length >= 11 && JSON.stringify([...IDIOMAS].sort()) === JSON.stringify([...carpetas].sort()), `registro: ${IDIOMAS.join(',')} · carpetas: ${carpetas.join(',')}`);
  const claves = (l) => new Set([...leer(`i18n/textos/${l}/filmmaker.ts`).matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '/gm)].map((m) => m[1]));
  const sinFrase = IDIOMAS.flatMap((l) => { const c = claves(l); return TODOS.map((m) => MSJ.claveDelMotivoDeToma(m).replace('filmmaker.', '')).filter((k) => !c.has(k)).map((k) => `${l}:${k}`); });
  check(`M4) y esa frase existe en los ${IDIOMAS.length} diccionarios del registro`, sinFrase.length === 0, sinFrase.slice(0, 6).join(', '));
  const nuevas = [...leer('i18n/textos/es/filmmaker.ts').matchAll(/^ {2}(take[A-Za-z]+): '/gm)].map((m) => m[1]);
  check('M5) las claves de la toma son 50, y ninguna pide un plural', nuevas.length === 50 && nuevas.every((k) => !/_(one|other)$/.test(k)), `${nuevas.length}`);
  /* Entre la cifra y la marca, un espacio o el espacio FIJO (U+00A0) que pide la tipografía del idioma (el danés lo
     exige entre cifra y unidad: docs/I18N-DANES.md); lo que se exige igual en todos es «Credits», sin traducir. */
  const precio = IDIOMAS.filter((l) => !/^ {2}takePrice: '\{\{credits\}\}[  ]Credits',$/m.test(leer(`i18n/textos/${l}/filmmaker.ts`)));
  check(`M6) el precio dice «Credits» en los ${IDIOMAS.length}, sin traducir`, precio.length === 0, precio.join(', '));
});

/* ═══ G · NADIE MÁS LLAMA, NADIE COBRA NI COMPONE NADA ═══════════════════ */
console.log('\n── G · La frontera en la app ──');
await seccion('G', async () => {
  const app = archivosDeLaApp().map((r) => ({ r, s: leer(r) }));
  const importan = app.filter((a) => a.r !== 'services/videoService.ts' && /\/videoService['"]/.test(a.s)).map((a) => a.r);
  check('G1) `videoService` tiene UN consumidor: el hook de la toma', JSON.stringify(importan) === JSON.stringify(['hooks/useTomaDePlano.ts']), importan.join(', '));
  const nombran = app.filter((a) => /['"]generateVideo['"]/.test(a.s)).map((a) => a.r);
  check('G2) y la callable del vídeo solo la nombra su servicio', JSON.stringify(nombran) === JSON.stringify(['services/videoService.ts']), nombran.join(', '));
  const PIEZAS = ['components/studio/produccion/ProductionShotGeneration.tsx', 'components/studio/produccion/ProductionDirectorPanel.tsx', 'screens/ProductionScreen.tsx'];
  const malas = PIEZAS.filter((f) => /httpsCallable|firebase\/|setTimeout|setInterval|newRequestId|requestId|Math\.random|Date\.now|priceVideo|usdToCredits|creditCosts|spendCredits|creditsService/.test(sinComentarios(leer(f))));
  check('G3) la pantalla y sus piezas no llaman, no cuentan tiempo, no inventan ids y no ponen precio', malas.length === 0, malas.join(', '));
  const CAPA = ['hooks/useTomaDePlano.ts', 'utils/controladorDeToma.ts', 'services/tomaService.ts'];
  const componen = CAPA.filter((f) => /prompt|newRequestId|Math\.random|Date\.now|setTimeout|setInterval|`fm\.|'fm\./.test(sinComentarios(leer(f))));
  check('G4) ni el hook, ni el controlador, ni el servicio de la toma componen un texto o un id, ni cuentan tiempo', componen.length === 0, componen.join(', '));
  const escriben = app.filter((a) => /(setDoc|updateDoc|addDoc|deleteDoc|writeBatch)\s*\(/.test(a.s) && /['"](creditTransactions|shots|assets|productions)['"]/.test(a.s)).map((a) => a.r);
  check('G5) nadie en la app escribe reservas, planos, materiales ni producciones', escriben.length === 0, escriben.join(', '));
  const cuerpo = sinComentarios(leer('services/videoService.ts'));
  const toma = cuerpo.slice(cuerpo.indexOf('quoteTake:'));
  check('G6) lo que la toma manda no lleva requestId: el de la toma lo calcula el servidor', toma.length > 100 && !/requestId|newRequestId/.test(toma));
  check('G7) el vídeo de Studio sigue como estaba: su requestId, su línea de ACCEPTED',
    /const requestId = input\.requestId \|\| newRequestId\('video'\);/.test(cuerpo) && /return result\.data\.status === 'ACCEPTED' \? \{ \.\.\.result\.data, requestId \} : result\.data;/.test(cuerpo));
  check('G8) esta suite está en la cadena de `npm test`', /f1d-cliente\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ F1-D en la app: la toma de un plano (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
