/*
 * SUECO — Configuración → Idioma: la pantalla donde se elige el idioma de la
 * interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Próximamente» es «Kommer snart» (glosario § 9.5). El título de la sección
 * de los idiomas que vienen, «En camino», es «Fler språk på väg»: «På väg» a
 * secas no dice qué viene, y cada fila ya repite «Kommer snart».
 * «Seleccionado» es «Valt», en neutro porque lo elegido es un «språk». «La
 * interfaz de Weë» pediría el genitivo pegado a la marca (guía § 4): la frase
 * dice «Byt språk i Weë». Lo que escriben las personas no se traduce, y así
 * lo cuenta `explanation`.
 */
export const language: typeof import('../es/language').language = {
  title: 'Språk',
  explanation: 'Byt språk i Weë. Inlägg och kommentarer visas fortfarande precis som var och en skrev dem.',
  comingSoon: 'Kommer snart',
  comingSoonTitle: 'Fler språk på väg',
  selected: 'Valt',
};
