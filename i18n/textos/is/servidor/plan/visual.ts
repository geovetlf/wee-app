/*
 * ISLANDÉS (is · is-IS) — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las opciones que eligió la persona entran en nominativo: tras dos puntos («tillögur að hönnun: hús») o entre
 * paréntesis («stíll: hlýlegur»). Las piezas `designAlma…`, `designMatiz…` y `designDonde…` son frases
 * preposicionales invariables («með nútímalegu yfirbragði», «að utan»), para que valgan detrás de cualquier sustantivo
 * sin concordar con él. «Logo» es «merki» (neutro, invariable en plural; glosario § 4). Las `…Decision…` empiezan por el verbo (V2).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Ég bý til {{numero}} merki fyrir „{{nombre}}“.',
  designExplicaLogoConNombreYAlma: 'Ég bý til {{numero}} merki fyrir „{{nombre}}“, {{alma}}.',
  designAlmaSerious: 'með alvörugefnu og traustu yfirbragði',
  designAlmaModern: 'með nútímalegu yfirbragði',
  designAlmaClose: 'með vinalegu og skemmtilegu yfirbragði',
  designAlmaLuxury: 'með lúxusyfirbragði',
  designAlmaNatural: 'með náttúrulegu yfirbragði',

  designExplicaAnuncio: 'Ég bý til {{numero}} tillögur að auglýsingu fyrir eftirfarandi: {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Ég bý til {{numero}} tillögur að auglýsingu, {{donde}}, fyrir eftirfarandi: {{anuncio}}.',
  designDondeFeed: 'í ferningssniði fyrir Instagram eða Facebook',
  designDondeStory: 'í lóðréttu sniði fyrir sögu',
  designDondeWhatsapp: 'í sniði sem auðvelt er að deila á WhatsApp',
  designDondePrint: 'í A4-sniði, tilbúnar til prentunar',

  designExplicaPropuestas: 'Ég bý til {{numero}} tillögur að hönnun: {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Ég bý til {{numero}} tillögur að hönnun: {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'með nútímalegu og stílhreinu yfirbragði',
  designMatizLookNatural: 'með náttúrulegu yfirbragði',
  designMatizLookLuxury: 'með lúxusyfirbragði',
  designMatizLookFun: 'með skemmtilegu og litríku yfirbragði',
  designMatizLookIndustrial: 'í iðnaðarstíl',
  designMatizEraFuture: 'úr framtíðinni',
  designMatizEraNow: 'frá okkar tímum',
  designMatizEraClassic: 'í klassískum stíl',
  designMatizEraScifi: 'í anda vísindaskáldskapar',
  designMatizInoutOutside: 'að utan',
  designMatizInoutInside: 'að innan',
  designMatizInoutWide: 'í víðu sjónarhorni',
  designMatizDrawCartoon: 'í teiknimyndastíl',
  designMatizDrawReal: 'í raunsæjum stíl',
  designMatizDrawGame: 'með tölvuleikjayfirbragði',
  designMatizDrawPencil: 'í blýantsteikningu',
  designMatizDrawCute: 'með krúttlegu yfirbragði',

  designPasoConcepto: 'Móta grunnhugmyndina',
  designPasoLogos: 'Búa til {{numero}} merki',
  designPasoPropuestas: 'Búa til {{numero}} tillögur',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Ég skoða myndina þína og gæði hana hreyfingu (stíll: {{estilo}}): {{segundos}} sekúndna myndskeið, tilbúið til að deila.',

  studioExplicaVideo: 'Ég skrifa stutt handrit, bý til {{segundos}} sekúndna myndband ({{video}}, {{formato}}, stíll: {{estilo}}) og tek upp frásögnina.',
  studioExplicaVideoPromo: 'Ég skrifa stutt handrit, bý til {{segundos}} sekúndna myndband til að kynna eitthvað ({{formato}}, stíll: {{estilo}}) og tek upp frásögnina.',
  studioExplicaVideoMisRedes: 'Ég skrifa stutt handrit, bý til {{segundos}} sekúndna myndband fyrir samfélagsmiðlana þína ({{formato}}, stíll: {{estilo}}) og tek upp frásögnina.',
  studioVideoRedes: 'fyrir samfélagsmiðlana þína',
  studioEstiloRitmo: 'hlýlegur og taktfastur',
  studioFormatoVertical: 'lóðrétt fyrir Instagram og TikTok',
  studioFormatoHorizontal: 'lárétt fyrir YouTube',
  studioFormatoCuadrado: 'ferningslaga fyrir WhatsApp og Facebook',
  studioDecisionRedes: 'undirbý ég það fyrir samfélagsmiðlana þína',
  studioDecisionEstilo: 'valdi ég hlýlegan og taktfastan stíl',
  studioDecisionVertical: 'hef ég það lóðrétt, sem hentar fyrir Instagram og TikTok',

  studioPasoMirarFoto: 'Skoða myndina þína',
  studioPasoMovimiento: 'Gæða myndina hreyfingu',
  studioPasoGuion: 'Skrifa handrit með {{numero}} atriðum',
  studioPasoVideo: 'Búa til myndbandið',
  studioPasoNarracion: 'Taka upp frásögnina',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Ég bý til {{numero}} myndir út frá því sem þú sagðir mér, {{como}}.',

  photoExplicaMejorarCalidad: 'Fyrst skoða ég myndina þína og svo bæti ég gæðin og upplausnina, {{como}}. Allt annað helst óbreytt.',
  photoExplicaQuitarAlgo: 'Fyrst skoða ég myndina þína og svo fjarlægi ég það sem er óþarft, {{como}}. Allt annað helst óbreytt.',
  photoExplicaFondo: 'Fyrst skoða ég myndina þína og svo skipti ég um bakgrunn eða fjarlægi hann, {{como}}. Allt annað helst óbreytt.',
  photoExplicaRestaurar: 'Fyrst skoða ég myndina þína og svo lagfæri ég gömlu ljósmyndina, {{como}}. Allt annað helst óbreytt.',
  photoExplicaRetoque: 'Fyrst skoða ég myndina þína og svo lagfæri ég andlitið á náttúrulegan hátt, {{como}}. Allt annað helst óbreytt.',
  photoExplicaColorizar: 'Fyrst skoða ég myndina þína og svo lita ég svarthvítu myndina, {{como}}. Allt annað helst óbreytt.',
  photoExplicaTransformar: 'Fyrst skoða ég myndina þína og svo umbreyti ég henni með ákveðnum stíl, {{como}}. Allt annað helst óbreytt.',
  photoExplicaSinAccion: 'Fyrst skoða ég myndina þína og svo bæti ég gæðin, {{como}}. Allt annað helst óbreytt.',
  photoExplicaAccion: 'Fyrst skoða ég myndina þína og svo sé ég um þetta: {{accion}}, {{como}}. Allt annað helst óbreytt.',
  photoComoNatural: 'eins náttúrulegt og hægt er',
  photoDecisionCalidad: 'byrja ég á að bæta gæðin',
  photoDecisionNatural: 'hef ég það eins náttúrulegt og hægt er',
  photoDecisionNaturales: 'hef ég þær eins náttúrulegar og hægt er',

  photoPasoMirarFoto: 'Skoða myndina til að skilja hvað er á henni',
  photoPasoImagenes: 'Búa til {{numero}} myndir',
  photoPasoMejorarFoto: 'Bæta myndina',
  photoPasoMejorarCalidad: 'Bæta gæði og upplausn',
  photoPasoQuitarAlgo: 'Fjarlægja eitthvað óþarft',
  photoPasoFondo: 'Skipta um eða fjarlægja bakgrunn',
  photoPasoRestaurar: 'Lagfæra gamla ljósmynd',
  photoPasoRetoque: 'Náttúruleg andlitslagfæring',
  photoPasoColorizar: 'Lita svarthvíta mynd',
  photoPasoTransformar: 'Umbreyta með ákveðnum stíl',

  /* LA VOZ DE QUIEN HABLA: la opción dice «mitt»; Weë habla de «þú». */
  designCosaMascota: 'lukkudýr fyrir vörumerkið þitt',
};
