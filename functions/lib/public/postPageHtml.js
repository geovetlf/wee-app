"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginaDeLaPublicacion = exports.paginaSinPublicacion = exports.idDeLaRuta = exports.enlaceDeLaPublicacion = exports.baseDelSitio = exports.BASE_CANONICA = exports.descripcionDelEnlace = exports.tituloDelEnlace = exports.nombreDelAutor = exports.portadaDelEnlace = exports.PORTADA_DE_RESERVA = exports.miniaturaDeVideo = exports.imagenDeAvatar = exports.imagenDelMuro = exports.miniatura = exports.conTransformacion = exports.resumir = exports.direccionSegura = exports.escapar = void 0;
/* ── Escapar. Todo lo que venga de una persona pasa por aquí ────────────── */
/**
 * El texto de una publicación lo escribe cualquiera y aquí se mete dentro de
 * HTML. Sin esto, alguien podría publicar `<script>` y ejecutarlo en el
 * navegador de quien abra el enlace. No hay ninguna excepción: cada valor que
 * se interpola en la plantilla pasa por esta función.
 */
const escapar = (texto) => String(texto !== null && texto !== void 0 ? texto : '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
exports.escapar = escapar;
/** Lo mismo, para un atributo que además tiene que ser una dirección http(s). */
const direccionSegura = (url) => {
    const s = String(url !== null && url !== void 0 ? url : '').trim();
    return /^https:\/\/[^\s"'<>]+$/i.test(s) ? (0, exports.escapar)(s) : '';
};
exports.direccionSegura = direccionSegura;
/** Un resumen de una línea para la tarjeta del enlace. */
const resumir = (texto, tope = 200) => {
    const limpio = String(texto !== null && texto !== void 0 ? texto : '').replace(/\s+/g, ' ').trim();
    if (limpio.length <= tope)
        return limpio;
    return limpio.slice(0, tope - 1).trimEnd() + '…';
};
exports.resumir = resumir;
/* ── Cloudinary: las mismas transformaciones que la app ─────────────────── */
/** `cloudinaryUrl` del cliente: mete transformaciones tras /upload/. */
const conTransformacion = (url, transformaciones) => {
    if (!url)
        return url;
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/' + transformaciones + '/');
    }
    return url;
};
exports.conTransformacion = conTransformacion;
/** `cloudinaryThumb`. */
const miniatura = (url, ancho = 400) => (0, exports.conTransformacion)(url, 'c_fill,w_' + ancho + ',q_auto,f_auto');
exports.miniatura = miniatura;
/** `cloudinaryFeed`. */
const imagenDelMuro = (url, ancho = 800) => (0, exports.conTransformacion)(url, 'c_limit,w_' + ancho + ',q_auto,f_auto');
exports.imagenDelMuro = imagenDelMuro;
/** `cloudinaryAvatar`. */
const imagenDeAvatar = (url, lado = 96) => (0, exports.conTransformacion)(url, 'c_fill,w_' + lado + ',h_' + lado + ',g_face,q_auto,f_auto');
exports.imagenDeAvatar = imagenDeAvatar;
/**
 * `cloudinaryVideoThumb`: el primer fotograma como JPG.
 *
 * `f_jpg` manda sobre la extensión .mp4 de la dirección —comprobado contra
 * Cloudinary: devuelve 200 con Content-Type image/jpeg—, así que un vídeo da
 * una portada de verdad sin generar ni guardar nada nuevo.
 */
const miniaturaDeVideo = (url, ancho = 400) => {
    if (!url || !url.includes('cloudinary.com'))
        return url;
    return url.replace(/\/video\/upload\/[^/]*\//, '/video/upload/so_0,w_' + ancho + ',c_limit,f_jpg/');
};
exports.miniaturaDeVideo = miniaturaDeVideo;
/** El icono de Weë, cuando la publicación no trae ninguna imagen propia. */
exports.PORTADA_DE_RESERVA = 'https://wee.zone/img/icon.png';
/**
 * La portada del enlace. Un vídeo da su primer fotograma; una imagen, ella
 * misma a 1200 de ancho, que es el tamaño que esperan las tarjetas de enlace.
 */
const portadaDelEnlace = (post) => {
    if (post.videoUrl) {
        const dePrimerFotograma = (0, exports.miniaturaDeVideo)(post.videoUrl, 1200);
        /* Si el vídeo no es de Cloudinary no hay fotograma que sacar sin procesarlo. */
        if (dePrimerFotograma && dePrimerFotograma !== post.videoUrl)
            return dePrimerFotograma;
    }
    const primera = post.imageUrl || (post.imageUrls && post.imageUrls[0]);
    if (primera)
        return (0, exports.miniatura)(primera, 1200);
    return exports.PORTADA_DE_RESERVA;
};
exports.portadaDelEnlace = portadaDelEnlace;
/* ── El texto de la tarjeta del enlace ──────────────────────────────────── */
/** Cómo se llama quien publica, con el respaldo que ya usa la app. */
const nombreDelAutor = (post) => (post.autor && post.autor.displayName) || 'Alguien';
exports.nombreDelAutor = nombreDelAutor;
/** La línea en negrita de la tarjeta de WhatsApp. */
const tituloDelEnlace = (post) => (0, exports.nombreDelAutor)(post) + ' en Weë';
exports.tituloDelEnlace = tituloDelEnlace;
/**
 * La línea gris de debajo. Si no hay texto, se dice qué hay, porque una
 * descripción vacía deja la tarjeta a medias.
 */
const descripcionDelEnlace = (post) => {
    const texto = (0, exports.resumir)(post.content || post.repostComment || '');
    if (texto)
        return texto;
    if (post.isWeel)
        return 'Un Weël en Weë.';
    if (post.videoUrl)
        return 'Un video en Weë.';
    if (post.imageUrl || (post.imageUrls && post.imageUrls.length))
        return 'Una imagen en Weë.';
    if (post.encuesta)
        return 'Una encuesta en Weë.';
    return 'Una publicación en Weë.';
};
exports.descripcionDelEnlace = descripcionDelEnlace;
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
exports.BASE_CANONICA = 'https://wee.zone';
const BASES_CONOCIDAS = [
    'wee.zone',
    'www.wee.zone',
    'get-wee.web.app',
    'get-wee.firebaseapp.com',
];
const baseDelSitio = (host) => {
    const limpio = String(host !== null && host !== void 0 ? host : '').split(':')[0].trim().toLowerCase();
    return BASES_CONOCIDAS.indexOf(limpio) >= 0 ? 'https://' + limpio : exports.BASE_CANONICA;
};
exports.baseDelSitio = baseDelSitio;
/** La dirección pública de una publicación. La misma ruta que ya abre la app. */
const enlaceDeLaPublicacion = (postId, base = exports.BASE_CANONICA) => base + '/post/' + encodeURIComponent(postId);
exports.enlaceDeLaPublicacion = enlaceDeLaPublicacion;
/* ── El identificador que viene en la ruta ──────────────────────────────── */
/**
 * Saca el identificador de `/post/{id}`.
 *
 * Acepta también `/{id}` a secas, que es como llega cuando se invoca la función
 * por su propia dirección en vez de por el hosting. Y filtra: un identificador
 * de Firestore no lleva barras ni puntos, así que nada que no encaje llega a
 * tocar la base de datos.
 */
const idDeLaRuta = (ruta) => {
    const sinConsulta = String(ruta !== null && ruta !== void 0 ? ruta : '').split('?')[0].split('#')[0];
    const partes = sinConsulta.split('/').filter(Boolean);
    const ultimo = partes.length ? partes[partes.length - 1] : '';
    if (!ultimo || ultimo === 'post')
        return null;
    let candidato = ultimo;
    try {
        candidato = decodeURIComponent(ultimo);
    }
    catch (_a) {
        return null;
    }
    return /^[A-Za-z0-9_-]{1,200}$/.test(candidato) ? candidato : null;
};
exports.idDeLaRuta = idDeLaRuta;
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
const CABECERA_DEL_SITIO = `
  <header class="barra">
    <a class="marca" href="/">We<span>ë</span></a>
    <a class="abrir" href="/">Explorar Weë</a>
  </header>`;
const PIE_DEL_SITIO = `
  <footer class="pie">
    <a href="/privacy">Privacidad</a><a href="/terms">Términos</a><a href="/support">Ayuda</a>
  </footer>`;
/** El armazón común. `cabeza` son las etiquetas propias de cada página. */
const documento = (titulo, cabeza, cuerpo) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${(0, exports.escapar)(titulo)}</title>
<meta name="theme-color" content="#F5B731">
<link rel="icon" type="image/png" href="/img/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">
${cabeza}
<style>${ESTILOS}</style>
</head>
<body>
<div class="envoltura">${CABECERA_DEL_SITIO}
${cuerpo}${PIE_DEL_SITIO}
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
const paginaSinPublicacion = (motivo) => {
    const mensaje = motivo === 'borrada'
        ? 'Esta publicación ya no está disponible.'
        : 'Esta publicación no está disponible.';
    const cabeza = `<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Weë">
<meta property="og:title" content="Weë">
<meta property="og:description" content="${(0, exports.escapar)(mensaje)}">`;
    const cuerpo = `
  <main class="vacio">
    <div class="marca">We<span>ë</span></div>
    <p>${(0, exports.escapar)(mensaje)}</p>
    <a class="boton" href="/">Explorar Weë</a>
  </main>`;
    return documento('Weë', cabeza, cuerpo);
};
exports.paginaSinPublicacion = paginaSinPublicacion;
/** El avatar: la foto de quien publica, o sus iniciales sobre dorado. */
const bloqueDeAvatar = (post) => {
    const autor = post.autor;
    const foto = (0, exports.direccionSegura)((0, exports.imagenDeAvatar)(String((autor && (autor.photoURLThumbnail || autor.photoURL)) || ''), 96));
    if (foto)
        return `<img class="avatar" src="${foto}" alt="" width="44" height="44">`;
    const inicial = (0, exports.nombreDelAutor)(post).trim().charAt(0).toUpperCase() || 'W';
    return `<div class="avatar" aria-hidden="true">${(0, exports.escapar)(inicial)}</div>`;
};
/** Las imágenes y el vídeo. Nada se re-sube: son direcciones derivadas. */
const bloqueDeMedios = (post) => {
    if (post.videoUrl) {
        const video = (0, exports.direccionSegura)(post.videoUrl);
        if (!video)
            return '';
        const portada = (0, exports.direccionSegura)((0, exports.miniaturaDeVideo)(post.videoUrl, 800));
        const conPortada = portada ? ` poster="${portada}"` : '';
        return `
    <div class="medio"><video controls playsinline preload="metadata"${conPortada} src="${video}"></video></div>`;
    }
    const todas = (post.imageUrls && post.imageUrls.length
        ? post.imageUrls
        : (post.imageUrl ? [post.imageUrl] : [])).slice(0, 4);
    if (!todas.length)
        return '';
    /*
     * LA PROPORCIÓN, CUANDO SE SABE. Sin ella el navegador no sabe cuánto mide la
     * imagen hasta que la baja, así que pinta la página sin hueco y luego la
     * empuja hacia abajo de golpe. Con una foto grande y una red lenta, quien
     * abrió el enlace estaba leyendo el texto cuando le salta debajo del dedo.
     * `imageAspectRatios` ya viene en la publicación: se usa y se acabó el salto.
     */
    const proporciones = post.imageAspectRatios || [];
    const enseñadas = todas
        .map((u, i) => ({ src: (0, exports.direccionSegura)((0, exports.imagenDelMuro)(String(u || ''), 1000)), i }))
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
    <p class="pie-medio">y ${total - 4} más en Weë</p>`
        : '';
    return enseñadas + resto;
};
/** La encuesta, quieta: la pregunta y las opciones. Aquí no se vota. */
const bloqueDeEncuesta = (post) => {
    const encuesta = post.encuesta;
    if (!encuesta || !encuesta.options || !encuesta.options.length)
        return '';
    const opciones = encuesta.options
        .slice(0, 8)
        .map((o) => `
      <div class="opcion">${(0, exports.escapar)((o && o.text) || '')}</div>`)
        .join('');
    const pregunta = encuesta.question
        ? `
    <h2>${(0, exports.escapar)(encuesta.question)}</h2>`
        : '';
    return `
  <section class="encuesta">${pregunta}${opciones}
  </section>`;
};
/** "Hecho con": las herramientas de IA que declaró quien publica. */
const bloqueDeHerramientas = (post) => {
    const herramientas = (post.aiTools || []).filter((t) => !!t).slice(0, 6);
    if (!herramientas.length)
        return '';
    const chips = herramientas.map((t) => `<span class="chip">${(0, exports.escapar)(t)}</span>`).join('');
    return `
  <div class="herramientas"><b>Hecho con</b>${chips}</div>`;
};
/**
 * La página de una publicación.
 *
 * Todo lo que se ve está ya en este HTML: quien abra el enlace lo lee sin
 * cuenta, sin registrarse y sin que se le pida nada. Y el rastreador que solo
 * mira la cabeza encuentra ahí el título, la descripción y la portada.
 */
const paginaDeLaPublicacion = (post, base = exports.BASE_CANONICA) => {
    const titulo = (0, exports.tituloDelEnlace)(post);
    const descripcion = (0, exports.descripcionDelEnlace)(post);
    const portada = (0, exports.direccionSegura)((0, exports.portadaDelEnlace)(post)) || (0, exports.escapar)(exports.PORTADA_DE_RESERVA);
    const enlace = (0, exports.enlaceDeLaPublicacion)(post.id, base);
    const video = post.videoUrl ? (0, exports.direccionSegura)(post.videoUrl) : '';
    const cabeza = `<meta name="description" content="${(0, exports.escapar)(descripcion)}">
<link rel="canonical" href="${(0, exports.escapar)(enlace)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Weë">
<meta property="og:locale" content="es_ES">
<meta property="og:url" content="${(0, exports.escapar)(enlace)}">
<meta property="og:title" content="${(0, exports.escapar)(titulo)}">
<meta property="og:description" content="${(0, exports.escapar)(descripcion)}">
<meta property="og:image" content="${portada}">
<meta property="og:image:alt" content="${(0, exports.escapar)(titulo)}">${video ? `
<meta property="og:video" content="${video}">
<meta property="og:video:secure_url" content="${video}">
<meta property="og:video:type" content="video/mp4">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${(0, exports.escapar)(titulo)}">
<meta name="twitter:description" content="${(0, exports.escapar)(descripcion)}">
<meta name="twitter:image" content="${portada}">`;
    const autor = post.autor;
    const esPerfilWee = !!autor && autor.profileType === 'hidi';
    const reposteo = post.reposteadaPor
        ? `
    <div class="reposteo">${(0, exports.escapar)(post.reposteadaPor)} reposteó</div>`
        : '';
    const comentarioDelRepost = post.repostComment
        ? `
    <div class="texto">${(0, exports.escapar)(post.repostComment)}</div>`
        : '';
    const fecha = post.fecha
        ? `
        <div class="cuando">${(0, exports.escapar)(post.fecha)}</div>`
        : '';
    const texto = post.content
        ? `
    <div class="texto">${(0, exports.escapar)(post.content)}</div>`
        : '';
    const cuerpo = `
  <main>
    <article class="tarjeta">${reposteo}${comentarioDelRepost}
      <div class="cabecera">
        ${bloqueDeAvatar(post)}
        <div class="quien">
          <div class="nombre">${(0, exports.escapar)((0, exports.nombreDelAutor)(post))}${esPerfilWee ? '<span class="insignia">Perfil Weë</span>' : ''}</div>${fecha}
        </div>
      </div>${texto}${bloqueDeMedios(post)}${bloqueDeEncuesta(post)}${bloqueDeHerramientas(post)}
    </article>

    <section class="llamada">
      <h2>Esto es Weë</h2>
      <p>La red de quienes crean con Inteligencia Artificial. Descubre, aprende y comparte.</p>
      <a class="boton" href="/">Explorar Weë</a>
    </section>
  </main>`;
    return documento(titulo, cabeza, cuerpo);
};
exports.paginaDeLaPublicacion = paginaDeLaPublicacion;
//# sourceMappingURL=postPageHtml.js.map