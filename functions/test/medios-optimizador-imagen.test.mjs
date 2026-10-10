/**
 * MC-4 · OPTIMIZADOR DE MEDIOS — ORIENTACIÓN EXIF Y PRIVACIDAD DEL PROCESADOR.
 *
 * Lo que se prueba aquí es la corrección del procesador de imagen que ya existe
 * (`functions/src/media/procesador.ts`), no un módulo nuevo:
 *
 *   A · Los fixtures: un JPEG con orientación EXIF 6 y GPS falso, y un PNG con alfa.
 *   B · La orientación se aplica ANTES de redimensionar: el derivado sale de pie.
 *   C · Lo que sale no lleva ningún bloque EXIF: ni GPS ni etiqueta de orientación.
 *   D · La transparencia sobrevive al redimensionado en WebP.
 *   E · El original no se modifica, y un fallo sigue siendo un error tipado.
 *
 * Todas las imágenes se generan AQUÍ: píxeles sintéticos y un GPS falso. No se lee
 * ningún fichero del disco ni se llama a ningún proveedor.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const { crearProcesadorDeImagen } = require(path.resolve(RAIZ, 'functions/lib/media/procesador.js'));
const { transformacionValida } = require(path.resolve(RAIZ, 'functions/lib/core/media/proceso.js'));

let n = 0;
let failures = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Fixtures sintéticos ──────────────────────────────────────────────────────── */

/** Degradado determinista: la misma imagen en cada ejecución. */
const degradado = (ancho, alto) => {
  const b = Buffer.alloc(ancho * alto * 3);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const o = (y * ancho + x) * 3;
      b[o] = Math.round((x * 255) / ancho);
      b[o + 1] = Math.round((y * 255) / alto);
      b[o + 2] = (x + y) & 255;
    }
  }
  return b;
};

/**
 * EXIF mínimo, en TIFF little-endian: IFD0 con Orientation (0x0112) y GPSInfo
 * (0x8825), y un IFD GPS con latitud y longitud FALSAS.
 */
const exifConOrientacionYGps = (orientacion) => {
  const b = Buffer.alloc(8 + 30 + 54 + 48);
  b.write('II', 0, 'ascii');
  b.writeUInt16LE(42, 2);
  b.writeUInt32LE(8, 4);
  let o = 8;
  b.writeUInt16LE(2, o); o += 2;
  b.writeUInt16LE(0x0112, o); b.writeUInt16LE(3, o + 2); b.writeUInt32LE(1, o + 4); b.writeUInt16LE(orientacion, o + 8); o += 12;
  b.writeUInt16LE(0x8825, o); b.writeUInt16LE(4, o + 2); b.writeUInt32LE(1, o + 4); b.writeUInt32LE(38, o + 8); o += 12;
  b.writeUInt32LE(0, o);
  o = 38;
  b.writeUInt16LE(4, o); o += 2;
  b.writeUInt16LE(0x0001, o); b.writeUInt16LE(2, o + 2); b.writeUInt32LE(2, o + 4); b.write('N\0', o + 8, 'binary'); o += 12;
  b.writeUInt16LE(0x0002, o); b.writeUInt16LE(5, o + 2); b.writeUInt32LE(3, o + 4); b.writeUInt32LE(92, o + 8); o += 12;
  b.writeUInt16LE(0x0003, o); b.writeUInt16LE(2, o + 2); b.writeUInt32LE(2, o + 4); b.write('E\0', o + 8, 'binary'); o += 12;
  b.writeUInt16LE(0x0004, o); b.writeUInt16LE(5, o + 2); b.writeUInt32LE(3, o + 4); b.writeUInt32LE(116, o + 8); o += 12;
  b.writeUInt32LE(0, o);
  [40, 1, 25, 1, 3000, 100, 3, 1, 42, 1, 0, 1].forEach((v, i) => b.writeUInt32LE(v, 92 + i * 4));
  return b;
};

/** Inserta un segmento APP1 (EXIF) justo después del SOI de un JPEG. */
const insertarExif = (jpeg, tiff) => {
  const cuerpo = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const longitud = cuerpo.length + 2;
  const marcador = Buffer.from([0xff, 0xe1, (longitud >> 8) & 0xff, longitud & 0xff]);
  return Buffer.concat([jpeg.subarray(0, 2), marcador, cuerpo, jpeg.subarray(2)]);
};

/** JPEG apaisado de 2400×1800 almacenado con la orientación EXIF pedida (o sin ella, con 1). */
const jpegConOrientacion = async (orientacion) => {
  const base = await sharp(degradado(2400, 1800), { raw: { width: 2400, height: 1800, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
  return insertarExif(base, exifConOrientacionYGps(orientacion));
};

/** PNG de 400×300 con un marco transparente y un interior opaco. */
const pngConAlfa = async () => {
  const w = 400;
  const h = 300;
  const b = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const dentro = x >= 40 && x < w - 40 && y >= 30 && y < h - 30;
      b[o] = 200; b[o + 1] = 60; b[o + 2] = 30;
      b[o + 3] = dentro ? 255 : 0;
    }
  }
  return sharp(b, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
};

const T400 = Object.freeze({ tipo: 'thumbnail', ancho: 400, alto: 400, ajuste: 'dentro', formato: 'webp', calidad: 75 });
const T300_ALFA = Object.freeze({ tipo: 'preview', ancho: 300, alto: 300, ajuste: 'dentro', formato: 'webp', calidad: 80 });

const proc = crearProcesadorDeImagen();

/* ═══ A · LOS FIXTURES ════════════════════════════════════════════════════════ */
console.log('\n── A · Los fixtures (el control de la prueba) ──');
const jpeg6 = await jpegConOrientacion(6);
const metaJpeg6 = await sharp(jpeg6).metadata();
check('A · el origen se lee como apaisado 2400×1800 con orientación EXIF 6',
  metaJpeg6.width === 2400 && metaJpeg6.height === 1800 && metaJpeg6.orientation === 6,
  `${metaJpeg6.width}×${metaJpeg6.height}, orientación ${metaJpeg6.orientation}`);
check('A · el origen lleva bloque EXIF con puntero al GPS (la prueba tiene dientes)',
  Buffer.isBuffer(metaJpeg6.exif) && metaJpeg6.exif.includes(Buffer.from([0x25, 0x88])));
check('A · el contrato reconoce la transformación de referencia', transformacionValida(T400));

/* ═══ B · LA ORIENTACIÓN SE APLICA ANTES DE REDIMENSIONAR ════════════════════ */
console.log('\n── B · La orientación se aplica ──');
const copiaJpeg6 = Buffer.from(jpeg6);
const r6 = await proc.procesar({ cuerpo: jpeg6, contentType: 'image/jpeg', transformacion: T400 });
check('B · el procesador devuelve un derivado', r6.ok === true);
const m6 = r6.ok ? await sharp(r6.resultado.cuerpo).metadata() : {};
check('B · la salida sale de pie: 300×400, con el ancho y el alto intercambiados respecto al origen',
  m6.width === 300 && m6.height === 400, `salida ${m6.width}×${m6.height}`);
check('B · el origen es apaisado y el derivado es vertical', metaJpeg6.width > metaJpeg6.height && m6.height > m6.width);
check('B · las dimensiones que informa el procesador coinciden con la salida real',
  r6.ok && r6.resultado.ancho === 300 && r6.resultado.alto === 400);

const jpeg8 = await jpegConOrientacion(8);
const r8 = await proc.procesar({ cuerpo: jpeg8, contentType: 'image/jpeg', transformacion: T400 });
const m8 = r8.ok ? await sharp(r8.resultado.cuerpo).metadata() : {};
check('B · la orientación 8 también sale de pie', m8.width === 300 && m8.height === 400, `salida ${m8.width}×${m8.height}`);

const jpeg1 = await jpegConOrientacion(1);
const r1 = await proc.procesar({ cuerpo: jpeg1, contentType: 'image/jpeg', transformacion: T400 });
const m1 = r1.ok ? await sharp(r1.resultado.cuerpo).metadata() : {};
check('B · control: sin orientación que aplicar, la salida sigue apaisada (400×300)', m1.width === 400 && m1.height === 300, `salida ${m1.width}×${m1.height}`);

/* ═══ C · SIN METADATOS DE UBICACIÓN NI DE ORIENTACIÓN ═══════════════════════ */
console.log('\n── C · Privacidad de la salida ──');
check('C · la salida no lleva bloque EXIF: ni GPS ni etiqueta de orientación',
  r6.ok && m6.exif === undefined && m6.orientation === undefined);
check('C · la firma «Exif» no aparece en los bytes de salida',
  r6.ok && !r6.resultado.cuerpo.includes(Buffer.from('Exif\0\0', 'binary')));
check('C · la salida de orientación 8 tampoco lleva EXIF', r8.ok && m8.exif === undefined && m8.orientation === undefined);

/* ═══ D · LA TRANSPARENCIA SOBREVIVE ════════════════════════════════════════ */
console.log('\n── D · Transparencia ──');
const png = await pngConAlfa();
const copiaPng = Buffer.from(png);
const rA = await proc.procesar({ cuerpo: png, contentType: 'image/png', transformacion: T300_ALFA });
check('D · el derivado de un PNG con alfa se produce', rA.ok === true);
const mA = rA.ok ? await sharp(rA.resultado.cuerpo).metadata() : {};
check('D · la salida es WebP con canal alfa', mA.format === 'webp' && mA.hasAlpha === true, `formato ${mA.format}, alfa ${mA.hasAlpha}`);
if (rA.ok) {
  const cruda = await sharp(rA.resultado.cuerpo).raw().toBuffer({ resolveWithObject: true });
  const canales = cruda.info.channels;
  const alfaEn = (x, y) => cruda.data[(y * cruda.info.width + x) * canales + (canales - 1)];
  const centroX = Math.floor(cruda.info.width / 2);
  const centroY = Math.floor(cruda.info.height / 2);
  check('D · una esquina transparente sigue transparente', alfaEn(0, 0) === 0, `alfa=${alfaEn(0, 0)}`);
  check('D · el centro sigue opaco', alfaEn(centroX, centroY) === 255, `alfa=${alfaEn(centroX, centroY)}`);
}

/* ═══ E · EL ORIGINAL NO SE TOCA Y EL FALLO SIGUE SIENDO TIPADO ═════════════ */
console.log('\n── E · Original intacto y fallo tipado ──');
check('E · el JPEG de origen no cambia tras procesarlo', jpeg6.equals(copiaJpeg6));
check('E · el PNG de origen no cambia tras procesarlo', png.equals(copiaPng));

const roto = await proc.procesar({ cuerpo: Buffer.from('esto no es una imagen'), contentType: 'image/png', transformacion: T400 });
check('E · un origen ilegible falla con error tipado y sin resultado parcial',
  roto.ok === false && roto.error?.details?.reason === 'origen_ilegible' && !('resultado' in roto));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
