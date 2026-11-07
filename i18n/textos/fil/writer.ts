/*
 * FILIPINO — Weë Writer, dentro de Weë Studio: el editor y las herramientas que trabajan el texto de la
 * persona. Ese texto NUNCA pasa por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los botones son imperativos filipinos de una palabra, la familia que usan las herramientas de escritura
 * en filipino: «Pagandahin» (mejorar), «Paikliin», «Pahabain», «Itama» (corregir), «Ibuod» (resumir) e
 * «Isalin» (traducir, glosario § 11.2). Los «…Goal» son la petición que viaja a Weë Brain, y el código les
 * pega `: "extracto"` detrás: van en imperativo, como se le pide algo a Weë, y sin punto. «Ortografía» es
 * «spelling», la palabra que se usa; «estilo», «istilo»; el texto, «text» (§ 11.3).
 *
 * «Pídele a Weë» es «Magpatulong sa Weë» (pedir ayuda a Weë): corto para un botón y natural en una frase
 * («puwede kang magpatulong sa Weë na…»). «Weë lo trabaja contigo» es «Tutulungan ka ng Weë…»: Weë con su
 * marcador de cosa, nunca «si/ni». «Documento» es «dokumento» y «Mis documentos», «Mga dokumento ko», como
 * «Mga proyekto ko». «Editado {{cuando}}» es «Na-edit {{cuando}}»; {{cuando}} lo escribe Intl («kahapon»,
 * «3 araw ang nakalipas»). El título del editor es «Text editor», porque «Editor» a secas se quedaría igual
 * que en español y en inglés. El fallo de guardar lleva el paso siguiente (§ 3.4).
 *
 * Plural (§ 8.3): `{{contador}} salita` / `{{contador}} na salita`. `savedInDocuments` conserva el
 * espacio del principio: es una pieza que se pega.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Magpatulong sa Weë',
  writeSomethingFirst: 'Magsulat muna ng kahit ano',
  writeSomethingHint: 'Magsulat muna ng kahit ano, at tutulungan ka ng Weë na pagandahin ito.',
  save: 'I-save',
  saving: 'Sine-save…',
  deleteDocument: 'I-delete ang dokumento',
  improve: 'Pagandahin',
  improveGoal: 'Pagandahin ang text na ito',
  shorten: 'Paikliin',
  shortenGoal: 'Paikliin ang text na ito nang hindi nawawala ang mahalaga',
  expand: 'Pahabain',
  expandGoal: 'Palawakin pa ang text na ito',
  fix: 'Itama',
  fixGoal: 'Itama ang spelling at istilo ng text na ito',
  tone: 'Palitan ang tono',
  toneGoal: 'Isulat ulit ang text na ito sa ibang tono',
  summarize: 'Ibuod',
  summarizeGoal: 'Ibuod ang text na ito sa mga pangunahing ideya',
  translate: 'Isalin',
  translateGoal: 'Isalin ang text na ito',
  words_one: '{{contador}} salita',
  words_other: '{{contador}} na salita',
  savedInDocuments: ' · na-save sa Mga dokumento ko',
  couldNotSaveToDocuments: 'Hindi ma-save sa Mga dokumento ko. Subukan ulit.',
  myDocuments: 'Mga dokumento ko',
  untitled: 'Walang pamagat',
  newDocument: 'Bagong dokumento',
  noDocumentsYet: 'Wala ka pang dokumento. Magsulat ng bago o magpatulong sa Weë para simulan ito.',
  editedWhen: 'Na-edit {{cuando}}',
  titleLabel: 'Pamagat ng dokumento',
  bodyLabel: 'Text ng dokumento',
  editorTitle: '✍️ Text editor',
  docTitlePlaceholder: 'Pamagat ng dokumento',
  bodyPlaceholder: 'Magsulat dito. Kahit kailan, puwede kang magpatulong sa Weë na pagandahin, itama o isalin ito.',
  resultHint: 'Aayusin ng Weë ang isinulat mo at ibabalik dito ang resulta para maituloy mo ang pag-edit.',
  weeWorksWithYou: 'Tutulungan ka ng Weë dito.',
  saved: '✓ Na-save',
};
