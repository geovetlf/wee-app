/**
 * TRAZABILIDAD R9 · LÍNEA E1 — SUPERFICIES SOCIALES Y DE CUENTA, TOCADAS COMO LAS TOCA UNA PERSONA.
 *
 * Cada bloque prueba una corrección de la matriz `ronda-r9/TRAZA/E1/matriz.md` (su id entre corchetes) sobre el código
 * de VERDAD: la pantalla se dibuja con el entorno de `_pantallas.mjs` y se pulsan sus botones por su etiqueta
 * accesible; lo que no se puede dibujar sin un motor (un efecto de React, un manejador de avisos) se saca del archivo
 * con el compilador de TypeScript y se ejecuta con dobles. Cada bloque lleva su CONTROL: la misma comprobación sobre
 * el caso que NO debe cumplirla, para que una prueba que siempre dice «sí» se vea.
 *
 *   A · [E1-08] Perfil ajeno: denunciar el perfil (antes, un ⋯ sin acción); quién NO lo ve.
 *   B · [E1-09] Perfil ajeno: las publicaciones se piden con el uid de la cara, no con su referencia pública.
 *   C · [E1-10] Perfil ajeno: escribir al AUTOR de una publicación guarda los datos del autor.
 *   D · [E1-04/05/06] WeeTalk: la cabecera abre el perfil y sabe quién es aunque la ruta no lo diga; leído mientras
 *       se mira; el audio que falla se dice.
 *   E · [E1-03] WeeTalk: la bandeja ya no ofrece un «borrar» que no borraba.
 *   F · [E1-20/21] Configuración: sin interruptores de mentira; las notificaciones abren el permiso del sistema.
 *   G · [E1-13/14/15] Comunidades: sin comunidades inventadas; la tarjeta abre la comunidad; crear cuenta 1 miembro.
 *   H · [E1-23] Avisos push de ËContact: tocarlos lleva a algún sitio.
 *
 * Sin red, sin emulador, sin dispositivo. Lo que solo se ve en un teléfono (el permiso del sistema abriéndose de
 * verdad, el aviso push llegando) queda para el coordinador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { crearComprobador } from './_aceptacion.mjs';
import { crearEntorno } from './_pantallas.mjs';
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';

const { check, titulo, terminar } = crearComprobador();
const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '../../');
const ts = createRequire(path.join(raiz, 'package.json'))('typescript');
globalThis.__DEV__ = false;

/* ── El traductor de verdad ─────────────────────────────────────────────── */
const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const DICCIONARIOS = { es: base('i18n/textos/es/index.ts').es, en: base('i18n/textos/en/index.ts').en };
const tEs = crearTraductor('es', DICCIONARIOS, {});
const formatoReal = base('i18n/formato.ts');
const formato = { numero: (v, o) => formatoReal.formatearNumero(v, 'es', o), lista: (c, tipo) => formatoReal.formatearLista(c, 'es', tipo), fecha: () => 'enero de 2026' };

/* ── Sacar código de su archivo y ejecutarlo (el método de `avisos-en-la-web` y `efectos-vigentes`) ── */
const arbol = (archivo) => ts.createSourceFile(archivo, leer(archivo), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const funcionDe = (archivo, nombre) => {
  const src = arbol(archivo);
  let hallada = null;
  const visitar = (n) => {
    if (hallada) return;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nombre && n.initializer) {
      let ini = n.initializer;
      if (ts.isCallExpression(ini) && ini.expression.getText(src) === 'useCallback') ini = ini.arguments[0];
      if (ini && (ts.isArrowFunction(ini) || ts.isFunctionExpression(ini))) { hallada = ini.getText(src); return; }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(src);
  return hallada;
};
const efectoCon = (archivo, marca) => {
  const src = arbol(archivo);
  let hallado = null;
  const visitar = (n) => {
    if (hallado) return;
    if (ts.isCallExpression(n) && /^(React\.)?useEffect$/.test(n.expression.getText(src)) && n.arguments[0]?.getText(src).includes(marca)) {
      hallado = n.arguments[0].getText(src);
      return;
    }
    ts.forEachChild(n, visitar);
  };
  visitar(src);
  return hallado;
};
const ejecutable = (texto, alcance) => {
  const js = ts.transpileModule(`(${texto});`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve } })
    .outputText.replace(/^"use strict";\s*/, '').replace(/^export \{\};\s*$/m, '').trim().replace(/;$/, '');
  const caja = new Proxy(alcance, { has: (o, k) => k in o });
  return new Function('__caja', `with (__caja) { return (${js}); }`)(caja);
};
const espia = (impl = () => {}) => { const f = (...a) => { f.llamadas.push(a); return impl(...a); }; f.llamadas = []; return f; };
const calma = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };

/* ── Lo común a todas las pantallas: tema, idioma, tamaño, y unos efectos que SÍ corren ── */
const comunes = ({ usuario, perfilActivo }) => {
  const tema = { useTheme: () => ({ theme: { colors: new Proxy({}, { get: () => '#000000' }), dark: false } }) };
  const habla = { useT: () => tEs, useIdioma: () => ({ t: tEs, formato, locale: 'es', idioma: 'es', disponibles: ['es', 'en'] }) };
  return {
    '../contexts/ThemeContext': tema,
    '../contexts/IdiomaContext': habla,
    '../contexts/AuthContext': { useAuth: () => ({ user: usuario, logout: async () => {} }) },
    '../contexts/UserProfileContext': { useUserProfile: () => ({ userProfile: perfilActivo, updateLocalProfile: () => {} }) },
    '../hooks/useResponsive': { useResponsive: () => ({ isMobile: true, isTablet: false, isDesktop: false, height: 800 }) },
    'expo-image': { Image: () => null },
    'react-native-safe-area-context': { SafeAreaView: ({ children }) => children ?? null, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    'expo-linear-gradient': { LinearGradient: ({ children }) => children ?? null },
  };
};
/*
 * `react-dom/server` no ejecuta efectos. Para las pantallas cuyo trabajo de verdad empieza en un efecto (suscribirse,
 * cargar) se usa el mismo entorno con un `react` propio: el mismo `useState` por orden de llamada que el de
 * `_pantallas.mjs`, y un `useEffect` que corre en cada dibujado. Lo que un efecto apunte en el estado se ve en el
 * dibujado siguiente. Hay que dibujar SIEMPRE con el `dibujar` de aquí (pone a cero el orden de los estados).
 */
const entornoConEfectos = (opciones) => {
  let almacen = [];
  let indice = 0;
  const useState = (inicial) => {
    const i = indice++;
    if (!(i in almacen)) almacen[i] = typeof inicial === 'function' ? inicial() : inicial;
    return [almacen[i], (v) => { almacen[i] = typeof v === 'function' ? v(almacen[i]) : v; }];
  };
  const entorno = crearEntorno({
    ...opciones,
    dobles: (ctx) => ({ ...opciones.dobles(ctx), react: { ...ctx.React, useState, useEffect: (cb) => { cb(); } } }),
  });
  const dibujar = () => { indice = 0; return entorno.dibujar(); };
  const tocar = (etiqueta) => entorno.tocar(etiqueta, dibujar());
  return { ...entorno, dibujar, tocar };
};

/* El texto que hay dentro de un elemento de React, sin dibujarlo (para encontrar la fila de una lista por lo que dice). */
const textoDe = (nodo) => {
  if (nodo == null || typeof nodo === 'boolean') return '';
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoDe).join(' ');
  return textoDe(nodo.props?.children);
};

/* ═══ A · PERFIL AJENO: DENUNCIAR ═════════════════════════════════════════ */
titulo('A · [E1-08] Perfil ajeno: denunciar el perfil');

const perfilAjeno = ({ visto, usuario = { uid: 'cuenta-yo' }, params }) => {
  const consultas = [];
  const entorno = crearEntorno({
    pantalla: 'screens/UserProfileScreen.tsx',
    usuario,
    params: params ?? { userId: visto?.entityId || visto?.uid },
    dobles: (ctx) => ({
      ...comunes({ usuario, perfilActivo: usuario ? { uid: usuario.uid, displayName: 'Yo' } : null }),
      'react-native': { ...ctx.reactNative, Share: { share: async () => {} } },
      '../hooks/useUserById': { useUserById: () => ({ userProfile: visto, loading: false, error: null }), updateUserCache: () => {} },
      '../hooks/useEContact': {
        useEContact: () => ({ estado: 'ninguno', cargando: false, trabajando: false, disponible: false, identidad: null, nombreLista: 'ËContact' }),
        mensajeDeEContact: () => 'x',
      },
      '../services/firestoreService': {
        postsService: { getByUserId: async (uid) => { consultas.push(['posts', uid]); return []; } },
        repostsService: { getUserReposts: async (uid) => { consultas.push(['reposts', uid]); return []; } },
      },
      '../services/likesService': { likesService: { getUserLikedPostsWithData: async (uid) => { consultas.push(['likes', uid]); return []; } } },
      '../components/avatars/AvatarDisplay': () => null,
      '../components/PostCard': ctx.capturar('PostCard'),
      '../components/ImageViewer': () => null,
      '../components/TextoEnMayusculas': ({ children }) => ctx.h('span', null, children),
      '../components/ReportSheet': ctx.capturar('ReportSheet'),
    }),
  });
  return { entorno, consultas };
};

const ENT = 'ent_0123456789abcdefghjkmnpqrs';
const creado = { toDate: () => new Date(0) };
const ajenoConEntidad = { uid: 'cuenta-otra', entityId: ENT, displayName: 'Ana', posts: 0, profileType: 'real', createdAt: creado };
{
  const { entorno } = perfilAjeno({ visto: ajenoConEntidad });
  const d = entorno.dibujar();
  const boton = d.botones.find((b) => b.etiqueta === tEs('moderation.report'));
  check('E1-08 · el perfil de otra persona tiene un botón «Denunciar» con su nombre accesible', !!boton && boton.rol === 'button' && !boton.apagado,
    d.botones.map((b) => b.etiqueta).filter(Boolean).join(' · '));
  check('E1-08 · antes de tocarlo no hay hoja abierta', !entorno.capturas.ReportSheet);
  entorno.tocar(tEs('moderation.report'), d);
  entorno.dibujar();
  const hoja = entorno.capturas.ReportSheet;
  check('E1-08 · tocarlo abre LA hoja de denuncias de toda la app, con la ENTIDAD del perfil como objetivo',
    !!hoja && hoja.visible === true && hoja.objetivo?.type === 'ENTITY' && hoja.objetivo?.id === ENT && hoja.surface === 'profile', JSON.stringify(hoja?.objetivo));
  hoja.onClose();
  entorno.dibujar();
  check('E1-08 · y cerrarla la quita', !entorno.capturas.ReportSheet);
  /* Lo que la hoja manda es lo que el servidor acepta: `ENTITY` tiene resolutor y el servicio lo deja pasar. */
  const servidor = leer('functions/src/moderation/index.ts');
  check('E1-08 · el servidor resuelve ENTITY y el cliente lo admite', /ENTITY: async \(db: Firestore, id: string\)/.test(servidor)
    && /export type ObjetivoDenunciable = [^;]*'ENTITY'/.test(leer('services/moderationService.ts')));
}
{
  /* CONTROLES: quien no debe verlo, no lo ve. */
  const sinEntidad = perfilAjeno({ visto: { uid: 'cuenta-otra', displayName: 'Ana', posts: 0, createdAt: creado } }).entorno.dibujar();
  check('E1-08 · CONTROL: un perfil sin entidad (que el servidor no sabría resolver) no ofrece denunciar', !sinEntidad.botones.some((b) => b.etiqueta === tEs('moderation.report')));
  const miCaraWee = { uid: 'hidi_cuenta-yo', entityId: ENT, profileType: 'hidi', linkedAccountId: 'cuenta-yo', displayName: 'Yo Weë', posts: 0, createdAt: creado };
  const propia = perfilAjeno({ visto: miCaraWee, params: { userId: ENT } }).entorno.dibujar();
  check('E1-08 · CONTROL: mi propia cara Weë, abierta por su entidad, no se puede denunciar (la cuenta se LEE con cuentaDeIdentidad)',
    !propia.botones.some((b) => b.etiqueta === tEs('moderation.report')));
  const { entorno: sinSesion } = perfilAjeno({ visto: ajenoConEntidad, usuario: null });
  sinSesion.tocar(tEs('moderation.report'));
  sinSesion.dibujar();
  check('E1-08 · sin sesión, denunciar lleva a entrar y no abre la hoja', !sinSesion.capturas.ReportSheet && sinSesion.navegacion.some((n) => n[1] === 'Login'));
  check('E1-08 · CONTROL: ya no queda ningún botón con el manejador vacío de antes', !/onPress=\{\(\) => \{\/\* Menu de opciones \*\/\}\}/.test(leer('screens/UserProfileScreen.tsx')));
}

/* ═══ B · PERFIL AJENO: LAS PUBLICACIONES, POR EL UID DE LA CARA ═════════ */
titulo('B · [E1-09] Perfil ajeno: las publicaciones se piden con el uid, no con la entidad');
{
  /* El efecto real de la pantalla, con el uid que dejó resuelto el perfil. */
  const efecto = efectoCon('screens/UserProfileScreen.tsx', 'loadUserPosts');
  const correr = async (uidDelAutor) => {
    const pedidas = [];
    const pedir = (k) => async (uid) => { pedidas.push([k, uid]); return []; };
    ejecutable(efecto, {
      uidDelAutor, setLoadingPosts: () => {}, setPostsError: () => {}, setUserPosts: () => {}, setUserReposts: () => {}, setUserLikedPosts: () => {},
      postsService: { getByUserId: pedir('posts') }, repostsService: { getUserReposts: pedir('reposts') },
      likesService: { getUserLikedPostsWithData: pedir('likes') }, console: { log() {}, error() {} },
    })();
    await calma();
    return pedidas;
  };
  const pedidas = await correr('cuenta-otra');
  check('E1-09 · publicaciones, reposts y «me gusta» se piden con el uid de la cara', pedidas.length === 3 && pedidas.every(([, uid]) => uid === 'cuenta-otra'), JSON.stringify(pedidas));
  check('E1-09 · CONTROL: sin uid todavía, no se pide nada (antes se pedía con `ent_…` y volvía vacío)', (await correr(undefined)).length === 0);
  /* Y de dónde sale ese uid: del perfil resuelto, nunca de una entidad. */
  const derivar = (userProfile, userId) => ejecutable('() => userProfile?.uid || (esReferenciaDeEntidad(userId) ? undefined : userId)', {
    userProfile, userId, esReferenciaDeEntidad: base('utils/identidadPublica.ts').esReferenciaDeEntidad,
  })();
  check('E1-09 · la pantalla deriva el uid así (texto vigente)', /const uidDelAutor = userProfile\?\.uid \|\| \(esReferenciaDeEntidad\(userId\) \? undefined : userId\);/.test(leer('screens/UserProfileScreen.tsx')));
  check('E1-09 · con la entidad en la ruta y el perfil aún sin llegar, no hay uid', derivar(null, ENT) === undefined);
  check('E1-09 · con el perfil resuelto, su uid', derivar({ uid: 'hidi_x' }, ENT) === 'hidi_x');
  check('E1-09 · CONTROL: una ruta antigua con uid sigue funcionando', derivar(null, 'cuenta-otra') === 'cuenta-otra');
}

/* ═══ C · PERFIL AJENO: ESCRIBIR AL AUTOR ═══════════════════════════════ */
titulo('C · [E1-10] Perfil ajeno: escribir al autor de una publicación');
{
  const fn = funcionDe('screens/UserProfileScreen.tsx', 'handlePrivateMessage');
  const correr = (autorId, datos) => {
    const navigation = { navigate: espia() };
    ejecutable(fn, { navigation, userProfile: { uid: 'cuenta-otra', displayName: 'Ana', avatarType: 'predefined', avatarId: 'female' } })(autorId, datos);
    return navigation.navigate.llamadas[0][1].params.params;
  };
  const deUnRepost = correr('cuenta-tercera', { displayName: 'Bea', avatarType: 'custom', photoURL: 'https://x' });
  check('E1-10 · al autor de un repost se le escribe con SU nombre y SU avatar', deUnRepost.otherUserId === 'cuenta-tercera' && deUnRepost.otherUserData.displayName === 'Bea', JSON.stringify(deUnRepost));
  const delDueno = correr('cuenta-otra', { displayName: 'Ana (tarjeta)' });
  check('E1-10 · CONTROL: al dueño del perfil, con los datos del perfil cargado', delDueno.otherUserData.displayName === 'Ana');
}

/* ═══ D · WEETALK: LA CONVERSACIÓN ═════════════════════════════════════ */
titulo('D · [E1-04/05/06] WeeTalk: cabecera, leído mientras se mira, audio que falla');

const conversacion = ({ params, conv, mensajes }) => {
  const marcadas = [];
  let alLlegarMensajes = null;
  const entorno = entornoConEfectos({
    pantalla: 'screens/ConversationScreen.tsx',
    usuario: { uid: 'yo' },
    params,
    dobles: (ctx) => {
      const Caja = ctx.Caja;
      const rn = {
        ...ctx.reactNative,
        KeyboardAvoidingView: Caja, Modal: Caja, StatusBar: Object.assign(() => null, { setBarStyle() {} }),
        Animated: { Value: class { setValue() {} stopAnimation() {} }, View: Caja, loop: () => ({ start() {} }), sequence: () => ({}), timing: () => ({}) },
      };
      return {
        ...comunes({ usuario: { uid: 'yo' }, perfilActivo: { uid: 'yo', displayName: 'Yo' } }),
        'react-native': rn,
        'expo-av': { Audio: { requestPermissionsAsync: async () => ({ granted: true }), setAudioModeAsync: async () => {}, Recording: {} } },
        '../services/cloudinaryService': { uploadAudioToCloudinary: async () => 'https://audio', cloudinaryThumb: (u) => u },
        '../services/storageService': { uploadMessageImageFromUri: async () => '', uploadViewOncePhoto: async () => '' },
        '../services/messagesService': {
          claveDeAvisoGuardado: () => undefined,
          messagesService: {
            subscribeToConversation: (_id, cb) => { if (conv) cb(conv); return () => {}; },
            subscribeToMessages: (_id, cb) => { alLlegarMensajes = cb; cb(mensajes); return () => {}; },
            markAsRead: async (cid, uid) => { marcadas.push([cid, uid]); },
            cleanupEphemeralMessages: () => {}, setActiveInChat: () => {}, toggleEphemeral: () => {},
            setChatTheme: () => {}, setChatWallpaper: () => {}, getOrCreateConversation: async () => 'c1',
          },
        },
        '../components/avatars/AvatarDisplay': () => null,
        '../components/ChatCamera': () => null,
        '../components/AudioBubble': () => null,
      };
    },
  });
  return { entorno, marcadas, llegan: (m) => alLlegarMensajes(m) };
};

const CONV = { participants: ['yo', 'otra'], participantsData: { yo: { displayName: 'Yo' }, otra: { displayName: 'Bea', avatarType: 'predefined', avatarId: 'female' } } };
{
  /* Desde un aviso push: la ruta solo trae la conversación. Sin conversación leída todavía, el respaldo genérico. */
  const { entorno: vacia } = conversacion({ params: { conversationId: 'c1' }, conv: null, mensajes: [] });
  vacia.dibujar();
  const primero = vacia.dibujar();
  check('E1-04 · CONTROL: sin la conversación leída, la cabecera dice «Usuario» y no se puede tocar',
    primero.botones.some((b) => b.etiqueta === tEs('common.user') && b.apagado), primero.botones.map((b) => `${b.etiqueta}${b.apagado ? '(off)' : ''}`).join(' · '));
  const { entorno } = conversacion({ params: { conversationId: 'c1' }, conv: CONV, mensajes: [] });
  entorno.dibujar();
  const d = entorno.dibujar();
  check('E1-05 · abierta desde un aviso push, la cabecera dice quién es la otra persona (sale de la conversación guardada)', /Bea/.test(d.texto) && d.botones.some((b) => b.etiqueta === 'Bea' && !b.apagado));
  entorno.olvidar();
  entorno.tocar('Bea');
  check('E1-04 · tocar su nombre abre su perfil', entorno.navegacion.length === 1 && entorno.navegacion[0][1] === 'UserProfile' && entorno.navegacion[0][2].userId === 'otra', JSON.stringify(entorno.navegacion));
}
{
  /* Con la otra persona en la ruta (desde un perfil), manda la ruta. */
  const { entorno } = conversacion({ params: { conversationId: 'c1', otherUserId: 'otra', otherUserData: { displayName: 'Bea (ruta)' } }, conv: CONV, mensajes: [] });
  entorno.dibujar();
  entorno.olvidar();
  entorno.tocar('Bea (ruta)');
  check('E1-04 · con la persona en la ruta, se usa la de la ruta', entorno.navegacion[0]?.[2]?.userId === 'otra');
}
{
  /* Leído mientras se mira. */
  const ajeno = (id, read = false) => ({ id, senderId: 'otra', read, content: 'hola', type: 'text' });
  const propio = (id) => ({ id, senderId: 'yo', read: false, content: 'hey', type: 'text' });
  const c = conversacion({ params: { conversationId: 'c1', otherUserId: 'otra', otherUserData: { displayName: 'Bea' } }, conv: CONV, mensajes: [ajeno('m1', true), propio('m2')] });
  c.entorno.dibujar();
  c.marcadas.length = 0;
  c.llegan([ajeno('m1', true), propio('m2')]);
  check('E1-06 · CONTROL: si solo llegan mensajes propios o ya leídos, no se escribe nada', c.marcadas.length === 0);
  c.llegan([ajeno('m1', true), propio('m2'), ajeno('m3')]);
  check('E1-06 · un mensaje ajeno que llega con el chat ABIERTO se marca como leído', c.marcadas.length === 1 && c.marcadas[0].join() === 'c1,yo', JSON.stringify(c.marcadas));
  c.llegan([ajeno('m1', true), propio('m2'), ajeno('m3'), ajeno('m4')]);
  check('E1-06 · y el siguiente también (antes, solo el primer lote al abrir)', c.marcadas.length === 2);
}
{
  /* El audio que falla se dice, como el texto y la imagen. */
  const fn = funcionDe('screens/ConversationScreen.tsx', 'stopRecording');
  const correr = async (subida) => {
    const avisos = [];
    await ejecutable(fn, {
      recordingRef: { current: { stopAndUnloadAsync: async () => {}, getURI: () => 'file:///a.m4a' } }, convId: 'c1', myUid: 'yo',
      setRecording() {}, setRecordDuration() {}, pulseAnim: { stopAnimation() {}, setValue() {} }, recordTimerRef: { current: null }, clearInterval() {},
      Audio: { setAudioModeAsync: async () => {} }, recordStartTime: { current: Date.now() - 5000 }, setSending() {},
      uploadAudioToCloudinary: subida, messagesService: { sendMessage: async () => {} }, console: { error() {} },
      notify: (...a) => avisos.push(a), t: tEs,
    })();
    return avisos;
  };
  const fallo = await correr(async () => { throw new Error('sin red'); });
  check('E1-06 · si el audio no se puede subir, la persona lo sabe', fallo.length === 1 && fallo[0][0] === tEs('weetalk.sendFailed'), JSON.stringify(fallo));
  check('E1-06 · CONTROL: si se envía, no hay aviso', (await correr(async () => 'https://audio')).length === 0);
}

/* ═══ E · WEETALK: LA BANDEJA ═════════════════════════════════════════ */
titulo('E · [E1-03] WeeTalk: sin «borrar» que no borra');
{
  const bandeja = sinComentarios(leer('screens/InboxScreen.tsx'));
  const servicio = sinComentarios(leer('services/messagesService.ts'));
  check('E1-03 · la bandeja ya no ofrece la pulsación larga de borrar', !/onLongPress=/.test(bandeja) && !/deleteChat|deleteConversation/.test(bandeja));
  check('E1-03 · y el servicio ya no tiene el borrado que escribía objetos vacíos', !/deleteConversation\s*\(/.test(servicio) && !/updateDoc\([^()]*\{\}\)/.test(servicio));
  /* CONTROL: las reglas siguen cerrando el borrado; por eso no se podía arreglar desde la app. */
  const reglas = leer('firestore.rules');
  const bloque = reglas.slice(reglas.indexOf('match /conversations/{conversationId}'), reglas.indexOf('MODERACIÓN (Fase 12-A/B'));
  check('E1-03 · CONTROL: las reglas de conversaciones y mensajes cierran el borrado (dos «allow delete: if false»)', (bloque.match(/allow delete: if false;/g) || []).length === 2);
}

/* ═══ F · CONFIGURACIÓN ══════════════════════════════════════════════ */
titulo('F · [E1-20/21] Configuración: sin interruptores de mentira');
const ajustes = (so) => {
  const abiertos = [];
  const interruptores = [];
  const filas = [];
  const entorno = crearEntorno({
    pantalla: 'screens/SettingsScreen.tsx',
    so,
    dobles: (ctx) => ({
      ...comunes({ usuario: { uid: 'yo' }, perfilActivo: { uid: 'yo', displayName: 'Yo', joinedCommunities: [] } }),
      'react-native': {
        ...ctx.reactNative,
        Alert: { alert() {} },
        Switch: (p) => { interruptores.push(p); return null; },
        /* Cada fila apunta lo que dice y lo que hace al tocarla: así se encuentra «Notificaciones push» por su texto. */
        TouchableOpacity: (p) => { filas.push({ texto: textoDe(p.children), tocar: p.onPress, apagado: !!p.disabled }); return ctx.Toque(p); },
      },
      '../i18n/idiomas': { varianteDelLocale: () => 'Español' },
      '../components/ResponsiveLayout': ({ children }) => children,
      '../components/TextoEnMayusculas': ({ children }) => ctx.h('span', null, children),
      '@react-native-async-storage/async-storage': { getItem: async () => null },
      '../contexts/LocationContext': { useLocation: () => ({ preferencia: 'off', cargando: false, permiso: 'undetermined', disponible: true, activar: async () => {}, desactivar: async () => {} }) },
      '../utils/ajustesDelSistema': { abrirAjustesDelSistema: async () => { abiertos.push(true); return true; }, hayAjustesDelSistema: so !== 'web' },
      './EngineAdminScreen': { ENGINE_ADMIN_FLAG: 'flag' },
    }),
  });
  return { entorno, abiertos, interruptores, filas };
};
{
  const a = ajustes('android');
  const d = a.entorno.dibujar();
  check('E1-20 · ya no hay fila de «Respuestas privadas» (un interruptor que no se guardaba ni leía nadie)', !d.texto.includes(tEs('settings.privateReplies')));
  const push = a.filas.find((f) => f.texto.includes(tEs('settings.pushNotifications')));
  check('E1-21 · la fila de notificaciones dice dónde se cambian de verdad', !!push && push.texto.includes(tEs('settings.pushNotificationsSystemHint')) && !push.apagado, push?.texto);
  push.tocar();
  check('E1-21 · y tocarla abre el permiso del sistema (el interruptor real)', a.abiertos.length === 1);
  check('E1-21 · el único interruptor que queda es el de la ubicación, que sí funciona', a.interruptores.length === 1 && a.interruptores[0].onValueChange?.name !== 'setNotificationsEnabled');
  const web = ajustes('web');
  const dw = web.entorno.dibujar();
  check('E1-21 · en la web, donde no hay avisos push que gestionar, la sección no aparece', !dw.texto.includes(tEs('settings.pushNotifications')));
  check('E1-21 · CONTROL: en la web la ubicación sí sigue', dw.texto.includes(tEs('settings.location')));
  check('E1-21 · CONTROL: la clave nueva existe en los 16 idiomas', fs.readdirSync(path.join(raiz, 'i18n/textos')).every((l) => /pushNotificationsSystemHint: '/.test(leer(`i18n/textos/${l}/settings.ts`))));
}

/* ═══ G · COMUNIDADES ═══════════════════════════════════════════════ */
titulo('G · [E1-13/14/15] Comunidades: lo que existe, sin inflar');
const gestion = (reales, falla = false) => {
  const unidas = [];
  const creadas = [];
  const entorno = entornoConEfectos({
    pantalla: 'screens/CommunitiesManagementScreen.tsx',
    dobles: (ctx) => ({
      ...comunes({ usuario: { uid: 'yo' }, perfilActivo: { uid: 'yo', displayName: 'Yo', joinedCommunities: [] } }),
      'react-native': {
        ...ctx.reactNative, Modal: ctx.Caja, RefreshControl: () => null,
        /* Una lista que SÍ pinta sus filas (la del entorno no llama a renderItem). */
        FlatList: ({ data = [], renderItem, ListEmptyComponent }) => ctx.h('div', null,
          data.length ? data.map((item, index) => ctx.h(ctx.React.Fragment, { key: index }, renderItem({ item, index })))
            : (typeof ListEmptyComponent === 'function' ? ctx.h(ListEmptyComponent) : ListEmptyComponent ?? null)),
      },
      '../services/communityService': {
        communityService: {
          getUserCommunities: async () => { if (falla) throw new Error('sin red'); return reales; },
          joinCommunity: async (u, c) => { unidas.push([u, c]); },
          leaveCommunity: async () => {},
          createCommunity: async (datos) => { creadas.push(datos); return 'nueva'; },
        },
      },
      '../components/EspacioDeEscritura': ({ children }) => children ?? null,
      '../components/TextoEnMayusculas': ({ children }) => ctx.h('span', null, children),
      '../utils/comunidadesDeWee': { nombreDeComunidad: (c) => c.name, descripcionDeComunidad: (c) => c.description },
    }),
  });
  return { entorno, unidas, creadas };
};
{
  const real = { id: 'c-real', name: 'Prompt Crafters', slug: 'prompt-crafters', description: 'De verdad', icon: 'people', memberCount: 4, postCount: 0, createdBy: 'otra', moderators: ['otra'], status: 'active' };
  const g = gestion([real]);
  g.entorno.dibujar();
  await calma();
  const d = g.entorno.dibujar();
  const inventadas = base('constants/communityCategories.ts').POPULAR_COMMUNITIES.map((c) => c.name);
  check('E1-13 · la lista enseña la comunidad real', d.texto.includes('Prompt Crafters'));
  check('E1-13 · y ninguna de las comunidades inventadas con miembros falsos', !inventadas.some((n) => d.texto.includes(n)), inventadas.filter((n) => d.texto.includes(n)).join(' · '));
  const fallo = gestion([], true);
  fallo.entorno.dibujar();
  await calma();
  const df = fallo.entorno.dibujar();
  check('E1-13 · si la carga falla, no se rellena con ejemplos: se dice', !inventadas.some((n) => df.texto.includes(n)) && fallo.entorno.avisos.length >= 1);
  check('E1-13 · CONTROL: el catálogo de ejemplo sigue existiendo (es de las temáticas), solo que esta pantalla no lo pinta', inventadas.length > 0);
  /* La tarjeta abre la comunidad por la ruta de la pila principal, la que existe venga de donde venga. */
  const tarjeta = funcionDe('screens/CommunitiesManagementScreen.tsx', 'renderCommunityItem');
  check('E1-14 · tocar una tarjeta abre la comunidad (`Community`, pila principal) y no `Feed`, que solo existe en el Inicio',
    /navigate\('Community', \{ communityId: item\.id \}\)/.test(tarjeta) && !/navigate\('Feed'/.test(tarjeta));
  const pilaPrincipal = leer('navigation/MainStackNavigator.tsx');
  check('E1-14 · CONTROL: `Community` está en la pila principal y `Feed` no', /name="Community"/.test(pilaPrincipal) && !/name="Feed"/.test(pilaPrincipal));
}
{
  /* El servicio, con una Firestore de mentira que apunta cada escritura. */
  const crearServicio = (miembros = new Set()) => {
    const escrito = [];
    const fs_ = {
      doc: (_db, ...p) => ({ ruta: p.join('/') }),
      collection: (_db, ...p) => ({ ruta: p.join('/') }),
      getDoc: async (ref) => ({ exists: () => miembros.has(ref.ruta), data: () => ({}) }),
      getDocs: async () => ({ empty: false, docs: [{ ref: { ruta: 'users/yo' } }] }),
      query: (c) => c, where: () => ({}), limit: () => ({}), orderBy: () => ({}),
      addDoc: async (c, datos) => { escrito.push(['add', c.ruta, datos]); return { id: 'nueva' }; },
      writeBatch: () => {
        const ops = [];
        return {
          update: (r, d) => ops.push(['update', r.ruta, d]),
          set: (r, d) => ops.push(['set', r.ruta, d]),
          delete: (r) => ops.push(['delete', r.ruta]),
          commit: async () => { escrito.push(...ops); ops.forEach((o) => { if (o[0] === 'set' && o[1].includes('/members/')) miembros.add(o[1]); if (o[0] === 'delete') miembros.delete(o[1]); }); },
        };
      },
      increment: (n) => ({ incremento: n }), arrayUnion: (x) => ({ union: x }), arrayRemove: (x) => ({ quita: x }),
      Timestamp: { now: () => 0 }, serverTimestamp: () => 0, updateDoc: async () => {}, setDoc: async () => {}, deleteDoc: async () => {},
      startAfter: () => ({}), documentId: () => 'id',
    };
    const cargador = crearCargador({ dobles: { 'firebase/firestore': fs_, '../config/firebase': { db: {} } } });
    return { servicio: cargador('services/communityService.ts').communityService, escrito, miembros };
  };
  const sumas = (escrito) => escrito.filter((o) => o[0] === 'update' && o[1].startsWith('communities/') && o[2].memberCount).map((o) => o[2].memberCount.incremento);
  {
    const { servicio, escrito } = crearServicio();
    await servicio.joinCommunity('yo', 'c1');
    check('E1-15 · CONTROL: unirse la primera vez SÍ suma uno y crea la membresía', sumas(escrito).join() === '1' && escrito.some((o) => o[0] === 'set' && o[1] === 'communities/c1/members/yo'));
    escrito.length = 0;
    await servicio.joinCommunity('yo', 'c1');
    check('E1-15 · unirse otra vez (doble toque) no vuelve a sumar', sumas(escrito).length === 0, JSON.stringify(escrito));
    escrito.length = 0;
    await servicio.leaveCommunity('yo', 'c1');
    check('E1-15 · salir resta uno', sumas(escrito).join() === '-1');
    escrito.length = 0;
    await servicio.leaveCommunity('yo', 'c1');
    check('E1-15 · y salir sin estar dentro no resta', sumas(escrito).length === 0);
  }
  {
    const { servicio, escrito } = crearServicio();
    servicio.getCommunityBySlug = async () => null;
    await servicio.createCommunity({ name: 'Mi Taller', description: 'x', icon: 'people', rules: [], createdBy: 'yo' });
    const nacida = escrito.find((o) => o[0] === 'add');
    const total = (nacida?.[2]?.memberCount ?? 0) + sumas(escrito).reduce((x, y) => x + y, 0);
    check('E1-15 · crear una comunidad deja UN miembro (antes nacía en 1 y se sumaba otra vez: 2, y la pantalla 3)', total === 1, `nace ${nacida?.[2]?.memberCount} + ${sumas(escrito).join('+')}`);
    check('E1-15 · CONTROL: la regla de creación admite nacer a cero', /request\.resource\.data\.get\('memberCount', 0\) in \[0, 1\]/.test(leer('firestore.rules')));
  }
  const crear = leer('screens/CommunitiesManagementScreen.tsx');
  check('E1-15 · la pantalla ya no une por segunda vez a quien acaba de crear', !/createCommunity\([\s\S]{0,1500}communityService\.joinCommunity\(user\.uid, communityId\)/.test(crear));
}

/* ═══ H · AVISOS PUSH DE ËCONTACT ═══════════════════════════════════ */
titulo('H · [E1-23] Avisos push de ËContact');
{
  const fn = funcionDe('contexts/PushNotificationContext.tsx', 'handleNotificationNavigation');
  const correr = (data) => {
    const navigation = { isReady: () => true, navigate: espia() };
    ejecutable(fn, { navigation, console: { error() {} }, setTimeout })(data);
    return navigation.navigate.llamadas;
  };
  const solicitud = correr({ type: 'econtact_request', senderId: 'otra' });
  check('E1-23 · tocar el aviso de una solicitud de ËContact abre la agenda, donde se acepta o rechaza', solicitud.length === 1 && solicitud[0][0] === 'EContact');
  const aceptada = correr({ type: 'econtact_accepted', senderId: 'otra' });
  check('E1-23 · tocar el de una aceptada abre el perfil de quien aceptó', aceptada.length === 1 && aceptada[0][0] === 'UserProfile' && aceptada[0][1].userId === 'otra');
  check('E1-23 · CONTROL: un tipo desconocido sigue sin navegar', correr({ type: 'otro' }).length === 0);
  const servidor = leer('functions/src/social/avisos.ts');
  check('E1-23 · CONTROL: el servidor de verdad manda esos dos tipos', /econtact_request/.test(servidor) && /econtact_accepted/.test(servidor));
}

check('esta suite está en la cadena de `npm test` (la añade el coordinador al integrar)', /traza-social-e1\.test\.mjs/.test(leer('functions/package.json')) || process.env.TRAZA_SIN_CADENA === '1');

terminar();
