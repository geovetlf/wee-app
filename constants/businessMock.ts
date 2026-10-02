/**
 * Datos simulados de Weë Business (docs/CREATOR-BUILD.md §9): redes, calendario,
 * mensajes y resultados. Se reemplazan por datos reales cuando las redes
 * habiliten sus APIs oficiales; mientras tanto la experiencia ya se puede recorrer.
 */
import { formatearFecha } from '../i18n/formato';
export interface BusinessNetwork {
  id: string;
  name: string;
  icon: string;
  color: string;
  handle: string;
  connected: boolean;
}

export const BUSINESS_NETWORKS: BusinessNetwork[] = [
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E1306C', handle: '@tunegocio', connected: true },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2', handle: 'Tunegocio', connected: true },
  { id: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#111111', handle: '@tunegocio', connected: true },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', handle: 'Tu negocio', connected: false },
  { id: 'whatsapp', name: 'WhatsApp Business', icon: 'logo-whatsapp', color: '#25D366', handle: 'Tu número', connected: false },
];

export interface CalendarPost {
  emoji: string;
  title: string;
  time: string;
  network: string;
  highlight?: boolean;
}

export interface CalendarDay {
  key: string;
  weekday: string;
  label: string;
  post: CalendarPost;
}

/*
 * Los días y los meses NO se escriben a mano.
 *
 * Aquí había dos listas en español, y con ellas el calendario de Weë Business
 * decía "Mié 16 sep" aunque la persona tuviera la app en inglés. Los nombres de
 * los días los sabe `Intl` para todos los idiomas, y además cada idioma los
 * ordena y los abrevia a su manera: el inglés pone el mes delante.
 */

const WEEK_POSTS: CalendarPost[] = [
  { emoji: '🍔', title: 'Foto del plato', time: '12:00', network: 'instagram' },
  { emoji: '🔥', title: 'Promo 2x1', time: '19:00', network: 'facebook', highlight: true },
  { emoji: '▶️', title: 'Video corto', time: '18:00', network: 'tiktok' },
  { emoji: '👨‍🍳', title: 'Tips del chef', time: '12:00', network: 'instagram', highlight: true },
  { emoji: '🥐', title: 'Nuevo producto', time: '19:00', network: 'facebook' },
  { emoji: '🎥', title: 'Detrás de cámaras', time: '18:00', network: 'tiktok' },
  { emoji: '🎬', title: 'Resumen de la semana', time: '17:00', network: 'instagram', highlight: true },
];

/**
 * Los próximos 7 días a partir de hoy, con una publicación de muestra cada uno.
 *
 * El `locale` entra por parámetro —no se deduce aquí— porque este archivo es
 * una constante y no sabe nada de quién está mirando.
 */
export const getBusinessCalendar = (locale: string, from: Date = new Date()): CalendarDay[] =>
  WEEK_POSTS.map((post, index) => {
    const date = new Date(from);
    date.setDate(from.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      weekday: formatearFecha(date, locale, { weekday: 'short' }),
      label: formatearFecha(date, locale, { day: 'numeric', month: 'short' }),
      post,
    };
  });

export interface CustomerMessage {
  id: string;
  name: string;
  network: string;
  text: string;
  /** La hora tal cual la enseña la tarjeta: "10:24". */
  time: string;
  /**
   * Cuando la hora no es una hora sino una palabra —"Ayer"—, su clave.
   *
   * El resto de `time` son horas del reloj y no son idioma. Esta sí lo era, y
   * era la única palabra de todos estos datos simulados que alguien leía en
   * español teniendo la app en inglés. El día que los mensajes sean reales
   * llegarán con su marca de tiempo y esto lo hará `i18n/formato.ts`.
   */
  claveHora?: string;
  replied: boolean;
  emoji: string;
}

export const BUSINESS_MESSAGES: CustomerMessage[] = [
  { id: 'm1', name: '@maria.lopez', network: 'instagram', text: '¿Cuánto cuesta el combo familiar?', time: '10:24', replied: false, emoji: '👩' },
  { id: 'm2', name: 'Carlos Ramírez', network: 'facebook', text: '¿Hacen delivery a Surco?', time: '09:40', replied: true, emoji: '👨' },
  { id: 'm3', name: '@foodlover.pe', network: 'tiktok', text: 'Se ve delicioso 😍', time: '08:15', replied: false, emoji: '🧑' },
  { id: 'm4', name: '@ana.travels', network: 'instagram', text: '¿Tienen opción vegetariana?', time: 'Ayer', claveHora: 'business.yesterday', replied: true, emoji: '👩‍🦱' },
];

export interface BusinessStat {
  /** Identificador estable de la métrica; no se enseña. */
  id: string;
  /** La cifra. La escribe `Intl` al pintarla: «125.4K» en inglés, «125,4 mil» en español, «125,4 B» en turco. */
  valor: number;
  /** La clave del rótulo: "Publicaciones", "People reached"… */
  clave: string;
  /** La subida frente a la semana anterior, en tanto por uno (0.4 = 40 %): «40 %», «%40»… según el locale. */
  subida: number;
}

export const BUSINESS_STATS: BusinessStat[] = [
  { id: 'posts', valor: 24, clave: 'business.statPosts', subida: 0.4 },
  { id: 'reach', valor: 125400, clave: 'business.statReach', subida: 0.6 },
  { id: 'interactions', valor: 2800, clave: 'business.statInteractions', subida: 0.35 },
  { id: 'messages', valor: 186, clave: 'business.statMessages', subida: 0.7 },
];

/** Atajos de la barra de Weë Business (referencia): objetivo + respuesta preelegida. */
/**
 * Los atajos de la barra de arriba. El identificador y el `optionId` mandan a
 * dónde va cada uno y no cambian; lo que se lee —y la meta con la que arranca
 * la conversación, que acaba siendo el título del trabajo— viene del
 * diccionario.
 */
export const BUSINESS_SHORTCUTS: { id: string; clave: string; icon: string; claveObjetivo: string; optionId: string }[] = [
  { id: 'ideas', clave: 'business.shortcutIdeas', icon: 'bulb-outline', claveObjetivo: 'business.shortcutIdeasGoal', optionId: 'idea' },
  { id: 'marketing', clave: 'business.shortcutMarketing', icon: 'megaphone-outline', claveObjetivo: 'business.shortcutMarketingGoal', optionId: 'marketing' },
  { id: 'social', clave: 'business.shortcutSocial', icon: 'share-social-outline', claveObjetivo: 'business.shortcutSocialGoal', optionId: 'content' },
  { id: 'analyze', clave: 'business.shortcutAnalyze', icon: 'bar-chart-outline', claveObjetivo: 'business.shortcutAnalyzeGoal', optionId: 'analyze' },
  { id: 'documents', clave: 'business.shortcutDocuments', icon: 'document-text-outline', claveObjetivo: 'business.shortcutDocumentsGoal', optionId: 'plan' },
  { id: 'sell', clave: 'business.shortcutSell', icon: 'trending-up-outline', claveObjetivo: 'business.shortcutSellGoal', optionId: 'marketing' },
  { id: 'career', clave: 'business.shortcutCareer', icon: 'person-outline', claveObjetivo: 'business.shortcutCareerGoal', optionId: 'cv' },
];
