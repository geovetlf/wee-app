/*
 * ALEMÁN SUIZO (de-CH, adaptado de `de/servidor`: ss, «…» y léxico suizo) — Las notificaciones push (ver `../../es/servidor/avisos.ts`). Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Los cuerpos siguen a `notifications.ts`
 * y lo que WeeTalk enseña de un mensaje sin texto, a `weetalk.ts`.
 */
export const avisos: typeof import('../../es/servidor/avisos').avisos = {
  likeTitulo: 'Neues Like',
  likeCuerpo: '{{nombre}} gefällt dein Beitrag',
  comentarioTitulo: 'Neuer Kommentar',
  comentarioCuerpo: '{{nombre}} hat deinen Beitrag kommentiert',
  seguidorTitulo: 'Neue Person folgt dir',
  seguidorCuerpo: '{{nombre}} folgt dir jetzt',
  solicitudTitulo: 'Neue ËContact-Anfrage',
  solicitudCuerpo: '{{nombre}} möchte dich zu ËContact hinzufügen',
  aceptadaTitulo: 'Neuer ËContact',
  aceptadaCuerpo: '{{nombre}} hat deine ËContact-Anfrage angenommen',
  mencionTitulo: 'Du wurdest erwähnt',
  mencionCuerpo: '{{nombre}} hat dich in einem Beitrag erwähnt',
  repostTitulo: 'Neuer Repost',
  repostCuerpo: '{{nombre}} hat deinen Beitrag geteilt',
  respuestaTitulo: 'Neue Antwort',
  respuestaCuerpo: '{{nombre}} hat auf deinen Kommentar geantwortet',
  mensajeTitulo: 'Neue Nachricht',
  mensajeCuerpo: '{{nombre}} hat dir eine Nachricht geschickt',
  alguien: 'Jemand',
  teEnvioUnMensaje: 'Hat dir eine Nachricht geschickt',
  fotoUnica: 'Einmal-Foto',
  imagen: '📷 Foto',
  audio: '🎤 Sprachnachricht',
};
