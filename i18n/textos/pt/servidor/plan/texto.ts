/*
 * PORTUGUÉS (pt-BR) — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}` y `{{voz}}` acompañan a «tom» y «voz» como adjetivos; `{{animo}}`, a «clima». `{{cambio}}` y `{{ocasion}}`
 * llegan con su artículo si lo tienen.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Busco citações reais sobre o tema e deixo a fonte de cada uma para você poder conferir.',
  writerPasoCitas: 'Buscar as citações e suas fontes',

  writerExplicaTraducir: 'Vou traduzir seu texto para o {{idioma}}, mantendo o sentido e o tom.',
  writerPasoTraducir: 'Traduzir para o {{idioma}}',
  writerDecisionIdiomaIngles: 'traduzo para o inglês',
  writerIdiomaEn: 'inglês',
  writerIdiomaPt: 'português',
  writerIdiomaFr: 'francês',
  writerIdiomaIt: 'italiano',

  writerExplicaResumir: 'Vou resumir seu texto nas ideias principais, em poucas linhas.',
  writerPasoResumir: 'Resumir nas ideias principais',
  writerExplicaCorregir: 'Vou corrigir a ortografia, o estilo e a clareza sem mudar o que você quis dizer.',
  writerPasoCorregir: 'Corrigir ortografia, estilo e clareza',
  writerExplicaIdeas: 'Vou sugerir várias ideias e um ponto de partida para você escrever sem travar.',
  writerPasoIdeas: 'Sugerir ideias para escrever',

  writerExplicaPortada: 'Vou definir o conceito da capa e criar três propostas para você escolher.',
  writerPasoConceptoPortada: 'Definir o conceito da capa',
  writerPasoPropuestasPortada: 'Criar 3 propostas de capa',

  writerExplicaReescribir: 'Vou reescrever seu texto com um tom {{tono}}, mantendo a ideia.',
  writerPasoReescribir: 'Reescrever o texto',
  writerExplicaCv: 'Vou escrever seu currículo com um tom {{tono}}, pronto para usar no editor e enviar.',
  writerPasoCv: 'Escrever seu currículo',

  writerExplicaPublicacion: 'Vou escrever a publicação com um tom {{tono}} e depois dar um polimento para deixar pronta.',
  writerExplicaHistoria: 'Vou escrever a história com um tom {{tono}} e depois dar um polimento para deixar pronta.',
  writerExplicaGuion: 'Vou escrever o roteiro com um tom {{tono}} e depois dar um polimento para deixar pronto.',
  writerExplicaArticulo: 'Vou escrever o artigo com um tom {{tono}} e depois dar um polimento para deixar pronto.',
  writerExplicaEmail: 'Vou escrever o e-mail com um tom {{tono}} e depois dar um polimento para deixar pronto.',
  writerExplicaDocumento: 'Vou escrever o documento com um tom {{tono}} e depois dar um polimento para deixar pronto.',
  writerPasoPublicacion: 'Escrever a publicação',
  writerPasoHistoria: 'Escrever a história',
  writerPasoGuion: 'Escrever o roteiro',
  writerPasoArticulo: 'Escrever o artigo',
  writerPasoEmail: 'Escrever o e-mail',
  writerPasoDocumento: 'Escrever o documento',
  writerPasoPulir: 'Polir o texto e deixar pronto',

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

  musicExplicaMezcla: 'Vou ouvir sua música, mixar e masterizar para ela soar profissional.',
  musicPasoAnotarMezcla: 'Ouvir sua música e anotar a mixagem',
  musicPasoMasterizar: 'Mixar e masterizar',

  musicExplicaVideoclip: 'Vou criar a música ({{estilo}}, {{animo}}), as cenas e montar seu clipe completo. Você não precisa sair do Weë Music.',
  musicPasoIdeaYLetra: 'Escrever a ideia e a letra',
  musicPasoEscenas: 'Criar as cenas do clipe',
  musicPasoArmarVideoclip: 'Montar o clipe com a sua música',

  musicExplicaJingle: 'Vou criar um jingle curto e chiclete em estilo {{estilo}}, clima {{animo}}.',
  musicPasoFraseJingle: 'Escrever a frase do jingle',
  musicPasoJingle: 'Criar o jingle',
  musicExplicaBeat: 'Vou criar um beat em estilo {{estilo}}, clima {{animo}}.',
  musicPasoIdeaMusical: 'Definir a ideia musical',
  musicPasoBeat: 'Criar o beat',

  musicExplicaCancion: 'Vou escrever a letra, criar a música em estilo {{estilo}} com clima {{animo}} e criar a capa dela.',
  musicPasoLetra: 'Escrever a letra',
  musicPasoCancion: 'Criar a música',
  musicPasoPortada: 'Criar a capa',

  musicDecisionEmpiezoCancion: 'começo por uma música',
  musicDecisionEstiloPop: 'escolhi um estilo pop',
  musicDecisionAnimoAlegre: 'com clima alegre',
  musicDecisionVozCalida: 'escolhi uma voz calorosa e clara',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Vou olhar sua foto e montar uma rotina simples de cuidados com a pele, com produtos fáceis de encontrar.',
  beautyPasoRutina: 'Montar sua rotina de cuidados',

  beautyExplicaRostro: 'Vou olhar seu rosto, recomendar os cortes e estilos que mais combinam com você e testar dois na sua foto.',
  beautyPasoMirarRostro: 'Olhar seu rosto',
  beautyPasoRecomendar: 'Recomendar cortes, óculos e estilos',
  beautyPasoProbarDosEstilos: 'Testar os dois estilos que mais combinam com você',

  beautyExplicaProbar: 'Vou testar {{cambio}} para {{ocasion}} em duas versões, mantendo seu rosto, sua pele e a luz da foto.',
  beautyPasoProbar: 'Testar {{cambio}} mantendo seu rosto',
  beautyOcasionElDiaADia: 'o dia a dia',

  beautyDecisionCambioCompleto: 'sugiro uma mudança completa de visual',
  beautyDecisionOcasionDiaADia: 'pensei para o dia a dia',
};
