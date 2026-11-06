/**
 * LO QUE UN DIÁLOGO DECIDE TIENE QUE PASAR TAMBIÉN EN LA WEB.
 *
 *   node test/avisos-en-la-web.test.mjs
 *
 * En React Native Web `Alert.alert` es `static alert() {}` (react-native-web/dist/exports/Alert): no pinta nada y no
 * llama a ninguno de sus botones. Siete manejadores tenían su trabajo DENTRO del `onPress` de un botón de alerta, así
 * que en la web no pasaba nada: no se podía borrar una publicación, una conversación, un producto ni una reseña; salir
 * de una comunidad dejaba el indicador girando; crear un negocio no salía del formulario —y un segundo toque creaba
 * OTRO, porque `createBusiness` es un `addDoc`—, y crear el Perfil Weë no volvía atrás.
 *
 * Esta prueba no lee el código buscando palabras: SACA cada manejador de su archivo (con el analizador de TypeScript),
 * lo ejecuta con dobles de sus servicios y con el `utils/notify.ts` DE VERDAD —con `Platform.OS` de la web y luego del
 * teléfono—, y mira lo que ocurre:
 *
 *   · en la web, con `window.confirm` diciendo que sí, el borrado ocurre; diciendo que no, no ocurre;
 *   · en el teléfono, el diálogo es el MISMO de antes (título, mensaje, Cancelar y el botón destructivo) y pulsar el
 *     destructivo hace el trabajo;
 *   · crear un negocio navega a su perfil sin esperar a ningún botón, y ni dos toques seguidos ni uno después del éxito
 *     crean un segundo negocio; si falla, se avisa y se puede reintentar;
 *   · crear el Perfil Weë vuelve atrás en la web.
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

/* ── Sacar un manejador de su archivo ─────────────────────────────────────── */

/** `const nombre = (…) => {…}` (o envuelto en `useCallback`), con su árbol. */
const funcionDe = (archivo, nombre) => {
  const src = ts.createSourceFile(archivo, leer(archivo), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let hallada = null;
  const visitar = (n) => {
    if (hallada) return;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nombre && n.initializer) {
      let ini = n.initializer;
      if (ts.isCallExpression(ini) && ini.expression.getText(src) === 'useCallback') ini = ini.arguments[0];
      if (ini && (ts.isArrowFunction(ini) || ts.isFunctionExpression(ini))) { hallada = ini; return; }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(src);
  return hallada ? { nodo: hallada, src } : null;
};

/**
 * El manejador, ejecutable, con sus nombres libres resueltos en `alcance`. Lo que no está en el alcance es global
 * (`Promise`, `setTimeout`); lo que no está en ninguno de los dos revienta con un ReferenceError, que es lo que debe
 * pasar si el manejador empieza a usar algo que esta prueba no conoce.
 */
const ejecutable = (texto, alcance) => {
  const js = ts.transpileModule(`(${texto});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  }).outputText.replace(/^"use strict";\s*/, '').replace(/^export \{\};\s*$/m, '').trim().replace(/;$/, '');
  const caja = new Proxy(alcance, { has: (o, k) => k in o });
  // eslint-disable-next-line no-new-func
  return new Function('__caja', `with (__caja) { return (${js}); }`)(caja);
};

/* Las llamadas a `Alert.alert` que quedan DENTRO del manejador. */
const alertasDentro = ({ nodo, src }) => {
  const halladas = [];
  const visitar = (n) => {
    if (ts.isCallExpression(n) && n.expression.getText(src) === 'Alert.alert') halladas.push(n.getText(src).slice(0, 60));
    ts.forEachChild(n, visitar);
  };
  visitar(nodo);
  return halladas;
};

/* ── El `utils/notify.ts` de verdad, con la plataforma que se pida ────────── */

let instancias = 0;
const notifyPara = async (plataforma) => {
  const clave = `__notify_${plataforma}_${instancias++}`;
  const registro = { alertas: [] };
  globalThis[clave] = registro;
  /* `react-native` en pequeño: `Platform.OS` y un `Alert.alert` que apunta lo que se le pide. En la web, apuntarlo no
   * lo enseña: react-native-web no pinta nada ni pulsa ningún botón, y esta prueba tampoco. */
  const rn = `export const Platform = { OS: ${JSON.stringify(plataforma)} };\n`
    + `export const Alert = { alert: (...a) => { globalThis[${JSON.stringify(clave)}].alertas.push(a); } };\n`;
  const urlRn = 'data:text/javascript;base64,' + Buffer.from(rn).toString('base64');
  let js = ts.transpileModule(leer('utils/notify.ts'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  js = js.split(`from 'react-native'`).join(`from '${urlRn}'`);
  const mod = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  return { ...mod, registro };
};

const WEB = await notifyPara('web');
const MOVIL = await notifyPara('ios');

/* La web: `window.confirm` contesta lo que diga la prueba y `window.alert` apunta lo que enseñaría. */
const ventana = { respuesta: true, confirms: [], avisos: [] };
globalThis.window = {
  confirm: (m) => { ventana.confirms.push(m); return ventana.respuesta; },
  alert: (m) => { ventana.avisos.push(m); },
};
const reiniciar = () => {
  ventana.confirms.length = 0;
  ventana.avisos.length = 0;
  WEB.registro.alertas.length = 0;
  MOVIL.registro.alertas.length = 0;
};

/* Lo que no importa aquí, en silencio. */
const consola = { log() {}, warn() {}, error() {} };
const t = (k, v) => (v ? `${k}${JSON.stringify(v)}` : k);
const espia = (impl = () => undefined) => {
  const f = (...a) => { f.llamadas.push(a); return impl(...a); };
  f.llamadas = [];
  return f;
};
const ticks = async (n = 5) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
/* Cómo se ve un diálogo del teléfono: título, mensaje y sus botones por texto y estilo. */
const forma = (a) => a && JSON.stringify([a[0], a[1], (a[2] || []).map((b) => [b.text, b.style || null])]);

/*
 * LAS CUATRO CONFIRMACIONES DE BORRAR. Cada una, con el diálogo que tenía en el teléfono y lo que tiene que pasar si se
 * confirma.
 */
const BORRADOS = [
  {
    nombre: 'borrar una publicación propia', archivo: 'components/PostCard.tsx', funcion: 'handleDeletePost',
    dialogo: ['wall.deletePost', 'wall.deletePostConfirm', [['common.cancel', 'cancel'], ['common.delete', 'destructive']]],
    alcance: () => {
      const postsService = { delete: espia(async () => {}) };
      return { alcance: { setMenuVisible: espia(), post: { id: 'post-1' }, postsService }, hecho: () => postsService.delete.llamadas.length === 1 && postsService.delete.llamadas[0][0] === 'post-1' };
    },
    argumentos: [],
  },
  {
    nombre: 'borrar una conversación', archivo: 'screens/InboxScreen.tsx', funcion: 'deleteChat',
    dialogo: ['weetalk.deleteConversation', 'weetalk.areYouSure', [['common.cancel', 'cancel'], ['common.delete', 'destructive']]],
    alcance: () => {
      const messagesService = { deleteConversation: espia(async () => {}) };
      return { alcance: { messagesService }, hecho: () => messagesService.deleteConversation.llamadas.length === 1 && messagesService.deleteConversation.llamadas[0][0] === 'conv-1' };
    },
    argumentos: ['conv-1'],
  },
  /* «borrar un producto» y «borrar la reseña propia» eran de WeeBiz, retirado por decisión del dueño el 2026-11-03: era del proyecto antiguo. */
];

console.log('\n── A · Borrar, en la web y en el teléfono ──');
for (const caso of BORRADOS) {
  const fn = funcionDe(caso.archivo, caso.funcion);
  check(`1) ${caso.nombre}: ${caso.archivo}#${caso.funcion} existe`, !!fn);
  if (!fn) continue;
  check(`2) ${caso.nombre}: ya no queda un Alert.alert dentro`, alertasDentro(fn).length === 0, alertasDentro(fn).join(' · '));

  const correr = async (plataforma, respuesta) => {
    reiniciar();
    ventana.respuesta = respuesta;
    const { alcance, hecho } = caso.alcance();
    const n = plataforma === 'web' ? WEB : MOVIL;
    const h = ejecutable(fn.nodo.getText(fn.src), {
      ...alcance, t, console: consola, Alert: { alert: (...a) => n.registro.alertas.push(a) },
      confirmAction: n.confirmAction, notify: n.notify,
    });
    const p = h(...caso.argumentos);
    await ticks();
    return { p, hecho, registro: n.registro };
  };

  /* La web: sí es sí. */
  {
    const { p, hecho } = await correr('web', true);
    await p;
    await ticks();
    check(`3) ${caso.nombre}: en la web, confirmar lo hace`, hecho() && ventana.confirms.length === 1,
      `confirms=${ventana.confirms.length}`);
  }
  /* La web: no es no. */
  {
    const { p, hecho } = await correr('web', false);
    await p;
    await ticks();
    check(`4) ${caso.nombre}: en la web, cancelar no hace nada`, !hecho() && ventana.confirms.length === 1);
  }
  /* El teléfono: el mismo diálogo de antes, y su botón destructivo hace el trabajo. */
  {
    const { p, hecho, registro } = await correr('ios', true);
    const dialogo = registro.alertas[0];
    check(`5) ${caso.nombre}: en el teléfono el diálogo es el mismo (título, mensaje, Cancelar y el destructivo)`,
      registro.alertas.length === 1 && forma(dialogo) === JSON.stringify(caso.dialogo), forma(dialogo));
    const destructivo = (dialogo?.[2] || []).find((b) => b.style === 'destructive');
    await Promise.resolve(destructivo?.onPress?.());
    await p;
    await ticks();
    check(`6) ${caso.nombre}: en el teléfono, pulsar el destructivo lo hace`, hecho());
  }
}

console.log('\n── B · Salir de una comunidad ──');
{
  const caso = { archivo: 'screens/CommunitiesManagementScreen.tsx', funcion: 'handleToggleCommunity' };
  const fn = funcionDe(caso.archivo, caso.funcion);
  check('7) CommunitiesManagementScreen#handleToggleCommunity existe', !!fn);
  if (fn) {
    check('8) ya no queda un Alert.alert dentro', alertasDentro(fn).length === 0, alertasDentro(fn).join(' · '));
    const correr = async (plataforma, respuesta, { unido = true, fallaSalir = false } = {}) => {
      reiniciar();
      ventana.respuesta = respuesta;
      const n = plataforma === 'web' ? WEB : MOVIL;
      const communityService = {
        leaveCommunity: espia(async () => { if (fallaSalir) throw new Error('red'); }),
        joinCommunity: espia(async () => {}),
      };
      const setJoiningCommunity = espia();
      const h = ejecutable(fn.nodo.getText(fn.src), {
        user: { uid: 'u1' }, navigateToRegister: espia(), joinedCommunityIds: unido ? ['c1'] : [], setJoiningCommunity,
        nombreDeComunidad: (c) => c.name, locale: 'es-ES', communityService, updateLocalProfile: espia(),
        setCommunities: espia((f) => f([])), t, console: consola, Alert: { alert: (...a) => n.registro.alertas.push(a) },
        confirmAction: n.confirmAction, notify: n.notify,
      });
      const p = h({ id: 'c1', name: 'Weë Filmmakers' });
      await ticks();
      return { p, communityService, setJoiningCommunity, registro: n.registro };
    };
    const ultimo = (espiado) => espiado.llamadas.at(-1)?.[0];

    {
      const { p, communityService, setJoiningCommunity } = await correr('web', true);
      await p; await ticks();
      check('9) en la web, confirmar sale de la comunidad', communityService.leaveCommunity.llamadas.length === 1);
      check('10) y el indicador se apaga', ultimo(setJoiningCommunity) === null, String(ultimo(setJoiningCommunity)));
    }
    {
      const { p, communityService, setJoiningCommunity } = await correr('web', false);
      await p; await ticks();
      check('11) en la web, cancelar no sale y el indicador no se queda girando',
        communityService.leaveCommunity.llamadas.length === 0 && ultimo(setJoiningCommunity) === null, String(ultimo(setJoiningCommunity)));
    }
    {
      const { p, communityService, setJoiningCommunity } = await correr('web', true, { fallaSalir: true });
      await p; await ticks();
      check('12) si salir falla, en la web se ve el aviso (common.error + communities.leaveFailed) y el indicador se apaga',
        communityService.leaveCommunity.llamadas.length === 1 && ventana.avisos.some((a) => /common\.error/.test(a) && /communities\.leaveFailed/.test(a))
        && ultimo(setJoiningCommunity) === null, JSON.stringify(ventana.avisos));
    }
    {
      const { p, communityService } = await correr('web', true, { unido: false });
      await p; await ticks();
      check('13) unirse sigue siendo directo, sin diálogo', communityService.joinCommunity.llamadas.length === 1 && ventana.confirms.length === 0);
    }
    {
      const { p, communityService, setJoiningCommunity, registro } = await correr('ios', true);
      const dialogo = registro.alertas[0];
      check('14) en el teléfono el diálogo de salir es el mismo (título, mensaje con el nombre, Cancelar y Salir destructivo)',
        forma(dialogo) === JSON.stringify(['communities.leaveTitle', 'communities.leaveConfirm{"nombre":"Weë Filmmakers"}', [['common.cancel', 'cancel'], ['communities.leave', 'destructive']]]),
        forma(dialogo));
      /* Mientras el diálogo está abierto, el indicador gira, como antes. */
      check('15) y mientras está abierto el indicador gira, como antes', ultimo(setJoiningCommunity) === 'c1');
      const cancelar = (dialogo?.[2] || []).find((b) => b.style === 'cancel');
      await Promise.resolve(cancelar?.onPress?.());
      await p; await ticks();
      check('16) Cancelar en el teléfono no sale y apaga el indicador',
        communityService.leaveCommunity.llamadas.length === 0 && ultimo(setJoiningCommunity) === null);
    }
  }
}

console.log('\n── C · El alta de negocios de WeeBiz ya no existe ──');
{
  /* WeeBiz (directorio de negocios) retirado por decisión del dueño el 2026-11-03: era del proyecto antiguo. */
  const quedan = ['screens/WeeBizRegisterScreen.tsx', 'screens/WeeBizProfileScreen.tsx', 'screens/WeeBizProductsScreen.tsx']
    .filter((a) => fs.existsSync(path.resolve(raiz, a)));
  check('17) las pantallas de WeeBiz con avisos se retiraron', quedan.length === 0, quedan.join(' · '));
}

console.log('\n── D · Crear el Perfil Weë vuelve atrás ──');
{
  const fn = funcionDe('screens/WeeProfileCreationScreen.tsx', 'handleCreate');
  check('29) WeeProfileCreationScreen#handleCreate existe', !!fn);
  if (fn) {
    check('30) ya no queda un Alert.alert dentro', alertasDentro(fn).length === 0, alertasDentro(fn).join(' · '));
    const correr = async (plataforma) => {
      reiniciar();
      const n = plataforma === 'web' ? WEB : MOVIL;
      const navigation = { goBack: espia() };
      const usersService = { ensureWeeProfile: espia(async () => ({ perfil: { id: 'hidi_u1' }, creado: true })) };
      const setWeeProfile = espia();
      const h = ejecutable(fn.nodo.getText(fn.src), {
        canCreate: true, user: { uid: 'u1' }, realProfile: { id: 'u1' }, setIsCreating: espia(), console: consola,
        identidadWeeDe: (uid) => `hidi_${uid}`, selectedAvatarType: 'predefined', customAvatarUri: null, isDiceBearUrl: () => false,
        uploadProfileImageFromUri: espia(), usersService, displayName: 'Geo', bio: '', selectedAvatarId: 'male', setWeeProfile,
        t, navigation, Alert: { alert: (...a) => n.registro.alertas.push(a) }, notify: n.notify,
      });
      await h();
      await ticks();
      return { navigation, setWeeProfile, registro: n.registro };
    };
    {
      const { navigation, setWeeProfile } = await correr('web');
      check('31) en la web, crear el Perfil Weë avisa y vuelve atrás',
        setWeeProfile.llamadas.length === 1 && navigation.goBack.llamadas.length === 1
        && ventana.avisos.some((a) => /onboarding\.weeCreatedTitle/.test(a) && /onboarding\.weeCreated\b/.test(a)), JSON.stringify(ventana.avisos));
    }
    {
      const { navigation, registro } = await correr('ios');
      check('32) en el teléfono, el mismo aviso y la misma vuelta',
        navigation.goBack.llamadas.length === 1 && registro.alertas.length === 1 && registro.alertas[0][0] === 'onboarding.weeCreatedTitle');
    }
  }
}

console.log('\n── E · El arreglo es el canónico ──');
{
  /* `utils/notify.ts` es el arreglo de CLAUDE.md para la web; nadie se escribió su propio `window.confirm`. */
  const ARCHIVOS = ['components/PostCard.tsx', 'screens/InboxScreen.tsx',
    'screens/CommunitiesManagementScreen.tsx', 'screens/WeeProfileCreationScreen.tsx'];
  const sinNotify = ARCHIVOS.filter((a) => !/import \{[^}]*\b(?:confirmAction|notify)\b[^}]*\} from '\.\.\/utils\/notify';/.test(leer(a)));
  check('33) los cuatro archivos usan utils/notify.ts', sinNotify.length === 0, sinNotify.join(' · '));
  const propios = ARCHIVOS.filter((a) => /window\.(?:confirm|alert)\(/.test(leer(a)));
  check('34) y ninguno llama a window.confirm/window.alert por su cuenta', propios.length === 0, propios.join(' · '));
  /* CONTROL: la prueba ve el fallo. Un manejador con su trabajo dentro de un Alert.alert, en la web, no hace nada. */
  const control = ts.createSourceFile('c.tsx', "const borrar = () => { Alert.alert('a', 'b', [{ text: 'x', style: 'destructive', onPress: () => hacer() }]); };", ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let nodo = null;
  ts.forEachChild(control, function v(n) { if (!nodo && ts.isArrowFunction(n)) nodo = n; ts.forEachChild(n, v); });
  const hacer = espia();
  ejecutable(nodo.getText(control), { Alert: { alert() {} }, hacer })();
  check('35) control: con el Alert.alert de react-native-web, el trabajo del botón no ocurre', hacer.llamadas.length === 0
    && alertasDentro({ nodo, src: control }).length === 1);
}

check('esta suite está en la cadena de `npm test`', /avisos-en-la-web\.test\.mjs/.test(leer('functions/package.json')));
delete globalThis.window;
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
