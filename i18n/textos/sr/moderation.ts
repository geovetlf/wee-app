/*
 * SERBIO (ћирилица) — moderación: denunciar algo —una publicación, un comentario, un
 * perfil— desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los motivos son categorías en lenguaje normal, no términos legales. La
 * confirmación dice solo que el reporte se RECIBIÓ. Las frases que en español
 * llevan participio («habías denunciado», «has enviado») se dicen en pasiva para
 * no fijar el género de la persona.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Пријави',
  subtitle: 'Реци нам шта није у реду с овим садржајем.',
  chooseReason: 'Изабери разлог',
  send: 'Пошаљи пријаву',
  sending: 'Слање пријаве…',
  reasonSpam: 'Спам',
  reasonHarassment: 'Узнемиравање или малтретирање',
  reasonHate: 'Мржња или дискриминација',
  reasonSexual: 'Сексуални садржај',
  reasonViolence: 'Насиље',
  reasonScam: 'Превара или обмана',
  reasonImpersonation: 'Лажно представљање',
  reasonIllegal: 'Незаконит садржај',
  reasonSelfHarm: 'Самоповређивање или самоубиство',
  reasonOther: 'Други разлог',
  successTitle: 'Пријава је примљена',
  successBody: 'Хвала што нам помажеш да апликација Weë остане безбедна.',
  duplicateTitle: 'Ово је већ пријављено',
  duplicateBody: 'Већ смо примили твоју пријаву за овај садржај.',
  errorTitle: 'Нисмо могли да пошаљемо твоју пријаву.',
  errorBody: 'Покушај поново.',
  errorOffline: 'Нема везе са интернетом. Покушај поново.',
  errorRateLimited: 'Послато је много пријава заредом. Покушај касније.',
  errorUnavailable: 'Овај садржај више није доступан.',
};
