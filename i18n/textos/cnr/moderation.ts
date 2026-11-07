/*
 * Moderación en montenegrino (ijekaviano, latino): denunciar algo desde cualquier sitio de Weë.
 * Los motivos son categorías en lenguaje normal, no términos legales; la confirmación dice solo que la prijava se recibió.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Prijavi',
  subtitle: 'Reci nam što se dešava s ovim sadržajem.',
  chooseReason: 'Izaberi razlog',
  send: 'Pošalji prijavu',
  sending: 'Slanje prijave…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Uznemiravanje ili zastrašivanje',
  reasonHate: 'Mržnja ili diskriminacija',
  reasonSexual: 'Golotinja ili seksualni sadržaj',
  reasonViolence: 'Nasilje',
  reasonScam: 'Prevara ili obmana',
  reasonImpersonation: 'Lažno predstavljanje',
  reasonIllegal: 'Nezakonit sadržaj',
  reasonIntellectualProperty: 'Intelektualna svojina',
  reasonOther: 'Drugi razlog',
  successTitle: 'Prijava je primljena',
  successBody: 'Hvala što nam pomažeš da Weë ostane bezbjedan.',
  duplicateTitle: 'Ovo je već prijavljeno',
  duplicateBody: 'Već smo primili tvoju prijavu za ovaj sadržaj.',
  errorTitle: 'Nijesmo mogli da pošaljemo tvoju prijavu.',
  errorBody: 'Pokušaj ponovo.',
  errorOffline: 'Nema veze s internetom. Pokušaj ponovo.',
  errorRateLimited: 'Poslato je mnogo prijava zaredom. Pokušaj kasnije.',
  errorUnavailable: 'Ovaj sadržaj više nije dostupan.',
};
