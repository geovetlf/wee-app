/*
 * CÓMO SE LANZAN LAS PRUEBAS DE LA PROPUESTA DE REGLAS — en un emulador aislado, nunca en el de la demo viva.
 *
 *   node ops/propuestas/weetalk-bloqueo/correr-reglas.mjs
 *
 * Proyecto `demo-wee-bloqueo` (solo-emulador: no llega a nada real) y puertos PROPIOS —Firestore 38080 (websocket
 * 39150), Auth 39099, Functions 35001, Storage 39199, hub 34400, logging 34500, sin interfaz—, en un `firebase.json`
 * temporal fuera del repositorio. Los de la demo viva del dueño (4400, 4500, 5001, 8080, 8084, 8096, 9099, 9150,
 * 9199, 9299) no se tocan nunca. Solo arranca Firestore (`--only firestore`): las reglas no necesitan más.
 *
 * Antes de arrancar se niega si hay menos de 1,5 GB libres, si no encuentra Java 21 o si el entorno trae credenciales
 * o un proyecto real. Quien lo lance en la máquina compartida toma antes el candado de los trabajos pesados.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../../..');
const PROYECTO = 'demo-wee-bloqueo';
const PUERTOS = Object.freeze({ firestore: 38080, websocket: 39150, auth: 39099, functions: 35001, storage: 39199, hub: 34400, logging: 34500 });
const PROHIBIDOS = new Set([4400, 4500, 5001, 8080, 8084, 8096, 9099, 9150, 9199, 9299]);
const MINIMO_LIBRE = 1.5 * 1024 ** 3;

/** El `firebase.json` del emulador aislado: solo emuladores, con las reglas del repositorio como punto de partida. */
export const configuracionAislada = (rutaDeLasReglas) => ({
  firestore: { rules: rutaDeLasReglas },
  emulators: {
    firestore: { port: PUERTOS.firestore, host: '127.0.0.1', websocketPort: PUERTOS.websocket },
    auth: { port: PUERTOS.auth, host: '127.0.0.1' },
    functions: { port: PUERTOS.functions, host: '127.0.0.1' },
    storage: { port: PUERTOS.storage, host: '127.0.0.1' },
    hub: { port: PUERTOS.hub, host: '127.0.0.1' },
    logging: { port: PUERTOS.logging, host: '127.0.0.1' },
    ui: { enabled: false },
  },
});

/** Los puertos que usaría esta configuración y que la demo viva tiene ocupados (vacío = ninguno). */
export const puertosEnConflicto = (config) => {
  const usados = [];
  for (const e of Object.values(config.emulators || {})) {
    if (e && typeof e === 'object') for (const k of ['port', 'websocketPort']) if (Number.isInteger(e[k])) usados.push(e[k]);
  }
  return usados.filter((p) => PROHIBIDOS.has(p));
};

const firebaseTools = () => {
  if (process.env.FIREBASE_BIN) return [process.env.FIREBASE_BIN];
  const npmGlobal = spawnSync('npm root -g', { encoding: 'utf8', shell: true });
  const js = path.join(String(npmGlobal.stdout || '').trim(), 'firebase-tools', 'lib', 'bin', 'firebase.js');
  if (npmGlobal.status === 0 && fs.existsSync(js)) return [process.execPath, js];
  return ['firebase'];
};

const principal = async () => {
  if (os.freemem() < MINIMO_LIBRE) {
    console.error(`✘ Hay ${(os.freemem() / 1024 ** 3).toFixed(2)} GB libres y el emulador pide al menos 1,5: no se arranca.`);
    process.exit(3);
  }
  const config = configuracionAislada(path.join(RAIZ, 'firestore.rules'));
  const conflicto = puertosEnConflicto(config);
  if (conflicto.length) { console.error(`✘ Puertos de la demo viva en la configuración: ${conflicto.join(', ')}`); process.exit(2); }

  const env = { ...process.env };
  for (const k of ['GOOGLE_APPLICATION_CREDENTIALS', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT']) delete env[k];
  const { buscarJava21 } = await import(pathToFileURL(path.join(RAIZ, 'scripts/emulators.mjs')).href);
  const java = buscarJava21(process.platform === 'win32');
  if (!java.listo) { console.error('✘ Hace falta Java 21 o superior (PATH, JAVA21_HOME o %LOCALAPPDATA%\\wee-tools\\jdk-21*).'); process.exit(2); }
  if (java.home) { env.PATH = `${path.join(java.home, 'bin')}${path.delimiter}${env.PATH || ''}`; env.JAVA_HOME = java.home; }

  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-bloqueo-'));
  const rutaConfig = path.join(carpeta, 'firebase.json');
  fs.writeFileSync(rutaConfig, JSON.stringify(config, null, 2));
  const prueba = path.join(aqui, 'reglas.prueba.mjs');
  const lanzador = firebaseTools();
  const args = [...lanzador.slice(1), 'emulators:exec', '--only', 'firestore', '--project', PROYECTO, '--config', rutaConfig, `node "${prueba}"`];
  const hijo = spawn(lanzador[0], args, { cwd: RAIZ, env, stdio: 'inherit' });
  hijo.on('close', (codigo) => {
    fs.rmSync(carpeta, { recursive: true, force: true });
    process.exit(codigo ?? 1);
  });
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((e) => { console.error(`correr-reglas: ${e.message}`); process.exit(2); });
}
