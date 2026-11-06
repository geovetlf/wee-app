/*
 * CATALÁN — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Plural one/other, como el español, salvo `travelPasoItinerario_one`, que va en singular. `{{fechas}}` ya trae su
 * preposición. `{{busca}}` va como objeto directo («busques descansar»).
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Entendré el teu negoci, escriuré la publicació amb un to {{tono}} i crearé la imatge que l\'acompanya.',
  businessExplicaCalendario: 'Prepararé el teu calendari de publicacions de la setmana, amb dia, hora i xarxa per a cadascuna.',
  businessExplicaPublicar: 'Prepararé la publicació i l\'adaptaré a cada xarxa, a punt perquè la copiïs i la publiquis tu. Weë encara no està connectat a les teves xarxes, així que no publica per tu.',
  businessExplicaRespuesta: 'Escriuré una resposta amable i clara per al teu client, a punt per enviar.',
  businessExplicaResultados: 'Revisaré els teus resultats i t\'explicaré què ha funcionat i què convé fer aquesta setmana.',
  businessExplicaCampana: 'Entendré el teu negoci, dissenyaré la campanya amb un to {{tono}} i crearé la seva imatge principal.',
  businessExplicaCv: 'Entendré la teva experiència i redactaré el teu CV amb un to {{tono}}, a punt per fer servir.',
  businessExplicaPresentacion: 'Primer entenc el teu negoci i després escric la presentació diapositiva per diapositiva amb un to {{tono}}.',
  businessExplicaDocumento: 'Primer entenc el teu negoci i després redacto el document amb un to {{tono}}.',
  businessExplicaIdeas: 'Primer entenc el teu negoci i després et proposo idees concretes i una estratègia per créixer.',

  businessTonoProfesionalPeroCercano: 'professional però proper',

  businessDecisionTonoProfesionalPeroCercano: 'faig servir un to professional però proper',
  businessDecisionTonoCercanoYProfesional: 'faig servir un to proper i professional',
  businessDecisionTonoProfesional: 'faig servir un to professional',
  businessDecisionIdeasConcretas: 'començo per idees concretes',

  businessPasoEntender: 'Entendre el teu negoci i el teu objectiu',
  businessPasoImagenPublicacion: 'Crear la imatge per a la publicació',
  businessPasoCalendario: 'Preparar el calendari de publicacions',
  businessPasoPrepararPublicacion: 'Preparar la publicació',
  businessPasoAdaptarACadaRed: 'Adaptar-la a cada xarxa',
  businessPasoRespuesta: 'Escriure la resposta per al teu client',
  businessPasoResultados: 'Revisar els teus resultats i explicar-los',
  businessPasoCampana: 'Dissenyar la campanya',
  businessPasoImagenCampana: 'Crear la imatge de la campanya',
  businessPasoPresentacion: 'Escriure la presentació (diapositiva per diapositiva)',
  businessPasoMercado: 'Buscar com està ara el teu mercat',
  businessPasoIdeas: 'Proposar idees i una estratègia',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Et proposaré tres destinacions {{fechas}}, tenint en compte que busques {{busca}}. Amb la que triïs, et preparo el viatge sencer.',
  travelExplicaDestinosDias_one: 'Et proposaré tres destinacions per a {{contador}} dia · {{lasNoches}}, tenint en compte que busques {{busca}}. Amb la que triïs, et preparo el viatge sencer.',
  travelExplicaDestinosDias_other: 'Et proposaré tres destinacions per a {{contador}} dies · {{lasNoches}}, tenint en compte que busques {{busca}}. Amb la que triïs, et preparo el viatge sencer.',
  travelExplicaDestinosDiasAviso_one: 'Et proposaré tres destinacions per a {{contador}} dia · {{lasNoches}}, tenint en compte que busques {{busca}}. Amb la que triïs, et preparo el viatge sencer. Quan sàpigues les dates, digues-me-les i ho quadro amb la temporada.',
  travelExplicaDestinosDiasAviso_other: 'Et proposaré tres destinacions per a {{contador}} dies · {{lasNoches}}, tenint en compte que busques {{busca}}. Amb la que triïs, et preparo el viatge sencer. Quan sàpigues les dates, digues-me-les i ho quadro amb la temporada.',
  travelExplicaDestinosTuViaje: 'Et proposaré tres destinacions per al teu viatge, tenint en compte que busques {{busca}}. Amb la que triïs, et preparo el viatge sencer.',
  travelExplicaDestinosTuViajeAviso: 'Et proposaré tres destinacions per al teu viatge, tenint en compte que busques {{busca}}. Amb la que triïs, et preparo el viatge sencer. Quan sàpigues les dates, digues-me-les i ho quadro amb la temporada.',

  travelBuscaSorpresa: 'alguna cosa que et sorprengui',

  travelExplicaItinerarioFechas_one: 'Et prepararé l\'itinerari {{fechas}} ({{contador}} dia · {{lasNoches}}), dia a dia i amb un pressupost aproximat.',
  travelExplicaItinerarioFechas_other: 'Et prepararé l\'itinerari {{fechas}} ({{contador}} dies · {{lasNoches}}), dia a dia i amb un pressupost aproximat.',
  travelExplicaItinerarioDias_one: 'Et prepararé l\'itinerari de {{contador}} dia · {{lasNoches}}, dia a dia i amb un pressupost aproximat.',
  travelExplicaItinerarioDias_other: 'Et prepararé l\'itinerari de {{contador}} dies · {{lasNoches}}, dia a dia i amb un pressupost aproximat.',
  travelExplicaItinerarioDiasAviso_one: 'Et prepararé l\'itinerari de {{contador}} dia · {{lasNoches}}, dia a dia i amb un pressupost aproximat. Quan sàpigues les dates, digues-me-les i ho quadro amb la temporada.',
  travelExplicaItinerarioDiasAviso_other: 'Et prepararé l\'itinerari de {{contador}} dies · {{lasNoches}}, dia a dia i amb un pressupost aproximat. Quan sàpigues les dates, digues-me-les i ho quadro amb la temporada.',
  travelExplicaItinerarioTuViaje: 'Et prepararé l\'itinerari del teu viatge, dia a dia i amb un pressupost aproximat.',
  travelExplicaItinerarioTuViajeAviso: 'Et prepararé l\'itinerari del teu viatge, dia a dia i amb un pressupost aproximat. Quan sàpigues les dates, digues-me-les i ho quadro amb la temporada.',

  travelExplicaQueHacer: 'Buscaré què val la pena i on menjar, i et deixaré la font de cada cosa perquè la puguis comprovar.',
  travelExplicaMoverse: 'Buscaré les maneres de moure\'t, amb el que triguen i el que costen aproximadament.',

  travelLasNoches_one: '{{contador}} nit',
  travelLasNoches_other: '{{contador}} nits',

  travelDecisionTresViajes: 'et proposo tres viatges diferents entre si',
  travelDecisionTresViajesAviso: 'et proposo tres viatges diferents entre si. Quan sàpigues les dates, digues-me-les i ho quadro amb la temporada',
  travelDecisionReparto: 'reparteixo els dies entre el millor de cada cosa',
  travelDecisionRepartoAviso: 'reparteixo els dies entre el millor de cada cosa. Quan sàpigues les dates, digues-me-les i ho quadro amb la temporada',

  travelPasoDestinos: 'Buscar tres destinacions que encaixin',
  travelPasoQueHacer: 'Buscar què val la pena i on menjar',
  travelPasoMoverse: 'Buscar com moure\'s',
  travelPasoItinerario_one: 'Preparar l\'itinerari de {{contador}} dia',
  travelPasoItinerario_other: 'Preparar l\'itinerari de {{contador}} dies',
  travelPasoItinerarioTuViaje: 'Preparar l\'itinerari del teu viatge',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Entendré bé el que necessites i et prepararé una resposta clara, amb els passos següents.',
  brainDecisionPuntoDePartida: 'et proposo un punt de partida i, si cal, et porto a l\'especialista de Weë que correspongui',
  brainPasoEntender: 'Entendre bé el que necessites',
  brainPasoRespuesta: 'Preparar-te una resposta clara amb els passos següents',
};
