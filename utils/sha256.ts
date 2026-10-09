/*
 * SHA-256 en TypeScript puro (FIPS 180-4), sin dependencias.
 *
 * Existe para que el manifiesto de un bundle lleve su huella sin añadir
 * `expo-crypto`. Procesa el contenido en bloques de 64 bytes sin copiarlo
 * entero. RENDIMIENTO: no medido en el teléfono; con archivos grandes puede
 * ser lento frente a un digest nativo (decisión pendiente, ver
 * docs/LOCAL-FIRST-AUDITORIA.md §6). La prueba lo contrasta con node:crypto.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const H_INICIAL = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

const rotar = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** Digest SHA-256 de `datos`: 32 bytes. */
export const sha256 = (datos: Uint8Array): Uint8Array => {
  const h = new Uint32Array(H_INICIAL);
  const w = new Uint32Array(64);

  const comprimir = (bloque: Uint8Array, inicio: number): void => {
    for (let t = 0; t < 16; t++) {
      const p = inicio + t * 4;
      w[t] = ((bloque[p] << 24) | (bloque[p + 1] << 16) | (bloque[p + 2] << 8) | bloque[p + 3]) >>> 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotar(w[t - 15], 7) ^ rotar(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotar(w[t - 2], 17) ^ rotar(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];
    for (let t = 0; t < 64; t++) {
      const sigma1 = rotar(e, 6) ^ rotar(e, 11) ^ rotar(e, 25);
      const eleccion = (e & f) ^ (~e & g);
      const t1 = (hh + sigma1 + eleccion + K[t] + w[t]) >>> 0;
      const sigma0 = rotar(a, 2) ^ rotar(a, 13) ^ rotar(a, 22);
      const mayoria = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (sigma0 + mayoria) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  };

  const enteros = datos.length - (datos.length % 64);
  for (let i = 0; i < enteros; i += 64) comprimir(datos, i);

  // Relleno: el último bloque lleva el 0x80, ceros y la longitud en bits (64 bits, big-endian).
  const resto = datos.length - enteros;
  const colaLongitud = resto + 9 <= 64 ? 64 : 128;
  const cola = new Uint8Array(colaLongitud);
  cola.set(datos.subarray(enteros));
  cola[resto] = 0x80;
  const bits = datos.length * 8;
  const vista = new DataView(cola.buffer);
  vista.setUint32(colaLongitud - 8, Math.floor(bits / 0x100000000));
  vista.setUint32(colaLongitud - 4, bits >>> 0);
  for (let i = 0; i < colaLongitud; i += 64) comprimir(cola, i);

  const salida = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    salida[i * 4] = (h[i] >>> 24) & 255;
    salida[i * 4 + 1] = (h[i] >>> 16) & 255;
    salida[i * 4 + 2] = (h[i] >>> 8) & 255;
    salida[i * 4 + 3] = h[i] & 255;
  }
  return salida;
};

/** Digest SHA-256 en hexadecimal minúscula: 64 caracteres. */
export const sha256Hex = (datos: Uint8Array): string => {
  let hex = '';
  for (const byte of sha256(datos)) hex += byte.toString(16).padStart(2, '0');
  return hex;
};
