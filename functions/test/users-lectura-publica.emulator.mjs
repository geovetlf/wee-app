/*
 * DIAGNÓSTICO REPRODUCIBLE (Fase 1, 2026-10-07): ¿QUIÉN PUEDE LEER `users/{id}`?
 *
 * Solo lectura de un documento SINTÉTICO en un emulador `demo-*` (Firebase se niega a hablar con nada real con ese
 * id). No cambia ninguna regla: carga el archivo de reglas que se le pase —el de main o el blob desplegado de
 * c3515b3— y comprueba si una petición SIN SESIÓN puede (a) leer un perfil por id y (b) LISTAR la colección.
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   git show c3515b3:firestore.rules > %TEMP%/reglas-c3515b3.rules
 *   firebase emulators:exec --only firestore --project demo-wee-reglas \
 *     "node functions/test/users-lectura-publica.emulator.mjs firestore.rules"
 *
 * Sale con 0 si el diagnóstico se pudo hacer, e imprime EXPUESTO / CERRADO. No es una prueba de «verde»: documenta.
 */
import fs from 'node:fs';

const PROY = 'demo-wee-reglas';
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
const reglas = fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8');

const put = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
});
if (put.status !== 200) { console.log(`no se pudieron cargar las reglas: HTTP ${put.status}`); process.exit(2); }

/* Siembra como «owner» del emulador (se salta las reglas): un perfil con los campos que la app guarda de verdad. */
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const campos = {
  uid: { stringValue: 'sintetico-1' }, profileType: { stringValue: 'real' }, displayName: { stringValue: 'Persona Sintética' },
  email: { stringValue: 'sintetico@ejemplo.test' }, country: { stringValue: 'ES' }, birthDate: { stringValue: '2000-01-01' },
};
const sem = await fetch(`${base}/users?documentId=sintetico-1`, { method: 'POST', headers: owner, body: JSON.stringify({ fields: campos }) });
if (sem.status !== 200) { console.log(`siembra fallida: HTTP ${sem.status}`); process.exit(2); }

const leer = await fetch(`${base}/users/sintetico-1`);
const lista = await fetch(`${base}/users?pageSize=50`);
const doc = leer.status === 200 ? await leer.json() : null;
const visibles = doc ? Object.keys(doc.fields || {}).sort() : [];
console.log(`reglas: ${process.argv[2] || 'firestore.rules'}`);
console.log(`(a) GET users/sintetico-1 sin sesión → HTTP ${leer.status}${visibles.length ? ` · campos visibles: ${visibles.join(', ')}` : ''}`);
console.log(`(b) LIST users sin sesión           → HTTP ${lista.status}`);
console.log(leer.status === 200 || lista.status === 200 ? 'EXPUESTO: lectura no autenticada permitida' : 'CERRADO: lectura no autenticada denegada');
process.exitCode = 0; // sin process.exit: en Windows cortar con fetch abiertos tumba node (0xC0000409)
