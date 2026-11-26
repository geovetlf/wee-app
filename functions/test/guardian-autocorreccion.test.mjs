/**
 * LA AUTOCORRECCIÓN DEL GUARDIAN — `ops/guardian/autocorreccion.mjs`, `ops/guardian/correctores.mjs`.
 *
 *   node test/guardian-autocorreccion.test.mjs        (desde functions/; no usa el compilado ni la red)
 *
 * Qué fija, cada cosa EJECUTANDO el mecanismo sobre repositorios temporales (nunca sobre este árbol):
 *
 *   A  los CERROJOS: los controles que la autocorrección no puede tocar (rutas y huella), y las categorías que son de una persona.
 *   B  los CORRECTORES (json-con-bom, json-coma-final, lib-desfasado): lo que detectan, lo que NO (un JSON roto por otra cosa no
 *      es suyo), y que corrigen byte a byte.
 *   C  el FLUJO: copia aislada → verificar → aceptar solo si TODO pasa → aplicar → revertir; un intento por fallo; sin bucles.
 *   D  la REVERSIÓN: solo lo que el Guardian aplicó, y solo si nadie lo tocó después.
 *   E  los CERROJOS en acción: un corrector que toca un control, que borra una prueba o que se sale de lo declarado se RECHAZA, y
 *      el árbol del usuario queda idéntico; nada protegido se corrige sin una persona.
 *   F  la REGRESIÓN permanente de los fallos reales (json-con-bom, json-coma-final, lib-desfasado) y de este árbol.
 *   G  el motor NO hace push, red, reset, revert ni despliegue.
 *   H  SABOTAJES: cada cerrojo, quitado del código, hace que la prueba que lo vigila falle.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) fallos++;
};
const imp = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);

const motor = await imp('ops/guardian/autocorreccion.mjs');
const { CORRECTORES, quitarComasFinales } = await imp('ops/guardian/correctores.mjs');
const { PROTECCIONES_PROPIAS } = await imp('ops/harness/guardian-ci.mjs');
const { libDesfasado } = await import(pathToFileURL(path.join(aqui, '_cadena.mjs')).href);
const jsonConBom = CORRECTORES.find((c) => c.id === 'json-con-bom');
const jsonComa = CORRECTORES.find((c) => c.id === 'json-coma-final');
const libCorrector = CORRECTORES.find((c) => c.id === 'lib-desfasado');

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sh = (cwd, args, extra = {}) => spawnSync('git', ['-c', 'core.hooksPath=', '-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', '-C', cwd, ...args], { encoding: 'utf8', windowsHide: true, ...extra });
const limpiezas = [];
process.on('exit', () => { for (const d of limpiezas) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ya no está */ } } });

/** Un repositorio git temporal con una cadena de `npm test` que ya contiene la prueba de regresión. */
const NOMBRE_SUITE = 'guardian-autocorreccion';
const repo = (archivos = {}, { conRegresion = true } = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-t-'));
  limpiezas.push(dir);
  sh(dir, ['init', '-q', '-b', 'main']);
  const base = {
    'functions/package.json': JSON.stringify({ scripts: { test: `node test/${NOMBRE_SUITE}.test.mjs` } }),
    ...(conRegresion ? { [`functions/test/${NOMBRE_SUITE}.test.mjs`]: '// json-con-bom json-coma-final lib-desfasado\n' } : {}),
    '.github/workflows/ci.yml': 'name: CI\n',
    'README.md': '# t\n',
    ...archivos,
  };
  for (const [rel, c] of Object.entries(base)) { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), c); }
  sh(dir, ['add', '-A']);
  sh(dir, ['commit', '-q', '--no-verify', '-m', 'base']);
  return dir;
};
const estado = (dir) => sh(dir, ['status', '--porcelain', '--untracked-files=all']).stdout;
const ramas = (dir) => sh(dir, ['branch', '--list', 'guardian/auto/*']).stdout.trim();
const arbolesExtra = (dir) => sh(dir, ['worktree', 'list']).stdout.trim().split('\n').length - 1;
const verde = async () => [{ nombre: 'verificacion-de-prueba', ok: true, detalle: 'stub' }];
const roja = async () => [{ nombre: 'verificacion-de-prueba', ok: false, detalle: 'stub rojo' }];
const hallazgoDe = (c, raiz) => c.detectar({ raiz, archivos: motor.archivosSeguidos(raiz) })[0];
const conBom = (obj) => Buffer.concat([BOM, Buffer.from(JSON.stringify(obj, null, 2))]);
/* El estado vive FUERA del repositorio temporal (en el real es `ops/guardian/.estado`, ignorado por git): así `git status` solo ve lo que el Guardian cambia de verdad. */
const ESTADO = (dir) => { const e = `${dir}-estado`; if (!limpiezas.includes(e)) limpiezas.push(e); return e; };

/* ── A · Los cerrojos ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── A · Los cerrojos: lo que la autocorrección no puede tocar ──');
{
  const muestra = (g) => g.replace(/\*\*/g, 'x/y').replace(/\*/g, 'z');
  const sinCubrir = PROTECCIONES_PROPIAS.filter((g) => !motor.esProtegida(muestra(g)));
  check('1) PROTEGIDAS cubre cada una de las PROTECCIONES_PROPIAS del Guardian (un control nuevo no queda fuera sin que esta prueba lo note)', sinCubrir.length === 0, sinCubrir.join(' ') || `${PROTECCIONES_PROPIAS.length} patrones`);
  check('2) y también las pruebas, las huellas, el mapa de dominios, la CI, la guardia y las reglas de seguridad',
    ['functions/test/credits.test.mjs', 'functions/test/_cadena.mjs', 'ops/guardian/huellas.json', 'ops/guardian/dominios.json', 'ops/guardian/autocorreccion.mjs', '.github/workflows/ci.yml', '.claude/settings.json', '.claude/hooks/guardia.mjs', 'firestore.rules', 'storage.rules', 'ops/harness/guardian.mjs', 'ops/revision/reglas.mjs', 'scripts/ci-local.mjs'].every(motor.esProtegida));
  check('3) un archivo corriente NO es un control', ['config/datos.json', 'services/foo.ts', 'README.md', 'docs/x.md'].every((r) => !motor.esProtegida(r)));
  const cat = (r) => motor.categoriasDeRiesgo(r);
  check('4) cobros, seguridad, secretos, esquemas, producción y despliegue son categorías de una persona',
    cat('functions/src/credits/engine.ts').includes('cobros-creditos') && cat('firestore.rules').includes('seguridad-permisos') && cat('firestore.indexes.json').includes('esquemas-y-migraciones')
    && cat('functions/.env.local').includes('secretos-y-credenciales') && cat('ops/produccion.json').includes('reglas-de-produccion') && cat('package.json').includes('despliegue-e-infraestructura')
    && cat('scripts/migrar-media.mjs').includes('datos-de-usuarios') && cat('functions/src/engine/providers/gemini.ts').includes('contratos-externos'));
  check('5) y una ruta corriente no escala', cat('config/datos.json').length === 0 && cat('docs/guia.md').length === 0);
  check('6) normalizarRuta rechaza lo que sale del repositorio o es absoluto', motor.normalizarRuta('../x') === null && motor.normalizarRuta('/etc/x') === null && motor.normalizarRuta('C:/x') === null && motor.normalizarRuta('a/../../b') === null && motor.normalizarRuta('.\\a\\b.json') === 'a/b.json');
  const d = repo({ 'ops/guardian/a.json': '{}', 'functions/test/t.test.mjs': 'x', 'src/otra.ts': 'y' });
  const h1 = motor.huellaDeControles(d);
  fs.writeFileSync(path.join(d, 'src/otra.ts'), 'cambiado');
  check('7) la huella de los controles ignora lo que no es un control…', motor.huellaDeControles(d).huella === h1.huella);
  fs.writeFileSync(path.join(d, 'functions/test/t.test.mjs'), 'cambiado');
  check('8) …y cambia si se toca UNA prueba (o cualquier control)', motor.huellaDeControles(d).huella !== h1.huella, `${h1.archivos} controles`);
}

/* ── B · Los correctores ──────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── B · Los correctores: qué detectan y qué no ──');
{
  const d = repo({
    'config/bom.json': conBom({ a: 1 }),
    'config/limpio.json': JSON.stringify({ a: 1 }),
    'config/bom-y-roto.json': Buffer.concat([BOM, Buffer.from('{ "a": 1, ')]),
    'config/tsconfig.app.json': Buffer.concat([BOM, Buffer.from('{ /* comentario */ "a": 1 }')]),
    'config/coma.json': '{ "a": [1, 2,], "b": "x,}" , }',
    'config/roto.json': '{ "a": ',
  });
  const archivos = motor.archivosSeguidos(d);
  const bom = jsonConBom.detectar({ raiz: d, archivos });
  check('9) json-con-bom detecta SOLO el JSON que con BOM no se lee y sin BOM sí', bom.length === 1 && bom[0].archivos[0] === 'config/bom.json', bom.map((h) => h.clave).join());
  check('10) no es suyo: un JSON ya válido, uno roto por otra cosa, ni el que lleva comentarios (tsconfig)', !bom.some((h) => /limpio|roto|tsconfig/.test(h.archivos[0])));
  const coma = jsonComa.detectar({ raiz: d, archivos });
  check('11) json-coma-final detecta SOLO el que se arregla quitando comas finales (no el roto de otra manera ni el del BOM)', coma.length === 1 && coma[0].archivos[0] === 'config/coma.json' && coma[0].datos.quitadas === 2, coma.map((h) => `${h.clave}:${h.datos.quitadas}`).join());
  const q = quitarComasFinales('{ "a": [1,\n 2,\n], "b": "x,}\\",]" , }');
  check('12) quitarComasFinales respeta lo que hay dentro de una cadena (incluidas las comillas escapadas) y no toca nada más', q.quitadas === 2 && q.texto === '{ "a": [1,\n 2\n], "b": "x,}\\",]"  }' && JSON.parse(q.texto).b === 'x,}",]', JSON.stringify(q.texto));
  check('13) cada corrector declara su prueba de regresión, es de bajo riesgo y determinista',
    CORRECTORES.every((c) => c.riesgo === 'bajo' && c.determinista === true && c.regresion?.suite === NOMBRE_SUITE && c.regresion?.marca === c.id && ['tracked', 'derivado'].includes(c.ambito)));
  /* Sobre este árbol: ningún JSON seguido tiene el fallo (si aparece uno, el Guardian lo dice aquí). */
  const real = motor.archivosSeguidos(RAIZ);
  const hallados = [...jsonConBom.detectar({ raiz: RAIZ, archivos: real }), ...jsonComa.detectar({ raiz: RAIZ, archivos: real })];
  check('14) este repositorio no tiene ningún JSON con BOM ni con coma final que JSON.parse rechace', hallados.length === 0, hallados.map((h) => h.clave).join() || `${real.length} archivos revisados`);
}

/* ── C · El flujo ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── C · El flujo: copia aislada → verificar → aceptar → aplicar ──');
const original = conBom({ nombre: 'weë', n: [1, 2, 3] });
let claveBom = null;
let dirC = null;
{
  const d = repo({ 'config/datos.json': original, 'otro/ajeno.txt': 'no se toca\n' });
  dirC = d;
  const h = hallazgoDe(jsonConBom, d);
  const antes = estado(d);
  const r = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: h, verificar: verde });
  claveBom = r.clave;
  check('15) un fallo detectado, corregido en una copia aislada y verificado queda ACEPTADA con su rama y su commit', r.estado === 'ACEPTADA' && /^guardian\/auto\/[0-9a-f]{8}$/.test(r.rama) && /^[0-9a-f]{40}$/.test(r.commit), `${r.estado} ${r.rama}`);
  check('16) y NO ha tocado el árbol del usuario: el archivo sigue con su BOM y git status es el mismo', fs.readFileSync(path.join(d, 'config/datos.json')).equals(original) && estado(d) === antes);
  check('17) la copia aislada ya no existe (ni su carpeta ni su worktree) pero la rama aceptada se conserva para revisarla', arbolesExtra(d) === 0 && ramas(d).includes(r.rama));
  const reg = motor.leerRegistro(ESTADO(d));
  check('18) el registro cuenta lo que pasó: EN_CURSO y luego ACEPTADA, con causa, archivos, pruebas y que es reversible',
    reg.map((e) => e.estado).join() === 'EN_CURSO,ACEPTADA' && reg[1].causa.includes('BOM') && reg[1].archivos[0] === 'config/datos.json' && reg[1].verificaciones.length >= 5 && reg[1].reversible === true && reg[1].requiereHumano === false);
  check('19) las pruebas del motor corrieron de verdad: alcance, rutas protegidas, controles intactos y las del corrector',
    ['alcance', 'rutas-protegidas', 'controles-intactos', 'corrector:sin-bom', 'corrector:json-valido', 'corrector:solo-el-bom'].every((n) => reg[1].verificaciones.some((v) => v.nombre === n && v.ok)));
  const otra = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: h, verificar: verde });
  check('20) IDEMPOTENTE: el mismo fallo no se vuelve a intentar (YA_INTENTADO), ni crea otra rama ni otra copia', otra.estado === 'YA_INTENTADO' && ramas(d).split('\n').length === 1 && arbolesExtra(d) === 0 && motor.leerRegistro(ESTADO(d)).length === 2);
  const ap = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: h, verificar: verde, aplicar: true });
  const arreglado = fs.readFileSync(path.join(d, 'config/datos.json'));
  check('21) aplicar es una orden aparte: entonces el archivo queda SIN el BOM y con EXACTAMENTE los demás bytes', ap.estado === 'APLICADA' && arreglado.equals(original.subarray(3)) && JSON.parse(arreglado.toString('utf8')).nombre === 'weë');
  check('22) y solo cambió ese archivo', estado(d).trim() === 'M config/datos.json', estado(d).trim());
  check('23) aplicar dos veces no hace nada más (YA_APLICADA)', motor.aplicarAceptada({ raiz: d, estadoDir: ESTADO(d), clave: r.clave }).estado === 'YA_APLICADA');
}

/* ── D · La reversión ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── D · La reversión: solo lo que el Guardian aplicó, y solo si nadie lo tocó ──');
{
  const d = dirC;
  const rv = motor.revertir({ raiz: d, estadoDir: ESTADO(d), clave: claveBom });
  check('24) revertir devuelve el archivo EXACTAMENTE a como estaba (BOM incluido)', rv.estado === 'REVERTIDA' && rv.vueltoAlOriginal === true && fs.readFileSync(path.join(d, 'config/datos.json')).equals(original) && estado(d).trim() === '');
  check('25) revertir otra vez es un «ya revertida», no un segundo cambio', motor.revertir({ raiz: d, estadoDir: ESTADO(d), clave: claveBom }).estado === 'YA_REVERTIDA');
  check('26) tras revertir tampoco se re-intenta solo el mismo fallo (un intento por fallo)', (await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: hallazgoDe(jsonConBom, d), verificar: verde })).estado === 'YA_INTENTADO');
  /* Si alguien tocó el archivo DESPUÉS de la corrección, revertir no pisa su trabajo. */
  const e = repo({ 'config/datos.json': original });
  const he = hallazgoDe(jsonConBom, e);
  const re = await motor.corregir({ raiz: e, estadoDir: ESTADO(e), corrector: jsonConBom, hallazgo: he, verificar: verde, aplicar: true });
  fs.writeFileSync(path.join(e, 'config/datos.json'), '{"nuevo":"trabajo ajeno"}');
  const rr = motor.revertir({ raiz: e, estadoDir: ESTADO(e), clave: re.clave });
  check('27) si el archivo cambió DESPUÉS, revertir se niega y no toca nada (no pisa trabajo ajeno)', rr.estado === 'MODIFICADO_DESPUES' && fs.readFileSync(path.join(e, 'config/datos.json'), 'utf8') === '{"nuevo":"trabajo ajeno"}');
  check('28) revertir una clave que el Guardian nunca aplicó no hace nada', motor.revertir({ raiz: e, estadoDir: ESTADO(e), clave: 'inventada' }).estado === 'NO_HAY_APLICADA');
  /* Aplicar sobre un archivo que cambió desde que el Guardian lo vio: conflicto, sin tocar. */
  const f = repo({ 'config/datos.json': original });
  const hf = hallazgoDe(jsonConBom, f);
  const rf = await motor.corregir({ raiz: f, estadoDir: ESTADO(f), corrector: jsonConBom, hallazgo: hf, verificar: verde });
  const trabajo = Buffer.concat([BOM, Buffer.from('{"otro":1}')]);
  fs.writeFileSync(path.join(f, 'config/datos.json'), trabajo);
  const cf = motor.aplicarAceptada({ raiz: f, estadoDir: ESTADO(f), clave: rf.clave });
  check('29) aplicar sobre un archivo que cambió desde que el Guardian lo vio es un CONFLICTO y no toca nada', cf.estado === 'CONFLICTO' && fs.readFileSync(path.join(f, 'config/datos.json')).equals(trabajo));
}

/* ── E · Los cerrojos en acción ───────────────────────────────────────────────────────────────────────────── */
console.log('\n── E · Los cerrojos en acción ──');
{
  /* RECHAZADA por una verificación en rojo: se borra lo que creó el Guardian, el árbol queda igual, y no se reintenta. */
  const d = repo({ 'config/datos.json': original });
  const h = hallazgoDe(jsonConBom, d);
  const antes = estado(d);
  const r = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: h, verificar: roja });
  check('30) si una verificación falla la corrección se RECHAZA y se REVIERTE lo que creó el Guardian: ni rama, ni copia, ni parche', r.estado === 'RECHAZADA' && ramas(d) === '' && arbolesExtra(d) === 0 && !fs.existsSync(path.join(ESTADO(d), 'parches')));
  check('31) el árbol del usuario queda idéntico, y el registro dice qué falló y que necesita a una persona', estado(d) === antes && fs.readFileSync(path.join(d, 'config/datos.json')).equals(original) && motor.leerRegistro(ESTADO(d)).at(-1).requiereHumano === true && /verificacion-de-prueba/.test(r.motivo));
  check('32) y no se reintenta: un intento por fallo (aunque la verificación se arregle después)', (await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: h, verificar: verde })).estado === 'YA_INTENTADO');

  /* Un corrector que se sale de lo declarado, toca un control o borra una prueba: rechazado por los TRES cerrojos del motor. */
  const malo = (dentro) => ({ ...jsonConBom, id: 'json-con-bom', corregir: (a) => { jsonConBom.corregir(a); dentro(a.dir); } });
  const casos = [
    ['toca un archivo que no declaró', (dir) => fs.writeFileSync(path.join(dir, 'README.md'), 'colado\n'), ['alcance']],
    ['edita un control (la CI)', (dir) => fs.writeFileSync(path.join(dir, '.github/workflows/ci.yml'), 'name: CI\n# debilitada\n'), ['alcance', 'rutas-protegidas', 'controles-intactos']],
    ['borra la prueba de regresión', (dir) => fs.rmSync(path.join(dir, `functions/test/${NOMBRE_SUITE}.test.mjs`)), ['alcance', 'rutas-protegidas', 'controles-intactos']],
    ['añade un archivo nuevo', (dir) => fs.writeFileSync(path.join(dir, 'nuevo.txt'), 'x'), ['alcance']],
  ];
  for (const [i, [nombre, accion, esperadas]] of casos.entries()) {
    const e = repo({ 'config/datos.json': original });
    const antesE = estado(e);
    const re = await motor.corregir({ raiz: e, estadoDir: ESTADO(e), corrector: malo(accion), hallazgo: hallazgoDe(jsonConBom, e), verificar: verde });
    const v = motor.leerRegistro(ESTADO(e)).at(-1).verificaciones || [];
    const rojas = v.filter((x) => !x.ok).map((x) => x.nombre);
    check(`33.${i + 1}) un corrector que ${nombre} se RECHAZA (${esperadas.join(', ')}) y no deja nada: el árbol sigue idéntico`,
      re.estado === 'RECHAZADA' && esperadas.every((n) => rojas.includes(n)) && estado(e) === antesE && ramas(e) === '' && arbolesExtra(e) === 0 && fs.existsSync(path.join(e, `functions/test/${NOMBRE_SUITE}.test.mjs`)), rojas.join());
  }

  /* Un hallazgo que declara tocar un control: BLOQUEADA sin crear nada. */
  const p = repo({ 'ops/guardian/huellas.json': conBom({ suites: {} }) });
  const hp = { corrector: 'json-con-bom', clave: 'x', archivos: ['ops/guardian/huellas.json'], causa: 'BOM', datos: {} };
  const rp = await motor.corregir({ raiz: p, estadoDir: ESTADO(p), corrector: jsonConBom, hallazgo: hp, verificar: verde });
  check('34) un hallazgo sobre un control (aquí, la huella de los invariantes) es BLOQUEADA y no se crea nada: ni rama ni copia', rp.estado === 'BLOQUEADA' && ramas(p) === '' && arbolesExtra(p) === 0 && !fs.existsSync(path.join(ESTADO(p), 'parches')));
  const t = repo({ 'functions/test/otra.json': conBom({ a: 1 }) });
  const rt = await motor.corregir({ raiz: t, estadoDir: ESTADO(t), corrector: jsonConBom, hallazgo: { clave: 'x', archivos: ['functions/test/otra.json'], causa: 'BOM', datos: {} }, verificar: verde });
  check('35) y nada de functions/test/** se corrige solo: las pruebas no las edita el Guardian', rt.estado === 'BLOQUEADA' && ramas(t) === '');
  /* Categorías de una persona: REQUIERE_HUMANO sin tocar. */
  for (const [rel, cat] of [['firestore.indexes.json', 'esquemas-y-migraciones'], ['functions/src/credits/tabla.json', 'cobros-creditos'], ['ops/produccion.json', 'reglas-de-produccion'], ['package.json', 'despliegue-e-infraestructura']]) {
    const x = repo({ [rel]: conBom({ a: 1 }) });
    const rx = await motor.corregir({ raiz: x, estadoDir: ESTADO(x), corrector: jsonConBom, hallazgo: hallazgoDe(jsonConBom, x), verificar: verde });
    check(`36) ${rel} es de una persona (${cat}): REQUIERE_HUMANO, sin rama, sin copia y el archivo intacto`,
      rx.estado === 'REQUIERE_HUMANO' && rx.categorias.includes(cat) && ramas(x) === '' && arbolesExtra(x) === 0 && fs.readFileSync(path.join(x, rel)).equals(conBom({ a: 1 })));
  }
  /* Sin prueba de regresión permanente no se corrige. */
  const s = repo({ 'config/datos.json': original }, { conRegresion: false });
  const rs = await motor.corregir({ raiz: s, estadoDir: ESTADO(s), corrector: jsonConBom, hallazgo: hallazgoDe(jsonConBom, s), verificar: verde });
  check('37) sin la prueba de regresión PERMANENTE (suite, marca y cadena de npm test) el Guardian no corrige: BLOQUEADA', rs.estado === 'BLOQUEADA' && /regresión/.test(rs.motivo) && ramas(s) === '');
  const noDet = { ...jsonConBom, determinista: false };
  check('38) un corrector no determinista o de riesgo distinto de «bajo» se queda en REQUIERE_HUMANO', (await motor.corregir({ raiz: repo({ 'config/datos.json': original }), estadoDir: ESTADO(repo()), corrector: noDet, hallazgo: { clave: 'k', archivos: ['config/datos.json'], causa: 'x', datos: {} }, verificar: verde })).estado === 'REQUIERE_HUMANO');
  /* Sin bucles. */
  const a = repo({ 'config/datos.json': original });
  const ra = await motor.corregir({ raiz: a, estadoDir: ESTADO(a), corrector: jsonConBom, hallazgo: hallazgoDe(jsonConBom, a), verificar: verde, entorno: { [motor.MARCA_ANIDADA]: '1' } });
  check('39) una ejecución anidada (la autocorrección llamándose a sí misma) se rechaza', ra.estado === 'ERROR' && /anidada/.test(ra.motivo) && ramas(a) === '');
  const muchos = repo(Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`config/d${i}.json`, conBom({ i })])));
  const rc = await motor.ciclo({ raiz: muchos, estadoDir: ESTADO(muchos), verificar: verde, correctores: [jsonConBom] });
  check('40) un ciclo corrige como máximo MAX_POR_EJECUCION fallos y dice cuántos quedan sin tratar', rc.resultados.length === motor.MAX_POR_EJECUCION && rc.omitidos === 8 - motor.MAX_POR_EJECUCION && rc.resultados.every((x) => x.estado === 'ACEPTADA'));
  const rc2 = await motor.ciclo({ raiz: muchos, estadoDir: ESTADO(muchos), verificar: verde, correctores: [jsonConBom] });
  check('41) y el ciclo siguiente salta lo ya intentado y avanza con el resto (sin bucle y sin que los primeros ocupen el cupo para siempre)', rc2.yaIntentados === motor.MAX_POR_EJECUCION && rc2.resultados.length === 8 - motor.MAX_POR_EJECUCION && rc2.resultados.every((x) => x.estado === 'ACEPTADA') && rc2.omitidos === 0);
  /* Un intento que murió a medias se limpia, y uno que sigue vivo no se pisa. */
  const m = repo({ 'config/datos.json': original });
  const hm = hallazgoDe(jsonConBom, m);
  const claveM = motor.claveDe(jsonConBom, { ...hm, archivos: ['config/datos.json'] }, { 'config/datos.json': sha256(path.join(m, 'config/datos.json')) });
  sh(m, ['branch', `guardian/auto/${claveM.slice(0, 8)}`]);
  motor.anotar(ESTADO(m), { clave: claveM, corrector: 'json-con-bom', estado: 'EN_CURSO', rama: `guardian/auto/${claveM.slice(0, 8)}`, directorio: path.join(os.tmpdir(), 'guardian-inexistente'), pid: 2147483646 });
  const rm = await motor.corregir({ raiz: m, estadoDir: ESTADO(m), corrector: jsonConBom, hallazgo: hm, verificar: verde });
  check('42) un intento que murió a medias (su proceso ya no existe) se LIMPIA —solo lo que él creó— y queda INTERRUMPIDA, sin reintentarse solo', rm.estado === 'YA_INTENTADO' && rm.previo === 'INTERRUMPIDA' && ramas(m) === '');
  const m2 = repo({ 'config/datos.json': original });
  const hm2 = hallazgoDe(jsonConBom, m2);
  const claveM2 = motor.claveDe(jsonConBom, { ...hm2, archivos: ['config/datos.json'] }, { 'config/datos.json': sha256(path.join(m2, 'config/datos.json')) });
  motor.anotar(ESTADO(m2), { clave: claveM2, corrector: 'json-con-bom', estado: 'EN_CURSO', rama: 'guardian/auto/ajena', directorio: 'x', pid: process.ppid });
  const rm2 = await motor.corregir({ raiz: m2, estadoDir: ESTADO(m2), corrector: jsonConBom, hallazgo: hm2, verificar: verde });
  check('43) y un intento cuyo proceso sigue vivo NO se pisa (OCUPADA)', rm2.estado === 'OCUPADA');
  /* Un registro ilegible detiene todo. */
  const z = repo({ 'config/datos.json': original });
  fs.mkdirSync(ESTADO(z), { recursive: true });
  fs.writeFileSync(path.join(ESTADO(z), 'registro.jsonl'), '{no es json\n');
  let lanza = false;
  try { await motor.corregir({ raiz: z, estadoDir: ESTADO(z), corrector: jsonConBom, hallazgo: hallazgoDe(jsonConBom, z), verificar: verde }); } catch (e) { lanza = /registro corrupto/.test(e.message); }
  check('44) con el registro corrupto no se corrige nada (falla cerrado, no «empieza de cero»)', lanza && ramas(z) === '');
}

/* ── F · Regresión permanente de los fallos reales ────────────────────────────────────────────────────────── */
console.log('\n── F · Regresión permanente: json-con-bom · json-coma-final · lib-desfasado ──');
{
  /* json-con-bom: el fallo real. PowerShell 5.1 (`Out-File`/`Set-Content -Encoding UTF8`) escribe BOM, y un `JSON.parse` directo de ese
     archivo revienta con «Unexpected token». Esto lo reproduce y fija que el Guardian lo arregla sin cambiar un byte más. */
  const crudo = conBom({ a: 1 }).toString('utf8');
  let revienta = false;
  try { JSON.parse(crudo); } catch { revienta = true; }
  check('45) json-con-bom: el fallo es real —JSON.parse rechaza un JSON con BOM que sin él es válido—', revienta && JSON.parse(crudo.slice(1)).a === 1);
  const d = repo({ 'config/powershell.json': conBom({ a: 1 }) });
  const r = await motor.corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: hallazgoDe(jsonConBom, d), verificar: verde, aplicar: true });
  check('46) json-con-bom: tras la corrección JSON.parse lo lee y el contenido es el mismo', r.estado === 'APLICADA' && JSON.parse(fs.readFileSync(path.join(d, 'config/powershell.json'), 'utf8')).a === 1);
  const c = repo({ 'config/coma.json': '{\n  "a": 1,\n  "b": [1, 2,],\n}\n' });
  const rc = await motor.corregir({ raiz: c, estadoDir: ESTADO(c), corrector: jsonComa, hallazgo: hallazgoDe(jsonComa, c), verificar: verde, aplicar: true });
  check('47) json-coma-final: una coma final rompe JSON.parse; el Guardian quita SOLO las comas y nada más', rc.estado === 'APLICADA' && fs.readFileSync(path.join(c, 'config/coma.json'), 'utf8') === '{\n  "a": 1,\n  "b": [1, 2]\n}\n');
  /* lib-desfasado, con el estado y el compilador simulados (la regresión real vive en _cadena.mjs, que lo detecta y manda recompilar). */
  const l = repo();
  let compilado = false;
  const libStub = () => (compilado ? { fuentes: 3, faltan: [], viejos: [], huerfanos: [] } : { fuentes: 3, faltan: ['a.js'], viejos: ['b.js'], huerfanos: ['viejo.js'] });
  fs.mkdirSync(path.join(l, 'functions/lib'), { recursive: true });
  fs.writeFileSync(path.join(l, 'functions/lib/viejo.js'), '// huérfano');
  fs.writeFileSync(path.join(l, 'functions/lib/intocable.js'), '// no era huérfano');
  const llamadas = [];
  const rl = await motor.corregir({ raiz: l, estadoDir: ESTADO(l), corrector: libCorrector, hallazgo: libCorrector.detectar({ raiz: l, archivos: [], libDesfasadoDe: libStub })[0], libDesfasadoDe: libStub, ejecutar: async (x) => { llamadas.push(x.orden); compilado = true; } });
  check('48) lib-desfasado: borra SOLO el huérfano que la comprobación nombró (dentro de functions/lib), recompila una vez y comprueba que ya está al día',
    rl.estado === 'APLICADA' && llamadas.join() === 'build' && !fs.existsSync(path.join(l, 'functions/lib/viejo.js')) && fs.existsSync(path.join(l, 'functions/lib/intocable.js')));
  check('49) y dice que NO es reversible (artefacto derivado y regenerable) sin fingir lo contrario', motor.leerRegistro(ESTADO(l)).at(-1).reversible === false && /derivado/.test(motor.leerRegistro(ESTADO(l)).at(-1).motivoDeIrreversible));
  compilado = false;
  const rl2 = await motor.corregir({ raiz: l, estadoDir: ESTADO(l), corrector: libCorrector, hallazgo: libCorrector.detectar({ raiz: l, archivos: [], libDesfasadoDe: libStub })[0], libDesfasadoDe: libStub, ejecutar: async () => { throw new Error('no debe volver a compilar'); } });
  check('50) un intento por fallo también en lo derivado: el mismo estado no se vuelve a compilar solo', rl2.estado === 'YA_INTENTADO');
  /* Y el detector real de _cadena.mjs sigue diciendo lo mismo que usa el corrector. */
  const sinLib = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-lib-'));
  limpiezas.push(sinLib);
  fs.mkdirSync(path.join(sinLib, 'src'), { recursive: true });
  fs.writeFileSync(path.join(sinLib, 'src/a.ts'), 'export const a = 1;');
  const desf = libDesfasado(sinLib);
  check('51) lib-desfasado: el detector real (_cadena.mjs → libDesfasado) ve «sin compilar» y el corrector lo recoge como hallazgo', desf.faltan.length === 1
    && libCorrector.detectar({ raiz: path.join(sinLib, '..', 'x'), archivos: [], libDesfasadoDe: () => desf }).length === 1);
}

/* ── G · Lo que el motor no hace ──────────────────────────────────────────────────────────────────────────── */
console.log('\n── G · El motor no hace push, red, reset, revert ni despliegue ──');
{
  const fuente = ['ops/guardian/autocorreccion.mjs', 'ops/guardian/correctores.mjs'].map((r) => fs.readFileSync(path.join(RAIZ, r), 'utf8')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('52) ni push, ni fetch, ni merge, ni rebase, ni cherry-pick, ni reset, ni revert, ni checkout, ni stash, ni clean', !/'(push|fetch|pull|merge|rebase|cherry-pick|reset|revert|checkout|stash|clean|remote)'/.test(fuente));
  check('53) ni red (http, fetch, XMLHttpRequest), ni despliegue (firebase deploy, vercel, gcloud), ni gh', !/\bhttps?:\/\/|fetch\(|XMLHttpRequest|firebase deploy|gcloud|vercel|'gh'/.test(fuente));
  check('54) ni lee ni nombra secretos (.env, credenciales) más que para ESCALARLOS', !/readFileSync\([^)]*\.env/.test(fuente));
  check('55) la única forma de deshacer es `git apply -R` del parche del propio Guardian (nunca un revert global)', /'apply', '-R'/.test(fuente) && (fuente.match(/'-R'/g) || []).length === 3);
}

/* ── H · Sabotajes ────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── H · Sabotajes: quitar un cerrojo del motor hace fallar la prueba que lo vigila ──');
{
  const textoMotor = fs.readFileSync(path.join(RAIZ, 'ops/guardian/autocorreccion.mjs'), 'utf8');
  const mutar = (cambios) => cambios.reduce((t, [a, b]) => { if (!t.includes(a)) throw new Error(`el sabotaje no encuentra: ${a.slice(0, 60)}`); return t.replace(a, b); }, textoMotor);
  const cargarMutante = async (nombre, texto) => {
    const archivo = path.join(RAIZ, `ops/guardian/_sabotaje-${nombre}-${process.pid}.mjs`);
    fs.writeFileSync(archivo, texto);
    try { return await import(`${pathToFileURL(archivo).href}?${Date.now()}`); } finally { fs.rmSync(archivo, { force: true }); }
  };
  const MUTANTES = {
    'sin-bloqueo-de-controles': [['  if (propias.length) {', '  if (false) {']],
    'sin-escalada-a-personas': [['  if (categorias.length) {', '  if (false) {']],
    'sin-regresion-permanente': [['  if (!reg.ok) {', '  if (false) {']],
    'sin-un-intento-por-fallo': [['  if (previo && intentos >= MAX_INTENTOS_POR_FALLO) {', '  if (false) {']],
    'revertir-sin-comprobar': [['  if (cambiados.length) return respuesta(\'MODIFICADO_DESPUES\'', '  if (false) return respuesta(\'MODIFICADO_DESPUES\'']],
    'sin-huella-de-controles': [['ok: despues.huella === controlesAntes.huella', 'ok: true']],
    'sin-alcance': [['ok: cambiados.length > 0 && soloModificados && dentro', 'ok: true'], ['ok: cambiados.every((c) => !esProtegida(c.ruta))', 'ok: true']],
  };
  const muta = {};
  for (const [n, c] of Object.entries(MUTANTES)) muta[n] = await cargarMutante(n, mutar(c));
  const dm = (extra = {}) => repo({ 'config/datos.json': original, ...extra });
  {
    const p = repo({ 'ops/guardian/huellas.json': conBom({ suites: {} }) });
    const r = await muta['sin-bloqueo-de-controles'].corregir({ raiz: p, estadoDir: ESTADO(p), corrector: jsonConBom, hallazgo: { clave: 'x', archivos: ['ops/guardian/huellas.json'], causa: 'BOM', datos: { sinBom: '' } }, verificar: verde });
    check('56) SABOTAJE sin bloqueo de controles: el test 34 lo detecta (ya no sale BLOQUEADA)', r.estado !== 'BLOQUEADA');
  }
  {
    const x = repo({ 'firestore.indexes.json': conBom({ a: 1 }) });
    const r = await muta['sin-escalada-a-personas'].corregir({ raiz: x, estadoDir: ESTADO(x), corrector: jsonConBom, hallazgo: hallazgoDe(jsonConBom, x), verificar: verde });
    check('57) SABOTAJE sin escalada a personas: el test 36 lo detecta (ya no sale REQUIERE_HUMANO)', r.estado !== 'REQUIERE_HUMANO');
  }
  {
    const s = repo({ 'config/datos.json': original }, { conRegresion: false });
    const r = await muta['sin-regresion-permanente'].corregir({ raiz: s, estadoDir: ESTADO(s), corrector: jsonConBom, hallazgo: hallazgoDe(jsonConBom, s), verificar: verde });
    check('58) SABOTAJE sin exigir la prueba de regresión: el test 37 lo detecta (corrige sin ella)', r.estado !== 'BLOQUEADA');
  }
  {
    const d = dm();
    const h = hallazgoDe(jsonConBom, d);
    await muta['sin-un-intento-por-fallo'].corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: h, verificar: roja });
    const r = await muta['sin-un-intento-por-fallo'].corregir({ raiz: d, estadoDir: ESTADO(d), corrector: jsonConBom, hallazgo: h, verificar: roja });
    check('59) SABOTAJE sin un intento por fallo: el test 32 lo detecta (reintenta el mismo fallo)', r.estado !== 'YA_INTENTADO');
  }
  {
    const e = dm();
    const he = hallazgoDe(jsonConBom, e);
    const re = await motor.corregir({ raiz: e, estadoDir: ESTADO(e), corrector: jsonConBom, hallazgo: he, verificar: verde, aplicar: true });
    fs.writeFileSync(path.join(e, 'config/datos.json'), '{"nuevo":"trabajo ajeno"}');
    let r;
    try { r = muta['revertir-sin-comprobar'].revertir({ raiz: e, estadoDir: ESTADO(e), clave: re.clave }); } catch (x) { r = { estado: 'LANZA' }; }
    check('60) SABOTAJE revertir sin comprobar: el test 27 lo detecta (ya no se niega a pisar trabajo ajeno)', r.estado !== 'MODIFICADO_DESPUES');
  }
  {
    const e = dm();
    const malo = { ...jsonConBom, corregir: (a) => { jsonConBom.corregir(a); fs.writeFileSync(path.join(a.dir, '.github/workflows/ci.yml'), 'name: CI\n# debilitada\n'); } };
    const r = await muta['sin-huella-de-controles'].corregir({ raiz: e, estadoDir: ESTADO(e), corrector: malo, hallazgo: hallazgoDe(jsonConBom, e), verificar: verde });
    const v = motor.leerRegistro(ESTADO(e)).at(-1).verificaciones || [];
    check('61) SABOTAJE sin huella de controles: el test 33.2 lo detecta (controles-intactos ya no sale en rojo)', !v.some((x) => x.nombre === 'controles-intactos' && !x.ok) && r.estado !== undefined);
  }
  {
    const e = dm();
    const malo = { ...jsonConBom, corregir: (a) => { jsonConBom.corregir(a); fs.rmSync(path.join(a.dir, `functions/test/${NOMBRE_SUITE}.test.mjs`)); } };
    const r = await muta['sin-alcance'].corregir({ raiz: e, estadoDir: ESTADO(e), corrector: malo, hallazgo: hallazgoDe(jsonConBom, e), verificar: verde });
    const v = motor.leerRegistro(ESTADO(e)).at(-1).verificaciones || [];
    check('62) SABOTAJE sin alcance ni rutas protegidas: el test 33.3 lo detecta (borrar una prueba ya no deja ni alcance ni rutas-protegidas en rojo)', !v.some((x) => ['alcance', 'rutas-protegidas'].includes(x.nombre) && !x.ok) && r.estado !== undefined);
  }
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);

