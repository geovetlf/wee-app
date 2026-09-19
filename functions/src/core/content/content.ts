import { CONTENT_CORE_CONTRACT_VERSION } from '../contracts';
import { OwnedByAccount } from '../identity';

/**
 * WEE CONTENT CORE — EL CONTENIDO.
 *
 * ── Lo que hoy no existe ────────────────────────────────────────────────────
 *
 * En Weë un `posts` hace de cuatro cosas a la vez: es el material (las URLs),
 * el contenido (el texto), la publicación (`destinations[]`) y el contador de
 * interacción. Y el modelo lleva tiempo pidiendo que se separen por dos sitios
 * distintos: un repost es una «publicación sin contenido» —un `posts` con
 * `content: ''` que apunta a otro— y la encuesta se metió dentro del post con
 * un comentario que lo admite («así hereda gratis `destinations[]`»).
 *
 * Esto es la pieza del medio: LO QUE SE PUEDE PUBLICAR. Texto, materiales y
 * quién lo escribió. Ni dónde está publicado —eso es la publicación— ni dónde
 * viven los bytes —eso es el material—.
 *
 * ── Qué es y qué no es ──────────────────────────────────────────────────────
 *
 * Un contenido REFERENCIA materiales por id; no los contiene. Publicar el mismo
 * diseño en dos sitios son dos publicaciones de un contenido, o dos contenidos
 * que apuntan al mismo material — y en ningún caso dos archivos.
 *
 * Un contenido puede ser un borrador: existe, tiene dueño y no está en ninguna
 * parte. Eso hoy no cabe en `posts`, donde crear es publicar.
 *
 * Y NO es almacenamiento: `body` es texto acotado. Lo que pese va como
 * material, por referencia, aunque sea un documento largo.
 */

/**
 * De qué clase es un contenido. Abierto por diseño: cada tipo nuevo de
 * experiencia social añade el suyo con un cambio menor.
 *
 * `weel` está aquí y no como un booleano dentro de `post` a propósito: hoy
 * `isWeel` se escribe y NADIE lo lee —la sección Weëls filtra por `videoUrl` y
 * enseña cualquier vídeo—. Un tipo propio es lo que permite que un Weël sea
 * una cosa y no una casualidad.
 */
export type ContentType =
  | 'post'
  | 'comment'
  | 'reply'
  | 'weel'
  | 'page_content'
  | 'community_content'
  | 'media_post';

export const TIPOS_DE_CONTENIDO: readonly ContentType[] = Object.freeze([
  'post', 'comment', 'reply', 'weel', 'page_content', 'community_content', 'media_post',
] as const);

export const esTipoDeContenido = (v: unknown): v is ContentType =>
  typeof v === 'string' && (TIPOS_DE_CONTENIDO as readonly string[]).includes(v);

/**
 * Cómo participa un material en un contenido. Por id, con su papel y su orden.
 *
 * `role` existe para que un contenido con un vídeo y su póster, o una imagen
 * principal y tres secundarias, no tenga que adivinar cuál es cuál por la
 * posición en la lista.
 */
export type AssetRole = 'primary' | 'attachment' | 'cover' | 'source';

export interface AssetRef {
  assetId: string;
  role?: AssetRole;
  /** Posición entre los del mismo papel. Empieza en 0. */
  order?: number;
}

/**
 * EL ESTADO DEL CONTENIDO. Del contenido, no de sus publicaciones.
 *
 *   draft     existe y no está en ninguna parte
 *   ready     se puede publicar
 *   deleted   su dueño lo retiró
 *
 * No hay `published`: publicado es tener al menos una publicación viva, y eso
 * se pregunta a las publicaciones, no se copia aquí. Copiarlo sería tener dos
 * verdades y la segunda siempre acaba desincronizada.
 */
export type ContentStatus = 'draft' | 'ready' | 'deleted';

export const ESTADOS_DE_CONTENIDO: readonly ContentStatus[] = Object.freeze(['draft', 'ready', 'deleted'] as const);

/**
 * LA COSTURA DE MODERACIÓN. Solo la costura.
 *
 * Hoy el botón de denunciar de Weë escribe en la consola y le dice a la
 * persona «gracias, lo hemos recibido». Cuando exista moderación de verdad,
 * este es el sitio donde un contenido dice en qué situación está, y
 * `moderationCaseId` es el puente al caso. Aquí no se decide nada: una
 * política de moderación es de otra capa y de otra fase.
 *
 * Y está SEPARADO de la propiedad a propósito: restringir un contenido no
 * cambia de quién es, ni de quién son sus materiales.
 */
export type ModerationStatus = 'clear' | 'pending' | 'restricted' | 'removed';

export interface ModerationSeam {
  moderationStatus?: ModerationStatus;
  moderationCaseId?: string;
}

/** Lo que un contenido puede llevar escrito. Acotado: lo largo va como material. */
export const MAXIMO_DE_CUERPO = 20_000;

export interface Content extends OwnedByAccount, ModerationSeam {
  contract: typeof CONTENT_CORE_CONTRACT_VERSION;
  contentId: string;
  type: ContentType;
  status: ContentStatus;
  /** El texto, si lo hay. Un contenido puede ser solo materiales. */
  body?: string;
  /** Los materiales, por referencia. Nunca los bytes, nunca las URLs. */
  assetRefs: readonly AssetRef[];
  /** Para comentarios y respuestas: a qué contenido contestan. */
  inReplyToContentId?: string;
  /** Libre y acotado: etiquetas, lugar, lo que una experiencia necesite. */
  metadata?: Readonly<Record<string, string | number | boolean>>;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export const FORMA_DE_ID_DE_CONTENIDO = /^[A-Za-z0-9_-]{4,128}$/;

/** ¿Está bien formado? Sin excepciones: sí o no. */
export const contenidoValido = (c: Content | undefined): boolean => {
  if (!c || typeof c !== 'object') return false;
  if (c.contract !== CONTENT_CORE_CONTRACT_VERSION) return false;
  if (typeof c.contentId !== 'string' || !FORMA_DE_ID_DE_CONTENIDO.test(c.contentId)) return false;
  if (typeof c.ownerAccountId !== 'string' || !c.ownerAccountId) return false;
  if (!esTipoDeContenido(c.type)) return false;
  if (!(ESTADOS_DE_CONTENIDO as readonly string[]).includes(c.status)) return false;
  if (c.body !== undefined && (typeof c.body !== 'string' || c.body.length > MAXIMO_DE_CUERPO)) return false;
  if (!Array.isArray(c.assetRefs)) return false;
  if (!c.assetRefs.every((r) => r && typeof r.assetId === 'string' && r.assetId.length > 0)) return false;
  /* Un contenido sin texto y sin material no es nada. Un borrador vacío sí puede existir. */
  if (c.status === 'ready' && !c.body && c.assetRefs.length === 0) return false;
  if ((c.type === 'comment' || c.type === 'reply') && !c.inReplyToContentId) return false;
  if (c.status === 'deleted' && !Number.isFinite(c.deletedAt)) return false;
  if (c.status !== 'deleted' && c.deletedAt !== undefined) return false;
  return Number.isFinite(c.createdAt) && Number.isFinite(c.updatedAt);
};

export const contenidoEsDeLaCuenta = (c: Content | undefined, accountId: string | undefined): boolean =>
  !!c && typeof accountId === 'string' && accountId.length > 0 && c.ownerAccountId === accountId;

/**
 * Los materiales de un contenido, en el orden en que se enseñan: primero el
 * principal, luego los adjuntos por posición. Escrito una vez para que cada
 * pantalla no lo ordene a su manera.
 */
export const materialesEnOrden = (c: Content): readonly AssetRef[] => {
  const peso = (r: AssetRef): number => (r.role === 'primary' ? 0 : r.role === 'cover' ? 1 : r.role === 'source' ? 3 : 2);
  return [...c.assetRefs].sort((a, b) => peso(a) - peso(b) || (a.order ?? 0) - (b.order ?? 0));
};

/**
 * ¿Referencia este contenido a este material?
 *
 * Es la pregunta que hay que hacer ANTES de borrar un material: si algún
 * contenido vivo lo usa, borrarlo deja una publicación rota. Aquí solo se
 * responde para un contenido; quien tenga la lista de contenidos pregunta por
 * todos.
 */
export const usaElMaterial = (c: Content, assetId: string): boolean =>
  c.status !== 'deleted' && c.assetRefs.some((r) => r.assetId === assetId);
