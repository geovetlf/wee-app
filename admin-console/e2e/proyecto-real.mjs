#!/usr/bin/env node
/*
 * LO QUE LOS EMULADORES NO PUEDEN DEMOSTRAR, CONTRA UN PROYECTO FIREBASE DE PRUEBAS REAL.
 *
 *   node admin-console/e2e/proyecto-real.mjs                 Solo enseña el plan. No abre ninguna conexión.
 *   node admin-console/e2e/proyecto-real.mjs --autoprueba    Comprueba este propio arnés contra emuladores demo-*.
 *   node admin-console/e2e/proyecto-real.mjs --ejecutar --proyecto <id> --confirmo <id> [--url <base>] [--intentos 20] [--esperar-caducidad]
 *
 * `--ejecutar` CREA CUENTAS DE PRUEBA CON CLAIMS DE ADMINISTRACIÓN en ese proyecto, las deshabilita, les cambia el rol y
 * las borra al terminar. Por eso se niega con `get-wee`, con `wee-dev-geovet`, con cualquier nombre que no diga que es de
 * pruebas, y si la credencial es de otro proyecto. Ejecutarlo es decisión de la persona dueña; hasta entonces, nada de lo
 * que aquí se comprueba está demostrado en Firebase real.
 *
 * Variables para `--ejecutar`: GOOGLE_APPLICATION_CREDENTIALS (cuenta de servicio DEL PROYECTO DE PRUEBAS) y
 * WEE_PRUEBA_API_KEY (clave web de ese proyecto). Ni contraseñas ni tokens se imprimen ni se guardan.
 * Sin `--url`, la callable corre en este proceso contra Auth y Firestore reales; con `--url` se llama a la desplegada.
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const args = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const bandera = (n) => args.includes(`--${n}`);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export const PROHIBIDOS = ['get-wee', 'wee-dev-geovet'];
const VARIABLES_DE_EMULADOR = ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST', 'FUNCTIONS_EMULATOR', 'FIREBASE_DEBUG_MODE', 'FIREBASE_DEBUG_FEATURES'];

/** Los motivos para no tocar nada. Puro, para poder comprobarlo sin red. */
export const motivosParaNoEjecutar = ({ proyecto, confirmo, env, proyectoDeLaCredencial }) => {
  const m = [];
  if (!proyecto) m.push('falta --proyecto');
  if (proyecto && confirmo !== proyecto) m.push('--confirmo tiene que repetir exactamente --proyecto');
  if (PROHIBIDOS.includes(proyecto)) m.push(`${proyecto} está prohibido: no es un proyecto de pruebas`);
  if (proyecto && !/(^|-)(prueba|pruebas|test|qa|staging|sandbox)(-|$)/.test(proyecto)) m.push('el nombre del proyecto no dice que sea de pruebas');
  if (proyecto?.startsWith('demo-')) m.push('un proyecto demo-* no existe en Firebase real: no demostraría nada');
  if (!env.GOOGLE_APPLICATION_CREDENTIALS) m.push('falta GOOGLE_APPLICATION_CREDENTIALS');
  if (!env.WEE_PRUEBA_API_KEY) m.push('falta WEE_PRUEBA_API_KEY');
  if (env.GOOGLE_APPLICATION_CREDENTIALS && proyectoDeLaCredencial !== proyecto) m.push('la credencial no es de ese proyecto');
  for (const v of VARIABLES_DE_EMULADOR) if (env[v]) m.push(`${v} está definida: esto ya no sería Firebase real`);
  return m;
};

const PLAN = [
  'R1  token real emitido por Firebase → la callable lo acepta (la firma buena se acepta).',
  'R2  tokens forjados con claims de owner → 401 (firma con otra clave, kid inventado, alg none, HS256 con el certificado).',
  'R3  cuenta normal → 403, también enviando rol y admin en los datos.',
  'R4  cambiar weeRole con el token antiguo vigente → surte efecto en la siguiente llamada.',
  'R5  quitar admin con el token antiguo vigente → 403 en la siguiente llamada.',
  'R6  deshabilitar la cuenta con el token vigente → rechazada en la siguiente llamada; el refresco tampoco funciona.',
  'R7  revocar sesiones con el token vigente → rechazada; el refresco falla; un inicio nuevo vuelve a entrar.',
  'R8  los rechazos constan en adminAudit.',
  'R9  enumeración: misma respuesta con cuenta existente e inexistente; createAuthUri no dice si existe; estado de la protección.',
  'R10 límite de intentos: número de contraseñas erróneas hasta TOO_MANY_ATTEMPTS_TRY_LATER (no probado hasta ejecutarlo).',
  'R11 (--esperar-caducidad) un token real caducado → 401. Tarda más de una hora.',
  'R12 (--url) CORS observado desde un origen ajeno. Se informa; no aprueba ni suspende.',
];

/* ── Autoprueba: el arnés contra emuladores, con otros puertos ─────────────── */
const lanzarAutoprueba = async () => {
  const PROYECTO = 'demo-wee-proyecto-real';
  const { buscarJava21, secretLocalVacio } = await import(pathToFileURL(path.join(RAIZ, 'scripts/emulators.mjs')).href);
  const env = { ...process.env };
  for (const k of ['GOOGLE_APPLICATION_CREDENTIALS', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT']) delete env[k];
  const java = buscarJava21(process.platform === 'win32');
  if (!java.listo) { console.error('✘ Hace falta Java 21 o superior.'); process.exit(2); }
  if (java.home) { env.PATH = `${path.join(java.home, 'bin')}${path.delimiter}${env.PATH || ''}`; env.JAVA_HOME = java.home; }
  if (!bandera('sin-compilar')) {
    const npm = spawnSync('npm --prefix functions run build', { cwd: RAIZ, env, shell: true, encoding: 'utf8' });
    if (npm.status !== 0) { console.error(`✘ La compilación falló:\n${npm.stdout}${npm.stderr}`); process.exit(2); }
  }
  const secretos = path.join(RAIZ, 'functions/.secret.local');
  if (!fs.existsSync(secretos)) fs.writeFileSync(secretos, secretLocalVacio());
  const COPIA = 'firebase.proyecto-real.temporal.json';
  const copia = path.join(RAIZ, COPIA);
  if (fs.existsSync(copia)) { console.error(`✘ Ya existe ${COPIA}`); process.exit(2); }
  const base = JSON.parse(fs.readFileSync(path.join(RAIZ, 'firebase.json'), 'utf8'));
  fs.writeFileSync(copia, JSON.stringify({ firestore: base.firestore, emulators: {
    auth: { host: '127.0.0.1', port: 39099 }, firestore: { host: '127.0.0.1', port: 38080, websocketPort: 39150 },
    hub: { host: '127.0.0.1', port: 34400 }, logging: { host: '127.0.0.1', port: 34500 }, ui: { enabled: false }, singleProjectMode: false,
  } }, null, 2));
  const npmRaiz = spawnSync('npm root -g', { encoding: 'utf8', shell: true });
  const js = path.join(String(npmRaiz.stdout || '').trim(), 'firebase-tools', 'lib', 'bin', 'firebase.js');
  const lanzador = fs.existsSync(js) ? [process.execPath, js] : ['firebase'];
  const hijo = spawn(lanzador[0], [...lanzador.slice(1), 'emulators:exec', '--config', COPIA, '--only', 'auth,firestore', '--project', PROYECTO, 'node admin-console/e2e/proyecto-real.mjs --dentro-autoprueba'], { cwd: RAIZ, env });
  let salida = '';
  const mostrar = (d) => { const t = String(d); salida += t; if (/(^|\n)(✔|✘|──|·|Resultado)/.test(t)) process.stdout.write(t); };
  hijo.stdout.on('data', mostrar); hijo.stderr.on('data', mostrar);
  const codigo = await new Promise((r) => hijo.on('close', r));
  fs.rmSync(copia, { force: true });
  if (codigo !== 0 && !/Resultado:/.test(salida)) console.error(salida.split('\n').slice(-30).join('\n'));
  process.exit(codigo ?? 1);
};

/* ── La batería ────────────────────────────────────────────────────────────── */
const bateria = async ({ proyecto, real, apiKey, urlBase }) => {
  let fallos = 0; let pasan = 0;
  const check = (nombre, ok, detalle = '') => { if (ok) pasan++; else fallos++; console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`); };
  const nota = (t) => console.log(`· ${t}`);
  const seccion = (t) => console.log(`\n── ${t}`);
  const noProbatorio = (r) => (real ? r : `${r} [EMULADOR: no prueba Firebase real]`);

  const requerir = createRequire(path.join(RAIZ, 'functions/package.json'));
  const { initializeApp, getApps } = requerir('firebase-admin/app');
  const { getAuth } = requerir('firebase-admin/auth');
  const { getFirestore } = requerir('firebase-admin/firestore');
  if (!getApps().length) initializeApp({ projectId: proyecto });
  const auth = getAuth();

  const emu = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const tk = emu ? `http://${emu}/identitytoolkit.googleapis.com/v1` : 'https://identitytoolkit.googleapis.com/v1';
  const st = emu ? `http://${emu}/securetoken.googleapis.com/v1` : 'https://securetoken.googleapis.com/v1';
  const rest = async (url, cuerpo, formulario = false) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': formulario ? 'application/x-www-form-urlencoded' : 'application/json' }, body: formulario ? new URLSearchParams(cuerpo) : JSON.stringify(cuerpo) });
    return { estado: r.status, json: await r.json().catch(() => ({})) };
  };
  const entrar = (email, password) => rest(`${tk}/accounts:signInWithPassword?key=${apiKey}`, { email, password, returnSecureToken: true });
  const refrescar = (refreshToken) => rest(`${st}/token?key=${apiKey}`, { grant_type: 'refresh_token', refresh_token: refreshToken }, true);

  /* La callable: desplegada, o compilada en este proceso. */
  let servidor; let url = urlBase;
  if (!url) {
    for (const k of ['FUNCTIONS_EMULATOR', 'FIREBASE_DEBUG_MODE', 'FIREBASE_DEBUG_FEATURES']) delete process.env[k];
    const express = requerir('express');
    const lib = requerir(path.join(RAIZ, 'functions/lib/admin/index.js'));
    const ex = express(); ex.use(express.json());
    ex.post('/opsAdmin', (q, s) => lib.opsAdmin(q, s));
    ex.post('/accountsAdmin', (q, s) => lib.accountsAdmin(q, s));
    servidor = http.createServer(ex);
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${servidor.address().port}`;
  }
  const llamar = async (fn, token, data) => {
    const r = await fetch(`${url}/${fn}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) });
    const j = await r.json().catch(() => ({}));
    return { estado: r.status, codigo: j?.error?.status, resultado: j?.result };
  };
  const quienSoy = (t) => llamar('opsAdmin', t, { action: 'quienSoy' });

  const marca = crypto.randomBytes(6).toString('hex');
  const clave = () => crypto.randomBytes(24).toString('base64url');
  const owner = { email: `wee-prueba-owner-${marca}@example.com`, password: clave() };
  const normal = { email: `wee-prueba-normal-${marca}@example.com`, password: clave() };
  const creadas = [];
  try {
    owner.uid = (await auth.createUser({ email: owner.email, password: owner.password })).uid; creadas.push(owner.uid);
    normal.uid = (await auth.createUser({ email: normal.email, password: normal.password })).uid; creadas.push(normal.uid);
    await auth.setCustomUserClaims(owner.uid, { admin: true, weeRole: 'owner' });
    const sesion = async (c) => { const r = await entrar(c.email, c.password); if (!r.json.idToken) throw new Error(`no se pudo iniciar sesión de prueba: ${r.json?.error?.message}`); return r.json; };
    const so = await sesion(owner); const sn = await sesion(normal);

    seccion('R1 · Un token real se acepta');
    const r1 = await quienSoy(so.idToken);
    check(noProbatorio('la callable acepta el token emitido por Auth y dice su rol'), r1.estado === 200 && r1.resultado?.rol === 'owner', `${r1.estado} ${r1.codigo ?? ''}`);

    seccion('R2 · Tokens forjados');
    if (real) {
      const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const certs = await (await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')).json();
      const kid = Object.keys(certs)[0];
      const ahora = Math.floor(Date.now() / 1000);
      const cuerpo = { iss: `https://securetoken.google.com/${proyecto}`, aud: proyecto, auth_time: ahora, user_id: owner.uid, sub: owner.uid, iat: ahora, exp: ahora + 3000, admin: true, weeRole: 'owner', firebase: { identities: {}, sign_in_provider: 'password' } };
      const rs = (h) => { const b = `${b64({ alg: 'RS256', typ: 'JWT', ...h })}.${b64(cuerpo)}`; return `${b}.${crypto.sign('RSA-SHA256', Buffer.from(b), privateKey).toString('base64url')}`; };
      const hs = (() => { const b = `${b64({ alg: 'HS256', typ: 'JWT', kid })}.${b64(cuerpo)}`; return `${b}.${crypto.createHmac('sha256', certs[kid]).update(b).digest('base64url')}`; })();
      for (const [n, t] of [['firma con otra clave y kid real', rs({ kid })], ['kid inventado', rs({ kid: 'inventado' })], ['alg none', `${b64({ alg: 'none', typ: 'JWT', kid })}.${b64(cuerpo)}.`], ['HS256 con el certificado', hs]]) {
        const r = await quienSoy(t);
        check(`rechaza ${n}`, r.estado === 401 && r.resultado === undefined, `${r.estado}`);
      }
    } else nota('R2 no se ejecuta aquí: firebase-admin en modo emulador omite la firma. La versión con SDK real es firma-sdk.mjs.');

    seccion('R3 · Cuenta normal');
    for (const [n, f, d] of [['quienSoy', 'opsAdmin', { action: 'quienSoy' }], ['auditoría', 'opsAdmin', { action: 'auditoria', limit: 5 }], ['cuentas', 'accountsAdmin', { action: 'buscar', uid: owner.uid }], ['con rol y admin en los datos', 'opsAdmin', { action: 'auditoria', rol: 'owner', weeRole: 'owner', admin: true }]]) {
      const r = await llamar(f, sn.idToken, d);
      check(`403 y sin datos: ${n}`, r.estado === 403 && r.resultado === undefined, `${r.estado}`);
    }

    seccion('R4 · Cambio de rol con el token antiguo vigente');
    const antes = await llamar('opsAdmin', so.idToken, { action: 'auditoria', limit: 1 });
    check('control: con rol owner puede leer la auditoría', antes.estado === 200, `${antes.estado} ${antes.codigo ?? ''}`);
    await auth.setCustomUserClaims(owner.uid, { admin: true, weeRole: 'support' });
    const r4 = await llamar('opsAdmin', so.idToken, { action: 'auditoria', limit: 1 });
    check(noProbatorio('rebajado a support: 403 aunque el token siga diciendo owner'), r4.estado === 403 && r4.resultado === undefined, `${r4.estado}`);

    seccion('R5 · Retirada de admin con el token antiguo vigente');
    await auth.setCustomUserClaims(owner.uid, {});
    const r5 = await quienSoy(so.idToken);
    check(noProbatorio('sin claims: 403 aunque el token siga diciendo admin'), r5.estado === 403 && r5.resultado === undefined, `${r5.estado}`);
    await auth.setCustomUserClaims(owner.uid, { admin: true, weeRole: 'owner' });

    seccion('R6 · Baja de la cuenta con el token vigente');
    const r6a = await quienSoy(so.idToken);
    check('control: restaurada, vuelve a entrar con el mismo token', r6a.estado === 200, `${r6a.estado}`);
    await auth.updateUser(owner.uid, { disabled: true });
    const r6 = await quienSoy(so.idToken);
    if (real) check('deshabilitada: rechazada en la siguiente llamada', [401, 403].includes(r6.estado) && r6.resultado === undefined, `${r6.estado}`);
    else nota(`deshabilitada: ${r6.estado}. No discrimina: en modo emulador el SDK comprueba las bajas por su cuenta.`);
    const r6b = await refrescar(so.refreshToken);
    check(noProbatorio('deshabilitada: el refresco no da token'), !r6b.json.id_token, r6b.json?.error?.message ?? '');
    await auth.updateUser(owner.uid, { disabled: false });

    seccion('R7 · Revocación de sesiones con el token vigente');
    await espera(1500);
    await auth.revokeRefreshTokens(owner.uid);
    const r7 = await quienSoy(so.idToken);
    if (real) check('revocada: rechazada en la siguiente llamada', r7.estado === 401 && r7.resultado === undefined, `${r7.estado}`);
    else nota(`revocada: ${r7.estado}. No discrimina: en modo emulador el SDK comprueba la revocación por su cuenta.`);
    const r7b = await refrescar(so.refreshToken);
    /* El emulador de Auth sigue refrescando tras revocar (observado): aquí solo se exige en Firebase real. */
    if (real) check('revocada: el refresco no da token', !r7b.json.id_token, r7b.json?.error?.message ?? '');
    else nota(`revocada: el refresco ${r7b.json.id_token ? 'SIGUE dando token en el emulador' : 'no da token'}. Se exige solo en Firebase real.`);
    await espera(1500);
    const nueva = await sesion(owner);
    const r7c = await quienSoy(nueva.idToken);
    check('un inicio de sesión nuevo vuelve a entrar', r7c.estado === 200, `${r7c.estado}`);

    seccion('R8 · Constancia');
    const docs = await getFirestore().collection('adminAudit').where('actorUid', '==', owner.uid).get();
    const denegados = docs.docs.filter((d) => d.data().resultado === 'denegado').length;
    check(noProbatorio('los rechazos de una cuenta de administración constan en adminAudit'), denegados >= 1, `${denegados} denegados de ${docs.size} entradas`);
    const deNormal = await getFirestore().collection('adminAudit').where('actorUid', '==', normal.uid).get();
    check('una cuenta normal no llega a escribir en adminAudit', deNormal.size === 0, `${deNormal.size}`);

    seccion('R9 · Enumeración');
    const existente = await entrar(normal.email, clave());
    const inexistente = await entrar(`wee-prueba-nadie-${marca}@example.com`, clave());
    const a = existente.json?.error?.message; const b = inexistente.json?.error?.message;
    if (real) check('misma respuesta con cuenta existente e inexistente', a === b && existente.estado === inexistente.estado, `${a} / ${b}`);
    else nota(`existente: ${a}; inexistente: ${b}. El emulador no representa la configuración del proyecto.`);
    const uri = await rest(`${tk}/accounts:createAuthUri?key=${apiKey}`, { identifier: normal.email, continueUri: 'http://localhost' });
    if (real) check('createAuthUri no dice si la cuenta existe', uri.json.registered === undefined, `registered=${uri.json.registered}`);
    else nota(`createAuthUri registered=${uri.json.registered}.`);
    if (real) {
      const cfg = await auth.projectConfigManager().getProjectConfig().catch((e) => ({ error: e.code }));
      nota(`configuración leída: emailPrivacyConfig=${JSON.stringify(cfg.emailPrivacyConfig ?? cfg.error ?? null)}; mfa=${JSON.stringify(cfg.multiFactorConfig?.state ?? null)}`);
    }

    seccion('R10 · Límite de intentos');
    if (real) {
      const tope = Number(opcion('intentos') ?? 20);
      let bloqueo = 0;
      for (let i = 1; i <= tope && !bloqueo; i++) {
        const r = await entrar(normal.email, clave());
        if (/TOO_MANY_ATTEMPTS/.test(r.json?.error?.message ?? '')) bloqueo = i;
      }
      check(`Firebase corta los intentos antes de ${tope}`, bloqueo > 0, bloqueo ? `bloqueo en el intento ${bloqueo}` : 'sin bloqueo observado');
    } else nota('R10 no se ejecuta aquí: el emulador no limita los intentos.');

    if (real && bandera('esperar-caducidad')) {
      seccion('R11 · Caducidad real');
      nota('esperando 62 minutos a que caduque un token real…');
      await espera(62 * 60 * 1000);
      const r = await quienSoy(nueva.idToken);
      check('token real caducado: 401', r.estado === 401, `${r.estado}`);
    }
    if (urlBase) {
      seccion('R12 · CORS observado');
      const r = await fetch(`${urlBase}/opsAdmin`, { method: 'OPTIONS', headers: { origin: 'https://origen-ajeno.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization,content-type' } });
      nota(`OPTIONS desde un origen ajeno: ${r.status}, allow-origin=${r.headers.get('access-control-allow-origin')}`);
    }
  } finally {
    for (const uid of creadas) await auth.deleteUser(uid).catch((e) => console.log(`✘ NO se pudo borrar una cuenta de prueba: ${e.code}`));
    console.log(`\n· cuentas de prueba borradas: ${creadas.length}. Las entradas de adminAudit de esas cuentas quedan en el proyecto de pruebas.`);
    if (servidor) await new Promise((r) => servidor.close(r));
  }
  console.log(`\nResultado: ${pasan} de ${pasan + fallos} comprobaciones${fallos ? `, ${fallos} FALLO(S)` : ''}.${real ? '' : ' Esto es la AUTOPRUEBA del arnés: no demuestra nada de Firebase real.'}`);
  process.exit(fallos ? 1 : 0);
};

/* ── Entrada ───────────────────────────────────────────────────────────────── */
const comoScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (comoScript) {
  if (bandera('dentro-autoprueba')) {
    await bateria({ proyecto: process.env.GCLOUD_PROJECT, real: false, apiKey: 'clave-de-emulador' });
  } else if (bandera('autoprueba')) {
    await lanzarAutoprueba();
  } else if (bandera('ejecutar')) {
    const proyecto = opcion('proyecto');
    let proyectoDeLaCredencial;
    try { proyectoDeLaCredencial = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')).project_id; } catch { /* sin credencial legible: la guarda lo dice */ }
    const motivos = motivosParaNoEjecutar({ proyecto, confirmo: opcion('confirmo'), env: process.env, proyectoDeLaCredencial });
    if (motivos.length) { console.error(`✘ No se ejecuta:\n  · ${motivos.join('\n  · ')}`); process.exit(2); }
    process.env.GCLOUD_PROJECT = proyecto;
    process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: proyecto });
    await bateria({ proyecto, real: true, apiKey: process.env.WEE_PRUEBA_API_KEY, urlBase: opcion('url')?.replace(/\/$/, '') });
  } else {
    console.log('PLAN (no se ha abierto ninguna conexión):\n');
    for (const l of PLAN) console.log(`  ${l}`);
    console.log('\nPara ejecutarlo hace falta un proyecto Firebase de pruebas propio y la decisión de la persona dueña. Ver la cabecera.');
  }
}
