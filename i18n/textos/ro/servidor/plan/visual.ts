/*
 * RUMANO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}` llega con artículo («un ambalaj», «o casă») y por eso va detrás de dos puntos («propuneri de un ambalaj» no
 * concuerda). `{{matiz}}` no marca género. `{{estilo}}` concuerda en masculino con «stil» y `{{numero}}` hoy es 3 o 5/10,
 * cifras que el rumano escribe sin «de».
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Creez {{numero}} logouri pentru „{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Creez {{numero}} logouri pentru „{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'cu un aer serios și de încredere',
  designAlmaModern: 'cu un aer modern',
  designAlmaClose: 'cu un aer apropiat și amuzant',
  designAlmaLuxury: 'cu un aer de lux',
  designAlmaNatural: 'cu un aer natural',

  designExplicaAnuncio: 'Creez {{numero}} propuneri pentru a anunța {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Creez {{numero}} propuneri pentru a anunța {{anuncio}}, {{donde}}.',
  designDondeFeed: 'în format pătrat, pentru Instagram sau Facebook',
  designDondeStory: 'în format vertical, pentru o poveste',
  designDondeWhatsapp: 'într-un format ușor de distribuit pe WhatsApp',
  designDondePrint: 'în format A4, gata de tipărit',

  designExplicaPropuestas: 'Creez {{numero}} propuneri: {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Creez {{numero}} propuneri: {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'cu aspect modern și curat',
  designMatizLookNatural: 'cu aspect natural',
  designMatizLookLuxury: 'cu aspect luxos',
  designMatizLookFun: 'cu aspect amuzant și colorat',
  designMatizLookIndustrial: 'cu aspect industrial',
  designMatizEraFuture: 'din viitor',
  designMatizEraNow: 'din prezent',
  designMatizEraClassic: 'în stil clasic',
  designMatizEraScifi: 'în stil science-fiction',
  designMatizInoutOutside: 'din exterior',
  designMatizInoutInside: 'din interior',
  designMatizInoutWide: 'într-o vedere largă',
  designMatizDrawCartoon: 'în stil de desen animat',
  designMatizDrawReal: 'în stil realist',
  designMatizDrawGame: 'cu o estetică de joc video',
  designMatizDrawPencil: 'în desen de creion',
  designMatizDrawCute: 'cu un aer drăgălaș',

  designPasoConcepto: 'Definirea conceptului',
  designPasoLogos: 'Crearea a {{numero}} logouri',
  designPasoPropuestas: 'Crearea a {{numero}} propuneri',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Mă uit la fotografia ta și îi dau mișcare, într-un stil {{estilo}}: un clip de {{segundos}} secunde, gata de distribuit.',

  studioExplicaVideo: 'Scriu un scenariu scurt, generez {{video}} de {{segundos}} secunde, {{formato}}, în stil {{estilo}}, și înregistrez narațiunea.',
  studioExplicaVideoPromo: 'Scriu un scenariu scurt, generez un videoclip de {{segundos}} secunde pentru a promova ceva, {{formato}}, în stil {{estilo}}, și înregistrez narațiunea.',
  studioExplicaVideoMisRedes: 'Scriu un scenariu scurt, generez un videoclip de {{segundos}} secunde pentru rețelele tale, {{formato}}, în stil {{estilo}}, și înregistrez narațiunea.',
  studioVideoRedes: 'un videoclip pentru rețelele tale',
  studioEstiloRitmo: 'apropiat și cu ritm',
  studioFormatoVertical: 'în format vertical, pentru Instagram și TikTok',
  studioFormatoHorizontal: 'în format orizontal, pentru YouTube',
  studioFormatoCuadrado: 'în format pătrat, pentru WhatsApp și Facebook',
  studioDecisionRedes: 'îl pregătesc pentru rețelele tale',
  studioDecisionEstilo: 'am ales un stil apropiat și cu ritm',
  studioDecisionVertical: 'îl fac vertical, potrivit pentru Instagram și TikTok',

  studioPasoMirarFoto: 'Analizarea fotografiei tale',
  studioPasoMovimiento: 'Adăugarea de mișcare fotografiei',
  studioPasoGuion: 'Scrierea scenariului cu {{numero}} scene',
  studioPasoVideo: 'Generarea videoclipului',
  studioPasoNarracion: 'Înregistrarea narațiunii',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Creez {{numero}} imagini pornind de la ce mi-ai spus, {{como}}.',

  photoExplicaMejorarCalidad: 'Mai întâi mă uit la fotografia ta și apoi îi îmbunătățesc calitatea și rezoluția, {{como}}. Restul rămâne neschimbat.',
  photoExplicaQuitarAlgo: 'Mai întâi mă uit la fotografia ta și apoi elimin ce este în plus, {{como}}. Restul rămâne neschimbat.',
  photoExplicaFondo: 'Mai întâi mă uit la fotografia ta și apoi schimb sau elimin fundalul, {{como}}. Restul rămâne neschimbat.',
  photoExplicaRestaurar: 'Mai întâi mă uit la fotografia ta și apoi o restaurez, {{como}}. Restul rămâne neschimbat.',
  photoExplicaRetoque: 'Mai întâi mă uit la fotografia ta și apoi fac o retușare naturală a feței, {{como}}. Restul rămâne neschimbat.',
  photoExplicaColorizar: 'Mai întâi mă uit la fotografia ta și apoi colorez alb-negrul, {{como}}. Restul rămâne neschimbat.',
  photoExplicaTransformar: 'Mai întâi mă uit la fotografia ta și apoi o transform cu un stil, {{como}}. Restul rămâne neschimbat.',
  photoExplicaSinAccion: 'Mai întâi mă uit la fotografia ta și apoi îi îmbunătățesc calitatea, {{como}}. Restul rămâne neschimbat.',
  photoExplicaAccion: 'Mai întâi mă uit la fotografia ta și apoi mă ocup de asta: {{accion}}, {{como}}. Restul rămâne neschimbat.',
  photoComoNatural: 'cât mai natural',
  photoDecisionCalidad: 'încep prin a îmbunătăți calitatea',
  photoDecisionNatural: 'o fac cât mai natural',
  photoDecisionNaturales: 'le fac cât mai naturale',

  photoPasoMirarFoto: 'Analizarea fotografiei, ca să înțeleg ce conține',
  photoPasoImagenes: 'Crearea a {{numero}} imagini',
  photoPasoMejorarFoto: 'Îmbunătățirea fotografiei',
  photoPasoMejorarCalidad: 'Îmbunătățirea calității și a rezoluției',
  photoPasoQuitarAlgo: 'Eliminarea a ceea ce este în plus',
  photoPasoFondo: 'Schimbarea sau eliminarea fundalului',
  photoPasoRestaurar: 'Restaurarea unei fotografii vechi',
  photoPasoRetoque: 'Retușarea naturală a feței',
  photoPasoColorizar: 'Colorarea alb-negrului',
  photoPasoTransformar: 'Transformarea cu un stil',

  /* La voz de quien habla: esta pieza manda sobre la opción y Weë habla de «tu». */
  designCosaMascota: 'o mascotă pentru marca ta',
};
