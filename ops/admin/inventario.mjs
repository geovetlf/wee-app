#!/usr/bin/env node
/*
 * QUIÉN ES ADMINISTRACIÓN HOY, Y SI SE PUEDE CERRAR EL LEGADO. SOLO LEE: ni claims, ni Firestore, ni nada.
 *
 *   Emulador (demo-*):
 *     FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *       node ops/admin/inventario.mjs --proyecto demo-wee [--uids-lista a,b]
 *
 *   Proyecto real (lo ejecuta SOLO la persona dueña, con SUS credenciales, cuando lo decida):
 *     node ops/admin/inventario.mjs --proyecto get-wee --confirmar-proyecto get-wee --uids-lista "<el valor de WEE_ADMIN_UIDS>"
 *
 * El valor de la lista se le pasa a mano porque vive en el entorno de despliegue: este script no lee ningún archivo de
 * entorno. De cada cuenta enseña su uid y lo que hace falta para decidir: nunca correo, nombre, teléfono ni credenciales.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { conectar, leerArgumentos, motivosDeProyecto } from './_comun.mjs';

const ROLES = ['owner', 'operations', 'finance', 'moderation', 'support', 'engineering'];

/** Pura: qué es una cuenta para la transición. */
export const situacionDeCuenta = ({ uid, claims = {}, disabled = false, ultimoAcceso = null }, lista = []) => {
  const admin = claims.admin === true;
  const enLista = lista.includes(uid);
  const rol = claims.weeRole;
  const rolValido = ROLES.includes(rol);
  let situacion;
  if (rol !== undefined && !rolValido) situacion = 'rol-invalido';
  else if (rolValido && !admin && !enLista) situacion = 'rol-sin-admin';
  else if (rol === 'owner') situacion = admin ? 'owner' : 'owner-solo-por-lista';
  else if (rolValido) situacion = 'rol-limitado';
  else if (admin) situacion = 'legado-por-claim';
  else if (enLista) situacion = 'legado-solo-por-lista';
  else situacion = 'sin-administracion';
  return { uid, admin, enLista, rol: rol ?? null, deshabilitada: disabled, ultimoAcceso, situacion };
};

/**
 * Pura: ¿se puede cerrar el legado sin dejar a nadie fuera por accidente? Hace falta un owner que no dependa de la lista
 * y que siga activo. Lo que se pierde no bloquea, pero se enumera: es la decisión de la persona dueña.
 */
export const evaluarCierre = (cuentas) => {
  const activas = cuentas.filter((c) => !c.deshabilitada);
  const owners = activas.filter((c) => c.situacion === 'owner');
  const bloqueos = [];
  if (owners.length === 0) bloqueos.push('no hay ningún owner activo con el claim admin: cerrar dejaría a Weë sin administración');
  const dependenDeLista = cuentas.filter((c) => c.situacion === 'owner-solo-por-lista' || c.situacion === 'legado-solo-por-lista').map((c) => c.uid);
  const pierden = activas.filter((c) => c.situacion === 'legado-por-claim' || c.situacion === 'legado-solo-por-lista').map((c) => c.uid);
  const avisos = [];
  if (owners.length === 1) avisos.push('solo hay un owner: si pierde el acceso, la recuperación pasa por el Admin SDK (ops/admin/asignar-owner.mjs). Conviene un segundo');
  if (owners.some((c) => c.enLista)) avisos.push('hay un owner también en WEE_ADMIN_UIDS: quitarlo de la lista no le quita el acceso, porque tiene el claim');
  if (dependenDeLista.length) avisos.push('hay cuentas que dependen de la lista: las reglas de Firestore no las ven');
  return { sePuedeCerrar: bloqueos.length === 0, bloqueos, avisos, pierdenElAcceso: pierden, owners: owners.map((c) => c.uid), dependenDeLista };
};

const principal = async () => {
  const a = leerArgumentos(process.argv.slice(2));
  const motivos = motivosDeProyecto({ proyecto: a.proyecto, confirmarProyecto: a['confirmar-proyecto'], env: process.env });
  if (motivos.length) {
    console.error('✘ No se hace nada:');
    for (const m of motivos) console.error(`  · ${m}`);
    process.exit(1);
  }
  const lista = String(a['uids-lista'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { auth } = conectar(raiz, a.proyecto);

  const cuentas = [];
  const vistos = new Set();
  let pagina;
  do {
    const r = await auth.listUsers(1000, pagina);
    for (const u of r.users) {
      vistos.add(u.uid);
      const c = situacionDeCuenta({ uid: u.uid, claims: u.customClaims ?? {}, disabled: u.disabled, ultimoAcceso: u.metadata.lastSignInTime ?? null }, lista);
      if (c.situacion !== 'sin-administracion') cuentas.push(c);
    }
    pagina = r.pageToken;
  } while (pagina);
  const huerfanos = lista.filter((uid) => !vistos.has(uid));

  console.log(JSON.stringify({ proyecto: a.proyecto, cuentas, uidsDeLaListaSinCuenta: huerfanos, cierre: evaluarCierre(cuentas) }, null, 2));
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => {
    console.error('✘ Falló:', e?.code ?? 'error');
    process.exit(1);
  });
}
