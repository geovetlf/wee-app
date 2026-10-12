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

const pantalla = (svc, extra = {}) => crearEntorno({
  pantalla: 'screens/ReelsScreen.tsx',
  ...extra,
  dobles: (ctx) => {
    const { h, Caja, capturar, usuario } = ctx;
    const A = animado();
    A.View = Caja;
    ctx.reactNative.Animated = A;
    ctx.reactNative.StatusBar = () => null;
    const habla = { useT: () => tEs, useIdioma: () => ({ t: tEs, locale: 'es', idioma: 'es' }) };
    return {
      'react-native': ctx.reactNative,
      'react-native-safe-area-context': { SafeAreaView: Caja, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
      '../utils/platform': { isWeb: false },
      'expo-av': { Video: capturar('Video'), ResizeMode: { COVER: 'cover', CONTAIN: 'contain' }, Audio: { setAudioModeAsync: async () => {} } },
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

check('esta suite está en la cadena de `npm test`', /weels-feed\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien: Weëls abre el feed de vídeos y el Wall conserva su compositor');
process.exit(failures ? 1 : 0);
