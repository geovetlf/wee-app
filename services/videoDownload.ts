import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

export async function downloadVideoWithWatermark(
  videoUrl: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  try {
    // Request permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
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
