/*
 * LAS WEBS DE WEË NO SE PUEDEN INCRUSTAR EN OTRA PÁGINA — revisión post-auditoría 2026-10-01,
 * hallazgo infra/cabeceras-seguridad/vercel.json#headers.
 *
 *   node test/cabeceras-seguridad.test.mjs
 *
 * wee.zone (Vercel) y los dos sitios de Firebase Hosting no mandaban NINGUNA cabecera de seguridad: la app con la
 * sesión iniciada se podía meter en un <iframe> ajeno (clickjacking). Las únicas cabeceras estaban en un netlify.toml
 * que ningún host usa. Ahora cada host real manda las suyas.
 *
 * El matiz que esta suite fija: el sitio `get-wee` es el dominio de Firebase Auth del proyecto, y sirve sus rutas
 * reservadas (`/__/auth/handler`, `/__/auth/iframe`) que la app INCRUSTA para iniciar sesión. Ahí no puede ir nada
 * que prohíba incrustar: solo en las páginas propias.
 *
 * Una Content-Security-Policy completa (de scripts, estilos y conexiones) NO se pone a ciegas: sin probarla contra la
 * web viva rompería el inicio de sesión de Google o las imágenes. Queda escrita como siguiente paso (modo «report-only»
 * primero) en docs/SECURITY.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const leer = (p) => JSON.parse(fs.readFileSync(path.resolve(RAIZ, p), 'utf8'));
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const valor = (bloques, source, key) => bloques.find((b) => b.source === source)?.headers?.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
const COMUNES = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
const noIncrustar = (bloques, source) => valor(bloques, source, 'X-Frame-Options') === 'DENY' && /frame-ancestors 'none'/.test(valor(bloques, source, 'Content-Security-Policy') ?? '');

console.log('\n── A · wee.zone (Vercel) ──');
{
  const v = leer('vercel.json');
  const h = v.headers ?? [];
  check('1) todas las rutas llevan nosniff y Referrer-Policy', Object.entries(COMUNES).every(([k, val]) => valor(h, '/(.*)', k) === val));
  check('2) y no se pueden incrustar en otra página (X-Frame-Options + frame-ancestors)', noIncrustar(h, '/(.*)'));
  check('3) la cámara, el micrófono y la ubicación solo para la propia web (la app los usa)',
    /camera=\(self\)/.test(valor(h, '/(.*)', 'Permissions-Policy') ?? '') && /microphone=\(self\)/.test(valor(h, '/(.*)', 'Permissions-Policy') ?? '') && /geolocation=\(self\)/.test(valor(h, '/(.*)', 'Permissions-Policy') ?? ''));
  check('4) CONTROL: el freno de Vercel sigue puesto', JSON.stringify(v.git) === JSON.stringify({ deploymentEnabled: { main: false } }));
  /* Apple solo acepta el archivo de enlaces universales servido como JSON; Vercel lo mandaba como octet-stream. */
  check('4b) el archivo de enlaces universales de Apple se sirve como JSON', valor(h, '/.well-known/apple-app-site-association', 'Content-Type') === 'application/json');
}

console.log('\n── B · Firebase Hosting ──');
{
  const f = leer('firebase.json');
  const sitio = (id) => f.hosting.find((s) => s.site === id);
  const app = sitio('wee-app').headers ?? [];
  check('5) wee-app (la app): comunes y no incrustable en todas las rutas', Object.entries(COMUNES).every(([k, val]) => valor(app, '**', k) === val) && noIncrustar(app, '**'));
  const getWee = sitio('get-wee').headers ?? [];
  check('6) get-wee: comunes en todas las rutas', Object.entries(COMUNES).every(([k, val]) => valor(getWee, '**', k) === val));
  check('7) get-wee: las páginas propias (raíz, legales, página pública de un post y cualquier .html) no son incrustables',
    ['/', '/privacy', '/terms', '/support', '**/*.html', '/post/**'].every((s) => noIncrustar(getWee, s)));
  /* Lo que de verdad importa: ninguna regla que prohíba incrustar puede alcanzar las rutas reservadas de Firebase Auth. */
  const globAExpresion = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§').replace(/\*/g, '[^/]*').replace(/§/g, '.*') + '$');
  const alcanzan = (ruta) => getWee.filter((b) => globAExpresion(b.source).test(ruta) && b.headers.some((x) => /x-frame-options|content-security-policy/i.test(x.key))).map((b) => b.source);
  check('8) el inicio de sesión sigue funcionando: nada impide incrustar `/__/auth/handler` ni `/__/auth/iframe`',
    alcanzan('/__/auth/handler').length === 0 && alcanzan('/__/auth/iframe').length === 0, [...alcanzan('/__/auth/handler'), ...alcanzan('/__/auth/iframe')].join(','));
  check('9) CONTROL: la expresión ve lo que debe (una página .html SÍ queda alcanzada)', alcanzan('/landing.html').length > 0 && alcanzan('/post/abc').length > 0);
  check('10) CONTROL: cada destino sigue con su cerradura de despliegue primero', f.hosting.every((s) => /solo-desde-el-workflow\.mjs/.test((s.predeploy ?? [])[0] ?? '')));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
