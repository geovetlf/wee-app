/*
 * FINÉS — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` ya trae su alativo («kahdelle»). `{{espacio}}`, `{{estilo}}`, `{{tiempo}}` y `{{duracion}}` llegan en
 * nominativo: entran entre paréntesis o detrás de una etiqueta («tilan ({{espacio}})», «aikaa: {{tiempo}}»).
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Lähden kuvastasi ja parannan valoa. Annos pysyy täsmälleen sellaisena kuin se on.',
  chefExplicaRetoqueFondo: 'Lähden kuvastasi ja vaihdan taustan. Annos pysyy täsmälleen sellaisena kuin se on.',
  chefExplicaRetoqueApetitoso: 'Lähden kuvastasi ja teen siitä herkullisemman näköisen. Annos pysyy täsmälleen sellaisena kuin se on.',
  chefExplicaRetoqueRestaurante: 'Lähden kuvastasi ja annan sille ravintolakuvan ilmeen. Annos pysyy täsmälleen sellaisena kuin se on.',
  chefExplicaRetoqueQuitar: 'Lähden kuvastasi ja poistan ylimääräisen. Annos pysyy täsmälleen sellaisena kuin se on.',
  chefExplicaRetoqueNoSe: 'Lähden kuvastasi ja parannan sen ulkoasua muuttamatta annosta. Annos pysyy täsmälleen sellaisena kuin se on.',
  chefExplicaRetoqueLibre: 'Lähden kuvastasi ja teen vain ne muutokset, jotka kerroit. Annos pysyy täsmälleen sellaisena kuin se on.',

  chefExplicaMenuTresDias: 'Kokoan ruokalistan kolmeksi päiväksi, {{comensales}}, ja jätän sinulle ostoslistan.',
  chefExplicaMenuTodaLaSemana: 'Kokoan ruokalistan koko viikoksi, {{comensales}}, ja jätän sinulle ostoslistan.',
  chefExplicaMenuParaLaSemana: 'Kokoan ruokalistan viikoksi, {{comensales}}, ja jätän sinulle ostoslistan.',
  chefExplicaMenu: 'Kokoan ruokalistan (kesto: {{duracion}}), {{comensales}}, ja jätän sinulle ostoslistan.',

  chefExplicaRecetaEnTiempo: 'Teen reseptin vaihe vaiheelta (aikaa: {{tiempo}}), {{comensales}}, ja kuvan valmiista annoksesta.',
  chefExplicaRecetaSinApuro: 'Teen reseptin vaihe vaiheelta ilman kiirettä, {{comensales}}, ja kuvan valmiista annoksesta.',
  chefExplicaConLoQueTienesEnTiempo: 'Teen reseptin siitä, mitä sinulla on kotona (aikaa: {{tiempo}}), {{comensales}}, ja kuvan valmiista annoksesta.',
  chefExplicaConLoQueTienesSinApuro: 'Teen reseptin siitä, mitä sinulla on kotona, ilman kiirettä, {{comensales}}, ja kuvan valmiista annoksesta.',
  chefExplicaSaludableEnTiempo: 'Teen terveellisen reseptin (aikaa: {{tiempo}}), {{comensales}}, ja kuvan valmiista annoksesta.',
  chefExplicaSaludableSinApuro: 'Teen terveellisen reseptin ilman kiirettä, {{comensales}}, ja kuvan valmiista annoksesta.',
  chefExplicaPostreEnTiempo: 'Teen jälkiruoan (aikaa: {{tiempo}}), {{comensales}}, ja kuvan valmiista annoksesta.',
  chefExplicaPostreSinApuro: 'Teen jälkiruoan ilman kiirettä, {{comensales}}, ja kuvan valmiista annoksesta.',

  chefDecisionAlgoRico: 'ehdotan jotain hyvää ja helppoa aineksista, joita sinulla yleensä on kotona',
  chefDecisionParaDos: 'ajattelin kahta ruokailijaa',
  chefDecisionSinApuro: 'teen sen ilman kiirettä',
  chefDecisionTodaLaSemana: 'teen sen koko viikoksi',

  chefPasoMirarIngredientes: 'Raaka-aineidesi katsominen',
  chefPasoEscribirReceta: 'Reseptin kirjoittaminen vaihe vaiheelta',
  chefPasoFotoDelPlato: 'Annoskuvan luominen',
  chefPasoArmarMenu: 'Ruokalistan kokoaminen',
  chefPasoPreciosIngredientes: 'Raaka-aineiden hintojen selvittäminen',
  chefPasoListaDeCompras: 'Ostoslistan tekeminen',
  chefPasoRetocarFoto: 'Annoskuvasi viimeistely',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Katson tilan ({{espacio}}) ja kerron, mitä muuttaisin — huonekalut, värit, tilanjaon —, jotta voit valita, mistä aloittaa. En vielä luo yhtään kuvaa.',
  homeExplicaIdeas: 'Etsin kolme ideaa tilaan ({{espacio}}, tyyli: {{estilo}}) ja kerron, miten ne toteutetaan.',
  homeExplicaDistribucion: 'Katson tilan ({{espacio}}), ehdotan tilanjakoa, joka hyödyntää tilan paremmin, ja näytän, miltä se näyttäisi nykyisillä huonekaluillasi.',
  homeExplicaRedisenar: 'Suunnittelen tilan uudelleen ({{espacio}}, tyyli: {{estilo}}) kahtena ehdotuksena ja jätän sinulle listan muutoksista ja ostoksista.',
  homeExplicaMuebles: 'Vaihdan tilan huonekalut ({{espacio}}, tyyli: {{estilo}}) kahtena ehdotuksena ja jätän sinulle listan muutoksista ja ostoksista.',
  homeExplicaColores: 'Vaihdan tilan tyylin ja värit ({{espacio}}, tyyli: {{estilo}}) kahtena ehdotuksena ja jätän sinulle listan muutoksista ja ostoksista.',
  homeExplicaExterior: 'Suunnittelen ulkotilasi (tyyli: {{estilo}}) kahtena ehdotuksena ja jätän sinulle listan muutoksista ja ostoksista.',

  homeDecisionEmpiezoPorLaSala: 'aloitan olohuoneesta',
  homeDecisionEstiloAcogedor: 'valitsin kodikkaan tyylin',

  homePasoMirarFotoDelEspacio: 'Tilan kuvan katsominen',
  homePasoRedisenar: 'Uudelleensuunnittelu: {{espacio}}, tyyli: {{estilo}}',
  homePasoMuebles: 'Huonekalujen vaihto: {{espacio}}, tyyli: {{estilo}}',
  homePasoColores: 'Tyylin ja värien vaihto: {{espacio}}, tyyli: {{estilo}}',
  homePasoExterior: 'Ulkotilasi suunnittelu, tyyli: {{estilo}}',
  homePasoListaDeCambios: 'Muutos- ja ostoslistan kokoaminen',
  homePasoProponerDistribucion: 'Paremman tilanjaon ehdottaminen',
  homePasoMostrarComoQuedaria: 'Lopputuloksen näyttäminen',
  homePasoBuscarIdeas: 'Ideoiden etsiminen: {{espacio}}',
  homePasoExplicarComoLograrlo: 'Toteutustavan selittäminen',
  homePasoMirarFotoDeTuEspacio: 'Tilasi kuvan katsominen',
  homePasoContarQueVeo: 'Kerron, mitä näen ja mitä tekisin',

  /* La voz de quien habla: Weë habla de «sinä», no de «minä». */
  chefComensalesSoloParaMi: 'vain sinulle',
  homeEspacioMiOficina: 'toimistosi',
};
