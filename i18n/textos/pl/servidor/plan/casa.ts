/*
 * POLACO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tiempo}}`, `{{duracion}}`, `{{espacio}}` y `{{estilo}}` van entre paréntesis o tras dos puntos, en nominativo:
 * «(czas: pół godziny)», «(salon, styl: przytulny)». `{{comensales}}` ya trae su preposición («dla rodziny»).
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Wyjdę od twojego zdjęcia i poprawię światło. Danie pozostanie dokładnie takie, jakie jest.',
  chefExplicaRetoqueFondo: 'Wyjdę od twojego zdjęcia i zmienię tło. Danie pozostanie dokładnie takie, jakie jest.',
  chefExplicaRetoqueApetitoso: 'Wyjdę od twojego zdjęcia i sprawię, że będzie wyglądać apetyczniej. Danie pozostanie dokładnie takie, jakie jest.',
  chefExplicaRetoqueRestaurante: 'Wyjdę od twojego zdjęcia i nadam mu wygląd zdjęcia z restauracji. Danie pozostanie dokładnie takie, jakie jest.',
  chefExplicaRetoqueQuitar: 'Wyjdę od twojego zdjęcia i usunę to, co zbędne. Danie pozostanie dokładnie takie, jakie jest.',
  chefExplicaRetoqueNoSe: 'Wyjdę od twojego zdjęcia i poprawię jego wygląd bez zmieniania dania. Danie pozostanie dokładnie takie, jakie jest.',
  chefExplicaRetoqueLibre: 'Wyjdę od twojego zdjęcia i wprowadzę wyłącznie zmiany, o które prosisz. Danie pozostanie dokładnie takie, jakie jest.',

  chefExplicaMenuTresDias: 'Ułożę menu na trzy dni, {{comensales}}, i dodam listę zakupów.',
  chefExplicaMenuTodaLaSemana: 'Ułożę menu na cały tydzień, {{comensales}}, i dodam listę zakupów.',
  chefExplicaMenuParaLaSemana: 'Ułożę menu na tydzień, {{comensales}}, i dodam listę zakupów.',
  chefExplicaMenu: 'Ułożę menu (czas trwania: {{duracion}}), {{comensales}}, i dodam listę zakupów.',

  chefExplicaRecetaEnTiempo: 'Przygotuję przepis krok po kroku (czas: {{tiempo}}), {{comensales}}, oraz zdjęcie gotowego dania.',
  chefExplicaRecetaSinApuro: 'Przygotuję przepis krok po kroku, bez pośpiechu, {{comensales}}, oraz zdjęcie gotowego dania.',
  chefExplicaConLoQueTienesEnTiempo: 'Przygotuję przepis z tego, co masz w domu (czas: {{tiempo}}), {{comensales}}, oraz zdjęcie gotowego dania.',
  chefExplicaConLoQueTienesSinApuro: 'Przygotuję przepis z tego, co masz w domu, bez pośpiechu, {{comensales}}, oraz zdjęcie gotowego dania.',
  chefExplicaSaludableEnTiempo: 'Przygotuję zdrowy przepis (czas: {{tiempo}}), {{comensales}}, oraz zdjęcie gotowego dania.',
  chefExplicaSaludableSinApuro: 'Przygotuję zdrowy przepis, bez pośpiechu, {{comensales}}, oraz zdjęcie gotowego dania.',
  chefExplicaPostreEnTiempo: 'Przygotuję deser (czas: {{tiempo}}), {{comensales}}, oraz zdjęcie gotowego dania.',
  chefExplicaPostreSinApuro: 'Przygotuję deser, bez pośpiechu, {{comensales}}, oraz zdjęcie gotowego dania.',

  chefDecisionAlgoRico: 'proponuję coś pysznego i łatwego z tego, co zwykle masz w domu',
  chefDecisionParaDos: 'liczę porcje dla dwóch osób',
  chefDecisionSinApuro: 'bez pośpiechu',
  chefDecisionTodaLaSemana: 'układam plan na cały tydzień',

  chefPasoMirarIngredientes: 'Sprawdzanie, jakie masz składniki',
  chefPasoEscribirReceta: 'Pisanie przepisu krok po kroku',
  chefPasoFotoDelPlato: 'Tworzenie zdjęcia dania',
  chefPasoArmarMenu: 'Układanie menu',
  chefPasoPreciosIngredientes: 'Sprawdzanie cen składników',
  chefPasoListaDeCompras: 'Przygotowywanie listy zakupów',
  chefPasoRetocarFoto: 'Retusz zdjęcia twojego dania',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Obejrzę twoje wnętrze ({{espacio}}) i powiem ci, co warto zmienić — meble, kolory, układ — a ty wybierzesz, od czego zacząć. Na razie nie generuję żadnego obrazu.',
  homeExplicaIdeas: 'Znajdę trzy pomysły na twoje wnętrze ({{espacio}}, styl: {{estilo}}) i wyjaśnię, jak je zrealizować.',
  homeExplicaDistribucion: 'Obejrzę twoje wnętrze ({{espacio}}), zaproponuję układ, który lepiej wykorzysta przestrzeń, i pokażę, jak wyglądałby z twoimi meblami.',
  homeExplicaRedisenar: 'Stworzę nowy projekt wnętrza ({{espacio}}, styl: {{estilo}}) w dwóch propozycjach i dodam listę zmian oraz zakupów.',
  homeExplicaMuebles: 'Zmienię meble we wnętrzu ({{espacio}}, styl: {{estilo}}) w dwóch propozycjach i dodam listę zmian oraz zakupów.',
  homeExplicaColores: 'Zmienię styl i kolory wnętrza ({{espacio}}, nowy styl: {{estilo}}) w dwóch propozycjach i dodam listę zmian oraz zakupów.',
  homeExplicaExterior: 'Zaprojektuję twoją przestrzeń zewnętrzną (styl: {{estilo}}) w dwóch propozycjach i dodam listę zmian oraz zakupów.',

  homeDecisionEmpiezoPorLaSala: 'zaczynam od salonu',
  homeDecisionEstiloAcogedor: 'wybieram przytulny styl',

  homePasoMirarFotoDelEspacio: 'Oglądanie zdjęcia wnętrza',
  homePasoRedisenar: 'Nowy projekt wnętrza ({{espacio}}, styl: {{estilo}})',
  homePasoMuebles: 'Zmiana mebli ({{espacio}}, styl: {{estilo}})',
  homePasoColores: 'Zmiana stylu i kolorów ({{espacio}}, styl: {{estilo}})',
  homePasoExterior: 'Projekt twojej przestrzeni zewnętrznej (styl: {{estilo}})',
  homePasoListaDeCambios: 'Przygotowywanie listy zmian i zakupów',
  homePasoProponerDistribucion: 'Proponowanie lepszego układu',
  homePasoMostrarComoQuedaria: 'Pokazywanie, jak by to wyglądało',
  homePasoBuscarIdeas: 'Szukanie pomysłów ({{espacio}})',
  homePasoExplicarComoLograrlo: 'Wyjaśnianie, jak to osiągnąć',
  homePasoMirarFotoDeTuEspacio: 'Oglądanie zdjęcia twojego wnętrza',
  homePasoContarQueVeo: 'Opis tego, co widać i co warto zrobić',

  /* LA VOZ DE QUIEN HABLA: Weë habla de «ti», no de «mí». */
  chefComensalesSoloParaMi: 'tylko dla ciebie',
  homeEspacioMiOficina: 'twoje biuro',
};
