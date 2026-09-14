/*
 * LA PÁGINA PÚBLICA DE UNA PUBLICACIÓN — la parte que lee Firestore.
 *
 * Responde en `https://wee.zone/post/{postId}`, que es la MISMA ruta que la app
 * ya sabe abrir (`PostDetail: { path: 'post/:postId' }` en App.tsx). No hay una
 * dirección nueva ni una segunda forma de nombrar una publicación: quien tenga
 * la app instalada entra en la app, y quien no, entra aquí.
 *
 * Aquí solo vive lo que necesita la base de datos: buscar la publicación,
 * decidir si se puede enseñar y sacar de ella lo público. El HTML lo escribe
 * postPageHtml.ts, que no depende de nada y por eso se puede probar entero.
 *
 * TRES REGLAS QUE NO SE NEGOCIAN:
 *
 *  1. Se responde con el HTML YA ESCRITO. El rastreador de WhatsApp no ejecuta
 *     JavaScript: lo que no venga en la respuesta del servidor no existe para él.
 *  2. Una publicación privada NO SE ENSEÑA, y tampoco se enseña por la puerta de
 *     atrás: si lo compartido es un repost, se mira también el original.
 *  3. Solo sale lo público de quien publica —su alias, su foto y su tipo de
 *     perfil—. El resto del documento de usuario no se copia a la página.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import {
  AutorPublico,
  PublicacionPublica,
  baseDelSitio,
  idDeLaRuta,
  paginaDeLaPublicacion,
  paginaSinPublicacion,
} from './postPageHtml';

type Documento = Record<string, unknown>;

/**
 * SOLO `isPrivate === false` SE ENSEÑA. Todo lo demás, no.
 *
 * La pregunta está hecha al revés a propósito. Preguntar "¿es privada?" obliga a
 * acertar la lista de lo que es privado, y esa lista nunca está completa: falta
 * el campo, llega `null`, llega la cadena "false", llega un número, llega un
 * campo nuevo de una fase futura. Cualquier hueco de esa lista PUBLICA.
 *
 * Preguntando "¿está declarada pública?" el hueco no publica: calla. Y la
 * auditoría dice que no cuesta nada hacerlo así —las 19 publicaciones de get-wee
 * tienen `isPrivate: false`, ninguna se queda fuera—, mientras que el error
 * contrario no tiene deshacer: una tarjeta de WhatsApp ya repartida no se
 * recoge.
 *
 * Esto vale doble aquí porque las reglas de Firestore dejan `posts` en
 * `allow read: if true`: la base de datos ya es legible, y lo que esta página
 * añade es DIFUSIÓN. La puerta que difunde tiene que ser más estricta que la
 * que solo deja leer.
 */
const sePuedeEnseñar = (post: Documento): boolean => post.isPrivate === false;

/** La fecha, en español y sin hora: una publicación no se fecha al minuto. */
export const fechaEnEspanol = (valor: unknown): string | undefined => {
  const conFecha = valor as { toDate?: () => Date } | undefined;
  const fecha = conFecha && typeof conFecha.toDate === 'function' ? conFecha.toDate() : undefined;
  if (!fecha || Number.isNaN(fecha.getTime())) return undefined;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fecha);
};

/**
 * De todo el documento de usuario salen TRES campos.
 *
 * Se copian uno a uno a propósito, en vez de repartir el documento entero: así
 * un campo nuevo en `users` —un correo, un teléfono, una cuenta enlazada— no
 * puede aparecer en una página pública porque alguien se olvidó de excluirlo.
 */
const autorPublico = (usuario: Documento | null): AutorPublico | null => {
  if (!usuario) return null;
  return {
    displayName: typeof usuario.displayName === 'string' ? usuario.displayName : undefined,
    photoURL: typeof usuario.photoURL === 'string' ? usuario.photoURL : undefined,
    photoURLThumbnail:
      typeof usuario.photoURLThumbnail === 'string' ? usuario.photoURLThumbnail : undefined,
    profileType: typeof usuario.profileType === 'string' ? usuario.profileType : undefined,
  };
};

/** Solo la pregunta y las opciones. Los recuentos son cosa del servidor. */
const encuestaPublica = (poll: unknown): PublicacionPublica['encuesta'] => {
  const p = poll as { question?: unknown; options?: unknown } | undefined;
  if (!p || !Array.isArray(p.options)) return undefined;
  return {
    question: typeof p.question === 'string' ? p.question : undefined,
    options: (p.options as Documento[])
      .filter((o) => !!o)
      .map((o) => ({ text: typeof o.text === 'string' ? o.text : '' })),
  };
};

const textos = (valor: unknown): string[] | undefined =>
  Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : undefined;

const texto = (valor: unknown): string | undefined =>
  typeof valor === 'string' ? valor : undefined;

/** El documento crudo, convertido en lo que la página sabe pintar. */
const publicacionPublica = (
  id: string,
  post: Documento,
  autor: Documento | null,
): PublicacionPublica => ({
  id,
  content: texto(post.content),
  imageUrl: texto(post.imageUrl),
  imageUrls: textos(post.imageUrls),
  imageAspectRatios: Array.isArray(post.imageAspectRatios)
    ? (post.imageAspectRatios as unknown[]).map((n) => (typeof n === 'number' ? n : NaN))
    : undefined,
  videoUrl: texto(post.videoUrl),
  isWeel: post.isWeel === true,
  aiTools: textos(post.aiTools),
  fecha: fechaEnEspanol(post.createdAt),
  encuesta: encuestaPublica(post.poll),
  autor: autorPublico(autor),
});

/**
 * La página pública de una publicación de Weë.
 *
 * `invoker: 'public'` está escrito a mano porque es el punto entero de esta
 * función: la abre cualquiera, sin cuenta y sin sesión. `maxInstances` le pone
 * techo al gasto si un enlace se hace popular de golpe.
 */
export const publicPostPage = onRequest(
  { region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 10, invoker: 'public' },
  async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.status(405).set('Allow', 'GET, HEAD').send('GET only');
      return;
    }

    const base = baseDelSitio(
      String(request.headers['x-forwarded-host'] || request.headers.host || ''),
    );

    /* Una página que no se puede enseñar: 404 con cara amable y sin datos. */
    const sinPublicacion = (motivo: 'privada' | 'borrada') => {
      response
        .status(404)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Cache-Control', 'public, max-age=60')
        .send(paginaSinPublicacion(motivo));
    };

    const postId = idDeLaRuta(request.path);
    if (!postId) {
      sinPublicacion('borrada');
      return;
    }

    try {
      const db = getFirestore();
      const doc = await db.collection('posts').doc(postId).get();
      if (!doc.exists) {
        sinPublicacion('borrada');
        return;
      }

      let post = (doc.data() || {}) as Documento;
      if (!sePuedeEnseñar(post)) {
        sinPublicacion('privada');
        return;
      }

      /*
       * UN REPOST NO GUARDA NADA SUYO: es una referencia al original
       * (`createRepost` en services/firestoreService.ts crea el documento con
       * `content: ''` y ningún medio). Así que hay que ir a buscar el original
       * —y volver a preguntarle si se puede enseñar, porque compartir el
       * repost de una publicación privada seguiría siendo enseñarla.
       */
      let reposteadaPor: string | undefined;
      let repostComment: string | undefined;
      let autorId = texto(post.userId);
      if (post.isRepost === true && texto(post.originalPostId)) {
        const quienReposteo = await usuario(autorId);
        reposteadaPor = texto(quienReposteo?.displayName) || 'Alguien';
        repostComment = texto(post.repostComment);
        const original = await db
          .collection('posts')
          .doc(String(post.originalPostId))
          .get();
        if (!original.exists) {
          sinPublicacion('borrada');
          return;
        }
        post = (original.data() || {}) as Documento;
        /* Al original se le exige lo mismo: declararse público, no solo no ser privado. */
        if (!sePuedeEnseñar(post)) {
          sinPublicacion('privada');
          return;
        }
        autorId = texto(post.userId);
      }

      const autor = await usuario(autorId);
      const publica = publicacionPublica(postId, post, autor);
      publica.reposteadaPor = reposteadaPor;
      publica.repostComment = repostComment;

      response
        .status(200)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
        .set('X-Content-Type-Options', 'nosniff')
        .send(paginaDeLaPublicacion(publica, base));
    } catch (error) {
      /*
       * Si Firestore falla, quien abrió el enlace no tiene por qué ver una
       * traza. Ve la misma página amable, y el fallo queda en el registro.
       */
      console.error('No se pudo pintar la página pública de', postId, error);
      response
        .status(500)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Cache-Control', 'no-store')
        .send(paginaSinPublicacion('borrada'));
    }
  },
);

/**
 * El documento del autor, o nada. Que falte no rompe la página.
 *
 * SE BUSCA POR EL CAMPO `uid`, NO POR EL ID DEL DOCUMENTO.
 *
 * En Weë los perfiles se crean con `addDoc`, así que su identificador es uno
 * autogenerado y el uid de la cuenta va DENTRO, en el campo `uid`. Un
 * `users/{uid}` no encuentra nada nunca. La app ya lo hace bien —
 * `usersService.getByUid` consulta por el campo—, y aquí se hace igual.
 *
 * Se vio en la primera página publicada: todas decían "Alguien en Weë" y salían
 * sin avatar, porque el respaldo del nombre tapaba una búsqueda que fallaba
 * siempre en silencio.
 */
async function usuario(uid: string | undefined): Promise<Documento | null> {
  if (!uid) return null;
  try {
    const encontrados = await getFirestore()
      .collection('users')
      .where('uid', '==', uid)
      .limit(1)
      .get();
    if (encontrados.empty) return null;
    return (encontrados.docs[0].data() || {}) as Documento;
  } catch (error) {
    console.warn('No se pudo leer el autor', uid, error);
    return null;
  }
}
