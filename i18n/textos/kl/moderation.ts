/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Moderación: denunciar algo desde cualquier sitio.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Denunciar = «Naammagittaalliuutigiuk», reporte =
 * «Naammagittaalliuut» (guía §4.7). La confirmación dice solo que el reporte se RECIBIÓ.
 * «Spam» se deja como préstamo internacional (guía §4.7, pendiente de confirmación nativa).
 * Moderation Core (2026-11-07): «Propiedad intelectual» = «Isumassarsianut pisinnaatitaaffiit» (confianza
 * baja-pendiente, traducción de agente). La lista del dueño dice «desnudez y contenido sexual»; sin un término
 * fiable para «desnudez», `reasonSexual` sigue diciendo contenido sexual hasta la revisión nativa.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Naammagittaalliuutigiuk',
  subtitle: 'Imaq una pillugu suna pisoqarnersoq oqaluttuarisigut.',
  chooseReason: 'Pissutaa toqqaruk',
  send: 'Naammagittaalliuut nassiuguk',
  sending: 'Naammagittaalliuut nassiunneqarpoq…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Ajornartorsiortitsineq qunusaarinerluunniit',
  reasonHate: 'Uumiginninneq assigiinngisitsinerluunniit',
  reasonSexual: 'Atoqatigiinnermut tunngasoq',
  reasonViolence: 'Nakuuserneq',
  reasonScam: 'Peqquserlunneq',
  reasonImpersonation: 'Inuup allap atianik atuineq',
  reasonIllegal: 'Inatsisinik unioqqutitsisoq',
  reasonIntellectualProperty: 'Isumassarsianut pisinnaatitaaffiit',
  reasonSelfHarm: 'Imminut ajoqusersorneq imminornerluunniit',
  reasonOther: 'Pissut alla',
  successTitle: 'Naammagittaalliuut tigusaavoq',
  successBody: 'Qujanaq ikiuinerit pillugu. Taamaalilluni Weë isumannaatsuujuarsinnaavoq.',
  duplicateTitle: 'Tamanna naammagittaalliuutigereersimavat',
  duplicateBody: 'Imaq una pillugu naammagittaalliuutit tigureerparput.',
  errorTitle: 'Naammagittaalliuutip nassiunnera iluatsinngilaq.',
  errorBody: 'Misileqqiguk.',
  errorOffline: 'Attaveqanngilaq. Misileqqiguk.',
  errorRateLimited: 'Naammagittaalliuutit amerlavallaaqisut ataatsikkut nassiussimavatit. Kingusinnerusukkut misileqqiguk.',
  errorUnavailable: 'Imaq una atorneqarsinnaajunnaarpoq.',
};
