/*
 * Mis proyectos en montenegrino (ijekaviano, latino). El nombre del proyecto lo escribe la persona y entra por {{nombre}}.
 * `creations` lleva las tres formas (one / few / other): «kreacija / kreacije / kreacija».
 */
import { ConPlurales } from '../ru/plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Tvoje kreacije, raspoređene po projektima',
  introText: 'Projekat može da ima logo, fotografije, reklame, videosnimke, muziku i dokumente. Svaki rezultat sačuvaj u odgovarajući projekat preko „{{accion}}“.',
  sectionTitle: 'Projekti',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Primjer: Moj restoran',
  emptyTitle: 'Još nemaš projekata',
  emptyText: 'Napravi prvi ili sačuvaj kreaciju u projekat iz njenog rezultata.',
  emptyAction: 'Napravi moj prvi projekat',
  open: 'Otvori',
  fallbackTitle: 'Projekat',
  notFound: 'Nijesmo našli ovaj projekat.',
  saveName: 'Sačuvaj ime',
  rename: 'Promijeni ime',
  deleteProject: 'Obriši projekat',
  deleteConfirmWeb: 'Obrisati projekat „{{nombre}}“? Tvoje kreacije se ne brišu.',
  deleteConfirm: 'Obrisati „{{nombre}}“? Tvoje kreacije se ne brišu.',
  creations_one: '{{contador}} kreacija',
  creations_few: '{{contador}} kreacije',
  creations_other: '{{contador}} kreacija',
  creationsTitle: 'Kreacije',
  add: 'Dodaj',
  noCreations: 'Ovdje još nema kreacija. Napravi nešto s bilo kojim specijalistom i sačuvaj to u ovaj projekat.',
  whatIsMissing: 'Što nedostaje ovom projektu?',
  whatIsMissingNote: 'Logo, fotografije, reklama, video, muzika ili dokument: svaki Weë specijalista može ovdje da doprinese.',
  createSomethingNew: 'Napravi nešto novo',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} projekat',
  count_few: '{{contador}} projekta',
  count_other: '{{contador}} projekata',
  updatedOn: 'Ažurirano {{fecha}}',
  searchPlaceholder: 'Pretraži projekte',
  sortUpdated: 'Nedavno ažurirani',
  sortName: 'Naziv (A–Ž)',
  noMatches: 'Nijedan projekat ne odgovara pretrazi.',
  emptySpaceTitle: 'Tvoj kreativni prostor počinje ovdje',
  moreActions: 'Više radnji',
};
