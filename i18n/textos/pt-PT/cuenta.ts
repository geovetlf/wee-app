/*
 * PORTUGUÊS EUROPEU — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Norma europeia com «tu» e «a personagem», como o resto do dicionário pt-PT. «encargo» = «encomenda».
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Eliminar conta',
  sectionDanger: 'Zona de perigo',
  title: 'Eliminar conta',
  goesFaces: 'Todos os teus perfis: o teu Perfil Real e os teus alter egos',
  goesCharacter: 'A tua personagem e o avatar dela',
  goesPosts: 'As tuas publicações, comentários e reações',
  goesMessages: 'As tuas mensagens do WeeTalk: são esvaziadas, e a conversa da outra pessoa fica sem elas',
  goesCreations: 'As tuas criações, projetos e conversas do Weë AI',
  goesContacts: 'Os teus contactos, comunidades e guardados',
  goesCredits: 'Os Credits que te restarem: perdem-se e não são devolvidos',
  whatStaysTitle: 'O que se mantém',
  staysRecords: 'Os registos contabilísticos de Credits e pagamentos. São guardados sem o teu nome nem os dados do teu perfil, porque são a contabilidade do Weë.',
  confirmLabel: 'Para confirmar, escreve “{{palabra}}”',
  confirmWord: 'ELIMINAR',
  confirmPlaceholder: 'Escreve a palavra aqui',
  dialogTitle: 'Eliminar a tua conta?',
  dialogConfirm: 'Eliminar',
  doneTitle: 'A tua conta foi eliminada',
  doneBody: 'Obrigado por teres feito parte do Weë.',
  reauthTitle: 'Inicia sessão de novo',
  reauthBody: 'Por segurança, para eliminar a conta tens de ter iniciado sessão há pouco tempo. Termina sessão, volta a entrar e repete estes passos.',
  reauthButton: 'Terminar sessão para voltar a entrar',
  errorTitle: 'Não foi possível concluir',
  errorBody: 'Algo falhou a meio do caminho. Tenta de novo: vai retomar onde ficou.',
  retry: 'Tenta de novo',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'É desativada e, ao fim de 30 dias, tudo é apagado',
  introDesactivar: 'A tua conta é desativada agora e, se não voltares em 30 dias, tudo é apagado para sempre.',
  nowTitle: 'O que acontece agora',
  nowHidden: 'A tua conta deixa de estar visível: ninguém verá os teus perfis nem as tuas publicações',
  nowCharacterOff: 'A autonomia da tua personagem é desligada e deixa de cobrar',
  nowComeBack_one: 'Tens {{contador}} dia para voltar: inicia sessão de novo e escolhe “Reativar conta”',
  nowComeBack_other: 'Tens {{contador}} dias para voltar: inicia sessão de novo e escolhe “Reativar conta”',
  whatGoesLaterTitle: 'O que é apagado se não voltares',
  deactivateButton: 'Eliminar a minha conta',
  dialogBodyDesactivar: 'A tua conta deixará de estar visível. Se não voltares em 30 dias, tudo será apagado e não o poderás recuperar.',
  deactivating: 'A desativar a tua conta…',
  deactivatedTitle: 'A tua conta está desativada',
  deactivatedBody: 'Tens até {{fecha}} para voltar. Depois, tudo será apagado para sempre.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'A tua conta está desativada',
  activarBody: 'Pediste para eliminar a tua conta. Enquanto estiver desativada, ninguém vê os teus perfis nem as tuas publicações.',
  activarDaysLeft_one: 'Falta {{contador}} dia para a eliminação definitiva',
  activarDaysLeft_other: 'Faltam {{contador}} dias para a eliminação definitiva',
  activarDate: 'Se não a reativares, será apagada para sempre a {{fecha}}.',
  activarCharacterNote: 'A autonomia da tua personagem continuará desligada; podes voltar a programá-la quando quiseres.',
  activarButton: 'Reativar conta',
  activating: 'A reativar a tua conta…',
  activatedTitle: 'A tua conta está novamente ativa',
  activarExpiredTitle: 'O prazo para voltar terminou',
  activarExpiredBody: 'A tua conta será apagada por completo nas próximas horas.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Os {{creditos}} Credits que te restam: perdem-se e não são devolvidos',
};
