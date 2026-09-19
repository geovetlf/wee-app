import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';

/**
 * Mis creaciones — el material de la CUENTA.
 *
 * Lee la colección `assets` que escribe el servidor (functions/src/content) y
 * pide borrar por el callable que comprueba que es tuyo antes de tocar el
 * objeto. Aquí no se escribe nada: la ficha de un material la crea quien sabe
 * de quién es, y eso lo sabe la sesión del servidor, no un documento del
 * cliente.
 *
 * ── De la cuenta, no de la cara ────────────────────────────────────────────
 *
 * Se consulta por `ownerAccountId == user.uid`. El Perfil Real y el Perfil Weë
 * ven exactamente lo mismo, porque lo que se genera es de la cuenta. No hay
 * una biblioteca por perfil ni la va a haber.
 *
 * ── Paginación por cursor ──────────────────────────────────────────────────
 *
 * Nunca se pide la colección entera. Cada página trae el cursor de la
 * siguiente, y el filtro por tipo y el orden van en la consulta —no en un
 * `.filter()` sobre lo descargado—, con sus índices declarados en
 * `firestore.indexes.json`.
 */

export type AssetKind = 'text' | 'image' | 'video' | 'audio' | 'document' | 'model3d';
export type AssetStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';

export interface AssetProvenance {
  createdAt: number;
  generationId?: string;
  jobId?: string;
  stepId?: string;
  requestId?: string;
  capability?: string;
  provider?: string;
}

export interface AssetVariant {
  kind: 'thumbnail' | 'poster' | 'preview' | 'transcoded';
  storageRef: { provider: string; bucket?: string; objectKey: string; version?: string };
  width?: number;
  height?: number;
}

/** Lo que el servidor guarda en `assets/{assetId}`. Espejo de `functions/src/content` — se lee, no se escribe. */
export interface AssetDoc {
  assetId: string;
  ownerAccountId: string;
  kind: AssetKind;
  status: AssetStatus;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  name?: string;
  variants?: AssetVariant[];
  provenance: AssetProvenance;
  /** Libre y acotado: de qué experiencia salió, y poco más. */
  metadata?: Record<string, string | number | boolean>;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  /** La URL de entrega. Caché, no identidad: puede cambiar sin que el material cambie. */
  delivery?: { url: string; kind: 'bearer_token' | 'public' };
  pendingPhysicalDeletion?: boolean;
}

export type OrdenDeCreaciones = 'recent' | 'oldest';

export interface FiltroDeCreaciones {
  kind?: AssetKind;
  orden?: OrdenDeCreaciones;
}

export interface PaginaDeCreaciones {
  items: AssetDoc[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hayMas: boolean;
}

export const CREACIONES_POR_PAGINA = 24;

/* Lo que se enseña: lo listo, lo que se está procesando y lo que falló. Lo retirado, no. */
const VISIBLES: AssetStatus[] = ['ready', 'processing', 'failed', 'uploading'];

const assets = () => collection(db, 'assets');

const call = async <T,>(name: string, data: Record<string, unknown>): Promise<T> => {
  const fn = httpsCallable(functions, name, { timeout: 60_000 });
  const res = await fn(data);
  return res.data as T;
};

export const assetsService = {
  /**
   * Una página de creaciones de la cuenta. Con `cursor`, la siguiente.
   *
   * `hayMas` se decide pidiendo uno de más: si viene, hay otra página y se
   * descarta el sobrante. Es la única forma de saberlo sin una consulta extra.
   */
  listar: async (
    accountUid: string,
    filtro: FiltroDeCreaciones = {},
    cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  ): Promise<PaginaDeCreaciones> => {
    const partes = [
      where('ownerAccountId', '==', accountUid),
      where('status', 'in', VISIBLES),
      ...(filtro.kind ? [where('kind', '==', filtro.kind)] : []),
      orderBy('createdAt', filtro.orden === 'oldest' ? 'asc' : 'desc'),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(CREACIONES_POR_PAGINA + 1),
    ];
    const snap = await getDocs(query(assets(), ...partes));
    const docs = snap.docs;
    const hayMas = docs.length > CREACIONES_POR_PAGINA;
    const pagina = hayMas ? docs.slice(0, CREACIONES_POR_PAGINA) : docs;
    return {
      items: pagina.map((d) => d.data() as AssetDoc),
      cursor: pagina.length > 0 ? pagina[pagina.length - 1] : null,
      hayMas,
    };
  },

  /** La URL con la que se enseña. Puede no haberla todavía (subiendo, procesando) o ya no (retirada). */
  urlDeEntrega: (a: AssetDoc): string | null => (a.status === 'deleted' ? null : a.delivery?.url ?? null),

  /** La miniatura si el servidor hizo una; si no, la entrega. Nunca se inventa una transformación. */
  urlDeMiniatura: (a: AssetDoc): string | null => {
    const miniatura = a.variants?.find((v) => v.kind === 'thumbnail' || v.kind === 'poster');
    /* Una variante se enseña por su propia entrega, que hoy no se guarda: se cae a la entrega del original. */
    return miniatura ? assetsService.urlDeEntrega(a) : assetsService.urlDeEntrega(a);
  },

  /**
   * Retirar una creación propia. El servidor comprueba que es tuya, marca la
   * ficha y borra el objeto; de una ajena contesta que no existe.
   */
  eliminar: async (assetId: string): Promise<{ assetId: string; status: 'deleted'; already: boolean; pendingPhysicalDeletion?: boolean }> =>
    call('deleteAsset', { assetId }),
};
