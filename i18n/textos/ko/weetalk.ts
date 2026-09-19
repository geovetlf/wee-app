/*
 * COREANO — WeeTalk. El nombre es marca: se queda en alfabeto latino, no se
 * translitera y no se cambia por la palabra común que significa. Los mensajes
 * los escribe la gente y NUNCA pasan por aquí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. `youSaid` usa el patrón etiqueta «나: {{mensaje}}»: el hueco
 * va detrás de los dos puntos, que es donde el coreano no pide partícula, y
 * dentro cabe cualquier cosa que haya escrito la persona. El emoji 🤝 se copia
 * tal cual.
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: '메시지를 입력하세요…',
  send: '보내기',
  empty: '아직 대화가 없어요',
  emptyHint: '프로필에서 먼저 말을 걸어 보세요',
  loadFailed: '대화를 불러오지 못했어요',
  sendFailed: '메시지를 보내지 못했어요',
  attach: '첨부',
  photo: '사진',
  search: '검색...',
  noConversations: '대화 없음',
  deleteConversation: '대화 삭제',
  areYouSure: '정말 삭제할까요?',
  messagePlaceholderShort: '메시지...',
  firstMessage: '첫 메시지를 보내 보세요',
  photoSeen: '사진 확인함',
  photoOnce: '한 번 보기 사진',
  photoOpened: '열어봄',
  tapToView: '탭하여 보기',
  tapToClose: '탭하여 닫기',
  theme: '테마',
  background: '배경',
  permissions: '권한',
  photoPermission: '사진에 접근하려면 권한이 필요해요',
  audioPermission: '오디오를 녹음하려면 권한이 필요해요',
  imageFailed: '이미지를 보내지 못했어요',
  noConversationsHint: '아무 게시물에서나 "비공개"를 눌러 익명 대화를 시작해 보세요',
  ephemeralMode: '사라지는 모드',
  noMessagesYet: '아직 메시지가 없어요',
  youSaid: '나: {{mensaje}}',
  conversationStart: '여기서부터 비공개 대화가 시작돼요',
  beRespectful: '서로 존중하고 프라이버시를 지켜 주세요 🤝',
  anonymousUser: '익명 사용자',
  ephemeralOn: '사라지는 모드 켜짐 · 나가면 메시지가 삭제돼요',
  cameraNeeded: '카메라 접근 권한이 필요해요',
  allow: '허용',
};
