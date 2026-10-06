import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { assetsService, type AssetDoc } from './assetsService';
import type { PeticionDeMundo3D, TrabajoDeMundo3D } from './escena3d';

/**
 * WEË STUDIO · 3D WORLD — LA ÚNICA PUERTA DE LA APP A `generateWorld`.
 *
 * La puerta del servidor (`functions/src/creator/mundo.ts`) hace todo lo que cuesta o decide: valida la petición con
 * el contrato, lee la jurisdicción de la cuenta en el servidor, pregunta al Router, reserva los Credits, crea el
 * trabajo del conductor y contesta en cuanto existe. Aquí solo se habla con ella, y se escucha lo que ya es de la
 * persona:
 *
 *   · `cotizar`   el precio de esa petición, sin reservar nada;
 *   · `crear`     con el precio que se enseñó y un `requestId` por intento (UN request = UNA generación = UN cobro);
 *   · `estado`    cómo va, por su `requestId`, contado sin nada de dentro;
 *   · `cancelar`  pedir que pare; si el mundo llega antes, gana el mundo;
 *   · ESCUCHAR la reserva de Credits (`creditTransactions/usage_<requestId>`): el Credit Engine la deja en AUTHORIZED
 *     mientras el mundo se hace y la cierra en COMPLETED o REFUNDED. Es la fuente que ya existe y es de la persona —las
 *     reglas solo dejan leer las suyas—: no se pregunta cada tanto, se escucha y, cuando se cierra, se pregunta UNA vez.
 *
 * Ni un proveedor, ni un modelo, ni una clave: la app no sabe quién hace el mundo.
 */

export type EstadoDeReservaDelMundo = 'PENDING' | 'AUTHORIZED' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

const ESTADOS_DE_RESERVA: ReadonlySet<string> = new Set(['PENDING', 'AUTHORIZED', 'COMPLETED', 'FAILED', 'REFUNDED']);

/** El nombre de la reserva de una operación en el Credit Engine: una por requestId. */
const reservaDe = (requestId: string) => doc(db, 'creditTransactions', `usage_${requestId}`);

/* La puerta contesta en cuanto el trabajo existe; su propio plazo es de 120 s, y la app espera un poco más. */
const PLAZO_DE_LA_LLAMADA_MS = 130_000;

const llamar = async <T,>(datos: Record<string, unknown>): Promise<T> => {
  const fn = httpsCallable<Record<string, unknown>, T>(functions, 'generateWorld', { timeout: PLAZO_DE_LA_LLAMADA_MS });
  const r = await fn(datos);
  return r.data;
};

export interface CotizacionDelMundo {
  contract: string;
  status: 'QUOTED';
  credits: number;
}

/** Lo que contesta `crear`: el trabajo aceptado (o ya terminado), con lo que se reservó. */
export type CreacionDelMundo = TrabajoDeMundo3D & {
  status?: 'ACCEPTED' | 'COMPLETED';
  credits?: number;
  duplicate?: boolean;
};

export const mundoService = {
  cotizar: (peticion: PeticionDeMundo3D): Promise<CotizacionDelMundo> =>
    llamar<CotizacionDelMundo>({ op: 'cotizar', peticion }),

  crear: (peticion: PeticionDeMundo3D, requestId: string, creditosCotizados: number): Promise<CreacionDelMundo> =>
    llamar<CreacionDelMundo>({ op: 'crear', peticion, requestId, creditosCotizados }),

  estado: (requestId: string): Promise<TrabajoDeMundo3D> =>
    llamar<TrabajoDeMundo3D>({ op: 'estado', requestId }),

  cancelar: (requestId: string): Promise<TrabajoDeMundo3D> =>
    llamar<TrabajoDeMundo3D>({ op: 'cancelar', requestId }),

  /** Escuchar la reserva de un mundo mientras se hace. Devuelve cómo dejar de escuchar. */
  observarReserva: (requestId: string, alCambiar: (estado: EstadoDeReservaDelMundo | null) => void, alFallar: () => void): (() => void) =>
    onSnapshot(
      reservaDe(requestId),
      (snap) => {
        const estado = snap.exists() ? snap.data()?.status : null;
        alCambiar(typeof estado === 'string' && ESTADOS_DE_RESERVA.has(estado) ? (estado as EstadoDeReservaDelMundo) : null);
      },
      () => alFallar(),
    ),

  /** El material del mundo (de la cuenta): para su nombre, su archivo y sus derechos. `null` si no se puede leer. */
  material: async (assetId: string): Promise<AssetDoc | null> => {
    try {
      const snap = await getDoc(doc(db, 'assets', assetId));
      return snap.exists() ? (snap.data() as AssetDoc) : null;
    } catch {
      return null;
    }
  },

  /** La dirección con la que se descarga, con la regla de siempre de Mis creaciones. */
  urlDe: (material: AssetDoc | null): string | null => (material ? assetsService.urlDeEntrega(material) : null),
};
