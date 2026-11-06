/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega con su artículo («a sala», «um quarto»), así que entra como objeto directo o detrás de «para», y
 * nunca detrás de «de» o «em», que tendrían que contraerse: «Vou renovar a sala com outros móveis».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Vou partir da tua foto e melhorar a luz. O prato fica exatamente como está.',
  chefExplicaRetoqueFondo: 'Vou partir da tua foto e mudar o fundo. O prato fica exatamente como está.',
  chefExplicaRetoqueApetitoso: 'Vou partir da tua foto e dar-lhe um aspeto mais apetitoso. O prato fica exatamente como está.',
  chefExplicaRetoqueRestaurante: 'Vou partir da tua foto e dar-lhe o aspeto de uma foto de restaurante. O prato fica exatamente como está.',
  chefExplicaRetoqueQuitar: 'Vou partir da tua foto e remover o que está a mais. O prato fica exatamente como está.',
  chefExplicaRetoqueNoSe: 'Vou partir da tua foto e melhorar o aspeto dela sem mudar o prato. O prato fica exatamente como está.',
  chefExplicaRetoqueLibre: 'Vou partir da tua foto e fazer apenas as alterações que indicaste. O prato fica exatamente como está.',

  chefExplicaMenuTresDias: 'Vou preparar uma ementa de três dias, {{comensales}}, e deixo-te a lista de compras.',
  chefExplicaMenuTodaLaSemana: 'Vou preparar uma ementa para a semana toda, {{comensales}}, e deixo-te a lista de compras.',
  chefExplicaMenuParaLaSemana: 'Vou preparar uma ementa para a semana, {{comensales}}, e deixo-te a lista de compras.',
  chefExplicaMenu: 'Vou preparar uma ementa para {{duracion}}, {{comensales}}, e deixo-te a lista de compras.',

  chefExplicaRecetaEnTiempo: 'Vou preparar uma receita passo a passo em {{tiempo}}, {{comensales}}, e uma foto de como fica o prato.',
  chefExplicaRecetaSinApuro: 'Vou preparar uma receita passo a passo sem pressa, {{comensales}}, e uma foto de como fica o prato.',
  chefExplicaConLoQueTienesEnTiempo: 'Vou preparar uma receita com o que tens em casa em {{tiempo}}, {{comensales}}, e uma foto de como fica o prato.',
  chefExplicaConLoQueTienesSinApuro: 'Vou preparar uma receita com o que tens em casa sem pressa, {{comensales}}, e uma foto de como fica o prato.',
  chefExplicaSaludableEnTiempo: 'Vou preparar uma receita saudável em {{tiempo}}, {{comensales}}, e uma foto de como fica o prato.',
  chefExplicaSaludableSinApuro: 'Vou preparar uma receita saudável sem pressa, {{comensales}}, e uma foto de como fica o prato.',
  chefExplicaPostreEnTiempo: 'Vou preparar uma sobremesa em {{tiempo}}, {{comensales}}, e uma foto de como fica o prato.',
  chefExplicaPostreSinApuro: 'Vou preparar uma sobremesa sem pressa, {{comensales}}, e uma foto de como fica o prato.',

  chefDecisionAlgoRico: 'sugiro algo saboroso e fácil com o que costumas ter em casa',
  chefDecisionParaDos: 'pensei para dois',
  chefDecisionSinApuro: 'sem pressa',
  chefDecisionTodaLaSemana: 'faço para a semana toda',

  chefPasoMirarIngredientes: 'Ver que ingredientes tens',
  chefPasoEscribirReceta: 'Escrever a receita passo a passo',
  chefPasoFotoDelPlato: 'Criar uma foto do prato',
  chefPasoArmarMenu: 'Preparar a ementa',
  chefPasoPreciosIngredientes: 'Ver quanto custam os ingredientes',
  chefPasoListaDeCompras: 'Fazer a lista de compras',
  chefPasoRetocarFoto: 'Retocar a foto do teu prato',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Vou olhar para {{espacio}} e dizer-te o que mudaria —móveis, cores, distribuição— para escolheres por onde começar. Ainda não vou gerar nenhuma imagem.',
  homeExplicaIdeas: 'Vou procurar três ideias para {{espacio}} em estilo {{estilo}} e explicar-te como lá chegar.',
  homeExplicaDistribucion: 'Vou olhar para {{espacio}}, propor uma distribuição que aproveite melhor o espaço e mostrar-te como ficaria com os teus próprios móveis.',
  homeExplicaRedisenar: 'Vou redesenhar {{espacio}} num estilo {{estilo}}, em duas propostas, e deixo-te a lista de alterações e compras.',
  homeExplicaMuebles: 'Vou renovar {{espacio}} com outros móveis, num estilo {{estilo}}, em duas propostas, e deixo-te a lista de alterações e compras.',
  homeExplicaColores: 'Vou renovar {{espacio}} mudando o estilo e as cores para um visual {{estilo}}, em duas propostas, e deixo-te a lista de alterações e compras.',
  homeExplicaExterior: 'Vou desenhar o teu exterior num estilo {{estilo}}, em duas propostas, e deixo-te a lista de alterações e compras.',

  homeDecisionEmpiezoPorLaSala: 'começo pela sala',
  homeDecisionEstiloAcogedor: 'escolhi um estilo acolhedor',

  homePasoMirarFotoDelEspacio: 'Ver a foto do espaço',
  homePasoRedisenar: 'Redesenhar {{espacio}} em estilo {{estilo}}',
  homePasoMuebles: 'Renovar {{espacio}} com outros móveis, em estilo {{estilo}}',
  homePasoColores: 'Renovar {{espacio}} com um novo estilo e novas cores, em estilo {{estilo}}',
  homePasoExterior: 'Desenhar o teu exterior em estilo {{estilo}}',
  homePasoListaDeCambios: 'Preparar a lista de alterações e compras',
  homePasoProponerDistribucion: 'Propor uma distribuição melhor',
  homePasoMostrarComoQuedaria: 'Mostrar como ficaria',
  homePasoBuscarIdeas: 'Procurar ideias para {{espacio}}',
  homePasoExplicarComoLograrlo: 'Explicar como lá chegar',
  homePasoMirarFotoDeTuEspacio: 'Ver a foto do teu espaço',
  homePasoContarQueVeo: 'Dizer o que vejo e o que faria',

  /* La voz de quien habla: en la frase de Weë, la opción «Só para mim» pasa a hablar de «ti». */
  chefComensalesSoloParaMi: 'só para ti',
  homeEspacioMiOficina: 'o teu escritório',
};
