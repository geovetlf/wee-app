/**
 * S5 · LA PUERTA DE ELEMENTS + LA ACTIVACIÓN DEL CONTEXTO EN BRAIN.
 *
 * Lo que se demuestra aquí, en una frase: **con el interruptor apagado Weë
 * Brain se comporta EXACTAMENTE como ayer, y con él encendido una hamburguesa
 * guardada entra en la conversación como un adjunto más.**
 *
 * Y la que manda sobre todas: nada de esto puede cruzar de una cuenta a otra,
 * ni abrir una segunda llamada a un modelo.
 *
 *   A · El interruptor: apagado, encendido, por cuenta, y sin necesidades
 *   B · La costura: entendimiento → contexto → adjuntos
 *   C · La puerta: qué valida, qué delega y qué no dice
 *   D · Lo que NO cambió
 *
 * Sin proveedor, sin modelo, sin LLM, sin red, sin trabajos.
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
const ctx = lib('elements/contexto.js');
const prompts = lib('creator/prompts.js');
const {
  ELEMENT_CONTRACT_VERSION, CREATIVE_PARAMETERS_VERSION, PLANNER_CONTRACT_VERSION,
  MAX_NECESIDADES, MAX_ELEMENTOS_EN_RESULTADO,
  interpretarEntendimiento, CAPABILITY_CATALOG, crearPlanner, valorCreativo,
} = core;
const {
  CONTEXTO_CERRADO, leerConfiguracionDelContexto, decidirContexto,
  peticionDesdeElEntendimiento, contextoParaBrain,
} = ctx;

const A = 'cuentaA';
const B = 'cuentaB';
const AYER = 1_799_900_000_000;
const HOY = 1_800_000_000_000;
const ABIERTO = { habilitado: true };
const tracer = { record() {} };

/* ── El mundo de mentira, el mismo patrón que S4 ──────────────────────────── */

const fakeDb = () => {
  const cols = new Map();
  const dameCol = (c) => { if (!cols.has(c)) cols.set(c, new Map()); return cols.get(c); };
  const consultas = [];
  const lecturas = [];
  const hazRef = (c, id) => ({
    _col: c, _id: id,
    async get() { lecturas.push(`${c}/${id}`); const d = dameCol(c).get(id); return { exists: d !== undefined, id, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) }; },
    async create(d) { if (dameCol(c).has(id)) throw new Error('ya existe'); dameCol(c).set(id, JSON.parse(JSON.stringify(d))); },
    async set(d) { dameCol(c).set(id, JSON.parse(JSON.stringify(d))); },
  });
  const consulta = (c, filtros = [], orden = null, tope = null) => ({
    where: (campo, op, valor) => consulta(c, [...filtros, { campo, op, valor }], orden, tope),
    orderBy: (campo) => consulta(c, filtros, campo, tope),
    limit: (k) => consulta(c, filtros, orden, k),
    async get() {
      consultas.push({ coleccion: c, filtros, tope });
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
    consultas, lecturas,
    sembrar: (c, id, d) => dameCol(c).set(id, JSON.parse(JSON.stringify(d))),
    collection(c) { return { doc: (id) => hazRef(c, id), ...consulta(c) }; },
    async runTransaction(fn) { return fn({ async get(r) { return r.get(); }, set(r, d) { dameCol(r._col).set(r._id, JSON.parse(JSON.stringify(d))); } }); },
  };
};

const FICHAS = {
  img_burger_front: { assetId: 'img_burger_front', ownerAccountId: A, kind: 'image', status: 'ready' },
  img_burger_side: { assetId: 'img_burger_side', ownerAccountId: A, kind: 'image', status: 'ready' },
  img_subiendo: { assetId: 'img_subiendo', ownerAccountId: A, kind: 'image', status: 'uploading' },
  vid_burger: { assetId: 'vid_burger', ownerAccountId: A, kind: 'video', status: 'ready' },
  img_de_b: { assetId: 'img_de_b', ownerAccountId: B, kind: 'image', status: 'ready' },
};
const material = async (assetId) => FICHAS[assetId] ?? null;

const elemento = (elementId, name, owner = A, at = AYER, refs) => ({
  contract: ELEMENT_CONTRACT_VERSION, elementId, type: 'product', version: 1, status: 'active',
  name, ownerAccountId: owner,
  refs: refs ?? [{ assetId: 'img_burger_front', role: 'primary', kind: 'image' }, { assetId: 'img_burger_side', role: 'reference', kind: 'image' }],
  createdAt: at, updatedAt: at,
});

const conMundo = (elementos = []) => {
  const db = fakeDb();
  for (const e of elementos) db.sembrar(els.COLECCION_DE_ELEMENTOS, e.elementId, e);
  return { db, material };
};

const entendido = (extra = {}) => ({
  intent: 'creation', confidence: 'high', goal: 'un anuncio con mi hamburguesa',
  inputs: { text: 'un anuncio con mi hamburguesa', attachments: [] },
  references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
  capability: 'video.image_to_video', capabilities: ['video.image_to_video'],
  ...extra,
});
const NECESITA_PRODUCTO = [{ kind: 'element', elementType: 'product', required: true }];

/* ═══ A · EL INTERRUPTOR ══════════════════════════════════════════════════ */
console.log('\n── A · Apagado es el estado normal, y apagado no cuesta nada ──');
{
  /* 15 · OFF. LA COMPROBACIÓN QUE MANDA SOBRE TODA LA FASE. */
  const d = conMundo([elemento('burger_classic', 'Burger Classic')]);
  const apagado = await contextoParaBrain(A, entendido({ context: NECESITA_PRODUCTO }), { ...d, config: CONTEXTO_CERRADO });
  check('15) CONTEXTO APAGADO: no se resuelve nada, y NO SE CONSULTA NADA',
    apagado.adjuntos.length === 0 && apagado.motivo === 'deshabilitado'
    && d.db.consultas.length === 0 && d.db.lecturas.length === 0,
    `${d.db.consultas.length} consultas, ${d.db.lecturas.length} lecturas`);
  check('15) y por defecto está apagado: un documento ausente, roto o vacío deja la puerta cerrada',
    CONTEXTO_CERRADO.habilitado === false
    && [undefined, null, {}, 'abierto', [], { habilitado: 'sí' }].every((x) => leerConfiguracionDelContexto(x).habilitado === false));

  /* 1 · Sin necesidades: tampoco se consulta. */
  const d2 = conMundo([elemento('burger_classic', 'Burger Classic')]);
  const sinNecesidad = await contextoParaBrain(A, entendido(), { ...d2, config: ABIERTO });
  check('1) ENCENDIDO pero sin necesidades declaradas: tampoco se consulta nada',
    sinNecesidad.adjuntos.length === 0 && sinNecesidad.motivo === 'sin_necesidades'
    && d2.db.consultas.length === 0 && d2.db.lecturas.length === 0);
  check('1) «escribe una descripción para una hamburguesa» no declara contexto, y no cuesta una lectura',
    decidirContexto(ABIERTO, { accountId: A, necesidades: 0 }).resolver === false);

  /* Canary por cuenta. */
  check('15) el canary se abre POR CUENTA: una que no está en la prueba no resuelve',
    decidirContexto({ habilitado: true, cuentas: [A] }, { accountId: B, necesidades: 1 }).motivo === 'cuenta_fuera_de_la_prueba'
    && decidirContexto({ habilitado: true, cuentas: [A] }, { accountId: A, necesidades: 1 }).resolver === true);
  /* S1.2: antes una lista rara se IGNORABA entera y la puerta quedaba abierta para todas las cuentas. Ahora cierra. */
  check('15) y la lista de cuentas está acotada y validada: una lista rara CIERRA la puerta, no la abre para todos',
    leerConfiguracionDelContexto({ habilitado: true, cuentas: Array(200).fill('x') }).habilitado === false
    && leerConfiguracionDelContexto({ habilitado: true, cuentas: ['../otra'] }).habilitado === false
    && decidirContexto(leerConfiguracionDelContexto({ habilitado: true, cuentas: ['../otra'] }), { accountId: B, necesidades: 1 }).resolver === false
    && leerConfiguracionDelContexto({ habilitado: true, cuentas: [A] }).cuentas.join(',') === A);
  check('10) no es un sistema general de banderas: un documento, dos campos',
    (leer('functions/src/elements/contexto.ts').match(/export interface ConfiguracionDelContexto \{[\s\S]*?\n\}/) || [''])[0]
      .split('\n').filter((l) => /^\s+\w+\??:/.test(l)).length === 2);
  check('10) y NO reutiliza el documento de la puerta de F12-D: son dos preguntas distintas',
    /DOCUMENTO_DEL_CONTEXTO = 'visualContext'/.test(leer('functions/src/elements/contexto.ts'))
    && !/DOCUMENTO_DE_LA_PUERTA|decidirRuntime/.test(leer('functions/src/elements/contexto.ts')));
}

/* ═══ B · LA COSTURA ══════════════════════════════════════════════════════ */
console.log('\n── B · Entendimiento → contexto → adjuntos → Planner ──');
{
  /* 2 · Brain puede declarar la necesidad, en una sola llamada. */
  const leido = interpretarEntendimiento(
    {
      intent: 'creation', goal: 'usa la hamburguesa que creamos ayer y hazme un comercial',
      capability: 'video.image_to_video',
      context: [{ kind: 'element', elementType: 'product', required: true }],
      creative: { version: CREATIVE_PARAMETERS_VERSION, shot: { type: 'hero' } },
    },
    { intents: ['creation'], capabilities: CAPABILITY_CATALOG.map((c) => c.id), experiences: [] },
  );
  check('2) BRAIN DECLARA LA NECESIDAD: «usa la hamburguesa» sale como una necesidad de producto',
    leido.context?.length === 1 && leido.context[0].kind === 'element' && leido.context[0].elementType === 'product');
  check('13/19) y en LA MISMA lectura salen los parámetros creativos de S2: una sola llamada, dos bloques',
    valorCreativo(leido.creative, 'shot.type') === 'hero');
  check('19) no hay una segunda llamada a ningún modelo en toda la costura',
    !/engine\.generate|pensar\(|conversar\(|entender\(/.test(sinComentarios(leer('functions/src/elements/contexto.ts'))));
  check('2) una necesidad inventada se descarta ENTERA: media necesidad buscaría algo que nadie pidió',
    interpretarEntendimiento({ intent: 'creation', context: [{ kind: 'element', elementType: 'hamburguesa' }] },
      { intents: ['creation'], capabilities: [], experiences: [] }).context === undefined);
  check('11) y la lista está acotada: más necesidades que el tope se descartan',
    interpretarEntendimiento({ intent: 'creation', context: Array(MAX_NECESIDADES + 1).fill({ kind: 'asset', assetKind: 'image' }) },
      { intents: ['creation'], capabilities: [], experiences: [] }).context === undefined);

  /* 3 · Element válido → adjunto. */
  const d = conMundo([elemento('burger_classic', 'Burger Classic')]);
  const uno = await contextoParaBrain(A, entendido({ context: NECESITA_PRODUCTO }), { ...d, config: ABIERTO });
  check('3) CONTEXTO ENCENDIDO: la hamburguesa se resuelve y sus materiales salen como adjuntos',
    uno.resultado.status === 'resolved' && uno.adjuntos.length === 2
    && uno.adjuntos.every((a) => Object.keys(a).sort().join(',') === 'assetId,kind'),
    `${uno.resultado.status}/${uno.adjuntos.length}`);
  check('6/§16) y ahí no hay bytes, ni URLs, ni `storageRef`, ni bucket',
    !/http|storage|bucket|objectKey|signed/i.test(JSON.stringify(uno.adjuntos)));

  /* 4 · Element de otra cuenta. */
  const ajeno = conMundo([elemento('burger_de_b', 'La de B', B)]);
  const noVisible = await contextoParaBrain(A, entendido({ context: NECESITA_PRODUCTO }), { ...ajeno, config: ABIERTO });
  check('4) un Element de OTRA cuenta no es visible, y no se filtra ni su nombre',
    noVisible.adjuntos.length === 0 && noVisible.resultado.status === 'not_found'
    && !JSON.stringify(noVisible).includes('La de B'));

  /* 9 · Ambigüedad. */
  const tres = conMundo([
    elemento('burger_classic', 'Burger Classic'),
    elemento('burger_bbq', 'Burger BBQ', A, HOY - 100),
    elemento('burger_deluxe', 'Burger Deluxe', A, HOY - 50),
  ]);
  const ambiguo = await contextoParaBrain(A, entendido({ context: NECESITA_PRODUCTO }), { ...tres, config: ABIERTO });
  check('9) TRES hamburguesas: AMBIGUO, sin elegir, y sin adjuntar ninguna',
    ambiguo.resultado.status === 'ambiguous' && ambiguo.adjuntos.length === 0
    && ambiguo.resultado.ambiguous[0].candidates.length === 3);

  /* 10/11 · Acotado. */
  const muchas = conMundo(Array.from({ length: 20 }, (_, i) => elemento(`burger_${String(i).padStart(3, '0')}`, `B ${i}`, A, AYER + i)));
  const acotado = await contextoParaBrain(A, entendido({ context: NECESITA_PRODUCTO }), { ...muchas, config: ABIERTO });
  check('10) veinte guardadas: la consulta trae como mucho el tope, y el resultado también',
    acotado.resultado.ambiguous[0].candidates.length <= MAX_ELEMENTOS_EN_RESULTADO
    && muchas.db.consultas.every((q) => q.tope !== null && q.tope <= MAX_ELEMENTOS_EN_RESULTADO));
  check('14/§14) y la petición se arma SIN copiar el texto de la persona: solo qué clase y dónde',
    (() => {
      const p = peticionDesdeElEntendimiento(A, entendido({ context: NECESITA_PRODUCTO }));
      return Object.keys(p).sort().join(',') === 'accountId,intent,needs'
        && !JSON.stringify(p).includes('hamburguesa');
    })());
  check('4/§8) y la cuenta NO sale del entendimiento: entra por parámetro, desde la sesión',
    !/accountId: *entendimiento|entendimiento\.accountId|understanding\.accountId/.test(leer('functions/src/elements/contexto.ts')));

  /* 12 · El proyecto usa lo de S4, sin nada nuevo. */
  check('12) el contexto de proyecto usa la lógica de S4: no hay una segunda idea de proyecto',
    !/projectItems|ProjectItem|enProyecto/.test(sinComentarios(leer('functions/src/elements/contexto.ts')))
    && /COLECCION_DE_ITEMS_DE_PROYECTO/.test(leer('functions/src/elements/index.ts')));

  /* 13 · Creative + contexto conviven. */
  const conCreativo = await contextoParaBrain(A, entendido({
    context: NECESITA_PRODUCTO,
    preferences: { creative: { version: CREATIVE_PARAMETERS_VERSION, camera: { type: 'aerial' } } },
  }), { ...conMundo([elemento('burger_classic', 'Burger Classic')]), config: ABIERTO });
  check('13) parámetros creativos Y contexto a la vez: los dos llegan y no se pisan',
    conCreativo.adjuntos.length === 2 && !JSON.stringify(conCreativo.adjuntos).includes('aerial'));
  check('13) porque son dos cosas: el Element dice QUÉ es y los creativos CÓMO representarlo',
    !/camera|movement|lighting|aspectRatio/.test(sinComentarios(leer('functions/src/core/element.ts'))));

  /* 20 · Y el plan. Sin tocar el Planner. */
  const disponible = (c) => ['image.generate', 'video.image_to_video'].includes(String(c));
  const planner = crearPlanner({ availability: { disponible }, tracer, now: () => HOY });
  const pedir = (adj) => planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: { traceId: 't', requestId: 't', userId: 'u' },
    understanding: entendido({ inputs: { text: 'x', attachments: adj } }),
  });
  const sin = await pedir([]);
  const con = await pedir(uno.adjuntos);
  check('20) EL PLAN CAMBIA DE FORMA con el contexto resuelto: de dos pasos a uno',
    sin.plan.steps.length === 2 && con.plan.steps.length === 1
    && con.plan.steps[0].capability === 'video.image_to_video',
    `${sin.plan?.steps.length} → ${con.plan?.steps.length}`);
  check('20) sin generar nada, sin crear un trabajo y sin encolar',
    !/QueuePort|enqueue|crearTrabajo|generar/.test(sinComentarios(leer('functions/src/elements/contexto.ts'))));
}

/* ═══ C · LA PUERTA ═══════════════════════════════════════════════════════ */
console.log('\n── C · Comprueba quién, resuelve la cuenta, y delega ──');
{
  const PUERTA = leer('functions/src/elements/puerta.ts');
  const SIN = sinComentarios(PUERTA);

  check('C) la cuenta sale de la SESIÓN, por la única puerta que existe',
    /cuentaDelPrincipalEnWee\(db, request\.auth\.uid\)/.test(PUERTA));
  check('§seguridad) y un `accountId` del cliente no se lee: no existe en el archivo',
    !/data\.accountId|data\.ownerAccountId|request\.data\.account/.test(SIN));
  check('§seguridad) ni un proveedor, ni un modelo, ni almacenamiento, ni una credencial',
    !/providerId|modelId|adapter|storageRef|bucket|objectKey|signedUrl|apiKey|secret|credential/i.test(SIN));
  check('C) no repite NINGUNA comprobación del runtime: delega las cuatro operaciones',
    ['crearElemento', 'leerElemento', 'actualizarElemento', 'archivarElemento'].every((f) => new RegExp(`${f}\\(`).test(SIN))
    && !/puedeReferenciar|validarElemento|ownerAccountId ===|\.where\(/.test(SIN));
  check('C) y no tiene un segundo resolutor: llama al de S3 con el mundo de S4',
    /resolverContexto\(await mundoDeContextoDeWee\(/.test(SIN));
  check('4/5/6/7/8) de lo ajeno, lo inexistente, lo inusable y lo de otra clase se dice LO MISMO: `not-found`',
    (SIN.match(/HttpsError\('not-found'/g) || []).length === 5
    && !/no_es_tuyo|kind_mismatch|not_usable/.test(SIN),
    `${(SIN.match(/HttpsError\('not-found'/g) || []).length} respuestas iguales`);
  check('C) una operación que no está en la lista no existe',
    /throw new HttpsError\('invalid-argument', 'Esa operación no existe\.'\);/.test(PUERTA));
  check('C) y sin sesión no se pasa de la primera línea',
    /if \(!request\.auth\) throw new HttpsError\('unauthenticated'/.test(PUERTA));
  /* Una callable, y la cuenta resuelta en UN sitio: cinco puertas serían cinco sitios donde repetirlo. */
  check('§17) es UNA puerta, no cinco: la resolución de cuenta se escribe una vez',
    (PUERTA.match(/onCall\(/g) || []).length === 1
    && (SIN.match(/cuentaDelPrincipalEnWee\(/g) || []).length === 1
    && (SIN.match(/const accountId = /g) || []).length === 1);
}

/* ═══ D · LO QUE NO CAMBIÓ ════════════════════════════════════════════════ */
console.log('\n── D · Una puerta y un interruptor. Nada más ──');
{
  const CTX = sinComentarios(leer('functions/src/elements/contexto.ts'));

  check('17) BRAIN no elige proveedor ni modelo por culpa de esto',
    !/providerId|modelId|allowedProviders/.test(CTX));
  check('18) y el contexto visual tampoco: ni proveedor, ni modelo, ni LLM',
    !/gemini|deepseek|claude|openai|anthropic|seedance|elevenlabs|embedding|vector/i.test(CTX));
  check('§14) sin caché global, sin Redis, sin estado mutable por persona',
    !/redis|Map\(\)|new Set\(\)|global\./.test(CTX)
    /* El único estado es el minuto de caché del interruptor, que es un documento, no una persona. */
    && (CTX.match(/^let /gm) || []).length === 1);
  check('§15) NO hay un segundo Brain, Planner, Router, Workflow, Job Engine ni Director',
    !/crearBrainDeWee|crearPlanner|crearRouter|crearWorkflowEngine|crearMotorDeTrabajos|Director/.test(CTX));

  check('7) EL PLANNER no se tocó', !/VisualContext|ContextNeed|elementId|resolverContexto/.test(leer('functions/src/core/planner.ts')));
  check('§15) ni el Workflow, ni el Orchestrator, ni el Router, ni el Gateway',
    !/[Ee]lement|VisualContext|ContextNeed/.test(leer('functions/src/core/workflow.ts') + leer('functions/src/core/orchestrator.ts') + leer('functions/src/core/router.ts'))
    && !/VisualContext|ContextNeed|ElementType/.test(leer('functions/src/core/gateway.ts')));
  check('§15) ni el Job Engine, ni la cola, ni el trabajador durable',
    !/[Ee]lementId|VisualContext|ContextNeed/.test(leer('functions/src/core/job.ts') + leer('functions/src/core/job-queue.ts')
      + leer('functions/src/job/worker.ts') + leer('functions/src/runtime/cola-durable.ts')));
  check('§16) ni Media Cloud, ni el Content Core',
    fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/media')).every((f) => !/[Ee]lement|VisualContext/.test(leer(`functions/src/core/media/${f}`))));
  check('§15) ni el Financial Core: esto no cobra nada',
    !/[Ee]lement|VisualContext/.test(leer('functions/src/credits/creditEngine.ts')) && !/credit|cobr|spend/i.test(CTX));
  check('§8) CATALOGO_DE_SKILLS sigue vacío, y el resolutor de Skills no se volvió obligatorio',
    lib('skills/index.js').CATALOGO_DE_SKILLS.length === 0
    && !/resolverSkill|SkillResolver/.test(CTX));
  check('§9) `ProjectItemKind` NO se tocó: sigue siendo `asset | content`',
    /export type ProjectItemKind = 'asset' \| 'content';/.test(leer('functions/src/core/project.ts')));
  check('§13) y no hizo falta cambiar reglas ni índices: S4 ya los dejó preparados',
    /match \/elements\/\{elementId\}/.test(leer('firestore.rules'))
    && JSON.parse(leer('firestore.indexes.json')).indexes.some((i) => i.collectionGroup === 'elements'));

  /* El prompt: preparado, no enchufado. */
  check('4/§4) el prompt estructurado ya pide `creative` Y `context`, en UNA llamada',
    /BRAIN_UNDERSTAND_SYSTEM/.test(leer('functions/src/creator/prompts.ts'))
    && /"creative"/.test(prompts.BRAIN_UNDERSTAND_SYSTEM) && /"context"/.test(prompts.BRAIN_UNDERSTAND_SYSTEM)
    && /dolly_out/.test(prompts.BRAIN_UNDERSTAND_SYSTEM));
  check('4) y NO se tocó el prompt del chat: la persona sigue leyendo prosa, no un JSON',
    !/JSON|"creative"|"context"/.test(prompts.BRAIN_CHAT_SYSTEM));
  check('§seguridad) el prompt prohíbe explícitamente modelos, proveedores, URLs y claves',
    /Nunca incluyas nombres de modelos, proveedores, URLs/.test(prompts.BRAIN_UNDERSTAND_SYSTEM));

  /* La activación en brainChat. */
  const BRAIN = leer('functions/src/creator/brain.ts');
  check('16) `brainChat` llama al contexto ANTES de pensar, y le añade los adjuntos',
    /const contexto = await contextoParaBrain\(uid,/.test(BRAIN)
    && BRAIN.indexOf('contextoParaBrain') < BRAIN.indexOf('await cerebro.conversar')
    && /if \(contexto\.adjuntos\.length\) adjuntos\.push\(\.\.\.contexto\.adjuntos\);/.test(BRAIN));
  check('15) y lo hace con el interruptor: apagado, ni una lectura',
    /config = deps\.config \?\? \(deps\.db \? await configuracionDelContexto\(deps\.db\) : CONTEXTO_CERRADO\)/.test(leer('functions/src/elements/contexto.ts'))
    && leer('functions/src/elements/contexto.ts').indexOf('decidirContexto(config') < leer('functions/src/elements/contexto.ts').indexOf('mundoDeContextoDeWee(peticion'));
  check('§20) lo que se anota no lleva contenido: ni nombres, ni ids de material',
    /WEË CONTEXTO: \$\{t\.status\} elementos=\$\{t\.elements\} materiales=\$\{t\.assets\}/.test(leer('functions/src/elements/contexto.ts')));

  check('esta suite está en la cadena de `npm test`', /brain-contexto\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
