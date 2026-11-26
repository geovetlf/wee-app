import { useEffect, useState } from 'react';
import { videoService } from '../services/videoService';

export interface EntradasDelModelo { readonly referencias: boolean; readonly fotogramas: boolean; readonly extender: boolean; readonly editar: boolean }
export interface OpcionesDelServidor {
  readonly entradas: EntradasDelModelo;
  /** Solo `true` abre la semilla: `no`, `no_implementado` y `no_verificado` la dejan cerrada. */
  readonly semilla: boolean;
  /** Tope de variantes que el servidor acepta guardar (1 si no lo dice). */
  readonly variantesMax: number;
}
const CERRADO: EntradasDelModelo = Object.freeze({ referencias: false, fotogramas: false, extender: false, editar: false });
const SIN_DATOS: OpcionesDelServidor = Object.freeze({ entradas: CERRADO, semilla: false, variantesMax: 1 });
let guardado: Map<string, OpcionesDelServidor> | null = null;

/**
 * LO QUE EL SERVIDOR DICE QUE CADA MODELO PUEDE HOY (`generateVideo({ capacidades: true })`): solo lectura, sin cupo ni coste. Sin respuesta (sin sesión,
 * sin red, error) todo sale CERRADO: nunca se abre una opción por suposición. Se lee una vez por sesión.
 */
export const useCapacidadesDeVideo = () => {
  const [mapa, setMapa] = useState<Map<string, OpcionesDelServidor> | null>(guardado);
  useEffect(() => {
    if (guardado) return;
    let vivo = true;
    void videoService.capacidades().then((r) => {
      if (!vivo || !r.ok) return;
      guardado = new Map(r.valor.models.map((m) => [m.modeloId, {
        entradas: m.available,
        semilla: m.options?.semilla === 'si',
        variantesMax: Math.max(1, Math.min(4, Number(m.variantes?.max ?? m.options?.variantes?.max ?? 1) || 1)),
      }]));
      setMapa(guardado);
    }).catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  return {
    leido: mapa !== null,
    opcionesDe: (idServidor?: string): OpcionesDelServidor => (idServidor && mapa?.get(idServidor)) || SIN_DATOS,
    entradasDe: (idServidor?: string): EntradasDelModelo => ((idServidor && mapa?.get(idServidor)) || SIN_DATOS).entradas,
  };
};
