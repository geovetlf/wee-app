/*
 * INVENTARIO DEL LEGACY BIZ PROFILE — SOLO LECTURA. NO BORRA NADA.
 *
 * El Perfil Biz fue una tercera IDENTIDAD: un documento en `users` con uid
 * `biz_<businessId>` y `profileType: 'biz'`, que el cajón del ☰ creaba solo —sin
 * que nadie lo pidiera— en cuanto alguien con un negocio abría el menú. Con esa
 * identidad se podía publicar como si el negocio fuera una persona.
 *
 * ESO es lo que se elimina. WEË BUSINESS NO SE TOCA:
 *
 *   SE INVENTARÍA          los perfiles de `users` con uid `biz_*` o tipo `'biz'`
 *                          —por sus CAMPOS, no por el id del documento—, y lo
 *                          que esos uid dejaron escrito
 *   NO SE TOCA NUNCA       `businesses/*` y todo lo que cuelga de ahí
 *                          (products, reviews), `businessFollows/*`
 *
 * El `_biz_` que aparece en los ids de `businessFollows` es un SEPARADOR
 * (`<uid>_biz_<businessId>`), no el prefijo de una identidad. No se confunda.
 *
 * Uso:
 *   node scripts/inventario-biz.mjs                  → inventario en pantalla
 *   node scripts/inventario-biz.mjs --json ruta.json → y además el inventario entero
 *
 * Credenciales: las de gcloud (`gcloud auth application-default login`) o
 * GOOGLE_APPLICATION_CREDENTIALS. El proyecto sale de --project o de get-wee.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const admin = require('firebase-admin');

const arg = (n, def) => {
  const i = process.argv.indexOf(n);
  return i === -1 ? def : process.argv[i + 1];
};
const PROYECTO = arg('--project', 'get-wee');
const SALIDA = arg('--json', null);

admin.initializeApp({ projectId: PROYECTO });
const db = admin.firestore();

const PREFIJO = 'biz_';
/* El rango de todos los valores de un CAMPO que empiezan por `biz_`, sin traerse la colección entera. */
const porPrefijo = (consulta, campo) => consulta.where(campo, '>=', PREFIJO).where(campo, '<', 'biz`');

const ids = (snap) => snap.docs.map((d) => d.id);

console.log(`\nINVENTARIO LEGACY BIZ PROFILE — proyecto ${PROYECTO} — SOLO LECTURA\n`);

const inventario = { proyecto: PROYECTO, generado: new Date().toISOString(), identidades: [], referencias: {}, intocable: {} };

// ─────────────────────────────────────────────────────────────────────────────
// 1 · LAS IDENTIDADES. Lo único que se borraría.
//
// SE BUSCAN POR SUS CAMPOS, NO POR EL ID DEL DOCUMENTO (Fase 11.x-4A). Esto
// buscaba `users/biz_*` por id, dando por hecho que el documento se llamaba
// como su uid. No era así: los perfiles se crearon con `addDoc`, con id
// automático, y el uid vive en el CAMPO `uid`. La búsqueda no podía encontrar
// ninguno, así que su «0» no probaba nada. Ahora se mira el campo `uid` con el
// prefijo Y el campo `profileType == 'biz'`, y se juntan los dos resultados:
// un perfil Biz aparece tenga el id que tenga.
// ─────────────────────────────────────────────────────────────────────────────
const [porUid, porTipo] = await Promise.all([
  porPrefijo(db.collection('users'), 'uid').get(),
  db.collection('users').where('profileType', '==', 'biz').get(),
]);
const vistos = new Map();
for (const d of [...porUid.docs, ...porTipo.docs]) vistos.set(d.ref.path, d);
const sospechosos = [...vistos.values()].map((d) => ({ ...d.data(), documentId: d.id, uid: d.get('uid') ?? null }));

/*
 * VERIFICACIÓN, no confianza en el nombre. Un documento solo cuenta como
 * identidad Biz si CUMPLE LAS DOS COSAS: uid `biz_*` Y `profileType: 'biz'`.
 * Cualquier otra cosa —el prefijo sin el tipo, o el tipo sin el prefijo— se
 * marca AMBIGUA y se reporta sin tocarla.
 */
const esUidBiz = (uid) => typeof uid === 'string' && uid.startsWith(PREFIJO);
const identidades = sospechosos.filter((u) => u.profileType === 'biz' && esUidBiz(u.uid));
const ambiguos = sospechosos.filter((u) => !(u.profileType === 'biz' && esUidBiz(u.uid)));

console.log(`users con uid biz_* o tipo 'biz'    ${sospechosos.length}`);
console.log(`  · las dos cosas (Biz)             ${identidades.length}`);
console.log(`  · AMBIGUOS (revisar a mano)       ${ambiguos.length}`);
for (const a of ambiguos) console.log(`      ⚠ users/${a.documentId} → uid=${JSON.stringify(a.uid)} profileType=${JSON.stringify(a.profileType)}`);

inventario.identidades = identidades.map((u) => ({
  documentId: u.documentId, uid: u.uid, profileType: u.profileType, linkedAccountId: u.linkedAccountId ?? null,
  businessId: u.businessId ?? null, displayName: u.displayName ?? null,
}));
inventario.ambiguos = ambiguos.map((u) => ({ documentId: u.documentId, uid: u.uid, profileType: u.profileType ?? null }));

const UIDS = new Set(identidades.map((u) => u.uid));

// ─────────────────────────────────────────────────────────────────────────────
// 2 · LO QUE ESAS IDENTIDADES DEJARON ESCRITO. Se cuenta, no se borra aquí:
//     un post publicado es contenido de una persona real y su destino lo
//     decide el usuario, no este script.
// ─────────────────────────────────────────────────────────────────────────────
/*
 * Los campos con los NOMBRES QUE TIENE EL ESQUEMA (Fase 11.x-4A). La lista
 * anterior buscaba `econtacts.aId/bId`, `notifications.userId/actorId`,
 * `conversations.participantIds` y una colección `messages` de primer nivel:
 * nada de eso existe, así que tampoco podía encontrar nada. Los campos de
 * texto se buscan por prefijo —eso encuentra también lo que dejó una identidad
 * cuyo perfil ya no esté—; los de lista, por las identidades encontradas.
 */
const REFERENCIAS = [
  ['posts', 'userId'], ['comments', 'userId'],
  ['votes', 'userId'], ['commentVotes', 'userId'], ['likes', 'userId'],
  ['follows', 'followerId'], ['follows', 'followingId'],
  ['notifications', 'senderId'], ['notifications', 'recipientId'],
  ['communities', 'createdBy'],
  ['econtacts', 'users', 'lista'], ['conversations', 'participants', 'lista'],
  ['messages', 'senderId', 'grupo'],
];

console.log('\nreferencias escritas por esas identidades');
for (const [col, campo, modo] of REFERENCIAS) {
  const clave = modo === 'grupo' ? `*/${col}.${campo}` : `${col}.${campo}`;
  try {
    let snap;
    if (modo === 'lista') {
      /* `array-contains-any` necesita al menos un valor: sin identidades Biz, no hay nada que buscar. */
      snap = UIDS.size ? await db.collection(col).where(campo, 'array-contains-any', [...UIDS].slice(0, 30)).get() : { docs: [], size: 0 };
    } else {
      snap = await porPrefijo(modo === 'grupo' ? db.collectionGroup(col) : db.collection(col), campo).get();
    }
    const propios = snap.docs.filter((d) => {
      const v = d.get(campo);
      return Array.isArray(v) ? v.some((x) => UIDS.has(x)) : UIDS.has(v);
    });
    if (snap.size || propios.length) {
      console.log(`  ${clave}`.padEnd(36) + `${propios.length}`
        + (snap.size !== propios.length ? `  (de ${snap.size} con prefijo)` : ''));
    }
    inventario.referencias[clave] = { total: propios.length, conPrefijo: snap.size, ids: ids({ docs: propios }) };
  } catch (e) {
    console.log(`  ${clave}`.padEnd(36) + `— sin índice o sin colección (${e.code ?? 'error'})`);
    inventario.referencias[clave] = { error: String(e.code ?? 'error') };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · LO INTOCABLE. Se cuenta para PROBAR que sigue ahí después.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nWEË BUSINESS — NO SE TOCA (se cuenta para poder probar que sigue entero)');
for (const col of ['businesses', 'businessFollows']) {
  const n = (await db.collection(col).count().get()).data().count;
  console.log(`  ${col}`.padEnd(36) + n);
  inventario.intocable[col] = n;
}

console.log('\nESTE SCRIPT NO HA BORRADO NADA.');
if (SALIDA) { fs.writeFileSync(SALIDA, JSON.stringify(inventario, null, 2)); console.log(`inventario → ${SALIDA}`); }
process.exit(0);
