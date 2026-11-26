/*
 * Account: deleting the Weë account (Settings → Delete account).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
/* 2026-11-22: ver la nota de ../es/cuenta.ts (desactivar 30 días; las claves obsoletas ya se quitaron). */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Delete account',
  sectionDanger: 'Danger zone',
  title: 'Delete account',
  goesFaces: 'All your profiles: your Real profile and your alter egos',
  goesCharacter: 'Your character and its avatar',
  goesPosts: 'Your posts, comments and reactions',
  goesMessages: 'Your WeeTalk messages: they are emptied, and the other person’s conversation stays without them',
  goesCreations: 'Your Weë AI creations, projects and conversations',
  goesContacts: 'Your contacts, communities and saved posts',
  goesCredits: 'Any Credits you have left: they are lost and not refunded',
  whatStaysTitle: 'What is kept',
  staysRecords: 'The accounting records of Credits and payments. They are kept without your name or your profile details, because they are Weë’s bookkeeping.',
  confirmLabel: 'To confirm, type “{{palabra}}”',
  confirmWord: 'DELETE',
  confirmPlaceholder: 'Type the word here',
  dialogTitle: 'Delete your account?',
  dialogConfirm: 'Delete',
  doneTitle: 'Your account was deleted',
  doneBody: 'Thank you for having been part of Weë.',
  reauthTitle: 'Sign in again',
  reauthBody: 'For your security, you need to have signed in recently to delete your account. Sign out, sign back in and repeat these steps.',
  reauthButton: 'Sign out to sign back in',
  errorTitle: 'It could not finish',
  errorBody: 'Something failed halfway. Try again: it will pick up where it stopped.',
  retry: 'Try again',
  /* ── Deactivate (2026-11-22) ── */
  settingsRowHintDesactivar: 'It is deactivated and, after 30 days, everything is erased',
  introDesactivar: 'Your account is deactivated now and, if you don’t come back within 30 days, everything is erased forever.',
  nowTitle: 'What happens now',
  nowHidden: 'Your account stops being visible: nobody will see your profiles or your posts',
  nowCharacterOff: 'Your character’s autonomy is switched off and stops charging',
  nowComeBack_one: 'You have {{contador}} day to come back: sign in again and choose “Activate account”',
  nowComeBack_other: 'You have {{contador}} days to come back: sign in again and choose “Activate account”',
  whatGoesLaterTitle: 'What gets erased if you don’t come back',
  deactivateButton: 'Delete my account',
  dialogBodyDesactivar: 'Your account will stop being visible. If you don’t come back within 30 days, everything will be erased and you won’t be able to get it back.',
  deactivating: 'Deactivating your account…',
  deactivatedTitle: 'Your account is deactivated',
  deactivatedBody: 'You have until {{fecha}} to come back. After that, everything will be erased forever.',
  /* ── Activate account (the screen when signing back in) ── */
  activarTitle: 'Your account is deactivated',
  activarBody: 'You asked to delete your account. While it is deactivated, nobody sees your profiles or your posts.',
  activarDaysLeft_one: '{{contador}} day left before permanent deletion',
  activarDaysLeft_other: '{{contador}} days left before permanent deletion',
  activarDate: 'If you don’t activate it, it will be erased forever on {{fecha}}.',
  activarCharacterNote: 'Your character’s autonomy will stay off; you can schedule it again whenever you like.',
  activarButton: 'Activate account',
  activating: 'Activating your account…',
  activatedTitle: 'Your account is active again',
  activarExpiredTitle: 'The time to come back is over',
  activarExpiredBody: 'Your account will be fully erased within the next few hours.',
  /* ── Audit review (2026-11-22) ── */
  goesCreditsCount: 'The {{creditos}} Credits you have left: they are lost and not refunded',
};
