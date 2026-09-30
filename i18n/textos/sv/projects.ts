/*
 * SUECO — Mis proyectos (Mina projekt): la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Un proyecto es «projekt» (ett projekt, pl. projekt), una creación, «skapelse» (como en
 * `creaciones`) y un especialista, «expert»: los de Weë son «Weë-experter» (glosario 9.4). El
 * nombre del proyecto es de la persona: entra por `{{nombre}}`, entre ”…” y sin nada pegado.
 * `{{accion}}` es el botón «Spara i ett projekt» de weeai y va entre ”…”. El proyecto de ejemplo,
 * «Min restaurang», es el mismo que cita la Ayuda. Borrar un proyecto no borra ningún archivo
 * —las creaciones se quedan—, así que aquí es «Ta bort», no «Radera». `emojiLabel` solo lo oye el
 * lector de pantalla: «Emojin {{emoji}}», la aposición sueca de sustantivo definido + nombre
 * («Appen Weë», «Filen …»), igual que `weeai.emojiLabel`. El contador cambia la palabra:
 * «1 skapelse», «3 skapelser».
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Dina skapelser, sorterade efter projekt',
  introText: 'Ett projekt kan innehålla logga, foton, annonser, videor, musik och dokument. Spara varje resultat i rätt projekt med ”{{accion}}”.',
  sectionTitle: 'Projekt',
  emojiLabel: 'Emojin {{emoji}}',
  namePlaceholder: 'T.ex. Min restaurang',
  emptyTitle: 'Inga projekt ännu',
  emptyText: 'Skapa ditt första projekt eller spara en skapelse i ett projekt direkt från resultatet.',
  emptyAction: 'Skapa mitt första projekt',
  open: 'Öppna',
  fallbackTitle: 'Projekt',
  notFound: 'Projektet hittades inte.',
  saveName: 'Spara namn',
  rename: 'Byt namn',
  deleteProject: 'Ta bort projekt',
  deleteConfirmWeb: 'Vill du ta bort projektet ”{{nombre}}”? Dina skapelser tas inte bort.',
  deleteConfirm: 'Vill du ta bort ”{{nombre}}”? Dina skapelser tas inte bort.',
  creations_one: '{{contador}} skapelse',
  creations_other: '{{contador}} skapelser',
  creationsTitle: 'Skapelser',
  add: 'Lägg till',
  noCreations: 'Här finns inga skapelser ännu. Skapa något med valfri expert och spara det i det här projektet.',
  whatIsMissing: 'Vad saknas i projektet?',
  whatIsMissingNote: 'En logga, foton, en annons, en video, musik eller ett dokument: alla Weë-experter kan bidra här.',
  createSomethingNew: 'Skapa något nytt',
};
