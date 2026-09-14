import { Platform, Share } from 'react-native';
import { generatePostUrl } from '../config/linking';

/*
 * COMPARTIR FUERA DE WEË: SE MANDA EL ENLACE, NO EL ARCHIVO.
 *
 * Un solo sitio para los dos caminos que salen de Weë —el vídeo del Wäll y el
 * Weël—, porque son la misma cosa contada dos veces y no tienen por qué poder
 * diverger.
 *
 * POR QUÉ EL ENLACE Y NO EL VÍDEO
 * -------------------------------
 * Antes se bajaba el mp4 al teléfono y se entregaba el archivo. Funcionaba,
 * pero es lo contrario de lo que hacen Facebook, Instagram o YouTube, y se
 * notaba en todo:
 *
 *  · había que ESPERAR a que bajara, con su cartel de "Preparando vídeo...";
 *  · gastaba datos de quien comparte y de quien recibe, dos veces el mismo vídeo;
 *  · lo que llegaba era un archivo suelto: sin quién lo hizo, sin qué decía y
 *    sin ninguna puerta de vuelta a Weë;
 *  · y quien lo recibía no podía entrar a la publicación, porque no había
 *    publicación a la que entrar.
 *
 * Con el enlace no se espera nada: la hoja del sistema se abre en el acto,
 * porque no hay nada que preparar. La tarjeta que enseña WhatsApp la construye
 * la app de destino leyendo las etiquetas Open Graph de la página pública
 * —miniatura, título, descripción y la marca de Weë—, que ya existen y no hay
 * que generar ni subir nada. Y al tocarla se entra al contenido: a la app si
 * está instalada, y si no, a la página pública, que se ve sin cuenta.
 *
 * LA DIRECCIÓN ES LA QUE YA HABÍA
 * -------------------------------
 * `generatePostUrl` (config/linking.ts) da `https://wee.zone/post/{postId}`, la
 * misma ruta que la app abre en `PostDetail`. Un Weël no necesita nada aparte:
 * es una publicación con `isWeel`, tiene su `id` y se abre por ahí igual que
 * cualquier otra. No hay ruta nueva, ni enlace corto, ni segunda forma de
 * nombrar lo mismo.
 */

/** La dirección pública de una publicación. Sirve igual para un Weël. */
export const enlaceParaCompartir = (postId: string): string => generatePostUrl(postId);

/**
 * Abre la hoja del sistema con el enlace de la publicación.
 *
 * Devuelve si se pudo abrir. Que la persona la cierre sin elegir nada NO es un
 * fallo: decidió no compartir, y avisarla de un error sería mentirle.
 *
 * El reparto por plataforma no es capricho. En Android `Share` ignora `url` por
 * completo, así que el enlace tiene que ir dentro de `message` o no viaja. En
 * iOS `url` entrega una dirección de verdad a la hoja, que es lo que hace que
 * las apps de destino la traten como enlace y no como un trozo de texto.
 */
export async function compartirFueraDeWee(postId?: string): Promise<boolean> {
  if (!postId) return false;
  const url = enlaceParaCompartir(postId);
  try {
    await Share.share(
      Platform.OS === 'ios' ? { url } : { message: url },
      { dialogTitle: 'Compartir' },
    );
    return true;
  } catch (error) {
    console.warn('No se pudo abrir la hoja de compartir:', error);
    return false;
  }
}
