/*
 * Credits: el saldo, la recarga y el historial. "Credits" es marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Aquí se habla de dinero, y cada frase deja claro si se cobra o no. «잔액»
 * traduce SALDO; la moneda se sigue llamando "Credits", nunca «크레딧» ni
 * «크레디트». La recarga de prueba dice con todas las letras que no se cobra
 * dinero real (실제 돈은 청구되지 않아요). Cobrar es «차감»; calcular o estimar
 * un coste es «계산» / «예상 비용». No se mezclan.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: '사용 가능한 Credits',
  yourBalance: '내 잔액',
  currentBalance: '현재 잔액',
  free: '무료',
  testTopUp: '테스트 충전',
  testTopUpReady: '테스트 충전 완료',
  testPrices: 'Weë AI를 만드는 동안에는 테스트 가격이에요',
  topUp: '충전',
  seeHistory: '내역 보기 →',
  seeHistoryLabel: '내역 보기',
  history: '내역',
  myWallet: '내 지갑',
  earned: '받음',
  spent: '사용',
  noMovements: '아직 내역이 없어요',
  testTopUpDone: '{{cantidad}} Credits를 계정에 넣어드렸어요. 테스트 충전이라 실제 돈은 청구되지 않았어요.',
  balanceAfter: '잔액: {{saldo}}',
  topUpFailed: '충전을 완료하지 못했어요. 다시 시도해 주세요.',
  terms: '테스트 충전이에요: 아직 실제 돈은 청구되지 않아요. 최종 가격은 Weë AI가 진짜 AI를 쓰기 시작할 때 정해져요. 그때까지는 만들기 전에 테스트 비용을 미리 보여드려요.',
  youHaveLabel: 'Credits 잔액 {{saldo}}',
  topUpButton: '{{cantidad}} Credits 충전 · 테스트',
  txPurchase: 'Credits 구매',
  txGrant: 'Credits 받음',
  txRefund: '환불',
  txUsage: 'Credits 사용',
  txRefunded: '환불됨',
  txPending: '진행 중',
  pkgBasic: '베이직',
  badgePopular: '인기',
  badgeBestValue: '가장 알뜰',
};
