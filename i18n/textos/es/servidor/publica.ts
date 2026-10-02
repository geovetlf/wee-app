/*
 * ESPAÑOL — La página pública de una publicación (`/post/<id>`), la que abre quien recibe un enlace sin tener Weë.
 *
 * La arma el servidor (`functions/src/public/postPage.ts` y `postPageHtml.ts`), así que el servidor tiene que saber el
 * texto en el idioma de quien la abre: lo lee de estos diccionarios a través de
 * `functions/src/public/textosDeLaPagina.ts`, que GENERA `scripts/i18n-textos-del-servidor.mjs`. El idioma sale del
 * enlace (`?hl=`, lo pone la app al compartir) o del navegador (`Accept-Language`); sin ninguno, el español de siempre.
 *
 * `locale` es la etiqueta de Open Graph de esta página (`og:locale`) y `codigo` lo que va en `<html lang>`: no son
 * frases, pero cambian con el idioma y por eso viven aquí.
 */
export const publica = {
  codigo: 'es',
  locale: 'es_ES',
  alguien: 'Alguien',
  tituloDelEnlace: '{{nombre}} en Weë',
  descripcionWeel: 'Un Weël en Weë.',
  descripcionVideo: 'Un video en Weë.',
  descripcionImagen: 'Una imagen en Weë.',
  descripcionEncuesta: 'Una encuesta en Weë.',
  descripcionPublicacion: 'Una publicación en Weë.',
  explorar: 'Explorar Weë',
  privacidad: 'Privacidad',
  terminos: 'Términos',
  ayuda: 'Ayuda',
  yaNoDisponible: 'Esta publicación ya no está disponible.',
  noDisponible: 'Esta publicación no está disponible.',
  masEnWee: 'y {{contador}} más en Weë',
  hechoCon: 'Hecho con',
  reposteo: '{{nombre}} reposteó',
  perfilWee: 'Perfil Weë',
  estoEsWee: 'Esto es Weë',
  lema: 'La red de quienes crean con Inteligencia Artificial. Descubre, aprende y comparte.',
};
