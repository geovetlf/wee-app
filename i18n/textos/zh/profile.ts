/*
 * CHINO SIMPLIFICADO — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * PERFIL REAL Y PERFIL WEË NO SE ESCRIBEN IGUAL: el real es 真实主页, pero el otro
 * es «Weë 主页», con la marca en alfabeto latino. Weë no se traduce ni se pasa a
 * hanzi: ni 威, ni 维, ni nada.
 *
 * `{{nombre}}` de la agenda (ËContact/ẄContact) y `{{motivo}}` del servidor salen
 * sin tocar: no son palabras nuestras. Van entre espacios porque lo que salga de
 * ahí puede venir en alfabeto latino.
 *
 * La dirección de `websitePlaceholder` es un EJEMPLO que se lee, no la de nadie:
 * por eso sí se traduce.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: '添加封面',
  permissionsTitle: '权限',
  galleryPermission: '需要访问相册的权限',
  coverUploadFailed: '没能上传封面图片',

  loading: '正在加载主页…',
  loadFailed: '没能加载主页',
  loadFailedDetail: '没能加载用户信息',
  backToLogin: '返回登录',

  nameRequired: '名字不能为空',
  updateFailed: '没能更新主页',
  signOutFailed: '没能退出登录',
  noSession: '当前没有登录的账号',
  avatarUpdateFailed: '没能更新头像：{{motivo}}',
  imageUrlMissing: '没有收到图片 URL',

  shareMessage: '来 Weë 看看 {{nombre}} 的主页',

  editTitle: '编辑资料',
  displayNameLabel: '昵称',
  displayNamePlaceholder: '你的昵称',
  bioLabel: '个人简介',
  bioPlaceholder: '介绍一下你自己…',
  websiteLabel: '网站',
  websitePlaceholder: 'https://你的网站.com',
  charCount: '{{usados}}/{{maximo}} 个字符',

  editProfile: '编辑资料',
  createWeeProfile: '创建 Weë 主页',

  posts: '动态',
  viewMyEcontacts: '查看我的 {{nombre}}，共 {{total}} 个',

  tabMedia: '媒体',
  tabReposts: '转发',
  tabLikes: '点赞',

  loadingPosts: '正在加载动态…',
  postsFailed: '没能加载动态',
  retry: '重试',

  emptyPosts: '你还没有发过动态',
  emptyPostsHint: '发布你的第一条动态吧！',
  emptyMedia: '你还没有带图片或视频的动态',
  emptyMediaHint: '发一条带照片或视频的动态',
  emptyReposts: '你还没有转发过内容',
  emptyRepostsHint: '把别人的内容分享出去',
  emptyLikes: '你还没有点赞过动态',
  emptyLikesHint: '给喜欢的动态点个赞',
  otherTitle: '主页',
  otherLoadFailed: '没能加载主页',
  seeFullProfile: '查看我的完整主页',
  emptyCategory: '这个分类下还没有动态',
  actionFailed: '没能完成这个操作',
};
