/*
 * DANÉS — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres
 * en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El Perfil Weë es «Weë-profil» (glosario § 9.1), también en el título y en el
 * botón de crearlo, que comparten `weeTitle`: «Opret Weë-profil». La marca no se
 * declina: lo que cambia es «profil» («Weë-profilen»). El «perfil principal» y la
 * «identidad real» del español son la Ægte profil del glosario: «din ægte
 * profil», «din ægte identitet». Los avisos de lo que falta dicen qué falta, como
 * un formulario danés («Navn mangler», «Land mangler»), y el cuerpo, qué hacer.
 * El género es «Køn», con «Mand», «Kvinde» y «Andet». Lo opcional es «valgfrit»
 * y la biografía, «Bio», igual que en el perfil. El botón del último paso es
 * «Fuldfør» (el «Finish» de los asistentes en danés) y el estado de después,
 * «Færdig!».
 *
 * «Desde el header» es «øverst på skærmen»: se dice dónde mirar, no el nombre
 * técnico de la pieza. El ejemplo del nombre anónimo se adapta («MørkSkygge») y
 * va con «Fx» (guía § 5). En el contador, el guion del español es la raya media
 * (–) con espacios. `stepOf` es «Trin 1 af 2».
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Velkommen til Weë',
  welcomeSubtitle: 'Fortæl os, hvem du er. Bagefter kan du oprette din Weë-profil: din identitet, når du skaber med AI.',
  yourName: 'Dit navn',
  yourNameHint: 'Navnet vises på din offentlige profil.',
  yourNamePlaceholder: 'Dit fulde navn',
  birthDate: 'Fødselsdato',
  birthDateHint: 'Du skal være fyldt 13 år for at bruge Weë.',
  gender: 'Køn',
  genderMale: 'Mand',
  genderFemale: 'Kvinde',
  genderOther: 'Andet',
  country: 'Land',
  pickCountry: 'Vælg dit land',
  searchCountry: 'Søg efter land…',
  customiseProfile: 'Tilpas din profil',
  yourAvatar: 'Din avatar',
  yourAvatarHint: 'Tryk for at vælge en færdig avatar eller uploade dit eget billede',
  bioPlaceholder: 'Fortæl lidt om dig selv… (valgfrit)',
  saving: 'Gemmer…',
  completed: 'Færdig!',
  complete: 'Fuldfør',
  continueStep: 'Fortsæt',
  nameMissingTitle: 'Navn mangler',
  nameMissing: 'Skriv dit navn for at fortsætte.',
  nameShortTitle: 'Navnet er for kort',
  nameShort: 'Dit navn skal have mindst 2 bogstaver.',
  birthMissingTitle: 'Fødselsdato mangler',
  birthMissing: 'Vælg dag, måned og år.',
  genderMissingTitle: 'Køn mangler',
  genderMissing: 'Vælg en mulighed for at fortsætte.',
  countryMissingTitle: 'Land mangler',
  countryMissing: 'Vælg dit land for at fortsætte.',
  saveFailedTitle: 'Vi kunne ikke gemme din profil',
  saveFailed: 'Prøv igen.',
  weeTitle: 'Opret Weë-profil',
  weeIntro: 'Din Weë-profil er adskilt fra din ægte identitet. Det, du slår op og gør med den, bliver ikke knyttet til din ægte profil.',
  weePhoto: 'Profilbillede',
  weePhotoHint: 'Tryk for at vælge et billede eller en færdig avatar',
  weeName: 'Anonymt navn',
  weeNamePlaceholder: 'Fx MørkSkygge eller Anon123…',
  weeBioPlaceholder: 'Beskriv dit alter ego…',
  weeCreatedTitle: 'Weë-profilen er oprettet',
  weeCreated: 'Din anonyme identitet er klar. Du kan skifte mellem profilerne øverst på skærmen.',
  weeCreateFailed: 'Weë-profilen kunne ikke oprettes. Prøv igen.',
  birthDay: 'Dag',
  birthMonth: 'Måned',
  birthYear: 'År',
  stepOf: 'Trin {{paso}} af {{total}}',
  customiseProfileHint: 'Vælg en avatar, og tilføj en beskrivelse (valgfrit)',
  bioLabel: 'Beskrivelse (valgfrit)',
  weeNameCounter: '{{usados}}/{{maximo}} – mindst {{minimo}} tegn',
  weeBio: 'Bio (valgfrit)',
};
