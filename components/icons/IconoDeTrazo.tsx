import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconoWee } from './IconoWee';
import type { NombreDeIcono } from './trazosDeWee';

/**
 * EL ICONO DE TRAZO DE LAS PANTALLAS (2026-11-16).
 *
 * Las pantallas del Wall, perfiles, comunidades, búsqueda y mensajes pintaban glifos de Ionicons de colores distintos. Este componente toma el
 * MISMO nombre que usaban y dibuja el icono de la familia IconoWee (trazo fino, redondeado, en el color que se le pase): así el cambio de estilo
 * no toca la lógica de cada pantalla y el resultado es el mismo juego de iconos en toda la app.
 *
 * Los iconos que tienen sentido de dirección (atrás, adelante, chevrones) se espejan en árabe: lo hace aquí, una vez, y no cada pantalla.
 * Un nombre sin equivalente cae en el glifo de siempre (que sale con el color recibido, así que sigue siendo monocromo) y queda listado en
 * `SIN_EQUIVALENTE` para que se dibuje.
 */
const EQUIVALENTE: Record<string, NombreDeIcono> = {
  'chevron-down': 'chevronAbajo',
  close: 'cerrar',
  'close-circle': 'cerrar',
  add: 'mas',
  checkmark: 'marca',
  'checkmark-circle': 'marca',
  'alert-circle-outline': 'alerta',
  'camera': 'camara',
  'camera-outline': 'camara',
  'settings-outline': 'engranaje',
  menu: 'menu',
  'eye-off-outline': 'ojoCerrado',
  'eye-off': 'ojoCerrado',
  eye: 'ojo',
  'eye-outline': 'ojo',
  'calendar-outline': 'calendario',
  chatbubble: 'burbuja',
  'chatbubble-outline': 'burbuja',
  'chatbubble-ellipses-outline': 'burbuja',
  'chatbubbles-outline': 'burbuja',
  'link-outline': 'enlace',
  'share-outline': 'compartir',
  'share-social-outline': 'compartir',
  'ellipsis-horizontal': 'puntosH',
  'ellipsis-vertical': 'puntos',
  'image-outline': 'galeria',
  images: 'galeria',
  'paper-plane': 'enviar',
  'paper-plane-outline': 'enviar',
  person: 'perfilReal',
  'person-outline': 'perfilReal',
  female: 'perfilReal',
  male: 'perfilReal',
  repeat: 'repetir',
  'volume-high': 'volumen',
  'volume-mute': 'silencio',
  'document-text': 'documento',
  'document-text-outline': 'documento',
  'document-attach-outline': 'documento',
  'albums-outline': 'capas',
  play: 'reproducir',
  'play-outline': 'reproducir',
  pause: 'pausa',
  'copy-outline': 'copiar',
  'stats-chart-outline': 'encuesta',
  'repeat-outline': 'repetir',
  'heart-outline': 'meGusta',
  heart: 'meGusta',
  'chevron-up': 'chevronArriba',
  'sparkles-outline': 'chispas',
  'videocam-outline': 'claqueta',
  search: 'buscar',
  'search-outline': 'buscar',
  flame: 'fuego',
  people: 'comunidades',
  'people-outline': 'comunidades',
  'trending-up': 'tendencia',
  'ban-outline': 'prohibido',
  'color-palette-outline': 'paleta',
  'mic-outline': 'microfono',
  'folder-open-outline': 'carpeta',
  'pencil-outline': 'redactar',
  'time-outline': 'reloj',
  'trash-outline': 'papelera',
  sparkles: 'chispas',
  'information-circle-outline': 'info',
  refresh: 'recargar',
  'pricetag-outline': 'etiqueta',
  rocket: 'cohete',
  'rocket-outline': 'cohete',
  'flag-outline': 'bandera',
  bookmark: 'marcador',
  'bookmark-outline': 'marcador',
};

interface Props {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}

export const IconoDeTrazo: React.FC<Props> = ({ name, size = 24, color, style }) => {
  const propio = EQUIVALENTE[name];
  if (!propio) return <Ionicons name={name as never} size={size} color={color} style={style as never} />;
  return <IconoWee name={propio} size={size} color={color} style={style as never} />;
};

export default IconoDeTrazo;
