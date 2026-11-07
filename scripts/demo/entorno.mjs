#!/usr/bin/env node
/*
 * ARRANCAR EL MODO DEMO. Cada pieza en su terminal (docs/WEE-DEMO.md):
 *
 *   node scripts/demo/entorno.mjs emuladores          Auth, Firestore, Functions y Storage, abiertos a la red local
 *   node scripts/demo/entorno.mjs medios <carpeta>    el servidor de medios
 *   node scripts/demo/entorno.mjs web [puerto=8082]   la web contra los emuladores
 *   node scripts/demo/entorno.mjs nativo              Metro para «Weë — Development Build» en el teléfono
 *   node scripts/demo/entorno.mjs reiniciar <carpeta> vuelve al estado inicial (cada grabación empieza aquí)
 *
 * La IP de la red local sale de WEE_DEMO_HOST (por defecto localhost). Las variables del proceso ganan a las del `.env`,
 * así que el `.env` de producción del portátil no se usa aquí. Nada de esto toca producción: el proyecto es siempre `demo-*`.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESPECTADOR } from './datos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROYECTO = process.env.WEE_EMULADOR_PROYECTO || 'demo-wee-migracion';
if (!PROYECTO.startsWith('demo-')) {
  console.error(`✘ «${PROYECTO}» no es un proyecto demo-*.`);
  process.exit(2);
}
const HOST = process.env.WEE_DEMO_HOST || 'localhost';
const [orden, arg] = process.argv.slice(2);
const windows = process.platform === 'win32';
const lanzar = (cmd, args, env = {}) => {
  /* node va sin shell: su ruta lleva espacios en Windows («C:\Program Files»). */
  const esNode = cmd === process.execPath;
  const hijo = spawn(windows && !esNode ? `${cmd}.cmd` : cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: 'inherit', shell: windows && !esNode });
  hijo.on('exit', (c) => process.exit(c ?? 0));
};
const entornoApp = {
  EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROYECTO}.firebaseapp.com`,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: PROYECTO,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROYECTO}.appspot.com`,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000',
  EXPO_PUBLIC_AUTH_EMULATOR_HOST: HOST,
  EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST: HOST,
  EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST: HOST,
  EXPO_PUBLIC_STORAGE_EMULATOR_HOST: HOST,
  /* La demo entra sola con la cuenta de prueba del emulador (components/EntradaDemo.tsx): solo su UID, un identificador, y
     el token de prueba del emulador. Ni su correo ni su contraseña van al cliente: una variable EXPO_PUBLIC no es un
     secreto (decisión del dueño, 2026-11-07). */
  EXPO_PUBLIC_DEMO_MEDIOS: `http://${HOST}:8096`,
  EXPO_PUBLIC_DEMO_UID: ESPECTADOR.uid,
  BROWSER: 'none',
};

if (orden === 'emuladores') {
  /* Las mismas barreras que `scripts/emulators.mjs`: sin claves ni credenciales reales, y secretos vacíos. */
  const { EMULADORES, buscarJava21, motivosParaNoArrancar, secretLocalVacio } = await import('../emulators.mjs');
  const leer = (rel) => (fs.existsSync(path.join(RAIZ, rel)) ? fs.readFileSync(path.join(RAIZ, rel), 'utf8') : '');
  const motivos = motivosParaNoArrancar({ proyecto: PROYECTO, env: process.env, envLocal: leer('functions/.env.local'), secretLocal: leer('functions/.secret.local') });
  if (motivos.length) {
    console.error(`✘ Los emuladores no arrancan:\n  · ${motivos.join('\n  · ')}`);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(RAIZ, 'functions/.secret.local'))) fs.writeFileSync(path.join(RAIZ, 'functions/.secret.local'), secretLocalVacio());
  const conf = JSON.parse(fs.readFileSync(path.join(RAIZ, 'firebase.json'), 'utf8'));
  for (const n of EMULADORES) conf.emulators[n].host = '0.0.0.0';
  fs.writeFileSync(path.join(RAIZ, 'firebase.lan.json'), JSON.stringify(conf, null, 2));
  const java = buscarJava21(windows);
  if (!java.listo) {
    console.error('✘ El emulador de Storage necesita Java 21.');
    process.exit(1);
  }
  lanzar('npx', ['firebase', 'emulators:start', '--only', EMULADORES.join(','), '--project', PROYECTO, '--config', 'firebase.lan.json'], {
    FUNCTIONS_DISCOVERY_TIMEOUT: '240',
    ...(java.home ? { JAVA_HOME: java.home, PATH: `${path.join(java.home, 'bin')}${path.delimiter}${process.env.PATH}` } : {}),
  });
} else if (orden === 'medios') {
  lanzar(process.execPath, [path.join(RAIZ, 'scripts/demo/servidor-medios.mjs'), arg || path.join(RAIZ, 'demo-medios')]);
} else if (orden === 'web') {
  lanzar('npx', ['expo', 'start', '--web', '--port', arg || '8082'], entornoApp);
} else if (orden === 'nativo') {
  /* Sin modo desarrollo: la app arranca y se mueve como la de verdad, que es lo que se graba. */
  lanzar('npx', ['expo', 'start', '--dev-client', '--lan', '--port', '8081', '--clear', '--no-dev', '--minify'], entornoApp);
} else if (orden === 'reiniciar') {
  lanzar(process.execPath, [path.join(RAIZ, 'scripts/sembrar-demo.mjs'), '--project', PROYECTO, '--medios', arg || path.join(RAIZ, 'demo-medios'), '--base-medios', `http://${HOST}:8096`, '--ejecutar'], {
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  });
} else if (orden === 'generar') {
  /* node scripts/demo/entorno.mjs generar <tope acumulado en USD> [ranura,ranura] [tope de esta ejecución] — pide las claves sin eco. */
  const [tope, solo, topeEjecucion] = process.argv.slice(3);
  lanzar(process.execPath, [
    path.join(RAIZ, 'scripts/demo/generar-medios.mjs'), '--project', PROYECTO, '--medios', path.join(RAIZ, 'demo-medios'),
    '--ejecutar', '--autorizado-usd', tope || '0', ...(solo ? ['--solo', solo] : []), ...(topeEjecucion ? ['--tope-ejecucion', topeEjecucion] : []),
  ], {
    FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    GCLOUD_PROJECT: PROYECTO,
  });
} else {
  console.error('Órdenes: emuladores · medios · web · nativo · reiniciar · generar');
  process.exit(2);
}
