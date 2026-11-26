/*
 * FILIPINO — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Como en `visual.ts`: Weë habla en primera persona y en contemplativo («Maghahanda ako ng …», «Titingnan ko …»), y
 * los pasos van en infinitivo-imperativo («Isulat ang recipe nang hakbang-hakbang»), porque son también el título del
 * resultado. Las «…Decision…» son oraciones completas, en minúscula, que cierran la coletilla de «No sé»
 * (`comoNoSabias`): lo ya decidido en completado («inihanda ko ito para sa dalawa»), lo que va a hacer en
 * contemplativo («gagawin ko ito para sa buong linggo»). «Sin apuro», que en español no tiene verbo, es «hindi ko
 * nilimitahan ang oras».
 *
 * CHEF. Las personas llegan de `../opciones.ts` ya con su «para sa» —«para sa dalawa», «para sa pamilya», «para sa
 * marami»— y se leen solas entre comas, como en español; «solo para mí», en boca de Weë, es «para sa iyo lang». El
 * tiempo va detrás de «sa loob ng …» («sa loob ng 15 minuto», «… ng kalahating oras»); con «Kahit gaano katagal», la
 * frase sin tiempo dice «na hindi kailangang madaliin». El menú de varios días es «menu para sa …» («tatlong araw»,
 * «buong linggo», «isang linggo»: «buong» y «isang» dejan claro que «linggo» es la semana y no el domingo, guía
 * § 8.1), lo que arregla de paso el «un menú tres días» del español. «Preparar una receta» es «maghanda ng recipe»;
 * «paso a paso», «hakbang-hakbang»; la lista de la compra, «listahan ng bibilhin» (glosario § 11.11); el plato, «luto»
 * (`catalogo`); la foto que Weë crea, «larawan ng magiging itsura ng luto». En los retoques la foto es de la persona
 * («larawan mo») y «el plato se queda exactamente como está» es «Hindi ko gagalawin ang luto mismo.», como el «Hindi
 * ko gagalawin ang iba pa.» de Weë Photo; «apetitoso», «katakam-takam».
 *
 * HOME. Las habitaciones llegan sin artículo —«sala», «kuwarto», «kusina», «banyo»— o «opisina mo», y entran detrás
 * de «ang», «ng» o «para sa» («ang muwebles ng sala»); los estilos son adjetivos detrás de «sa istilong …» («sa
 * istilong modern», «sa istilong maaliwalas»). «Rediseñar» es «idisenyo ulit», como el botón «Idisenyo ulit ang
 * espasyo ko»; el exterior, «labas ng bahay» («Labas ng bahay at hardin»); la distribución, «layout»; «propuestas»,
 * «bersyon» («sa dalawang bersyon»). «Cambiar el estilo y los colores … en un estilo moderno» se dice «Papalitan ko
 * ang mga kulay at dating ng … sa istilong …» para no repetir «istilo». La raya del consejo se vuelve paréntesis
 * (guía § 7: sin raya larga).
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  chefExplicaRetoqueLuz: 'Gagamitin ko ang larawan mo at pagagandahin ko ang ilaw. Hindi ko gagalawin ang luto mismo.',
  chefExplicaRetoqueFondo: 'Gagamitin ko ang larawan mo at papalitan ko ang background. Hindi ko gagalawin ang luto mismo.',
  chefExplicaRetoqueApetitoso: 'Gagamitin ko ang larawan mo at gagawin kong mas katakam-takam ang itsura nito. Hindi ko gagalawin ang luto mismo.',
  chefExplicaRetoqueRestaurante: 'Gagamitin ko ang larawan mo at bibigyan ko ito ng itsurang pang-restaurant. Hindi ko gagalawin ang luto mismo.',
  chefExplicaRetoqueQuitar: 'Gagamitin ko ang larawan mo at aalisin ko ang hindi kailangan. Hindi ko gagalawin ang luto mismo.',
  chefExplicaRetoqueNoSe: 'Gagamitin ko ang larawan mo at pagagandahin ko ang itsura nito nang hindi binabago ang luto. Hindi ko gagalawin ang luto mismo.',
  chefExplicaRetoqueLibre: 'Gagamitin ko ang larawan mo at gagawin ko lang ang mga pagbabagong sinabi mo. Hindi ko gagalawin ang luto mismo.',

  chefExplicaMenuTresDias: 'Gagawa ako ng menu para sa tatlong araw, {{comensales}}, at ibibigay ko ang listahan ng bibilhin.',
  chefExplicaMenuTodaLaSemana: 'Gagawa ako ng menu para sa buong linggo, {{comensales}}, at ibibigay ko ang listahan ng bibilhin.',
  chefExplicaMenuParaLaSemana: 'Gagawa ako ng menu para sa isang linggo, {{comensales}}, at ibibigay ko ang listahan ng bibilhin.',
  chefExplicaMenu: 'Gagawa ako ng menu para sa {{duracion}}, {{comensales}}, at ibibigay ko ang listahan ng bibilhin.',

  chefExplicaRecetaEnTiempo: 'Maghahanda ako ng hakbang-hakbang na recipe na kayang gawin sa loob ng {{tiempo}}, {{comensales}}, at gagawa ako ng larawan ng magiging itsura ng luto.',
  chefExplicaRecetaSinApuro: 'Maghahanda ako ng hakbang-hakbang na recipe na hindi kailangang madaliin, {{comensales}}, at gagawa ako ng larawan ng magiging itsura ng luto.',
  chefExplicaConLoQueTienesEnTiempo: 'Maghahanda ako ng recipe gamit ang mayroon ka sa bahay, na kayang gawin sa loob ng {{tiempo}}, {{comensales}}, at gagawa ako ng larawan ng magiging itsura ng luto.',
  chefExplicaConLoQueTienesSinApuro: 'Maghahanda ako ng recipe gamit ang mayroon ka sa bahay, na hindi kailangang madaliin, {{comensales}}, at gagawa ako ng larawan ng magiging itsura ng luto.',
  chefExplicaSaludableEnTiempo: 'Maghahanda ako ng masustansyang recipe na kayang gawin sa loob ng {{tiempo}}, {{comensales}}, at gagawa ako ng larawan ng magiging itsura ng luto.',
  chefExplicaSaludableSinApuro: 'Maghahanda ako ng masustansyang recipe na hindi kailangang madaliin, {{comensales}}, at gagawa ako ng larawan ng magiging itsura ng luto.',
  chefExplicaPostreEnTiempo: 'Maghahanda ako ng recipe ng dessert na kayang gawin sa loob ng {{tiempo}}, {{comensales}}, at gagawa ako ng larawan ng magiging itsura ng luto.',
  chefExplicaPostreSinApuro: 'Maghahanda ako ng recipe ng dessert na hindi kailangang madaliin, {{comensales}}, at gagawa ako ng larawan ng magiging itsura ng luto.',

  chefDecisionAlgoRico: 'magmumungkahi ako ng masarap at madaling luto gamit ang karaniwang mayroon ka sa bahay',
  chefDecisionParaDos: 'inihanda ko ito para sa dalawa',
  chefDecisionSinApuro: 'hindi ko nilimitahan ang oras',
  chefDecisionTodaLaSemana: 'gagawin ko ito para sa buong linggo',

  chefPasoMirarIngredientes: 'Tingnan kung anong mga sangkap ang mayroon ka',
  chefPasoEscribirReceta: 'Isulat ang recipe nang hakbang-hakbang',
  chefPasoFotoDelPlato: 'Gumawa ng larawan ng luto',
  chefPasoArmarMenu: 'Buuin ang menu',
  chefPasoPreciosIngredientes: 'Alamin kung magkano ang mga sangkap',
  chefPasoListaDeCompras: 'Gawin ang listahan ng bibilhin',
  chefPasoRetocarFoto: 'I-retouch ang larawan ng luto mo',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  homeExplicaConsejo: 'Titingnan ko ang {{espacio}} at sasabihin ko sa iyo kung ano ang babaguhin ko (muwebles, kulay, layout) para makapili ka kung saan magsisimula. Wala pa akong gagawing larawan.',
  homeExplicaIdeas: 'Maghahanap ako ng tatlong ideya para sa {{espacio}} sa istilong {{estilo}} at ipapaliwanag ko kung paano gagawin ang mga ito.',
  homeExplicaDistribucion: 'Titingnan ko ang {{espacio}}, magmumungkahi ako ng layout na mas sulit sa espasyo, at ipapakita ko ang magiging itsura nito gamit ang parehong muwebles mo.',
  homeExplicaRedisenar: 'Ididisenyo ko ulit ang {{espacio}} sa istilong {{estilo}}, sa dalawang bersyon, at ibibigay ko ang listahan ng mga babaguhin at bibilhin.',
  homeExplicaMuebles: 'Papalitan ko ang muwebles ng {{espacio}} sa istilong {{estilo}}, sa dalawang bersyon, at ibibigay ko ang listahan ng mga babaguhin at bibilhin.',
  homeExplicaColores: 'Papalitan ko ang mga kulay at dating ng {{espacio}} sa istilong {{estilo}}, sa dalawang bersyon, at ibibigay ko ang listahan ng mga babaguhin at bibilhin.',
  homeExplicaExterior: 'Ididisenyo ko ang labas ng bahay mo sa istilong {{estilo}}, sa dalawang bersyon, at ibibigay ko ang listahan ng mga babaguhin at bibilhin.',

  homeDecisionEmpiezoPorLaSala: 'magsisimula ako sa sala',
  homeDecisionEstiloAcogedor: 'pumili ako ng maaliwalas na istilo',

  homePasoMirarFotoDelEspacio: 'Tingnan ang larawan ng espasyo',
  homePasoRedisenar: 'Idisenyo ulit ang {{espacio}} sa istilong {{estilo}}',
  homePasoMuebles: 'Palitan ang muwebles ng {{espacio}} sa istilong {{estilo}}',
  homePasoColores: 'Palitan ang mga kulay at dating ng {{espacio}} sa istilong {{estilo}}',
  homePasoExterior: 'Idisenyo ang labas ng bahay mo sa istilong {{estilo}}',
  homePasoListaDeCambios: 'Buuin ang listahan ng mga babaguhin at bibilhin',
  homePasoProponerDistribucion: 'Magmungkahi ng mas magandang layout',
  homePasoMostrarComoQuedaria: 'Ipakita sa iyo ang magiging itsura',
  homePasoBuscarIdeas: 'Maghanap ng mga ideya para sa {{espacio}}',
  homePasoExplicarComoLograrlo: 'Ipaliwanag kung paano ito gagawin',
  homePasoMirarFotoDeTuEspacio: 'Tingnan ang larawan ng espasyo mo',
  homePasoContarQueVeo: 'Sabihin sa iyo ang nakikita ko at ang gagawin ko',

  /* La voz de quien habla: en boca de Weë, «para ti» y «tu oficina» (ver el español). */
  chefComensalesSoloParaMi: 'para sa iyo lang',
  homeEspacioMiOficina: 'opisina mo',
};
