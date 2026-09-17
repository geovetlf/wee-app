/*
 * COREANO — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체, que es el tono de Weë: cercano sin ser descuidado. Los
 * botones van en forma nominal corta (저장, 편집, 다시 시도), que es como se
 * escriben en coreano y no en imperativo.
 *
 * EL COREANO NO TIENE PLURAL. `Intl.PluralRules('ko')` solo declara `other`, así
 * que `pollVotes_one`, `pollDaysLeft_one` y `pollHoursLeft_one` NO SE LEEN NUNCA
 * —ni con 1—. Están porque el español las exige, y dicen exactamente lo mismo
 * que su `_other`: si dijeran otra cosa, nadie la vería. El contador coreano
 * (표, 일, 시간, 장) sí va pegado al número: `{{contador}}표` está bien.
 *
 * Y las partículas variables (은/는, 이/가, 을/를) no se pegan a un hueco: en
 * `repostedBy` el nombre lleva detrás 님, que acaba en consonante siempre, así
 * que el 이 que sigue nunca se equivoca.
 *
 * Weë, Weëls, WeeTalk y Weël se quedan en alfabeto latino dentro del hangul: son
 * marca, y en coreano eso significa no traducir Y NO TRANSLITERAR.
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}}님이 리포스트했어요',
  repost: '리포스트',
  undoRepost: '리포스트 취소',
  undoRepostConfirm: '리포스트 취소하기',
  sendByWeeTalk: 'WeeTalk으로 보내기',
  save: '저장',
  unsave: '저장 목록에서 삭제',
  deletePost: '게시물 삭제',
  deletePostConfirm: '이 게시물을 삭제할까요?',
  deletePostFailed: '게시물을 삭제하지 못했어요. 다시 시도해 주세요.',
  reportPost: '게시물 신고',
  reportWhy: '이 게시물을 신고하는 이유가 뭔가요?',
  reportSpam: '스팸',
  reportOffensive: '불쾌한 콘텐츠',
  reportOther: '기타 사유',
  reportSent: '신고 완료',
  reportThanks: '신고해 주셔서 감사합니다. 곧 확인할게요.',
  sharePost: '게시물 공유',
  shareFailed: '게시물을 공유하지 못했어요. 다시 시도해 주세요.',
  preparingImage: '이미지 준비 중...',
  publishedOnWee: 'Weë에 게시됨',
  viewInWeels: 'Weëls에서 보기',
  moreImages: '외 {{contador}}장',
  comment: '댓글 달기',
  viewFullVideoInWeels: 'Weëls에서 전체 영상 보기',
  pollNoVotesYet: '아직 투표가 없어요',
  pollVotes_one: '{{contador}}표',
  pollVotes_other: '{{contador}}표',
  pollVoted: '투표 완료',
  pollClosed: '투표 종료',
  pollDaysLeft_one: '{{contador}}일 남음',
  pollDaysLeft_other: '{{contador}}일 남음',
  pollHoursLeft_one: '{{contador}}시간 남음',
  pollHoursLeft_other: '{{contador}}시간 남음',
  pollLessThanAnHour: '1시간 미만',
  pollLegacy: '이 투표는 이전 버전 Weë의 투표라 더 이상 참여할 수 없어요.',
  pollVoteFailed: '투표를 등록하지 못했어요',
  closeComments: '댓글 닫기',
  removeImage: '이미지 제거',
  attachImage: '이미지 첨부',
  sendComment: '댓글 보내기',
  onePost: '게시물',
  loadingComments: '댓글 불러오는 중...',
  beFirstToComment: '첫 댓글을 남겨 보세요',
  commentPlaceholder: '댓글을 남겨 보세요...',
  postNotFound: '이 게시물을 찾을 수 없어요',
  loadingPosts: '게시물 불러오는 중...',
  loadingMorePosts: '게시물 더 불러오는 중...',
  retry: '다시 시도',
  howIMadeIt: '이렇게 만들었어요',
  madeWith: '사용한 도구',
  holdToCopy: '텍스트를 길게 눌러 복사하세요',
  process: '과정:',
  comments: '댓글',
  firstCommentHint: '멋진 대화는 언제나 작은 생각 하나에서 시작돼요.',
  loadingPost: '게시물 불러오는 중...',
  useInEditor: '편집기에서 사용',
  edit: '편집',
  publishToCommunity: '내 커뮤니티에 게시',
  changesAndPurchases: '변경 및 구매 내역',
  shareAnonymously: 'Weë에서 익명으로 의견 남기기',
  statViews: '조회',
  statAgree: '공감',
  statComments: '댓글',
};
