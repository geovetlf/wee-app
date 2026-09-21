import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  ContinuityRequirements,
  ElementBinding,
  ShotState,
  anclajeValido,
  continuidadValida,
  esEstadoDePlano,
} from '../core';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import {
  actualizarEscena,
  actualizarPlano,
  contextoDeContinuidad,
  crearEscena,
  crearPlano,
  escenasDelProyecto,
  leerEscena,
  leerPlano,
  marcarPlanoObsoleto,
  planosDeLaEscena,
} from './index';
import { revisarPlanoGuardado } from './validacion';

/**
 * WEË SCENES & SHOTS — LA PUERTA. Y solo eso.
 *
 * ── Qué hace este archivo, y por qué es corto ───────────────────────────────
 *
 * Tres cosas: comprueba QUIÉN llama, resuelve DE QUÉ CUENTA puede actuar, y
 * delega en el runtime de C3. Ni una regla de negocio, ni una validación
 * repetida, ni una consulta propia. Es el mismo reparto que `elements/puerta`,
 * y lo es a propósito: dos puertas que se parecen se revisan igual.
 *
 * ── Lo que NO se acepta del cliente, nunca ──────────────────────────────────
 *
 * `ownerAccountId`. No está en este archivo, y no por descuido: la cuenta sale
 * de la sesión por `cuentaDelPrincipalEnWee` y de ningún otro sitio. Si el
 * cliente pudiera mandarla, mandarla sería suficiente para leer lo de otra
 * persona.
 *
 * Tampoco `providerId`, `modelId`, `storageRef`, `apiKey` ni un prompt: no
 * existen en un plano, así que no hay dónde ponerlos.
 *
 * ── Y una cosa que no hace ──────────────────────────────────────────────────
 *
 * NO genera nada. Un plano dice qué hay que representar; producirlo es del
 * conductor, del Job y del Gateway, que ya existen. Esta puerta solo guarda y
 * devuelve estado creativo.
 */

const REGION = 'us-central1';
const MAX_BINDINGS = 16;
const MAX_DEPENDENCIAS = 8;

const texto = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined;

const entero = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) ? v : undefined;

/**
 * LOS PUNTEROS QUE LLEGAN DE FUERA, con la forma justa.
 *
 * Que el elemento exista, sea tuyo y esté en esa versión lo comprueba el
 * runtime; aquí solo se mira que lo que llegó TENGA FORMA de puntero y que no
 * traiga nada más. Una clave de más no se filtra: no se copia.
 */
const punteros = (crudo: unknown): readonly ElementBinding[] | undefined => {
  if (crudo === undefined) return undefined;
  if (!Array.isArray(crudo) || crudo.length > MAX_BINDINGS) return undefined;
  const salida: ElementBinding[] = [];
  for (const b of crudo) {
    if (typeof b !== 'object' || b === null) return undefined;
    const { elementId, version } = b as Record<string, unknown>;
    const puntero = { elementId, version };
    if (!anclajeValido(puntero)) return undefined;
    salida.push(puntero as ElementBinding);
  }
  return salida;
};

const unPuntero = (crudo: unknown): ElementBinding | undefined => {
  if (crudo === undefined || typeof crudo !== 'object' || crudo === null) return undefined;
  const { elementId, version } = crudo as Record<string, unknown>;
  const puntero = { elementId, version };
  return anclajeValido(puntero) ? (puntero as ElementBinding) : undefined;
};

const requisitos = (crudo: unknown): ContinuityRequirements | undefined =>
  crudo !== undefined && continuidadValida(crudo) ? (crudo as ContinuityRequirements) : undefined;

const ids = (crudo: unknown): readonly string[] | undefined => {
  if (crudo === undefined) return undefined;
  if (!Array.isArray(crudo) || crudo.length > MAX_DEPENDENCIAS) return undefined;
  return crudo.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 128)
    ? (crudo as readonly string[])
    : undefined;
};

/**
 * ESCENAS Y PLANOS DE UNA CUENTA. Una puerta y sus operaciones.
 *
 * Va en UNA callable y no en nueve porque son la misma pregunta —«qué estado
 * creativo tengo guardado y cómo lo cambio»— y nueve puertas serían nueve
 * sitios donde repetir la resolución de cuenta. `op` elige, y lo que no está en
 * la lista no existe.
 *
 * Lo ajeno contesta `not-found`, igual que lo inexistente. Distinguirlos
 * convertiría probar identificadores en una forma de averiguar qué tiene otra
 * persona, y por eso las respuestas son la misma frase.
 */
export const shots = onCall({ region: REGION, timeoutSeconds: 30, memory: '256MiB' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const db = getFirestore();
  const at = Date.now();

  /* DE QUÉ CUENTA PUEDE ACTUAR. De la sesión, por la única puerta que hay. */
  const cuenta = await cuentaDelPrincipalEnWee(db, request.auth.uid);
  if (!cuenta) throw new HttpsError('permission-denied', 'No encontramos tu cuenta.');
  const accountId = cuenta.accountId;

  const data = (request.data || {}) as Record<string, unknown>;
  const op = String(data.op || '');
  const sceneId = texto(data.sceneId, 128);
  const shotId = texto(data.shotId, 128);
  const projectId = texto(data.projectId, 128);
  const order = entero(data.order);

  const noVale: () => never = () => { throw new HttpsError('invalid-argument', 'Faltan datos o no tienen forma válida.'); };
  const noEsta: () => never = () => { throw new HttpsError('not-found', 'No encontramos eso.'); };

  /* ── Escenas ──────────────────────────────────────────────────────────── */

  if (op === 'scene.create') {
    if (!sceneId || !projectId || order === undefined) noVale();
    const r = await crearEscena({
      accountId, sceneId: sceneId as string, projectId: projectId as string, order: order as number,
      ...(texto(data.name, 120) ? { name: texto(data.name, 120) } : {}),
      ...(unPuntero(data.location) ? { location: unPuntero(data.location) } : {}),
      ...(data.elements !== undefined ? { elements: punteros(data.elements) ?? noVale() } : {}),
      ...(texto(data.narrative, 280) ? { narrative: texto(data.narrative, 280) } : {}),
      at,
    }, { db });
    if (r.status === 'invalido') throw new HttpsError('invalid-argument', 'Eso no tiene una forma válida.');
    if (r.status === 'referencia_rechazada') noEsta();
    return { status: r.status, scene: r.scene };
  }

  if (op === 'scene.get') {
    if (!sceneId) noVale();
    const e = await leerEscena(accountId, sceneId as string, { db });
    if (!e) noEsta();
    return { scene: e };
  }

  if (op === 'scene.list') {
    if (!projectId) noVale();
    return { scenes: await escenasDelProyecto({ accountId, projectId: projectId as string, ...(entero(data.limit) !== undefined ? { limit: entero(data.limit) as number } : {}) }, { db }) };
  }

  if (op === 'scene.update') {
    if (!sceneId) noVale();
    const r = await actualizarEscena(accountId, sceneId as string, {
      ...(order !== undefined ? { order } : {}),
      ...(texto(data.name, 120) ? { name: texto(data.name, 120) } : {}),
      ...(unPuntero(data.location) ? { location: unPuntero(data.location) } : {}),
      ...(data.elements !== undefined ? { elements: punteros(data.elements) ?? noVale() } : {}),
      ...(texto(data.narrative, 280) ? { narrative: texto(data.narrative, 280) } : {}),
      at,
    }, { db });
    if (r.status === 'no_encontrado' || r.status === 'referencia_rechazada') noEsta();
    if (r.status === 'invalido') throw new HttpsError('invalid-argument', 'Eso no tiene una forma válida.');
    return { status: r.status, scene: r.scene };
  }

  /* ── Planos ───────────────────────────────────────────────────────────── */

  if (op === 'shot.create') {
    if (!shotId || !projectId || order === undefined) noVale();
    if (data.continuity !== undefined && !requisitos(data.continuity)) noVale();
    const r = await crearPlano({
      accountId, shotId: shotId as string, projectId: projectId as string, order: order as number,
      ...(sceneId ? { sceneId } : {}),
      ...(texto(data.previousShotId, 128) ? { previousShotId: texto(data.previousShotId, 128) } : {}),
      ...(data.dependsOnShotIds !== undefined ? { dependsOnShotIds: ids(data.dependsOnShotIds) ?? noVale() } : {}),
      ...(data.elements !== undefined ? { elements: punteros(data.elements) ?? noVale() } : {}),
      ...(data.continuity !== undefined ? { continuity: requisitos(data.continuity) } : {}),
      ...(texto(data.narrative, 280) ? { narrative: texto(data.narrative, 280) } : {}),
      at,
    }, { db });
    if (r.status === 'invalido') throw new HttpsError('invalid-argument', 'Eso no tiene una forma válida.');
    if (r.status === 'referencia_rechazada') noEsta();
    return { status: r.status, shot: r.shot };
  }

  if (op === 'shot.get') {
    if (!shotId) noVale();
    const p = await leerPlano(accountId, shotId as string, { db });
    if (!p) noEsta();
    return { shot: p };
  }

  if (op === 'shot.list') {
    if (!sceneId) noVale();
    return { shots: await planosDeLaEscena({ accountId, sceneId, ...(entero(data.limit) !== undefined ? { limit: entero(data.limit) as number } : {}) }, { db }) };
  }

  if (op === 'shot.update') {
    if (!shotId) noVale();
    if (data.state !== undefined && !esEstadoDePlano(data.state)) noVale();
    if (data.continuity !== undefined && !requisitos(data.continuity)) noVale();
    const r = await actualizarPlano(accountId, shotId as string, {
      ...(data.state !== undefined ? { state: data.state as ShotState } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(sceneId ? { sceneId } : {}),
      ...(texto(data.previousShotId, 128) ? { previousShotId: texto(data.previousShotId, 128) } : {}),
      ...(data.dependsOnShotIds !== undefined ? { dependsOnShotIds: ids(data.dependsOnShotIds) ?? noVale() } : {}),
      ...(data.elements !== undefined ? { elements: punteros(data.elements) ?? noVale() } : {}),
      ...(data.continuity !== undefined ? { continuity: requisitos(data.continuity) } : {}),
      ...(texto(data.narrative, 280) ? { narrative: texto(data.narrative, 280) } : {}),
      ...(texto(data.producedAssetId, 128) ? { producedAssetId: texto(data.producedAssetId, 128) } : {}),
      at,
    }, { db });
    if (r.status === 'no_encontrado' || r.status === 'referencia_rechazada') noEsta();
    if (r.status === 'invalido') throw new HttpsError('invalid-argument', 'Eso no tiene una forma válida.');
    if (r.status === 'transicion_invalida') throw new HttpsError('failed-precondition', 'Ese cambio de estado no se puede hacer.');
    return { status: r.status, shot: r.shot };
  }

  if (op === 'shot.stale') {
    if (!shotId) noVale();
    const r = await marcarPlanoObsoleto(accountId, shotId as string, at, { db });
    if (r.status === 'no_encontrado') noEsta();
    if (r.status !== 'actualizado') throw new HttpsError('failed-precondition', 'Ese cambio de estado no se puede hacer.');
    return { status: r.status, shot: r.shot };
  }

  /*
   * C4 · La comprobación ESTRUCTURAL. No mira ninguna imagen y no genera nada:
   * dice si lo guardado cuadra y si lo que se exige conservar tiene a qué
   * agarrarse. Un `fail` es una respuesta, no una orden de rehacer.
   */
  if (op === 'shot.validate') {
    if (!shotId) noVale();
    const r = await revisarPlanoGuardado({ accountId, shotId: shotId as string, at }, { db });
    if (!r) noEsta();
    return { review: r };
  }

  if (op === 'shot.context') {
    if (!shotId) noVale();
    const c = await contextoDeContinuidad({ accountId, shotId: shotId as string }, { db });
    if (!c) noEsta();
    return { context: c };
  }

  throw new HttpsError('invalid-argument', 'Esa operación no existe.');
});
