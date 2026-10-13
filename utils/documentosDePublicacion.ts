/**
 * DOCUMENTOS EN UNA PUBLICACIÓN (R9 · D, aprobado por el dueño el 2026-10-13) — las reglas, sin pantalla ni Firebase.
 *
 * Una publicación del Wäll puede llevar hasta CINCO documentos PDF de hasta 10 MB cada uno. Viven en el Storage de Weë
 * (`documents/posts/{identidad}/…`, `storage.rules`) y la publicación guarda solo su referencia en `documents`
 * (`services/firestoreService.ts`): URL de descarga, nombre, tipo y tamaño. Nada más.
 *
 * Se valida TRES veces y en capas: el selector pide PDF; aquí se comprueba el tipo que dice el sistema, el tamaño y la
 * CABECERA del archivo (los primeros bytes de un PDF son `%PDF-`: una extensión cambiada no cuela); y las reglas de
 * Storage repiten tipo y tamaño en el servidor. Nunca se fía de la extensión. La cabecera es una validación de TIPO, no
 * de seguridad: no es un antivirus (un PDF malicioso también empieza por `%PDF-`).
 *
 * Con qué se combina: con TODO lo demás de una publicación —texto, fotos, un vídeo, una encuesta—, porque no comparte
 * campo con nada: `documents` va aparte de `imageUrls`, `videoUrl` y `poll`, y el Wäll los pinta en su sitio. Sigue
 * siendo UNA publicación; nunca una por archivo.
 */

export const TIPO_PDF = 'application/pdf';
export const MAX_BYTES_DOCUMENTO = 10 * 1024 * 1024;
export const MAX_DOCUMENTOS = 5;

/** Lo que guarda la publicación de cada documento. */
export interface DocumentoDePost {
  url: string;
  nombre: string;
  tipo: typeof TIPO_PDF;
  bytes: number;
}

/** Un documento elegido y todavía sin subir (estado del compositor). */
export interface DocumentoElegido {
  id: string;
  uri: string;
  nombre: string;
  tipo: string;
  bytes: number;
  /** El objeto de web (`File`), si el selector lo da: se sube tal cual, sin volver a leer la URI. */
  archivo?: Blob;
}

export type MotivoDeRechazo = 'tipo' | 'grande' | 'vacio' | 'cabecera' | 'tope';

/** Nombre visible: sin ruta, sin saltos de línea y no más largo de la cuenta. Es contenido de la persona: no se traduce. */
export const nombreVisible = (nombre: unknown): string => {
  const limpio = String(nombre ?? '').split(/[\\/]/).pop()!.replace(/[\r\n\t]+/g, ' ').trim();
  return (limpio || 'documento.pdf').slice(0, 120);
};

/** ¿Vale este archivo, por lo que dice el selector? (La cabecera se mira aparte, con sus bytes.) */
export const validarDocumento = (d: { tipo?: string | null; bytes?: number | null }): { ok: true } | { ok: false; motivo: MotivoDeRechazo } => {
  if (d.tipo !== TIPO_PDF) return { ok: false, motivo: 'tipo' };
  if (typeof d.bytes !== 'number' || !Number.isFinite(d.bytes) || d.bytes <= 0) return { ok: false, motivo: 'vacio' };
  if (d.bytes > MAX_BYTES_DOCUMENTO) return { ok: false, motivo: 'grande' };
  return { ok: true };
};

/** ¿Empiezan estos bytes como un PDF (`%PDF-`)? */
export const esCabeceraPdf = (bytes: ArrayLike<number> | null | undefined): boolean => {
  const firma = [0x25, 0x50, 0x44, 0x46, 0x2d];
  if (!bytes || bytes.length < firma.length) return false;
  return firma.every((b, i) => bytes[i] === b);
};

/** Cuántos de los elegidos caben sin pasar del tope (los que sobran se dicen, no se pierden en silencio). */
export const cuantosCaben = (ya: number, nuevos: number): number => Math.max(0, Math.min(nuevos, MAX_DOCUMENTOS - ya));

/** El nombre del objeto en Storage: nuevo en cada subida (la política de no sobrescribir), sin el nombre de la persona. */
export const rutaDeDocumento = (identidad: string, ahoraMs: number, azar: string): string =>
  `documents/posts/${identidad}/${ahoraMs}-${azar}.pdf`;

/** Tamaño para leer: KB por debajo de 1 MB, MB con un decimal por encima. Devuelve la clave y el número; quien pinta formatea. */
export const tamanoParaLeer = (bytes: number): { clave: 'wall.documentSizeKb' | 'wall.documentSizeMb'; valor: number } =>
  bytes < 1024 * 1024
    ? { clave: 'wall.documentSizeKb', valor: Math.max(1, Math.round(bytes / 1024)) }
    : { clave: 'wall.documentSizeMb', valor: Math.round((bytes / (1024 * 1024)) * 10) / 10 };

/** Lo que se lee de una publicación guardada: solo documentos con forma de documento (lo escribió un cliente). */
export const documentosDePost = (v: unknown): DocumentoDePost[] =>
  (Array.isArray(v) ? v : [])
    .filter((d): d is DocumentoDePost => !!d && typeof d === 'object'
      && typeof (d as DocumentoDePost).url === 'string' && (d as DocumentoDePost).url.startsWith('https:' + '//')
      && typeof (d as DocumentoDePost).nombre === 'string' && (d as DocumentoDePost).tipo === TIPO_PDF
      && typeof (d as DocumentoDePost).bytes === 'number')
    .slice(0, MAX_DOCUMENTOS)
    .map((d) => ({ url: d.url, nombre: nombreVisible(d.nombre), tipo: TIPO_PDF, bytes: d.bytes }));
