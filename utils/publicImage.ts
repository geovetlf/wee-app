import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Una foto de la galería lleva dentro mucho más de lo que se ve. Casi todos los
 * teléfonos escriben en su EXIF la latitud y la longitud exactas del sitio donde
 * se disparó —la casa, el colegio de los niños, el hotel—, y Weë sube las
 * imágenes públicas tal y como salen del selector. Sin esta limpieza, publicar
 * una foto sería publicar también sus coordenadas.
 *
 * La forma de limpiarlas es re-codificar el píxel: se decodifica la imagen y se
 * vuelve a escribir. Lo que sale es la misma foto —mismo tamaño, misma
 * orientación, misma calidad a ojo— sin ningún metadato heredado. No hace falta
 * ninguna librería nueva: en móvil lo hace expo-image-manipulator, que ya se usa
 * para comprimir, y en web el canvas del navegador.
 *
 * Se limpia SOLO lo que va a ser público, y en el único sitio por donde pasa todo
 * lo público: la subida al Storage de Weë (`services/storageService.ts`). Las fotos que la persona le entrega a Weë
 * Creator viven en su carpeta privada del Storage y no se tocan; si un resultado
 * se publica, sale por aquí como cualquier otra imagen.
 */

/** Calidad al re-escribir un JPEG. Alta a propósito: limpiar no es degradar. */
const CALIDAD = 0.92;

/**
 * EL LADO MÁS LARGO, COMO MUCHO (2026-11-26, coste mínimo): una foto de 12 MP sale del teléfono a 4032 px y pesa 3–6 MB;
 * en una pantalla de teléfono no se ve más que ~2048 px. Ya se reescribe para quitar el EXIF, así que limitarla aquí no
 * añade ningún paso y guarda y sirve ~4 veces menos píxeles. Una foto más pequeña se queda como está (nunca se amplía).
 */
export const LADO_MAXIMO_PUBLICO = 2048;

/** El tamaño que cabe en `lado` sin deformar y sin ampliar nunca. */
export const medidasQueCaben = (ancho: number, alto: number, lado: number): { ancho: number; alto: number } => {
  const mayor = Math.max(ancho, alto);
  if (!(mayor > lado)) return { ancho, alto };
  const f = lado / mayor;
  return { ancho: Math.round(ancho * f), alto: Math.round(alto * f) };
};

/** Un PNG se reescribe como PNG: si lo pasáramos a JPEG perdería la transparencia. */
const esPng = (pista: string): boolean => /png/i.test(pista);

export class ImagenNoLimpiable extends Error {
  constructor(causa: unknown) {
    super('No se pudo preparar la imagen para publicarla. Vuelve a intentarlo.');
    this.name = 'ImagenNoLimpiable';
    this.cause = causa;
  }
}

// ─── Web: el canvas del navegador ───────────────────────────────────────────

/**
 * `createImageBitmap` con `imageOrientation: 'from-image'` aplica la rotación que
 * venía en el EXIF antes de tirarlo, que es justo lo que hay que hacer: si se
 * descartara sin aplicarla, las fotos verticales se publicarían tumbadas.
 */
const decodificarEnWeb = async (blob: Blob): Promise<ImageBitmap | HTMLImageElement> => {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    // Navegadores sin esa opción: <img> ya respeta la orientación al decodificar.
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
};

const limpiarEnWeb = async (blob: Blob, lado: number): Promise<Blob> => {
  const fuente = await decodificarEnWeb(blob);
  const original = { ancho: 'naturalWidth' in fuente ? fuente.naturalWidth : fuente.width, alto: 'naturalHeight' in fuente ? fuente.naturalHeight : fuente.height };
  const { ancho, alto } = medidasQueCaben(original.ancho, original.alto, lado);

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const pincel = lienzo.getContext('2d');
  if (!pincel) throw new Error('lienzo-sin-contexto-2d');
  pincel.drawImage(fuente as CanvasImageSource, 0, 0, ancho, alto);
  if ('close' in fuente) fuente.close();

  const tipo = esPng(blob.type) ? 'image/png' : 'image/jpeg';
  const limpio = await new Promise<Blob | null>((resolve) => lienzo.toBlob(resolve, tipo, CALIDAD));
  if (!limpio) throw new Error('lienzo-sin-imagen');
  return limpio;
};

// ─── Móvil: expo-image-manipulator ──────────────────────────────────────────

const limpiarEnMovil = async (uri: string, lado: number): Promise<string> => {
  // Sin acciones: no se recorta ni se rota. El archivo se vuelve a escribir, y al escribirlo de nuevo no se copia nada
  // del EXIF original. Si pasa del lado máximo, una segunda escritura lo reduce (sin ampliar nunca).
  const formato = { compress: esPng(uri) ? 1 : CALIDAD, format: esPng(uri) ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG };
  const limpia = await ImageManipulator.manipulateAsync(uri, [], formato);
  const cabe = medidasQueCaben(limpia.width, limpia.height, lado);
  if (cabe.ancho === limpia.width && cabe.alto === limpia.height) return limpia.uri;
  const reducida = await ImageManipulator.manipulateAsync(limpia.uri, [{ resize: { width: cabe.ancho, height: cabe.alto } }], formato);
  return reducida.uri;
};

// ─── Lo que usa el resto de Weë ─────────────────────────────────────────────

/**
 * Devuelve una dirección a la misma imagen sin metadatos. En web sigue siendo una
 * dirección utilizable (un blob local); en móvil, un archivo nuevo en la caché.
 */
export const uriSinMetadatos = async (uri: string, lado: number = LADO_MAXIMO_PUBLICO): Promise<string> => {
  try {
    if (Platform.OS !== 'web') return await limpiarEnMovil(uri, lado);
    const original = await (await fetch(uri)).blob();
    return URL.createObjectURL(await limpiarEnWeb(original, lado));
  } catch (error) {
    throw new ImagenNoLimpiable(error);
  }
};

/** Igual, para cuando la imagen ya está en memoria. */
export const blobSinMetadatos = async (blob: Blob, lado: number = LADO_MAXIMO_PUBLICO): Promise<Blob> => {
  try {
    if (Platform.OS === 'web') return await limpiarEnWeb(blob, lado);
    // En móvil el manipulador trabaja con archivos: se pasa por un data URL.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onloadend = () => resolve(lector.result as string);
      lector.onerror = reject;
      lector.readAsDataURL(blob);
    });
    const limpia = await limpiarEnMovil(dataUrl, lado);
    return await (await fetch(limpia)).blob();
  } catch (error) {
    throw new ImagenNoLimpiable(error);
  }
};
