/*
 * FILIPINO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Es el vocabulario de botones que reutiliza el resto, y sale palabra por palabra del glosario (§ 11.2, § 11.4,
 * § 11.5) y de la regla 29 de la suite: «Kanselahin» (nunca «I-cancel»), «I-save», «I-delete» (nunca «Burahin» ni
 * «Tanggalin»), «Isara», «Bumalik», «Susunod», «Tapos na», «Ipadala», «Ibahagi» (nunca «I-share») y «Subukan ulit»
 * (nunca «Subukang muli»): imperativo sin pronombre, mayúscula de frase y sin punto (§ 3.1). `accept` es el botón
 * único de los avisos, «OK», como en Android. `retry` es botón y también cuerpo de un aviso, y dice lo mismo en los
 * dos sitios. «Algo salió mal» es «Nagkaproblema», la forma de Android (§ 3.4), sin punto porque el español no lo
 * lleva. «Cargando…» es «Naglo-load…», con su «…» de un carácter. `seeAll` conserva la flecha: «Tingnan lahat →».
 *
 * `new` es la etiqueta de algo nuevo (hoy, junto a «Gumawa ng Weë profile ko»): «Bago». `yes` y `no` son «Oo» y
 * «Hindi». `guest` es «Bisita» (Android) y el usuario anónimo, «Anonymous na user» (glosario § 11.7).
 *
 * EL ACTOR SIN NOMBRE (guía § 12). `user` es «User», el nombre que se pinta SOLO —la cabecera de un chat, el autor
 * de un comentario— (glosario: «Usuario» → «User»), y `someone`, «Isang user». Ninguno debería ir detrás de «si»/«ni»,
 * que no admiten un sustantivo común; en esta base aún van, porque no hay frases sin nombre (guía § 16, decisión 6).
 *
 * Plural (§ 8.3, regla 2): lo que se ve en `postsCount` es `{{cantidad}}`, un número ya formateado y compacto
 * («1.2K»), así que no se puede saber si acaba en 4, 6 o 9: las dos formas son iguales y sin enlace. Se escribe
 * «Mga post: {{cantidad}}», con la cifra detrás de su etiqueta, porque en el buscador va en la MISMA fila que
 * `communities.memberCount` («Mga miyembro: 1.2K») y en la portada de una comunidad junto a `communities.postCount`
 * («Mga post: 12»): una fila, un molde (la guía § 12 proponía «{{cantidad}} post», que dejaba la fila mezclada).
 * «Cargar más publicaciones» es «Mag-load pa ng mga post» (glosario § 11.2).
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Kanselahin',
  save: 'I-save',
  delete: 'I-delete',
  close: 'Isara',
  back: 'Bumalik',
  next: 'Susunod',
  done: 'Tapos na',
  accept: 'OK',
  send: 'Ipadala',
  share: 'Ibahagi',
  retry: 'Subukan ulit',
  mediaUnavailable: 'Hindi available ang file na ito',
  loading: 'Naglo-load…',
  error: 'Error',
  somethingWentWrong: 'Nagkaproblema',
  noResults: 'Walang resulta',
  notAvailable: 'Hindi available',
  comingSoon: 'Malapit na',
  new: 'Bago',
  seeAll: 'Tingnan lahat →',
  guest: 'Bisita',
  anonymousUser: 'Anonymous na user',
  user: 'User',
  yes: 'Oo',
  no: 'Hindi',
  loadMore: 'Mag-load pa ng mga post',
  postsCount_one: 'Mga post: {{cantidad}}',
  postsCount_other: 'Mga post: {{cantidad}}',
  someone: 'Isang user',
};
