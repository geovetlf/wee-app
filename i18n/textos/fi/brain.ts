/*
 * FINÉS — WEË BRAIN, el sitio de trabajo del cerebro de Weë. Tipado contra el
 * español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Brain», «Weë AI» y los nombres de los satélites son marca y no se
 * declinan: cuando hace falta un caso se les pone una cabeza («Weë AI
 * -palvelun», «Weë-sovelluksen»). «Ir a {{seccion}}» lleva el caso en la
 * palabra anterior («Siirry kohtaan»). El bloque de respuestas se cuenta con
 * «{{restantes}}/{{total}}» para que no haya que concordar el sustantivo con
 * un número que no se conoce.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Älykäs avustajasi kaikkeen',
  slogan: 'Kuvittele · Kysy · Luo · Verkostoidu',
  description: 'Weë-sovelluksen koko voima yhdessä keskustelussa.',

  systemLabel: 'Weë Brain, yhteydessä Weë AI -palvelun muihin osioihin',
  goTo: 'Siirry kohtaan {{seccion}}',

  placeholder: 'Kirjoita viestisi tähän...',

  settingsHint: 'Miten haluat minun vastaavan.',
  searchGroup: 'Hae internetistä',

  imageLabel: 'Kuva',
  settingsLabel: 'Asetukset',

  blockLeft: 'Vastauksia jäljellä: {{restantes}}/{{total}}',
};
