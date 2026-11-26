#!/usr/bin/env node
/*
 * NINGÚN SECRETO EN EL REPOSITORIO — nivel 3 de la CI (seguridad y políticas).
 *
 * Recorre los archivos VERSIONADOS (`git ls-files`) buscando formas de clave de
 * alta confianza: Google, OpenAI, Anthropic, ElevenLabs, Stripe, GitHub, AWS, Slack,
 * Cloudflare, fal, tokens OAuth y JWT, y claves privadas. Nunca imprime el valor: solo
 * el archivo, la línea, qué forma es y la HUELLA de lo que encontró. Sin herramientas
 * externas ni servicios de pago.
 *
 * Lo que SÍ se escribe así y no es secreto va en una lista cerrada, con su porqué: la
 * configuración web de Firebase (un identificador público, que protegen las reglas y
 * App Check) y las claves FALSAS con las que las pruebas comprueban que los logs las
 * censuran.
 *
 * ── Qué se admite: UN VALOR, no un tipo ───────────────────────────────────────────────
 *
 * Antes, una entrada admitía «este tipo de clave en este archivo»: cualquier clave de ese
 * tipo escrita en ese archivo pasaba. Una clave REAL pegada en uno de esos archivos de
 * prueba habría quedado oculta detrás de la admisión de las falsas. Ahora cada entrada
 * lista las HUELLAS de los valores admitidos (SHA-256 del texto que encaja, los 32
 * primeros caracteres hexadecimales: irreversible, así que se puede versionar sin
 * versionar la clave). Un valor que no está en la lista falla aunque su tipo y su archivo
 * estén admitidos. Y se examinan TODAS las coincidencias de una línea, no la primera.
 *
 *   node scripts/escaneo-secretos.mjs             (sale con 1 si encuentra algo)
 *   node scripts/escaneo-secretos.mjs --huellas   (las huellas de lo que hay ahora en los archivos admitidos,
 *                                                  para fijarlas a mano tras revisar el cambio; nunca el valor)
 *
 * Límite que no se puede cerrar con una forma: las claves sin forma propia (un UUID, un hexadecimal largo:
 * ARK, BFL…) no se reconocen por su aspecto. Su defensa es que viven solo en Secret Manager y que ninguna
 * herramienta las lee (docs/SECURITY.md).
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FORMAS = [
  ['clave de Google (API key)', /AIza[0-9A-Za-z_-]{35}/],
  ['clave de Anthropic', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['clave de OpenAI o similar (sk-…)', /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/],
  /* Las tres formas siguientes llevan «que antes no haya una letra o cifra»: sin eso, `task_test_…` o `risk_live_…` contienen `sk_test_`/`sk_live_`. */
  ['clave de ElevenLabs (sk_…)', /(?<![A-Za-z0-9])sk_[0-9a-f]{40,}/],
  ['clave secreta de Stripe', /(?<![A-Za-z0-9])[sr]k_(?:live|test)_[A-Za-z0-9]{20,}/],
  ['secreto de webhook de Stripe', /(?<![A-Za-z0-9])whsec_[A-Za-z0-9]{20,}/],
  ['token de acceso de Google (ya29.)', /ya29\.[A-Za-z0-9_-]{30,}/],
  ['token JWT (eyJ…)', /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ['clave de fal (id:secreto)', /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{32}/],
  ['token de GitHub', /gh[pousr]_[A-Za-z0-9]{36}/],
  ['clave de acceso de AWS', /AKIA[0-9A-Z]{16}/],
  ['token de Slack', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['token de Cloudflare (cfat_)', /cfat_[A-Za-z0-9_-]{20,}/],
  ['clave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

/**
 * La huella de un valor: SHA-256, los 32 primeros caracteres hexadecimales (128 bits). Es irreversible: se puede guardar en
 * el repositorio sin guardar la clave. Un valor distinto da otra huella.
 */
export const huellaDe = (valor) => createHash('sha256').update(String(valor), 'utf8').digest('hex').slice(0, 32);

/**
 * Lo que se escribe así a propósito. Cada entrada: archivo → las formas admitidas, las HUELLAS de los valores admitidos y por qué.
 * Una entrada sin huellas no admite nada. Para fijar o cambiar una huella: revisa el cambio y ejecuta `--huellas`.
 */
export const ADMITIDOS = {
  'GoogleService-Info.plist': { formas: ['clave de Google (API key)'], huellas: ['bb75f68ad103af2c4e895aae377b5a2a'], porque: 'configuración web de Firebase de iOS: identificador público' },
  'google-services.json': { formas: ['clave de Google (API key)'], huellas: ['82171bf4c683355e34cb330288ba5fe3'], porque: 'configuración de Firebase de Android: identificador público' },
  'functions/test/core-brain.test.mjs': { formas: ['clave de OpenAI o similar (sk-…)'], huellas: ['45c6f81ba5cb10c42bd17bd3c0cfa7ac'], porque: 'clave FALSA para probar que un error no la filtra' },
  'functions/test/core-gateway.test.mjs': { formas: ['clave de Anthropic', 'clave de OpenAI o similar (sk-…)'], huellas: ['c1212bbf2dcb0ba81fdccd9e75cba06c','45c6f81ba5cb10c42bd17bd3c0cfa7ac','8e5e2013c7b15245293a7aca8effa1ea'], porque: 'claves FALSAS para probar la censura del gateway' },
  'functions/test/core-registry.test.mjs': { formas: ['clave de OpenAI o similar (sk-…)'], huellas: ['d67ee745ad52ec11f518527f9dcbd613'], porque: 'clave FALSA para probar el registro de proveedores' },
  'functions/test/security.test.mjs': { formas: ['clave de OpenAI o similar (sk-…)'], huellas: ['3631b5f17840df1cb0575b3708c982cf'], porque: 'claves FALSAS para probar sanitizeForLog' },
};

/**
 * Pura: TODAS las coincidencias de un texto, cada una con su línea, su forma y la HUELLA de su valor. El valor nunca sale de aquí.
 * (Antes se miraba «¿hay alguna de esta forma en la línea?»: una segunda clave en la misma línea quedaba oculta tras la primera.)
 */
export const escanear = (texto) => {
  const hallazgos = [];
  texto.split(/\r?\n/).forEach((linea, i) => {
    for (const [forma, re] of FORMAS) {
      const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      for (const m of linea.matchAll(global)) hallazgos.push({ linea: i + 1, forma, huella: huellaDe(m[0]) });
    }
  });
  return hallazgos;
};

/**
 * Pura: quita lo admitido. Un hallazgo se admite solo si su archivo lo admite, su forma está admitida allí Y su huella es una de las
 * fijadas. Devuelve lo que sobra (con el motivo) y las huellas fijadas que ya no aparecen (para quitarlas).
 */
export const filtrar = (porArchivo) => {
  const sobran = [];
  const vistas = new Map();
  for (const [archivo, hallazgos] of Object.entries(porArchivo)) {
    const admitido = ADMITIDOS[archivo];
    for (const h of hallazgos) {
      const formaAdmitida = !!admitido && admitido.formas.includes(h.forma);
      const valorAdmitido = formaAdmitida && Array.isArray(admitido.huellas) && admitido.huellas.includes(h.huella);
      if (valorAdmitido) { if (!vistas.has(archivo)) vistas.set(archivo, new Set()); vistas.get(archivo).add(h.huella); continue; }
      sobran.push({ archivo, ...h, motivo: !admitido ? 'archivo no admitido' : !formaAdmitida ? 'forma no admitida en este archivo' : 'valor distinto de los admitidos' });
    }
  }
  const viejos = Object.entries(ADMITIDOS).flatMap(([archivo, a]) => {
    const vistasAqui = vistas.get(archivo) || new Set();
    const sinUsar = (Array.isArray(a.huellas) ? a.huellas : []).filter((x) => !vistasAqui.has(x));
    return !vistas.has(archivo) || sinUsar.length ? [{ archivo, huellas: sinUsar, sinNada: !vistas.has(archivo) }] : [];
  });
  return { sobran, viejos };
};

const archivosVersionados = () => execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, encoding: 'utf8' }).split('\0').filter(Boolean);
const leerTexto = (rel) => {
  let datos;
  try { datos = fs.readFileSync(path.join(RAIZ, rel)); } catch { return null; }
  if (datos.length > 4 * 1024 * 1024 || datos.includes(0)) return null; // binarios y gigantes
  return datos.toString('utf8');
};

const principal = () => {
  const archivos = archivosVersionados();
  if (process.argv.includes('--huellas')) {
    for (const rel of Object.keys(ADMITIDOS)) {
      const texto = leerTexto(rel);
      const hs = texto === null ? [] : [...new Set(escanear(texto).filter((h) => ADMITIDOS[rel].formas.includes(h.forma)).map((h) => h.huella))];
      console.log(`${rel}: ${JSON.stringify(hs)}`);
    }
    return;
  }
  const porArchivo = {};
  for (const rel of archivos) {
    const texto = leerTexto(rel);
    if (texto === null) continue;
    const hallazgos = escanear(texto);
    if (hallazgos.length) porArchivo[rel] = hallazgos;
  }
  const { sobran, viejos } = filtrar(porArchivo);
  for (const s of sobran) console.log(`✘ ${s.archivo}:${s.linea} — ${s.forma}: ${s.motivo} (el valor no se muestra; huella ${s.huella})`);
  for (const v of viejos) console.log(v.sinNada ? `· ${v.archivo} ya no tiene lo que la lista admite: quítalo de ADMITIDOS` : `· ${v.archivo}: ${v.huellas.length} huella(s) fijada(s) ya no aparecen: quítalas de ADMITIDOS`);
  if (sobran.length) { console.log(`\n✘ ${sobran.length} posible(s) secreto(s) en archivos versionados. Si es una clave real: rótala, no basta con borrarla.`); process.exit(1); }
  console.log(`✔ Ningún secreto en ${archivos.length} archivos versionados (${Object.keys(ADMITIDOS).length} archivos con valores admitidos, cada valor por su huella).`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) principal();
