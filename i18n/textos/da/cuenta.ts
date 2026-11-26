/*
 * DANSK (da) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «karakter» con «den», AI, «Log ind»/«Log ud», «opslag»; confirmWord «SLET» = common.delete.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Slet konto',
  sectionDanger: 'Farezone',
  title: 'Slet konto',
  goesFaces: 'Alle dine profiler: din ægte profil og dine alter egoer',
  goesCharacter: 'Din karakter og dens avatar',
  goesPosts: 'Dine opslag, kommentarer og reaktioner',
  goesMessages: 'Dine beskeder i WeeTalk: de tømmes, og den andens samtale står tilbage uden dem',
  goesCreations: 'Dine kreationer, projekter og samtaler i Weë AI',
  goesContacts: 'Dine kontakter, fællesskaber og gemte opslag',
  goesCredits: 'De Credits, du har tilbage: de går tabt og refunderes ikke',
  whatStaysTitle: 'Det bliver gemt',
  staysRecords: 'Regnskabsposterne for Credits og betalinger. De gemmes uden dit navn og dine profiloplysninger, fordi de hører til regnskabet hos Weë.',
  confirmLabel: 'Skriv ”{{palabra}}” for at bekræfte',
  confirmWord: 'SLET',
  confirmPlaceholder: 'Skriv ordet her',
  dialogTitle: 'Vil du slette din konto?',
  dialogConfirm: 'Slet',
  doneTitle: 'Din konto er slettet',
  doneBody: 'Tak, fordi du var en del af Weë.',
  reauthTitle: 'Log ind igen',
  reauthBody: 'Af sikkerhedshensyn skal du have logget ind for nylig for at slette kontoen. Log ud, log ind igen, og gentag trinnene.',
  reauthButton: 'Log ud for at logge ind igen',
  errorTitle: 'Det kunne ikke gøres færdigt',
  errorBody: 'Noget gik galt undervejs. Prøv igen: det fortsætter, hvor det slap.',
  retry: 'Prøv igen',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Den deaktiveres, og efter 30 dage slettes alt',
  introDesactivar: 'Din konto deaktiveres nu, og hvis du ikke vender tilbage inden for 30 dage, slettes alt for altid.',
  nowTitle: 'Det sker nu',
  nowHidden: 'Din konto bliver usynlig: ingen kan se dine profiler eller dine opslag',
  nowCharacterOff: 'Din karakters autonomi slås fra og holder op med at koste',
  nowComeBack_one: 'Du har {{contador}} dag til at vende tilbage: log ind igen, og vælg ”Aktiver konto”',
  nowComeBack_other: 'Du har {{contador}} dage til at vende tilbage: log ind igen, og vælg ”Aktiver konto”',
  whatGoesLaterTitle: 'Det bliver slettet, hvis du ikke vender tilbage',
  deactivateButton: 'Slet min konto',
  dialogBodyDesactivar: 'Din konto bliver usynlig. Hvis du ikke vender tilbage inden for 30 dage, slettes alt, og du kan ikke få det tilbage.',
  deactivating: 'Deaktiverer din konto…',
  deactivatedTitle: 'Din konto er deaktiveret',
  deactivatedBody: 'Du har indtil {{fecha}} til at vende tilbage. Derefter slettes alt for altid.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Din konto er deaktiveret',
  activarBody: 'Du bad om at slette din konto. Så længe den er deaktiveret, kan ingen se dine profiler eller dine opslag.',
  activarDaysLeft_one: 'Der er {{contador}} dag tilbage til den endelige sletning',
  activarDaysLeft_other: 'Der er {{contador}} dage tilbage til den endelige sletning',
  activarDate: 'Hvis du ikke aktiverer den, slettes den for altid den {{fecha}}.',
  activarCharacterNote: 'Din karakters autonomi forbliver slået fra; du kan planlægge den igen, når du vil.',
  activarButton: 'Aktiver konto',
  activating: 'Aktiverer din konto…',
  activatedTitle: 'Din konto er aktiv igen',
  activarExpiredTitle: 'Fristen for at vende tilbage er udløbet',
  activarExpiredBody: 'Din konto bliver slettet helt inden for de næste timer.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'De {{creditos}} Credits, du har tilbage: de går tabt og refunderes ikke',
};
