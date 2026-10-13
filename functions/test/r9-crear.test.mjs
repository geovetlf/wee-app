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
titulo('B · «Crear publicación»: el mismo compositor, rediseñado');
/* ════════════════════════════════════════════════════════════════════════════ */
const guardados = [];
const selector = [];
const alertas = [];
const compositor = (params, o = {}) => crearEntorno({
  pantalla: 'screens/CreateScreen.tsx',
  params,
  so: o.so || 'android',
  dobles: (ctx) => {
    const { h: hh, reactNative, capturas } = ctx;
    const valor = () => ({ setValue() {}, interpolate: () => 0 });
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
      '../contexts/ThemeContext': { useTheme: () => ({ theme: { dark: false, colors: ctx.colores } }) },
      '../contexts/IdiomaContext': { useT: () => tEs, useIdioma: () => ({ t: tEs, locale: 'es', formato: {} }) },
      '../contexts/AuthContext': { useAuth: () => ({ user: ctx.usuario }) },
      '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: { uid: 'u1', displayName: 'Laura' } }) },
      '../contexts/ScrollContext': { useScroll: () => ({ triggerScrollToTop() {}, triggerRefresh() {} }) },
      '../hooks/useResponsive': { useResponsive: () => ({ contentMaxWidth: 640, isMobile: true }) },
      '../services/firestoreService': { postsService: { create: async (d) => { guardados.push(d); return 'p1'; } } },
      '../services/storageService': { uploadPostImage: async () => { throw new Error('sin subidas en pruebas'); } },
      '../services/cloudinaryService': { uploadVideoToCloudinary: async () => { throw new Error('sin subidas en pruebas'); } },
      '../services/avatarGenerationService': { performAvatarReplacement() {}, uploadImageForSwap() {}, saveFaceSwapResult() {} },
      '../hooks/useTrabajoDeOrigen': { useTrabajoDeOrigen: () => ({ leyendo: false }) },
      '../i18n/servidor': { textoDelServidor: (x) => x },
      '../data/places': { etiquetaDeLugar: ({ place }) => place?.label || '' },
      '../utils/sectionFeed': { MURO_GENERAL: 'general', destinosDisponibles: () => [{ id: 'general', nombre: 'Muro general', clave: 'composer.generalWall' }, { id: 'chef', nombre: 'Weë Chef' }] },
      '../constants/weeExperiences': { getExperienceById: () => undefined },
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
{
  const e = compositor({});
  let d = e.dibujar();
  check('B1) se abre vacío: «Crear publicación», ✕ y «Publicar» apagado', d.texto.includes('Crear publicación') && d.botones.some((b) => b.etiqueta === tEs('common.back'))
    && d.botones.filter((b) => b.etiqueta === PUBLICAR).length === 1 && d.botones.find((b) => b.etiqueta === PUBLICAR).apagado === true);
  check('B1) el papel dice «¿Qué quieres compartir?»', e.capturas[`Campo:${CAMPO}`]?.placeholder === '¿Qué quieres compartir?');
  const BARRA = ['Foto', 'Vídeo', 'Archivo', 'Enlace', 'Hashtag'];
  check('B1) la barra: Foto · Vídeo · Archivo · Enlace · Hashtag (y la Encuesta, su única puerta)', BARRA.every((x) => d.botones.some((b) => b.etiqueta === x)) && d.botones.some((b) => b.etiqueta === 'Encuesta'));
  check('B1) CONTROL: la barra vieja (Cámara, Multimedia, ËContact, Ubicación, Mis proyectos) no está', !['Cámara', 'Multimedia', 'ËContact', 'Ubicación', 'Mis proyectos'].some((x) => d.botones.some((b) => b.etiqueta === x)));
  check('B1) las filas: quién lo ve (Público), ubicación, personas y dónde', d.botones.some((b) => b.etiqueta === '¿Quién puede ver esta publicación?: Público')
    && d.botones.some((b) => b.etiqueta === 'Agregar ubicación') && d.botones.some((b) => b.etiqueta === 'Etiquetar personas') && d.botones.some((b) => b.etiqueta === `Publicar en: ${tEs('composer.generalWall')}`));
  check('B1) publicación directa: sin «Compartir cómo lo hice»', !d.texto.includes(tEs('composer.howShareTitle')));

  /* Texto: Publicar se enciende (negro). */
  e.capturas[`Campo:${CAMPO}`].onChangeText('Mi café favorito del día.');
  d = e.dibujar();
  check('B2) con texto, Publicar se enciende', d.botones.find((b) => b.etiqueta === PUBLICAR).apagado === false);

  /* Hashtag y Enlace escriben en el TEXTO. */
  e.tocar('Hashtag', d);
  d = e.dibujar();
  check('B3) Hashtag escribe «#» al final del texto', e.capturas[`Campo:${CAMPO}`].value === 'Mi café favorito del día. #');
  e.capturas[`Campo:${CAMPO}`].onChangeText('Mi café favorito del día. #cafe');
  e.tocar('Enlace', e.dibujar());
  d = e.dibujar();
  const enlace = e.capturas[`Campo:${tEs('composer.linkPlaceholder')}`];
  check('B4) Enlace abre su campo, con «Añadir» apagado mientras está vacío', !!enlace && d.botones.find((b) => b.etiqueta === tEs('composer.linkAdd'))?.apagado === true);
  enlace.onChangeText('no es un enlace');
  e.tocar(tEs('composer.linkAdd'), e.dibujar());
  check('B4) un enlace mal formado se dice y no toca el texto', e.avisos.some((a) => a.includes(tEs('composer.linkInvalid'))) && e.capturas[`Campo:${CAMPO}`].value === 'Mi café favorito del día. #cafe');
  e.capturas[`Campo:${tEs('composer.linkPlaceholder')}`].onChangeText('https://wee.zone/cafe');
  e.tocar(tEs('composer.linkAdd'), e.dibujar());
  d = e.dibujar();
  check('B4) uno bueno va al final del texto, en su línea, y el campo se cierra', e.capturas[`Campo:${CAMPO}`].value === 'Mi café favorito del día. #cafe\nhttps://wee.zone/cafe' && !e.capturas[`Campo:${tEs('composer.linkPlaceholder')}`]);

  /* Publicar: el servicio de siempre, una vez, con los hashtags que salen del texto. */
  e.tocar(PUBLICAR, d);
  await e.calma();
  const g = guardados.pop();
  check('B5) publica con `postsService.create`, una publicación, con sus hashtags y sin nada de «Cómo lo hice»',
    !!g && g.content === 'Mi café favorito del día. #cafe\nhttps://wee.zone/cafe' && JSON.stringify(g.hashtags) === '["#cafe"]' && g.isPrivate === false
    && ['aiTools', 'aiProcess', 'aiPrompt', 'aiSteps'].every((k) => !(k in g)) && guardados.length === 0, JSON.stringify(g && g.hashtags));
}
{
  /* Los tres selectores son el MISMO, con lo que pide cada uno. */
  selector.length = 0; alertas.length = 0;
  const e = compositor({});
  let d = e.dibujar();
  await e.tocar('Vídeo', d);
  await e.tocar('Archivo', e.dibujar());
  check('B6) Vídeo pide solo vídeos y uno; Archivo, fotos y vídeos', JSON.stringify(selector.map(([, o]) => o.mediaTypes)) === '[["videos"],["images","videos"]]'
    && selector[0][1].allowsMultipleSelection === false && selector[1][1].allowsMultipleSelection === true, JSON.stringify(selector.map(([, o]) => o.mediaTypes)));
  e.tocar('Foto', e.dibujar());
  const aviso = alertas.at(-1);
  check('B6) en el teléfono, Foto pregunta: Cámara, Galería o Cancelar', !!aviso && aviso[0] === 'Foto' && aviso[2].map((b) => b.text).join(' · ') === 'Cámara · Galería · Cancelar');
  await aviso[2][1].onPress();
  await e.calma();
  check('B6) y «Galería» abre el selector de fotos', JSON.stringify(selector.at(-1)[1].mediaTypes) === '["images"]');
  aviso[2][0].onPress();
  await e.calma();
  check('B6) y «Cámara», la cámara de siempre', selector.at(-1)[0] === 'camara');
}
{
  /* Fotos elegidas: tira con quitar y «Agregar más»; Publicar se enciende sin texto. */
  const dos = { canceled: false, assets: [{ uri: 'file:///a.jpg', type: 'image', width: 1200, height: 900 }, { uri: 'file:///b.jpg', type: 'image', width: 900, height: 1200 }] };
  const e = compositor({}, { elegido: dos });
  await e.tocar('Archivo', e.dibujar());
  await e.calma();
  let d = e.dibujar();
  check('B7) dos fotos: cada una con su aspa y «Agregar más» al final', d.botones.some((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 1 })) && d.botones.some((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 2 }))
    && d.botones.some((b) => b.etiqueta === tEs('composer.addMoreMediaLabel', { puestas: 2, tope: 10 })) && d.texto.includes('Agregar más'));
  check('B7) y Publicar se enciende con solo fotos (la regla de siempre: texto, fotos o encuesta)', d.botones.find((b) => b.etiqueta === PUBLICAR).apagado === false);
  e.tocar(tEs('composer.removePhotoNumber', { numero: 1 }), d);
  d = e.dibujar();
  check('B7) quitar una deja la otra', d.botones.some((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 1 })) && !d.botones.some((b) => b.etiqueta === tEs('composer.removePhotoNumber', { numero: 2 })));
  check('B7) y la foto dice cuántas lleva («1/10»)', d.botones.some((b) => b.etiqueta === tEs('composer.actionWithBadge', { accion: 'Foto', insignia: '1/10' })));
  check('B7) con fotos, Vídeo se apaga (un vídeo va solo)', d.botones.find((b) => b.etiqueta === 'Vídeo')?.apagado === true);
}
{
  /* Las filas abren lo que ya existía. */
  const e = compositor({});
  let d = e.dibujar();
  e.tocar('¿Quién puede ver esta publicación?: Público', d);
  check('B8) quién lo ve: la explicación de siempre (todo es público), sin selector inventado', e.avisos.some((a) => a.startsWith('Público') && a.includes(ES.composer.publicExplain)));
  e.tocar('Agregar ubicación', e.dibujar());
  check('B8) ubicación: la pantalla «Agregar ubicación» de siempre', e.navegacion.some((n) => n[0] === 'navigate' && n[1] === 'AgregarUbicacion'));
  e.tocar('Etiquetar personas', e.dibujar());
  d = e.dibujar();
  check('B8) personas: la agenda de ËContact (SelectorDeEContacts) se despliega', !!e.capturas.SelectorDeEContacts);
  e.tocar(`Publicar en: ${tEs('composer.generalWall')}`, d);
  d = e.dibujar();
  check('B8) dónde: los destinos de siempre, desplegados', d.botones.some((b) => b.etiqueta === 'Weë Chef') && d.texto.includes(ES.composer.publishIn));
  e.tocar('Weë Chef', d);
  d = e.dibujar();
  check('B8) y la fila dice lo elegido', d.botones.some((b) => b.etiqueta === `Publicar en: ${tEs('composer.destinationsMore', { primero: tEs('composer.generalWall'), resto: 1 })}`));
}
{
  /*
   * El lugar elegido vuelve por la ruta (un efecto, que este entorno no ejecuta: eso es del teléfono). Aquí se mira lo
   * que la fila hace con él: sin nada puesto, la fila va sola; el valor sale del lugar o de la zona, en su idioma.
   */
  const e = compositor({});
  const d = e.dibujar();
  const fuente = leer('screens/CreateScreen.tsx');
  check('B9) sin lugar, la fila «Agregar ubicación» va sin valor', d.botones.some((b) => b.etiqueta === 'Agregar ubicación') && !d.botones.some((b) => /^Agregar ubicación: /.test(b.etiqueta || '')));
  check('B9) con lugar o zona, la fila dice cuál (etiquetaDeLugar en el locale de quien publica, o «Zona aproximada»)',
    /const valorDeUbicacion = place \? etiquetaDeLugar\(\{ place \}, locale\) \|\| undefined : ubicacion \? t\('composer\.approxZone'\) : undefined;/.test(fuente) && /texto=\{t\('composer\.addLocation'\)\} valor=\{valorDeUbicacion\}/.test(fuente));
}
{
  /* Desde Weë AI: «Cómo lo hice» apagado, y con fotos propias añadidas sigue (el origen manda). */
  const e = compositor({ prefill: { content: 'Ensalada', aiTools: ['Weë Chef'], jobId: 'job_1' }, sourceSection: 'chef' }, { elegido: { canceled: false, assets: [{ uri: 'file:///mia.jpg', type: 'image' }] } });
  let d = e.dibujar();
  check('B10) desde Weë AI la fila «Compartir cómo lo hice» está, APAGADA', d.texto.includes(tEs('composer.howShareTitle')) && e.capturas[`Switch:${tEs('composer.howShareTitle')}`]?.value === false);
  await e.tocar('Archivo', d);
  await e.calma();
  d = e.dibujar();
  check('B10) añadir una foto propia no la quita: el origen manda', d.texto.includes(tEs('composer.howShareTitle')));
  check('B10) va después de las filas (como la referencia)', d.texto.indexOf('Publicar en') < d.texto.indexOf(tEs('composer.howShareTitle')));
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
  check('D1) «Mis creaciones» solo LEE (`assetsService.listar`): ni borra, ni copia, ni sube', /assetsService\.listar\(/.test(weel) && !/assetsService\.eliminar|uploadBytes|addDoc|setDoc|fetch\(/.test(weel));
  check('D1) una sola subida y un solo guardado en Crear Weël, los de siempre', (weel.match(/uploadVideoToCloudinary\(/g) || []).length === 1 && (weel.match(/postsService\.create\(/g) || []).length === 1);
  check('D2) los dos pasos son la MISMA ruta: no hay ruta ni pantalla nueva', !/name="CrearWeelPaso|name="ElegirVideo/.test(leer('navigation/MainStackNavigator.tsx')) && /type Paso = 'elegir' \| 'componer';/.test(leer('screens/CrearWeelScreen.tsx')));
  const global = sinComentarios(leer('navigation/NavegacionGlobal.tsx'));
  const lista = global.match(/const SIN_BARRA = new Set\(\[([\s\S]*?)\]\)/)?.[1] || '';
  check('D3) la barra global sigue oculta en Create y CrearWeel (SIN_BARRA)', /'Create'/.test(lista) && /'CrearWeel'/.test(lista));
  const IDIOMAS = ['es', 'en', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ru', 'sv', 'da', 'tr', 'hi', 'ja', 'ko', 'zh', 'zh-TW'];
  const NUEVAS = { composer: ['sheetOptionPost', 'sheetOptionPostHint', 'sheetOptionWeel', 'sheetOptionWeelHint', 'sheetToolsNote', 'createPostTitle', 'toolPhoto', 'toolVideo', 'toolFile', 'toolLink', 'toolHashtag', 'gallery', 'linkPlaceholder', 'linkAdd', 'linkInvalid', 'rowAudience', 'rowTagPeople', 'rowPublishIn', 'rowWithValue', 'destinationsMore', 'addMoreShort'],
    weels: ['tabUpload', 'uploadTitle', 'dimensions', 'creationUntitled', 'creationLabel', 'creationMeta', 'creationsEmptyTitle', 'creationsEmptyBody', 'creationsOpenStudio'] };
  const faltan = [];
  for (const l of IDIOMAS) for (const [m, ks] of Object.entries(NUEVAS)) { const s = leer(`i18n/textos/${l}/${m}.ts`); for (const k of ks) if (!new RegExp(`\\n  ${k}: '[^']+',`).test(s)) faltan.push(`${l}:${m}.${k}`); }
  check('D4) las claves nuevas están en los 16 diccionarios', faltan.length === 0, faltan.slice(0, 6).join(' '));
  const pt = leer('i18n/textos/pt/composer.ts');
  check('D4) portugués de Brasil: «Compartilhe», «arquivos», «Arquivo», «você»', /sheetOptionPostHint: 'Compartilhe[^']*arquivos/.test(pt) && /toolFile: 'Arquivo'/.test(pt) && /sheetToolsNote: 'Você/.test(pt) && !/Partilh|ficheiro/.test(pt.slice(pt.indexOf('R9 · Crear'))));
  check('D4) las marcas no se traducen', IDIOMAS.every((l) => /creationsOpenStudio: '[^']*Weë Studio/.test(leer(`i18n/textos/${l}/weels.ts`)) && /sheetOptionWeel: '[^']*Weël/.test(leer(`i18n/textos/${l}/composer.ts`))));
  check('esta suite está en la cadena de `npm test`', /r9-crear\.test\.mjs/.test(leer('functions/package.json')));
}

terminar();
