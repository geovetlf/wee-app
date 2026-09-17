/*
 * CHINO SIMPLIFICADO — weebiz: el directorio, el perfil de un negocio, sus
 * productos y su alta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre de un negocio, su especialidad, su descripción, sus productos y sus
 * reseñas los escribió una persona: no pasan por aquí, entran por hueco.
 *
 * Dos decisiones de este archivo:
 *   · `deleteProductConfirm` lleva el nombre del producto dentro de comillas
 *     chinas 「」, no de las comillas rectas del español;
 *   · «Logo» y «Weë Biz» se quedan en alfabeto latino dentro del hanzi, como en
 *     inglés, alemán, francés, italiano y portugués: en una app china «Logo» se
 *     escribe así.
 */
export const weebiz: typeof import('../es/weebiz').weebiz = {
  noBusinesses: '没有找到商家',
  searchPlaceholder: '搜索商家…',
  categories: '分类',
  moreCategories: '查看更多分类',
  featured: '精选',
  newBusinesses: '新入驻商家',
  registerMine: '注册我的商家',
  noneYet: '还没有商家',
  notFound: '找不到这个商家',
  followers: '粉丝',
  reviews: '评价',
  verified: '已认证商家',
  about: '简介',
  products: '商品',
  addProduct: '添加商品',
  writeReview: '写评价',
  noReviewsYet: '还没有评价',
  leaveReview: '发表评价',
  yourReview: '你的评价',
  rating: '评分',
  yourOpinion: '你的看法',
  reviewPlaceholder: '说说你的体验…',
  sendReview: '发送评价',
  chatFailed: '无法打开聊天。',
  linkFailed: '无法打开链接。',
  requiredTitle: '必填项',
  opinionRequired: '请写下你的看法。',
  reviewFailed: '评价发送失败。',
  deleteReviewTitle: '删除评价',
  deleteReviewConfirm: '确定要删除你的评价吗？',
  notAvailable: '暂不可用',
  noProductsYet: '还没有商品',
  addFirstProduct: '添加你的第一个商品或服务。',
  addPhoto: '添加照片',
  nameRequired: '名称 *',
  namePlaceholder: '例如：经典汉堡',
  price: '价格',
  currency: '货币',
  description: '描述',
  descriptionPlaceholder: '介绍一下这个商品或服务…',
  permissionTitle: '需要权限',
  galleryPermission: '需要访问相册的权限。',
  productNameRequired: '请输入商品名称。',
  productSaveFailed: '商品保存失败。',
  deleteProductTitle: '删除商品',
  deleteProductConfirm: '要删除“{{nombre}}”吗？',
  logo: 'Logo',
  addLogo: '添加 Logo',
  businessNameRequired: '商家名称 *',
  businessNamePlaceholder: '例如：Café Central',
  categoryRequired: '分类 *',
  speciality: '主营业务',
  businessDescriptionPlaceholder: '向大家介绍一下你的商家…',
  location: '位置',
  locationPlaceholder: '例如：秘鲁利马',
  externalLink: '外部链接',
  externalLinkPlaceholder: '例如：www.mybusiness.com',
  signInFirst: '需要先登录。',
  businessNameMissing: '请输入你的商家名称。',
  categoryMissing: '请选择一个分类。',
  updated: '你的商家信息已更新。',
  createdTitle: '商家已创建',
  created: '你的商家已经在 Weë Biz 上线了。现在可以从菜单切换到商家资料。',
  viewProfile: '查看资料',
  saveFailed: '商家保存失败。',
};
