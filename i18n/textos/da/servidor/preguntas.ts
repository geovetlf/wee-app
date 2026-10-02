/*
 * DANÉS — Preguntas del flujo guiado de Weë AI (43): lo que Weë le pregunta a la persona, en su burbuja.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. La app solo las pinta en danés si el
 * servidor sigue diciendo exactamente la frase española (`i18n/servidor.ts`).
 *
 * Habla Weë, de tú a tú: «du», frases cortas y el signo de interrogación al final (la de Design que en español es una
 * invitación y no una pregunta tampoco lo lleva aquí). «Qué quieres crear» es «Hvad vil du lave?», como
 * `weeai.whatToCreate`; «¿En qué te ayudo?», «Hvad kan jeg hjælpe dig med?»; «¿Qué ánimo?», «Hvilken stemning?»;
 * «¿A qué ritmo?», «I hvilket tempo?». Donde el español deja la pregunta corta y el danés quedaría ambiguo se dice
 * entera: «¿A qué idioma?» es «Hvilket sprog skal det oversættes til?», «¿Qué tan formal?» es «Hvor formel skal
 * tonen være?», y el nombre que se pregunta en Design es el del logo (solo se pregunta al hacer uno): «… skal stå i
 * logoet?».
 *
 * Las preguntas se escriben pensando en sus botones (`opciones`): «¿Qué quieres que transmita tu marca?» es «Hvordan
 * skal dit brand opleves?», que se contesta con los adjetivos neutros de las opciones («Seriøst og troværdigt»); «¿Es
 * un espacio interior o exterior?» es «Skal vi se det udefra eller indefra?», en el orden de sus botones («Udefra»,
 * «Indefra», «Et bredt udsyn»); «¿Qué espacio?» de Weë Home es «Hvilket rum?» (glosario: el espacio de Home es
 * «rum»). El pronombre concuerda con lo que se publica: «Hvor skal det slås op?» (algo de Design, «det») y «Hvor vil
 * du slå den op?» (el vídeo de Studio, «en video»). «Publicar» es «slå op» (glosario § 9.1). «Personaje» es
 * «karakter» y «marca», «brand» (et brand: «dit brand»), como en `catalogo`.
 */
export const preguntas: typeof import('../../es/servidor/preguntas').preguntas = {
  designWhat: 'Fortæl mig, hvad du har brug for, så foreslår jeg, hvor vi kan starte',
  designName: 'Hvilket navn eller hvilken tekst skal stå i logoet?',
  designFeel: 'Hvordan skal dit brand opleves?',
  designMessage: 'Hvad vil du annoncere eller fortælle om?',
  designWhere: 'Hvor skal det slås op?',
  designItem: 'Hvilket produkt vil du designe?',
  designLook: 'Hvordan forestiller du dig det?',
  designMachine: 'Hvilket køretøj eller hvilken maskine tænker du på?',
  designEra: 'Fra hvilken periode?',
  designPlace: 'Hvilket sted eller miljø vil du skabe?',
  designInout: 'Skal vi se det udefra eller indefra?',
  designWho: 'Hvem eller hvad skal din karakter være?',
  designDraw: 'Hvilken visuel stil vil du have?',
  studioType: 'Hvilken slags video?',
  studioStyle: 'Hvilken stil vil du have?',
  studioWhere: 'Hvor vil du slå den op?',
  photoAction: 'Hvad skal vi gøre med dit foto?',
  photoDetail: 'Hvordan vil du have det?',
  writerWhat: 'Hvad skal vi skrive?',
  writerTone: 'Hvilken tone?',
  writerLanguage: 'Hvilket sprog skal det oversættes til?',
  musicWhat: 'Hvad vil du lave?',
  musicStyle: 'Hvilken stil?',
  musicMood: 'Hvilken stemning?',
  musicVoice: 'Hvilken stemme?',
  beautyWhat: 'Hvad vil du prøve?',
  beautyOccasion: 'Til hvilken lejlighed?',
  chefWhat: 'Hvad vil du lave?',
  chefChange: 'Hvad vil du ændre på fotoet?',
  chefPeople: 'Til hvor mange personer?',
  chefTime: 'Hvor lang tid har du?',
  chefDays: 'Til hvor mange dage?',
  homeWhat: 'Hvad vil du gøre?',
  homeSpace: 'Hvilket rum?',
  homeStyle: 'Hvilken stil?',
  businessWhat: 'Hvad kan jeg hjælpe dig med?',
  businessTone: 'Hvor formel skal tonen være?',
  travelWhat: 'Hvad har du brug for?',
  travelVibe: 'Hvad søger du på rejsen?',
  travelDates: 'Hvornår rejser du?',
  travelInterest: 'Hvad har du mest lyst til?',
  travelPace: 'I hvilket tempo?',
  brainWhat: 'Hvad kan jeg hjælpe dig med?',
};
