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
 *   SE INVENTARÍA          `users/biz_*`, y lo que esos uid dejaron escrito
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
/* El rango de todos los ids que empiezan por `biz_`, sin traerse la colección entera. */
const porPrefijo = (col, campo) => (campo
  ? db.collection(col).where(campo, '>=', PREFIJO).where(campo, '<', 'biz`')
  : db.collection(col).where(admin.firestore.FieldPath.documentId(), '>=', PREFIJO)
    .where(admin.firestore.FieldPath.documentId(), '<', 'biz`'));

const ids = (snap) => snap.docs.map((d) => d.id);

console.log(`\nINVENTARIO LEGACY BIZ PROFILE — proyecto ${PROYECTO} — SOLO LECTURA\n`);

const inventario = { proyecto: PROYECTO, generado: new Date().toISOString(), identidades: [], referencias: {}, intocable: {} };

// ─────────────────────────────────────────────────────────────────────────────
// 1 · LAS IDENTIDADES. Lo único que se borraría.
// ─────────────────────────────────────────────────────────────────────────────
const usuarios = await porPrefijo('users').get();
const sospechosos = usuarios.docs.map((d) => ({ uid: d.id, ...d.data() }));

/*
 * VERIFICACIÓN, no confianza en el nombre. Un documento solo cuenta como
 * identidad Biz si CUMPLE LAS DOS COSAS: uid `biz_*` Y `profileType: 'biz'`.
 * Cualquier otra cosa se marca AMBIGUA y se reporta sin tocarla.
 */
const identidades = sospechosos.filter((u) => u.profileType === 'biz');
const ambiguos = sospechosos.filter((u) => u.profileType !== 'biz');

console.log(`users/biz_*                         ${sospechosos.length}`);
console.log(`  · con profileType 'biz' (Biz)     ${identidades.length}`);
console.log(`  · AMBIGUOS (revisar a mano)       ${ambiguos.length}`);
for (const a of ambiguos) console.log(`      ⚠ ${a.uid} → profileType=${JSON.stringify(a.profileType)}`);

inventario.identidades = identidades.map((u) => ({
  uid: u.uid, profileType: u.profileType, linkedAccountId: u.linkedAccountId ?? null,
  businessId: u.businessId ?? null, displayName: u.displayName ?? null,
}));
inventario.ambiguos = ambiguos.map((u) => ({ uid: u.uid, profileType: u.profileType ?? null }));

const UIDS = new Set(identidades.map((u) => u.uid));

// ─────────────────────────────────────────────────────────────────────────────
// 2 · LO QUE ESAS IDENTIDADES DEJARON ESCRITO. Se cuenta, no se borra aquí:
//     un post publicado es contenido de una persona real y su destino lo
//     decide el usuario, no este script.
// ─────────────────────────────────────────────────────────────────────────────
const REFERENCIAS = [
  ['posts', 'userId'], ['posts', 'authorId'],
  ['follows', 'followerId'], ['follows', 'followingId'],
  ['econtacts', 'aId'], ['econtacts', 'bId'],
  ['comments', 'userId'], ['likes', 'userId'],
  ['notifications', 'userId'], ['notifications', 'actorId'],
  ['conversations', 'participantIds'], ['messages', 'senderId'],
];

console.log('\nreferencias escritas por esas identidades');
for (const [col, campo] of REFERENCIAS) {
  try {
    const snap = campo === 'participantIds'
      ? await db.collection(col).where(campo, 'array-contains-any', [...UIDS].slice(0, 30)).get()
      : await porPrefijo(col, campo).get();
    const propios = snap.docs.filter((d) => {
      const v = d.get(campo);
      return Array.isArray(v) ? v.some((x) => UIDS.has(x)) : UIDS.has(v);
    });
    if (snap.size || propios.length) {
      console.log(`  ${col}.${campo}`.padEnd(36) + `${propios.length}`
        + (snap.size !== propios.length ? `  (de ${snap.size} con prefijo)` : ''));
    }
    inventario.referencias[`${col}.${campo}`] = { total: propios.length, ids: ids({ docs: propios }) };
  } catch (e) {
    console.log(`  ${col}.${campo}`.padEnd(36) + `— sin índice o sin colección (${e.code ?? 'error'})`);
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
