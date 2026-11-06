/**
 * WeëPages en el cliente.
 *
 * Lee `pages`, `pageFollows` (las reglas dejan leer lo publicado y los borradores propios) y ESCRIBE solo a través de
 * las funciones `savePage` y `followPage` (functions/src/social/pages.ts): el dueño, el @usuario único y las fotos los
 * decide el servidor, nunca esta capa. Las imágenes suben por el camino de siempre (`creatorUploads`, carpeta de la
 * cuenta), que es el único que el servidor acepta.
 */
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import type { TipoDePagina } from '../constants/pageTypes';

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
  status: 'draft' | 'published';
  ownerAccountId: string;
  followersCount: number;
  /** Solo demo/semilla: imágenes que la página destaca. */
  featured?: string[];
  /** Escenas de la historia hechas con Weë AI (vídeo + póster), que cualquiera puede abrir y ver. */
  scenes?: { title: string; videoURL: string; posterURL: string }[];
  updatedAtMs?: number;
}

export type BorradorDePagina = Pick<WeePage, 'type' | 'name' | 'handle' | 'shortDescription' | 'about' | 'website' | 'location' | 'contact' | 'logoURL' | 'coverURL' | 'details'>;

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
  status: d.status === 'published' ? 'published' : 'draft',
  ownerAccountId: d.ownerAccountId,
  followersCount: typeof d.followersCount === 'number' ? d.followersCount : 0,
  featured: Array.isArray(d.featured) ? d.featured : undefined,
  scenes: Array.isArray(d.scenes) ? d.scenes.filter((e: any) => e && typeof e.videoURL === 'string') : undefined,
  updatedAtMs: d.updatedAt?.toMillis?.() ?? (typeof d.updatedAt === 'number' ? d.updatedAt : undefined),
});

/** El motivo que manda el servidor → la clave `pages.err_*` que lo explica. */
export const claveDelError = (error: unknown): string => {
  const motivo = String((error as { message?: string })?.message ?? '');
  if (motivo === 'handle-ocupado') return 'pages.err_handleTaken';
  if (['nombre', 'handle', 'web', 'foto', 'larga'].includes(motivo)) return `pages.err_${motivo}`;
  return 'pages.err_generic';
};

export const pagesService = {
  /** Las Páginas de la CUENTA (las mismas desde el Perfil Real y desde el Perfil Weë). */
  mias: async (accountUid: string): Promise<WeePage[]> => {
    const snap = await getDocs(query(collection(db, 'pages'), where('ownerAccountId', '==', accountUid)));
    return snap.docs.map((d) => aPagina(d.id, d.data())).sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  },

  /** Páginas publicadas para descubrir (las reglas solo dejan consultar las publicadas). */
  publicadas: async (max = 20): Promise<WeePage[]> => {
    const snap = await getDocs(query(collection(db, 'pages'), where('status', '==', 'published'), limit(max)));
    return snap.docs.map((d) => aPagina(d.id, d.data()));
  },

  leer: async (pageId: string): Promise<WeePage | null> => {
    const snap = await getDoc(doc(db, 'pages', pageId));
    return snap.exists() ? aPagina(snap.id, snap.data()) : null;
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
