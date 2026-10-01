/*
 * ENGLISH — El plan de Weë Writer, Weë Music y Weë Beauty. Ver `../../../es/servidor/plan/texto.ts`.
 *
 * Los huecos que llevan una opción se rellenan con la etiqueta inglesa de `../opciones.ts`, sin emoji y con la inicial
 * en minúscula. El ánimo de Music va sin artículo («with epic vibes») porque «a epic» no se puede escribir; los
 * nombres de idioma (`writerIdioma…`) van con mayúscula; las `…Decision…` completan «Since you weren’t sure, …».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  writerExplicaCitas: 'I’ll look for real quotes on the topic and give you the source of each one so you can check them.',
  writerPasoCitas: 'Find the quotes and their sources',

  writerExplicaTraducir: 'I’ll translate your text into {{idioma}}, keeping its meaning and tone.',
  writerPasoTraducir: 'Translate into {{idioma}}',
  writerDecisionIdiomaIngles: 'I’ll translate it into English',
  writerIdiomaEn: 'English',
  writerIdiomaPt: 'Portuguese',
  writerIdiomaFr: 'French',
  writerIdiomaIt: 'Italian',

  writerExplicaResumir: 'I’ll summarise your text into its key ideas, in just a few lines.',
  writerPasoResumir: 'Summarise into key ideas',
  writerExplicaCorregir: 'I’ll fix the spelling and improve the style and clarity without changing what you meant to say.',
  writerPasoCorregir: 'Fix spelling, style and clarity',
  writerExplicaIdeas: 'I’ll suggest a few ideas and a starting point so you can write without getting stuck.',
  writerPasoIdeas: 'Suggest ideas for your writing',

  writerExplicaPortada: 'I’ll define the concept for the cover and create three designs for you to choose from.',
  writerPasoConceptoPortada: 'Define the cover concept',
  writerPasoPropuestasPortada: 'Create 3 cover designs',

  writerExplicaReescribir: 'I’ll rewrite your text in a {{tono}} tone, keeping the idea.',
  writerPasoReescribir: 'Rewrite the text',
  writerExplicaCv: 'I’ll write your CV in a {{tono}} tone, ready to open in the editor and send.',
  writerPasoCv: 'Write your CV',

  writerExplicaPublicacion: 'I’ll write the post in a {{tono}} tone and then polish it so it’s ready to go.',
  writerExplicaHistoria: 'I’ll write the story in a {{tono}} tone and then polish it so it’s ready to go.',
  writerExplicaGuion: 'I’ll write the script in a {{tono}} tone and then polish it so it’s ready to go.',
  writerExplicaArticulo: 'I’ll write the article in a {{tono}} tone and then polish it so it’s ready to go.',
  writerExplicaEmail: 'I’ll draft the email in a {{tono}} tone and then polish it so it’s ready to go.',
  writerExplicaDocumento: 'I’ll draft the document in a {{tono}} tone and then polish it so it’s ready to go.',
  writerPasoPublicacion: 'Write the post',
  writerPasoHistoria: 'Write the story',
  writerPasoGuion: 'Write the script',
  writerPasoArticulo: 'Write the article',
  writerPasoEmail: 'Draft the email',
  writerPasoDocumento: 'Draft the document',
  writerPasoPulir: 'Polish the text and get it ready',

  writerDecisionEmpiezoPublicacion: 'I’ll start with a post',
  writerDecisionTonoCercano: 'I’ll use a friendly tone',
  writerDecisionTonoProfesional: 'I’ll use a professional tone',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  musicExplicaVoz: 'I’ll prepare the text and record it with a {{voz}} voice.',
  musicExplicaVozCalida: 'I’ll prepare the text and record it with a warm, clear voice.',
  musicPasoTextoNarracion: 'Prepare the narration text',
  musicPasoGrabarVoz: 'Record the voice',

  musicExplicaLetra: 'I’ll write the full lyrics in {{estilo}} style.',
  musicPasoLetraCompleta: 'Write the full lyrics',

  musicExplicaMezcla: 'I’ll listen to your song, then mix and master it so it sounds professional.',
  musicPasoAnotarMezcla: 'Listen to your song and plan the mix',
  musicPasoMasterizar: 'Mix and master',

  musicExplicaVideoclip: 'I’ll create the song ({{estilo}}, {{animo}}) and the scenes, and put your whole music video together. You don’t have to leave Weë Music.',
  musicPasoIdeaYLetra: 'Write the idea and the lyrics',
  musicPasoEscenas: 'Create the music video scenes',
  musicPasoArmarVideoclip: 'Put the music video together with your song',

  musicExplicaJingle: 'I’ll create a short, catchy jingle in {{estilo}} style, with {{animo}} vibes.',
  musicPasoFraseJingle: 'Write the jingle’s catchphrase',
  musicPasoJingle: 'Create the jingle',
  musicExplicaBeat: 'I’ll create a beat in {{estilo}} style, with {{animo}} vibes.',
  musicPasoIdeaMusical: 'Define the musical idea',
  musicPasoBeat: 'Create the beat',

  musicExplicaCancion: 'I’ll write the lyrics, create the song in {{estilo}} style with {{animo}} vibes, and design its cover.',
  musicPasoLetra: 'Write the lyrics',
  musicPasoCancion: 'Create the song',
  musicPasoPortada: 'Design the cover',

  musicDecisionEmpiezoCancion: 'I’ll start with a song',
  musicDecisionEstiloPop: 'I went with pop',
  musicDecisionAnimoAlegre: 'I went with a happy mood',
  musicDecisionVozCalida: 'I went with a warm, clear voice',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  beautyExplicaPiel: 'I’ll look at your photo and put together a simple skincare routine, with products that are easy to find.',
  beautyPasoRutina: 'Put together your skincare routine',

  beautyExplicaRostro: 'I’ll look at your face, recommend the cuts and styles that suit you best and try two of them on your photo.',
  beautyPasoMirarRostro: 'Look at your face',
  beautyPasoRecomendar: 'Recommend cuts, glasses and styles',
  beautyPasoProbarDosEstilos: 'Try on the two styles that suit you best',

  beautyExplicaProbar: 'I’ll try out {{cambio}} for {{ocasion}} in two versions, keeping your face, your skin and the lighting in your photo.',
  beautyPasoProbar: 'Try out {{cambio}}, keeping your face as it is',
  beautyOcasionElDiaADia: 'everyday life',

  beautyDecisionCambioCompleto: 'I’m suggesting a complete new look',
  beautyDecisionOcasionDiaADia: 'I planned it for everyday life',
};
