/**
 * WeëPages en el cliente.
 *
 * Lee `pages`, `pageFollows` (las reglas dejan leer lo publicado y los borradores propios) y ESCRIBE solo a través de
 * las funciones `savePage` y `followPage` (functions/src/social/pages.ts): el dueño, el @usuario único y las fotos los
 * decide el servidor, nunca esta capa.
 *
 * DE QUÉ CUENTA ES UNA PÁGINA NO ESTÁ EN SU DOCUMENTO PÚBLICO (F1 del plan de alter egos, 2026-11-23). Vive en
 * `pages/{pageId}/private/ownership`, que solo lee la cuenta dueña; «mis Páginas» salen del índice privado
 * `accounts/{cuenta}/pages`. Las Páginas antiguas que aún llevan `ownerAccountId` en público se siguen reconociendo
 * por él hasta que se vuelvan a guardar. El logo y la portada suben a la carpeta de la PÁGINA (`pages/<pageId>/`), no
 * a la de la cuenta: su URL pública ya no delata de quién es.
 */
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, functions, storage } from '../config/firebase';
import type { TipoDePagina, SeccionElegida, IdDeSeccion } from '../constants/pageTypes';

export interface WeePage {
  id: string;
  type: TipoDePagina;
  name: string;
  handle: string;
  shortDescription: string;
  about: string;
  website: string;
  location: string;
  contact: string;
  logoURL: string;
  coverURL: string;
  details: Record<string, string>;
  /** Las secciones elegidas por el dueño, en su orden (vacío en las páginas anteriores al 2026-11-23: valen las del tipo). */
  sections: SeccionElegida[];
  /** Enlaces a tiendas externas (solo https). Nada se vende dentro de Weë. */
  links: { label: string; url: string }[];
  /** Imágenes de la obra, de la carpeta de la página. */
  gallery: string[];
  /** El color de obra (id de COLORES_DE_OBRA) o vacío. */
  workColor: string;
  /** La referencia PÚBLICA de la cara que la presenta (entidad `ent_…`, o el uid del Perfil Real), o vacío: nadie. */
  presenterRef: string;
  status: 'draft' | 'published';
  /**
   * La cuenta dueña, SOLO si quien lee es esa cuenta (sale del privado) o la Página es antigua y aún la lleva en
   * público. Para cualquier otra persona, undefined: el documento público ya no la dice.
   */
  ownerAccountId?: string;
  followersCount: number;
  /** Solo demo/semilla: imágenes que la página destaca. */
  featured?: string[];
  /** Escenas de la historia hechas con Weë AI (vídeo + póster), que cualquiera puede abrir y ver. */
  scenes?: { title: string; videoURL: string; posterURL: string }[];
  updatedAtMs?: number;
  publishedAtMs?: number;
}

/**
 * Lo que el editor manda a `savePage`. `presenter` es el uid de una cara de la cuenta (o vacío): el servidor comprueba
 * que es suya y publica solo su referencia pública (`presenterRef`), nunca la cuenta.
 */
export type BorradorDePagina = Pick<WeePage, 'type' | 'name' | 'handle' | 'shortDescription' | 'about' | 'website' | 'location' | 'contact' | 'logoURL' | 'coverURL' | 'details' | 'sections' | 'links' | 'gallery' | 'workColor'> & { presenter: string };

const aPagina = (id: string, d: Record<string, any>): WeePage => ({
  id,
  type: d.type,
  name: d.name ?? '',
  handle: d.handle ?? '',
  shortDescription: d.shortDescription ?? '',
  about: d.about ?? '',
  website: d.website ?? '',
  location: d.location ?? '',
  contact: d.contact ?? '',
  logoURL: d.logoURL ?? '',
  coverURL: d.coverURL ?? '',
  details: d.details ?? {},
  sections: Array.isArray(d.sections) ? d.sections.filter((x: any) => x && typeof x.id === 'string').map((x: any) => ({ id: x.id as IdDeSeccion, enabled: x.enabled !== false })) : [],
  links: Array.isArray(d.links) ? d.links.filter((e: any) => e && typeof e.url === 'string' && e.url.startsWith('https://')).map((e: any) => ({ label: typeof e.label === 'string' ? e.label : '', url: e.url })) : [],
  gallery: Array.isArray(d.gallery) ? d.gallery.filter((u: any) => typeof u === 'string' && u) : [],
  workColor: typeof d.workColor === 'string' ? d.workColor : '',
  presenterRef: typeof d.presenterRef === 'string' ? d.presenterRef : '',
  status: d.status === 'published' ? 'published' : 'draft',
  ownerAccountId: typeof d.ownerAccountId === 'string' && d.ownerAccountId ? d.ownerAccountId : undefined,
  followersCount: typeof d.followersCount === 'number' ? d.followersCount : 0,
  featured: Array.isArray(d.featured) ? d.featured : undefined,
  scenes: Array.isArray(d.scenes) ? d.scenes.filter((e: any) => e && typeof e.videoURL === 'string') : undefined,
  updatedAtMs: d.updatedAt?.toMillis?.() ?? (typeof d.updatedAt === 'number' ? d.updatedAt : undefined),
  publishedAtMs: d.publishedAt?.toMillis?.() ?? (typeof d.publishedAt === 'number' ? d.publishedAt : undefined),
});

/** El motivo que manda el servidor → la clave `pages.err_*` que lo explica. */
export const claveDelError = (error: unknown): string => {
  const motivo = String((error as { message?: string })?.message ?? '');
  if (motivo === 'handle-ocupado') return 'pages.err_handleTaken';
  if (['nombre', 'handle', 'web', 'foto', 'larga', 'enlace', 'presentador'].includes(motivo)) return `pages.err_${motivo}`;
  return 'pages.err_generic';
};

/**
 * La cuenta dueña de una Página, leída de su privado. Solo la cuenta dueña puede leerlo: para cualquier otra, o si la
 * Página aún no tiene privado (las antiguas), las reglas lo deniegan y la respuesta es null. No es un error.
 */
const duenaPrivada = async (pageId: string): Promise<string | null> => {
  try {
    const snap = await getDoc(doc(db, 'pages', pageId, 'private', 'ownership'));
    const v = snap.exists() ? snap.data()?.ownerAccountId : null;
    return typeof v === 'string' && v ? v : null;
  } catch {
    return null;
  }
};

const MAX_BYTES_DE_FOTO = 10 * 1024 * 1024;

export const pagesService = {
  /**
   * Las Páginas de la CUENTA (las mismas desde cualquiera de sus caras): las de su índice privado, más las antiguas
   * que aún llevan la cuenta en su documento público.
   */
  mias: async (accountUid: string): Promise<WeePage[]> => {
    const [indice, antiguas] = await Promise.all([
      getDocs(collection(db, 'accounts', accountUid, 'pages')).catch(() => null),
      getDocs(query(collection(db, 'pages'), where('ownerAccountId', '==', accountUid))).catch(() => null),
    ]);
    const porId = new Map<string, WeePage>();
    for (const d of antiguas?.docs ?? []) porId.set(d.id, { ...aPagina(d.id, d.data()), ownerAccountId: accountUid });
    const delIndice = (indice?.docs ?? []).map((d) => d.id).filter((id) => !porId.has(id));
    const leidas = await Promise.all(delIndice.map((id) => getDoc(doc(db, 'pages', id)).catch(() => null)));
    for (const snap of leidas) {
      if (snap?.exists()) porId.set(snap.id, { ...aPagina(snap.id, snap.data()), ownerAccountId: accountUid });
    }
    return [...porId.values()].sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  },

  /**
   * Prepara la carpeta de fotos de una Página: el servidor escribe su propiedad (si es nueva, con un id nuevo) y
   * devuelve el `pageId`, para que el logo y la portada suban a `pages/<pageId>/`.
   */
  prepararFotos: async (pageId?: string): Promise<string> => {
    const fn = httpsCallable<{ prepare: true; pageId?: string }, { pageId: string }>(functions, 'savePage', { timeout: 30_000 });
    const r = await fn({ prepare: true, ...(pageId ? { pageId } : {}) });
    return r.data.pageId;
  },

  /** Sube el logo, la portada o una imagen de la obra a la carpeta de la Página. Solo la cuenta dueña puede (reglas de Storage). */
  subirFoto: async (pageId: string, uri: string, cual: 'logo' | 'cover' | 'gallery'): Promise<string> => {
    if (!storage) throw new Error('storage-sin-inicializar');
    const blob = await (await fetch(uri)).blob();
    if (blob.size > MAX_BYTES_DE_FOTO) throw new Error('foto-demasiado-grande');
    const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const destino = ref(storage, `pages/${pageId}/${cual}-${Date.now()}${Math.random().toString(36).slice(2, 8)}.${extension}`);
    await uploadBytes(destino, blob, { contentType });
    return getDownloadURL(destino);
  },

  /** Páginas publicadas para descubrir (las reglas solo dejan consultar las publicadas). */
  publicadas: async (max = 20): Promise<WeePage[]> => {
    const snap = await getDocs(query(collection(db, 'pages'), where('status', '==', 'published'), limit(max)));
    return snap.docs.map((d) => aPagina(d.id, d.data()));
  },

  /** Una Página. `ownerAccountId` solo viene si quien lee es su cuenta (o la Página es antigua y aún lo lleva). */
  leer: async (pageId: string): Promise<WeePage | null> => {
    const snap = await getDoc(doc(db, 'pages', pageId));
    if (!snap.exists()) return null;
    const pagina = aPagina(snap.id, snap.data());
    const duena = await duenaPrivada(pageId);
    return duena ? { ...pagina, ownerAccountId: duena } : pagina;
  },

  /** Crea o edita. `publish` la publica; si no, queda en borrador. */
  guardar: async (pagina: BorradorDePagina, opts: { pageId?: string; publish: boolean }): Promise<{ pageId: string; status: string }> => {
    const fn = httpsCallable<{ pageId?: string; page: BorradorDePagina; publish: boolean }, { pageId: string; status: string }>(functions, 'savePage', { timeout: 30_000 });
    const r = await fn({ pageId: opts.pageId, page: pagina, publish: opts.publish });
    return r.data;
  },

  /** ¿Sigue esta identidad (Perfil Real o Perfil Weë) a la página? Es aparte de ËContact/ẄContact. */
  laSigue: async (pageId: string, identidad: string): Promise<boolean> => {
    const snap = await getDoc(doc(db, 'pageFollows', `${pageId}_${identidad}`));
    return snap.exists();
  },

  seguir: async (pageId: string, identidad: string, seguir: boolean): Promise<boolean> => {
    const fn = httpsCallable<{ pageId: string; asIdentity: string; follow: boolean }, { following: boolean }>(functions, 'followPage', { timeout: 30_000 });
    const r = await fn({ pageId, asIdentity: identidad, follow: seguir });
    return r.data.following;
  },
};
