/*
 * EL RUSO NECESITA MÁS FORMAS DE PLURAL QUE EL ESPAÑOL. ESTO SE LAS DA.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * El español tiene dos formas y el ruso CUATRO, y no es un matiz: son palabras
 * distintas que un ruso nota al instante.
 *
 *     1, 21, 101…        one    1 голос
 *     2, 3, 4, 22…       few    2 голоса
 *     0, 5…20, 25…       many   5 голосов
 *     1,5                other  (solo fracciones)
 *
 * Fíjate en el 0 y en el 11: caen en `many`, no donde los pondría la intuición.
 *
 * ── Lo que YA funcionaba ────────────────────────────────────────────────────
 *
 * El motor no hay que tocarlo. `i18n/traducir.ts` resuelve la categoría con
 * `Intl.PluralRules` y busca `clave_<categoría>` antes que `clave_other`, y su
 * comentario lo dice con todas las letras: «en ruso se pueden añadir `_few` y
 * `_many` sin tocar ni una línea de código». Estaba previsto desde el principio.
 *
 * ── Lo que NO funcionaba, y es lo único que arregla este archivo ────────────
 *
 * El TIPO. Cada módulo se declara como `typeof import('../es/<mod>').<mod>`,
 * que exige las mismas claves EXACTAS que el español —ni una menos, que es lo
 * que ha mantenido cuadrados los seis idiomas anteriores, ni una más—. Así que
 * `pollVotes_few` no compilaba: una clave que el ruso necesita y el español no
 * tiene por dónde declarar.
 *
 * `ConPlurales` abre esa puerta y SOLO esa. Sigue exigiendo todas las claves
 * del español, y de las nuevas solo admite las que terminan en `_few` o
 * `_many`: un `pollVotes_fwe` mal escrito sigue sin compilar. No es un
 * `Record<string, string>` de barra libre, que se habría tragado cualquier
 * errata sin decir nada.
 *
 * ── Cuándo usarlo ───────────────────────────────────────────────────────────
 *
 * Solo en los módulos donde de verdad haces falta añadir `_few`/`_many`. Los
 * demás módulos rusos se declaran igual que en alemán o en italiano, con el
 * tipo estricto de siempre: cuanta menos divergencia, mejor.
 *
 * Y no todas las claves con número lo necesitan. Si el sustantivo no se declina
 * —una marca como `{{lista}}`, o un indeclinable como «фото»— con `_one` y
 * `_other` basta y sobra.
 */
export type ConPlurales<T> = T & Partial<Record<`${string}_few` | `${string}_many`, string>>;
