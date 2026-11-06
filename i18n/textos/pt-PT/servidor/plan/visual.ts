/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}` llega con su artículo y entra detrás de «para» («para uma casa»). En Studio, donde el español queda cojo
 * («generar para promocionar algo de 10 segundos»), la frase se escribe entera y bien, como pide su cabecera; la
 * duración, el formato y el estilo van entre paréntesis para que no se peguen a lo que escribió la persona.
 * `{{accion}}` entra detrás de dos puntos, porque es texto de la persona. Comillas «…», las de Portugal.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Vou criar {{numero}} logótipos para «{{nombre}}».',
  designExplicaLogoConNombreYAlma: 'Vou criar {{numero}} logótipos para «{{nombre}}», {{alma}}.',
  designAlmaSerious: 'com um ar sério e fiável',
  designAlmaModern: 'com um ar moderno',
  designAlmaClose: 'com um ar próximo e divertido',
  designAlmaLuxury: 'com um ar de luxo',
  designAlmaNatural: 'com um ar natural',

  designExplicaAnuncio: 'Vou criar {{numero}} propostas para anunciar {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Vou criar {{numero}} propostas para anunciar {{anuncio}}, {{donde}}.',
  designDondeFeed: 'em formato quadrado, para Instagram ou Facebook',
  designDondeStory: 'na vertical, para uma story',
  designDondeWhatsapp: 'num formato fácil de partilhar no WhatsApp',
  designDondePrint: 'em formato A4, pronto a imprimir',

  designExplicaPropuestas: 'Vou criar {{numero}} propostas para {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Vou criar {{numero}} propostas para {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'com um aspeto moderno e limpo',
  designMatizLookNatural: 'com um aspeto natural',
  designMatizLookLuxury: 'com um aspeto luxuoso',
  designMatizLookFun: 'com um aspeto divertido e colorido',
  designMatizLookIndustrial: 'com um aspeto industrial',
  designMatizEraFuture: 'do futuro',
  designMatizEraNow: 'de hoje',
  designMatizEraClassic: 'de estilo clássico',
  designMatizEraScifi: 'de ficção científica',
  designMatizInoutOutside: 'por fora',
  designMatizInoutInside: 'por dentro',
  designMatizInoutWide: 'numa vista ampla',
  designMatizDrawCartoon: 'em estilo de desenho animado',
  designMatizDrawReal: 'em estilo realista',
  designMatizDrawGame: 'com estética de videojogo',
  designMatizDrawPencil: 'em desenho a lápis',
  designMatizDrawCute: 'com um ar fofinho',

  designPasoConcepto: 'Definir o conceito',
  designPasoLogos: 'Criar {{numero}} logótipos',
  designPasoPropuestas: 'Criar {{numero}} propostas',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Vou ver a tua foto e dar-lhe movimento com um estilo {{estilo}}: um clipe de {{segundos}} segundos pronto a partilhar.',

  studioExplicaVideo: 'Vou escrever um guião curto, gerar {{video}} ({{segundos}} segundos, {{formato}}, estilo {{estilo}}) e gravar a narração.',
  studioExplicaVideoPromo: 'Vou escrever um guião curto, gerar um vídeo para promover algo ({{segundos}} segundos, {{formato}}, estilo {{estilo}}) e gravar a narração.',
  studioExplicaVideoMisRedes: 'Vou escrever um guião curto, gerar um vídeo para as tuas redes ({{segundos}} segundos, {{formato}}, estilo {{estilo}}) e gravar a narração.',
  studioVideoRedes: 'um vídeo para as tuas redes',
  studioEstiloRitmo: 'amigável e com ritmo',
  studioFormatoVertical: 'vertical para Instagram e TikTok',
  studioFormatoHorizontal: 'horizontal para YouTube',
  studioFormatoCuadrado: 'quadrado para WhatsApp e Facebook',
  studioDecisionRedes: 'preparo-o para as tuas redes',
  studioDecisionEstilo: 'escolhi um estilo amigável e com ritmo',
  studioDecisionVertical: 'faço-o na vertical, que serve para Instagram e TikTok',

  studioPasoMirarFoto: 'Ver a tua foto',
  studioPasoMovimiento: 'Dar movimento à foto',
  studioPasoGuion: 'Escrever o guião de {{numero}} cenas',
  studioPasoVideo: 'Gerar o vídeo',
  studioPasoNarracion: 'Gravar a narração',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Vou criar {{numero}} imagens a partir do que me contaste, {{como}}.',

  photoExplicaMejorarCalidad: 'Primeiro vejo a tua foto e depois trato de melhorar a qualidade e a resolução, {{como}}. Mantenho tudo o resto como está.',
  photoExplicaQuitarAlgo: 'Primeiro vejo a tua foto e depois trato de remover o que está a mais, {{como}}. Mantenho tudo o resto como está.',
  photoExplicaFondo: 'Primeiro vejo a tua foto e depois trato de mudar ou remover o fundo, {{como}}. Mantenho tudo o resto como está.',
  photoExplicaRestaurar: 'Primeiro vejo a tua foto e depois trato de restaurar uma foto antiga, {{como}}. Mantenho tudo o resto como está.',
  photoExplicaRetoque: 'Primeiro vejo a tua foto e depois trato de fazer um retoque natural do rosto, {{como}}. Mantenho tudo o resto como está.',
  photoExplicaColorizar: 'Primeiro vejo a tua foto e depois trato de colorir o preto e branco, {{como}}. Mantenho tudo o resto como está.',
  photoExplicaTransformar: 'Primeiro vejo a tua foto e depois trato de a transformar com um estilo, {{como}}. Mantenho tudo o resto como está.',
  photoExplicaSinAccion: 'Primeiro vejo a tua foto e depois trato de melhorar a qualidade, {{como}}. Mantenho tudo o resto como está.',
  photoExplicaAccion: 'Primeiro vejo a tua foto e depois trato disto: {{accion}}, {{como}}. Mantenho tudo o resto como está.',
  photoComoNatural: 'o mais natural possível',
  photoDecisionCalidad: 'começo por melhorar a qualidade',
  photoDecisionNatural: 'deixo-a o mais natural possível',
  photoDecisionNaturales: 'deixo as imagens o mais naturais possível',

  photoPasoMirarFoto: 'Ver a foto para perceber o que tem',
  photoPasoImagenes: 'Criar {{numero}} imagens',
  photoPasoMejorarFoto: 'Melhorar a foto',
  photoPasoMejorarCalidad: 'Melhorar a qualidade e a resolução',
  photoPasoQuitarAlgo: 'Remover algo que está a mais',
  photoPasoFondo: 'Mudar ou remover o fundo',
  photoPasoRestaurar: 'Restaurar uma foto antiga',
  photoPasoRetoque: 'Retoque natural do rosto',
  photoPasoColorizar: 'Colorir o preto e branco',
  photoPasoTransformar: 'Transformar com um estilo',

  /* La voz de quien habla: en la frase de Weë, «a minha marca» pasa a «a tua marca». */
  designCosaMascota: 'uma mascote para a tua marca',
};
