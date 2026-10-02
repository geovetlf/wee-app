import { Image } from 'react-native';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Fotos que la persona sube para Weë Creator y Weë Brain.
 * Van al Storage de Weë (users/{uid}/creator-inputs o brain-attachments) y al
 * servidor solo llega la URL: los proveedores de IA nunca reciben archivos
 * directamente desde la app. Firestore nunca guarda la imagen, solo la referencia.
 */
export type UploadFolder = 'creator-inputs' | 'brain-attachments';

const MAX_BYTES = 10 * 1024 * 1024;

const isAlreadyUploaded = (uri: string): boolean => /\/v0\/b\/[^/]+\/o\//.test(uri) || uri.startsWith('gs://');

/**
 * Ancho y alto de la foto, para guardarlos junto al archivo.
 *
 * Los proveedores de IA que cobran por megapíxel facturan también los píxeles de
 * la imagen que se les manda a editar, así que sin este dato Weë no puede
 * calcular el precio exacto antes de que la persona confirme. Se mide aquí
 * porque es donde la foto ya está a mano: no se descarga nada de más.
 *
 * La imagen NO se toca: no se redimensiona, no se recomprime y no se convierte.
 * Si la medición falla, la subida sigue igual y el servidor lo resolverá luego.
 */
const measure = (uri: string): Promise<{ width: number; height: number } | null> =>
  new Promise((resolve) => {
    let done = false;
    const finish = (value: { width: number; height: number } | null) => {
      if (!done) {
        done = true;
        resolve(value);
      }
    };
    // Nunca debe retrasar la subida: si no contesta pronto, se sigue sin el dato
    setTimeout(() => finish(null), 3000);
    try {
      Image.getSize(
        uri,
        (width, height) => finish(width > 0 && height > 0 ? { width: Math.round(width), height: Math.round(height) } : null),
        () => finish(null),
      );
    } catch {
      finish(null);
    }
  });

export async function uploadCreatorImage(uid: string, uri: string, folder: UploadFolder = 'creator-inputs'): Promise<string> {
  if (isAlreadyUploaded(uri)) return uri;
  if (!storage) throw new Error('storage-sin-inicializar');
  const response = await fetch(uri);
  const blob = await response.blob();
  if (blob.size > MAX_BYTES) throw new Error('foto-demasiado-grande');
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `users/${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const storageRef = ref(storage, path);
  // Las dimensiones viajan como metadatos del propio archivo: son la fuente de
  // verdad del tamaño y el servidor las lee sin volver a descargar la foto.
  const size = await measure(uri);
  await uploadBytes(storageRef, blob, {
    contentType,
    ...(size ? { customMetadata: { width: String(size.width), height: String(size.height) } } : {}),
  });
  return getDownloadURL(storageRef);
}
