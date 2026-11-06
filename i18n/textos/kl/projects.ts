/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Mis proyectos: la lista y el detalle de un proyecto.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Proyecto = «suliniut», creación = «pilersitaq».
 * El nombre del proyecto ({{nombre}}) lo escribe la persona: va en absolutivo como objeto
 * («»{{nombre}}« peerniarpiuk?»), nunca con sufijo. Plural: «pilersitaq» / «pilersitat».
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Pilersitatit, suliniutinut aaqqissuussat',
  introText: 'Suliniummi ilisarnaat, assit, ussassaarutit, videot, nipilersorneq allakkiallu peqarsinnaapput. Inerneq tamarmi suliniummi naleqquttumi toqqoruk: »{{accion}}«.',
  sectionTitle: 'Suliniutit',
  emojiLabel: 'Assinnguaq: {{emoji}}',
  namePlaceholder: 'Assersuut: Neriniartarfiga',
  emptyTitle: 'Suli suliniuteqanngilatit',
  emptyText: 'Siullersaq pilersiguk, imaluunniit pilersitaq inernerminit suliniummut toqqoruk.',
  emptyAction: 'Suliniut siullerpara pilersiguk',
  open: 'Ammaruk',
  fallbackTitle: 'Suliniut',
  notFound: 'Suliniut una nassaarisinnaanngilarput.',
  saveName: 'Ateq toqqoruk',
  rename: 'Ateq allanngortiguk',
  deleteProject: 'Suliniut peeruk',
  deleteConfirmWeb: 'Suliniut »{{nombre}}« peerniarpiuk? Pilersitatit peerneqassanngillat.',
  deleteConfirm: '»{{nombre}}« peerniarpiuk? Pilersitatit peerneqassanngillat.',
  creations_one: '{{contador}} pilersitaq',
  creations_other: '{{contador}} pilersitat',
  creationsTitle: 'Pilersitat',
  add: 'Ilanngutiguk',
  noCreations: 'Suli maani pilersitaqanngilaq. Immikkut ilisimasallit arlaat atorlugu sunaluunniit pilersiguk, suliniummullu matumunnga toqqoruk.',
  whatIsMissing: 'Suliniummi matumani suna amigaataava?',
  whatIsMissingNote: 'Ilisarnaat, assit, ussassaarut, video, nipilersorneq allakkiarluunniit: immikkut ilisimasallit tamarmik maani ilanngussisinnaapput.',
  createSomethingNew: 'Nutaamik pilersitsigit',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} suliniut',
  count_other: '{{contador}} suliniutit',
  updatedOn: 'Nutarterneqarpoq {{fecha}}',
  searchPlaceholder: 'Suliniutinik ujarlerit',
  sortUpdated: 'Kingullermik nutarterneqartut',
  sortName: 'Ateq (A–Z)',
  noMatches: 'Suliniut ujarlernernut naapertuuttoqanngilaq.',
  emptySpaceTitle: 'Pilersitsiviit maani aallartippoq',
  moreActions: 'Iliuutsit allat',
};
