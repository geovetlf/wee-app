/*
 * El material del personaje (docs/AUTONOMIA.md § 1b), lo que la app necesita saber.
 *
 * Gratis para la persona y sin coste de IA para Weë: el servidor saca el texto con
 * librerías libres y lo indexa por palabras. Estos límites son los mismos que
 * aplica el servidor (`functions/src/personajes/material.ts`); una prueba
 * comprueba que no se separen.
 */

export const MAX_ARCHIVOS_DE_MATERIAL = 5; // decisión del dueño, 2026-11-22
export const MAX_BYTES_POR_ARCHIVO = 20 * 1024 * 1024;

export const FORMATOS_DE_MATERIAL = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  epub: 'application/epub+zip',
  txt: 'text/plain',
  md: 'text/markdown',
} as const;
export type FormatoDeMaterial = keyof typeof FORMATOS_DE_MATERIAL;

/** Lo que acepta el selector de archivos (extensiones y tipos). */
export const ACEPTA_EL_SELECTOR = [...Object.keys(FORMATOS_DE_MATERIAL).map((e) => `.${e}`), ...Object.values(FORMATOS_DE_MATERIAL)].join(',');

/** El formato de un archivo por su extensión. `null` si no se admite. */
export function formatoDeArchivo(nombre: string): FormatoDeMaterial | null {
  const ext = String(nombre || '').toLowerCase().split('.').pop() || '';
  return ext in FORMATOS_DE_MATERIAL ? (ext as FormatoDeMaterial) : null;
}

export type EstadoDeMaterial = 'procesando' | 'listo' | 'error';
export type MotivoDeMaterial = 'demasiados' | 'muyGrande' | 'formatoNoAdmitido' | 'sinTexto' | 'ilegible';

/** Un archivo del material tal como lo escribe el servidor en `users/{perfil}/characterMaterial/{id}`. */
export interface ArchivoDeMaterial {
  id: string;
  nombre: string;
  formato: FormatoDeMaterial;
  bytes: number;
  estado: EstadoDeMaterial;
  motivo: MotivoDeMaterial | null;
  fragmentos: number;
  caracteres: number;
  recortado: boolean;
  creadoEn: number;
}
