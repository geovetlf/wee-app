/*
 * COREANO — ËContact y ẄContact. Los dos nombres son marca —cambian con el
 * perfil activo— y entran como valor. No se traducen, no se transliteran a
 * sílabas coreanas y no se cambian por la palabra común que significan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. `{{lista}}` es el nombre de la agenda, `{{nombre}}` el de una
 * persona y `{{etiqueta}}` el del perfil. Detrás de esos huecos SOLO van
 * partículas que no cambian —의, 에, 에서, 에게— o directamente un sustantivo:
 * 은/는, 이/가, 을/를 y (으)로 dependen de la última letra de lo que salga del
 * hueco y aquí no se pega ninguna.
 *
 * AQUÍ NO SE USA 님 detrás de `{{nombre}}`, aunque en `notifications` sí: el
 * repuesto de esta pantalla es `somePerson` («이 사람»), y «이 사람 님» no se
 * dice. Donde hacía falta un 을/를 se omite la partícula —«{{nombre}} 삭제»—,
 * que es lo normal en coreano de interfaz.
 *
 * ── `count` NO TIENE PLURAL, PORQUE EL COREANO NO LO TIENE ──────────────────
 *
 * `Intl.PluralRules('ko')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. El español escribía «1 {{lista}}» con un
 * 1 fijo; aquí las dos formas dicen lo MISMO y las dos llevan el contador, con
 * 명, que es el que cuenta personas.
 */
export const econtact: typeof import('../es/econtact').econtact = {
  requestsReceived: '받은 요청',
  requestsSent: '보낸 요청',
  yours: '내 {{lista}}',
  yoursWhenYouSignIn: '내 {{lista}}, 로그인하면 보여요',
  yoursWhenYouSignInSubtitle: '{{lista}}에 Weë에서 맺은 연결이 담겨요. 로그인하고 확인해 보세요.',
  noneYet: '아직 {{lista}} 연결이 없어요',
  noneYetSubtitle: '여기에 Weë에서 만난 사람들이 모여요. 연결은 둘이서 만들어요. 한 사람이 제안하고 다른 사람이 수락하면 완성돼요.',
  noAgenda: '이 프로필에는 주소록이 없어요',
  noAgendaSubtitle: '{{lista}}에 다른 사람들과의 연결이 모여 있어요. 실제 프로필이나 Weë 프로필로 전환하면 볼 수 있어요.',
  wantsToConnect: '{{lista}} · 나와 연결하고 싶어 해요',
  accept: '{{nombre}} 수락',
  reject: '{{nombre}} 거절',
  withdraw: '{{nombre}}에게 보낸 요청 취소',
  removeFrom: '내 {{lista}}에서 {{nombre}} 삭제',
  openProfile: '{{nombre}}의 {{etiqueta}} 열기',
  rejectTitle: '요청 거절',
  rejectConfirm: '{{nombre}}의 요청을 거절할까요?',
  withdrawTitle: '요청 취소',
  withdrawConfirm: '{{nombre}}에게 보낸 요청을 취소할까요?',
  removeTitle: '{{lista}} 삭제',
  removeConfirm: '내 {{lista}}에서 {{nombre}} 삭제할까요?',
  failed: '완료하지 못했어요',
  count_one: '{{lista}} {{contador}}명',
  count_other: '{{lista}} {{contador}}명',
  somePerson: '이 사람',
  acceptLabel: '{{lista}} 수락',
  rejectRequestLabel: '{{lista}} 요청 거절',
  requestSent: '요청을 보냈어요',
};
