/*
 * TURCO — el avatar humano con IA: el asistente de nueve preguntas y el reemplazo
 * de persona en una foto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los identificadores de cada opción —'male', 'tone3', 'goatee'…— no están aquí:
 * viajan al servidor y ya están guardados en los perfiles de la gente.
 *
 * «IA» es yapay zekâ, con el circunflejo de la TDK, y «con IA» es yapay zekâyla.
 * «Generar» es oluştur, y el cupo de generaciones es un «hak», como lo cuentan las
 * apps turcas («oluşturma hakkı»); tras la cifra, singular en las dos formas del
 * plural. Pelo, barba y ojos usan las palabras de la peluquería turca: kirli sakal
 * (barba corta), gür sakal, keçi sakalı (candado), ela (ojos color miel).
 * «Pañuelo» es başörtüsü. «Oval» y «Piercing» se escriben igual que en inglés
 * porque así se dicen en turco.
 *
 * «Weë avatarını oluşturuyor» se leería también como «(alguien) crea el avatar de
 * Weë», porque «Weë profili» es el Perfil Weë: por eso Weë, cuando es el sujeto,
 * lleva la coma que la TDK pone tras el sujeto para deshacer la ambigüedad.
 * «Credits» nunca se traduce ni lleva sufijo: el saldo es «Credits bakiyen» y el
 * precio, «{{credits}} Credits karşılığında», con las mismas palabras que weeai
 * («Credits bakiyen: …», «Gereken: …»). «Galería» es Galeri, y los avisos de
 * permiso dicen lo mismo que composer para la misma frase española.
 */
export const aiAvatar: typeof import('../es/aiAvatar').aiAvatar = {
  gender: 'Cinsiyet',
  genderMale: 'Erkek',
  genderFemale: 'Kadın',
  genderOther: 'Diğer',
  skinTone: 'Ten rengi',
  hairStyle: 'Saç modeli',
  hairShort: 'Kısa',
  hairMedium: 'Orta boy',
  hairLong: 'Uzun',
  hairCurly: 'Kıvırcık',
  hairWavy: 'Dalgalı',
  hairBald: 'Kel',
  ageRange: 'Yaş aralığı',
  eyeColor: 'Göz rengi',
  eyeBrown: 'Kahverengi',
  eyeBlue: 'Mavi',
  eyeGreen: 'Yeşil',
  eyeHazel: 'Ela',
  eyeBlack: 'Siyah',
  eyeGray: 'Gri',
  faceShape: 'Yüz şekli',
  faceOval: 'Oval',
  faceRound: 'Yuvarlak',
  faceAngular: 'Köşeli',
  faceLong: 'Uzun',
  faceSquare: 'Kare',
  facialHair: 'Sakal / Bıyık',
  hairNone: 'Sakalsız',
  hairStubble: 'Kirli sakal',
  hairFullBeard: 'Gür sakal',
  hairMustache: 'Bıyık',
  hairGoatee: 'Keçi sakalı',
  accessories: 'Aksesuarlar',
  accNone: 'Yok',
  accGlasses: 'Gözlük',
  accSunglasses: 'Güneş gözlüğü',
  accEarrings: 'Küpe',
  accCap: 'Şapka',
  accHeadscarf: 'Başörtüsü',
  accPiercing: 'Piercing',
  expression: 'İfade',
  expSmile: 'Gülümseyen',
  expSerious: 'Ciddi',
  expRelaxed: 'Rahat',
  expConfident: 'Kendinden emin',
  expMysterious: 'Gizemli',
  currentAvatar: 'Şu anki yapay zekâ avatarın',
  swapTitle: 'Kişi değiştirme',
  swapSubtitle: 'Bir fotoğraf çek ya da yükle; Gemini AI fotoğraftaki kişiyi avatarınla değiştirsin',
  takePhoto: 'Fotoğraf çek',
  gallery: 'Galeri',
  useAsProfilePhoto: 'Profil fotoğrafı yap',
  uploadAnotherPhoto: 'Avatar olarak başka bir fotoğraf yükle',
  intro: 'Yapay zekâyla bir avatar oluştur ya da Weë profilinde avatar olarak kullanmak için bir fotoğraf yükle.',
  uploadPhotoAsAvatar: 'Avatar olarak fotoğraf yükle',
  nextStep: 'İleri',
  previousStep: 'Önceki adım',
  generatedWithGemini: 'Gemini AI ile oluşturulan avatar',
  nowTakeAPhoto: 'Şimdi bir fotoğrafını çek ya da yükle; fotoğraftaki kişiyi avatarınla değiştirelim',
  skipAndUse: 'Atla ve avatarı olduğu gibi kullan',
  regenerate: 'Avatarı yeniden oluştur',
  swapResult: 'İşte sonuç',
  anotherPhoto: 'Başka fotoğraf',
  newAvatar: 'Yeni avatar',
  humanAvatar: 'Yapay zekâ insan avatarı',
  notEnoughTitle: 'Credits bakiyen yetersiz',
  notEnoughWeb: 'Credits bakiyen yetersiz\n{{detalle}}\n\nCredits almak ister misin?',
  creditsDetail: 'Credits bakiyen: {{saldo}}\nGereken: {{coste}}',
  notNow: 'Şimdi değil',
  getCredits: 'Credits al',
  signInFirst: 'Avatar oluşturmak için giriş yap.',
  limitTitle: 'Sınıra ulaştın',
  limitBody: 'Yapay zekâyla {{contador}} avatar oluşturma sınırına ulaştın. Bunun yerine avatar olarak bir fotoğraf yükleyebilirsin.',
  understood: 'Anladım',
  permissionTitle: 'İzin gerekli',
  galleryPermission: 'Galerine erişmemiz gerekiyor.',
  cameraPermission: 'Kameraya erişmemiz gerekiyor.',
  uploadFailed: 'Fotoğraf yüklenemedi. Yeniden dene.',
  saveAvatarFailed: 'Avatar kaydedilemedi.',
  saveFailed: 'Kaydedilemedi. Yeniden dene.',
  doneTitle: 'Tamamlandı',
  photoUpdated: 'Profil fotoğrafın güncellendi.',
  photoUpdateFailed: 'Profil fotoğrafı güncellenemedi.',
  creatingAvatar: 'Weë, avatarını oluşturuyor…',
  creatingAnother: 'Weë, avatarının başka bir sürümünü oluşturuyor…',
  uploadingPhoto: 'Fotoğraf yükleniyor…',
  savingAvatar: 'Avatar kaydediliyor…',
  savingResult: 'Sonuç kaydediliyor…',
  savingProfilePhoto: 'Profil fotoğrafı kaydediliyor…',
  updatingProfilePhoto: 'Profil fotoğrafı güncelleniyor…',
  swapping: 'Weë, avatarını fotoğrafa yerleştiriyor…\n(30 ila 60 saniye sürebilir)',
  generateFailed: 'Avatar oluşturulamadı. Yeniden dene.',
  regenerateFailed: 'Yeni avatar oluşturulamadı. Yeniden dene.',
  replaceFailed: 'Avatar fotoğrafa yerleştirilemedi. Yeniden dene.',
  stepBase: 'Temel',
  stepDetails: 'Ayrıntılar',
  limitReachedCount: 'Sınıra ulaşıldı ({{usadas}}/{{maximo}})',
  regenerateWithAi: 'Yapay zekâyla yeni avatar oluştur',
  allGenerationsUsed_one: 'Yapay zekâyla {{contador}} oluşturma hakkını kullandın.',
  allGenerationsUsed_other: 'Yapay zekâyla {{contador}} oluşturma hakkının hepsini kullandın.',
  generationsCount: 'Yapay zekâyla oluşturulan: {{usadas}}/{{maximo}}',
  generateForCredits: '{{credits}} Credits karşılığında avatar oluştur',
  generateButton: 'Avatar oluştur · {{credits}} Credits',
};
