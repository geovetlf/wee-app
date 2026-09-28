import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useEnStudio } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/IdiomaContext';
import type { RutaDeStudio } from '../constants/studioWorkspace';
import { EXPERIENCIA_DEL_DESTINO, EstiloDeVideo, FormatoDeVideo, Receta, TipoDeVideo } from '../constants/inspiracion';

/** Lo que la pantalla de vídeo acepta al abrirse: una idea y sus ajustes, ya puestos. */
export interface ParamsDeCrearVideo {
  prompt?: string;
  formato?: FormatoDeVideo;
  estilo?: EstiloDeVideo;
  tipo?: TipoDeVideo;
}

/**
 * LOS CAMINOS HACIA WEË STUDIO Y DE VUELTA, EN UN SOLO SITIO.
 *
 * Weë (la App) y el workspace de Weë Studio (el taller profesional) son
 * dos experiencias que no se mezclan. Crear vídeo, Inspira, Proyectos y
 * Filmmaker son del taller: desde la App se entra por su puerta y desde dentro
 * se va directamente. La navegación de Weë no cambia por esto.
 *
 *   · `aStudio`: a una pantalla del taller.
 *   · `aCrearVideo`: la creación de vídeo del Studio.
 *   · `usarReceta`: una idea de Inspira, con su texto y sus ajustes puestos.
 *   · `volverAWee`: la salida del taller a Weë.
 *
 * Crear pide sesión: sin ella, se va a entrar, como en el resto de Weë AI.
 */
export const useCaminosDeCreacion = () => {
  const navigation = useNavigation<any>();
  const enStudio = useEnStudio();
  const { user } = useAuth();
  const t = useT();

  const conSesion = useCallback((accion: () => void) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    accion();
  }, [navigation, user]);

  const aStudio = useCallback((ruta: RutaDeStudio, params?: object) => {
    if (enStudio) navigation.navigate(ruta, params);
    else navigation.navigate('Studio', { screen: ruta, params });
  }, [enStudio, navigation]);

  const aCrearVideo = useCallback((params?: ParamsDeCrearVideo) => {
    aStudio('StudioVideo', params);
  }, [aStudio]);

  const usarReceta = useCallback((receta: Receta) => {
    const prompt = t(receta.clavePrompt);
    if (receta.destino === 'video') {
      aCrearVideo({ prompt, formato: receta.ajustes?.formato, estilo: receta.ajustes?.estilo, tipo: receta.ajustes?.tipo });
      return;
    }
    conSesion(() => {
      if (receta.destino === 'filmmaker') {
        aStudio('Production', { intencion: prompt });
        return;
      }
      const experienceId = EXPERIENCIA_DEL_DESTINO[receta.destino];
      if (experienceId) navigation.navigate('CreatorFlow', { experienceId, goal: prompt });
    });
  }, [aCrearVideo, aStudio, conSesion, navigation, t]);

  const volverAWee = useCallback(() => navigation.navigate('Main'), [navigation]);

  return useMemo(
    () => ({ enStudio, conSesion, aStudio, aCrearVideo, usarReceta, volverAWee }),
    [enStudio, conSesion, aStudio, aCrearVideo, usarReceta, volverAWee],
  );
};
