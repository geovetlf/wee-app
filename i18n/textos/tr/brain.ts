/*
 * TURCO — WEË BRAIN: el sitio de trabajo del cerebro de Weë (la cabecera, el
 * dibujo del cerebro con sus satélites, la caja y el bloque de respuestas).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * "Weë Brain" y los nombres de los seis satélites son marca y no pasan por
 * aquí: salen de `constants/weeExperiences.ts`.
 *
 * «Ir a {{seccion}}» es «{{seccion}} bölümüne git»: el hueco es una marca
 * («Weë Studio») y el dativo lo lleva «bölüm», nunca el hueco (guía § 4); es
 * la misma forma que `weeai.goToSpecialist`. «Buscar en internet» es
 * «İnternette ara», igual que `weeai.searchInternet`: es el mismo ajuste dicho
 * en dos sitios.
 *
 * El bloque de respuestas (`blockLeft`) va en la línea pequeña del costo,
 * entre separadores « · », y por eso es una etiqueta corta con la cuenta a la
 * vista: «Kalan yanıt: 11/12». La línea sigue con `weeai.creditsLeft`, que dice
 * «kalan bakiye» para que las dos cosas que quedan no se confundan.
 *
 * El eslogan son cuatro imperativos de «sen» (guía § 2), como el español.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Her şey için akıllı asistanın',
  slogan: 'Hayal et · Sor · Oluştur · Bağlan',
  description: 'Weë\'nin tüm gücü, tek bir sohbette.',
  systemLabel: 'Weë Brain, Weë AI\'daki diğer bölümlere bağlı',
  goTo: '{{seccion}} bölümüne git',
  placeholder: 'Mesajını buraya yaz…',
  settingsHint: 'Sana nasıl yanıt vereceğimi seç.',
  searchGroup: 'İnternette ara',
  imageLabel: 'Görsel',
  settingsLabel: 'Ayarlar',
  blockLeft: 'Kalan yanıt: {{restantes}}/{{total}}',
};
