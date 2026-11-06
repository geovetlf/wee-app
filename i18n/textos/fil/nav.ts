/*
 * FILIPINO — los cinco destinos de la barra inferior y los accesos de la barra lateral.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las cinco etiquetas son las del glosario (§ 11.1) y las mismas que el menú ☰: Home (Android y YouTube; nunca
 * «Tahanan»), Maghanap, Gumawa («Lumikha» suena literario), WeeTalk y Mga notification («Mga abiso» descartado,
 * § 14). `current` se lee pegado detrás del destino («Home, kasalukuyang seksyon»), la forma del glosario para el
 * lector de pantalla. `goTo` recibe el nombre de una comunidad o de una sección de Weë y va entero detrás de «sa»,
 * sin nada pegado: «Pumunta sa {{nombre}}». «Ir al inicio» es «Bumalik sa Home» (§ 11.1): volver al Home es
 * regresar, no ir a un sitio nuevo. Weë AI lleva su marcador de cosa: «Buksan ang Weë AI», «Pumunta sa Weë AI».
 * La barra se anuncia como «Navigation ng Weë» (glosario, marcado «Validar»).
 *
 * `weeAiQuestion` y `weeAiPitch` son las frases del glosario § 11.10, palabra por palabra, para que digan lo mismo
 * que en Weë AI: «likhain» es crear una obra (de `likha`), y «Ang Weë na ang bahala sa AI» es el «se encarga» del
 * español, con la marca como sujeto (`ang`). El título de la pestaña del navegador conserva el guion simple del
 * español y abre su segunda parte con mayúscula, como un subtítulo; «hinaharap» es el futuro (no «bukas», que es
 * mañana).
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Home',
  search: 'Maghanap',
  create: 'Gumawa',
  talk: 'WeeTalk',
  notifications: 'Mga notification',
  current: 'kasalukuyang seksyon',
  goTo: 'Pumunta sa {{nombre}}',
  weeNavigation: 'Navigation ng Weë',
  goHome: 'Bumalik sa Home',
  myProfile: 'Pumunta sa profile ko',
  openWeeAi: 'Buksan ang Weë AI',
  goToWeeAi: 'Pumunta sa Weë AI',
  weeAiQuestion: 'Ano ang gusto mong likhain ngayon?',
  weeAiPitch: 'Sabihin sa Weë ang gusto mo. Ang Weë na ang bahala sa AI.',
  brandSlogan: 'Mangarap · Lumikha · Kumonekta',
  documentTitle: 'Weë - {{eslogan}}',
};
