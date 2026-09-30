/*
 * CHINO TRADICIONAL (TAIWÁN) — la Ayuda: las nueve preguntas frecuentes, el
 * contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * EL CONTENIDO DE LA AYUDA ES INTERFAZ, no algo que escriba una persona: por
 * eso vive aquí y se traduce entero. Los emojis, el símbolo ☰ y los nombres de
 * Weë y de los diez especialistas se copian tal cual, sin pasarlos a hanzi.
 *
 * ── LAS PREGUNTAS USAN «…是什麼？» ─────────────────────────────────────────
 *
 * Es la forma estándar de un FAQ chino, corta y sin fórmulas de cortesía de
 * carta: aquí no hay 請您, ni 敬請, ni 尊敬的用戶. Se tutea con 你. Lo que se
 * entrecomilla va entre 「」, las comillas de Taiwán.
 *
 * ── EL VOCABULARIO ES EL DE TAIWÁN, NO EL DEL CONTINENTE ───────────────────
 *
 * 說明 para la ayuda, 社群 para las comunidades, 專案 para los proyectos, 影片
 * para los videos, 貼文 para las publicaciones, 選單 para el menú ☰, 浮水印
 * para la marca de agua, 儲值 para recargar, 人工智慧 para la IA, 應用程式 para
 * la app, 聯絡 para contactar y 資料 para los datos.
 *
 * ── LO LEGAL, CON EL TÉRMINO EXACTO ────────────────────────────────────────
 *
 * 服務條款 y 隱私權政策 —con 權, que es la forma de Taiwán—, los mismos que
 * `settings` y `auth`, porque la frase del alta se arma pegando tres claves y
 * tiene que cerrar sola.
 *
 * ── LO QUE SE CITA VIVE EN OTROS MÓDULOS ───────────────────────────────────
 *
 * `a5` cita `weeai.saveToProject` («儲存到專案») y `q9` cita `wall.howIMadeIt`
 * («我是怎麼做的»). Si allí cambian las palabras, aquí cambian también: la cita
 * tiene que decir lo mismo que el botón.
 */
export const help: typeof import('../es/help').help = {
  title: '說明',
  intro: '這裡是最常見問題的答案。如果還有不清楚的地方，告訴我們：Weë 和社群一起變得更好。',
  faqTitle: '常見問題',
  contact: '聯絡我們',
  contactBody: '很快你就能在這裡直接聯絡 Weë 團隊。在那之前，把你的想法和遇到的問題發成一篇貼文：社群和團隊都在看。',
  askQuestion: '提出問題',
  legalTitle: '服務條款與隱私權',
  legalBody: '你的資料是你的。Weë 只把你的電子郵件和個人檔案用來讓應用程式正常運作：登入、顯示你的貼文、你的 Credits 和你的作品。我們不會出售你的資訊。',
  legalPending: '完整的服務條款和隱私權政策會在上線前發布在 wee.zone。Weë 還在建置中：有些功能用的是測試資料，我們會在用到的地方寫清楚。',
  footer: 'Weë · World Encode Entity · 版本 1.0.0',
  q1: 'Weë 是什麼？',
  a1: 'Weë（World Encode Entity）是用人工智慧創作的人們的社群平台：在這裡你可以發現、學習、創作、分享和連結。AI 是引擎，社群是心臟。',
  q2: '真實個人檔案和 Weë 個人檔案有什麼不同？',
  a2: '真實個人檔案是你一直以來的身分，應用程式是淺色的。Weë 個人檔案是你用 AI 創作時的身分：用專屬的頭像和名字發布作品，這時應用程式會變成深色，讓你隨時知道自己正在用哪個身分參與。在選單 ☰ 或標題列的按鈕裡切換。',
  q3: 'Weë AI 是怎麼運作的？',
  a3: '用你自己的話告訴 Weë 你想做成什麼。Weë 會問幾個簡單的問題（隨時可以回答「不知道」），提出方案，然後做出結果。結果你來選，AI 由 Weë 來選。這裡有十位專家：Design、Studio、Photo、Writer、Music、Beauty、Chef、Home、Business 和 Brain。',
  q4: 'Credits 是什麼？',
  a4: '用 Weë AI 創作的每一次都會消耗 Credits。開始之前你會看到要花多少，如果出了問題會退還。在我們建置 Weë AI 的這段期間，價格是測試價，儲值也不用錢：正式價格會跟真實的 AI 一起到來。',
  q5: '專案是用來做什麼的？',
  a5: '一個專案能把不同專家的作品放在一起：例如「我的餐廳」的 logo、照片、廣告、影片和音樂。在結果上點「儲存到專案」，把每個結果放進它該去的專案。',
  q6: 'Weëls 是什麼？',
  a6: '最長 15 秒的影片，用來展示你創作的東西。可以分享到 Weë 之外，上面帶一個小小的 Weë 浮水印。從 + 按鈕裡選「Weël」就能建立。',
  q7: '社群是什麼？',
  a7: '興趣相同的人聚在一起的地方：電影與動畫、藝術與創意、商業與創業、科技與 AI 等等。加入你感興趣的社群，在裡面發文。',
  q8: 'WeeTalk 是什麼？',
  a8: '這是 Weë 的聊天：和社群裡的其他人私密對話，可以傳文字、照片和語音。',
  q9: '「我是怎麼做的」是什麼？',
  a9: '發布的時候，你可以說說自己用了哪些工具、提示詞和過程。這樣別人能從你這裡學到東西，你也能從別人那裡學到——點一下「複製提示詞」就夠了。',
  heroTitle: '有什麼可以幫你的？',
  legalVisibility: '你發布的內容社群裡的人都看得到；你在 Weë AI 裡創作的內容，在你決定發布之前都是私密的。你可以隨時刪除自己的貼文和專案。',
  askPrefill: '給 Weë 的問題：',
};
