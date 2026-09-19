import { EntityAttribution, OwnerRef } from './identity';

/**
 * WEE CORE — PROYECTOS.
 *
 * ── El problema real, medido ────────────────────────────────────────────────
 *
 * El proyecto que existe (`creatorProjects`) tiene seis campos —id, userId,
 * name, emoji, createdAt, updatedAt—, cero documentos en producción, y una
 * relación en un solo sentido y de un solo valor: el TRABAJO guarda un
 * `projectId` escalar. Con eso, un trabajo con siete resultados entra o no
 * entra entero en un proyecto, un resultado no puede estar en dos, y borrar un
 * proyecto deja los trabajos apuntando a un documento que ya no está.
 *
 * ── Qué es un proyecto, y qué no ────────────────────────────────────────────
 *
 * Un proyecto ORGANIZA. No posee: el material es de la cuenta, y el proyecto
 * es de la cuenta. Mover un material de proyecto no cambia de quién es, y
 * borrar un proyecto no puede borrar nada de nadie — solo deja de agruparlo.
 *
 * ── La relación va APARTE, y por qué ────────────────────────────────────────
 *
 * El material NO lleva `projectId`. Lo llevaba, como escalar, y eso hacía
 * imposible lo que más importa: el mismo diseño en el proyecto del anuncio y
 * en el de la marca sin copiarlo. Tampoco lleva `projectIds[]`: una lista
 * dentro del material es una relación rígida —para saber qué hay en un
 * proyecto habría que recorrer todos los materiales— y crece sin control.
 *
 * La relación es una fila propia: `ProjectItem`. Un proyecto, una cosa (un
 * material o un contenido), cuándo se añadió y desde qué cara. Con eso, un
 * material está en tantos proyectos como filas tenga, listar un proyecto es
 * consultar sus filas, y quitar algo de un proyecto es borrar una fila y no
 * tocar ni el material ni el proyecto.
 *
 * Lo que hoy es `creatorJobs.projectId` sigue funcionando: es la costura
 * heredada que apunta a un trabajo entero, y se queda hasta que los trabajos
 * produzcan materiales con id y puedan entrar por aquí uno a uno.
 */

/**
 * UN PROYECTO.
 *
 * `itemCount` es denormalizado a propósito: listar proyectos no puede costar
 * una consulta por proyecto. Y como todo contador copiado, es una lectura
 * cómoda y no una verdad: la verdad son las filas.
 */
export interface Project extends OwnerRef, EntityAttribution {
  projectId: string;
  name: string;
  emoji?: string;
  description?: string;
  /** El material que hace de portada, si se eligió uno. Referencia, no copia. */
  coverAssetId?: string;
  itemCount?: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/** Qué puede estar dentro de un proyecto. Abierto por diseño. */
export type ProjectItemKind = 'asset' | 'content';

/**
 * UNA COSA DENTRO DE UN PROYECTO. La fila que hace posible la reutilización.
 *
 * `addedByEntityId` es atribución —desde qué cara se guardó ahí— y no
 * propiedad: la fila es de la cuenta, como el proyecto y como el material.
 */
export interface ProjectItem {
  projectId: string;
  kind: ProjectItemKind;
  /** El `assetId` o el `contentId`, según `kind`. */
  itemId: string;
  addedAt: number;
  addedByEntityId?: string;
  /** Posición dentro del proyecto, cuando se ordena a mano. */
  order?: number;
}

export const FORMA_DE_ID_DE_PROYECTO = /^[A-Za-z0-9_-]{4,128}$/;
export const MAXIMO_DE_NOMBRE_DE_PROYECTO = 60;

export const proyectoValido = (p: Project | undefined): boolean => {
  if (!p || typeof p !== 'object') return false;
  if (typeof p.projectId !== 'string' || !FORMA_DE_ID_DE_PROYECTO.test(p.projectId)) return false;
  if (typeof p.ownerAccountId !== 'string' || !p.ownerAccountId) return false;
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > MAXIMO_DE_NOMBRE_DE_PROYECTO) return false;
  if (p.itemCount !== undefined && (!Number.isSafeInteger(p.itemCount) || p.itemCount < 0)) return false;
  if (p.deletedAt !== undefined && !Number.isFinite(p.deletedAt)) return false;
  return Number.isFinite(p.createdAt) && Number.isFinite(p.updatedAt);
};

export const proyectoEsDeLaCuenta = (p: Project | undefined, accountId: string | undefined): boolean =>
  !!p && typeof accountId === 'string' && accountId.length > 0 && p.ownerAccountId === accountId;

/**
 * La clave de una fila: un proyecto no tiene la misma cosa dos veces.
 *
 * Derivada, no inventada: dos servidores calculan la misma, así que añadir
 * el mismo material al mismo proyecto dos veces es un no-op y no un duplicado.
 */
export const claveDeElemento = (item: Pick<ProjectItem, 'projectId' | 'kind' | 'itemId'>): string =>
  `${item.projectId}:${item.kind}:${item.itemId}`;

/** ¿Está esta cosa en este proyecto? Sobre filas ya leídas. */
export const estaEnElProyecto = (
  filas: readonly ProjectItem[],
  projectId: string,
  kind: ProjectItemKind,
  itemId: string,
): boolean => filas.some((f) => f.projectId === projectId && f.kind === kind && f.itemId === itemId);

/**
 * Los proyectos en los que está una cosa. Es la pregunta que el escalar
 * `projectId` no podía contestar más que con un valor.
 */
export const proyectosDe = (filas: readonly ProjectItem[], kind: ProjectItemKind, itemId: string): readonly string[] =>
  [...new Set(filas.filter((f) => f.kind === kind && f.itemId === itemId).map((f) => f.projectId))];
