/*
 * ITALIANO — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu) y apóstrofo tipográfico ’ (U+2019) siempre.
 * "Media", "Repost" y "Mi piace" son las palabras que usa quien lee esto, y en
 * italiano los préstamos no pluralizan: "Repost", no "Reposts". `{{nombre}}` de
 * la agenda (ËContact) y `{{motivo}}` del servidor salen sin tocar: no son
 * palabras nuestras. La dirección del hueco de `websitePlaceholder` es un
 * EJEMPLO que se lee, no la de nadie: por eso sí se traduce.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Aggiungi una copertina',
  permissionsTitle: 'Autorizzazioni',
  galleryPermission: 'Servono le autorizzazioni per accedere alla galleria',
  coverUploadFailed: 'Non è stato possibile caricare l’immagine di copertina',

  loading: 'Caricamento del profilo...',
  loadFailed: 'Errore nel caricamento del profilo',
  loadFailedDetail: 'Non è stato possibile caricare i dati dell’utente',
  backToLogin: 'Torna all’accesso',

  nameRequired: 'Il nome non può essere vuoto',
  updateFailed: 'Non è stato possibile aggiornare il profilo',
  signOutFailed: 'Non è stato possibile uscire',
  noSession: 'Nessuna sessione attiva',
  avatarUpdateFailed: 'Non è stato possibile aggiornare l’avatar. Riprova.',
  imageUrlMissing: 'Non è stato ricevuto nessun URL dell’immagine',

  shareMessage: 'Guarda il profilo di {{nombre}} su Weë',

  editTitle: 'Modifica profilo',
  displayNameLabel: 'Nome utente',
  displayNamePlaceholder: 'Il tuo nome utente',
  bioLabel: 'Biografia',
  bioPlaceholder: 'Raccontaci di te...',
  websiteLabel: 'Sito web',
  websitePlaceholder: 'https://iltuosito.com',
  charCount: '{{usados}}/{{maximo}} caratteri',

  editProfile: 'Modifica profilo',
  createWeeProfile: 'Crea il Profilo Weë',

  posts: 'Post',
  viewMyEcontacts: 'Vedi i miei {{nombre}}, {{total}}',

  tabMedia: 'Media',
  tabReposts: 'Repost',
  tabLikes: 'Mi piace',

  loadingPosts: 'Caricamento dei post...',
  postsFailed: 'Errore nel caricamento dei post',
  retry: 'Riprova',

  emptyPosts: 'Non hai ancora nessun post',
  emptyPostsHint: 'Condividi il tuo primo post!',
  emptyMedia: 'Non hai post con foto o video',
  emptyMediaHint: 'Crea un post con foto o video',
  emptyReposts: 'Non hai ripubblicato niente',
  emptyRepostsHint: 'Condividi i contenuti di altre persone',
  emptyLikes: 'Non hai messo Mi piace a nessun post',
  emptyLikesHint: 'Metti Mi piace ai post che ti interessano',
  otherTitle: 'Profilo',
  otherLoadFailed: 'Non è stato possibile caricare il profilo',
  seeFullProfile: 'Vedi il mio profilo completo',
  emptyCategory: 'Nessun post in questa categoria',
  actionFailed: 'Non è stato possibile completare l’azione',
  userNotFound: 'Questo utente non esiste',
  shareOtherMessage: 'Guarda il profilo di @{{nombre}} su Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Utente di Weë',
  joinedOn: 'Su Weë da {{fecha}}',
  tabPolls: 'Sondaggi',
};
