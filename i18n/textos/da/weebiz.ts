/*
 * DANÉS — Weë Biz: el directorio, el perfil de un negocio, sus productos y su alta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre de un negocio, su especialidad, su descripción, sus productos y sus
 * reseñas los escribió una persona: no pasan por aquí, entran por hueco.
 *
 * «Negocio» es virksomhed y el directorio, virksomhedskatalog (glosario § 9.6).
 * «Reseña» es anmeldelse, como en Google Maps y Trustpilot, y la nota con
 * estrellas, bedømmelse. Es la misma palabra que la denuncia de moderation
 * (anmeldelse): el glosario fija las dos y el contexto las separa. «Verificado»
 * es Bekræftet, como el «bekræftet badge» de Instagram (glosario § 9.3). «Weë
 * Biz» no se declina: «på Weë Biz», «Virksomhedskataloget på Weë».
 *
 * Las categorías van en una rejilla de cuatro por fila y en UNA línea: por eso
 * son de una palabra. «Hogar» es Bolig (alquiler, decoración, venta de
 * vivienda), «Servicios Técnicos» es Håndværkere (electricistas, fontaneros),
 * «Servicios» es Ydelser, «Automotriz» es Biler y «Empresas» es Firmaer, para no
 * repetir virksomhed, que ya es cualquier negocio del directorio.
 *
 * Las pistas de especialidad solo se leen dentro de «Fx {{ejemplos}}», así que
 * empiezan en minúscula («Fx rådgivning, coaching…»). «Ej:» es «Fx» (guía § 5) y
 * los ejemplos son daneses (Bageriet på hjørnet, Nørrebro i København,
 * www.eksempel.dk). «Precio a consultar» es «Pris efter aftale». Los fallos
 * llevan el paso siguiente (guía § 8) aunque el español no lo escriba.
 *
 * `created` dice que el negocio ya está en Weë Business y que se abre su perfil
 * para completarlo: el «cambia a tu perfil de negocio desde el menú» de antes se
 * fue con el Perfil Biz (2026-09-19).
 */
export const weebiz: typeof import('../es/weebiz').weebiz = {
  noBusinesses: 'Ingen virksomheder fundet',
  searchPlaceholder: 'Søg efter virksomheder…',
  categories: 'Kategorier',
  moreCategories: 'Se flere kategorier',
  featured: 'Fremhævede',
  newBusinesses: 'Nye virksomheder',
  registerMine: 'Registrer din virksomhed',
  noneYet: 'Ingen virksomheder endnu',
  notFound: 'Virksomheden blev ikke fundet',
  followers: 'Følgere',
  reviews: 'Anmeldelser',
  verified: 'Bekræftet virksomhed',
  about: 'Om virksomheden',
  products: 'Produkter',
  addProduct: 'Tilføj produkt',
  writeReview: 'Skriv en anmeldelse',
  noReviewsYet: 'Ingen anmeldelser endnu',
  leaveReview: 'Giv en anmeldelse',
  yourReview: 'Din anmeldelse',
  rating: 'Bedømmelse',
  yourOpinion: 'Hvad synes du?',
  reviewPlaceholder: 'Fortæl om din oplevelse…',
  sendReview: 'Send anmeldelse',
  chatFailed: 'Chatten kunne ikke åbnes. Prøv igen.',
  linkFailed: 'Linket kunne ikke åbnes. Prøv igen.',
  requiredTitle: 'Påkrævet felt',
  opinionRequired: 'Skriv, hvad du synes.',
  reviewFailed: 'Anmeldelsen kunne ikke sendes. Prøv igen.',
  deleteReviewTitle: 'Slet anmeldelse',
  deleteReviewConfirm: 'Vil du slette din anmeldelse? Det kan ikke fortrydes.',
  notAvailable: 'Ikke tilgængelig',
  noProductsYet: 'Ingen produkter endnu',
  addFirstProduct: 'Tilføj dit første produkt eller din første ydelse.',
  addPhoto: 'Tilføj foto',
  nameRequired: 'Navn *',
  namePlaceholder: 'Fx klassisk burger',
  price: 'Pris',
  currency: 'Valuta',
  description: 'Beskrivelse',
  descriptionPlaceholder: 'Beskriv produktet eller ydelsen…',
  permissionTitle: 'Tilladelse påkrævet',
  galleryPermission: 'Vi skal have adgang til dit galleri.',
  productNameRequired: 'Skriv produktets navn.',
  productSaveFailed: 'Produktet kunne ikke gemmes. Prøv igen.',
  deleteProductTitle: 'Slet produkt',
  deleteProductConfirm: 'Vil du slette ”{{nombre}}”?',
  logo: 'Logo',
  addLogo: 'Tilføj logo',
  businessNameRequired: 'Virksomhedsnavn *',
  businessNamePlaceholder: 'Fx Bageriet på hjørnet',
  categoryRequired: 'Kategori *',
  speciality: 'Speciale',
  businessDescriptionPlaceholder: 'Fortæl andre om din virksomhed…',
  location: 'Placering',
  locationPlaceholder: 'Fx Nørrebro i København',
  externalLink: 'Eksternt link',
  externalLinkPlaceholder: 'Fx www.eksempel.dk',
  signInFirst: 'Du skal logge ind først.',
  businessNameMissing: 'Skriv navnet på din virksomhed.',
  categoryMissing: 'Vælg en kategori.',
  updated: 'Din virksomhed er opdateret.',
  createdTitle: 'Virksomheden er oprettet',
  created: 'Din virksomhed er nu på Weë Business. Åbn profilen for at gennemgå og udfylde den.',
  viewProfile: 'Se profil',
  saveFailed: 'Virksomheden kunne ikke gemmes. Prøv igen.',
  catProfessionalServices: 'Ydelser',
  catStores: 'Butikker',
  catFood: 'Mad',
  catBeauty: 'Skønhed',
  catHealth: 'Sundhed',
  catCreators: 'Skabere',
  catHome: 'Bolig',
  catTech: 'Teknologi',
  catTechnicalServices: 'Håndværkere',
  catCreatives: 'Kreative',
  catCompanies: 'Firmaer',
  catAutomotive: 'Biler',
  catEducation: 'Uddannelse',
  catTravel: 'Rejser',
  catPets: 'Kæledyr',
  catEvents: 'Arrangementer',
  catFinance: 'Økonomi',
  catLegal: 'Jura',
  catSpirituality: 'Spiritualitet',
  catOther: 'Andet',
  firstInCategory: 'Bliv den første til at registrere din virksomhed i kategorien {{categoria}}.',
  editBusinessTitle: 'Rediger virksomhed',
  registerBusinessTitle: 'Registrer virksomhed',
  saveChanges: 'Gem ændringer',
  createBusiness: 'Opret virksomhed',
  specialityPlaceholder: 'Fx {{ejemplos}}',
  specialityNeedsCategory: 'Vælg en kategori først',
  specialityHintProfessionalServices: 'rådgivning, coaching…',
  specialityHintStores: 'tøj, elektronik, tilbehør…',
  specialityHintFood: 'sushi, burgere, desserter…',
  specialityHintBeauty: 'barber, spa, makeup…',
  specialityHintHealth: 'ernæring, psykologi, fitness…',
  specialityHintCreators: 'streamer, blogger, underviser…',
  specialityHintHome: 'udlejning, indretning, salg…',
  specialityHintTech: 'webudvikling, marketing, AI…',
  specialityHintTechnicalServices: 'elektriker, VVS-installatør…',
  specialityHintCreatives: 'fotografi, design, video…',
  specialityHintCompanies: 'startup, bureau, brand…',
  specialityHintAutomotive: 'værksted, reservedele, bilvask…',
  specialityHintEducation: 'kurser, akademi, lærer…',
  specialityHintTravel: 'ture, hotel, guide…',
  specialityHintPets: 'dyrlæge, dyrepasning, adoption…',
  specialityHintEvents: 'DJ, shows, underholdning…',
  specialityHintFinance: 'investering, forsikring, krypto…',
  specialityHintLegal: 'juridisk rådgivning, advokatfirma…',
  specialityHintSpirituality: 'tarot, meditation, coaching…',
  specialityHintOther: 'beskriv din virksomhed…',
  specialityHintDefault: 'beskriv dit speciale…',
  editProductTitle: 'Rediger produkt',
  newProductTitle: 'Nyt produkt',
  priceOnRequest: 'Pris efter aftale',
  follow: 'Følg',
  following: 'Følger',
  manageProducts: 'Administrer',
  seeAllProducts: 'Se alle',
  reviewsCount: 'Anmeldelser ({{cantidad}})',
  directoryEmpty: 'Virksomhedskataloget på Weë.\nSnart kan du finde virksomheder her.',
};
