/*
 * HÚNGARO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}`, `{{anuncio}}` y `{{accion}}` van detrás de dos puntos, en nominativo («ehhez: egy csomagolás»). El estilo,
 * el formato y `{{como}}` van entre paréntesis, para que no se peguen a lo que escribió la persona. En Studio, donde el
 * español queda cojo, la frase se escribe entera y bien, como pide su cabecera.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: '{{numero}} logót készítek ehhez: „{{nombre}}”.',
  designExplicaLogoConNombreYAlma: '{{numero}} logót készítek ehhez: „{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'komoly és megbízható hatással',
  designAlmaModern: 'modern hatással',
  designAlmaClose: 'barátságos és vidám hatással',
  designAlmaLuxury: 'luxus hatással',
  designAlmaNatural: 'természetes hatással',

  designExplicaAnuncio: '{{numero}} javaslatot készítek, amellyel ezt hirdetheted: {{anuncio}}.',
  designExplicaAnuncioConDonde: '{{numero}} javaslatot készítek, amellyel ezt hirdetheted: {{anuncio}}, {{donde}}.',
  designDondeFeed: 'négyzetes formátumban, Instagramra vagy Facebookra',
  designDondeStory: 'függőlegesen, egy történethez',
  designDondeWhatsapp: 'WhatsAppon könnyen megosztható formátumban',
  designDondePrint: 'A4-es formátumban, nyomtatásra készen',

  designExplicaPropuestas: '{{numero}} javaslatot készítek ehhez: {{cosa}}.',
  designExplicaPropuestasConMatiz: '{{numero}} javaslatot készítek ehhez: {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'modern és letisztult megjelenéssel',
  designMatizLookNatural: 'természetes megjelenéssel',
  designMatizLookLuxury: 'fényűző megjelenéssel',
  designMatizLookFun: 'vidám és színes megjelenéssel',
  designMatizLookIndustrial: 'ipari megjelenéssel',
  designMatizEraFuture: 'a jövőből',
  designMatizEraNow: 'a mából',
  designMatizEraClassic: 'klasszikus stílusban',
  designMatizEraScifi: 'sci-fi stílusban',
  designMatizInoutOutside: 'kívülről',
  designMatizInoutInside: 'belülről',
  designMatizInoutWide: 'tág nézetben',
  designMatizDrawCartoon: 'rajzfilmes stílusban',
  designMatizDrawReal: 'valósághű stílusban',
  designMatizDrawGame: 'videojátékos látványvilággal',
  designMatizDrawPencil: 'ceruzával rajzolva',
  designMatizDrawCute: 'aranyos hatással',

  designPasoConcepto: 'A koncepció meghatározása',
  designPasoLogos: '{{numero}} logó készítése',
  designPasoPropuestas: '{{numero}} javaslat készítése',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Megnézem a fotódat, és mozgást adok neki (stílus: {{estilo}}): egy {{segundos}} másodperces klip, megosztásra készen.',

  studioExplicaVideo: 'Írok egy rövid forgatókönyvet, elkészítek egy {{segundos}} másodperces videót (téma: {{video}}; formátum: {{formato}}; stílus: {{estilo}}), és felveszem a narrációt.',
  studioExplicaVideoPromo: 'Írok egy rövid forgatókönyvet, elkészítek egy {{segundos}} másodperces promóciós videót (formátum: {{formato}}; stílus: {{estilo}}), és felveszem a narrációt.',
  studioExplicaVideoMisRedes: 'Írok egy rövid forgatókönyvet, elkészítek egy {{segundos}} másodperces videót a közösségi oldalaidra (formátum: {{formato}}; stílus: {{estilo}}), és felveszem a narrációt.',
  studioVideoRedes: 'egy videó a közösségi oldalaidra',
  studioEstiloRitmo: 'barátságos és lendületes',
  studioFormatoVertical: 'függőleges, Instagramra és TikTokra',
  studioFormatoHorizontal: 'vízszintes, YouTube-ra',
  studioFormatoCuadrado: 'négyzetes, WhatsAppra és Facebookra',
  studioDecisionRedes: 'a közösségi oldalaidra készítem',
  studioDecisionEstilo: 'barátságos és lendületes stílust választottam',
  studioDecisionVertical: 'függőlegesre készítem, ami Instagramra és TikTokra is jó',

  studioPasoMirarFoto: 'A fotód megtekintése',
  studioPasoMovimiento: 'Mozgás adása a fotónak',
  studioPasoGuion: '{{numero}} jelenetes forgatókönyv megírása',
  studioPasoVideo: 'A videó létrehozása',
  studioPasoNarracion: 'A narráció felvétele',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: '{{numero}} képet készítek abból, amit elmondtál ({{como}}).',

  photoExplicaMejorarCalidad: 'Először megnézem a fotódat, aztán javítom a minőségét és a felbontását ({{como}}). Minden mást érintetlenül hagyok.',
  photoExplicaQuitarAlgo: 'Először megnézem a fotódat, aztán eltávolítom, ami felesleges ({{como}}). Minden mást érintetlenül hagyok.',
  photoExplicaFondo: 'Először megnézem a fotódat, aztán lecserélem vagy eltávolítom a hátteret ({{como}}). Minden mást érintetlenül hagyok.',
  photoExplicaRestaurar: 'Először megnézem a fotódat, aztán helyreállítom a régi képet ({{como}}). Minden mást érintetlenül hagyok.',
  photoExplicaRetoque: 'Először megnézem a fotódat, aztán természetesen retusálom az arcot ({{como}}). Minden mást érintetlenül hagyok.',
  photoExplicaColorizar: 'Először megnézem a fotódat, aztán kiszínezem a fekete-fehér képet ({{como}}). Minden mást érintetlenül hagyok.',
  photoExplicaTransformar: 'Először megnézem a fotódat, aztán átalakítom egy stílussal ({{como}}). Minden mást érintetlenül hagyok.',
  photoExplicaSinAccion: 'Először megnézem a fotódat, aztán javítom a minőségét ({{como}}). Minden mást érintetlenül hagyok.',
  photoExplicaAccion: 'Először megnézem a fotódat, aztán ezt végzem el: {{accion}} ({{como}}). Minden mást érintetlenül hagyok.',
  photoComoNatural: 'a lehető legtermészetesebben',
  photoDecisionCalidad: 'a minőség javításával kezdem',
  photoDecisionNatural: 'a lehető legtermészetesebbre készítem',
  photoDecisionNaturales: 'a lehető legtermészetesebbre készítem őket',

  photoPasoMirarFoto: 'A fotó megtekintése, hogy lássam, mi van rajta',
  photoPasoImagenes: '{{numero}} kép készítése',
  photoPasoMejorarFoto: 'A fotó javítása',
  photoPasoMejorarCalidad: 'A minőség és a felbontás javítása',
  photoPasoQuitarAlgo: 'Valami felesleges eltávolítása',
  photoPasoFondo: 'A háttér cseréje vagy eltávolítása',
  photoPasoRestaurar: 'Egy régi fotó helyreállítása',
  photoPasoRetoque: 'Természetes arcretus',
  photoPasoColorizar: 'Fekete-fehér kép színezése',
  photoPasoTransformar: 'Átalakítás egy stílussal',

  /* LA VOZ DE QUIEN HABLA: aquí habla Weë, así que «a márkámhoz» pasa a «a márkádhoz». */
  designCosaMascota: 'egy kabala a márkádhoz',
};
