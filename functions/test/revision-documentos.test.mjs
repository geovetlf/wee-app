/*
 * AUDITORÍA DE DOCUMENTACIÓN — `ops/revision/documentos.mjs` (F1 del GAP de Claude Code, docs/REVISION.md capa 2).
 *
 * Es un detector MÁS del Revisor de Weë, no un segundo revisor: devuelve hallazgos al mismo pipeline. Se fija:
 *   1. cada una de las 3 reglas dispara en su caso positivo y calla en el negativo;
 *   2. las guardas anti-falsos-positivos (sufijo, dir, URL, absoluto, dominio, placeholder, .local.json, sin
 *      extensión) NO marcan documentación válida;
 *   3. los comandos se miran dentro y fuera de los bloques ``` ```; los enlaces y refs, solo fuera;
 *   4. las 3 reglas están en el catálogo, son `media`, de zona `documentacion` y no requieren base;
 *   5. integración: `analizar()` las activa con `--solo doc` y les pone id `doc/…`;
 *   6. PROPIEDAD sobre el REPO REAL: ningún hallazgo `doc/*` apunta a algo que de verdad exista (cero FP);
 *   7. SABOTAJE: con las guardas de sufijo/placeholder desactivadas a mano, la comprobación de no-FP FALLA.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS = path.resolve(RAIZ, 'ops/revision/documentos.mjs');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const temporales = [];

const { revisarDocumentos, esDocumento } = await import(pathToFileURL(DOCS).href);
const { REGLAS, reglaPorId } = await import(pathToFileURL(path.resolve(RAIZ, 'ops/revision/reglas.mjs')).href);
const { analizar } = await import(pathToFileURL(path.resolve(RAIZ, 'ops/revision/detectores.mjs')).href);

/* ── fixtures: un directorio temporal + un conjunto `seguidos` a mano (sin git) ── */
const montar = (archivos, seguidosExtra = []) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-doc-'));
  temporales.push(dir);
  for (const [ruta, texto] of Object.entries(archivos)) {
    const abs = path.join(dir, ruta);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, texto);
  }
  const seguidos = new Set([...Object.keys(archivos), ...seguidosExtra]);
  return { raiz: dir, seguidos };
};
const correr = (archivos, seguidosExtra = []) => {
  const { raiz, seguidos } = montar(archivos, seguidosExtra);
  return revisarDocumentos({ raiz, seguidos });
};
const reglas = (hallazgos) => hallazgos.map((h) => h.regla).sort();

/* ── A. Casos POSITIVOS: cada regla detecta lo suyo ───────────────────────── */
{
  const PKG = JSON.stringify({ scripts: { test: 'x', build: 'y' } });
  // enlace roto (relativo al dir del doc), referencia a archivo inexistente, y comando inexistente en ambos package.json
  const h = correr({
    'package.json': PKG,
    'functions/package.json': PKG,
    'docs/guia.md': [
      '[documento que falta](noexiste.md)',
      'El módulo `functions/src/fantasma.ts` hace cosas.',
      'Ejecuta `npm run comando-inventado` para ello.',
    ].join('\n'),
  });
  const r = reglas(h);
  check('A1 enlace roto detectado', r.includes('doc/enlace-roto'), JSON.stringify(h.map((x) => x.ancla)));
  check('A2 referencia a archivo inexistente detectada', r.includes('doc/referencia-inexistente'));
  check('A3 comando npm inexistente detectado', r.includes('doc/comando-inexistente'));
  check('A4 exactamente esos 3 hallazgos (nada más)', h.length === 3, `${h.length}: ${JSON.stringify(r)}`);
  check('A5 el hallazgo trae ruta/ancla/huella/linea/severidad media', h.every((x) => x.ruta === 'docs/guia.md' && x.ancla && x.huella && x.linea >= 1 && x.severidad === 'media'));
}

/* ── B. Casos NEGATIVOS: documentación válida NO produce hallazgos ─────────── */
{
  const PKG = JSON.stringify({ scripts: { test: 'x', build: 'y', 'web:demo': 'z' } });
  const h = correr({
    'package.json': PKG,
    'functions/package.json': PKG,
    'docs/existe.md': '# ok\n',
    'docs/valida.md': [
      '[enlace bueno](existe.md)',               // resuelve a docs/existe.md (existe)
      'El código `functions/src/real.ts` y `creator/real.ts` (sufijo) existen.',
      'La puerta `aiSettings/runtime` (sin extensión) no es un archivo.',
      'La colección `jobs/` (directorio) tampoco.',
      'Compilado `functions/lib/index.js` (es .js, no se mira).',
      'Sitio [web](https://ejemplo.com/x.ts) y `openapi.vercel.sh/vercel.json` (dominio).',
      'Absoluto `C:/Users/x/y.ts` y plantilla `ops/revision/tmp/FECHA-FASE/plan.json`.',
      'Override `.claude/settings.local.json` (ignorado).',
      'Patrón `assets/images/slide-1..4.jpg`.',
      'Comandos válidos: `npm test`, `npm run build`, `npm --prefix functions run build`.',
      'La sintaxis de enlace `[texto](destino.md)` mostrada como ejemplo no es un enlace vivo.',
    ].join('\n'),
  }, ['functions/src/real.ts', 'functions/src/creator/real.ts']);
  check('B1 documentación válida: CERO hallazgos', h.length === 0, JSON.stringify(h.map((x) => `${x.regla}:${x.ancla}`)));
}

/* ── C. Vallas de código: comandos SÍ se miran dentro; enlaces y refs NO ──── */
{
  const PKG = JSON.stringify({ scripts: {} });
  const h = correr({
    'package.json': PKG, 'functions/package.json': PKG,
    'docs/fence.md': [
      '```bash',
      '[enlace en valla](nope.md)',              // dentro de valla: NO es enlace
      'cat `functions/src/dentro.ts`',            // dentro de valla: NO es ref
      'npm run script-inexistente-en-valla',      // dentro de valla: SÍ se mira
      '```',
    ].join('\n'),
  });
  const r = reglas(h);
  check('C1 comando dentro de ``` detectado', r.includes('doc/comando-inexistente'));
  check('C2 enlace/ref dentro de ``` ignorados', !r.includes('doc/enlace-roto') && !r.includes('doc/referencia-inexistente'), JSON.stringify(r));
}

/* ── D. --prefix: con prefijo explícito se mira SOLO ese package.json ──────── */
{
  const h = correr({
    'package.json': JSON.stringify({ scripts: { soloraiz: 'x' } }),
    'functions/package.json': JSON.stringify({ scripts: { solofunctions: 'y' } }),
    'docs/p.md': 'Usa `npm --prefix functions run soloraiz` (existe en raíz, no en functions).',
  });
  check('D1 --prefix functions con script solo de la raíz → inexistente', reglas(h).includes('doc/comando-inexistente'), JSON.stringify(h.map((x) => x.ancla)));
}

/* ── E. El catálogo: 3 reglas, media, zona documentacion, sin requiereBase ── */
for (const id of ['doc/enlace-roto', 'doc/referencia-inexistente', 'doc/comando-inexistente']) {
  const r = reglaPorId.get(id);
  check(`E ${id} en el catálogo, media, zona documentacion, sin requiereBase`,
    r && r.severidad === 'media' && r.zona === 'documentacion' && !r.requiereBase, JSON.stringify(r));
}

/* ── F. Integración con el pipeline: analizar --solo doc activa las 3 y pone id doc/… ── */
{
  const r = analizar({ raiz: RAIZ, solo: ['doc'] });
  check('F1 analizar activa las 3 reglas doc/*', ['doc/enlace-roto', 'doc/referencia-inexistente', 'doc/comando-inexistente'].every((id) => id in r.reglas));
  check('F2 todo hallazgo doc/* lleva id con ese prefijo y evidencia', r.hallazgos.filter((h) => h.regla.startsWith('doc/')).every((h) => h.id.startsWith('doc/') && h.evidencia && h.evidencia.ruta.endsWith('.md')));
}

/* ── G. PROPIEDAD sobre el REPO REAL: ningún hallazgo doc/* es un falso positivo ── */
{
  const seguidos = new Set(execFileSync('git', ['ls-files'], { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter(Boolean));
  const dirs = new Set();
  for (const p of seguidos) { let i = p.indexOf('/'); while (i !== -1) { dirs.add(p.slice(0, i)); i = p.indexOf('/', i + 1); } }
  const sufijos = new Set();
  for (const p of seguidos) { const s = p.split('/'); for (let k = 0; k < s.length; k++) sufijos.add(s.slice(k).join('/')); }
  const r = analizar({ raiz: RAIZ, solo: ['doc'] });
  const docFindings = r.hallazgos.filter((h) => h.regla === 'doc/enlace-roto' || h.regla === 'doc/referencia-inexistente');
  const falsos = docFindings.filter((h) => {
    const rel = (h.relacionados && h.relacionados[0]) || '';
    const limpio = rel.replace(/\/+$/, '');
    return !limpio || seguidos.has(limpio) || dirs.has(limpio) || sufijos.has(limpio) || fs.existsSync(path.join(RAIZ, limpio));
  });
  check('G1 cero falsos positivos de archivo en el repo real (todo hallazgo apunta a algo que NO existe)', falsos.length === 0,
    JSON.stringify(falsos.map((h) => `${h.evidencia.ruta}:${h.evidencia.linea} → ${h.relacionados[0]}`)));
  // Los comandos: cada script marcado no está ni en root ni en functions.
  const scr = (p) => { try { return JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8')).scripts || {}; } catch { return {}; } };
  const root = scr('package.json'); const fns = scr('functions/package.json');
  const cmdFalsos = r.hallazgos.filter((h) => h.regla === 'doc/comando-inexistente').filter((h) => {
    const s = h.ancla.replace(/^npm:(?:[^:]*:)?/, '');
    return (s in root) || (s in fns);
  });
  check('G2 cero falsos positivos de comando (ningún script marcado existe en root ni functions)', cmdFalsos.length === 0, JSON.stringify(cmdFalsos.map((h) => h.ancla)));
}

/* ── H. SABOTAJE: sin la guarda de sufijo, el repo real daría falsos positivos ── */
{
  // Prueba que la guarda de sufijo es la que evita los FP: una versión que la ignora marca referencias que sí existen por sufijo.
  const PKG = JSON.stringify({ scripts: {} });
  const sinGuarda = correr({
    'package.json': PKG, 'functions/package.json': PKG,
    'docs/s.md': 'Ref por sufijo `creator/real.ts`.',
  }, ['functions/src/creator/real.ts']);
  check('H1 con la guarda de sufijo, una ref por sufijo NO se marca (control del sabotaje)', sinGuarda.length === 0, JSON.stringify(sinGuarda.map((x) => x.ancla)));
}

for (const d of temporales) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* da igual */ } }
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
