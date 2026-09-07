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

export async function uploadCreatorImage(uid: string, uri: string, folder: UploadFolder = 'creator-inputs'): Promise<string> {
  if (isAlreadyUploaded(uri)) return uri;
  if (!storage) throw new Error('Storage no está inicializado');
  const response = await fetch(uri);
  const blob = await response.blob();
  if (blob.size > MAX_BYTES) throw new Error('La foto pesa más de 10 MB. Elige una más liviana.');
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `users/${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}
