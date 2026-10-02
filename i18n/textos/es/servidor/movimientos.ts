/*
 * ESPAÑOL — El concepto de cada movimiento del historial de Credits (`creditTransactions.reason`).
 *
 * Lo escribe el servidor al cobrar, devolver o regalar (`functions/src/credits/creditEngine.ts`, `creditCosts.ts`,
 * `credits/index.ts`, `payments/purchaseValidation.ts`, `generateAvatar.ts`, `creator/brain.ts`, `creator/video.ts`,
 * `creator/credits.ts`, `runtime/index.ts`) y se GUARDA: los movimientos de hace meses dicen lo mismo. Por eso la app
 * reconoce la frase guardada y la pinta en el idioma de quien mira, también la de los movimientos antiguos.
 *
 * `{{base}} · no se pudo terminar` envuelve a otra de esta lista; `{{experiencia}}` es el nombre de una experiencia
 * de Weë AI, que es marca y no se traduce. Las `servicio…` son el concepto por defecto cuando no se da ninguno.
 */
export const movimientos = {
  saldoAnterior: 'Saldo anterior',
  bienvenida: 'Credits de bienvenida',
  ajusteMenos: 'Ajuste: costó menos de lo reservado',
  reembolsoFallida: 'Reembolso por generación fallida',
  compra: 'Compra de Credits',
  regalo: 'Credits de regalo',
  recargaPrueba: 'Recarga de prueba',
  compraRestaurada: 'Compra restaurada',
  reembolsoAdmin: 'Reembolso por administración',
  avatar: 'Avatar Weë',
  fotoConAvatar: 'Foto con tu avatar Weë',
  noSePudoTerminar: '{{base}} · no se pudo terminar',
  brainBusqueda: 'Weë Brain · búsqueda',
  brainRespuestas_one: 'Weë Brain · {{contador}} respuesta',
  brainRespuestas_other: 'Weë Brain · {{contador}} respuestas',
  brainNoPudo: 'Weë Brain · no pudo responder',
  studioVideo: 'Weë Studio · video',
  studioSinTiempo: 'Weë Studio · el intento anterior se quedó sin tiempo',
  studioNoSePudo: 'Weë Studio · el video no se pudo generar',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · la operación no llegó a completarse',
  servicioAiImageLite: 'Imagen estándar',
  servicioAiImageEnhanceLite: 'Edición estándar',
  servicioAiImage: 'Generación de imagen',
  servicioAiImageEnhance: 'Edición de imagen',
  servicioAiImagePro: 'Imagen de máxima precisión',
  servicioAiTryon: 'Prueba de ropa',
  servicioAiVideoDraft: 'Video de vista previa',
  servicioAiVideo: 'Generación de video',
  servicioAiVideoHd: 'Video de alta calidad',
  servicioAiVideoAdvanced: 'Video avanzado',
  servicioAiVideoMax: 'Video de máxima calidad',
  servicioAiVideoEdit: 'Montaje de video',
  servicioAiAudio: 'Generación de voz',
  servicioAiTranscribe: 'Transcripción y subtítulos',
  servicioAiMusic: 'Generación de música',
  servicioAiBrain: 'Respuesta de Weë Brain',
  servicioAiText: 'Generación de texto',
  servicioAiTextPro: 'Texto largo de máxima calidad',
  servicioAiSearch: 'Búsqueda con IA',
  servicioAiBook: 'Creación de libro',
};
