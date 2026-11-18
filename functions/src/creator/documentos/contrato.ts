/**
 * LECTURA DE DOCUMENTOS (Filmmaker) — CONTRATO DE DATOS.
 *
 * Lo que sale de leer un guion, un documento o un libro: el dossier. El cliente lo reparte entre el Universo
 * (personajes, lugares, objetos) y las Tandas (capítulos con resumen y duración sugerida). Sin dependencias: lo
 * importan el servidor y las pruebas; el cliente tiene su espejo de tipos en `services/documentosService.ts`.
 */
export const DOSSIER_VERSION = 1;

export type FormatoDeDocumento = 'txt' | 'md' | 'pdf' | 'docx' | 'epub';
export const FORMATOS: readonly FormatoDeDocumento[] = ['txt', 'md', 'pdf', 'docx', 'epub'];
/** Mismos valores que `GrupoDePersonaje` del Universo del cliente. */
export type ImportanciaDePersonaje = 'main' | 'important' | 'groups' | 'other';
export const IMPORTANCIAS: readonly ImportanciaDePersonaje[] = ['main', 'important', 'groups', 'other'];

export interface PersonajeDelDossier {
  id: string;
  nombre: string;
  descripcion: string;
  importancia: ImportanciaDePersonaje;
  alias: string[];
}
export interface ElementoDelDossier {
  id: string;
  nombre: string;
  descripcion: string;
}
export interface CapituloDelDossier {
  id: string;
  orden: number;
  titulo: string;
  resumen: string;
  /** Segundos de pantalla sugeridos (una tanda ronda 180 s). */
  duracionSugeridaSeg: number;
  /** Ids de `personajes` y `lugares` que aparecen. */
  personajes: string[];
  lugares: string[];
}
export interface DossierDeDocumento {
  version: typeof DOSSIER_VERSION;
  formato: FormatoDeDocumento;
  titulo: string;
  sinopsis: string;
  tono: string;
  estilo: string;
  personajes: PersonajeDelDossier[];
  lugares: ElementoDelDossier[];
  objetos: ElementoDelDossier[];
  capitulos: CapituloDelDossier[];
  /** Cómo se leyó: `directo` (una pasada con el documento entero) o `por-bloques` (map-reduce, respaldo). */
  lectura: 'directo' | 'por-bloques';
  estadisticas: { caracteres?: number; paginas?: number; bloques?: number };
}

/** Topes de salida y de entrada. Una sola tabla. */
export const LIMITES = Object.freeze({
  bytesArchivo: 20 * 1024 * 1024,
  caracteresDeTexto: 1_200_000,
  paginasPdfNativo: 250,
  paginasPdf: 1000,
  caracteresPorBloque: 80_000,
  maxBloques: 20,
  lecturasEnParalelo: 3,
  capitulos: 60,
  personajes: 40,
  lugares: 30,
  objetos: 30,
  resumenCapitulo: 600,
  descripcion: 400,
  nombre: 60,
  sinopsis: 1200,
  tonoEstilo: 300,
  duracionMin: 30,
  duracionMax: 300,
  duracionPorDefecto: 180,
});

/** Motivos por los que un documento no se puede leer: la app los traduce con `filmmakerDocumentos.err.<motivo>`. */
export type MotivoDeDocumento =
  | 'formato_no_admitido'
  | 'archivo_vacio'
  | 'archivo_demasiado_grande'
  | 'texto_demasiado_largo'
  | 'pdf_demasiado_largo'
  | 'pdf_cifrado'
  | 'archivo_danado'
  | 'sin_texto'
  | 'no_se_pudo_leer';

export class ErrorDeDocumento extends Error {
  constructor(public readonly motivo: MotivoDeDocumento, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeDocumento';
  }
}
