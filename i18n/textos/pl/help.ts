/*
 * POLACO — la Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ESTE MÓDULO CITA BOTONES QUE VIVEN EN OTROS: «Nie wiem» (el 🤷 de Weë AI),
 * «Zapisz w projekcie» (`weeai.saveToProject`), «Jak to zrobiłem»
 * (`wall.howIMadeIt`) y «Kopiuj prompt» (`wall.copyPrompt`). Tienen que ser
 * LAS MISMAS palabras que allí, letra por letra.
 *
 * Lo legal usa los términos jurídicos fijos: «Regulamin» y «Polityka
 * prywatności», los mismos de `settings` y `menu`. Comillas polacas „…”.
 * `a3` lleva las cuatro formas del plural polaco con `ConPlurales`.
 */
import { ConPlurales } from '../ru/plurales';

export const help: ConPlurales<typeof import('../es/help').help> = {
  title: 'Pomoc',
  intro: 'Tu znajdziesz odpowiedzi na najczęstsze pytania. Jeśli coś jest niejasne, daj nam znać: Weë rozwija się dzięki społeczności.',
  faqTitle: 'Najczęstsze pytania',
  contact: 'Kontakt',
  contactBody: 'Już wkrótce znajdziesz tu bezpośredni kanał kontaktu z zespołem Weë. Tymczasem podziel się pomysłami i problemami w poście: czytają je społeczność i zespół.',
  askQuestion: 'Zadaj pytanie',
  legalTitle: 'Regulamin i prywatność',
  legalBody: 'Twoje dane należą do ciebie. Weë używa twojego e-maila i profilu tylko po to, aby aplikacja działała: do logowania oraz pokazywania twoich postów, Credits i dzieł. Nie sprzedajemy twoich informacji.',
  legalPending: 'Pełny regulamin i polityka prywatności zostaną opublikowane na wee.zone przed premierą. Weë jest w budowie: niektóre funkcje używają danych testowych i mówimy o tym wyraźnie tam, gdzie to się dzieje.',
  footer: 'Weë · World Encode Entity · wersja 1.0.0',
  q1: 'Czym jest Weë?',
  a1: 'Weë (World Encode Entity) to sieć społecznościowa dla osób, które tworzą ze sztuczną inteligencją: tutaj odkrywasz, uczysz się, tworzysz, dzielisz się i nawiązujesz kontakty. AI jest silnikiem; społeczność jest sercem.',
  q2: 'Czym różni się Prawdziwy profil od Profilu Weë?',
  a2: 'Twój Prawdziwy profil to twoja zwykła tożsamość, a aplikacja jest wtedy biała. Twój Profil Weë to twoja tożsamość do tworzenia z AI: własny awatar i własna nazwa do publikowania twoich dzieł, a aplikacja przybiera z nim ciemny wygląd, aby zawsze było jasne, którym profilem działasz. Przełączasz się między nimi w menu ☰ lub przyciskiem w nagłówku.',
  q3: 'Jak działa Weë AI?',
  a3_one: 'Opowiedz Weë własnymi słowami, co chcesz osiągnąć. Weë zada ci kilka prostych pytań (zawsze możesz odpowiedzieć „Nie wiem”), przygotuje plan i stworzy wynik. Ty wybierasz wynik; Weë wybiera AI. Weë AI ma {{contador}} specjalistę: {{lista}}.',
  a3_few: 'Opowiedz Weë własnymi słowami, co chcesz osiągnąć. Weë zada ci kilka prostych pytań (zawsze możesz odpowiedzieć „Nie wiem”), przygotuje plan i stworzy wynik. Ty wybierasz wynik; Weë wybiera AI. Weë AI ma {{contador}} specjalistów: {{lista}}.',
  a3_many: 'Opowiedz Weë własnymi słowami, co chcesz osiągnąć. Weë zada ci kilka prostych pytań (zawsze możesz odpowiedzieć „Nie wiem”), przygotuje plan i stworzy wynik. Ty wybierasz wynik; Weë wybiera AI. Weë AI ma {{contador}} specjalistów: {{lista}}.',
  a3_other: 'Opowiedz Weë własnymi słowami, co chcesz osiągnąć. Weë zada ci kilka prostych pytań (zawsze możesz odpowiedzieć „Nie wiem”), przygotuje plan i stworzy wynik. Ty wybierasz wynik; Weë wybiera AI. Weë AI ma {{contador}} specjalisty: {{lista}}.',
  q4: 'Czym są Credits?',
  a4: 'Każde dzieło w Weë AI zużywa Credits. Przed utworzeniem widzisz, ile będzie kosztować, a jeśli coś się nie uda, są zwracane. Dopóki budujemy Weë AI, ceny są testowe, a doładowania nic nie kosztują: ostateczne ceny pojawią się wraz z prawdziwymi modelami AI.',
  q5: 'Do czego służą projekty?',
  a5: 'Projekt grupuje dzieła różnych specjalistów: na przykład logo, zdjęcia, reklamę, film i muzykę dla „Mojej restauracji”. Zapisuj każdy wynik w odpowiednim projekcie przyciskiem „Zapisz w projekcie”.',
  q6: 'Czym są Weëls?',
  a6: 'Filmy do 15 sekund, które pokazują to, co tworzysz. Można je udostępniać poza Weë i mają mały znak wodny Weë. Tworzysz je przyciskiem +, wybierając „Weël”.',
  q7: 'Czym są społeczności?',
  a7: 'Grupy osób o wspólnych zainteresowaniach: Kino & Animacja, Sztuka & Kreatywność, Biznes & Przedsiębiorczość, Technologia & AI i nie tylko. Dołącz do tych, które cię interesują, i publikuj w nich.',
  q8: 'Czym jest WeeTalk?',
  a8: 'To czat Weë: prywatne rozmowy z innymi osobami ze społeczności, z tekstem, zdjęciami i wiadomościami głosowymi.',
  q9: 'Czym jest „Jak to powstało”?',
  a9: 'Publikując, możesz opisać użyte narzędzia, prompt i proces. Tak inni uczą się od ciebie, a ty od nich, jednym dotknięciem „Kopiuj prompt”.',
  heroTitle: 'W czym możemy ci pomóc?',
  legalVisibility: 'To, co publikujesz, widzi społeczność; to, co tworzysz w Weë AI, jest prywatne, dopóki nie zdecydujesz się tego opublikować. Możesz usunąć swoje posty i projekty, kiedy chcesz.',
  askPrefill: 'Pytanie do Weë: ',
};
