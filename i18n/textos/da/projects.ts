/*
 * DANÉS — Mis proyectos (Mine projekter): la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Un proyecto es «projekt» (et projekt, pl. projekter); una creación,
 * «kreation» (pl. kreationer), y un especialista, «specialist»: los de Weë son
 * «Weë-specialister» (glosario §§ 9.1 y 9.4). Crear un proyecto es «Opret»
 * (objeto) y crear algo nuevo con un especialista, «Lav» (obra), § 9.1.
 *
 * El nombre del proyecto es de la persona: entra por `{{nombre}}`, entre ”…” y
 * sin nada pegado. `{{accion}}` es el botón «Gem i et projekt» de weeai y va
 * entre ”…”. El proyecto de ejemplo, «Min restaurant», es el mismo que cita la
 * Ayuda; «Ejemplo:» es «Fx» (guía § 5). Borrar un proyecto no borra ninguna
 * creación, y la confirmación lo dice («Dine kreationer bliver ikke slettet»).
 * Las confirmaciones empiezan por «Vil du …?» (guía § 2).
 *
 * `emojiLabel` solo lo oye el lector de pantalla y es igual al de weeai:
 * «Emoji {{emoji}}», que es danés. El contador cambia la palabra: «1 kreation»,
 * «3 kreationer».
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Dine kreationer, sorteret efter projekt',
  introText: 'Et projekt kan indeholde logo, fotos, annoncer, videoer, musik og dokumenter. Gem hvert resultat i det rigtige projekt med knappen ”{{accion}}”.',
  sectionTitle: 'Projekter',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Fx Min restaurant',
  emptyTitle: 'Ingen projekter endnu',
  emptyText: 'Opret et her, eller gem en kreation i et projekt direkte fra resultatet.',
  emptyAction: 'Opret dit første projekt',
  open: 'Åbn',
  fallbackTitle: 'Projekt',
  notFound: 'Projektet blev ikke fundet.',
  saveName: 'Gem navn',
  rename: 'Omdøb',
  deleteProject: 'Slet projekt',
  deleteConfirmWeb: 'Vil du slette projektet ”{{nombre}}”? Dine kreationer bliver ikke slettet.',
  deleteConfirm: 'Vil du slette ”{{nombre}}”? Dine kreationer bliver ikke slettet.',
  creations_one: '{{contador}} kreation',
  creations_other: '{{contador}} kreationer',
  creationsTitle: 'Kreationer',
  add: 'Tilføj',
  noCreations: 'Der er ingen kreationer her endnu. Lav noget med en hvilken som helst specialist, og gem det i dette projekt.',
  whatIsMissing: 'Hvad mangler projektet?',
  whatIsMissingNote: 'Et logo, fotos, en annonce, en video, musik eller et dokument: Alle Weë-specialister kan bidrage her.',
  createSomethingNew: 'Lav noget nyt',
};
