/*
 * ISLANDÉS (is · is-IS) — Moderación: denunciar una publicación, un comentario o un perfil.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Glosario § 4: «Tilkynna» (denunciar), «Tilkynning» (reporte), «Ruslefni», «Áreitni eða einelti»…
 * La confirmación dice solo que la tilkynning se RECIBIÓ. «Suplantación» = «Að villa á sér heimildir»
 * (pendiente, guía § 6). «Weë» queda invariable tras «halda … öruggu» con el sustantivo puente «forritinu».
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Tilkynna',
  subtitle: 'Segðu okkur hvað er að þessu efni.',
  chooseReason: 'Veldu ástæðu',
  send: 'Senda tilkynningu',
  sending: 'Sendir tilkynningu…',
  reasonSpam: 'Ruslefni',
  reasonHarassment: 'Áreitni eða einelti',
  reasonHate: 'Hatur eða mismunun',
  reasonSexual: 'Nekt eða kynferðislegt efni',
  reasonViolence: 'Ofbeldi',
  reasonScam: 'Svindl eða svik',
  reasonImpersonation: 'Að villa á sér heimildir',
  reasonIllegal: 'Ólöglegt efni',
  reasonIntellectualProperty: 'Hugverkaréttindi',
  reasonOther: 'Önnur ástæða',
  successTitle: 'Tilkynning móttekin',
  successBody: 'Takk fyrir að hjálpa okkur að halda forritinu Weë öruggu.',
  duplicateTitle: 'Þú hefur þegar tilkynnt þetta',
  duplicateBody: 'Við höfum þegar fengið tilkynningu þína um þetta efni.',
  errorTitle: 'Ekki tókst að senda tilkynninguna þína.',
  errorBody: 'Reyndu aftur.',
  errorOffline: 'Engin nettenging. Reyndu aftur.',
  errorRateLimited: 'Þú hefur sent margar tilkynningar í röð. Reyndu aftur síðar.',
  errorUnavailable: 'Þetta efni er ekki lengur tiltækt.',
};
