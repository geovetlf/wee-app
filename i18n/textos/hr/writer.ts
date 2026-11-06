/*
 * Weë Writer en croata, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»), imperativo de segunda persona en los botones. «Pídele a Weë»
 * es «Zamoli Weë» (pedir), no «Pitaj Weë» (preguntar).
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `words`.
 */
import { ConPlurales } from '../ru/plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'Zamoli Weë',
  writeSomethingFirst: 'Prvo nešto napiši',
  writeSomethingHint: 'Prvo nešto napiši i Weë će raditi na tome s tobom.',
  save: 'Spremi',
  saving: 'Spremanje…',
  deleteDocument: 'Izbriši dokument',
  improve: 'Poboljšaj',
  improveGoal: 'Poboljšaj ovaj tekst',
  shorten: 'Skrati',
  shortenGoal: 'Skrati ovaj tekst bez gubitka bitnoga',
  expand: 'Produlji',
  expandGoal: 'Dodatno razradi ovaj tekst',
  fix: 'Ispravi',
  fixGoal: 'Ispravi pravopis i stil ovog teksta',
  tone: 'Promijeni ton',
  toneGoal: 'Napiši ovaj tekst ponovno u drugom tonu',
  summarize: 'Sažmi',
  summarizeGoal: 'Sažmi ovaj tekst u ključne ideje',
  translate: 'Prevedi',
  translateGoal: 'Prevedi ovaj tekst',
  words_one: '{{contador}} riječ',
  words_few: '{{contador}} riječi',
  words_other: '{{contador}} riječi',
  savedInDocuments: ' · spremljeno u Moji dokumenti',
  couldNotSaveToDocuments: 'Nije bilo moguće spremiti u Moji dokumenti',
  myDocuments: 'Moji dokumenti',
  newDocument: 'Novi dokument',
  noDocumentsYet: 'Još nemaš dokumenata. Napiši novi ili zamoli Weë da počne umjesto tebe.',
  editedWhen: 'Uređeno {{cuando}}',
  titleLabel: 'Naslov dokumenta',
  bodyLabel: 'Tekst dokumenta',
  editorTitle: '✍️ Uređivač',
  docTitlePlaceholder: 'Naslov dokumenta',
  bodyPlaceholder: 'Piši ovdje. Kad god želiš, zamoli Weë da tekst poboljša, ispravi ili prevede.',
  resultHint: 'Weë radi na tvom tekstu i vraća ti rezultat ovdje, spreman za daljnje uređivanje.',
  weeWorksWithYou: 'Weë radi na tome s tobom.',
  saved: '✓ Spremljeno',
};
