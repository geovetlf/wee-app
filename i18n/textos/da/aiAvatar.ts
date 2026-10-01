/*
 * DANÉS — el avatar humano con IA: el asistente de nueve preguntas y el reemplazo
 * de persona en una foto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los identificadores de cada opción —'male', 'tone3', 'goatee'…— no están aquí:
 * viajan al servidor y ya están guardados en los perfiles de la gente.
 *
 * «IA» es AI y va con guion en el compuesto (AI-avatar, AI-generering, pl.
 * AI-genereringer), como pide la guía § 3; «Avatar Humano IA» es «Menneskelig
 * AI-avatar», igual que en avatar.ts. «Generar» es Generér, con acento
 * (glosario 9.1); en el botón principal que cobra, «Lav avatar» (la llamada
 * principal, glosario 9.1). El Perfil Weë es «Weë-profil».
 *
 * Las opciones concuerdan con el título de su grupo: el pelo con «frisure»
 * (Kort, Halvlang, Krøllet…), la cara con «ansigtsform» (Oval, Rund, Kantet…),
 * los gestos como adjetivos (Smilende, Seriøs…). La barba usa las palabras de la
 * barbería danesa: skægstubbe, fuldskæg, overskæg y fipskæg (el candado). «Sin
 * barba» y «Ninguno» son neutros porque lo son skæg y tilbehør: «Intet skæg»,
 * «Intet». «Oval» y «Piercing» se escriben igual que en español o en inglés
 * porque así se dice en danés.
 *
 * «Credits» no se traduce ni se declina, y en el detalle del saldo va detrás de
 * cada cifra con espacio fijo: «Din saldo: 12 Credits» / «Pris: 30 Credits»
 * (coste = pris, glosario § 9.6). «Listo», como título de un aviso, es Færdig;
 * «Entendido» es Forstået. Los permisos los pide Weë con «vi», como en
 * avatar.ts («Vi skal have adgang til dit galleri»). «Foto de perfil» es
 * profilbillede; «foto» es neutro («fotoet»). «Gemini AI» se queda como en el
 * español: es el nombre del proveedor que el español ya enseña.
 */
export const aiAvatar: typeof import('../es/aiAvatar').aiAvatar = {
  gender: 'Køn',
  genderMale: 'Mand',
  genderFemale: 'Kvinde',
  genderOther: 'Andet',
  skinTone: 'Hudtone',
  hairStyle: 'Frisure',
  hairShort: 'Kort',
  hairMedium: 'Halvlang',
  hairLong: 'Lang',
  hairCurly: 'Krøllet',
  hairWavy: 'Bølget',
  hairBald: 'Skaldet',
  ageRange: 'Aldersgruppe',
  eyeColor: 'Øjenfarve',
  eyeBrown: 'Brun',
  eyeBlue: 'Blå',
  eyeGreen: 'Grøn',
  eyeHazel: 'Nøddebrun',
  eyeBlack: 'Sort',
  eyeGray: 'Grå',
  faceShape: 'Ansigtsform',
  faceOval: 'Oval',
  faceRound: 'Rund',
  faceAngular: 'Kantet',
  faceLong: 'Aflang',
  faceSquare: 'Firkantet',
  facialHair: 'Skæg / overskæg',
  hairNone: 'Intet skæg',
  hairStubble: 'Skægstubbe',
  hairFullBeard: 'Fuldskæg',
  hairMustache: 'Overskæg',
  hairGoatee: 'Fipskæg',
  accessories: 'Tilbehør',
  accNone: 'Intet',
  accGlasses: 'Briller',
  accSunglasses: 'Solbriller',
  accEarrings: 'Øreringe',
  accCap: 'Kasket',
  accHeadscarf: 'Tørklæde',
  accPiercing: 'Piercing',
  expression: 'Ansigtsudtryk',
  expSmile: 'Smilende',
  expSerious: 'Seriøs',
  expRelaxed: 'Afslappet',
  expConfident: 'Selvsikker',
  expMysterious: 'Mystisk',
  currentAvatar: 'Din nuværende AI-avatar',
  swapTitle: 'Udskift person',
  swapSubtitle: 'Tag eller upload et foto, så udskifter Gemini AI personen på fotoet med din avatar',
  takePhoto: 'Tag et foto',
  gallery: 'Galleri',
  useAsProfilePhoto: 'Brug som profilbillede',
  uploadAnotherPhoto: 'Upload et andet foto som avatar',
  intro: 'Lav en AI-genereret avatar, eller upload et foto, som du kan bruge som avatar på din Weë-profil.',
  uploadPhotoAsAvatar: 'Upload foto som avatar',
  nextStep: 'Næste',
  previousStep: 'Forrige trin',
  generatedWithGemini: 'Avatar genereret med Gemini AI',
  nowTakeAPhoto: 'Tag eller upload nu et foto af dig selv, så sætter vi din avatar ind i stedet for dig',
  skipAndUse: 'Spring over, og brug avataren direkte',
  regenerate: 'Generér ny avatar',
  swapResult: 'Resultat af udskiftningen',
  anotherPhoto: 'Andet foto',
  newAvatar: 'Ny avatar',
  humanAvatar: 'Menneskelig AI-avatar',
  notEnoughTitle: 'Du har ikke nok Credits',
  notEnoughWeb: 'Du har ikke nok Credits\n{{detalle}}\n\nVil du have flere Credits?',
  creditsDetail: 'Din saldo: {{saldo}} Credits\nPris: {{coste}} Credits',
  notNow: 'Ikke nu',
  getCredits: 'Få Credits',
  signInFirst: 'Log ind for at generere en avatar.',
  limitTitle: 'Grænsen er nået',
  limitBody: 'Du har nået grænsen på {{contador}} AI-genererede avatarer. Du kan uploade et foto som avatar i stedet.',
  understood: 'Forstået',
  permissionTitle: 'Tilladelse påkrævet',
  galleryPermission: 'Vi skal have adgang til dit galleri.',
  cameraPermission: 'Vi skal have adgang til dit kamera.',
  uploadFailed: 'Fotoet kunne ikke uploades. Prøv igen.',
  saveAvatarFailed: 'Avataren kunne ikke gemmes. Prøv igen.',
  saveFailed: 'Det kunne ikke gemmes. Prøv igen.',
  doneTitle: 'Færdig',
  photoUpdated: 'Dit profilbillede er opdateret.',
  photoUpdateFailed: 'Profilbilledet kunne ikke opdateres. Prøv igen.',
  creatingAvatar: 'Weë laver din avatar…',
  creatingAnother: 'Weë laver en ny version af din avatar…',
  uploadingPhoto: 'Uploader foto…',
  savingAvatar: 'Gemmer avatar…',
  savingResult: 'Gemmer resultat…',
  savingProfilePhoto: 'Gemmer profilbillede…',
  updatingProfilePhoto: 'Opdaterer profilbillede…',
  swapping: 'Weë sætter din avatar ind i fotoet…\n(det kan tage mellem 30 og 60 sekunder)',
  generateFailed: 'Avataren kunne ikke genereres. Prøv igen.',
  regenerateFailed: 'Der kunne ikke genereres en ny avatar. Prøv igen.',
  replaceFailed: 'Avataren kunne ikke sættes ind i fotoet. Prøv igen.',
  stepBase: 'Basis',
  stepDetails: 'Detaljer',
  limitReachedCount: 'Grænsen er nået ({{usadas}}/{{maximo}})',
  regenerateWithAi: 'Generér ny avatar med AI',
  allGenerationsUsed_one: 'Du har brugt din {{contador}} AI-generering.',
  allGenerationsUsed_other: 'Du har brugt alle dine {{contador}} AI-genereringer.',
  generationsCount: 'AI-genereringer: {{usadas}}/{{maximo}}',
  generateForCredits: 'Lav avatar for {{credits}} Credits',
  generateButton: 'Lav avatar · {{credits}} Credits',
};
