/*
 * RUSO — Weë Writer, dentro de Weë Studio. El texto que escribe la persona
 * NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español CON PLURALES: el ruso necesita `_few` y `_many`, que
 * el español no tiene por dónde declarar, y `ConPlurales` abre esa puerta y solo
 * esa. La única clave con cantidad de este módulo es `words`, y «слово» declina:
 *
 *     1, 21, 101…     one    1 слово
 *     2, 3, 4, 22…    few    2 слова
 *     0, 5…20, 25…    many   5 слов
 *     1,5             other  (fracciones, con la misma forma que `many`)
 */
import { ConPlurales } from './plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'Попросите Weë',
  writeSomethingFirst: 'Сначала напишите текст',
  writeSomethingHint: 'Сначала напишите текст, и Weë поработает над ним вместе с вами.',
  save: 'Сохранить',
  saving: 'Сохранение…',
  deleteDocument: 'Удалить документ',
  improve: 'Улучшить',
  improveGoal: 'Улучшить этот текст',
  shorten: 'Сократить',
  shortenGoal: 'Сократить этот текст, не потеряв главное',
  expand: 'Расширить',
  expandGoal: 'Развернуть этот текст подробнее',
  fix: 'Исправить',
  fixGoal: 'Исправить орфографию и стиль этого текста',
  tone: 'Сменить тон',
  toneGoal: 'Переписать этот текст в другом тоне',
  summarize: 'Резюмировать',
  summarizeGoal: 'Кратко изложить главные мысли этого текста',
  translate: 'Перевести',
  translateGoal: 'Перевести этот текст',
  words_one: '{{contador}} слово',
  words_few: '{{contador}} слова',
  words_many: '{{contador}} слов',
  words_other: '{{contador}} слов',
  savedInDocuments: ' · сохранено в Моих документах',
  couldNotSaveToDocuments: 'Не удалось сохранить в Моих документах',
  myDocuments: 'Мои документы',
  newDocument: 'Новый документ',
  noDocumentsYet: 'Документов пока нет. Напишите новый или попросите Weë начать за вас.',
  editedWhen: 'Изменено {{cuando}}',
  titleLabel: 'Название документа',
  bodyLabel: 'Текст документа',
  editorTitle: '✍️ Редактор',
  docTitlePlaceholder: 'Название документа',
  bodyPlaceholder: 'Пишите здесь. Когда захотите, попросите Weë улучшить, исправить или перевести текст.',
  resultHint: 'Weë поработает над вашим текстом и вернёт результат сюда — можно сразу продолжить правки.',
  weeWorksWithYou: 'Weë работает над ним вместе с вами.',
  saved: '✓ Сохранено',
};
