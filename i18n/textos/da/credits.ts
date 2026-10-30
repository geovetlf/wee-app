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
 * «Mi billetera» es «Min tegnebog». Weë no tiene planes ni paquetes de Credits
 * (2026-10-29): la nota de la conversión dice «abonnementer» y «pakker», solo
 * para decir que no existen; «Últimos movimientos» es «Seneste bevægelser»,
 * la misma palabra de los extractos que «Ingen bevægelser endnu».
 *
 * `balanceAfter` («Saldo: {{saldo}}») se escribe igual que en español: es la
 * palabra danesa.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Tilgængelige Credits',
  yourBalance: 'Din saldo',
  currentBalance: 'Aktuel saldo',
  topUp: 'Tank op',
  seeHistory: 'Vis historik →',
  seeHistoryLabel: 'Vis historik',
  history: 'Historik',
  myWallet: 'Min tegnebog',
  earned: 'Modtaget',
  spent: 'Brugt',
  noMovements: 'Ingen bevægelser endnu',
  balanceAfter: 'Saldo: {{saldo}}',
  youHaveLabel: 'Du har {{saldo}} Credits',
  txPurchase: 'Køb af Credits',
  txGrant: 'Modtagne Credits',
  txRefund: 'Refundering',
  txUsage: 'Brug af Credits',
  txRefunded: 'Refunderet',
  txPending: 'Behandles',
  referenceRate: 'Referenceomregning',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits er forbrugsenheden i Weë. Der er ingen abonnementer eller pakker med Credits.',
  recentMovements: 'Seneste bevægelser',
  purchasesComingSoon: 'Snart kan du købe Credits. Indtil videre kan du ikke tanke op her.',
};
