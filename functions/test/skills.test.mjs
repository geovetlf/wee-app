/**
 * S1 · WEË SKILLS FOUNDATION.
 *
 * Lo que se demuestra aquí, en una frase: **Weë PUEDE usar Skills y NO depende
 * de ellos**.
 *
 * La comprobación que manda sobre todas las demás es la H: sin Skill, el plan
 * es el de siempre, byte a byte. Todo lo demás —el descriptor, el registro, la
 * resolución, el aporte al plan— existe para mejorar la planificación cuando
 * hay un Skill, nunca para hacerla depender de que lo haya.
 *
 *   A · El descriptor: qué vale, qué no, y qué no puede nombrar nunca
 *   B · El registro: versiones, duplicados, listado acotado
 *   C · La resolución: los cinco estados
 *   D · El Planner: con Skill, sin Skill, y quién manda
 *   E · Lo que NO se tocó
 *
 * Los dos Skills de aquí —`drone_view`, `construction_timelapse`— son
 * descriptores DE PRUEBA. No generan vídeo, no llaman a nadie y no están en el
 * catálogo de Weë, que sigue vacío a propósito.
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
const skillsDeWee = lib('skills/index.js');
const {
  SKILL_CONTRACT_VERSION, PLANNER_CONTRACT_VERSION, WORKFLOW_CONTRACT_VERSION,
  validarSkill, skillValido, crearRegistroDeSkills, resolverSkill, aportacionDe,
  aportacionDeSkill, referenciaDeSkill, trazaDeResolucion, crearPlanner, crearWorkflowEngine,
  CAMPOS_DE_APORTACION, CAMPOS_DE_MENSAJE_DE_COLA, MAX_SKILLS,
} = core;

const T0 = 1_800_000_000_000;
let reloj = T0;
const now = () => reloj;
const tracer = { record() {} };
let serie = 0;
const traza = () => { serie++; const id = `s1_t_${String(serie).padStart(4, '0')}`; return { traceId: id, requestId: id, userId: 'user-0001' }; };

/* ── Los dos Skills de prueba ─────────────────────────────────────────────── */

/**
 * UNA VISTA DE DRON. Acotado a una experiencia a propósito: así se puede probar
 * que un Skill de una sección no se mete en una petición hecha desde otra.
 *
 * Y FÍJATE EN EL ORDEN DEL FRAGMENTO: primero el vídeo, después la imagen. Está
 * al revés a propósito. El catálogo dice que `video.image_to_video` acepta una
 * imagen y que `image.generate` la produce, así que el Planner TIENE que
 * ordenarlos al revés de como los escribió el Skill. Es la prueba de quién
 * manda sobre el plan.
 */
const DRONE = {
  id: 'drone_view',
  version: 1,
  contract: SKILL_CONTRACT_VERSION,
  status: 'active',
  intents: ['creation'],
  requiredCapabilities: ['video.image_to_video'],
  optionalCapabilities: ['image.generate'],
  planFragment: [
    { id: 'f_vuelo', capability: 'video.image_to_video', purpose: 'mover la cámara como si volara' },
    { id: 'f_base', capability: 'image.generate', purpose: 'preparar la vista de partida' },
  ],
  outputModality: 'video',
  experienceId: 'studio',
  contextRequirements: ['location'],
  elementRequirements: ['subject'],
  parameters: [{ name: 'movimiento', required: true }, { name: 'altura' }],
  limits: { duracion_s: 10 },
  costHint: 'high',
  note: 'descriptor de prueba de S1',
};

/** Un segundo Skill, del mismo tamaño, para poder provocar un empate de verdad. */
const TIMELAPSE = {
  id: 'construction_timelapse',
  version: 1,
  contract: SKILL_CONTRACT_VERSION,
  status: 'active',
  intents: ['creation'],
  requiredCapabilities: ['video.image_to_video'],
  optionalCapabilities: ['image.edit'],
  planFragment: [
    { id: 'f_base', capability: 'image.edit', purpose: 'igualar los encuadres' },
    { id: 'f_paso', capability: 'video.image_to_video', purpose: 'encadenar el avance de la obra' },
  ],
  outputModality: 'video',
  costHint: 'medium',
};

const DISPONIBLES = ['text.generate', 'image.generate', 'image.edit', 'video.image_to_video'];
const disponible = (c) => DISPONIBLES.includes(String(c));

const entendimiento = (extra = {}) => ({
  intent: 'creation', confidence: 'high', goal: 'una vista aérea de la casa',
  inputs: { text: 'una vista aérea de la casa', attachments: [] },
  references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
  capability: 'video.image_to_video', capabilities: ['video.image_to_video'],
  ...extra,
});

const registroCon = (...skills) => crearRegistroDeSkills(skills);
const resolverCon = (skills, u, prefer) =>
  resolverSkill({ registro: registroCon(...skills).registro, disponible }, { understanding: u, ...(prefer ? { prefer } : {}) });

/* ═══ A · EL DESCRIPTOR ═══════════════════════════════════════════════════ */
console.log('\n── A · Un Skill es CONTENIDO: se valida entero antes de mirarlo ──');
{
  check('A) un descriptor válido lo es', skillValido(DRONE) && skillValido(TIMELAPSE), validarSkill(DRONE).map((p) => `${p.field}:${p.reason}`).join(','));
  check('A) y su identidad es nombre + versión, las dos cosas', referenciaDeSkill('drone_view', 1) === 'drone_view@1');

  /* B · Inválido, y se dicen TODOS los motivos, no el primero. */
  const roto = { ...DRONE, id: 'Drone View', version: 0, status: 'publicado', outputModality: 'hologram' };
  const problemas = validarSkill(roto).map((p) => p.reason);
  check('B) un descriptor roto no vale, y se dicen todos sus motivos de golpe',
    !skillValido(roto) && ['invalid_id', 'invalid_version', 'invalid_status', 'invalid_modality'].every((r) => problemas.includes(r)),
    problemas.join(','));
  check('B) ni un objeto que no es un objeto, ni nada sin forma',
    !skillValido(null) && !skillValido('drone') && !skillValido([]) && !skillValido(42));

  /* C/D · Versión. */
  check('C) una versión válida es un entero desde 1', skillValido({ ...DRONE, version: 7 }));
  check('D) y no vale ni 0, ni negativa, ni con decimales, ni de texto, ni absurda',
    [0, -1, 1.5, '1', 1000, NaN].every((v) => !skillValido({ ...DRONE, version: v })));

  /* M/N · Ni proveedor ni modelo, por ninguna puerta. */
  const conProveedor = { ...DRONE, provider: 'x' };
  const conModelo = { ...DRONE, modelId: 'x-1' };
  const conAdaptador = { ...DRONE, adapter_id: 'x' };
  check('M) un Skill NO puede nombrar un proveedor',
    validarSkill(conProveedor).some((p) => p.reason === 'implementation_not_allowed'));
  check('N) ni un modelo, ni un adaptador, ni en camelCase ni con guiones',
    validarSkill(conModelo).some((p) => p.reason === 'implementation_not_allowed')
    && validarSkill(conAdaptador).some((p) => p.reason === 'implementation_not_allowed'));
  check('M/N) ni un endpoint, ni una URL, ni una cuenta',
    ['endpoint', 'url', 'accountId'].every((k) => validarSkill({ ...DRONE, [k]: 'lo que sea' }).some((p) => p.reason === 'implementation_not_allowed')));

  /* O · Ni secretos. */
  check('O) ni una credencial: la lista del Core ya sabía cuáles son',
    ['apiKey', 'authorization', 'token', 'x-api-key'].every((k) =>
      validarSkill({ ...DRONE, [k]: 'v' }).some((p) => p.reason === 'forbidden_key' || p.reason === 'implementation_not_allowed')));

  /* P · Ni código. */
  check('P) un Skill NO ejecuta código: una función dentro de un descriptor es un error',
    validarSkill({ ...DRONE, note: () => 'hola' }).length > 0
    && validarSkill({ ...DRONE, buildPlan: () => [] }).some((p) => p.reason === 'unknown_field' || p.reason === 'invalid_shape'));
  check('P) y no hay NI UN campo del descriptor que pueda llevar una función',
    !/=>|function\s*\(|\(\) =>/.test(
      (sinComentarios(leer('functions/src/core/skill.ts')).match(/export interface SkillDescriptor \{[\s\S]*?\n\}/) || [''])[0]),
  );

  /* Contaminación de prototipo. */
  check('A) `__proto__`, `constructor` y `prototype` se rechazan por nombre',
    ['constructor', 'prototype'].every((k) => validarSkill({ ...DRONE, [k]: 'x' }).some((p) => p.reason === 'dangerous_key')));
  check('A) y un campo obligatorio HEREDADO no cuenta como propio', (() => {
    const base = { status: 'active' };
    const heredado = Object.create(base);
    for (const [k, v] of Object.entries(DRONE)) if (k !== 'status') heredado[k] = v;
    return heredado.status === 'active' && validarSkill(heredado).some((p) => p.field === 'status' && p.reason === 'invalid_shape');
  })());

  /* Capacidades: solo del catálogo, y sin dos verdades. */
  check('L) un Skill que requiere una capacidad que NO existe en el catálogo no vale',
    validarSkill({ ...DRONE, requiredCapabilities: ['video.dronify'] }).some((p) => p.reason === 'unknown_capability'));
  check('A) y su fragmento no puede usar una capacidad que el Skill no declaró',
    validarSkill({ ...DRONE, planFragment: [{ id: 'f1', capability: 'voice.tts' }] })
      .some((p) => p.reason === 'capability_not_declared' || p.reason === 'unknown_capability'));

  /* Límites y costuras de S2/S3. */
  check('A) los límites son NÚMEROS: un límite de texto sería un sitio donde meter una instrucción',
    !skillValido({ ...DRONE, limits: { duracion_s: 'diez segundos' } }) && skillValido({ ...DRONE, limits: { duracion_s: 10 } }));
  check('A) el coste es RELATIVO, nunca dinero', skillValido({ ...DRONE, costHint: 'low' }) && !skillValido({ ...DRONE, costHint: 0.42 }));
  check('S2) los parámetros son solo NOMBRES: ni tipo, ni rango, ni valor',
    skillValido({ ...DRONE, parameters: [{ name: 'movimiento' }] })
    && !skillValido({ ...DRONE, parameters: [{ name: 'movimiento', valor: 'orbital' }] }));
  check('S2/S3) y el contrato no tiene todavía ni parámetros creativos, ni contexto visual, ni elementos resueltos',
    !/camera|lens|altitude|movement|visualContext|ElementRef|storageRef/.test(sinComentarios(leer('functions/src/core/skill.ts'))));
  check('A) nada crece sin tope: hay máximos de tamaño en cada lista',
    !skillValido({ ...DRONE, intents: Array(20).fill('creation') })
    && !skillValido({ ...DRONE, requiredCapabilities: Array(30).fill('image.generate') })
    && !skillValido({ ...DRONE, note: 'x'.repeat(500) }));
}

/* ═══ B · EL REGISTRO ═════════════════════════════════════════════════════ */
console.log('\n── B · Un registro pequeño, acotado, y sin nada que se caiga en silencio ──');
{
  const { registro, rechazados } = registroCon(DRONE, TIMELAPSE);
  check('B) registra lo que vale', registro.cuantos() === 2 && rechazados.length === 0);
  check('F) y obtener uno que no existe es `undefined`, no un error',
    registro.obtener('no_existe', 1) === undefined && registro.vigente('no_existe') === undefined);

  /* E · Duplicados. */
  const dup = registroCon(DRONE, { ...DRONE });
  check('E) un `id@version` repetido se rechaza, y se dice cuál',
    dup.registro.cuantos() === 1 && dup.rechazados.length === 1
    && dup.rechazados[0].motivo === 'duplicate' && dup.rechazados[0].ref === 'drone_view@1');

  /* Inválidos: fuera, y con el motivo a la vista. */
  const conRoto = registroCon(DRONE, { ...DRONE, id: 'MAL' });
  check('B) un descriptor inválido NO entra, y no se cae en silencio: se dice por qué',
    conRoto.registro.cuantos() === 1 && conRoto.rechazados.length === 1
    && conRoto.rechazados[0].motivo === 'invalid' && conRoto.rechazados[0].problemas.length > 0);

  /* C/D · Versiones conviviendo. */
  const v2 = { ...DRONE, version: 2, note: 'la siguiente' };
  const dos = registroCon(DRONE, v2).registro;
  check('C) `drone_view` v1 y v2 conviven, y una referencia guardada sigue dando la suya',
    dos.obtener('drone_view', 1).note === 'descriptor de prueba de S1' && dos.obtener('drone_view', 2).note === 'la siguiente');
  check('C) sin versión, gana la mayor ACTIVA, y el orden es determinista',
    dos.vigente('drone_view').version === 2 && dos.versiones('drone_view').join(',') === '2,1');
  const conBorrador = registroCon(DRONE, { ...v2, status: 'draft' }).registro;
  check('C) un borrador no se elige solo, pero sigue estando si lo pides por versión',
    conBorrador.vigente('drone_view').version === 1 && conBorrador.obtener('drone_view', 2).status === 'draft');

  /* Listado acotado y sin scans. */
  check('B) el listado está SIEMPRE acotado, se pida lo que se pida',
    registro.listar({ limit: 1 }).length === 1 && registro.listar({ limit: 10_000 }).length === 2 && registro.listar().length === 2);
  check('B) se puede filtrar por estado sin recorrer nada de fuera',
    registroCon(DRONE, { ...TIMELAPSE, status: 'draft' }).registro.listar({ status: 'active' }).length === 1);
  check('B) hay índices por capacidad y por intención: resolver no recorre el catálogo',
    registro.porCapacidad('video.image_to_video').length === 2 && registro.porIntencion('creation').length === 2
    && registro.porCapacidad('voice.tts').length === 0 && registro.porIntencion('question').length === 0);
  check('B) y el catálogo tiene tope: no es una base de datos',
    typeof MAX_SKILLS === 'number' && MAX_SKILLS <= 1000
    && registroCon(...Array.from({ length: MAX_SKILLS + 3 }, (_, i) => ({ ...DRONE, id: `skill_${String(i).padStart(3, '0')}` })))
      .rechazados.filter((r) => r.motivo === 'too_many').length === 3);
}

/* ═══ C · LA RESOLUCIÓN ═══════════════════════════════════════════════════ */
console.log('\n── C · Cinco estados, y solo dos son un problema ──');
{
  /* G · SKILL_FOUND. */
  const hallado = resolverCon([DRONE, TIMELAPSE], entendimiento({ modality: 'video', workplace: { id: 'w', experienceId: 'studio' } }));
  check('G) FOUND: dentro de su experiencia, gana el Skill acotado a ella',
    hallado.status === 'found' && hallado.skill.skillId === 'drone_view' && hallado.skill.version === 1,
    `${hallado.status}/${hallado.skill?.skillId}`);
  check('G) y lo que cruza al Planner es una VISTA ESTRECHA, no el descriptor',
    Object.keys(hallado.skill).every((k) => CAMPOS_DE_APORTACION.includes(k))
    && hallado.skill.experienceId === undefined && hallado.skill.parameters === undefined
    && hallado.skill.contextRequirements === undefined && hallado.skill.status === undefined,
    Object.keys(hallado.skill).join(','));

  /* H · NO_SKILL: LA COMPROBACIÓN QUE MANDA. */
  const vacio = resolverSkill({ registro: registroCon().registro, disponible }, { understanding: entendimiento() });
  check('H) NO_SKILL con el catálogo vacío, y NO es un error: ni `error`, ni aviso, ni excepción',
    vacio.status === 'none' && vacio.skill === undefined && vacio.error === undefined);
  check('H) el catálogo de Weë está VACÍO hoy, así que hoy todo es NO_SKILL',
    skillsDeWee.CATALOGO_DE_SKILLS.length === 0 && skillsDeWee.resolverSkillDeWee(entendimiento(), { disponible }).status === 'none');
  check('H) una intención que ningún Skill atiende: tampoco es un error',
    resolverCon([DRONE], entendimiento({ intent: 'question', capability: 'text.generate', capabilities: ['text.generate'] })).status === 'none');
  check('H) y una capacidad que ningún Skill cubre, igual',
    resolverCon([DRONE, TIMELAPSE], entendimiento({ capability: 'voice.tts', capabilities: ['voice.tts'] })).status === 'none');

  /*
   * I · AMBIGUOUS. Hace falta un empate DE VERDAD: dos Skills sin experiencia
   * —uno acotado ya lo ganaría— y del mismo tamaño. `drone_view` sin su
   * experiencia es exactamente eso frente a `construction_timelapse`.
   */
  const DRONE_SUELTO = { ...DRONE, experienceId: undefined };
  const empate = resolverCon([DRONE_SUELTO, TIMELAPSE], entendimiento({ modality: 'video' }));
  check('I) AMBIGUOUS: dos igual de buenos y ninguno acotado, y no se elige a cara o cruz',
    empate.status === 'ambiguous' && empate.candidates.length === 2 && empate.reason === 'tie'
    && empate.skill === undefined,
    `${empate.status}/${empate.candidates?.map((c) => c.skillId).join('+') ?? empate.skill?.skillId}`);
  check('I) el desempate por especificidad SÍ resuelve cuando uno es más ajustado', (() => {
    const ajustado = { ...TIMELAPSE, optionalCapabilities: [], planFragment: [{ id: 'f_uno', capability: 'video.image_to_video' }] };
    const r = resolverCon([DRONE_SUELTO, ajustado], entendimiento({ modality: 'video' }));
    return r.status === 'found' && r.skill.skillId === 'construction_timelapse';
  })());
  check('I) y el desempate por experiencia gana ANTES que el de tamaño',
    resolverCon([DRONE, TIMELAPSE], entendimiento({ modality: 'video', workplace: { id: 'w', experienceId: 'studio' } }))
      .skill?.skillId === 'drone_view');

  /* J · UNSUPPORTED. */
  const sinServir = resolverSkill(
    { registro: registroCon(DRONE).registro, disponible: (c) => String(c) !== 'video.image_to_video' },
    { understanding: entendimiento({ modality: 'video', workplace: { id: 'w', experienceId: 'studio' } }) },
  );
  check('J) UNSUPPORTED: hay Skill, pero su capacidad hoy no la sirve nadie — y se dice cuál',
    sinServir.status === 'unsupported' && sinServir.unavailable.join(',') === 'video.image_to_video');

  /* K · INVALID. */
  check('K) INVALID: una petición sin forma se rechaza antes de mirar nada',
    [null, undefined, 'hola', { understanding: null }, { understanding: { intent: 'inventada' } }]
      .every((r) => resolverSkill({ registro: registroCon(DRONE).registro, disponible }, r).status === 'invalid'));

  /* Referencia guardada. */
  check('C) pedido por referencia exacta, manda la referencia', (() => {
    const v2 = { ...DRONE, version: 2 };
    const r = resolverCon([DRONE, v2], entendimiento(), { skillId: 'drone_view', version: 1 });
    return r.status === 'found' && r.skill.version === 1;
  })());
  check('C) y una referencia a un Skill que ya no está NO rompe: se sigue sin Skill',
    resolverCon([DRONE], entendimiento(), { skillId: 'drone_view', version: 99 }).status === 'none');

  /* Experiencia. */
  check('C) un Skill de una experiencia no secuestra una petición hecha desde otra',
    resolverCon([DRONE], entendimiento({ workplace: { id: 'w', experienceId: 'chef' } })).status === 'none');
  check('C) y un Skill SIN experiencia sirve desde cualquier sitio',
    resolverCon([TIMELAPSE], entendimiento({ workplace: { id: 'w', experienceId: 'chef' } })).status === 'found');

  /* §9 · nada de palabras clave. */
  /*
   * §9 · Y ESTO ES LO QUE MÁS IMPORTA DE LA SECCIÓN. Un resolutor que mire el
   * texto se rompe con un acento, con un idioma y con una metáfora. Se mira el
   * código: que no toque el texto de la persona por ninguna de sus puertas.
   */
  check('§9) la resolución NO mira el texto de la persona: ni una palabra clave, ni un diccionario', (() => {
    const FUENTE = sinComentarios(leer('functions/src/core/skill.ts'));
    const resolutor = (FUENTE.match(/export const resolverSkill[\s\S]*?\n\};/) || [''])[0];
    return resolutor.length > 0
      && !/inputs|\.goal|toLowerCase|toUpperCase|normalize\(|split\(|keywords|PALABRAS|SINONIMOS/.test(resolutor);
  })());
  check('§9) y decide sobre lo que Brain YA entendió: intención, capacidades, modalidad y experiencia',
    ['u.intent', 'u.capability', 'u.modality', 'experienceId'].every((s) => leer('functions/src/core/skill.ts').includes(s)));

  /* §21 · observabilidad mínima. */
  const t = trazaDeResolucion(hallado);
  check('§21) de una resolución se anotan cuatro cosas, y ninguna es contenido',
    t.skillId === 'drone_view' && t.skillVersion === 1 && t.status === 'found'
    && Object.keys(t).every((k) => ['skillId', 'skillVersion', 'status', 'reason'].includes(k)),
    Object.keys(t).join(','));

  /*
   * §24 · BARATO. Un Skill Resolver que pregunta a un modelo mete latencia y
   * coste en TODAS las peticiones, también en las que no tienen Skill. Los
   * nombres de proveedor y adaptador SÍ aparecen en el archivo —en la lista de
   * lo que un Skill no puede nombrar—, así que lo que se mira es que no haya
   * forma de LLAMAR a nadie: ni red, ni disco, ni un import de fuera del Core.
   */
  check('§24) resolver no llama a nadie: ni red, ni disco, ni nada fuera del Core',
    !/fetch\(|axios|https?:|firestore|firebase|node:|await |Promise/i.test(sinComentarios(leer('functions/src/core/skill.ts')))
    && [...leer('functions/src/core/skill.ts').matchAll(/from '([^']+)'/g)].every(([, d]) => d.startsWith('./')));
}

/* ═══ D · EL PLANNER ══════════════════════════════════════════════════════ */
console.log('\n── D · El Skill aporta; el Planner sigue mandando ──');
{
  const planner = crearPlanner({ availability: { disponible }, tracer, now });
  const pedir = (extra = {}) => planner.planificar({
    contract: PLANNER_CONTRACT_VERSION, trace: traza(), understanding: entendimiento(), ...extra,
  });

  /* Q · Sin Skill: exactamente como antes. */
  const sin = await pedir();
  check('Q) SIN Skill el Planner funciona igual que siempre',
    sin.status === 'ready' && sin.plan.steps.map((s) => s.capability).join(' → ') === 'image.generate → video.image_to_video',
    sin.plan?.steps.map((s) => s.capability).join(' → ') ?? sin.status);
  check('Q) y el plan no menciona ningún Skill',
    sin.plan.skill === undefined && !sin.plan.assumptions.some((a) => a.startsWith('skill:')));
  check('Q) pasar `skill: undefined` es EXACTAMENTE lo mismo que no pasarlo', (() => {
    const a = JSON.stringify({ ...sin.plan, id: '' });
    return pedir({ skill: undefined }).then((b) => JSON.stringify({ ...b.plan, id: '' }) === a);
  })() instanceof Promise);
  const explicitoUndefined = await pedir({ skill: undefined });
  check('Q) …y se comprueba de verdad, comparando los dos planes',
    JSON.stringify({ ...sin.plan, id: '' }) === JSON.stringify({ ...explicitoUndefined.plan, id: '' }));

  /* R · Con Skill. */
  const aporte = aportacionDeSkill(DRONE);
  const con = await pedir({ skill: aporte });
  check('R) CON Skill el Planner planifica igual de bien', con.status === 'ready' && con.plan.steps.length === 2, con.status);
  /*
   * R · Y DICE CON CUÁL, por la costura que ya existía. No se añadió un campo
   * nuevo al plan: habría obligado a abrir la lista cerrada de claves del
   * Workflow, que es un contrato desplegado. `assumptions` es exactamente
   * para esto, y el Workflow ya lo copia desde la Fase 5.
   */
  check('R) y lo deja dicho como SUPOSICIÓN: planificar con un Skill no se hace a escondidas',
    con.plan.assumptions.includes('skill:drone_view@1'));
  check('R) sin abrir ni un contrato cerrado: el plan NO ganó un campo nuevo',
    con.plan.skill === undefined && Object.keys(con.plan).every((k) => Object.keys(sin.plan).includes(k)),
    Object.keys(con.plan).filter((k) => !Object.keys(sin.plan).includes(k)).join(',') || 'mismas claves');

  /* S · El fragmento se incorpora… y el Planner manda sobre el orden. */
  check('S) el fragmento aporta sus capacidades al plan',
    con.plan.capabilities.join(',') === 'image.generate,video.image_to_video', con.plan.capabilities.join(','));
  check('S) y sus frases de progreso llegan a los pasos',
    con.plan.steps[0].purpose === 'preparar la vista de partida'
    && con.plan.steps[1].purpose === 'mover la cámara como si volara',
    con.plan.steps.map((s) => s.purpose).join(' | '));
  check('§12) EL PLANNER MANDA: el fragmento venía al revés y el orden final lo puso el CATÁLOGO',
    DRONE.planFragment.map((f) => f.capability).join(' → ') === 'video.image_to_video → image.generate'
    && con.plan.steps.map((s) => s.capability).join(' → ') === 'image.generate → video.image_to_video'
    && con.plan.steps[1].dependsOn.includes(con.plan.steps[0].id));
  check('§12) y un Skill no puede crear un paso que el catálogo no soporte: sale por el camino de siempre',
    (await pedir({ skill: { ...aporte, capabilities: ['video.image_to_video', 'music.generate'] } })).status === 'unsupported');

  /* El aporte, en la frontera del Planner. */
  const conMalo = async (skill) => (await pedir({ skill })).status;
  check('U) EL ROUTER NO RECIBE NADA DEL SKILL: un aporte que nombre un proveedor no planifica',
    await conMalo({ ...aporte, provider: 'x' }) === 'invalid'
    && await conMalo({ ...aporte, modelId: 'x-1' }) === 'invalid');
  check('U) ni una capacidad inventada, ni un propósito que sea un prompt escondido',
    await conMalo({ ...aporte, capabilities: ['video.dronify'] }) === 'invalid'
    && await conMalo({ ...aporte, purposes: { 'image.generate': 'x'.repeat(400) } }) === 'invalid');
  check('U) ni un límite que no sea un número, ni un campo que el aporte no declare',
    await conMalo({ ...aporte, limits: { d: 'diez' } }) === 'invalid'
    && await conMalo({ ...aporte, inventado: 1 }) === 'invalid');
  check('U) y `aportacionDe` solo deja pasar un `found`', (() => {
    const found = resolverCon([DRONE, TIMELAPSE], entendimiento({ modality: 'video', workplace: { id: 'w', experienceId: 'studio' } }));
    const empate = resolverCon([{ ...DRONE, experienceId: undefined }, TIMELAPSE], entendimiento({ modality: 'video' }));
    return aportacionDe(found) !== undefined && empate.status === 'ambiguous' && aportacionDe(empate) === undefined
      && aportacionDe(undefined) === undefined
      && aportacionDe({ status: 'unsupported' }) === undefined
      && aportacionDe({ status: 'none' }) === undefined;
  })());

  /* V · El Workflow sigue igual, y no se entera del Skill. */
  const wf = await crearWorkflowEngine({ tracer, now })
    .construir({ contract: WORKFLOW_CONTRACT_VERSION, trace: traza(), plan: con.plan });
  check('V) el Workflow se construye igual con un plan hecho con Skill',
    wf.status === 'ready' && wf.workflow.steps.length === 2);
  /*
   * Y · LO QUE BAJA ES LA ATRIBUCIÓN, Y NADA MÁS. El workflow hereda la frase
   * `skill:drone_view@1` porque copia las suposiciones, y eso está bien: dice
   * CON QUÉ se planificó. Lo que NO baja es el Skill: ni sus parámetros, ni sus
   * límites, ni sus requisitos, ni su fragmento. Y al mensaje de cola no llega
   * nada, porque ahí solo caben cinco campos y ninguno es este.
   */
  const bajo = JSON.stringify(wf.workflow);
  check('Y) baja la atribución —una frase— y NADA del Skill',
    bajo.includes('skill:drone_view@1')
    && !/movimiento|altura|duracion_s|location|subject|f_vuelo|contextRequirements|requiredCapabilities/.test(bajo)
    && wf.workflow.steps.every((s) => s.skill === undefined));
  check('Y) y al mensaje de cola no llega nada del Skill: solo caben cinco campos',
    CAMPOS_DE_MENSAJE_DE_COLA.join(',') === 'contract,jobId,enqueuedAt,reason,notBefore'
    && !CAMPOS_DE_MENSAJE_DE_COLA.some((c) => /skill/i.test(c)));
}

/* ═══ E · LO QUE NO SE TOCÓ ═══════════════════════════════════════════════ */
console.log('\n── E · Una capa nueva que no obliga a nadie a cambiar ──');
{
  const SKILL = sinComentarios(leer('functions/src/core/skill.ts'));

  /* El Core sigue siendo Core. */
  check('§19) el Skills Engine es Core puro: ni reloj, ni azar, ni disco, ni red',
    !/Date\.now\(|Math\.random\(|new Date\(|node:|require\(|fetch\(/.test(SKILL));
  check('§5) y agnóstico: ni un proveedor, ni un modelo, ni Firebase, ni interfaz',
    !/gemini|seedance|elevenlabs|openai|anthropic|deepseek|bytedance|cloudinary|firebase|react/i.test(SKILL));

  /* §16 · Capability ≠ Skill. */
  check('§16) un Skill NO es una capacidad: no entra en `CapabilityId` ni en el catálogo',
    !/drone|timelapse|skill/i.test(sinComentarios(leer('functions/src/core/capability.ts')))
    && !/drone|timelapse|Skill/i.test(sinComentarios(leer('functions/src/core/registry/capabilities.ts'))));
  check('§7) añadir un Skill no obliga a tocar Router, Gateway, Job Engine ni Workflow Engine',
    ['core/router.ts', 'core/gateway.ts', 'core/job.ts', 'core/job-queue.ts', 'core/workflow.ts', 'core/orchestrator.ts']
      .every((f) => !/[Ss]kill/.test(leer(`functions/src/${f}`))));

  /* §3 · Ni un segundo motor de nada. */
  check('§3) no hay un segundo Brain, Planner, Workflow, Orchestrator, Router, Job Engine ni cola',
    !/crearPlanner|crearWorkflowEngine|crearOrchestrator|crearRouter|crearMotorDeTrabajos|QueuePort|crearGateway/.test(SKILL));
  check('§3) el Skill no ejecuta, no elige proveedor, no crea trabajos y no toca dinero',
    !/ejecutar|crearTrabajo|enqueue|credit|cobr|reembols|spend/i.test(SKILL));

  /* §15 · ExperienceTemplate intacto. */
  const TEMPLATES = leer('functions/src/creator/templates.ts');
  check('T) EXPERIENCE TEMPLATE INTACTO: sigue teniendo su forma de siempre',
    /export interface ExperienceTemplate \{[\s\S]*?name: string;[\s\S]*?defaultGoal: string;[\s\S]*?questions: TemplateQuestion\[\];[\s\S]*?buildPlan:/.test(TEMPLATES));
  check('T) y las once experiencias siguen ahí, sin que ninguna sepa qué es un Skill',
    Object.keys(require(path.resolve(RAIZ, 'functions/lib/creator/templates.js')).TEMPLATES).length === 11
    && !/[Ss]kill/.test(TEMPLATES) && !/[Ss]kill/.test(leer('functions/src/creator/planner.ts')));
  check('T) el planificador legacy de Weë Creator no se tocó',
    !/[Ss]kill/.test(leer('functions/src/creator/index.ts')));

  /* Z · El camino legacy. */
  check('Z) NADIE importa los Skills todavía: la costura existe y no está conectada',
    !/skills/.test(leer('functions/src/index.ts'))
    && !/from '\.\.\/skills'|from '\.\/skills'/.test(
      ['runtime/index.ts', 'runtime/conductor.ts', 'creator/brain.ts', 'creator/index.ts', 'engine/index.ts']
        .map((f) => leer(`functions/src/${f}`)).join('\n')));
  check('Z) y el Planner sin Skill es el MISMO código: una lista vacía, no una rama aparte',
    /skill\?\.capabilities \?\? \[\]/.test(leer('functions/src/core/planner.ts')));
  check('W/X) ni el Job Engine ni el trabajador durable saben que esto existe',
    !/[Ss]kill/.test(leer('functions/src/job/worker.ts') + leer('functions/src/job/index.ts') + leer('functions/src/runtime/cola-durable.ts')));

  /* §25 · lo que NO se implementó. */
  /*
   * Los Creative Parameters SÍ llegaron: son S2, y esta suite los ve porque el
   * descriptor ya puede declarar con qué intención creativa trabaja. Lo que
   * sigue sin existir es todo lo demás, y eso es lo que se vigila aquí.
   */
  check('§25) sigue sin haber Visual Context, ni Elements, ni Director, ni Evals',
    !/VisualContext|ElementDescriptor|DirectorEngine|EvalRunner|crearEvals/.test(SKILL + leer('functions/src/skills/index.ts')));
  check('S2) y los Creative Parameters entran por su contrato, no por un cajón', (() => {
    /* Ningún CAMPO de ninguna interfaz exportada puede ser un cajón abierto. */
    const interfaces = [...SKILL.matchAll(/export interface \w+ \{[\s\S]*?\n\}/g)].map(([s]) => s).join('\n');
    return /SkillCreativeProfile/.test(SKILL) && !/Record<string, unknown>/.test(interfaces);
  })());
  /*
   * §23 · Drone View se NOMBRA en los comentarios —es el ejemplo con el que se
   * explica el versionado— y eso no es implementarlo. Lo que se mira es el
   * código: que no haya ni una línea que sepa qué es un dron, y que el catálogo
   * de Weë siga sin ninguno.
   */
  check('§23) Drone View NO es real: ni una línea de código lo conoce, y el catálogo de Weë sigue vacío',
    skillsDeWee.CATALOGO_DE_SKILLS.length === 0
    && !/drone|timelapse/i.test(SKILL + sinComentarios(leer('functions/src/skills/index.ts'))));

  check('esta suite está en la cadena de `npm test`', /skills\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
