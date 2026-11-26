/*
 * ALEMÁN SUIZO (de-CH, adaptado de `de/servidor`: ss, «…» y léxico suizo) — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. `{{fechas}}` llega como una fecha sin
 * preposición («12.–22. Oktober 2026», `weeai.tripSameMonth`), por eso va detrás de la etiqueta «Reisezeit:». `{{busca}}`
 * entra en acusativo detrás de «du suchst» («viel Ruhe», «etwas Überraschendes»).
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  businessExplicaContenido: 'Ich mache mich mit deinem Geschäft vertraut, schreibe den Beitrag (Ton: {{tono}}) und erstelle das passende Bild.',
  businessExplicaCalendario: 'Ich erstelle deinen Veröffentlichungsplan für die Woche, mit Tag, Uhrzeit und Netzwerk für jeden Beitrag.',
  businessExplicaPublicar: 'Ich bereite den Beitrag vor und passe ihn an jedes Netzwerk an, sodass du ihn nur noch kopieren und selbst veröffentlichen musst. Weë ist noch nicht mit deinen Konten verbunden und veröffentlicht daher nicht für dich.',
  businessExplicaRespuesta: 'Ich schreibe eine freundliche und klare Antwort für deinen Kunden, fertig zum Senden.',
  businessExplicaResultados: 'Ich prüfe deine Ergebnisse und sage dir, was funktioniert hat und was sich diese Woche lohnt.',
  businessExplicaCampana: 'Ich mache mich mit deinem Geschäft vertraut, entwerfe die Kampagne (Ton: {{tono}}) und erstelle ihr Hauptbild.',
  businessExplicaCv: 'Ich mache mich mit deiner Erfahrung vertraut und schreibe deinen Lebenslauf (Ton: {{tono}}), fertig zur Verwendung.',
  businessExplicaPresentacion: 'Zuerst mache ich mich mit deinem Geschäft vertraut, dann schreibe ich die Präsentation Folie für Folie (Ton: {{tono}}).',
  businessExplicaDocumento: 'Zuerst mache ich mich mit deinem Geschäft vertraut, dann schreibe ich das Dokument (Ton: {{tono}}).',
  businessExplicaIdeas: 'Zuerst mache ich mich mit deinem Geschäft vertraut, dann schlage ich dir konkrete Ideen und eine Wachstumsstrategie vor.',

  businessTonoProfesionalPeroCercano: 'professionell, aber persönlich',

  businessDecisionTonoProfesionalPeroCercano: 'verwende ich einen professionellen, aber persönlichen Ton',
  businessDecisionTonoCercanoYProfesional: 'verwende ich einen persönlichen und professionellen Ton',
  businessDecisionTonoProfesional: 'verwende ich einen professionellen Ton',
  businessDecisionIdeasConcretas: 'fange ich mit konkreten Ideen an',

  businessPasoEntender: 'Dein Geschäft und dein Ziel verstehen',
  businessPasoImagenPublicacion: 'Das Bild für den Beitrag erstellen',
  businessPasoCalendario: 'Den Veröffentlichungsplan erstellen',
  businessPasoPrepararPublicacion: 'Den Beitrag vorbereiten',
  businessPasoAdaptarACadaRed: 'Ihn an jedes Netzwerk anpassen',
  businessPasoRespuesta: 'Die Antwort für deinen Kunden schreiben',
  businessPasoResultados: 'Deine Ergebnisse prüfen und erklären',
  businessPasoCampana: 'Die Kampagne entwerfen',
  businessPasoImagenCampana: 'Das Bild für die Kampagne erstellen',
  businessPasoPresentacion: 'Die Präsentation schreiben (Folie für Folie)',
  businessPasoMercado: 'Nachsehen, wie dein Markt gerade aussieht',
  businessPasoIdeas: 'Ideen und eine Strategie vorschlagen',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  travelExplicaDestinosFechas: 'Ich schlage dir drei Reiseziele vor (Reisezeit: {{fechas}}), passend dazu, dass du {{busca}} suchst. Für das Ziel deiner Wahl plane ich dir die ganze Reise.',
  travelExplicaDestinosDias_one: 'Ich schlage dir drei Reiseziele für {{contador}} Tag · {{lasNoches}} vor, passend dazu, dass du {{busca}} suchst. Für das Ziel deiner Wahl plane ich dir die ganze Reise.',
  travelExplicaDestinosDias_other: 'Ich schlage dir drei Reiseziele für {{contador}} Tage · {{lasNoches}} vor, passend dazu, dass du {{busca}} suchst. Für das Ziel deiner Wahl plane ich dir die ganze Reise.',
  travelExplicaDestinosDiasAviso_one: 'Ich schlage dir drei Reiseziele für {{contador}} Tag · {{lasNoches}} vor, passend dazu, dass du {{busca}} suchst. Für das Ziel deiner Wahl plane ich dir die ganze Reise. Sobald du die Reisedaten kennst, sag sie mir, dann stimme ich alles auf die Saison ab.',
  travelExplicaDestinosDiasAviso_other: 'Ich schlage dir drei Reiseziele für {{contador}} Tage · {{lasNoches}} vor, passend dazu, dass du {{busca}} suchst. Für das Ziel deiner Wahl plane ich dir die ganze Reise. Sobald du die Reisedaten kennst, sag sie mir, dann stimme ich alles auf die Saison ab.',
  travelExplicaDestinosTuViaje: 'Ich schlage dir drei Reiseziele für deine Reise vor, passend dazu, dass du {{busca}} suchst. Für das Ziel deiner Wahl plane ich dir die ganze Reise.',
  travelExplicaDestinosTuViajeAviso: 'Ich schlage dir drei Reiseziele für deine Reise vor, passend dazu, dass du {{busca}} suchst. Für das Ziel deiner Wahl plane ich dir die ganze Reise. Sobald du die Reisedaten kennst, sag sie mir, dann stimme ich alles auf die Saison ab.',

  travelBuscaSorpresa: 'etwas Überraschendes',

  travelExplicaItinerarioFechas_one: 'Ich erstelle deinen Reiseplan (Reisezeit: {{fechas}}, {{contador}} Tag · {{lasNoches}}), Tag für Tag und mit einem ungefähren Budget.',
  travelExplicaItinerarioFechas_other: 'Ich erstelle deinen Reiseplan (Reisezeit: {{fechas}}, {{contador}} Tage · {{lasNoches}}), Tag für Tag und mit einem ungefähren Budget.',
  travelExplicaItinerarioDias_one: 'Ich erstelle deinen Reiseplan für {{contador}} Tag · {{lasNoches}}, Tag für Tag und mit einem ungefähren Budget.',
  travelExplicaItinerarioDias_other: 'Ich erstelle deinen Reiseplan für {{contador}} Tage · {{lasNoches}}, Tag für Tag und mit einem ungefähren Budget.',
  travelExplicaItinerarioDiasAviso_one: 'Ich erstelle deinen Reiseplan für {{contador}} Tag · {{lasNoches}}, Tag für Tag und mit einem ungefähren Budget. Sobald du die Reisedaten kennst, sag sie mir, dann stimme ich alles auf die Saison ab.',
  travelExplicaItinerarioDiasAviso_other: 'Ich erstelle deinen Reiseplan für {{contador}} Tage · {{lasNoches}}, Tag für Tag und mit einem ungefähren Budget. Sobald du die Reisedaten kennst, sag sie mir, dann stimme ich alles auf die Saison ab.',
  travelExplicaItinerarioTuViaje: 'Ich erstelle den Plan für deine Reise, Tag für Tag und mit einem ungefähren Budget.',
  travelExplicaItinerarioTuViajeAviso: 'Ich erstelle den Plan für deine Reise, Tag für Tag und mit einem ungefähren Budget. Sobald du die Reisedaten kennst, sag sie mir, dann stimme ich alles auf die Saison ab.',

  travelExplicaQueHacer: 'Ich suche, was sich lohnt und wo man gut isst, und gebe dir zu allem die Quelle, damit du es prüfen kannst.',
  travelExplicaMoverse: 'Ich suche nach Möglichkeiten, wie du dich fortbewegen kannst, mit ungefährer Dauer und ungefähren Kosten.',

  travelLasNoches_one: '{{contador}} Nacht',
  travelLasNoches_other: '{{contador}} Nächte',

  travelDecisionTresViajes: 'schlage ich dir drei ganz unterschiedliche Reisen vor',
  travelDecisionTresViajesAviso: 'schlage ich dir drei ganz unterschiedliche Reisen vor. Sobald du die Reisedaten kennst, sag sie mir, dann stimme ich alles auf die Saison ab',
  travelDecisionReparto: 'verteile ich die Tage auf das Beste von allem',
  travelDecisionRepartoAviso: 'verteile ich die Tage auf das Beste von allem. Sobald du die Reisedaten kennst, sag sie mir, dann stimme ich alles auf die Saison ab',

  travelPasoDestinos: 'Drei passende Reiseziele suchen',
  travelPasoQueHacer: 'Suchen, was sich lohnt und wo man gut isst',
  travelPasoMoverse: 'Suchen, wie du dich fortbewegen kannst',
  travelPasoItinerario_one: 'Den Reiseplan für {{contador}} Tag erstellen',
  travelPasoItinerario_other: 'Den Reiseplan für {{contador}} Tage erstellen',
  travelPasoItinerarioTuViaje: 'Den Plan für deine Reise erstellen',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  brainExplica: 'Ich versuche genau zu verstehen, was du brauchst, und bereite dir eine klare Antwort mit den nächsten Schritten vor.',
  brainDecisionPuntoDePartida: 'schlage ich dir einen Ausgangspunkt vor und bringe dich bei Bedarf zum passenden Weë-Spezialisten',
  brainPasoEntender: 'Genau verstehen, was du brauchst',
  brainPasoRespuesta: 'Dir eine klare Antwort mit den nächsten Schritten vorbereiten',
};
