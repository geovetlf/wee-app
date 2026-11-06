/*
 * RUMANO — la Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las respuestas citan botones de otros módulos con los términos exactos del
 * glosario («Copiază promptul», «Salvează într-un proiect», „Nu știu”). Los
 * emojis y los nombres de Weë se copian tal cual. El contador de especialistas
 * lleva las tres formas del rumano.
 */
import { ConPlurales } from '../ru/plurales';

export const help: ConPlurales<typeof import('../es/help').help> = {
  title: 'Ajutor',
  intro: 'Aici găsești răspunsurile la cele mai frecvente întrebări. Dacă ceva nu este clar, spune-ne: Weë se îmbunătățește împreună cu comunitatea.',
  faqTitle: 'Întrebări frecvente',
  contact: 'Contact',
  contactBody: 'Foarte curând vei avea aici un canal direct cu echipa Weë. Până atunci, împărtășește-ți ideile și problemele într-o postare: comunitatea și echipa le citesc.',
  askQuestion: 'Pune o întrebare',
  legalTitle: 'Termeni și confidențialitate',
  legalBody: 'Datele tale sunt ale tale. Weë folosește e-mailul și profilul tău doar pentru ca aplicația să funcționeze: conectare, afișarea postărilor tale, a Credits și a creațiilor tale. Nu îți vindem informațiile.',
  legalPending: 'Termenii compleți și politica de confidențialitate vor fi publicate pe wee.zone înainte de lansare. Weë este în construcție: unele funcții folosesc date de probă și spunem clar acest lucru acolo unde se întâmplă.',
  footer: 'Weë · World Encode Entity · versiunea 1.0.0',
  q1: 'Ce este Weë?',
  a1: 'Weë (World Encode Entity) este rețeaua socială a oamenilor care creează cu Inteligență Artificială: aici descoperi, înveți, creezi, împărtășești și te conectezi. IA este motorul; comunitatea este inima.',
  q2: 'Care este diferența dintre Profilul real și Profilul Weë?',
  a2: 'Profilul tău real este identitatea ta dintotdeauna, iar aplicația are fundal alb. Profilul tău Weë este identitatea ta pentru a crea cu IA: un avatar și un nume proprii pentru a-ți publica creațiile, iar cu el aplicația trece pe tema întunecată, ca să știi mereu cu ce profil participi. Treci de la unul la altul din meniul ☰ sau din butonul din antet.',
  q3: 'Cum funcționează Weë AI?',
  a3_one: 'Spune-i lui Weë ce vrei să obții, cu cuvintele tale. Weë îți pune câteva întrebări simple (poți răspunde oricând „Nu știu”), pregătește un plan și creează rezultatul. Tu alegi rezultatul; Weë alege IA. Weë AI are {{contador}} specialist: {{lista}}.',
  a3_few: 'Spune-i lui Weë ce vrei să obții, cu cuvintele tale. Weë îți pune câteva întrebări simple (poți răspunde oricând „Nu știu”), pregătește un plan și creează rezultatul. Tu alegi rezultatul; Weë alege IA. Weë AI are {{contador}} specialiști: {{lista}}.',
  a3_other: 'Spune-i lui Weë ce vrei să obții, cu cuvintele tale. Weë îți pune câteva întrebări simple (poți răspunde oricând „Nu știu”), pregătește un plan și creează rezultatul. Tu alegi rezultatul; Weë alege IA. Weë AI are {{contador}} de specialiști: {{lista}}.',
  q4: 'Ce sunt Credits?',
  a4: 'Fiecare creație cu Weë AI folosește Credits. Înainte de a crea vezi cât va costa și, dacă ceva nu merge, se returnează. Cât timp construim Weë AI, prețurile sunt de probă, iar reîncărcările nu costă nimic: prețurile definitive vor veni odată cu IA reală.',
  q5: 'La ce folosesc proiectele?',
  a5: 'Un proiect grupează creații ale mai multor specialiști: logoul, fotografiile, reclama, videoclipul și muzica pentru „Restaurantul meu”, de exemplu. Salvează fiecare rezultat în proiectul lui din „Salvează într-un proiect”.',
  q6: 'Ce sunt Weëls?',
  a6: 'Videoclipuri de până la 15 secunde pentru a arăta ce creezi. Pot fi distribuite în afara Weë și poartă un mic filigran Weë. Le creezi din butonul + alegând „Weël”.',
  q7: 'Ce sunt comunitățile?',
  a7: 'Grupuri de oameni cu același interes: Film & Animație, Artă & Creativitate, Afaceri & Antreprenoriat, Tehnologie & IA și altele. Alătură-te celor care te interesează și postează în ele.',
  q8: 'Ce este WeeTalk?',
  a8: 'Este chatul din Weë: conversații private cu alte persoane din comunitate, cu text, fotografii și mesaje vocale.',
  q9: 'Ce este „Cum am făcut-o”?',
  a9: 'Când publici, poți povesti ce instrumente ai folosit, promptul și procesul. Așa alte persoane învață de la tine, iar tu de la ele, cu o singură atingere pe „Copiază promptul”.',
  q10: 'Ce vârstă trebuie să ai ca să folosești Weë?',
  a10: 'Weë este disponibil doar pentru persoanele de {{edad}} ani sau mai mult. Data nașterii îți este cerută la înregistrare și, după ce este salvată, nu mai poate fi schimbată.',
  heroTitle: 'Cu ce te putem ajuta?',
  legalVisibility: 'Ce publici este vizibil pentru comunitate; ce creezi în Weë AI este privat până când decizi să publici. Îți poți șterge postările și proiectele oricând.',
  askPrefill: 'O întrebare pentru Weë: ',
};
