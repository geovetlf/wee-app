/*
 * LO COMÚN DE LOS HOOKS DEL BUILD GUARDIAN — `.claude/hooks/guardian-comun.mjs`.
 *
 * Lo usan `guardian-post-edit.mjs` (PostToolUse) y `guardian-stop.mjs` (Stop). No trae reglas propias: las zonas rojas
 * salen de ops/revision/reglas.mjs, los permisos de .claude/settings.json (con el lector del Guardian) y las rutas que
 * la guardia negaría, de la guardia de siempre (`analizarTexto`). Aquí solo hay: leer la entrada del hook, llevar una
 * ruta (Windows o POSIX) a una ruta del repositorio, y comprobar la sintaxis de lo que se puede comprobar en
 * milisegundos sin ejecutarlo. Nunca abre un archivo de secretos. Lo fija functions/test/guardian-hooks.test.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ZONAS_ROJAS } from '../../ops/revision/reglas.mjs';
import { coincide } from '../../ops/revision/comun.mjs';
import { permisosDeSettings } from '../../ops/harness/guardian-fuentes.mjs';
import { analizarTexto } from './guardia.mjs';

export const MAX_ENTRADA = 1024 * 1024;

/** Lee stdin entero (con tope) y lo parsea; lanza si no es un objeto JSON. */
export const leerEntrada = async (stdin = process.stdin) => {
  let texto = '';
  for await (const trozo of stdin) {
    texto += trozo;
    if (texto.length > MAX_ENTRADA) throw new Error('la entrada del hook pasa de 1 MB');
  }
  const datos = JSON.parse(texto);
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw new Error('la entrada del hook no es un objeto JSON');
  return datos;
};

/** `C:\a\b`, `c:/a/b` y `/c/a/b` (Git Bash) → `C:/a/b`; lo demás, con barras normales. */
export const normalizarAbsoluta = (p) => {
  let s = String(p || '').trim().replace(/\\/g, '/');
  const msys = s.match(/^\/([a-zA-Z])(\/.*)?$/);
  if (msys) s = `${msys[1].toUpperCase()}:${msys[2] || '/'}`;
  const unidad = s.match(/^([a-zA-Z]):(\/.*)?$/);
  if (unidad) s = `${unidad[1].toUpperCase()}:${unidad[2] || '/'}`;
  return s;
};
const esAbsoluta = (s) => /^[A-Z]:\//.test(s) || s.startsWith('/');

/**
 * La ruta del repositorio (`a/b.ts`) de un archivo que dio la herramienta, o null si queda fuera del proyecto, está
 * vacía o se escapa con `..`. En Windows (o con unidad) se compara sin distinguir mayúsculas.
 */
export const rutaDelProyecto = (archivo, raiz, { windows = process.platform === 'win32' } = {}) => {
  if (!archivo || !raiz) return null;
  const r = path.posix.normalize(normalizarAbsoluta(raiz)).replace(/\/+$/, '');
  let a = normalizarAbsoluta(archivo);
  if (!esAbsoluta(a)) a = `${r}/${a}`;
  a = path.posix.normalize(a);
  const sinMayus = windows || /^[A-Z]:/.test(r);
  const igual = (x) => (sinMayus ? x.toLowerCase() : x);
  if (!igual(a).startsWith(`${igual(r)}/`)) return null;
  const rel = a.slice(r.length + 1);
  if (!rel || rel.split('/').includes('..')) return null;
  return rel;
};

/** Rutas en las que el Guardian no opina: dependencias, git y compilados. */
export const IGNORADAS = [/^node_modules\//, /\/node_modules\//, /^\.git\//, /^functions\/lib\//, /^\.claude\/worktrees\//];
export const ignorada = (rel) => IGNORADAS.some((re) => re.test(rel));

/** Nombres de secretos que nunca se abren, aunque settings.json no los liste. */
const NOMBRE_SECRETO = /^(\.env(\..*)?|\.secret(\..*)?|.*service-account.*\.json|application_default_credentials\.json|gha-creds-.*\.json)$/i;

const leerSettings = (raiz) => { try { return JSON.parse(fs.readFileSync(path.join(raiz, '.claude/settings.json'), 'utf8')); } catch { return null; } };

/**
 * Lo que las fuentes de siempre dicen de una ruta: `secreto` (deny de settings.json, la guardia negaría tocarla o el
 * nombre es de secretos), `ask` (settings.json o la guardia la protegen), y las zonas rojas que la cubren.
 */
export const clasificarRuta = (raiz, rel) => {
  const base = rel.split('/').pop();
  const permisos = permisosDeSettings(leerSettings(raiz));
  const deny = permisos.filter((p) => p.lista === 'deny' && (coincide(rel, [p.glob]) || coincide(rel, [p.glob.replace(/^\*\*\//, '')]))).map((p) => p.valor);
  const ask = permisos.filter((p) => p.lista === 'ask' && coincide(rel, [p.glob])).map((p) => p.valor);
  let guardia = null;
  if (!/["$`\\]/.test(rel)) {
    const g = analizarTexto('Bash', `touch "${rel}"`);
    if (g && (g.decision === 'deny' || g.decision === 'ask')) guardia = `${g.decision}: ${g.motivo}`;
  }
  const secreto = NOMBRE_SECRETO.test(base) || deny.length > 0 || Boolean(guardia && guardia.startsWith('deny'));
  return {
    secreto, deny, guardia,
    ask: ask.length > 0 || Boolean(guardia && guardia.startsWith('ask')), permisosAsk: ask,
    zonasRojas: ZONAS_ROJAS.filter((z) => coincide(rel, [z])),
  };
};

/** JSON con comentarios (tsconfig, jsconfig, .jsonc, .vscode): no se le pasa JSON.parse. */
const JSONC = /(^|\/)(tsconfig[^/]*|jsconfig[^/]*)\.json$|\.jsonc$|(^|\/)\.vscode\//;
/** `.js` que se sabe que es Node sin JSX (el resto puede ser de la app y llevar JSX). */
const JS_DE_NODE = /^(scripts|ops|functions\/test|\.claude)\//;

/**
 * La sintaxis de lo que se puede comprobar sin ejecutar: `.json` con JSON.parse, `.mjs`/`.cjs` (y `.js` de Node) con
 * `node --check`. Nunca abre un secreto. Devuelve null si está bien o no aplica, o el motivo del error.
 */
export const revisarSintaxis = (raiz, rel, { node = process.execPath, tiempoMs = 15000 } = {}) => {
  if (clasificarRuta(raiz, rel).secreto) return null;
  const abs = path.join(raiz, rel);
  let st;
  try { st = fs.statSync(abs); } catch { return null; }
  if (!st.isFile()) return null;
  if (/\.json$/.test(rel) && !JSONC.test(rel)) {
    try { JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '')); return null; } catch (e) { return `${rel}: JSON inválido (${e.message})`; }
  }
  if (/\.(mjs|cjs)$/.test(rel) || (/\.js$/.test(rel) && JS_DE_NODE.test(rel))) {
    const x = spawnSync(node, ['--check', abs], { encoding: 'utf8', timeout: tiempoMs, windowsHide: true });
    if (x.error) return `${rel}: no se pudo comprobar la sintaxis (${x.error.code || x.error.message})`;
    if (x.status !== 0) {
      const linea = String(x.stderr || '').split('\n').find((l) => /SyntaxError/.test(l)) || String(x.stderr || '').trim().split('\n')[0];
      return `${rel}: sintaxis rota (${linea.trim().slice(0, 200)})`;
    }
  }
  return null;
};
