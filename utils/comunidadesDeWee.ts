import type { Traductor } from '../i18n/traducir';
import { idiomaDe } from '../i18n/resolver';
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

/* El idioma del locale, con el ayudante canónico de i18n (revisión post-auditoría 2026-10-01: una sola regla). */
const enEspanol = (locale: string): boolean => idiomaDe(locale) === 'es';

interface ComunidadPintable {
  slug?: string;
  name?: string;
  description?: string;
  isOfficial?: boolean;
  createdBy?: string;
}

/*
 * DE WEË ES LO QUE SEMBRÓ WEË, NO LO QUE SE LE PARECE.
 *
 * El slug y el texto los puede copiar cualquiera: una persona que llamaba a su comunidad «Cine & Animación» se leía en
 * danés como la oficial, con la voz de Weë. Lo que no puede copiar es `isOfficial`: solo lo escribe una sesión de
 * administración (`firestore.rules`) y no cambia nunca. Así que una TEMÁTICA OFICIAL se traduce solo si es oficial.
 *
 * Las DESTACADAS de muestra no son oficiales: la app las pinta desde sus constantes (`CommunitiesManagementScreen`) y
 * no las creó nadie. Toda comunidad que crea una persona lleva su `createdBy` —las reglas lo exigen al crearla y no
 * dejan cambiarlo—, así que una con autor no es una muestra aunque copie su slug y su texto.
 */
const esOficial = (c: ComunidadPintable): boolean => c.isOfficial === true;
const esDeWee = (c: ComunidadPintable): boolean => esOficial(c) || !c.createdBy;

/** El nombre de una comunidad para pintar. */
export const nombreDeComunidad = (c: ComunidadPintable | null | undefined, t: Traductor, locale: string): string => {
  const nombre = c?.name || '';
  if (!c?.slug || enEspanol(locale)) return nombre;
  const clave = esOficial(c) ? OFICIALES[c.slug]?.nombre : undefined;
  return clave && SEMILLAS.get(c.slug)?.name === nombre ? t(clave) : nombre;
};

/** La descripción de una comunidad para pintar. */
export const descripcionDeComunidad = (c: ComunidadPintable | null | undefined, t: Traductor, locale: string): string => {
  const descripcion = c?.description || '';
  if (!c?.slug || enEspanol(locale)) return descripcion;
  const clave = (esOficial(c) ? OFICIALES[c.slug]?.descripcion : undefined) || (esDeWee(c) ? DESTACADAS[c.slug] : undefined);
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
