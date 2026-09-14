import React from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { NombreDeIcono, uriDelIcono } from './trazosDeWee';

/*
 * UN ICONO DE WEË, DEL TAMAÑO Y DEL COLOR QUE SE LE PIDA.
 *
 * El dibujo vive en `trazosDeWee.ts`, que no importa nada; aquí solo está lo
 * que hace falta para pintarlo en pantalla. Por eso son dos archivos: el de los
 * trazos se puede previsualizar y probar sin levantar la app.
 *
 * `expo-image` y no una etiqueta cualquiera porque trae decodificador de SVG en
 * las tres plataformas —en Android, androidsvg, ya compilado dentro del dev
 * build que hay—. Lo que se le pasa es el SVG entero como dirección `data:`, no
 * un archivo: no hay nada que empaquetar ni que descargar.
 *
 * El color va DENTRO del dibujo, no como tinte de la imagen. Teñir un SVG desde
 * fuera funciona a medias y de forma distinta en cada plataforma; escribir el
 * color en el trazo funciona igual en todas. Cada pareja de icono y color se
 * guarda una vez (`uriDelIcono`), así que repintar el menú no reconstruye nada.
 */
interface Props {
  name: NombreDeIcono;
  /** En puntos, ya escalados por quien llama. */
  size?: number;
  color: string;
  style?: StyleProp<ImageStyle>;
}

export const IconoWee: React.FC<Props> = ({ name, size = 24, color, style }) => (
  <Image
    source={{ uri: uriDelIcono(name, color) }}
    style={[{ width: size, height: size }, style]}
    contentFit="contain"
    /* Sin desvanecido: un icono de menú aparece con su fila, no después. */
    transition={0}
    /* Lo dice la etiqueta que va al lado; leerlo dos veces sobra. */
    accessible={false}
  />
);

export default IconoWee;
