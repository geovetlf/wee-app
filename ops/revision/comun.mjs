/*
 * LO COMÚN DEL REVISOR DE WEË — git, rutas, huellas y clases de archivo.
 *
 * Una sola fuente para lo que necesitan los detectores (`detectores.mjs`), la baseline (`baseline.mjs`) y el
 * selector (`selector.mjs`): qué archivos sigue git, qué cambió desde un commit, qué es un test, qué es cliente o
 * servidor y cómo se calcula una huella que no cambia por un espacio o un comentario.
 *
 * Todo es local y determinista: git sin red, sin IA, sin escribir nada en el repositorio.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const RAIZ_POR_DEFECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* ── git ─────────────────────────────────────────────────────────────────── */

/**
 * Ejecuta git en `raiz`. `core.quotepath=off` para que una ruta con «ë» salga tal cual y no en octal.
 * Devuelve stdout (texto o Buffer); lanza si git falla, salvo `permitirFallo`.
 */
export const git = (raiz, args, { permitirFallo = false, entrada, binario = false } = {}) => {
  const r = spawnSync('git', ['-C', raiz, '-c', 'core.quotepath=off', ...args], {
    ...(binario ? {} : { encoding: 'utf8' }),
    input: entrada,
    maxBuffer: 1024 * 1024 * 512,
    windowsHide: true,
  });
  if (r.status !== 0) {
    if (permitirFallo) return null;
    const err = binario ? String(r.stderr) : r.stderr;
    throw new Error(`git ${args.join(' ')} falló: ${(err || '').trim()}`);
  }
  return r.stdout;
};

const partirZ = (salida) => String(salida || '').split('\0').filter(Boolean);

/** Los archivos que sigue git (incluidos los `git add -N`), con barras normales. */
export const archivosSeguidos = (raiz) => partirZ(git(raiz, ['ls-files', '-z'])).map((r) => r.replace(/\\/g, '/'));

/** ¿Existe este commit? */
export const existeCommit = (raiz, ref) => git(raiz, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { permitirFallo: true }) !== null;

/**
 * Lo que cambió desde `base` hasta la COPIA DE TRABAJO (no solo hasta HEAD): incluye lo modificado sin commit y
 * lo marcado con `git add -N`. Sin renombres: un renombre es un borrado y un alta, que es lo que el revisor ve.
 */
export const cambiosDesde = (raiz, base) => {
  const campos = partirZ(git(raiz, ['diff', '--name-status', '-z', '--no-renames', base]));
  const res = [];
  for (let i = 0; i + 1 < campos.length; i += 2) res.push({ estado: campos[i][0], ruta: campos[i + 1].replace(/\\/g, '/') });
  return res;
};

/** Los archivos que había en `base`. */
export const archivosEnBase = (raiz, base) => partirZ(git(raiz, ['ls-tree', '-r', '-z', '--name-only', base]));

/**
 * El contenido de varios archivos en `base`, con UN solo proceso (`git cat-file --batch`). Devuelve un Map
 * ruta → texto; las rutas que no estaban en `base` no aparecen.
 */
export const contenidosEnBase = (raiz, base, rutas) => {
  const mapa = new Map();
  if (!rutas.length) return mapa;
  const salida = git(raiz, ['cat-file', '--batch'], { entrada: rutas.map((r) => `${base}:${r}`).join('\n') + '\n', binario: true });
  let pos = 0;
  for (const ruta of rutas) {
    const fin = salida.indexOf(0x0a, pos);
    if (fin < 0) break;
    const cabecera = salida.subarray(pos, fin).toString('utf8');
    pos = fin + 1;
    if (/ missing$/.test(cabecera)) continue;
    const tam = Number(cabecera.split(' ')[2]);
    mapa.set(ruta, salida.subarray(pos, pos + tam).toString('utf8'));
    pos += tam + 1;
  }
  return mapa;
};

/** La fecha (ISO) de un commit. */
export const fechaDeCommit = (raiz, ref) => String(git(raiz, ['show', '-s', '--format=%cI', ref], { permitirFallo: true }) || '').trim() || null;

/** El diff con contexto cero de unas rutas (para leer líneas añadidas y retiradas). */
export const diffCeroContexto = (raiz, base, rutas) => git(raiz, ['diff', '--no-color', '--unified=0', '--no-renames', base, '--', ...rutas], { permitirFallo: true }) || '';

/* ── huellas ─────────────────────────────────────────────────────────────── */

export const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

/**
 * Normaliza un fragmento de código para la huella: sin comentarios y sin espacios repetidos. Con el escáner de
 * TypeScript, que sabe qué es un comentario y qué es una cadena; las piezas se unen con un espacio.
 */
export const normalizarCodigo = (texto) => {
  const escaner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.JSX, texto);
  const piezas = [];
  for (let t = escaner.scan(); t !== ts.SyntaxKind.EndOfFileToken; t = escaner.scan()) piezas.push(escaner.getTokenText());
  return piezas.join(' ');
};

/** Lo mismo para archivos que no son código (reglas de Firebase): fuera comentarios de línea y de bloque, y espacios repetidos. */
export const normalizarTexto = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ').replace(/\s+/g, ' ').trim();

export const huellaDe = (texto, { codigo = true } = {}) => sha256(codigo ? normalizarCodigo(texto) : normalizarTexto(texto));

/** Líneas de un texto (la última sin salto también cuenta). */
export const contarLineas = (texto) => {
  if (!texto) return 0;
  let n = 0;
  for (let i = 0; i < texto.length; i++) if (texto.charCodeAt(i) === 10) n++;
  return texto.endsWith('\n') ? n : n + 1;
};

/** Un fragmento corto, en una línea, para la evidencia. */
export const corto = (t, max = 160) => {
  const s = String(t).replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

/* ── clases de archivo ───────────────────────────────────────────────────── */

export const EXT_CODIGO = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

export const esCodigo = (ruta) => EXT_CODIGO.some((e) => ruta.endsWith(e));
export const esDeclaracion = (ruta) => /\.d\.[cm]?ts$/.test(ruta);
export const esTest = (ruta) =>
  /(^|\/)(test|tests|__tests__)\//.test(ruta) || /\.(test|spec|emulator)\.[cm]?[jt]sx?$/.test(ruta);
export const esServidor = (ruta) => ruta.startsWith('functions/src/');

/** Carpetas de primer nivel que NO son la app: herramientas, documentación, despliegue. */
const NO_CLIENTE = ['functions/', 'scripts/', 'ops/', 'design/', 'docs/', '.claude/', '.github/', 'public/', 'legal/', 'node_modules/'];
export const esCliente = (ruta) =>
  esCodigo(ruta) && !esTest(ruta) && !NO_CLIENTE.some((p) => ruta.startsWith(p)) && !/^[^/]*\.config\.[cm]?[jt]s$/.test(ruta);

/** Variante de plataforma de React Native (`.native.`, `.ios.`, `.android.`): no corre en la web. */
export const esSoloNativo = (ruta) => /\.(native|ios|android)\.[cm]?[jt]sx?$/.test(ruta);

/** Fuera del análisis siempre: dependencias, compilado de Functions y el catálogo de lugares (datos, no código). */
export const EXCLUIDOS = [/^node_modules\//, /\/node_modules\//, /^functions\/lib\//, /^data\/citiesWorld\.ts$/];
export const excluido = (ruta) => EXCLUIDOS.some((re) => re.test(ruta));

/** Un espejo o tabla generada lo dice en su cabecera («GENERADO por …»). */
export const esGenerado = (texto) => /\bGENERADO\b/.test(texto.slice(0, 800));

/* ── patrones de rutas ───────────────────────────────────────────────────── */

/** Glob mínimo: `**` cruza carpetas, `*` no, `{a,b}` es una alternativa; el resto es literal. */
export const globARegex = (glob) => {
  let re = '';
  let llaves = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
      i += glob[i + 2] === '/' ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '{') { llaves++; re += '(?:'; }
    else if (c === '}' && llaves > 0) { llaves--; re += ')'; }
    else if (c === ',' && llaves > 0) re += '|';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
};

const cacheGlobs = new Map();
export const coincide = (ruta, globs) =>
  globs.some((g) => {
    if (!cacheGlobs.has(g)) cacheGlobs.set(g, globARegex(g));
    return cacheGlobs.get(g).test(ruta);
  });

/* ── argumentos de línea de órdenes ──────────────────────────────────────── */

/** `--clave valor` y `--bandera`. Las banderas sin valor se declaran en `banderas`. */
export const leerArgumentos = (argv, banderas = []) => {
  const res = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { res._.push(a); continue; }
    const clave = a.slice(2);
    if (banderas.includes(clave)) res[clave] = true;
    else { res[clave] = argv[i + 1]; i++; }
  }
  return res;
};

export const lista = (valor) => (valor ? String(valor).split(',').map((x) => x.trim()).filter(Boolean) : null);

export const leerJson = (archivo) => JSON.parse(fs.readFileSync(archivo, 'utf8'));

export const escribirJson = (archivo, datos) => {
  fs.mkdirSync(path.dirname(path.resolve(archivo)), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2) + '\n');
};
