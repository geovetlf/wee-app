/*
 * SUECO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` trae su «för» («för två», «för familjen») y `{{tiempo}}` entra detrás de «klart på» («en halvtimme»).
 * El espacio de Weë Home es «rum» y el estilo, un adjetivo sin artículo en «i {{estilo}} stil» («i mysig stil»).
 * «Lista de compras», «inköpslista» (glosario § 9).
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  chefExplicaRetoqueLuz: 'Jag utgår från ditt foto och förbättrar ljuset. Rätten förblir precis som den är.',
  chefExplicaRetoqueFondo: 'Jag utgår från ditt foto och byter bakgrund. Rätten förblir precis som den är.',
  chefExplicaRetoqueApetitoso: 'Jag utgår från ditt foto och får det att se godare ut. Rätten förblir precis som den är.',
  chefExplicaRetoqueRestaurante: 'Jag utgår från ditt foto och får det att se ut som på restaurang. Rätten förblir precis som den är.',
  chefExplicaRetoqueQuitar: 'Jag utgår från ditt foto och tar bort det du inte vill ha. Rätten förblir precis som den är.',
  chefExplicaRetoqueNoSe: 'Jag utgår från ditt foto och får det att se bättre ut utan att ändra rätten. Rätten förblir precis som den är.',
  chefExplicaRetoqueLibre: 'Jag utgår från ditt foto och gör bara de ändringar du bad om. Rätten förblir precis som den är.',

  chefExplicaMenuTresDias: 'Jag sätter ihop en meny för tre dagar, {{comensales}}, och ger dig inköpslistan.',
  chefExplicaMenuTodaLaSemana: 'Jag sätter ihop en meny för hela veckan, {{comensales}}, och ger dig inköpslistan.',
  chefExplicaMenuParaLaSemana: 'Jag sätter ihop en veckomeny, {{comensales}}, och ger dig inköpslistan.',
  chefExplicaMenu: 'Jag sätter ihop en meny för {{duracion}}, {{comensales}}, och ger dig inköpslistan.',

  chefExplicaRecetaEnTiempo: 'Jag tar fram ett recept steg för steg, {{comensales}}, klart på {{tiempo}}, och ett foto av hur rätten blir.',
  chefExplicaRecetaSinApuro: 'Jag tar fram ett recept steg för steg, {{comensales}}, utan tidsgräns, och ett foto av hur rätten blir.',
  chefExplicaConLoQueTienesEnTiempo: 'Jag tar fram ett recept, {{comensales}}, med det du har hemma, klart på {{tiempo}}, och ett foto av hur rätten blir.',
  chefExplicaConLoQueTienesSinApuro: 'Jag tar fram ett recept, {{comensales}}, med det du har hemma, utan tidsgräns, och ett foto av hur rätten blir.',
  chefExplicaSaludableEnTiempo: 'Jag tar fram ett nyttigt recept, {{comensales}}, klart på {{tiempo}}, och ett foto av hur rätten blir.',
  chefExplicaSaludableSinApuro: 'Jag tar fram ett nyttigt recept, {{comensales}}, utan tidsgräns, och ett foto av hur rätten blir.',
  chefExplicaPostreEnTiempo: 'Jag tar fram en efterrätt, {{comensales}}, klar på {{tiempo}}, och ett foto av hur den blir.',
  chefExplicaPostreSinApuro: 'Jag tar fram en efterrätt, {{comensales}}, utan tidsgräns, och ett foto av hur den blir.',

  chefDecisionAlgoRico: 'jag föreslår något gott och enkelt med det du brukar ha hemma',
  chefDecisionParaDos: 'jag planerade för två',
  chefDecisionSinApuro: 'jag satte ingen tidsgräns',
  chefDecisionTodaLaSemana: 'jag gör den för hela veckan',

  chefPasoMirarIngredientes: 'Titta på vilka ingredienser du har',
  chefPasoEscribirReceta: 'Skriva receptet steg för steg',
  chefPasoFotoDelPlato: 'Skapa ett foto av rätten',
  chefPasoArmarMenu: 'Sätta ihop menyn',
  chefPasoPreciosIngredientes: 'Kontrollera vad ingredienserna kostar',
  chefPasoListaDeCompras: 'Skriva inköpslistan',
  chefPasoRetocarFoto: 'Retuschera fotot av din rätt',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  homeExplicaConsejo: 'Jag tittar på {{espacio}} och berättar vad jag skulle ändra – möbler, färger, möblering – så att du kan välja var du vill börja. Jag skapar inga bilder än.',
  homeExplicaIdeas: 'Jag hittar tre idéer för {{espacio}} i {{estilo}} stil och förklarar hur du kan genomföra dem.',
  homeExplicaDistribucion: 'Jag tittar på {{espacio}}, föreslår en möblering som utnyttjar utrymmet bättre och visar hur det skulle se ut med dina egna möbler.',
  homeExplicaRedisenar: 'Jag gör om {{espacio}} i {{estilo}} stil, i två versioner, och ger dig en lista med ändringar och saker att köpa.',
  homeExplicaMuebles: 'Jag byter möblerna i {{espacio}} till {{estilo}} stil, i två versioner, och ger dig en lista med ändringar och saker att köpa.',
  homeExplicaColores: 'Jag ändrar utseendet och färgerna i {{espacio}} till {{estilo}} stil, i två versioner, och ger dig en lista med ändringar och saker att köpa.',
  homeExplicaExterior: 'Jag designar din uteplats i {{estilo}} stil, i två versioner, och ger dig en lista med ändringar och saker att köpa.',

  homeDecisionEmpiezoPorLaSala: 'jag börjar med vardagsrummet',
  homeDecisionEstiloAcogedor: 'jag valde en mysig stil',

  homePasoMirarFotoDelEspacio: 'Titta på fotot av rummet',
  homePasoRedisenar: 'Göra om {{espacio}} i {{estilo}} stil',
  homePasoMuebles: 'Byta möblerna i {{espacio}} till {{estilo}} stil',
  homePasoColores: 'Ändra utseendet och färgerna i {{espacio}} till {{estilo}} stil',
  homePasoExterior: 'Designa din uteplats i {{estilo}} stil',
  homePasoListaDeCambios: 'Sätta ihop listan med ändringar och saker att köpa',
  homePasoProponerDistribucion: 'Föreslå en bättre möblering',
  homePasoMostrarComoQuedaria: 'Visa hur det skulle se ut',
  homePasoBuscarIdeas: 'Hitta idéer för {{espacio}}',
  homePasoExplicarComoLograrlo: 'Förklara hur du gör',
  homePasoMirarFotoDeTuEspacio: 'Titta på fotot av ditt rum',
  homePasoContarQueVeo: 'Berätta vad jag ser och vad jag skulle göra',

  /* La voz de quien habla: Weë dice «dig», no «mig» (ver el catálogo español). */
  chefComensalesSoloParaMi: 'bara för dig',
  homeEspacioMiOficina: 'ditt kontor',
};
