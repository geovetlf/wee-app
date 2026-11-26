/*
 * PORTUGUÉS (pt-BR) — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega con su artículo («a sala», «um quarto»), así que entra como objeto directo y nunca detrás de
 * «de» o «em», que tendrían que contraerse: «Vou renovar a sala com outros móveis», no «os móveis de a sala».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Vou partir da sua foto e melhorar a luz. O prato continua exatamente como está.',
  chefExplicaRetoqueFondo: 'Vou partir da sua foto e trocar o fundo. O prato continua exatamente como está.',
  chefExplicaRetoqueApetitoso: 'Vou partir da sua foto e deixá-lo com uma aparência mais apetitosa. O prato continua exatamente como está.',
  chefExplicaRetoqueRestaurante: 'Vou partir da sua foto e dar a ela cara de foto de restaurante. O prato continua exatamente como está.',
  chefExplicaRetoqueQuitar: 'Vou partir da sua foto e remover o que está sobrando. O prato continua exatamente como está.',
  chefExplicaRetoqueNoSe: 'Vou partir da sua foto e melhorar a aparência dela sem mudar o prato. O prato continua exatamente como está.',
  chefExplicaRetoqueLibre: 'Vou partir da sua foto e aplicar somente as mudanças que você indicou. O prato continua exatamente como está.',

  chefExplicaMenuTresDias: 'Vou montar um cardápio de três dias, {{comensales}}, e deixo a lista de compras para você.',
  chefExplicaMenuTodaLaSemana: 'Vou montar um cardápio para a semana toda, {{comensales}}, e deixo a lista de compras para você.',
  chefExplicaMenuParaLaSemana: 'Vou montar um cardápio para a semana, {{comensales}}, e deixo a lista de compras para você.',
  chefExplicaMenu: 'Vou montar um cardápio para {{duracion}}, {{comensales}}, e deixo a lista de compras para você.',

  chefExplicaRecetaEnTiempo: 'Vou preparar uma receita passo a passo em {{tiempo}}, {{comensales}}, e uma foto de como o prato fica.',
  chefExplicaRecetaSinApuro: 'Vou preparar uma receita passo a passo sem pressa, {{comensales}}, e uma foto de como o prato fica.',
  chefExplicaConLoQueTienesEnTiempo: 'Vou preparar uma receita com o que você tem em casa em {{tiempo}}, {{comensales}}, e uma foto de como o prato fica.',
  chefExplicaConLoQueTienesSinApuro: 'Vou preparar uma receita com o que você tem em casa sem pressa, {{comensales}}, e uma foto de como o prato fica.',
  chefExplicaSaludableEnTiempo: 'Vou preparar uma receita saudável em {{tiempo}}, {{comensales}}, e uma foto de como o prato fica.',
  chefExplicaSaludableSinApuro: 'Vou preparar uma receita saudável sem pressa, {{comensales}}, e uma foto de como o prato fica.',
  chefExplicaPostreEnTiempo: 'Vou preparar uma sobremesa em {{tiempo}}, {{comensales}}, e uma foto de como o prato fica.',
  chefExplicaPostreSinApuro: 'Vou preparar uma sobremesa sem pressa, {{comensales}}, e uma foto de como o prato fica.',

  chefDecisionAlgoRico: 'sugiro algo gostoso e fácil com o que você costuma ter em casa',
  chefDecisionParaDos: 'pensei para dois',
  chefDecisionSinApuro: 'sem pressa',
  chefDecisionTodaLaSemana: 'faço para a semana toda',

  chefPasoMirarIngredientes: 'Ver quais ingredientes você tem',
  chefPasoEscribirReceta: 'Escrever a receita passo a passo',
  chefPasoFotoDelPlato: 'Criar uma foto do prato',
  chefPasoArmarMenu: 'Montar o cardápio',
  chefPasoPreciosIngredientes: 'Ver quanto custam os ingredientes',
  chefPasoListaDeCompras: 'Fazer a lista de compras',
  chefPasoRetocarFoto: 'Retocar a foto do seu prato',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Vou olhar {{espacio}} e contar o que eu mudaria —móveis, cores, distribuição— para você escolher por onde começar. Ainda não vou gerar nenhuma imagem.',
  homeExplicaIdeas: 'Vou buscar três ideias para {{espacio}} em estilo {{estilo}} e explicar como chegar lá.',
  homeExplicaDistribucion: 'Vou olhar {{espacio}}, propor uma distribuição que aproveite melhor o espaço e mostrar como ficaria com os seus próprios móveis.',
  homeExplicaRedisenar: 'Vou redesenhar {{espacio}} em um estilo {{estilo}}, em duas propostas, e deixo a lista de mudanças e compras para você.',
  homeExplicaMuebles: 'Vou renovar {{espacio}} com outros móveis, em um estilo {{estilo}}, em duas propostas, e deixo a lista de mudanças e compras para você.',
  homeExplicaColores: 'Vou renovar {{espacio}} mudando o estilo e as cores para um visual {{estilo}}, em duas propostas, e deixo a lista de mudanças e compras para você.',
  homeExplicaExterior: 'Vou projetar sua área externa em um estilo {{estilo}}, em duas propostas, e deixo a lista de mudanças e compras para você.',

  homeDecisionEmpiezoPorLaSala: 'começo pela sala',
  homeDecisionEstiloAcogedor: 'escolhi um estilo aconchegante',

  homePasoMirarFotoDelEspacio: 'Olhar a foto do espaço',
  homePasoRedisenar: 'Redesenhar {{espacio}} em estilo {{estilo}}',
  homePasoMuebles: 'Renovar {{espacio}} com outros móveis, em estilo {{estilo}}',
  homePasoColores: 'Renovar {{espacio}} com novo estilo e novas cores, em estilo {{estilo}}',
  homePasoExterior: 'Projetar sua área externa em estilo {{estilo}}',
  homePasoListaDeCambios: 'Montar a lista de mudanças e compras',
  homePasoProponerDistribucion: 'Propor uma distribuição melhor',
  homePasoMostrarComoQuedaria: 'Mostrar como ficaria',
  homePasoBuscarIdeas: 'Buscar ideias para {{espacio}}',
  homePasoExplicarComoLograrlo: 'Explicar como chegar lá',
  homePasoMirarFotoDeTuEspacio: 'Olhar a foto do seu espaço',
  homePasoContarQueVeo: 'Contar o que vejo e o que eu faria',

  /* La voz de quien habla: en la frase de Weë, la opción «Só para mim» pasa a hablar de «você». */
  chefComensalesSoloParaMi: 'só para você',
  homeEspacioMiOficina: 'seu escritório',
};
