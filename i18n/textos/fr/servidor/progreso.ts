/*
 * FRANCÉS — Lo que dice un trabajo de Weë AI mientras se hace (ver `../../es/servidor/progreso.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * El gerundio español («Creando tu imagen…») se dice en francés con el nombre de la acción («Création de ton image…»).
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'C’est parti…',
  ajustandoVertical: 'Adaptation de ton Weël au format vertical…',
  montando: 'Montage de ton Weël…',
  generandoWeel: 'Génération de ton Weël…',
  creandoImagen: 'Création de ton image…',
  grabandoVoz: 'Enregistrement de la voix…',
  efectosDeSonido: 'Ajout des effets sonores…',
  componiendo: 'Composition de la musique…',
  mirandoFoto: 'Analyse de ta photo…',
  preparandoDocumento: 'Préparation de ton document…',
  escribiendoGuion: 'Écriture du scénario…',
  dividiendoEscenas: 'Découpage de l’histoire en scènes…',
  creandoSubtitulos: 'Création des sous-titres…',
  escribiendo: 'Écriture en cours…',
  paso: '{{proposito}}…',
  sinTiempo: 'Le temps est écoulé. Je t’ai rendu tes Credits.',
  listo: '✨ C’est prêt',
  fallaVideo: 'Je n’ai pas réussi à générer la vidéo cette fois. Rien ne t’a été facturé : réessaie dans un instant.',
  fallaImagen: 'Je n’ai pas réussi à créer l’image cette fois. Rien ne t’a été facturé : réessaie dans un instant.',
  fallaGeneral: 'Ça n’a pas marché cette fois. Rien ne t’a été facturé : réessaie dans un instant.',
  fallaCorta: 'Ça n’a pas marché. Rien ne t’a été facturé.',
};
