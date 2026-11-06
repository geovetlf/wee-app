/*
 * RUSO — Lo que dice un trabajo de Weë AI mientras se hace (ver `../../es/servidor/progreso.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * El gerundio español se dice con el nombre de la acción («Создание изображения…»), que no marca género.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'Начинаем…',
  ajustandoVertical: 'Адаптация вашего Weël к вертикальному формату…',
  montando: 'Монтаж вашего Weël…',
  generandoWeel: 'Генерация вашего Weël…',
  creandoImagen: 'Создание изображения…',
  grabandoVoz: 'Запись голоса…',
  efectosDeSonido: 'Добавление звуковых эффектов…',
  componiendo: 'Создание музыки…',
  mirandoFoto: 'Анализ вашего фото…',
  preparandoDocumento: 'Подготовка документа…',
  escribiendoGuion: 'Написание сценария…',
  dividiendoEscenas: 'Разбивка истории на сцены…',
  creandoSubtitulos: 'Создание субтитров…',
  escribiendo: 'Пишем текст…',
  paso: '{{proposito}}…',
  sinTiempo: 'Время истекло. Ваши Credits возвращены.',
  listo: '✨ Готово',
  fallaVideo: 'На этот раз сгенерировать видео не удалось. Ничего не списано: попробуйте ещё раз чуть позже.',
  fallaImagen: 'На этот раз создать изображение не удалось. Ничего не списано: попробуйте ещё раз чуть позже.',
  fallaGeneral: 'На этот раз не получилось. Ничего не списано: попробуйте ещё раз чуть позже.',
  fallaCorta: 'Не получилось. Ничего не списано.',
};
