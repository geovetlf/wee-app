/*
 * RUMANO — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}` y `{{animo}}` concuerdan en masculino con «ton» y «aer»; `{{voz}}`, en femenino con «voce». `{{cambio}}` es
 * objeto directo y `{{ocasion}}` va como etiqueta, porque «pentru» pide quitar el artículo que la opción ya trae.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Caut citate reale despre subiect și îți las sursa fiecăruia, ca să le poți verifica.',
  writerPasoCitas: 'Căutarea citatelor și a surselor lor',

  writerExplicaTraducir: 'Îți traduc textul în {{idioma}}, păstrând sensul și tonul.',
  writerPasoTraducir: 'Traducerea în {{idioma}}',
  writerDecisionIdiomaIngles: 'îl traduc în engleză',
  writerIdiomaEn: 'engleză',
  writerIdiomaPt: 'portugheză',
  writerIdiomaFr: 'franceză',
  writerIdiomaIt: 'italiană',

  writerExplicaResumir: 'Îți rezum textul în ideile principale, în câteva rânduri.',
  writerPasoResumir: 'Rezumarea în ideile principale',
  writerExplicaCorregir: 'Corectez ortografia, stilul și claritatea fără să schimb ce ai vrut să spui.',
  writerPasoCorregir: 'Corectarea ortografiei, a stilului și a clarității',
  writerExplicaIdeas: 'Îți propun mai multe idei și un punct de plecare, ca să scrii fără blocaje.',
  writerPasoIdeas: 'Propunerea de idei de scris',

  writerExplicaPortada: 'Definesc conceptul copertei și creez trei propuneri dintre care să alegi.',
  writerPasoConceptoPortada: 'Definirea conceptului copertei',
  writerPasoPropuestasPortada: 'Crearea a 3 propuneri de copertă',

  writerExplicaReescribir: 'Îți rescriu textul cu un ton {{tono}}, păstrând ideea.',
  writerPasoReescribir: 'Rescrierea textului',
  writerExplicaCv: 'Îți redactez CV-ul cu un ton {{tono}}, gata de folosit în editor și de trimis.',
  writerPasoCv: 'Redactarea CV-ului tău',

  writerExplicaPublicacion: 'Scriu postarea cu un ton {{tono}} și apoi o finisez ca să fie gata.',
  writerExplicaHistoria: 'Scriu povestea cu un ton {{tono}} și apoi o finisez ca să fie gata.',
  writerExplicaGuion: 'Scriu scenariul cu un ton {{tono}} și apoi îl finisez ca să fie gata.',
  writerExplicaArticulo: 'Scriu articolul cu un ton {{tono}} și apoi îl finisez ca să fie gata.',
  writerExplicaEmail: 'Redactez e-mailul cu un ton {{tono}} și apoi îl finisez ca să fie gata.',
  writerExplicaDocumento: 'Redactez documentul cu un ton {{tono}} și apoi îl finisez ca să fie gata.',
  writerPasoPublicacion: 'Scrierea postării',
  writerPasoHistoria: 'Scrierea poveștii',
  writerPasoGuion: 'Scrierea scenariului',
  writerPasoArticulo: 'Scrierea articolului',
  writerPasoEmail: 'Redactarea e-mailului',
  writerPasoDocumento: 'Redactarea documentului',
  writerPasoPulir: 'Finisarea textului, ca să fie gata',

  writerDecisionEmpiezoPublicacion: 'încep cu o postare',
  writerDecisionTonoCercano: 'folosesc un ton apropiat',
  writerDecisionTonoProfesional: 'folosesc un ton profesional',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Pregătesc textul și îl înregistrez cu o voce {{voz}}.',
  musicExplicaVozCalida: 'Pregătesc textul și îl înregistrez cu o voce caldă și clară.',
  musicPasoTextoNarracion: 'Pregătirea textului narațiunii',
  musicPasoGrabarVoz: 'Înregistrarea vocii',

  musicExplicaLetra: 'Scriu versurile complete, în stil {{estilo}}.',
  musicPasoLetraCompleta: 'Scrierea versurilor complete',

  musicExplicaMezcla: 'Îți ascult cântecul, îl mixez și îl masterizez ca să sune profesionist.',
  musicPasoAnotarMezcla: 'Ascultarea cântecului tău și notarea mixajului',
  musicPasoMasterizar: 'Mixarea și masterizarea',

  musicExplicaVideoclip: 'Creez cântecul ({{estilo}}, {{animo}}) și scenele și îți montez videoclipul complet. Nu trebuie să ieși din Weë Music.',
  musicPasoIdeaYLetra: 'Scrierea ideii și a versurilor',
  musicPasoEscenas: 'Crearea scenelor videoclipului',
  musicPasoArmarVideoclip: 'Montarea videoclipului cu cântecul tău',

  musicExplicaJingle: 'Creez un jingle scurt și ușor de ținut minte, în stil {{estilo}}, cu un aer {{animo}}.',
  musicPasoFraseJingle: 'Scrierea frazei jingle-ului',
  musicPasoJingle: 'Crearea jingle-ului',
  musicExplicaBeat: 'Creez un beat în stil {{estilo}}, cu un aer {{animo}}.',
  musicPasoIdeaMusical: 'Definirea ideii muzicale',
  musicPasoBeat: 'Crearea beat-ului',

  musicExplicaCancion: 'Scriu versurile, creez cântecul în stil {{estilo}}, cu un aer {{animo}}, și îi proiectez coperta.',
  musicPasoLetra: 'Scrierea versurilor',
  musicPasoCancion: 'Crearea cântecului',
  musicPasoPortada: 'Proiectarea copertei',

  musicDecisionEmpiezoCancion: 'încep cu un cântec',
  musicDecisionEstiloPop: 'am ales un stil pop',
  musicDecisionAnimoAlegre: 'cu un aer vesel',
  musicDecisionVozCalida: 'am ales o voce caldă și clară',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Mă uit la fotografia ta și îți alcătuiesc o rutină simplă de îngrijire a pielii, cu produse ușor de găsit.',
  beautyPasoRutina: 'Alcătuirea rutinei tale de îngrijire',

  beautyExplicaRostro: 'Mă uit la chipul tău, îți recomand tunsorile și stilurile care ți se potrivesc cel mai bine și încerc două pe fotografia ta.',
  beautyPasoMirarRostro: 'Analizarea chipului tău',
  beautyPasoRecomendar: 'Recomandarea de tunsori, ochelari și stiluri',
  beautyPasoProbarDosEstilos: 'Încercarea celor două stiluri care ți se potrivesc cel mai bine',

  beautyExplicaProbar: 'Încerc {{cambio}} în două versiuni (ocazie: {{ocasion}}), păstrând chipul, pielea și lumina din fotografie.',
  beautyPasoProbar: 'Încercare: {{cambio}}, păstrând chipul tău',
  beautyOcasionElDiaADia: 'viața de zi cu zi',

  beautyDecisionCambioCompleto: 'îți propun o schimbare completă de look',
  beautyDecisionOcasionDiaADia: 'l-am gândit pentru viața de zi cu zi',
};
