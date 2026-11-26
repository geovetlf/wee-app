/*
 * FILIPINO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Como en `visual.ts`: Weë habla en primera persona y en contemplativo («Isusulat ko …», «Gagawa ako ng …»), y los
 * pasos van en infinitivo-imperativo («Isulat ang lyrics»), porque son también el título del resultado. Las
 * «…Decision…» son oraciones completas, en minúscula, que cierran la coletilla de «No sé» (`comoNoSabias`).
 *
 * WRITER. El tono llega de `../opciones.ts` como adjetivo —«magiliw», «propesyonal», «masaya», «madamdamin»— y va
 * detrás de «sa tonong …», con el enlace en «tono»: «Isusulat ko ang post sa tonong magiliw». Cada tipo de texto
 * tiene su frase («ang post», «ang kuwento», «ang script», «ang artikulo», «ang email», «ang dokumento»); «pulir» es
 * «pakinisin». Los idiomas son piezas propias con mayúscula, porque en filipino un idioma siempre la lleva: «sa
 * Ingles», «sa Portuges», «sa Pranses», «sa Italyano». Las «citas reales sobre el tema» que Weë busca son frases
 * dichas por alguien, «quote» (como el «real quotes» del inglés; «citation» es la referencia bibliográfica, la de la
 * tarjeta «Mga citation at reference»), y la «fuente», «source» (`catalogo`); «para que puedas comprobarlas» es «para
 * ma-verify mo» (glosario: «I-verify»). El videoclip lleva el enlace en «kanta»: «ang kantang {{estilo}} ang
 * istilo …», nunca «kanta na». «Sin bloqueo», «para
 * tuloy-tuloy ang pagsusulat mo». El «3» de las portadas se queda en cifra porque el español lo escribe así.
 *
 * MUSIC. El estilo es un género, un sustantivo («pop», «reggaeton o urban», «rock», «ballad», «electronic»), y el
 * ánimo un adjetivo («masaya», «kalmado», «epiko», «romantiko»): entran como predicados, «{{estilo}} ang istilo at
 * {{animo}} ang mood», que no necesitan enlace pegado al hueco y valen también para lo que escriba la persona. En el
 * videoclip van entre paréntesis, como etiqueta: «(pop, masaya)». La voz es «boses na {{voz}}» («pambabae»,
 * «panlalaki», «neutral»); la cálida, «malambing at malinaw». «Masterizar» es «i-master» y su contemplativo
 * «ima-master», con la sílaba reduplicada como suena (guía § 3.3); «letra», «lyrics»; «portada», «cover»; «videoclip»,
 * «music video». «Con ánimo alegre», que en español no tiene verbo, es «gagawin kong masaya ang mood».
 *
 * BEAUTY. Lo que se prueba va detrás de «Susubukan ko ang …» («ang makeup look», «ang ibang gupit o hairstyle», «ang
 * mga accessory») y la ocasión detrás de «para sa …» («para sa party», «para sa araw-araw»). «Conservando tu rostro,
 * tu piel y la luz de la foto» es «nang hindi binabago ang mukha mo, ang balat mo at ang ilaw ng larawan»; «lentes»,
 * «salamin»; «rutina de cuidado de la piel», «skincare routine». El primer paso, «Mirar tu foto», es el de Studio
 * (`studioPasoMirarFoto`).
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  writerExplicaCitas: 'Maghahanap ako ng mga totoong quote tungkol sa paksa at ibibigay ko ang source ng bawat isa para ma-verify mo.',
  writerPasoCitas: 'Hanapin ang mga quote at ang source ng mga ito',

  writerExplicaTraducir: 'Isasalin ko ang text mo sa {{idioma}} nang hindi nawawala ang kahulugan at ang tono.',
  writerPasoTraducir: 'Isalin sa {{idioma}}',
  writerDecisionIdiomaIngles: 'isasalin ko ito sa Ingles',
  writerIdiomaEn: 'Ingles',
  writerIdiomaPt: 'Portuges',
  writerIdiomaFr: 'Pranses',
  writerIdiomaIt: 'Italyano',

  writerExplicaResumir: 'Ibubuod ko ang text mo sa mahahalagang punto, sa ilang linya lang.',
  writerPasoResumir: 'Ibuod sa mahahalagang punto',
  writerExplicaCorregir: 'Iwawasto ko ang spelling, istilo at linaw nang hindi binabago ang gusto mong sabihin.',
  writerPasoCorregir: 'Iwasto ang spelling, istilo at linaw',
  writerExplicaIdeas: 'Magmumungkahi ako ng ilang ideya at ng panimula para tuloy-tuloy ang pagsusulat mo.',
  writerPasoIdeas: 'Magmungkahi ng mga ideya para sa isusulat mo',

  writerExplicaPortada: 'Bubuuin ko ang konsepto ng cover at gagawa ako ng tatlong disenyo para mapagpilian mo.',
  writerPasoConceptoPortada: 'Buuin ang konsepto ng cover',
  writerPasoPropuestasPortada: 'Gumawa ng 3 disenyo ng cover',

  writerExplicaReescribir: 'Isusulat ko ulit ang text mo sa tonong {{tono}}, nang hindi binabago ang ideya.',
  writerPasoReescribir: 'Isulat ulit ang text',
  writerExplicaCv: 'Isusulat ko ang resume mo sa tonong {{tono}}, handa nang gamitin sa editor at ipadala.',
  writerPasoCv: 'Isulat ang resume mo',

  writerExplicaPublicacion: 'Isusulat ko ang post sa tonong {{tono}} at saka ko ito pakikinisin para handa na.',
  writerExplicaHistoria: 'Isusulat ko ang kuwento sa tonong {{tono}} at saka ko ito pakikinisin para handa na.',
  writerExplicaGuion: 'Isusulat ko ang script sa tonong {{tono}} at saka ko ito pakikinisin para handa na.',
  writerExplicaArticulo: 'Isusulat ko ang artikulo sa tonong {{tono}} at saka ko ito pakikinisin para handa na.',
  writerExplicaEmail: 'Isusulat ko ang email sa tonong {{tono}} at saka ko ito pakikinisin para handa na.',
  writerExplicaDocumento: 'Isusulat ko ang dokumento sa tonong {{tono}} at saka ko ito pakikinisin para handa na.',
  writerPasoPublicacion: 'Isulat ang post',
  writerPasoHistoria: 'Isulat ang kuwento',
  writerPasoGuion: 'Isulat ang script',
  writerPasoArticulo: 'Isulat ang artikulo',
  writerPasoEmail: 'Isulat ang email',
  writerPasoDocumento: 'Isulat ang dokumento',
  writerPasoPulir: 'Pakinisin ang text at ihanda ito',

  writerDecisionEmpiezoPublicacion: 'magsisimula ako sa isang post',
  writerDecisionTonoCercano: 'gagamit ako ng magiliw na tono',
  writerDecisionTonoProfesional: 'gagamit ako ng propesyonal na tono',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  musicExplicaVoz: 'Ihahanda ko ang text at ire-record ko ito gamit ang boses na {{voz}}.',
  musicExplicaVozCalida: 'Ihahanda ko ang text at ire-record ko ito gamit ang boses na malambing at malinaw.',
  musicPasoTextoNarracion: 'Ihanda ang text ng narasyon',
  musicPasoGrabarVoz: 'I-record ang boses',

  musicExplicaLetra: 'Isusulat ko ang buong lyrics, {{estilo}} ang istilo.',
  musicPasoLetraCompleta: 'Isulat ang buong lyrics',

  musicExplicaMezcla: 'Pakikinggan ko ang kanta mo at imi-mix at ima-master ko ito para maging propesyonal ang tunog.',
  musicPasoAnotarMezcla: 'Pakinggan ang kanta mo at planuhin ang mix',
  musicPasoMasterizar: 'I-mix at i-master',

  musicExplicaVideoclip: 'Gagawin ko ang kanta ({{estilo}}, {{animo}}) at ang mga eksena, at bubuuin ko ang buong music video mo. Hindi mo kailangang umalis sa Weë Music.',
  musicPasoIdeaYLetra: 'Isulat ang ideya at ang lyrics',
  musicPasoEscenas: 'Gawin ang mga eksena ng music video',
  musicPasoArmarVideoclip: 'Buuin ang music video gamit ang kanta mo',

  musicExplicaJingle: 'Gagawa ako ng maikli at catchy na jingle, {{estilo}} ang istilo at {{animo}} ang mood.',
  musicPasoFraseJingle: 'Isulat ang linya ng jingle',
  musicPasoJingle: 'Gawin ang jingle',
  musicExplicaBeat: 'Gagawa ako ng beat, {{estilo}} ang istilo at {{animo}} ang mood.',
  musicPasoIdeaMusical: 'Buuin ang musikal na ideya',
  musicPasoBeat: 'Gawin ang beat',

  musicExplicaCancion: 'Isusulat ko ang lyrics, gagawin ko ang kantang {{estilo}} ang istilo at {{animo}} ang mood, at ididisenyo ko ang cover nito.',
  musicPasoLetra: 'Isulat ang lyrics',
  musicPasoCancion: 'Gawin ang kanta',
  musicPasoPortada: 'Idisenyo ang cover',

  musicDecisionEmpiezoCancion: 'magsisimula ako sa isang kanta',
  musicDecisionEstiloPop: 'pumili ako ng istilong pop',
  musicDecisionAnimoAlegre: 'gagawin kong masaya ang mood',
  musicDecisionVozCalida: 'pumili ako ng boses na malambing at malinaw',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  beautyExplicaPiel: 'Titingnan ko ang larawan mo at bubuo ako ng simpleng skincare routine, gamit ang mga produktong madaling mabili.',
  beautyPasoRutina: 'Buuin ang skincare routine mo',

  beautyExplicaRostro: 'Titingnan ko ang mukha mo, irerekomenda ko ang mga gupit at istilong pinakabagay sa iyo, at susubukan ko ang dalawa sa larawan mo.',
  beautyPasoMirarRostro: 'Tingnan ang mukha mo',
  beautyPasoRecomendar: 'Magrekomenda ng mga gupit, salamin at istilo para sa iyo',
  beautyPasoProbarDosEstilos: 'Subukan ang dalawang istilong pinakabagay sa iyo',

  beautyExplicaProbar: 'Susubukan ko ang {{cambio}} para sa {{ocasion}} sa dalawang bersyon, nang hindi binabago ang mukha mo, ang balat mo at ang ilaw ng larawan.',
  beautyPasoProbar: 'Subukan ang {{cambio}} nang hindi binabago ang mukha mo',
  beautyOcasionElDiaADia: 'araw-araw',

  beautyDecisionCambioCompleto: 'magmumungkahi ako ng kumpletong bagong look',
  beautyDecisionOcasionDiaADia: 'ginawa ko itong pang-araw-araw',
};
