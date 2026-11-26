import { useEffect, useState } from 'react';
import { tomaService } from '../services/tomaService';
import type { ProduccionGuardada } from '../services/filmmakerService';
import { leerMontaje, leerProduccion } from '../utils/estadoDeLaProduccion';
import type { MontajeLeido, ProduccionLeida } from '../utils/estadoDeLaProduccion';

/**
 * El estado de la producción para las etapas Producción y Juntar: UNA lectura de `shot.production` (y, si se pide, una de `shot.montage`) en vez de
 * una consulta por toma. Se relee cuando cambia la producción guardada o `version` (la sube la pantalla tras producir). Sin producción guardada, o con
 * `activo` apagado (demo, etapa cerrada), no pregunta nada.
 */
export const useEstadoDeLaProduccion = (guardada: ProduccionGuardada | null, activo: boolean, version = 0, conMontaje = false) => {
  const [produccion, setProduccion] = useState<ProduccionLeida | null>(null);
  const [montaje, setMontaje] = useState<MontajeLeido | null>(null);
  const id = guardada?.productionId ?? null;
  const revision = guardada?.revision ?? 0;
  useEffect(() => {
    if (!activo || !id) { setProduccion(null); setMontaje(null); return; }
    let vivo = true;
    void tomaService.produccion(id).then((d) => { if (vivo) setProduccion(leerProduccion(d)); });
    if (conMontaje) void tomaService.montaje(id, revision).then((d) => { if (vivo) setMontaje(leerMontaje(d)); });
    return () => { vivo = false; };
  }, [activo, id, revision, version, conMontaje]);
  return { produccion, montaje };
};
