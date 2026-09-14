/*
 * LA PÁGINA PÚBLICA DE UNA PUBLICACIÓN (paso 2 de compartir fuera de Weë).
 *
 * Lo que se comprueba aquí no es que el HTML "quede bonito": es que la tarjeta
 * del enlace EXISTA SIN JAVASCRIPT y que una publicación privada NO SALGA.
 *
 * Las dos cosas se prueban ejecutando el código de verdad, no mirándolo:
 *
 *  · postPageHtml.ts no importa nada, así que se transpila y se ejecuta tal cual;
 *  · postPage.ts sí importa Firestore, así que se le cambian los `import` por
 *    dobles de mentira y se llama al manejador entero con una base de datos en
 *    memoria. Así se puede pedir /post/{id} y mirar el estado y el HTML que
 *    salen, que es exactamente lo que verá WhatsApp.
 *
 * Y sobre el archivo hay dos comprobaciones estructurales que ejecutar no
 * alcanza: que la reescritura del hosting esté puesta SIN romper las otras
 * cuatro, y que la función esté exportada desde index.ts.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const aJs = (ruta) =>
  ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');

/* ── El módulo puro, tal cual ───────────────────────────────────────────── */
const urlDelHtml = comoModulo(aJs('functions/src/public/postPageHtml.ts'));
const html = await import(urlDelHtml);

/* ── El manejador, con Firestore de mentira ─────────────────────────────── */

/*
 * `onRequest` devuelve el manejador sin envolverlo, para poder llamarlo. Y
 * `getFirestore` devuelve la colección que le pase cada prueba: el doble se
 * cambia entre pruebas escribiendo en `baseDeDatos`.
 */
let baseDeDatos = { posts: {}, users: {} };
const dobleDeFirestore = comoModulo(`
export const getFirestore = () => ({
  collection: (nombre) => {
    const tabla = () => globalThis.__weeBaseDeDatos[nombre] || {};
    /* Consulta encadenable: where(...).limit(...).get(), como la de verdad. */
    const consulta = (filtros) => ({
      where: (campo, op, valor) => consulta(filtros.concat([[campo, op, valor]])),
      limit: (n) => consulta(filtros).conTope(n),
      conTope: (n) => Object.assign(consulta(filtros), { tope: n }),
      get: async function () {
        let docs = Object.entries(tabla())
          .filter(([, d]) => filtros.every(([c, op, v]) => op === '==' && d && d[c] === v))
          .map(([id, d]) => ({ id, data: () => d }));
        if (this.tope) docs = docs.slice(0, this.tope);
        return { empty: docs.length === 0, docs, size: docs.length };
      },
    });
    return {
      doc: (id) => ({
        get: async () => {
          const datos = tabla()[id];
          return { exists: !!datos, data: () => datos };
        },
      }),
      where: (campo, op, valor) => consulta([[campo, op, valor]]),
    };
  },
});
`);
const dobleDeFunciones = comoModulo(`export const onRequest = (opciones, manejador) => { manejador.opciones = opciones; return manejador; };`);

globalThis.__weeBaseDeDatos = baseDeDatos;

const jsDeLaFuncion = aJs('functions/src/public/postPage.ts')
  .replace(/from ['"]firebase-admin\/firestore['"]/, `from '${dobleDeFirestore}'`)
  .replace(/from ['"]firebase-functions\/v2\/https['"]/, `from '${dobleDeFunciones}'`)
  .replace(/from ['"]\.\/postPageHtml['"]/, `from '${urlDelHtml}'`);
const funcion = await import(comoModulo(jsDeLaFuncion));
const pagina = funcion.publicPostPage;

/** Una respuesta de Express de mentira, encadenable como la de verdad. */
const respuesta = () => {
  const r = {
    codigo: 200,
    cabeceras: {},
    cuerpo: '',
    status(c) { r.codigo = c; return r; },
    set(k, v) { r.cabeceras[String(k).toLowerCase()] = v; return r; },
    send(c) { r.cuerpo = String(c ?? ''); return r; },
  };
  return r;
};

/*
 * LA FORMA REAL DE `users`, QUE NO ES LA QUE PARECE.
 *
 * En Weë los perfiles se crean con `addDoc`, así que el identificador del
 * documento es uno autogenerado y el uid de la cuenta va DENTRO, en el campo
 * `uid`. Un `users/{uid}` no encuentra nada nunca.
 *
 * Las pruebas escriben `{ u1: AUTOR }` porque se lee mejor, y aquí se guarda
 * como está en producción. Es lo que hace que estas pruebas sirvan: con el
 * código viejo —que buscaba por el id del documento— el autor no aparecía, y
 * eso es exactamente lo que pasó en la primera página publicada.
 */
const comoEstaEnFirestore = (usuarios = {}) => {
  const tabla = {};
  Object.entries(usuarios).forEach(([uid, datos], i) => {
    tabla['xK7' + i + 'aQ2mZ0perfil'] = { uid, ...datos };
  });
  return tabla;
};

/** Pide /post/{id} y devuelve la respuesta ya completa. */
const pedir = async (ruta, datos, host = 'wee.zone', metodo = 'GET') => {
  globalThis.__weeBaseDeDatos = { posts: datos.posts || {}, users: comoEstaEnFirestore(datos.users) };
  const res = respuesta();
  await pagina({ method: metodo, path: ruta, headers: { host } }, res);
  return res;
};

/* Un usuario con basura privada dentro, a propósito: nada de esto puede salir. */
const AUTOR = {
  displayName: 'Lucía Reyes',
  photoURL: 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1/avatares/lucia.jpg',
  photoURLThumbnail: 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1/avatares/lucia_s.jpg',
  profileType: 'real',
  email: 'lucia@ejemplo.com',
  linkedAccountId: 'cuenta-enlazada-123',
  phoneNumber: '+51987654321',
  fcmToken: 'token-secreto-del-telefono',
};
const FECHA = { toDate: () => new Date('2026-09-13T12:00:00Z') };
const CON_IMAGEN = {
  userId: 'u1',
  content: 'Mi primera imagen hecha con Weë Design.',
  imageUrl: 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1/images/foto.jpg',
  isPrivate: false,
  createdAt: FECHA,
  aiTools: ['Weë Design'],
};
const CON_VIDEO = {
  userId: 'u1',
  content: 'Un Weël de 12 segundos.',
  videoUrl: 'https://res.cloudinary.com/dnrj1guvs/video/upload/c_limit,h_720,q_auto,f_mp4/v1/videos/clip.mp4',
  isWeel: true,
  isPrivate: false,
  createdAt: FECHA,
};

console.log('\n── A · Una publicación con imagen ──');
{
  const res = await pedir('/post/p1', { posts: { p1: CON_IMAGEN }, users: { u1: AUTOR } });
  check('1) responde 200 con HTML', res.codigo === 200
    && /text\/html/.test(res.cabeceras['content-type']), 'estado ' + res.codigo);

  /*
   * LO QUE VE WHATSAPP. Su rastreador no ejecuta JavaScript: si estas etiquetas
   * no vinieran en esta cadena, no habría tarjeta de ninguna clase.
   */
  const og = (p) => (res.cuerpo.match(new RegExp('<meta property="og:' + p + '" content="([^"]*)"')) || [])[1];
  check('2) og:title lleva a quien publica', og('title') === 'Lucía Reyes en Weë', og('title'));
  check('3) og:description lleva el texto', og('description') === 'Mi primera imagen hecha con Weë Design.', og('description'));
  check('4) og:url es la ruta canónica /post/, no /p/',
    og('url') === 'https://wee.zone/post/p1', og('url'));
  check('5) og:site_name y og:type', og('site_name') === 'Weë' && og('type') === 'article');
  /* La portada es una dirección DERIVADA de la que ya existe: no se sube nada. */
  check('6) og:image reutiliza la imagen que ya está en Cloudinary',
    og('image') === 'https://res.cloudinary.com/dnrj1guvs/image/upload/c_fill,w_1200,q_auto,f_auto/v1/images/foto.jpg',
    og('image'));
  check('7) y la etiqueta está en la CABEZA, antes de </head>',
    res.cuerpo.indexOf('og:image') < res.cuerpo.indexOf('</head>'));

  /*
   * LA PÁGINA NO LLEVA NI UNA LÍNEA DE JAVASCRIPT. No es un detalle de estilo:
   * es la garantía de que todo lo que hay que leer ya está en la respuesta,
   * tanto para el rastreador como para quien la abra en un móvil lento.
   */
  check('8) el documento entero no ejecuta JavaScript', !/<script/i.test(res.cuerpo));

  /* Y quien entre sin cuenta lee la publicación: no hay puerta de registro. */
  check('9) se lee de invitado: texto, autor y fecha en el HTML',
    res.cuerpo.includes('Mi primera imagen hecha con Weë Design.')
    && res.cuerpo.includes('Lucía Reyes')
    && res.cuerpo.includes('13 de septiembre de 2026'));
  check('10) sin muro de inicio de sesión',
    !/iniciar sesión|inicia sesión|registrarte|crear cuenta|contraseña/i.test(res.cuerpo));
  check('11) con su llamada a Weë', res.cuerpo.includes('Explorar Weë') && res.cuerpo.includes('Esto es Weë'));

  /* Del autor salen tres campos. Lo demás del documento de usuario, no. */
  check('12) no se filtra nada privado del autor',
    !res.cuerpo.includes('lucia@ejemplo.com')
    && !res.cuerpo.includes('cuenta-enlazada-123')
    && !res.cuerpo.includes('+51987654321')
    && !res.cuerpo.includes('token-secreto-del-telefono'));

  check('13) se puede guardar en caché para que el rastreador no la repita',
    /max-age=/.test(res.cabeceras['cache-control'] || ''), res.cabeceras['cache-control']);
}

console.log('\n── A bis · Quién publica sale con su nombre ──');
{
  /*
   * ESTO SE ESCAPÓ HASTA LA PRIMERA PÁGINA PUBLICADA.
   *
   * La búsqueda del autor era `users/{post.userId}`, y en Weë eso no encuentra
   * nada: los perfiles tienen id autogenerado y el uid está en un campo. Como
   * había un respaldo amable —"Alguien"— el fallo no se veía en ningún sitio
   * salvo mirando la página de verdad, que es donde salió.
   *
   * Las pruebas de antes no lo cazaron porque guardaban los usuarios bajo su
   * uid, que es cómodo pero no es como están. Ahora se guardan como están.
   */
  const res = await pedir('/post/p1', { posts: { p1: CON_IMAGEN }, users: { u1: AUTOR } });
  const og = (p) => (res.cuerpo.match(new RegExp('<meta property="og:' + p + '" content="([^"]*)"')) || [])[1];

  check('55) el autor se encuentra aunque su documento no se llame como su uid',
    og('title') === 'Lucía Reyes en Weë', og('title'));
  check('56) y su nombre sale en la página, no solo en la etiqueta',
    /<div class="nombre">Lucía Reyes/.test(res.cuerpo));
  /* El avatar es el suyo, con la transformación de siempre. */
  check('57) con su avatar, recortado como en la app',
    /<img class="avatar" src="https:\/\/res\.cloudinary\.com\/[^"]*c_fill,w_96,h_96,g_face,q_auto,f_auto[^"]*lucia_s\.jpg"/.test(res.cuerpo));

  /*
   * Y NO SE BUSCA POR EL ID DEL DOCUMENTO. Esto mira el código, no el
   * resultado: sin ello, alguien podría volver a `users/{uid}` y las pruebas
   * de arriba seguirían pasando el día que un uid coincidiera con un id.
   */
  const funcion = leer('functions/src/public/postPage.ts');
  check('58) se consulta por el campo uid, no por users/{uid}',
    /\.collection\('users'\)\s*\n?\s*\.where\('uid', '==', uid\)/.test(funcion)
    && !/collection\('users'\)\.doc\(/.test(funcion));

  /* Se mantiene el respaldo: si de ese uid no hay perfil, la página no se rompe. */
  const huerfana = await pedir('/post/p1', { posts: { p1: CON_IMAGEN }, users: {} });
  const ogH = (huerfana.cuerpo.match(/<meta property="og:title" content="([^"]*)"/) || [])[1];
  check('59) si no hay perfil, sigue el respaldo "Alguien en Weë"',
    huerfana.codigo === 200 && ogH === 'Alguien en Weë'
    && /<div class="avatar" aria-hidden="true">A<\/div>/.test(huerfana.cuerpo), ogH);

  /* Y en un repost salen los dos nombres, que también pasan por la consulta. */
  const repost = await pedir('/post/r9', {
    posts: {
      r9: { userId: 'u2', content: '', isPrivate: false, isRepost: true, originalPostId: 'p1', createdAt: FECHA },
      p1: CON_IMAGEN,
    },
    users: { u1: AUTOR, u2: { displayName: 'Marco Díaz' } },
  });
  check('60) en un repost se resuelven los dos perfiles',
    repost.cuerpo.includes('Marco Díaz reposteó') && repost.cuerpo.includes('Lucía Reyes'));
}

console.log('\n── B · Una publicación con vídeo ──');
{
  const res = await pedir('/post/p2', { posts: { p2: CON_VIDEO }, users: { u1: AUTOR } });
  const og = (p) => (res.cuerpo.match(new RegExp('<meta property="og:' + p + '" content="([^"]*)"')) || [])[1];

  /*
   * Un vídeo no tiene portada guardada en ningún sitio, y no se va a generar
   * una: se pide el primer fotograma a Cloudinary con `so_0` y `f_jpg`, que es
   * la misma transformación que ya usa la app en la fila de Weëls. Comprobado
   * contra Cloudinary: esa dirección devuelve 200 con Content-Type image/jpeg.
   */
  check('14) og:image es el primer fotograma del vídeo',
    og('image') === 'https://res.cloudinary.com/dnrj1guvs/video/upload/so_0,w_1200,c_limit,f_jpg/v1/videos/clip.mp4',
    og('image'));
  check('15) y no se guardó nada nuevo: es la misma dirección del vídeo, transformada',
    og('image').startsWith('https://res.cloudinary.com/dnrj1guvs/video/upload/')
    && og('image').includes('/v1/videos/clip.mp4'));
  check('16) og:video apunta al archivo real', og('video') === CON_VIDEO.videoUrl);
  check('17) el vídeo se puede ver ahí mismo, sin la app',
    /<video controls[^>]*src="https:\/\/res\.cloudinary\.com/.test(res.cuerpo));

  /* CONTROL: un vídeo que no esté en Cloudinary no puede inventarse un fotograma. */
  const ajeno = await pedir('/post/p3', {
    posts: { p3: { ...CON_VIDEO, videoUrl: 'https://ejemplo.com/clip.mp4' } },
    users: { u1: AUTOR },
  });
  const ogAjeno = (ajeno.cuerpo.match(/<meta property="og:image" content="([^"]*)"/) || [])[1];
  check('18) control: sin Cloudinary se cae al icono de Weë, no a un vídeo como portada',
    ogAjeno === 'https://wee.zone/img/icon.png', ogAjeno);
}

console.log('\n── C · Lo que NO se enseña ──');
{
  /* Borrada: en Weë borrar un post lo borra de verdad, así que no existe. */
  const nada = await pedir('/post/noexiste', { posts: {}, users: {} });
  check('19) una publicación borrada: 404 y "ya no está disponible"',
    nada.codigo === 404 && nada.cuerpo.includes('Esta publicación ya no está disponible.'),
    'estado ' + nada.codigo);

  /* Privada: existe, pero no sale. Ni el texto, ni el autor, ni la portada. */
  const privada = await pedir('/post/p9', {
    posts: { p9: { ...CON_IMAGEN, isPrivate: true } },
    users: { u1: AUTOR },
  });
  check('20) una publicación privada: 404 y "no está disponible"',
    privada.codigo === 404 && privada.cuerpo.includes('Esta publicación no está disponible.'),
    'estado ' + privada.codigo);
  check('21) y no se escapa NADA de ella: ni texto, ni autor, ni imagen',
    !privada.cuerpo.includes('Mi primera imagen')
    && !privada.cuerpo.includes('Lucía Reyes')
    && !privada.cuerpo.includes('images/foto.jpg'));
  check('22) las dos páginas ofrecen la salida y no se indexan',
    privada.cuerpo.includes('Explorar Weë')
    && nada.cuerpo.includes('Explorar Weë')
    && /<meta name="robots" content="noindex">/.test(privada.cuerpo)
    && /<meta name="robots" content="noindex">/.test(nada.cuerpo));

  /*
   * LA PUERTA DE ATRÁS. Un repost no guarda contenido: apunta al original. Si
   * solo se mirara el documento compartido, repostear una publicación privada
   * la publicaría al mundo. Se mira el original también.
   */
  const repostDePrivada = await pedir('/post/r1', {
    posts: {
      r1: { userId: 'u2', content: '', isPrivate: false, isRepost: true, originalPostId: 'p9', createdAt: FECHA },
      p9: { ...CON_IMAGEN, isPrivate: true },
    },
    users: { u1: AUTOR, u2: { displayName: 'Otro' } },
  });
  check('23) el repost de una privada tampoco la enseña',
    repostDePrivada.codigo === 404
    && repostDePrivada.cuerpo.includes('Esta publicación no está disponible.')
    && !repostDePrivada.cuerpo.includes('Mi primera imagen'),
    'estado ' + repostDePrivada.codigo);

  /* CONTROL: el mismo repost, con el original público, SÍ se enseña entero. */
  const repostBueno = await pedir('/post/r2', {
    posts: {
      r2: { userId: 'u2', content: '', isPrivate: false, isRepost: true, originalPostId: 'p1', repostComment: 'Miren esto', createdAt: FECHA },
      p1: CON_IMAGEN,
    },
    users: { u1: AUTOR, u2: { displayName: 'Otro' } },
  });
  check('24) control: el repost de una pública sí se enseña, con los dos nombres',
    repostBueno.codigo === 200
    && repostBueno.cuerpo.includes('Mi primera imagen')
    && repostBueno.cuerpo.includes('Otro reposteó')
    && repostBueno.cuerpo.includes('Miren esto')
    && repostBueno.cuerpo.includes('Lucía Reyes'),
    'estado ' + repostBueno.codigo);

  /* Y el original borrado detrás de un repost tampoco deja una página rota. */
  const repostHuerfano = await pedir('/post/r3', {
    posts: { r3: { userId: 'u2', isRepost: true, originalPostId: 'seFue', isPrivate: false, createdAt: FECHA } },
    users: { u2: { displayName: 'Otro' } },
  });
  check('25) si el original se borró, el repost dice "ya no está disponible"',
    repostHuerfano.codigo === 404
    && repostHuerfano.cuerpo.includes('Esta publicación ya no está disponible.'));
}

console.log('\n── C ter · Solo "declarada pública" se enseña ──');
{
  /*
   * EL CAMBIO DE SENTIDO DE LA PREGUNTA.
   *
   * Antes se preguntaba "¿es privada?" y se enseñaba todo lo demás. Eso obliga a
   * acertar la lista completa de lo que cuenta como privado, y cualquier hueco
   * de esa lista PUBLICA: un campo que falta, un `null` de una migración, la
   * cadena "false" de un formulario, un número de un script.
   *
   * Ahora se pregunta "¿está declarada pública?". El hueco ya no publica: calla.
   * Esta tabla es la lista de huecos, y ninguno puede pasar.
   */
  const casos = [
    ['ausente', {}],
    ['null', { isPrivate: null }],
    ['undefined explícito', { isPrivate: undefined }],
    ['la cadena "false"', { isPrivate: 'false' }],
    ['la cadena vacía', { isPrivate: '' }],
    ['el número 0', { isPrivate: 0 }],
    ['true', { isPrivate: true }],
  ];
  let todosCallan = true;
  const detalle = [];
  for (const [etiqueta, campo] of casos) {
    const { isPrivate, ...resto } = CON_IMAGEN;
    const res = await pedir('/post/px', {
      posts: { px: { ...resto, ...campo } },
      users: { u1: AUTOR },
    });
    const calla = res.codigo === 404
      && res.cuerpo.includes('Esta publicación no está disponible.')
      && /<meta name="robots" content="noindex">/.test(res.cuerpo)
      && !res.cuerpo.includes('Mi primera imagen')
      && !res.cuerpo.includes('Lucía Reyes');
    if (!calla) { todosCallan = false; detalle.push(etiqueta + '=' + res.codigo); }
  }
  check('44) ningún valor que no sea false llega a publicarse',
    todosCallan, detalle.join(' ') || casos.length + ' casos, todos 404 + noindex');

  /* CONTROL: y el único que sí pasa, pasa entero. Si esto fallara, la página
   * habría dejado de enseñar nada y la prueba de arriba sería una mentira. */
  const bueno = await pedir('/post/py', { posts: { py: CON_IMAGEN }, users: { u1: AUTOR } });
  check('45) control: isPrivate === false sigue siendo la que se enseña',
    bueno.codigo === 200 && bueno.cuerpo.includes('Mi primera imagen'), 'estado ' + bueno.codigo);

  /*
   * Y AL ORIGINAL DE UN REPOST SE LE EXIGE LO MISMO. Sin esto, un repost de una
   * publicación cuyo campo se hubiera perdido publicaría el original por la
   * puerta de atrás, que es justo el agujero que ya se cerró para `true`.
   */
  const { isPrivate, ...sinCampo } = CON_IMAGEN;
  const repostSinCampo = await pedir('/post/r4', {
    posts: {
      r4: { userId: 'u2', content: '', isPrivate: false, isRepost: true, originalPostId: 'p0', createdAt: FECHA },
      p0: sinCampo,
    },
    users: { u1: AUTOR, u2: { displayName: 'Otro' } },
  });
  check('46) el repost de un original SIN el campo tampoco lo enseña',
    repostSinCampo.codigo === 404
    && repostSinCampo.cuerpo.includes('Esta publicación no está disponible.')
    && !repostSinCampo.cuerpo.includes('Mi primera imagen'),
    'estado ' + repostSinCampo.codigo);
}

console.log('\n── C bis · La página no salta debajo del dedo ──');
{
  /*
   * Una imagen sin medidas declaradas se pinta con altura cero hasta que baja,
   * y entonces empuja todo lo de abajo de golpe. En un móvil eso es leer un
   * texto y que se te escape. La publicación ya trae `imageAspectRatios`, así
   * que el hueco se reserva antes de que llegue el primer byte de la foto.
   */
  const res = await pedir('/post/p5', {
    posts: {
      p5: {
        userId: 'u1',
        content: 'Dos fotos.',
        imageUrls: [
          'https://res.cloudinary.com/dnrj1guvs/image/upload/v1/images/a.jpg',
          'https://res.cloudinary.com/dnrj1guvs/image/upload/v1/images/b.jpg',
        ],
        imageAspectRatios: [1.5, 0.8],
        isPrivate: false,
        createdAt: FECHA,
      },
    },
    users: { u1: AUTOR },
  });
  check('41) cada imagen reserva su sitio con su propia proporción',
    res.cuerpo.includes('style="aspect-ratio:1.5000"')
    && res.cuerpo.includes('style="aspect-ratio:0.8000"'));
  /* La primera imagen es el contenido: se pide ya, no "cuando haga falta". */
  check('42) la primera se pide con prioridad y las demás perezosas',
    /aspect-ratio:1\.5000"><img [^>]*fetchpriority="high"/.test(res.cuerpo)
    && /aspect-ratio:0\.8000"><img [^>]*loading="lazy"/.test(res.cuerpo));

  /* CONTROL: sin proporciones no se inventa ninguna, y la página sigue bien. */
  const sinProporciones = await pedir('/post/p6', {
    posts: { p6: { ...CON_IMAGEN, imageAspectRatios: undefined } },
    users: { u1: AUTOR },
  });
  check('43) control: sin proporción no se inventa un hueco',
    sinProporciones.codigo === 200
    && !sinProporciones.cuerpo.includes('aspect-ratio:')
    && sinProporciones.cuerpo.includes('images/foto.jpg'));
}

console.log('\n── D · Lo que llega por la dirección ──');
{
  check('26) el identificador sale de /post/{id}', html.idDeLaRuta('/post/abc123') === 'abc123');
  check('27) y también cuando se llama a la función por su propia dirección',
    html.idDeLaRuta('/abc123') === 'abc123');
  check('28) /post a secas no es una publicación', html.idDeLaRuta('/post') === null);
  /* Nada con barras, puntos ni caracteres raros toca la base de datos. */
  check('29) no se puede salir de la colección con un identificador tramposo',
    html.idDeLaRuta('/post/..%2F..%2Fusers%2Fu1') === null
    && html.idDeLaRuta('/post/a.b') === null
    && html.idDeLaRuta('/post/') === null);

  /* La dirección del sitio no la decide quien llama: hay lista cerrada. */
  check('30) og:url solo puede colgar de un dominio de Weë',
    html.baseDelSitio('wee.zone') === 'https://wee.zone'
    && html.baseDelSitio('get-wee.web.app') === 'https://get-wee.web.app'
    && html.baseDelSitio('evil.example.com') === 'https://wee.zone'
    && html.baseDelSitio(undefined) === 'https://wee.zone');

  const otroMetodo = await pedir('/post/p1', { posts: { p1: CON_IMAGEN }, users: {} }, 'wee.zone', 'POST');
  check('31) una página se lee, no se escribe: POST devuelve 405', otroMetodo.codigo === 405);
}

console.log('\n── E · El texto lo escribe cualquiera ──');
{
  const res = await pedir('/post/p4', {
    posts: {
      p4: {
        ...CON_IMAGEN,
        content: '<script>alert(1)</script> "comillas" & <img src=x onerror=alert(2)>',
      },
    },
    users: { u1: { displayName: '<b>Nombre</b>"raro"' } },
  });
  /*
   * Esto es lo que separa una página servida de un agujero: el texto de una
   * publicación va DENTRO del HTML, así que si no se escapa, quien publique
   * puede ejecutar código en el navegador de quien abra el enlace.
   */
  check('32) el texto de la publicación no puede ejecutar nada',
    !/<script/i.test(res.cuerpo)
    && !res.cuerpo.includes('<img src=x onerror=alert(2)>'));
  /*
   * Ojo con lo que esto NO dice: la cadena  sí sigue en la página,
   * porque escapar solo toca < > & " '. Y da igual: sin sus signos de menor y
   * mayor no es un atributo de nada, es texto que se lee. Lo que importa es que
   * el navegador no pueda verlo como una etiqueta, y eso es lo que se comprueba.
   */
  check('33) el nombre tampoco', !res.cuerpo.includes('<b>Nombre</b>'));
  check('34) pero el texto sigue leyéndose, escapado',
    res.cuerpo.includes('&lt;script&gt;alert(1)&lt;/script&gt;')
    && res.cuerpo.includes('&amp;'));
  /* Y la descripción de la tarjeta tampoco puede romper su propio atributo. */
  const desc = (res.cuerpo.match(/<meta property="og:description" content="([^"]*)"/) || [])[1];
  check('35) og:description no rompe las comillas del atributo',
    !!desc && !desc.includes('"') && desc.includes('&quot;comillas&quot;'), desc);

  /* CONTROL: una dirección que no sea https no llega a la página. */
  check('36) control: solo entran direcciones https',
    html.direccionSegura('https://res.cloudinary.com/a.jpg') === 'https://res.cloudinary.com/a.jpg'
    && html.direccionSegura('javascript:alert(1)') === ''
    && html.direccionSegura('http://res.cloudinary.com/a.jpg') === '');
}

console.log('\n── F · Enchufada donde tiene que estar ──');
{
  const config = JSON.parse(leer('firebase.json'));
  /*
   * `hosting` pasó a ser una LISTA cuando la app web se publicó en su propio
   * sitio: `get-wee` sirve la landing y /post/{postId}, `wee-app` sirve la
   * aplicación. Lo que vigila este bloque es el primero, que es donde vive la
   * página pública; el otro no tiene nada que ver con ella.
   */
  const sitios = Array.isArray(config.hosting) ? config.hosting : [config.hosting];
  const principal = sitios.find((h) => h.site === 'get-wee' || h.public === 'public');
  check('37b) el sitio de la página pública sigue sirviendo public/',
    !!principal && principal.public === 'public');
  const rutas = principal.rewrites.map((r) => r.source);
  /* Las cuatro de antes siguen ahí, en su orden, y la nueva va detrás. */
  check('37) las cuatro reescrituras del hosting siguen intactas',
    rutas[0] === '/' && rutas[1] === '/privacy' && rutas[2] === '/terms' && rutas[3] === '/support',
    rutas.join(' '));
  const nueva = principal.rewrites.find((r) => r.source === '/post/**');
  check('38) y /post/** va a la función, en su región',
    !!nueva && nueva.function.functionId === 'publicPostPage' && nueva.function.region === 'us-central1');
  check('39) la función está exportada desde index.ts',
    /export \{ publicPostPage \} from '\.\/public\/postPage';/.test(leer('functions/src/index.ts')));

  /*
   * LA OTRA MITAD DE LA MISMA CORRECCIÓN, EN LA BASE DE DATOS.
   *
   * La página exige que el campo diga `false`; las reglas exigen que el campo
   * EXISTA y sea booleano. Sin lo segundo, lo primero es una cortesía: nada
   * impedía guardar un post sin `isPrivate` desde un script o desde otro
   * cliente, porque el único guardián era TypeScript y TypeScript no llega a
   * Firestore.
   */
  const reglas = leer('firestore.rules');
  check('47) las reglas exigen que isPrivate sea booleano',
    /function visibilidadDeclarada\(\) \{\s*\n\s*return request\.resource\.data\.isPrivate is bool;/.test(reglas));
  /* En CREATE y en UPDATE: proteger solo el alta deja abierta la puerta de la
   * edición, que podría borrar el campo o cambiarle el tipo después. */
  const bloqueDePosts = reglas.slice(reglas.indexOf('match /posts/{postId}'), reglas.indexOf('allow delete: if isAuthenticated() && ownsPost();'));
  check('48) y lo exigen tanto al crear como al actualizar',
    /allow create: if isAuthenticated\(\) && visibilidadDeclarada\(\)/.test(bloqueDePosts)
    && /allow update: if isAuthenticated\(\) && !touchesPoll\(\) && visibilidadDeclarada\(\)/.test(bloqueDePosts));
  /* CONTROL: no se exige que valga false. Las privadas llegarán y tienen que
   * poder guardarse; lo que no se admite es no decir cuál de las dos es. */
  check('49) control: no se obliga a que sea false, solo a que sea booleano',
    !/isPrivate == false/.test(bloqueDePosts) && !/isPrivate != true/.test(bloqueDePosts));
  /* CONTROL: y no se tocó a quién se le permite escribir. */
  check('50) control: las condiciones de autoría siguen intactas',
    /request\.resource\.data\.userId == request\.auth\.uid/.test(bloqueDePosts)
    && /ownsBizProfile\(request\.resource\.data\.userId\)/.test(bloqueDePosts)
    && /hasOnly\(\['views', 'agreementCount'/.test(bloqueDePosts)
    && /allow read: if true;/.test(bloqueDePosts));

  /*
   * Las reglas EJECUTADAS viven aparte, como las de ËContact: necesitan el
   * emulador y Java, y el runner no los tiene. Aquí solo se comprueba que la
   * prueba existe, que explica cómo lanzarse y que NO está en `npm test`.
   */
  check('51) existe la prueba de reglas que se ejecuta en el emulador',
    leer('functions/test/posts-rules.emulator.mjs').includes('isPrivate'));
  check('52) y NO está en el runner, porque necesita emulador',
    !leer('functions/package.json').includes('posts-rules.emulator'));
  check('53) su cabecera explica cómo lanzarla',
    /firebase emulators:exec/.test(leer('functions/test/posts-rules.emulator.mjs')));

  /*
   * LA APP Y LA PÁGINA NO SE MEZCLAN.
   *
   * La app comparte el enlace y la página lo sirve; son los dos extremos de la
   * misma cuerda y ninguno importa código del otro. En concreto: PostCard no
   * escribe "wee.zone" a mano —el enlace sale del flujo común, que a su vez lo
   * pide a config/linking— y nada de functions/src/public entra en la app.
   */
  const publicacion = leer('components/PostCard.tsx');
  /* Sin comentarios: el nombre del dominio sí puede explicarse, no escribirse. */
  const codigoDeLaPublicacion = publicacion.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  check('54) control: la app pide el enlace al flujo común, no lo escribe',
    /import \{ compartirFueraDeWee \} from '\.\.\/utils\/compartirFuera';/.test(publicacion)
    && !/wee\.zone/.test(codigoDeLaPublicacion)
    && !/postPageHtml|functions\/src\/public/.test(publicacion));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
