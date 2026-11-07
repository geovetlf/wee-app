/*
 * GRIEGO — Denunciar: la hoja única de reportes. Tipado contra el español.
 * «Denunciar» = «Αναφορά» (glosario); «reporte» también «αναφορά».
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Αναφορά',
  subtitle: 'Πες μας τι συμβαίνει με αυτό το περιεχόμενο.',
  chooseReason: 'Διάλεξε έναν λόγο',
  send: 'Αποστολή αναφοράς',
  sending: 'Αποστολή αναφοράς…',
  reasonSpam: 'Ανεπιθύμητο περιεχόμενο (spam)',
  reasonHarassment: 'Παρενόχληση ή εκφοβισμός',
  reasonHate: 'Συμπεριφορά μίσους ή διακρίσεις',
  reasonSexual: 'Γυμνό ή σεξουαλικό περιεχόμενο',
  reasonViolence: 'Βία',
  reasonScam: 'Απάτη',
  reasonImpersonation: 'Πλαστοπροσωπία',
  reasonIllegal: 'Παράνομο περιεχόμενο',
  reasonIntellectualProperty: 'Πνευματική ιδιοκτησία',
  reasonOther: 'Άλλος λόγος',
  successTitle: 'Λάβαμε την αναφορά σου',
  successBody: 'Ευχαριστούμε που μας βοηθάς να κρατάμε το Weë ασφαλές.',
  duplicateTitle: 'Το έχεις ήδη αναφέρει',
  duplicateBody: 'Έχουμε ήδη λάβει την αναφορά σου για αυτό το περιεχόμενο.',
  errorTitle: 'Δεν μπορέσαμε να στείλουμε την αναφορά σου.',
  errorBody: 'Δοκίμασε ξανά.',
  errorOffline: 'Δεν υπάρχει σύνδεση. Δοκίμασε ξανά.',
  errorRateLimited: 'Έστειλες πολλές αναφορές τη μία μετά την άλλη. Δοκίμασε αργότερα.',
  errorUnavailable: 'Αυτό το περιεχόμενο δεν είναι πλέον διαθέσιμο.',
};
