/*
 * ITALIANO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{idioma}}` va detrás de «in» («in inglese»). `{{tono}}` acompaña a «tono» (masculino), `{{voz}}` a «voce» y `{{animo}}`
 * a «atmosfera» (femeninos). `{{cambio}}` y `{{ocasion}}` llegan con su artículo y entran como objeto o detrás de «per».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Cerco citazioni vere sull’argomento e ti lascio la fonte di ciascuna perché tu possa controllarla.',
  writerPasoCitas: 'Cercare le citazioni e le loro fonti',

  writerExplicaTraducir: 'Tradurrò il tuo testo in {{idioma}} mantenendo il senso e il tono.',
  writerPasoTraducir: 'Tradurre in {{idioma}}',
  writerDecisionIdiomaIngles: 'lo traduco in inglese',
  writerIdiomaEn: 'inglese',
  writerIdiomaPt: 'portoghese',
  writerIdiomaFr: 'francese',
  writerIdiomaIt: 'italiano',

  writerExplicaResumir: 'Riassumerò il tuo testo in idee chiave, in poche righe.',
  writerPasoResumir: 'Riassumere in idee chiave',
  writerExplicaCorregir: 'Correggerò ortografia, stile e chiarezza senza cambiare ciò che volevi dire.',
  writerPasoCorregir: 'Correggere ortografia, stile e chiarezza',
  writerExplicaIdeas: 'Ti proporrò diverse idee e un punto di partenza per scrivere senza blocchi.',
  writerPasoIdeas: 'Proporti idee per scrivere',

  writerExplicaPortada: 'Definirò il concept della copertina e creerò tre proposte tra cui scegliere.',
  writerPasoConceptoPortada: 'Definire il concept della copertina',
  writerPasoPropuestasPortada: 'Creare 3 proposte di copertina',

  writerExplicaReescribir: 'Riscriverò il tuo testo con un tono {{tono}}, mantenendo l’idea.',
  writerPasoReescribir: 'Riscrivere il testo',
  writerExplicaCv: 'Scriverò il tuo CV con un tono {{tono}}, pronto da usare nell’editor e da inviare.',
  writerPasoCv: 'Scrivere il tuo CV',

  writerExplicaPublicacion: 'Scriverò il post con un tono {{tono}}, poi lo rifinisco perché sia pronto.',
  writerExplicaHistoria: 'Scriverò la storia con un tono {{tono}}, poi la rifinisco perché sia pronta.',
  writerExplicaGuion: 'Scriverò la sceneggiatura con un tono {{tono}}, poi la rifinisco perché sia pronta.',
  writerExplicaArticulo: 'Scriverò l’articolo con un tono {{tono}}, poi lo rifinisco perché sia pronto.',
  writerExplicaEmail: 'Scriverò l’e-mail con un tono {{tono}}, poi la rifinisco perché sia pronta.',
  writerExplicaDocumento: 'Scriverò il documento con un tono {{tono}}, poi lo rifinisco perché sia pronto.',
  writerPasoPublicacion: 'Scrivere il post',
  writerPasoHistoria: 'Scrivere la storia',
  writerPasoGuion: 'Scrivere la sceneggiatura',
  writerPasoArticulo: 'Scrivere l’articolo',
  writerPasoEmail: 'Scrivere l’e-mail',
  writerPasoDocumento: 'Scrivere il documento',
  writerPasoPulir: 'Rifinire il testo perché sia pronto',

  writerDecisionEmpiezoPublicacion: 'comincio da un post',
  writerDecisionTonoCercano: 'uso un tono cordiale',
  writerDecisionTonoProfesional: 'uso un tono professionale',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Preparerò il testo e lo registrerò con una voce {{voz}}.',
  musicExplicaVozCalida: 'Preparerò il testo e lo registrerò con una voce calda e chiara.',
  musicPasoTextoNarracion: 'Preparare il testo della narrazione',
  musicPasoGrabarVoz: 'Registrare la voce',

  musicExplicaLetra: 'Scriverò il testo completo, stile {{estilo}}.',
  musicPasoLetraCompleta: 'Scrivere il testo completo',

  musicExplicaMezcla: 'Ascolterò la tua canzone, la mixerò e la masterizzerò perché suoni professionale.',
  musicPasoAnotarMezcla: 'Ascoltare la tua canzone e annotare il mix',
  musicPasoMasterizar: 'Mixare e masterizzare',

  musicExplicaVideoclip: 'Creerò la canzone ({{estilo}}, {{animo}}), le scene e monterò il tuo videoclip completo. Non devi uscire da Weë Music.',
  musicPasoIdeaYLetra: 'Scrivere l’idea e il testo',
  musicPasoEscenas: 'Creare le scene del videoclip',
  musicPasoArmarVideoclip: 'Montare il videoclip con la tua canzone',

  musicExplicaJingle: 'Creerò un jingle breve e orecchiabile, stile {{estilo}}, atmosfera {{animo}}.',
  musicPasoFraseJingle: 'Scrivere la frase del jingle',
  musicPasoJingle: 'Creare il jingle',
  musicExplicaBeat: 'Creerò un beat, stile {{estilo}}, atmosfera {{animo}}.',
  musicPasoIdeaMusical: 'Definire l’idea musicale',
  musicPasoBeat: 'Creare il beat',

  musicExplicaCancion: 'Scriverò il testo, creerò la canzone, stile {{estilo}}, atmosfera {{animo}}, e progetterò la copertina.',
  musicPasoLetra: 'Scrivere il testo',
  musicPasoCancion: 'Creare la canzone',
  musicPasoPortada: 'Progettare la copertina',

  musicDecisionEmpiezoCancion: 'comincio da una canzone',
  musicDecisionEstiloPop: 'ho scelto uno stile pop',
  musicDecisionAnimoAlegre: 'con un’atmosfera allegra',
  musicDecisionVozCalida: 'ho scelto una voce calda e chiara',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Guarderò la tua foto e comporrò una routine semplice per la cura della pelle, con prodotti facili da trovare.',
  beautyPasoRutina: 'Comporre la tua routine di cura',

  beautyExplicaRostro: 'Guarderò il tuo viso, ti consiglierò i tagli e gli stili che ti stanno meglio e te ne farò provare due sulla tua foto.',
  beautyPasoMirarRostro: 'Guardare il tuo viso',
  beautyPasoRecomendar: 'Consigliarti tagli, occhiali e stili',
  beautyPasoProbarDosEstilos: 'Provare i due stili che ti stanno meglio',

  beautyExplicaProbar: 'Proverò {{cambio}} per {{ocasion}} in due versioni, mantenendo il tuo viso, la tua pelle e la luce della foto.',
  beautyPasoProbar: 'Provare {{cambio}} mantenendo il tuo viso',
  beautyOcasionElDiaADia: 'la vita di tutti i giorni',

  beautyDecisionCambioCompleto: 'propongo un cambio di look completo',
  beautyDecisionOcasionDiaADia: 'l’ho pensato per la vita di tutti i giorni',
};
