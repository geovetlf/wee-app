/*
 * SUECO — lo que describe cada experiencia de WEË AI y los ejemplos que se tocan
 * para empezar. Los nombres —Weë Design, Weë Studio…— son marca y viven en
 * constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las descripciones son listas cortas, sin «tus» cuando no hace falta: al lector
 * sueco le sobra tanto «din/dina». Los ejemplos hablan con la voz de la persona,
 * como se escribiría en sueco: «Jag vet inte vad jag ska laga i dag», «Rätta min
 * text». Se adapta lo que el calco no serviría: el logo es «logga», el email un
 * «mejl», el CV «cv» (en minúscula, como SAOL), el patio es la «uteplats» y «un
 * look para una fiesta» es «En festlook». Un Weël es «en Weël».
 *
 * Las áreas se traducen porque se leen; la marca de delante no: «Weë Studio ·
 * Foton», «Weë Studio · Skönhet» (el «Beauty» del español es el nombre del área,
 * no la marca Weë Beauty) y «Weë Design · Hem och inredning», con «och» en lugar
 * de «&» (guía § 5): «Hem och inredning» es como se llama en sueco esa sección de
 * cualquier tienda o revista. `tellTheSpecialist` nombra al experto con «för»
 * («Berätta för {{especialista}}…»), así la marca no se declina. Las comillas del
 * ejemplo son las suecas, ”…”, el mismo carácter a los dos lados.
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'Loggor, affischer, illustrationer och material för sociala medier',
  studio: 'Skapa och förvandla foton och videor med AI.',
  photo: 'Förbättra, restaurera och förvandla foton',
  writer: 'Inlägg, berättelser, manus, mejl och böcker',
  music: 'Låtar, instrumentalmusik, röster och inläsningar',
  beauty: 'Smink, hår, skägg, outfits och nya looks',
  chef: 'Din personliga kock: vad du ska laga, recept och menyer',
  home: 'Heminredning, interiördesign, renovering och trädgårdar',
  business: 'Affärsidéer, marknadsföring, cv, dokument och presentationer',
  travel: 'Planera resan: vart du ska åka, vad du kan göra och hur du tar dig runt',
  brain: 'Vet du inte var du ska leta? Fråga Weë',
  designEx1: 'En logga för mitt företag',
  designEx2: 'Ett inlägg till Instagram',
  designEx3: 'Omslaget till min bok',
  studioEx1: 'En reklamvideo för min restaurang',
  studioEx2: 'Gör om mitt foto till en video',
  studioEx3: 'En Weël med min produkt',
  photoEx1: 'Förbättra kvaliteten på ett foto',
  photoEx2: 'Ta bort något som stör på fotot',
  photoEx3: 'Byt bakgrund på mitt foto',
  writerEx1: 'Ett manus till min video',
  writerEx2: 'Ett mejl till en kund',
  writerEx3: 'Rätta min text',
  musicEx1: 'En jingel för mitt varumärke',
  musicEx2: 'Bakgrundsmusik till min video',
  musicEx3: 'Gör om min text till tal',
  beautyEx1: 'Hur jag skulle se ut med långt hår',
  beautyEx2: 'En festlook',
  beautyEx3: 'Prova en annan hårfärg',
  chefEx1: 'Ett recept med det jag har hemma',
  chefEx2: 'En nyttig veckomeny',
  chefEx3: 'Jag vet inte vad jag ska laga i dag',
  homeEx1: 'Hur mitt vardagsrum skulle se ut i en annan stil',
  homeEx2: 'Idéer för att inreda mitt rum',
  homeEx3: 'En liten trädgård på min uteplats',
  businessEx1: 'En plan för min företagsidé',
  businessEx2: 'Ett uppdaterat cv',
  businessEx3: 'En presentation för investerare',
  travelEx1: 'Japan i oktober',
  travelEx2: 'Jag vill till en lugn och billig strand',
  travelEx3: 'Jag vet inte vart jag ska resa',
  brainEx1: 'Jag vet inte var jag ska börja',
  brainEx2: 'Förklara det här enkelt',
  brainEx3: 'Översätt den här texten',
  areaStudioPhotos: 'Weë Studio · Foton',
  areaStudioVideos: 'Weë Studio · Videor',
  areaStudioBeauty: 'Weë Studio · Skönhet',
  areaDesignHome: 'Weë Design · Hem och inredning',
  areaHomeName: 'Hem och inredning',
  tellTheSpecialist: 'Berätta för {{especialista}} vad du vill uppnå. Du får två eller tre enkla frågor, och resten sköts åt dig. Sedan publicerar du direkt i din community.',
  exampleQuoted: '”{{ejemplo}}”',
};
