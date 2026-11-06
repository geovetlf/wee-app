/*
 * ISLANDÉS (is · is-IS) — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Heim» es el nombre fijo del Home (glosario), igual que en el menú ☰. «Búa til» = crear (infinitivo de botón).
 * `goTo` lleva el nombre de la sección en aposición tras «svæðið» para no tener que declinarlo (guía § 2).
 * IA = «gervigreind» en prosa; «AI» solo dentro de la marca Weë AI.
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Heim',
  search: 'Leita',
  create: 'Búa til',
  talk: 'WeeTalk',
  notifications: 'Tilkynningar',
  current: 'núverandi hluti',
  goTo: 'Fara á svæðið {{nombre}}',
  weeNavigation: 'Leiðsögn um Weë',
  goHome: 'Fara heim',
  myProfile: 'Fara á prófílinn minn',
  openWeeAi: 'Opna Weë AI',
  goToWeeAi: 'Fara í Weë AI',
  weeAiQuestion: 'Hvað viltu búa til í dag?',
  weeAiPitch: 'Segðu Weë hvað þú vilt. Weë sér um gervigreindina.',
  brandSlogan: 'Ímyndaðu þér · Skapaðu · Tengstu',
  documentTitle: 'Weë – {{eslogan}}',
};
