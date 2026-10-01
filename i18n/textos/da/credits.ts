/*
 * DANÉS — Credits: el saldo, la recarga de prueba y el historial. "Credits" es
 * marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los
 * cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» no se traduce, no se declina y no cambia con la cifra: nunca
 * «kreditter» (glosario § 9.1). Lo que habría que declinar lo lleva otra
 * palabra: la compra es «Køb af Credits» y el uso, «Brug af Credits».
 *
 * Todo sale de la fila «Credits y dinero» del glosario (§ 9.6): el saldo es
 * «saldo» (en saldo → «din saldo»); recargar, «Tank op», y la recarga,
 * «optankning»; la de prueba, «testoptankning», y cada frase que la nombra dice
 * que no se cobró nada («der er ikke trukket nogen penge»). El reembolso es
 * «refundering» y su estado, «Refunderet». «Obtenidos» y «Usados», bajo las
 * cifras de la cartera, son «Modtaget» y «Brugt» (§ 9.6): «Optjent» diría que
 * se ganaron, y ahí también cuentan los de bienvenida y los comprados.
 * «Sin movimientos» es «Ingen bevægelser endnu», la palabra de los extractos
 * bancarios daneses (kontobevægelser).
 *
 * «Ups» es «Hovsa», sin exclamación: es el título de un fallo (§ 9.5). «Mi
 * billetera» es «Min tegnebog»; «Básico», «Basis»; «Mejor valor», «Mest for
 * pengene». Los nombres de los otros paquetes («Plus», «Black Pro») no pasan
 * por aquí.
 *
 * `balanceAfter` («Saldo: {{saldo}}») y `free` («Gratis») se escriben igual
 * que en español: son las palabras danesas.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Tilgængelige Credits',
  yourBalance: 'Din saldo',
  currentBalance: 'Aktuel saldo',
  free: 'Gratis',
  testTopUp: 'Testoptankning',
  testTopUpReady: 'Testoptankningen er klar',
  testPrices: 'Testpriser, mens vi bygger Weë AI',
  topUp: 'Tank op',
  seeHistory: 'Vis historik →',
  seeHistoryLabel: 'Vis historik',
  history: 'Historik',
  myWallet: 'Min tegnebog',
  earned: 'Modtaget',
  spent: 'Brugt',
  noMovements: 'Ingen bevægelser endnu',
  testTopUpDone: '{{cantidad}} Credits er føjet til din konto. Det er en testoptankning, så der er ikke trukket nogen penge.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Optankningen kunne ikke gennemføres. Prøv igen.',
  terms: 'Det er en testoptankning, så der trækkes ingen penge endnu. De endelige priser kommer, når Weë AI bruger rigtige AI-modeller. Indtil da kan du se testprisen på hver kreation, før du går i gang.',
  youHaveLabel: 'Du har {{saldo}} Credits',
  topUpButton: 'Tank op med {{cantidad}} Credits · test',
  txPurchase: 'Køb af Credits',
  txGrant: 'Modtagne Credits',
  txRefund: 'Refundering',
  txUsage: 'Brug af Credits',
  txRefunded: 'Refunderet',
  txPending: 'Behandles',
  pkgBasic: 'Basis',
  badgePopular: 'Populær',
  badgeBestValue: 'Mest for pengene',
  purchasesComingSoon: 'Snart kan du købe Credits. Indtil videre kan du ikke tanke op her.',
  topUpFailedTitle: 'Hovsa',
};
