/*
 * ISLANDÉS (is · is-IS) — la pantalla del perfil, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Prófíll» (pendiente, guía § 6), «Forsíðumynd» = portada, «Um mig» = biografía. Los nombres de persona
 * van de sujeto o en aposición para no declinarlos («{{nombre}} er í Weë», «prófílinn @{{nombre}}»).
 * Las pestañas: «Miðlar» (media), «Endurbirtingar» (reposts), «Líkar við» (likes, pendiente).
 * «Avatar» = «myndgervingur» (pendiente).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Bæta við forsíðumynd',
  permissionsTitle: 'Heimildir',
  galleryPermission: 'Heimild þarf til að opna myndasafnið',
  coverUploadFailed: 'Ekki tókst að hlaða upp forsíðumyndinni',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Hleður prófíl…',
  loadFailed: 'Ekki tókst að hlaða prófílnum',
  loadFailedDetail: 'Ekki tókst að hlaða upplýsingum um notandann',
  backToLogin: 'Til baka í innskráningu',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Nafnið má ekki vera autt',
  updateFailed: 'Ekki tókst að uppfæra prófílinn',
  signOutFailed: 'Ekki tókst að skrá út',
  noSession: 'Enginn er skráður inn',
  avatarUpdateFailed: 'Ekki tókst að uppfæra myndgervinginn. Reyndu aftur.',
  imageUrlMissing: 'Engin vefslóð myndar barst',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: '{{nombre}} er í Weë – skoðaðu prófílinn',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Breyta prófíl',
  displayNameLabel: 'Notandanafn',
  displayNamePlaceholder: 'Notandanafnið þitt',
  bioLabel: 'Um mig',
  bioPlaceholder: 'Segðu aðeins frá þér…',
  websiteLabel: 'Vefsíða',
  websitePlaceholder: 'https://vefsidanthin.is',
  charCount: '{{usados}}/{{maximo}} stafir',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Breyta prófíl',
  createWeeProfile: 'Búa til Weë-prófíl',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Færslur',
  viewMyEcontacts: 'Skoða tengiliðina mína: {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Miðlar',
  tabReposts: 'Endurbirtingar',
  tabLikes: 'Líkar við',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Hleður færslum…',
  postsFailed: 'Ekki tókst að hlaða færslunum',
  retry: 'Reyna aftur',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Þú átt engar færslur enn',
  emptyPostsHint: 'Deildu fyrstu færslunni þinni!',
  emptyMedia: 'Þú átt engar færslur með myndum eða myndböndum',
  emptyMediaHint: 'Búðu til færslu með myndum eða myndböndum',
  emptyReposts: 'Þú hefur ekki endurbirt neitt',
  emptyRepostsHint: 'Deildu efni frá öðrum notendum',
  emptyLikes: 'Þér líkar ekki við neinar færslur enn',
  emptyLikesHint: 'Merktu við „líkar við“ á færslum sem vekja áhuga þinn',
  otherTitle: 'Prófíll',
  otherLoadFailed: 'Ekki tókst að hlaða prófílnum',
  seeFullProfile: 'Sjá allan prófílinn minn',
  emptyCategory: 'Engar færslur í þessum flokki',
  actionFailed: 'Ekki tókst að ljúka þessu',
  userNotFound: 'Notandinn er ekki til',
  shareOtherMessage: 'Skoðaðu prófílinn @{{nombre}} í Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Notandi í Weë',
  joinedOn: 'Meðlimur frá {{fecha}}',
  tabPolls: 'Kannanir',
};
