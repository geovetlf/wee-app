/*
 * WEË CHEF · CARACTERIZACIÓN DE LO QUE HAY HOY (ronda R7, tarea G, 2026-10-11).
 *
 *   node test/chef-caracterizacion.test.mjs        (usa el compilado: `npm run build` antes)
 *
 * Es la prueba que acompaña a `docs/WEE-CHEF-ESPECIFICACION.md`: fija, con código que se EJECUTA, lo que esa
 * especificación afirma de Weë Chef. No construye nada de Chef ni arregla nada; solo impide que el documento se pudra
 * y deja a quien implemente un «antes» reproducible.
 *
 * Tiene dos clases de comprobación, y se distinguen en el nombre:
 *
 *   · CONTRATO  — algo que Chef cumple hoy y tiene que seguir cumpliendo (las cuatro formas del plan, que todo lo que
 *                 pide existe en el catálogo del Core, que una receta de Chef no se cobra con un precio escrito…).
 *   · HOY       — un defecto o un hueco CONOCIDO, con el identificador D-CHEF-n / R-n de la especificación. Está en
 *                 verde porque pasa lo que pasa hoy. Cuando se arregle, su comprobación se INVIERTE (se cambia la
 *                 aserción y el nombre pasa a «ARREGLADO»); no se borra, para que la historia quede en la suite.
 *
 * Solo lectura: no llama a ningún proveedor, no abre emuladores y no escribe en ninguna base. Usa `functions/lib`
 * (compilado), el fuente del cliente y una Firestore en memoria con transacciones serializadas (la de
 * `creator-reclamo.test.mjs`) para ejecutar `creatorRun` de verdad.
 *
 *  A. LAS CUATRO FORMAS DEL PLAN de Chef, y que todo lo que piden está en el catálogo del Core.
 *  B. EL CONTEXTO QUE VIAJA: qué manda la pantalla, qué se corta y qué se pierde.
 *  C. LOS TRES PANELES NUEVOS Y LAS FRASES QUE DEJAN, con el planificador de plantillas de verdad.
 *  D. LA RECETA NO ES UN MATERIAL y lo que el cliente puede escribir en un trabajo.
 *  E. PUBLICAR, MURO Y ESTRUCTURA: lo que ya no existe en la sección.
 *  F. LO QUE CUESTA UN FALLO A MEDIAS: `creatorRun` ejecutado con un paso de la foto que falla.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
/* Se ejecuta el catálogo de verdad (como `chef-weeai.test.mjs`): se transpila, se le quitan los imports y se llama. */
const ejecutar = (ruta, devuelve) => {
  const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const cuerpo = js.replace(/^\s*import[^;]*;\s*$/gm, '').replace(/^(\s*)export (const|function|let|var) /gm, '$1$2 ');
  return new Function(`${cuerpo}\n return ${devuelve};`)();
};

/* ── Lo que rodea al planificador: nada llama a un proveedor ────────────────────────────────────────────────── */
const firestore = require('firebase-admin/firestore');
const getFirestoreReal = firestore.getFirestore;
const gateway = lib('gateway/index.js');
const gatewayReal = gateway.runCapability;
let llamadasAlGateway = [];
gateway.runCapability = async (capability) => { llamadasAlGateway.push(capability); throw new Error('sin proveedor: esta suite no llama a nadie'); };

const { TEMPLATES } = lib('creator/templates.js');
const { templatePlanner } = lib('creator/planner.js');
const { needsInputImage } = lib('creator/inputs.js');
const { KIND_INSTRUCTIONS, buildTextPrompt } = lib('creator/prompts.js');
const { CAPABILITY_CATALOG } = lib('core/registry/capabilities.js');
const { todosLosPlanes } = await import(pathToFileURL(path.resolve(here, '_planes.mjs')).href);

const chef = TEMPLATES.chef;
const firma = (plan) => plan.steps.map((s) => `${s.id}:${s.capability}(${s.input?.kind ?? ''})`).join(' → ');

/* ═══ A · LAS CUATRO FORMAS DEL PLAN ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── A · Las formas del plan de Chef ──');
{
  const todos = (await todosLosPlanes()).filter((p) => p.experienceId === 'chef');
  const formas = new Map();
  for (const p of todos) if (!formas.has(firma(p.plan))) formas.set(firma(p.plan), p.plan);
  const ESPERADAS = [
    'recipe:text.generate(recipe) → dish:image.generate(dish)',
    'look:vision.describe(describe) → recipe:text.generate(recipe) → dish:image.generate(dish)',
    'menu:text.generate(menu) → prices:text.search(shopping) → list:text.generate(shopping)',
    'dish:image.edit(dish_edit)',
  ];
  check('CONTRATO · recorriendo todas las respuestas, Chef produce exactamente cuatro formas de plan',
    JSON.stringify([...formas.keys()].sort()) === JSON.stringify([...ESPERADAS].sort()), [...formas.keys()].join(' | '));

  /* Todo `kind` que Chef pide es una variante declarada por el catálogo del Core: es lo que mantiene a Chef dentro
     del puente y de la sombra (el Planner del Core rechaza una variante inventada). */
  const variantesDe = (cap) => new Set((CAPABILITY_CATALOG.find((c) => c.id === cap)?.variants ?? []).map((v) => v.key));
  const fueraDelCatalogo = [...formas.values()].flatMap((plan) => plan.steps)
    .filter((s) => s.input?.kind && !variantesDe(s.capability).has(s.input.kind))
    .map((s) => `${s.capability}/${s.input.kind}`);
  check('CONTRATO · cada `kind` de cada paso de Chef es una variante declarada en el catálogo del Core',
    fueraDelCatalogo.length === 0, fueraDelCatalogo.join(', '));
  check('CONTRATO · y todas las capacidades que Chef usa son ROUTABLE hoy',
    [...formas.values()].flatMap((p) => p.steps).every((s) => CAPABILITY_CATALOG.find((c) => c.id === s.capability)?.status === 'ROUTABLE'));

  const fotoPorForma = [...formas.entries()].map(([f, plan]) => `${f.split(' → ')[0].split(':')[0]}=${needsInputImage(plan.steps)}`).join(' · ');
  check('CONTRATO · piden foto de la persona exactamente dos formas: mirar los ingredientes y retocar el plato',
    [...formas.values()].filter((plan) => needsInputImage(plan.steps)).map((plan) => plan.steps[0].id).sort().join(',') === 'dish,look', fotoPorForma);
  check('CONTRATO · el menú no lleva foto del plato; la receta, el postre, lo saludable y «No sé» llevan UNA siempre',
    formas.get(ESPERADAS[2]).steps.every((s) => !s.capability.startsWith('image.'))
    && formas.get(ESPERADAS[0]).steps.filter((s) => s.capability === 'image.generate').length === 1
    && formas.get(ESPERADAS[0]).steps.find((s) => s.id === 'dish').input.count === 1,
    'no hay forma de pedir una receta sin foto del plato (R-5)');

  /* El precio no se escribe en la plantilla: ningún paso de Chef lleva un número de Credits. */
  check('CONTRATO · ningún paso de Chef lleva un precio ni un proveedor escritos',
    ![...formas.values()].flatMap((p) => p.steps).some((s) => /credits|provider|model/i.test(JSON.stringify(s.input ?? {}))));

  /* El número de formas y de pasos de Chef entra en los pines 35/74 de brain-pasos, pasos-repetidos y entrada-de-paso. */
  const pasosDeChef = [...formas.values()].reduce((suma, plan) => suma + plan.steps.length, 0);
  check('CONTRATO · Chef aporta 4 formas y 9 pasos a los pines «35 formas / 74 pasos» de las otras suites',
    formas.size === 4 && pasosDeChef === 9, `${formas.size} formas · ${pasosDeChef} pasos`);
}

/* ═══ B · EL CONTEXTO QUE VIAJA ════════════════════════════════════════════════════════════════════════════ */
console.log('\n── B · El contexto que viaja ──');
{
  const pantalla = leer('screens/ChefScreen.tsx');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const { AJUSTES_DE_COCINA } = ejecutar('constants/chefTools.ts', '{ AJUSTES_DE_COCINA }');
  const opcionesDe = (qid) => new Set(chef.questions.find((q) => q.id === qid).options.map((o) => o.id));

  check('CONTRATO · los ajustes `people` y `time` de la pantalla usan los MISMOS identificadores de opción que las preguntas del servidor',
    ['people', 'time'].every((g) => AJUSTES_DE_COCINA.find((x) => x.id === g).opciones.filter((o) => o.id !== 'auto').every((o) => opcionesDe(g).has(o.id))),
    'por eso se pueden mandar como `presets` sin traducir nada (CHEF-02)');
  check('HOY · D-CHEF-4 · `diet` y `level` NO tienen pregunta en el servidor: solo pueden viajar como texto',
    ['diet', 'level'].every((g) => AJUSTES_DE_COCINA.some((x) => x.id === g) && !chef.questions.some((q) => q.id === g)));
  const abrir = pantalla.slice(pantalla.indexOf('const abrirFlujo'), pantalla.indexOf('const alEnviar'));
  check('HOY · D-CHEF-4 · la pantalla manda al flujo solo experienceId, goal, preset e imageUri: ni `presets`, ni `workspace`',
    /experienceId: 'chef'/.test(abrir) && /goal: objetivo/.test(abrir) && /preset,/.test(abrir) && /imageUri:/.test(abrir)
    && !/presets\s*:/.test(abrir) && !/workspace\s*:/.test(abrir));
  check('HOY · D-CHEF-4 · lo elegido en los ajustes se pega al FINAL del objetivo, por interpolación («idea (ajustes)»)',
    /t\('chef\.goalWith', \{ idea, ajustes: formato\.lista\(/.test(pantalla) && /goalWith: '\{\{idea\}\} \(\{\{ajustes\}\}\)'/.test(leer('i18n/textos/es/chef.ts')));

  /* El servidor corta el objetivo a 300 caracteres: con una idea larga, la dieta (que va al final) se pierde sin aviso. */
  const cortaA300 = /const goal = String\(data\.goal \|\| ''\)\.trim\(\)\.slice\(0, 300\)/.test(leer('functions/src/creator/index.ts'));
  const idea = 'Una receta para la cena de cumpleaños de mi madre con mucha gente invitada, algo elaborado y muy casero, '
    + 'de cocina tradicional, con entrante, plato principal y postre, que se pueda dejar medio hecho el día anterior, '
    + 'sin demasiado picante porque hay niños, y que quede bonito en la mesa para hacer fotos antes de servir ya ';
  const objetivo = `${idea.repeat(1)}(Para muchos · Una hora o más · Sin gluten)`;
  check('HOY · D-CHEF-5 · el servidor corta el objetivo a 300 caracteres y la restricción (al final) se pierde sin aviso',
    cortaA300 && objetivo.length > 300 && objetivo.slice(0, 300).includes('Sin gluten') === false,
    `${objetivo.length} caracteres: tras el corte, «${objetivo.slice(0, 300).slice(-24)}»`);
  /* CONTROL: con una idea corta la restricción llega entera; el corte solo muerde cuando la idea es larga. */
  const corto = 'Pollo al horno (Para dos · Sin gluten)';
  check('CONTROL · con una idea corta la restricción sobrevive al mismo corte', corto.slice(0, 300).includes('Sin gluten'));

  check('HOY · D-CHEF-6 · solo Weë Travel conserva las respuestas al «Crear otra versión» / retocar / reintentar',
    /const CONSERVA_EL_CONTEXTO = experience\.id === 'travel';/.test(flujo) && /const handleAnotherVersion = \(\) => start\(job\?\.goal \|\| params\.goal\);/.test(flujo));

  /* El conocimiento de la persona que Weë Brain tiene HOY sobre cocina: solo lo escrito en el objetivo. */
  const brain = leer('functions/src/creator/brain.ts');
  const entradaBrain = /export interface BrainChatInput \{([\s\S]*?)\n\}/.exec(brain)?.[1] ?? '';
  check('HOY · el chat libre de Weë Brain no recibe experiencia ni contexto: la «conversación contextual» de Chef es la guiada (`creatorChat`)',
    /messageId\?: string;/.test(entradaBrain) && !/experienceId|workplace|workspace/.test(entradaBrain.replace(/\/\*[\s\S]*?\*\//g, '')));
}

/* ═══ C · LOS PANELES NUEVOS Y LAS FRASES QUE DEJAN ═════════════════════════════════════════════════════════ */
console.log('\n── C · Los paneles nuevos ──');
{
  /* Lo que queda en la caja al elegir una entrada de un panel: chef.panelStart = «{{panel}} · {{que}}: » + lo que escribe la persona. */
  const turno = async (goal, answers = []) => templatePlanner.next({ experienceId: 'chef', goal, answers });
  const planDe = async (goal) => {
    let t = await turno(goal);
    const respuestas = t.inferred.map((a) => ({ questionId: a.questionId, optionId: a.optionId }));
    let guarda = 0;
    while (t.question && guarda++ < 8) {
      respuestas.push({ questionId: t.question.id, optionId: 'idk' });
      t = await turno(goal, respuestas);
    }
    return { plan: t.plan, what: respuestas.find((r) => r.questionId === 'what')?.optionId };
  };

  const nutricion = await planDe('Información nutricional · Calorías: pollo al horno con patatas');
  check('HOY · D-CHEF-1 · «Información nutricional» acaba en el plan de una receta CON foto del plato (no hay un plan de nutrición)',
    nutricion.what === 'recipe' && firma(nutricion.plan) === 'recipe:text.generate(recipe) → dish:image.generate(dish)', firma(nutricion.plan));
  const compras = await planDe('Lista de compras · De una receta: lasaña para cuatro');
  check('HOY · D-CHEF-1 · «Lista de compras · De una receta» acaba también en receta + foto, sin ningún paso de lista',
    compras.what === 'recipe' && !compras.plan.steps.some((s) => s.input?.kind === 'shopping'), firma(compras.plan));
  const semana = await planDe('Lista de compras · Para la semana: cinco cenas vegetarianas');
  check('HOY · D-CHEF-1 · «Para la semana» sí llega a una lista, pero por la palabra «semana», no por la función',
    semana.what === 'menu' && firma(semana.plan).endsWith('list:text.generate(shopping)'));

  const sustituir = await planDe('Sustituir ingredientes · Sin lactosa: una lasaña');
  check('HOY · D-CHEF-2 · «Sustituir ingredientes» se deduce como «cocinar con lo que tengo»: el plan empieza mirando una foto',
    sustituir.what === 'cook' && needsInputImage(sustituir.plan.steps) && sustituir.plan.steps[0].capability === 'vision.describe', firma(sustituir.plan));
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const literal = /\/(ingredientes\|nevera\|refri\|foto)\/i\.test\(params\.goal \|\| ''\)/.exec(flujo);
  check('HOY · D-CHEF-2 · y el cliente exige esa foto porque el título del panel contiene la palabra «ingredientes»',
    !!literal && new RegExp(literal[1], 'i').test('Sustituir ingredientes · Sin lactosa: una lasaña')
    && !new RegExp(literal[1], 'i').test('Substitute ingredients · Lactose free: a lasagna'),
    'en inglés no coincide: la regla del cliente solo mira español');

  const sinPalabras = await turno('what can I cook with what is in my fridge');
  check('HOY · D-CHEF-4 · el deductor local solo lee español: en inglés (o danés) vuelve a preguntar «¿Qué quieres hacer?»',
    sinPalabras.question?.id === 'what' && JSON.stringify(chef.infer('en opskrift på lasagne til fire')) === '{}');

  /* La lista de compras de Chef usa la instrucción que se escribió para Weë Home. */
  const plan = chef.buildPlan('Un menú vegetariano', { what: 'menu', people: '4', days: '7' });
  const lista = plan.steps.find((s) => s.id === 'list');
  /* Se mira el prompt que SE ARMA para el paso de Chef (no la constante): así la comprobación se invierte con el arreglo real,
     que será una instrucción propia de Chef y no un cambio de la genérica. */
  const pasoDeChef = buildTextPrompt('chef', lista.input.kind, lista.input.brief, plan.goal, lista.purpose, ['(el menú del paso anterior)']).prompt;
  check('HOY · D-CHEF-3 · el prompt del paso `list` de Chef (kind `shopping`) habla de «zona del espacio» y «6–8 elementos»',
    lista.input.kind === 'shopping' && /zona del espacio/.test(pasoDeChef) && /6–8 elementos/.test(pasoDeChef),
    pasoDeChef.split('\n').find((l) => /zona del espacio/.test(l)));
  check('CONTRATO · esa instrucción es la de Weë Home y a Home le sirve: el arreglo de Chef no puede tocar la suya',
    /zona del espacio/.test(buildTextPrompt('home', 'shopping', 'sala moderna', 'Redecorar mi sala', 'Armar la lista de cambios y compras', ['(la foto)']).prompt)
    && /zona del espacio/.test(KIND_INSTRUCTIONS.shopping));
  check('CONTRATO · pero el catálogo ya describe `shopping` de `text.search` como «qué comprar y cuánto cuesta» (no es una lista de cambios)',
    /qué comprar y cuánto cuesta/i.test(CAPABILITY_CATALOG.find((c) => c.id === 'text.search').variants.find((v) => v.key === 'shopping').description));

  /* El retoque de la foto del plato no tiene puerta en la pantalla. */
  const { TARJETAS_DE_CHEF } = ejecutar('constants/chefTools.ts', '{ TARJETAS_DE_CHEF }');
  const pantalla = leer('screens/ChefScreen.tsx');
  check('HOY · D-CHEF-7 · la pantalla no tiene tarjeta de «retocar mi foto» ni de postre: `edit` solo se alcanza por la pregunta `what`',
    !TARJETAS_DE_CHEF.some((t) => t.preset?.optionId === 'edit' || t.preset?.optionId === 'dessert')
    && chef.infer('Retocar la foto de mi plato').what === undefined
    && /t\('catalogo\.chefAcIngredientsGoal'\)/.test(pantalla), 'la foto de la caja deja el objetivo «Cocinar con los ingredientes que tengo»');
}

/* ═══ D · LA RECETA NO ES UN MATERIAL ══════════════════════════════════════════════════════════════════════ */
console.log('\n── D · Qué se guarda de una receta ──');
{
  const { materialesDeResultado } = lib('creator/index.js');
  const paso = { id: 'recipe', capability: 'text.generate', purpose: 'Escribir la receta paso a paso', status: 'done' };
  const corridaDeTexto = { output: { kind: 'text', content: 'Pollo al horno 🍗\nPara 4 personas\n• 1 pollo\n1. Precalienta.' }, demo: false, provider: 'gemini', generationId: 'g1', modelId: 'm' };
  const ids = await materialesDeResultado('uidDePrueba', corridaDeTexto, paso, 'job1', 'job1:recipe', 'chef');
  check('HOY · R-4 · el texto de una receta NO se convierte en material de la cuenta (solo lo que tiene URL, como la foto del plato)',
    Array.isArray(ids) && ids.length === 0);
  const reglas = leer('firestore.rules');
  const bloque = reglas.slice(reglas.indexOf('match /creatorJobs/{jobId}'), reglas.indexOf('match /capabilities/{capabilityId}'));
  check('CONTRATO · el cliente solo puede escribir `projectId` y `updatedAt` en un trabajo: no hay «favorita», ni título, ni porciones guardadas',
    /allow create, delete: if false/.test(bloque) && /hasOnly\(\['projectId', 'updatedAt'\]\)/.test(bloque));
  const projectItems = leer('functions/src/elements/index.ts');
  const despliegue = JSON.parse(leer('ops/despliegue/grupos.json'));
  check('HOY · los Elements sirven a materiales con nombre (hamburguesa, marca…) pero la callable `elements` NO se despliega y su contenido no admite texto',
    despliegue.no_se_despliegan.some((f) => f.funcion === 'elements') && /COLECCION_DE_ELEMENTOS = 'elements'/.test(projectItems)
    && /'bytes', 'content', 'data'/.test(leer('functions/src/core/element.ts')));
}

/* ═══ E · PUBLICAR, MURO Y ESTRUCTURA ══════════════════════════════════════════════════════════════════════ */
console.log('\n── E · Publicar, muro y estructura ──');
{
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const publicar = flujo.slice(flujo.indexOf('const handlePublish'), flujo.indexOf('const handlePublish') + 900);
  check('HOY · D-CHEF-8 · publicar una receta manda el contenido crudo de TODOS los resultados de texto, cortado a 480',
    /\.filter\(\(r\) => r\.content && r\.kind !== 'video'\)/.test(publicar) && /\.slice\(0, 480\)/.test(publicar) && !/sinMarcasInternas/.test(publicar));
  check('CONTRATO · el compositor admite 500 caracteres: una receta completa no cabe en una publicación del Wäll',
    /const maxTextLength = 500;/.test(leer('screens/CreateScreen.tsx')));
  check('CONTRATO · el resultado de Chef se publica en el Wäll con su sección (`sourceSection`) y su firma en `aiTools`',
    /sourceSection: EXPERIENCE_AREA\[experience\.id\]\?\.section \?\? experience\.id/.test(flujo) && /aiTools: \[nombre\]/.test(flujo));

  const pantalla = leer('screens/ChefScreen.tsx');
  check('HOY · D-CHEF-10 · ChefScreen NO monta ningún muro de sección: ni sectionFeed, ni PostCard, ni el muro general',
    !/sectionFeed|PostCard|getMuroGeneral|paginaDeLaSeccion|ComposerEntry/.test(pantalla));
  check('CONTRATO · el Wäll tiene el filtro «Weë Chef» y no hay método de muro por sección',
    /\{ id: 'chef', label: 'Weë Chef' \}/.test(leer('utils/feedFilters.ts'))
    && /ya no hay muros de\s+\*?\s*sección/.test(leer('services/firestoreService.ts')));
  check('HOY · D-CHEF-10 · el comentario «Weë Chef es el piloto del muro social dentro de una sección» sigue en el catálogo, sin muro que lo respalde',
    /Weë Chef es el piloto del muro social dentro de una sección/.test(leer('constants/specialists.ts')));
  check('HOY · D-CHEF-10 · la ficha de especialista de Chef (ejemplos, caja de idea, acciones) no tiene consumidor en pantalla: ChefScreen solo lee `spec.headline`',
    (pantalla.match(/spec\??\.(\w+)/g) || []).every((u) => /headline/.test(u)));
  check('CONTRATO · «Mis proyectos» de Chef lista trabajos (de cualquier estado) filtrados solo por experiencia, 8 como mucho y hasta 6 páginas leídas',
    /getMyJobsDe\(user\.uid, \(job\) => job\.experienceId === 'chef', 8, 20\)/.test(pantalla)
    && /MAX_PAGINAS_DE_TRABAJOS/.test(leer('utils/paginarTrabajos.ts')));
}

/* ═══ F · LO QUE CUESTA UN FALLO A MEDIAS ══════════════════════════════════════════════════════════════════ */
console.log('\n── F · creatorRun con la foto del plato fallando ──');
{
  /* Firestore de mentira con transacciones serializadas (la de creator-reclamo.test.mjs). */
  const docs = new Map();
  const aplicar = (p, d) => docs.set(p, { ...(docs.get(p) || {}), ...d });
  const reemplazar = (p, d) => docs.set(p, { ...d });
  const ref = (p) => ({
    id: p.split('/').pop(), path: p,
    collection: (sub) => ({ doc: (id) => ref(`${p}/${sub}/${id || 'auto'}`) }),
    get: async () => ({ exists: docs.has(p), id: p.split('/').pop(), data: () => docs.get(p) }),
    set: async (d) => reemplazar(p, d), update: async (d) => aplicar(p, d),
  });
  let cola = Promise.resolve();
  const baseFalsa = {
    collection: (c) => ({ doc: (id) => ref(`${c}/${id || 'nuevo'}`) }),
    runTransaction: (fn) => {
      const turno = cola.then(() => fn({ get: async (r) => r.get(), update: (r, d) => aplicar(r.path, d), set: (r, d) => reemplazar(r.path, d) }));
      cola = turno.catch(() => {});
      return turno;
    },
  };
  firestore.getFirestore = () => baseFalsa;

  const creatorMod = lib('creator/index.js');
  const creditosMod = lib('creator/credits.js');
  const limitesMod = lib('engine/limits.js');
  const configMod = lib('engine/config.js');
  const { ADAPTERS } = lib('engine/registry.js');
  const originales = {
    hold: creditosMod.holdCredits, settle: creditosMod.settleCredits, modo: creditosMod.pricingMode,
    reserve: limitesMod.limiter.reserve, config: configMod.loadConfig,
    configurado: Object.fromEntries(Object.entries(ADAPTERS).map(([id, a]) => [id, a.isConfigured])),
  };
  /* Solo FLUX «tiene clave»: así la elección de modelo de imagen es estable y no depende del entorno (como estimate-plan). */
  for (const [id, adapter] of Object.entries(ADAPTERS)) adapter.isConfigured = () => id === 'flux';

  let eventos = [];
  configMod.loadConfig = async () => ({ settings: { limits: {} } });
  limitesMod.limiter.reserve = async () => { eventos.push('cupo'); };
  creditosMod.holdCredits = async (userId, jobId, plan, importe) => { eventos.push(`reserva:${importe}`); return { duplicate: false, status: 'AUTHORIZED', amount: importe }; };
  creditosMod.settleCredits = async (userId, jobId, held, used) => { eventos.push(`liquida:${held}:${used}`); };
  creditosMod.pricingMode = async () => 'simulated';

  const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
  const RECETA = 'Pollo al horno 🍗\nPara 4 personas · 45 minutos\n• 1 pollo\n• 4 patatas\n1. Precalienta el horno.\n2. Hornea.\nIMAGEN: roast chicken with potatoes on a plate';
  const plan = chef.buildPlan('Pollo al horno', { what: 'recipe', people: '4', time: '30' });
  const trabajo = () => ({
    userId: UID, experienceId: 'chef', goal: 'Pollo al horno', status: 'planned', creditsEstimated: 5, plan,
    steps: plan.steps.map((s) => ({ ...s, status: 'pending' })), results: [], progressText: 'Este es el plan.',
  });
  const respuesta = (capability) => ({
    output: capability === 'text.generate' ? { kind: 'text', content: RECETA } : { kind: 'image', url: 'https://ejemplo.invalid/plato.png' },
    usage: {}, costUSD: capability === 'text.generate' ? 0.0005 : 0.015, latencyMs: 1, provider: capability === 'text.generate' ? 'gemini' : 'flux',
    credits: capability === 'text.generate' ? 2 : 3, generationId: `g_${capability}`, demo: true, attempts: 1, modelId: 'doble',
  });
  const correr = (jobId) => creatorMod.creatorRun.run({ auth: { uid: UID }, data: { jobId } }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));

  /* Control: las dos respuestas salen bien. */
  docs.set('creatorJobs/bien', trabajo());
  eventos = [];
  gateway.runCapability = async (capability) => respuesta(capability);
  const bien = await correr('bien');
  check('CONTRATO · control: con receta y foto bien, el trabajo termina `done` y se liquida lo reservado',
    bien.ok && docs.get('creatorJobs/bien').status === 'done' && eventos.join(',') === 'cupo,reserva:5,liquida:5:5', eventos.join(','));

  /* Fallo a medias: la receta sale, la foto no. */
  docs.set('creatorJobs/aMedias', trabajo());
  eventos = [];
  gateway.runCapability = async (capability) => {
    if (capability === 'image.generate') throw new Error('el proveedor de imagen no contesta');
    return respuesta(capability);
  };
  /* El fallo es provocado: se silencia el `console.error` que `creatorRun` escribe al fallar un trabajo. */
  const consolaError = console.error;
  console.error = () => {};
  const aMedias = await correr('aMedias');
  const doc = docs.get('creatorJobs/aMedias');
  check('HOY · R-3 · si falla la foto tras la receta, el trabajo queda `failed` y se REEMBOLSA TODO lo reservado (5 de 5)',
    !aMedias.ok && doc.status === 'failed' && eventos.join(',') === 'cupo,reserva:5,liquida:5:0' && doc.creditsCharged === 0, eventos.join(','));
  check('HOY · R-3 · pero la receta ya escrita SE CONSERVA en el trabajo: la persona la tiene sin pagar y Weë pagó al proveedor',
    doc.results.length === 1 && doc.results[0].stepId === 'recipe' && /Pollo al horno/.test(doc.results[0].content)
    && doc.steps.map((s) => s.status).join(',') === 'done,failed', doc.steps.map((s) => s.status).join(','));
  const reintento = await correr('aMedias');
  console.error = consolaError;
  check('HOY · y el trabajo fallido no se puede reintentar: «Intentar de nuevo» abre OTRO trabajo (el servidor solo ejecuta `planned`)',
    reintento.ok === false && docs.get('creatorJobs/aMedias').status === 'failed'
    && /if \(job\.status !== 'planned' \|\| !job\.plan\) throw new EngineError\('INVALID_REQUEST'/.test(leer('functions/src/creator/index.ts')));

  /* Limpieza: se devuelve todo a como estaba. */
  Object.assign(creditosMod, { holdCredits: originales.hold, settleCredits: originales.settle, pricingMode: originales.modo });
  limitesMod.limiter.reserve = originales.reserve;
  configMod.loadConfig = originales.config;
  for (const [id, adapter] of Object.entries(ADAPTERS)) adapter.isConfigured = originales.configurado[id];
  firestore.getFirestore = getFirestoreReal;
}
gateway.runCapability = gatewayReal;
check('CONTRATO · esta suite no llamó a ningún proveedor', llamadasAlGateway.length === 0, llamadasAlGateway.join(', '));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
