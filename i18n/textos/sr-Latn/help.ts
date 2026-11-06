/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica) — la Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El contenido de la Ayuda es interfaz y se traduce entero. Los botones que cita
 * se escriben exactamente como en sus módulos: „Ne znam“, „Kopiraj prompt“,
 * „Kako sam ovo uradio“, „Sačuvaj u projekat“. `a3` lleva one / few / other con
 * {{contador}} («specijalistu / specijaliste / specijalista»). Los nombres de
 * Weë, wee.zone y World Encode Entity quedan en latino.
 */
import { ConPlurales } from '../ru/plurales';

export const help: ConPlurales<typeof import('../es/help').help> = {
  title: 'Pomoć',
  intro: 'Ovde su odgovori na najčešća pitanja. Ako nešto nije jasno, reci nam: Weë raste uz zajednicu.',
  faqTitle: 'Česta pitanja',
  contact: 'Kontakt',
  contactBody: 'Uskoro ćeš ovde imati direktan kanal do Weë tima. U međuvremenu, podeli svoje ideje i probleme u objavi: zajednica i tim ih čitaju.',
  askQuestion: 'Postavi pitanje',
  legalTitle: 'Uslovi i privatnost',
  legalBody: 'Tvoji podaci su tvoji. Weë koristi tvoj imejl i profil samo da bi aplikacija radila: prijava, prikaz tvojih objava, tvojih Credits i tvojih kreacija. Ne prodajemo tvoje podatke.',
  legalPending: 'Potpuni uslovi i politika privatnosti biće objavljeni na wee.zone pre lansiranja. Weë je u izgradnji: neke funkcije koriste probne podatke i to jasno kažemo tamo gde se dešava.',
  footer: 'Weë · World Encode Entity · verzija 1.0.0',
  q1: 'Šta je Weë?',
  a1: 'Weë (World Encode Entity) je društvena mreža ljudi koji stvaraju uz pomoć veštačke inteligencije: ovde otkrivaš, učiš, stvaraš, deliš i povezuješ se. AI je motor; zajednica je srce.',
  q2: 'Koja je razlika između Pravog profila i Weë profila?',
  a2: 'Tvoj Pravi profil je tvoj uobičajeni identitet i s njim je aplikacija bela. Tvoj Weë profil je tvoj identitet za stvaranje uz AI: sopstveni avatar i ime za objavljivanje tvojih kreacija, a s njim aplikacija postaje tamna da uvek znaš kojim profilom učestvuješ. Menjaš ih iz menija ☰ ili dugmetom u zaglavlju.',
  q3: 'Kako radi Weë AI?',
  a3_one: 'Reci Weë svojim rečima šta želiš da postigneš. Weë ti postavlja nekoliko jednostavnih pitanja (uvek možeš da odgovoriš „Ne znam“), priprema plan i stvara rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalistu: {{lista}}.',
  a3_few: 'Reci Weë svojim rečima šta želiš da postigneš. Weë ti postavlja nekoliko jednostavnih pitanja (uvek možeš da odgovoriš „Ne znam“), priprema plan i stvara rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijaliste: {{lista}}.',
  a3_other: 'Reci Weë svojim rečima šta želiš da postigneš. Weë ti postavlja nekoliko jednostavnih pitanja (uvek možeš da odgovoriš „Ne znam“), priprema plan i stvara rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalista: {{lista}}.',
  q4: 'Šta su Credits?',
  a4: 'Svaka kreacija u Weë AI troši Credits. Pre stvaranja vidiš koliko će koštati, a ako nešto ne uspe, vraćaju se. Dok gradimo Weë AI, cene su probne i dopune ništa ne koštaju: konačne cene stižu s pravim AI modelima.',
  q5: 'Čemu služe projekti?',
  a5: 'Projekat okuplja kreacije različitih specijalista: na primer logo, fotografije, oglas, video i muziku za „Moj restoran“. Sačuvaj svaki rezultat u svoj projekat preko „Sačuvaj u projekat“.',
  q6: 'Šta su Weëls?',
  a6: 'Video-snimci do 15 sekundi za prikaz onoga što stvaraš. Mogu da se dele van aplikacije Weë i imaju mali Weë vodeni žig. Praviš ih dugmetom + uz izbor „Weël“.',
  q7: 'Šta su zajednice?',
  a7: 'Grupe ljudi s istim interesovanjem: Film i animacija, Umetnost i kreativnost, Biznis i preduzetništvo, Tehnologija i veštačka inteligencija i još mnogo toga. Pridruži se onima koje te zanimaju i objavljuj u njima.',
  q8: 'Šta je WeeTalk?',
  a8: 'To je ćaskanje u aplikaciji Weë: privatni razgovori s drugim ljudima iz zajednice, uz tekst, fotografije i glasovne poruke.',
  q9: 'Šta je „Kako je nastalo“?',
  a9: 'Prilikom objavljivanja možeš da navedeš upotrebljene alate, prompt i postupak. Tako drugi uče od tebe, a ti od njih, jednim dodirom na „Kopiraj prompt“.',
  heroTitle: 'Kako možemo da ti pomognemo?',
  legalVisibility: 'Ono što objaviš vidljivo je zajednici; ono što stvoriš u Weë AI privatno je dok ne odlučiš da ga objaviš. Svoje objave i projekte možeš da obrišeš kad god želiš.',
  askPrefill: 'Pitanje za Weë: ',
};
