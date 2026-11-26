/*
 * FILIPINO — el avatar humano con IA del Weë profile: el asistente de nueve preguntas y el reemplazo de persona en
 * una foto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los identificadores de cada opción —'male', 'tone3', 'goatee'…— no están aquí: viajan al servidor y ya están
 * guardados en los perfiles de la gente.
 *
 * «IA» es «AI» y va delante del sustantivo sin enlace, como préstamo: «AI avatar» (§ 4, § 11.10). «Avatar Humano IA»
 * es «AI avatar na mukhang tao». «Generar» es «I-generate» y «Regenerar», «I-generate ulit» (glosario 11.2); en el
 * botón principal, el que cobra, «Gumawa ng avatar» (la llamada principal, como `studio.sendLabel`). Cada generación
 * es un «pag-generate» y el límite, «limitasyon»; «Has usado tus 2 generaciones» es «Naubos mo na…», que ya dice que
 * no quedan. «Reemplazo de persona» es «Pagpapalit ng tao»: Weë AI pone el avatar «kapalit ng tao sa larawan». El
 * Perfil Weë es «Weë profile» y la foto de perfil, «profile picture» (glosario 11.3).
 *
 * Las opciones son etiquetas cortas en filipino de todos los días. El pelo: «Maikli», «Katamtaman», «Mahaba» (la fila
 * de longitudes del glosario 11.11), «Kulot», «Alon-alon», «Kalbo». La cara: «Hugis-itlog» (así se dice oval en
 * filipino), «Bilog», «Matatalas ang anggulo», «Pahaba», «Parisukat» (como `studio.valSquare`). Los ojos: «Kayumanggi»,
 * «Asul», «Berde», «Kulay-pulot» (la «Miel» del español), «Itim», «Kulay-abo». La barba usa las palabras filipinas:
 * «balbas» y «bigote»; la barba cerrada es «Balbas-sarado» y el candado, «Balbas-kambing». Los accesorios: «Salamin sa
 * mata», «Shades» (las gafas de sol en Filipinas), «Hikaw», «Cap», «Panyo sa ulo», «Piercing». Los gestos: «Nakangiti»,
 * «Seryoso», «Relaks», «Kumpiyansa», «Misteryoso». El género es la fila del glosario 11.7: «Kasarian» · «Lalaki» ·
 * «Babae» · «Iba pa».
 *
 * «Credits» no se traduce ni lleva `mga`; «No tienes suficientes Credits» es la frase del glosario, «Kulang ang
 * Credits mo», y el detalle del saldo, «Available na Credits» / «Halaga» (11.9). «Ahora no» es «Hindi muna»;
 * «Entendido», «OK» (el botón que cierra un aviso, como en `studio`); «Listo» como título, «Tapos na». Los permisos
 * los pide Weë con «namin» (§ 2). Los estados son los del § 11.4 («Ina-upload…», «Sine-save…», «Ina-update…») y los
 * errores, «Hindi ma-… Subukan ulit.» El «...» del español es «…», un carácter, y «entre 30 y 60 segundos» va con
 * «nang» de medida (§ 5.3).
 *
 * Plural (§ 8.3): en `allGenerationsUsed` la cifra va delante del sustantivo, así que `_other` lleva «na» («4 na
 * pag-generate»). `limitBody` no tiene plural: pone la cifra al final, tras los dos puntos y sin sustantivo
 * detrás, para que nunca falte el «na» de 4, 6 o 9 (regla 7).
 *
 * Se escriben igual que en inglés porque es la palabra que se usa en Filipinas: «Cap» y «Piercing».
 */
export const aiAvatar: typeof import('../es/aiAvatar').aiAvatar = {
  gender: 'Kasarian',
  genderMale: 'Lalaki',
  genderFemale: 'Babae',
  genderOther: 'Iba pa',
  skinTone: 'Kulay ng balat',
  hairStyle: 'Istilo ng buhok',
  hairShort: 'Maikli',
  hairMedium: 'Katamtaman',
  hairLong: 'Mahaba',
  hairCurly: 'Kulot',
  hairWavy: 'Alon-alon',
  hairBald: 'Kalbo',
  ageRange: 'Edad',
  eyeColor: 'Kulay ng mata',
  eyeBrown: 'Kayumanggi',
  eyeBlue: 'Asul',
  eyeGreen: 'Berde',
  eyeHazel: 'Kulay-pulot',
  eyeBlack: 'Itim',
  eyeGray: 'Kulay-abo',
  faceShape: 'Hugis ng mukha',
  faceOval: 'Hugis-itlog',
  faceRound: 'Bilog',
  faceAngular: 'Matatalas ang anggulo',
  faceLong: 'Pahaba',
  faceSquare: 'Parisukat',
  facialHair: 'Balbas / Bigote',
  hairNone: 'Walang balbas',
  hairStubble: 'Maikling balbas',
  hairFullBeard: 'Balbas-sarado',
  hairMustache: 'Bigote',
  hairGoatee: 'Balbas-kambing',
  accessories: 'Mga accessory',
  accNone: 'Wala',
  accGlasses: 'Salamin sa mata',
  accSunglasses: 'Shades',
  accEarrings: 'Hikaw',
  accCap: 'Cap',
  accHeadscarf: 'Panyo sa ulo',
  accPiercing: 'Piercing',
  expression: 'Ekspresyon',
  expSmile: 'Nakangiti',
  expSerious: 'Seryoso',
  expRelaxed: 'Relaks',
  expConfident: 'Kumpiyansa',
  expMysterious: 'Misteryoso',
  currentAvatar: 'Ang kasalukuyang AI avatar mo',
  swapTitle: 'Pagpapalit ng tao',
  swapSubtitle: 'Kumuha o mag-upload ng larawan, at ilalagay ng Weë AI ang avatar mo kapalit ng tao sa larawan',
  takePhoto: 'Kumuha ng larawan',
  gallery: 'Pumili mula sa gallery',
  useAsProfilePhoto: 'Gamitin bilang profile picture',
  uploadAnotherPhoto: 'Mag-upload ng ibang larawan bilang avatar',
  intro: 'Gumawa ng avatar gamit ang AI, o mag-upload ng larawan na gagawin mong avatar sa Weë profile mo.',
  uploadPhotoAsAvatar: 'Mag-upload ng larawan bilang avatar',
  nextStep: 'Susunod',
  previousStep: 'Nakaraang hakbang',
  generatedWithAi: 'Avatar na ginawa gamit ang Weë AI',
  nowTakeAPhoto: 'Ngayon, kumuha o mag-upload ng sarili mong larawan para mapalitan ka ng avatar mo',
  skipAndUse: 'Laktawan at gamitin agad ang avatar',
  regenerate: 'I-generate ulit ang avatar',
  swapResult: 'Resulta ng pagpapalit',
  anotherPhoto: 'Ibang larawan',
  newAvatar: 'Bagong avatar',
  humanAvatar: 'AI avatar na mukhang tao',
  notEnoughTitle: 'Kulang ang Credits mo',
  notEnoughWeb: 'Kulang ang Credits mo\n{{detalle}}\n\nGusto mo bang kumuha ng Credits?',
  creditsDetail: 'Available na Credits: {{saldo}}\nHalaga: {{coste}}',
  notNow: 'Hindi muna',
  getCredits: 'Kumuha ng Credits',
  signInFirst: 'Kailangan mong mag-sign in para makagawa ng avatar.',
  limitTitle: 'Naabot na ang limitasyon',
  limitBody: 'Naabot mo na ang limitasyon sa pag-generate ng avatar gamit ang AI: {{contador}}. Puwede kang mag-upload na lang ng larawan bilang avatar.',
  understood: 'OK',
  permissionTitle: 'Kailangan ng pahintulot',
  galleryPermission: 'Kailangan namin ng access sa gallery mo.',
  cameraPermission: 'Kailangan namin ng access sa camera mo.',
  uploadFailed: 'Hindi ma-upload ang larawan. Subukan ulit.',
  saveAvatarFailed: 'Hindi ma-save ang avatar.',
  saveFailed: 'Hindi ma-save. Subukan ulit.',
  doneTitle: 'Tapos na',
  photoUpdated: 'Na-update na ang profile picture mo.',
  photoUpdateFailed: 'Hindi ma-update ang profile picture.',
  creatingAvatar: 'Ginagawa ng Weë ang avatar mo…',
  creatingAnother: 'Gumagawa ang Weë ng isa pang bersyon ng avatar mo…',
  uploadingPhoto: 'Ina-upload ang larawan…',
  savingAvatar: 'Sine-save ang avatar…',
  savingResult: 'Sine-save ang resulta…',
  savingProfilePhoto: 'Sine-save ang profile picture…',
  updatingProfilePhoto: 'Ina-update ang profile picture…',
  swapping: 'Inilalagay ng Weë ang avatar mo sa larawan…\n(puwede itong tumagal nang 30 hanggang 60 segundo)',
  generateFailed: 'Hindi ma-generate ang avatar. Subukan ulit.',
  regenerateFailed: 'Hindi makagawa ng bagong avatar. Subukan ulit.',
  replaceFailed: 'Hindi mailagay ang avatar sa larawan. Subukan ulit.',
  stepBase: 'Pangunahin',
  stepDetails: 'Mga detalye',
  limitReachedCount: 'Naabot na ang limitasyon ({{usadas}}/{{maximo}})',
  regenerateWithAi: 'I-generate ulit ang avatar gamit ang AI',
  allGenerationsUsed_one: 'Naubos mo na ang {{contador}} pag-generate mo gamit ang AI.',
  allGenerationsUsed_other: 'Naubos mo na ang {{contador}} na pag-generate mo gamit ang AI.',
  generationsCount: 'Pag-generate gamit ang AI: {{usadas}}/{{maximo}}',
  generateForCredits: 'Gumawa ng avatar gamit ang {{credits}} Credits',
  generateButton: 'Gumawa ng avatar · {{credits}} Credits',
};
