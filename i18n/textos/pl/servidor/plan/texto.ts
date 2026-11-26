/*
 * POLACO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{idioma}}` entra detrás de «na» en acusativo, que coincide con el nominativo («na angielski»). Tono, estilo, ánimo y
 * voz van detrás de dos puntos con su sustantivo («ton: przyjazny»); `{{cambio}}` y `{{ocasion}}`, también.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Wyszukam prawdziwe cytaty na ten temat i podam źródło każdego z nich, żeby można je było sprawdzić.',
  writerPasoCitas: 'Wyszukiwanie cytatów i ich źródeł',

  writerExplicaTraducir: 'Przetłumaczę twój tekst na {{idioma}}, zachowując sens i ton.',
  writerPasoTraducir: 'Tłumaczenie na {{idioma}}',
  writerDecisionIdiomaIngles: 'tłumaczę na angielski',
  writerIdiomaEn: 'angielski',
  writerIdiomaPt: 'portugalski',
  writerIdiomaFr: 'francuski',
  writerIdiomaIt: 'włoski',

  writerExplicaResumir: 'Streszczę twój tekst do kluczowych myśli w kilku linijkach.',
  writerPasoResumir: 'Streszczanie do kluczowych myśli',
  writerExplicaCorregir: 'Poprawię ortografię, styl i przejrzystość, nie zmieniając tego, co chcesz powiedzieć.',
  writerPasoCorregir: 'Poprawianie ortografii, stylu i przejrzystości',
  writerExplicaIdeas: 'Zaproponuję ci kilka pomysłów i punkt wyjścia, żeby pisanie szło bez blokady.',
  writerPasoIdeas: 'Proponowanie pomysłów do pisania',

  writerExplicaPortada: 'Określę koncepcję okładki i stworzę trzy propozycje do wyboru.',
  writerPasoConceptoPortada: 'Określanie koncepcji okładki',
  writerPasoPropuestasPortada: 'Tworzenie 3 propozycji okładki',

  writerExplicaReescribir: 'Przepiszę twój tekst, zachowując główną myśl (ton: {{tono}}).',
  writerPasoReescribir: 'Przepisywanie tekstu',
  writerExplicaCv: 'Przygotuję twoje CV (ton: {{tono}}), gotowe do użycia w edytorze i wysłania.',
  writerPasoCv: 'Przygotowywanie twojego CV',

  writerExplicaPublicacion: 'Napiszę post (ton: {{tono}}), a potem go dopracuję, żeby był gotowy.',
  writerExplicaHistoria: 'Napiszę opowiadanie (ton: {{tono}}), a potem je dopracuję, żeby było gotowe.',
  writerExplicaGuion: 'Napiszę scenariusz (ton: {{tono}}), a potem go dopracuję, żeby był gotowy.',
  writerExplicaArticulo: 'Napiszę artykuł (ton: {{tono}}), a potem go dopracuję, żeby był gotowy.',
  writerExplicaEmail: 'Napiszę e-mail (ton: {{tono}}), a potem go dopracuję, żeby był gotowy.',
  writerExplicaDocumento: 'Przygotuję dokument (ton: {{tono}}), a potem go dopracuję, żeby był gotowy.',
  writerPasoPublicacion: 'Pisanie posta',
  writerPasoHistoria: 'Pisanie opowiadania',
  writerPasoGuion: 'Pisanie scenariusza',
  writerPasoArticulo: 'Pisanie artykułu',
  writerPasoEmail: 'Pisanie e-maila',
  writerPasoDocumento: 'Przygotowywanie dokumentu',
  writerPasoPulir: 'Dopracowywanie tekstu do gotowej formy',

  writerDecisionEmpiezoPublicacion: 'zaczynam od posta',
  writerDecisionTonoCercano: 'używam przyjaznego tonu',
  writerDecisionTonoProfesional: 'używam profesjonalnego tonu',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Przygotuję tekst i nagram go (głos: {{voz}}).',
  musicExplicaVozCalida: 'Przygotuję tekst i nagram go ciepłym, wyraźnym głosem.',
  musicPasoTextoNarracion: 'Przygotowywanie tekstu narracji',
  musicPasoGrabarVoz: 'Nagrywanie głosu',

  musicExplicaLetra: 'Napiszę cały tekst piosenki (styl: {{estilo}}).',
  musicPasoLetraCompleta: 'Pisanie całego tekstu piosenki',

  musicExplicaMezcla: 'Przesłucham twoją piosenkę, zrobię miks i mastering, żeby brzmiała profesjonalnie.',
  musicPasoAnotarMezcla: 'Słuchanie piosenki i notatki do miksu',
  musicPasoMasterizar: 'Miks i mastering',

  musicExplicaVideoclip: 'Stworzę piosenkę ({{estilo}}, {{animo}}), sceny i cały teledysk. Nie musisz wychodzić z Weë Music.',
  musicPasoIdeaYLetra: 'Pisanie pomysłu i tekstu piosenki',
  musicPasoEscenas: 'Tworzenie scen teledysku',
  musicPasoArmarVideoclip: 'Składanie teledysku z twoją piosenką',

  musicExplicaJingle: 'Stworzę krótki, wpadający w ucho dżingiel (styl: {{estilo}}, nastrój: {{animo}}).',
  musicPasoFraseJingle: 'Pisanie hasła dżingla',
  musicPasoJingle: 'Tworzenie dżingla',
  musicExplicaBeat: 'Stworzę beat (styl: {{estilo}}, nastrój: {{animo}}).',
  musicPasoIdeaMusical: 'Określanie pomysłu muzycznego',
  musicPasoBeat: 'Tworzenie beatu',

  musicExplicaCancion: 'Napiszę tekst, stworzę piosenkę (styl: {{estilo}}, nastrój: {{animo}}) i zaprojektuję jej okładkę.',
  musicPasoLetra: 'Pisanie tekstu piosenki',
  musicPasoCancion: 'Tworzenie piosenki',
  musicPasoPortada: 'Projektowanie okładki',

  musicDecisionEmpiezoCancion: 'zaczynam od piosenki',
  musicDecisionEstiloPop: 'wybieram styl pop',
  musicDecisionAnimoAlegre: 'z radosnym nastrojem',
  musicDecisionVozCalida: 'wybieram ciepły i wyraźny głos',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Obejrzę twoje zdjęcie i ułożę prostą rutynę pielęgnacji skóry z łatwo dostępnymi produktami.',
  beautyPasoRutina: 'Układanie twojej rutyny pielęgnacji',

  beautyExplicaRostro: 'Obejrzę twoją twarz, polecę cięcia i style, które najbardziej do ciebie pasują, i wypróbuję dwa z nich na twoim zdjęciu.',
  beautyPasoMirarRostro: 'Oglądanie twojej twarzy',
  beautyPasoRecomendar: 'Polecanie cięć, okularów i stylów',
  beautyPasoProbarDosEstilos: 'Wypróbowanie dwóch najlepiej pasujących stylów',

  beautyExplicaProbar: 'Przygotuję dwie wersje do wypróbowania (co: {{cambio}}; okazja: {{ocasion}}), zachowując twoją twarz, skórę i światło ze zdjęcia.',
  beautyPasoProbar: 'Przymiarka ({{cambio}}) z zachowaniem twojej twarzy',
  beautyOcasionElDiaADia: 'na co dzień',

  beautyDecisionCambioCompleto: 'proponuję pełną metamorfozę',
  beautyDecisionOcasionDiaADia: 'myślę o stylu na co dzień',
};
