/*
 * SUECO — WEË BRAIN: el sitio de trabajo del cerebro de Weë (la cabecera, el
 * dibujo del cerebro con sus satélites, la caja y el bloque de respuestas).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * "Weë Brain" y los nombres de los seis satélites son marca y no pasan por
 * aquí: salen de `constants/weeExperiences.ts`.
 *
 * «Todo el poder de Weë» pediría el genitivo pegado a la marca («Weës»), que
 * la guía prohíbe (§ 4): la frase se reescribe, «Allt som Weë kan, i ett enda
 * samtal.». Igual «conectado con las demás secciones de Weë AI»: «kopplat
 * till resten av Weë AI», en neutro, como se habla en sueco de un producto.
 *
 * El eslogan son cuatro imperativos, uno por cosa, como el español: «Dröm ·
 * Fråga · Skapa · Koppla ihop». «Imagina» es «Dröm», como se dice en un lema
 * sueco («Föreställ dig» ocuparía el doble).
 *
 * «Buscar en internet» es «Sök på internet», igual que `weeai.searchInternet`:
 * es el mismo ajuste dicho en dos sitios. «Ajustes» es «Inställningar»
 * (glosario § 9.1) e «Imagen», «Bild».
 *
 * El bloque de respuestas va en la línea pequeña del costo, entre « · »: una
 * etiqueta corta con la cuenta a la vista, «11 av 12 svar kvar» («svar» no
 * cambia en plural). La línea sigue con `weeai.creditsLeft`, que dice «du har
 * 240 Credits kvar» para que las dos cosas que quedan no se confundan.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Din smarta assistent för allt',
  slogan: 'Dröm · Fråga · Skapa · Koppla ihop',
  description: 'Allt som Weë kan, i ett enda samtal.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, kopplat till resten av Weë AI',
  goTo: 'Gå till {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Skriv ditt meddelande här…',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'Välj hur du vill att jag svarar.',
  searchGroup: 'Sök på internet',
  imageLabel: 'Bild',
  settingsLabel: 'Inställningar',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: '{{restantes}} av {{total}} svar kvar',
};
