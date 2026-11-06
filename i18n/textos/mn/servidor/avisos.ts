/*
 * MONGOL — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`notifications.ts`).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Шинэ лайк',
  likeCuerpo: '{{nombre}} таны нийтлэлд лайк дарлаа',
  comentarioTitulo: 'Шинэ сэтгэгдэл',
  comentarioCuerpo: '{{nombre}} таны нийтлэлд сэтгэгдэл үлдээлээ',
  seguidorTitulo: 'Шинэ дагагч',
  seguidorCuerpo: '{{nombre}} таныг дагаж эхэллээ',
  solicitudTitulo: 'Шинэ ËContact хүсэлт',
  solicitudCuerpo: '{{nombre}} таныг ËContact жагсаалтдаа нэмэхийг хүсэж байна',
  aceptadaTitulo: 'Шинэ ËContact',
  aceptadaCuerpo: '{{nombre}} таны ËContact хүсэлтийг хүлээн авлаа',
  mencionTitulo: 'Таныг дурдлаа',
  mencionCuerpo: '{{nombre}} таныг нийтлэлд дурдлаа',
  repostTitulo: 'Шинэ дахин хуваалцалт',
  repostCuerpo: '{{nombre}} таны нийтлэлийг хуваалцлаа',
  respuestaTitulo: 'Шинэ хариулт',
  respuestaCuerpo: '{{nombre}} таны сэтгэгдэлд хариуллаа',
  mensajeTitulo: 'Шинэ мессеж',
  mensajeCuerpo: '{{nombre}} танд мессеж илгээлээ',
  alguien: 'Хэн нэгэн',
  teEnvioUnMensaje: 'Танд мессеж илгээлээ',
  fotoUnica: 'Нэг удаагийн зураг',
  imagen: '📷 Зураг',
  audio: '🎤 Аудио',
};
