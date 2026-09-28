/*
 * RUSO — «Tu cuenta», en la pestaña Perfil (2026-09-27): lo que es de la cuenta
 * y no de una cara, a un toque. Tipado contra el español: si allí hay una clave
 * que aquí falta, no compila. Trato de «вы»; la cuenta es «аккаунт», como en
 * `settings`. «Credits» y «Weë Creator» son marca: en latino y sin declinar.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  title: 'Ваш аккаунт',
  creditsNote: 'Credits вашего аккаунта — одни и те же в обоих ваших профилях',
  history: 'История',
  buy: 'Купить',
  language: 'Язык',
  settings: 'Настройки аккаунта',
  privacy: 'Конфиденциальность',
  help: 'Центр помощи',
  saved: 'Сохранённое',
  creator: 'Weë Creator',
};
