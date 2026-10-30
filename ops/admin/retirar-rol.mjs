#!/usr/bin/env node
/*
 * RETIRAR EL ACCESO DE ADMINISTRACIÓN A UNA PERSONA DEL PERSONAL DE WEË.
 *
 *   Emulador (demo-*):
 *     FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *       node ops/admin/retirar-rol.mjs --proyecto demo-wee --uid <uid>
 *
 *   Proyecto real (lo ejecuta SOLO la persona dueña, con SUS credenciales, cuando lo decida):
 *     node ops/admin/retirar-rol.mjs --proyecto get-wee --uid <uid> --actor <quien-lo-ejecuta> \
 *       --confirmar-proyecto get-wee --confirmar-uid <uid> --motivo "por qué"
 *
 * Quita `weeRole` Y `admin`, y revoca las sesiones. Las dos cosas a la vez a propósito: quitar solo `weeRole` a quien tiene
 * `admin: true` no le quita acceso, se lo AMPLÍA, porque pasa de un rol limitado a administración sin rol, que conserva
 * las operaciones antiguas. Quien quiera eso de verdad lo pide con `--mantener-admin`, y el script se lo advierte.
 *
 * En un proyecto real exige `--fuera-de-la-lista`: quien lo ejecuta afirma haber comprobado que el uid no está en
 * `WEE_ADMIN_UIDS`. Con él en la lista, quitar el rol lo dejaría como administración sin rol: con MÁS acceso. Este script
 * no puede ver esa variable, que vive en el entorno de despliegue.
 *
 * Plazo: la SIGUIENTE llamada de esa persona a una operación de administración ya se rechaza, también con un token
 * antiguo, porque el servidor relee Auth en cada llamada. Las reglas de Firestore ven el token y pueden tardar hasta la
 * hora que le quede. Y un uid en `WEE_ADMIN_UIDS` sigue siendo administración hasta quitarlo de ahí y desplegar: este
 * script no lo ve, así que hay que comprobarlo a mano (o deshabilitar la cuenta).
 *
 * Deja constancia en dos tiempos, como `asignar-owner`. No guarda ni imprime tokens, contraseñas ni credenciales.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { conectar, constancia, leerArgumentos, motivosComunes } from './_comun.mjs';

export const motivosParaNoEjecutar = ({ fueraDeLaLista, ...datos }) => {
  const motivos = motivosComunes(datos);
  if (!String(datos.proyecto || '').startsWith('demo-') && !fueraDeLaLista) motivos.push('en un proyecto real, --fuera-de-la-lista: comprueba antes que el uid no está en WEE_ADMIN_UIDS');
  return motivos;
};

/** Pura: los claims resultantes. Conserva lo que no es de administración. */
export const claimsSinRol = (actuales, { mantenerAdmin = false } = {}) => {
  const { weeRole: _rol, admin, ...resto } = actuales && typeof actuales === 'object' ? actuales : {};
  return mantenerAdmin && admin !== undefined ? { ...resto, admin } : resto;
};

const principal = async () => {
  const a = leerArgumentos(process.argv.slice(2));
  const motivos = motivosParaNoEjecutar({ proyecto: a.proyecto, uid: a.uid, actor: a.actor, confirmarProyecto: a['confirmar-proyecto'], confirmarUid: a['confirmar-uid'], motivo: a.motivo, fueraDeLaLista: a['fuera-de-la-lista'] === 'true', env: process.env });
  if (motivos.length) {
    console.error('✘ No se hace nada:');
    for (const m of motivos) console.error(`  · ${m}`);
    process.exit(1);
  }
  const mantenerAdmin = a['mantener-admin'] === 'true';
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { auth, db } = conectar(raiz, a.proyecto);

  const usuario = await auth.getUser(a.uid);
  const rolAnterior = usuario.customClaims?.weeRole ?? 'ninguno';
  const anotar = constancia(db, { proyecto: a.proyecto, actor: a.actor, accion: 'admin.retirarRol', uid: a.uid, motivo: a.motivo, metadatos: { rolAnterior, mantieneAdmin: mantenerAdmin } });
  await anotar('intento');
  try {
    await auth.setCustomUserClaims(a.uid, claimsSinRol(usuario.customClaims, { mantenerAdmin }));
    await auth.revokeRefreshTokens(a.uid);
  } catch (e) {
    await anotar('error', e?.code ?? 'error').catch(() => {});
    throw e;
  }
  await anotar('ok').catch((e) => console.error(`⚠ El acceso cambió y no se pudo cerrar la constancia (${e?.code ?? 'error'}): concilia ${anotar.correlationId}.`));
  console.log(`✔ Retirado a ${a.uid} en ${a.proyecto} (correlación ${anotar.correlationId}).`);
  if (mantenerAdmin) console.log('⚠ Sigue teniendo `admin`: sin rol, conserva las operaciones antiguas salvo que WEE_ADMIN_SIN_ROL=cerrado.');
  console.log('⚠ Si su uid está en WEE_ADMIN_UIDS, sigue siendo administración: compruébalo.');
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => {
    console.error('✘ Falló:', e?.code ?? 'error', '— revisa en adminAudit si quedó un intento sin cierre.');
    process.exit(1);
  });
}
