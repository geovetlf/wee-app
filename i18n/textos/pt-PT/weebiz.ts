/*
 * PORTUGUÉS DE PORTUGAL — weebiz: el directorio, el perfil de un negocio, sus
 * productos y su alta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre de un negocio, su especialidad, su descripción, sus productos y sus
 * reseñas los escribió una persona: no pasan por aquí, entran por hueco.
 *
 * NO ES EL BRASILEÑO CON PALABRAS CAMBIADAS. Se tutea con «tu» —«tens de
 * iniciar sessão», «a tua avaliação», «o teu negócio», «Escreve», «Escolhe»— y
 * el pronombre va detrás del verbo: «Conta-nos a tua experiência».
 *
 * Palabras que aquí no son las de Brasil: registar (no cadastrar), procurar (no
 * buscar), ligação (no link, salvo el campo «Link externo», que es el nombre
 * técnico de la ficha), eliminar (no excluir), guardar (no salvar), aceder (no
 * acessar), classificação (no nota), introduzir (no digitar).
 *
 * «Weë Biz» es marca: se escribe igual en todos los idiomas. Y el hueco de
 * `deleteProductConfirm` se llama {{nombre}}, en español, porque así se llama
 * en el código que lo rellena: el nombre del hueco no se traduce nunca.
 */
export const weebiz: typeof import('../es/weebiz').weebiz = {
  noBusinesses: 'Não foram encontrados negócios',
  searchPlaceholder: 'Procurar negócios...',
  categories: 'Categorias',
  moreCategories: 'Ver mais categorias',
  featured: 'Destaques',
  newBusinesses: 'Novos negócios',
  registerMine: 'Registar o meu negócio',
  noneYet: 'Ainda sem negócios',
  notFound: 'Negócio não encontrado',
  followers: 'Seguidores',
  reviews: 'Avaliações',
  verified: 'Negócio verificado',
  about: 'Sobre',
  products: 'Produtos',
  addProduct: 'Adicionar produto',
  writeReview: 'Escrever avaliação',
  noReviewsYet: 'Ainda sem avaliações',
  leaveReview: 'Deixar uma avaliação',
  yourReview: 'A tua avaliação',
  rating: 'Classificação',
  yourOpinion: 'A tua opinião',
  reviewPlaceholder: 'Conta-nos a tua experiência...',
  sendReview: 'Enviar avaliação',
  chatFailed: 'Não foi possível abrir o chat.',
  linkFailed: 'Não foi possível abrir a ligação.',
  requiredTitle: 'Campo obrigatório',
  opinionRequired: 'Escreve a tua opinião.',
  reviewFailed: 'Não foi possível enviar a avaliação.',
  deleteReviewTitle: 'Eliminar avaliação',
  deleteReviewConfirm: 'Tens a certeza de que queres eliminar a tua avaliação?',
  notAvailable: 'Não disponível',
  noProductsYet: 'Ainda sem produtos',
  addFirstProduct: 'Adiciona o teu primeiro produto ou serviço.',
  addPhoto: 'Adicionar foto',
  nameRequired: 'Nome *',
  namePlaceholder: 'Ex.: Hambúrguer clássico',
  price: 'Preço',
  currency: 'Moeda',
  description: 'Descrição',
  descriptionPlaceholder: 'Descreve o produto ou serviço...',
  permissionTitle: 'Permissão necessária',
  galleryPermission: 'Weë precisa de aceder à tua galeria.',
  productNameRequired: 'Introduz o nome do produto.',
  productSaveFailed: 'Não foi possível guardar o produto.',
  deleteProductTitle: 'Eliminar produto',
  deleteProductConfirm: 'Eliminar "{{nombre}}"?',
  logo: 'Logo',
  addLogo: 'Adicionar logo',
  businessNameRequired: 'Nome do negócio *',
  businessNamePlaceholder: 'Ex.: Café Central',
  categoryRequired: 'Categoria *',
  speciality: 'Especialidade',
  businessDescriptionPlaceholder: 'Fala às pessoas sobre o teu negócio...',
  location: 'Localização',
  locationPlaceholder: 'Ex.: Lima, Peru',
  externalLink: 'Link externo',
  externalLinkPlaceholder: 'Ex.: www.meunegocio.com',
  signInFirst: 'Tens de iniciar sessão.',
  businessNameMissing: 'Introduz o nome do teu negócio.',
  categoryMissing: 'Escolhe uma categoria.',
  updated: 'O teu negócio foi atualizado.',
  createdTitle: 'Negócio criado',
  created: 'O teu negócio já está no Weë Biz. Agora podes mudar para o teu perfil de negócio a partir do menu.',
  viewProfile: 'Ver perfil',
  saveFailed: 'Não foi possível guardar o negócio.',
};
