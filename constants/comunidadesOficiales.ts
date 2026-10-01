import type { Community } from '../services/communityService';
import { COMMUNITY_CATEGORIES } from './communityCategories';

/**
 * LAS COMUNIDADES OFICIALES DE WEË, COMO DATOS.
 *
 * Una por cada temática de `communityCategories.ts`, con las tres reglas de Weë (de tú; la app las pinta en el idioma
 * de quien mira con `utils/comunidadesDeWee.ts`, que las reconoce palabra por palabra).
 *
 * Aquí no se escribe nada en ningún sitio. Crear una comunidad OFICIAL es una operación de administración y la hace
 * `scripts/sembrar-comunidades.mjs` con el SDK de administración; las reglas de Firestore no dejan que ninguna app la
 * cree (`isOfficial: true` solo con el claim `admin`). Antes la app intentaba sembrarlas cada vez que encontraba la
 * colección vacía, y las reglas —con razón— se lo negaban.
 */
export const REGLAS_OFICIALES = [
  'Comparte lo que creaste con IA y cuenta cómo lo hiciste',
  'Pregunta y responde con respeto',
  'Nada de spam ni de contenido que no sea tuyo',
] as const;

export const OFFICIAL_COMMUNITIES: Omit<Community, 'id' | 'createdAt' | 'updatedAt'>[] = COMMUNITY_CATEGORIES.map((c) => ({
  name: c.name,
  slug: c.slug,
  description: c.description,
  icon: c.icon,
  rules: REGLAS_OFICIALES.map((text, i) => ({ id: String(i + 1), text, order: i + 1 })),
  memberCount: 0,
  postCount: 0,
  isOfficial: true,
  moderators: [],
  status: 'active' as const,
}));
