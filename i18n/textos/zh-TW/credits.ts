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
  free: '免費',
  testTopUp: '測試儲值',
  testTopUpReady: '測試儲值完成',
  testPrices: 'Weë AI 還在建置中，目前是測試價格',
  topUp: '儲值',
  seeHistory: '查看紀錄 →',
  seeHistoryLabel: '查看紀錄',
  history: '紀錄',
  myWallet: '我的錢包',
  earned: '獲得',
  spent: '消耗',
  noMovements: '還沒有任何紀錄',
  testTopUpDone: '已將 {{cantidad}} Credits 存入你的帳戶。這是測試儲值，不會產生任何真實付費。',
  balanceAfter: '餘額：{{saldo}}',
  topUpFailed: '儲值沒能完成，請再試一次。',
  terms: '測試儲值：現在不會向你收取任何真實費用。正式價格要等 Weë AI 用上真實的 AI 之後才會確定；在那之前，每次創作都會在開始前告訴你測試價格。',
  youHaveLabel: '你有 {{saldo}} Credits',
  topUpButton: '儲值 {{cantidad}} Credits · 測試',
  txPurchase: '購買 Credits',
  txGrant: '收到 Credits',
  txRefund: '退款',
  txUsage: '使用 Credits',
  txRefunded: '已退款',
  txPending: '處理中',
  pkgBasic: '基本',
  badgePopular: '熱門',
  badgeBestValue: '最划算',
};
