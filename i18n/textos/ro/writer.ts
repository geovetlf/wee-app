/*
 * RUMANO — Weë Writer, dentro de Weë Studio. El texto que escribe la persona nunca pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El contador de palabras lleva las tres formas del rumano.
 */
import { ConPlurales } from '../ru/plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'Cere-i lui Weë',
  writeSomethingFirst: 'Scrie ceva mai întâi',
  writeSomethingHint: 'Scrie ceva mai întâi și Weë lucrează la text împreună cu tine.',
  save: 'Salvează',
  saving: 'Se salvează…',
  deleteDocument: 'Șterge documentul',
  improve: 'Îmbunătățește',
  improveGoal: 'Îmbunătățește acest text',
  shorten: 'Scurtează',
  shortenGoal: 'Scurtează acest text fără a pierde ce este important',
  expand: 'Extinde',
  expandGoal: 'Dezvoltă mai mult acest text',
  fix: 'Corectează',
  fixGoal: 'Corectează ortografia și stilul acestui text',
  tone: 'Schimbă tonul',
  toneGoal: 'Rescrie acest text pe alt ton',
  summarize: 'Rezumă',
  summarizeGoal: 'Rezumă acest text în idei-cheie',
  translate: 'Tradu',
  translateGoal: 'Tradu acest text',
  words_one: '{{contador}} cuvânt',
  words_few: '{{contador}} cuvinte',
  words_other: '{{contador}} de cuvinte',
  savedInDocuments: ' · salvat în Documentele mele',
  couldNotSaveToDocuments: 'Nu s-a putut salva în Documentele mele',
  myDocuments: 'Documentele mele',
  newDocument: 'Document nou',
  noDocumentsYet: 'Încă nu ai documente. Scrie unul nou sau cere-i lui Weë să înceapă în locul tău.',
  editedWhen: 'Editat {{cuando}}',
  titleLabel: 'Titlul documentului',
  bodyLabel: 'Textul documentului',
  editorTitle: '✍️ Editor',
  docTitlePlaceholder: 'Titlul documentului',
  bodyPlaceholder: 'Scrie aici. Când vrei, cere-i lui Weë să îl îmbunătățească, să îl corecteze sau să îl traducă.',
  resultHint: 'Weë lucrează la ce ai scris și îți aduce rezultatul aici, ca să poți continua editarea.',
  weeWorksWithYou: 'Weë lucrează la text împreună cu tine.',
  saved: '✓ Salvat',
};
