/*
 * SUECO — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres
 * en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El Perfil Weë es «Weë-profil» (glosario § 9.1), también en el título y en el
 * botón de crearlo, que comparten `weeTitle`: «Skapa Weë-profil». La marca no se
 * declina: lo que cambia es «profil» («Weë-profilen»). Los avisos de lo que falta
 * dicen qué falta, como un formulario sueco («Namn saknas», «Land saknas»), y el
 * cuerpo, qué hacer. El género es «Kön», con «Man», «Kvinna» y «Annat», como en
 * los formularios suecos. Lo opcional es «valfritt» y la biografía,
 * «Presentation», igual que en el perfil.
 *
 * «Desde el header» es «högst upp på skärmen»: se dice dónde mirar, no el nombre
 * técnico de la pieza. El ejemplo del nombre anónimo se adapta («MörkSkugga») y
 * se une con «eller», con la abreviatura sueca «T.ex.». En el contador, el guion
 * del español es la raya sueca (–) con espacios. `stepOf` es «Steg 1 av 2».
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Välkommen till Weë',
  welcomeSubtitle: 'Berätta vem du är. Sedan kan du skapa din Weë-profil: din identitet när du skapar med AI.',
  yourName: 'Ditt namn',
  yourNameHint: 'Namnet visas på din offentliga profil.',
  yourNamePlaceholder: 'För- och efternamn',
  birthDate: 'Födelsedatum',
  birthDateHint: 'Du måste vara minst 13 år för att använda Weë.',
  gender: 'Kön',
  genderMale: 'Man',
  genderFemale: 'Kvinna',
  genderOther: 'Annat',
  country: 'Land',
  pickCountry: 'Välj land',
  searchCountry: 'Sök land…',
  customiseProfile: 'Anpassa din profil',
  yourAvatar: 'Din avatar',
  yourAvatarHint: 'Tryck för att välja en färdig avatar eller ladda upp en egen bild',
  bioPlaceholder: 'Berätta något om dig själv… (valfritt)',
  saving: 'Sparar…',
  completed: 'Klart!',
  complete: 'Slutför',
  continueStep: 'Fortsätt',
  nameMissingTitle: 'Namn saknas',
  nameMissing: 'Ange ditt namn för att fortsätta.',
  nameShortTitle: 'För kort namn',
  nameShort: 'Namnet måste ha minst 2 bokstäver.',
  birthMissingTitle: 'Födelsedatum saknas',
  birthMissing: 'Välj dag, månad och år.',
  genderMissingTitle: 'Kön saknas',
  genderMissing: 'Välj ett alternativ för att fortsätta.',
  countryMissingTitle: 'Land saknas',
  countryMissing: 'Välj land för att fortsätta.',
  saveFailedTitle: 'Det gick inte att spara profilen',
  saveFailed: 'Försök igen.',
  weeTitle: 'Skapa Weë-profil',
  weeIntro: 'Din Weë-profil är fristående från din riktiga identitet. Det du publicerar och gör med den kopplas inte till din huvudprofil.',
  weePhoto: 'Profilbild',
  weePhotoHint: 'Tryck för att välja ett foto eller en färdig avatar',
  weeName: 'Anonymt namn',
  weeNamePlaceholder: 'T.ex. MörkSkugga eller Anon123…',
  weeBioPlaceholder: 'Beskriv ditt alter ego…',
  weeCreatedTitle: 'Weë-profilen har skapats',
  weeCreated: 'Din anonyma identitet är klar. Du kan växla mellan profilerna högst upp på skärmen.',
  weeCreateFailed: 'Det gick inte att skapa Weë-profilen',
  birthDay: 'Dag',
  birthMonth: 'Månad',
  birthYear: 'År',
  stepOf: 'Steg {{paso}} av {{total}}',
  customiseProfileHint: 'Välj en avatar och lägg till en beskrivning (valfritt)',
  bioLabel: 'Beskrivning (valfritt)',
  weeNameCounter: '{{usados}}/{{maximo}} – minst {{minimo}} tecken',
  weeBio: 'Presentation (valfritt)',
};
