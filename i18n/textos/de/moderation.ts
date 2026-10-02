/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tratamiento informal (du), como el resto del alemán de Weë.
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Melden',
  subtitle: 'Erzähl uns, was mit diesem Inhalt los ist.',
  chooseReason: 'Wähle einen Grund',
  send: 'Meldung senden',
  sending: 'Meldung wird gesendet…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Belästigung oder Mobbing',
  reasonHate: 'Hass oder Diskriminierung',
  reasonSexual: 'Sexuelle Inhalte',
  reasonViolence: 'Gewalt',
  reasonScam: 'Betrug oder Täuschung',
  reasonImpersonation: 'Identitätsdiebstahl',
  reasonIllegal: 'Illegale Inhalte',
  reasonSelfHarm: 'Selbstverletzung oder Suizid',
  reasonOther: 'Anderer Grund',
  successTitle: 'Meldung erhalten',
  successBody: 'Danke, dass du hilfst, Weë sicher zu halten.',
  duplicateTitle: 'Das hast du bereits gemeldet',
  duplicateBody: 'Deine Meldung zu diesem Inhalt liegt uns schon vor.',
  errorTitle: 'Wir konnten deine Meldung nicht senden.',
  errorBody: 'Versuch es noch einmal.',
  errorOffline: 'Keine Verbindung. Versuch es noch einmal.',
  errorRateLimited: 'Du hast viele Meldungen hintereinander gesendet. Versuch es später noch einmal.',
  errorUnavailable: 'Dieser Inhalt ist nicht mehr verfügbar.',
};
