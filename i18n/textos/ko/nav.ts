/*
 * COREANO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. Las cinco etiquetas son cortas —el coreano juega a favor: 홈,
 * 검색, 만들기, WeeTalk, 알림— y son EXACTAMENTE las mismas que usa el menú ☰
 * (`menu`). WeeTalk es marca y se queda en alfabeto latino: no es «채팅».
 *
 * `goTo` no puede decir «{{nombre}}(으)로 이동», porque (으)로 cambia según la
 * letra final de lo que traiga el hueco. Se resuelve metiendo una palabra fija
 * —화면— entre el hueco y la partícula.
 */
export const nav: typeof import('../es/nav').nav = {
  home: '홈',
  search: '검색',
  create: '만들기',
  talk: 'WeeTalk',
  notifications: '알림',
  current: '현재 섹션',
  goTo: '{{nombre}} 화면으로 이동',
  weeNavigation: 'Weë 내비게이션',
  goHome: '홈으로 이동',
  myProfile: '내 프로필로 이동',
  openWeeAi: 'Weë AI 열기',
  goToWeeAi: 'Weë AI 화면으로 이동',
  weeAiQuestion: '오늘은 무엇을 만들어 볼까요?',
  weeAiPitch: '원하는 것을 Weë에 말해 주세요. AI는 Weë가 알아서 해요.',
  documentTitle: 'Weë - 미래의 커뮤니티',
};
