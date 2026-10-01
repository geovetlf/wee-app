/*
 * DANÉS — WEË BRAIN: el sitio de trabajo del cerebro de Weë (la cabecera, el dibujo del cerebro con sus satélites,
 * la caja y el bloque de respuestas).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. "Weë Brain" y los nombres de los seis
 * satélites son marca y no pasan por aquí: salen de `constants/weeExperiences.ts`.
 *
 * «Todo el poder de Weë» pediría el genitivo pegado a la marca («Weës»), que la guía prohíbe (§ 4): la frase se
 * reescribe, «Alt, hvad Weë kan, samlet i én samtale.». Igual «conectado con las demás secciones de Weë AI»:
 * «forbundet med resten af Weë AI».
 *
 * El eslogan son cuatro imperativos, uno por cosa, como el español: «Drøm · Spørg · Skab · Forbind». «Imagina» es
 * «Drøm», como se dice en un lema danés («Forestil dig» ocuparía el doble y rompería el ritmo de una palabra).
 *
 * «Buscar en internet» es «Søg på internettet»: es el mismo ajuste que `weeai.searchInternet`, y las dos claves
 * tienen que decir lo mismo. «Ajustes» es «Indstillinger» (glosario § 9.1) e «Imagen», «Billede». La pista de los
 * ajustes la dice Weë Brain en primera persona, como el español: «Vælg, hvordan jeg skal svare dig.».
 *
 * El bloque de respuestas va en la línea pequeña del costo, entre « · »: «11 af 12 svar tilbage» («svar» no cambia
 * en plural, así que vale para cualquier cifra).
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Din smarte assistent til alt',
  slogan: 'Drøm · Spørg · Skab · Forbind',
  description: 'Alt, hvad Weë kan, samlet i én samtale.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, forbundet med resten af Weë AI',
  goTo: 'Gå til {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Skriv din besked her…',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Vælg, hvordan jeg skal svare dig.',
  searchGroup: 'Søg på internettet',
  imageLabel: 'Billede',
  settingsLabel: 'Indstillinger',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: '{{restantes}} af {{total}} svar tilbage',
};
