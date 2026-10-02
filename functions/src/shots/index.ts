import { Firestore, getFirestore } from 'firebase-admin/firestore';
import {
  ContinuityRequirements,
  ElementBinding,
  MAX_ELEMENTOS_EN_RESULTADO,
  SHOT_CONTRACT_VERSION,
  SceneNode,
  ShotNode,
  ShotState,
  escenaValida,
  planoValido,
  puedePasarDePlano,
  referenciasDelPlano,
  validarEscena,
  validarPlano,
} from '../core';
import { leerMaterial } from '../content';
import { leerElemento } from '../elements';
import type { Element } from '../core';
import type { ProblemaDeNodo } from '../core';

/**
 * WEË SCENES & SHOTS — EL ESTADO CREATIVO, GUARDADO.
 *
 * ── Qué se guarda aquí, y qué NO ────────────────────────────────────────────
 *
 * Un plano dice QUÉ TIENE QUE REPRESENTAR y QUÉ MATERIAL lo representa hoy. Y
 * se acaba ahí. Cómo se ejecutó —qué proveedor, qué modelo, cuántos intentos,
 * cuánto costó— es del Job, del Attempt y de la procedencia del material, que
 * ya lo llevan y lo llevan bien.
 *
 *     ShotNode     estado creativo.     «aquí va Luna v4 con el traje v2».
 *     Job          ejecución.           «se intentó dos veces y la segunda salió».
 *     Asset        el resultado.        los bytes, su dueño y de dónde vienen.
 *
 * Confundirlos sería tener dos verdades sobre lo mismo, y la de aquí se
 * quedaría desfasada en cuanto un proceso muriera a media frase.
 *
 * ── De quién es ─────────────────────────────────────────────────────────────
 *
 * DE LA CUENTA, y se comprueba EN EL DOMINIO, una por una. Este código corre
 * con el Admin SDK y se salta las reglas de Firestore, así que «las reglas ya
 * lo cubren» aquí no significa nada: las reglas son la segunda cerradura, no la
 * única. Lo de otra cuenta se comporta como INEXISTENTE —`null`, igual que si
 * no estuviera— porque distinguir las dos respuestas convertiría probar ids en
 * una forma de averiguar qué tiene otra persona.
 *
 * ── Toda lectura es acotada ─────────────────────────────────────────────────
 *
 * No hay ninguna consulta sin `ownerAccountId` y sin `limit`. Ni una. Recuperar
 * el contexto de un plano NO carga el proyecto, ni la escena entera, ni el
 * historial: carga el plano, su escena, el plano anterior y —como mucho— los
 * elementos que ese plano nombra. Los topes de los elementos son los que ya
 * fijó el Contexto Visual; aquí no se inventa un segundo sistema de límites.
 *
 * ── Lo que este archivo NO es ───────────────────────────────────────────────
 *
 * No es un Project Engine, ni un Workflow, ni un Job Engine, ni un Orchestrator,
 * ni un Router, ni un segundo registro de materiales, ni un grafo. Es un
 * almacén de dos colecciones con las comprobaciones de su contrato.
 */

export const COLECCION_DE_ESCENAS = 'scenes';
export const COLECCION_DE_PLANOS = 'shots';

/**
 * CUÁNTO SE MIRA COMO MUCHO.
 *
 * Viven aquí y no en el contrato porque son una decisión de LECTURA, no de
 * forma: cuántas filas cuesta una pregunta. Es el mismo sitio donde vive
 * `MAX_ITEMS_DE_PROYECTO` y por el mismo motivo.
 */
export const MAX_PLANOS_POR_ESCENA = 100;
export const MAX_ESCENAS_POR_PROYECTO = 50;

/* ── Lo que esto necesita del mundo ───────────────────────────────────────── */

export interface FichaDeElemento {
  elementId: string;
  ownerAccountId: string;
  version: number;
  status: string;
}

export interface LectorDeElementos {
  (accountId: string, elementId: string): Promise<FichaDeElemento | null>;
}

export interface FichaDeAsset {
  assetId: string;
  ownerAccountId: string;
  status: string;
  /** La clase del material. Solo la mira quien exige una: el resultado de un plano es un vídeo. */
  kind?: string;
}

export interface LectorDeAssets {
  (assetId: string): Promise<FichaDeAsset | null>;
}

export interface DepsDePlanos {
  db?: Firestore;
  elemento?: LectorDeElementos;
  asset?: LectorDeAssets;
}

const laBase = (deps: DepsDePlanos = {}): Firestore => deps.db ?? getFirestore();
const escenas = (deps: DepsDePlanos = {}) => laBase(deps).collection(COLECCION_DE_ESCENAS);
const planos = (deps: DepsDePlanos = {}) => laBase(deps).collection(COLECCION_DE_PLANOS);

/** Por defecto, el registro de Elements de S4. Ni una segunda lectura, ni una segunda verdad. */
const elementoPorDefecto: LectorDeElementos = async (accountId, elementId) => {
  const e: Element | null = await leerElemento(accountId, elementId);
  return e ? { elementId: e.elementId, ownerAccountId: e.ownerAccountId, version: e.version, status: e.status } : null;
};

/** Y por defecto, el Content Core de F11 para los materiales. */
const assetPorDefecto: LectorDeAssets = async (assetId) => {
  const a = await leerMaterial(assetId);
  return a ? { assetId: a.assetId, ownerAccountId: a.ownerAccountId, status: a.status, kind: a.kind } : null;
};

/* Firestore no admite `undefined`. Mismo apaño que `elements/index.ts`, y por lo mismo. */
const limpiar = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, v]) => v !== undefined)) as T;

/**
 * EL DOCUMENTO ES EL CONTRATO. No hay `SceneDoc`, ni `ShotDoc`, ni mapper.
 *
 * Lo que se guarda es un `SceneNode` o un `ShotNode`, y lo que se lee se valida
 * con el MISMO validador del Core antes de devolverlo: una fila puede haberse
 * escrito mal, y una segunda representación sería una segunda verdad que
 * alguien tendría que mantener sincronizada.
 */
export type EscenaGuardada = SceneNode;
export type PlanoGuardado = ShotNode;

/* ── Por qué se rechaza una referencia ────────────────────────────────────── */

export type MotivoDeReferencia =
  /* No existe, o es de otra cuenta. Se contestan igual a propósito. */
  | 'no_encontrado'
  /* Existe, es tuyo, pero no está en un estado en el que se pueda usar. */
  | 'no_utilizable'
  /* Se ancló una versión que todavía no ha ocurrido. */
  | 'version_futura';

export interface ReferenciaRechazada {
  /** Qué clase de cosa se rechazó, para que quien llame sepa dónde mirar. */
  tipo: 'element' | 'asset' | 'scene' | 'shot';
  id: string;
  motivo: MotivoDeReferencia;
}

/**
 * ¿SE PUEDE APUNTAR A ESTO?
 *
 * Tres preguntas y en este orden: que exista y sea tuyo, que se pueda usar, y
 * —en un elemento— que la versión anclada haya existido alguna vez. Anclar la
 * v7 de algo que va por la v4 no es un detalle: es prometer conservar algo que
 * nadie ha creado todavía.
 *
 * Anclar una versión VIEJA sí vale, y es justo para lo que existe el campo:
 * «usa la Luna del capítulo anterior» es exactamente eso.
 */
const revisarElementos = async (
  accountId: string,
  bindings: readonly ElementBinding[],
  deps: DepsDePlanos,
): Promise<ReferenciaRechazada | undefined> => {
  const leer = deps.elemento ?? elementoPorDefecto;
  for (const b of bindings) {
    const ficha = await leer(accountId, b.elementId);
    if (!ficha || ficha.ownerAccountId !== accountId) return { tipo: 'element', id: b.elementId, motivo: 'no_encontrado' };
    if (ficha.status !== 'active') return { tipo: 'element', id: b.elementId, motivo: 'no_utilizable' };
    if (b.version > ficha.version) return { tipo: 'element', id: b.elementId, motivo: 'version_futura' };
  }
  return undefined;
};

const revisarAsset = async (
  accountId: string,
  assetId: string,
  deps: DepsDePlanos,
): Promise<ReferenciaRechazada | undefined> => {
  const leer = deps.asset ?? assetPorDefecto;
  const ficha = await leer(assetId);
  if (!ficha || ficha.ownerAccountId !== accountId) return { tipo: 'asset', id: assetId, motivo: 'no_encontrado' };
  if (ficha.status !== 'ready') return { tipo: 'asset', id: assetId, motivo: 'no_utilizable' };
  return undefined;
};

/* ── Escenas ──────────────────────────────────────────────────────────────── */

export interface NuevaEscena {
  /** LA CUENTA, ya resuelta desde la sesión. Nunca lo que mande el cliente. */
  accountId: string;
  /** El id, ESTABLE y elegido por quien crea: crear dos veces no crea dos cosas. */
  sceneId: string;
  projectId: string;
  order: number;
  name?: string;
  location?: ElementBinding;
  elements?: readonly ElementBinding[];
  creative?: SceneNode['creative'];
  narrative?: string;
  createdByEntityId?: string;
  at: number;
}

export type ResultadoDeEscena =
  | { status: 'creado'; scene: SceneNode }
  | { status: 'ya_existe'; scene: SceneNode }
  | { status: 'invalido'; problemas: readonly ProblemaDeNodo[] }
  | { status: 'referencia_rechazada'; referencia: ReferenciaRechazada };

export const crearEscena = async (datos: NuevaEscena, deps: DepsDePlanos = {}): Promise<ResultadoDeEscena> => {
  const scene: SceneNode = limpiar({
    contract: SHOT_CONTRACT_VERSION,
    sceneId: datos.sceneId,
    projectId: datos.projectId,
    ownerAccountId: datos.accountId,
    createdByEntityId: datos.createdByEntityId,
    version: 1,
    order: datos.order,
    name: datos.name,
    location: datos.location,
    elements: datos.elements ? [...datos.elements] : undefined,
    creative: datos.creative,
    narrative: datos.narrative,
    createdAt: datos.at,
    updatedAt: datos.at,
  });

  const problemas = validarEscena(scene);
  if (problemas.length) return { status: 'invalido', problemas };

  const aRevisar = [...(scene.elements ?? []), ...(scene.location ? [scene.location] : [])];
  const rechazo = await revisarElementos(datos.accountId, aRevisar, deps);
  if (rechazo) return { status: 'referencia_rechazada', referencia: rechazo };

  try {
    await escenas(deps).doc(scene.sceneId).create(scene);
    return { status: 'creado', scene };
  } catch {
    /* Ya estaba. Se devuelve LA QUE HAY, y solo si es de esta cuenta. */
    const ya = await leerEscena(datos.accountId, scene.sceneId, deps);
    return ya ? { status: 'ya_existe', scene: ya } : { status: 'invalido', problemas: [{ field: 'sceneId', reason: 'invalid_id' }] };
  }
};

/**
 * UNA ESCENA, SI ES TUYA. Y si no, `null` — lo mismo que si no existiera.
 */
export const leerEscena = async (
  accountId: string,
  sceneId: string,
  deps: DepsDePlanos = {},
): Promise<SceneNode | null> => {
  if (typeof sceneId !== 'string' || typeof accountId !== 'string' || !accountId) return null;
  const snap = await escenas(deps).doc(sceneId).get();
  if (!snap.exists) return null;
  const dato = snap.data();
  if (!escenaValida(dato) || dato.ownerAccountId !== accountId) return null;
  return dato;
};

/**
 * LAS ESCENAS DE UN PROYECTO, en orden y con tope.
 *
 *   where ownerAccountId ==   de quién. Primero, y no negociable.
 *   where projectId ==        de cuál.
 *   orderBy order · limit     acotada siempre.
 */
export const escenasDelProyecto = async (
  consulta: { accountId: string; projectId: string; limit?: number },
  deps: DepsDePlanos = {},
): Promise<readonly SceneNode[]> => {
  if (!consulta.accountId || !consulta.projectId) return Object.freeze([]);
  const tope = Math.max(1, Math.min(consulta.limit ?? MAX_ESCENAS_POR_PROYECTO, MAX_ESCENAS_POR_PROYECTO));
  const snap = await escenas(deps)
    .where('ownerAccountId', '==', consulta.accountId)
    .where('projectId', '==', consulta.projectId)
    .orderBy('order')
    .limit(tope)
    .get();
  return Object.freeze(snap.docs.map((d) => d.data()).filter((d): d is SceneNode => escenaValida(d)));
};

/* ── Planos ───────────────────────────────────────────────────────────────── */

export interface NuevoPlano {
  accountId: string;
  shotId: string;
  projectId: string;
  order: number;
  sceneId?: string;
  previousShotId?: string;
  dependsOnShotIds?: readonly string[];
  elements?: readonly ElementBinding[];
  creative?: ShotNode['creative'];
  continuity?: ContinuityRequirements;
  narrative?: string;
  createdByEntityId?: string;
  at: number;
}

export type ResultadoDePlano =
  | { status: 'creado'; shot: ShotNode }
  | { status: 'ya_existe'; shot: ShotNode }
  | { status: 'invalido'; problemas: readonly ProblemaDeNodo[] }
  | { status: 'referencia_rechazada'; referencia: ReferenciaRechazada };

/**
 * UN PLANO NUEVO. Nace en `draft`: todavía no se le puede pedir nada.
 *
 * Antes de escribir se comprueba TODO lo que apunta hacia fuera: la escena, el
 * plano del que continúa, aquellos de los que depende y cada elemento con su
 * versión. Un plano que apunta a algo que no está es una cadena rota, y las
 * cadenas rotas se notan tarde.
 */
export const crearPlano = async (datos: NuevoPlano, deps: DepsDePlanos = {}): Promise<ResultadoDePlano> => {
  const shot: ShotNode = limpiar({
    contract: SHOT_CONTRACT_VERSION,
    shotId: datos.shotId,
    projectId: datos.projectId,
    ownerAccountId: datos.accountId,
    createdByEntityId: datos.createdByEntityId,
    version: 1,
    order: datos.order,
    state: 'draft' as ShotState,
    sceneId: datos.sceneId,
    previousShotId: datos.previousShotId,
    dependsOnShotIds: datos.dependsOnShotIds ? [...datos.dependsOnShotIds] : undefined,
    elements: datos.elements ? [...datos.elements] : undefined,
    creative: datos.creative,
    continuity: datos.continuity,
    narrative: datos.narrative,
    createdAt: datos.at,
    updatedAt: datos.at,
  });

  const problemas = validarPlano(shot);
  if (problemas.length) return { status: 'invalido', problemas };

  const fuera = await revisarVecinos(datos.accountId, shot, deps);
  if (fuera) return { status: 'referencia_rechazada', referencia: fuera };

  try {
    await planos(deps).doc(shot.shotId).create(shot);
    return { status: 'creado', shot };
  } catch {
    const ya = await leerPlano(datos.accountId, shot.shotId, deps);
    return ya ? { status: 'ya_existe', shot: ya } : { status: 'invalido', problemas: [{ field: 'shotId', reason: 'invalid_id' }] };
  }
};

/** La escena, el anterior, las dependencias y los elementos. Todo, y todo de la cuenta. */
const revisarVecinos = async (
  accountId: string,
  shot: ShotNode,
  deps: DepsDePlanos,
): Promise<ReferenciaRechazada | undefined> => {
  if (shot.sceneId !== undefined && !(await leerEscena(accountId, shot.sceneId, deps))) {
    return { tipo: 'scene', id: shot.sceneId, motivo: 'no_encontrado' };
  }
  for (const id of [...(shot.previousShotId ? [shot.previousShotId] : []), ...(shot.dependsOnShotIds ?? [])]) {
    if (!(await leerPlano(accountId, id, deps))) return { tipo: 'shot', id, motivo: 'no_encontrado' };
  }
  return revisarElementos(accountId, shot.elements ?? [], deps);
};

export const leerPlano = async (
  accountId: string,
  shotId: string,
  deps: DepsDePlanos = {},
): Promise<ShotNode | null> => {
  if (typeof shotId !== 'string' || typeof accountId !== 'string' || !accountId) return null;
  const snap = await planos(deps).doc(shotId).get();
  if (!snap.exists) return null;
  const dato = snap.data();
  if (!planoValido(dato) || dato.ownerAccountId !== accountId) return null;
  return dato;
};

/**
 * LOS PLANOS DE UNA ESCENA, en orden y con tope.
 *
 * Esta es la consulta que reconstruye la secuencia, y por eso ordena por
 * `order` y no por fecha: una escena es una lista, no un historial.
 */
export const planosDeLaEscena = async (
  consulta: { accountId: string; sceneId: string; limit?: number },
  deps: DepsDePlanos = {},
): Promise<readonly ShotNode[]> => {
  if (!consulta.accountId || !consulta.sceneId) return Object.freeze([]);
  const tope = Math.max(1, Math.min(consulta.limit ?? MAX_PLANOS_POR_ESCENA, MAX_PLANOS_POR_ESCENA));
  const snap = await planos(deps)
    .where('ownerAccountId', '==', consulta.accountId)
    .where('sceneId', '==', consulta.sceneId)
    .orderBy('order')
    .limit(tope)
    .get();
  return Object.freeze(snap.docs.map((d) => d.data()).filter((d): d is ShotNode => planoValido(d)));
};

/**
 * QUIÉN DEPENDE DE ESTE PLANO. Acotada, y solo para poder AVISAR.
 *
 * Existe para que alguien pueda decir «esto que acabas de cambiar afecta a
 * otros dos». NO propaga nada: marcar obsoleto es una llamada aparte y con
 * intención, porque rehacer vídeos ya pagados sin que nadie lo pida es la clase
 * de automatismo que se añade tarde y a propósito.
 */
export const planosQueDependenDe = async (
  consulta: { accountId: string; shotId: string; limit?: number },
  deps: DepsDePlanos = {},
): Promise<readonly ShotNode[]> => {
  if (!consulta.accountId || !consulta.shotId) return Object.freeze([]);
  const tope = Math.max(1, Math.min(consulta.limit ?? MAX_PLANOS_POR_ESCENA, MAX_PLANOS_POR_ESCENA));
  const snap = await planos(deps)
    .where('ownerAccountId', '==', consulta.accountId)
    .where('dependsOnShotIds', 'array-contains', consulta.shotId)
    .limit(tope)
    .get();
  return Object.freeze(snap.docs.map((d) => d.data()).filter((d): d is ShotNode => planoValido(d)));
};

/* ── Cambiar, sin romper lo que no se puede romper ────────────────────────── */

/**
 * LO QUE NUNCA CAMBIA DE UN NODO YA CREADO.
 *
 * La cuenta, el proyecto, el identificador, el contrato y cuándo nació. Un
 * `update` que pudiera mover la cuenta sería una forma de regalarle un plano a
 * otra persona, y no hay ninguna razón legítima para mover las otras cuatro.
 */
export interface CambiosDePlano {
  state?: ShotState;
  order?: number;
  sceneId?: string;
  previousShotId?: string;
  dependsOnShotIds?: readonly string[];
  elements?: readonly ElementBinding[];
  creative?: ShotNode['creative'];
  continuity?: ContinuityRequirements;
  narrative?: string;
  producedAssetId?: string;
  verdict?: ShotNode['verdict'];
  at: number;
}

export type ResultadoDeCambio =
  | { status: 'actualizado'; shot: ShotNode }
  | { status: 'no_encontrado' }
  | { status: 'transicion_invalida'; de: ShotState; a: ShotState }
  | { status: 'invalido'; problemas: readonly ProblemaDeNodo[] }
  | { status: 'referencia_rechazada'; referencia: ReferenciaRechazada };

/**
 * CAMBIAR UN PLANO. Con la versión subiendo y la transición comprobada.
 *
 * `version` sube SIEMPRE que algo cambia, y es lo que permite saber después qué
 * estado del plano produjo qué material. No hay un servicio de versiones: es un
 * entero en el documento, que es todo lo que hace falta.
 */
export const actualizarPlano = async (
  accountId: string,
  shotId: string,
  cambios: CambiosDePlano,
  deps: DepsDePlanos = {},
): Promise<ResultadoDeCambio> => {
  const actual = await leerPlano(accountId, shotId, deps);
  if (!actual) return { status: 'no_encontrado' };

  if (cambios.state !== undefined && cambios.state !== actual.state
    && !puedePasarDePlano(actual.state, cambios.state)) {
    return { status: 'transicion_invalida', de: actual.state, a: cambios.state };
  }

  const siguiente: ShotNode = limpiar({
    ...actual,
    ...(cambios.state !== undefined ? { state: cambios.state } : {}),
    ...(cambios.order !== undefined ? { order: cambios.order } : {}),
    ...(cambios.sceneId !== undefined ? { sceneId: cambios.sceneId } : {}),
    ...(cambios.previousShotId !== undefined ? { previousShotId: cambios.previousShotId } : {}),
    ...(cambios.dependsOnShotIds !== undefined ? { dependsOnShotIds: [...cambios.dependsOnShotIds] } : {}),
    ...(cambios.elements !== undefined ? { elements: [...cambios.elements] } : {}),
    ...(cambios.creative !== undefined ? { creative: cambios.creative } : {}),
    ...(cambios.continuity !== undefined ? { continuity: cambios.continuity } : {}),
    ...(cambios.narrative !== undefined ? { narrative: cambios.narrative } : {}),
    ...(cambios.producedAssetId !== undefined ? { producedAssetId: cambios.producedAssetId } : {}),
    ...(cambios.verdict !== undefined ? { verdict: cambios.verdict } : {}),
    version: Math.min(actual.version + 1, 9999),
    updatedAt: cambios.at,
    ...(cambios.state === 'archived' ? { archivedAt: cambios.at } : {}),
  });

  const problemas = validarPlano(siguiente);
  if (problemas.length) return { status: 'invalido', problemas };

  const fuera = await revisarVecinos(accountId, siguiente, deps);
  if (fuera) return { status: 'referencia_rechazada', referencia: fuera };
  if (siguiente.producedAssetId !== undefined && siguiente.producedAssetId !== actual.producedAssetId) {
    const malAsset = await revisarAsset(accountId, siguiente.producedAssetId, deps);
    if (malAsset) return { status: 'referencia_rechazada', referencia: malAsset };
  }

  await planos(deps).doc(shotId).set(siguiente);
  return { status: 'actualizado', shot: siguiente };
};

export type ResultadoDeFijado =
  | { status: 'fijado' | 'ya_estaba'; shot: ShotNode }
  | { status: 'no_encontrado' }
  | { status: 'version_distinta'; actual: number }
  | { status: 'transicion_invalida'; de: ShotState }
  | { status: 'referencia_rechazada'; referencia: ReferenciaRechazada }
  | { status: 'invalido'; problemas: readonly ProblemaDeNodo[] };

/**
 * FIJAR EL RESULTADO DE UN PLANO, YA VERIFICADO. La única escritura de
 * `producedAssetId` que no pasa por `actualizarPlano`, y la hace en UNA
 * transacción: se lee el plano, se compara su versión con la que vio quien lo
 * pide —si la manda— y se escribe o no se escribe nada.
 *
 * «Verificado» quiere decir que quien llama ya comprobó que ese material nació
 * de la generación de ESTE plano (Filmmaker lo hace en `creator/toma.ts`). Aquí
 * se comprueba lo que es de este archivo: que el plano es de la cuenta, que no
 * está archivado, que el material es suyo, está listo y es un VÍDEO, y que el
 * plano puede llegar a `generated` —desde `ready`, o pasando por `ready` desde
 * un borrador, un resultado anterior, uno validado o uno desactualizado—.
 */
export const fijarResultadoVerificado = async (
  accountId: string,
  shotId: string,
  datos: { assetId: string; expectedVersion?: number; at: number },
  deps: DepsDePlanos = {},
): Promise<ResultadoDeFijado> => {
  const leer = deps.asset ?? assetPorDefecto;
  const ficha = await leer(datos.assetId);
  if (!ficha || ficha.ownerAccountId !== accountId) {
    return { status: 'referencia_rechazada', referencia: { tipo: 'asset', id: datos.assetId, motivo: 'no_encontrado' } };
  }
  if (ficha.status !== 'ready' || ficha.kind !== 'video') {
    return { status: 'referencia_rechazada', referencia: { tipo: 'asset', id: datos.assetId, motivo: 'no_utilizable' } };
  }
  const ref = planos(deps).doc(shotId);
  return laBase(deps).runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const actual = snap.exists ? snap.data() : undefined;
    if (!planoValido(actual) || actual.ownerAccountId !== accountId) return { status: 'no_encontrado' } as ResultadoDeFijado;
    if (datos.expectedVersion !== undefined && actual.version !== datos.expectedVersion) {
      return { status: 'version_distinta', actual: actual.version } as ResultadoDeFijado;
    }
    if (actual.producedAssetId === datos.assetId && actual.state === 'generated') return { status: 'ya_estaba', shot: actual } as ResultadoDeFijado;
    /* A `generated`, en uno o dos pasos, y los dos tienen que existir en la tabla del contrato. */
    const pasos: ShotState[] = actual.state === 'generated' ? [] : actual.state === 'ready' ? ['generated'] : ['ready', 'generated'];
    let desde: ShotState = actual.state;
    for (const a of pasos) {
      if (!puedePasarDePlano(desde, a)) return { status: 'transicion_invalida', de: actual.state } as ResultadoDeFijado;
      desde = a;
    }
    const siguiente: ShotNode = limpiar({
      ...actual,
      state: 'generated' as ShotState,
      producedAssetId: datos.assetId,
      version: Math.min(actual.version + 1, 9999),
      updatedAt: datos.at,
    });
    const problemas = validarPlano(siguiente);
    if (problemas.length) return { status: 'invalido', problemas } as ResultadoDeFijado;
    tx.set(ref, siguiente);
    return { status: 'fijado', shot: siguiente } as ResultadoDeFijado;
  });
};

/**
 * MARCAR UN PLANO COMO DESACTUALIZADO. Uno, con intención, y nada más.
 *
 * No hay propagación. Quien quiera marcar a los que dependen de este los pide
 * con `planosQueDependenDe` y decide. El resultado sigue existiendo, sigue
 * siendo de la persona y sigue estando pagado: `stale` no es un fallo, es una
 * nota que dice «esto ya no cuadra con lo de al lado».
 */
export const marcarPlanoObsoleto = async (
  accountId: string,
  shotId: string,
  at: number,
  deps: DepsDePlanos = {},
): Promise<ResultadoDeCambio> => actualizarPlano(accountId, shotId, { state: 'stale', at }, deps);

export interface CambiosDeEscena {
  order?: number;
  name?: string;
  location?: ElementBinding;
  elements?: readonly ElementBinding[];
  creative?: SceneNode['creative'];
  narrative?: string;
  at: number;
}

export type ResultadoDeCambioDeEscena =
  | { status: 'actualizado'; scene: SceneNode }
  | { status: 'no_encontrado' }
  | { status: 'invalido'; problemas: readonly ProblemaDeNodo[] }
  | { status: 'referencia_rechazada'; referencia: ReferenciaRechazada };

export const actualizarEscena = async (
  accountId: string,
  sceneId: string,
  cambios: CambiosDeEscena,
  deps: DepsDePlanos = {},
): Promise<ResultadoDeCambioDeEscena> => {
  const actual = await leerEscena(accountId, sceneId, deps);
  if (!actual) return { status: 'no_encontrado' };

  const siguiente: SceneNode = limpiar({
    ...actual,
    ...(cambios.order !== undefined ? { order: cambios.order } : {}),
    ...(cambios.name !== undefined ? { name: cambios.name } : {}),
    ...(cambios.location !== undefined ? { location: cambios.location } : {}),
    ...(cambios.elements !== undefined ? { elements: [...cambios.elements] } : {}),
    ...(cambios.creative !== undefined ? { creative: cambios.creative } : {}),
    ...(cambios.narrative !== undefined ? { narrative: cambios.narrative } : {}),
    version: Math.min(actual.version + 1, 9999),
    updatedAt: cambios.at,
  });

  const problemas = validarEscena(siguiente);
  if (problemas.length) return { status: 'invalido', problemas };

  const aRevisar = [...(siguiente.elements ?? []), ...(siguiente.location ? [siguiente.location] : [])];
  const rechazo = await revisarElementos(accountId, aRevisar, deps);
  if (rechazo) return { status: 'referencia_rechazada', referencia: rechazo };

  await escenas(deps).doc(sceneId).set(siguiente);
  return { status: 'actualizado', scene: siguiente };
};

/* ── El contexto de continuidad, acotado ──────────────────────────────────── */

/**
 * LO QUE UN PLANO NECESITA SABER DE SU ALREDEDOR. Y ni una fila más.
 *
 * Cuatro lecturas como mucho, más los elementos que el plano NOMBRA:
 *
 *   1 · el plano
 *   2 · su escena, si tiene
 *   3 · el plano del que continúa, si tiene
 *   4 · los elementos que nombran su reparto y sus anclajes, acotados
 *
 * NO se leen los demás planos de la escena. NO se lee el proyecto. NO se lee el
 * historial. Si un día hace falta la secuencia entera, se pide con
 * `planosDeLaEscena`, que también está acotada, y se pide a propósito.
 *
 * El tope de elementos es el del Contexto Visual, importado y no redefinido:
 * dos números distintos para «cuántas cosas caben en un contexto» acabarían
 * separándose sin que nadie se diera cuenta.
 */
export interface ContextoDeContinuidad {
  shot: ShotNode;
  scene?: SceneNode;
  previous?: ShotNode;
  /** Las fichas de los elementos que este plano nombra. Acotadas. */
  elements: readonly FichaDeElemento[];
  /** Los anclados que no se pudieron leer: no existen, no son tuyos o se archivaron. */
  missing: readonly string[];
  /** Se alcanzó el tope y hay más elementos nombrados de los que caben. */
  truncated: boolean;
  requirements?: ContinuityRequirements;
  producedAssetId?: string;
}

export const contextoDeContinuidad = async (
  consulta: { accountId: string; shotId: string; maxElements?: number },
  deps: DepsDePlanos = {},
): Promise<ContextoDeContinuidad | null> => {
  const shot = await leerPlano(consulta.accountId, consulta.shotId, deps);
  if (!shot) return null;

  const scene = shot.sceneId ? await leerEscena(consulta.accountId, shot.sceneId, deps) : null;
  const previous = shot.previousShotId ? await leerPlano(consulta.accountId, shot.previousShotId, deps) : null;

  const tope = Math.max(1, Math.min(consulta.maxElements ?? MAX_ELEMENTOS_EN_RESULTADO, MAX_ELEMENTOS_EN_RESULTADO));
  const nombrados = referenciasDelPlano(shot);
  const leer = deps.elemento ?? elementoPorDefecto;
  const elements: FichaDeElemento[] = [];
  const missing: string[] = [];
  for (const b of nombrados.slice(0, tope)) {
    const ficha = await leer(consulta.accountId, b.elementId);
    if (ficha && ficha.ownerAccountId === consulta.accountId) elements.push(ficha);
    else missing.push(b.elementId);
  }

  return Object.freeze({
    shot,
    ...(scene ? { scene } : {}),
    ...(previous ? { previous } : {}),
    elements: Object.freeze(elements),
    missing: Object.freeze(missing),
    truncated: nombrados.length > tope,
    ...(shot.continuity ? { requirements: shot.continuity } : {}),
    ...(shot.producedAssetId ? { producedAssetId: shot.producedAssetId } : {}),
  });
};
