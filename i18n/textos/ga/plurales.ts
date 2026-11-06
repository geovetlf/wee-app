/*
 * IRLANDÉS — las formas de plural que el español no tiene.
 *
 * El español declara `clave_one` y `clave_other`. `Intl.PluralRules('ga')` devuelve CINCO categorías: one (1), two (2),
 * few (3-6), many (7-10) y other (0 y 11+). Así que donde el español declara `_one`/`_other`, el irlandés declara además
 * `_two`, `_few` y `_many`, y el traductor elige la forma por Intl. Las cinco llevan `{{contador}}`: la mutación inicial
 * (lenición 2-6, eclipsis 7-10) va en la palabra, el número lo pone Intl.
 *
 * El tipo del módulo sigue siendo el del español; este envoltorio solo ADMITE las formas extra, no las exige.
 * Mismo patrón que `textos/ru/plurales.ts` (_few/_many) y `textos/he/plurales.ts` (_two).
 *
 *   import { ConPlurales } from './plurales';
 *   export const wall: ConPlurales<typeof import('../es/wall').wall> = { …, pollVotes_two: '{{contador}} vhóta', … };
 */
export type ConPlurales<T> = T & Partial<Record<`${string}_two` | `${string}_few` | `${string}_many`, string>>;
