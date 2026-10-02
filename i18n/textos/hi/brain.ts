/*
 * HINDI — WEË BRAIN: el sitio de trabajo del cerebro de Weë (la cabecera, el
 * dibujo del cerebro con sus satélites, la caja y el bloque de respuestas).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * "Weë Brain" y los nombres de los seis satélites son marca y no pasan por
 * aquí: salen de `constants/weeExperiences.ts`.
 *
 * Weë Brain habla en primera persona y sin género (docs/I18N-HINDI.md § 5.3):
 * «Cómo quieres que te conteste» es «चुनें कि मैं आपको कैसे जवाब दूँ.», con el
 * subjuntivo, que no concuerda. Cuando Weë Brain es sujeto en tercera persona
 * va en masculino singular, como Weë: «Weë Brain, जो … जुड़ा है».
 *
 * El eslogan son cuatro imperativos de «आप», uno por cosa, como el español:
 * «सोचें · पूछें · बनाएँ · जुड़ें». «Imagina» es «सोचें»: «कल्पना करें» ocuparía el
 * doble en una línea que es un lema. «Todo el poder de Weë» es «Weë की पूरी
 * ताकत», con la posposición separada de la marca (§ 6).
 *
 * «Buscar en internet» es «इंटरनेट पर खोजें», igual que `weeai.searchInternet`:
 * es el mismo ajuste dicho en dos sitios. «Ajustes» es «सेटिंग» (glosario
 * § 11.1) e «Imagen», «इमेज».
 *
 * El bloque de respuestas va en la línea pequeña del costo, entre « · »: una
 * etiqueta corta con la cuenta a la vista, «12 में से 11 जवाब बाकी» («जवाब» no
 * cambia en plural). La línea sigue con `weeai.creditsLeft`, que dice
 * «240 Credits बाकी» para que las dos cosas que quedan no se confundan.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'हर काम के लिए आपका स्मार्ट असिस्टेंट',
  slogan: 'सोचें · पूछें · बनाएँ · जुड़ें',
  description: 'Weë की पूरी ताकत, एक ही बातचीत में.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain, जो Weë AI के बाकी सभी सेक्शन से जुड़ा है',
  goTo: '{{seccion}} पर जाएँ',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'अपना मैसेज यहाँ लिखें…',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'चुनें कि मैं आपको कैसे जवाब दूँ.',
  searchGroup: 'इंटरनेट पर खोजें',
  imageLabel: 'इमेज',
  settingsLabel: 'सेटिंग',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: '{{total}} में से {{restantes}} जवाब बाकी',
};
