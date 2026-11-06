/*
 * SUECO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` sale de `weeai.trip…`, que en sueco no lleva preposición («12–22 oktober 2026»): la pone la frase, «för en
 * resa {{fechas}}». `{{busca}}` es un sustantivo sin artículo («god mat», «nya upptäckter») y entra tras «du söker».
 * `{{lasNoches}}` es `travelLasNoches`. El plural: `_one` solo para el 1 entero («1 dag», «1 natt»).
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  businessExplicaContenido: 'Jag lär känna ditt företag, skriver inlägget i en {{tono}} ton och skapar bilden till det.',
  businessExplicaCalendario: 'Jag sätter ihop ditt publiceringsschema för veckan, med dag, tid och nätverk för varje inlägg.',
  businessExplicaPublicar: 'Jag förbereder inlägget och anpassar det för varje nätverk, klart för dig att kopiera och publicera själv. Weë är inte kopplat till dina sociala medier än, så det publicerar inte åt dig.',
  businessExplicaRespuesta: 'Jag skriver ett vänligt och tydligt svar till din kund, klart att skicka.',
  businessExplicaResultados: 'Jag går igenom dina resultat och berättar vad som fungerade och vad som är värt att göra den här veckan.',
  businessExplicaCampana: 'Jag lär känna ditt företag, utformar kampanjen i en {{tono}} ton och skapar huvudbilden.',
  businessExplicaCv: 'Jag lär känna din erfarenhet och skriver ditt cv i en {{tono}} ton, klart att använda.',
  businessExplicaPresentacion: 'Först lär jag känna ditt företag och sedan skriver jag presentationen bild för bild i en {{tono}} ton.',
  businessExplicaDocumento: 'Först lär jag känna ditt företag och sedan skriver jag dokumentet i en {{tono}} ton.',
  businessExplicaIdeas: 'Först lär jag känna ditt företag och sedan föreslår jag konkreta idéer och en strategi för att växa.',

  businessTonoProfesionalPeroCercano: 'professionell men vänlig',

  businessDecisionTonoProfesionalPeroCercano: 'jag använder en professionell men vänlig ton',
  businessDecisionTonoCercanoYProfesional: 'jag använder en vänlig och professionell ton',
  businessDecisionTonoProfesional: 'jag använder en professionell ton',
  businessDecisionIdeasConcretas: 'jag börjar med konkreta idéer',

  businessPasoEntender: 'Förstå ditt företag och ditt mål',
  businessPasoImagenPublicacion: 'Skapa bilden till inlägget',
  businessPasoCalendario: 'Sätta ihop publiceringsschemat',
  businessPasoPrepararPublicacion: 'Förbereda inlägget',
  businessPasoAdaptarACadaRed: 'Anpassa det för varje nätverk',
  businessPasoRespuesta: 'Skriva svaret till din kund',
  businessPasoResultados: 'Gå igenom dina resultat och förklara dem',
  businessPasoCampana: 'Utforma kampanjen',
  businessPasoImagenCampana: 'Skapa bilden till kampanjen',
  businessPasoPresentacion: 'Skriva presentationen (bild för bild)',
  businessPasoMercado: 'Ta reda på hur din marknad ser ut just nu',
  businessPasoIdeas: 'Föreslå idéer och en strategi',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  travelExplicaDestinosFechas: 'Jag föreslår tre resmål för en resa {{fechas}}, med tanke på att du söker {{busca}}. Välj ett så planerar jag hela resan åt dig.',
  travelExplicaDestinosDias_one: 'Jag föreslår tre resmål för {{contador}} dag · {{lasNoches}}, med tanke på att du söker {{busca}}. Välj ett så planerar jag hela resan åt dig.',
  travelExplicaDestinosDias_other: 'Jag föreslår tre resmål för {{contador}} dagar · {{lasNoches}}, med tanke på att du söker {{busca}}. Välj ett så planerar jag hela resan åt dig.',
  travelExplicaDestinosDiasAviso_one: 'Jag föreslår tre resmål för {{contador}} dag · {{lasNoches}}, med tanke på att du söker {{busca}}. Välj ett så planerar jag hela resan åt dig. När du vet datumen kan du berätta det, så anpassar jag planen efter säsongen.',
  travelExplicaDestinosDiasAviso_other: 'Jag föreslår tre resmål för {{contador}} dagar · {{lasNoches}}, med tanke på att du söker {{busca}}. Välj ett så planerar jag hela resan åt dig. När du vet datumen kan du berätta det, så anpassar jag planen efter säsongen.',
  travelExplicaDestinosTuViaje: 'Jag föreslår tre resmål för din resa, med tanke på att du söker {{busca}}. Välj ett så planerar jag hela resan åt dig.',
  travelExplicaDestinosTuViajeAviso: 'Jag föreslår tre resmål för din resa, med tanke på att du söker {{busca}}. Välj ett så planerar jag hela resan åt dig. När du vet datumen kan du berätta det, så anpassar jag planen efter säsongen.',

  travelBuscaSorpresa: 'något som överraskar dig',

  travelExplicaItinerarioFechas_one: 'Jag tar fram din resplan dag för dag för en resa {{fechas}} ({{contador}} dag · {{lasNoches}}), med en ungefärlig budget.',
  travelExplicaItinerarioFechas_other: 'Jag tar fram din resplan dag för dag för en resa {{fechas}} ({{contador}} dagar · {{lasNoches}}), med en ungefärlig budget.',
  travelExplicaItinerarioDias_one: 'Jag tar fram din resplan dag för dag för {{contador}} dag · {{lasNoches}}, med en ungefärlig budget.',
  travelExplicaItinerarioDias_other: 'Jag tar fram din resplan dag för dag för {{contador}} dagar · {{lasNoches}}, med en ungefärlig budget.',
  travelExplicaItinerarioDiasAviso_one: 'Jag tar fram din resplan dag för dag för {{contador}} dag · {{lasNoches}}, med en ungefärlig budget. När du vet datumen kan du berätta det, så anpassar jag planen efter säsongen.',
  travelExplicaItinerarioDiasAviso_other: 'Jag tar fram din resplan dag för dag för {{contador}} dagar · {{lasNoches}}, med en ungefärlig budget. När du vet datumen kan du berätta det, så anpassar jag planen efter säsongen.',
  travelExplicaItinerarioTuViaje: 'Jag tar fram en resplan dag för dag för din resa, med en ungefärlig budget.',
  travelExplicaItinerarioTuViajeAviso: 'Jag tar fram en resplan dag för dag för din resa, med en ungefärlig budget. När du vet datumen kan du berätta det, så anpassar jag planen efter säsongen.',

  travelExplicaQueHacer: 'Jag tar reda på vad som är värt att se och var du kan äta, och anger källan till varje tips så att du kan kontrollera det.',
  travelExplicaMoverse: 'Jag tar reda på hur du kan ta dig runt, med ungefär hur lång tid varje sätt tar och vad det kostar.',

  travelLasNoches_one: '{{contador}} natt',
  travelLasNoches_other: '{{contador}} nätter',

  travelDecisionTresViajes: 'jag föreslår tre väldigt olika resor',
  travelDecisionTresViajesAviso: 'jag föreslår tre väldigt olika resor. När du vet datumen kan du berätta det, så anpassar jag planen efter säsongen',
  travelDecisionReparto: 'jag fördelar dagarna på det bästa av allt',
  travelDecisionRepartoAviso: 'jag fördelar dagarna på det bästa av allt. När du vet datumen kan du berätta det, så anpassar jag planen efter säsongen',

  travelPasoDestinos: 'Hitta tre resmål som passar',
  travelPasoQueHacer: 'Ta reda på vad som är värt att se och var du kan äta',
  travelPasoMoverse: 'Ta reda på hur du tar dig runt',
  travelPasoItinerario_one: 'Ta fram resplanen för {{contador}} dag',
  travelPasoItinerario_other: 'Ta fram resplanen för {{contador}} dagar',
  travelPasoItinerarioTuViaje: 'Ta fram resplanen för din resa',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  brainExplica: 'Jag ser till att förstå vad du behöver och tar fram ett tydligt svar med nästa steg.',
  brainDecisionPuntoDePartida: 'jag föreslår en startpunkt och tar dig vid behov till rätt Weë-expert',
  brainPasoEntender: 'Förstå exakt vad du behöver',
  brainPasoRespuesta: 'Ta fram ett tydligt svar med nästa steg',
};
