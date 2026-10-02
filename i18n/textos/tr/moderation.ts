/*
 * TURCO — Moderación: denunciar una publicación, un comentario o un perfil desde cualquier sitio
 * de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Denunciar» es «Şikâyet et» (glosario 10.2), con el circunflejo de la TDK en todas sus formas
 * (şikâyet, sahtekârlık). La confirmación dice solo que el reporte se recibió —«Şikâyetin
 * alındı»—: nunca que se revisará ni que se quitará nada. Los motivos van en lenguaje corriente,
 * como en Instagram y X, que en turco también dicen «Spam»: por eso se escribe igual que en
 * español. El odio es «nefret söylemi», el nombre con el que lo conoce quien denuncia.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Şikâyet et',
  subtitle: 'Bu içerikle ilgili sorunu bize anlat.',
  chooseReason: 'Bir neden seç',
  send: 'Şikâyeti gönder',
  sending: 'Şikâyet gönderiliyor…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Taciz veya zorbalık',
  reasonHate: 'Nefret söylemi veya ayrımcılık',
  reasonSexual: 'Cinsel içerik',
  reasonViolence: 'Şiddet',
  reasonScam: 'Dolandırıcılık veya sahtekârlık',
  reasonImpersonation: 'Kimliğe bürünme',
  reasonIllegal: 'Yasa dışı içerik',
  reasonSelfHarm: 'Kendine zarar verme veya intihar',
  reasonOther: 'Başka bir neden',
  successTitle: 'Şikâyetin alındı',
  successBody: 'Weë\'yi güvenli tutmamıza yardım ettiğin için teşekkürler.',
  duplicateTitle: 'Bunu zaten şikâyet etmiştin',
  duplicateBody: 'Bu içerikle ilgili şikâyetini zaten aldık.',
  errorTitle: 'Şikâyetin gönderilemedi.',
  errorBody: 'Yeniden dene.',
  errorOffline: 'İnternet bağlantısı yok. Yeniden dene.',
  errorRateLimited: 'Arka arkaya çok fazla şikâyet gönderdin. Daha sonra yeniden dene.',
  errorUnavailable: 'Bu içerik artık mevcut değil.',
};
