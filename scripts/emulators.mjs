#!/usr/bin/env node
/**
 * Levanta los emuladores de Firebase para desarrollo, AISLADOS de producción.
 *
 *   npm run functions:emulator      (y en otra terminal: npm run web:demo)
 *
 * ── Por qué está así (auditoría H0, 2026-09-30) ────────────────────────────
 *
 * Antes arrancaba solo `functions,storage` con el proyecto por defecto de
 * `.firebaserc`, que es get-wee. Las funciones emuladas trabajaban entonces
 * contra el Firestore y el Auth REALES, con la credencial del dueño, con los
 * secretos de producción (el emulador pide a Secret Manager la versión `latest`
 * de cada uno) y sin verificar tokens: quien llegara al puerto podía forjar un
 * administrador contra datos reales.
 *
 * Ahora:
 *  · el proyecto es siempre `demo-*` (por defecto `demo-wee`): Firebase trata
 *    esos proyectos como solo-emulador y no pueden tocar nada real;
 *  · se emulan Auth, Firestore, Functions y Storage, todos en 127.0.0.1;
 *  · `functions/.secret.local` declara vacíos todos los secretos, así que el
 *    emulador nunca pregunta a Secret Manager y el motor de IA cae en `mock`;
 *  · se niega a arrancar si ve credenciales reales o claves de proveedor.
 *
 * El emulador de Storage necesita Java 21 o superior. Si el `java` del PATH es
 * más antiguo (el build de Android usa JDK 17), se busca un JDK 21 portable en
 * %LOCALAPPDATA%\wee-tools\jdk-21* o en JAVA21_HOME y se antepone al PATH solo
 * para este proceso: no cambia JAVA_HOME ni la configuración del sistema.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROYECTO_POR_DEFECTO = 'demo-wee';
export const EMULADORES = ['auth', 'firestore', 'functions', 'storage'];

/** Los secretos que declaran las Functions (functions/src/secrets.ts); una prueba vigila que coincidan. */
export const SECRETOS = [
  'GEMINI_API_KEY', 'ARK_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY',
  'BFL_API_KEY', 'ELEVENLABS_API_KEY', 'MINIMAX_API_KEY', 'SEEDANCE_CALLBACK_TOKEN',
  'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
];

/** Variables de un .env con valor no vacío (solo los NOMBRES; los valores no salen de aquí). */
const conValor = (texto) => (texto || '').split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#') && l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  .filter(([, v]) => v !== '' && v !== '""' && v !== "''")
  .map(([k]) => k);

/**
 * Razones para NO arrancar. Pura: recibe lo que haría falta leer del disco y del
 * entorno, y devuelve frases (vacío = se puede arrancar).
 */
export const motivosParaNoArrancar = ({ proyecto, env = {}, envLocal = '', secretLocal = '' }) => {
  const motivos = [];
  if (!proyecto || !String(proyecto).startsWith('demo-')) {
    motivos.push(`el proyecto «${proyecto}» no es demo-*: los emuladores de Weë nunca usan un proyecto real`);
  }
  for (const v of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT']) {
    if (env[v] && !String(env[v]).startsWith('demo-')) motivos.push(`${v}=${env[v]} en el entorno apunta a un proyecto real`);
  }
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    motivos.push('GOOGLE_APPLICATION_CREDENTIALS está definida: hay una credencial real en el entorno');
  }
  const claves = conValor(envLocal).filter((k) => SECRETOS.includes(k) || /(_API_KEY|_SECRET|_TOKEN)$/.test(k));
  if (claves.length) {
    motivos.push(`functions/.env.local define claves de proveedor con valor (${claves.join(', ')}): sácalas del portátil (docs/SECURITY.md)`);
  }
  const secretos = conValor(secretLocal);
  if (secretos.length) {
    motivos.push(`functions/.secret.local tiene valores (${secretos.join(', ')}): en los emuladores van vacíos`);
  }
  return motivos;
};

/** El contenido de functions/.secret.local: todos los secretos declarados, vacíos. */
export const secretLocalVacio = () =>
  '# Secretos del emulador de Functions: VACÍOS a propósito (scripts/emulators.mjs).\n'
  + '# Así el emulador no pide nada a Secret Manager y el motor de IA usa el modo demo.\n'
  + SECRETOS.map((s) => `${s}=`).join('\n') + '\n';

const javaMajor = (javaBin) => {
  const result = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  const text = `${result.stdout || ''}${result.stderr || ''}`;
  const match = text.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return 0;
  const major = Number(match[1]);
  return major === 1 ? Number(match[2] || 0) : major;
};

const buscarJava21 = (isWindows) => {
  if (javaMajor('java') >= 21) return { listo: true, home: null };
  const candidates = [];
  if (process.env.JAVA21_HOME) candidates.push(process.env.JAVA21_HOME);
  const tools = path.join(process.env.LOCALAPPDATA || '', 'wee-tools');
  if (existsSync(tools)) {
    for (const entry of readdirSync(tools)) if (/^jdk-2[1-9]/.test(entry)) candidates.push(path.join(tools, entry));
  }
  for (const base of ['C:\\Program Files\\Microsoft', 'C:\\Program Files\\Java', 'C:\\Program Files\\Eclipse Adoptium']) {
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) if (/jdk-2[1-9]/.test(entry)) candidates.push(path.join(base, entry));
  }
  const home = candidates.find((dir) => existsSync(path.join(dir, 'bin', isWindows ? 'java.exe' : 'java'))
    && javaMajor(path.join(dir, 'bin', 'java')) >= 21) || null;
  return { listo: Boolean(home), home };
};

const principal = () => {
  const isWindows = process.platform === 'win32';
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const proyecto = process.env.WEE_EMULADOR_PROYECTO || PROYECTO_POR_DEFECTO;
  const leerSiExiste = (rel) => (existsSync(path.join(raiz, rel)) ? readFileSync(path.join(raiz, rel), 'utf8') : '');

  const motivos = motivosParaNoArrancar({
    proyecto,
    env: process.env,
    envLocal: leerSiExiste('functions/.env.local'),
    secretLocal: leerSiExiste('functions/.secret.local'),
  });
  if (motivos.length) {
    console.error('✘ Los emuladores no arrancan:');
    for (const m of motivos) console.error(`  · ${m}`);
    process.exit(1);
  }

  const rutaSecretos = path.join(raiz, 'functions/.secret.local');
  if (!existsSync(rutaSecretos)) {
    writeFileSync(rutaSecretos, secretLocalVacio());
    console.log('functions/.secret.local creado con los secretos vacíos (ignorado por git).');
  }

  const java = buscarJava21(isWindows);
  if (!java.listo) {
    console.error('El emulador de Storage necesita Java 21 o superior. Instala un JDK 21 (por ejemplo Microsoft OpenJDK) o descomprímelo en %LOCALAPPDATA%\\wee-tools\\jdk-21 y vuelve a intentarlo.');
    process.exit(1);
  }
  const env = { ...process.env };
  if (java.home) {
    env.PATH = `${path.join(java.home, 'bin')}${path.delimiter}${env.PATH || ''}`;
    env.JAVA_HOME = java.home;
    console.log(`Emuladores con Java 21 portable: ${java.home}`);
  }

  console.log(`Emuladores de ${EMULADORES.join(', ')} con el proyecto ${proyecto} (solo local; nada de get-wee).`);
  const args = ['emulators:start', '--only', EMULADORES.join(','), '--project', proyecto];
  const child = spawn(isWindows ? 'firebase.cmd' : 'firebase', args, { stdio: 'inherit', env, cwd: raiz, shell: isWindows });
  child.on('exit', (code) => process.exit(code ?? 0));
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) principal();
