import { CONTENT_CORE_CONTRACT_VERSION } from '../contracts';
import { EntityType, OwnerRef } from '../identity';

/**
 * WEE CONTENT CORE — LA PUBLICACIÓN.
 *
 * ── El acto, separado de la cosa ────────────────────────────────────────────
 *
 * Publicar no es crear. Es poner un contenido que ya existe en un sitio, con
 * una cara, con una visibilidad, en un momento. Hoy eso es un array de ocho
 * palabras dentro del post —`destinations: ['general', 'chef']`— sin fecha por
 * destino, sin estado por destino, sin poder retirar de un sitio sin reescribir
 * el documento entero, y con un SEGUNDO eje (`communityId`) que no se puede
 * combinar con el primero.
 *
 * Aquí una publicación es una fila: un contenido, un destino, una entidad que
 * publica, una visibilidad y su propio ciclo de vida. El mismo contenido en
 * tres sitios son tres filas. Retirarlo de uno es retirar una.
 *
 * ── Quién publica: la entidad, y aquí sí es obligatoria ─────────────────────
 *
 * El material es de la cuenta y el contenido también. Pero una publicación se
 * hace DESDE UNA CARA: el Perfil Real, el Perfil Weë o una Página. Es el único
 * sitio de los tres donde la entidad no es opcional, porque «publicado desde»
 * es exactamente lo que una publicación significa. Y sigue sin ser propiedad:
 * borrar la Página retira sus publicaciones, no el material.
 *
 * ── Publicar no es hacer público ────────────────────────────────────────────
 *
 * Hoy `isPrivate` es un booleano que siempre vale `false` y que ningún muro
 * consulta. Aquí la visibilidad es un valor con siete opciones, y se decide
 * por publicación: el mismo contenido puede ir público en el muro y solo para
 * conexiones en otro sitio. Una publicación `private` es legítima: es lo que
 * hoy se llama «guardar para mí».
 */

/**
 * QUIÉN LO PUEDE VER. Por publicación, no por contenido ni por material.
 *
 * Se declara entero ahora para que el modelo no nazca con dos valores y haya
 * que romperlo cuando lleguen los demás. Lo que NO hay es la regla de cada
 * uno: quién cuenta como «conexión» o como «seguidor» lo decide el grafo
 * social, y esa es otra fase. Aquí solo se guarda lo que se eligió.
 */
export type Visibility =
  | 'public'
  | 'followers'
  | 'connections'
  | 'community'
  | 'page'
  | 'private'
  | 'unlisted';

export const VISIBILIDADES: readonly Visibility[] = Object.freeze([
  'public', 'followers', 'connections', 'community', 'page', 'private', 'unlisted',
] as const);

export const esVisibilidad = (v: unknown): v is Visibility =>
  typeof v === 'string' && (VISIBILIDADES as readonly string[]).includes(v);

/**
 * DÓNDE. Un tipo de sitio y, cuando hace falta, cuál.
 *
 * `wall` es el Wäll, y no lleva id. `section` es lo que hoy son los ocho
 * destinos —`chef`, `design`, `travel`…— y lleva el id de la experiencia.
 * `community` y `page` llevan el suyo. `weels` es la sección de Weëls, que hoy
 * no existe como destino porque se deduce del vídeo, y por eso nadie puede
 * publicar un Weël sin que sea también un vídeo suelto.
 */
export type PublicationTargetKind = 'wall' | 'weels' | 'section' | 'community' | 'page' | 'profile';

export interface PublicationTarget {
  kind: PublicationTargetKind;
  /** Cuál. Obligatorio para `section`, `community`, `page` y `profile`. */
  id?: string;
}

const NECESITAN_ID: readonly PublicationTargetKind[] = ['section', 'community', 'page', 'profile'];

export const esDestino = (v: unknown): v is PublicationTarget => {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  if (typeof t.kind !== 'string' || !['wall', 'weels', 'section', 'community', 'page', 'profile'].includes(t.kind)) return false;
  const necesita = (NECESITAN_ID as readonly string[]).includes(t.kind);
  if (necesita && (typeof t.id !== 'string' || !t.id)) return false;
  if (!necesita && t.id !== undefined) return false;
  return true;
};

/**
 * EL CICLO DE VIDA DE UNA PUBLICACIÓN. Suyo, y de nadie más.
 *
 *   scheduled     existe y todavía no ha llegado su momento
 *   published     está en su sitio
 *   unpublished   su dueño la retiró; se puede volver a publicar
 *   deleted       se retiró del todo
 *
 * Retirar una publicación no toca el contenido ni el material. Es el punto
 * entero de tener tres ciclos de vida en vez de uno.
 */
export type PublicationStatus = 'scheduled' | 'published' | 'unpublished' | 'deleted';

export const ESTADOS_DE_PUBLICACION: readonly PublicationStatus[] = Object.freeze([
  'scheduled', 'published', 'unpublished', 'deleted',
] as const);

export const TRANSICIONES_DE_PUBLICACION: Readonly<Record<PublicationStatus, readonly PublicationStatus[]>> = Object.freeze({
  scheduled: Object.freeze(['published', 'deleted'] as PublicationStatus[]),
  published: Object.freeze(['unpublished', 'deleted'] as PublicationStatus[]),
  unpublished: Object.freeze(['published', 'deleted'] as PublicationStatus[]),
  deleted: Object.freeze([] as PublicationStatus[]),
});

export interface Publication extends OwnerRef {
  contract: typeof CONTENT_CORE_CONTRACT_VERSION;
  publicationId: string;
  contentId: string;
  target: PublicationTarget;
  /** Desde qué cara. Obligatorio: publicar es publicar desde algún sitio. */
  publishedByEntityId: string;
  publishedByEntityType: EntityType;
  visibility: Visibility;
  status: PublicationStatus;
  /** Cuándo llegó a estar publicada. Solo desde `published` en adelante. */
  publishedAt?: number;
  /** Para `scheduled`: cuándo debe publicarse. */
  scheduledFor?: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export const FORMA_DE_ID_DE_PUBLICACION = /^[A-Za-z0-9_-]{4,128}$/;

/**
 * ¿Está bien formada? Incluye las reglas que atan visibilidad y destino: una
 * publicación `community` tiene que ir a una comunidad, y una `page` a una
 * Página. Lo demás es forma.
 */
export const publicacionValida = (p: Publication | undefined): boolean => {
  if (!p || typeof p !== 'object') return false;
  if (p.contract !== CONTENT_CORE_CONTRACT_VERSION) return false;
  if (typeof p.publicationId !== 'string' || !FORMA_DE_ID_DE_PUBLICACION.test(p.publicationId)) return false;
  if (typeof p.contentId !== 'string' || !p.contentId) return false;
  if (typeof p.ownerAccountId !== 'string' || !p.ownerAccountId) return false;
  if (!esDestino(p.target)) return false;
  if (typeof p.publishedByEntityId !== 'string' || !p.publishedByEntityId) return false;
  if (!['REAL_PROFILE', 'WEE_PROFILE', 'PAGE'].includes(p.publishedByEntityType)) return false;
  if (!esVisibilidad(p.visibility)) return false;
  if (!(ESTADOS_DE_PUBLICACION as readonly string[]).includes(p.status)) return false;
  if (p.visibility === 'community' && p.target.kind !== 'community') return false;
  if (p.visibility === 'page' && p.target.kind !== 'page') return false;
  if (p.status === 'published' && !Number.isFinite(p.publishedAt)) return false;
  if (p.status === 'scheduled' && !Number.isFinite(p.scheduledFor)) return false;
  if (p.status === 'deleted' && !Number.isFinite(p.deletedAt)) return false;
  if (p.status !== 'deleted' && p.deletedAt !== undefined) return false;
  return Number.isFinite(p.createdAt) && Number.isFinite(p.updatedAt);
};

export const publicacionEsDeLaCuenta = (p: Publication | undefined, accountId: string | undefined): boolean =>
  !!p && typeof accountId === 'string' && accountId.length > 0 && p.ownerAccountId === accountId;

/** ¿Está esta publicación en su sitio ahora mismo? */
export const estaPublicada = (p: Publication): boolean => p.status === 'published';

/**
 * ¿Es visible para alguien que no es su dueño?
 *
 * Solo lo que se puede afirmar sin consultar el grafo social: `public` y
 * `unlisted` lo son; `private` no; el resto depende de una relación que aquí
 * no se conoce, y por eso devuelve `undefined` en vez de adivinar. Quien tenga
 * el grafo contesta lo demás.
 */
export const visibleParaTerceros = (p: Publication): boolean | undefined => {
  if (!estaPublicada(p)) return false;
  if (p.visibility === 'public' || p.visibility === 'unlisted') return true;
  if (p.visibility === 'private') return false;
  return undefined;
};

/**
 * Publicar, retirar y volver a publicar: la transición, con su fecha.
 *
 * Devuelve `undefined` si la transición no está en la tabla, en vez de dejar
 * que un `published` pase a `scheduled` porque a alguien le pareció útil.
 */
export const transicionar = (p: Publication, a: PublicationStatus, at: number): Publication | undefined => {
  if (!(TRANSICIONES_DE_PUBLICACION[p.status] ?? []).includes(a)) return undefined;
  return {
    ...p,
    status: a,
    updatedAt: at,
    ...(a === 'published' ? { publishedAt: at } : {}),
    ...(a === 'deleted' ? { deletedAt: at } : {}),
  };
};
