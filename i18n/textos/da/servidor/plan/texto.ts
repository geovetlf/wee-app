/*
 * DANÉS — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Como en `visual.ts`: Weë habla en primera persona y en presente («Jeg skriver …»), y los pasos van en infinitivo
 * sin «at» («Skrive opslaget»), porque son también el título del resultado y la línea de progreso.
 *
 * WRITER. El tono es un adjetivo de género común (`../opciones.ts`: «personlig», «professionel», «sjov», «rørende») y
 * va en «i en {{tono}} tone». Cada tipo de texto tiene su frase porque el pronombre concuerda con él: «opslaget» y
 * «manuskriptet» son neutros («giver det en sidste finpudsning»), «historien», «artiklen» y «e-mailen», comunes
 * («giver den …»). «Pulir» es «finpudse», como en `catalogo`. Los idiomas de destino son piezas propias y en
 * minúscula, como se escriben en danés dentro de una frase («til engelsk»). El editor es «teksteditoren», el título
 * que tiene en `writer`. «Ideas clave», «de vigtigste pointer»; «sin bloqueo», «uden at gå i stå».
 *
 * MUSIC. Los géneros son SUSTANTIVOS («pop», «reggaeton eller urban», «ballade», «elektronisk musik»): delante de
 * «stil» serían særskrivning («pop stil»), así que entran como «i genren {{estilo}}». El ánimo es un adjetivo y va en
 * «med en {{animo}} stemning»; la voz, en «med en {{voz}} stemme». En el videoclip el español los deja entre
 * paréntesis como una etiqueta, «(pop, glad)», y así se quedan. La narración es «oplæsning» (como en `creator`); la
 * letra, «sangtekst»; la portada de una canción, «cover» (et cover, «coveret»), no la «forside» de un libro; mezclar
 * y masterizar, «mix og mastering», como el botón «Mix og master min sang», sin inventar un verbo. «Weë Music» es
 * marca y no se declina.
 *
 * BEAUTY. Lo que se prueba va detrás de «prøve …» («et makeuplook», «en anden hårfarve», «med eller uden skæg») y la
 * ocasión detrás de «til …» («hverdag», «en fest», «arbejde», «en date»); cuando la persona dijo «No sé», el
 * servidor escribe la pieza `beautyOcasionElDiaADia`, que en danés es «hverdagen», en forma definida, igual que el
 * español distingue «el día a día» de la opción «día a día». «Los cortes que mejor te van», «der klæder dig bedst».
 *
 * LAS «…Decision…» cierran «Da du ikke var sikker, {{decision}}.»: empiezan por el verbo conjugado y su sujeto
 * (inversión V2 detrás de la subordinada): «starter jeg med …», «bruger jeg en … tone», «valgte jeg …». El español
 * del servidor dice literalmente «Como no estabas seguro, con ánimo alegre.», sin verbo; el danés escribe lo que
 * quiere decir: «valgte jeg en glad stemning», sin pronombre, porque sirve igual para la canción y el jingle (en) que
 * para el beat (et). «Lo pensé para el día a día» es «går jeg ud fra, at det er til hverdagen», la manera danesa de
 * decir que Weë supuso la ocasión. «Elegí un estilo pop» es «valgte jeg pop», con el género como sustantivo.
 *
 * El «la letra» del servidor es «sangteksten» y no «teksten», que en Weë Music también es el texto de una narración.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  writerExplicaCitas: 'Jeg finder rigtige citater om emnet og giver dig kilden til hvert citat, så du selv kan tjekke dem.',
  writerPasoCitas: 'Finde citaterne og deres kilder',

  writerExplicaTraducir: 'Jeg oversætter din tekst til {{idioma}} og bevarer både betydningen og tonen.',
  writerPasoTraducir: 'Oversætte til {{idioma}}',
  writerDecisionIdiomaIngles: 'oversætter jeg den til engelsk',
  writerIdiomaEn: 'engelsk',
  writerIdiomaPt: 'portugisisk',
  writerIdiomaFr: 'fransk',
  writerIdiomaIt: 'italiensk',

  writerExplicaResumir: 'Jeg koger din tekst ned til de vigtigste pointer på få linjer.',
  writerPasoResumir: 'Opsummere de vigtigste pointer',
  writerExplicaCorregir: 'Jeg retter stavningen og forbedrer sproget og klarheden uden at ændre det, du ville sige.',
  writerPasoCorregir: 'Rette stavning, sprog og klarhed',
  writerExplicaIdeas: 'Jeg giver dig flere idéer og et sted at starte, så du kan skrive uden at gå i stå.',
  writerPasoIdeas: 'Give dig idéer at skrive ud fra',

  writerExplicaPortada: 'Jeg fastlægger konceptet for forsiden og laver tre forslag, som du kan vælge imellem.',
  writerPasoConceptoPortada: 'Fastlægge konceptet for forsiden',
  writerPasoPropuestasPortada: 'Lave 3 forslag til forsiden',

  writerExplicaReescribir: 'Jeg omskriver din tekst i en {{tono}} tone og bevarer idéen.',
  writerPasoReescribir: 'Omskrive teksten',
  writerExplicaCv: 'Jeg skriver dit CV i en {{tono}} tone, så du kan bruge det i teksteditoren og sende det.',
  writerPasoCv: 'Skrive dit CV',

  writerExplicaPublicacion: 'Jeg skriver opslaget i en {{tono}} tone og giver det en sidste finpudsning, så det er klar.',
  writerExplicaHistoria: 'Jeg skriver historien i en {{tono}} tone og giver den en sidste finpudsning, så den er klar.',
  writerExplicaGuion: 'Jeg skriver manuskriptet i en {{tono}} tone og giver det en sidste finpudsning, så det er klar.',
  writerExplicaArticulo: 'Jeg skriver artiklen i en {{tono}} tone og giver den en sidste finpudsning, så den er klar.',
  writerExplicaEmail: 'Jeg skriver e-mailen i en {{tono}} tone og giver den en sidste finpudsning, så den er klar.',
  writerExplicaDocumento: 'Jeg skriver dokumentet i en {{tono}} tone og giver det en sidste finpudsning, så det er klar.',
  writerPasoPublicacion: 'Skrive opslaget',
  writerPasoHistoria: 'Skrive historien',
  writerPasoGuion: 'Skrive manuskriptet',
  writerPasoArticulo: 'Skrive artiklen',
  writerPasoEmail: 'Skrive e-mailen',
  writerPasoDocumento: 'Skrive dokumentet',
  writerPasoPulir: 'Finpudse teksten og gøre den klar',

  writerDecisionEmpiezoPublicacion: 'starter jeg med et opslag',
  writerDecisionTonoCercano: 'bruger jeg en personlig tone',
  writerDecisionTonoProfesional: 'bruger jeg en professionel tone',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  musicExplicaVoz: 'Jeg gør teksten klar og optager den med en {{voz}} stemme.',
  musicExplicaVozCalida: 'Jeg gør teksten klar og optager den med en varm og klar stemme.',
  musicPasoTextoNarracion: 'Gøre teksten til oplæsningen klar',
  musicPasoGrabarVoz: 'Optage stemmen',

  musicExplicaLetra: 'Jeg skriver hele sangteksten i genren {{estilo}}.',
  musicPasoLetraCompleta: 'Skrive hele sangteksten',

  musicExplicaMezcla: 'Jeg lytter til din sang og laver mix og mastering, så den får en professionel lyd.',
  musicPasoAnotarMezcla: 'Lytte til din sang og lave noter til mixet',
  musicPasoMasterizar: 'Lave mix og mastering',

  musicExplicaVideoclip: 'Jeg laver sangen ({{estilo}}, {{animo}}), skaber scenerne og klipper hele din musikvideo sammen. Du behøver ikke at forlade Weë Music.',
  musicPasoIdeaYLetra: 'Skrive idéen og sangteksten',
  musicPasoEscenas: 'Lave scenerne til musikvideoen',
  musicPasoArmarVideoclip: 'Klippe musikvideoen sammen med din sang',

  musicExplicaJingle: 'Jeg laver en kort og fængende jingle i genren {{estilo}} med en {{animo}} stemning.',
  musicPasoFraseJingle: 'Skrive teksten til jinglen',
  musicPasoJingle: 'Lave jinglen',
  musicExplicaBeat: 'Jeg laver et beat i genren {{estilo}} med en {{animo}} stemning.',
  musicPasoIdeaMusical: 'Fastlægge den musikalske idé',
  musicPasoBeat: 'Lave beatet',

  musicExplicaCancion: 'Jeg skriver sangteksten, laver sangen i genren {{estilo}} med en {{animo}} stemning og designer et cover til den.',
  musicPasoLetra: 'Skrive sangteksten',
  musicPasoCancion: 'Lave sangen',
  musicPasoPortada: 'Designe coveret',

  musicDecisionEmpiezoCancion: 'starter jeg med en sang',
  musicDecisionEstiloPop: 'valgte jeg pop',
  musicDecisionAnimoAlegre: 'valgte jeg en glad stemning',
  musicDecisionVozCalida: 'valgte jeg en varm og klar stemme',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  beautyExplicaPiel: 'Jeg kigger på dit foto og sammensætter en enkel hudplejerutine med produkter, der er nemme at få fat i.',
  beautyPasoRutina: 'Sammensætte din plejerutine',

  beautyExplicaRostro: 'Jeg kigger på dit ansigt, anbefaler de klipninger og stilarter, der klæder dig bedst, og prøver to af dem på dit foto.',
  beautyPasoMirarRostro: 'Kigge på dit ansigt',
  beautyPasoRecomendar: 'Anbefale dig klipninger, briller og stilarter',
  beautyPasoProbarDosEstilos: 'Prøve de to stilarter, der klæder dig bedst',

  beautyExplicaProbar: 'Jeg prøver {{cambio}} til {{ocasion}} i to versioner og bevarer dit ansigt, din hud og lyset på fotoet.',
  beautyPasoProbar: 'Prøve {{cambio}} og bevare dit ansigt',
  beautyOcasionElDiaADia: 'hverdagen',

  beautyDecisionCambioCompleto: 'foreslår jeg et helt nyt look',
  beautyDecisionOcasionDiaADia: 'går jeg ud fra, at det er til hverdagen',
};
