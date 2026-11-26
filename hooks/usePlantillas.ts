import { useCallback, useEffect, useState } from 'react';
import { postsService } from '../services/firestoreService';
import { plantillaDesdePost } from '../utils/plantillas';
import { PlantillaWeeAi, PLANTILLAS_DE_MUESTRA, PLANTILLAS_DE_VIAJES } from '../constants/plantillasWeeAi';

export type EstadoDePlantillas = 'cargando' | 'listo' | 'error';

/** Las muestras solo existen en el entorno de pruebas declarado (el mismo que activa la demo). */
const ENTORNO_DE_PRUEBAS = !!process.env.EXPO_PUBLIC_DEMO_MEDIOS;

/**
 * LAS PLANTILLAS: publicaciones del muro general que traen su prompt y un medio. Es la lectura que ya hace el muro
 * (`getMuroGeneralPaginado`); aquí solo se filtra. Orden: el del muro (lo más reciente), nunca por ubicación.
 * Sin ninguna real, en el entorno de pruebas se enseñan las muestras, marcadas como ejemplo.
 */
export const usePlantillas = () => {
  const [plantillas, setPlantillas] = useState<PlantillaWeeAi[]>([]);
  const [estado, setEstado] = useState<EstadoDePlantillas>('cargando');

  const recargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const pagina = await postsService.getMuroGeneralPaginado(40);
      const reales = (pagina?.visibles ?? []).map(plantillaDesdePost).filter((p): p is PlantillaWeeAi => !!p);
      /* Las de viajes: además de las publicaciones reales con su prompt, en el entorno de pruebas se enseñan sus seis muestras (siempre «Ejemplo»). */
      const conViajes = ENTORNO_DE_PRUEBAS ? [...reales, ...PLANTILLAS_DE_VIAJES] : reales;
      setPlantillas(reales.length === 0 && ENTORNO_DE_PRUEBAS ? [...PLANTILLAS_DE_MUESTRA, ...PLANTILLAS_DE_VIAJES] : conViajes);
      setEstado('listo');
    } catch (error) {
      console.warn('No se pudieron cargar las plantillas:', error);
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { plantillas, estado, recargar };
};
