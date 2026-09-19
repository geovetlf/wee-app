/*
 * WEETALK — LA FOTO ÚNICA DESAPARECE DE VERDAD (fase 11, C3).
 *
 * Lo que había: abrir una «foto única» escribía `viewOnceOpened: true` y nada
 * más. La URL seguía en el mensaje y el archivo en Cloudinary, donde Weë no
 * puede borrar. Lo efímero era permanente.
 *
 * Lo que se comprueba, EJECUTANDO `crearQuemador` con puertos de mentira:
 *
 *   A · quién puede quemar: un participante que no es quien la mandó, y las
 *       dos caras de una cuenta cuentan como la misma persona;
 *   B · el orden: primero desaparece de la ficha, después del almacén; si el
 *       borrado falla, queda anotado y no se finge;
 *   C · lo histórico (Cloudinary) se retira de la ficha y se deja dicho que
 *       el objeto sigue allí; quemar dos veces no hace nada la segunda;
 *   D · el cliente: las fotos únicas nuevas van al Storage de Weë, a la ruta
 *       que las reglas protegen, y se queman al CARGARSE, no antes.
 *
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const weetalk = lib('social/weetalk.js');

const BUCKET = 'get-wee.firebasestorage.app';
const CLAVE = 'users/uAna/weetalk/c1/1700000000000-abc123.jpg';
const URL_WEE = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(CLAVE)}?alt=media&token=t-1`;
const URL_CLOUD = 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1699999999/messages/uAna/foto.jpg';

/* Puertos de mentira: una conversación, sus mensajes, un almacén y un diario. */
/*
 * `cuentas` es el resolutor canónico de mentira: de una identidad a su cuenta.
 * Por defecto una identidad con forma de uid es su propia cuenta; una cara Weë
 * (`hidi_…`, identificador heredado) solo resuelve si se declara aquí, igual
 * que en producción solo resuelve si `users` tiene el puente escrito.
 */
const mundo = ({ participants = ['uAna', 'uBea'], mensajes = {}, fallaBorrado = false, objetos: existentes = [CLAVE], cuentas = {} } = {}) => {
  const diario = [];
  const docs = { ...mensajes };
  const objetos = new Set(existentes);
  const puertos = {
    bucketDeWee: () => BUCKET,
    cuentaDelRemitente: async (id) => (id in cuentas ? cuentas[id] : (/^[A-Za-z0-9]{1,128}$/.test(id) ? id : null)),
    leerConversacion: async (c) => (c === 'c1' ? { participants } : null),
    leerMensaje: async (c, m) => (c === 'c1' && docs[m] ? { ...docs[m] } : null),
    quemarFicha: async (c, m, datos) => {
      diario.push(['ficha', m, datos]);
      const { imageUrl, fileUrl, ...resto } = docs[m];
      docs[m] = { ...resto, viewOnceOpened: true, viewOnceOpenedAt: datos.abiertoEn, ...(datos.pendiente ? { pendingPhysicalDeletion: true } : {}) };
    },
    anotarPendiente: async (c, m) => { diario.push(['pendiente', m]); docs[m] = { ...docs[m], pendingPhysicalDeletion: true }; },
    borrarObjeto: async (key) => {
      diario.push(['objeto', key]);
      if (fallaBorrado) throw new Error('storage caído');
      objetos.delete(key);
    },
    ahora: () => 1_700_000_500_000,
  };
  return { quemador: weetalk.crearQuemador(puertos), docs, objetos, diario };
};

const unica = (extra = {}) => ({ type: 'image', viewOnce: true, senderId: 'uAna', imageUrl: URL_WEE, ...extra });
const motivo = async (fn) => { try { await fn(); return 'ok'; } catch (e) { return e instanceof weetalk.FotoNoQuemable ? e.motivo : `otro:${e.message}`; } };

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Quién puede quemar ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const m = mundo({ mensajes: { m1: unica() } });
  check('1) quien la recibe la quema', (await m.quemador.quemar('uBea', 'c1', 'm1')).status === 'quemada');

  const ajeno = mundo({ mensajes: { m1: unica() } });
  check('2) alguien que no participa: como si no existiera', await motivo(() => ajeno.quemador.quemar('uCarlos', 'c1', 'm1')) === 'no_participas');
  check('2) y no se tocó nada', ajeno.diario.length === 0 && ajeno.objetos.has(CLAVE));

  const propia = mundo({ mensajes: { m1: unica() } });
  check('3) quien la mandó no la «abre»', await motivo(() => propia.quemador.quemar('uAna', 'c1', 'm1')) === 'es_tuya');
  check('3) ni desde su otra cara', await motivo(() => mundo({ participants: ['hidi_uAna', 'uBea'], mensajes: { m1: unica({ senderId: 'hidi_uAna' }) } }).quemador.quemar('uAna', 'c1', 'm1')) === 'es_tuya');

  const cara = mundo({ participants: ['uAna', 'hidi_uDan'], mensajes: { m1: unica() } });
  check('4) el Perfil Weë participa como la misma cuenta: uDan quema lo que recibió hidi_uDan', (await cara.quemador.quemar('uDan', 'c1', 'm1')).status === 'quemada');

  check('5) una conversación que no existe: no existe', await motivo(() => mundo().quemador.quemar('uBea', 'c9', 'm1')) === 'no_existe');
  check('5) un mensaje que no existe: no existe', await motivo(() => mundo().quemador.quemar('uBea', 'c1', 'm9')) === 'no_existe');
  check('6) una foto normal no se quema', await motivo(() => mundo({ mensajes: { m1: unica({ viewOnce: false }) } }).quemador.quemar('uBea', 'c1', 'm1')) === 'no_es_unica');
  check('6) ni un texto', await motivo(() => mundo({ mensajes: { m1: { type: 'text', viewOnce: true, senderId: 'uAna', content: 'hola' } } }).quemador.quemar('uBea', 'c1', 'm1')) === 'no_es_unica');
  check('7) quien decide es la SESIÓN: el quemador no lee ninguna identidad del cliente',
    !/request\.data\.(uid|senderId|userId|accountId)/.test(leer('functions/src/social/weetalk.ts'))
    && /quemar\(request\.auth\.uid, conversationId, messageId\)/.test(leer('functions/src/social/weetalk.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El orden: primero la ficha, después el objeto ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const m = mundo({ mensajes: { m1: unica() } });
  const r = await m.quemador.quemar('uBea', 'c1', 'm1');
  check('8) la ficha pierde la dirección y queda abierta', m.docs.m1.viewOnceOpened === true && m.docs.m1.imageUrl === undefined && m.docs.m1.viewOnceOpenedAt === 1_700_000_500_000);
  check('9) el objeto se borra del Storage de Weë', !m.objetos.has(CLAVE));
  check('10) y en ese orden: ficha antes que objeto', m.diario[0][0] === 'ficha' && m.diario[1][0] === 'objeto' && m.diario[1][1] === CLAVE);
  check('11) sin nada pendiente', r.pendingPhysicalDeletion === false);

  const f = mundo({ mensajes: { m1: unica() }, fallaBorrado: true });
  const rf = await f.quemador.quemar('uBea', 'c1', 'm1');
  check('12) si el borrado falla, la ficha ya está quemada igualmente', f.docs.m1.imageUrl === undefined && f.docs.m1.viewOnceOpened === true);
  check('12) y queda ANOTADO, no fingido', rf.pendingPhysicalDeletion === true && f.docs.m1.pendingPhysicalDeletion === true && f.diario.some(([q]) => q === 'pendiente'));

  const dos = mundo({ mensajes: { m1: unica() } });
  await dos.quemador.quemar('uBea', 'c1', 'm1');
  const otra = await dos.quemador.quemar('uBea', 'c1', 'm1');
  check('13) quemar dos veces: la segunda no hace nada', otra.status === 'ya_quemada' && dos.diario.filter(([q]) => q === 'objeto').length === 1);
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Lo histórico, en Cloudinary ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const m = mundo({ mensajes: { m1: unica({ imageUrl: URL_CLOUD }) } });
  const r = await m.quemador.quemar('uBea', 'c1', 'm1');
  check('14) se retira la dirección del mensaje', m.docs.m1.imageUrl === undefined && m.docs.m1.viewOnceOpened === true);
  check('15) y se deja dicho que el objeto sigue allí: Weë no puede borrarlo', r.pendingPhysicalDeletion === true && m.docs.m1.pendingPhysicalDeletion === true);
  check('16) sin intentar borrar nada en Cloudinary', !m.diario.some(([q]) => q === 'objeto'));
  const fuente = leer('functions/src/social/weetalk.ts');
  check('17) el módulo no habla con Cloudinary ni lleva secretos', !/cloudinary\.com|api_secret|CLOUDINARY_/i.test(fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  /* Aquí solo se acota el HOST; leer la URL (bucket, clave) sigue siendo cosa del lector del Content Core. */
  check('18) las URLs se leen con el lector del Content Core, no con un segundo parser', /referenciaDesdeUrlDeWee\(url\)/.test(fuente) && !/parseStorageUrl|decodeURIComponent|\.split\('\/'\)/.test(fuente));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · El cliente: a dónde va la foto y cuándo se quema ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const almacen = leer('services/storageService.ts');
  const pantalla = leer('screens/ConversationScreen.tsx');
  const servicio = leer('services/messagesService.ts');
  const reglas = leer('storage.rules');

  check('19) la foto única sube al Storage de Weë, a la ruta de la conversación',
    /export const uploadViewOncePhoto/.test(almacen) && /users\/\$\{userId\}\/weetalk\/\$\{conversationId\}\//.test(almacen) && /uploadBytes\(storageRef, blob, \{ contentType \}\)/.test(almacen));
  check('19) y no a Cloudinary', !/uploadImageToCloudinary|uploadBlobToCloudinary/.test(almacen.slice(almacen.indexOf('export const uploadViewOncePhoto'), almacen.indexOf('// ─── Comment image'))));
  check('20) sin metadatos, como todo lo que sale de la app', /uriSinMetadatos\(imageUri\)/.test(almacen) && /blobSinMetadatos\(original\)/.test(almacen));
  /*
   * La foto única sube al espacio de la CUENTA (`user.uid`), que es lo que la regla
   * del Storage compara con `request.auth.uid` y lo que el servidor exige al quemar
   * (`users/<cuenta>/weetalk/<conversación>/`). El mensaje lo firma la cara activa
   * (`myUid`), que puede ser el Perfil Weë: con su id en la ruta la subida fallaría
   * y el servidor no podría borrar el objeto.
   */
  check('21) la pantalla elige el camino por `viewOnce`, en las dos entradas (galería y cámara)',
    (pantalla.match(/const url = viewOnce \? await uploadViewOncePhoto\(uri, user\.uid, convId\) : await uploadMessageImageFromUri\(uri, myUid\);/g) || []).length === 2);
  check('21) y la ruta de la foto única es la de la cuenta, nunca la de la cara', !/uploadViewOncePhoto\(uri, myUid/.test(pantalla));
  check('22) abrir NO quema: se quema cuando la foto ya cargó (onLoad)',
    /onLoad=\{quemarSiToca\}/.test(pantalla) && /setPendienteDeQuemar\(msg\.id\);\s*\n\s*setViewOnceImage\(msg\.imageUrl\);/.test(pantalla)
    && !/setViewOnceImage\(msg\.imageUrl\);\s*\n\s*await messagesService\.markViewOnceOpened/.test(pantalla));
  check('23) marcarla abierta es llamar al servidor, no escribir la marca a mano',
    /httpsCallable\(functions, 'burnViewOnce'/.test(servicio) && !/updateDoc\(messageRef, \{ viewOnceOpened: true \}\)/.test(servicio));
  check('24) sin dirección = vista, también para mensajes antiguos sin la marca', /item\.viewOnceOpened \|\| !item\.imageUrl/.test(pantalla));
  check('25) las reglas: la ruta la escribe su dueño y la leen los participantes, comprobados en Firestore',
    /match \/users\/\{userId\}\/weetalk\/\{conversationId\}\/\{fileName\}/.test(reglas)
    && /let conversacion = \/databases\/\(default\)\/documents\/conversations\/\$\(conversationId\);/.test(reglas)
    && /firestore\.exists\(conversacion\)/.test(reglas) && /firestore\.get\(conversacion\)\.data\.participants/.test(reglas)
    && /request\.auth\.uid == userId \|\| participaEn\(conversationId\)/.test(reglas));
  check('26) el callable existe y está exportado', /export \{ burnViewOnce \} from '\.\/social\/weetalk';/.test(leer('functions/src/index.ts')) && typeof weetalk.burnViewOnce === 'function');
  check('27) los textos nuevos de la burbuja pasan por i18n', /t\('weetalk\.photoOpened'\)/.test(pantalla) && /t\('weetalk\.photoOnce'\)/.test(pantalla) && !/'Abierta' : 'Foto única'/.test(pantalla));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · S1: solo se borra la foto única de SU remitente, en ESTA conversación ──');
// ════════════════════════════════════════════════════════════════════════════
/*
 * El agujero que encontró la revisión de despliegue: la clave del objeto a
 * borrar salía de la URL del mensaje, y la URL la escribe quien lo manda. Bob
 * podía apuntar a `users/alice/ai-generations/…` y, cuando Alice abría la
 * foto, el servidor borraba el objeto de Alice. Aquí se reproduce ese ataque
 * exacto y se comprueba que el objeto PERMANECE: no basta con que la función
 * conteste algo; lo que importa es lo que hay en el almacén después.
 */
{
  const ALICE = 'alice';
  const BOB = 'bob';
  const urlDe = (clave, bucket = BUCKET) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(clave)}?alt=media&token=t`;
  const LEGITIMA = 'users/alice/weetalk/c1/photo.jpg';
  const AI_DE_ALICE = 'users/alice/ai-generations/1700000000000-result.png';
  const AI_DE_BOB = 'users/bob/ai-generations/file.png';
  const OTRA_CONVERSACION = 'users/alice/weetalk/c2/photo.jpg';
  const PREFIJO_PARECIDO = 'users/alice/weetalk/c10/photo.jpg';
  const CUENTA_PARECIDA = 'users/aliceX/weetalk/c1/photo.jpg';
  const SUBCARPETA = 'users/alice/weetalk/c1/sub/photo.jpg';
  const TODOS = [LEGITIMA, AI_DE_ALICE, AI_DE_BOB, OTRA_CONVERSACION, PREFIJO_PARECIDO, CUENTA_PARECIDA, SUBCARPETA];

  /* Alice y Bob en c1; TODOS los objetos existen antes; `abre` es quien abre la foto. */
  const escenario = async ({ sender, url, abre, objetos = TODOS }) => {
    const m = mundo({ participants: [ALICE, BOB], mensajes: { m1: { type: 'image', viewOnce: true, senderId: sender, imageUrl: url } }, objetos });
    const r = await m.quemador.quemar(abre, 'c1', 'm1');
    return { r, m, borrados: m.diario.filter(([q]) => q === 'objeto').map(([, k]) => k) };
  };
  const intactos = (m, salvo = null) => TODOS.filter((k) => k !== salvo).every((k) => m.objetos.has(k));

  /* A · El caso legítimo sigue funcionando. */
  {
    const { r, m, borrados } = await escenario({ sender: ALICE, url: urlDe(LEGITIMA), abre: BOB });
    check('28) A · Alice manda su foto única legítima, Bob la abre: SE BORRA', r.status === 'quemada' && r.pendingPhysicalDeletion === false && r.referenciaInsegura === undefined && borrados.length === 1 && borrados[0] === LEGITIMA && !m.objetos.has(LEGITIMA), JSON.stringify(borrados));
    check('28) y ningún otro objeto se tocó', intactos(m, LEGITIMA));
  }

  /* B y L · EL ATAQUE AUDITADO, tal cual: Bob → objeto de Alice en ai-generations. */
  {
    const { r, m, borrados } = await escenario({ sender: BOB, url: urlDe(AI_DE_ALICE), abre: ALICE });
    check('29) B/L · Bob apunta al ai-generations de Alice: NO SE BORRA NADA', borrados.length === 0, JSON.stringify(borrados));
    check('29) el objeto de Alice PERMANECE (prueba de no-borrado)', m.objetos.has(AI_DE_ALICE) && intactos(m));
    check('29) la ficha se quema igual: la URL desaparece, queda abierta, pendiente y marcada insegura',
      m.docs.m1.imageUrl === undefined && m.docs.m1.viewOnceOpened === true && m.docs.m1.pendingPhysicalDeletion === true
      && r.status === 'quemada' && r.pendingPhysicalDeletion === true && r.referenciaInsegura === true);
  }

  /* C · La foto única de OTRA persona. */
  { const { m, borrados } = await escenario({ sender: BOB, url: urlDe(LEGITIMA), abre: ALICE }); check('30) C · Bob apunta a la foto única de Alice (users/alice/weetalk/c1): NO', borrados.length === 0 && m.objetos.has(LEGITIMA)); }
  /* D · Otro namespace, aunque sea propio. */
  { const { m, borrados } = await escenario({ sender: BOB, url: urlDe(AI_DE_BOB), abre: ALICE }); check('31) D · Bob apunta a su propio ai-generations: NO (otro namespace)', borrados.length === 0 && m.objetos.has(AI_DE_BOB)); }
  /* E · Usuario correcto, conversación incorrecta. */
  { const { m, borrados } = await escenario({ sender: ALICE, url: urlDe(OTRA_CONVERSACION), abre: BOB }); check('32) E · Alice, pero c2 en un mensaje de c1: NO', borrados.length === 0 && m.objetos.has(OTRA_CONVERSACION)); }
  /* F · Path traversal, en claro y codificado. */
  { const { m, borrados } = await escenario({ sender: ALICE, url: urlDe('users/alice/weetalk/c1/../ai-generations/1700000000000-result.png'), abre: BOB }); check('33) F · path traversal `..`: NO', borrados.length === 0 && m.objetos.has(AI_DE_ALICE)); }
  { const { borrados } = await escenario({ sender: ALICE, url: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/users%2Falice%2Fweetalk%2Fc1%2F%252E%252E%2Fai-generations%2Ffile.png?alt=media`, abre: BOB }); check('33) ni traversal doblemente codificado (%252E%252E)', borrados.length === 0); }
  { const { borrados } = await escenario({ sender: ALICE, url: urlDe(SUBCARPETA), abre: BOB }); check('33) ni una subcarpeta dentro del namespace', borrados.length === 0); }
  /* G · Prefijos parecidos. */
  { const { m, borrados } = await escenario({ sender: ALICE, url: urlDe(PREFIJO_PARECIDO), abre: BOB }); check('34) G · prefijo parecido: c10 cuando la conversación es c1: NO', borrados.length === 0 && m.objetos.has(PREFIJO_PARECIDO)); }
  { const { m, borrados } = await escenario({ sender: ALICE, url: urlDe(CUENTA_PARECIDA), abre: BOB }); check('34) ni users/aliceX cuando el remitente es alice', borrados.length === 0 && m.objetos.has(CUENTA_PARECIDA)); }
  /* H · URL malformada: no borra, no lanza, queda pendiente. */
  { const { r, borrados } = await escenario({ sender: ALICE, url: 'https://firebasestorage.googleapis.com/v0/b/', abre: BOB }); check('35) H · URL malformada: NO borra, NO lanza, queda pendiente', borrados.length === 0 && r.status === 'quemada' && r.pendingPhysicalDeletion === true); }
  { const { r, borrados } = await escenario({ sender: ALICE, url: 'esto no es una url', abre: BOB }); check('35) ni una cadena que no es URL', borrados.length === 0 && r.status === 'quemada'); }
  /* I · URL externa, otro proveedor, otro bucket. */
  { const { r, m, borrados } = await escenario({ sender: ALICE, url: `https://evil.example.com/v0/b/${BUCKET}/o/${encodeURIComponent(LEGITIMA)}?alt=media`, abre: BOB }); check('36) I · host ajeno con la forma correcta: NO, y se marca insegura (parece de Weë y no lo es)', borrados.length === 0 && m.objetos.has(LEGITIMA) && r.referenciaInsegura === true && r.pendingPhysicalDeletion === true); }
  { const { borrados } = await escenario({ sender: ALICE, url: 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1/messages/alice/x.jpg', abre: BOB }); check('36) y Cloudinary (otro proveedor) no se borra desde aquí', borrados.length === 0); }
  { const { m, borrados, r } = await escenario({ sender: ALICE, url: urlDe(LEGITIMA, 'otro-bucket.appspot.com'), abre: BOB }); check('37) otro bucket con la misma clave: NO', borrados.length === 0 && m.objetos.has(LEGITIMA) && r.referenciaInsegura === true); }
  /* J · Objeto ya inexistente. */
  { const { r, borrados } = await escenario({ sender: ALICE, url: urlDe(LEGITIMA), abre: BOB, objetos: [] }); check('38) J · el objeto ya no existe: se quema igual, sin error y sin pendiente', r.status === 'quemada' && r.pendingPhysicalDeletion === false && borrados.length === 1); }
  /* K · Repetición. */
  { const { m } = await escenario({ sender: ALICE, url: urlDe(LEGITIMA), abre: BOB }); const otra = await m.quemador.quemar(BOB, 'c1', 'm1'); check('39) K · segunda ejecución: ya_quemada y ningún segundo borrado', otra.status === 'ya_quemada' && m.diario.filter(([q]) => q === 'objeto').length === 1); }
  /* El remitente tiene que estar en la conversación que el servidor leyó. */
  { const { borrados } = await escenario({ sender: 'carol', url: urlDe('users/carol/weetalk/c1/photo.jpg'), abre: BOB }); check('40) un remitente que no figura en los participantes no autoriza ningún borrado', borrados.length === 0); }

  /* La función pura, con su tabla. */
  const clave = weetalk.claveDeFotoUnica;
  const SI = [['users/alice/weetalk/c1/photo.jpg', 'alice', 'c1'], ['users/alice/weetalk/c1/1700000000000-abc123.jpg', 'alice', 'c1'], ['users/a1B2/weetalk/x-y_z/f.webp', 'a1B2', 'x-y_z']];
  const NO = [
    ['users/alice/ai-generations/f.png', 'alice', 'c1'], ['users/bob/weetalk/c1/f.jpg', 'alice', 'c1'], ['users/alice/weetalk/c2/f.jpg', 'alice', 'c1'],
    ['users/alice/weetalk/c10/f.jpg', 'alice', 'c1'], ['users/aliceX/weetalk/c1/f.jpg', 'alice', 'c1'], ['users/alice/weetalk/c1/../f.jpg', 'alice', 'c1'],
    ['users/alice/weetalk/c1/sub/f.jpg', 'alice', 'c1'], ['users/alice/weetalk/c1/', 'alice', 'c1'], ['users/alice/weetalk/c1/.f', 'alice', 'c1'],
    ['users/alice/weetalk/c1/%2E%2E', 'alice', 'c1'], ['/users/alice/weetalk/c1/f.jpg', 'alice', 'c1'], ['assets/x', 'alice', 'c1'],
    ['users/alice/weetalk/c1/f.jpg', 'alice/../bob', 'c1'], ['users/alice/weetalk/c1/f.jpg', 'alice', 'c1/x'], ['users/alice/weetalk/c1/f.jpg', '', 'c1'],
    ['users/alice/weetalk/c1/f.jpg', 'alice', ''], [undefined, 'alice', 'c1'], ['users/alice/weetalk/c1/f.jpg', null, 'c1'],
    ['users/legacy_prefixed_id/weetalk/c1/f.jpg', 'legacy_prefixed_id', 'c1'],
  ];
  check('41) claveDeFotoUnica acepta exactamente la ruta legítima', SI.every(([k, s, c]) => clave(k, s, c) === true));
  check('41) y rechaza todo lo demás: otra carpeta, otra cuenta, otra conversación, prefijos parecidos, `..`, subcarpetas, codificados, barras iniciales, ids inválidos y remitentes con separadores', NO.every(([k, s, c]) => clave(k, s, c) === false), NO.filter(([k, s, c]) => clave(k, s, c) !== false).map((x) => x[0]).join(' | ') || 'todos rechazados');

  /* El sink, en el código: una sola llamada, detrás de la comprobación. */
  const fuente = leer('functions/src/social/weetalk.ts');
  check('42) `borrarObjeto` se llama UNA vez y solo detrás de `enSuSitio`', (fuente.match(/p\.borrarObjeto\(/g) || []).length === 1 && /if \(enSuSitio\) \{\s*\n\s*try \{\s*\n\s*await p\.borrarObjeto\(ref\.objectKey\)/.test(fuente));
  check('42) y el prefijo se construye entero antes de comparar', /const prefijo = `users\/\$\{senderId\}\/weetalk\/\$\{conversationId\}\/`;/.test(fuente) && /objectKey\.startsWith\(prefijo\)/.test(fuente) && !/includes\(senderId\)|startsWith\(senderId\)/.test(fuente));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeeTalk: la foto única desaparece de verdad, solo cuando la ve quien debe, y solo la foto que es');
process.exit(failures ? 1 : 0);
