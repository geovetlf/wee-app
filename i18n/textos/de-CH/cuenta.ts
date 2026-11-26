/*
 * DEUTSCH, SCHWEIZ (de-CH) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «Figur» con «sie», KI, «Beiträge», duzen, sin Eszett (ss); confirmWord «LÖSCHEN» = common.delete.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Konto löschen',
  sectionDanger: 'Gefahrenbereich',
  title: 'Konto löschen',
  goesFaces: 'Alle deine Profile: dein reales Profil und deine Alter Egos',
  goesCharacter: 'Deine Figur und ihr Avatar',
  goesPosts: 'Deine Beiträge, Kommentare und Reaktionen',
  goesMessages: 'Deine Nachrichten in WeeTalk: sie werden geleert, und das Gespräch der anderen Person bleibt ohne sie zurück',
  goesCreations: 'Deine Kreationen, Projekte und Unterhaltungen in Weë AI',
  goesContacts: 'Deine Kontakte, Communitys und gespeicherten Beiträge',
  goesCredits: 'Deine restlichen Credits: sie verfallen und werden nicht erstattet',
  whatStaysTitle: 'Was erhalten bleibt',
  staysRecords: 'Die Buchungsdaten zu Credits und Zahlungen. Sie werden ohne deinen Namen und deine Profildaten aufbewahrt, weil sie zur Buchhaltung von Weë gehören.',
  confirmLabel: 'Gib zur Bestätigung «{{palabra}}» ein',
  confirmWord: 'LÖSCHEN',
  confirmPlaceholder: 'Gib das Wort hier ein',
  dialogTitle: 'Dein Konto löschen?',
  dialogConfirm: 'Löschen',
  doneTitle: 'Dein Konto wurde gelöscht',
  doneBody: 'Danke, dass du Teil von Weë warst.',
  reauthTitle: 'Melde dich erneut an',
  reauthBody: 'Zu deiner Sicherheit musst du dich vor Kurzem angemeldet haben, um dein Konto zu löschen. Melde dich ab, dann wieder an und wiederhole diese Schritte.',
  reauthButton: 'Abmelden und neu anmelden',
  errorTitle: 'Es konnte nicht abgeschlossen werden',
  errorBody: 'Unterwegs ist etwas schiefgegangen. Versuch es noch einmal: Es geht dort weiter, wo es aufgehört hat.',
  retry: 'Erneut versuchen',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Es wird deaktiviert und nach 30 Tagen wird alles gelöscht',
  introDesactivar: 'Dein Konto wird jetzt deaktiviert, und wenn du nicht innerhalb von 30 Tagen zurückkommst, wird alles für immer gelöscht.',
  nowTitle: 'Was jetzt passiert',
  nowHidden: 'Dein Konto ist nicht mehr sichtbar: Niemand sieht deine Profile oder deine Beiträge',
  nowCharacterOff: 'Die Autonomie deiner Figur wird ausgeschaltet und kostet nichts mehr',
  nowComeBack_one: 'Du hast {{contador}} Tag, um zurückzukommen: Melde dich erneut an und wähle «Konto aktivieren»',
  nowComeBack_other: 'Du hast {{contador}} Tage, um zurückzukommen: Melde dich erneut an und wähle «Konto aktivieren»',
  whatGoesLaterTitle: 'Was gelöscht wird, wenn du nicht zurückkommst',
  deactivateButton: 'Mein Konto löschen',
  dialogBodyDesactivar: 'Dein Konto ist dann nicht mehr sichtbar. Wenn du nicht innerhalb von 30 Tagen zurückkommst, wird alles gelöscht und lässt sich nicht wiederherstellen.',
  deactivating: 'Dein Konto wird deaktiviert…',
  deactivatedTitle: 'Dein Konto ist deaktiviert',
  deactivatedBody: 'Du hast bis zum {{fecha}} Zeit, zurückzukommen. Danach wird alles für immer gelöscht.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Dein Konto ist deaktiviert',
  activarBody: 'Du hast die Löschung deines Kontos beantragt. Solange es deaktiviert ist, sieht niemand deine Profile oder deine Beiträge.',
  activarDaysLeft_one: 'Noch {{contador}} Tag bis zur endgültigen Löschung',
  activarDaysLeft_other: 'Noch {{contador}} Tage bis zur endgültigen Löschung',
  activarDate: 'Wenn du es nicht aktivierst, wird es am {{fecha}} für immer gelöscht.',
  activarCharacterNote: 'Die Autonomie deiner Figur bleibt ausgeschaltet; du kannst sie jederzeit wieder planen.',
  activarButton: 'Konto aktivieren',
  activating: 'Dein Konto wird aktiviert…',
  activatedTitle: 'Dein Konto ist wieder aktiv',
  activarExpiredTitle: 'Die Frist für die Rückkehr ist abgelaufen',
  activarExpiredBody: 'Dein Konto wird in den nächsten Stunden vollständig gelöscht.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Deine restlichen {{creditos}} Credits: sie verfallen und werden nicht erstattet',
};
