/**
 * SIN CREDITS DE BIENVENIDA (decisión del dueño, definitiva desde el 2026-11-08, reafirmada el 2026-11-27).
 * Una cuenta nueva empieza con 0 Credits, y ninguna variable de entorno puede volver a encender el bono (antes, si
 * faltaba CREDITS_WELCOME, se regalaban 240).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let failures = 0;
const check = (name, cond, extra = '') => { if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${extra ? ` — ${extra}` : ''}`); } };

const fuente = fs.readFileSync(path.resolve(here, '../src/credits/creditCosts.ts'), 'utf8');
const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
check('1) WELCOME_CREDITS es un 0 fijo en el código', /export const WELCOME_CREDITS = 0;/.test(sinComentarios));
check('2) ninguna variable de entorno lo decide (ni CREDITS_WELCOME ni otra)', !/CREDITS_WELCOME/.test(sinComentarios) && !/process\.env[^\n]*WELCOME/.test(sinComentarios));

/* Con la variable puesta a cualquier valor, el compilado sigue dando 0. */
process.env.CREDITS_WELCOME = '240';
const compilado = path.resolve(here, '../lib/credits/creditCosts.js');
if (fs.existsSync(compilado)) {
  delete require.cache[compilado];
  check('3) el compilado da 0 aunque alguien ponga CREDITS_WELCOME=240', require(compilado).WELCOME_CREDITS === 0);
} else {
  console.log('· 3) sin compilar (functions/lib): se comprueba solo el código fuente');
}
delete process.env.CREDITS_WELCOME;

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ Sin Credits de bienvenida: todo en orden');
process.exit(failures ? 1 : 0);
