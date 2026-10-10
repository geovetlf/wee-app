/*
 * PUERTO DE RUTAS: la carpeta WEE como rutas absolutas de un sistema de archivos
 * con nombres (iOS, dentro de la sandbox de la app; y la prueba, sobre disco real).
 *
 * `OperacionesDeRuta` es lo único que cambia entre plataformas. La implementación
 * nativa las resuelve con expo-file-system/legacy (en `ubicacion.ts`); la prueba
 * las resuelve con el disco de Node (en `functions/test/_dobles-local-first.mjs`).
 *
 * Esta capa NO sabe de iOS ni de Expo: solo traduce rutas relativas a absolutas.
 */
import { ErrorAlmacenLocal } from './tipos';
import type { EntradaDelPuerto, PuertoDeArchivos, TipoDeEntrada } from './puertoDeArchivos';

export interface OperacionesDeRuta {
  /** Archivo, carpeta o null. Ruta absoluta. */
  tipoDe(ruta: string): Promise<TipoDeEntrada | null>;
  /** Lee el archivo completo. Si no existe, lanza `ErrorAlmacenLocal('no_encontrado')`. */
  leer(ruta: string): Promise<Uint8Array>;
  /** Escribe el archivo, creando las carpetas intermedias. */
  escribir(ruta: string, datos: Uint8Array): Promise<void>;
  /** Borra el archivo. Idempotente. */
  borrar(ruta: string): Promise<void>;
  /** Mueve a una ruta que no existe. */
  mover(desde: string, hasta: string): Promise<void>;
  /** Crea una carpeta (y las intermedias). Si ya existe, no hace nada. */
  crearCarpeta(ruta: string): Promise<void>;
  /** Entradas directas de una carpeta absoluta. Una carpeta que no existe da []. */
  listar(ruta: string): Promise<EntradaDelPuerto[]>;
  /** Bytes libres o null. */
  espacioLibre(): Promise<number | null>;
}

const unirRuta = (raiz: string, relativa: string): string => {
  const base = raiz.endsWith('/') ? raiz : `${raiz}/`;
  return relativa ? `${base}${relativa}` : base;
};

export const crearPuertoDeRuta = (raizAbsoluta: string, operaciones: OperacionesDeRuta): PuertoDeArchivos => {
  if (!raizAbsoluta) throw new ErrorAlmacenLocal('no_disponible', 'sin raíz');
  return {
    tipoDe: (ruta) => operaciones.tipoDe(unirRuta(raizAbsoluta, ruta)),
    leer: (ruta) => operaciones.leer(unirRuta(raizAbsoluta, ruta)),
    escribir: (ruta, datos) => operaciones.escribir(unirRuta(raizAbsoluta, ruta), datos),
    mover: (desde, hasta) => operaciones.mover(unirRuta(raizAbsoluta, desde), unirRuta(raizAbsoluta, hasta)),
    borrar: (ruta) => operaciones.borrar(unirRuta(raizAbsoluta, ruta)),
    listar: (carpeta) => operaciones.listar(unirRuta(raizAbsoluta, carpeta)),
    espacioLibre: () => operaciones.espacioLibre(),
  };
};
