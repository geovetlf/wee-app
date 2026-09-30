/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Aquí se habla de dinero, así que la precisión manda sobre la elegancia.
 * «余额» traduce SALDO; la moneda se sigue llamando "Credits" y NUNCA es «积分»,
 * «点数», «点券» ni «信用点». La recarga de prueba dice con todas las letras que
 * no se cobra dinero real (不会产生任何真实付费). Cobrar es «扣除»; calcular o
 * estimar un coste es «计算» / «预计消耗». No se mezclan.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: '可用 Credits',
  yourBalance: '我的余额',
  currentBalance: '当前余额',
  free: '免费',
  testTopUp: '测试充值',
  testTopUpReady: '测试充值完成',
  testPrices: 'Weë AI 还在建设中，现在是测试价格',
  topUp: '充值',
  seeHistory: '查看记录 →',
  seeHistoryLabel: '查看记录',
  history: '记录',
  myWallet: '我的钱包',
  earned: '获得',
  spent: '消耗',
  noMovements: '还没有任何记录',
  testTopUpDone: '已向你的账户充入 {{cantidad}} Credits。这是测试充值，不会产生任何真实付费。',
  balanceAfter: '余额：{{saldo}}',
  topUpFailed: '充值没能完成，请再试一次。',
  terms: '测试充值：现在不会向你收取任何真实费用。正式价格要等 Weë AI 用上真实的 AI 之后才会确定；在那之前，每次创作都会在开始前告诉你测试价格。',
  youHaveLabel: '你有 {{saldo}} Credits',
  topUpButton: '充值 {{cantidad}} Credits · 测试',
  txPurchase: '购买 Credits',
  txGrant: '收到 Credits',
  txRefund: '退还',
  txUsage: '使用 Credits',
  txRefunded: '已退还',
  txPending: '处理中',
  pkgBasic: '基础',
  badgePopular: '热门',
  badgeBestValue: '最划算',
  purchasesComingSoon: 'Credits 购买功能即将上线。目前还不能在这里充值。',
  topUpFailedTitle: '哎呀',
};
