/*
 * PUERTO SAF (Android): la carpeta WEE a través del Storage Access Framework.
 *
 * En SAF no hay rutas: cada carpeta y cada archivo tienen una URI que devuelve el
 * sistema, y una carpeta se recorre pidiendo sus hijos. Por eso este puerto
 * resuelve las rutas relativas buscando cada nombre entre los hijos.
 *
 * DOS REGLAS DE SAF QUE ESTE PUERTO RESPETA:
 *   · Crear un archivo o una carpeta con un nombre que ya existe NO sustituye:
 *     el sistema crea «nombre (1)». Por eso, antes de crear, se busca el nombre.
 *     Así un reintento sobrescribe y nunca duplica.
 *   · Mover no es un renombrado fiable: se hace copiar, verificar y borrar.
 *     El protocolo del almacén solo mueve hacia nombres libres.
 *
 * ESPACIO: SAF no ofrece bytes libres; `espacioLibre` devuelve null (desconocido).
 *
 * `OperacionesSAF` lo implementa `ubicacion.ts` con expo-file-system/legacy
 * (StorageAccessFramework y las operaciones de archivo sobre URIs de contenido), y
 * lo implementa la prueba con un doble que modela esas reglas. La validación en
 * un teléfono real queda pendiente (sin dispositivo Android conectado).
 */
import { ErrorAlmacenLocal } from './tipos';
import type { EntradaDelPuerto, PuertoDeArchivos, TipoDeEntrada } from './puertoDeArchivos';

export interface HijoSAF {
  uri: string;
  nombre: string;
  esCarpeta: boolean;
  /** Bytes del archivo si el sistema los da; null si no. */
  tamano: number | null;
}

export interface OperacionesSAF {
  hijos(uriCarpeta: string): Promise<HijoSAF[]>;
  /** Crea una carpeta con ese nombre. El puerto NUNCA la llama si el nombre ya existe. */
  crearCarpeta(uriPadre: string, nombre: string): Promise<string>;
  /** Crea un archivo con ese nombre. El puerto NUNCA la llama si el nombre ya existe. */
  crearArchivo(uriPadre: string, nombre: string): Promise<string>;
  leer(uri: string): Promise<Uint8Array>;
  /** Sustituye el contenido de un archivo existente. */
  escribir(uri: string, datos: Uint8Array): Promise<void>;
  /** Borra un archivo o una carpeta. Idempotente para el puerto. */
  borrar(uri: string): Promise<void>;
}

const partes = (ruta: string): string[] => (ruta ? ruta.split('/').filter((p) => p.length > 0) : []);

export const crearPuertoSAF = (uriRaiz: string, operaciones: OperacionesSAF): PuertoDeArchivos => {
  if (!uriRaiz) throw new ErrorAlmacenLocal('no_disponible', 'sin carpeta WEE');

  const hijoPorNombre = async (uriCarpeta: string, nombre: string): Promise<HijoSAF | null> =>
    (await operaciones.hijos(uriCarpeta)).find((hijo) => hijo.nombre === nombre) ?? null;

  /** Resuelve una carpeta. Con `crear`, crea las que falten. Sin `crear`, null si no existe. */
  const carpetaDe = async (ruta: string, crear: boolean): Promise<string | null> => {
    let uri = uriRaiz;
    for (const segmento of partes(ruta)) {
      const hijo = await hijoPorNombre(uri, segmento);
      if (hijo) {
        if (!hijo.esCarpeta) throw new ErrorAlmacenLocal('desconocido', 'se esperaba una carpeta');
        uri = hijo.uri;
      } else if (crear) {
        uri = await operaciones.crearCarpeta(uri, segmento);
      } else {
        return null;
      }
    }
    return uri;
  };

  const separar = (ruta: string): { carpeta: string; nombre: string } => {
    const trozos = partes(ruta);
    const nombre = trozos.pop();
    if (!nombre) throw new ErrorAlmacenLocal('desconocido', 'ruta vacía');
    return { carpeta: trozos.join('/'), nombre };
  };

  /** El hijo de la ruta, sin crear nada. null si no existe. */
  const hijoDe = async (ruta: string): Promise<HijoSAF | null> => {
    if (partes(ruta).length === 0) return null;
    const { carpeta, nombre } = separar(ruta);
    const padre = await carpetaDe(carpeta, false);
    return padre ? hijoPorNombre(padre, nombre) : null;
  };

  return {
    async tipoDe(ruta): Promise<TipoDeEntrada | null> {
      if (partes(ruta).length === 0) return 'carpeta';
      const hijo = await hijoDe(ruta);
      if (!hijo) return null;
      return hijo.esCarpeta ? 'carpeta' : 'archivo';
    },

    async leer(ruta) {
      const hijo = await hijoDe(ruta);
      if (!hijo) throw new ErrorAlmacenLocal('no_encontrado', ruta);
      if (hijo.esCarpeta) throw new ErrorAlmacenLocal('desconocido', 'se esperaba un archivo');
      return operaciones.leer(hijo.uri);
    },

    async escribir(ruta, datos) {
      const { carpeta, nombre } = separar(ruta);
      const padre = await carpetaDe(carpeta, true);
      if (!padre) throw new ErrorAlmacenLocal('no_disponible', 'no se pudo crear la carpeta');
      const existente = await hijoPorNombre(padre, nombre);
      if (existente) {
        if (existente.esCarpeta) throw new ErrorAlmacenLocal('desconocido', 'hay una carpeta con ese nombre');
        await operaciones.escribir(existente.uri, datos);
        return;
      }
      const uri = await operaciones.crearArchivo(padre, nombre);
      await operaciones.escribir(uri, datos);
    },

    async mover(desde, hasta) {
      const contenido = await this.leer(desde);
      await this.escribir(hasta, contenido);
      await this.borrar(desde);
    },

    async borrar(ruta) {
      const hijo = await hijoDe(ruta);
      if (hijo) await operaciones.borrar(hijo.uri);
    },

    async listar(carpeta) {
      const uri = await carpetaDe(carpeta, false);
      if (!uri) return [];
      const entradas: EntradaDelPuerto[] = [];
      for (const hijo of await operaciones.hijos(uri)) {
        entradas.push({ nombre: hijo.nombre, tipo: hijo.esCarpeta ? 'carpeta' : 'archivo', tamano: hijo.esCarpeta ? 0 : hijo.tamano });
      }
      return entradas;
    },

    async espacioLibre() {
      return null;
    },
  };
};
