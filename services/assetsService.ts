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
import {
  AssetDoc, AssetKind, AssetStatus, Representacion,
  ESTADOS_QUE_SE_LISTAN, representacionPara,
} from './vistaDeAsset';

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

/*
 * La forma del material y lo que se ve de él viven en `vistaDeAsset`, que es
 * puro y no sabe de Firebase. Aquí se vuelven a exportar para que nadie tenga
 * que cambiar sus imports, y porque este sigue siendo el sitio por el que se
 * pide una creación.
 */
export type {
  AssetKind, AssetStatus, AssetDoc, AssetVariant, AssetProvenance, StorageRef,
  EstadoVisible, OrigenDeMaterial, Representacion, ModoDeEntrega, VistaDeMaterial, GeneracionVisible,
} from './vistaDeAsset';
export {
  estadoVisible, origenDe, representacionPara, modoDeEntrega, vistaDeAsset,
  CLAVE_DE_ESTADO, CLAVE_DE_TIPO,
} from './vistaDeAsset';

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
      where('status', 'in', ESTADOS_QUE_SE_LISTAN),
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

  /**
   * CON QUÉ SE PINTA UNA MINIATURA, Y SI LO QUE SE DA ES EL ORIGINAL.
   *
   * ── El error que había aquí, y por qué no era un descuido ─────────────────
   *
   * La versión anterior buscaba la miniatura entre las variantes y luego
   * devolvía lo mismo en las dos ramas: la entrega del ORIGINAL. El `find` se
   * calculaba y se tiraba. No era un typo — era que **una variante no tiene
   * entrega propia**: `AssetVariant` guarda su `storageRef`, y una referencia
   * de almacén no se convierte en URL en el cliente. Quien la convierte es la
   * capa de entrega, que sabe de proveedores y de caducidades. Sin eso, no
   * había forma de enseñar una miniatura, y el código lo disimulaba.
   *
   * La consecuencia se pagaba de verdad: una rejilla de veinticuatro creaciones
   * se bajaba veinticuatro ORIGINALES. En móvil, eso son megas por pantalla.
   *
   * ── Lo que hace ahora ─────────────────────────────────────────────────────
   *
   * Elige la representación con la ÚNICA función que decide eso
   * (`representacionPara`, espejo del Core) y dice honestamente qué está
   * devolviendo. Mientras la entrega de variantes no exista, `esElOriginal` es
   * `true` y quien pinta lo sabe; el día que exista, esto devolverá la
   * miniatura de verdad sin que la interfaz cambie.
   *
   * Nunca se inventa una transformación ni se construye una URL desde una
   * `StorageRef`.
   */
  miniatura: (a: AssetDoc): { url: string; esElOriginal: boolean } | null => {
    const elegida: Representacion | undefined = representacionPara(a, 'miniatura');
    const url = assetsService.urlDeEntrega(a);
    if (!elegida || !url) return null;
    /*
     * La única dirección guardada es la del original. Si `elegida` fuese una
     * variante, seguiría sin poder entregarse, así que lo que se devuelve es el
     * original —y se dice—. El día que las variantes tengan entrega, este
     * `esElOriginal` pasará a `false` solo y la interfaz no cambia.
     */
    return { url, esElOriginal: true };
  },

  /**
   * Retirar una creación propia. El servidor comprueba que es tuya, marca la
   * ficha y borra el objeto; de una ajena contesta que no existe.
   */
  eliminar: async (assetId: string): Promise<{ assetId: string; status: 'deleted'; already: boolean; pendingPhysicalDeletion?: boolean }> =>
    call('deleteAsset', { assetId }),
};
