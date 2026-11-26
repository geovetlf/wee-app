/*
 * IRLANDÉS — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. `brainRespuestas` lleva las cinco formas:
 * «freagra» (1, 0 y 11+), «fhreagra» (2-6, lenición), «bhfreagra» (7-10, eclipsis); por eso `ConPlurales`.
 * Traducción de IA pendiente de revisión humana. `{{experiencia}}` es marca y no se traduce.
 */
import { ConPlurales } from '../plurales';

export const movimientos: ConPlurales<typeof import('../../es/servidor/movimientos').movimientos> = {
  saldoAnterior: 'Iarmhéid roimhe seo',
  bienvenida: 'Credits fáilte',
  ajusteMenos: 'Coigeartú: chosain sé níos lú ná an méid a cuireadh in áirithe',
  reembolsoFallida: 'Aisíocaíocht as giniúint a theip',
  compra: 'Ceannach Credits',
  regalo: 'Credits mar bhronntanas',
  recargaPrueba: 'Breisiú tástála',
  compraRestaurada: 'Ceannach athchóirithe',
  reembolsoAdmin: 'Aisíocaíocht ón riarachán',
  avatar: 'Abhatár Weë',
  fotoConAvatar: 'Grianghraf le d\'abhatár Weë',
  noSePudoTerminar: '{{base}} · níorbh fhéidir é a chríochnú',
  brainBusqueda: 'Weë Brain · cuardach',
  brainRespuestas_one: 'Weë Brain · {{contador}} freagra',
  brainRespuestas_two: 'Weë Brain · {{contador}} fhreagra',
  brainRespuestas_few: 'Weë Brain · {{contador}} fhreagra',
  brainRespuestas_many: 'Weë Brain · {{contador}} bhfreagra',
  brainRespuestas_other: 'Weë Brain · {{contador}} freagra',
  brainNoPudo: 'Weë Brain · níorbh fhéidir freagra a thabhairt',
  brainMuestra: 'Weë Brain · freagra samplach, gan táille',
  studioVideo: 'Weë Studio · físeán',
  studioSinTiempo: 'Weë Studio · rith an t-am amach ar an iarracht roimhe seo',
  studioNoSePudo: 'Weë Studio · níorbh fhéidir an físeán a ghiniúint',
  studioMundo: 'Weë Studio · domhan 3D',
  studioMundoNoSePudo: 'Weë Studio · níorbh fhéidir an domhan 3D a chruthú',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · níor críochnaíodh an oibríocht',
  servicioAiImageLite: 'Íomhá chaighdeánach',
  servicioAiImageEnhanceLite: 'Eagarthóireacht chaighdeánach',
  servicioAiImage: 'Giniúint íomhá',
  servicioAiImageEnhance: 'Eagarthóireacht íomhá',
  servicioAiImagePro: 'Íomhá ar an gcruinneas is airde',
  servicioAiTryon: 'Triail éadaí',
  servicioAiVideoDraft: 'Físeán réamhamhairc',
  servicioAiVideo: 'Giniúint físeáin',
  servicioAiVideoHd: 'Físeán ardcháilíochta',
  servicioAiVideoAdvanced: 'Físeán ardleibhéil',
  servicioAiVideoMax: 'Físeán den cháilíocht is airde',
  servicioAiVideoEdit: 'Eagarthóireacht físeáin',
  servicioAiAudio: 'Giniúint gutha',
  servicioAiTranscribe: 'Tras-scríobh agus fotheidil',
  servicioAiMusic: 'Giniúint ceoil',
  servicioAiWorld: 'Giniúint domhain 3D',
  servicioAiBrain: 'Freagra ó Weë Brain',
  servicioAiText: 'Giniúint téacs',
  servicioAiTextPro: 'Téacs fada den cháilíocht is airde',
  servicioAiSearch: 'Cuardach le IS',
  servicioAiBook: 'Leabhar a chruthú',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost postála',
  boostNoIniciado: 'Boost nár tosaíodh',
  boostSinEntregas: 'Boost gan taispeáint · tugadh gach rud ar ais',
};
