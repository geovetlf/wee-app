/*
 * LA PÁGINA PÚBLICA DE UNA PUBLICACIÓN — el HTML, sin Firestore.
 *
 * Este archivo no importa nada. Ni firebase-admin, ni funciones, ni el cliente:
 * entra un objeto plano con lo que ya se leyó y sale una cadena de HTML. Se hizo
 * así por dos razones concretas.
 *
 * La primera es que se pueda PROBAR de verdad. Las pruebas transpilan este
 * archivo y lo ejecutan; si dependiera del SDK de administración habría que
 * levantar medio Firebase para comprobar una etiqueta <meta>.
 *
 * La segunda es la razón por la que existe la página entera: EL RASTREADOR DE
 * WHATSAPP NO EJECUTA JAVASCRIPT. Pide la dirección, lee lo que el servidor le
 * manda y se va. Si las etiquetas Open Graph se pintaran desde el cliente no
 * las vería nunca, y quien reciba el enlace vería una tarjeta vacía. Por eso el
 * HTML sale ya escrito de aquí, con el título, el texto y la portada dentro.
 *
 * Lo que este archivo NO hace: no decide si una publicación se puede enseñar
 * —eso se mira contra Firestore, en postPage.ts— y no inventa medidas nuevas de
 * imagen. Las portadas salen de las MISMAS transformaciones de Cloudinary que
 * ya usa la app (services/cloudinaryService.ts), reescritas aquí porque
 * `functions` es otro paquete y no puede importar del cliente. Nada se sube a
 * Storage: una dirección derivada no ocupa un byte.
 */

/*
 * EL IDIOMA DE LA PÁGINA. Los textos salen de los diccionarios de la app (`i18n/textos/<idioma>/servidor/publica.ts`,
 * copiados a `../shared/textosDelServidor.ts`), y `postPage.ts` elige la tabla con el idioma de quien abre el
 * enlace y se la pasa a cada función de abajo. Sin tabla, la española: la página de siempre.
 *
 * La española va ESCRITA AQUÍ y no importada porque este archivo no importa nada (ver arriba); es la misma que la
 * del diccionario, y `functions/test/i18n-servidor.test.mjs` comprueba que no se separen.
 */
export type TablaDeTextos = Readonly<Record<string, string>>;

export const TEXTOS_ES: TablaDeTextos = {
  codigo: 'es',
  locale: 'es_ES',
  alguien: 'Alguien',
  tituloDelEnlace: '{{nombre}} en Weë',
  descripcionWeel: 'Un Weël en Weë.',
  descripcionVideo: 'Un video en Weë.',
  descripcionImagen: 'Una imagen en Weë.',
  descripcionEncuesta: 'Una encuesta en Weë.',
  descripcionPublicacion: 'Una publicación en Weë.',
  explorar: 'Explorar Weë',
  privacidad: 'Privacidad',
  terminos: 'Términos',
  ayuda: 'Ayuda',
  yaNoDisponible: 'Esta publicación ya no está disponible.',
  noDisponible: 'Esta publicación no está disponible.',
  masEnWee: 'y {{contador}} más en Weë',
  hechoCon: 'Hecho con',
  reposteo: '{{nombre}} reposteó',
  perfilWee: 'Perfil Weë',
  estoEsWee: 'Esto es Weë',
  lema: 'La red de quienes crean con Inteligencia Artificial. Descubre, aprende y comparte.',
};

/** Mete los valores en el texto: '{{nombre}} en Weë' + {nombre:'Ana'}. Lo que no viene se queda como está. */
const rellenarTexto = (texto: string, valores: Record<string, string | number | undefined>): string =>
  texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (entero, nombre: string) => (valores[nombre] === undefined ? entero : String(valores[nombre])));

/** Lo público de quien publica. Nada más entra aquí: ni correo, ni cuenta enlazada. */
export interface AutorPublico {
  displayName?: string;
  photoURL?: string;
  photoURLThumbnail?: string;
  /** 'real' o 'hidi' (Perfil Weë). Solo para la insignia. */
  profileType?: string;
}

/** Una opción de encuesta, tal como se enseña: sin votos ni quién votó. */
export interface OpcionPublica {
  text?: string;
}

/** La publicación ya leída y limpia. Sin Timestamp: la fecha llega hecha texto. */
export interface PublicacionPublica {
  id: string;
  content?: string;
  imageUrl?: string;
  imageUrls?: string[];
  /** ancho/alto de cada imagen, en el mismo orden. Para reservarles el sitio. */
  imageAspectRatios?: number[];
  videoUrl?: string;
  isWeel?: boolean;
  aiTools?: string[];
  /** Ya formateada en español por quien leyó Firestore. */
  fecha?: string;
  /** Solo la pregunta y las opciones. Los recuentos son del servidor. */
  encuesta?: { question?: string; options?: OpcionPublica[] };
  autor?: AutorPublico | null;
  /** Si esto llegó por un repost: quién reposteó y qué dijo al hacerlo. */
  reposteadaPor?: string;
  repostComment?: string;
}

/* ── Escapar. Todo lo que venga de una persona pasa por aquí ────────────── */

/**
 * El texto de una publicación lo escribe cualquiera y aquí se mete dentro de
 * HTML. Sin esto, alguien podría publicar `<script>` y ejecutarlo en el
 * navegador de quien abra el enlace. No hay ninguna excepción: cada valor que
 * se interpola en la plantilla pasa por esta función.
 */
export const escapar = (texto: unknown): string =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Lo mismo, para un atributo que además tiene que ser una dirección http(s). */
export const direccionSegura = (url: unknown): string => {
  const s = String(url ?? '').trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(s) ? escapar(s) : '';
};

/** Un resumen de una línea para la tarjeta del enlace. */
export const resumir = (texto: string, tope = 200): string => {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= tope) return limpio;
  return limpio.slice(0, tope - 1).trimEnd() + '…';
};

/* ── Cloudinary: las mismas transformaciones que la app ─────────────────── */

/** `cloudinaryUrl` del cliente: mete transformaciones tras /upload/. */
export const conTransformacion = (url: string, transformaciones: string): string => {
  if (!url) return url;
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/' + transformaciones + '/');
  }
  return url;
};

/** `cloudinaryThumb`. */
export const miniatura = (url: string, ancho = 400): string =>
  conTransformacion(url, 'c_fill,w_' + ancho + ',q_auto,f_auto');

/** `cloudinaryFeed`. */
export const imagenDelMuro = (url: string, ancho = 800): string =>
  conTransformacion(url, 'c_limit,w_' + ancho + ',q_auto,f_auto');

/** `cloudinaryAvatar`. */
export const imagenDeAvatar = (url: string, lado = 96): string =>
  conTransformacion(url, 'c_fill,w_' + lado + ',h_' + lado + ',g_face,q_auto,f_auto');

/**
 * `cloudinaryVideoThumb`: el primer fotograma como JPG.
 *
 * `f_jpg` manda sobre la extensión .mp4 de la dirección —comprobado contra
 * Cloudinary: devuelve 200 con Content-Type image/jpeg—, así que un vídeo da
 * una portada de verdad sin generar ni guardar nada nuevo.
 */
export const miniaturaDeVideo = (url: string, ancho = 400): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace(/\/video\/upload\/[^/]*\//, '/video/upload/so_0,w_' + ancho + ',c_limit,f_jpg/');
};

/** El icono de Weë, cuando la publicación no trae ninguna imagen propia. */
export const PORTADA_DE_RESERVA = 'https://wee.zone/img/icon.png';

/**
 * La portada del enlace. Un vídeo da su primer fotograma; una imagen, ella
 * misma a 1200 de ancho, que es el tamaño que esperan las tarjetas de enlace.
 */
export const portadaDelEnlace = (post: PublicacionPublica): string => {
  if (post.videoUrl) {
    const dePrimerFotograma = miniaturaDeVideo(post.videoUrl, 1200);
    /* Si el vídeo no es de Cloudinary no hay fotograma que sacar sin procesarlo. */
    if (dePrimerFotograma && dePrimerFotograma !== post.videoUrl) return dePrimerFotograma;
  }
  const primera = post.imageUrl || (post.imageUrls && post.imageUrls[0]);
  if (primera) return miniatura(primera, 1200);
  return PORTADA_DE_RESERVA;
};

/* ── El texto de la tarjeta del enlace ──────────────────────────────────── */

/** Cómo se llama quien publica, con el respaldo que ya usa la app. */
export const nombreDelAutor = (post: PublicacionPublica, textos: TablaDeTextos = TEXTOS_ES): string =>
  (post.autor && post.autor.displayName) || textos.alguien;

/** La línea en negrita de la tarjeta de WhatsApp. */
export const tituloDelEnlace = (post: PublicacionPublica, textos: TablaDeTextos = TEXTOS_ES): string =>
  rellenarTexto(textos.tituloDelEnlace, { nombre: nombreDelAutor(post, textos) });

/**
 * La línea gris de debajo. Si no hay texto, se dice qué hay, porque una
 * descripción vacía deja la tarjeta a medias.
 */
export const descripcionDelEnlace = (post: PublicacionPublica, textos: TablaDeTextos = TEXTOS_ES): string => {
  const texto = resumir(post.content || post.repostComment || '');
  if (texto) return texto;
  if (post.isWeel) return textos.descripcionWeel;
  if (post.videoUrl) return textos.descripcionVideo;
  if (post.imageUrl || (post.imageUrls && post.imageUrls.length)) return textos.descripcionImagen;
  if (post.encuesta) return textos.descripcionEncuesta;
  return textos.descripcionPublicacion;
};

/* ── De dónde cuelga la página ──────────────────────────────────────────── */

/**
 * Los sitios desde los que esta página se sirve. La dirección canónica es
 * wee.zone; los otros dos son los dominios propios del hosting, y están en la
 * lista para que la página se pueda ABRIR Y PROBAR ahí mientras el dominio
 * todavía no apunta a este proyecto.
 *
 * Es una lista cerrada a propósito: `og:url` se construye con esto, y una
 * cabecera `Host` la manda quien llama. Sin lista, cualquiera podría hacer que
 * la página se anunciara a sí misma bajo otro dominio.
 */
export const BASE_CANONICA = 'https://wee.zone';
const BASES_CONOCIDAS = [
  'wee.zone',
  'www.wee.zone',
  'get-wee.web.app',
  'get-wee.firebaseapp.com',
];

export const baseDelSitio = (host?: string): string => {
  const limpio = String(host ?? '').split(':')[0].trim().toLowerCase();
  return BASES_CONOCIDAS.indexOf(limpio) >= 0 ? 'https://' + limpio : BASE_CANONICA;
};

/** La dirección pública de una publicación. La misma ruta que ya abre la app. */
export const enlaceDeLaPublicacion = (postId: string, base = BASE_CANONICA): string =>
  base + '/post/' + encodeURIComponent(postId);

/* ── El identificador que viene en la ruta ──────────────────────────────── */

/**
 * Saca el identificador de `/post/{id}`.
 *
 * Acepta también `/{id}` a secas, que es como llega cuando se invoca la función
 * por su propia dirección en vez de por el hosting. Y filtra: un identificador
 * de Firestore no lleva barras ni puntos, así que nada que no encaje llega a
 * tocar la base de datos.
 */
export const idDeLaRuta = (ruta: string): string | null => {
  const sinConsulta = String(ruta ?? '').split('?')[0].split('#')[0];
  const partes = sinConsulta.split('/').filter(Boolean);
  const ultimo = partes.length ? partes[partes.length - 1] : '';
  if (!ultimo || ultimo === 'post') return null;
  let candidato = ultimo;
  try {
    candidato = decodeURIComponent(ultimo);
  } catch {
    return null;
  }
  return /^[A-Za-z0-9_-]{1,200}$/.test(candidato) ? candidato : null;
};

/* ── El aspecto ─────────────────────────────────────────────────────────── */

/*
 * Los colores de Weë, tal cual: fondo blanco, dorado #F5B731 y gris oscuro
 * #1F2937 para el texto. Inter con respaldo del sistema, porque si la tipografía
 * no llega la página tiene que seguir leyéndose igual de bien.
 */
const ESTILOS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --oro:#F5B731;--oro-oscuro:#E5A020;
  --tinta:#1F2937;--tinta-suave:#6B7280;--tinta-tenue:#9CA3AF;
  --linea:#E5E7EB;--fondo:#FFFFFF;--crema:#FAFAF9;
}
html{-webkit-text-size-adjust:100%}
body{
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  background:var(--crema);color:var(--tinta);
  line-height:1.55;-webkit-font-smoothing:antialiased;
}
a{color:inherit;text-decoration:none}
.envoltura{max-width:560px;margin:0 auto;padding:0 0 48px}
.barra{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:14px 20px;background:var(--fondo);border-bottom:1px solid var(--linea);
  position:sticky;top:0;z-index:10;
}
.marca{font-size:22px;font-weight:800;letter-spacing:-.02em;color:var(--tinta)}
.marca span{color:var(--oro)}
.barra .abrir{
  font-size:14px;font-weight:600;color:var(--tinta);
  border:1px solid var(--linea);border-radius:999px;padding:7px 14px;
}
.tarjeta{
  background:var(--fondo);border:1px solid var(--linea);border-radius:16px;
  box-shadow:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.04);
  margin:20px 16px;overflow:hidden;
}
.reposteo{
  display:flex;align-items:center;gap:8px;
  padding:12px 20px 0;font-size:13px;color:var(--tinta-suave);
}
.cabecera{display:flex;align-items:center;gap:12px;padding:20px 20px 14px}
.avatar{
  width:44px;height:44px;border-radius:999px;flex:none;object-fit:cover;
  background:var(--oro);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:17px;letter-spacing:-.01em;
}
.quien{min-width:0}
.nombre{font-weight:700;font-size:16px;letter-spacing:-.01em;overflow-wrap:anywhere}
.cuando{font-size:13px;color:var(--tinta-tenue)}
.insignia{
  display:inline-block;margin-left:6px;vertical-align:1px;
  font-size:11px;font-weight:700;letter-spacing:.02em;
  color:var(--oro-oscuro);background:rgba(245,183,49,.14);
  border-radius:999px;padding:2px 8px;
}
.texto{padding:0 20px 18px;font-size:16px;overflow-wrap:anywhere;white-space:pre-wrap}
.medio{display:block;width:100%;background:#F3F4F6}
.medio img,.medio video{display:block;width:100%;height:auto}
.medio[style]{position:relative}
.medio[style] img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.medio+.medio{margin-top:2px}
.pie-medio{padding:10px 20px 0;font-size:13px;color:var(--tinta-tenue)}
.encuesta{margin:0 20px 18px;border:1px solid var(--linea);border-radius:12px;padding:14px}
.encuesta h2{font-size:15px;font-weight:700;margin-bottom:10px}
.opcion{
  border:1px solid var(--linea);border-radius:9px;padding:9px 12px;
  font-size:14px;color:var(--tinta-suave);overflow-wrap:anywhere;
}
.opcion+.opcion{margin-top:7px}
.herramientas{display:flex;flex-wrap:wrap;gap:7px;padding:0 20px 20px}
.herramientas b{
  font-size:12px;font-weight:600;color:var(--tinta-suave);
  align-self:center;margin-right:2px;
}
.chip{
  font-size:12px;font-weight:600;color:var(--tinta);
  background:var(--crema);border:1px solid var(--linea);
  border-radius:999px;padding:4px 10px;
}
.llamada{
  margin:0 16px;padding:26px 22px;text-align:center;
  background:var(--fondo);border:1px solid var(--linea);border-radius:16px;
}
.llamada h2{font-size:19px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
.llamada p{font-size:14px;color:var(--tinta-suave);margin-bottom:18px}
.boton{
  display:inline-block;background:var(--oro);color:#1F2937;
  font-weight:700;font-size:15px;border-radius:999px;padding:13px 30px;
}
.pie{padding:26px 20px 0;text-align:center;font-size:13px;color:var(--tinta-tenue)}
.pie a{color:var(--tinta-suave);font-weight:500}
.pie a+a{margin-left:14px}
.vacio{
  margin:56px 16px 0;padding:44px 24px;text-align:center;
  background:var(--fondo);border:1px solid var(--linea);border-radius:16px;
}
.vacio .marca{font-size:26px;margin-bottom:18px}
.vacio p{font-size:16px;color:var(--tinta-suave);margin-bottom:24px}
@media (min-width:600px){
  .tarjeta,.llamada{margin-left:0;margin-right:0}
  .envoltura{padding:0 16px 56px}
}
`.trim();

const cabeceraDelSitio = (textos: TablaDeTextos): string => `
  <header class="barra">
    <a class="marca" href="/">We<span>ë</span></a>
    <a class="abrir" href="/">${escapar(textos.explorar)}</a>
  </header>`;

/* Las páginas de privacidad, términos y ayuda del sitio están en español; los enlaces se llaman en el idioma de la página. */
const pieDelSitio = (textos: TablaDeTextos): string => `
  <footer class="pie">
    <a href="/privacy">${escapar(textos.privacidad)}</a><a href="/terms">${escapar(textos.terminos)}</a><a href="/support">${escapar(textos.ayuda)}</a>
  </footer>`;

/** El armazón común. `cabeza` son las etiquetas propias de cada página. */
const documento = (titulo: string, cabeza: string, cuerpo: string, textos: TablaDeTextos = TEXTOS_ES): string => `<!DOCTYPE html>
<html lang="${escapar(textos.codigo)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<meta name="theme-color" content="#F5B731">
<link rel="icon" type="image/png" href="/img/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">
${cabeza}
<style>${ESTILOS}</style>
</head>
<body>
<div class="envoltura">${cabeceraDelSitio(textos)}
${cuerpo}${pieDelSitio(textos)}
</div>
</body>
</html>
`;

/* ── Las dos páginas ────────────────────────────────────────────────────── */

/**
 * Cuando no hay nada que enseñar.
 *
 * Dos motivos y dos frases, que es lo que se pidió: una publicación privada
 * "no está disponible" y una borrada "ya no está disponible". Ninguna de las
 * dos enseña nada de la publicación —ni autor, ni texto, ni portada— y las dos
 * llevan `noindex`, para que un buscador no se guarde la ausencia.
 */
export const paginaSinPublicacion = (motivo: 'privada' | 'borrada', textos: TablaDeTextos = TEXTOS_ES): string => {
  const mensaje = motivo === 'borrada' ? textos.yaNoDisponible : textos.noDisponible;
  const cabeza = `<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Weë">
<meta property="og:title" content="Weë">
<meta property="og:description" content="${escapar(mensaje)}">`;
  const cuerpo = `
  <main class="vacio">
    <div class="marca">We<span>ë</span></div>
    <p>${escapar(mensaje)}</p>
    <a class="boton" href="/">${escapar(textos.explorar)}</a>
  </main>`;
  return documento('Weë', cabeza, cuerpo, textos);
};

/** El avatar: la foto de quien publica, o sus iniciales sobre dorado. */
const bloqueDeAvatar = (post: PublicacionPublica, textos: TablaDeTextos): string => {
  const autor = post.autor;
  const foto = direccionSegura(
    imagenDeAvatar(String((autor && (autor.photoURLThumbnail || autor.photoURL)) || ''), 96),
  );
  if (foto) return `<img class="avatar" src="${foto}" alt="" width="44" height="44">`;
  const inicial = nombreDelAutor(post, textos).trim().charAt(0).toUpperCase() || 'W';
  return `<div class="avatar" aria-hidden="true">${escapar(inicial)}</div>`;
};

/** Las imágenes y el vídeo. Nada se re-sube: son direcciones derivadas. */
const bloqueDeMedios = (post: PublicacionPublica, textos: TablaDeTextos): string => {
  if (post.videoUrl) {
    const video = direccionSegura(post.videoUrl);
    if (!video) return '';
    const portada = direccionSegura(miniaturaDeVideo(post.videoUrl, 800));
    const conPortada = portada ? ` poster="${portada}"` : '';
    return `
    <div class="medio"><video controls playsinline preload="metadata"${conPortada} src="${video}"></video></div>`;
  }
  const todas = (post.imageUrls && post.imageUrls.length
    ? post.imageUrls
    : (post.imageUrl ? [post.imageUrl] : [])
  ).slice(0, 4);
  if (!todas.length) return '';
  /*
   * LA PROPORCIÓN, CUANDO SE SABE. Sin ella el navegador no sabe cuánto mide la
   * imagen hasta que la baja, así que pinta la página sin hueco y luego la
   * empuja hacia abajo de golpe. Con una foto grande y una red lenta, quien
   * abrió el enlace estaba leyendo el texto cuando le salta debajo del dedo.
   * `imageAspectRatios` ya viene en la publicación: se usa y se acabó el salto.
   */
  const proporciones = post.imageAspectRatios || [];
  const enseñadas = todas
    .map((u, i) => ({ src: direccionSegura(imagenDelMuro(String(u || ''), 1000)), i }))
    .filter((x) => !!x.src)
    .map(({ src, i }) => {
      const forma = proporciones[i];
      const hueco = Number.isFinite(forma) && forma > 0
        ? ' style="aspect-ratio:' + Math.min(Math.max(forma, 0.25), 4).toFixed(4) + '"'
        : '';
      /* La primera es el contenido: se pide ya. Las demás, cuando hagan falta. */
      const cuando = i === 0 ? ' fetchpriority="high"' : ' loading="lazy"';
      return `
    <div class="medio"${hueco}><img src="${src}" alt=""${cuando}></div>`;
    })
    .join('');
  const total = post.imageUrls ? post.imageUrls.length : 1;
  const resto = total > 4
    ? `
    <p class="pie-medio">${escapar(rellenarTexto(textos.masEnWee, { contador: total - 4 }))}</p>`
    : '';
  return enseñadas + resto;
};

/** La encuesta, quieta: la pregunta y las opciones. Aquí no se vota. */
const bloqueDeEncuesta = (post: PublicacionPublica): string => {
  const encuesta = post.encuesta;
  if (!encuesta || !encuesta.options || !encuesta.options.length) return '';
  const opciones = encuesta.options
    .slice(0, 8)
    .map((o) => `
      <div class="opcion">${escapar((o && o.text) || '')}</div>`)
    .join('');
  const pregunta = encuesta.question
    ? `
    <h2>${escapar(encuesta.question)}</h2>`
    : '';
  return `
  <section class="encuesta">${pregunta}${opciones}
  </section>`;
};

/** "Hecho con": las herramientas de IA que declaró quien publica. */
const bloqueDeHerramientas = (post: PublicacionPublica, textos: TablaDeTextos): string => {
  const herramientas = (post.aiTools || []).filter((t) => !!t).slice(0, 6);
  if (!herramientas.length) return '';
  const chips = herramientas.map((t) => `<span class="chip">${escapar(t)}</span>`).join('');
  return `
  <div class="herramientas"><b>${escapar(textos.hechoCon)}</b>${chips}</div>`;
};

/**
 * La página de una publicación.
 *
 * Todo lo que se ve está ya en este HTML: quien abra el enlace lo lee sin
 * cuenta, sin registrarse y sin que se le pida nada. Y el rastreador que solo
 * mira la cabeza encuentra ahí el título, la descripción y la portada.
 */
export const paginaDeLaPublicacion = (post: PublicacionPublica, base = BASE_CANONICA, textos: TablaDeTextos = TEXTOS_ES): string => {
  const titulo = tituloDelEnlace(post, textos);
  const descripcion = descripcionDelEnlace(post, textos);
  const portada = direccionSegura(portadaDelEnlace(post)) || escapar(PORTADA_DE_RESERVA);
  const enlace = enlaceDeLaPublicacion(post.id, base);
  const video = post.videoUrl ? direccionSegura(post.videoUrl) : '';

  const cabeza = `<meta name="description" content="${escapar(descripcion)}">
<link rel="canonical" href="${escapar(enlace)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Weë">
<meta property="og:locale" content="${escapar(textos.locale)}">
<meta property="og:url" content="${escapar(enlace)}">
<meta property="og:title" content="${escapar(titulo)}">
<meta property="og:description" content="${escapar(descripcion)}">
<meta property="og:image" content="${portada}">
<meta property="og:image:alt" content="${escapar(titulo)}">${video ? `
<meta property="og:video" content="${video}">
<meta property="og:video:secure_url" content="${video}">
<meta property="og:video:type" content="video/mp4">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapar(titulo)}">
<meta name="twitter:description" content="${escapar(descripcion)}">
<meta name="twitter:image" content="${portada}">`;

  const autor = post.autor;
  const esPerfilWee = !!autor && autor.profileType === 'hidi';
  const reposteo = post.reposteadaPor
    ? `
    <div class="reposteo">${escapar(rellenarTexto(textos.reposteo, { nombre: post.reposteadaPor }))}</div>`
    : '';
  const comentarioDelRepost = post.repostComment
    ? `
    <div class="texto">${escapar(post.repostComment)}</div>`
    : '';
  const fecha = post.fecha
    ? `
        <div class="cuando">${escapar(post.fecha)}</div>`
    : '';
  const texto = post.content
    ? `
    <div class="texto">${escapar(post.content)}</div>`
    : '';

  const cuerpo = `
  <main>
    <article class="tarjeta">${reposteo}${comentarioDelRepost}
      <div class="cabecera">
        ${bloqueDeAvatar(post, textos)}
        <div class="quien">
          <div class="nombre">${escapar(nombreDelAutor(post, textos))}${esPerfilWee ? `<span class="insignia">${escapar(textos.perfilWee)}</span>` : ''}</div>${fecha}
        </div>
      </div>${texto}${bloqueDeMedios(post, textos)}${bloqueDeEncuesta(post)}${bloqueDeHerramientas(post, textos)}
    </article>

    <section class="llamada">
      <h2>${escapar(textos.estoEsWee)}</h2>
      <p>${escapar(textos.lema)}</p>
      <a class="boton" href="/">${escapar(textos.explorar)}</a>
    </section>
  </main>`;

  return documento(titulo, cabeza, cuerpo, textos);
};
