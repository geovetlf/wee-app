/*
 * COREANO — Textos del servidor: social (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Ninguna partícula variable (은/는, 이/가, 을/를, 와/과, (으)로) va pegada a un hueco de texto: la frase se reordena o el hueco va detrás de dos puntos.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: '수락할 요청이 없어요.',
  ecRelacionInvalida: '이 요청은 유효하지 않아요.',
  ecNoLaRecibiste: '요청을 받은 사람만 수락할 수 있어요.',
  ecYaSonContactos: '이미 서로 ËContact예요.',
  ecIdentidadInvalida: '이 프로필은 유효하지 않아요.',
  ecIdentidadDesconocida: '이 프로필은 존재하지 않아요.',
  ecIdentidadAjena: '내 프로필이 아니에요.',
  ecMismaPersona: '자기 자신과는 연결할 수 없어요.',
  ecYaExiste: '이 프로필과는 이미 관계가 있어요.',
  ecIniciaSesion: 'ËContact를 사용하려면 로그인해 주세요.',
  ecNoSeCompleto: '작업을 완료하지 못했어요. 다시 시도해 주세요.',
  ecFaltaPerfilPropio: '연결에 사용할 내 프로필이 빠져 있어요.',
  ecFaltaPerfilAjeno: '연결할 프로필이 빠져 있어요.',
  ecFaltaPerfilQueAcepta: '수락에 사용할 프로필이 빠져 있어요.',
  ecFaltaPerfilQueEnvia: '요청을 보낸 사람의 프로필이 빠져 있어요.',
  encSinEncuesta: '이 게시물에는 투표가 없어요.',
  encInvalida: '이 투표는 유효하지 않아요.',
  encAntigua: '이 투표는 이전 버전의 Weë에서 만들어져 더 이상 투표할 수 없어요.',
  encOpcionInexistente: '이 투표에 그 선택지는 없어요.',
  encCerrada: '이 투표는 이미 끝났어요.',
  encYaVotaste: '이 투표에 이미 참여했어요.',
  encPostNoExiste: '이 게시물은 더 이상 존재하지 않아요.',
  encIniciaSesion: '투표하려면 로그인해야 해요.',
  encFaltaPublicacion: '게시물이 빠져 있어요.',
  encFaltaOpcion: '선택지가 빠져 있어요.',
  encNoSeRegistro: '투표를 기록하지 못했어요. 다시 시도해 주세요.',
};
