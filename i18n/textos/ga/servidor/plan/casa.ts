/*
 * IRLANDÉS — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * «i» pediría eclipsis e «in» delante de vocal, y el genitivo mutaría el espacio: el tiempo va como «am: {{tiempo}}» y
 * el espacio detrás de «an spás seo:». `{{comensales}}` ya trae su preposición («do bheirt»).
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Tosóidh mé le do ghrianghraf agus feabhsóidh mé an solas. Fanfaidh an mhias díreach mar atá sí.',
  chefExplicaRetoqueFondo: 'Tosóidh mé le do ghrianghraf agus athróidh mé an cúlra. Fanfaidh an mhias díreach mar atá sí.',
  chefExplicaRetoqueApetitoso: 'Tosóidh mé le do ghrianghraf agus cuirfidh mé cuma níos blasta uirthi. Fanfaidh an mhias díreach mar atá sí.',
  chefExplicaRetoqueRestaurante: 'Tosóidh mé le do ghrianghraf agus cuirfidh mé cuma grianghraif bhialainne air. Fanfaidh an mhias díreach mar atá sí.',
  chefExplicaRetoqueQuitar: 'Tosóidh mé le do ghrianghraf agus bainfidh mé an rud breise. Fanfaidh an mhias díreach mar atá sí.',
  chefExplicaRetoqueNoSe: 'Tosóidh mé le do ghrianghraf agus feabhsóidh mé a chuma gan an mhias a athrú. Fanfaidh an mhias díreach mar atá sí.',
  chefExplicaRetoqueLibre: 'Tosóidh mé le do ghrianghraf agus ní dhéanfaidh mé ach na hathruithe a d\'iarr tú. Fanfaidh an mhias díreach mar atá sí.',

  chefExplicaMenuTresDias: 'Déanfaidh mé biachlár do thrí lá, {{comensales}}, agus tabharfaidh mé liosta siopadóireachta duit.',
  chefExplicaMenuTodaLaSemana: 'Déanfaidh mé biachlár don tseachtain ar fad, {{comensales}}, agus tabharfaidh mé liosta siopadóireachta duit.',
  chefExplicaMenuParaLaSemana: 'Déanfaidh mé biachlár don tseachtain, {{comensales}}, agus tabharfaidh mé liosta siopadóireachta duit.',
  chefExplicaMenu: 'Déanfaidh mé biachlár ({{duracion}}), {{comensales}}, agus tabharfaidh mé liosta siopadóireachta duit.',

  chefExplicaRecetaEnTiempo: 'Ullmhóidh mé oideas céim ar chéim (am: {{tiempo}}), {{comensales}}, agus grianghraf den mhias chríochnaithe.',
  chefExplicaRecetaSinApuro: 'Ullmhóidh mé oideas céim ar chéim gan deifir, {{comensales}}, agus grianghraf den mhias chríochnaithe.',
  chefExplicaConLoQueTienesEnTiempo: 'Ullmhóidh mé oideas leis a bhfuil agat sa bhaile (am: {{tiempo}}), {{comensales}}, agus grianghraf den mhias chríochnaithe.',
  chefExplicaConLoQueTienesSinApuro: 'Ullmhóidh mé oideas leis a bhfuil agat sa bhaile gan deifir, {{comensales}}, agus grianghraf den mhias chríochnaithe.',
  chefExplicaSaludableEnTiempo: 'Ullmhóidh mé oideas sláintiúil (am: {{tiempo}}), {{comensales}}, agus grianghraf den mhias chríochnaithe.',
  chefExplicaSaludableSinApuro: 'Ullmhóidh mé oideas sláintiúil gan deifir, {{comensales}}, agus grianghraf den mhias chríochnaithe.',
  chefExplicaPostreEnTiempo: 'Ullmhóidh mé milseog (am: {{tiempo}}), {{comensales}}, agus grianghraf den mhias chríochnaithe.',
  chefExplicaPostreSinApuro: 'Ullmhóidh mé milseog gan deifir, {{comensales}}, agus grianghraf den mhias chríochnaithe.',

  chefDecisionAlgoRico: 'molfaidh mé rud blasta éasca leis a mbíonn agat sa bhaile de ghnáth',
  chefDecisionParaDos: 'bheartaigh mé é do bheirt',
  chefDecisionSinApuro: 'gan deifir',
  chefDecisionTodaLaSemana: 'déanfaidh mé é don tseachtain ar fad',

  chefPasoMirarIngredientes: 'Féachaint ar na comhábhair atá agat',
  chefPasoEscribirReceta: 'An t-oideas a scríobh céim ar chéim',
  chefPasoFotoDelPlato: 'Grianghraf den mhias a chruthú',
  chefPasoArmarMenu: 'An biachlár a chur le chéile',
  chefPasoPreciosIngredientes: 'Féachaint ar phraghas na gcomhábhar',
  chefPasoListaDeCompras: 'An liosta siopadóireachta a dhéanamh',
  chefPasoRetocarFoto: 'An grianghraf de do mhias a mhionchóiriú',

  /* ── Weë Home ──────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Féachfaidh mé ar an spás seo: {{espacio}}, agus inseoidh mé duit cad a d\'athróinn —troscán, dathanna, leagan amach— le go roghnóidh tú cá dtosóidh tú. Ní ghinfidh mé íomhá ar bith go fóill.',
  homeExplicaIdeas: 'Lorgóidh mé trí smaoineamh don spás seo: {{espacio}} (stíl: {{estilo}}), agus míneoidh mé conas iad a chur i gcrích.',
  homeExplicaDistribucion: 'Féachfaidh mé ar an spás seo: {{espacio}}, molfaidh mé leagan amach a bhainfidh níos mó as an spás, agus taispeánfaidh mé duit an chuma a bheadh air le do chuid troscáin féin.',
  homeExplicaRedisenar: 'Athdhearfaidh mé an spás seo: {{espacio}} (stíl: {{estilo}}), i dhá mholadh, agus tabharfaidh mé liosta athruithe agus ceannachán duit.',
  homeExplicaMuebles: 'Athróidh mé an troscán sa spás seo: {{espacio}} (stíl: {{estilo}}), i dhá mholadh, agus tabharfaidh mé liosta athruithe agus ceannachán duit.',
  homeExplicaColores: 'Athróidh mé an stíl agus na dathanna sa spás seo: {{espacio}} (stíl: {{estilo}}), i dhá mholadh, agus tabharfaidh mé liosta athruithe agus ceannachán duit.',
  homeExplicaExterior: 'Dearfaidh mé do spás lasmuigh (stíl: {{estilo}}), i dhá mholadh, agus tabharfaidh mé liosta athruithe agus ceannachán duit.',

  homeDecisionEmpiezoPorLaSala: 'tosóidh mé leis an seomra suí',
  homeDecisionEstiloAcogedor: 'roghnaigh mé stíl theolaí',

  homePasoMirarFotoDelEspacio: 'Féachaint ar ghrianghraf an spáis',
  homePasoRedisenar: 'Athdhearadh: {{espacio}} (stíl: {{estilo}})',
  homePasoMuebles: 'Troscán a athrú: {{espacio}} (stíl: {{estilo}})',
  homePasoColores: 'An stíl agus na dathanna a athrú: {{espacio}} (stíl: {{estilo}})',
  homePasoExterior: 'Do spás lasmuigh a dhearadh (stíl: {{estilo}})',
  homePasoListaDeCambios: 'Liosta athruithe agus ceannachán a chur le chéile',
  homePasoProponerDistribucion: 'Leagan amach níos fearr a mholadh',
  homePasoMostrarComoQuedaria: 'An chuma a bheadh air a thaispeáint duit',
  homePasoBuscarIdeas: 'Smaointe a lorg: {{espacio}}',
  homePasoExplicarComoLograrlo: 'A mhíniú conas é a chur i gcrích',
  homePasoMirarFotoDeTuEspacio: 'Féachaint ar ghrianghraf do spáis',
  homePasoContarQueVeo: 'A insint duit cad a fheicim agus cad a dhéanfainn',

  /* La voz de quien habla: aquí Weë habla de «ti». */
  chefComensalesSoloParaMi: 'duit féin amháin',
  homeEspacioMiOficina: 'd\'oifig',
};
