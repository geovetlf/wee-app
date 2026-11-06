/*
 * FRANCÉS — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae su preposición (`weeai.tripOneDay`, `tripSameMonth`, `tripRange`: «le 12 octobre», «du 12 au 22
 * octobre»), así que va suelta detrás del verbo. `{{busca}}` puede ser un verbo o un nombre: entra detrás de dos puntos
 * para que sirvan los dos. `travelPasoItinerario_one` va en singular, a diferencia del español.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Je vais comprendre ton activité, écrire la publication sur un ton {{tono}} et créer l’image qui l’accompagne.',
  businessExplicaCalendario: 'Je vais établir ton calendrier de publications de la semaine, avec le jour, l’heure et le réseau de chacune.',
  businessExplicaPublicar: 'Je vais préparer la publication et l’adapter à chaque réseau, prête à être copiée et publiée par toi. Weë n’est pas encore connecté à tes réseaux, donc il ne publie pas à ta place.',
  businessExplicaRespuesta: 'Je vais écrire une réponse aimable et claire pour ton client, prête à envoyer.',
  businessExplicaResultados: 'Je vais examiner tes résultats, te dire ce qui a marché et ce qu’il vaut mieux faire cette semaine.',
  businessExplicaCampana: 'Je vais comprendre ton activité, concevoir la campagne sur un ton {{tono}} et créer son image principale.',
  businessExplicaCv: 'Je vais comprendre ton expérience et rédiger ton CV sur un ton {{tono}}, prêt à l’emploi.',
  businessExplicaPresentacion: 'Je comprends d’abord ton activité, puis j’écris la présentation diapositive par diapositive sur un ton {{tono}}.',
  businessExplicaDocumento: 'Je comprends d’abord ton activité, puis je rédige le document sur un ton {{tono}}.',
  businessExplicaIdeas: 'Je comprends d’abord ton activité, puis je te propose des idées concrètes et une stratégie pour grandir.',

  businessTonoProfesionalPeroCercano: 'professionnel mais chaleureux',

  businessDecisionTonoProfesionalPeroCercano: 'j’utilise un ton professionnel mais chaleureux',
  businessDecisionTonoCercanoYProfesional: 'j’utilise un ton chaleureux et professionnel',
  businessDecisionTonoProfesional: 'j’utilise un ton professionnel',
  businessDecisionIdeasConcretas: 'je commence par des idées concrètes',

  businessPasoEntender: 'Comprendre ton activité et ton objectif',
  businessPasoImagenPublicacion: 'Créer l’image de la publication',
  businessPasoCalendario: 'Établir le calendrier de publications',
  businessPasoPrepararPublicacion: 'Préparer la publication',
  businessPasoAdaptarACadaRed: 'L’adapter à chaque réseau',
  businessPasoRespuesta: 'Écrire la réponse pour ton client',
  businessPasoResultados: 'Examiner tes résultats et les expliquer',
  businessPasoCampana: 'Concevoir la campagne',
  businessPasoImagenCampana: 'Créer l’image de la campagne',
  businessPasoPresentacion: 'Écrire la présentation (diapositive par diapositive)',
  businessPasoMercado: 'Regarder où en est ton marché aujourd’hui',
  businessPasoIdeas: 'Proposer des idées et une stratégie',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Je vais te proposer trois destinations pour voyager {{fechas}}, en pensant à ce que tu cherches : {{busca}}. Avec celle que tu choisiras, je te prépare tout le voyage.',
  travelExplicaDestinosDias_one: 'Je vais te proposer trois destinations pour {{contador}} jour · {{lasNoches}}, en pensant à ce que tu cherches : {{busca}}. Avec celle que tu choisiras, je te prépare tout le voyage.',
  travelExplicaDestinosDias_other: 'Je vais te proposer trois destinations pour {{contador}} jours · {{lasNoches}}, en pensant à ce que tu cherches : {{busca}}. Avec celle que tu choisiras, je te prépare tout le voyage.',
  travelExplicaDestinosDiasAviso_one: 'Je vais te proposer trois destinations pour {{contador}} jour · {{lasNoches}}, en pensant à ce que tu cherches : {{busca}}. Avec celle que tu choisiras, je te prépare tout le voyage. Quand tu connaîtras les dates, dis-les-moi et j’ajusterai selon la saison.',
  travelExplicaDestinosDiasAviso_other: 'Je vais te proposer trois destinations pour {{contador}} jours · {{lasNoches}}, en pensant à ce que tu cherches : {{busca}}. Avec celle que tu choisiras, je te prépare tout le voyage. Quand tu connaîtras les dates, dis-les-moi et j’ajusterai selon la saison.',
  travelExplicaDestinosTuViaje: 'Je vais te proposer trois destinations pour ton voyage, en pensant à ce que tu cherches : {{busca}}. Avec celle que tu choisiras, je te prépare tout le voyage.',
  travelExplicaDestinosTuViajeAviso: 'Je vais te proposer trois destinations pour ton voyage, en pensant à ce que tu cherches : {{busca}}. Avec celle que tu choisiras, je te prépare tout le voyage. Quand tu connaîtras les dates, dis-les-moi et j’ajusterai selon la saison.',

  travelBuscaSorpresa: 'quelque chose qui te surprenne',

  travelExplicaItinerarioFechas_one: 'Je vais te préparer l’itinéraire {{fechas}} ({{contador}} jour · {{lasNoches}}), jour par jour et avec un budget approximatif.',
  travelExplicaItinerarioFechas_other: 'Je vais te préparer l’itinéraire {{fechas}} ({{contador}} jours · {{lasNoches}}), jour par jour et avec un budget approximatif.',
  travelExplicaItinerarioDias_one: 'Je vais te préparer un itinéraire de {{contador}} jour · {{lasNoches}}, jour par jour et avec un budget approximatif.',
  travelExplicaItinerarioDias_other: 'Je vais te préparer un itinéraire de {{contador}} jours · {{lasNoches}}, jour par jour et avec un budget approximatif.',
  travelExplicaItinerarioDiasAviso_one: 'Je vais te préparer un itinéraire de {{contador}} jour · {{lasNoches}}, jour par jour et avec un budget approximatif. Quand tu connaîtras les dates, dis-les-moi et j’ajusterai selon la saison.',
  travelExplicaItinerarioDiasAviso_other: 'Je vais te préparer un itinéraire de {{contador}} jours · {{lasNoches}}, jour par jour et avec un budget approximatif. Quand tu connaîtras les dates, dis-les-moi et j’ajusterai selon la saison.',
  travelExplicaItinerarioTuViaje: 'Je vais te préparer l’itinéraire de ton voyage, jour par jour et avec un budget approximatif.',
  travelExplicaItinerarioTuViajeAviso: 'Je vais te préparer l’itinéraire de ton voyage, jour par jour et avec un budget approximatif. Quand tu connaîtras les dates, dis-les-moi et j’ajusterai selon la saison.',

  travelExplicaQueHacer: 'Je vais chercher ce qui vaut le coup et où manger, et je te laisse la source de chaque chose pour que tu puisses vérifier.',
  travelExplicaMoverse: 'Je vais chercher les façons de te déplacer, avec le temps qu’elles prennent et leur coût approximatif.',

  travelLasNoches_one: '{{contador}} nuit',
  travelLasNoches_other: '{{contador}} nuits',

  travelDecisionTresViajes: 'je te propose trois voyages différents les uns des autres',
  travelDecisionTresViajesAviso: 'je te propose trois voyages différents les uns des autres. Quand tu connaîtras les dates, dis-les-moi et j’ajusterai selon la saison',
  travelDecisionReparto: 'je répartis les jours entre le meilleur de chaque chose',
  travelDecisionRepartoAviso: 'je répartis les jours entre le meilleur de chaque chose. Quand tu connaîtras les dates, dis-les-moi et j’ajusterai selon la saison',

  travelPasoDestinos: 'Chercher trois destinations qui te conviennent',
  travelPasoQueHacer: 'Chercher ce qui vaut le coup et où manger',
  travelPasoMoverse: 'Chercher comment se déplacer',
  travelPasoItinerario_one: 'Préparer l’itinéraire de {{contador}} jour',
  travelPasoItinerario_other: 'Préparer l’itinéraire de {{contador}} jours',
  travelPasoItinerarioTuViaje: 'Préparer l’itinéraire de ton voyage',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Je vais bien comprendre ce dont tu as besoin et te préparer une réponse claire, avec les prochaines étapes.',
  brainDecisionPuntoDePartida: 'je te propose un point de départ et, si besoin, je t’emmène vers le spécialiste de Weë qui convient',
  brainPasoEntender: 'Bien comprendre ce dont tu as besoin',
  brainPasoRespuesta: 'Te préparer une réponse claire avec les prochaines étapes',
};
