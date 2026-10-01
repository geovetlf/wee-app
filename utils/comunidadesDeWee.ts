import type { Traductor } from '../i18n/traducir';
import { COMMUNITY_CATEGORIES, POPULAR_COMMUNITIES } from '../constants/communityCategories';

/**
 * LAS COMUNIDADES QUE CREÓ WEË, EN EL IDIOMA DE QUIEN MIRA.
 *
 * Las comunidades oficiales se siembran en la base de datos desde las temáticas de `constants/communityCategories.ts`
 * (`OFFICIAL_COMMUNITIES` en `constants/comunidadesOficiales.ts`), con su nombre, su descripción y sus reglas en español; y
 * las comunidades destacadas de muestra (`POPULAR_COMMUNITIES`) llevan su descripción en español. Una persona danesa
 * leía «Cine & Animación» y «Compartí lo que creaste…».
 *
 * No se migra nada: se reconoce al pintar. Si lo guardado sigue siendo la SEMILLA —el texto con el que Weë la creó—,
 * se pinta con su clave en el idioma de quien mira; si alguien de administración lo cambió, es contenido y se enseña
 * tal cual. En español se enseña lo guardado, que es lo que se escribió.
 *
 * Los nombres de las comunidades destacadas («Weë Filmmakers») son marca y no se tocan. Lo que escribe una persona
 * —el nombre y la descripción de una comunidad suya— tampoco.
 */

/* Las temáticas oficiales: su nombre y su descripción (la del Home, que ya está en los dieciséis diccionarios). */
const OFICIALES: Readonly<Record<string, { nombre: string; descripcion: string }>> = {
  'cine-animacion': { nombre: 'communities.officialNameFilmAnimation', descripcion: 'home.communityDescFilmAnimation' },
  'arte-creatividad': { nombre: 'communities.officialNameArtCreativity', descripcion: 'home.communityDescArtCreativity' },
  'creadores-influencers': { nombre: 'communities.officialNameCreatorsInfluencers', descripcion: 'home.communityDescCreatorsInfluencers' },
  'negocios-emprendimiento': { nombre: 'communities.officialNameBusinessEntrepreneurship', descripcion: 'home.communityDescBusinessEntrepreneurship' },
  'tecnologia-ia': { nombre: 'communities.officialNameTechAi', descripcion: 'home.communityDescTechAi' },
  'gaming-mundos-virtuales': { nombre: 'communities.officialNameGamingVirtualWorlds', descripcion: 'home.communityDescGamingVirtualWorlds' },
  'educacion-aprendizaje': { nombre: 'communities.officialNameEducationLearning', descripcion: 'home.communityDescEducationLearning' },
  'futuro-sociedad': { nombre: 'communities.officialNameFutureSociety', descripcion: 'home.communityDescFutureSociety' },
};

/* Las destacadas de muestra: solo la descripción (el nombre es marca). */
const DESTACADAS: Readonly<Record<string, string>> = {
  'wee-filmmakers': 'communities.popularDescFilmmakers',
  'wee-influencers': 'communities.popularDescInfluencers',
  'wee-designers': 'communities.popularDescDesigners',
  'wee-writers': 'communities.popularDescWriters',
  'wee-musicians': 'communities.popularDescMusicians',
  'wee-developers': 'communities.popularDescDevelopers',
  'wee-entrepreneurs': 'communities.popularDescEntrepreneurs',
  'wee-gamers': 'communities.popularDescGamers',
};

/*
 * Las reglas con las que se sembraron las oficiales, tal como se guardaron: las primeras, en voseo («Compartí…»), que
 * no es el registro de Weë; las de ahora, de tú. Las dos se pintan con su clave, en español también.
 */
const REGLAS: Readonly<Record<string, string>> = {
  'Compartí lo que creaste con IA y contá cómo lo hiciste': 'communities.officialRuleShare',
  'Preguntá y respondé con respeto': 'communities.officialRuleRespect',
  'Nada de spam ni contenido que no sea tuyo': 'communities.officialRuleNoSpam',
  'Comparte lo que creaste con IA y cuenta cómo lo hiciste': 'communities.officialRuleShare',
  'Pregunta y responde con respeto': 'communities.officialRuleRespect',
  'Nada de spam ni de contenido que no sea tuyo': 'communities.officialRuleNoSpam',
};

const SEMILLAS = new Map<string, { name: string; description: string }>([
  ...COMMUNITY_CATEGORIES.map((c) => [c.slug, { name: c.name, description: c.description }] as const),
  ...POPULAR_COMMUNITIES.map((c) => [c.slug, { name: c.name, description: c.description }] as const),
]);
const NOMBRES_SEMBRADOS = new Map(COMMUNITY_CATEGORIES.map((c) => [c.name, c.slug] as const));

const enEspanol = (locale: string): boolean => /^es(-|$)/i.test(locale);

interface ComunidadPintable {
  slug?: string;
  name?: string;
  description?: string;
}

/** El nombre de una comunidad para pintar. */
export const nombreDeComunidad = (c: ComunidadPintable | null | undefined, t: Traductor, locale: string): string => {
  const nombre = c?.name || '';
  if (!c?.slug || enEspanol(locale)) return nombre;
  const clave = OFICIALES[c.slug]?.nombre;
  return clave && SEMILLAS.get(c.slug)?.name === nombre ? t(clave) : nombre;
};

/** La descripción de una comunidad para pintar. */
export const descripcionDeComunidad = (c: ComunidadPintable | null | undefined, t: Traductor, locale: string): string => {
  const descripcion = c?.description || '';
  if (!c?.slug || enEspanol(locale)) return descripcion;
  const clave = OFICIALES[c.slug]?.descripcion || DESTACADAS[c.slug];
  return clave && SEMILLAS.get(c.slug)?.description === descripcion ? t(clave) : descripcion;
};

/** Una regla de una comunidad: las de la siembra, con su clave; las que escribió alguien, tal cual. */
export const textoDeRegla = (texto: string, t: Traductor): string => (REGLAS[texto] ? t(REGLAS[texto]) : texto);

/** Un nombre de comunidad guardado suelto —en una notificación—, sin el resto de la comunidad. */
export const nombreGuardadoDeComunidad = (nombre: string | undefined, t: Traductor, locale: string): string | undefined => {
  if (!nombre || enEspanol(locale)) return nombre;
  const slug = NOMBRES_SEMBRADOS.get(nombre);
  return slug && OFICIALES[slug] ? t(OFICIALES[slug].nombre) : nombre;
};
