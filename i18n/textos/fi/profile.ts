/*
 * FINÉS — La pantalla del perfil propio, entera. Tipado contra el español: si
 * allí hay una clave que aquí falta, no compila.
 *
 * El nombre de la persona entra por hueco y no se declina: el genitivo lo
 * lleva la palabra ANTERIOR («käyttäjän {{nombre}} profiili»). La agenda
 * (ËContacts / ẄContacts) entra ya nombrada en `{{nombre}}` tras «omat», que
 * la deja en nominativo plural. «Media», «Reposts» y «Likes» no son palabras
 * finesas: las pestañas van en finés («Media» se queda, que es la palabra
 * corriente; «Uudelleenjaot», «Tykkäykset»).
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Lisää kansikuva',
  permissionsTitle: 'Käyttöoikeudet',
  galleryPermission: 'Gallerian käyttöön tarvitaan lupa',
  coverUploadFailed: 'Kansikuvaa ei voitu ladata',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Ladataan profiilia...',
  loadFailed: 'Profiilin lataaminen epäonnistui',
  loadFailedDetail: 'Käyttäjän tietoja ei voitu ladata',
  backToLogin: 'Takaisin kirjautumiseen',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Nimi ei voi olla tyhjä',
  updateFailed: 'Profiilia ei voitu päivittää',
  signOutFailed: 'Uloskirjautuminen ei onnistunut',
  noSession: 'Ei aktiivista istuntoa',
  avatarUpdateFailed: 'Avataria ei voitu päivittää. Yritä uudelleen.',
  imageUrlMissing: 'Kuvan URL-osoitetta ei saatu',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Katso käyttäjän {{nombre}} profiili Weë-sovelluksessa',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Muokkaa profiilia',
  displayNameLabel: 'Käyttäjänimi',
  displayNamePlaceholder: 'Käyttäjänimesi',
  bioLabel: 'Bio',
  bioPlaceholder: 'Kerro itsestäsi...',
  websiteLabel: 'Verkkosivusto',
  /* Una dirección de EJEMPLO, no la de nadie: es texto que se lee. */
  websitePlaceholder: 'https://sivustosi.fi',
  charCount: '{{usados}}/{{maximo}} merkkiä',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Muokkaa profiilia',
  createWeeProfile: 'Luo Weë-profiili',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'Julkaisut',
  viewMyEcontacts: 'Näytä omat {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Media',
  tabReposts: 'Uudelleenjaot',
  tabLikes: 'Tykkäykset',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Ladataan julkaisuja...',
  postsFailed: 'Julkaisujen lataaminen epäonnistui',
  retry: 'Yritä uudelleen',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'Sinulla ei ole vielä julkaisuja',
  emptyPostsHint: 'Jaa ensimmäinen julkaisusi!',
  emptyMedia: 'Sinulla ei ole julkaisuja, joissa on mediaa',
  emptyMediaHint: 'Luo julkaisu, jossa on kuvia tai videoita',
  emptyReposts: 'Et ole jakanut mitään uudelleen',
  emptyRepostsHint: 'Jaa muiden käyttäjien sisältöä',
  emptyLikes: 'Et ole tykännyt yhdestäkään julkaisusta',
  emptyLikesHint: 'Tykkää julkaisuista, jotka kiinnostavat sinua',
  otherTitle: 'Profiili',
  otherLoadFailed: 'Profiilia ei voitu ladata',
  seeFullProfile: 'Näytä koko profiilini',
  emptyCategory: 'Ei julkaisuja tässä luokassa',
  actionFailed: 'Ei onnistunut',
  userNotFound: 'Käyttäjää ei ole olemassa',
  shareOtherMessage: 'Katso käyttäjän @{{nombre}} profiili Weë-sovelluksessa!\n\n{{bio}}',
  shareOtherNoBio: 'Weë-käyttäjä',
  joinedOn: 'Liittyi {{fecha}}',
  tabPolls: 'Kyselyt',
};
