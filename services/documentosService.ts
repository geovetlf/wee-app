import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import { motivoDeNoDisponible } from '../utils/noDisponible';

/**
 * Leer un documento, guion o libro (Weë Filmmaker): sube el archivo al Storage de Weë (`users/{uid}/creator-documents`),
 * cotiza, y le pide a `leerDocumento` el dossier. El servidor decide todo lo demás; aquí no hay proveedores ni modelos.
 *
 * Los tipos de abajo son el ESPEJO de `functions/src/creator/documentos/contrato.ts` (el cliente no importa del servidor).
 * Todo lo que falla sale como `ErrorDeDocumentoCliente` con una CLAVE de i18n (`filmmakerDocumentos.err*`), nunca una frase.
 */
export type FormatoDeDocumento = 'txt' | 'md' | 'pdf' | 'docx' | 'epub';
export type ImportanciaDePersonaje = 'main' | 'important' | 'groups' | 'other';

export interface PersonajeDelDossier { id: string; nombre: string; descripcion: string; importancia: ImportanciaDePersonaje; alias: string[] }
export interface ElementoDelDossier { id: string; nombre: string; descripcion: string }
export interface CapituloDelDossier { id: string; orden: number; titulo: string; resumen: string; duracionSugeridaSeg: number; personajes: string[]; lugares: string[] }
export interface DossierDeDocumento {
  version: 1;
  formato: FormatoDeDocumento;
  titulo: string;
  sinopsis: string;
  tono: string;
  estilo: string;
  personajes: PersonajeDelDossier[];
  lugares: ElementoDelDossier[];
  objetos: ElementoDelDossier[];
  capitulos: CapituloDelDossier[];
  lectura: 'directo' | 'por-bloques';
  estadisticas: { caracteres?: number; paginas?: number; bloques?: number };
}
export interface CotizacionDeDocumento { credits: number; formato: FormatoDeDocumento; paginas?: number; caracteres?: number }

/** Archivo elegido por la persona (lo que entrega cualquier selector de documentos). */
export interface ArchivoElegido { uri: string; name: string; size?: number; mimeType?: string }

export const EXTENSIONES_ADMITIDAS: readonly string[] = ['txt', 'md', 'markdown', 'pdf', 'docx', 'epub'];
export const MAX_BYTES_DE_DOCUMENTO = 20 * 1024 * 1024;

export class ErrorDeDocumentoCliente extends Error {
  constructor(public readonly clave: string, public readonly datos?: { credits?: number }) {
    super(clave);
    this.name = 'ErrorDeDocumentoCliente';
  }
}

const CLAVE_POR_MOTIVO: Readonly<Record<string, string>> = Object.freeze({
  formato_no_admitido: 'filmmakerDocumentos.errFormat',
  archivo_vacio: 'filmmakerDocumentos.errEmpty',
  archivo_demasiado_grande: 'filmmakerDocumentos.errTooBig',
  texto_demasiado_largo: 'filmmakerDocumentos.errTextTooLong',
  pdf_demasiado_largo: 'filmmakerDocumentos.errPdfTooLong',
  pdf_cifrado: 'filmmakerDocumentos.errPdfLocked',
  archivo_danado: 'filmmakerDocumentos.errDamaged',
  sin_texto: 'filmmakerDocumentos.errNoText',
  no_se_pudo_leer: 'filmmakerDocumentos.errRead',
  price_changed: 'filmmakerDocumentos.errPriceChanged',
});

const detallesDe = (error: unknown): { reason?: string; credits?: number } => {
  const e = (error ?? {}) as { details?: { reason?: unknown; credits?: unknown }; customData?: { details?: { reason?: unknown; credits?: unknown } }; code?: unknown; message?: unknown };
  const d = e.details || e.customData?.details || {};
  return { reason: typeof d.reason === 'string' ? d.reason : undefined, credits: typeof d.credits === 'number' ? d.credits : undefined };
};

/** Cualquier error del servidor → una clave de i18n. */
export const claveDeErrorDeDocumento = (error: unknown): string => {
  if (error instanceof ErrorDeDocumentoCliente) return error.clave;
  const { reason } = detallesDe(error);
  if (reason && CLAVE_POR_MOTIVO[reason]) return CLAVE_POR_MOTIVO[reason];
  if (motivoDeNoDisponible(error)) return 'filmmakerDocumentos.errClosed';
  const e = error as { code?: unknown; message?: unknown } | null;
  const texto = `${e?.code ?? ''} ${e?.message ?? ''}`;
  if (/INSUFFICIENT/i.test(texto)) return 'filmmakerDocumentos.errCredits';
  if (/DUPLICATE|already-exists/i.test(texto)) return 'filmmakerDocumentos.errBusy';
  return 'filmmakerDocumentos.errGeneric';
};

const extensionDe = (nombre: string): string => (/\.([A-Za-z0-9]{1,8})$/.exec(nombre)?.[1] ?? '').toLowerCase();

/** Antes de subir nada: tipo y tamaño. El servidor lo vuelve a comprobar por los bytes. */
export const comprobarArchivo = (archivo: ArchivoElegido): void => {
  if (!EXTENSIONES_ADMITIDAS.includes(extensionDe(archivo.name))) throw new ErrorDeDocumentoCliente('filmmakerDocumentos.errFormat');
  if (archivo.size === 0) throw new ErrorDeDocumentoCliente('filmmakerDocumentos.errEmpty');
  if (typeof archivo.size === 'number' && archivo.size > MAX_BYTES_DE_DOCUMENTO) throw new ErrorDeDocumentoCliente('filmmakerDocumentos.errTooBig');
};

const TIPO_POR_EXTENSION: Readonly<Record<string, string>> = Object.freeze({
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  epub: 'application/epub+zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

/** Sube el archivo al Storage de Weë y devuelve su URL. El contenido nunca pasa por Firestore. */
export async function subirDocumento(uid: string, archivo: ArchivoElegido): Promise<string> {
  comprobarArchivo(archivo);
  if (!storage) throw new ErrorDeDocumentoCliente('filmmakerDocumentos.errGeneric');
  const extension = extensionDe(archivo.name);
  const respuesta = await fetch(archivo.uri);
  const blob = await respuesta.blob();
  if (blob.size === 0) throw new ErrorDeDocumentoCliente('filmmakerDocumentos.errEmpty');
  if (blob.size > MAX_BYTES_DE_DOCUMENTO) throw new ErrorDeDocumentoCliente('filmmakerDocumentos.errTooBig');
  const destino = ref(storage, `users/${uid}/creator-documents/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`);
  await uploadBytes(destino, blob, { contentType: TIPO_POR_EXTENSION[extension] ?? 'application/octet-stream' });
  return getDownloadURL(destino);
}

interface Llamada {
  op: 'cotizar' | 'leer' | 'estado' | 'borrar';
  url?: string;
  nombre?: string;
  requestId?: string;
  creditosCotizados?: number;
  locale?: string;
}

const llamar = async <T,>(datos: Llamada): Promise<T> => {
  if (!functions) throw new ErrorDeDocumentoCliente('filmmakerDocumentos.errGeneric');
  try {
    const r = await httpsCallable(functions, 'leerDocumento', { timeout: 540_000 })(datos);
    return r.data as T;
  } catch (error) {
    throw new ErrorDeDocumentoCliente(claveDeErrorDeDocumento(error), { credits: detallesDe(error).credits });
  }
};

export const cotizarDocumento = (url: string, nombre: string, locale?: string): Promise<CotizacionDeDocumento> =>
  llamar<{ status: 'QUOTED' } & CotizacionDeDocumento>({ op: 'cotizar', url, nombre, locale });

/** Lee el documento. `requestId` es la operación: repetirla no cobra dos veces y devuelve el dossier ya hecho. */
export const leerDocumento = async (v: { url: string; nombre: string; requestId: string; creditosCotizados: number; locale?: string }): Promise<DossierDeDocumento> =>
  (await llamar<{ dossier: DossierDeDocumento }>({ op: 'leer', ...v })).dossier;

/** Recupera el dossier de una lectura ya hecha (si la app perdió la respuesta). `null` si todavía se está leyendo. */
export const dossierDeLectura = async (requestId: string): Promise<DossierDeDocumento | null> => {
  const r = await llamar<{ status: 'DONE' | 'READING'; dossier?: DossierDeDocumento }>({ op: 'estado', requestId });
  return r.status === 'DONE' && r.dossier ? r.dossier : null;
};

export const borrarDossier = (requestId: string): Promise<unknown> => llamar({ op: 'borrar', requestId });
