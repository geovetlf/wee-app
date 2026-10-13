/*
 * LOS DATOS DEL MODO DEMO — puros y deterministas. Sin Firebase, sin red, sin reloj propio.
 *
 * Diez creadores ficticios, veinte publicaciones del Wall, catorce Weëls, comentarios, likes, acuerdos y seguimientos
 * entre ellos, para probar la parte social de Weë con una cuenta recién creada CONTRA LOS EMULADORES (docs/WEE-DEMO.md).
 *
 * Reglas que esta lista cumple y que `functions/test/demo-aislamiento.test.mjs` vigila:
 *  · todo id empieza por `demo_` y todo documento lleva `demo: true` y `procedenciaDemo: 'wee-demo-r9'`;
 *  · los creadores llevan uid con prefijo (`demo_creador_NN`) y su nombre termina en « (demo)»; su bio empieza por
 *    «Perfil de demostración.»; su avatar es uno PREDEFINIDO de la app (components/avatars/AvatarSVGs.tsx);
 *  · los medios NO se suben a ningún almacenamiento: se nombran por su archivo y la URL sale de `--base-medios`, un
 *    servidor de desarrollo local de solo lectura que monta quien siembra. Si falta un archivo, el elemento no existe
 *    (nunca una imagen haciéndose pasar por vídeo);
 *  · las fechas son relativas al momento de sembrar (`ahoraMs`), repartidas en los últimos 10 días.
 *
 * Los textos de las publicaciones son CONTENIDO (lo que escribiría una persona), no interfaz: no pasan por i18n.
 */

export const PROCEDENCIA_DEMO = 'wee-demo-r9';
export const PREFIJO_DEMO = 'demo_';
export const MARCA_DEMO = Object.freeze({ demo: true, procedenciaDemo: PROCEDENCIA_DEMO });

/** Los avatares predefinidos que pinta la app (components/avatars/AvatarSVGs.tsx → predefinedAvatars). */
export const AVATARES_PREDEFINIDOS = ['male', 'female', 'masked', 'robot', 'ninja', 'cat'];

/** Las colecciones donde escribe el sembrador, y las únicas que `--retirar` mira. */
export const COLECCIONES_DEMO = ['users', 'posts', 'comments', 'likes', 'votes', 'follows'];

const HORA = 3600 * 1000;
const DOS = (n) => String(n).padStart(2, '0');

export const CREADORES = [
  { n: 1, nombre: 'Lucía Prado', usuario: 'lucia_prado', avatar: 'female', bio: 'Hago cortos con Weë Studio.' },
  { n: 2, nombre: 'Marco Ibáñez', usuario: 'marco_ibanez', avatar: 'male', bio: 'Diseño interiores y producto.' },
  { n: 3, nombre: 'Sofía Quispe', usuario: 'sofia_quispe', avatar: 'cat', bio: 'Cocina casera y recetas rápidas.' },
  { n: 4, nombre: 'Kenji Arakawa', usuario: 'kenji_arakawa', avatar: 'ninja', bio: 'Viajo despacio y lo cuento.' },
  { n: 5, nombre: 'Valeria Soto', usuario: 'valeria_soto', avatar: 'masked', bio: 'Arte digital y collage.' },
  { n: 6, nombre: 'Tomás Rivas', usuario: 'tomas_rivas', avatar: 'robot', bio: 'Tecnología explicada sin humo.' },
  { n: 7, nombre: 'Ana Ferrer', usuario: 'ana_ferrer', avatar: 'female', bio: 'Música y visuales.' },
  { n: 8, nombre: 'Diego Paredes', usuario: 'diego_paredes', avatar: 'male', bio: 'Naturaleza y fotografía.' },
  { n: 9, nombre: 'Elena Costa', usuario: 'elena_costa', avatar: 'cat', bio: 'Moda, color y temporada.' },
  { n: 10, nombre: 'Iván Molina', usuario: 'ivan_molina', avatar: 'robot', bio: 'Ciudades de noche.' },
].map((c) => ({
  id: `demo_creador_${DOS(c.n)}`,
  nombre: `${c.nombre} (demo)`,
  usuario: `${c.usuario}_demo`,
  avatar: c.avatar,
  bio: `Perfil de demostración. ${c.bio}`,
}));

const creador = (n) => `demo_creador_${DOS(n)}`;

/*
 * Veinte publicaciones del Wall. `imagen` nombra un archivo de los medios generados; `seccion` es el contexto de Weë
 * (`sourceSection`), solo donde una sección de verdad encaja; las demás temáticas van en `tags`.
 */
export const PUBLICACIONES = [
  { autor: 1, horas: 3, seccion: 'studio', imagen: 'img-06.png', texto: 'Storyboard de mi próximo corto: seis planos, todo pensado antes de generar nada.', tags: ['cine', 'storyboard'],
    aiTools: ['Weë Studio'], aiPrompt: 'Storyboard de seis viñetas, estilo boceto a lápiz, una chica esperando un tren al amanecer', aiProcess: 'Primero escribí la historia en tres frases y luego pedí una viñeta por frase.' },
  { autor: 2, horas: 7, seccion: 'design', imagen: 'img-01.png', texto: 'Cocina minimalista: madera clara, encimera blanca y una sola planta. Menos es más.', tags: ['interiores'],
    aiTools: ['Weë Design'], aiPrompt: 'Cocina minimalista nórdica, luz de mañana, madera clara', aiProcess: 'Partí de una foto de mi cocina real y pedí tres variantes.' },
  { autor: 3, horas: 11, seccion: 'chef', imagen: 'img-02.png', texto: 'Ensalada de verano en diez minutos: sandía, feta, menta y lima.', tags: ['recetas', 'verano'],
    aiTools: ['Weë Chef'], aiProcess: 'Le dije lo que tenía en la nevera y me propuso esta combinación.' },
  { autor: 4, horas: 16, seccion: 'travel', imagen: 'img-03.png', texto: 'Una calle con encanto a primera hora, antes de que abran las tiendas.', tags: ['viajes'] },
  { autor: 5, horas: 22, imagen: 'img-04.png', texto: 'Retrato abstracto: formas planas y una paleta de tres colores.', tags: ['arte'],
    aiTools: ['Weë Design'], aiPrompt: 'Retrato abstracto, formas geométricas planas, paleta terracota, azul y crema' },
  { autor: 6, horas: 28, imagen: 'img-05.png', texto: 'Un robot amable para explicar a mis alumnos qué es un modelo de lenguaje.', tags: ['tecnologia', 'educacion'] },
  { autor: 8, horas: 35, imagen: 'img-07.png', texto: 'Lago al amanecer. La niebla duró cinco minutos.', tags: ['naturaleza'] },
  { autor: 9, horas: 41, imagen: 'img-08.png', texto: 'Look urbano de entretiempo: capas finas y un solo color fuerte.', tags: ['moda'] },
  { autor: 2, horas: 50, seccion: 'design', imagen: 'img-09.png', texto: 'Propuesta de logo para una cafetería de barrio. ¿Cuál os gusta más?', tags: ['branding'],
    aiTools: ['Weë Design'], aiPrompt: 'Logo para cafetería de barrio, trazo a mano, taza humeante, tonos cálidos', aiProcess: 'Pedí cuatro versiones y me quedé con la más sencilla.' },
  { autor: 10, horas: 58, imagen: 'img-10.png', texto: 'Skyline al caer la tarde. La ciudad se enciende por barrios.', tags: ['ciudad'] },
  { autor: 3, horas: 66, seccion: 'chef', imagen: 'img-11.png', texto: 'Pan casero sin amasar: harina, agua, sal y paciencia.', tags: ['recetas', 'pan'],
    aiTools: ['Weë Chef'], aiProcess: 'Weë Chef me ajustó los tiempos a la temperatura de mi cocina.' },
  { autor: 5, horas: 75, imagen: 'img-12.png', texto: 'Collage hecho con recortes de revistas viejas y una capa de color digital.', tags: ['arte', 'collage'] },
  { autor: 1, horas: 84, seccion: 'studio', texto: '¿Qué preferís para un corto de un minuto: voz en off o solo música?', tags: ['cine'],
    poll: { pregunta: '¿Voz en off o solo música?', opciones: [['voz', 'Voz en off', 7], ['musica', 'Solo música', 11], ['ambas', 'Las dos', 4]], diasAbierta: 7 } },
  { autor: 4, horas: 96, seccion: 'travel', texto: 'Consejo de viaje que nadie me dio: comprad el transporte en el aeropuerto, no en la ciudad.', tags: ['viajes', 'consejos'] },
  { autor: 6, horas: 108, texto: 'Pregunta seria: ¿cómo explicáis la IA a vuestros padres?', tags: ['tecnologia', 'pregunta'],
    poll: { pregunta: '¿Cómo lo explicas?', opciones: [['ejemplo', 'Con un ejemplo práctico', 9], ['analogia', 'Con una analogía', 6], ['nolo', 'No lo explico', 3]], diasAbierta: 5 } },
  { autor: 7, horas: 120, texto: 'Primera prueba de visuales sincronizados con una base rítmica. Aún falta pulir el final.', tags: ['musica'] },
  { autor: 8, horas: 140, texto: 'Tutorial rápido: cómo pido a Weë una descripción de una foto de paisaje sin que suene a postal.', tags: ['tutorial', 'naturaleza'],
    aiTools: ['Weë Writer'], aiPrompt: 'Describe esta foto de paisaje en dos frases, sin adjetivos grandilocuentes', aiProcess: 'Le pedí que evitara las palabras «impresionante» y «mágico».' },
  { autor: 9, horas: 165, texto: '¿Qué paleta os gusta para el otoño?', tags: ['moda'],
    poll: { pregunta: 'Paleta de otoño', opciones: [['tierra', 'Tierra y mostaza', 12], ['verde', 'Verde oliva', 8], ['vino', 'Burdeos', 10]], diasAbierta: 9 } },
  { autor: 10, horas: 190, texto: 'Paseo nocturno sin rumbo. A veces la mejor ruta es la que no se planea.', tags: ['ciudad'] },
  { autor: 7, horas: 225, texto: 'Mi rutina para crear: diez minutos de idea, veinte de prueba y nada de perfeccionismo.', tags: ['creatividad'] },
].map((p, i) => ({ ...p, id: `demo_post_${DOS(i + 1)}` }));

/* Catorce Weëls, uno por vídeo generado (medios.json). */
const SECCION_DE_WEEL = { 'Weë Studio': 'studio', 'Weë Design': 'design', 'Weë Chef': 'chef', Viajes: 'travel' };
export const WEELS = [
  { archivo: 'weel-01.webm', tema: 'Weë Studio', autor: 1, horas: 5, texto: 'Plano de cine en seis segundos.' },
  { archivo: 'weel-02.webm', tema: 'Weë Design', autor: 2, horas: 13, texto: 'Salón luminoso, de la idea al render.' },
  { archivo: 'weel-03.webm', tema: 'Weë Chef', autor: 3, horas: 20, texto: 'Pasta en 15 minutos.' },
  { archivo: 'weel-04.webm', tema: 'Viajes', autor: 4, horas: 30, texto: 'Atardecer en la costa.' },
  { archivo: 'weel-05.webm', tema: 'Arte', autor: 5, horas: 44, texto: 'Trazos de color.' },
  { archivo: 'weel-06.webm', tema: 'Tecnología', autor: 6, horas: 55, texto: 'Circuito vivo.' },
  { archivo: 'weel-07.webm', tema: 'Música', autor: 7, horas: 70, texto: 'Ritmo visual.' },
  { archivo: 'weel-08.webm', tema: 'Naturaleza', autor: 8, horas: 88, texto: 'Bosque en calma.' },
  { archivo: 'weel-09.webm', tema: 'Ciudad', autor: 10, horas: 100, texto: 'Luces de noche.' },
  { archivo: 'weel-10.webm', tema: 'Moda', autor: 9, horas: 118, texto: 'Paleta de temporada.' },
  { archivo: 'weel-11.webm', tema: 'Weë Studio', autor: 1, horas: 150, texto: 'Transición suave entre dos escenas.' },
  { archivo: 'weel-12.webm', tema: 'Weë Design', autor: 2, horas: 170, texto: 'Producto 360.' },
  { archivo: 'weel-13.webm', tema: 'Weë Chef', autor: 3, horas: 200, texto: 'Postre fácil.' },
  { archivo: 'weel-14.webm', tema: 'Viajes', autor: 4, horas: 232, texto: 'Ruta de montaña.' },
].map((w, i) => ({ ...w, id: `demo_weel_${DOS(i + 1)}`, seccion: SECCION_DE_WEEL[w.tema] }));

const FRASES_DE_COMENTARIO = [
  '¡Qué buena idea! Me lo guardo.',
  'Me encanta el resultado, ¿cuánto tardaste?',
  'Lo voy a probar este fin de semana.',
  'La luz está muy conseguida.',
  'Gracias por compartir el proceso.',
  '¿Qué cambiarías si lo hicieras otra vez?',
];

/* Los medios y la base: una URL de un servidor de desarrollo local, nunca un almacenamiento. */
const IP_PRIVADA = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./];

/**
 * ¿Es `base` un servidor de desarrollo local? http(s), sin credenciales, sin query, a localhost o a una IP privada.
 * @returns {{ ok: true, base: string } | { ok: false, motivo: string }}
 */
export const validarBaseMedios = (base) => {
  if (typeof base !== 'string' || !base.trim()) return { ok: false, motivo: 'falta --base-medios (p. ej. http://192.168.0.39:8096/demo)' };
  let u;
  try { u = new URL(base.trim()); } catch { return { ok: false, motivo: `«${base}» no es una URL` }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, motivo: 'la base de medios tiene que ser http(s)' };
  if (u.username || u.password) return { ok: false, motivo: 'la base de medios no lleva credenciales' };
  if (u.search || u.hash) return { ok: false, motivo: 'la base de medios no lleva query ni fragmento' };
  const h = u.hostname.replace(/^\[|\]$/g, '');
  const local = h === 'localhost' || h === '::1' || IP_PRIVADA.some((r) => r.test(h));
  if (!local) return { ok: false, motivo: `«${h}» no es localhost ni una IP privada: los medios demo solo se sirven en la red local` };
  return { ok: true, base: u.href.replace(/\/+$/, '') };
};

const urlDeMedio = (base, archivo) => `${base}/${encodeURIComponent(archivo)}`;
const medioDemo = (archivo) => ({ archivo, origen: 'generado-local', servidor: 'desarrollo' });

/** Un generador congruencial con semilla fija: el mismo reparto en cada siembra. */
const aleatorio = (semilla) => {
  let s = semilla >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
};

/**
 * TODOS LOS DOCUMENTOS DEMO — pura.
 *
 * @param {{ ahoraMs: number, baseMedios: string, mediosDisponibles: Iterable<string>, sello?: (ms: number) => unknown }} p
 * @returns {{ documentos: { coleccion: string, id: string, datos: object }[], omitidos: { id: string, archivo: string }[] }}
 */
export const construirDocumentos = ({ ahoraMs, baseMedios, mediosDisponibles, sello = (ms) => ms }) => {
  if (!Number.isFinite(ahoraMs)) throw new Error('ahoraMs');
  const base = validarBaseMedios(baseMedios);
  if (!base.ok) throw new Error(base.motivo);
  const hay = new Set(mediosDisponibles);
  const hace = (horas) => sello(ahoraMs - horas * HORA);
  const documentos = [];
  const omitidos = [];
  const poner = (coleccion, id, datos) => documentos.push({ coleccion, id, datos: { ...datos, ...MARCA_DEMO } });

  /* Publicaciones y Weëls: primero se decide cuáles existen (si falta su medio, no existe). */
  const publicaciones = [];
  for (const p of PUBLICACIONES) {
    if (p.imagen && !hay.has(p.imagen)) { omitidos.push({ id: p.id, archivo: p.imagen }); continue; }
    publicaciones.push({ ...p, kind: 'post' });
  }
  for (const w of WEELS) {
    if (!hay.has(w.archivo)) { omitidos.push({ id: w.id, archivo: w.archivo }); continue; }
    publicaciones.push({ ...w, kind: 'weel' });
  }

  /* Comentarios, likes y acuerdos: de otros creadores, con reparto fijo. */
  const azar = aleatorio(20261012);
  const interacciones = new Map();
  let nComentario = 0;
  for (const p of publicaciones) {
    const otros = CREADORES.map((c) => c.id).filter((id) => id !== creador(p.autor));
    const cuantosLikes = 2 + Math.floor(azar() * 6); // 2..7
    const cuantosComentarios = Math.floor(azar() * 4); // 0..3
    const desplazamiento = Math.floor(azar() * otros.length);
    const quien = (k) => otros[(desplazamiento + k) % otros.length];
    const likes = Array.from({ length: cuantosLikes }, (_, k) => quien(k));
    const comentarios = Array.from({ length: cuantosComentarios }, (_, k) => {
      nComentario++;
      return {
        id: `demo_comentario_${String(nComentario).padStart(3, '0')}`,
        autor: quien(k + 3),
        texto: FRASES_DE_COMENTARIO[(nComentario + k) % FRASES_DE_COMENTARIO.length],
        horas: Math.max(0.5, p.horas - (k + 1) * 0.75),
      };
    });
    interacciones.set(p.id, { likes, comentarios });
  }

  /* Seguimientos: cada creador sigue a los tres siguientes. */
  const follows = [];
  for (let i = 0; i < CREADORES.length; i++) {
    for (let k = 1; k <= 3; k++) follows.push([CREADORES[i].id, CREADORES[(i + k) % CREADORES.length].id]);
  }

  for (const c of CREADORES) {
    poner('users', c.id, {
      uid: c.id,
      displayName: c.nombre,
      username: c.usuario,
      bio: c.bio,
      avatarType: 'predefined',
      avatarId: c.avatar,
      profileType: 'real',
      followers: follows.filter(([, b]) => b === c.id).length,
      following: follows.filter(([a]) => a === c.id).length,
      posts: publicaciones.filter((p) => creador(p.autor) === c.id).length,
      joinedCommunities: [],
      createdAt: hace(24 * 30),
      updatedAt: hace(24 * 30),
    });
  }

  for (const p of publicaciones) {
    const { likes, comentarios } = interacciones.get(p.id);
    const archivo = p.kind === 'weel' ? p.archivo : p.imagen;
    const datos = {
      userId: creador(p.autor),
      content: p.texto,
      ...(p.kind === 'post' && p.imagen
        ? { imageUrls: [urlDeMedio(base.base, p.imagen)], imageUrlsThumbnails: [urlDeMedio(base.base, p.imagen)], imageAspectRatios: [720 / 1280] }
        : { imageUrls: [], imageUrlsThumbnails: [] }),
      ...(p.kind === 'weel' ? { videoUrl: urlDeMedio(base.base, p.archivo), isWeel: true } : {}),
      ...(archivo ? { medioDemo: medioDemo(archivo) } : {}),
      ...(p.seccion ? { sourceSection: p.seccion } : {}),
      ...(p.aiTools ? { aiTools: p.aiTools } : {}),
      ...(p.aiPrompt ? { aiPrompt: p.aiPrompt } : {}),
      ...(p.aiProcess ? { aiProcess: p.aiProcess } : {}),
      tags: p.tags || [],
      hashtags: [],
      likes: likes.length,
      agreementCount: likes.length,
      disagreementCount: 0,
      comments: comentarios.length,
      shares: 0,
      reposts: 0,
      views: 10 + likes.length * 7,
      isPrivate: false,
      createdAt: hace(p.horas),
      updatedAt: hace(p.horas),
    };
    if (p.poll) {
      const counts = Object.fromEntries(p.poll.opciones.map(([id, , v]) => [id, v]));
      datos.poll = {
        question: p.poll.pregunta,
        options: p.poll.opciones.map(([id, text]) => ({ id, text })),
        counts,
        totalVotes: Object.values(counts).reduce((a, b) => a + b, 0),
        endsAt: sello(ahoraMs + p.poll.diasAbierta * 24 * HORA),
        allowChange: true,
      };
    }
    poner('posts', p.id, datos);
    for (const uid of likes) {
      const id = `${uid}_${p.id}`;
      poner('likes', id, { userId: uid, postId: p.id, createdAt: hace(Math.max(0.25, p.horas - 1)) });
      poner('votes', id, { userId: uid, postId: p.id, type: 'agree', createdAt: hace(Math.max(0.25, p.horas - 1)) });
    }
    for (const c of comentarios) {
      poner('comments', c.id, {
        postId: p.id, userId: c.autor, content: c.texto, likes: 0, agreementCount: 0, disagreementCount: 0, createdAt: hace(c.horas),
      });
    }
  }

  for (const [a, b] of follows) poner('follows', `${a}_${b}`, { followerId: a, followingId: b, createdAt: hace(24 * 20) });

  return { documentos, omitidos };
};

/** Recuentos por tipo, para el resumen del sembrador y las pruebas. */
export const recontar = (documentos) => {
  const r = { creadores: 0, publicaciones: 0, weels: 0, encuestas: 0, comentarios: 0, likes: 0, acuerdos: 0, seguimientos: 0, total: documentos.length };
  for (const d of documentos) {
    if (d.coleccion === 'users') r.creadores++;
    else if (d.coleccion === 'posts') {
      if (d.datos.isWeel) r.weels++; else r.publicaciones++;
      if (d.datos.poll) r.encuestas++;
    } else if (d.coleccion === 'comments') r.comentarios++;
    else if (d.coleccion === 'likes') r.likes++;
    else if (d.coleccion === 'votes') r.acuerdos++;
    else if (d.coleccion === 'follows') r.seguimientos++;
  }
  return r;
};

/**
 * QUÉ BORRA `--retirar` — pura. Solo lo que lleva la procedencia del modo demo; un documento sin ella se queda,
 * aunque su id empiece por `demo_`.
 * @param {{ coleccion: string, id: string, datos: object }[]} encontrados
 */
export const seleccionarParaRetirar = (encontrados) =>
  (encontrados || []).filter((d) => COLECCIONES_DEMO.includes(d.coleccion) && d.datos && d.datos.procedenciaDemo === PROCEDENCIA_DEMO);

/**
 * CONFLICTOS antes de sembrar — pura. Un documento que ya ocupa un id demo SIN la marca no es nuestro: no se pisa.
 * @param {{ coleccion: string, id: string, datos: object | null }[]} existentes  lo que hay en los ids que se van a escribir
 */
export const conflictosDeSiembra = (existentes) =>
  (existentes || []).filter((d) => d.datos && d.datos.procedenciaDemo !== PROCEDENCIA_DEMO);
