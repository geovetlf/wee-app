/*
 * RELLENO DE publicProfiles (scripts/rellenar-perfiles-publicos.mjs) — contra el emulador, con datos SINTÉTICOS
 * en un proyecto demo-* (correcciones 1–5, 2026-10-07).
 *
 * Siembra perfiles y copias: una igual con las claves en OTRO orden (no debe reescribirse), una vieja, una que
 * falta y un perfil sin uid. Comprueba el dry-run (no escribe), la ejecución (verifica al final), que una segunda
 * pasada no escribe nada, que no se imprime ningún id ni nombre, y que la sincronización contra el emulador relee
 * el perfil actual (un cambio posterior a la lectura del relleno no se pisa).
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/relleno-perfiles.emulator.mjs"
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const { sincronizarPerfilPublico } = require(path.join(RAIZ, 'functions/lib/identity/perfilPublico.js'));
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();

let n = 0; let fallos = 0;
const check = (t, ok, d = '') => { n++; if (!ok) fallos++; console.log(`${ok ? '✔' : '✘'} ${n}) ${t}${ok || !d ? '' : ` — ${d}`}`); };

await db.collection('users').doc('igual').set({ uid: 'igual', displayName: 'Igual Sintética', bio: 'b', creditsBalance: 3 });
await db.collection('publicProfiles').doc('igual').set({ bio: 'b', displayName: 'Igual Sintética', uid: 'igual' }); /* otro orden */
await db.collection('users').doc('vieja').set({ uid: 'vieja', displayName: 'Nombre Nuevo', country: 'ES' });
await db.collection('publicProfiles').doc('vieja').set({ uid: 'vieja', displayName: 'Nombre Viejo', country: 'ES' });
await db.collection('users').doc('falta').set({ uid: 'falta', displayName: 'Falta Sintética', linkedAccountId: 'x' });
await db.collection('users').doc('sinuid').set({ displayName: 'Sin Uid' });
await db.collection('publicProfiles').doc('huerfana').set({ uid: 'huerfana', displayName: 'Huérfana Sintética', country: 'ES' }); /* sin users */

const correr = (...extra) => execFileSync(process.execPath, [path.join(RAIZ, 'scripts/rellenar-perfiles-publicos.mjs'), '--project', PROY, ...extra],
  { cwd: RAIZ, env: process.env, encoding: 'utf8' });

const seco = correr();
check('el dry-run cuenta 3 copias que sincronizar (la igual en otro orden NO cuenta; la huérfana SÍ), 1 sin uid y 1 huérfana', /4 perfiles · 3 copias que escribir · 1 sin uid \(se omiten\) · 1 huérfanas/.test(seco), seco);
check('el dry-run no escribe', (await db.collection('publicProfiles').doc('falta').get()).exists === false
  && (await db.collection('publicProfiles').doc('vieja').get()).data().displayName === 'Nombre Viejo'
  && (await db.collection('publicProfiles').doc('huerfana').get()).exists);

const hecho = correr('--ejecutar', '--confirmo-autorizacion');
check('la ejecución sincroniza 3 (2 escritas, 1 huérfana borrada) y verifica: 3 perfiles con uid, 3 copias, 0 desfasadas, 0 huérfanas', /Sincronizadas 3: 2 escritas · 0 ya al día \(el espejo llegó antes\) · 1 borradas · 0 fallidas/.test(hecho) && /VERIFICACIÓN: 3 perfiles con uid · 3 copias públicas · 0 desfasadas · 0 huérfanas → OK/.test(hecho), hecho);
check('la huérfana se borró (solo la copia) y ningún users se tocó', !(await db.collection('publicProfiles').doc('huerfana').get()).exists && (await db.collection('users').get()).size === 4);
const vieja = (await db.collection('publicProfiles').doc('vieja').get()).data();
const falta = (await db.collection('publicProfiles').doc('falta').get()).data();
check('las copias son la proyección con lista blanca (sin country ni linkedAccountId; sin merge)',
  vieja.displayName === 'Nombre Nuevo' && !('country' in vieja) && falta.displayName === 'Falta Sintética' && !('linkedAccountId' in falta));
check('idempotente: una segunda pasada no tiene nada que escribir', /0 copias que escribir/.test(correr()));
check('por pantalla no sale ningún id ni nombre', ![seco, hecho].some((t) => /igual|vieja|falta|sinuid|huerfana|Sintética|Nombre/.test(t)));
check('el ejecutar exige las dos banderas', (() => { try { correr('--ejecutar'); return false; } catch (e) { return e.status === 2; } })());

/* El espejo escribió después de que el relleno leyera: sincronizar relee y no lo pisa. */
await db.collection('users').doc('falta').update({ displayName: 'Cambio Reciente' });
await db.collection('publicProfiles').doc('falta').set({ uid: 'falta', displayName: 'Cambio Reciente' });
const r = await sincronizarPerfilPublico(db, 'falta');
check('con Firestore real (emulador), la sincronización relee el perfil actual y no pisa un cambio reciente',
  r === 'igual' && (await db.collection('publicProfiles').doc('falta').get()).data().displayName === 'Cambio Reciente', r);

/* Sin perfiles con uid en users, la verificación NO puede dar OK: FAILED y exit 1 (nunca OK por defecto). */
for (const d of (await db.collection('users').get()).docs) await d.ref.delete();
let vacio = ''; let estado = 0;
try { vacio = correr('--ejecutar', '--confirmo-autorizacion'); } catch (e) { vacio = String(e.stdout || ''); estado = e.status; }
check('users vacío → el relleno borra las copias huérfanas y la verificación dice FAILED (exit 1), nunca OK',
  estado === 1 && /0 perfiles con uid · 0 copias públicas · 0 desfasadas · 0 huérfanas → FAILED/.test(vacio) && /no hay perfiles con uid/.test(vacio)
  && (await db.collection('publicProfiles').get()).size === 0, vacio);

console.log(fallos ? `\n✘ ${fallos} fallos` : `\n✔ ${n}/${n}`);
process.exitCode = fallos ? 1 : 0;
