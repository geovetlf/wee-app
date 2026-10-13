/*
 * DOCUMENTOS PDF DE LAS PUBLICACIONES — LAS REGLAS DE STORAGE, EJECUTADAS (R9 · D, aprobado por el dueño el 2026-10-13).
 *
 * `storage.rules` → `match /documents/posts/{userId}/{fileName}`: crea SOLO la cara que firma (la real `<uid>` o la Weë
 * `hidi_<uid>` de ESTA cuenta), con un nombre nuevo, solo `application/pdf` y hasta 10 MB; lectura pública como las
 * imágenes de posts; nadie cambia ni borra desde la app. Esta suite lo intenta con el emulador de Storage de verdad, por
 * HTTP y sin SDK de cliente (como `almacen-reglas-sobrescritura.emulator.mjs`):
 *
 *   A · la dueña sube un PDF (real y cara Weë) ✔ · justo 10 MB ✔ (CONTROL del límite)
 *   B · otra persona ✘ · sin sesión ✘ · la cara Weë de OTRA cuenta ✘
 *   C · no-PDF (image/png, text/plain) ✘ · más de 10 MB ✘
 *   D · sobrescribir ✘ · borrar ✘ · cambiar metadatos ✘
 *   E · leer: cualquiera (también sin sesión) ✔ · CONTROL: una ruta que no es de documentos sigue cerrada ✘
 *
 * Con `WEE_STORAGE_RULES_FILE=<ruta>` prueba OTRO fichero (mutaciones): una regla rota tiene que hacer FALLAR la suite.
 *
 * No está en `npm test`: necesita el emulador de Storage (y Java 21). Lo lanza el corredor de emuladores (nivel 2):
 *
 *   JAVA21_HOME=C:/Users/Geovet/AppData/Local/wee-tools/jdk-21.0.12.1+1 node functions/test/_emuladores.mjs --solo documentos-reglas
 *
 * o directamente, desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only storage --project demo-wee "node functions/test/documentos-reglas.emulator.mjs"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199';
const objetos = `http://${storageHost}/v0/b/${BUCKET}/o`;
const RUTA_REGLAS = process.env.WEE_STORAGE_RULES_FILE ? path.resolve(process.env.WEE_STORAGE_RULES_FILE) : path.join(RAIZ, 'storage.rules');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
    user_id: uid, sub: uid, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'custom' },
  }) + '.';
};
const cabeceras = (uid, extra = {}) => ({ ...(uid ? { Authorization: `Firebase ${sesion(uid)}` } : {}), ...extra });
const azar = () => Math.random().toString(36).slice(2, 8);
const nombre = (cara) => `documents/posts/${cara}/${Date.now()}-${azar()}.pdf`;
const PDF = Buffer.from('%PDF-1.7\n%prueba\n');

const subir = async (uid, ruta, { contentType = 'application/pdf', cuerpo = PDF } = {}) => {
  const limite = 'wee-documentos';
  const bytes = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify({ name: ruta, contentType })}\r\n--${limite}\r\nContent-Type: ${contentType}\r\n\r\n`),
    cuerpo,
    Buffer.from(`\r\n--${limite}--\r\n`),
  ]);
  const res = await fetch(`${objetos}?name=${encodeURIComponent(ruta)}`, {
    method: 'POST',
    headers: cabeceras(uid, { 'X-Goog-Upload-Protocol': 'multipart', 'Content-Type': `multipart/related; boundary=${limite}` }),
    body: bytes,
  });
  return res.status;
};
const leer = async (uid, ruta) => (await fetch(`${objetos}/${encodeURIComponent(ruta)}?alt=media`, { headers: cabeceras(uid) })).status;
const borrar = async (uid, ruta) => (await fetch(`${objetos}/${encodeURIComponent(ruta)}`, { method: 'DELETE', headers: cabeceras(uid) })).status;
const cambiar = async (uid, ruta) => (await fetch(`${objetos}/${encodeURIComponent(ruta)}`, {
  method: 'PATCH', headers: cabeceras(uid, { 'Content-Type': 'application/json' }), body: JSON.stringify({ metadata: { intrusa: 'si' } }),
})).status;
const espera = (nombreCheck, esperado, status) => check(nombreCheck, (status < 400) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);

const cargado = (await fetch(`http://${storageHost}/internal/setRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'storage.rules', content: fs.readFileSync(RUTA_REGLAS, 'utf8') }] } }),
})).status;
console.log(`\nReglas bajo prueba: ${RUTA_REGLAS}`);
check('las reglas se cargan en el emulador', cargado === 200, `HTTP ${cargado}`);
if (cargado !== 200) process.exit(1);

console.log('\n── A · la dueña sube ──');
const suyo = nombre('uAna');
espera('A1) la dueña sube un PDF a su carpeta', 'PERMITE', await subir('uAna', suyo));
espera('A2) y a la de su cara Weë (hidi_uAna)', 'PERMITE', await subir('uAna', nombre('hidi_uAna')));
espera('A3) CONTROL del límite: justo 10 MB entra', 'PERMITE', await subir('uAna', nombre('uAna'), { cuerpo: Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024 - PDF.length)]) }));

console.log('\n── B · nadie más ──');
espera('B1) otra persona no sube a la carpeta de uAna', 'DENIEGA', await subir('uBea', nombre('uAna')));
espera('B2) sin sesión, nadie sube', 'DENIEGA', await subir(null, nombre('uAna')));
espera('B3) ni a la cara Weë de OTRA cuenta', 'DENIEGA', await subir('uBea', nombre('hidi_uAna')));

console.log('\n── C · solo PDF y hasta 10 MB ──');
espera('C1) una imagen no entra', 'DENIEGA', await subir('uAna', nombre('uAna'), { contentType: 'image/png' }));
espera('C2) un texto tampoco', 'DENIEGA', await subir('uAna', nombre('uAna'), { contentType: 'text/plain' }));
espera('C3) un PDF de más de 10 MB tampoco', 'DENIEGA', await subir('uAna', nombre('uAna'), { cuerpo: Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)]) }));

console.log('\n── D · ni se sobrescribe, ni se cambia, ni se borra ──');
espera('D1) la dueña no sobrescribe su PDF', 'DENIEGA', await subir('uAna', suyo));
espera('D2) ni lo borra', 'DENIEGA', await borrar('uAna', suyo));
espera('D3) ni cambia sus metadatos', 'DENIEGA', await cambiar('uAna', suyo));

console.log('\n── E · lectura pública, como las publicaciones ──');
espera('E1) cualquiera con sesión lo lee', 'PERMITE', await leer('uBea', suyo));
espera('E2) y sin sesión también (toda publicación de Weë es pública)', 'PERMITE', await leer(null, suyo));
espera('E3) CONTROL: fuera de documents/posts, Storage sigue cerrado', 'DENIEGA', await subir('uAna', `documents/otros/uAna/${Date.now()}.pdf`));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien: documentos de posts, solo de su dueña, solo PDF y hasta 10 MB');
process.exit(failures ? 1 : 0);
