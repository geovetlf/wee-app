/*
 * TURCO — WeeTalk: la bandeja, la conversación y sus avisos. Los mensajes los escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * WeeTalk es marca. Una conversación es «sohbet» (glosario 10.2). El modo efímero es «Kaybolan
 * mesajlar», el nombre que el turco ya conoce para los mensajes que desaparecen; sale también como
 * vista previa en la bandeja. Dentro de WeeTalk las imágenes son fotos del teléfono —galería o
 * cámara—, así que se dicen «fotoğraf», también en la vista previa (📷 Fotoğraf). `photo` es la
 * etiqueta del botón de la cámara: «Fotoğraf çek». `theme` es «Sohbet teması»: «Tema» a secas se
 * escribe igual que en español. `areYouSure` es el cuerpo del aviso de borrar una conversación,
 * cuyo título ya dice qué se borra. `noConversationsHint` cita en español un botón «Privado» que no
 * existe en ninguna pantalla; aquí cita el que sí existe, «WeeTalk'tan gönder» (`wall.sendByWeeTalk`,
 * en el menú de la publicación, con las mismas letras), que abre la conversación con quien la publicó.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Mesaj yaz…',
  send: 'Gönder',
  empty: 'Henüz sohbetin yok',
  emptyHint: 'Mesaj göndermek için birinin profiline git',
  loadFailed: 'Sohbetlerin yüklenemedi',
  sendFailed: 'Mesaj gönderilemedi',
  attach: 'Ekle',
  photo: 'Fotoğraf çek',
  search: 'Sohbet ara',
  noConversations: 'Henüz sohbet yok',
  deleteConversation: 'Sohbeti sil',
  areYouSure: 'Emin misin?',
  messagePlaceholderShort: 'Mesaj…',
  firstMessage: 'İlk mesajı gönder',
  photoSeen: 'Fotoğraf görüldü',
  photoOnce: 'Tek seferlik fotoğraf',
  photoOpened: 'Açıldı',
  tapToView: 'Görmek için dokun',
  tapToClose: 'Kapatmak için dokun',
  theme: 'Sohbet teması',
  background: 'Arka plan',
  permissions: 'İzinler',
  photoPermission: 'Fotoğraflarına erişmek için izin gerekiyor',
  audioPermission: 'Ses kaydetmek için mikrofon izni gerekiyor',
  imageFailed: 'Fotoğraf gönderilemedi',
  noConversationsHint: 'Anonim bir sohbet başlatmak için herhangi bir gönderinin menüsünde “WeeTalk\'tan gönder” seçeneğine dokun',
  ephemeralMode: 'Kaybolan mesajlar',
  noMessagesYet: 'Henüz mesaj yok',
  youSaid: 'Sen: {{mensaje}}',
  conversationStart: 'Özel sohbetin burada başlıyor',
  beRespectful: 'Saygılı olmayı ve gizliliğe özen göstermeyi unutma 🤝',
  anonymousUser: 'Anonim kullanıcı',
  ephemeralOn: 'Kaybolan mesajlar açık · Sohbetten çıkınca mesajlar silinir',
  cameraNeeded: 'Kamera erişimi gerekiyor',
  allow: 'İzin ver',
  recordAudio: 'Ses kaydet',
  viewOnceOn: 'Bir kez görüntüle',
  keepInChat: 'Sohbette sakla',
  themeClassic: 'Klasik',
  themeMidnight: 'Gece yarısı',
  themeForest: 'Orman',
  themeSunset: 'Gün batımı',
  themeOcean: 'Okyanus',
  themePurple: 'Mor',
  imagePreview: '📷 Fotoğraf',
  audioPreview: '🎤 Sesli mesaj',
  today: 'Bugün',
};
