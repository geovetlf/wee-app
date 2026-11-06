/*
 * ÁRABE — Las notificaciones push (ver `../../es/servidor/avisos.ts`). Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Los cuerpos siguen a `notifications.ts`
 * y lo que WeeTalk enseña de un mensaje sin texto, a `weetalk.ts`.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'إعجاب جديد',
  likeCuerpo: 'أعجب {{nombre}} بمنشورك',
  comentarioTitulo: 'تعليق جديد',
  comentarioCuerpo: 'علّق {{nombre}} على منشورك',
  seguidorTitulo: 'متابع جديد',
  seguidorCuerpo: 'بدأ {{nombre}} بمتابعتك',
  solicitudTitulo: 'طلب ËContact جديد',
  solicitudCuerpo: 'يريد {{nombre}} إضافتك إلى ËContact',
  aceptadaTitulo: 'ËContact جديد',
  aceptadaCuerpo: 'قبِل {{nombre}} طلب ËContact الذي أرسلته',
  mencionTitulo: 'تمت الإشارة إليك',
  mencionCuerpo: 'أشار إليك {{nombre}} في منشور',
  repostTitulo: 'إعادة نشر جديدة',
  repostCuerpo: 'شارك {{nombre}} منشورك',
  respuestaTitulo: 'رد جديد',
  respuestaCuerpo: 'ردّ {{nombre}} على تعليقك',
  mensajeTitulo: 'رسالة جديدة',
  mensajeCuerpo: 'أرسل إليك {{nombre}} رسالة',
  alguien: 'شخص ما',
  teEnvioUnMensaje: 'أرسل إليك رسالة',
  fotoUnica: 'صورة لمرة واحدة',
  imagen: '📷 صورة',
  audio: '🎤 رسالة صوتية',
};
