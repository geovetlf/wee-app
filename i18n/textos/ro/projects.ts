/*
 * RUMANO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre del proyecto lo escribe la persona y entra por {{nombre}} sin
 * declinar. El contador de creaciones lleva las tres formas del rumano.
 */
import { ConPlurales } from '../ru/plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Creațiile tale, ordonate pe proiecte',
  introText: 'Un proiect poate avea logo, fotografii, reclame, videoclipuri, muzică și documente. Salvează fiecare rezultat în proiectul lui din „{{accion}}”.',
  sectionTitle: 'Proiecte',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Exemplu: Restaurantul meu',
  emptyTitle: 'Încă nu ai proiecte',
  emptyText: 'Creează primul sau salvează o creație într-un proiect din rezultatul ei.',
  emptyAction: 'Creează primul meu proiect',
  open: 'Deschide',
  fallbackTitle: 'Proiect',
  notFound: 'Nu am găsit acest proiect.',
  saveName: 'Salvează numele',
  rename: 'Schimbă numele',
  deleteProject: 'Șterge proiectul',
  deleteConfirmWeb: 'Ștergi proiectul „{{nombre}}”? Creațiile tale nu se șterg.',
  deleteConfirm: 'Ștergi „{{nombre}}”? Creațiile tale nu se șterg.',
  creations_one: '{{contador}} creație',
  creations_few: '{{contador}} creații',
  creations_other: '{{contador}} de creații',
  creationsTitle: 'Creații',
  add: 'Adaugă',
  noCreations: 'Încă nu există creații aici. Creează ceva cu orice specialist și salvează-l în acest proiect.',
  whatIsMissing: 'Ce îi lipsește acestui proiect?',
  whatIsMissingNote: 'Un logo, fotografii, o reclamă, un video, muzică sau un document: orice specialist Weë poate contribui aici.',
  createSomethingNew: 'Creează ceva nou',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} proiect',
  count_few: '{{contador}} proiecte',
  count_other: '{{contador}} de proiecte',
  updatedOn: 'Actualizat pe {{fecha}}',
  searchPlaceholder: 'Caută proiecte',
  sortUpdated: 'Actualizate recent',
  sortName: 'Nume (A–Z)',
  noMatches: 'Niciun proiect nu se potrivește căutării.',
  emptySpaceTitle: 'Spațiul tău creativ începe aici',
  moreActions: 'Mai multe acțiuni',
};
