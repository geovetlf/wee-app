/*
 * NEDERLANDS (nl) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «personage» con «het», AI, «berichten» y «reacties»; confirmWord «VERWIJDER», el imperativo corto de common.delete («Verwijderen»).
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Account verwijderen',
  sectionDanger: 'Gevarenzone',
  title: 'Account verwijderen',
  goesFaces: 'Al je profielen: je echte profiel en je alter ego’s',
  goesCharacter: 'Je personage en zijn avatar',
  goesPosts: 'Je berichten, reacties en likes',
  goesMessages: 'Je berichten in WeeTalk: ze worden leeggemaakt, en het gesprek van de ander blijft zonder die berichten achter',
  goesCreations: 'Je creaties, projecten en gesprekken in Weë AI',
  goesContacts: 'Je contacten, community\'s en opgeslagen items',
  goesCredits: 'De Credits die je nog hebt: die gaan verloren en worden niet terugbetaald',
  whatStaysTitle: 'Wat er bewaard blijft',
  staysRecords: 'De boekhoudgegevens van Credits en betalingen. Die worden bewaard zonder je naam of je profielgegevens, omdat ze bij de boekhouding van Weë horen.',
  confirmLabel: 'Typ “{{palabra}}” om te bevestigen',
  confirmWord: 'VERWIJDER',
  confirmPlaceholder: 'Typ het woord hier',
  dialogTitle: 'Je account verwijderen?',
  dialogConfirm: 'Verwijderen',
  doneTitle: 'Je account is verwijderd',
  doneBody: 'Bedankt dat je deel uitmaakte van Weë.',
  reauthTitle: 'Log opnieuw in',
  reauthBody: 'Voor je veiligheid moet je kortgeleden zijn ingelogd om je account te verwijderen. Log uit, log weer in en herhaal deze stappen.',
  reauthButton: 'Uitloggen om opnieuw in te loggen',
  errorTitle: 'Het kon niet worden afgerond',
  errorBody: 'Er ging halverwege iets mis. Probeer het opnieuw: het gaat verder waar het was gebleven.',
  retry: 'Opnieuw proberen',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Het wordt gedeactiveerd en na 30 dagen wordt alles gewist',
  introDesactivar: 'Je account wordt nu gedeactiveerd en als je niet binnen 30 dagen terugkomt, wordt alles voorgoed gewist.',
  nowTitle: 'Wat er nu gebeurt',
  nowHidden: 'Je account is niet meer zichtbaar: niemand ziet je profielen of je berichten',
  nowCharacterOff: 'De autonomie van je personage wordt uitgeschakeld en kost niets meer',
  nowComeBack_one: 'Je hebt {{contador}} dag om terug te komen: log opnieuw in en kies “Account activeren”',
  nowComeBack_other: 'Je hebt {{contador}} dagen om terug te komen: log opnieuw in en kies “Account activeren”',
  whatGoesLaterTitle: 'Wat er wordt gewist als je niet terugkomt',
  deactivateButton: 'Mijn account verwijderen',
  dialogBodyDesactivar: 'Je account is dan niet meer zichtbaar. Als je niet binnen 30 dagen terugkomt, wordt alles gewist en kun je het niet terugkrijgen.',
  deactivating: 'Je account wordt gedeactiveerd…',
  deactivatedTitle: 'Je account is gedeactiveerd',
  deactivatedBody: 'Je hebt tot {{fecha}} om terug te komen. Daarna wordt alles voorgoed gewist.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Je account is gedeactiveerd',
  activarBody: 'Je hebt gevraagd je account te verwijderen. Zolang het gedeactiveerd is, ziet niemand je profielen of je berichten.',
  activarDaysLeft_one: 'Nog {{contador}} dag tot de definitieve verwijdering',
  activarDaysLeft_other: 'Nog {{contador}} dagen tot de definitieve verwijdering',
  activarDate: 'Als je het niet activeert, wordt het op {{fecha}} voorgoed gewist.',
  activarCharacterNote: 'De autonomie van je personage blijft uitgeschakeld; je kunt die opnieuw plannen wanneer je wilt.',
  activarButton: 'Account activeren',
  activating: 'Je account wordt geactiveerd…',
  activatedTitle: 'Je account is weer actief',
  activarExpiredTitle: 'De termijn om terug te komen is verstreken',
  activarExpiredBody: 'Je account wordt in de komende uren volledig gewist.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'De {{creditos}} Credits die je nog hebt: die gaan verloren en worden niet terugbetaald',
};
