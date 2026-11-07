/*
 * La Ayuda en montenegrino (ijekaviano, latino): las nueve preguntas, el contacto y lo legal.
 * Cita botones de otros módulos con sus textos exactos: «Ne znam», «Kopiraj prompt», «Kako sam ovo uradio», «Sačuvaj u projekat».
 * `a3` lleva las tres formas (one / few / other): «specijalistu / specijaliste / specijalista».
 */
import { ConPlurales } from '../ru/plurales';

export const help: ConPlurales<typeof import('../es/help').help> = {
  title: 'Pomoć',
  intro: 'Ovdje su odgovori na najčešća pitanja. Ako nešto nije jasno, reci nam: Weë raste uz zajednicu.',
  faqTitle: 'Česta pitanja',
  contact: 'Kontakt',
  contactBody: 'Uskoro ćeš ovdje imati direktan kanal s Weë timom. Do tada podijeli svoje ideje i probleme u objavi: zajednica i tim ih čitaju.',
  askQuestion: 'Postavi pitanje',
  legalTitle: 'Uslovi i privatnost',
  legalBody: 'Tvoji podaci su tvoji. Weë koristi tvoj imejl i profil samo da bi aplikacija radila: prijava, prikaz tvojih objava, tvojih Credits i tvojih kreacija. Ne prodajemo tvoje informacije.',
  legalPending: 'Potpuni uslovi i politika privatnosti biće objavljeni na wee.zone prije lansiranja. Weë je u izgradnji: neke funkcije koriste probne podatke i to jasno kažemo tamo gdje se dešava.',
  footer: 'Weë · World Encode Entity · verzija 1.0.0',
  q1: 'Što je Weë?',
  a1: 'Weë (World Encode Entity) je društvena mreža ljudi koji stvaraju uz vještačku inteligenciju: ovdje otkrivaš, učiš, stvaraš, dijeliš i povezuješ se. AI je motor; zajednica je srce.',
  q2: 'Koja je razlika između Pravog profila i Weë profila?',
  a2: 'Tvoj Pravi profil je tvoj uobičajeni identitet i aplikacija je bijela. Tvoj Weë profil je tvoj identitet za stvaranje uz AI: sopstveni avatar i ime za objavljivanje tvojih kreacija, a dok je aktivan, aplikacija je tamna, da uvijek znaš kao ko učestvuješ. Prelaziš s jednog na drugi iz menija ☰ ili dugmetom u zaglavlju.',
  q3: 'Kako radi Weë AI?',
  a3_one: 'Reci Weë svojim riječima što želiš da postigneš. Weë ti postavi nekoliko jednostavnih pitanja (uvijek možeš da odgovoriš „Ne znam“), pripremi plan i napravi rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalistu: {{lista}}.',
  a3_few: 'Reci Weë svojim riječima što želiš da postigneš. Weë ti postavi nekoliko jednostavnih pitanja (uvijek možeš da odgovoriš „Ne znam“), pripremi plan i napravi rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijaliste: {{lista}}.',
  a3_other: 'Reci Weë svojim riječima što želiš da postigneš. Weë ti postavi nekoliko jednostavnih pitanja (uvijek možeš da odgovoriš „Ne znam“), pripremi plan i napravi rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalista: {{lista}}.',
  q4: 'Što su Credits?',
  a4: 'Svaka kreacija uz Weë AI troši Credits. Prije kreiranja vidiš koliko će koštati, a ako nešto ne uspije, vraćaju se. Dok gradimo Weë AI, cijene su probne i dopune ne koštaju ništa: konačne cijene stižu s pravim AI modelima.',
  q5: 'Čemu služe projekti?',
  a5: 'Projekat okuplja kreacije različitih specijalista: logo, fotografije, reklamu, video i muziku za „Moj restoran“, na primjer. Svaki rezultat sačuvaj u odgovarajući projekat preko „Sačuvaj u projekat“.',
  q6: 'Što su Weëls?',
  a6: 'Videosnimci do 15 sekundi za prikazivanje onoga što stvaraš. Mogu da se dijele van Weë i imaju mali Weë vodeni žig. Praviš ih dugmetom + biranjem „Weël“.',
  q7: 'Što su zajednice?',
  a7: 'Grupe ljudi sa istim interesovanjem: Film i animacija, Umjetnost i kreativnost, Biznis i preduzetništvo, Tehnologija i AI i još mnogo toga. Pridruži se onima koje te zanimaju i objavljuj u njima.',
  q8: 'Što je WeeTalk?',
  a8: 'To je Weë ćaskanje: privatni razgovori s drugim ljudima iz zajednice, uz tekst, fotografije i glasovne poruke.',
  q9: 'Što je „Kako sam to napravio/la“?',
  a9: 'Pri objavljivanju možeš da navedeš korišćene alate, prompt i postupak. Tako drugi uče od tebe, a ti od njih, jednim dodirom na „Kopiraj prompt“.',
  q10: 'Koliko godina treba imati za korišćenje Weë?',
  a10: 'Weë je dostupan samo osobama od {{edad}} ili više godina. Datum rođenja traži se pri registraciji i, kada se sačuva, ne može se promijeniti.',
  heroTitle: 'Kako možemo da ti pomognemo?',
  legalVisibility: 'Ono što objaviš vidljivo je zajednici; ono što stvoriš u Weë AI privatno je dok ne odlučiš da to objaviš. Svoje objave i projekte možeš da obrišeš kad god želiš.',
  askPrefill: 'Pitanje za Weë: ',
};
