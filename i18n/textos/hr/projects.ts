/*
 * Mis proyectos en croata: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). El nombre de un proyecto y la meta de una creación los escribe
 * la persona y entran por interpolación, nunca pegando cadenas.
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `creations`.
 */
import { ConPlurales } from '../ru/plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Tvoje kreacije, složene po projektima',
  introText: 'Projekt može imati logotip, fotografije, oglase, videozapise, glazbu i dokumente. Spremi svaki rezultat u njegov projekt pomoću „{{accion}}“.',
  sectionTitle: 'Projekti',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Primjer: Moj restoran',
  emptyTitle: 'Još nemaš projekata',
  emptyText: 'Stvori prvi ili spremi kreaciju u projekt iz njezina rezultata.',
  emptyAction: 'Stvori moj prvi projekt',
  open: 'Otvori',
  fallbackTitle: 'Projekt',
  notFound: 'Ne možemo pronaći ovaj projekt.',
  saveName: 'Spremi naziv',
  rename: 'Promijeni naziv',
  deleteProject: 'Izbriši projekt',
  deleteConfirmWeb: 'Izbrisati projekt „{{nombre}}“? Tvoje se kreacije ne brišu.',
  deleteConfirm: 'Izbrisati „{{nombre}}“? Tvoje se kreacije ne brišu.',
  creations_one: '{{contador}} kreacija',
  creations_few: '{{contador}} kreacije',
  creations_other: '{{contador}} kreacija',
  creationsTitle: 'Kreacije',
  add: 'Dodaj',
  noCreations: 'Ovdje još nema kreacija. Stvori nešto s bilo kojim specijalistom i spremi to u ovaj projekt.',
  whatIsMissing: 'Što nedostaje ovom projektu?',
  whatIsMissingNote: 'Logotip, fotografije, oglas, video, glazba ili dokument: bilo koji Weë specijalist može ovdje nešto dodati.',
  createSomethingNew: 'Stvori nešto novo',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} projekt',
  count_few: '{{contador}} projekta',
  count_other: '{{contador}} projekata',
  updatedOn: 'Ažurirano {{fecha}}',
  searchPlaceholder: 'Pretraži projekte',
  sortUpdated: 'Nedavno ažurirani',
  sortName: 'Naziv (A–Ž)',
  noMatches: 'Nijedan projekt ne odgovara pretrazi.',
  emptySpaceTitle: 'Tvoj kreativni prostor počinje ovdje',
  moreActions: 'Više radnji',
};
