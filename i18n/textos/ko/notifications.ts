/*
 * COREANO — notificaciones. El NOMBRE de quien la provoca entra como valor y no
 * se traduce; la frase entera sí, para que en otros idiomas el verbo pueda ir
 * donde toque.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. Detrás de `{{nombre}}` va 님 —el trato normal a una persona
 * en coreano— y SOLO DESPUÉS la partícula: 님 acaba siempre en ㅁ, así que 이
 * es siempre la forma correcta y nada depende de la última letra del nombre.
 * Es la manera limpia de no pegar 이/가 a un hueco. El repuesto cuando no hay
 * nombre es `common.user` («사용자»), que con 님 también encaja.
 *
 * La pantalla parte la frase por el hueco para poner el nombre en negrita, así
 * que 님 y su partícula viajan en el trozo de después, tal y como se lee.
 *
 * ËContact es marca: se queda en alfabeto latino y no se translitera.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: '알림',
  empty: '알림 없음',
  emptyHint: '누군가 나와 소통하면 여기에 표시돼요',
  allRead: '모든 알림을 읽었어요',
  noneNew: '새 알림 없음',
  like: '{{nombre}} 님이 내 게시물을 좋아해요',
  comment: '{{nombre}} 님이 내 게시물에 댓글을 남겼어요',
  follow: '{{nombre}} 님이 나를 팔로우하기 시작했어요',
  econtactRequest: '{{nombre}} 님이 나를 ËContact에 추가하고 싶어 해요',
  econtactAccepted: '{{nombre}} 님이 ËContact 요청을 수락했어요',
  repost: '{{nombre}} 님이 내 게시물을 공유했어요',
  mention: '{{nombre}} 님이 나를 언급했어요',
  reply: '{{nombre}} 님이 내 댓글에 답글을 남겼어요',
  communityPost: '{{nombre}} 님이 {{comunidad}}에 게시물을 올렸어요',
  aCommunity: '어떤 커뮤니티',
  generic: '{{nombre}} 님이 나와 소통했어요',
  now: '방금',
  markAllRead: '모두 읽음으로 표시',
  all: '전체',
  unread: '읽지 않음',
  unreadWithCount: '읽지 않음 ({{total}})',
};
