import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { assetsService, type AssetDoc } from './assetsService';
import type { EstadoDeReserva, RechazoDeToma, ResultadoDeToma, ResultadoDelEnlace } from '../utils/controladorDeToma';

/**
 * WEË FILMMAKER · LO QUE PASA CON UNA TOMA DESPUÉS DE PEDIRLA (F1-D).
 *
 * Tres cosas, y ninguna genera ni cobra:
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
 *     (`assetsService.urlDeEntrega`).
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
  /** Escuchar la reserva de una toma mientras se hace. Devuelve cómo dejar de escuchar. */
  observarReserva: (requestId: string, alCambiar: (estado: EstadoDeReserva | null) => void, alFallar: () => void): (() => void) =>
    onSnapshot(
      reservaDe(requestId),
      (snap) => {
        const estado = snap.exists() ? snap.data()?.status : null;
        alCambiar(typeof estado === 'string' && ESTADOS.has(estado) ? (estado as EstadoDeReserva) : null);
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

  /** La dirección con la que se ve un material de la cuenta, o `null` si no la hay. */
  urlDelMaterial: async (assetId: string): Promise<string | null> => {
    try {
      const snap = await getDoc(doc(db, 'assets', assetId));
      return snap.exists() ? assetsService.urlDeEntrega(snap.data() as AssetDoc) : null;
    } catch {
      return null;
    }
  },
};
