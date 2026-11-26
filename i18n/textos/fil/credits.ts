/*
 * FILIPINO — Credits: el saldo, la recarga de prueba y el historial. «Credits» es marca y no se traduce; todo lo que
 * lo rodea, sí. Ni los precios ni los cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» no se traduce, no lleva afijos ni «mga» delante y no cambia con la cifra (§ 6): «May {{saldo}} Credits
 * ka», «Available na Credits», «Pagbili ng Credits». La cifra que lo precede no lleva enlace (§ 8.3, regla 7).
 *
 * Todo sale de la fila «Credits» del glosario (§ 11.9): el saldo es «balanse» («Balanse mo», «Kasalukuyang
 * balanse»); recargar, «Mag-top up», y la recarga, «top-up»; la de prueba, «pansubok na top-up», y cada frase que la
 * nombra dice que no se cobró nada («walang siningil»). El reembolso es «Refund» y su estado, «Na-refund»; «En
 * proceso», «Pinoproseso pa» (§ 11.4). «Obtenidos» y «Usados», bajo las cifras de la billetera, son «Natanggap» y
 * «Nagamit»: ahí cuentan también los de bienvenida, que no se «ganan». «Sin movimientos» es «Wala pang transaksyon».
 * El historial es «History» como título y «history» dentro de una frase («Tingnan ang history →»); «Mi billetera»,
 * «Wallet ko», con el posesivo detrás, como «Mga proyekto ko».
 *
 * «Ups» es «Naku», sin exclamación: es el título de un fallo (§ 11.5, § 14). «Básico» es «Basic»; «Popular» se
 * escribe igual porque es la palabra que se usa (§ 15, regla 6), y «Mejor valor», «Pinakasulit». Gratis es «Libre».
 * Cuando Weë habla de sí mismo usa el «kami» exclusivo (§ 2): «habang binubuo namin ang Weë AI».
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Available na Credits',
  yourBalance: 'Balanse mo',
  currentBalance: 'Kasalukuyang balanse',
  free: 'Libre',
  testTopUp: 'Pansubok na top-up',
  testTopUpReady: 'Handa na ang pansubok na top-up',
  testPrices: 'Mga pansubok na presyo habang binubuo namin ang Weë AI',
  topUp: 'Mag-top up',
  seeHistory: 'Tingnan ang history →',
  seeHistoryLabel: 'Tingnan ang history',
  history: 'History',
  myWallet: 'Wallet ko',
  earned: 'Natanggap',
  spent: 'Nagamit',
  noMovements: 'Wala pang transaksyon',
  testTopUpDone: 'Naidagdag sa account mo ang {{cantidad}} Credits. Pansubok na top-up ito, kaya walang siningil.',
  balanceAfter: 'Balanse: {{saldo}}',
  topUpFailed: 'Hindi makumpleto ang top-up. Subukan ulit.',
  terms: 'Pansubok na top-up ito: wala pang sinisingil. Darating ang mga pinal na presyo kapag gumagamit na ang Weë AI ng mga totoong AI. Sa ngayon, makikita mo ang pansubok na halaga ng bawat likha bago ito magsimula.',
  youHaveLabel: 'May {{saldo}} Credits ka',
  topUpButton: 'Mag-top up ng {{cantidad}} Credits · pansubok',
  txPurchase: 'Pagbili ng Credits',
  txGrant: 'Natanggap na Credits',
  txRefund: 'Refund',
  txUsage: 'Paggamit ng Credits',
  txRefunded: 'Na-refund',
  txPending: 'Pinoproseso pa',
  purchasesComingSoon: 'Malapit ka nang makabili ng Credits. Sa ngayon, hindi pa puwedeng mag-top up dito.',
  topUpFailedTitle: 'Naku',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  buyTitle: 'Ilang Credits ang gusto mo?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Bumili ng {{cantidad}} Credits · {{precio}}',
  buyLess: 'Bawasan',
  buyMore: 'Dagdagan',
  buyNoticeTitle: 'Hindi pa nakakonekta ang mga pagbabayad',
  buyNoticeBody: 'Walang siningil at walang nagbago sa balanse mo.',
  buyChecking: 'Tinitingnan ang store…',
  buyCatalogError: 'Hindi makakonekta sa store. I-tap para subukan ulit.',
  buyMarketUnavailable: 'Hindi pa available ang pagbabayad sa currency na ito. Walang siningil.',
  historyLoading: 'Naglo-load ang mga transaksyon…',
  historyError: 'Hindi ma-load ang history.',
  historyRetry: 'Subukan ulit',
};
