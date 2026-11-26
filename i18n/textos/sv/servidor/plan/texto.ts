/*
 * SUECO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * El tono es un adjetivo común («i en {{tono}} ton»). Los géneros de música son sustantivos, así que entran como «i
 * stilen {{estilo}}» y no pegados a «stil» (särskrivning). El ánimo va en «med en {{animo}} känsla» y la voz en «med en
 * {{voz}} röst». Los idiomas van en minúscula, como en sueco dentro de una frase. Lo que se prueba en Beauty va detrás
 * de «provar» y la ocasión detrás de «till».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  writerExplicaCitas: 'Jag letar efter riktiga citat om ämnet och anger källan till varje citat så att du kan kontrollera dem.',
  writerPasoCitas: 'Hitta citaten och deras källor',

  writerExplicaTraducir: 'Jag översätter din text till {{idioma}} och behåller innebörd och ton.',
  writerPasoTraducir: 'Översätta till {{idioma}}',
  writerDecisionIdiomaIngles: 'jag översätter till engelska',
  writerIdiomaEn: 'engelska',
  writerIdiomaPt: 'portugisiska',
  writerIdiomaFr: 'franska',
  writerIdiomaIt: 'italienska',

  writerExplicaResumir: 'Jag sammanfattar din text i de viktigaste idéerna, på några få rader.',
  writerPasoResumir: 'Sammanfatta de viktigaste idéerna',
  writerExplicaCorregir: 'Jag rättar stavningen och förbättrar stil och tydlighet utan att ändra det du ville säga.',
  writerPasoCorregir: 'Rätta stavning, stil och tydlighet',
  writerExplicaIdeas: 'Jag föreslår några idéer och en startpunkt så att du kan skriva utan att fastna.',
  writerPasoIdeas: 'Föreslå idéer till din text',

  writerExplicaPortada: 'Jag bestämmer konceptet för omslaget och skapar tre förslag som du kan välja mellan.',
  writerPasoConceptoPortada: 'Bestämma konceptet för omslaget',
  writerPasoPropuestasPortada: 'Skapa 3 förslag på omslag',

  writerExplicaReescribir: 'Jag skriver om din text i en {{tono}} ton och behåller idén.',
  writerPasoReescribir: 'Skriva om texten',
  writerExplicaCv: 'Jag skriver ditt cv i en {{tono}} ton, klart att öppna i redigeraren och skicka.',
  writerPasoCv: 'Skriva ditt cv',

  writerExplicaPublicacion: 'Jag skriver inlägget i en {{tono}} ton och finslipar det sedan så att det är klart.',
  writerExplicaHistoria: 'Jag skriver berättelsen i en {{tono}} ton och finslipar den sedan så att den är klar.',
  writerExplicaGuion: 'Jag skriver manuset i en {{tono}} ton och finslipar det sedan så att det är klart.',
  writerExplicaArticulo: 'Jag skriver artikeln i en {{tono}} ton och finslipar den sedan så att den är klar.',
  writerExplicaEmail: 'Jag skriver mejlet i en {{tono}} ton och finslipar det sedan så att det är klart.',
  writerExplicaDocumento: 'Jag skriver dokumentet i en {{tono}} ton och finslipar det sedan så att det är klart.',
  writerPasoPublicacion: 'Skriva inlägget',
  writerPasoHistoria: 'Skriva berättelsen',
  writerPasoGuion: 'Skriva manuset',
  writerPasoArticulo: 'Skriva artikeln',
  writerPasoEmail: 'Skriva mejlet',
  writerPasoDocumento: 'Skriva dokumentet',
  writerPasoPulir: 'Finslipa texten och göra den klar',

  writerDecisionEmpiezoPublicacion: 'jag börjar med ett inlägg',
  writerDecisionTonoCercano: 'jag använder en vänlig ton',
  writerDecisionTonoProfesional: 'jag använder en professionell ton',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  musicExplicaVoz: 'Jag förbereder texten och spelar in den med en {{voz}} röst.',
  musicExplicaVozCalida: 'Jag förbereder texten och spelar in den med en varm och tydlig röst.',
  musicPasoTextoNarracion: 'Förbereda texten till berättarrösten',
  musicPasoGrabarVoz: 'Spela in rösten',

  musicExplicaLetra: 'Jag skriver hela låttexten i stilen {{estilo}}.',
  musicPasoLetraCompleta: 'Skriva hela låttexten',

  musicExplicaMezcla: 'Jag lyssnar på din låt och sedan mixar och mastrar jag den så att den låter professionell.',
  musicPasoAnotarMezcla: 'Lyssna på din låt och planera mixen',
  musicPasoMasterizar: 'Mixa och mastra',

  musicExplicaVideoclip: 'Jag skapar låten ({{estilo}}, {{animo}}) och scenerna och sätter ihop hela musikvideon. Du behöver inte lämna Weë Music.',
  musicPasoIdeaYLetra: 'Skriva idén och låttexten',
  musicPasoEscenas: 'Skapa scenerna till musikvideon',
  musicPasoArmarVideoclip: 'Sätta ihop musikvideon med din låt',

  musicExplicaJingle: 'Jag skapar en kort och medryckande jingel i stilen {{estilo}}, med en {{animo}} känsla.',
  musicPasoFraseJingle: 'Skriva jingelns slogan',
  musicPasoJingle: 'Skapa jingeln',
  musicExplicaBeat: 'Jag skapar ett beat i stilen {{estilo}}, med en {{animo}} känsla.',
  musicPasoIdeaMusical: 'Bestämma den musikaliska idén',
  musicPasoBeat: 'Skapa beatet',

  musicExplicaCancion: 'Jag skriver låttexten, skapar låten i stilen {{estilo}} med en {{animo}} känsla och designar omslaget.',
  musicPasoLetra: 'Skriva låttexten',
  musicPasoCancion: 'Skapa låten',
  musicPasoPortada: 'Designa omslaget',

  musicDecisionEmpiezoCancion: 'jag börjar med en låt',
  musicDecisionEstiloPop: 'jag valde pop',
  musicDecisionAnimoAlegre: 'jag valde en glad känsla',
  musicDecisionVozCalida: 'jag valde en varm och tydlig röst',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  beautyExplicaPiel: 'Jag tittar på ditt foto och sätter ihop en enkel hudvårdsrutin med produkter som är lätta att hitta.',
  beautyPasoRutina: 'Sätta ihop din hudvårdsrutin',

  beautyExplicaRostro: 'Jag tittar på ditt ansikte, rekommenderar de frisyrer och stilar som passar dig bäst och provar två av dem på ditt foto.',
  beautyPasoMirarRostro: 'Titta på ditt ansikte',
  beautyPasoRecomendar: 'Rekommendera frisyrer, glasögon och stilar',
  beautyPasoProbarDosEstilos: 'Prova de två stilar som passar dig bäst',

  beautyExplicaProbar: 'Jag provar {{cambio}} till {{ocasion}} i två versioner och behåller ditt ansikte, din hud och ljuset på ditt foto.',
  beautyPasoProbar: 'Prova {{cambio}} och behålla ditt ansikte som det är',
  beautyOcasionElDiaADia: 'vardagen',

  beautyDecisionCambioCompleto: 'jag föreslår en helt ny stil',
  beautyDecisionOcasionDiaADia: 'jag tänkte på vardagen',
};
