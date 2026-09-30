/*
 * COREANO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체 en las frases; los botones y las etiquetas van en forma
 * nominal corta —저장, 취소, 삭제, 닫기—, que es como se escriben en coreano.
 * `accept` es el «확인» de los diálogos, no un «수락»: aquí es el botón de OK.
 * La flecha → de `seeAll` se copia tal cual.
 */
export const common: typeof import('../es/common').common = {
  cancel: '취소',
  save: '저장',
  delete: '삭제',
  close: '닫기',
  back: '뒤로',
  next: '다음',
  done: '완료',
  accept: '확인',
  send: '보내기',
  share: '공유',
  retry: '다시 시도해 주세요',
  loading: '불러오는 중…',
  error: '오류',
  somethingWentWrong: '문제가 생겼어요',
  noResults: '결과 없음',
  notAvailable: '사용할 수 없음',
  comingSoon: '곧 공개',
  new: '신규',
  seeAll: '전체 보기 →',
  guest: '게스트',
  anonymousUser: '익명 사용자',
  user: '사용자',
  yes: '예',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: '아니요',
  loadMore: '게시물 더 보기',
  postsCount_one: '게시물 {{cantidad}}개',
  postsCount_other: '게시물 {{cantidad}}개',
};
