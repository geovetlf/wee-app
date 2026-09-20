import { createHash } from 'node:crypto';
import { Huella } from '../core';

/**
 * WEE MEDIA — LA HUELLA QUE EL CORE NO PUEDE CALCULAR.
 *
 * El Core no importa criptografía: declara el puerto `Huella` y quien compone
 * lo rellena. Esto lo rellena para la capa de medios, y es deliberadamente el
 * MISMO algoritmo que `huellaDelSistema` en la moderación —SHA-256 en
 * hexadecimal, sin sal ni versión— porque dos algoritmos distintos darían dos
 * identidades distintas para el mismo objeto, y toda la idempotencia de MC-1
 * depende de que la identidad de un objeto sea siempre la misma.
 *
 * No se reutiliza aquel símbolo por una razón de dependencias, no de criterio:
 * `moderation/index.ts` trae consigo `onCall` y Firestore, y la capa de medios
 * no tiene por qué cargar las Functions de moderación para nombrar un objeto.
 *
 * Nada de lo que entra aquí es un secreto. Se le dan rutas y nombres de
 * proveedor; nunca una credencial, nunca bytes de nadie.
 */
export const huellaDeMedios: Huella = (texto) => createHash('sha256').update(texto, 'utf8').digest('hex');
