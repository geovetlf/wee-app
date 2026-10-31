/*
 * UNA WEB SIN FIREBASE NO SE PUBLICA (incidente de wee.zone, 2026-10-29).
 * Comprueba la barrera de la construcción, sin construir nada y sin leer ninguna variable real.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { REQUERIDAS, faltan, exigirConfigWeb } = require(path.join(raiz, 'scripts/exigir-config-web.cjs'));
let fallos = 0;
const check = (n, c, x = '') => { console.log((c ? '✔ ' : '✘ ') + n + (x ? ' — ' + x : '')); if (!c) fallos++; };
const lanza = (env) => { try { exigirConfigWeb(env); return null; } catch (e) { return e.message; } };
const completo = Object.fromEntries(REQUERIDAS.map((n) => [n, 'valor-de-prueba-secreto']));

check('1) en Vercel sin variables, la construcción falla', !!lanza({ VERCEL: '1' }));
check('2) el error nombra las seis que faltan', REQUERIDAS.every((n) => (lanza({ VERCEL: '1' }) || '').includes(n)));
const { EXPO_PUBLIC_FIREBASE_APP_ID: _quitada, ...sinUna } = completo;
check('3) con una sola ausente, también falla y solo nombra esa', /EXPO_PUBLIC_FIREBASE_APP_ID/.test(lanza({ VERCEL: '1', ...sinUna }) || '') && faltan({ ...sinUna }).length === 1);
check('4) una variable vacía o en blanco cuenta como ausente', !!lanza({ VERCEL: '1', ...completo, EXPO_PUBLIC_FIREBASE_API_KEY: '   ' }));
check('5) en Vercel con todas, pasa', lanza({ VERCEL: '1', ...completo }) === null);
check('6) fuera de Vercel no hace nada: el desarrollo y el modo demo siguen igual', lanza({}) === null);
const msg = lanza({ VERCEL: '1', ...sinUna }) || '';
check('7) nunca escribe un valor en el mensaje', !msg.includes('valor-de-prueba-secreto'));
const metro = fs.readFileSync(path.join(raiz, 'metro.config.js'), 'utf8');
check('8) metro.config.js la ejecuta antes de configurar el bundler', metro.indexOf('exigirConfigWeb();') > 0 && metro.indexOf('exigirConfigWeb();') < metro.indexOf('getDefaultConfig(__dirname)'));
const firebase = fs.readFileSync(path.join(raiz, 'config/firebase.ts'), 'utf8');
check('9) la lista coincide con los campos que config/firebase.ts declara obligatorios', REQUERIDAS.every((n) => firebase.includes(`process.env.${n}`)));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
