/*
 * NORUEGO BOKMÅL — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Jeg leter etter ekte sitater om emnet og oppgir kilden til hvert av dem, så du kan sjekke dem.',
  writerPasoCitas: 'Finne sitatene og kildene deres',

  writerExplicaTraducir: 'Jeg oversetter teksten din til {{idioma}} og beholder meningen og tonen.',
  writerPasoTraducir: 'Oversette til {{idioma}}',
  writerDecisionIdiomaIngles: 'oversetter jeg den til engelsk',
  writerIdiomaEn: 'engelsk',
  writerIdiomaPt: 'portugisisk',
  writerIdiomaFr: 'fransk',
  writerIdiomaIt: 'italiensk',

  writerExplicaResumir: 'Jeg oppsummerer teksten din i hovedpunktene, på noen få linjer.',
  writerPasoResumir: 'Oppsummere i hovedpunkter',
  writerExplicaCorregir: 'Jeg retter rettskrivning, stil og klarhet uten å endre det du ville si.',
  writerPasoCorregir: 'Rette rettskrivning, stil og klarhet',
  writerExplicaIdeas: 'Jeg foreslår flere ideer og et utgangspunkt, så du kan skrive uten skrivesperre.',
  writerPasoIdeas: 'Foreslå ideer du kan skrive om',

  writerExplicaPortada: 'Jeg definerer konseptet for omslaget og lager tre forslag du kan velge mellom.',
  writerPasoConceptoPortada: 'Definere konseptet for omslaget',
  writerPasoPropuestasPortada: 'Lage 3 forslag til omslag',

  writerExplicaReescribir: 'Jeg skriver om teksten din med en {{tono}} tone og beholder ideen.',
  writerPasoReescribir: 'Skrive om teksten',
  writerExplicaCv: 'Jeg skriver CV-en din med en {{tono}} tone, klar til å brukes i redigeringsverktøyet og sendes.',
  writerPasoCv: 'Skrive CV-en din',

  writerExplicaPublicacion: 'Jeg skriver innlegget med en {{tono}} tone og finpusser det etterpå, så det blir klart.',
  writerExplicaHistoria: 'Jeg skriver historien med en {{tono}} tone og finpusser den etterpå, så den blir klar.',
  writerExplicaGuion: 'Jeg skriver manuset med en {{tono}} tone og finpusser det etterpå, så det blir klart.',
  writerExplicaArticulo: 'Jeg skriver artikkelen med en {{tono}} tone og finpusser den etterpå, så den blir klar.',
  writerExplicaEmail: 'Jeg skriver e-posten med en {{tono}} tone og finpusser den etterpå, så den blir klar.',
  writerExplicaDocumento: 'Jeg skriver dokumentet med en {{tono}} tone og finpusser det etterpå, så det blir klart.',
  writerPasoPublicacion: 'Skrive innlegget',
  writerPasoHistoria: 'Skrive historien',
  writerPasoGuion: 'Skrive manuset',
  writerPasoArticulo: 'Skrive artikkelen',
  writerPasoEmail: 'Skrive e-posten',
  writerPasoDocumento: 'Skrive dokumentet',
  writerPasoPulir: 'Finpusse teksten og gjøre den klar',

  writerDecisionEmpiezoPublicacion: 'starter jeg med et innlegg',
  writerDecisionTonoCercano: 'bruker jeg en personlig tone',
  writerDecisionTonoProfesional: 'bruker jeg en profesjonell tone',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Jeg klargjør teksten og spiller den inn med en {{voz}} stemme.',
  musicExplicaVozCalida: 'Jeg klargjør teksten og spiller den inn med en varm og klar stemme.',
  musicPasoTextoNarracion: 'Klargjøre teksten til fortellerstemmen',
  musicPasoGrabarVoz: 'Spille inn stemmen',

  musicExplicaLetra: 'Jeg skriver hele sangteksten, i stilen {{estilo}}.',
  musicPasoLetraCompleta: 'Skrive hele sangteksten',

  musicExplicaMezcla: 'Jeg lytter til sangen din, mikser og mastrer den, så den høres profesjonell ut.',
  musicPasoAnotarMezcla: 'Lytte til sangen din og notere miksen',
  musicPasoMasterizar: 'Mikse og mastre',

  musicExplicaVideoclip: 'Jeg lager sangen ({{estilo}}, {{animo}}) og scenene og setter sammen hele musikkvideoen din. Du trenger ikke å forlate Weë Music.',
  musicPasoIdeaYLetra: 'Skrive ideen og sangteksten',
  musicPasoEscenas: 'Lage scenene til musikkvideoen',
  musicPasoArmarVideoclip: 'Sette sammen musikkvideoen med sangen din',

  musicExplicaJingle: 'Jeg lager en kort og fengende jingle i stilen {{estilo}}, med {{animo}} stemning.',
  musicPasoFraseJingle: 'Skrive frasen til jinglen',
  musicPasoJingle: 'Lage jinglen',
  musicExplicaBeat: 'Jeg lager en beat i stilen {{estilo}}, med {{animo}} stemning.',
  musicPasoIdeaMusical: 'Definere den musikalske ideen',
  musicPasoBeat: 'Lage beaten',

  musicExplicaCancion: 'Jeg skriver sangteksten, lager sangen i stilen {{estilo}} med {{animo}} stemning og designer omslaget.',
  musicPasoLetra: 'Skrive sangteksten',
  musicPasoCancion: 'Lage sangen',
  musicPasoPortada: 'Designe omslaget',

  musicDecisionEmpiezoCancion: 'starter jeg med en sang',
  musicDecisionEstiloPop: 'valgte jeg stilen pop',
  musicDecisionAnimoAlegre: 'valgte jeg en glad stemning',
  musicDecisionVozCalida: 'valgte jeg en varm og klar stemme',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Jeg ser på bildet ditt og setter sammen en enkel hudpleierutine med produkter som er lette å få tak i.',
  beautyPasoRutina: 'Sette sammen pleierutinen din',

  beautyExplicaRostro: 'Jeg ser på ansiktet ditt, anbefaler hårklippene og stilene som passer deg best, og prøver to av dem på bildet ditt.',
  beautyPasoMirarRostro: 'Se på ansiktet ditt',
  beautyPasoRecomendar: 'Anbefale hårklipp, briller og stiler',
  beautyPasoProbarDosEstilos: 'Prøve de to stilene som passer deg best',

  beautyExplicaProbar: 'Jeg prøver {{cambio}} til {{ocasion}} i to versjoner og bevarer ansiktet ditt, huden din og lyset i bildet.',
  beautyPasoProbar: 'Prøve {{cambio}} og bevare ansiktet ditt',
  beautyOcasionElDiaADia: 'hverdagen',

  beautyDecisionCambioCompleto: 'foreslår jeg en helt ny look',
  beautyDecisionOcasionDiaADia: 'tenkte jeg den til hverdagen',
};
