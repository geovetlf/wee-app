/*
 * FRENTE I · UNA TANDA DE CARGA CON SU PROPIO EMULADOR.
 *
 *   node scripts/carga/tanda.mjs <script.mjs> [argumentos del script…]
 *   node scripts/carga/tanda.mjs carga.mjs --escenarios dinero --escalones 1,10,25,50,100 --salida r.json
 *   node scripts/carga/tanda.mjs rafaga-dinero.mjs
 *
 * Arranca un emulador de Firestore PROPIO (el jar, sin firebase-tools) en CARGA_PUERTO (18100 por defecto, websocket
 * en +1), comprueba antes que el puerto está libre, lanza el script con FIRESTORE_EMULATOR_HOST y un proyecto demo-*,
 * y apaga el emulador al terminar, también si el script falla. Corta la tanda a los CARGA_TANDA_MAX_S (300 s).
 *
 * Java 21: JAVA21_HOME, o el portable de %LOCALAPPDATA%/wee-tools. El jar: ~/.cache/firebase/emulators.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.CARGA_PUERTO || 18100);
const PROYECTO = process.env.CARGA_PROYECTO || 'demo-wee-carga';
const MAX_S = Number(process.env.CARGA_TANDA_MAX_S || 300);
if (!PROYECTO.startsWith('demo-')) { console.error('✘ Solo proyectos demo-*'); process.exit(2); }

const java = () => {
  const candidatos = [process.env.JAVA21_HOME && path.join(process.env.JAVA21_HOME, 'bin', 'java.exe'),
    process.env.JAVA21_HOME && path.join(process.env.JAVA21_HOME, 'bin', 'java'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'wee-tools', 'jdk-21.0.12.1+1', 'bin', 'java.exe')].filter(Boolean);
  return candidatos.find((c) => fs.existsSync(c)) || 'java';
};
const jar = () => {
  const dir = path.join(os.homedir(), '.cache', 'firebase', 'emulators');
  const f = fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => /^cloud-firestore-emulator-v.*\.jar$/.test(x)).sort().pop() : null;
  if (!f) { console.error('✘ No encuentro el jar del emulador de Firestore en', dir); process.exit(2); }
  return path.join(dir, f);
};
const ocupado = (port) => new Promise((ok) => {
  const s = net.connect({ host: '127.0.0.1', port }, () => { s.destroy(); ok(true); });
  s.on('error', () => ok(false));
});
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

const [script, ...resto] = process.argv.slice(2);
if (!script) { console.error('uso: node tanda.mjs <script.mjs> [args]'); process.exit(2); }
for (const p of [PUERTO, PUERTO + 1]) if (await ocupado(p)) { console.error(`✘ El puerto ${p} ya está en uso: no lanzo nada.`); process.exit(2); }

const emu = spawn(java(), ['-Xmx768m', '-jar', jar(), '--host', '127.0.0.1', '--port', String(PUERTO), '--websocket_port', String(PUERTO + 1),
  '--project_id', PROYECTO, '--single_project_mode', 'true'], { stdio: ['ignore', 'pipe', 'pipe'] });
let registro = '';
emu.stdout.on('data', (d) => (registro += d));
emu.stderr.on('data', (d) => (registro += d));
const apagar = () => { try { emu.kill(); } catch { /* ya apagado */ } };
process.on('exit', apagar);

let listo = false;
for (let i = 0; i < 120 && !listo; i++) { await esperar(500); listo = await ocupado(PUERTO); if (emu.exitCode !== null) break; }
if (!listo) { console.error('✘ El emulador no arrancó:\n' + registro.slice(-800)); apagar(); process.exit(2); }
console.log(`emulador Firestore 127.0.0.1:${PUERTO} · ${PROYECTO} · pid ${emu.pid}`);

const hijo = spawn(process.execPath, ['--max-old-space-size=1024', path.resolve(AQUI, script), ...resto], {
  stdio: 'inherit',
  env: { ...process.env, FIRESTORE_EMULATOR_HOST: `127.0.0.1:${PUERTO}`, GCLOUD_PROJECT: PROYECTO },
});
const corte = setTimeout(() => { console.error(`✘ La tanda pasa de ${MAX_S} s: se corta.`); hijo.kill(); }, MAX_S * 1000);
const codigo = await new Promise((ok) => hijo.on('close', (c) => ok(c ?? 1)));
clearTimeout(corte);
apagar();
await esperar(1000);
process.exit(codigo);
