/*
 * TURCO — Configuración: contenido, preferencias, privacidad, notificaciones, información y cuenta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La ubicación es «konum» y las notificaciones push, «anlık bildirimler». El contador de
 * comunidades lleva el sufijo en «topluluk», nunca en la cifra: «{{contador}} topluluğa
 * katıldın», igual en `_one` y `_other`. `locationLine` empieza por el estado —una frase que ya
 * acaba en punto— y sigue con la advertencia de privacidad. `aboutBody` conserva sus dos saltos
 * dobles. El panel del motor (solo administración) se llama «Weë AI Engine», como en casi todos
 * los idiomas: es el nombre del producto —el WEË AI ENGINE—, no una descripción. «Sembrar» los
 * valores por defecto se dice «ekle» (añadir), que es lo que hace: escribe lo que falta y no
 * borra nada.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Ayarlar',
  sectionContent: 'İçerik',
  sectionPrivacy: 'Gizlilik',
  sectionPreferences: 'Tercihler',
  sectionSupport: 'Yardım',
  myCommunities: 'Topluluklarım',
  communitiesJoined_one: '{{contador}} topluluğa katıldın',
  communitiesJoined_other: '{{contador}} topluluğa katıldın',
  privateReplies: 'Özel yanıtlar',
  privateRepliesHint: 'Başkalarının sana özel mesaj göndermesine izin ver',
  pushNotifications: 'Anlık bildirimler',
  language: 'Dil',
  languageSubtitle: 'Weë\'nin dilini seç',
  help: 'Yardım',
  privacyPolicy: 'Gizlilik politikası',
  about: 'Weë hakkında',
  signOut: 'Çıkış yap',
  signOutFailed: 'Çıkış yapılamadı',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Varsayılan değerleri ekle',
  seedDefaultsConfirm: 'Henüz olmayan varsayılan sağlayıcıları, fallback zincirlerini ve ayarları Firestore\'a yazar. Hiçbir şeyi silmez.',
  seed: 'Ekle',
  sectionNotifications: 'Bildirimler',
  sectionInfo: 'Bilgi',
  sectionAccount: 'Hesap',
  privacyPolicyHint: 'Verilerinle ne yaptığımız, sade bir dille',
  pushNotificationsHint: 'Yeni mesajlar ve etkinlikler için bildirim al',
  aboutHint: 'Weë\'nin ne olduğu ve kullandığın sürüm',
  helpHint: 'Sık sorulan sorular ve iletişim',
  signOutHint: 'Hesabından çıkış yap',
  aboutBody: 'Weë (World Encode Entity), yapay zekâ ile bir şeyler oluşturan insanların sosyal ağıdır.\n\nSürüm 1.0.0 · © {{anio}} Weë. Tüm hakları saklıdır.\n\nCoğrafi veriler: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Konum',
  locationLine: '{{estado}} Tam konumun hiçbir zaman herkese açık olarak gösterilmez.',
  locationOff: 'Kapalı. Bir gönderiye konum eklediğinde yakınındaki yerleri ve bölgeni önerebilmesi için Weë\'nin yaklaşık konumunu kullanmasına izin ver. Tam konumun hiçbir zaman herkese açık olarak gösterilmez.',
  locationUnavailable: 'Bu cihazdan konumun alınamıyor.',
  locationDisabled: 'Cihaz ayarlarında konum kapalı.',
  locationPermissionDenied: 'Konum iznini reddettin. Cihaz ayarlarından değiştirmek için buraya dokun.',
  locationPermissionNotDetermined: 'Weë, gerektiğinde senden izin isteyecek.',
  locationApproximate: 'Weë bulunduğun bölgeyi bilir, tam noktayı bilmez.',
  locationPrecise: 'Bir özellik gerektirdiğinde Weë ayrıntılı konumunu kullanabilir.',
};
