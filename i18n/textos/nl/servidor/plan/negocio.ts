/*
 * NEERLANDÉS — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` llega en neerlandés sin preposición («12 oktober 2026», «12–22 oktober 2026», «… – …»), así que la pone
 * la frase: «je reis van {{fechas}}». `{{busca}}` entra detrás de «op zoek naar», como sustantivo. «Itinerario» es
 * «reisschema», como en `catalogo`.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Ik breng je bedrijf in kaart, schrijf het bericht in een toon die {{tono}} klinkt en maak de afbeelding erbij.',
  businessExplicaCalendario: 'Ik stel je berichtenkalender voor de week op, met dag, tijd en netwerk voor elk bericht.',
  businessExplicaPublicar: 'Ik bereid het bericht voor en pas het aan elk netwerk aan, zodat jij het kunt kopiëren en plaatsen. Weë is nog niet gekoppeld aan je netwerken en plaatst dus niet voor je.',
  businessExplicaRespuesta: 'Ik schrijf een vriendelijk en duidelijk antwoord voor je klant, klaar om te versturen.',
  businessExplicaResultados: 'Ik bekijk je resultaten en vertel je wat werkte en wat je deze week het beste kunt doen.',
  businessExplicaCampana: 'Ik breng je bedrijf in kaart, ontwerp de campagne in een toon die {{tono}} klinkt en maak de hoofdafbeelding.',
  businessExplicaCv: 'Ik breng je ervaring in kaart en schrijf je cv in een toon die {{tono}} klinkt, klaar voor gebruik.',
  businessExplicaPresentacion: 'Eerst breng ik je bedrijf in kaart en daarna schrijf ik de presentatie dia voor dia, in een toon die {{tono}} klinkt.',
  businessExplicaDocumento: 'Eerst breng ik je bedrijf in kaart en daarna schrijf ik het document in een toon die {{tono}} klinkt.',
  businessExplicaIdeas: 'Eerst breng ik je bedrijf in kaart en daarna stel ik concrete ideeën en een groeistrategie voor.',

  businessTonoProfesionalPeroCercano: 'professioneel maar toegankelijk',

  businessDecisionTonoProfesionalPeroCercano: 'gebruik ik een professionele maar toegankelijke toon',
  businessDecisionTonoCercanoYProfesional: 'gebruik ik een toegankelijke en professionele toon',
  businessDecisionTonoProfesional: 'gebruik ik een professionele toon',
  businessDecisionIdeasConcretas: 'begin ik met concrete ideeën',

  businessPasoEntender: 'Je bedrijf en je doel in kaart brengen',
  businessPasoImagenPublicacion: 'De afbeelding voor het bericht maken',
  businessPasoCalendario: 'De berichtenkalender opstellen',
  businessPasoPrepararPublicacion: 'Het bericht voorbereiden',
  businessPasoAdaptarACadaRed: 'Aanpassen aan elk netwerk',
  businessPasoRespuesta: 'Het antwoord voor je klant schrijven',
  businessPasoResultados: 'Je resultaten bekijken en uitleggen',
  businessPasoCampana: 'De campagne ontwerpen',
  businessPasoImagenCampana: 'De afbeelding van de campagne maken',
  businessPasoPresentacion: 'De presentatie schrijven (dia voor dia)',
  businessPasoMercado: 'Uitzoeken hoe je markt er nu voor staat',
  businessPasoIdeas: 'Ideeën en een strategie voorstellen',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Ik stel drie bestemmingen voor je reis van {{fechas}} voor, omdat je op zoek bent naar {{busca}}. Met de bestemming die je kiest, bereid ik de hele reis voor.',
  travelExplicaDestinosDias_one: 'Ik stel drie bestemmingen voor {{contador}} dag · {{lasNoches}} voor, omdat je op zoek bent naar {{busca}}. Met de bestemming die je kiest, bereid ik de hele reis voor.',
  travelExplicaDestinosDias_other: 'Ik stel drie bestemmingen voor {{contador}} dagen · {{lasNoches}} voor, omdat je op zoek bent naar {{busca}}. Met de bestemming die je kiest, bereid ik de hele reis voor.',
  travelExplicaDestinosDiasAviso_one: 'Ik stel drie bestemmingen voor {{contador}} dag · {{lasNoches}} voor, omdat je op zoek bent naar {{busca}}. Met de bestemming die je kiest, bereid ik de hele reis voor. Als je de data weet, laat het me weten, dan stem ik het af op het seizoen.',
  travelExplicaDestinosDiasAviso_other: 'Ik stel drie bestemmingen voor {{contador}} dagen · {{lasNoches}} voor, omdat je op zoek bent naar {{busca}}. Met de bestemming die je kiest, bereid ik de hele reis voor. Als je de data weet, laat het me weten, dan stem ik het af op het seizoen.',
  travelExplicaDestinosTuViaje: 'Ik stel drie bestemmingen voor je reis voor, omdat je op zoek bent naar {{busca}}. Met de bestemming die je kiest, bereid ik de hele reis voor.',
  travelExplicaDestinosTuViajeAviso: 'Ik stel drie bestemmingen voor je reis voor, omdat je op zoek bent naar {{busca}}. Met de bestemming die je kiest, bereid ik de hele reis voor. Als je de data weet, laat het me weten, dan stem ik het af op het seizoen.',

  travelBuscaSorpresa: 'iets wat je verrast',

  travelExplicaItinerarioFechas_one: 'Ik stel het reisschema op voor je reis van {{fechas}} ({{contador}} dag · {{lasNoches}}), dag voor dag en met een geschat budget.',
  travelExplicaItinerarioFechas_other: 'Ik stel het reisschema op voor je reis van {{fechas}} ({{contador}} dagen · {{lasNoches}}), dag voor dag en met een geschat budget.',
  travelExplicaItinerarioDias_one: 'Ik stel het reisschema op voor {{contador}} dag · {{lasNoches}}, dag voor dag en met een geschat budget.',
  travelExplicaItinerarioDias_other: 'Ik stel het reisschema op voor {{contador}} dagen · {{lasNoches}}, dag voor dag en met een geschat budget.',
  travelExplicaItinerarioDiasAviso_one: 'Ik stel het reisschema op voor {{contador}} dag · {{lasNoches}}, dag voor dag en met een geschat budget. Als je de data weet, laat het me weten, dan stem ik het af op het seizoen.',
  travelExplicaItinerarioDiasAviso_other: 'Ik stel het reisschema op voor {{contador}} dagen · {{lasNoches}}, dag voor dag en met een geschat budget. Als je de data weet, laat het me weten, dan stem ik het af op het seizoen.',
  travelExplicaItinerarioTuViaje: 'Ik stel het reisschema voor je reis op, dag voor dag en met een geschat budget.',
  travelExplicaItinerarioTuViajeAviso: 'Ik stel het reisschema voor je reis op, dag voor dag en met een geschat budget. Als je de data weet, laat het me weten, dan stem ik het af op het seizoen.',

  travelExplicaQueHacer: 'Ik zoek uit wat de moeite waard is en waar je kunt eten, en geef bij alles de bron, zodat je het kunt controleren.',
  travelExplicaMoverse: 'Ik zoek uit hoe je je kunt verplaatsen, met hoe lang het duurt en wat het ongeveer kost.',

  travelLasNoches_one: '{{contador}} nacht',
  travelLasNoches_other: '{{contador}} nachten',

  travelDecisionTresViajes: 'stel ik drie reizen voor die flink van elkaar verschillen',
  travelDecisionTresViajesAviso: 'stel ik drie reizen voor die flink van elkaar verschillen. Als je de data weet, laat het me weten, dan stem ik het af op het seizoen',
  travelDecisionReparto: 'verdeel ik de dagen over het beste van alles',
  travelDecisionRepartoAviso: 'verdeel ik de dagen over het beste van alles. Als je de data weet, laat het me weten, dan stem ik het af op het seizoen',

  travelPasoDestinos: 'Drie passende bestemmingen zoeken',
  travelPasoQueHacer: 'Uitzoeken wat de moeite waard is en waar je kunt eten',
  travelPasoMoverse: 'Uitzoeken hoe je je kunt verplaatsen',
  travelPasoItinerario_one: 'Het reisschema voor {{contador}} dag opstellen',
  travelPasoItinerario_other: 'Het reisschema voor {{contador}} dagen opstellen',
  travelPasoItinerarioTuViaje: 'Het reisschema voor je reis opstellen',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Ik zoek goed uit wat je nodig hebt en bereid een duidelijk antwoord voor, met de volgende stappen.',
  brainDecisionPuntoDePartida: 'stel ik een startpunt voor en breng ik je zo nodig naar de juiste specialist van Weë',
  brainPasoEntender: 'Goed uitzoeken wat je nodig hebt',
  brainPasoRespuesta: 'Een duidelijk antwoord met de volgende stappen voorbereiden',
};
