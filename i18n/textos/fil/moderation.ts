/*
 * FILIPINO — Moderación: denunciar una publicación, un comentario o un perfil desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Denunciar» es «I-report» y el reporte, «report» (glosario 11.2 y 11.6), como en Facebook en filipino. Los motivos
 * son los de la fila «Motivo de denuncia» del glosario 11.6, en lenguaje corriente: «Pangha-harass o pambu-bully»,
 * «Poot o diskriminasyon», «Sekswal na content», «Scam o panloloko», «Pagpapanggap bilang ibang tao», «Pananakit sa
 * sarili o pagpapakamatay»… y «Spam», que se escribe igual porque es también la palabra filipina. La confirmación
 * dice solo que el report se RECIBIÓ —«Natanggap ang report» (guía § 10)—, nunca que se revisará ni que se quitará
 * nada, y el agradecimiento va sin «po», con «ligtas» y «Weë» con su marcador de cosa («ang Weë»). Cuando Weë habla
 * de sí mismo usa el «kami» exclusivo (§ 2): «Natanggap na namin…», «Sabihin sa amin…». Los errores siguen el patrón
 * «Hindi ma-…» / «Subukan ulit» (§ 3.4) y la falta de conexión, la frase de la guía (§ 10). «Seguidos» es «nang
 * sunod-sunod», con «nang» de modo (§ 5.3).
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'I-report',
  subtitle: 'Sabihin sa amin kung ano ang problema sa content na ito.',
  chooseReason: 'Pumili ng dahilan',
  send: 'Ipadala ang report',
  sending: 'Ipinapadala ang report…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Pangha-harass o pambu-bully',
  reasonHate: 'Poot o diskriminasyon',
  reasonSexual: 'Kahubaran o sekswal na content',
  reasonViolence: 'Karahasan',
  reasonScam: 'Scam o panloloko',
  reasonImpersonation: 'Pagpapanggap bilang ibang tao',
  reasonIllegal: 'Ilegal na content',
  reasonIntellectualProperty: 'Intelektuwal na pag-aari',
  reasonOther: 'Iba pang dahilan',
  successTitle: 'Natanggap ang report',
  successBody: 'Salamat sa pagtulong na panatilihing ligtas ang Weë.',
  duplicateTitle: 'Na-report mo na ito',
  duplicateBody: 'Natanggap na namin ang report mo tungkol sa content na ito.',
  errorTitle: 'Hindi maipadala ang report mo.',
  errorBody: 'Subukan ulit.',
  errorOffline: 'Walang koneksyon sa internet. Subukan ulit.',
  errorRateLimited: 'Masyadong maraming report ang naipadala mo nang sunod-sunod. Subukan ulit mamaya.',
  errorUnavailable: 'Hindi na available ang content na ito.',
};
