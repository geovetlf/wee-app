/*
 * EL BLOQUEO DE CONTACTOS: NOMBRES Y CLAVES COMPARTIDOS (docs/WEETALK-BLOQUEO.md § 4.3 y § 4.7).
 * ---------------------------------------------------------------------------
 *
 * Lo comparten quien escribe (`weetalkBloqueos.ts`: bloquear y desbloquear) y quien consulta (`econtact.ts`: pedir y
 * aceptar, dentro de su propia transacción; y las reglas propuestas, con un `exists()` del índice). Vive aparte para que
 * `econtact.ts` lo lea sin importar `weetalkBloqueos.ts`, que ya importa de `econtact.ts`.
 *
 * Aquí solo hay nombres, claves y el límite: no se lee nada ni se deduce de quién es ninguna cara.
 */

/** La colección del índice. Solo del servidor: `firestore.rules` no la nombra y la denegación por defecto la cierra. */
export const PARES_BLOQUEADOS = 'weetalkBloqueosPorPar';

/** Las relaciones de bloqueo, una por pareja de cuentas y dirección (`{cuentaQueBloquea}~{cuentaBloqueada}`). */
export const BLOQUEOS = 'weetalkBloqueos';

/** Ni una cuenta ni una cara llevan `~`: las cuentas son alfanuméricas y las caras salen de ellas. */
export const SEPARADOR_DE_PAR = '~';

/** La clave de «`de` no puede contactar con `para`». La misma que componen las reglas: `de + '~' + para`. */
export const claveDePar = (de: string, para: string): string => `${de}${SEPARADOR_DE_PAR}${para}`;

/** La clave de la relación en la que `cuentaQueBloquea` bloqueó a `cuentaBloqueada`. */
export const claveDeRelacion = (cuentaQueBloquea: string, cuentaBloqueada: string): string =>
  `${cuentaQueBloquea}${SEPARADOR_DE_PAR}${cuentaBloqueada}`;

// ─── El límite contra intentos reiterados (decisión del dueño, 2026-11-07, tercera ronda) ──────────────────────

/*
 * Cuenta los intentos de una CUENTA (sus dos caras juntas) de contactar, por una operación, con cuentas que la han
 * BLOQUEADO. Pasado el máximo, esa operación de esa cuenta recibe el mismo rechazo genérico hacia cualquiera durante el
 * resto de la ventana: quien prueba perfiles deja de poder distinguirlos. Caduca sola, no suspende nada y no se apunta en
 * ningún sitio más.
 *
 * Solo del servidor (la denegación por defecto la cierra). La clave es de quien INTENTA, nunca de quien recibe: un
 * tercero no puede hacer que se limite a otra cuenta, porque solo cuentan los intentos propios.
 */
export const INTENTOS_BLOQUEADOS = 'weetalkIntentosBloqueados';

/** Las operaciones que el servidor puede contar hoy: las dos puertas de ËContact. */
export type OperacionDeContacto = 'pedir' | 'aceptar';

export const claveDeIntentos = (cuenta: string, operacion: OperacionDeContacto): string => `${cuenta}${SEPARADOR_DE_PAR}${operacion}`;

/**
 * VALOR INICIAL, A CONFIRMAR POR EL DUEÑO: 5 intentos bloqueados por hora, por cuenta y operación. Se aplica con
 * `cupoDeAvisos` (social/avisos.ts), la misma ventana fija que ya acota los avisos: no hay un segundo mecanismo.
 */
export const LIMITE_DE_INTENTOS_BLOQUEADOS = Object.freeze({ maximo: 5, ventanaMs: 60 * 60 * 1000 });
