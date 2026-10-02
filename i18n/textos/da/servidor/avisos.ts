/*
 * DANÉS — Las notificaciones push (el aviso del sistema operativo, no la pantalla de Notificaciones).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los títulos son cortos y siguen todos la forma «Ny/Nyt + sustantivo», concordando con el género: «Nyt like»,
 * «Ny kommentar», «Ny følger», «Nyt svar», «Ny besked». El repost es «Ny deling» (compartir otra vez es «Del
 * igen» y deshacerlo, «Fortryd deling», en `wall.ts`). «Te mencionaron» es «Du blev nævnt» (mencionar =
 * «nævne», glosario § 9.2). ËContact no se declina: delante de un sustantivo va con guion, «Ny
 * ËContact-anmodning» (guía § 4).
 *
 * Los cuerpos son las MISMAS frases danesas que la pantalla de Notificaciones (`notifications.ts`), aunque el
 * español del push y el de la pantalla no siempre digan lo mismo: quien recibe el push y abre la app lee
 * igual en los dos sitios. «{{nombre}} le dio like a tu post» es «{{nombre}} synes godt om dit opslag», como
 * lo dice Facebook en danés; «post» y «publicación» son los dos «opslag». El nombre va de sujeto, al
 * principio, y el verbo detrás.
 *
 * `alguien` («Nogen») sustituye al nombre cuando no se sabe, también como título del push de un mensaje, y es
 * la MISMA palabra de `publica.alguien`. Ese push lleva el nombre en el título, así que `teEnvioUnMensaje` va
 * sin sujeto: «Sendte dig en besked». `fotoUnica`, `imagen` y `audio` son lo que WeeTalk enseña de un mensaje
 * sin texto, con las palabras de `weetalk.ts`: «Engangsfoto», «📷 Foto», «🎤 Talebesked».
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Nyt like',
  likeCuerpo: '{{nombre}} synes godt om dit opslag',
  comentarioTitulo: 'Ny kommentar',
  comentarioCuerpo: '{{nombre}} kommenterede dit opslag',
  seguidorTitulo: 'Ny følger',
  seguidorCuerpo: '{{nombre}} er begyndt at følge dig',
  solicitudTitulo: 'Ny ËContact-anmodning',
  solicitudCuerpo: '{{nombre}} vil tilføje dig til ËContact',
  aceptadaTitulo: 'Ny ËContact',
  aceptadaCuerpo: '{{nombre}} accepterede din ËContact-anmodning',
  mencionTitulo: 'Du blev nævnt',
  mencionCuerpo: '{{nombre}} nævnte dig i et opslag',
  repostTitulo: 'Ny deling',
  repostCuerpo: '{{nombre}} delte dit opslag',
  respuestaTitulo: 'Nyt svar',
  respuestaCuerpo: '{{nombre}} svarede på din kommentar',
  mensajeTitulo: 'Ny besked',
  mensajeCuerpo: '{{nombre}} sendte dig en besked',
  alguien: 'Nogen',
  teEnvioUnMensaje: 'Sendte dig en besked',
  fotoUnica: 'Engangsfoto',
  imagen: '📷 Foto',
  audio: '🎤 Talebesked',
};
