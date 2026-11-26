/*
 * RELLENO DE `publicProfiles` DESDE `users` — PREPARADO, NO EJECUTADO (seguridad de `users`, 2026-10-07).
 *
 * El disparador `espejoDelPerfilPublico` (functions/src/identity/perfilPublico.ts) mantiene la copia pública de
 * cada perfil a partir de su siguiente escritura; los perfiles que ya existen necesitan esta pasada una vez.
 * Usa LA MISMA proyección con lista blanca (`proyectarPerfilPublico`, desde functions/lib: compilar antes).
 *
 * Qué hace: por cada id de `users` Y de `publicProfiles` (las copias huérfanas, sin perfil, se borran)
 * sincroniza `publicProfiles/{mismo id}` con
 * `sincronizarPerfilPublico` —la MISMA función que usa el espejo—: dentro de una transacción relee el perfil ACTUAL
 * y su copia y escribe solo si difieren. Así no pisa lo que el espejo haya escrito después de empezar (siempre
 * proyecta lo que hay ahora, y la transacción se repite si el perfil cambia a la vez). La comparación es canónica
 * (`mismoContenido`: claves ordenadas), no depende del orden en que Firestore devuelve los campos.
 * Qué NO hace: no toca `users`, no mueve campos. Idempotente: lo que ya coincide no se escribe; una segunda
 * pasada escribe 0. Errores pasajeros: reintento acotado; permanentes: sin bucle, y el resultado es FAILED. Al final
 * VERIFICA (`verificarRelleno`): users con uid > 0, recuentos iguales, cada perfil con su copia y cero huérfanas; si
 * no, FAILED y exit 1 (nunca OK por defecto). Es lo que se copia a `cierreDeUsers.relleno`.
 *
 * Uso (desde la raíz, con credenciales de gcloud o GOOGLE_APPLICATION_CREDENTIALS):
 *   node scripts/rellenar-perfiles-publicos.mjs                          → DRY-RUN: cuenta, sin escribir
 *   node scripts/rellenar-perfiles-publicos.mjs --ejecutar --confirmo-autorizacion
 *                                                                        → escribe. SOLO con autorización explícita.
 *   --project get-wee (por defecto)
 *
 * Proyecto VACÍO (ningún perfil con uid en `users`): el resultado es FAILED con exit 1 aunque no haya nada que
 * rellenar. Es intencionado —`verificarRelleno` exige users > 0 y nunca da OK por defecto—, así que en un proyecto
 * sin perfiles un FAILED no indica un error del relleno; tampoco hay entonces nada que copiar a `cierreDeUsers.relleno`.
 *
 * ORDEN: disparador desplegado → este relleno → cliente nuevo → reglas que cierran `users`.
 */
import { createRequire } from 'node:module';
import { iniciar, bandera } from './media-legacy.mjs';

const require = createRequire(import.meta.url);
const { planDeRelleno, verificarRelleno, sincronizarConReintento, COLECCION_PERFILES_PUBLICOS } =
  require('../functions/lib/identity/perfilPublico.js');

const EJECUTAR = bandera('--ejecutar') && bandera('--confirmo-autorizacion');
if (bandera('--ejecutar') && !EJECUTAR) {
  console.error('Para escribir hacen falta LAS DOS banderas: --ejecutar --confirmo-autorizacion. Sin ellas, dry-run.');
  process.exit(2);
}

const { proyecto, db } = iniciar();
console.log(`\nRELLENO DE ${COLECCION_PERFILES_PUBLICOS} — proyecto ${proyecto} — ${EJECUTAR ? '⚠ ESCRIBIENDO' : 'DRY-RUN (no escribe)'}\n`);

const leerTodo = async () => {
  const [u, p] = await Promise.all([db.collection('users').get(), db.collection(COLECCION_PERFILES_PUBLICOS).get()]);
  return { usuarios: u.docs.map((d) => [d.id, d.data()]), publicos: p.docs.map((d) => [d.id, d.data()]) };
};

const { usuarios, publicos } = await leerTodo();
const plan = planDeRelleno(usuarios, publicos);
/* Solo recuentos: ni ids ni valores salen por pantalla. */
console.log(`${usuarios.length} perfiles · ${plan.ids.length} copias que escribir · ${plan.sinUid} sin uid (se omiten) · ${plan.huerfanos} huérfanas (copia sin perfil: se borran)`);

if (!EJECUTAR) {
  console.log('\nDRY-RUN: no se ha escrito nada. Para ejecutar: --ejecutar --confirmo-autorizacion (con autorización explícita).');
} else {
  /* Un error pasajero se reintenta (acotado); uno permanente queda como 'fallida' y el resultado es FAILED. */
  const cuenta = { igual: 0, escrita: 0, borrada: 0, fallida: 0 };
  for (const id of plan.ids) cuenta[await sincronizarConReintento(db, id)]++;
  console.log(`\nSincronizadas ${plan.ids.length}: ${cuenta.escrita} escritas · ${cuenta.igual} ya al día (el espejo llegó antes) · ${cuenta.borrada} borradas · ${cuenta.fallida} fallidas.`);
  /* Verificación: otra lectura completa. OK solo si users (con uid) > 0, recuentos iguales, cada perfil con su copia
     al día, cero huérfanas y ninguna sincronización fallida. Cualquier otra cosa: FAILED. */
  const despues = await leerTodo();
  const v = verificarRelleno(despues.usuarios, despues.publicos);
  const ok = v.ok && cuenta.fallida === 0;
  console.log(`VERIFICACIÓN: ${v.conUid} perfiles con uid · ${v.publicos} copias públicas · ${v.desfasadas} desfasadas · ${v.huerfanos} huérfanas → ${ok ? 'OK' : 'FAILED'}`);
  if (!ok) {
    for (const m of v.motivos) console.log(`  ✘ ${m}`);
    if (cuenta.fallida) console.log(`  ✘ ${cuenta.fallida} sincronizaciones fallidas`);
    process.exitCode = 1;
  }
}
