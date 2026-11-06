/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica) — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de un proyecto lo escribe la persona y entra por {{nombre}} sin
 * declinar; el botón citado entra por {{accion}}. `creations` lleva one / few /
 * other («kreacija / kreacije / kreacija»), las tres con {{contador}}.
 */
import { ConPlurales } from '../ru/plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Tvoje kreacije, sređene po projektima',
  introText: 'Projekat može da sadrži logo, fotografije, oglase, video-snimke, muziku i dokumente. Sačuvaj svaki rezultat u svoj projekat preko „{{accion}}“.',
  sectionTitle: 'Projekti',
  emojiLabel: 'Emodži {{emoji}}',
  namePlaceholder: 'Primer: Moj restoran',
  emptyTitle: 'Još nemaš projekata',
  emptyText: 'Kreiraj prvi ili sačuvaj kreaciju u projekat iz njenog rezultata.',
  emptyAction: 'Kreiraj moj prvi projekat',
  open: 'Otvori',
  fallbackTitle: 'Projekat',
  notFound: 'Nismo pronašli ovaj projekat.',
  saveName: 'Sačuvaj naziv',
  rename: 'Promeni naziv',
  deleteProject: 'Obriši projekat',
  deleteConfirmWeb: 'Obrisati projekat „{{nombre}}“? Tvoje kreacije se ne brišu.',
  deleteConfirm: 'Obrisati „{{nombre}}“? Tvoje kreacije se ne brišu.',
  creations_one: '{{contador}} kreacija',
  creations_few: '{{contador}} kreacije',
  creations_other: '{{contador}} kreacija',
  creationsTitle: 'Kreacije',
  add: 'Dodaj',
  noCreations: 'Ovde još nema kreacija. Napravi nešto s bilo kojim specijalistom i sačuvaj to u ovaj projekat.',
  whatIsMissing: 'Šta nedostaje ovom projektu?',
  whatIsMissingNote: 'Logo, fotografije, oglas, video, muzika ili dokument: svaki Weë specijalista može nešto da doda ovde.',
  createSomethingNew: 'Kreiraj nešto novo',
};
