import { SHOT_CONTRACT_VERSION } from './contracts';
import {
  ContinuityAnchor,
  ContinuityRequirements,
  ContinuityVerdict,
  anclajeValido,
  continuidadValida,
  veredictoValido,
} from './continuity';
import { CreativeParameters, creativosValidos } from './creative';
import { OwnedByAccount } from './identity';

/**
 * WEË SCENES & SHOTS — DÓNDE VA CADA COSA, Y EN QUÉ ORDEN.
 *
 * ── Lo que falta, dicho con cuatro frases de alguien ────────────────────────
 *
 *   «Luna entra en la habitación.»
 *   «Luna camina hacia la ventana.»
 *   «Luna mira hacia fuera.»
 *   «Luna sale.»
 *
 * Weë sabe guardar los cuatro vídeos. Lo que no sabe es que son CUATRO PLANOS
 * DE LA MISMA ESCENA, que van en ese orden, que el segundo viene después del
 * primero y que en los cuatro tiene que salir la misma Luna. Sin eso, «rehaz
 * solo el plano 4» no se puede ni formular: no hay ningún sitio donde ponga
 * cuál es el plano 4.
 *
 * ── Por qué esto no es un Element ───────────────────────────────────────────
 *
 * Un Element es una cosa de la CUENTA que se reutiliza: Luna sirve para este
 * proyecto y para el del mes que viene. Un plano es una POSICIÓN dentro de un
 * relato: no se reutiliza, ocurre una vez y tiene un antes y un después. Meter
 * los planos en `elements` llenaría el catálogo de la cuenta de cosas que nadie
 * va a volver a usar, y convertiría una lista ordenada en una red.
 *
 * ── Y por qué no es un grafo nuevo ──────────────────────────────────────────
 *
 * Porque el grafo ya existe y está bien repartido: `Element.related` une cosas
 * con cosas, `Asset.provenance.sourceAssetIds` une un resultado con lo que lo
 * originó y `Asset.previousVersionId` une una versión con la anterior. Lo único
 * que faltaba era el EJE TEMPORAL, y una secuencia no es una red: es una lista
 * ordenada. Un grafo aquí sería la estructura equivocada, además de una base de
 * datos más que mantener.
 *
 * ── LO QUE UN PLANO NO GUARDA NUNCA ─────────────────────────────────────────
 *
 * El prompt. Ni el texto que escribió la persona, ni el que se armó para el
 * proveedor. Un prompt es una SALIDA del Planner, no una fuente de verdad: si
 * la continuidad dependiera de una cadena de texto, cambiar una coma cambiaría
 * el personaje. Lo que se guarda es la estructura —quién sale, en qué versión,
 * qué hay que conservar— y de ahí se deriva el resto tantas veces como haga
 * falta.
 *
 * Tampoco bytes, ni URLs, ni vectores, ni nada de un proveedor. Un plano guarda
 * REFERENCIAS, que es exactamente la regla que ya sigue el trabajo guardado.
 *
 * ── Lo que este archivo NO hace ─────────────────────────────────────────────
 *
 * No genera. No valida. No decide rehacer nada. No propaga el estado `stale` a
 * los planos que dependían de uno que cambió: el contrato para expresarlo está
 * —`dependsOnShotIds`—, pero quién lo propaga, cuándo y con qué aviso a la
 * persona es una decisión de producto que todavía no está tomada. Dejar el dato
 * y no el automatismo es deliberado: un automatismo que rehace vídeos pagados
 * sin que nadie lo pida es la clase de cosa que se añade tarde y a propósito.
 */

/* ── Un puntero a una cosa de la cuenta ───────────────────────────────────── */

/**
 * QUIÉN SALE, Y EN QUÉ VERSIÓN.
 *
 * Es el MISMO puntero que usa un anclaje de continuidad, y comparte nombre de
 * tipo a propósito: un identificador con su versión es una sola idea, y tenerla
 * escrita dos veces acabaría con dos comprobaciones distintas de lo mismo.
 *
 * La versión es lo que hace que esto valga para algo. «Luna» sin versión no
 * distingue a la Luna de antes del cambio de peinado de la de después, y esa
 * distinción es justo la que hay que poder hacer.
 */
export type ElementBinding = ContinuityAnchor;

/* ── En qué estado está un plano ──────────────────────────────────────────── */

/**
 * SEIS ESTADOS. La lista corta es una decisión.
 *
 *   draft      alguien lo está escribiendo. Aún no se puede pedir.
 *   ready      completo y listo para generarse.
 *   generated  hay un resultado.
 *   validated  el resultado se comprobó contra lo que se exigía.
 *   stale      algo de lo que dependía cambió. El resultado sigue existiendo.
 *   archived   fuera del relato, sin borrar nada.
 *
 * `queued` y `running` NO están, y no es un olvido: el estado de una ejecución
 * es del Job Engine, que ya lo lleva con su máquina, sus concesiones y sus
 * reintentos. Copiarlo aquí crearía dos verdades sobre lo mismo, y la de aquí
 * se quedaría desfasada en cuanto un proceso muriera a media frase.
 *
 * `stale` tampoco es un fallo: el vídeo está, es de la persona y está pagado.
 * Es una marca que dice «esto ya no cuadra con lo de al lado», y quien decide
 * qué hacer con ella es quien mira, no este archivo.
 */
export type ShotState = 'draft' | 'ready' | 'generated' | 'validated' | 'stale' | 'archived';

export const ESTADOS_DE_PLANO: readonly ShotState[] = Object.freeze([
  'draft', 'ready', 'generated', 'validated', 'stale', 'archived',
] as const);

export const esEstadoDePlano = (v: unknown): v is ShotState =>
  typeof v === 'string' && (ESTADOS_DE_PLANO as readonly string[]).includes(v);

/**
 * A DÓNDE PUEDE IR CADA UNO.
 *
 * `archived` no sale a ninguna parte: archivar es el final del recorrido de un
 * plano dentro del relato. Y desde casi todos se puede volver a `ready`, porque
 * eso ES rehacer un plano —y rehacer UNO es el objetivo entero de todo esto—.
 */
export const TRANSICIONES_DE_PLANO: Readonly<Record<ShotState, readonly ShotState[]>> = Object.freeze({
  draft: Object.freeze(['ready', 'archived'] as ShotState[]),
  ready: Object.freeze(['draft', 'generated', 'archived'] as ShotState[]),
  generated: Object.freeze(['validated', 'stale', 'ready', 'archived'] as ShotState[]),
  validated: Object.freeze(['stale', 'ready', 'archived'] as ShotState[]),
  stale: Object.freeze(['ready', 'archived'] as ShotState[]),
  archived: Object.freeze([] as ShotState[]),
});

export const puedePasarDePlano = (de: ShotState, a: ShotState): boolean =>
  (TRANSICIONES_DE_PLANO[de] ?? []).includes(a);

/* ── La escena ────────────────────────────────────────────────────────────── */

/**
 * UNA ESCENA. Lo que comparten varios planos seguidos.
 *
 * Existe para no repetir lo mismo en cada plano: el sitio, quién anda por ahí,
 * el tratamiento visual. Un plano puede contradecirla —para eso tiene sus
 * propios campos—, pero lo que no diga lo hereda de aquí.
 *
 * ── Por qué la luz no tiene un campo propio ─────────────────────────────────
 *
 * Porque ya lo tiene: `creative.lighting.type`, con un vocabulario cerrado que
 * S2 dejó escrito. Un campo `lighting` aquí sería un segundo vocabulario para
 * la misma cosa, y en cuanto los dos existieran alguien escribiría en uno y
 * leería el otro. Lo mismo con la composición y el encuadre. Es una desviación
 * consciente de la lista que se pidió, y esta es la razón.
 */
export interface SceneNode extends OwnedByAccount {
  contract: typeof SHOT_CONTRACT_VERSION;
  sceneId: string;
  projectId: string;
  /** Sube cuando cambia lo que la escena declara. Empieza en 1. */
  version: number;
  /** Su sitio en el proyecto. Entero, desde 0. */
  order: number;
  name?: string;
  /** Dónde ocurre: un Element de tipo `place` o `scene`, en su versión. */
  location?: ElementBinding;
  /** Quién o qué anda por aquí, sin que cada plano tenga que repetirlo. */
  elements?: readonly ElementBinding[];
  /** Luz, composición, encuadre… El vocabulario cerrado de S2, sin duplicar. */
  creative?: CreativeParameters;
  /** Dónde va la historia, en una frase. Acotada a propósito: esto no es un guion. */
  narrative?: string;
  createdAt: number;
  updatedAt: number;
}

/* ── El plano ─────────────────────────────────────────────────────────────── */

/**
 * UN PLANO. La unidad que se genera, se comprueba y —si hace falta— se rehace.
 *
 * ── Por qué hay `previousShotId` si ya hay `order` ──────────────────────────
 *
 * Porque no son la misma pregunta. `order` dice dónde se ve; `previousShotId`
 * dice de qué plano CONTINÚA este, que es lo que hace falta para decidir si se
 * le pasa un fotograma del anterior. Normalmente coinciden, y cuando no
 * coinciden —un plano intercalado después, un contraplano que continúa el de
 * hace dos— el que manda para la continuidad es el puntero explícito.
 *
 * ── Y por qué NO hay `nextShotId` ───────────────────────────────────────────
 *
 * Porque sería una segunda verdad que puede contradecir a la primera. Quién va
 * después se deriva de quién apunta hacia atrás, y un puntero hacia delante
 * solo añade un sitio donde el grafo puede quedar roto sin que nadie se entere.
 * Se pidió «si la arquitectura lo considera útil»: no lo considera.
 */
export interface ShotNode extends OwnedByAccount {
  contract: typeof SHOT_CONTRACT_VERSION;
  shotId: string;
  projectId: string;
  /** Sube cada vez que el plano se rehace. Empieza en 1. */
  version: number;
  /** Su sitio dentro de la escena o del proyecto. Entero, desde 0. */
  order: number;
  state: ShotState;
  /** A qué escena pertenece, si pertenece a alguna. */
  sceneId?: string;
  /** De qué plano continúa este. Ver arriba por qué no es `order - 1`. */
  previousShotId?: string;
  /**
   * De qué planos depende su resultado. Si uno de ellos cambia, este puede
   * quedar `stale` — pero NADIE lo propaga todavía, y eso es a propósito.
   */
  dependsOnShotIds?: readonly string[];
  /** Quién sale, y en qué versión. El corazón de la continuidad. */
  elements?: readonly ElementBinding[];
  /** Cómo se quiere ver. El vocabulario de S2, sin duplicar. */
  creative?: CreativeParameters;
  /** Qué NO puede cambiar respecto a lo de al lado. */
  continuity?: ContinuityRequirements;
  /** Qué pasa aquí, en una frase. */
  narrative?: string;
  /** El resultado vigente. Un Asset del Content Core; aquí solo su id. */
  producedAssetId?: string;
  /** Cómo quedó la última comprobación, cuando la hubo. */
  verdict?: ContinuityVerdict;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}

/* ── Límites ──────────────────────────────────────────────────────────────── */

export const FORMA_DE_ID_DE_PLANO = /^[A-Za-z0-9_-]{4,128}$/;
export const MAX_ELEMENTOS_POR_NODO = 16;
export const MAX_DEPENDENCIAS_DE_PLANO = 8;
export const MAX_NARRATIVA = 280;
export const MAX_NOMBRE_DE_ESCENA = 120;
export const MAX_ORDEN = 99_999;
export const MAX_VERSION_DE_NODO = 9999;

/* ── Validación ───────────────────────────────────────────────────────────── */

export type MotivoDeNodoInvalido =
  | 'invalid_shape'
  | 'unknown_field'
  | 'dangerous_key'
  | 'forbidden_key'
  | 'invalid_id'
  | 'invalid_owner'
  | 'invalid_version'
  | 'invalid_order'
  | 'invalid_state'
  | 'invalid_text'
  | 'invalid_binding'
  | 'duplicate_binding'
  | 'invalid_continuity'
  | 'invalid_verdict'
  | 'invalid_creative'
  | 'self_reference'
  | 'too_many'
  | 'invalid_time';

export interface ProblemaDeNodo {
  field: string;
  reason: MotivoDeNodoInvalido;
}

const mal = (field: string, reason: MotivoDeNodoInvalido): ProblemaDeNodo => ({ field, reason });

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const esTxt = (v: unknown): v is string => typeof v === 'string';
const propia = (o: Record<string, unknown>, c: string): boolean =>
  Object.prototype.hasOwnProperty.call(o, c);

const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];

/**
 * LO QUE UN NODO NO PUEDE LLEVAR NUNCA.
 *
 * `prompt` está en la lista y es el que más importa: es exactamente lo que
 * alguien intentará meter aquí el primer día, porque parece cómodo. Un plano
 * que guarda su prompt deja de ser estructura y pasa a ser una cadena de texto
 * con la que no se puede razonar.
 */
const PROHIBIDAS = [
  'storageref', 'bucket', 'objectkey', 'url', 'signedurl', 'downloadurl', 'endpoint',
  'providerid', 'modelid', 'adapterid', 'provider', 'model', 'adapter',
  'apikey', 'secret', 'credential', 'credentials', 'token', 'authorization',
  'bytes', 'content', 'data', 'buffer', 'blob', 'embedding', 'embeddings', 'vector',
  'prompt', 'negativeprompt', 'seed',
];

const normalizar = (c: string): string => c.toLowerCase().replace(/[-_]/g, '');
export const claveProhibidaDeNodo = (clave: string): boolean =>
  PROHIBIDAS.includes(clave.toLowerCase()) || PROHIBIDAS.includes(normalizar(clave));

const ATRIBUCION: readonly string[] = [
  'ownerAccountId', 'createdByEntityId', 'createdByEntityType',
  'publishedByEntityId', 'publishedByEntityType',
];

const CAMPOS_DE_ESCENA: readonly string[] = [
  'contract', 'sceneId', 'projectId', 'version', 'order', 'name',
  'location', 'elements', 'creative', 'narrative', 'createdAt', 'updatedAt', ...ATRIBUCION,
];

const CAMPOS_DE_PLANO: readonly string[] = [
  'contract', 'shotId', 'projectId', 'version', 'order', 'state', 'sceneId',
  'previousShotId', 'dependsOnShotIds', 'elements', 'creative', 'continuity',
  'narrative', 'producedAssetId', 'verdict', 'createdAt', 'updatedAt', 'archivedAt', ...ATRIBUCION,
];

/** Lo que comparten los dos nodos: claves, identidad, versión, orden y horas. */
const revisarComun = (
  d: Record<string, unknown>,
  campos: readonly string[],
  obligatorios: readonly string[],
  p: ProblemaDeNodo[],
): void => {
  for (const [clave, valor] of Object.entries(d)) {
    if (PELIGROSAS.includes(clave)) { p.push(mal(clave, 'dangerous_key')); continue; }
    if (claveProhibidaDeNodo(clave)) { p.push(mal(clave, 'forbidden_key')); continue; }
    if (!campos.includes(clave)) { p.push(mal(clave, 'unknown_field')); continue; }
    if (typeof valor === 'function') p.push(mal(clave, 'invalid_shape'));
  }
  for (const campo of obligatorios) if (!propia(d, campo)) p.push(mal(campo, 'invalid_shape'));

  if (d.contract !== SHOT_CONTRACT_VERSION) p.push(mal('contract', 'invalid_shape'));
  if (!esTxt(d.projectId) || !FORMA_DE_ID_DE_PLANO.test(d.projectId)) p.push(mal('projectId', 'invalid_id'));
  /* Sin cuenta no hay nodo. La propiedad no es un campo más: es el permiso. */
  if (!esTxt(d.ownerAccountId) || d.ownerAccountId.length === 0) p.push(mal('ownerAccountId', 'invalid_owner'));
  if (!esNum(d.version) || !Number.isInteger(d.version) || d.version < 1 || d.version > MAX_VERSION_DE_NODO) {
    p.push(mal('version', 'invalid_version'));
  }
  if (!esNum(d.order) || !Number.isInteger(d.order) || d.order < 0 || d.order > MAX_ORDEN) {
    p.push(mal('order', 'invalid_order'));
  }
  if (!esNum(d.createdAt) || d.createdAt < 0) p.push(mal('createdAt', 'invalid_time'));
  if (!esNum(d.updatedAt) || d.updatedAt < 0) p.push(mal('updatedAt', 'invalid_time'));

  if (d.narrative !== undefined
    && (!esTxt(d.narrative) || d.narrative.length === 0 || d.narrative.length > MAX_NARRATIVA)) {
    p.push(mal('narrative', 'invalid_text'));
  }
  if (d.creative !== undefined && !creativosValidos(d.creative)) p.push(mal('creative', 'invalid_creative'));

  if (d.elements !== undefined) {
    if (!Array.isArray(d.elements)) p.push(mal('elements', 'invalid_shape'));
    else {
      if (d.elements.length > MAX_ELEMENTOS_POR_NODO) p.push(mal('elements', 'too_many'));
      const vistos = new Set<string>();
      for (let i = 0; i < d.elements.length; i++) {
        const b: unknown = d.elements[i];
        const campo = `elements[${i}]`;
        if (!anclajeValido(b)) { p.push(mal(campo, 'invalid_binding')); continue; }
        /* La misma cosa dos veces, aunque sea en versiones distintas, es una orden imposible. */
        if (vistos.has(b.elementId)) { p.push(mal(campo, 'duplicate_binding')); continue; }
        vistos.add(b.elementId);
      }
    }
  }
};

/**
 * UNA ESCENA, REVISADA ENTERA. Todos los problemas, no el primero.
 *
 * Comprueba la FORMA. Que el proyecto exista, que el Element anclado sea de
 * esta cuenta y que esté en esa versión no se puede saber sin leer, y el Core
 * no lee.
 */
export const validarEscena = (crudo: unknown): readonly ProblemaDeNodo[] => {
  if (!esObjeto(crudo)) return [mal('scene', 'invalid_shape')];
  const d = crudo;
  const p: ProblemaDeNodo[] = [];

  revisarComun(d, CAMPOS_DE_ESCENA,
    ['contract', 'sceneId', 'projectId', 'version', 'order', 'ownerAccountId', 'createdAt', 'updatedAt'], p);

  if (!esTxt(d.sceneId) || !FORMA_DE_ID_DE_PLANO.test(d.sceneId)) p.push(mal('sceneId', 'invalid_id'));
  if (d.name !== undefined
    && (!esTxt(d.name) || d.name.length === 0 || d.name.length > MAX_NOMBRE_DE_ESCENA)) {
    p.push(mal('name', 'invalid_text'));
  }
  if (d.location !== undefined && !anclajeValido(d.location)) p.push(mal('location', 'invalid_binding'));

  return Object.freeze(p);
};

export const escenaValida = (crudo: unknown): crudo is SceneNode => validarEscena(crudo).length === 0;

/**
 * UN PLANO, REVISADO ENTERO. Todos los problemas, no el primero.
 *
 * Además de la forma, dos reglas que sí son suyas: un plano no puede continuar
 * de sí mismo ni depender de sí mismo. Las dos producen un bucle que nadie
 * podría recorrer, y las dos se pueden ver sin leer nada de fuera.
 */
export const validarPlano = (crudo: unknown): readonly ProblemaDeNodo[] => {
  if (!esObjeto(crudo)) return [mal('shot', 'invalid_shape')];
  const d = crudo;
  const p: ProblemaDeNodo[] = [];

  revisarComun(d, CAMPOS_DE_PLANO,
    ['contract', 'shotId', 'projectId', 'version', 'order', 'state', 'ownerAccountId', 'createdAt', 'updatedAt'], p);

  const id = esTxt(d.shotId) && FORMA_DE_ID_DE_PLANO.test(d.shotId) ? d.shotId : undefined;
  if (id === undefined) p.push(mal('shotId', 'invalid_id'));
  if (!esEstadoDePlano(d.state)) p.push(mal('state', 'invalid_state'));

  if (d.sceneId !== undefined && (!esTxt(d.sceneId) || !FORMA_DE_ID_DE_PLANO.test(d.sceneId))) {
    p.push(mal('sceneId', 'invalid_id'));
  }

  if (d.previousShotId !== undefined) {
    if (!esTxt(d.previousShotId) || !FORMA_DE_ID_DE_PLANO.test(d.previousShotId)) {
      p.push(mal('previousShotId', 'invalid_id'));
    } else if (d.previousShotId === id) {
      p.push(mal('previousShotId', 'self_reference'));
    }
  }

  if (d.dependsOnShotIds !== undefined) {
    if (!Array.isArray(d.dependsOnShotIds)) p.push(mal('dependsOnShotIds', 'invalid_shape'));
    else {
      if (d.dependsOnShotIds.length > MAX_DEPENDENCIAS_DE_PLANO) p.push(mal('dependsOnShotIds', 'too_many'));
      const vistos = new Set<string>();
      for (let i = 0; i < d.dependsOnShotIds.length; i++) {
        const dep: unknown = d.dependsOnShotIds[i];
        const campo = `dependsOnShotIds[${i}]`;
        if (!esTxt(dep) || !FORMA_DE_ID_DE_PLANO.test(dep)) { p.push(mal(campo, 'invalid_id')); continue; }
        if (dep === id) { p.push(mal(campo, 'self_reference')); continue; }
        if (vistos.has(dep)) { p.push(mal(campo, 'duplicate_binding')); continue; }
        vistos.add(dep);
      }
    }
  }

  if (d.continuity !== undefined && !continuidadValida(d.continuity)) p.push(mal('continuity', 'invalid_continuity'));
  if (d.verdict !== undefined && !veredictoValido(d.verdict)) p.push(mal('verdict', 'invalid_verdict'));
  if (d.producedAssetId !== undefined
    && (!esTxt(d.producedAssetId) || !FORMA_DE_ID_DE_PLANO.test(d.producedAssetId))) {
    p.push(mal('producedAssetId', 'invalid_id'));
  }
  if (d.archivedAt !== undefined && (!esNum(d.archivedAt) || d.archivedAt < 0)) {
    p.push(mal('archivedAt', 'invalid_time'));
  }

  return Object.freeze(p);
};

export const planoValido = (crudo: unknown): crudo is ShotNode => validarPlano(crudo).length === 0;

/* ── Preguntas que un plano puede contestar solo ──────────────────────────── */

/**
 * ¿ESTE PLANO ES DE ESTA CUENTA?
 *
 * Estructural, sobre datos ya leídos. La misma forma que `elementoEsDeLaCuenta`
 * y por el mismo motivo: quien pregunta tuvo que traer el nodo de donde se
 * guarde, y es ahí donde se comprueba de verdad quién está autenticado.
 */
export const nodoEsDeLaCuenta = (
  nodo: { ownerAccountId?: string } | undefined,
  accountId: string | undefined,
): boolean =>
  !!nodo && typeof accountId === 'string' && accountId.length > 0 && nodo.ownerAccountId === accountId;

/**
 * DE QUÉ SE AGARRA ESTE PLANO. La unión de lo que declara y de lo que ancla.
 *
 * Los `elements` dicen quién sale; los `anchors` de la continuidad dicen qué
 * hay que conservar. Casi siempre son lo mismo, pero no tienen por qué: se
 * puede exigir conservar algo que no sale en el plano —el estilo de una marca,
 * por ejemplo— y se puede tener a alguien en el plano sin exigir nada de él.
 * Quien prepare las referencias necesita los dos conjuntos, sin repetidos.
 */
export const referenciasDelPlano = (plano: ShotNode): readonly ElementBinding[] => {
  const porId = new Map<string, ElementBinding>();
  for (const b of plano.elements ?? []) if (!porId.has(b.elementId)) porId.set(b.elementId, b);
  for (const a of plano.continuity?.anchors ?? []) if (!porId.has(a.elementId)) porId.set(a.elementId, a);
  return Object.freeze([...porId.values()]);
};
