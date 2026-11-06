/*
 * MALAYO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre del proyecto y la meta de una creación los escribe la persona y entran por
 * interpolación. `creations_one` y `creations_other` son idénticas: el malayo solo tiene «other».
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Ciptaan anda, disusun mengikut projek',
  introText: 'Sesuatu projek boleh mempunyai logo, foto, iklan, video, muzik dan dokumen. Simpan setiap hasil ke dalam projeknya melalui "{{accion}}".',
  sectionTitle: 'Projek',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Contoh: Restoran Saya',
  emptyTitle: 'Anda belum mempunyai projek',
  emptyText: 'Cipta yang pertama atau simpan ciptaan ke dalam projek melalui hasilnya.',
  emptyAction: 'Cipta projek pertama saya',
  open: 'Buka',
  fallbackTitle: 'Projek',
  notFound: 'Kami tidak menemui projek ini.',
  saveName: 'Simpan nama',
  rename: 'Tukar nama',
  deleteProject: 'Padam projek',
  deleteConfirmWeb: 'Padam projek "{{nombre}}"? Ciptaan anda tidak akan dipadam.',
  deleteConfirm: 'Padam "{{nombre}}"? Ciptaan anda tidak akan dipadam.',
  creations_one: '{{contador}} ciptaan',
  creations_other: '{{contador}} ciptaan',
  creationsTitle: 'Ciptaan',
  add: 'Tambah',
  noCreations: 'Belum ada ciptaan di sini. Cipta sesuatu dengan mana-mana pakar dan simpan ke dalam projek ini.',
  whatIsMissing: 'Apa yang kurang pada projek ini?',
  whatIsMissingNote: 'Logo, foto, iklan, video, muzik atau dokumen: mana-mana pakar Weë boleh menyumbang di sini.',
  createSomethingNew: 'Cipta sesuatu yang baharu',
  /* N — Rediseño de «Mis proyectos» (2026-11-05): contador, búsqueda, orden, fecha y vacío de la lista. */
  count_one: '{{contador}} projek',
  count_other: '{{contador}} projek',
  updatedOn: 'Dikemas kini {{fecha}}',
  searchPlaceholder: 'Cari projek',
  sortUpdated: 'Baru dikemas kini',
  sortName: 'Nama (A–Z)',
  noMatches: 'Tiada projek yang sepadan dengan carian anda.',
  emptySpaceTitle: 'Ruang kreatif anda bermula di sini',
  moreActions: 'Tindakan lain',
};
