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
const mundo = ({ participants = ['uAna', 'uBea'], mensajes = {}, fallaBorrado = false } = {}) => {
  const diario = [];
  const docs = { ...mensajes };
  const objetos = new Set([CLAVE]);
  const puertos = {
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
  check('18) las URLs se reconocen con el mismo lector que el Content Core, no con otro', /referenciaDesdeUrlDeWee/.test(fuente) && !/firebasestorage\.googleapis\.com/.test(fuente));
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
  check('21) la pantalla elige el camino por `viewOnce`, en las dos entradas (galería y cámara)',
    (pantalla.match(/const url = viewOnce \? await uploadViewOncePhoto\(uri, myUid, convId\) : await uploadMessageImageFromUri\(uri, myUid\);/g) || []).length === 2);
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

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeeTalk: la foto única desaparece de verdad, y solo cuando la ve quien debe');
process.exit(failures ? 1 : 0);
