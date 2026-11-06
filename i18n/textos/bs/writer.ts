/*
 * BOSNIO — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los botones van en imperativo («Poboljšaj») y la meta que viaja a Weë Brain
 * en infinitivo («Poboljšati ovaj tekst»), que es como se formula un encargo.
 *
 * PLURALES: one / few / other, así que `words` lleva `_few`
 * («1 riječ», «2 riječi», «5 riječi»).
 */
import { ConPlurales } from '../ru/plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'Pitaj Weë',
  writeSomethingFirst: 'Prvo nešto napiši',
  writeSomethingHint: 'Prvo nešto napiši i Weë će to raditi s tobom.',
  save: 'Sačuvaj',
  saving: 'Čuvanje…',
  deleteDocument: 'Izbriši dokument',
  improve: 'Poboljšaj',
  improveGoal: 'Poboljšati ovaj tekst',
  shorten: 'Skrati',
  shortenGoal: 'Skratiti ovaj tekst bez gubitka onog bitnog',
  expand: 'Proširi',
  expandGoal: 'Dalje razraditi ovaj tekst',
  fix: 'Ispravi',
  fixGoal: 'Ispraviti pravopis i stil ovog teksta',
  tone: 'Promijeni ton',
  toneGoal: 'Preformulisati ovaj tekst drugim tonom',
  summarize: 'Sažmi',
  summarizeGoal: 'Sažeti ovaj tekst u ključne ideje',
  translate: 'Prevedi',
  translateGoal: 'Prevesti ovaj tekst',
  words_one: '{{contador}} riječ',
  words_few: '{{contador}} riječi',
  words_other: '{{contador}} riječi',
  savedInDocuments: ' · sačuvano u „Moji dokumenti“',
  couldNotSaveToDocuments: 'Nismo mogli sačuvati u Moje dokumente',
  myDocuments: 'Moji dokumenti',
  newDocument: 'Novi dokument',
  noDocumentsYet: 'Još nemaš dokumenata. Napiši novi ili zamoli Weë da počne umjesto tebe.',
  editedWhen: 'Uređeno {{cuando}}',
  titleLabel: 'Naslov dokumenta',
  bodyLabel: 'Tekst dokumenta',
  editorTitle: '✍️ Uređivač',
  docTitlePlaceholder: 'Naslov dokumenta',
  bodyPlaceholder: 'Piši ovdje. Kad god želiš, zamoli Weë da tekst poboljša, ispravi ili prevede.',
  resultHint: 'Weë radi na tvom tekstu i vraća ti rezultat ovdje, spreman za dalje uređivanje.',
  weeWorksWithYou: 'Weë to radi s tobom.',
  saved: '✓ Sačuvano',
};
