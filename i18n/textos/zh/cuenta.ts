/*
 * CHINO SIMPLIFICADO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = 删除, la misma palabra que el botón «Eliminar» (common.delete); el chino no tiene mayúsculas. «Cuenta» es 账号, como en settings.sectionAccount.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: '删除账号',
  sectionDanger: '危险区域',
  title: '删除账号',
  goesFaces: '你的所有身份：真实主页和你的分身',
  goesCharacter: '你的角色及其头像',
  goesPosts: '你的帖子、评论和互动',
  goesMessages: '你在 WeeTalk 的消息：内容会被清空，对方的对话中也将不再有这些消息',
  goesCreations: '你在 Weë AI 的作品、项目和对话',
  goesContacts: '你的联系人、社区和收藏',
  goesCredits: '你剩余的 Credits：将作废，不予退还',
  whatStaysTitle: '会保留的内容',
  staysRecords: 'Credits 和付款的会计记录。这些记录属于 Weë 的账目，因此会保留，但不含你的名字和个人资料信息。',
  confirmLabel: '如需确认，请输入“{{palabra}}”',
  confirmWord: '删除',
  confirmPlaceholder: '在此输入',
  dialogTitle: '要删除你的账号吗？',
  dialogConfirm: '删除',
  doneTitle: '你的账号已删除',
  doneBody: '感谢你曾是 Weë 的一员。',
  reauthTitle: '请重新登录',
  reauthBody: '为了你的安全，删除账号前需要最近登录过。请退出登录，再重新登录，然后重复这些步骤。',
  reauthButton: '退出登录后重新登录',
  errorTitle: '未能完成',
  errorBody: '中途出了点问题。请再试一次：将从中断的地方继续。',
  retry: '再试一次',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: '账号将被停用，30 天后所有内容都会被删除',
  introDesactivar: '你的账号现在会被停用；如果你 30 天内不回来，所有内容都将被永久删除。',
  nowTitle: '接下来会怎样',
  nowHidden: '你的账号将不再可见：没有人能看到你的主页和帖子',
  nowCharacterOff: '你的角色的自主行动会关闭，并停止扣费',
  nowComeBack_one: '你有 {{contador}} 天时间回来：重新登录并选择“激活账号”',
  nowComeBack_other: '你有 {{contador}} 天时间回来：重新登录并选择“激活账号”',
  whatGoesLaterTitle: '如果你不回来，将被删除的内容',
  deactivateButton: '删除我的账号',
  dialogBodyDesactivar: '你的账号将不再可见。如果你 30 天内不回来，所有内容都将被删除，且无法恢复。',
  deactivating: '正在停用你的账号…',
  deactivatedTitle: '你的账号已停用',
  deactivatedBody: '你可以在 {{fecha}} 前回来。之后所有内容都将被永久删除。',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: '你的账号已停用',
  activarBody: '你申请了删除账号。在停用期间，没有人能看到你的主页和帖子。',
  activarDaysLeft_one: '距离永久删除还剩 {{contador}} 天',
  activarDaysLeft_other: '距离永久删除还剩 {{contador}} 天',
  activarDate: '如果你不激活，它将于 {{fecha}} 被永久删除。',
  activarCharacterNote: '你的角色的自主行动会保持关闭；你可以随时重新设定。',
  activarButton: '激活账号',
  activating: '正在激活你的账号…',
  activatedTitle: '你的账号已重新激活',
  activarExpiredTitle: '返回期限已过',
  activarExpiredBody: '你的账号将在接下来的几小时内被彻底删除。',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '你剩余的 {{creditos}} Credits：将作废，不予退还',
};
