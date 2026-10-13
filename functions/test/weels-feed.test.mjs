/*
 * WEËLS ES UN FEED DE VÍDEOS, NO EL COMPOSITOR DEL WALL.
 *
 * El defecto (R9, 2026-10-12): «Explora → Weëls» del menú, «Ver todos →» de la fila y la web abrían el visor solo si el
 * Home ya tenía Weëls cargados; si no —lo normal con una base vacía o recién estrenada— mandaban a `Create` con
 * `kind: 'weel'`, y la persona veía «Nueva publicación» con texto, encuestas y destinos: el compositor del Wall.
 *
 *  A. EL FEED, EJECUTADO (`screens/ReelsScreen.tsx` con `_pantallas.mjs` y un `postsService` doble): al entrar pide su
 *     primera página al servicio de siempre; sin Weëls dice que no hay y ofrece crear; si falla, lo dice y deja reintentar;
 *     con Weëls no pinta ningún estado encima; crear es un botón aparte que lleva al CREADOR DE WEËLS (`CrearWeel`, ya no
 *     el compositor en modo Weël: weels-crear.test.mjs); y abrir el feed sin vídeo de partida no se rompe.
 *  B. LA VISIBILIDAD (`utils/visibilidadDeWeels.ts`): sin vídeo o privado, no se enseña.
 *  C. LA NAVEGACIÓN, LEÍDA: ver Weëls lleva siempre a `Reels` (Android y web, menú incluido) y nunca al compositor; crear
 *     Weël es `CrearWeel` (R9-H: antes `Create` con `kind: 'weel'`, que era el compositor del Wall); el Wall conserva su
 *     compositor (`Create` con su `kind`) y sus encuestas.
 *  D. R9 EN EL TELÉFONO: un vídeo que no es vertical se ve completo (contain) y uno vertical llena (cover), sin tocar
 *     las fotos; la flecha ← es inequívoca (círculo propio, 48 de zona, rol y etiqueta) y, como el Atrás de Android,
 *     sale por el historial o, sin él, al Wäll (`utils/salidaDeWeels.ts`); paginación, duplicados y autoplay siguen.
 *  E. R9, COMENTARIOS DENTRO DEL WEËL: el icono abre la hoja de comentarios de siempre (`HojaDeComentarios` +
 *     `ComentariosContext`) encima del vídeo, transparente, sin navegar; el Weël sigue montado y en silencio; ✕, fuera,
 *     deslizar y Atrás la cierran en el mismo Weël y la misma posición; el contador sube con lo que cuenta la hoja.
 *
 * Cada detector lleva su CONTROL. Sin red ni emulador.
 */
import { crearEntorno } from './_pantallas.mjs';
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const tEs = crearTraductor('es', { es: base('i18n/textos/es/index.ts').es, en: base('i18n/textos/en/index.ts').en }, {});

/** Un `postsService` doble: contesta lo que se le diga y apunta cada petición. */
const servicio = (respuestas) => {
  const peticiones = [];
  let n = 0;
  return {
    peticiones,
    postsService: {
      getVideoPostsPaginated: async (...a) => {
        peticiones.push(a);
        const r = respuestas[Math.min(n++, respuestas.length - 1)];
        if (r instanceof Error) throw r;
        return r;
      },
    },
  };
};

const animado = () => {
  const valor = () => ({ setValue() {}, interpolate: () => 0 });
  const anim = () => ({ start: (cb) => cb && cb() });
  return { Value: function Value() { return valor(); }, View: null, timing: anim, spring: anim, sequence: anim, parallel: anim };
};

/**
 * La hoja de comentarios de siempre (`ComentariosContext`), doblada: apunta qué se abre y qué se cierra. `estado.abierta`
 * es el id de la publicación abierta y `estado.contadores` lo que contó la hoja (R9, comentarios dentro del Weël).
 */
const comentariosDoble = () => {
  const estado = { abiertas: [], cerradas: 0, abierta: null, contadores: {} };
  estado.valor = () => ({
    abrirComentarios: (post, como) => { estado.abiertas.push([post.id, como]); estado.abierta = post.id; },
    cerrarComentarios: () => { estado.cerradas++; estado.abierta = null; },
    publicacionAbierta: estado.abierta,
    contadores: estado.contadores,
  });
  return estado;
};

const pantalla = (svc, extra = {}) => crearEntorno({
  pantalla: 'screens/ReelsScreen.tsx',
  ...extra,
  dobles: (ctx) => {
    const { h, Caja, capturar, usuario } = ctx;
    const A = animado();
    A.View = Caja;
    /*
     * `conLista`: el visor monta su lista cuando mide su hueco (`onLayout`), y un dibujado estático no mide. Aquí el
     * contenedor «mide» 390×800 al dibujarse y la lista pinta sus Weëls, para poder tocar los de dentro (sección E).
     */
    if (extra.conLista) {
      const Medido = (p) => { if (p.onLayout) p.onLayout({ nativeEvent: { layout: { width: 390, height: 800 } } }); return Caja(p); };
      A.View = Medido;
      ctx.reactNative.View = Medido;
      ctx.reactNative.FlatList = ({ data, renderItem }) => h('div', { 'data-lista': 'weels' }, (data || []).map((item, index) => h(ctx.React.Fragment, { key: item.id }, renderItem({ item, index }))));
    }
    ctx.reactNative.Animated = A;
    ctx.reactNative.StatusBar = () => null;
    const coment = extra.comentarios || comentariosDoble();
    const habla = { useT: () => tEs, useIdioma: () => ({ t: tEs, locale: 'es', idioma: 'es' }) };
    return {
      'react-native': ctx.reactNative,
      'react-native-safe-area-context': { SafeAreaView: Caja, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
      '../utils/platform': { isWeb: false },
      'expo-av': { Video: (p) => { if (extra.videos && p.source?.uri) extra.videos[p.source.uri] = p; return capturar('Video')(p); }, ResizeMode: { COVER: 'cover', CONTAIN: 'contain' }, Audio: { setAudioModeAsync: async () => {} } },
      'expo-linear-gradient': { LinearGradient: Caja },
      '../contexts/AuthContext': { useAuth: () => ({ user: usuario }) },
      '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: null }) },
      '../hooks/useUserById': { useUserById: () => ({ userProfile: { displayName: 'Ana' } }) },
      '../hooks/useVote': { useVote: () => ({ stats: { agreementCount: 0, disagreementCount: 0 }, voteAgree() {}, voteDisagree() {} }) },
      '../services/firestoreService': { postsService: svc.postsService },
      '../navigation/MainStackNavigator': {},
      '../utils/formatoCorto': { formatNumber: String, getRelativeTime: () => '' },
      '../components/avatars/AvatarDisplay': { __esModule: true, default: capturar('AvatarDisplay') },
      '../utils/scale': { scale: (x) => x },
      '../utils/compartirFuera': { compartirFueraDeWee: async () => {} },
      '../contexts/IdiomaContext': habla,
      '../contexts/ComentariosContext': { useComentariosDeLaPublicacion: () => coment.valor() },
      _h: h,
    };
  },
});

const WEEL = (id, extra = {}) => ({ id, userId: 'u-autor', content: `Weël ${id}`, videoUrl: `https://x/${id}.mp4`, isPrivate: false, ...extra });

console.log('\n─── A. El feed, ejecutado ───');
{
  const svc = servicio([{ documents: [], lastDoc: null, hasMore: false }]);
  const e = pantalla(svc);
  const antes = e.dibujar();
  check('A1) sin lista de entrada, el feed arranca CARGANDO (no un compositor ni una pantalla en blanco)',
    /<progress/.test(antes.html) && !antes.texto.includes(tEs('weels.empty')), antes.texto.slice(0, 120));
  e.enfocar();
  await e.calma();
  const d = e.dibujar();
  check('A2) al entrar pide su primera página al servicio de siempre (`getVideoPostsPaginated`), una sola vez',
    svc.peticiones.length === 1 && svc.peticiones[0][0] === 15 && svc.peticiones[0][1] === undefined, JSON.stringify(svc.peticiones));
  e.enfocar();
  await e.calma();
  check('A2) y volver a enfocarlo no la repite', svc.peticiones.length === 1, `${svc.peticiones.length} peticiones`);
  check('A3) sin Weëls dice que no hay y ofrece crear el primero', d.texto.includes(tEs('weels.empty')) && d.texto.includes(tEs('weels.emptyHint'))
    && d.botones.some((b) => b.etiqueta === tEs('weels.create')), d.texto.slice(0, 160));
  check('A3) y la pantalla de Weëls no es el compositor: ni «Nueva publicación», ni encuestas, ni destinos',
    !/Nueva publicación|Encuesta|Publicar en/i.test(d.texto) && e.navegacion.length === 0, d.texto.slice(0, 160));
  e.tocar(tEs('weels.create'));
  /* R9-H: antes esto fijaba `Create` con `kind: 'weel'` —el compositor del Wall—; crear un Weël tiene ahora su flujo propio. */
  check('A4) crear es una acción aparte: el + lleva al CREADOR DE WEËLS (`CrearWeel`), nunca al compositor',
    e.navegacion.length === 1 && e.navegacion[0][1] === 'CrearWeel' && e.navegacion[0][2] === undefined, JSON.stringify(e.navegacion));
}
{
  const svc = servicio([{ documents: [], lastDoc: null, hasMore: false }]);
  const e = pantalla(svc, { usuario: null });
  e.dibujar(); e.enfocar(); await e.calma(); e.dibujar();
  e.tocar(tEs('weels.create'));
  check('A4) sin sesión, crear lleva a entrar, no al compositor', e.navegacion.length === 1 && e.navegacion[0][1] === 'Login', JSON.stringify(e.navegacion));
}
{
  const svc = servicio([new Error('sin red'), { documents: [WEEL('w1')], lastDoc: { id: 'c' }, hasMore: false }]);
  const e = pantalla(svc);
  e.dibujar(); e.enfocar(); await e.calma();
  const d = e.dibujar();
  check('A5) si la carga falla lo dice y deja reintentar (sin compositor de sustituto)',
    d.texto.includes(tEs('weels.loadFailed')) && d.botones.some((b) => b.etiqueta === undefined && /Inténtalo|Reintentar/.test(tEs('common.retry'))), d.texto.slice(0, 160));
  const reintento = d.botones.find((b) => b.tocar && !b.etiqueta);
  reintento?.tocar();
  await e.calma();
  const tras = e.dibujar();
  check('A5) y el reintento vuelve a pedir y enseña el feed', svc.peticiones.length === 2 && !tras.texto.includes(tEs('weels.loadFailed')) && !tras.texto.includes(tEs('weels.empty')),
    `${svc.peticiones.length} peticiones · ${tras.texto.slice(0, 80)}`);
}
{
  const svc = servicio([{ documents: [WEEL('w1'), WEEL('w2', { isPrivate: true }), WEEL('w3', { videoUrl: '' })], lastDoc: { id: 'c' }, hasMore: true }]);
  const e = pantalla(svc);
  e.dibujar(); e.enfocar(); await e.calma();
  const d = e.dibujar();
  check('A6) con Weëls no pinta ningún estado encima del feed', !d.texto.includes(tEs('weels.empty')) && !d.texto.includes(tEs('weels.loadFailed')) && !/<progress/.test(d.html), d.texto.slice(0, 120));
}
{
  let error = null;
  try {
    const e = pantalla(servicio([{ documents: [], lastDoc: null, hasMore: false }]), { params: undefined });
    e.dibujar();
  } catch (err) { error = err; }
  check('A7) abrir el feed sin vídeo de partida no se rompe (antes leía `initialPost.id` sin comprobarlo)', error === null, String(error?.message || ''));
  const conLista = servicio([{ documents: [], lastDoc: null, hasMore: false }]);
  const e = pantalla(conLista, { params: { initialPost: WEEL('w1'), initialVideoPosts: [WEEL('w1'), WEEL('w2')] } });
  e.dibujar(); e.enfocar(); await e.calma();
  check('A8) con la lista que trae quien lo abre, no vuelve a pedir la primera página', conLista.peticiones.length === 0, `${conLista.peticiones.length} peticiones`);
}

console.log('\n─── B. La visibilidad ───');
const { esVisibleEnWeels } = base('utils/visibilidadDeWeels.ts');
check('B1) con vídeo y pública, se enseña', esVisibleEnWeels({ videoUrl: 'https://x/a.mp4', isPrivate: false }) && esVisibleEnWeels({ videoUrl: 'https://x/a.mp4' }));
check('B2) privada, sin vídeo, con vídeo vacío o sin publicación, no', !esVisibleEnWeels({ videoUrl: 'https://x/a.mp4', isPrivate: true })
  && !esVisibleEnWeels({ videoUrl: '' }) && !esVisibleEnWeels({ videoUrl: '   ' }) && !esVisibleEnWeels({}) && !esVisibleEnWeels(null));
const feed = sinComentarios(leer('screens/ReelsScreen.tsx'));
check('B3) el feed aplica la regla a la primera página, a las siguientes y a la lista de entrada', (feed.match(/esVisibleEnWeels/g) || []).length >= 3);

console.log('\n─── C. La navegación, leída ───');
const landing = sinComentarios(leer('screens/LandingScreen.tsx'));
const web = sinComentarios(leer('screens/WebLandingScreen.tsx'));
const menu = sinComentarios(leer('components/DrawerMenu.tsx'));
const cuerpo = (src, nombre) => { const i = src.indexOf(`const ${nombre} = `); return i < 0 ? '' : src.slice(i, src.indexOf('\n  };', i) > 0 && src.indexOf('}, [', i) > src.indexOf('\n  };', i) ? src.indexOf('\n  };', i) : src.indexOf('}, [', i)); };
const abrirAndroid = cuerpo(landing, 'abrirElVisor');
const abrirWeb = cuerpo(web, 'handleOpenWeels');
const llevaAlCompositor = (c) => /navigate\(\s*'Create'|crearWeel\(|handleCreateWeel\(|irAlCompositor\(/.test(c);
check('C1) Android: ver Weëls (menú, «Ver todos», un vídeo) lleva SIEMPRE a `Reels`, nunca al compositor',
  /navigate\('Reels'/.test(abrirAndroid) && !llevaAlCompositor(abrirAndroid), abrirAndroid.slice(0, 160));
check('C2) web: lo mismo', /navigate\('Reels'/.test(abrirWeb) && !llevaAlCompositor(abrirWeb), abrirWeb.slice(0, 160));
check('C3) el menú «Weëls» entra por el visor (`openWeels`), no por el compositor', /openWeels: true/.test(menu) && /abrirElVisor\(\);/.test(landing));
/* R9-H: antes fijaba `Create` con `kind: 'weel'`; ahora crear Weël es su propia pantalla, y el compositor no aparece. */
check('C4) crear Weël es una acción propia: `CrearWeel` (Android y web), nunca el compositor',
  /navigate\(user \? 'CrearWeel' : 'Login'\)/.test(landing) && /navigate\('CrearWeel'\)/.test(web) && !/kind: 'weel'/.test(landing) && !/kind: 'weel'/.test(web));
const compositor = sinComentarios(leer('screens/CreateScreen.tsx'));
check('C5) el Wall conserva su compositor: «Crear publicación» del Home va a `Create` con su `kind`, y el compositor sigue teniendo encuestas',
  /navigate\('Create', \{ kind \}\)/.test(landing) && /poll/.test(compositor) && /destinosDisponibles\(\)/.test(compositor) && !/presetKind === 'weel'/.test(compositor));
check('C6) la ruta `Reels` acepta abrirse sin parámetros (el feed entero)', /Reels: \{\s*initialPost\?: Post;\s*initialVideoPosts\?: Post\[\];[\s\S]*?\} \| undefined;/.test(leer('navigation/MainStackNavigator.tsx')));
check('CONTROL: un visor que manda al compositor se vería',
  llevaAlCompositor("const abrirElVisor = useCallback(() => { if (n === 0) return crearWeel(); navigate('Reels') }") && !llevaAlCompositor("navigate('Reels', undefined)"));

console.log('\n─── D. R9 en el teléfono: el vídeo entero si no es vertical, y una flecha que se ve y saca de Weëls ───');
/*
 * Lo que se vio en el Z Flip3 (build 2b0dcaab): los vídeos demo, apaisados, se recortaban para llenar la pantalla
 * (COVER) y la etiqueta DEMO y el título quedaban cortados a la izquierda y bajo la flecha, que iba pintada a pelo
 * sobre el vídeo. El dueño decidió: lo que NO es vertical se ve completo (contain); lo vertical sigue llenando; la flecha
 * es inequívoca (círculo propio, 48 de zona táctil, rol y etiqueta) y, como el Atrás de Android, saca de Weëls al Wäll.
 */
const V = base('utils/videoDimensionCache.ts');
check('D1) un vídeo apaisado (16:9) o cuadrado se ve COMPLETO (contain); uno vertical (9:16) llena la pantalla (cover)',
  V.ajusteDelVideoEnWeels(16 / 9) === 'contain' && V.ajusteDelVideoEnWeels(1) === 'contain' && V.ajusteDelVideoEnWeels(9 / 16) === 'cover');
check('D1) mientras no se sabe la forma (o es absurda), contain: la espera que no recorta nada',
  V.ajusteDelVideoEnWeels(undefined) === 'contain' && V.ajusteDelVideoEnWeels(NaN) === 'contain' && V.ajusteDelVideoEnWeels(0) === 'contain' && V.ajusteDelVideoEnWeels(-1) === 'contain');
check('D1) la forma sale de la medida de verdad del reproductor: un vertical que Android da sin rotar (1920×1080 + portrait) llena',
  V.ajusteDelVideoEnWeels(V.proporcionDeLaMedida({ width: 1920, height: 1080, orientation: 'portrait' })) === 'cover'
  && V.ajusteDelVideoEnWeels(V.proporcionDeLaMedida({ width: 1920, height: 1080, orientation: 'landscape' })) === 'contain'
  && V.ajusteDelVideoEnWeels(V.proporcionDeLaMedida({ width: 1080, height: 1920 })) === 'cover');
check('CONTROL: la regla de antes (siempre cover) recortaba el apaisado', ((/* antes */) => 'cover')(16 / 9) !== V.ajusteDelVideoEnWeels(16 / 9));
/*
 * El visor no monta su lista hasta medir su hueco (`onLayout`), y un dibujado estático no mide: así que el cableado del
 * vídeo se lee del código del propio Weël, y la regla de arriba es la que se ejecuta.
 */
const item = feed.slice(feed.indexOf('const ReelItem'), feed.indexOf('const ReelsScreen'));
check('D2) el vídeo del Weël se ajusta con esa regla (COVER solo si es vertical) y apunta la medida del reproductor',
  /resizeMode=\{ajuste === 'cover' \? ResizeMode\.COVER : ResizeMode\.CONTAIN\}/.test(item) && /const ajuste = ajusteDelVideoEnWeels\(proporcionDelVideo\)/.test(item)
  && /onReadyForDisplay=\{alSaberLaFormaDelVideo\}/.test(item) && /proporcionDeLaMedida\(evento\?\.naturalSize\)/.test(item), item.length + ' caracteres');
check('D2) y aprovecha lo que ya se sabe de ese vídeo (la caché del muro y, en la web, su cabecera) para no saltar',
  /getCachedVideoAspectRatio\(urlDelVideo\)/.test(item) && /fetchAndCacheVideoAspectRatio\(urlDelVideo/.test(item) && /setCachedVideoAspectRatio\(urlDelVideo, proporcion\)/.test(item));
check('D2) el póster (un fotograma del vídeo) se ajusta igual que el vídeo: no salta de recortado a entero al arrancar',
  /resizeMode=\{ajuste\}/.test(item) && !/resizeMode="cover"/.test(item));
check('CONTROL: el Weël de antes (`resizeMode={ResizeMode.COVER}` fijo) se cazaría', /resizeMode=\{ResizeMode\.COVER\}/.test('<Video resizeMode={ResizeMode.COVER} />') && !/resizeMode=\{ResizeMode\.COVER\}/.test(item));
{
  /* Las fotos, como estaban: el muro no usa la regla de Weëls. */
  const tarjeta = sinComentarios(leer('components/PostCard.tsx'));
  const filaDeWeels = sinComentarios(leer('components/WeelsRow.tsx'));
  check('D3) las fotos y el muro no cambian: `PostCard` sigue con su CONTAIN y su estilo de foto, y ni él ni la fila del Home usan la regla de Weëls',
    (tarjeta.match(/resizeMode=\{ResizeMode\.CONTAIN\}/g) || []).length === 1 && /resizeMode: 'contain'/.test(tarjeta)
    && !/ajusteDelVideoEnWeels/.test(tarjeta) && !/ajusteDelVideoEnWeels/.test(filaDeWeels));
}
{
  /* La flecha: rol, etiqueta, círculo propio y 48 de zona táctil sin tapar el gesto. */
  const svc = servicio([{ documents: [], lastDoc: null, hasMore: false }]);
  const e = pantalla(svc);
  e.dibujar(); e.enfocar(); await e.calma();
  const d = e.dibujar();
  const flecha = d.botones.find((b) => b.etiqueta === tEs('common.back'));
  check('D4) la flecha ← existe, es un botón y dice qué hace (`common.back`, del i18n)', !!flecha && flecha.rol === 'button', JSON.stringify(flecha && { etiqueta: flecha.etiqueta, rol: flecha.rol }));
  const flechas = feed.match(/<TouchableOpacity onPress=\{(onBack|handleBack)\}[^>]*>/g) || [];
  check('D4) las dos flechas (la de cada Weël y la del estado vacío) llevan rol, etiqueta, círculo propio y zona ampliada',
    flechas.length === 2 && flechas.every((f) => /accessibilityRole="button"/.test(f) && /accessibilityLabel=\{t\('common\.back'\)\}/.test(f) && /style=\{styles\.botonDeCabecera\}/.test(f) && /hitSlop=\{ZONA_EXTRA_DEL_BOTON\}/.test(f)), flechas.join(' | '));
  const boton = feed.match(/botonDeCabecera: \{([^}]*)\}/)?.[1] || '';
  const extra = feed.match(/ZONA_EXTRA_DEL_BOTON = \{ top: (\d+), bottom: (\d+), left: (\d+), right: (\d+) \}/);
  const lado = Number(boton.match(/width: (\d+)/)?.[1]);
  const zona = extra ? lado + Number(extra[1]) + Number(extra[2]) : 0;
  check('D4) con fondo oscuro propio (no se confunde con lo que trae el vídeo) y 44–48 de zona táctil, ni un punto más',
    /backgroundColor: 'rgba\(0,0,0,0\.\d+\)'/.test(boton) && /borderRadius: 22/.test(boton) && lado === 44 && Number(boton.match(/height: (\d+)/)?.[1]) === 44 && zona >= 44 && zona <= 48, `círculo ${lado} · zona ${zona}`);
  check('D4) la cabecera deja pasar el gesto vertical fuera de sus botones y respeta la zona segura',
    /styles\.topGradient, \{ paddingTop: insets\.top, pointerEvents: 'box-none' \}/.test(feed));
  check('CONTROL: la flecha de antes (sin rol, sin etiqueta, pintada a pelo) se cazaría',
    !/accessibilityLabel=\{t\('common\.back'\)\}/.test('<TouchableOpacity onPress={onBack} style={styles.backButton}>'));
}
{
  /* Salir de Weëls: la flecha y el Atrás de Android, al mismo sitio. */
  const salir = async (pila, como) => {
    const e = pantalla(servicio([{ documents: [], lastDoc: null, hasMore: false }]), { pila });
    e.dibujar(); e.enfocar(); await e.calma();
    const d = e.dibujar();
    e.olvidar();
    if (como === 'flecha') { e.tocar(tEs('common.back'), d); return { nav: e.navegacion.slice() }; }
    e.enfocar();
    const devuelto = e.atras();
    return { nav: e.navegacion.slice(), devuelto };
  };
  const alWall = (n) => n.length === 1 && n[0][0] === 'popTo' && n[0][1] === 'Main' && n[0][2]?.screen === 'Home';
  const desdeElWall = await salir(['Main', 'Reels'], 'flecha');
  check('D5) con historial que viene del Wäll, la flecha vuelve por él (`goBack`)', JSON.stringify(desdeElWall.nav) === '[["goBack"]]', JSON.stringify(desdeElWall.nav));
  const sinHistorial = await salir(['Reels'], 'flecha');
  check('D5) SIN historial (enlace /weels, recarga, reinicio), la flecha lleva al Wäll explícitamente (`Main` → `Home`)', alWall(sinHistorial.nav), JSON.stringify(sinHistorial.nav));
  const trasCrear = await salir(['Main', 'CrearWeel', 'Reels'], 'flecha');
  check('D5) y nunca reabre una pantalla de crear que quedara detrás: va al Wäll', alWall(trasCrear.nav), JSON.stringify(trasCrear.nav));
  const desdeComunidad = await salir(['Main', 'Community', 'Reels'], 'flecha');
  check('D5) desde los Weëls de una comunidad, vuelve a la comunidad (historial)', JSON.stringify(desdeComunidad.nav) === '[["goBack"]]', JSON.stringify(desdeComunidad.nav));
  const atrasWall = await salir(['Main', 'Reels'], 'atras');
  const atrasSin = await salir(['Reels'], 'atras');
  check('D6) el Atrás de Android en el feed hace lo MISMO que la flecha, y lo consume (la app no se cierra sin historial)',
    atrasWall.devuelto === true && JSON.stringify(atrasWall.nav) === '[["goBack"]]' && atrasSin.devuelto === true && alWall(atrasSin.nav),
    JSON.stringify([atrasWall, atrasSin]));
  const S = base('utils/salidaDeWeels.ts');
  const nav = (p, conPopTo = true) => { const n = []; return { n, goBack: () => n.push(['goBack']), navigate: (...a) => n.push(['navigate', ...a]), ...(conPopTo ? { popTo: (...a) => n.push(['popTo', ...a]) } : {}), canGoBack: () => p.length > 1, getState: () => ({ index: p.length - 1, routes: p.map((name) => ({ name })) }) }; };
  const sinPopTo = nav(['Reels'], false); S.salirDeWeels(sinPopTo);
  check('D6) sin `popTo` (otro navegador), también llega al Wäll con `navigate`', JSON.stringify(sinPopTo.n) === '[["navigate","Main",{"screen":"Home"}]]', JSON.stringify(sinPopTo.n));
  const viejo = nav(['Reels']); viejo.goBack();
  const nuevoNav = nav(['Reels']); S.salirDeWeels(nuevoNav);
  check('CONTROL: la salida de antes (`goBack` a secas) sin historial dejaba atrapado o cerraba la app; la de ahora va al Wäll',
    viejo.n[0][0] === 'goBack' && !alWall(viejo.n) && alWall(nuevoNav.n));
  check('D6) el gesto desde el borde sale por el mismo camino', /\.start\(\(\) => \{ if \(props\.onBack\) props\.onBack\(\); else salirDeWeels\(navigation as any\); \}\)/.test(feed));
}
{
  /* Lo que no se toca: paginación, duplicados, autoplay. */
  check('D7) siguen la paginación (`getVideoPostsPaginated` con `lastDoc`), el descarte de duplicados (`loadedIds`) y el autoplay por visibilidad',
    /getVideoPostsPaginated\(15, lastDoc \|\| undefined, communitySlug\)/.test(feed)
    &&/loadedIds\.current\.has\(/.test(feed) && /isActive && !isPaused/.test(feed) && /onViewableItemsChanged/.test(feed));
}

console.log('\n─── E. R9: los comentarios se abren ENCIMA del Weël, sin salir de él ───');
/*
 * En el teléfono (3237752c) tocar el icono de comentarios de un Weël navegaba a «Publicación» (PostDetail): se salía del
 * Weël. El dueño: que se vea en transparente, sin salir. Se reutiliza la hoja de comentarios del muro
 * (`HojaDeComentarios` + `ComentariosContext` + `useComentarios`), en su modo `sobreVideo`.
 */
{
  const coment = comentariosDoble();
  const videos = {};
  const svc = servicio([{ documents: [WEEL('w1', { comments: 3, createdAt: { toDate: () => new Date(0) } }), WEEL('w2', { comments: 7, createdAt: { toDate: () => new Date(0) } })], lastDoc: { id: 'c' }, hasMore: false }]);
  const e = pantalla(svc, { conLista: true, comentarios: coment, videos, pila: ['Main', 'Reels'] });
  e.dibujar(); e.enfocar(); await e.calma();
  e.dibujar();
  let d = e.dibujar();
  const iconos = d.botones.filter((b) => b.etiqueta === tEs('wall.comment'));
  check('E1) cada Weël pinta su icono de comentarios, con rol y etiqueta (`wall.comment`)', iconos.length === 2 && iconos.every((b) => b.rol === 'button'), `${iconos.length} iconos`);
  const activoAntes = Object.values(videos).map((v) => !!v.shouldPlay).join(',');
  e.olvidar();
  iconos[0].tocar();
  check('E2) tocar el icono NO navega (ni a PostDetail ni a ningún sitio): abre la hoja de ESE Weël, sobre el vídeo',
    e.navegacion.length === 0 && coment.abiertas.length === 1 && coment.abiertas[0][0] === 'w1' && coment.abiertas[0][1]?.sobreVideo === true,
    JSON.stringify({ nav: e.navegacion, abiertas: coment.abiertas }));
  d = e.dibujar();
  check('E3) el Weël sigue montado detrás (no se desmonta) y sigue reproduciéndose, en silencio mientras la hoja está abierta',
    !!videos['https://x/w1.mp4'] && videos['https://x/w1.mp4'].isMuted === true && videos['https://x/w2.mp4'].isMuted === false && !!d.html.includes('data-lista'),
    JSON.stringify({ w1: videos['https://x/w1.mp4']?.isMuted, w2: videos['https://x/w2.mp4']?.isMuted }));
  /* Atrás con la hoja abierta: la cierra y NO sale de Weëls. */
  e.enfocar();
  const devuelto = e.atras();
  check('E4) el Atrás de Android con la hoja abierta la CIERRA y no sale de Weëls', devuelto === true && coment.cerradas === 1 && e.navegacion.length === 0,
    JSON.stringify({ devuelto, cerradas: coment.cerradas, nav: e.navegacion }));
  d = e.dibujar();
  const activoDespues = Object.values(videos).map((v) => !!v.shouldPlay).join(',');
  check('E5) cerrada, el mismo Weël: misma posición en el feed (el activo no cambia) y vuelve el sonido',
    activoAntes === activoDespues && videos['https://x/w1.mp4'].isMuted === false, `${activoAntes} → ${activoDespues}`);
  e.enfocar();
  e.olvidar();
  e.atras();
  check('E5) y con la hoja cerrada, Atrás vuelve a la regla de salida de Weëls (al Wäll por el historial)', JSON.stringify(e.navegacion) === '[["goBack"]]', JSON.stringify(e.navegacion));
  /* El contador sube al comentar: lo que cuenta la hoja manda sobre el número guardado en la publicación. */
  coment.contadores.w1 = 4;
  d = e.dibujar();
  check('E6) el contador del icono sube al comentar (lo que cuenta la hoja: 3 → 4); el del otro Weël no cambia',
    /<span>4<\/span>/.test(d.html) && /<span>7<\/span>/.test(d.html) && !/<span>3<\/span>/.test(d.html), d.texto.slice(0, 200));
}
{
  const item = feed.slice(feed.indexOf('const ReelItem'), feed.indexOf('const ReelsScreen'));
  const manejador = feed.slice(feed.indexOf('const handleComment'), feed.indexOf('const handleComment') + 400);
  check('E7) comentar usa la hoja de siempre (`useComentariosDeLaPublicacion` → `abrirComentarios(post, { sobreVideo: true })`), no otra',
    /abrirComentarios\(post, \{ sobreVideo: true \}\)/.test(manejador) && !/navigate\('PostDetail'/.test(manejador) && /useComentariosDeLaPublicacion\(\)/.test(item));
  const viejo = "const handleComment = useCallback((postId) => { const post = videoPosts.find(p => p.id === postId); if (post) { navigation.navigate('PostDetail', { postId: post.id, post }); } }, []);";
  check('CONTROL: el icono de antes (navegar a PostDetail) se cazaría', /navigate\('PostDetail'/.test(viejo) && !/navigate\('PostDetail'/.test(manejador));
  check('E7) sin segunda hoja ni segundo servicio: Weëls no monta `HojaDeComentarios` ni llama a `commentsService`',
    !/<HojaDeComentarios|commentsService|useComentarios\(/.test(feed));
}
{
  /* La hoja, la de siempre, con su modo sobre vídeo. */
  const hoja = sinComentarios(leer('components/HojaDeComentarios.tsx'));
  const contexto = sinComentarios(leer('contexts/ComentariosContext.tsx'));
  check('E8) la hoja es un `Modal` transparente que sube desde abajo, con su cierre por fuera, por la ✕ y por Atrás (`onRequestClose`)',
    /<Modal visible=\{visible\} transparent animationType=\{isWeb \? 'none' : 'slide'\} onRequestClose=\{onClose\}>/.test(hoja)
    && /style=\{\[styles\.atenuado, sobreVideo && styles\.atenuadoSobreVideo\]\} activeOpacity=\{1\} onPress=\{onClose\}/.test(hoja)
    && (hoja.match(/accessibilityLabel=\{t\('wall\.closeComments'\)\}/g) || []).length >= 2);
  check('E8) sobre un Weël el fondo apenas se atenúa, la hoja es algo transparente y no pasa del 70 %',
    /atenuadoSobreVideo: \{\s*backgroundColor: 'rgba\(0,0,0,0\.12\)'/.test(hoja) && /hojaSobreVideo: \{\s*maxHeight: '70%'/.test(hoja)
    && /sobreVideo \? fondoSobreVideo\(theme\.colors\.background\)/.test(hoja));
  /* La hoja cargada con dobles (solo se ejecutan sus reglas puras: el fondo y el umbral del arrastre). */
  const numeros = new Proxy({}, { get: () => new Proxy({}, { get: () => 8 }) });
  const H = crearCargador({ dobles: {
    react: { __esModule: true, default: {}, useEffect() {}, useMemo: (f) => f(), useRef: (v) => ({ current: v }) },
    'react-native': { StyleSheet: { create: (x) => x, absoluteFillObject: {}, hairlineWidth: 1 }, Platform: { OS: 'android' }, Animated: {}, PanResponder: {} },
    'expo-image': {}, '@expo/vector-icons': {}, 'react-native-safe-area-context': {},
    '../contexts/ThemeContext': {}, '../contexts/IdiomaContext': {}, '../contexts/UserProfileContext': {}, '../services/firestoreService': {},
    '../hooks/useComentarios': {}, './avatars/AvatarDisplay': {}, './CommentCard': {}, './EspacioDeEscritura': {},
    '../constants/design': { SPACING: numeros.x, FONT_SIZE: numeros.x, FONT_WEIGHT: numeros.x, BORDER_RADIUS: numeros.x, ICON_SIZE: numeros.x },
    '../utils/scale': { scale: (x) => x },
  } })('components/HojaDeComentarios.tsx');
  check('E8) el fondo transparente se calcula sobre el color del tema (#RRGGBB → 90 %), sin romper otros formatos',
    H.fondoSobreVideo('#FFFFFF') === '#FFFFFFE6' && H.fondoSobreVideo('#0A0A0A') === '#0A0A0AE6' && H.fondoSobreVideo('white') === 'white');
  check('E9) deslizar hacia abajo cierra: el gesto vive en el asa y la cabecera (la lista conserva su scroll) y vuelve a su sitio si no basta',
    /<View \{\.\.\.gestoDeCerrar\.panHandlers\}>/.test(hoja) && /g\.dy > ARRASTRE_PARA_CERRAR \|\| g\.vy > VELOCIDAD_PARA_CERRAR\) onClose\(\)/.test(hoja)
    && /Animated\.spring\(arrastre, \{ toValue: 0/.test(hoja) && H.ARRASTRE_PARA_CERRAR === 80
    && hoja.indexOf('gestoDeCerrar.panHandlers') < hoja.indexOf('<FlatList'));
  check('E10) la conversación sale de `useComentarios` (el mismo camino que el muro y PostDetail) y su recuento vuelve al contexto',
    /useComentarios\(visible \? post : null\)/.test(hoja) && /onContar\?\.\(postId, comentarios\.length\)/.test(hoja)
    && /sobreVideo=\{sobreVideo\} onContar=\{alContar\}/.test(contexto) && /publicacionAbierta, contadores/.test(contexto));
  check('E10) el muro sigue abriéndola igual (sin `sobreVideo`): su aspecto de siempre no cambia',
    /abrirComentarios\(post\)/.test(sinComentarios(leer('screens/LandingScreen.tsx'))) && /backgroundColor: 'rgba\(31,41,55,0\.45\)'/.test(hoja));
}

check('esta suite está en la cadena de `npm test`', /weels-feed\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien: Weëls abre el feed de vídeos y el Wall conserva su compositor');
process.exit(failures ? 1 : 0);
