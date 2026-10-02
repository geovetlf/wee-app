/*
 * TURCO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (guía § 10): Kaydet, Sil, İptal, Paylaş,
 * Gönder, Geri, İleri; imperativo desnudo de «sen» y mayúscula solo al principio. `accept` es el
 * botón único de los avisos: Tamam (glosario 10.5). `done` es Bitti, el «Listo» de iOS y Android:
 * sirve como botón y como título corto de un resultado («✨ Bitti»). `retry` es el CUERPO de un
 * aviso, no un botón. `user` es el nombre de respaldo que entra de sujeto en frases como
 * «{{nombre}} gönderini beğendi» y en la cabecera de un chat: «Kullanıcı» encaja en los dos sitios.
 * Tras una cifra el sustantivo va en singular: «{{cantidad}} gönderi» en `_one` y en `_other`.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'İptal',
  save: 'Kaydet',
  delete: 'Sil',
  close: 'Kapat',
  back: 'Geri',
  next: 'İleri',
  done: 'Bitti',
  accept: 'Tamam',
  send: 'Gönder',
  share: 'Paylaş',
  retry: 'Yeniden dene',
  loading: 'Yükleniyor…',
  error: 'Hata',
  somethingWentWrong: 'Bir sorun oluştu',
  noResults: 'Sonuç yok',
  notAvailable: 'Kullanılamıyor',
  comingSoon: 'Yakında',
  new: 'Yeni',
  seeAll: 'Tümünü gör →',
  guest: 'Misafir',
  anonymousUser: 'Anonim kullanıcı',
  user: 'Kullanıcı',
  yes: 'Evet',
  no: 'Hayır',
  loadMore: 'Daha fazla gönderi yükle',
  postsCount_one: '{{cantidad}} gönderi',
  postsCount_other: '{{cantidad}} gönderi',
  someone: 'Biri',
};
