/*
 * COREANO — Textos del servidor: movimientos (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Ninguna partícula variable (은/는, 이/가, 을/를, 와/과, (으)로) va pegada a un hueco de texto: la frase se reordena o el hueco va detrás de dos puntos.
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: '이전 잔액',
  bienvenida: '환영 Credits',
  ajusteMenos: '조정: 예약한 금액보다 적게 들었어요',
  reembolsoFallida: '생성 실패 환불',
  compra: 'Credits 구매',
  regalo: '선물 Credits',
  recargaPrueba: '테스트 충전',
  compraRestaurada: '복원된 구매',
  reembolsoAdmin: '관리자 환불',
  avatar: 'Weë 아바타',
  fotoConAvatar: 'Weë 아바타로 만든 사진',
  noSePudoTerminar: '{{base}} · 끝내지 못했어요',
  brainBusqueda: 'Weë Brain · 검색',
  brainRespuestas_one: 'Weë Brain · 답변 {{contador}}개',
  brainRespuestas_other: 'Weë Brain · 답변 {{contador}}개',
  brainNoPudo: 'Weë Brain · 답변하지 못했어요',
  brainMuestra: 'Weë Brain · 예시 답변, 요금 청구 없음',
  studioVideo: 'Weë Studio · 영상',
  studioSinTiempo: 'Weë Studio · 이전 시도 시간 초과',
  studioNoSePudo: 'Weë Studio · 영상을 생성하지 못했어요',
  studioMundo: 'Weë Studio · 3D 월드',
  studioMundoNoSePudo: 'Weë Studio · 3D 월드를 만들지 못했어요',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · 작업이 완료되지 않았어요',
  servicioAiImageLite: '표준 이미지',
  servicioAiImageEnhanceLite: '표준 편집',
  servicioAiImage: '이미지 생성',
  servicioAiImageEnhance: '이미지 편집',
  servicioAiImagePro: '최고 정밀도 이미지',
  servicioAiTryon: '의류 피팅',
  servicioAiVideoDraft: '미리보기 영상',
  servicioAiVideo: '영상 생성',
  servicioAiVideoHd: '고품질 영상',
  servicioAiVideoAdvanced: '고급 영상',
  servicioAiVideoMax: '최고 품질 영상',
  servicioAiVideoEdit: '영상 편집',
  servicioAiAudio: '음성 생성',
  servicioAiTranscribe: '받아쓰기와 자막',
  servicioAiMusic: '음악 생성',
  servicioAiWorld: '3D 월드 생성',
  servicioAiBrain: 'Weë Brain 답변',
  servicioAiText: '텍스트 생성',
  servicioAiTextPro: '최고 품질 장문',
  servicioAiSearch: 'AI 검색',
  servicioAiBook: '책 만들기',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: '게시물 Boost',
  boostNoIniciado: '시작되지 않은 Boost',
  boostSinEntregas: '노출 없는 Boost · 전액 환불',
};
