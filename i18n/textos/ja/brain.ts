/*
 * JAPONÉS — Weë Brain: la cabecera, el dibujo del cerebro con sus satélites y la caja.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Buscar en internet» es ウェブ検索, igual que `weeai.searchInternet`: es el
 * mismo ajuste dicho en dos sitios. El bloque de respuestas (`blockLeft`) va en
 * la línea de datos del costo, entre separadores « · », y por eso dice el
 * sujeto (回答) y la cuenta con 回: «回答はあと11回（全12回）». «Ir a X» es
 * Xに移動, como en `nav` y en `weeai.goToSpecialist`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: '何でも頼れるスマートアシスタント',
  slogan: '想像する · 相談する · 作る · つながる',
  description: 'Weëのすべての機能を、ひとつの会話で。',
  systemLabel: 'Weë AIのほかのセクションとつながるWeë Brain',
  goTo: '{{seccion}}に移動',
  placeholder: 'メッセージを入力…',
  settingsHint: '答え方を選べます。',
  searchGroup: 'ウェブ検索',
  imageLabel: '画像',
  settingsLabel: '設定',
  blockLeft: '回答はあと{{restantes}}回（全{{total}}回）',
};
