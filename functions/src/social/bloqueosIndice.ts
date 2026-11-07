/*
 * EL ÍNDICE DEL BLOQUEO DE CONTACTOS, COMPARTIDO (docs/WEETALK-BLOQUEO.md § 4.3).
 * ---------------------------------------------------------------------------
 *
 * `weetalkBloqueosPorPar/{de}~{para}` existe cuando la cara `de` NO puede contactar con la cara `para`. Lo escribe
 * solo `weetalkBloqueos.ts` (bloquear y desbloquear, desde la regla común) y lo CONSULTAN:
 *
 *   · `econtact.ts`: pedir y aceptar un ËContact, dentro de su propia transacción;
 *   · las reglas propuestas (ops/propuestas/weetalk-bloqueo), con un `exists()` de esta misma ruta.
 *
 * Vive aparte para que `econtact.ts` lo lea sin importar `weetalkBloqueos.ts`, que ya importa de `econtact.ts`.
 * Aquí solo hay nombres y la forma de la clave: no se lee nada, ni se deduce de quién es ninguna cara.
 */

/** La colección del índice. Solo del servidor: `firestore.rules` no la nombra y la denegación por defecto la cierra. */
export const PARES_BLOQUEADOS = 'weetalkBloqueosPorPar';

/** Ni una cuenta ni una cara llevan `~`: las cuentas son alfanuméricas y las caras salen de ellas. */
export const SEPARADOR_DE_PAR = '~';

/** La clave de «`de` no puede contactar con `para`». La misma que componen las reglas: `de + '~' + para`. */
export const claveDePar = (de: string, para: string): string => `${de}${SEPARADOR_DE_PAR}${para}`;
