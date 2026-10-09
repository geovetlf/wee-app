import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * La disponibilidad REAL de capacidades para la cuenta de la sesión (DEC-06): la dice el servidor, no el catálogo.
 * Solo lee: no cobra, no reserva cupo, no genera nada. Quien la pide sin respuesta debe cerrar (no disponible).
 */
export const disponibilidadService = {
  consultar: async (capacidades: readonly string[]): Promise<Record<string, boolean>> => {
    const llamada = httpsCallable<{ capacidades: string[] }, { capacidades: { capacidad: string; disponible: boolean }[] }>(
      functions,
      'disponibilidadDeCapacidades',
    );
    const { data } = await llamada({ capacidades: [...capacidades] });
    return Object.fromEntries(data.capacidades.map((x) => [x.capacidad, x.disponible === true]));
  },
};
