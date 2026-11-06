/*
 * ALEMÁN SUIZO (de-CH, adaptado de `de/servidor`: ss, «…» y léxico suizo) — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`). Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Los comensales ya traen su preposición
 * («für zwei»); el tiempo va tras una etiqueta («Zeit: eine halbe Stunde») porque tras «in» pediría dativo; y las
 * habitaciones son todas neutras o femeninas, de modo que entran igual como sujeto y tras «für».
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  chefExplicaRetoqueLuz: 'Ich gehe von deinem Foto aus und verbessere das Licht. Das Gericht bleibt genau, wie es ist.',
  chefExplicaRetoqueFondo: 'Ich gehe von deinem Foto aus und ändere den Hintergrund. Das Gericht bleibt genau, wie es ist.',
  chefExplicaRetoqueApetitoso: 'Ich gehe von deinem Foto aus und lasse es appetitlicher aussehen. Das Gericht bleibt genau, wie es ist.',
  chefExplicaRetoqueRestaurante: 'Ich gehe von deinem Foto aus und gebe ihm den Look eines Restaurantfotos. Das Gericht bleibt genau, wie es ist.',
  chefExplicaRetoqueQuitar: 'Ich gehe von deinem Foto aus und entferne, was stört. Das Gericht bleibt genau, wie es ist.',
  chefExplicaRetoqueNoSe: 'Ich gehe von deinem Foto aus und lasse es besser aussehen, ohne das Gericht zu verändern. Das Gericht bleibt genau, wie es ist.',
  chefExplicaRetoqueLibre: 'Ich gehe von deinem Foto aus und nehme nur die Änderungen vor, um die du gebeten hast. Das Gericht bleibt genau, wie es ist.',

  chefExplicaMenuTresDias: 'Ich stelle ein Menü für drei Tage zusammen, {{comensales}}, und gebe dir die Einkaufsliste.',
  chefExplicaMenuTodaLaSemana: 'Ich stelle ein Menü für die ganze Woche zusammen, {{comensales}}, und gebe dir die Einkaufsliste.',
  chefExplicaMenuParaLaSemana: 'Ich stelle ein Menü für die Woche zusammen, {{comensales}}, und gebe dir die Einkaufsliste.',
  chefExplicaMenu: 'Ich stelle ein Menü zusammen (Dauer: {{duracion}}), {{comensales}}, und gebe dir die Einkaufsliste.',

  chefExplicaRecetaEnTiempo: 'Ich schreibe ein Schritt-für-Schritt-Rezept {{comensales}} (Zeit: {{tiempo}}) und erstelle ein Foto des fertigen Gerichts.',
  chefExplicaRecetaSinApuro: 'Ich schreibe ein Schritt-für-Schritt-Rezept {{comensales}}, ganz ohne Zeitdruck, und erstelle ein Foto des fertigen Gerichts.',
  chefExplicaConLoQueTienesEnTiempo: 'Ich schreibe ein Rezept {{comensales}} mit dem, was du zu Hause hast (Zeit: {{tiempo}}), und erstelle ein Foto des fertigen Gerichts.',
  chefExplicaConLoQueTienesSinApuro: 'Ich schreibe ein Rezept {{comensales}} mit dem, was du zu Hause hast, ganz ohne Zeitdruck, und erstelle ein Foto des fertigen Gerichts.',
  chefExplicaSaludableEnTiempo: 'Ich schreibe ein gesundes Rezept {{comensales}} (Zeit: {{tiempo}}) und erstelle ein Foto des fertigen Gerichts.',
  chefExplicaSaludableSinApuro: 'Ich schreibe ein gesundes Rezept {{comensales}}, ganz ohne Zeitdruck, und erstelle ein Foto des fertigen Gerichts.',
  chefExplicaPostreEnTiempo: 'Ich schreibe ein Dessertrezept {{comensales}} (Zeit: {{tiempo}}) und erstelle ein Foto des fertigen Gerichts.',
  chefExplicaPostreSinApuro: 'Ich schreibe ein Dessertrezept {{comensales}}, ganz ohne Zeitdruck, und erstelle ein Foto des fertigen Gerichts.',

  chefDecisionAlgoRico: 'schlage ich dir etwas Leckeres und Einfaches vor, mit dem, was du meist zu Hause hast',
  chefDecisionParaDos: 'plane ich für zwei',
  chefDecisionSinApuro: 'plane ich ohne Zeitdruck',
  chefDecisionTodaLaSemana: 'plane ich für die ganze Woche',

  chefPasoMirarIngredientes: 'Ansehen, welche Zutaten du hast',
  chefPasoEscribirReceta: 'Das Rezept Schritt für Schritt schreiben',
  chefPasoFotoDelPlato: 'Ein Foto des Gerichts erstellen',
  chefPasoArmarMenu: 'Das Menü zusammenstellen',
  chefPasoPreciosIngredientes: 'Nachsehen, was die Zutaten kosten',
  chefPasoListaDeCompras: 'Die Einkaufsliste schreiben',
  chefPasoRetocarFoto: 'Das Foto deines Gerichts bearbeiten',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  homeExplicaConsejo: 'Ich sehe mir {{espacio}} an und sage dir, was ich ändern würde – Möbel, Farben, Aufteilung –, damit du entscheiden kannst, womit du anfängst. Bilder erstelle ich noch keine.',
  homeExplicaIdeas: 'Ich suche drei Ideen für {{espacio}} (Stil: {{estilo}}) und erkläre dir, wie du sie umsetzt.',
  homeExplicaDistribucion: 'Ich sehe mir {{espacio}} an, schlage dir eine Aufteilung vor, die den Platz besser nutzt, und zeige dir, wie es mit deinen eigenen Möbeln aussähe.',
  homeExplicaRedisenar: 'Ich gestalte {{espacio}} neu (Stil: {{estilo}}), in zwei Vorschlägen, und gebe dir die Liste mit Änderungen und Einkäufen.',
  homeExplicaMuebles: 'Ich wähle neue Möbel für {{espacio}} (Stil: {{estilo}}), in zwei Vorschlägen, und gebe dir die Liste mit Änderungen und Einkäufen.',
  homeExplicaColores: 'Ich gebe {{espacio}} einen neuen Stil und neue Farben (Stil: {{estilo}}), in zwei Vorschlägen, und gebe dir die Liste mit Änderungen und Einkäufen.',
  homeExplicaExterior: 'Ich gestalte deinen Aussenbereich (Stil: {{estilo}}), in zwei Vorschlägen, und gebe dir die Liste mit Änderungen und Einkäufen.',

  homeDecisionEmpiezoPorLaSala: 'fange ich mit dem Wohnzimmer an',
  homeDecisionEstiloAcogedor: 'habe ich einen gemütlichen Stil gewählt',

  homePasoMirarFotoDelEspacio: 'Das Foto des Raums ansehen',
  homePasoRedisenar: 'Neu gestalten: {{espacio}} (Stil: {{estilo}})',
  homePasoMuebles: 'Neue Möbel für {{espacio}} (Stil: {{estilo}})',
  homePasoColores: 'Stil und Farben ändern: {{espacio}} (Stil: {{estilo}})',
  homePasoExterior: 'Deinen Aussenbereich gestalten (Stil: {{estilo}})',
  homePasoListaDeCambios: 'Die Liste mit Änderungen und Einkäufen erstellen',
  homePasoProponerDistribucion: 'Eine bessere Aufteilung vorschlagen',
  homePasoMostrarComoQuedaria: 'Dir zeigen, wie es aussähe',
  homePasoBuscarIdeas: 'Ideen für {{espacio}} suchen',
  homePasoExplicarComoLograrlo: 'Dir erklären, wie du es umsetzt',
  homePasoMirarFotoDeTuEspacio: 'Das Foto deines Raums ansehen',
  homePasoContarQueVeo: 'Dir sagen, was ich sehe und was ich tun würde',

  /* Weë habla de «du»: esta pieza manda sobre la opción, escrita con la voz de la persona. */
  chefComensalesSoloParaMi: 'nur für dich',
  homeEspacioMiOficina: 'dein Büro',
};
