/*
 * SVENSKA (sv) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «karaktär» con «den», AI, «inlägg»; common.delete es «Ta bort», dos palabras: confirmWord «RADERA», un solo verbo fácil de teclear, y el botón final dice «Radera».
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Ta bort konto',
  sectionDanger: 'Farozon',
  title: 'Ta bort konto',
  goesFaces: 'Alla dina profiler: din riktiga profil och dina alter egon',
  goesCharacter: 'Din karaktär och dess avatar',
  goesPosts: 'Dina inlägg, kommentarer och reaktioner',
  goesMessages: 'Dina meddelanden i WeeTalk: de töms, och den andra personens konversation blir kvar utan dem',
  goesCreations: 'Dina skapelser, projekt och konversationer i Weë AI',
  goesContacts: 'Dina kontakter, communities och sparade inlägg',
  goesCredits: 'De Credits du har kvar: de går förlorade och återbetalas inte',
  whatStaysTitle: 'Det här sparas',
  staysRecords: 'Bokföringsposterna för Credits och betalningar. De sparas utan ditt namn och dina profiluppgifter, eftersom de är bokföringen för Weë.',
  confirmLabel: 'Skriv ”{{palabra}}” för att bekräfta',
  confirmWord: 'RADERA',
  confirmPlaceholder: 'Skriv ordet här',
  dialogTitle: 'Vill du ta bort ditt konto?',
  dialogConfirm: 'Ta bort',
  doneTitle: 'Ditt konto har raderats',
  doneBody: 'Tack för att du var en del av Weë.',
  reauthTitle: 'Logga in igen',
  reauthBody: 'Av säkerhetsskäl måste du ha loggat in nyligen för att ta bort kontot. Logga ut, logga in igen och upprepa stegen.',
  reauthButton: 'Logga ut för att logga in igen',
  errorTitle: 'Det gick inte att slutföra',
  errorBody: 'Något gick fel halvvägs. Försök igen: det fortsätter där det slutade.',
  retry: 'Försök igen',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Kontot inaktiveras och efter 30 dagar raderas allt',
  introDesactivar: 'Ditt konto inaktiveras nu, och om du inte kommer tillbaka inom 30 dagar raderas allt för alltid.',
  nowTitle: 'Det här händer nu',
  nowHidden: 'Ditt konto syns inte längre: ingen ser dina profiler eller dina inlägg',
  nowCharacterOff: 'Din karaktärs autonomi stängs av och slutar debiteras',
  nowComeBack_one: 'Du har {{contador}} dag på dig att komma tillbaka: logga in igen och välj ”Aktivera konto”',
  nowComeBack_other: 'Du har {{contador}} dagar på dig att komma tillbaka: logga in igen och välj ”Aktivera konto”',
  whatGoesLaterTitle: 'Det här raderas om du inte kommer tillbaka',
  deactivateButton: 'Radera mitt konto',
  dialogBodyDesactivar: 'Ditt konto syns inte längre. Om du inte kommer tillbaka inom 30 dagar raderas allt och du kan inte få tillbaka det.',
  deactivating: 'Inaktiverar ditt konto…',
  deactivatedTitle: 'Ditt konto är inaktiverat',
  deactivatedBody: 'Du har till och med {{fecha}} på dig att komma tillbaka. Sedan raderas allt för alltid.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Ditt konto är inaktiverat',
  activarBody: 'Du bad om att radera ditt konto. Så länge det är inaktiverat ser ingen dina profiler eller dina inlägg.',
  activarDaysLeft_one: '{{contador}} dag kvar till den slutliga raderingen',
  activarDaysLeft_other: '{{contador}} dagar kvar till den slutliga raderingen',
  activarDate: 'Om du inte aktiverar det raderas det för alltid den {{fecha}}.',
  activarCharacterNote: 'Din karaktärs autonomi förblir avstängd; du kan schemalägga den igen när du vill.',
  activarButton: 'Aktivera konto',
  activating: 'Aktiverar ditt konto…',
  activatedTitle: 'Ditt konto är aktivt igen',
  activarExpiredTitle: 'Tiden för att komma tillbaka har gått ut',
  activarExpiredBody: 'Ditt konto raderas helt inom de närmaste timmarna.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'De {{creditos}} Credits du har kvar: de går förlorade och återbetalas inte',
};
