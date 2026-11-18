import { useEffect, useState } from 'react';
import { videoService } from '../services/videoService';

export interface EntradasDelModelo { readonly referencias: boolean; readonly fotogramas: boolean; readonly extender: boolean; readonly editar: boolean }
const CERRADO: EntradasDelModelo = Object.freeze({ referencias: false, fotogramas: false, extender: false, editar: false });
let guardado: Map<string, EntradasDelModelo> | null = null;

/**
 * LO QUE EL SERVIDOR DICE QUE CADA MODELO PUEDE HOY (`generateVideo({ capacidades: true })`): solo lectura, sin cupo ni coste. Sin respuesta (sin sesión,
 * sin red, error) todo sale CERRADO: nunca se abre una entrada por suposición. Se lee una vez por sesión.
 */
export const useCapacidadesDeVideo = () => {
  const [mapa, setMapa] = useState<Map<string, EntradasDelModelo> | null>(guardado);
  useEffect(() => {
    if (guardado) return;
    let vivo = true;
    void videoService.capacidades().then((r) => {
      if (!vivo || !r.ok) return;
      guardado = new Map(r.valor.models.map((m) => [m.modeloId, m.available]));
      setMapa(guardado);
    }).catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  return { leido: mapa !== null, entradasDe: (idServidor?: string): EntradasDelModelo => (idServidor && mapa?.get(idServidor)) || CERRADO };
};
