/*
 * FRANCÉS — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{espacio}}` llega con su artículo («le salon», «une chambre»), así que entra como objeto directo o detrás de «pour»,
 * nunca detrás de «de», que tendría que contraerse: «Je vais rénover le salon avec d’autres meubles».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Je vais partir de ta photo et améliorer la lumière. Le plat reste exactement comme il est.',
  chefExplicaRetoqueFondo: 'Je vais partir de ta photo et changer le fond. Le plat reste exactement comme il est.',
  chefExplicaRetoqueApetitoso: 'Je vais partir de ta photo et le rendre plus appétissant. Le plat reste exactement comme il est.',
  chefExplicaRetoqueRestaurante: 'Je vais partir de ta photo et lui donner un rendu de photo de restaurant. Le plat reste exactement comme il est.',
  chefExplicaRetoqueQuitar: 'Je vais partir de ta photo et supprimer ce qui est de trop. Le plat reste exactement comme il est.',
  chefExplicaRetoqueNoSe: 'Je vais partir de ta photo et améliorer son apparence sans changer le plat. Le plat reste exactement comme il est.',
  chefExplicaRetoqueLibre: 'Je vais partir de ta photo et appliquer uniquement les changements que tu m’as indiqués. Le plat reste exactement comme il est.',

  chefExplicaMenuTresDias: 'Je vais composer un menu sur trois jours, {{comensales}}, et je te laisse la liste de courses.',
  chefExplicaMenuTodaLaSemana: 'Je vais composer un menu pour toute la semaine, {{comensales}}, et je te laisse la liste de courses.',
  chefExplicaMenuParaLaSemana: 'Je vais composer un menu pour la semaine, {{comensales}}, et je te laisse la liste de courses.',
  chefExplicaMenu: 'Je vais composer un menu pour {{duracion}}, {{comensales}}, et je te laisse la liste de courses.',

  chefExplicaRecetaEnTiempo: 'Je vais préparer une recette pas à pas en {{tiempo}}, {{comensales}}, et une photo du plat terminé.',
  chefExplicaRecetaSinApuro: 'Je vais préparer une recette pas à pas sans se presser, {{comensales}}, et une photo du plat terminé.',
  chefExplicaConLoQueTienesEnTiempo: 'Je vais préparer une recette avec ce que tu as à la maison en {{tiempo}}, {{comensales}}, et une photo du plat terminé.',
  chefExplicaConLoQueTienesSinApuro: 'Je vais préparer une recette avec ce que tu as à la maison sans se presser, {{comensales}}, et une photo du plat terminé.',
  chefExplicaSaludableEnTiempo: 'Je vais préparer une recette saine en {{tiempo}}, {{comensales}}, et une photo du plat terminé.',
  chefExplicaSaludableSinApuro: 'Je vais préparer une recette saine sans se presser, {{comensales}}, et une photo du plat terminé.',
  chefExplicaPostreEnTiempo: 'Je vais préparer un dessert en {{tiempo}}, {{comensales}}, et une photo du plat terminé.',
  chefExplicaPostreSinApuro: 'Je vais préparer un dessert sans se presser, {{comensales}}, et une photo du plat terminé.',

  chefDecisionAlgoRico: 'je te propose quelque chose de bon et de facile avec ce que tu as d’habitude à la maison',
  chefDecisionParaDos: 'je l’ai prévu pour deux',
  chefDecisionSinApuro: 'sans se presser',
  chefDecisionTodaLaSemana: 'je le fais pour toute la semaine',

  chefPasoMirarIngredientes: 'Regarder quels ingrédients tu as',
  chefPasoEscribirReceta: 'Écrire la recette pas à pas',
  chefPasoFotoDelPlato: 'Créer une photo du plat',
  chefPasoArmarMenu: 'Composer le menu',
  chefPasoPreciosIngredientes: 'Regarder combien coûtent les ingrédients',
  chefPasoListaDeCompras: 'Faire la liste de courses',
  chefPasoRetocarFoto: 'Retoucher la photo de ton plat',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Je vais regarder {{espacio}} et te dire ce que je changerais — meubles, couleurs, agencement — pour que tu choisisses par où commencer. Je ne génère encore aucune image.',
  homeExplicaIdeas: 'Je vais chercher trois idées pour {{espacio}} dans un style {{estilo}} et t’expliquer comment y arriver.',
  homeExplicaDistribucion: 'Je vais regarder {{espacio}}, te proposer un agencement qui exploite mieux l’espace et te montrer le résultat avec tes propres meubles.',
  homeExplicaRedisenar: 'Je vais redessiner {{espacio}} dans un style {{estilo}}, en deux propositions, et je te laisse la liste des changements et des achats.',
  homeExplicaMuebles: 'Je vais rénover {{espacio}} avec d’autres meubles, dans un style {{estilo}}, en deux propositions, et je te laisse la liste des changements et des achats.',
  homeExplicaColores: 'Je vais rénover {{espacio}} en changeant le style et les couleurs pour un rendu {{estilo}}, en deux propositions, et je te laisse la liste des changements et des achats.',
  homeExplicaExterior: 'Je vais concevoir ton extérieur dans un style {{estilo}}, en deux propositions, et je te laisse la liste des changements et des achats.',

  homeDecisionEmpiezoPorLaSala: 'je commence par le salon',
  homeDecisionEstiloAcogedor: 'j’ai choisi un style cosy',

  homePasoMirarFotoDelEspacio: 'Regarder la photo de l’espace',
  homePasoRedisenar: 'Redessiner {{espacio}} dans un style {{estilo}}',
  homePasoMuebles: 'Rénover {{espacio}} avec d’autres meubles, dans un style {{estilo}}',
  homePasoColores: 'Rénover {{espacio}} avec un nouveau style et de nouvelles couleurs, dans un style {{estilo}}',
  homePasoExterior: 'Concevoir ton extérieur dans un style {{estilo}}',
  homePasoListaDeCambios: 'Établir la liste des changements et des achats',
  homePasoProponerDistribucion: 'Proposer un meilleur agencement',
  homePasoMostrarComoQuedaria: 'Te montrer le résultat',
  homePasoBuscarIdeas: 'Chercher des idées pour {{espacio}}',
  homePasoExplicarComoLograrlo: 'T’expliquer comment y arriver',
  homePasoMirarFotoDeTuEspacio: 'Regarder la photo de ton espace',
  homePasoContarQueVeo: 'Te dire ce que je vois et ce que je ferais',

  /* La voz de quien habla: en la frase de Weë, la opción «Juste pour moi» pasa a hablar de «toi». */
  chefComensalesSoloParaMi: 'juste pour toi',
  homeEspacioMiOficina: 'ton bureau',
};
