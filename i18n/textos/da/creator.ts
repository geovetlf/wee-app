/*
 * DANÉS — lo que describe cada experiencia de WEË AI y los ejemplos que se tocan
 * para empezar. Los nombres —Weë Design, Weë Studio…— son marca y viven en
 * constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las descripciones son listas cortas, sin «dine» cuando no hace falta. Los
 * ejemplos hablan con la voz de la persona, como se escribiría en danés: «Jeg
 * ved ikke, hvor jeg skal starte», «Ret min tekst». Se adapta lo que el calco no
 * serviría: el menú semanal es una «madplan» (como se planifica la comida en
 * Dinamarca), el patio es la «terrasse», «un look para una fiesta» es «Et
 * festlook» y el CV, «CV» en mayúsculas, como en el resto de la app (Den Danske Ordbog admite «cv» y «CV»). Donde «Forbedr»
 * quedaría como imperativo que acaba en grupo de consonantes (guía § 3) se
 * reformula como la meta de Weë Photo: «Giv et foto bedre kvalitet». La narración de Weë Music es
 * «oplæsning». Un Weël es «en Weël». Los posesivos concuerdan: «mit foto», «mit
 * produkt», «min video», «dine fotos».
 *
 * Las áreas se traducen porque se leen; la marca de delante no: «Weë Studio ·
 * Fotos», «Weë Studio · Skønhed» (el «Beauty» del español es el nombre del área,
 * no la marca Weë Beauty) y «Weë Design · Bolig og indretning», con «og» en vez
 * de «&»: así se llama esa sección en cualquier revista o tienda danesa.
 * `tellTheSpecialist` nombra al experto como complemento («Fortæl
 * {{especialista}}, hvad …»), así la marca no se declina, y el hueco aparece una
 * sola vez. Las comillas del ejemplo son las danesas, ”…”, el mismo carácter a
 * los dos lados.
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'Logoer, plakater, illustrationer og indhold til sociale medier',
  studio: 'Skab og forvandl fotos og videoer med AI.',
  photo: 'Forbedring, restaurering og forvandling af dine fotos',
  writer: 'Opslag, historier, manuskripter, e-mails og bøger',
  music: 'Sange, instrumentalmusik, vokal og oplæsning',
  beauty: 'Makeup, hår, skæg, outfits og nye looks',
  chef: 'Din personlige kok: madideer, opskrifter og menuer',
  home: 'Boligindretning, interiørdesign, renovering og haver',
  business: 'Forretningsidéer, marketing, CV, dokumenter og præsentationer',
  travel: 'Planlæg din rejse: hvor du skal hen, hvad du kan lave og hvordan du kommer rundt',
  brain: 'Ved du ikke, hvor du skal lede? Spørg Weë',
  designEx1: 'Et logo til min virksomhed',
  designEx2: 'Et opslag til Instagram',
  designEx3: 'Forsiden til min bog',
  studioEx1: 'En reklamevideo til min restaurant',
  studioEx2: 'Lav mit foto om til en video',
  studioEx3: 'En Weël med mit produkt',
  photoEx1: 'Giv et foto bedre kvalitet',
  photoEx2: 'Fjern noget, der ikke skal være på fotoet',
  photoEx3: 'Skift baggrunden på mit foto',
  writerEx1: 'Et manuskript til min video',
  writerEx2: 'En e-mail til en kunde',
  writerEx3: 'Ret min tekst',
  musicEx1: 'En jingle til mit brand',
  musicEx2: 'Baggrundsmusik til min video',
  musicEx3: 'Lav min tekst om til tale',
  beautyEx1: 'Hvordan jeg ville se ud med langt hår',
  beautyEx2: 'Et festlook',
  beautyEx3: 'Prøv en anden hårfarve',
  chefEx1: 'En opskrift med det, jeg har derhjemme',
  chefEx2: 'En sund madplan for ugen',
  chefEx3: 'Jeg ved ikke, hvad jeg skal lave af mad i dag',
  homeEx1: 'Hvordan min stue ville se ud i en anden stil',
  homeEx2: 'Idéer til at indrette mit værelse',
  homeEx3: 'En lille have på min terrasse',
  businessEx1: 'En plan for min nye virksomhed',
  businessEx2: 'Mit opdaterede CV',
  businessEx3: 'En præsentation til investorer',
  travelEx1: 'Japan i oktober',
  travelEx2: 'Jeg vil til en rolig og billig strand',
  travelEx3: 'Jeg ved ikke, hvor jeg skal rejse hen',
  brainEx1: 'Jeg ved ikke, hvor jeg skal starte',
  brainEx2: 'Forklar det her på en enkel måde',
  brainEx3: 'Oversæt denne tekst',
  areaStudioPhotos: 'Weë Studio · Fotos',
  areaStudioVideos: 'Weë Studio · Videoer',
  areaStudioBeauty: 'Weë Studio · Skønhed',
  areaDesignHome: 'Weë Design · Bolig og indretning',
  areaHomeName: 'Bolig og indretning',
  tellTheSpecialist: 'Fortæl {{especialista}}, hvad du gerne vil. Du får to eller tre enkle spørgsmål, og resten klares for dig. Bagefter kan du slå resultatet op direkte i dit fællesskab.',
  exampleQuoted: '”{{ejemplo}}”',
};
