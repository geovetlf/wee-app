/*
 * FINÉS — Los cinco destinos de la barra inferior. Tipado contra el español:
 * si allí hay una clave que aquí falta, no compila.
 *
 * «Ir a {{nombre}}» se dice «Siirry kohtaan {{nombre}}»: el caso va en la
 * palabra anterior y el nombre entra en nominativo. «Weë AI» no se declina;
 * se le añade una cabeza («Weë AI -osioon», «Weë-avustajalle»).
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Koti',
  search: 'Hae',
  create: 'Luo',
  talk: 'WeeTalk',
  notifications: 'Ilmoitukset',
  current: 'nykyinen osio',
  goTo: 'Siirry kohtaan {{nombre}}',
  weeNavigation: 'Weë-navigointi',
  goHome: 'Siirry Koti-näkymään',
  myProfile: 'Siirry omaan profiiliin',
  openWeeAi: 'Avaa Weë AI',
  goToWeeAi: 'Siirry Weë AI -osioon',
  weeAiQuestion: 'Mitä haluat luoda tänään?',
  weeAiPitch: 'Kerro Weë-avustajalle, mitä haluat. Weë hoitaa tekoälyn.',
  brandSlogan: 'Kuvittele · Luo · Yhdistä',
  documentTitle: 'Weë - {{eslogan}}',
};
