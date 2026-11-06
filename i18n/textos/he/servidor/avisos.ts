/*
 * HEBREO — Las notificaciones push (ver `../../es/servidor/avisos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los cuerpos dicen lo mismo que la pantalla de Notificaciones (`../notifications.ts`): no se sabe el género de quien
 * actúa, así que se nominaliza («לייק מ-…») o se usa la barra donde esa pantalla ya la usa («אזכר/ה»).
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'לייק חדש',
  likeCuerpo: 'לייק מ-{{nombre}} על הפוסט שלך',
  comentarioTitulo: 'תגובה חדשה',
  comentarioCuerpo: 'תגובה מ-{{nombre}} על הפוסט שלך',
  seguidorTitulo: 'עוקב חדש',
  seguidorCuerpo: '{{nombre}} התחיל/ה לעקוב אחריך',
  solicitudTitulo: 'בקשת ËContact חדשה',
  solicitudCuerpo: 'בקשת ËContact מ-{{nombre}}',
  aceptadaTitulo: 'ËContact חדש',
  aceptadaCuerpo: 'בקשת ה-ËContact שלך אושרה על ידי {{nombre}}',
  mencionTitulo: 'אזכור חדש',
  mencionCuerpo: '{{nombre}} אזכר/ה אותך בפוסט',
  repostTitulo: 'שיתוף מחדש',
  repostCuerpo: '{{nombre}} שיתף/ה מחדש את הפוסט שלך',
  respuestaTitulo: 'תשובה חדשה',
  respuestaCuerpo: 'תשובה מ-{{nombre}} לתגובה שלך',
  mensajeTitulo: 'הודעה חדשה',
  mensajeCuerpo: 'הודעה חדשה מ-{{nombre}}',
  alguien: 'מישהו',
  teEnvioUnMensaje: 'שלחו לך הודעה',
  fotoUnica: 'תמונה חד-פעמית',
  imagen: '📷 תמונה',
  audio: '🎤 אודיו',
};
