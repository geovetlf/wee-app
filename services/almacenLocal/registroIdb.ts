/*
 * REGISTRO EN INDEXEDDB (web): un almacén clave-valor pequeño para lo que no se
 * puede guardar en texto. Guarda el manejador de la carpeta del ordenador
 * (FileSystemDirectoryHandle, que IndexedDB sí puede clonar) y el registro de la
 * ubicación. Así, al volver, la carpeta se reconoce sin preguntar de nuevo.
 *
 * La fábrica de IndexedDB se inyecta: en el navegador es `indexedDB`; en las
 * pruebas es un doble. La transacción se confirma entera o no se confirma.
 */
import { ErrorAlmacenLocal } from './tipos';

export interface PeticionIdb<T> {
  result: T;
  error: unknown;
  onsuccess: null | (() => void);
  onerror: null | (() => void);
}

export interface AlmacenIdb {
  put(valor: unknown, clave: string): PeticionIdb<unknown>;
  get(clave: string): PeticionIdb<unknown>;
  delete(clave: string): PeticionIdb<unknown>;
}

export interface TransaccionIdb {
  objectStore(nombre: string): AlmacenIdb;
  error: unknown;
  oncomplete: null | (() => void);
  onerror: null | (() => void);
  onabort: null | (() => void);
}

export interface BaseIdb {
  objectStoreNames: { contains(nombre: string): boolean };
  createObjectStore(nombre: string): unknown;
  transaction(nombre: string, modo: 'readonly' | 'readwrite'): TransaccionIdb;
}

export interface PeticionDeBaseIdb extends PeticionIdb<BaseIdb> {
  onupgradeneeded: null | (() => void);
  onblocked: null | (() => void);
}

export interface FabricaIdb {
  open(nombre: string, version: number): PeticionDeBaseIdb;
}

export interface RegistroDeClaves {
  leer(clave: string): Promise<unknown>;
  guardar(clave: string, valor: unknown): Promise<void>;
  borrar(clave: string): Promise<void>;
}

const TIENDA = 'claves';

export const crearRegistroIdb = (fabrica: FabricaIdb, nombreDeLaBase = 'wee-ubicacion'): RegistroDeClaves => {
  let base: Promise<BaseIdb> | null = null;

  const abrir = (): Promise<BaseIdb> => {
    if (!base) {
      base = new Promise<BaseIdb>((resolver, rechazar) => {
        const peticion = fabrica.open(nombreDeLaBase, 1);
        peticion.onupgradeneeded = () => {
          if (!peticion.result.objectStoreNames.contains(TIENDA)) peticion.result.createObjectStore(TIENDA);
        };
        peticion.onsuccess = () => resolver(peticion.result);
        peticion.onerror = () => rechazar(new ErrorAlmacenLocal('no_disponible', 'IndexedDB no se pudo abrir'));
        peticion.onblocked = () => rechazar(new ErrorAlmacenLocal('no_disponible', 'IndexedDB bloqueada'));
      }).catch((error: unknown) => {
        // Un fallo al abrir no se queda en memoria: la siguiente llamada lo vuelve a intentar.
        base = null;
        throw error;
      });
    }
    return base;
  };

  const transaccion = async (modo: 'readonly' | 'readwrite', operar: (almacen: AlmacenIdb) => PeticionIdb<unknown>): Promise<unknown> => {
    const db = await abrir();
    return new Promise<unknown>((resolver, rechazar) => {
      const tx = db.transaction(TIENDA, modo);
      const peticion = operar(tx.objectStore(TIENDA));
      let valor: unknown;
      peticion.onsuccess = () => {
        valor = peticion.result;
      };
      tx.oncomplete = () => resolver(valor);
      tx.onerror = () => rechazar(new ErrorAlmacenLocal('desconocido', 'transacción de IndexedDB'));
      tx.onabort = () => rechazar(new ErrorAlmacenLocal('desconocido', 'transacción abortada'));
    });
  };

  return {
    leer: (clave) => transaccion('readonly', (almacen) => almacen.get(clave)),
    guardar: async (clave, valor) => {
      await transaccion('readwrite', (almacen) => almacen.put(valor, clave));
    },
    borrar: async (clave) => {
      await transaccion('readwrite', (almacen) => almacen.delete(clave));
    },
  };
};
