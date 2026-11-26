/*
 * IRLANDÉS — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{numero}}` va como «{{numero}} san iomlán» o entre paréntesis, porque detrás de una cifra el sustantivo mutaría.
 * «cuma» es femenino, y las piezas `…Alma…` y `…Matiz…` ya traen la lenición hecha («le cuma chairdiúil»).
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Cruthóidh mé lógónna, {{numero}} san iomlán, do "{{nombre}}".',
  designExplicaLogoConNombreYAlma: 'Cruthóidh mé lógónna, {{numero}} san iomlán, do "{{nombre}}", {{alma}}.',
  designAlmaSerious: 'le cuma stuama iontaofa',
  designAlmaModern: 'le cuma nua-aimseartha',
  designAlmaClose: 'le cuma chairdiúil spraíúil',
  designAlmaLuxury: 'le cuma shómasach',
  designAlmaNatural: 'le cuma nádúrtha',

  designExplicaAnuncio: 'Cruthóidh mé moltaí, {{numero}} san iomlán, chun {{anuncio}} a fhógairt.',
  designExplicaAnuncioConDonde: 'Cruthóidh mé moltaí, {{numero}} san iomlán, chun {{anuncio}} a fhógairt, {{donde}}.',
  designDondeFeed: 'i bhformáid chearnach, do Instagram nó Facebook',
  designDondeStory: 'go hingearach, do scéal',
  designDondeWhatsapp: 'i bhformáid atá éasca a roinnt ar WhatsApp',
  designDondePrint: 'i bhformáid A4, réidh le priontáil',

  designExplicaPropuestas: 'Cruthóidh mé moltaí, {{numero}} san iomlán: {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Cruthóidh mé moltaí, {{numero}} san iomlán: {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'le cuma nua-aimseartha ghlan',
  designMatizLookNatural: 'le cuma nádúrtha',
  designMatizLookLuxury: 'le cuma shómasach',
  designMatizLookFun: 'le cuma spraíúil ildaite',
  designMatizLookIndustrial: 'le cuma thionsclaíoch',
  designMatizEraFuture: 'ón todhchaí',
  designMatizEraNow: 'ón lá atá inniu ann',
  designMatizEraClassic: 'i stíl chlasaiceach',
  designMatizEraScifi: 'as an bhficsean eolaíochta',
  designMatizInoutOutside: 'ón taobh amuigh',
  designMatizInoutInside: 'ón taobh istigh',
  designMatizInoutWide: 'i radharc leathan',
  designMatizDrawCartoon: 'i stíl chartúin',
  designMatizDrawReal: 'i stíl réalaíoch',
  designMatizDrawGame: 'le cuma fhíschluiche',
  designMatizDrawPencil: 'tarraingthe le peann luaidhe',
  designMatizDrawCute: 'le cuma ghleoite',

  designPasoConcepto: 'An coincheap a shainiú',
  designPasoLogos: 'Lógónna a chruthú ({{numero}})',
  designPasoPropuestas: 'Moltaí a chruthú ({{numero}})',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Féachfaidh mé ar do ghrianghraf agus cuirfidh mé gluaiseacht ann (stíl: {{estilo}}): gearrthóg {{segundos}} s, réidh le roinnt.',
  studioExplicaVideo: 'Scríobhfaidh mé script ghearr, ginfidh mé {{video}} ({{segundos}} s), {{formato}}, stíl: {{estilo}}, agus taifeadfaidh mé an reacaireacht.',
  studioExplicaVideoPromo: 'Scríobhfaidh mé script ghearr, ginfidh mé físeán ({{segundos}} s) chun rud a chur chun cinn, {{formato}}, stíl: {{estilo}}, agus taifeadfaidh mé an reacaireacht.',
  studioExplicaVideoMisRedes: 'Scríobhfaidh mé script ghearr, ginfidh mé físeán ({{segundos}} s) do do mheáin shóisialta, {{formato}}, stíl: {{estilo}}, agus taifeadfaidh mé an reacaireacht.',
  studioVideoRedes: 'físeán do do mheáin shóisialta',
  studioEstiloRitmo: 'cairdiúil agus rithimiúil',
  studioFormatoVertical: 'ingearach do Instagram agus TikTok',
  studioFormatoHorizontal: 'cothrománach do YouTube',
  studioFormatoCuadrado: 'cearnach do WhatsApp agus Facebook',
  studioDecisionRedes: 'ullmhóidh mé do do mheáin shóisialta é',
  studioDecisionEstilo: 'roghnaigh mé stíl chairdiúil rithimiúil',
  studioDecisionVertical: 'déanfaidh mé ingearach é, rud a oireann do Instagram agus TikTok',

  studioPasoMirarFoto: 'Féachaint ar do ghrianghraf',
  studioPasoMovimiento: 'Gluaiseacht a chur sa ghrianghraf',
  studioPasoGuion: 'An script a scríobh (radhairc: {{numero}})',
  studioPasoVideo: 'An físeán a ghiniúint',
  studioPasoNarracion: 'An reacaireacht a thaifeadadh',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Cruthóidh mé íomhánna, {{numero}} san iomlán, bunaithe ar a d\'inis tú dom, {{como}}.',

  photoExplicaMejorarCalidad: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin feabhsóidh mé an cháilíocht agus an taifeach, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoExplicaQuitarAlgo: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin bainfidh mé an rud breise, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoExplicaFondo: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin athróidh nó bainfidh mé an cúlra, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoExplicaRestaurar: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin athchóireoidh mé an seanghrianghraf, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoExplicaRetoque: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin déanfaidh mé mionchóiriú nádúrtha ar an aghaidh, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoExplicaColorizar: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin cuirfidh mé dath ar an dubh agus bán, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoExplicaTransformar: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin athróidh mé é le stíl, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoExplicaSinAccion: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin feabhsóidh mé an cháilíocht, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoExplicaAccion: 'Ar dtús féachfaidh mé ar do ghrianghraf agus ansin déanfaidh mé an méid seo: {{accion}}, {{como}}. Coinneoidh mé gach rud eile mar atá sé.',
  photoComoNatural: 'chomh nádúrtha agus is féidir',
  photoDecisionCalidad: 'tosóidh mé tríd an gcáilíocht a fheabhsú',
  photoDecisionNatural: 'déanfaidh mé é chomh nádúrtha agus is féidir',
  photoDecisionNaturales: 'déanfaidh mé iad chomh nádúrtha agus is féidir',

  photoPasoMirarFoto: 'Féachaint ar an ngrianghraf chun a thuiscint cad atá ann',
  photoPasoImagenes: 'Íomhánna a chruthú ({{numero}})',
  photoPasoMejorarFoto: 'An grianghraf a fheabhsú',
  photoPasoMejorarCalidad: 'An cháilíocht agus an taifeach a fheabhsú',
  photoPasoQuitarAlgo: 'Rud breise a bhaint',
  photoPasoFondo: 'An cúlra a athrú nó a bhaint',
  photoPasoRestaurar: 'Seanghrianghraf a athchóiriú',
  photoPasoRetoque: 'Mionchóiriú nádúrtha aghaidhe',
  photoPasoColorizar: 'Dath a chur ar dhubh agus bán',
  photoPasoTransformar: 'Athrú le stíl',

  /* La voz de quien habla: aquí Weë habla de «ti». */
  designCosaMascota: 'maisicót do do bhranda',
};
