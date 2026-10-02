/*
 * Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * 해요체, como el resto del coreano de Weë. Ninguna partícula va pegada a un hueco:
 * aquí no hay huecos. «Weë를» usa la serie de vocal, que es la de la marca.
 *
 * La confirmación dice solo lo que es verdad: que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: '신고',
  subtitle: '이 콘텐츠에 어떤 문제가 있는지 알려 주세요.',
  chooseReason: '사유를 선택해 주세요',
  send: '신고 보내기',
  sending: '신고를 보내는 중…',
  reasonSpam: '스팸',
  reasonHarassment: '괴롭힘 또는 따돌림',
  reasonHate: '혐오 또는 차별',
  reasonSexual: '성적인 콘텐츠',
  reasonViolence: '폭력',
  reasonScam: '사기 또는 기만',
  reasonImpersonation: '사칭',
  reasonIllegal: '불법 콘텐츠',
  reasonSelfHarm: '자해 또는 자살',
  reasonOther: '기타 사유',
  successTitle: '신고가 접수되었어요',
  successBody: 'Weë를 안전하게 지키는 데 도와주셔서 감사합니다.',
  duplicateTitle: '이미 신고하셨어요',
  duplicateBody: '이 콘텐츠에 대한 신고는 이미 접수되었어요.',
  errorTitle: '신고를 보내지 못했어요.',
  errorBody: '다시 시도해 주세요.',
  errorOffline: '연결되어 있지 않아요. 다시 시도해 주세요.',
  errorRateLimited: '짧은 시간에 신고를 많이 보내셨어요. 나중에 다시 시도해 주세요.',
  errorUnavailable: '이 콘텐츠는 더 이상 볼 수 없어요.',
};
