#!/usr/bin/env node
/**
 * Levanta los emuladores de Firebase para desarrollo (functions + storage).
 *
 * El emulador de Storage necesita Java 21 o superior. Si el `java` del PATH es
 * más antiguo (el build de Android usa JDK 17), este script busca un JDK 21
 * portable en %LOCALAPPDATA%\wee-tools\jdk-21* o en JAVA21_HOME y lo antepone
 * al PATH solo para este proceso: no cambia JAVA_HOME ni la configuración del sistema.
 *
 *   npm run functions:emulator
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const isWindows = process.platform === 'win32';

const javaMajor = (javaBin) => {
  const result = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  const text = `${result.stdout || ''}${result.stderr || ''}`;
  const match = text.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return 0;
  const major = Number(match[1]);
  return major === 1 ? Number(match[2] || 0) : major;
};

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

let javaHome = null;
if (javaMajor('java') >= 21) {
  javaHome = null; // el java del PATH ya sirve
} else {
  javaHome = candidates.find((dir) => existsSync(path.join(dir, 'bin', isWindows ? 'java.exe' : 'java')) && javaMajor(path.join(dir, 'bin', 'java')) >= 21) || null;
  if (!javaHome) {
    console.error('El emulador de Storage necesita Java 21 o superior. Instala un JDK 21 (por ejemplo Microsoft OpenJDK) o descomprímelo en %LOCALAPPDATA%\\wee-tools\\jdk-21 y vuelve a intentarlo.');
    process.exit(1);
  }
}

const env = { ...process.env };
if (javaHome) {
  env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH || ''}`;
  env.JAVA_HOME = javaHome;
  console.log(`Emuladores con Java 21 portable: ${javaHome}`);
}

const args = ['emulators:start', '--only', 'functions,storage', '--project', 'dev'];
const child = spawn(isWindows ? 'firebase.cmd' : 'firebase', args, { stdio: 'inherit', env, cwd: process.cwd(), shell: isWindows });
child.on('exit', (code) => process.exit(code ?? 0));
