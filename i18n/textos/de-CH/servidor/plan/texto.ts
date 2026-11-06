/*
 * ALEMÁN SUIZO (de-CH, adaptado de `de/servidor`: ss, «…» y léxico suizo) — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. El estilo musical llega ya formado («im
 * Pop-Stil», «als Ballade», ver `../opciones.ts`) y va tras una raya o entre paréntesis. Los idiomas son pieza propia
 * porque en alemán van con mayúscula: «auf Englisch».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  writerExplicaCitas: 'Ich suche echte Zitate zum Thema und gebe dir zu jedem die Quelle, damit du sie prüfen kannst.',
  writerPasoCitas: 'Die Zitate und ihre Quellen suchen',

  writerExplicaTraducir: 'Ich übersetze deinen Text auf {{idioma}} und bewahre dabei Sinn und Ton.',
  writerPasoTraducir: 'Auf {{idioma}} übersetzen',
  writerDecisionIdiomaIngles: 'übersetze ich ihn auf Englisch',
  writerIdiomaEn: 'Englisch',
  writerIdiomaPt: 'Portugiesisch',
  writerIdiomaFr: 'Französisch',
  writerIdiomaIt: 'Italienisch',

  writerExplicaResumir: 'Ich fasse deinen Text in wenigen Zeilen auf die Kernideen zusammen.',
  writerPasoResumir: 'Auf die Kernideen zusammenfassen',
  writerExplicaCorregir: 'Ich korrigiere Rechtschreibung, Stil und Klarheit, ohne zu ändern, was du sagen wolltest.',
  writerPasoCorregir: 'Rechtschreibung, Stil und Klarheit korrigieren',
  writerExplicaIdeas: 'Ich schlage dir mehrere Ideen und einen Ausgangspunkt vor, damit du ohne Schreibblockade loslegen kannst.',
  writerPasoIdeas: 'Dir Ideen zum Schreiben vorschlagen',

  writerExplicaPortada: 'Ich lege das Konzept des Covers fest und erstelle drei Vorschläge zur Auswahl.',
  writerPasoConceptoPortada: 'Das Konzept des Covers festlegen',
  writerPasoPropuestasPortada: '3 Vorschläge für das Cover erstellen',

  writerExplicaReescribir: 'Ich schreibe deinen Text um (Ton: {{tono}}) und bewahre dabei die Idee.',
  writerPasoReescribir: 'Den Text umschreiben',
  writerExplicaCv: 'Ich schreibe deinen Lebenslauf (Ton: {{tono}}), fertig zur Verwendung im Editor und zum Versenden.',
  writerPasoCv: 'Deinen Lebenslauf schreiben',

  writerExplicaPublicacion: 'Ich schreibe den Beitrag (Ton: {{tono}}) und feile dann daran, bis er fertig ist.',
  writerExplicaHistoria: 'Ich schreibe die Geschichte (Ton: {{tono}}) und feile dann daran, bis sie fertig ist.',
  writerExplicaGuion: 'Ich schreibe das Drehbuch (Ton: {{tono}}) und feile dann daran, bis es fertig ist.',
  writerExplicaArticulo: 'Ich schreibe den Artikel (Ton: {{tono}}) und feile dann daran, bis er fertig ist.',
  writerExplicaEmail: 'Ich schreibe das E-Mail (Ton: {{tono}}) und feile dann daran, bis es fertig ist.',
  writerExplicaDocumento: 'Ich schreibe das Dokument (Ton: {{tono}}) und feile dann daran, bis es fertig ist.',
  writerPasoPublicacion: 'Den Beitrag schreiben',
  writerPasoHistoria: 'Die Geschichte schreiben',
  writerPasoGuion: 'Das Drehbuch schreiben',
  writerPasoArticulo: 'Den Artikel schreiben',
  writerPasoEmail: 'Das E-Mail schreiben',
  writerPasoDocumento: 'Das Dokument schreiben',
  writerPasoPulir: 'Den Text überarbeiten und fertigstellen',

  writerDecisionEmpiezoPublicacion: 'fange ich mit einem Beitrag an',
  writerDecisionTonoCercano: 'verwende ich einen persönlichen Ton',
  writerDecisionTonoProfesional: 'verwende ich einen professionellen Ton',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  musicExplicaVoz: 'Ich bereite den Text vor und nehme ihn auf (Stimme: {{voz}}).',
  musicExplicaVozCalida: 'Ich bereite den Text vor und nehme ihn mit einer warmen, klaren Stimme auf.',
  musicPasoTextoNarracion: 'Den Text für die Erzählung vorbereiten',
  musicPasoGrabarVoz: 'Die Stimme aufnehmen',

  musicExplicaLetra: 'Ich schreibe den kompletten Songtext – {{estilo}}.',
  musicPasoLetraCompleta: 'Den kompletten Songtext schreiben',

  musicExplicaMezcla: 'Ich höre mir deinen Song an, mische und mastere ihn, damit er professionell klingt.',
  musicPasoAnotarMezcla: 'Deinen Song anhören und den Mix notieren',
  musicPasoMasterizar: 'Mischen und mastern',

  musicExplicaVideoclip: 'Ich erstelle den Song ({{estilo}}, {{animo}}) und die Szenen und baue deinen kompletten Videoclip. Du musst Weë Music dafür nicht verlassen.',
  musicPasoIdeaYLetra: 'Die Idee und den Songtext schreiben',
  musicPasoEscenas: 'Die Szenen des Videoclips erstellen',
  musicPasoArmarVideoclip: 'Den Videoclip mit deinem Song zusammenstellen',

  musicExplicaJingle: 'Ich erstelle einen kurzen, eingängigen Jingle – {{estilo}}, Stimmung: {{animo}}.',
  musicPasoFraseJingle: 'Den Slogan des Jingles schreiben',
  musicPasoJingle: 'Den Jingle erstellen',
  musicExplicaBeat: 'Ich erstelle einen Beat – {{estilo}}, Stimmung: {{animo}}.',
  musicPasoIdeaMusical: 'Die musikalische Idee festlegen',
  musicPasoBeat: 'Den Beat erstellen',

  musicExplicaCancion: 'Ich schreibe den Songtext, erstelle den Song – {{estilo}}, Stimmung: {{animo}} – und gestalte sein Cover.',
  musicPasoLetra: 'Den Songtext schreiben',
  musicPasoCancion: 'Den Song erstellen',
  musicPasoPortada: 'Das Cover gestalten',

  musicDecisionEmpiezoCancion: 'fange ich mit einem Song an',
  musicDecisionEstiloPop: 'habe ich einen Pop-Stil gewählt',
  musicDecisionAnimoAlegre: 'nehme ich eine fröhliche Stimmung',
  musicDecisionVozCalida: 'habe ich eine warme, klare Stimme gewählt',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  beautyExplicaPiel: 'Ich sehe mir dein Foto an und stelle eine einfache Hautpflegeroutine zusammen, mit Produkten, die leicht zu bekommen sind.',
  beautyPasoRutina: 'Deine Pflegeroutine zusammenstellen',

  beautyExplicaRostro: 'Ich sehe mir dein Gesicht an, empfehle dir die Schnitte und Stile, die dir am besten stehen, und probiere zwei davon auf deinem Foto aus.',
  beautyPasoMirarRostro: 'Dein Gesicht ansehen',
  beautyPasoRecomendar: 'Dir Schnitte, Brillen und Stile empfehlen',
  beautyPasoProbarDosEstilos: 'Die zwei Stile ausprobieren, die dir am besten stehen',

  beautyExplicaProbar: 'Ich probiere {{cambio}} für {{ocasion}} in zwei Versionen aus und bewahre dabei dein Gesicht, deine Haut und das Licht des Fotos.',
  beautyPasoProbar: 'Ausprobieren: {{cambio}} – dein Gesicht bleibt, wie es ist',
  beautyOcasionElDiaADia: 'jeden Tag',

  beautyDecisionCambioCompleto: 'schlage ich einen komplett neuen Look vor',
  beautyDecisionOcasionDiaADia: 'habe ich an den Alltag gedacht',
};
