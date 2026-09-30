import {
  collection,
  doc,
  getDoc,
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

/** Fase 36 del motor: cómo está un material de la cuenta, para enseñarlo como referencia de una producción. */
export type MaterialComoReferencia =
  | { readonly estado: 'listo'; readonly miniatura: string | null }
  | { readonly estado: 'retirado' }
  | { readonly estado: 'desconocido' };

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

/**
 * 3D dentro de Filmmaker: el permiso para mandar los bytes de un modelo, tal como lo da la puerta `models3d`. Lleva a
 * dónde, cómo y con qué cabeceras —van dentro de la firma—, hasta cuándo vale y el material que va a quedar completo.
 * Ninguna credencial, ningún contenedor y ningún proveedor.
 */
export interface SubidaDeModelo {
  readonly assetId: string;
  readonly url: string;
  readonly metodo: 'PUT' | 'POST';
  readonly cabeceras: Readonly<Record<string, string>>;
  readonly maxBytes: number;
  readonly expiraEn: number;
}

/** Lo que contesta la puerta de los modelos 3D; `sin_respuesta` es que no se pudo preguntar (o que no está desplegada). */
export type RespuestaDeModelos =
  | { readonly ok: true; readonly subida: SubidaDeModelo }
  | { readonly ok: true; readonly assetId: string; readonly bytes: number }
  | { readonly ok: false; readonly motivo: 'cerrada' | 'no_disponible' | 'pendiente' | 'peticion_invalida' | 'sin_respuesta'; readonly detalle?: string };

export type EnvioDeModelo = 'ok' | 'fallo' | 'cancelado';

/**
 * 3D dentro de Filmmaker: con qué dirección se VE un modelo de la cuenta. La de su entrega, si la tiene (lo guardado
 * en el almacén de Weë); si vive en Media Cloud, una llave temporal que da la puerta `models3d` —y mientras esa entrega
 * no esté activa, `sin_entrega`—. Todavía llegando, retirado o que no se pudo saber, también se dice.
 */
export type DireccionDeModelo =
  | { readonly estado: 'lista'; readonly url: string }
  | { readonly estado: 'sin_entrega' }
  | { readonly estado: 'llegando' }
  | { readonly estado: 'retirado' }
  | { readonly estado: 'desconocido' };

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
   * CÓMO ESTÁ UN MATERIAL (Fase 36 del motor): sigue —con su miniatura, si la
   * hay—, se retiró, o no se pudo saber. Solo lectura de la propia cuenta; lo
   * usan las referencias de una producción para enseñarse.
   */
  vistaDelMaterial: async (assetId: string): Promise<MaterialComoReferencia> => {
    try {
      const snap = await getDoc(doc(db, 'assets', assetId));
      if (!snap.exists()) return { estado: 'retirado' };
      const a = snap.data() as AssetDoc;
      if (a.status === 'deleted') return { estado: 'retirado' };
      return { estado: 'listo', miniatura: assetsService.miniatura(a)?.url ?? null };
    } catch {
      return { estado: 'desconocido' };
    }
  },

  /**
   * Retirar una creación propia. El servidor comprueba que es tuya, marca la
   * ficha y borra el objeto; de una ajena contesta que no existe.
   */
  eliminar: async (assetId: string): Promise<{ assetId: string; status: 'deleted'; already: boolean; pendingPhysicalDeletion?: boolean }> =>
    call('deleteAsset', { assetId }),

  /*
   * 3D DENTRO DE FILMMAKER · IMPORTAR UN MODELO 3D, por la puerta `models3d` del servidor (preparada y cerrada:
   * mientras no esté desplegada y abierta para la cuenta, contesta que no, y la app lo enseña cerrado). De aquí solo
   * sale la clave de la operación, lo que pesa, el nombre y las piezas que se contaron: el tipo, el formato, el dueño
   * y dónde van los bytes los pone el servidor.
   */

  /**
   * CON QUÉ SE VE UN MODELO 3D DE LA CUENTA. Solo lectura de la propia cuenta (las reglas lo dicen). Se pide cada vez
   * que se va a ver: una llave de Media Cloud caduca en minutos y no se guarda en ninguna parte.
   */
  direccionDelModelo: async (assetId: string): Promise<DireccionDeModelo> => {
    let a: AssetDoc;
    try {
      const snap = await getDoc(doc(db, 'assets', assetId));
      if (!snap.exists()) return { estado: 'retirado' };
      a = snap.data() as AssetDoc;
    } catch {
      return { estado: 'desconocido' };
    }
    if (a.status === 'deleted') return { estado: 'retirado' };
    if (a.kind !== 'model3d') return { estado: 'desconocido' };
    const url = assetsService.urlDeEntrega(a);
    if (url) return { estado: 'lista', url };
    if (a.status !== 'ready') return { estado: 'llegando' };
    try {
      const r = await call<{ ok?: boolean; url?: unknown }>('models3d', { op: 'entregar', assetId });
      return r?.ok === true && typeof r.url === 'string' ? { estado: 'lista', url: r.url } : { estado: 'sin_entrega' };
    } catch {
      return { estado: 'sin_entrega' };
    }
  },

  /** ¿Puede importar modelos esta cuenta? Cualquier cosa que no sea un «sí» del servidor es un no. */
  importacionDeModelosAbierta: async (): Promise<boolean> => {
    try {
      const r = await call<{ ok?: boolean; importar?: boolean }>('models3d', { op: 'estado' });
      return r?.ok === true && r.importar === true;
    } catch {
      return false;
    }
  },

  pedirSubidaDeModelo: async (p: {
    readonly operationId: string;
    readonly bytes: number;
    readonly nombre: string;
    readonly metadatos: Readonly<Record<string, number>>;
  }): Promise<RespuestaDeModelos> => {
    try {
      const r = await call<Record<string, unknown>>('models3d', { op: 'pedir_subida', ...p });
      if (r?.ok === true && r.subida && typeof r.subida === 'object') return { ok: true, subida: r.subida as SubidaDeModelo };
      return respuestaFallida(r);
    } catch {
      return { ok: false, motivo: 'sin_respuesta' };
    }
  },

  confirmarSubidaDeModelo: async (operationId: string): Promise<RespuestaDeModelos> => {
    try {
      const r = await call<Record<string, unknown>>('models3d', { op: 'confirmar_subida', operationId });
      if (r?.ok === true && typeof r.assetId === 'string') return { ok: true, assetId: r.assetId, bytes: Number(r.bytes) || 0 };
      return respuestaFallida(r);
    } catch {
      return { ok: false, motivo: 'sin_respuesta' };
    }
  },

  /**
   * LOS BYTES, DIRECTOS AL ALMACÉN: no pasan por Weë (MC-3). Con las cabeceras que dio la puerta, tal cual —van
   * dentro de la firma—, y avisando de cuánto va. Si la subida se corta, se vuelve a pedir con la MISMA clave y el
   * destino es el mismo: no se duplica nada.
   */
  enviarModelo: (
    subida: SubidaDeModelo,
    archivo: Blob,
    alAvanzar: (fraccion: number) => void,
    senal?: AbortSignal,
  ): Promise<EnvioDeModelo> =>
    new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open(subida.metodo, subida.url);
      for (const [nombre, valor] of Object.entries(subida.cabeceras)) xhr.setRequestHeader(nombre, valor);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) alAvanzar(e.loaded / e.total); };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? 'ok' : 'fallo');
      xhr.onerror = () => resolve('fallo');
      xhr.onabort = () => resolve('cancelado');
      if (senal) {
        if (senal.aborted) { resolve('cancelado'); return; }
        senal.addEventListener('abort', () => xhr.abort());
      }
      xhr.send(archivo);
    }),
};

/** Lo que dijo la puerta cuando no fue un sí, con los motivos que la app sabe decir; lo demás, que no se pudo. */
const respuestaFallida = (r: Record<string, unknown> | undefined): RespuestaDeModelos => {
  const motivo = r?.motivo;
  if (motivo === 'cerrada' || motivo === 'no_disponible' || motivo === 'pendiente' || motivo === 'peticion_invalida') {
    return { ok: false, motivo, ...(typeof r?.detalle === 'string' ? { detalle: r.detalle } : {}) };
  }
  return { ok: false, motivo: 'sin_respuesta' };
};
