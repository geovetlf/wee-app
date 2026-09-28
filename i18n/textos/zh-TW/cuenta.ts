/*
 * CHINO TRADICIONAL (TAIWÁN) — «Tu cuenta», en la pestaña Perfil (2026-09-27): lo que es
 * de la cuenta y no de una cara —los Credits, el idioma, la configuración, la privacidad—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» y «Weë Studio» son marca y no se traducen. Las palabras son las que ya usa
 * la app en Taiwán: 帳號 (la cuenta), 個人檔案 (el perfil), 紀錄 (el historial, como en
 * `credits`), 設定 (no 設置), 收藏 (lo guardado, como en `saved`) y 說明中心 para la ayuda.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  title: '你的帳號',
  creditsNote: '你帳號的 Credits，兩個個人檔案共用',
  history: '紀錄',
  buy: '購買',
  language: '語言',
  settings: '帳號設定',
  privacy: '隱私',
  help: '說明中心',
};
