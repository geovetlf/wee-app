/**
 * LA AUTOCORRECCIÓN: ROLLBACK Y CONTENCIÓN, COMPROBADOS POR HASH DEL ÁRBOL ENTERO — `ops/guardian/autocorreccion.mjs` (Guardian · revisión previa, 2026-10-15).
 *
 *   node test/guardian-contencion.test.mjs        (desde functions/; repositorios temporales, sin red)
 *
 * Complementa a `guardian-autocorreccion.test.mjs`. Allí se comprueba el flujo; aquí, con el HASH de TODOS los archivos del árbol del usuario
 * (seguidos, modificados y sin seguimiento, sin contar `.git`) antes y después, que:
 *
 *   A  ROLLBACK: un corrector que produce un parche cuya verificación FALLA se revierte, y solo su parche: lo que el Guardian había aplicado antes
 *      (otra corrección) queda como estaba, y el trabajo sin guardar del usuario no se toca.
 *   B  ROLLBACK DE LA APLICACIÓN: si tras aplicar un parche los archivos no quedan como se verificó, se deshace con el parche inverso.
 *   C  CONTENCIÓN: un corrector que toca otro archivo, un archivo protegido, un control (la huella de los controles), borra o crea archivos, o
 *      escribe en el árbol del usuario (el worktree principal) en vez de en su copia, se RECHAZA; lo que escribió en el árbol se DEVUELVE; y el árbol
 *      queda con el mismo hash que antes.
 *   D  LO DERIVADO: `lib-desfasado` no puede borrar fuera de `functions/lib`.
 *   E  SABOTAJE: sin la comprobación del árbol del usuario, la escritura directa se acepta.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallos = 0;
const check = (n, c, extra = '') => { console.log(`${c ? '✔' : '✘'} ${n}${extra ? ` — ${extra}` : ''}`); if (!c) fallos++; };
const imp = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const motor = await imp('ops/guardian/autocorreccion.mjs');
const { CORRECTORES } = await imp('ops/guardian/correctores.mjs');
const jsonConBom = CORRECTORES.find((c) => c.id === 'json-con-bom');
const libCorrector = CORRECTORES.find((c) => c.id === 'lib-desfasado');
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const NOMBRE_SUITE = 'guardian-autocorreccion';
const limpiezas = [];
process.on('exit', () => { for (const d of limpiezas) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ya no está */ } } });
const sh = (cwd, args) => spawnSync('git', ['-c', 'core.hooksPath=', '-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', '-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
const bom = (o) => Buffer.concat([BOM, Buffer.from(JSON.stringify(o, null, 2))]);

const repo = (extra = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-c-'));
  limpiezas.push(dir, `${dir}-estado`);
  sh(dir, ['init', '-q', '-b', 'main']);
  const base = {
    'functions/package.json': JSON.stringify({ scripts: { test: `node test/${NOMBRE_SUITE}.test.mjs` } }),
    [`functions/test/${NOMBRE_SUITE}.test.mjs`]: '// json-con-bom json-coma-final lib-desfasado\n',
    '.github/workflows/ci.yml': 'name: CI\n', 'README.md': '# t\n', 'config/a.json': bom({ a: 1 }), 'config/b.json': bom({ b: 2 }), 'otro/ajeno.txt': 'ajeno\n', ...extra,
  };
  for (const [rel, c] of Object.entries(base)) { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), c); }
  sh(dir, ['add', '-A']); sh(dir, ['commit', '-q', '--no-verify', '-m', 'base']);
  return dir;
};
/** El hash de TODO el árbol del usuario (todo lo que no es .git): ruta y contenido de cada archivo, también los sin seguimiento. */
const hashDelArbol = (dir) => {
  const h = crypto.createHash('sha256');
  const visitar = (rel) => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.name === '.git') continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) visitar(r); else h.update(`${r}\0${crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, r))).digest('hex')}\n`);
    }
  };
  visitar('');
  return h.digest('hex');
};
const ESTADO = (d) => `${d}-estado`;
const verde = async () => [{ nombre: 'v', ok: true, detalle: 'stub' }];
const roja = async () => [{ nombre: 'v', ok: false, detalle: 'stub rojo' }];
const hallazgo = (raiz, rel) => jsonConBom.detectar({ raiz, archivos: motor.archivosSeguidos(raiz) }).find((x) => x.archivos[0] === rel);
const ramas = (d) => sh(d, ['branch', '--list', 'guardian/auto/*']).stdout.trim();
const arboles = (d) => sh(d, ['worktree', 'list']).stdout.trim().split('\n').length - 1;

console.log('\n── A · Rollback: solo su parche ──');
{
  const d = repo();
  /* El usuario tiene trabajo SIN GUARDAR (un archivo modificado y uno nuevo): el Guardian no lo puede tocar. */
  fs.writeFileSync(path.join(d, 'otro/ajeno.txt'), 'ajeno MODIFICADO sin guardar\n');
  fs.writeFileSync(path.join(d, 'nuevo-sin-seguimiento.txt'), 'trabajo del usuario\n');
  /* 1) Una corrección buena, aplicada. */
  const ra = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: hallazgo(d, 'config/a.json'), verificar: verde, aplicar: true });
  const trasA = hashDelArbol(d);
  check('1) una corrección verificada y aplicada (config/a.json) queda hecha', ra.estado === 'APLICADA' && !fs.readFileSync(path.join(d, 'config/a.json')).subarray(0, 3).equals(BOM));
  /* 2) Otra, cuya verificación FALLA. */
  const rb = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: hallazgo(d, 'config/b.json'), verificar: roja, aplicar: true });
  check('2) la segunda (config/b.json) falla su verificación: RECHAZADA, sin su rama, sin copia y sin su parche (la rama aceptada de A se conserva)', rb.estado === 'RECHAZADA' && !ramas(d).includes(rb.clave.slice(0, 8)) && ramas(d).includes(ra.clave.slice(0, 8)) && arboles(d) === 0 && !fs.existsSync(path.join(ESTADO(d), 'parches', `${rb.clave}.patch`)));
  check('3) el hash del árbol ENTERO es idéntico al de antes del intento: revirtió solo su parche (y no tocó la corrección A, ni el trabajo sin guardar)', hashDelArbol(d) === trasA);
  check('4) la corrección A sigue aplicada y revertible por su propia clave; B no está en el registro como aplicada', fs.readFileSync(path.join(d, 'config/b.json')).subarray(0, 3).equals(BOM)
    && motor.leerRegistro(ESTADO(d)).some((e) => e.clave === ra.clave && e.estado === 'APLICADA') && !motor.leerRegistro(ESTADO(d)).some((e) => e.clave === rb.clave && e.estado === 'APLICADA'));
  check('5) el trabajo del usuario sin guardar (un archivo modificado y uno sin seguimiento) está exactamente como lo dejó', fs.readFileSync(path.join(d, 'otro/ajeno.txt'), 'utf8') === 'ajeno MODIFICADO sin guardar\n' && fs.readFileSync(path.join(d, 'nuevo-sin-seguimiento.txt'), 'utf8') === 'trabajo del usuario\n');
  const rv = motor.revertir({ raiz: d, estadoDir: ESTADO(d), clave: ra.clave });
  check('6) revertir A deja el árbol como estaba ANTES de A (incluido el trabajo sin guardar)', rv.estado === 'REVERTIDA' && fs.readFileSync(path.join(d, 'config/a.json')).equals(bom({ a: 1 })) && fs.readFileSync(path.join(d, 'otro/ajeno.txt'), 'utf8') === 'ajeno MODIFICADO sin guardar\n');
}

console.log('\n── B · Rollback de la APLICACIÓN ──');
{
  const d = repo();
  const antes = hashDelArbol(d);
  const r = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: hallazgo(d, 'config/a.json'), verificar: verde });
  check('7) preparada y aceptada (sin aplicar): el árbol es idéntico', r.estado === 'ACEPTADA' && hashDelArbol(d) === antes);
  /* Se falsea lo que el Guardian cree haber verificado: tras aplicar, el archivo NO quedará como dice el registro. */
  const reg = path.join(ESTADO(d), 'registro.jsonl');
  const lineas = fs.readFileSync(reg, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const e = lineas.find((x) => x.estado === 'ACEPTADA');
  e.despues['config/a.json'] = '0'.repeat(64);
  fs.writeFileSync(reg, `${lineas.map((l) => JSON.stringify(l)).join('\n')}\n`);
  const ap = motor.aplicarAceptada({ raiz: d, estadoDir: ESTADO(d), clave: r.clave });
  check('8) si tras aplicar el archivo no queda como se verificó, se DESHACE con el parche inverso: FALLO y el árbol vuelve a ser idéntico', ap.estado === 'FALLO' && hashDelArbol(d) === antes, ap.motivo);
  const e2 = lineas.find((x) => x.estado === 'ACEPTADA');
  fs.writeFileSync(path.join(ESTADO(d), 'parches', `${r.clave}.patch`), `${fs.readFileSync(path.join(ESTADO(d), 'parches', `${r.clave}.patch`), 'utf8')}\n# tocado`);
  check('9) un parche guardado que cambió (su huella ya no coincide) no se aplica y no toca nada', motor.aplicarAceptada({ raiz: d, estadoDir: ESTADO(d), clave: r.clave }).estado === 'FALLO' && hashDelArbol(d) === antes && e2 !== undefined);
}

console.log('\n── C · Contención: el corrector solo toca SU parche ──');
const maliciosos = [
  ['toca otro archivo del repositorio', (a) => fs.writeFileSync(path.join(a.dir, 'README.md'), 'colado\n'), ['alcance']],
  ['toca un archivo protegido (la CI)', (a) => fs.writeFileSync(path.join(a.dir, '.github/workflows/ci.yml'), 'name: CI\n# debilitada\n'), ['alcance', 'rutas-protegidas', 'controles-intactos']],
  ['borra la prueba de regresión', (a) => fs.rmSync(path.join(a.dir, `functions/test/${NOMBRE_SUITE}.test.mjs`)), ['alcance', 'rutas-protegidas', 'controles-intactos']],
  ['edita una prueba (la debilita)', (a) => fs.writeFileSync(path.join(a.dir, `functions/test/${NOMBRE_SUITE}.test.mjs`), '// json-con-bom json-coma-final lib-desfasado\n// debilitada\n'), ['controles-intactos', 'rutas-protegidas']],
  ['crea un archivo nuevo', (a) => fs.writeFileSync(path.join(a.dir, 'nuevo.txt'), 'x'), ['alcance']],
  ['borra un archivo ajeno', (a) => fs.rmSync(path.join(a.dir, 'otro/ajeno.txt')), ['alcance']],
  ['renombra el archivo corregido', (a) => fs.renameSync(path.join(a.dir, 'config/a.json'), path.join(a.dir, 'config/a2.json')), ['alcance']],
  ['no cambia nada', () => {}, ['alcance']],
];
for (const [i, [nombre, accion, esperadas]] of maliciosos.entries()) {
  const d = repo();
  fs.writeFileSync(path.join(d, 'trabajo-sin-guardar.txt'), 'x\n');
  const antes = hashDelArbol(d);
  const malo = { ...jsonConBom, corregir: (a) => { if (nombre !== 'no cambia nada' && nombre !== 'renombra el archivo corregido') jsonConBom.corregir(a); accion(a); } };
  const r = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: malo, hallazgo: hallazgo(d, 'config/a.json'), verificar: verde, aplicar: true });
  const rojas = (motor.leerRegistro(ESTADO(d)).at(-1).verificaciones || []).filter((x) => !x.ok).map((x) => x.nombre);
  check(`10.${i + 1}) un corrector que ${nombre}: RECHAZADA (${esperadas.join(', ')}) y el árbol del usuario queda con el MISMO hash`,
    r.estado === 'RECHAZADA' && esperadas.every((n) => rojas.includes(n)) && hashDelArbol(d) === antes && ramas(d) === '' && arboles(d) === 0, `${r.estado} ${rojas.join()}`);
}
{
  /* El corrector escribe en el ÁRBOL DEL USUARIO (el worktree principal), no en su copia. */
  const casos = [
    ['modifica un archivo limpio del árbol del usuario', (a, raiz) => fs.writeFileSync(path.join(raiz, 'README.md'), 'escrito en el arbol del usuario\n')],
    ['crea un archivo en el árbol del usuario', (a, raiz) => fs.writeFileSync(path.join(raiz, 'creado-por-el-corrector.txt'), 'x\n')],
    ['borra un archivo del árbol del usuario', (a, raiz) => fs.rmSync(path.join(raiz, 'otro/ajeno.txt'))],
    ['escribe el archivo que corrige, pero en el árbol del usuario (no en su copia)', (a, raiz) => fs.writeFileSync(path.join(raiz, 'config/a.json'), bom({ a: 1 }).subarray(3))],
    ['pisa el trabajo sin guardar del usuario', (a, raiz) => fs.writeFileSync(path.join(raiz, 'trabajo-sin-guardar.txt'), 'PISADO\n')],
  ];
  for (const [i, [nombre, accion]] of casos.entries()) {
    const d = repo();
    fs.writeFileSync(path.join(d, 'trabajo-sin-guardar.txt'), 'trabajo sin guardar del usuario\n');
    const antes = hashDelArbol(d);
    const malo = { ...jsonConBom, corregir: (a) => { jsonConBom.corregir(a); accion(a, d); } };
    const r = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: malo, hallazgo: hallazgo(d, 'config/a.json'), verificar: verde, aplicar: true });
    const ult = motor.leerRegistro(ESTADO(d)).at(-1);
    check(`11.${i + 1}) un corrector que ${nombre}: RECHAZADA, lo escrito se DEVUELVE y el hash del árbol es idéntico al de antes`,
      r.estado === 'RECHAZADA' && /arbol-del-usuario-intacto/.test(r.motivo) && hashDelArbol(d) === antes && ult.arbolDelUsuario !== 'intacto' && ult.arbolDelUsuario.devueltoAlOriginal === true, `${r.estado} ${String(r.motivo).slice(0, 140)}`);
  }
}

console.log('\n── D · Lo derivado (functions/lib) no puede borrar fuera de functions/lib ──');
{
  const d = repo({ 'functions/lib/viejo.js': '//huerfano', 'functions/src/importante.ts': 'export const x = 1;\n' });
  const antes = hashDelArbol(d);
  let compilado = false;
  const lib = () => (compilado ? { fuentes: 1, faltan: [], viejos: [], huerfanos: [] } : { fuentes: 1, faltan: [], viejos: [], huerfanos: ['../../README.md', '../src/importante.ts', 'viejo.js'] });
  const h = libCorrector.detectar({ raiz: d, archivos: [], libDesfasadoDe: lib })[0];
  const r = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: libCorrector, hallazgo: h, libDesfasadoDe: lib, ejecutar: async () => { compilado = true; } });
  check('12) un «huérfano» con `..` (que apunta a README.md o a functions/src) se rechaza: no se borra nada fuera de functions/lib', r.estado === 'RECHAZADA' && fs.existsSync(path.join(d, 'README.md')) && fs.existsSync(path.join(d, 'functions/src/importante.ts')), r.estado);
  check('13) y el árbol del usuario sigue idéntico salvo lo que el corrector derivado podía tocar (functions/lib): aquí, el hash de todo lo demás', (() => {
    const sinLib = (dir) => { const h2 = crypto.createHash('sha256'); for (const f of ['README.md', 'functions/src/importante.ts', 'config/a.json', 'otro/ajeno.txt']) h2.update(fs.readFileSync(path.join(dir, f))); return h2.digest('hex'); };
    return sinLib(d) === (() => { const h2 = crypto.createHash('sha256'); h2.update('# t\n'); h2.update('export const x = 1;\n'); h2.update(bom({ a: 1 })); h2.update('ajeno\n'); return h2.digest('hex'); })();
  })() && antes !== undefined);
}

console.log('\n── E · Sabotaje: sin la comprobación del árbol del usuario ──');
{
  const texto = fs.readFileSync(path.join(RAIZ, 'ops/guardian/autocorreccion.mjs'), 'utf8');
  const a = 'const arbolAhora = revisarArbol(raiz, fotoAntes);';
  if (!texto.includes(a)) throw new Error('el sabotaje no encuentra su punto');
  const f = path.join(RAIZ, `ops/guardian/_sabotaje-contencion-${process.pid}.mjs`);
  fs.writeFileSync(f, texto.split(a).join('const arbolAhora = { ok: true, cambiados: [] };'));
  let mut;
  try { mut = await import(`${pathToFileURL(f).href}?${Date.now()}`); } finally { fs.rmSync(f, { force: true }); }
  const d = repo();
  const antes = hashDelArbol(d);
  const malo = { ...jsonConBom, corregir: (x) => { jsonConBom.corregir(x); fs.writeFileSync(path.join(d, 'README.md'), 'escrito en el arbol del usuario\n'); } };
  const r = await mut.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: malo, hallazgo: hallazgo(d, 'config/a.json'), verificar: verde });
  check('14) SABOTAJE sin vigilar el árbol del usuario: el corrector que escribe fuera de su copia se ACEPTA y el árbol cambia (C lo detecta)', r.estado === 'ACEPTADA' && hashDelArbol(d) !== antes);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
