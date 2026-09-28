import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { assetsService, type AssetDoc } from './assetsService';
import type { EstadoDeReserva, RechazoDeToma, ResultadoDeToma, ResultadoDelEnlace } from '../utils/controladorDeToma';

/**
 * WEË FILMMAKER · LO QUE PASA CON UNA TOMA DESPUÉS DE PEDIRLA (F1-D).
 *
 * Cuatro cosas, y ninguna genera ni cobra:
 *
 *   · ESCUCHAR la reserva de Credits de la toma. El Credit Engine la deja en
 *     AUTHORIZED mientras el vídeo se hace y la cierra en COMPLETED o en
 *     REFUNDED. Es la fuente que ya existe y es de la persona —las reglas solo
 *     dejan leer las suyas—: aquí no se inventa un estado ni se pregunta cada
 *     tanto, se escucha el documento mientras la toma está en marcha;
 *   · pedirle al servidor que ponga el resultado en SU plano (`shots`,
 *     `shot.result`). La app dice qué toma de qué plano; la cuenta, la
 *     operación, el material y si el plano sigue siendo el mismo los comprueba
 *     el servidor;
 *   · leer la dirección del vídeo con la regla de siempre de Mis creaciones
 *     (`assetsService.urlDeEntrega`);
 *   · preguntarle al servidor qué plano de la producción tiene puesto qué vídeo
 *     (`shots`, `shot.videos`), para que cada tarjeta del storyboard enseñe el suyo;
 *   · y, desde la Fase 11 del motor, los PÓSTERS de esos vídeos (`renders`,
 *     `poster.request`): una imagen fija de cada uno, con la dirección que calcula
 *     el servidor. Pedirlos no cuesta Credits y es idempotente.
 */

/** El nombre de la reserva de una operación en el Credit Engine: una por requestId. */
const reservaDe = (requestId: string) => doc(db, 'creditTransactions', `usage_${requestId}`);

const ESTADOS: ReadonlySet<string> = new Set(['PENDING', 'AUTHORIZED', 'COMPLETED', 'FAILED', 'REFUNDED']);

const rechazoDe = (error: unknown): RechazoDeToma => {
  const sdk = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : '';
  if (/unavailable|deadline-exceeded|network/.test(sdk)) return { motivo: 'network' };
  if (/unauthenticated/.test(sdk)) return { motivo: 'session_required' };
  return { motivo: 'unknown' };
};

export interface TomaDeUnPlano {
  productionId: string;
  sceneId: string;
  unitId: string;
  take: number;
}

export const tomaService = {
  /**
   * Escuchar la reserva de una toma. Devuelve cómo dejar de escuchar. Con el
   * estado va lo que hace falta para los tres números —lo reservado y lo
   * cobrado—, y nada más del documento.
   */
  observarReserva: (
    requestId: string,
    alCambiar: (estado: EstadoDeReserva | null, reserva?: { status?: unknown; amount?: unknown; finalAmount?: unknown } | null) => void,
    alFallar: () => void,
  ): (() => void) =>
    onSnapshot(
      reservaDe(requestId),
      (snap) => {
        const d = snap.exists() ? snap.data() : undefined;
        const estado = d?.status;
        const valido = typeof estado === 'string' && ESTADOS.has(estado) ? (estado as EstadoDeReserva) : null;
        alCambiar(valido, d && valido ? { status: valido, amount: d.amount, finalAmount: d.finalAmount } : null);
      },
      () => alFallar(),
    ),

  /** Que el servidor ponga el vídeo de esa toma en su plano, si todo cuadra. */
  enlazar: async (toma: TomaDeUnPlano): Promise<ResultadoDeToma<ResultadoDelEnlace>> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { result: ResultadoDelEnlace }>(functions, 'shots', { timeout: 60_000 });
      const r = await fn({ op: 'shot.result', ...toma });
      return { ok: true, valor: r.data.result };
    } catch (error) {
      return { ok: false, rechazo: rechazoDe(error) };
    }
  },

  /**
   * Qué plano de la producción tiene puesto qué vídeo. Lo calcula el servidor
   * —el nombre del plano del Core solo lo sabe él—; de una producción ajena o
   * inexistente contesta que ninguno. Si no se puede preguntar, tampoco hay.
   */
  videosDeLaProduccion: async (productionId: string): Promise<readonly { unitId: string; producedAssetId: string }[]> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { videos?: { unitId?: unknown; producedAssetId?: unknown }[] }>(functions, 'shots', { timeout: 60_000 });
      const r = await fn({ op: 'shot.videos', productionId });
      return (r.data.videos ?? [])
        .filter((x): x is { unitId: string; producedAssetId: string } => typeof x?.unitId === 'string' && typeof x?.producedAssetId === 'string');
    } catch {
      return [];
    }
  },

  /** La dirección con la que se ve un material de la cuenta, o `null` si no la hay. */
  urlDelMaterial: async (assetId: string): Promise<string | null> => {
    try {
      const snap = await getDoc(doc(db, 'assets', assetId));
      return snap.exists() ? assetsService.urlDeEntrega(snap.data() as AssetDoc) : null;
    } catch {
      return null;
    }
  },

  /**
   * LOS PÓSTERS DE LOS VÍDEOS DE UNA PRODUCCIÓN: de cada material, la dirección de
   * su imagen fija, si ya la tiene. Le pide al servidor los que falten —él decide
   * cuáles, de qué vídeos y si puede— y se queda solo con los que están y traen
   * dirección. Si no se puede preguntar, ninguno: la tarjeta enseña el vídeo como antes.
   */
  postersDeLaProduccion: async (productionId: string): Promise<ReadonlyMap<string, string>> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { posters?: { assetId?: unknown; state?: unknown; url?: unknown }[] }>(functions, 'renders', { timeout: 60_000 });
      const r = await fn({ op: 'poster.request', productionId });
      return new Map((r.data.posters ?? [])
        .filter((p): p is { assetId: string; state: 'ready'; url: string } => typeof p?.assetId === 'string' && p?.state === 'ready' && typeof p?.url === 'string' && /^https?:\/\//.test(p.url))
        .map((p) => [p.assetId, p.url] as const));
    } catch {
      return new Map();
    }
  },
};
