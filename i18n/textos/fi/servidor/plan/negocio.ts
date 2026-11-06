/*
 * FINÉS — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae su preposición y la escribe la app. `{{tono}}` y `{{busca}}` llegan en nominativo: entran detrás
 * de una etiqueta («äänensävy: …», «etsit tätä: …»). Plurales de finés: `_one` y `_other` con partitivo singular.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Perehdyn yritykseesi, kirjoitan julkaisun (äänensävy: {{tono}}) ja luon siihen sopivan kuvan.',
  businessExplicaCalendario: 'Kokoan viikon julkaisukalenterisi, ja jokaisella julkaisulla on päivä, kellonaika ja kanava.',
  businessExplicaPublicar: 'Valmistelen julkaisun ja sovitan sen jokaiselle kanavalle, valmiina kopioitavaksi ja julkaistavaksi. Weë ei ole vielä yhteydessä tileihisi, joten se ei julkaise puolestasi.',
  businessExplicaRespuesta: 'Kirjoitan ystävällisen ja selkeän vastauksen asiakkaallesi, valmiina lähetettäväksi.',
  businessExplicaResultados: 'Käyn tuloksesi läpi ja kerron, mikä toimi ja mitä tällä viikolla kannattaa tehdä.',
  businessExplicaCampana: 'Perehdyn yritykseesi, suunnittelen kampanjan (äänensävy: {{tono}}) ja luon sen pääkuvan.',
  businessExplicaCv: 'Perehdyn kokemukseesi ja kirjoitan CV:si (äänensävy: {{tono}}) käyttövalmiiksi.',
  businessExplicaPresentacion: 'Perehdyn ensin yritykseesi ja kirjoitan sitten esityksen dia kerrallaan (äänensävy: {{tono}}).',
  businessExplicaDocumento: 'Perehdyn ensin yritykseesi ja laadin sitten asiakirjan (äänensävy: {{tono}}).',
  businessExplicaIdeas: 'Perehdyn ensin yritykseesi ja ehdotan sitten konkreettisia ideoita ja kasvustrategiaa.',

  businessTonoProfesionalPeroCercano: 'ammattimainen mutta lämmin',

  businessDecisionTonoProfesionalPeroCercano: 'käytän ammattimaista mutta lämmintä äänensävyä',
  businessDecisionTonoCercanoYProfesional: 'käytän lämmintä ja ammattimaista äänensävyä',
  businessDecisionTonoProfesional: 'käytän ammattimaista äänensävyä',
  businessDecisionIdeasConcretas: 'aloitan konkreettisista ideoista',

  businessPasoEntender: 'Yrityksesi ja tavoitteesi ymmärtäminen',
  businessPasoImagenPublicacion: 'Julkaisun kuvan luominen',
  businessPasoCalendario: 'Julkaisukalenterin kokoaminen',
  businessPasoPrepararPublicacion: 'Julkaisun valmistelu',
  businessPasoAdaptarACadaRed: 'Sovittaminen jokaiselle kanavalle',
  businessPasoRespuesta: 'Vastauksen kirjoittaminen asiakkaallesi',
  businessPasoResultados: 'Tulostesi läpikäynti ja selittäminen',
  businessPasoCampana: 'Kampanjan suunnittelu',
  businessPasoImagenCampana: 'Kampanjakuvan luominen',
  businessPasoPresentacion: 'Esityksen kirjoittaminen (dia kerrallaan)',
  businessPasoMercado: 'Markkinoidesi nykytilanteen selvittäminen',
  businessPasoIdeas: 'Ideoiden ja strategian ehdottaminen',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Ehdotan kolmea matkakohdetta {{fechas}}, kun etsit tätä: {{busca}}. Valitsemastasi kohteesta valmistelen koko matkan.',
  travelExplicaDestinosDias_one: 'Ehdotan kolmea matkakohdetta ({{contador}} päivä · {{lasNoches}}), kun etsit tätä: {{busca}}. Valitsemastasi kohteesta valmistelen koko matkan.',
  travelExplicaDestinosDias_other: 'Ehdotan kolmea matkakohdetta ({{contador}} päivää · {{lasNoches}}), kun etsit tätä: {{busca}}. Valitsemastasi kohteesta valmistelen koko matkan.',
  travelExplicaDestinosDiasAviso_one: 'Ehdotan kolmea matkakohdetta ({{contador}} päivä · {{lasNoches}}), kun etsit tätä: {{busca}}. Valitsemastasi kohteesta valmistelen koko matkan. Kun tiedät päivämäärät, kerro ne, niin sovitan matkan sesonkiin.',
  travelExplicaDestinosDiasAviso_other: 'Ehdotan kolmea matkakohdetta ({{contador}} päivää · {{lasNoches}}), kun etsit tätä: {{busca}}. Valitsemastasi kohteesta valmistelen koko matkan. Kun tiedät päivämäärät, kerro ne, niin sovitan matkan sesonkiin.',
  travelExplicaDestinosTuViaje: 'Ehdotan matkallesi kolmea kohdetta, kun etsit tätä: {{busca}}. Valitsemastasi kohteesta valmistelen koko matkan.',
  travelExplicaDestinosTuViajeAviso: 'Ehdotan matkallesi kolmea kohdetta, kun etsit tätä: {{busca}}. Valitsemastasi kohteesta valmistelen koko matkan. Kun tiedät päivämäärät, kerro ne, niin sovitan matkan sesonkiin.',

  travelBuscaSorpresa: 'jotain yllättävää',

  travelExplicaItinerarioFechas_one: 'Valmistelen matkasuunnitelman {{fechas}} ({{contador}} päivä · {{lasNoches}}), päivä päivältä ja suuntaa antavalla budjetilla.',
  travelExplicaItinerarioFechas_other: 'Valmistelen matkasuunnitelman {{fechas}} ({{contador}} päivää · {{lasNoches}}), päivä päivältä ja suuntaa antavalla budjetilla.',
  travelExplicaItinerarioDias_one: 'Valmistelen matkasuunnitelman ({{contador}} päivä · {{lasNoches}}), päivä päivältä ja suuntaa antavalla budjetilla.',
  travelExplicaItinerarioDias_other: 'Valmistelen matkasuunnitelman ({{contador}} päivää · {{lasNoches}}), päivä päivältä ja suuntaa antavalla budjetilla.',
  travelExplicaItinerarioDiasAviso_one: 'Valmistelen matkasuunnitelman ({{contador}} päivä · {{lasNoches}}), päivä päivältä ja suuntaa antavalla budjetilla. Kun tiedät päivämäärät, kerro ne, niin sovitan matkan sesonkiin.',
  travelExplicaItinerarioDiasAviso_other: 'Valmistelen matkasuunnitelman ({{contador}} päivää · {{lasNoches}}), päivä päivältä ja suuntaa antavalla budjetilla. Kun tiedät päivämäärät, kerro ne, niin sovitan matkan sesonkiin.',
  travelExplicaItinerarioTuViaje: 'Valmistelen matkasi suunnitelman päivä päivältä ja suuntaa antavalla budjetilla.',
  travelExplicaItinerarioTuViajeAviso: 'Valmistelen matkasi suunnitelman päivä päivältä ja suuntaa antavalla budjetilla. Kun tiedät päivämäärät, kerro ne, niin sovitan matkan sesonkiin.',

  travelExplicaQueHacer: 'Etsin, mikä on näkemisen arvoista ja missä kannattaa syödä, ja annan kunkin kohteen lähteen, jotta voit tarkistaa sen.',
  travelExplicaMoverse: 'Etsin tavat liikkua sekä niiden likimääräiset kestot ja hinnat.',

  travelLasNoches_one: '{{contador}} yö',
  travelLasNoches_other: '{{contador}} yötä',

  travelDecisionTresViajes: 'ehdotan kolmea keskenään erilaista matkaa',
  travelDecisionTresViajesAviso: 'ehdotan kolmea keskenään erilaista matkaa. Kun tiedät päivämäärät, kerro ne, niin sovitan matkan sesonkiin',
  travelDecisionReparto: 'jaan päivät kunkin asian parhaiden puolten kesken',
  travelDecisionRepartoAviso: 'jaan päivät kunkin asian parhaiden puolten kesken. Kun tiedät päivämäärät, kerro ne, niin sovitan matkan sesonkiin',

  travelPasoDestinos: 'Kolmen sopivan kohteen etsiminen',
  travelPasoQueHacer: 'Näkemisen arvoisten paikkojen ja ruokapaikkojen etsiminen',
  travelPasoMoverse: 'Liikkumistapojen etsiminen',
  travelPasoItinerario_one: 'Matkasuunnitelman valmistelu ({{contador}} päivä)',
  travelPasoItinerario_other: 'Matkasuunnitelman valmistelu ({{contador}} päivää)',
  travelPasoItinerarioTuViaje: 'Matkasi suunnitelman valmistelu',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Perehdyn tarpeeseesi kunnolla ja valmistelen selkeän vastauksen ja seuraavat askeleet.',
  brainDecisionPuntoDePartida: 'ehdotan lähtökohtaa ja tarvittaessa ohjaan sinut sopivalle Weë-asiantuntijalle',
  brainPasoEntender: 'Tarpeesi kunnollinen ymmärtäminen',
  brainPasoRespuesta: 'Selkeän vastauksen ja seuraavien askelten valmistelu',
};
