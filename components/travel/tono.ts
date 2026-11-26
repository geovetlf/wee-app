import { useRoute } from '@react-navigation/native';
import { TONO_DE_MODULO } from './tema';
import { MODULO_DE_PANTALLA, esPantallaDeTravel } from '../../screens/travel/rutas';

/** El tono del módulo de la pantalla abierta: cada una de las seis experiencias tiene el suyo (tema.ts). */
export const useTonoDelModulo = () => {
  const route = useRoute<any>();
  const pantalla = esPantallaDeTravel(route.params?.pantalla) ? route.params.pantalla : 'descubrir';
  const modulo = MODULO_DE_PANTALLA[pantalla as keyof typeof MODULO_DE_PANTALLA];
  return { modulo, tono: TONO_DE_MODULO[modulo] };
};
