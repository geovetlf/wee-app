#!/usr/bin/env node
/**
 * La app web contra los EMULADORES locales, sin tocar producción.
 *
 *   npm run functions:emulator      (una terminal)
 *   npm run web:demo                (otra terminal; puerto 8082 o el que se pase)
 *
 * Pone a la app en el proyecto de demostración (`demo-wee`, el mismo que
 * `scripts/emulators.mjs`) y conecta Auth, Firestore, Functions y Storage a
 * 127.0.0.1 (config/firebase.ts solo los conecta si estas variables existen).
 * Las variables del proceso ganan a las del `.env`, así que el `.env` de
 * producción del portátil no se usa aquí. Ninguna llamada sale a get-wee.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const proyecto = process.env.WEE_EMULADOR_PROYECTO || 'demo-wee';
if (!proyecto.startsWith('demo-')) {
  console.error(`✘ «${proyecto}» no es un proyecto demo-*: la web de demostración nunca apunta a un proyecto real.`);
  process.exit(1);
}
const puerto = process.argv[2] || '8082';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = {
  ...process.env,
  EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${proyecto}.firebaseapp.com`,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: proyecto,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: `${proyecto}.appspot.com`,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000',
  EXPO_PUBLIC_AUTH_EMULATOR_HOST: '127.0.0.1',
  EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST: '127.0.0.1',
  EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST: '127.0.0.1',
  EXPO_PUBLIC_STORAGE_EMULATOR_HOST: '127.0.0.1',
  BROWSER: 'none',
};

console.log(`Web de demostración en http://localhost:${puerto} contra los emuladores de ${proyecto}.`);
const isWindows = process.platform === 'win32';
const hijo = spawn(isWindows ? 'npx.cmd' : 'npx', ['expo', 'start', '--web', '--port', puerto], { cwd: raiz, env, stdio: 'inherit', shell: isWindows });
hijo.on('exit', (code) => process.exit(code ?? 0));
