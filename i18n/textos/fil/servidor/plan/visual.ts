/*
 * FILIPINO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * LA VOZ, la misma en los cuatro archivos del plan. Weë habla en primera persona, de tú a tú y sin «po», y lo que va
 * a hacer va en CONTEMPLATIVO (guía § 3.3), porque todavía no lo ha hecho: «Gagawa ako ng …», «Titingnan ko …»,
 * «Isusulat ko …». El «Primero… y después…» del español es «… muna …, saka ko …» («Titingnan ko muna ang larawan
 * mo, saka ko …»). Los pasos (`…Paso…`) son también el título del resultado y el nombre de la creación, así que van en
 * la forma del infinitivo-imperativo, como un título: «Buuin ang konsepto», «Gumawa ng {{numero}} logo», «I-generate
 * ang video». Las cifras no llevan enlace (guía § 8.3, regla 7: es un hueco sin plural y hoy siempre vale 3, 5 o 10),
 * y la duración se dice como «13 taong gulang» (§ 11.7): «{{segundos}} segundong video» —el «-ng» va en el
 * sustantivo, no en la cifra—.
 *
 * Las «…Decision…» cierran la coletilla «Como no estabas seguro, {{decision}}.» (`comoNoSabias`): son una oración
 * completa con su verbo delante y en minúscula, que encaja detrás de cualquier «Dahil …, …»; lo que Weë ya eligió va
 * en completado («pumili ako ng …») y lo que va a hacer, en contemplativo («ihahanda ko ito …»).
 *
 * DESIGN. «Propuestas» son «disenyo» («Gagawa ako ng {{numero}} disenyo ng {{cosa}}»), y lo diseñado llega de
 * `../opciones.ts` sin artículo («packaging», «kotse», «bagay na lumilipad», «tindahan o puwesto»), que es lo que pide
 * «ng». Lo que se anuncia va detrás de «para ipaalam ang …» («ang promo», «ang bagong produkto»). Las piezas que van
 * detrás de la coma son predicados cortos que se leen solos: el alma de la marca, «may modernong dating» («dating», la
 * impresión que causa); el matiz, «moderno at malinis ang itsura», «klasiko ang istilo», «mula sa labas» (neutras a
 * propósito, como en español), «sa istilong cartoon»; el «dónde», «sa patayong format, para sa story» (como «sa parisukat na format»; la historia de Instagram
 * es «story»), «sa A4 na format, handang i-print». Las comillas del nombre del logo son las tipográficas “…” (guía
 * § 7). La mascota, en boca de Weë, es «mascot para sa brand mo».
 *
 * STUDIO. El vídeo se dice «Magsusulat ako ng maikling script, gagawa ng … at magre-record ng narasyon», tres verbos
 * con el mismo foco y un solo «ako». El español cojo «generar para promocionar algo / para mis redes» se dice como
 * pide su comentario: «promo video» y «video para sa social media mo». La historia (la opción «Kuwento») entra sin
 * artículo: «10 segundong kuwento». El formato, con las palabras del glosario: «patayo», «pahiga», «parisukat». Los
 * estilos son adjetivos detrás de «sa istilong …»; con «Sorpréndeme», «magiliw at may ritmo».
 *
 * PHOTO. Cada acción tiene su frase, con el verbo de su botón en contemplativo («pagagandahin», «aalisin», «papalitan
 * o aalisin», «ire-restore», «ire-retouch nang natural», «kukulayan», «bibigyan … ng ibang istilo»); con la acción que
 * escribió la persona, «aasikasuhin ko ang {{accion}}». «Conservo todo lo demás tal cual» es «Hindi ko gagalawin ang
 * iba pa.», y «lo más natural posible», «sa pinakanatural na paraan». «Mirar la foto para entender qué tiene» es
 * «… para maintindihan ang laman nito». Los pasos de cada acción dicen lo mismo que su botón (`opciones.photoAction…`).
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  designExplicaLogoConNombre: 'Gagawa ako ng {{numero}} logo para sa “{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Gagawa ako ng {{numero}} logo para sa “{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'may seryoso at mapagkakatiwalaang dating',
  designAlmaModern: 'may modernong dating',
  designAlmaClose: 'may magiliw at masayang dating',
  designAlmaLuxury: 'may marangyang dating',
  designAlmaNatural: 'may natural na dating',

  designExplicaAnuncio: 'Gagawa ako ng {{numero}} disenyo para ipaalam ang {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Gagawa ako ng {{numero}} disenyo para ipaalam ang {{anuncio}}, {{donde}}.',
  designDondeFeed: 'sa parisukat na format, para sa Instagram o Facebook',
  designDondeStory: 'sa patayong format, para sa story',
  designDondeWhatsapp: 'sa format na madaling ibahagi sa WhatsApp',
  designDondePrint: 'sa A4 na format, handang i-print',

  designExplicaPropuestas: 'Gagawa ako ng {{numero}} disenyo ng {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Gagawa ako ng {{numero}} disenyo ng {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'moderno at malinis ang itsura',
  designMatizLookNatural: 'natural ang itsura',
  designMatizLookLuxury: 'marangya ang itsura',
  designMatizLookFun: 'masaya at makulay ang itsura',
  designMatizLookIndustrial: 'industriyal ang itsura',
  designMatizEraFuture: 'parang galing sa hinaharap',
  designMatizEraNow: 'pangkasalukuyan ang istilo',
  designMatizEraClassic: 'klasiko ang istilo',
  designMatizEraScifi: 'sci-fi ang istilo',
  designMatizInoutOutside: 'mula sa labas',
  designMatizInoutInside: 'mula sa loob',
  designMatizInoutWide: 'sa malawak na tanaw',
  designMatizDrawCartoon: 'sa istilong cartoon',
  designMatizDrawReal: 'sa makatotohanang istilo',
  designMatizDrawGame: 'sa istilo ng video game',
  designMatizDrawPencil: 'iginuhit sa lapis',
  designMatizDrawCute: 'may cute na dating',

  designPasoConcepto: 'Buuin ang konsepto',
  designPasoLogos: 'Gumawa ng {{numero}} logo',
  designPasoPropuestas: 'Gumawa ng {{numero}} disenyo',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  studioExplicaAnimar: 'Titingnan ko ang larawan mo at bibigyan ko ito ng galaw sa istilong {{estilo}}: {{segundos}} segundong clip na handa nang ibahagi.',

  studioExplicaVideo: 'Magsusulat ako ng maikling script, gagawa ng {{segundos}} segundong {{video}}, {{formato}}, sa istilong {{estilo}}, at magre-record ng narasyon.',
  studioExplicaVideoPromo: 'Magsusulat ako ng maikling script, gagawa ng {{segundos}} segundong promo video, {{formato}}, sa istilong {{estilo}}, at magre-record ng narasyon.',
  studioExplicaVideoMisRedes: 'Magsusulat ako ng maikling script, gagawa ng {{segundos}} segundong video para sa social media mo, {{formato}}, sa istilong {{estilo}}, at magre-record ng narasyon.',
  studioVideoRedes: 'video para sa social media mo',
  studioEstiloRitmo: 'magiliw at may ritmo',
  studioFormatoVertical: 'patayo para sa Instagram at TikTok',
  studioFormatoHorizontal: 'pahiga para sa YouTube',
  studioFormatoCuadrado: 'parisukat para sa WhatsApp at Facebook',
  studioDecisionRedes: 'ihahanda ko ito para sa social media mo',
  studioDecisionEstilo: 'pumili ako ng istilong magiliw at may ritmo',
  studioDecisionVertical: 'gagawin ko itong patayo, na puwede sa Instagram at TikTok',

  studioPasoMirarFoto: 'Tingnan ang larawan mo',
  studioPasoMovimiento: 'Bigyan ng galaw ang larawan',
  studioPasoGuion: 'Isulat ang script na may {{numero}} eksena',
  studioPasoVideo: 'I-generate ang video',
  studioPasoNarracion: 'I-record ang narasyon',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  photoExplicaCrear: 'Gagawa ako ng {{numero}} larawan batay sa ikinuwento mo, {{como}}.',

  photoExplicaMejorarCalidad: 'Titingnan ko muna ang larawan mo, saka ko pagagandahin ang kalidad at resolution nito, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoExplicaQuitarAlgo: 'Titingnan ko muna ang larawan mo, saka ko aalisin ang hindi kailangan, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoExplicaFondo: 'Titingnan ko muna ang larawan mo, saka ko papalitan o aalisin ang background, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoExplicaRestaurar: 'Titingnan ko muna ang larawan mo, saka ko ito ire-restore, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoExplicaRetoque: 'Titingnan ko muna ang larawan mo, saka ko ire-retouch nang natural ang mukha, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoExplicaColorizar: 'Titingnan ko muna ang larawan mo, saka ko kukulayan ang black and white na larawan, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoExplicaTransformar: 'Titingnan ko muna ang larawan mo, saka ko ito bibigyan ng ibang istilo, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoExplicaSinAccion: 'Titingnan ko muna ang larawan mo, saka ko pagagandahin ang kalidad nito, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoExplicaAccion: 'Titingnan ko muna ang larawan mo, saka ko aasikasuhin ang {{accion}}, {{como}}. Hindi ko gagalawin ang iba pa.',
  photoComoNatural: 'sa pinakanatural na paraan',
  photoDecisionCalidad: 'uunahin ko ang pagpapaganda ng kalidad',
  photoDecisionNatural: 'gagawin ko ito sa pinakanatural na paraan',
  photoDecisionNaturales: 'gagawin ko ang mga ito sa pinakanatural na paraan',

  photoPasoMirarFoto: 'Tingnan ang larawan para maintindihan ang laman nito',
  photoPasoImagenes: 'Gumawa ng {{numero}} larawan',
  photoPasoMejorarFoto: 'Pagandahin ang larawan',
  photoPasoMejorarCalidad: 'Pagandahin ang kalidad at resolution',
  photoPasoQuitarAlgo: 'Alisin ang hindi kailangan',
  photoPasoFondo: 'Palitan o alisin ang background',
  photoPasoRestaurar: 'I-restore ang lumang larawan',
  photoPasoRetoque: 'Natural na retouch ng mukha',
  photoPasoColorizar: 'Kulayan ang black and white',
  photoPasoTransformar: 'Bigyan ng ibang istilo',

  /* La voz de quien habla: en boca de Weë, «tu marca» (ver el español). */
  designCosaMascota: 'mascot para sa brand mo',
};
