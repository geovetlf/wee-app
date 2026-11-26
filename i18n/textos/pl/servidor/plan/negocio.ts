/*
 * POLACO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Plurales de cuatro formas por `ConPlurales`: 1 dzień, 2 dni, 5 dni, 1,5 dnia; 1 noc, 2 noce, 5 nocy, 1,5 nocy (el 0 cae
 * en `_many`: «0 nocy»). `{{fechas}}` ya trae su preposición; `{{tono}}` y `{{busca}}` van detrás de dos puntos, en
 * nominativo.
 */
import { ConPlurales } from '../../../ru/plurales';

export const planNegocio: ConPlurales<typeof import('../../../es/servidor/plan/negocio').planNegocio> = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Poznam twój biznes, napiszę post (ton: {{tono}}) i stworzę obraz, który mu towarzyszy.',
  businessExplicaCalendario: 'Ułożę twój tygodniowy kalendarz publikacji z dniem, godziną i siecią dla każdej z nich.',
  businessExplicaPublicar: 'Przygotuję post i dopasuję go do każdej sieci, żeby można go było skopiować i opublikować. Weë nie jest jeszcze połączony z twoimi sieciami, więc nie opublikuje go za ciebie.',
  businessExplicaRespuesta: 'Napiszę uprzejmą i jasną odpowiedź dla twojego klienta, gotową do wysłania.',
  businessExplicaResultados: 'Przejrzę twoje wyniki, opowiem, co zadziałało i co warto zrobić w tym tygodniu.',
  businessExplicaCampana: 'Poznam twój biznes, zaprojektuję kampanię (ton: {{tono}}) i stworzę jej główny obraz.',
  businessExplicaCv: 'Poznam twoje doświadczenie i przygotuję twoje CV (ton: {{tono}}), gotowe do użycia.',
  businessExplicaPresentacion: 'Najpierw poznam twój biznes, a potem napiszę prezentację slajd po slajdzie (ton: {{tono}}).',
  businessExplicaDocumento: 'Najpierw poznam twój biznes, a potem przygotuję dokument (ton: {{tono}}).',
  businessExplicaIdeas: 'Najpierw poznam twój biznes, a potem zaproponuję konkretne pomysły i strategię rozwoju.',

  businessTonoProfesionalPeroCercano: 'profesjonalny, ale przyjazny',

  businessDecisionTonoProfesionalPeroCercano: 'używam profesjonalnego, ale przyjaznego tonu',
  businessDecisionTonoCercanoYProfesional: 'używam przyjaznego i profesjonalnego tonu',
  businessDecisionTonoProfesional: 'używam profesjonalnego tonu',
  businessDecisionIdeasConcretas: 'zaczynam od konkretnych pomysłów',

  businessPasoEntender: 'Poznawanie twojego biznesu i celu',
  businessPasoImagenPublicacion: 'Tworzenie obrazu do posta',
  businessPasoCalendario: 'Układanie kalendarza publikacji',
  businessPasoPrepararPublicacion: 'Przygotowywanie posta',
  businessPasoAdaptarACadaRed: 'Dopasowywanie do każdej sieci',
  businessPasoRespuesta: 'Pisanie odpowiedzi dla twojego klienta',
  businessPasoResultados: 'Przegląd i omówienie twoich wyników',
  businessPasoCampana: 'Projektowanie kampanii',
  businessPasoImagenCampana: 'Tworzenie obrazu kampanii',
  businessPasoPresentacion: 'Pisanie prezentacji (slajd po slajdzie)',
  businessPasoMercado: 'Sprawdzanie, jak teraz wygląda twój rynek',
  businessPasoIdeas: 'Proponowanie pomysłów i strategii',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Zaproponuję ci trzy kierunki podróży {{fechas}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż.',
  travelExplicaDestinosDias_one: 'Zaproponuję ci trzy kierunki na {{contador}} dzień · {{lasNoches}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż.',
  travelExplicaDestinosDias_few: 'Zaproponuję ci trzy kierunki na {{contador}} dni · {{lasNoches}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż.',
  travelExplicaDestinosDias_many: 'Zaproponuję ci trzy kierunki na {{contador}} dni · {{lasNoches}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż.',
  travelExplicaDestinosDias_other: 'Zaproponuję ci trzy kierunki na {{contador}} dnia · {{lasNoches}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż.',
  travelExplicaDestinosDiasAviso_one: 'Zaproponuję ci trzy kierunki na {{contador}} dzień · {{lasNoches}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',
  travelExplicaDestinosDiasAviso_few: 'Zaproponuję ci trzy kierunki na {{contador}} dni · {{lasNoches}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',
  travelExplicaDestinosDiasAviso_many: 'Zaproponuję ci trzy kierunki na {{contador}} dni · {{lasNoches}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',
  travelExplicaDestinosDiasAviso_other: 'Zaproponuję ci trzy kierunki na {{contador}} dnia · {{lasNoches}}, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',
  travelExplicaDestinosTuViaje: 'Zaproponuję ci trzy kierunki twojej podróży, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż.',
  travelExplicaDestinosTuViajeAviso: 'Zaproponuję ci trzy kierunki twojej podróży, z myślą o tym, czego szukasz: {{busca}}. Gdy wybierzesz jeden z nich, przygotuję całą podróż. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',

  travelBuscaSorpresa: 'coś, co cię zaskoczy',

  travelExplicaItinerarioFechas_one: 'Przygotuję ci plan podróży {{fechas}} ({{contador}} dzień · {{lasNoches}}), dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioFechas_few: 'Przygotuję ci plan podróży {{fechas}} ({{contador}} dni · {{lasNoches}}), dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioFechas_many: 'Przygotuję ci plan podróży {{fechas}} ({{contador}} dni · {{lasNoches}}), dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioFechas_other: 'Przygotuję ci plan podróży {{fechas}} ({{contador}} dnia · {{lasNoches}}), dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioDias_one: 'Przygotuję ci plan podróży na {{contador}} dzień · {{lasNoches}}, dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioDias_few: 'Przygotuję ci plan podróży na {{contador}} dni · {{lasNoches}}, dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioDias_many: 'Przygotuję ci plan podróży na {{contador}} dni · {{lasNoches}}, dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioDias_other: 'Przygotuję ci plan podróży na {{contador}} dnia · {{lasNoches}}, dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioDiasAviso_one: 'Przygotuję ci plan podróży na {{contador}} dzień · {{lasNoches}}, dzień po dniu i z przybliżonym budżetem. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',
  travelExplicaItinerarioDiasAviso_few: 'Przygotuję ci plan podróży na {{contador}} dni · {{lasNoches}}, dzień po dniu i z przybliżonym budżetem. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',
  travelExplicaItinerarioDiasAviso_many: 'Przygotuję ci plan podróży na {{contador}} dni · {{lasNoches}}, dzień po dniu i z przybliżonym budżetem. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',
  travelExplicaItinerarioDiasAviso_other: 'Przygotuję ci plan podróży na {{contador}} dnia · {{lasNoches}}, dzień po dniu i z przybliżonym budżetem. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',
  travelExplicaItinerarioTuViaje: 'Przygotuję ci plan twojej podróży, dzień po dniu i z przybliżonym budżetem.',
  travelExplicaItinerarioTuViajeAviso: 'Przygotuję ci plan twojej podróży, dzień po dniu i z przybliżonym budżetem. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu.',

  travelExplicaQueHacer: 'Sprawdzę, co warto zobaczyć i gdzie zjeść, i podam źródło każdej informacji, żeby można je było zweryfikować.',
  travelExplicaMoverse: 'Sprawdzę, jak możesz się poruszać, ile to trwa i ile mniej więcej kosztuje.',

  travelLasNoches_one: '{{contador}} noc',
  travelLasNoches_few: '{{contador}} noce',
  travelLasNoches_many: '{{contador}} nocy',
  travelLasNoches_other: '{{contador}} nocy',

  travelDecisionTresViajes: 'proponuję trzy zupełnie różne podróże',
  travelDecisionTresViajesAviso: 'proponuję trzy zupełnie różne podróże. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu',
  travelDecisionReparto: 'dzielę dni między to, co najlepsze w każdej dziedzinie',
  travelDecisionRepartoAviso: 'dzielę dni między to, co najlepsze w każdej dziedzinie. Gdy poznasz daty, podaj mi je, a dopasuję plan do sezonu',

  travelPasoDestinos: 'Szukanie trzech pasujących kierunków',
  travelPasoQueHacer: 'Sprawdzanie, co warto zobaczyć i gdzie zjeść',
  travelPasoMoverse: 'Sprawdzanie, jak się poruszać',
  travelPasoItinerario_one: 'Przygotowywanie planu podróży na {{contador}} dzień',
  travelPasoItinerario_few: 'Przygotowywanie planu podróży na {{contador}} dni',
  travelPasoItinerario_many: 'Przygotowywanie planu podróży na {{contador}} dni',
  travelPasoItinerario_other: 'Przygotowywanie planu podróży na {{contador}} dnia',
  travelPasoItinerarioTuViaje: 'Przygotowywanie planu twojej podróży',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Dobrze zrozumiem, czego potrzebujesz, i przygotuję jasną odpowiedź z kolejnymi krokami.',
  brainDecisionPuntoDePartida: 'proponuję punkt wyjścia, a w razie potrzeby przekieruję cię do odpowiedniego specjalisty Weë',
  brainPasoEntender: 'Dokładne rozumienie tego, czego potrzebujesz',
  brainPasoRespuesta: 'Przygotowywanie jasnej odpowiedzi z kolejnymi krokami',
};
