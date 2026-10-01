/*
 * ENGLISH — El plan de Weë Business, Weë Travel y Weë Brain. Ver `../../../es/servidor/plan/negocio.ts`.
 *
 * `{{tono}}` y `{{busca}}` los rellena la etiqueta inglesa de `../opciones.ts` (sin emoji, inicial en minúscula) o la
 * pieza de este archivo; `{{fechas}}` llega ya escrita en inglés («12–22 October 2026»); `{{contador}}` son los días
 * y decide el plural; `{{lasNoches}}` es `travelLasNoches`. Las `…Decision…` completan «Since you weren’t sure, …».
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  businessExplicaContenido: 'I’ll get to know your business, write the post in a {{tono}} tone and create the image to go with it.',
  businessExplicaCalendario: 'I’ll put together your posting schedule for the week, with the day, time and network for each post.',
  businessExplicaPublicar: 'I’ll prepare the post and adapt it for each network, ready for you to copy and post yourself. Weë isn’t connected to your social media yet, so it doesn’t post for you.',
  businessExplicaRespuesta: 'I’ll write a kind, clear reply for your customer, ready to send.',
  businessExplicaResultados: 'I’ll review your results and tell you what worked and what’s worth doing this week.',
  businessExplicaCampana: 'I’ll get to know your business, design the campaign in a {{tono}} tone and create its main image.',
  businessExplicaCv: 'I’ll get to know your experience and write your CV in a {{tono}} tone, ready to use.',
  businessExplicaPresentacion: 'First I’ll get to know your business, then I’ll write the presentation slide by slide in a {{tono}} tone.',
  businessExplicaDocumento: 'First I’ll get to know your business, then I’ll draft the document in a {{tono}} tone.',
  businessExplicaIdeas: 'First I’ll get to know your business, then I’ll suggest concrete ideas and a strategy to grow.',

  businessTonoProfesionalPeroCercano: 'professional but friendly',

  businessDecisionTonoProfesionalPeroCercano: 'I’ll use a professional but friendly tone',
  businessDecisionTonoCercanoYProfesional: 'I’ll use a friendly, professional tone',
  businessDecisionTonoProfesional: 'I’ll use a professional tone',
  businessDecisionIdeasConcretas: 'I’ll start with concrete ideas',

  businessPasoEntender: 'Understand your business and your goal',
  businessPasoImagenPublicacion: 'Create the image for the post',
  businessPasoCalendario: 'Put together the posting schedule',
  businessPasoPrepararPublicacion: 'Prepare the post',
  businessPasoAdaptarACadaRed: 'Adapt it for each network',
  businessPasoRespuesta: 'Write the reply for your customer',
  businessPasoResultados: 'Review your results and explain them',
  businessPasoCampana: 'Design the campaign',
  businessPasoImagenCampana: 'Create the campaign image',
  businessPasoPresentacion: 'Write the presentation (slide by slide)',
  businessPasoMercado: 'Look up how your market is doing right now',
  businessPasoIdeas: 'Suggest ideas and a strategy',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  travelExplicaDestinosFechas: 'I’ll suggest three destinations for {{fechas}}, bearing in mind you’re looking for {{busca}}. Pick one and I’ll plan the whole trip for you.',
  travelExplicaDestinosDias_one: 'I’ll suggest three destinations for {{contador}} day · {{lasNoches}}, bearing in mind you’re looking for {{busca}}. Pick one and I’ll plan the whole trip for you.',
  travelExplicaDestinosDias_other: 'I’ll suggest three destinations for {{contador}} days · {{lasNoches}}, bearing in mind you’re looking for {{busca}}. Pick one and I’ll plan the whole trip for you.',
  travelExplicaDestinosDiasAviso_one: 'I’ll suggest three destinations for {{contador}} day · {{lasNoches}}, bearing in mind you’re looking for {{busca}}. Pick one and I’ll plan the whole trip for you. Once you know the dates, tell me and I’ll adapt the plan to the season.',
  travelExplicaDestinosDiasAviso_other: 'I’ll suggest three destinations for {{contador}} days · {{lasNoches}}, bearing in mind you’re looking for {{busca}}. Pick one and I’ll plan the whole trip for you. Once you know the dates, tell me and I’ll adapt the plan to the season.',
  travelExplicaDestinosTuViaje: 'I’ll suggest three destinations for your trip, bearing in mind you’re looking for {{busca}}. Pick one and I’ll plan the whole trip for you.',
  travelExplicaDestinosTuViajeAviso: 'I’ll suggest three destinations for your trip, bearing in mind you’re looking for {{busca}}. Pick one and I’ll plan the whole trip for you. Once you know the dates, tell me and I’ll adapt the plan to the season.',

  travelBuscaSorpresa: 'something that will surprise you',

  travelExplicaItinerarioFechas_one: 'I’ll prepare your day-by-day itinerary for {{fechas}} ({{contador}} day · {{lasNoches}}), with an approximate budget.',
  travelExplicaItinerarioFechas_other: 'I’ll prepare your day-by-day itinerary for {{fechas}} ({{contador}} days · {{lasNoches}}), with an approximate budget.',
  travelExplicaItinerarioDias_one: 'I’ll prepare your day-by-day itinerary for {{contador}} day · {{lasNoches}}, with an approximate budget.',
  travelExplicaItinerarioDias_other: 'I’ll prepare your day-by-day itinerary for {{contador}} days · {{lasNoches}}, with an approximate budget.',
  travelExplicaItinerarioDiasAviso_one: 'I’ll prepare your day-by-day itinerary for {{contador}} day · {{lasNoches}}, with an approximate budget. Once you know the dates, tell me and I’ll adapt the plan to the season.',
  travelExplicaItinerarioDiasAviso_other: 'I’ll prepare your day-by-day itinerary for {{contador}} days · {{lasNoches}}, with an approximate budget. Once you know the dates, tell me and I’ll adapt the plan to the season.',
  travelExplicaItinerarioTuViaje: 'I’ll prepare a day-by-day itinerary for your trip, with an approximate budget.',
  travelExplicaItinerarioTuViajeAviso: 'I’ll prepare a day-by-day itinerary for your trip, with an approximate budget. Once you know the dates, tell me and I’ll adapt the plan to the season.',

  travelExplicaQueHacer: 'I’ll find what’s worth seeing and where to eat, and give you the source for each one so you can check it.',
  travelExplicaMoverse: 'I’ll find the ways to get around, with roughly how long each one takes and what it costs.',

  travelLasNoches_one: '{{contador}} night',
  travelLasNoches_other: '{{contador}} nights',

  travelDecisionTresViajes: 'I’m suggesting three very different trips',
  travelDecisionTresViajesAviso: 'I’m suggesting three very different trips. Once you know the dates, tell me and I’ll adapt the plan to the season',
  travelDecisionReparto: 'I’ll split the days across the best of everything',
  travelDecisionRepartoAviso: 'I’ll split the days across the best of everything. Once you know the dates, tell me and I’ll adapt the plan to the season',

  travelPasoDestinos: 'Find three destinations that fit',
  travelPasoQueHacer: 'Find what’s worth seeing and where to eat',
  travelPasoMoverse: 'Find out how to get around',
  travelPasoItinerario_one: 'Prepare the {{contador}}-day itinerary',
  travelPasoItinerario_other: 'Prepare the {{contador}}-day itinerary',
  travelPasoItinerarioTuViaje: 'Prepare the itinerary for your trip',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  brainExplica: 'I’ll make sure I understand what you need and prepare a clear answer, with the next steps.',
  brainDecisionPuntoDePartida: 'I’m suggesting a starting point and, if needed, I’ll take you to the right Weë specialist',
  brainPasoEntender: 'Understand exactly what you need',
  brainPasoRespuesta: 'Prepare a clear answer with next steps',
};
