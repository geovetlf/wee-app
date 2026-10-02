/**
 * UNA RESPUESTA VIEJA NO PISA A LA NUEVA.
 *
 *   node test/efectos-vigentes.test.mjs
 *
 * Un `useEffect` que pide algo a Firestore y luego hace `setX(...)` corre otra vez cuando cambian sus dependencias: otra
 * persona en la tarjeta que la lista recicla, otra cara (Perfil Real ↔ Perfil Weë), otra comunidad, otra búsqueda. Si
 * la respuesta de la petición de ANTES llega después de la de ahora, sin bandera la pinta encima: el nombre de otra
 * persona en la tarjeta, las publicaciones de la otra cara en el perfil, los resultados de «ca» después de «casa», el
 * voto de otra publicación, la conversación de la cara de antes abierta en la nueva. La auditoría del 2026-10-01
 * contó 21 efectos así; el cierre post-auditoría les puso `let vivo = true; … if (vivo) set…; return () => { vivo = false; }`
 * (y un contador de la carga vigente donde la carga es una función que también se llama a mano).
 *
 * Esta prueba no busca la palabra `vivo`: SACA cada efecto de su archivo (con el analizador de TypeScript), lo ejecuta
 * con dobles cuyos servicios devuelven una promesa que la prueba resuelve cuando quiere, y mira lo que pasa:
 *
 *   · si el efecto se limpia ANTES de que llegue la respuesta, la respuesta no escribe nada;
 *   · CONTROL: sin limpiar, la misma respuesta sí escribe (si no, la primera pasaría siempre);
 *   · SABOTAJE: con la bandera arrancada del texto del efecto (la limpieza ya no la apaga), la respuesta vieja vuelve a
 *     escribir, y la comprobación lo caza.
 *
 * Y un INVENTARIO que impide que vuelva: todo efecto de pantallas, componentes, hooks y contextos que espera algo y
 * luego llama a un setter, y cuyas dependencias pueden cambiar, tiene que devolver una limpieza con su bandera.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const ts = require('typescript');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

/* ── Sacar código de su archivo y ejecutarlo ──────────────────────────────── */

const fuentes = new Map();
const fuente = (archivo) => {
  if (!fuentes.has(archivo)) fuentes.set(archivo, ts.createSourceFile(archivo, leer(archivo), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
  return fuentes.get(archivo);
};

/** El callback del `useEffect` de `archivo` cuyo texto contiene `marca`. */
const efectoCon = (archivo, marca) => {
  const src = fuente(archivo);
  let hallado = null;
  const visitar = (n) => {
    if (hallado) return;
    if (ts.isCallExpression(n) && /^(React\.)?useEffect$/.test(n.expression.getText(src)) && n.arguments[0]
      && n.arguments[0].getText(src).includes(marca)) {
      hallado = n.arguments[0].getText(src);
      return;
    }
    ts.forEachChild(n, visitar);
  };
  visitar(src);
  return hallado;
};

/** `const nombre = (…) => {…}` (o envuelto en `useCallback`), como texto. */
const funcionDe = (archivo, nombre) => {
  const src = fuente(archivo);
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

/*
 * El texto, ejecutable, con sus nombres libres resueltos en `alcance`. Lo que no está en el alcance es global
 * (`Promise`, `Date`); lo que no está en ninguno revienta con un ReferenceError, que es lo que debe pasar si el efecto
 * empieza a usar algo que esta prueba no conoce.
 */
const ejecutable = (texto, alcance) => {
  const js = ts.transpileModule(`(${texto});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  }).outputText.replace(/^"use strict";\s*/, '').replace(/^export \{\};\s*$/m, '').trim().replace(/;$/, '');
  const caja = new Proxy(alcance, { has: (o, k) => k in o });
  // eslint-disable-next-line no-new-func
  return new Function('__caja', `with (__caja) { return (${js}); }`)(caja);
};

/* SABOTAJE: la limpieza deja de apagar la bandera, así que la respuesta vieja sigue «viva». */
const sinBandera = (texto) => texto.replace(/\b(vivo|vigente)\s*=\s*false;?/g, '');

const espia = (impl = () => undefined) => {
  const f = (...a) => { f.llamadas.push(a); return impl(...a); };
  f.llamadas = [];
  return f;
};
const diferido = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((r, j) => { resolver = r; rechazar = j; });
  return { promesa, resolver, rechazar };
};
const ticks = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const consola = { log() {}, warn() {}, error() {} };

/*
 * EL ESCENARIO DE SIEMPRE, PARA CADA EFECTO.
 *
 * `preparar()` devuelve `{ alcance, d, valor, escribe }`: el alcance con sus dobles, la promesa diferida que contesta
 * el servicio, lo que contesta, y una función que dice si ESA respuesta llegó a escribirse en el estado.
 */
const escenario = async (nombre, archivo, marca, preparar) => {
  const texto = efectoCon(archivo, marca);
  if (!texto) { check(`${nombre}: el efecto sigue en ${archivo}`, false, `no se encontró «${marca}»`); return; }

  const correr = async (textoDelEfecto, limpiarAntes) => {
    const p = preparar();
    const limpieza = ejecutable(textoDelEfecto, p.alcance)();
    await ticks();
    if (limpiarAntes) {
      if (typeof limpieza !== 'function') return { sinLimpieza: true, escribio: true };
      limpieza();
    }
    p.d.resolver(p.valor);
    await ticks();
    return { escribio: p.escribe(), p };
  };

  const limpio = await correr(texto, true);
  check(`${nombre}: limpiado antes de la respuesta, la respuesta vieja no escribe`, !limpio.sinLimpieza && !limpio.escribio,
    limpio.sinLimpieza ? 'el efecto no devuelve limpieza' : '');
  const control = await correr(texto, false);
  check(`${nombre}: CONTROL — sin limpiar, la misma respuesta sí escribe`, control.escribio);
  const sabotaje = await correr(sinBandera(texto), true);
  check(`${nombre}: SABOTAJE — sin la bandera, la respuesta vieja vuelve a escribir y se ve`, sabotaje.escribio);
};

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── A · Cada efecto, con su respuesta tarde ──');
/* ════════════════════════════════════════════════════════════════════════ */

await escenario('useVote (el voto de la publicación de antes)', 'hooks/useVote.ts', 'getUserVote', () => {
  const d = diferido();
  const setStats = espia();
  return {
    d, valor: 'agree', escribe: () => setStats.llamadas.length > 0,
    alcance: { userId: 'u1', postId: 'p1', voteService: { getUserVote: () => d.promesa }, setStats },
  };
});

await escenario('Buscar («ca» después de «casa»)', 'screens/SearchScreen.tsx', 'searchTimeout', () => {
  const d = diferido();
  const setSearchedUsers = espia();
  const setSearchedPosts = espia();
  const setSearching = espia();
  return {
    d, valor: [{ id: 'viejo' }],
    escribe: () => setSearchedUsers.llamadas.length > 0 || setSearchedPosts.llamadas.length > 0
      || setSearching.llamadas.some(([v]) => v === false),
    alcance: {
      searchQuery: 'casa', communities: [], t: (k) => k, locale: 'es',
      paraBuscar: (s) => String(s || '').toLowerCase(), nombreDeComunidad: (c) => c.name, descripcionDeComunidad: (c) => c.description,
      setSearching, setFilteredCommunities: espia(), setSearchedUsers, setSearchedPosts,
      searchUsers: () => d.promesa, searchPosts: async () => [{ id: 'post-viejo' }],
      /* El rebote de 300 ms, sin esperar: corre ya. Lo que se prueba es lo que pasa DESPUÉS de empezar. */
      setTimeout: (f) => { f(); return 1; }, clearTimeout: () => {}, console: consola,
    },
  };
});

await escenario('Perfil ajeno (las publicaciones del perfil de antes)', 'screens/UserProfileScreen.tsx', 'loadUserPosts', () => {
  const d = diferido();
  const setUserPosts = espia();
  const setLoadingPosts = espia();
  return {
    d, valor: [{ id: 'de-otra-persona' }],
    escribe: () => setUserPosts.llamadas.length > 0 || setLoadingPosts.llamadas.some(([v]) => v === false),
    alcance: {
      userId: 'persona-a', setLoadingPosts, setPostsError: espia(), setUserPosts, setUserReposts: espia(), setUserLikedPosts: espia(),
      postsService: { getByUserId: () => d.promesa }, repostsService: { getUserReposts: async () => [] },
      likesService: { getUserLikedPostsWithData: async () => [] }, console: consola,
    },
  };
});

await escenario('Mi perfil (las publicaciones de la otra cara)', 'screens/ProfileScreen.tsx', 'getUserAgreedPosts(authUid)', () => {
  const d = diferido();
  const setUserPosts = espia();
  const updateProfile = espia(async () => {});
  return {
    d, valor: [{ id: 'de-la-cara-real' }],
    escribe: () => setUserPosts.llamadas.length > 0 || updateProfile.llamadas.length > 0,
    alcance: {
      user: { uid: 'cuenta' }, userProfile: { uid: 'cuenta', posts: 0 },
      setLoadingPosts: espia(), setPostsError: espia(), setUserPosts, setUserReposts: espia(), setUserLikedPosts: espia(), updateProfile,
      postsService: { getByUserId: () => d.promesa }, repostsService: { getUserReposts: async () => [] },
      voteService: { getUserAgreedPosts: async () => [] }, console: consola,
    },
  };
});

await escenario('useUserById (otra persona en la tarjeta reciclada)', 'hooks/useUserById.ts', 'getByPublicRef', () => {
  const d = diferido();
  const setUserProfile = espia();
  const userCache = new Map();
  return {
    d, valor: { uid: 'persona-a', displayName: 'Ana' },
    escribe: () => setUserProfile.llamadas.some(([v]) => v && v.uid === 'persona-a'),
    alcance: { userId: 'persona-a', setUserProfile, setLoading: espia(), setError: espia(), userCache, usersService: { getByPublicRef: () => d.promesa }, console: consola },
  };
});

await escenario('PostCard (el original de otro repost)', 'components/PostCard.tsx', 'loadOriginalPost', () => {
  const d = diferido();
  const setOriginalPost = espia();
  return {
    d, valor: { id: 'original-viejo' }, escribe: () => setOriginalPost.llamadas.length > 0,
    alcance: { isRepost: true, post: { originalPostId: 'original-viejo' }, setLoadingOriginal: espia(), setOriginalPost, postsService: { getById: () => d.promesa }, console: consola },
  };
});

await escenario('Menú ☰ (el negocio de la cuenta de antes)', 'components/DrawerMenu.tsx', 'getBusinessByOwner', () => {
  const d = diferido();
  const setMyBusiness = espia();
  return {
    d, valor: { id: 'negocio-de-otra-cuenta' }, escribe: () => setMyBusiness.llamadas.length > 0,
    alcance: { realUid: 'cuenta-a', weeBizService: { getBusinessByOwner: () => d.promesa }, setMyBusiness, console: consola },
  };
});

await escenario('Guardar en proyecto (los proyectos de la cuenta de antes)', 'components/creator/ProjectPicker.tsx', 'projectsService', () => {
  const d = diferido();
  const setProjects = espia();
  const setLoading = espia();
  return {
    d, valor: [{ id: 'proyecto-ajeno' }],
    escribe: () => setProjects.llamadas.length > 0 || setLoading.llamadas.some(([v]) => v === false),
    alcance: {
      visible: true, user: { uid: 'cuenta-a' }, goal: 'un póster', locale: 'es', setLoading, setName: espia(),
      suggestProjectName: () => 'Mi póster', projectsService: { list: () => d.promesa }, setProjects, console: consola,
    },
  };
});

await escenario('useCommunity (la comunidad de antes)', 'hooks/useCommunities.ts', 'loadCommunity', () => {
  const d = diferido();
  const setCommunity = espia();
  return {
    d, valor: { id: 'c-vieja', slug: 'vieja' }, escribe: () => setCommunity.llamadas.length > 0,
    alcance: {
      communityIdOrSlug: 'c-vieja', setIsLoading: espia(), setCommunity, setError: espia(),
      communityService: { getCommunityById: () => d.promesa, getCommunityBySlug: async () => null }, console: consola,
    },
  };
});

await escenario('useCommunityById (la tarjeta reciclada)', 'hooks/useCommunityById.ts', 'fetchCommunity', () => {
  const d = diferido();
  const setCommunity = espia();
  return {
    d, valor: { id: 'c-vieja', slug: 'vieja', icon: 'people' }, escribe: () => setCommunity.llamadas.length > 0,
    alcance: {
      communityId: 'c-vieja', communityCache: new Map(), setCommunity, setIsLoading: espia(),
      communityService: { getCommunityById: () => d.promesa }, fixCommunityIcon: (c) => c, console: consola,
    },
  };
});

await escenario('Weë Brain (la conversación de la cuenta de antes)', 'hooks/useBrainChat.ts', 'getLatestChat', () => {
  const d = diferido();
  const setChatId = espia();
  return {
    d, valor: { id: 'chat-de-otra-cuenta', updatedAt: { toDate: () => new Date() } }, escribe: () => setChatId.llamadas.length > 0,
    alcance: { user: { uid: 'cuenta-a' }, resumed: { current: false }, brainService: { getLatestChat: () => d.promesa }, RESUME_WINDOW_MS: 3600000, setChatId, console: consola },
  };
});

await escenario('Weë Writer (el documento de antes en el editor)', 'screens/WriterEditorScreen.tsx', 'documentsService.get', () => {
  const d = diferido();
  const setText = espia();
  return {
    d, valor: { id: 'doc-viejo', title: 'Viejo', text: 'texto viejo' }, escribe: () => setText.llamadas.length > 0,
    alcance: { params: { docId: 'doc-viejo' }, loadedFor: { current: undefined }, documentsService: { get: () => d.promesa }, setDoc: espia(), setTitle: espia(), setText },
  };
});

await escenario('WeeTalk (la conversación de la cara de antes)', 'screens/ConversationScreen.tsx', 'getOrCreateConversation', () => {
  const d = diferido();
  const setConvId = espia();
  return {
    d, valor: 'conversacion-de-la-cara-real', escribe: () => setConvId.llamadas.length > 0,
    alcance: {
      user: { uid: 'cuenta' }, userProfile: { uid: 'cuenta', displayName: 'Ana' }, convId: null, otherUserId: 'otra', otherUserData: { displayName: 'Beto' },
      setLoading: espia(), setConvId, messagesService: { getOrCreateConversation: () => d.promesa, markAsRead: async () => {} }, console: consola,
    },
  };
});

await escenario('Las dos caras de la cuenta (la sesión de antes)', 'contexts/UserProfileContext.tsx', 'loadUserProfiles', () => {
  const d = diferido();
  const setRealProfile = espia();
  const updateUserCache = espia();
  return {
    d, valor: { perfil: { id: 'p-a', uid: 'cuenta-a', displayName: 'Ana' }, creado: false },
    escribe: () => setRealProfile.llamadas.some(([v]) => v && v.uid === 'cuenta-a') || updateUserCache.llamadas.length > 0,
    alcance: {
      user: { uid: 'cuenta-a', displayName: 'Ana', email: null, photoURL: null },
      setRealProfile, setWeeProfileState: espia(), setActiveProfileType: espia(), setLoading: espia(), setError: espia(),
      Timestamp: { now: () => 0 }, updateUserCache, identidadWeeDe: (c) => `hidi_${c}`,
      usersService: { ensureRealProfile: () => d.promesa, getWeeProfile: async () => null, update: async () => {} }, console: consola,
    },
  };
});

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── B · Las cargas que son funciones: solo escribe la última ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  /*
   * EL MURO DEL HOME, AL CAMBIAR DE COMUNIDAD EN LAS PASTILLAS. `loadPosts` se rehace en cada render con la comunidad
   * de ese momento, y la numeración vive en un ref que comparten todas: se arrancan dos cargas —la de «a», que tarda,
   * y la de «b»— y la de «a» contesta la última.
   */
  const texto = funcionDe('screens/HomeScreen.tsx', 'loadPosts');
  const preparar = (slug, d, cargaDelMuro, setPosts) => ({
    cargaDelMuro, selectedCommunitySlug: slug, postsCache: { current: new Map() }, CACHE_DURATION: 60000,
    setPosts, setLastDoc: espia(), setHasMore: espia(), setLoading: espia(), setFiltering: espia(), setError: espia(),
    postsService: { getByCommunitySlugPaginated: () => d.promesa, getMuroGeneralPaginado: () => d.promesa }, console: consola,
  });
  const correr = async (t) => {
    const cargaDelMuro = { current: 0 };
    const setPosts = espia();
    const da = diferido();
    const db = diferido();
    const deA = ejecutable(t, preparar('a', da, cargaDelMuro, setPosts));
    const deB = ejecutable(t, preparar('b', db, cargaDelMuro, setPosts));
    const pa = deA(false);
    const pb = deB(false);
    db.resolver({ documents: [{ id: 'de-b' }], lastDoc: null, hayMas: false });
    await pb;
    da.resolver({ documents: [{ id: 'de-a' }], lastDoc: null, hayMas: false });
    await pa;
    const ultima = setPosts.llamadas[setPosts.llamadas.length - 1];
    return ultima && ultima[0][0] && ultima[0][0].id;
  };
  check('el muro: la comunidad de antes, aunque conteste la última, no pisa a la que se mira', !!texto && await correr(texto) === 'de-b');
  /* SABOTAJE: sin numerar las cargas, la que llega la última manda. */
  const sinNumerar = (texto || '').replace(/if \(!vigente\(\)\) return;/g, '');
  check('el muro: SABOTAJE — sin la numeración, gana la respuesta vieja y se ve', await correr(sinNumerar) === 'de-a');
}
{
  /*
   * LAS COMUNIDADES DE CADA CARA. `refreshCommunities` depende de la identidad: al cambiar de cara se pide otra carga
   * y la de antes traía las comunidades de la OTRA cara.
   */
  const texto = funcionDe('hooks/useCommunities.ts', 'refreshCommunities');
  const correr = async (t) => {
    const cargaVigente = { current: 0 };
    const updateUserCommunities = espia();
    const da = diferido();
    const db = diferido();
    const alcance = (userId, d) => ({
      cargaVigente, userId, updateUserCommunities, setIsLoading: espia(), setError: espia(), setCommunities: espia(), setOfficialCommunities: espia(),
      fixCommunityIcon: (c) => c, communityService: { getCommunities: async () => [], getJoinedCommunities: () => d.promesa }, console: consola,
    });
    const pa = ejecutable(t, alcance('cara-real', da))();
    await ticks();
    const pb = ejecutable(t, alcance('cara-wee', db))();
    await ticks();
    db.resolver([{ id: 'de-la-cara-wee' }]);
    await pb;
    da.resolver([{ id: 'de-la-cara-real' }]);
    await pa;
    const ultima = updateUserCommunities.llamadas[updateUserCommunities.llamadas.length - 1];
    return ultima && ultima[0][0] && ultima[0][0].id;
  };
  check('las comunidades: las de la cara de antes no se quedan como si fueran de esta', !!texto && await correr(texto) === 'de-la-cara-wee');
  const sinNumerar = (texto || '').replace(/if \(!vigente\(\)\) return;/g, '');
  check('las comunidades: SABOTAJE — sin la numeración, ganan las de la otra cara y se ve', await correr(sinNumerar) === 'de-la-cara-real');
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── C · Inventario: ninguno vuelve a quedarse sin bandera ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  /*
   * Todo `useEffect` de pantallas, componentes, hooks y contextos que espera algo (`await`, `.then(`) y llama a un
   * setter, con dependencias que pueden cambiar, tiene que devolver una limpieza que apague una bandera
   * (`vivo`, `vigente`, `cancelled`…). Los de dependencias vacías no entran: no hay una petición más nueva a la que
   * pisar, y React no hace nada con un setState tras desmontar.
   */
  const listar = (d) => fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));
  const archivos = ['screens', 'components', 'hooks', 'contexts'].flatMap(listar);
  const BANDERA = /\b(vivo|vigente|cancel+ed|cancelad[oa]|mounted|montad[oa]|activo|alive|ignore|stale)\s*=\s*(false|true)\b/;
  const desatendidos = [];
  let asincronos = 0;
  for (const rel of archivos) {
    const src = fuente(rel);
    const visitar = (n) => {
      if (ts.isCallExpression(n) && /^(React\.)?useEffect$/.test(n.expression.getText(src)) && n.arguments[0]) {
        const cuerpo = n.arguments[0].getText(src);
        const deps = n.arguments[1] ? n.arguments[1].getText(src).replace(/\s+/g, '') : null;
        if (/\bawait\b|\.then\(/.test(cuerpo) && /\bset[A-Z]\w*\(/.test(cuerpo)) {
          asincronos++;
          const cambian = deps === null || deps !== '[]';
          const conLimpieza = /return\s*\(\)\s*=>/.test(cuerpo) && BANDERA.test(cuerpo);
          if (cambian && !conLimpieza) desatendidos.push(`${rel}:${src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1}`);
        }
      }
      ts.forEachChild(n, visitar);
    };
    visitar(src);
  }
  check('el inventario encuentra los efectos asíncronos', asincronos >= 25, `${asincronos} efectos`);
  check('ninguno con dependencias que cambian se queda sin bandera', desatendidos.length === 0, desatendidos.join(' ') || 'todos atendidos');
  /* CONTROL: un efecto así, sin bandera, se vería. */
  const muestra = ts.createSourceFile('m.tsx', 'useEffect(() => { api.get(id).then((x) => setX(x)); }, [id]);', ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const cuerpoMuestra = muestra.statements[0].expression.arguments[0].getText(muestra);
  check('CONTROL: un efecto sin bandera se reconoce como tal', /\.then\(/.test(cuerpoMuestra) && /\bset[A-Z]\w*\(/.test(cuerpoMuestra)
    && !(/return\s*\(\)\s*=>/.test(cuerpoMuestra) && BANDERA.test(cuerpoMuestra)));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nUna respuesta vieja ya no pisa a la nueva');
process.exit(failures ? 1 : 0);
