/**
 * LÍNEA B1 (local-first) · utilidades puras: bytes, UTF-8, base64, u32 y SHA-256.
 *
 * Cada función se contrasta con Node (node:crypto y Buffer), que es la
 * referencia que no se puede falsear desde el cliente. Carga los fuentes con
 * `_cargador-local-first.mjs` (transpila los .ts con el `typescript` de functions/).
 *
 *   node functions/test/local-first-utilidades.test.mjs
 */
import crypto from 'node:crypto';
import { importarFuente } from './_cargador-local-first.mjs';

const bytes = await importarFuente('utils/bytes.ts');
const sha = await importarFuente('utils/sha256.ts');

let fallos = 0;
const check = (nombre, cond, extra = '') => {
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const aBytes = (buffer) => new Uint8Array(buffer);

/* 1. SHA-256 frente a node:crypto en las longitudes que cambian el relleno. */
const longitudes = [0, 1, 3, 31, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1000];
let sinCoincidir = null;
for (const n of longitudes) {
  const datos = crypto.randomBytes(n);
  const esperado = crypto.createHash('sha256').update(datos).digest('hex');
  if (sha.sha256Hex(aBytes(datos)) !== esperado && sinCoincidir === null) sinCoincidir = n;
}
check('1) sha256 coincide con node:crypto en las longitudes de borde del relleno', sinCoincidir === null, sinCoincidir === null ? `${longitudes.length} longitudes` : `falla en ${sinCoincidir} bytes`);

/* 2. Vectores oficiales (FIPS 180-2): "abc" y la cadena vacía. */
check('2) vector "abc"', sha.sha256Hex(bytes.utf8Codificar('abc')) === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
check('3) vector de la cadena vacía', sha.sha256Hex(new Uint8Array(0)) === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

/* 4. Un archivo de 1 MB: el bloque final y los bloques intermedios. */
const megaByte = crypto.randomBytes(1024 * 1024);
check('4) sha256 de 1 MB coincide con node:crypto', sha.sha256Hex(aBytes(megaByte)) === crypto.createHash('sha256').update(megaByte).digest('hex'));

/* 5. base64: codificar igual que Buffer y decodificar lo que Buffer codifica. */
let base64OK = true;
for (let n = 0; n <= 40; n++) {
  const datos = crypto.randomBytes(n);
  const texto = datos.toString('base64');
  if (bytes.base64Codificar(aBytes(datos)) !== texto) base64OK = false;
  if (Buffer.from(bytes.base64Decodificar(texto)).toString('hex') !== datos.toString('hex')) base64OK = false;
}
check('5) base64 coincide con Buffer en longitudes 0..40 (ida y vuelta)', base64OK);
let base64Rechaza = 0;
for (const malo of ['abc', 'ab!d', 'ab=c']) {
  try {
    bytes.base64Decodificar(malo);
  } catch {
    base64Rechaza++;
  }
}
check('6) base64 rechaza texto no válido (longitud, carácter, relleno mal puesto)', base64Rechaza === 3, `${base64Rechaza}/3`);

/* 7. UTF-8: acentos, emoji (pares sustitutos), CJK y un sustituto suelto. */
const textos = ['Mi restaurante', 'canción de verano', 'Weë · proyecto', '📁 carpeta', '日本語のテキスト', 'a\uD83D'];
let utf8OK = true;
for (const t of textos) {
  if (Buffer.from(bytes.utf8Codificar(t)).toString('hex') !== Buffer.from(t, 'utf8').toString('hex')) utf8OK = false;
  if (bytes.utf8Decodificar(aBytes(Buffer.from(t, 'utf8'))) !== Buffer.from(t, 'utf8').toString('utf8')) utf8OK = false;
}
check('7) UTF-8 coincide con Buffer (acentos, emoji, CJK y sustituto suelto)', utf8OK);

/* 8. UTF-8 de bytes rotos: no lanza y deja U+FFFD. */
const roto = bytes.utf8Decodificar(Uint8Array.from([0x61, 0xc3, 0x62, 0xff]));
check('8) bytes UTF-8 rotos se sustituyen por U+FFFD sin lanzar', roto === 'a�b�', JSON.stringify(roto));

/* 9. u32 big-endian y concatenación. */
const u = bytes.u32Codificar(0x01020304);
check('9) u32 big-endian ida y vuelta', bytes.u32Leer(u, 0) === 0x01020304 && u[0] === 1 && u[3] === 4);
check('10) u32 leído sin signo (bit alto activo)', bytes.u32Leer(Uint8Array.from([0xff, 0xff, 0xff, 0xff]), 0) === 4294967295);
const une = bytes.concatenar([Uint8Array.from([1, 2]), new Uint8Array(0), Uint8Array.from([3])]);
check('11) concatenar respeta el orden y acepta trozos vacíos', Buffer.from(une).toString('hex') === '010203');
check('12) iguales distingue longitud y contenido', bytes.iguales(Uint8Array.from([1, 2]), Uint8Array.from([1, 2])) && !bytes.iguales(Uint8Array.from([1, 2]), Uint8Array.from([1, 3])) && !bytes.iguales(Uint8Array.from([1]), Uint8Array.from([1, 0])));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
