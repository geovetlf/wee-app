/*
 * SUECO — los cinco destinos de la barra inferior y los accesos de la barra lateral.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las cinco etiquetas son de una palabra, las del glosario (9.2) y las mismas que el menú ☰: Hem,
 * Sök, Skapa, WeeTalk, Aviseringar. `current` se lee pegado detrás del destino («Hem, aktuell
 * sida»): es lo que dicen en sueco los lectores de pantalla para la página actual. `goTo` recibe
 * el nombre de una comunidad o de una sección de Weë, y va entero detrás de «till», sin nada
 * pegado. Weë AI no se declina: «Öppna Weë AI», «Gå till Weë AI». `weeAiPitch` no escribe
 * «AI:n» —la guía evita declinar la abreviatura en la interfaz—: «Weë tar hand om AI-delen»,
 * con las mismas letras que `weeai.tellWee`, que es la misma frase española.
 * `weeAiQuestion` escribe «i dag» en dos palabras, como Språkrådet y como `Intl` («i går»). El
 * título de la pestaña del navegador separa con la raya media sueca (–).
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Hem',
  search: 'Sök',
  create: 'Skapa',
  talk: 'WeeTalk',
  notifications: 'Aviseringar',
  current: 'aktuell sida',
  goTo: 'Gå till {{nombre}}',
  weeNavigation: 'Weë-navigering',
  goHome: 'Gå till startsidan',
  myProfile: 'Gå till min profil',
  openWeeAi: 'Öppna Weë AI',
  goToWeeAi: 'Gå till Weë AI',
  weeAiQuestion: 'Vad vill du skapa i dag?',
  weeAiPitch: 'Berätta för Weë vad du vill ha. Weë tar hand om AI-delen.',
  documentTitle: 'Weë – Framtidens community',
};
