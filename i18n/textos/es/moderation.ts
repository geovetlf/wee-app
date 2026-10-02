/*
 * Moderación: denunciar algo —una publicación, un comentario, un perfil— desde
 * cualquier sitio de Weë. Es transversal, y por eso tiene módulo propio.
 *
 * Los motivos son categorías internas para ordenar lo que nos cuentan, dichas en
 * lenguaje normal: no son términos legales. Y la confirmación dice solo lo que
 * es verdad: que el reporte se RECIBIÓ. Ni que se revisó, ni que se quitó nada.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 */
export const moderation = {
  report: 'Denunciar',
  subtitle: 'Cuéntanos qué sucede con este contenido.',
  chooseReason: 'Selecciona un motivo',
  send: 'Enviar reporte',
  sending: 'Enviando reporte…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Acoso o intimidación',
  reasonHate: 'Odio o discriminación',
  reasonSexual: 'Contenido sexual',
  reasonViolence: 'Violencia',
  reasonScam: 'Estafa o fraude',
  reasonImpersonation: 'Suplantación de identidad',
  reasonIllegal: 'Contenido ilegal',
  reasonSelfHarm: 'Autolesiones o suicidio',
  reasonOther: 'Otro motivo',
  successTitle: 'Reporte recibido',
  successBody: 'Gracias por ayudarnos a mantener Weë seguro.',
  duplicateTitle: 'Ya lo habías denunciado',
  duplicateBody: 'Ya recibimos tu reporte sobre este contenido.',
  errorTitle: 'No pudimos enviar tu reporte.',
  errorBody: 'Inténtalo nuevamente.',
  errorOffline: 'No hay conexión. Inténtalo nuevamente.',
  errorRateLimited: 'Has enviado muchos reportes seguidos. Inténtalo más tarde.',
  errorUnavailable: 'Este contenido ya no está disponible.',
};
