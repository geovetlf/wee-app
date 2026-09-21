import { BrainIntent, BrainUnderstanding } from './brain';
import { Modality } from './capability';
import { SKILL_CONTRACT_VERSION } from './contracts';
import {
  CreativeParameterPath,
  CreativeParameters,
  RUTAS_CREATIVAS,
  completarCreativos,
  conflictosCreativos,
  creativosValidos,
  rutasDefinidas,
  valorCreativo,
} from './creative';
import { claveProhibida, esNumero, esObjetoPlano, esTexto } from './gateway';
import { CAPABILITY_CATALOG, CoreCapabilityId } from './registry';

/**
 * WEE SKILLS — CONOCIMIENTO ESPECIALIZADO, NO UN SEGUNDO MOTOR.
 *
 * ── La regla que gobierna todo este archivo ─────────────────────────────────
 *
 * WEË TIENE QUE PODER RESOLVER UNA SOLICITUD AUNQUE NO EXISTA UN SKILL.
 *
 * Por eso lo primero que se diseñó aquí no fue el Skill: fue `none`. Que no
 * haya Skill NO es un error, no es un aviso y no degrada nada — significa
 * «sigue con el Planner general», que es lo que Weë ya sabía hacer. Un sistema
 * en el que añadir capacidades obliga a escribir un Skill por caso es un
 * sistema que no escala, y no es el que se está construyendo.
 *
 * ── Qué es un Skill, dicho con precisión ────────────────────────────────────
 *
 *   Capacidad  = QUÉ puede hacer el sistema.          (`video.image_to_video`)
 *   Skill      = CÓMO resolver bien una intención     («una vista de dron»)
 *                concreta usando capacidades.
 *
 * No son lo mismo y no comparten registro. Un Skill REQUIERE capacidades; no
 * las sustituye, no las amplía y no puede inventarse una que el catálogo no
 * declare. Añadir `skill_future_x` no toca `CapabilityId`, ni el Router, ni el
 * Gateway, ni el Job Engine, ni el Workflow Engine: esa es la prueba de que la
 * costura está en el sitio correcto.
 *
 * ── Dónde encaja ────────────────────────────────────────────────────────────
 *
 *   BRAIN entiende
 *     → SKILL RESOLVER mira lo que se entendió        (aquí)
 *         · hay Skill  → aporta capacidades y propósitos al plan
 *         · no lo hay  → no aporta nada, y no pasa nada
 *     → PLANNER planifica  ← SIGUE TENIENDO LA AUTORIDAD DEL PLAN
 *     → WORKFLOW → ORCHESTRATOR → ROUTER → JOB ENGINE → COLA → GATEWAY
 *
 * El Skill entra por ARRIBA y solo por arriba. Más abajo nadie sabe que existe:
 * el Router recibe capacidades, la cola solo lleva un `jobId`, y el Gateway
 * recibe lo que el Router eligió. Un Skill no ejecuta, no elige proveedor, no
 * crea trabajos y no toca dinero.
 *
 * ── Un Skill es CONTENIDO, no código ────────────────────────────────────────
 *
 * Esto manda sobre el diseño entero. Un descriptor puede venir de una
 * configuración que alguien edita, así que se trata como no confiable: se
 * valida entero antes de mirarlo, no tiene ni un campo ejecutable, y no hay
 * forma de que nombre un proveedor, un modelo, un endpoint, una credencial ni
 * una cuenta. Lo que no cabe en el tipo no puede colarse.
 *
 * Por eso NO existe aquí un `promptTransform`. Sería una de dos cosas: una
 * función guardada —ejecutar código recibido de fuera, que es justo lo que no
 * se va a hacer— o un lenguaje de plantillas, que es un intérprete y una fase
 * entera. Cuando llegue, llegará como datos declarativos y con su propio
 * contrato.
 */

/* ── Identidad ────────────────────────────────────────────────────────────── */

/**
 * El nombre de un Skill. Minúsculas, números y guiones bajos.
 *
 * Es un identificador, no un texto que se le enseñe a nadie: la etiqueta que ve
 * una persona sale de i18n por una clave, nunca de aquí.
 */
export type SkillId = string;

/** Un Skill concreto: su nombre Y su versión. Las dos cosas, siempre. */
export interface SkillRef {
  skillId: SkillId;
  version: number;
}

/**
 * VERSIONAR SIN INVENTAR COMPLEJIDAD.
 *
 * Un entero que sube. No hay semver, no hay rangos y no hay resolución de
 * dependencias, porque un Skill no depende de otro Skill: depende de
 * capacidades, que ya tienen su propio contrato versionado.
 *
 * `drone_view@1` y `drone_view@2` conviven. Quien guardó una referencia a la 1
 * sigue recibiendo la 1 — para eso se guarda la versión y no solo el nombre—, y
 * quien no diga versión recibe la mayor que esté activa.
 */
export const referenciaDeSkill = (skillId: SkillId, version: number): string => `${skillId}@${version}`;

/** Hasta dónde llega un Skill hoy. Solo `active` participa en una resolución. */
export type SkillStatus =
  /* Existe y se puede escribir contra él, pero no resuelve nada todavía. */
  | 'draft'
  /* En uso. */
  | 'active'
  /* Sigue resolviéndose si te lo piden por versión exacta, pero ya no se elige solo. */
  | 'deprecated';

/**
 * Cuánto cuesta, EN RELATIVO.
 *
 * Nunca dinero. El precio lo sabe el Financial Core con el coste real del
 * proveedor, y un número escrito aquí sería un precio inventado — exactamente
 * lo que Weë tiene prohibido. Esto solo sirve para ordenar dos candidatos y
 * para avisar antes de empezar.
 */
export type SkillCostHint = 'low' | 'medium' | 'high';

/* ── El fragmento de plan ─────────────────────────────────────────────────── */

/**
 * UN PASO DEL FRAGMENTO — y fíjate en lo que NO tiene.
 *
 * No tiene proveedor, ni modelo, ni entrada, ni reintentos, ni plazos, ni
 * condiciones. Eso es `WorkflowStep`, y construirlo aquí sería escribir un
 * segundo Workflow Engine dentro de un archivo de conocimiento.
 *
 * Un fragmento dice QUÉ CAPACIDADES hacen falta y PARA QUÉ, en el orden en que
 * el Skill las piensa. El Planner lo lee como información, no como una orden: el
 * orden final lo sigue deduciendo del catálogo —quién produce lo que otro
 * acepta—, porque esa es la única fuente que no se puede contradecir.
 */
export interface SkillFragmentStep {
  /** Identificador dentro del fragmento. No es el id del paso del plan. */
  id: string;
  capability: CoreCapabilityId;
  /** En lenguaje humano, para el progreso que se ve. Nunca una instrucción para un proveedor. */
  purpose?: string;
}

/**
 * LA COSTURA DE S1 — el nombre suelto de un parámetro.
 *
 * S2 la cerró: `SkillCreativeProfile` es la forma estructurada, con rutas del
 * vocabulario cerrado en vez de cadenas libres. Esto se conserva porque un
 * contrato no se retira con un descriptor ya escrito por ahí, pero un Skill
 * declara uno de los dos, nunca los dos: dos formas de decir lo mismo son dos
 * verdades, y la validación lo rechaza.
 */
export interface SkillParameterRef {
  name: string;
  required?: boolean;
}

/**
 * LO QUE UN SKILL DICE SOBRE LA INTENCIÓN CREATIVA. La costura de S1, cerrada.
 *
 * Tres cosas distintas, y la diferencia entre ellas es todo:
 *
 *   `declares`  con qué rutas trabaja. Documentación honesta: si una petición
 *               no toca ninguna de ellas, este Skill no tiene nada que aportar.
 *   `requires`  lo que EXIGE. Si lo que se pidió lo contradice, este Skill no
 *               sirve para esto y se descarta. Un Skill submarino no atiende
 *               una petición aérea, y no hay que discutirlo.
 *   `prefers`   lo que hace especialmente bien. Es SEÑAL para desempatar, no un
 *               filtro: no descarta a nadie, solo gana cuando coincide.
 *
 * Y lo que un Skill NO puede decir sigue siendo lo mismo que en S1: con qué
 * proveedor, con qué modelo, a qué dirección. `CreativeParameters` no tiene
 * ninguno de esos campos, así que no hay nada que prohibir aquí.
 */
export interface SkillCreativeProfile {
  declares: readonly CreativeParameterPath[];
  requires?: CreativeParameters;
  prefers?: CreativeParameters;
}

/* ── El descriptor ────────────────────────────────────────────────────────── */

/**
 * UN SKILL.
 *
 * Agnóstico de proveedor, de modelo, de API, de almacenamiento, de Firebase y
 * de interfaz. Puede decir «necesito `video.image_to_video`»; no puede decir
 * con qué, ni a qué dirección, ni con qué credencial.
 */
export interface SkillDescriptor {
  id: SkillId;
  /** Entero, desde 1. Sube cuando cambia lo que el Skill hace. */
  version: number;
  contract: typeof SKILL_CONTRACT_VERSION;
  status: SkillStatus;
  /** Qué intenciones atiende. Del vocabulario de Brain, no de uno nuevo. */
  intents: readonly BrainIntent[];
  /** Sin estas capacidades el Skill no sabe hacer su trabajo. Del catálogo del Core. */
  requiredCapabilities: readonly CoreCapabilityId[];
  /** Las que mejoran el resultado pero no lo impiden. */
  optionalCapabilities?: readonly CoreCapabilityId[];
  /** Cómo lo piensa el Skill. Información para el Planner, no un plan. */
  planFragment: readonly SkillFragmentStep[];
  outputModality: Modality;
  /**
   * La experiencia de Weë que lo ofrece, si está acotado a una.
   *
   * Un Skill con experiencia solo se elige DENTRO de ella. Sin esto, un Skill
   * de Weë Studio podría secuestrar una petición hecha desde Weë Chef.
   */
  experienceId?: string;
  /**
   * COSTURA, SIN RESOLVER. Qué contexto visual necesitaría (S3) y qué elementos
   * (S3). Hoy son NOMBRES declarados y nada más: nadie los busca, nadie los
   * carga y nadie falla por no tenerlos.
   */
  contextRequirements?: readonly string[];
  elementRequirements?: readonly string[];
  /** La forma de S1. Se conserva; un Skill nuevo declara `creative`. */
  parameters?: readonly SkillParameterRef[];
  /** La intención creativa con la que trabaja, en el vocabulario cerrado de Weë. */
  creative?: SkillCreativeProfile;
  /** Lo que acota el resultado. Números, como las restricciones del plan. */
  limits?: Readonly<Record<string, number>>;
  costHint?: SkillCostHint;
  /** A qué batería de evaluación responde. Una referencia; el motor de evals es otra fase. */
  evalsRef?: string;
  /** Frase corta de administración. No se le enseña a nadie. */
  note?: string;
}

/* ── Validación ───────────────────────────────────────────────────────────── */

/** Tope del catálogo. No es una base de datos: es una lista corta y acotada. */
export const MAX_SKILLS = 200;
const MAX_INTENTS = 8;
const MAX_CAPACIDADES = 16;
const MAX_PASOS = 16;
const MAX_REQUISITOS = 16;
const MAX_PARAMETROS = 24;
const MAX_LIMITES = 16;
const MAX_TEXTO = 160;
const MAX_VERSION = 999;

const FORMA_DE_ID = /^[a-z][a-z0-9_]{2,63}$/;
const FORMA_DE_NOMBRE = /^[a-z][a-z0-9_.]{1,63}$/;

const INTENCIONES: readonly BrainIntent[] = ['conversation', 'question', 'creation', 'edit', 'transform', 'analysis', 'planning'];
const MODALIDADES: readonly Modality[] = ['text', 'vision', 'image', 'video', 'voice', 'music', 'doc'];
const ESTADOS: readonly SkillStatus[] = ['draft', 'active', 'deprecated'];
const COSTES: readonly SkillCostHint[] = ['low', 'medium', 'high'];

/**
 * LO QUE UN SKILL NO PUEDE NOMBRAR NUNCA.
 *
 * Es la misma lista que protege al Planner, y está aquí por el mismo motivo: un
 * descriptor llega de una configuración editable, y sin esto sería la puerta
 * más cómoda para que alguien escribiera «usa este proveedor» y el Router se lo
 * encontrara hecho.
 */
const CLAVES_DE_IMPLEMENTACION = [
  'providerid', 'modelid', 'adapterid', 'provider', 'model', 'adapter',
  'implementation', 'implementationref', 'allowedproviders', 'excludeproviders',
  'endpoint', 'url', 'baseurl', 'account', 'accountid', 'credentials',
];

/** Claves que no son datos: son formas de tocar el prototipo de un objeto. */
const CLAVES_PELIGROSAS = ['__proto__', 'constructor', 'prototype'];

const normalizar = (clave: string): string => clave.toLowerCase().replace(/[-_]/g, '');

export const claveDeImplementacionDeSkill = (clave: string): boolean =>
  CLAVES_DE_IMPLEMENTACION.includes(clave.toLowerCase()) || CLAVES_DE_IMPLEMENTACION.includes(normalizar(clave));

export const clavePeligrosa = (clave: string): boolean => CLAVES_PELIGROSAS.includes(clave);

/** Propiedad PROPIA, no heredada. Un descriptor que llega de fuera no define qué es suyo. */
const propia = (o: Record<string, unknown>, clave: string): boolean => Object.prototype.hasOwnProperty.call(o, clave);

const CAMPOS_DE_DESCRIPTOR: readonly string[] = [
  'id', 'version', 'contract', 'status', 'intents', 'requiredCapabilities', 'optionalCapabilities',
  'planFragment', 'outputModality', 'experienceId', 'contextRequirements', 'elementRequirements',
  'parameters', 'creative', 'limits', 'costHint', 'evalsRef', 'note',
];

const EN_CATALOGO: ReadonlySet<string> = new Set(CAPABILITY_CATALOG.map((c) => String(c.id)));

/** Por qué un descriptor no vale. Un motivo por problema, y el campo exacto. */
export type MotivoDeSkillInvalido =
  | 'invalid_shape'
  | 'unknown_field'
  | 'dangerous_key'
  | 'implementation_not_allowed'
  | 'forbidden_key'
  | 'invalid_id'
  | 'invalid_version'
  | 'contract_incompatible'
  | 'invalid_status'
  | 'invalid_intent'
  | 'unknown_capability'
  | 'capability_not_declared'
  | 'invalid_modality'
  | 'invalid_fragment'
  | 'too_many'
  | 'invalid_limit'
  /* La intención creativa que declara no encaja en el vocabulario, o se contradice. */
  | 'invalid_creative'
  /* Declara la costura de S1 y la de S2 a la vez: dos formas de decir lo mismo. */
  | 'two_shapes'
  | 'invalid_text';

export interface ProblemaDeSkill {
  /** `id@version` cuando se pudo leer; si no, lo que se pudo identificar. */
  ref: string;
  field: string;
  reason: MotivoDeSkillInvalido;
}

const problema = (ref: string, field: string, reason: MotivoDeSkillInvalido): ProblemaDeSkill => ({ ref, field, reason });

const textoValido = (v: unknown, max = MAX_TEXTO): v is string => esTexto(v) && v.length > 0 && v.length <= max;

const listaDeTextos = (v: unknown, max: number): v is readonly string[] =>
  Array.isArray(v) && v.length <= max && v.every((x) => textoValido(x, 64) && FORMA_DE_NOMBRE.test(x));

/**
 * UN DESCRIPTOR, REVISADO ENTERO.
 *
 * Devuelve TODOS los problemas, no el primero: arreglarlos de uno en uno es lo
 * que convierte una validación en un castigo. Mismo criterio que
 * `validarRegistro` en el registro de proveedores.
 */
export const validarSkill = (crudo: unknown): readonly ProblemaDeSkill[] => {
  if (!esObjetoPlano(crudo)) return [problema('?', 'skill', 'invalid_shape')];
  const d = crudo;
  const ref = esTexto(d.id) && esNumero(d.version) ? referenciaDeSkill(d.id, d.version) : (esTexto(d.id) ? d.id : '?');
  const p: ProblemaDeSkill[] = [];

  /* ── Primero la forma: qué claves hay ─────────────────────────────────── */
  for (const clave of Object.keys(d)) {
    if (clavePeligrosa(clave)) { p.push(problema(ref, clave, 'dangerous_key')); continue; }
    if (claveDeImplementacionDeSkill(clave)) { p.push(problema(ref, clave, 'implementation_not_allowed')); continue; }
    if (claveProhibida(clave)) { p.push(problema(ref, clave, 'forbidden_key')); continue; }
    if (!CAMPOS_DE_DESCRIPTOR.includes(clave)) p.push(problema(ref, clave, 'unknown_field'));
  }
  /*
   * Y que no haya nada ejecutable en NINGÚN campo. No hace falta saber cuál
   * sería peligroso: un descriptor es datos, y una función dentro de un dato es
   * siempre un error, venga de donde venga.
   */
  for (const [clave, valor] of Object.entries(d)) {
    if (typeof valor === 'function') p.push(problema(ref, clave, 'invalid_shape'));
  }

  /*
   * ── Y que lo que hay sea SUYO ─────────────────────────────────────────
   *
   * `Object.keys` solo ve lo propio, pero `d.status` lee también lo heredado.
   * Con el prototipo contaminado, un descriptor SIN `status` pasaría por activo
   * sin que ninguna comprobación de claves se enterara, porque ahí no hay
   * ninguna clave que mirar. Se exige que cada campo obligatorio sea propio.
   */
  for (const campo of ['id', 'version', 'contract', 'status', 'intents', 'requiredCapabilities', 'planFragment', 'outputModality']) {
    if (!propia(d, campo)) p.push(problema(ref, campo, 'invalid_shape'));
  }

  /* ── Identidad ────────────────────────────────────────────────────────── */
  if (!esTexto(d.id) || !FORMA_DE_ID.test(d.id)) p.push(problema(ref, 'id', 'invalid_id'));
  if (!esNumero(d.version) || !Number.isInteger(d.version) || d.version < 1 || d.version > MAX_VERSION) {
    p.push(problema(ref, 'version', 'invalid_version'));
  }
  if (d.contract !== SKILL_CONTRACT_VERSION) p.push(problema(ref, 'contract', 'contract_incompatible'));
  if (!esTexto(d.status) || !ESTADOS.includes(d.status as SkillStatus)) p.push(problema(ref, 'status', 'invalid_status'));

  /* ── Intenciones ──────────────────────────────────────────────────────── */
  if (!Array.isArray(d.intents) || d.intents.length === 0 || d.intents.length > MAX_INTENTS) {
    p.push(problema(ref, 'intents', 'invalid_intent'));
  } else if (!d.intents.every((i) => esTexto(i) && INTENCIONES.includes(i as BrainIntent))) {
    p.push(problema(ref, 'intents', 'invalid_intent'));
  }

  /* ── Capacidades: SOLO del catálogo del Core ──────────────────────────── */
  const revisarCapacidades = (valor: unknown, campo: string, obligatorio: boolean): readonly string[] => {
    if (valor === undefined && !obligatorio) return [];
    if (!Array.isArray(valor) || valor.length > MAX_CAPACIDADES || (obligatorio && valor.length === 0)) {
      p.push(problema(ref, campo, 'too_many'));
      return [];
    }
    const buenas: string[] = [];
    for (const c of valor) {
      if (!esTexto(c) || !EN_CATALOGO.has(c)) { p.push(problema(ref, campo, 'unknown_capability')); continue; }
      buenas.push(c);
    }
    return buenas;
  };
  const requeridas = revisarCapacidades(d.requiredCapabilities, 'requiredCapabilities', true);
  const opcionales = revisarCapacidades(d.optionalCapabilities, 'optionalCapabilities', false);
  const declaradas = new Set([...requeridas, ...opcionales]);

  /* ── El fragmento ─────────────────────────────────────────────────────── */
  if (!Array.isArray(d.planFragment) || d.planFragment.length === 0 || d.planFragment.length > MAX_PASOS) {
    p.push(problema(ref, 'planFragment', 'invalid_fragment'));
  } else {
    const vistos = new Set<string>();
    for (const paso of d.planFragment) {
      if (!esObjetoPlano(paso)) { p.push(problema(ref, 'planFragment', 'invalid_fragment')); continue; }
      for (const clave of Object.keys(paso)) {
        if (clavePeligrosa(clave)) { p.push(problema(ref, `planFragment.${clave}`, 'dangerous_key')); continue; }
        if (claveDeImplementacionDeSkill(clave) || claveProhibida(clave)) {
          p.push(problema(ref, `planFragment.${clave}`, 'implementation_not_allowed'));
          continue;
        }
        if (!['id', 'capability', 'purpose'].includes(clave)) p.push(problema(ref, `planFragment.${clave}`, 'unknown_field'));
      }
      if (!esTexto(paso.id) || !FORMA_DE_NOMBRE.test(paso.id) || vistos.has(paso.id)) {
        p.push(problema(ref, 'planFragment.id', 'invalid_fragment'));
      } else vistos.add(paso.id);
      if (!esTexto(paso.capability) || !EN_CATALOGO.has(paso.capability)) {
        p.push(problema(ref, 'planFragment.capability', 'unknown_capability'));
      } else if (!declaradas.has(paso.capability)) {
        /*
         * DOS VERDADES NO. Si el fragmento usa una capacidad que el Skill no
         * declaró, una de las dos listas miente, y el día que alguien lea solo
         * `requiredCapabilities` —el Planner, un panel, una cotización— se
         * llevará una respuesta incompleta.
         */
        p.push(problema(ref, 'planFragment.capability', 'capability_not_declared'));
      }
      if (paso.purpose !== undefined && !textoValido(paso.purpose)) p.push(problema(ref, 'planFragment.purpose', 'invalid_text'));
    }
  }

  /* ── Modalidad de salida ──────────────────────────────────────────────── */
  if (!esTexto(d.outputModality) || !MODALIDADES.includes(d.outputModality as Modality)) {
    p.push(problema(ref, 'outputModality', 'invalid_modality'));
  }

  /* ── Lo opcional ──────────────────────────────────────────────────────── */
  if (d.experienceId !== undefined && (!esTexto(d.experienceId) || !FORMA_DE_NOMBRE.test(d.experienceId))) {
    p.push(problema(ref, 'experienceId', 'invalid_text'));
  }
  for (const campo of ['contextRequirements', 'elementRequirements'] as const) {
    if (d[campo] !== undefined && !listaDeTextos(d[campo], MAX_REQUISITOS)) p.push(problema(ref, campo, 'invalid_text'));
  }
  if (d.parameters !== undefined) {
    if (!Array.isArray(d.parameters) || d.parameters.length > MAX_PARAMETROS) {
      p.push(problema(ref, 'parameters', 'too_many'));
    } else {
      for (const par of d.parameters) {
        if (!esObjetoPlano(par)) { p.push(problema(ref, 'parameters', 'invalid_shape')); continue; }
        for (const clave of Object.keys(par)) {
          if (!['name', 'required'].includes(clave)) p.push(problema(ref, `parameters.${clave}`, 'unknown_field'));
        }
        if (!esTexto(par.name) || !FORMA_DE_NOMBRE.test(par.name)) p.push(problema(ref, 'parameters.name', 'invalid_text'));
        if (par.required !== undefined && typeof par.required !== 'boolean') p.push(problema(ref, 'parameters.required', 'invalid_shape'));
      }
    }
  }
  if (d.limits !== undefined) {
    if (!esObjetoPlano(d.limits) || Object.keys(d.limits).length > MAX_LIMITES) {
      p.push(problema(ref, 'limits', 'too_many'));
    } else {
      for (const [clave, valor] of Object.entries(d.limits)) {
        if (clavePeligrosa(clave) || !FORMA_DE_NOMBRE.test(clave)) { p.push(problema(ref, `limits.${clave}`, 'invalid_limit')); continue; }
        /* NÚMEROS, y solo números. Un límite que sea un texto es un sitio donde meter una instrucción. */
        if (!esNumero(valor) || valor < 0) p.push(problema(ref, `limits.${clave}`, 'invalid_limit'));
      }
    }
  }
  /* ── La intención creativa que declara ────────────────────────────────── */
  if (d.creative !== undefined) {
    /* UNA sola forma de decirlo. La de S1 y la de S2 juntas serían dos verdades. */
    if (d.parameters !== undefined) p.push(problema(ref, 'creative', 'two_shapes'));
    if (!esObjetoPlano(d.creative)) {
      p.push(problema(ref, 'creative', 'invalid_shape'));
    } else {
      const c = d.creative;
      for (const clave of Object.keys(c)) {
        if (!['declares', 'requires', 'prefers'].includes(clave)) p.push(problema(ref, `creative.${clave}`, 'unknown_field'));
      }
      if (!Array.isArray(c.declares) || c.declares.length === 0 || c.declares.length > RUTAS_CREATIVAS.length
        || !c.declares.every((r) => esTexto(r) && (RUTAS_CREATIVAS as readonly string[]).includes(r))) {
        p.push(problema(ref, 'creative.declares', 'invalid_creative'));
      }
      for (const campo of ['requires', 'prefers'] as const) {
        const v = c[campo];
        if (v === undefined) continue;
        if (!creativosValidos(v)) { p.push(problema(ref, `creative.${campo}`, 'invalid_creative')); continue; }
        /*
         * Y COHERENTE CONSIGO MISMO: exigir una cosa y preferir la contraria
         * dejaría un Skill que se descarta a sí mismo. Es un error del
         * descriptor, no una decisión que haya que tomar en cada petición.
         */
        if (campo === 'prefers' && creativosValidos(c.requires) && conflictosCreativos(c.requires, v).length) {
          p.push(problema(ref, 'creative.prefers', 'invalid_creative'));
        }
      }
    }
  }
  if (d.costHint !== undefined && (!esTexto(d.costHint) || !COSTES.includes(d.costHint as SkillCostHint))) {
    p.push(problema(ref, 'costHint', 'invalid_shape'));
  }
  for (const campo of ['evalsRef', 'note'] as const) {
    if (d[campo] !== undefined && !textoValido(d[campo])) p.push(problema(ref, campo, 'invalid_text'));
  }

  return p;
};

export const skillValido = (crudo: unknown): crudo is SkillDescriptor => validarSkill(crudo).length === 0;

/* ── El registro ──────────────────────────────────────────────────────────── */

export interface RegistroDeSkills {
  /** Una versión exacta. Es lo que devuelve una referencia guardada. */
  obtener(skillId: SkillId, version: number): SkillDescriptor | undefined;
  /** La mayor versión ACTIVA. `undefined` si solo hay borradores o retiradas. */
  vigente(skillId: SkillId): SkillDescriptor | undefined;
  /** Las versiones de un Skill, de mayor a menor. */
  versiones(skillId: SkillId): readonly number[];
  /** Acotado SIEMPRE. Un listado sin tope es una consulta que un día se come un servidor. */
  listar(opciones?: { limit?: number; status?: SkillStatus }): readonly SkillDescriptor[];
  /** Cuántos hay. */
  cuantos(): number;
  /** Los vigentes que declaran esta capacidad como requerida. Índice, no recorrido. */
  porCapacidad(capability: CoreCapabilityId): readonly SkillDescriptor[];
  /** Los vigentes que atienden esta intención. Índice, no recorrido. */
  porIntencion(intent: BrainIntent): readonly SkillDescriptor[];
}

export interface RechazoDeSkill {
  ref: string;
  /** `invalid` = no pasó la validación. `duplicate` = ese `id@version` ya estaba. `too_many` = el catálogo está lleno. */
  motivo: 'invalid' | 'duplicate' | 'too_many';
  problemas?: readonly ProblemaDeSkill[];
}

/**
 * EL REGISTRO. Una función pura, como el de proveedores.
 *
 * No lee Firestore, no llama a nadie y no guarda estado de módulo. Recibe una
 * lista y devuelve algo a lo que preguntar, con los índices construidos UNA vez
 * —porque esto se consulta en el camino de cada petición— y con los rechazos a
 * la vista.
 *
 * NADA SE CAE EN SILENCIO. Un descriptor que no vale no entra Y se dice por
 * qué: descartar callando es cómo un catálogo acaba teniendo la mitad de lo que
 * alguien cree que tiene.
 */
export const crearRegistroDeSkills = (
  descriptores: readonly unknown[],
): { registro: RegistroDeSkills; rechazados: readonly RechazoDeSkill[] } => {
  const porId = new Map<SkillId, Map<number, SkillDescriptor>>();
  const todos: SkillDescriptor[] = [];
  const rechazados: RechazoDeSkill[] = [];

  for (const crudo of Array.isArray(descriptores) ? descriptores : []) {
    const problemas = validarSkill(crudo);
    if (problemas.length) {
      rechazados.push({ ref: problemas[0].ref, motivo: 'invalid', problemas });
      continue;
    }
    const s = crudo as SkillDescriptor;
    const ref = referenciaDeSkill(s.id, s.version);
    if (todos.length >= MAX_SKILLS) { rechazados.push({ ref, motivo: 'too_many' }); continue; }
    const versiones = porId.get(s.id) ?? new Map<number, SkillDescriptor>();
    if (versiones.has(s.version)) { rechazados.push({ ref, motivo: 'duplicate' }); continue; }
    versiones.set(s.version, s);
    porId.set(s.id, versiones);
    todos.push(s);
  }

  /* La vigente de cada nombre: la mayor versión `active`. Determinista. */
  const vigentes = new Map<SkillId, SkillDescriptor>();
  for (const [id, versiones] of porId) {
    const activas = [...versiones.values()].filter((s) => s.status === 'active').sort((a, b) => b.version - a.version);
    if (activas.length) vigentes.set(id, activas[0]);
  }

  /* Índices sobre las vigentes: resolver no puede ser un recorrido del catálogo. */
  const porCapacidad = new Map<string, SkillDescriptor[]>();
  const porIntencion = new Map<string, SkillDescriptor[]>();
  for (const s of vigentes.values()) {
    for (const c of s.requiredCapabilities) {
      const lista = porCapacidad.get(String(c)) ?? [];
      lista.push(s);
      porCapacidad.set(String(c), lista);
    }
    for (const i of s.intents) {
      const lista = porIntencion.get(String(i)) ?? [];
      lista.push(s);
      porIntencion.set(String(i), lista);
    }
  }

  const registro: RegistroDeSkills = {
    obtener: (skillId, version) => porId.get(skillId)?.get(version),
    vigente: (skillId) => vigentes.get(skillId),
    versiones: (skillId) => [...(porId.get(skillId)?.keys() ?? [])].sort((a, b) => b - a),
    listar: (opciones = {}) => {
      const limite = Math.max(0, Math.min(opciones.limit ?? 50, MAX_SKILLS));
      const filtrados = opciones.status ? todos.filter((s) => s.status === opciones.status) : todos;
      return filtrados.slice(0, limite);
    },
    cuantos: () => todos.length,
    porCapacidad: (capability) => porCapacidad.get(String(capability)) ?? [],
    porIntencion: (intent) => porIntencion.get(String(intent)) ?? [],
  };

  return { registro, rechazados };
};

/* ── La resolución ────────────────────────────────────────────────────────── */

/**
 * EN QUÉ QUEDÓ BUSCAR UN SKILL.
 *
 * Cinco estados, y solo dos de ellos son un problema. Léelos en voz alta: esto
 * es el contrato que impide que Weë dependa de sus Skills.
 */
export type SkillResolutionStatus =
  /* Hay uno, y sirve. Aporta al plan. */
  | 'found'
  /* No hay ninguno. NO ES UN ERROR: sigue el Planner general, como siempre. */
  | 'none'
  /* Hay varios y ninguno gana. No se elige a cara o cruz: se dice. */
  | 'ambiguous'
  /* Hay uno, pero alguna capacidad suya hoy no la sirve nadie. */
  | 'unsupported'
  /* Lo que se pidió no tiene forma de petición. */
  | 'invalid';

export type MotivoDeResolucion =
  | 'no_candidate'
  | 'intent_not_covered'
  | 'capability_not_covered'
  | 'modality_mismatch'
  | 'experience_mismatch'
  /* Todos los que sabían hacer esto EXIGEN algo que contradice lo que se pidió. */
  | 'creative_mismatch'
  /* Quedan varios y lo que declaran sobre la intención se contradice entre sí. */
  | 'creative_conflict'
  | 'tie'
  | 'capability_unavailable'
  | 'invalid_request';

/**
 * LO QUE UN SKILL LE PASA AL PLANNER. Y nada más que esto.
 *
 * NO es el descriptor. Es una vista estrecha, construida aquí a partir de un
 * descriptor ya validado, con lo justo para planificar. Si algún día el
 * descriptor crece con algo peligroso, no llega al Planner porque no cabe.
 */
export interface SkillPlanContribution {
  skillId: SkillId;
  version: number;
  /** Las capacidades que aporta, en el orden en que el Skill las piensa. */
  capabilities: readonly CoreCapabilityId[];
  /** capacidad → frase de progreso. Texto para una persona, nunca para un proveedor. */
  purposes?: Readonly<Record<string, string>>;
  limits?: Readonly<Record<string, number>>;
  /**
   * LA INTENCIÓN CREATIVA QUE EL SKILL APORTA. Lo que exige, y lo que prefiere.
   *
   * Llega al Planner como RELLENO, nunca como orden: lo que la persona pidió
   * manda en cada ruta que tocó, y esto solo cubre lo que nadie dijo. Un Skill
   * de vista aérea puede rellenar `movement.speed = slow` si nadie habló de
   * velocidad; no puede convertir en aéreo lo que alguien pidió a ras de suelo.
   */
  creative?: CreativeParameters;
}

export interface SkillResolution {
  contract: typeof SKILL_CONTRACT_VERSION;
  status: SkillResolutionStatus;
  /** Solo en `found`. */
  skill?: SkillPlanContribution;
  /** Solo en `ambiguous`: quiénes empataron, para poder preguntar. */
  candidates?: readonly SkillRef[];
  /** Solo en `unsupported`: qué falta por servir. */
  unavailable?: readonly CoreCapabilityId[];
  /** Solo cuando la intención creativa choca: en qué rutas, exactamente. */
  conflicts?: readonly CreativeParameterPath[];
  reason?: MotivoDeResolucion;
}

export interface SkillResolverPorts {
  registro: RegistroDeSkills;
  /**
   * La MISMA pregunta que hace el Planner, por capacidad y nunca por proveedor.
   * Se reutiliza el puerto que ya existe: un segundo concepto de
   * «disponibilidad» sería una segunda verdad sobre lo que Weë puede hacer hoy.
   */
  disponible(capability: CoreCapabilityId): boolean;
}

export interface SkillResolverRequest {
  understanding: BrainUnderstanding;
  /** Pedir uno concreto, por referencia guardada. Se respeta la versión exacta. */
  prefer?: SkillRef;
  /**
   * LA INTENCIÓN CREATIVA, si se entendió alguna.
   *
   * Es la señal que S1 no tenía y por la que dos Skills de vídeo empataban sin
   * remedio. Viene de `understanding.preferences.creative`, así que quien
   * compone puede pasarla directamente; se acepta aquí aparte para que una
   * prueba —o una interfaz avanzada— pueda resolver con una intención concreta
   * sin fabricar un entendimiento entero.
   */
  creative?: CreativeParameters;
}

const sinSkill = (reason: MotivoDeResolucion): SkillResolution => ({
  contract: SKILL_CONTRACT_VERSION, status: 'none', reason,
});

/** La vista estrecha, construida desde un descriptor ya validado. */
export const aportacionDeSkill = (s: SkillDescriptor): SkillPlanContribution => {
  /* Sin prototipo: lo que se construye aquí viaja a otra capa y se indexa por capacidad. */
  const purposes: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const paso of s.planFragment) {
    if (paso.purpose && !purposes[String(paso.capability)]) purposes[String(paso.capability)] = paso.purpose;
  }
  /*
   * EL ORDEN ES EL DEL FRAGMENTO, y las requeridas que el fragmento no nombró
   * van detrás. El Planner lo usará como información; el orden EJECUTABLE lo
   * sigue deduciendo él del catálogo.
   */
  const delFragmento = s.planFragment.map((paso) => paso.capability);
  const capabilities = [...new Set([...delFragmento, ...s.requiredCapabilities])];
  /* Lo que exige manda sobre lo que prefiere: las dos son suyas y no se contradicen (lo valida el descriptor). */
  const creative = completarCreativos(s.creative?.requires, s.creative?.prefers);
  return {
    skillId: s.id,
    version: s.version,
    capabilities,
    ...(Object.keys(purposes).length ? { purposes: { ...purposes } } : {}),
    ...(s.limits ? { limits: { ...s.limits } } : {}),
    ...(creative ? { creative } : {}),
  };
};

/**
 * ¿HAY UN SKILL PARA ESTO?
 *
 * ── Cómo decide, y cómo NO decide ───────────────────────────────────────────
 *
 * NO mira el texto de la persona. Ni una palabra clave, ni una lista de
 * sinónimos, ni un `if (prompt.includes('dron'))`. Eso es frágil —se rompe con
 * un acento, con un idioma y con una metáfora— y además sería un segundo
 * modelo de lenguaje escrito a mano.
 *
 * Mira lo que Brain YA ENTENDIÓ, que es estructura: la intención, las
 * capacidades que hacen falta, la modalidad del resultado y desde qué
 * experiencia se pidió. Cuatro señales que ya existen, ya están validadas y ya
 * viajan.
 *
 * ── Cómo evolucionará ───────────────────────────────────────────────────────
 *
 * Esta es una primera resolución DETERMINISTA y MÍNIMA, y se dice sin adornos.
 * Cuando el entendimiento traiga más señal —parámetros creativos (S2), contexto
 * visual y elementos (S3)— la resolución podrá afinar sin cambiar de forma:
 * seguirá siendo «filtra por lo que se entendió, desempata, comprueba que se
 * puede servir». Lo que no hará nunca es llamar a un proveedor: esto tiene que
 * ser barato, y un Skill Resolver que pregunta a un modelo mete latencia y
 * coste en el camino de TODAS las peticiones, también las que no tienen Skill.
 */
export const resolverSkill = (puertos: SkillResolverPorts, request: SkillResolverRequest): SkillResolution => {
  if (!esObjetoPlano(request) || !esObjetoPlano(request.understanding)) {
    return { contract: SKILL_CONTRACT_VERSION, status: 'invalid', reason: 'invalid_request' };
  }
  const u = request.understanding;
  if (!esTexto(u.intent) || !INTENCIONES.includes(u.intent)) {
    return { contract: SKILL_CONTRACT_VERSION, status: 'invalid', reason: 'invalid_request' };
  }

  const comprobar = (s: SkillDescriptor): SkillResolution => {
    const faltan = s.requiredCapabilities.filter((c) => !puertos.disponible(c));
    if (faltan.length) {
      return { contract: SKILL_CONTRACT_VERSION, status: 'unsupported', unavailable: faltan, reason: 'capability_unavailable' };
    }
    return { contract: SKILL_CONTRACT_VERSION, status: 'found', skill: aportacionDeSkill(s) };
  };

  /* ── Pedido por referencia: manda la referencia guardada ───────────────── */
  if (request.prefer !== undefined) {
    if (!esObjetoPlano(request.prefer) || !esTexto(request.prefer.skillId) || !esNumero(request.prefer.version)) {
      return { contract: SKILL_CONTRACT_VERSION, status: 'invalid', reason: 'invalid_request' };
    }
    const exacto = puertos.registro.obtener(request.prefer.skillId, request.prefer.version);
    /*
     * Que no exista NO es un error: es que ese Skill ya no está. Se sigue por
     * el camino general, que es lo que había antes de que existiera.
     */
    if (!exacto || exacto.status === 'draft') return sinSkill('no_candidate');
    return comprobar(exacto);
  }

  /* ── Filtro 1 · la intención ───────────────────────────────────────────── */
  const porIntencion = puertos.registro.porIntencion(u.intent);
  if (!porIntencion.length) return sinSkill('intent_not_covered');

  /* ── Filtro 2 · las capacidades ────────────────────────────────────────── */
  const pedidas = [...new Set([...(u.capability ? [u.capability] : []), ...(u.capabilities ?? [])])];
  if (!pedidas.length) return sinSkill('capability_not_covered');

  const cubre = (s: SkillDescriptor): boolean => {
    const declaradas = new Set<string>([...s.requiredCapabilities, ...(s.optionalCapabilities ?? [])].map(String));
    /* Todo lo que se pidió tiene que caber en el Skill: si no, resolvería otra cosa. */
    if (!pedidas.every((c) => declaradas.has(String(c)))) return false;
    /*
     * Y al menos una de las pedidas tiene que ser REQUERIDA por él. Sin esto, un
     * Skill que solo la declara como opcional casaría con cualquier petición que
     * la mencione, que es la forma más rápida de que un Skill secuestre medio
     * sistema.
     */
    const requeridas = new Set<string>(s.requiredCapabilities.map(String));
    return pedidas.some((c) => requeridas.has(String(c)));
  };

  /* ── Filtro 3 · la modalidad del resultado ─────────────────────────────── */
  const coincideModalidad = (s: SkillDescriptor): boolean => u.modality === undefined || s.outputModality === u.modality;

  /*
   * ── Filtro 4 · la experiencia ──────────────────────────────────────────
   *
   * Un Skill SIN experiencia sirve desde cualquier sitio. Uno CON experiencia
   * solo desde la suya: si no, el Skill de una sección se metería en una
   * petición hecha desde otra, y la persona vería aparecer algo que no pidió.
   */
  const experienciaActiva = u.workplace?.experienceId ?? u.suggestedExperience;
  const coincideExperiencia = (s: SkillDescriptor): boolean =>
    s.experienceId === undefined || s.experienceId === experienciaActiva;

  const conCapacidad = porIntencion.filter(cubre);
  if (!conCapacidad.length) return sinSkill('capability_not_covered');
  const conModalidad = conCapacidad.filter(coincideModalidad);
  if (!conModalidad.length) return sinSkill('modality_mismatch');
  const conExperiencia = conModalidad.filter(coincideExperiencia);
  if (!conExperiencia.length) return sinSkill('experience_mismatch');

  /*
   * ── Filtro 5 · LO QUE EL SKILL EXIGE ────────────────────────────────────
   *
   * `requires` descarta, `prefers` no. Un Skill que exige una cámara submarina
   * no atiende una petición aérea: no es que sea peor candidato, es que no es
   * candidato. Y esto ocurre ANTES del desempate a propósito — desempatar entre
   * dos que no sirven sería elegir el menos malo.
   */
  const pedida = request.creative ?? u.preferences?.creative;
  const candidatos = pedida
    ? conExperiencia.filter((s) => conflictosCreativos(s.creative?.requires, pedida).length === 0)
    : conExperiencia;
  if (!candidatos.length) return sinSkill('creative_mismatch');
  if (candidatos.length === 1) return comprobar(candidatos[0]);

  /*
   * ── El desempate, y por qué es este ────────────────────────────────────
   *
   * 1 · Gana el que está acotado a la experiencia desde la que se pidió. Es
   *     más específico, y la persona está DENTRO de esa sección.
   * 2 · Si siguen empatados, gana el que declara MENOS capacidades: el más
   *     ajustado a lo que se pidió, en vez del que abarca de todo.
   *
   * Y si después de eso siguen empatados, NO SE ELIGE. Dos Skills igual de
   * buenos para lo mismo es un problema del catálogo, y taparlo con un orden
   * alfabético haría que la elección dependiera de cómo se llamen.
   */
  const conSuExperiencia = candidatos.filter((s) => s.experienceId !== undefined);
  const porExperiencia = conSuExperiencia.length ? conSuExperiencia : candidatos;

  /*
   * ── Desempate 2 · LA EVIDENCIA CREATIVA ─────────────────────────────────
   *
   * Aquí es donde S2 resuelve lo que S1 no podía. Dos Skills de vídeo con las
   * mismas capacidades y la misma modalidad empataban siempre; ahora gana el
   * que ACIERTA en más de lo que se pidió: cuántas de las rutas que trajo la
   * petición coinciden, valor a valor, con lo que él prefiere.
   *
   * No es un parecido ni una puntuación borrosa: es contar coincidencias
   * exactas sobre un vocabulario cerrado. Si nadie acierta nada, este paso no
   * desempata y se sigue al siguiente — ausencia de evidencia no es evidencia.
   */
  const aciertos = (s: SkillDescriptor): number =>
    pedida ? rutasDefinidas(pedida).filter((r) => valorCreativo(s.creative?.prefers, r) === valorCreativo(pedida, r)).length : 0;
  const mejor = Math.max(...porExperiencia.map(aciertos));
  const porEvidencia = mejor > 0 ? porExperiencia.filter((s) => aciertos(s) === mejor) : porExperiencia;
  if (porEvidencia.length === 1) return comprobar(porEvidencia[0]);

  const tamaño = (s: SkillDescriptor) => s.requiredCapabilities.length + (s.optionalCapabilities?.length ?? 0);
  const menor = Math.min(...porEvidencia.map(tamaño));
  const ajustados = porEvidencia.filter((s) => tamaño(s) === menor);
  if (ajustados.length === 1) return comprobar(ajustados[0]);

  /*
   * Siguen empatados. Si además se contradicen entre ellos sobre la intención,
   * se dice DÓNDE: no es lo mismo «los dos valen igual» que «los dos quieren
   * cosas incompatibles», y quien pregunte después necesita saber por cuál de
   * las dos cosas está preguntando.
   */
  const choques = new Set<CreativeParameterPath>();
  for (let i = 0; i < ajustados.length; i++) {
    for (let j = i + 1; j < ajustados.length; j++) {
      for (const r of conflictosCreativos(ajustados[i].creative?.prefers, ajustados[j].creative?.prefers)) choques.add(r);
    }
  }

  return {
    contract: SKILL_CONTRACT_VERSION,
    status: 'ambiguous',
    candidates: ajustados.map((s) => ({ skillId: s.id, version: s.version })),
    ...(choques.size ? { conflicts: [...choques] } : {}),
    reason: choques.size ? 'creative_conflict' : 'tie',
  };
};

/**
 * LO QUE EL PLANNER DEBE RECIBIR, sacado de una resolución.
 *
 * Una sola línea en quien compone, y la garantía de que solo un `found` aporta:
 * un `ambiguous` o un `unsupported` que llegara al Planner por descuido no
 * planificaría nada raro, planificaría como si no hubiera Skill.
 */
export const aportacionDe = (resolucion: SkillResolution | undefined): SkillPlanContribution | undefined =>
  resolucion && resolucion.status === 'found' ? resolucion.skill : undefined;

/**
 * LO QUE SE ANOTA DE UNA RESOLUCIÓN. Cuatro campos y ninguno es contenido.
 *
 * Ni el objetivo, ni el texto de la persona, ni el prompt, ni las referencias.
 * La traza existe para saber QUÉ decidió el sistema, no para guardar lo que
 * alguien escribió.
 */
export const trazaDeResolucion = (
  resolucion: SkillResolution,
): { skillId?: string; skillVersion?: number; status: SkillResolutionStatus; reason?: MotivoDeResolucion } => ({
  ...(resolucion.skill ? { skillId: resolucion.skill.skillId, skillVersion: resolucion.skill.version } : {}),
  status: resolucion.status,
  ...(resolucion.reason ? { reason: resolucion.reason } : {}),
});

/** Campos que un aporte de Skill puede traer. Lo que no esté aquí, el Planner lo rechaza. */
export const CAMPOS_DE_APORTACION: readonly string[] = Object.freeze([
  'skillId', 'version', 'capabilities', 'purposes', 'limits', 'creative',
]);
