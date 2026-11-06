/*
 * ISLANDÉS (is · is-IS) — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí:
 * solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Botones en infinitivo sin «að» («Bæta», «Stytta», «Lengja», «Leiðrétta», guía § 4); los …Goal son la voz de la
 * persona y van en infinitivo como en el español («Bæta þennan texta»; guía § 4, unificación del 2026-11-03). «Orð» es neutro e invariable en plural: «1 orð», «3 orð».
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Biðja Weë',
  writeSomethingFirst: 'Skrifaðu eitthvað fyrst',
  writeSomethingHint: 'Skrifaðu eitthvað fyrst og Weë vinnur það með þér.',
  save: 'Vista',
  saving: 'Vistar…',
  deleteDocument: 'Eyða skjali',
  improve: 'Bæta',
  improveGoal: 'Bæta þennan texta',
  shorten: 'Stytta',
  shortenGoal: 'Stytta þennan texta án þess að missa það mikilvæga',
  expand: 'Lengja',
  expandGoal: 'Útfæra þennan texta nánar',
  fix: 'Leiðrétta',
  fixGoal: 'Leiðrétta stafsetningu og stíl þessa texta',
  tone: 'Breyta tóni',
  toneGoal: 'Endurskrifa þennan texta í öðrum tóni',
  summarize: 'Draga saman',
  summarizeGoal: 'Draga þennan texta saman í lykilatriði',
  translate: 'Þýða',
  translateGoal: 'Þýða þennan texta',
  words_one: '{{contador}} orð',
  words_other: '{{contador}} orð',
  savedInDocuments: ' · vistað í Skjölin mín',
  couldNotSaveToDocuments: 'Ekki tókst að vista í Skjölin mín',
  myDocuments: 'Skjölin mín',
  newDocument: 'Nýtt skjal',
  noDocumentsYet: 'Þú átt engin skjöl enn. Skrifaðu nýtt eða biddu Weë að byrja fyrir þig.',
  editedWhen: 'Breytt {{cuando}}',
  titleLabel: 'Titill skjals',
  bodyLabel: 'Texti skjals',
  editorTitle: '✍️ Ritill',
  docTitlePlaceholder: 'Titill skjals',
  bodyPlaceholder: 'Skrifaðu hér. Þegar þú vilt geturðu beðið Weë að bæta, leiðrétta eða þýða textann.',
  resultHint: 'Weë vinnur með það sem þú skrifaðir og skilar útkomunni hingað, tilbúinni til frekari vinnslu.',
  weeWorksWithYou: 'Weë vinnur það með þér.',
  saved: '✓ Vistað',
};
