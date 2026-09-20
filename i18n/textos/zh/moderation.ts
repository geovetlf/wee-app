/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Chino SIMPLIFICADO, continental: «举报», «内容», «网络».
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: '举报',
  subtitle: '告诉我们这条内容有什么问题。',
  chooseReason: '请选择原因',
  send: '提交举报',
  sending: '正在提交举报…',
  reasonSpam: '垃圾信息',
  reasonHarassment: '骚扰或欺凌',
  reasonHate: '仇恨或歧视',
  reasonSexual: '色情内容',
  reasonViolence: '暴力',
  reasonScam: '诈骗或欺诈',
  reasonImpersonation: '冒充他人',
  reasonIllegal: '违法内容',
  reasonSelfHarm: '自残或自杀',
  reasonOther: '其他原因',
  successTitle: '已收到举报',
  successBody: '感谢你帮助我们维护 Weë 的安全。',
  duplicateTitle: '你已经举报过了',
  duplicateBody: '我们已经收到你对这条内容的举报。',
  errorTitle: '举报未能提交。',
  errorBody: '请再试一次。',
  errorOffline: '没有网络连接，请再试一次。',
  errorRateLimited: '你连续提交了很多举报，请稍后再试。',
  errorUnavailable: '这条内容已无法查看。',
};
