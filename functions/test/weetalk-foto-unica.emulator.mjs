/*
 * C-2 · LA COMPROBACIÓN DE OTROS USOS DE LA FOTO ÚNICA, CONTRA FIRESTORE DE VERDAD.
 *
 * `usadoPorOtrosEn` decide si `burnViewOnce` puede borrar el objeto. Las pruebas de dobles
 * (`weetalk-view-once.test.mjs`) la sustituyen por un booleano; esta suite ejerce las consultas reales:
 *
 *   · el índice (`mediaObjects`) y las fichas vivas (`assets`), de cualquier cuenta;
 *   · otro mensaje de la misma conversación con la MISMA dirección y con OTRO token sobre la misma clave. El
 *     segundo caso es el rango por prefijo: sin el U+F8FF de la cota superior no encuentra nunca el otro token
 *     (es el fallo que esta suite cazó: las pruebas de dobles pasaban con el rango vacío);
 *   · un objeto que solo comparte el principio del nombre (`foto.jpg` frente a `foto.jpg2`) NO cuenta;
 *   · el propio mensaje NO cuenta como otro uso;
 *   · una base de datos que falla PROTEGE.
 *
 * No está en `npm test`: necesita el emulador de Firestore.
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/weetalk-foto-unica.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: BUCKET });
const db = admin.firestore();

const { usadoPorOtrosEn } = lib('social/weetalk.js');
const usado = usadoPorOtrosEn(db, BUCKET);

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${!cond && extra ? ` · ${extra}` : ''}`);
};

/* Cada escenario tiene su conversación y su clave: no depende del orden ni del estado de los demás. */
let seq = 0;
const nueva = (prefijo) => `${prefijo}${Date.now().toString(36)}${seq++}`;
const clave = (c, archivo = 'foto.jpg') => `users/uAna/weetalk/${c}/${archivo}`;
const urlDe = (objectKey, token) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectKey)}?alt=media&token=${token}`;
const conversacion = (id) => db.collection('conversations').doc(id).set({ participants: ['uAna', 'uBea'] });
const mensaje = (c, id, datos) => db.collection('conversations').doc(c).collection('messages').doc(id).set(datos);
const fotoUnica = (url) => ({ type: 'image', viewOnce: true, senderId: 'uAna', imageUrl: url });
const fotoNormal = (url) => ({ type: 'image', viewOnce: false, senderId: 'uAna', imageUrl: url });

/* 1 · Sin otros usos: la propia foto única no cuenta como uso. */
const c1 = nueva('c');
await conversacion(c1);
await mensaje(c1, 'm1', fotoUnica(urlDe(clave(c1), 't1')));
check('1) sin otros usos, la propia foto única no cuenta como uso',
  (await usado(clave(c1), urlDe(clave(c1), 't1'), c1, 'm1')) === false);

/* 2 · Otro mensaje con la MISMA dirección exacta: consulta por igualdad. */
const c2 = nueva('c');
await conversacion(c2);
await mensaje(c2, 'm1', fotoUnica(urlDe(clave(c2), 't1')));
await mensaje(c2, 'm2', fotoNormal(urlDe(clave(c2), 't1')));
check('2) otro mensaje con la MISMA dirección exacta cuenta como uso',
  (await usado(clave(c2), urlDe(clave(c2), 't1'), c2, 'm1')) === true);

/* 3 · Otro mensaje con OTRO token sobre la MISMA clave: el rango por prefijo (el caso que el fallo dejaba sin ver). */
const c3 = nueva('c');
await conversacion(c3);
await mensaje(c3, 'm1', fotoUnica(urlDe(clave(c3), 't1')));
await mensaje(c3, 'm2', fotoNormal(urlDe(clave(c3), 't2')));
check('3) otro mensaje con OTRO token sobre la misma clave cuenta como uso (rango por prefijo)',
  (await usado(clave(c3), urlDe(clave(c3), 't1'), c3, 'm1')) === true);

/* 4 · Un objeto que solo comparte el principio del nombre NO es el mismo: el `?` que sigue a la clave lo impide. */
const c4 = nueva('c');
await conversacion(c4);
await mensaje(c4, 'm1', fotoUnica(urlDe(clave(c4), 't1')));
await mensaje(c4, 'm2', fotoNormal(urlDe(clave(c4, 'foto.jpg2'), 't9')));
check('4) un objeto que solo comparte el principio del nombre (foto.jpg2) NO cuenta',
  (await usado(clave(c4), urlDe(clave(c4), 't1'), c4, 'm1')) === false);

/* 5 · Límite conocido: una referencia desde OTRA conversación no se mira. Mirarla exigiría una consulta de grupo
 *     de colección, con su índice; ese índice no se despliega en esta fase. Se fija aquí para que un cambio sea visible. */
const c5 = nueva('c');
const c5otra = nueva('c');
await conversacion(c5);
await conversacion(c5otra);
await mensaje(c5, 'm1', fotoUnica(urlDe(clave(c5), 't1')));
await mensaje(c5otra, 'm7', fotoNormal(urlDe(clave(c5), 't1')));
check('5) límite conocido: una referencia desde OTRA conversación no se mira (sin consulta de grupo de colección)',
  (await usado(clave(c5), urlDe(clave(c5), 't1'), c5, 'm1')) === false);

/* 6 · El índice: un objeto registrado en `mediaObjects` es material de alguien. */
const c6 = nueva('c');
await conversacion(c6);
await mensaje(c6, 'm1', fotoUnica(urlDe(clave(c6), 't1')));
await db.collection('mediaObjects').doc(`mo-${c6}`).set({ objectKey: clave(c6) });
check('6) un objeto registrado en el índice (mediaObjects) cuenta como uso',
  (await usado(clave(c6), urlDe(clave(c6), 't1'), c6, 'm1')) === true);

/* 7 · Una ficha viva con esa clave, de cualquier cuenta. */
const c7 = nueva('c');
await conversacion(c7);
await mensaje(c7, 'm1', fotoUnica(urlDe(clave(c7), 't1')));
await db.collection('assets').doc(`viva-${c7}`).set({ status: 'active', storageRef: { objectKey: clave(c7) } });
check('7) una ficha viva con esa clave, de cualquier cuenta, cuenta como uso',
  (await usado(clave(c7), urlDe(clave(c7), 't1'), c7, 'm1')) === true);

/* 8 · Una ficha borrada no cuenta. */
const c8 = nueva('c');
await conversacion(c8);
await mensaje(c8, 'm1', fotoUnica(urlDe(clave(c8), 't1')));
await db.collection('assets').doc(`borrada-${c8}`).set({ status: 'deleted', storageRef: { objectKey: clave(c8) } });
check('8) una ficha borrada no cuenta como uso',
  (await usado(clave(c8), urlDe(clave(c8), 't1'), c8, 'm1')) === false);

/* 9 · Con 25 o más fichas sobre la clave no se pueden mirar todas: protege, aunque estén borradas. */
const c9 = nueva('c');
await conversacion(c9);
await mensaje(c9, 'm1', fotoUnica(urlDe(clave(c9), 't1')));
const lote = db.batch();
for (let i = 0; i < 25; i++) {
  lote.set(db.collection('assets').doc(`lote-${c9}-${i}`), { status: 'deleted', storageRef: { objectKey: clave(c9) } });
}
await lote.commit();
check('9) con 25 o más fichas sobre la clave no se pueden mirar todas: protege',
  (await usado(clave(c9), urlDe(clave(c9), 't1'), c9, 'm1')) === true);

/* 10 · Una base de datos que falla: lo desconocido cuenta como uso. El error se silencia solo para esta comprobación. */
const roto = usadoPorOtrosEn({ collection() { throw new Error('base caída'); } }, BUCKET);
const errorOriginal = console.error;
console.error = () => {};
const resultadoRoto = await roto(clave(c1), urlDe(clave(c1), 't1'), c1, 'm1');
console.error = errorOriginal;
check('10) un error de la base de datos protege: lo desconocido cuenta como uso', resultadoRoto === true);

console.log(`\n${n - fallos}/${n} ✔${fallos ? ` · ${fallos} ✘` : ''}`);
process.exit(fallos ? 1 : 0);
