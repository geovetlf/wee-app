/*
 * NEERLANDÉS — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}` y `{{voz}}` entran como predicado («een toon die toegankelijk klinkt», «een stem die vrouwelijk klinkt»);
 * estilo y ánimo de Music, como etiqueta («stijl: pop, sfeer: vrolijk»); `{{idioma}}`, detrás de «naar het», con
 * mayúscula, como se escriben los idiomas en neerlandés.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Ik zoek echte citaten over het onderwerp en geef bij elk citaat de bron, zodat je het kunt controleren.',
  writerPasoCitas: 'Citaten en hun bronnen zoeken',

  writerExplicaTraducir: 'Ik vertaal je tekst naar het {{idioma}} en behoud de betekenis en de toon.',
  writerPasoTraducir: 'Vertalen naar het {{idioma}}',
  writerDecisionIdiomaIngles: 'vertaal ik het naar het Engels',
  writerIdiomaEn: 'Engels',
  writerIdiomaPt: 'Portugees',
  writerIdiomaFr: 'Frans',
  writerIdiomaIt: 'Italiaans',

  writerExplicaResumir: 'Ik vat je tekst in een paar regels samen tot de belangrijkste ideeën.',
  writerPasoResumir: 'Samenvatten tot de belangrijkste ideeën',
  writerExplicaCorregir: 'Ik corrigeer de spelling, de stijl en de duidelijkheid zonder te veranderen wat je wilde zeggen.',
  writerPasoCorregir: 'Spelling, stijl en duidelijkheid corrigeren',
  writerExplicaIdeas: 'Ik stel een paar ideeën en een startpunt voor, zodat je zonder schrijfblokkade kunt schrijven.',
  writerPasoIdeas: 'Schrijfideeën voorstellen',

  writerExplicaPortada: 'Ik bepaal het concept van de omslag en maak drie voorstellen waaruit je kunt kiezen.',
  writerPasoConceptoPortada: 'Het concept van de omslag bepalen',
  writerPasoPropuestasPortada: '3 voorstellen voor de omslag maken',

  writerExplicaReescribir: 'Ik herschrijf je tekst in een toon die {{tono}} klinkt en behoud het idee.',
  writerPasoReescribir: 'De tekst herschrijven',
  writerExplicaCv: 'Ik schrijf je cv in een toon die {{tono}} klinkt, klaar om in de editor te gebruiken en te versturen.',
  writerPasoCv: 'Je cv schrijven',

  writerExplicaPublicacion: 'Ik schrijf het bericht in een toon die {{tono}} klinkt en werk het daarna bij tot het af is.',
  writerExplicaHistoria: 'Ik schrijf het verhaal in een toon die {{tono}} klinkt en werk het daarna bij tot het af is.',
  writerExplicaGuion: 'Ik schrijf het script in een toon die {{tono}} klinkt en werk het daarna bij tot het af is.',
  writerExplicaArticulo: 'Ik schrijf het artikel in een toon die {{tono}} klinkt en werk het daarna bij tot het af is.',
  writerExplicaEmail: 'Ik schrijf de e-mail in een toon die {{tono}} klinkt en werk hem daarna bij tot hij af is.',
  writerExplicaDocumento: 'Ik schrijf het document in een toon die {{tono}} klinkt en werk het daarna bij tot het af is.',
  writerPasoPublicacion: 'Het bericht schrijven',
  writerPasoHistoria: 'Het verhaal schrijven',
  writerPasoGuion: 'Het script schrijven',
  writerPasoArticulo: 'Het artikel schrijven',
  writerPasoEmail: 'De e-mail schrijven',
  writerPasoDocumento: 'Het document schrijven',
  writerPasoPulir: 'De tekst bijwerken tot hij af is',

  writerDecisionEmpiezoPublicacion: 'begin ik met een bericht',
  writerDecisionTonoCercano: 'gebruik ik een toegankelijke toon',
  writerDecisionTonoProfesional: 'gebruik ik een professionele toon',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Ik bereid de tekst voor en neem hem op met een stem die {{voz}} klinkt.',
  musicExplicaVozCalida: 'Ik bereid de tekst voor en neem hem op met een warme, heldere stem.',
  musicPasoTextoNarracion: 'De tekst van de voice-over voorbereiden',
  musicPasoGrabarVoz: 'De stem opnemen',

  musicExplicaLetra: 'Ik schrijf de volledige songtekst (stijl: {{estilo}}).',
  musicPasoLetraCompleta: 'De volledige songtekst schrijven',

  musicExplicaMezcla: 'Ik luister naar je nummer, mix en master het zodat het professioneel klinkt.',
  musicPasoAnotarMezcla: 'Naar je nummer luisteren en de mix noteren',
  musicPasoMasterizar: 'Mixen en masteren',

  musicExplicaVideoclip: 'Ik maak het nummer ({{estilo}}, {{animo}}) en de scènes en zet je complete videoclip in elkaar. Je hoeft Weë Music niet te verlaten.',
  musicPasoIdeaYLetra: 'Het idee en de songtekst schrijven',
  musicPasoEscenas: 'De scènes van de videoclip maken',
  musicPasoArmarVideoclip: 'De videoclip met je nummer in elkaar zetten',

  musicExplicaJingle: 'Ik maak een korte, pakkende jingle (stijl: {{estilo}}, sfeer: {{animo}}).',
  musicPasoFraseJingle: 'De zin van de jingle schrijven',
  musicPasoJingle: 'De jingle maken',
  musicExplicaBeat: 'Ik maak een beat (stijl: {{estilo}}, sfeer: {{animo}}).',
  musicPasoIdeaMusical: 'Het muzikale idee bepalen',
  musicPasoBeat: 'De beat maken',

  musicExplicaCancion: 'Ik schrijf de songtekst, maak het nummer (stijl: {{estilo}}, sfeer: {{animo}}) en ontwerp de cover.',
  musicPasoLetra: 'De songtekst schrijven',
  musicPasoCancion: 'Het nummer maken',
  musicPasoPortada: 'De cover ontwerpen',

  musicDecisionEmpiezoCancion: 'begin ik met een nummer',
  musicDecisionEstiloPop: 'heb ik voor popstijl gekozen',
  musicDecisionAnimoAlegre: 'heb ik voor een vrolijke sfeer gekozen',
  musicDecisionVozCalida: 'heb ik een warme, heldere stem gekozen',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Ik bekijk je foto en stel een eenvoudige huidverzorgingsroutine samen, met producten die makkelijk te vinden zijn.',
  beautyPasoRutina: 'Je verzorgingsroutine samenstellen',

  beautyExplicaRostro: 'Ik bekijk je gezicht, raad de coupes en stijlen aan die je het beste staan en probeer er twee uit op je foto.',
  beautyPasoMirarRostro: 'Je gezicht bekijken',
  beautyPasoRecomendar: 'Coupes, brillen en stijlen aanraden',
  beautyPasoProbarDosEstilos: 'De twee stijlen uitproberen die je het beste staan',

  beautyExplicaProbar: 'Ik probeer {{cambio}} uit voor {{ocasion}} in twee versies, met behoud van je gezicht, je huid en het licht van de foto.',
  beautyPasoProbar: 'Uitproberen: {{cambio}}, met behoud van je gezicht',
  beautyOcasionElDiaADia: 'elke dag',

  beautyDecisionCambioCompleto: 'stel ik een complete nieuwe look voor',
  beautyDecisionOcasionDiaADia: 'heb ik het voor elke dag bedacht',
};
