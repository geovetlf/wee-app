/*
 * LO DE LA CUENTA FUERA DEL PERFIL PÚBLICO — PREPARADO, NO EJECUTADO.
 *
 * `users/{id}` lo lee cualquiera (`allow read: if true`), y los perfiles que ya
 * existen llevan campos que son de la CUENTA, no del perfil: `email`,
 * `realName`, `birthDate`, `gender` (y, si alguna vez se escribió, `pushToken`).
 * Las reglas ya no dejan al cliente volver a escribirlos ahí y el registro los
 * guarda en `users/{id}/private/account`; falta mover lo que ya estaba.
 *
 * Lo que hace, cuando se le autorice, por cada documento de `users`:
 *
 *   · `realName`, `birthDate`, `gender`  → se COPIAN a `users/{id}/private/account`
 *                                          (merge; no pisa lo que ya hubiera)
 *                                          y se BORRAN del perfil público;
 *   · `email`                            → se BORRA del perfil (vive en Firebase Auth);
 *   · `pushToken`, `pushTokenUpdatedAt`  → se BORRAN (el token vive en `pushTokens/{uid}`).
 *
 * Lo que NO hace: no toca ningún otro campo ni ninguna otra colección, no borra
 * documentos y no escribe nada sin LAS DOS banderas.
 *
 * Es IDEMPOTENTE: un perfil ya limpio no entra en el plan.
 *
 * Uso (desde la raíz, con credenciales de gcloud o GOOGLE_APPLICATION_CREDENTIALS):
 *   node scripts/limpiar-cuenta-en-users.mjs                          → DRY-RUN: el plan, sin escribir
 *   node scripts/limpiar-cuenta-en-users.mjs --ejecutar --confirmo-autorizacion
 *                                                                     → escribe. SOLO con autorización
 *                                                                       explícita del usuario, dada después.
 *   --project get-wee (por defecto)
 */
import { admin, iniciar, bandera } from './media-legacy.mjs';

const EJECUTAR = bandera('--ejecutar') && bandera('--confirmo-autorizacion');
if (bandera('--ejecutar') && !EJECUTAR) {
  console.error('Para escribir hacen falta LAS DOS banderas: --ejecutar --confirmo-autorizacion. Sin ellas, dry-run.');
  process.exit(2);
}

const { proyecto, db } = iniciar();
console.log(`\nLIMPIEZA DE CAMPOS DE CUENTA EN users — proyecto ${proyecto} — ${EJECUTAR ? '⚠ ESCRIBIENDO' : 'DRY-RUN (no escribe)'}\n`);

/* Qué se mueve y qué se borra. Nada más entra aquí. */
const A_PRIVADO = ['realName', 'birthDate', 'gender'];
const SOLO_BORRAR = ['email', 'pushToken', 'pushTokenUpdatedAt'];

const plan = [];
const snap = await db.collection('users').get();
for (const d of snap.docs) {
  const data = d.data();
  const mover = A_PRIVADO.filter((k) => data[k] !== undefined);
  const borrar = [...mover, ...SOLO_BORRAR.filter((k) => data[k] !== undefined)];
  if (borrar.length === 0) continue;
  plan.push({ ruta: d.ref.path, uid: data.uid ?? null, mover, borrar });
}

/* Solo NOMBRES de campo en pantalla: los valores son justo lo que no debe salir de aquí. */
console.log(`${snap.size} perfiles · ${plan.length} con campos de cuenta que limpiar\n`);
for (const p of plan) console.log(`  ${p.ruta}`.padEnd(46) + `mover → private/account: [${p.mover.join(', ')}]`.padEnd(52) + `borrar: [${p.borrar.join(', ')}]`);

if (!EJECUTAR) {
  console.log('\nDRY-RUN: no se ha escrito nada. Para ejecutar: --ejecutar --confirmo-autorizacion (con autorización explícita).');
  process.exit(0);
}

let hechos = 0;
for (const p of plan) {
  const ref = db.doc(p.ruta);
  const data = (await ref.get()).data() || {};
  const privado = Object.fromEntries(p.mover.map((k) => [k, data[k]]));
  const borrado = Object.fromEntries(p.borrar.map((k) => [k, admin.firestore.FieldValue.delete()]));
  const lote = db.batch();
  if (p.mover.length > 0) {
    lote.set(ref.collection('private').doc('account'), { ...privado, updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
  }
  lote.update(ref, borrado);
  await lote.commit();
  hechos++;
}
console.log(`\nHecho: ${hechos} perfiles limpios. Los campos movidos están en users/{id}/private/account.`);
