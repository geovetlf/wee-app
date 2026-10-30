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
 * «Mi billetera» es «Min plånbok». Weë no tiene planes ni paquetes de Credits
 * (2026-10-29): la nota de la conversión dice «abonnemang» y «paket», las
 * palabras que una persona sueca esperaría ver si existieran.
 *
 * `balanceAfter` («Saldo: {{saldo}}») se escribe igual que en español: es la
 * palabra sueca.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Tillgängliga Credits',
  yourBalance: 'Ditt saldo',
  currentBalance: 'Aktuellt saldo',
  topUp: 'Fyll på',
  seeHistory: 'Visa historik →',
  seeHistoryLabel: 'Visa historik',
  history: 'Historik',
  myWallet: 'Min plånbok',
  earned: 'Mottagna',
  spent: 'Använda',
  noMovements: 'Inga transaktioner ännu',
  balanceAfter: 'Saldo: {{saldo}}',
  youHaveLabel: 'Du har {{saldo}} Credits',
  txPurchase: 'Köp av Credits',
  txGrant: 'Mottagna Credits',
  txRefund: 'Återbetalning',
  txUsage: 'Användning av Credits',
  txRefunded: 'Återbetalt',
  txPending: 'Behandlas',
  referenceRate: 'Referensomräkning',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits är förbrukningsenheten i Weë. Det finns inga abonnemang eller paket med Credits.',
  recentMovements: 'Senaste transaktioner',
  purchasesComingSoon: 'Snart kan du köpa Credits. Just nu går det inte att fylla på här.',
};
