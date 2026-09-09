import { Platform } from 'react-native';
import { uriSinMetadatos, blobSinMetadatos } from '../utils/publicImage';

const CLOUD_NAME = 'dnrj1guvs';
const UPLOAD_PRESET = 'hidetok-simple';
const BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

// ─── URL Helpers ────────────────────────────────────────────────────
// Cloudinary serves optimized images via URL transformations.
// - Cloudinary URLs: insert transforms into /upload/ path
// - Firebase/external URLs: use Cloudinary fetch API as proxy + CDN

export const cloudinaryUrl = (
  url: string,
  transforms: string = 'q_auto,f_auto',
): string => {
  if (!url) return url;

  // Cloudinary-hosted: insert transforms
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transforms}/`);
  }

  // Non-Cloudinary URLs (Firebase, etc.): return as-is
  return url;
};

/** Thumbnail for feeds, lists, avatars (small, fast) */
export const cloudinaryThumb = (url: string, width = 400) =>
  cloudinaryUrl(url, `c_fill,w_${width},q_auto,f_auto`);

/** Medium quality for feed images */
export const cloudinaryFeed = (url: string, width = 800) =>
  cloudinaryUrl(url, `c_limit,w_${width},q_auto,f_auto`);

/** Full quality (auto format/quality only) */
export const cloudinaryFull = (url: string) =>
  cloudinaryUrl(url, 'q_auto,f_auto');

/** Video thumbnail (first frame as JPG) */
export const cloudinaryVideoThumb = (url: string, width = 400) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  // Remove existing video transforms and replace with thumbnail transforms
  return url
    .replace(/\/video\/upload\/[^/]*\//, `/video/upload/so_0,w_${width},c_limit,f_jpg/`);
};

/** Profile avatar (square crop) */
export const cloudinaryAvatar = (url: string, size = 200) =>
  cloudinaryUrl(url, `c_fill,w_${size},h_${size},g_face,q_auto,f_auto`);

// ─── Upload helpers ─────────────────────────────────────────────────

const buildFormData = async (
  uri: string,
  resourceType: 'image' | 'video',
  folder?: string,
): Promise<FormData> => {
  const formData = new FormData();
  const ext = resourceType === 'video' ? 'mp4' : 'jpg';
  const mime = resourceType === 'video' ? 'video/mp4' : 'image/jpeg';

  /*
   * Aquí pasa TODO lo que se hace público en Weë: publicaciones, avatares,
   * portadas, comunidades, comentarios y las imágenes de WeeTalk. Por eso la
   * limpieza de metadatos vive en este punto y no repartida por cada pantalla:
   * una imagen que llegue por un camino nuevo queda protegida sin que nadie
   * tenga que acordarse de nada.
   *
   * El video no se toca: no se re-codifica aquí ni cabría hacerlo sin estropearlo.
   */
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('file', resourceType === 'image' ? await blobSinMetadatos(blob) : blob, `upload.${ext}`);
  } else {
    const limpio = resourceType === 'image' ? await uriSinMetadatos(uri) : uri;
    formData.append('file', { uri: limpio, type: mime, name: `upload.${ext}` } as any);
  }

  formData.append('upload_preset', UPLOAD_PRESET);
  if (folder) formData.append('folder', folder);

  return formData;
};

// ─── Image Upload ───────────────────────────────────────────────────

export const uploadImageToCloudinary = async (
  uri: string,
  folder: string = 'images',
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    onProgress?.(5);
    const formData = await buildFormData(uri, 'image', folder);

    const response = await fetch(`${BASE_URL}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    onProgress?.(90);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary image upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    onProgress?.(100);

    // Return the raw secure_url — consumers use cloudinaryThumb/Feed/Full for variants
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

// ─── Blob Upload (for images already in memory as Blob) ─────────────

export const uploadBlobToCloudinary = async (
  blob: Blob,
  folder: string = 'images',
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    onProgress?.(5);

    // La segunda puerta a lo público: por aquí entra lo que ya está en memoria
    // (las imágenes de una publicación, las de un comentario). Misma limpieza.
    const limpio = await blobSinMetadatos(blob);

    // Convert blob to base64 data URI (works reliably on both web and native)
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(limpio);
    });

    const formData = new FormData();
    formData.append('file', base64);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(`${BASE_URL}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    onProgress?.(90);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary blob upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    onProgress?.(100);
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading blob to Cloudinary:', error);
    throw error;
  }
};

// ─── Audio Upload ───────────────────────────────────────────────────

export const uploadAudioToCloudinary = async (
  uri: string,
  folder: string = 'audio',
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    onProgress?.(5);
    const formData = new FormData();
    formData.append('file', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio too

    const response = await fetch(`${BASE_URL}/video/upload`, {
      method: 'POST',
      body: formData,
    });

    onProgress?.(90);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary audio upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    onProgress?.(100);
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading audio to Cloudinary:', error);
    throw error;
  }
};

// ─── Video Upload ───────────────────────────────────────────────────

export const uploadVideoToCloudinary = async (
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    onProgress?.(5);
    const formData = await buildFormData(uri, 'video', 'videos');

    const response = await fetch(`${BASE_URL}/video/upload`, {
      method: 'POST',
      body: formData,
    });

    onProgress?.(90);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary video upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    onProgress?.(100);

    // Return optimized video URL
    return result.secure_url.replace('/upload/', '/upload/c_limit,h_720,q_auto,f_mp4/');
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    throw error;
  }
};
