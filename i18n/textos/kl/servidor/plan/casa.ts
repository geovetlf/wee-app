/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — El plan de Weë Chef y Weë Home
 * (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Kalaallisut, NO danés. {{comensales}}, {{tiempo}}, {{duracion}}, {{espacio}} y {{estilo}} van aislados tras
 * «:» o entre rayas, nunca con sufijo; en Home el espacio se presenta con la etiqueta «inigisaq:» (el lugar).
 * «Nerisassanut pilersaarut» = menú, «pisiassat allattorsimaffiat» = lista de compras, «nerisassiassat» =
 * ingredientes. Las piezas con la voz de la persona hablan de «ti» («illinnut kisimi», «allaffiit»).
 * Todo «pendiente de confirmación nativa».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  chefExplicaRetoqueLuz: 'Assit aallaavigalugu qaamaneq pitsanngorsassavara. Nerisassaq allanngornavianngilaq.',
  chefExplicaRetoqueFondo: 'Assit aallaavigalugu tunuliaqut allanngortissavara. Nerisassaq allanngornavianngilaq.',
  chefExplicaRetoqueApetitoso: 'Assit aallaavigalugu mamarnarnerusutut isikkoqalersissavara. Nerisassaq allanngornavianngilaq.',
  chefExplicaRetoqueRestaurante: 'Assit aallaavigalugu neriniartarfimmi assilisatut isikkoqalersissavara. Nerisassaq allanngornavianngilaq.',
  chefExplicaRetoqueQuitar: 'Assit aallaavigalugu pisariaqanngitsoq peerussavara. Nerisassaq allanngornavianngilaq.',
  chefExplicaRetoqueNoSe: 'Assit aallaavigalugu isikkua pitsanngorsassavara, nerisassaq allanngortinnagu. Nerisassaq allanngornavianngilaq.',
  chefExplicaRetoqueLibre: 'Assit aallaavigalugu allanngortitassatut oqaatigisatit kisiisa allanngortissavakka. Nerisassaq allanngornavianngilaq.',

  chefExplicaMenuTresDias: 'Nerisassanut pilersaarut ullunut pingasunut aaqqissussavara — {{comensales}} — pisiassallu allattorsimaffiat ilanngullugu.',
  chefExplicaMenuTodaLaSemana: 'Nerisassanut pilersaarut sapaatip akunneranut tamarmut aaqqissussavara — {{comensales}} — pisiassallu allattorsimaffiat ilanngullugu.',
  chefExplicaMenuParaLaSemana: 'Nerisassanut pilersaarut sapaatip akunneranut aaqqissussavara — {{comensales}} — pisiassallu allattorsimaffiat ilanngullugu.',
  chefExplicaMenu: 'Nerisassanut pilersaarut aaqqissussavara — {{duracion}}, {{comensales}} — pisiassallu allattorsimaffiat ilanngullugu.',

  chefExplicaRecetaEnTiempo: 'Nerisassiornermut ilitsersuut alloriarfikkaartoq piareersassavara — piffissaq: {{tiempo}}; {{comensales}} — assilu nerisassap isikkuanik takutitsisoq.',
  chefExplicaRecetaSinApuro: 'Nerisassiornermut ilitsersuut alloriarfikkaartoq piareersassavara — tuaviornani; {{comensales}} — assilu nerisassap isikkuanik takutitsisoq.',
  chefExplicaConLoQueTienesEnTiempo: 'Nerisassiornermut ilitsersuut, angerlarsimaffinni pigisatit atorlugit, piareersassavara — piffissaq: {{tiempo}}; {{comensales}} — assilu nerisassap isikkuanik takutitsisoq.',
  chefExplicaConLoQueTienesSinApuro: 'Nerisassiornermut ilitsersuut, angerlarsimaffinni pigisatit atorlugit, piareersassavara — tuaviornani; {{comensales}} — assilu nerisassap isikkuanik takutitsisoq.',
  chefExplicaSaludableEnTiempo: 'Nerisassiornermut ilitsersuut peqqinnartoq piareersassavara — piffissaq: {{tiempo}}; {{comensales}} — assilu nerisassap isikkuanik takutitsisoq.',
  chefExplicaSaludableSinApuro: 'Nerisassiornermut ilitsersuut peqqinnartoq piareersassavara — tuaviornani; {{comensales}} — assilu nerisassap isikkuanik takutitsisoq.',
  chefExplicaPostreEnTiempo: 'Mamakujuk piareersassavara — piffissaq: {{tiempo}}; {{comensales}} — assilu nerisassap isikkuanik takutitsisoq.',
  chefExplicaPostreSinApuro: 'Mamakujuk piareersassavara — tuaviornani; {{comensales}} — assilu nerisassap isikkuanik takutitsisoq.',

  chefDecisionAlgoRico: 'mamartumik pisariitsumillu siunnersuuteqassaanga, angerlarsimaffinni nalinginnaasumik pigisatit atorlugit',
  chefDecisionParaDos: 'marlunnut eqqarsaatigaara',
  chefDecisionSinApuro: 'tuaviornani',
  chefDecisionTodaLaSemana: 'sapaatip akunneranut tamarmut sanassavara',

  chefPasoMirarIngredientes: 'Pigisatit nerisassiassat misissornerat',
  chefPasoEscribirReceta: 'Nerisassiornermut ilitsersuummik alloriarfikkaartumik allaneq',
  chefPasoFotoDelPlato: 'Nerisassamut assimik pilersitsineq',
  chefPasoArmarMenu: 'Nerisassanut pilersaarummik aaqqissuineq',
  chefPasoPreciosIngredientes: 'Nerisassiassat akiisa misissornerat',
  chefPasoListaDeCompras: 'Pisiassat allattorsimaffiannik suliaqarneq',
  chefPasoRetocarFoto: 'Nerisassavit assiata aaqqissornera',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  homeExplicaConsejo: 'Inigisaq misissussavara: {{espacio}}. Taava oqaluttuutissavakkit suna allanngortissagaluarnerlugu — pequtit, qalipaatit, inissiineq — aallarnissat toqqarsinnaaqqullugu. Suli assimik pilersitsinavianngilanga.',
  homeExplicaIdeas: 'Isumassarsiat pingasut ujarlissavakka — inigisaq: {{espacio}}, isikkoq: {{estilo}} — qanorlu anguneqarsinnaanersut nassuiassavakka.',
  homeExplicaDistribucion: 'Inigisaq misissussavara: {{espacio}}. Taava inissiinermik pitsaanerusumik siunnersuuteqassaanga, pequtitillu nammineq atorlugit qanoq isikkoqassanersoq takutissavara.',
  homeExplicaRedisenar: 'Inigisaq nutaamik ilusilissavara: {{espacio}} — isikkoq: {{estilo}} — siunnersuutit marluk, allanngortitassallu pisiassallu allattorsimaffiat ilanngullugu.',
  homeExplicaMuebles: 'Pequtit allanngortissavakka, inigisaq: {{espacio}} — isikkoq: {{estilo}} — siunnersuutit marluk, allanngortitassallu pisiassallu allattorsimaffiat ilanngullugu.',
  homeExplicaColores: 'Isikkoq qalipaatillu allanngortissavakka, inigisaq: {{espacio}} — isikkoq nutaaq: {{estilo}} — siunnersuutit marluk, allanngortitassallu pisiassallu allattorsimaffiat ilanngullugu.',
  homeExplicaExterior: 'Illuvit silataa ilusilissavara — isikkoq: {{estilo}} — siunnersuutit marluk, allanngortitassallu pisiassallu allattorsimaffiat ilanngullugu.',

  homeDecisionEmpiezoPorLaSala: 'inersuarmik aallartissaanga',
  homeDecisionEstiloAcogedor: 'isikkoq qiimmannartoq toqqarpara',

  homePasoMirarFotoDelEspacio: 'Inigisap assiata misissornera',
  homePasoRedisenar: 'Nutaamik ilusilersuineq: {{espacio}}, isikkoq: {{estilo}}',
  homePasoMuebles: 'Pequtit allanngortinnerat: {{espacio}}, isikkoq: {{estilo}}',
  homePasoColores: 'Isikkup qalipaatillu allanngortinnerat: {{espacio}}, isikkoq: {{estilo}}',
  homePasoExterior: 'Illuvit silataata ilusilersornera, isikkoq: {{estilo}}',
  homePasoListaDeCambios: 'Allanngortitassat pisiassallu allattorsimaffiannik aaqqissuineq',
  homePasoProponerDistribucion: 'Inissiinermik pitsaanerusumik siunnersuuteqarneq',
  homePasoMostrarComoQuedaria: 'Qanoq isikkoqassanersoq takutitsineq',
  homePasoBuscarIdeas: 'Isumassarsiorneq: {{espacio}}',
  homePasoExplicarComoLograrlo: 'Qanoq anguneqarsinnaanersoq nassuiaaneq',
  homePasoMirarFotoDeTuEspacio: 'Inigisavit assiata misissornera',
  homePasoContarQueVeo: 'Takusakka iliussagakkalu oqaluttuarineri',

  /* La voz de quien habla: Weë habla de «ti». */
  chefComensalesSoloParaMi: 'illinnut kisimi',
  homeEspacioMiOficina: 'allaffiit',
};
