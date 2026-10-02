/**
 * WEË SCENES & SHOTS — C3: EL ESTADO CREATIVO, GUARDADO Y ACOTADO.
 *
 * ── Qué se mide aquí ────────────────────────────────────────────────────────
 *
 * Tres cosas, y las tres con un Firestore de mentira que APUNTA lo que se le
 * pide, porque lo que hay que demostrar no es solo que el resultado sea el
 * correcto: es que el COSTE de obtenerlo esté acotado.
 *
 *   1 · lo de otra cuenta se comporta como inexistente, sin excepciones;
 *   2 · ninguna consulta sale sin cuenta y sin tope. Ni una;
 *   3 · un plano no se convierte en un trabajo, ni en un material, ni guarda
 *       un prompt.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const sh = lib('shots/index.js');
const {
  SHOT_CONTRACT_VERSION, MAX_ELEMENTOS_EN_RESULTADO, planoValido, escenaValida,
} = core;
const {
  COLECCION_DE_ESCENAS, COLECCION_DE_PLANOS, MAX_PLANOS_POR_ESCENA, MAX_ESCENAS_POR_PROYECTO,
  crearEscena, leerEscena, escenasDelProyecto, actualizarEscena,
  crearPlano, leerPlano, planosDeLaEscena, planosQueDependenDe,
  actualizarPlano, marcarPlanoObsoleto, contextoDeContinuidad,
} = sh;

const A = 'cuentaA';
const B = 'cuentaB';
const HOY = 1_800_000_000_000;

const LUNA = 'el_luna_0001';
const CASA = 'el_casa_0001';
const ASSET = 'asset_abcd1234';

/* ── Un Firestore de mentira que APUNTA lo que se le pide ─────────────────── */

const fakeDb = () => {
  const cols = new Map();
  const dameCol = (c) => { if (!cols.has(c)) cols.set(c, new Map()); return cols.get(c); };
  const consultas = [];
  const lecturas = [];
  const hazRef = (c, id) => ({
    async get() { lecturas.push({ coleccion: c, id }); const d = dameCol(c).get(id); return { exists: d !== undefined, id, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) }; },
    async create(d) { if (dameCol(c).has(id)) throw new Error('ya existe'); dameCol(c).set(id, JSON.parse(JSON.stringify(d))); },
    async set(d) { dameCol(c).set(id, JSON.parse(JSON.stringify(d))); },
  });
  const consulta = (c, filtros = [], orden = null, tope = null) => ({
    where: (campo, op, valor) => consulta(c, [...filtros, { campo, op, valor }], orden, tope),
    orderBy: (campo) => consulta(c, filtros, campo, tope),
    limit: (k) => consulta(c, filtros, orden, k),
    async get() {
      consultas.push({ coleccion: c, filtros, orden, tope });
      let e = [...dameCol(c).entries()];
      for (const f of filtros) {
        e = e.filter(([, d]) => (f.op === '=='
          ? d[f.campo] === f.valor
          : Array.isArray(d[f.campo]) && d[f.campo].includes(f.valor)));
      }
      if (orden) e = e.sort((x, y) => (x[1][orden] < y[1][orden] ? -1 : 1));
      if (tope !== null) e = e.slice(0, tope);
      return { docs: e.map(([id, d]) => ({ id, data: () => JSON.parse(JSON.stringify(d)) })) };
    },
  });
  return {
    consultas,
    lecturas,
    volcado: (c) => [...dameCol(c).entries()].map(([id, d]) => ({ id, ...d })),
    sembrar: (c, id, d) => dameCol(c).set(id, JSON.parse(JSON.stringify(d))),
    collection(c) { return { doc: (id) => hazRef(c, id), ...consulta(c) }; },
  };
};

/* Elementos y materiales de mentira, con su dueño y su versión. */
const mundo = (extra = {}) => {
  const db = fakeDb();
  const elementos = new Map([
    [`${A}|${LUNA}`, { elementId: LUNA, ownerAccountId: A, version: 4, status: 'active' }],
    [`${A}|${CASA}`, { elementId: CASA, ownerAccountId: A, version: 2, status: 'active' }],
    [`${B}|el_ajeno_001`, { elementId: 'el_ajeno_001', ownerAccountId: B, version: 1, status: 'active' }],
    [`${A}|el_viejo_001`, { elementId: 'el_viejo_001', ownerAccountId: A, version: 1, status: 'archived' }],
    ...(extra.elementos ?? []),
  ]);
  const assets = new Map([
    [ASSET, { assetId: ASSET, ownerAccountId: A, status: 'ready' }],
    ['asset_ajeno001', { assetId: 'asset_ajeno001', ownerAccountId: B, status: 'ready' }],
    ['asset_crudo001', { assetId: 'asset_crudo001', ownerAccountId: A, status: 'processing' }],
  ]);
  return {
    db,
    deps: {
      db,
      elemento: async (accountId, elementId) => elementos.get(`${accountId}|${elementId}`) ?? null,
      asset: async (assetId) => assets.get(assetId) ?? null,
    },
  };
};

const escenaBase = { projectId: 'pr_0001', order: 0, at: HOY };
const planoBase = { projectId: 'pr_0001', order: 0, at: HOY };

console.log('\n── A · Escenas: crear, leer, listar, cambiar ──');
{
  const m = mundo();
  const r = await crearEscena({ accountId: A, sceneId: 'sc_0001', ...escenaBase, name: 'El laboratorio' }, m.deps);
  check('A) una escena se crea y queda guardada',
    r.status === 'creado' && escenaValida(r.scene) && m.db.volcado(COLECCION_DE_ESCENAS).length === 1, r.status);
  check('A) y lo guardado es el CONTRATO, sin DTO ni campos de más',
    Object.keys(m.db.volcado(COLECCION_DE_ESCENAS)[0]).sort().join(',')
    === 'contract,createdAt,id,name,order,ownerAccountId,projectId,sceneId,updatedAt,version');
  const dos = await crearEscena({ accountId: A, sceneId: 'sc_0001', ...escenaBase }, m.deps);
  check('L) crear dos veces el mismo id NO crea dos escenas',
    dos.status === 'ya_existe' && m.db.volcado(COLECCION_DE_ESCENAS).length === 1, dos.status);
  check('A) se lee la suya', (await leerEscena(A, 'sc_0001', m.deps))?.sceneId === 'sc_0001');
  const up = await actualizarEscena(A, 'sc_0001', { name: 'Otro nombre', at: HOY + 1 }, m.deps);
  check('D) al cambiarla, la versión sube', up.status === 'actualizado' && up.scene.version === 2, `v${up.scene?.version}`);
  check('M) y lo que nunca cambia no cambió',
    up.scene.ownerAccountId === A && up.scene.sceneId === 'sc_0001'
    && up.scene.projectId === 'pr_0001' && up.scene.createdAt === HOY && up.scene.updatedAt === HOY + 1);
}

console.log('\n── B/R · Planos: crear, leer, ordenar ──');
{
  const m = mundo();
  await crearEscena({ accountId: A, sceneId: 'sc_0001', ...escenaBase }, m.deps);
  const r = await crearPlano({ accountId: A, shotId: 'sh_0001', ...planoBase, sceneId: 'sc_0001', elements: [{ elementId: LUNA, version: 4 }] }, m.deps);
  check('B) un plano se crea en `draft`', r.status === 'creado' && r.shot.state === 'draft' && r.shot.version === 1, r.status);
  check('B) con el contrato de C1, validado', planoValido(r.shot) && r.shot.contract === SHOT_CONTRACT_VERSION);
  await crearPlano({ accountId: A, shotId: 'sh_0003', ...planoBase, order: 2, sceneId: 'sc_0001' }, m.deps);
  await crearPlano({ accountId: A, shotId: 'sh_0002', ...planoBase, order: 1, sceneId: 'sc_0001' }, m.deps);
  const lista = await planosDeLaEscena({ accountId: A, sceneId: 'sc_0001' }, m.deps);
  check('R) los planos de una escena salen EN ORDEN, no por fecha',
    lista.map((p) => p.shotId).join(',') === 'sh_0001,sh_0002,sh_0003', lista.map((p) => p.shotId).join(','));
  check('L) crear dos veces el mismo id NO crea dos planos',
    (await crearPlano({ accountId: A, shotId: 'sh_0001', ...planoBase }, m.deps)).status === 'ya_existe');
}

console.log('\n── C/J · Propiedad: lo ajeno es inexistente ──');
{
  const m = mundo();
  await crearEscena({ accountId: A, sceneId: 'sc_0001', ...escenaBase }, m.deps);
  await crearPlano({ accountId: A, shotId: 'sh_0001', ...planoBase, sceneId: 'sc_0001' }, m.deps);
  check('1) la escena de A no se lee desde B', (await leerEscena(B, 'sc_0001', m.deps)) === null);
  check('2) el plano de A no se lee desde B', (await leerPlano(B, 'sh_0001', m.deps)) === null);
  check('15) ni se cambia desde B', (await actualizarPlano(B, 'sh_0001', { order: 9, at: HOY }, m.deps)).status === 'no_encontrado');
  check('15) ni se marca obsoleto desde B', (await marcarPlanoObsoleto(B, 'sh_0001', HOY, m.deps)).status === 'no_encontrado');
  check('J) listar desde B no devuelve nada de A',
    (await planosDeLaEscena({ accountId: B, sceneId: 'sc_0001' }, m.deps)).length === 0
    && (await escenasDelProyecto({ accountId: B, projectId: 'pr_0001' }, m.deps)).length === 0);
  check('C) y el contexto desde B tampoco existe',
    (await contextoDeContinuidad({ accountId: B, shotId: 'sh_0001' }, m.deps)) === null);
  check('K) un id mal formado se rechaza, no se busca',
    (await leerPlano(A, '', m.deps)) === null && (await leerPlano('', 'sh_0001', m.deps)) === null);
}

console.log('\n── E/K · Referencias: elemento, versión, escena, anterior ──');
{
  const m = mundo();
  await crearEscena({ accountId: A, sceneId: 'sc_0001', ...escenaBase }, m.deps);
  const ajeno = await crearPlano({ accountId: A, shotId: 'sh_aj01', ...planoBase, elements: [{ elementId: 'el_ajeno_001', version: 1 }] }, m.deps);
  check('4) un elemento de OTRA cuenta se rechaza como inexistente',
    ajeno.status === 'referencia_rechazada' && ajeno.referencia.motivo === 'no_encontrado' && ajeno.referencia.tipo === 'element',
    JSON.stringify(ajeno.referencia));
  const futura = await crearPlano({ accountId: A, shotId: 'sh_fu01', ...planoBase, elements: [{ elementId: LUNA, version: 7 }] }, m.deps);
  check('6) anclar una versión que todavía no ha ocurrido se rechaza',
    futura.status === 'referencia_rechazada' && futura.referencia.motivo === 'version_futura', JSON.stringify(futura.referencia));
  const vieja = await crearPlano({ accountId: A, shotId: 'sh_vi01', ...planoBase, elements: [{ elementId: LUNA, version: 2 }] }, m.deps);
  check('6) pero anclar una versión VIEJA sí vale: es para lo que existe el campo', vieja.status === 'creado');
  const archivado = await crearPlano({ accountId: A, shotId: 'sh_ar01', ...planoBase, elements: [{ elementId: 'el_viejo_001', version: 1 }] }, m.deps);
  check('un elemento archivado no se puede usar', archivado.status === 'referencia_rechazada' && archivado.referencia.motivo === 'no_utilizable');
  const sinEscena = await crearPlano({ accountId: A, shotId: 'sh_se01', ...planoBase, sceneId: 'sc_9999' }, m.deps);
  check('3) un plano no puede colgar de una escena que no existe',
    sinEscena.status === 'referencia_rechazada' && sinEscena.referencia.tipo === 'scene');
  const sinAnterior = await crearPlano({ accountId: A, shotId: 'sh_an01', ...planoBase, previousShotId: 'sh_9999' }, m.deps);
  check('8) ni continuar de un plano que no existe',
    sinAnterior.status === 'referencia_rechazada' && sinAnterior.referencia.tipo === 'shot');
  check('9) `nextShotId` no existe en el contrato: llega y no se guarda',
    (await crearPlano({ accountId: A, shotId: 'sh_nx01', ...planoBase, nextShotId: 'sh_0002' }, m.deps)).status === 'creado'
    && m.db.volcado(COLECCION_DE_PLANOS).every((p) => p.nextShotId === undefined));
}

console.log('\n── F · El material producido ──');
{
  const m = mundo();
  await crearPlano({ accountId: A, shotId: 'sh_0001', ...planoBase }, m.deps);
  const ajeno = await actualizarPlano(A, 'sh_0001', { producedAssetId: 'asset_ajeno001', at: HOY }, m.deps);
  check('5) un material de otra cuenta se rechaza',
    ajeno.status === 'referencia_rechazada' && ajeno.referencia.tipo === 'asset' && ajeno.referencia.motivo === 'no_encontrado');
  const crudo = await actualizarPlano(A, 'sh_0001', { producedAssetId: 'asset_crudo001', at: HOY }, m.deps);
  check('7) y uno que todavía no está listo tampoco',
    crudo.status === 'referencia_rechazada' && crudo.referencia.motivo === 'no_utilizable');
  const ok = await actualizarPlano(A, 'sh_0001', { state: 'ready', at: HOY + 1 }, m.deps);
  const ok2 = await actualizarPlano(A, 'sh_0001', { state: 'generated', producedAssetId: ASSET, at: HOY + 2 }, m.deps);
  check('F) el suyo y listo sí, y el plano solo guarda su ID',
    ok.status === 'actualizado' && ok2.status === 'actualizado' && ok2.shot.producedAssetId === ASSET);
  check('Q) NO se duplica el material: ni bytes, ni procedencia, ni variantes, ni estado',
    Object.keys(m.db.volcado(COLECCION_DE_PLANOS)[0]).every((k) => !['storageRef', 'provenance', 'variants', 'mimeType', 'bytes', 'status'].includes(k)),
    Object.keys(m.db.volcado(COLECCION_DE_PLANOS)[0]).join(','));
}

console.log('\n── G/H · Anterior, dependencias y obsoleto ──');
{
  const m = mundo();
  await crearEscena({ accountId: A, sceneId: 'sc_0001', ...escenaBase }, m.deps);
  await crearPlano({ accountId: A, shotId: 'sh_0001', ...planoBase, sceneId: 'sc_0001' }, m.deps);
  const dos = await crearPlano({ accountId: A, shotId: 'sh_0002', ...planoBase, order: 1, sceneId: 'sc_0001', previousShotId: 'sh_0001', dependsOnShotIds: ['sh_0001'] }, m.deps);
  check('G) un plano continúa de otro y declara su dependencia',
    dos.status === 'creado' && dos.shot.previousShotId === 'sh_0001' && dos.shot.dependsOnShotIds.join(',') === 'sh_0001');
  const dependientes = await planosQueDependenDe({ accountId: A, shotId: 'sh_0001' }, m.deps);
  check('H) se puede preguntar quién depende de un plano, acotado',
    dependientes.map((p) => p.shotId).join(',') === 'sh_0002', dependientes.map((p) => p.shotId).join(','));
  await actualizarPlano(A, 'sh_0002', { state: 'ready', at: HOY + 1 }, m.deps);
  await actualizarPlano(A, 'sh_0002', { state: 'generated', at: HOY + 2 }, m.deps);
  const st = await marcarPlanoObsoleto(A, 'sh_0002', HOY + 3, m.deps);
  check('H) marcar obsoleto es UNA llamada con intención', st.status === 'actualizado' && st.shot.state === 'stale');
  check('H) y NO se propagó a nadie: el otro sigue como estaba',
    (await leerPlano(A, 'sh_0001', m.deps)).state === 'draft');
  const mal = await actualizarPlano(A, 'sh_0001', { state: 'validated', at: HOY + 4 }, m.deps);
  check('M) una transición imposible se rechaza con su motivo',
    mal.status === 'transicion_invalida' && mal.de === 'draft' && mal.a === 'validated', JSON.stringify(mal));
  check('M) y el plano no se movió', (await leerPlano(A, 'sh_0001', m.deps)).state === 'draft');
}

console.log('\n── I/T · El contexto, acotado ──');
{
  const m = mundo();
  await crearEscena({ accountId: A, sceneId: 'sc_0001', ...escenaBase, location: { elementId: CASA, version: 2 } }, m.deps);
  await crearPlano({ accountId: A, shotId: 'sh_0001', ...planoBase, sceneId: 'sc_0001' }, m.deps);
  await crearPlano({ accountId: A, shotId: 'sh_0002', ...planoBase, order: 1, sceneId: 'sc_0001', previousShotId: 'sh_0001',
    elements: [{ elementId: LUNA, version: 4 }],
    continuity: { preserve: ['identity.face'], anchors: [{ elementId: CASA, version: 2 }] } }, m.deps);
  /* Ruido: ocho planos más en la misma escena que el contexto NO debe leer. */
  for (let i = 3; i < 11; i++) await crearPlano({ accountId: A, shotId: `sh_00${i}`, ...planoBase, order: i, sceneId: 'sc_0001' }, m.deps);

  const antes = m.db.lecturas.length;
  const consultasAntes = m.db.consultas.length;
  const ctx = await contextoDeContinuidad({ accountId: A, shotId: 'sh_0002' }, m.deps);
  const lecturas = m.db.lecturas.length - antes;

  check('I) el contexto trae el plano, su escena y el anterior',
    ctx.shot.shotId === 'sh_0002' && ctx.scene.sceneId === 'sc_0001' && ctx.previous.shotId === 'sh_0001');
  check('I) y los elementos que el plano NOMBRA, reparto más anclajes',
    ctx.elements.map((e) => e.elementId).sort().join(',') === `${CASA},${LUNA}`, ctx.elements.map((e) => e.elementId).join(','));
  check('I) con sus requisitos de continuidad', ctx.requirements.preserve.join(',') === 'identity.face');
  check('T) y cuesta TRES lecturas, no once: no carga la escena entera',
    lecturas === 3, `${lecturas} lecturas de documento`);
  check('T) sin una sola consulta de colección: el contexto no barre nada',
    m.db.consultas.length === consultasAntes, `${m.db.consultas.length - consultasAntes} consultas`);
  check('S) recuperar el anterior no carga la escena entera',
    ctx.previous.shotId === 'sh_0001' && ctx.truncated === false);

  const mm = mundo();
  await crearPlano({ accountId: A, shotId: 'sh_tope1', ...planoBase }, mm.deps);
  const muchos = Array.from({ length: MAX_ELEMENTOS_EN_RESULTADO + 2 }, (_, i) => ({ elementId: `el_x${String(i).padStart(5, '0')}`, version: 1 }));
  await actualizarPlano(A, 'sh_tope1', { elements: muchos.slice(0, 10), at: HOY + 1 }, {
    ...mm.deps, elemento: async (acc, id) => ({ elementId: id, ownerAccountId: acc, version: 1, status: 'active' }),
  });
  const ctx2 = await contextoDeContinuidad({ accountId: A, shotId: 'sh_tope1' }, {
    ...mm.deps, elemento: async (acc, id) => ({ elementId: id, ownerAccountId: acc, version: 1, status: 'active' }),
  });
  check('T) el tope de elementos es el del Contexto Visual, y se avisa al recortar',
    ctx2.elements.length === MAX_ELEMENTOS_EN_RESULTADO && ctx2.truncated === true,
    `${ctx2.elements.length} de 10, truncated=${ctx2.truncated}`);
}

console.log('\n── Bounded reads: ninguna consulta sin cuenta y sin tope ──');
{
  const m = mundo();
  await crearEscena({ accountId: A, sceneId: 'sc_0001', ...escenaBase }, m.deps);
  await crearPlano({ accountId: A, shotId: 'sh_0001', ...planoBase, sceneId: 'sc_0001' }, m.deps);
  await escenasDelProyecto({ accountId: A, projectId: 'pr_0001' }, m.deps);
  await planosDeLaEscena({ accountId: A, sceneId: 'sc_0001' }, m.deps);
  await planosQueDependenDe({ accountId: A, shotId: 'sh_0001' }, m.deps);
  await contextoDeContinuidad({ accountId: A, shotId: 'sh_0001' }, m.deps);
  check('TODA consulta empieza por `ownerAccountId`',
    m.db.consultas.length > 0 && m.db.consultas.every((c) => c.filtros[0]?.campo === 'ownerAccountId' && c.filtros[0]?.valor === A),
    `${m.db.consultas.length} consultas`);
  check('TODA consulta lleva tope, y ninguno pasa del máximo declarado',
    m.db.consultas.every((c) => typeof c.tope === 'number' && c.tope > 0 && c.tope <= Math.max(MAX_PLANOS_POR_ESCENA, MAX_ESCENAS_POR_PROYECTO)),
    m.db.consultas.map((c) => `${c.coleccion}:${c.tope}`).join(' '));
  check('un tope pedido por encima del máximo se recorta al máximo',
    (await planosDeLaEscena({ accountId: A, sceneId: 'sc_0001', limit: 99_999 }, m.deps),
    m.db.consultas[m.db.consultas.length - 1].tope === MAX_PLANOS_POR_ESCENA),
    `tope=${m.db.consultas[m.db.consultas.length - 1].tope}`);
  /*
   * Estáticamente lo que se puede afirmar es esto: no hay ninguna API sin tope
   * —`getAll`, `listDocuments`, `stream`— y hay exactamente TANTOS `limit`
   * como consultas que empiezan por la cuenta. Añadir una consulta sin tope, o
   * una que no empiece por `ownerAccountId`, rompe la igualdad.
   *
   * (Contar `.where(` contra `ownerAccountId` sería otra cosa y estaría mal:
   * una consulta acotada lleva más filtros que el de la cuenta.)
   */
  const RT = sinComentarios(leer('functions/src/shots/index.ts'));
  const cuantos = (re) => (RT.match(re) ?? []).length;
  check('no hay `getAll`, ni `listDocuments`, ni `stream`, y hay un `limit` por consulta',
    !/getAll|listDocuments|\.stream\(/.test(RT)
    && cuantos(/\.limit\(/g) === cuantos(/ownerAccountId', '=='/g)
    && cuantos(/\.limit\(/g) === 3,
    `limit=${cuantos(/\.limit\(/g)} cuenta=${cuantos(/ownerAccountId', '=='/g)}`);
}

console.log('\n── N/O/P · Lo que un plano NO es ──');
{
  const src = sinComentarios(leer('functions/src/shots/index.ts'));
  const puerta = sinComentarios(leer('functions/src/shots/puerta.ts'));
  check('N) no hay dónde guardar un prompt: el contrato lo prohíbe',
    !/prompt/i.test(src) && !/prompt/i.test(puerta));
  check('O) ni proveedor, ni modelo, ni adaptador, ni clave',
    !/(providerId|modelId|adapterId|apiKey|storageRef)/.test(src + puerta));
  check('P) un plano no es un trabajo: ni estados de ejecución, ni intentos, ni concesiones',
    !/\b(queued|running|attempt|lease|JobStore|crearTrabajo)\b/.test(src));
  check('Q) ni un segundo registro de materiales: solo se guarda el id',
    !/crearMaterial|registrarObjeto|almacenDeObjetos/.test(src));
  check('el runtime no construye router, planner, gateway ni cola',
    !/crearRouter|crearGateway|crearConductor|colaDe|QueuePort/.test(src));
  check('la cuenta NUNCA llega del cliente: la puerta la resuelve de la sesión',
    /cuentaDelPrincipalEnWee/.test(puerta) && !/data\.(ownerAccountId|accountId)/.test(puerta));
}

console.log('\n── Reglas, índices y puerta ──');
{
  const reglas = leer('firestore.rules');
  const indices = JSON.parse(leer('firestore.indexes.json')).indexes;
  const tiene = (col, campos) => indices.some((i) => i.collectionGroup === col
    && i.fields.map((f) => f.fieldPath).join(',') === campos);
  check('las dos colecciones están cerradas al cliente para escribir, y solo se leen las propias',
    /match \/scenes\/\{sceneId\}/.test(reglas) && /match \/shots\/\{shotId\}/.test(reglas)
    && (reglas.match(/allow create, update, delete: if false;/g) ?? []).length >= 4);
  check('y hay índice para cada consulta acotada, sin índices especulativos',
    tiene('scenes', 'ownerAccountId,projectId,order')
    && tiene('shots', 'ownerAccountId,sceneId,order')
    && tiene('shots', 'ownerAccountId,dependsOnShotIds')
    && indices.filter((i) => i.collectionGroup === 'scenes' || i.collectionGroup === 'shots').length === 3);
  check('la puerta está exportada y es UNA', /export \{ shots \} from '\.\/shots\/puerta'/.test(leer('functions/src/index.ts')));
  check('las colecciones tienen el nombre que dice el runtime',
    COLECCION_DE_ESCENAS === 'scenes' && COLECCION_DE_PLANOS === 'shots');
}

console.log('\n── C1 y C2 siguen intactos ──');
{
  check('el contrato de C1/C2 no se tocó para esto',
    /export const SHOT_CONTRACT_VERSION/.test(leer('functions/src/core/contracts.ts'))
    && SHOT_CONTRACT_VERSION === '1.0');
  check('y C3 no añadió tipos propios: usa `SceneNode` y `ShotNode` del Core',
    !/interface (SceneDoc|ShotDoc|SceneRecord|ShotRecord)/.test(leer('functions/src/shots/index.ts'))
    && /EscenaGuardada = SceneNode/.test(leer('functions/src/shots/index.ts'))
    && /PlanoGuardado = ShotNode/.test(leer('functions/src/shots/index.ts')));
  check('`ProjectItemKind` NO se amplió en esta fase',
    /export type ProjectItemKind = 'asset' \| 'content';/.test(leer('functions/src/core/project.ts')));
  check('esta suite está en la cadena de `npm test`', /planos-runtime\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
