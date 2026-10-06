/*
 * ENGLISH — El concepto de cada movimiento del historial de Credits (`creditTransactions.reason`). Ver
 * `../../es/servidor/movimientos.ts`.
 *
 * `{{base}}` es otro concepto de esta lista, ya traducido; `{{experiencia}}` es el nombre de una experiencia de
 * Weë AI, que es marca y llega tal cual. El servidor escribe «WEË AI» en versales; en pantalla va la grafía aprobada,
 * «Weë AI».
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: 'Previous balance',
  bienvenida: 'Welcome Credits',
  ajusteMenos: 'Adjustment: it cost less than reserved',
  reembolsoFallida: 'Refund for a failed generation',
  compra: 'Credits purchase',
  regalo: 'Gift Credits',
  recargaPrueba: 'Test top-up',
  compraRestaurada: 'Restored purchase',
  reembolsoAdmin: 'Administrative refund',
  avatar: 'Weë avatar',
  fotoConAvatar: 'Photo with your Weë avatar',
  noSePudoTerminar: '{{base}} · couldn’t be finished',
  brainBusqueda: 'Weë Brain · search',
  brainRespuestas_one: 'Weë Brain · {{contador}} answer',
  brainRespuestas_other: 'Weë Brain · {{contador}} answers',
  brainNoPudo: 'Weë Brain · couldn’t answer',
  studioVideo: 'Weë Studio · video',
  studioSinTiempo: 'Weë Studio · the previous attempt ran out of time',
  studioNoSePudo: 'Weë Studio · the video couldn’t be generated',
  studioMundo: 'Weë Studio · 3D world',
  studioMundoNoSePudo: 'Weë Studio · the 3D world couldn’t be created',
  weeAi: 'Weë AI · {{experiencia}}',
  operacionIncompleta: 'Weë · the operation wasn’t completed',
  servicioAiImageLite: 'Standard image',
  servicioAiImageEnhanceLite: 'Standard edit',
  servicioAiImage: 'Image generation',
  servicioAiImageEnhance: 'Image editing',
  servicioAiImagePro: 'Maximum-precision image',
  servicioAiTryon: 'Clothing try-on',
  servicioAiVideoDraft: 'Preview video',
  servicioAiVideo: 'Video generation',
  servicioAiVideoHd: 'High-quality video',
  servicioAiVideoAdvanced: 'Advanced video',
  servicioAiVideoMax: 'Maximum-quality video',
  servicioAiVideoEdit: 'Video editing',
  servicioAiAudio: 'Voice generation',
  servicioAiTranscribe: 'Transcription and subtitles',
  servicioAiMusic: 'Music generation',
  servicioAiWorld: '3D world generation',
  servicioAiBrain: 'Weë Brain answer',
  servicioAiText: 'Text generation',
  servicioAiTextPro: 'Maximum-quality long text',
  servicioAiSearch: 'AI search',
  servicioAiBook: 'Book creation',
};
