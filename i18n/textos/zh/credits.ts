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
  topUp: '充值',
  seeHistory: '查看记录 →',
  seeHistoryLabel: '查看记录',
  history: '记录',
  myWallet: '我的钱包',
  earned: '获得',
  spent: '消耗',
  noMovements: '还没有任何记录',
  balanceAfter: '余额：{{saldo}}',
  youHaveLabel: '你有 {{saldo}} Credits',
  txPurchase: '购买 Credits',
  txGrant: '收到 Credits',
  txRefund: '退还',
  txUsage: '使用 Credits',
  txRefunded: '已退还',
  txPending: '处理中',
  referenceRate: '参考换算',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits 是 Weë 的使用单位。没有套餐，也没有 Credits 礼包。',
  recentMovements: '最近记录',
  purchasesComingSoon: 'Credits 购买功能即将上线。目前还不能在这里充值。',
};
