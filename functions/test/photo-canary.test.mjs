/**
 * WEË — C11.3/C11.4: PHOTO, LA EXPERIENCIA VISUAL, POR EL CORE ENTERO.
 *
 * ── El caso ─────────────────────────────────────────────────────────────────
 *
 *   «Restaura esta foto de mi abuela, manteniendo su identidad y su aspecto
 *    natural.»  + la foto adjunta.
 *
 * Se eligió esta rama de Photo porque es la ÚNICA que ejercita las cuatro
 * cosas a la vez, que es lo que el canary existe para probar:
 *
 *   A · necesita un recurso visual        la foto de la abuela
 *   B · usa parámetros creativos          `lighting.type`, `composition.type`
 *   C · usa continuidad                   conservar el rostro, cambiar el daño
 *   D · son DOS pasos con dependencia     mirar la foto → editarla
 *
 * Las otras siete ramas se cubren en la matriz del final: comparten capacidad,
 * variante y forma, y repetir el viaje entero por cada una habría medido lo
 * mismo ocho veces.
 *
 * ── Y lo que de verdad se pregunta aquí ─────────────────────────────────────
 *
 * No «¿funciona Photo?», sino: ¿puede el Core ser la autoridad de una
 * experiencia visual SIN que nadie más abajo tenga que reconstruir lo que el
 * Planner ya decidió? Cada seam se mide por separado, y donde algo se pierde
 * se dice con nombre y sitio.
 *
 * Cero proveedores reales, cero Credits, cero escrituras.
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
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const core = lib('core/index.js');
const {
  PLANNER_CONTRACT_VERSION, WORKFLOW_CONTRACT_VERSION,
  leerIntencionDeContinuidad, candidatosDesdeElementos, crearRegistro, crearRouter, crearGateway,
} = core;
const { crearPlannerDeWee, entendimientoParaPlanificar, disponibilidadDe } = lib('planner/index.js');
const { crearWorkflowEngineDeWee } = lib('workflow/index.js');
const { orquestadorDeWee } = lib('orchestrator/index.js');
const { peticionDeGateway } = lib('job/index.js');
const motorDelGateway = lib('engine/gateway.js');
const registroDeWee = lib('registry/index.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { resolverReferenciasDeContinuidad } = lib('engine/referencias.js');

const callado = { record() {} };
const reloj = () => 1_000;
const traza = (id) => ({ traceId: id, requestId: id, userId: 'acc_mia' });

/* ── El mundo del caso ────────────────────────────────────────────────────── */

const LA_FOTO = { kind: 'image', assetId: 'as_abuela_0001', name: 'abuela.jpg' };
const ELEMENTOS = [{ elementId: 'el_abuela_0001', name: 'abuela', version: 2, status: 'active' }];

/* Lo creativo, en el vocabulario cerrado de S2. Ni una frase. */
const CREATIVO = { version: 1, lighting: { type: 'natural' }, composition: { type: 'centered' } };

/* Lo que el modelo entendió: conserva el rostro, deja que se arregle el daño. */
const DEL_MODELO = {
  preserve: ['identity.face', 'identity.features'],
  mayChange: ['appearance.skin', 'style.rendering'],
  strength: 'strict',
  subjects: ['abuela'],
};

const CAPS = ['vision.describe', 'image.edit'];
const ENTENDIMIENTO_CRUDO = {
  intent: 'edit',
  confidence: 'high',
  goal: 'restaurar la foto de mi abuela manteniendo su identidad',
  capability: 'image.edit',
  capabilities: ['vision.describe', 'image.edit'],
  inputs: { text: 'restaura esta foto', attachments: [LA_FOTO] },
  references: [],
  constraints: { kind: 'restore' },
  preferences: { quality: 'max', creative: CREATIVO },
  continuity: leerIntencionDeContinuidad(DEL_MODELO),
  needsPlanning: true,
  missing: [],
  assumptions: [],
};

console.log('\n── A · Brain: lo que hay antes de planificar ──');

const CANDIDATOS = candidatosDesdeElementos(ELEMENTOS);
const ENTENDIMIENTO = entendimientoParaPlanificar(ENTENDIMIENTO_CRUDO, CANDIDATOS);
const REQUISITO = ENTENDIMIENTO.preferences?.continuity;

check('el entendimiento trae las siete cosas del caso, y ninguna inventada',
  ENTENDIMIENTO.goal.length > 0 && ENTENDIMIENTO.capability === 'image.edit'
  && ENTENDIMIENTO.constraints.kind === 'restore'
  && ENTENDIMIENTO.inputs.attachments.length === 1
  && ENTENDIMIENTO.preferences?.quality === 'max'
  && ENTENDIMIENTO.preferences?.creative !== undefined
  && REQUISITO !== undefined,
  'goal · capability · kind · foto · quality · creative · continuity');
check('el nombre «abuela» se resolvió a `elementId@version` antes del plan',
  igual(REQUISITO?.anchors, [{ elementId: 'el_abuela_0001', version: 2 }]),
  JSON.stringify(REQUISITO?.anchors));
check('la capacidad llega DECIDIDA: el Planner no la vuelve a elegir',
  !/action\.id|answers\[|=== 'restore' \?/.test(sinComentarios(leer('functions/src/core/planner.ts'))),
  'G4 sigue siendo de Brain, y no se ha tocado');
check('lo creativo viaja en el vocabulario de S2, sin una sola frase',
  ENTENDIMIENTO.preferences.creative.lighting.type === 'natural'
  && !JSON.stringify(ENTENDIMIENTO.preferences.creative).includes(' '),
  'lighting.type=natural · composition.type=centered');

console.log('\n── B · Planner: la autoridad del plan ──');

const respuesta = await crearPlannerDeWee({ availability: disponibilidadDe(CAPS), tracer: callado, now: reloj })
  .planificar({ contract: PLANNER_CONTRACT_VERSION, trace: traza('c113_0001'), understanding: ENTENDIMIENTO });
const plan = respuesta.plan;
const mirar = plan?.steps?.find((s) => s.capability === 'vision.describe');
const editar = plan?.steps?.find((s) => s.capability === 'image.edit');

check('el Planner produce el plan de los DOS pasos',
  respuesta.status === 'ready' && plan?.steps?.length === 2 && !!mirar && !!editar,
  respuesta.status);
check('GAP MEDIDO · G6: aquí NO se deriva ninguna dependencia, y hay una razón escrita',
  editar?.dependsOn === undefined && mirar?.dependsOn === undefined,
  'con la foto ya aportada ninguno espera a nadie: `aportadas.has(image)` evita la arista, y `text` nunca la crea');
check('G6 · y eso NO reproduce a Legacy, que sí encadenaba mirar → editar',
  /dependsOn: \['look'\]/.test(leer('functions/src/creator/templates.ts')),
  'Legacy quería el ANÁLISIS de la foto; el catálogo solo sabe de modalidades, no de «quiero lo que el otro dijo»');
check('y `produces` también sale del catálogo',
  mirar?.produces === 'text' && editar?.produces === 'image');
check('el `input` del paso es SOLO parámetros: `kind` y `brief`',
  igual(Object.keys(editar?.input ?? {}).sort(), ['brief', 'kind'])
  && editar?.input?.kind === 'restore');
check('`brief` son las palabras de la persona, no prosa nuestra',
  editar?.input?.brief === ENTENDIMIENTO.goal);
check('la variante la coge quien la entiende: `restore` es de editar, no de mirar',
  mirar?.input?.kind === undefined && editar?.input?.kind === 'restore',
  'el hallazgo de C11.2, en el caso que lo destapó');
check('A · el plan lleva la foto como RECURSO, con su `assetId`',
  igual(plan?.references, [LA_FOTO]));
check('y los dos pasos declaran que la usan, por posición',
  igual(mirar?.uses, [0]) && igual(editar?.uses, [0]));
check('B · lo creativo está en `hints`, entero',
  igual(editar?.hints?.creative, CREATIVO));
check('C · la continuidad está en `hints`, entera y profundamente igual',
  igual(editar?.hints?.continuity, REQUISITO));
check('`quality` está en `hints`, no en `input`',
  editar?.hints?.quality === 'max' && editar?.input?.quality === undefined);
check('en `input` no hay recursos, ni proveedor, ni modelo, ni prompt',
  !/assetId|attachment|reference|providerId|modelId|system|prompt/i.test(JSON.stringify(plan?.steps?.map((s) => s.input))));

console.log('\n── C · Workflow: derivado del plan, no construido a mano ──');

const construido = await crearWorkflowEngineDeWee({ tracer: callado, now: reloj })
  .construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza('c113_0001'), plan });
const wf = construido.workflow;
const editarWf = wf?.steps?.find((s) => s.capability === 'image.edit');

check('el Workflow sale del motor y apunta a SU plan',
  construido.status === 'ready' && wf?.planId === plan?.id,
  construido.status === 'ready' ? `planId=${wf.planId}` : JSON.stringify(construido.error));
check('conserva la foto, entera y en su posición',
  igual(wf?.references, [LA_FOTO]) && igual(editarWf?.uses, [0]));
check('conserva el `input`, lo creativo, la continuidad y la calidad',
  igual(editarWf?.input, editar?.input) && igual(editarWf?.hints, editar?.hints));
check('y conserva la ausencia de dependencia que decidió el Planner: ni la inventa ni la quita',
  editarWf?.dependsOn === undefined && igual(editarWf?.uses, editar?.uses));

console.log('\n── D · Orchestrator: despacha lo del paso ──');

const montado = orquestadorDeWee(wf);
const arranque = montado.ok
  ? montado.orchestrator.avanzar({
      contract: '1.0', principal: { userId: 'acc_mia' },
      run: montado.prepared.iniciar(traza('c113_0001')).run, at: 10,
    })
  : undefined;
const primero = arranque?.dispatch?.[0];

check('sin aristas, el Orchestrator despacha LOS DOS a la vez',
  montado.ok && arranque?.dispatch?.length === 2,
  montado.ok ? arranque?.dispatch?.map((d) => d.capability).join(' + ') : JSON.stringify(montado.error));
check('el despacho lleva la foto ya resuelta: quien ejecuta no ve índices',
  igual(primero?.references, [LA_FOTO]) && primero?.uses === undefined);
check('y lleva input, hints y restricciones',
  primero?.input !== undefined && primero?.hints?.creative !== undefined
  && primero?.hints?.continuity !== undefined && primero?.constraints?.kind === 'restore');
check('D · y CUANDO hay arista, la respeta: imagen → vídeo, uno detrás de otro',
  await (async () => {
    const caps = ['image.generate', 'video.image_to_video'];
    const enCadena = (await crearPlannerDeWee({ availability: disponibilidadDe(caps), tracer: callado, now: reloj })
      .planificar({
        contract: PLANNER_CONTRACT_VERSION, trace: traza('c113_cadena'),
        understanding: { ...ENTENDIMIENTO, capability: 'video.image_to_video', capabilities: caps,
          constraints: {}, inputs: { text: '', attachments: [] } },
      })).plan;
    const video = enCadena?.steps?.find((x) => x.capability === 'video.image_to_video');
    const imagen = enCadena?.steps?.find((x) => x.capability === 'image.generate');
    if (!igual(video?.dependsOn, [imagen?.id])) return false;
    const m = orquestadorDeWee((await crearWorkflowEngineDeWee({ tracer: callado, now: reloj })
      .construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza('c113_cadena'), plan: enCadena })).workflow);
    const d = m.orchestrator.avanzar({
      contract: '1.0', principal: { userId: 'acc_mia' },
      run: m.prepared.iniciar(traza('c113_cadena')).run, at: 10,
    }).dispatch;
    return d?.length === 1 && d[0].capability === 'image.generate';
  })(),
  'el vídeo espera a la imagen, y la arista la derivó el catálogo');

console.log('\n── E · Job y Gateway: hasta dónde llega ──');

const peticion = peticionDeGateway({
  jobId: 'job_c113', attemptId: 'a1', attempt: 1,
  capability: primero.capability,
  /* Tres ids y nada más: la única verdad sobre una implementación es el registro. */
  implementation: { providerId: 'probe', modelId: 'probe-1', adapterId: 'adapter:probe' },
  input: primero.input, trace: primero.trace, hints: primero.hints,
  /* C11.4: el recurso cruza el seam. Antes se quedaba en el despacho. */
  ...(primero.references?.length ? { references: primero.references } : {}),
  mode: 'sync', idempotencyKey: primero.idempotencyKey, timeoutMs: 30_000, deadlineAt: 99_000,
});

check('el Job entrega al Gateway el `input` intacto',
  igual(peticion.input, primero.input));
check('y las pistas ENTERAS: creativo, continuidad y calidad',
  igual(peticion.execution.hints?.creative, CREATIVO)
  && igual(peticion.execution.hints?.continuity, REQUISITO)
  && peticion.execution.hints?.quality === 'max');
check('G5 CERRADO · el recurso cruza el seam del Job hasta el Gateway',
  igual(peticion.references, [LA_FOTO]) && peticion.references?.[0]?.assetId === 'as_abuela_0001',
  'C11.3 lo midió como hueco; C11.4 lo cerró, y con su `assetId` intacto');
check('y sigue FUERA de `input`: dos canales, no uno',
  peticion.input?.assetId === undefined && peticion.input?.references === undefined,
  'el recurso tiene su propio camino y no contamina los parámetros');

/*
 * ── Y AQUÍ EL CANARY ENSEÑA LO MEJOR QUE TENÍA QUE ENSEÑAR ──────────────────
 *
 * El Gateway RECHAZA antes de llamar a nadie, y tiene toda la razón: se pidió
 * conservar un rostro, y la implementación que le dieron no tiene con qué. No
 * se gasta un céntimo en una generación que no puede cumplir lo que se pidió.
 *
 * Se prueban los tres casos, porque los tres dicen algo distinto.
 */
const sondaCon = (mecanismo) => {
  const a = {
    id: 'probe', name: 'probe', modalities: ['image', 'text'], verification: { state: 'VERIFIED_IN_PRODUCTION' },
    models: [{ id: 'probe-1', provider: 'probe', capabilities: CAPS, quality: 3, speed: 3, cost: { unit: 'call', usd: 0 } }],
    isConfigured: () => true,
    supports: (c) => CAPS.includes(c),
    llamadas: [],
    async run(req) { a.llamadas.push(req); return { output: { kind: 'text', content: 'una foto antigua, algo dañada' }, usage: {}, costUSD: 0, latencyMs: 1 }; },
    ...(mecanismo ? { continuidad: () => mecanismo } : {}),
  };
  return a;
};
const config = { providers: {}, settings: DEFAULT_SETTINGS };
const montarGateway = (sonda) => crearGateway({
  registry: crearRegistro(registroDeWee.datosDelRegistro({ probe: sonda }, config.providers)),
  executor: motorDelGateway.crearEjecutorDelMotor({ adapters: { probe: sonda }, config: () => config, now: reloj }),
  tracer: callado, now: reloj,
});
const MECANISMO = { referenciasDeImagen: 4, referenciasDeVideo: 0, controlesDedicados: [], admiteFuerza: false };

const sinMecanismo = sondaCon(undefined);
const rechazada = await montarGateway(sinMecanismo).ejecutar(peticion);
check('una implementación SIN mecanismo de continuidad se rechaza ANTES de llamar a nadie',
  rechazada.status === 'failed' && sinMecanismo.llamadas.length === 0
  && rechazada.error?.details?.continuity === 'pre_execution_rejected'
  && igual(rechazada.error?.details?.reasons, ['no_mechanism']),
  'no se gasta nada en una generación que no puede cumplir lo que se pidió');

const conMecanismo = sondaCon(MECANISMO);
const sinMaterial = await montarGateway(conMecanismo).ejecutar(peticion);
check('CONSECUENCIA DE G5: con mecanismo pero sin material, también se rechaza',
  sinMaterial.status === 'failed' && conMecanismo.llamadas.length === 0
  && igual(sinMaterial.error?.details?.reasons, ['missing_material']),
  'sin el puerto de recursos no se materializa nada: el seam se cierra abajo');

/*
 * El tercero pone la URL en la entrada A MANO —lo que hará el Gateway el día
 * que G5 se cierre— para demostrar que TODO LO DEMÁS de la cadena está bien.
 * Es un simulacro de UN seam, y se dice que lo es.
 */
const conMaterial = sondaCon(MECANISMO);
const ejecutado = await montarGateway(conMaterial).ejecutar({
  ...peticion,
  input: { ...peticion.input, referenceImages: ['https://llave.invalid/as_abuela_0001'] },
});
const vioElAdaptador = conMaterial.llamadas[0];

check('con el material delante, el Gateway ejecuta la implementación que le dieron',
  ejecutado.status === 'completed' && conMaterial.llamadas.length === 1,
  ejecutado.status + ' · ' + conMaterial.llamadas.length + ' llamada(s) a la SONDA');
check('y el adaptador recibe la variante, lo creativo y la continuidad sin descubrir nada',
  vioElAdaptador?.input?.kind === 'restore'
  && igual(vioElAdaptador?.hints?.creative, CREATIVO)
  && igual(vioElAdaptador?.hints?.continuity, REQUISITO));
check('cero proveedores reales: la sonda es local y su coste declarado es cero',
  vioElAdaptador?.model?.id === 'probe-1' && conMaterial.models[0].cost.usd === 0);



/*
 * ── Y AHORA CON LA PUERTA PUESTA: C11.4 de punta a punta ────────────────────
 *
 * El tercer caso de arriba metía la URL a mano porque el seam estaba abierto.
 * Ya no lo está: se enchufa el puerto de recursos —el que en producción llama a
 * `solicitarEntrega`— y el Gateway materializa el adjunto él mismo.
 */
const entregasPedidas = [];
const puertoDeRecursos = async (accountId, adjuntos) => {
  const { materializarRecursos } = lib('engine/referencias.js');
  return materializarRecursos(accountId, adjuntos, {
    entrega: async (assetId) => {
      entregasPedidas.push({ accountId, assetId });
      /* La puerta de verdad comprueba cuenta, estado y ficha. Aquí se imita su CONTRATO. */
      return accountId === 'acc_mia' && assetId === 'as_abuela_0001'
        ? { assetId, url: `https://llave.invalid/${assetId}`, expiraEn: 9_000, vigenciaSegundos: 900 }
        : null;
    },
  });
};
const conPuerta = sondaCon(MECANISMO);
const deWee = await motorDelGateway.crearGatewayDelMotor({
  adapters: { probe: conPuerta },
  loadConfig: async () => config,
  tracer: callado,
  now: reloj,
  recursos: puertoDeRecursos,
}).ejecutar(peticion);

check('G5 CERRADO DE VERDAD: el Gateway materializa el adjunto y EJECUTA',
  deWee.status === 'completed' && conPuerta.llamadas.length === 1,
  deWee.status + ' · ' + JSON.stringify(deWee.error?.details ?? ''));
check('la materialización pasó por la puerta, con la cuenta del servidor',
  igual(entregasPedidas, [{ accountId: 'acc_mia', assetId: 'as_abuela_0001' }]),
  'ni el cliente eligió la cuenta, ni se firmó nada antes');
check('y el adaptador recibe la URL en la clave abstracta del motor',
  igual(conPuerta.llamadas[0]?.input?.referenceImages, ['https://llave.invalid/as_abuela_0001']),
  'referenceImages, no `input_image`: el nombre del proveedor no sube hasta aquí');
check('SEGURIDAD · con otra cuenta, el adjunto no se materializa y no se ejecuta',
  await (async () => {
    const ajena = sondaCon(MECANISMO);
    const r = await motorDelGateway.crearGatewayDelMotor({
      adapters: { probe: ajena }, loadConfig: async () => config, tracer: callado, now: reloj,
      recursos: (_cuenta, adjuntos) => puertoDeRecursos('acc_ajena', adjuntos),
    }).ejecutar(peticion);
    return r.status === 'failed' && ajena.llamadas.length === 0
      && r.error?.details?.resources === 'pre_execution_rejected';
  })(),
  'falla cerrado y sin una sola llamada');
check('SEGURIDAD · una URL suelta sin `assetId` NO es autoridad',
  await (async () => {
    const suelta = sondaCon(MECANISMO);
    const r = await motorDelGateway.crearGatewayDelMotor({
      adapters: { probe: suelta }, loadConfig: async () => config, tracer: callado, now: reloj,
      recursos: puertoDeRecursos,
    }).ejecutar({ ...peticion, references: [{ kind: 'image', url: 'https://cualquiera.invalid/foto.jpg' }] });
    return r.status === 'failed' && suelta.llamadas.length === 0
      && igual(r.error?.details?.unresolved, ['no_material']);
  })(),
  'una dirección que eligió quien llama no se manda a ningún proveedor');

console.log('\n── F · La continuidad SÍ llega a material, por C8 ──');

const resolucion = await resolverReferenciasDeContinuidad('acc_mia', peticion.execution.hints.continuity, {
  elemento: async (cuenta, id) => (cuenta === 'acc_mia' && id === 'el_abuela_0001'
    ? { elementId: id, version: 2, ownerAccountId: 'acc_mia', status: 'active',
        refs: [{ assetId: 'as_abuela_0001', role: 'primary', kind: 'image' }] }
    : null),
  entrega: async (assetId) => ({ assetId, url: `https://llave.invalid/${assetId}`, expiraEn: 9_000, vigenciaSegundos: 900 }),
});

check('C8 recibe el `elementId@version` exacto y devuelve material autorizado',
  resolucion.fallos.length === 0 && resolucion.materiales[0]?.assetId === 'as_abuela_0001'
  && resolucion.materiales[0]?.requestedVersion === 2);
check('SEGURIDAD · un recurso de otra cuenta se comporta como inexistente',
  (await resolverReferenciasDeContinuidad('acc_ajena', peticion.execution.hints.continuity, {
    elemento: async (cuenta, id) => (cuenta === 'acc_mia' ? { elementId: id } : null),
    entrega: async () => null,
  })).fallos[0]?.reason === 'not_found');
check('SEGURIDAD · lo que viaja por el plan es el `assetId`, nunca una URL firmada',
  !JSON.stringify(plan).includes('http') && !JSON.stringify(wf).includes('http'));

console.log('\n── G · Autoridad: nadie de abajo reconstruye nada ──');

check('el Planner no nombra a Legacy ni a su composición de entrada',
  !/creator\/inputs|stepInputFor|inputImageUrl|TEMPLATES|buildPlan/.test(
    ['core/planner.ts', 'core/workflow.ts', 'core/orchestrator.ts'].map((f) => leer(`functions/src/${f}`)).join('\n')));
check('`creator/inputs.ts` sigue siendo autoridad SOLO de Legacy, y sigue intacto',
  /if \(job\.inputImageUrl && IMAGE_INPUT_CAPS\.includes\(capability\)/.test(leer('functions/src/creator/inputs.ts'))
  && !/Plan\.references|PlanStep|Workflow/.test(leer('functions/src/creator/inputs.ts')));
check('GAP CONOCIDO · `runtime/pensador.ts` sigue armando su workflow a mano',
  !/Planner|planificar/.test(leer('functions/src/runtime/pensador.ts')),
  'la ruta viva de Brain no se ha migrado, y este canary no la usa');
check('el Router no sabe de Photo, ni de variantes, ni de recursos',
  !/photo|restore|kind|attachment|references|BrainAttachment/i.test(sinComentarios(leer('functions/src/core/router.ts')))
  && !/photo|restore|kind/i.test(sinComentarios(leer('functions/src/router/politica.ts'))));
check('el Gateway no descubre nada: no compone entrada ni elige capacidad',
  !/buildImagePrompt|IMAGE_TASK|EDIT_INSTRUCTIONS|TEMPLATES/.test(leer('functions/src/core/gateway.ts')));
check('y no se creó un segundo Planner, Workflow, Orchestrator, Router ni Job',
  ['crearPlanner', 'crearWorkflowEngine', 'crearRouter', 'crearJobEngine']
    .every((f) => (leer('functions/src/core/planner.ts') + leer('functions/src/core/workflow.ts')
      + leer('functions/src/core/router.ts') + leer('functions/src/core/job.ts'))
      .split(`export const ${f} =`).length <= 2));

console.log('\n── H · Las otras siete ramas de Photo, en la misma forma ──');

const RAMAS = [
  ['enhance', 'image.edit', 'enhance', 2],
  ['background', 'image.background_remove', 'background', 2],
  ['remove', 'image.object_remove', 'remove', 2],
  ['retouch', 'image.identity_edit', 'retouch', 2],
  ['colorize', 'image.edit', 'colorize', 2],
  ['transform', 'image.edit', 'transform', 2],
  ['generate', 'image.generate', 'photo', 1],
];
for (const [rama, capability, kind, pasos] of RAMAS) {
  const caps = pasos === 2 ? ['vision.describe', capability] : [capability];
  const r = await crearPlannerDeWee({ availability: disponibilidadDe(caps), tracer: callado, now: reloj })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION, trace: traza(`c113_${rama}`),
      understanding: {
        ...ENTENDIMIENTO,
        capability, capabilities: caps,
        constraints: { kind },
        ...(pasos === 1 ? { inputs: { text: '', attachments: [] } } : {}),
      },
    });
  const suyo = r.plan?.steps?.find((s) => s.capability === capability);
  check(`photo/${rama}: ${pasos} paso(s), variante \`${kind}\`, y la foto donde toca`,
    r.status === 'ready' && r.plan?.steps?.length === pasos && suyo?.input?.kind === kind
    && (pasos === 2 ? igual(suyo?.uses, [0]) && r.plan?.references?.length === 1
                    : suyo?.uses === undefined && r.plan?.references === undefined),
    r.status === 'ready' ? `${capability}` : r.status);
}

check('esta suite está en la cadena de `npm test`',
  /photo-canary\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
