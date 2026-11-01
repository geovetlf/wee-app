/*
 * Lo que comparten los scripts de `ops/admin`: las condiciones para ejecutar, la conexión y la constancia en `adminAudit`,
 * con la misma forma que functions/src/admin/auditoria.ts. Importarlo no conecta con nada.
 */
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const HOSTS_LOCALES = ['127.0.0.1', 'localhost', '[::1]'];
const esLocal = (h) => HOSTS_LOCALES.includes(String(h || '').replace(/:\d+$/, ''));

/** Pura: el entorno, para los scripts que solo leen y para los que escriben. */
export const motivosDeProyecto = ({ proyecto, confirmarProyecto, env = {} }) => {
  const motivos = [];
  if (!proyecto) motivos.push('falta --proyecto');
  const esDemo = String(proyecto || '').startsWith('demo-');
  const hayEmulador = !!env.FIREBASE_AUTH_EMULATOR_HOST;
  if (esDemo) {
    if (!hayEmulador || !env.FIRESTORE_EMULATOR_HOST) motivos.push('un proyecto demo-* solo funciona con FIREBASE_AUTH_EMULATOR_HOST y FIRESTORE_EMULATOR_HOST');
    else if (!esLocal(env.FIREBASE_AUTH_EMULATOR_HOST) || !esLocal(env.FIRESTORE_EMULATOR_HOST)) motivos.push('los emuladores tienen que ser de esta máquina');
  } else if (proyecto) {
    if (hayEmulador || env.FIRESTORE_EMULATOR_HOST) motivos.push('un proyecto real no se mezcla con variables de emulador');
    if (confirmarProyecto !== proyecto) motivos.push('en un proyecto real, --confirmar-proyecto tiene que repetir --proyecto');
  }
  return motivos;
};

/** Pura: por qué NO se puede ejecutar con estos datos (vacío = se puede). */
export const motivosComunes = ({ proyecto, uid, actor, confirmarProyecto, confirmarUid, motivo, env = {} }) => {
  const motivos = motivosDeProyecto({ proyecto, confirmarProyecto, env });
  if (!uid || /[/\s]/.test(uid) || uid.length > 128) motivos.push('--uid no es válido');
  if (proyecto && !String(proyecto).startsWith('demo-')) {
    if (confirmarUid !== uid) motivos.push('en un proyecto real, --confirmar-uid tiene que repetir --uid');
    if (!motivo || String(motivo).trim().length < 10) motivos.push('en un proyecto real, --motivo es obligatorio (10 caracteres o más)');
    if (!actor || /\s/.test(actor) || actor.length > 128) motivos.push('en un proyecto real, --actor es obligatorio: quién lo ejecuta de verdad');
  }
  return motivos;
};

export const leerArgumentos = (argv) => {
  const salida = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) salida[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  }
  return salida;
};

export const conectar = (raiz, proyecto) => {
  const require = createRequire(path.join(raiz, 'functions/package.json'));
  const { initializeApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ projectId: proyecto });
  return { auth: getAuth(app), db: getFirestore(app) };
};

/**
 * Una función que añade entradas de un mismo acto: `intento` antes de cambiar nada y `ok` o `error` después, con la
 * misma correlación. Sin `--actor` (solo en emulador), el actor es el de la máquina local.
 */
export const constancia = (db, { proyecto, actor, accion, uid, motivo, metadatos }) => {
  const correlationId = `adm_${randomBytes(12).toString('hex')}`;
  const anotar = (resultado, codigoDeError) => db.collection('adminAudit').doc().create({
    v: 1,
    en: Date.now(),
    entorno: proyecto,
    actorUid: actor ?? 'emulador-local',
    actorRol: null,
    accion,
    recurso: { tipo: 'cuenta', id: uid },
    resultado,
    correlationId,
    ...(codigoDeError ? { codigoDeError: String(codigoDeError).slice(0, 200) } : {}),
    ...(motivo ? { motivo: String(motivo).slice(0, 200) } : {}),
    metadatos,
  });
  anotar.correlationId = correlationId;
  return anotar;
};
