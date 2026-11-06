/*
 * La Ayuda en croata: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). Los botones de otros módulos se citan con su texto croata
 * exacto: «Ne znam», «Kopiraj prompt», «Kako sam to napravio», «Spremi u
 * projekt». Los emojis y los nombres de Weë se copian tal cual.
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `a3`. Tras «ima»
 * (tiene) el sustantivo animado «specijalist» da la misma forma en los tres
 * casos —acusativo singular, genitivo singular y genitivo plural—: no es una
 * errata.
 */
import { ConPlurales } from '../ru/plurales';

export const help: ConPlurales<typeof import('../es/help').help> = {
  title: 'Pomoć',
  intro: 'Ovdje su odgovori na najčešća pitanja. Ako nešto nije jasno, reci nam: Weë postaje bolji uz zajednicu.',
  faqTitle: 'Česta pitanja',
  contact: 'Kontakt',
  contactBody: 'Uskoro ćeš ovdje imati izravan kanal do tima Weë. Dotad podijeli svoje ideje i probleme u objavi: zajednica i tim ih čitaju.',
  askQuestion: 'Postavi pitanje',
  legalTitle: 'Uvjeti i privatnost',
  legalBody: 'Tvoji su podaci tvoji. Weë koristi tvoju e-poštu i profil samo da bi aplikacija radila: prijava, prikaz tvojih objava, tvojih Credits i tvojih kreacija. Ne prodajemo tvoje podatke.',
  legalPending: 'Potpuni uvjeti i pravila privatnosti bit će objavljeni na wee.zone prije lansiranja. Weë je u izgradnji: neke funkcije koriste probne podatke i to jasno kažemo ondje gdje se događa.',
  footer: 'Weë · World Encode Entity · verzija 1.0.0',
  q1: 'Što je Weë?',
  a1: 'Weë (World Encode Entity) društvena je mreža ljudi koji stvaraju uz pomoć umjetne inteligencije: ovdje otkrivaš, učiš, stvaraš, dijeliš i povezuješ se. AI je motor; zajednica je srce.',
  q2: 'Koja je razlika između Pravog profila i Weë profila?',
  a2: 'Tvoj Pravi profil tvoj je uobičajeni identitet i s njim je aplikacija bijela. Tvoj Weë profil identitet je za stvaranje s AI-jem: vlastiti avatar i ime za objavljivanje tvojih kreacija, a s njim aplikacija postaje tamna da uvijek znaš kao tko sudjeluješ. Mijenjaš ih u izborniku ☰ ili gumbom u zaglavlju.',
  q3: 'Kako radi Weë AI?',
  a3_one: 'Reci Weë svojim riječima što želiš postići. Weë ti postavi nekoliko jednostavnih pitanja (uvijek možeš odgovoriti „Ne znam“), pripremi plan i stvori rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalista: {{lista}}.',
  a3_few: 'Reci Weë svojim riječima što želiš postići. Weë ti postavi nekoliko jednostavnih pitanja (uvijek možeš odgovoriti „Ne znam“), pripremi plan i stvori rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalista: {{lista}}.',
  a3_other: 'Reci Weë svojim riječima što želiš postići. Weë ti postavi nekoliko jednostavnih pitanja (uvijek možeš odgovoriti „Ne znam“), pripremi plan i stvori rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalista: {{lista}}.',
  q4: 'Što su Credits?',
  a4: 'Svaka kreacija s Weë AI troši Credits. Prije stvaranja vidiš koliko će stajati, a ako nešto pođe po zlu, vraćaju se. Dok gradimo Weë AI, cijene su probne i nadoplate ništa ne koštaju: konačne cijene stići će s pravim AI modelima.',
  q5: 'Čemu služe projekti?',
  a5: 'Projekt okuplja kreacije različitih specijalista: logotip, fotografije, oglas, video i glazbu za „Moj restoran“, na primjer. Spremi svaki rezultat u njegov projekt pomoću „Spremi u projekt“.',
  q6: 'Što su Weëls?',
  a6: 'Videozapisi do 15 sekundi za prikaz onoga što stvaraš. Mogu se dijeliti izvan aplikacije Weë i nose mali Weë vodeni žig. Stvaraš ih gumbom + odabirom „Weël“.',
  q7: 'Što su zajednice?',
  a7: 'Skupine ljudi s istim interesom: Film i animacija, Umjetnost i kreativnost, Poslovanje i poduzetništvo, Tehnologija i AI i još mnogo toga. Pridruži se onima koje te zanimaju i objavljuj u njima.',
  q8: 'Što je WeeTalk?',
  a8: 'To je mjesto za razgovor u aplikaciji Weë: privatni razgovori s drugim ljudima iz zajednice, uz tekst, fotografije i glasovne poruke.',
  q9: 'Što je „Kako je nastalo“?',
  a9: 'Pri objavljivanju možeš navesti korištene alate, prompt i postupak. Tako drugi ljudi uče od tebe, a ti od njih, jednim dodirom na „Kopiraj prompt“.',
  heroTitle: 'Kako ti možemo pomoći?',
  legalVisibility: 'Ono što objaviš vidljivo je zajednici; ono što stvoriš u Weë AI privatno je dok ne odlučiš objaviti. Svoje objave i projekte možeš izbrisati kad god želiš.',
  askPrefill: 'Pitanje za Weë: ',
};
