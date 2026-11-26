/*
 * PORTUGUÉS (pt-BR) — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}` llega con su artículo y entra detrás de «para» («para uma casa»). En Studio, donde el español queda cojo
 * («generar para promocionar algo de 10 segundos»), la frase se escribe entera y bien, como pide su cabecera; la
 * duración, el formato y el estilo van entre paréntesis para que no se peguen a lo que escribió la persona.
 * `{{accion}}` entra detrás de dos puntos, porque es texto de la persona.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Vou criar {{numero}} logos para “{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Vou criar {{numero}} logos para “{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'com um ar sério e confiável',
  designAlmaModern: 'com um ar moderno',
  designAlmaClose: 'com um ar próximo e divertido',
  designAlmaLuxury: 'com um ar de luxo',
  designAlmaNatural: 'com um ar natural',

  designExplicaAnuncio: 'Vou criar {{numero}} propostas para anunciar {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Vou criar {{numero}} propostas para anunciar {{anuncio}}, {{donde}}.',
  designDondeFeed: 'em formato quadrado, para Instagram ou Facebook',
  designDondeStory: 'na vertical, para um story',
  designDondeWhatsapp: 'em um formato fácil de compartilhar no WhatsApp',
  designDondePrint: 'em formato A4, pronto para imprimir',

  designExplicaPropuestas: 'Vou criar {{numero}} propostas para {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Vou criar {{numero}} propostas para {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'com aparência moderna e limpa',
  designMatizLookNatural: 'com aparência natural',
  designMatizLookLuxury: 'com aparência luxuosa',
  designMatizLookFun: 'com aparência divertida e colorida',
  designMatizLookIndustrial: 'com aparência industrial',
  designMatizEraFuture: 'do futuro',
  designMatizEraNow: 'de hoje',
  designMatizEraClassic: 'de estilo clássico',
  designMatizEraScifi: 'de ficção científica',
  designMatizInoutOutside: 'por fora',
  designMatizInoutInside: 'por dentro',
  designMatizInoutWide: 'em uma vista ampla',
  designMatizDrawCartoon: 'em estilo de desenho animado',
  designMatizDrawReal: 'em estilo realista',
  designMatizDrawGame: 'com estética de videogame',
  designMatizDrawPencil: 'em desenho a lápis',
  designMatizDrawCute: 'com um ar fofo',

  designPasoConcepto: 'Definir o conceito',
  designPasoLogos: 'Criar {{numero}} logos',
  designPasoPropuestas: 'Criar {{numero}} propostas',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Vou olhar sua foto e dar movimento a ela com um estilo {{estilo}}: um clipe de {{segundos}} segundos pronto para compartilhar.',

  studioExplicaVideo: 'Vou escrever um roteiro curto, gerar {{video}} ({{segundos}} segundos, {{formato}}, estilo {{estilo}}) e gravar a narração.',
  studioExplicaVideoPromo: 'Vou escrever um roteiro curto, gerar um vídeo para promover algo ({{segundos}} segundos, {{formato}}, estilo {{estilo}}) e gravar a narração.',
  studioExplicaVideoMisRedes: 'Vou escrever um roteiro curto, gerar um vídeo para as suas redes ({{segundos}} segundos, {{formato}}, estilo {{estilo}}) e gravar a narração.',
  studioVideoRedes: 'um vídeo para as suas redes',
  studioEstiloRitmo: 'amigável e com ritmo',
  studioFormatoVertical: 'vertical para Instagram e TikTok',
  studioFormatoHorizontal: 'horizontal para YouTube',
  studioFormatoCuadrado: 'quadrado para WhatsApp e Facebook',
  studioDecisionRedes: 'preparo para as suas redes',
  studioDecisionEstilo: 'escolhi um estilo amigável e com ritmo',
  studioDecisionVertical: 'faço na vertical, que serve para Instagram e TikTok',

  studioPasoMirarFoto: 'Olhar sua foto',
  studioPasoMovimiento: 'Dar movimento à foto',
  studioPasoGuion: 'Escrever o roteiro de {{numero}} cenas',
  studioPasoVideo: 'Gerar o vídeo',
  studioPasoNarracion: 'Gravar a narração',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Vou criar {{numero}} imagens a partir do que você me contou, {{como}}.',

  photoExplicaMejorarCalidad: 'Primeiro olho sua foto e depois cuido de melhorar a qualidade e a resolução, {{como}}. Mantenho todo o resto como está.',
  photoExplicaQuitarAlgo: 'Primeiro olho sua foto e depois cuido de remover o que está sobrando, {{como}}. Mantenho todo o resto como está.',
  photoExplicaFondo: 'Primeiro olho sua foto e depois cuido de trocar ou remover o fundo, {{como}}. Mantenho todo o resto como está.',
  photoExplicaRestaurar: 'Primeiro olho sua foto e depois cuido de restaurar uma foto antiga, {{como}}. Mantenho todo o resto como está.',
  photoExplicaRetoque: 'Primeiro olho sua foto e depois cuido de fazer um retoque natural do rosto, {{como}}. Mantenho todo o resto como está.',
  photoExplicaColorizar: 'Primeiro olho sua foto e depois cuido de colorir o preto e branco, {{como}}. Mantenho todo o resto como está.',
  photoExplicaTransformar: 'Primeiro olho sua foto e depois cuido de transformá-la com um estilo, {{como}}. Mantenho todo o resto como está.',
  photoExplicaSinAccion: 'Primeiro olho sua foto e depois cuido de melhorar a qualidade, {{como}}. Mantenho todo o resto como está.',
  photoExplicaAccion: 'Primeiro olho sua foto e depois cuido disto: {{accion}}, {{como}}. Mantenho todo o resto como está.',
  photoComoNatural: 'o mais natural possível',
  photoDecisionCalidad: 'começo melhorando a qualidade',
  photoDecisionNatural: 'deixo o mais natural possível',
  photoDecisionNaturales: 'deixo as imagens o mais naturais possível',

  photoPasoMirarFoto: 'Olhar a foto para entender o que ela tem',
  photoPasoImagenes: 'Criar {{numero}} imagens',
  photoPasoMejorarFoto: 'Melhorar a foto',
  photoPasoMejorarCalidad: 'Melhorar a qualidade e a resolução',
  photoPasoQuitarAlgo: 'Remover algo que está sobrando',
  photoPasoFondo: 'Trocar ou remover o fundo',
  photoPasoRestaurar: 'Restaurar uma foto antiga',
  photoPasoRetoque: 'Retoque natural do rosto',
  photoPasoColorizar: 'Colorir preto e branco',
  photoPasoTransformar: 'Transformar com um estilo',

  /* La voz de quien habla: en la frase de Weë, «minha marca» pasa a «sua marca». */
  designCosaMascota: 'um mascote para a sua marca',
};
