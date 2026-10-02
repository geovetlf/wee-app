/*
 * SUECO — la Ayuda (Hjälp): las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La Ayuda CITA botones y opciones de otras pantallas, entre ”…”, y tiene que decir lo mismo que
 * ellos: «Så gjorde jag» (`wall.howIMadeIt`, que el diseño pinta en mayúsculas), «Kopiera prompt»
 * (`wall.copyPrompt`), «Spara i ett projekt» (`weeai.saveToProject`), «Weël» (`composer.kindWeel`)
 * y «Vet inte» (la opción 🤷 que ofrece Weë Brain). El proyecto de ejemplo, «Min restaurang», es
 * el mismo que `projects.namePlaceholder`. Las temáticas de comunidad (Cine & Animación…) aún no
 * tienen claves —viven en constants/communityCategories.ts—: aquí van en sueco y con «och» en
 * lugar de «&» (guía § 5). Los especialistas se nombran como en el español, sin el prefijo Weë y
 * sin traducir; en sueco un especialista es «expert». Perfil Real y Perfil Weë, dentro de una
 * frase, son «din riktiga profil» y «din Weë-profil». Ninguna marca se declina: «chatten i Weë»,
 * «teamet bakom Weë», «Weë-vattenstämpel». `askPrefill` conserva el espacio final: se pega delante
 * de lo que escriba la persona.
 */
export const help: typeof import('../es/help').help = {
  title: 'Hjälp',
  intro: 'Här hittar du svar på de vanligaste frågorna. Är något oklart? Berätta det för oss – Weë blir bättre tillsammans med communityn.',
  faqTitle: 'Vanliga frågor',
  contact: 'Kontakt',
  contactBody: 'Snart kan du nå teamet bakom Weë direkt härifrån. Tills vidare kan du dela idéer och problem i ett inlägg – både communityn och teamet läser dem.',
  askQuestion: 'Ställ en fråga',
  legalTitle: 'Villkor och integritet',
  legalBody: 'Dina uppgifter tillhör dig. Weë använder din e-postadress och profil bara för att appen ska fungera: för att du ska kunna logga in och se dina inlägg, Credits och skapelser. Vi säljer inte dina uppgifter.',
  legalPending: 'De fullständiga villkoren och integritetspolicyn publiceras på wee.zone före lanseringen. Weë är under uppbyggnad: vissa funktioner använder testdata, och det står tydligt där det gäller.',
  footer: 'Weë · World Encode Entity · version 1.0.0',
  q1: 'Vad är Weë?',
  a1: 'Weë (World Encode Entity) är det sociala nätverket för människor som skapar med artificiell intelligens: här kan du upptäcka, lära dig, skapa, dela och knyta kontakter. AI är motorn – communityn är hjärtat.',
  q2: 'Vad är skillnaden mellan din riktiga profil och din Weë-profil?',
  a2: 'Din riktiga profil är din vanliga identitet – med den är appen vit. Din Weë-profil är din identitet när du skapar med AI: en egen avatar och ett eget namn att publicera dina skapelser med. Med den blir appen mörk, så att du alltid vet vilken profil du använder. Du växlar mellan dem i menyn ☰ eller med knappen högst upp.',
  q3: 'Hur fungerar Weë AI?',
  a3_one: 'Berätta för Weë med dina egna ord vad du vill åstadkomma. Weë ställer några enkla frågor (du kan alltid svara ”Vet inte”), gör upp en plan och skapar resultatet. Du väljer resultatet – Weë väljer rätt AI. Weë AI har {{contador}} expert: {{lista}}.',
  a3_other: 'Berätta för Weë med dina egna ord vad du vill åstadkomma. Weë ställer några enkla frågor (du kan alltid svara ”Vet inte”), gör upp en plan och skapar resultatet. Du väljer resultatet – Weë väljer rätt AI. Weë AI har {{contador}} experter: {{lista}}.',
  q4: 'Vad är Credits?',
  a4: 'Allt du skapar med Weë AI kostar Credits. Innan du skapar något ser du vad det kostar, och om något går fel får du tillbaka dem. Medan vi bygger Weë AI är priserna testpriser och påfyllningar är gratis: de slutliga priserna kommer när de riktiga AI-tjänsterna kopplas in.',
  q5: 'Vad är projekt bra för?',
  a5: 'I ett projekt samlar du skapelser från olika experter, till exempel loggan, fotona, annonsen, videon och musiken till ”Min restaurang”. Spara varje resultat i rätt projekt med ”Spara i ett projekt”.',
  q6: 'Vad är Weëls?',
  a6: 'Videor på upp till 15 sekunder där du visar vad du skapar. De kan delas utanför Weë och har en liten Weë-vattenstämpel. Du skapar dem med knappen + genom att välja ”Weël”.',
  q7: 'Vad är communities?',
  a7: 'Grupper av människor med samma intresse: Film och animation, Konst och kreativitet, Företag och entreprenörskap, Teknik och AI med flera. Gå med i dem som intresserar dig och publicera i dem.',
  q8: 'Vad är WeeTalk?',
  a8: 'Det är chatten i Weë: privata konversationer med andra i communityn, med text, foton och röstmeddelanden.',
  q9: 'Vad är ”Så gjorde jag”?',
  a9: 'När du publicerar kan du berätta vilka verktyg du använde, vilken prompt du skrev och hur du gick till väga. Då kan andra lära sig av dig, och du av dem, med ett enda tryck på ”Kopiera prompt”.',
  heroTitle: 'Vad kan vi hjälpa dig med?',
  legalVisibility: 'Det du publicerar syns för communityn, medan det du skapar i Weë AI är privat tills du väljer att publicera det. Du kan ta bort dina inlägg och projekt när du vill.',
  askPrefill: 'En fråga till Weë: ',
};
