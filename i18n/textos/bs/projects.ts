/*
 * BOSNIO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre del proyecto lo escribe la persona y entra por {{nombre}} sin
 * declinar; «projekat» es la forma bosnia (no «projekt»).
 *
 * PLURALES: one / few / other, así que `creations` lleva `_few`
 * («1 kreacija», «2 kreacije», «5 kreacija»).
 */
import { ConPlurales } from '../ru/plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Tvoje kreacije, složene po projektima',
  introText: 'Projekat može imati logo, fotografije, oglase, videe, muziku i dokumente. Sačuvaj svaki rezultat u njegov projekat preko „{{accion}}“.',
  sectionTitle: 'Projekti',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Naprimjer: Moj restoran',
  emptyTitle: 'Još nemaš projekata',
  emptyText: 'Kreiraj prvi ili sačuvaj kreaciju u projekat iz njenog rezultata.',
  emptyAction: 'Kreiraj moj prvi projekat',
  open: 'Otvori',
  fallbackTitle: 'Projekat',
  notFound: 'Nismo pronašli ovaj projekat.',
  saveName: 'Sačuvaj naziv',
  rename: 'Promijeni naziv',
  deleteProject: 'Izbriši projekat',
  deleteConfirmWeb: 'Izbrisati projekat „{{nombre}}“? Tvoje kreacije se ne brišu.',
  deleteConfirm: 'Izbrisati „{{nombre}}“? Tvoje kreacije se ne brišu.',
  creations_one: '{{contador}} kreacija',
  creations_few: '{{contador}} kreacije',
  creations_other: '{{contador}} kreacija',
  creationsTitle: 'Kreacije',
  add: 'Dodaj',
  noCreations: 'Ovdje još nema kreacija. Napravi nešto s bilo kojim specijalistom i sačuvaj to u ovaj projekat.',
  whatIsMissing: 'Šta nedostaje ovom projektu?',
  whatIsMissingNote: 'Logo, fotografije, oglas, video, muzika ili dokument: svaki Weë specijalist može ovdje nešto dodati.',
  createSomethingNew: 'Kreiraj nešto novo',
};
