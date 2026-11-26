/*
 * CHINO TRADICIONAL (TAIWÁN) — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = 刪除, la misma palabra que el botón «Eliminar» (common.delete); el chino no tiene mayúsculas. «Cuenta» es 帳號, como en settings.sectionAccount.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: '刪除帳號',
  sectionDanger: '危險區域',
  title: '刪除帳號',
  goesFaces: '你的所有身分：真實檔案和你的分身',
  goesCharacter: '你的角色和它的頭像',
  goesPosts: '你的貼文、留言和互動',
  goesMessages: '你在 WeeTalk 的訊息：內容會被清空，對方的對話中也將不再有這些訊息',
  goesCreations: '你在 Weë AI 的作品、專案和對話',
  goesContacts: '你的聯絡人、社群和收藏',
  goesCredits: '你剩下的 Credits：會失效，不予退還',
  whatStaysTitle: '會保留的內容',
  staysRecords: 'Credits 和付款的會計紀錄。這些紀錄屬於 Weë 的帳務，因此會保留，但不含你的名字和個人檔案資料。',
  confirmLabel: '若要確認，請輸入「{{palabra}}」',
  confirmWord: '刪除',
  confirmPlaceholder: '在這裡輸入',
  dialogTitle: '要刪除你的帳號嗎？',
  dialogConfirm: '刪除',
  doneTitle: '你的帳號已刪除',
  doneBody: '感謝你曾是 Weë 的一份子。',
  reauthTitle: '請重新登入',
  reauthBody: '為了你的安全，刪除帳號前必須最近登入過。請登出，再重新登入，然後重複這些步驟。',
  reauthButton: '登出後重新登入',
  errorTitle: '無法完成',
  errorBody: '中途出了點問題。請再試一次：會從中斷的地方繼續。',
  retry: '再試一次',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: '帳號會被停用，30 天後所有內容都會刪除',
  introDesactivar: '你的帳號現在會被停用；如果你 30 天內沒有回來，所有內容都會被永久刪除。',
  nowTitle: '接下來會怎樣',
  nowHidden: '你的帳號將不再顯示：沒有人能看到你的個人檔案和貼文',
  nowCharacterOff: '你的角色的自主行動會關閉，並停止扣款',
  nowComeBack_one: '你有 {{contador}} 天的時間回來：重新登入並選擇「啟用帳號」',
  nowComeBack_other: '你有 {{contador}} 天的時間回來：重新登入並選擇「啟用帳號」',
  whatGoesLaterTitle: '如果你沒有回來，會刪除的內容',
  deactivateButton: '刪除我的帳號',
  dialogBodyDesactivar: '你的帳號將不再顯示。如果你 30 天內沒有回來，所有內容都會被刪除，而且無法復原。',
  deactivating: '正在停用你的帳號…',
  deactivatedTitle: '你的帳號已停用',
  deactivatedBody: '你可以在 {{fecha}} 前回來。之後所有內容都會被永久刪除。',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: '你的帳號已停用',
  activarBody: '你申請了刪除帳號。停用期間，沒有人能看到你的個人檔案和貼文。',
  activarDaysLeft_one: '距離永久刪除還剩 {{contador}} 天',
  activarDaysLeft_other: '距離永久刪除還剩 {{contador}} 天',
  activarDate: '如果你沒有啟用，它會在 {{fecha}} 被永久刪除。',
  activarCharacterNote: '你的角色的自主行動會維持關閉；你可以隨時重新排程。',
  activarButton: '啟用帳號',
  activating: '正在啟用你的帳號…',
  activatedTitle: '你的帳號已重新啟用',
  activarExpiredTitle: '回來的期限已過',
  activarExpiredBody: '你的帳號會在接下來幾小時內完全刪除。',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '你剩下的 {{creditos}} Credits：會失效，不予退還',
};
