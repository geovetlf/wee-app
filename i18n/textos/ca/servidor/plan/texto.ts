/*
 * CATALÁN — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{idioma}}` entra detrás de «en» («en anglès», «en italià»): con «a» habría que contraer o apostrofar («al francès»,
 * «a l'anglès») y el hueco no puede. `{{cambio}}` va como objeto directo y `{{ocasion}}`, detrás de «per a».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Busco cites reals sobre el tema i et deixo la font de cadascuna perquè les puguis comprovar.',
  writerPasoCitas: 'Buscar les cites i les seves fonts',

  writerExplicaTraducir: 'Traduiré el teu text i te\'l deixaré en {{idioma}}, mantenint el sentit i el to.',
  writerPasoTraducir: 'Preparar la versió en {{idioma}}',
  writerDecisionIdiomaIngles: 'el tradueixo a l\'anglès',
  writerIdiomaEn: 'anglès',
  writerIdiomaPt: 'portuguès',
  writerIdiomaFr: 'francès',
  writerIdiomaIt: 'italià',

  writerExplicaResumir: 'Resumiré el teu text en les idees clau, en poques línies.',
  writerPasoResumir: 'Resumir en idees clau',
  writerExplicaCorregir: 'Corregiré l\'ortografia, l\'estil i la claredat sense canviar el que volies dir.',
  writerPasoCorregir: 'Corregir l\'ortografia, l\'estil i la claredat',
  writerExplicaIdeas: 'Et proposaré diverses idees i un punt de partida perquè escriguis sense bloqueig.',
  writerPasoIdeas: 'Proposar-te idees per escriure',

  writerExplicaPortada: 'Definiré el concepte de la portada i crearé tres propostes perquè triïs.',
  writerPasoConceptoPortada: 'Definir el concepte de la portada',
  writerPasoPropuestasPortada: 'Crear 3 propostes de portada',

  writerExplicaReescribir: 'Reescriuré el teu text amb un to {{tono}}, mantenint la idea.',
  writerPasoReescribir: 'Reescriure el text',
  writerExplicaCv: 'Redactaré el teu CV amb un to {{tono}}, a punt per fer servir a l\'editor i enviar.',
  writerPasoCv: 'Redactar el teu CV',

  writerExplicaPublicacion: 'Escriuré la publicació amb un to {{tono}} i després la poliré perquè quedi a punt.',
  writerExplicaHistoria: 'Escriuré la història amb un to {{tono}} i després la poliré perquè quedi a punt.',
  writerExplicaGuion: 'Escriuré el guió amb un to {{tono}} i després el poliré perquè quedi a punt.',
  writerExplicaArticulo: 'Escriuré l\'article amb un to {{tono}} i després el poliré perquè quedi a punt.',
  writerExplicaEmail: 'Redactaré el correu amb un to {{tono}} i després el poliré perquè quedi a punt.',
  writerExplicaDocumento: 'Redactaré el document amb un to {{tono}} i després el poliré perquè quedi a punt.',
  writerPasoPublicacion: 'Escriure la publicació',
  writerPasoHistoria: 'Escriure la història',
  writerPasoGuion: 'Escriure el guió',
  writerPasoArticulo: 'Escriure l\'article',
  writerPasoEmail: 'Redactar el correu',
  writerPasoDocumento: 'Redactar el document',
  writerPasoPulir: 'Polir el text i deixar-lo a punt',

  writerDecisionEmpiezoPublicacion: 'començo per una publicació',
  writerDecisionTonoCercano: 'faig servir un to proper',
  writerDecisionTonoProfesional: 'faig servir un to professional',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Prepararé el text i l\'enregistraré amb una veu {{voz}}.',
  musicExplicaVozCalida: 'Prepararé el text i l\'enregistraré amb una veu càlida i clara.',
  musicPasoTextoNarracion: 'Preparar el text de la narració',
  musicPasoGrabarVoz: 'Enregistrar la veu',

  musicExplicaLetra: 'Escriuré la lletra completa, estil {{estilo}}.',
  musicPasoLetraCompleta: 'Escriure la lletra completa',

  musicExplicaMezcla: 'Escoltaré la teva cançó, la mesclaré i la masteritzaré perquè soni professional.',
  musicPasoAnotarMezcla: 'Escoltar la teva cançó i anotar la mescla',
  musicPasoMasterizar: 'Mesclar i masteritzar',

  musicExplicaVideoclip: 'Crearé la cançó ({{estilo}}, {{animo}}), les escenes i muntaré el teu videoclip complet. No cal que surtis de Weë Music.',
  musicPasoIdeaYLetra: 'Escriure la idea i la lletra',
  musicPasoEscenas: 'Crear les escenes del videoclip',
  musicPasoArmarVideoclip: 'Muntar el videoclip amb la teva cançó',

  musicExplicaJingle: 'Crearé un jingle curt i enganxós, estil {{estilo}}, ànim {{animo}}.',
  musicPasoFraseJingle: 'Escriure la frase del jingle',
  musicPasoJingle: 'Crear el jingle',
  musicExplicaBeat: 'Crearé un beat, estil {{estilo}}, ànim {{animo}}.',
  musicPasoIdeaMusical: 'Definir la idea musical',
  musicPasoBeat: 'Crear el beat',

  musicExplicaCancion: 'Escriuré la lletra, crearé la cançó, estil {{estilo}}, ànim {{animo}}, i dissenyaré la portada.',
  musicPasoLetra: 'Escriure la lletra',
  musicPasoCancion: 'Crear la cançó',
  musicPasoPortada: 'Dissenyar la portada',

  musicDecisionEmpiezoCancion: 'començo per una cançó',
  musicDecisionEstiloPop: 'he triat un estil pop',
  musicDecisionAnimoAlegre: 'amb un ànim alegre',
  musicDecisionVozCalida: 'he triat una veu càlida i clara',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Miraré la teva foto i prepararé una rutina senzilla de cura de la pell, amb productes fàcils d\'aconseguir.',
  beautyPasoRutina: 'Preparar la teva rutina de cura',

  beautyExplicaRostro: 'Miraré la teva cara, et recomanaré els talls i estils que et queden millor i te\'n provaré dos a la foto.',
  beautyPasoMirarRostro: 'Mirar la teva cara',
  beautyPasoRecomendar: 'Recomanar-te talls, ulleres i estils',
  beautyPasoProbarDosEstilos: 'Provar els dos estils que et queden millor',

  beautyExplicaProbar: 'Provaré {{cambio}} per a {{ocasion}} en dues versions, conservant la teva cara, la pell i la llum de la foto.',
  beautyPasoProbar: 'Provar {{cambio}} conservant la teva cara',
  beautyOcasionElDiaADia: 'cada dia',

  beautyDecisionCambioCompleto: 'proposo un canvi de look complet',
  beautyDecisionOcasionDiaADia: 'ho he pensat per al dia a dia',
};
