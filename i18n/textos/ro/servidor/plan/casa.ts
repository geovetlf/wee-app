/*
 * RUMANO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega con artículo («livingul», «un dormitor»), así que va como objeto directo o detrás de dos puntos;
 * `{{tiempo}}` va como etiqueta («timp: o oră sau mai mult»), porque «în o oră» no concuerda. `{{estilo}}` acompaña a
 * «stil» en masculino y `{{comensales}}` ya trae su preposición.
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Pornesc de la fotografia ta și îmbunătățesc lumina. Mâncarea rămâne exact cum este.',
  chefExplicaRetoqueFondo: 'Pornesc de la fotografia ta și schimb fundalul. Mâncarea rămâne exact cum este.',
  chefExplicaRetoqueApetitoso: 'Pornesc de la fotografia ta și o fac să arate mai apetisant. Mâncarea rămâne exact cum este.',
  chefExplicaRetoqueRestaurante: 'Pornesc de la fotografia ta și îi dau aspect de fotografie de restaurant. Mâncarea rămâne exact cum este.',
  chefExplicaRetoqueQuitar: 'Pornesc de la fotografia ta și elimin ce este în plus. Mâncarea rămâne exact cum este.',
  chefExplicaRetoqueNoSe: 'Pornesc de la fotografia ta și îi îmbunătățesc aspectul fără să schimb mâncarea. Mâncarea rămâne exact cum este.',
  chefExplicaRetoqueLibre: 'Pornesc de la fotografia ta și aplic doar schimbările pe care mi le-ai indicat. Mâncarea rămâne exact cum este.',

  chefExplicaMenuTresDias: 'Îți pregătesc un meniu pentru trei zile, {{comensales}}, și îți las lista de cumpărături.',
  chefExplicaMenuTodaLaSemana: 'Îți pregătesc un meniu pentru toată săptămâna, {{comensales}}, și îți las lista de cumpărături.',
  chefExplicaMenuParaLaSemana: 'Îți pregătesc un meniu pentru săptămână, {{comensales}}, și îți las lista de cumpărături.',
  chefExplicaMenu: 'Îți pregătesc un meniu (durată: {{duracion}}), {{comensales}}, și îți las lista de cumpărături.',

  chefExplicaRecetaEnTiempo: 'Îți pregătesc o rețetă pas cu pas (timp: {{tiempo}}), {{comensales}}, și o fotografie cu mâncarea gata.',
  chefExplicaRecetaSinApuro: 'Îți pregătesc o rețetă pas cu pas, fără grabă, {{comensales}}, și o fotografie cu mâncarea gata.',
  chefExplicaConLoQueTienesEnTiempo: 'Îți pregătesc o rețetă cu ce ai în casă (timp: {{tiempo}}), {{comensales}}, și o fotografie cu mâncarea gata.',
  chefExplicaConLoQueTienesSinApuro: 'Îți pregătesc o rețetă cu ce ai în casă, fără grabă, {{comensales}}, și o fotografie cu mâncarea gata.',
  chefExplicaSaludableEnTiempo: 'Îți pregătesc o rețetă sănătoasă (timp: {{tiempo}}), {{comensales}}, și o fotografie cu mâncarea gata.',
  chefExplicaSaludableSinApuro: 'Îți pregătesc o rețetă sănătoasă, fără grabă, {{comensales}}, și o fotografie cu mâncarea gata.',
  chefExplicaPostreEnTiempo: 'Îți pregătesc un desert (timp: {{tiempo}}), {{comensales}}, și o fotografie cu felul gata.',
  chefExplicaPostreSinApuro: 'Îți pregătesc un desert, fără grabă, {{comensales}}, și o fotografie cu felul gata.',

  chefDecisionAlgoRico: 'îți propun ceva gustos și ușor, cu ce ai de obicei în casă',
  chefDecisionParaDos: 'l-am gândit pentru două persoane',
  chefDecisionSinApuro: 'fără grabă',
  chefDecisionTodaLaSemana: 'îl fac pentru toată săptămâna',

  chefPasoMirarIngredientes: 'Verificarea ingredientelor pe care le ai',
  chefPasoEscribirReceta: 'Scrierea rețetei pas cu pas',
  chefPasoFotoDelPlato: 'Crearea unei fotografii a mâncării',
  chefPasoArmarMenu: 'Alcătuirea meniului',
  chefPasoPreciosIngredientes: 'Verificarea prețului ingredientelor',
  chefPasoListaDeCompras: 'Întocmirea listei de cumpărături',
  chefPasoRetocarFoto: 'Retușarea fotografiei mâncării tale',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Analizez {{espacio}} și îți spun ce aș schimba —mobilă, culori, amenajare— ca să alegi de unde începi. Încă nu generez nicio imagine.',
  homeExplicaIdeas: 'Caut trei idei în stil {{estilo}} (spațiu: {{espacio}}) și îți explic cum le poți pune în practică.',
  homeExplicaDistribucion: 'Analizez {{espacio}}, îți propun o amenajare care folosește mai bine spațiul și îți arăt cum ar arăta cu aceeași mobilă.',
  homeExplicaRedisenar: 'Reproiectez {{espacio}} în stil {{estilo}}, în două propuneri, și îți las lista de schimbări și cumpărături.',
  homeExplicaMuebles: 'Schimb mobila în stil {{estilo}} (spațiu: {{espacio}}), în două propuneri, și îți las lista de schimbări și cumpărături.',
  homeExplicaColores: 'Schimb stilul și culorile spre un stil {{estilo}} (spațiu: {{espacio}}), în două propuneri, și îți las lista de schimbări și cumpărături.',
  homeExplicaExterior: 'Proiectez exteriorul tău în stil {{estilo}}, în două propuneri, și îți las lista de schimbări și cumpărături.',

  homeDecisionEmpiezoPorLaSala: 'încep cu livingul',
  homeDecisionEstiloAcogedor: 'am ales un stil primitor',

  homePasoMirarFotoDelEspacio: 'Analizarea fotografiei spațiului',
  homePasoRedisenar: 'Reproiectare: {{espacio}}, stil {{estilo}}',
  homePasoMuebles: 'Schimbarea mobilei: {{espacio}}, stil {{estilo}}',
  homePasoColores: 'Schimbarea stilului și a culorilor: {{espacio}}, stil {{estilo}}',
  homePasoExterior: 'Proiectarea exteriorului tău în stil {{estilo}}',
  homePasoListaDeCambios: 'Întocmirea listei de schimbări și cumpărături',
  homePasoProponerDistribucion: 'Propunerea unei amenajări mai bune',
  homePasoMostrarComoQuedaria: 'Cum ar arăta',
  homePasoBuscarIdeas: 'Căutarea de idei: {{espacio}}',
  homePasoExplicarComoLograrlo: 'Explicația despre cum poți face asta',
  homePasoMirarFotoDeTuEspacio: 'Analizarea fotografiei spațiului tău',
  homePasoContarQueVeo: 'Ce văd și ce aș face',

  /* La voz de quien habla: esta pieza manda sobre la opción y Weë habla de «tu». */
  chefComensalesSoloParaMi: 'doar pentru tine',
  homeEspacioMiOficina: 'biroul tău',
};
