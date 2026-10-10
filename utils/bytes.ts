/*
 * Bytes sin dependencias: UTF-8, base64 y enteros de 32 bits.
 *
 * Se escriben a mano porque ni `Buffer` ni `TextEncoder` se pueden dar por
 * supuestos en todas las plataformas de Weë (Hermes, el navegador). Son
 * funciones puras: no tocan el entorno ni el disco. Las prueba
 * `functions/test/local-first-utilidades.test.mjs` contra Node.
 */

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VALOR_DE_CARACTER: Int16Array = (() => {
  const tabla = new Int16Array(128).fill(-1);
  for (let i = 0; i < ALFABETO.length; i++) tabla[ALFABETO.charCodeAt(i)] = i;
  return tabla;
})();

/** Texto → UTF-8. Un sustituto suelto se convierte en U+FFFD, como hace el estándar. */
export const utf8Codificar = (texto: string): Uint8Array => {
  const salida: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    let punto = texto.charCodeAt(i);
    if (punto >= 0xd800 && punto <= 0xdbff && i + 1 < texto.length) {
      const bajo = texto.charCodeAt(i + 1);
      if (bajo >= 0xdc00 && bajo <= 0xdfff) {
        punto = 0x10000 + ((punto - 0xd800) << 10) + (bajo - 0xdc00);
        i++;
      }
    }
    if (punto >= 0xd800 && punto <= 0xdfff) punto = 0xfffd;
    if (punto < 0x80) {
      salida.push(punto);
    } else if (punto < 0x800) {
      salida.push(0xc0 | (punto >> 6), 0x80 | (punto & 0x3f));
    } else if (punto < 0x10000) {
      salida.push(0xe0 | (punto >> 12), 0x80 | ((punto >> 6) & 0x3f), 0x80 | (punto & 0x3f));
    } else {
      salida.push(0xf0 | (punto >> 18), 0x80 | ((punto >> 12) & 0x3f), 0x80 | ((punto >> 6) & 0x3f), 0x80 | (punto & 0x3f));
    }
  }
  return Uint8Array.from(salida);
};

/** UTF-8 → texto. Una secuencia rota se sustituye por U+FFFD y se sigue con el byte siguiente. */
export const utf8Decodificar = (bytes: Uint8Array): string => {
  const partes: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    let longitud = 0;
    let punto = 0;
    if (b < 0x80) {
      partes.push(String.fromCharCode(b));
      i++;
      continue;
    }
    if (b >= 0xc2 && b < 0xe0) {
      longitud = 2;
      punto = b & 0x1f;
    } else if (b >= 0xe0 && b < 0xf0) {
      longitud = 3;
      punto = b & 0x0f;
    } else if (b >= 0xf0 && b < 0xf5) {
      longitud = 4;
      punto = b & 0x07;
    } else {
      partes.push('�');
      i++;
      continue;
    }
    let valida = i + longitud <= bytes.length;
    for (let k = 1; valida && k < longitud; k++) {
      const continuacion = bytes[i + k];
      if ((continuacion & 0xc0) !== 0x80) valida = false;
      else punto = (punto << 6) | (continuacion & 0x3f);
    }
    if (valida && ((longitud === 3 && (punto < 0x800 || (punto >= 0xd800 && punto <= 0xdfff))) || (longitud === 4 && (punto < 0x10000 || punto > 0x10ffff)))) {
      valida = false;
    }
    if (!valida) {
      partes.push('�');
      i++;
      continue;
    }
    partes.push(String.fromCodePoint(punto));
    i += longitud;
  }
  return partes.join('');
};

/** Bytes → base64 estándar con relleno. */
export const base64Codificar = (bytes: Uint8Array): string => {
  const partes: string[] = [];
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    partes.push(ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63] + ALFABETO[(n >> 6) & 63] + ALFABETO[n & 63]);
  }
  const resto = bytes.length - i;
  if (resto === 1) {
    const n = bytes[i] << 16;
    partes.push(ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63] + '==');
  } else if (resto === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    partes.push(ALFABETO[(n >> 18) & 63] + ALFABETO[(n >> 12) & 63] + ALFABETO[(n >> 6) & 63] + '=');
  }
  return partes.join('');
};

/** base64 → bytes. Lanza `Error` si el texto no es base64 válido: quien lo llama decide qué significa. */
export const base64Decodificar = (texto: string): Uint8Array => {
  if (texto.length % 4 !== 0) throw new Error('base64:longitud');
  const relleno = texto.endsWith('==') ? 2 : texto.endsWith('=') ? 1 : 0;
  const total = (texto.length / 4) * 3 - relleno;
  const salida = new Uint8Array(total);
  let p = 0;
  for (let i = 0; i < texto.length; i += 4) {
    const ultimo = i + 4 === texto.length;
    const valores = [texto.charCodeAt(i), texto.charCodeAt(i + 1), texto.charCodeAt(i + 2), texto.charCodeAt(i + 3)].map((c, k) => {
      if (ultimo && k >= 4 - relleno && texto[i + k] === '=') return 0;
      const v = c < 128 ? VALOR_DE_CARACTER[c] : -1;
      if (v < 0) throw new Error('base64:caracter');
      return v;
    });
    const n = (valores[0] << 18) | (valores[1] << 12) | (valores[2] << 6) | valores[3];
    if (p < total) salida[p++] = (n >> 16) & 255;
    if (p < total) salida[p++] = (n >> 8) & 255;
    if (p < total) salida[p++] = n & 255;
  }
  return salida;
};

/** Une trozos de bytes en uno solo, en orden. */
export const concatenar = (partes: readonly Uint8Array[]): Uint8Array => {
  const total = partes.reduce((suma, parte) => suma + parte.length, 0);
  const salida = new Uint8Array(total);
  let desplazamiento = 0;
  for (const parte of partes) {
    salida.set(parte, desplazamiento);
    desplazamiento += parte.length;
  }
  return salida;
};

/** Entero sin signo de 32 bits, big-endian. */
export const u32Codificar = (valor: number): Uint8Array => Uint8Array.from([(valor >>> 24) & 255, (valor >>> 16) & 255, (valor >>> 8) & 255, valor & 255]);

export const u32Leer = (bytes: Uint8Array, desplazamiento: number): number =>
  ((bytes[desplazamiento] << 24) >>> 0) + ((bytes[desplazamiento + 1] << 16) | (bytes[desplazamiento + 2] << 8) | bytes[desplazamiento + 3]);

/** Igualdad byte a byte. */
export const iguales = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};
