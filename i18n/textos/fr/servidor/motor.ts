/*
 * FRANCÉS — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se llenan con las piezas `campo…` y `archivo…`. Como «audio» y «document» no se elidirían
 * igual detrás de «le», las piezas `archivo…` traen su artículo y las frases no ponen ninguno.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Il manque quelque chose dans ta demande. Vérifie-la et réessaie.',
  unauthorized: 'Connecte-toi pour créer avec Weë.',
  accountRequired: 'Pour créer du contenu avec Weë AI, connecte-toi ou crée ton compte.',
  providerError: 'L’IA n’a pas pu terminer ta création cette fois. Rien ne t’a été facturé : réessaie dans un instant.',
  generationFailed: 'Je n’ai pas pu terminer ta création. Rien ne t’a été facturé : réessaie.',
  timeout: 'Ça a pris trop de temps et je l’ai arrêtée. Rien ne t’a été facturé : réessaie.',
  rateLimited: 'Tu as lancé beaucoup de créations à la suite. Rien ne t’a été facturé : attends un instant et réessaie.',
  duplicate: 'Cette création est déjà en cours.',
  notAvailable: 'Cette fonction n’est pas encore disponible.',
  inputRejected: 'La photo ou la vidéo n’a pas pu servir à la génération : les visages réels et ce type de contenu ne sont pas acceptés. Essaie avec une autre image ou description.',
  faltaCampo: 'Il manque {{campo}}.',
  revisaCampo: 'Vérifie {{campo}} : il faut entre 1 et {{max}} caractères.',
  campoMensaje: 'ton message',
  campoDescripcionVideo: 'la description de la vidéo',
  conversacionNoEncontrada: 'Nous n’avons pas trouvé cette conversation.',
  sinPlan: 'Ce travail n’a pas encore de plan.',
  sinUnPlan: 'Ce travail n’a pas encore de plan établi.',
  yaTienePlan: 'Ce travail a déjà un plan.',
  subeFoto: 'Envoie une photo pour que Weë puisse travailler avec.',
  trabajoNoEncontrado: 'Nous n’avons pas trouvé ce travail.',
  trabajoAjeno: 'Ce travail n’est pas à toi.',
  experienciaDesconocida: 'Expérience inconnue.',
  faltaTrabajo: 'Il manque le travail.',
  intentoSinTiempo: 'Le temps de cette tentative est écoulé et je t’ai rendu tes Credits. Tu peux réessayer.',
  fotoDireccion: 'L’adresse de la photo n’est pas valide.',
  fotoSubir: 'La photo doit être envoyée sur Weë avant d’être utilisée.',
  fotoAjena: 'Cette photo n’est pas à toi.',
  archivoSube: 'Envoie {{archivo}} pour que Weë puisse le lire.',
  archivoDireccion: 'Adresse non valide pour {{archivo}}.',
  archivoSubir: 'Il faut d’abord envoyer {{archivo}} sur Weë pour pouvoir l’utiliser.',
  archivoAjeno: 'Ce fichier n’est pas à toi : {{archivo}}.',
  archivoDocumento: 'le document',
  archivoAudio: 'l’audio',
  sinTiempoAntes: 'Le temps s’est écoulé avant de commencer. Rien ne t’a été facturé.',
  sinProveedor: 'Aucune IA n’est disponible pour ça en ce moment. Réessaie plus tard.',
  noDisponibleActualmente: 'Cette fonction n’est pas disponible actuellement.',
  noDisponibleAhora: 'Cette fonction n’est pas disponible pour le moment. Réessaie dans un petit moment.',
  noDisponibleOpciones: 'Cette fonction n’est pas disponible avec les options que tu as choisies. Essaie-en d’autres.',
  describeVideo: 'Dis-moi quelle vidéo tu veux créer.',
  creacionTerminada: 'Cette création est déjà terminée et ne sera pas refaite. Cherche-la dans tes créations.',
  tomaInvalida: 'Cette prise n’a pas une forme valide.',
  planoInvalido: 'Ce plan n’a pas une forme valide.',
  produccionNoEncontrada: 'Nous n’avons pas trouvé cette production.',
  tomaNoGenerable: 'Cette prise ne peut pas être générée ainsi.',
  creacionNoEncontrada: 'Nous n’avons pas trouvé cette création.',
  debesIniciarSesion: 'Tu dois te connecter',
};
