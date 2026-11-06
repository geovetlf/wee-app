/*
 * POLACO — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Botones en imperativo de 2.ª singular («Ulepsz», «Skróć», «Rozwiń»). Las
 * frases con Weë como sujeto evitan el pasado, que en polaco tiene género.
 * `words` lleva las cuatro formas del plural polaco con `ConPlurales`.
 */
import { ConPlurales } from '../ru/plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'Poproś Weë',
  writeSomethingFirst: 'Najpierw coś napisz',
  writeSomethingHint: 'Najpierw coś napisz, a Weë popracuje nad tym z tobą.',
  save: 'Zapisz',
  saving: 'Zapisywanie…',
  deleteDocument: 'Usuń dokument',
  improve: 'Ulepsz',
  improveGoal: 'Ulepsz ten tekst',
  shorten: 'Skróć',
  shortenGoal: 'Skróć ten tekst, nie gubiąc tego, co ważne',
  expand: 'Rozwiń',
  expandGoal: 'Rozwiń ten tekst',
  fix: 'Popraw',
  fixGoal: 'Popraw ortografię i styl tego tekstu',
  tone: 'Zmień ton',
  toneGoal: 'Przepisz ten tekst w innym tonie',
  summarize: 'Streść',
  summarizeGoal: 'Streść ten tekst w kluczowych punktach',
  translate: 'Przetłumacz',
  translateGoal: 'Przetłumacz ten tekst',
  words_one: '{{contador}} słowo',
  words_few: '{{contador}} słowa',
  words_many: '{{contador}} słów',
  words_other: '{{contador}} słowa',
  savedInDocuments: ' · zapisano w Moich dokumentach',
  couldNotSaveToDocuments: 'Nie udało się zapisać w Moich dokumentach',
  myDocuments: 'Moje dokumenty',
  newDocument: 'Nowy dokument',
  noDocumentsYet: 'Nie masz jeszcze dokumentów. Napisz nowy albo poproś Weë o rozpoczęcie za ciebie.',
  editedWhen: 'Edytowano {{cuando}}',
  titleLabel: 'Tytuł dokumentu',
  bodyLabel: 'Treść dokumentu',
  editorTitle: '✍️ Edytor',
  docTitlePlaceholder: 'Tytuł dokumentu',
  bodyPlaceholder: 'Pisz tutaj. Kiedy zechcesz, poproś Weë o ulepszenie, poprawienie lub przetłumaczenie tekstu.',
  resultHint: 'Weë pracuje nad twoim tekstem i zwraca tutaj wynik, gotowy do dalszej edycji.',
  weeWorksWithYou: 'Weë pracuje nad tym z tobą.',
  saved: '✓ Zapisano',
};
