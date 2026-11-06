/*
 * ISLANDÉS (is · is-IS) — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * {{tono}} entra en nominativo, entre paréntesis («(tónn: faglegur)»). {{fechas}} las reescribe la app en islandés y
 * van entre paréntesis para no depender de su forma. {{busca}} entra tras «þig langi að …» (las opciones son
 * infinitivos). Días: acusativo tras «fyrir» («fyrir {{contador}} dag / daga»); noches: «nótt / nætur», iguales en
 * nominativo y acusativo, así que `travelLasNoches` vale en las dos posiciones. Las `…Decision…` empiezan por el verbo (V2).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Ég kynni mér fyrirtækið þitt, skrifa færsluna (tónn: {{tono}}) og bý til myndina sem fylgir henni.',
  businessExplicaCalendario: 'Ég set saman birtingadagatal vikunnar fyrir þig, með degi, tíma og miðli fyrir hverja færslu.',
  businessExplicaPublicar: 'Ég undirbý færsluna og aðlaga hana að hverjum miðli, tilbúna svo þú getir afritað hana og birt hana á eigin spýtur. Weë er ekki enn tengt samfélagsmiðlunum þínum og birtir því ekki fyrir þig.',
  businessExplicaRespuesta: 'Ég skrifa vingjarnlegt og skýrt svar til viðskiptavinarins þíns, tilbúið til sendingar.',
  businessExplicaResultados: 'Ég fer yfir árangurinn þinn og segi þér hvað virkaði og hvað er best að gera í þessari viku.',
  businessExplicaCampana: 'Ég kynni mér fyrirtækið þitt, hanna herferðina (tónn: {{tono}}) og bý til aðalmynd hennar.',
  businessExplicaCv: 'Ég kynni mér reynslu þína og skrifa ferilskrána þína (tónn: {{tono}}), tilbúna til notkunar.',
  businessExplicaPresentacion: 'Fyrst kynni ég mér fyrirtækið þitt og svo skrifa ég kynninguna glæru fyrir glæru (tónn: {{tono}}).',
  businessExplicaDocumento: 'Fyrst kynni ég mér fyrirtækið þitt og svo skrifa ég skjalið (tónn: {{tono}}).',
  businessExplicaIdeas: 'Fyrst kynni ég mér fyrirtækið þitt og svo sting ég upp á áþreifanlegum hugmyndum og stefnu til að vaxa.',

  businessTonoProfesionalPeroCercano: 'faglegur en vinalegur',

  businessDecisionTonoProfesionalPeroCercano: 'nota ég faglegan en vinalegan tón',
  businessDecisionTonoCercanoYProfesional: 'nota ég vinalegan og faglegan tón',
  businessDecisionTonoProfesional: 'nota ég faglegan tón',
  businessDecisionIdeasConcretas: 'byrja ég á áþreifanlegum hugmyndum',

  businessPasoEntender: 'Kynna mér fyrirtækið þitt og markmið þitt',
  businessPasoImagenPublicacion: 'Búa til myndina fyrir færsluna',
  businessPasoCalendario: 'Setja saman birtingadagatalið',
  businessPasoPrepararPublicacion: 'Undirbúa færsluna',
  businessPasoAdaptarACadaRed: 'Aðlaga hana að hverjum miðli',
  businessPasoRespuesta: 'Skrifa svarið til viðskiptavinarins',
  businessPasoResultados: 'Fara yfir árangurinn og útskýra hann',
  businessPasoCampana: 'Hanna herferðina',
  businessPasoImagenCampana: 'Búa til mynd herferðarinnar',
  businessPasoPresentacion: 'Skrifa kynninguna (glæru fyrir glæru)',
  businessPasoMercado: 'Kanna hvernig markaðurinn þinn stendur núna',
  businessPasoIdeas: 'Stinga upp á hugmyndum og stefnu',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Ég sting upp á þremur áfangastöðum fyrir ferðina ({{fechas}}), með það í huga að þig langi að {{busca}}. Þegar þú hefur valið einn þeirra skipulegg ég alla ferðina.',
  travelExplicaDestinosDias_one: 'Ég sting upp á þremur áfangastöðum fyrir {{contador}} dag · {{lasNoches}}, með það í huga að þig langi að {{busca}}. Þegar þú hefur valið einn þeirra skipulegg ég alla ferðina.',
  travelExplicaDestinosDias_other: 'Ég sting upp á þremur áfangastöðum fyrir {{contador}} daga · {{lasNoches}}, með það í huga að þig langi að {{busca}}. Þegar þú hefur valið einn þeirra skipulegg ég alla ferðina.',
  travelExplicaDestinosDiasAviso_one: 'Ég sting upp á þremur áfangastöðum fyrir {{contador}} dag · {{lasNoches}}, með það í huga að þig langi að {{busca}}. Þegar þú hefur valið einn þeirra skipulegg ég alla ferðina. Þegar dagsetningarnar liggja fyrir skaltu segja mér þær og ég laga ferðina að árstíðinni.',
  travelExplicaDestinosDiasAviso_other: 'Ég sting upp á þremur áfangastöðum fyrir {{contador}} daga · {{lasNoches}}, með það í huga að þig langi að {{busca}}. Þegar þú hefur valið einn þeirra skipulegg ég alla ferðina. Þegar dagsetningarnar liggja fyrir skaltu segja mér þær og ég laga ferðina að árstíðinni.',
  travelExplicaDestinosTuViaje: 'Ég sting upp á þremur áfangastöðum fyrir ferðina þína, með það í huga að þig langi að {{busca}}. Þegar þú hefur valið einn þeirra skipulegg ég alla ferðina.',
  travelExplicaDestinosTuViajeAviso: 'Ég sting upp á þremur áfangastöðum fyrir ferðina þína, með það í huga að þig langi að {{busca}}. Þegar þú hefur valið einn þeirra skipulegg ég alla ferðina. Þegar dagsetningarnar liggja fyrir skaltu segja mér þær og ég laga ferðina að árstíðinni.',

  travelBuscaSorpresa: 'láta koma þér á óvart',

  travelExplicaItinerarioFechas_one: 'Ég útbý ferðaáætlunina ({{fechas}}; {{contador}} dagur · {{lasNoches}}), dag fyrir dag og með áætluðum kostnaði.',
  travelExplicaItinerarioFechas_other: 'Ég útbý ferðaáætlunina ({{fechas}}; {{contador}} dagar · {{lasNoches}}), dag fyrir dag og með áætluðum kostnaði.',
  travelExplicaItinerarioDias_one: 'Ég útbý ferðaáætlun fyrir {{contador}} dag · {{lasNoches}}, dag fyrir dag og með áætluðum kostnaði.',
  travelExplicaItinerarioDias_other: 'Ég útbý ferðaáætlun fyrir {{contador}} daga · {{lasNoches}}, dag fyrir dag og með áætluðum kostnaði.',
  travelExplicaItinerarioDiasAviso_one: 'Ég útbý ferðaáætlun fyrir {{contador}} dag · {{lasNoches}}, dag fyrir dag og með áætluðum kostnaði. Þegar dagsetningarnar liggja fyrir skaltu segja mér þær og ég laga ferðina að árstíðinni.',
  travelExplicaItinerarioDiasAviso_other: 'Ég útbý ferðaáætlun fyrir {{contador}} daga · {{lasNoches}}, dag fyrir dag og með áætluðum kostnaði. Þegar dagsetningarnar liggja fyrir skaltu segja mér þær og ég laga ferðina að árstíðinni.',
  travelExplicaItinerarioTuViaje: 'Ég útbý ferðaáætlun fyrir ferðina þína, dag fyrir dag og með áætluðum kostnaði.',
  travelExplicaItinerarioTuViajeAviso: 'Ég útbý ferðaáætlun fyrir ferðina þína, dag fyrir dag og með áætluðum kostnaði. Þegar dagsetningarnar liggja fyrir skaltu segja mér þær og ég laga ferðina að árstíðinni.',

  travelExplicaQueHacer: 'Ég leita að því sem vert er að sjá og hvar gott er að borða, og læt heimildina fylgja hverju atriði svo þú getir sannreynt það.',
  travelExplicaMoverse: 'Ég leita að leiðum til að komast á milli staða, með áætluðum ferðatíma og kostnaði.',

  travelLasNoches_one: '{{contador}} nótt',
  travelLasNoches_other: '{{contador}} nætur',

  travelDecisionTresViajes: 'sting ég upp á þremur ólíkum ferðum',
  travelDecisionTresViajesAviso: 'sting ég upp á þremur ólíkum ferðum. Þegar dagsetningarnar liggja fyrir skaltu segja mér þær og ég laga ferðina að árstíðinni',
  travelDecisionReparto: 'skipti ég dögunum á milli þess besta af hverju',
  travelDecisionRepartoAviso: 'skipti ég dögunum á milli þess besta af hverju. Þegar dagsetningarnar liggja fyrir skaltu segja mér þær og ég laga ferðina að árstíðinni',

  travelPasoDestinos: 'Finna þrjá áfangastaði sem henta',
  travelPasoQueHacer: 'Leita að því sem vert er að sjá og hvar gott er að borða',
  travelPasoMoverse: 'Kanna hvernig best er að komast á milli staða',
  travelPasoItinerario_one: 'Útbúa ferðaáætlun fyrir {{contador}} dag',
  travelPasoItinerario_other: 'Útbúa ferðaáætlun fyrir {{contador}} daga',
  travelPasoItinerarioTuViaje: 'Útbúa ferðaáætlun fyrir ferðina þína',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Ég kynni mér vel hvað þú þarft og útbý skýrt svar með næstu skrefum.',
  brainDecisionPuntoDePartida: 'sting ég upp á upphafspunkti og vísa þér, ef þörf krefur, á þann sérfræðing í Weë sem við á',
  brainPasoEntender: 'Átta mig vel á því hvað þú þarft',
  brainPasoRespuesta: 'Útbúa skýrt svar með næstu skrefum',
};
