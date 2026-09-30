/*
 * SUECO — Moderación: denunciar una publicación, un comentario o un perfil desde cualquier sitio
 * de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Denunciar» es «Anmäl» y el reporte, «anmälan» (pl. anmälningar), como en Meta, TikTok y Bluesky
 * (glosario 9.2). La confirmación dice solo que la anmälan se RECIBIÓ —«Anmälan har tagits
 * emot»—: nunca que se revisará ni que se quitará nada. Los motivos van en lenguaje corriente,
 * como en Instagram y TikTok; «Spam» se escribe igual que en español porque es también la palabra
 * sueca. `successBody` no pone un adjetivo junto a Weë (no se sabe su género): «göra Weë till en
 * trygg plats». Los errores siguen el patrón «Det gick inte att …» / «Försök igen» de la guía.
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'Anmäl',
  subtitle: 'Berätta vad som är fel med det här innehållet.',
  chooseReason: 'Välj en anledning',
  send: 'Skicka anmälan',
  sending: 'Skickar anmälan…',
  reasonSpam: 'Spam',
  reasonHarassment: 'Trakasserier eller mobbning',
  reasonHate: 'Hat eller diskriminering',
  reasonSexual: 'Sexuellt innehåll',
  reasonViolence: 'Våld',
  reasonScam: 'Bluff eller bedrägeri',
  reasonImpersonation: 'Identitetsstöld',
  reasonIllegal: 'Olagligt innehåll',
  reasonSelfHarm: 'Självskada eller självmord',
  reasonOther: 'Annan anledning',
  successTitle: 'Anmälan har tagits emot',
  successBody: 'Tack för att du hjälper oss att göra Weë till en trygg plats.',
  duplicateTitle: 'Du har redan anmält det här',
  duplicateBody: 'Vi har redan tagit emot din anmälan om det här innehållet.',
  errorTitle: 'Det gick inte att skicka anmälan.',
  errorBody: 'Försök igen.',
  errorOffline: 'Ingen internetanslutning. Försök igen.',
  errorRateLimited: 'Du har skickat många anmälningar i rad. Försök igen senare.',
  errorUnavailable: 'Det här innehållet är inte längre tillgängligt.',
};
