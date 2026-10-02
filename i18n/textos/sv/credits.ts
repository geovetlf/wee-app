/*
 * SUECO — Credits: el saldo, la recarga de prueba y el historial. "Credits" es
 * marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los
 * cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» no se traduce, no se declina y no cambia con la cifra: nunca
 * «krediter» (glosario § 9.1). Lo que habría que declinar lo lleva otra
 * palabra: la compra es «Köp av Credits» y el uso, «Användning av Credits».
 *
 * El saldo es «saldo», como en los bancos suecos. Recargar es «fylla på» y la
 * recarga, «påfyllning»; la de prueba, «testpåfyllning», y cada frase que la
 * nombra dice que no se cobró nada («inga pengar har dragits»). El reembolso
 * es «återbetalning». «Obtenidos» y «Usados», bajo las cifras de la cartera,
 * son «Mottagna» y «Använda»: «Intjänade» diría que se ganaron, y ahí también
 * cuentan los de bienvenida y los comprados. «Mottagna» es la misma palabra
 * que `txGrant`. Los estados de un movimiento van en neutro («Återbetalt»).
 *
 * «Ups» es «Hoppsan», sin exclamación: es el título de un fallo (guía § 2).
 * «Mi billetera» es «Min plånbok»; «Básico», «Bas», como los planes suecos
 * («Bas», «Plus», «Premium»); «Mejor valor», «Mest för pengarna». Los nombres
 * de los otros paquetes («Plus», «Black Pro») no pasan por aquí.
 *
 * `balanceAfter` («Saldo: {{saldo}}») y `free` («Gratis») se escriben igual
 * que en español: son las palabras suecas.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Tillgängliga Credits',
  yourBalance: 'Ditt saldo',
  currentBalance: 'Aktuellt saldo',
  free: 'Gratis',
  testTopUp: 'Testpåfyllning',
  testTopUpReady: 'Testpåfyllningen är klar',
  testPrices: 'Testpriser medan vi bygger Weë AI',
  topUp: 'Fyll på',
  seeHistory: 'Visa historik →',
  seeHistoryLabel: 'Visa historik',
  history: 'Historik',
  myWallet: 'Min plånbok',
  earned: 'Mottagna',
  spent: 'Använda',
  noMovements: 'Inga transaktioner ännu',
  testTopUpDone: '{{cantidad}} Credits har lagts till på ditt konto. Det är en testpåfyllning, så inga pengar har dragits.',
  balanceAfter: 'Saldo: {{saldo}}',
  topUpFailed: 'Det gick inte att slutföra påfyllningen. Försök igen.',
  terms: 'Det här är en testpåfyllning – inga pengar dras ännu. De slutliga priserna kommer när Weë AI använder riktiga AI-modeller. Fram till dess ser du testkostnaden för varje skapelse innan du börjar.',
  youHaveLabel: 'Du har {{saldo}} Credits',
  topUpButton: 'Fyll på {{cantidad}} Credits · test',
  txPurchase: 'Köp av Credits',
  txGrant: 'Mottagna Credits',
  txRefund: 'Återbetalning',
  txUsage: 'Användning av Credits',
  txRefunded: 'Återbetalt',
  txPending: 'Behandlas',
  pkgBasic: 'Bas',
  badgePopular: 'Populär',
  badgeBestValue: 'Mest för pengarna',
  purchasesComingSoon: 'Snart kan du köpa Credits. Just nu går det inte att fylla på här.',
  topUpFailedTitle: 'Hoppsan',
};
