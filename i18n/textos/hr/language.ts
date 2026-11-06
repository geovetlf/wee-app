/*
 * Configuración → Idioma, en croata.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). El nombre del idioma no está aquí: sale del registro.
 */
export const language: typeof import('../es/language').language = {
  title: 'Jezik',
  explanation: 'Promijeni jezik sučelja aplikacije Weë. Objave i komentari i dalje se prikazuju onako kako su napisani.',
  comingSoon: 'Uskoro',
  comingSoonTitle: 'Uskoro stiže',
  selected: 'Odabrano',
};
