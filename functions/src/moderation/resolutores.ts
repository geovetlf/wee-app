import type { Firestore } from 'firebase-admin/firestore';
import type { ModalidadModerable, ReportTargetType } from '../core/moderation';
import type { ClaseDeContenido, ObjetivoDelCaso, SujetoDelCaso } from '../core/moderation-case';
import { esTipoDeEntidad } from '../core/identity';
import { ENTIDADES, entidadDelPerfil } from '../identity/cuentas';
import { caraDelPerfilGuardado } from '../identity/compatibilidad';
import type { ObjetivoLeido, TablaDeResolutores } from './index';

/**
 * WEE MODERATION CORE — QUÉ HAY DETRÁS DE CADA OBJETIVO, LEÍDO POR EL SERVIDOR.
 *
 * Dos trabajos distintos, y por eso dos piezas:
 *
 *   1. `ampliarResolutores`: la tabla con la que DENUNCIAR acepta un objetivo.
 *      Parte de la de la fundación (`RESOLUTORES`, que no se toca) y le añade lo
 *      que el Moderation Core abre: las COMUNIDADES y las PÁGINAS de `pages` como
 *      entidad. Lo que sigue sin nada detrás que leer —publicaciones del Core,
 *      material, contenido genérico y mensajes de WeeTalk— se sigue rechazando.
 *   2. `localizarContenido`: lo que el CASO necesita saber del contenido —su
 *      clase, si es custodiable y dónde vive, y de quién es—, leído al recibir la
 *      señal y al actuar. Nada de esto lo dice el cliente.
 *
 * ── De quién es, sin deducir nada ───────────────────────────────────────────
 *
 * La cuenta dueña sale de la ENTIDAD del perfil firmante (`entidadDelPerfil`).
 * Si no hay entidad —contenido histórico de una cuenta que todavía no nació—,
 * del documento de `users` de esa firma, con la frontera de compatibilidad
 * (`caraDelPerfilGuardado`), que LEE el vínculo guardado. Ningún prefijo decide
 * nada; si los datos no dan, el dueño queda sin decir.
 *
 * ── Por qué los mensajes de WeeTalk no se abren aquí ────────────────────────
 *
 * Moderar un mensaje es que una persona de moderación lea una conversación
 * PRIVADA entre dos identidades. Es una decisión del dueño, y además pide
 * ampliar la petición con la conversación. Queda preparado y documentado
 * (docs/MODERATION-CORE.md § Mensajes), no abierto.
 */

const modalidadDe = (doc: Record<string, unknown>): ModalidadModerable =>
  typeof doc.videoUrl === 'string' && doc.videoUrl ? 'VIDEO'
    : Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0 ? 'IMAGE' : 'TEXT';

/** De quién es algo firmado con el `uid` de un perfil: la entidad si existe; si no, el vínculo guardado en su perfil. */
export const sujetoDeLaFirma = async (db: Firestore, firma: unknown): Promise<SujetoDelCaso> => {
  if (typeof firma !== 'string' || !firma || firma.includes('/') || firma.length > 200) return {};
  const entidad = await entidadDelPerfil(db, firma);
  if (entidad) return { accountId: entidad.ownerAccountId, entityId: entidad.entityId, entityType: entidad.entityType, profileUid: firma };
  const perfil = await db.collection('users').where('uid', '==', firma).limit(1).get();
  const cara = perfil.empty ? null : caraDelPerfilGuardado(perfil.docs[0].data() as Parameters<typeof caraDelPerfilGuardado>[0]);
  return cara ? { accountId: cara.ownerAccountId, entityType: cara.tipo, profileUid: firma } : { profileUid: firma };
};

/** La Página publicada de `pages` como objetivo. Un borrador no se denuncia: solo lo ve su dueño. */
const paginaComoObjetivo = async (db: Firestore, id: string): Promise<ObjetivoLeido | null> => {
  const snap = await db.collection('pages').doc(id).get();
  if (!snap.exists) return null;
  const p = snap.data() as { ownerAccountId?: unknown; status?: unknown };
  if (p.status !== 'published' || typeof p.ownerAccountId !== 'string') return null;
  return { ownerAccountId: p.ownerAccountId, modality: 'TEXT' };
};

/** Lo que dice la propiedad privada de una comunidad (solo servidor), o el `createdBy` de una heredada, que guarda la cuenta. */
const duenoDeComunidad = async (db: Firestore, id: string, publica: Record<string, unknown>): Promise<SujetoDelCaso> => {
  const propiedad = await db.collection('communities').doc(id).collection('private').doc('ownership').get();
  if (propiedad.exists) {
    const p = propiedad.data() as { ownerAccountId?: unknown; ownerIdentity?: unknown };
    const deLaFirma = await sujetoDeLaFirma(db, p.ownerIdentity);
    return {
      ...deLaFirma,
      ...(typeof p.ownerAccountId === 'string' ? { accountId: p.ownerAccountId } : {}),
    };
  }
  return typeof publica.createdBy === 'string' && publica.createdBy && !publica.createdBy.includes('/') ? { accountId: publica.createdBy } : {};
};

const comunidadComoObjetivo = async (db: Firestore, id: string): Promise<ObjetivoLeido | null> => {
  const snap = await db.collection('communities').doc(id).get();
  if (!snap.exists) return null;
  const c = snap.data() as Record<string, unknown>;
  /* Una comunidad que no está activa no se ve en Weë: no hay nada que denunciar. */
  if (c.status !== 'active') return null;
  const dueno = await duenoDeComunidad(db, id, c);
  return { ...(dueno.accountId ? { ownerAccountId: dueno.accountId } : {}), ...(dueno.entityId ? { ownerEntityId: dueno.entityId } : {}), modality: 'TEXT' };
};

/**
 * LA TABLA DEL MODERATION CORE: la de la fundación, más comunidades y Páginas.
 * Una ENTIDAD se busca primero en `entities`; si no está, puede ser una Página
 * de `pages`, que es una entidad de la cuenta aunque todavía no viva en
 * `entities`. No hay clase de objetivo `PAGE`: una Página es una ENTITY.
 */
export const ampliarResolutores = (base: TablaDeResolutores): TablaDeResolutores => {
  const entidadBase = base.ENTITY;
  return Object.freeze({
    ...base,
    ENTITY: async (db: Firestore, id: string) => (entidadBase ? await entidadBase(db, id) : null) ?? paginaComoObjetivo(db, id),
    COMMUNITY: comunidadComoObjetivo,
  });
};

/* ── Lo que el caso necesita saber del contenido ────────────────────────── */

export interface ContenidoLocalizado {
  objetivo: ObjetivoDelCaso;
  sujeto: SujetoDelCaso;
  /** Si el documento está hoy en su sitio. Uno custodiado o borrado por su autor no lo está. */
  visible: boolean;
}

/**
 * QUÉ ES, DÓNDE VIVE Y DE QUIÉN ES. `null` si la clase de objetivo no tiene
 * nada detrás. Un contenido que ya no está en su sitio se devuelve igual —con
 * `visible: false`—, porque el caso sigue existiendo aunque el contenido no.
 */
export const localizarContenido = async (db: Firestore, targetType: ReportTargetType, targetId: string): Promise<ContenidoLocalizado | null> => {
  if (typeof targetId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(targetId)) return null;
  if (targetType === 'POST' || targetType === 'COMMENT') {
    const coleccion = targetType === 'POST' ? 'posts' : 'comments';
    const snap = await db.collection(coleccion).doc(targetId).get();
    const datos = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const kind: ClaseDeContenido = targetType === 'COMMENT' ? 'COMMENT' : datos.isWeel === true ? 'WEEL' : 'POST';
    return {
      objetivo: { type: targetType, id: targetId, kind, ...(snap.exists ? { modality: targetType === 'COMMENT' ? 'TEXT' : modalidadDe(datos) } : {}), path: `${coleccion}/${targetId}` },
      sujeto: snap.exists ? await sujetoDeLaFirma(db, datos.userId) : {},
      visible: snap.exists,
    };
  }
  if (targetType === 'ENTITY') {
    const entidad = await db.collection(ENTIDADES).doc(targetId).get();
    if (entidad.exists) {
      const e = entidad.data() as { ownerAccountId?: string; entityId?: string; entityType?: unknown; status?: unknown };
      const tipo = esTipoDeEntidad(e.entityType) ? e.entityType : undefined;
      const kind: ClaseDeContenido = tipo === 'WEE_PROFILE' ? 'WEE_PROFILE' : tipo === 'PAGE' ? 'PAGE' : 'REAL_PROFILE';
      /* Un perfil no se esconde: sobre una persona se actúa con sanciones de cuenta. Sin `path`, no es custodiable. */
      return {
        objetivo: { type: 'ENTITY', id: targetId, kind, modality: 'TEXT' },
        sujeto: { ...(e.ownerAccountId ? { accountId: e.ownerAccountId } : {}), ...(e.entityId ? { entityId: e.entityId } : {}), ...(tipo ? { entityType: tipo } : {}) },
        visible: e.status === 'ACTIVE',
      };
    }
    const pagina = await db.collection('pages').doc(targetId).get();
    const p = pagina.exists ? (pagina.data() as { ownerAccountId?: unknown; status?: unknown }) : {};
    return {
      objetivo: { type: 'ENTITY', id: targetId, kind: 'PAGE', modality: 'TEXT', path: `pages/${targetId}` },
      sujeto: typeof p.ownerAccountId === 'string' ? { accountId: p.ownerAccountId } : {},
      visible: pagina.exists && p.status === 'published',
    };
  }
  if (targetType === 'COMMUNITY') {
    const snap = await db.collection('communities').doc(targetId).get();
    const c = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    return {
      objetivo: { type: 'COMMUNITY', id: targetId, kind: 'COMMUNITY', modality: 'TEXT', path: `communities/${targetId}` },
      sujeto: await duenoDeComunidad(db, targetId, c),
      visible: snap.exists && c.status === 'active',
    };
  }
  return null;
};

/**
 * LO QUE QUIEN REVISA VE DEL CONTENIDO: los campos de lectura, y nada de
 * cuentas, correos, tokens ni datos privados. Sale del documento en su sitio o
 * de la copia custodiada, que es el mismo documento.
 */
export const CAMPOS_VISIBLES_PARA_REVISAR: Readonly<Record<ClaseDeContenido, readonly string[]>> = Object.freeze({
  POST: ['content', 'imageUrls', 'videoUrl', 'thumbnailUrl', 'isWeel', 'isRepost', 'originalPostId', 'visibility', 'communityId', 'createdAt', 'aiTools', 'aiPrompt'],
  WEEL: ['content', 'imageUrls', 'videoUrl', 'thumbnailUrl', 'isWeel', 'visibility', 'communityId', 'createdAt'],
  COMMENT: ['content', 'postId', 'parentCommentId', 'createdAt'],
  REAL_PROFILE: [],
  WEE_PROFILE: [],
  PAGE: ['name', 'handle', 'type', 'shortDescription', 'about', 'website', 'logoURL', 'coverURL', 'status'],
  COMMUNITY: ['name', 'slug', 'description', 'icon', 'rules', 'status', 'isOfficial'],
});

/** Una marca de tiempo de Firestore o un número: lo que viaja es un número, que la consola sabe pintar. */
const valorParaRevisar = (v: unknown): unknown => {
  if (v && typeof v === 'object' && typeof (v as { toMillis?: unknown }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  if (typeof v === 'string') return v.slice(0, 5_000);
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => (typeof x === 'string' ? x.slice(0, 2_048) : x));
  if (typeof v === 'number' || typeof v === 'boolean' || v === null) return v;
  return undefined;
};

export const vistaDelContenidoParaRevisar = (kind: ClaseDeContenido, datos: Record<string, unknown> | undefined): Record<string, unknown> => {
  const salida: Record<string, unknown> = {};
  for (const campo of CAMPOS_VISIBLES_PARA_REVISAR[kind] ?? []) {
    const v = valorParaRevisar(datos?.[campo]);
    if (v !== undefined) salida[campo] = v;
  }
  return salida;
};
