/*
 * PERSA — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`../notifications.ts`), con el nombre como sujeto.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'پسند جدید',
  likeCuerpo: '{{nombre}} پست شما را پسندید',
  comentarioTitulo: 'نظر جدید',
  comentarioCuerpo: '{{nombre}} روی پست شما نظر داد',
  seguidorTitulo: 'دنبال‌کنندهٔ جدید',
  seguidorCuerpo: '{{nombre}} شما را دنبال کرد',
  solicitudTitulo: 'درخواست جدید ËContact',
  solicitudCuerpo: '{{nombre}} می‌خواهد شما را به ËContact اضافه کند',
  aceptadaTitulo: 'ËContact جدید',
  aceptadaCuerpo: '{{nombre}} درخواست ËContact شما را پذیرفت',
  mencionTitulo: 'از شما منشن شد',
  mencionCuerpo: '{{nombre}} شما را در یک پست منشن کرد',
  repostTitulo: 'بازنشر جدید',
  repostCuerpo: '{{nombre}} پست شما را بازنشر کرد',
  respuestaTitulo: 'پاسخ جدید',
  respuestaCuerpo: '{{nombre}} به نظر شما پاسخ داد',
  mensajeTitulo: 'پیام جدید',
  mensajeCuerpo: '{{nombre}} برای شما پیام فرستاد',
  alguien: 'کسی',
  teEnvioUnMensaje: 'برای شما پیام فرستاد',
  fotoUnica: 'عکس یک‌بار قابل‌مشاهده',
  imagen: '📷 تصویر',
  audio: '🎤 صدا',
};
