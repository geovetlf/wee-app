import { Platform } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { db, functions, storage } from '../config/firebase';
import { ArchivoDeMaterial, ACEPTA_EL_SELECTOR, FORMATOS_DE_MATERIAL, formatoDeArchivo, FormatoDeMaterial, MAX_ARCHIVOS_DE_MATERIAL, MAX_BYTES_POR_ARCHIVO } from '../utils/personajeMaterial';

/**
 * El material del personaje (docs/AUTONOMIA.md § 1b): el dueño sube su libro, su
 * biografía o las características de su mundo para que el personaje tenga memoria.
 *
 * GRATIS (decisión del dueño, 2026-11-22): subir no gasta Credits ni llama a ninguna
 * IA. La app solo sube el archivo a su carpeta del Storage; el servidor saca el
 * texto, lo indexa, borra el original y escribe el estado, que aquí solo se LEE.
 */

export type MotivoDeSubida = 'formatoNoAdmitido' | 'muyGrande' | 'demasiados' | 'fallo';

export class ErrorDeMaterial extends Error {
  constructor(public readonly motivo: MotivoDeSubida | 'noEsTuPersonaje' | 'desconocido') { super(motivo); }
}

/** Un archivo elegido por la persona, listo para subir. */
export interface ArchivoElegido { nombre: string; tamano: number; datos: Blob; formato: FormatoDeMaterial | null }

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const nuevoId = (): string => Array.from({ length: 20 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');

/**
 * ¿Se puede elegir un archivo en esta plataforma? En web, iOS y Android: en el
 * teléfono con `expo-document-picker` (el selector del sistema —Archivos en iOS,
 * el gestor de documentos en Android—), que exige un build nativo que lo incluya.
 */
export const puedeElegirArchivos = Platform.OS === 'web' || Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Los tipos que se piden al selector del teléfono. Android no siempre reconoce un
 * `.md` o un `.epub` y los marca como `application/octet-stream`: se piden también
 * para no esconderlos. Lo que no sea un formato admitido lo rechaza
 * `validarAntesDeSubir` por su extensión, y el servidor lo vuelve a comprobar.
 */
const TIPOS_DEL_SELECTOR_NATIVO = [
  ...Object.values(FORMATOS_DE_MATERIAL),
  'text/*',
  ...(Platform.OS === 'android' ? ['application/octet-stream'] : []),
];

/** El selector de documentos del teléfono (iOS y Android). */
async function elegirArchivoNativo(): Promise<ArchivoElegido | null> {
  const DocumentPicker = await import('expo-document-picker');
  const r = await DocumentPicker.getDocumentAsync({ type: TIPOS_DEL_SELECTOR_NATIVO, multiple: false, copyToCacheDirectory: true });
  const a = r.canceled ? null : r.assets?.[0];
  if (!a) return null;
  const formato = formatoDeArchivo(a.name);
  // Un formato no admitido o un archivo enorme no se lee: lo rechaza `validarAntesDeSubir` con su motivo.
  if (!formato || (a.size ?? 0) > MAX_BYTES_POR_ARCHIVO) {
    return { nombre: a.name, tamano: a.size ?? 0, datos: new Blob([]), formato };
  }
  const datos = await (await fetch(a.uri)).blob();
  return { nombre: a.name, tamano: a.size || datos.size, datos, formato };
}

/** Abre el selector de archivos (navegador o teléfono). `null` si la persona cancela o no hay selector. */
export function elegirArchivo(): Promise<ArchivoElegido | null> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return elegirArchivoNativo();
  if (!puedeElegirArchivos || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACEPTA_EL_SELECTOR;
    input.style.display = 'none';
    let resuelto = false;
    const terminar = (v: ArchivoElegido | null) => { if (!resuelto) { resuelto = true; resolve(v); } input.remove(); };
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      // Un formato no admitido llega con `formato: null`: lo rechaza `validarAntesDeSubir` con su motivo.
      terminar(f ? { nombre: f.name, tamano: f.size, datos: f, formato: formatoDeArchivo(f.name) } : null);
    });
    input.addEventListener('cancel', () => terminar(null));
    document.body.appendChild(input);
    input.click();
  });
}

/** Comprueba en la app lo que el servidor volverá a comprobar, para avisar antes de subir. */
export function validarAntesDeSubir(archivo: { nombre: string; tamano: number }, yaHay: number): MotivoDeSubida | null {
  if (!formatoDeArchivo(archivo.nombre)) return 'formatoNoAdmitido';
  if (archivo.tamano <= 0 || archivo.tamano > MAX_BYTES_POR_ARCHIVO) return 'muyGrande';
  if (yaHay >= MAX_ARCHIVOS_DE_MATERIAL) return 'demasiados';
  return null;
}

export const materialService = {
  /**
   * Sube un archivo. `derechos` es la declaración del dueño de que puede usar ese
   * contenido: sin ella, las reglas de Storage rechazan la subida.
   */
  subir: (perfilId: string, archivo: ArchivoElegido, yaHay: number, alProgreso?: (fraccion: number) => void): Promise<void> => {
    const motivo = validarAntesDeSubir(archivo, yaHay);
    if (motivo) return Promise.reject(new ErrorDeMaterial(motivo));
    const formato = archivo.formato as FormatoDeMaterial; // validado arriba
    const ruta = `users/${perfilId}/character-material/${nuevoId()}.${formato}`;
    const tarea = uploadBytesResumable(ref(storage, ruta), archivo.datos, {
      contentType: FORMATOS_DE_MATERIAL[formato],
      customMetadata: { nombre: archivo.nombre.slice(0, 200), derechos: 'si' },
    });
    return new Promise((resolve, reject) => {
      tarea.on('state_changed',
        (s) => alProgreso?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
        () => reject(new ErrorDeMaterial('fallo')),
        () => resolve());
    });
  },

  /** Borra un archivo y lo que el personaje sabía de él. Lo hace el servidor. */
  borrar: async (perfilId: string, archivoId: string): Promise<void> => {
    try {
      await httpsCallable(functions, 'materialPersonaje', { timeout: 30_000 })({ accion: 'borrar', perfilId, archivoId });
    } catch (error: any) {
      throw new ErrorDeMaterial(error?.details?.motivo === 'noEsTuPersonaje' ? 'noEsTuPersonaje' : 'desconocido');
    }
  },

  /** Los archivos del material y su estado, en tiempo real. Solo los lee su dueño. */
  escuchar: (perfilId: string, alCambiar: (archivos: ArchivoDeMaterial[]) => void) =>
    onSnapshot(
      query(collection(db, 'users', perfilId, 'characterMaterial'), orderBy('creadoEn', 'desc'), limit(MAX_ARCHIVOS_DE_MATERIAL * 3)),
      (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ArchivoDeMaterial, 'id'>) }))),
      () => alCambiar([]),
    ),
};
