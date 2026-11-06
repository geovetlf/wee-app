/*
 * FRANCÉS — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}` llega con su artículo y entra detrás de «pour» («pour une maison»), porque «de une» no se podría elidir. En
 * Studio, donde el español queda cojo, la frase se escribe entera y bien, como pide su cabecera; la duración, el
 * formato y el estilo van entre paréntesis para que no se peguen a lo que escribió la persona. `{{accion}}` entra
 * detrás de dos puntos, porque es texto de la persona.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Je vais créer {{numero}} logos pour « {{nombre}} ».',
  designExplicaLogoConNombreYAlma: 'Je vais créer {{numero}} logos pour « {{nombre}} », {{alma}}.',
  designAlmaSerious: 'avec un air sérieux et fiable',
  designAlmaModern: 'avec un air moderne',
  designAlmaClose: 'avec un air chaleureux et amusant',
  designAlmaLuxury: 'avec un air de luxe',
  designAlmaNatural: 'avec un air naturel',

  designExplicaAnuncio: 'Je vais créer {{numero}} propositions pour annoncer {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Je vais créer {{numero}} propositions pour annoncer {{anuncio}}, {{donde}}.',
  designDondeFeed: 'au format carré, pour Instagram ou Facebook',
  designDondeStory: 'en vertical, pour une story',
  designDondeWhatsapp: 'dans un format facile à partager sur WhatsApp',
  designDondePrint: 'au format A4, prêt à imprimer',

  designExplicaPropuestas: 'Je vais créer {{numero}} propositions pour {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Je vais créer {{numero}} propositions pour {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'avec un look moderne et épuré',
  designMatizLookNatural: 'avec un look naturel',
  designMatizLookLuxury: 'avec un look luxueux',
  designMatizLookFun: 'avec un look amusant et coloré',
  designMatizLookIndustrial: 'avec un look industriel',
  designMatizEraFuture: 'du futur',
  designMatizEraNow: 'd’aujourd’hui',
  designMatizEraClassic: 'de style classique',
  designMatizEraScifi: 'de science-fiction',
  designMatizInoutOutside: 'de l’extérieur',
  designMatizInoutInside: 'de l’intérieur',
  designMatizInoutWide: 'en vue large',
  designMatizDrawCartoon: 'en style dessin animé',
  designMatizDrawReal: 'en style réaliste',
  designMatizDrawGame: 'avec une esthétique de jeu vidéo',
  designMatizDrawPencil: 'au crayon',
  designMatizDrawCute: 'avec un air mignon',

  designPasoConcepto: 'Définir le concept',
  designPasoLogos: 'Créer {{numero}} logos',
  designPasoPropuestas: 'Créer {{numero}} propositions',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Je vais regarder ta photo et lui donner du mouvement avec un style {{estilo}} : un clip de {{segundos}} secondes prêt à partager.',

  studioExplicaVideo: 'Je vais écrire un court scénario, générer {{video}} ({{segundos}} secondes, {{formato}}, style {{estilo}}) et enregistrer la narration.',
  studioExplicaVideoPromo: 'Je vais écrire un court scénario, générer une vidéo pour promouvoir quelque chose ({{segundos}} secondes, {{formato}}, style {{estilo}}) et enregistrer la narration.',
  studioExplicaVideoMisRedes: 'Je vais écrire un court scénario, générer une vidéo pour tes réseaux ({{segundos}} secondes, {{formato}}, style {{estilo}}) et enregistrer la narration.',
  studioVideoRedes: 'une vidéo pour tes réseaux',
  studioEstiloRitmo: 'chaleureux et rythmé',
  studioFormatoVertical: 'vertical pour Instagram et TikTok',
  studioFormatoHorizontal: 'horizontal pour YouTube',
  studioFormatoCuadrado: 'carré pour WhatsApp et Facebook',
  studioDecisionRedes: 'je la prépare pour tes réseaux',
  studioDecisionEstilo: 'j’ai choisi un style chaleureux et rythmé',
  studioDecisionVertical: 'je la fais en vertical, ce qui convient à Instagram et TikTok',

  studioPasoMirarFoto: 'Regarder ta photo',
  studioPasoMovimiento: 'Donner du mouvement à la photo',
  studioPasoGuion: 'Écrire le scénario en {{numero}} scènes',
  studioPasoVideo: 'Générer la vidéo',
  studioPasoNarracion: 'Enregistrer la narration',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Je vais créer {{numero}} images à partir de ce que tu m’as raconté, {{como}}.',

  photoExplicaMejorarCalidad: 'Je regarde d’abord ta photo, puis je m’occupe d’améliorer la qualité et la résolution, {{como}}. Je garde tout le reste tel quel.',
  photoExplicaQuitarAlgo: 'Je regarde d’abord ta photo, puis je m’occupe de supprimer ce qui est de trop, {{como}}. Je garde tout le reste tel quel.',
  photoExplicaFondo: 'Je regarde d’abord ta photo, puis je m’occupe de changer ou de supprimer le fond, {{como}}. Je garde tout le reste tel quel.',
  photoExplicaRestaurar: 'Je regarde d’abord ta photo, puis je m’occupe de restaurer une vieille photo, {{como}}. Je garde tout le reste tel quel.',
  photoExplicaRetoque: 'Je regarde d’abord ta photo, puis je m’occupe de faire une retouche naturelle du visage, {{como}}. Je garde tout le reste tel quel.',
  photoExplicaColorizar: 'Je regarde d’abord ta photo, puis je m’occupe de coloriser le noir et blanc, {{como}}. Je garde tout le reste tel quel.',
  photoExplicaTransformar: 'Je regarde d’abord ta photo, puis je m’occupe de la transformer avec un style, {{como}}. Je garde tout le reste tel quel.',
  photoExplicaSinAccion: 'Je regarde d’abord ta photo, puis je m’occupe d’améliorer la qualité, {{como}}. Je garde tout le reste tel quel.',
  photoExplicaAccion: 'Je regarde d’abord ta photo, puis je m’occupe de ceci : {{accion}}, {{como}}. Je garde tout le reste tel quel.',
  photoComoNatural: 'le plus naturel possible',
  photoDecisionCalidad: 'je commence par améliorer la qualité',
  photoDecisionNatural: 'je le fais le plus naturel possible',
  photoDecisionNaturales: 'je les fais les plus naturelles possible',

  photoPasoMirarFoto: 'Regarder la photo pour comprendre ce qu’elle contient',
  photoPasoImagenes: 'Créer {{numero}} images',
  photoPasoMejorarFoto: 'Améliorer la photo',
  photoPasoMejorarCalidad: 'Améliorer la qualité et la résolution',
  photoPasoQuitarAlgo: 'Supprimer quelque chose de trop',
  photoPasoFondo: 'Changer ou supprimer le fond',
  photoPasoRestaurar: 'Restaurer une vieille photo',
  photoPasoRetoque: 'Retouche naturelle du visage',
  photoPasoColorizar: 'Coloriser du noir et blanc',
  photoPasoTransformar: 'Transformer avec un style',

  /* La voz de quien habla: en la frase de Weë, «ma marque» pasa a «ta marque». */
  designCosaMascota: 'une mascotte pour ta marque',
};
