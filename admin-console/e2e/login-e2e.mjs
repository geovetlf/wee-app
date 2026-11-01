#!/usr/bin/env node
/*
 * EL LOGIN DE LA CONSOLA, DE PUNTA A PUNTA: navegador de verdad, SDK de Firebase de verdad, Auth, Functions y Firestore
 * emulados, y las callables compiladas de `functions/lib`.
 *
 *   cd admin-console && npm run test:login        (opcional: --capturas <carpeta>)
 *
 * Lo que hace, y nada más: compila las Functions, escribe una copia temporal de firebase.json con otros puertos (para no
 * pisar a quien tenga los de siempre) y la borra al terminar; levanta los emuladores con un proyecto demo-*, crea cuentas
 * con contraseñas aleatorias de esta ejecución, y conduce Chrome o Edge en una carpeta de perfil nueva por CDP. Ni despliega,
 * ni usa credenciales, ni habla con ningún servicio real; se niega si el entorno apunta a un proyecto real.
 *
 * Lo que NO puede demostrar: el emulador de Functions no comprueba la firma ni la caducidad del token (ver `F`). Por eso
 * la caducidad se prueba además con `onCall` y firebase-admin de verdad en este proceso, donde solo la firma se omite. La
 * firma real solo se puede comprobar contra un proyecto real.
 *
 * Necesita Node 22+, Java 21+, firebase-tools y Chrome o Edge.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CONSOLA = path.resolve(AQUI, '..');
const RAIZ = path.resolve(CONSOLA, '..');
const PROYECTO = 'demo-wee-admin-login';
const COPIA = 'firebase.login-e2e.temporal.json';
const PUERTOS = { auth: 29099, firestore: 28080, functions: 25001, hub: 24400, logging: 24500, websocket: 29150, consola: 25174 };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Fuera de los emuladores: preparar y lanzar ─────────────────────────────── */
const fuera = async () => {
  const { buscarJava21, motivosParaNoArrancar, secretLocalVacio } = await import(pathToFileURL(path.join(RAIZ, 'scripts/emulators.mjs')).href);
  const env = { ...process.env };
  for (const k of ['GOOGLE_APPLICATION_CREDENTIALS', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT']) delete env[k];
  const leerSiExiste = (rel) => { try { return fs.readFileSync(path.join(RAIZ, rel), 'utf8'); } catch { return ''; } };
  const motivos = motivosParaNoArrancar({ proyecto: PROYECTO, env, envLocal: leerSiExiste('functions/.env.local'), secretLocal: leerSiExiste('functions/.secret.local') });
  if (motivos.length) { console.error(`✘ No se arranca:\n  · ${motivos.join('\n  · ')}`); process.exit(2); }
  const java = buscarJava21(process.platform === 'win32');
  if (!java.listo) { console.error('✘ Hace falta Java 21 o superior.'); process.exit(2); }
  if (java.home) { env.PATH = `${path.join(java.home, 'bin')}${path.delimiter}${env.PATH || ''}`; env.JAVA_HOME = java.home; }

  if (!process.argv.includes('--sin-compilar')) {
    console.log('Compilando las Functions…');
    const npm = spawnSync('npm --prefix functions run build', { cwd: RAIZ, env, shell: true, encoding: 'utf8' });
    if (npm.status !== 0) { console.error(`✘ La compilación falló:\n${npm.stdout}${npm.stderr}`); process.exit(2); }
  }

  const secretos = path.join(RAIZ, 'functions/.secret.local');
  if (!fs.existsSync(secretos)) fs.writeFileSync(secretos, secretLocalVacio());

  const copia = path.join(RAIZ, COPIA);
  if (fs.existsSync(copia)) { console.error(`✘ Ya existe ${COPIA}: ¿hay otra ejecución en marcha?`); process.exit(2); }
  const base = JSON.parse(fs.readFileSync(path.join(RAIZ, 'firebase.json'), 'utf8'));
  const emuladores = {
    auth: { host: '127.0.0.1', port: PUERTOS.auth },
    firestore: { host: '127.0.0.1', port: PUERTOS.firestore, websocketPort: PUERTOS.websocket },
    functions: { host: '127.0.0.1', port: PUERTOS.functions },
    hub: { host: '127.0.0.1', port: PUERTOS.hub },
    logging: { host: '127.0.0.1', port: PUERTOS.logging },
    ui: { enabled: false },
    singleProjectMode: false,
  };
  fs.writeFileSync(copia, JSON.stringify({ firestore: base.firestore, functions: base.functions, emulators: emuladores }, null, 2));

  const npmRaiz = spawnSync('npm root -g', { encoding: 'utf8', shell: true });
  const js = path.join(String(npmRaiz.stdout || '').trim(), 'firebase-tools', 'lib', 'bin', 'firebase.js');
  const lanzador = fs.existsSync(js) ? [process.execPath, js] : ['firebase'];
  const propios = process.argv.slice(2).map((a) => `"${a}"`).join(' ');
  const hijo = spawn(lanzador[0], [...lanzador.slice(1), 'emulators:exec', '--config', COPIA, '--only', 'auth,firestore,functions', '--project', PROYECTO, `node admin-console/e2e/login-e2e.mjs --dentro ${propios}`], { cwd: RAIZ, env });
  let salida = '';
  const mostrar = (d) => { const t = String(d); salida += t; if (/^(✔|✘|──|·|Resultado|OBSERVADO)|\n(✔|✘|──|·|Resultado|OBSERVADO)/.test(t)) process.stdout.write(t); };
  hijo.stdout.on('data', mostrar);
  hijo.stderr.on('data', mostrar);
  const codigo = await new Promise((r) => hijo.on('close', r));
  fs.rmSync(copia, { force: true });
  if (codigo !== 0 && !/Resultado:/.test(salida)) console.error(salida.split('\n').slice(-40).join('\n'));
  process.exit(codigo ?? 1);
};

/* ── Un cliente mínimo de CDP ───────────────────────────────────────────────── */
const buscarNavegador = () => [
  process.env.WEE_NAVEGADOR,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && fs.existsSync(p));

const abrirNavegador = async () => {
  const ejecutable = buscarNavegador();
  if (!ejecutable) throw new Error('no hay Chrome ni Edge (WEE_NAVEGADOR)');
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-login-e2e-'));
  const proceso = spawn(ejecutable, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--password-store=basic', 'about:blank'], { stdio: 'ignore' });
  const archivo = path.join(perfil, 'DevToolsActivePort');
  /* En Windows, el archivo puede existir y seguir abierto por el navegador (EBUSY) o a medio escribir. */
  let puerto; let ruta;
  for (let i = 0; i < 150 && !ruta; i++) {
    try { [puerto, ruta] = fs.readFileSync(archivo, 'utf8').split('\n'); } catch { /* todavía no */ }
    if (!ruta) await espera(100);
  }
  if (!ruta) { proceso.kill(); throw new Error('el navegador no abrió su puerto de depuración'); }
  const ws = new WebSocket(`ws://127.0.0.1:${puerto.trim()}${ruta.trim()}`);
  await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
  let siguiente = 0;
  const pendientes = new Map();
  const oyentes = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id) {
      const p = pendientes.get(d.id);
      pendientes.delete(d.id);
      if (d.error) p.mal(new Error(`${p.metodo}: ${d.error.message}`)); else p.ok(d.result);
    } else if (d.sessionId && oyentes.has(d.sessionId)) oyentes.get(d.sessionId)(d.method, d.params);
  };
  const enviar = (metodo, params = {}, sessionId) => new Promise((ok, mal) => {
    const id = ++siguiente;
    pendientes.set(id, { ok, mal, metodo });
    ws.send(JSON.stringify({ id, method: metodo, params, ...(sessionId ? { sessionId } : {}) }));
  });

  /** Una página en un contexto nuevo (otro «navegador»: ni sesión ni almacenamiento compartidos) o en uno dado. */
  const pagina = async (contexto) => {
    const browserContextId = contexto ?? (await enviar('Target.createBrowserContext')).browserContextId;
    const { targetId } = await enviar('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await enviar('Target.attachToTarget', { targetId, flatten: true });
    const peticiones = [];
    const excepciones = [];
    let interceptor = null;
    oyentes.set(sessionId, (metodo, p) => {
      if (metodo === 'Network.requestWillBeSent') peticiones.push({ url: p.request.url, metodo: p.request.method, cuerpo: p.request.postData, cabeceras: p.request.headers, id: p.requestId });
      if (metodo === 'Network.responseReceived') { const r = peticiones.find((x) => x.id === p.requestId && x.metodo !== 'OPTIONS'); if (r) r.estado = p.response.status; }
      if (metodo === 'Runtime.exceptionThrown') excepciones.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text);
      if (metodo === 'Fetch.requestPaused') {
        Promise.resolve(interceptor ? interceptor(p) : undefined).then((accion) => enviar('Fetch.continueRequest', { requestId: p.requestId, ...(accion ?? {}) }, sessionId)).catch(() => undefined);
      }
    });
    const c = (m, params) => enviar(m, params, sessionId);
    await c('Page.enable'); await c('Runtime.enable'); await c('Network.enable');
    const ev = async (js) => {
      const r = await c('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`en la página: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      return r.result.value;
    };
    /* El emulador de Functions carga todo `functions/lib` en el primer uso de cada callable: tarda, sobre todo en frío. */
    const hasta = async (js, que, ms = 90_000) => {
      const fin = Date.now() + ms;
      while (Date.now() < fin) { if (await ev(js).catch(() => false)) return true; await espera(50); }
      const vistas = peticiones.filter((x) => x.metodo === 'POST').map((x) => `${x.url.split('/').pop().split('?')[0]}=${x.estado ?? '…'}`).join(' ');
      throw new Error(`no llegó: ${que}. Peticiones: ${vistas}. Página: ${(await ev('document.body?.innerText ?? ""').catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)}`);
    };
    return {
      contexto: browserContextId, ev, hasta, peticiones, excepciones,
      ir: (url) => c('Page.navigate', { url }),
      /* Una marca que la recarga borra: así nadie lee a tiempo la página anterior, que sigue viva un instante. */
      recargar: async () => {
        await ev('window.__paginaAnterior = true');
        await c('Page.reload');
        await hasta('!window.__paginaAnterior', 'la recarga');
      },
      escribir: async (selector, texto) => {
        await ev(`document.querySelector(${JSON.stringify(selector)}).focus()`);
        await c('Input.insertText', { text: texto });
      },
      intro: async () => {
        await c('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
        await c('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      },
      /* Sin interceptor sigue activo y lo deja pasar todo: desactivarlo con peticiones en pausa las dejaría colgadas. */
      interceptar: async (fn) => { interceptor = fn; if (fn) await c('Fetch.enable', { patterns: [{ urlPattern: '*' }] }); },
      tamano: (ancho, alto) => c('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: false }),
      captura: async (ruta) => fs.writeFileSync(ruta, Buffer.from((await c('Page.captureScreenshot', { format: 'png' })).data, 'base64')),
      callables: () => peticiones.filter((x) => x.metodo === 'POST' && x.url.includes(`/${PROYECTO}/us-central1/`)).map((x) => `${x.url.split('/').pop()}.${JSON.parse(x.cuerpo ?? '{}').data?.action}`),
      contar: (trozo) => peticiones.filter((x) => x.metodo === 'POST' && x.url.includes(trozo)).length,
      cerrar: () => enviar('Target.closeTarget', { targetId }),
    };
  };
  return {
    pagina,
    cerrar: async () => {
      await enviar('Browser.close').catch(() => undefined);
      await Promise.race([new Promise((ok) => proceso.once('exit', ok)), espera(5_000)]);
      proceso.kill();
      /* Los procesos hijos sueltan los archivos del perfil un poco después. */
      for (let i = 0; i < 40 && fs.existsSync(perfil); i++) {
        try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { await espera(250); }
      }
      if (fs.existsSync(perfil)) console.log(`OBSERVADO: no se pudo borrar el perfil temporal ${perfil}`);
    },
  };
};

/* ── Dentro de los emuladores: las pruebas ──────────────────────────────────── */
const dentro = async () => {
  const hub = process.env.FIREBASE_EMULATOR_HUB;
  if (!hub || !process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== PROYECTO) { console.log('✘ solo dentro de `emulators:exec`, con el proyecto de demostración'); process.exit(2); }
  const iCapturas = process.argv.indexOf('--capturas');
  const capturas = iCapturas > 0 ? process.argv[iCapturas + 1] : null;
  if (capturas) fs.mkdirSync(capturas, { recursive: true });

  let fallos = 0; let n = 0;
  const check = (nombre, cond, detalle = '') => { n++; if (!cond) fallos++; console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${detalle ? ` — ${detalle}` : ''}`); };
  const seccion = (t) => console.log(`── ${t}`);
  const observado = (t) => console.log(`OBSERVADO: ${t}`);

  const AUTH = `http://127.0.0.1:${PUERTOS.auth}`;
  const FN = `http://127.0.0.1:${PUERTOS.functions}/${PROYECTO}/us-central1`;
  const CLAVE_API = 'emulador-sin-clave';
  const post = async (url, cuerpo, cabeceras = {}) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...cabeceras }, body: JSON.stringify(cuerpo) });
    return { estado: r.status, json: await r.json().catch(() => ({})) };
  };
  const crearCuenta = async (prefijo, claims) => {
    const email = `${prefijo}-${randomBytes(4).toString('hex')}@admin-login.test`;
    const clave = randomBytes(18).toString('base64url');
    const r = await post(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CLAVE_API}`, { email, password: clave, returnSecureToken: true });
    if (!r.json.localId) throw new Error(`no se creó ${prefijo}`);
    if (claims) {
      const u = await post(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROYECTO}/accounts:update`, { localId: r.json.localId, customAttributes: JSON.stringify(claims) }, { authorization: 'Bearer owner' });
      if (u.estado !== 200) throw new Error('claim no aceptado');
    }
    return { email, clave, uid: r.json.localId };
  };
  const tokenDe = async (c) => (await post(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CLAVE_API}`, { email: c.email, password: c.clave, returnSecureToken: true })).json.idToken;
  const llamar = (callable, datos, token) => post(`${FN}/${callable}`, { data: datos }, token ? { authorization: `Bearer ${token}` } : {});
  const jwt = (payload) => `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`;
  const cargaDe = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

  const owner = await crearCuenta('owner', { admin: true, weeRole: 'owner' });
  const adminSinRol = await crearCuenta('adminsinrol', { admin: true });
  const normal = await crearCuenta('normal');
  const deshabilitada = await crearCuenta('deshabilitada', { admin: true, weeRole: 'owner' });

  /*
   * El bundle de producción, no el servidor de desarrollo: es lo que se entregaría, y sin el doble efecto de StrictMode.
   * Las variables van en el proceso: mandan sobre cualquier archivo de entorno local. El resultado va a una carpeta temporal.
   */
  const entornoVite = { ...process.env, VITE_FIREBASE_PROJECT_ID: PROYECTO, VITE_AUTH_EMULATOR_HOST: '127.0.0.1', VITE_AUTH_EMULATOR_PORT: String(PUERTOS.auth), VITE_FUNCTIONS_EMULATOR_HOST: '127.0.0.1', VITE_FUNCTIONS_EMULATOR_PORT: String(PUERTOS.functions) };
  const binVite = path.join(CONSOLA, 'node_modules/vite/bin/vite.js');
  const salidaVite = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-login-e2e-dist-'));
  const construido = spawnSync(process.execPath, [binVite, 'build', '--outDir', salidaVite, '--emptyOutDir'], { cwd: CONSOLA, env: entornoVite, encoding: 'utf8' });
  if (construido.status !== 0) { console.log(`✘ El build de la consola falló:\n${construido.stdout}${construido.stderr}`); process.exit(1); }
  /* `--dev` usa el servidor de desarrollo (lo que se abre con `npm run dev`), con el doble efecto de StrictMode. */
  const enDesarrollo = process.argv.includes('--dev');
  const vite = spawn(process.execPath, enDesarrollo ? [binVite, '--port', String(PUERTOS.consola), '--strictPort'] : [binVite, 'preview', '--outDir', salidaVite, '--port', String(PUERTOS.consola), '--strictPort'], { cwd: CONSOLA, stdio: 'ignore', env: entornoVite });
  const URL_CONSOLA = `http://127.0.0.1:${PUERTOS.consola}/`;
  for (let i = 0; i < 150; i++) { try { await fetch(URL_CONSOLA); break; } catch { await espera(200); } }

  const navegador = await abrirNavegador().catch((e) => {
    vite.kill();
    console.log(`✘ La batería no arrancó: ${e.message}`);
    console.log('Resultado: 0 de 0 comprobaciones, 1 FALLO(S).');
    process.exit(1);
  });
  const CORREO = 'input[autocomplete="username"]';
  const CLAVE = 'input[autocomplete="current-password"]';
  const FORM = 'document.querySelector("form.formulario")';
  const hayLogin = `!!${FORM} && document.body.innerText.includes('Entrar a la consola')`;
  const hayMenu = '!!document.querySelector("nav")';
  const textoDe = (p) => p.ev('document.body.innerText');
  const entrar = async (p, c) => {
    await p.hasta(hayLogin, 'el formulario');
    await p.escribir(CORREO, c.email);
    await p.escribir(CLAVE, c.clave);
    await p.intro();
  };
  /** Ninguna huella de la contraseña, ni rastro de sesión en almacenamiento duradero. */
  const almacenes = (p) => p.ev(`(async () => {
    const volcar = (s) => Object.fromEntries(Object.keys(s).map((k) => [k, s.getItem(k)]));
    const idb = {};
    for (const { name } of await indexedDB.databases()) {
      const db = await new Promise((ok, mal) => { const r = indexedDB.open(name); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
      for (const t of db.objectStoreNames) idb[name + '/' + t] = await new Promise((ok) => { const r = db.transaction(t).objectStore(t).getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ok([]); });
      db.close();
    }
    return { local: volcar(localStorage), sesion: volcar(sessionStorage), idb, cookies: document.cookie };
  })()`);

  /*
   * `onCall` y firebase-admin de verdad, con el código compilado, en este proceso: aquí no está el atajo del emulador de
   * Functions (`skipTokenVerification`), que no comprueba la caducidad y convierte un token roto en una sesión vacía (403).
   * firebase-admin sigue en modo emulador, así que lo único que omite es la firma.
   */
  const requerir = createRequire(path.join(RAIZ, 'functions/package.json'));
  for (const k of ['FIREBASE_DEBUG_FEATURES', 'FIREBASE_DEBUG_MODE', 'FUNCTIONS_EMULATOR']) delete process.env[k];
  const { initializeApp, getApps } = requerir('firebase-admin/app');
  if (!getApps().length) initializeApp({ projectId: PROYECTO });
  const express = requerir('express');
  const { opsAdmin } = requerir(path.join(RAIZ, 'functions/lib/admin/index.js'));
  const appReal = express();
  appReal.use(express.json());
  appReal.post('/', opsAdmin);
  appReal.options('/', opsAdmin);
  const servidorReal = await new Promise((ok) => { const s = appReal.listen(0, '127.0.0.1', () => ok(s)); });
  const URL_REAL = `http://127.0.0.1:${servidorReal.address().port}/`;

  try {
    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('6 · Sin sesión');
    {
      const p = await navegador.pagina();
      await p.ir(`${URL_CONSOLA}#/auditoria`);
      await p.hasta(hayLogin, 'el formulario');
      check('sin sesión, una ruta administrativa directa enseña el formulario y ningún menú', !(await p.ev(hayMenu)));
      check('y no sale ninguna petición a las callables', p.callables().length === 0, p.callables().join(','));
      check('el formulario solo tiene correo y contraseña', await p.ev(`document.querySelectorAll('form input').length === 2 && !!document.querySelector('input[type=email]') && !!document.querySelector('input[type=password]')`));
      await p.cerrar();
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('3 · Correo inválido o campos vacíos');
    {
      const p = await navegador.pagina();
      await p.ir(URL_CONSOLA);
      await p.hasta(hayLogin, 'el formulario');
      await p.intro();
      await p.ev(`${FORM}.requestSubmit()`);
      await p.hasta(`document.body.innerText.includes('Escribe tu correo.') && document.body.innerText.includes('Escribe tu contraseña.')`, 'los avisos de vacío');
      check('vacío: pide los dos campos y Auth no recibe nada', p.contar('accounts:signInWithPassword') === 0);
      await p.escribir(CORREO, 'esto-no-es-un-correo');
      await p.escribir(CLAVE, 'cualquiera');
      await p.intro();
      await p.hasta(`document.body.innerText.includes('Escribe un correo válido')`, 'el aviso de formato');
      check('correo mal formado: lo dice y Auth no recibe nada', p.contar('accounts:signInWithPassword') === 0);
      await p.cerrar();
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('2 · Contraseña incorrecta');
    {
      const p = await navegador.pagina();
      await p.ir(URL_CONSOLA);
      await entrar(p, { email: owner.email, clave: `${owner.clave}-mal` });
      await p.hasta(`document.querySelector('[role=alert]')?.innerText.includes('Correo o contraseña incorrectos')`, 'el aviso de credenciales');
      check('contraseña incorrecta: un aviso, sin menú y sin callables', !(await p.ev(hayMenu)) && p.callables().length === 0);
      const a = await p.ev(`document.querySelector('[role=alert]').innerText`);
      const inexistente = await navegador.pagina();
      await inexistente.ir(URL_CONSOLA);
      await entrar(inexistente, { email: `nadie-${randomBytes(4).toString('hex')}@admin-login.test`, clave: 'lo-que-sea' });
      await inexistente.hasta(`!!document.querySelector('[role=alert]')`, 'el aviso');
      check('una cuenta que no existe recibe exactamente el mismo mensaje', (await inexistente.ev(`document.querySelector('[role=alert]').innerText`)) === a);
      await inexistente.cerrar();
      check('la contraseña no aparece en la página ni en la URL', !(await textoDe(p)).includes(owner.clave) && !(await p.ev('location.href')).includes(owner.clave));
      await p.cerrar();
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('4 · Doble envío mientras se procesa');
    {
      const p = await navegador.pagina();
      await p.ir(URL_CONSOLA);
      await p.hasta(hayLogin, 'el formulario');
      await p.escribir(CORREO, owner.email);
      await p.escribir(CLAVE, owner.clave);
      let liberar = () => undefined;
      const retenida = new Promise((r) => { liberar = r; });
      await p.interceptar(async (e) => { if (e.request.url.includes('accounts:signInWithPassword') && e.request.method === 'POST') await retenida; });
      await p.ev(`(() => { const f = ${FORM}; f.requestSubmit(); f.requestSubmit(); f.requestSubmit(); })()`);
      await p.hasta(`document.querySelector('button[type=submit]').disabled`, 'el botón ocupado');
      await p.intro();
      await p.ev(`${FORM}.requestSubmit()`);
      check('con la petición en vuelo, el botón dice «Entrando…» y el formulario está ocupado', await p.ev(`document.querySelector('button[type=submit]').innerText.includes('Entrando') && ${FORM}.getAttribute('aria-busy') === 'true'`));
      await espera(300);
      liberar();
      await p.hasta(hayMenu, 'el menú');
      await p.interceptar(null);
      check('cinco envíos, una sola petición a Auth', p.contar('accounts:signInWithPassword') === 1, `${p.contar('accounts:signInWithPassword')}`);
      await p.cerrar();
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    let contextoConSesion;
    seccion('1 · Login correcto · 10 · Sin datos mientras carga · 9 · Persistencia y cierre');
    {
      const p = await navegador.pagina();
      contextoConSesion = p.contexto;
      await p.ir(`${URL_CONSOLA}#/auditoria`);
      await p.hasta(hayLogin, 'el formulario');
      await p.escribir(CORREO, owner.email);
      await p.escribir(CLAVE, owner.clave);
      /* La comprobación de permiso se queda colgada: entre tener sesión y confirmar el permiso no debe verse nada. */
      let soltar = () => undefined;
      const colgada = new Promise((r) => { soltar = r; });
      await p.interceptar(async (e) => { if (e.request.url.endsWith('/engineAdmin') && e.request.method === 'POST') await colgada; });
      await p.intro();
      await p.hasta(`document.body.innerText.includes('Comprobando permisos')`, 'la comprobación');
      check('10) autenticada pero sin confirmar el permiso: ni menú, ni vistas, ni botón de salir', !(await p.ev(hayMenu)) && !(await textoDe(p)).includes('Cerrar sesión'));
      check('10) y mientras tanto solo se ha pedido la comprobación', p.callables().length > 0 && p.callables().every((x) => x === 'engineAdmin.status') && (enDesarrollo || p.callables().length === 1), p.callables().join());
      await espera(150);
      soltar();
      await p.hasta(hayMenu, 'el menú');
      await p.interceptar(null);
      check('1) entra de verdad: menú y correo de la sesión', (await textoDe(p)).includes(owner.email));
      await p.hasta(`document.body.innerText.includes('Rol: owner')`, 'el rol que dice el servidor');
      check('1) el rol lo dice el servidor (quienSoy), y la ruta directa a Auditoría abre', await p.ev(`document.querySelector('a[aria-current=page]')?.getAttribute('href') === '#/auditoria'`));
      const entrada = p.peticiones.find((x) => x.url.endsWith('/engineAdmin') && x.metodo === 'POST');
      check('1) el SDK adjunta el token a la callable', /^Bearer .+/.test(entrada?.cabeceras?.Authorization ?? entrada?.cabeceras?.authorization ?? ''));
      check('1) el cuerpo de la petición no lleva rol ni permiso alguno', !/weeRole|"admin"|"rol"|permisos/.test(entrada?.cuerpo ?? ''), entrada?.cuerpo);

      const a = await almacenes(p);
      const todo = JSON.stringify(a);
      check('9) la contraseña no está en ningún almacén del navegador', !todo.includes(owner.clave));
      check('9) la sesión de Firebase está en sessionStorage y solo ahí', Object.keys(a.sesion).some((k) => k.startsWith('firebase:authUser'))
        && !Object.keys(a.local).some((k) => k.startsWith('firebase:')) && !/authUser|refreshToken|accessToken/.test(JSON.stringify(a.idb)) && a.cookies === '', `localStorage: ${Object.keys(a.local).join(',') || 'vacío'}; IndexedDB: ${Object.keys(a.idb).join(',') || 'vacío'}`);

      /* Recarga con la comprobación de Auth retenida: mientras el SDK valida la sesión guardada, nada. */
      let soltarAuth = () => undefined;
      const authColgada = new Promise((r) => { soltarAuth = r; });
      await p.interceptar(async (e) => { if (e.request.url.includes('accounts:lookup')) await authColgada; });
      const antes = p.callables().length;
      await p.recargar();
      await p.hasta(`document.querySelector('[role=status]')?.innerText.includes('Cargando')`, 'el estado de carga');
      await espera(300);
      check('10) al recargar, mientras Auth valida la sesión: «Cargando», ni menú, ni formulario, ni callables', !(await p.ev(hayMenu)) && !(await p.ev(hayLogin)) && p.callables().length === antes);
      soltarAuth();
      await p.hasta(hayMenu, 'el menú tras recargar');
      await p.interceptar(null);
      check('9) la sesión sobrevive a la recarga, sin volver a escribir la contraseña', p.contar('accounts:signInWithPassword') === 1);

      const otro = await navegador.pagina();
      await otro.ir(URL_CONSOLA);
      await otro.hasta(hayLogin, 'el formulario');
      check('9) otro perfil no hereda la sesión', otro.callables().length === 0);
      await otro.cerrar();
      const otraPestana = await navegador.pagina(contextoConSesion);
      await otraPestana.ir(URL_CONSOLA);
      await otraPestana.hasta(hayLogin, 'el formulario');
      check('9) otra pestaña del mismo navegador tampoco: la sesión es de su pestaña', otraPestana.callables().length === 0);
      await otraPestana.cerrar();

      await p.ev(`[...document.querySelectorAll('button')].find((b) => b.innerText.includes('Cerrar sesión')).click()`);
      await p.hasta(hayLogin, 'el formulario tras salir');
      const b = await almacenes(p);
      check('9) cerrar sesión: formulario, sin menú y sin rastro de la sesión en el navegador', !(await p.ev(hayMenu)) && !/firebase:authUser|refreshToken|accessToken/.test(JSON.stringify(b)));
      const tras = p.callables().length;
      await p.recargar();
      await espera(300);
      await p.hasta(hayLogin, 'el formulario tras recargar');
      check('9) y al recargar sigue fuera, sin callables', p.callables().length === tras);
      check('sin excepciones en la página durante todo el recorrido', p.excepciones.length === 0, p.excepciones.join(' | ').slice(0, 300));
      await p.cerrar();
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('5 · Autenticado sin rol administrativo');
    {
      const p = await navegador.pagina();
      await p.ir(`${URL_CONSOLA}#/cuentas`);
      await entrar(p, normal);
      await p.hasta(`document.body.innerText.includes('Acceso denegado')`, 'el acceso denegado');
      const respuesta = p.peticiones.find((x) => x.url.endsWith('/engineAdmin') && x.metodo === 'POST');
      check('entrar no es tener permiso: el servidor responde 403 y la consola dice «Acceso denegado»', respuesta?.estado === 403, String(respuesta?.estado));
      check('sin menú, sin secciones y solo la comprobación pedida', !(await p.ev(hayMenu)) && p.callables().length > 0 && p.callables().every((x) => x === 'engineAdmin.status'), p.callables().join());
      await p.ev(`document.querySelector('[role=alert] button').click()`);
      await p.hasta(hayLogin, 'el formulario');
      check('y puede salir: vuelve al formulario', true);
      await p.cerrar();

      const r = await navegador.pagina();
      await r.ir(`${URL_CONSOLA}#/auditoria`);
      await entrar(r, adminSinRol);
      await r.hasta(hayMenu, 'el menú');
      await r.hasta(`[...document.querySelectorAll('nav a')].length === 4`, 'las cuatro secciones');
      await espera(500);
      check('administración sin rol: la ruta a Auditoría no se abre, ni se pide', !r.callables().includes('opsAdmin.auditoria') && (await r.ev(`location.hash`)) === '#/auditoria' && !(await r.ev(`[...document.querySelectorAll('nav a')].some((a) => a.getAttribute('href') === '#/auditoria')`)));
      await r.cerrar();
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('7 · Token inválido o caducado, en el navegador');
    {
      const p = await navegador.pagina();
      await p.ir(URL_CONSOLA);
      await entrar(p, owner);
      await p.hasta(hayMenu, 'el menú');
      /* A mitad de uso, la callable va al `onCall` real con un token roto: el servidor decide, la consola obedece. */
      await p.interceptar(async (e) => {
        if (!e.request.url.includes('/us-central1/')) return undefined;
        if (e.request.method !== 'POST') return { url: URL_REAL };
        const cabeceras = Object.entries(e.request.headers).filter(([k]) => k.toLowerCase() !== 'authorization').map(([name, value]) => ({ name, value }));
        return { url: URL_REAL, headers: [...cabeceras, { name: 'Authorization', value: 'Bearer token-roto' }] };
      });
      await p.ev(`location.hash = '#/credits'`);
      await p.hasta(`document.body.innerText.includes('La sesión ya no es válida')`, 'la petición de volver a entrar');
      await p.interceptar(null);
      check('token inválido a mitad de uso: el servidor da 401 y la consola se sustituye por «vuelve a entrar»', p.peticiones.some((x) => x.estado === 401) && !(await p.ev(hayMenu)));
      check('los datos que ya se veían desaparecen', !(await textoDe(p)).includes('Panorama'));
      await p.ev(`document.querySelector('[role=alert] button').click()`);
      await p.hasta(hayLogin, 'el formulario');
      check('y de ahí al formulario, sin sesión', !JSON.stringify(await almacenes(p)).includes('firebase:authUser'));
      await p.cerrar();

      const q = await navegador.pagina();
      await q.ir(URL_CONSOLA);
      await entrar(q, owner);
      await q.hasta(hayMenu, 'el menú');
      const manipular = (cambios) => q.ev(`(() => { const k = Object.keys(sessionStorage).find((x) => x.startsWith('firebase:authUser')); const u = JSON.parse(sessionStorage.getItem(k)); ${cambios}; sessionStorage.setItem(k, JSON.stringify(u)); })()`);
      const tokenAntes = await q.ev(`JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find((x) => x.startsWith('firebase:authUser')))).stsTokenManager.accessToken`);
      await manipular('u.stsTokenManager.expirationTime = 1');
      const renovacionesAntes = q.contar('/token');
      await q.recargar();
      await q.hasta(hayMenu, 'el menú tras caducar el token');
      const tokenDespues = await q.ev(`JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find((x) => x.startsWith('firebase:authUser')))).stsTokenManager.accessToken`);
      const caducidad = await q.ev(`JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find((x) => x.startsWith('firebase:authUser')))).stsTokenManager.expirationTime`);
      check('token caducado con un refresco válido: el SDK lo renueva solo y sigue dentro', q.contar('/token') > renovacionesAntes && caducidad > Date.now() + 60_000, `renovaciones ${q.contar('/token') - renovacionesAntes}, caduca en ${Math.round((caducidad - Date.now()) / 60_000)} min, token distinto: ${tokenDespues !== tokenAntes}`);
      await manipular(`u.stsTokenManager.expirationTime = 1; u.stsTokenManager.refreshToken = 'refresco-invalido'`);
      const antes = q.callables().length;
      await q.recargar();
      await q.hasta(hayLogin, 'el formulario');
      check('token caducado sin refresco válido: vuelve al formulario sin pedir datos', q.callables().length === antes && !(await q.ev(hayMenu)));
      await q.cerrar();

      const v = await navegador.pagina();
      await v.ir(URL_CONSOLA);
      await entrar(v, owner);
      await v.hasta(hayMenu, 'el menú');
      await v.ev(`(() => { const k = Object.keys(sessionStorage).find((x) => x.startsWith('firebase:authUser')); const u = JSON.parse(sessionStorage.getItem(k)); u.stsTokenManager.accessToken = 'token-roto'; sessionStorage.setItem(k, JSON.stringify(u)); })()`);
      const antesV = v.callables().length;
      await v.recargar();
      await v.hasta(hayLogin, 'el formulario');
      check('token guardado manipulado: Auth lo rechaza al recargar y no sale ninguna callable', v.callables().length === antesV);
      await v.cerrar();
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('8 · El servidor, sin consola de por medio');
    {
      const tNormal = await tokenDe(normal);
      const tSinRol = await tokenDe(adminSinRol);
      const tOwner = await tokenDe(owner);
      const PROTEGIDAS = [
        ['engineAdmin', { action: 'status' }], ['creditsAdmin', { action: 'stats' }], ['creditsAdmin', { action: 'balance', userId: owner.uid }],
        ['moderationAdmin', { action: 'list', status: 'RECEIVED' }], ['opsAdmin', { action: 'quienSoy' }], ['opsAdmin', { action: 'auditoria' }],
        ['opsAdmin', { action: 'trabajos' }], ['accountsAdmin', { action: 'buscar', uid: owner.uid }],
      ];
      const ESCRITURAS = [['engineAdmin', { action: 'setSettings', iaDetenida: true }], ['creditsAdmin', { action: 'grant', userId: normal.uid, amount: 999 }]];

      const sinToken = await Promise.all([...PROTEGIDAS, ...ESCRITURAS].map(([c, d]) => llamar(c, d)));
      check(`sin sesión: 401 en las ${sinToken.length} operaciones`, sinToken.every((r) => r.estado === 401), sinToken.map((r) => r.estado).join(','));
      /* El emulador de Functions da 401 o 403 según se pueda decodificar; el 401 exacto se exige en F, con `onCall` real. */
      const conBasura = await Promise.all(['basura', 'a.b.c', 'a.bm90IGpzb24.c'].map((t) => llamar('opsAdmin', { action: 'quienSoy' }, t)));
      check('token basura en el emulador: rechazado y sin datos', conBasura.every((r) => [401, 403].includes(r.estado) && r.json.result === undefined), conBasura.map((r) => r.estado).join(','));

      const deNormal = await Promise.all([...PROTEGIDAS, ...ESCRITURAS].map(([c, d]) => llamar(c, d, tNormal)));
      check('cuenta sin privilegios: 403 en todas', deNormal.every((r) => r.estado === 403), deNormal.map((r) => r.estado).join(','));
      check('y ninguna respuesta trae datos', deNormal.every((r) => r.json.result === undefined));

      const conRolDeClaim = await llamar('opsAdmin', { action: 'quienSoy', rol: 'owner', weeRole: 'owner', admin: true, permisos: ['audit.read'] }, tNormal);
      const auditoriaConRol = await llamar('opsAdmin', { action: 'auditoria', rol: 'owner', weeRole: 'owner', admin: true }, tNormal);
      check('el rol enviado por el cliente en el cuerpo no vale de nada', conRolDeClaim.estado === 403 && auditoriaConRol.estado === 403);
      const autoasignar = await post(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=${CLAVE_API}`, { idToken: tNormal, customAttributes: JSON.stringify({ admin: true }) });
      const tTras = await tokenDe(normal);
      check('una cuenta no puede ponerse el claim a sí misma', cargaDe(tTras).admin === undefined, `Auth respondió ${autoasignar.estado}`);

      const sinRolRol = await Promise.all([['opsAdmin', { action: 'auditoria' }], ['opsAdmin', { action: 'trabajos' }], ['accountsAdmin', { action: 'buscar', uid: owner.uid }]].map(([c, d]) => llamar(c, d, tSinRol)));
      check('administración sin rol: 403 en lo que pide un permiso', sinRolRol.every((r) => r.estado === 403), sinRolRol.map((r) => r.estado).join(','));
      const quien = await llamar('opsAdmin', { action: 'quienSoy' }, tSinRol);
      check('y quienSoy le dice que no tiene rol ni permisos', quien.estado === 200 && quien.json.result.rol === null && quien.json.result.permisos.length === 0);

      const legit = await Promise.all(PROTEGIDAS.map(([c, d]) => llamar(c, d, tOwner)));
      /* `balance` da 404 porque la cuenta de prueba no tiene Perfil Real: pasó la autorización, que es lo que aquí se mide. */
      check('control: el owner pasa la autorización en las mismas lecturas (los 401/403 no son un fallo general)', legit.every((r) => r.estado !== 401 && r.estado !== 403) && legit.filter((r) => r.estado === 200).length >= 7, legit.map((r) => r.estado).join(','));
      const escrituraOwner = await llamar('engineAdmin', { action: 'noExiste' }, tOwner);
      check('control: una acción desconocida no se ejecuta ni con owner', escrituraOwner.estado !== 200, String(escrituraOwner.estado));

      /* La constancia: un intento denegado de administración queda; el de cualquier otra cuenta, no. */
      const { getFirestore } = requerir('firebase-admin/firestore');
      const audit = await getFirestore().collection('adminAudit').get();
      const filas = audit.docs.map((d) => d.data());
      check('adminAudit: el denegado de administración sin rol consta', filas.some((f) => f.actorUid === adminSinRol.uid && f.resultado === 'denegado'));
      check('adminAudit: la cuenta sin privilegios no puede llenarla', !filas.some((f) => f.actorUid === normal.uid));
      check('adminAudit: no guarda tokens', !/eyJ[A-Za-z0-9_-]{20,}/.test(JSON.stringify(filas)));

      /* Limitación del emulador, medida y no escondida. */
      const ahora = Math.floor(Date.now() / 1000);
      const base = cargaDe(tNormal);
      const forjado = await llamar('opsAdmin', { action: 'quienSoy' }, jwt({ ...base, admin: true, iat: ahora, exp: ahora + 3600 }));
      const caducado = await llamar('opsAdmin', { action: 'quienSoy' }, jwt({ ...cargaDe(tOwner), iat: ahora - 7200, exp: ahora - 3600 }));
      observado(`el EMULADOR de Functions, con un token forjado sin firma y admin:true, responde ${forjado.estado}; con uno de owner caducado, ${caducado.estado}. No verifica firma ni caducidad: esto no prueba el comportamiento en producción (ver F).`);
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('F · onCall y firebase-admin de verdad (sin el atajo del emulador de Functions)');
    {
      const quienSoy = (t) => post(URL_REAL, { data: { action: 'quienSoy' } }, t ? { authorization: `Bearer ${t}` } : {});
      const tOwner = await tokenDe(owner);
      const carga = cargaDe(tOwner);
      const ahora = Math.floor(Date.now() / 1000);
      const bien = await quienSoy(tOwner);
      check('control: el token de verdad del owner pasa', bien.estado === 200 && bien.json.result?.rol === 'owner', String(bien.estado));
      const sinSesion = await quienSoy();
      check('sin token: 401', sinSesion.estado === 401, String(sinSesion.estado));
      const roto = await quienSoy('token-roto');
      check('token basura: 401', roto.estado === 401, String(roto.estado));
      const caducado = await quienSoy(jwt({ ...carga, iat: ahora - 7200, exp: ahora - 3600 }));
      check('token caducado: 401', caducado.estado === 401, String(caducado.estado));
      const otroProyecto = await quienSoy(jwt({ ...carga, aud: 'get-wee', iss: 'https://securetoken.google.com/get-wee' }));
      check('token de otro proyecto: 401', otroProyecto.estado === 401, String(otroProyecto.estado));
      const sinSub = await quienSoy(jwt({ ...carga, sub: '' }));
      check('token sin sujeto: 401', sinSub.estado === 401, String(sinSub.estado));
      observado('firebase-admin en modo emulador omite la FIRMA por diseño: un token forjado sin firma no se puede rechazar aquí. Comprobarla exige un proyecto real.');

      /* La baja, medida: esta rama no relee Auth en cada llamada; la puerta común que lo hace está en otra (959c28f7). */
      const tVigente = await tokenDe(deshabilitada);
      const baja = await post(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROYECTO}/accounts:update`, { localId: deshabilitada.uid, disableUser: true }, { authorization: 'Bearer owner' });
      if (baja.estado !== 200) throw new Error('no se pudo deshabilitar la cuenta de prueba');
      const tras = await quienSoy(tVigente);
      observado(`una cuenta owner DESHABILITADA, con un token aún vigente, recibe ${tras.estado} aquí, pero esto NO vale para producción: firebase-admin solo comprueba las bajas siempre en modo emulador, y onCall llama a verifyIdToken sin checkRevoked. En producción, en esta rama, una baja no corta el acceso hasta que caduca el token (≈1 h).`);
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('Cuenta deshabilitada');
    {
      const p = await navegador.pagina();
      await p.ir(URL_CONSOLA);
      await entrar(p, deshabilitada);
      await p.hasta(`!!document.querySelector('[role=alert]')`, 'el aviso');
      check('una cuenta deshabilitada no entra, y el mensaje no lo revela', (await p.ev(`document.querySelector('[role=alert]').innerText`)).includes('Correo o contraseña incorrectos') && !(await p.ev(hayMenu)));
      await p.cerrar();
    }

    /* ─────────────────────────────────────────────────────────────────────── */
    seccion('Interfaz: anchos, teclado, RTL');
    {
      const p = await navegador.pagina();
      await p.ir(URL_CONSOLA);
      await p.hasta(hayLogin, 'el formulario');
      await p.ev(`${FORM}.requestSubmit()`);
      await p.hasta(`document.body.innerText.includes('Escribe tu correo.')`, 'los avisos');
      const medida = `(() => {
        const dentro = (el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + .5 && r.width > 0; };
        const piezas = [...document.querySelectorAll('h1, label, input, button, select, .error-campo, .nota')];
        const cortados = piezas.filter((el) => el.scrollWidth > el.clientWidth + 1 && el.tagName !== 'INPUT' && el.tagName !== 'SELECT').length;
        const pequenos = [...document.querySelectorAll('form input, form button')].filter((el) => el.getBoundingClientRect().height < 44).length;
        return { sinDesborde: document.documentElement.scrollWidth <= innerWidth, dentro: piezas.every(dentro), cortados, pequenos };
      })()`;
      for (const [ancho, alto] of [[320, 640], [360, 740], [390, 844], [1024, 768], [1440, 900]]) {
        for (const dir of ['ltr', 'rtl']) {
          await p.tamano(ancho, alto);
          await p.ev(`document.documentElement.dir = '${dir}'`);
          await espera(80);
          const m = await p.ev(medida);
          check(`${ancho}px ${dir}: sin desborde, todo dentro, sin texto cortado y objetivos de 44 px`, m.sinDesborde && m.dentro && m.cortados === 0 && m.pequenos === 0, JSON.stringify(m));
          if (capturas) await p.captura(path.join(capturas, `login-${ancho}-${dir}.png`));
        }
      }
      await p.ev(`document.documentElement.dir = 'ltr'`);
      await p.escribir(CLAVE, 'visible');
      await p.ev(`[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Mostrar contraseña').click()`);
      check('mostrar contraseña cambia el tipo del campo en el navegador', await p.ev(`document.querySelector('${CLAVE.replace(/"/g, '\\"').replace(/'/g, '"')}').type === 'text'`));
      if (capturas) await p.captura(path.join(capturas, 'login-clave-visible.png'));
      await p.cerrar();
    }
  } catch (e) {
    fallos++;
    console.log(`✘ La batería se cortó: ${e.message}`);
  } finally {
    await navegador.cerrar().catch(() => undefined);
    await new Promise((ok) => servidorReal.close(ok));
    vite.kill();
    await espera(300);
    fs.rmSync(salidaVite, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
  console.log(`Resultado: ${n - fallos < 0 ? 0 : n - fallos} de ${n} comprobaciones${fallos ? `, ${fallos} FALLO(S)` : ''}.`);
  process.exit(fallos ? 1 : 0);
};

if (process.argv.includes('--dentro')) await dentro(); else await fuera();
