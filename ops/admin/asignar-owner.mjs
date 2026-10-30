#!/usr/bin/env node
/*
 * ASIGNAR EL ROL `owner` DEL PERSONAL DE WEË. El único camino: ninguna callable lo hace y ningún cliente puede.
 *
 *   Emulador (demo-*):
 *     FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *       node ops/admin/asignar-owner.mjs --proyecto demo-wee --uid <uid>
 *
 *   Proyecto real (lo ejecuta SOLO la persona dueña, con SUS credenciales, cuando lo decida):
 *     node ops/admin/asignar-owner.mjs --proyecto get-wee --uid <uid> --actor <quien-lo-ejecuta> \
 *       --confirmar-proyecto get-wee --confirmar-uid <uid> --motivo "por qué"
 *
 * Qué garantiza:
 *   · Es explícito: sin los dos `--confirmar-*`, en un proyecto real no hace nada. En un proyecto real exige `--motivo`
 *     y `--actor`: quién lo hace de verdad, no el nombre del script.
 *   · No crea administradores sin decirlo: sin el claim `admin` se niega. Para una cuenta que hoy solo es administración
 *     por `WEE_ADMIN_UIDS` (las reglas de Firestore no la ven, y dejará de serlo al vaciar la lista), `--conceder-admin`
 *     da las dos cosas a la vez y queda escrito. Es un acto expreso: en un proyecto real exige `--confirmar-admin <uid>`.
 *   · No toca los demás claims: los conserva y solo añade `weeRole`.
 *   · Deja constancia en dos tiempos, como las callables (`functions/src/admin/autorizacion.ts`): `intento` ANTES de
 *     cambiar nada (si no puede escribirlo, no cambia el rol) y `ok` o `error` cuando sabe cómo acabó.
 *   · Solo conoce `owner`: el resto de roles llegará con su propia decisión.
 *   · No guarda ni imprime tokens, contraseñas ni credenciales.
 *
 * Surte efecto en la siguiente llamada a una operación de administración, porque el servidor relee los claims en Auth.
 * Las reglas de Firestore y la consola sí ven el token: esas, al renovarlo o al volver a iniciar sesión.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { conectar, constancia, leerArgumentos, motivosComunes } from './_comun.mjs';

/** Pura: por qué NO se puede ejecutar con estos datos (vacío = se puede). */
export const motivosParaNoEjecutar = ({ concederAdmin, confirmarAdmin, ...datos }) => {
  const motivos = motivosComunes(datos);
  if (concederAdmin && !String(datos.proyecto || '').startsWith('demo-') && confirmarAdmin !== datos.uid) motivos.push('en un proyecto real, --conceder-admin exige --confirmar-admin con el mismo uid');
  return motivos;
};

/** Pura: los claims resultantes, o por qué no. Exige que ya sea administración y conserva todo lo demás. */
export const claimsConOwner = (actuales, { concederAdmin = false } = {}) => {
  const claims = actuales && typeof actuales === 'object' ? actuales : {};
  if (claims.admin !== true && !concederAdmin) return { error: 'la cuenta no tiene el claim admin: este script no crea administradores sin --conceder-admin' };
  return { claims: { ...claims, admin: true, weeRole: 'owner' }, concedeAdmin: claims.admin !== true };
};

const principal = async () => {
  const a = leerArgumentos(process.argv.slice(2));
  const concederAdmin = a['conceder-admin'] === 'true';
  const motivos = motivosParaNoEjecutar({ proyecto: a.proyecto, uid: a.uid, actor: a.actor, confirmarProyecto: a['confirmar-proyecto'], confirmarUid: a['confirmar-uid'], motivo: a.motivo, concederAdmin, confirmarAdmin: a['confirmar-admin'], env: process.env });
  if (motivos.length) {
    console.error('✘ No se hace nada:');
    for (const m of motivos) console.error(`  · ${m}`);
    process.exit(1);
  }

  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { auth, db } = conectar(raiz, a.proyecto);

  const usuario = await auth.getUser(a.uid);
  if (usuario.disabled) {
    console.error('✘ No se hace nada: la cuenta está deshabilitada; un owner deshabilitado no recupera nada.');
    process.exit(1);
  }
  const resultado = claimsConOwner(usuario.customClaims, { concederAdmin });
  if (resultado.error) {
    console.error(`✘ No se hace nada: ${resultado.error}.`);
    process.exit(1);
  }
  const rolAnterior = usuario.customClaims?.weeRole ?? null;

  const anotar = constancia(db, { proyecto: a.proyecto, actor: a.actor, accion: 'admin.asignarRol', uid: a.uid, motivo: a.motivo, metadatos: { rolAnterior: rolAnterior ?? 'ninguno', rolNuevo: 'owner', concedeAdmin: resultado.concedeAdmin } });
  await anotar('intento');
  try {
    await auth.setCustomUserClaims(a.uid, resultado.claims);
  } catch (e) {
    await anotar('error', e?.code ?? 'error').catch(() => {});
    throw e;
  }
  await anotar('ok').catch((e) => console.error(`⚠ El rol cambió y no se pudo cerrar la constancia (${e?.code ?? 'error'}): concilia ${anotar.correlationId}.`));
  console.log(`✔ ${a.uid} tiene el rol owner en ${a.proyecto} (correlación ${anotar.correlationId}).`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => {
    console.error('✘ Falló:', e?.code ?? 'error', '— revisa en adminAudit si quedó un intento sin cierre.');
    process.exit(1);
  });
}
