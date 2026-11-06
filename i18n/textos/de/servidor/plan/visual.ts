/*
 * ALEMÁN — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. `{{anuncio}}` y `{{cosa}}` entran en
 * acusativo y con su artículo (`../opciones.ts`); `{{estilo}}` va tras la etiqueta «Stil:», sin declinar. El «generar
 * para promocionar algo» del español se dice como lo pide su comentario: «ein Werbevideo», «ein Video für deine Socials».
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  designExplicaLogoConNombre: 'Ich erstelle {{numero}} Logos für „{{nombre}}“.',
  designExplicaLogoConNombreYAlma: 'Ich erstelle {{numero}} Logos für „{{nombre}}“, {{alma}}.',
  designAlmaSerious: 'mit seriöser, vertrauenswürdiger Ausstrahlung',
  designAlmaModern: 'mit moderner Ausstrahlung',
  designAlmaClose: 'mit persönlicher, witziger Ausstrahlung',
  designAlmaLuxury: 'mit luxuriöser Ausstrahlung',
  designAlmaNatural: 'mit natürlicher Ausstrahlung',

  designExplicaAnuncio: 'Ich erstelle {{numero}} Vorschläge, um {{anuncio}} anzukündigen.',
  designExplicaAnuncioConDonde: 'Ich erstelle {{numero}} Vorschläge, um {{anuncio}} anzukündigen – {{donde}}.',
  designDondeFeed: 'im quadratischen Format für Instagram oder Facebook',
  designDondeStory: 'im Hochformat für eine Story',
  designDondeWhatsapp: 'in einem Format, das sich leicht per WhatsApp teilen lässt',
  designDondePrint: 'im A4-Format, fertig zum Drucken',

  designExplicaPropuestas: 'Ich erstelle {{numero}} Vorschläge für {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Ich erstelle {{numero}} Vorschläge für {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'mit modernem, klarem Look',
  designMatizLookNatural: 'mit natürlichem Look',
  designMatizLookLuxury: 'mit luxuriösem Look',
  designMatizLookFun: 'mit witzigem, farbenfrohem Look',
  designMatizLookIndustrial: 'mit industriellem Look',
  designMatizEraFuture: 'aus der Zukunft',
  designMatizEraNow: 'von heute',
  designMatizEraClassic: 'im klassischen Stil',
  designMatizEraScifi: 'im Science-Fiction-Stil',
  designMatizInoutOutside: 'von außen',
  designMatizInoutInside: 'von innen',
  designMatizInoutWide: 'in einer weiten Ansicht',
  designMatizDrawCartoon: 'im Zeichentrickstil',
  designMatizDrawReal: 'im realistischen Stil',
  designMatizDrawGame: 'im Videospiel-Look',
  designMatizDrawPencil: 'mit Bleistift gezeichnet',
  designMatizDrawCute: 'mit niedlicher Ausstrahlung',

  designPasoConcepto: 'Das Konzept festlegen',
  designPasoLogos: '{{numero}} Logos erstellen',
  designPasoPropuestas: '{{numero}} Vorschläge erstellen',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  studioExplicaAnimar: 'Ich sehe mir dein Foto an und bringe es in Bewegung (Stil: {{estilo}}): ein Clip von {{segundos}} Sekunden, bereit zum Teilen.',

  studioExplicaVideo: 'Ich schreibe ein kurzes Skript, generiere {{video}} mit {{segundos}} Sekunden Länge – {{formato}}, Stil: {{estilo}} – und nehme die Erzählstimme auf.',
  studioExplicaVideoPromo: 'Ich schreibe ein kurzes Skript, generiere ein Werbevideo mit {{segundos}} Sekunden Länge – {{formato}}, Stil: {{estilo}} – und nehme die Erzählstimme auf.',
  studioExplicaVideoMisRedes: 'Ich schreibe ein kurzes Skript, generiere ein Video für deine Socials mit {{segundos}} Sekunden Länge – {{formato}}, Stil: {{estilo}} – und nehme die Erzählstimme auf.',
  studioVideoRedes: 'ein Video für deine Socials',
  studioEstiloRitmo: 'persönlich und mit Rhythmus',
  studioFormatoVertical: 'im Hochformat für Instagram und TikTok',
  studioFormatoHorizontal: 'im Querformat für YouTube',
  studioFormatoCuadrado: 'quadratisch für WhatsApp und Facebook',
  studioDecisionRedes: 'bereite ich es für deine Socials vor',
  studioDecisionEstilo: 'habe ich einen persönlichen Stil mit Rhythmus gewählt',
  studioDecisionVertical: 'mache ich es im Hochformat, das passt für Instagram und TikTok',

  studioPasoMirarFoto: 'Dein Foto ansehen',
  studioPasoMovimiento: 'Das Foto in Bewegung bringen',
  studioPasoGuion: 'Das Skript mit {{numero}} Szenen schreiben',
  studioPasoVideo: 'Das Video generieren',
  studioPasoNarracion: 'Die Erzählstimme aufnehmen',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  photoExplicaCrear: 'Ich erstelle {{numero}} Bilder nach deiner Beschreibung, {{como}}.',

  photoExplicaMejorarCalidad: 'Zuerst sehe ich mir dein Foto an, dann verbessere ich Qualität und Auflösung, {{como}}. Alles andere lasse ich, wie es ist.',
  photoExplicaQuitarAlgo: 'Zuerst sehe ich mir dein Foto an, dann entferne ich, was stört, {{como}}. Alles andere lasse ich, wie es ist.',
  photoExplicaFondo: 'Zuerst sehe ich mir dein Foto an, dann ändere oder entferne ich den Hintergrund, {{como}}. Alles andere lasse ich, wie es ist.',
  photoExplicaRestaurar: 'Zuerst sehe ich mir dein Foto an, dann restauriere ich das alte Foto, {{como}}. Alles andere lasse ich, wie es ist.',
  photoExplicaRetoque: 'Zuerst sehe ich mir dein Foto an, dann retuschiere ich das Gesicht auf natürliche Weise, {{como}}. Alles andere lasse ich, wie es ist.',
  photoExplicaColorizar: 'Zuerst sehe ich mir dein Foto an, dann färbe ich das Schwarz-Weiß-Bild ein, {{como}}. Alles andere lasse ich, wie es ist.',
  photoExplicaTransformar: 'Zuerst sehe ich mir dein Foto an, dann verwandle ich es mit einem Stil, {{como}}. Alles andere lasse ich, wie es ist.',
  photoExplicaSinAccion: 'Zuerst sehe ich mir dein Foto an, dann verbessere ich die Qualität, {{como}}. Alles andere lasse ich, wie es ist.',
  photoExplicaAccion: 'Zuerst sehe ich mir dein Foto an, dann kümmere ich mich um Folgendes: {{accion}}, {{como}}. Alles andere lasse ich, wie es ist.',
  photoComoNatural: 'so natürlich wie möglich',
  photoDecisionCalidad: 'fange ich damit an, die Qualität zu verbessern',
  photoDecisionNatural: 'mache ich es so natürlich wie möglich',
  photoDecisionNaturales: 'mache ich sie so natürlich wie möglich',

  photoPasoMirarFoto: 'Das Foto ansehen, um zu verstehen, was darauf ist',
  photoPasoImagenes: '{{numero}} Bilder erstellen',
  photoPasoMejorarFoto: 'Das Foto verbessern',
  photoPasoMejorarCalidad: 'Qualität und Auflösung verbessern',
  photoPasoQuitarAlgo: 'Etwas entfernen, das stört',
  photoPasoFondo: 'Hintergrund ändern oder entfernen',
  photoPasoRestaurar: 'Ein altes Foto restaurieren',
  photoPasoRetoque: 'Gesicht natürlich retuschieren',
  photoPasoColorizar: 'Schwarz-Weiß einfärben',
  photoPasoTransformar: 'Mit einem Stil verwandeln',

  /* Weë habla de «du»: esta pieza manda sobre la opción, escrita con la voz de la persona. */
  designCosaMascota: 'ein Maskottchen für deine Marke',
};
