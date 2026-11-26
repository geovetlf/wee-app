/*
 * CATALÁN — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega con su artículo («la cuina», «el bany», «un dormitori»), así que entra siempre como objeto directo y
 * nunca detrás de «de» o «per a», que tendrían que contraerse: «Renovaré el bany canviant-ne els mobles».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Partiré de la teva foto i en milloraré la llum. El plat queda exactament com és.',
  chefExplicaRetoqueFondo: 'Partiré de la teva foto i en canviaré el fons. El plat queda exactament com és.',
  chefExplicaRetoqueApetitoso: 'Partiré de la teva foto i faré que es vegi més apetitós. El plat queda exactament com és.',
  chefExplicaRetoqueRestaurante: 'Partiré de la teva foto i li donaré aspecte de foto de restaurant. El plat queda exactament com és.',
  chefExplicaRetoqueQuitar: 'Partiré de la teva foto i en trauré el que sobra. El plat queda exactament com és.',
  chefExplicaRetoqueNoSe: 'Partiré de la teva foto i en milloraré l\'aparença sense canviar el plat. El plat queda exactament com és.',
  chefExplicaRetoqueLibre: 'Partiré de la teva foto i aplicaré únicament els canvis que m\'has indicat. El plat queda exactament com és.',

  chefExplicaMenuTresDias: 'Prepararé un menú de tres dies, {{comensales}}, i et deixaré la llista de la compra.',
  chefExplicaMenuTodaLaSemana: 'Prepararé un menú per a tota la setmana, {{comensales}}, i et deixaré la llista de la compra.',
  chefExplicaMenuParaLaSemana: 'Prepararé un menú per a la setmana, {{comensales}}, i et deixaré la llista de la compra.',
  chefExplicaMenu: 'Prepararé un menú ({{duracion}}), {{comensales}}, i et deixaré la llista de la compra.',

  chefExplicaRecetaEnTiempo: 'Prepararé una recepta pas a pas en {{tiempo}}, {{comensales}}, i una foto de com queda el plat.',
  chefExplicaRecetaSinApuro: 'Prepararé una recepta pas a pas sense presses, {{comensales}}, i una foto de com queda el plat.',
  chefExplicaConLoQueTienesEnTiempo: 'Prepararé una recepta amb el que tens a casa en {{tiempo}}, {{comensales}}, i una foto de com queda el plat.',
  chefExplicaConLoQueTienesSinApuro: 'Prepararé una recepta amb el que tens a casa sense presses, {{comensales}}, i una foto de com queda el plat.',
  chefExplicaSaludableEnTiempo: 'Prepararé una recepta saludable en {{tiempo}}, {{comensales}}, i una foto de com queda el plat.',
  chefExplicaSaludableSinApuro: 'Prepararé una recepta saludable sense presses, {{comensales}}, i una foto de com queda el plat.',
  chefExplicaPostreEnTiempo: 'Prepararé unes postres en {{tiempo}}, {{comensales}}, i una foto de com queda el plat.',
  chefExplicaPostreSinApuro: 'Prepararé unes postres sense presses, {{comensales}}, i una foto de com queda el plat.',

  chefDecisionAlgoRico: 'et proposo alguna cosa bona i fàcil amb el que acostumes a tenir a casa',
  chefDecisionParaDos: 'ho he pensat per a dos',
  chefDecisionSinApuro: 'sense presses',
  chefDecisionTodaLaSemana: 'ho faig per a tota la setmana',

  chefPasoMirarIngredientes: 'Mirar quins ingredients tens',
  chefPasoEscribirReceta: 'Escriure la recepta pas a pas',
  chefPasoFotoDelPlato: 'Crear una foto del plat',
  chefPasoArmarMenu: 'Preparar el menú',
  chefPasoPreciosIngredientes: 'Mirar quant costen els ingredients',
  chefPasoListaDeCompras: 'Fer la llista de la compra',
  chefPasoRetocarFoto: 'Retocar la foto del teu plat',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Miraré {{espacio}} i t\'explicaré què hi canviaria —mobles, colors, distribució— perquè triïs per on començar. Encara no genero cap imatge.',
  homeExplicaIdeas: 'Buscaré tres idees per renovar {{espacio}} amb un estil {{estilo}} i t\'explicaré com aconseguir-les.',
  homeExplicaDistribucion: 'Miraré {{espacio}}, et proposaré una distribució que aprofiti millor l\'espai i et mostraré com quedaria amb els teus mateixos mobles.',
  homeExplicaRedisenar: 'Redissenyaré {{espacio}} amb un estil {{estilo}}, en dues propostes, i et deixaré la llista de canvis i compres.',
  homeExplicaMuebles: 'Renovaré {{espacio}} canviant-ne els mobles, amb un estil {{estilo}}, en dues propostes, i et deixaré la llista de canvis i compres.',
  homeExplicaColores: 'Transformaré {{espacio}} amb nous colors i un estil {{estilo}}, en dues propostes, i et deixaré la llista de canvis i compres.',
  homeExplicaExterior: 'Dissenyaré el teu exterior amb un estil {{estilo}}, en dues propostes, i et deixaré la llista de canvis i compres.',

  homeDecisionEmpiezoPorLaSala: 'començo per la sala d\'estar',
  homeDecisionEstiloAcogedor: 'he triat un estil acollidor',

  homePasoMirarFotoDelEspacio: 'Mirar la foto de l\'espai',
  homePasoRedisenar: 'Redissenyar {{espacio}} amb un estil {{estilo}}',
  homePasoMuebles: 'Renovar {{espacio}} canviant-ne els mobles, amb un estil {{estilo}}',
  homePasoColores: 'Transformar {{espacio}} amb nous colors i un estil {{estilo}}',
  homePasoExterior: 'Dissenyar el teu exterior amb un estil {{estilo}}',
  homePasoListaDeCambios: 'Preparar la llista de canvis i compres',
  homePasoProponerDistribucion: 'Proposar una distribució millor',
  homePasoMostrarComoQuedaria: 'Mostrar-te com quedaria',
  homePasoBuscarIdeas: 'Buscar idees per renovar {{espacio}}',
  homePasoExplicarComoLograrlo: 'Explicar-te com aconseguir-ho',
  homePasoMirarFotoDeTuEspacio: 'Mirar la foto del teu espai',
  homePasoContarQueVeo: 'Explicar-te què hi veig i què hi faria',

  /* LA VOZ DE QUIEN HABLA: Weë habla de «ti», no de «mí». */
  chefComensalesSoloParaMi: 'només per a tu',
  homeEspacioMiOficina: 'la teva oficina',
};
