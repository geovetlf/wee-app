/*
 * NORUEGO BOKMÅL — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae su preposición. `{{busca}}` son sustantivos (`../opciones.ts`): «du ser etter hvile». El
 * itinerario es «reiserute» (`catalogo`).
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ──────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Jeg setter meg inn i bedriften din, skriver innlegget med en {{tono}} tone og lager bildet som hører til.',
  businessExplicaCalendario: 'Jeg setter opp innleggskalenderen din for uken, med dag, klokkeslett og nettverk for hvert innlegg.',
  businessExplicaPublicar: 'Jeg klargjør innlegget og tilpasser det til hvert nettverk, klart til at du kan kopiere og publisere det selv. Weë er ennå ikke koblet til nettverkene dine, så det publiserer ikke for deg.',
  businessExplicaRespuesta: 'Jeg skriver et vennlig og tydelig svar til kunden din, klart til å sendes.',
  businessExplicaResultados: 'Jeg går gjennom resultatene dine og forteller deg hva som fungerte og hva det lønner seg å gjøre denne uken.',
  businessExplicaCampana: 'Jeg setter meg inn i bedriften din, designer kampanjen med en {{tono}} tone og lager hovedbildet.',
  businessExplicaCv: 'Jeg setter meg inn i erfaringen din og skriver CV-en din med en {{tono}} tone, klar til bruk.',
  businessExplicaPresentacion: 'Først setter jeg meg inn i bedriften din, og så skriver jeg presentasjonen lysbilde for lysbilde med en {{tono}} tone.',
  businessExplicaDocumento: 'Først setter jeg meg inn i bedriften din, og så skriver jeg dokumentet med en {{tono}} tone.',
  businessExplicaIdeas: 'Først setter jeg meg inn i bedriften din, og så foreslår jeg konkrete ideer og en strategi for å vokse.',

  businessTonoProfesionalPeroCercano: 'profesjonell, men personlig',

  businessDecisionTonoProfesionalPeroCercano: 'bruker jeg en profesjonell, men personlig tone',
  businessDecisionTonoCercanoYProfesional: 'bruker jeg en personlig og profesjonell tone',
  businessDecisionTonoProfesional: 'bruker jeg en profesjonell tone',
  businessDecisionIdeasConcretas: 'starter jeg med konkrete ideer',

  businessPasoEntender: 'Sette seg inn i bedriften din og målet ditt',
  businessPasoImagenPublicacion: 'Lage bildet til innlegget',
  businessPasoCalendario: 'Sette opp innleggskalenderen',
  businessPasoPrepararPublicacion: 'Klargjøre innlegget',
  businessPasoAdaptarACadaRed: 'Tilpasse det til hvert nettverk',
  businessPasoRespuesta: 'Skrive svaret til kunden din',
  businessPasoResultados: 'Gå gjennom resultatene dine og forklare dem',
  businessPasoCampana: 'Designe kampanjen',
  businessPasoImagenCampana: 'Lage bildet til kampanjen',
  businessPasoPresentacion: 'Skrive presentasjonen (lysbilde for lysbilde)',
  businessPasoMercado: 'Undersøke hvordan markedet ditt ser ut nå',
  businessPasoIdeas: 'Foreslå ideer og en strategi',

  /* ── Weë Travel ────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Jeg foreslår tre reisemål {{fechas}}, siden du ser etter {{busca}}. Når du har valgt ett, planlegger jeg hele reisen.',
  travelExplicaDestinosDias_one: 'Jeg foreslår tre reisemål for {{contador}} dag · {{lasNoches}}, siden du ser etter {{busca}}. Når du har valgt ett, planlegger jeg hele reisen.',
  travelExplicaDestinosDias_other: 'Jeg foreslår tre reisemål for {{contador}} dager · {{lasNoches}}, siden du ser etter {{busca}}. Når du har valgt ett, planlegger jeg hele reisen.',
  travelExplicaDestinosDiasAviso_one: 'Jeg foreslår tre reisemål for {{contador}} dag · {{lasNoches}}, siden du ser etter {{busca}}. Når du har valgt ett, planlegger jeg hele reisen. Når du vet datoene, si ifra, så tilpasser jeg det til sesongen.',
  travelExplicaDestinosDiasAviso_other: 'Jeg foreslår tre reisemål for {{contador}} dager · {{lasNoches}}, siden du ser etter {{busca}}. Når du har valgt ett, planlegger jeg hele reisen. Når du vet datoene, si ifra, så tilpasser jeg det til sesongen.',
  travelExplicaDestinosTuViaje: 'Jeg foreslår tre reisemål for reisen din, siden du ser etter {{busca}}. Når du har valgt ett, planlegger jeg hele reisen.',
  travelExplicaDestinosTuViajeAviso: 'Jeg foreslår tre reisemål for reisen din, siden du ser etter {{busca}}. Når du har valgt ett, planlegger jeg hele reisen. Når du vet datoene, si ifra, så tilpasser jeg det til sesongen.',

  travelBuscaSorpresa: 'noe som overrasker deg',

  travelExplicaItinerarioFechas_one: 'Jeg lager reiseruten din {{fechas}} ({{contador}} dag · {{lasNoches}}), dag for dag og med et omtrentlig budsjett.',
  travelExplicaItinerarioFechas_other: 'Jeg lager reiseruten din {{fechas}} ({{contador}} dager · {{lasNoches}}), dag for dag og med et omtrentlig budsjett.',
  travelExplicaItinerarioDias_one: 'Jeg lager reiseruten din for {{contador}} dag · {{lasNoches}}, dag for dag og med et omtrentlig budsjett.',
  travelExplicaItinerarioDias_other: 'Jeg lager reiseruten din for {{contador}} dager · {{lasNoches}}, dag for dag og med et omtrentlig budsjett.',
  travelExplicaItinerarioDiasAviso_one: 'Jeg lager reiseruten din for {{contador}} dag · {{lasNoches}}, dag for dag og med et omtrentlig budsjett. Når du vet datoene, si ifra, så tilpasser jeg det til sesongen.',
  travelExplicaItinerarioDiasAviso_other: 'Jeg lager reiseruten din for {{contador}} dager · {{lasNoches}}, dag for dag og med et omtrentlig budsjett. Når du vet datoene, si ifra, så tilpasser jeg det til sesongen.',
  travelExplicaItinerarioTuViaje: 'Jeg lager reiseruten for reisen din, dag for dag og med et omtrentlig budsjett.',
  travelExplicaItinerarioTuViajeAviso: 'Jeg lager reiseruten for reisen din, dag for dag og med et omtrentlig budsjett. Når du vet datoene, si ifra, så tilpasser jeg det til sesongen.',

  travelExplicaQueHacer: 'Jeg finner ut hva som er verdt å få med seg og hvor du kan spise, og oppgir kilden til alt, så du kan sjekke det.',
  travelExplicaMoverse: 'Jeg finner ut hvordan du kan komme deg rundt, hvor lang tid det tar og omtrent hva det koster.',

  travelLasNoches_one: '{{contador}} natt',
  travelLasNoches_other: '{{contador}} netter',

  travelDecisionTresViajes: 'foreslår jeg tre reiser som er helt forskjellige',
  travelDecisionTresViajesAviso: 'foreslår jeg tre reiser som er helt forskjellige. Når du vet datoene, si ifra, så tilpasser jeg det til sesongen',
  travelDecisionReparto: 'fordeler jeg dagene mellom det beste av alt',
  travelDecisionRepartoAviso: 'fordeler jeg dagene mellom det beste av alt. Når du vet datoene, si ifra, så tilpasser jeg det til sesongen',

  travelPasoDestinos: 'Finne tre reisemål som passer',
  travelPasoQueHacer: 'Finne ut hva som er verdt å få med seg og hvor du kan spise',
  travelPasoMoverse: 'Finne ut hvordan du kommer deg rundt',
  travelPasoItinerario_one: 'Lage reiseruten for {{contador}} dag',
  travelPasoItinerario_other: 'Lage reiseruten for {{contador}} dager',
  travelPasoItinerarioTuViaje: 'Lage reiseruten for reisen din',

  /* ── Weë Brain ─────────────────────────────────────────────────────────── */
  brainExplica: 'Jeg setter meg godt inn i hva du trenger, og gir deg et klart svar med de neste stegene.',
  brainDecisionPuntoDePartida: 'foreslår jeg et utgangspunkt og sender deg videre til riktig Weë-spesialist hvis det trengs',
  brainPasoEntender: 'Forstå godt hva du trenger',
  brainPasoRespuesta: 'Gi deg et klart svar med de neste stegene',
};
