/*
 * NORUEGO BOKMÅL — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Jeg lager {{numero}} logoer til «{{nombre}}».',
  designExplicaLogoConNombreYAlma: 'Jeg lager {{numero}} logoer til «{{nombre}}», {{alma}}.',
  designAlmaSerious: 'med et seriøst og pålitelig uttrykk',
  designAlmaModern: 'med et moderne uttrykk',
  designAlmaClose: 'med et personlig og morsomt uttrykk',
  designAlmaLuxury: 'med et luksuriøst uttrykk',
  designAlmaNatural: 'med et naturlig uttrykk',

  designExplicaAnuncio: 'Jeg lager {{numero}} forslag for å kunngjøre {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Jeg lager {{numero}} forslag for å kunngjøre {{anuncio}}, {{donde}}.',
  designDondeFeed: 'i kvadratisk format, til Instagram eller Facebook',
  designDondeStory: 'i vertikalt format, til en story',
  designDondeWhatsapp: 'i et format som er lett å dele på WhatsApp',
  designDondePrint: 'i A4-format, klart til utskrift',

  designExplicaPropuestas: 'Jeg lager {{numero}} forslag til {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Jeg lager {{numero}} forslag til {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'med et moderne og rent uttrykk',
  designMatizLookNatural: 'med et naturlig uttrykk',
  designMatizLookLuxury: 'med et luksuriøst uttrykk',
  designMatizLookFun: 'med et morsomt og fargerikt uttrykk',
  designMatizLookIndustrial: 'med et industrielt uttrykk',
  designMatizEraFuture: 'fra fremtiden',
  designMatizEraNow: 'fra i dag',
  designMatizEraClassic: 'i klassisk stil',
  designMatizEraScifi: 'i science fiction-stil',
  designMatizInoutOutside: 'sett utenfra',
  designMatizInoutInside: 'sett innenfra',
  designMatizInoutWide: 'i et vidt perspektiv',
  designMatizDrawCartoon: 'i tegnefilmstil',
  designMatizDrawReal: 'i realistisk stil',
  designMatizDrawGame: 'med videospillestetikk',
  designMatizDrawPencil: 'tegnet med blyant',
  designMatizDrawCute: 'med et søtt uttrykk',

  designPasoConcepto: 'Definere konseptet',
  designPasoLogos: 'Lage {{numero}} logoer',
  designPasoPropuestas: 'Lage {{numero}} forslag',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Jeg ser på bildet ditt og gir det bevegelse i {{estilo}} stil: et klipp på {{segundos}} sekunder, klart til å deles.',
  studioExplicaVideo: 'Jeg skriver et kort manus, genererer {{video}} på {{segundos}} sekunder, {{formato}}, i {{estilo}} stil, og spiller inn fortellerstemmen.',
  studioExplicaVideoPromo: 'Jeg skriver et kort manus, genererer en video på {{segundos}} sekunder for å promotere noe, {{formato}}, i {{estilo}} stil, og spiller inn fortellerstemmen.',
  studioExplicaVideoMisRedes: 'Jeg skriver et kort manus, genererer en video på {{segundos}} sekunder til dine sosiale medier, {{formato}}, i {{estilo}} stil, og spiller inn fortellerstemmen.',
  studioVideoRedes: 'en video til dine sosiale medier',
  studioEstiloRitmo: 'personlig og rytmisk',
  studioFormatoVertical: 'vertikal til Instagram og TikTok',
  studioFormatoHorizontal: 'horisontal til YouTube',
  studioFormatoCuadrado: 'kvadratisk til WhatsApp og Facebook',
  studioDecisionRedes: 'lager jeg den til dine sosiale medier',
  studioDecisionEstilo: 'valgte jeg en personlig og rytmisk stil',
  studioDecisionVertical: 'lager jeg den vertikal, som passer til Instagram og TikTok',

  studioPasoMirarFoto: 'Se på bildet ditt',
  studioPasoMovimiento: 'Gi bildet bevegelse',
  studioPasoGuion: 'Skrive manus med {{numero}} scener',
  studioPasoVideo: 'Generere videoen',
  studioPasoNarracion: 'Spille inn fortellerstemmen',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Jeg lager {{numero}} bilder ut fra det du har fortalt meg, {{como}}.',

  photoExplicaMejorarCalidad: 'Først ser jeg på bildet ditt, og så forbedrer jeg kvaliteten og oppløsningen, {{como}}. Alt annet beholder jeg som det er.',
  photoExplicaQuitarAlgo: 'Først ser jeg på bildet ditt, og så fjerner jeg det som er i veien, {{como}}. Alt annet beholder jeg som det er.',
  photoExplicaFondo: 'Først ser jeg på bildet ditt, og så bytter eller fjerner jeg bakgrunnen, {{como}}. Alt annet beholder jeg som det er.',
  photoExplicaRestaurar: 'Først ser jeg på bildet ditt, og så restaurerer jeg det gamle bildet, {{como}}. Alt annet beholder jeg som det er.',
  photoExplicaRetoque: 'Først ser jeg på bildet ditt, og så gjør jeg en naturlig ansiktsretusj, {{como}}. Alt annet beholder jeg som det er.',
  photoExplicaColorizar: 'Først ser jeg på bildet ditt, og så fargelegger jeg det svart-hvite, {{como}}. Alt annet beholder jeg som det er.',
  photoExplicaTransformar: 'Først ser jeg på bildet ditt, og så forvandler jeg det med en stil, {{como}}. Alt annet beholder jeg som det er.',
  photoExplicaSinAccion: 'Først ser jeg på bildet ditt, og så forbedrer jeg kvaliteten, {{como}}. Alt annet beholder jeg som det er.',
  photoExplicaAccion: 'Først ser jeg på bildet ditt, og så tar jeg meg av dette: {{accion}}, {{como}}. Alt annet beholder jeg som det er.',
  photoComoNatural: 'så naturlig som mulig',
  photoDecisionCalidad: 'starter jeg med å forbedre kvaliteten',
  photoDecisionNatural: 'gjør jeg det så naturlig som mulig',
  photoDecisionNaturales: 'gjør jeg dem så naturlige som mulig',

  photoPasoMirarFoto: 'Se på bildet for å forstå hva det viser',
  photoPasoImagenes: 'Lage {{numero}} bilder',
  photoPasoMejorarFoto: 'Forbedre bildet',
  photoPasoMejorarCalidad: 'Forbedre kvaliteten og oppløsningen',
  photoPasoQuitarAlgo: 'Fjerne noe som er i veien',
  photoPasoFondo: 'Bytte eller fjerne bakgrunnen',
  photoPasoRestaurar: 'Restaurere et gammelt bilde',
  photoPasoRetoque: 'Naturlig ansiktsretusj',
  photoPasoColorizar: 'Fargelegge svart-hvitt',
  photoPasoTransformar: 'Forvandle med en stil',

  /* La voz de quien habla: aquí Weë habla de «ti». */
  designCosaMascota: 'en maskot til merkevaren din',
};
