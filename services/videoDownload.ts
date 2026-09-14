import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export async function downloadVideoWithWatermark(
  videoUrl: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  try {
    /*
     * Solo escritura: este flujo guarda un archivo en la galería y no lee nada de
     * ella. `requestPermissionsAsync(true)` pide exactamente lo que
     * `saveToLibraryAsync` comprueba —WRITE_EXTERNAL_STORAGE en Android 12 y
     * anteriores, y nada en Android 13+—, en vez de pedir además el permiso de
     * lectura de fotos, videos y audio que aquí no se usa para nada.
     */
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para guardar el video.');
      return false;
    }

    onProgress?.(0.1);

    // Create temp directory
    const tempDir = `${FileSystem.cacheDirectory}wee_downloads/`;
    const dirInfo = await FileSystem.getInfoAsync(tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const inputPath = `${tempDir}wee_${timestamp}.mp4`;

    onProgress?.(0.3);

    // Download video
    const downloadResult = await FileSystem.downloadAsync(videoUrl, inputPath);
    if (downloadResult.status !== 200) {
      throw new Error('Error al descargar el video');
    }

    onProgress?.(0.7);

    // Save to gallery
    await MediaLibrary.saveToLibraryAsync(inputPath);

    onProgress?.(1);

    // Cleanup temp file
    await FileSystem.deleteAsync(inputPath, { idempotent: true });

    Alert.alert('¡Listo!', 'Video guardado en tu galería.');
    return true;

  } catch (error) {
    console.error('Error downloading video:', error);
    Alert.alert('Error', 'No se pudo descargar el video. Intenta de nuevo.');
    return false;
  }
}

/*
 * ─── COMPARTIR UN VÍDEO COMO VÍDEO ──────────────────────────────────────────
 *
 * Compartir una publicación siempre hacía lo mismo: pintar una tarjeta, hacerle
 * una captura y entregarla como `image/png`. Con una foto eso está bien. Con un
 * vídeo, no: Android recibía un PNG y su hoja de compartir anunciaba
 * "1 imagen" con un fotograma quieto. Lo que llegaba a WhatsApp era una foto.
 *
 * Lo que hace falta es entregarle al sistema el ARCHIVO de vídeo con su tipo
 * real. Y para eso el archivo tiene que existir en el teléfono, porque la hoja
 * de compartir no acepta una dirección remota: se baja al caché, se comparte y
 * se borra. Es el mismo sitio y el mismo patrón que ya usa la descarga a la
 * galería, aquí arriba.
 *
 * NO se sube ninguna copia a Storage, ni permanente ni temporal. El original de
 * la publicación no se toca. Lo único que queda es un archivo efímero en el
 * caché de la aplicación, que se borra al terminar.
 */

/** Los tipos de vídeo que Weë puede encontrarse, por extensión. */
const TIPOS_DE_VIDEO: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  mkv: 'video/x-matroska',
};

/**
 * El tipo y la extensión de un vídeo, a partir de su dirección.
 *
 * Es una función pura para que una prueba pueda recorrerla con direcciones de
 * verdad. Cloudinary añade transformaciones y a veces parámetros detrás, así
 * que se limpia lo que va tras `?` o `#` antes de mirar la extensión. Si no hay
 * ninguna reconocible se usa MP4, que es lo que Weë sube.
 */
export const tipoDelVideo = (url: string): { mime: string; extension: string } => {
  const limpia = (url || '').split('?')[0].split('#')[0];
  const ultima = limpia.substring(limpia.lastIndexOf('/') + 1);
  const punto = ultima.lastIndexOf('.');
  const extension = punto > 0 ? ultima.slice(punto + 1).toLowerCase() : '';
  const mime = TIPOS_DE_VIDEO[extension];
  return mime ? { mime, extension } : { mime: 'video/mp4', extension: 'mp4' };
};

/**
 * Baja el vídeo al caché y se lo pasa a la hoja de compartir del sistema.
 *
 * @param alAbrirLaHoja se llama JUSTO ANTES de abrir la hoja del sistema, con la
 * descarga ya terminada. Existe por una razón concreta de interfaz:
 * `Sharing.shareAsync` no devuelve el control hasta que la persona cierra la
 * hoja, así que cualquier "cargando" que siga encendido se queda visible detrás
 * de ella, tapando la publicación todo el rato. Con este aviso, quien llame
 * puede apagarlo en el único momento correcto: cuando ya no hay nada que
 * esperar y la hoja va a tomar el mando.
 *
 * Devuelve si se pudo compartir.
 */
export async function compartirVideo(
  videoUrl: string,
  alAbrirLaHoja?: () => void,
): Promise<boolean> {
  const { mime, extension } = tipoDelVideo(videoUrl);
  const tempDir = `${FileSystem.cacheDirectory}wee_downloads/`;
  const destino = `${tempDir}wee_compartir_${Date.now()}.${extension}`;

  try {
    if (!(await Sharing.isAvailableAsync())) return false;

    const dirInfo = await FileSystem.getInfoAsync(tempDir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

    const descarga = await FileSystem.downloadAsync(videoUrl, destino);
    if (descarga.status !== 200) throw new Error(`el vídeo no se pudo bajar (${descarga.status})`);

    /* La descarga terminó: el "cargando" sobra a partir de aquí. */
    alAbrirLaHoja?.();

    await Sharing.shareAsync(destino, {
      mimeType: mime,
      dialogTitle: 'Compartir video',
      /* iOS mira este identificador en vez del MIME; los dos dicen lo mismo. */
      UTI: 'public.movie',
    });
    return true;
  } catch (error) {
    console.warn('No se pudo compartir el video:', error);
    return false;
  } finally {
    /* El archivo del caché se va siempre, salga bien o mal. */
    await FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => {});
  }
}
