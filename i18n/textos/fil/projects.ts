/*
 * FILIPINO — Mis proyectos (Mga proyekto ko): la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Un proyecto es «proyekto»; una creación, «likha» (glosario § 6 y § 11.3), y un especialista, «espesyalista»: los
 * de Weë son «mga espesyalista ng Weë», con la marca detrás y su marcador de cosa. Crear es «Gumawa» (§ 11.2) y,
 * con objeto definido, «Gawin»; borrar un proyecto, «I-delete», y cambiarle el nombre, «Palitan ang pangalan».
 *
 * El nombre del proyecto es de la persona: entra por `{{nombre}}`, entre “…” (§ 7) y sin nada pegado.
 * `{{accion}}` es el botón «I-save sa isang proyekto» de weeai y también va entre “…”. Borrar un proyecto no borra
 * ninguna creación, y la confirmación lo dice con una frase positiva —«Mananatili ang mga likha mo»— en vez de
 * «Hindi made-delete…», que tropieza al leerse. Las confirmaciones empiezan por «Gusto mo bang …?» (§ 3.4). «No
 * encontramos este proyecto» habla con el «kami» exclusivo (§ 2): «Hindi namin mahanap…». «Ejemplo:» es
 * «Halimbawa:», como en los demás placeholders; el proyecto de ejemplo es «Restaurant ko». Un anuncio es «ad», como
 * en el catálogo de Weë Business.
 *
 * `emojiLabel` solo lo oye el lector de pantalla y es igual que en weeai: «Emoji: {{emoji}}», con dos puntos para que
 * se oiga como un rótulo. Plural (§ 8.3): la cifra va delante del sustantivo, así que `_other` lleva el enlace:
 * «{{contador}} likha» / «{{contador}} na likha».
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Ang mga likha mo, nakaayos ayon sa proyekto',
  introText: 'Puwedeng may logo, larawan, ad, video, musika at dokumento ang isang proyekto. I-save ang bawat resulta sa tamang proyekto gamit ang “{{accion}}”.',
  sectionTitle: 'Mga proyekto',
  emojiLabel: 'Emoji: {{emoji}}',
  namePlaceholder: 'Halimbawa: Restaurant ko',
  emptyTitle: 'Wala ka pang proyekto',
  emptyText: 'Gumawa ng una mong proyekto, o i-save ang isang likha sa proyekto mula sa resulta nito.',
  emptyAction: 'Gumawa ng una kong proyekto',
  open: 'Buksan',
  fallbackTitle: 'Proyekto',
  notFound: 'Hindi namin mahanap ang proyektong ito.',
  saveName: 'I-save ang pangalan',
  rename: 'Palitan ang pangalan',
  deleteProject: 'I-delete ang proyekto',
  deleteConfirmWeb: 'Gusto mo bang i-delete ang proyektong “{{nombre}}”? Mananatili ang mga likha mo.',
  deleteConfirm: 'Gusto mo bang i-delete ang “{{nombre}}”? Mananatili ang mga likha mo.',
  creations_one: '{{contador}} likha',
  creations_other: '{{contador}} na likha',
  creationsTitle: 'Mga likha',
  add: 'Idagdag',
  noCreations: 'Wala pang likha dito. Gumawa ng kahit ano gamit ang alinmang espesyalista at i-save ito sa proyektong ito.',
  whatIsMissing: 'Ano pa ang kulang sa proyektong ito?',
  whatIsMissingNote: 'Logo, larawan, ad, video, musika o dokumento: puwedeng mag-ambag dito ang alinmang espesyalista ng Weë.',
  createSomethingNew: 'Gumawa ng bago',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} proyekto',
  count_other: '{{contador}} na proyekto',
  updatedOn: 'Na-update noong {{fecha}}',
  searchPlaceholder: 'Maghanap ng proyekto',
  sortUpdated: 'Kamakailang na-update',
  sortName: 'Pangalan (A–Z)',
  noMatches: 'Walang proyektong tumutugma sa hinanap mo.',
  emptySpaceTitle: 'Dito nagsisimula ang iyong malikhaing espasyo',
  moreActions: 'Iba pang aksyon',
};
