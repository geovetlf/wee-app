/*
 * HINDI — los cinco destinos de la barra inferior y los accesos de la barra lateral.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las cinco etiquetas son las del glosario (§ 11.2) y las mismas que el menú ☰: होम, खोजें,
 * बनाएँ, WeeTalk, सूचनाएँ. `current` se lee pegado detrás del destino («होम, मौजूदा सेक्शन»).
 * `goTo` recibe el nombre de una comunidad o de una sección de Weë, y la posposición va detrás y
 * separada: «{{nombre}} पर जाएँ». Weë AI es una herramienta: se entra EN ella («Weë AI में जाएँ»,
 * guía § 6). `weeAiQuestion` y `weeAiPitch` son, letra a letra, las frases del glosario (§ 11.1 y
 * § 11.7), que dicen lo mismo en `weeai`: una pregunta sin verbo concordado con la persona y un
 * Weë que «संभालेगा» (Weë va en masculino). El título de la pestaña del navegador conserva el
 * guion del español, sin raya larga.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'होम',
  search: 'खोजें',
  create: 'बनाएँ',
  talk: 'WeeTalk',
  notifications: 'सूचनाएँ',
  current: 'मौजूदा सेक्शन',
  goTo: '{{nombre}} पर जाएँ',
  weeNavigation: 'Weë नेविगेशन',
  goHome: 'होम पर जाएँ',
  myProfile: 'अपनी प्रोफ़ाइल पर जाएँ',
  openWeeAi: 'Weë AI खोलें',
  goToWeeAi: 'Weë AI में जाएँ',
  weeAiQuestion: 'आज क्या बनाना है?',
  weeAiPitch: 'Weë को बताएँ कि आपको क्या चाहिए. AI का काम Weë संभालेगा.',
  documentTitle: 'Weë - भविष्य की कम्यूनिटी',
};
