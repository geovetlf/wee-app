/*
 * PAQUETE DE EXPORTACIÓN `wee-proyecto@1` (línea B1). Contenedor binario de un
 * proyecto local, sin dependencias:
 *
 *   [0..8)      magia ASCII «WEEPROY1»
 *   [8..12)     longitud M del manifiesto, entero de 32 bits big-endian
 *   [12..12+M)  manifiesto JSON en UTF-8
 *   resto       los archivos, uno detrás de otro, en el orden del manifiesto
 *
 * El manifiesto lleva el formato, el proyecto y, por cada archivo, su id, nombre,
 * tipo, tamaño, SHA-256 y desplazamiento dentro del bloque de archivos.
 *
 * QUÉ NO VIAJA: la cuenta (`ownerAccountId`), los ids de dispositivo, la carátula
 * (es regenerable) y cualquier dato de la cuenta de la persona. SÍ viajan los
 * nombres de los archivos, porque son parte del proyecto.
 *
 * `decodificarBundle` valida TODO antes de devolver nada. Quien importa no
 * escribe hasta tener el paquete entero y verificado: un paquete inválido no
 * deja basura en el almacén.
 */
import { concatenar, u32Codificar, u32Leer, utf8Codificar, utf8Decodificar } from './bytes';
import { sha256Hex } from './sha256';
import { TIPOS_DE_RECURSO, type EntradaDeImportacion, type TipoDeRecurso } from './catalogoLocal';

export const FORMATO_DEL_BUNDLE = 'wee-proyecto@1';
const MAGIA = utf8Codificar('WEEPROY1');
const CABECERA = MAGIA.length + 4;
const ID_VALIDO = /^[A-Za-z0-9_-]{3,64}$/;
const SHA_VALIDO = /^[0-9a-f]{64}$/;

export type CodigoDelBundle = 'formato_no_valido' | 'formato_desconocido' | 'hash_no_coincide';

export class ErrorDelBundle extends Error {
  readonly codigo: CodigoDelBundle;

  constructor(codigo: CodigoDelBundle, detalle?: string) {
    super(detalle ? `${codigo}: ${detalle}` : codigo);
    this.name = 'ErrorDelBundle';
    this.codigo = codigo;
  }
}

export interface ProyectoParaExportar {
  projectId: string;
  name: string;
  emoji: string;
  createdAt: number;
  updatedAt: number;
}

export interface ArchivoParaExportar {
  recursoId: string;
  nombre: string;
  tipo: TipoDeRecurso;
  mimeType: string;
  creadoEn: number;
  modificadoEn: number;
  derivadoDe?: string;
  datos: Uint8Array;
}

type Registro = Record<string, unknown>;
const esRegistro = (valor: unknown): valor is Registro => typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const esEntero = (valor: unknown): valor is number => typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;
const esFecha = (valor: unknown): valor is number => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
const esIdValido = (valor: unknown): valor is string => typeof valor === 'string' && ID_VALIDO.test(valor);
const esTexto = (valor: unknown, maximo: number): valor is string => typeof valor === 'string' && valor.length <= maximo;
const esTipo = (valor: unknown): valor is TipoDeRecurso => typeof valor === 'string' && (TIPOS_DE_RECURSO as readonly string[]).includes(valor);

const esLaMagia = (bytes: Uint8Array): boolean => {
  for (let i = 0; i < MAGIA.length; i++) if (bytes[i] !== MAGIA[i]) return false;
  return true;
};

/** Empaqueta un proyecto y sus archivos en un único `Uint8Array`. Quien llama ya ha leído los archivos y verificado sus huellas. */
export const codificarBundle = (proyecto: ProyectoParaExportar, archivos: ArchivoParaExportar[], exportadoEn: number): Uint8Array => {
  const bloques: Uint8Array[] = [];
  const recursos: Registro[] = [];
  let desplazamiento = 0;
  for (const archivo of archivos) {
    recursos.push({
      id: archivo.recursoId,
      nombre: archivo.nombre,
      tipo: archivo.tipo,
      mimeType: archivo.mimeType,
      tamano: archivo.datos.byteLength,
      sha256: sha256Hex(archivo.datos),
      desplazamiento,
      creadoEn: archivo.creadoEn,
      modificadoEn: archivo.modificadoEn,
      ...(archivo.derivadoDe ? { derivadoDe: archivo.derivadoDe } : {}),
    });
    bloques.push(archivo.datos);
    desplazamiento += archivo.datos.byteLength;
  }
  const manifiesto = {
    formato: FORMATO_DEL_BUNDLE,
    exportadoEn,
    proyecto: {
      id: proyecto.projectId,
      nombre: proyecto.name,
      emoji: proyecto.emoji,
      creadoEn: proyecto.createdAt,
      modificadoEn: proyecto.updatedAt,
    },
    recursos,
  };
  const cuerpo = utf8Codificar(JSON.stringify(manifiesto));
  return concatenar([MAGIA, u32Codificar(cuerpo.byteLength), cuerpo, ...bloques]);
};

/**
 * Lee y verifica un paquete. Lanza `ErrorDelBundle` ante cualquier defecto: el
 * formato, la versión, el manifiesto, la longitud exacta, o el SHA-256 de un archivo.
 * Devuelve la entrada lista para `catalogo.importarProyecto`.
 */
export const decodificarBundle = (bytes: Uint8Array): { formato: string; exportadoEn: number; entrada: EntradaDeImportacion } => {
  if (bytes.byteLength < CABECERA || !esLaMagia(bytes)) throw new ErrorDelBundle('formato_no_valido', 'no es un paquete de Weë');
  const largo = u32Leer(bytes, MAGIA.length);
  if (CABECERA + largo > bytes.byteLength) throw new ErrorDelBundle('formato_no_valido', 'el manifiesto está cortado');

  let crudo: unknown;
  try {
    crudo = JSON.parse(utf8Decodificar(bytes.subarray(CABECERA, CABECERA + largo)));
  } catch {
    throw new ErrorDelBundle('formato_no_valido', 'el manifiesto no es JSON');
  }
  if (!esRegistro(crudo) || typeof crudo.formato !== 'string') throw new ErrorDelBundle('formato_no_valido', 'sin formato');
  if (crudo.formato !== FORMATO_DEL_BUNDLE) {
    const version = /^wee-proyecto@(\d+)$/.exec(crudo.formato);
    throw new ErrorDelBundle(version && Number(version[1]) > 1 ? 'formato_desconocido' : 'formato_no_valido', crudo.formato);
  }

  const proyecto = crudo.proyecto;
  if (
    !esRegistro(proyecto) ||
    !esIdValido(proyecto.id) ||
    !esTexto(proyecto.nombre, 200) ||
    !esTexto(proyecto.emoji, 16) ||
    !esFecha(proyecto.creadoEn) ||
    !esFecha(proyecto.modificadoEn)
  ) {
    throw new ErrorDelBundle('formato_no_valido', 'proyecto incompleto');
  }
  if (!Array.isArray(crudo.recursos) || !esFecha(crudo.exportadoEn)) throw new ErrorDelBundle('formato_no_valido', 'recursos o fecha ausentes');

  const inicioDelPayload = CABECERA + largo;
  let esperado = 0;
  const ids = new Set<string>();
  const archivos: EntradaDeImportacion['archivos'] = [];
  for (const recurso of crudo.recursos) {
    if (
      !esRegistro(recurso) ||
      !esIdValido(recurso.id) ||
      ids.has(recurso.id) ||
      !esTexto(recurso.nombre, 120) ||
      !esTipo(recurso.tipo) ||
      !esTexto(recurso.mimeType, 120) ||
      !esEntero(recurso.tamano) ||
      typeof recurso.sha256 !== 'string' ||
      !SHA_VALIDO.test(recurso.sha256) ||
      recurso.desplazamiento !== esperado ||
      !esFecha(recurso.creadoEn) ||
      !esFecha(recurso.modificadoEn) ||
      (recurso.derivadoDe !== undefined && !esIdValido(recurso.derivadoDe))
    ) {
      throw new ErrorDelBundle('formato_no_valido', 'recurso incompleto o fuera de orden');
    }
    const fin = inicioDelPayload + esperado + recurso.tamano;
    if (fin > bytes.byteLength) throw new ErrorDelBundle('formato_no_valido', 'un archivo está cortado');
    const datos = bytes.slice(inicioDelPayload + esperado, fin);
    if (sha256Hex(datos) !== recurso.sha256) throw new ErrorDelBundle('hash_no_coincide', recurso.id);
    ids.add(recurso.id);
    archivos.push({
      recursoId: recurso.id,
      nombre: recurso.nombre,
      tipo: recurso.tipo,
      mimeType: recurso.mimeType,
      sha256: recurso.sha256,
      creadoEn: recurso.creadoEn,
      modificadoEn: recurso.modificadoEn,
      ...(recurso.derivadoDe !== undefined ? { derivadoDe: recurso.derivadoDe } : {}),
      datos,
    });
    esperado += recurso.tamano;
  }
  if (inicioDelPayload + esperado !== bytes.byteLength) throw new ErrorDelBundle('formato_no_valido', 'sobran bytes al final');

  return {
    formato: crudo.formato,
    exportadoEn: crudo.exportadoEn,
    entrada: {
      projectId: proyecto.id,
      name: proyecto.nombre,
      emoji: proyecto.emoji,
      createdAt: proyecto.creadoEn,
      archivos,
    },
  };
};
