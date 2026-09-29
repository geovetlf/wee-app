import { useEffect, useState } from 'react';
import { filmmakerService, type VersionDeProduccion } from '../services/filmmakerService';

/**
 * WEË FILMMAKER · FASE 20 · LAS VERSIONES DE UNA PRODUCCIÓN, para enseñarlas.
 *
 * Las lee el servidor del registro de la producción (`productions`, `history`):
 * las más recientes primero y con tope, sin foto ni operaciones. Se vuelven a
 * pedir cuando cambia la revisión guardada —un lote, una restauración—, y lo
 * que llega de una revisión anterior no se pinta. Volver a una la hace el
 * controlador de la producción, no esto.
 */
export type CargaDelHistorial = 'cargando' | 'listo' | 'error';

export interface HistorialDeProduccion {
  readonly carga: CargaDelHistorial;
  readonly versiones: readonly VersionDeProduccion[];
}

export const useHistorialDeProduccion = (productionId: string | null, revision: number | null): HistorialDeProduccion => {
  const [historial, setHistorial] = useState<HistorialDeProduccion>({ carga: 'cargando', versiones: [] });
  useEffect(() => {
    let vigente = true;
    if (!productionId || revision === null) {
      setHistorial({ carga: 'cargando', versiones: [] });
      return () => { vigente = false; };
    }
    void (async () => {
      const r = await filmmakerService.historyOfProduction(productionId);
      if (!vigente) return;
      setHistorial(r.ok ? { carga: 'listo', versiones: r.valor } : { carga: 'error', versiones: [] });
    })();
    return () => { vigente = false; };
  }, [productionId, revision]);
  return historial;
};
