/*
 * ITALIANO — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu) y apóstrofo tipográfico ’ (U+2019) siempre. El
 * nombre, la biografía y el país que elige la persona no entran aquí. El aviso
 * legal del alta tampoco: vive en `auth` (termsIntro + termsOfService +
 * termsAnd + settings.privacyPolicy) y se lee «Creando un account, accetti i
 * nostri Termini di servizio e la nostra Informativa sulla privacy.».
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Benvenuto su Weë',
  welcomeSubtitle: 'Raccontaci chi sei. Poi potrai creare il tuo Profilo Weë: la tua identità per creare con l’IA.',
  yourName: 'Il tuo nome',
  yourNameHint: 'Questo nome apparirà sul tuo profilo pubblico.',
  yourNamePlaceholder: 'Il tuo nome completo',
  birthDate: 'Data di nascita',
  birthDateHint: 'Devi avere almeno 13 anni per usare Weë.',
  gender: 'Genere',
  genderMale: 'Uomo',
  genderFemale: 'Donna',
  genderOther: 'Altro',
  country: 'Paese',
  pickCountry: 'Seleziona il tuo Paese',
  searchCountry: 'Cerca un Paese...',
  customiseProfile: 'Personalizza il tuo profilo',
  yourAvatar: 'Il tuo avatar',
  yourAvatarHint: 'Tocca per scegliere un avatar predefinito o caricare una tua immagine',
  bioPlaceholder: 'Raccontaci qualcosa di te... (facoltativo)',
  saving: 'Salvataggio...',
  completed: 'Completato!',
  complete: 'Completa',
  continueStep: 'Continua',
  nameMissingTitle: 'Manca il tuo nome',
  nameMissing: 'Scrivi il tuo nome per continuare.',
  nameShortTitle: 'Nome troppo corto',
  nameShort: 'Il tuo nome deve avere almeno 2 lettere.',
  birthMissingTitle: 'Manca la tua data di nascita',
  birthMissing: 'Scegli giorno, mese e anno.',
  genderMissingTitle: 'Manca il tuo genere',
  genderMissing: 'Scegli un’opzione per continuare.',
  countryMissingTitle: 'Manca il tuo Paese',
  countryMissing: 'Scegli il tuo Paese per continuare.',
  saveFailedTitle: 'Non siamo riusciti a salvare il tuo profilo',
  saveFailed: 'Riprova.',
  weeTitle: 'Crea il Profilo Weë',
  weeIntro: 'Questo profilo è indipendente dalla tua identità reale. I post e le azioni che fai con Weë non saranno collegati al tuo profilo principale.',
  weePhoto: 'Foto del profilo',
  weePhotoHint: 'Tocca per scegliere una foto o un avatar predefinito',
  weeName: 'Nome anonimo',
  weeNamePlaceholder: 'Es.: OmbraOscura, Anon123...',
  weeBioPlaceholder: 'Descrivi il tuo alter ego...',
  weeCreatedTitle: 'Profilo Weë creato',
  weeCreated: 'La tua identità anonima è pronta. Puoi passare da un profilo all’altro dall’header.',
  weeCreateFailed: 'Non è stato possibile creare il Profilo Weë',
};
