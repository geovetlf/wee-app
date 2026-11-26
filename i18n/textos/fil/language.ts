/*
 * FILIPINO — Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Idioma» es «Wika» (glosario § 11.3, como Android). Cambiar el idioma es sustituir uno por otro, así que el verbo
 * es «Palitan» y no «Baguhin» (glosario § 11.2). «La interfaz de Weë» se dice «ang wikang ginagamit ng Weë»: «ang
 * wika ng interface ng Weë» encadena dos `ng` y suena a manual; la segunda frase ya aclara que lo que escriben las
 * personas no cambia, que es lo que importa. «Pa rin» con `rin` (tras vocal, § 5.4).
 *
 * «Próximamente» es «Malapit na» (§ 11.4). El título de la sección de los idiomas que vienen, «En camino», es «Mga
 * paparating na wika»: «Paparating na» a secas no dice qué viene, y cada fila ya repite «Malapit na». «Seleccionado»
 * es «Napili» (completado de `pili`). Aquí no se nombra ningún idioma: cada fila lleva su nombre nativo, que sale del
 * catálogo de idiomas y no pasa por el diccionario.
 */
export const language: typeof import('../es/language').language = {
  title: 'Wika',
  explanation: 'Palitan ang wikang ginagamit ng Weë. Makikita pa rin ang mga post at komento kung paano isinulat ng bawat tao.',
  comingSoon: 'Malapit na',
  comingSoonTitle: 'Mga paparating na wika',
  selected: 'Napili',
};
