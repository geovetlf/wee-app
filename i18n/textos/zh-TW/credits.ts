/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * AQUÍ SE HABLA DE DINERO, ASÍ QUE LA PRECISIÓN MANDA SOBRE LA ELEGANCIA.
 * «餘額» traduce SALDO; la moneda se sigue llamando "Credits" y NUNCA es «積分»,
 * «點數», «點券» ni «信用點». La recarga de prueba dice con todas las letras que
 * no se cobra dinero real (不會產生任何真實付費). Cobrar es «扣除»; calcular o
 * estimar un coste es «計算» / «預計消耗». No se mezclan.
 *
 * TAIWÁN, NO UNA CONVERSIÓN: recargar es «儲值», no «充值»; el saldo de ahora es
 * «目前餘額», no «當前餘額»; el historial es «紀錄», y lo que se está levantando
 * está «建置中».
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: '可用 Credits',
  yourBalance: '我的餘額',
  currentBalance: '目前餘額',
  topUp: '儲值',
  seeHistory: '查看紀錄 →',
  seeHistoryLabel: '查看紀錄',
  history: '紀錄',
  myWallet: '我的錢包',
  earned: '獲得',
  spent: '消耗',
  noMovements: '還沒有任何紀錄',
  balanceAfter: '餘額：{{saldo}}',
  youHaveLabel: '你有 {{saldo}} Credits',
  txPurchase: '購買 Credits',
  txGrant: '收到 Credits',
  txRefund: '退款',
  txUsage: '使用 Credits',
  txRefunded: '已退款',
  txPending: '處理中',
  referenceRate: '參考換算',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits 是 Weë 的使用單位。沒有方案，也沒有 Credits 套組。',
  recentMovements: '最近紀錄',
  purchasesComingSoon: 'Credits 購買功能即將推出。目前還不能在這裡儲值。',
};
