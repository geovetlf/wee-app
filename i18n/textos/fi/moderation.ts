/*
 * FINÉS — Moderación: denunciar algo desde cualquier sitio de Weë. Tipado
 * contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Denunciar» es «Ilmianna» (glosario) y el reporte es «ilmoitus». «Spam» se
 * queda en inglés, como en el español y el inglés. La confirmación dice solo lo
 * que es verdad: que el reporte se RECIBIÓ («vastaanotettu»).
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Ilmianna',
  subtitle: 'Kerro, mitä tässä sisällössä on vialla.',
  chooseReason: 'Valitse syy',
  send: 'Lähetä ilmoitus',
  sending: 'Lähetetään ilmoitusta…',
  reasonSpam: 'Roskasisältö',
  reasonHarassment: 'Häirintä tai kiusaaminen',
  reasonHate: 'Vihapuhe tai syrjintä',
  reasonSexual: 'Alastomuus tai seksuaalinen sisältö',
  reasonViolence: 'Väkivalta',
  reasonScam: 'Huijaus tai petos',
  reasonImpersonation: 'Toisena henkilönä esiintyminen',
  reasonIllegal: 'Laiton sisältö',
  reasonIntellectualProperty: 'Immateriaalioikeudet',
  reasonOther: 'Muu syy',
  successTitle: 'Ilmoitus vastaanotettu',
  successBody: 'Kiitos, että autat pitämään Weë-yhteisön turvallisena.',
  duplicateTitle: 'Olet jo ilmiantanut tämän',
  duplicateBody: 'Olemme jo saaneet ilmoituksesi tästä sisällöstä.',
  errorTitle: 'Ilmoitustasi ei voitu lähettää.',
  errorBody: 'Yritä uudelleen.',
  errorOffline: 'Ei yhteyttä. Yritä uudelleen.',
  errorRateLimited: 'Olet lähettänyt monta ilmoitusta peräkkäin. Yritä myöhemmin uudelleen.',
  errorUnavailable: 'Tämä sisältö ei ole enää saatavilla.',
};
