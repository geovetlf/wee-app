/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Weë Writer, dentro de Weë Studio. El texto que escribe la persona
 * NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés. Botones en imperativo 2sg→3sg («Pitsanngorsaruk», «Naalisaruk», «Nutseruk»); los
 * objetivos (…Goal) dicen lo mismo con objeto explícito («Allagaq una …»). «Weë» va como objeto en absolutivo
 * («Weë qinnuigiuk» pídeselo a Weë) o como sujeto de un verbo intransitivo («Weë ilinnik suleqateqassaaq»),
 * nunca con sufijo. Documento = «allakkiaq», Mis documentos = «Allakkiakka». Casi todo «pendiente de
 * confirmación nativa».
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Weë qinnuigiuk',
  writeSomethingFirst: 'Siullermik arlaannik allagit',
  writeSomethingHint: 'Siullermik arlaannik allagit, taava Weë ilinnik suleqateqassaaq.',
  save: 'Toqqoruk',
  saving: 'Toqqorneqarpoq…',
  deleteDocument: 'Allakkiaq peeruk',
  improve: 'Pitsanngorsaruk',
  improveGoal: 'Allagaq una pitsanngorsaruk',
  shorten: 'Naalisaruk',
  shortenGoal: 'Allagaq una naalisaruk, pingaarutillit annaanagit',
  expand: 'Takilisaruk',
  expandGoal: 'Allagaq una annertunerusumik ineriartortiguk',
  fix: 'Iluarsiguk',
  fixGoal: 'Allagap matuma allanneqarnera allaaserialu iluarsikkit',
  tone: 'Allaaseq allanngortiguk',
  toneGoal: 'Allagaq una allaaseq alla atorlugu allaqqiguk',
  summarize: 'Eqikkaaruk',
  summarizeGoal: 'Allagaq una isumanut pingaarnernut eqikkaaruk',
  translate: 'Nutseruk',
  translateGoal: 'Allagaq una nutseruk',
  words_one: '{{contador}} oqaaseq',
  words_other: '{{contador}} oqaatsit',
  savedInDocuments: ' · toqqorneqarpoq: Allakkiakka',
  couldNotSaveToDocuments: 'Allakkiannut toqqorneq iluatsinngilaq',
  myDocuments: 'Allakkiakka',
  newDocument: 'Allakkiaq nutaaq',
  noDocumentsYet: 'Suli allakkiaqanngilatit. Nutaamik allagit, imaluunniit Weë qinnuigiuk aallarteqqullugu.',
  editedWhen: 'Aaqqissuunneqarpoq: {{cuando}}',
  titleLabel: 'Allakkiap qulequtaa',
  bodyLabel: 'Allakkiap allagaa',
  editorTitle: '✍️ Aaqqissuisoq',
  docTitlePlaceholder: 'Allakkiap qulequtaa',
  bodyPlaceholder: 'Maani allagit. Kissaatigigukku, Weë qinnuigiuk pitsanngorsaqqullugu, iluarsiqqullugu nutseqqullugulu.',
  resultHint: 'Weë allakkatinnik suliaqassaaq, inernerlu maani takuneqassaaq, aaqqissuuteqqinneqarsinnaasoq.',
  weeWorksWithYou: 'Weë ilinnik suleqateqassaaq.',
  saved: '✓ Toqqorneqarpoq',
};
