import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { videoService } from '../services/videoService';
import type { ProduccionGuardada } from '../services/filmmakerService';
import type { CalidadDeToma, PeticionDeLote, PresupuestoDelLote, RechazoDeToma, ResultadoDelLote } from '../utils/controladorDeToma';

/** Cómo va la producción entera: sin mirar, mirando, mirada, empezando, empezada o no. */
export type FaseDelLote =
  | { readonly fase: 'quieto' }
  | { readonly fase: 'presupuestando' }
  | { readonly fase: 'presupuesto'; readonly presupuesto: PresupuestoDelLote; readonly precioCambiado?: boolean }
  | { readonly fase: 'generando'; readonly presupuesto: PresupuestoDelLote }
  | { readonly fase: 'hecho'; readonly presupuesto: PresupuestoDelLote; readonly resultado: ResultadoDelLote }
  | { readonly fase: 'rechazada'; readonly rechazo: RechazoDeToma };

export interface LoteDeTomas {
  readonly fase: FaseDelLote;
  readonly calidad: CalidadDeToma;
  /** Se puede mirar: hay una producción guardada y nada sin guardar ni en curso. */
  readonly disponible: boolean;
  /** Si no caben todas las unidades en un lote, cuántas van (las primeras que faltan); si caben, `null`. */
  readonly recortado: number | null;
  readonly elegirCalidad: (calidad: CalidadDeToma) => void;
  readonly presupuestar: () => void;
  readonly generar: () => void;
}

/**
 * LA PRODUCCIÓN ENTERA, ATADA A REACT (Filmmaker Engine, Fase 29: el lote de la Fase 6, en la app).
 *
 * El segundo y último sitio de la app que usa `videoService`, junto a la toma de UN plano (`useTomaDePlano`): el
 * servidor ya generaba varias unidades a la vez —cada una entra por la puerta de la toma suelta, con su precio, su
 * cupo y su reserva— y la app enseñaba «Generar» apagado y el coste «pendiente». Aquí, primero se MIRA —el
 * presupuesto: qué pasaría con cada unidad, el total y si hay saldo; no toca nada— y solo después se genera, por el
 * total que se enseñó; si cambió, el servidor no empieza ninguna y se vuelve a mirar. Nada se cuenta, se cobra ni
 * se inventa aquí, y no hay relojes.
 *
 * Lo mirado es de una revisión, una calidad y unas unidades: si cambia cualquiera, ya no vale y se vuelve a
 * empezar. Sobre lo GUARDADO: con cambios sin guardar no se mira ni se genera, porque se generaría una cosa y se
 * vería otra.
 */
export const useLoteDeTomas = (
  guardada: ProduccionGuardada | null,
  bloqueado: boolean,
  unidades?: readonly string[],
  recortado: number | null = null,
): LoteDeTomas => {
  const [calidad, setCalidad] = useState<CalidadDeToma>('standard');
  const [fase, setFase] = useState<FaseDelLote>({ fase: 'quieto' });
  const peticion = useRef(0);
  const productionId = guardada?.productionId ?? null;
  const revision = guardada?.revision ?? null;
  const cuales = unidades ? unidades.join(',') : '';

  useEffect(() => {
    peticion.current++;
    setFase({ fase: 'quieto' });
  }, [productionId, revision, cuales]);

  const disponible = !!productionId && revision !== null && !bloqueado;
  const lote = useMemo<PeticionDeLote | null>(() => (productionId && revision !== null
    ? { productionId, revision, quality: calidad, ...(cuales ? { units: cuales.split(',') } : {}) }
    : null), [productionId, revision, calidad, cuales]);

  const presupuestar = useCallback(() => {
    if (!disponible || !lote) return;
    const esta = ++peticion.current;
    setFase({ fase: 'presupuestando' });
    void videoService.quoteBatch(lote).then((r) => {
      if (esta !== peticion.current) return;
      setFase(r.ok ? { fase: 'presupuesto', presupuesto: r.valor } : { fase: 'rechazada', rechazo: r.rechazo });
    });
  }, [disponible, lote]);

  const generar = useCallback(() => {
    if (!disponible || !lote || fase.fase !== 'presupuesto' || fase.presupuesto.total.units === 0) return;
    const presupuesto = fase.presupuesto;
    const esta = ++peticion.current;
    setFase({ fase: 'generando', presupuesto });
    void videoService.generateBatch(lote, presupuesto.total.credits).then(async (r) => {
      if (esta !== peticion.current) return;
      if (r.ok) { setFase({ fase: 'hecho', presupuesto, resultado: r.valor }); return; }
      if (r.rechazo.motivo === 'price_changed') {
        /* El precio cambió: no se empezó ninguna. Se vuelve a mirar y se dice; nada se genera por un precio que no se enseñó. */
        const q = await videoService.quoteBatch(lote);
        if (esta !== peticion.current) return;
        setFase(q.ok ? { fase: 'presupuesto', presupuesto: q.valor, precioCambiado: true } : { fase: 'rechazada', rechazo: q.rechazo });
        return;
      }
      setFase({ fase: 'rechazada', rechazo: r.rechazo });
    });
  }, [disponible, lote, fase]);

  const elegirCalidad = useCallback((nueva: CalidadDeToma) => {
    if (nueva === calidad) return;
    peticion.current++;
    setCalidad(nueva);
    setFase({ fase: 'quieto' });
  }, [calidad]);

  return { fase, calidad, disponible, recortado, elegirCalidad, presupuestar, generar };
};
