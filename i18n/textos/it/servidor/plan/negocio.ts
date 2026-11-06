/*
 * ITALIANO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` llega de `weeai.tripOneDay`, `tripSameMonth` y `tripRange`, que en italiano no traen preposición («12–22
 * ottobre»): entra detrás de «date:». `{{busca}}` puede ser un verbo o un nombre: entra detrás de dos puntos para que
 * sirvan los dos. `travelPasoItinerario_one` va en singular, a diferencia del español.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Capirò la tua attività, scriverò il post con un tono {{tono}} e creerò l’immagine che lo accompagna.',
  businessExplicaCalendario: 'Preparerò il tuo calendario di post della settimana, con il giorno, l’ora e il social di ciascuno.',
  businessExplicaPublicar: 'Preparerò il post e lo adatterò a ogni social, pronto da copiare e pubblicare. Weë non è ancora collegato ai tuoi social, quindi non pubblica al posto tuo.',
  businessExplicaRespuesta: 'Scriverò una risposta gentile e chiara per il tuo cliente, pronta da inviare.',
  businessExplicaResultados: 'Esaminerò i tuoi risultati, ti dirò cosa ha funzionato e cosa conviene fare questa settimana.',
  businessExplicaCampana: 'Capirò la tua attività, progetterò la campagna con un tono {{tono}} e creerò la sua immagine principale.',
  businessExplicaCv: 'Capirò la tua esperienza e scriverò il tuo CV con un tono {{tono}}, pronto all’uso.',
  businessExplicaPresentacion: 'Prima capisco la tua attività, poi scrivo la presentazione diapositiva per diapositiva con un tono {{tono}}.',
  businessExplicaDocumento: 'Prima capisco la tua attività, poi scrivo il documento con un tono {{tono}}.',
  businessExplicaIdeas: 'Prima capisco la tua attività, poi ti propongo idee concrete e una strategia per crescere.',

  businessTonoProfesionalPeroCercano: 'professionale ma cordiale',

  businessDecisionTonoProfesionalPeroCercano: 'uso un tono professionale ma cordiale',
  businessDecisionTonoCercanoYProfesional: 'uso un tono cordiale e professionale',
  businessDecisionTonoProfesional: 'uso un tono professionale',
  businessDecisionIdeasConcretas: 'comincio da idee concrete',

  businessPasoEntender: 'Capire la tua attività e il tuo obiettivo',
  businessPasoImagenPublicacion: 'Creare l’immagine del post',
  businessPasoCalendario: 'Preparare il calendario dei post',
  businessPasoPrepararPublicacion: 'Preparare il post',
  businessPasoAdaptarACadaRed: 'Adattarlo a ogni social',
  businessPasoRespuesta: 'Scrivere la risposta per il tuo cliente',
  businessPasoResultados: 'Esaminare i tuoi risultati e spiegarli',
  businessPasoCampana: 'Progettare la campagna',
  businessPasoImagenCampana: 'Creare l’immagine della campagna',
  businessPasoPresentacion: 'Scrivere la presentazione (diapositiva per diapositiva)',
  businessPasoMercado: 'Guardare com’è il tuo mercato oggi',
  businessPasoIdeas: 'Proporre idee e una strategia',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Ti proporrò tre destinazioni per viaggiare (date: {{fechas}}), pensando a ciò che cerchi: {{busca}}. Con quella che sceglierai, ti preparo tutto il viaggio.',
  travelExplicaDestinosDias_one: 'Ti proporrò tre destinazioni per {{contador}} giorno · {{lasNoches}}, pensando a ciò che cerchi: {{busca}}. Con quella che sceglierai, ti preparo tutto il viaggio.',
  travelExplicaDestinosDias_other: 'Ti proporrò tre destinazioni per {{contador}} giorni · {{lasNoches}}, pensando a ciò che cerchi: {{busca}}. Con quella che sceglierai, ti preparo tutto il viaggio.',
  travelExplicaDestinosDiasAviso_one: 'Ti proporrò tre destinazioni per {{contador}} giorno · {{lasNoches}}, pensando a ciò che cerchi: {{busca}}. Con quella che sceglierai, ti preparo tutto il viaggio. Quando saprai le date, dimmele e adatterò tutto alla stagione.',
  travelExplicaDestinosDiasAviso_other: 'Ti proporrò tre destinazioni per {{contador}} giorni · {{lasNoches}}, pensando a ciò che cerchi: {{busca}}. Con quella che sceglierai, ti preparo tutto il viaggio. Quando saprai le date, dimmele e adatterò tutto alla stagione.',
  travelExplicaDestinosTuViaje: 'Ti proporrò tre destinazioni per il tuo viaggio, pensando a ciò che cerchi: {{busca}}. Con quella che sceglierai, ti preparo tutto il viaggio.',
  travelExplicaDestinosTuViajeAviso: 'Ti proporrò tre destinazioni per il tuo viaggio, pensando a ciò che cerchi: {{busca}}. Con quella che sceglierai, ti preparo tutto il viaggio. Quando saprai le date, dimmele e adatterò tutto alla stagione.',

  travelBuscaSorpresa: 'qualcosa che ti sorprenda',

  travelExplicaItinerarioFechas_one: 'Ti preparerò l’itinerario (date: {{fechas}}; {{contador}} giorno · {{lasNoches}}), giorno per giorno e con un budget indicativo.',
  travelExplicaItinerarioFechas_other: 'Ti preparerò l’itinerario (date: {{fechas}}; {{contador}} giorni · {{lasNoches}}), giorno per giorno e con un budget indicativo.',
  travelExplicaItinerarioDias_one: 'Ti preparerò un itinerario di {{contador}} giorno · {{lasNoches}}, giorno per giorno e con un budget indicativo.',
  travelExplicaItinerarioDias_other: 'Ti preparerò un itinerario di {{contador}} giorni · {{lasNoches}}, giorno per giorno e con un budget indicativo.',
  travelExplicaItinerarioDiasAviso_one: 'Ti preparerò un itinerario di {{contador}} giorno · {{lasNoches}}, giorno per giorno e con un budget indicativo. Quando saprai le date, dimmele e adatterò tutto alla stagione.',
  travelExplicaItinerarioDiasAviso_other: 'Ti preparerò un itinerario di {{contador}} giorni · {{lasNoches}}, giorno per giorno e con un budget indicativo. Quando saprai le date, dimmele e adatterò tutto alla stagione.',
  travelExplicaItinerarioTuViaje: 'Ti preparerò l’itinerario del tuo viaggio, giorno per giorno e con un budget indicativo.',
  travelExplicaItinerarioTuViajeAviso: 'Ti preparerò l’itinerario del tuo viaggio, giorno per giorno e con un budget indicativo. Quando saprai le date, dimmele e adatterò tutto alla stagione.',

  travelExplicaQueHacer: 'Cercherò cosa vale la pena fare e dove mangiare, e ti lascio la fonte di ogni cosa perché tu possa controllarla.',
  travelExplicaMoverse: 'Cercherò i modi per spostarti, con il tempo che richiedono e il loro costo indicativo.',

  travelLasNoches_one: '{{contador}} notte',
  travelLasNoches_other: '{{contador}} notti',

  travelDecisionTresViajes: 'ti propongo tre viaggi diversi tra loro',
  travelDecisionTresViajesAviso: 'ti propongo tre viaggi diversi tra loro. Quando saprai le date, dimmele e adatterò tutto alla stagione',
  travelDecisionReparto: 'distribuisco i giorni tra il meglio di ogni cosa',
  travelDecisionRepartoAviso: 'distribuisco i giorni tra il meglio di ogni cosa. Quando saprai le date, dimmele e adatterò tutto alla stagione',

  travelPasoDestinos: 'Cercare tre destinazioni adatte a te',
  travelPasoQueHacer: 'Cercare cosa vale la pena fare e dove mangiare',
  travelPasoMoverse: 'Cercare come spostarsi',
  travelPasoItinerario_one: 'Preparare l’itinerario di {{contador}} giorno',
  travelPasoItinerario_other: 'Preparare l’itinerario di {{contador}} giorni',
  travelPasoItinerarioTuViaje: 'Preparare l’itinerario del tuo viaggio',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Capirò bene di cosa hai bisogno e ti preparerò una risposta chiara, con i passi successivi.',
  brainDecisionPuntoDePartida: 'ti propongo un punto di partenza e, se serve, ti porto dallo specialista di Weë giusto',
  brainPasoEntender: 'Capire bene di cosa hai bisogno',
  brainPasoRespuesta: 'Prepararti una risposta chiara con i passi successivi',
};
