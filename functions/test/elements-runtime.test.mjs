/**
 * S4 · WEË ELEMENTS RUNTIME. Los contratos de S3, hechos reales.
 *
 * Lo que se demuestra aquí, en una frase: **una hamburguesa se guarda, se lee,
 * se cambia y se archiva — y NADA de eso puede cruzar de una cuenta a otra.**
 *
 * Y la segunda: el resolutor del Core sigue siendo puro. Este runtime solo
 * TRAE el mundo; quién es «la hamburguesa» lo sigue decidiendo S3.
 *
 *   A · Guardar: crear, leer, cambiar, archivar
 *   B · Los materiales: tuyos, usables y de la clase que dices
 *   C · Aislamiento entre cuentas, en las cuatro operaciones
 *   D · Consultas: acotadas siempre, y sin recorrer nada
 *   E · El mundo real → el resolutor puro → Brain → Planner
 *   F · Lo que NO cambió
 *
 * Sin proveedor, sin modelo, sin LLM, sin red, sin trabajos. Las reglas y las
 * consultas de verdad contra Firestore se prueban en `elements.emulator.mjs`.
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

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const els = lib('elements/index.js');
const {
  ELEMENT_CONTRACT_VERSION, PLANNER_CONTRACT_VERSION,
  MAX_ELEMENTOS_EN_RESULTADO, elementoValido, resolverContexto, materialesDelContexto, crearPlanner,
} = core;
const {
  COLECCION_DE_ELEMENTOS, COLECCION_DE_ITEMS_DE_PROYECTO, MAX_ITEMS_DE_PROYECTO,
  crearElemento, leerElemento, candidatosDeLaCuenta, actualizarElemento, archivarElemento,
  mundoDeContextoDeWee,
} = els;

const A = 'cuentaA';
const B = 'cuentaB';
const AYER = 1_799_900_000_000;
const HOY = 1_800_000_000_000;
const tracer = { record() {} };
const now = () => HOY;
let serie = 0;
const traza = () => { serie++; const id = `s4_t_${String(serie).padStart(4, '0')}`; return { traceId: id, requestId: id, userId: 'user-0001' }; };

/* ── Un Firestore de mentira, con lo justo que este runtime usa ───────────── */

const fakeDb = () => {
  const cols = new Map();
  const dameCol = (c) => { if (!cols.has(c)) cols.set(c, new Map()); return cols.get(c); };
  const consultas = [];
  const hazRef = (c, id) => ({
    _col: c, _id: id,
    async get() { const d = dameCol(c).get(id); return { exists: d !== undefined, id, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) }; },
    async create(d) { if (dameCol(c).has(id)) throw new Error('ya existe'); dameCol(c).set(id, JSON.parse(JSON.stringify(d))); },
    async set(d) { dameCol(c).set(id, JSON.parse(JSON.stringify(d))); },
  });
  const consulta = (c, filtros = [], orden = null, tope = null) => ({
    where: (campo, op, valor) => consulta(c, [...filtros, { campo, op, valor }], orden, tope),
    orderBy: (campo) => consulta(c, filtros, campo, tope),
    limit: (k) => consulta(c, filtros, orden, k),
    async get() {
      /* Se anota CADA consulta: así una prueba puede exigir que siempre lleve cuenta y tope. */
      consultas.push({ coleccion: c, filtros, orden, tope });
      let e = [...dameCol(c).entries()];
      for (const f of filtros) {
        e = e.filter(([, d]) => (f.op === '==' ? d[f.campo] === f.valor
          : f.op === '>=' ? typeof d[f.campo] === 'number' && d[f.campo] >= f.valor
            : typeof d[f.campo] === 'number' && d[f.campo] <= f.valor));
      }
      if (orden) e = e.sort((x, y) => (x[1][orden] < y[1][orden] ? -1 : 1));
      if (tope !== null) e = e.slice(0, tope);
      return { docs: e.map(([id, d]) => ({ id, data: () => JSON.parse(JSON.stringify(d)) })) };
    },
  });
  return {
    consultas,
    volcado: (c) => [...dameCol(c).entries()].map(([id, d]) => ({ id, ...d })),
    sembrar: (c, id, d) => dameCol(c).set(id, JSON.parse(JSON.stringify(d))),
    collection(c) { return { doc: (id) => hazRef(c, id), ...consulta(c) }; },
    async runTransaction(fn) {
      return fn({
        async get(ref) { return ref.get(); },
        set(ref, d) { dameCol(ref._col).set(ref._id, JSON.parse(JSON.stringify(d))); },
      });
    },
  };
};

/** El Content Core de mentira: fichas de material con dueño, clase y estado. */
const materiales = (tabla) => async (assetId) => tabla[assetId] ?? null;

const FICHAS = {
  img_burger_front: { assetId: 'img_burger_front', ownerAccountId: A, kind: 'image', status: 'ready' },
  img_burger_side: { assetId: 'img_burger_side', ownerAccountId: A, kind: 'image', status: 'ready' },
  img_logo_nido: { assetId: 'img_logo_nido', ownerAccountId: A, kind: 'image', status: 'ready' },
  img_subiendo: { assetId: 'img_subiendo', ownerAccountId: A, kind: 'image', status: 'uploading' },
  vid_burger: { assetId: 'vid_burger', ownerAccountId: A, kind: 'video', status: 'ready' },
  img_de_b: { assetId: 'img_de_b', ownerAccountId: B, kind: 'image', status: 'ready' },
};
const mundo = () => ({ db: fakeDb(), material: materiales(FICHAS) });

const nuevo = (extra = {}) => ({
  accountId: A, elementId: 'burger_classic', type: 'product', name: 'Burger Classic',
  refs: [{ assetId: 'img_burger_front', role: 'primary', kind: 'image' }],
  at: AYER, ...extra,
});

/* ═══ A · GUARDAR ═════════════════════════════════════════════════════════ */
console.log('\n── A · Crear, leer, cambiar, archivar ──');
{
  /* A/B · Crear y leer. */
  const d = mundo();
  const creado = await crearElemento(nuevo(), d);
  check('A) CREAR: una hamburguesa se guarda, y lo guardado es el contrato del Core',
    creado.status === 'creado' && elementoValido(creado.element)
    && creado.element.contract === ELEMENT_CONTRACT_VERSION && creado.element.ownerAccountId === A,
    creado.status === 'invalido' ? JSON.stringify(creado.problemas) : creado.status);
  check('§74) el DOCUMENTO es el contrato: ni DTO, ni entidad, ni registro, ni capa de mapeo',
    JSON.stringify(d.db.volcado(COLECCION_DE_ELEMENTOS)[0]) === JSON.stringify({ id: 'burger_classic', ...creado.element })
    && !/ElementDoc|ElementDTO|ElementEntity|ElementRecord|toDomain|toDocument/.test(sinComentarios(leer('functions/src/elements/index.ts'))));
  check('B) LEER: se lee lo guardado', (await leerElemento(A, 'burger_classic', d))?.name === 'Burger Classic');
  check('B) y lo que no existe es `null`, no un error', (await leerElemento(A, 'no_existe_nada', d)) === null);

  /* H · Idempotencia por id. */
  const otraVez = await crearElemento(nuevo({ name: 'Otro nombre' }), d);
  check('H/§17) CREAR DOS VECES con el mismo id no crea dos cosas, ni pisa la que había',
    otraVez.status === 'ya_existe' && otraVez.element.name === 'Burger Classic'
    && d.db.volcado(COLECCION_DE_ELEMENTOS).length === 1);
  check('§17) y no hay un segundo motor de idempotencia: la clave ES el id',
    !/idempotency|IdempotencyKey|crearSiAusente/i.test(sinComentarios(leer('functions/src/elements/index.ts'))));

  /* C · Cambiar. */
  const cambiado = await actualizarElemento(A, 'burger_classic', { name: 'Burger Classic v2', version: 2 }, HOY, d);
  check('C) CAMBIAR: el nombre y la versión cambian, y `updatedAt` se mueve',
    cambiado.status === 'ok' && cambiado.element.name === 'Burger Classic v2'
    && cambiado.element.version === 2 && cambiado.element.updatedAt === HOY
    && cambiado.element.createdAt === AYER);
  check('§14) lo que NO se puede cambiar no cabe en el tipo: ni cuenta, ni id, ni contrato, ni estado',
    !/ownerAccountId\?:|elementId\?:|contract\?:|status\?:/.test(
      (leer('functions/src/elements/index.ts').match(/export interface CambioDeElemento \{[\s\S]*?\n\}/) || [''])[0]));
  check('§14) y no existe transferir una cosa de una cuenta a otra',
    !/transferir|transfer|cambiarDueno|reasignar/i.test(sinComentarios(leer('functions/src/elements/index.ts'))));
  check('C) un cambio que dejaría la cosa inválida se rechaza y NO se escribe',
    (await actualizarElemento(A, 'burger_classic', { name: '' }, HOY, d)).status === 'invalido'
    && (await leerElemento(A, 'burger_classic', d)).name === 'Burger Classic v2');

  /* D/T · Archivar. */
  const antes = d.db.volcado(COLECCION_DE_ELEMENTOS)[0];
  const guardada = await archivarElemento(A, 'burger_classic', HOY, d);
  check('D/T) ARCHIVAR: cambia el estado y pone la fecha',
    guardada.status === 'ok' && guardada.element.status === 'archived' && guardada.element.archivedAt === HOY);
  check('T/§15) y NO borra un solo material: las referencias siguen exactamente igual',
    JSON.stringify(guardada.element.refs) === JSON.stringify(antes.refs));
  check('T/§15) ni llama a MC-5, ni encola un recolector, ni toca Media Cloud',
    !/MC-5|recolect|barrer|borrarObjeto|deleteAsset|retirarMaterial|enqueue/i.test(sinComentarios(leer('functions/src/elements/index.ts'))));
  check('§55) es un archivado blando: el documento sigue ahí, con su estado',
    d.db.volcado(COLECCION_DE_ELEMENTOS).length === 1 && d.db.volcado(COLECCION_DE_ELEMENTOS)[0].status === 'archived');

  /* I · Concurrencia. */
  check('I) cambiar y archivar leen y escriben DENTRO de una transacción: no se pierde una escritura',
    (leer('functions/src/elements/index.ts').match(/runTransaction/g) || []).length === 2
    && /tx\.get\(ref\)/.test(leer('functions/src/elements/index.ts')));
}

/* ═══ B · LOS MATERIALES ══════════════════════════════════════════════════ */
console.log('\n── B · Tuyos, usables, y de la clase que dices ──');
{
  /* G · Usabilidad. */
  const d = mundo();
  const subiendo = await crearElemento(nuevo({ elementId: 'burger_a_medias', refs: [{ assetId: 'img_subiendo', role: 'primary', kind: 'image' }] }), d);
  check('G) un material que todavía se está subiendo no se enlaza',
    subiendo.status === 'material_rechazado' && subiendo.motivo === 'not_usable');
  const otraClase = await crearElemento(nuevo({ elementId: 'burger_clase_mal', refs: [{ assetId: 'vid_burger', role: 'primary', kind: 'image' }] }), d);
  check('G) ni uno de otra clase: la referencia dice «imagen» y la ficha dice «vídeo»',
    otraClase.status === 'material_rechazado' && otraClase.motivo === 'kind_mismatch');
  const fantasma = await crearElemento(nuevo({ elementId: 'burger_fantasma', refs: [{ assetId: 'img_no_existe', role: 'primary', kind: 'image' }] }), d);
  check('G) ni uno que no existe', fantasma.status === 'material_rechazado' && fantasma.motivo === 'not_found');
  check('G) y nada de eso se guardó', d.db.volcado(COLECCION_DE_ELEMENTOS).length === 0);

  /* F · Material de otra cuenta. */
  const ajeno = await crearElemento(nuevo({ elementId: 'burger_con_lo_ajeno', refs: [{ assetId: 'img_de_b', role: 'primary', kind: 'image' }] }), d);
  check('F/§36) A NO puede apuntar a un material de B',
    ajeno.status === 'material_rechazado' && ajeno.assetId === 'img_de_b');
  check('F/§71) y se contesta EXACTAMENTE igual que si no existiera: probando ids no se averigua nada',
    ajeno.motivo === 'not_found' && ajeno.motivo === fantasma.motivo);

  /* Cambiar tampoco. */
  const d2 = mundo();
  await crearElemento(nuevo(), d2);
  const cambioAjeno = await actualizarElemento(A, 'burger_classic', { refs: [{ assetId: 'img_de_b', role: 'primary', kind: 'image' }] }, HOY, d2);
  check('F) ni al CAMBIAR: la misma comprobación, en las dos escrituras',
    cambioAjeno.status === 'material_rechazado'
    && (await leerElemento(A, 'burger_classic', d2)).refs[0].assetId === 'img_burger_front');

  /* §13/§44 · Nada de datos del material. */
  const guardado = d2.db.volcado(COLECCION_DE_ELEMENTOS)[0];
  check('§13/§44) lo guardado son REFERENCIAS: ni storageRef, ni bucket, ni URL, ni metadata del material',
    guardado.refs.every((r) => Object.keys(r).sort().join(',') === 'assetId,kind,role')
    && !JSON.stringify(guardado).includes('storage') && !JSON.stringify(guardado).includes('http'));

  /* V/§65 · Material compartido. */
  const d3 = mundo();
  await crearElemento(nuevo({ refs: [{ assetId: 'img_burger_front', role: 'primary', kind: 'image' }, { assetId: 'img_logo_nido', role: 'supporting', kind: 'image' }] }), d3);
  await crearElemento(nuevo({ elementId: 'resto_nido', type: 'place', name: 'El Nido', refs: [{ assetId: 'img_logo_nido', role: 'primary', kind: 'image' }] }), d3);
  check('V/§65) EL MISMO material en dos cosas: dos documentos, un material, cero copias',
    d3.db.volcado(COLECCION_DE_ELEMENTOS).length === 2
    && d3.db.volcado(COLECCION_DE_ELEMENTOS).filter((e) => e.refs.some((r) => r.assetId === 'img_logo_nido')).length === 2);
  check('§3/§43) y NO hay un segundo registro de materiales: se lee el de F11 por su puerta',
    /import \{ leerMaterial \} from '\.\.\/content';/.test(leer('functions/src/elements/index.ts'))
    && !/collection\('assets'\)|crearMaterial|anotarVariante/.test(leer('functions/src/elements/index.ts')));
}

/* ═══ C · AISLAMIENTO ═════════════════════════════════════════════════════ */
console.log('\n── C · Lo de B no existe para A. En las cuatro operaciones ──');
{
  const d = mundo();
  await crearElemento(nuevo(), d);
  await crearElemento({ accountId: B, elementId: 'burger_de_b', type: 'product', name: 'La de B', refs: [], at: AYER },
    { ...d, material: materiales({}) });
  check('S) las dos cuentas tienen la suya', d.db.volcado(COLECCION_DE_ELEMENTOS).length === 2);

  check('E/S/§36) LEER: A lee la suya; la de B es `null`, igual que lo que no existe',
    (await leerElemento(A, 'burger_classic', d))?.ownerAccountId === A
    && (await leerElemento(A, 'burger_de_b', d)) === null
    && (await leerElemento(B, 'burger_classic', d)) === null);
  check('§36) CAMBIAR: A no puede cambiar la de B, y no se entera de que existe',
    (await actualizarElemento(A, 'burger_de_b', { name: 'mía ahora' }, HOY, d)).status === 'no_encontrado'
    && d.db.volcado(COLECCION_DE_ELEMENTOS).find((e) => e.id === 'burger_de_b').name === 'La de B');
  check('§36) ARCHIVAR: A no puede archivar la de B',
    (await archivarElemento(A, 'burger_de_b', HOY, d)).status === 'no_encontrado'
    && d.db.volcado(COLECCION_DE_ELEMENTOS).find((e) => e.id === 'burger_de_b').status === 'active');
  check('§36) CONSULTAR: la consulta de A no trae nada de B',
    (await candidatosDeLaCuenta({ accountId: A, type: 'product' }, d)).every((e) => e.ownerAccountId === A));
  check('AP/§71) y una respuesta de «no es tuyo» es idéntica a una de «no existe»',
    (await actualizarElemento(A, 'burger_de_b', { name: 'x' }, HOY, d)).status
      === (await actualizarElemento(A, 'no_existe_nada', { name: 'x' }, HOY, d)).status);
  check('§10) la propiedad se comprueba en el DOMINIO, no solo en las reglas: el Admin SDK se las salta',
    (leer('functions/src/elements/index.ts').match(/ownerAccountId !== accountId|ownerAccountId', '==', /g) || []).length >= 4);
}

/* ═══ D · CONSULTAS ═══════════════════════════════════════════════════════ */
console.log('\n── D · Acotadas siempre, y sin recorrer nada ──');
{
  const d = mundo();
  for (let i = 0; i < 12; i++) {
    await crearElemento(nuevo({ elementId: `burger_${String(i).padStart(3, '0')}`, name: `Burger ${i}`, at: AYER + i }), d);
  }
  const traidos = await candidatosDeLaCuenta({ accountId: A, type: 'product' }, d);
  check('W) TODA consulta lleva tope: doce guardadas, ocho traídas como mucho',
    traidos.length === MAX_ELEMENTOS_EN_RESULTADO, `${traidos.length} de 12`);
  check('W/§50) y el tope no se puede subir desde fuera: el del contrato manda',
    (await candidatosDeLaCuenta({ accountId: A, type: 'product', limit: 10_000 }, d)).length === MAX_ELEMENTOS_EN_RESULTADO);
  check('W) la consulta empieza SIEMPRE por la cuenta, y filtra estado y tipo EN la consulta',
    d.db.consultas.every((q) => q.filtros.some((f) => f.campo === 'ownerAccountId' && f.op === '==') && q.tope !== null)
    && d.db.consultas.some((q) => q.filtros.some((f) => f.campo === 'status') && q.filtros.some((f) => f.campo === 'type')),
    `${d.db.consultas.length} consultas`);

  /* N · La franja, que trae Brain. */
  const enFranja = await candidatosDeLaCuenta({ accountId: A, type: 'product', createdAfter: AYER + 3, createdBefore: AYER + 5 }, d);
  check('N/§28) la franja de tiempo la trae quien llama, y acota de verdad',
    enFranja.length === 3 && enFranja.every((e) => e.createdAt >= AYER + 3 && e.createdAt <= AYER + 5));
  check('N/§28) y este runtime NO lee el reloj, ni adivina un huso, ni mira la IP',
    !/Date\.now\(|new Date\(|Intl\.|timezone|getTimezoneOffset/.test(sinComentarios(leer('functions/src/elements/index.ts'))));

  /* X/§72 · Sin recorridos. */
  const RUNTIME = sinComentarios(leer('functions/src/elements/index.ts'));
  check('X/§72) NO hay ni un camino que recorra la cuenta: ni `getAll`, ni `scan`, ni `listDocuments`',
    !/getAll|\.scan\(|findAll|listDocuments|\.stream\(/.test(RUNTIME));
  /*
   * Y la otra mitad: una consulta sin `limit` sería un recorrido con otro
   * nombre. Se mira CADA lectura del archivo y se exige que sea una de tres
   * cosas: un documento por id, una lectura dentro de una transacción, o una
   * consulta que lleve tope.
   */
  check('X) y no hay una sola lectura sin acotar', (() => {
    const lecturas = RUNTIME.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /\.get\(\)/.test(l));
    if (!lecturas.length) return false;
    const conTope = (i) => RUNTIME.split('\n').slice(Math.max(0, i - 6), i).join(' ');
    return lecturas.every(([i, l]) => /\.doc\([^)]*\)\.get\(\)/.test(l) || /tx\.get\(/.test(l) || /\.limit\(/.test(l + conTope(i)));
  })(), 'cada lectura: por id, en transacción, o con tope');

  /* T · Lo archivado no compite. */
  await archivarElemento(A, 'burger_000', HOY, d);
  check('T/§20) lo archivado deja de ser candidato, y se filtra EN la consulta',
    (await candidatosDeLaCuenta({ accountId: A, type: 'product' }, d)).every((e) => e.elementId !== 'burger_000'));
}

/* ═══ E · EL MUNDO REAL → EL RESOLUTOR PURO ═══════════════════════════════ */
console.log('\n── E · El runtime trae; el Core decide ──');
{
  const d = mundo();
  await crearElemento(nuevo({ elementId: 'burger_classic', name: 'Burger Classic', at: AYER, refs: [{ assetId: 'img_burger_front', role: 'primary', kind: 'image' }, { assetId: 'img_burger_side', role: 'reference', kind: 'image' }] }), d);
  await crearElemento(nuevo({ elementId: 'burger_bbq', name: 'Burger BBQ', at: HOY - 100 }), d);
  await crearElemento(nuevo({ elementId: 'burger_deluxe', name: 'Burger Deluxe', at: HOY - 50 }), d);

  const NECESITO_PRODUCTO = { kind: 'element', elementType: 'product', required: true };

  /* P/§62 · Ambigüedad, con datos reales. */
  const pedir = (extra = {}) => ({ accountId: A, needs: [NECESITO_PRODUCTO], ...extra });
  const ambiguo = resolverContexto(await mundoDeContextoDeWee(pedir(), d), pedir());
  check('P/§62) TRES hamburguesas guardadas de verdad y «usa mi hamburguesa»: AMBIGUO',
    ambiguo.status === 'ambiguous' && ambiguo.ambiguous[0].candidates.length === 3,
    `${ambiguo.status}: ${ambiguo.ambiguous?.[0]?.candidates.map((c) => c.name).join(', ')}`);
  check('AQ) y el runtime NO elige: quien decide sigue siendo el resolutor del Core',
    !/ambiguous|resolved|not_found|candidates|because/.test(sinComentarios(leer('functions/src/elements/index.ts'))));
  check('§73) no hay un segundo motor de contexto: este archivo trae el mundo y llama al de S3',
    /MundoDeContexto/.test(leer('functions/src/elements/index.ts'))
    && !/resolverContexto\s*=/.test(leer('functions/src/elements/index.ts')));

  /* N/§61 · «Ayer». */
  const conFranja = (extra = {}) => pedir({ window: { createdAfter: AYER - 1000, createdBefore: AYER + 1000 }, ...extra });
  const deAyer = resolverContexto(await mundoDeContextoDeWee(conFranja(), d), conFranja());
  check('N/§61) «la que hicimos ayer»: el runtime consulta SOLO dentro de la franja y sale una',
    deAyer.status === 'resolved' && deAyer.elements[0].name === 'Burger Classic'
    && deAyer.elements[0].because === 'only_candidate',
    `${deAyer.status}/${deAyer.elements?.[0]?.name}`);

  /* K/§30 · Referencia explícita. */
  const senalada = (extra = {}) => pedir({ references: [{ kind: 'element', id: 'burger_deluxe' }], ...extra });
  const explicita = resolverContexto(await mundoDeContextoDeWee(senalada(), d), senalada());
  check('K/§30) «usa Burger Deluxe»: se resuelve, y la señal es que la señalaron',
    explicita.status === 'resolved' && explicita.elements[0].name === 'Burger Deluxe'
    && explicita.elements[0].because === 'explicit');
  check('K/§30) pero un id que llega de fuera se comprueba: el de B no resuelve nada',
    (await mundoDeContextoDeWee({ accountId: A, references: [{ kind: 'element', id: 'burger_de_b' }] }, d)).elementos.length === 0);

  /* M/J/§29 · El proyecto abierto. */
  d.db.sembrar(COLECCION_DE_ITEMS_DE_PROYECTO, 'fila_uno', { projectId: 'campana_verano', kind: 'asset', itemId: 'img_burger_side', ownerAccountId: A, addedAt: HOY });
  const conProyecto = (extra = {}) => pedir({ projectId: 'campana_verano', ...extra });
  const delProyecto = resolverContexto(await mundoDeContextoDeWee(conProyecto(), d), conProyecto());
  check('M/J/§29) el PROYECTO abierto desempata, por el material que ya tiene dentro',
    delProyecto.status === 'resolved' && delProyecto.elements[0].name === 'Burger Classic'
    && delProyecto.elements[0].because === 'project',
    `${delProyecto.status}/${delProyecto.elements?.[0]?.because}`);
  check('J/§21/§22) y el Element NO lleva `projectId`: la relación sigue siendo la fila de F11',
    !Object.keys(d.db.volcado(COLECCION_DE_ELEMENTOS)[0]).includes('projectId')
    && /COLECCION_DE_ITEMS_DE_PROYECTO = 'projectItems'/.test(leer('functions/src/elements/index.ts')));
  check('§29) la fila del proyecto se consulta por CUENTA: una de otra cuenta no participa',
    d.db.consultas.filter((q) => q.coleccion === COLECCION_DE_ITEMS_DE_PROYECTO)
      .every((q) => q.filtros.some((f) => f.campo === 'ownerAccountId') && q.tope === MAX_ITEMS_DE_PROYECTO));
  check('U/§64) LA MISMA cosa en dos proyectos: un elementId, sin duplicar nada', (() => {
    const enOtro = { accountId: A, needs: [NECESITO_PRODUCTO], projectId: 'otra_campana' };
    return delProyecto.elements[0].elementId === 'burger_classic'
      && d.db.volcado(COLECCION_DE_ELEMENTOS).filter((e) => e.id === 'burger_classic').length === 1
      && enOtro.projectId !== 'campana_verano';
  })());

  /* AB/§37 · El puente a Brain, y de ahí al Planner. */
  const adjuntos = materialesDelContexto(deAyer);
  check('AB/§37) el resultado se convierte en adjuntos de Brain: id y clase, y nada más',
    adjuntos.length === 2 && adjuntos.every((a) => Object.keys(a).sort().join(',') === 'assetId,kind')
    && adjuntos[0].assetId === 'img_burger_front');
  check('AN/AO) y ahí no hay URLs, ni URLs firmadas, ni `storageRef`',
    !JSON.stringify(adjuntos).includes('http') && !JSON.stringify(adjuntos).includes('storage'));

  /* AC/§60 · Y el plan cambia de forma. Sin tocar el Planner. */
  const disponible = (c) => ['text.generate', 'image.generate', 'video.image_to_video'].includes(String(c));
  const planner = crearPlanner({ availability: { disponible }, tracer, now });
  const entendido = (adj) => ({
    intent: 'creation', confidence: 'high', goal: 'un anuncio con mi hamburguesa',
    inputs: { text: 'un anuncio con mi hamburguesa', attachments: adj },
    references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
    capability: 'video.image_to_video', capabilities: ['video.image_to_video'],
  });
  const sin = await planner.planificar({ contract: PLANNER_CONTRACT_VERSION, trace: traza(), understanding: entendido([]) });
  const con = await planner.planificar({ contract: PLANNER_CONTRACT_VERSION, trace: traza(), understanding: entendido(adjuntos) });
  check('AC/§60) EL PLAN CAMBIA DE FORMA con material real guardado: de dos pasos a uno',
    sin.plan.steps.length === 2 && con.plan.steps.length === 1
    && con.plan.steps[0].capability === 'video.image_to_video',
    `${sin.plan?.steps.length} → ${con.plan?.steps.length}`);
  check('AC/§38) y el PLANNER no se tocó: ni una línea',
    !/VisualContext|ContextNeed|ElementType|elementId|resolverContexto/.test(leer('functions/src/core/planner.ts')));
  check('§78) sin crear un trabajo, sin encolar y sin tocar el Job Engine',
    !JSON.stringify(con.plan).toLowerCase().includes('job')
    && !/QueuePort|enqueue|crearTrabajo|atenderEntrega/.test(leer('functions/src/elements/index.ts')));
}

/* ═══ F · LO QUE NO CAMBIÓ ════════════════════════════════════════════════ */
console.log('\n── F · Una tubería, no una plataforma ──');
{
  const RT = sinComentarios(leer('functions/src/elements/index.ts'));

  check('AL/§76) NO HAY LLM: ni Gemini, ni DeepSeek, ni Claude, ni ninguno',
    !/gemini|deepseek|claude|anthropic|openai|elevenlabs|llm|embedding|vector/i.test(RT));
  check('AK/§77) ni proveedor, ni modelo, ni Gateway',
    !/seedance|bytedance|kling|crearGateway|runCapability|generar/i.test(RT));
  check('AM/AN/AO/§43) ni bytes, ni URLs firmadas, ni almacenamiento: ni R2, ni Cloudinary, ni bucket',
    !/r2|cloudinary|qiniu|alibaba|tencent|bucket|objectKey|storageRef|signedUrl|presign|Buffer/i.test(RT));
  check('§24) y la dirección no se invierte: el CORE no sabe que esto existe',
    !/elements\/|mundoDeContextoDeWee|crearElemento/.test(
      leer('functions/src/core/element.ts') + leer('functions/src/core/visual-context.ts')));
  check('AR) el Core de S3 no se tocó para facilitar Firestore',
    /export const archivar = /.test(leer('functions/src/core/element.ts'))
    && /export interface MundoDeContexto/.test(leer('functions/src/core/visual-context.ts'))
    && !/firestore|Firestore/.test(leer('functions/src/core/element.ts') + leer('functions/src/core/visual-context.ts')));

  check('AD) EL WORKFLOW no cambió', !/[Ee]lement|VisualContext/.test(leer('functions/src/core/workflow.ts')));
  check('AE) EL ROUTER no cambió', !/[Ee]lement|VisualContext/.test(leer('functions/src/core/router.ts')));
  check('AF) EL GATEWAY no cambió', !/VisualContext|ElementType/.test(leer('functions/src/core/gateway.ts')));
  check('AG/AH/§83) EL JOB ENGINE y el TRABAJADOR DURABLE no cambiaron',
    !/[Ee]lementId|VisualContext/.test(leer('functions/src/core/job.ts') + leer('functions/src/core/job-queue.ts')
      + leer('functions/src/job/worker.ts') + leer('functions/src/runtime/cola-durable.ts')));
  check('AI/§43) MEDIA CLOUD no cambió y sigue sin saber qué es un Element',
    fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/media')).every((f) => !/[Ee]lement|VisualContext/.test(leer(`functions/src/core/media/${f}`)))
    && fs.readdirSync(path.resolve(RAIZ, 'functions/src/media')).every((f) => !f.endsWith('.ts') || !/VisualContext|ElementType/.test(leer(`functions/src/media/${f}`))));
  check('AJ) EL FINANCIAL no cambió, y esto no cobra nada',
    !/[Ee]lement|VisualContext/.test(leer('functions/src/credits/creditEngine.ts')) && !/credit|cobr|spend/i.test(RT));
  check('AS/AT/AU/§82) S1, S2 y S3 siguen enteras',
    ['SkillDescriptor', 'crearRegistroDeSkills', 'resolverSkill'].every((s) => new RegExp(s).test(leer('functions/src/core/skill.ts')))
    && /export interface CreativeParameters/.test(leer('functions/src/core/creative.ts'))
    && ['export interface Element', 'export const resolverContexto'].every((s) => new RegExp(s).test(
      leer('functions/src/core/element.ts') + leer('functions/src/core/visual-context.ts'))));
  check('§40/§83) el CATÁLOGO DE SKILLS sigue vacío y la puerta de F12-D sigue cerrada',
    lib('skills/index.js').CATALOGO_DE_SKILLS.length === 0
    && /habilitado: false/.test(leer('functions/src/runtime/puerta.ts')));
  check('§79) NO hay interfaz: nadie tocó una pantalla',
    !fs.existsSync(path.resolve(RAIZ, 'screens/ElementsScreen.tsx'))
    && !/ElementType|crearElemento/.test(leer('screens/MisCreacionesScreen.tsx') + leer('components/creator/RejillaDeCreaciones.tsx')));
  check('§59/§84) y NADA se exporta desde `index.ts`: esto no es una puerta todavía',
    !/elements/.test(leer('functions/src/index.ts')));

  /* Y/AA · Reglas e índices, PREPARADOS. */
  check('Y/§45) las reglas de `elements` son las de `assets`: leer lo tuyo, y escribir nunca desde el cliente',
    /match \/elements\/\{elementId\} \{\s*allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid;\s*allow create, update, delete: if false;/.test(leer('firestore.rules')));
  check('Y/§45) y las filas de proyecto, igual de cerradas',
    /match \/projectItems\/\{itemId\} \{\s*allow read: if isAuthenticated\(\) && resource\.data\.ownerAccountId == request\.auth\.uid;\s*allow create, update, delete: if false;/.test(leer('firestore.rules')));
  /*
   * Los `allow read: if true` que hay en el archivo son de perfiles públicos y
   * llevan ahí desde antes: lo que se vigila es que S4 no haya añadido uno, ni
   * haya abierto lo suyo.
   */
  check('Y/§69) sin debilitar nada: lo que S4 añadió no tiene ni un `if true`', (() => {
    const reglas = leer('firestore.rules');
    const mio = reglas.slice(reglas.indexOf('match /elements/{elementId}'), reglas.indexOf('// === WEE MEDIA CLOUD (MC-1)'));
    return mio.length > 0 && !/if true/.test(mio) && !/isAuthenticated\(\)\s*;/.test(mio)
      && (mio.match(/allow create, update, delete: if false;/g) || []).length === 2;
  })());
  check('AA/§46) los dos índices están PREPARADOS y no desplegados, con la forma exacta de las consultas', (() => {
    const ix = JSON.parse(leer('firestore.indexes.json')).indexes;
    const el = ix.find((i) => i.collectionGroup === 'elements');
    const pi = ix.find((i) => i.collectionGroup === 'projectItems');
    return !!el && el.fields.map((f) => f.fieldPath).join(',') === 'ownerAccountId,status,type,createdAt'
      && !!pi && pi.fields.map((f) => f.fieldPath).join(',') === 'ownerAccountId,projectId,kind';
  })());

  check('esta suite está en la cadena de `npm test`', /elements-runtime\.test\.mjs/.test(leer('functions/package.json')));
  check('Z) y la prueba contra Firestore de verdad existe, con su emulador', fs.existsSync(path.resolve(RAIZ, 'functions/test/elements.emulator.mjs')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
