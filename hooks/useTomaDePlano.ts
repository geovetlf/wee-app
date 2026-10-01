import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { videoService } from '../services/videoService';
import { tomaService } from '../services/tomaService';
import type { ProduccionGuardada } from '../services/filmmakerService';
import {
  CalidadDeToma, InstantaneaDeToma, SeleccionDeUnidad, ServicioDeTomas,
  claveDeEntrada, crearControladorDeToma, entradaDeToma,
} from '../utils/controladorDeToma';

/**
 * WEË FILMMAKER · LA TOMA DEL PLANO ELEGIDO, ATADA A REACT (F1-D).
 *
 * El único sitio de la app que usa `videoService`: una toma de un plano entra por
 * la misma callable que el vídeo de Weë Studio, con el plano en vez de un texto.
 * El controlador (`utils/controladorDeToma.ts`) decide qué se pide y qué se
 * enseña; esto le da los servicios de verdad, le dice qué unidad está elegida y
 * lo deja de escuchar al salir.
 *
 * La unidad sale de lo GUARDADO: con cambios sin guardar no se genera, porque se
 * generaría una cosa y se vería otra.
 */
const SERVICIO: ServicioDeTomas = {
  cotizar: (unidad, calidad) => videoService.quoteTake({ ...unidad, ...(calidad ? { quality: calidad } : {}) }),
  generar: (unidad, calidad, toma, creditos) => videoService.generateTake({ ...unidad, quality: calidad, take: toma }, creditos),
  enlazar: (unidad, toma) => tomaService.enlazar({ productionId: unidad.productionId, sceneId: unidad.sceneId, unitId: unidad.unitId, take: toma }),
  observarReserva: tomaService.observarReserva,
  urlDelMaterial: tomaService.urlDelMaterial,
};

export interface TomaDelPlano extends InstantaneaDeToma {
  readonly elegirCalidad: (calidad: CalidadDeToma) => void;
  readonly generar: () => void;
  readonly reintentar: () => void;
}

export const useTomaDePlano = (guardada: ProduccionGuardada | null, hayCambios: boolean, seleccion: SeleccionDeUnidad): TomaDelPlano => {
  const [controlador] = useState(() => crearControladorDeToma(SERVICIO));
  useEffect(() => () => controlador.cerrar(), [controlador]);
  const entrada = useMemo(() => entradaDeToma(guardada, hayCambios, seleccion), [guardada, hayCambios, seleccion]);
  const clave = claveDeEntrada(entrada);
  useEffect(() => {
    controlador.abrir(entrada);
    // Solo cuando cambia lo que la distingue: una misma unidad no se vuelve a consultar en cada pintado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlador, clave]);
  const instantanea = useSyncExternalStore(controlador.suscribir, controlador.leer, controlador.leer);
  return useMemo(() => ({
    ...instantanea,
    elegirCalidad: controlador.elegirCalidad,
    generar: controlador.generar,
    reintentar: controlador.reintentar,
  }), [instantanea, controlador]);
};
