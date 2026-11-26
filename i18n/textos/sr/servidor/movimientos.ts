/*
 * SERBIO (ћирилица) — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Plural one / few / other: por eso `ConPlurales`.
 */
import { ConPlurales } from '../../ru/plurales';

export const movimientos: ConPlurales<typeof import('../../es/servidor/movimientos').movimientos> = {
  saldoAnterior: 'Претходно стање',
  bienvenida: 'Credits добродошлице',
  ajusteMenos: 'Прилагођавање: коштало је мање од резервисаног',
  reembolsoFallida: 'Повраћај за неуспело генерисање',
  compra: 'Куповина Credits',
  regalo: 'Credits на поклон',
  recargaPrueba: 'Пробна допуна',
  compraRestaurada: 'Враћена куповина',
  reembolsoAdmin: 'Повраћај од администрације',
  avatar: 'Weë аватар',
  fotoConAvatar: 'Фотографија са твојим Weë аватаром',
  noSePudoTerminar: '{{base}} · није могло да се доврши',
  brainBusqueda: 'Weë Brain · претрага',
  brainRespuestas_one: 'Weë Brain · {{contador}} одговор',
  brainRespuestas_few: 'Weë Brain · {{contador}} одговора',
  brainRespuestas_other: 'Weë Brain · {{contador}} одговора',
  brainNoPudo: 'Weë Brain · одговор није био могућ',
  brainMuestra: 'Weë Brain · пример одговора, без наплате',
  studioVideo: 'Weë Studio · видео',
  studioSinTiempo: 'Weë Studio · претходном покушају је истекло време',
  studioNoSePudo: 'Weë Studio · видео није могао да се генерише',
  studioMundo: 'Weë Studio · 3D свет',
  studioMundoNoSePudo: 'Weë Studio · 3D свет није могао да се креира',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · радња није довршена',
  servicioAiImageLite: 'Стандардна слика',
  servicioAiImageEnhanceLite: 'Стандардно уређивање',
  servicioAiImage: 'Генерисање слике',
  servicioAiImageEnhance: 'Уређивање слике',
  servicioAiImagePro: 'Слика највеће прецизности',
  servicioAiTryon: 'Испробавање одеће',
  servicioAiVideoDraft: 'Видео за преглед',
  servicioAiVideo: 'Генерисање видеа',
  servicioAiVideoHd: 'Видео високог квалитета',
  servicioAiVideoAdvanced: 'Напредни видео',
  servicioAiVideoMax: 'Видео највишег квалитета',
  servicioAiVideoEdit: 'Монтажа видеа',
  servicioAiAudio: 'Генерисање гласа',
  servicioAiTranscribe: 'Транскрипција и титлови',
  servicioAiMusic: 'Генерисање музике',
  servicioAiWorld: 'Генерисање 3D света',
  servicioAiBrain: 'Одговор Weë Brain',
  servicioAiText: 'Генерисање текста',
  servicioAiTextPro: 'Дуги текст највишег квалитета',
  servicioAiSearch: 'Претрага уз AI',
  servicioAiBook: 'Израда књиге',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost објаве',
  boostNoIniciado: 'Boost није покренут',
  boostSinEntregas: 'Boost без испорука · све је враћено',
};
