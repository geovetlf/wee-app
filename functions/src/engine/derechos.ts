import type { DerechosDelMaterial } from '../core/content/asset';
import { derechosDelModelo } from './elegibilidad';
import { ADAPTERS } from './registry';
import type { ProviderAdapter } from './types';

/**
 * LOS DERECHOS DE LO QUE GENERÓ UNA IMPLEMENTACIÓN, sacados de SU modelo: el gobierno revisado que declara su
 * adaptador (`derechosDelModelo`: revisión, uso comercial, atribución, licencias y dónde no se puede usar ni mostrar).
 *
 * Una sola regla para los tres caminos que convierten un resultado en material —`creatorRun`, el Core síncrono y la
 * materialización asíncrona—, sin que ninguno sepa de qué proveedor ni de qué modelo se trata y sin un solo caso
 * especial: lo que cambia de un modelo a otro son sus DATOS. Sin modelo conocido o sin licencia ajena declarada no
 * hay derechos que copiar: un material sin `derechos` es uno sin licencia de terceros que cumplir.
 *
 * La jurisdicción con la que se decidió la operación no se copia aquí: vive en la auditoría
 * (`aiGenerations.elegibilidad`), a la que se llega por la procedencia del material.
 */
export const derechosDeImplementacion = (
  implementacion: { providerId?: string; modelId?: string } | undefined,
  adapters: Readonly<Record<string, ProviderAdapter>> = ADAPTERS,
): DerechosDelMaterial | undefined => {
  const providerId = implementacion?.providerId;
  const modelId = implementacion?.modelId;
  if (!providerId || !modelId) return undefined;
  return derechosDelModelo(adapters[providerId]?.models.find((m) => m.id === modelId));
};
