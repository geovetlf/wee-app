/*
 * RUSO — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'ru',
  locale: 'ru_RU',
  alguien: 'Кто-то',
  tituloDelEnlace: '{{nombre}} в Weë',
  descripcionWeel: 'Weël в Weë.',
  descripcionVideo: 'Видео в Weë.',
  descripcionImagen: 'Изображение в Weë.',
  descripcionEncuesta: 'Опрос в Weë.',
  descripcionPublicacion: 'Публикация в Weë.',
  explorar: 'Открыть Weë',
  privacidad: 'Конфиденциальность',
  terminos: 'Условия',
  ayuda: 'Помощь',
  yaNoDisponible: 'Эта публикация больше не доступна.',
  noDisponible: 'Эта публикация недоступна.',
  masEnWee: 'и ещё {{contador}} в Weë',
  hechoCon: 'Создано с помощью',
  reposteo: 'Репост: {{nombre}}',
  perfilWee: 'Профиль Weë',
  estoEsWee: 'Это Weë',
  lema: 'Сеть для тех, кто создаёт с помощью искусственного интеллекта. Открывайте, учитесь и делитесь.',
};
