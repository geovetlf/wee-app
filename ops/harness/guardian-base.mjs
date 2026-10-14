/*
 * LA AUTOPROTECCIÓN DEL BUILD GUARDIAN: EL CAMBIO, JUZGADO TAMBIÉN POR EL GUARDIAN DE LA BASE — `ops/harness/guardian-base.mjs`.
 *
 * Problema (H-23): un cambio que toca las protecciones del propio Guardian (sus reglas, la guardia, la política, el
 * intérprete del veredicto) se juzga con el código que trae ese mismo cambio, así que un PR que debilite el Guardian
 * se aprobaría a sí mismo. Aquí, cuando el diff toca `PROTECCIONES_PROPIAS`, se ejecuta el paso de CI de la BASE
 * (`ops/harness/guardian-ci.mjs` de ese commit, con SU política, SU Guardian y SU guardia) sobre el mismo diff, desde
 * una copia temporal sacada de git (`git show <base>:<ruta>`) fuera del repositorio. Su veredicto suma: si la base
 * BLOQUEA, el paso BLOQUEA; si la base FALLA, el paso FALLA; un fallo nunca es verde.
 *
 * Lo que NO garantiza (y se dice en la salida): quien llama a esto es el código del cambio. Un cambio que reescriba
 * también este archivo, `guardian-ci.mjs` o el paso de `ci.yml` puede saltárselo; eso solo lo para una revisión humana
 * (CODEOWNERS + protección de rama, configuración remota del dueño) o un workflow que venga de la base. Si la base aún
 * no tiene el Guardian estricto (la primera integración), la verificación queda NO DISPONIBLE y se dice.
 *
 * Escribe SOLO en su carpeta temporal (os.tmpdir()) y la borra al acabar; del repositorio solo lee (git ls-tree / show).
 * Lo fija functions/test/guardian-bloqueante.test.mjs.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Lo que necesita el Guardian de la base para ejecutarse (sus imports relativos). */
export const RUTAS_DEL_GUARDIAN = Object.freeze(['ops', '.claude/hooks', 'scripts/ci-local.mjs', 'functions/test/_cadena.mjs']);
/** Sin estos tres en la base no hay paso de CI estricto que ejecutar: la verificación no está disponible. */
export const IMPRESCINDIBLES = Object.freeze(['ops/harness/guardian-ci.mjs', 'ops/harness/guardian-estricto.mjs', 'ops/harness/guardian-base-resolver.mjs']);
/** Lo que este mecanismo no puede verificar de forma independiente: su propio camino de ejecución. */
export const ORQUESTACION = Object.freeze(['ops/harness/guardian-ci.mjs', 'ops/harness/guardian-base.mjs', '.github/workflows/ci.yml']);
export const MARCA_ANIDADA = 'GUARDIAN_DESDE_LA_BASE';
export const TIEMPO_BASE_MS = 10 * 60 * 1000;
const SHA = /^[0-9a-f]{7,40}$/i;

const git = (raiz, args, opciones = {}) => spawnSync('git', ['-C', raiz, ...args], { windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...opciones });

/** Copia a `destino` los archivos del Guardian tal como están en `base`. Devuelve las rutas copiadas. */
export const materializarBase = ({ raiz, base, destino }) => {
  const ls = git(raiz, ['ls-tree', '-r', '-z', '--name-only', base, '--', ...RUTAS_DEL_GUARDIAN], { encoding: 'utf8' });
  if (ls.status !== 0) throw new Error(`git ls-tree ${base} falló: ${String(ls.stderr || '').trim().slice(0, 200)}`);
  const rutas = String(ls.stdout).split('\0').filter(Boolean);
  for (const rel of rutas) {
    if (rel.includes('..') || path.isAbsolute(rel)) throw new Error(`ruta no válida en la base: ${rel}`);
    const contenido = git(raiz, ['show', `${base}:${rel}`]);
    if (contenido.status !== 0) throw new Error(`git show ${base}:${rel} falló`);
    const abs = path.join(destino, rel);
    if (!abs.startsWith(destino + path.sep)) throw new Error(`ruta fuera de la copia: ${rel}`);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenido.stdout);
  }
  return rutas;
};

/** Pura: lo que significa la salida del paso de CI de la base (su contrato: 0 PASA · 1 BLOQUEA · 3 FALLO). */
export const interpretarBase = (x) => {
  const salida = String(x?.stdout || '');
  const cola = (salida + String(x?.stderr || '')).trim().split('\n').slice(-6).join('\n');
  if (!x || x.error) return { resultado: 'FALLO', motivo: x?.error?.code === 'ETIMEDOUT' ? 'el Guardian de la base agotó su tiempo' : `el Guardian de la base no se pudo ejecutar (${x?.error?.code || x?.error?.message || 'sin resultado'})`, cola };
  if (x.signal) return { resultado: 'FALLO', motivo: `el Guardian de la base terminó por la señal ${x.signal}`, cola };
  if (x.status === 0 && /^✔ PASA: /m.test(salida)) return { resultado: 'PASA', motivo: 'el Guardian de la base no ve ningún CRITICAL de su política', cola };
  if (x.status === 1 && /^✘ BLOQUEA: /m.test(salida)) return { resultado: 'BLOQUEA', motivo: (salida.match(/^✘ BLOQUEA: (.*)$/m) || [])[1] || 'bloquea', cola };
  return { resultado: 'FALLO', motivo: `salida ${x.status} del Guardian de la base sin su línea de veredicto (¿no carga?)`, cola };
};

/**
 * Ejecuta el paso de CI de la base sobre el diff `base..HEAD` de `raiz`. Devuelve
 * `{ estado: 'NO_APLICA' | 'NO_DISPONIBLE' | 'PASA' | 'BLOQUEA' | 'FALLO', motivo, cola?, directorio? }`.
 * `node` y `tiempoMs` existen para las pruebas.
 */
export const verificarDesdeLaBase = ({ raiz, base, entorno = process.env, tiempoMs = TIEMPO_BASE_MS, node = process.execPath } = {}) => {
  if (entorno[MARCA_ANIDADA]) return { estado: 'NO_APLICA', motivo: 'ya es la verificación de la base (sin recursión)' };
  if (typeof base !== 'string' || !SHA.test(base)) {
    const r = git(raiz, ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { encoding: 'utf8' });
    if (r.status !== 0) return { estado: 'FALLO', motivo: `la base ${base} no es un commit de este clon` };
  }
  let directorio;
  try {
    directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-base-'));
    const copia = path.join(directorio, 'base');
    fs.mkdirSync(copia);
    const rutas = materializarBase({ raiz, base, destino: copia });
    const faltan = IMPRESCINDIBLES.filter((r) => !rutas.includes(r));
    if (faltan.length) return { estado: 'NO_DISPONIBLE', motivo: `la base ${base} no tiene el Guardian estricto (${faltan.join(', ')}): este cambio no se puede verificar con código ajeno a él`, directorio };
    const resolutor = pathToFileURL(path.join(copia, 'ops/harness/guardian-base-resolver.mjs')).href;
    const env = {
      ...entorno, GUARDIAN_BASE: base, GUARDIAN_RAIZ: raiz, [MARCA_ANIDADA]: '1',
      GUARDIAN_BASE_ANCLA: pathToFileURL(path.join(REPO, 'package.json')).href,
      NODE_OPTIONS: `${entorno.NODE_OPTIONS ? `${entorno.NODE_OPTIONS} ` : ''}--import=${resolutor}`,
    };
    delete env.GITHUB_EVENT_PATH;
    const x = spawnSync(node, [path.join(copia, 'ops/harness/guardian-ci.mjs'), '--raiz', raiz],
      { cwd: copia, encoding: 'utf8', env, timeout: tiempoMs, killSignal: 'SIGKILL', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
    const i = interpretarBase(x);
    return { estado: i.resultado, motivo: i.motivo, cola: i.cola, directorio };
  } catch (e) {
    return { estado: 'FALLO', motivo: `no se pudo preparar el Guardian de la base (${e && e.message})`, directorio };
  } finally {
    if (directorio) { try { fs.rmSync(directorio, { recursive: true, force: true }); } catch { /* se informa abajo si queda */ } }
  }
};
