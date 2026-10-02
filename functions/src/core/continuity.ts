import { CONTINUITY_CONTRACT_VERSION } from './contracts';

/**
 * WEË CONTINUITY — QUÉ TIENE QUE SEGUIR SIENDO LO MISMO.
 *
 * ── El problema, dicho con una frase de alguien ─────────────────────────────
 *
 * «Cambia la ropa, pero no cambies a Luna.»
 *
 * Weë sabe decir QUÉ ES una cosa —eso es un Element— y sabe decir CÓMO se
 * quiere ver —eso son los parámetros creativos—. Lo que no sabe decir es qué,
 * de todo eso, NO PUEDE MOVERSE de un plano al siguiente. Sin esa frase, cada
 * generación es la primera: el modelo hace lo que le parece con la cara, con el
 * traje y con la luz, y la única forma de corregirlo es repetir el proyecto
 * entero.
 *
 * Este archivo es esa frase, escrita de forma que una máquina la pueda
 * transportar y comprobar.
 *
 * ── Cinco cosas distintas, y ninguna es sinónimo de otra ────────────────────
 *
 *   ASSET       el recurso digital.
 *   ELEMENT     QUÉ ES.                 «Luna», y qué materiales la muestran.
 *   CONTEXT     QUÉ HACE FALTA AHORA.   Cuál de las cosas de la cuenta sirve.
 *   CREATIVE    CÓMO REPRESENTARLO.     Aéreo, alejándose, luz dorada.
 *   CONTINUITY  QUÉ NO PUEDE CAMBIAR.   La cara de Luna, sí; el encuadre, no.
 *
 * Y la pregunta de la identidad —«¿quién es Luna?»— **no es de este archivo**.
 * Esa la contesta el Element y su versión. Aquí solo se dice si lo que salió
 * sigue siendo compatible con lo que se exigió.
 *
 * ── LO QUE ESTE ARCHIVO NO HACE, que es la mitad del diseño ─────────────────
 *
 * No mira una imagen. No compara dos caras. No llama a nadie. No decide
 * regenerar. No sabe qué proveedor soporta qué, ni cómo se le pide a ninguno
 * que conserve un rostro: eso es del adaptador, y meterlo aquí ataría el Core a
 * una empresa concreta. No guarda bytes, ni prompts, ni vectores.
 *
 * Es VOCABULARIO y son REGLAS. Quien mire de verdad llegará después, y llegará
 * como una capacidad más del catálogo, con su router, su trabajo y su cobro.
 *
 * ── La regla que más fácil se incumple ──────────────────────────────────────
 *
 *     LO QUE NO SE SABE NO ES QUE ESTÉ BIEN.
 *
 * Un aspecto del que nadie dijo nada sale `unspecified`; un aspecto que no se
 * pudo comprobar sale `unknown`. Ninguno de los dos es `pass`. Es la misma
 * regla que ya aplica `compatibilidadCreativa`, y por el mismo motivo: tratar
 * la ignorancia como aprobación es la forma más barata de mentir.
 */

/* ── Qué puede cambiar, y qué no ──────────────────────────────────────────── */

/**
 * LOS ASPECTOS. Cerrados, y de TODO WEË, no solo de los personajes.
 *
 * ── Por qué esta lista no es la de C1 ───────────────────────────────────────
 *
 * C1 nació con diecisiete aspectos pensados para una persona en un plano, y esa
 * forma no aguanta la frase que de verdad hay que poder decir:
 *
 *     «Conserva exactamente esta arquitectura y cambia solo los muebles.»
 *     «Mantén esta botella y cambia solo el fondo.»
 *     «Conserva la fachada y cambia las ventanas.»
 *
 * Son el MISMO requisito que «cambia la ropa pero no cambies a Luna», y tenían
 * que caber en el mismo contrato. Con `scene.*` y `objects.*` como únicas
 * familias no cabían: un edificio no es un objeto del plano y una distribución
 * no es una escena. Así que las familias se rehicieron ANTES de que nada
 * persistiera —C1 no toca Firestore, no tiene puerta y no está desplegado—,
 * que es exactamente cuando cuesta un test y no una migración.
 *
 * Lo que NO cambió es ninguna decisión de C1: dos listas, `unknown` nunca es
 * `pass`, el silencio no es permiso, sin puntuación, y un puntero es un id con
 * su versión.
 *
 * ── Cómo se lee ─────────────────────────────────────────────────────────────
 *
 * `familia.detalle`. La familia dice de qué se habla; el detalle, qué parte.
 * Pedir la familia entera no existe a propósito: «conserva la arquitectura» son
 * cinco cosas concretas, y enumerarlas es lo que permite que un proveedor diga
 * cuáles sabe y cuáles no.
 *
 * ── Y por qué `identity.*` y el resto están separados ───────────────────────
 *
 * Porque es la distinción que la gente pide en voz alta. La identidad es quién
 * es —la cara, el cuerpo, los rasgos—; la apariencia es cómo va hoy, y el
 * vestuario es otra cosa todavía. Si fueran una sola familia, «cambia el
 * vestido pero no cambies a Luna» no se podría escribir.
 *
 * `identity.appearance` existe para fijar el aspecto general sin enumerar.
 * Se solapa a propósito con `appearance.*` y ese solapamiento NO se resuelve
 * aquí: este archivo no construye una jerarquía. Una jerarquía inventada sería
 * el Core opinando sobre lo que la gente quiso decir.
 */
export type ContinuityAspect =
  /* QUIÉN O QUÉ ES. Lo que no puede moverse sin que deje de ser lo mismo. */
  | 'identity.face'
  | 'identity.body'
  | 'identity.hair'
  | 'identity.features'
  | 'identity.appearance'
  /* CÓMO SE VE HOY. Cambia sin dejar de ser la misma persona. */
  | 'appearance.hairstyle'
  | 'appearance.hairColor'
  | 'appearance.skin'
  | 'appearance.eyes'
  | 'appearance.facialHair'
  | 'appearance.makeup'
  /* LO QUE LLEVA PUESTO. */
  | 'outfit.clothing'
  | 'outfit.footwear'
  | 'outfit.accessories'
  | 'outfit.complete'
  /* UNA COSA. Un coche, una silla, una guitarra. */
  | 'object.identity'
  | 'object.geometry'
  | 'object.proportions'
  | 'object.color'
  | 'object.material'
  | 'object.texture'
  | 'object.markings'
  | 'object.presence'
  | 'object.position'
  | 'object.state'
  /* ALGO QUE SE VENDE. Un objeto con marca encima, y la marca importa. */
  | 'product.identity'
  | 'product.geometry'
  | 'product.packaging'
  | 'product.label'
  | 'product.branding'
  /* UN EDIFICIO. La familia que hace que esto sirva para Weë Design. */
  | 'architecture.identity'
  | 'architecture.geometry'
  | 'architecture.facade'
  | 'architecture.openings'
  | 'architecture.structure'
  | 'architecture.proportions'
  | 'architecture.spatialLayout'
  | 'architecture.materials'
  | 'architecture.elements'
  /* LO DE DENTRO. Se conserva la casa y se cambian los muebles, o al revés. */
  | 'interior.layout'
  | 'interior.furniture'
  | 'interior.fixtures'
  | 'interior.materials'
  | 'interior.finishes'
  | 'interior.decoration'
  /* LO DE FUERA. */
  | 'exterior.site'
  | 'exterior.landscape'
  | 'exterior.terrain'
  | 'exterior.vegetation'
  | 'exterior.surroundings'
  /* DÓNDE OCURRE. */
  | 'environment.location'
  | 'environment.scene'
  | 'environment.background'
  | 'environment.spatialContext'
  /* EL TRATAMIENTO VISUAL DEL CONJUNTO. */
  | 'style.visual'
  | 'style.artistic'
  | 'style.rendering'
  | 'style.composition'
  /* DESDE DÓNDE SE MIRA. */
  | 'camera.framing'
  | 'camera.perspective'
  | 'camera.position'
  | 'camera.focal'
  | 'camera.shotType'
  /* CÓMO ESTÁ ILUMINADO. */
  | 'lighting.type'
  | 'lighting.direction'
  | 'lighting.intensity'
  | 'lighting.timeOfDay'
  /* CÓMO ESTÁ PUESTO Y QUÉ HACE. */
  | 'pose.body'
  | 'pose.position'
  | 'action.activity'
  | 'action.movement'
  /* DÓNDE ESTÁ CADA COSA RESPECTO A LAS DEMÁS. Ver `SpatialConstraint`. */
  | 'spatial.relationships'
  | 'spatial.alignment'
  | 'spatial.containment'
  | 'spatial.relativePosition'
  /* QUE EL TIEMPO AVANCE COMO DEBE. */
  | 'temporal.previousShot'
  | 'temporal.sceneState'
  | 'temporal.subjectState'
  | 'temporal.environmentState'
  | 'temporal.objectState'
  | 'temporal.motion'
  /* QUE LA HISTORIA SIGA TENIENDO SENTIDO. */
  | 'narrative.state'
  | 'narrative.logic';

export const ASPECTOS_DE_CONTINUIDAD: readonly ContinuityAspect[] = Object.freeze([
  'identity.face', 'identity.body', 'identity.hair', 'identity.features', 'identity.appearance',
  'appearance.hairstyle', 'appearance.hairColor', 'appearance.skin', 'appearance.eyes',
  'appearance.facialHair', 'appearance.makeup',
  'outfit.clothing', 'outfit.footwear', 'outfit.accessories', 'outfit.complete',
  'object.identity', 'object.geometry', 'object.proportions', 'object.color',
  'object.material', 'object.texture', 'object.markings',
  'object.presence', 'object.position', 'object.state',
  'product.identity', 'product.geometry', 'product.packaging', 'product.label', 'product.branding',
  'architecture.identity', 'architecture.geometry', 'architecture.facade', 'architecture.openings',
  'architecture.structure', 'architecture.proportions', 'architecture.spatialLayout',
  'architecture.materials', 'architecture.elements',
  'interior.layout', 'interior.furniture', 'interior.fixtures', 'interior.materials',
  'interior.finishes', 'interior.decoration',
  'exterior.site', 'exterior.landscape', 'exterior.terrain', 'exterior.vegetation', 'exterior.surroundings',
  'environment.location', 'environment.scene', 'environment.background', 'environment.spatialContext',
  'style.visual', 'style.artistic', 'style.rendering', 'style.composition',
  'camera.framing', 'camera.perspective', 'camera.position', 'camera.focal', 'camera.shotType',
  'lighting.type', 'lighting.direction', 'lighting.intensity', 'lighting.timeOfDay',
  'pose.body', 'pose.position', 'action.activity', 'action.movement',
  'spatial.relationships', 'spatial.alignment', 'spatial.containment', 'spatial.relativePosition',
  'temporal.previousShot', 'temporal.sceneState', 'temporal.subjectState',
  'temporal.environmentState', 'temporal.objectState', 'temporal.motion',
  'narrative.state', 'narrative.logic',
] as const);

/**
 * LAS FAMILIAS, derivadas de los propios aspectos y no escritas a mano.
 *
 * Existe para que quien enseñe esto a una persona pueda agrupar sin aprenderse
 * la lista, y para que una familia nueva no obligue a tocar dos sitios.
 */
export const FAMILIAS_DE_CONTINUIDAD: readonly string[] = Object.freeze(
  [...new Set(ASPECTOS_DE_CONTINUIDAD.map((a) => a.slice(0, a.indexOf('.'))))],
);

export const esAspectoDeContinuidad = (v: unknown): v is ContinuityAspect =>
  typeof v === 'string' && (ASPECTOS_DE_CONTINUIDAD as readonly string[]).includes(v);

/**
 * CUÁNTO APRIETA. Semántico, y no un número, a propósito.
 *
 * Un `0.82` aquí sería precisión inventada: nadie puede decir qué separa un
 * 0,81 de un 0,83, y en cuanto existiera el número alguien lo compararía con un
 * umbral y decidiría rehacer un vídeo pagado. Tres palabras dicen lo que se
 * sabe de verdad, y quien traduzca a los mandos de un proveedor —el adaptador—
 * decidirá qué pesos usa con los suyos.
 */
export type ContinuityStrength = 'relaxed' | 'standard' | 'strict';

export const FUERZAS_DE_CONTINUIDAD: readonly ContinuityStrength[] = Object.freeze([
  'relaxed', 'standard', 'strict',
] as const);

/**
 * UN ANCLAJE. De qué cosa, y de qué VERSIÓN de esa cosa.
 *
 * La versión no es un adorno: «la misma Luna» no significa nada si Luna cambió
 * de peinado hace dos semanas. `Element.version` ya es un entero, así que la
 * continuidad puede ser una comparación exacta en vez de una impresión.
 *
 * Aquí NO va el nombre. «Luna» es una etiqueta que alguien puede cambiar; el
 * identificador y la versión son lo que de verdad señala a algo.
 */
export interface ContinuityAnchor {
  elementId: string;
  version: number;
}

/**
 * LO QUE SE EXIGE DE ESTA GENERACIÓN.
 *
 * Dos listas, y la diferencia entre ellas es todo el contrato:
 *
 *   preserve    tiene que seguir igual.
 *   mayChange   se DIJO que puede cambiar. No es lo mismo que callarse.
 *
 * Un aspecto que no está en ninguna de las dos está `unspecified`, y eso no
 * autoriza nada: si después se comprueba y ha cambiado, el veredicto de ese
 * aspecto es `unknown`, no `pass`.
 */
export interface ContinuityRequirements {
  /** Al menos uno. Unos requisitos que no exigen nada no son unos requisitos. */
  preserve: readonly ContinuityAspect[];
  /** Permiso EXPLÍCITO para que estos cambien. El silencio no es permiso. */
  mayChange?: readonly ContinuityAspect[];
  /** Qué cosas, y en qué versión, hay que conservar. */
  anchors?: readonly ContinuityAnchor[];
  /** Cuánto apretar. Ausente = `standard`. */
  strength?: ContinuityStrength;
  /** Qué tiene que seguir estando al lado de qué. Ver `SpatialConstraint`. */
  spatial?: readonly SpatialConstraint[];
}

/* ── Dónde está cada cosa respecto a las demás ────────────────────────────── */

/**
 * LAS RELACIONES QUE SE PUEDEN EXIGIR. Ocho, cerradas.
 *
 * `spatial.relationships` dice QUE hay que conservar la disposición; esto dice
 * CUÁL. Sin las dos cosas, «la lámpara sigue encima de la mesa» no se puede
 * escribir: el aspecto solo no sabe de qué lámpara habla.
 *
 * No es un grafo nuevo. Son dos identificadores de Element y un verbo, y viven
 * dentro del requisito que los necesita — se van con él cuando el plano se
 * rehace, y no dejan aristas sueltas por ningún sitio.
 */
export type SpatialRelationKind =
  | 'next_to'
  | 'behind'
  | 'in_front_of'
  | 'inside'
  | 'above'
  | 'below'
  | 'aligned_with'
  | 'attached_to';

export const RELACIONES_ESPACIALES: readonly SpatialRelationKind[] = Object.freeze([
  'next_to', 'behind', 'in_front_of', 'inside', 'above', 'below', 'aligned_with', 'attached_to',
] as const);

/**
 * UNA RELACIÓN A CONSERVAR. Sujeto, verbo y objeto, los tres por identificador.
 *
 * El orden importa: «A detrás de B» y «B detrás de A» son cosas distintas, y
 * por eso no hay un solo campo con dos identificadores dentro.
 */
export interface SpatialConstraint {
  /** El Element que se sitúa. */
  subject: string;
  relation: SpatialRelationKind;
  /** El Element respecto al que se sitúa. */
  object: string;
}

/* ── Límites ──────────────────────────────────────────────────────────────── */

export const MAX_ASPECTOS_POR_LISTA = ASPECTOS_DE_CONTINUIDAD.length;
export const MAX_ANCLAJES = 16;
export const MAX_VERSION_DE_ANCLAJE = 9999;
export const FORMA_DE_ID_DE_ANCLAJE = /^[A-Za-z0-9_-]{4,128}$/;

/* ── Validación de los requisitos ─────────────────────────────────────────── */

export type MotivoDeContinuidadInvalida =
  | 'invalid_shape'
  | 'unknown_field'
  | 'dangerous_key'
  | 'forbidden_key'
  | 'invalid_aspect'
  | 'duplicate_aspect'
  | 'conflicting_aspect'
  | 'empty_preserve'
  | 'invalid_strength'
  | 'invalid_anchor'
  | 'duplicate_anchor'
  | 'invalid_relation'
  | 'self_relation'
  | 'too_many';

export interface ProblemaDeContinuidad {
  field: string;
  reason: MotivoDeContinuidadInvalida;
}

const mal = (field: string, reason: MotivoDeContinuidadInvalida): ProblemaDeContinuidad => ({ field, reason });

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const esTxt = (v: unknown): v is string => typeof v === 'string';

const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];

/**
 * LO QUE UNOS REQUISITOS DE CONTINUIDAD NO PUEDEN LLEVAR NUNCA.
 *
 * La misma lista de siempre, por el mismo motivo de siempre: esto viaja hasta
 * el adaptador, y un `storageRef` o una URL aquí convertirían un requisito
 * abstracto en una instrucción de almacenamiento. Lo que hay que conservar se
 * señala con un identificador y una versión; los bytes son de Media Cloud.
 *
 * Y tampoco el nombre de un proveedor o de un modelo: el día que alguien
 * escriba aquí cómo se le pide a uno concreto que conserve un rostro, el Core
 * habrá dejado de ser agnóstico.
 */
const PROHIBIDAS = [
  'storageref', 'bucket', 'objectkey', 'url', 'signedurl', 'downloadurl', 'endpoint',
  'providerid', 'modelid', 'adapterid', 'provider', 'model', 'adapter',
  'apikey', 'secret', 'credential', 'credentials', 'token', 'authorization',
  'bytes', 'content', 'data', 'buffer', 'blob', 'embedding', 'embeddings', 'vector',
  'prompt', 'negativeprompt', 'seed',
];

const normalizar = (c: string): string => c.toLowerCase().replace(/[-_]/g, '');
export const claveProhibidaDeContinuidad = (clave: string): boolean =>
  PROHIBIDAS.includes(clave.toLowerCase()) || PROHIBIDAS.includes(normalizar(clave));

const CAMPOS_DE_REQUISITOS: readonly string[] = ['preserve', 'mayChange', 'anchors', 'strength', 'spatial'];
const CAMPOS_DE_RELACION: readonly string[] = ['subject', 'relation', 'object'];
export const MAX_RELACIONES_ESPACIALES = 16;
const CAMPOS_DE_ANCLAJE: readonly string[] = ['elementId', 'version'];

/**
 * UN PUNTERO A UNA COSA, EN UNA VERSIÓN CONCRETA.
 *
 * Se exporta porque no es exclusivo de la continuidad: un plano también dice
 * quién sale en él, y «quién» es exactamente esto. Compartir la comprobación
 * evita que dentro de un mes haya dos ideas distintas de qué es un puntero
 * válido y una de las dos esté mal.
 */
export const anclajeValido = (v: unknown): v is ContinuityAnchor => {
  if (!esObjeto(v)) return false;
  if (Object.keys(v).some((k) => !CAMPOS_DE_ANCLAJE.includes(k))) return false;
  if (!esTxt(v.elementId) || !FORMA_DE_ID_DE_ANCLAJE.test(v.elementId)) return false;
  return esNum(v.version) && Number.isInteger(v.version)
    && v.version >= 1 && v.version <= MAX_VERSION_DE_ANCLAJE;
};

const propia = (o: Record<string, unknown>, c: string): boolean =>
  Object.prototype.hasOwnProperty.call(o, c);

const revisarLista = (
  valor: unknown,
  campo: string,
  p: ProblemaDeContinuidad[],
): readonly string[] => {
  if (!Array.isArray(valor)) { p.push(mal(campo, 'invalid_shape')); return []; }
  if (valor.length > MAX_ASPECTOS_POR_LISTA) p.push(mal(campo, 'too_many'));
  const vistos = new Set<string>();
  for (let i = 0; i < valor.length; i++) {
    const a = valor[i];
    if (!esAspectoDeContinuidad(a)) { p.push(mal(`${campo}[${i}]`, 'invalid_aspect')); continue; }
    if (vistos.has(a)) { p.push(mal(`${campo}[${i}]`, 'duplicate_aspect')); continue; }
    vistos.add(a);
  }
  return [...vistos];
};

/**
 * UNOS REQUISITOS, REVISADOS ENTEROS. Todos los problemas, no el primero.
 *
 * Comprueba la FORMA. Que el elemento anclado exista, sea de esta cuenta y esté
 * en esa versión no se puede saber sin leer, y el Core no lee.
 *
 * ── El conflicto que sí se rechaza, y el que no ─────────────────────────────
 *
 * El mismo aspecto en las dos listas es una contradicción de FORMA —se exige y
 * se libera exactamente lo mismo— y se rechaza. Un solapamiento de
 * SIGNIFICADO, como `identity.appearance` en `preserve` con `appearance.outfit`
 * en `mayChange`, no se rechaza: para decidir eso haría falta una jerarquía de
 * aspectos, y una jerarquía inventada aquí sería una opinión del Core sobre lo
 * que la gente quiso decir.
 */
export const validarContinuidad = (crudo: unknown): readonly ProblemaDeContinuidad[] => {
  if (!esObjeto(crudo)) return [mal('continuity', 'invalid_shape')];
  const d = crudo;
  const p: ProblemaDeContinuidad[] = [];

  for (const [clave, valor] of Object.entries(d)) {
    if (PELIGROSAS.includes(clave)) { p.push(mal(clave, 'dangerous_key')); continue; }
    if (claveProhibidaDeContinuidad(clave)) { p.push(mal(clave, 'forbidden_key')); continue; }
    if (!CAMPOS_DE_REQUISITOS.includes(clave)) { p.push(mal(clave, 'unknown_field')); continue; }
    if (typeof valor === 'function') p.push(mal(clave, 'invalid_shape'));
  }

  if (!propia(d, 'preserve')) p.push(mal('preserve', 'invalid_shape'));

  const preservar = propia(d, 'preserve') ? revisarLista(d.preserve, 'preserve', p) : [];
  if (Array.isArray(d.preserve) && d.preserve.length === 0) p.push(mal('preserve', 'empty_preserve'));

  const liberar = d.mayChange === undefined ? [] : revisarLista(d.mayChange, 'mayChange', p);

  /* Exigir y liberar LO MISMO no es un matiz: es pedir las dos cosas a la vez. */
  const enLasDos = preservar.filter((a) => liberar.includes(a));
  for (const a of enLasDos) p.push(mal(a, 'conflicting_aspect'));

  if (d.strength !== undefined
    && !(esTxt(d.strength) && (FUERZAS_DE_CONTINUIDAD as readonly string[]).includes(d.strength))) {
    p.push(mal('strength', 'invalid_strength'));
  }

  if (d.anchors !== undefined) {
    if (!Array.isArray(d.anchors)) p.push(mal('anchors', 'invalid_shape'));
    else {
      if (d.anchors.length > MAX_ANCLAJES) p.push(mal('anchors', 'too_many'));
      const vistos = new Set<string>();
      for (let i = 0; i < d.anchors.length; i++) {
        const a: unknown = d.anchors[i];
        const campo = `anchors[${i}]`;
        if (!anclajeValido(a)) { p.push(mal(campo, 'invalid_anchor')); continue; }
        /* Dos anclajes de la MISMA cosa, aunque sea a versiones distintas, son una orden imposible. */
        if (vistos.has(a.elementId)) { p.push(mal(campo, 'duplicate_anchor')); continue; }
        vistos.add(a.elementId);
      }
    }
  }

  if (d.spatial !== undefined) {
    if (!Array.isArray(d.spatial)) p.push(mal('spatial', 'invalid_shape'));
    else {
      if (d.spatial.length > MAX_RELACIONES_ESPACIALES) p.push(mal('spatial', 'too_many'));
      for (let i = 0; i < d.spatial.length; i++) {
        const r: unknown = d.spatial[i];
        const campo = `spatial[${i}]`;
        if (!esObjeto(r) || Object.keys(r).some((k) => !CAMPOS_DE_RELACION.includes(k))) {
          p.push(mal(campo, 'invalid_relation')); continue;
        }
        const sujetoOk = esTxt(r.subject) && FORMA_DE_ID_DE_ANCLAJE.test(r.subject);
        const objetoOk = esTxt(r.object) && FORMA_DE_ID_DE_ANCLAJE.test(r.object);
        const verboOk = esTxt(r.relation) && (RELACIONES_ESPACIALES as readonly string[]).includes(r.relation);
        if (!sujetoOk || !objetoOk || !verboOk) { p.push(mal(campo, 'invalid_relation')); continue; }
        /* «A al lado de A» no dice nada, y no poder decirlo es mejor que poder decirlo y que nadie lo mire. */
        if (r.subject === r.object) p.push(mal(campo, 'self_relation'));
      }
    }
  }

  return Object.freeze(p);
};

export const continuidadValida = (crudo: unknown): crudo is ContinuityRequirements =>
  validarContinuidad(crudo).length === 0;

/* ── Qué se exigió de un aspecto ──────────────────────────────────────────── */

/**
 * LAS TRES RESPUESTAS POSIBLES, y la tercera es la que importa.
 *
 * `unspecified` no es un hueco que rellenar con optimismo: es la constancia de
 * que nadie dijo nada de eso. Quien valide lo traducirá a `unknown`, nunca a
 * `pass`.
 */
export type ExigenciaDeContinuidad = 'preserve' | 'may_change' | 'unspecified';

export const exigenciaDe = (
  requisitos: ContinuityRequirements | undefined,
  aspecto: ContinuityAspect,
): ExigenciaDeContinuidad => {
  if (!requisitos) return 'unspecified';
  if (requisitos.preserve.includes(aspecto)) return 'preserve';
  if (requisitos.mayChange?.includes(aspecto)) return 'may_change';
  return 'unspecified';
};

/* ── ¿Hay alguien capaz de cumplir esto? ──────────────────────────────────── */

/**
 * LO QUE UNA IMPLEMENTACIÓN DECLARA QUE SABE CONSERVAR.
 *
 * Y fíjate en que esto ENTRA, no se calcula. Quién sabe conservar un rostro lo
 * sabe su adaptador, y quién sabe conservar una fachada lo sabrá otro: el
 * catálogo lo recoge y lo pasa. Si este archivo tuviera una tabla de
 * proveedores, el Core habría dejado de ser agnóstico esa misma tarde.
 *
 * La lista es de lo que SÍ. Lo que no esté, no se sabe conservar — y no saberlo
 * es exactamente el caso que hay que atrapar antes de gastar dinero.
 */
export interface ContinuitySupport {
  preserves: readonly ContinuityAspect[];
}

/**
 * POR QUÉ NO SE PUEDE NI EMPEZAR.
 *
 * Hoy uno solo, y tiene nombre propio para que no se confunda con un fallo de
 * validación. Son dos cosas distintas y llegan en momentos distintos:
 *
 *   PRE_EXECUTION_REJECTED   nadie sabe hacer esto. No hay trabajo, no hay
 *                            llamada al proveedor y no hay cobro.
 *   verdict `fail`           se hizo, se pagó, y el resultado no conserva lo
 *                            que se exigía.
 *
 * Confundirlas sería cobrar por algo que se sabía imposible desde el principio,
 * o dar por imposible algo que solo salió mal una vez.
 */
export type MotivoDeRechazoPrevio = 'unsupported_aspect';

export interface RechazoPrevio {
  status: 'pre_execution_rejected';
  reason: MotivoDeRechazoPrevio;
  /** Qué se exigía y nadie declara saber hacer. Concreto, para poder decirlo. */
  missing: readonly ContinuityAspect[];
}

export type RevisionPrevia = { ok: true } | RechazoPrevio;

/**
 * QUÉ SE EXIGE QUE NADIE SABE HACER. Pura, y solo mira `preserve`.
 *
 * Lo liberado no se comprueba —da igual si se sabe conservar algo que se
 * autorizó a cambiar— y lo que nadie mencionó tampoco: un requisito no dicho no
 * puede hacer fracasar una ruta.
 */
export const aspectosSinCubrir = (
  requisitos: ContinuityRequirements | undefined,
  soporte: ContinuitySupport | undefined,
): readonly ContinuityAspect[] => {
  const exigidos = requisitos?.preserve ?? [];
  if (exigidos.length === 0) return Object.freeze([]);
  const sabe = new Set(soporte?.preserves ?? []);
  return Object.freeze(exigidos.filter((a) => !sabe.has(a)));
};

export const puedeCumplir = (
  requisitos: ContinuityRequirements | undefined,
  soporte: ContinuitySupport | undefined,
): boolean => aspectosSinCubrir(requisitos, soporte).length === 0;

/**
 * ANTES DE CREAR NADA. La comprobación que evita pagar por lo imposible.
 *
 * Sin requisitos no hay nada que comprobar y pasa: la continuidad es opcional y
 * quien no la pide sigue funcionando exactamente igual que antes.
 *
 * ── Por qué `strength` no cambia esto ───────────────────────────────────────
 *
 * Porque `strength` dice cuánto hay que apretar, no si hace falta. Un
 * `relaxed` sobre un aspecto que NADIE sabe conservar sigue siendo una promesa
 * que no se puede cumplir, y aflojarla no la convierte en cumplible: la
 * convierte en una promesa floja que tampoco se cumple. Quien quiera que algo
 * sea opcional lo pone en `mayChange`, que es el campo que existe para eso.
 */
export const revisarAntesDeEjecutar = (
  requisitos: ContinuityRequirements | undefined,
  soporte: ContinuitySupport | undefined,
): RevisionPrevia => {
  const faltan = aspectosSinCubrir(requisitos, soporte);
  if (faltan.length === 0) return { ok: true };
  return Object.freeze({ status: 'pre_execution_rejected', reason: 'unsupported_aspect', missing: faltan });
};

/* ── El veredicto ─────────────────────────────────────────────────────────── */

/**
 * CÓMO QUEDÓ UN ASPECTO. Cuatro estados y ningún número.
 *
 *   pass     se comprobó y se conserva.
 *   warn     se comprobó, hay una diferencia, y no es de las que rompen.
 *   fail     se comprobó y NO se conserva.
 *   unknown  no se pudo comprobar, o nadie dijo que hiciera falta.
 */
export type ContinuityStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export const ESTADOS_DE_CONTINUIDAD: readonly ContinuityStatus[] = Object.freeze([
  'pass', 'warn', 'fail', 'unknown',
] as const);

/**
 * CUÁNTO SE FÍA quien lo comprobó. Opcional, y ausente significa que no se sabe.
 *
 * No se inventa: un validador que no puede decir esto no lo dice, y entonces no
 * está. Poner `high` por defecto sería fabricar una certeza que nadie tiene.
 */
export type ContinuityConfidence = 'low' | 'medium' | 'high';

export const CONFIANZAS_DE_CONTINUIDAD: readonly ContinuityConfidence[] = Object.freeze([
  'low', 'medium', 'high',
] as const);

/** Por qué un aspecto quedó como quedó. Un literal del Core, nunca una frase de nadie. */
export type MotivoDeVeredicto =
  | 'not_required'
  | 'not_checked'
  | 'validator_unavailable'
  | 'reference_unavailable'
  | 'matches_reference'
  | 'differs_from_reference'
  | 'change_allowed'
  | 'inconclusive';

export interface VeredictoDeAspecto {
  aspect: ContinuityAspect;
  status: ContinuityStatus;
  /** Solo cuando quien comprobó puede decirlo de verdad. */
  confidence?: ContinuityConfidence;
  reason?: MotivoDeVeredicto;
}

/**
 * EL VEREDICTO DE UNA GENERACIÓN. Por aspecto, y con un resumen derivado.
 *
 * El resumen NO es una media: sale de la regla de `resumirVeredicto`, que mira
 * únicamente lo que se EXIGIÓ. Un `fail` en algo que nadie pidió conservar no
 * puede tumbar un resultado por el que ya se pagó.
 *
 * Y este contrato NO decide nada. Dice cómo quedó. Quién rehace un plano, y
 * cuándo, es una decisión de producto que se toma más arriba y con una persona
 * mirando si hace falta.
 */
export interface ContinuityVerdict {
  contract: typeof CONTINUITY_CONTRACT_VERSION;
  /** Derivado de `aspects` con `resumirVeredicto`. Se guarda para poder leerlo sin recalcular. */
  status: ContinuityStatus;
  aspects: readonly VeredictoDeAspecto[];
  /** Cuándo se emitió. Lo pone quien valida; el Core no lee el reloj. */
  validatedAt: number;
}

/**
 * DE LOS ASPECTOS AL RESUMEN. Pura, y con el orden de gravedad explícito.
 *
 *   1 · un `fail` en algo EXIGIDO            → fail
 *   2 · un `unknown` en algo EXIGIDO         → unknown   (jamás pass)
 *   3 · un aspecto EXIGIDO sin veredicto     → unknown   (no comprobar no es aprobar)
 *   4 · un `warn` en algo exigido            → warn
 *   5 · todo lo exigido en `pass`            → pass
 *
 * Lo que está en `mayChange` no puede tumbar nada: se dijo que podía cambiar, y
 * que cambie es exactamente lo que se autorizó. Lo `unspecified` tampoco
 * decide, pero sí se conserva en la lista para que se vea que estaba ahí.
 */
export const resumirVeredicto = (
  requisitos: ContinuityRequirements | undefined,
  aspectos: readonly VeredictoDeAspecto[],
): ContinuityStatus => {
  const exigidos = requisitos?.preserve ?? [];
  if (exigidos.length === 0) return 'unknown';

  const porAspecto = new Map<ContinuityAspect, ContinuityStatus>();
  for (const a of aspectos) if (!porAspecto.has(a.aspect)) porAspecto.set(a.aspect, a.status);

  let hayAviso = false;
  let hayDesconocido = false;
  for (const aspecto of exigidos) {
    const estado = porAspecto.get(aspecto);
    if (estado === 'fail') return 'fail';
    if (estado === undefined || estado === 'unknown') { hayDesconocido = true; continue; }
    if (estado === 'warn') hayAviso = true;
  }
  if (hayDesconocido) return 'unknown';
  return hayAviso ? 'warn' : 'pass';
};

/**
 * ¿ESTE ASPECTO ROMPE LA CONTINUIDAD?
 *
 * Solo si se EXIGIÓ conservarlo y no se conservó. Lo mismo en un aspecto
 * liberado es el comportamiento pedido, no un fallo, y decirlo aquí evita que
 * cada lector tenga que recordar la regla.
 */
export const rompeLaContinuidad = (
  requisitos: ContinuityRequirements | undefined,
  veredicto: VeredictoDeAspecto,
): boolean =>
  exigenciaDe(requisitos, veredicto.aspect) === 'preserve' && veredicto.status === 'fail';

/* ── Validación del veredicto ─────────────────────────────────────────────── */

const CAMPOS_DE_VEREDICTO: readonly string[] = ['contract', 'status', 'aspects', 'validatedAt'];
const CAMPOS_DE_ASPECTO: readonly string[] = ['aspect', 'status', 'confidence', 'reason'];

const MOTIVOS: readonly MotivoDeVeredicto[] = Object.freeze([
  'not_required', 'not_checked', 'validator_unavailable', 'reference_unavailable',
  'matches_reference', 'differs_from_reference', 'change_allowed', 'inconclusive',
] as const);

export const validarVeredicto = (crudo: unknown): readonly ProblemaDeContinuidad[] => {
  if (!esObjeto(crudo)) return [mal('verdict', 'invalid_shape')];
  const d = crudo;
  const p: ProblemaDeContinuidad[] = [];

  for (const clave of Object.keys(d)) {
    if (PELIGROSAS.includes(clave)) { p.push(mal(clave, 'dangerous_key')); continue; }
    if (claveProhibidaDeContinuidad(clave)) { p.push(mal(clave, 'forbidden_key')); continue; }
    if (!CAMPOS_DE_VEREDICTO.includes(clave)) p.push(mal(clave, 'unknown_field'));
  }
  for (const campo of CAMPOS_DE_VEREDICTO) if (!propia(d, campo)) p.push(mal(campo, 'invalid_shape'));

  if (d.contract !== CONTINUITY_CONTRACT_VERSION) p.push(mal('contract', 'invalid_shape'));
  if (!esTxt(d.status) || !(ESTADOS_DE_CONTINUIDAD as readonly string[]).includes(d.status)) {
    p.push(mal('status', 'invalid_shape'));
  }
  if (!esNum(d.validatedAt) || d.validatedAt < 0) p.push(mal('validatedAt', 'invalid_shape'));

  if (!Array.isArray(d.aspects)) p.push(mal('aspects', 'invalid_shape'));
  else {
    if (d.aspects.length > MAX_ASPECTOS_POR_LISTA) p.push(mal('aspects', 'too_many'));
    const vistos = new Set<string>();
    for (let i = 0; i < d.aspects.length; i++) {
      const a: unknown = d.aspects[i];
      const campo = `aspects[${i}]`;
      if (!esObjeto(a)) { p.push(mal(campo, 'invalid_shape')); continue; }
      if (Object.keys(a).some((k) => !CAMPOS_DE_ASPECTO.includes(k))) { p.push(mal(campo, 'unknown_field')); continue; }
      if (!esAspectoDeContinuidad(a.aspect)) { p.push(mal(campo, 'invalid_aspect')); continue; }
      if (vistos.has(a.aspect)) { p.push(mal(campo, 'duplicate_aspect')); continue; }
      vistos.add(a.aspect);
      if (!esTxt(a.status) || !(ESTADOS_DE_CONTINUIDAD as readonly string[]).includes(a.status)) p.push(mal(campo, 'invalid_shape'));
      if (a.confidence !== undefined
        && !(esTxt(a.confidence) && (CONFIANZAS_DE_CONTINUIDAD as readonly string[]).includes(a.confidence))) {
        p.push(mal(campo, 'invalid_shape'));
      }
      if (a.reason !== undefined && !(esTxt(a.reason) && (MOTIVOS as readonly string[]).includes(a.reason))) {
        p.push(mal(campo, 'invalid_shape'));
      }
    }
  }

  return Object.freeze(p);
};

export const veredictoValido = (crudo: unknown): crudo is ContinuityVerdict =>
  validarVeredicto(crudo).length === 0;
