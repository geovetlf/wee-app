/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — El plan de Weë Business, Weë Travel y Weë Brain
 * (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Kalaallisut, NO danés. {{tono}}, {{busca}} y {{fechas}} van aislados tras «:» o «—»; {{contador}} va delante de
 * «ulloq» (_one) / «ullut» (_other), y {{lasNoches}} es la pieza «{{contador}} unnuaq/unnuat». Las fechas las
 * reescribe la app en el idioma de quien mira, así que la frase solo les deja sitio. «Weë» va como sujeto de un
 * verbo intransitivo o como objeto de «atorlugu», nunca con sufijo. El aviso de las fechas se dice igual en todas
 * las frases («Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara»). Todo «pendiente de
 * confirmación nativa».
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  businessExplicaContenido: 'Niuernerit paasissavara, saqqummiussaq allassavara — oqaluttariaaseq: {{tono}} — assillu ilaqutaa pilersissavara.',
  businessExplicaCalendario: 'Sapaatip akunnerani saqqummiussatit pilersaarusiussavakka, tamarmik ulloqarlutik, piffissaqarlutik attaveqaateqarlutillu.',
  businessExplicaPublicar: 'Saqqummiussaq piareersassavara attaveqaatinullu tamanut naleqqussassavara, assilillugu nammineq saqqummiussinnaaqqullugu. Weë suli attaveqaatinnut attavilerneqanngilaq, taamaattumik ilinnut saqqummiussisinnaanngilaq.',
  businessExplicaRespuesta: 'Pisiortunnut akissummik inussiarnersumik ersarissumillu allassaanga, nassiuteriaannarmik.',
  businessExplicaResultados: 'Inernerit misissussavakka, suut iluatsinnersut sapaatillu akunnerani matumani suna iliuuseqarfigisariaqarnersoq oqaluttuutissavakkit.',
  businessExplicaCampana: 'Niuernerit paasissavara, ussassaarinermik suliniut ilusilissavara — oqaluttariaaseq: {{tono}} — assillu pingaarneq pilersissavara.',
  businessExplicaCv: 'Misilittagatit paasissavakka, taava CV-it allassavara — oqaluttariaaseq: {{tono}} — atoriaannaasoq.',
  businessExplicaPresentacion: 'Siullermik niuernerit paasissavara, taava saqqummiussineq quppernermiit quppernermut allassavara — oqaluttariaaseq: {{tono}}.',
  businessExplicaDocumento: 'Siullermik niuernerit paasissavara, taava allakkiaq allassavara — oqaluttariaaseq: {{tono}}.',
  businessExplicaIdeas: 'Siullermik niuernerit paasissavara, taava isumassarsianik piviusunik periusissiamillu siuariartornissamut siunnersuuteqassaanga.',

  businessTonoProfesionalPeroCercano: 'sulinermut naleqquttoq kisianni ikinngutinnersoq',

  businessDecisionTonoProfesionalPeroCercano: 'oqaluttariaaseq sulinermut naleqquttoq kisianni ikinngutinnersoq atussavara',
  businessDecisionTonoCercanoYProfesional: 'oqaluttariaaseq ikinngutinnersoq sulinermullu naleqquttoq atussavara',
  businessDecisionTonoProfesional: 'oqaluttariaaseq sulinermut naleqquttoq atussavara',
  businessDecisionIdeasConcretas: 'isumassarsianik piviusunik aallartissaanga',

  businessPasoEntender: 'Paasiniaaneq: niuernerit siunertarlu',
  businessPasoImagenPublicacion: 'Saqqummiussamut assimik pilersitsineq',
  businessPasoCalendario: 'Saqqummiussat pilersaarutaannik aaqqissuineq',
  businessPasoPrepararPublicacion: 'Saqqummiussap piareersarnera',
  businessPasoAdaptarACadaRed: 'Attaveqaatinut tamanut naleqqussaaneq',
  businessPasoRespuesta: 'Pisiortunnut akissummik allaneq',
  businessPasoResultados: 'Inernerit misissornerat nassuiaanerallu',
  businessPasoCampana: 'Ussassaarinermik suliniutip ilusilersornera',
  businessPasoImagenCampana: 'Suliniummut assimik pilersitsineq',
  businessPasoPresentacion: 'Saqqummiussinermik allaneq (quppernermiit quppernermut)',
  businessPasoMercado: 'Niuerfinni maannakkut qanoq innersoq paasiniaaneq',
  businessPasoIdeas: 'Isumassarsianik periusissiamillu siunnersuuteqarneq',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  travelExplicaDestinosFechas: 'Angalaffissat pingasut siunnersuutigissavakka — piffissaq: {{fechas}} — ujartugatit eqqarsaatigalugit: {{busca}}. Toqqarukku, angalaneq tamaat piareersassavara.',
  travelExplicaDestinosDias_one: 'Angalaffissat pingasut siunnersuutigissavakka — {{contador}} ulloq · {{lasNoches}} — ujartugatit eqqarsaatigalugit: {{busca}}. Toqqarukku, angalaneq tamaat piareersassavara.',
  travelExplicaDestinosDias_other: 'Angalaffissat pingasut siunnersuutigissavakka — {{contador}} ullut · {{lasNoches}} — ujartugatit eqqarsaatigalugit: {{busca}}. Toqqarukku, angalaneq tamaat piareersassavara.',
  travelExplicaDestinosDiasAviso_one: 'Angalaffissat pingasut siunnersuutigissavakka — {{contador}} ulloq · {{lasNoches}} — ujartugatit eqqarsaatigalugit: {{busca}}. Toqqarukku, angalaneq tamaat piareersassavara. Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara.',
  travelExplicaDestinosDiasAviso_other: 'Angalaffissat pingasut siunnersuutigissavakka — {{contador}} ullut · {{lasNoches}} — ujartugatit eqqarsaatigalugit: {{busca}}. Toqqarukku, angalaneq tamaat piareersassavara. Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara.',
  travelExplicaDestinosTuViaje: 'Angalanissannut angalaffissat pingasut siunnersuutigissavakka, ujartugatit eqqarsaatigalugit: {{busca}}. Toqqarukku, angalaneq tamaat piareersassavara.',
  travelExplicaDestinosTuViajeAviso: 'Angalanissannut angalaffissat pingasut siunnersuutigissavakka, ujartugatit eqqarsaatigalugit: {{busca}}. Toqqarukku, angalaneq tamaat piareersassavara. Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara.',

  travelBuscaSorpresa: 'tupigusuutissaq',

  travelExplicaItinerarioFechas_one: 'Angalanermut pilersaarut piareersassavara — {{fechas}} ({{contador}} ulloq · {{lasNoches}}) — ullormiit ullormut, aningaasartuutissanillu missiliuussaqarluni.',
  travelExplicaItinerarioFechas_other: 'Angalanermut pilersaarut piareersassavara — {{fechas}} ({{contador}} ullut · {{lasNoches}}) — ullormiit ullormut, aningaasartuutissanillu missiliuussaqarluni.',
  travelExplicaItinerarioDias_one: 'Angalanermut pilersaarut piareersassavara — {{contador}} ulloq · {{lasNoches}} — ullormiit ullormut, aningaasartuutissanillu missiliuussaqarluni.',
  travelExplicaItinerarioDias_other: 'Angalanermut pilersaarut piareersassavara — {{contador}} ullut · {{lasNoches}} — ullormiit ullormut, aningaasartuutissanillu missiliuussaqarluni.',
  travelExplicaItinerarioDiasAviso_one: 'Angalanermut pilersaarut piareersassavara — {{contador}} ulloq · {{lasNoches}} — ullormiit ullormut, aningaasartuutissanillu missiliuussaqarluni. Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara.',
  travelExplicaItinerarioDiasAviso_other: 'Angalanermut pilersaarut piareersassavara — {{contador}} ullut · {{lasNoches}} — ullormiit ullormut, aningaasartuutissanillu missiliuussaqarluni. Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara.',
  travelExplicaItinerarioTuViaje: 'Angalanissannut pilersaarut piareersassavara, ullormiit ullormut, aningaasartuutissanillu missiliuussaqarluni.',
  travelExplicaItinerarioTuViajeAviso: 'Angalanissannut pilersaarut piareersassavara, ullormiit ullormut, aningaasartuutissanillu missiliuussaqarluni. Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara.',

  travelExplicaQueHacer: 'Suut takusassaanersut sumilu nerisoqarsinnaanersoq ujarlissavara, tamarmillu aallaavii ilanngussavakka misissorsinnaaqqullugit.',
  travelExplicaMoverse: 'Angalaarnissamut periarfissat ujarlissavakka, qanoq sivisutigisut qanorlu akeqartiginersut missiliorlugit.',

  travelLasNoches_one: '{{contador}} unnuaq',
  travelLasNoches_other: '{{contador}} unnuat',

  travelDecisionTresViajes: 'angalanernik pingasunik assigiinngitsunik siunnersuuteqassaanga',
  travelDecisionTresViajesAviso: 'angalanernik pingasunik assigiinngitsunik siunnersuuteqassaanga. Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara',
  travelDecisionReparto: 'ullut agguassavakka, tamani pitsaanerpaat ilanngullugit',
  travelDecisionRepartoAviso: 'ullut agguassavakka, tamani pitsaanerpaat ilanngullugit. Ullut ilisimalerukkit, oqaluttuutinga — ukiup ilaanut naleqqussassavara',

  travelPasoDestinos: 'Angalaffissanik pingasunik naleqquttunik ujarlerneq',
  travelPasoQueHacer: 'Takusassanik neriniartarfinnillu ujarlerneq',
  travelPasoMoverse: 'Angalaarnissamut periarfissanik ujarlerneq',
  travelPasoItinerario_one: '{{contador}} ullormut angalanermut pilersaarummik piareersaaneq',
  travelPasoItinerario_other: '{{contador}} ullunut angalanermut pilersaarummik piareersaaneq',
  travelPasoItinerarioTuViaje: 'Angalanissannut pilersaarummik piareersaaneq',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  brainExplica: 'Pisariaqartitatit paasilluassavakka, akissummillu ersarissumik piareersaassaanga, alloriarnissat tulliuttut ilanngullugit.',
  brainDecisionPuntoDePartida: 'aallarnerfissamik siunnersuuteqassaanga, pisariaqarpallu Weë atorlugu immikkut ilisimasalimmut naleqquttumut ingerlatissavakkit',
  brainPasoEntender: 'Paasiniaaneq: pisariaqartitatit',
  brainPasoRespuesta: 'Akissummik ersarissumik alloriarnissanillu tulliuttunik piareersaaneq',
};
