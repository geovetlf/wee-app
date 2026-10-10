/*
 * PUERTO DE DIRECTORIO (navegador): la carpeta WEE a través de manejadores de
 * File System Access (carpeta del ordenador, Chromium) o de OPFS (espacio privado
 * del navegador, sin carpeta visible en el sistema). Es la misma API en los dos.
 *
 * Reglas que este puerto respeta:
 *   · Crear un archivo o una carpeta con el nombre de otro NO duplica: el nombre
 *     es único en el directorio. `getFileHandle(nombre, {create:true})` abre el
 *     existente, así que un reintento sobrescribe.
 *   · La escritura va por `createWritable()`: el archivo solo se sustituye al
 *     cerrar el flujo con éxito. Si se corta antes, queda el contenido anterior.
 *   · Los errores del navegador se traducen a `ErrorAlmacenLocal` por su nombre
 *     (NotFoundError, TypeMismatchError, QuotaExceededError, NotAllowedError).
 *
 * Los tipos son estructurales (solo lo que se usa), para no depender de la lib DOM
 * de TypeScript ni del navegador en las pruebas: el doble de la prueba cumple lo mismo.
 */
import { ErrorAlmacenLocal } from './tipos';
import type { EntradaDelPuerto, PuertoDeArchivos, TipoDeEntrada } from './puertoDeArchivos';

export interface ManejadorDeArchivoWeb {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<{ readonly size: number; arrayBuffer(): Promise<ArrayBuffer> }>;
  createWritable(): Promise<{ write(datos: Uint8Array): Promise<void>; close(): Promise<void> }>;
}

export interface ManejadorDeDirectorioWeb {
  readonly kind: 'directory';
  readonly name: string;
  getDirectoryHandle(nombre: string, opciones?: { create?: boolean }): Promise<ManejadorDeDirectorioWeb>;
  getFileHandle(nombre: string, opciones?: { create?: boolean }): Promise<ManejadorDeArchivoWeb>;
  removeEntry(nombre: string, opciones?: { recursive?: boolean }): Promise<void>;
  entries(): AsyncIterable<[string, ManejadorDeArchivoWeb | ManejadorDeDirectorioWeb]>;
}

const nombreDeError = (error: unknown): string => {
  if (typeof error !== "object" || error === null) return "";
  const nombre = (error as { name?: unknown }).name;
  return typeof nombre === "string" ? nombre : "";
};

const traducir = (error: unknown): ErrorAlmacenLocal => {
  const nombre = nombreDeError(error);
  if (nombre === 'QuotaExceededError') return new ErrorAlmacenLocal('sin_espacio');
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') return new ErrorAlmacenLocal('no_disponible', 'permiso');
  if (error instanceof ErrorAlmacenLocal) return error;
  return new ErrorAlmacenLocal('desconocido', nombre || undefined);
};

const esNoEncontrado = (error: unknown): boolean => nombreDeError(error) === 'NotFoundError';
const esTipoIncorrecto = (error: unknown): boolean => nombreDeError(error) === 'TypeMismatchError';

const partes = (ruta: string): string[] => (ruta ? ruta.split('/').filter((p) => p.length > 0) : []);

export const crearPuertoDirectorioWeb = (
  raiz: () => Promise<ManejadorDeDirectorioWeb>,
  espacio: () => Promise<number | null>,
): PuertoDeArchivos => {
  /** Directorio de una ruta. Con `crear`, crea los que falten; sin `crear`, null si no existe. */
  const directorioDe = async (ruta: string, crear: boolean): Promise<ManejadorDeDirectorioWeb | null> => {
    let directorio = await raiz();
    for (const segmento of partes(ruta)) {
      try {
        directorio = await directorio.getDirectoryHandle(segmento, { create: crear });
      } catch (error) {
        if (esNoEncontrado(error)) return null;
        throw traducir(error);
      }
    }
    return directorio;
  };

  const separar = (ruta: string): { carpeta: string; nombre: string } => {
    const trozos = partes(ruta);
    const nombre = trozos.pop();
    if (!nombre) throw new ErrorAlmacenLocal('desconocido', 'ruta vacía');
    return { carpeta: trozos.join('/'), nombre };
  };

  return {
    async tipoDe(ruta): Promise<TipoDeEntrada | null> {
      if (partes(ruta).length === 0) return 'carpeta';
      const { carpeta, nombre } = separar(ruta);
      const padre = await directorioDe(carpeta, false);
      if (!padre) return null;
      try {
        await padre.getFileHandle(nombre);
        return 'archivo';
      } catch (error) {
        if (esTipoIncorrecto(error)) return 'carpeta';
        if (!esNoEncontrado(error)) throw traducir(error);
      }
      return null;
    },

    async leer(ruta) {
      const { carpeta, nombre } = separar(ruta);
      const padre = await directorioDe(carpeta, false);
      if (!padre) throw new ErrorAlmacenLocal('no_encontrado', ruta);
      try {
        const archivo = await (await padre.getFileHandle(nombre)).getFile();
        return new Uint8Array(await archivo.arrayBuffer());
      } catch (error) {
        if (esNoEncontrado(error)) throw new ErrorAlmacenLocal('no_encontrado', ruta);
        throw traducir(error);
      }
    },

    async escribir(ruta, datos) {
      const { carpeta, nombre } = separar(ruta);
      const padre = await directorioDe(carpeta, true);
      if (!padre) throw new ErrorAlmacenLocal('no_disponible', 'no se pudo crear la carpeta');
      try {
        const archivo = await padre.getFileHandle(nombre, { create: true });
        const escritura = await archivo.createWritable();
        await escritura.write(datos);
        await escritura.close();
      } catch (error) {
        throw traducir(error);
      }
    },

    async mover(desde, hasta) {
      const contenido = await this.leer(desde);
      await this.escribir(hasta, contenido);
      await this.borrar(desde);
    },

    async borrar(ruta) {
      const { carpeta, nombre } = separar(ruta);
      const padre = await directorioDe(carpeta, false);
      if (!padre) return;
      try {
        await padre.removeEntry(nombre);
      } catch (error) {
        if (!esNoEncontrado(error)) throw traducir(error);
      }
    },

    async listar(carpeta) {
      const directorio = await directorioDe(carpeta, false);
      if (!directorio) return [];
      const entradas: EntradaDelPuerto[] = [];
      for await (const [nombre, manejador] of directorio.entries()) {
        if (manejador.kind === 'file') {
          const archivo = await manejador.getFile();
          entradas.push({ nombre, tipo: 'archivo', tamano: archivo.size });
        } else {
          entradas.push({ nombre, tipo: 'carpeta', tamano: 0 });
        }
      }
      return entradas;
    },

    espacioLibre: espacio,
  };
};
