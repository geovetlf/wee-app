/*
 * ELIMINAR LA CUENTA (`functions/src/cuenta`), con dependencias de mentira:
 * ni Firestore, ni Storage, ni Auth.
 *
 *  A · la puerta: sesión, confirmación explícita (constante, no una palabra del
 *      idioma) e inicio de sesión reciente (`reautenticar`);
 *  B · las dos caras: el Perfil Weë se LEE en su documento, nunca se deduce del prefijo;
 *  C · el plan: personaje primero, avatar, las dos caras, Auth al final, y los
 *      registros contables intactos;
 *  D · idempotente: un fallo a medias se arregla repitiendo, y repetir lo ya
 *      borrado no falla;
 *  E · el repo: regla de auditoría, Functions exportadas, pantalla con claves
 *      i18n que existen, sin `Alert.alert`, navegación y cadena;
 *  F · «30 días y luego se borra» (2026-11-22): desactivar marca y oculta sin
 *      borrar Auth y apaga el pase; reactivar restaura SOLO lo ocultado; las
 *      vencidas se borran con el plan completo y las que no, no;
 *  G · el repo de la desactivación: índice, reglas, listados que filtran,
 *      la puerta «Activar cuenta» y las claves.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const B = lib('cuenta/borrado.js');
const AHORA = 1_800_000_000_000;
const AHORA_S = AHORA / 1000;

/* ── El mundo de mentira ─────────────────────────────────────────────────── */

const REAL = { uid: 'cuenta1', profileType: 'real', linkedAccountId: 'hidi_cuenta1', joinedCommunities: ['c1', 'c2'] };
const WEE = { uid: 'hidi_cuenta1', profileType: 'hidi', linkedAccountId: 'cuenta1', joinedCommunities: ['c3'] };

function mundo({ real = REAL, wee = WEE, falla = null } = {}) {
  const m = {
    perfiles: new Map([['cuenta1', real], ['hidi_cuenta1', wee]].filter(([, v]) => v)),
    hechos: [],
    auditoria: [],
    falla,
    /* Lo que hay en el resto de Weë: se va vaciando según los pasos. */
    contenido: new Set(['personaje', 'avatar', 'posts:cuenta1', 'posts:hidi_cuenta1', 'creatorJobs', 'auth']),
  };
  m.deps = {
    ahora: () => AHORA,
    perfilesRealesDe: async (uid) => (m.perfiles.has(uid) ? [{ id: uid, datos: m.perfiles.get(uid) }] : []),
    leerPerfil: async (id) => m.perfiles.get(id) || null,
    ejecutar: async (paso) => {
      if (m.falla && m.falla(paso)) { m.falla = null; throw new Error('se cayó la red'); }
      m.hechos.push(paso);
      if (paso.tipo === 'personaje') return m.contenido.delete('personaje') ? 5 : 0;
      if (paso.tipo === 'storage' && paso.prefijo.includes('ai-avatar')) return m.contenido.delete('avatar') ? 1 : 0;
      if (paso.tipo === 'publicaciones') return m.contenido.delete(`posts:${paso.identidad}`) ? 3 : 0;
      if (paso.tipo === 'consulta' && paso.coleccion === 'creatorJobs') return m.contenido.delete('creatorJobs') ? 2 : 0;
      if (paso.tipo === 'perfiles') { let n = 0; for (const r of paso.rutas) if (m.perfiles.delete(r.split('/')[1])) n++; return n; }
      if (paso.tipo === 'auth') return m.contenido.delete('auth') ? 1 : 0;
      return 0;
    },
    auditar: async (huella, datos) => { m.auditoria.push({ huella, ...datos }); },
  };
  return m;
}

console.log('\n── A · la puerta ──');
{
  const ok = (sesion, datos, ahora = AHORA) => B.validarPeticion(sesion, datos, ahora);
  const conf = { confirmacion: B.CONFIRMACION_DE_BORRADO };
  check('1) sin sesión → sinSesion', ok(null, conf).motivo === 'sinSesion');
  check('2) sin confirmación → sinConfirmacion', ok({ uid: 'cuenta1', authTime: AHORA_S }, {}).motivo === 'sinConfirmacion');
  check('3) una palabra de la app («ELIMINAR», «DELETE») no vale: la confirmación es una constante',
    ok({ uid: 'cuenta1', authTime: AHORA_S }, { confirmacion: 'ELIMINAR' }).motivo === 'sinConfirmacion'
    && ok({ uid: 'cuenta1', authTime: AHORA_S }, { confirmacion: 'DELETE' }).motivo === 'sinConfirmacion');
  check('4) inicio de sesión de hace 2 min → se puede', ok({ uid: 'cuenta1', authTime: AHORA_S - 120 }, conf).ok === true);
  check('5) inicio de sesión de hace 11 min → reautenticar', ok({ uid: 'cuenta1', authTime: AHORA_S - 11 * 60 }, conf).motivo === 'reautenticar');
  check('6) sin auth_time → reautenticar', ok({ uid: 'cuenta1' }, conf).motivo === 'reautenticar');
  check('7) la ventana es de diez minutos', B.VENTANA_DE_INICIO_RECIENTE_S === 600);
  check('8) el uid sale de la sesión: la puerta no lee ningún uid de los datos',
    !/request\.data\??\.(uid|userId|cuentaId)/.test(sinComentarios(leer('functions/src/cuenta/index.ts'))));
}

console.log('\n── B · las dos caras ──');
{
  const m = mundo();
  const ids = await B.resolverIdentidades(m.deps, 'cuenta1');
  check('9) encuentra el Perfil Real y el Perfil Weë', ids.documentosReales.join() === 'cuenta1' && ids.perfilWee === 'hidi_cuenta1');
  check('10) las identidades que firman contenido son la cuenta y su cara Weë', ids.identidades.join() === 'cuenta1,hidi_cuenta1');
  check('11) junta las comunidades de las dos caras', ['c1', 'c2', 'c3'].every((c) => ids.comunidades.includes(c)));

  const ajeno = mundo({ wee: { uid: 'hidi_cuenta1', profileType: 'hidi', linkedAccountId: 'otraCuenta' } });
  const idsAjeno = await B.resolverIdentidades(ajeno.deps, 'cuenta1');
  check('12) un `hidi_<uid>` cuyo documento dice OTRA cuenta no se toca: el prefijo no basta', idsAjeno.perfilWee === null
    && !B.planDeBorrado(idsAjeno).some((p) => p.tipo === 'personaje' || JSON.stringify(p).includes('hidi_cuenta1')));

  const sinWee = mundo({ wee: null });
  const idsSinWee = await B.resolverIdentidades(sinWee.deps, 'cuenta1');
  check('13) sin Perfil Weë: solo la cara real, sin personaje', idsSinWee.perfilWee === null && idsSinWee.identidades.join() === 'cuenta1'
    && !B.planDeBorrado(idsSinWee).some((p) => p.tipo === 'personaje'));

  /* El vínculo del Perfil Real manda dónde mirar, aunque no sea el sitio canónico (lo confirma el documento). */
  const m2 = mundo({ real: { ...REAL, linkedAccountId: 'hidi_cuenta1' } });
  check('14) busca la cara Weë en el vínculo `linkedAccountId` del Perfil Real', (await B.resolverIdentidades(m2.deps, 'cuenta1')).perfilWee === 'hidi_cuenta1');
  check('15) usa `cuentaDeIdentidad` (el helper de econtact), no un prefijo', /cuentaDeIdentidad\(/.test(leer('functions/src/cuenta/borrado.ts')));
}

console.log('\n── C · el plan ──');
{
  const m = mundo();
  const plan = B.planDeBorrado(await B.resolverIdentidades(m.deps, 'cuenta1'));
  const tipos = plan.map((p) => p.tipo);
  check('16) lo primero es el personaje del Perfil Weë', plan[0].tipo === 'personaje' && plan[0].perfilId === 'hidi_cuenta1');
  check('17) después el avatar del Perfil Weë (ai-avatar, avatar-replacement, face-swap)',
    ['ai-avatar', 'avatar-replacement', 'face-swap'].every((c) => plan.slice(1, 4).some((p) => p.tipo === 'storage' && p.prefijo === `users/hidi_cuenta1/${c}/`)));
  check('18) borra las publicaciones de las dos caras', ['cuenta1', 'hidi_cuenta1'].every((id) => plan.some((p) => p.tipo === 'publicaciones' && p.identidad === id)));
  const consulta = (col, campo, valor) => plan.some((p) => p.tipo === 'consulta' && p.coleccion === col && p.campo === campo && p.valor === valor);
  check('19) comentarios, likes y votos de las dos caras, con su contador ajustado',
    ['cuenta1', 'hidi_cuenta1'].every((id) => consulta('comments', 'userId', id) && consulta('likes', 'userId', id) && consulta('votes', 'userId', id))
    && plan.filter((p) => p.tipo === 'consulta' && ['comments', 'likes', 'votes'].includes(p.coleccion)).every((p) => p.ajuste));
  check('20) follows en las dos direcciones, ËContacts, notificaciones recibidas y enviadas',
    ['cuenta1', 'hidi_cuenta1'].every((id) => consulta('follows', 'followerId', id) && consulta('follows', 'followingId', id)
      && consulta('econtacts', 'users', id) && consulta('notifications', 'recipientId', id) && consulta('notifications', 'senderId', id)));
  check('21) comunidades y WeeTalk de cada cara', ['cuenta1', 'hidi_cuenta1'].every((id) => plan.some((p) => p.tipo === 'comunidades' && p.identidad === id) && plan.some((p) => p.tipo === 'weetalk' && p.identidad === id)));
  check('22) lo de Weë AI de la cuenta: proyectos, trabajos, Brain, creaciones',
    consulta('creatorProjects', 'userId', 'cuenta1') && consulta('creatorJobs', 'userId', 'cuenta1') && consulta('brainChats', 'userId', 'cuenta1') && consulta('assets', 'ownerAccountId', 'cuenta1'));
  check('23) trabajos y chats de Brain se borran con sus subcolecciones (private, messages)',
    plan.find((p) => p.coleccion === 'creatorJobs').recursivo === true && plan.find((p) => p.coleccion === 'brainChats').recursivo === true);
  check('24) tokens de push y núcleo de identidad', plan.some((p) => p.tipo === 'documento' && p.ruta === 'pushTokens/cuenta1') && plan.some((p) => p.tipo === 'documento' && p.ruta === 'accounts/cuenta1') && consulta('entities', 'ownerAccountId', 'cuenta1'));
  check('25) Storage de las dos caras', ['cuenta1', 'hidi_cuenta1'].every((id) => plan.some((p) => p.tipo === 'storage' && p.prefijo === `users/${id}/`)));
  const iPerfiles = tipos.indexOf('perfiles');
  check('26) los documentos `users` de las DOS caras, casi al final', iPerfiles === plan.length - 2 && plan[iPerfiles].rutas.join() === 'users/cuenta1,users/hidi_cuenta1');
  check('27) lo último es el usuario de Auth', plan[plan.length - 1].tipo === 'auth' && plan[plan.length - 1].uid === 'cuenta1');
  const contables = ['creditTransactions', 'creditStats', 'transactions', 'wallets', 'payments', 'refunds', 'revenue', 'aiGenerations', 'reports'];
  check('28) NINGÚN paso toca un registro contable ni de moderación',
    !plan.some((p) => contables.includes(p.coleccion) || (p.ruta && contables.includes(p.ruta.split('/')[0]))),
    plan.filter((p) => contables.includes(p.coleccion)).map((p) => p.coleccion).join());
  check('29) y la lista de lo que no se toca lo declara', contables.every((c) => B.COLECCIONES_QUE_NO_SE_TOCAN.includes(c)));
  check('30) el almacén de Firestore no nombra ninguna colección contable',
    !contables.some((c) => new RegExp(`['"\`]${c}['"\`/]`).test(sinComentarios(leer('functions/src/cuenta/almacenFirestore.ts')))));
  check('31) la auditoría no lleva ids: las claves del resumen son tipos y colecciones',
    plan.map(B.claveDelPaso).every((k) => !k.includes('cuenta1')));
  check('32) el id de auditoría es una huella, no el uid', B.huellaDeCuenta('cuenta1') !== 'cuenta1' && /^[0-9a-f]{64}$/.test(B.huellaDeCuenta('cuenta1')) && !B.huellaDeCuenta('cuenta1').includes('cuenta1'));
}

console.log('\n── D · de punta a punta e idempotente ──');
{
  const m = mundo();
  const r = await B.borrarCuenta(m.deps, 'cuenta1');
  check('33) borra todo: personaje, avatar, publicaciones, trabajos, perfiles y Auth', m.contenido.size === 0 && m.perfiles.size === 0, [...m.contenido].join());
  check('34) llamó al borrado del personaje con el Perfil Weë', m.hechos.some((p) => p.tipo === 'personaje' && p.perfilId === 'hidi_cuenta1'));
  check('35) la auditoría empieza «enCurso» y acaba «terminado», con el mismo id', m.auditoria[0].estado === 'enCurso' && m.auditoria.at(-1).estado === 'terminado'
    && m.auditoria.every((a) => a.huella === B.huellaDeCuenta('cuenta1')));
  check('36) y su resumen no contiene datos personales', !JSON.stringify(m.auditoria).includes('cuenta1'));
  check('37) devuelve cuántos pasos dio', r.pasos === m.hechos.length && r.conPerfilWee === true);

  /* Un fallo a mitad: los perfiles y Auth siguen ahí, así que el reintento encuentra las dos caras. */
  const f = mundo({ falla: (p) => p.tipo === 'weetalk' });
  let fallo = false;
  try { await B.borrarCuenta(f.deps, 'cuenta1'); } catch { fallo = true; }
  check('38) si un paso falla, el error sube y la auditoría queda «fallido» con el TIPO del paso',
    fallo && f.auditoria.at(-1).estado === 'fallido' && f.auditoria.at(-1).pasoFallido === 'weetalk');
  check('39) tras el fallo, los perfiles y Auth siguen (van al final)', f.perfiles.size === 2 && f.contenido.has('auth'));
  await B.borrarCuenta(f.deps, 'cuenta1');
  check('40) repetir termina el trabajo', f.contenido.size === 0 && f.perfiles.size === 0 && f.auditoria.at(-1).estado === 'terminado');
  check('41) y el reintento volvió a borrar el personaje sin fallar (idempotente)', f.hechos.filter((p) => p.tipo === 'personaje').length === 2);

  /* Repetir con todo ya borrado tampoco falla. */
  let otraVez = true;
  try { await B.borrarCuenta(m.deps, 'cuenta1'); } catch { otraVez = false; }
  check('42) repetir con todo ya borrado no falla', otraVez);
}

console.log('\n── E · el repo ──');
{
  const reglas = leer('firestore.rules');
  check('43) `accountDeletions` está cerrada a los clientes', /match \/accountDeletions\/\{[a-zA-Z]+\} \{\s*allow read, write: if false;/.test(reglas));
  const idx = sinComentarios(leer('functions/src/index.ts'));
  check('44) `eliminarCuenta`, `reactivarCuenta` y `borrarCuentasVencidas` salen de ./cuenta', /export \{ eliminarCuenta, reactivarCuenta, borrarCuentasVencidas \} from '\.\/cuenta';/.test(idx));
  const puerta = sinComentarios(leer('functions/src/cuenta/index.ts'));
  check('45) todo vive en us-central1', /const OPTS = \{ region: 'us-central1'/.test(puerta) && /eliminarCuenta = onCall\(OPTS/.test(puerta)
    && /reactivarCuenta = onCall\(\{ region: 'us-central1'/.test(puerta) && /borrarCuentasVencidas = onSchedule\(\{ schedule: 'every 24 hours', region: 'us-central1'/.test(puerta));
  const almacen = sinComentarios(leer('functions/src/cuenta/almacenFirestore.ts'));
  check('46) el almacén usa `borrarTodoDelPersonaje` de personajes/borrado', /import \{ borrarTodoDelPersonaje \} from '\.\.\/personajes\/borrado'/.test(almacen) && /borrarTodoDelPersonaje\(paso\.perfilId\)/.test(almacen));
  check('47) borra el usuario de Firebase Auth', /getAuth\(\)\.deleteUser\(/.test(almacen));
  check('48) WeeTalk vacía los mensajes y NO borra la conversación del otro', /content: '', imageUrl: null/.test(almacen) && /remitenteEliminado: true/.test(almacen) && /cuentaEliminada: true/.test(almacen));
  check('49) no toca el Credit Engine', !/credits\//.test(almacen) && !/credits\//.test(sinComentarios(leer('functions/src/cuenta/borrado.ts'))));

  const app = leer('services/cuentaService.ts');
  check('50) la constante de confirmación es la misma en la app y en el servidor', app.includes(`CONFIRMACION_DE_BORRADO = '${B.CONFIRMACION_DE_BORRADO}'`));
  const pantalla = leer('screens/EliminarCuentaScreen.tsx');
  const ajustes = leer('screens/SettingsScreen.tsx');
  check('51) la pantalla y su servicio no usan `Alert.alert` (no funciona en web)', !/Alert\.alert/.test(pantalla) && !/Alert\.alert/.test(app));
  check('52) la pantalla usa `confirmAction` y `notify`', /confirmAction\(/.test(pantalla) && /notify\(/.test(pantalla));

  /* Las claves que usan la pantalla y Configuración existen en español y en inglés. */
  const activar = leer('screens/ActivarCuentaScreen.tsx');
  const claves = (fuente) => [...fuente.matchAll(/\bt\('cuenta\.(\w+)'/g)].map((x) => x[1]);
  const usadas = [...new Set([...claves(pantalla), ...claves(ajustes), ...claves(activar)])];
  const definidas = (idioma) => new Set([...leer(`i18n/textos/${idioma}/cuenta.ts`).matchAll(/^\s+(\w+): '/gm)].map((x) => x[1]));
  const es = definidas('es'), en = definidas('en');
  /* Una clave con plural se usa por su nombre base y existe como `_one` / `_other`. */
  const existe = (set, k) => set.has(k) || (set.has(`${k}_one`) && set.has(`${k}_other`));
  const faltan = usadas.filter((k) => !existe(es, k) || !existe(en, k));
  check('53) cada clave `cuenta.*` que se usa (Eliminar, Activar y Configuración) existe en español y en inglés', usadas.length >= 30 && faltan.length === 0, faltan.join(', '));
  check('54) español e inglés tienen las mismas claves', es.size === en.size && [...es].every((k) => en.has(k)));
  check('55) el módulo `cuenta` está registrado en los índices de español e inglés',
    /import \{ cuenta \} from '\.\/cuenta';/.test(leer('i18n/textos/es/index.ts')) && /import \{ cuenta \} from '\.\/cuenta';/.test(leer('i18n/textos/en/index.ts')));
  check('56) ningún texto escrito a mano en la pantalla: todo lo visible sale de t()',
    !/>\s*[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡][^<{]*</.test(pantalla.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('57) Configuración abre la pantalla por la ruta `EliminarCuenta`', /navigate\('EliminarCuenta'\)/.test(ajustes));
  const nav = leer('navigation/MainStackNavigator.tsx');
  check('58) la ruta está registrada en la navegación', /name="EliminarCuenta" component=\{EliminarCuentaScreen\}/.test(nav) && /EliminarCuenta: undefined;/.test(nav));
  check('59) al terminar se cierra la sesión', /logout\(\)/.test(pantalla));
  check('60) la suite está en la cadena de `npm test`', leer('functions/package.json').includes('node test/cuenta-eliminar.test.mjs'));
}

/* ── F · «30 días y luego se borra» ─────────────────────────────────────── */

const D = lib('cuenta/desactivar.js');
const DIA = D.MS_POR_DIA;

/* Un mundo con perfiles, publicaciones, pase y Auth. */
function mundoD({ real = REAL, wee = WEE, reloj = AHORA } = {}) {
  const base = mundo({ real: real && { ...real }, wee: wee && { ...wee } });
  const m = Object.assign(base, {
    reloj,
    posts: [
      { id: 'p1', userId: 'cuenta1' },
      { id: 'p2', userId: 'hidi_cuenta1' },
      { id: 'p3', userId: 'cuenta1', ocultaPorDesactivacion: true, ajena: true }, /* ya oculta por otro motivo: no es suya */
      { id: 'p4', userId: 'otra' },
    ],
    pase: { estado: 'activa' },
    apagados: [],
  });
  const ocultadas = new Set();
  m.deps.ahora = () => m.reloj;
  Object.assign(m.deps, {
    marcarPerfiles: async (ids, marca) => {
      for (const id of ids) {
        const p = m.perfiles.get(id);
        if (!p) continue;
        if (marca) Object.assign(p, marca);
        else { delete p.cuentaEstado; delete p.desactivadaEn; delete p.borrarEn; }
      }
    },
    ocultarPublicaciones: async (id) => {
      let n = 0;
      for (const p of m.posts) if (p.userId === id && p.ocultaPorDesactivacion !== true) { p.ocultaPorDesactivacion = true; ocultadas.add(p.id); n++; }
      return n;
    },
    mostrarPublicaciones: async (id) => {
      /* Como el almacén: solo las que llevan la marca de la desactivación. */
      let n = 0;
      for (const p of m.posts) if (p.userId === id && ocultadas.has(p.id)) { delete p.ocultaPorDesactivacion; ocultadas.delete(p.id); n++; }
      return n;
    },
    apagarPase: async (cuenta, perfil) => { m.apagados.push([cuenta, perfil]); m.pase.estado = 'apagada'; },
    cuentasVencidas: async (ahora) => [...m.perfiles.values()]
      .filter((p) => p.cuentaEstado === 'desactivada' && p.borrarEn <= ahora)
      .map((p) => D.cuentaDelDocumento(p)).filter(Boolean),
  });
  return m;
}

console.log('\n── F · desactivar, reactivar y vencidas ──');
{
  check('61) el plazo es de 30 días', D.DIAS_PARA_VOLVER === 30);

  const m = mundoD();
  const r = await D.desactivarCuenta(m.deps, 'cuenta1');
  check('62) desactivar marca las DOS caras con cuentaEstado, desactivadaEn y borrarEn = ahora + 30 días',
    r.estado === 'desactivada' && ['cuenta1', 'hidi_cuenta1'].every((id) => {
      const p = m.perfiles.get(id);
      return p.cuentaEstado === 'desactivada' && p.desactivadaEn === AHORA && p.borrarEn === AHORA + 30 * DIA;
    }) && r.borrarEn === AHORA + 30 * DIA);
  check('63) apaga el pase de autonomía del personaje', m.apagados.length === 1 && m.apagados[0].join() === 'cuenta1,hidi_cuenta1' && m.pase.estado === 'apagada');
  check('64) oculta las publicaciones de las dos caras y no toca las de otros', m.posts.find((p) => p.id === 'p1').ocultaPorDesactivacion === true
    && m.posts.find((p) => p.id === 'p2').ocultaPorDesactivacion === true && m.posts.find((p) => p.id === 'p4').ocultaPorDesactivacion === undefined
    && r.publicacionesOcultas === 2);
  check('65) NO borra nada: ni Auth, ni perfiles, ni el personaje', m.contenido.has('auth') && m.perfiles.size === 2 && m.hechos.length === 0);

  m.reloj = AHORA + 5 * DIA;
  await D.desactivarCuenta(m.deps, 'cuenta1');
  check('66) repetir la desactivación no alarga el plazo', m.perfiles.get('cuenta1').borrarEn === AHORA + 30 * DIA);

  const re = await D.reactivarCuenta(m.deps, 'cuenta1');
  check('67) reactivar dentro del plazo quita las marcas de las dos caras', re.ok === true
    && ['cuenta1', 'hidi_cuenta1'].every((id) => m.perfiles.get(id).cuentaEstado === undefined && m.perfiles.get(id).borrarEn === undefined));
  check('68) y vuelve a mostrar SOLO lo que ocultó la desactivación', m.posts.find((p) => p.id === 'p1').ocultaPorDesactivacion === undefined
    && m.posts.find((p) => p.id === 'p2').ocultaPorDesactivacion === undefined && m.posts.find((p) => p.id === 'p3').ocultaPorDesactivacion === true
    && re.publicacionesMostradas === 2);
  check('69) el pase NO se reactiva', m.pase.estado === 'apagada');
  check('70) reactivar una cuenta que no está desactivada → noDesactivada', (await D.reactivarCuenta(m.deps, 'cuenta1')).motivo === 'noDesactivada');

  const v = mundoD();
  await D.desactivarCuenta(v.deps, 'cuenta1');
  v.reloj = AHORA + 29 * DIA;
  const antes = await D.borrarCuentasVencidas(v.deps);
  check('71) antes de vencer, la pasada diaria no borra nada', antes.borradas === 0 && v.perfiles.size === 2 && v.contenido.has('auth') && v.hechos.length === 0);
  v.reloj = AHORA + 31 * DIA;
  check('72) vencido el plazo, ya no se puede reactivar → vencida', (await D.reactivarCuenta(v.deps, 'cuenta1')).motivo === 'vencida');
  const tras = await D.borrarCuentasVencidas(v.deps);
  check('73) vencida, se borra con el plan COMPLETO: personaje, publicaciones, perfiles y Auth',
    tras.borradas === 1 && v.contenido.size === 0 && v.perfiles.size === 0
    && v.hechos[0].tipo === 'personaje' && v.hechos.at(-1).tipo === 'auth');
  check('74) y repetir la pasada no falla ni vuelve a borrar', (await D.borrarCuentasVencidas(v.deps)).borradas === 0);

  /* Si entre la consulta y el borrado se reactiva, no se toca. */
  const c = mundoD();
  await D.desactivarCuenta(c.deps, 'cuenta1');
  c.reloj = AHORA + 31 * DIA;
  c.deps.cuentasVencidas = async () => { for (const p of c.perfiles.values()) { delete p.cuentaEstado; delete p.borrarEn; } return ['cuenta1']; };
  const carrera = await D.borrarCuentasVencidas(c.deps);
  check('75) se vuelve a mirar antes de borrar: una cuenta reactivada entretanto no se toca', carrera.omitidas === 1 && carrera.borradas === 0 && c.perfiles.size === 2);

  /* Una cuenta que falla no frena a las demás. */
  const f = mundoD();
  await D.desactivarCuenta(f.deps, 'cuenta1');
  f.reloj = AHORA + 31 * DIA;
  f.deps.cuentasVencidas = async () => ['fantasma', 'cuenta1'];
  const ejecutar = f.deps.ejecutar;
  f.deps.perfilesRealesDe = (orig => async (uid) => { if (uid === 'fantasma') throw new Error('red'); return orig(uid); })(f.deps.perfilesRealesDe);
  const rf = await D.borrarCuentasVencidas(f.deps);
  check('76) si una cuenta falla, las demás se borran igual', rf.fallidas === 1 && rf.borradas === 1 && f.perfiles.size === 0 && typeof ejecutar === 'function');

  /* Sin ningún perfil no hay nada que ocultar ni a qué volver: se borra en el acto. */
  const s = mundoD({ real: null, wee: null });
  const rs = await D.desactivarCuenta(s.deps, 'cuenta1');
  check('77) una cuenta sin ningún perfil se borra en el acto (Auth incluido)', rs.estado === 'borrada' && s.hechos.at(-1).tipo === 'auth');

  /* La marca se lee de la cara Weë si la real no la tiene, y nunca de un perfil ajeno. */
  check('78) `cuentaDelDocumento` LEE el vínculo: un hidi_ que dice otra cuenta no es de nadie',
    D.cuentaDelDocumento({ uid: 'hidi_cuenta1', profileType: 'hidi', linkedAccountId: 'cuenta1' }) === 'cuenta1'
    && D.cuentaDelDocumento({ uid: 'hidi_cuenta1', profileType: 'hidi', linkedAccountId: 'otra' }) === null);
}

console.log('\n── G · el repo de la desactivación ──');
{
  const almacen = sinComentarios(leer('functions/src/cuenta/almacenFirestore.ts'));
  check('79) el pase se apaga con `apagarAutonomia` del módulo de autonomía (solo importado)',
    /import \{ apagarAutonomia, depsDeFirestore as depsDelPase \} from '\.\.\/personajes\/servidor'/.test(almacen) && /apagarAutonomia\(depsDelPase\(\), cuentaId, perfilWee\)/.test(almacen));
  check('80) mostrar solo toca lo marcado por la desactivación', /where\('ocultaPorDesactivacion', '==', true\)/.test(almacen) && /ocultaPorDesactivacion: FieldValue\.delete\(\)/.test(almacen));
  const desactivar = sinComentarios(leer('functions/src/cuenta/desactivar.ts'));
  check('81) desactivar NO borra el usuario de Auth (solo lo hace el borrado de las vencidas o de una cuenta sin perfil)',
    !/deleteUser|tipo: 'auth'/.test(desactivar));

  const indices = JSON.parse(leer('firestore.indexes.json')).indexes;
  check('82) el índice de las vencidas existe: users por cuentaEstado + borrarEn',
    indices.some((i) => i.collectionGroup === 'users' && i.fields.map((c) => `${c.fieldPath}:${c.order}`).join() === 'cuentaEstado:ASCENDING,borrarEn:ASCENDING'));
  const reglas = leer('firestore.rules');
  check('83) el cliente no puede escribir el estado de la cuenta (crear ni actualizar)',
    /function estadoDeCuentaFields\(\) \{\s*return \['cuentaEstado', 'desactivadaEn', 'borrarEn'\];/.test(reglas)
    && /!createsIdentityCoreFields\(\) && !createsEstadoDeCuentaFields\(\)/.test(reglas)
    && /!touchesIdentityCoreFields\(\) && !touchesEstadoDeCuentaFields\(\)/.test(reglas));

  const servicio = sinComentarios(leer('services/firestoreService.ts'));
  check('84) los listados de publicaciones saltan las ocultas (getById, getMany, paginado, suscripción)',
    (servicio.match(/collectionName === 'posts' && !visibleParaLosDemas\(/g) || []).length === 4);
  check('85) y la búsqueda, tendencias, hashtags y personas también', (servicio.match(/\.filter\(visibleParaLosDemas\)/g) || []).length === 3
    && /if \(!visibleParaLosDemas\(post\)\) return;/.test(servicio) && /filter\(user => !perfilDesactivado\(user\)\)/.test(servicio));
  check('86) la página pública tampoco la enseña', /post\.ocultaPorDesactivacion !== true/.test(leer('functions/src/public/postPage.ts')));
  check('87) ni el enlace directo a la publicación ni el perfil de otra persona',
    /visibleParaLosDemas\(snap\.data\(\)\)/.test(leer('screens/PostDetailScreen.tsx')) && /perfilDesactivado\(userProfile\)/.test(leer('screens/UserProfileScreen.tsx')));

  const nav = leer('navigation/MainStackNavigator.tsx');
  check('88) la puerta de la app: perfil desactivado → ActivarCuentaScreen, antes del onboarding',
    /if \(user && userProfile && perfilDesactivado\(userProfile\)\) \{\s*return <ActivarCuentaScreen \/>;/.test(nav)
    && nav.indexOf('perfilDesactivado(userProfile)') < nav.indexOf('needsOnboarding'));
  const activar = leer('screens/ActivarCuentaScreen.tsx');
  check('89) Activar cuenta llama a reactivar, cuenta los días con formato y ofrece cerrar sesión',
    /reactivarMiCuenta\(\)/.test(activar) && /formato\.fecha\(/.test(activar) && /t\('cuenta\.activarDaysLeft', \{ contador: dias \}\)/.test(activar)
    && /t\('settings\.signOut'\)/.test(activar) && /logout\(\)/.test(activar) && !/Alert\.alert/.test(activar));
  const eliminar = leer('screens/EliminarCuentaScreen.tsx');
  check('90) Eliminar cuenta explica la desactivación, los 30 días y lo que se borra después',
    ['introDesactivar', 'nowHidden', 'nowCharacterOff', 'nowComeBack', 'whatGoesLaterTitle', 'dialogBodyDesactivar', 'deactivatedBody'].every((k) => eliminar.includes(`'cuenta.${k}'`)));
  check('91) la app y el servidor usan los mismos 30 días', /const DIAS_PARA_VOLVER = 30;/.test(eliminar));
  const sinUso = ['settingsRowHint', 'intro', 'whatGoesTitle', 'deleteButton', 'dialogBody', 'deleting', 'deletingHint'];
  const app = [eliminar, activar, leer('screens/SettingsScreen.tsx')].join('\n');
  check('92) las claves de la ronda anterior que cambiaron de sentido ya no se usan', sinUso.every((k) => !app.includes(`'cuenta.${k}'`)));
}

/* ── H · N caras (F4): Real + heredada + dos alter egos + una Weë Page ───── */

console.log('\n── H · una cuenta con Real, heredada, dos alter egos y una Weë Page ──');
{
  const JAY = 'ent_jay0000000000000000000000';
  const LINA = 'ent_lina000000000000000000000';
  const m = mundo();
  m.perfiles.set(JAY, { uid: JAY, entityId: JAY, profileType: 'hidi', joinedCommunities: ['c7'] });
  m.perfiles.set(LINA, { uid: LINA, entityId: LINA, profileType: 'hidi' });
  for (const id of [JAY, LINA]) m.contenido.add(`posts:${id}`);
  m.contenido.add('pagina');
  /* Los alter egos que da Firestore (identidadesWee + entidades WEE_PROFILE); la cuenta colada no cuenta como cara Weë. */
  m.deps.alterEgosDe = async () => [JAY, LINA, 'cuenta1'];
  const ejecutarAntes = m.deps.ejecutar;
  m.deps.ejecutar = async (paso) => {
    if (paso.tipo === 'paginas') { m.hechos.push(paso); return m.contenido.delete('pagina') ? 3 : 0; }
    return ejecutarAntes(paso);
  };
  const ids = await B.resolverIdentidades(m.deps, 'cuenta1');
  check('93) junta las TRES caras Weë (heredada + 2 alter egos) y no repite la cuenta', ids.perfilesWee.join() === `hidi_cuenta1,${JAY},${LINA}`
    && ids.identidades.join() === `cuenta1,hidi_cuenta1,${JAY},${LINA}` && ids.perfilWee === 'hidi_cuenta1');
  check('94) y sus comunidades', ['c1', 'c2', 'c3', 'c7'].every((c) => ids.comunidades.includes(c)));
  const plan = B.planDeBorrado(ids);
  check('95) personaje y avatar de CADA cara Weë', ['hidi_cuenta1', JAY, LINA].every((id) => plan.some((p) => p.tipo === 'personaje' && p.perfilId === id)
    && plan.some((p) => p.tipo === 'storage' && p.prefijo === `users/${id}/ai-avatar/`)));
  check('96) Storage de los alter egos, también images/profile e images/posts', [JAY, LINA].every((id) => ['users', 'images/posts', 'images/profile']
    .every((r) => plan.some((p) => p.tipo === 'storage' && p.prefijo === `${r}/${id}/`))));
  const iPaginas = plan.findIndex((p) => p.tipo === 'paginas');
  check('97) las Weë Pages de la cuenta, ANTES de borrar accounts/{cuenta} (su índice vive dentro)',
    iPaginas >= 0 && plan[iPaginas].cuentaId === 'cuenta1' && iPaginas < plan.findIndex((p) => p.tipo === 'documento' && p.ruta === 'accounts/cuenta1'));
  await B.borrarCuenta(m.deps, 'cuenta1');
  check('98) no queda NADA vivo: ni perfiles, ni publicaciones de ninguna cara, ni la Página, ni Auth', m.perfiles.size === 0 && m.contenido.size === 0, [...m.contenido].join());

  /* Desactivar 30 días: TODAS las caras. */
  const d = mundoD();
  d.perfiles.set(JAY, { uid: JAY, entityId: JAY, profileType: 'hidi' });
  d.posts.push({ id: 'pj', userId: JAY });
  d.deps.alterEgosDe = async () => [JAY];
  const r = await D.desactivarCuenta(d.deps, 'cuenta1');
  check('99) desactivar oculta las publicaciones de TODAS las caras y marca a Jay también',
    d.posts.find((p) => p.id === 'pj').ocultaPorDesactivacion === true && r.publicacionesOcultas === 3 && d.perfiles.get(JAY).cuentaEstado === 'desactivada');
  check('100) y apaga el pase de cada personaje', d.apagados.map((x) => x[1]).join() === `hidi_cuenta1,${JAY}`);
  const almacen = sinComentarios(leer('functions/src/cuenta/almacenFirestore.ts'));
  check('101) el almacén borra las Páginas con su @usuario, seguidores, ownership y carpeta', /borrarPaginasDeLaCuenta/.test(almacen)
    && /pageHandles/.test(almacen) && /pageFollows/.test(almacen) && /recursiveDelete\(pagina\)/.test(almacen) && /pages\/\$\{pageId\}\//.test(almacen));
  check('102) y busca los alter egos en identidadesWee y en las entidades de la cuenta', /identidadesWee/.test(almacen) && /collection\('entities'\)\.where\('ownerAccountId'/.test(almacen));
}

console.log(`\n${failures === 0 ? 'TODO VERDE' : `${failures} FALLOS`}`);
process.exit(failures === 0 ? 0 : 1);
