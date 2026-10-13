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
  introTitle: 'Ditt pågående arbete',
  introText: 'Det du gör med Weë AI finns kvar här så att du kan fortsätta när du vill. Spara varje resultat i sitt projekt via ”{{accion}}”; det du gör klart och väljer att behålla hamnar i Mina skapelser.',
  sectionTitle: 'Projekt',
  emojiLabel: 'Emojin {{emoji}}',
  namePlaceholder: 'T.ex. Min restaurang',
  emptyTitle: 'Inga projekt ännu',
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

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: 'Laddar dina projekt …',
  loadFailed: 'Vi kunde inte ladda dina projekt.',
  retry: 'Försök igen',
  emptyStart: 'Ett projekt är ett pågående arbete som du kan återuppta när du vill. Skapa ett här eller spara ett resultat i ett projekt via ”{{accion}}”.',
  stateInProgress: 'Pågår',
  updatedAgo: 'Ändrat {{cuando}}',
  continue: 'Fortsätt',
  continueProject: 'Fortsätt med {{nombre}}',
  noThumbnail: 'Ingen förhandsvisning',
  loadProjectFailed: 'Vi kunde inte öppna det här projektet.',
  jobsLoadFailed: 'Vi kunde inte ladda innehållet i det här projektet.',
};
