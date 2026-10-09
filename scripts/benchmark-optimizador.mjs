#!/usr/bin/env node
/**
 * BENCHMARK DEL PROCESADOR DE IMAGEN EXISTENTE (MC-4), REPRODUCIBLE.
 *
 * ── Qué mide, y qué NO ──────────────────────────────────────────────────────
 *
 * Mide el procesador real, `crearProcesadorDeImagen` de `functions/src/media/procesador.ts`
 * (compilado en `functions/lib`), sobre fixtures sintéticos con semilla fija. Las
 * transformaciones de la matriz son del contrato que ya existe en
 * `functions/src/core/media/proceso.ts`; se eligen como referencia para medir, no son
 * un plan de variantes ni una tarifa.
 *
 * NO ejecuta el plan de variantes del optimizador: ese módulo
 * (`functions/src/media/optimizador/plan.ts`) está BLOQUEADO por la cerca F1 de
 * `functions/test/puente-pre-f1d.test.mjs` (ver `docs/MEDIOS-OPTIMIZADOR.md`).
 *
 * ── Qué comprueba además ────────────────────────────────────────────────────
 *
 * Dos propiedades de la salida del procesador, medidas, no supuestas:
 *   · si aplica la orientación EXIF del origen (un JPEG con orientación 6 debe salir de pie);
 *   · si la salida conserva algún metadato, incluido el de ubicación (GPS).
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *
 *     npm --prefix functions run build
 *     node scripts/benchmark-optimizador.mjs
 *
 * No hace llamadas de red, no lee claves ni ficheros de configuración, no escribe
 * ficheros y no imprime hashes ni datos de personas: todo son píxeles sintéticos.
 * Los bytes y las dimensiones son reproducibles; los milisegundos varían entre
 * ejecuciones y se marcan como tales.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTIONS = path.join(RAIZ, 'functions');
const requerir = createRequire(path.join(FUNCTIONS, 'package.json'));

const SEMILLA = 20261008;

const sharp = requerir('sharp');
const { crearProcesadorDeImagen } = requerir(path.join(FUNCTIONS, 'lib', 'media', 'procesador.js'));
const { transformacionValida } = requerir(path.join(FUNCTIONS, 'lib', 'core', 'media', 'proceso.js'));

/* ── Versiones: la instalada y la que fija el lockfile, para que el informe no las confunda ── */

const versionInstalada = JSON.parse(readFileSync(path.join(FUNCTIONS, 'node_modules', 'sharp', 'package.json'), 'utf8')).version;
const lock = JSON.parse(readFileSync(path.join(FUNCTIONS, 'package-lock.json'), 'utf8'));
const versionDelLock = lock.packages?.['node_modules/sharp']?.version ?? 'desconocida';

/* ── Números pseudoaleatorios con semilla fija (mulberry32): mismo fixture en cada ejecución ── */

const generador = (semilla) => {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ── Fixtures sintéticos ──────────────────────────────────────────────────────── */

/** Un píxel por posición; `fn` devuelve [r, g, b] o [r, g, b, a]. */
const lienzo = (ancho, alto, canales, fn) => {
  const buf = Buffer.alloc(ancho * alto * canales);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const px = fn(x, y);
      const o = (y * ancho + x) * canales;
      for (let c = 0; c < canales; c++) buf[o + c] = px[c];
    }
  }
  return buf;
};

const degradadoConRuido = (ancho, alto, azar) => lienzo(ancho, alto, 3, (x, y) => [
  Math.round((x * 255) / ancho),
  Math.round((y * 255) / alto),
  (((x + y) & 255) + Math.floor(azar() * 32)) & 255,
]);

/** Texto simulado con bloques (sin fuentes del sistema, para que sea reproducible en cualquier equipo). */
const bloquesDeTexto = (ancho, alto) => lienzo(ancho, alto, 4, (x, y) => {
  const enPanel = x > 80 && x < ancho - 80 && y > 80 && y < alto - 80;
  if (!enPanel) return [0, 0, 0, 0];
  const linea = Math.floor((y - 120) / 60);
  const trazo = (y - 120) % 60 < 28 && (x - 120) % 90 < 60 && linea >= 0;
  return trazo ? [30, 41, 59, 255] : [255, 255, 255, 255];
});

/**
 * EXIF mínimo con orientación y GPS FALSO, en formato TIFF little-endian.
 * IFD0: Orientation (0x0112) y GPSInfo (0x8825). IFD GPS: latitud y longitud falsas.
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

const azar = generador(SEMILLA);

const fixtures = [];
{
  const cuerpo = await sharp(degradadoConRuido(2400, 1800, azar), { raw: { width: 2400, height: 1800, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
  fixtures.push({ nombre: 'degradado_jpeg', cuerpo, mime: 'image/jpeg' });
}
{
  const cuerpo = await sharp(bloquesDeTexto(1200, 800), { raw: { width: 1200, height: 800, channels: 4 } }).png().toBuffer();
  fixtures.push({ nombre: 'bloques_png_alfa', cuerpo, mime: 'image/png' });
}
{
  const base = await sharp(degradadoConRuido(2400, 1800, azar), { raw: { width: 2400, height: 1800, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
  fixtures.push({ nombre: 'retrato_exif6_gps_falso', cuerpo: insertarExif(base, exifConOrientacionYGps(6)), mime: 'image/jpeg' });
}
{
  const cuerpo = await sharp(degradadoConRuido(300, 200, azar), { raw: { width: 300, height: 200, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
  fixtures.push({ nombre: 'pequena_jpeg', cuerpo, mime: 'image/jpeg' });
}

/* El fixture de orientación debe leerse como orientación 6, o la prueba no vale nada. Si no, se para. */
const metaRetrato = await sharp(fixtures[2].cuerpo).metadata();
if (metaRetrato.orientation !== 6) {
  console.error(`Fixture inválido: la orientación de entrada es ${metaRetrato.orientation}, se esperaba 6.`);
  process.exit(2);
}

/* ── La matriz: transformaciones del contrato existente, validadas con el mismo validador de producción ── */

const MATRIZ = [
  { nombre: 'thumbnail-400-webp-q75', t: { tipo: 'thumbnail', ancho: 400, alto: 400, ajuste: 'dentro', formato: 'webp', calidad: 75 } },
  { nombre: 'preview-1080-webp-q80', t: { tipo: 'preview', ancho: 1080, alto: 1080, ajuste: 'dentro', formato: 'webp', calidad: 80 } },
  { nombre: 'preview-1080-jpeg-q80', t: { tipo: 'preview', ancho: 1080, alto: 1080, ajuste: 'dentro', formato: 'jpeg', calidad: 80 } },
  { nombre: 'preview-1080-png-q80', t: { tipo: 'preview', ancho: 1080, alto: 1080, ajuste: 'dentro', formato: 'png', calidad: 80 } },
  { nombre: 'transcoded-2048-webp-q90', t: { tipo: 'transcoded', ancho: 2048, alto: 2048, ajuste: 'dentro', formato: 'webp', calidad: 90 } },
];
for (const { nombre, t } of MATRIZ) {
  if (!transformacionValida(t)) {
    console.error(`Transformación de referencia no válida según el contrato: ${nombre}`);
    process.exit(2);
  }
}

/* ── Ejecución ────────────────────────────────────────────────────────────────── */

const procesador = crearProcesadorDeImagen();
const porFormato = {};
let errores = 0;
const salidasPorTipo = {};
const hallazgos = { orientacionAplicada: [], exifEnSalida: [], alfaEnWebpPng: [], alfaEnJpeg: [] };

console.log('Benchmark del procesador de imagen existente (MC-4) · sin plan de variantes (bloqueado, ver docs/MEDIOS-OPTIMIZADOR.md)');
console.log(`node=${process.version} sharp_instalado=${versionInstalada} sharp_del_lock=${versionDelLock} semilla=${SEMILLA}`);
console.log('Columna ms: tiempo medido en esta ejecución; varía entre ejecuciones. El resto es reproducible.\n');

for (const f of fixtures) {
  const meta = await sharp(f.cuerpo).metadata();
  const visibles = meta.orientation && meta.orientation >= 5 ? `${meta.height}x${meta.width}` : `${meta.width}x${meta.height}`;
  console.log(`[${f.nombre}] entrada=${meta.width}x${meta.height} formato=${meta.format} bytes=${f.cuerpo.length} alfa=${meta.hasAlpha ? 'si' : 'no'} orientacion_EXIF=${meta.orientation ?? 'ninguna'} dimensiones_visibles=${visibles}`);

  for (const { nombre, t } of MATRIZ) {
    const inicio = performance.now();
    const r = await procesador.procesar({ cuerpo: f.cuerpo, contentType: f.mime, transformacion: t });
    const ms = (performance.now() - inicio).toFixed(1);
    if (!r.ok) {
      errores++;
      console.log(`  ${nombre} ERROR motivo=${r.error?.details?.reason ?? 'desconocido'} ms=${ms}`);
      continue;
    }
    const salida = r.resultado.cuerpo;
    const m = await sharp(salida).metadata();
    const exif = salida.includes(Buffer.from('Exif\0\0', 'binary')) || m.exif !== undefined ? 'si' : 'no';
    porFormato[m.format] = (porFormato[m.format] ?? 0) + 1;
    (salidasPorTipo[nombre] ??= []).push(salida.length);
    if (f.nombre === 'retrato_exif6_gps_falso') hallazgos.orientacionAplicada.push(m.width < m.height);
    if (exif === 'si') hallazgos.exifEnSalida.push(f.nombre);
    if (f.nombre === 'bloques_png_alfa') {
      if (t.formato === 'jpeg') hallazgos.alfaEnJpeg.push(m.hasAlpha === true);
      else hallazgos.alfaEnWebpPng.push(m.hasAlpha === true);
    }
    console.log(`  ${nombre} salida=${m.format} ${m.width}x${m.height} bytes=${salida.length} alfa=${m.hasAlpha ? 'si' : 'no'} exif=${exif} ms=${ms}`);
  }
  console.log('');
}

/* ── Resumen: todo lo que sale de la ejecución, nada escrito a mano ─────────── */

const todos = (xs) => xs.length > 0 && xs.every(Boolean);
const algunos = (xs) => xs.some(Boolean);
console.log('RESUMEN');
console.log(`  formatos_producidos: ${Object.keys(porFormato).sort().join(', ') || 'ninguno'} (filas: ${JSON.stringify(porFormato)})`);
console.log(`  orientacion_EXIF_aplicada: ${todos(hallazgos.orientacionAplicada) ? 'si' : 'no'} (salidas de pie del retrato con orientación 6: ${hallazgos.orientacionAplicada.filter(Boolean).length} de ${hallazgos.orientacionAplicada.length})`);
console.log(`  metadatos_EXIF_en_alguna_salida: ${hallazgos.exifEnSalida.length ? 'si' : 'no'} (salidas con EXIF: ${hallazgos.exifEnSalida.length})`);
console.log(`  alfa_conservado_en_webp_y_png: ${todos(hallazgos.alfaEnWebpPng) ? 'si' : 'no'}`);
console.log(`  alfa_conservado_en_jpeg: ${algunos(hallazgos.alfaEnJpeg) ? 'si' : 'no'}`);
for (const nombre of MATRIZ.map((x) => x.nombre)) {
  const xs = salidasPorTipo[nombre] ?? [];
  const total = xs.reduce((a, b) => a + b, 0);
  console.log(`  bytes_salida_total ${nombre}: ${total} (archivos: ${xs.length})`);
}
console.log(`  errores: ${errores}`);

process.exit(errores === 0 ? 0 : 1);
