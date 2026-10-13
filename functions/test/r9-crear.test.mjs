/**
 * R9 · LÍNEA D — EL FLUJO «CREAR», REDISEÑADO SEGÚN LA REFERENCIA DEL DUEÑO.
 *
 * Cuatro pantallas de referencia (`wee-trabajo/ronda-r9/CREAR/referencia.jpg`): la hoja «Crear» con DOS opciones, el
 * compositor «Crear publicación» vacío y con contenido, y «Crear Weël» con sus pestañas «Subir vídeo» / «Mis creaciones».
 *
 * Lo que se vigila, ejecutando el código de verdad (sin red, sin emulador, sin subir nada):
 *   A · la hoja: solo «Subir publicación» y «Subir Weël», cada una a su flujo, sin la rejilla de seis ni el bloque oscuro.
 *   B · el compositor: barra Foto · Vídeo · Archivo · Enlace · Hashtag con los selectores de siempre, la tira de adjuntos
 *       con quitar y «Agregar más», las filas, Publicar negro/apagado y el mismo `postsService.create`.
 *   C · Crear Weël: «Mis creaciones» lee los vídeos de la cuenta (solo lectura), elegir uno no genera, no sube y no cobra,
 *       el estado vacío y el de error, y «Siguiente» solo con un vídeo válido.
 *   D · lo que no debe cambiar: rutas, SIN_BARRA, sin IA ni Credits, las 16 lenguas.
 *
 * Cada regla que se puede invertir lleva su CONTROL.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { crearComprobador } from './_aceptacion.mjs';
import { crearEntorno, h, textoDelHtml, React } from './_pantallas.mjs';
import { crearCargador, leer, RAIZ } from './filmmaker-cliente.mjs';

const { check, titulo, terminar } = crearComprobador();
const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
const { renderToStaticMarkup } = requerir('react-dom/server');

const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const { DICCIONARIOS } = base('i18n/diccionarios.ts');
const ES = base('i18n/textos/es/index.ts').es;
const tEs = crearTraductor('es', DICCIONARIOS, {});
const W = base('utils/crearWeel.ts');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('A · La hoja «Crear»: dos opciones');
/* ════════════════════════════════════════════════════════════════════════════ */
{
  let toques = [];
  const Caja = ({ children, accessibilityLabel }) => h('div', { 'aria-label': accessibilityLabel }, children);
  const cargar = crearCargador({
    dobles: {
      react: React,
      'react-native': {
        Dimensions: { get: () => ({ width: 390, height: 800 }), addEventListener: () => ({ remove() {} }) },
        PixelRatio: { get: () => 1, getFontScale: () => 1, roundToNearestPixel: (x) => x },
        View: Caja, Text: ({ children }) => h('span', null, children),
        TouchableOpacity: ({ children, onPress, accessibilityLabel, accessibilityHint }) => { toques.push({ etiqueta: accessibilityLabel, pista: accessibilityHint, tocar: onPress }); return h('button', null, children); },
        Modal: ({ visible, children }) => (visible ? h('div', { 'data-hoja': 'si' }, children) : null),
        StyleSheet: { create: (s) => s, hairlineWidth: 1, absoluteFillObject: {} },
        Platform: { OS: 'android' },
      },
      '@expo/vector-icons': { Ionicons: ({ name }) => h('i', { 'data-icono': name }) },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }) },
      '../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: new Proxy({}, { get: () => '#000000' }) } }) },
      '../contexts/IdiomaContext': { useT: () => tEs },
    },
  });
  const Hoja = cargar('components/CreateSheet.tsx').default;
  const elegidos = [];
  let creador = 0;
  let cerrada = 0;
  toques = [];
  const html = renderToStaticMarkup(h(Hoja, { visible: true, onClose: () => cerrada++, onSelect: (k) => elegidos.push(k), onOpenCreator: () => creador++ }));
  const texto = textoDelHtml(html);
  const opciones = toques.filter((x) => x.etiqueta === tEs('composer.sheetOptionPost') || x.etiqueta === tEs('composer.sheetOptionWeel'));
  check('A1) título «Crear» y «¿Qué quieres compartir hoy?»', texto.includes('Crear') && texto.includes('¿Qué quieres compartir hoy?'));
  check('A1) SOLO dos opciones: «Subir publicación» y «Subir Weël», con su frase', opciones.length === 2
    && texto.includes('Comparte fotos, vídeos, archivos, textos, enlaces y más') && texto.includes('Comparte un vídeo desde tu dispositivo o tus creaciones'));
  const VIEJAS = ['Publicación', 'Imagen', 'Texto', 'Pregunta', '¿Necesitas una herramienta de IA?'];
  check('A2) CONTROL: la rejilla de seis, sus emojis y el bloque oscuro con robot ya no están',
    !VIEJAS.some((v) => toques.some((x) => x.etiqueta === v) || texto.includes(v)) && !/📝|📹|🖼️|🎥|✍️|❓|🤖/u.test(html) && !/Weë AI ›/.test(texto));
  check('A2) los iconos son de trazo (Ionicons -outline), nada de emojis', /data-icono="create-outline"/.test(html) && /data-icono="play-circle-outline"/.test(html));
  opciones[0].tocar(); opciones[1].tocar();
  check('A3) cada opción dice qué abrir: post → compositor, weel → Crear Weël', JSON.stringify(elegidos) === '["post","weel"]');
  const nota = toques.find((x) => x.etiqueta === tEs('composer.sheetToolsNote'));
  check('A4) la nota discreta «También puedes crear con las herramientas de Weë» lleva a WEË AI y no es una tercera opción',
    !!nota && texto.includes('También puedes crear con las herramientas de Weë') && /information-circle-outline/.test(html));
  nota?.tocar();
  check('A4) y abre la entrada de WEË AI de siempre', creador === 1);
  toques.find((x) => x.etiqueta === tEs('common.close'))?.tocar();
  check('A5) el fondo cierra la hoja', cerrada === 1);
  toques = [];
  check('A5) CONTROL: cerrada no se pinta', renderToStaticMarkup(h(Hoja, { visible: false, onClose() {}, onSelect() {}, onOpenCreator() {} })) === '');

  /* Quien abre la hoja: la barra global, la barra de pestañas y la barra lateral. Weël → CrearWeel, el resto → Create. */
  const global = sinComentarios(leer('navigation/NavegacionGlobal.tsx'));
  const pestanas = sinComentarios(leer('navigation/TabNavigator.tsx'));
  const lateral = sinComentarios(leer('components/Sidebar.tsx'));
  check('A6) la barra global: cierra la hoja y manda weel → CrearWeel, post → Create',
    /const crear = \(kind: CreateKind\) => \{\s*setHoja\(false\);/.test(global) && /irARaiz\('CrearWeel'\)/.test(global) && /irARaiz\('Create', \{ kind \}\)/.test(global));
  check('A6) la barra de pestañas, igual', /setSheetVisible\(false\);[\s\S]{0,200}rootNavigate\('CrearWeel'\)/.test(pestanas) && /rootNavigate\('Create', \{ kind \}\)/.test(pestanas));
  check('A6) la barra lateral (escritorio) también la usa; `weel` lo cambia la ruta a CrearWeel (HaciaCrearWeel)', /<CreateSheet/.test(lateral) && /navigation\.navigate\('Create', \{ kind \}\)/.test(lateral)
    && /StackActions\.replace\('CrearWeel'\)/.test(leer('navigation/MainStackNavigator.tsx')));
  const hoja = sinComentarios(leer('components/CreateSheet.tsx'));
  check('A7) el tipo solo admite las dos', /export type CreateKind = 'post' \| 'weel';/.test(hoja));
  /* Las otras puertas al compositor siguen pasando su `kind` por la ruta: no dependían de la hoja. */
  check('A7) las otras puertas siguen: la Ayuda abre `question`, Weë AI `image`/`video` con su resultado',
    /navigate\('Create', \{ kind: 'question'/.test(leer('screens/HelpScreen.tsx')) && /kind: media \? media\.type : 'post'/.test(leer('screens/CreatorFlowScreen.tsx')));
}

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('B · «Crear publicación»: el compositor multifuncional');
/* ════════════════════════════════════════════════════════════════════════════ */
const guardados = [];
const selector = [];
const alertas = [];
const subidasDeDocumentos = [];
const lecturasDeCreaciones = [];
/*
 * Un PDF «de mentira» para las pruebas: el selector de documentos lo da con su tipo y tamaño, y `leerDocumento`
 * devuelve un blob cuyo `esPdf` dice si su cabecera es `%PDF-` (la comprobación de VERDAD de la cabecera se ejecuta
 * en la sección E, con `storageService` cargado de verdad).
 */
const pdf = (nombre, extra = {}) => ({ uri: `file:///${nombre}`, name: nombre, mimeType: 'application/pdf', size: 120000, ...extra });
const compositor = (params, o = {}) => crearEntorno({
  pantalla: 'screens/CreateScreen.tsx',
  params,
  so: o.so || 'android',
  dobles: (ctx) => {
    const { h: hh, reactNative, capturas } = ctx;
    const valor = () => ({ setValue() {}, interpolate: () => 0 });
    let nDoc = 0;
    return {
      'react-native': {
        ...reactNative,
        Switch: (props) => { capturas[`Switch:${props.accessibilityLabel}`] = props; return hh('input', { type: 'checkbox', 'aria-label': props.accessibilityLabel }); },
        TextInput: (props) => { capturas[`Campo:${props.accessibilityLabel}`] = props; return hh('textarea', { 'aria-label': props.accessibilityLabel, placeholder: props.placeholder, value: props.value ?? '', readOnly: true }); },
        Modal: ({ visible, children }) => (visible ? hh('div', { 'data-hoja': 'si' }, children) : null),
        Animated: { View: ctx.Caja, Value: function Value() { return valor(); }, spring: () => ({ start() {} }), loop: () => ({ start() {}, stop() {} }), sequence: () => ({}), timing: () => ({}) },
        Easing: { inOut: () => 0, ease: 0 },
        Alert: { alert: (...a) => alertas.push(a) },
      },
      '@expo/vector-icons': { Ionicons: ({ name }) => hh('i', { 'data-icono': name }), MaterialCommunityIcons: ({ name }) => hh('i', { 'data-icono': `mci:${name}` }) },
      '../contexts/ThemeContext': { useTheme: () => ({ theme: { dark: false, colors: ctx.colores } }) },
      '../contexts/IdiomaContext': { useT: () => tEs, useIdioma: () => ({ t: tEs, locale: 'es', formato: { numero: (v) => String(v).replace('.', ','), fecha: () => '12 oct' } }) },
      '../contexts/AuthContext': { useAuth: () => ({ user: ctx.usuario }) },
      '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: { uid: o.cara || 'u1', displayName: 'Laura' } }) },
      '../contexts/ScrollContext': { useScroll: () => ({ triggerScrollToTop() {}, triggerRefresh() {} }) },
      '../hooks/useResponsive': { useResponsive: () => ({ contentMaxWidth: 640, isMobile: true }) },
      '../services/firestoreService': { postsService: { create: async (d) => { if (o.crearFalla && o.crearFalla-- > 0) throw new Error('sin red'); guardados.push(d); return 'p1'; } } },
      '../services/storageService': {
        uploadPostImage: async () => { throw new Error('sin subidas de fotos en pruebas'); },
        leerDocumento: async (d) => ({ esPdf: !/falso/.test(d.uri) }),
        comprobarPdf: async (blob) => blob.esPdf,
        uploadPostDocument: async (d, identidad) => {
          subidasDeDocumentos.push({ uri: d.uri, identidad });
          const r = (o.subidasDoc || [])[nDoc++];
          if (r instanceof Error) throw r;
          return { url: `https://firebasestorage.googleapis.com/v0/b/w/o/documents%2Fposts%2F${identidad}%2F${nDoc}.pdf?alt=media&token=t`, bytes: 120000 };
        },
      },
      'expo-document-picker': {
        getDocumentAsync: async (opc) => {
          selector.push(['documentos', opc]);
          if (o.pickerFalla) throw new Error('sin selector');
          return o.documentos ? { canceled: false, assets: o.documentos } : { canceled: true, assets: null };
        },
      },
      '../services/assetsService': {
        assetsService: {
          listar: async (uid, filtro, cursor) => {
            lecturasDeCreaciones.push({ uid, filtro, cursor });
            return { items: o.materiales || [], cursor: null, hayMas: false };
          },
        },
      },
      '../services/cloudinaryService': { uploadVideoToCloudinary: async () => { throw new Error('sin subidas en pruebas'); } },
      '../services/avatarGenerationService': { performAvatarReplacement() {}, uploadImageForSwap() {}, saveFaceSwapResult() {} },
      '../hooks/useTrabajoDeOrigen': { useTrabajoDeOrigen: () => ({ leyendo: false }) },
      '../i18n/servidor': { textoDelServidor: (x) => x },
      '../data/places': { etiquetaDeLugar: ({ place }) => place?.label || '' },
      '../utils/sectionFeed': { MURO_GENERAL: 'general', destinosDisponibles: () => [{ id: 'general', nombre: 'Muro general', clave: 'composer.generalWall' }, { id: 'chef', nombre: 'Weë Chef' }] },
      '../constants/weeExperiences': { getExperienceById: (id) => ({ studio: { name: 'Weë Studio' }, design: { name: 'Weë Design' } })[id] },
      'expo-image': { Image: () => hh('img') },
      'expo-av': { Video: () => hh('video'), ResizeMode: {} },
      'expo-image-picker': {
        UIImagePickerControllerQualityType: { Medium: 1 },
        requestCameraPermissionsAsync: async () => ({ granted: true }),
        requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
        launchCameraAsync: async (opc) => { selector.push(['camara', opc]); return { canceled: true }; },
        launchImageLibraryAsync: async (opc) => { selector.push(['galeria', opc]); return o.elegido ?? { canceled: true }; },
      },
      'firebase/firestore': { Timestamp: { now: () => 'ahora', fromMillis: (ms) => ms } },
      '../components/EspacioDeEscritura': { __esModule: true, default: ({ children }) => hh('div', null, children) },
      '../components/SelectorDeEContacts': { __esModule: true, default: ctx.capturar('SelectorDeEContacts') },
      '../utils/notify': { notify: (a, b) => ctx.avisos.push(`${a}\n${b || ''}`), confirmAction: async () => true },
    };
  },
});
const PUBLICAR = tEs('composer.publish');
const CAMPO = tEs('composer.postTextLabel');
const FOTO_VIDEO = tEs('composer.photoOrVideo');
const ARCHIVO = tEs('composer.toolFile');
const CREACIONES = tEs('creaciones.title');
const BARRA = [FOTO_VIDEO, ARCHIVO, CREACIONES, tEs('composer.poll'), tEs('composer.toolHashtag')];
/* «Foto o vídeo» en el teléfono: el aviso y su «Galería» (el selector de siempre). */
const desdeGaleria = async (e, d) => { e.tocar(FOTO_VIDEO, d || e.dibujar()); await alertas.at(-1)[2][1].onPress(); await e.calma(); };
const publicar = async (e) => { e.tocar(PUBLICAR, e.dibujar()); await e.calma(); return guardados.pop(); };
{
  const e = compositor({});
  let d = e.dibujar();
  check('B1) se abre vacío: «Crear publicación», ✕ y «Publicar» apagado', d.texto.includes('Crear publicación') && d.botones.some((b) => b.etiqueta === tEs('common.back'))
    && d.botones.filter((b) => b.etiqueta === PUBLICAR).length === 1 && d.botones.find((b) => b.etiqueta === PUBLICAR).apagado === true);
  check('B1) el papel dice «¿Qué quieres compartir?»', e.capturas[`Campo:${CAMPO}`]?.placeholder === '¿Qué quieres compartir?');
  const enBarra = d.botones.filter((b) => BARRA.includes(b.etiqueta)).map((b) => b.etiqueta);
  check('B1) la barra de la referencia, en su orden: Foto o vídeo · Archivo · Mis creaciones · Encuesta · Hashtag', enBarra.join(' · ') === BARRA.join(' · '), enBarra.join(' · '));
  check('B1) CONTROL: ni Enlace, ni Cámara/Multimedia/ËContact/Ubicación/Mis proyectos sueltos, ni Foto y Vídeo separados',
    !['Enlace', 'Cámara', 'Multimedia', 'ËContact', 'Ubicación', 'Mis proyectos', 'Foto', 'Vídeo'].some((x) => d.botones.some((b) => b.etiqueta === x)));
  check('B1) iconos de trazo: imagen, documento, carpeta, barras y #', ['image-outline', 'document-text-outline', 'folder-open-outline', 'bar-chart-outline', 'mci:pound'].every((i) => d.html.includes(`data-icono="${i}"`)));
  check('B1) las filas: quién lo ve (Público), ubicación, personas y dónde', d.botones.some((b) => b.etiqueta === '¿Quién puede ver esta publicación?: Público')
    && d.botones.some((b) => b.etiqueta === 'Agregar ubicación') && d.botones.some((b) => b.etiqueta === 'Etiquetar personas') && d.botones.some((b) => b.etiqueta === `Publicar en: ${tEs('composer.generalWall')}`));
  check('B1) publicación directa: sin «Compartir cómo lo hice»', !d.texto.includes(tEs('composer.howShareTitle')));
  check('B1) abrir el compositor no lee las creaciones ni abre ningún selector', lecturasDeCreaciones.length === 0 && selector.length === 0);

  e.capturas[`Campo:${CAMPO}`].onChangeText('Mi café favorito del día. Mira https://wee.zone/cafe');
  d = e.dibujar();
  check('B2) con texto, Publicar se enciende', d.botones.find((b) => b.etiqueta === PUBLICAR).apagado === false);
  e.tocar(tEs('composer.toolHashtag'), d);
  e.dibujar();
  check('B3) Hashtag escribe «#» al final del texto', e.capturas[`Campo:${CAMPO}`].value === 'Mi café favorito del día. Mira https://wee.zone/cafe #');
  e.capturas[`Campo:${CAMPO}`].onChangeText('Mi café favorito del día. Mira https://wee.zone/cafe #cafe');
  const g = await publicar(e);
  check('B4) el enlace va DENTRO del texto (sin botón propio) y los hashtags salen del texto',
    !!g && g.content.includes('https://wee.zone/cafe') && JSON.stringify(g.hashtags) === '["#cafe"]' && ['aiTools', 'aiProcess', 'aiPrompt', 'aiSteps', 'documents'].every((k) => !(k in g)));
}
{
  /* Foto o vídeo: un solo botón, el selector de siempre con fotos Y vídeos. */
  selector.length = 0; alertas.length = 0;
  const e = compositor({});
  e.tocar(FOTO_VIDEO, e.dibujar());
  const aviso = alertas.at(-1);
  check('B5) en el teléfono, «Foto o vídeo» pregunta: Cámara, Galería o Cancelar', !!aviso && aviso[0] === FOTO_VIDEO && aviso[2].map((b) => b.text).join(' · ') === 'Cámara · Galería · Cancelar');
  await aviso[2][1].onPress();
  await e.calma();
  check('B5) «Galería» pide fotos Y vídeos al selector de siempre', JSON.stringify(selector.at(-1)[1].mediaTypes) === '["images","videos"]');
  aviso[2][0].onPress();
  await e.calma();
  check('B5) «Cámara», la cámara de siempre', selector.at(-1)[0] === 'camara');
}
{
  const dos = { canceled: false, assets: [{ uri: 'file:///a.jpg', type: 'image', width: 1200, height: 900 }, { uri: 'file:///b.jpg', type: 'image', width: 900, height: 1200 }] };
  const e = compositor({}, { elegido: dos });
  await desdeGaleria(e);
  let d = e.dibujar();
  check('B6) dos fotos: cada una con su aspa y «Agregar más» al final', d.botones.some((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 1 })) && d.botones.some((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 2 }))
    && d.texto.includes('Agregar más'));
  check('B6) Publicar se enciende con solo fotos (la regla de siempre)', d.botones.find((b) => b.etiqueta === PUBLICAR).apagado === false);
  e.tocar(tEs('composer.removePhotoNumber', { numero: 1 }), d);
  d = e.dibujar();
  check('B6) quitar una deja la otra, y el botón dice cuántas lleva («1/10»)', !d.botones.some((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 2 }))
    && d.botones.some((b) => b.etiqueta === tEs('composer.actionWithBadge', { accion: FOTO_VIDEO, insignia: '1/10' })));
}
{
  /* Las filas abren lo que ya existía. */
  const e = compositor({});
  let d = e.dibujar();
  e.tocar('¿Quién puede ver esta publicación?: Público', d);
  check('B7) quién lo ve: la explicación de siempre (todo es público)', e.avisos.some((a) => a.startsWith('Público') && a.includes(ES.composer.publicExplain)));
  e.tocar('Agregar ubicación', e.dibujar());
  check('B7) ubicación: «Agregar ubicación» de siempre', e.navegacion.some((n) => n[0] === 'navigate' && n[1] === 'AgregarUbicacion'));
  e.tocar('Etiquetar personas', e.dibujar());
  e.dibujar();
  check('B7) personas: la agenda de ËContact (SelectorDeEContacts)', !!e.capturas.SelectorDeEContacts);
  e.tocar(`Publicar en: ${tEs('composer.generalWall')}`, e.dibujar());
  d = e.dibujar();
  check('B7) dónde: los destinos de siempre', d.botones.some((b) => b.etiqueta === 'Weë Chef') && d.texto.includes(ES.composer.publishIn));
  const fuente = leer('screens/CreateScreen.tsx');
  check('B7) la fila de ubicación dice el lugar o la zona', /const valorDeUbicacion = place \? etiquetaDeLugar\(\{ place \}, locale\) \|\| undefined : ubicacion \? t\('composer\.approxZone'\) : undefined;/.test(fuente) && /texto=\{t\('composer\.addLocation'\)\} valor=\{valorDeUbicacion\}/.test(fuente));
}

/* ── Documentos PDF ── */
{
  selector.length = 0;
  const cancelado = compositor({});
  await cancelado.tocar(ARCHIVO, cancelado.dibujar());
  await cancelado.calma();
  let d = cancelado.dibujar();
  check('B8) «Archivo» abre el selector de DOCUMENTOS (PDF, varios), nunca la galería', selector.length === 1 && selector[0][0] === 'documentos' && selector[0][1].type === 'application/pdf' && selector[0][1].multiple === true);
  check('B8) CANCELAR el selector no cambia nada', d.botones.find((b) => b.etiqueta === PUBLICAR).apagado === true && cancelado.avisos.length === 0 && !d.texto.includes('.pdf'));

  const falla = compositor({}, { pickerFalla: true });
  await falla.tocar(ARCHIVO, falla.dibujar());
  await falla.calma();
  check('B8) si el selector no se puede abrir, se dice con su frase', falla.avisos.some((a) => a.includes(ES.composer.documentPickFailed)));

  const e = compositor({}, { documentos: [pdf('informe.pdf'), pdf('fotos.zip', { mimeType: 'application/zip' }), pdf('enorme.pdf', { size: 11 * 1024 * 1024 }), pdf('falso.pdf')] });
  await e.tocar(ARCHIVO, e.dibujar());
  await e.calma();
  d = e.dibujar();
  check('B9) un PDF válido queda adjunto, con su nombre, «PDF · tamaño» y su aspa', d.texto.includes('informe.pdf') && d.texto.includes('PDF · 117 KB') && d.botones.some((b) => b.etiqueta === tEs('composer.removeDocument', { nombre: 'informe.pdf' })));
  check('B9) lo que no es PDF, lo que pasa de 10 MB y lo que solo LLEVA la extensión (cabecera mala) se rechazan', !d.texto.includes('fotos.zip') && !d.texto.includes('enorme.pdf') && !d.texto.includes('falso.pdf'));
  check('B9) y el rechazo se dice con su frase t()', e.avisos.some((a) => a.includes(tEs('composer.documentNotPdf', { nombre: 'fotos.zip' }))));
  check('B9) un documento solo ya es contenido: Publicar se enciende', d.botones.find((b) => b.etiqueta === PUBLICAR).apagado === false);
  check('B9) el botón dice cuántos lleva («1/5»)', d.botones.some((b) => b.etiqueta === tEs('composer.actionWithBadge', { accion: ARCHIVO, insignia: '1/5' })));

  const grande = compositor({}, { documentos: [pdf('enorme.pdf', { size: 11 * 1024 * 1024 })] });
  await grande.tocar(ARCHIVO, grande.dibujar());
  await grande.calma();
  check('B9) CONTROL: el de más de 10 MB dice su motivo', grande.avisos.some((a) => a.includes(tEs('composer.documentTooBig', { nombre: 'enorme.pdf', maximo: 10 }))));
  const falso = compositor({}, { documentos: [pdf('falso.pdf')] });
  await falso.tocar(ARCHIVO, falso.dibujar());
  await falso.calma();
  check('B9) CONTROL: el de cabecera mala también (no se fía de la extensión ni del tipo)', falso.avisos.some((a) => a.includes(tEs('composer.documentNotPdf', { nombre: 'falso.pdf' }))) && !falso.dibujar().texto.includes('falso.pdf'));

  /* Tope de cinco. */
  const seis = compositor({}, { documentos: [1, 2, 3, 4, 5, 6].map((n) => pdf(`d${n}.pdf`)) });
  await seis.tocar(ARCHIVO, seis.dibujar());
  await seis.calma();
  d = seis.dibujar();
  check('B10) hasta 5 PDF por publicación: el sexto no entra y se dice', ['d1', 'd2', 'd3', 'd4', 'd5'].every((n) => d.texto.includes(`${n}.pdf`)) && !d.texto.includes('d6.pdf') && seis.avisos.some((a) => a.includes(tEs('composer.documentsTooMany', { maximo: 5 }))));
  check('B10) con cinco, «Archivo» se apaga', d.botones.find((b) => b.etiqueta === tEs('composer.actionWithBadge', { accion: ARCHIVO, insignia: '5/5' }))?.apagado === true);

  /* Quitar. */
  e.tocar(tEs('composer.removeDocument', { nombre: 'informe.pdf' }), e.dibujar());
  check('B11) el aspa quita el documento', !e.dibujar().texto.includes('informe.pdf'));
}
{
  /* Publicar con texto + encuesta + documento: UNA publicación, con `documents` y la encuesta. Y con la cara Weë. */
  subidasDeDocumentos.length = 0;
  const e = compositor({ kind: 'poll' }, { documentos: [pdf('bases.pdf'), pdf('anexo.pdf')], cara: 'hidi_u1' });
  e.dibujar();
  e.capturas[`Campo:${CAMPO}`].onChangeText('¿Cuál os gusta más?');
  e.capturas[`Campo:${tEs('composer.pollQuestionPlaceholder')}`]?.onChangeText?.('¿A o B?');
  await e.tocar(ARCHIVO, e.dibujar());
  await e.calma();
  e.dibujar();
  e.capturas[`Campo:${tEs('composer.pollOptionPlaceholder', { numero: 1 })}`]?.onChangeText?.('A');
  e.dibujar();
  e.capturas[`Campo:${tEs('composer.pollOptionPlaceholder', { numero: 2 })}`]?.onChangeText?.('B');
  const g = await publicar(e);
  check('B12) texto + encuesta + 2 PDF = UNA publicación (una sola llamada a postsService.create)', !!g && guardados.length === 0 && !!g.poll && Array.isArray(g.documents) && g.documents.length === 2, JSON.stringify(g && Object.keys(g)));
  check('B12) cada documento guarda solo su referencia: url, nombre, tipo y tamaño', !!g && g.documents.every((x) => Object.keys(x).sort().join(',') === 'bytes,nombre,tipo,url' && x.tipo === 'application/pdf') && g.documents[0].nombre === 'bases.pdf');
  check('B12) se suben con la cara que firma (`hidi_u1`), la misma que `post.userId`', subidasDeDocumentos.length === 2 && subidasDeDocumentos.every((s) => s.identidad === 'hidi_u1') && g.userId === 'hidi_u1');
  check('B12) y la encuesta es la de siempre (pregunta y dos opciones)', !!g && g.poll.question === '¿A o B?' && g.poll.options.length === 2);
}
{
  /* REINTENTO: falla el segundo documento; al volver a publicar no se sube otra vez el primero. */
  subidasDeDocumentos.length = 0;
  const e = compositor({}, { documentos: [pdf('uno.pdf'), pdf('dos.pdf')], subidasDoc: [undefined, new Error('sin red')] });
  await e.tocar(ARCHIVO, e.dibujar());
  await e.calma();
  const err = console.error; console.error = () => {};
  const primera = await publicar(e);
  console.error = err;
  check('B13) si una subida falla: se dice, no se publica nada y los documentos siguen en el borrador',
    primera === undefined && e.avisos.some((a) => a.startsWith(ES.composer.documentUploadFailed)) && e.dibujar().texto.includes('dos.pdf'));
  const g = await publicar(e);
  check('B13) REINTENTAR no vuelve a subir lo que ya subió y publica UNA vez', subidasDeDocumentos.map((s) => s.uri).join(',') === 'file:///uno.pdf,file:///dos.pdf,file:///dos.pdf' && !!g && g.documents.length === 2,
    subidasDeDocumentos.map((s) => s.uri).join(','));
}
{
  /* Si lo que falla es GUARDAR el post: reintentar publica con los mismos documentos, sin subirlos otra vez. */
  subidasDeDocumentos.length = 0;
  const e = compositor({}, { documentos: [pdf('acta.pdf')], crearFalla: 1 });
  await e.tocar(ARCHIVO, e.dibujar());
  await e.calma();
  const err = console.error; console.error = () => {};
  const primera = await publicar(e);
  console.error = err;
  check('B13b) si falla guardar la publicación: no hay post, se dice y el PDF sigue en el borrador', primera === undefined && e.avisos.some((a) => a.startsWith(ES.composer.publishFailed)) && e.dibujar().texto.includes('acta.pdf'));
  const g = await publicar(e);
  check('B13b) reintentar publica UNA vez con el mismo PDF ya subido (una sola subida)', subidasDeDocumentos.length === 1 && !!g && g.documents.length === 1 && g.documents[0].nombre === 'acta.pdf');
  const fuente = leer('screens/CreateScreen.tsx');
  check('B13b) los documentos se suben ANTES que los medios y antes de crear la publicación', fuente.indexOf('uploadPostDocument(d,') < fuente.indexOf('uploadVideoToCloudinary(media.uri)') && fuente.indexOf('uploadPostDocument(d,') < fuente.indexOf('postsService.create(postData)'));
  check('B13b) y mientras se publica, «Publicar» no admite un segundo toque', /const canPublish = hasContent && !isTextOverLimit && !isPublishing && isPollValid;/.test(fuente));
}
{
  /* Vídeo + documento: compatibles (no comparten campo). */
  const video = { canceled: false, assets: [{ uri: 'file:///v.mp4', type: 'video', duration: 9000 }] };
  const e = compositor({}, { elegido: video, documentos: [pdf('guion.pdf')] });
  await desdeGaleria(e);
  await e.tocar(ARCHIVO, e.dibujar());
  await e.calma();
  const d = e.dibujar();
  check('B14) un vídeo y un PDF conviven en el borrador', d.botones.some((b) => b.etiqueta === tEs('composer.removeVideo')) && d.texto.includes('guion.pdf'));
}

/* ── «Mis creaciones» en el compositor ── */
const material = (id, kind, extra = {}) => ({
  assetId: id, ownerAccountId: 'u1', kind, status: 'ready',
  delivery: { url: `https://firebasestorage.googleapis.com/v0/b/w/o/${id}?alt=media&token=t`, kind: 'bearer_token' },
  provenance: { createdAt: 1, capability: kind === 'video' ? 'video.generate' : 'image.generate', jobId: 'job_secreto', provider: 'seedance', model: 'modelo-x', generationId: 'gen_1' },
  name: `Creación ${id}`, metadata: { experienceId: 'studio', costeInterno: 42 }, width: 1024, height: 1024, durationSec: kind === 'video' ? 8 : undefined, createdAt: 1760000000000, ...extra,
});
const DE_LA_CUENTA = [
  material('img1', 'image'), material('img2', 'image', { metadata: { experienceId: 'design' } }),
  material('vid1', 'video'),
  material('aud1', 'audio'), material('doc1', 'document'), material('m3d', 'model3d'),
  material('proc', 'image', { status: 'processing' }),
  material('subida', 'image', { provenance: { createdAt: 1 } }),
];
const etiqueta = (id, herramienta = 'Weë Studio') => tEs('weels.creationLabel', { nombre: `Creación ${id}`, herramienta });
{
  lecturasDeCreaciones.length = 0;
  const e = compositor({}, { materiales: DE_LA_CUENTA });
  await e.tocar(CREACIONES, e.dibujar());
  await e.calma();
  let d = e.dibujar();
  check('B15) «Mis creaciones» abre una hoja y LEE el material de la cuenta (una lectura, sin filtro de tipo)', d.html.includes('data-hoja') && lecturasDeCreaciones.length === 1 && lecturasDeCreaciones[0].uid === 'u1' && !lecturasDeCreaciones[0].filtro.kind);
  check('B15) ofrece imágenes y vídeos listos hechos con Weë', [etiqueta('img1'), etiqueta('img2', 'Weë Design'), etiqueta('vid1')].every((x) => d.botones.some((b) => b.etiqueta === x)));
  check('B15) CONTROL: ni audio, ni documentos, ni 3D, ni lo que se procesa, ni lo que subió la persona', ['aud1', 'doc1', 'm3d', 'proc', 'subida'].every((id) => !d.botones.some((b) => b.etiqueta === etiqueta(id))));
  check('B15) «Añadir» apagado hasta marcar algo', d.botones.find((b) => b.etiqueta === tEs('composer.creationsAdd'))?.apagado === true);
  e.tocar(etiqueta('img1'), d);
  e.tocar(etiqueta('img2', 'Weë Design'), e.dibujar());
  e.tocar(tEs('composer.creationsAdd'), e.dibujar());
  d = e.dibujar();
  check('B16) las dos imágenes entran en el borrador y la hoja se cierra', !d.html.includes('data-hoja') && d.botones.some((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 2 })));
  check('B16) con material de Weë, «Compartir cómo lo hice» aparece APAGADO (origen «Mis creaciones»)', d.texto.includes(tEs('composer.howShareTitle')) && e.capturas[`Switch:${tEs('composer.howShareTitle')}`]?.value === false);
  const g = await publicar(e);
  check('B17) publicar NO sube nada: reutiliza la URL de entrega y el assetId (sin regenerar, sin Credits)',
    !!g && JSON.stringify(g.imageUrls) === JSON.stringify([DE_LA_CUENTA[0].delivery.url, DE_LA_CUENTA[1].delivery.url]) && JSON.stringify(g.assetIds) === '["img1","img2"]', JSON.stringify(g && g.imageUrls));
  const json = JSON.stringify(g || {});
  check('B17) y no lleva NADA interno: ni trabajo, ni proveedor, ni modelo, ni coste, ni generación, ni capacidad',
    !/job_secreto|seedance|modelo-x|costeInterno|gen_1|image\.generate|video\.generate|provenance|metadata/.test(json));
  check('B17) apagado, «Cómo lo hice» no publica nada', !('aiTools' in g) && !('aiProcess' in g));
}
{
  /* Reglas de combinación con creaciones: vídeo solo, y nunca vídeo con encuesta. */
  const e = compositor({}, { materiales: DE_LA_CUENTA });
  await e.tocar(CREACIONES, e.dibujar());
  await e.calma();
  e.tocar(etiqueta('img1'), e.dibujar());
  e.tocar(tEs('composer.creationsAdd'), e.dibujar());
  await e.tocar(CREACIONES, e.dibujar());
  await e.calma();
  e.tocar(etiqueta('vid1'), e.dibujar());
  e.tocar(tEs('composer.creationsAdd'), e.dibujar());
  let d = e.dibujar();
  check('B18) un vídeo de Mis creaciones no entra con fotos: se dice y no se añade', e.avisos.some((a) => a.includes(ES.composer.noVideoWithMedia)) && !d.botones.some((b) => b.etiqueta === tEs('composer.removeVideo')));
  const p = compositor({ kind: 'poll' }, { materiales: DE_LA_CUENTA });
  await p.tocar(CREACIONES, p.dibujar());
  await p.calma();
  p.tocar(etiqueta('vid1'), p.dibujar());
  p.tocar(tEs('composer.creationsAdd'), p.dibujar());
  check('B18) ni con encuesta', p.avisos.some((a) => a.includes(ES.composer.pollWithVideo)) && !p.dibujar().botones.some((b) => b.etiqueta === tEs('composer.removeVideo')));
  const v = compositor({}, { materiales: DE_LA_CUENTA });
  await v.tocar(CREACIONES, v.dibujar());
  await v.calma();
  v.tocar(etiqueta('vid1'), v.dibujar());
  v.tocar(tEs('composer.creationsAdd'), v.dibujar());
  d = v.dibujar();
  check('B18) CONTROL: solo, el vídeo de Mis creaciones sí entra', d.botones.some((b) => b.etiqueta === tEs('composer.removeVideo')));
  const g = await publicar(v);
  check('B18) y se publica como `videoUrl` + `videoAssetId`, sin subir', !!g && g.videoUrl === DE_LA_CUENTA[2].delivery.url && g.videoAssetId === 'vid1');
  /* Quitar el material de Weë quita la fila de «Cómo lo hice». */
  const q = compositor({}, { materiales: DE_LA_CUENTA });
  await q.tocar(CREACIONES, q.dibujar());
  await q.calma();
  q.tocar(etiqueta('img1'), q.dibujar());
  q.tocar(tEs('composer.creationsAdd'), q.dibujar());
  q.tocar(tEs('composer.removePhotoNumber', { numero: 1 }), q.dibujar());
  check('B19) sin el material de Weë en el borrador, la fila de «Cómo lo hice» se va', !q.dibujar().texto.includes(tEs('composer.howShareTitle')));
}
{
  /* Desde Weë AI: la fila está, apagada, y una foto propia no la quita. */
  const e = compositor({ prefill: { content: 'Ensalada', aiTools: ['Weë Chef'], jobId: 'job_1' }, sourceSection: 'chef' }, { elegido: { canceled: false, assets: [{ uri: 'file:///mia.jpg', type: 'image' }] } });
  let d = e.dibujar();
  check('B20) desde Weë AI la fila «Compartir cómo lo hice» está, APAGADA', d.texto.includes(tEs('composer.howShareTitle')) && e.capturas[`Switch:${tEs('composer.howShareTitle')}`]?.value === false);
  await desdeGaleria(e, d);
  d = e.dibujar();
  check('B20) añadir una foto propia no la quita: el origen manda', d.texto.includes(tEs('composer.howShareTitle')));
  check('B20) y va después de las filas', d.texto.indexOf('Publicar en') < d.texto.indexOf(tEs('composer.howShareTitle')));
}
{
  /* La barra no parte palabras: cinco columnas iguales, dos líneas como mucho, y «creaciones» cabe en 360 dp. */
  const fuente = leer('screens/CreateScreen.tsx');
  check('B21) cinco columnas iguales (`flex: 1`), nombre en dos líneas como mucho, centrado', /accion: \{\s*flex: 1,\s*minWidth: 0,/.test(fuente) && /numberOfLines=\{2\}/.test(fuente.slice(fuente.indexOf('const Accion'), fuente.indexOf('const renderAcciones'))) && /accionTexto: \{\s*fontSize: scale\(11\),[\s\S]{0,60}textAlign: 'center'/.test(fuente));
  /* 360 dp: 360 − 2×16 (márgenes) − 2×1 (borde) − 2×2 (relleno) = 322 → 64 por columna. «creaciones» a 11 pt ≈ 10 × 0,55 × 11 ≈ 61. */
  const columna = (ancho) => (ancho - 2 * 16 - 2 - 2 * 2) / 5;
  const palabra = (p, pt = 11) => p.length * 0.55 * pt;
  check('B21) «creaciones» cabe entera en su columna en 360 y en el Z Flip3 (411)', palabra('creaciones') <= columna(360) && palabra('creaciones') <= columna(411), `${palabra('creaciones').toFixed(1)} ≤ ${columna(360).toFixed(1)}`);
  check('B21) CONTROL: a 14 pt no cabría en 360 (por eso la letra es pequeña)', palabra('creaciones', 14) > columna(360));
}

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('C · «Crear Weël»: Subir vídeo / Mis creaciones');
/* ════════════════════════════════════════════════════════════════════════════ */
const creador = (o = {}) => {
  const reg = { subidas: [], guardados: [], listados: [] };
  const e = crearEntorno({
    pantalla: 'screens/CrearWeelScreen.tsx',
    params: o.params,
    pila: ['Main', 'Reels', 'CrearWeel'],
    dobles: (ctx) => {
      const formato = { numero: (v) => String(v), fecha: () => '12 oct', lista: (xs) => xs.join(', ') };
      return {
        'expo-av': { Video: ctx.capturar('Video'), ResizeMode: { COVER: 'cover', CONTAIN: 'contain' } },
        'firebase/firestore': { Timestamp: { now: () => 'AHORA' } },
        '../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: ctx.colores } }) },
        '../contexts/IdiomaContext': { useT: () => tEs, useIdioma: () => ({ t: tEs, locale: 'es', formato }) },
        '../contexts/AuthContext': { useAuth: () => ({ user: { uid: 'u1' } }) },
        '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: { uid: 'u1' } }) },
        '../contexts/ScrollContext': { useScroll: () => ({ triggerRefresh() {} }) },
        '../services/cloudinaryService': { uploadVideoToCloudinary: async (uri) => { reg.subidas.push(uri); return 'https://cdn/v.mp4'; } },
        '../services/firestoreService': { postsService: { create: async (d) => { reg.guardados.push(d); return 'nuevo'; } } },
        '../services/assetsService': {
          assetsService: {
            listar: async (uid, filtro, cursor) => {
              reg.listados.push({ uid, filtro, cursor });
              if (o.falla) throw new Error('sin red');
              return { items: o.materiales || [], cursor: null, hayMas: false };
            },
          },
        },
        '../constants/weeExperiences': { getExperienceById: (id) => ({ studio: { name: 'Weë Studio' }, chef: { name: 'Weë Chef' } })[id] },
        '../i18n/servidor': { textoDelServidor: (x) => x },
        '../utils/notify': { notify: (a, b) => ctx.avisos.push(`${a}\n${b || ''}`), confirmAction: async () => true },
      };
    },
  });
  e.reg = reg;
  return e;
};
const SIGUIENTE = tEs('common.next');
const TAB_CREACIONES = tEs('creaciones.title');
const generado = (id, extra = {}) => ({ assetId: id, kind: 'video', status: 'ready', delivery: { url: `https://firebasestorage.googleapis.com/v0/b/w/o/${id}.mp4?alt=media&token=t`, kind: 'bearer_token' },
  provenance: { createdAt: 1, capability: 'video.generate' }, durationSec: 8, width: 720, height: 1280, name: 'Anuncio de hamburguesa', metadata: { experienceId: 'studio' }, createdAt: 1760000000000, ...extra });
const MATERIALES = [
  generado('v_studio'),
  generado('v_chef', { metadata: { experienceId: 'chef' }, name: 'Receta en 10 s' }),
  generado('v_largo', { durationSec: 40 }),
  generado('v_subido', { provenance: { createdAt: 1 } }),
  generado('v_procesando', { status: 'processing' }),
  generado('v_sin_url', { delivery: undefined }),
  { ...generado('img'), kind: 'image' },
];
{
  const lista = W.videosParaWeel(MATERIALES);
  check('C1) solo vídeos hechos con Weë, listos, con URL y que valen como Weël', lista.map((v) => v.assetId).join(',') === 'v_studio,v_chef', lista.map((v) => v.assetId).join(','));
  check('C1) CONTROL: lo subido por la persona, lo que aún se procesa, lo largo y las imágenes se quedan fuera', ['v_largo', 'v_subido', 'v_procesando', 'v_sin_url', 'img'].every((id) => !lista.some((v) => v.assetId === id)));
  check('C1) cada uno con su herramienta (identificador, no nombre) y su URL de entrega tal cual', lista[0].experienceId === 'studio' && lista[1].experienceId === 'chef' && lista[0].url === MATERIALES[0].delivery.url);
  const elegido = W.videoDeCreacion(lista[0]);
  check('C1) elegirlo referencia el material: su URL y su assetId, con sus medidas', elegido.uri === lista[0].url && elegido.assetId === 'v_studio' && elegido.segundos === 8 && elegido.alto === 1280);
  check('C2) «Cómo lo hice» del Weël viaja solo si el vídeo es el MISMO que trajo Weë AI',
    JSON.stringify(W.procesoDelWeel({ assetId: 'a' }, { uri: 'x', assetId: 'a' }, { aiTools: ['Weë Studio'], aiProcess: 'p' })) === '{"aiTools":["Weë Studio"],"aiProcess":"p"}'
    && JSON.stringify(W.procesoDelWeel({ assetId: 'a' }, { uri: 'file:///mio.mp4' }, { aiTools: ['Weë Studio'] })) === '{}'
    && JSON.stringify(W.procesoDelWeel(undefined, { uri: 'x', assetId: 'a' }, { aiTools: ['Weë Studio'] })) === '{}');
}
{
  const e = creador({ materiales: MATERIALES });
  let d = e.dibujar();
  check('C3) al abrir no se lee nada: «Mis creaciones» se pide al abrir su pestaña', e.reg.listados.length === 0);
  await e.tocar(TAB_CREACIONES, d);
  await e.calma();
  d = e.dibujar();
  check('C3) la pestaña lee los vídeos de la cuenta (assets, kind: video), una página', e.reg.listados.length === 1 && e.reg.listados[0].uid === 'u1' && e.reg.listados[0].filtro.kind === 'video' && e.reg.listados[0].cursor === null);
  const studio = tEs('weels.creationLabel', { nombre: 'Anuncio de hamburguesa', herramienta: 'Weë Studio' });
  const chef = tEs('weels.creationLabel', { nombre: 'Receta en 10 s', herramienta: 'Weë Chef' });
  check('C3) cada creación: miniatura, nombre, herramienta y fecha', d.botones.some((b) => b.etiqueta === studio) && d.botones.some((b) => b.etiqueta === chef) && d.texto.includes('Weë Studio · 12 oct') && d.texto.includes('Weë Chef · 12 oct'));
  check('C3) CONTROL: las que no valen no se ofrecen', d.botones.filter((b) => /creado con/.test(b.etiqueta || '')).length === 2);
  check('C4) sin elegir, «Siguiente» apagado', d.botones.find((b) => b.etiqueta === SIGUIENTE)?.apagado === true);
  await e.tocar(studio, d);
  d = e.dibujar();
  check('C4) elegir una enciende «Siguiente»', d.botones.find((b) => b.etiqueta === SIGUIENTE)?.apagado === false);
  await e.tocar(SIGUIENTE, d);
  d = e.dibujar();
  check('C4) «Siguiente» abre la composición de siempre con ESE vídeo', e.capturas.Video?.source?.uri === MATERIALES[0].delivery.url && d.botones.some((b) => b.etiqueta === tEs('weels.publish')));
  await e.tocar(tEs('weels.publish'), d);
  await e.calma();
  const g = e.reg.guardados[0] || {};
  check('C5) publicar NO sube nada: el Weël referencia el material (URL de entrega + videoAssetId)', e.reg.subidas.length === 0 && g.videoUrl === MATERIALES[0].delivery.url && g.videoAssetId === 'v_studio' && g.isWeel === true, JSON.stringify(g).slice(0, 160));
  check('C5) sin «Cómo lo hice» inventado (no vino de Weë AI por la ruta)', !('aiTools' in g) && !('aiProcess' in g));
  check('C5) y vuelve al feed de Weëls', e.navegacion.some((n) => n[0] === 'popTo' && n[1] === 'Reels'));
}
{
  const vacio = creador({ materiales: [generado('v_subido', { provenance: { createdAt: 1 } })] });
  await vacio.tocar(TAB_CREACIONES, vacio.dibujar());
  await vacio.calma();
  const d = vacio.dibujar();
  check('C6) sin vídeos de Weë: explicación amable, sin error técnico', d.texto.includes(ES.weels.creationsEmptyTitle) && d.texto.includes(ES.weels.creationsEmptyBody) && !/error|Error/.test(d.texto));
  check('C6) con dos salidas: abrir Weë Studio o subir desde el dispositivo', d.botones.some((b) => b.etiqueta === tEs('weels.creationsOpenStudio')) && d.botones.some((b) => b.etiqueta === tEs('weels.tabUpload')));
  vacio.tocar(tEs('weels.creationsOpenStudio'), d);
  check('C6) «Abrir Weë Studio» va a su ruta de siempre', vacio.navegacion.some((n) => n[0] === 'navigate' && n[1] === 'Studio'));
  const falla = creador({ falla: true });
  const err = console.warn; console.warn = () => {};
  await falla.tocar(TAB_CREACIONES, falla.dibujar());
  await falla.calma();
  console.warn = err;
  const df = falla.dibujar();
  check('C7) si la lectura falla: frase clara y «Inténtalo de nuevo»', df.texto.includes(ES.creaciones.loadFailed) && df.botones.some((b) => b.etiqueta === tEs('common.retry')));
}
{
  /* Volver: en el segundo paso la flecha y Atrás vuelven al primero; en el primero, el ✕ sale como siempre. */
  const e = creador({ params: { video: { uri: 'https://storage/wee/a.mp4', assetId: 'a1', segundos: 8, ancho: 720, alto: 1280 } } });
  let d = e.dibujar();
  check('C8) con un vídeo traído (Weë AI) se entra directo a componer', d.botones.some((b) => b.etiqueta === tEs('weels.publish')));
  e.enfocar();
  const devuelto = e.atras();
  d = e.dibujar();
  check('C8) Atrás en el segundo paso vuelve al primero (y lo consume), sin navegar', devuelto === true && d.botones.some((b) => b.etiqueta === SIGUIENTE) && e.navegacion.length === 0);
  e.enfocar();
  e.atras();
  check('C8) Atrás en el primero sale como siempre (`salirDeCrearWeel`)', e.navegacion.length === 1);
}

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('D · Lo que no cambia');
/* ════════════════════════════════════════════════════════════════════════════ */
{
  const weel = sinComentarios(leer('screens/CrearWeelScreen.tsx'));
  const crear = sinComentarios(leer('screens/CreateScreen.tsx'));
  const IA = /creatorService|brainService|httpsCallable|spendCredits|creditsService|aiEngineService|generateVideo/;
  check('D1) ni Crear Weël ni el compositor llaman a una IA ni tocan Credits', !IA.test(weel) && !IA.test(crear));
  const gancho = sinComentarios(leer('hooks/useCreacionesCompartibles.ts'));
  check('D1) «Mis creaciones» solo LEE: un gancho, una lectura (`assetsService.listar`), ni borra, ni copia, ni sube',
    /assetsService\.listar\(/.test(gancho) && !/assetsService\.eliminar|uploadBytes|addDoc|setDoc|fetch\(|httpsCallable|spendCredits/.test(gancho)
    && /useCreacionesCompartibles\(/.test(weel) && /useCreacionesCompartibles\(/.test(crear) && !/assetsService/.test(weel) && !/assetsService/.test(crear));
  check('D1) una sola subida y un solo guardado en Crear Weël, los de siempre', (weel.match(/uploadVideoToCloudinary\(/g) || []).length === 1 && (weel.match(/postsService\.create\(/g) || []).length === 1);
  check('D2) los dos pasos son la MISMA ruta: no hay ruta ni pantalla nueva', !/name="CrearWeelPaso|name="ElegirVideo/.test(leer('navigation/MainStackNavigator.tsx')) && /type Paso = 'elegir' \| 'componer';/.test(leer('screens/CrearWeelScreen.tsx')));
  const global = sinComentarios(leer('navigation/NavegacionGlobal.tsx'));
  const lista = global.match(/const SIN_BARRA = new Set\(\[([\s\S]*?)\]\)/)?.[1] || '';
  check('D3) la barra global sigue oculta en Create y CrearWeel (SIN_BARRA)', /'Create'/.test(lista) && /'CrearWeel'/.test(lista));
  const IDIOMAS = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'sv', 'da', 'tr', 'hi', 'ja', 'ko', 'zh', 'zh-TW'];
  const NUEVAS = { composer: ['sheetOptionPost', 'sheetOptionPostHint', 'sheetOptionWeel', 'sheetOptionWeelHint', 'sheetToolsNote', 'createPostTitle', 'toolFile', 'toolHashtag', 'gallery', 'rowAudience', 'rowTagPeople', 'rowPublishIn', 'rowWithValue', 'destinationsMore', 'addMoreShort', 'creationsAdd', 'creationsEmptyTitle', 'creationsEmptyBody', 'creationsTooMany', 'creationUntitledImage', 'documentNotPdf', 'documentTooBig', 'documentEmpty', 'documentsTooMany', 'documentPickFailed', 'documentUploadFailed', 'removeDocument'],
    wall: ['documentMeta', 'documentSizeKb', 'documentSizeMb', 'openDocument', 'documentOpenFailed'],
    weels: ['tabUpload', 'uploadTitle', 'dimensions', 'creationUntitled', 'creationLabel', 'creationMeta', 'creationsEmptyTitle', 'creationsEmptyBody', 'creationsOpenStudio'] };
  const faltan = [];
  for (const l of IDIOMAS) for (const [m, ks] of Object.entries(NUEVAS)) { const s = leer(`i18n/textos/${l}/${m}.ts`); for (const k of ks) if (!new RegExp(`\\n  ${k}: '[^']+',`).test(s)) faltan.push(`${l}:${m}.${k}`); }
  check('D4) las claves nuevas están en los 16 diccionarios', faltan.length === 0, faltan.slice(0, 6).join(' '));
  const pt = leer('i18n/textos/pt/composer.ts');
  check('D4) portugués de Brasil: «Compartilhe», «arquivos», «Arquivo», «você»', /sheetOptionPostHint: 'Compartilhe[^']*arquivos/.test(pt) && /toolFile: 'Arquivo'/.test(pt) && /sheetToolsNote: 'Você/.test(pt) && !/Partilh|ficheiro/.test(pt.slice(pt.indexOf('R9 · Crear'))));
  check('D4) las marcas no se traducen', IDIOMAS.every((l) => /creationsOpenStudio: '[^']*Weë Studio/.test(leer(`i18n/textos/${l}/weels.ts`)) && /sheetOptionWeel: '[^']*Weël/.test(leer(`i18n/textos/${l}/composer.ts`))));
  check('esta suite está en la cadena de `npm test`', /r9-crear\.test\.mjs/.test(leer('functions/package.json')));
}

/* ════════════════════════════════════════════════════════════════════════════ */
titulo('E · Documentos: las reglas puras, la subida de verdad y las reglas de Storage');
/* ════════════════════════════════════════════════════════════════════════════ */
{
  const D = base('utils/documentosDePublicacion.ts');
  check('E1) PDF de hasta 10 MB: sí; otro tipo, vacío o más grande: no, con su motivo',
    D.validarDocumento({ tipo: 'application/pdf', bytes: 10 * 1024 * 1024 }).ok === true
    && D.validarDocumento({ tipo: 'application/pdf', bytes: 10 * 1024 * 1024 + 1 }).motivo === 'grande'
    && D.validarDocumento({ tipo: 'image/png', bytes: 10 }).motivo === 'tipo'
    && D.validarDocumento({ tipo: 'application/pdf', bytes: 0 }).motivo === 'vacio'
    && D.validarDocumento({ tipo: null, bytes: 10 }).motivo === 'tipo');
  const enc = (s) => Array.from(Buffer.from(s));
  check('E2) la cabecera manda: «%PDF-» sí; un PNG renombrado o un archivo corto, no', D.esCabeceraPdf(enc('%PDF-1.7\n')) && !D.esCabeceraPdf(enc('\x89PNG\r\n')) && !D.esCabeceraPdf(enc('%PD')) && !D.esCabeceraPdf(null));
  check('E3) tope de cinco: caben los que faltan', D.cuantosCaben(0, 6) === 5 && D.cuantosCaben(3, 4) === 2 && D.cuantosCaben(5, 1) === 0);
  check('E4) la ruta es nueva en cada subida, bajo la cara que firma, y no lleva el nombre del archivo', D.rutaDeDocumento('hidi_u1', 123, 'abc') === 'documents/posts/hidi_u1/123-abc.pdf');
  const leidos = D.documentosDePost([{ url: 'https://x/a.pdf', nombre: 'C:\\docs\\informe\n.pdf', tipo: 'application/pdf', bytes: 9, extra: 'x' }, { url: 'javascript:alert(1)', nombre: 'm', tipo: 'application/pdf', bytes: 1 }, { url: 'https://x/b', nombre: 'b', tipo: 'text/html', bytes: 1 }]);
  check('E5) al pintar se sanea lo guardado: solo https y PDF, sin campos de más y con el nombre sin ruta', leidos.length === 1 && Object.keys(leidos[0]).sort().join(',') === 'bytes,nombre,tipo,url' && leidos[0].nombre === 'informe .pdf', JSON.stringify(leidos));
  check('E6) el tamaño se dice en KB o MB', JSON.stringify(D.tamanoParaLeer(120000)) === '{"clave":"wall.documentSizeKb","valor":117}' && JSON.stringify(D.tamanoParaLeer(1.25 * 1024 * 1024)) === '{"clave":"wall.documentSizeMb","valor":1.3}');
}
{
  /* La subida de VERDAD (`services/storageService.ts`), con Firebase Storage doblado: comprueba la cabecera ANTES de subir. */
  const subidas = [];
  const S = crearCargador({
    dobles: {
      'react-native': { Platform: { OS: 'android' } },
      'firebase/storage': { ref: (_s, ruta) => ({ ruta }), uploadBytes: async (r, blob, meta) => { subidas.push({ ruta: r.ruta, tipo: meta.contentType, bytes: blob.size }); }, getDownloadURL: async (r) => `https://firebasestorage.googleapis.com/${r.ruta}?token=t` },
      '../config/firebase': { storage: {} },
      './cloudinaryService': { uploadImageToCloudinary() {}, uploadBlobToCloudinary() {}, cloudinaryThumb() {} },
      '../utils/publicImage': { uriSinMetadatos: async (u) => u, blobSinMetadatos: async (b) => b },
    },
  })('services/storageService.ts');
  const pdfDeVerdad = new Blob([Buffer.from('%PDF-1.7\n%cuerpo')], { type: 'application/pdf' });
  const r = await S.uploadPostDocument({ uri: 'file:///x.pdf', archivo: pdfDeVerdad }, 'u1');
  check('E7) un PDF de verdad se sube a documents/posts/<cara>/…pdf como application/pdf', subidas.length === 1 && /^documents\/posts\/u1\/\d+-[a-z0-9]+\.pdf$/.test(subidas[0].ruta) && subidas[0].tipo === 'application/pdf' && r.url.startsWith('https://') && r.bytes === pdfDeVerdad.size, JSON.stringify(subidas));
  let error = '';
  try { await S.uploadPostDocument({ uri: 'file:///y.pdf', archivo: new Blob([Buffer.from('\x89PNG\r\n\x1a\n')], { type: 'application/pdf' }) }, 'u1'); } catch (e) { error = e.message; }
  check('E8) un PNG con tipo «application/pdf» NO se sube: la cabecera manda', error === 'documento-no-es-pdf' && subidas.length === 1);
  error = '';
  try { await S.uploadPostDocument({ uri: 'file:///z.pdf', archivo: new Blob([Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(10 * 1024 * 1024)])]) }, 'u1'); } catch (e) { error = e.message; }
  check('E8) ni uno de más de 10 MB', error === 'documento-tamano' && subidas.length === 1);
  check('E9) CONTROL: la comprobación es la de la cabecera, no la extensión', (await S.comprobarPdf(pdfDeVerdad)) === true && (await S.comprobarPdf(new Blob([Buffer.from('hola')]))) === false);
}
{
  const reglas = leer('storage.rules');
  const bloque = reglas.slice(reglas.indexOf('match /documents/posts/{userId}/{fileName}'), reglas.indexOf('match /{allPaths=**}'));
  check('E10) storage.rules: documentos de posts — crea SOLO la cara de esta cuenta, nombre nuevo, ≤ 10 MB, solo application/pdf',
    /request\.auth\.uid == userId \|\| \("hidi_" \+ request\.auth\.uid\) == userId/.test(bloque) && /resource == null/.test(bloque)
    && /request\.resource\.size <= 10 \* 1024 \* 1024/.test(bloque) && /request\.resource\.contentType == 'application\/pdf'/.test(bloque)
    && /allow update, delete: if false;/.test(bloque) && /allow read: if true;/.test(bloque));
  check('E10) y la suite de emulador que lo ejecuta existe (la corre el nivel 2)', /documents\/posts/.test(leer('functions/test/documentos-reglas.emulator.mjs')));
  const tarjeta = leer('components/PostCard.tsx');
  const doc = leer('components/DocumentosDelPost.tsx');
  check('E11) el Wäll pinta los documentos (nombre, «PDF · tamaño») y los abre con expo-web-browser', /<DocumentosDelPost documentos=\{displayPost\.documents\} \/>/.test(tarjeta) && /WebBrowser\.openBrowserAsync\(d\.url\)/.test(doc) && /documentosDePost\(documentos\)/.test(doc) && /document-text-outline/.test(doc) && !/📄/.test(doc));
  check('E12) expo-document-picker es la versión del SDK 54 (~14.0.8)', /"expo-document-picker": "~14\.0\.8"/.test(leer('package.json')) && /"expo-document-picker": "~14\.0\.8"/.test(leer('node_modules/expo/bundledNativeModules.json')));
}

terminar();
