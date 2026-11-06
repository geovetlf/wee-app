/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}` y `{{voz}}` acompañan a «tom» y «voz» como adjetivos; `{{animo}}`, a «ambiente». `{{cambio}}` y `{{ocasion}}`
 * llegan con su artículo si lo tienen.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Procuro citações reais sobre o tema e deixo-te a fonte de cada uma para poderes confirmar.',
  writerPasoCitas: 'Procurar as citações e as suas fontes',

  writerExplicaTraducir: 'Vou traduzir o teu texto para {{idioma}}, mantendo o sentido e o tom.',
  writerPasoTraducir: 'Traduzir para {{idioma}}',
  writerDecisionIdiomaIngles: 'traduzo para inglês',
  writerIdiomaEn: 'inglês',
  writerIdiomaPt: 'português',
  writerIdiomaFr: 'francês',
  writerIdiomaIt: 'italiano',

  writerExplicaResumir: 'Vou resumir o teu texto nas ideias principais, em poucas linhas.',
  writerPasoResumir: 'Resumir nas ideias principais',
  writerExplicaCorregir: 'Vou corrigir a ortografia, o estilo e a clareza sem mudar o que quiseste dizer.',
  writerPasoCorregir: 'Corrigir ortografia, estilo e clareza',
  writerExplicaIdeas: 'Vou sugerir várias ideias e um ponto de partida para escreveres sem bloqueios.',
  writerPasoIdeas: 'Sugerir ideias para escrever',

  writerExplicaPortada: 'Vou definir o conceito da capa e criar três propostas para escolheres.',
  writerPasoConceptoPortada: 'Definir o conceito da capa',
  writerPasoPropuestasPortada: 'Criar 3 propostas de capa',

  writerExplicaReescribir: 'Vou reescrever o teu texto com um tom {{tono}}, mantendo a ideia.',
  writerPasoReescribir: 'Reescrever o texto',
  writerExplicaCv: 'Vou escrever o teu currículo com um tom {{tono}}, pronto para usares no editor e enviares.',
  writerPasoCv: 'Escrever o teu currículo',

  writerExplicaPublicacion: 'Vou escrever a publicação com um tom {{tono}} e depois dar-lhe os últimos retoques para ficar pronta.',
  writerExplicaHistoria: 'Vou escrever a história com um tom {{tono}} e depois dar-lhe os últimos retoques para ficar pronta.',
  writerExplicaGuion: 'Vou escrever o guião com um tom {{tono}} e depois dar-lhe os últimos retoques para ficar pronto.',
  writerExplicaArticulo: 'Vou escrever o artigo com um tom {{tono}} e depois dar-lhe os últimos retoques para ficar pronto.',
  writerExplicaEmail: 'Vou escrever o e-mail com um tom {{tono}} e depois dar-lhe os últimos retoques para ficar pronto.',
  writerExplicaDocumento: 'Vou escrever o documento com um tom {{tono}} e depois dar-lhe os últimos retoques para ficar pronto.',
  writerPasoPublicacion: 'Escrever a publicação',
  writerPasoHistoria: 'Escrever a história',
  writerPasoGuion: 'Escrever o guião',
  writerPasoArticulo: 'Escrever o artigo',
  writerPasoEmail: 'Escrever o e-mail',
  writerPasoDocumento: 'Escrever o documento',
  writerPasoPulir: 'Dar os últimos retoques ao texto',

  writerDecisionEmpiezoPublicacion: 'começo por uma publicação',
  writerDecisionTonoCercano: 'uso um tom amigável',
  writerDecisionTonoProfesional: 'uso um tom profissional',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Vou preparar o texto e gravá-lo com uma voz {{voz}}.',
  musicExplicaVozCalida: 'Vou preparar o texto e gravá-lo com uma voz calorosa e clara.',
  musicPasoTextoNarracion: 'Preparar o texto da narração',
  musicPasoGrabarVoz: 'Gravar a voz',

  musicExplicaLetra: 'Vou escrever a letra completa, estilo {{estilo}}.',
  musicPasoLetraCompleta: 'Escrever a letra completa',

  musicExplicaMezcla: 'Vou ouvir a tua canção, misturá-la e masterizá-la para soar profissional.',
  musicPasoAnotarMezcla: 'Ouvir a tua canção e anotar a mistura',
  musicPasoMasterizar: 'Misturar e masterizar',

  musicExplicaVideoclip: 'Vou criar a canção ({{estilo}}, {{animo}}) e as cenas, e montar o teu videoclipe completo. Não precisas de sair do Weë Music.',
  musicPasoIdeaYLetra: 'Escrever a ideia e a letra',
  musicPasoEscenas: 'Criar as cenas do videoclipe',
  musicPasoArmarVideoclip: 'Montar o videoclipe com a tua canção',

  musicExplicaJingle: 'Vou criar um jingle curto e fácil de memorizar em estilo {{estilo}}, ambiente {{animo}}.',
  musicPasoFraseJingle: 'Escrever a frase do jingle',
  musicPasoJingle: 'Criar o jingle',
  musicExplicaBeat: 'Vou criar um beat em estilo {{estilo}}, ambiente {{animo}}.',
  musicPasoIdeaMusical: 'Definir a ideia musical',
  musicPasoBeat: 'Criar o beat',

  musicExplicaCancion: 'Vou escrever a letra, criar a canção em estilo {{estilo}} com ambiente {{animo}} e criar a capa.',
  musicPasoLetra: 'Escrever a letra',
  musicPasoCancion: 'Criar a canção',
  musicPasoPortada: 'Criar a capa',

  musicDecisionEmpiezoCancion: 'começo por uma canção',
  musicDecisionEstiloPop: 'escolhi um estilo pop',
  musicDecisionAnimoAlegre: 'com um ambiente alegre',
  musicDecisionVozCalida: 'escolhi uma voz calorosa e clara',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Vou ver a tua foto e preparar uma rotina simples de cuidados com a pele, com produtos fáceis de encontrar.',
  beautyPasoRutina: 'Preparar a tua rotina de cuidados',

  beautyExplicaRostro: 'Vou ver o teu rosto, recomendar os cortes e estilos que mais combinam contigo e experimentar dois na tua foto.',
  beautyPasoMirarRostro: 'Ver o teu rosto',
  beautyPasoRecomendar: 'Recomendar cortes, óculos e estilos',
  beautyPasoProbarDosEstilos: 'Experimentar os dois estilos que mais combinam contigo',

  beautyExplicaProbar: 'Vou experimentar {{cambio}} para {{ocasion}} em duas versões, mantendo o teu rosto, a tua pele e a luz da foto.',
  beautyPasoProbar: 'Experimentar {{cambio}} mantendo o teu rosto',
  beautyOcasionElDiaADia: 'o dia a dia',

  beautyDecisionCambioCompleto: 'sugiro uma mudança completa de visual',
  beautyDecisionOcasionDiaADia: 'pensei para o dia a dia',
};
