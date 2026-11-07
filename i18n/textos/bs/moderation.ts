/*
 * BOSNIO — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los motivos son categorías en lenguaje normal, no términos legales. La
 * confirmación dice solo que la denuncia («prijava») se RECIBIÓ.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Prijavi',
  subtitle: 'Reci nam šta nije u redu s ovim sadržajem.',
  chooseReason: 'Odaberi razlog',
  send: 'Pošalji prijavu',
  sending: 'Slanje prijave…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Uznemiravanje ili zastrašivanje',
  reasonHate: 'Mržnja ili diskriminacija',
  reasonSexual: 'Golotinja ili seksualni sadržaj',
  reasonViolence: 'Nasilje',
  reasonScam: 'Prevara',
  reasonImpersonation: 'Lažno predstavljanje',
  reasonIllegal: 'Nezakonit sadržaj',
  reasonIntellectualProperty: 'Intelektualno vlasništvo',
  reasonOther: 'Drugi razlog',
  successTitle: 'Prijava primljena',
  successBody: 'Hvala što nam pomažeš da Weë ostane siguran.',
  duplicateTitle: 'Ovo je već prijavljeno',
  duplicateBody: 'Tvoju prijavu ovog sadržaja već smo primili.',
  errorTitle: 'Nismo mogli poslati tvoju prijavu.',
  errorBody: 'Pokušaj ponovo.',
  errorOffline: 'Nema veze s internetom. Pokušaj ponovo.',
  errorRateLimited: 'Previše prijava zaredom. Pokušaj kasnije.',
  errorUnavailable: 'Ovaj sadržaj više nije dostupan.',
};
