// Categorías WeeBiz — subcategorías las crea el usuario libremente
export interface WeeBizCategory {
  id: string;
  /**
   * La CLAVE del nombre, no el nombre: este catálogo se evalúa fuera de React,
   * donde no hay traductor. Lo resuelve quien lo pinta, con `t(cat.clave)`.
   * Lo que se guarda en un negocio es el `id`, nunca el nombre.
   */
  clave: string;
  icon: string; // Ionicons name
  color: string;
}

// Las primeras 8 son las principales (visibles al inicio)
export const WEEBIZ_CATEGORIES: WeeBizCategory[] = [
  // === PRINCIPALES ===
  { id: 'servicios-profesionales', clave: 'weebiz.catProfessionalServices', icon: 'briefcase-outline', color: '#3B82F6' },
  { id: 'tiendas', clave: 'weebiz.catStores', icon: 'bag-outline', color: '#F59E0B' },
  { id: 'comida-restaurantes', clave: 'weebiz.catFood', icon: 'restaurant-outline', color: '#EF4444' },
  { id: 'belleza-estetica', clave: 'weebiz.catBeauty', icon: 'sparkles-outline', color: '#EC4899' },
  { id: 'salud-bienestar', clave: 'weebiz.catHealth', icon: 'heart-outline', color: '#10B981' },
  { id: 'creadores-influencers', clave: 'weebiz.catCreators', icon: 'videocam-outline', color: '#8B5CF6' },
  { id: 'hogar-inmobiliaria', clave: 'weebiz.catHome', icon: 'home-outline', color: '#F97316' },
  { id: 'tecnologia-digital', clave: 'weebiz.catTech', icon: 'code-slash-outline', color: '#06B6D4' },
  // === EXPANDIDAS ("Ver más") ===
  { id: 'servicios-tecnicos', clave: 'weebiz.catTechnicalServices', icon: 'hammer-outline', color: '#78716C' },
  { id: 'creativos-freelancers', clave: 'weebiz.catCreatives', icon: 'color-palette-outline', color: '#D946EF' },
  { id: 'empresas-corporativo', clave: 'weebiz.catCompanies', icon: 'business-outline', color: '#475569' },
  { id: 'automotriz', clave: 'weebiz.catAutomotive', icon: 'car-outline', color: '#64748B' },
  { id: 'educacion', clave: 'weebiz.catEducation', icon: 'school-outline', color: '#0EA5E9' },
  { id: 'viajes-turismo', clave: 'weebiz.catTravel', icon: 'airplane-outline', color: '#14B8A6' },
  { id: 'mascotas', clave: 'weebiz.catPets', icon: 'paw-outline', color: '#A16207' },
  { id: 'eventos-entretenimiento', clave: 'weebiz.catEvents', icon: 'musical-notes-outline', color: '#E11D48' },
  { id: 'finanzas', clave: 'weebiz.catFinance', icon: 'cash-outline', color: '#059669' },
  { id: 'legal', clave: 'weebiz.catLegal', icon: 'shield-checkmark-outline', color: '#1E40AF' },
  { id: 'espiritualidad', clave: 'weebiz.catSpirituality', icon: 'leaf-outline', color: '#7C3AED' },
  { id: 'otros', clave: 'weebiz.catOther', icon: 'ellipsis-horizontal-outline', color: '#9CA3AF' },
];

export const WEEBIZ_MAIN_CATEGORIES = WEEBIZ_CATEGORIES.slice(0, 8);
export const WEEBIZ_EXTRA_CATEGORIES = WEEBIZ_CATEGORIES.slice(8);

export const getCategoryById = (id: string): WeeBizCategory | undefined =>
  WEEBIZ_CATEGORIES.find(c => c.id === id);
