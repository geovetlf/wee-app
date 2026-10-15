#!/usr/bin/env node
/*
 * COMPROBACIÓN DE LAS HERRAMIENTAS DE CLAUDE CODE PARA DESARROLLAR WEË — `scripts/claude-tooling-check.mjs`.
 *
 *   node scripts/claude-tooling-check.mjs [--raiz dir]
 *
 * Solo LEE el repositorio. Verifica que `.claude/skills/*` y `.claude/rules/*` son válidas y no se pudren:
 *  · cada skill es una carpeta con SKILL.md cuyo frontmatter empieza en la línea 1, con `name` igual al nombre de
 *    la carpeta (minúsculas, dígitos y guiones) y `description` no vacía (<= 1536 caracteres, el límite del listado);
 *  · toda ruta citada entre comillas invertidas (carpeta/archivo con barra) existe (se ignoran plantillas `<x>`,
 *    comodines y llaves); las suites `node functions/test/<x>.test.mjs` citadas por nombre existen;
 *  · ni la app, ni `functions/src`, ni `i18n` ni `ops` importan nada de `.claude/` (las Skills de desarrollo no
 *    son parte del producto).
 * Salida 0 = todo bien · 1 = hay fallos (se listan). No es una suite de la cadena de `npm test`: no toca el Guardian.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = process.argv.indexOf('--raiz');
const RAIZ = arg > -1 ? path.resolve(process.argv[arg + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const fallos = [];
const falla = (m) => fallos.push(m);

const frontmatter = (texto) => {
  if (!texto.startsWith('---\n') && !texto.startsWith('---\r\n')) return null;
  const fin = texto.indexOf('\n---', 3);
  if (fin < 0) return null;
  const campos = {};
  for (const l of texto.slice(4, fin).split(/\r?\n/)) {
    const m = /^([A-Za-z_-]+):\s*(.*)$/.exec(l);
    if (m) campos[m[1]] = m[2];
  }
  return campos;
};

const rutasCitadas = (texto) => {
  const salida = new Set();
  for (const m of texto.matchAll(/`([^`\n]+)`/g)) {
    for (const trozo of m[1].split(/\s+/)) {
      const t = trozo.replace(/[.,;:)]+$/, '');
      if (!t.includes('/') || /[<>*{}$|=]/.test(t) || t.startsWith('--') || t.startsWith('http') || t.startsWith('/')) continue;
      if (!/^[\w.@-]+(\/[\w.@-]+)+\/?$/.test(t)) continue;
      salida.add(t);
    }
  }
  return salida;
};

const SALIDAS_DE_BUILD = new Set(['functions/lib']); // generado por el build, ausente en un worktree limpio
const comprobarTexto = (rel, texto) => {
  for (const r of rutasCitadas(texto)) {
    const base = r.replace(/\/$/, '');
    if (SALIDAS_DE_BUILD.has(base)) continue;
    // `node functions/test/<x>` y rutas con comodines ya se filtraron; el resto debe existir.
    if (!fs.existsSync(path.join(RAIZ, base))) falla(`${rel}: cita \`${r}\` que no existe`);
  }
  for (const m of texto.matchAll(/functions\/test\/([\w-]+)\.test\.mjs/g)) {
    if (!fs.existsSync(path.join(RAIZ, 'functions/test', `${m[1]}.test.mjs`))) falla(`${rel}: la suite ${m[1]} no existe`);
  }
};

const dirSkills = path.join(RAIZ, '.claude/skills');
const skills = fs.existsSync(dirSkills) ? fs.readdirSync(dirSkills, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
for (const d of skills) {
  const rel = `.claude/skills/${d.name}/SKILL.md`;
  const f = path.join(RAIZ, rel);
  if (!fs.existsSync(f)) { falla(`${rel}: falta SKILL.md`); continue; }
  const texto = fs.readFileSync(f, 'utf8');
  const fm = frontmatter(texto);
  if (!fm) { falla(`${rel}: el frontmatter debe empezar en la línea 1 y cerrarse con ---`); continue; }
  if (fm.name !== d.name) falla(`${rel}: name «${fm.name}» no coincide con la carpeta «${d.name}»`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(d.name)) falla(`${rel}: nombre de carpeta no válido`);
  if (!fm.description || !fm.description.trim()) falla(`${rel}: description vacía`);
  else if (fm.description.length > 1536) falla(`${rel}: description pasa de 1536 caracteres`);
  comprobarTexto(rel, texto);
}

const dirReglas = path.join(RAIZ, '.claude/rules');
if (fs.existsSync(dirReglas)) {
  for (const f of fs.readdirSync(dirReglas).filter((x) => x.endsWith('.md'))) comprobarTexto(`.claude/rules/${f}`, fs.readFileSync(path.join(dirReglas, f), 'utf8'));
}

// Las Skills de desarrollo no entran en el producto.
const recorrer = (dir, ext, hallazgos) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'lib' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p, ext, hallazgos);
    else if (ext.test(e.name) && /from\s+['"][^'"]*\.claude\/|require\(['"][^'"]*\.claude\//.test(fs.readFileSync(p, 'utf8'))) hallazgos.push(path.relative(RAIZ, p));
  }
};
const importadores = [];
for (const carpeta of ['functions/src', 'i18n', 'components', 'screens', 'services', 'hooks', 'contexts', 'utils', 'navigation', 'constants']) recorrer(path.join(RAIZ, carpeta), /\.(ts|tsx|js|mjs)$/, importadores);
for (const i of importadores) falla(`${i}: importa algo de .claude/ (las Skills de desarrollo no son parte de la app)`);

if (fallos.length) {
  console.error(`claude-tooling-check: ${fallos.length} fallo(s)`);
  for (const m of fallos) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(`claude-tooling-check: OK (${skills.length} skills, reglas y fronteras comprobadas)`);
