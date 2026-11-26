/**
 * De una publicación a una plantilla. Sin colección nueva: una plantilla es una publicación que trae su prompt
 * («Cómo lo hice») y un medio. Lo demás —autor, contadores— sale de la propia publicación.
 */
import type { Post } from '../services/firestoreService';
import { CategoriaDePlantilla, PlantillaWeeAi } from '../constants/plantillasWeeAi';

/** Moda y comida salen del contexto con que se publicó; el resto, de si trae vídeo. */
export const categoriaDePost = (post: Post): CategoriaDePlantilla => {
  if (post.sourceSection === 'business') return 'moda';
  if (post.sourceSection === 'chef') return 'comida';
  if (post.sourceSection === 'travel') return 'viajes';
  return post.videoUrl ? 'video' : 'imagen';
};

/** Primera línea del texto, acortada: el título corto de la tarjeta. */
const tituloDe = (contenido: string): string => {
  const linea = (contenido || '').split('\n')[0].trim();
  return linea.length > 70 ? `${linea.slice(0, 67).trimEnd()}…` : linea;
};

export const plantillaDesdePost = (post: Post): PlantillaWeeAi | null => {
  const prompt = (post.aiPrompt || '').trim();
  const imagen = post.imageUrlsThumbnails?.[0] || post.imageUrls?.[0] || post.imageUrl;
  if (!post.id || !prompt || (!post.videoUrl && !imagen)) return null;
  const aspecto = post.imageAspectRatios?.[0];
  return {
    id: `post-${post.id}`,
    categoria: categoriaDePost(post),
    titulo: tituloDe(post.content) || tituloDe(prompt),
    autorId: post.userId,
    prompt,
    explicacion: (post.aiProcess || '').trim() || undefined,
    imagen,
    video: post.videoUrl,
    aspecto: aspecto && aspecto > 0.4 && aspecto < 2.5 ? aspecto : post.videoUrl ? 0.8 : 1,
    recreaciones: 0,
    likes: post.agreementCount ?? post.likes ?? 0,
    comentarios: post.comments ?? 0,
    escenas: [],
    duraciones: post.videoUrl ? [5, 10] : [],
    ejemplo: false,
    postId: post.id,
  };
};
