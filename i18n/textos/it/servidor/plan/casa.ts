/*
 * ITALIANO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega con su artículo («il soggiorno», «una camera da letto»), así que entra como objeto directo o detrás
 * de «per», nunca detrás de «di», que tendría que contraerse.
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Partirò dalla tua foto e migliorerò la luce. Il piatto resta esattamente com’è.',
  chefExplicaRetoqueFondo: 'Partirò dalla tua foto e cambierò lo sfondo. Il piatto resta esattamente com’è.',
  chefExplicaRetoqueApetitoso: 'Partirò dalla tua foto e la renderò più appetitosa. Il piatto resta esattamente com’è.',
  chefExplicaRetoqueRestaurante: 'Partirò dalla tua foto e le darò un aspetto da foto di ristorante. Il piatto resta esattamente com’è.',
  chefExplicaRetoqueQuitar: 'Partirò dalla tua foto ed eliminerò ciò che è di troppo. Il piatto resta esattamente com’è.',
  chefExplicaRetoqueNoSe: 'Partirò dalla tua foto e ne migliorerò l’aspetto senza cambiare il piatto. Il piatto resta esattamente com’è.',
  chefExplicaRetoqueLibre: 'Partirò dalla tua foto e applicherò solo le modifiche che mi hai indicato. Il piatto resta esattamente com’è.',

  chefExplicaMenuTresDias: 'Comporrò un menù per tre giorni, {{comensales}}, e ti lascio la lista della spesa.',
  chefExplicaMenuTodaLaSemana: 'Comporrò un menù per tutta la settimana, {{comensales}}, e ti lascio la lista della spesa.',
  chefExplicaMenuParaLaSemana: 'Comporrò un menù per la settimana, {{comensales}}, e ti lascio la lista della spesa.',
  chefExplicaMenu: 'Comporrò un menù per {{duracion}}, {{comensales}}, e ti lascio la lista della spesa.',

  chefExplicaRecetaEnTiempo: 'Preparerò una ricetta passo dopo passo in {{tiempo}}, {{comensales}}, e una foto del piatto finito.',
  chefExplicaRecetaSinApuro: 'Preparerò una ricetta passo dopo passo senza fretta, {{comensales}}, e una foto del piatto finito.',
  chefExplicaConLoQueTienesEnTiempo: 'Preparerò una ricetta con quello che hai in casa in {{tiempo}}, {{comensales}}, e una foto del piatto finito.',
  chefExplicaConLoQueTienesSinApuro: 'Preparerò una ricetta con quello che hai in casa senza fretta, {{comensales}}, e una foto del piatto finito.',
  chefExplicaSaludableEnTiempo: 'Preparerò una ricetta sana in {{tiempo}}, {{comensales}}, e una foto del piatto finito.',
  chefExplicaSaludableSinApuro: 'Preparerò una ricetta sana senza fretta, {{comensales}}, e una foto del piatto finito.',
  chefExplicaPostreEnTiempo: 'Preparerò un dolce in {{tiempo}}, {{comensales}}, e una foto del piatto finito.',
  chefExplicaPostreSinApuro: 'Preparerò un dolce senza fretta, {{comensales}}, e una foto del piatto finito.',

  chefDecisionAlgoRico: 'ti propongo qualcosa di buono e facile con quello che di solito hai in casa',
  chefDecisionParaDos: 'l’ho pensato per due',
  chefDecisionSinApuro: 'senza fretta',
  chefDecisionTodaLaSemana: 'lo faccio per tutta la settimana',

  chefPasoMirarIngredientes: 'Guardare quali ingredienti hai',
  chefPasoEscribirReceta: 'Scrivere la ricetta passo dopo passo',
  chefPasoFotoDelPlato: 'Creare una foto del piatto',
  chefPasoArmarMenu: 'Comporre il menù',
  chefPasoPreciosIngredientes: 'Guardare quanto costano gli ingredienti',
  chefPasoListaDeCompras: 'Fare la lista della spesa',
  chefPasoRetocarFoto: 'Ritoccare la foto del tuo piatto',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Guarderò {{espacio}} e ti dirò cosa cambierei — mobili, colori, disposizione — così scegli da dove iniziare. Per ora non genero nessuna immagine.',
  homeExplicaIdeas: 'Cercherò tre idee per {{espacio}} in stile {{estilo}} e ti spiegherò come realizzarle.',
  homeExplicaDistribucion: 'Guarderò {{espacio}}, ti proporrò una disposizione che sfrutti meglio lo spazio e ti mostrerò il risultato con i tuoi stessi mobili.',
  homeExplicaRedisenar: 'Riprogetterò {{espacio}} in stile {{estilo}}, con due proposte, e ti lascio la lista delle modifiche e degli acquisti.',
  homeExplicaMuebles: 'Rinnoverò {{espacio}} con altri mobili, in stile {{estilo}}, con due proposte, e ti lascio la lista delle modifiche e degli acquisti.',
  homeExplicaColores: 'Rinnoverò {{espacio}} cambiando stile e colori per un risultato {{estilo}}, con due proposte, e ti lascio la lista delle modifiche e degli acquisti.',
  homeExplicaExterior: 'Progetterò il tuo esterno in stile {{estilo}}, con due proposte, e ti lascio la lista delle modifiche e degli acquisti.',

  homeDecisionEmpiezoPorLaSala: 'comincio dal soggiorno',
  homeDecisionEstiloAcogedor: 'ho scelto uno stile accogliente',

  homePasoMirarFotoDelEspacio: 'Guardare la foto dello spazio',
  homePasoRedisenar: 'Riprogettare {{espacio}} in stile {{estilo}}',
  homePasoMuebles: 'Rinnovare {{espacio}} con altri mobili, in stile {{estilo}}',
  homePasoColores: 'Rinnovare {{espacio}} con nuovi colori, in stile {{estilo}}',
  homePasoExterior: 'Progettare il tuo esterno in stile {{estilo}}',
  homePasoListaDeCambios: 'Preparare la lista delle modifiche e degli acquisti',
  homePasoProponerDistribucion: 'Proporre una disposizione migliore',
  homePasoMostrarComoQuedaria: 'Mostrarti il risultato',
  homePasoBuscarIdeas: 'Cercare idee per {{espacio}}',
  homePasoExplicarComoLograrlo: 'Spiegarti come realizzarle',
  homePasoMirarFotoDeTuEspacio: 'Guardare la foto del tuo spazio',
  homePasoContarQueVeo: 'Dirti cosa vedo e cosa farei',

  /* La voz de quien habla: en la frase de Weë, la opción «Solo per me» pasa a hablar de «te». */
  chefComensalesSoloParaMi: 'solo per te',
  homeEspacioMiOficina: 'il tuo ufficio',
};
