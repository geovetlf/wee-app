/**
 * Storage Service — TODO lo que la app sube va al Storage de Weë (Firebase Storage), nunca a terceros.
 *
 * Decisión del dueño (2026-11-26): Weë no depende de Cloudinary —su cuenta está deshabilitada y el preset sin firmar no
 * dejaba borrar nada—. Cada subida va a una carpeta con sus reglas en `storage.rules`:
 *
 *   publicaciones (foto)   images/posts/<cara>/        pública, 5 MB, image/*
 *   publicaciones (vídeo)  videos/posts/<cara>/        pública, 200 MB, video/mp4 | video/quicktime
 *   perfil y portada       images/profile/<cara>/      pública, 5 MB, image/*
 *   comunidades            images/communities/<cara>/  pública, 5 MB, image/*
 *   comentarios            images/comments/<cara>/     pública, 5 MB, image/*
 *   WeeTalk (foto, audio)  users/<cara>/weetalk/<conversación>/  solo los participantes, 10 MB
 *
 * `<cara>` es la identidad que publica (cuenta, Perfil Weë heredado o alter ego): la dirección pública de un alter ego
 * no delata su cuenta (F3). Lo público sale SIN metadatos (EXIF, GPS) y con el lado más largo limitado
 * (`utils/publicImage.ts`): menos almacenamiento y menos descarga para Weë y para quien mira. El vídeo se sube tal
 * cual (no hay recodificación en la app). Las direcciones guardadas llevan caché larga: un archivo subido no cambia.
 *
 * Progreso: una subida solo sabe que empezó y que terminó (`AvisoDeSubida`); nada de porcentajes inventados (Fase 11).
 */

import { Platform } from 'react-native';
import { ref, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebase';
import { uriSinMetadatos, blobSinMetadatos, LADO_MAXIMO_PUBLICO } from '../utils/publicImage';

export type EstadoDeSubida = 'subiendo' | 'terminado';
export type AvisoDeSubida = (estado: EstadoDeSubida) => void;

/** Lo que el servidor también exige (storage.rules). Aquí se comprueba antes para avisar sin gastar la subida. */
const MAXIMO_DE_IMAGEN = 5 * 1024 * 1024;
const MAXIMO_DE_FOTO_DE_CONVERSACION = 10 * 1024 * 1024;
const MAXIMO_DE_AUDIO = 10 * 1024 * 1024;
const MAXIMO_DE_VIDEO = 200 * 1024 * 1024;
/** El avatar se ve pequeño: con 1024 px sobra (y cabe de sobra en la regla). */
const LADO_DEL_AVATAR = 1024;
/** Un archivo subido nunca cambia (cada subida tiene su nombre): se puede guardar en caché un año. */
const CACHE_LARGA = 'public, max-age=31536000, immutable';

export class ArchivoRechazado extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ArchivoRechazado';
  }
}

const nombreUnico = (extension: string) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

const extensionDeImagen = (tipo: string) => (tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : tipo.includes('gif') ? 'gif' : 'jpg');

const comprobar = (blob: Blob, maximo: number) => {
  if (blob.size > maximo) {
    throw new ArchivoRechazado(`El archivo pesa ${Math.round(blob.size / 1024 / 1024)} MB y el máximo son ${Math.round(maximo / 1024 / 1024)} MB.`);
  }
};

/** La única escritura al Storage de Weë de este archivo. */
const subir = async (ruta: string, blob: Blob, contentType: string, onEstado?: AvisoDeSubida, cacheControl?: string): Promise<string> => {
  if (!storage) throw new Error('storage-sin-inicializar');
  onEstado?.('subiendo');
  const destino = ref(storage, ruta);
  await uploadBytes(destino, blob, { contentType, ...(cacheControl ? { cacheControl } : {}) });
  const url = await getDownloadURL(destino);
  onEstado?.('terminado');
  return url;
};

/** Una imagen pública desde su dirección local: sin metadatos, con el lado limitado, a su carpeta. */
const subirImagenPublica = async (imageUri: string, carpeta: string, lado: number, onEstado?: AvisoDeSubida): Promise<string> => {
  const limpia = await uriSinMetadatos(imageUri, lado);
  const blob = await (await fetch(limpia)).blob();
  comprobar(blob, MAXIMO_DE_IMAGEN);
  const tipo = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return subir(`${carpeta}/${nombreUnico(extensionDeImagen(tipo))}`, blob, tipo, onEstado, CACHE_LARGA);
};

/** Lo mismo, cuando la imagen ya está en memoria. */
const subirBlobPublico = async (blob: Blob, carpeta: string, lado: number, onEstado?: AvisoDeSubida): Promise<string> => {
  const limpio = await blobSinMetadatos(blob, lado);
  comprobar(limpio, MAXIMO_DE_IMAGEN);
  const tipo = limpio.type && limpio.type.startsWith('image/') ? limpio.type : 'image/jpeg';
  return subir(`${carpeta}/${nombreUnico(extensionDeImagen(tipo))}`, limpio, tipo, onEstado, CACHE_LARGA);
};

const comoBlob = (archivo: Blob | Uint8Array | ArrayBuffer, tipo: string): Blob =>
  archivo instanceof Blob ? archivo : new Blob([archivo as BlobPart], { type: tipo });

/* La miniatura es la misma dirección: el archivo ya está limitado de tamaño y el Storage no genera derivados. */
const conMiniatura = (url: string) => ({ fullSize: url, thumbnail: url });

// ─── Profile image ──────────────────────────────────────────────────

export const uploadProfileImageFromUri = async (
  imageUri: string,
  userId: string,
  type: 'avatar' | 'cover' = 'avatar',
  onEstado?: AvisoDeSubida,
): Promise<{ fullSize: string; thumbnail: string }> =>
  conMiniatura(await subirImagenPublica(imageUri, `images/profile/${userId}`, type === 'cover' ? LADO_MAXIMO_PUBLICO : LADO_DEL_AVATAR, onEstado));

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
): Promise<{ fullSize: string; thumbnail: string }> =>
  conMiniatura(await subirBlobPublico(comoBlob(imageFile, 'image/jpeg'), `images/posts/${userId}`, LADO_MAXIMO_PUBLICO, onEstado));

// ─── Post image from URI ────────────────────────────────────────────

export const uploadPostImageFromUri = async (
  imageUri: string,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<{ fullSize: string; thumbnail: string }> =>
  conMiniatura(await subirImagenPublica(imageUri, `images/posts/${userId}`, LADO_MAXIMO_PUBLICO, onEstado));

// ─── Community image ────────────────────────────────────────────────

export const uploadCommunityImage = async (
  imageUri: string,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<{ fullSize: string; thumbnail: string }> =>
  conMiniatura(await subirImagenPublica(imageUri, `images/communities/${userId}`, LADO_MAXIMO_PUBLICO, onEstado));

// ─── WeeTalk: foto de una conversación ──────────────────────────────
/*
 * A la carpeta privada de la conversación (`users/<cara>/weetalk/<conversación>/`): solo la leen los participantes
 * (storage.rules). Antes iba a Cloudinary, pública para cualquiera que tuviera la dirección y sin poder borrarse.
 */
export const uploadMessageImageFromUri = async (
  imageUri: string,
  userId: string,
  conversationId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => {
  const limpia = Platform.OS === 'web' ? imageUri : await uriSinMetadatos(imageUri);
  const original = await (await fetch(limpia)).blob();
  const blob = Platform.OS === 'web' ? await blobSinMetadatos(original) : original;
  comprobar(blob, MAXIMO_DE_FOTO_DE_CONVERSACION);
  const tipo = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return subir(`users/${userId}/weetalk/${conversationId}/${nombreUnico(extensionDeImagen(tipo))}`, blob, tipo, onEstado);
};

// ─── WeeTalk: nota de voz ───────────────────────────────────────────
/* Misma carpeta privada de la conversación. La grabación se sube tal cual (m4a / webm). */
export const uploadMessageAudio = async (
  audioUri: string,
  userId: string,
  conversationId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => {
  const blob = await (await fetch(audioUri)).blob();
  comprobar(blob, MAXIMO_DE_AUDIO);
  const tipo = blob.type && blob.type.startsWith('audio/') ? blob.type : Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
  const extension = tipo.includes('webm') ? 'webm' : tipo.includes('mpeg') ? 'mp3' : 'm4a';
  return subir(`users/${userId}/weetalk/${conversationId}/${nombreUnico(extension)}`, blob, tipo, onEstado);
};

// ─── WeeTalk: la foto que se ve una sola vez ────────────────────────
/*
 * Una foto «única» tiene que poder DESAPARECER cuando se abre: va a la carpeta de la conversación, que solo leen los
 * participantes, y la borra el servidor —`burnViewOnce`— cuando quien la recibe la ve (Fase 11, C3). Sin metadatos,
 * como todo lo que sale de la app.
 */
const MAXIMO_DE_FOTO_UNICA = 10 * 1024 * 1024;

export const uploadViewOncePhoto = async (
  imageUri: string,
  userId: string,
  conversationId: string,
): Promise<string> => {
  if (!storage) throw new Error('storage-sin-inicializar');
  const limpia = Platform.OS === 'web' ? imageUri : await uriSinMetadatos(imageUri);
  const response = await fetch(limpia);
  const original = await response.blob();
  if (original.size > MAXIMO_DE_FOTO_UNICA) throw new Error('foto-ver-una-vez-demasiado-grande');
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
): Promise<string> => subirBlobPublico(imageBlob, `images/comments/${userId}`, LADO_MAXIMO_PUBLICO, onEstado);

// ─── Legacy: keep uploadProfileImage for any old callers ────────────

export const uploadProfileImage = async (
  imageFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => subirBlobPublico(comoBlob(imageFile, 'image/jpeg'), `images/profile/${userId}`, LADO_DEL_AVATAR, onEstado);

// ─── Video de una publicación (Weëls incluidos) ─────────────────────
/*
 * Al Storage de Weë, tal cual: sin recodificar (la app no recodifica; un .mov o HEVC que un navegador no sepa abrir se
 * guarda igual). mp4 o mov, hasta 200 MB, como dicen las reglas.
 */
export const uploadPostVideoFromUri = async (
  videoUri: string,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => {
  const blob = await (await fetch(videoUri)).blob();
  comprobar(blob, MAXIMO_DE_VIDEO);
  const tipo = blob.type === 'video/quicktime' ? 'video/quicktime' : 'video/mp4';
  return subir(`videos/posts/${userId}/${nombreUnico(tipo === 'video/quicktime' ? 'mov' : 'mp4')}`, blob, tipo, onEstado, CACHE_LARGA);
};

export const uploadPostVideo = async (
  videoFile: Blob | Uint8Array | ArrayBuffer,
  userId: string,
  onEstado?: AvisoDeSubida,
): Promise<string> => {
  const blob = comoBlob(videoFile, 'video/mp4');
  comprobar(blob, MAXIMO_DE_VIDEO);
  const tipo = blob.type === 'video/quicktime' ? 'video/quicktime' : 'video/mp4';
  return subir(`videos/posts/${userId}/${nombreUnico(tipo === 'video/quicktime' ? 'mov' : 'mp4')}`, blob, tipo, onEstado, CACHE_LARGA);
};

// ─── Firebase Storage utils ─────────────────────────────────────────

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
