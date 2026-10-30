#!/usr/bin/env node
/*
 * ADMINISTRADOR LOCAL — SOLO EN EL EMULADOR DE AUTH (proyecto demo-*).
 *
 *   node scripts/admin-local.mjs --email admin@demo-wee.local --password <la-que-elijas>
 *
 * Qué hace: crea (o reutiliza) un usuario en el emulador de Auth y le pone el custom claim `admin: true`, que es el
 * MISMO mecanismo que `assertAdmin` (functions/src/shared/admin.ts) lee en el servidor. El servidor no cambia: sigue
 * comprobando el claim del token en cada llamada. Esto no abre ninguna ruta, no desactiva ninguna comprobación y no
 * existe fuera del emulador.
 *
 * Qué NO puede hacer, y cómo se garantiza (ver `motivosParaNoUsar` y su prueba en functions/test):
 *   · No corre contra un proyecto que no sea demo-*.
 *   · No corre si el host del emulador no es de esta máquina (así no puede alcanzar identitytoolkit.googleapis.com).
 *   · No corre si hay credenciales de Google en el entorno.
 *   · No usa firebase-admin ni ninguna credencial: el emulador acepta `Authorization: Bearer owner` para su API de
 *     administración local, y solo para eso.
 *   · La contraseña no tiene valor por defecto ni se guarda en ningún archivo: se pasa a mano.
 *
 * Después de ejecutarlo, entra en la consola con ese correo. Si ya tenías una sesión abierta con ese usuario,
 * ciérrala y vuelve a entrar: el claim viaja en el token y se renueva al iniciar sesión.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROYECTO_POR_DEFECTO = 'demo-wee';
export const EMULADOR_POR_DEFECTO = '127.0.0.1:9099';
const HOSTS_LOCALES = ['127.0.0.1', 'localhost', '[::1]'];

/** Pura: por qué NO se puede usar con este entorno (vacío = se puede). */
export const motivosParaNoUsar = ({ proyecto, emulador, env = {} }) => {
  const motivos = [];
  if (!proyecto || !String(proyecto).startsWith('demo-')) motivos.push(`el proyecto «${proyecto}» no es demo-*: esto solo funciona en emuladores`);
  const host = String(emulador || '').replace(/:\d+$/, '');
  if (!HOSTS_LOCALES.includes(host)) motivos.push(`el emulador «${emulador}» no es de esta máquina (127.0.0.1 o localhost)`);
  if (!/:\d{1,5}$/.test(String(emulador || ''))) motivos.push('el emulador debe llevar puerto (por ejemplo 127.0.0.1:9099)');
  if (env.GOOGLE_APPLICATION_CREDENTIALS) motivos.push('GOOGLE_APPLICATION_CREDENTIALS está definida: hay una credencial real en el entorno');
  for (const v of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT']) {
    if (env[v] && !String(env[v]).startsWith('demo-')) motivos.push(`${v}=${env[v]} apunta a un proyecto real`);
  }
  return motivos;
};

const leerArgumentos = (argv) => {
  const salida = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) salida[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  }
  return salida;
};

const postJson = async (url, cuerpo, cabeceras = {}) => {
  const respuesta = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...cabeceras }, body: JSON.stringify(cuerpo) });
  const json = await respuesta.json().catch(() => ({}));
  return { ok: respuesta.ok, json };
};

const principal = async () => {
  const args = leerArgumentos(process.argv.slice(2));
  const proyecto = process.env.WEE_EMULADOR_PROYECTO || PROYECTO_POR_DEFECTO;
  const emulador = process.env.FIREBASE_AUTH_EMULATOR_HOST || EMULADOR_POR_DEFECTO;
  const motivos = motivosParaNoUsar({ proyecto, emulador, env: process.env });
  if (motivos.length) {
    console.error('✘ No se hace nada:');
    for (const m of motivos) console.error(`  · ${m}`);
    process.exit(1);
  }
  const email = args.email;
  const clave = args.password;
  if (!email || !clave || clave === 'true') {
    console.error('Uso: node scripts/admin-local.mjs --email <correo> --password <clave de 6 o más caracteres>');
    process.exit(2);
  }

  const base = `http://${emulador}`;
  try {
    await fetch(`${base}/`);
  } catch {
    console.error(`✘ No se alcanza el emulador de Auth en ${emulador}. Inícialo con «npm run functions:emulator» (desde la raíz del repositorio) y vuelve a intentarlo.`);
    process.exit(1);
  }

  let { ok, json } = await postJson(`${base}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulador`, { email, password: clave, returnSecureToken: true });
  if (!ok && json?.error?.message === 'EMAIL_EXISTS') {
    ({ ok, json } = await postJson(`${base}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulador`, { email, password: clave, returnSecureToken: true }));
  }
  if (!ok || !json.localId) {
    console.error(`✘ No se pudo crear ni autenticar al usuario en el emulador (${json?.error?.message ?? 'sin detalle'}).`);
    process.exit(1);
  }

  const claim = await postJson(
    `${base}/identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(proyecto)}/accounts:update`,
    { localId: json.localId, customAttributes: JSON.stringify({ admin: true }) },
    { authorization: 'Bearer owner' },
  );
  if (!claim.ok) {
    console.error(`✘ El emulador no aceptó el claim (${claim.json?.error?.message ?? 'sin detalle'}).`);
    process.exit(1);
  }
  console.log(`✔ ${email} (uid ${json.localId}) tiene el claim admin SOLO en el emulador de Auth del proyecto ${proyecto}.`);
  console.log('  Entra en la consola con ese correo (si tenías sesión abierta con él, ciérrala y vuelve a entrar).');
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) principal();
