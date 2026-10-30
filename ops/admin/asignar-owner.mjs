#!/usr/bin/env node
/*
 * ASIGNAR EL ROL `owner` DEL PERSONAL DE WEË. El único camino: ninguna callable lo hace y ningún cliente puede.
 *
 *   Emulador (demo-*):
 *     FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *       node ops/admin/asignar-owner.mjs --proyecto demo-wee --uid <uid>
 *
 *   Proyecto real (lo ejecuta SOLO la persona dueña, con SUS credenciales, cuando lo decida):
 *     node ops/admin/asignar-owner.mjs --proyecto get-wee --uid <uid> \
 *       --confirmar-proyecto get-wee --confirmar-uid <uid> --motivo "por qué"
 *
 * Qué garantiza:
 *   · Es explícito: sin los dos `--confirmar-*`, en un proyecto real no hace nada. En un proyecto real exige `--motivo`.
 *   · No crea administradores: la cuenta YA tiene que tener el claim `admin`. Si no, se niega. Dar `admin` es otro acto.
 *   · No toca los demás claims: los conserva y solo añade `weeRole`.
 *   · Deja constancia ANTES de cambiar nada, en `adminAudit`. Si no puede escribirla, no cambia el rol.
 *   · Solo conoce `owner`: el resto de roles llegará con su propia decisión.
 *   · No guarda ni imprime tokens, contraseñas ni credenciales.
 *
 * El rol viaja en el token: la persona tiene que volver a iniciar sesión para que surta efecto.
 */
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HOSTS_LOCALES = ['127.0.0.1', 'localhost', '[::1]'];
const esLocal = (h) => HOSTS_LOCALES.includes(String(h || '').replace(/:\d+$/, ''));

/** Pura: por qué NO se puede ejecutar con estos datos (vacío = se puede). */
export const motivosParaNoEjecutar = ({ proyecto, uid, confirmarProyecto, confirmarUid, motivo, env = {} }) => {
  const motivos = [];
  if (!proyecto) motivos.push('falta --proyecto');
  if (!uid || /[/\s]/.test(uid) || uid.length > 128) motivos.push('--uid no es válido');
  const esDemo = String(proyecto || '').startsWith('demo-');
  const hayEmulador = !!env.FIREBASE_AUTH_EMULATOR_HOST;
  if (esDemo) {
    if (!hayEmulador || !env.FIRESTORE_EMULATOR_HOST) motivos.push('un proyecto demo-* solo funciona con FIREBASE_AUTH_EMULATOR_HOST y FIRESTORE_EMULATOR_HOST');
    else if (!esLocal(env.FIREBASE_AUTH_EMULATOR_HOST) || !esLocal(env.FIRESTORE_EMULATOR_HOST)) motivos.push('los emuladores tienen que ser de esta máquina');
  } else if (proyecto) {
    if (hayEmulador || env.FIRESTORE_EMULATOR_HOST) motivos.push('un proyecto real no se mezcla con variables de emulador');
    if (confirmarProyecto !== proyecto) motivos.push('en un proyecto real, --confirmar-proyecto tiene que repetir --proyecto');
    if (confirmarUid !== uid) motivos.push('en un proyecto real, --confirmar-uid tiene que repetir --uid');
    if (!motivo || String(motivo).trim().length < 10) motivos.push('en un proyecto real, --motivo es obligatorio (10 caracteres o más)');
  }
  return motivos;
};

/** Pura: los claims resultantes, o por qué no. Exige que ya sea administración y conserva todo lo demás. */
export const claimsConOwner = (actuales) => {
  const claims = actuales && typeof actuales === 'object' ? actuales : {};
  if (claims.admin !== true) return { error: 'la cuenta no tiene el claim admin: este script no crea administradores' };
  return { claims: { ...claims, weeRole: 'owner' } };
};

const leerArgumentos = (argv) => {
  const salida = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) salida[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  }
  return salida;
};

const principal = async () => {
  const a = leerArgumentos(process.argv.slice(2));
  const motivos = motivosParaNoEjecutar({ proyecto: a.proyecto, uid: a.uid, confirmarProyecto: a['confirmar-proyecto'], confirmarUid: a['confirmar-uid'], motivo: a.motivo, env: process.env });
  if (motivos.length) {
    console.error('✘ No se hace nada:');
    for (const m of motivos) console.error(`  · ${m}`);
    process.exit(1);
  }

  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const require = createRequire(path.join(raiz, 'functions/package.json'));
  const { initializeApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ projectId: a.proyecto });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const usuario = await auth.getUser(a.uid);
  const resultado = claimsConOwner(usuario.customClaims);
  if (resultado.error) {
    console.error(`✘ No se hace nada: ${resultado.error}.`);
    process.exit(1);
  }
  const rolAnterior = usuario.customClaims?.weeRole ?? null;

  /* Primero la constancia. Misma forma que functions/src/admin/auditoria.ts. */
  const correlationId = `adm_${randomBytes(12).toString('hex')}`;
  await db.collection('adminAudit').doc().create({
    v: 1,
    en: Date.now(),
    entorno: a.proyecto,
    actorUid: 'script:asignar-owner',
    actorRol: null,
    accion: 'admin.asignarRol',
    recurso: { tipo: 'cuenta', id: a.uid },
    resultado: 'ok',
    correlationId,
    ...(a.motivo ? { motivo: String(a.motivo).slice(0, 200) } : {}),
    metadatos: { rolAnterior: rolAnterior ?? 'ninguno', rolNuevo: 'owner' },
  });

  await auth.setCustomUserClaims(a.uid, resultado.claims);
  console.log(`✔ ${a.uid} tiene el rol owner en ${a.proyecto} (correlación ${correlationId}). Tiene que volver a iniciar sesión.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => {
    console.error('✘ Falló:', e?.code ?? 'error', '— si la constancia ya se escribió y el claim no, revisa adminAudit.');
    process.exit(1);
  });
}
