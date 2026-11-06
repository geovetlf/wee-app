/*
 * HÚNGARO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` es en húngaro una fecha sin sufijo («2026. október 12.», `weeai.tripOneDay`, `tripSameMonth`, `tripRange`):
 * entra detrás de dos puntos. `{{busca}}`, también. `{{tono}}` es un adjetivo delante de «hangnemben». Tras un número el
 * sustantivo va en singular, así que `_one` y `_other` dicen lo mismo.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Megismerem a vállalkozásodat, megírom a bejegyzést {{tono}} hangnemben, és elkészítem a hozzá illő képet.',
  businessExplicaCalendario: 'Összeállítom a heti közzétételi naptáradat, minden bejegyzéshez nappal, órával és közösségi oldallal.',
  businessExplicaPublicar: 'Előkészítem a bejegyzést, és minden közösségi oldalhoz igazítom, hogy kimásolhasd és közzétehesd. A Weë még nem kapcsolódik a közösségi oldalaidhoz, ezért nem tesz közzé helyetted.',
  businessExplicaRespuesta: 'Írok egy kedves és világos választ az ügyfelednek, amely azonnal elküldhető.',
  businessExplicaResultados: 'Áttekintem az eredményeidet, és elmondom, mi működött, és mit érdemes tenni ezen a héten.',
  businessExplicaCampana: 'Megismerem a vállalkozásodat, megtervezem a kampányt {{tono}} hangnemben, és elkészítem a fő képét.',
  businessExplicaCv: 'Megismerem a tapasztalataidat, és megírom az önéletrajzodat {{tono}} hangnemben, használatra készen.',
  businessExplicaPresentacion: 'Először megismerem a vállalkozásodat, aztán diánként megírom a prezentációt {{tono}} hangnemben.',
  businessExplicaDocumento: 'Először megismerem a vállalkozásodat, aztán megírom a dokumentumot {{tono}} hangnemben.',
  businessExplicaIdeas: 'Először megismerem a vállalkozásodat, aztán konkrét ötleteket és növekedési stratégiát javaslok.',

  businessTonoProfesionalPeroCercano: 'professzionális, de barátságos',

  businessDecisionTonoProfesionalPeroCercano: 'professzionális, de barátságos hangnemet használok',
  businessDecisionTonoCercanoYProfesional: 'barátságos és professzionális hangnemet használok',
  businessDecisionTonoProfesional: 'professzionális hangnemet használok',
  businessDecisionIdeasConcretas: 'konkrét ötletekkel kezdem',

  businessPasoEntender: 'A vállalkozásod és a célod megismerése',
  businessPasoImagenPublicacion: 'A bejegyzés képének elkészítése',
  businessPasoCalendario: 'A közzétételi naptár összeállítása',
  businessPasoPrepararPublicacion: 'A bejegyzés előkészítése',
  businessPasoAdaptarACadaRed: 'Igazítás minden közösségi oldalhoz',
  businessPasoRespuesta: 'Az ügyfelednek szóló válasz megírása',
  businessPasoResultados: 'Az eredményeid áttekintése és elmagyarázása',
  businessPasoCampana: 'A kampány megtervezése',
  businessPasoImagenCampana: 'A kampány képének elkészítése',
  businessPasoPresentacion: 'A prezentáció megírása (diánként)',
  businessPasoMercado: 'A piacod jelenlegi helyzetének felkutatása',
  businessPasoIdeas: 'Ötletek és stratégia javaslása',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Javaslok három úti célt erre az időszakra: {{fechas}}. Ezt tartom szem előtt: {{busca}}. Amelyiket választod, ahhoz megtervezem az egész utazást.',
  travelExplicaDestinosDias_one: 'Javaslok három úti célt egy {{contador}} napos utazásra ({{lasNoches}}). Ezt tartom szem előtt: {{busca}}. Amelyiket választod, ahhoz megtervezem az egész utazást.',
  travelExplicaDestinosDias_other: 'Javaslok három úti célt egy {{contador}} napos utazásra ({{lasNoches}}). Ezt tartom szem előtt: {{busca}}. Amelyiket választod, ahhoz megtervezem az egész utazást.',
  travelExplicaDestinosDiasAviso_one: 'Javaslok három úti célt egy {{contador}} napos utazásra ({{lasNoches}}). Ezt tartom szem előtt: {{busca}}. Amelyiket választod, ahhoz megtervezem az egész utazást. Ha már tudod az időpontot, szólj, és a szezonhoz igazítom.',
  travelExplicaDestinosDiasAviso_other: 'Javaslok három úti célt egy {{contador}} napos utazásra ({{lasNoches}}). Ezt tartom szem előtt: {{busca}}. Amelyiket választod, ahhoz megtervezem az egész utazást. Ha már tudod az időpontot, szólj, és a szezonhoz igazítom.',
  travelExplicaDestinosTuViaje: 'Javaslok három úti célt az utazásodhoz. Ezt tartom szem előtt: {{busca}}. Amelyiket választod, ahhoz megtervezem az egész utazást.',
  travelExplicaDestinosTuViajeAviso: 'Javaslok három úti célt az utazásodhoz. Ezt tartom szem előtt: {{busca}}. Amelyiket választod, ahhoz megtervezem az egész utazást. Ha már tudod az időpontot, szólj, és a szezonhoz igazítom.',

  travelBuscaSorpresa: 'valami, ami meglep',

  travelExplicaItinerarioFechas_one: 'Elkészítem az útitervet erre az időszakra: {{fechas}} ({{contador}} nap · {{lasNoches}}), napról napra, becsült költségvetéssel.',
  travelExplicaItinerarioFechas_other: 'Elkészítem az útitervet erre az időszakra: {{fechas}} ({{contador}} nap · {{lasNoches}}), napról napra, becsült költségvetéssel.',
  travelExplicaItinerarioDias_one: 'Elkészítek egy {{contador}} napos útitervet ({{lasNoches}}), napról napra, becsült költségvetéssel.',
  travelExplicaItinerarioDias_other: 'Elkészítek egy {{contador}} napos útitervet ({{lasNoches}}), napról napra, becsült költségvetéssel.',
  travelExplicaItinerarioDiasAviso_one: 'Elkészítek egy {{contador}} napos útitervet ({{lasNoches}}), napról napra, becsült költségvetéssel. Ha már tudod az időpontot, szólj, és a szezonhoz igazítom.',
  travelExplicaItinerarioDiasAviso_other: 'Elkészítek egy {{contador}} napos útitervet ({{lasNoches}}), napról napra, becsült költségvetéssel. Ha már tudod az időpontot, szólj, és a szezonhoz igazítom.',
  travelExplicaItinerarioTuViaje: 'Elkészítem az utazásod útitervét, napról napra, becsült költségvetéssel.',
  travelExplicaItinerarioTuViajeAviso: 'Elkészítem az utazásod útitervét, napról napra, becsült költségvetéssel. Ha már tudod az időpontot, szólj, és a szezonhoz igazítom.',

  travelExplicaQueHacer: 'Megkeresem, mit érdemes megnézni és hol érdemes enni, és mindenhez megadom a forrást, hogy ellenőrizhesd.',
  travelExplicaMoverse: 'Megkeresem a közlekedési lehetőségeket, a menetidővel és a hozzávetőleges költséggel.',

  travelLasNoches_one: '{{contador}} éjszaka',
  travelLasNoches_other: '{{contador}} éjszaka',

  travelDecisionTresViajes: 'három, egymástól eltérő utazást javaslok',
  travelDecisionTresViajesAviso: 'három, egymástól eltérő utazást javaslok. Ha már tudod az időpontot, szólj, és a szezonhoz igazítom',
  travelDecisionReparto: 'a napokat a legjobb lehetőségek között osztom el',
  travelDecisionRepartoAviso: 'a napokat a legjobb lehetőségek között osztom el. Ha már tudod az időpontot, szólj, és a szezonhoz igazítom',

  travelPasoDestinos: 'Három illő úti cél keresése',
  travelPasoQueHacer: 'Annak keresése, mit érdemes megnézni és hol érdemes enni',
  travelPasoMoverse: 'A közlekedési lehetőségek keresése',
  travelPasoItinerario_one: '{{contador}} napos útiterv elkészítése',
  travelPasoItinerario_other: '{{contador}} napos útiterv elkészítése',
  travelPasoItinerarioTuViaje: 'Az utazásod útitervének elkészítése',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Alaposan megértem, mire van szükséged, és készítek egy világos választ a következő lépésekkel.',
  brainDecisionPuntoDePartida: 'javaslok egy kiindulópontot, és ha kell, a megfelelő Weë-szakértőhöz irányítalak',
  brainPasoEntender: 'Annak alapos megértése, mire van szükséged',
  brainPasoRespuesta: 'Világos válasz készítése a következő lépésekkel',
};
