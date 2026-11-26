/*
 * NEERLANDÉS — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` trae su «voor» («voor twee»); `{{espacio}}` llega con su artículo («de woonkamer», «je kantoor») y
 * entra como objeto o detrás de «voor»; `{{estilo}}`, detrás de «in de stijl», sin concordar con nada.
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Ik ga uit van je foto en verbeter het licht. Het gerecht blijft precies zoals het is.',
  chefExplicaRetoqueFondo: 'Ik ga uit van je foto en verander de achtergrond. Het gerecht blijft precies zoals het is.',
  chefExplicaRetoqueApetitoso: 'Ik ga uit van je foto en laat het er smakelijker uitzien. Het gerecht blijft precies zoals het is.',
  chefExplicaRetoqueRestaurante: 'Ik ga uit van je foto en geef hem de uitstraling van een restaurantfoto. Het gerecht blijft precies zoals het is.',
  chefExplicaRetoqueQuitar: 'Ik ga uit van je foto en haal weg wat te veel is. Het gerecht blijft precies zoals het is.',
  chefExplicaRetoqueNoSe: 'Ik ga uit van je foto en laat hem er beter uitzien zonder het gerecht te veranderen. Het gerecht blijft precies zoals het is.',
  chefExplicaRetoqueLibre: 'Ik ga uit van je foto en voer alleen de wijzigingen door die je hebt aangegeven. Het gerecht blijft precies zoals het is.',

  chefExplicaMenuTresDias: 'Ik stel een menu voor drie dagen samen, {{comensales}}, en geef je de boodschappenlijst.',
  chefExplicaMenuTodaLaSemana: 'Ik stel een menu voor de hele week samen, {{comensales}}, en geef je de boodschappenlijst.',
  chefExplicaMenuParaLaSemana: 'Ik stel een menu voor de week samen, {{comensales}}, en geef je de boodschappenlijst.',
  chefExplicaMenu: 'Ik stel een menu samen (duur: {{duracion}}), {{comensales}}, en geef je de boodschappenlijst.',

  chefExplicaRecetaEnTiempo: 'Ik maak een stap-voor-staprecept dat in {{tiempo}} klaar is, {{comensales}}, en een foto van het eindresultaat.',
  chefExplicaRecetaSinApuro: 'Ik maak een stap-voor-staprecept zonder haast, {{comensales}}, en een foto van het eindresultaat.',
  chefExplicaConLoQueTienesEnTiempo: 'Ik maak een recept met wat je in huis hebt dat in {{tiempo}} klaar is, {{comensales}}, en een foto van het eindresultaat.',
  chefExplicaConLoQueTienesSinApuro: 'Ik maak een recept met wat je in huis hebt, zonder haast, {{comensales}}, en een foto van het eindresultaat.',
  chefExplicaSaludableEnTiempo: 'Ik maak een gezond recept dat in {{tiempo}} klaar is, {{comensales}}, en een foto van het eindresultaat.',
  chefExplicaSaludableSinApuro: 'Ik maak een gezond recept zonder haast, {{comensales}}, en een foto van het eindresultaat.',
  chefExplicaPostreEnTiempo: 'Ik maak een dessert dat in {{tiempo}} klaar is, {{comensales}}, en een foto van het eindresultaat.',
  chefExplicaPostreSinApuro: 'Ik maak een dessert zonder haast, {{comensales}}, en een foto van het eindresultaat.',

  chefDecisionAlgoRico: 'stel ik iets lekkers en makkelijks voor met wat je meestal in huis hebt',
  chefDecisionParaDos: 'heb ik het voor twee bedacht',
  chefDecisionSinApuro: 'doe ik het zonder haast',
  chefDecisionTodaLaSemana: 'maak ik het voor de hele week',

  chefPasoMirarIngredientes: 'Kijken welke ingrediënten je hebt',
  chefPasoEscribirReceta: 'Het recept stap voor stap schrijven',
  chefPasoFotoDelPlato: 'Een foto van het gerecht maken',
  chefPasoArmarMenu: 'Het menu samenstellen',
  chefPasoPreciosIngredientes: 'Kijken wat de ingrediënten kosten',
  chefPasoListaDeCompras: 'De boodschappenlijst maken',
  chefPasoRetocarFoto: 'De foto van je gerecht bewerken',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Ik bekijk {{espacio}} en vertel je wat ik zou veranderen – meubels, kleuren, indeling – zodat jij kunt kiezen waar je begint. Ik maak nog geen afbeelding.',
  homeExplicaIdeas: 'Ik zoek drie ideeën voor {{espacio}} in de stijl {{estilo}} en leg je uit hoe je ze bereikt.',
  homeExplicaDistribucion: 'Ik bekijk {{espacio}}, stel een indeling voor die de ruimte beter benut en laat je zien hoe het eruit zou zien met je eigen meubels.',
  homeExplicaRedisenar: 'Ik ontwerp {{espacio}} opnieuw in de stijl {{estilo}}, in twee voorstellen, en geef je de lijst met wijzigingen en aankopen.',
  homeExplicaMuebles: 'Ik verander de meubels voor {{espacio}} in de stijl {{estilo}}, in twee voorstellen, en geef je de lijst met wijzigingen en aankopen.',
  homeExplicaColores: 'Ik verander de uitstraling en de kleuren van {{espacio}} in de stijl {{estilo}}, in twee voorstellen, en geef je de lijst met wijzigingen en aankopen.',
  homeExplicaExterior: 'Ik ontwerp je buitenruimte in de stijl {{estilo}}, in twee voorstellen, en geef je de lijst met wijzigingen en aankopen.',

  homeDecisionEmpiezoPorLaSala: 'begin ik met de woonkamer',
  homeDecisionEstiloAcogedor: 'heb ik een gezellige stijl gekozen',

  homePasoMirarFotoDelEspacio: 'De foto van de ruimte bekijken',
  homePasoRedisenar: 'Nieuw ontwerp voor {{espacio}} in de stijl {{estilo}}',
  homePasoMuebles: 'Nieuwe meubels voor {{espacio}} in de stijl {{estilo}}',
  homePasoColores: 'Nieuwe uitstraling en kleuren voor {{espacio}} in de stijl {{estilo}}',
  homePasoExterior: 'Je buitenruimte ontwerpen in de stijl {{estilo}}',
  homePasoListaDeCambios: 'De lijst met wijzigingen en aankopen maken',
  homePasoProponerDistribucion: 'Een betere indeling voorstellen',
  homePasoMostrarComoQuedaria: 'Laten zien hoe het eruit zou zien',
  homePasoBuscarIdeas: 'Ideeën zoeken voor {{espacio}}',
  homePasoExplicarComoLograrlo: 'Uitleggen hoe je het bereikt',
  homePasoMirarFotoDeTuEspacio: 'De foto van je ruimte bekijken',
  homePasoContarQueVeo: 'Vertellen wat ik zie en wat ik zou doen',

  chefComensalesSoloParaMi: 'alleen voor jou',
  homeEspacioMiOficina: 'je kantoor',
};
