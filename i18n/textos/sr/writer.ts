/*
 * SERBIO (ћирилица) — Weë Writer, dentro de Weë Studio. El texto de la persona NUNCA
 * pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `words` lleva one / few / other («реч / речи / речи»), las tres con {{contador}}.
 * «Mis documentos» se cita entre comillas serbias cuando va dentro de una frase.
 */
import { ConPlurales } from '../ru/plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'Замоли Weë',
  writeSomethingFirst: 'Прво нешто напиши',
  writeSomethingHint: 'Прво нешто напиши, а Weë ће радити на томе с тобом.',
  save: 'Сачувај',
  saving: 'Чување…',
  deleteDocument: 'Обриши документ',
  improve: 'Побољшај',
  improveGoal: 'Побољшај овај текст',
  shorten: 'Скрати',
  shortenGoal: 'Скрати овај текст без губитка битног',
  expand: 'Прошири',
  expandGoal: 'Развиј овај текст детаљније',
  fix: 'Исправи',
  fixGoal: 'Исправи правопис и стил овог текста',
  tone: 'Промени тон',
  toneGoal: 'Преформулиши овај текст другачијим тоном',
  summarize: 'Сажми',
  summarizeGoal: 'Сажми овај текст у кључне идеје',
  translate: 'Преведи',
  translateGoal: 'Преведи овај текст',
  words_one: '{{contador}} реч',
  words_few: '{{contador}} речи',
  words_other: '{{contador}} речи',
  savedInDocuments: ' · сачувано у „Моји документи“',
  couldNotSaveToDocuments: 'Није било могуће сачувати у „Моји документи“',
  myDocuments: 'Моји документи',
  newDocument: 'Нови документ',
  noDocumentsYet: 'Још немаш докумената. Напиши нови или замоли Weë да почне уместо тебе.',
  editedWhen: 'Измењено {{cuando}}',
  titleLabel: 'Наслов документа',
  bodyLabel: 'Текст документа',
  editorTitle: '✍️ Уређивач',
  docTitlePlaceholder: 'Наслов документа',
  bodyPlaceholder: 'Пиши овде. Кад год пожелиш, замоли Weë да то побољша, исправи или преведе.',
  resultHint: 'Weë ради на твом тексту и враћа ти резултат овде, спреман за даље уређивање.',
  weeWorksWithYou: 'Weë ради на томе с тобом.',
  saved: '✓ Сачувано',
};
