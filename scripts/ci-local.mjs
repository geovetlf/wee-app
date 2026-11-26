#!/usr/bin/env node
/*
 * LA CI DE GITHUB, AQUÍ — Weë Agent Harness, FASE 5.
 *
 *   node scripts/ci-local.mjs            corre los tres niveles (cuatro trabajos), en orden, y para en el primero que falle
 *   node scripts/ci-local.mjs --plan     solo enseña qué correría
 *   node scripts/ci-local.mjs --nivel 3  solo un nivel (1, 2 o 3)
 *
 * No es otra CI: LEE .github/workflows/ci.yml y ejecuta SUS pasos, en su orden,
 * con su mismo `env` y su mismo intérprete (bash -eo pipefail, como GitHub).
 * Solo se salta las INSTALACIONES (`npm ci`, `npm install --global
 * firebase-tools`), porque aquí ya están instaladas; si alguien cambia la CI, esto
 * cambia con ella sin tocarlo (lo fija functions/test/ci-local.test.mjs).
 *
 * Sirve para arreglar la CI antes de subir nada: lo que pasa aquí es lo que va a
 * correr GitHub. Sin red de proveedores, sin claves y solo con proyectos demo-*:
 * el primer paso de cada nivel (`ci-sin-secretos`) para si el entorno trae algo
 * real. Al terminar borra lo que la CI deja en el árbol (`dist-ci`,
 * `politica-*.log`) si no estaba antes.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CI = '.github/workflows/ci.yml';

/** Las instalaciones: lo único que no se repite aquí. */
export const INSTALACION = /^(npm ci\b|npm install --global firebase-tools@)/;

/** ¿Abre un bloque de YAML (`|`, `|-`, `>`, `>+`…)? */
const BLOQUE = /^[|>][-+]?$/;
/** El cuerpo de un bloque de YAML que empieza tras la línea `i`, sangrado al menos `sangria` espacios; y dónde acaba. */
const cuerpoDeBloque = (lineas, i, sangria) => {
  const cuerpo = [];
  const dentro = new RegExp(`^ {${sangria}}`);
  while (i + 1 < lineas.length && (dentro.test(lineas[i + 1]) || lineas[i + 1].trim() === '')) cuerpo.push(lineas[++i].slice(sangria));
  return { texto: cuerpo.join('\n').trim(), i };
};

/**
 * Pura: los trabajos de un workflow sencillo (id, nombre, needs, pasos con `run`). De cada trabajo y de cada paso guarda
 * también `si` (su `if:` tal cual, o null), `continuaConError` (su `continue-on-error:` tal cual, o null) y, del paso,
 * `shell`: lo que el Build Guardian (ops/harness/guardian.mjs) compara con la base para ver si una puerta sigue escrita
 * pero ya no puede correr o ya no puede fallar. Una clave en la línea del guion (`- if: …`) cuenta igual que debajo.
 */
export const trabajos = (yml) => {
  const lineas = String(yml).split('\n');
  const out = [];
  let enJobs = false;
  let actual = null;
  let paso = null;
  /* Una clave de un paso; devuelve dónde sigue la lectura (un `run: |` se come su bloque). */
  const clavePaso = (clave, valor, i) => {
    if (clave === 'name') { paso.nombre = valor.trim() || null; return i; }
    if (clave === 'if') { paso.si = valor.trim(); return i; }
    if (clave === 'continue-on-error') { paso.continuaConError = valor.trim(); return i; }
    if (clave === 'shell') { paso.shell = valor.trim(); return i; }
    if (clave !== 'run') return i;
    if (BLOQUE.test(valor.trim())) { const b = cuerpoDeBloque(lineas, i, 10); paso.run = b.texto; i = b.i; } else paso.run = valor.trim();
    if (!actual.pasos.includes(paso)) actual.pasos.push(paso);
    return i;
  };
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (/^jobs:\s*$/.test(l)) { enJobs = true; continue; }
    if (!enJobs) continue;
    let m;
    if ((m = l.match(/^ {2}([a-z0-9-]+):\s*$/))) { actual = { id: m[1], nombre: m[1], necesita: [], si: null, continuaConError: null, pasos: [] }; out.push(actual); paso = null; continue; }
    if (!actual) continue;
    if ((m = l.match(/^ {4}name:\s*(.+)$/))) { actual.nombre = m[1].trim(); continue; }
    if ((m = l.match(/^ {4}needs:\s*(.+)$/))) { actual.necesita = m[1].replace(/[[\]]/g, '').split(',').map((s) => s.trim()).filter(Boolean); continue; }
    if ((m = l.match(/^ {4}if:\s*(.*)$/))) {
      if (BLOQUE.test(m[1].trim())) { const b = cuerpoDeBloque(lineas, i, 6); actual.si = b.texto; i = b.i; } else actual.si = m[1].trim();
      continue;
    }
    if ((m = l.match(/^ {4}continue-on-error:\s*(.*)$/))) { actual.continuaConError = m[1].trim(); continue; }
    if ((m = l.match(/^ {6}- (?:([a-z-]+):\s*(.*))?/))) {
      paso = { nombre: null, si: null, continuaConError: null, shell: null };
      if (m[1]) i = clavePaso(m[1], m[2], i);
      continue;
    }
    if ((m = l.match(/^ {8}([a-z-]+):\s*(.*)$/)) && paso) i = clavePaso(m[1], m[2], i);
  }
  return out;
};

/**
 * Pura: los disparadores del workflow (`on:`) → Map nombre → su configuración tal cual ('' si no tiene). Acepta `on: x`,
 * `on: [x, y]` y el bloque (también `"on":`). null si el workflow no declara `on:`.
 */
export const disparadores = (yml) => {
  const lineas = String(yml).split('\n');
  const i = lineas.findIndex((l) => /^(?:on|"on"|'on'):/.test(l));
  if (i < 0) return null;
  const sinComentario = (l) => l.replace(/\s+#.*$/, '');
  const enLinea = sinComentario(lineas[i].replace(/^(?:on|"on"|'on'):/, '')).trim();
  const out = new Map();
  if (enLinea) {
    for (const x of enLinea.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)) out.set(x, '');
    return out;
  }
  let actual = null;
  for (let j = i + 1; j < lineas.length && (/^\s/.test(lineas[j]) || lineas[j].trim() === ''); j++) {
    if (/^\s*#/.test(lineas[j])) continue;
    const l = sinComentario(lineas[j]);
    if (!l.trim()) continue;
    const m = l.match(/^ {2}([A-Za-z_-]+):\s*(.*)$/);
    if (m) { actual = m[1]; out.set(actual, m[2].trim()); continue; }
    if (actual) out.set(actual, `${out.get(actual)}\n${l.trim()}`.trim());
  }
  return out;
};

/** Pura: el `env` de nivel superior del workflow. */
export const entorno = (yml) => {
  const m = String(yml).match(/^env:\s*\n((?: {2}[A-Z_][A-Z0-9_]*:.*\n)+)/m);
  return m ? Object.fromEntries(m[1].trim().split('\n').map((l) => l.trim().split(/:\s*/)).map(([k, ...v]) => [k, v.join(':').trim()])) : {};
};

/** Pura: lo que se ejecuta aquí de un paso (sin sus líneas de instalación), y lo que se quitó. */
export const local = (run) => {
  const lineas = String(run).split('\n');
  const quitadas = lineas.filter((l) => INSTALACION.test(l.trim()));
  const quedan = lineas.filter((l) => !INSTALACION.test(l.trim())).join('\n').trim();
  return { quedan, quitadas };
};

/** Pura: el nivel de un trabajo, por su nombre («Nivel 2 · suites» → 2). */
export const nivelDe = (t) => Number((t.nombre.match(/^Nivel (\d)/) || [])[1] || 0);

const ejecutar = (comando, env) => spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', comando],
  { cwd: RAIZ, env: { ...process.env, ...env }, stdio: 'inherit' });

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const soloPlan = args.includes('--plan');
  const i = args.indexOf('--nivel');
  const nivel = i >= 0 ? Number(args[i + 1]) : null;
  const yml = fs.readFileSync(path.join(RAIZ, CI), 'utf8');
  const env = entorno(yml);
  const lista = trabajos(yml).filter((t) => nivel === null || nivelDe(t) === nivel);
  const yaEstaban = new Set(fs.readdirSync(RAIZ).filter((f) => f === 'dist-ci' || /^politica-.*\.log$/.test(f)));
  const resumen = [];
  let fallo = false;
  for (const t of lista) {
    console.log(`\n══ ${t.nombre}`);
    const inicio = Date.now();
    for (const p of t.pasos) {
      const { quedan, quitadas } = local(p.run);
      if (!quedan) { console.log(`  · ${p.nombre || p.run} — instalación, aquí ya está`); continue; }
      console.log(`  ▸ ${p.nombre || quedan.split('\n')[0]}${quitadas.length ? ` (sin ${quitadas.length} línea(s) de instalación)` : ''}`);
      if (soloPlan) continue;
      const r = ejecutar(quedan, env);
      if (r.status !== 0) { fallo = true; console.log(`  ✘ falló (salida ${r.status})`); break; }
    }
    resumen.push(`${fallo ? '✘' : '✔'} ${t.nombre}${soloPlan ? '' : ` · ${Math.round((Date.now() - inicio) / 1000)} s`}`);
    if (fallo) break;
  }
  for (const f of fs.readdirSync(RAIZ)) {
    if ((f === 'dist-ci' || /^politica-.*\.log$/.test(f)) && !yaEstaban.has(f)) fs.rmSync(path.join(RAIZ, f), { recursive: true, force: true });
  }
  console.log(`\n${soloPlan ? 'PLAN (no se ejecutó nada)' : 'CI LOCAL'}:\n${resumen.join('\n')}`);
  process.exit(fallo ? 1 : 0);
}
