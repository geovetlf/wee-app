/*
 * SERBIO (ћирилица) — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de un proyecto lo escribe la persona y entra por {{nombre}} sin
 * declinar; el botón citado entra por {{accion}}. `creations` lleva one / few /
 * other («креација / креације / креација»), las tres con {{contador}}.
 */
import { ConPlurales } from '../ru/plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Твоје креације, сређене по пројектима',
  introText: 'Пројекат може да садржи лого, фотографије, огласе, видео-снимке, музику и документе. Сачувај сваки резултат у свој пројекат преко „{{accion}}“.',
  sectionTitle: 'Пројекти',
  emojiLabel: 'Емоџи {{emoji}}',
  namePlaceholder: 'Пример: Мој ресторан',
  emptyTitle: 'Још немаш пројеката',
  emptyText: 'Креирај први или сачувај креацију у пројекат из њеног резултата.',
  emptyAction: 'Креирај мој први пројекат',
  open: 'Отвори',
  fallbackTitle: 'Пројекат',
  notFound: 'Нисмо пронашли овај пројекат.',
  saveName: 'Сачувај назив',
  rename: 'Промени назив',
  deleteProject: 'Обриши пројекат',
  deleteConfirmWeb: 'Обрисати пројекат „{{nombre}}“? Твоје креације се не бришу.',
  deleteConfirm: 'Обрисати „{{nombre}}“? Твоје креације се не бришу.',
  creations_one: '{{contador}} креација',
  creations_few: '{{contador}} креације',
  creations_other: '{{contador}} креација',
  creationsTitle: 'Креације',
  add: 'Додај',
  noCreations: 'Овде још нема креација. Направи нешто с било којим специјалистом и сачувај то у овај пројекат.',
  whatIsMissing: 'Шта недостаје овом пројекту?',
  whatIsMissingNote: 'Лого, фотографије, оглас, видео, музика или документ: сваки Weë специјалиста може нешто да дода овде.',
  createSomethingNew: 'Креирај нешто ново',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} пројекат',
  count_few: '{{contador}} пројекта',
  count_other: '{{contador}} пројеката',
  updatedOn: 'Ажурирано {{fecha}}',
  searchPlaceholder: 'Претражи пројекте',
  sortUpdated: 'Недавно ажурирани',
  sortName: 'Назив (А–Ш)',
  noMatches: 'Ниједан пројекат не одговара претрази.',
  emptySpaceTitle: 'Твој креативни простор почиње овде',
  moreActions: 'Још радњи',
};
