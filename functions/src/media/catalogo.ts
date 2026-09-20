import { PuertoDeAlmacenamiento, RegistroDeProveedoresDeMedios, crearRegistroDeMedios } from '../core';
import { env } from '../engine/http';
import { DESCRIPTOR_DE_R2, R2_PROVIDER_ID, crearAdaptadorDeR2 } from './r2';

/**
 * QUIÉN EXISTE. Nada más.
 *
 * Esto NOMBRA a los proveedores de almacenamiento de Weë; no los configura
 * —cada adaptador resuelve la suya— y no decide nada. Está separado de las
 * operaciones por una razón concreta: guardar y entregar necesitan los dos el
 * mismo catálogo, y si viviera dentro de una de las dos, la otra tendría que
 * importarla. Eso es un ciclo, y un ciclo de módulos en este proyecto no da un
 * error claro: se lleva la memoria por delante y revienta en otro sitio.
 */

/** El catálogo vivo. Hoy un proveedor; mañana, uno más en esta lista y nada más cambia. */
export const registroDeMediosDeWee = (): RegistroDeProveedoresDeMedios =>
  crearRegistroDeMedios([DESCRIPTOR_DE_R2]).registro;

/**
 * Los adaptadores de verdad, por su identidad. El de mentira no está aquí: es
 * de las pruebas. Cada uno resuelve su propia configuración.
 */
export const adaptadoresDeMedios = (): Readonly<Record<string, PuertoDeAlmacenamiento>> => ({
  [R2_PROVIDER_ID]: crearAdaptadorDeR2(),
});

/** Cuál se usa hoy para guardar. Se puede cambiar sin tocar código con `MEDIA_PROVIDER`. */
export const proveedorConfigurado = (): string => env('MEDIA_PROVIDER') || R2_PROVIDER_ID;
