/*
 * SERBIO (ћирилица) — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weë Brain» y los nombres de los satélites son marca y salen de
 * `constants/weeExperiences.ts`; aquí solo está lo que los rodea.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Твој паметни асистент за све',
  slogan: 'Замисли · Питај · Створи · Повежи се',
  description: 'Сва снага апликације Weë у једном разговору.',

  systemLabel: 'Weë Brain, повезан с осталим одељцима Weë AI',
  goTo: 'Иди на {{seccion}}',

  placeholder: 'Напиши овде своју поруку...',

  settingsHint: 'Како желиш да ти одговара.',
  searchGroup: 'Претражи интернет',

  imageLabel: 'Слика',
  settingsLabel: 'Подешавања',

  blockLeft: 'Преостало ти је {{restantes}} од {{total}} одговора',
};
