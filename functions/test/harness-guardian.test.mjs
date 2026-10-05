/*
 * EL BUILD GUARDIAN DEL WEË HARNESS (F5) — `ops/harness/guardian.mjs`.
 *
 * Sin red y sin Claude Code. Se prueba que el guardián COORDINA lo que ya existe y nunca inventa: los CRITICAL del
 * motor de Credits salen de sus fuentes de siempre (zonas rojas, settings.json y la guardia, produccion.json y
 * permitido.mjs, las cercas de las suites), lo IMPORTANT y lo CONTEXT del mapa de fronteras, las decisiones, los
 * paquetes del selector y F3; que un cambio de documentación no da ningún CRITICAL, que una ruta desconocida no da
 * nada, que cada hallazgo lleva una fuente que se puede comprobar, sin duplicados y con tope; y, sobre repositorios
 * git temporales, que el modo `cambio` dice lo que dicen frontera.mjs, la puerta G3, permitido.mjs y los registros
 * de puertas. Informa y no bloquea: sale 0 con CRITICAL y 2 solo si la entrada no vale.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const importar = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const g = await importar('ops/harness/guardian.mjs');
const ext = await importar('ops/harness/extensiones.mjs');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const de = (inf, id) => (inf && inf.hallazgos.find((x) => x.id === id)) || null;
const ids = (inf, nivel) => inf.hallazgos.filter((x) => !nivel || x.nivel === nivel).map((x) => x.id);
const MOTOR = 'functions/src/credits/creditEngine.ts';

/* ── A. «antes», sobre el repositorio de verdad ──────────────────────────── */
const motor = g.antes({ raiz: RAIZ, archivos: [MOTOR] });
const roja = de(motor, 'zona-roja:functions/src/credits/**');
check('1) el motor de Credits es CRITICAL por zona roja: el glob de ZONAS_ROJAS, con su línea en reglas.mjs',
  roja?.nivel === 'CRITICAL' && roja.rutas.join() === MOTOR
  && roja.fuentes.some((f) => f.archivo === 'ops/revision/reglas.mjs' && /^ZONAS_ROJAS\[\d+\]$/.test(f.ref) && f.linea > 0), JSON.stringify(roja));
const protegida = de(motor, 'ruta-protegida:ask');
check('2) …y ruta protegida: lo dicen settings.json (permissions.ask, el Edit del motor) y la guardia de siempre (analizarTexto)',
  protegida?.nivel === 'CRITICAL'
  && protegida.fuentes.some((f) => f.archivo === '.claude/settings.json' && f.valor === 'Edit(/functions/src/credits/creditEngine.ts)')
  && protegida.fuentes.some((f) => f.archivo === '.claude/hooks/guardia.mjs' && /^ask: /.test(f.valor)), JSON.stringify(protegida?.fuentes));
const vivo = de(motor, 'produccion:codigo-vivo');
const enMapa = JSON.parse(leer('ops/produccion.json')).funciones.find((f) => f.funcion === 'spendCredits');
const spend = vivo?.datos.funciones.find((f) => f.funcion === 'spendCredits');
check('3) código vivo en producción: spendCredits (y las demás que lo cargan) con su commit, su tag y su grupo; fuentes: la regla de produccion.json, el camino gobernado y permitido.mjs',
  vivo?.nivel === 'CRITICAL' && spend && spend.commit === enMapa.commit && spend.tag === enMapa.tag && spend.grupo === 'g0-seguridad'
  && vivo.fuentes.some((f) => f.archivo === 'ops/produccion.json' && f.json === 'regla')
  && vivo.fuentes.some((f) => f.archivo === 'docs/HARNESS.md' && /único camino a producción/.test(f.cita || ''))
  && vivo.fuentes.some((f) => f.archivo === 'ops/permitido.mjs' && f.ref === 'decidir'), JSON.stringify(vivo?.fuentes));
const cerca = de(motor, 'cercas');
check('4) cercas de cierre: las suites que fijan functions/src/credits por nombre y tamaño contra 8e91daa, con su línea',
  cerca?.nivel === 'CRITICAL' && ['f1d-generacion', 'puente-pre-f1d', 'video-asincrono'].every((s) => cerca.fuentes.some((f) => f.archivo === `functions/test/${s}.test.mjs`
    && f.linea > 0 && /^git diff --numstat 8e91daa -- functions\/src\/credits /.test(f.valor))), JSON.stringify(cerca?.fuentes));
const frontera = de(motor, 'frontera:Financial Core / Credit Engine');
check('5) IMPORTANT: la zona «dinero» con sus documentos, la frontera del mapa con sus suites (todas existen) y la decisión DD-17',
  de(motor, 'zona:dinero')?.nivel === 'IMPORTANT' && de(motor, 'zona:dinero').datos.documentos.some((d) => d.ruta === 'docs/CREDITS.md' && d.existe)
  && frontera?.nivel === 'IMPORTANT' && frontera.datos.suites.includes('functions/test/credits.test.mjs')
  && frontera.datos.suites.every((s) => fs.existsSync(path.join(RAIZ, s))) && de(motor, 'decision:DD-17')?.nivel === 'IMPORTANT', ids(motor, 'IMPORTANT').join(', '));
check('6) CONTEXT: los importadores directos (selector.mjs) y los documentos de siempre (paquetes.json)',
  de(motor, 'importadores')?.datos.importadores.some((i) => i.ruta === 'functions/src/credits/index.ts') && de(motor, 'siempre')?.nivel === 'CONTEXT');

const docs = g.antes({ raiz: RAIZ, archivos: ['docs/HARNESS.md', 'docs/CREDITS.md'] });
check('7) un cambio solo de documentación no da ningún CRITICAL (no se bloquea lo legítimo)', ids(docs, 'CRITICAL').length === 0, ids(docs).join(', '));
const nada = g.antes({ raiz: RAIZ, archivos: ['zz-no-existe/nada.txt'] });
check('8) una ruta que no conoce nadie no produce nada inventado: ningún hallazgo, solo un aviso',
  nada.hallazgos.length === 0 && nada.omitidos.length === 0 && nada.avisos.some((a) => /ni git ni el disco/.test(a)), JSON.stringify(nada.hallazgos));

/* Cada fuente se comprueba contra el repositorio: la línea contiene su cita, la ruta JSON da su valor, la referencia está en el archivo. */
const enJson = (obj, ruta) => ruta.split('.').reduce((o, parte) => {
  const m = parte.match(/^([^[\]]+)((?:\[\d+\])*)$/);
  if (!m || o === undefined || o === null) return undefined;
  let v = o[m[1]];
  for (const i of [...m[2].matchAll(/\[(\d+)\]/g)].map((x) => Number(x[1]))) v = v === undefined || v === null ? undefined : v[i];
  return v;
}, obj);
const fuenteMala = (f) => {
  const abs = path.join(RAIZ, f.archivo || '');
  if (!f.archivo || !fs.existsSync(abs)) return `no existe ${f.archivo}`;
  if (!(f.linea || f.json || f.ref || f.regla)) return `${f.archivo} sin línea, ruta JSON, referencia ni regla`;
  const texto = fs.readFileSync(abs, 'utf8');
  if (f.linea && f.cita && !(texto.split(/\r?\n/)[f.linea - 1] || '').includes(f.cita)) return `${f.archivo}:${f.linea} no contiene «${f.cita}»`;
  if (f.linea && f.linea > texto.split(/\r?\n/).length) return `${f.archivo}:${f.linea} fuera del archivo`;
  if (f.json) {
    const v = enJson(JSON.parse(texto), f.json);
    if (v === undefined) return `${f.archivo} → ${f.json} no existe`;
    if (f.valor !== undefined && typeof v !== 'object' && v !== f.valor) return `${f.archivo} → ${f.json} vale ${JSON.stringify(v)}, no ${JSON.stringify(f.valor)}`;
  }
  if (f.ref && !f.json && !texto.includes(f.ref.replace(/\[\d+\]$/, ''))) return `${f.archivo} no contiene ${f.ref}`;
  if (f.regla && !texto.includes(`id: '${f.regla}'`)) return `${f.archivo} no define la regla ${f.regla}`;
  return null;
};
const cuatro = ['firestore.rules', '.claude/settings.json', 'public/landing.html', 'docs/HARNESS.md'];
const todas = g.antes({ raiz: RAIZ, archivos: cuatro });
const suite = g.antes({ raiz: RAIZ, archivos: ['functions/test/puente-pre-f1d.test.mjs'] });
const creador = g.antes({ raiz: RAIZ, archivos: ['functions/src/creator/index.ts'] });
const informes = [motor, docs, todas, suite, creador];
const sinFuente = informes.flatMap((r) => r.hallazgos.filter((x) => !x.fuentes.length).map((x) => x.id));
const malas = informes.flatMap((r) => r.hallazgos.flatMap((x) => x.fuentes.map(fuenteMala).filter(Boolean).map((m) => `${x.id}: ${m}`)));
/* La cerca de creatorRun no tiene etiqueta «XX)»: su referencia es el texto de su check, y también tiene que estar escrito así en la suite. */
const etiquetaLarga = (de(creador, 'cercas')?.fuentes || []).some((f) => f.ref && f.ref.length > 12 && !f.ref.startsWith('const '));
check('9) cada hallazgo tiene fuente, y cada fuente se comprueba: la línea contiene su cita, la ruta JSON da su valor, la referencia y la regla existen',
  sinFuente.length === 0 && malas.length === 0 && etiquetaLarga && informes.reduce((n, r) => n + r.hallazgos.length, 0) > 20, [...sinFuente, ...malas].slice(0, 6).join(' | '));

const repetidas = g.antes({ raiz: RAIZ, archivos: ['public/landing.html', './public/landing.html', 'public\\landing.html', 'public/privacy-policy.html'] });
check('10) sin duplicados: la misma ruta escrita de tres formas entra una vez, y dos archivos de la misma zona roja dan UN hallazgo con las dos rutas',
  repetidas.entrada.archivos.join() === 'public/landing.html,public/privacy-policy.html' && ids(repetidas).filter((i) => i.startsWith('zona-roja:')).length === 1
  && de(repetidas, 'zona-roja:public/**')?.rutas.length === 2 && new Set(ids(repetidas)).size === ids(repetidas).length, ids(repetidas).join(', '));
const tope = { CRITICAL: 2, IMPORTANT: 1, CONTEXT: 1 };
const conTope = g.antes({ raiz: RAIZ, archivos: cuatro, max: tope });
check('11) tope por nivel: nunca más de N por nivel, el resumen sigue contando todos y lo que no cabe se LISTA en omitidos (nada se calla)',
  g.NIVELES.every((n) => conTope.hallazgos.filter((x) => x.nivel === n).length <= tope[n]) && JSON.stringify(conTope.resumen) === JSON.stringify(todas.resumen)
  && conTope.omitidos.length > 0 && conTope.hallazgos.length + conTope.omitidos.length === todas.hallazgos.length + todas.omitidos.length
  && conTope.omitidos.every((o) => todas.hallazgos.some((x) => x.id === o.id)) && conTope.hallazgos[0].tipo === 'ruta-protegida', JSON.stringify(conTope.resumen));

const ctx = g.crearContexto({ raiz: RAIZ });
const token = (t) => { const x = g.resolverToken(t, ctx); return x ? `${x.tipo}:${x.patron}` : null; };
const indiceApp = g.antes({ raiz: RAIZ, archivos: ['index.ts'] });
const imagenes = g.antes({ raiz: RAIZ, archivos: ['assets/images/hero'] });
check('12) no atribuye de más: lo ambiguo (index.ts, public/), lo demasiado amplio (functions/src) y un nombre suelto que es carpeta (`assets`, una colección) no se atribuyen; `engine/router.ts` sí, al servidor',
  token('engine/router.ts') === 'archivo:functions/src/engine/router.ts' && token('i18n/') === 'carpeta:i18n/'
  && [token('index.ts'), token('public/'), token('functions/src'), token('functions/'), token('assets'), token('creatorJobs')].every((x) => x === null)
  && !de(indiceApp, 'decision:DD-03') && !ids(indiceApp).some((i) => i.startsWith('produccion')) && !ids(imagenes).some((i) => i.startsWith('frontera:')),
  `${ids(indiceApp).join(', ')} | ${ids(imagenes).join(', ')}`);
check('13) tocar una cerca es re-anclarla: la suite que fija por nombre y tamaño sale CRITICAL, y el mapa dice qué frontera vigila',
  de(suite, 'cerca-propia:functions/test/puente-pre-f1d.test.mjs')?.nivel === 'CRITICAL' && de(suite, 'frontera:Content Core / Asset')?.nivel === 'IMPORTANT', ids(suite).join(', '));
const otraVez = g.antes({ raiz: RAIZ, archivos: cuatro });
check('14) JSON canónico: la misma entrada da el mismo JSON (sin hora de reloj) y el texto sale del JSON releído',
  g.aJSON(todas) === g.aJSON(otraVez) && g.aTexto(JSON.parse(g.aJSON(motor))) === g.aTexto(motor) && motor.contrato === 'wee-guardian@1'
  && !/"generado"|\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(g.aJSON(motor)) && /^Build Guardian de Weë · antes de tocar 1 archivo: \d+ CRITICAL/.test(g.aTexto(motor)));

/* ── B. «cambio», sobre repositorios git temporales ──────────────────────── */
const temporales = [];
const repo = (archivos) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-'));
  temporales.push(dir);
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' }).trim();
  const escribir = (rel, texto) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), texto); };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'prueba@wee.test');
  git('config', 'user.name', 'Prueba');
  git('config', 'core.autocrlf', 'false');
  for (const [rel, texto] of Object.entries(archivos)) escribir(rel, texto);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return { dir, git, escribir, sha: () => git('rev-parse', 'HEAD') };
};
const BASE = {
  'functions/src/index.ts': "export { x } from './a/x';\nexport { y } from './b/y';\n",
  'functions/src/a/x.ts': 'export const x = 1;\n',
  'functions/src/b/y.ts': 'export const y = 2;\n',
  'docs/nota.md': '# Nota\n',
};

const r1 = repo(BASE);
const b1 = r1.sha();
r1.escribir('docs/nota.md', '# Nota\n\nUna línea más.\n');
const soloDocs = g.cambio({ raiz: r1.dir, base: b1 });
check('15) cambio solo de documentación: ningún CRITICAL', ids(soloDocs, 'CRITICAL').length === 0 && soloDocs.entrada.rutas.join() === 'docs/nota.md', ids(soloDocs).join(', '));
r1.escribir('functions/src/a/x.ts', "import { y } from '../b/y';\nexport const x = y + 1;\n");
const conArista = g.cambio({ raiz: r1.dir, base: b1 });
const arista = de(conArista, 'arista:functions/src/a → functions/src/b');
check('16) un import nuevo entre carpetas: el disparador real de frontera.mjs sale IMPORTANT, con la regla frontera/cambio como fuente',
  arista?.nivel === 'IMPORTANT' && arista.rutas.join() === 'functions/src/a/x.ts'
  && arista.fuentes.some((f) => f.regla === 'frontera/cambio' && f.archivo === 'ops/revision/reglas.mjs'), ids(conArista).join(', '));
const antesDeMirar = r1.git('status', '--porcelain');
g.antes({ raiz: r1.dir, archivos: ['functions/src/a/x.ts'] });
g.cambio({ raiz: r1.dir, base: b1 });
const fuente = leer('ops/harness/guardian.mjs');
const lectores = leer('ops/harness/guardian-fuentes.mjs');
const subordenes = [...fuente.matchAll(/git\([^,()]+, \['([a-z-]+)'/g), ...fuente.matchAll(/spawnSync\('git', \['-C', \w+, '([a-z-]+)'/g)].map((m) => m[1]);
check('17) no escribe nada ni manda: el estado de git es el mismo después de mirar, y de git solo lee (ni escrituras, ni push, ni deploy; los lectores, ni git)',
  r1.git('status', '--porcelain') === antesDeMirar && subordenes.length >= 5 && subordenes.every((s) => ['rev-parse', 'ls-files', 'cat-file', 'merge-base', 'status'].includes(s))
  && [fuente, lectores].every((t) => !/writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|renameSync/.test(t) && !/\b(push|deploy|firebase|gcloud)\b['"]/.test(t))
  && !/spawnSync|execSync|execFileSync|\bgit\(/.test(lectores), subordenes.join(', '));

const r2 = repo(BASE);
const c1 = r2.sha();
r2.git('checkout', '-q', '-b', 'lado');
r2.escribir('functions/src/b/y.ts', 'export const y = 3;\n');
r2.git('commit', '-q', '-am', 'lado');
const c2 = r2.sha();
r2.git('checkout', '-q', 'main');
r2.escribir('ops/produccion.json', JSON.stringify({ regla: 'Producción solo cambia por el workflow de despliegue (prueba).', funciones: [
  { funcion: 'x', commit: c1, tag: 'prod/functions/x', enMain: true },
  { funcion: 'y', commit: c2, tag: 'prod/functions/y', enMain: false, ramas: ['lado'] },
] }, null, 2));
r2.git('add', '-A');
r2.git('commit', '-q', '-m', 'mapa');
const c3 = r2.sha();
r2.escribir('functions/src/a/x.ts', 'export const x = 10;\n');
r2.escribir('functions/src/b/y.ts', 'export const y = 20;\n');
const prod = g.cambio({ raiz: r2.dir, base: c3 });
const prodAntes = g.antes({ raiz: r2.dir, archivos: ['functions/src/b/y.ts'] });
check('18) código vivo y permitido.mjs: las dos funciones vivas que cambian salen CRITICAL; la que vive en un commit que HEAD no contiene (y) queda bloqueada, la otra (x) no; igual antes de tocar',
  de(prod, 'produccion:codigo-vivo')?.datos.funciones.map((f) => f.funcion).join() === 'x,y' && /no lo contiene/.test(de(prod, 'produccion:permitido:y')?.detalle || '')
  && de(prod, 'produccion:permitido:y').nivel === 'CRITICAL' && !de(prod, 'produccion:permitido:x') && Boolean(de(prodAntes, 'produccion:permitido:y')), ids(prod).join(', '));

/* Un índice que deja de exportar una función viva, y un script que pasa a lanzar un despliegue (la orden se arma aquí: este archivo no la lleva escrita). */
const r5 = repo({ ...BASE, 'scripts/publicar.mjs': "console.log('hola');\n",
  'ops/produccion.json': JSON.stringify({ regla: 'Producción solo cambia por el workflow de despliegue (prueba).', funciones: [{ funcion: 'x', commit: '0000000', tag: 'prod/functions/x' }] }, null, 2) });
const b5 = r5.sha();
r5.escribir('functions/src/index.ts', "export { y } from './b/y';\n");
const orden = `${['fire', 'base'].join('')} ${['dep', 'loy'].join('')} --only hosting`;
r5.escribir('scripts/publicar.mjs', `import { execSync } from 'node:child_process';\nexecSync(${JSON.stringify(orden)});\n`);
const r5c = g.cambio({ raiz: r5.dir, base: b5 });
check('19) el índice deja de exportar una función viva: es una capacidad que se pierde — CRITICAL, con su fila de produccion.json',
  de(r5c, 'exports:index')?.nivel === 'CRITICAL' && / x$/.test(de(r5c, 'exports:index').titulo)
  && de(r5c, 'exports:index').fuentes.some((f) => f.archivo === 'ops/produccion.json' && f.valor === 'x'), ids(r5c).join(', '));

const r3 = repo(BASE);
const b3 = r3.sha();
r3.escribir('functions/src/a/w.ts', 'export const w = 1;\n');
r3.escribir('functions/src/a/x.ts', "import { w } from './w';\nexport const x = w;\n");
const higiene = g.cambio({ raiz: r3.dir, base: b3 });
const puerta = higiene.hallazgos.find((x) => x.tipo === 'g3');
const cliTemporal = spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/guardian.mjs'), 'cambio', '--base', b3, '--raiz', r3.dir, '--json'], { cwd: RAIZ, encoding: 'utf8' });
check('20) un import de un archivo que git no sigue: la puerta G3 no pasaría (CRITICAL, regla higiene/…) — y el guardián no bloquea: la CLI sale 0',
  puerta?.nivel === 'CRITICAL' && /^g3:higiene\/import-sin-seguimiento\//.test(puerta.id) && puerta.fuentes.some((f) => f.regla === 'higiene/import-sin-seguimiento')
  && higiene.avisos.some((a) => /sin seguimiento/.test(a)) && cliTemporal.status === 0 && JSON.parse(cliTemporal.stdout).hallazgos.some((x) => x.tipo === 'g3'),
  `${ids(higiene).join(', ')} | salida ${cliTemporal.status}`);

const MANIFIESTO = leer('ops/harness/extensiones/revision-determinista.json');
const CI = ['name: CI', 'on: [push]', 'jobs:', '  nivel-1:', '    name: Nivel 1 · prueba', '    runs-on: ubuntu-latest', '    steps:',
  '      - name: Uno', '        run: node uno.mjs', '      - name: Dos', '        run: node dos.mjs', ''].join('\n');
const r4 = repo({ ...BASE, 'functions/package.json': JSON.stringify({ scripts: { test: 'node test/a.test.mjs && node test/b.test.mjs' } }, null, 2),
  'functions/test/a.test.mjs': "console.log('a');\n", 'functions/test/b.test.mjs': "console.log('b');\n",
  'ops/harness/extensiones/revision-determinista.json': MANIFIESTO, '.github/workflows/ci.yml': CI });
const b4 = r4.sha();
r4.escribir('functions/package.json', JSON.stringify({ scripts: { test: 'node test/a.test.mjs' } }, null, 2));
r4.escribir('ops/harness/extensiones/revision-determinista.json', MANIFIESTO.replace('"activa"', '"inactiva"'));
r4.escribir('.github/workflows/ci.yml', CI.replace('      - name: Dos\n        run: node dos.mjs\n', ''));
const registros = g.cambio({ raiz: r4.dir, base: b4 });
check('21) regresiones de registro: una suite fuera de la cadena (y su archivo sigue), la extensión que registra G3 desactivada y un paso de la CI que desaparece → CRITICAL, con su fuente',
  de(registros, 'registro:cadena:test/b.test.mjs')?.nivel === 'CRITICAL' && /revision-determinista\/g3/.test(de(registros, 'registro:f3:revision-determinista')?.titulo || '')
  && de(registros, 'registro:f3:revision-determinista').nivel === 'CRITICAL' && de(registros, 'registro:ci:nivel-1:Dos')?.nivel === 'CRITICAL'
  && de(registros, 'registro:cadena:test/b.test.mjs').fuentes.some((f) => f.archivo === 'functions/package.json' && f.json === 'scripts.test'), ids(registros).join(', '));
const script = de(r5c, 'guardia:scripts/publicar.mjs');
check('22) un script que cambia y lanzaría un despliegue: la guardia de siempre (analizarTexto) lo negaría — CRITICAL, con su motivo tal cual',
  script?.nivel === 'CRITICAL' && /^`firebase deploy`/.test(script.detalle || '') && script.fuentes.some((f) => f.archivo === '.claude/hooks/guardia.mjs' && /^deny: /.test(f.valor)),
  ids(r5c).join(', '));

const contexto = (estado) => ext.construirRegistro([{ archivo: 'ops/harness/extensiones/ejemplo.json', texto: JSON.stringify({
  id: 'ejemplo', nombre: 'Ejemplo de contexto', version: '1.0.0', compatibilidad: { harness: '^1.0.0' }, estado, permisos: ['leer-repositorio'],
  capacidades: { contexto: [{ id: 'nota', descripcion: 'Antes de tocar la documentación', archivos: ['docs'], documentos: ['docs/HARNESS.md'] }] } }) }]);
const conF3 = g.antes({ raiz: RAIZ, archivos: ['docs/CREDITS.md'], registro: contexto('activa') });
const sinF3 = g.antes({ raiz: RAIZ, archivos: ['docs/CREDITS.md'], registro: contexto('inactiva') });
check('23) integra F3 sin tocarlo: una extensión activa con `contexto` aporta su lectura como CONTEXT, con su manifiesto de fuente; inactiva, no aporta nada',
  de(conF3, 'contexto-f3:ejemplo/nota')?.nivel === 'CONTEXT' && de(conF3, 'contexto-f3:ejemplo/nota').fuentes[0].json === 'capacidades.contexto[0]'
  && !de(sinF3, 'contexto-f3:ejemplo/nota'), ids(conF3).join(', '));

/* ── C. La línea de órdenes, sin Claude Code, y el registro ──────────────── */
const cli = (args, opciones = {}) => spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/guardian.mjs'), ...args], { cwd: RAIZ, encoding: 'utf8', ...opciones });
const conCritico = cli(['antes', '--archivos', 'firestore.rules', '--json']);
const enTexto = cli(['antes', '--archivos', 'docs/HARNESS.md']);
const invalidas = [['antes'], ['otro-modo'], ['antes', '--archivos', '../fuera.txt'], ['cambio'], ['cambio', '--base', 'no-es-un-commit-zzz'],
  ['antes', '--archivos', 'a.md', '--base', 'x'], ['antes', '--archivos', 'a.md', '--rara', '1'], ['antes', '--archivos', 'a.md', '--max-por-nivel', '0']].map((a) => cli(a).status);
check('24) informa y no bloquea: sale 0 con CRITICAL (JSON válido) o en texto, y 2 solo si la entrada no vale (8 formas)',
  conCritico.status === 0 && JSON.parse(conCritico.stdout).resumen.CRITICAL > 0 && enTexto.status === 0 && /^Build Guardian de Weë/.test(enTexto.stdout)
  && invalidas.length === 8 && invalidas.every((s) => s === 2), `${conCritico.status} ${enTexto.status} ${invalidas.join(',')}`);
const entornoMinimo = Object.fromEntries(Object.entries({ PATH: path.dirname(process.execPath), SystemRoot: process.env.SystemRoot }).filter(([, v]) => v !== undefined));
const gitAlli = spawnSync('git', ['--version'], { env: entornoMinimo }).status === 0;
const sinClaude = cli(['antes', '--archivos', MOTOR, '--json'], { env: entornoMinimo });
const j = sinClaude.status === 0 ? JSON.parse(sinClaude.stdout) : null;
check('25) funciona sin Claude Code: con un PATH que solo tiene Node (y aquí sin git), dice lo mismo de la zona roja, del código vivo y de las cercas, y avisa de que lee el disco',
  j && ['zona-roja:functions/src/credits/**', 'produccion:codigo-vivo', 'cercas', 'ruta-protegida:ask'].every((i) => de(j, i)?.nivel === 'CRITICAL')
  && j.estado.git === gitAlli && (gitAlli || j.avisos.some((a) => /git no está disponible/.test(a))), (sinClaude.stderr || '').slice(0, 300));
const delServidor = execFileSync('git', ['-C', RAIZ, 'ls-files', 'functions/src'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const loImportan = delServidor.filter((f) => /harness\/guardian/.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')));
const loImportanLosLectores = delServidor.filter((f) => /guardian-fuentes/.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')));
const importsDe = (t) => [...t.matchAll(/^import [\s\S]*? from '([^']+)';$/gm)].map((m) => m[1]);
const susImports = [...importsDe(fuente), ...importsDe(lectores)];
check('26) es de ingeniería: nada de functions/src lo importa (ni a sus lectores), y ellos no importan nada de functions/src',
  loImportan.length === 0 && loImportanLosLectores.length === 0 && susImports.length >= 10 && susImports.every((i) => !/functions\/src/.test(i)), loImportan.join(', '));
check('27) coordina, no copia: usa las piezas de siempre (reglas, guardia, permitido, detectores, frontera, selector, clasificación, F3) y no lleva tablas propias',
  ['../revision/reglas.mjs', '../../.claude/hooks/guardia.mjs', '../permitido.mjs', '../revision/detectores.mjs', '../revision/frontera.mjs', '../revision/selector.mjs',
    '../revision/clasificacion.mjs', './extensiones.mjs', './guardian-fuentes.mjs'].every((m) => susImports.includes(m))
  && [fuente, lectores].every((t) => !/'functions\/src\/credits\/\*\*'|spendCredits|g0-seguridad|8e91daa|DD-\d\d|revisor-seguridad/.test(t)));
const pkg = JSON.parse(leer('functions/package.json'));
check('28) esta suite está en la cadena de `npm test` y HARNESS.md describe la pieza',
  /harness-guardian\.test\.mjs/.test(pkg.scripts.test) && /ops\/harness\/guardian\.mjs/.test(leer('docs/HARNESS.md')) && /guardian-fuentes\.mjs/.test(leer('docs/HARNESS.md')));

for (const dir of temporales) fs.rmSync(dir, { recursive: true, force: true });
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
