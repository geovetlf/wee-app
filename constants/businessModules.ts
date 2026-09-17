/*
 * LOS OCHO MÓDULOS DE WEË BUSINESS.
 *
 * Aquí viven el orden, los iconos y las CLAVES de texto. No las frases: este
 * archivo se importa fuera de React, donde no hay traductor, así que traducir al
 * construirlo congelaría el idioma del arranque. Quien pinta resuelve, con
 * `t(clave)` — el mismo patrón de `constants/studioTools.ts` y `chefTools.ts`.
 *
 * ── Los NOMBRES no se traducen ───────────────────────────────────────────────
 *
 * "My Business", "Products & Catalog", "Create", "Social", "Analyze", "Grow",
 * "Business Profile" y "Promote" son nombres de producto y se escriben igual en
 * los dos idiomas, como Weë Studio o Weë Writer (decisión del usuario,
 * 2026-09-16). Lo que sí se traduce es lo que hace cada uno, y eso sí es una
 * clave.
 *
 * Los iconos son de Ionicons en su variante `-outline`, como el resto del
 * taller, y se pintan con el color del texto: un solo trazo, una sola familia.
 */

/** Los ocho módulos. El id es también el panel que abren. */
export type ModuloDeBusiness =
  | 'myBusiness'
  | 'products'
  | 'create'
  | 'social'
  | 'analyze'
  | 'grow'
  | 'profile'
  | 'promote';

export interface Modulo {
  id: ModuloDeBusiness;
  /** Nombre de producto: no pasa por el traductor. */
  nombre: string;
  claveHint: string;
  icono: string;
}

export const MODULOS_DE_BUSINESS: Modulo[] = [
  { id: 'myBusiness', nombre: 'My Business', claveHint: 'business.modMyBusinessHint', icono: 'storefront-outline' },
  { id: 'products', nombre: 'Products & Catalog', claveHint: 'business.modProductsHint', icono: 'pricetags-outline' },
  { id: 'create', nombre: 'Create', claveHint: 'business.modCreateHint', icono: 'color-wand-outline' },
  { id: 'social', nombre: 'Social', claveHint: 'business.modSocialHint', icono: 'share-social-outline' },
  { id: 'analyze', nombre: 'Analyze', claveHint: 'business.modAnalyzeHint', icono: 'bar-chart-outline' },
  { id: 'grow', nombre: 'Grow', claveHint: 'business.modGrowHint', icono: 'trending-up-outline' },
  { id: 'profile', nombre: 'Business Profile', claveHint: 'business.modProfileHint', icono: 'business-outline' },
  { id: 'promote', nombre: 'Promote', claveHint: 'business.modPromoteHint', icono: 'megaphone-outline' },
];

/**
 * UNA ACCIÓN DENTRO DE UN MÓDULO.
 *
 * Casi todas abren la conversación guiada de siempre —`CreatorFlow` con
 * `experienceId: 'business'`— con su objetivo y su opción. El `optionId` viaja
 * al servidor y está dentro de los trabajos ya guardados de la gente: no se
 * traduce ni se renombra.
 */
export interface AccionDeBusiness {
  id: string;
  claveTitulo: string;
  claveHint?: string;
  icono: string;
  /** Lo que se le pide a Weë. */
  claveObjetivo: string;
  optionId: string;
  /**
   * SE ENTRA HABLANDO, NO DE UN TOQUE.
   *
   * Hay funciones que no se pueden resolver con una frase hecha: el Business
   * Coach no sabe qué semana tienes, y el plan de negocio depende de qué vendes.
   * Esas abren la MISMA caja de Weë AI dentro del módulo, con su pregunta
   * puesta, para que la persona cuente lo suyo antes de que Weë conteste. Las
   * demás —"editar el negocio", "mejorar la foto"— ya dicen todo lo que hay que
   * decir y van directas a la conversación guiada.
   */
  conversacional?: boolean;
}

const a = (
  id: string,
  claveTitulo: string,
  icono: string,
  claveObjetivo: string,
  optionId: string,
  claveHint?: string,
  conversacional?: boolean,
): AccionDeBusiness => ({ id, claveTitulo, icono, claveObjetivo, optionId, claveHint, conversacional });

/**
 * Lo que hay dentro de cada módulo.
 *
 * Los `optionId` son los que Weë Business ya tenía en su plantilla del servidor
 * (`functions/src/creator/templates.ts`): idea, content, plan, cv, marketing,
 * analyze, schedule, publish, reply. No se inventa ninguno.
 */
export const ACCIONES_POR_MODULO: Record<ModuloDeBusiness, AccionDeBusiness[]> = {
  myBusiness: [
    a('create', 'business.createBusiness', 'add-circle-outline', 'business.createBusinessGoal', 'idea'),
    a('edit', 'business.editBusiness', 'create-outline', 'business.editBusinessGoal', 'idea'),
    a('info', 'business.businessInfo', 'information-circle-outline', 'business.businessInfoGoal', 'idea'),
    a('plan', 'business.businessPlan', 'document-text-outline', 'business.businessPlanGoal', 'plan', undefined, true),
    a('coach', 'business.businessCoach', 'chatbubbles-outline', 'business.businessCoachGoal', 'idea', undefined, true),
  ],
  products: [
    a('add', 'business.addProduct', 'add-circle-outline', 'business.addProductGoal', 'content'),
    a('image', 'business.improveImage', 'image-outline', 'business.improveImageGoal', 'content'),
  ],
  create: [],
  social: [],
  analyze: [
    a('upload', 'business.analyzeUpload', 'cloud-upload-outline', 'business.analyzeUploadGoal', 'analyze', 'business.analyzeUploadHint'),
    a('insights', 'business.analyzeInsights', 'sparkles-outline', 'business.analyzeInsightsGoal', 'analyze'),
    a('swot', 'business.swot', 'grid-outline', 'business.swotGoal', 'analyze', 'business.swotHint'),
  ],
  grow: [
    a('plan', 'business.helpMeGrow', 'trending-up-outline', 'business.helpMeGrowGoal', 'idea', 'business.helpMeGrowHint', true),
    a('customers', 'business.customerInsights', 'people-outline', 'business.customerInsightsGoal', 'marketing', 'business.customerInsightsHint', true),
    a('ideas', 'business.businessIdeas', 'bulb-outline', 'business.businessIdeasGoal', 'idea', 'business.businessIdeasHint', true),
  ],
  profile: [
    a('reviews', 'business.reviews', 'star-outline', 'business.reviewsGoal', 'analyze', 'business.reviewsHint'),
    a('respond', 'business.reviewsRespond', 'chatbubble-ellipses-outline', 'business.reviewsRespondGoal', 'reply'),
  ],
  promote: [],
};

/** Qué se puede crear en el módulo Create. */
export const TIPOS_DE_CONTENIDO: { id: string; clave: string; claveHint: string; icono: string }[] = [
  { id: 'image', clave: 'business.typeImage', claveHint: 'business.typeImageHint', icono: 'image-outline' },
  { id: 'video', clave: 'business.typeVideo', claveHint: 'business.typeVideoHint', icono: 'videocam-outline' },
  { id: 'post', clave: 'business.typePost', claveHint: 'business.typePostHint', icono: 'newspaper-outline' },
  { id: 'campaign', clave: 'business.typeCampaign', claveHint: 'business.typeCampaignHint', icono: 'albums-outline' },
  { id: 'copy', clave: 'business.typeCopy', claveHint: 'business.typeCopyHint', icono: 'text-outline' },
];

/**
 * DÓNDE VA EL CONTENIDO, EN CRISTIANO.
 *
 * "TikTok", no "9:16". La proporción se guarda porque es lo que Weë necesita
 * para adaptar el formato, pero no se lee en pantalla: quien promociona su
 * pastelería no tiene por qué saber qué es un aspect ratio.
 */
export const FORMATOS: { id: string; clave: string; icono: string; proporcion: string }[] = [
  { id: 'tiktok', clave: 'business.formatTikTok', icono: 'logo-tiktok', proporcion: '9:16' },
  { id: 'reel', clave: 'business.formatReel', icono: 'logo-instagram', proporcion: '9:16' },
  { id: 'story', clave: 'business.formatStory', icono: 'logo-instagram', proporcion: '9:16' },
  { id: 'fbStory', clave: 'business.formatFacebookStory', icono: 'logo-facebook', proporcion: '9:16' },
  { id: 'post', clave: 'business.formatPost', icono: 'logo-instagram', proporcion: '1:1' },
  { id: 'feed', clave: 'business.formatFeed', icono: 'logo-facebook', proporcion: '4:5' },
  { id: 'wide', clave: 'business.formatWide', icono: 'tv-outline', proporcion: '16:9' },
];

/** El Brand Kit: lo que hace que el contenido se vea siempre del mismo negocio. */
export const BRAND_KIT: { id: string; clave: string; icono: string }[] = [
  { id: 'logo', clave: 'business.brandLogo', icono: 'shapes-outline' },
  { id: 'colors', clave: 'business.brandColors', icono: 'color-palette-outline' },
  { id: 'typography', clave: 'business.brandTypography', icono: 'text-outline' },
  { id: 'style', clave: 'business.brandStyle', icono: 'brush-outline' },
  { id: 'avatar', clave: 'business.brandAvatar', icono: 'person-circle-outline' },
  { id: 'cover', clave: 'business.brandCover', icono: 'image-outline' },
  { id: 'templates', clave: 'business.brandTemplates', icono: 'copy-outline' },
];

/** En qué se va el dinero. Las mismas familias que pide la especificación. */
export const FAMILIAS_DE_GASTO: { id: string; clave: string; icono: string }[] = [
  { id: 'supplies', clave: 'business.expenseSupplies', icono: 'cube-outline' },
  { id: 'marketing', clave: 'business.expenseMarketing', icono: 'megaphone-outline' },
  { id: 'delivery', clave: 'business.expenseDelivery', icono: 'bicycle-outline' },
  { id: 'staff', clave: 'business.expenseStaff', icono: 'people-outline' },
  { id: 'services', clave: 'business.expenseServices', icono: 'flash-outline' },
  { id: 'other', clave: 'business.expenseOther', icono: 'ellipsis-horizontal-outline' },
];

/** Las secciones de la página del negocio dentro de Weë. */
export const SECCIONES_DEL_PERFIL: { id: string; clave: string; icono: string }[] = [
  { id: 'about', clave: 'business.profileAbout', icono: 'information-circle-outline' },
  { id: 'products', clave: 'business.profileProducts', icono: 'pricetags-outline' },
  { id: 'posts', clave: 'business.profilePosts', icono: 'newspaper-outline' },
  { id: 'contact', clave: 'business.profileContact', icono: 'call-outline' },
];
