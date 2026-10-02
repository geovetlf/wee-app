/*
 * TURCO — Mis proyectos (Projelerim): la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Especialista» es «uzman» y una creación, «içerik» (glosario 10.4). {{accion}} es el botón
 * «Guardar en un proyecto» de weeai y va entre “…” seguido de un sustantivo que lleva el sufijo:
 * «“{{accion}}” seçeneğiyle». El nombre del proyecto es de la persona: entre “…” y sin sufijo
 * («“{{nombre}}” projesi silinsin mi?»). `emojiLabel` solo lo oye el lector de pantalla:
 * «{{emoji}} emojisi», con el sufijo en «emoji» y no en el hueco. El contador, en singular tras la
 * cifra en las dos formas.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'İçeriklerini projelere göre düzenle',
  introText: 'Bir projede logo, fotoğraf, reklam, video, müzik ve belge olabilir. Her sonucu “{{accion}}” seçeneğiyle kendi projesine ekle.',
  sectionTitle: 'Projeler',
  emojiLabel: '{{emoji}} emojisi',
  namePlaceholder: 'Örnek: Restoranım',
  emptyTitle: 'Henüz projen yok',
  emptyText: 'İlk projeni oluştur ya da bir içeriği, sonuç ekranından bir projeye kaydet.',
  emptyAction: 'İlk projemi oluştur',
  open: 'Aç',
  fallbackTitle: 'Proje',
  notFound: 'Bu proje bulunamadı.',
  saveName: 'Adı kaydet',
  rename: 'Yeniden adlandır',
  deleteProject: 'Projeyi sil',
  deleteConfirmWeb: '“{{nombre}}” projesi silinsin mi? Oluşturdukların silinmez.',
  deleteConfirm: '“{{nombre}}” silinsin mi? Oluşturdukların silinmez.',
  creations_one: '{{contador}} içerik',
  creations_other: '{{contador}} içerik',
  creationsTitle: 'İçerikler',
  add: 'Ekle',
  noCreations: 'Burada henüz içerik yok. Herhangi bir uzmanla bir şey oluştur ve bu projeye kaydet.',
  whatIsMissing: 'Bu projede ne eksik?',
  whatIsMissingNote: 'Bir logo, fotoğraflar, bir reklam, bir video, müzik ya da bir belge: Weë\'nin her uzmanı buraya bir şey katabilir.',
  createSomethingNew: 'Yeni bir şey oluştur',
};
