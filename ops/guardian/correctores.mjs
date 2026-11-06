/*
 * LOS CORRECTORES DEL GUARDIAN — `ops/guardian/correctores.mjs`.
 *
 * Un corrector es una corrección LOCAL, DETERMINISTA, REVERSIBLE y de BAJO RIESGO sobre un fallo con evidencia. Solo entra
 * aquí lo que cumple las cuatro cosas y puede demostrarse con una prueba permanente (la suite `guardian-autocorreccion`):
 * quitar la marca de orden de bytes (BOM) o una coma final de un `.json` que de otro modo no se puede leer, y recompilar
 * `functions/lib` cuando está desfasado. Nada de arquitectura, seguridad, cobros, proveedores, activación, producción,
 * secretos, permisos ni «arreglar» una prueba: esas decisiones son de una persona (ver ESCALADAS en autocorreccion.mjs).
 *
 * Contrato de un corrector:
 *   id, titulo, riesgo: 'bajo', determinista: true, ambito: 'tracked' | 'derivado',
 *   regresion: { suite, marca }      la prueba PERMANENTE que reproduce el fallo y que el motor exige que exista
 *   detectar({ raiz, archivos })     → [{ clave, archivos: [rel], causa, datos }]   (solo lee)
 *   corregir({ dir, hallazgo })      aplica la corrección en `dir` (una copia aislada, nunca el árbol del usuario)
 *   comprobar({ dir, hallazgo })     → [{ nombre, ok, detalle }]   la comprobación propia del corrector
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
/** JSON con comentarios (tsconfig…): no se le pasa JSON.parse, y por tanto no es un fallo de JSON. */
const JSONC = /(^|\/)(tsconfig[^/]*|jsconfig[^/]*)\.json$|\.jsonc$|(^|\/)\.vscode\//;
export const esJSONPlano = (rel) => /\.json$/.test(rel) && !JSONC.test(rel);

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const intentaParsear = (texto) => { try { JSON.parse(texto); return true; } catch { return false; } };
const leerBuf = (raiz, rel) => { try { return fs.readFileSync(path.join(raiz, rel)); } catch { return null; } };

/**
 * Pura: quita las comas finales (`,` seguida de espacios y `}` o `]`) que están FUERA de una cadena. No toca nada más, byte por
 * byte. Devuelve { texto, quitadas }.
 */
export const quitarComasFinales = (texto) => {
  let fuera = '';
  let quitadas = 0;
  let enCadena = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enCadena) {
      fuera += c;
      if (c === '\\') { fuera += texto[++i] ?? ''; } else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') { enCadena = true; fuera += c; continue; }
    if (c === ',') {
      let j = i + 1;
      while (j < texto.length && /\s/.test(texto[j])) j++;
      if (texto[j] === '}' || texto[j] === ']') { quitadas++; continue; }
    }
    fuera += c;
  }
  return { texto: fuera, quitadas };
};

/* ── 1 · JSON con BOM ────────────────────────────────────────────────────────────────────────────────────────── */
const jsonConBom = {
  id: 'json-con-bom', titulo: 'JSON con marca de orden de bytes (BOM) que JSON.parse no acepta', riesgo: 'bajo', determinista: true, ambito: 'tracked',
  regresion: { suite: 'guardian-autocorreccion', marca: 'json-con-bom' },
  detectar: ({ raiz, archivos }) => {
    const out = [];
    for (const rel of archivos.filter(esJSONPlano)) {
      const buf = leerBuf(raiz, rel);
      if (!buf || buf.length < 3 || !buf.subarray(0, 3).equals(BOM)) continue;
      const crudo = buf.toString('utf8');
      /* Evidencia: con el BOM no se lee, sin él sí. Un JSON que además está roto por otra cosa NO es de este corrector. */
      if (intentaParsear(crudo) || !intentaParsear(buf.subarray(3).toString('utf8'))) continue;
      out.push({ clave: `json-con-bom:${rel}`, archivos: [rel], causa: `${rel} empieza por el BOM UTF-8 (EF BB BF) y JSON.parse lo rechaza; sin él es un JSON válido`, datos: { sinBom: sha(buf.subarray(3)) } });
    }
    return out;
  },
  corregir: ({ dir, hallazgo }) => {
    const rel = hallazgo.archivos[0];
    const buf = fs.readFileSync(path.join(dir, rel));
    if (!buf.subarray(0, 3).equals(BOM)) throw new Error(`${rel} ya no empieza por el BOM`);
    fs.writeFileSync(path.join(dir, rel), buf.subarray(3));
  },
  comprobar: ({ dir, hallazgo }) => {
    const rel = hallazgo.archivos[0];
    const buf = leerBuf(dir, rel);
    return [
      { nombre: 'sin-bom', ok: Boolean(buf) && !buf.subarray(0, 3).equals(BOM), detalle: 'el archivo ya no empieza por EF BB BF' },
      { nombre: 'json-valido', ok: Boolean(buf) && intentaParsear(buf.toString('utf8')), detalle: 'JSON.parse lo lee' },
      { nombre: 'solo-el-bom', ok: Boolean(buf) && sha(buf) === hallazgo.datos.sinBom, detalle: 'los demás bytes son EXACTAMENTE los de antes' },
    ];
  },
};

/* ── 2 · JSON con coma final ─────────────────────────────────────────────────────────────────────────────────── */
const jsonComaFinal = {
  id: 'json-coma-final', titulo: 'JSON con una coma antes de `}` o `]` que JSON.parse no acepta', riesgo: 'bajo', determinista: true, ambito: 'tracked',
  regresion: { suite: 'guardian-autocorreccion', marca: 'json-coma-final' },
  detectar: ({ raiz, archivos }) => {
    const out = [];
    for (const rel of archivos.filter(esJSONPlano)) {
      const buf = leerBuf(raiz, rel);
      if (!buf || (buf.length >= 3 && buf.subarray(0, 3).equals(BOM))) continue; // el BOM lo trata su corrector
      const crudo = buf.toString('utf8');
      if (intentaParsear(crudo)) continue;
      const { texto, quitadas } = quitarComasFinales(crudo);
      if (!quitadas || !intentaParsear(texto)) continue; // si quitar las comas no lo arregla, hay otra cosa rota: es de una persona
      out.push({ clave: `json-coma-final:${rel}`, archivos: [rel], causa: `${rel} tiene ${quitadas} coma(s) final(es) y JSON.parse lo rechaza; quitándolas es un JSON válido`, datos: { quitadas, longitud: crudo.length, esperado: sha(Buffer.from(texto, 'utf8')) } });
    }
    return out;
  },
  corregir: ({ dir, hallazgo }) => {
    const rel = hallazgo.archivos[0];
    const { texto, quitadas } = quitarComasFinales(fs.readFileSync(path.join(dir, rel), 'utf8'));
    if (!quitadas) throw new Error(`${rel} ya no tiene comas finales`);
    fs.writeFileSync(path.join(dir, rel), texto);
  },
  comprobar: ({ dir, hallazgo }) => {
    const rel = hallazgo.archivos[0];
    const buf = leerBuf(dir, rel);
    const texto = buf ? buf.toString('utf8') : '';
    return [
      { nombre: 'json-valido', ok: intentaParsear(texto), detalle: 'JSON.parse lo lee' },
      { nombre: 'solo-las-comas', ok: texto.length === hallazgo.datos.longitud - hallazgo.datos.quitadas && sha(buf || Buffer.alloc(0)) === hallazgo.datos.esperado, detalle: 'solo desaparecieron las comas finales: ni un byte más' },
    ];
  },
};

/* ── 3 · functions/lib desfasado (artefacto derivado, regenerable) ──────────────────────────────────────────── */
const libDesfasado = {
  id: 'lib-desfasado', titulo: 'functions/lib no está al día con functions/src (las suites probarían otro código)', riesgo: 'bajo', determinista: true, ambito: 'derivado',
  regresion: { suite: 'guardian-autocorreccion', marca: 'lib-desfasado' },
  /** `libDesfasadoDe(raizFunctions)` se inyecta (es el de functions/test/_cadena.mjs). */
  detectar: ({ raiz, libDesfasadoDe }) => {
    const r = libDesfasadoDe(path.join(raiz, 'functions'));
    const n = r.faltan.length + r.viejos.length + r.huerfanos.length;
    if (!n) return [];
    return [{ clave: 'lib-desfasado:functions/lib', archivos: [], causa: `functions/lib no está al día: ${r.faltan.length} sin compilar, ${r.viejos.length} más viejos que su fuente, ${r.huerfanos.length} sin fuente`, datos: { huerfanos: r.huerfanos, estado: `${r.faltan.length}/${r.viejos.length}/${r.huerfanos.length}` } }];
  },
  /** Solo borra los `.js` HUÉRFANOS que la comprobación nombró dentro de functions/lib (tsc no los borra) y recompila. */
  corregir: async ({ dir, hallazgo, ejecutar }) => {
    const lib = path.resolve(dir, 'functions/lib');
    for (const js of hallazgo.datos.huerfanos) {
      const abs = path.resolve(lib, js);
      if (!abs.startsWith(`${lib}${path.sep}`)) throw new Error(`un huérfano fuera de functions/lib: ${js}`);
      if (/\.js$/.test(abs) && fs.existsSync(abs)) fs.rmSync(abs);
    }
    await ejecutar({ dir, orden: 'build' });
  },
  comprobar: ({ dir, libDesfasadoDe }) => {
    const r = libDesfasadoDe(path.join(dir, 'functions'));
    return [{ nombre: 'lib-al-dia', ok: !r.faltan.length && !r.viejos.length && !r.huerfanos.length, detalle: `${r.faltan.length} sin compilar, ${r.viejos.length} viejos, ${r.huerfanos.length} huérfanos tras recompilar` }];
  },
};

export const CORRECTORES = Object.freeze([jsonConBom, jsonComaFinal, libDesfasado]);
