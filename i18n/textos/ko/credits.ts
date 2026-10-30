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
  topUp: '충전',
  seeHistory: '내역 보기 →',
  seeHistoryLabel: '내역 보기',
  history: '내역',
  myWallet: '내 지갑',
  earned: '받음',
  spent: '사용',
  noMovements: '아직 내역이 없어요',
  balanceAfter: '잔액: {{saldo}}',
  youHaveLabel: 'Credits 잔액 {{saldo}}',
  txPurchase: 'Credits 구매',
  txGrant: 'Credits 받음',
  txRefund: '환불',
  txUsage: 'Credits 사용',
  txRefunded: '환불됨',
  txPending: '진행 중',
  referenceRate: '기준 환산율',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits는 Weë의 사용 단위예요. 요금제나 Credits 패키지는 없어요.',
  recentMovements: '최근 내역',
  purchasesComingSoon: 'Credits 구매는 곧 가능해져요. 지금은 여기서 충전할 수 없어요.',
};
