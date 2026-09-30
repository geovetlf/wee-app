// Chat themes with complete styling for conversation screen
export interface ChatTheme {
  id: string;
  /**
   * La CLAVE del nombre, no el nombre: este catálogo se evalúa fuera de React,
   * donde no hay traductor. Lo resuelve quien lo pinta, con `t(tema.clave)`.
   */
  clave: string;
  // Background
  backgroundColor: string;
  backgroundImage?: string; // URL or require() path
  // Header
  headerBackground: string;
  headerText: string;
  headerIcon: string;
  // Bubbles
  myBubble: string;
  myBubbleText: string;
  otherBubble: string;
  otherBubbleText: string;
  // Input bar
  inputBarBackground: string;
  inputBackground: string;
  inputText: string;
  inputPlaceholder: string;
  // Accent (send button, camera button)
  accent: string;
  accentText: string;
  // Meta text (time, checkmarks)
  metaText: string;
  otherMetaText: string;
  // Date pills
  datePillBackground: string;
  datePillText: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'classic',
    clave: 'weetalk.themeClassic',
    backgroundColor: '#0A0A0A',
    headerBackground: '#1A1A1A',
    headerText: '#FFFFFF',
    headerIcon: '#9CA3AF',
    myBubble: '#F5B731',
    myBubbleText: '#000000',
    otherBubble: '#2A2A2A',
    otherBubbleText: '#FFFFFF',
    inputBarBackground: '#0A0A0A',
    inputBackground: '#1A1A1A',
    inputText: '#FFFFFF',
    inputPlaceholder: '#6B7280',
    accent: '#F5B731',
    accentText: '#000000',
    metaText: 'rgba(0,0,0,0.5)',
    otherMetaText: 'rgba(255,255,255,0.5)',
    datePillBackground: '#1A1A1A',
    datePillText: '#9CA3AF',
  },
  {
    id: 'midnight',
    clave: 'weetalk.themeMidnight',
    backgroundColor: '#0F172A',
    headerBackground: '#1E293B',
    headerText: '#F1F5F9',
    headerIcon: '#64748B',
    myBubble: '#3B82F6',
    myBubbleText: '#FFFFFF',
    otherBubble: '#334155',
    otherBubbleText: '#F1F5F9',
    inputBarBackground: '#0F172A',
    inputBackground: '#1E293B',
    inputText: '#F1F5F9',
    inputPlaceholder: '#64748B',
    accent: '#3B82F6',
    accentText: '#FFFFFF',
    metaText: 'rgba(255,255,255,0.5)',
    otherMetaText: 'rgba(255,255,255,0.5)',
    datePillBackground: '#1E293B',
    datePillText: '#94A3B8',
  },
  {
    id: 'forest',
    clave: 'weetalk.themeForest',
    backgroundColor: '#14201A',
    headerBackground: '#1C2B23',
    headerText: '#E8F5E9',
    headerIcon: '#66BB6A',
    myBubble: '#4CAF50',
    myBubbleText: '#FFFFFF',
    otherBubble: '#263D2E',
    otherBubbleText: '#E8F5E9',
    inputBarBackground: '#14201A',
    inputBackground: '#1C2B23',
    inputText: '#E8F5E9',
    inputPlaceholder: '#5A7D62',
    accent: '#4CAF50',
    accentText: '#FFFFFF',
    metaText: 'rgba(255,255,255,0.5)',
    otherMetaText: 'rgba(255,255,255,0.5)',
    datePillBackground: '#1C2B23',
    datePillText: '#81C784',
  },
  {
    id: 'sunset',
    clave: 'weetalk.themeSunset',
    backgroundColor: '#1A1215',
    headerBackground: '#2D1F24',
    headerText: '#FFF1F2',
    headerIcon: '#FDA4AF',
    myBubble: '#F43F5E',
    myBubbleText: '#FFFFFF',
    otherBubble: '#3D2832',
    otherBubbleText: '#FFF1F2',
    inputBarBackground: '#1A1215',
    inputBackground: '#2D1F24',
    inputText: '#FFF1F2',
    inputPlaceholder: '#8B6B72',
    accent: '#F43F5E',
    accentText: '#FFFFFF',
    metaText: 'rgba(255,255,255,0.5)',
    otherMetaText: 'rgba(255,255,255,0.5)',
    datePillBackground: '#2D1F24',
    datePillText: '#FDA4AF',
  },
  {
    id: 'ocean',
    clave: 'weetalk.themeOcean',
    backgroundColor: '#0C1929',
    headerBackground: '#152238',
    headerText: '#E0F2FE',
    headerIcon: '#38BDF8',
    myBubble: '#0EA5E9',
    myBubbleText: '#FFFFFF',
    otherBubble: '#1E3A5F',
    otherBubbleText: '#E0F2FE',
    inputBarBackground: '#0C1929',
    inputBackground: '#152238',
    inputText: '#E0F2FE',
    inputPlaceholder: '#4B7399',
    accent: '#0EA5E9',
    accentText: '#FFFFFF',
    metaText: 'rgba(255,255,255,0.5)',
    otherMetaText: 'rgba(255,255,255,0.5)',
    datePillBackground: '#152238',
    datePillText: '#7DD3FC',
  },
  {
    id: 'purple',
    clave: 'weetalk.themePurple',
    backgroundColor: '#1A1625',
    headerBackground: '#2D2640',
    headerText: '#F3E8FF',
    headerIcon: '#A78BFA',
    myBubble: '#8B5CF6',
    myBubbleText: '#FFFFFF',
    otherBubble: '#3D3356',
    otherBubbleText: '#F3E8FF',
    inputBarBackground: '#1A1625',
    inputBackground: '#2D2640',
    inputText: '#F3E8FF',
    inputPlaceholder: '#7C6999',
    accent: '#8B5CF6',
    accentText: '#FFFFFF',
    metaText: 'rgba(255,255,255,0.5)',
    otherMetaText: 'rgba(255,255,255,0.5)',
    datePillBackground: '#2D2640',
    datePillText: '#C4B5FD',
  },
];

// Wallpaper options (patterns/textures) - using reliable image sources
export const CHAT_WALLPAPERS = [
  { id: 'none', name: 'Sin fondo', url: null, preview: null },
  { id: 'gradient1', name: 'Aurora', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80', preview: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&q=60' },
  { id: 'gradient2', name: 'Nebulosa', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80', preview: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=200&q=60' },
  { id: 'dark1', name: 'Montañas', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80', preview: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=60' },
  { id: 'dark2', name: 'Estrellas', url: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=800&q=80', preview: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=200&q=60' },
  { id: 'abstract1', name: 'Ondas', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80', preview: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200&q=60' },
  { id: 'abstract2', name: 'Fluido', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80', preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=60' },
  { id: 'nature1', name: 'Bosque', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80', preview: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&q=60' },
  { id: 'nature2', name: 'Océano', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80', preview: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&q=60' },
];

export const getThemeById = (id: string): ChatTheme => {
  return CHAT_THEMES.find(t => t.id === id) || CHAT_THEMES[0];
};
