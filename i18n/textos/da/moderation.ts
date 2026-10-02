/*
 * DANÉS — Moderación: denunciar una publicación, un comentario o un perfil desde cualquier sitio
 * de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Denunciar» es «Anmeld» y el reporte, «anmeldelse» (pl. anmeldelser), como en Meta y en el texto
 * danés de la DSA (glosario 9.2; «Rapportér» descartado). La confirmación dice solo que la
 * anmeldelse se RECIBIÓ —«Anmeldelsen er modtaget»—: nunca que se revisará ni que se quitará nada.
 * Los motivos van en lenguaje corriente, como en Instagram; «Spam» se escribe igual que en español
 * porque es también la palabra danesa, y «Suplantación de identidad» es «Udgiver sig for at være en
 * anden», la fórmula de Meta en danés («identitetstyveri» es el delito de usar los datos de otro). `successBody` no pone un adjetivo junto a Weë: «gøre Weë til et
 * trygt sted». Los errores siguen el patrón «… kunne ikke …» / «Prøv igen» de la guía § 8, y la
 * falta de conexión es la frase fija de la guía.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Anmeld',
  subtitle: 'Fortæl os, hvad der er galt med dette indhold.',
  chooseReason: 'Vælg en årsag',
  send: 'Send anmeldelse',
  sending: 'Sender anmeldelse…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Chikane eller mobning',
  reasonHate: 'Had eller diskrimination',
  reasonSexual: 'Seksuelt indhold',
  reasonViolence: 'Vold',
  reasonScam: 'Svindel eller bedrageri',
  reasonImpersonation: 'Udgiver sig for at være en anden',
  reasonIllegal: 'Ulovligt indhold',
  reasonSelfHarm: 'Selvskade eller selvmord',
  reasonOther: 'Anden årsag',
  successTitle: 'Anmeldelsen er modtaget',
  successBody: 'Tak, fordi du hjælper med at gøre Weë til et trygt sted.',
  duplicateTitle: 'Du har allerede anmeldt dette',
  duplicateBody: 'Vi har allerede modtaget din anmeldelse af dette indhold.',
  errorTitle: 'Vi kunne ikke sende din anmeldelse.',
  errorBody: 'Prøv igen.',
  errorOffline: 'Der er ingen internetforbindelse. Prøv igen.',
  errorRateLimited: 'Du har sendt mange anmeldelser lige efter hinanden. Prøv igen senere.',
  errorUnavailable: 'Dette indhold er ikke længere tilgængeligt.',
};
