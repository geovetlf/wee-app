import { formatearFecha, formatearNumero, formatearTiempoRelativo } from '../i18n/formato';
export interface User {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  postsCount: number;
  likesCount: number;
  followersCount: number;
  followingCount: number;
}

export interface Media {
  type: 'image' | 'video';
  uri: string;
  thumbnail?: string;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  media?: Media[];
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  hashtags: string[];
  links: string[];
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  createdAt: Date;
  likesCount: number;
  isLiked: boolean;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  createdAt: Date;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
}

// Usuarios mock
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'anon_123',
    avatar: 'https://via.placeholder.com/100/8B5CF6/FFFFFF?text=A1',
    bio: 'Compartiendo momentos anónimos 🎭',
    postsCount: 15,
    likesCount: 234,
    followersCount: 89,
    followingCount: 42,
  },
  {
    id: '2',
    username: 'anon_456',
    avatar: 'https://via.placeholder.com/100/EF4444/FFFFFF?text=A2',
    bio: 'Arte y creatividad sin límites ✨',
    postsCount: 23,
    likesCount: 567,
    followersCount: 156,
    followingCount: 78,
  },
  {
    id: '3',
    username: 'anon_789',
    avatar: 'https://via.placeholder.com/100/10B981/FFFFFF?text=A3',
    bio: 'Explorando el mundo digital 🌐',
    postsCount: 8,
    likesCount: 123,
    followersCount: 34,
    followingCount: 19,
  },
  {
    id: '4',
    username: 'anon_321',
    avatar: 'https://via.placeholder.com/100/F59E0B/FFFFFF?text=A4',
    bio: 'Historias que importan 📖',
    postsCount: 31,
    likesCount: 892,
    followersCount: 278,
    followingCount: 145,
  },
  {
    id: '5',
    username: 'anon_654',
    avatar: 'https://via.placeholder.com/100/EC4899/FFFFFF?text=A5',
    bio: 'Conexiones reales en el anonimato 💫',
    postsCount: 19,
    likesCount: 445,
    followersCount: 167,
    followingCount: 89,
  },
];

// Posts mock
export const mockPosts: Post[] = [
  {
    id: '1',
    userId: '1',
    username: 'anon_123',
    avatar: 'https://via.placeholder.com/100/8B5CF6/FFFFFF?text=A1',
    content: 'Hoy descubrí que a veces las mejores conversaciones suceden en el anonimato. #reflexiones #vida #anonimato',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    likesCount: 24,
    commentsCount: 8,
    sharesCount: 3,
    isLiked: false,
    hashtags: ['#reflexiones', '#vida', '#anonimato'],
    links: [],
  },
  {
    id: '2',
    userId: '2',
    username: 'anon_456',
    avatar: 'https://via.placeholder.com/100/EF4444/FFFFFF?text=A2',
    content: 'Check out this amazing article about digital privacy: https://example.com/privacy #privacidad #tech',
    media: [
      {
        type: 'image',
        uri: 'https://via.placeholder.com/400x300/EF4444/FFFFFF?text=Privacy+Matters',
      },
      {
        type: 'image',
        uri: 'https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Digital+Rights',
      },
    ],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas atrás
    likesCount: 67,
    commentsCount: 15,
    sharesCount: 9,
    isLiked: true,
    hashtags: ['#privacidad', '#tech'],
    links: ['https://example.com/privacy'],
  },
  {
    id: '3',
    userId: '3',
    username: 'anon_789',
    avatar: 'https://via.placeholder.com/100/10B981/FFFFFF?text=A3',
    content: '¿Alguien más piensa que la tecnología nos está conectando pero también aislando? 🤔 #tecnologia #conexion',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas atrás
    likesCount: 43,
    commentsCount: 22,
    sharesCount: 5,
    isLiked: false,
    hashtags: ['#tecnologia', '#conexion'],
    links: [],
  },
  {
    id: '4',
    userId: '4',
    username: 'anon_321',
    avatar: 'https://via.placeholder.com/100/F59E0B/FFFFFF?text=A4',
    content: 'Increíble puesta de sol desde mi ventana. A veces las cosas más simples son las más hermosas.',
    media: [
      {
        type: 'image',
        uri: 'https://via.placeholder.com/400x600/F59E0B/FFFFFF?text=Sunset+View',
      },
    ],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 horas atrás
    likesCount: 89,
    commentsCount: 12,
    sharesCount: 7,
    isLiked: true,
    hashtags: [],
    links: [],
  },
  {
    id: '5',
    userId: '5',
    username: 'anon_654',
    avatar: 'https://via.placeholder.com/100/EC4899/FFFFFF?text=A5',
    content: 'Acabo de terminar de leer un libro increíble sobre psicología humana. Las recomendaciones anónimas a veces son las mejores 📚 #libros #psicologia #recomendaciones',
    media: [
      {
        type: 'image',
        uri: 'https://via.placeholder.com/300x400/EC4899/FFFFFF?text=Book+Cover',
      },
      {
        type: 'image',
        uri: 'https://via.placeholder.com/300x400/8B5CF6/FFFFFF?text=Reading+Space',
      },
      {
        type: 'image',
        uri: 'https://via.placeholder.com/300x400/10B981/FFFFFF?text=Notes',
      },
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 horas atrás
    likesCount: 156,
    commentsCount: 34,
    sharesCount: 18,
    isLiked: false,
    hashtags: ['#libros', '#psicologia', '#recomendaciones'],
    links: [],
  },
  {
    id: '6',
    userId: '1',
    username: 'anon_123',
    avatar: 'https://via.placeholder.com/100/8B5CF6/FFFFFF?text=A1',
    content: 'Video de mi gato siendo completamente dramático por no tener su comida favorita 😸',
    media: [
      {
        type: 'video',
        uri: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnail: 'https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Dramatic+Cat',
      },
    ],
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 horas atrás
    likesCount: 203,
    commentsCount: 67,
    sharesCount: 45,
    isLiked: true,
    hashtags: [],
    links: [],
  },
  {
    id: '7',
    userId: '2',
    username: 'anon_456',
    avatar: 'https://via.placeholder.com/100/EF4444/FFFFFF?text=A2',
    content: 'Reflexión del día: El anonimato no significa falta de humanidad. A veces nos permite ser más auténticos. #autenticidad #humanidad',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día atrás
    likesCount: 78,
    commentsCount: 19,
    sharesCount: 11,
    isLiked: false,
    hashtags: ['#autenticidad', '#humanidad'],
    links: [],
  },
  {
    id: '8',
    userId: '3',
    username: 'anon_789',
    avatar: 'https://via.placeholder.com/100/10B981/FFFFFF?text=A3',
    content: 'Mi setup de trabajo desde casa. Productividad at its finest! ¿Cuál es tu espacio de trabajo favorito? #trabajo #productividad #homeoffice',
    media: [
      {
        type: 'image',
        uri: 'https://via.placeholder.com/400x300/10B981/FFFFFF?text=Workspace+1',
      },
      {
        type: 'image',
        uri: 'https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Workspace+2',
      },
      {
        type: 'image',
        uri: 'https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Workspace+3',
      },
      {
        type: 'image',
        uri: 'https://via.placeholder.com/400x300/EC4899/FFFFFF?text=Workspace+4',
      },
    ],
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 1.25 días atrás
    likesCount: 134,
    commentsCount: 28,
    sharesCount: 16,
    isLiked: true,
    hashtags: ['#trabajo', '#productividad', '#homeoffice'],
    links: [],
  },
];

// Comentarios mock
export const mockComments: { [postId: string]: Comment[] } = {
  '1': [
    {
      id: 'c1',
      postId: '1',
      userId: '2',
      username: 'anon_456',
      avatar: 'https://via.placeholder.com/100/EF4444/FFFFFF?text=A2',
      content: 'Totalmente de acuerdo! El anonimato libera de juicios',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      likesCount: 5,
      isLiked: false,
    },
    {
      id: 'c2',
      postId: '1',
      userId: '3',
      username: 'anon_789',
      avatar: 'https://via.placeholder.com/100/10B981/FFFFFF?text=A3',
      content: 'Muy cierto, a veces podemos ser más nosotros mismos',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      likesCount: 3,
      isLiked: true,
    },
  ],
  '2': [
    {
      id: 'c3',
      postId: '2',
      userId: '1',
      username: 'anon_123',
      avatar: 'https://via.placeholder.com/100/8B5CF6/FFFFFF?text=A1',
      content: 'Excelente artículo, muy informativo',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      likesCount: 8,
      isLiked: false,
    },
  ],
};

// Conversaciones mock
export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: {
      id: 'msg1',
      conversationId: 'conv1',
      senderId: '2',
      content: 'Hola! Me gustó mucho tu post sobre reflexiones',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      isRead: false,
    },
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    unreadCount: 1,
  },
  {
    id: 'conv2',
    participants: [mockUsers[0], mockUsers[2]],
    lastMessage: {
      id: 'msg2',
      conversationId: 'conv2',
      senderId: '1',
      content: 'Gracias por la recomendación!',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isRead: true,
    },
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    unreadCount: 0,
  },
];

// Hashtags trending mock
export const trendingHashtags = [
  '#reflexiones',
  '#tecnologia',
  '#anonimato',
  '#privacidad',
  '#autenticidad',
  '#conexion',
  '#humanidad',
  '#productividad',
  '#libros',
  '#arte',
];

/**
 * CUÁNDO FUE, DICHO COMO LO DIRÍA EL IDIOMA DE QUIEN LO LEE.
 *
 * Antes eran cuatro `if` con sus frases en español y una fecha clavada a
 * `es-ES`: en inglés se leía "hace 2h" bajo el nombre de quien publicó. Las
 * reglas de cada idioma —cuándo se dice "ayer", cómo se abrevia una hora, dónde
 * va el número— las sabe `Intl` y vienen en el motor.
 *
 * LOS DOS TRAMOS SE CONSERVAN, que son una decisión de producto y no de idioma:
 * hasta una semana se dice cuánto hace; a partir de ahí, la fecha. Y el estilo
 * sigue siendo el corto —"hace 2 h", "2h ago"—, porque la hora de una
 * publicación vive en una línea estrecha al lado del nombre.
 *
 * El `locale` entra por parámetro: esto se importa fuera de React y no sabe
 * quién está mirando. Y `ahora` también, para que una prueba no dependa del reloj.
 */
export const getRelativeTime = (date: Date, locale: string, ahora: number = Date.now()): string => {
  const diffDias = Math.floor((ahora - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias >= 7) return formatearFecha(date, locale, { month: 'short', day: 'numeric' });
  return formatearTiempoRelativo(date, locale, ahora, { style: 'narrow' });
};

/**
 * LOS CONTADORES ABREVIADOS (me gusta, comentarios, vistas, miembros…), como los escribe cada idioma.
 *
 * Antes salían «12.4k» en todos los idiomas: con la coma decimal del inglés y su «k». En danés o en alemán, donde
 * el punto separa los miles, «12.4k» se lee mal. Con el `locale`, `Intl` escribe la forma corta de cada idioma
 * («12,4 t», «12,4 mil», «12.4K», «1,2万») y la cifra pequeña con su separador. Sin `locale` —quien todavía no lo
 * pase— se comporta como siempre.
 */
export const formatNumber = (num: number | undefined | null, locale?: string): string => {
  if (locale) return formatearNumero(num == null || isNaN(num) ? 0 : num, locale, { notation: 'compact', maximumFractionDigits: 1 });
  if (num == null || isNaN(num)) return '0';
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}k`;
  return `${(num / 1000000).toFixed(1)}M`;
};
