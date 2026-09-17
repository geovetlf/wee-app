/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * TAIWÁN, NO UNA CONVERSIÓN: la interfaz es «介面» (en China continental,
 * «界面»), y un comentario de otra persona es «留言», no «評論», que allí suena a
 * crítica publicada.
 *
 * `comingSoonTitle` es el título de la sección de idiomas que todavía no están y
 * `comingSoon` la etiqueta de cada fila: se dicen distinto, porque repetir la
 * misma palabra dos veces seguidas parecería un fallo de copia.
 */
export const language: typeof import('../es/language').language = {
  title: '語言',
  explanation: '更改 Weë 介面的語言。貼文和留言仍會維持每個人寫下時的原文。',
  comingSoon: '即將推出',
  comingSoonTitle: '正在準備中',
  selected: '已選擇',
};
