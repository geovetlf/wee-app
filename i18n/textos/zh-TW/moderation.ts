/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * TAIWÁN, NO UNA CONVERSIÓN: «檢舉», «訊息», «網路連線», «霸凌» y «送出», no lo que
 * saldría de pasar el continental carácter a carácter.
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: '檢舉',
  subtitle: '告訴我們這則內容有什麼問題。',
  chooseReason: '請選擇原因',
  send: '送出檢舉',
  sending: '正在送出檢舉…',
  reasonSpam: '垃圾訊息',
  reasonHarassment: '騷擾或霸凌',
  reasonHate: '仇恨或歧視',
  reasonSexual: '色情內容',
  reasonViolence: '暴力',
  reasonScam: '詐騙或詐欺',
  reasonImpersonation: '冒充他人',
  reasonIllegal: '違法內容',
  reasonSelfHarm: '自殘或自殺',
  reasonOther: '其他原因',
  successTitle: '已收到檢舉',
  successBody: '謝謝你協助我們維護 Weë 的安全。',
  duplicateTitle: '你已經檢舉過了',
  duplicateBody: '我們已經收到你對這則內容的檢舉。',
  errorTitle: '檢舉未能送出。',
  errorBody: '請再試一次。',
  errorOffline: '沒有網路連線，請再試一次。',
  errorRateLimited: '你連續送出了很多檢舉，請稍後再試。',
  errorUnavailable: '這則內容已無法查看。',
};
