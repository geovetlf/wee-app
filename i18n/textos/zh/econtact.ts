/*
 * CHINO SIMPLIFICADO — ËContact y ẄContact. Los dos nombres son marca —cambian
 * con el perfil activo— y entran como valor. No se traducen, no se transliteran
 * y no se cambian por la palabra común que significan: ËContact no es 联系人.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `{{lista}}` es el nombre de la agenda (siempre alfabeto latino), `{{nombre}}`
 * el de una persona y `{{etiqueta}}` el del perfil. Como los tres llegan en
 * latino, llevan UN espacio a cada lado dentro del hanzi, que es la norma.
 *
 * ── `count` NO TIENE PLURAL, PORQUE EL CHINO NO LO TIENE ────────────────────
 *
 * `Intl.PluralRules('zh')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. El español escribía «1 {{lista}}» con un
 * 1 fijo; aquí las dos formas dicen lo MISMO y las dos llevan el contador, con
 * 人, que es el que cuenta personas.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: '收到的请求',
  requestsSent: '发出的请求',
  yours: '你的 {{lista}}',
  yoursWhenYouSignIn: '登录后查看你的 {{lista}}',
  yoursWhenYouSignInSubtitle: '{{lista}} 保存着你在 Weë 建立的连接。登录就能看到。',
  noneYet: '你还没有 {{lista}} 连接',
  noneYetSubtitle: '这里会聚起你在 Weë 认识的人。连接要两个人一起完成：一个人发起，另一个人接受。',
  noAgenda: '这个主页没有通讯录',
  noAgendaSubtitle: '{{lista}} 里放着你和别人的连接。切换到真实主页或 Weë 主页就能看到。',
  wantsToConnect: '{{lista}} · 想和你建立连接',
  accept: '接受 {{nombre}}',
  reject: '拒绝 {{nombre}}',
  withdraw: '撤回发给 {{nombre}} 的请求',
  removeFrom: '把 {{nombre}} 从你的 {{lista}} 中移除',
  openProfile: '打开 {{nombre}} 的 {{etiqueta}}',
  rejectTitle: '拒绝请求',
  rejectConfirm: '要拒绝 {{nombre}} 的请求吗？',
  withdrawTitle: '撤回请求',
  withdrawConfirm: '要撤回发给 {{nombre}} 的请求吗？',
  removeTitle: '移除 {{lista}}',
  removeConfirm: '要把 {{nombre}} 从你的 {{lista}} 中移除吗？',
  failed: '操作没能完成',
  count_one: '{{lista}} {{contador}} 人',
  count_other: '{{lista}} {{contador}} 人',
  somePerson: '这个人',
  acceptLabel: '接受 {{lista}}',
  rejectRequestLabel: '拒绝 {{lista}} 请求',
  requestSent: '请求已发送',
  errSignIn: '登录后才能使用 ËContact。',
  errNotYours: '这不是你的主页。',
  errNotAPerson: '这个主页不能使用 ËContact。',
  errSameProfile: '主页不能和自己建立连接。',
  errOffline: '没能连上 Weë。',
  errNoRequestToReject: '没有可以拒绝的请求。',
  errNoPendingRequest: '你和这个主页之间没有待处理的请求。',
  errNotConnected: '你还没有和这个主页建立连接。',
  errNoActiveProfile: '当前没有可以用来执行这个操作的主页。',
};
