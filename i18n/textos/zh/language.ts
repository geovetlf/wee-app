/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `comingSoonTitle` es el título de la sección de idiomas que todavía no están y
 * `comingSoon` la etiqueta de cada fila: en chino se dicen distinto, porque
 * repetir la misma palabra dos veces seguidas parecería un fallo de copia.
 */
export const language: typeof import('../es/language').language = {
  title: '语言',
  explanation: '更改 Weë 界面的语言。动态和评论仍会按每个人写下时的原文显示。',
  comingSoon: '即将上线',
  comingSoonTitle: '正在准备中',
  selected: '已选择',
};
