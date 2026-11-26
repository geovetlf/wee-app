/*
 * FRANCÉS — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{idioma}}` va detrás de «en» («en anglais»). `{{tono}}` acompaña a «ton» (masculino), `{{voz}}` a «voix» y
 * `{{animo}}` a «ambiance» (femeninos). `{{cambio}}` y `{{ocasion}}` llegan con su artículo.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Je cherche de vraies citations sur le sujet et je te laisse la source de chacune pour que tu puisses les vérifier.',
  writerPasoCitas: 'Chercher les citations et leurs sources',

  writerExplicaTraducir: 'Je vais traduire ton texte en {{idioma}} en gardant le sens et le ton.',
  writerPasoTraducir: 'Traduire en {{idioma}}',
  writerDecisionIdiomaIngles: 'je le traduis en anglais',
  writerIdiomaEn: 'anglais',
  writerIdiomaPt: 'portugais',
  writerIdiomaFr: 'français',
  writerIdiomaIt: 'italien',

  writerExplicaResumir: 'Je vais résumer ton texte en idées clés, en quelques lignes.',
  writerPasoResumir: 'Résumer en idées clés',
  writerExplicaCorregir: 'Je vais corriger l’orthographe, le style et la clarté sans changer ce que tu voulais dire.',
  writerPasoCorregir: 'Corriger l’orthographe, le style et la clarté',
  writerExplicaIdeas: 'Je vais te proposer plusieurs idées et un point de départ pour écrire sans blocage.',
  writerPasoIdeas: 'Te proposer des idées pour écrire',

  writerExplicaPortada: 'Je vais définir le concept de la couverture et créer trois propositions pour que tu choisisses.',
  writerPasoConceptoPortada: 'Définir le concept de la couverture',
  writerPasoPropuestasPortada: 'Créer 3 propositions de couverture',

  writerExplicaReescribir: 'Je vais réécrire ton texte sur un ton {{tono}}, en gardant l’idée.',
  writerPasoReescribir: 'Réécrire le texte',
  writerExplicaCv: 'Je vais rédiger ton CV sur un ton {{tono}}, prêt à utiliser dans l’éditeur et à envoyer.',
  writerPasoCv: 'Rédiger ton CV',

  writerExplicaPublicacion: 'Je vais écrire la publication sur un ton {{tono}}, puis je la peaufine pour qu’elle soit prête.',
  writerExplicaHistoria: 'Je vais écrire l’histoire sur un ton {{tono}}, puis je la peaufine pour qu’elle soit prête.',
  writerExplicaGuion: 'Je vais écrire le scénario sur un ton {{tono}}, puis je le peaufine pour qu’il soit prêt.',
  writerExplicaArticulo: 'Je vais écrire l’article sur un ton {{tono}}, puis je le peaufine pour qu’il soit prêt.',
  writerExplicaEmail: 'Je vais rédiger l’e-mail sur un ton {{tono}}, puis je le peaufine pour qu’il soit prêt.',
  writerExplicaDocumento: 'Je vais rédiger le document sur un ton {{tono}}, puis je le peaufine pour qu’il soit prêt.',
  writerPasoPublicacion: 'Écrire la publication',
  writerPasoHistoria: 'Écrire l’histoire',
  writerPasoGuion: 'Écrire le scénario',
  writerPasoArticulo: 'Écrire l’article',
  writerPasoEmail: 'Rédiger l’e-mail',
  writerPasoDocumento: 'Rédiger le document',
  writerPasoPulir: 'Peaufiner le texte pour qu’il soit prêt',

  writerDecisionEmpiezoPublicacion: 'je commence par une publication',
  writerDecisionTonoCercano: 'j’utilise un ton chaleureux',
  writerDecisionTonoProfesional: 'j’utilise un ton professionnel',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Je vais préparer le texte et l’enregistrer avec une voix {{voz}}.',
  musicExplicaVozCalida: 'Je vais préparer le texte et l’enregistrer avec une voix chaleureuse et claire.',
  musicPasoTextoNarracion: 'Préparer le texte de la narration',
  musicPasoGrabarVoz: 'Enregistrer la voix',

  musicExplicaLetra: 'Je vais écrire les paroles complètes, style {{estilo}}.',
  musicPasoLetraCompleta: 'Écrire les paroles complètes',

  musicExplicaMezcla: 'Je vais écouter ta chanson, la mixer et la masteriser pour qu’elle sonne pro.',
  musicPasoAnotarMezcla: 'Écouter ta chanson et noter le mixage',
  musicPasoMasterizar: 'Mixer et masteriser',

  musicExplicaVideoclip: 'Je vais créer la chanson ({{estilo}}, {{animo}}), les scènes et monter ton clip complet. Tu n’as pas besoin de quitter Weë Music.',
  musicPasoIdeaYLetra: 'Écrire l’idée et les paroles',
  musicPasoEscenas: 'Créer les scènes du clip',
  musicPasoArmarVideoclip: 'Monter le clip avec ta chanson',

  musicExplicaJingle: 'Je vais créer un jingle court et entraînant, style {{estilo}}, ambiance {{animo}}.',
  musicPasoFraseJingle: 'Écrire la phrase du jingle',
  musicPasoJingle: 'Créer le jingle',
  musicExplicaBeat: 'Je vais créer un beat, style {{estilo}}, ambiance {{animo}}.',
  musicPasoIdeaMusical: 'Définir l’idée musicale',
  musicPasoBeat: 'Créer le beat',

  musicExplicaCancion: 'Je vais écrire les paroles, créer la chanson, style {{estilo}}, ambiance {{animo}}, et concevoir sa pochette.',
  musicPasoLetra: 'Écrire les paroles',
  musicPasoCancion: 'Créer la chanson',
  musicPasoPortada: 'Concevoir la pochette',

  musicDecisionEmpiezoCancion: 'je commence par une chanson',
  musicDecisionEstiloPop: 'j’ai choisi un style pop',
  musicDecisionAnimoAlegre: 'avec une ambiance joyeuse',
  musicDecisionVozCalida: 'j’ai choisi une voix chaleureuse et claire',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Je vais regarder ta photo et composer une routine de soin de la peau simple, avec des produits faciles à trouver.',
  beautyPasoRutina: 'Composer ta routine de soin',

  beautyExplicaRostro: 'Je vais regarder ton visage, te recommander les coupes et les styles qui te vont le mieux et t’en faire essayer deux sur ta photo.',
  beautyPasoMirarRostro: 'Regarder ton visage',
  beautyPasoRecomendar: 'Te recommander des coupes, des lunettes et des styles',
  beautyPasoProbarDosEstilos: 'Essayer les deux styles qui te vont le mieux',

  beautyExplicaProbar: 'Je vais essayer {{cambio}} pour {{ocasion}} en deux versions, en gardant ton visage, ta peau et la lumière de la photo.',
  beautyPasoProbar: 'Essayer {{cambio}} en gardant ton visage',
  beautyOcasionElDiaADia: 'le quotidien',

  beautyDecisionCambioCompleto: 'je propose un changement de look complet',
  beautyDecisionOcasionDiaADia: 'je l’ai prévu pour le quotidien',
};
