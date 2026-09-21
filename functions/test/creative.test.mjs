/**
 * S2 · WEË CREATIVE PARAMETER SYSTEM.
 *
 * Lo que se demuestra aquí, en una frase: **alguien puede decir «que la cámara
 * se aleje lentamente desde arriba» y Weë lo entiende por dentro sin que esa
 * persona aprenda una sola palabra del vocabulario.**
 *
 * Y la segunda, igual de importante: ese vocabulario viaja de Brain al
 * adaptador POR LA COSTURA QUE YA EXISTÍA —`ExecutionHints`— sin que el
 * Workflow, el Orchestrator, el Router, el Job Engine ni la cola se enteren de
 * que existe.
 *
 *   A · El contrato: qué vale, qué no, rangos, unidades y por dónde no se entra
 *   B · El transporte: Brain → Planner → Workflow → Orchestrator → Gateway
 *   C · Skills: declarar, resolver, desempatar, chocar y componer
 *   D · Contra lo que se puede servir de verdad
 *   E · Lo que NO cambió
 *   F · La experiencia humana, de principio a fin
 *
 * Sin proveedor real, sin vídeo, sin audio, sin trabajos, sin red.
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
  CREATIVE_PARAMETERS_VERSION, SKILL_CONTRACT_VERSION, PLANNER_CONTRACT_VERSION,
  WORKFLOW_CONTRACT_VERSION, ORCHESTRATOR_CONTRACT_VERSION,
  RUTAS_CREATIVAS, FOCAL_MIN_MM, FOCAL_MAX_MM, PROPORCIONES,
  validarCreativos, creativosValidos, valorCreativo, rutasDefinidas,
  conflictosCreativos, componerCreativos, completarCreativos,
  exigenciasDe, compatibilidadCreativa,
  crearRegistroDeSkills, resolverSkill, aportacionDeSkill, aportacionDe,
  crearPlanner, crearWorkflowEngine, prepararWorkflow, crearOrchestrator,
  interpretarEntendimiento, leerHints, CAPABILITY_CATALOG,
} = core;

const V = CREATIVE_PARAMETERS_VERSION;
const T0 = 1_800_000_000_000;
const now = () => T0;
const tracer = { record() {} };
let serie = 0;
const traza = () => { serie++; const id = `s2_t_${String(serie).padStart(4, '0')}`; return { traceId: id, requestId: id, userId: 'user-0001' }; };
const QUIEN = { userId: 'user-0001' };

/** Lo que Weë entiende cuando alguien dice «aléjate lentamente desde arriba». */
const DESDE_ARRIBA = {
  version: V,
  camera: { type: 'aerial' },
  movement: { type: 'dolly_out', speed: 'slow' },
  shot: { type: 'establishing' },
};

/* ═══ A · EL CONTRATO ═════════════════════════════════════════════════════ */
console.log('\n── A · Un vocabulario cerrado: lo que no está, no entra ──');
{
  /* A · Válido. */
  check('A) una intención creativa válida lo es', creativosValidos(DESDE_ARRIBA), JSON.stringify(validarCreativos(DESDE_ARRIBA)));
  check('A) y las trece rutas del contrato están todas declaradas', (() => {
    const FUENTE = leer('functions/src/core/creative.ts');
    const grupos = (FUENTE.match(/export interface CreativeParameters \{[\s\S]*?\n\}/) || [''])[0];
    const campos = [...grupos.matchAll(/(\w+)\?: \{ ([^}]+) \}/g)]
      .flatMap(([, grupo, dentro]) => [...dentro.matchAll(/(\w+)\?:/g)].map(([, campo]) => `${grupo}.${campo}`));
    return campos.length === RUTAS_CREATIVAS.length && campos.every((c) => RUTAS_CREATIVAS.includes(c));
  })(), `${RUTAS_CREATIVAS.length} rutas`);

  /* B/G · Inválido y campos desconocidos. */
  check('B) lo que no es un objeto no es una intención',
    [null, 'aerial', 42, []].every((x) => !creativosValidos(x)));
  check('G) un grupo que no existe se rechaza',
    validarCreativos({ version: V, sabor: { type: 'dulce' } }).some((p) => p.reason === 'unknown_field'));
  check('G) y un campo que no existe dentro de un grupo que sí, también',
    validarCreativos({ version: V, camera: { zoom: 3 } }).some((p) => p.reason === 'unknown_field'));

  /* C · Versión. */
  check('C) la versión es obligatoria y es un entero desde 1',
    !creativosValidos({ camera: { type: 'aerial' } })
    && [0, -1, 1.5, '1', NaN].every((v) => !creativosValidos({ version: v, camera: { type: 'aerial' } }))
    && creativosValidos({ version: 1, camera: { type: 'aerial' } }));
  check('C) y Weë escribe hoy con la 1', CREATIVE_PARAMETERS_VERSION === 1 && DESDE_ARRIBA.version === 1);

  /* D · Tipos cerrados. */
  check('D) cada valor sale de una lista cerrada: `dolly_sideways` no existe',
    validarCreativos({ version: V, movement: { type: 'dolly_sideways' } }).some((p) => p.reason === 'invalid_value'));
  check('D) ni un número donde va una palabra, ni al revés',
    !creativosValidos({ version: V, camera: { type: 7 } })
    && !creativosValidos({ version: V, lens: { focalLengthMm: 'largo' } }));

  /* E/F · Rangos y unidades. */
  check('E) la distancia focal tiene rango, y se dice cuando se sale',
    creativosValidos({ version: V, lens: { focalLengthMm: 24 } })
    && validarCreativos({ version: V, lens: { focalLengthMm: FOCAL_MAX_MM + 1 } }).some((p) => p.reason === 'out_of_range')
    && validarCreativos({ version: V, lens: { focalLengthMm: FOCAL_MIN_MM - 1 } }).some((p) => p.reason === 'out_of_range'));
  check('F) las unidades van en el NOMBRE, no en un comentario: `focalLengthMm` son milímetros',
    RUTAS_CREATIVAS.includes('lens.focalLengthMm') && FOCAL_MIN_MM === 4 && FOCAL_MAX_MM === 1200);
  check('F) y la proporción se escribe como se dice, sin convertir a un decimal que cada uno redondee',
    PROPORCIONES.includes('9:16') && creativosValidos({ version: V, framing: { aspectRatio: '9:16' } })
    && !creativosValidos({ version: V, framing: { aspectRatio: 1.777 } }));
  check('E) la interpretación del lenguaje es de Brain: aquí ya llega normalizado',
    !creativosValidos({ version: V, movement: { speed: 'muy lento la verdad' } }));

  /* H/I/J/K · Inyección. */
  check('H/I) NO se puede nombrar un proveedor ni un modelo: no hay dónde',
    ['providerId', 'modelId', 'provider', 'model', 'adapter'].every((k) =>
      validarCreativos({ version: V, [k]: 'x' }).some((p) => p.reason === 'unknown_field')));
  check('J) ni un endpoint, ni una URL',
    ['endpoint', 'url', 'baseUrl'].every((k) => !creativosValidos({ version: V, [k]: 'https://x' })));
  check('K) ni un secreto, ni una credencial, ni una cuenta',
    ['apiKey', 'authorization', 'token', 'accountId', 'credential'].every((k) => !creativosValidos({ version: V, [k]: 'v' })));
  check('H) y tampoco anidado dentro de un grupo que sí existe',
    !creativosValidos({ version: V, camera: { type: 'aerial', providerId: 'x' } }));

  /* L · Prototipo. */
  check('L) `constructor` y `prototype` se rechazan por nombre',
    ['constructor', 'prototype'].every((k) => validarCreativos({ version: V, [k]: 'x' }).some((p) => p.reason === 'dangerous_key')));
  check('L) y una versión HEREDADA no cuenta como propia', (() => {
    const base = { version: V };
    const heredado = Object.create(base);
    heredado.camera = { type: 'aerial' };
    return heredado.version === V && validarCreativos(heredado).some((p) => p.reason === 'invalid_version');
  })());

  /* M · NaN / Infinity. */
  check('M) `NaN` e `Infinity` no son números aquí',
    [NaN, Infinity, -Infinity].every((x) => !creativosValidos({ version: V, lens: { focalLengthMm: x } })));

  /* N · Tamaño. */
  check('N) no hay por dónde mandar algo enorme: sin arrays, sin texto libre, profundidad dos',
    !creativosValidos({ version: V, camera: { type: 'aerial', perspective: { anidado: { mas: 1 } } } })
    && !creativosValidos({ version: V, camera: ['aerial'] })
    && !/string;/.test((leer('functions/src/core/creative.ts').match(/export interface CreativeParameters \{[\s\S]*?\n\}/) || [''])[0]));
  check('P) y no hay ni un campo ejecutable: una función no es un valor válido en ninguna ruta',
    !creativosValidos({ version: V, camera: { type: () => 'aerial' } })
    && !creativosValidos({ version: V, camera: () => ({}) }));

  /* Coherencia declarada, no inventada. */
  check('A) la ÚNICA regla de coherencia: una cámara quieta no tiene velocidad',
    validarCreativos({ version: V, movement: { type: 'static', speed: 'fast' } }).some((p) => p.reason === 'incoherent')
    && creativosValidos({ version: V, movement: { type: 'static' } })
    && creativosValidos({ version: V, movement: { type: 'orbit', speed: 'fast' } }));
}

/* ═══ B · EL TRANSPORTE ═══════════════════════════════════════════════════ */
console.log('\n── B · Por la costura que ya existía, y por ninguna otra ──');
{
  /* O · Brain lo produce, y Brain lo transporta. */
  const leido = interpretarEntendimiento(
    { intent: 'creation', goal: 'una vista de mi restaurante', capability: 'video.image_to_video', creative: DESDE_ARRIBA },
    { intents: ['creation'], capabilities: CAPABILITY_CATALOG.map((c) => c.id), experiences: [] },
  );
  check('O) BRAIN → PARÁMETROS: lo que el modelo entendió llega estructurado, sin una segunda llamada',
    valorCreativo(leido.creative, 'camera.type') === 'aerial'
    && valorCreativo(leido.creative, 'movement.type') === 'dolly_out'
    && valorCreativo(leido.creative, 'movement.speed') === 'slow');
  check('O) y si el modelo se inventa algo, se descarta ENTERO: media intención sería peor que ninguna',
    interpretarEntendimiento(
      { intent: 'creation', creative: { version: V, movement: { type: 'volar_en_circulos' } } },
      { intents: ['creation'], capabilities: [], experiences: [] },
    ).creative === undefined);
  check('O) no hay un segundo modelo, ni un analizador de texto, ni un intérprete',
    !/segundo modelo|parser|tokenize|regexDeLenguaje/.test(sinComentarios(leer('functions/src/core/brain.ts')))
    && !/inputs\.text|\.goal/.test(
      (sinComentarios(leer('functions/src/core/creative.ts')).match(/export const validarCreativos[\s\S]*?\n\};/) || [''])[0]));

  /* El lector de la frontera: uno solo, y es el de siempre. */
  const pistas = leerHints({ quality: 'high', durationSec: 12, creative: DESDE_ARRIBA }, 'hints');
  check('AB) EL MISMO LECTOR que ya usaban Brain, el Planner, el Workflow y el Gateway',
    pistas.ok && pistas.hints.creative.camera.type === 'aerial' && pistas.hints.durationSec === 12);
  check('AB) y rechaza una intención rota antes de que viaje a ningún sitio',
    leerHints({ creative: { version: V, camera: { type: 'submarino' } } }, 'hints').ok === false);
  check('AB) el canal es UNO: `creative` es una clave de `hints`, no una tubería nueva',
    /const CLAVES_DE_HINTS = \['quality', 'durationSec', 'creative'\];/.test(leer('functions/src/core/gateway.ts')));

  /* Q/R · El Planner. */
  const entendimiento = (extra = {}) => ({
    intent: 'creation', confidence: 'high', goal: 'una vista de mi restaurante',
    inputs: { text: 'una vista de mi restaurante', attachments: [] },
    references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
    capability: 'video.image_to_video', capabilities: ['video.image_to_video'],
    ...extra,
  });
  const disponible = (c) => ['text.generate', 'image.generate', 'image.edit', 'video.image_to_video'].includes(String(c));
  const planner = crearPlanner({ availability: { disponible }, tracer, now });
  const pedir = (extra = {}) => planner.planificar({ contract: PLANNER_CONTRACT_VERSION, trace: traza(), understanding: entendimiento(), ...extra });

  const sinNada = await pedir();
  check('R) SIN parámetros creativos el Planner funciona exactamente como antes',
    sinNada.status === 'ready' && sinNada.plan.hints === undefined
    && sinNada.plan.steps.map((s) => s.capability).join(' → ') === 'image.generate → video.image_to_video');

  const conCreativos = await planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza(),
    understanding: entendimiento({ preferences: { creative: DESDE_ARRIBA } }),
  });
  /* Con pistas de las de siempre, para que la comparación mida lo que dice medir. */
  const conCalidad = await pedir({ hints: { quality: 'high' } });
  check('Q) CON parámetros, el plan los lleva —y por el campo de siempre, no por uno nuevo—',
    conCreativos.status === 'ready' && conCreativos.plan?.hints?.creative?.camera?.type === 'aerial'
    && Object.keys(conCreativos.plan ?? {}).join(',') === Object.keys(conCalidad.plan ?? {}).join(',')
    && Object.keys(conCreativos.plan?.hints ?? {}).join(',') === 'creative',
    Object.keys(conCreativos.plan ?? {}).filter((k) => !Object.keys(conCalidad.plan ?? {}).includes(k)).join(',') || 'mismas claves');
  check('Q) y cada paso del plan los lleva: es lo que ya hacía con calidad y duración',
    conCreativos.plan?.steps?.every((s) => s.hints?.creative?.movement?.type === 'dolly_out'));

  /* V/AE · El Workflow los transporta sin haber cambiado. */
  const wf = await crearWorkflowEngine({ tracer, now })
    .construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza(), plan: conCreativos.plan });
  check('AE) EL WORKFLOW NO CAMBIÓ y aun así los transporta: valida las pistas con el lector del Gateway',
    wf.status === 'ready' && wf.workflow?.hints?.creative?.camera?.type === 'aerial'
    && wf.workflow?.steps?.every((s) => s.hints?.creative?.shot?.type === 'establishing')
    && !/[Cc]reative/.test(leer('functions/src/core/workflow.ts')),
    wf.status);

  /* El Orchestrator los entrega al paso, y tampoco cambió. */
  const preparado = wf.status === 'ready' ? prepararWorkflow(wf.workflow) : { ok: false };
  const inicio = preparado.ok && preparado.prepared.iniciar(traza());
  const decision = inicio && inicio.ok
    && crearOrchestrator(preparado.prepared).avanzar({ contract: ORCHESTRATOR_CONTRACT_VERSION, principal: QUIEN, run: inicio.run, at: T0 });
  check('AC) EL ORCHESTRATOR tampoco cambió, y la intención llega al paquete del paso',
    !!decision && decision.dispatch.length > 0 && decision.dispatch[0].hints.creative.camera.type === 'aerial'
    && !/[Cc]reative/.test(leer('functions/src/core/orchestrator.ts')),
    decision ? `${decision.dispatch.length} pasos` : 'no hubo decisión');
}

/* ═══ C · SKILLS ══════════════════════════════════════════════════════════ */
console.log('\n── C · Declarar, resolver, desempatar, chocar y componer ──');
{
  const skill = (id, extra = {}) => ({
    id, version: 1, contract: SKILL_CONTRACT_VERSION, status: 'active',
    intents: ['creation'],
    requiredCapabilities: ['video.image_to_video'], optionalCapabilities: ['image.edit'],
    planFragment: [{ id: 'f_base', capability: 'image.edit' }, { id: 'f_video', capability: 'video.image_to_video' }],
    outputModality: 'video',
    ...extra,
  });

  /* P · Un Skill declara con qué trabaja, en el vocabulario cerrado. */
  const DRONE = skill('drone_view', {
    creative: {
      declares: ['camera.type', 'movement.type', 'movement.speed'],
      requires: { version: V, camera: { type: 'aerial' } },
      prefers: { version: V, movement: { type: 'dolly_out' } },
    },
  });
  check('P) SKILL → PARÁMETROS: un Skill declara rutas del vocabulario, no cadenas libres',
    creativosValidos(DRONE.creative.requires) && DRONE.creative.declares.every((r) => RUTAS_CREATIVAS.includes(r)));
  check('P) una ruta inventada no vale',
    crearRegistroDeSkills([skill('x_uno', { creative: { declares: ['camera.sabor'] } })]).rechazados.length === 1);
  check('P) ni una exigencia que no sea una intención válida',
    crearRegistroDeSkills([skill('x_dos', { creative: { declares: ['camera.type'], requires: { version: V, camera: { type: 'nave' } } } })]).rechazados.length === 1);
  check('P) ni un Skill que exige una cosa y prefiere la contraria: se descartaría a sí mismo',
    crearRegistroDeSkills([skill('x_tres', {
      creative: { declares: ['camera.type'], requires: { version: V, camera: { type: 'aerial' } }, prefers: { version: V, camera: { type: 'ground' } } },
    })]).rechazados.length === 1);
  check('P) y la costura de S1 y la de S2 no conviven: dos formas de decir lo mismo son dos verdades',
    crearRegistroDeSkills([skill('x_cuatro', { parameters: [{ name: 'movimiento' }], creative: { declares: ['camera.type'] } })])
      .rechazados[0]?.problemas.some((p) => p.reason === 'two_shapes'));
  check('P) SkillParameterRef de S1 sigue existiendo y sigue valiendo sola',
    crearRegistroDeSkills([skill('x_cinco', { parameters: [{ name: 'movimiento', required: true }] })]).registro.cuantos() === 1);

  /* §37 · El empate, resuelto y no resuelto. */
  const TIMELAPSE = skill('construction_timelapse', {
    creative: { declares: ['movement.type', 'shot.type'], prefers: { version: V, movement: { type: 'static' }, shot: { type: 'wide' } } },
  });
  const ARQUITECTURA = skill('architecture_visualization', {
    creative: { declares: ['movement.type', 'shot.type'], prefers: { version: V, movement: { type: 'orbit' }, shot: { type: 'establishing' } } },
  });
  const DISPONIBLE = (c) => ['image.edit', 'video.image_to_video'].includes(String(c));
  const resolver = (skills, creative) => resolverSkill(
    { registro: crearRegistroDeSkills(skills).registro, disponible: DISPONIBLE },
    {
      understanding: {
        intent: 'creation', confidence: 'high', goal: 'g', inputs: { text: 'g', attachments: [] },
        references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
        capability: 'video.image_to_video', capabilities: ['video.image_to_video'], modality: 'video',
      },
      ...(creative ? { creative } : {}),
    },
  );

  const empate = resolver([TIMELAPSE, ARQUITECTURA]);
  check('U) SIN parámetros los dos empatan: AMBIGUOUS, y no se inventa un ganador',
    empate.status === 'ambiguous' && empate.candidates.length === 2 && empate.skill === undefined
    /* Y ya se dice por qué: sin evidencia no hay desempate, y encima quieren cosas distintas. */
    && empate.reason === 'creative_conflict' && empate.conflicts.length === 2,
    `${empate.status}/${empate.reason}: ${empate.conflicts?.join(',')}`);

  const conOrbita = resolver([TIMELAPSE, ARQUITECTURA], { version: V, movement: { type: 'orbit' } });
  check('T) CON evidencia suficiente el empate se resuelve: «que rodee el edificio» elige uno',
    conOrbita.status === 'found' && conOrbita.skill.skillId === 'architecture_visualization',
    `${conOrbita.status}/${conOrbita.skill?.skillId}`);
  check('T) y la evidencia contraria elige el otro: la señal decide, no el orden de la lista',
    resolver([TIMELAPSE, ARQUITECTURA], { version: V, movement: { type: 'static' } }).skill?.skillId === 'construction_timelapse');
  check('U) evidencia que no distingue a ninguno NO desempata: sigue AMBIGUOUS',
    resolver([TIMELAPSE, ARQUITECTURA], { version: V, lighting: { type: 'night' } }).status === 'ambiguous');

  /* V · Conflictos. */
  const choque = resolver([TIMELAPSE, ARQUITECTURA], { version: V, lighting: { type: 'night' } });
  check('V) y cuando además se contradicen entre ellos, se dice DÓNDE',
    choque.status === 'ambiguous' && choque.reason === 'creative_conflict'
    && choque.conflicts.includes('movement.type') && choque.conflicts.includes('shot.type'),
    `${choque.reason}: ${choque.conflicts?.join(',')}`);
  check('V) `requires` DESCARTA: un Skill aéreo no atiende una petición a ras de suelo',
    resolver([DRONE], { version: V, camera: { type: 'ground' } }).status === 'none'
    && resolver([DRONE], { version: V, camera: { type: 'ground' } }).reason === 'creative_mismatch');
  check('V) dos intenciones que chocan se detectan ruta a ruta, sin ganador',
    conflictosCreativos({ version: V, camera: { type: 'aerial' } }, { version: V, camera: { type: 'underwater' } }).join(',') === 'camera.type'
    && conflictosCreativos({ version: V, camera: { type: 'aerial' } }, { version: V, shot: { type: 'hero' } }).length === 0);

  /* W/§39 · Composición. */
  const compuesto = componerCreativos([
    { version: V, shot: { type: 'hero' } },
    { version: V, lighting: { type: 'golden_hour' } },
    { version: V, camera: { type: 'aerial' }, movement: { type: 'dolly_out', speed: 'slow' } },
  ]);
  check('W) COMPOSICIÓN: cuatro Skills aportando a la vez se juntan en una sola intención',
    compuesto.conflicts.length === 0 && creativosValidos(compuesto.parameters)
    && rutasDefinidas(compuesto.parameters).join(',') === 'camera.type,shot.type,movement.type,movement.speed,lighting.type',
    rutasDefinidas(compuesto.parameters).join(','));
  check('W) y lo que choca NO entra en la composición: se devuelve como conflicto, sin elegir',
    (() => {
      const r = componerCreativos([{ version: V, camera: { type: 'aerial' } }, { version: V, camera: { type: 'underwater' } }]);
      return r.conflicts.join(',') === 'camera.type' && valorCreativo(r.parameters, 'camera.type') === undefined;
    })());
  check('W) el Skill RELLENA los huecos y nunca pisa lo que se pidió',
    valorCreativo(completarCreativos({ version: V, camera: { type: 'ground' } }, { version: V, camera: { type: 'aerial' }, movement: { type: 'orbit' } }), 'camera.type') === 'ground'
    && valorCreativo(completarCreativos({ version: V, camera: { type: 'ground' } }, { version: V, movement: { type: 'orbit' } }), 'movement.type') === 'orbit');

  /* El aporte al Planner. */
  const aporte = aportacionDeSkill(DRONE);
  check('S) lo que un Skill le pasa al Planner lleva su intención, y nada más del descriptor',
    aporte.creative.camera.type === 'aerial' && aporte.creative.movement.type === 'dolly_out'
    && aporte.declares === undefined && aporte.requires === undefined);
  check('S) y sigue sin poder elegir implementación: no hay campo donde ponerla',
    !JSON.stringify(aporte).includes('provider') && !JSON.stringify(aporte).includes('model'));
}

/* ═══ D · CONTRA LO QUE SE PUEDE SERVIR ══════════════════════════════════ */
console.log('\n── D · «No lo soporta» y «no lo sé» no son lo mismo ──');
{
  const exige = exigenciasDe({ version: V, movement: { type: 'orbit' }, framing: { aspectRatio: '9:16' } }, { durationSec: 15 });
  check('X/Y/Z) de la intención salen exigencias abstractas: movimiento de cámara, proporción y duración',
    exige.cameraMotion === true && exige.aspectRatio === '9:16' && exige.durationSec === 15);
  check('Z) y quedarse quieto NO exige control de cámara',
    exigenciasDe({ version: V, movement: { type: 'static' } }).cameraMotion === false);

  /* Y · Duración contra los límites que el registro SÍ declara. */
  const corto = compatibilidadCreativa({ durationSec: 15 }, { maxDurationSec: 10 });
  check('Y) DURACIÓN: el registro ya declara `maxDurationSec`, así que esto se contesta de verdad',
    corto[0].requirement === 'durationSec' && corto[0].verdict === 'unsupported'
    && compatibilidadCreativa({ durationSec: 8 }, { maxDurationSec: 10, minDurationSec: 4 })[0].verdict === 'ok');
  check('Y) y la duración NO se duplica en el lenguaje creativo: ya vivía en `hints.durationSec`',
    !RUTAS_CREATIVAS.some((r) => /duration/i.test(r))
    && /durationSec\?: number;/.test(leer('functions/src/core/gateway.ts')));

  /* Z/AA · Lo que el registro no declara se contesta «no lo sé». */
  const camara = compatibilidadCreativa({ cameraMotion: true }, {});
  check('Z) CONTROL DE CÁMARA: hoy NINGÚN campo del registro lo declara, y se dice `unknown`, no `ok`',
    camara[0].verdict === 'unknown' && camara[0].detail.includes('no declara control de cámara'));
  check('Z) pero el contrato ya distingue las tres respuestas: soportado, no soportado y desconocido',
    compatibilidadCreativa({ cameraMotion: true }, { cameraMotion: true })[0].verdict === 'ok'
    && compatibilidadCreativa({ cameraMotion: true }, { cameraMotion: false })[0].verdict === 'unsupported');
  check('X/AA) PROPORCIÓN y CALIDAD: igual — si el registro no lo declara, no se promete',
    compatibilidadCreativa({ aspectRatio: '9:16' }, {})[0].verdict === 'unknown'
    && compatibilidadCreativa({ aspectRatio: '9:16' }, { aspectRatios: ['16:9'] })[0].verdict === 'unsupported'
    && compatibilidadCreativa({ aspectRatio: '9:16' }, { aspectRatios: ['9:16', '16:9'] })[0].verdict === 'ok');
  check('AA) la calidad tampoco se duplica: `hints.quality` ya existía y el Router ya la lee',
    !RUTAS_CREATIVAS.some((r) => /quality|resolution/i.test(r))
    && /quality\?: 'standard' \| 'high' \| 'max';/.test(leer('functions/src/core/gateway.ts')));
}

/* ═══ E · LO QUE NO CAMBIÓ ════════════════════════════════════════════════ */
console.log('\n── E · Un lenguaje nuevo que no obligó a nadie a cambiar ──');
{
  const CREATIVE = sinComentarios(leer('functions/src/core/creative.ts'));

  check('AB) PROVIDER-AGNOSTIC: ni un proveedor, ni un modelo, ni una API, ni Firebase, ni interfaz',
    !/gemini|seedance|elevenlabs|openai|anthropic|deepseek|bytedance|kling|veo|runway|wan|firebase|react/i.test(CREATIVE));
  check('AB) Core puro: ni reloj, ni azar, ni disco, ni red, y solo importa del Core',
    !/Date\.now\(|Math\.random\(|new Date\(|node:|require\(|fetch\(/.test(CREATIVE)
    && [...leer('functions/src/core/creative.ts').matchAll(/from '([^']+)'/g)].every(([, d]) => d.startsWith('./')));
  check('C/D) NO hay cajón: ningún campo de ninguna interfaz es `Record<string, unknown>`',
    ![...CREATIVE.matchAll(/export interface \w+ \{[\s\S]*?\n\}/g)].map(([s]) => s).join('\n').includes('Record<string, unknown>'));

  check('AD) EL ROUTER no cambió y no sabe qué es esto',
    !/[Cc]reative/.test(leer('functions/src/core/router.ts')));
  check('AE) EL WORKFLOW no cambió', !/[Cc]reative/.test(leer('functions/src/core/workflow.ts')));
  check('AF) EL JOB ENGINE no cambió',
    !/[Cc]reative/.test(leer('functions/src/core/job.ts') + leer('functions/src/core/job-queue.ts') + leer('functions/src/job/index.ts')));
  check('AG) EL TRABAJADOR DURABLE no cambió',
    !/[Cc]reative/.test(leer('functions/src/job/worker.ts') + leer('functions/src/runtime/cola-durable.ts') + leer('functions/src/runtime/conductor.ts')));
  check('AH) MEDIA CLOUD no cambió',
    fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/media')).every((f) => !/[Cc]reative/.test(leer(`functions/src/core/media/${f}`))));
  check('AI) EL FINANCIAL CORE y el Credit Engine no cambiaron: esto no cobra nada',
    !/[Cc]reative/.test(leer('functions/src/credits/creditEngine.ts'))
    && fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/financial')).every((f) => !/[Cc]reative/.test(leer(`functions/src/core/financial/${f}`)))
    && !/credit|cobr|reembols|spend|precio|price/i.test(CREATIVE));
  check('AJ) EL LEGACY no cambió: ni ExperienceTemplate, ni las once experiencias, ni el Creator',
    !/[Cc]reative/.test(leer('functions/src/creator/templates.ts') + leer('functions/src/creator/planner.ts') + leer('functions/src/creator/index.ts')));
  check('AC) NINGÚN adaptador se tocó: traducir a la sintaxis de cada modelo sigue siendo suyo',
    fs.readdirSync(path.resolve(RAIZ, 'functions/src/engine/providers'))
      .every((f) => !/[Cc]reative/.test(leer(`functions/src/engine/providers/${f}`))));
  check('§34) NO hay interfaz: ni panel, ni selector de cámara, ni elector de Skill',
    !fs.existsSync(path.resolve(RAIZ, 'components/creator/CreativeParameters.tsx'))
    && !/CreativeParameter|creative\./.test(leer('components/creator/CajaDePrompt.tsx')));
  check('§26/§40) sigue sin haber promptTransform, ni Visual Context, ni Elements, ni Director, ni Evals',
    !/promptTransform|VisualContext|ElementDescriptor|DirectorEngine|EvalRunner/.test(CREATIVE + sinComentarios(leer('functions/src/core/skill.ts'))));
  check('§41) S1 INTACTA: el descriptor, el registro y el resolutor siguen ahí con sus nombres',
    ['SkillDescriptor', 'SkillParameterRef', 'crearRegistroDeSkills', 'resolverSkill', 'referenciaDeSkill']
      .every((s) => new RegExp(s).test(leer('functions/src/core/skill.ts'))));
  check('§31) y no hay ni SkillQueue, ni CreativeQueue, ni CreativeWorker',
    !/SkillQueue|CreativeQueue|CreativeWorker|crearColaCreativa/.test(CREATIVE + leer('functions/src/core/skill.ts')));

  check('esta suite está en la cadena de `npm test`', /creative\.test\.mjs/.test(leer('functions/package.json')));
}

/* ═══ F · LA EXPERIENCIA HUMANA ══════════════════════════════════════════ */
console.log('\n── F · «Quiero que la cámara se aleje lentamente desde arriba» ──');
{
  /*
   * §36 · DE PRINCIPIO A FIN, sin que nadie escriba una palabra del
   * vocabulario. La persona dice una frase. Brain la entiende. El resolutor
   * encuentra el Skill. El Planner planifica. Nadie llama a ningún proveedor.
   */
  const LO_QUE_DIJO = 'Quiero que la cámara se aleje lentamente desde arriba mostrando mi restaurante.';

  /* 1 · Brain entiende. Lo estructurado sale del MISMO modelo que ya entendía. */
  const leido = interpretarEntendimiento(
    {
      intent: 'creation', confidence: 'high', goal: LO_QUE_DIJO,
      capability: 'video.image_to_video', capabilities: ['video.image_to_video'],
      creative: DESDE_ARRIBA,
    },
    { intents: ['creation'], capabilities: CAPABILITY_CATALOG.map((c) => c.id), experiences: [] },
  );
  const entendido = {
    intent: 'creation', confidence: 'high', goal: LO_QUE_DIJO,
    inputs: { text: LO_QUE_DIJO, attachments: [] },
    references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
    capability: 'video.image_to_video', capabilities: ['video.image_to_video'], modality: 'video',
    preferences: { creative: leido.creative },
  };
  check('§36) 1 · la persona escribió una frase, y NO escribió `aerial`, ni `dolly_out`, ni «Drone View»',
    !/aerial|dolly|drone|camera\.|movement\./i.test(LO_QUE_DIJO)
    && valorCreativo(entendido.preferences.creative, 'camera.type') === 'aerial');

  /* 2 · El resolutor encuentra el Skill, con lo que Brain entendió. */
  const DRONE = {
    id: 'drone_view', version: 1, contract: SKILL_CONTRACT_VERSION, status: 'active',
    intents: ['creation'],
    requiredCapabilities: ['video.image_to_video'], optionalCapabilities: ['image.generate'],
    planFragment: [
      { id: 'f_base', capability: 'image.generate', purpose: 'preparar la vista de partida' },
      { id: 'f_vuelo', capability: 'video.image_to_video', purpose: 'alejar la cámara como si volara' },
    ],
    outputModality: 'video',
    creative: {
      declares: ['camera.type', 'movement.type', 'movement.speed'],
      requires: { version: V, camera: { type: 'aerial' } },
      prefers: { version: V, movement: { type: 'dolly_out', speed: 'slow' } },
    },
  };
  const disponible = (c) => ['image.generate', 'video.image_to_video'].includes(String(c));
  const hallado = resolverSkill(
    { registro: crearRegistroDeSkills([DRONE]).registro, disponible },
    { understanding: entendido },
  );
  check('§36) 2 · el resolutor encuentra el Skill con lo que Brain entendió, sin mirar el texto',
    hallado.status === 'found' && hallado.skill.skillId === 'drone_view');

  /* 3 · El Planner planifica. El Skill aporta; el Planner manda. */
  const plan = await crearPlanner({ availability: { disponible }, tracer, now }).planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza(), understanding: entendido, skill: aportacionDe(hallado),
  });
  check('§36) 3 · el Planner planifica, y el orden lo sigue poniendo el CATÁLOGO',
    plan.status === 'ready' && plan.plan.steps.map((s) => s.capability).join(' → ') === 'image.generate → video.image_to_video',
    plan.plan?.steps.map((s) => s.capability).join(' → ') ?? plan.status);
  check('§36) 4 · y la intención llega entera al plan, con lo que dijo la persona intacto',
    valorCreativo(plan.plan.hints.creative, 'camera.type') === 'aerial'
    && valorCreativo(plan.plan.hints.creative, 'movement.speed') === 'slow'
    && plan.plan.assumptions.includes('skill:drone_view@1'));
  check('§36) 5 · sin llamar a ningún proveedor, sin generar nada, sin crear ningún trabajo',
    !JSON.stringify(plan.plan).toLowerCase().includes('provider')
    && !JSON.stringify(plan.plan).toLowerCase().includes('model'));

  /* §38 · Y sin Skill, todo sigue funcionando. La regla que manda sobre todas. */
  const sinSkill = resolverSkill({ registro: crearRegistroDeSkills([]).registro, disponible }, { understanding: entendido });
  const planSinSkill = await crearPlanner({ availability: { disponible }, tracer, now }).planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza(), understanding: entendido, skill: aportacionDe(sinSkill),
  });
  check('§38) SIN SKILL: `none`, y el plan sale igual de bien con la intención de la persona intacta',
    sinSkill.status === 'none' && planSinSkill.status === 'ready'
    && planSinSkill.plan.steps.length === 2
    && valorCreativo(planSinSkill.plan.hints.creative, 'movement.type') === 'dolly_out'
    && !planSinSkill.plan.assumptions.some((a) => a.startsWith('skill:')));

  /*
   * §39 · CUATRO SKILLS A LA VEZ. Ninguno ejecuta, ninguno elige proveedor,
   * ninguno crea un trabajo: aportan intención, y el Planner planifica.
   */
  const aporta = (id, creative) => ({
    id, version: 1, contract: SKILL_CONTRACT_VERSION, status: 'active', intents: ['creation'],
    requiredCapabilities: ['video.image_to_video'], planFragment: [{ id: 'f_uno', capability: 'video.image_to_video' }],
    outputModality: 'video', creative,
  });
  const cuatro = [
    aporta('product_advertisement', { declares: ['shot.type'], prefers: { version: V, shot: { type: 'hero' } } }),
    aporta('food_photography', { declares: ['lighting.type'], prefers: { version: V, lighting: { type: 'golden_hour' } } }),
    aporta('drone_shot', { declares: ['camera.type'], prefers: { version: V, camera: { type: 'aerial' } } }),
    aporta('hero_shot', { declares: ['movement.type'], prefers: { version: V, movement: { type: 'dolly_out' } } }),
  ];
  check('§39) los cuatro son descriptores válidos, y ninguno nombra un proveedor',
    crearRegistroDeSkills(cuatro).registro.cuantos() === 4
    && !JSON.stringify(cuatro).toLowerCase().includes('provider'));
  const junto = componerCreativos(cuatro.map((s) => aportacionDeSkill(s).creative));
  check('§39) y sus intenciones se componen en una sola: aéreo, alejándose, plano héroe y luz dorada',
    junto.conflicts.length === 0
    && valorCreativo(junto.parameters, 'camera.type') === 'aerial'
    && valorCreativo(junto.parameters, 'movement.type') === 'dolly_out'
    && valorCreativo(junto.parameters, 'shot.type') === 'hero'
    && valorCreativo(junto.parameters, 'lighting.type') === 'golden_hour');
  check('§39) sin ejecutar nada, sin elegir implementación y sin crear un solo trabajo',
    !/ejecutar|crearTrabajo|enqueue|claim/.test(sinComentarios(leer('functions/src/core/creative.ts'))));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
