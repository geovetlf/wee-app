/*
 * DANÉS — Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Próximamente» es «Kommer snart» (glosario § 9.5). El título de la sección de los idiomas que vienen, «En camino»,
 * es «Flere sprog på vej»: «På vej» a secas no dice qué viene, y cada fila ya repite «Kommer snart». «Seleccionado»
 * es «Valgt» (lo elegido es un «sprog», neutro). «La interfaz de Weë» pediría el genitivo pegado a la marca (guía
 * § 4): la frase dice «Vælg, hvilket sprog Weë skal vises på». Lo que escriben las personas no se traduce, y así lo
 * cuenta `explanation`. Los idiomas van en minúscula en danés, pero aquí no se nombra ninguno: cada fila lleva el
 * nombre nativo, que no pasa por el diccionario.
 */
export const language: typeof import('../es/language').language = {
  title: 'Sprog',
  explanation: 'Vælg, hvilket sprog Weë skal vises på. Opslag og kommentarer vises stadig præcis, som den enkelte har skrevet dem.',
  comingSoon: 'Kommer snart',
  comingSoonTitle: 'Flere sprog på vej',
  selected: 'Valgt',
};
