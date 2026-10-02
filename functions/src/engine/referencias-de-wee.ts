import { getFirestore } from 'firebase-admin/firestore';
import { ContinuityRequirements } from '../core';
import { leerElemento } from '../elements';
import { leerTextoDelMaterial } from '../content';
import { depsDeEntregaDeWee, solicitarEntrega } from '../media/entrega';
import {
  ResolucionDeReferencias, materializarRecursos, resolverMaterialDeUpstream, resolverReferenciasDeContinuidad,
} from './referencias';

/**
 * WEË — LAS DOS PUERTAS DE VERDAD, ATADAS A LA RESOLUCIÓN DE REFERENCIAS.
 *
 * `referencias.ts` no sabe de Firestore a propósito: recibe puertos y se puede
 * probar entero sin base de datos. Este archivo es el único sitio donde esos
 * puertos se enchufan a lo real, y lo que enchufa son **las puertas que ya
 * existían**:
 *
 *   `leerElemento`      la de S4. Devuelve `null` si el elemento no está O si
 *                       es de otra cuenta, sin distinguirlo.
 *   `solicitarEntrega`  la de MC-2. Comprueba cuenta, estado del material,
 *                       ficha del objeto y capacidad del almacén, y firma una
 *                       llave temporal sin escribir nada.
 *
 * Ni una segunda forma de preguntar «¿es tuyo?», ni un segundo firmador, ni un
 * segundo cliente de almacenamiento. Si algún día cambia cómo se autoriza un
 * material, cambia en su sitio y esto se entera solo.
 */

/**
 * LA RESOLUCIÓN DE WEË. Una cuenta, unos requisitos, el material autorizado.
 *
 * ── Por qué la cuenta vale como principal ───────────────────────────────────
 *
 * Porque `solicitarEntrega` resuelve la cuenta por la única puerta que contesta
 * esa pregunta en todo Weë, y esa puerta, cuando nadie pide actuar desde otra
 * cuenta, devuelve la propia sin leer nada. Así que pasar aquí el identificador
 * autenticado no cuesta una lectura extra y sigue sin duplicar la autenticación:
 * quien decide de qué cuenta puede actuar alguien sigue siendo la misma función.
 */
export const referenciasDeContinuidadDeWee = (
  accountId: string,
  requisitos: ContinuityRequirements,
  operationId?: string,
): Promise<ResolucionDeReferencias> => {
  const db = getFirestore();
  const deps = depsDeEntregaDeWee(db);
  return resolverReferenciasDeContinuidad(accountId, requisitos, {
    elemento: (cuenta, elementId) => leerElemento(cuenta, elementId, { db }),
    entrega: async (assetId) => {
      const desenlace = await solicitarEntrega(deps, { principalId: accountId, assetId, operationId });
      /* Un «no» de la entrega no se desmenuza aquí: hacia fuera todos los motivos contestan igual. */
      return desenlace.ok ? desenlace.entrega : null;
    },
  });
};

/**
 * LOS ADJUNTOS DE UNA PETICIÓN, AUTORIZADOS. La misma puerta, sin el rodeo.
 *
 * Un adjunto ya señala el material —la persona subió esa foto y llegó con su
 * `assetId`—, así que no hay elemento ni versión que resolver antes. Lo que no
 * cambia es quién decide: `solicitarEntrega`, que comprueba cuenta, estado y
 * ficha del objeto antes de firmar nada.
 */
export const recursosAdjuntosDeWee = (
  accountId: string,
  adjuntos: readonly { kind: string; assetId?: string; url?: string; name?: string }[],
  operationId?: string,
): Promise<ResolucionDeReferencias> => {
  const db = getFirestore();
  const deps = depsDeEntregaDeWee(db);
  return materializarRecursos(accountId, adjuntos, {
    entrega: async (assetId) => {
      const desenlace = await solicitarEntrega(deps, { principalId: accountId, assetId, operationId });
      return desenlace.ok ? desenlace.entrega : null;
    },
  });
};

/**
 * EL MATERIAL DE LOS PASOS ANTERIORES, ATADO A LAS PUERTAS DE VERDAD.
 *
 * Dos puertas porque hay dos clases de material y no se leen igual: el texto
 * está en su ficha y lo lee `leerTextoDelMaterial` comprobando la cuenta; lo
 * demás está en el almacén y lo firma `solicitarEntrega`, que comprueba lo
 * mismo y algo más. Ni una tercera, ni un atajo.
 */
export const upstreamDeWee = (
  accountId: string,
  upstream: readonly { stepId: string; capability: string; produces?: string; outputRefs: readonly string[] }[],
  operationId?: string,
) => {
  const db = getFirestore();
  const deps = depsDeEntregaDeWee(db);
  return resolverMaterialDeUpstream(accountId, upstream, {
    texto: (assetId) => leerTextoDelMaterial(accountId, assetId),
    entrega: async (assetId) => {
      const desenlace = await solicitarEntrega(deps, { principalId: accountId, assetId, operationId });
      return desenlace.ok ? desenlace.entrega : null;
    },
  });
};
