/**
 * EL CIERRE DEL CLIENTE (post-auditoría, 2026-10-01): LO QUE SE QUITÓ NO VUELVE Y LO QUE SE ARREGLÓ, FUNCIONA.
 *
 *   node test/cierre-cliente.test.mjs
 *
 *   A · Código muerto retirado: ni los archivos, ni un import suyo, ni ningún import del cliente que apunte a la nada.
 *   B · `formatNumber` y `getRelativeTime` salieron de la maqueta (`data/mockData.ts`) a `utils/formatoCorto.ts`, y
 *       se EJECUTAN para ver que dicen lo mismo de siempre.
 *   C · Las copias locales de `notify` se fueron: la tienda de Credits y el aviso de vídeo largo se ejecutan con el
 *       `utils/notify.ts` de verdad, en la web y en el teléfono. La cámara del compositor pide su permiso con
 *       `confirmAction` (en la web un `Alert.alert` con botones no hacía nada).
 *   D · El identificador del Perfil Weë se compone en UN sitio (`identidadWeeDe`).
 *   E · Seguir un negocio y su contador van en un `writeBatch`: o las dos escrituras, o ninguna.
 *   F · Los hooks y contextos ya no guardan frases en español escritas a mano (el detector de la revisión lo mide).
 *   G · App.tsx solo registra las URLs en desarrollo.
 *   H · WeeTalk bajó de las mil líneas sacando sus estilos, sin perder ninguno.
 *   I · Las consultas de comunidades ya no leen la colección entera para tirarla después.
 *
 * Cada arreglo de comportamiento se EJECUTA (con el analizador de TypeScript se saca el manejador de su archivo y se
 * corre con dobles), lleva su CONTROL y su SABOTAJE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const ts = require('typescript');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const existe = (p) => fs.existsSync(path.resolve(raiz, p));
let failures = 0;
/* El informe va por su propio canal: alguna sección calla el `console` global mientras corre código de la app. */
const decir = console.log.bind(console);
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  decir(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ── Herramientas ─────────────────────────────────────────────────────────── */

const fuentes = new Map();
const fuente = (archivo) => {
  if (!fuentes.has(archivo)) fuentes.set(archivo, ts.createSourceFile(archivo, leer(archivo), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
  return fuentes.get(archivo);
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
const ejecutable = (texto, alcance) => {
  const js = ts.transpileModule(`(${texto});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  }).outputText.replace(/^"use strict";\s*/, '').replace(/^export \{\};\s*$/m, '').trim().replace(/;$/, '');
  const caja = new Proxy(alcance, { has: (o, k) => k in o });
  // eslint-disable-next-line no-new-func
  return new Function('__caja', `with (__caja) { return (${js}); }`)(caja);
};
const comoUrl = (js) => 'data:text/javascript;base64,' + Buffer.from(js, 'utf8').toString('base64');
/** Un módulo TS del repositorio, compilado, con sus imports cambiados por los que se le pasan (especificador → URL). */
const cargarModulo = async (rel, imports = {}, retocar = (s) => s) => {
  let js = ts.transpileModule(retocar(leer(rel)), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const [espec, url] of Object.entries(imports)) js = js.split(`from '${espec}'`).join(`from '${url}'`);
  return import(comoUrl(js));
};
const espia = (impl = () => undefined) => {
  const f = (...a) => { f.llamadas.push(a); return impl(...a); };
  f.llamadas = [];
  return f;
};
const consola = { log() {}, warn() {}, error() {} };
const t = (clave, valores) => (valores ? `${clave}${JSON.stringify(valores)}` : clave);

const listar = (d) => (existe(d) ? fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.(tsx?|jsx?)$/.test(e.name) ? [`${d}/${e.name}`] : [])) : []);
const CLIENTE = ['screens', 'components', 'hooks', 'contexts', 'services', 'utils', 'navigation', 'constants', 'config', 'i18n', 'data']
  .flatMap(listar).concat(['App.tsx']).filter((f) => !f.startsWith('i18n/textos/'));

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── A · El código muerto se retiró y no vuelve ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  /* Sin ningún importador, ni ruta de navegación, ni suite que los ejecutara (2026-10-01). */
  const RETIRADOS = [
    'components/CommunitySelector.tsx', 'components/CustomTabBar.tsx', 'components/Icon.tsx', 'components/MessageBubble.tsx',
    'components/MessageInput.tsx', 'components/SplashScreen.tsx', 'components/studio/PromptEditor.tsx',
    'hooks/useCreatorJob.ts', 'hooks/useFollow.ts', 'hooks/useLikes.ts', 'screens/ChatScreen.tsx',
    'services/followsService.ts', 'services/videoDownload.ts', 'utils/imageUtils.ts', 'utils/webStyles.ts', 'data/mockData.ts',
  ];
  const siguen = RETIRADOS.filter(existe);
  check('1) los dieciséis archivos muertos ya no están', siguen.length === 0, siguen.join(' '));

  /*
   * Y NINGÚN IMPORT DEL CLIENTE APUNTA A UN ARCHIVO QUE NO EXISTE. Es más que «nadie importa los retirados»: si uno
   * vuelve a importarse sin volver el archivo, o si se borra otro que alguien usaba, esto lo dice con la ruta.
   */
  const EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.web.ts', '.web.tsx', '.native.ts', '.native.tsx', '/index.ts', '/index.tsx', '/index.js'];
  const resuelve = (desde, espec) => EXT.some((e) => fs.existsSync(path.resolve(raiz, path.dirname(desde), espec + e)));
  const RE_IMPORT = /(?:from\s+|require\(\s*|import\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
  const rotos = [];
  for (const f of CLIENTE) {
    for (const m of sinComentarios(leer(f)).matchAll(RE_IMPORT)) if (!resuelve(f, m[1])) rotos.push(`${f} → ${m[1]}`);
  }
  check('2) ningún import del cliente apunta a la nada (tampoco a un retirado)', rotos.length === 0, rotos.join(' · ') || `${CLIENTE.length} archivos`);
  /* CONTROL: un import a un retirado se reconoce como roto. */
  const muestra = "import { followsService } from '../services/followsService';";
  check('2) CONTROL: un import a un retirado se vería', [...muestra.matchAll(RE_IMPORT)].some((m) => !resuelve('hooks/x.ts', m[1])));

  /* Los exports muertos que quedaban dentro de archivos vivos. */
  const comunidades = sinComentarios(leer('services/communityService.ts'));
  const muertosDeComunidades = ['approveCommunity', 'rejectCommunity', 'getPendingCommunities', 'getOfficialCommunities', 'getAllCommunitiesFallback']
    .filter((n) => new RegExp(`\\b${n}\\s*:`).test(comunidades));
  check('3) communityService ya no ofrece aprobar, rechazar, pendientes ni oficiales (nadie los llamaba)', muertosDeComunidades.length === 0, muertosDeComunidades.join(' '));
  check('3) el voto por posición (voteInPoll) se fue: solo se vota por id, desde Poll', !/\bvoteInPoll\s*:/.test(sinComentarios(leer('services/firestoreService.ts')))
    && /postsService\.voteInPollById\(/.test(leer('components/Poll.tsx')));
  const likes = sinComentarios(leer('services/likesService.ts'));
  check('3) likesService solo lee: escribir y vigilar likes era de useLikes, retirado',
    /async getUserLikedPostsWithData\(/.test(likes) && !/likePost|unlikePost|toggleLike|hasUserLiked|subscribeToPostLikes|deleteUserLikes|deletePostLikes|recalculatePostLikes|getPostLikers/.test(likes));
  /* Lo que se QUEDA a propósito: el Home está pendiente de decisión del dueño (CLAUDE.md) y la tarjeta de sección
     la exige catalogo-i18n. Si se borran, que sea por decisión y no por arrastre. */
  check('4) se quedan, por decisión: HeroCarousel y SpecialistHero', existe('components/HeroCarousel.tsx') && existe('components/creator/SpecialistHero.tsx'));
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── B · Las formas cortas del muro, fuera de la maqueta ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  const desdeLaMaqueta = CLIENTE.filter((f) => /from ['"][./]+(?:[\w/]+\/)?mockData['"]/.test(leer(f)));
  check('5) ningún archivo de producción importa de la maqueta', desdeLaMaqueta.length === 0, desdeLaMaqueta.join(' '));
  const usuarios = CLIENTE.filter((f) => /\b(formatNumber|getRelativeTime)\b/.test(sinComentarios(leer(f))) && f !== 'utils/formatoCorto.ts');
  const malImportados = usuarios.filter((f) => !/import \{[^}]*\b(formatNumber|getRelativeTime)\b[^}]*\} from '\.\.\/utils\/formatoCorto';/.test(leer(f)));
  check('5) los que las usan las traen de utils/formatoCorto', usuarios.length >= 13 && malImportados.length === 0, malImportados.join(' ') || `${usuarios.length} archivos`);

  const resolver = comoUrl("export const partesDelLocale = (l) => ({ region: (String(l).split('-')[1] || '').toUpperCase() || undefined });");
  const formato = comoUrl(ts.transpileModule(leer('i18n/formato.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
    .outputText.split("from './resolver'").join(`from '${resolver}'`));
  const F = await cargarModulo('utils/formatoCorto.ts', { '../i18n/formato': formato });
  /* Sin locale, como siempre (lo que escribía la maqueta). */
  const sinLocale = [[0, '0'], [999, '999'], [1000, '1.0k'], [12400, '12.4k'], [1500000, '1.5M'], [null, '0'], [undefined, '0'], [NaN, '0']];
  const distintos = sinLocale.filter(([n, esperado]) => F.formatNumber(n) !== esperado).map(([n]) => `${n}→${F.formatNumber(n)}`);
  check('6) formatNumber sin locale dice lo de siempre', distintos.length === 0, distintos.join(' '));
  check('6) y con locale lo dice Intl, en cada idioma',
    F.formatNumber(12400, 'en') === new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(12400)
    && F.formatNumber(12400, 'es') !== F.formatNumber(12400, 'en') && F.formatNumber(null, 'en') === '0');
  const AHORA = Date.parse('2026-09-14T12:00:00Z');
  check('7) getRelativeTime: hasta una semana, cuánto hace; después, la fecha',
    /hace/.test(F.getRelativeTime(new Date(AHORA - 2 * 3600e3), 'es', AHORA))
    && /ago/.test(F.getRelativeTime(new Date(AHORA - 2 * 3600e3), 'en', AHORA))
    && !/hace|ago/.test(F.getRelativeTime(new Date(AHORA - 10 * 86400e3), 'en', AHORA)));
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── C · Un solo notify: el de utils/notify.ts ──');
/* ════════════════════════════════════════════════════════════════════════ */
let instancias = 0;
const notifyPara = async (plataforma) => {
  const clave = `__cierre_notify_${plataforma}_${instancias++}`;
  const registro = { alertas: [] };
  globalThis[clave] = registro;
  const rn = comoUrl(`export const Platform = { OS: ${JSON.stringify(plataforma)} };\n`
    + `export const Alert = { alert: (...a) => { globalThis[${JSON.stringify(clave)}].alertas.push(a); } };\n`);
  const mod = await cargarModulo('utils/notify.ts', { 'react-native': rn });
  return { ...mod, registro };
};
const WEB = await notifyPara('web');
const MOVIL = await notifyPara('ios');
const ventana = { respuesta: true, confirms: [], avisos: [] };
globalThis.window = {
  confirm: (m) => { ventana.confirms.push(m); return ventana.respuesta; },
  alert: (m) => { ventana.avisos.push(m); },
};
const reiniciar = () => {
  ventana.confirms.length = 0; ventana.avisos.length = 0;
  WEB.registro.alertas.length = 0; MOVIL.registro.alertas.length = 0;
};
{
  const PANTALLAS = ['screens/BrainChatScreen.tsx', 'screens/CreditStoreScreen.tsx', 'screens/WeeCreatorScreen.tsx', 'screens/CreateScreen.tsx'];
  const conCopia = PANTALLAS.filter((p) => {
    const c = sinComentarios(leer(p));
    return /const notify\w*\s*=/.test(c) && /window\.alert|Alert\.alert\(title, message\)/.test(c);
  });
  const sinComun = PANTALLAS.filter((p) => !/import \{[^}]*\bnotify\b[^}]*\} from '\.\.\/utils\/notify';/.test(leer(p)));
  check('8) ninguna de las cuatro pantallas tiene su notify propio', conCopia.length === 0, conCopia.join(' '));
  check('8) las cuatro usan el común', sinComun.length === 0, sinComun.join(' '));
  check('8) y ya no queda un window.alert suelto en ellas', PANTALLAS.every((p) => !/window\.alert/.test(sinComentarios(leer(p)))));

  /* La tienda de Credits, ejecutada: antes en la web salía SOLO el mensaje, sin título. */
  const comprar = funcionDe('screens/CreditStoreScreen.tsx', 'handlePurchase');
  const tienda = async (n, falla = null) => {
    const setPurchasing = espia();
    const creditsService = { purchase: async () => { if (falla) throw falla; return { credits: 100 }; } };
    await ejecutable(comprar, { accountUid: 'cuenta', purchasing: false, setPurchasing, creditsService, notify: n, t, formato: { numero: (x) => String(x) }, String })({ id: 'p1' });
    return setPurchasing;
  };
  reiniciar();
  await tienda(WEB.notify);
  check('9) la tienda en la web: el aviso lleva su título y su mensaje',
    ventana.avisos.length === 1 && ventana.avisos[0] === 'credits.testTopUpReady\n\ncredits.testTopUpDone{"cantidad":"100"}', JSON.stringify(ventana.avisos));
  reiniciar();
  await tienda(MOVIL.notify);
  check('9) y en el teléfono, el mismo Alert de siempre: título y mensaje, sin botones',
    MOVIL.registro.alertas.length === 1 && MOVIL.registro.alertas[0].length === 2
    && MOVIL.registro.alertas[0][0] === 'credits.testTopUpReady' && MOVIL.registro.alertas[0][1] === 'credits.testTopUpDone{"cantidad":"100"}');
  reiniciar();
  await tienda(WEB.notify, { details: { code: 'PURCHASE_INVALID' } });
  check('9) si la compra no está disponible, se dice con su título', ventana.avisos[0] === 'credits.topUpFailedTitle\n\ncredits.purchasesComingSoon');
  /* SABOTAJE: la copia que había (en la web, solo el mensaje) se caza. */
  reiniciar();
  await tienda((titulo, mensaje) => { window.alert(mensaje); });
  check('9) SABOTAJE: con la copia vieja, en la web se perdía el título y se ve', ventana.avisos[0] === 'credits.testTopUpDone{"cantidad":"100"}');

  /* El aviso de vídeo largo del compositor, ejecutado. */
  const largo = funcionDe('screens/CreateScreen.tsx', 'notifyVideoTooLong');
  const avisar = (n, isWeel, segundos) => ejecutable(largo, { t, isWeel, maxVideoDurationSeconds: 15, notify: n, Math })(segundos);
  reiniciar();
  avisar(WEB.notify, true, 20);
  check('10) vídeo largo en la web: título y mensaje, como antes',
    ventana.avisos[0] === 'composer.weelTooLong\n\ncomposer.weelMaxDuration{"maximo":15,"duracion":"composer.seconds{\\"contador\\":20}"}', ventana.avisos[0]);
  reiniciar();
  avisar(MOVIL.notify, false, 125);
  check('10) y en el teléfono el mismo Alert de título y mensaje',
    MOVIL.registro.alertas.length === 1 && MOVIL.registro.alertas[0][0] === 'composer.videoTooLong'
    && MOVIL.registro.alertas[0][1] === 'composer.videoMaxDuration{"maximo":15,"duracion":"composer.minutes{\\"contador\\":3}"}');

  /* La cámara del compositor sin permiso: antes un Alert.alert con botones, que en la web no pintaba nada. */
  const foto = funcionDe('screens/CreateScreen.tsx', 'takePhoto');
  const camara = async (mod, Alert) => {
    const ImagePicker = { requestCameraPermissionsAsync: espia(async () => ({ granted: false })), launchCameraAsync: espia() };
    await ejecutable(foto, { ImagePicker, confirmAction: mod.confirmAction, t, Alert, setAttachedMedia: espia(), Date })();
    return ImagePicker;
  };
  reiniciar();
  ventana.respuesta = true;
  let ip = await camara(WEB, { alert: espia() });
  check('11) cámara sin permiso, en la web: se pregunta, y decir que sí vuelve a pedir el permiso',
    ventana.confirms.length === 1 && ventana.confirms[0] === 'composer.permissionsNeeded\n\ncomposer.cameraForPhotos'
    && ip.requestCameraPermissionsAsync.llamadas.length === 2 && ip.launchCameraAsync.llamadas.length === 0);
  reiniciar();
  ventana.respuesta = false;
  ip = await camara(WEB, { alert: espia() });
  check('11) y decir que no, no pide nada más', ventana.confirms.length === 1 && ip.requestCameraPermissionsAsync.llamadas.length === 1);
  ventana.respuesta = true;
  reiniciar();
  const promesa = camara(MOVIL, { alert: espia() });
  await new Promise((r) => setTimeout(r, 0));
  const [titulo, mensaje, botones] = MOVIL.registro.alertas[0] || [];
  check('11) en el teléfono, el diálogo de siempre: Cancelar y el botón de ajustes, con sus textos',
    titulo === 'composer.permissionsNeeded' && mensaje === 'composer.cameraForPhotos' && Array.isArray(botones) && botones.length === 2
    && botones[0].text === 'common.cancel' && botones[0].style === 'cancel' && botones[1].text === 'composer.goToSettings');
  botones && botones[1].onPress();
  ip = await promesa;
  check('11) y su botón de ajustes vuelve a pedir el permiso', ip.requestCameraPermissionsAsync.llamadas.length === 2);
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── D · El identificador del Perfil Weë se compone en un solo sitio ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  const contexto = sinComentarios(leer('contexts/UserProfileContext.tsx'));
  check('12) el contexto de perfiles ya no escribe `hidi_${…}` a mano', !/hidi_\$\{/.test(contexto) && !/['"]hidi_['"]\s*\+/.test(contexto));
  check('12) lo pide a identidadWeeDe, en los cuatro sitios', (contexto.match(/updateUserCache\(identidadWeeDe\(user\.uid\), /g) || []).length === 4
    && /import \{ identidadWeeDe \} from '\.\.\/utils\/econtactModel';/.test(contexto));
  const aMano = CLIENTE.filter((f) => f !== 'utils/econtactModel.ts')
    .filter((f) => { const c = sinComentarios(leer(f)); return /hidi_\$\{/.test(c) || /['"]hidi_['"]\s*\+/.test(c); });
  check('12) y nadie más en el cliente lo compone a mano', aMano.length === 0, aMano.join(' '));
  const modelo = await cargarModulo('utils/econtactModel.ts');
  check('12) identidadWeeDe da el identificador heredado de siempre', modelo.identidadWeeDe('ABC') === 'hidi_ABC');
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── E · Seguir un negocio: el seguimiento y su contador, a la vez ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  /*
   * Un Firestore de juguete con lotes de verdad: `commit` aplica TODO o NADA. Y las reglas que importan aquí:
   * `contadorSano('followersCount')` —se mueve de uno en uno y nunca baja de cero— rechaza el lote entero.
   */
  const firestoreDeJuguete = ({ followersCount, fallaElCommit = false }) => {
    const estado = { docs: new Map([['businesses/N', { followersCount }]]), commits: 0, escriturasSueltas: 0 };
    const aplicar = (op) => {
      if (op.tipo === 'set') estado.docs.set(op.ref.ruta, op.datos);
      if (op.tipo === 'delete') estado.docs.delete(op.ref.ruta);
      if (op.tipo === 'update') {
        const actual = { ...(estado.docs.get(op.ref.ruta) || {}) };
        for (const [k, v] of Object.entries(op.datos)) actual[k] = v && v.__inc !== undefined ? (actual[k] || 0) + v.__inc : v;
        estado.docs.set(op.ref.ruta, actual);
      }
    };
    const contadorSano = (op) => op.tipo !== 'update' || !('followersCount' in op.datos)
      || ([1, -1].includes(op.datos.followersCount.__inc) && (estado.docs.get(op.ref.ruta)?.followersCount || 0) + op.datos.followersCount.__inc >= 0);
    return {
      estado,
      alcance: {
        db: {}, doc: (_db, col, id) => ({ ruta: `${col}/${id}` }), increment: (n) => ({ __inc: n }), Timestamp: { now: () => 'AHORA' },
        writeBatch: () => {
          const ops = [];
          return {
            set: (ref, datos) => { ops.push({ tipo: 'set', ref, datos }); },
            delete: (ref) => { ops.push({ tipo: 'delete', ref }); },
            update: (ref, datos) => { ops.push({ tipo: 'update', ref, datos }); },
            commit: async () => {
              estado.ultimoLote = ops.map((o) => `${o.tipo} ${o.ref.ruta}`);
              if (fallaElCommit || !ops.every(contadorSano)) throw new Error('permission-denied');
              ops.forEach(aplicar);
              estado.commits++;
            },
          };
        },
        /* Las escrituras sueltas de antes: si el manejador vuelve a usarlas, se cuentan. */
        setDoc: async (ref, datos) => { estado.escriturasSueltas++; aplicar({ tipo: 'set', ref, datos }); },
        deleteDoc: async (ref) => { estado.escriturasSueltas++; aplicar({ tipo: 'delete', ref }); },
        weeBizService: { incrementFollowers: async (id, d) => { estado.escriturasSueltas++; aplicar({ tipo: 'update', ref: { ruta: `businesses/${id}` }, datos: { followersCount: { __inc: d } } }); } },
        console: consola,
      },
    };
  };
  const seguir = funcionDe('screens/WeeBizProfileScreen.tsx', 'handleToggleFollow');
  const pulsar = async (texto, { isFollowing, followersCount, fallaElCommit }) => {
    const f = firestoreDeJuguete({ followersCount, fallaElCommit });
    if (isFollowing) f.estado.docs.set('businessFollows/U_biz_N', { userId: 'U', businessId: 'N' });
    const setIsFollowing = espia();
    const setFollowLoading = espia();
    await ejecutable(texto, {
      ...f.alcance, activeUid: 'U', followLoading: false, setFollowLoading, businessId: 'N', isFollowing,
      business: { followersCount }, setIsFollowing, setBusiness: espia(),
    })();
    return { ...f.estado, setIsFollowing, setFollowLoading };
  };

  let r = await pulsar(seguir, { isFollowing: false, followersCount: 3 });
  check('13) seguir: UN lote con el seguimiento y el +1, aplicado entero',
    r.commits === 1 && r.escriturasSueltas === 0 && JSON.stringify(r.ultimoLote) === JSON.stringify(['set businessFollows/U_biz_N', 'update businesses/N'])
    && r.docs.get('businessFollows/U_biz_N')?.userId === 'U' && r.docs.get('businesses/N').followersCount === 4
    && r.setIsFollowing.llamadas[0]?.[0] === true);
  r = await pulsar(seguir, { isFollowing: true, followersCount: 3 });
  check('13) dejar de seguir: UN lote con el borrado y el −1',
    r.commits === 1 && r.escriturasSueltas === 0 && !r.docs.has('businessFollows/U_biz_N') && r.docs.get('businesses/N').followersCount === 2
    && r.setIsFollowing.llamadas[0]?.[0] === false);
  r = await pulsar(seguir, { isFollowing: true, followersCount: 0 });
  check('13) con el contador ya en cero (desfase heredado), dejar de seguir sigue funcionando y no baja de cero',
    r.commits === 1 && !r.docs.has('businessFollows/U_biz_N') && r.docs.get('businesses/N').followersCount === 0
    && JSON.stringify(r.ultimoLote) === JSON.stringify(['delete businessFollows/U_biz_N']));
  r = await pulsar(seguir, { isFollowing: false, followersCount: 3, fallaElCommit: true });
  check('14) si el lote falla, no queda NADA escrito ni la pantalla cambia',
    r.commits === 0 && !r.docs.has('businessFollows/U_biz_N') && r.docs.get('businesses/N').followersCount === 3
    && r.setIsFollowing.llamadas.length === 0 && r.setFollowLoading.llamadas.at(-1)?.[0] === false);

  /*
   * SABOTAJE: el manejador de antes —dos escrituras sueltas— con el contador rechazado. El seguimiento queda escrito y
   * el contador sin mover: justo lo que el lote evita. Si esta comprobación no lo viera, la 14 no probaría nada.
   */
  const antiguo = `async () => {
    if (!activeUid || followLoading) return;
    try {
      setFollowLoading(true);
      const followRef = doc(db, 'businessFollows', \`\${activeUid}_biz_\${businessId}\`);
      if (isFollowing) { await deleteDoc(followRef); await weeBizService.incrementFollowers(businessId, -1); setIsFollowing(false); }
      else { await setDoc(followRef, { userId: activeUid, businessId, createdAt: Timestamp.now() }); throw new Error('permission-denied'); }
    } catch (e) { console.error(e); } finally { setFollowLoading(false); }
  }`;
  r = await pulsar(antiguo, { isFollowing: false, followersCount: 3 });
  check('14) SABOTAJE: con dos escrituras sueltas, un fallo deja el seguimiento sin su contador, y se ve',
    r.docs.has('businessFollows/U_biz_N') && r.docs.get('businesses/N').followersCount === 3);
  check('14) el manejador ya no usa escrituras sueltas', !/setDoc\(|deleteDoc\(|incrementFollowers/.test(sinComentarios(seguir || '')));
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── F · Hooks y contextos sin frases escritas a mano ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  const D = await import(pathToFileURL(path.join(raiz, 'ops/revision/detectores.mjs')).href);
  const { hallazgos } = D.analizar({ raiz, solo: ['i18n/texto-a-mano-fuera-de-pantallas'] });
  /*
   * Lo que QUEDA, cada uno con su porqué. Las tres frases que se pintan no se pueden cambiar por un código sin clave:
   * `mensajeDelServidor` / `mensajeDeEContact` enseñan en español el mensaje tal cual, así que un código saldría en
   * pantalla. Hace falta su frase en el catálogo del servidor o una clave nueva: decisión pendiente, no se inventa.
   */
  const QUEDAN = new Map([
    /* + cierre: los dos de econtactModel y el de voteInPollById ya lanzan su clave (ErrorDeEContact / ErrorConClave). */
    ['services/creditsService.ts#call', 'fuera del alcance de este cierre (creditsService)'],
  ]);
  const encontrados = hallazgos.map((h) => `${h.evidencia.ruta}#${h.ancla}`);
  const nuevos = encontrados.filter((id) => !QUEDAN.has(id));
  check('15) en hooks, contextos, servicios y utilidades no queda ninguna frase a mano fuera de la lista razonada', nuevos.length === 0,
    nuevos.join(' · ') || `${encontrados.length} razonadas`);
  check('15) y los tres que se citaron, a cero: ubicación, comunidades y votos',
    !encontrados.some((id) => /^(contexts\/LocationContext|hooks\/useCommunities|hooks\/useVote|contexts\/UserProfileContext)/.test(id)));
  /* Los errores de estado son ahora códigos con su tipo: quien los pinte elegirá la clave. */
  check('16) LocationContext guarda un código', /error: 'lectura-fallida' \| null;/.test(leer('contexts/LocationContext.tsx'))
    && /setError\('lectura-fallida'\)/.test(leer('contexts/LocationContext.tsx')));
  check('16) useCommunities y useCommunity, códigos con su tipo',
    /export type ErrorDeComunidades = 'carga-fallida' \| 'sin-sesion' \| 'union-fallida' \| 'salida-fallida';/.test(leer('hooks/useCommunities.ts'))
    && !/setError\('[^']*\s[^']*'\)/.test(leer('hooks/useCommunities.ts')));
  check('16) useVote, también', /export type ErrorDeVoto = 'sin-sesion' \| 'voto-fallido' \| 'quitar-voto-fallido';/.test(leer('hooks/useVote.ts'))
    && !/setError\('[^']*\s[^']*'\)/.test(leer('hooks/useVote.ts')));
  /* Y nadie los pinta como texto (si alguien lo hiciera, tendría que pasar por t()). */
  check('16) la comunidad solo pregunta SI hubo error, no lo escribe', !/\{communityError\}/.test(leer('screens/CommunityScreen.tsx')));
  /* CONTROL: el detector sigue viendo una frase a mano en un setError. */
  check('15) CONTROL: una frase a mano en un setError se reconoce como frase', D.esFrase('Error al cargar comunidades') && !D.esFrase('carga-fallida'));
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── G · App.tsx: las URLs al registro solo en desarrollo ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  const src = fuente('App.tsx');
  let enlaces = null;
  let filtro = null;
  const visitar = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'linking' && n.initializer && ts.isObjectLiteralExpression(n.initializer)) enlaces = n.initializer;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'shouldHandleUrl' && n.initializer) filtro = n.initializer.getText(src);
    ts.forEachChild(n, visitar);
  };
  visitar(src);
  const metodo = (nombre) => enlaces && enlaces.properties.find((p) => p.name && p.name.getText(src) === nombre)?.getText(src);
  const objeto = (texto) => `({ ${metodo('getInitialURL')}, ${metodo('subscribe')} })`;
  const correr = async (dev, texto = objeto()) => {
    const registros = [];
    let alEscuchar = null;
    const alcance = {
      __DEV__: dev, console: { log: (...a) => registros.push(a.join(' ')), warn() {}, error() {} },
      Linking: { getInitialURL: async () => 'wee://post/abc?token=secreto', addEventListener: (_e, cb) => { alEscuchar = cb; return { remove() {} }; } },
    };
    alcance.shouldHandleUrl = ejecutable(filtro, alcance);
    const L = ejecutable(texto, alcance);
    const inicial = await L.getInitialURL();
    const recibidas = [];
    L.subscribe((u) => recibidas.push(u));
    alEscuchar({ url: 'wee://perfil/xyz' });
    alEscuchar({ url: 'exp+wee://expo-development-client/?url=x' });
    return { registros, inicial, recibidas };
  };
  const prod = await correr(false);
  check('17) en producción ninguna URL va al registro', prod.registros.length === 0, prod.registros.join(' | '));
  check('17) y los enlaces siguen funcionando igual', prod.inicial === 'wee://post/abc?token=secreto'
    && JSON.stringify(prod.recibidas) === JSON.stringify(['wee://perfil/xyz']));
  const dev = await correr(true);
  check('17) CONTROL: en desarrollo se siguen viendo', dev.registros.some((l) => /secreto/.test(l)) && dev.registros.some((l) => /perfil\/xyz/.test(l)));
  const sab = await correr(false, objeto().replace(/if \(__DEV__\) /g, '').replace(/else if \(__DEV__\)/g, 'else'));
  check('17) SABOTAJE: sin la guarda, en producción se registran y se ve', sab.registros.some((l) => /secreto/.test(l)));
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── H · WeeTalk por debajo de las mil líneas, sin perder un estilo ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  const pantalla = leer('screens/ConversationScreen.tsx');
  const lineas = pantalla.split('\n').length - (pantalla.endsWith('\n') ? 1 : 0);
  check('18) screens/ConversationScreen.tsx tiene menos de mil líneas', lineas < 1000, `${lineas} líneas`);
  check('18) sus estilos viven en ConversationScreen.styles.ts y la pantalla ya no crea ninguno',
    /import \{ styles \} from '\.\/ConversationScreen\.styles';/.test(pantalla) && !/StyleSheet\.create\(/.test(pantalla));
  const rn = comoUrl("export const Platform = { OS: 'ios', select: (o) => (o.ios !== undefined ? o.ios : o.default) };\n"
    + 'export const StyleSheet = { create: (o) => o, hairlineWidth: 0.5, absoluteFill: {}, absoluteFillObject: {} };\n');
  const escala = comoUrl(ts.transpileModule(leer('utils/scale.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
    .outputText.split("from 'react-native'").join(`from '${rn}'`));
  const diseno = comoUrl(ts.transpileModule(leer('constants/design.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
    .outputText.split("from '../utils/scale'").join(`from '${escala}'`));
  /* + cierre: el borde de foco de la web sale de `utils/platform` (noOutline), sin `as any` propio. */
  const plataforma = comoUrl(ts.transpileModule(leer('utils/platform.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
    .outputText.split("from 'react-native'").join(`from '${rn}'`));
  const { styles } = await cargarModulo('screens/ConversationScreen.styles.ts', { 'react-native': rn, '../constants/design': diseno, '../utils/platform': plataforma });
  const usados = [...new Set([...sinComentarios(pantalla).matchAll(/\bstyles\.(\w+)/g)].map((m) => m[1]))];
  const faltan = usados.filter((k) => !(k in styles));
  check('19) cada estilo que la pantalla usa existe en el módulo, con su valor', usados.length >= 40 && faltan.length === 0
    && styles.screen && styles.screen.flex === 1, faltan.join(' ') || `${usados.length} estilos`);
  /* SABOTAJE: si al mudarlos se hubiera quedado uno por el camino, la misma cuenta lo diría. */
  const conUnoMenos = { ...styles };
  delete conUnoMenos[usados[0]];
  check('19) SABOTAJE: un estilo perdido en la mudanza se vería', usados.filter((k) => !(k in conUnoMenos)).length === 1);
}

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n── I · Comunidades: solo las activas, nunca la colección entera ──');
/* ════════════════════════════════════════════════════════════════════════ */
{
  const DATOS = [
    { id: 'o1', isOfficial: true, status: 'active', memberCount: 50, name: 'Oficial' },
    { id: 'u1', isOfficial: false, status: 'active', memberCount: 7, name: 'Mía' },
    { id: 'u2', isOfficial: false, status: 'active', memberCount: 30, name: 'Popular' },
    { id: 'u3', isOfficial: false, status: 'pending', memberCount: 99, name: 'Pendiente' },
    { id: 'u4', status: 'rejected', memberCount: 5, name: 'Rechazada' },
    { id: 'u5', status: 'active', memberCount: 3, name: 'Sin marca de oficial' },
  ];
  globalThis.__cierreFirestore = { lecturas: [], primariaFalla: false, datos: DATOS };
  const firestore = comoUrl(`
    const R = () => globalThis.__cierreFirestore;
    export const collection = (_db, nombre) => ({ tipo: 'coleccion', nombre });
    export const where = (campo, op, valor) => ({ tipo: 'where', campo, op, valor });
    export const orderBy = (campo, dir) => ({ tipo: 'orderBy', campo, dir });
    export const limit = (n) => ({ tipo: 'limit', n });
    export const query = (col, ...partes) => ({ tipo: 'query', col, partes });
    export const getDocs = async (q) => {
      const r = R(); r.lecturas.push(q);
      const partes = q.tipo === 'query' ? q.partes : [];
      if (partes.some((p) => p.tipo === 'orderBy') && r.primariaFalla) throw new Error('failed-precondition: index');
      let docs = r.datos.filter((d) => partes.filter((p) => p.tipo === 'where').every((w) => d[w.campo] === w.valor));
      const orden = partes.find((p) => p.tipo === 'orderBy');
      if (orden) docs = [...docs].filter((d) => d[orden.campo] !== undefined).sort((a, b) => b[orden.campo] - a[orden.campo]);
      return { docs: docs.map((d) => ({ id: d.id, data: () => d })) };
    };
    const nada = () => { throw new Error('no se usa aquí'); };
    export const doc = nada, addDoc = nada, getDoc = nada, updateDoc = nada, deleteDoc = nada, increment = nada,
      arrayUnion = nada, arrayRemove = nada, writeBatch = nada;
    export const Timestamp = { now: () => 0 };
  `);
  const M = await cargarModulo('services/communityService.ts', {
    'firebase/firestore': firestore,
    '../config/firebase': comoUrl('export const db = {};'),
    '../constants/communityCategories': comoUrl('export const COMMUNITY_CATEGORIES = [];'),
  });
  const ids = (xs) => xs.map((c) => c.id).join(',');
  const R = globalThis.__cierreFirestore;
  const origConsola = globalThis.console;
  globalThis.console = { ...origConsola, log() {}, error() {} };
  try {
    /* Lo que devolvía leyendo TODO y filtrando en JS: el contrato que no puede cambiar. */
    const antesUsuario = DATOS.filter((c) => !c.isOfficial && c.status === 'active').sort((a, b) => b.memberCount - a.memberCount);
    const antesFallback = DATOS.filter((c) => c.status === 'active').sort((a, b) => b.memberCount - a.memberCount);

    R.lecturas.length = 0;
    const deUsuarios = await M.communityService.getUserCommunities();
    check('20) Comunidades: la pantalla ve exactamente las mismas que antes', ids(deUsuarios) === ids(antesUsuario), ids(deUsuarios));
    check('20) y ya no se lee la colección entera: solo las activas',
      R.lecturas.length === 1 && R.lecturas[0].tipo === 'query' && R.lecturas[0].partes.some((p) => p.tipo === 'where' && p.campo === 'status' && p.valor === 'active'));

    R.lecturas.length = 0;
    R.primariaFalla = true;
    const conRespaldo = await M.communityService.getCommunities();
    check('21) sin el índice, el respaldo devuelve lo mismo que antes', ids(conRespaldo) === ids(antesFallback), ids(conRespaldo));
    check('21) y tampoco lee la colección entera', R.lecturas.every((q) => q.tipo !== 'coleccion')
      && R.lecturas[1] && R.lecturas[1].partes.some((p) => p.tipo === 'where' && p.campo === 'status'));
    R.primariaFalla = false;
    /*
     * SABOTAJE: la versión de antes —leer la colección ENTERA y filtrar en JS—, con el mismo Firestore de juguete.
     * Devuelve lo mismo (por eso el contrato no cambia), pero la comprobación de la 20 la caza.
     */
    const F = await import(firestore);
    R.lecturas.length = 0;
    const viejo = async () => (await F.getDocs(F.collection({}, 'communities'))).docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => !c.isOfficial && c.status === 'active').sort((a, b) => b.memberCount - a.memberCount);
    const deAntes = await viejo();
    const soloActivas = R.lecturas.length === 1 && R.lecturas[0].tipo === 'query'
      && R.lecturas[0].partes.some((p) => p.tipo === 'where' && p.campo === 'status' && p.valor === 'active');
    check('21) SABOTAJE: la lectura de la colección entera da lo mismo, pero se ve', ids(deAntes) === ids(antesUsuario) && !soloActivas);
  } finally {
    globalThis.console = origConsola;
  }
  /* El perfil del aviso de ËContact: se usa el primero, así que se pide uno. */
  const perfilDe = (leer('services/econtactService.ts').match(/const perfilDe = async[\s\S]*?\n\};/) || [''])[0];
  check('22) perfilDe pide un documento y usa ese', /where\('uid', '==', identidad\), limit\(1\)\)\)/.test(perfilDe) && /snap\.docs\[0\]/.test(perfilDe));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nEl cierre del cliente se sostiene');
process.exit(failures ? 1 : 0);
