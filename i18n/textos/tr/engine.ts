/*
 * TURCO — El panel del WEË AI ENGINE (Configuración → Weë AI Engine). Solo
 * administración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Turco técnico de administración: «sağlayıcı» (proveedor), «politika»,
 * «yapılandırma», «sağlık durumu». «Fallback» se queda como en el español del
 * panel, porque es la palabra del oficio: «Fallback zincirleri». Los
 * identificadores del motor (aiRouting, engineAdmin · setRouting, Firestore,
 * `text.generate`) y los nombres de los proveedores se copian tal cual; Firestore
 * lleva sus sufijos según se pronuncia («Firestore'da», «Firestore'a»).
 *
 * Tres frases no pueden pegarle un sufijo al hueco (guía § 4): la política de una
 * capacidad es «{{capacidad}} politikası», el interruptor dice «{{proveedor}}
 * sağlayıcısını etkinleştir», y el origen de la configuración va como etiqueta,
 * «Yapılandırma kaynağı: {{origen}}», porque «leída de {{origen}}» pediría el
 * ablativo sobre el hueco. El margen lleva el signo delante («marj %{{margen}}»)
 * y los segundos, «sn». Las modalidades van en minúscula y en singular dentro de
 * la línea «metin · görsel · video · öncelik 1»; «video» se escribe igual que en
 * español y en inglés porque es la palabra turca (glosario § 10.1).
 */
export const engine: typeof import('../es/engine').engine = {
  refresh: 'Yenile',
  statusFailed: 'Motorun durumu okunamadı. Sunucu çalışıyor mu?',
  changeFailed: 'Değişiklik uygulanamadı',

  adminOnly: 'Yalnızca yöneticiler',
  adminOnlyNote: 'Bu panel Weë ekibi içindir. Ekipteysen hesabının yönetici olarak eklenmesini iste.',

  settingsTitle: 'Ayarlar',
  settingsLine: 'Fiyatlar: {{precios}} · USD başına {{credits}} Credits · marj %{{margen}} · politika: {{politica}} · son çare olarak demo modu: {{demo}}',
  pricesTest: 'deneme',
  pricesReal: 'gerçek',
  yes: 'evet',
  no: 'hayır',
  configFrom: 'Yapılandırma kaynağı: {{origen}}.',
  sourceDefaults: 'koddaki varsayılan değerler',
  resetHealth: 'Sağlık durumunu sıfırla',
  healthReset: 'Sağlık durumu sıfırlandı.',
  seedDone: 'Varsayılan değerler Firestore\'a kaydedildi.',

  providers: 'Sağlayıcılar',
  priority: 'öncelik {{numero}}',
  enable: '{{proveedor}} sağlayıcısını etkinleştir',
  disable: '{{proveedor}} sağlayıcısını devre dışı bırak',
  withKey: 'anahtarlı',
  withoutKey: 'anahtarsız',
  active: 'etkin',
  inactive: 'devre dışı',
  pausedByFailures: 'hatalar nedeniyle duraklatıldı',
  recentFailures_one: 'yakın zamanda {{contador}} hata',
  recentFailures_other: 'yakın zamanda {{contador}} hata',
  modelLine: '• {{id}} · kalite {{calidad}}/5 · hız {{velocidad}}/5 · {{coste}}',
  upToSeconds: ' · en fazla {{segundos}} sn',
  pendingVerification: ' · doğrulanmayı bekliyor',

  chains: 'Fallback zincirleri',
  policyLabel: '{{capacidad}} politikası: {{politica}}',
  onlyDemo: 'yalnızca demo modu (henüz gerçek sağlayıcı yok)',
  editNote: 'Bir zincirin sırasını değiştirmek ya da bir modeli sabitlemek için Firestore\'da aiRouting/{{capacidad}} belgesini düzenle veya engineAdmin · setRouting çağrısını kullan.',

  policyQualityFirst: 'Kalite öncelikli',
  policyBalanced: 'Dengeli',
  policyCostFirst: 'Maliyet öncelikli',

  modalityText: 'metin',
  modalityVision: 'görüntü analizi',
  modalityImage: 'görsel',
  modalityVideo: 'video',
  modalityVoice: 'ses',
  modalityMusic: 'müzik',
  modalityDoc: 'belge',
  rowSubtitle: 'Sağlayıcılar, fallback zincirleri ve ayarlar (yalnızca yöneticiler)',
};
