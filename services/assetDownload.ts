import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

/*
 * DESCARGAR UNA CREACIÓN (Fase 11, §23).
 *
 * Una creación de Weë AI ya es MATERIAL de la cuenta: está guardada una vez,
 * en el Storage de Weë, con su ficha. Descargarla es traer ese archivo tal
 * cual —sin marca de agua, sin recomprimir, sin subir ninguna copia— y
 * dejarlo donde la persona lo pueda usar:
 *
 *   · en el teléfono, una imagen o un vídeo van a la galería; lo demás
 *     (audio, documentos) se entrega a la hoja de compartir, que es donde
 *     el sistema deja elegir «guardar en Archivos»;
 *   · en la web, el navegador es quien descarga: se abre la dirección.
 *
 * Devuelve QUÉ pasó, no un porcentaje: `FileSystem.downloadAsync` no informa
 * del progreso y aquí no se inventa ninguno. Quien pinta traduce el resultado.
 * Era el patrón de `services/videoDownload.ts` (la descarga de Weëls con marca de agua, que nunca se conectó y se
 * retiró el 2026-10-01); hoy este es el único flujo que guarda en la galería.
 */
export type TipoDescargable = 'image' | 'video' | 'audio' | 'document' | 'model3d' | 'text' | 'world';
export type ResultadoDeDescarga = 'guardado' | 'compartido' | 'abierto' | 'sin_permiso' | 'error';

const EXTENSION_POR_TIPO: Record<TipoDescargable, string> = {
  /*
   * Un mundo 3D no tiene formato por defecto: el de hoy NO está verificado (su esquema solo dice «archivo»). Sin la
   * extensión en la dirección ni el tipo declarado del material, se guarda como datos sin más —no se inventa uno—.
   */
  image: 'png', video: 'mp4', audio: 'mp3', document: 'pdf', model3d: 'glb', text: 'txt', world: 'bin',
};
const MIME_POR_EXTENSION: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg',
  pdf: 'application/pdf', glb: 'model/gltf-binary', txt: 'text/plain',
  gltf: 'model/gltf+json', ply: 'model/ply', zip: 'application/zip', bin: 'application/octet-stream',
};

/** La extensión del tipo que el material DECLARA (su `mimeType`), si es uno de los conocidos. */
const extensionDelTipoDeclarado = (mimeType: string | undefined): string => {
  const declarado = (mimeType ?? '').split(';')[0].trim().toLowerCase();
  return Object.keys(MIME_POR_EXTENSION).find((ext) => MIME_POR_EXTENSION[ext] === declarado) ?? '';
};

/** La extensión real si la dirección la trae; si no, la del tipo que el material declara; si no, la de su clase. */
export const extensionDe = (url: string, tipo: TipoDescargable, mimeType?: string): string => {
  const limpia = url.split('?')[0].split('#')[0];
  const ultima = limpia.substring(limpia.lastIndexOf('/') + 1);
  const punto = ultima.lastIndexOf('.');
  const ext = punto > 0 ? ultima.slice(punto + 1).toLowerCase() : '';
  return ext && MIME_POR_EXTENSION[ext] ? ext : extensionDelTipoDeclarado(mimeType) || EXTENSION_POR_TIPO[tipo];
};

export const descargarCreacion = async (url: string, tipo: TipoDescargable, mimeType?: string): Promise<ResultadoDeDescarga> => {
  if (!/^https?:\/\//.test(url)) return 'error';
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return 'abierto';
  }
  const extension = extensionDe(url, tipo, mimeType);
  const carpeta = `${FileSystem.cacheDirectory}wee_downloads/`;
  const destino = `${carpeta}wee_${Date.now()}.${extension}`;
  const limpiar = () => FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => undefined);
  try {
    const info = await FileSystem.getInfoAsync(carpeta);
    if (!info.exists) await FileSystem.makeDirectoryAsync(carpeta, { intermediates: true });
    const bajada = await FileSystem.downloadAsync(url, destino);
    if (bajada.status !== 200) { await limpiar(); return 'error'; }

    if (tipo === 'image' || tipo === 'video') {
      /* Solo escritura en la galería: el mismo permiso mínimo que la descarga de Weëls. */
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') { await limpiar(); return 'sin_permiso'; }
      await MediaLibrary.saveToLibraryAsync(destino);
      await limpiar();
      return 'guardado';
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(destino, { mimeType: MIME_POR_EXTENSION[extension] });
      await limpiar();
      return 'compartido';
    }
    await limpiar();
    return 'error';
  } catch (error) {
    console.warn('No se pudo descargar la creación:', error);
    await limpiar();
    return 'error';
  }
};
