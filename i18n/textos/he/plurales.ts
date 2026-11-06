/*
 * HEBREO — las formas de plural que el español no tiene.
 *
 * El español declara `clave_one` y `clave_other`. El hebreo tiene DUAL: `Intl.PluralRules('he')` devuelve
 * one / two / other (1 → one, 2 → two, el resto → other, incluido el 0). Así que donde el español declara
 * `_one`/`_other`, el hebreo puede declarar además `_two` («שתי הצבעות»), y el traductor la elegirá sola.
 *
 * El tipo del módulo sigue siendo el del español; este envoltorio solo ADMITE las formas extra, no las exige.
 * Mismo patrón que `textos/ru/plurales.ts` (_few/_many) y `textos/ar/plurales.ts` (_zero/_two/_few/_many).
 *
 *   import { ConPlurales } from './plurales';
 *   export const wall: ConPlurales<typeof import('../es/wall').wall> = { …, pollVotes_two: 'שתי הצבעות', … };
 */
export type ConPlurales<T> = T & Partial<Record<`${string}_two`, string>>;
