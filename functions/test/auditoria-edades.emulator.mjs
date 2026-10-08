/*
 * AUDITORÍA DE EDADES (scripts/auditoria-edades.mjs) — contra el emulador, con datos SINTÉTICOS en un proyecto demo-*.
 *
 * Siembra una cuenta de cada clase (A válida, B menor, C inválida, D futura, E ausente), una cuenta con dos perfiles
 * (uno sin fecha y otro adulto → A), un Perfil Weë (no cuenta) y un birthDate heredado; ejecuta el script y comprueba
 * los conteos, que no escribió nada y que por pantalla no sale ningún id ni fecha.
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/auditoria-edades.emulator.mjs"
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();

let n = 0; let fallos = 0;
const check = (t, ok, d = '') => { n++; if (!ok) fallos++; console.log(`${ok ? '✔' : '✘'} ${n}) ${t}${ok || !d ? '' : ` — ${d}`}`); };

const perfiles = [
  ['a1', { uid: 'cuentaA', profileType: 'real', country: 'ES' }, { birthDate: '1990-01-01' }],
  ['b1', { uid: 'cuentaB', profileType: 'real', country: 'ES' }, { birthDate: '2015-06-01' }],
  ['c1', { uid: 'cuentaC', profileType: 'real', country: 'ES' }, { birthDate: '1990-02-30' }],
  ['d1', { uid: 'cuentaD', profileType: 'real', country: 'ES' }, { birthDate: '2999-01-01' }],
  ['e1', { uid: 'cuentaE', profileType: 'real', country: 'ES', birthDate: '1980-01-01' }, null], /* solo heredado */
  ['m1', { uid: 'multi', profileType: 'real', country: 'MX' }, null],
  ['m2', { uid: 'multi', profileType: 'real', country: 'MX' }, { birthDate: '1985-05-05' }],
  ['hidi_cuentaA', { uid: 'hidi_cuentaA', profileType: 'hidi', linkedAccountId: 'cuentaA' }, null],
];
for (const [id, pub, priv] of perfiles) {
  await db.collection('users').doc(id).set(pub);
  if (priv) await db.collection('users').doc(id).collection('private').doc('account').set(priv);
}
const antes = (await db.collection('users').get()).docs.map((d) => JSON.stringify(d.data())).sort().join('|');

const ids = path.join(os.tmpdir(), `auditoria-edades-${process.pid}.json`);
const out = execFileSync(process.execPath, [path.join(RAIZ, 'scripts/auditoria-edades.mjs'), '--project', PROY, '--json', '--ids', ids],
  { env: process.env, encoding: 'utf8' });
const json = JSON.parse(out.trim().split('\n').pop());
check('6 cuentas con Perfil Real (el Perfil Weë no cuenta; dos perfiles de una cuenta = una)', json.cuentas === 6, JSON.stringify(json));
check('private/account: A 2 (cuentaA, multi) · B 1 · C 1 · D 1 · E 1',
  JSON.stringify(json.privada) === JSON.stringify({ A: 2, B: 1, C: 1, D: 1, E: 1 }), JSON.stringify(json.privada));
check('heredado: solo cuentaE lo tiene (A 1), el resto E 5', JSON.stringify(json.heredada) === JSON.stringify({ A: 1, B: 0, C: 0, D: 0, E: 5 }), JSON.stringify(json.heredada));
check('combinada: la cuenta sin private pero con heredado cuenta como A informativa', json.combinada.A === 3 && json.combinada.E === 0, JSON.stringify(json.combinada));
const pantalla = out.split('\n').slice(0, -1).join('\n');
check('por pantalla no sale ningún id ni ninguna fecha', !/cuenta[A-E]|multi|\d{4}-\d{2}-\d{2}/.test(pantalla), pantalla);
const f = JSON.parse(fs.readFileSync(ids, 'utf8'));
check('el archivo local lleva SOLO ids internos de B/C/D/E (sin fechas ni nombres)',
  JSON.stringify(f.ids) === JSON.stringify({ B: ['cuentaB'], C: ['cuentaC'], D: ['cuentaD'], E: ['cuentaE'] }) && !/\d{4}-\d{2}-\d{2}"/.test(JSON.stringify(f.ids)));
fs.rmSync(ids, { force: true });
const despues = (await db.collection('users').get()).docs.map((d) => JSON.stringify(d.data())).sort().join('|');
check('no escribió nada en users', antes === despues);
check('el script no tiene ninguna operación de escritura en Firestore',
  !/\.(update|delete|add|batch|create|runTransaction|bulkWriter)\(|ref\.set\(|\.doc\([^)]*\)\.set\(/.test(fs.readFileSync(path.join(RAIZ, 'scripts/auditoria-edades.mjs'), 'utf8')));

console.log(`\n${fallos ? '✘' : '✔'} auditoría de edades: ${n - fallos}/${n}`);
process.exitCode = fallos ? 1 : 0;
