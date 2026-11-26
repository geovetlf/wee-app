import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLOR } from './estilo';
import { scale } from '../../utils/scale';
import { useDireccion } from '../../hooks/useDireccion';

/*
 * LOS ICONOS DE LA FICHA DEL PERSONAJE.
 *
 * Las pantallas piden un icono por su SIGNIFICADO (`atras`, `aprobar`,
 * `delicado`…), nunca por el nombre de una librería. Hoy los dibuja
 * @expo/vector-icons (Ionicons, contorno fino, vectorial), que ya está en la
 * app y no exige reconstruir el binario de Android.
 *
 * El día que se instale `react-native-svg` (decisión del dueño: es una
 * dependencia nativa), se cambia SOLO este archivo: `TRAZO` pasa a ser un mapa
 * de `NombreDeIcono` → trazos `<Path d=…>` sobre un lienzo de 24 y `Icono` pinta
 * un `<Svg viewBox="0 0 24 24">`. La firma (`nombre`, `tamano`, `color`,
 * `etiqueta`) no cambia y ninguna pantalla se entera.
 *
 * Los que SEÑALAN un sentido (`SENALAN`: la flecha de volver) se reflejan en
 * los idiomas que se leen de derecha a izquierda, con el `espejo` de
 * `hooks/useDireccion.ts`; los demás no se tocan.
 *
 * Un icono es decorativo por defecto: lo que significa ya lo dice el texto o la
 * etiqueta del botón que lo contiene. Solo si va solo se le pasa `etiqueta`.
 */

export type NombreDeIcono =
  | 'atras'
  | 'personaje'
  | 'identidad'
  | 'caracter'
  | 'mundo'
  | 'voz'
  | 'limites'
  | 'nivel'
  | 'autonomia'
  | 'reloj'
  | 'acciones'
  | 'bandeja'
  | 'aprobar'
  | 'rechazar'
  | 'delicado'
  | 'publicar'
  | 'completo'
  | 'incompleto'
  | 'seleccionado'
  | 'sinSeleccionar'
  | 'guardar'
  | 'apagar'
  | 'bloqueado'
  | 'material'
  | 'archivo'
  | 'subir'
  | 'quitar'
  | 'imagen'
  | 'video'
  | 'buscar';

const TRAZO: Record<NombreDeIcono, React.ComponentProps<typeof Ionicons>['name']> = {
  atras: 'chevron-back',
  personaje: 'person-circle-outline',
  identidad: 'finger-print-outline',
  caracter: 'color-palette-outline',
  mundo: 'planet-outline',
  voz: 'chatbubble-ellipses-outline',
  limites: 'shield-outline',
  nivel: 'options-outline',
  autonomia: 'pulse-outline',
  reloj: 'time-outline',
  acciones: 'layers-outline',
  bandeja: 'file-tray-outline',
  aprobar: 'checkmark',
  rechazar: 'close',
  delicado: 'alert-circle-outline',
  publicar: 'create-outline',
  completo: 'checkmark-circle',
  incompleto: 'ellipse-outline',
  seleccionado: 'radio-button-on',
  sinSeleccionar: 'radio-button-off',
  guardar: 'bookmark-outline',
  apagar: 'power-outline',
  bloqueado: 'lock-closed-outline',
  material: 'library-outline',
  archivo: 'document-text-outline',
  subir: 'cloud-upload-outline',
  quitar: 'trash-outline',
  imagen: 'image-outline',
  video: 'videocam-outline',
  buscar: 'search-outline',
};

/** Los iconos que señalan un sentido y por eso se reflejan en RTL. */
const SENALAN: ReadonlySet<NombreDeIcono> = new Set<NombreDeIcono>(['atras']);

interface Props {
  nombre: NombreDeIcono;
  /** En puntos de diseño; se escala igual que el resto de la ficha. */
  tamano?: number;
  color?: string;
  /** Solo si el icono va solo y significa algo por sí mismo (ya traducida). */
  etiqueta?: string;
}

export const Icono: React.FC<Props> = ({ nombre, tamano = 20, color = COLOR.texto, etiqueta }) => {
  const { espejo } = useDireccion();
  return (
    <Ionicons
      name={TRAZO[nombre]}
      size={scale(tamano)}
      color={color}
      style={SENALAN.has(nombre) ? espejo : undefined}
      accessibilityElementsHidden={!etiqueta}
      importantForAccessibility={etiqueta ? 'yes' : 'no-hide-descendants'}
      accessibilityLabel={etiqueta}
      accessible={!!etiqueta}
    />
  );
};

export default Icono;
