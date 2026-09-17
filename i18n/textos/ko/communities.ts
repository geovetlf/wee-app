/*
 * COREANO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. LO QUE NO ENTRA AQUÍ: el nombre de una comunidad y su
 * descripción, que los escribe una persona y se pintan tal cual. Cuando una
 * frase de Weë los nombra, entran por hueco —`{{nombre}}`— y salen sin tocar;
 * detrás del hueco solo van palabras fijas (커뮤니티) o el cierre de comillas,
 * nunca una partícula que dependa de la última letra del nombre.
 *
 * ── `members` NO TIENE PLURAL, PORQUE EL COREANO NO LO TIENE ────────────────
 *
 * `Intl.PluralRules('ko')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO —«멤버
 * {{contador}}명»— con 명, el contador de personas, que vale para 0, 1 y 1.000.
 */
export const communities: typeof import('../es/communities').communities = {
  create: '커뮤니티 만들기',
  searchPlaceholder: '커뮤니티 검색...',
  loading: '커뮤니티를 불러오는 중...',

  joinedSection: '참여 중인 커뮤니티',
  discoverSection: '커뮤니티 둘러보기',

  official: '공식',
  members_one: '멤버 {{contador}}명',
  members_other: '멤버 {{contador}}명',
  memberOf: '참여 중',
  join: '참여하기',

  leaveTitle: '커뮤니티 나가기',
  leaveConfirm: '"{{nombre}}" 커뮤니티에서 정말 나갈까요?',
  leave: '나가기',
  leaveFailed: '커뮤니티에서 나가지 못했어요',
  actionFailed: '작업을 완료하지 못했어요',

  newCommunity: '새 커뮤니티',
  name: '이름',
  namePlaceholder: '예: 커피를 사랑하는 사람들',
  description: '설명',
  descriptionPlaceholder: '어떤 커뮤니티인가요?',
  createFailed: '커뮤니티를 만들지 못했어요',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: '{{nombre}} 커뮤니티',
  empty: '이용할 수 있는 커뮤니티가 없어요',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: '나에게 맞는 곳을 찾아보세요.',
  searchLabel: '커뮤니티 검색',
  members: '멤버',
  posts: '게시물',
  rules: '커뮤니티 규칙',
  one: '커뮤니티',
  loadFailed: '커뮤니티를 불러오지 못했어요',
  noPosts: '게시물이 없어요',
  beTheFirst: '이 커뮤니티에 첫 게시물을 올려 보세요',
  createPost: '게시물 만들기',
  understoodJoin: '확인했어요, 참여할게요',
};
