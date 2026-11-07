/*
 * FILIPINO — Weë Biz: el directorio, el perfil de un negocio, sus productos y su alta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre de un negocio, su especialidad, su descripción, sus productos y sus
 * reseñas los escribió una persona: no pasan por aquí, entran por hueco.
 *
 * Las palabras son las de Weë Business y del glosario (§ 11): negocio «negosyo»,
 * producto «produkto», precio «presyo», reseña «review» y la nota con
 * estrellas, «rating» (§ 11.11, Negocio); seguidores «Mga follower», seguir
 * «I-follow» y siguiendo «Naka-follow» (§ 11.2, § 11.3); «Verificado» es
 * «Na-verify», el participio de «I-verify». El directorio es «direktoryo».
 * «Weë Biz» y «Weë Business» no se declinan: «Nasa Weë Business na…».
 *
 * Las categorías van en una rejilla de cuatro por fila y en UNA línea: por eso
 * son cortas. «Hogar» es «Bahay» (alquiler, decoración, venta de vivienda);
 * «Servicios Técnicos» es «Pag-aayos» (electricistas, fontaneros: lo que se
 * arregla); «Belleza», «Pagpapaganda», como en Weë Studio; «Automotriz»,
 * «Sasakyan»; «Mascotas», «Alagang hayop» («alaga» solo se lee también como
 * «cuidado», que es una de sus especialidades); «Legal», «Batas». Las que son
 * gente o cosas sueltas llevan «mga» para no quedarse en una palabra inglesa
 * desnuda: «Mga creator», «Mga creative», «Mga event».
 *
 * Las pistas de especialidad solo se leen dentro de «Halimbawa: {{ejemplos}}»
 * («Ej:» es «Halimbawa:», como en el catálogo; no se abrevia, § 9), así que
 * empiezan en minúscula. Los ejemplos son filipinos: lechon, milk tea y kakanin;
 * talyer, piyesa y car wash; vlogger; tubero; review center; notaryo; el café
 * del barrio, «Kapihan sa Kanto»; la ciudad, «Makati, Metro Manila»; la web,
 * www.negosyoko.ph. «Precio a consultar» es «Magtanong ng presyo». Los fallos
 * llevan el paso siguiente, «Subukan ulit» (§ 3.4), aunque el español no lo
 * escriba, y borrar sigue el patrón de la guía («Gusto mo bang i-delete …?
 * Hindi na ito maibabalik.»). Cuando Weë habla de sí mismo, «namin» (§ 2).
 *
 * `created` dice que el negocio ya está en Weë Business y que se abre su perfil
 * para completarlo: el «cambia a tu perfil de negocio desde el menú» de antes se
 * fue con el Perfil Biz (2026-09-19).
 *
 * Se escriben igual que en inglés porque ES la palabra que se usa: «Featured»
 * (glosario § 11.6), «Rating», «Logo» y «Currency».
 */
export const weebiz: typeof import('../es/weebiz').weebiz = {
  noBusinesses: 'Walang nahanap na negosyo',
  searchPlaceholder: 'Maghanap ng negosyo…',
  categories: 'Mga kategorya',
  moreCategories: 'Tingnan ang iba pang kategorya',
  featured: 'Featured',
  newBusinesses: 'Mga bagong negosyo',
  registerMine: 'Irehistro ang negosyo ko',
  noneYet: 'Wala pang negosyo',
  notFound: 'Hindi mahanap ang negosyo',
  followers: 'Mga follower',
  reviews: 'Mga review',
  verified: 'Na-verify na negosyo',
  about: 'Tungkol sa negosyo',
  products: 'Mga produkto',
  addProduct: 'Magdagdag ng produkto',
  writeReview: 'Magsulat ng review',
  noReviewsYet: 'Wala pang review',
  leaveReview: 'Mag-iwan ng review',
  yourReview: 'Ang review mo',
  rating: 'Rating',
  yourOpinion: 'Ang opinyon mo',
  reviewPlaceholder: 'Ikuwento sa amin ang naging karanasan mo…',
  sendReview: 'Ipadala ang review',
  chatFailed: 'Hindi mabuksan ang chat. Subukan ulit.',
  linkFailed: 'Hindi mabuksan ang link. Subukan ulit.',
  requiredTitle: 'Kailangan ito',
  opinionRequired: 'Isulat ang opinyon mo.',
  reviewFailed: 'Hindi maipadala ang review. Subukan ulit.',
  deleteReviewTitle: 'I-delete ang review',
  deleteReviewConfirm: 'Gusto mo bang i-delete ang review mo? Hindi na ito maibabalik.',
  notAvailable: 'Hindi available',
  noProductsYet: 'Wala pang produkto',
  addFirstProduct: 'Idagdag ang una mong produkto o serbisyo.',
  addPhoto: 'Magdagdag ng larawan',
  nameRequired: 'Pangalan *',
  namePlaceholder: 'Halimbawa: Pork sisig',
  price: 'Presyo',
  currency: 'Currency',
  description: 'Paglalarawan',
  descriptionPlaceholder: 'Ilarawan ang produkto o serbisyo…',
  permissionTitle: 'Kailangan ng pahintulot',
  galleryPermission: 'Kailangan namin ng access sa gallery mo.',
  productNameRequired: 'Ilagay ang pangalan ng produkto.',
  productSaveFailed: 'Hindi ma-save ang produkto. Subukan ulit.',
  deleteProductTitle: 'I-delete ang produkto',
  deleteProductConfirm: 'Gusto mo bang i-delete ang “{{nombre}}”?',
  logo: 'Logo',
  addLogo: 'Magdagdag ng logo',
  businessNameRequired: 'Pangalan ng negosyo *',
  businessNamePlaceholder: 'Halimbawa: Kapihan sa Kanto',
  categoryRequired: 'Kategorya *',
  speciality: 'Espesyalidad',
  businessDescriptionPlaceholder: 'Ikuwento sa mga tao ang tungkol sa negosyo mo…',
  location: 'Lokasyon',
  locationPlaceholder: 'Halimbawa: Makati, Metro Manila',
  externalLink: 'Panlabas na link',
  externalLinkPlaceholder: 'Halimbawa: www.negosyoko.ph',
  signInFirst: 'Kailangan mo munang mag-sign in.',
  businessNameMissing: 'Ilagay ang pangalan ng negosyo mo.',
  categoryMissing: 'Pumili ng kategorya.',
  updated: 'Na-update ang negosyo mo.',
  createdTitle: 'Nagawa na ang negosyo',
  created: 'Nasa Weë Business na ang negosyo mo. Buksan ang profile nito para i-review at kumpletuhin ito.',
  viewProfile: 'Tingnan ang profile',
  saveFailed: 'Hindi ma-save ang negosyo. Subukan ulit.',
  catProfessionalServices: 'Serbisyo',
  catStores: 'Tindahan',
  catFood: 'Pagkain',
  catBeauty: 'Pagpapaganda',
  catHealth: 'Kalusugan',
  catCreators: 'Mga creator',
  catHome: 'Bahay',
  catTech: 'Teknolohiya',
  catTechnicalServices: 'Pag-aayos',
  catCreatives: 'Mga creative',
  catCompanies: 'Kumpanya',
  catAutomotive: 'Sasakyan',
  catEducation: 'Edukasyon',
  catTravel: 'Biyahe',
  catPets: 'Alagang hayop',
  catEvents: 'Mga event',
  catFinance: 'Pananalapi',
  catLegal: 'Batas',
  catSpirituality: 'Espiritwalidad',
  catOther: 'Iba pa',
  firstInCategory: 'Maging unang magrehistro ng negosyo sa kategoryang {{categoria}}.',
  editBusinessTitle: 'I-edit ang negosyo',
  registerBusinessTitle: 'Irehistro ang negosyo',
  saveChanges: 'I-save ang mga pagbabago',
  createBusiness: 'Gumawa ng negosyo',
  specialityPlaceholder: 'Halimbawa: {{ejemplos}}',
  specialityNeedsCategory: 'Pumili muna ng kategorya',
  specialityHintProfessionalServices: 'konsultasyon, coaching…',
  specialityHintStores: 'damit, gadget, accessory…',
  specialityHintFood: 'lechon, milk tea, kakanin…',
  specialityHintBeauty: 'barbershop, spa, makeup…',
  specialityHintHealth: 'nutrisyon, sikolohiya, gym…',
  specialityHintCreators: 'streamer, vlogger, guro…',
  specialityHintHome: 'paupahan, dekorasyon, real estate…',
  specialityHintTech: 'web development, marketing, AI…',
  specialityHintTechnicalServices: 'elektrisyan, tubero…',
  specialityHintCreatives: 'photography, disenyo, video…',
  specialityHintCompanies: 'startup, ahensya, brand…',
  specialityHintAutomotive: 'talyer, piyesa, car wash…',
  specialityHintEducation: 'kurso, review center, tutor…',
  specialityHintTravel: 'tour, hotel, tour guide…',
  specialityHintPets: 'vet clinic, pet grooming, pag-ampon…',
  specialityHintEvents: 'DJ, event host, palabas…',
  specialityHintFinance: 'pamumuhunan, insurance, crypto…',
  specialityHintLegal: 'abogado, notaryo, law firm…',
  specialityHintSpirituality: 'tarot, meditasyon, coaching…',
  specialityHintOther: 'ilarawan ang negosyo mo…',
  specialityHintDefault: 'ilarawan ang espesyalidad mo…',
  editProductTitle: 'I-edit ang produkto',
  newProductTitle: 'Bagong produkto',
  priceOnRequest: 'Magtanong ng presyo',
  follow: 'I-follow',
  following: 'Naka-follow',
  manageProducts: 'Pamahalaan',
  seeAllProducts: 'Tingnan lahat',
  reviewsCount: 'Mga review ({{cantidad}})',
  directoryEmpty: 'Ang direktoryo ng mga negosyo sa Weë.\nMalapit nang lumabas dito ang mga negosyo.',
};
