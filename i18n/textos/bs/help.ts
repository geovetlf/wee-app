/*
 * BOSNIO — la Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El contenido de la Ayuda es interfaz y se traduce entero; los emojis y los
 * nombres de Weë se copian tal cual. Los botones que cita se escriben
 * exactamente como en sus módulos: «Ne znam», «Kopiraj prompt»,
 * «Kako sam to uradio», «Sačuvaj u projekat».
 *
 * PLURALES: one / few / other, así que `a3` lleva `_few`: «1 specijalistu»,
 * «2 specijaliste», «5 specijalista».
 */
import { ConPlurales } from '../ru/plurales';

export const help: ConPlurales<typeof import('../es/help').help> = {
  title: 'Pomoć',
  intro: 'Ovdje su odgovori na najčešća pitanja. Ako nešto nije jasno, reci nam: Weë napreduje uz zajednicu.',
  faqTitle: 'Česta pitanja',
  contact: 'Kontakt',
  contactBody: 'Uskoro ćeš ovdje imati direktan kanal do Weë tima. Dotad podijeli svoje ideje i probleme u objavi: zajednica i tim ih čitaju.',
  askQuestion: 'Postavi pitanje',
  legalTitle: 'Uslovi i privatnost',
  legalBody: 'Tvoji podaci su tvoji. Weë koristi tvoj e-mail i profil samo da bi aplikacija radila: prijava, prikaz tvojih objava, tvojih Credits i tvojih kreacija. Ne prodajemo tvoje podatke.',
  legalPending: 'Potpuni uslovi i politika privatnosti bit će objavljeni na wee.zone prije lansiranja. Weë je u izgradnji: neke funkcije koriste probne podatke i to jasno kažemo tamo gdje se dešava.',
  footer: 'Weë · World Encode Entity · verzija 1.0.0',
  q1: 'Šta je Weë?',
  a1: 'Weë (World Encode Entity) je društvena mreža ljudi koji stvaraju uz pomoć vještačke inteligencije: ovdje otkrivaš, učiš, kreiraš, dijeliš i povezuješ se. AI je motor; zajednica je srce.',
  q2: 'Koja je razlika između Pravog profila i Weë profila?',
  a2: 'Tvoj Pravi profil je tvoj uobičajeni identitet i aplikacija je bijela. Tvoj Weë profil je tvoj identitet za stvaranje uz AI: vlastiti avatar i ime za objavljivanje tvojih kreacija, a s njim aplikacija prelazi na tamni izgled da uvijek znaš s kojim profilom učestvuješ. Prebacuješ se s jednog na drugi iz menija ☰ ili dugmetom u zaglavlju.',
  q3: 'Kako radi Weë AI?',
  a3_one: 'Reci Weë svojim riječima šta želiš postići. Weë ti postavlja nekoliko jednostavnih pitanja (uvijek možeš odgovoriti „Ne znam“), priprema plan i pravi rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalistu: {{lista}}.',
  a3_few: 'Reci Weë svojim riječima šta želiš postići. Weë ti postavlja nekoliko jednostavnih pitanja (uvijek možeš odgovoriti „Ne znam“), priprema plan i pravi rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijaliste: {{lista}}.',
  a3_other: 'Reci Weë svojim riječima šta želiš postići. Weë ti postavlja nekoliko jednostavnih pitanja (uvijek možeš odgovoriti „Ne znam“), priprema plan i pravi rezultat. Ti biraš rezultat; Weë bira AI. Weë AI ima {{contador}} specijalista: {{lista}}.',
  q4: 'Šta su Credits?',
  a4: 'Svaka kreacija s Weë AI koristi Credits. Prije kreiranja vidiš koliko će koštati, a ako nešto zakaže, vraćaju se. Dok gradimo Weë AI, cijene su probne i dopune ništa ne koštaju: konačne cijene stižu sa stvarnim AI modelima.',
  q5: 'Čemu služe projekti?',
  a5: 'Projekat okuplja kreacije različitih specijalista: logo, fotografije, oglas, video i muziku za „Moj restoran“, naprimjer. Sačuvaj svaki rezultat u njegov projekat preko „Sačuvaj u projekat“.',
  q6: 'Šta su Weëls?',
  a6: 'Videi do 15 sekundi za prikaz onoga što stvaraš. Mogu se dijeliti izvan aplikacije Weë i nose mali Weë znak. Praviš ih dugmetom + biranjem „Weël“.',
  q7: 'Šta su zajednice?',
  a7: 'Grupe ljudi s istim interesom: Film & Animacija, Umjetnost & Kreativnost, Biznis & Poduzetništvo, Tehnologija & AI i još mnogo toga. Pridruži se onima koje te zanimaju i objavljuj u njima.',
  q8: 'Šta je WeeTalk?',
  a8: 'To je Weë chat: privatni razgovori s drugim ljudima iz zajednice, s tekstom, fotografijama i glasovnim porukama.',
  q9: 'Šta je „Kako je nastalo“?',
  a9: 'Pri objavljivanju možeš navesti korištene alate, prompt i proces. Tako drugi uče od tebe, a ti od njih, jednim dodirom na „Kopiraj prompt“.',
  heroTitle: 'Kako ti možemo pomoći?',
  legalVisibility: 'Ono što objaviš vidljivo je zajednici; ono što kreiraš u Weë AI privatno je dok ne odlučiš objaviti. Svoje objave i projekte možeš izbrisati kad god želiš.',
  askPrefill: 'Pitanje za Weë: ',
};
