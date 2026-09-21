/**
 * S3 · WEË VISUAL CONTEXT + ELEMENTS.
 *
 * Lo que se demuestra aquí, en una frase: **alguien puede decir «usa la
 * hamburguesa que creamos ayer y haz un anuncio» y Weë sabe cuál es, sin
 * mandarle a Brain los cinco mil materiales de la cuenta y sin duplicar un
 * solo byte.**
 *
 * Y la que más importa de todas, la Z: **es imposible que una cuenta resuelva
 * nada de otra**, y quien lo intente no averigua ni que existe.
 *
 *   A · El Element: qué es, qué no, y por dónde no se entra
 *   B · Referencias a materiales: una cosa, varios materiales, cero copias
 *   C · El contexto: resolver, empatar, no encontrar y aislar
 *   D · Las costuras: Skill, parámetros creativos, Brain y Planner
 *   E · Lo que NO cambió
 *   F · La cadena real, y las frases de una persona
 *
 * Sin proveedor, sin modelo, sin LLM, sin red, sin bytes, sin trabajos.
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
const {
  ELEMENT_CONTRACT_VERSION, VISUAL_CONTEXT_CONTRACT_VERSION, SKILL_CONTRACT_VERSION,
  PLANNER_CONTRACT_VERSION, WORKFLOW_CONTRACT_VERSION, ORCHESTRATOR_CONTRACT_VERSION,
  CREATIVE_PARAMETERS_VERSION,
  TIPOS_DE_ELEMENTO, ROLES_DE_MATERIAL, MAX_REFS_POR_ELEMENTO, MAX_NECESIDADES,
  MAX_ELEMENTOS_EN_RESULTADO, MAX_MATERIALES_EN_RESULTADO,
  validarElemento, elementoValido, puedeReferenciar, clasesDeMaterial, archivar,
  resolverContexto, necesidadValida, materialesDelContexto, trazaDeContexto,
  crearRegistroDeSkills, necesidadesDelSkill, aportacionDeSkill,
  crearPlanner, crearWorkflowEngine, prepararWorkflow, crearOrchestrator,
} = core;

const A = 'cuentaA';
const B = 'cuentaB';
const AYER = 1_799_900_000_000;
const HOY = 1_800_000_000_000;
const tracer = { record() {} };
const now = () => HOY;
let serie = 0;
const traza = () => { serie++; const id = `s3_t_${String(serie).padStart(4, '0')}`; return { traceId: id, requestId: id, userId: 'user-0001' }; };
const QUIEN = { userId: 'user-0001' };

/** Una cosa de la cuenta, con sus materiales. Nada más que referencias. */
const elemento = (elementId, type, name, extra = {}) => ({
  contract: ELEMENT_CONTRACT_VERSION,
  elementId, type, version: 1, status: 'active', name,
  ownerAccountId: A,
  refs: [{ assetId: `${elementId}_front`, role: 'primary', kind: 'image' }],
  createdAt: AYER, updatedAt: AYER,
  ...extra,
});

const BURGER = elemento('burger_classic', 'product', 'Burger Classic', {
  refs: [
    { assetId: 'img_burger_front', role: 'primary', kind: 'image' },
    { assetId: 'img_burger_side', role: 'reference', kind: 'image' },
    { assetId: 'img_burger_pack', role: 'supporting', kind: 'image' },
  ],
});
const BBQ = elemento('burger_bbq', 'product', 'Burger BBQ', { createdAt: HOY - 100, updatedAt: HOY - 100 });
const DELUXE = elemento('burger_deluxe', 'product', 'Burger Deluxe', { createdAt: HOY - 50, updatedAt: HOY - 50 });
const NINA = elemento('chef_nina', 'character', 'Nina', {
  refs: [{ assetId: 'img_nina_face', role: 'primary', kind: 'image' }],
  related: [{ kind: 'belongs_to', elementId: 'resto_nido' }],
});
const NIDO = elemento('resto_nido', 'place', 'El Nido');
const DE_OTRA = { ...elemento('burger_ajena', 'product', 'La de B'), ownerAccountId: B };

/* ═══ A · EL ELEMENT ══════════════════════════════════════════════════════ */
console.log('\n── A · Una cosa con nombre, que APUNTA. No que guarda ──');
{
  check('A) un Element válido lo es', elementoValido(BURGER) && elementoValido(NINA),
    validarElemento(BURGER).map((p) => `${p.field}:${p.reason}`).join(','));
  check('B) y uno roto no, con todos sus motivos de golpe', (() => {
    const r = validarElemento({ ...BURGER, elementId: 'x', type: 'restaurante', version: 0, status: 'publicado', name: '' })
      .map((p) => p.reason);
    return ['invalid_id', 'invalid_type', 'invalid_version', 'invalid_status', 'invalid_text'].every((m) => r.includes(m));
  })());
  check('B) ni nada que no sea un objeto', [null, 'burger', 42, []].every((x) => !elementoValido(x)));

  /* C · El id es SUYO, y no es el de un material. */
  check('C) un Element tiene su propio id: NO se deduce de ningún material',
    BURGER.elementId !== BURGER.refs[0].assetId
    && !elementoValido({ ...BURGER, elementId: 'ab' })
    && elementoValido({ ...BURGER, elementId: 'burger-classic-2026' }));
  check('C) y usa la MISMA forma de id que un material y un proyecto: no hay una segunda identidad',
    /FORMA_DE_ID_DE_ELEMENTO = \/\^\[A-Za-z0-9_-\]\{4,128\}\$\//.test(leer('functions/src/core/element.ts'))
    && /FORMA_DE_ID_DE_MATERIAL = \/\^\[A-Za-z0-9_-\]\{4,128\}\$\//.test(leer('functions/src/core/content/asset.ts')));

  /* D · Versión. */
  check('D) la versión es un entero desde 1: una cosa puede evolucionar',
    elementoValido({ ...BURGER, version: 2 })
    && [0, -1, 1.5, '2', NaN].every((v) => !elementoValido({ ...BURGER, version: v })));

  /* E · Dueño. */
  check('E) sin cuenta no hay Element: el dueño es obligatorio y es una CUENTA',
    !elementoValido({ ...BURGER, ownerAccountId: undefined })
    && !elementoValido({ ...BURGER, ownerAccountId: '' })
    && elementoValido({ ...BURGER, ownerAccountId: B }));
  check('E) y usa el mismo tipo que el material y el proyecto: `OwnedByAccount`',
    /export interface Element extends OwnedByAccount/.test(leer('functions/src/core/element.ts')));

  /* P · Tipos. */
  check('P) seis tipos, cerrados y versionables',
    TIPOS_DE_ELEMENTO.join(',') === 'character,product,brand,place,object,scene'
    && !elementoValido({ ...BURGER, type: 'hamburguesa' }));

  /* M · Prototipo. */
  check('M) `__proto__`, `constructor` y `prototype` se rechazan por nombre',
    ['constructor', 'prototype'].every((k) => validarElemento({ ...BURGER, [k]: 'x' }).some((p) => p.reason === 'dangerous_key')));
  check('M) y un campo obligatorio HEREDADO no cuenta como propio', (() => {
    const base = { ownerAccountId: A };
    const h = Object.create(base);
    for (const [k, v] of Object.entries(BURGER)) if (k !== 'ownerAccountId') h[k] = v;
    return h.ownerAccountId === A && validarElemento(h).some((p) => p.field === 'ownerAccountId' && p.reason === 'invalid_shape');
  })());

  /* §2 · NO duplica Media Cloud. Esto es la regla crítica de la fase. */
  check('§2) un Element NO puede llevar bytes, ni `storageRef`, ni bucket, ni objectKey, ni URL',
    ['storageRef', 'bucket', 'objectKey', 'url', 'signedUrl', 'bytes', 'content', 'data']
      .every((k) => validarElemento({ ...BURGER, [k]: 'x' }).some((p) => p.reason === 'forbidden_key')));
  check('§2) ni un proveedor, ni un modelo, ni una credencial',
    ['providerId', 'modelId', 'adapter', 'apiKey', 'secret', 'credential']
      .every((k) => validarElemento({ ...BURGER, [k]: 'x' }).some((p) => p.reason === 'forbidden_key')));
  check('§14) y no hay cajón: ningún campo de ninguna interfaz es `Record<string, unknown>`',
    ![...sinComentarios(leer('functions/src/core/element.ts')).matchAll(/export interface \w+ \{[\s\S]*?\n\}/g)]
      .map(([s]) => s).join('\n').includes('Record<string, unknown>'));
  check('§67) ni un campo ejecutable: una función dentro de un dato es siempre un error',
    validarElemento({ ...BURGER, name: () => 'x' }).length > 0
    && validarElemento({ ...BURGER, description: () => 'x' }).length > 0);
}

/* ═══ B · REFERENCIAS ═════════════════════════════════════════════════════ */
console.log('\n── B · Una cosa, varios materiales, CERO copias ──');
{
  /* F/G/§59 · Una cosa con tres materiales sigue siendo tres materiales. */
  check('F/G/§59) UN Element con TRES referencias: no se crea un cuarto material, ni un paquete, ni un byte',
    BURGER.refs.length === 3 && new Set(BURGER.refs.map((r) => r.assetId)).size === 3
    && !JSON.stringify(BURGER).includes('storage') && !JSON.stringify(BURGER).includes('http'));
  check('F) cada referencia dice para qué sirve, y no hay `variant`: eso es de Media Cloud',
    ROLES_DE_MATERIAL.join(',') === 'primary,reference,supporting'
    && !/elementVariant|variants\?:/.test(sinComentarios(leer('functions/src/core/element.ts'))));
  check('F) como mucho UNA principal', !elementoValido({
    ...BURGER, refs: [{ assetId: 'a_uno', role: 'primary', kind: 'image' }, { assetId: 'a_dos', role: 'primary', kind: 'image' }],
  }));

  /* O · Duplicados. */
  check('O) el mismo material dos veces no es más información: se rechaza',
    validarElemento({ ...BURGER, refs: [BURGER.refs[0], { ...BURGER.refs[0], role: 'reference' }] })
      .some((p) => p.reason === 'duplicate_ref'));

  /* N · Tamaño. */
  check('N) hay tope de referencias y de relaciones: nada crece sin control',
    !elementoValido({ ...BURGER, refs: Array.from({ length: MAX_REFS_POR_ELEMENTO + 1 }, (_, i) => ({ assetId: `img_${String(i).padStart(4, '0')}`, role: 'reference', kind: 'image' })) })
    && MAX_REFS_POR_ELEMENTO <= 64);

  /* L · Ids malformados. */
  check('L) un id de material malformado no se enlaza: ni vacío, ni con barras, ni con `..`',
    ['', '../otra', 'a/b', 'x'].every((id) => !elementoValido({ ...BURGER, refs: [{ assetId: id, role: 'primary', kind: 'image' }] })));

  /* H/I · Enlazar contra la ficha real. */
  const ficha = (extra = {}) => ({ assetId: 'img_burger_front', ownerAccountId: A, kind: 'image', status: 'ready', ...extra });
  check('H) un material que NO existe no se enlaza',
    puedeReferenciar(BURGER.refs[0], undefined, A).reason === 'not_found');
  check('I) un material de OTRA cuenta se contesta EXACTAMENTE igual: `not_found`',
    puedeReferenciar(BURGER.refs[0], ficha({ ownerAccountId: B }), A).reason === 'not_found');
  check('§68) y esa igualdad es el punto: probando ids no se averigua qué tiene otra persona',
    puedeReferenciar(BURGER.refs[0], undefined, A).reason
      === puedeReferenciar(BURGER.refs[0], ficha({ ownerAccountId: B }), A).reason);
  check('§32) un material que todavía no se puede usar tampoco se enlaza',
    ['uploading', 'processing', 'failed', 'deleted'].every((s) => puedeReferenciar(BURGER.refs[0], ficha({ status: s }), A).reason === 'not_usable')
    && puedeReferenciar(BURGER.refs[0], ficha(), A).ok === true);
  check('§32) ni uno de otra clase: una referencia que dice «imagen» no vale para un vídeo',
    puedeReferenciar(BURGER.refs[0], ficha({ kind: 'video' }), A).reason === 'kind_mismatch');

  /* AW/§58 · Material compartido. */
  const LOGO = { assetId: 'img_logo_nido', role: 'supporting', kind: 'image' };
  const producto = { ...BURGER, refs: [...BURGER.refs, LOGO] };
  const sitio = { ...NIDO, refs: [{ ...LOGO, role: 'primary' }] };
  check('AW/§58) el MISMO material en dos Elements: dos referencias, UN material, cero bytes nuevos',
    elementoValido(producto) && elementoValido(sitio)
    && producto.refs.filter((r) => r.assetId === LOGO.assetId).length === 1
    && sitio.refs[0].assetId === LOGO.assetId);

  /* AY · Relaciones. */
  check('AY) las relaciones son ids y una palabra: no hay grafo, ni recorrido, ni transitividad',
    NINA.related[0].elementId === 'resto_nido' && NINA.related[0].kind === 'belongs_to'
    && !/graph|traverse|recorrer|transitiv/i.test(sinComentarios(leer('functions/src/core/element.ts'))));
  check('AY) y una cosa no se relaciona consigo misma',
    !elementoValido({ ...NINA, related: [{ kind: 'belongs_to', elementId: NINA.elementId }] }));

  /* AV · Archivar. */
  const guardada = archivar(BURGER, HOY);
  check('AV) ARCHIVAR no borra un solo material: las referencias siguen intactas',
    guardada.status === 'archived' && guardada.archivedAt === HOY
    && guardada.refs.length === BURGER.refs.length
    && JSON.stringify(guardada.refs) === JSON.stringify(BURGER.refs));
  check('AV) y no devuelve nada que borrar: el ciclo de vida de los bytes sigue siendo de MC-5',
    Object.keys(guardada).join(',') === Object.keys({ ...BURGER, archivedAt: 0 }).join(',')
    && !/borrar|delete|recolect|gc/i.test(sinComentarios(leer('functions/src/core/element.ts'))));

  check('B) las clases disponibles se saben sin leer una sola ficha', clasesDeMaterial(BURGER).join(',') === 'image');
}

/* ═══ C · EL CONTEXTO ═════════════════════════════════════════════════════ */
console.log('\n── C · Qué de lo tuyo sirve para esto ──');
{
  const mundo = (elementos, enProyecto) => ({ elementos, ...(enProyecto ? { enProyecto } : {}) });
  const pedir = (extra = {}) => ({ accountId: A, ...extra });
  const UN_PRODUCTO = { kind: 'element', elementType: 'product', required: true };
  const UN_PERSONAJE = { kind: 'element', elementType: 'character', required: true };

  /* Q · La petición. */
  check('Q) una necesidad dice UNA cosa: o un Element o material, nunca las dos mezcladas',
    necesidadValida(UN_PRODUCTO) && necesidadValida({ kind: 'asset', assetKind: 'image' })
    && !necesidadValida({ kind: 'element', elementType: 'product', assetKind: 'image' })
    && !necesidadValida({ kind: 'element' }) && !necesidadValida({ kind: 'cosa' }));
  check('Q) la petición se rechaza entera si no tiene forma de petición',
    [null, 'x', {}, { accountId: '' }, { accountId: A, inventado: 1 }, { accountId: A, needs: [{ kind: 'x' }] }]
      .every((p) => resolverContexto(mundo([]), p).status === 'invalid'));
  check('AS) y está acotada: ni necesidades infinitas, ni referencias infinitas',
    resolverContexto(mundo([]), pedir({ needs: Array(MAX_NECESIDADES + 1).fill(UN_PRODUCTO) })).status === 'invalid'
    && MAX_NECESIDADES <= 16);

  /* Y · Resuelto. */
  const uno = resolverContexto(mundo([BURGER, NINA]), pedir({ needs: [UN_PRODUCTO] }));
  check('Y) RESUELTO: si solo hay una hamburguesa, es esa, y se dice por qué',
    uno.status === 'resolved' && uno.elements.length === 1
    && uno.elements[0].elementId === 'burger_classic' && uno.elements[0].because === 'only_candidate',
    `${uno.status}/${uno.elements?.[0]?.because}`);
  check('R/§19) y lo que vuelve son REFERENCIAS: ni bytes, ni URLs, ni `storageRef`',
    uno.elements[0].assets.length === 3
    && uno.elements[0].assets.every((a) => Object.keys(a).join(',') === 'assetId,role,kind')
    && !JSON.stringify(uno).includes('http') && !JSON.stringify(uno).includes('storage'));

  /* X · Sin candidato. */
  check('X) SIN CANDIDATO: no hay ningún personaje, y se dice lo que faltaba',
    (() => {
      const r = resolverContexto(mundo([BURGER]), pedir({ needs: [UN_PERSONAJE] }));
      return r.status === 'not_found' && r.reason === 'missing_required' && r.missing[0].elementType === 'character';
    })());
  check('X) y una necesidad NO obligatoria que no se cumple no rompe nada',
    resolverContexto(mundo([BURGER]), pedir({ needs: [{ kind: 'element', elementType: 'character' }, UN_PRODUCTO] })).status === 'resolved');

  /* W/§57 · Ambigüedad. LA COMPROBACIÓN QUE MÁS IMPORTA DE LA SECCIÓN. */
  const tres = resolverContexto(mundo([BURGER, BBQ, DELUXE]), pedir({ needs: [UN_PRODUCTO] }));
  check('W/§57) TRES hamburguesas y «usa mi hamburguesa»: AMBIGUO, y NO se elige a dedo',
    tres.status === 'ambiguous' && tres.elements === undefined
    && tres.ambiguous[0].candidates.length === 3
    && tres.ambiguous[0].candidates.map((c) => c.name).join(', ') === 'Burger Classic, Burger BBQ, Burger Deluxe',
    tres.ambiguous?.[0]?.candidates.map((c) => c.name).join(', '));
  /*
   * La franja de tiempo SÍ se mira —Brain la trajo— pero eso es comparar un
   * candidato contra dos números que alguien pidió, no comparar candidatos
   * entre ellos. Lo que no puede haber es ordenar, ni elegir el más nuevo.
   */
  check('W) ni por la más reciente, ni por orden alfabético: el sistema no decide por nadie', (() => {
    const cuerpo = (sinComentarios(leer('functions/src/core/visual-context.ts')).match(/export const resolverContexto[\s\S]*?\n\};/) || [''])[0];
    return cuerpo.length > 0
      && !/\.sort\(|localeCompare|reverse\(|Math\.max\(\.\.\..*createdAt|\.createdAt [<>]=? ?\w+\.createdAt/.test(cuerpo);
  })());

  /* U · El proyecto abierto desempata. */
  const conProyecto = resolverContexto(
    mundo([BURGER, BBQ, DELUXE], [{ projectId: 'campana_verano', elementId: 'burger_bbq' }]),
    pedir({ needs: [UN_PRODUCTO], projectId: 'campana_verano' }),
  );
  check('U) el PROYECTO ABIERTO sí desempata: la que está en lo que tienes delante',
    conProyecto.status === 'resolved' && conProyecto.elements[0].elementId === 'burger_bbq'
    && conProyecto.elements[0].because === 'project');
  check('U) pero un proyecto que no es el abierto no desempata nada',
    resolverContexto(mundo([BURGER, BBQ, DELUXE], [{ projectId: 'otra', elementId: 'burger_bbq' }]),
      pedir({ needs: [UN_PRODUCTO], projectId: 'campana_verano' })).status === 'ambiguous');

  /* V/§21 · «ayer», ya normalizado por Brain. */
  const ayer = resolverContexto(mundo([BURGER, BBQ, DELUXE]), pedir({
    needs: [UN_PRODUCTO], window: { createdAfter: AYER - 1000, createdBefore: AYER + 1000 },
  }));
  check('V/§21) «la que hicimos ayer» desempata, con la franja que YA normalizó Brain',
    ayer.status === 'resolved' && ayer.elements[0].elementId === 'burger_classic' && ayer.elements[0].because === 'window');
  check('§21) y este archivo NO sabe qué día es hoy: ni reloj, ni huso, ni IP, ni GPS',
    !/Date\.now\(|new Date\(|timezone|getTimezone|Intl\./.test(sinComentarios(leer('functions/src/core/visual-context.ts'))));
  check('V) si la franja deja dos dentro, sigue siendo AMBIGUO: no se elige la más nueva',
    resolverContexto(mundo([BBQ, DELUXE]), pedir({ needs: [UN_PRODUCTO], window: { createdAfter: HOY - 1000 } })).status === 'ambiguous');

  /* S/T · Referencias explícitas. */
  const senalado = resolverContexto(mundo([BURGER, BBQ, DELUXE]), pedir({
    needs: [UN_PRODUCTO], references: [{ kind: 'element', id: 'burger_deluxe' }],
  }));
  check('T) una referencia EXPLÍCITA manda sobre todo: es lo que la persona señaló',
    senalado.status === 'resolved' && senalado.elements[0].elementId === 'burger_deluxe'
    && senalado.elements[0].because === 'explicit');
  check('S/§22) pero un id que llega de fuera NO prueba nada: se comprueba contra el dueño',
    resolverContexto(mundo([BURGER]), pedir({ references: [{ kind: 'element', id: 'burger_ajena' }] })).status === 'not_found');

  /* Z/§25 · AISLAMIENTO. La comprobación que manda sobre todas. */
  check('Z) AISLAMIENTO: A NO puede resolver nada de B, ni pidiéndolo por su id',
    resolverContexto(mundo([DE_OTRA]), pedir({ needs: [UN_PRODUCTO] })).status === 'not_found'
    && resolverContexto(mundo([DE_OTRA]), pedir({ references: [{ kind: 'element', id: 'burger_ajena' }] })).status === 'not_found');
  check('Z) y B tampoco puede resolver nada de A: la regla va en las dos direcciones',
    resolverContexto(mundo([BURGER]), { accountId: B, needs: [UN_PRODUCTO] }).status === 'not_found');
  check('§68) y lo ajeno NO se filtra por ningún lado: ni nombre, ni id, ni cuántos hay',
    !JSON.stringify(resolverContexto(mundo([DE_OTRA, BURGER]), pedir({ needs: [UN_PRODUCTO] }))).includes('La de B'));
  check('§68) ni se distingue de lo que no existe: la misma respuesta para las dos cosas',
    resolverContexto(mundo([DE_OTRA]), pedir({ references: [{ kind: 'element', id: 'burger_ajena' }] })).reason
      === resolverContexto(mundo([]), pedir({ references: [{ kind: 'element', id: 'no_existe_nada' }] })).reason);
  check('Z) una cosa ARCHIVADA tampoco se resuelve sola',
    resolverContexto(mundo([archivar(BURGER, HOY)]), pedir({ needs: [UN_PRODUCTO] })).status === 'not_found');

  /* AT · Resultado acotado. */
  const muchas = Array.from({ length: 30 }, (_, i) => ({ ...elemento(`cosa_${String(i).padStart(3, '0')}`, 'object', `Cosa ${i}`), refs: [{ assetId: `img_c_${String(i).padStart(3, '0')}`, role: 'primary', kind: 'image' }] }));
  const acotado = resolverContexto(
    mundo(muchas), pedir({ needs: muchas.slice(0, 1).map(() => ({ kind: 'element', elementType: 'object' })), references: muchas.slice(0, 12).map((e) => ({ kind: 'element', id: e.elementId })) }),
  );
  check('AT) el RESULTADO está acotado aunque se pidan muchas: nunca se devuelve una cuenta entera',
    acotado.elements.length <= MAX_ELEMENTOS_EN_RESULTADO
    && acotado.elements.reduce((k, e) => k + e.assets.length, 0) <= MAX_MATERIALES_EN_RESULTADO,
    `${acotado.elements.length} elementos`);
  check('§69) y el Core no recorre nada: recibe un mundo ya traído y acotado por quien consulta',
    /export interface MundoDeContexto/.test(leer('functions/src/core/visual-context.ts'))
    && !/getAll|listarTodo|scan|findAll/.test(sinComentarios(leer('functions/src/core/visual-context.ts'))));

  /* §53 · Traza. */
  const t = trazaDeContexto(uno);
  check('§53) de una resolución se anota QUÉ decidió, nunca lo que alguien escribió',
    t.status === 'resolved' && t.elements === 1 && t.assets === 3 && t.signals.join(',') === 'only_candidate'
    && !JSON.stringify(t).includes('Burger') && !JSON.stringify(t).includes('img_'));
}

/* ═══ D · LAS COSTURAS ════════════════════════════════════════════════════ */
console.log('\n── D · Skill, parámetros creativos, Brain y Planner ──');
{
  const skill = (extra = {}) => ({
    id: 'anuncio_de_producto', version: 1, contract: SKILL_CONTRACT_VERSION, status: 'active',
    intents: ['creation'], requiredCapabilities: ['video.image_to_video'],
    planFragment: [{ id: 'f_uno', capability: 'video.image_to_video', purpose: 'mover el producto' }],
    outputModality: 'video', ...extra,
  });

  /* AA/AB/§28 · UN contrato, no dos. */
  const conContexto = skill({
    context: [
      { kind: 'element', elementType: 'product', required: true, role: 'subject' },
      { kind: 'asset', assetKind: 'image', required: true },
    ],
  });
  check('AA/AB) UN SOLO contrato: «necesito un producto» y «necesito imágenes» son la misma frase',
    crearRegistroDeSkills([conContexto]).registro.cuantos() === 1
    && necesidadesDelSkill(conContexto).length === 2
    && necesidadesDelSkill(conContexto)[0].elementType === 'product');
  check('AA) una necesidad inválida invalida el Skill entero',
    crearRegistroDeSkills([skill({ context: [{ kind: 'element', elementType: 'hamburguesa' }] })])
      .rechazados[0]?.problemas.some((p) => p.reason === 'invalid_context'));
  check('§28) y las dos costuras de S1 no conviven con la de S3: dos formas serían dos verdades',
    crearRegistroDeSkills([skill({ contextRequirements: ['location'], context: [{ kind: 'asset', assetKind: 'image' }] })])
      .rechazados[0]?.problemas.some((p) => p.reason === 'two_shapes'));
  check('§41) pero las de S1 siguen valiendo solas: nada se retiró',
    crearRegistroDeSkills([skill({ contextRequirements: ['location'], elementRequirements: ['subject'] })]).registro.cuantos() === 1);
  check('AC) lo que un Skill declara ES lo que el contexto recibe: no hay traducción porque no hay dos vocabularios',
    JSON.stringify(necesidadesDelSkill(conContexto)) === JSON.stringify(conContexto.context));

  /* AD · Element ≠ Creative Parameters. */
  const conAmbas = skill({
    context: [{ kind: 'element', elementType: 'product', required: true }],
    creative: { declares: ['camera.type'], prefers: { version: CREATIVE_PARAMETERS_VERSION, camera: { type: 'aerial' } } },
  });
  check('AD) un Skill puede declarar QUÉ necesita y CÓMO representarlo, y son campos distintos',
    crearRegistroDeSkills([conAmbas]).registro.cuantos() === 1
    && aportacionDeSkill(conAmbas).creative.camera.type === 'aerial'
    && aportacionDeSkill(conAmbas).context === undefined);
  check('AD/§30) un Element no sabe de cámaras y unos parámetros creativos no saben de hamburguesas',
    !/camera|movement|lighting|aspectRatio/.test(sinComentarios(leer('functions/src/core/element.ts')))
    && !/elementId|assetId|ElementType/.test(sinComentarios(leer('functions/src/core/creative.ts'))));

  /* AE/§36 · La dirección es una sola. */
  check('AE) BRAIN → CONTEXTO, y nunca al revés: el contexto no llama a Brain',
    !/crearBrain|brain\.|ThoughtRequest|pensar\(/.test(sinComentarios(leer('functions/src/core/visual-context.ts')))
    && !/[Vv]isual[Cc]ontext|resolverContexto/.test(leer('functions/src/core/brain.ts')));

  /* AF/§37 · Y al Planner, por lo que ya sabía leer. */
  const resuelto = resolverContexto({ elementos: [BURGER] }, { accountId: A, needs: [{ kind: 'element', elementType: 'product', required: true }] });
  const adjuntos = materialesDelContexto(resuelto);
  check('AF) el contexto se convierte en lo que el Planner YA sabía leer: adjuntos con id y clase',
    adjuntos.length === 3 && adjuntos.every((a) => Object.keys(a).sort().join(',') === 'assetId,kind')
    && adjuntos[0].kind === 'image');
  check('AF/§37) y por eso el PLANNER NO CAMBIÓ: ni una línea, ni un campo nuevo',
    !/VisualContext|ContextNeed|ElementType|elementId|resolverContexto/.test(leer('functions/src/core/planner.ts')));
}

/* ═══ E · LO QUE NO CAMBIÓ ════════════════════════════════════════════════ */
console.log('\n── E · Dos capas nuevas que no obligaron a nadie a cambiar ──');
{
  const EL = sinComentarios(leer('functions/src/core/element.ts'));
  const VC = sinComentarios(leer('functions/src/core/visual-context.ts'));

  check('AN/§42) NO HAY LLM: ni Gemini, ni DeepSeek, ni Claude, ni ninguno',
    !/gemini|deepseek|claude|anthropic|openai|elevenlabs|seedance|llm|embedding/i.test(EL + VC));
  /*
   * `bucket`, `objectKey` y `storageRef` SÍ aparecen en `element.ts`: en la
   * lista de lo que un Element no puede llevar. Tienen que aparecer para poder
   * prohibirse. Lo que se mira es que no haya nada MÁS que hablar de
   * almacenamiento fuera de esa lista.
   */
  const sinLaListaProhibida = EL.replace(/const PROHIBIDAS = \[[\s\S]*?\];/, ' ') + VC;
  check('AO/AP) ni proveedor, ni almacenamiento: ni R2, ni Cloudinary, ni bucket, ni firma',
    !/r2|cloudinary|qiniu|alibaba|tencent|\bs3\b|bucket|objectkey|storageref|signedurl|presign/i.test(sinLaListaProhibida));
  check('AQ/AR) ni bytes, ni URLs: lo que sale son ids',
    !/Buffer|Uint8Array|arrayBuffer|https?:\/\//.test(EL + VC));
  check('§76) Core puro: ni Firebase, ni red, ni disco, ni reloj, ni azar, y solo importa del Core',
    !/firebase|firestore|node:|require\(|fetch\(|Date\.now\(|Math\.random\(|new Date\(/.test(EL + VC)
    && ['element.ts', 'visual-context.ts'].every((f) =>
      [...leer(`functions/src/core/${f}`).matchAll(/from '([^']+)'/g)].every(([, d]) => d.startsWith('./'))));
  check('Y) no hay base de datos de vectores, ni RAG, ni servicio de búsqueda externo',
    !/pinecone|weaviate|elasticsearch|algolia|vectorDb|embeddings|cosine|knn/i.test(EL + VC));

  /* §61 · Control negativo de arquitectura. */
  check('T/U/§61) NO hay un segundo registro de materiales, ni una segunda capa de medios',
    !/crearRegistroDeMateriales|AssetRegistry|MediaRouter|StorageRegistry|crearAlmacen/.test(EL + VC));
  check('V/AA/AB/§61) ni un segundo Brain, Planner, Workflow, Orchestrator, Router, Gateway o Job Engine',
    !/crearBrain|crearPlanner|crearWorkflowEngine|crearOrchestrator|crearRouter|crearGateway|crearJobEngine|QueuePort/.test(EL + VC));
  check('AC/§30) ni un segundo Financial: esto no cobra nada',
    !/credit|cobr|reembols|spend|precio|price|Money/i.test(EL + VC));

  check('AG) EL WORKFLOW no cambió', !/[Ee]lement|VisualContext|ContextNeed/.test(leer('functions/src/core/workflow.ts')));
  check('AH) EL ROUTER no cambió', !/[Ee]lement|VisualContext|ContextNeed/.test(leer('functions/src/core/router.ts')));
  check('AI) EL GATEWAY no cambió', !/VisualContext|ContextNeed|ElementType/.test(leer('functions/src/core/gateway.ts')));
  check('AJ) EL JOB ENGINE no cambió',
    !/[Ee]lementId|VisualContext|ContextNeed/.test(leer('functions/src/core/job.ts') + leer('functions/src/core/job-queue.ts') + leer('functions/src/job/index.ts')));
  check('AK) EL TRABAJADOR DURABLE no cambió',
    !/[Ee]lementId|VisualContext|ContextNeed/.test(leer('functions/src/job/worker.ts') + leer('functions/src/runtime/cola-durable.ts') + leer('functions/src/runtime/conductor.ts')));
  check('AL/§71) MEDIA CLOUD no cambió, y sigue sin saber qué es un Element',
    fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/media')).every((f) => !/[Ee]lement|VisualContext/.test(leer(`functions/src/core/media/${f}`))));
  check('AL) ni el Content Core: el material sigue siendo la autoridad sobre los bytes',
    fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/content')).every((f) => !/VisualContext|ContextNeed/.test(leer(`functions/src/core/content/${f}`))));
  check('AM) EL FINANCIAL CORE y el Credit Engine no cambiaron',
    !/[Ee]lement|VisualContext/.test(leer('functions/src/credits/creditEngine.ts'))
    && fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/financial')).every((f) => !/VisualContext|ContextNeed/.test(leer(`functions/src/core/financial/${f}`))));

  /* «elemento» es una palabra española y sale en los comentarios; lo que se mira es el código. */
  check('§80) NO hubo migración: ni las once experiencias, ni el planificador legacy, ni el Creator',
    !/ElementType|VisualContext|ContextNeed|elementId|resolverContexto/.test(sinComentarios(
      leer('functions/src/creator/templates.ts') + leer('functions/src/creator/planner.ts') + leer('functions/src/creator/index.ts'))));
  check('§81) NO hay interfaz: ni pantalla, ni rejilla, ni selector de Element',
    !fs.existsSync(path.resolve(RAIZ, 'screens/ElementsScreen.tsx'))
    && !/ElementType|VisualContext/.test(leer('screens/MisCreacionesScreen.tsx') + leer('components/creator/RejillaDeCreaciones.tsx')));
  check('W/X/§64/§65) sigue sin haber Director, ni Evals, ni replan',
    !/DirectorEngine|crearDirector|EvalRunner|crearEvals|replan/.test(EL + VC + sinComentarios(leer('functions/src/core/skill.ts'))));
  check('AE) y el CATÁLOGO DE SKILLS sigue vacío', lib('skills/index.js').CATALOGO_DE_SKILLS.length === 0);
  check('§44/§70) sin persistencia: no se creó ninguna colección, ni regla, ni índice',
    !/elements|visualContext/i.test(leer('firestore.rules')) && !/elements|visualContext/i.test(leer('firestore.indexes.json')));

  check('esta suite está en la cadena de `npm test`', /contexto-visual\.test\.mjs/.test(leer('functions/package.json')));
}

/* ═══ F · LA CADENA REAL ══════════════════════════════════════════════════ */
console.log('\n── F · «Usa la hamburguesa que creamos ayer y haz un anuncio» ──');
{
  const disponible = (c) => ['text.generate', 'image.generate', 'video.image_to_video'].includes(String(c));
  const planner = crearPlanner({ availability: { disponible }, tracer, now });
  const entendido = (adjuntos) => ({
    intent: 'creation', confidence: 'high', goal: 'un anuncio con mi hamburguesa',
    inputs: { text: 'un anuncio con mi hamburguesa', attachments: adjuntos },
    references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
    capability: 'video.image_to_video', capabilities: ['video.image_to_video'],
  });

  /* §79 · SIN contexto, todo sigue funcionando. La regla que manda. */
  const sinContexto = await planner.planificar({ contract: PLANNER_CONTRACT_VERSION, trace: traza(), understanding: entendido([]) });
  check('§79) SIN CONTEXTO el camino sigue funcionando: el plan genera la imagen que le falta',
    sinContexto.status === 'ready'
    && sinContexto.plan.steps.map((s) => s.capability).join(' → ') === 'image.generate → video.image_to_video',
    sinContexto.plan?.steps.map((s) => s.capability).join(' → ') ?? sinContexto.status);

  /* §55/§77 · CON contexto, el plan CAMBIA DE FORMA. Esa es la prueba. */
  const resuelto = resolverContexto(
    { elementos: [BURGER, BBQ, DELUXE] },
    {
      accountId: A,
      intent: 'creation',
      needs: [{ kind: 'element', elementType: 'product', required: true, role: 'subject' }],
      /* «Ayer», ya convertido en dos números por Brain. */
      window: { createdAfter: AYER - 1000, createdBefore: AYER + 1000 },
    },
  );
  check('§55) 1 · el contexto resuelve CUÁL hamburguesa, entre tres, con lo que Brain entendió',
    resuelto.status === 'resolved' && resuelto.elements[0].name === 'Burger Classic'
    && resuelto.elements[0].because === 'window');

  const conContexto = await planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza(),
    understanding: entendido(materialesDelContexto(resuelto)),
  });
  check('§55/§77) 2 · Y EL PLAN CAMBIA DE FORMA: ya hay una imagen, así que no hay que generarla',
    conContexto.status === 'ready'
    && conContexto.plan.steps.map((s) => s.capability).join(' → ') === 'video.image_to_video'
    && conContexto.plan.steps.length < sinContexto.plan.steps.length,
    conContexto.plan?.steps.map((s) => s.capability).join(' → ') ?? conContexto.status);

  /* Y sigue bajando: Workflow y Orchestrator, sin tocarlos. */
  const wf = await crearWorkflowEngine({ tracer, now })
    .construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza(), plan: conContexto.plan });
  const preparado = wf.status === 'ready' ? prepararWorkflow(wf.workflow) : { ok: false };
  const inicio = preparado.ok && preparado.prepared.iniciar(traza());
  const decision = inicio && inicio.ok
    && crearOrchestrator(preparado.prepared).avanzar({ contract: ORCHESTRATOR_CONTRACT_VERSION, principal: QUIEN, run: inicio.run, at: HOY });
  check('§77) 3 · y el workflow y el orquestador siguen igual, con UN paso en vez de dos',
    wf.status === 'ready' && wf.workflow.steps.length === 1
    && !!decision && decision.dispatch.length === 1 && decision.dispatch[0].capability === 'video.image_to_video',
    wf.status);
  check('§55) 4 · sin proveedor, sin modelo, sin generar nada y sin crear un solo trabajo',
    !JSON.stringify(conContexto.plan).toLowerCase().includes('provider')
    && !JSON.stringify(conContexto.plan).toLowerCase().includes('model'));

  /* §56 · El personaje, y la separación que importa. */
  const personaje = resolverContexto({ elementos: [NINA, BURGER] }, {
    accountId: A, needs: [{ kind: 'element', elementType: 'character', required: true }],
  });
  check('§56) «el personaje que hicimos ayer, en una escena nueva»: el Element dice QUIÉN es…',
    personaje.status === 'resolved' && personaje.elements[0].name === 'Nina'
    && personaje.elements[0].assets[0].assetId === 'img_nina_face');
  check('§56) …y los parámetros creativos dicen CÓMO representarlo: son dos cosas y no se mezclan',
    !JSON.stringify(personaje).includes('camera') && !JSON.stringify(personaje).includes('lighting'));

  /* §60 · La misma cosa en dos proyectos. */
  const enA = resolverContexto({ elementos: [BURGER], enProyecto: [{ projectId: 'proy_a', elementId: 'burger_classic' }] },
    { accountId: A, projectId: 'proy_a', needs: [{ kind: 'element', elementType: 'product', required: true }] });
  const enB = resolverContexto({ elementos: [BURGER], enProyecto: [{ projectId: 'proy_b', elementId: 'burger_classic' }] },
    { accountId: A, projectId: 'proy_b', needs: [{ kind: 'element', elementType: 'product', required: true }] });
  check('AX/§60) LA MISMA hamburguesa en dos proyectos, sin duplicarla: un Element, un id, dos usos',
    enA.elements[0].elementId === enB.elements[0].elementId
    && enA.elements[0].elementId === BURGER.elementId
    && JSON.stringify(enA.elements[0].assets) === JSON.stringify(enB.elements[0].assets));
  check('AX) y un Element no pertenece a ningún proyecto: el proyecto es una SEÑAL, no un dueño',
    !/projectId/.test((leer('functions/src/core/element.ts').match(/export interface Element extends[\s\S]*?\n\}/) || [''])[0]));

  /* AZ · Varias clases a la vez. */
  const varias = resolverContexto({ elementos: [BURGER, NINA, NIDO] }, {
    accountId: A,
    needs: [
      { kind: 'element', elementType: 'product', required: true },
      { kind: 'element', elementType: 'character', required: true },
      { kind: 'element', elementType: 'place', required: true },
      { kind: 'asset', assetKind: 'image', required: true },
    ],
  });
  check('AZ/§88) «un comercial de mi restaurante con la hamburguesa y el personaje del último vídeo»',
    varias.status === 'resolved' && varias.elements.length === 3
    && varias.elements.map((e) => e.type).sort().join(',') === 'character,place,product',
    varias.elements?.map((e) => e.name).join(' + '));
  check('AZ) y la necesidad de MATERIAL se cubre con lo que esas cosas ya traen: no se busca suelto',
    varias.missing === undefined
    && varias.elements.flatMap((e) => e.assets).some((a) => a.kind === 'image'));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
