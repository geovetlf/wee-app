/*
 * WeëPages — los tipos de Página y lo que pide cada uno (functions/src/social/pages.ts lo valida igual).
 *
 * Catálogo de CLAVES (CLAUDE.md §8): quien pinta resuelve `t(claveTitulo)`. Los `id` y los nombres de campo viajan al
 * servidor y se guardan tal cual en `pages/{pageId}`, así que no se traducen ni se renombran.
 */
export type TipoDePagina = 'character' | 'company' | 'influencer' | 'institution' | 'brand' | 'organization' | 'other';

export interface CampoDePagina {
  id: string;
  clave: string;
  /** Varias líneas (biografía, misión…). */
  largo?: boolean;
  /** Elegir entre opciones en vez de escribir. */
  opciones?: readonly { id: string; clave: string }[];
}

export interface DefinicionDePagina {
  id: TipoDePagina;
  icono: string;
  claveTitulo: string;
  claveDescripcion: string;
  /** Lo propio del tipo; lo común (nombre, usuario, imágenes, descripción…) lo pinta el composer para todos. */
  campos: readonly CampoDePagina[];
}

const campo = (id: string, largo?: boolean): CampoDePagina => ({ id, clave: `pages.f_${id}`, largo });

export const TIPOS_DE_PAGINA: readonly DefinicionDePagina[] = [
  {
    id: 'character', icono: 'happy-outline', claveTitulo: 'pages.type_character', claveDescripcion: 'pages.desc_character',
    campos: [
      campo('characterType'),
      { id: 'nature', clave: 'pages.f_nature', opciones: [{ id: 'fictional', clave: 'pages.nature_fictional' }, { id: 'real', clave: 'pages.nature_real' }] },
      campo('biography', true),
      campo('origin', true),
    ],
  },
  { id: 'company', icono: 'business-outline', claveTitulo: 'pages.type_company', claveDescripcion: 'pages.desc_company', campos: [campo('industry'), campo('businessDescription', true)] },
  { id: 'influencer', icono: 'megaphone-outline', claveTitulo: 'pages.type_influencer', claveDescripcion: 'pages.desc_influencer', campos: [campo('contentCategory'), campo('topics'), campo('biography', true), campo('socialLinks')] },
  { id: 'institution', icono: 'school-outline', claveTitulo: 'pages.type_institution', claveDescripcion: 'pages.desc_institution', campos: [campo('institutionType'), campo('mission', true)] },
  { id: 'brand', icono: 'pricetag-outline', claveTitulo: 'pages.type_brand', claveDescripcion: 'pages.desc_brand', campos: [campo('industry'), campo('brandDescription', true), campo('visualIdentity')] },
  { id: 'organization', icono: 'people-outline', claveTitulo: 'pages.type_organization', claveDescripcion: 'pages.desc_organization', campos: [campo('organizationType'), campo('mission', true)] },
  { id: 'other', icono: 'ellipsis-horizontal-circle-outline', claveTitulo: 'pages.type_other', claveDescripcion: 'pages.desc_other', campos: [] },
];

export const tipoDePagina = (id?: string | null): DefinicionDePagina =>
  TIPOS_DE_PAGINA.find((t) => t.id === id) ?? TIPOS_DE_PAGINA[TIPOS_DE_PAGINA.length - 1];
