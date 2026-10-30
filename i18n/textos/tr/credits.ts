/*
 * TURCO — Credits: el saldo, la recarga de prueba y el historial. "Credits" es
 * marca y no se traduce; todo lo que lo rodea, sí. Ni los precios ni los
 * cálculos pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» no se traduce, no se pluraliza y no lleva sufijo (guía § 9): nunca
 * «Kredi» ni «Krediler». Lo que haría falta declinar lo lleva un sustantivo
 * detrás o la frase se reescribe: «Tienes 240 Credits» es «Bakiyen: 240
 * Credits» y la compra es «Credits satın alımı».
 *
 * El saldo es «bakiye». Recargar es «yükle», como «bakiye yükle» / «TL yükle»
 * en las carteras turcas; el botón suelto dice «Bakiye yükle» porque «Yükle»
 * a secas es subir un archivo (glosario). La recarga de prueba es «deneme
 * yüklemesi», y cada frase que la nombra dice que no se cobró nada («hiçbir
 * ücret alınmadı»). Reembolso es «iade».
 *
 * «Ups» es «Hay aksi», sin exclamación: es el título de un fallo (guía § 2).
 * «Mi billetera» es «Cüzdanım» y el historial de la cartera, «İşlem geçmişi».
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Kullanılabilir Credits',
  yourBalance: 'Bakiyen',
  currentBalance: 'Güncel bakiye',
  topUp: 'Bakiye yükle',
  seeHistory: 'Geçmişi gör →',
  seeHistoryLabel: 'Geçmişi gör',
  history: 'İşlem geçmişi',
  myWallet: 'Cüzdanım',
  earned: 'Kazanılan',
  spent: 'Harcanan',
  noMovements: 'Henüz işlem yok',
  balanceAfter: 'Bakiye: {{saldo}}',
  youHaveLabel: 'Bakiyen: {{saldo}} Credits',
  txPurchase: 'Credits satın alımı',
  txGrant: 'Alınan Credits',
  txRefund: 'İade',
  txUsage: 'Credits kullanımı',
  txRefunded: 'İade edildi',
  txPending: 'İşleniyor',
  referenceRate: 'Referans dönüşüm oranı',
  referenceRateValue: '{{usd}} = {{creditos}} Credits',
  referenceRateNote: 'Credits, Weë içindeki kullanım birimidir. Plan ya da Credits paketi yoktur.',
  recentMovements: 'Son işlemler',
  purchasesComingSoon: 'Credits satın alma özelliği yakında geliyor. Şimdilik buradan bakiye yüklenemiyor.',
};
