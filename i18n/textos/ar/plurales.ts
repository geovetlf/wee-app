/*
 * EL ÁRABE NECESITA MÁS FORMAS DE PLURAL QUE EL ESPAÑOL (Y MÁS QUE EL RUSO).
 * ESTO SE LAS DA.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * `Intl.PluralRules('ar')` declara SEIS categorías, y no es un matiz: son
 * palabras y terminaciones distintas que cualquier arabófono nota al instante.
 *
 *     0                  zero    لا تعليقات
 *     1                  one     تعليق واحد
 *     2                  two     تعليقان          (dual: el número va en la palabra)
 *     3…10, 103…110…     few     {{contador}} تعليقات
 *     11…99, 111…199…    many    {{contador}} تعليقًا
 *     100, 101, 102…     other   {{contador}} تعليق
 *
 * ── Lo que YA funcionaba ────────────────────────────────────────────────────
 *
 * El motor no hay que tocarlo. `i18n/traducir.ts` resuelve la categoría con
 * `Intl.PluralRules` y busca `clave_<categoría>` antes que `clave_other`, así
 * que `_zero`, `_two`, `_few` y `_many` se recogen solos en cuanto existen.
 *
 * ── Lo que NO funcionaba, y es lo único que arregla este archivo ────────────
 *
 * El TIPO. Cada módulo se declara como `typeof import('../es/<mod>').<mod>`,
 * que exige las mismas claves EXACTAS que el español. El ruso ya abrió la
 * puerta a `_few`/`_many` en `ru/plurales.ts`; el árabe necesita además
 * `_zero` y `_two`, y por eso tiene su propio `ConPlurales`.
 *
 * Sigue exigiendo todas las claves del español y, de las nuevas, solo admite
 * las que terminan en una de esas cuatro categorías: una errata (`_fwe`) sigue
 * sin compilar. No es un `Record<string, string>` de barra libre.
 *
 * ── Cuándo usarlo ───────────────────────────────────────────────────────────
 *
 * Solo en los módulos que de verdad añaden alguna de esas formas. Donde el
 * sustantivo no cambia —una marca como `{{lista}}` (ËContact)— basta con
 * `_one`/`_other` y el tipo estricto de siempre. Y nunca se escribe «1» ni «2»
 * a mano en `_one`/`_two`: la forma gramatical (واحد, dual) ya lo dice.
 */
export type ConPlurales<T> = T & Partial<Record<`${string}_zero` | `${string}_two` | `${string}_few` | `${string}_many`, string>>;
