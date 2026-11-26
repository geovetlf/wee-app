/*
 * CATALÀ — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tuteig i imperatiu als botons («Elimina»), com common.delete. «encàrrec» per a «encargo».
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Elimina el compte',
  sectionDanger: 'Zona de perill',
  title: 'Elimina el compte',
  goesFaces: 'Tots els teus perfils: el teu Perfil real i els teus àlter egos',
  goesCharacter: 'El teu personatge i el seu avatar',
  goesPosts: 'Les teves publicacions, comentaris i reaccions',
  goesMessages: 'Els teus missatges de WeeTalk: es buiden, i la conversa de l\'altra persona es queda sense ells',
  goesCreations: 'Les teves creacions, projectes i converses de Weë AI',
  goesContacts: 'Els teus contactes, comunitats i desats',
  goesCredits: 'Els Credits que et quedin: es perden i no es retornen',
  whatStaysTitle: 'Què es conserva',
  staysRecords: 'Els registres comptables de Credits i pagaments. Es guarden sense el teu nom ni les dades del teu perfil, perquè són la comptabilitat de Weë.',
  confirmLabel: 'Per confirmar, escriu «{{palabra}}»',
  confirmWord: 'ELIMINA',
  confirmPlaceholder: 'Escriu la paraula aquí',
  dialogTitle: 'Vols eliminar el teu compte?',
  dialogConfirm: 'Elimina',
  doneTitle: 'El teu compte s\'ha eliminat',
  doneBody: 'Gràcies per haver format part de Weë.',
  reauthTitle: 'Torna a iniciar la sessió',
  reauthBody: 'Per seguretat, per eliminar el compte has d\'haver entrat fa poc. Tanca la sessió, torna a entrar i repeteix aquests passos.',
  reauthButton: 'Tanca la sessió per tornar a entrar',
  errorTitle: 'No s\'ha pogut acabar',
  errorBody: 'Alguna cosa ha fallat a mig camí. Torna-ho a provar: es reprendrà on s\'havia quedat.',
  retry: 'Torna-ho a provar',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Es desactiva i, al cap de 30 dies, s\'esborra tot',
  introDesactivar: 'El teu compte es desactiva ara i, si no tornes en 30 dies, s\'esborra tot per sempre.',
  nowTitle: 'Què passa ara',
  nowHidden: 'El teu compte deixa de veure\'s: ningú no veurà els teus perfils ni les teves publicacions',
  nowCharacterOff: 'L\'autonomia del teu personatge s\'apaga i deixa de cobrar',
  nowComeBack_one: 'Tens {{contador}} dia per tornar: torna a iniciar la sessió i tria «Activa el compte»',
  nowComeBack_other: 'Tens {{contador}} dies per tornar: torna a iniciar la sessió i tria «Activa el compte»',
  whatGoesLaterTitle: 'Què s\'esborra si no tornes',
  deactivateButton: 'Elimina el meu compte',
  dialogBodyDesactivar: 'El teu compte deixarà de veure\'s. Si no tornes en 30 dies, s\'esborrarà tot i no ho podràs recuperar.',
  deactivating: 'S\'està desactivant el teu compte…',
  deactivatedTitle: 'El teu compte està desactivat',
  deactivatedBody: 'Tens fins al {{fecha}} per tornar. Després s\'esborrarà tot per sempre.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'El teu compte està desactivat',
  activarBody: 'Vas demanar eliminar el teu compte. Mentre estigui desactivat, ningú no veu els teus perfils ni les teves publicacions.',
  activarDaysLeft_one: 'Queda {{contador}} dia per a l\'esborrament definitiu',
  activarDaysLeft_other: 'Queden {{contador}} dies per a l\'esborrament definitiu',
  activarDate: 'Si no l\'actives, s\'esborrarà per sempre el {{fecha}}.',
  activarCharacterNote: 'L\'autonomia del teu personatge continuarà apagada; la pots tornar a programar quan vulguis.',
  activarButton: 'Activa el compte',
  activating: 'S\'està activant el teu compte…',
  activatedTitle: 'El teu compte torna a estar actiu',
  activarExpiredTitle: 'El termini per tornar s\'ha acabat',
  activarExpiredBody: 'El teu compte s\'esborrarà del tot en les properes hores.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Els {{creditos}} Credits que et queden: es perden i no es retornen',
};
