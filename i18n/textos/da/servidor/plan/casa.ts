/*
 * DANÉS — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Como en `visual.ts`: Weë habla en primera persona y en presente («Jeg laver …», «Jeg kigger på …»), y los pasos van
 * en infinitivo sin «at» («Skrive opskriften trin for trin»), porque son también el título del resultado.
 *
 * CHEF. Las personas llegan de `../opciones.ts` ya con su preposición —«kun til mig», «til to», «til familien», «til
 * mange»— y se leen detrás del plato sin nada más: «en madplan for tre dage til to», «en trin-for-trin-opskrift til
 * familien». El tiempo va detrás de «på» («som kan laves på 15 minutter», «… på en halv time»); con «Lige meget», la
 * frase sin tiempo dice «hvor du kan tage dig god tid» («sin apuro»). El menú de varios días es una «madplan», como
 * en `creator` (así se planifica la comida en Dinamarca), y los días entran detrás de «for» («for tre dage», «for
 * hele ugen»), lo que arregla de paso el «un menú tres días» del español. La duración que escribe la persona va
 * entre comas, porque la sigue otro hueco. «Paso a paso», «trin-for-trin-opskrift», compuesto con guiones; la lista
 * de la compra, «indkøbslisten» (glosario § 9.6); la foto que Weë crea, «et foto af den færdige ret». En los retoques
 * la foto es de la persona («dit foto») y «el plato se queda exactamente como está» es «Selve retten forbliver
 * præcis, som den er».
 *
 * HOME. Las habitaciones llegan en forma definida —«stuen», «soveværelset», «køkkenet», «badeværelset»— o «mit
 * kontor», y entran detrás de cualquier preposición o como sujeto («hvor stuen får nye møbler»); los estilos son
 * adjetivos de género común: «i en moderne stil», «en hyggelig stil». Las transformaciones dicen las dos propuestas
 * primero («Jeg laver to forslag, hvor …»): así el español «cambiar el estilo y los colores … en un estilo moderno»
 * se dice sin repetir «stil». Rediseñar es «indrette på ny», como el botón «Indret mit rum på ny»; el exterior, «dine
 * udeområder» («Udeområder og have»); la distribución, «møblering», porque se trata de colocar los muebles; «tu
 * espacio», «dit rum» (como `weeai`). La raya con espacios del consejo es la del inciso (guía § 5).
 *
 * LAS «…Decision…» cierran «Da du ikke var sikker, {{decision}}.»: empiezan por el verbo conjugado y su sujeto
 * (inversión V2): «laver jeg den til to», «starter jeg med stuen». «Den» es la receta o la madplan (las dos, en).
 * «Sin apuro», que en el español no tiene verbo, es «går jeg ikke efter en bestemt tid».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  chefExplicaRetoqueLuz: 'Jeg tager udgangspunkt i dit foto og gør lyset bedre. Selve retten forbliver præcis, som den er.',
  chefExplicaRetoqueFondo: 'Jeg tager udgangspunkt i dit foto og skifter baggrunden. Selve retten forbliver præcis, som den er.',
  chefExplicaRetoqueApetitoso: 'Jeg tager udgangspunkt i dit foto og får retten til at se mere appetitlig ud. Selve retten forbliver præcis, som den er.',
  chefExplicaRetoqueRestaurante: 'Jeg tager udgangspunkt i dit foto og giver det et restaurantlook. Selve retten forbliver præcis, som den er.',
  chefExplicaRetoqueQuitar: 'Jeg tager udgangspunkt i dit foto og fjerner det, der skal væk. Selve retten forbliver præcis, som den er.',
  chefExplicaRetoqueNoSe: 'Jeg tager udgangspunkt i dit foto og får det til at se bedre ud uden at ændre retten. Selve retten forbliver præcis, som den er.',
  chefExplicaRetoqueLibre: 'Jeg tager udgangspunkt i dit foto og laver kun de ændringer, du har bedt om. Selve retten forbliver præcis, som den er.',

  chefExplicaMenuTresDias: 'Jeg laver en madplan for tre dage {{comensales}} og giver dig indkøbslisten.',
  chefExplicaMenuTodaLaSemana: 'Jeg laver en madplan for hele ugen {{comensales}} og giver dig indkøbslisten.',
  chefExplicaMenuParaLaSemana: 'Jeg laver en madplan for ugen {{comensales}} og giver dig indkøbslisten.',
  chefExplicaMenu: 'Jeg laver en madplan for {{duracion}}, {{comensales}}, og giver dig indkøbslisten.',

  chefExplicaRecetaEnTiempo: 'Jeg skriver en trin-for-trin-opskrift {{comensales}}. Den kan laves på {{tiempo}}, og jeg laver også et billede af den færdige ret.',
  chefExplicaRecetaSinApuro: 'Jeg skriver en trin-for-trin-opskrift {{comensales}}. Du kan tage dig god tid, og jeg laver også et billede af den færdige ret.',
  chefExplicaConLoQueTienesEnTiempo: 'Jeg skriver en opskrift {{comensales}} med det, du har derhjemme. Den kan laves på {{tiempo}}, og jeg laver også et billede af den færdige ret.',
  chefExplicaConLoQueTienesSinApuro: 'Jeg skriver en opskrift {{comensales}} med det, du har derhjemme. Du kan tage dig god tid, og jeg laver også et billede af den færdige ret.',
  chefExplicaSaludableEnTiempo: 'Jeg skriver en sund opskrift {{comensales}}. Den kan laves på {{tiempo}}, og jeg laver også et billede af den færdige ret.',
  chefExplicaSaludableSinApuro: 'Jeg skriver en sund opskrift {{comensales}}. Du kan tage dig god tid, og jeg laver også et billede af den færdige ret.',
  chefExplicaPostreEnTiempo: 'Jeg skriver en opskrift på en dessert {{comensales}}. Den kan laves på {{tiempo}}, og jeg laver også et billede af den færdige ret.',
  chefExplicaPostreSinApuro: 'Jeg skriver en opskrift på en dessert {{comensales}}. Du kan tage dig god tid, og jeg laver også et billede af den færdige ret.',

  chefDecisionAlgoRico: 'foreslår jeg noget lækkert og nemt med det, du plejer at have derhjemme',
  chefDecisionParaDos: 'laver jeg den til to',
  chefDecisionSinApuro: 'går jeg ikke efter en bestemt tid',
  chefDecisionTodaLaSemana: 'laver jeg den for hele ugen',

  chefPasoMirarIngredientes: 'Kigge på, hvilke ingredienser du har',
  chefPasoEscribirReceta: 'Skrive opskriften trin for trin',
  chefPasoFotoDelPlato: 'Lave et billede af retten',
  chefPasoArmarMenu: 'Sammensætte madplanen',
  chefPasoPreciosIngredientes: 'Undersøge, hvad ingredienserne koster',
  chefPasoListaDeCompras: 'Lave indkøbslisten',
  chefPasoRetocarFoto: 'Retouchere fotoet af din ret',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  homeExplicaConsejo: 'Jeg kigger på {{espacio}} og fortæller dig, hvad jeg ville ændre – møbler, farver, placering – så du kan vælge, hvor du vil starte. Jeg laver ikke nogen billeder endnu.',
  homeExplicaIdeas: 'Jeg finder tre idéer til {{espacio}} i en {{estilo}} stil og forklarer dig, hvordan du gør dem til virkelighed.',
  homeExplicaDistribucion: 'Jeg kigger på {{espacio}}, foreslår en møblering, der udnytter pladsen bedre, og viser dig, hvordan det ville se ud med dine egne møbler.',
  homeExplicaRedisenar: 'Jeg laver to forslag til en ny indretning af {{espacio}} i en {{estilo}} stil og giver dig en liste over ændringer og indkøb.',
  homeExplicaMuebles: 'Jeg laver to forslag, hvor {{espacio}} får nye møbler i en {{estilo}} stil, og giver dig en liste over ændringer og indkøb.',
  homeExplicaColores: 'Jeg laver to forslag, hvor {{espacio}} får en {{estilo}} stil og nye farver, og giver dig en liste over ændringer og indkøb.',
  homeExplicaExterior: 'Jeg laver to forslag til et nyt design af dine udeområder i en {{estilo}} stil og giver dig en liste over ændringer og indkøb.',

  homeDecisionEmpiezoPorLaSala: 'starter jeg med stuen',
  homeDecisionEstiloAcogedor: 'valgte jeg en hyggelig stil',

  homePasoMirarFotoDelEspacio: 'Kigge på fotoet af rummet',
  homePasoRedisenar: 'Indrette {{espacio}} på ny i en {{estilo}} stil',
  homePasoMuebles: 'Give {{espacio}} nye møbler i en {{estilo}} stil',
  homePasoColores: 'Give {{espacio}} en {{estilo}} stil og nye farver',
  homePasoExterior: 'Designe dine udeområder i en {{estilo}} stil',
  homePasoListaDeCambios: 'Lave listen over ændringer og indkøb',
  homePasoProponerDistribucion: 'Foreslå en bedre møblering',
  homePasoMostrarComoQuedaria: 'Vise dig, hvordan det ville se ud',
  homePasoBuscarIdeas: 'Finde idéer til {{espacio}}',
  homePasoExplicarComoLograrlo: 'Forklare dig, hvordan du gør det',
  homePasoMirarFotoDeTuEspacio: 'Kigge på fotoet af dit rum',
  homePasoContarQueVeo: 'Fortælle dig, hvad jeg ser, og hvad jeg ville gøre',

  /*
   * Weë taler til personen: «kun til dig», «dit kontor» (ver el catálogo español).
   */
  chefComensalesSoloParaMi: 'kun til dig',
  homeEspacioMiOficina: 'dit kontor',
};
