/**
 * GRAN MOTOR · PAQUETE G — FILMMAKER ENGINE Y EXPERIENCIAS SOBRE EL MISMO CORE.
 *
 * Qué mide (todo sin red, sin proveedores, sin dinero real y sin tocar ninguna puerta):
 *   A · las CONEXIONES del Filmmaker con el resto del Gran Motor, seguidas por el código compilado: quién importa a
 *       quién, quién las llama desde un flujo real y qué NO está conectado (y por eso no se declara integrado);
 *   B · el CICLO de una toma —enlace verificado, firma, reservas, material— con una base en memoria;
 *   C · `shots`: dos ediciones a la vez no se pisan (defecto G-1, demostrado y corregido aquí);
 *   D · lo que está FIJADO tal cual es y es decisión del dueño (G-2…G-5): se documenta con una aserción que se
 *       rompe si alguien lo cambia sin decidirlo;
 *   E · la MATRIZ de experiencias: qué capacidades pide cada plantilla, cuáles son enrutables hoy y por qué camino
 *       corre cada una (Legacy `creatorRun`, o las dos puertas canary del Core, cerradas).
 *
 * Usa el compilado: `npm run build` antes. Documentos: docs/GRAN-MOTOR-G-FILMMAKER.md y docs/GRAN-MOTOR-G-EXPERIENCIAS.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseEnMemoria, instalarLaBase, lib } from './_firestore-en-memoria.mjs';
import { todosLosPlanes } from './_planes.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../..');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const src = (p) => sinComentarios(leer(p));

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ` — ${extra}` : ''));
  if (!cond) fallos++;
};

/* Una base en memoria con `create`, que es lo que usan las escenas y los planos (la de prueba no lo trae). */
const nuevaBase = () => {
  const b = new BaseEnMemoria();
  const R = Object.getPrototypeOf(b.doc('a/b'));
  if (!R.create) R.create = async function crear(d) { if (this.base.docs.has(this.path)) throw new Error('already-exists'); return this.set(d); };
  return b;
};
const base = nuevaBase();
instalarLaBase(() => base);

const sh = lib('shots/index.js');
const toma = lib('creator/toma.js');
const { usageTransactionId } = lib('credits/creditTransactions.js');

const A = 'cuentaA0000001';
const B = 'cuentaB0000001';
const T0 = 1_800_000_000_000;
const deps = { db: base };

/* ═══ C · shots: dos ediciones a la vez no se pisan ═══════════════════════════ */
console.log('── C · shots: escribir un plano o una escena es leer-y-escribir, y tiene que ser una transacción ──');
{
  await sh.crearEscena({ accountId: A, sceneId: 'esc-c1', projectId: 'proy-c1', order: 0, at: T0 }, deps);
  await sh.crearPlano({ accountId: A, shotId: 'pl-c1', projectId: 'proy-c1', sceneId: 'esc-c1', order: 0, at: T0 }, deps);

  const v0 = (await sh.leerPlano(A, 'pl-c1', deps)).version;
  const [r1, r2] = await Promise.all([
    sh.actualizarPlano(A, 'pl-c1', { narrative: 'cambio uno', at: T0 + 1 }, deps),
    sh.actualizarPlano(A, 'pl-c1', { order: 5, at: T0 + 2 }, deps),
  ]);
  const p = await sh.leerPlano(A, 'pl-c1', deps);
  check('G-1) dos ediciones del mismo plano a la vez: las dos quedan (ninguna se pierde en silencio)',
    r1.status === 'actualizado' && r2.status === 'actualizado' && p.narrative === 'cambio uno' && p.order === 5,
    `narrative=${p.narrative} order=${p.order}`);
  check('G-1) y la versión cuenta las dos escrituras: v+2', p.version === v0 + 2, `${v0} → ${p.version}`);

  /* Estado: desde `ready`, a `draft` y a `generated` a la vez. Una gana; la otra se evalúa contra lo que dejó la primera. */
  await sh.actualizarPlano(A, 'pl-c1', { state: 'ready', at: T0 + 3 }, deps);
  const [s1, s2] = await Promise.all([
    sh.actualizarPlano(A, 'pl-c1', { state: 'draft', at: T0 + 4 }, deps),
    sh.actualizarPlano(A, 'pl-c1', { state: 'generated', at: T0 + 5 }, deps),
  ]);
  const estados = [s1.status, s2.status].sort();
  const fin = await sh.leerPlano(A, 'pl-c1', deps);
  check('G-1) dos cambios de estado incompatibles a la vez: UNO se aplica y el otro se rechaza como transición inválida, no los dos',
    estados[0] === 'actualizado' && estados[1] === 'transicion_invalida' && fin.state === 'draft', `${s1.status}/${s2.status} → ${fin.state}`);

  const e0 = (await sh.leerEscena(A, 'esc-c1', deps)).version;
  const [e1, e2] = await Promise.all([
    sh.actualizarEscena(A, 'esc-c1', { name: 'Playa', at: T0 + 6 }, deps),
    sh.actualizarEscena(A, 'esc-c1', { narrative: 'amanece', at: T0 + 7 }, deps),
  ]);
  const esc = await sh.leerEscena(A, 'esc-c1', deps);
  check('G-1) y lo mismo con la escena: nombre y narrativa a la vez, las dos quedan y la versión sube dos',
    e1.status === 'actualizado' && e2.status === 'actualizado' && esc.name === 'Playa' && esc.narrative === 'amanece' && esc.version === e0 + 2,
    `name=${esc.name} narrative=${esc.narrative} v=${e0}→${esc.version}`);

  /* Lo de siempre sigue igual en solitario. */
  const ajeno = await sh.actualizarPlano(B, 'pl-c1', { order: 1, at: T0 + 8 }, deps);
  check('G-1) CONTROL · lo ajeno sigue contestando como lo inexistente', ajeno.status === 'no_encontrado');
  const inexistente = await sh.actualizarPlano(A, 'no-existe-1', { order: 1, at: T0 + 8 }, deps);
  check('G-1) CONTROL · lo que no existe, también', inexistente.status === 'no_encontrado');
  const mal = await sh.actualizarPlano(A, 'pl-c1', { order: -3, at: T0 + 9 }, deps);
  check('G-1) CONTROL · un valor inválido sigue siendo inválido y no escribe', mal.status === 'invalido' && (await sh.leerPlano(A, 'pl-c1', deps)).order === 5);
  const ref = await sh.actualizarPlano(A, 'pl-c1', { elements: [{ elementId: 'el_no_existe_1', version: 1 }], at: T0 + 10 }, deps);
  check('G-1) CONTROL · una referencia a algo inexistente sigue rechazándose', ref.status === 'referencia_rechazada');
}

/* ═══ A · las conexiones del Filmmaker, seguidas por el código ════════════════ */
console.log('\n── A · Quién importa a quién: lo que está conectado y lo que NO ──');
const ficheros = [];
const recorrer = (d) => { for (const f of fs.readdirSync(path.resolve(RAIZ, d), { withFileTypes: true })) { const r = `${d}/${f.name}`; f.isDirectory() ? recorrer(r) : r.endsWith('.ts') && ficheros.push(r); } };
recorrer('functions/src');
const importaciones = (rel) => [...leer(rel).matchAll(/from '((?:\.\.?\/)+[^']*)'/g)]
  .map((m) => path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
const quienImporta = (modulo) => ficheros.filter((f) => !f.startsWith(`functions/src/${modulo}/`)
  && importaciones(f).some((a) => a === `functions/src/${modulo}` || a.startsWith(`functions/src/${modulo}/`))).sort();
const aQuienUsa = (modulo) => [...new Set(ficheros.filter((f) => f.startsWith(`functions/src/${modulo}/`))
  .flatMap(importaciones).map((a) => a.replace('functions/src/', '').split('/')[0]))].filter((x) => x !== modulo).sort();
const J = JSON.stringify;
{
  check('A1) el dominio del Filmmaker (filmmaker/*) lo importa SOLO productions/index.ts: es un modelo puro, no un servicio',
    J(quienImporta('filmmaker')) === J(['functions/src/productions/index.ts']), quienImporta('filmmaker').join(', '));
  check('A2) productions lo importa solo la raíz de Functions (su callable); nadie más lo llama desde dentro',
    J(quienImporta('productions')) === J(['functions/src/index.ts']), quienImporta('productions').join(', '));
  check('A3) shots lo usan creator/toma.ts (el enlace verificado) y la raíz; y elements lo usan Brain, las referencias del Gateway, shots y la raíz',
    J(quienImporta('shots')) === J(['functions/src/creator/toma.ts', 'functions/src/index.ts'])
    && J(quienImporta('elements')) === J(['functions/src/creator/brain.ts', 'functions/src/engine/referencias-de-wee.ts', 'functions/src/index.ts', 'functions/src/shots/index.ts']),
    `${quienImporta('shots').join(', ')} | ${quienImporta('elements').join(', ')}`);
  const motores = ['planner', 'workflow', 'orchestrator', 'job', 'runtime', 'router', 'engine', 'credits', 'gateway', 'brain', 'creator'];
  const usosProhibidos = ['filmmaker', 'productions', 'elements'].map((m) => [m, aQuienUsa(m).filter((x) => motores.includes(x))]);
  check('A4) ni el dominio, ni productions, ni elements importan Planner, Workflow, Orchestrator, Job Engine, Runtime, Router, Engine, Credits ni Brain',
    usosProhibidos.every(([, u]) => u.length === 0), usosProhibidos.map(([m, u]) => `${m}:[${u}]`).join(' '));
  check('A5) shots solo toca el motor por UN lado —creator/toma, que a su vez es de F1-D— y no importa Planner, Workflow, Job, Runtime ni Credits',
    J(aQuienUsa('shots').filter((x) => motores.includes(x))) === J(['creator']), aQuienUsa('shots').join(', '));
  check('A6) los Skills (skills/) no los importa nadie: el catálogo está vacío y no hay consumidor',
    quienImporta('skills').length === 0 && lib('skills/index.js').CATALOGO_DE_SKILLS.length === 0);
  const llamaAMotores = /videoEngine|engine\.generate|conductorDeWee|pedirMedio|crearConductor|creditEngine|spendCredits|crearMotorDeTrabajosDeWee|crearPlanner|crearBrainDeWee|ADAPTERS/;
  check('A7) ningún archivo del Filmmaker (filmmaker, productions, shots, elements) genera, cobra, planifica ni piensa: guardan y devuelven estado',
    ficheros.filter((f) => /^functions\/src\/(filmmaker|productions|shots|elements)\//.test(f)).every((f) => !llamaAMotores.test(sinComentarios(leer(f)))));
}

console.log('\n── A · La única ruta de generación del Filmmaker: generateVideo → conductor del Core (puerta cerrada) ──');
{
  const video = leer('functions/src/creator/video.ts');
  check('A8) una toma de un plano SOLO va por el Core: sin él se rechaza con route_unavailable, no se desvía al camino de siempre',
    /deToma && !porElCore/.test(video) && /'route_unavailable'/.test(video));
  check('A9) la puerta del vídeo declara en su propio código la única capacidad que puede abrir: video.generate',
    /const CAPACIDAD_DEL_CANARY[^;]*'video\.generate'/.test(video));
  const puerta = lib('runtime/puerta.js');
  check('A11) la puerta del runtime está CERRADA por defecto: sin configuración, cualquier capacidad sale legacy',
    ['video.generate', 'text.generate', 'world.generate', 'image.generate'].every((c) => puerta.decidirRuntime(undefined, { capability: c, userId: 'u1', experienceId: 'studio' }).runtime === 'legacy'));
  const cancela = /cancel/i;
  check('A12) HUECO CONOCIDO · no existe cancelar una toma: ni creator/video.ts ni creator/toma.ts tienen una operación de cancelar (sí la tiene la rama filmmaker/core, D11)',
    !cancela.test(sinComentarios(leer('functions/src/creator/video.ts'))) && !cancela.test(sinComentarios(leer('functions/src/creator/toma.ts'))));
  check('A13) HUECO CONOCIDO · el Filmmaker no tiene entrada desde Brain: nada en el servidor convierte una petición de Brain en una producción',
    !ficheros.filter((f) => f.startsWith('functions/src/creator/') || f.startsWith('functions/src/core/')).some((f) => /crearProduccion|produccionEnBrain|aplicarOperacionesGuardadas/.test(sinComentarios(leer(f)))));
}

console.log('\n── A · Brain → elementos: el contexto visual está cableado pero, como se llama hoy, no resuelve nada ──');
{
  const ctx = lib('elements/contexto.js');
  const lecturas = [];
  const dbEspia = { collection: (c) => ({ doc: (id) => ({ get: async () => { lecturas.push(`${c}/${id}`); return { exists: false, data: () => undefined }; } }), where: () => { lecturas.push(`q:${c}`); throw new Error('no debe consultar'); } }) };
  /* Exactamente lo que pasa creator/brain.ts: sin `context`. */
  const entendimiento = { intent: 'creation', confidence: 'low', goal: 'hola', inputs: { text: 'hola', attachments: [] }, references: [], constraints: {}, needsPlanning: false, missing: [], assumptions: [] };
  const abierto = await ctx.contextoParaBrain('cuentaA0000001', entendimiento, { config: { habilitado: true } });
  const sinNecesidad = abierto.motivo === 'sin_necesidades';
  check('A14) con la puerta ABIERTA y el entendimiento que Brain construye hoy: motivo sin_necesidades, cero adjuntos, cero consultas',
    sinNecesidad && abierto.adjuntos.length === 0 && abierto.candidatos.length === 0);
  const cerrada = await ctx.contextoParaBrain('cuentaA0000001', { ...entendimiento, context: [{ kind: 'element', reference: 'la hamburguesa' }] }, { config: { habilitado: false }, db: dbEspia });
  check('A15) con la puerta cerrada ni siquiera una necesidad declarada lee nada', cerrada.motivo === 'deshabilitado' && lecturas.length === 0);
  const brainSrc = sinComentarios(leer('functions/src/creator/brain.ts'));
  const desde = brainSrc.indexOf('contextoParaBrain(uid');
  const llamada = brainSrc.slice(desde, desde + 400);
  check('A16) y el código de brainChat no declara necesidades (no hay `context:` en la llamada): declararlas es el paso siguiente, no de esta fase',
    desde > 0 && !/\bcontext:/.test(llamada), llamada.replace(/\s+/g, ' ').slice(0, 120));
}

/* ═══ B · el ciclo de una toma, con una base en memoria ═══════════════════════ */
console.log('\n── B · Una toma: reserva → material → enlace verificado → plano ──');
{
  const pid = 'p'.repeat(24);
  const montar = (rev = 1, estado = 'active') => {
    base.docs.set(`productions/${pid}`, { ownerAccountId: A, status: estado, metadata: { revision: rev } });
    base.docs.set(`productions/${pid}/productionScenes/sc-0001`, { id: 'sc-0001', ownerAccountId: A, productionId: pid, order: 0, shots: [{ id: 'sh-0101', order: 0, description: 'un plano' }] });
  };
  const id = (t) => ({ productionId: pid, sceneId: 'sc-0001', unitId: 'sh-0101', toma: t });
  const reserva = (t, estado, firma, uid = A) => {
    const rid = toma.requestIdDeToma(A, pid, 'sh-0101', t);
    base.docs.set(`creditTransactions/${usageTransactionId(rid)}`, { userId: uid, status: estado, meta: { filmmaker: { productionId: pid, unitId: 'sh-0101', take: t, firma } } });
    return rid;
  };
  const material = (rid, assetId, extra = {}) => base.docs.set(`assets/${assetId}`, {
    assetId, ownerAccountId: A, status: 'ready', kind: 'video', provenance: { traceId: rid, capability: 'video.generate', runId: `run_${rid}` }, ...extra,
  });
  const a1 = `asset_${'a'.repeat(32)}`;
  const a2 = `asset_${'b'.repeat(32)}`;
  const enlazar = (t, at, u = A) => toma.enlazarToma(base, { uid: u, accountId: u }, id(t), { at });
  const nodoDe = () => toma.nodoDeLaUnidad(base, A, { productionId: pid, unitId: 'sh-0101' });

  montar();
  const unidad = await toma.leerUnidadEnLaProduccion(base, A, { productionId: pid, sceneId: 'sc-0001', unitId: 'sh-0101' });
  const firma = unidad.unidad.firma;

  check('B1) sin reserva: not_found', (await enlazar(1, T0)).status === 'not_found');
  const r1 = reserva(1, 'AUTHORIZED', firma);
  check('B2) reservada pero sin cobrar: not_ready, y el plano no existe todavía', (await enlazar(1, T0)).status === 'not_ready' && (await nodoDe()) === null);
  reserva(1, 'REFUNDED', firma);
  check('B3) devuelta: failed, sin plano', (await enlazar(1, T0)).status === 'failed' && (await nodoDe()) === null);
  reserva(1, 'COMPLETED', firma);
  const sinMaterial = await enlazar(1, T0);
  check('B4) cobrada pero sin su material: not_ready/asset_mismatch (el dinero no se mueve aquí y el plano no se toca)', sinMaterial.status === 'not_ready' && sinMaterial.motivo === 'asset_mismatch');
  material(r1, a1, { provenance: { traceId: 'fm.otra-operacion.1', capability: 'video.generate', runId: 'run_fm.otra-operacion.1' } });
  check('B5) material de OTRA operación: no se enlaza', (await enlazar(1, T0)).status === 'not_ready');
  material(r1, a1, { ownerAccountId: B });
  check('B6) material de otra cuenta: no se enlaza (la consulta es por cuenta)', (await enlazar(1, T0)).status === 'not_ready');
  material(r1, a1, { kind: 'image' });
  check('B7) una imagen no es una toma de vídeo', (await enlazar(1, T0)).status === 'not_ready');
  material(r1, a1);
  const ok = await enlazar(1, T0 + 1);
  check('B8) con todo en orden: linked, y el plano del Core queda generado con SU material', ok.status === 'linked' && ok.assetId === a1);
  const nodo = await nodoDe();
  check('B9) el nodo guarda el id del material, nunca una URL', nodo?.producedAssetId === a1 && !/^https?:/.test(nodo.producedAssetId));
  check('B10) enlazar otra vez es idempotente: already, versión intacta', (await enlazar(1, T0 + 2)).status === 'already' && (await nodoDe()).version === nodo.version);
  check('B11) otra cuenta con la misma toma: not_found', (await toma.enlazarToma(base, { uid: B, accountId: B }, id(1), { at: T0 + 3 })).status === 'not_found');

  /* La firma: editar el plano mientras se generaba. */
  const r2 = reserva(2, 'COMPLETED', firma);
  material(r2, a2);
  base.docs.set(`productions/${pid}/productionScenes/sc-0001`, { id: 'sc-0001', ownerAccountId: A, productionId: pid, order: 0, shots: [{ id: 'sh-0101', order: 0, description: 'OTRO plano distinto' }] });
  base.docs.get(`productions/${pid}`).metadata.revision = 2;
  const cambiado = await enlazar(2, T0 + 4);
  check('B12) el plano cambió desde que se pidió la toma: stale, el resultado NO se enlaza (el vídeo sigue siendo de la cuenta)', cambiado.status === 'stale' && (await nodoDe()).producedAssetId === a1);
  base.docs.set(`productions/${pid}/productionScenes/sc-0001`, { id: 'sc-0001', ownerAccountId: A, productionId: pid, order: 0, shots: [{ id: 'sh-0101', order: 0, description: 'un plano' }] });
  base.docs.get(`productions/${pid}`).metadata.revision = 3;
  check('B13) y con la revisión de la producción distinta pero la unidad igual, se enlaza (la firma es de la unidad, no de la producción)', (await enlazar(2, T0 + 5)).status === 'linked');
  base.docs.get(`productions/${pid}`).status = 'archived';
  const archivada = await enlazar(1, T0 + 6);
  check('B14) con la producción archivada no se enlaza nada: stale/production_archived, y el plano conserva su resultado',
    archivada.status === 'stale' && archivada.motivo === 'production_archived' && (await nodoDe()).producedAssetId === a2);
  base.docs.get(`productions/${pid}`).status = 'active';

  /* G-2: el último enlace manda. Fijado: es una decisión del dueño (D-G1), no un accidente que se oculte. */
  const tras = await enlazar(1, T0 + 7);
  const finNodo = await nodoDe();
  check('G-2) DECISIÓN D-G1 · enlazar la toma 1 DESPUÉS de la 2 sustituye el resultado del plano por el de la 1 (el último enlace manda; la app solo enlaza la última toma)',
    tras.status === 'linked' && finNodo.producedAssetId === a1, `${tras.status} → ${finNodo.producedAssetId.slice(6, 10)}…`);
}

/* ═══ D · lo que está fijado tal cual es: decisiones del dueño ════════════════ */
console.log('\n── D · Fijado tal cual (decisiones del dueño, no defectos corregidos) ──');
{
  await sh.crearEscena({ accountId: A, sceneId: 'esc-d1', projectId: 'proy-d1', order: 0, at: T0 }, deps);
  await sh.crearEscena({ accountId: A, sceneId: 'esc-d2', projectId: 'proy-d2', order: 0, at: T0 }, deps);
  await sh.crearPlano({ accountId: A, shotId: 'pl-d1', projectId: 'proy-d1', sceneId: 'esc-d1', order: 0, at: T0 }, deps);
  await sh.crearPlano({ accountId: A, shotId: 'pl-d2', projectId: 'proy-d1', sceneId: 'esc-d1', order: 1, dependsOnShotIds: ['pl-d1'], at: T0 }, deps);
  await sh.actualizarPlano(A, 'pl-d1', { state: 'ready', at: T0 + 1 }, deps);
  const g = await sh.actualizarPlano(A, 'pl-d1', { state: 'generated', at: T0 + 2 }, deps);
  check('G-3) DECISIÓN D-G2 · por shot.update se puede pasar un plano a `generated` SIN resultado (la puerta solo veta escribir `producedAssetId`, no el estado)',
    g.status === 'actualizado' && g.shot.state === 'generated' && g.shot.producedAssetId === undefined);
  const ciclo = await sh.actualizarPlano(A, 'pl-d1', { dependsOnShotIds: ['pl-d2'], at: T0 + 3 }, deps);
  check('G-4) DECISIÓN D-G3 · los nodos de shots aceptan un ciclo A↔B (el ciclo lo detecta el modelo del Filmmaker, filmmaker/validacion, no el nodo)', ciclo.status === 'actualizado');
  const cruzado = await sh.crearPlano({ accountId: A, shotId: 'pl-d3', projectId: 'proy-d1', sceneId: 'esc-d2', order: 2, at: T0 }, deps);
  check('G-5) DECISIÓN D-G3 · un plano de un proyecto puede colgar de una escena de OTRO proyecto de la misma cuenta (shots no cruza projectId; el enlace de Filmmaker sí lo comprueba)', cruzado.status === 'creado');
}

/* ═══ E · la matriz de experiencias, con los planes de verdad ═════════════════ */
console.log('\n── E · Qué capacidades pide cada experiencia y qué puede el catálogo hoy ──');
{
  const planes = await todosLosPlanes();
  const porExp = {};
  for (const x of planes) { const s = (porExp[x.experienceId] ??= new Set()); for (const st of x.plan.steps) s.add(st.capability); }
  const lista = (id) => [...(porExp[id] ?? [])].sort();
  const esperado = {
    design: 'image.generate text.generate',
    studio: 'text.generate video.generate video.image_to_video vision.describe voice.tts',
    photo: 'image.background_remove image.edit image.generate image.identity_edit image.object_remove vision.describe',
    writer: 'image.generate text.generate text.search',
    music: 'image.generate music.generate text.generate video.compose voice.tts',
    beauty: 'image.identity_edit image.try_on text.generate vision.describe',
    chef: 'image.edit image.generate text.generate text.search vision.describe',
    home: 'image.generate image.space_restyle text.generate vision.describe',
    business: 'image.generate text.generate text.search',
    travel: 'text.search',
    brain: 'text.generate',
  };
  for (const [id, caps] of Object.entries(esperado)) {
    check(`E1) ${id}: sus planes piden exactamente [${caps.split(' ').sort().join(', ')}]`, J(lista(id)) === J(caps.split(' ').sort()), lista(id).join(' '));
  }
  const estado = Object.fromEntries(lib('core/registry/index.js').CAPABILITY_CATALOG.map((c) => [c.id, c.status]));
  const noEnrutables = Object.entries(porExp).flatMap(([e, caps]) => [...caps].filter((c) => estado[c] !== 'ROUTABLE').map((c) => `${e}:${c}=${estado[c]}`)).sort();
  check('E2) lo único que un plan pide y el catálogo NO enruta es Weë Music: music.generate (PENDING) y video.compose (DECLARED)',
    J(noEnrutables) === J(['music:music.generate=PENDING', 'music:video.compose=DECLARED']), noEnrutables.join(' '));
  const exps = lib('creator/experiencias.js');
  check('E3) por eso Weë Brain no deriva a Music ni la sugiere (aún no puede trabajar), y las demás sí',
    !exps.EXPERIENCIAS_PARA_DERIVAR.includes('music') && ['design', 'studio', 'photo', 'writer', 'beauty', 'chef', 'home', 'business', 'travel'].every((e) => exps.EXPERIENCIAS_PARA_DERIVAR.includes(e)));
  const canarys = ['brain', 'mundo', 'video'].map((f) => leer(`functions/src/creator/${f}.ts`).match(/const CAPACIDAD_DEL_CANARY[^=]*=\s*'([^']+)'/)?.[1]);
  check('E4) las puertas del Core son tres declaraciones: text.generate (brainChat), world.generate (3D, no es una de las 11 experiencias) y video.generate (generateVideo); ninguna es una experiencia entera',
    J(canarys) === J(['text.generate', 'world.generate', 'video.generate']), canarys.join(', '));
  const creatorIndex = sinComentarios(leer('functions/src/creator/index.ts'));
  check('E5) creatorRun (el camino de TODAS las experiencias) no pasa por el conductor: no importa runtime ni decidirRuntime',
    !/conductorDeWee|decidirRuntime|pedirMedio/.test(creatorIndex));
}

console.log(fallos ? `\n✘ ${fallos} comprobaciones fallan` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
