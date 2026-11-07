/*
 * Moderación en croata: denunciar algo —una publicación, un comentario, un
 * perfil— desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). Los motivos son categorías en lenguaje normal, no términos
 * legales. La confirmación dice solo lo que es verdad: que el reporte se
 * RECIBIÓ. Las frases que en español llevan participio con género («Ya lo
 * habías denunciado», «Has enviado») se dicen sin él.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Prijavi',
  subtitle: 'Reci nam što nije u redu s ovim sadržajem.',
  chooseReason: 'Odaberi razlog',
  send: 'Pošalji prijavu',
  sending: 'Slanje prijave…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Uznemiravanje ili zastrašivanje',
  reasonHate: 'Mržnja ili diskriminacija',
  reasonSexual: 'Golotinja ili seksualni sadržaj',
  reasonViolence: 'Nasilje',
  reasonScam: 'Prijevara ili obmana',
  reasonImpersonation: 'Lažno predstavljanje',
  reasonIllegal: 'Nezakonit sadržaj',
  reasonIntellectualProperty: 'Intelektualno vlasništvo',
  reasonOther: 'Drugi razlog',
  successTitle: 'Prijava zaprimljena',
  successBody: 'Hvala što nam pomažeš održati Weë sigurnim.',
  duplicateTitle: 'Već prijavljeno',
  duplicateBody: 'Tvoju prijavu ovog sadržaja već smo zaprimili.',
  errorTitle: 'Nismo mogli poslati tvoju prijavu.',
  errorBody: 'Pokušaj ponovno.',
  errorOffline: 'Nema veze s internetom. Pokušaj ponovno.',
  errorRateLimited: 'Previše prijava zaredom. Pokušaj ponovno kasnije.',
  errorUnavailable: 'Ovaj sadržaj više nije dostupan.',
};
