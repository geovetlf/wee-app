/*
 * FILIPINO — Las notificaciones push (el aviso del sistema operativo, no la pantalla de Notificaciones).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los títulos son cortos y siguen todos la forma «Bagong + sustantivo», con las palabras del glosario: «Bagong
 * like», «Bagong komento», «Bagong follower», «Bagong repost», «Bagong sagot», «Bagong mensahe». ËContact no se
 * declina ni lleva afijos: marca + sustantivo, «Bagong ËContact request» (guía § 6). «Te mencionaron» es «Na-mention
 * ka», el completado con `na-` del préstamo (§ 3.3).
 *
 * Los cuerpos son las MISMAS frases filipinas que la pantalla de Notificaciones (`notifications.ts`) y que el § 12 de
 * la guía, para que quien recibe el push y abre la app lea igual en los dos sitios: el verbo delante y el nombre
 * detrás, con «ni» cuando lo hecho recae en lo tuyo («Nagustuhan ni {{nombre}} ang post mo», «Tinanggap ni…») y «si»
 * cuando la persona es quien actúa («Nagkomento si…», «Nag-follow sa iyo si…», «Sumagot si…»). Dos frases no tienen
 * gemela exacta en la pantalla porque el español del push dice otra cosa: «te mencionó en un post» añade «sa isang
 * post» a `notifications.mention`, y «reposteó tu publicación» es «Na-repost ni {{nombre}} ang post mo», el mismo
 * molde que «Na-mention ka ni {{nombre}}» (la pantalla dice «compartió», `Ibinahagi ni…`; aquí el español dice
 * «reposteó» y el título es «Bagong repost»). «Te envió un mensaje» es «Pinadalhan ka ni {{nombre}} ng mensahe».
 *
 * CUANDO NO SE SABE QUIÉN FUE, cada frase con nombre tiene su gemela `<clave>SinNombre`, como la pantalla
 * (`notifications.<clave>SinNombre`, decisión 6 de la guía): «si»/«ni» no admiten un sustantivo común (guía § 12;
 * «ni isang…» se lee además como «ni uno»), así que no se rellena el hueco con una palabra: se dice otra frase, «May
 * nag-like sa post mo», «May nagpadala sa iyo ng mensahe». El push de un mensaje lleva el nombre en el TÍTULO y
 * `teEnvioUnMensaje` va sin sujeto («Nagpadala sa iyo ng mensahe»); sin nombre, el título es «Bagong mensahe» y el
 * texto, si el mensaje no trae palabras, «May nagpadala sa iyo ng mensahe». `alguien` ya no se enseña en filipino:
 * es `common.someone` («Isang user»), por si un día se rellena un hueco que no vaya detrás de «si»/«ni».
 *
 * `fotoUnica`, `imagen` y `audio` son lo que WeeTalk enseña de un mensaje sin texto, con las MISMAS palabras de
 * `weetalk.ts` (`photoOnce`, `imagePreview`, `audioPreview`): «Larawang isang beses lang makikita», «📷 Larawan» y
 * «🎤 Voice message» (nota de voz = «voice message», glosario § 11.3).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Bagong like',
  likeCuerpo: 'Nagustuhan ni {{nombre}} ang post mo',
  comentarioTitulo: 'Bagong komento',
  comentarioCuerpo: 'Nagkomento si {{nombre}} sa post mo',
  seguidorTitulo: 'Bagong follower',
  seguidorCuerpo: 'Nag-follow sa iyo si {{nombre}}',
  solicitudTitulo: 'Bagong ËContact request',
  solicitudCuerpo: 'Gusto kang idagdag ni {{nombre}} sa ËContact',
  aceptadaTitulo: 'Bagong ËContact',
  aceptadaCuerpo: 'Tinanggap ni {{nombre}} ang ËContact request mo',
  mencionTitulo: 'Na-mention ka',
  mencionCuerpo: 'Na-mention ka ni {{nombre}} sa isang post',
  repostTitulo: 'Bagong repost',
  repostCuerpo: 'Na-repost ni {{nombre}} ang post mo',
  respuestaTitulo: 'Bagong sagot',
  respuestaCuerpo: 'Sumagot si {{nombre}} sa komento mo',
  mensajeTitulo: 'Bagong mensahe',
  mensajeCuerpo: 'Pinadalhan ka ni {{nombre}} ng mensahe',
  alguien: 'Isang user',
  teEnvioUnMensaje: 'Nagpadala sa iyo ng mensahe',
  likeCuerpoSinNombre: 'May nag-like sa post mo',
  comentarioCuerpoSinNombre: 'May nagkomento sa post mo',
  seguidorCuerpoSinNombre: 'May nag-follow sa iyo',
  solicitudCuerpoSinNombre: 'May gustong magdagdag sa iyo sa ËContact',
  aceptadaCuerpoSinNombre: 'Tinanggap ang ËContact request mo',
  mencionCuerpoSinNombre: 'May nag-mention sa iyo sa isang post',
  repostCuerpoSinNombre: 'May nag-repost ng post mo',
  respuestaCuerpoSinNombre: 'May sumagot sa komento mo',
  mensajeCuerpoSinNombre: 'May nagpadala sa iyo ng mensahe',
  tituloDelMensajeSinNombre: 'Bagong mensahe',
  teEnvioUnMensajeSinNombre: 'May nagpadala sa iyo ng mensahe',
  fotoUnica: 'Larawang isang beses lang makikita',
  imagen: '📷 Larawan',
  audio: '🎤 Voice message',
};
