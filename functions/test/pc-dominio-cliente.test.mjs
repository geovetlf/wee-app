/**
 * R9 · LÍNEA A — EL CONTRATO DEL CLIENTE, EJECUTADO (`services/cicloDeTrabajo.ts` + `projectsService`).
 *
 *   node test/pc-dominio-cliente.test.mjs      (sin build; transpila el cliente y dobla solo Firebase)
 *
 * D-1 «Sin decidir» (decisión del dueño, 2026-10-12): lista los assets fuera de toda creación final, sin eliminados,
 * paginado y leyendo las creaciones UNA vez. Y lo que pidió el coordinador sobre proyectos: Mis proyectos filtra los
 * archivados ANTES de limitar y cuenta exacto; borrar un proyecto suelta sus trabajos en el mismo lote; mover un
 * trabajo es atómico. Errores del callable con su código (y el impacto de D-5). Con CONTROLES.
 */
import { register } from 'node:module';

register(new URL('./_pc-dominio-ganchos.mjs', import.meta.url));

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

const ciclo = await import('../../services/cicloDeTrabajo.ts');
const { projectsService } = await import('../../services/projectsService.ts');
const { Timestamp } = await import('firebase/firestore');
const E = globalThis.__pc;
const ANA = 'cuentaAna0001';
const BETO = 'cuentaBeto0001';
const set = (p, d) => E.docs.set(p, d);
const asset = (id, owner, i, extra = {}) => set(`assets/${id}`, { assetId: id, ownerAccountId: owner, kind: 'image', status: 'ready', createdAt: 1000 + i, ...extra });

/* ── D-1 · Sin decidir ─────────────────────────────────────────────────── */
console.log('\n── D-1 · sin decidir ──');
for (let i = 0; i < 60; i++) asset(`asset_a${String(i).padStart(3, '0')}`, ANA, i);
asset('asset_borrado', ANA, 100, { status: 'deleted' });
asset('asset_beto', BETO, 101);
/* 30 de los 60 ya están en creaciones finales; 2 en una eliminada (vuelven a «sin decidir»). */
const enCreacion = Array.from({ length: 30 }, (_, i) => `asset_a${String(i * 2).padStart(3, '0')}`);
for (let i = 0; i < 15; i++) set(`creations/c${i}`, { ownerAccountId: ANA, status: 'final', assetIds: enCreacion.slice(i * 2, i * 2 + 2) });
set('creations/celim', { ownerAccountId: ANA, status: 'eliminada', assetIds: ['asset_a001', 'asset_a003'] });
set('creations/cbeto', { ownerAccountId: BETO, status: 'final', assetIds: ['asset_a005'] });
E.lecturas = 0;
const p1 = await ciclo.listarSinDecidir(ANA);
const lecturasP1 = E.lecturas;
const ids1 = p1.assets.map((a) => a.assetId);
check('1) la primera página trae solo assets sin decidir de la cuenta', ids1.length > 0 && ids1.every((id) => !enCreacion.includes(id)) && p1.assets.every((a) => a.ownerAccountId === ANA));
check('1b) nunca los eliminados', !ids1.includes('asset_borrado'));
let todos = [...ids1]; let cursor = p1.siguiente; let paginas = 1; let lecturasCreaciones = 0;
const creacionesAntes = E.porColeccion.creations;
while (cursor) {
  E.lecturas = 0;
  const p = await ciclo.listarSinDecidir(ANA, cursor);
  lecturasCreaciones += E.lecturas;
  todos = todos.concat(p.assets.map((a) => a.assetId)); cursor = p.siguiente; paginas++;
  if (paginas > 10) break;
}
check('2) recorriendo las páginas salen exactamente los 30 sin decidir, sin repetir', todos.length === 30 && new Set(todos).size === 30, `${todos.length} en ${paginas} páginas`);
check('1c) una creación ELIMINADA no decide nada: sus assets vuelven a «sin decidir»', todos.includes('asset_a001') && todos.includes('asset_a003'));
check('1d) la creación de OTRA cuenta no cuenta (asset_a005 de Ana sigue sin decidir)', todos.includes('asset_a005'));
check('2b) las páginas siguientes NO vuelven a leer las creaciones (el cursor las arrastra)', E.porColeccion.creations === creacionesAntes && paginas > 1, `lecturas de assets ${lecturasCreaciones}`);
check('2c) lecturas de la primera página acotadas: creaciones de la cuenta + como mucho 3 páginas de assets', lecturasP1 <= 16 + 3 * 25, `lecturas ${lecturasP1}`);
check('2d) CONTROL · sin creaciones, todo lo vivo está sin decidir', await (async () => {
  const guardadas = [...E.docs.entries()].filter(([p]) => p.startsWith('creations/'));
  guardadas.forEach(([p]) => E.docs.delete(p));
  let n = 0; let c; do { const r = await ciclo.listarSinDecidir(ANA, c); n += r.assets.length; c = r.siguiente; } while (c);
  guardadas.forEach(([p, d]) => E.docs.set(p, d));
  return n === 60;
})());

/* ── Mis proyectos ─────────────────────────────────────────────────────── */
console.log('\n── Mis proyectos ──');
let reloj = 10_000;
E.reloj = () => ++reloj;
for (let i = 0; i < 60; i++) set(`creatorProjects/arch${i}`, { userId: ANA, name: `Archivado ${i}`, emoji: '📁', archivedAt: new Timestamp(1), updatedAt: new Timestamp(9000 + i) });
set('creatorProjects/vivo1', { userId: ANA, name: 'Vivo viejo', emoji: '📁', updatedAt: new Timestamp(10) });
set('creatorProjects/vivo2', { userId: ANA, name: 'Vivo desarchivado', emoji: '📁', archivedAt: null, updatedAt: new Timestamp(11) });
set('creatorProjects/deBeto', { userId: BETO, name: 'De Beto', emoji: '📁', updatedAt: new Timestamp(12) });
for (let i = 0; i < 250; i++) set(`creatorJobs/j${i}`, { userId: ANA, projectId: i < 210 ? 'vivo1' : undefined, experienceId: 'design', createdAt: new Timestamp(i), results: [] });
const enCurso = await ciclo.listarProyectosEnCurso(ANA);
check('3) los archivados no se comen el hueco: con 60 archivados más recientes, los vivos salen', enCurso.map((p) => p.id).sort().join() === 'vivo1,vivo2', enCurso.map((p) => p.id).join());
check('3b) el recuento de trabajos es exacto aunque pase de 200', enCurso.find((p) => p.id === 'vivo1')?.trabajos === 210 && enCurso.find((p) => p.id === 'vivo2')?.trabajos === 0);
check('3c) CONTROL · los de otra cuenta no salen', !enCurso.some((p) => p.id === 'deBeto'));

/* Borrar un proyecto suelta sus trabajos en el mismo lote. */
set('creatorProjects/borrame', { userId: ANA, name: 'Borrame', emoji: '📁', updatedAt: new Timestamp(1) });
for (let i = 0; i < 5; i++) set(`creatorJobs/b${i}`, { userId: ANA, projectId: 'borrame', createdAt: new Timestamp(i) });
set('creatorJobs/otroDueno', { userId: BETO, projectId: 'borrame', createdAt: new Timestamp(1) });
await projectsService.remove('borrame');
check('4) borrar un proyecto lo borra y suelta TODOS sus trabajos (ninguno apunta a un proyecto inexistente)', !E.docs.has('creatorProjects/borrame')
  && [0, 1, 2, 3, 4].every((i) => !('projectId' in E.docs.get(`creatorJobs/b${i}`))));
check('4b) CONTROL · un trabajo de OTRA cuenta no se toca (no lo podría escribir)', E.docs.get('creatorJobs/otroDueno').projectId === 'borrame');
set('creatorProjects/atomico', { userId: ANA, name: 'Atómico', emoji: '📁', updatedAt: new Timestamp(1) });
set('creatorJobs/at1', { userId: ANA, projectId: 'atomico', createdAt: new Timestamp(1) });
E.falloDeLote = () => true;
const fallo = await intento(() => projectsService.remove('atomico'));
E.falloDeLote = null;
check('4c) si el lote falla, no queda NADA a medias: ni proyecto borrado ni trabajos sueltos', !fallo.ok && E.docs.has('creatorProjects/atomico') && E.docs.get('creatorJobs/at1').projectId === 'atomico');
E.falloDeLote = (ops) => ops.some(([t, p]) => t === 'update' && p.startsWith('creatorProjects/'));
const mover = await intento(() => projectsService.assignJob('at1', 'vivo1'));
E.falloDeLote = null;
check('5) mover un trabajo es atómico: si falla tocar el proyecto, el trabajo no se mueve', !mover.ok && E.docs.get('creatorJobs/at1').projectId === 'atomico');
await projectsService.assignJob('at1', 'vivo1');
check('5b) CONTROL · y si no falla, se mueve', E.docs.get('creatorJobs/at1').projectId === 'vivo1');

/* ── Errores del callable ──────────────────────────────────────────────── */
console.log('\n── errores del callable ──');
const noDesplegado = await intento(() => ciclo.finalizarCreacion({ assetIds: ['asset_a001'], requestId: 'req-cli-0001' }));
check('6) sin la Function disponible: ErrorDeCiclo «no_disponible», nunca un resultado inventado', !noDesplegado.ok && noDesplegado.error.code === 'no_disponible');
E.callable = async (nombre, datos) => {
  if (datos.accion === 'borrarAsset') { const e = new Error('x'); e.code = 'functions/failed-precondition'; e.details = { code: 'referenciado', impacto: { bloqueos: [{ tipo: 'elemento', id: 'el1' }] } }; throw e; }
  if (datos.accion === 'reabrir') { const e = new Error('x'); e.code = 'functions/not-found'; e.details = { code: 'no_encontrado' }; throw e; }
  return { creacionId: 'c-ok', yaExistia: false, nombre };
};
const bloqueado = await intento(() => ciclo.borrarAsset('asset_a001', true));
check('7) D-5 · el bloqueo llega como ErrorDeCiclo «referenciado» con el impacto para la interfaz', !bloqueado.ok && bloqueado.error.code === 'referenciado' && bloqueado.error.detalle?.bloqueos?.[0]?.tipo === 'elemento');
const noEsTuya = await intento(() => ciclo.reabrirParaEditar('c-ajena'));
check('7b) lo ajeno llega como «no_encontrado» (con details, no como «no disponible»)', !noEsTuya.ok && noEsTuya.error.code === 'no_encontrado');
const okT = await ciclo.guardarTextoFinal({ texto: 'Receta', herramienta: 'chef', requestId: 'req-cli-0002' });
const ultima = E.llamadas[E.llamadas.length - 1];
check('8) D-3 · guardarTextoFinal va por el callable con su acción y sus datos', okT.creacionId === 'c-ok' && ultima.nombre === 'cicloDeTrabajo' && ultima.datos.accion === 'guardarTexto' && ultima.datos.texto === 'Receta');
await ciclo.borrarAsset('asset_a001', 'si').catch(() => {});
check('9) D-5 · «confirmar» viaja como true SOLO si es true', E.llamadas[E.llamadas.length - 1].datos.confirmar === false);

console.log(failures === 0 ? '\nOK pc-dominio-cliente' : `\n${failures} fallo(s) en pc-dominio-cliente`);
process.exit(failures === 0 ? 0 : 1);
