/*
 * CHINO SIMPLIFICADO — «Tu cuenta» (你的账号), en la pestaña Perfil: lo que es de
 * la cuenta y no de una cara —los Credits, el idioma, la configuración, la
 * privacidad— a un toque.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» y «Weë Studio» son marca y se quedan en alfabeto latino. Las demás
 * etiquetas repiten las palabras que el chino ya usa para lo mismo: 记录
 * (`credits.history`), 语言, 隐私, 收藏 (`saved`), 账号 y 主页 para cada perfil.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  title: '你的账号',
  creditsNote: '你账号里的 Credits，两个主页通用',
  history: '记录',
  buy: '购买',
  language: '语言',
  settings: '账号设置',
  privacy: '隐私',
  help: '帮助中心',
};
