/*
 * IRLANDÉS — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Brain» y los nombres de los seis satélites son marca y salen de `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Do chúntóir cliste do gach rud',
  slogan: 'Samhlaigh · Fiafraigh · Cruthaigh · Nasc',
  description: 'Cumhacht iomlán Weë, in aon chomhrá amháin.',

  systemLabel: 'Weë Brain, nasctha leis na rannóga eile de Weë AI',
  goTo: 'Téigh chuig {{seccion}}',

  placeholder: 'Scríobh do theachtaireacht anseo...',

  settingsHint: 'Conas ba mhaith leat go bhfreagródh sé thú.',
  searchGroup: 'Cuardaigh ar an idirlíon',

  imageLabel: 'Íomhá',
  settingsLabel: 'Socruithe',

  blockLeft: 'Tá {{restantes}} as {{total}} freagra fágtha agat',
};
