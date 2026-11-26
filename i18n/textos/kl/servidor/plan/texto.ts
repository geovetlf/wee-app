/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — El plan de Weë Writer, Weë Music y Weë Beauty
 * (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Kalaallisut, NO danés. Los nombres de idioma (`writerIdioma…`) son adverbios de lengua («tuluttut» en inglés),
 * que en groenlandés van solos delante del verbo sin sufijo («Allagatit tuluttut nutsissavara» traduciré tu
 * texto al inglés): por eso el hueco {{idioma}} funciona sin preposición. {{tono}}, {{estilo}}, {{animo}} y
 * {{voz}} van aislados tras «oqaluttariaaseq atorlugu:», «isikkoq:», «misigissuseq:», «nipi atorlugu:».
 * «Weë Music» va en absolutivo como objeto («Weë Music qimattariaqanngilat»), sin sufijo. «Beat» se deja como
 * préstamo musical entre paréntesis. Todo «pendiente de confirmación nativa».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  writerExplicaCitas: 'Sammisaq pillugu issuaanernik piviusunik ujarlissaanga, tamarmillu aallaavii ilanngussavakka misissorsinnaaqqullugit.',
  writerPasoCitas: 'Issuaanernik aallaavinillu ujarlerneq',

  writerExplicaTraducir: 'Allagatit {{idioma}} nutsissavara, isumaa oqaluttariaasialu pigiinnarlugit.',
  writerPasoTraducir: '{{idioma}} nutserineq',
  writerDecisionIdiomaIngles: 'tuluttut nutsissavara',
  writerIdiomaEn: 'tuluttut',
  writerIdiomaPt: 'portugalimiutut',
  writerIdiomaFr: 'franskisut',
  writerIdiomaIt: 'italiamiutut',

  writerExplicaResumir: 'Allagatit eqikkaassavara isumassarsiat pingaarnerit atorlugit, titarnerni ikittuni.',
  writerPasoResumir: 'Isumassarsianut pingaarnernut eqikkaaneq',
  writerExplicaCorregir: 'Allattariaaseq, isikkoq ersarissuserlu kukkunersiussavakka, oqarusutatit allanngortinnagit.',
  writerPasoCorregir: 'Allattariaatsip, isikkup ersarissutsillu kukkunersiornera',
  writerExplicaIdeas: 'Isumassarsianik arlalinnik aallarnissamullu tunngavissamik siunnersuuteqassaanga, unikkallarnak allassaqqullutit.',
  writerPasoIdeas: 'Allanissannut isumassarsianik siunnersuuteqarneq',

  writerExplicaPortada: 'Saqqaata isumassarsiaa aalajangersassavara, pingasunillu siunnersuutinik pilersitsissaanga, ilinnit toqqarneqarsinnaasunik.',
  writerPasoConceptoPortada: 'Saqqaata isumassarsiaata aalajangersarnera',
  writerPasoPropuestasPortada: 'Saqqaanut 3 siunnersuutinik pilersitsineq',

  writerExplicaReescribir: 'Allagatit allaqqissavara, oqaluttariaaseq atorlugu: {{tono}}. Isumaa pigiinnassavara.',
  writerPasoReescribir: 'Allagap allaqqinnera',
  writerExplicaCv: 'CV-it allassavara, oqaluttariaaseq atorlugu: {{tono}}. Aaqqissuiffimmi atoriaannaassaaq nassiuteriaannaallunilu.',
  writerPasoCv: 'CV-pit allannera',

  writerExplicaPublicacion: 'Saqqummiussaq allassavara, oqaluttariaaseq atorlugu: {{tono}}. Kingorna iluarsaassavara piareersimaqqullugu.',
  writerExplicaHistoria: 'Oqaluttuaq allassavara, oqaluttariaaseq atorlugu: {{tono}}. Kingorna iluarsaassavara piareersimaqqullugu.',
  writerExplicaGuion: 'Filmimut allaaserisaq allassavara, oqaluttariaaseq atorlugu: {{tono}}. Kingorna iluarsaassavara piareersimaqqullugu.',
  writerExplicaArticulo: 'Allaaserisaq allassavara, oqaluttariaaseq atorlugu: {{tono}}. Kingorna iluarsaassavara piareersimaqqullugu.',
  writerExplicaEmail: 'E-mail allassavara, oqaluttariaaseq atorlugu: {{tono}}. Kingorna iluarsaassavara piareersimaqqullugu.',
  writerExplicaDocumento: 'Allakkiaq allassavara, oqaluttariaaseq atorlugu: {{tono}}. Kingorna iluarsaassavara piareersimaqqullugu.',
  writerPasoPublicacion: 'Saqqummiussamik allaneq',
  writerPasoHistoria: 'Oqaluttuamik allaneq',
  writerPasoGuion: 'Filmimut allaaserisamik allaneq',
  writerPasoArticulo: 'Allaaserisamik allaneq',
  writerPasoEmail: 'E-mailimik allaneq',
  writerPasoDocumento: 'Allakkiamik allaneq',
  writerPasoPulir: 'Allagap iluarsaannera piareersarneralu',

  writerDecisionEmpiezoPublicacion: 'saqqummiussamik aallartissaanga',
  writerDecisionTonoCercano: 'oqaluttariaaseq ikinngutinnersoq atussavara',
  writerDecisionTonoProfesional: 'oqaluttariaaseq sulinermut naleqquttoq atussavara',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  musicExplicaVoz: 'Allagaq piareersassavara immiussavaralu, nipi atorlugu: {{voz}}.',
  musicExplicaVozCalida: 'Allagaq piareersassavara immiussavaralu, nipi kissartoq ersarissorlu atorlugu.',
  musicPasoTextoNarracion: 'Oqaluttuarinissamut allagap piareersarnera',
  musicPasoGrabarVoz: 'Nipip immiunnera',

  musicExplicaLetra: 'Oqaasiliat tamakkerlugit allassavakka, isikkoq: {{estilo}}.',
  musicPasoLetraCompleta: 'Oqaasilianik tamakkiisunik allaneq',

  musicExplicaMezcla: 'Erinarsuutit tusarnaassavara, akulerussavara inaarsassavaralu, sulinermik ilisimasalittut nipeqaqqullugu.',
  musicPasoAnotarMezcla: 'Erinarsuutip tusarnaarnera akulerunnissaanullu allattuineq',
  musicPasoMasterizar: 'Akulerussineq inaarsaanerlu',

  musicExplicaVideoclip: 'Erinarsuut ({{estilo}}, {{animo}}), takutitat videolu tamakkiisoq pilersissavakka. Weë Music qimattariaqanngilat.',
  musicPasoIdeaYLetra: 'Isumassarsiamik oqaasilianillu allaneq',
  musicPasoEscenas: 'Videop takutitaannik pilersitsineq',
  musicPasoArmarVideoclip: 'Erinarsuutinnik videomik katitsineq',

  musicExplicaJingle: 'Erinaaramik naatsumik eqqaamajuminartumillu pilersitsissaanga — isikkoq: {{estilo}}, misigissuseq: {{animo}}.',
  musicPasoFraseJingle: 'Erinaarap oqaasiinik allaneq',
  musicPasoJingle: 'Erinaaramik pilersitsineq',
  musicExplicaBeat: 'Nipilersugaq (beat) pilersissavara — isikkoq: {{estilo}}, misigissuseq: {{animo}}.',
  musicPasoIdeaMusical: 'Nipilersornikkut isumassarsiap aalajangersarnera',
  musicPasoBeat: 'Nipilersugamik (beat) pilersitsineq',

  musicExplicaCancion: 'Oqaasiliat allassavakka, erinarsuut pilersissavara — isikkoq: {{estilo}}, misigissuseq: {{animo}} — saqqaalu ilusilissavara.',
  musicPasoLetra: 'Oqaasilianik allaneq',
  musicPasoCancion: 'Erinarsuummik pilersitsineq',
  musicPasoPortada: 'Saqqaata ilusilersornera',

  musicDecisionEmpiezoCancion: 'erinarsuummik aallartissaanga',
  musicDecisionEstiloPop: 'isikkoq pop toqqarpara',
  musicDecisionAnimoAlegre: 'misigissuseq nuannaartoq atorlugu',
  musicDecisionVozCalida: 'nipi kissartoq ersarissorlu toqqarpara',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  beautyExplicaPiel: 'Assit misissussavara, amimullu paarinissaanut iliuusissat pisariitsut aaqqissussavakka, nioqqutissat pissarsiariuminartut atorlugit.',
  beautyPasoRutina: 'Paarinissannut iliuusissat aaqqissuunnerat',

  beautyExplicaRostro: 'Kiinnat misissussavara, nujaat kipinerannik isikkunillu naleqqunnerpaanik siunnersuussavakkit, assinnilu marluk misilissavakka.',
  beautyPasoMirarRostro: 'Kiinnavit misissornera',
  beautyPasoRecomendar: 'Nujaat kipinerannik, isaruaatinik isikkunillu siunnersuineq',
  beautyPasoProbarDosEstilos: 'Isikkut marluk naleqqunnerpaat misilinnerat',

  beautyExplicaProbar: 'Una misilissavara: {{cambio}} ({{ocasion}}), marlunnik assigiinngitsunik, kiinnat, amit assillu qaamassusia pigiinnarlugit.',
  beautyPasoProbar: 'Misiliineq: {{cambio}}, kiinnat pigiinnarlugu',
  beautyOcasionElDiaADia: 'ulluinnarni',

  beautyDecisionCambioCompleto: 'isikkup tamakkiisumik allanngortinnissaa siunnersuutigaara',
  beautyDecisionOcasionDiaADia: 'ulluinnarnut eqqarsaatigaara',
};
