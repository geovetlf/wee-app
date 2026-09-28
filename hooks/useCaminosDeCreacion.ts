import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useEnCreator } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/IdiomaContext';
import type { RutaDeCreator } from '../constants/creatorWorkspace';
import { EXPERIENCIA_DEL_DESTINO, EstiloDeVideo, FormatoDeVideo, Receta, TipoDeVideo } from '../constants/inspiracion';

/** Lo que la pantalla de vídeo acepta al abrirse: una idea y sus ajustes, ya puestos. */
export interface ParamsDeCrearVideo {
  prompt?: string;
  formato?: FormatoDeVideo;
  estilo?: EstiloDeVideo;
  tipo?: TipoDeVideo;
}

/**
 * LOS CAMINOS ENTRE WEË Y WEË CREATOR, EN UN SOLO SITIO.
 *
 * Weë (la App, en web y en el teléfono) y Weë Creator (el taller profesional)
 * son dos arquitecturas de navegación que no se mezclan (decisión del usuario,
 * 2026-09-27). Las pantallas que viven en las dos —la creación de vídeo,
 * Inspira, Proyectos— no tienen que saber en cuál están: preguntan aquí.
 *
 *   · `aCreator`: a una pantalla que SOLO vive en Weë Creator —Filmmaker, su
 *     Inicio—. Desde la App se entra en Weë Creator por su puerta; desde dentro,
 *     se va directamente.
 *   · `aCrearVideo`: la creación de vídeo del sitio donde se está.
 *   · `usarReceta`: una idea de Inspira, con su texto y sus ajustes puestos.
 *   · `volverAWee`: la salida de Weë Creator al ecosistema.
 *
 * Crear pide sesión: sin ella, se va a entrar, como en el resto de Weë AI.
 */
export const useCaminosDeCreacion = () => {
  const navigation = useNavigation<any>();
  const enCreator = useEnCreator();
  const { user } = useAuth();
  const t = useT();

  const conSesion = useCallback((accion: () => void) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    accion();
  }, [navigation, user]);

  const aCreator = useCallback((ruta: RutaDeCreator, params?: object) => {
    if (enCreator) navigation.navigate(ruta, params);
    else navigation.navigate('Creator', { screen: ruta, params });
  }, [enCreator, navigation]);

  const aCrearVideo = useCallback((params?: ParamsDeCrearVideo) => {
    navigation.navigate(enCreator ? 'CreatorVideo' : 'CrearVideo', params);
  }, [enCreator, navigation]);

  const usarReceta = useCallback((receta: Receta) => {
    const prompt = t(receta.clavePrompt);
    if (receta.destino === 'video') {
      aCrearVideo({ prompt, formato: receta.ajustes?.formato, estilo: receta.ajustes?.estilo, tipo: receta.ajustes?.tipo });
      return;
    }
    conSesion(() => {
      if (receta.destino === 'filmmaker') {
        aCreator('Production', { intencion: prompt });
        return;
      }
      const experienceId = EXPERIENCIA_DEL_DESTINO[receta.destino];
      if (experienceId) navigation.navigate('CreatorFlow', { experienceId, goal: prompt });
    });
  }, [aCrearVideo, aCreator, conSesion, navigation, t]);

  const volverAWee = useCallback(() => navigation.navigate('Main'), [navigation]);

  return useMemo(
    () => ({ enCreator, conSesion, aCreator, aCrearVideo, usarReceta, volverAWee }),
    [enCreator, conSesion, aCreator, aCrearVideo, usarReceta, volverAWee],
  );
};
