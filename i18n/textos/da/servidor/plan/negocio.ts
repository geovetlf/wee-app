/*
 * DANÉS — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Como en `visual.ts`: Weë habla en primera persona y en presente («Jeg sætter mig ind i …», «Jeg foreslår …»), y los
 * pasos van en infinitivo sin «at» («Forstå din virksomhed og dit mål»), porque son también el título del resultado.
 *
 * BUSINESS. El tono es un adjetivo de género común y va en «i en {{tono}} tone»: «personlig», «professionel» (de
 * `../opciones.ts`) o la pieza «professionel, men personlig», con la coma que el danés pone delante de «men». «Entender
 * tu negocio» es «sætte sig ind i din virksomhed», la expresión danesa para hacerse cargo de algo antes de trabajar
 * en ello. El calendario es la «opslagskalender» de `business`; las diapositivas, «dias for dias», el término de
 * PowerPoint en danés. La publicación SIMULADA lo dice sin rodeos: «er opslaget kun en simulering».
 *
 * TRAVEL. Las fechas las vuelve a escribir la app en danés («den 12. oktober 2026», «fra den 12. til den 22. oktober
 * 2026», con `weeai.trip…`): llevan su «den» / «fra den» y entran sin preposición detrás de «din rejse» («tre rejsemål
 * til din rejse fra den 12. …», «en rejseplan til din rejse den 12. oktober 2026»), lo que arregla el «para del 12 al
 * 22» del español y evita que la fecha se lea como el día en que Weë hace el trabajo. Lo que busca la persona son sustantivos («afslapning», «nye opdagelser», «god mad», «natur», «natteliv»)
 * detrás de «med tanke på, at du søger …»; con «No sé», la pieza «noget, der kan overraske dig». Sin fechas, la
 * duración se dice entera, «på 11 dage og 10 nætter», y con fechas va entre paréntesis como en `weeai.tripDuration`
 * («11 dage · 10 nætter»). Plurales del glosario: «1 dag / 3 dage», «1 nat / 3 nætter»; ningún `_one` escribe un
 * «1»: lo pone {{contador}}, que en danés también es 1,5. A diferencia del español, `travelPasoItinerario_one` va
 * en singular. El itinerario es la «rejseplan» y los destinos, «rejsemål» (et rejsemål, «når du har valgt et»), como
 * en `catalogo`. «Cuando sepas las fechas, dímelas y lo cuadro con la temporada» es «Når du kender datoerne, kan du
 * skrive dem til mig, så tilpasser jeg det hele til sæsonen»: «det hele» vale para la rejseplan y para el viaje.
 *
 * BRAIN. «Te llevo al especialista de Weë que corresponda» es «sender dig videre til den rette Weë-specialist», el
 * compuesto con guion del glosario (§ 9.4).
 *
 * LAS «…Decision…» cierran «Da du ikke var sikker, {{decision}}.»: empiezan por el verbo conjugado y su sujeto
 * (inversión V2): «bruger jeg en … tone», «foreslår jeg …», «fordeler jeg dagene …». Las que llevan `…Aviso` terminan
 * sin punto, porque el punto lo pone `comoNoSabias`.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  businessExplicaContenido: 'Jeg sætter mig ind i din virksomhed, skriver opslaget i en {{tono}} tone og laver billedet, der hører til.',
  businessExplicaCalendario: 'Jeg laver din opslagskalender for ugen med dag, tidspunkt og platform for hvert opslag.',
  businessExplicaPublicar: 'Jeg gør opslaget klar og tilpasser det til hver platform. Weë er endnu ikke forbundet med dine sociale medier, så du kopierer det og slår det op selv.',
  businessExplicaRespuesta: 'Jeg skriver et venligt og tydeligt svar til din kunde, klar til at sende.',
  businessExplicaResultados: 'Jeg gennemgår dine resultater og fortæller dig, hvad der virkede, og hvad du bør gøre i denne uge.',
  businessExplicaCampana: 'Jeg sætter mig ind i din virksomhed, designer kampagnen i en {{tono}} tone og laver dens hovedbillede.',
  businessExplicaCv: 'Jeg gennemgår din erfaring og skriver dit CV i en {{tono}} tone, klar til brug.',
  businessExplicaPresentacion: 'Først sætter jeg mig ind i din virksomhed, og så skriver jeg præsentationen dias for dias i en {{tono}} tone.',
  businessExplicaDocumento: 'Først sætter jeg mig ind i din virksomhed, og så skriver jeg dokumentet i en {{tono}} tone.',
  businessExplicaIdeas: 'Først sætter jeg mig ind i din virksomhed, og så giver jeg dig konkrete idéer og en strategi for vækst.',

  businessTonoProfesionalPeroCercano: 'professionel, men personlig',

  businessDecisionTonoProfesionalPeroCercano: 'bruger jeg en professionel, men personlig tone',
  businessDecisionTonoCercanoYProfesional: 'bruger jeg en personlig og professionel tone',
  businessDecisionTonoProfesional: 'bruger jeg en professionel tone',
  businessDecisionIdeasConcretas: 'starter jeg med konkrete idéer',

  businessPasoEntender: 'Forstå din virksomhed og dit mål',
  businessPasoImagenPublicacion: 'Lave billedet til opslaget',
  businessPasoCalendario: 'Lave opslagskalenderen',
  businessPasoPrepararPublicacion: 'Gøre opslaget klar',
  businessPasoAdaptarACadaRed: 'Tilpasse det til hver platform',
  businessPasoRespuesta: 'Skrive svaret til din kunde',
  businessPasoResultados: 'Gennemgå dine resultater og forklare dem',
  businessPasoCampana: 'Designe kampagnen',
  businessPasoImagenCampana: 'Lave billedet til kampagnen',
  businessPasoPresentacion: 'Skrive præsentationen (dias for dias)',
  businessPasoMercado: 'Undersøge, hvordan dit marked ser ud lige nu',
  businessPasoIdeas: 'Foreslå idéer og en strategi',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  travelExplicaDestinosFechas: 'Jeg foreslår tre rejsemål til din rejse {{fechas}} med tanke på, at du søger {{busca}}. Når du har valgt et, planlægger jeg hele rejsen.',
  travelExplicaDestinosDias_one: 'Jeg foreslår tre rejsemål til en rejse på {{contador}} dag og {{lasNoches}} med tanke på, at du søger {{busca}}. Når du har valgt et, planlægger jeg hele rejsen.',
  travelExplicaDestinosDias_other: 'Jeg foreslår tre rejsemål til en rejse på {{contador}} dage og {{lasNoches}} med tanke på, at du søger {{busca}}. Når du har valgt et, planlægger jeg hele rejsen.',
  travelExplicaDestinosDiasAviso_one: 'Jeg foreslår tre rejsemål til en rejse på {{contador}} dag og {{lasNoches}} med tanke på, at du søger {{busca}}. Når du har valgt et, planlægger jeg hele rejsen. Når du kender datoerne, kan du skrive dem til mig, så tilpasser jeg det hele til sæsonen.',
  travelExplicaDestinosDiasAviso_other: 'Jeg foreslår tre rejsemål til en rejse på {{contador}} dage og {{lasNoches}} med tanke på, at du søger {{busca}}. Når du har valgt et, planlægger jeg hele rejsen. Når du kender datoerne, kan du skrive dem til mig, så tilpasser jeg det hele til sæsonen.',
  travelExplicaDestinosTuViaje: 'Jeg foreslår tre rejsemål til din rejse med tanke på, at du søger {{busca}}. Når du har valgt et, planlægger jeg hele rejsen.',
  travelExplicaDestinosTuViajeAviso: 'Jeg foreslår tre rejsemål til din rejse med tanke på, at du søger {{busca}}. Når du har valgt et, planlægger jeg hele rejsen. Når du kender datoerne, kan du skrive dem til mig, så tilpasser jeg det hele til sæsonen.',

  travelBuscaSorpresa: 'noget, der kan overraske dig',

  travelExplicaItinerarioFechas_one: 'Jeg laver en rejseplan til din rejse {{fechas}} ({{contador}} dag · {{lasNoches}}) – dag for dag og med et omtrentligt budget.',
  travelExplicaItinerarioFechas_other: 'Jeg laver en rejseplan til din rejse {{fechas}} ({{contador}} dage · {{lasNoches}}) – dag for dag og med et omtrentligt budget.',
  travelExplicaItinerarioDias_one: 'Jeg laver en rejseplan for {{contador}} dag og {{lasNoches}} – dag for dag og med et omtrentligt budget.',
  travelExplicaItinerarioDias_other: 'Jeg laver en rejseplan for {{contador}} dage og {{lasNoches}} – dag for dag og med et omtrentligt budget.',
  travelExplicaItinerarioDiasAviso_one: 'Jeg laver en rejseplan for {{contador}} dag og {{lasNoches}} – dag for dag og med et omtrentligt budget. Når du kender datoerne, kan du skrive dem til mig, så tilpasser jeg det hele til sæsonen.',
  travelExplicaItinerarioDiasAviso_other: 'Jeg laver en rejseplan for {{contador}} dage og {{lasNoches}} – dag for dag og med et omtrentligt budget. Når du kender datoerne, kan du skrive dem til mig, så tilpasser jeg det hele til sæsonen.',
  travelExplicaItinerarioTuViaje: 'Jeg laver en rejseplan for din rejse – dag for dag og med et omtrentligt budget.',
  travelExplicaItinerarioTuViajeAviso: 'Jeg laver en rejseplan for din rejse – dag for dag og med et omtrentligt budget. Når du kender datoerne, kan du skrive dem til mig, så tilpasser jeg det hele til sæsonen.',

  travelExplicaQueHacer: 'Jeg finder ud af, hvad der er værd at opleve, og hvor du kan spise, og giver dig kilden til hvert sted, så du selv kan tjekke det.',
  travelExplicaMoverse: 'Jeg finder ud af, hvordan du kan komme rundt, hvor lang tid det tager, og omtrent hvad det koster.',

  travelLasNoches_one: '{{contador}} nat',
  travelLasNoches_other: '{{contador}} nætter',

  travelDecisionTresViajes: 'foreslår jeg tre rejser, der er helt forskellige',
  travelDecisionTresViajesAviso: 'foreslår jeg tre rejser, der er helt forskellige. Når du kender datoerne, kan du skrive dem til mig, så tilpasser jeg det hele til sæsonen',
  travelDecisionReparto: 'fordeler jeg dagene, så du får det bedste af det hele',
  travelDecisionRepartoAviso: 'fordeler jeg dagene, så du får det bedste af det hele. Når du kender datoerne, kan du skrive dem til mig, så tilpasser jeg det hele til sæsonen',

  travelPasoDestinos: 'Finde tre rejsemål, der passer til dig',
  travelPasoQueHacer: 'Finde oplevelser og spisesteder',
  travelPasoMoverse: 'Finde ud af, hvordan du kommer rundt',
  travelPasoItinerario_one: 'Lave rejseplanen for {{contador}} dag',
  travelPasoItinerario_other: 'Lave rejseplanen for {{contador}} dage',
  travelPasoItinerarioTuViaje: 'Lave rejseplanen for din rejse',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  brainExplica: 'Jeg sætter mig grundigt ind i, hvad du har brug for, og giver dig et klart svar med de næste skridt.',
  brainDecisionPuntoDePartida: 'foreslår jeg et sted at starte og sender dig videre til den rette Weë-specialist, hvis det er nødvendigt',
  brainPasoEntender: 'Forstå, hvad du har brug for',
  brainPasoRespuesta: 'Give dig et klart svar med de næste skridt',
};
