/*
 * RUSO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El tipo es `ConPlurales` porque el contador de creaciones necesita en ruso las
 * dos formas que el español no tiene, y esas dos son lo único que se añade.
 *
 * ── LAS CUATRO FORMAS DE `creations` ────────────────────────────────────────
 *
 *     1, 21, 31, 101…        one    1 работа
 *     2, 3, 4, 22, 23…       few    2 работы
 *     0, 5…20, 25…30, 111…   many   5 работ     ← aquí caen el 0 y el 11
 *     1,5                    other  (fracciones; misma forma que `many`)
 *
 * El comentario del molde español decía que «el día que llegue el ruso hará
 * falta una tercera»: hacían falta dos, y aquí están.
 *
 * QUÉ NO ENTRA AQUÍ: el nombre de un proyecto, que lo escribe la persona y se
 * guarda tal cual, ni la meta de una creación. Cuando uno de esos valores va
 * dentro de una frase entra por interpolación y, en ruso, entre comillas « »,
 * porque no se declina. `{{accion}}` es el botón de Weë AI («Сохранить в
 * проект») y llega ya traducido desde su módulo.
 */
import { ConPlurales } from './plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Ваши работы, разложенные по проектам',
  introText: 'В проекте могут быть логотип, фото, реклама, видео, музыка и документы. Сохраняйте каждый результат в свой проект через «{{accion}}».',
  sectionTitle: 'Проекты',
  emojiLabel: 'Эмодзи {{emoji}}',
  namePlaceholder: 'Например: Мой ресторан',
  emptyTitle: 'У вас пока нет проектов',
  emptyText: 'Создайте первый или сохраните работу в проект прямо из результата.',
  emptyAction: 'Создать первый проект',
  open: 'Открыть',
  fallbackTitle: 'Проект',
  notFound: 'Мы не нашли этот проект.',
  saveName: 'Сохранить название',
  rename: 'Переименовать',
  deleteProject: 'Удалить проект',
  deleteConfirmWeb: 'Удалить проект «{{nombre}}»? Ваши работы останутся.',
  deleteConfirm: 'Удалить «{{nombre}}»? Ваши работы останутся.',
  creations_one: '{{contador}} работа',
  creations_few: '{{contador}} работы',
  creations_many: '{{contador}} работ',
  creations_other: '{{contador}} работ',
  creationsTitle: 'Работы',
  add: 'Добавить',
  noCreations: 'Здесь пока нет работ. Создайте что-нибудь с любым специалистом и сохраните в этот проект.',
  whatIsMissing: 'Чего не хватает этому проекту?',
  whatIsMissingNote: 'Логотип, фото, реклама, видео, музыка или документ — здесь пригодится любой специалист Weë.',
  createSomethingNew: 'Создать что-то новое',
};
