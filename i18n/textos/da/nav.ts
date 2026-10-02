/*
 * DANÉS — los cinco destinos de la barra inferior y los accesos de la barra lateral.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las cinco etiquetas son de una palabra, las del glosario (9.2) y las mismas que el menú ☰:
 * Hjem, Søg, Opret, WeeTalk, Notifikationer. «Opret» es el botón + que abre la hoja de Crear
 * (glosario 9.1). `current` se lee pegado detrás del destino («Hjem, aktuel side»): es lo que
 * dicen en danés los lectores de pantalla para la página actual. `goTo` recibe el nombre de una
 * comunidad o de una sección de Weë, y va entero detrás de «til», sin nada pegado. Weë AI no se
 * declina: «Åbn Weë AI», «Gå til Weë AI». `goHome` es «Gå til forsiden»: «Gå til Hjem» no es
 * danés. `weeAiQuestion` usa «lave» (crear una obra, glosario 9.1) y escribe «i dag» en dos
 * palabras. `weeAiPitch` no escribe «AI’en» —la guía no declina la sigla en la interfaz—: «Weë
 * klarer AI-delen», con las mismas letras que `weeai.tellWee`, que es la misma frase española.
 * El título de la pestaña del navegador separa con la raya media danesa (–).
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Hjem',
  search: 'Søg',
  create: 'Opret',
  talk: 'WeeTalk',
  notifications: 'Notifikationer',
  current: 'aktuel side',
  goTo: 'Gå til {{nombre}}',
  weeNavigation: 'Weë-navigation',
  goHome: 'Gå til forsiden',
  myProfile: 'Gå til min profil',
  openWeeAi: 'Åbn Weë AI',
  goToWeeAi: 'Gå til Weë AI',
  weeAiQuestion: 'Hvad vil du lave i dag?',
  weeAiPitch: 'Fortæl Weë, hvad du gerne vil. Weë klarer AI-delen.',
  documentTitle: 'Weë – Fremtidens fællesskab',
};
