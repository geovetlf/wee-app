/*
 * NORSK BOKMÅL (nb) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «karakter» con «den», KI, «Profil Weë», «innlegg»; confirmWord «SLETT» = common.delete.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Slett konto',
  sectionDanger: 'Faresone',
  title: 'Slett konto',
  goesFaces: 'Alle profilene dine: den ekte profilen din og alter egoene dine',
  goesCharacter: 'Karakteren din og avataren dens',
  goesPosts: 'Innleggene, kommentarene og reaksjonene dine',
  goesMessages: 'Meldingene dine i WeeTalk: de tømmes, og samtalen til den andre personen blir stående uten dem',
  goesCreations: 'Kreasjonene, prosjektene og samtalene dine i Weë AI',
  goesContacts: 'Kontaktene, fellesskapene og det du har lagret',
  goesCredits: 'Credits du har igjen: de går tapt og refunderes ikke',
  whatStaysTitle: 'Dette beholdes',
  staysRecords: 'Regnskapsoppføringene for Credits og betalinger. De lagres uten navnet ditt eller profilopplysningene dine, fordi de er regnskapet til Weë.',
  confirmLabel: 'Skriv «{{palabra}}» for å bekrefte',
  confirmWord: 'SLETT',
  confirmPlaceholder: 'Skriv ordet her',
  dialogTitle: 'Vil du slette kontoen din?',
  dialogConfirm: 'Slett',
  doneTitle: 'Kontoen din er slettet',
  doneBody: 'Takk for at du var en del av Weë.',
  reauthTitle: 'Logg inn på nytt',
  reauthBody: 'Av sikkerhetshensyn må du ha logget inn nylig for å slette kontoen. Logg ut, logg inn igjen og gjenta disse trinnene.',
  reauthButton: 'Logg ut for å logge inn igjen',
  errorTitle: 'Det ble ikke fullført',
  errorBody: 'Noe gikk galt underveis. Prøv igjen: det fortsetter der det stoppet.',
  retry: 'Prøv igjen',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Den deaktiveres, og etter 30 dager slettes alt',
  introDesactivar: 'Kontoen din deaktiveres nå, og hvis du ikke kommer tilbake innen 30 dager, slettes alt for alltid.',
  nowTitle: 'Dette skjer nå',
  nowHidden: 'Kontoen din blir usynlig: ingen ser profilene eller innleggene dine',
  nowCharacterOff: 'Autonomien til karakteren din slås av og slutter å koste',
  nowComeBack_one: 'Du har {{contador}} dag på deg til å komme tilbake: logg inn igjen og velg «Aktiver konto»',
  nowComeBack_other: 'Du har {{contador}} dager på deg til å komme tilbake: logg inn igjen og velg «Aktiver konto»',
  whatGoesLaterTitle: 'Dette slettes hvis du ikke kommer tilbake',
  deactivateButton: 'Slett kontoen min',
  dialogBodyDesactivar: 'Kontoen din blir usynlig. Hvis du ikke kommer tilbake innen 30 dager, slettes alt, og du kan ikke få det tilbake.',
  deactivating: 'Deaktiverer kontoen din…',
  deactivatedTitle: 'Kontoen din er deaktivert',
  deactivatedBody: 'Du har frist til {{fecha}} med å komme tilbake. Etter det slettes alt for alltid.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Kontoen din er deaktivert',
  activarBody: 'Du ba om å slette kontoen din. Så lenge den er deaktivert, ser ingen profilene eller innleggene dine.',
  activarDaysLeft_one: 'Det er {{contador}} dag igjen til endelig sletting',
  activarDaysLeft_other: 'Det er {{contador}} dager igjen til endelig sletting',
  activarDate: 'Hvis du ikke aktiverer den, slettes den for alltid {{fecha}}.',
  activarCharacterNote: 'Autonomien til karakteren din forblir slått av; du kan planlegge den igjen når du vil.',
  activarButton: 'Aktiver konto',
  activating: 'Aktiverer kontoen din…',
  activatedTitle: 'Kontoen din er aktiv igjen',
  activarExpiredTitle: 'Fristen for å komme tilbake er ute',
  activarExpiredBody: 'Kontoen din slettes helt i løpet av de neste timene.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'De {{creditos}} Credits du har igjen: de går tapt og refunderes ikke',
};
