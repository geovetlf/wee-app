/**
 * Storage Service — All uploads go through Cloudinary, with ONE exception:
 * the WeeTalk view-once photo goes to Weë's own Storage (see below), because
 * it has to be deletable and Cloudinary is not.
 * No separate thumbnails needed: use cloudinaryThumb(url) for thumbnails.
 *
 * The old Firebase Storage class is kept for backwards compatibility
 * (reading/deleting old files), but all new uploads use Cloudinary.
 *
 * Progress: Cloudinary uploads only know that they started and that they
 * finished (`AvisoDeSubida`). This file used to fabricate `bytesTransferred`
 * out of an invented percentage; it no longer does (Fase 11, C11).
 */

import { Platform } from 'react-native';
import {
  ref,
  getDownloadURL,
  deleteObject,
  uploadBytes,
} from 'firebase/storage';
import { storage } from '../config/firebase';
import {
  uploadImageToCloudinary,
  uploadBlobToCloudinary,
  cloudinaryThumb,
  type AvisoDeSubida,
} from './cloudinaryService';
import { uriSinMetadatos, blobSinMetadatos } from '../utils/publicImage';

export type { AvisoDeSubida, EstadoDeSubida } from './cloudinaryService';

// ─── Profile image ──────────────────────────────────────────────────

export const uploadProfileImageFromUri = async (
  imageUri: string,
  userId: string,
  type: 'avatar' | 'cover' = 'avatar',
  onEstado?: AvisoDeSubida,
): Promise<{ fullSize: string; thumbnail: string }> => {
  const folder = type === 'cover' ? `profile/${userId}/covers` : `profile/${userId}/avatars`;
  const url = await uploadImageToCloudinary(imageUri, folder, onEstado);
  return { fullSize: url, thumbnail: cloudinaryThumb(url, type === 'cover' ? 800 : 200) };
};

// ─── Banner/Cover image shortcut ────────────────────────────────────
export const uploadBannerImageFromUri = async (
  imageUri: string,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<{ fullSize: string; thumbnail: string }> => {
  return uploadProfileImageFromUri(imageUri, userId, 'cover', onEstado);
};

// ─── Post image ─────────────────────────────────────────────────────

export const uploadPostImage = async (
  imageFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<{ fullSize: string; thumbnail: string }> => {
  const blob = imageFile instanceof Blob ? imageFile : new Blob([imageFile as BlobPart], { type: 'image/jpeg' });
  const url = await uploadBlobToCloudinary(blob, `posts/${userId}`, onEstado);
  return { fullSize: url, thumbnail: cloudinaryThumb(url) };
};

// ─── Post image from URI ────────────────────────────────────────────

export const uploadPostImageFromUri = async (
  imageUri: string,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<{ fullSize: string; thumbnail: string }> => {
  const url = await uploadImageToCloudinary(imageUri, `posts/${userId}`, onEstado);
  return { fullSize: url, thumbnail: cloudinaryThumb(url) };
};

// ─── Community image ────────────────────────────────────────────────

export const uploadCommunityImage = async (
  imageUri: string,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<{ fullSize: string; thumbnail: string }> => {
  const url = await uploadImageToCloudinary(imageUri, `communities/${userId}`, onEstado);
  return { fullSize: url, thumbnail: cloudinaryThumb(url) };
};

// ─── Message image ──────────────────────────────────────────────────

export const uploadMessageImageFromUri = async (
  imageUri: string,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => {
  return uploadImageToCloudinary(imageUri, `messages/${userId}`, onEstado);
};

// ─── WeeTalk: la foto que se ve una sola vez ────────────────────────
/*
 * NO va a Cloudinary. Una foto «única» tiene que poder DESAPARECER cuando se
 * abre, y en Cloudinary Weë no puede borrar nada —preset sin firmar, sin
 * secreto de administración—: lo que entraba allí se quedaba para siempre,
 * con la URL guardada en el mensaje. Va al Storage de Weë, a una ruta que
 * solo leen los participantes de la conversación (`storage.rules`), y la
 * borra el servidor —`burnViewOnce`— cuando quien la recibe la ve
 * (Fase 11, C3). Sin metadatos, como todo lo que sale de la app.
 */
const MAXIMO_DE_FOTO_UNICA = 10 * 1024 * 1024;

export const uploadViewOncePhoto = async (
  imageUri: string,
  userId: string,
  conversationId: string,
): Promise<string> => {
  if (!storage) throw new Error('Storage no está inicializado');
  const limpia = Platform.OS === 'web' ? imageUri : await uriSinMetadatos(imageUri);
  const response = await fetch(limpia);
  const original = await response.blob();
  if (original.size > MAXIMO_DE_FOTO_UNICA) throw new Error('view-once photo over 10 MB');
  const blob = Platform.OS === 'web' ? await blobSinMetadatos(original) : original;
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `users/${userId}/weetalk/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
};

// ─── Comment image ──────────────────────────────────────────────────

export const uploadCommentImage = async (
  imageBlob: Blob,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => {
  return uploadBlobToCloudinary(imageBlob, `comments/${userId}`, onEstado);
};

// ─── Legacy: keep uploadProfileImage for any old callers ────────────

export const uploadProfileImage = async (
  imageFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => {
  const blob = imageFile instanceof Blob ? imageFile : new Blob([imageFile as BlobPart], { type: 'image/jpeg' });
  return uploadBlobToCloudinary(blob, `profile/${userId}`, onEstado);
};

// ─── Video (delegated to Cloudinary in cloudinaryService.ts) ────────

export const uploadPostVideo = async (
  videoFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => {
  // Videos still use the dedicated uploadVideoToCloudinary from cloudinaryService
  const { uploadVideoToCloudinary } = await import('./cloudinaryService');
  const blob = videoFile instanceof Blob ? videoFile : new Blob([videoFile as BlobPart], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const result = await uploadVideoToCloudinary(url, onEstado);
  URL.revokeObjectURL(url);
  return result;
};

// ─── Firebase Storage utils (for old files) ─────────────────────────

export const storageService = {
  async getDownloadUrl(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  },

  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  },

  async deleteFileByUrl(url: string): Promise<void> {
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file by URL:', error);
    }
  },
};
