import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

/*
 * WEËTRAVEL — LAS PANTALLAS DEL WORKSPACE, BAJO UNA SOLA RUTA (`Travel`).
 *
 * Una ruta con la pantalla como parámetro, y no cuarenta rutas sueltas en la pila principal: cada paso se apila con
 * `push`, así que «atrás» funciona como en cualquier pantalla, y la dirección web es /travel/<pantalla>/<id>. El `id`
 * es siempre un identificador de los datos DEMO (un destino, un viaje, un lugar…), nunca algo que la persona escribió.
 */
export type PantallaDeTravel =
  // 1 · Descubrir
  | 'descubrir' | 'buscar' | 'destino' | 'sorpresa' | 'comparar' | 'coleccion'
  // 2 · Planear
  | 'planear' | 'crear' | 'generar' | 'itinerario' | 'editor' | 'replanear' | 'presupuesto' | 'versiones'
  // 3 · Mis viajes
  | 'viajes' | 'viaje' | 'calendario' | 'reservas' | 'documentos' | 'gastos' | 'compartir'
  // 4 · Explorar
  | 'explorar' | 'cerca' | 'lugar' | 'ruta' | 'seguridad' | 'emergencia'
  // 5 · Asistente de viaje
  | 'asistente' | 'chat' | 'voz' | 'vision' | 'traductor' | 'local' | 'saber' | 'contexto'
  // 6 · Comunidad y recuerdos
  | 'comunidad' | 'compartido' | 'recuerdos';

export const PANTALLAS_DE_TRAVEL: PantallaDeTravel[] = [
  'descubrir', 'buscar', 'destino', 'sorpresa', 'comparar', 'coleccion',
  'planear', 'crear', 'generar', 'itinerario', 'editor', 'replanear', 'presupuesto', 'versiones',
  'viajes', 'viaje', 'calendario', 'reservas', 'documentos', 'gastos', 'compartir',
  'explorar', 'cerca', 'lugar', 'ruta', 'seguridad', 'emergencia',
  'asistente', 'chat', 'voz', 'vision', 'traductor', 'local', 'saber', 'contexto',
  'comunidad', 'compartido', 'recuerdos',
];

/** A qué módulo pertenece cada pantalla (de ahí sale su tono: components/travel/tema.ts). */
export const MODULO_DE_PANTALLA: Record<PantallaDeTravel, 'descubrir' | 'planear' | 'viajes' | 'explorar' | 'asistente' | 'comunidad'> = {
  descubrir: 'descubrir', buscar: 'descubrir', destino: 'descubrir', sorpresa: 'descubrir', comparar: 'descubrir', coleccion: 'descubrir',
  planear: 'planear', crear: 'planear', generar: 'planear', itinerario: 'planear', editor: 'planear', replanear: 'planear', presupuesto: 'planear', versiones: 'planear',
  viajes: 'viajes', viaje: 'viajes', calendario: 'viajes', reservas: 'viajes', documentos: 'viajes', gastos: 'viajes', compartir: 'viajes',
  explorar: 'explorar', cerca: 'explorar', lugar: 'explorar', ruta: 'explorar', seguridad: 'explorar', emergencia: 'explorar',
  asistente: 'asistente', chat: 'asistente', voz: 'asistente', vision: 'asistente', traductor: 'asistente', local: 'asistente', saber: 'asistente', contexto: 'asistente',
  comunidad: 'comunidad', compartido: 'comunidad', recuerdos: 'comunidad',
};

export interface ParametrosDeTravel {
  pantalla: PantallaDeTravel;
  id?: string;
}

export const esPantallaDeTravel = (v: unknown): v is PantallaDeTravel => typeof v === 'string' && (PANTALLAS_DE_TRAVEL as string[]).includes(v);

/**
 * Navegar dentro de WeëTravel, y hablar con Weë Brain desde cualquier pantalla.
 *
 * `preguntarABrain` no es otra IA: abre la conversación de siempre (`CreatorFlow`, experiencia 'travel') con lo que
 * la pantalla ya sabe como objetivo (CLAUDE.md §10). Sin sesión, al inicio de sesión, como el resto de Weë AI.
 */
export const useTravelNav = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const ir = useCallback((pantalla: PantallaDeTravel, id?: string) => navigation.push('Travel', id ? { pantalla, id } : { pantalla }), [navigation]);
  const preguntarABrain = useCallback((goal?: string, imageUri?: string) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('CreatorFlow', { experienceId: 'travel', ...(goal ? { goal } : {}), ...(imageUri ? { imageUri } : {}) });
  }, [navigation, user]);
  const volver = useCallback(() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Specialist', { id: 'travel' })), [navigation]);
  return { ir, preguntarABrain, volver, navigation };
};
