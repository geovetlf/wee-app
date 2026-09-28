/*
 * COREANO — «Tu cuenta» (내 계정), en la pestaña Perfil (2026-09-27): lo que es de
 * la cuenta y no de una cara, a un toque.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Credits» y «Weë Studio» son marca y no se transliteran. Las etiquetas repiten
 * las palabras que ya usan `credits`, `menu` y `settings` (내역, 개인정보, 저장됨).
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  title: '내 계정',
  creditsNote: '두 프로필이 함께 쓰는 내 계정의 Credits',
  history: '내역',
  buy: '구매',
  language: '언어',
  settings: '계정 설정',
  privacy: '개인정보',
  help: '도움말 센터',
};
