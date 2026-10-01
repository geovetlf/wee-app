#!/usr/bin/env node
/*
 * NINGÚN SECRETO EN EL REPOSITORIO — nivel 3 de la CI (seguridad y políticas).
 *
 * Recorre los archivos VERSIONADOS (`git ls-files`) buscando formas de clave de
 * alta confianza: Google, OpenAI, Anthropic, GitHub, AWS, Slack, Cloudflare y
 * claves privadas. Nunca imprime el valor: solo el archivo, la línea y qué forma
 * es. Sin herramientas externas ni servicios de pago.
 *
 * Lo que SÍ se escribe así y no es secreto va en una lista cerrada, con su
 * porqué: la configuración web de Firebase (un identificador público, que
 * protegen las reglas y App Check) y las claves FALSAS con las que las pruebas
 * comprueban que los logs las censuran.
 *
 *   node scripts/escaneo-secretos.mjs        (sale con 1 si encuentra algo)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FORMAS = [
  ['clave de Google (API key)', /AIza[0-9A-Za-z_-]{35}/],
  ['clave de Anthropic', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['clave de OpenAI o similar (sk-…)', /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/],
  ['token de GitHub', /gh[pousr]_[A-Za-z0-9]{36}/],
  ['clave de acceso de AWS', /AKIA[0-9A-Z]{16}/],
  ['token de Slack', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['token de Cloudflare (cfat_)', /cfat_[A-Za-z0-9_-]{20,}/],
  ['clave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

/** Lo que se escribe así a propósito. Cada entrada: archivo → formas admitidas y por qué. */
export const ADMITIDOS = {
  'GoogleService-Info.plist': { formas: ['clave de Google (API key)'], porque: 'configuración web de Firebase de iOS: identificador público' },
  'google-services.json': { formas: ['clave de Google (API key)'], porque: 'configuración de Firebase de Android: identificador público' },
  'public/app.html': { formas: ['clave de Google (API key)'], porque: 'configuración web de Firebase de la página pública: identificador público' },
  'functions/test/core-brain.test.mjs': { formas: ['clave de OpenAI o similar (sk-…)'], porque: 'clave FALSA para probar que un error no la filtra' },
  'functions/test/core-gateway.test.mjs': { formas: ['clave de Anthropic', 'clave de OpenAI o similar (sk-…)'], porque: 'claves FALSAS para probar la censura del gateway' },
  'functions/test/core-registry.test.mjs': { formas: ['clave de OpenAI o similar (sk-…)'], porque: 'clave FALSA para probar el registro de proveedores' },
  'functions/test/security.test.mjs': { formas: ['clave de OpenAI o similar (sk-…)', 'clave de Google (API key)', 'clave de Anthropic'], porque: 'claves FALSAS para probar sanitizeForLog' },
};

/** Pura: las líneas de un texto que tienen una forma de clave (sin el valor). */
export const escanear = (texto) => {
  const hallazgos = [];
  texto.split(/\r?\n/).forEach((linea, i) => {
    for (const [forma, re] of FORMAS) if (re.test(linea)) hallazgos.push({ linea: i + 1, forma });
  });
  return hallazgos;
};

/** Pura: quita lo admitido. Devuelve lo que sobra y qué entradas de la lista ya no hacen falta. */
export const filtrar = (porArchivo) => {
  const sobran = [];
  const usados = new Set();
  for (const [archivo, hallazgos] of Object.entries(porArchivo)) {
    for (const h of hallazgos) {
      const admitido = ADMITIDOS[archivo];
      if (admitido && admitido.formas.includes(h.forma)) usados.add(archivo);
      else sobran.push({ archivo, ...h });
    }
  }
  return { sobran, viejos: Object.keys(ADMITIDOS).filter((a) => !usados.has(a)) };
};

const principal = () => {
  const archivos = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, encoding: 'utf8' }).split('\0').filter(Boolean);
  const porArchivo = {};
  for (const rel of archivos) {
    const ruta = path.join(RAIZ, rel);
    let datos;
    try { datos = fs.readFileSync(ruta); } catch { continue; }
    if (datos.length > 4 * 1024 * 1024 || datos.includes(0)) continue; // binarios y gigantes
    const hallazgos = escanear(datos.toString('utf8'));
    if (hallazgos.length) porArchivo[rel] = hallazgos;
  }
  const { sobran, viejos } = filtrar(porArchivo);
  for (const s of sobran) console.log(`✘ ${s.archivo}:${s.linea} — ${s.forma} (el valor no se muestra)`);
  for (const v of viejos) console.log(`· ${v} ya no tiene lo que la lista admite: quítalo de ADMITIDOS`);
  if (sobran.length) { console.log(`\n✘ ${sobran.length} posible(s) secreto(s) en archivos versionados. Si es una clave real: rótala, no basta con borrarla.`); process.exit(1); }
  console.log(`✔ Ningún secreto en ${archivos.length} archivos versionados (${Object.keys(ADMITIDOS).length} admitidos con su porqué).`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) principal();
