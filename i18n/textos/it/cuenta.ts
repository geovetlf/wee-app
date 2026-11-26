/*
 * ITALIANO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Si dà del tu. «encargo» = «ordine», come già nella scheda («Ciò che ordina a Weë AI»); «post» per le pubblicazioni, come il resto del dizionario.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Elimina account',
  sectionDanger: 'Zona pericolosa',
  title: 'Elimina account',
  goesFaces: 'Tutti i tuoi profili: il tuo Profilo Reale e i tuoi alter ego',
  goesCharacter: 'Il tuo personaggio e il suo avatar',
  goesPosts: 'I tuoi post, commenti e reazioni',
  goesMessages: 'I tuoi messaggi di WeeTalk: vengono svuotati, e la conversazione dell’altra persona resta senza di essi',
  goesCreations: 'Le tue creazioni, i progetti e le conversazioni di Weë AI',
  goesContacts: 'I tuoi contatti, le community e i salvati',
  goesCredits: 'I Credits che ti restano: vanno persi e non vengono rimborsati',
  whatStaysTitle: 'Cosa resta',
  staysRecords: 'I registri contabili dei Credits e dei pagamenti. Si conservano senza il tuo nome né i dati del tuo profilo, perché sono la contabilità di Weë.',
  confirmLabel: 'Per confermare, scrivi “{{palabra}}”',
  confirmWord: 'ELIMINA',
  confirmPlaceholder: 'Scrivi la parola qui',
  dialogTitle: 'Eliminare il tuo account?',
  dialogConfirm: 'Elimina',
  doneTitle: 'Il tuo account è stato eliminato',
  doneBody: 'Grazie per aver fatto parte di Weë.',
  reauthTitle: 'Accedi di nuovo',
  reauthBody: 'Per sicurezza, per eliminare l’account devi aver effettuato l’accesso da poco. Esci, accedi di nuovo e ripeti questi passaggi.',
  reauthButton: 'Esci per accedere di nuovo',
  errorTitle: 'Non è stato possibile finire',
  errorBody: 'Qualcosa non ha funzionato a metà strada. Riprova: si riprenderà da dove si era fermato.',
  retry: 'Riprova',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Viene disattivato e, dopo 30 giorni, si cancella tutto',
  introDesactivar: 'Il tuo account viene disattivato subito e, se non torni entro 30 giorni, si cancella tutto per sempre.',
  nowTitle: 'Cosa succede adesso',
  nowHidden: 'Il tuo account non è più visibile: nessuno vedrà i tuoi profili né i tuoi post',
  nowCharacterOff: 'L’autonomia del tuo personaggio si spegne e smette di costare',
  nowComeBack_one: 'Hai {{contador}} giorno per tornare: accedi di nuovo e scegli “Riattiva account”',
  nowComeBack_other: 'Hai {{contador}} giorni per tornare: accedi di nuovo e scegli “Riattiva account”',
  whatGoesLaterTitle: 'Cosa viene cancellato se non torni',
  deactivateButton: 'Elimina il mio account',
  dialogBodyDesactivar: 'Il tuo account non sarà più visibile. Se non torni entro 30 giorni, verrà cancellato tutto e non potrai recuperarlo.',
  deactivating: 'Disattivazione dell’account in corso…',
  deactivatedTitle: 'Il tuo account è disattivato',
  deactivatedBody: 'Hai tempo fino al {{fecha}} per tornare. Dopo, verrà cancellato tutto per sempre.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Il tuo account è disattivato',
  activarBody: 'Hai chiesto di eliminare il tuo account. Finché è disattivato, nessuno vede i tuoi profili né i tuoi post.',
  activarDaysLeft_one: 'Manca {{contador}} giorno alla cancellazione definitiva',
  activarDaysLeft_other: 'Mancano {{contador}} giorni alla cancellazione definitiva',
  activarDate: 'Se non lo riattivi, verrà cancellato per sempre il {{fecha}}.',
  activarCharacterNote: 'L’autonomia del tuo personaggio resterà spenta; puoi riprogrammarla quando vuoi.',
  activarButton: 'Riattiva account',
  activating: 'Riattivazione dell’account in corso…',
  activatedTitle: 'Il tuo account è di nuovo attivo',
  activarExpiredTitle: 'Il tempo per tornare è scaduto',
  activarExpiredBody: 'Il tuo account verrà cancellato del tutto nelle prossime ore.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'I {{creditos}} Credits che ti restano: vanno persi e non vengono rimborsati',
};
