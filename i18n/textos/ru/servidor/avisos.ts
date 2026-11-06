/*
 * RUSO — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`), con «(а)» porque no se conoce el
 * género de quien actúa.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Новая оценка',
  likeCuerpo: '{{nombre}} оценил(а) вашу публикацию',
  comentarioTitulo: 'Новый комментарий',
  comentarioCuerpo: '{{nombre}} прокомментировал(а) вашу публикацию',
  seguidorTitulo: 'Новый подписчик',
  seguidorCuerpo: '{{nombre}} теперь подписан(а) на вас',
  solicitudTitulo: 'Новая заявка в ËContact',
  solicitudCuerpo: '{{nombre}} хочет добавить вас в ËContact',
  aceptadaTitulo: 'Новый контакт в ËContact',
  aceptadaCuerpo: '{{nombre}} принял(а) вашу заявку в ËContact',
  mencionTitulo: 'Новое упоминание',
  mencionCuerpo: '{{nombre}} упомянул(а) вас в публикации',
  repostTitulo: 'Новый репост',
  repostCuerpo: '{{nombre}} сделал(а) репост вашей публикации',
  respuestaTitulo: 'Новый ответ',
  respuestaCuerpo: '{{nombre}} ответил(а) на ваш комментарий',
  mensajeTitulo: 'Новое сообщение',
  mensajeCuerpo: '{{nombre}} отправил(а) вам сообщение',
  alguien: 'Кто-то',
  teEnvioUnMensaje: 'Отправил(а) вам сообщение',
  fotoUnica: 'Одноразовое фото',
  imagen: '📷 Изображение',
  audio: '🎤 Аудио',
};
