/*
 * IRLANDÉS — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * LAS CINCO FORMAS. `Intl.PluralRules('ga')`: one (1), two (2), few (3-6), many (7-10), other (0 y 11+). «lá» no muta
 * detrás de una cifra (dhá lá, trí lá, seacht lá), así que las frases con días repiten la misma palabra en las cinco;
 * «oíche» sí: «n-oíche» de 7 a 10. `{{fechas}}` ya trae su preposición y `{{busca}}` va detrás de dos puntos.
 */
import { ConPlurales } from '../../plurales';

export const planNegocio: ConPlurales<typeof import('../../../es/servidor/plan/negocio').planNegocio> = {
  /* ── Weë Business ──────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Tuigfidh mé do ghnó, scríobhfaidh mé an phostáil le ton {{tono}} agus cruthóidh mé an íomhá a théann léi.',
  businessExplicaCalendario: 'Cuirfidh mé féilire postálacha na seachtaine le chéile, le lá, am agus líonra do gach ceann.',
  businessExplicaPublicar: 'Ullmhóidh mé an phostáil agus cuirfidh mé in oiriúint do gach líonra í, réidh le go gcóipeálfaidh tú í agus go bhfoilseoidh tú féin í. Níl Weë ceangailte le do líonraí fós, mar sin ní fhoilsíonn sé ar do shon.',
  businessExplicaRespuesta: 'Scríobhfaidh mé freagra cineálta soiléir do do chliant, réidh le seoladh.',
  businessExplicaResultados: 'Athbhreithneoidh mé do thorthaí agus inseoidh mé duit cad a d\'oibrigh agus cad ba chóir a dhéanamh an tseachtain seo.',
  businessExplicaCampana: 'Tuigfidh mé do ghnó, dearfaidh mé an feachtas le ton {{tono}} agus cruthóidh mé a phríomhíomhá.',
  businessExplicaCv: 'Tuigfidh mé do thaithí agus scríobhfaidh mé do CV le ton {{tono}}, réidh le húsáid.',
  businessExplicaPresentacion: 'Ar dtús tuigfidh mé do ghnó agus ansin scríobhfaidh mé an cur i láthair sleamhnán ar shleamhnán le ton {{tono}}.',
  businessExplicaDocumento: 'Ar dtús tuigfidh mé do ghnó agus ansin scríobhfaidh mé an doiciméad le ton {{tono}}.',
  businessExplicaIdeas: 'Ar dtús tuigfidh mé do ghnó agus ansin molfaidh mé smaointe nithiúla agus straitéis fáis duit.',

  businessTonoProfesionalPeroCercano: 'gairmiúil ach cairdiúil',

  businessDecisionTonoProfesionalPeroCercano: 'úsáidfidh mé ton gairmiúil ach cairdiúil',
  businessDecisionTonoCercanoYProfesional: 'úsáidfidh mé ton cairdiúil gairmiúil',
  businessDecisionTonoProfesional: 'úsáidfidh mé ton gairmiúil',
  businessDecisionIdeasConcretas: 'tosóidh mé le smaointe nithiúla',

  businessPasoEntender: 'Do ghnó agus do sprioc a thuiscint',
  businessPasoImagenPublicacion: 'An íomhá don phostáil a chruthú',
  businessPasoCalendario: 'Féilire na bpostálacha a chur le chéile',
  businessPasoPrepararPublicacion: 'An phostáil a ullmhú',
  businessPasoAdaptarACadaRed: 'Í a chur in oiriúint do gach líonra',
  businessPasoRespuesta: 'An freagra do do chliant a scríobh',
  businessPasoResultados: 'Do thorthaí a athbhreithniú agus a mhíniú',
  businessPasoCampana: 'An feachtas a dhearadh',
  businessPasoImagenCampana: 'Íomhá an fheachtais a chruthú',
  businessPasoPresentacion: 'An cur i láthair a scríobh (sleamhnán ar shleamhnán)',
  businessPasoMercado: 'Staid do mhargaidh faoi láthair a lorg',
  businessPasoIdeas: 'Smaointe agus straitéis a mholadh',

  /* ── Weë Travel ────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Molfaidh mé trí cheann scríbe {{fechas}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad.',
  travelExplicaDestinosDias_one: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad.',
  travelExplicaDestinosDias_two: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad.',
  travelExplicaDestinosDias_few: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad.',
  travelExplicaDestinosDias_many: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad.',
  travelExplicaDestinosDias_other: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad.',
  travelExplicaDestinosDiasAviso_one: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaDestinosDiasAviso_two: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaDestinosDiasAviso_few: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaDestinosDiasAviso_many: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaDestinosDiasAviso_other: 'Molfaidh mé trí cheann scríbe do {{contador}} lá · {{lasNoches}}, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaDestinosTuViaje: 'Molfaidh mé trí cheann scríbe do do thuras, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad.',
  travelExplicaDestinosTuViajeAviso: 'Molfaidh mé trí cheann scríbe do do thuras, agus an méid seo á lorg agat: {{busca}}. Leis an gceann a roghnóidh tú, ullmhóidh mé an turas ar fad. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',

  travelBuscaSorpresa: 'rud a chuirfidh iontas ort',

  travelExplicaItinerarioFechas_one: 'Ullmhóidh mé do chlár taistil {{fechas}} ({{contador}} lá · {{lasNoches}}), lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioFechas_two: 'Ullmhóidh mé do chlár taistil {{fechas}} ({{contador}} lá · {{lasNoches}}), lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioFechas_few: 'Ullmhóidh mé do chlár taistil {{fechas}} ({{contador}} lá · {{lasNoches}}), lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioFechas_many: 'Ullmhóidh mé do chlár taistil {{fechas}} ({{contador}} lá · {{lasNoches}}), lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioFechas_other: 'Ullmhóidh mé do chlár taistil {{fechas}} ({{contador}} lá · {{lasNoches}}), lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioDias_one: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioDias_two: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioDias_few: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioDias_many: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioDias_other: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioDiasAviso_one: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaItinerarioDiasAviso_two: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaItinerarioDiasAviso_few: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaItinerarioDiasAviso_many: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaItinerarioDiasAviso_other: 'Ullmhóidh mé do chlár taistil do {{contador}} lá · {{lasNoches}}, lá ar lá agus le buiséad garbh. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',
  travelExplicaItinerarioTuViaje: 'Ullmhóidh mé clár taistil do do thuras, lá ar lá agus le buiséad garbh.',
  travelExplicaItinerarioTuViajeAviso: 'Ullmhóidh mé clár taistil do do thuras, lá ar lá agus le buiséad garbh. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é.',

  travelExplicaQueHacer: 'Lorgóidh mé cad is fiú a dhéanamh agus cá háit le hithe, agus tabharfaidh mé foinse gach ruda duit le go mbeidh tú in ann é a sheiceáil.',
  travelExplicaMoverse: 'Lorgóidh mé na bealaí le bogadh thart, an t-am a thógann siad agus a gcostas garbh.',

  travelLasNoches_one: '{{contador}} oíche',
  travelLasNoches_two: '{{contador}} oíche',
  travelLasNoches_few: '{{contador}} oíche',
  travelLasNoches_many: '{{contador}} n-oíche',
  travelLasNoches_other: '{{contador}} oíche',

  travelDecisionTresViajes: 'molfaidh mé trí thuras atá difriúil óna chéile',
  travelDecisionTresViajesAviso: 'molfaidh mé trí thuras atá difriúil óna chéile. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é',
  travelDecisionReparto: 'roinnfidh mé na laethanta idir an chuid is fearr de gach rud',
  travelDecisionRepartoAviso: 'roinnfidh mé na laethanta idir an chuid is fearr de gach rud. Nuair a bheidh na dátaí agat, inis dom iad agus cuirfidh mé in oiriúint don séasúr é',

  travelPasoDestinos: 'Trí cheann scríbe oiriúnacha a lorg',
  travelPasoQueHacer: 'Cad is fiú a dhéanamh agus cá háit le hithe a lorg',
  travelPasoMoverse: 'Bealaí le bogadh thart a lorg',
  travelPasoItinerario_one: 'An clár taistil a ullmhú do {{contador}} lá',
  travelPasoItinerario_two: 'An clár taistil a ullmhú do {{contador}} lá',
  travelPasoItinerario_few: 'An clár taistil a ullmhú do {{contador}} lá',
  travelPasoItinerario_many: 'An clár taistil a ullmhú do {{contador}} lá',
  travelPasoItinerario_other: 'An clár taistil a ullmhú do {{contador}} lá',
  travelPasoItinerarioTuViaje: 'Clár taistil do thurais a ullmhú',

  /* ── Weë Brain ─────────────────────────────────────────────────────────── */
  brainExplica: 'Tuigfidh mé go maith cad atá uait agus ullmhóidh mé freagra soiléir duit, leis na chéad chéimeanna eile.',
  brainDecisionPuntoDePartida: 'molfaidh mé pointe tosaigh agus, más gá, seolfaidh mé chuig an speisialtóir Weë cuí thú',
  brainPasoEntender: 'Tuiscint mhaith a fháil ar cad atá uait',
  brainPasoRespuesta: 'Freagra soiléir leis na chéad chéimeanna eile a ullmhú duit',
};
