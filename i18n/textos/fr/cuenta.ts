/*
 * FRANÇAIS — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Tutoiement et apostrophe typographique, comme le reste du dictionnaire. «encargo» = «commande», le mot que la fiche utilisait déjà.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Supprimer le compte',
  sectionDanger: 'Zone de danger',
  title: 'Supprimer le compte',
  goesFaces: 'Tous tes profils : ton Profil Réel et tes alter ego',
  goesCharacter: 'Ton personnage et son avatar',
  goesPosts: 'Tes publications, commentaires et réactions',
  goesMessages: 'Tes messages WeeTalk : ils sont vidés, et la conversation de l’autre personne reste sans eux',
  goesCreations: 'Tes créations, projets et conversations Weë AI',
  goesContacts: 'Tes contacts, tes communautés et tes éléments enregistrés',
  goesCredits: 'Les Credits qu’il te reste : ils sont perdus et ne sont pas remboursés',
  whatStaysTitle: 'Ce qui est conservé',
  staysRecords: 'Les registres comptables des Credits et des paiements. Ils sont conservés sans ton nom ni les données de ton profil, car ce sont les comptes de Weë.',
  confirmLabel: 'Pour confirmer, écris « {{palabra}} »',
  confirmWord: 'SUPPRIMER',
  confirmPlaceholder: 'Écris le mot ici',
  dialogTitle: 'Supprimer ton compte ?',
  dialogConfirm: 'Supprimer',
  doneTitle: 'Ton compte a été supprimé',
  doneBody: 'Merci d’avoir fait partie de Weë.',
  reauthTitle: 'Reconnecte-toi',
  reauthBody: 'Par sécurité, pour supprimer ton compte, tu dois t’être connecté récemment. Déconnecte-toi, reconnecte-toi et refais ces étapes.',
  reauthButton: 'Se déconnecter pour se reconnecter',
  errorTitle: 'Impossible de terminer',
  errorBody: 'Quelque chose a échoué en cours de route. Réessaie : ça reprendra là où ça s’est arrêté.',
  retry: 'Réessayer',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Il est désactivé et, au bout de 30 jours, tout est effacé',
  introDesactivar: 'Ton compte est désactivé dès maintenant et, si tu ne reviens pas dans les 30 jours, tout est effacé pour toujours.',
  nowTitle: 'Ce qui se passe maintenant',
  nowHidden: 'Ton compte n’est plus visible : personne ne verra tes profils ni tes publications',
  nowCharacterOff: 'L’autonomie de ton personnage s’arrête et ne coûte plus rien',
  nowComeBack_one: 'Tu as {{contador}} jour pour revenir : reconnecte-toi et choisis « Réactiver le compte »',
  nowComeBack_other: 'Tu as {{contador}} jours pour revenir : reconnecte-toi et choisis « Réactiver le compte »',
  whatGoesLaterTitle: 'Ce qui est effacé si tu ne reviens pas',
  deactivateButton: 'Supprimer mon compte',
  dialogBodyDesactivar: 'Ton compte ne sera plus visible. Si tu ne reviens pas dans les 30 jours, tout sera effacé et tu ne pourras pas le récupérer.',
  deactivating: 'Désactivation de ton compte…',
  deactivatedTitle: 'Ton compte est désactivé',
  deactivatedBody: 'Tu as jusqu’au {{fecha}} pour revenir. Ensuite, tout sera effacé pour toujours.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Ton compte est désactivé',
  activarBody: 'Tu as demandé à supprimer ton compte. Tant qu’il est désactivé, personne ne voit tes profils ni tes publications.',
  activarDaysLeft_one: 'Il reste {{contador}} jour avant la suppression définitive',
  activarDaysLeft_other: 'Il reste {{contador}} jours avant la suppression définitive',
  activarDate: 'Si tu ne le réactives pas, il sera effacé pour toujours le {{fecha}}.',
  activarCharacterNote: 'L’autonomie de ton personnage restera arrêtée ; tu pourras la reprogrammer quand tu voudras.',
  activarButton: 'Réactiver le compte',
  activating: 'Réactivation de ton compte…',
  activatedTitle: 'Ton compte est de nouveau actif',
  activarExpiredTitle: 'Le délai pour revenir est terminé',
  activarExpiredBody: 'Ton compte sera entièrement effacé dans les prochaines heures.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Les {{creditos}} Credits qu’il te reste : ils sont perdus et ne sont pas remboursés',
};
