/*
 * ENTREGA DE UN PROYECTO EXPORTADO (línea I, nativo: iOS y Android). Escribe el paquete en
 * la caché de la app y abre la hoja de compartir del sistema. La caché es temporal: el
 * archivo se borra al terminar y NUNCA se guarda como proyecto ni como archivo de la carpeta WEE.
 * Lo mismo que `descargarCreacion` de `services/assetDownload.ts`.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { base64Codificar } from '../../utils/bytes';

const CARPETA_DE_ENTREGA = `${FileSystem.cacheDirectory}wee_exportar/`;

/** Devuelve false si el sistema no puede compartir archivos. No lanza por eso. */
export const entregarArchivo = async (nombre: string, datos: Uint8Array): Promise<boolean> => {
  if (!(await Sharing.isAvailableAsync())) return false;
  const carpeta = await FileSystem.getInfoAsync(CARPETA_DE_ENTREGA);
  if (!carpeta.exists) await FileSystem.makeDirectoryAsync(CARPETA_DE_ENTREGA, { intermediates: true });
  const destino = `${CARPETA_DE_ENTREGA}${nombre}`;
  await FileSystem.writeAsStringAsync(destino, base64Codificar(datos), { encoding: FileSystem.EncodingType.Base64 });
  try {
    await Sharing.shareAsync(destino, { mimeType: 'application/octet-stream', dialogTitle: nombre });
  } finally {
    await FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => undefined);
  }
  return true;
};
