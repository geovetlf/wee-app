/*
 * COREANO — Cuenta: eliminar la cuenta de Weë (Configuración → Eliminar cuenta).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tono claro, serio y amable: qué se borra, qué se queda y que no se puede deshacer.
 *
 * «confirmWord» = 삭제, la misma palabra que el botón «Eliminar» (common.delete); el coreano no tiene mayúsculas. Sin partícula detrás de {{palabra}}: la palabra va tras dos puntos.
 *
 * `confirmWord` es la palabra que la persona escribe para confirmar (la pantalla la compara sin
 * distinguir mayúsculas); `confirmLabel` la muestra por su hueco {{palabra}}.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  settingsRow: '계정 삭제',
  sectionDanger: '위험 구역',
  title: '계정 삭제',
  goesFaces: '나의 모든 프로필: 실제 프로필과 부캐',
  goesCharacter: '내 캐릭터와 아바타',
  goesPosts: '내 게시물, 댓글, 반응',
  goesMessages: 'WeeTalk 메시지: 내용이 비워지고, 상대방의 대화에도 그 메시지는 남지 않아요',
  goesCreations: 'Weë AI의 창작물, 프로젝트, 대화',
  goesContacts: '연락처, 커뮤니티, 저장한 항목',
  goesCredits: '남은 Credits: 사라지며 환불되지 않아요',
  whatStaysTitle: '보관되는 것',
  staysRecords: 'Credits와 결제의 회계 기록이에요. Weë의 회계 장부이기 때문에 이름과 프로필 정보 없이 보관돼요.',
  confirmLabel: '확인하려면 다음 단어를 입력하세요: "{{palabra}}"',
  confirmWord: '삭제',
  confirmPlaceholder: '여기에 단어를 입력하세요',
  dialogTitle: '계정을 삭제할까요?',
  dialogConfirm: '삭제',
  doneTitle: '계정이 삭제되었어요',
  doneBody: 'Weë와 함께해 주셔서 고마워요.',
  reauthTitle: '다시 로그인하세요',
  reauthBody: '보안을 위해 계정을 삭제하려면 최근에 로그인한 상태여야 해요. 로그아웃한 뒤 다시 로그인하고 이 단계를 반복하세요.',
  reauthButton: '로그아웃하고 다시 로그인',
  errorTitle: '끝내지 못했어요',
  errorBody: '중간에 문제가 생겼어요. 다시 시도해 주세요. 멈춘 곳부터 이어서 진행돼요.',
  retry: '다시 시도해 주세요',
  /* ── Desactivar (2026-11-22) ── */
  settingsRowHintDesactivar: '비활성화되고, 30일 후에 모두 지워져요',
  introDesactivar: '계정이 지금 비활성화되고, 30일 안에 돌아오지 않으면 모든 것이 영구적으로 지워져요.',
  nowTitle: '이제 어떻게 되나요',
  nowHidden: '계정이 보이지 않게 돼요: 아무도 내 프로필이나 게시물을 볼 수 없어요',
  nowCharacterOff: '캐릭터의 자율 활동이 꺼지고 더 이상 비용이 청구되지 않아요',
  nowComeBack_one: '돌아올 수 있는 기간은 {{contador}}일이에요: 다시 로그인하고 "계정 활성화"를 선택하세요',
  nowComeBack_other: '돌아올 수 있는 기간은 {{contador}}일이에요: 다시 로그인하고 "계정 활성화"를 선택하세요',
  whatGoesLaterTitle: '돌아오지 않으면 삭제되는 것',
  deactivateButton: '내 계정 삭제',
  dialogBodyDesactivar: '계정이 보이지 않게 돼요. 30일 안에 돌아오지 않으면 모든 것이 지워지고 다시 복구할 수 없어요.',
  deactivating: '계정을 비활성화하는 중…',
  deactivatedTitle: '계정이 비활성화되었어요',
  deactivatedBody: '{{fecha}}까지 돌아올 수 있어요. 그 후에는 모든 것이 영구적으로 지워져요.',
  /* ── Activar cuenta (la pantalla al volver a entrar) ── */
  activarTitle: '계정이 비활성화되었어요',
  activarBody: '계정 삭제를 요청했어요. 비활성화된 동안에는 아무도 내 프로필이나 게시물을 볼 수 없어요.',
  activarDaysLeft_one: '영구 삭제까지 {{contador}}일 남았어요',
  activarDaysLeft_other: '영구 삭제까지 {{contador}}일 남았어요',
  activarDate: '활성화하지 않으면 {{fecha}}에 영구적으로 지워져요.',
  activarCharacterNote: '캐릭터의 자율 활동은 꺼진 상태로 유지돼요. 원할 때 언제든 다시 예약할 수 있어요.',
  activarButton: '계정 활성화',
  activating: '계정을 활성화하는 중…',
  activatedTitle: '계정이 다시 활성화되었어요',
  activarExpiredTitle: '돌아올 수 있는 기간이 끝났어요',
  activarExpiredBody: '몇 시간 안에 계정이 완전히 지워져요.',
  /* ── Revisión de auditoría (2026-11-22) ── */
  goesCreditsCount: '남은 {{creditos}} Credits: 사라지며 환불되지 않아요',
};
