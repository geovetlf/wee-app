/**
 * Storage Service — All uploads go through Cloudinary.
 * No separate thumbnails needed: use cloudinaryThumb(url) for thumbnails.
 *
 * The old Firebase Storage class is kept for backwards compatibility
 * (reading/deleting old files), but all new uploads use Cloudinary.
 */

import {
  ref,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../config/firebase';
import {
  uploadImageToCloudinary,
  uploadBlobToCloudinary,
  cloudinaryThumb,
} from './cloudinaryService';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

// ─── Adapter: convert Cloudinary progress (0-100) to UploadProgress ──
const wrapProgress = (onProgress?: (p: UploadProgress) => void) => {
  if (!onProgress) return undefined;
  return (pct: number) => onProgress({ bytesTransferred: pct, totalBytes: 100, progress: pct });
};

// ─── Profile image ──────────────────────────────────────────────────

export const uploadProfileImageFromUri = async (
  imageUri: string,
  userId: string,
  type: 'avatar' | 'cover' = 'avatar',
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ fullSize: string; thumbnail: string }> => {
  const folder = type === 'cover' ? `profile/${userId}/covers` : `profile/${userId}/avatars`;
  const url = await uploadImageToCloudinary(imageUri, folder, wrapProgress(onProgress));
  return { fullSize: url, thumbnail: cloudinaryThumb(url, type === 'cover' ? 800 : 200) };
};

// ─── Banner/Cover image shortcut ────────────────────────────────────
export const uploadBannerImageFromUri = async (
  imageUri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ fullSize: string; thumbnail: string }> => {
  return uploadProfileImageFromUri(imageUri, userId, 'cover', onProgress);
};

// ─── Post image ─────────────────────────────────────────────────────

export const uploadPostImage = async (
  imageFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ fullSize: string; thumbnail: string }> => {
  const blob = imageFile instanceof Blob ? imageFile : new Blob([imageFile as BlobPart], { type: 'image/jpeg' });
  const url = await uploadBlobToCloudinary(blob, `posts/${userId}`, wrapProgress(onProgress));
  return { fullSize: url, thumbnail: cloudinaryThumb(url) };
};

// ─── Post image from URI ────────────────────────────────────────────

export const uploadPostImageFromUri = async (
  imageUri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ fullSize: string; thumbnail: string }> => {
  const url = await uploadImageToCloudinary(imageUri, `posts/${userId}`, wrapProgress(onProgress));
  return { fullSize: url, thumbnail: cloudinaryThumb(url) };
};

// ─── Community image ────────────────────────────────────────────────

export const uploadCommunityImage = async (
  imageUri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ fullSize: string; thumbnail: string }> => {
  const url = await uploadImageToCloudinary(imageUri, `communities/${userId}`, wrapProgress(onProgress));
  return { fullSize: url, thumbnail: cloudinaryThumb(url) };
};

// ─── Message image ──────────────────────────────────────────────────

export const uploadMessageImageFromUri = async (
  imageUri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> => {
  return uploadImageToCloudinary(imageUri, `messages/${userId}`, wrapProgress(onProgress));
};

// ─── Comment image ──────────────────────────────────────────────────

export const uploadCommentImage = async (
  imageBlob: Blob,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> => {
  return uploadBlobToCloudinary(imageBlob, `comments/${userId}`, wrapProgress(onProgress));
};

// ─── Legacy: keep uploadProfileImage for any old callers ────────────

export const uploadProfileImage = async (
  imageFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> => {
  const blob = imageFile instanceof Blob ? imageFile : new Blob([imageFile as BlobPart], { type: 'image/jpeg' });
  return uploadBlobToCloudinary(blob, `profile/${userId}`, wrapProgress(onProgress));
};

// ─── Video (delegated to Cloudinary in cloudinaryService.ts) ────────

export const uploadPostVideo = async (
  videoFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> => {
  // Videos still use the dedicated uploadVideoToCloudinary from cloudinaryService
  const { uploadVideoToCloudinary } = await import('./cloudinaryService');
  const blob = videoFile instanceof Blob ? videoFile : new Blob([videoFile as BlobPart], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const result = await uploadVideoToCloudinary(url, wrapProgress(onProgress));
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
