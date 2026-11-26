/*
 * NORUEGO BOKMÅL — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Chef: las personas llegan con su preposición («til to») y el menú es «meny» (`../../chef.ts`). Home: los espacios
 * llegan en forma definida («stuen») o con artículo («et soverom»), y los estilos son adjetivos: «i moderne stil».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Jeg tar utgangspunkt i bildet ditt og forbedrer lyset. Selve retten blir akkurat som den er.',
  chefExplicaRetoqueFondo: 'Jeg tar utgangspunkt i bildet ditt og bytter bakgrunnen. Selve retten blir akkurat som den er.',
  chefExplicaRetoqueApetitoso: 'Jeg tar utgangspunkt i bildet ditt og får retten til å se mer fristende ut. Selve retten blir akkurat som den er.',
  chefExplicaRetoqueRestaurante: 'Jeg tar utgangspunkt i bildet ditt og gir det preg av et restaurantbilde. Selve retten blir akkurat som den er.',
  chefExplicaRetoqueQuitar: 'Jeg tar utgangspunkt i bildet ditt og fjerner det som er i veien. Selve retten blir akkurat som den er.',
  chefExplicaRetoqueNoSe: 'Jeg tar utgangspunkt i bildet ditt og forbedrer utseendet uten å endre retten. Selve retten blir akkurat som den er.',
  chefExplicaRetoqueLibre: 'Jeg tar utgangspunkt i bildet ditt og gjør bare de endringene du har bedt om. Selve retten blir akkurat som den er.',

  chefExplicaMenuTresDias: 'Jeg lager en meny for tre dager, {{comensales}}, og gir deg en handleliste.',
  chefExplicaMenuTodaLaSemana: 'Jeg lager en meny for hele uken, {{comensales}}, og gir deg en handleliste.',
  chefExplicaMenuParaLaSemana: 'Jeg lager en meny for uken, {{comensales}}, og gir deg en handleliste.',
  chefExplicaMenu: 'Jeg lager en meny for {{duracion}}, {{comensales}}, og gir deg en handleliste.',

  chefExplicaRecetaEnTiempo: 'Jeg lager en oppskrift trinn for trinn som tar {{tiempo}}, {{comensales}}, og et bilde av den ferdige retten.',
  chefExplicaRecetaSinApuro: 'Jeg lager en oppskrift trinn for trinn uten hastverk, {{comensales}}, og et bilde av den ferdige retten.',
  chefExplicaConLoQueTienesEnTiempo: 'Jeg lager en oppskrift med det du har hjemme som tar {{tiempo}}, {{comensales}}, og et bilde av den ferdige retten.',
  chefExplicaConLoQueTienesSinApuro: 'Jeg lager en oppskrift med det du har hjemme uten hastverk, {{comensales}}, og et bilde av den ferdige retten.',
  chefExplicaSaludableEnTiempo: 'Jeg lager en sunn oppskrift som tar {{tiempo}}, {{comensales}}, og et bilde av den ferdige retten.',
  chefExplicaSaludableSinApuro: 'Jeg lager en sunn oppskrift uten hastverk, {{comensales}}, og et bilde av den ferdige retten.',
  chefExplicaPostreEnTiempo: 'Jeg lager en dessert som tar {{tiempo}}, {{comensales}}, og et bilde av den ferdige retten.',
  chefExplicaPostreSinApuro: 'Jeg lager en dessert uten hastverk, {{comensales}}, og et bilde av den ferdige retten.',

  chefDecisionAlgoRico: 'foreslår jeg noe godt og enkelt med det du pleier å ha hjemme',
  chefDecisionParaDos: 'lager jeg den til to',
  chefDecisionSinApuro: 'tar jeg det uten hastverk',
  chefDecisionTodaLaSemana: 'lager jeg den for hele uken',

  chefPasoMirarIngredientes: 'Se hvilke ingredienser du har',
  chefPasoEscribirReceta: 'Skrive oppskriften trinn for trinn',
  chefPasoFotoDelPlato: 'Lage et bilde av retten',
  chefPasoArmarMenu: 'Sette sammen menyen',
  chefPasoPreciosIngredientes: 'Se hva ingrediensene koster',
  chefPasoListaDeCompras: 'Lage handlelisten',
  chefPasoRetocarFoto: 'Retusjere bildet av retten din',

  /* ── Weë Home ──────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Jeg ser på {{espacio}} og forteller deg hva jeg ville ha endret – møbler, farger, planløsning – så du kan velge hvor du vil begynne. Jeg genererer ikke noe bilde ennå.',
  homeExplicaIdeas: 'Jeg finner tre ideer til {{espacio}} i {{estilo}} stil og forklarer hvordan du får det til.',
  homeExplicaDistribucion: 'Jeg ser på {{espacio}}, foreslår en planløsning som utnytter plassen bedre, og viser deg hvordan det ville se ut med de samme møblene.',
  homeExplicaRedisenar: 'Jeg designer {{espacio}} på nytt i {{estilo}} stil, i to forslag, og gir deg en liste over endringer og innkjøp.',
  homeExplicaMuebles: 'Jeg bytter møblene i {{espacio}} i {{estilo}} stil, i to forslag, og gir deg en liste over endringer og innkjøp.',
  homeExplicaColores: 'Jeg bytter fargene og uttrykket i {{espacio}} til {{estilo}} stil, i to forslag, og gir deg en liste over endringer og innkjøp.',
  homeExplicaExterior: 'Jeg designer uteområdet ditt i {{estilo}} stil, i to forslag, og gir deg en liste over endringer og innkjøp.',

  homeDecisionEmpiezoPorLaSala: 'starter jeg med stuen',
  homeDecisionEstiloAcogedor: 'valgte jeg en koselig stil',

  homePasoMirarFotoDelEspacio: 'Se på bildet av rommet',
  homePasoRedisenar: 'Designe {{espacio}} på nytt i {{estilo}} stil',
  homePasoMuebles: 'Bytte møblene i {{espacio}} i {{estilo}} stil',
  homePasoColores: 'Bytte fargene og uttrykket i {{espacio}} til {{estilo}} stil',
  homePasoExterior: 'Designe uteområdet ditt i {{estilo}} stil',
  homePasoListaDeCambios: 'Sette opp listen over endringer og innkjøp',
  homePasoProponerDistribucion: 'Foreslå en bedre planløsning',
  homePasoMostrarComoQuedaria: 'Vise deg hvordan det ville se ut',
  homePasoBuscarIdeas: 'Finne ideer til {{espacio}}',
  homePasoExplicarComoLograrlo: 'Forklare hvordan du får det til',
  homePasoMirarFotoDeTuEspacio: 'Se på bildet av rommet ditt',
  homePasoContarQueVeo: 'Fortelle deg hva jeg ser og hva jeg ville gjort',

  /* La voz de quien habla: aquí Weë habla de «ti». */
  chefComensalesSoloParaMi: 'bare til deg',
  homeEspacioMiOficina: 'kontoret ditt',
};
