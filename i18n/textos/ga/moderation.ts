/*
 * IRLANDÉS — Moderación: denunciar algo desde cualquier sitio de Weë.
 *
 * Los motivos son categorías en lenguaje normal, no términos legales. La confirmación dice solo
 * que el reporte se RECIBIÓ.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Tuairiscigh',
  subtitle: 'Inis dúinn cad atá cearr leis an ábhar seo.',
  chooseReason: 'Roghnaigh cúis',
  send: 'Seol an tuairisc',
  sending: 'Ag seoladh na tuairisce…',
  reasonSpam: 'Turscar',
  reasonHarassment: 'Ciapadh nó imeaglú',
  reasonHate: 'Fuath nó idirdhealú',
  reasonSexual: 'Nochtacht nó ábhar gnéasach',
  reasonViolence: 'Foréigean',
  reasonScam: 'Caimiléireacht nó calaois',
  reasonImpersonation: 'Pearsanú duine eile',
  reasonIllegal: 'Ábhar neamhdhleathach',
  reasonIntellectualProperty: 'Maoin intleachtúil',
  reasonOther: 'Cúis eile',
  successTitle: 'Tuairisc faighte',
  successBody: 'Go raibh maith agat as cabhrú linn Weë a choinneáil sábháilte.',
  duplicateTitle: 'Thuairiscigh tú é seo cheana',
  duplicateBody: 'Fuaireamar do thuairisc faoin ábhar seo cheana.',
  errorTitle: 'Níorbh fhéidir linn do thuairisc a sheoladh.',
  errorBody: 'Bain triail eile as.',
  errorOffline: 'Níl aon nasc ann. Bain triail eile as.',
  errorRateLimited: 'Sheol tú an iomarca tuairiscí as a chéile. Bain triail eile as ar ball.',
  errorUnavailable: 'Níl an t-ábhar seo ar fáil a thuilleadh.',
};
