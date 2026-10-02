/*
 * TURCO — Notificaciones: lo que otras personas hicieron contigo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de quien avisa entra por `{{nombre}}` y la pantalla lo pinta en negrita partiendo la
 * frase por el hueco, así que cada frase lo lleva UNA vez. En turco va siempre de SUJETO, al
 * principio y sin sufijo («{{nombre}} gönderini beğendi»); su repuesto, `common.user`
 * («Kullanıcı»), encaja igual. `repost` dice «yeniden paylaştı» (glosario 10.2): el aviso llega
 * cuando alguien republica. Una solicitud de ËContact es un «istek», y la marca no lleva sufijo:
 * «ËContact listesine», «ËContact isteğini».
 *
 * `communityPost` no puede decir «{{comunidad}} topluluğunda»: cuando falta el nombre, el hueco se
 * rellena con `aCommunity` y saldría «bir topluluk topluluğunda». La comunidad va como etiqueta
 * delante («{{comunidad}}: {{nombre}} yeni bir gönderi paylaştı») y su repuesto es «Topluluk», con
 * mayúscula porque abre la frase. `now` es «şimdi», lo mismo que escribe `Intl` para el instante.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Bildirimler',
  empty: 'Bildirim yok',
  emptyHint: 'Biri seninle etkileşime geçtiğinde burada görünecek',
  allRead: 'Tüm bildirimlerini okudun',
  noneNew: 'Yeni bildirim yok',
  like: '{{nombre}} gönderini beğendi',
  comment: '{{nombre}} gönderine yorum yaptı',
  follow: '{{nombre}} seni takip etmeye başladı',
  econtactRequest: '{{nombre}} seni ËContact listesine eklemek istiyor',
  econtactAccepted: '{{nombre}} ËContact isteğini kabul etti',
  repost: '{{nombre}} gönderini yeniden paylaştı',
  mention: '{{nombre}} senden bahsetti',
  reply: '{{nombre}} yorumunu yanıtladı',
  communityPost: '{{comunidad}}: {{nombre}} yeni bir gönderi paylaştı',
  aCommunity: 'Topluluk',
  generic: '{{nombre}} seninle etkileşime geçti',
  now: 'şimdi',
  markAllRead: 'Tümünü okundu olarak işaretle',
  all: 'Tümü',
  unread: 'Okunmamış',
  unreadWithCount: 'Okunmamış ({{total}})',
};
