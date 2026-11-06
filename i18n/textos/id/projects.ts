/*
 * INDONESIO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de un proyecto lo escribe la persona y entra por `{{nombre}}`; la acción citada en
 * `introText` entra por `{{accion}}` y es el botón «Simpan ke proyek». «Karya» (creación) es
 * invariable: las dos formas del contador son idénticas y llevan `{{contador}}`. «Proyek» (nunca el
 * malayo «Projek»).
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Karya Anda, tertata per proyek',
  introText: 'Sebuah proyek dapat berisi logo, foto, iklan, video, musik, dan dokumen. Simpan setiap hasil ke proyeknya lewat "{{accion}}".',
  sectionTitle: 'Proyek',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Contoh: Restoran Saya',
  emptyTitle: 'Anda belum punya proyek',
  emptyText: 'Buat yang pertama atau simpan sebuah karya ke proyek dari hasilnya.',
  emptyAction: 'Buat proyek pertama saya',
  open: 'Buka',
  fallbackTitle: 'Proyek',
  notFound: 'Kami tidak menemukan proyek ini.',
  saveName: 'Simpan nama',
  rename: 'Ubah nama',
  deleteProject: 'Hapus proyek',
  deleteConfirmWeb: 'Hapus proyek "{{nombre}}"? Karya Anda tidak ikut terhapus.',
  deleteConfirm: 'Hapus "{{nombre}}"? Karya Anda tidak ikut terhapus.',
  creations_one: '{{contador}} karya',
  creations_other: '{{contador}} karya',
  creationsTitle: 'Karya',
  add: 'Tambah',
  noCreations: 'Belum ada karya di sini. Buat sesuatu dengan spesialis mana pun dan simpan ke proyek ini.',
  whatIsMissing: 'Apa yang kurang di proyek ini?',
  whatIsMissingNote: 'Logo, foto, iklan, video, musik, atau dokumen: spesialis Weë mana pun dapat menambahkannya di sini.',
  createSomethingNew: 'Buat sesuatu yang baru',
};
