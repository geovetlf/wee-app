/*
 * CREAR UN WEËL ES SU PROPIO FLUJO, NO EL COMPOSITOR DEL WALL.
 *
 * El defecto (R9, 2026-10-12, visto por el dueño en Android): «Crear Weël» —la tarjeta «Tu primer Weël», el + del feed,
 * la hoja Crear del botón + y el Home— abría `Create` con `kind: 'weel'`, que es el compositor del Wall entero: «Nueva
 * publicación», «Cuenta qué creaste para tu Weël y con qué IA…», Cámara (de FOTOS), Multimedia, ËContact, Ubicación,
 * Encuesta, Mis proyectos y «Publicar en» con las secciones de Weë AI. Y un «Weël» sin vídeo se publicaba como post
 * normal del Wall.
 *
 * Ahora:
 *  A. EL CREADOR, EJECUTADO (`screens/CrearWeelScreen.tsx` con `_pantallas.mjs`): sin «Publicar en», encuesta, ËContact,
 *     ubicación ni proyectos; elige un VÍDEO de la galería (grabar con la cámara espera la autorización del permiso de
 *     micrófono: i18n-permisos-ios F3), rechaza > 15 s y fotos, avisa de horizontal; publica con la subida y
 *     el `postsService.create` de siempre como `Post` con `isWeel: true` en el muro general; si falla lo dice y reintenta
 *     sin volver a subir lo ya subido; un vídeo que ya es material de la cuenta no se sube; vuelve al feed con el nuevo.
 *  B. LAS REGLAS, PURAS (`utils/crearWeel.ts`).
 *  C. LAS ENTRADAS Y EL WALL, LEÍDOS: todo «crear Weël» va a `CrearWeel` (y `Create` con `kind: 'weel'` se sustituye por
 *     él antes de pintar); todo «ver Weëls» va a `Reels`; el compositor del Wall conserva destinos, encuesta, ËContact y
 *     ubicación y ya no marca Weëls; sin segundo feed, ni segundo servicio, ni arrastre de estado.
 *  D. R9 EN EL TELÉFONO: la ayuda de la descripción se ve entera (el marco se mide contra el alto visible), la vista
 *     previa no recorta lo que no es vertical, y el ✕ / Atrás vuelven al feed de Weëls, nunca al compositor.
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
const ES = base('i18n/textos/es/index.ts').es;
const EN = base('i18n/textos/en/index.ts').en;
const tEs = crearTraductor('es', { es: ES, en: EN }, {});

/** Lo que el compositor del Wall tiene y un Weël no: si se ve uno solo, esto no es el creador de Weëls. */
const DEL_WALL = [tEs('composer.newPost'), tEs('composer.publishIn'), 'Encuesta', 'ËContact', 'Ubicación', 'Mis proyectos', 'Cuenta qué creaste'];
const pareceElWall = (texto) => DEL_WALL.some((x) => texto.includes(x));

/**
 * El creador montado de verdad. `o.subidas` y `o.guardados` son las respuestas de la subida y de `postsService.create`
 * (un Error = falla esa vez); `o.confirmar` lo que contesta la persona al aviso de horizontal.
 */
const creador = (o = {}) => {
  const reg = { subidas: [], guardados: [], confirmaciones: [], enfoques: [] };
  /* La pila de pantallas, la de abajo primero: por defecto, abierto con el + de Weëls (R9, salir del creador). */
  const pila = o.pila || ['Reels', 'CrearWeel'];
  let nSubida = 0;
  let nGuardado = 0;
  const e = crearEntorno({
    pantalla: 'screens/CrearWeelScreen.tsx',
    usuario: o.usuario === undefined ? { uid: 'u1' } : o.usuario,
    params: o.params,
    dobles: (ctx) => {
      const { h, capturar, navegacion, avisos, colores } = ctx;
      /* La caja de la descripción y el desplazable, capturados: sus propiedades son el contrato que se mira en D. */
      ctx.reactNative.TextInput = capturar('TextInput', () => h('textarea'));
      ctx.reactNative.ScrollView = capturar('ScrollView');
      const habla = { useT: () => tEs, useIdioma: () => ({ t: tEs, locale: 'es', idioma: 'es' }) };
      return {
        'expo-av': { Video: capturar('Video'), ResizeMode: { COVER: 'cover', CONTAIN: 'contain' } },
        'expo-image-picker': {
          UIImagePickerControllerQualityType: { Medium: 1 },
          requestCameraPermissionsAsync: async () => ({ granted: o.permiso !== false }),
          requestMediaLibraryPermissionsAsync: async () => ({ granted: o.permiso !== false }),
          launchCameraAsync: async (opc) => { reg.camara = opc; return o.elegido ?? { canceled: true }; },
          launchImageLibraryAsync: async (opc) => { reg.galeria = opc; return o.elegido ?? { canceled: true }; },
        },
        '@react-navigation/native': {
          useNavigation: () => ({
            navigate: (...a) => navegacion.push(['navigate', ...a]), goBack: () => navegacion.push(['goBack']),
            popTo: (...a) => navegacion.push(['popTo', ...a]),
            canGoBack: () => pila.length > 1,
            getState: () => ({ index: pila.length - 1, routes: pila.map((name) => ({ name })) }),
          }),
          useFocusEffect: (cb) => { reg.enfoques.push(cb); },
          useRoute: () => ({ params: o.params }),
        },
        'firebase/firestore': { Timestamp: { now: () => 'AHORA' } },
        '../contexts/ThemeContext': { useTheme: () => ({ theme: { colors: colores } }) },
        '../contexts/IdiomaContext': habla,
        '../contexts/AuthContext': { useAuth: () => ({ user: o.usuario === undefined ? { uid: 'u1' } : o.usuario }) },
        '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: o.usuario === null ? null : { uid: 'hidi_u1' } }) },
        '../contexts/ScrollContext': { useScroll: () => ({ triggerRefresh: () => { reg.refrescos = (reg.refrescos || 0) + 1; } }) },
        '../services/cloudinaryService': {
          uploadVideoToCloudinary: async (uri) => {
            reg.subidas.push(uri);
            const r = (o.subidas || ['https://cdn/v.mp4'])[Math.min(nSubida++, (o.subidas || [1]).length - 1)];
            if (r instanceof Error) throw r;
            return r;
          },
        },
        '../services/firestoreService': {
          postsService: {
            create: async (datos) => {
              reg.guardados.push(datos);
              const r = (o.guardados || ['post-nuevo'])[Math.min(nGuardado++, (o.guardados || [1]).length - 1)];
              if (r instanceof Error) throw r;
              return r;
            },
          },
        },
        '../utils/notify': {
          notify: (titulo, mensaje) => avisos.push(`${titulo}\n${mensaje}`),
          confirmAction: async (titulo) => { reg.confirmaciones.push(titulo); return o.confirmar !== false; },
        },
        _h: h,
      };
    },
  });
  e.reg = reg;
  return e;
};

const VIDEO = (extra = {}) => ({ canceled: false, assets: [{ uri: 'file:///v.mp4', type: 'video', duration: 10000, width: 1080, height: 1920, ...extra }] });
const silenciar = async (f) => { const err = console.error; console.error = () => {}; try { return await f(); } finally { console.error = err; } };

console.log('\n─── A. El creador de Weëls, ejecutado ───');
{
  const e = creador();
  const d = e.dibujar();
  check('A1) abre el creador de Weëls: su título es «Crear Weël»', d.texto.includes(tEs('weels.create')), d.texto.slice(0, 120));
  check('A1) y NO es el compositor del Wall: ni «Nueva publicación», ni «Publicar en», ni encuesta, ËContact, ubicación ni proyectos',
    !pareceElWall(d.texto), DEL_WALL.filter((x) => d.texto.includes(x)).join(' · '));
  check('A1) ofrece elegir el vídeo de la galería, y NO grabarlo (el permiso de micrófono no está autorizado)',
    d.botones.some((b) => b.etiqueta === tEs('weels.pickVideo')) && !d.botones.some((b) => /grabar|record/i.test(b.etiqueta || '')));
  check('A1) la descripción reutiliza la ayuda de siempre del Weël (`composer.placeholderWeel`, viva en producción)',
    /placeholder=\{t\('composer\.placeholderWeel'\)\}/.test(leer('screens/CrearWeelScreen.tsx')));
  check('A1) y dice el requisito: vertical, hasta 15 s', d.texto.includes(tEs('weels.requirements', { segundos: 15 })));
  check('A1) sin vídeo no se puede publicar', d.botones.find((b) => b.etiqueta === tEs('weels.publish'))?.apagado === true);
  check('CONTROL: el detector de «esto es el Wall» caza la pantalla vieja', pareceElWall('Nueva publicación Publicar en Wall general') && !pareceElWall(d.texto));
}
{
  const e = creador({ elegido: VIDEO() });
  await e.tocar(tEs('weels.pickVideo'));
  check('A2) la cámara no se abre nunca (grabar vídeo exige el micrófono, pendiente de autorización)', e.reg.camara === undefined);
  check('A2) CONTROL: una pantalla que grabase con la cámara se cazaría (la misma vara que i18n-permisos-ios F3)',
    /launchCameraAsync\(\{[^}]*videos/.test("launchCameraAsync({ mediaTypes: ['videos'] })") && !/launchCameraAsync|recordAsync/.test(leer('screens/CrearWeelScreen.tsx')));
  const d = e.dibujar();
  check('A2) con un vídeo vertical de 10 s: vista previa, «Cambiar video» y Publicar encendido',
    !!e.capturas.Video && d.botones.some((b) => b.etiqueta === tEs('weels.changeVideo')) && d.botones.find((b) => b.etiqueta === tEs('weels.publish'))?.apagado === false);
}
{
  const e = creador({ elegido: VIDEO() });
  await e.tocar(tEs('weels.pickVideo'));
  check('A3) la galería pide SOLO vídeos y uno', JSON.stringify(e.reg.galeria?.mediaTypes) === '["videos"]' && e.reg.galeria?.allowsMultipleSelection === false, JSON.stringify(e.reg.galeria));
}
{
  const e = creador({ elegido: VIDEO({ duration: 20000 }) });
  await e.tocar(tEs('weels.pickVideo'));
  const d = e.dibujar();
  check('A4) un vídeo de 20 s se rechaza diciendo cuánto dura, antes de subir nada',
    e.avisos.length === 1 && e.avisos[0].startsWith(tEs('composer.weelTooLong')) && e.avisos[0].includes('20') && !e.capturas.Video && e.reg.subidas.length === 0, e.avisos.join(' | '));
  check('A4) y Publicar sigue apagado', d.botones.find((b) => b.etiqueta === tEs('weels.publish'))?.apagado === true);
}
{
  const e = creador({ elegido: VIDEO({ type: 'image' }) });
  await e.tocar(tEs('weels.pickVideo'));
  e.dibujar();
  check('A5) una foto no es un Weël: no queda elegida', !e.capturas.Video);
}
{
  const no = creador({ elegido: VIDEO({ width: 1920, height: 1080 }), confirmar: false });
  await no.tocar(tEs('weels.pickVideo'));
  no.dibujar();
  const si = creador({ elegido: VIDEO({ width: 1920, height: 1080 }), confirmar: true });
  await si.tocar(tEs('weels.pickVideo'));
  si.dibujar();
  check('A6) un vídeo horizontal pregunta antes de usarse: «no» lo deja fuera, «sí» lo usa',
    no.reg.confirmaciones[0] === tEs('weels.horizontalTitle') && !no.capturas.Video && si.reg.confirmaciones.length === 1 && !!si.capturas.Video);
  const vertical = creador({ elegido: VIDEO() });
  await vertical.tocar(tEs('weels.pickVideo'));
  check('A6) CONTROL: uno vertical no pregunta nada', vertical.reg.confirmaciones.length === 0);
}
{
  const e = creador({ elegido: VIDEO() });
  await e.tocar(tEs('weels.pickVideo'));
  await e.tocar(tEs('weels.publish'));
  await e.calma();
  const g = e.reg.guardados[0] || {};
  check('A7) publicar sube el vídeo UNA vez con la subida de siempre y guarda UNA publicación',
    e.reg.subidas.length === 1 && e.reg.subidas[0] === 'file:///v.mp4' && e.reg.guardados.length === 1, `${e.reg.subidas.length} subidas · ${e.reg.guardados.length} guardados`);
  check('A7) es un `Post` con `isWeel: true`, el vídeo subido y de la cara activa',
    g.isWeel === true && g.videoUrl === 'https://cdn/v.mp4' && g.userId === 'hidi_u1' && g.isPrivate === false && g.createdAt === 'AHORA', JSON.stringify(g).slice(0, 200));
  check('A7) en el destino de Weëls (el muro general), nunca en una sección de Weë AI',
    JSON.stringify(g.destinations) === '["general"]' && !('sourceSection' in g), JSON.stringify(g.destinations));
  check('A7) sin nada del Wall: ni encuesta, ni ËContact, ni lugar, ni ubicación',
    !('poll' in g) && !('econtacts' in g) && !('place' in g) && !('ubicacion' in g));
  check('A7) y vuelve al feed de Weëls con el nuevo el primero (`popTo` Reels con `recienPublicado`)',
    e.navegacion.length === 1 && e.navegacion[0][0] === 'popTo' && e.navegacion[0][1] === 'Reels' && e.navegacion[0][2]?.recienPublicado?.id === 'post-nuevo'
    && e.navegacion[0][2].recienPublicado.isWeel === true && e.reg.refrescos === 1, JSON.stringify(e.navegacion).slice(0, 160));
}
{
  const e = creador({ elegido: VIDEO(), subidas: [new Error('sin red'), 'https://cdn/v2.mp4'] });
  await e.tocar(tEs('weels.pickVideo'));
  await silenciar(() => e.tocar(tEs('weels.publish')));
  await e.calma();
  const d = e.dibujar();
  check('A8) si la subida falla, lo dice, el vídeo sigue elegido y hay Reintentar (sin navegar)',
    d.texto.includes(tEs('weels.publishFailed')) && !!e.capturas.Video && d.botones.some((b) => b.etiqueta === tEs('common.retry')) && e.navegacion.length === 0, d.texto.slice(0, 160));
  await e.tocar(tEs('common.retry'));
  await e.calma();
  check('A8) y el reintento vuelve a subir y publica', e.reg.subidas.length === 2 && e.reg.guardados.length === 1 && e.reg.guardados[0].videoUrl === 'https://cdn/v2.mp4' && e.navegacion.length === 1,
    `${e.reg.subidas.length} subidas · ${e.reg.guardados.length} guardados`);
}
{
  const e = creador({ elegido: VIDEO(), guardados: [new Error('permiso'), 'post-2'] });
  await e.tocar(tEs('weels.pickVideo'));
  await silenciar(() => e.tocar(tEs('weels.publish')));
  await e.calma();
  e.dibujar();
  await e.tocar(tEs('common.retry'));
  await e.calma();
  check('A9) si falla GUARDAR, reintentar no vuelve a subir el vídeo ya subido', e.reg.subidas.length === 1 && e.reg.guardados.length === 2 && e.navegacion.length === 1,
    `${e.reg.subidas.length} subidas · ${e.reg.guardados.length} guardados`);
}
{
  const e = creador({ params: { video: { uri: 'https://storage/wee/a.mp4', assetId: 'asset_1', segundos: 8, ancho: 720, alto: 1280 }, prefill: { aiTools: ['Seedance'], aiProcess: 'Weë Studio' } } });
  const d = e.dibujar();
  await e.tocar(tEs('weels.publish'), d);
  await e.calma();
  const g = e.reg.guardados[0] || {};
  check('A10) un vídeo que ya es material de la cuenta (Weë AI / Mis creaciones) no se vuelve a subir: se referencia',
    e.reg.subidas.length === 0 && g.videoUrl === 'https://storage/wee/a.mp4' && g.videoAssetId === 'asset_1', JSON.stringify(g).slice(0, 160));
  check('A10) y «Cómo lo hice» lo apunta Weë, como en las publicaciones', JSON.stringify(g.aiTools) === '["Seedance"]' && g.aiProcess === 'Weë Studio');
}
{
  const e = creador({ params: { video: { uri: 'https://storage/wee/a.mp4', segundos: 40 } } });
  e.dibujar();
  check('A11) un vídeo de entrada de más de 15 s no se acepta en silencio', !e.capturas.Video);
}
{
  const e = creador({ usuario: null, elegido: VIDEO() });
  await e.tocar(tEs('weels.pickVideo'));
  const d = e.dibujar();
  check('A12) sin sesión no se publica', d.botones.find((b) => b.etiqueta === tEs('weels.publish'))?.apagado === true);
}

console.log('\n─── B. Las reglas, puras ───');
const W = base('utils/crearWeel.ts');
check('B1) 15 s vale; 15,1 s no, con su duración', W.validarVideoDeWeel({ uri: 'x', segundos: 15 }).ok === true
  && W.validarVideoDeWeel({ uri: 'x', segundos: 15.1 }).ok === false && W.validarVideoDeWeel({ uri: 'x', segundos: 15.1 }).segundos === 15.1);
check('B2) horizontal vale con aviso; vertical, cuadrado o sin medidas, sin aviso',
  W.validarVideoDeWeel({ uri: 'x', ancho: 1920, alto: 1080 }).aviso === 'horizontal' && !W.validarVideoDeWeel({ uri: 'x', ancho: 1080, alto: 1920 }).aviso
  && !W.validarVideoDeWeel({ uri: 'x', ancho: 1080, alto: 1080 }).aviso && W.validarVideoDeWeel({ uri: 'x' }).ok === true);
check('B3) sin vídeo no hay Weël', W.validarVideoDeWeel(null).ok === false && W.validarVideoDeWeel({ uri: '' }).ok === false);
const doc = W.datosDelWeel({ userId: 'u', descripcion: `  Hola #ia ${'x'.repeat(300)}  `, videoUrl: 'https://v', aiTools: [' a ', '', 'b'] });
check('B4) el documento es un Weël del muro general con la forma de un post',
  doc.isWeel === true && doc.videoUrl === 'https://v' && JSON.stringify(doc.destinations) === '["general"]' && doc.likes === 0 && doc.isPrivate === false
  && Array.isArray(doc.imageUrls) && doc.imageUrls.length === 0);
check('B5) la descripción va recortada a 150 y con sus hashtags', doc.content.length === W.MAX_DESCRIPCION_WEEL && doc.content.startsWith('Hola #ia') && JSON.stringify(doc.hashtags) === '["#ia"]');
check('B6) y no lleva nada del Wall', ['poll', 'econtacts', 'place', 'ubicacion', 'sourceSection'].every((k) => !(k in doc)) && JSON.stringify(doc.aiTools) === '["a","b"]');
check('CONTROL: un documento con destinos de Weë AI se vería', JSON.stringify(['general', 'design']) !== JSON.stringify(doc.destinations));

console.log('\n─── C. Las entradas y el Wall, leídos ───');
const codigo = (p) => sinComentarios(leer(p));
const landing = codigo('screens/LandingScreen.tsx');
const web = codigo('screens/WebLandingScreen.tsx');
const reels = codigo('screens/ReelsScreen.tsx');
const global = codigo('navigation/NavegacionGlobal.tsx');
const pestanas = codigo('navigation/TabNavigator.tsx');
const pila = codigo('navigation/MainStackNavigator.tsx');
const app = codigo('App.tsx');
const compositor = codigo('screens/CreateScreen.tsx');
const nuevo = codigo('screens/CrearWeelScreen.tsx');

/* Crear Weël: cada entrada, a `CrearWeel`. */
const aCrearWeel = (c) => /navigate\((?:user \? )?'CrearWeel'/.test(c) || /(?:irARaiz|rootNavigate)\('CrearWeel'\)/.test(c);
const aCompositorEnModoWeel = (c) => /'Create'[^;\n]{0,80}kind: 'weel'/.test(c);
check('C1) el Home nativo («Tu primer Weël» / «Crear Weël» de la fila) abre `CrearWeel`', /const crearWeel = useCallback[\s\S]{0,300}navigate\(user \? 'CrearWeel' : 'Login'\)/.test(landing));
check('C1) la portada web, igual', /const handleCreateWeel = [\s\S]{0,300}navigate\('CrearWeel'\)/.test(web));
check('C1) el + del feed de Weëls, igual (con la comunidad si se está en la de una)', /navigate\(user \? 'CrearWeel' : 'Login', user \? \(communitySlug \? \{ communitySlug \} : undefined\) : undefined\)/.test(reels));
check('C1) la hoja Crear del botón + (barra global y barra de pestañas): `weel` → `CrearWeel`, lo demás → `Create`',
  /if \(kind === 'weel'\) return void setTimeout\(\(\) => irARaiz\('CrearWeel'\)/.test(global) && /setTimeout\(\(\) => irARaiz\('Create', \{ kind \}\)/.test(global)
  && /if \(kind === 'weel'\) return void setTimeout\(\(\) => rootNavigate\('CrearWeel'\)/.test(pestanas) && /setTimeout\(\(\) => rootNavigate\('Create', \{ kind \}\)/.test(pestanas));
const fuentesCliente = ['screens/LandingScreen.tsx', 'screens/WebLandingScreen.tsx', 'screens/ReelsScreen.tsx', 'navigation/NavegacionGlobal.tsx', 'navigation/TabNavigator.tsx',
  'components/Sidebar.tsx', 'components/DrawerMenu.tsx', 'components/WeelsRow.tsx', 'components/CreateSheet.tsx', 'screens/CommunityScreen.tsx', 'screens/ProfileScreen.tsx', 'screens/UserProfileScreen.tsx'];
const culpables = fuentesCliente.filter((f) => aCompositorEnModoWeel(codigo(f)));
check('C2) ninguna entrada manda ya al compositor en modo Weël (`Create` con `kind: weel`)', culpables.length === 0, culpables.join(', '));
check('C2) CONTROL: la entrada vieja se caza', aCompositorEnModoWeel("navigate(user ? 'Create' : 'Login', user ? { kind: 'weel' } : undefined)") && aCrearWeel("navigate(user ? 'CrearWeel' : 'Login')"));
const envoltorio = pila.slice(pila.indexOf('const CreateWrapper'), pila.indexOf('const MainStackNavigator'));
check('C3) la puerta vieja (`/publicar?kind=weel`, una recarga, la barra lateral) se SUSTITUYE por `CrearWeel` sin pintar el compositor',
  /if \(pideWeel\(useRoute\(\)\)\) return <HaciaCrearWeel \/>;\s*return isDesktop/.test(envoltorio) && /StackActions\.replace\('CrearWeel'\)/.test(envoltorio)
  && /=== 'weel'/.test(pila.slice(pila.indexOf('const pideWeel'), pila.indexOf('const pideWeel') + 160)));
check('C3) `CrearWeel` es una ruta propia de la pila principal, registrada una vez', (pila.match(/name="CrearWeel"\s*component=\{CrearWeelWrapper\}/g) || []).length === 1);
/* Las publicaciones de `Reels` no declaran forma a propósito: la red de seguridad las deja fuera (navegacion-enlaces 24 lo ejecuta). */
const enlaceReels = app.slice(app.indexOf("Reels: {\n        path: 'weels'"), app.indexOf('CrearWeel: {'));
check('C3) y la web sabe leer sus direcciones: /weels (con /Reels de alias) y /weels/crear, sin publicaciones ni vídeos en la URL',
  /Reels: \{\s*path: 'weels',\s*alias: \['Reels'\]/.test(app) && /CrearWeel: \{\s*path: 'weels\/crear'/.test(app) && /video: nuncaEnLaUrl, prefill: nuncaEnLaUrl/.test(app)
  && /communitySlug: \(v: unknown\) =>/.test(enlaceReels) && !/initialPost|initialVideoPosts|recienPublicado/.test(enlaceReels));

/* Ver Weëls: cada entrada, a `Reels`. */
const menu = codigo('components/DrawerMenu.tsx');
const lateral = codigo('components/Sidebar.tsx');
const fila = codigo('components/WeelsRow.tsx');
check('C4) ver: el menú ☰ y la barra lateral entran por el feed (`openWeels`)', /openWeels: true/.test(menu) && /openWeels: true/.test(lateral));
check('C4) ver: la fila del Home y «Ver todos» abren el visor; un vídeo del muro también',
  /onOpenWeels=\{\(\) => abrirElVisor\(\)\}/.test(landing) && /onOpenWeels=\{handleOpenWeels\}/.test(web) && /handleVideoPress = useCallback\(\(post: Post\) => abrirElVisor\(post\)/.test(landing)
  && (fila.match(/onPress=\{onOpenWeels\}/g) || []).length >= 2);
check('C4) ver: perfil, perfil ajeno y comunidad abren `Reels`', ['screens/ProfileScreen.tsx', 'screens/UserProfileScreen.tsx', 'screens/CommunityScreen.tsx'].every((f) => /navigate\('Reels'/.test(codigo(f))));

/* El Wall, intacto. */
check('C5) el Wall conserva su compositor: «Publicar en» con sus destinos, encuesta, ËContact y ubicación',
  /destinosDisponibles\(\)/.test(compositor) && /t\('composer\.publishIn'\)/.test(compositor) && /construirPoll/.test(compositor) && /econtacts/.test(compositor) && /AgregarUbicacion/.test(compositor)
  && /useState<string\[\]>\(\(\) => \[sourceSection \|\| MURO_GENERAL\]\)/.test(compositor));
check('C5) y ya no publica Weëls: ni marca `isWeel`, ni tiene modo Weël', !/isWeel/.test(compositor) && !/'weel'/.test(compositor) && !/placeholderWeel/.test(compositor));
check('C5) la frase «Cuenta qué creaste para tu Weël…» sigue viva, ahora como ayuda de la descripción del creador (no del compositor)',
  typeof ES.composer.placeholderWeel === 'string' && typeof EN.composer.placeholderWeel === 'string' && /composer\.placeholderWeel/.test(nuevo));

/* Sin duplicados. */
check('C6) el creador usa los servicios de siempre: `uploadVideoToCloudinary` y `postsService.create`',
  /import \{ uploadVideoToCloudinary \} from '\.\.\/services\/cloudinaryService'/.test(nuevo) && /postsService\.create\(/.test(nuevo) && /import \{ postsService \} from '\.\.\/services\/firestoreService'/.test(nuevo));
check('C6) sin otra colección, otro almacén, ni otra subida', !/collection\(|addDoc|setDoc|fetch\(|uploadBytes|AsyncStorage|localStorage/.test(nuevo));
check('C6b) se acomoda al teclado como el resto de pantallas con campos (`EspacioDeEscritura`)', /<EspacioDeEscritura/.test(nuevo));
check('C6) y sin nada del Wall dentro: ni destinos, ni encuesta, ni ËContact, ni ubicación, ni proyectos',
  !/destinosDisponibles|pollDraft|SelectorDeEContacts|AgregarUbicacion|'Projects'|publishIn/.test(nuevo));
check('C6) un solo feed de vídeos: solo `ReelsScreen` pide `getVideoPostsPaginated` entre las pantallas de Weëls',
  /getVideoPostsPaginated/.test(reels) && !/getVideoPostsPaginated/.test(nuevo) && (pila.match(/name="Reels"/g) || []).length === 1);
check('C6) CONTROL: un creador que escribiera a su propia colección se vería', /collection\(|addDoc/.test("addDoc(collection(db, 'weels'), d)"));

/* Sin arrastre de estado entre los dos flujos. */
check('C7) cada flujo es su propia ruta con su propio estado: nada de borradores compartidos',
  !/AsyncStorage|localStorage|borrador/i.test(nuevo) && !/AsyncStorage|localStorage/.test(compositor) && !/from '\.\/CreateScreen'|from '\.\.\/screens\/CreateScreen'/.test(nuevo));
check('C7) el compositor del Wall solo arranca sus destinos con el muro de donde se abrió (nunca con algo de Weëls)', !/weel/i.test(compositor.slice(compositor.indexOf('const [destinos'), compositor.indexOf('const [destinos') + 120)));

/* El feed, conectado con el creador. */
check('C8) el feed pone delante el Weël recién publicado sin volver a pedir la página',
  /const recienPublicado = params\.recienPublicado;/.test(reels) && /setVideoPosts\(\(prev\) => \[recienPublicado, \.\.\.prev/.test(reels) && /loadedIds\.current\.add\(recienPublicado\.id\)/.test(reels)
  && /recienPublicado\?: Post;/.test(pila));

/* i18n. */
const CLAVES = ['pickVideo', 'changeVideo', 'preview', 'requirements', 'descriptionLabel', 'publish', 'uploading', 'publishing', 'publishFailed', 'horizontalTitle', 'horizontalBody', 'horizontalAccept', 'galleryForVideo'];
check('C9) los textos del creador salen del i18n (es y en)', CLAVES.every((k) => typeof ES.weels[k] === 'string' && typeof EN.weels[k] === 'string' && ES.weels[k] !== EN.weels[k]));

console.log('\n─── D. R9 en el teléfono: la descripción entera, la vista previa sin recortar y volver al feed ───');
/*
 * Lo que se vio en el Z Flip3 (build 2b0dcaab): la segunda línea de la ayuda de la descripción («…y con qué IA») quedaba
 * cortada, porque el marco 9:16 se medía con el ANCHO y empujaba la caja fuera de la pantalla. Y el dueño decidió que un
 * vídeo que no es vertical se ve ENTERO (contain) y que volver del creador lleva al feed de Weëls, nunca al compositor.
 */
const plano = (st) => (Array.isArray(st) ? Object.assign({}, ...st.flat(Infinity).filter(Boolean).map(plano)) : (st || {}));
{
  const e = creador();
  e.dibujar();
  const caja = e.capturas.TextInput || {};
  const est = plano(caja.style);
  const dosLineas = 2 * W.LINEA_DE_LA_DESCRIPCION + 24;
  check('D1) la caja de la descripción es multilínea, sin `numberOfLines` que limite la ayuda y sin alto fijo',
    caja.multiline === true && caja.numberOfLines === undefined && est.height === undefined, JSON.stringify({ multiline: caja.multiline, numberOfLines: caja.numberOfLines, height: est.height }));
  check('D1) y mide al menos DOS líneas de su ayuda (alto de línea × 2 + relleno), con su alto de línea declarado',
    est.lineHeight === W.LINEA_DE_LA_DESCRIPCION && est.minHeight >= dosLineas && est.maxHeight >= est.minHeight, JSON.stringify(est));
  check('D1) la ayuda es la de siempre (`composer.placeholderWeel`), que en el teléfono ocupa dos líneas',
    caja.placeholder === tEs('composer.placeholderWeel') && caja.placeholder.length > 40);
  check('D1) con la letra grande de la persona, la caja crece con ella (escala 1,6 → más de 72; 0,8 → los 72 de siempre)',
    W.altoMinimoDeLaDescripcion(1.6) > 72 && W.altoMinimoDeLaDescripcion(1.6) >= Math.ceil(2 * W.LINEA_DE_LA_DESCRIPCION * 1.6) + 24 && W.altoMinimoDeLaDescripcion(0.8) === 72);
  const sv = e.capturas.ScrollView || {};
  const cont = plano(sv.contentContainerStyle);
  check('D2) el desplazable sigue siendo el de siempre: sin alto fijo ni `flex` que lo encierre, y se mide con `onLayout`',
    typeof sv.onLayout === 'function' && cont.height === undefined && cont.flex === undefined && cont.maxHeight === undefined && sv.keyboardShouldPersistTaps === 'handled', JSON.stringify(cont));
  check('D2) y la descripción está DENTRO del desplazable (se puede bajar hasta ella en cualquier pantalla)',
    /<ScrollView[\s\S]*?<TextInput[\s\S]*?<\/ScrollView>/.test(nuevo));
}
{
  /* El marco cabe con la descripción entera debajo, en varios altos de pantalla. */
  const reserva = (alto) => 8 + 16 + alto + 20 + 12;
  const cabe = (ancho, alto, desc) => { const m = W.medidaDelMarcoDelWeel(ancho, alto, desc); return m.height + reserva(desc) <= alto + 1e-6; };
  const forma = (m) => Math.abs(m.width / m.height - 9 / 16) < 1e-9;
  /* El desplazable del Z Flip3, medido sobre la captura t3-mas (1080×2640 a 2,625 px por punto): 411 × 737. */
  const flip3 = { ancho: 411, alto: 737 };
  const casos = [[411, 737], [360, 640], [390, 744], [412, 860], [768, 900]];
  check('D3) en el Z Flip3 y en otros altos, el marco deja la descripción ENTERA a la vista, y sigue siendo 9:16',
    casos.every(([a, h]) => cabe(a, h, 72) && forma(W.medidaDelMarcoDelWeel(a, h, 72))), casos.map(([a, h]) => `${a}×${h}→${Math.round(W.medidaDelMarcoDelWeel(a, h, 72).height)}`).join(' '));
  check('D3) con letra grande también', cabe(flip3.ancho, flip3.alto, W.altoMinimoDeLaDescripcion(1.6)));
  const viejo = (ancho) => Math.min(ancho - 32, 360) * 16 / 9;
  check('CONTROL: el marco de antes (9:16 sacado del ancho) NO dejaba la caja entera en el Z Flip3',
    viejo(flip3.ancho) + reserva(72) > flip3.alto, `${Math.round(viejo(flip3.ancho))} + ${reserva(72)} > ${flip3.alto}`);
  const bajo = W.medidaDelMarcoDelWeel(800, 360, 72);
  check('D3) en una pantalla muy baja (teléfono girado) el marco no desaparece: suelo de 240 y la pantalla se desplaza',
    bajo.height === W.ALTO_MINIMO_DEL_MARCO && forma(bajo));
  check('D3) en una pantalla alta no crece más que antes (360 de ancho máximo)', W.medidaDelMarcoDelWeel(1280, 2000, 72).width === 360);
  check('D3) el teclado no encoge el vídeo: con el mismo ancho solo se acepta crecer',
    /v && v\.ancho === ancho && v\.alto >= alto \? v : \{ ancho, alto \}/.test(nuevo));
}
{
  /* La vista previa: vertical llena, apaisado o cuadrado entero. */
  const conVideo = async (ancho, alto) => {
    const e = creador({ elegido: VIDEO({ width: ancho, height: alto }), confirmar: true });
    await e.tocar(tEs('weels.pickVideo'));
    e.dibujar();
    return e;
  };
  const vertical = await conVideo(1080, 1920);
  const apaisado = await conVideo(1920, 1080);
  const cuadrado = await conVideo(1080, 1080);
  check('D4) vista previa: un vídeo vertical llena el marco (cover)', vertical.capturas.Video?.resizeMode === 'cover', vertical.capturas.Video?.resizeMode);
  check('D4) uno apaisado o cuadrado se ve ENTERO, sin recortar (contain)', apaisado.capturas.Video?.resizeMode === 'contain' && cuadrado.capturas.Video?.resizeMode === 'contain',
    `${apaisado.capturas.Video?.resizeMode} · ${cuadrado.capturas.Video?.resizeMode}`);
  const rotado = await conVideo(1920, 1080);
  rotado.capturas.Video.onReadyForDisplay({ naturalSize: { width: 1920, height: 1080, orientation: 'portrait' } });
  rotado.dibujar();
  check('D4) la medida de verdad del reproductor manda: un vertical que el selector dio sin rotar acaba llenando',
    rotado.capturas.Video?.resizeMode === 'cover', rotado.capturas.Video?.resizeMode);
  check('CONTROL: la vista previa de antes (siempre COVER) recortaba el apaisado; ya no queda',
    /resizeMode=\{ResizeMode\.COVER\}/.test('<Video resizeMode={ResizeMode.COVER} />') && !/resizeMode=\{ResizeMode\.COVER\}/.test(nuevo));
}
{
  /* Volver del creador. */
  const salir = (pilaDe, como) => {
    const e = creador({ pila: pilaDe });
    const d = e.dibujar();
    if (como === 'flecha') e.tocar(tEs('common.back'), d);
    else {
      e.reg.enfoques.at(-1)?.();
      e.devuelto = e.atras();
    }
    return e;
  };
  const delMas = salir(['Main', 'Reels', 'CrearWeel'], 'flecha');
  check('D5) abierto con el + de Weëls, el ✕ vuelve al MISMO Weël (`goBack` sobre `Reels`)', JSON.stringify(delMas.navegacion) === '[["goBack"]]', JSON.stringify(delMas.navegacion));
  const sinPila = salir(['CrearWeel'], 'flecha');
  check('D5) sin historial (enlace, recarga), el ✕ va al feed de Weëls', sinPila.navegacion.length === 1 && sinPila.navegacion[0][0] === 'popTo' && sinPila.navegacion[0][1] === 'Reels', JSON.stringify(sinPila.navegacion));
  const trasCompositor = salir(['Main', 'Create', 'CrearWeel'], 'flecha');
  check('D5) con el compositor del Wäll detrás, NUNCA vuelve a él: va al feed de Weëls',
    trasCompositor.navegacion.length === 1 && trasCompositor.navegacion[0][0] === 'popTo' && trasCompositor.navegacion[0][1] === 'Reels', JSON.stringify(trasCompositor.navegacion));
  const atrasMas = salir(['Main', 'Reels', 'CrearWeel'], 'atras');
  const atrasSin = salir(['CrearWeel'], 'atras');
  const atrasCompositor = salir(['Main', 'Create', 'CrearWeel'], 'atras');
  check('D6) el Atrás de Android hace lo mismo que el ✕ (y lo consume: la app no se cierra)',
    atrasMas.devuelto === true && JSON.stringify(atrasMas.navegacion) === '[["goBack"]]'
    && atrasSin.devuelto === true && atrasSin.navegacion[0]?.[1] === 'Reels'
    && atrasCompositor.navegacion[0]?.[1] === 'Reels' && !atrasCompositor.navegacion.some((n) => n[1] === 'Create' || n[0] === 'goBack'),
    JSON.stringify([atrasMas.navegacion, atrasSin.navegacion, atrasCompositor.navegacion]));
  const S = base('utils/salidaDeWeels.ts');
  const viejoCerrar = (nav) => nav.goBack();
  const nav = (p) => { const n = []; return { n, goBack: () => n.push('goBack'), navigate: (x) => n.push(x), popTo: (x) => n.push(x), canGoBack: () => p.length > 1, getState: () => ({ index: p.length - 1, routes: p.map((name) => ({ name })) }) }; };
  const a = nav(['Main', 'Create', 'CrearWeel']); viejoCerrar(a);
  const b = nav(['Main', 'Create', 'CrearWeel']); S.salirDeCrearWeel(b);
  check('CONTROL: el cerrar de antes (`goBack` a secas) habría reabierto el compositor; el de ahora no', a.n[0] === 'goBack' && b.n[0] === 'Reels');
}

check('esta suite está en la cadena de `npm test`', /weels-crear\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien: crear un Weël es su propio flujo de vídeo y el Wall conserva su compositor');
process.exit(failures ? 1 : 0);
