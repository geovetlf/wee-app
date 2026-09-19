/*
 * FASE 11.x-4A — SEGURIDAD E INTEGRIDAD ANTES DE PUBLICAR 11.x Y 11.x-2.
 *
 * Lo que se puede comprobar sin emuladores, EJECUTANDO el código compilado
 * cuando se puede y leyendo el fuente cuando lo que importa es qué NO hace:
 *
 *   A · Account ID, Account Number, Entity ID y Profile ID no se confunden.
 *   B · Los Credits solo aceptan una cuenta, y solo en su Perfil Real.
 *   C · El push lo dice el servidor: el nombre sale del perfil, no del cliente.
 *   D · Un repost lo firma la cara activa, no la cuenta.
 *   E · La lista de avisos enseña el perfil del remitente, no lo que escribió.
 *   F · Los scripts de media no deducen la cara por el prefijo.
 *   G · El inventario Biz busca por campos, con los nombres del esquema.
 *   H · Las reglas nuevas están escritas (se EJECUTAN en integridad-11x4a.emulator.mjs).
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const lib = (p) => require(path.resolve(here, '../lib/' + p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const lanza = async (fn) => {
  try { await fn(); return null; } catch (e) { return e; }
};

const identidad = lib('core/identity.js');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Cuatro identificadores que no se confunden ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const { esIdDeCuenta } = identidad;
  const cuenta = lib('core/account-identity.js');
  const { esIdDeEntidad, esNumeroDeCuentaCanonico, sortearNumeroDeCuenta, idDeEntidadDesdeBytes } = cuenta;
  const uidDeFirebase = 'OEv4FAhfbAN0sFoFiHG0ZG2GK3r2';
  const numero = sortearNumeroDeCuenta([0, 0, 0, 0]);
  const entidad = idDeEntidadDesdeBytes(new Uint8Array(26).fill(11));
  check('1) un uid de Firebase Auth es un Account ID', esIdDeCuenta(uidDeFirebase) && esIdDeCuenta('ana') && esIdDeCuenta('u1'));
  check('2) un número de cuenta NO es un Account ID', esNumeroDeCuentaCanonico(numero) && !esIdDeCuenta(numero), numero);
  check('3) ni el identificador de una entidad', esIdDeEntidad(entidad) && !esIdDeCuenta(entidad), entidad);
  check('4) ni el identificador de una cara (Profile ID con prefijo heredado)', !esIdDeCuenta('hidi_' + uidDeFirebase));
  check('5) ni texto con separadores, barras o vacío', ['a_b', 'a/b', 'a b', 'a.b', '', ' ', 'x'.repeat(129)].every((v) => !esIdDeCuenta(v)));
  check('6) ni algo que no sea texto', [null, undefined, 42, {}, ['ana']].every((v) => !esIdDeCuenta(v)));
  /*
   * En la Fase 11.x-5A se retiró `nacerCuenta`, que hacía nacer una cuenta a
   * partir de una posición de una serie. Lo que queda no admite un número de
   * cuenta donde va un principal, y no hay forma de formar uno sin sortearlo.
   */
  check('7) el Identity Core sigue sin nacer cuentas a partir de un número',
    identidad.nacerCuenta === undefined && !cuenta.esIdDePrincipal(numero) && !esIdDeCuenta(numero));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Credits: solo una cuenta, y solo en su Perfil Real ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const { createCreditEngine } = lib('credits/creditEngine.js');
  const validacion = lib('credits/creditValidation.js');

  /* Un Firestore en memoria mínimo: consultas por igualdad y transacciones que aplican al final. */
  const INC = Symbol('inc');
  const clonar = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const docs = new Map();
  let escrituras = 0;
  const ref = (p) => ({
    path: p, id: p.split('/').pop(),
    get: async () => ({ exists: docs.has(p), id: p.split('/').pop(), ref: ref(p), data: () => clonar(docs.get(p)) }),
  });
  const coleccion = (base, filtros = [], max = null) => ({
    doc: (id) => ref(`${base}/${id}`),
    where: (f, _op, v) => coleccion(base, [...filtros, [f, v]], max),
    orderBy: () => coleccion(base, filtros, max),
    limit: (n) => coleccion(base, filtros, n),
    get: async () => {
      let filas = [...docs.entries()].filter(([p]) => p.startsWith(base + '/') && !p.slice(base.length + 1).includes('/'))
        .filter(([, d]) => filtros.every(([f, v]) => d[f] === v))
        .sort(([a], [b]) => (a < b ? -1 : 1));
      if (max) filas = filas.slice(0, max);
      const lista = filas.map(([p, d]) => ({ exists: true, id: p.split('/').pop(), ref: ref(p), data: () => clonar(d) }));
      return { docs: lista, empty: lista.length === 0 };
    },
  });
  const resolver = (v, previo) => (v && typeof v === 'object' && v[INC] !== undefined ? (typeof previo === 'number' ? previo : 0) + v[INC] : v);
  const db = {
    collection: (c) => coleccion(c),
    runTransaction: async (fn) => {
      const pendientes = [];
      const tx = {
        get: (t) => t.get(),
        set: (r, d, o) => pendientes.push(['set', r, d, !!(o && o.merge)]),
        update: (r, d) => pendientes.push(['update', r, d]),
      };
      const res = await fn(tx);
      for (const [tipo, r, d, merge] of pendientes) {
        escrituras++;
        const previo = docs.get(r.path);
        if (tipo === 'update' && !previo) throw new Error('update sobre documento inexistente');
        const base = tipo === 'set' && !merge ? {} : { ...(previo || {}) };
        for (const [k, v] of Object.entries(d)) base[k] = resolver(v, base[k]);
        docs.set(r.path, base);
      }
      return res;
    },
  };
  let reloj = 0;
  const motor = createCreditEngine({ db: () => db, increment: (n) => ({ [INC]: n }), now: () => ++reloj, welcomeCredits: 240, loadCosts: async () => {} });

  /* Producción: id automático, la cuenta en el CAMPO `uid`. */
  docs.set('users/autoAna', { uid: 'ana', displayName: 'Ana', profileType: 'real' });
  docs.set('users/autoCaraAna', { uid: 'hidi_ana', displayName: 'Cara', profileType: 'hidi', linkedAccountId: 'ana' });
  docs.set('users/autoLegado', { uid: 'legado', displayName: 'Sin tipo' });
  docs.set('users/autoRaro', { uid: 'raro', displayName: 'Raro', profileType: 'hidi' });

  const invalidos = ['hidi_ana', 'autoCaraAna_x', '0000001', '00000011', 'ana/../x', 'ana_1', '', 'x'.repeat(129)];
  const antes = escrituras;
  const codigos = [];
  for (const id of invalidos) codigos.push((await lanza(() => motor.ensureAccount(id)))?.code);
  check('8) ensureAccount rechaza una cara, un número de cuenta, una entidad y texto suelto', codigos.every((c) => c === 'INVALID_REQUEST'), JSON.stringify(codigos));
  check('9) y no escribe nada: ni saldo en la cara ni bienvenida', escrituras === antes && docs.get('users/autoCaraAna').creditsBalance === undefined && ![...docs.keys()].some((p) => p.includes('hidi_ana')));
  check('10) grantCredits de administración tampoco acepta la cara',
    (await lanza(() => motor.grantCredits({ userId: 'hidi_ana', amount: 10, reason: 'prueba', source: 'admin' })))?.code === 'INVALID_REQUEST');
  check('11) ni getBalance, ni el historial',
    (await lanza(() => motor.getBalance('hidi_ana')))?.code === 'INVALID_REQUEST'
    && (await lanza(() => motor.getCreditHistory('00000011', 10)))?.code === 'INVALID_REQUEST');
  check('12) un documento con forma de cuenta pero tipo de cara no guarda Credits de nadie',
    (await lanza(() => motor.ensureAccount('raro')))?.code === 'ACCOUNT_NOT_FOUND' && docs.get('users/autoRaro').creditsBalance === undefined);
  check('13) un id de documento de `users` no es una cuenta: no encuentra perfil',
    (await lanza(() => motor.ensureAccount('autoAna')))?.code === 'ACCOUNT_NOT_FOUND');
  const ana = await motor.ensureAccount('ana');
  check('14) CONTROL: la cuenta de verdad recibe su bienvenida en su Perfil Real', ana.balance === 240 && docs.get('users/autoAna').creditsBalance === 240);
  check('15) CONTROL: un perfil antiguo sin profileType sigue siendo un Perfil Real', (await motor.ensureAccount('legado')).balance === 240);
  check('16) la frontera tiene nombre y el de siempre apunta a ella', validacion.assertUserId === validacion.assertAccountId);
  check('17) y la forma la decide el Identity Core, no el Credit Engine', /from '\.\.\/core\/identity'/.test(leer('functions/src/credits/creditValidation.ts'))
    && /esIdDeCuenta\(accountId\)/.test(leer('functions/src/credits/creditValidation.ts')));
  check('18) el motor confirma el Perfil Real con el resolutor canónico', /cuentaDeIdentidad\(userId, /.test(leer('functions/src/credits/creditEngine.ts')));
  check('19) el Financial Core cerrado no se tocó', !/Fase 11\.x-4A/.test(leer('functions/src/core/financial/account.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El push lo dice el servidor ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const avisos = lib('social/avisos.js');
  check('20) el nombre del aviso sale del perfil', avisos.avisoPush('comment', avisos.nombreVisible({ displayName: 'Ana' }))?.body === 'Ana comentó en tu post');
  check('21) sin perfil, un genérico', avisos.avisoPush('comment', avisos.nombreVisible(null))?.body === 'Alguien comentó en tu post');
  const cc = (n) => String.fromCharCode(n);
  const sucio = `  Ana${cc(10)}${cc(7)}Pérez${cc(0x2028)}  `;
  check('22) sin saltos de línea ni caracteres de control', avisos.nombreVisible({ displayName: sucio }) === 'Ana Pérez', JSON.stringify(avisos.nombreVisible({ displayName: sucio })));
  const largo = avisos.nombreVisible({ displayName: 'A'.repeat(500) });
  check('23) y acotado', typeof largo === 'string' && largo.length === 60);
  check('24) un tipo desconocido no manda push', avisos.avisoPush('phishing', 'Ana') === null && avisos.avisoPush(undefined, 'Ana') === null);
  const datos = avisos.datosDelAviso({ postId: 'p1', senderId: 'hidi_ana', senderName: 'Soporte Weë', token: 'ExponentPushToken[x]', email: 'a@b.c', conversationId: 'c/../x', commentId: 42 }, 'comment', 'n1');
  check('25) los datos del push van por lista blanca: ni nombre, ni token, ni email',
    JSON.stringify(Object.keys(datos).sort()) === JSON.stringify(['commentId', 'conversationId', 'notificationId', 'postId', 'senderId', 'type'])
    && datos.conversationId === null && datos.commentId === null && datos.postId === 'p1' && datos.senderId === 'hidi_ana', JSON.stringify(datos));
  const resumen = avisos.resumenDeRespuestaDeExpo({ data: { status: 'error', message: 'ExponentPushToken[secreto] is not registered', details: { error: 'DeviceNotRegistered', expoPushToken: 'ExponentPushToken[secreto]' } } });
  check('26) del log de Expo solo queda el estado y el código', JSON.stringify(resumen) === JSON.stringify({ status: 'error', error: 'DeviceNotRegistered' }));
  const indice = leer('functions/src/index.ts');
  const disparador = indice.slice(indice.indexOf('export const sendPushNotification'), indice.indexOf('export const sendMessagePushNotification'));
  check('27) el disparador ya NO lee `senderName` de la notificación', !/senderName/.test(disparador.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('28) lee el perfil de quien firma y construye el aviso en el servidor',
    /perfilDeIdentidad\(senderId\)/.test(disparador) && /avisoPush\(type, nombreVisible\(remitente\?\.data\(\)\)\)/.test(disparador) && /datosDelAviso\(notification,/.test(disparador));
  check('29) ningún token de push acaba en un log', !/console\.(log|error|warn)\([^)]*pushToken/.test(indice) && !/console\.log\('Expo push response:', result\)/.test(indice));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Un repost lo firma la cara activa ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const hook = leer('hooks/useReposts.ts');
  const codigo = hook.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('30) la identidad sale del punto único que decide la cara activa', /import \{ useIdentidadActiva \} from '\.\/useEContact';/.test(hook) && /const \{ identidad \} = useIdentidadActiva\(\);/.test(codigo));
  check('31) el repost se crea con la cara activa', /repostsService\.createRepost\(postId, identidad, comment\)/.test(codigo));
  check('32) y se comprueba con la misma cara, que al cambiar se vuelve a mirar',
    /repostsService\.hasUserReposted\(postId, identidad\)/.test(codigo) && /\[postId, identidad\]/.test(codigo));
  check('33) la cuenta ya no firma reposts', !/user\.uid/.test(codigo) && !/useAuth/.test(codigo));
  const servicio = leer('services/firestoreService.ts');
  const repost = servicio.slice(servicio.indexOf('export const repostsService'), servicio.indexOf('export const repostsService') + 1500);
  check('34) el repost NO guarda ninguna cuenta: es atribución social, no propiedad', !/ownerAccountId|accountId/.test(repost));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · La lista de avisos enseña el perfil del remitente ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const pantalla = leer('screens/NotificationsScreen.tsx');
  const codigo = pantalla.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  check('35) el nombre y la foto salen del perfil de `senderId`', /remitente=\{remitentes\[item\.senderId\]\}/.test(codigo) && /remitente\?\.displayName \|\| t\('common\.user'\)/.test(codigo));
  check('35b) y se piden por tandas, no uno por fila: sin N+1', /usersService\.getManyByUids\(faltan\)/.test(codigo) && !/useUserById/.test(codigo));
  check('36) y nunca de lo que escribió quien avisa', !/item\.senderName|item\.senderAvatar/.test(codigo));
  const esControlSuelto = (c) => (c >= 0 && c <= 8) || c === 11 || c === 12 || (c >= 14 && c <= 31);
  check('37) el fuente sigue siendo texto: ningún carácter de control suelto', ![...pantalla].some((ch) => esControlSuelto(ch.codePointAt(0))));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Los scripts de media no deducen la cara por el prefijo ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const { caraQueFirmo, MOTIVO_DE_CARA } = await import(pathToFileURL(path.resolve(here, '../../scripts/media-legacy.mjs')).href);
  let intentos = 0;
  const prohibir = (o) => { for (const m of ['set', 'update', 'delete', 'create', 'add', 'commit', 'batch', 'runTransaction']) o[m] = () => { intentos++; throw new Error('ESCRITURA PROHIBIDA'); }; return o; };
  const fakeDb = (usuarios) => {
    const doc = (d) => ({ id: d.documentId, exists: true, ref: { path: `users/${d.documentId}` }, get: (c) => d[c] });
    const col = () => prohibir({
      where: (campo, _op, valor) => prohibir({ get: async () => { const l = usuarios.filter((u) => u[campo] === valor).map(doc); return { docs: l, size: l.length, empty: !l.length }; } }),
      doc: (id) => prohibir({ get: async () => { const u = usuarios.find((x) => x.documentId === id); return u ? doc(u) : { exists: false, id, ref: { path: `users/${id}` }, get: () => undefined }; } }),
    });
    return prohibir({ collection: col, collectionGroup: col });
  };
  const db = fakeDb([
    { documentId: 'r1', uid: 'cuentaA', profileType: 'real' },
    { documentId: 'r2', uid: 'cuentaB' },
    { documentId: 'w1', uid: 'hidi_cuentaA', profileType: 'hidi', linkedAccountId: 'cuentaA' },
    { documentId: 'w2', uid: 'hidi_sinvinculo', profileType: 'hidi' },
    { documentId: 'w3', uid: 'hidi_disfrazado', profileType: 'real', linkedAccountId: 'disfrazado' },
    { documentId: 'r3', uid: 'impostor', profileType: 'hidi', linkedAccountId: 'impostor' },
    { documentId: 'd1', uid: 'hidi_doble', profileType: 'hidi', linkedAccountId: 'doble' },
    { documentId: 'd2', uid: 'hidi_doble', profileType: 'hidi', linkedAccountId: 'doble' },
  ]);
  const real = await caraQueFirmo(db, 'cuentaA');
  check('38) un Perfil Real se reconoce por su `profileType`, con su cuenta', real.tipo === 'REAL_PROFILE' && real.cuenta === 'cuentaA' && real.perfilUid === 'cuentaA');
  check('39) uno antiguo sin `profileType` también', (await caraQueFirmo(db, 'cuentaB')).tipo === 'REAL_PROFILE');
  const cara = await caraQueFirmo(db, 'hidi_cuentaA');
  check('40) un Perfil Weë, por su `profileType` y su vínculo leído', cara.tipo === 'WEE_PROFILE' && cara.cuenta === 'cuentaA');
  check('41) una cara sin vínculo NO es una cara: no se inventa', (await caraQueFirmo(db, 'hidi_sinvinculo')).tipo === null && (await caraQueFirmo(db, 'hidi_sinvinculo')).motivo === MOTIVO_DE_CARA.SIN_TIPO_VERIFICABLE);
  check('42) el prefijo no manda: `hidi_` con tipo real no es nada', (await caraQueFirmo(db, 'hidi_disfrazado')).tipo === null);
  check('43) ni un tipo de cara sin prefijo', (await caraQueFirmo(db, 'impostor')).tipo === null);
  const porDigito = await caraQueFirmo(db, '00000012');
  check('44) ni el último dígito: un identificador sin documento no tiene cara', porDigito.tipo === null && porDigito.motivo === MOTIVO_DE_CARA.SIN_USUARIO);
  check('45) documentos que dicen lo mismo, una cara', (await caraQueFirmo(db, 'hidi_doble')).tipo === 'WEE_PROFILE');
  check('46) un id inválido, ninguna', (await caraQueFirmo(db, 'con/barra')).motivo === MOTIVO_DE_CARA.ID_INVALIDO);
  check('47) y averiguarlo no intentó ni una escritura', intentos === 0);

  const legado = leer('scripts/media-legacy.mjs');
  const migrar = leer('scripts/migrar-media.mjs');
  const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('48) ya no queda ninguna decisión por prefijo en los scripts', !/startsWith\('hidi_'\)/.test(sinComentarios(legado)) && !/tipoDeEntidad/.test(legado + migrar));
  check('49) la migración ya no escribe un identificador de perfil como Entity ID', !/createdByEntityId|createdByEntityType/.test(sinComentarios(migrar)));
  check('50) guarda lo verificado con su nombre, y lo que no se verifica no se migra',
    /autorPerfilUid: cara\.perfilUid, autorTipo: cara\.tipo/.test(migrar) && /if \(!cara\.tipo\) \{\s*return \{ noMigrable:/.test(migrar) && /cara\.cuenta !== ownerAccountId/.test(migrar));
  check('51) y sigue escribiendo solo detrás de las dos banderas', /const EJECUTAR = bandera\('--ejecutar'\) && bandera\('--confirmo-autorizacion'\);/.test(migrar));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · El inventario Biz busca por campos ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const biz = leer('scripts/inventario-biz.mjs');
  const codigo = biz.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('52) ya no busca por id de documento', !/FieldPath\.documentId\(\)/.test(codigo));
  check('53) busca el prefijo en el CAMPO `uid` y el tipo en `profileType`',
    /porPrefijo\(db\.collection\('users'\), 'uid'\)/.test(codigo) && /where\('profileType', '==', 'biz'\)/.test(codigo));
  check('54) con los campos que el esquema tiene de verdad',
    ["['econtacts', 'users', 'lista']", "['conversations', 'participants', 'lista']", "['notifications', 'recipientId']", "['messages', 'senderId', 'grupo']"].every((s) => biz.includes(s))
    && !/'participantIds'|'aId'|'actorId'/.test(codigo));
  check('55) sigue sin escribir nada', !/\.(set|update|delete|create|add|commit)\(|runTransaction|batch\(/.test(codigo.replace(/vistos\.set\(/g, '')));
  check('56) y no reintroduce una tercera identidad', !/BIZ_PROFILE/.test(leer('functions/src/core/identity.ts')) && /export type EntityType = 'REAL_PROFILE' \| 'WEE_PROFILE' \| 'PAGE';/.test(leer('functions/src/core/identity.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Las reglas nuevas están escritas ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const reglas = leer('firestore.rules');
  check('57) ningún cliente escribe números ni entidades del Identity Core en su perfil',
    /function identityCoreFields\(\) \{\s*return \['accountId', 'accountNumber', 'walletNumber', 'entityId', 'entityType', 'entitySequence', 'ownerAccountId'\];/.test(reglas)
    && /!createsIdentityCoreFields\(\)/.test(reglas) && /!touchesIdentityCoreFields\(\)/.test(reglas));
  check('58) una comunidad de usuario la crea la sesión que dice crearla', /request\.resource\.data\.createdBy == request\.auth\.uid &&\s*request\.resource\.data\.moderators == \[request\.auth\.uid\]/.test(reglas));
  check('59) la autoría de publicaciones y comentarios no se edita',
    /\.hasAny\(\['userId', 'isRepost', 'originalPostId', 'createdAt'\]\)/.test(reglas) && /\.hasAny\(\['userId', 'postId', 'parentCommentId', 'createdAt'\]\)/.test(reglas));
  check('60) un voto vive en `{cuenta}_{publicación}` y solo cambia su tipo', /voteId == request\.auth\.uid \+ '_' \+ request\.resource\.data\.postId/.test(reglas) && /hasOnly\(\['type', 'createdAt'\]\)/.test(reglas));
  check('61) una conversación fija sus participantes y un mensaje solo se marca o se vacía',
    /\.hasOnly\(\['lastMessage', 'updatedAt', 'activeInChat', 'bubbleColors', 'chatTheme', 'chatWallpaper', 'ephemeral'\]\)/.test(reglas)
    && /\.hasOnly\(\['read', 'content', 'deleted', 'imageUrl', 'ephemeral'\]\)/.test(reglas) && /function remitenteLegitimo\(\)/.test(reglas));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
