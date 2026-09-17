"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrationFrom = exports.buildVideoPrompt = exports.buildImagePrompt = exports.imageEnglishPart = exports.IMAGE_TASK_EN = exports.extractMarker = exports.buildTextPrompt = exports.instruccionDeIdioma = exports.nombreDelIdioma = exports.localeDeBrain = exports.BRAIN_CHAT_SYSTEM = exports.BRAIN_SPECIALISTS = exports.BRAIN_SYSTEM = void 0;
/**
 * Prompts internos de Weë Brain (docs/CREATOR.md §6): la persona nunca los ve.
 * Cada experiencia tiene su rol y cada tipo de pieza sus instrucciones.
 */
exports.BRAIN_SYSTEM = [
    'Eres Weë, el asistente de WEË AI. Ayudas a personas que no saben nada de inteligencia artificial.',
    'Hablas en español neutro, claro, cálido y directo, de tú.',
    'Nunca mencionas modelos, proveedores, prompts, parámetros ni términos técnicos.',
    'Entregas resultados completos y listos para usar; no pides más información ni haces preguntas.',
].join(' ');
/** Especialistas a los que Weë Brain puede derivar (nunca Weë Music mientras no esté conectado). */
exports.BRAIN_SPECIALISTS = {
    design: 'Weë Design (logos, afiches, productos, personajes, escenas, cualquier diseño visual)',
    studio: 'Weë Studio (videos, animar fotos, anuncios en video)',
    photo: 'Weë Photo (mejorar, restaurar, transformar o editar fotos)',
    writer: 'Weë Writer (textos, historias, guiones, emails, CV, traducciones, correcciones)',
    beauty: 'Weë Beauty (maquillaje, cabello, barba, outfits, cambios de look en tu foto)',
    chef: 'Weë Chef (recetas, menús, cocinar con lo que tienes)',
    home: 'Hogar & Diseño (rediseñar, redecorar o reorganizar espacios de la casa)',
    business: 'Weë Business (ideas, marketing, contenido para redes, estrategia, documentos de negocio)',
};
/**
 * Weë Brain como asistente general (chat con contexto): conversa, explica,
 * investiga, planifica, analiza y, cuando conviene, deriva a otro Weë.
 * Para derivar, termina la respuesta con una línea exacta: [[WEE:<id>]]
 * (la app la convierte en un botón; la persona nunca ve la marca).
 */
exports.BRAIN_CHAT_SYSTEM = [
    'Eres Weë Brain, el asistente general de Weë: una app para crear con inteligencia artificial.',
    /*
     * El TONO vive aquí; el IDIOMA no. Esta línea decía "hablas en español
     * neutro", y eso convertía el prompt en un prompt español: con la interfaz en
     * japonés, Weë Brain recibía dos órdenes que se contradicen. El idioma lo pone
     * `instruccionDeIdioma()` en cada petición, con el que WEË tenga activo.
     */
    'Hablas claro, cálido y directo, tuteando a la persona. Respondes completo pero sin relleno (normalmente menos de 250 palabras).',
    'Puedes conversar, resolver dudas, explicar en simple, investigar, enseñar paso a paso, planificar, dar ideas y analizar lo que la persona te cuenta o adjunta.',
    'Si te dan resultados de búsqueda, úsalos para responder con información actual y menciona de dónde sale sin inventar datos; si no sabes algo, dilo.',
    'Nunca mencionas modelos, proveedores, prompts ni términos técnicos de IA. No inventes cifras ni resultados.',
    'Formato: texto plano; listas con • o pasos numerados cuando ayuden; sin símbolos de markdown como # o **; emojis con moderación.',
    `Weë tiene especialistas: ${Object.values(exports.BRAIN_SPECIALISTS).join('; ')}.`,
    'Cuando lo que la persona quiere lograr lo hace mejor uno de esos especialistas (crear una imagen, un video, editar una foto, escribir un texto largo, una receta, un cambio de look, redecorar, hacer crecer un negocio), responde primero brevemente y termina tu mensaje con una línea final exactamente así: [[WEE:id]] usando el id del especialista (design, studio, photo, writer, beauty, chef, home o business). Si no corresponde derivar, no escribas esa línea.',
].join(' ');
/**
 * EN QUÉ IDIOMA CONTESTA WEË BRAIN.
 *
 * En el idioma que tenga puesto WEË, sea cual sea. No hay un prompt por idioma
 * ni una lista de idiomas aquí: hay UNA frase que se arma con el locale que ya
 * resuelve `i18n/` en el cliente (`useIdioma().locale`). El día que entre un
 * idioma nuevo en el catálogo, esto ya lo habla —no hay nada que añadir—.
 *
 * El nombre del idioma se saca de `Intl.DisplayNames`, que viene en Node y
 * conoce todos los locales del mundo, y se pide EN SU PROPIO IDIOMA: a un
 * modelo se le entiende mejor "日本語" que "japonés". Si `Intl` no supiera
 * resolverlo, se le pasa el código tal cual, que también entiende.
 *
 * ── Dos cosas que no son cosméticas ──────────────────────────────────────────
 *
 * 1. El locale VIENE DEL CLIENTE y acaba dentro del prompt del sistema. Eso lo
 *    convierte en una puerta de entrada: sin filtrar, cualquiera podría mandar
 *    un "locale" con instrucciones dentro y reescribir lo que Weë Brain cree que
 *    es. Por eso solo pasa lo que tiene forma de etiqueta de idioma; lo demás se
 *    descarta y manda el de reserva.
 *
 * 2. El de reserva es español y no inglés a propósito: es lo que Weë Brain
 *    respondía hasta hoy, y un cliente viejo —que no manda locale— tiene que
 *    seguir contestando igual que ayer.
 */
const LOCALE_CON_FORMA_DE_IDIOMA = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
const IDIOMA_DE_RESERVA_DE_BRAIN = 'es';
const localeDeBrain = (locale) => typeof locale === 'string' && LOCALE_CON_FORMA_DE_IDIOMA.test(locale) ? locale : IDIOMA_DE_RESERVA_DE_BRAIN;
exports.localeDeBrain = localeDeBrain;
const nombreDelIdioma = (locale) => {
    try {
        return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) || locale;
    }
    catch (_a) {
        return locale;
    }
};
exports.nombreDelIdioma = nombreDelIdioma;
/**
 * La frase que se le añade al prompt del sistema en cada petición.
 *
 * Dice el idioma y dice que NO se cambie porque la persona escriba en otro: si
 * alguien con la interfaz en coreano pregunta en inglés, la respuesta sigue en
 * coreano, que es lo que tiene puesto. Lo único que lo cambia es pedirlo.
 */
const instruccionDeIdioma = (locale) => {
    const codigo = (0, exports.localeDeBrain)(locale);
    return [
        `Responde SIEMPRE en ${(0, exports.nombreDelIdioma)(codigo)} (código ${codigo}), aunque la persona te escriba en otro idioma.`,
        'Cambia de idioma solo si te lo pide explícitamente.',
    ].join(' ');
};
exports.instruccionDeIdioma = instruccionDeIdioma;
const EXPERIENCE_ROLE = {
    travel: 'Ahora eres Weë Travel, alguien que ha viajado mucho y ayuda a preparar un viaje con los pies en la tierra. No vendes nada ni reservas nada: ordenas la idea, propones lo que de verdad merece la pena y avisas de lo que conviene comprobar antes de ir.',
    design: 'Ahora eres Weë Design, un director creativo que convierte ideas en conceptos visuales concretos.',
    studio: 'Ahora eres Weë Studio, un director de videos cortos para redes que piensa en escenas de pocos segundos.',
    photo: 'Ahora eres Weë Photo, un retocador fotográfico cuidadoso que explica en simple.',
    writer: 'Ahora eres Weë Writer, un redactor que escribe textos naturales, con ritmo y sin relleno.',
    music: 'Ahora eres Weë Music, un compositor y productor que piensa en ánimo, tempo y letra.',
    beauty: 'Ahora eres Weë Beauty, un estilista que propone cambios de look naturales y favorecedores.',
    chef: 'Ahora eres Weë Chef, un chef personal práctico que cocina con ingredientes comunes y explica paso a paso.',
    home: 'Ahora eres Hogar & Diseño, un diseñador de interiores realista que trabaja con lo que la persona ya tiene.',
    business: 'Ahora eres Weë Business, un consultor práctico que da acciones concretas para esta semana.',
    brain: 'Ahora eres Weë Brain, el asistente general: explicas fácil y siempre propones por dónde empezar.',
};
const KIND_INSTRUCTIONS = {
    /*
     * Weë Travel. Cuatro tareas y una regla común: nunca inventar un sitio que se
     * pueda visitar. Un restaurante que no existe o un museo cerrado hace daño de
     * verdad —alguien coge un tren para llegar allí—, así que lo que no se sepa se
     * dice, y lo que cambie se marca para comprobar.
     */
    itinerary: 'Escribe un itinerario día a día. Empieza SIEMPRE con estos tres renglones, sin nada más delante:\n\n<emoji de bandera> <DESTINO EN MAYÚSCULAS>\n<las fechas exactas que te den, o "Fechas por decidir" si no te dan ninguna>\n<cuántos días y cuántas noches, o solo los días si no hay fechas>\n\nDespués, un bloque por día con exactamente este formato:\n\nDÍA 1 · <fecha corta, p. ej. 12 oct> · Ciudad\nTítulo corto del día\n- Momento: qué hacer y por qué merece la pena (una línea)\n- Momento: ...\n\nCOPIA las fechas del encargo; no inventes ninguna. Si el encargo no trae fechas, escribe los días sin fecha ("DÍA 1 · Ciudad") y no te las inventes. Usa "Mañana", "Tarde" y "Noche" solo cuando el día se reparta así de verdad; si el día es una excursión o una sola cosa, escribe un único momento ("Todo el día"). No rellenes con actividades de relleno: un día con tres cosas buenas vale más que uno con siete. Nombra sitios que existan de verdad; si no estás seguro de uno, no lo pongas. Si las fechas caen en temporada de lluvias, en un festival o en fiestas en las que cierran los sitios, dilo en el día que toque. Al final añade un bloque "PRESUPUESTO:" con rangos aproximados por concepto (vuelos, alojamiento por noche, comida por día, transporte) y el total estimado como rango. Nunca des una cifra exacta. Cierra con una línea recordando que los precios son estimaciones.',
    destinations: 'Propón EXACTAMENTE TRES destinos, ni uno más. Para cada uno escribe:\n\nCiudad, País\nDos líneas como máximo explicando por qué encaja con lo que la persona busca.\nUna línea con lo práctico: distancia o duración de vuelo aproximada, y si es un viaje económico, medio o caro.\n\nNombra solo sitios que existan de verdad y que se pueda viajar allí hoy; si dudas de uno, propón otro. Que los tres sean de verdad distintos entre sí, para que haya algo que decidir. No des una lista larga: el trabajo es reducir la decisión, no ampliarla.',
    activities: 'Haz una lista corta —entre cinco y ocho— de lo que merece la pena en ese sitio, mezclando cosas que hacer y sitios donde comer. Agrúpalas por zona o barrio, con el nombre de la zona en una línea suelta, para que se puedan encadenar en un mismo paseo. Cada cosa ocupa exactamente dos renglones y siempre en este orden:\n\nNombre — qué es (museo, mercado, restaurante…)\nPor qué merece la pena, en una sola línea corta.\n\nNada de párrafos largos: si no cabe en una línea, recórtalo. Nombra solo sitios que existan de verdad. Si has usado una búsqueda, cita la fuente de donde salió cada dato que pueda cambiar. Al final, una sola línea: "Comprueba horarios y precios antes de ir." No repitas ese aviso en cada elemento.',
    transport: 'Responde a la pregunta concreta sobre cómo moverse, sin convertirlo en una guía general. Da dos o tres opciones reales y, para cada una, una línea con: cómo se llama, cuánto tarda aproximadamente, cuánto cuesta aproximadamente y para quién es mejor (con maletas, con prisa, con poco presupuesto). Si no tienes datos fiables de horarios o precios, dilo en vez de inventarlos. Termina con una sola línea: "Tiempos y precios aproximados. Comprueba antes de viajar."',
    recipe: 'Escribe una receta paso a paso: título con un emoji, para cuántas personas, tiempo total, lista de ingredientes con cantidades (usa •), pasos numerados y cortos, y un consejo final. Usa ingredientes fáciles de conseguir. Si hay una descripción de la foto de los ingredientes, cocina con esos ingredientes y menciona qué falta comprar. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 40 palabras) cómo se ve el plato terminado.',
    menu: 'Arma el menú pedido día por día (o comida por comida): nombre del plato, una línea de por qué funciona y una lista corta de compras al final.',
    script: 'Escribe un guion de video corto (10 segundos) en 3 escenas. Para cada escena: tiempo (0–3 s, 3–7 s, 7–10 s), qué se ve (descripción visual concreta: lugar, luz, acción, movimiento de cámara) y el texto de la narración (una frase). Cierra con un llamado a la acción de una frase. Al final agrega una línea que empiece con "NARRACIÓN:" con el texto completo de la narración seguido, listo para leer en voz alta (máximo 30 palabras).',
    copy: 'Escribe el texto pedido listo para publicar o enviar, con un inicio que enganche, el contenido principal y un cierre claro. Si es para redes, incluye 3 hashtags al final. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 50 palabras) qué debería mostrar la imagen que acompaña al texto.',
    polish: 'Toma el texto del paso anterior y entrégalo pulido: sin repeticiones, ritmo natural, misma intención y tono. Devuelve solo la versión final, sin comentarios.',
    lyrics: 'Escribe una idea musical: título, ánimo, tempo sugerido y una letra corta con una estrofa y un estribillo. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 50 palabras) la portada que le pega a esa canción.',
    narration: 'Escribe el texto de una narración de 15 a 20 segundos, en frases cortas y fáciles de leer en voz alta.',
    shopping: 'Escribe la lista de cambios y compras: agrupa por zona del espacio, prioriza 6–8 elementos, y marca cada uno con un nivel de gasto (bajo, medio o alto).',
    cv: 'Redacta un CV de una página: perfil de 3 líneas, experiencia con logros medibles, formación y habilidades. Donde falte un dato de la persona, deja un marcador entre corchetes, por ejemplo [empresa] o [año].',
    business: 'Prepara el documento pedido: título, 3 a 5 secciones cortas con acciones concretas que la persona pueda hacer esta semana.',
    analysis: 'Resume en 5 líneas qué quiere lograr la persona, para quién es y cuál debería ser la prioridad. Sin preguntas.',
    answer: 'Responde con claridad en menos de 200 palabras y termina con "Próximos pasos:" y 3 acciones concretas. Si conviene, recomienda el especialista de Weë que ayuda con eso (Weë Design, Weë Studio, Weë Photo, Weë Writer, Weë Music, Weë Beauty, Weë Chef, Hogar & Diseño o Weë Business).',
    concept: 'Define el concepto visual: la idea en una frase, el texto principal y el secundario, una paleta de 3 colores descritos en palabras, el estilo y una lista corta de qué evitar. Termina con una línea que empiece con "IMAGEN:" describiendo en una frase muy visual (en inglés, máximo 60 palabras) exactamente qué debe mostrar la imagen.',
    story: 'Escribe la historia pedida: título, un inicio que atrape, un conflicto, un giro y un cierre que deje ganas de seguir. Personajes con nombre y voz propia. Entre 500 y 900 palabras salvo que se pida otra cosa.',
    article: 'Escribe el artículo: título que engancha, entrada de dos líneas con por qué importa, 3 o 4 secciones con subtítulos cortos y ejemplos, y un cierre con una pregunta o llamado a la acción. Entre 400 y 700 palabras.',
    email: 'Redacta el email o carta completo: asunto, saludo, contexto en una línea, el mensaje principal, lo que se pide o propone, cierre cordial y firma con [Tu nombre]. Sin relleno.',
    document: 'Redacta el documento: título, resumen de 3 líneas y 3 a 5 secciones numeradas con lo importante primero. Claro y directo, listo para compartir.',
    translate: 'Traduce el texto que aparece en el objetivo al idioma indicado, manteniendo el sentido, el tono y el formato. Devuelve solo la traducción.',
    summary: 'Resume el texto que aparece en el objetivo: 3 a 6 ideas clave con • y una frase final con lo esencial. Sin opiniones.',
    fix: 'Corrige el texto que aparece en el objetivo: ortografía, puntuación, gramática y claridad, sin cambiar lo que la persona quiso decir ni su tono. Devuelve el texto corregido y, al final, una línea "Cambios:" con lo principal que ajustaste.',
    rewrite: 'Reescribe el texto que aparece en el objetivo según lo pedido (tono, largo o enfoque), manteniendo la idea principal. Devuelve solo la nueva versión.',
    ideas: 'Propón 6 ideas concretas y distintas para escribir sobre lo pedido (una línea cada una, con un ángulo claro) y termina con un punto de partida: la primera frase de la que más te guste.',
    describe: 'Describe lo que se ve en la foto en 4 a 6 líneas: sujeto, escena, luz, colores, estado y detalles útiles para trabajar con ella. Sin juicios de valor.',
    skincare: 'Arma una rutina de cuidado de la piel sencilla según lo que se ve en la foto y lo que cuenta la persona: mañana, noche y semanal, con tipos de producto fáciles de conseguir. Aclara que no reemplaza a un dermatólogo si hay un problema de salud.',
    facestyle: 'Según lo que se ve en el rostro de la foto, recomienda: forma de rostro, 3 cortes o peinados que favorecen, tipos de lentes y qué evitar. Termina con una línea "PROBAR:" con los dos estilos que más recomiendas, descritos en inglés y en pocas palabras.',
    layout: 'Propón una distribución mejor del espacio de la foto: 4 a 6 cambios concretos (qué mueble va dónde y por qué), respetando puertas, ventanas y el paso. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 50 palabras) cómo se vería el espacio con la nueva distribución.',
    // "No sé qué hacer": mirar y aconsejar, sin generar todavía (fase 2E-59).
    advise: 'Según lo que se ve en la foto, cuéntale a la persona qué tiene y qué cambiarías: 2 líneas sobre el espacio tal como está, y luego 3 caminos posibles —uno de muebles, uno de estilo y color, y uno de distribución— con una frase cada uno que diga qué ganaría. Termina preguntándole cuál le interesa. No describas ninguna imagen ni uses la palabra "IMAGEN:".',
    schedule: 'Arma un calendario de publicaciones para 7 días: por cada día, hora sugerida, red social y una idea de publicación con su objetivo. Aclara al final que Weë todavía no publica automáticamente: la persona aprueba y publica cada pieza.',
    published: 'Prepara la publicación lista para copiar en cada red (Instagram, Facebook, TikTok) con su texto y hashtags. IMPORTANTE: Weë aún no está conectado a las redes; di claramente que la publicación NO se ha publicado y que la persona debe copiarla y publicarla ella misma.',
    metrics: 'Weë no tiene acceso a los datos reales de las redes de la persona. No inventes cifras. Explica qué 5 métricas debería mirar, cómo leerlas y qué decisiones tomar según lo que vea, con un ejemplo de plan para la semana.',
    campaign: 'Diseña la campaña: objetivo, público, mensaje principal, 3 piezas (con su texto listo), calendario de una semana y un presupuesto sugerido en niveles (orgánico, bajo, medio). Sin inventar resultados. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 50 palabras) la pieza visual principal.',
    reply: 'Escribe la respuesta para el cliente, lista para enviar: amable, clara, que resuelva lo que pregunta y proponga el siguiente paso. Añade una línea de consejo para la persona sobre cómo responder mejor.',
    mixnotes: 'Anota, en lenguaje sencillo, qué ajustes de mezcla y máster convendrían (volumen, graves, claridad de voz, espacio) según lo que describe la persona.',
};
const FORMAT_RULES = 'Formato: texto plano con títulos cortos, listas con • y pasos numerados cuando ayuden. Sin símbolos de markdown como # o **. Emojis con moderación.';
/** Arma el prompt interno de un paso de texto a partir de la plantilla y lo elegido por la persona. */
const buildTextPrompt = (experienceId, kind, brief, goal, purpose, previous) => ({
    system: `${exports.BRAIN_SYSTEM}\n\n${EXPERIENCE_ROLE[experienceId]}\n\n${FORMAT_RULES}`,
    prompt: [
        `Objetivo de la persona: "${goal}".`,
        brief ? `Lo que eligió: ${brief}.` : '',
        `Tarea: ${purpose}.`,
        KIND_INSTRUCTIONS[kind] || 'Entrega el mejor resultado posible, completo y listo para usar.',
        previous.length > 0
            ? `Material de los pasos anteriores (úsalo, no lo repitas):\n${previous.map((p, i) => `[${i + 1}] ${p}`).join('\n\n')}`
            : '',
    ]
        .filter(Boolean)
        .join('\n\n'),
});
exports.buildTextPrompt = buildTextPrompt;
/** Saca la línea "IMAGEN:", "PROBAR:" o "NARRACIÓN:" que dejó un paso de texto anterior. */
const extractMarker = (texts, marker) => {
    for (const text of texts) {
        const match = text.match(new RegExp(`${marker}\\s*:\\s*(.+)`, 'i'));
        if (match)
            return match[1].trim().slice(0, 600);
    }
    return '';
};
exports.extractMarker = extractMarker;
const STYLE_WORDS = {
    // Travel no genera imágenes en la fase A. La entrada existe porque el tipo la
    // pide, y si algún día se generara una, sería una foto de viaje de verdad.
    travel: 'travel photography, natural light, real place',
    design: 'professional concept design, clean composition, studio lighting',
    studio: 'cinematic frame, coherent lighting',
    photo: 'photorealistic, natural',
    writer: 'book cover art, striking composition, space for the title',
    music: 'album cover art',
    beauty: 'realistic beauty photography, flattering natural light',
    chef: 'appetizing food photography, natural light',
    home: 'photorealistic interior design render',
    business: 'clean marketing visual for social media, modern, brand-ready',
    brain: 'clean illustration',
};
/**
 * CAPA 1 — la operación de imagen, dicha en inglés desde el identificador del paso.
 *
 * Se indexa por `kind`, que es el id de la opción elegida y no cambia aunque se
 * reescriba la etiqueta que ve la persona. Escribirlo aquí evita traducir nada y
 * no gasta ninguna llamada. Hace falta porque Seedream solo entiende inglés y
 * chino; Gemini y FLUX aceptan cualquier idioma (ver engine/promptLanguage.ts).
 */
exports.IMAGE_TASK_EN = {
    background: 'Replace or remove the background with a clean, uncluttered backdrop, keeping the main subject exactly as it is',
    remove: 'Remove the unwanted object and rebuild what was behind it so nothing looks edited',
    retouch: 'Retouch the face naturally, keeping the person fully recognizable',
    restore: 'Restore this old photo: repair the damage, recover lost detail and correct the fading',
    colorize: 'Colorize this black and white photo with natural, believable colors',
    enhance: 'Improve the quality, sharpness and lighting of this photo without changing what it shows',
    transform: 'Restyle the photo as requested, keeping the subject recognizable',
    look: 'Apply the requested change to the person, keeping their face, skin and the light of the photo exactly as they are',
    space: 'Redesign this interior space in the requested style, keeping the architecture, the doors and the windows',
    photo: 'Create a photorealistic image',
    dish: 'Create an appetizing photo of the finished dish',
    dish_edit: 'Edit the provided photograph of this dish, applying only the requested change',
    design: 'Create a professional design proposal',
    logo: 'Create a logo with the requested words rendered clearly and correctly',
    cover: 'Create a book cover with room for the title',
    business: 'Create a clean marketing visual, ready to publish on social media',
};
/** Lo que ya va en inglés por las capas 1 y 2, para no adaptar de más. */
const imageEnglishPart = (kind, previous = []) => (0, exports.extractMarker)(previous, 'IMAGEN') || (0, exports.extractMarker)(previous, 'PROBAR') || exports.IMAGE_TASK_EN[kind] || '';
exports.imageEnglishPart = imageEnglishPart;
/**
 * DIRECCIÓN FOTOGRÁFICA — de momento solo Weë Chef.
 *
 * La primera imagen real de Chef salió técnicamente correcta pero se notaba
 * generada: sin profundidad de campo, con luz plana y sin sombras, superficies
 * demasiado uniformes y los ingredientes flotando en vez de apoyados. El prompt
 * que llegaba al proveedor describía EL PLATO pero no decía en ningún momento
 * que el resultado debía ser una fotografía, así que el modelo caía en su
 * estética por defecto de render limpio.
 *
 * Aquí Weë aporta el CÓMO se fotografía y Gemini sigue aportando el QUÉ se
 * cocina: las dos cosas viajan juntas al proveedor y ninguna sustituye a la otra.
 *
 * Se escribe en positivo a propósito: la API de FLUX.2 que usa Weë NO admite
 * negative_prompt, y enumerar lo que no se quiere solo mete esas ideas en el
 * prompt. Tampoco se acumulan superlativos ("8K", "cinematic", "masterpiece"):
 * empujan justo hacia el aspecto artificial que se quiere evitar.
 */
const PHOTO_DIRECTION = {
    chef: {
        lead: 'Photograph of the finished dish',
        direction: [
            // Profundidad de campo: en la primera prueba los cubiertos del fondo salían
            // tan nítidos como el plato, que es lo que más delata a una imagen generada.
            'Shot on a 65mm lens at f/3.5, close three-quarter angle, shallow depth of field with the background softly out of focus.',
            // Luz con dirección y sombras: antes la escena no proyectaba ninguna.
            'Single directional window light from the left, with visible soft shadows and one subtle highlight on the sauce.',
            // Textura e imperfección: rompe las superficies uniformes y repetidas.
            'Natural food texture: uneven browning, a few crumbs and drips settled on the plate.',
            // Física asentada y color contenido.
            'Muted natural colour, every ingredient and utensil resting plausibly where gravity would put it.',
        ].join(' '),
    },
};
/**
 * DIRECCIÓN DE RETOQUE — cuando la foto es de la persona.
 *
 * Aquí el plato ya existe y está en la imagen que viaja como referencia, así que
 * el trabajo no es fotografiar bien: es NO tocar lo que no se pidió. Por eso esta
 * dirección es lo contrario de PHOTO_DIRECTION: aquella describe cómo hacer una
 * foto desde cero y, aplicada a un retoque, invitaría al modelo a rehacer el plato.
 */
const EDIT_DIRECTION = {
    chef: [
        // Lo que se le pide hacer con la imagen: retocarla, no rehacer la escena.
        'Edit the provided photograph rather than regenerating the scene.',
        // Lo primero, y lo que más se incumple: la identidad del plato.
        'Keep the dish itself exactly as it is: the same food, the same ingredients, the same shape, proportions and arrangement on the plate.',
        // El encargo, acotado.
        'Apply only the requested change and leave everything else untouched. Do not add or remove ingredients that were not mentioned.',
        /*
         * La composición. En la primera edición real la pizza se conservó entera pero
         * el encuadre se abrió: la cámara se alejó y apareció completa la que antes
         * salía cortada por los bordes. Nadie había pedido conservarlo, así que el
         * modelo recompuso a su gusto.
         *
         * Va condicionado a propósito: si alguien pide justo eso —"acerca la cámara"—,
         * su encargo manda sobre esta regla y el prompt no se contradice.
         */
        'Unless the request asks otherwise, keep the original framing, crop, perspective, camera angle and camera distance: the dish stays the same apparent size and in the same position within the frame, and whatever was cut off at the edges stays cut off the same way.',
        // Que siga pareciendo la misma fotografía, no una ilustración.
        'Keep the result a real photograph: natural food texture, coherent lighting, believable shadows and everything resting where gravity would put it.',
    ].join(' '),
};
/** Los `kind` que retocan una foto real en vez de crear una imagen nueva. */
const EDIT_KINDS = new Set(['dish_edit']);
/** Prompt interno para un paso de imagen: la operación en inglés + lo que pidió la persona. */
/**
 * @param focus  Qué cambia y qué NO debe tocarse en esta operación concreta.
 *   Lo pone la plantilla cuando dos intenciones comparten capacidad pero piden
 *   cosas distintas: cambiar los muebles no es lo mismo que cambiar los colores,
 *   y sin esta línea el modelo recibía el mismo encargo para las dos (2E-59).
 */
const buildImagePrompt = (experienceId, kind, brief, goal, purpose, previous, focus) => {
    const fromConcept = (0, exports.extractMarker)(previous, 'IMAGEN') || (0, exports.extractMarker)(previous, 'PROBAR');
    const task = exports.IMAGE_TASK_EN[kind];
    // Lo que se ve: la descripción del plato que escribió Gemini, o la operación.
    const subject = fromConcept || task || `${purpose}: ${goal}`;
    // Retocar y crear piden cosas distintas, así que no comparten dirección: la de
    // 2E-10 sigue intacta para lo que se crea desde cero.
    const retoque = EDIT_KINDS.has(kind) ? EDIT_DIRECTION[experienceId] : undefined;
    // Cómo se fotografía: solo donde Weë lo tiene definido. Sin entrada, el prompt
    // sale exactamente igual que antes para todas las demás experiencias.
    const foto = retoque ? undefined : PHOTO_DIRECTION[experienceId];
    return [
        // El sujeto puede venir de Gemini y traer ya su punto final: no se duplica.
        foto ? `${foto.lead}: ${subject.replace(/\s*\.\s*$/, '')}.` : subject,
        // Lo que escribió la persona no se descarta nunca: si la operación ya se dijo
        // en inglés, su objetivo viaja aparte como contexto y la capa 3 lo adapta si hace falta.
        !fromConcept && task && goal ? `Context: ${goal}.` : '',
        brief ? `Details: ${brief}.` : '',
        // Va antes de la dirección de foto y del retoque: es la operación misma.
        focus || '',
        // Va DESPUÉS de la descripción del plato: la acompaña, no la sustituye.
        foto ? foto.direction : '',
        // Al retocar, lo que hay que proteger es el plato que ya está en la foto.
        retoque || '',
        kind ? '' : STYLE_WORDS[experienceId],
        'No text or watermarks unless the design itself is a logo or poster with the requested words.',
    ]
        .filter(Boolean)
        .join(' ');
};
exports.buildImagePrompt = buildImagePrompt;
/** Prompt interno para un clip de video a partir del guion. */
const buildVideoPrompt = (goal, brief, previous) => {
    var _a, _b, _c, _d;
    const script = previous.find((p) => /Escena 1/i.test(p)) || previous[0] || '';
    // "Escena 1 (0–3 s): lo que se ve…" → lo que se ve (o la línea siguiente si la descripción va aparte)
    const sameLine = ((_b = (_a = script.match(/Escena 1[^:\n]*:\s*([^\n]+)/i)) === null || _a === void 0 ? void 0 : _a[1]) === null || _b === void 0 ? void 0 : _b.trim()) || '';
    const nextLine = ((_d = (_c = script.match(/Escena 1[^\n]*\n\s*([^\n]+)/i)) === null || _c === void 0 ? void 0 : _c[1]) === null || _d === void 0 ? void 0 : _d.trim()) || '';
    const scene = sameLine || nextLine;
    return [`${goal}.`, scene ? `Opening scene: ${scene}` : '', brief ? `Style: ${brief}.` : '', 'Smooth camera movement, natural motion, high detail, no text on screen.']
        .filter(Boolean)
        .join(' ')
        .slice(0, 1500);
};
exports.buildVideoPrompt = buildVideoPrompt;
/** Texto que se lee en voz alta: la línea NARRACIÓN del guion o un resumen breve. */
const narrationFrom = (previous, goal) => {
    const marked = (0, exports.extractMarker)(previous, 'NARRACIÓN') || (0, exports.extractMarker)(previous, 'NARRACION');
    if (marked)
        return marked;
    const text = previous.find((p) => p.trim().length > 0) || goal;
    return text.replace(/\s+/g, ' ').slice(0, 400);
};
exports.narrationFrom = narrationFrom;
//# sourceMappingURL=prompts.js.map