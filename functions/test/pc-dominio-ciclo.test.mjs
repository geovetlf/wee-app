/**
 * R9 · LÍNEA A — EL CICLO DE VIDA DE «MIS PROYECTOS / MIS CREACIONES», EJECUTADO.
 *
 *   node test/pc-dominio-ciclo.test.mjs      (necesita `npm run build`: usa functions/lib)
 *
 * Corre `functions/src/content/creaciones.ts` COMPILADO —finalizar, reabrir,
 * eliminar y el callable `cicloDeTrabajo`— sobre la Firestore en memoria de
 * `_firestore-en-memoria.mjs`. Recorre la misión:
 *   1 crear → en proyectos · 2 editar → sigue · 3 finalizar → en creaciones ·
 *   4 finalizar ×2 sin duplicar · 5 reabrir conserva la relación ·
 *   6 eliminar la creación no borra el proyecto · 7 borrar/archivar el proyecto no rompe la creación ·
 *   8 aislamiento por cuenta · 9 publicar no finaliza ni mueve.
 * Con CONTROLES en cada bloque. Nada sale a la red; no hace falta emulador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseEnMemoria, instalarLaBase, lib } from './_firestore-en-memoria.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const intento = async (fn) => { try { return { ok: true, valor: await fn() }; } catch (error) { return { ok: false, error }; } };

const base = new BaseEnMemoria();
const deshacer = instalarLaBase(() => base);
const C = lib('content/creaciones.js');
const ANA = 'cuentaAna0001';
const BETO = 'cuentaBeto0001';
const reloj = (() => { let t = 1_800_000_000_000; return () => (t += 1000); })();
const material = async (id) => base.leer(`assets/${id}`) ?? null;
const deps = { db: base, material, ahora: reloj };

const ficha = (assetId, owner, extra = {}) => ({
  contract: 1, assetId, ownerAccountId: owner, kind: 'image', status: 'ready', name: 'Logo',
  storageRef: { provider: 'wee', objectKey: `users/${owner}/ai-generations/${assetId}.png` },
  metadata: { experienceId: 'design' }, provenance: { createdAt: 1, jobId: 'job_ana_1' }, createdAt: 1, updatedAt: 1, ...extra,
});
const deCuenta = (c) => base.de('creations').filter((x) => x.ownerAccountId === c);

/* ── 1 · crear → en proyectos ─────────────────────────────────────────── */
console.log('\n── 1 · crear ──');
base.docs.set('creatorProjects/proj_ana_1', { userId: ANA, name: 'Mi marca', emoji: '📁', createdAt: 1, updatedAt: 1 });
base.docs.set('creatorJobs/job_ana_1', { userId: ANA, experienceId: 'design', projectId: 'proj_ana_1', results: [] });
base.docs.set('assets/asset_ana_a', ficha('asset_ana_a', ANA));
base.docs.set('assets/asset_ana_b', ficha('asset_ana_b', ANA));
base.docs.set('assets/asset_ana_c', ficha('asset_ana_c', ANA, { provenance: { createdAt: 1 } }));
base.docs.set('assets/asset_beto_a', ficha('asset_beto_a', BETO, { provenance: { createdAt: 1, jobId: 'job_beto_1' } }));
base.docs.set('creatorProjects/proj_beto_1', { userId: BETO, name: 'Lo de Beto', emoji: '📁', createdAt: 1, updatedAt: 1 });
const modelo = lib('content/creaciones-modelo.js');
check('1) el proyecto recién creado está en proceso (sale en «Mis proyectos»)', modelo.estadoDeProyecto(base.leer('creatorProjects/proj_ana_1')) === 'en_proceso');
check('1c) CONTROL · y todavía no hay ninguna creación: generar no es finalizar', deCuenta(ANA).length === 0);

/* ── 2 · editar → sigue en proyectos ──────────────────────────────────── */
console.log('\n── 2 · editar ──');
base.docs.set('creatorJobs/job_ana_2', { userId: ANA, experienceId: 'design', projectId: 'proj_ana_1', results: [] });
check('2) con otro trabajo el proyecto sigue en proceso', modelo.estadoDeProyecto(base.leer('creatorProjects/proj_ana_1')) === 'en_proceso');
check('2c) CONTROL · editar no crea creaciones', deCuenta(ANA).length === 0);

/* ── 3 · finalizar → en creaciones ────────────────────────────────────── */
console.log('\n── 3 · finalizar ──');
const assetsAntes = JSON.stringify(base.de('assets'));
const proyectoAntes = JSON.stringify(base.leer('creatorProjects/proj_ana_1'));
const f1 = await C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_b', 'asset_ana_a'], requestId: 'req-ana-0001' }, deps);
const c1 = base.leer(`creations/${f1.creacionId}`);
check('3) finalizar crea UNA creación final de la cuenta', !f1.yaExistia && c1?.status === 'final' && c1.ownerAccountId === ANA && deCuenta(ANA).length === 1);
check('3b) referencia los assets por id, ordenados (no copia bytes ni crea assets)', JSON.stringify(c1.assetIds) === '["asset_ana_a","asset_ana_b"]' && JSON.stringify(base.de('assets')) === assetsAntes);
check('3c) el proyecto de origen sale del trabajo del asset', c1.proyectoOrigenId === 'proj_ana_1');
check('3d) finalizar NO toca el proyecto', JSON.stringify(base.leer('creatorProjects/proj_ana_1')) === proyectoAntes);
check('3e) nombre, tipo, herramienta y ubicación salen del asset canónico', c1.nombre === 'Logo' && c1.tipo === 'image' && c1.herramienta === 'design' && c1.ubicacion === 'wee_cloud');
const sinTrabajo = await C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_c'], requestId: 'req-ana-0009', nombre: '  Póster  ' }, deps);
check('3f) CONTROL · un asset sin trabajo da una creación sin proyecto de origen, con el nombre que eligió la persona',
  base.leer(`creations/${sinTrabajo.creacionId}`).proyectoOrigenId === null && base.leer(`creations/${sinTrabajo.creacionId}`).nombre === 'Póster');

/* ── 4 · finalizar dos veces no duplica ───────────────────────────────── */
console.log('\n── 4 · idempotencia ──');
const f2 = await C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_a', 'asset_ana_b'], requestId: 'req-ana-0001' }, deps);
check('4) mismo requestId → la misma creación, yaExistia', f2.yaExistia && f2.creacionId === f1.creacionId && deCuenta(ANA).length === 2);
const f3 = await C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_a', 'asset_ana_b', 'asset_ana_a'], requestId: 'req-ana-0002' }, deps);
check('4b) mismo conjunto con otro requestId (y repetidos) → la misma', f3.yaExistia && f3.creacionId === f1.creacionId && deCuenta(ANA).length === 2);
const choque = await intento(() => C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_a'], requestId: 'req-ana-0001' }, deps));
check('4c) el mismo requestId para OTRO conjunto es un conflicto, no una segunda creación', !choque.ok && choque.error.code === 'conflicto' && deCuenta(ANA).length === 2);
const [p1, p2] = await Promise.all([
  C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_a'], requestId: 'req-ana-0003' }, deps),
  C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_a'], requestId: 'req-ana-0003' }, deps),
]);
check('4d) dos finalizar a la vez con la misma petición dan una sola creación', p1.creacionId === p2.creacionId && [p1.yaExistia, p2.yaExistia].filter(Boolean).length === 1 && deCuenta(ANA).length === 3);
check('4e) CONTROL · los assets siguen siendo exactamente los mismos (ni uno más)', JSON.stringify(base.de('assets')) === assetsAntes);

/* ── 5 · reabrir conserva la relación ─────────────────────────────────── */
console.log('\n── 5 · reabrir ──');
const r1 = await C.reabrirCreacionDeCuenta(ANA, f1.creacionId, deps);
check('5) reabrir abre el proyecto de origen, sin crear otro', r1.proyectoId === 'proj_ana_1' && r1.nuevo === false && base.de('creatorProjects').length === 2);
check('5b) y la creación sigue final, con su relación', base.leer(`creations/${f1.creacionId}`).status === 'final' && base.leer(`creations/${f1.creacionId}`).proyectoOrigenId === 'proj_ana_1');
base.docs.set('creatorProjects/proj_ana_1', { ...base.leer('creatorProjects/proj_ana_1'), archivedAt: 5 });
const r2 = await C.reabrirCreacionDeCuenta(ANA, f1.creacionId, deps);
check('5c) reabrir con el proyecto archivado lo desarchiva', r2.proyectoId === 'proj_ana_1' && !r2.nuevo && base.leer('creatorProjects/proj_ana_1').archivedAt === null);

/* ── 6 · eliminar la creación no borra el proyecto ────────────────────── */
console.log('\n── 6 · eliminar creación ──');
const e1 = await C.eliminarCreacionDeCuenta(ANA, f1.creacionId, deps);
check('6) eliminar la creación la marca eliminada', !e1.yaEstaba && base.leer(`creations/${f1.creacionId}`).status === 'eliminada');
check('6b) el proyecto sigue ahí', !!base.leer('creatorProjects/proj_ana_1'));
check('6c) y ningún asset se ha retirado (pueden estar en otra creación)', base.leer('assets/asset_ana_a').status === 'ready' && base.leer('assets/asset_ana_b').status === 'ready' && JSON.stringify(base.de('assets')) === assetsAntes);
check('6d) asset_ana_a sigue en otra creación viva', deCuenta(ANA).some((c) => c.status === 'final' && c.assetIds.includes('asset_ana_a')));
const e2 = await C.eliminarCreacionDeCuenta(ANA, f1.creacionId, deps);
check('6e) eliminar dos veces es idempotente', e2.yaEstaba);
const rEl = await intento(() => C.reabrirCreacionDeCuenta(ANA, f1.creacionId, deps));
check('6f) CONTROL · una creación eliminada no se reabre', !rEl.ok && rEl.error.code === 'no_encontrado');
const rev = await C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_a', 'asset_ana_b'], requestId: 'req-ana-0004' }, deps);
check('6g) volver a finalizar lo mismo la revive con el mismo id', rev.creacionId === f1.creacionId && !rev.yaExistia && base.leer(`creations/${f1.creacionId}`).status === 'final');

/* ── 7 · borrar / archivar el proyecto no rompe la creación ───────────── */
console.log('\n── 7 · borrar el proyecto ──');
base.docs.delete('creatorProjects/proj_ana_1');
check('7) con el proyecto borrado, la creación sigue final', base.leer(`creations/${f1.creacionId}`).status === 'final');
const r3 = await C.reabrirCreacionDeCuenta(ANA, f1.creacionId, deps);
const vinc = `reab_${f1.creacionId}`;
check('7b) reabrir crea un proyecto vinculado de la cuenta', r3.nuevo && r3.proyectoId === vinc && base.leer(`creatorProjects/${vinc}`)?.userId === ANA && base.leer(`creatorProjects/${vinc}`).reabiertoDeCreacionId === f1.creacionId);
check('7c) la creación apunta al vinculado y recuerda el de origen', base.leer(`creations/${f1.creacionId}`).proyectoOrigenId === vinc && base.leer(`creations/${f1.creacionId}`).proyectoOrigenInicialId === 'proj_ana_1');
check('7d) los trabajos que apuntaban al proyecto borrado pasan al vinculado', base.leer('creatorJobs/job_ana_1').projectId === vinc);
check('7e) CONTROL · un trabajo que no es de la creación no se mueve', base.leer('creatorJobs/job_ana_2').projectId === 'proj_ana_1');
const r4 = await C.reabrirCreacionDeCuenta(ANA, f1.creacionId, deps);
check('7f) reabrir otra vez reutiliza el vinculado (no crea dos)', !r4.nuevo && r4.proyectoId === vinc && base.de('creatorProjects').filter((p) => p.userId === ANA).length === 1);

/* ── 8 · aislamiento por cuenta ───────────────────────────────────────── */
console.log('\n── 8 · aislamiento ──');
const ajeno = await intento(() => C.finalizarCreacionDeCuenta(BETO, { assetIds: ['asset_ana_a'], requestId: 'req-beto-001' }, deps));
check('8) Beto no puede finalizar un asset de Ana (como si no existiera)', !ajeno.ok && ajeno.error.code === 'no_encontrado' && deCuenta(BETO).length === 0);
const mezcla = await intento(() => C.finalizarCreacionDeCuenta(BETO, { assetIds: ['asset_beto_a', 'asset_ana_a'], requestId: 'req-beto-002' }, deps));
check('8b) ni mezclándolo con uno suyo', !mezcla.ok && mezcla.error.code === 'no_encontrado');
const reabAjeno = await intento(() => C.reabrirCreacionDeCuenta(BETO, f1.creacionId, deps));
const elimAjeno = await intento(() => C.eliminarCreacionDeCuenta(BETO, f1.creacionId, deps));
check('8c) Beto no reabre ni elimina una creación de Ana', !reabAjeno.ok && reabAjeno.error.code === 'no_encontrado' && !elimAjeno.ok && elimAjeno.error.code === 'no_encontrado' && base.leer(`creations/${f1.creacionId}`).status === 'final');
const proyAjeno = await intento(() => C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_b'], proyectoOrigenId: 'proj_beto_1', requestId: 'req-ana-0005' }, deps));
check('8d) Ana no puede colgar su creación del proyecto de Beto', !proyAjeno.ok && proyAjeno.error.code === 'no_encontrado');
const propio = await C.finalizarCreacionDeCuenta(BETO, { assetIds: ['asset_beto_a'], requestId: 'req-beto-003' }, deps);
check('8e) CONTROL · Beto sí finaliza lo suyo, y cada cuenta ve solo lo suyo', !!propio.creacionId && deCuenta(BETO).length === 1 && deCuenta(ANA).every((c) => c.ownerAccountId === ANA));
check('8f) mismo conjunto en cuentas distintas no colisiona (el id lleva la cuenta)', C.idDeCreacion(ANA, ['x_1234']) !== C.idDeCreacion(BETO, ['x_1234']));
base.docs.set('assets/asset_ana_d', ficha('asset_ana_d', ANA, { status: 'deleted' }));
const retirado = await intento(() => C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_d'], requestId: 'req-ana-0006' }, deps));
check('8g) un asset retirado no se finaliza', !retirado.ok && retirado.error.code === 'no_encontrado');
const malo = await intento(() => C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_a'], requestId: 'x' }, deps));
check('8h) un requestId mal formado es inválido', !malo.ok && malo.error.code === 'invalido');

/* ── 9 · publicar no finaliza ni mueve, y nada privado va al Wäll ─────── */
console.log('\n── 9 · publicar ──');
const antesPub = JSON.stringify(base.de('creations'));
base.docs.set('posts/post_ana_1', { userId: ANA, imageUrls: ['https://x.invalid/a.png'], content: 'hola' });
check('9) publicar (un post) no crea ni cambia creaciones', JSON.stringify(base.de('creations')) === antesPub);
const srcC = leer('functions/src/content/creaciones.ts');
check("9b) el dominio de creaciones no escribe en `posts` (no llega al Wäll ni a Weëls)", !/collection\(['"]posts['"]\)/.test(srcC) && !/'posts'/.test(srcC.replace(/\/\*[\s\S]*?\*\//g, '')));
check('9c) y lo que publica no conoce las creaciones', !/creations|cicloDeTrabajo/.test(leer('services/firestoreService.ts')));
const reglas = leer('firestore.rules');
check('9d) reglas: `creations` solo la lee su dueño y el cliente no escribe', /match \/creations\/\{creationId\} \{\s*allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid;\s*allow create, update, delete: if false;/.test(reglas));

const bloqueJobs = reglas.slice(reglas.indexOf('match /creatorJobs/{jobId}'), reglas.indexOf('match /capabilities/{capabilityId}'));
check('9e) reglas: mover un trabajo solo a un proyecto de la MISMA cuenta (o sacarlo)', /hasOnly\(\['projectId', 'updatedAt'\]\)/.test(bloqueJobs)
  && bloqueJobs.includes('get(/databases/$(database)/documents/creatorProjects/$(request.resource.data.projectId)).data.userId == request.auth.uid')
  && bloqueJobs.includes('request.resource.data.projectId == null'));
check('9e-c) CONTROL · la cerradura antigua sigue (el cliente solo toca projectId y updatedAt; ni crea ni borra)', /allow create, delete: if false/.test(bloqueJobs));
const ps = leer('services/projectsService.ts');
check('9f) borrar un proyecto suelta sus trabajos en el mismo lote (no deja projectId colgando)', /remove:[\s\S]*?writeBatch\(db\)[\s\S]*?projectId: deleteField\(\)[\s\S]*?lote\.delete\(proyecto\.ref\)/.test(ps));
check('9g) mover un trabajo es atómico (un lote)', /assignJob:[\s\S]*?writeBatch\(db\)[\s\S]*?lote\.commit\(\)/.test(ps));
const cdt = leer('services/cicloDeTrabajo.ts');
const listar = cdt.slice(cdt.indexOf('export async function listarProyectosEnCurso'), cdt.indexOf('export async function listarCreacionesFinales'));
check('9h) Mis proyectos filtra los archivados ANTES de limitar y cuenta exacto', /listAll\(uid\)\)\s*\.filter\([\s\S]*?\)\s*\.slice\(0, PROYECTOS_EN_CURSO_MAXIMO\)/.test(listar) && /getCountFromServer/.test(listar));
check('9i) y no usa el campo `demo` del trabajo', !/\bdemo\b/.test(listar.replace(/\/\*[\s\S]*?\*\//g, '')));

/* ── 10 · el callable ─────────────────────────────────────────────────── */
console.log('\n── 10 · callable ──');
const sinSesion = await intento(() => C.cicloDeTrabajo.run({ data: { accion: 'finalizar' } }));
check('10) sin sesión: unauthenticated', !sinSesion.ok && sinSesion.error.code === 'unauthenticated');
const raro = await intento(() => C.cicloDeTrabajo.run({ auth: { uid: ANA }, data: { accion: 'otra' } }));
check('10b) acción desconocida: invalid-argument con details.code', !raro.ok && raro.error.code === 'invalid-argument' && raro.error.details?.code === 'invalido');
const viaCall = await intento(() => C.cicloDeTrabajo.run({ auth: { uid: BETO }, data: { accion: 'reabrir', creacionId: f1.creacionId } }));
check('10c) por el callable, lo ajeno es not-found con la frase catalogada', !viaCall.ok && viaCall.error.code === 'not-found' && viaCall.error.message === 'No encontramos esa creación.' && viaCall.error.details?.code === 'no_encontrado');
/* Por el callable lee el Content Core de verdad (`leerMaterial`), que solo acepta ids con forma `asset_<32 hex>`. */
const REAL_ANA = 'asset_' + 'a'.repeat(32);
const REAL_BETO = 'asset_' + 'b'.repeat(32);
base.docs.set(`assets/${REAL_ANA}`, ficha(REAL_ANA, ANA));
base.docs.set(`assets/${REAL_BETO}`, ficha(REAL_BETO, BETO));
const okCall = await intento(() => C.cicloDeTrabajo.run({ auth: { uid: ANA }, data: { accion: 'finalizar', assetIds: [REAL_ANA], requestId: 'req-ana-0007' } }));
check('10d) CONTROL · por el callable, lo propio funciona (la cuenta la pone la sesión)', okCall.ok && !!okCall.valor.creacionId && base.leer(`creations/${okCall.valor.creacionId}`).ownerAccountId === ANA);
const suplantar = await intento(() => C.cicloDeTrabajo.run({ auth: { uid: BETO }, data: { accion: 'finalizar', assetIds: [REAL_ANA], requestId: 'req-beto-009', ownerAccountId: ANA } }));
check('10e) mandar otra cuenta en los datos no sirve de nada', !suplantar.ok && suplantar.error.code === 'not-found');

const cruzado = await intento(() => C.cicloDeTrabajo.run({ auth: { uid: ANA }, data: { accion: 'finalizar', assetIds: [REAL_BETO], requestId: 'req-ana-0008' } }));
check('10f) por el callable, Ana no finaliza un asset real de Beto', !cruzado.ok && cruzado.error.code === 'not-found' && deCuenta(ANA).every((c) => !c.assetIds.includes(REAL_BETO)));

/* ── 11 · estado de despliegue ────────────────────────────────────────── */
/* ── 12 · D-3 · texto final como asset ─────────────────────────────────── */
console.log('\n── 12 · D-3 · texto final ──');
/* El Content Core crea la ficha de texto con `create` (solo si no existe): la base en memoria lo aprende aquí. */
Object.getPrototypeOf(base.doc('x/y')).create = async function create(data) {
  if (this.base.docs.has(this.path)) { const e = new Error('ya existe'); e.code = 6; throw e; }
  this.base.docs.set(this.path, JSON.parse(JSON.stringify(data)));
};
base.docs.set('creatorProjects/proj_ana_chef', { userId: ANA, name: 'Cenas', emoji: '📁', createdAt: 1, updatedAt: 1 });
const receta = 'Pollo al horno\n1. Precalienta a 200 °C.\n2. Hornea 45 min.';
const assetsAntesTexto = base.de('assets').length;
const t1 = await C.guardarTextoFinalDeCuenta(ANA, { texto: receta, herramienta: 'chef', proyectoOrigenId: 'proj_ana_chef', requestId: 'req-texto-0001', nombre: 'Pollo al horno' }, deps);
const fichaTexto = base.leer(`assets/${t1.assetId}`);
check('12) guardar un texto final crea UN asset de texto de la cuenta, con fecha, procedencia y herramienta',
  !t1.yaExistia && fichaTexto?.kind === 'text' && fichaTexto.ownerAccountId === ANA && fichaTexto.contenido === receta
  && fichaTexto.provenance?.requestId === 'req-texto-0001' && fichaTexto.metadata?.experienceId === 'chef' && Number.isFinite(fichaTexto.createdAt)
  && base.de('assets').length === assetsAntesTexto + 1);
const cTexto = base.leer(`creations/${t1.creacionId}`);
check('12b) y su creación final, vinculada al proyecto, en Weë Cloud (no «local»)',
  cTexto?.status === 'final' && JSON.stringify(cTexto.assetIds) === JSON.stringify([t1.assetId]) && cTexto.proyectoOrigenId === 'proj_ana_chef'
  && cTexto.tipo === 'text' && cTexto.herramienta === 'chef' && cTexto.ubicacion === 'wee_cloud' && cTexto.nombre === 'Pollo al horno');
const t2 = await C.guardarTextoFinalDeCuenta(ANA, { texto: receta, herramienta: 'chef', proyectoOrigenId: 'proj_ana_chef', requestId: 'req-texto-0001', nombre: 'Pollo al horno' }, deps);
check('12c) repetir la misma petición no duplica ni el asset ni la creación', t2.yaExistia && t2.assetId === t1.assetId && t2.creacionId === t1.creacionId && base.de('assets').length === assetsAntesTexto + 1);
const t3 = await intento(() => C.guardarTextoFinalDeCuenta(ANA, { texto: 'Otra receta', herramienta: 'chef', requestId: 'req-texto-0001' }, deps));
check('12d) la misma petición con OTRO texto es conflicto (no pisa el guardado)', !t3.ok && t3.error.code === 'conflicto' && base.leer(`assets/${t1.assetId}`).contenido === receta);
const t4 = await intento(() => C.guardarTextoFinalDeCuenta(ANA, { texto: receta, herramienta: 'chef', proyectoOrigenId: 'proj_beto_1', requestId: 'req-texto-0002' }, deps));
check('12e) no se cuelga del proyecto de otra cuenta', !t4.ok && t4.error.code === 'no_encontrado' && !base.leer(`assets/${C.idDeTextoFinal(ANA, 'req-texto-0002')}`));
const t5 = await intento(() => C.guardarTextoFinalDeCuenta(ANA, { texto: '   ', herramienta: 'chef', requestId: 'req-texto-0003' }, deps));
const t6 = await intento(() => C.guardarTextoFinalDeCuenta(ANA, { texto: 'x'.repeat(C.MAXIMO_DE_TEXTO_FINAL + 1), herramienta: 'chef', requestId: 'req-texto-0004' }, deps));
check('12f) CONTROL · un texto vacío o desmesurado no se guarda', !t5.ok && t5.error.code === 'invalido' && !t6.ok && t6.error.code === 'invalido');
check('12g) mismo requestId en dos cuentas = dos assets distintos', C.idDeTextoFinal(ANA, 'r') !== C.idDeTextoFinal(BETO, 'r'));
const genera = leer('functions/src/creator/index.ts') + leer('functions/src/creator/brain.ts') + leer('functions/src/runtime/index.ts');
check('12h) NINGÚN camino de generación guarda textos finales: solo la decisión de la persona (callable)', !/guardarTextoFinal/.test(genera));
const viaTexto = await intento(() => C.cicloDeTrabajo.run({ auth: { uid: BETO }, data: { accion: 'guardarTexto', texto: 'Itinerario', herramienta: 'travel', requestId: 'req-texto-beto1' } }));
check('12i) por el callable, la cuenta la pone la sesión', viaTexto.ok && base.leer(`assets/${viaTexto.valor.assetId}`)?.ownerAccountId === BETO && base.leer(`creations/${viaTexto.valor.creacionId}`)?.ownerAccountId === BETO);

/* ── 13 · D-5 · borrar un asset con su impacto ─────────────────────────── */
console.log('\n── 13 · D-5 · borrar un asset ──');
const retiradas = [];
const depsBorrar = { ...deps, retirar: async (cuenta, id) => { retiradas.push(id); const f = base.leer(`assets/${id}`); base.docs.set(`assets/${id}`, { ...f, status: 'deleted' }); return { status: 'retirado', asset: f, objetosBorrados: 0, pendientes: 1 }; } };
base.docs.set('assets/asset_ana_x', ficha('asset_ana_x', ANA, { provenance: { createdAt: 1 } }));
base.docs.set('assets/asset_ana_y', ficha('asset_ana_y', ANA, { provenance: { createdAt: 1 } }));
const par = await C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_x', 'asset_ana_y'], requestId: 'req-borrar-01' }, deps);
const solo = await C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_x'], requestId: 'req-borrar-02' }, deps);
const imp = await C.impactoDeBorrarAsset(ANA, 'asset_ana_x', deps);
check('13) el impacto dice qué creaciones lo pierden y cuál queda vacía, sin cambiar nada',
  imp.irreversible === true && imp.requiereConfirmacion === true && imp.creaciones.length === 2
  && imp.creaciones.find((c) => c.creacionId === par.creacionId)?.quedaVacia === false && imp.creaciones.find((c) => c.creacionId === solo.creacionId)?.quedaVacia === true
  && base.leer('assets/asset_ana_x').status === 'ready' && base.leer(`creations/${par.creacionId}`).status === 'final');
const sinConfirmar = await C.borrarAssetDeCuenta(ANA, 'asset_ana_x', undefined, depsBorrar);
check('13b) sin confirmar no se borra nada: devuelve el impacto', sinConfirmar.hecho === false && sinConfirmar.necesitaConfirmacion && retiradas.length === 0 && base.leer('assets/asset_ana_x').status === 'ready');
const conTexto = await C.borrarAssetDeCuenta(ANA, 'asset_ana_x', 'true', depsBorrar);
check('13c) CONTROL · «confirmar» tiene que ser true de verdad, no algo que lo parezca', conTexto.hecho === false && retiradas.length === 0);
const hecho = await C.borrarAssetDeCuenta(ANA, 'asset_ana_x', true, depsBorrar);
const nuevaPar = hecho.sustituciones[par.creacionId];
check('13d) con confirmación: la creación con dos assets NO se borra entera — sigue viva con el otro', hecho.hecho && !!nuevaPar
  && base.leer(`creations/${nuevaPar}`)?.status === 'final' && JSON.stringify(base.leer(`creations/${nuevaPar}`).assetIds) === '["asset_ana_y"]'
  && base.leer('assets/asset_ana_y').status === 'ready');
check('13e) la que solo tenía ese asset queda eliminada (no hay creaciones vacías)', hecho.sustituciones[solo.creacionId] === null && base.leer(`creations/${solo.creacionId}`).status === 'eliminada');
check('13f) ninguna creación final apunta al asset retirado (sin referencias rotas)', base.de('creations').filter((c) => c.status === 'final').every((c) => !c.assetIds.includes('asset_ana_x')) && retiradas.join() === 'asset_ana_x');
check('13g) la nueva sigue el id de su conjunto: finalizar lo que quedó devuelve esa, sin duplicar', nuevaPar === C.idDeCreacion(ANA, ['asset_ana_y'])
  && (await C.finalizarCreacionDeCuenta(ANA, { assetIds: ['asset_ana_y'], requestId: 'req-borrar-03' }, deps)).creacionId === nuevaPar);
check('13h) y la anterior recuerda por cuál la sustituyeron', base.leer(`creations/${par.creacionId}`).sustituidaPor === nuevaPar && base.leer(`creations/${par.creacionId}`).status === 'eliminada');
base.docs.set('assets/asset_ana_z', ficha('asset_ana_z', ANA, { provenance: { createdAt: 1 } }));
base.docs.set('elements/el_ana_1', { ownerAccountId: ANA, status: 'active', refs: [{ assetId: 'asset_ana_z', role: 'reference', kind: 'image' }] });
base.docs.set('assets/asset_ana_w', ficha('asset_ana_w', ANA, { provenance: { createdAt: 1 } }));
base.docs.set('shots/shot_ana_1', { ownerAccountId: ANA, producedAssetId: 'asset_ana_w' });
const bloqEl = await intento(() => C.borrarAssetDeCuenta(ANA, 'asset_ana_z', true, depsBorrar));
const bloqPl = await intento(() => C.borrarAssetDeCuenta(ANA, 'asset_ana_w', true, depsBorrar));
check('13i) lo que un Element o un plano referencia se conserva: el borrado se bloquea aunque se confirme',
  !bloqEl.ok && bloqEl.error.code === 'referenciado' && bloqEl.error.detalle?.bloqueos?.[0]?.tipo === 'elemento'
  && !bloqPl.ok && bloqPl.error.code === 'referenciado' && bloqPl.error.detalle?.bloqueos?.[0]?.tipo === 'plano'
  && !retiradas.includes('asset_ana_z') && !retiradas.includes('asset_ana_w'));
base.docs.set('elements/el_beto_1', { ownerAccountId: BETO, status: 'active', refs: [{ assetId: 'asset_ana_y', role: 'reference', kind: 'image' }] });
const impY = await C.impactoDeBorrarAsset(ANA, 'asset_ana_y', deps);
check('13j) CONTROL · un Element de OTRA cuenta no cuenta (ni se ve)', impY.bloqueos.length === 0);
const ajenoB = await intento(() => C.borrarAssetDeCuenta(BETO, 'asset_ana_y', true, depsBorrar));
check('13k) Beto no puede borrar ni ver el impacto de un asset de Ana', !ajenoB.ok && ajenoB.error.code === 'no_encontrado' && base.leer('assets/asset_ana_y').status === 'ready');
/* Por el callable lee el Content Core de verdad: id con forma `asset_<32 hex>`. */
const REAL_Z = 'asset_' + 'c'.repeat(32);
base.docs.set(`assets/${REAL_Z}`, ficha(REAL_Z, ANA, { provenance: { createdAt: 1 } }));
base.docs.set('elements/el_ana_2', { ownerAccountId: ANA, status: 'active', refs: [{ assetId: REAL_Z, role: 'reference', kind: 'image' }] });
const viaRef = await intento(() => C.cicloDeTrabajo.run({ auth: { uid: ANA }, data: { accion: 'borrarAsset', assetId: REAL_Z, confirmar: true } }));
check('13l) por el callable, el bloqueo llega como failed-precondition con el impacto en details', !viaRef.ok && viaRef.error.code === 'failed-precondition' && viaRef.error.details?.code === 'referenciado' && viaRef.error.details?.impacto?.bloqueos?.length === 1);

console.log('\n── 11 · despliegue ──');
check('11) D-2 · el callable está conectado en el índice (autorizado por el dueño, 2026-10-12)', /export \{ cicloDeTrabajo \} from '\.\/content\/creaciones';/.test(leer('functions/src/index.ts')) && typeof lib('index.js').cicloDeTrabajo?.run === 'function');
check('11-c) y NO se despliega: está en no_se_despliegan', JSON.parse(leer('ops/despliegue/grupos.json')).no_se_despliegan.some((x) => x.funcion === 'cicloDeTrabajo')
  && !JSON.parse(leer('ops/despliegue/grupos.json')).grupos.some((g) => g.funciones.includes('cicloDeTrabajo')));
check('11b) y content/index.ts no carga creaciones (el grafo de deleteAsset no cambia)', !/from '\.\/creaciones/.test(leer('functions/src/content/index.ts')));

deshacer();
console.log(failures === 0 ? '\nOK pc-dominio-ciclo' : `\n${failures} fallo(s) en pc-dominio-ciclo`);
process.exit(failures === 0 ? 0 : 1);
