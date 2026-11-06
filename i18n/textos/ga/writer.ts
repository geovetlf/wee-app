/*
 * IRLANDÉS — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí:
 * solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El contador de palabras lleva las cinco formas: «focal» (1, 0 y 11+), «fhocal» (2-6, lenición),
 * «bhfocal» (7-10, eclipsis).
 */
import { ConPlurales } from './plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'Iarr ar Weë',
  writeSomethingFirst: 'Scríobh rud éigin ar dtús',
  writeSomethingHint: 'Scríobh rud éigin ar dtús agus oibreoidh Weë air leat.',
  save: 'Sábháil',
  saving: 'Á shábháil…',
  deleteDocument: 'Scrios an doiciméad',
  improve: 'Feabhsaigh',
  improveGoal: 'An téacs seo a fheabhsú',
  shorten: 'Giorraigh',
  shortenGoal: 'An téacs seo a ghiorrú gan an rud tábhachtach a chailleadh',
  expand: 'Leathnaigh',
  expandGoal: 'An téacs seo a fhorbairt tuilleadh',
  fix: 'Ceartaigh',
  fixGoal: 'Litriú agus stíl an téacs seo a cheartú',
  tone: 'Athraigh an tón',
  toneGoal: 'An téacs seo a athscríobh le tón eile',
  summarize: 'Achoimrigh',
  summarizeGoal: 'An téacs seo a achoimriú ina phríomhsmaointe',
  translate: 'Aistrigh',
  translateGoal: 'An téacs seo a aistriú',
  words_one: '{{contador}} focal',
  words_two: '{{contador}} fhocal',
  words_few: '{{contador}} fhocal',
  words_many: '{{contador}} bhfocal',
  words_other: '{{contador}} focal',
  savedInDocuments: ' · sábháilte i Mo dhoiciméid',
  couldNotSaveToDocuments: 'Níorbh fhéidir é a shábháil i Mo dhoiciméid',
  myDocuments: 'Mo dhoiciméid',
  newDocument: 'Doiciméad nua',
  noDocumentsYet: 'Níl aon doiciméad agat fós. Scríobh ceann nua nó iarr ar Weë tosú duit.',
  editedWhen: 'Curtha in eagar {{cuando}}',
  titleLabel: 'Teideal an doiciméid',
  bodyLabel: 'Téacs an doiciméid',
  editorTitle: '✍️ Eagarthóir',
  docTitlePlaceholder: 'Teideal an doiciméid',
  bodyPlaceholder: 'Scríobh anseo. Nuair is mian leat, iarr ar Weë é a fheabhsú, a cheartú nó a aistriú.',
  resultHint: 'Oibríonn Weë ar an méid a scríobh tú agus tugann sé an toradh ar ais duit anseo, réidh le cur in eagar tuilleadh.',
  weeWorksWithYou: 'Oibríonn Weë air leat.',
  saved: '✓ Sábháilte',
};
