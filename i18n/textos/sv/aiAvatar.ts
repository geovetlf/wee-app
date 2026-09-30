/*
 * SUECO — el avatar humano con IA: el asistente de nueve preguntas y el reemplazo
 * de persona en una foto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los identificadores de cada opción —'male', 'tone3', 'goatee'…— no están aquí:
 * viajan al servidor y ya están guardados en los perfiles de la gente.
 *
 * «IA» es AI, en mayúsculas, y con un sustantivo va con guion (AI-avatar,
 * AI-genereringar), como pide Isof para las abreviaturas. «Generar» es generera;
 * en el botón principal, skapa. El cupo de generaciones es «AI-genereringar», y
 * en sueco el sustantivo cambia con la cifra: _one «din 1 AI-generering», _other
 * «alla 2 AI-genereringar». El Perfil Weë es «Weë-profil», con guion.
 *
 * Las opciones concuerdan con el título de su grupo: el pelo con «frisyr» (Kort,
 * Halvlång, Lockig…), la cara con «ansiktsform» (Oval, Rund, Kantig…). La
 * barba usa las palabras de la barbería sueca: skäggstubb, helskägg, pipskägg
 * (el candado). «Oval» se escribe igual que en inglés porque así se dice en
 * sueco.
 *
 * «Credits» nunca se traduce ni se declina, y en el detalle del saldo va detrás
 * de cada cifra, como se lee un saldo en sueco: «Ditt saldo: 12 Credits» /
 * «Kostnad: 30 Credits». «Listo», como título de un aviso, es «Klart» (hecho,
 * glosario § 8), no el botón «Klar». Los avisos de permiso tienen a Weë como
 * sujeto y no dicen «vi»; la misma frase española en composer debe decir lo
 * mismo. «Foto de perfil» es profilbild, como en Instagram.
 */
export const aiAvatar: typeof import('../es/aiAvatar').aiAvatar = {
  gender: 'Kön',
  genderMale: 'Man',
  genderFemale: 'Kvinna',
  genderOther: 'Annat',
  skinTone: 'Hudton',
  hairStyle: 'Frisyr',
  hairShort: 'Kort',
  hairMedium: 'Halvlång',
  hairLong: 'Lång',
  hairCurly: 'Lockig',
  hairWavy: 'Vågig',
  hairBald: 'Skallig',
  ageRange: 'Åldersgrupp',
  eyeColor: 'Ögonfärg',
  eyeBrown: 'Brun',
  eyeBlue: 'Blå',
  eyeGreen: 'Grön',
  eyeHazel: 'Nötbrun',
  eyeBlack: 'Svart',
  eyeGray: 'Grå',
  faceShape: 'Ansiktsform',
  faceOval: 'Oval',
  faceRound: 'Rund',
  faceAngular: 'Kantig',
  faceLong: 'Avlång',
  faceSquare: 'Fyrkantig',
  facialHair: 'Skägg / mustasch',
  hairNone: 'Inget skägg',
  hairStubble: 'Skäggstubb',
  hairFullBeard: 'Helskägg',
  hairMustache: 'Mustasch',
  hairGoatee: 'Pipskägg',
  accessories: 'Accessoarer',
  accNone: 'Inga',
  accGlasses: 'Glasögon',
  accSunglasses: 'Solglasögon',
  accEarrings: 'Örhängen',
  accCap: 'Keps',
  accHeadscarf: 'Huvudduk',
  accPiercing: 'Piercingar',
  expression: 'Ansiktsuttryck',
  expSmile: 'Leende',
  expSerious: 'Allvarlig',
  expRelaxed: 'Avslappnad',
  expConfident: 'Självsäker',
  expMysterious: 'Mystisk',
  currentAvatar: 'Din nuvarande AI-avatar',
  swapTitle: 'Personbyte',
  swapSubtitle: 'Ta eller ladda upp ett foto, så byter Gemini AI ut personen mot din avatar',
  takePhoto: 'Ta foto',
  gallery: 'Galleri',
  useAsProfilePhoto: 'Använd som profilbild',
  uploadAnotherPhoto: 'Ladda upp ett annat foto som avatar',
  intro: 'Skapa en AI-genererad avatar eller ladda upp ett foto att använda som avatar på din Weë-profil.',
  uploadPhotoAsAvatar: 'Ladda upp foto som avatar',
  nextStep: 'Nästa',
  previousStep: 'Föregående steg',
  generatedWithGemini: 'Avatar genererad med Gemini AI',
  nowTakeAPhoto: 'Ta eller ladda upp ett foto på dig själv nu, så byts du ut mot din avatar',
  skipAndUse: 'Hoppa över och använd avataren direkt',
  regenerate: 'Generera ny avatar',
  swapResult: 'Resultatet',
  anotherPhoto: 'Annat foto',
  newAvatar: 'Ny avatar',
  humanAvatar: 'Mänsklig AI-avatar',
  notEnoughTitle: 'Du har inte tillräckligt med Credits',
  notEnoughWeb: 'Du har inte tillräckligt med Credits\n{{detalle}}\n\nVill du skaffa Credits?',
  creditsDetail: 'Ditt saldo: {{saldo}} Credits\nKostnad: {{coste}} Credits',
  notNow: 'Inte nu',
  getCredits: 'Skaffa Credits',
  signInFirst: 'Logga in om du vill skapa en avatar.',
  limitTitle: 'Gränsen är nådd',
  limitBody: 'Du har nått gränsen på {{contador}} AI-genererade avatarer. Du kan ladda upp ett foto som avatar i stället.',
  understood: 'Jag förstår',
  permissionTitle: 'Behörighet krävs',
  galleryPermission: 'Weë behöver åtkomst till galleriet.',
  cameraPermission: 'Weë behöver åtkomst till kameran.',
  uploadFailed: 'Det gick inte att ladda upp fotot. Försök igen.',
  saveAvatarFailed: 'Det gick inte att spara avataren.',
  saveFailed: 'Det gick inte att spara. Försök igen.',
  doneTitle: 'Klart',
  photoUpdated: 'Profilbilden har uppdaterats.',
  photoUpdateFailed: 'Det gick inte att uppdatera profilbilden.',
  creatingAvatar: 'Weë skapar din avatar…',
  creatingAnother: 'Weë skapar en ny version av din avatar…',
  uploadingPhoto: 'Laddar upp fotot…',
  savingAvatar: 'Sparar avataren…',
  savingResult: 'Sparar resultatet…',
  savingProfilePhoto: 'Sparar profilbilden…',
  updatingProfilePhoto: 'Uppdaterar profilbilden…',
  swapping: 'Weë sätter in din avatar i fotot…\n(det kan ta 30–60 sekunder)',
  generateFailed: 'Det gick inte att generera avataren. Försök igen.',
  regenerateFailed: 'Det gick inte att generera en ny avatar. Försök igen.',
  replaceFailed: 'Det gick inte att sätta in avataren i fotot. Försök igen.',
  stepBase: 'Grunder',
  stepDetails: 'Detaljer',
  limitReachedCount: 'Gränsen är nådd ({{usadas}}/{{maximo}})',
  regenerateWithAi: 'Generera ny avatar med AI',
  allGenerationsUsed_one: 'Du har använt din {{contador}} AI-generering.',
  allGenerationsUsed_other: 'Du har använt alla {{contador}} AI-genereringar.',
  generationsCount: 'AI-genereringar: {{usadas}}/{{maximo}}',
  generateForCredits: 'Skapa avatar för {{credits}} Credits',
  generateButton: 'Skapa avatar · {{credits}} Credits',
};
