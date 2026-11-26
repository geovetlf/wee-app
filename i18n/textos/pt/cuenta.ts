/*
 * PORTUGUÊS DO BRASIL — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * Norma brasileira com «você», como todo o dicionário pt. «Excluir» é o common.delete; «encargo» = «pedido».
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: 'Excluir conta',
  sectionDanger: 'Zona de perigo',
  title: 'Excluir conta',
  goesFaces: 'Todos os seus perfis: seu Perfil Real e seus alter egos',
  goesCharacter: 'Seu personagem e o avatar dele',
  goesPosts: 'Suas publicações, comentários e reações',
  goesMessages: 'Suas mensagens do WeeTalk: elas são esvaziadas, e a conversa da outra pessoa fica sem elas',
  goesCreations: 'Suas criações, projetos e conversas do Weë AI',
  goesContacts: 'Seus contatos, comunidades e itens salvos',
  goesCredits: 'Os Credits que sobrarem: eles se perdem e não são devolvidos',
  whatStaysTitle: 'O que é mantido',
  staysRecords: 'Os registros contábeis de Credits e pagamentos. Eles são guardados sem o seu nome nem os dados do seu perfil, porque são a contabilidade do Weë.',
  confirmLabel: 'Para confirmar, digite “{{palabra}}”',
  confirmWord: 'EXCLUIR',
  confirmPlaceholder: 'Digite a palavra aqui',
  dialogTitle: 'Excluir sua conta?',
  dialogConfirm: 'Excluir',
  doneTitle: 'Sua conta foi excluída',
  doneBody: 'Obrigado por ter feito parte do Weë.',
  reauthTitle: 'Entre de novo',
  reauthBody: 'Por segurança, para excluir a conta você precisa ter entrado há pouco tempo. Saia, entre de novo e repita estes passos.',
  reauthButton: 'Sair para entrar de novo',
  errorTitle: 'Não foi possível terminar',
  errorBody: 'Algo falhou no meio do caminho. Tente de novo: vai continuar de onde parou.',
  retry: 'Tente de novo',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: 'Ela é desativada e, depois de 30 dias, tudo é apagado',
  introDesactivar: 'Sua conta é desativada agora e, se você não voltar em 30 dias, tudo será apagado para sempre.',
  nowTitle: 'O que acontece agora',
  nowHidden: 'Sua conta deixa de aparecer: ninguém verá seus perfis nem suas publicações',
  nowCharacterOff: 'A autonomia do seu personagem é desligada e deixa de cobrar',
  nowComeBack_one: 'Você tem {{contador}} dia para voltar: entre de novo e escolha “Reativar conta”',
  nowComeBack_other: 'Você tem {{contador}} dias para voltar: entre de novo e escolha “Reativar conta”',
  whatGoesLaterTitle: 'O que é apagado se você não voltar',
  deactivateButton: 'Excluir minha conta',
  dialogBodyDesactivar: 'Sua conta vai deixar de aparecer. Se você não voltar em 30 dias, tudo será apagado e você não poderá recuperar.',
  deactivating: 'Desativando sua conta…',
  deactivatedTitle: 'Sua conta está desativada',
  deactivatedBody: 'Você tem até {{fecha}} para voltar. Depois disso, tudo será apagado para sempre.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: 'Sua conta está desativada',
  activarBody: 'Você pediu para excluir sua conta. Enquanto ela estiver desativada, ninguém vê seus perfis nem suas publicações.',
  activarDaysLeft_one: 'Falta {{contador}} dia para a exclusão definitiva',
  activarDaysLeft_other: 'Faltam {{contador}} dias para a exclusão definitiva',
  activarDate: 'Se você não reativar, ela será apagada para sempre em {{fecha}}.',
  activarCharacterNote: 'A autonomia do seu personagem vai continuar desligada; você pode programá-la de novo quando quiser.',
  activarButton: 'Reativar conta',
  activating: 'Reativando sua conta…',
  activatedTitle: 'Sua conta está ativa de novo',
  activarExpiredTitle: 'O prazo para voltar terminou',
  activarExpiredBody: 'Sua conta será apagada por completo nas próximas horas.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: 'Os {{creditos}} Credits que sobraram: eles se perdem e não são devolvidos',
};
