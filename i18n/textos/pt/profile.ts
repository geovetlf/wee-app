/*
 * PORTUGUÉS (pt-BR) — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). `{{nombre}}` de la agenda (ËContact) y
 * `{{motivo}}` del servidor salen sin tocar: no son palabras nuestras. La
 * dirección del hueco de `websitePlaceholder` es un EJEMPLO que se lee, no la
 * de nadie: por eso sí se traduce. "Reposts" se queda como en inglés, alemán y
 * francés; "Curtidas" y "Mídia" sí son las palabras que usa quien lee esto.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Adicionar capa',
  permissionsTitle: 'Permissões',
  galleryPermission: 'São necessárias permissões para acessar a galeria',
  coverUploadFailed: 'Não foi possível enviar a imagem de capa',

  loading: 'Carregando o perfil...',
  loadFailed: 'Erro ao carregar o perfil',
  loadFailedDetail: 'Não foi possível carregar as informações do usuário',
  backToLogin: 'Voltar para o login',

  nameRequired: 'O nome não pode ficar vazio',
  updateFailed: 'Não foi possível atualizar o perfil',
  signOutFailed: 'Não foi possível sair',
  noSession: 'Não há sessão ativa',
  avatarUpdateFailed: 'Não foi possível atualizar o avatar. Tente de novo.',
  imageUrlMissing: 'Não recebemos a URL da imagem',

  shareMessage: 'Veja o perfil de {{nombre}} no Weë',

  editTitle: 'Editar perfil',
  displayNameLabel: 'Nome de usuário',
  displayNamePlaceholder: 'O seu nome de usuário',
  bioLabel: 'Biografia',
  bioPlaceholder: 'Conte para a gente sobre você...',
  websiteLabel: 'Site',
  websitePlaceholder: 'https://seusite.com',
  charCount: '{{usados}}/{{maximo}} caracteres',

  editProfile: 'Editar perfil',
  createWeeProfile: 'Criar Perfil Weë',

  posts: 'Publicações',
  viewMyEcontacts: 'Ver os meus {{nombre}}, {{total}}',

  tabMedia: 'Mídia',
  tabReposts: 'Reposts',
  tabLikes: 'Curtidas',

  loadingPosts: 'Carregando as publicações...',
  postsFailed: 'Erro ao carregar as publicações',
  retry: 'Tentar de novo',

  emptyPosts: 'Você ainda não tem publicações',
  emptyPostsHint: 'Compartilhe o seu primeiro post!',
  emptyMedia: 'Você não tem publicações com fotos ou vídeos',
  emptyMediaHint: 'Crie um post com fotos ou vídeos',
  emptyReposts: 'Você não republicou nada',
  emptyRepostsHint: 'Compartilhe o conteúdo de outras pessoas',
  emptyLikes: 'Você não curtiu nenhuma publicação',
  emptyLikesHint: 'Curta as publicações que te interessam',
  otherTitle: 'Perfil',
  otherLoadFailed: 'Não foi possível carregar o perfil',
  seeFullProfile: 'Ver o meu perfil completo',
  emptyCategory: 'Sem publicações nesta categoria',
  actionFailed: 'Não foi possível concluir',
};
