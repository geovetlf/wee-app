/*
 * NEERLANDÉS — La pantalla del perfil propio (y la del perfil ajeno), entera.
 * Tipado contra el español.
 *
 * Pestañas cortas: «Media» y «Reposts» se quedan (son las palabras de las apps en NL); «Likes» es «Vind-ik-leuks»
 * como el contador del glosario. En frases, «reposten» es «opnieuw plaatsen» como en el Wäll.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Omslagfoto toevoegen',
  permissionsTitle: 'Toestemmingen',
  galleryPermission: 'Er is toestemming nodig om je galerij te openen',
  coverUploadFailed: 'De omslagfoto kon niet worden geüpload',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Profiel laden...',
  loadFailed: 'Het profiel kon niet worden geladen',
  loadFailedDetail: 'De gebruikersgegevens konden niet worden geladen',
  backToLogin: 'Terug naar inloggen',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'De naam mag niet leeg zijn',
  updateFailed: 'Het profiel kon niet worden bijgewerkt',
  signOutFailed: 'Uitloggen is niet gelukt',
  noSession: 'Er is geen actieve sessie',
  avatarUpdateFailed: 'De avatar kon niet worden bijgewerkt. Probeer het opnieuw.',
  imageUrlMissing: 'Er is geen afbeeldings-URL ontvangen',

  /* ── Compartir el perfil. ────────────────────────────────────────────── */
  shareMessage: 'Bekijk het profiel van {{nombre}} op Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Profiel bewerken',
  displayNameLabel: 'Gebruikersnaam',
  displayNamePlaceholder: 'Je gebruikersnaam',
  bioLabel: 'Bio',
  bioPlaceholder: 'Vertel iets over jezelf...',
  websiteLabel: 'Website',
  websitePlaceholder: 'https://jouwsite.nl',
  charCount: '{{usados}}/{{maximo}} tekens',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Profiel bewerken',
  createWeeProfile: 'Weë-profiel maken',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Berichten',
  viewMyEcontacts: 'Mijn {{nombre}} bekijken, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Media',
  tabReposts: 'Reposts',
  tabLikes: 'Vind-ik-leuks',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Berichten laden...',
  postsFailed: 'De berichten konden niet worden geladen',
  retry: 'Opnieuw proberen',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Je hebt nog geen berichten',
  emptyPostsHint: 'Deel je eerste bericht!',
  emptyMedia: 'Je hebt geen berichten met foto\'s of video\'s',
  emptyMediaHint: 'Maak een bericht met foto\'s of video\'s',
  emptyReposts: 'Je hebt nog niets opnieuw geplaatst',
  emptyRepostsHint: 'Deel content van andere gebruikers',
  emptyLikes: 'Je hebt nog geen berichten leuk gevonden',
  emptyLikesHint: 'Geef een vind-ik-leuk aan berichten die je interesseren',
  otherTitle: 'Profiel',
  otherLoadFailed: 'Het profiel kon niet worden geladen',
  seeFullProfile: 'Mijn volledige profiel bekijken',
  emptyCategory: 'Geen berichten in deze categorie',
  actionFailed: 'Dat is niet gelukt',
  userNotFound: 'Deze gebruiker bestaat niet',
  shareOtherMessage: 'Bekijk het profiel van @{{nombre}} op Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Weë-gebruiker',
  joinedOn: 'Lid sinds {{fecha}}',
  tabPolls: 'Polls',
};
