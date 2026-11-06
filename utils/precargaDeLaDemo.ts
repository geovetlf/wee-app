/*
 * Demo (docs/WEE-DEMO.md): al abrir la app se descargan, en segundo plano, las imágenes que la demo va a enseñar, para
 * que cada pantalla las pinte al instante en vez de irlas trayendo una a una. Solo con EXPO_PUBLIC_DEMO_MEDIOS; fuera
 * de la demo esto no hace nada.
 *
 * Dos fuentes: lo que ya está en la base (publicaciones, perfiles, comunidades y páginas: sus fotos y miniaturas) y las
 * imágenes fijas de las secciones de Weë AI. Primero las pequeñas —lo que se ve antes— y después las grandes.
 */
import { Image } from 'expo-image';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../config/firebase';

const BASE = process.env.EXPO_PUBLIC_DEMO_MEDIOS;

/* Las imágenes fijas de las secciones (cabeceras de referencia, Design, Fashion, Jay Reeds). */
const FIJAS = [
  ...['studio', 'design', 'chef', 'music', 'travel', 'fashion'].map((n) => `l-ref-${n}.webp`),
  ...['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'hero'].map((n) => `l-design-${n}.webp`),
  'l-stock-nails.webp', 'l-jayreeds.webp', 'l-jayreeds-cover.webp', 'm-jayreeds.webp',
];

let hecha = false;

const recoger = (valor: unknown, destino: Set<string>) => {
  if (typeof valor === 'string') { if (valor.startsWith('http')) destino.add(valor); return; }
  if (Array.isArray(valor)) { valor.forEach((v) => recoger(v, destino)); return; }
  if (valor && typeof valor === 'object') Object.values(valor as Record<string, unknown>).forEach((v) => recoger(v, destino));
};

export const precargarDemo = async (): Promise<void> => {
  if (!BASE || hecha) return;
  hecha = true;
  const urls = new Set<string>(FIJAS.map((n) => `${BASE}/${n}`));
  for (const col of ['posts', 'users', 'communities', 'pages']) {
    try {
      const snap = await getDocs(query(collection(db, col), limit(80)));
      snap.docs.forEach((d) => recoger(d.data(), urls));
    } catch {
      /* Una colección que no se puede leer no impide precargar las demás. */
    }
  }
  /* Solo imágenes del servidor de la demo; los vídeos los carga su reproductor. */
  const imagenes = [...urls].filter((u) => u.startsWith(BASE) && /\.(webp|jpe?g|png)(\?|$)/i.test(u));
  const pequenas = imagenes.filter((u) => /\/m-/.test(u));
  const resto = imagenes.filter((u) => !/\/m-/.test(u));
  await Image.prefetch(pequenas, 'memory-disk').catch(() => false);
  await Image.prefetch(resto, 'memory-disk').catch(() => false);
};
