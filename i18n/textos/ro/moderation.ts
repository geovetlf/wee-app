/*
 * RUMANO — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los motivos son categorías en lenguaje normal, no términos legales. La
 * confirmación dice solo que el reporte se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Raportează',
  subtitle: 'Spune-ne ce se întâmplă cu acest conținut.',
  chooseReason: 'Alege un motiv',
  send: 'Trimite raportul',
  sending: 'Se trimite raportul…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Hărțuire sau intimidare',
  reasonHate: 'Ură sau discriminare',
  reasonSexual: 'Conținut sexual',
  reasonViolence: 'Violență',
  reasonScam: 'Înșelătorie sau fraudă',
  reasonImpersonation: 'Uzurpare de identitate',
  reasonIllegal: 'Conținut ilegal',
  reasonSelfHarm: 'Autovătămare sau sinucidere',
  reasonOther: 'Alt motiv',
  successTitle: 'Raport primit',
  successBody: 'Îți mulțumim că ne ajuți să păstrăm Weë un loc sigur.',
  duplicateTitle: 'Ai raportat deja acest conținut',
  duplicateBody: 'Am primit deja raportul tău despre acest conținut.',
  errorTitle: 'Nu am putut trimite raportul tău.',
  errorBody: 'Încearcă din nou.',
  errorOffline: 'Nu există conexiune. Încearcă din nou.',
  errorRateLimited: 'Ai trimis multe rapoarte într-un timp scurt. Încearcă mai târziu.',
  errorUnavailable: 'Acest conținut nu mai este disponibil.',
};
