/*
 * DANÉS — la Ayuda (Hjælp): las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La Ayuda CITA botones y opciones de otras pantallas, entre ”…”, y tiene que decir lo mismo que
 * ellos: «Sådan lavede jeg det» (`wall.howIMadeIt`, que el diseño pinta en mayúsculas; glosario
 * 9.4), «Kopiér prompt» (`wall.copyPrompt`), «Gem i et projekt» (`weeai.saveToProject`), «Weël»
 * (`composer.kindWeel`) y «Ved ikke» (la opción 🤷 que ofrece Weë Brain). El proyecto de ejemplo,
 * «Min restaurant», es el mismo que `projects.namePlaceholder`. Las temáticas de comunidad (Cine &
 * Animación…) aún no tienen claves —viven en constants/communityCategories.ts—: aquí van en danés
 * y con «og» en lugar de «&» (los lectores de pantalla leen mal los signos). Los especialistas se
 * nombran como en el español, sin el prefijo Weë y sin traducir; un especialista es «specialist».
 * Perfil Real y Perfil Weë, dentro de una frase, son «din ægte profil» y «din Weë-profil»
 * (glosario 9.1). Ninguna marca se declina: «chatten i Weë», «holdet bag Weë», «Weë-vandmærke»;
 * «AI» tampoco («Weë vælger den rigtige AI», nunca «AI’en»). Publicar es «slå op» / «opslag»,
 * salvo en a7, donde «slå op i» se leería «buscar en» (un diccionario): allí, «lav opslag i dem».
 * «Inteligencia Artificial» es «kunstig intelligens» porque a1 es un texto explicativo (guía 9.1).
 * Tras dos puntos, mayúscula si sigue una frase completa (guía § 5). `footer` coincide con el
 * inglés porque «version» también es la palabra danesa. `askPrefill` conserva el espacio final:
 * se pega delante de lo que escriba la persona.
 */
export const help: typeof import('../es/help').help = {
  title: 'Hjælp',
  intro: 'Her finder du svar på de mest almindelige spørgsmål. Hvis noget er uklart, så fortæl os det – Weë bliver bedre sammen med fællesskabet.',
  faqTitle: 'Ofte stillede spørgsmål',
  contact: 'Kontakt',
  contactBody: 'Snart kan du kontakte holdet bag Weë direkte herfra. Indtil da kan du dele dine idéer og problemer i et opslag – både fællesskabet og holdet læser dem.',
  askQuestion: 'Stil et spørgsmål',
  legalTitle: 'Vilkår og privatliv',
  legalBody: 'Dine data er dine. Weë bruger kun din e-mail og din profil til at få appen til at virke: til at logge dig ind og vise dine opslag, dine Credits og dine kreationer. Vi sælger ikke dine oplysninger.',
  legalPending: 'Vi offentliggør de fulde vilkår og privatlivspolitikken på wee.zone inden lanceringen. Weë er under opbygning: Nogle funktioner bruger testdata, og det skriver vi tydeligt der, hvor det sker.',
  footer: 'Weë · World Encode Entity · version 1.0.0',
  q1: 'Hvad er Weë?',
  a1: 'Weë (World Encode Entity) er det sociale netværk for mennesker, der skaber med kunstig intelligens: Her kan du opdage, lære, skabe, dele og knytte kontakter. AI er motoren – fællesskabet er hjertet.',
  q2: 'Hvad er forskellen på din ægte profil og din Weë-profil?',
  a2: 'Din ægte profil er din sædvanlige identitet, og med den er appen hvid. Din Weë-profil er din identitet, når du skaber med AI. Den har sin egen avatar og sit eget navn, som du slår dine kreationer op med, og med den bliver appen mørk, så du altid kan se, hvilken profil du deltager som. Du skifter mellem dem i menuen ☰ eller med knappen øverst på skærmen.',
  q3: 'Hvordan fungerer Weë AI?',
  a3: 'Fortæl Weë med dine egne ord, hvad du gerne vil have lavet. Weë stiller dig nogle få enkle spørgsmål (du kan altid svare ”Ved ikke”), lægger en plan og laver resultatet. Du vælger resultatet – Weë vælger den rigtige AI. Der er ti specialister: Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business og Brain.',
  q4: 'Hvad er Credits?',
  a4: 'Hver kreation med Weë AI bruger Credits. Før du laver noget, kan du se, hvad det koster, og hvis noget går galt, får du dem tilbage. Mens vi bygger Weë AI, er priserne testpriser, og optankning er gratis: Når vi kobler de rigtige AI-modeller på, kommer de endelige priser.',
  q5: 'Hvad kan du bruge projekter til?',
  a5: 'Et projekt samler kreationer fra forskellige specialister: fx logoet, billederne, annoncen, videoen og musikken til ”Min restaurant”. Gem hvert resultat i det rigtige projekt med ”Gem i et projekt”.',
  q6: 'Hvad er Weëls?',
  a6: 'Videoer på op til 15 sekunder, hvor du viser, hvad du laver. Du kan dele dem uden for Weë, og de har et lille Weë-vandmærke. Du laver dem med knappen + ved at vælge ”Weël”.',
  q7: 'Hvad er fællesskaber?',
  a7: 'Grupper af mennesker med samme interesse: Film og animation, Kunst og kreativitet, Forretning og iværksætteri, Teknologi og AI – og mange flere. Bliv medlem af dem, der interesserer dig, og lav opslag i dem.',
  q8: 'Hvad er WeeTalk?',
  a8: 'Det er chatten i Weë: private samtaler med andre i fællesskabet med tekst, fotos og talebeskeder.',
  q9: 'Hvad er ”Sådan lavede jeg det”?',
  a9: 'Når du slår noget op, kan du fortælle, hvilke værktøjer du brugte, hvilken prompt du skrev og hvordan du greb det an. Så kan andre lære af dig, og du af dem, med et enkelt tryk på ”Kopiér prompt”.',
  heroTitle: 'Hvad kan vi hjælpe dig med?',
  legalVisibility: 'Det, du slår op, kan ses af fællesskabet, mens det, du laver i Weë AI, er privat, indtil du vælger at slå det op. Du kan slette dine opslag og projekter, når du vil.',
  askPrefill: 'Et spørgsmål til Weë: ',
};
