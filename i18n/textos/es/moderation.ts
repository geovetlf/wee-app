/*
 * Moderación: denunciar algo —una publicación, un comentario, un perfil— desde
 * cualquier sitio de Weë. Es transversal, y por eso tiene módulo propio.
 *
 * Los motivos son categorías internas para ordenar lo que nos cuentan, dichas en
 * lenguaje normal: no son términos legales. Y la confirmación dice solo lo que
 * es verdad: que el reporte se RECIBIÓ. Ni que se revisó, ni que se quitó nada.
 *
 * Los motivos son la lista del dueño (Moderation Core, 2026-11-07) más
 * «autolesiones o suicidio» como opción propia, que es una señal de riesgo y no
 * una acusación: el catálogo único vive en `functions/src/core/moderation.ts` y
 * la hoja lo pinta en ese orden desde `services/moderationService.ts`.
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
  reasonSexual: 'Desnudez o contenido sexual',
  reasonViolence: 'Violencia',
  reasonScam: 'Estafa o fraude',
  reasonImpersonation: 'Suplantación de identidad',
  reasonIllegal: 'Contenido ilegal',
  reasonIntellectualProperty: 'Propiedad intelectual',
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
