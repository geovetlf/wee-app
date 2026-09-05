/**
 * Datos simulados de Weë Business (docs/CREATOR-BUILD.md §9): redes, calendario,
 * mensajes y resultados. Se reemplazan por datos reales cuando las redes
 * habiliten sus APIs oficiales; mientras tanto la experiencia ya se puede recorrer.
 */
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

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const WEEK_POSTS: CalendarPost[] = [
  { emoji: '🍔', title: 'Foto del plato', time: '12:00', network: 'instagram' },
  { emoji: '🔥', title: 'Promo 2x1', time: '19:00', network: 'facebook', highlight: true },
  { emoji: '▶️', title: 'Video corto', time: '18:00', network: 'tiktok' },
  { emoji: '👨‍🍳', title: 'Tips del chef', time: '12:00', network: 'instagram', highlight: true },
  { emoji: '🥐', title: 'Nuevo producto', time: '19:00', network: 'facebook' },
  { emoji: '🎥', title: 'Detrás de cámaras', time: '18:00', network: 'tiktok' },
  { emoji: '🎬', title: 'Resumen de la semana', time: '17:00', network: 'instagram', highlight: true },
];

/** Los próximos 7 días a partir de hoy, con una publicación de muestra cada uno. */
export const getBusinessCalendar = (from: Date = new Date()): CalendarDay[] =>
  WEEK_POSTS.map((post, index) => {
    const date = new Date(from);
    date.setDate(from.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      weekday: WEEKDAYS[date.getDay()],
      label: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
      post,
    };
  });

export interface CustomerMessage {
  id: string;
  name: string;
  network: string;
  text: string;
  time: string;
  replied: boolean;
  emoji: string;
}

export const BUSINESS_MESSAGES: CustomerMessage[] = [
  { id: 'm1', name: '@maria.lopez', network: 'instagram', text: '¿Cuánto cuesta el combo familiar?', time: '10:24', replied: false, emoji: '👩' },
  { id: 'm2', name: 'Carlos Ramírez', network: 'facebook', text: '¿Hacen delivery a Surco?', time: '09:40', replied: true, emoji: '👨' },
  { id: 'm3', name: '@foodlover.pe', network: 'tiktok', text: 'Se ve delicioso 😍', time: '08:15', replied: false, emoji: '🧑' },
  { id: 'm4', name: '@ana.travels', network: 'instagram', text: '¿Tienen opción vegetariana?', time: 'Ayer', replied: true, emoji: '👩‍🦱' },
];

export interface BusinessStat {
  value: string;
  label: string;
  delta: string;
}

export const BUSINESS_STATS: BusinessStat[] = [
  { value: '24', label: 'Publicaciones', delta: '↑ 40%' },
  { value: '125.4K', label: 'Personas alcanzadas', delta: '↑ 60%' },
  { value: '2.8K', label: 'Interacciones', delta: '↑ 35%' },
  { value: '186', label: 'Mensajes recibidos', delta: '↑ 70%' },
];

/** Atajos de la barra de Weë Business (referencia): objetivo + respuesta preelegida. */
export const BUSINESS_SHORTCUTS: { label: string; icon: string; goal: string; optionId: string }[] = [
  { label: 'Ideas', icon: 'bulb-outline', goal: 'Ideas y estrategia para hacer crecer mi negocio', optionId: 'idea' },
  { label: 'Marketing', icon: 'megaphone-outline', goal: 'Una campaña de marketing para mi negocio', optionId: 'marketing' },
  { label: 'Redes sociales', icon: 'share-social-outline', goal: 'Crear contenido para las redes de mi negocio', optionId: 'content' },
  { label: 'Analizar', icon: 'bar-chart-outline', goal: 'Analizar los resultados de mi negocio', optionId: 'analyze' },
  { label: 'Documentos', icon: 'document-text-outline', goal: 'Redactar un documento para mi negocio', optionId: 'plan' },
  { label: 'Vender más', icon: 'trending-up-outline', goal: 'Vender más este mes en mi negocio', optionId: 'marketing' },
  { label: 'Trabajo y carrera', icon: 'person-outline', goal: 'Mejorar mi CV y mi perfil profesional', optionId: 'cv' },
];
