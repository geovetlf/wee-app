/*
 * TURCO — El alta guiada y la creación del Perfil Weë: quién eres, y quién eres
 * en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El Perfil Weë es «Weë profili» (glosario § 10.1), también en el título y en el
 * botón de crearlo, que comparten `weeTitle`: «Weë profili oluştur». La marca no
 * lleva sufijo: lo lleva «profil» («Weë profilini», «Weë profilinle»); cuando lo
 * lleva Weë, es uno de la tabla (§ 9): «Weë'ye hoş geldin», «Weë'yi kullanmak».
 *
 * Los avisos de lo que falta dicen qué no se hizo, como un formulario turco: lo
 * que se escribe «girilmedi» (el nombre) y lo que se elige en un selector
 * «seçilmedi» (fecha de nacimiento, género, país); el cuerpo dice qué hacer, en
 * imperativo de «sen». El «nombre anónimo» es «Takma ad», y el ejemplo del campo
 * se adapta («KaraGölge», «sombra oscura»), con «Örn.», la abreviatura de la TDK.
 * «Desde el header» es «ekranın üst kısmından»: se dice dónde mirar, no el nombre
 * técnico de la pieza. `stepOf` es «Adım 1/2», compacto y sin sufijos.
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Weë\'ye hoş geldin',
  welcomeSubtitle: 'Bize kendinden bahset. Sonra Weë profilini oluşturabilirsin: yapay zekâyla bir şeyler oluştururken kullanacağın kimlik.',
  yourName: 'Adın',
  yourNameHint: 'Bu ad herkese açık profilinde görünecek.',
  yourNamePlaceholder: 'Adın ve soyadın',
  birthDate: 'Doğum tarihi',
  birthDateHint: 'Weë\'yi kullanmak için en az 13 yaşında olmalısın.',
  gender: 'Cinsiyet',
  genderMale: 'Erkek',
  genderFemale: 'Kadın',
  genderOther: 'Diğer',
  country: 'Ülke',
  pickCountry: 'Ülkeni seç',
  searchCountry: 'Ülke ara…',
  customiseProfile: 'Profilini kişiselleştir',
  yourAvatar: 'Avatarın',
  yourAvatarHint: 'Hazır bir avatar seçmek ya da kendi görselini yüklemek için dokun',
  bioPlaceholder: 'Kendinden biraz bahset… (isteğe bağlı)',
  saving: 'Kaydediliyor…',
  completed: 'Tamamlandı!',
  complete: 'Tamamla',
  continueStep: 'Devam et',
  nameMissingTitle: 'Ad girilmedi',
  nameMissing: 'Devam etmek için adını yaz.',
  nameShortTitle: 'Ad çok kısa',
  nameShort: 'Adın en az 2 harften oluşmalı.',
  birthMissingTitle: 'Doğum tarihi seçilmedi',
  birthMissing: 'Gün, ay ve yıl seç.',
  genderMissingTitle: 'Cinsiyet seçilmedi',
  genderMissing: 'Devam etmek için bir seçenek seç.',
  countryMissingTitle: 'Ülke seçilmedi',
  countryMissing: 'Devam etmek için ülkeni seç.',
  saveFailedTitle: 'Profilin kaydedilemedi',
  saveFailed: 'Yeniden dene.',
  weeTitle: 'Weë profili oluştur',
  weeIntro: 'Bu profil, gerçek kimliğinden bağımsızdır. Weë profilinle yaptığın paylaşımlar ve işlemler ana profilinle ilişkilendirilmez.',
  weePhoto: 'Profil fotoğrafı',
  weePhotoHint: 'Bir fotoğraf ya da hazır bir avatar seçmek için dokun',
  weeName: 'Takma ad',
  weeNamePlaceholder: 'Örn. KaraGölge, Anon123…',
  weeBioPlaceholder: 'Alter egonu anlat…',
  weeCreatedTitle: 'Weë profili oluşturuldu',
  weeCreated: 'Anonim kimliğin hazır. Profiller arasında ekranın üst kısmından geçiş yapabilirsin.',
  weeCreateFailed: 'Weë profili oluşturulamadı',
  birthDay: 'Gün',
  birthMonth: 'Ay',
  birthYear: 'Yıl',
  stepOf: 'Adım {{paso}}/{{total}}',
  customiseProfileHint: 'Bir avatar seç ve açıklama ekle (isteğe bağlı)',
  bioLabel: 'Açıklama (isteğe bağlı)',
  weeNameCounter: '{{usados}}/{{maximo}} · En az {{minimo}} karakter',
  weeBio: 'Biyografi (isteğe bağlı)',
};
