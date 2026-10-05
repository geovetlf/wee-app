/*
 * LAS EXTENSIONES DEL WEË HARNESS (F3) — `ops/harness/extensiones.mjs`.
 *
 * Sin red y sin Claude Code. Se prueba el contrato del manifiesto, el registro y su ciclo de vida, la puerta
 * (deny-by-default, lista blanca por permiso y la guardia de siempre) y, sobre todo, que una extensión
 * maliciosa NO puede aprobar un despliegue, apagar la guardia, saltarse el Quality Reviewer, tocar secretos,
 * elevar sus permisos ni hacer nada fuera de su manifiesto. Cada «no puede» se EJECUTA: el ejecutor espía no
 * llega a llamarse y los archivos protegidos no cambian ni un byte.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const ext = await import(pathToFileURL(path.join(RAIZ, 'ops/harness/extensiones.mjs')).href);
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const huella = (p) => createHash('sha256').update(fs.readFileSync(path.join(RAIZ, p))).digest('hex');

const base = (extra = {}) => ({
  id: 'ejemplo', nombre: 'Ejemplo', version: '1.0.0', compatibilidad: { harness: '^1.0.0' }, estado: 'activa',
  permisos: ['ejecutar-pruebas'], capacidades: { comprobacion: [{ id: 'eco', argv: ['node', 'functions/test/eco.test.mjs'] }] }, ...extra,
});
const errores = (m) => ext.validarManifiesto(m).errores;
const registroDe = (manifiestos, opciones) => ext.construirRegistro(
  manifiestos.map((m) => ({ archivo: `ops/harness/extensiones/${m.archivo || m.id}.json`, texto: JSON.stringify({ ...m, archivo: undefined }) })), opciones);
const estadoDe = (registro, id) => (registro.extensiones.find((e) => e.id === id) || {}).estado;
const espia = () => {
  const llamadas = [];
  const f = (argv, op) => { llamadas.push({ argv, op }); return { codigo: 0, salida: 'ok', errores: '' }; };
  f.llamadas = llamadas;
  return f;
};
const lanza = (f) => { try { f(); return false; } catch { return true; } };

/* ── A. El contrato del manifiesto ───────────────────────────────────────── */
check('1) un manifiesto que cumple el contrato es válido', ext.validarManifiesto(base()).valido, errores(base()).join(' | '));
const malos = [
  ['no es un objeto', null], ['es una lista', []],
  ['le falta el id', (({ id, ...r }) => r)(base())], ['le falta la compatibilidad', (({ compatibilidad, ...r }) => r)(base())],
  ['id con mayúsculas', base({ id: 'Ejemplo' })], ['versión que no es x.y.z', base({ version: '1.0' })],
  ['estado inventado', base({ estado: 'siempre' })], ['compatibilidad sin rango ^', base({ compatibilidad: { harness: '>=1.0.0' } })],
  ['un campo fuera del contrato', base({ ganchos: ['antes-de-todo'] })], ['sin capacidades', base({ capacidades: {} })],
];
const fallosMalos = malos.filter(([, m]) => ext.validarManifiesto(m).valido).map(([n]) => n);
check('2) un manifiesto inválido se rechaza, y dice por qué (10 formas)', fallosMalos.length === 0, fallosMalos.join(', '));
check('4) una capacidad desconocida se rechaza', errores(base({ capacidades: { desplegar: [{ id: 'x' }] } })).some((e) => /capacidad desconocida: desplegar/.test(e)));
check('5) un permiso desconocido se rechaza', errores(base({ permisos: ['ejecutar-pruebas', 'root'] })).some((e) => /permiso desconocido: root/.test(e)));
const privilegiadosAceptados = ext.PRIVILEGIADOS.filter((p) => !errores(base({ permisos: ['ejecutar-pruebas', p] })).some((e) => e.startsWith(`permiso privilegiado: ${p}`)));
check('5b) y cada permiso privilegiado (aprobar, desplegar, merge, push, IAM, secretos, guardia, puertas…) se rechaza por su nombre',
  ext.PRIVILEGIADOS.length === 12 && privilegiadosAceptados.length === 0, privilegiadosAceptados.join(', '));
check('5c) permisos mínimos: un permiso que ninguna capacidad usa se rechaza',
  errores(base({ permisos: ['ejecutar-pruebas', 'leer-git'] })).some((e) => /permiso que ninguna capacidad usa: leer-git/.test(e)));
const tabla = [['^1.0.0', '1.0.0', true], ['^1.0.0', '1.4.2', true], ['^1.2.0', '1.1.9', false], ['^2.0.0', '1.9.9', false],
  ['^1.0.0', '2.0.0', false], ['>=1.0.0', '1.0.0', false], ['1.0.0', '1.0.0', false], ['^1.0.0', 'x', false]];
const malCompat = tabla.filter(([r, v, s]) => ext.compatible(r, v) !== s).map(([r, v]) => `${r}@${v}`);
check('11) compatibilidad: solo `^x.y.z`, la misma mayor y no menos de lo pedido', malCompat.length === 0, malCompat.join(', '));

/* ── B. El registro y su ciclo de vida ───────────────────────────────────── */
check('3) una extensión que pide otra versión del Harness queda incompatible, y no actúa',
  estadoDe(registroDe([base({ compatibilidad: { harness: '^2.0.0' } })]), 'ejemplo') === 'incompatible'
  && !ext.autorizar(registroDe([base({ compatibilidad: { harness: '^2.0.0' } })]), 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }).permitido);
const inactiva = registroDe([base({ estado: 'inactiva' })]);
check('6) desactivada en su manifiesto: queda inactiva y la puerta no la deja hacer nada',
  estadoDe(inactiva, 'ejemplo') === 'inactiva' && /no está activa/.test(ext.autorizar(inactiva, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }).motivo));
const activa = registroDe([base()]);
check('7) activada: queda activa y la puerta la deja hacer EXACTAMENTE lo que declara',
  estadoDe(activa, 'ejemplo') === 'activa' && ext.autorizar(activa, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }).permitido);
const choque = registroDe([base(), { ...base(), archivo: 'copia' }]);
check('8) dos extensiones con el mismo id: las dos en conflicto y ninguna actúa',
  choque.extensiones.every((e) => e.estado === 'en-conflicto') && !ext.autorizar(choque, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }).permitido);
check('8b) y un archivo que no se llama como su id se rechaza', estadoDe(registroDe([{ ...base(), archivo: 'otro-nombre' }]), 'ejemplo') === 'rechazada');
const apagadas = registroDe([base()], { apagadas: true });
const realApagado = ext.cargarRegistro({ entorno: { WEE_EXTENSIONES: 'off' } });
check('12) ciclo de vida: rechazada · en-conflicto · incompatible · inactiva · apagada (WEE_EXTENSIONES=off) · activa; solo la activa actúa',
  estadoDe(apagadas, 'ejemplo') === 'apagada' && !ext.autorizar(apagadas, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }).permitido
  && realApagado.extensiones.every((e) => e.estado === 'apagada')
  && ext.construirRegistro([{ archivo: 'ops/harness/extensiones/roto.json', texto: '{ no es json' }]).extensiones[0].estado === 'rechazada');
const real = ext.cargarRegistro();
const g3 = real.extensiones.find((e) => e.id === 'revision-determinista');
const cli = spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/extensiones.mjs'), 'validar'], { cwd: RAIZ, encoding: 'utf8' });
check('13) el registro del repositorio: todo manifiesto cumple, sin conflictos; la revisión determinista está activa y aporta su comprobación',
  real.extensiones.length >= 1 && real.extensiones.every((e) => !['rechazada', 'en-conflicto'].includes(e.estado))
  && g3 && g3.estado === 'activa' && ext.conCapacidad(real, 'comprobacion').some((e) => e.id === 'revision-determinista') && cli.status === 0,
  real.extensiones.map((e) => `${e.id}=${e.estado}`).join(', '));
check('13b) y esa extensión corre la puerta G3 TAL CUAL: `node ops/revision/baseline.mjs`, sin opciones, solo con ejecutar-pruebas',
  JSON.stringify(g3?.manifiesto.capacidades.comprobacion.map((a) => a.argv)) === JSON.stringify([['node', 'ops/revision/baseline.mjs']])
  && JSON.stringify(g3?.manifiesto.permisos) === JSON.stringify(['ejecutar-pruebas']));

/* ── C. La puerta: deny-by-default y la guardia de siempre ───────────────── */
const vistos = [];
const guardiaEspia = (respuesta) => (herramienta, texto) => { vistos.push(texto); return respuesta; };
const conPasa = ext.autorizar(activa, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }, { analizar: guardiaEspia({ decision: null }) });
const conAsk = ext.autorizar(activa, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }, { analizar: guardiaEspia({ decision: 'ask', motivo: 'm' }) });
const conDeny = ext.autorizar(activa, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }, { analizar: guardiaEspia({ decision: 'deny', motivo: 'm' }) });
check('9) la guardia de siempre se consulta en CADA acción: si pregunta o niega, la extensión no lo hace (ni lo que su permiso cubría)',
  conPasa.permitido && !conAsk.permitido && /lo pregunta/.test(conAsk.motivo) && !conDeny.permitido && /lo niega/.test(conDeny.motivo)
  && vistos.length === 3 && vistos.every((t) => t === 'node functions/test/eco.test.mjs'));
const sinDeclarar = espia();
const privilegiada = ext.actuar(activa, 'ejemplo', { tipo: 'orden', argv: ['gh', 'api', '-X', 'POST', 'repos/geovetlf/wee-app/actions/runs/1/pending_deployments'] }, { ejecutor: sinDeclarar });
check('10) una acción privilegiada fuera del manifiesto se niega y no se ejecuta', !privilegiada.permitido && !privilegiada.hecho && sinDeclarar.llamadas.length === 0);

/* ── D. Sabotaje: lo que una extensión maliciosa NO puede hacer ─────────── */
const escritora = (extra = {}) => base({ permisos: ['escribir-cache'], capacidades: { informe: [{ id: 'resumen', archivo: 'resumen.md' }] }, ...extra });
const ejecutorD = espia();
const intentar = (manifiesto, accion) => ext.actuar(registroDe([manifiesto]), manifiesto.id, accion, { ejecutor: ejecutorD, raiz: RAIZ });

const aprobar = ['gh', 'api', '-X', 'POST', 'repos/geovetlf/wee-app/actions/runs/1/pending_deployments'];
check('S1) NO aprueba un despliegue: ni pidiendo el permiso, ni declarando la orden, ni pidiéndola al vuelo',
  errores(base({ permisos: ['aprobar-despliegue'] })).some((e) => /privilegiado: aprobar-despliegue/.test(e))
  && errores(base({ capacidades: { comprobacion: [{ id: 'aprobar', argv: aprobar }] } })).some((e) => /no la cubre ningún permiso/.test(e))
  && !intentar(base(), { tipo: 'orden', argv: aprobar }).hecho && ejecutorD.llamadas.length === 0);

const guardiaAntes = [huella('.claude/hooks/guardia.mjs'), huella('.claude/settings.json')];
const apagarGuardia = [
  intentar(escritora(), { tipo: 'escribir', ruta: '.claude/hooks/guardia.mjs' }, ),
  intentar(escritora(), { tipo: 'escribir', ruta: '.claude/settings.json' }),
  intentar(escritora(), { tipo: 'escribir', ruta: 'ops/harness/.cache/ejemplo/../../../.claude/settings.json' }),
];
check('S2) NO desactiva la guardia: ni con un campo propio, ni con el permiso, ni escribiendo sus archivos (que no cambian)',
  errores(base({ guardia: false })).some((e) => /campo desconocido: guardia/.test(e))
  && errores(base({ permisos: ['ejecutar-pruebas', 'desactivar-guardia'] })).some((e) => /privilegiado: desactivar-guardia/.test(e))
  && apagarGuardia.every((r) => !r.permitido && !r.hecho)
  && JSON.stringify([huella('.claude/hooks/guardia.mjs'), huella('.claude/settings.json')]) === JSON.stringify(guardiaAntes));

const baselineAntes = huella('ops/revision/baseline.json');
const tocarBaseline = intentar(escritora(), { tipo: 'escribir', ruta: 'ops/revision/baseline.json' });
check('S3) NO se salta el Quality Reviewer: ni proponiendo baseline, ni escribiéndola (la guardia sola lo dejaría: la puerta no), ni con el permiso',
  errores(base({ capacidades: { comprobacion: [{ id: 'g3', argv: ['node', 'ops/revision/baseline.mjs', '--proponer', 'ops/revision/baseline.json'] }] } })).some((e) => /no la cubre ningún permiso/.test(e))
  && errores(base({ permisos: ['ejecutar-pruebas', 'saltar-revision'] })).some((e) => /privilegiado: saltar-revision/.test(e))
  && errores(base({ permisos: ['ejecutar-pruebas', 'desactivar-puertas'] })).some((e) => /privilegiado: desactivar-puertas/.test(e))
  && !tocarBaseline.permitido && huella('ops/revision/baseline.json') === baselineAntes, tocarBaseline.motivo);

const lectora = (documentos) => base({ permisos: ['leer-repositorio'], capacidades: { contexto: [{ id: 'docs', archivos: ['ops/harness'], documentos }] } });
const capturado = espia();
ext.actuar(activa, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }, { ejecutor: capturado, entorno: { PATH: '/bin', GH_TOKEN: 't', GOOGLE_APPLICATION_CREDENTIALS: 'c', ARK_API_KEY: 'k', ALGO_SECRET: 's' } });
check('S4) NO toca secretos: la guardia real niega declararlos y leerlos, no los escribe, y no hereda tokens ni claves del entorno',
  errores(lectora(['functions/.env.get-wee'])).some((e) => /la guardia lo niega/.test(e))
  && !intentar(lectora(['docs/HARNESS.md']), { tipo: 'leer', ruta: '.env.local' }).hecho
  && !intentar(escritora(), { tipo: 'escribir', ruta: 'functions/.env.get-wee' }).hecho
  && errores(base({ permisos: ['ejecutar-pruebas', 'modificar-secretos'] })).some((e) => /privilegiado: modificar-secretos/.test(e))
  && JSON.stringify(capturado.llamadas[0]?.op.env) === JSON.stringify({ PATH: '/bin' }));

const soloGit = base({ id: 'solo-git', permisos: ['leer-git'], capacidades: { comprobacion: [{ id: 'log', argv: ['git', 'log'] }] } });
const dos = registroDe([soloGit, base({ id: 'otra' })]);
const congelado = registroDe([base({ estado: 'inactiva' })]);
check('S5) NO eleva sus permisos: ni una orden que exige otro permiso, ni la comprobación de otra extensión, ni retocando el registro (congelado)',
  errores(base({ permisos: ['leer-git'] })).some((e) => /exige el permiso ejecutar-pruebas, que no declara/.test(e))
  && !ext.autorizar(dos, 'solo-git', { tipo: 'comprobacion', aporte: 'eco' }).permitido
  && !ext.autorizar(dos, 'quien-sea', { tipo: 'comprobacion', aporte: 'eco' }).permitido
  && lanza(() => { 'use strict'; congelado.extensiones[0].estado = 'activa'; })
  && lanza(() => { congelado.extensiones[0].manifiesto.permisos.push('merge'); })
  && !ext.autorizar(congelado, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }).permitido);

const ordenesFuera = [['bash', '-c', 'git push'], ['node', '-e', 'process.exit(0)'], ['git', 'push'], ['git', '-c', 'core.hooksPath', 'log'],
  ['git', 'log', '--output', 'x'], ['git', 'diff', '--ext-diff'], ['node', 'functions/test/x.test.mjs;rm'], ['node', 'functions/test/../../x.test.mjs'],
  ['firebase', 'deploy'], ['gcloud', 'iam', 'roles', 'list'], ['gh', 'pr', 'merge', '9']];
const coladas = ordenesFuera.filter((argv) => ext.permisoDeLaOrden(argv, 'ejemplo') !== null).map((a) => a.join(' '));
check('S6) NO hace nada fuera de su manifiesto: ni una orden suelta (aunque sea inofensiva), ni un documento o informe que no declara, ni otra carpeta',
  !intentar(base(), { tipo: 'orden', argv: ['git', 'log'] }).hecho
  && !intentar(base(), { tipo: 'comprobacion', aporte: 'otra-cosa' }).hecho
  && !intentar(lectora(['docs/HARNESS.md']), { tipo: 'leer', ruta: 'docs/SECURITY.md' }).hecho
  && !intentar(escritora(), { tipo: 'escribir', ruta: 'ops/harness/.cache/otra/resumen.md' }).hecho
  && coladas.length === 0 && ejecutorD.llamadas.length === 0, coladas.join(' | '));

/* ── E. Cuando SÍ puede: se ejecuta de verdad, sin shell y sin credenciales ── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-ext-'));
fs.mkdirSync(path.join(tmp, 'functions/test'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'ops/harness/extensiones'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'functions/test/eco.test.mjs'), "console.log(JSON.stringify({ token: process.env.GH_TOKEN ?? null }));\n");
fs.writeFileSync(path.join(tmp, 'docs/nota.md'), 'antes de tocar ops/harness, lee esto\n');
const completa = base({ permisos: ['ejecutar-pruebas', 'leer-repositorio', 'escribir-cache'], capacidades: {
  comprobacion: [{ id: 'eco', argv: ['node', 'functions/test/eco.test.mjs'] }],
  contexto: [{ id: 'nota', archivos: ['ops/harness'], documentos: ['docs/nota.md'] }],
  informe: [{ id: 'resumen', archivo: 'resumen.md' }],
} });
fs.writeFileSync(path.join(tmp, 'ops/harness/extensiones/ejemplo.json'), JSON.stringify(completa));
const regTmp = ext.cargarRegistro({ raiz: tmp, entorno: {} });
const corrida = ext.actuar(regTmp, 'ejemplo', { tipo: 'comprobacion', aporte: 'eco' }, { raiz: tmp, entorno: { ...process.env, GH_TOKEN: 'secreto-de-prueba' } });
const leida = ext.actuar(regTmp, 'ejemplo', { tipo: 'leer', ruta: 'docs/nota.md' }, { raiz: tmp });
const escrita = ext.actuar(regTmp, 'ejemplo', { tipo: 'escribir', ruta: 'ops/harness/.cache/ejemplo/resumen.md' }, { raiz: tmp, contenido: '# hecho\n' });
check('E1) lo declarado y permitido se hace de verdad: la comprobación corre (sin el token del entorno), el documento se lee y el informe se escribe en su carpeta',
  corrida.hecho && corrida.resultado.codigo === 0 && JSON.parse(corrida.resultado.salida.trim()).token === null
  && leida.hecho && /antes de tocar/.test(leida.resultado)
  && escrita.hecho && fs.readFileSync(path.join(tmp, 'ops/harness/.cache/ejemplo/resumen.md'), 'utf8') === '# hecho\n',
  JSON.stringify({ corrida: corrida.motivo, leida: leida.motivo, escrita: escrita.motivo }));
fs.rmSync(tmp, { recursive: true, force: true });

/* ── F. Sin Claude Code ─────────────────────────────────────────────────── */
const entornoMinimo = Object.fromEntries(Object.entries({ PATH: path.dirname(process.execPath), SystemRoot: process.env.SystemRoot }).filter(([, v]) => v !== undefined));
const sinClaude = spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/extensiones.mjs'), 'listar'], { cwd: RAIZ, encoding: 'utf8', env: entornoMinimo });
const fuente = leer('ops/harness/extensiones.mjs');
const importa = [...fuente.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
check('14) funciona sin Claude Code: con un PATH que solo tiene Node y sin variables de Claude, lista el registro',
  sinClaude.status === 0 && /✔ activa · revision-determinista@1\.0\.0/.test(sinClaude.stdout), (sinClaude.stderr || '').slice(0, 200));
check('14b) y no depende de él: solo importa Node y la guardia de WEE, y nunca lanza `claude`',
  importa.every((m) => m.startsWith('node:') || m === '../../.claude/hooks/guardia.mjs') && !/['"`]claude['"`]|@anthropic-ai/.test(fuente),
  importa.join(', '));
const enProducto = [];
const recorrer = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) recorrer(p); else if (/\.(ts|js|mjs)$/.test(e.name) && /ops\/harness/.test(fs.readFileSync(p, 'utf8'))) enProducto.push(p); } };
recorrer(path.join(RAIZ, 'functions/src'));
check('14c) es del Harness, no del producto: nada de functions/src lo usa', enProducto.length === 0, enProducto.join(', '));

/* ── G. Registrado y documentado ────────────────────────────────────────── */
const pkg = JSON.parse(leer('functions/package.json'));
check('15) esta suite está en la cadena de `npm test`, la caché de las extensiones no se versiona y HARNESS.md describe la pieza',
  /harness-extensiones\.test\.mjs/.test(pkg.scripts.test) && /^ops\/harness\/\.cache\/$/m.test(leer('.gitignore'))
  && /ops\/harness\/extensiones\.mjs/.test(leer('docs/HARNESS.md')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
