/*
 * CHINO TRADICIONAL (TAIWÁN) — weebiz: el directorio, el perfil de un negocio,
 * sus productos y su alta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre de un negocio, su especialidad, su descripción, sus productos y sus
 * reseñas los escribió una persona: no pasan por aquí, entran por hueco.
 *
 * Tres decisiones de este archivo:
 *   · `deleteProductConfirm` lleva el nombre del producto dentro de comillas
 *     chinas 「」, no de las comillas rectas del español;
 *   · «Logo» y «Weë Biz» se quedan en alfabeto latino dentro del hanzi, como en
 *     inglés, alemán, francés, italiano y portugués: en una app china «Logo» se
 *     escribe así;
 *   · «Registrar mi negocio» es 登記, que en Taiwán es dar de alta un comercio
 *     (商業登記) —no la palabra que allí significa entrar en una cuenta, que es
 *     登入 y solo se usa en `signInFirst`—.
 *
 * VOCABULARIO DE TAIWÁN, no conversión de trazos: buscar es 搜尋, un enlace es
 * 連結, abrir es 開啟, añadir es 新增, guardar es 儲存, crear es 建立, el menú
 * de la app es 選單, el campo obligatorio es 必填欄位, la moneda es 幣別 y dar
 * acceso a la galería es 存取相簿.
 */
export const weebiz: typeof import('../es/weebiz').weebiz = {
  noBusinesses: '找不到商家',
  searchPlaceholder: '搜尋商家…',
  categories: '分類',
  moreCategories: '查看更多分類',
  featured: '精選',
  newBusinesses: '新加入的商家',
  registerMine: '登記我的商家',
  noneYet: '還沒有商家',
  notFound: '找不到這個商家',
  followers: '粉絲',
  reviews: '評價',
  verified: '已認證商家',
  about: '簡介',
  products: '商品',
  addProduct: '新增商品',
  writeReview: '寫評價',
  noReviewsYet: '還沒有評價',
  leaveReview: '留下評價',
  yourReview: '你的評價',
  rating: '評分',
  yourOpinion: '你的想法',
  reviewPlaceholder: '說說你的體驗…',
  sendReview: '送出評價',
  chatFailed: '無法開啟聊天。',
  linkFailed: '無法開啟連結。',
  requiredTitle: '必填欄位',
  opinionRequired: '請寫下你的想法。',
  reviewFailed: '評價送出失敗。',
  deleteReviewTitle: '刪除評價',
  deleteReviewConfirm: '確定要刪除你的評價嗎？',
  notAvailable: '暫不提供',
  noProductsYet: '還沒有商品',
  addFirstProduct: '新增你的第一個商品或服務。',
  addPhoto: '新增照片',
  nameRequired: '名稱 *',
  namePlaceholder: '例如：經典漢堡',
  price: '價格',
  currency: '幣別',
  description: '描述',
  descriptionPlaceholder: '介紹一下這個商品或服務…',
  permissionTitle: '需要權限',
  galleryPermission: '需要存取相簿的權限。',
  productNameRequired: '請輸入商品名稱。',
  productSaveFailed: '商品儲存失敗。',
  deleteProductTitle: '刪除商品',
  deleteProductConfirm: '要刪除「{{nombre}}」嗎？',
  logo: 'Logo',
  addLogo: '新增 Logo',
  businessNameRequired: '商家名稱 *',
  businessNamePlaceholder: '例如：Café Central',
  categoryRequired: '分類 *',
  speciality: '特色',
  businessDescriptionPlaceholder: '向大家介紹一下你的商家…',
  location: '地點',
  locationPlaceholder: '例如：祕魯利馬',
  externalLink: '外部連結',
  externalLinkPlaceholder: '例如：www.mybusiness.com',
  signInFirst: '需要先登入。',
  businessNameMissing: '請輸入你的商家名稱。',
  categoryMissing: '請選擇一個分類。',
  updated: '你的商家資料已更新。',
  createdTitle: '商家已建立',
  created: '你的商家已經在 Weë Biz 上線了。現在可以從選單切換到商家資料。',
  viewProfile: '查看資料',
  saveFailed: '商家儲存失敗。',
};
