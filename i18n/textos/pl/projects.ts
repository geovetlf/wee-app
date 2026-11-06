/*
 * POLACO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre del proyecto y `{{accion}}` entran por interpolación y no se
 * tocan. «Creación» es «dzieło», como «Mis creaciones» = «Moje dzieła».
 * `creations` lleva las cuatro formas del plural polaco con `ConPlurales`.
 */
import { ConPlurales } from '../ru/plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Twoje dzieła, uporządkowane według projektów',
  introText: 'Projekt może zawierać logo, zdjęcia, reklamy, filmy, muzykę i dokumenty. Zapisuj każdy wynik w odpowiednim projekcie przyciskiem „{{accion}}”.',
  sectionTitle: 'Projekty',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Na przykład: Moja restauracja',
  emptyTitle: 'Nie masz jeszcze projektów',
  emptyText: 'Utwórz pierwszy albo zapisz dzieło w projekcie z poziomu jego wyniku.',
  emptyAction: 'Utwórz swój pierwszy projekt',
  open: 'Otwórz',
  fallbackTitle: 'Projekt',
  notFound: 'Nie znaleźliśmy tego projektu.',
  saveName: 'Zapisz nazwę',
  rename: 'Zmień nazwę',
  deleteProject: 'Usuń projekt',
  deleteConfirmWeb: 'Usunąć projekt „{{nombre}}”? Twoje dzieła nie zostaną usunięte.',
  deleteConfirm: 'Usunąć „{{nombre}}”? Twoje dzieła nie zostaną usunięte.',
  creations_one: '{{contador}} dzieło',
  creations_few: '{{contador}} dzieła',
  creations_many: '{{contador}} dzieł',
  creations_other: '{{contador}} dzieła',
  creationsTitle: 'Dzieła',
  add: 'Dodaj',
  noCreations: 'Nie ma tu jeszcze dzieł. Stwórz coś z dowolnym specjalistą i zapisz to w tym projekcie.',
  whatIsMissing: 'Czego brakuje temu projektowi?',
  whatIsMissingNote: 'Logo, zdjęcia, reklama, film, muzyka lub dokument: każdy specjalista Weë może coś tu dodać.',
  createSomethingNew: 'Stwórz coś nowego',
};
