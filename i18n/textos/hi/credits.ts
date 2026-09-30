/*
 * HINDI — Credits: el saldo, la recarga de prueba y el historial. "Credits" es
 * marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los
 * cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» va en latino, no se translitera y no cambia con la cifra: nunca
 * «क्रेडिट» ni «क्रेडिट्स» (glosario § 11.1). Concuerda en masculino plural (§ 5.3):
 * «Credits जोड़े गए», «Credits मिले». La posposición va detrás y separada:
 * «Credits की खरीद», «Credits का इस्तेमाल».
 *
 * El saldo es «बैलेंस» (m), como en las carteras indias; la billetera, «वॉलेट»;
 * el reembolso, «रिफ़ंड»; gratis, «मुफ़्त» (glosario § 11.6). Recargar es
 * «Credits जोड़ें» (§ 11.7): «रिचार्ज» en India es la recarga del móvil. La
 * recarga de prueba, que no tiene sustantivo cómodo en hindi, es «टेस्ट के लिए
 * Credits», y cada frase que la nombra dice que no se cobró nada («आपका कोई पैसा
 * नहीं कटा»). «Recarga de prueba lista» dice lo que pasó, «टेस्ट Credits जुड़ गए»:
 * los Credits se suman, no «están listos». Los movimientos son «लेन-देन», la
 * palabra de los bancos y las apps de pago, y el historial, «इतिहास», la de Google.
 *
 * «Obtenidos» y «Usados», bajo las cifras de la cartera, son «मिले» e
 * «इस्तेमाल हुए»: «कमाए» diría que se ganaron, y ahí también cuentan los de
 * bienvenida y los comprados. «मिले» es la misma palabra que `txGrant`.
 *
 * «Ups» es «कोई गड़बड़ी हुई», el título de fallo de Android, sin exclamación (§ 2).
 * «Mi billetera» es «मेरा वॉलेट»; «Básico», «बेसिक», como se llaman los planes en
 * India; «Mejor valor», «सबसे फ़ायदेमंद». Los nombres de los otros paquetes
 * («Plus», «Black Pro») no pasan por aquí.
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'उपलब्ध Credits',
  yourBalance: 'आपका बैलेंस',
  currentBalance: 'मौजूदा बैलेंस',
  free: 'मुफ़्त',
  testTopUp: 'टेस्ट के लिए Credits',
  testTopUpReady: 'टेस्ट Credits जुड़ गए',
  testPrices: 'Weë AI तैयार होने तक टेस्ट कीमतें',
  topUp: 'Credits जोड़ें',
  seeHistory: 'इतिहास देखें →',
  seeHistoryLabel: 'इतिहास देखें',
  history: 'लेन-देन का इतिहास',
  myWallet: 'मेरा वॉलेट',
  earned: 'मिले',
  spent: 'इस्तेमाल हुए',
  noMovements: 'अभी तक कोई लेन-देन नहीं हुआ',
  testTopUpDone: '{{cantidad}} Credits आपके खाते में जोड़ दिए गए. यह सिर्फ़ टेस्ट है: आपका कोई पैसा नहीं कटा.',
  balanceAfter: 'बैलेंस: {{saldo}}',
  topUpFailed: 'Credits नहीं जोड़े जा सके. फिर से कोशिश करें.',
  terms: 'यह सिर्फ़ टेस्ट है: अभी कोई पैसा नहीं लिया जाता. असली कीमतें तब तय होंगी, जब Weë AI असली AI से काम करने लगेगा. तब तक, कुछ भी बनाने से पहले उसकी टेस्ट कीमत दिखाई जाती है.',
  youHaveLabel: 'आपके पास {{saldo}} Credits हैं',
  topUpButton: '{{cantidad}} Credits जोड़ें · टेस्ट',
  txPurchase: 'Credits की खरीद',
  txGrant: 'Credits मिले',
  txRefund: 'रिफ़ंड',
  txUsage: 'Credits का इस्तेमाल',
  txRefunded: 'रिफ़ंड हो गया',
  txPending: 'प्रोसेस हो रहा है',
  pkgBasic: 'बेसिक',
  badgePopular: 'लोकप्रिय',
  badgeBestValue: 'सबसे फ़ायदेमंद',
  purchasesComingSoon: 'Credits खरीदने की सुविधा जल्द ही आएगी. अभी यहाँ Credits नहीं जोड़े जा सकते.',
  topUpFailedTitle: 'कोई गड़बड़ी हुई',
};
