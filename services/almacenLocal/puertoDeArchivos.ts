/*
 * PUERTO DE ARCHIVOS de la carpeta WEE (línea B1, ubicación del dispositivo).
 *
 * Es lo que el almacén necesita de una carpeta física, sea del sistema de
 * archivos (iOS, dentro de la sandbox de la app), de Android (Storage Access
 * Framework) o del navegador (File System Access u OPFS). El almacén se escribe
 * UNA vez contra este contrato; cada plataforma entrega su implementación.
 *
 * Las rutas son relativas a la carpeta WEE, con «/» como separador. La raíz es ''.
 *
 * Contrato:
 *   · `escribir` crea o sobrescribe el archivo y crea las carpetas intermedias.
 *   · `mover` se usa SOLO hacia un nombre que no existe.
 *   · `borrar` es idempotente.
 *   · Un fallo se devuelve como ErrorAlmacenLocal (sin_espacio, no_encontrado,
 *     corrupto, no_disponible o desconocido), nunca como texto del sistema.
 *   · `espacioLibre` devuelve null si el sistema no lo dice; nunca 0.
 */

export type TipoDeEntrada = 'archivo' | 'carpeta';

export interface EntradaDelPuerto {
  nombre: string;
  tipo: TipoDeEntrada;
  /** Bytes del archivo, o null si la plataforma no los puede dar sin leerlo. Las carpetas dan 0. */
  tamano: number | null;
}

export interface PuertoDeArchivos {
  /** Qué hay en la ruta: archivo, carpeta o nada (null). */
  tipoDe(ruta: string): Promise<TipoDeEntrada | null>;
  leer(ruta: string): Promise<Uint8Array>;
  escribir(ruta: string, datos: Uint8Array): Promise<void>;
  mover(desde: string, hasta: string): Promise<void>;
  borrar(ruta: string): Promise<void>;
  listar(carpeta: string): Promise<EntradaDelPuerto[]>;
  espacioLibre(): Promise<number | null>;
}
