/*
 * FILIPINO — Los errores controlados que el servidor de Weë AI y de Weë Brain devuelve a la app.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los errores siguen la guía (§ 3.4 y § 10): qué pasó + qué hacer, sin culpar, con «Hindi ma-…» / «Hindi …» y el
 * paso siguiente, «Subukan ulit» («Subukan ulit mamaya» para «más tarde» y «Subukan ulit maya-maya» para «en un
 * momento»). Donde el español junta dos frases con dos puntos («No te cobré: inténtalo…»), aquí van dos frases cortas
 * con punto. El dinero, como en el glosario § 11.10: «No te cobré» es «Hindi kita siningil» (Weë en primera persona,
 * como en «Hindi ko ito nagawa nang maayos»), «te devolví los Credits», «ibinalik ko ang Credits mo», y «se quedó sin
 * tiempo», «naubusan ng oras», la misma fórmula en todo el servidor. «No encontramos…» es «Hindi namin mahanap …»,
 * como `filmmaker.perProductionNotFound`; «inválido», «hindi wasto» (glosario § 11.5).
 *
 * Un trabajo de Weë AI es «gawain» (la tarea que Weë tiene entre manos); una creación, «likha», y «tus creaciones»,
 * la sección «Mga likha ko», citada como en `creaciones.progressFindLater`. Una experiencia de Weë AI se dice
 * «espesyalista», como en casi toda la interfaz (glosario § 11.3). Iniciar sesión es «Mag-sign in»; subir,
 * «I-upload» / «Mag-upload»; la «dirección» de un archivo es su URL: «link». En Weë Filmmaker la toma es «take», el
 * plano «shot» y la producción «produksyon» (glosario § 11.11, como `filmmaker.ts`). Las piezas que dicen que falta
 * un dato del pedido usan «Walang tinukoy na …» (no se indicó), lo mismo que `servidor/social`.
 *
 * EL PROVEEDOR NO SE NOMBRA. Weë nunca le enseña a la persona quién genera por debajo: `providerError` habla de «ang
 * AI», `sinProveedor` dice que no hay ninguna AI disponible, e `inputRejected` cuenta en pasiva que los rostros
 * reales y ese contenido «hindi tinatanggap», sin decir quién no los acepta.
 *
 * HUECOS QUE SE RELLENAN CON PIEZAS DE ESTE MISMO MÓDULO. `{{campo}}` recibe `campoMensaje` («mensahe mo») o
 * `campoDescripcionVideo` («paglalarawan ng video»), y `{{archivo}}`, `archivoDocumento` («dokumento») o
 * `archivoAudio` («audio file»). Las piezas van sin marcador: lo pone la frase («ang {{campo}}», «ng {{archivo}}»),
 * así que ninguna frase empieza por el hueco y ninguna le pega un enlace «-ng» que dependa de cómo acaba la pieza.
 * `faltaCampo` es «Ilagay ang {{campo}}.» (lo que hay que hacer), y `revisaCampo` pone la cifra DETRÁS del sustantivo
 * («nasa pagitan ng 1 at {{max}} ang bilang ng character»), para que ningún número necesite enlace (§ 8.3, regla 7).
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'May kulang sa request mo. Tingnan ito at subukan ulit.',
  unauthorized: 'Mag-sign in para makagawa gamit ang Weë.',
  accountRequired: 'Para gumawa ng content gamit ang Weë AI, mag-sign in o gumawa ng account.',
  providerError: 'Hindi natapos ng AI ang likha mo sa pagkakataong ito. Hindi kita siningil. Subukan ulit maya-maya.',
  generationFailed: 'Hindi ko natapos ang likha mo. Hindi kita siningil. Subukan ulit.',
  timeout: 'Masyadong natagalan, kaya inihinto ko ito. Hindi kita siningil. Subukan ulit.',
  rateLimited: 'Marami kang nagawang likha nang sunod-sunod. Hindi kita siningil. Maghintay sandali at subukan ulit.',
  duplicate: 'Ginagawa na ang likhang iyan.',
  notAvailable: 'Hindi pa available ang feature na ito.',
  inputRejected: 'Hindi magamit ang larawan o video para sa likhang ito: hindi tinatanggap ang mukha ng totoong tao o ang ganoong content. Subukan ang ibang larawan o paglalarawan.',
  faltaCampo: 'Ilagay ang {{campo}}.',
  revisaCampo: 'Tingnan ang {{campo}}: dapat nasa pagitan ng 1 at {{max}} ang bilang ng character nito.',
  campoMensaje: 'mensahe mo',
  campoDescripcionVideo: 'paglalarawan ng video',
  conversacionNoEncontrada: 'Hindi namin mahanap ang chat na ito.',
  sinPlan: 'Wala pang plano ang gawaing ito.',
  sinUnPlan: 'Hindi pa nagkakaroon ng plano ang gawaing ito.',
  yaTienePlan: 'May plano na ang gawaing ito.',
  subeFoto: 'Mag-upload ng larawan para magamit ito ng Weë.',
  trabajoNoEncontrado: 'Hindi namin mahanap ang gawaing ito.',
  trabajoAjeno: 'Hindi sa iyo ang gawaing ito.',
  experienciaDesconocida: 'Hindi kilalang espesyalista.',
  faltaTrabajo: 'Walang tinukoy na gawain.',
  intentoSinTiempo: 'Naubusan ng oras ang pagsubok na iyan, kaya ibinalik ko ang Credits mo. Puwede mong subukan ulit.',
  fotoDireccion: 'Hindi wasto ang link ng larawan.',
  fotoSubir: 'I-upload muna sa Weë ang larawan bago ito gamitin.',
  fotoAjena: 'Hindi sa iyo ang larawang iyan.',
  archivoSube: 'I-upload ang {{archivo}} para mabasa ito ng Weë.',
  archivoDireccion: 'Hindi wasto ang link ng {{archivo}}.',
  archivoSubir: 'I-upload muna sa Weë ang {{archivo}} bago ito gamitin.',
  archivoAjeno: 'Hindi ikaw ang may-ari ng {{archivo}}.',
  archivoDocumento: 'dokumento',
  archivoAudio: 'audio file',
  sinTiempoAntes: 'Naubusan ito ng oras bago pa magsimula. Hindi kita siningil.',
  sinProveedor: 'Walang available na AI para dito ngayon. Subukan ulit mamaya.',
  noDisponibleActualmente: 'Hindi available sa ngayon ang feature na ito.',
  noDisponibleAhora: 'Hindi available ngayon ang feature na ito. Subukan ulit mamaya.',
  noDisponibleOpciones: 'Hindi available ang feature na ito sa mga opsyong pinili mo. Subukan ang iba.',
  describeVideo: 'Sabihin mo sa akin kung anong video ang gusto mong gawin.',
  creacionTerminada: 'Tapos na ang likhang iyan at hindi na ito uulitin. Hanapin ito sa “Mga likha ko”.',
  tomaInvalida: 'Hindi wasto ang take na iyan.',
  planoInvalido: 'Hindi wasto ang shot na iyan.',
  produccionNoEncontrada: 'Hindi namin mahanap ang produksyong iyan.',
  tomaNoGenerable: 'Hindi puwedeng i-generate nang ganito ang take na iyan.',
  creacionNoEncontrada: 'Hindi namin mahanap ang likhang iyan.',
  debesIniciarSesion: 'Kailangan mong mag-sign in',
};
