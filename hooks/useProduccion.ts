import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { crearControladorDeProduccion } from '../utils/controladorDeProduccion';
import { filmmakerService, nuevoIdDeOperacion } from '../services/filmmakerService';
import { lineaDeTiempo, recomendar, tarjetasDeStoryboard, validarProduccion } from '../services/filmmaker/dominio';

/**
 * UNA PRODUCCIÓN ABIERTA EN LA PANTALLA (F1-C).
 *
 * El controlador (`utils/controladorDeProduccion.ts`) lleva el estado optimista y
 * habla con el servidor; esto solo lo ata a React: uno por producción, se abre al
 * montar, y al desmontar manda lo que quedaba sin esperar.
 *
 * Lo que se deriva —las recomendaciones, las tarjetas del storyboard, la línea
 * de tiempo y si está lista para generar— lo calcula F1-A sobre lo que se ve, y
 * solo cuando lo que se ve cambia.
 */
export const useProduccion = (productionId: string) => {
  const controlador = useMemo(
    () => crearControladorDeProduccion(productionId, { servicio: filmmakerService, nuevoIdDeOperacion }),
    [productionId],
  );
  useEffect(() => {
    void controlador.cargar();
    return () => controlador.cerrar();
  }, [controlador]);
  const { carga, falloDeCarga, estado } = useSyncExternalStore(controlador.suscribir, controlador.leer, controlador.leer);
  const vista = estado.vista;
  const derivado = useMemo(() => (vista
    ? {
      recomendaciones: recomendar(vista),
      tarjetas: tarjetasDeStoryboard(vista),
      linea: lineaDeTiempo(vista),
      lista: validarProduccion(vista, { stage: 'ready' }),
    }
    : null), [vista]);
  /**
   * Duplicar: otra producción de la misma cuenta, con otro id, en su revisión 0.
   * El título lo pone quien pinta, en el idioma de quien mira; el servidor no
   * inventa frases. Con cambios sin guardar no se copia: la copia sería de lo
   * que el servidor tiene, no de lo que se ve.
   */
  const duplicar = useCallback(async (title: string) => {
    if (estado.enVuelo || estado.pendientes.length) return null;
    return filmmakerService.duplicateProduction({ productionId, title });
  }, [estado.enVuelo, estado.pendientes.length, productionId]);
  return { controlador, carga, falloDeCarga, estado, derivado, duplicar };
};
