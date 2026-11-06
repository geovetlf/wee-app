/*
 * FILIPINO — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El Perfil Weë es «Weë profile» (glosario § 6): marca + sustantivo, sin nada pegado, también en el título y en el
 * botón de crearlo, que comparten `weeTitle`: «Gumawa ng Weë profile». El «perfil principal» del español es el
 * Tunay na profile (§ 6), con mayúscula porque es el nombre de una de las dos caras; la «identidad real», en
 * cambio, se describe en minúscula: «tunay mong pagkakakilanlan». En `weeIntro` el «con Weë» del español es «con
 * este perfil», así que se dice «gamit ang Weë profile».
 *
 * Las palabras son las del glosario (§ 11.7): «Kaarawan» con «Araw», «Buwan» y «Taon»; «Kasarian» con «Lalaki»,
 * «Babae» e «Iba pa»; «Bansa»; «opsyonal»; «Bio»; «Hakbang {{paso}} sa {{total}}»; y la frase de la edad mínima,
 * palabra por palabra (la cifra no lleva enlace: «taong» es «taon» + «-ng» ante «gulang»). El botón del último paso
 * es «Kumpletuhin» (§ 11.2) y el estado de después, «Tapos na!». Lo que falta se titula «Kailangan ang … mo» (el
 * «Campo obligatorio» del glosario, sin reproche) y el cuerpo dice qué hacer, con el verbo delante.
 *
 * «Desde el header» es «sa itaas ng screen»: se dice dónde mirar, no el nombre técnico de la pieza. El ejemplo del
 * nombre anónimo se adapta («AninoSaDilim») y va con «Halimbawa:». En el contador se conserva el guion simple del
 * español, y la cifra mínima no lleva enlace porque es un hueco (§ 8.3, regla 7).
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Welcome sa Weë',
  welcomeSubtitle: 'Sabihin sa amin kung sino ka. Pagkatapos, puwede ka nang gumawa ng Weë profile mo: ang pagkakakilanlan mo para lumikha gamit ang AI.',
  yourName: 'Pangalan mo',
  yourNameHint: 'Makikita ang pangalang ito sa pampublikong profile mo.',
  yourNamePlaceholder: 'Buong pangalan mo',
  birthDate: 'Kaarawan',
  birthDateHint: 'Para lang sa mga {{edad}} taong gulang pataas ang Weë.',
  gender: 'Kasarian',
  genderMale: 'Lalaki',
  genderFemale: 'Babae',
  genderOther: 'Iba pa',
  country: 'Bansa',
  pickCountry: 'Piliin ang bansa mo',
  searchCountry: 'Maghanap ng bansa…',
  customiseProfile: 'I-customize ang profile mo',
  yourAvatar: 'Avatar mo',
  yourAvatarHint: 'I-tap para pumili ng nakahandang avatar o mag-upload ng sarili mong larawan',
  bioPlaceholder: 'Magkuwento tungkol sa sarili mo… (opsyonal)',
  saving: 'Sine-save…',
  completed: 'Tapos na!',
  complete: 'Kumpletuhin',
  continueStep: 'Magpatuloy',
  nameMissingTitle: 'Kailangan ang pangalan mo',
  nameMissing: 'Ilagay ang pangalan mo para magpatuloy.',
  nameShortTitle: 'Masyadong maikli ang pangalan',
  nameShort: 'Dapat may hindi bababa sa 2 letra ang pangalan mo.',
  birthMissingTitle: 'Kailangan ang kaarawan mo',
  birthMissing: 'Piliin ang araw, buwan at taon.',
  underAgeTitle: 'Pinakamababang edad: {{edad}}',
  birthInvalidTitle: 'Hindi valid ang petsa',
  birthInvalid: 'Wala sa kalendaryo ang petsang iyan.',
  genderMissingTitle: 'Kailangan ang kasarian mo',
  genderMissing: 'Pumili ng isang opsyon para magpatuloy.',
  countryMissingTitle: 'Kailangan ang bansa mo',
  countryMissing: 'Piliin ang bansa mo para magpatuloy.',
  saveFailedTitle: 'Hindi ma-save ang profile mo',
  saveFailed: 'Subukan ulit.',
  weeTitle: 'Gumawa ng Weë profile',
  weeIntro: 'Hiwalay ang profile na ito sa tunay mong pagkakakilanlan. Hindi maiuugnay sa Tunay na profile mo ang mga ipo-post at gagawin mo gamit ang Weë profile.',
  weePhoto: 'Profile picture',
  weePhotoHint: 'I-tap para pumili ng larawan o nakahandang avatar',
  weeName: 'Anonymous na pangalan',
  weeNamePlaceholder: 'Halimbawa: AninoSaDilim, Anon123…',
  weeBioPlaceholder: 'Ilarawan ang alter ego mo…',
  weeCreatedTitle: 'Nagawa na ang Weë profile mo',
  weeCreated: 'Handa na ang anonymous mong pagkakakilanlan. Puwede kang magpalit ng profile sa itaas ng screen.',
  weeCreateFailed: 'Hindi magawa ang Weë profile. Subukan ulit.',
  birthDay: 'Araw',
  birthMonth: 'Buwan',
  birthYear: 'Taon',
  stepOf: 'Hakbang {{paso}} sa {{total}}',
  customiseProfileHint: 'Pumili ng avatar at magdagdag ng paglalarawan (opsyonal)',
  bioLabel: 'Paglalarawan (opsyonal)',
  weeNameCounter: '{{usados}}/{{maximo}} - Hindi bababa sa {{minimo}} character',
  weeBio: 'Bio (opsyonal)',
};
