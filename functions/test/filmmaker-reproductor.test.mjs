/**
 * FILMMAKER ENGINE · FASE 16 (D13) — EL REPRODUCTOR.
 *
 * Uno solo —`components/workspace/ReproductorDeVideo.tsx`, el de siempre— para la
 * toma de un plano, el montaje final y la exportación, en el teléfono y en el
 * escritorio. Lo que gana: su póster mientras no se reproduce, la rueda mientras
 * carga, el error con «Inténtalo de nuevo» si no se pudo cargar, y el «se está
 * haciendo» en el lienzo cuando el vídeo ya se pidió y todavía no existe. Y «Ver
 * vídeo» deja de abrir la dirección del material fuera de Weë.
 *
 *   R · qué se ve en el lienzo, decidido sin pantalla (`vistaDelLienzo`);
 *   P · el reproductor, dibujado: póster, rueda, error, reintento, «se está haciendo»;
 *   V · el visor: el póster del plano elegido, el lienzo mientras se hace, la tira;
 *   L · la línea de tiempo y la rejilla del proyecto, con imágenes fijas;
 *   E · la exportación: el montaje con su póster, o el primer plano con el suyo;
 *   S · «Ver vídeo»: dentro de Weë, en su reproductor, en una hoja;
 *   W · quién le pasa a «Ver vídeo» el vídeo y el formato;
 *   G · las guardas: un solo reproductor, nada del servidor, los once idiomas.
 *
 * Todo en Node, con el código de verdad de la app y dobles de React Native (el
 * cargador de `filmmaker-cliente.mjs`). Sin red, sin servidor, sin Credits.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { crearCargador, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const sinCR = (s) => s.replace(/\r\n/g, '\n');
const git = (args) => sinCR(execSync(`git ${args}`, { cwd: RAIZ, encoding: 'utf8' }));
const codigo = (p) => sinComentarios(sinCR(leer(p)));
/* El tramo de esta fase: desde la Fase 15 hasta su commit (antes del commit, hasta el árbol de trabajo). */
const ANTES = '07996ad';
const HASTA = git('log --format=%H -n 1 --grep "Filmmaker Engine phase 16 "').trim();
const tramo = HASTA ? `${ANTES} ${HASTA}` : ANTES;

const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
const h = React.createElement;

/* ── El estado que sobrevive entre dibujos: cada useState, por su orden ── */
let almacen = null;
let indiceDeEstado = 0;
const useStatePersistente = (inicial) => {
  if (!almacen) return React.useState(inicial);
  const i = indiceDeEstado++;
  if (!(i in almacen)) almacen[i] = typeof inicial === 'function' ? inicial() : inicial;
  return [almacen[i], (v) => { almacen[i] = typeof v === 'function' ? v(almacen[i]) : v; }];
};
const recordar = (si) => { almacen = si ? [] : null; };

/* ── Dobles de React Native: cada botón, cada imagen, cada vídeo y cada rueda, apuntados ── */
let botones = []; let imagenes = []; let videos = []; let ruedas = [];
const fuera = [];
const Caja = ({ children, accessibilityLabel }) => h('div', { 'aria-label': accessibilityLabel }, children);
const Texto = ({ children }) => h('span', null, children);
const Toque = ({ children, onPress, disabled, accessibilityLabel }) => {
  botones.push({ etiqueta: accessibilityLabel, tocar: onPress, apagado: !!disabled });
  return h('button', { 'aria-label': accessibilityLabel, disabled: !!disabled }, children);
};
const reactNative = {
  View: Caja, Text: Texto, TouchableOpacity: Toque, ScrollView: Caja, Modal: Caja, TextInput: () => h('textarea'),
  ActivityIndicator: ({ accessibilityLabel }) => { ruedas.push(accessibilityLabel ?? ''); return h('progress', { 'aria-label': accessibilityLabel }); },
  Image: ({ source, accessibilityLabel }) => { imagenes.push({ src: source?.uri, etiqueta: accessibilityLabel }); return h('img', { src: source?.uri, 'aria-label': accessibilityLabel }); },
  StyleSheet: { create: (s) => s, flatten: (s) => s, hairlineWidth: 1, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'web', select: (o) => o.web ?? o.default },
  Dimensions: { get: () => ({ width: 1280, height: 800 }), addEventListener: () => ({ remove() {} }) },
  Linking: { openURL: async (u) => { fuera.push(u); } },
};
const expoAv = {
  Video: (props) => { videos.push(props); return h('video', { src: props.source?.uri, 'aria-label': props.accessibilityLabel }); },
  ResizeMode: { COVER: 'cover', CONTAIN: 'contain' },
};
const colores = new Proxy({}, { get: () => '#000000' });

/* ── El traductor de verdad, con el español de verdad ── */
const cargarReal = crearCargador({ dobles: { 'react-native': reactNative } });
const { crearTraductor } = cargarReal('i18n/traducir.ts');
const formatoReal = cargarReal('i18n/formato.ts');
const ES = cargarReal('i18n/textos/es/index.ts').es;
const faltan = new Set();
const t = crearTraductor('es', { es: ES }, { alFaltarUnaClave: (k) => faltan.add(k) });
const formato = {
  numero: (v, o) => formatoReal.formatearNumero(v, 'es', o),
  lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo),
  tiempoRelativo: (f, a) => formatoReal.formatearTiempoRelativo(f, 'es', a ?? 10_000_000),
  fecha: (f, o) => formatoReal.formatearFecha(f, 'es', o),
};

/* ── Los dobles de lo que no se prueba aquí ── */
const tema = { useTheme: () => ({ theme: { colors: colores } }), enTemaClaro: (P) => P, useEnStudio: () => false };
const idioma = { useT: () => t, useIdioma: () => ({ t, formato, locale: 'es' }) };
const base = {
  react: { ...React, useState: useStatePersistente },
  'react-native': reactNative,
  '@expo/vector-icons': { Ionicons: ({ name }) => h('i', { 'data-icono': name }) },
  'expo-av': expoAv,
  '@react-navigation/native': { useRoute: () => ({ params: {} }), useNavigation: () => ({ navigate() {}, goBack() {}, canGoBack: () => true }) },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }), SafeAreaView: Caja },
  '../../contexts/ThemeContext': tema, '../../../contexts/ThemeContext': tema,
  '../../contexts/IdiomaContext': idioma, '../../../contexts/IdiomaContext': idioma,
  '../../utils/scale': { scale: (x) => x }, '../../../utils/scale': { scale: (x) => x },
  '../../hooks/useResponsive': { useResponsive: () => ({ isDesktop: true, isMobile: false, isTablet: false }) },
  '../../../utils/notify': { notify: () => {}, confirmAction: async () => true },
  '../../../services/assetDownload': { descargarCreacion: async () => 'guardado' },
};
/* El reproductor de verdad, para R y P. */
const RV = crearCargador({ dobles: base })('components/workspace/ReproductorDeVideo.tsx');
/* Para las pantallas: el reproductor y la hoja, apuntando lo que reciben (la línea de tiempo usa su `reloj` de verdad). */
const reproductores = [];
const hojas = [];
const dobleDelReproductor = {
  __esModule: true,
  default: (p) => { reproductores.push(p); return h('figure', { 'data-url': p.url ?? '' }, p.url ? null : (p.procesando ?? p.sinVideo ?? null)); },
  reloj: RV.reloj, proporcionNumerica: RV.proporcionNumerica, vistaDelLienzo: RV.vistaDelLienzo,
};
const dobleDeLaHoja = {
  __esModule: true,
  default: ({ visible, titulo, onCerrar, children }) => { hojas.push({ visible, titulo, onCerrar }); return visible ? h('section', { 'aria-label': titulo }, children) : null; },
};
const cargar = crearCargador({ dobles: { ...base, '../../workspace/ReproductorDeVideo': dobleDelReproductor, '../../workspace/HojaInferior': dobleDeLaHoja } });

const dibujar = (elemento) => {
  botones = []; imagenes = []; videos = []; ruedas = []; reproductores.length = 0; hojas.length = 0; indiceDeEstado = 0;
  const html = renderToStaticMarkup(elemento);
  return {
    html, botones: botones.slice(), imagenes: imagenes.slice(), videos: videos.slice(), ruedas: ruedas.slice(),
    reproductores: reproductores.slice(), hojas: hojas.slice(),
    texto: html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' '),
  };
};
const boton = (d, etiqueta) => d.botones.find((b) => b.etiqueta === etiqueta);
const botonesQue = (d, etiqueta) => d.botones.filter((b) => b.etiqueta === etiqueta);

/* ── Una producción de verdad (F1-A), la del resto de suites de la app ── */
const D = cargar('services/filmmaker/dominio.ts');
const PID = 'abcdefghijklmnopqrstuvwx';
const clon = (x) => JSON.parse(JSON.stringify(x));
const produccion = () => clon({
  ...D.produccionVacia({ title: 'El día de una panadería', aspectRatio: '9:16', id: PID }),
  ...D.configuracionDePreset('ads'),
  intent: { freeText: 'El día de una panadería, de madrugada al cierre' },
  scenes: [
    { id: 'sc-0001', order: 0, title: 'Madrugada', shots: [
      { id: 'sh-0101', order: 0, durationSec: 3, description: 'Se enciende la luz del obrador', referenceIds: [] },
      { id: 'sh-0102', order: 1, durationSec: 4, description: 'La masa entra al horno' },
    ] },
    { id: 'sc-0002', order: 1, title: 'Mostrador', shots: [{ id: 'sh-0201', order: 0, durationSec: 5 }] },
  ],
});
const prod = produccion();
const VID = (id, poster = null) => ({ assetId: `asset_${id}`, url: `https://cdn.invalid/${id}.mp4`, poster });
const POSTER_A = 'https://cdn.invalid/a~poster.jpg';
const conVideos = () => new Map([['sh-0101', VID('a', POSTER_A)], ['sh-0102', VID('b')]]);
const tomaQuieta = {
  fase: { fase: 'elige_calidad' }, calidad: null, enElPlano: null, ultima: null, aviso: null, calidades: null, economia: null, cancelacion: null,
  elegirCalidad() {}, generar() {}, reintentar() {}, cancelar() {},
};
const montajeQuieto = { fase: 'sin_montaje', montaje: null, url: null, poster: null, motivo: null, limite: null, cabeEnUnWeel: false, publicacion: { fase: 'nada' }, pedir() {}, publicar() {} };
const espacioCon = (extra = {}) => ({
  produccion: prod, tarjetas: [], linea: undefined, lista: D.validarProduccion(prod, { stage: 'ready' }), recomendaciones: [],
  porRehacer: { scenes: [], shots: [], audio: [], removed: [] }, estados: {}, guardado: {}, fallo: null, hayCambios: false, editable: true,
  ids: { escena: () => 'sc_nueva0001', plano: () => 'sh_nuevo0001' }, videos: new Map(), toma: tomaQuieta, montaje: montajeQuieto,
  seleccion: { tipo: 'plano', id: 'sh-0101' }, rechazadas: new Set(),
  onSeleccionar() {}, onGesto: () => ({ ok: true }), onRechazar() {}, onGuardarAhora() {}, onReintentar() {}, onDuplicar() {}, onArchivar() {}, onLista() {}, onExportar() {},
  ...extra,
});

/* ═══ R · QUÉ SE VE EN EL LIENZO ══════════════════════════════════════════ */
console.log('\n── R · Qué se ve en el lienzo, decidido sin pantalla ──');
{
  const V = RV.vistaDelLienzo;
  const quieto = { error: false, cargado: false, reproduciendo: false, posicion: 0, bufferizando: false };
  const r1 = V({ ...quieto, url: null });
  const r1b = V({ ...quieto, url: null, procesando: 'Tu vídeo se está generando.', poster: 'p' });
  check('R1) sin vídeo: lo de quien lo monta —o «se está haciendo» si ya se pidió—; ni póster, ni botón, ni rueda, ni controles',
    r1.capa === 'sin_video' && r1b.capa === 'procesando' && [r1, r1b].every((r) => !r.poster && !r.botonGrande && !r.cargando && !r.controles));
  const r2 = V({ ...quieto, url: 'u', poster: 'p', error: true, cargado: true });
  check('R2) no se pudo cargar: el error, sin póster, sin botón, sin rueda y sin controles', r2.capa === 'error' && !r2.poster && !r2.botonGrande && !r2.cargando && !r2.controles);
  const r3 = V({ ...quieto, url: 'u', poster: 'p' });
  check('R3) cargando: la rueda sobre el póster, sin el botón grande; los controles, sí', r3.capa === 'video' && r3.cargando && r3.poster && !r3.botonGrande && r3.controles);
  const r4 = V({ ...quieto, url: 'u', poster: 'p', cargado: true });
  check('R4) listo y quieto al principio: el póster y el botón grande, sin rueda', r4.poster && r4.botonGrande && !r4.cargando);
  const r5 = V({ ...quieto, url: 'u', poster: 'p', cargado: true, reproduciendo: true, posicion: 0.2 });
  const r5b = V({ ...quieto, url: 'u', poster: 'p', cargado: true, reproduciendo: true, posicion: 1, bufferizando: true });
  check('R5) reproduciéndose: ni póster ni botón; la rueda solo si se para a cargar', !r5.poster && !r5.botonGrande && !r5.cargando && r5b.cargando && !r5b.poster);
  const r6 = V({ ...quieto, url: 'u', poster: 'p', cargado: true, posicion: 2.5 });
  check('R6) en pausa a mitad: el fotograma de ese momento, no el póster; y el botón', !r6.poster && r6.botonGrande);
  const r7 = V({ ...quieto, url: 'u', cargado: true });
  check('R7) sin póster no hay imagen que poner', !r7.poster && r7.botonGrande && r7.capa === 'video');
  check('R8) con vídeo, «se está haciendo» no tapa el que ya hay', V({ ...quieto, url: 'u', procesando: 'x', cargado: true }).capa === 'video');
  check('R9) el reloj no se rompe sin duración —«00:00»— y 65,4 s son «01:05»',
    RV.reloj(NaN) === '00:00' && RV.reloj(Infinity) === '00:00' && RV.reloj(-3) === '00:00' && RV.reloj(65.4) === '01:05');
  const entrada = Object.freeze({ ...quieto, url: 'u', poster: 'p' });
  check('R10) pura: lo mismo da lo mismo, y no toca lo que recibe', JSON.stringify(V(entrada)) === JSON.stringify(V(entrada)));
}

/* ═══ P · EL REPRODUCTOR, DIBUJADO ════════════════════════════════════════ */
console.log('\n── P · El reproductor, dibujado ──');
{
  const Reproductor = RV.default;
  const conPoster = { url: 'https://cdn.invalid/toma.mp4', poster: 'https://cdn.invalid/toma~poster.jpg', formato: '9:16', nombre: 'Vídeo de la toma' };
  recordar(true);
  const p0 = dibujar(h(Reproductor, { ...conPoster, url: null, sinVideo: h('em', null, 'nada todavía') }));
  check('P1) sin vídeo: lo que pasa quien lo monta; ni un vídeo, ni controles', /nada todavía/.test(p0.texto) && p0.videos.length === 0 && !boton(p0, 'Reproducir') && !boton(p0, 'Pantalla completa'));
  recordar(true);
  const p1 = dibujar(h(Reproductor, { ...conPoster, url: null, procesando: 'Tu vídeo se está generando.', sinVideo: h('em', null, 'nada todavía') }));
  check('P2) pedido y sin vídeo todavía: la rueda y la frase, en lugar de lo de siempre', /Tu vídeo se está generando\./.test(p1.texto) && !/nada todavía/.test(p1.texto) && p1.ruedas.length === 1 && p1.videos.length === 0);
  recordar(true);
  const p2 = dibujar(h(Reproductor, conPoster));
  const v2 = p2.videos[0];
  check('P3) con vídeo y póster, mientras carga: su vídeo quieto, su póster y la rueda «Cargando el vídeo…»; el botón grande, no',
    p2.videos.length === 1 && v2.source?.uri === conPoster.url && v2.shouldPlay === false && p2.imagenes.some((i) => i.src === conPoster.poster)
    && p2.ruedas.includes('Cargando el vídeo…') && botonesQue(p2, 'Reproducir').length === 1, `${botonesQue(p2, 'Reproducir').length} · ${p2.ruedas}`);
  v2.onPlaybackStatusUpdate({ isLoaded: true, isPlaying: false, positionMillis: 0, durationMillis: 5000, isBuffering: false });
  const p3 = dibujar(h(Reproductor, conPoster));
  check('P4) cargado y quieto al principio: el póster y el botón grande (dos «Reproducir»: el grande y el de los controles), sin rueda',
    p3.imagenes.some((i) => i.src === conPoster.poster) && botonesQue(p3, 'Reproducir').length === 2 && p3.ruedas.length === 0 && /00:00 \/ 00:05/.test(p3.texto), p3.texto.slice(0, 160));
  p3.videos[0].onPlaybackStatusUpdate({ isLoaded: true, isPlaying: true, positionMillis: 1200, durationMillis: 5000, isBuffering: false });
  const p4 = dibujar(h(Reproductor, conPoster));
  check('P5) reproduciéndose: sin póster ni botón grande, y «Pausar»', p4.imagenes.length === 0 && botonesQue(p4, 'Reproducir').length === 0 && !!boton(p4, 'Pausar') && /00:01/.test(p4.texto));
  p4.videos[0].onPlaybackStatusUpdate({ isLoaded: true, isPlaying: true, positionMillis: 1500, durationMillis: 5000, isBuffering: true });
  const p5 = dibujar(h(Reproductor, conPoster));
  check('P6) se para a cargar: la rueda, sin el póster', p5.ruedas.includes('Cargando el vídeo…') && p5.imagenes.length === 0);
  p5.videos[0].onError('fallo de red');
  const p6 = dibujar(h(Reproductor, conPoster));
  check('P7) no se pudo cargar: se dice, con «Inténtalo de nuevo»; ni vídeo, ni póster, ni controles',
    /No se pudo cargar el vídeo\. Comprueba tu conexión e inténtalo de nuevo\./.test(p6.texto) && !!boton(p6, 'Inténtalo de nuevo')
    && p6.videos.length === 0 && p6.imagenes.length === 0 && !boton(p6, 'Reproducir') && !boton(p6, 'Pantalla completa'));
  const antes = [...almacen];
  boton(p6, 'Inténtalo de nuevo').tocar();
  const cambiadas = almacen.map((v, i) => [antes[i], v]).filter(([a, d]) => a !== d);
  const p7 = dibujar(h(Reproductor, conPoster));
  check('P8) «Inténtalo de nuevo»: el vídeo otra vez, desde el principio y cargando, con su póster',
    p7.videos.length === 1 && p7.videos[0].source?.uri === conPoster.url && p7.ruedas.includes('Cargando el vídeo…')
    && p7.imagenes.some((i) => i.src === conPoster.poster) && !/No se pudo cargar/.test(p7.texto));
  const RVC = codigo('components/workspace/ReproductorDeVideo.tsx');
  check('P9) y es OTRO montaje del vídeo: el intento sube (0 → 1) y es la clave del <Video>, así que se vuelve a pedir de verdad',
    cambiadas.some(([a, d]) => a === 0 && d === 1) && /<Video\s+key=\{intento\}/.test(RVC) && /onError=\{alFallar\}/.test(RVC));
  recordar(true);
  const q0 = dibujar(h(Reproductor, conPoster));
  q0.videos[0].onPlaybackStatusUpdate({ isLoaded: false, error: 'no se encuentra' });
  const q1 = dibujar(h(Reproductor, conPoster));
  check('P10) un estado «sin cargar» que trae error también se dice como error', /No se pudo cargar el vídeo/.test(q1.texto) && q1.videos.length === 0);
  check('P11) otro vídeo empieza de cero: el efecto que limpia el estado y el error depende de la dirección',
    /useEffect\(\(\) => \{\s*setEstado\(QUIETO\);\s*setError\(false\);\s*\}, \[url\]\);/.test(RVC));
  recordar(true);
  const sinPoster = dibujar(h(Reproductor, { ...conPoster, poster: null }));
  check('P12) sin póster, ninguna imagen: solo el vídeo', sinPoster.imagenes.length === 0 && sinPoster.videos.length === 1);
  recordar(false);
}

/* ═══ V · EL VISOR ════════════════════════════════════════════════════════ */
console.log('\n── V · El visor: el póster, el lienzo mientras se hace, la tira ──');
{
  const Visor = cargar('components/studio/produccion/ProductionViewer.tsx').default;
  const verVisor = (extra) => dibujar(h(Visor, { espacio: espacioCon(extra), onIrAlDirector() {} }));
  const v1 = verVisor({ videos: conVideos() });
  const lienzo = v1.reproductores[0];
  check('V1) el lienzo: el vídeo del plano elegido, SU póster y el formato de la producción; nada «haciéndose»',
    lienzo?.url === 'https://cdn.invalid/a.mp4' && lienzo.poster === POSTER_A && lienzo.formato === prod.format.aspectRatio && !lienzo.procesando, JSON.stringify(lienzo && { url: lienzo.url, poster: lienzo.poster, formato: lienzo.formato }));
  /*
   * Reanclada por nombre en la Fase 22 del motor (auditoría final del 2026-09-28, arreglo R10): sin póster, la tira ya
   * no monta el vídeo para enseñar un fotograma —la tira, la línea de tiempo y la rejilla lo cargaban a la vez—, sino
   * el aviso quieto de que el plano ya tiene vídeo. El único que carga el vídeo es el lienzo.
   */
  check('V2) la tira: con póster, su imagen fija; sin póster, el aviso de que ya tiene vídeo, sin cargarlo; sin vídeo, el icono',
    v1.imagenes.some((i) => i.src === POSTER_A) && v1.videos.length === 0 && /aria-label="Vídeo listo de /.test(v1.html),
    `${v1.imagenes.length} imágenes · ${v1.videos.length} vídeos`);
  const enProceso = { ...tomaQuieta, fase: { fase: 'en_proceso', toma: 1 } };
  const v3 = verVisor({ toma: enProceso });
  check('V3) sin vídeo y con su toma haciéndose: el lienzo lo dice —«Tu vídeo se está generando.»— y el aviso de debajo no lo repite',
    v3.reproductores[0]?.procesando === 'Tu vídeo se está generando.' && (v3.texto.match(/Tu vídeo se está generando\./g) || []).length === 1, v3.reproductores[0]?.procesando);
  const v4 = verVisor({ toma: { ...tomaQuieta, fase: { fase: 'pidiendo' } } });
  const v4b = verVisor({ toma: { ...tomaQuieta, fase: { fase: 'terminando', toma: 1 } } });
  check('V4) mientras se envía, «Preparando tu vídeo…»; mientras se pone en su plano, todavía «se está generando»',
    v4.reproductores[0]?.procesando === 'Preparando tu vídeo…' && v4b.reproductores[0]?.procesando === 'Tu vídeo se está generando.');
  const v5 = verVisor({ videos: conVideos(), toma: enProceso });
  check('V5) con vídeo y una toma nueva haciéndose: el lienzo enseña el que hay, y el aviso de debajo dice que se genera',
    v5.reproductores[0]?.url === 'https://cdn.invalid/a.mp4' && !v5.reproductores[0]?.procesando && /Tu vídeo se está generando\./.test(v5.texto));
  const v6 = verVisor({});
  const v6b = verVisor({ toma: { ...tomaQuieta, fase: { fase: 'cerrando', toma: 1 } } });
  check('V6) sin toma en marcha, o devolviéndose: el lienzo, lo de siempre («Este plano aún no tiene vídeo»); nada «haciéndose»',
    !v6.reproductores[0]?.procesando && /Este plano aún no tiene vídeo/.test(v6.texto) && !v6b.reproductores[0]?.procesando && /Estamos terminando de devolver tus Credits/.test(v6b.texto));
  const v7 = verVisor({ toma: enProceso, seleccion: null });
  check('V7) sin nada elegido, nada «haciéndose» en el lienzo', !v7.reproductores[0]?.procesando);
}

/* ═══ L · LA LÍNEA DE TIEMPO Y LA REJILLA DEL PROYECTO ════════════════════ */
console.log('\n── L · La línea de tiempo y la rejilla del proyecto, con imágenes fijas ──');
{
  const Linea = cargar('components/studio/produccion/ProductionTimeline.tsx').default;
  const M = cargar('utils/montajeDeProduccion.ts');
  const montaje = M.montajeDe(prod, undefined, { clima: (w) => w, momento: (m) => m });
  const l1 = dibujar(h(Linea, { espacio: espacioCon({ videos: conVideos() }), montaje, pestana: 'linea', onPestana() {}, cabezal: 0, onCabezal() {} }));
  /* L1 y L3, reancladas por nombre en la Fase 22 del motor (R10): sin póster, el aviso; nunca el vídeo. */
  check('L1) la línea de tiempo: con póster, su imagen fija; sin póster, el aviso de que ya tiene vídeo, sin cargarlo',
    l1.imagenes.some((i) => i.src === POSTER_A) && l1.videos.length === 0 && /aria-label="Vídeo listo de /.test(l1.html),
    `${l1.imagenes.length} imágenes · ${l1.videos.length} vídeos`);
  const l2 = dibujar(h(Linea, { espacio: espacioCon({ videos: new Map() }), montaje, pestana: 'linea', onPestana() {}, cabezal: 0, onCabezal() {} }));
  check('L2) sin vídeos, ni imágenes ni vídeos en las pistas', l2.imagenes.length === 0 && l2.videos.length === 0);
  const Proyecto = cargar('components/studio/produccion/ProductionProjectPanel.tsx').default;
  const g1 = dibujar(h(Proyecto, { espacio: espacioCon({ videos: conVideos() }), onEstructura() {} }));
  check('L3) la rejilla del proyecto: con póster, su imagen fija; sin póster, el aviso de que ya tiene vídeo, sin cargarlo',
    g1.imagenes.some((i) => i.src === POSTER_A) && g1.videos.length === 0 && /aria-label="Vídeo listo de /.test(g1.html),
    `${g1.imagenes.length} imágenes · ${g1.videos.length} vídeos`);
}

/* ═══ E · LA EXPORTACIÓN ══════════════════════════════════════════════════ */
console.log('\n── E · La exportación: el montaje con su póster, o el primer plano con el suyo ──');
{
  const Exportar = cargar('components/studio/produccion/ProductionExportPanel.tsx').default;
  const hecho = {
    ...montajeQuieto, fase: 'hecho', montaje: { state: 'completed', durationSec: 12, assetId: 'asset_m', huella: 'h'.repeat(32), revision: 0 },
    url: 'https://cdn.invalid/m.mp4', poster: 'https://cdn.invalid/m~poster.jpg', cabeEnUnWeel: true,
  };
  const e1 = dibujar(h(Exportar, { espacio: espacioCon({ videos: conVideos(), montaje: hecho }), onCerrar() {} }));
  check('E1) el montaje hecho: el reproductor de la exportación lleva el montaje y SU póster',
    e1.reproductores[0]?.url === 'https://cdn.invalid/m.mp4' && e1.reproductores[0]?.poster === 'https://cdn.invalid/m~poster.jpg' && e1.reproductores[0]?.nombre === 'Montaje final');
  const e2 = dibujar(h(Exportar, { espacio: espacioCon({ videos: conVideos() }), onCerrar() {} }));
  check('E2) sin montaje: el primer plano con vídeo, con el póster de ESE plano', e2.reproductores[0]?.url === 'https://cdn.invalid/a.mp4' && e2.reproductores[0]?.poster === POSTER_A);
  const e3 = dibujar(h(Exportar, { espacio: espacioCon({ videos: new Map([['sh-0102', VID('b')]]) }), onCerrar() {} }));
  check('E3) un plano sin póster: el reproductor sin póster, nunca el de otro', e3.reproductores[0]?.url === 'https://cdn.invalid/b.mp4' && e3.reproductores[0]?.poster === null);
  const e4 = dibujar(h(Exportar, { espacio: espacioCon({ videos: conVideos(), montaje: { ...hecho, poster: null } }), onCerrar() {} }));
  check('E4) un montaje hecho todavía sin póster: el montaje, sin imagen (no la de un plano)', e4.reproductores[0]?.url === 'https://cdn.invalid/m.mp4' && e4.reproductores[0]?.poster === null);
}

/* ═══ S · «VER VÍDEO» ═════════════════════════════════════════════════════ */
console.log('\n── S · «Ver vídeo»: dentro de Weë, en su reproductor, en una hoja ──');
{
  const Toma = cargar('components/studio/produccion/ProductionShotGeneration.tsx').default;
  const lista = { ...tomaQuieta, ultima: { toma: 1, estado: 'lista', assetId: 'asset_a', url: 'https://cdn.invalid/a.mp4' }, enElPlano: { assetId: 'asset_a', url: 'https://cdn.invalid/a.mp4' } };
  const props = { toma: lista, tipo: 'plano', video: VID('a', POSTER_A), formato: '9:16' };
  recordar(true);
  const s0 = dibujar(h(Toma, props));
  check('S1) lista: «Toma 1 lista.» y «Ver vídeo»; la hoja todavía no existe', /Toma 1 lista\./.test(s0.texto) && !!boton(s0, 'Ver vídeo') && s0.hojas.length === 0 && s0.reproductores.length === 0);
  boton(s0, 'Ver vídeo').tocar();
  const s1 = dibujar(h(Toma, props));
  const hoja = s1.hojas[0];
  const enLaHoja = s1.reproductores[0];
  check('S2) tocarlo abre el vídeo DENTRO de Weë: una hoja con su reproductor, su dirección, su póster y el formato de la producción; nada sale fuera',
    !!hoja?.visible && hoja.titulo === 'Vídeo de este plano' && enLaHoja?.url === 'https://cdn.invalid/a.mp4' && enLaHoja.poster === POSTER_A
    && enLaHoja.formato === '9:16' && enLaHoja.nombre === 'Vídeo de este plano' && fuera.length === 0, JSON.stringify(enLaHoja && { url: enLaHoja.url, poster: enLaHoja.poster, formato: enLaHoja.formato }));
  hoja.onCerrar();
  const s2 = dibujar(h(Toma, props));
  check('S3) cerrarla la quita y deja todo como estaba', s2.hojas.length === 0 && s2.reproductores.length === 0 && !!boton(s2, 'Ver vídeo') && /Toma 1 lista\./.test(s2.texto));
  recordar(true);
  const otro = { ...props, video: VID('otro', 'https://cdn.invalid/otro~poster.jpg') };
  boton(dibujar(h(Toma, otro)), 'Ver vídeo').tocar();
  const s3 = dibujar(h(Toma, otro));
  check('S4) el póster de OTRO material —una toma anterior— no se enseña como si fuera este', s3.reproductores[0]?.url === 'https://cdn.invalid/a.mp4' && s3.reproductores[0]?.poster === null);
  recordar(true);
  const s4 = dibujar(h(Toma, { ...props, toma: { ...lista, enElPlano: { assetId: 'asset_a', url: null } } }));
  check('S5) sin dirección todavía, no hay «Ver vídeo»', !boton(s4, 'Ver vídeo') && /Ya tiene su vídeo\.|Toma 1 lista\./.test(s4.texto));
  recordar(true);
  const escena = { toma: lista, tipo: 'escena' };
  boton(dibujar(h(Toma, escena)), 'Ver vídeo').tocar();
  const s5 = dibujar(h(Toma, escena));
  check('S6) sin el vídeo del storyboard ni formato: se ve igual, sin póster y en la proporción por defecto; la hoja se llama como la sección',
    s5.hojas[0]?.titulo === 'Vídeo de esta escena' && s5.reproductores[0]?.url === 'https://cdn.invalid/a.mp4' && s5.reproductores[0]?.poster === null && s5.reproductores[0]?.formato === undefined);
  recordar(true);
  const enProceso = { ...lista, fase: { fase: 'en_proceso', toma: 2 } };
  boton(dibujar(h(Toma, { ...props, toma: enProceso })), 'Ver vídeo').tocar();
  const s6 = dibujar(h(Toma, { ...props, toma: enProceso }));
  check('S7) con otra toma haciéndose, el vídeo que ya está en el plano se sigue pudiendo ver', s6.reproductores[0]?.url === 'https://cdn.invalid/a.mp4' && !!boton(s6, 'Detener la toma'));
  recordar(false);
  check('S8) «Ver vídeo» ya no abre la dirección fuera de la app: ni Linking en la toma', !/\bLinking\b/.test(codigo('components/studio/produccion/ProductionShotGeneration.tsx')));
}

/* ═══ W · QUIÉN LE PASA A «VER VÍDEO» EL VÍDEO Y EL FORMATO ═══════════════ */
console.log('\n── W · Las puertas de la toma le pasan el vídeo y el formato ──');
{
  const TABS = codigo('components/studio/produccion/ProductionDirectorTabs.tsx');
  const HERR = codigo('components/studio/produccion/ProductionTools.tsx');
  const MOV = codigo('components/studio/produccion/ProductionMobileEditor.tsx');
  check('W1) en el escritorio (Director y Herramientas · IA): el vídeo de la unidad elegida y el formato de la producción',
    /<ProductionShotGeneration[^>]*video=\{espacio\.videos\.get\(elegido\.unitId\) \?\? null\}[^>]*formato=\{produccion\.format\.aspectRatio\}/.test(TABS)
    && /<ProductionShotGeneration[^>]*video=\{elegido \? espacio\.videos\.get\(elegido\.unitId\) \?\? null : null\}[^>]*formato=\{produccion\.format\.aspectRatio\}/.test(HERR));
  check('W2) en el teléfono, el panel Director recibe el vídeo de la unidad elegida', /<ProductionDirectorPanel[^>]*video=\{elegido \? espacio\.videos\.get\(elegido\.unitId\) \?\? null : null\}/.test(MOV));
  const Director = cargar('components/studio/produccion/ProductionDirectorPanel.tsx').default;
  const lista = { ...tomaQuieta, ultima: { toma: 1, estado: 'lista', assetId: 'asset_a', url: 'https://cdn.invalid/a.mp4' }, enElPlano: { assetId: 'asset_a', url: 'https://cdn.invalid/a.mp4' } };
  const propsDir = {
    produccion: prod, seleccion: { tipo: 'plano', id: 'sh-0101' }, recomendaciones: [], lista: D.validarProduccion(prod, { stage: 'ready' }),
    porRehacer: { scenes: [], shots: [], audio: [], removed: [] }, rechazadas: new Set(), editable: true, onGesto() {}, onRechazar() {}, toma: lista, video: VID('a', POSTER_A),
  };
  recordar(true);
  boton(dibujar(h(Director, propsDir)), 'Ver vídeo').tocar();
  const d1 = dibujar(h(Director, propsDir));
  check('W3) y lo pasa a la toma: la hoja lleva el póster y la proporción de la producción', d1.reproductores[0]?.poster === POSTER_A && d1.reproductores[0]?.formato === prod.format.aspectRatio && prod.format.aspectRatio === '4:5');
  recordar(false);
}

/* ═══ G · LAS GUARDAS ═════════════════════════════════════════════════════ */
console.log('\n── G · Un solo reproductor, nada del servidor, los once idiomas ──');
{
  const CARPETAS = 'components screens hooks utils services navigation';
  const lista = (s, quitar = '') => s.trim().split('\n').filter(Boolean).map((l) => l.replace(quitar, '')).sort();
  const expoAntes = lista(git(`grep -l "from 'expo-av'" ${ANTES} -- ${CARPETAS}`), `${ANTES}:`);
  const expoAhora = lista(git(`grep -l --untracked "from 'expo-av'" -- ${CARPETAS}`));
  /*
   * Reanclada por nombre en la Fase 22 del motor (R10): nadie EMPIEZA a usar el vídeo de expo-av, y los únicos que
   * dejaron de usarlo son las cuatro miniaturas de la producción, que ya no cargan el vídeo para enseñar un fotograma.
   */
  const dejaron = expoAntes.filter((f) => !expoAhora.includes(f));
  check('G1) un solo reproductor: nadie más usa el vídeo de expo-av que antes de esta fase, y las miniaturas ya no',
    expoAhora.every((f) => expoAntes.includes(f)) && expoAhora.includes('components/workspace/ReproductorDeVideo.tsx')
    && JSON.stringify(dejaron) === JSON.stringify(['components/studio/produccion/ProductionProjectPanel.tsx', 'components/studio/produccion/ProductionShotCard.tsx',
      'components/studio/produccion/ProductionTimeline.tsx', 'components/studio/produccion/ProductionViewer.tsx']),
    `${expoAhora.join(' · ')} — dejaron: ${dejaron.join(' · ')}`);
  const nuevos = git(`diff --name-only --diff-filter=A ${tramo} -- components screens hooks`).trim();
  check('G2) ni un componente nuevo: el reproductor de siempre, reutilizado', nuevos === '', nuevos);
  const delServidor = git(`diff --name-only ${tramo} -- functions/src firestore.rules storage.rules firestore.indexes.json`).trim();
  check('G3) nada del servidor: ni una Function, ni reglas, ni índices, ni Credits', delServidor === '', delServidor);
  const tocados = lista(git(`diff --name-only ${tramo} -- components screens hooks utils services`));
  const llaman = tocados.filter((f) => /httpsCallable|fetch\(|creditsService|spendCredits|firebase\//.test(codigo(f)));
  check('G4) lo tocado de la app no llama al servidor ni toca Credits', tocados.length >= 8 && llaman.length === 0, `${tocados.length} archivos${llaman.length ? ` · ${llaman.join(', ')}` : ''}`);
  const IDIOMAS = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ko', 'ru', 'zh', 'zh-TW'];
  const sinClave = IDIOMAS.filter((l) => !/\n {2}videoLoading: '[^'\n]+',\n {2}videoError: '[^'\n]+',\n/.test(sinCR(leer(`i18n/textos/${l}/workspace.ts`))));
  check('G5) las dos frases del reproductor, en los once idiomas', sinClave.length === 0, sinClave.join(', '));
  check('G6) ninguna clave sin texto en todo lo dibujado', faltan.size === 0, [...faltan].join(', '));
  const DOC = sinCR(leer('docs/FILMMAKER.md'));
  check('G7) documentado', /### Fase 16 · /.test(DOC) && /\| D13 \| [^\n]*\*\*decidida\*\* en la Fase 16/.test(DOC));
  check('G8) esta suite está en la cadena de `npm test`', /filmmaker-reproductor\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ Fase 16 · el reproductor (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
