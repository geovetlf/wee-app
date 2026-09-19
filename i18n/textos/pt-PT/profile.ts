/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * LO QUE NO ENTRA AQUÍ: el nombre, el usuario, la biografía y el enlace de quien
 * mira, que los escribió una persona; ËContacts y ẄContacts, que son marca y
 * entran por el hueco `{{nombre}}` ya escritos; y `{{motivo}}`, que es lo que
 * dijo el servidor. La dirección de EJEMPLO de `websitePlaceholder` sí se
 * traduce: nadie la visita, se lee.
 *
 * ESTO NO ES EL BRASILEÑO CON OTRAS PALABRAS:
 *
 *   ESTAR A + INFINITIVO: "A carregar o perfil..." y no "Carregando o perfil...".
 *   TRATO DE "TU": "Ainda não tens publicações", "o teu nome de utilizador",
 *   "Partilha o teu primeiro post", "Dá um gosto".
 *
 * Y el vocabulario, término a término:
 *
 *   utilizador (no usuário) · aceder (no acessar) · terminar sessão (no sair)
 *   partilhar (no compartilhar) · Gostos (no Curtidas) · Multimédia (no Mídia)
 *   a informação, en singular · "o URL", masculino en Portugal y femenino en
 *   Brasil · "início de sessão" para volver del Login
 *
 * "Reposts" se queda como en inglés, alemán, francés y brasileño: es la palabra
 * que usa quien lee esto. Y "Perfil Weë" es marca: no se traduce ni se descapitaliza.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Adicionar capa',
  permissionsTitle: 'Permissões',
  galleryPermission: 'São necessárias permissões para aceder à galeria',
  coverUploadFailed: 'Não foi possível enviar a imagem de capa',

  loading: 'A carregar o perfil...',
  loadFailed: 'Erro ao carregar o perfil',
  loadFailedDetail: 'Não foi possível carregar a informação do utilizador',
  backToLogin: 'Voltar ao início de sessão',

  nameRequired: 'O nome não pode ficar vazio',
  updateFailed: 'Não foi possível atualizar o perfil',
  signOutFailed: 'Não foi possível terminar sessão',
  noSession: 'Não há nenhuma sessão ativa',
  avatarUpdateFailed: 'Não foi possível atualizar o avatar. Tenta de novo.',
  imageUrlMissing: 'Não recebemos o URL da imagem',

  shareMessage: 'Vê o perfil de {{nombre}} no Weë',

  editTitle: 'Editar perfil',
  displayNameLabel: 'Nome de utilizador',
  displayNamePlaceholder: 'O teu nome de utilizador',
  bioLabel: 'Biografia',
  bioPlaceholder: 'Conta-nos algo sobre ti...',
  websiteLabel: 'Site',
  websitePlaceholder: 'https://oteusite.com',
  charCount: '{{usados}}/{{maximo}} caracteres',

  editProfile: 'Editar perfil',
  createWeeProfile: 'Criar Perfil Weë',

  posts: 'Publicações',
  viewMyEcontacts: 'Ver os meus {{nombre}}, {{total}}',

  tabMedia: 'Multimédia',
  tabReposts: 'Reposts',
  tabLikes: 'Gostos',

  loadingPosts: 'A carregar as publicações...',
  postsFailed: 'Erro ao carregar as publicações',
  retry: 'Tentar novamente',

  emptyPosts: 'Ainda não tens publicações',
  emptyPostsHint: 'Partilha o teu primeiro post!',
  emptyMedia: 'Não tens publicações com fotos ou vídeos',
  emptyMediaHint: 'Cria um post com fotos ou vídeos',
  emptyReposts: 'Ainda não republicaste nada',
  emptyRepostsHint: 'Partilha o conteúdo de outras pessoas',
  emptyLikes: 'Ainda não gostaste de nenhuma publicação',
  emptyLikesHint: 'Dá um gosto às publicações que te interessam',
  otherTitle: 'Perfil',
  otherLoadFailed: 'Não foi possível carregar o perfil',
  seeFullProfile: 'Ver o meu perfil completo',
  emptyCategory: 'Sem publicações nesta categoria',
  actionFailed: 'Não foi possível concluir',
};
