/*
 * COREANO — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체; las pestañas y los botones, en forma nominal corta.
 *
 * PERFIL REAL Y PERFIL WEË NO SE TRADUCEN IGUAL: el real es 실제 프로필, pero el
 * otro es «Weë 프로필», con la marca en alfabeto latino. Weë no se translitera:
 * ni 위, ni 웨, ni nada.
 *
 * `{{nombre}}` de la agenda (ËContact/ẄContact) y `{{motivo}}` del servidor salen
 * sin tocar: no son palabras nuestras. En `shareMessage` el nombre de la persona
 * lleva detrás 님, que acaba en consonante siempre, así que el 의 que sigue nunca
 * se equivoca; en `viewMyEcontacts` el hueco va suelto, sin partícula, porque lo
 * que salga de ahí no se sabe de antemano.
 *
 * La dirección de `websitePlaceholder` es un EJEMPLO que se lee, no la de nadie:
 * por eso sí se traduce.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: '커버 추가',
  permissionsTitle: '권한',
  galleryPermission: '갤러리에 접근하려면 권한이 필요해요',
  coverUploadFailed: '커버 이미지를 올리지 못했어요',

  loading: '프로필 불러오는 중...',
  loadFailed: '프로필을 불러오지 못했어요',
  loadFailedDetail: '사용자 정보를 불러오지 못했어요',
  backToLogin: '로그인 화면으로 돌아가기',

  nameRequired: '이름은 비워 둘 수 없어요',
  updateFailed: '프로필을 업데이트하지 못했어요',
  signOutFailed: '로그아웃하지 못했어요',
  noSession: '로그인된 세션이 없어요',
  avatarUpdateFailed: '아바타를 업데이트하지 못했어요. 다시 시도해 주세요.',
  imageUrlMissing: '이미지 URL을 받지 못했어요',

  shareMessage: 'Weë에서 {{nombre}}님의 프로필을 확인해 보세요',

  editTitle: '프로필 편집',
  displayNameLabel: '사용자 이름',
  displayNamePlaceholder: '사용자 이름을 입력하세요',
  bioLabel: '소개',
  bioPlaceholder: '나에 대해 알려 주세요...',
  websiteLabel: '웹사이트',
  websitePlaceholder: 'https://내사이트.com',
  charCount: '{{usados}}/{{maximo}}자',

  editProfile: '프로필 편집',
  createWeeProfile: 'Weë 프로필 만들기',

  posts: '게시물',
  viewMyEcontacts: '내 {{nombre}} 보기, {{total}}',

  tabMedia: '미디어',
  tabReposts: '리포스트',
  tabLikes: '좋아요',

  loadingPosts: '게시물 불러오는 중...',
  postsFailed: '게시물을 불러오지 못했어요',
  retry: '다시 시도',

  emptyPosts: '아직 게시물이 없어요',
  emptyPostsHint: '첫 게시물을 올려 보세요!',
  emptyMedia: '사진이나 영상이 있는 게시물이 없어요',
  emptyMediaHint: '사진이나 영상으로 게시물을 만들어 보세요',
  emptyReposts: '아직 리포스트한 게시물이 없어요',
  emptyRepostsHint: '다른 사람의 콘텐츠를 공유해 보세요',
  emptyLikes: '좋아요를 누른 게시물이 없어요',
  emptyLikesHint: '마음에 드는 게시물에 좋아요를 눌러 보세요',
  otherTitle: '프로필',
  otherLoadFailed: '프로필을 불러오지 못했어요',
  seeFullProfile: '내 프로필 전체 보기',
  emptyCategory: '이 카테고리에는 게시물이 없어요',
  actionFailed: '완료하지 못했어요',
  userNotFound: '존재하지 않는 사용자예요',
  shareOtherMessage: 'Weë에서 @{{nombre}}님의 프로필을 확인해 보세요!\n\n{{bio}}',
  shareOtherNoBio: 'Weë 사용자',
  joinedOn: '가입일: {{fecha}}',
  tabPolls: '투표',
};
