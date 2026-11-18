import { useCallback, useMemo, useRef, useState } from 'react';
import { filmmakerOrquestacionService } from '../services/filmmakerOrquestacionService';
import type { CreadaDesdeLaExperiencia, SincronizadaConElServidor } from '../services/filmmakerOrquestacionService';
import type { FalloDeProducciones, ProduccionGuardada } from '../services/filmmakerService';
import type { ExperienciaDeFilmmaker } from '../utils/filmmakerOrquestacion';
import { conProduccion } from '../utils/filmmakerOrquestacion';
import type { EstadoDeCuadroEnServidor } from '../utils/filmmakerOrquestacion';
import type { TandasDelTaller } from '../utils/tandasDeFilmmaker';

/**
 * WEË FILMMAKER · LA PRODUCCIÓN DE LA EXPERIENCIA, ATADA A REACT. Un solo punto para las pantallas de las etapas:
 *
 *   const pf = useProduccionDeFilmmaker();
 *   await pf.asegurar(experiencia)    // crea si no existe (al aprobar el Universo / pasar a Capítulos); si existe, sincroniza las escenas
 *   pf.guardada                        // la última lectura del servidor (`productionId`, `revision`, `production`)
 *   pf.tandasConEstado(tandas, porCuadro)  // pinta `estadoDe(t)` con lo que dicen las tomas (ver utils/filmmakerOrquestacion)
 *
 * Las TOMAS de cada cuadro no van aquí: `hooks/useTomaDePlano(guardada, hayCambios, { tipo: 'plano', id: idDePlano(cuadro.id) })` ya cotiza,
 * pide, escucha la reserva y enlaza el vídeo; la ficha del cuadro lo usa con `idDePlano(cuadro.id)`. Esto solo mantiene la producción al día.
 */
export type CargaDeOrquestacion = 'libre' | 'trabajando' | 'error';

export const useProduccionDeFilmmaker = () => {
  const [guardada, setGuardada] = useState<ProduccionGuardada | null>(null);
  const [carga, setCarga] = useState<CargaDeOrquestacion>('libre');
  const [fallo, setFallo] = useState<FalloDeProducciones | null>(null);
  const [omitido, setOmitido] = useState<CreadaDesdeLaExperiencia['borrador'] | null>(null);
  /* Una sola escritura a la vez: dos `asegurar` seguidos esperan al primero (evita el conflicto de revisión por pisarse). */
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const ultima = useRef<ProduccionGuardada | null>(null);

  const asegurar = useCallback((e: Omit<ExperienciaDeFilmmaker, 'productionId'>): Promise<boolean> => {
    const tarea = cola.current.then(async () => {
      setCarga('trabajando'); setFallo(null);
      const r = ultima.current
        ? await filmmakerOrquestacionService.sincronizar(ultima.current, e)
        : await filmmakerOrquestacionService.crear(e);
      if (!r.ok) { setFallo(r.fallo); setCarga('error'); return false; }
      const v = r.valor as CreadaDesdeLaExperiencia | SincronizadaConElServidor;
      ultima.current = v.produccion; setGuardada(v.produccion); setOmitido(v.borrador); setCarga('libre');
      return true;
    });
    cola.current = tarea.catch(() => undefined);
    return tarea;
  }, []);

  const tandasConEstado = useCallback((t: TandasDelTaller, porCuadro: Readonly<Record<string, EstadoDeCuadroEnServidor>>): TandasDelTaller =>
    ({ ...t, tandas: t.tandas.map((x) => conProduccion(x, porCuadro)) }), []);

  return useMemo(() => ({ guardada, carga, fallo, omitido, asegurar, tandasConEstado }), [guardada, carga, fallo, omitido, asegurar, tandasConEstado]);
};
