/*
 * FILIPINO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y
 * `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Como en `visual.ts`: Weë habla en primera persona y en contemplativo («Uunawain ko …», «Ihahanda ko …»), y los pasos
 * van en infinitivo-imperativo («Unawain ang negosyo at layunin mo»), porque son también el título del resultado. Las
 * «…Decision…» son oraciones completas, en minúscula, que cierran la coletilla de «No sé» (`comoNoSabias`).
 *
 * BUSINESS. El tono llega de `../opciones.ts` como adjetivo —«magiliw», «propesyonal»— o es la pieza «propesyonal pero
 * magiliw», y va detrás de «sa tonong …», con el enlace en «tono», como en Writer. «Primero entiendo tu negocio y
 * después …» es «Uunawain ko muna ang negosyo mo, saka ko …». «Red» (social) es «platform», como en `catalogo`
 * («Handa para sa bawat platform»); el calendario de publicaciones, «kalendaryo ng mga post»; «diapositiva por
 * diapositiva», «bawat slide» / «isa-isang slide»; «adaptar», «iangkop»; «mercado», «merkado»; «cliente», «customer»;
 * «CV», «resume». Que Weë todavía no publica por nadie se dice tal cual: «hindi ito nagpo-post para sa iyo».
 *
 * TRAVEL. Las fechas las vuelve a escribir la app en filipino (`weeai.trip…`) y la frase solo les deja sitio detrás
 * de «biyahe mo» («para sa biyahe mo {{fechas}}»), donde se leen bien empiecen o no por «sa» o «mula». Lo que busca
 * la persona va detrás de «ayon sa hinahanap mong …»: el enlace lo lleva «mo», así que entran igual los sustantivos de
 * las opciones («pahinga», «masarap na pagkain», «gimik»), la pieza «sorpresa» del «No sé» y lo que escriba la
 * persona. La duración se dice entera, «{{contador}} araw at {{lasNoches}}» («10 na araw at 9 na gabi»), y entre
 * paréntesis cuando hay fechas. PLURAL (guía § 8.3): la cifra va delante del sustantivo, así que `_other` es `_one`
 * con «na» tras `{{contador}}` («10 araw» / «4 na araw», «3 gabi» / «6 na gabi»); ningún `_one` escribe «isang». El
 * paso del itinerario sí distingue `_one` de `_other` por esa misma regla, aunque el español diga «días» en los dos.
 * «Itinerario», «itinerary»; «presupuesto», «budget»; «destino», «destinasyon»; «fuente», «source»; «día a día»,
 * «kada araw» (`catalogo`: «Itinerary kada araw»). «Cuando sepas las fechas, dímelas y lo cuadro con la temporada» es
 * «Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon.».
 *
 * BRAIN. «Punto de partida» es «panimula», como en Writer; «el especialista de Weë que corresponda», «ang tamang
 * espesyalista ng Weë» (glosario § 6: la marca con «ng»).
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  businessExplicaContenido: 'Uunawain ko ang negosyo mo, isusulat ko ang post sa tonong {{tono}}, at gagawin ko ang larawang kasama nito.',
  businessExplicaCalendario: 'Bubuuin ko ang kalendaryo ng mga post mo para sa buong linggo, may araw, oras at platform para sa bawat isa.',
  businessExplicaPublicar: 'Ihahanda ko ang post at iaangkop ko ito sa bawat platform, handa nang kopyahin at i-post mo. Hindi pa nakakonekta ang Weë sa mga social media account mo, kaya hindi ito nagpo-post para sa iyo.',
  businessExplicaRespuesta: 'Magsusulat ako ng magalang at malinaw na sagot para sa customer mo, handa nang ipadala.',
  businessExplicaResultados: 'Susuriin ko ang mga resulta mo at sasabihin ko kung ano ang umepekto at kung ano ang dapat gawin ngayong linggo.',
  businessExplicaCampana: 'Uunawain ko ang negosyo mo, ididisenyo ko ang kampanya sa tonong {{tono}}, at gagawin ko ang pangunahing larawan nito.',
  businessExplicaCv: 'Uunawain ko ang karanasan mo at isusulat ko ang resume mo sa tonong {{tono}}, handa nang gamitin.',
  businessExplicaPresentacion: 'Uunawain ko muna ang negosyo mo, saka ko isusulat ang bawat slide ng presentasyon sa tonong {{tono}}.',
  businessExplicaDocumento: 'Uunawain ko muna ang negosyo mo, saka ko isusulat ang dokumento sa tonong {{tono}}.',
  businessExplicaIdeas: 'Uunawain ko muna ang negosyo mo, saka ako magmumungkahi ng mga konkretong ideya at estratehiya para lumago ito.',

  businessTonoProfesionalPeroCercano: 'propesyonal pero magiliw',

  businessDecisionTonoProfesionalPeroCercano: 'gagamit ako ng tonong propesyonal pero magiliw',
  businessDecisionTonoCercanoYProfesional: 'gagamit ako ng tonong magiliw at propesyonal',
  businessDecisionTonoProfesional: 'gagamit ako ng propesyonal na tono',
  businessDecisionIdeasConcretas: 'magsisimula ako sa mga konkretong ideya',

  businessPasoEntender: 'Unawain ang negosyo at layunin mo',
  businessPasoImagenPublicacion: 'Gawin ang larawan para sa post',
  businessPasoCalendario: 'Buuin ang kalendaryo ng mga post',
  businessPasoPrepararPublicacion: 'Ihanda ang post',
  businessPasoAdaptarACadaRed: 'Iangkop ito sa bawat platform',
  businessPasoRespuesta: 'Isulat ang sagot para sa customer mo',
  businessPasoResultados: 'Suriin at ipaliwanag ang mga resulta mo',
  businessPasoCampana: 'Idisenyo ang kampanya',
  businessPasoImagenCampana: 'Gawin ang larawan ng kampanya',
  businessPasoPresentacion: 'Isulat ang presentasyon (isa-isang slide)',
  businessPasoMercado: 'Alamin ang kalagayan ng merkado mo ngayon',
  businessPasoIdeas: 'Magmungkahi ng mga ideya at estratehiya',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  travelExplicaDestinosFechas: 'Magmumungkahi ako ng tatlong destinasyon para sa biyahe mo {{fechas}}, ayon sa hinahanap mong {{busca}}. Kapag nakapili ka na, ihahanda ko ang buong biyahe.',
  travelExplicaDestinosDias_one: 'Magmumungkahi ako ng tatlong destinasyon para sa {{contador}} araw at {{lasNoches}}, ayon sa hinahanap mong {{busca}}. Kapag nakapili ka na, ihahanda ko ang buong biyahe.',
  travelExplicaDestinosDias_other: 'Magmumungkahi ako ng tatlong destinasyon para sa {{contador}} na araw at {{lasNoches}}, ayon sa hinahanap mong {{busca}}. Kapag nakapili ka na, ihahanda ko ang buong biyahe.',
  travelExplicaDestinosDiasAviso_one: 'Magmumungkahi ako ng tatlong destinasyon para sa {{contador}} araw at {{lasNoches}}, ayon sa hinahanap mong {{busca}}. Kapag nakapili ka na, ihahanda ko ang buong biyahe. Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon.',
  travelExplicaDestinosDiasAviso_other: 'Magmumungkahi ako ng tatlong destinasyon para sa {{contador}} na araw at {{lasNoches}}, ayon sa hinahanap mong {{busca}}. Kapag nakapili ka na, ihahanda ko ang buong biyahe. Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon.',
  travelExplicaDestinosTuViaje: 'Magmumungkahi ako ng tatlong destinasyon para sa biyahe mo, ayon sa hinahanap mong {{busca}}. Kapag nakapili ka na, ihahanda ko ang buong biyahe.',
  travelExplicaDestinosTuViajeAviso: 'Magmumungkahi ako ng tatlong destinasyon para sa biyahe mo, ayon sa hinahanap mong {{busca}}. Kapag nakapili ka na, ihahanda ko ang buong biyahe. Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon.',

  travelBuscaSorpresa: 'sorpresa',

  travelExplicaItinerarioFechas_one: 'Ihahanda ko ang itinerary ng biyahe mo {{fechas}} ({{contador}} araw at {{lasNoches}}), kada araw at may tinatayang budget.',
  travelExplicaItinerarioFechas_other: 'Ihahanda ko ang itinerary ng biyahe mo {{fechas}} ({{contador}} na araw at {{lasNoches}}), kada araw at may tinatayang budget.',
  travelExplicaItinerarioDias_one: 'Ihahanda ko ang itinerary para sa {{contador}} araw at {{lasNoches}}, kada araw at may tinatayang budget.',
  travelExplicaItinerarioDias_other: 'Ihahanda ko ang itinerary para sa {{contador}} na araw at {{lasNoches}}, kada araw at may tinatayang budget.',
  travelExplicaItinerarioDiasAviso_one: 'Ihahanda ko ang itinerary para sa {{contador}} araw at {{lasNoches}}, kada araw at may tinatayang budget. Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon.',
  travelExplicaItinerarioDiasAviso_other: 'Ihahanda ko ang itinerary para sa {{contador}} na araw at {{lasNoches}}, kada araw at may tinatayang budget. Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon.',
  travelExplicaItinerarioTuViaje: 'Ihahanda ko ang itinerary ng biyahe mo, kada araw at may tinatayang budget.',
  travelExplicaItinerarioTuViajeAviso: 'Ihahanda ko ang itinerary ng biyahe mo, kada araw at may tinatayang budget. Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon.',

  travelExplicaQueHacer: 'Hahanapin ko ang mga sulit puntahan at kung saan kakain, at ibibigay ko ang source ng bawat isa para ma-verify mo.',
  travelExplicaMoverse: 'Hahanapin ko ang mga paraan para makalibot ka, kasama ang tinatayang tagal at presyo ng bawat isa.',

  travelLasNoches_one: '{{contador}} gabi',
  travelLasNoches_other: '{{contador}} na gabi',

  travelDecisionTresViajes: 'magmumungkahi ako ng tatlong biyaheng magkakaiba',
  travelDecisionTresViajesAviso: 'magmumungkahi ako ng tatlong biyaheng magkakaiba. Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon',
  travelDecisionReparto: 'hahatiin ko ang mga araw para maranasan mo ang pinakamaganda sa bawat isa',
  travelDecisionRepartoAviso: 'hahatiin ko ang mga araw para maranasan mo ang pinakamaganda sa bawat isa. Kapag alam mo na ang mga petsa, sabihin mo sa akin at iaayon ko ito sa panahon',

  travelPasoDestinos: 'Maghanap ng tatlong destinasyong bagay sa iyo',
  travelPasoQueHacer: 'Hanapin ang mga sulit puntahan at kung saan kakain',
  travelPasoMoverse: 'Alamin kung paano lumibot',
  travelPasoItinerario_one: 'Ihanda ang itinerary para sa {{contador}} araw',
  travelPasoItinerario_other: 'Ihanda ang itinerary para sa {{contador}} na araw',
  travelPasoItinerarioTuViaje: 'Ihanda ang itinerary ng biyahe mo',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  brainExplica: 'Uunawain ko nang mabuti ang kailangan mo at maghahanda ako ng malinaw na sagot, kasama ang mga susunod na hakbang.',
  brainDecisionPuntoDePartida: 'magmumungkahi ako ng panimula at, kung kailangan, dadalhin kita sa tamang espesyalista ng Weë',
  brainPasoEntender: 'Unawain nang mabuti ang kailangan mo',
  brainPasoRespuesta: 'Maghanda ng malinaw na sagot na may mga susunod na hakbang',
};
