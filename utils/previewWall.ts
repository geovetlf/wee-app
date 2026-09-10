import { Timestamp } from 'firebase/firestore';
import { Post, UserProfile } from '../services/firestoreService';
import { seedUserCache } from '../hooks/useUserById';

/*
 * ─── Muro de mentira, para poder juzgar el de verdad ─────────────────────────
 *
 * Con una sola publicación no se puede opinar de un muro. No se ve el ritmo
 * vertical, ni cuánto separa una tarjeta de la siguiente, ni si al hacer scroll
 * apetece seguir. Este archivo existe para eso y solo para eso: llenar el muro
 * de Weë con gente y publicaciones creíbles mientras se mira el diseño.
 *
 * LO QUE NO HACE, Y NO PUEDE HACER:
 *  - No escribe en Firestore. No hay una sola llamada de escritura aquí.
 *  - No crea usuarios. Los perfiles se siembran en la caché en memoria que ya
 *    consulta `useUserById` ANTES de ir a la red, así que ni siquiera se leen.
 *  - No se enciende solo. Sin EXPO_PUBLIC_WALL_PREVIEW=1 en el .env, este módulo
 *    devuelve una lista vacía y la app se comporta exactamente igual que sin él.
 *
 * Los identificadores llevan el prefijo `preview:` para que no puedan chocar
 * jamás con un uid real de Firebase, que nunca contiene dos puntos.
 */

/** El interruptor. Apagado salvo que el .env lo encienda a mano. */
export const PREVIEW_DEL_MURO = process.env.EXPO_PUBLIC_WALL_PREVIEW === '1';

/** El prefijo de una publicación de mentira. Ninguna real empieza así. */
const ID_PREVIEW = 'preview-post-';

const AHORA = Date.now();
/** Hace `horas` horas. Las publicaciones tienen que verse escalonadas en el tiempo. */
const hace = (horas: number): Timestamp => Timestamp.fromMillis(AHORA - horas * 3600 * 1000);

/** Una foto distinta por semilla, estable entre recargas. */
const foto = (semilla: string, ancho = 1000, alto = 700) => `https://picsum.photos/seed/${semilla}/${ancho}/${alto}`;

interface Persona {
  id: string;
  nombre: string;
  avatar: string;
  bio: string;
}

/*
 * Ocho personas distintas. Distintos avatares y distintas formas de escribir,
 * porque un muro donde todos suenan igual no sirve para juzgar nada.
 */
const PERSONAS: Persona[] = [
  { id: 'preview:ana', nombre: 'Ana Retamozo', avatar: 'female', bio: 'Fotografía y trenes lentos.' },
  { id: 'preview:marco', nombre: 'Marco Silva', avatar: 'male', bio: 'Cocino y viajo, en ese orden.' },
  { id: 'preview:lu', nombre: 'Lucía Ferrer', avatar: 'cat', bio: 'Diseño de día, mapas de noche.' },
  { id: 'preview:kenji', nombre: 'Kenji Mori', avatar: 'ninja', bio: 'Tokio ↔ Kioto.' },
  { id: 'preview:vale', nombre: 'Valeria Ríos', avatar: 'masked', bio: 'Mochila, cámara y poco más.' },
  { id: 'preview:tomas', nombre: 'Tomás Aguirre', avatar: 'robot', bio: 'Hago videos con IA.' },
  { id: 'preview:sofi', nombre: 'Sofía Navarro', avatar: 'female', bio: 'Pregunto mucho. Aprendo más.' },
  { id: 'preview:diego', nombre: 'Diego Paredes', avatar: 'male', bio: 'Andes y sobremesas largas.' },
];

const perfil = (p: Persona): UserProfile =>
  ({
    uid: p.id,
    displayName: p.nombre,
    email: '',
    bio: p.bio,
    avatarType: 'predefined',
    avatarId: p.avatar,
    followers: 0,
    following: 0,
    posts: 0,
    createdAt: hace(24 * 200),
    updatedAt: hace(24 * 200),
    joinedCommunities: [],
  } as unknown as UserProfile);

interface Borrador {
  autor: string;
  texto: string;
  horas: number;
  imagen?: string;
  seccion?: string;
  lugar?: { label: string; pais?: string };  // pais = codigo ISO del catalogo
  reacciones?: number;
  comentarios?: number;
}

/*
 * Nueve publicaciones. Algunas son de Travel, otras de Studio y Design, y otras
 * de nada en concreto: eso es justo lo que hay que poder ver, que el muro es el
 * general de Weë y que Travel es un contexto dentro de él, no un muro aparte.
 */
const BORRADORES: Borrador[] = [
  {
    autor: 'preview:kenji',
    texto: 'Once días entre Tokio y Kioto. Lo mejor no fue ningún templo: fue perderme en Yanaka a las siete de la mañana, con las tiendas abriendo.',
    horas: 2,
    imagen: foto('wee-tokio-calle'),
    seccion: 'travel',
    lugar: { label: 'Tokio', pais: 'JP' },
    reacciones: 128,
    comentarios: 19,
  },
  {
    autor: 'preview:marco',
    texto: 'Si vais a Lisboa, saltaos los sitios del centro. Esta tasca de Graça sirve el mejor bacalhau à brás que he comido, y cuesta ocho euros.',
    horas: 5,
    imagen: foto('wee-lisboa-tasca', 1000, 750),
    seccion: 'travel',
    lugar: { label: 'Lisboa', pais: 'PT' },
    reacciones: 64,
    comentarios: 23,
  },
  {
    autor: 'preview:ana',
    texto: 'La luz de las seis en el valle. No he tocado el color.',
    horas: 9,
    imagen: foto('wee-valle-luz', 1000, 1250),
    lugar: { label: 'Cusco', pais: 'PE' },
    reacciones: 212,
    comentarios: 11,
  },
  {
    autor: 'preview:vale',
    texto: 'Consejo aburrido que ojalá me hubieran dado antes: comprad la tarjeta de transporte en el aeropuerto, no en la ciudad. Me ahorré una hora de cola y bastante dinero.',
    horas: 14,
    seccion: 'travel',
    reacciones: 87,
    comentarios: 31,
  },
  {
    autor: 'preview:tomas',
    texto: 'Primer corto hecho entero con Weë Studio. Tres tomas, sin cámara.',
    horas: 20,
    imagen: foto('wee-studio-corto', 1000, 560),
    seccion: 'studio',
    reacciones: 156,
    comentarios: 42,
  },
  {
    autor: 'preview:sofi',
    texto: '¿Alguien ha ido a Hakone en octubre? Me dicen que el otoño empieza justo entonces y no sé si arriesgarme o esperar a noviembre.',
    horas: 26,
    seccion: 'travel',
    lugar: { label: 'Hakone', pais: 'JP' },
    reacciones: 18,
    comentarios: 37,
  },
  {
    autor: 'preview:lu',
    texto: 'Cartel para el festival del barrio. Tipografía prestada de los letreros de las chicherías de acá.',
    horas: 33,
    imagen: foto('wee-cartel-festival', 1000, 1300),
    seccion: 'design',
    lugar: { label: 'Lima', pais: 'PE' },
    reacciones: 94,
    comentarios: 8,
  },
  {
    autor: 'preview:diego',
    texto: 'Cuatro días caminando y lo que me llevo es una sobremesa de tres horas con una familia que nos invitó a comer sin conocernos de nada.',
    horas: 41,
    imagen: foto('wee-andes-sobremesa', 1000, 700),
    seccion: 'travel',
    lugar: { label: 'Valle Sagrado', pais: 'PE' },
    reacciones: 176,
    comentarios: 27,
  },
  {
    autor: 'preview:ana',
    texto: 'París en un día gris también es París.',
    horas: 52,
    imagen: foto('wee-paris-gris', 1000, 640),
    lugar: { label: 'París', pais: 'FR' },
    reacciones: 143,
    comentarios: 15,
  },
];

const publicacion = (b: Borrador, indice: number): Post =>
  ({
    id: `${ID_PREVIEW}${indice + 1}`,
    userId: b.autor,
    content: b.texto,
    ...(b.imagen ? { imageUrl: b.imagen, imageUrls: [b.imagen] } : {}),
    ...(b.seccion ? { sourceSection: b.seccion } : {}),
    ...(b.lugar ? { place: { kind: 'catalog', label: b.lugar.label, countryCode: b.lugar.pais } } : {}),
    likes: b.reacciones ?? 0,
    agreementCount: b.reacciones ?? 0,
    disagreementCount: 0,
    comments: b.comentarios ?? 0,
    createdAt: hace(b.horas),
    isPublic: true,
  } as unknown as Post);

/**
 * ¿Esta publicación es de las de mentira?
 *
 * Existe para que NADA escriba en Firestore por su culpa. Una tarjeta que
 * aparece en pantalla incrementa sus vistas, y hacerlo sobre un documento que no
 * existe devuelve `permission-denied` y llena la pantalla de avisos. La promesa
 * de este módulo es que no toca la base de datos, y esto es lo que la sostiene.
 */
export const esPublicacionDePreview = (id?: string): boolean => !!id && id.startsWith(ID_PREVIEW);

let sembrado = false;

/**
 * Las publicaciones de previsualización, o nada si el interruptor está apagado.
 * La primera vez siembra los perfiles en la caché de `useUserById`, que es lo
 * que hace que cada tarjeta muestre su nombre y su avatar sin pedir nada a la red.
 */
export const publicacionesDePreview = (): Post[] => {
  if (!PREVIEW_DEL_MURO) return [];
  if (!sembrado) {
    PERSONAS.forEach((p) => seedUserCache(p.id, perfil(p)));
    sembrado = true;
  }
  return BORRADORES.map(publicacion);
};
