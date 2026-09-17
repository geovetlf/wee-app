/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const language: typeof import('../es/language').language = {
  title: '언어',
  explanation: 'Weë 인터페이스의 언어를 바꿔요. 게시물과 댓글은 각자가 쓴 그대로 보여요.',
  comingSoon: '곧 제공',
  comingSoonTitle: '준비 중',
  selected: '선택됨',
};
