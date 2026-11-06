/*
 * RUSO — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana. `{{experiencia}}` es marca y no se traduce.
 *
 * `brainRespuestas` cuenta y por eso lleva `_few`/`_many` (`ConPlurales`).
 */
import { ConPlurales } from '../plurales';

export const movimientos: ConPlurales<typeof import('../../es/servidor/movimientos').movimientos> = {
  saldoAnterior: 'Предыдущий баланс',
  bienvenida: 'Приветственные Credits',
  ajusteMenos: 'Корректировка: обошлось дешевле зарезервированной суммы',
  reembolsoFallida: 'Возврат за неудавшуюся генерацию',
  compra: 'Покупка Credits',
  regalo: 'Подаренные Credits',
  recargaPrueba: 'Тестовое пополнение',
  compraRestaurada: 'Восстановленная покупка',
  reembolsoAdmin: 'Возврат от администрации',
  avatar: 'Аватар Weë',
  fotoConAvatar: 'Фото с вашим аватаром Weë',
  noSePudoTerminar: '{{base}} · завершить не удалось',
  brainBusqueda: 'Weë Brain · поиск',
  brainRespuestas_one: 'Weë Brain · {{contador}} ответ',
  brainRespuestas_few: 'Weë Brain · {{contador}} ответа',
  brainRespuestas_many: 'Weë Brain · {{contador}} ответов',
  brainRespuestas_other: 'Weë Brain · {{contador}} ответа',
  brainNoPudo: 'Weë Brain · ответить не удалось',
  studioVideo: 'Weë Studio · видео',
  studioSinTiempo: 'Weë Studio · время предыдущей попытки истекло',
  studioNoSePudo: 'Weë Studio · сгенерировать видео не удалось',
  studioMundo: 'Weë Studio · 3D-мир',
  studioMundoNoSePudo: 'Weë Studio · создать 3D-мир не удалось',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · завершить операцию не удалось',
  servicioAiImageLite: 'Стандартное изображение',
  servicioAiImageEnhanceLite: 'Стандартная ретушь',
  servicioAiImage: 'Генерация изображения',
  servicioAiImageEnhance: 'Ретушь изображения',
  servicioAiImagePro: 'Изображение максимальной точности',
  servicioAiTryon: 'Примерка одежды',
  servicioAiVideoDraft: 'Предварительное видео',
  servicioAiVideo: 'Генерация видео',
  servicioAiVideoHd: 'Видео высокого качества',
  servicioAiVideoAdvanced: 'Расширенное видео',
  servicioAiVideoMax: 'Видео максимального качества',
  servicioAiVideoEdit: 'Монтаж видео',
  servicioAiAudio: 'Генерация голоса',
  servicioAiTranscribe: 'Расшифровка и субтитры',
  servicioAiMusic: 'Генерация музыки',
  servicioAiWorld: 'Генерация 3D-мира',
  servicioAiBrain: 'Ответ Weë Brain',
  servicioAiText: 'Генерация текста',
  servicioAiTextPro: 'Длинный текст максимального качества',
  servicioAiSearch: 'Поиск с помощью ИИ',
  servicioAiBook: 'Создание книги',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost публикации',
  boostNoIniciado: 'Boost не запущен',
  boostSinEntregas: 'Boost без показов · возвращено полностью',
};
