"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATES = exports.plainQuestion = void 0;
/** Copia sin la condición, tal como se guarda y se envía a la app. */
const plainQuestion = (question) => ({
    id: question.id,
    text: question.text,
    options: question.options,
    allowFreeText: question.allowFreeText,
});
exports.plainQuestion = plainQuestion;
/** Devuelve el optionId cuya lista de palabras aparece en el texto. */
const inferByKeywords = (text, table) => {
    const lower = text.toLowerCase();
    for (const [optionId, words] of Object.entries(table)) {
        if (words.some((w) => lower.includes(w)))
            return optionId;
    }
    return undefined;
};
const IDK = { id: 'idk', label: '🤷 No sé' };
const SURPRISE = { id: 'idk', label: '🤷 Sorpréndeme' };
const opt = (id, label) => ({ id, label });
const step = (id, capability, purpose, extra = {}) => (Object.assign({ id, capability, purpose }, extra));
/** Etiqueta legible de una opción (sin el emoji), o el texto libre de la persona. */
const chosen = (question, answers) => {
    var _a;
    const value = (_a = answers[question.id]) !== null && _a !== void 0 ? _a : 'idk';
    const option = question.options.find((o) => o.id === value);
    if (option) {
        return { id: option.id, label: option.label.replace(/^\S+\s+/, ''), idk: option.id === 'idk' };
    }
    return { id: 'free', label: value, idk: value.trim().length === 0 };
};
/** Frase didáctica cuando la persona eligió "No sé": Weë decide y lo explica. */
const decided = (idk, what) => (idk ? ` Como no estabas seguro, ${what}.` : '');
const q = (id, text, options, allowFreeText = true, when) => (Object.assign({ id,
    text,
    options,
    allowFreeText }, (when ? { when } : {})));
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Cómo se dice en el encargo cada respuesta de Weë Design. Se escriben aquí, y no
 * pegando la etiqueta del botón, para que el texto que llega al modelo sea una
 * frase y no una lista: "con un aire natural", no "Natural".
 */
const FRASES_DESIGN = {
    feel: {
        serious: 'con un aire serio y confiable',
        modern: 'con un aire moderno',
        close: 'con un aire cercano y divertido',
        luxury: 'con un aire de lujo',
        natural: 'con un aire natural',
    },
    where: {
        feed: 'en formato cuadrado, para Instagram o Facebook',
        story: 'en vertical, para una historia',
        whatsapp: 'en un formato fácil de compartir por WhatsApp',
        print: 'en formato A4, listo para imprimir',
    },
    look: {
        clean: 'de aspecto moderno y limpio',
        natural: 'de aspecto natural',
        luxury: 'de aspecto lujoso',
        fun: 'de aspecto divertido y colorido',
        industrial: 'de aspecto industrial',
    },
    era: {
        future: 'del futuro',
        now: 'de hoy',
        classic: 'de estilo clásico',
        scifi: 'de ciencia ficción',
    },
    inout: {
        // Neutras a propósito: "una casa, visto por fuera" no concuerda.
        outside: 'por fuera',
        inside: 'por dentro',
        wide: 'en una vista amplia',
    },
    draw: {
        cartoon: 'en estilo de dibujo animado',
        real: 'en estilo realista',
        game: 'con estética de videojuego',
        pencil: 'dibujado a lápiz',
        cute: 'con un aire tierno',
    },
};
const design = {
    name: 'Weë Design',
    emoji: '🎨',
    defaultGoal: 'Diseñar algo que imagino',
    /*
     * Siete conversaciones en la misma mesa (fase 2E-45).
     *
     * Antes las siete intenciones recibían las mismas tres preguntas: qué, estilo y
     * para qué. Preguntarle el estilo "minimalista" a quien viene a crear un
     * personaje, o "para qué lo necesitas" a quien ya dijo que quiere un logo para
     * su marca, es hacer preguntas por simetría y no por utilidad.
     *
     * Ahora cada intención tiene las suyas: una que solo la persona sabe —el nombre
     * de su marca, qué producto imagina, quién es su personaje— y otra que decide
     * algo que el texto no suele decir. Ninguna llega a tres.
     *
     * `when` es el mecanismo que ya existía (Weë Chef lo usa desde 2E-29): una
     * pregunta solo aparece si toca. Y varias llevan `&& !a.<id>`, que significa
     * "no la preguntes si ya lo sabemos": si la persona escribió "un deportivo del
     * futuro", la época ya está dicha y volver a preguntarla es no haber escuchado.
     */
    questions: [
        // Solo se pregunta en "No sé qué diseñar": las otras seis llegan contestadas.
        q('what', 'Cuéntame qué necesitas y te propongo por dónde empezar', [
            opt('logo', '🔤 Un logo o mi marca · si todavía no tienes una'),
            opt('poster', '🪧 Algo para redes o publicidad · para anunciar algo'),
            opt('product', '📦 Un producto · envases, muebles, ropa, tecnología'),
            opt('object', '🏎️ Un vehículo o una máquina · autos, aviones, inventos'),
            opt('scene', '🏙️ Un lugar o un escenario · casas, locales, paisajes'),
            opt('character', '🧑‍🚀 Un personaje · mascotas, héroes, criaturas'),
        ]),
        // 🔤 Un logo o mi marca
        q('name', '¿Qué nombre o texto quieres que aparezca?', [], true, (a) => a.what === 'logo'),
        q('feel', '¿Qué quieres que transmita tu marca?', [
            opt('serious', '🏛️ Seria y confiable'),
            opt('modern', '✨ Moderna'),
            opt('close', '🎈 Cercana y divertida'),
            opt('luxury', '💎 De lujo'),
            opt('natural', '🌿 Natural'),
            IDK,
        ], true, (a) => a.what === 'logo'),
        // 🪧 Algo para redes o publicidad
        q('message', '¿Qué quieres anunciar o comunicar?', [
            opt('promo', '🏷️ Una promoción'),
            opt('event', '📅 Un evento'),
            opt('launch', '🆕 Un producto nuevo'),
            opt('news', '🕒 Un horario o una novedad'),
        ], true, (a) => a.what === 'poster'),
        q('where', '¿Dónde vas a publicarlo?', [
            opt('feed', '📱 Instagram o Facebook'),
            opt('story', '📖 Una historia'),
            opt('whatsapp', '💬 WhatsApp'),
            opt('print', '🖨️ Para imprimir'),
            IDK,
        ], true, (a) => a.what === 'poster'),
        // 📦 Un producto
        q('item', '¿Qué producto quieres diseñar?', [
            opt('pack', '📦 Un envase'),
            opt('furniture', '🛋️ Un mueble'),
            opt('clothes', '👟 Ropa o calzado'),
            opt('gadget', '📱 Algo de tecnología'),
        ], true, (a) => a.what === 'product'),
        q('look', '¿Cómo lo imaginas?', [
            opt('clean', '✨ Moderno y limpio'),
            opt('natural', '🌿 Natural'),
            opt('luxury', '💎 De lujo'),
            opt('fun', '🎈 Divertido'),
            opt('industrial', '🏭 Industrial'),
            IDK,
        ], true, (a) => a.what === 'product' && !a.look),
        // 🏎️ Un vehículo o una máquina
        q('machine', '¿Qué vehículo o máquina imaginas?', [
            opt('car', '🏎️ Un auto'),
            opt('air', '🚁 Algo que vuela'),
            opt('bike', '🏍️ Una moto'),
            opt('engine', '⚙️ Un motor o una pieza'),
        ], true, (a) => a.what === 'object'),
        // Solo si no se sabe ya: quien escribe "del futuro" no debe repetirlo.
        q('era', '¿De qué época?', [
            opt('future', '🚀 Del futuro'),
            opt('now', '🏁 De ahora'),
            opt('classic', '🕰️ Clásico'),
            opt('scifi', '🤖 Ciencia ficción'),
            IDK,
        ], true, (a) => a.what === 'object' && !a.era),
        // 🏙️ Un lugar o un escenario
        q('place', '¿Qué lugar o escenario quieres crear?', [
            opt('house', '🏠 Una casa'),
            opt('shop', '🏪 Un local o negocio'),
            opt('city', '🌆 Una ciudad'),
            opt('nature', '🌄 Un paisaje'),
        ], true, (a) => a.what === 'scene'),
        q('inout', '¿Es un espacio interior o exterior?', [
            opt('outside', '🏠 Por fuera'),
            opt('inside', '🛋️ Por dentro'),
            opt('wide', '🌄 Una vista amplia'),
            IDK,
        ], true, (a) => a.what === 'scene' && !a.inout),
        // 🧑‍🚀 Un personaje
        q('who', '¿Quién o qué personaje quieres crear?', [
            opt('mascot', '🐶 Una mascota para mi marca'),
            opt('hero', '🦸 Un héroe o protagonista'),
            opt('robot', '🤖 Un robot'),
            opt('creature', '🐉 Una criatura'),
        ], true, (a) => a.what === 'character'),
        q('draw', '¿Qué estilo visual quieres?', [
            opt('cartoon', '🎨 Dibujo animado'),
            opt('real', '📷 Realista'),
            opt('game', '🕹️ De videojuego'),
            opt('pencil', '✏️ A lápiz'),
            opt('cute', '🧸 Tierno'),
            IDK,
        ], true, (a) => a.what === 'character' && !a.draw),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            logo: ['logo', 'logotipo', 'identidad', 'marca'],
            poster: ['afiche', 'flyer', 'poster', 'póster', 'post ', 'publicidad', 'anuncio', 'redes', 'instagram', 'portada'],
            character: ['personaje', 'criatura', 'mascota', 'héroe', 'heroe', 'robot', 'monstruo', 'avatar'],
            /*
             * Una casa es un lugar, no una máquina (fase 2E-56).
             *
             * "casa" y "edificio" vivían en `object`, el cajón de los autos y los
             * motores, así que "una casa moderna" acababa en el camino de vehículos.
             * Ahora están donde corresponde: quien imagina una casa desde cero está
             * pensando en un lugar. Y quien quiere transformar la suya tiene otra
             * puerta —🏠 Hogar & Diseño—, que trabaja sobre su foto.
             *
             * Aquí solo entran palabras que nombran un lugar sin ambigüedad. Los
             * nombres de habitación (sala, cocina, dormitorio, baño, oficina) se
             * quedan fuera a propósito: chocarían con `product`, que reconoce muebles,
             * y ya se leen más abajo en `inout`.
             */
            scene: ['mundo', 'escena', 'paisaje', 'ciudad', 'ambiente', 'planeta', 'casa', 'hogar', 'departamento', 'edificio', 'fachada', 'terraza', 'jardín', 'jardin', 'patio', 'interiores'],
            product: ['botella', 'vaso', 'envase', 'empaque', 'packaging', 'zapatilla', 'ropa', 'mueble', 'silla', 'mesa', 'lámpara', 'lampara', 'producto', 'celular', 'reloj', 'juguete'],
            object: ['auto', 'carro', 'coche', 'vehículo', 'vehiculo', 'moto', 'helicóptero', 'helicoptero', 'avión', 'avion', 'dron', 'nave', 'máquina', 'maquina', 'motor', 'invento'],
        });
        if (what)
            answers.what = what;
        /*
         * Lo que se deduce aquí deja de preguntarse: cada una de estas respuestas
         * apaga su pregunta con el `!a.<id>` de su `when`. No se deduce el sujeto
         * —el nombre de la marca, qué producto— porque eso solo lo sabe la persona.
         */
        const era = inferByKeywords(goal, {
            future: ['futurista', 'del futuro', 'futuro', 'espacial', 'cyber'],
            classic: ['clásico', 'clasico', 'vintage', 'antiguo', 'retro'],
            scifi: ['ciencia ficción', 'ciencia ficcion', 'sci-fi', 'galáctic', 'galactic'],
        });
        if (era)
            answers.era = era;
        const inout = inferByKeywords(goal, {
            inside: ['interior', 'por dentro', 'sala', 'salón', 'salon', 'habitación', 'habitacion', 'cocina', 'oficina'],
            outside: ['fachada', 'exterior', 'por fuera'],
            wide: ['paisaje', 'ciudad', 'bosque', 'vista'],
        });
        if (inout)
            answers.inout = inout;
        const draw = inferByKeywords(goal, {
            cartoon: ['dibujo animado', 'caricatura', 'cartoon', 'animado'],
            real: ['realista', 'fotorrealista'],
            game: ['videojuego', 'gamer'],
            pencil: ['a lápiz', 'a lapiz', 'boceto'],
            cute: ['tierno', 'kawaii', 'adorable'],
        });
        if (draw)
            answers.draw = draw;
        const look = inferByKeywords(goal, {
            luxury: ['lujo', 'premium', 'sofisticad'],
            natural: ['natural', 'ecológic', 'ecologic', 'artesanal'],
            fun: ['divertid', 'infantil', 'colorid'],
            industrial: ['industrial', 'metálic', 'metalic'],
            clean: ['minimalista', 'simple', 'limpio', 'sencillo', 'moderno'],
        });
        if (look)
            answers.look = look;
        return answers;
    },
    buildPlan: (goal, answers) => {
        /*
         * Cada intención arma su propio encargo con sus propias respuestas. Lo que se
         * le manda al modelo se escribe en frases, no pegando etiquetas: "un logo para
         * \"La Espiga\", con un aire natural" en vez de "logo, estilo natural, marca".
         */
        const pregunta = (id) => design.questions.find((x) => x.id === id);
        const resp = (id) => chosen(pregunta(id), answers);
        /**
         * Lo que escribió o eligió, tal cual. Vacío si no contestó o dijo "No sé".
         * Sin contestar hay que comprobarlo antes: en una pregunta sin opciones —el
         * nombre de la marca— el valor por defecto es la palabra "idk", y llegó a
         * salir un encargo que pedía "un logo para \"idk\"".
         */
        const suyo = (id) => { if (!answers[id])
            return ''; const c = resp(id); return c.idk ? '' : c.label.trim(); };
        /** La frase con la que ese matiz entra en el encargo. */
        const frase = (id) => { var _a; if (!answers[id])
            return ''; const c = resp(id); if (c.idk)
            return ''; return ((_a = FRASES_DESIGN[id]) === null || _a === void 0 ? void 0 : _a[c.id]) || c.label.toLowerCase(); };
        const what = resp('what');
        const count = 3;
        const RAMAS = {
            logo: () => {
                const nombre = suyo('name');
                const alma = frase('feel');
                return {
                    brief: [nombre ? `un logo para "${nombre}"` : 'un logo', alma].filter(Boolean).join(', '),
                    explica: `Voy a crear ${count} logos${nombre ? ` para "${nombre}"` : ''}${alma ? `, ${alma}` : ''}.`,
                    nombre: 'logos',
                };
            },
            poster: () => {
                const que = suyo('message').toLowerCase();
                const donde = frase('where');
                return {
                    brief: [que ? `una pieza para anunciar ${que}` : 'una pieza para redes', donde].filter(Boolean).join(', '),
                    explica: `Voy a crear ${count} propuestas${que ? ` para anunciar ${que}` : ''}${donde ? `, ${donde}` : ''}.`,
                    nombre: 'propuestas',
                };
            },
            product: () => {
                const cosa = suyo('item').toLowerCase() || 'un producto';
                const aspecto = frase('look');
                return { brief: [cosa, aspecto].filter(Boolean).join(', '), explica: `Voy a crear ${count} propuestas de ${cosa}${aspecto ? `, ${aspecto}` : ''}.`, nombre: 'propuestas' };
            },
            object: () => {
                const cosa = suyo('machine').toLowerCase() || 'un vehículo';
                const epoca = frase('era');
                return { brief: [cosa, epoca].filter(Boolean).join(', '), explica: `Voy a crear ${count} propuestas de ${cosa}${epoca ? `, ${epoca}` : ''}.`, nombre: 'propuestas' };
            },
            scene: () => {
                const sitio = suyo('place').toLowerCase() || 'un lugar';
                const vista = frase('inout');
                return { brief: [sitio, vista].filter(Boolean).join(', '), explica: `Voy a crear ${count} propuestas de ${sitio}${vista ? `, ${vista}` : ''}.`, nombre: 'propuestas' };
            },
            character: () => {
                const quien = suyo('who').toLowerCase() || 'un personaje';
                const trazo = frase('draw');
                return { brief: [quien, trazo].filter(Boolean).join(', '), explica: `Voy a crear ${count} propuestas de ${quien}${trazo ? `, ${trazo}` : ''}.`, nombre: 'propuestas' };
            },
        };
        // Si escribió su idea con sus palabras en vez de elegir, esa idea es el encargo.
        const suelto = what.idk ? 'lo que me describiste' : what.label.toLowerCase();
        const rama = (RAMAS[what.id] || (() => ({ brief: suelto, explica: `Voy a crear ${count} propuestas de ${suelto}.`, nombre: 'propuestas' })))();
        return {
            experience: 'design',
            goal,
            steps: [
                step('concept', 'text.generate', 'Definir el concepto', { input: { kind: 'concept', brief: rama.brief } }),
                step('images', 'image.generate', `Crear ${count} ${rama.nombre}`, { dependsOn: ['concept'], input: { count, kind: what.id === 'logo' ? 'logo' : 'design', brief: rama.brief } }),
            ],
            explainToUser: rama.explica,
        };
    },
};
const studio = {
    name: 'Weë Studio',
    emoji: '🎬',
    defaultGoal: 'Un video corto para mis redes',
    questions: [
        q('type', '¿Qué tipo de video?', [
            opt('promo', '📣 Para promocionar algo'),
            opt('social', '📱 Para mis redes'),
            opt('story', '🎞️ Una historia'),
            opt('animate', '🖼️ Animar una foto'),
            IDK,
        ]),
        q('style', '¿Qué estilo quieres?', [
            opt('impact', '🔥 Impactante'),
            opt('warm', '🤗 Cercano'),
            opt('elegant', '✨ Elegante'),
            opt('fun', '😂 Divertido'),
            SURPRISE,
        ]),
        q('where', '¿Dónde lo vas a publicar?', [
            opt('vertical', '📱 Instagram o TikTok'),
            opt('horizontal', '▶️ YouTube'),
            opt('square', '💬 WhatsApp o Facebook'),
            IDK,
        ], true, (a) => a.type !== 'animate'),
    ],
    infer: (goal) => {
        const answers = {};
        const type = inferByKeywords(goal, {
            animate: ['animar', 'anima', 'animación de una foto', 'cobre vida', 'mi foto', 'una foto', 'imagen'],
            promo: ['promocion', 'anuncio', 'publicidad', 'vender', 'oferta', 'negocio', 'restaurante', 'tienda', 'producto', 'comercial'],
            story: ['historia', 'cuento', 'relato', 'escena por escena', 'película', 'pelicula'],
            social: ['redes', 'instagram', 'tiktok', 'reel', 'youtube', 'saludo', 'mascota', 'presentación', 'presentacion'],
        });
        if (type)
            answers.type = type;
        const style = inferByKeywords(goal, {
            fun: ['divertid', 'gracioso', 'humor', 'mascota'],
            elegant: ['elegante', 'premium', 'lujo', 'sofisticad'],
            impact: ['impact', 'épic', 'epic', 'potente', 'fuerte'],
            warm: ['cercano', 'cálido', 'calido', 'familiar', 'saludo', 'especial'],
        });
        if (style)
            answers.style = style;
        const where = inferByKeywords(goal, {
            vertical: ['instagram', 'tiktok', 'reel', 'historia de instagram', 'vertical'],
            horizontal: ['youtube', 'horizontal', 'pantalla'],
            square: ['whatsapp', 'facebook'],
        });
        if (where)
            answers.where = where;
        return answers;
    },
    buildPlan: (goal, answers) => {
        const type = chosen(studio.questions[0], answers);
        const style = chosen(studio.questions[1], answers);
        const where = chosen(studio.questions[2], answers);
        const kind = type.idk ? 'un video para tus redes' : type.label.toLowerCase();
        const look = style.idk ? 'cercano y con ritmo' : style.label.toLowerCase();
        const format = where.id === 'horizontal' ? 'horizontal para YouTube' : where.id === 'square' ? 'cuadrado para WhatsApp y Facebook' : 'vertical para Instagram y TikTok';
        const aspectRatio = where.id === 'horizontal' ? '16:9' : where.id === 'square' ? '1:1' : '9:16';
        if (type.id === 'animate') {
            return {
                experience: 'studio',
                goal,
                steps: [
                    step('look', 'vision.describe', 'Mirar tu foto', { input: { kind: 'describe' } }),
                    step('motion', 'video.image_to_video', 'Darle movimiento a la foto', { dependsOn: ['look'], input: { kind: 'clip', brief: look, durationSec: 5 } }),
                ],
                explainToUser: `Voy a mirar tu foto y darle movimiento con un estilo ${look}: un clip de 5 segundos listo para compartir.${decided(style.idk, 'elegí un estilo cercano y con ritmo')}`,
            };
        }
        return {
            experience: 'studio',
            goal,
            steps: [
                step('script', 'text.generate', 'Escribir el guion de 3 escenas', { input: { kind: 'script', brief: `${kind}, estilo ${look}, 10 segundos, formato ${format}`, quality: type.id === 'story' ? 'max' : 'standard' } }),
                step('clip', 'video.generate', 'Generar el video', { dependsOn: ['script'], input: { kind: 'clip', brief: `${kind}, estilo ${look}`, durationSec: 10, aspectRatio } }),
                step('voice', 'voice.tts', 'Grabar la narración', { dependsOn: ['script'], input: { kind: 'narration' } }),
            ],
            explainToUser: `Voy a escribir un guion corto, generar ${kind} de 10 segundos, ${format}, con estilo ${look}, y grabar la narración.${decided(type.idk, 'lo preparo para tus redes')}${decided(style.idk, 'elegí un estilo cercano y con ritmo')}${decided(where.idk, 'lo hago vertical, que sirve para Instagram y TikTok')}`,
        };
    },
};
/** Acciones de Weë Photo que exigen conservar el rostro o el detalle original. */
const PRO_PHOTO = new Set(['restore', 'retouch']);
/**
 * Acciones donde la persona espera más píxeles, no solo otra versión. Se pide
 * 2K de salida y se cobra la resolución real (credits/aiPricing.ts), en vez de
 * prometer una ampliación que ningún proveedor auditado ofrece con API oficial.
 */
const HIGH_RES_PHOTO = new Set(['enhance', 'restore']);
const photo = {
    name: 'Weë Photo',
    emoji: '📸',
    defaultGoal: 'Mejorar una foto',
    questions: [
        q('action', '¿Qué hacemos con tu foto?', [
            opt('enhance', '✨ Mejorar la calidad y la resolución'),
            opt('remove', '🧽 Quitar algo que sobra'),
            opt('background', '🪄 Cambiar o quitar el fondo'),
            opt('restore', '🕰️ Restaurar una foto antigua'),
            opt('retouch', '🙂 Retoque natural del rostro'),
            opt('colorize', '🌈 Colorizar blanco y negro'),
            opt('transform', '🎇 Transformar con un estilo'),
            opt('generate', '🖼️ Crear una imagen desde cero'),
            IDK,
        ]),
        q('detail', '¿Cómo lo quieres?', [
            opt('natural', '🍃 Natural, que no se note'),
            opt('vivid', '🌈 Con colores vivos'),
            opt('clean', '⬜ Fondo limpio o blanco'),
            opt('artistic', '🎨 Artístico o vintage'),
            SURPRISE,
        ]),
    ],
    infer: (goal) => {
        const answers = {};
        const action = inferByKeywords(goal, {
            background: ['fondo'],
            remove: ['quitar', 'quita', 'eliminar', 'elimina', 'borrar', 'borra', 'sobra'],
            restore: ['restaurar', 'restaura', 'antigua', 'vieja', 'dañada', 'danada', 'rota'],
            colorize: ['coloriz', 'blanco y negro', 'ponerle color', 'dar color'],
            retouch: ['retoque', 'retocar', 'rostro', 'cara', 'piel', 'arrugas'],
            transform: ['estilo', 'vintage', 'caricatura', 'cartoon', 'anime', 'pintura', 'artístic', 'artistic', 'transformar'],
            generate: ['crear una imagen', 'generar', 'genera', 'crea una imagen', 'desde cero', 'dibuja', 'imagina'],
            enhance: ['mejorar', 'mejora', 'calidad', 'nítid', 'nitid', 'resolución', 'resolucion', 'borrosa', 'vivos', 'iluminar', 'brillo'],
        });
        if (action)
            answers.action = action;
        const detail = inferByKeywords(goal, {
            vivid: ['vivos', 'vibrante', 'más color', 'mas color'],
            clean: ['fondo blanco', 'fondo limpio', 'limpio', 'blanco'],
            artistic: ['vintage', 'artístic', 'artistic', 'caricatura', 'anime', 'pintura'],
            natural: ['natural', 'que no se note', 'sutil'],
        });
        if (detail)
            answers.detail = detail;
        return answers;
    },
    buildPlan: (goal, answers) => {
        const action = chosen(photo.questions[0], answers);
        const detail = chosen(photo.questions[1], answers);
        const capability = action.id === 'background' ? 'image.background_remove' :
            action.id === 'remove' ? 'image.object_remove' :
                action.id === 'retouch' ? 'image.identity_edit' :
                    action.id === 'generate' ? 'image.generate' : 'image.edit';
        const editKind = action.idk ? 'enhance' : action.id;
        const what = action.idk ? 'mejorar la calidad' : action.label.toLowerCase();
        const how = detail.idk ? 'lo más natural posible' : detail.label.toLowerCase();
        const purpose = action.idk ? 'Mejorar la foto' : action.label.replace(/^./, (c) => c.toUpperCase());
        const steps = action.id === 'generate'
            ? [step('images', 'image.generate', 'Crear 3 imágenes', { input: { count: 3, kind: 'photo', brief: `${goal}, ${how}` } })]
            : [
                step('look', 'vision.describe', 'Mirar la foto para entender qué tiene', { input: { kind: 'describe' } }),
                step('edit', capability, purpose, { dependsOn: ['look'], input: Object.assign(Object.assign({ kind: editKind, brief: `${what}, ${how}`, count: action.id === 'transform' ? 2 : 1 }, (PRO_PHOTO.has(editKind) ? { quality: 'max' } : {})), (HIGH_RES_PHOTO.has(editKind) ? { resolution: '2K' } : {})) }),
            ];
        return {
            experience: 'photo',
            goal,
            steps,
            explainToUser: action.id === 'generate'
                ? `Voy a crear 3 imágenes a partir de lo que me contaste, ${how}.${decided(detail.idk, 'las hago lo más naturales posible')}`
                : `Primero miro tu foto y después me encargo de ${what}, ${how}. Conservo todo lo demás tal cual.${decided(action.idk, 'empiezo por mejorar la calidad')}${decided(detail.idk, 'lo hago lo más natural posible')}`,
        };
    },
};
/**
 * Nivel de modelo por tipo de texto. La sección no elige proveedor ni modelo:
 * declara la exigencia y el AI ROUTER busca el mejor candidato de la cadena.
 *   'max'      → sostener una trama o una estructura larga (novela, guion)
 *   'high'     → textos de trabajo (artículo, documento)
 *   'standard' → textos cortos y de mucho volumen (post, email, resumen)
 */
/**
 * Nivel de modelo por tipo de texto. **Por defecto, el más económico.**
 * Solo suben los dos casos donde un modelo flojo arruina el resultado: sostener
 * una trama larga (novela) y un guion con estructura. Todo lo demás arranca en
 * estándar y la persona puede subirlo desde el presupuesto si lo quiere mejor.
 */
const TEXT_QUALITY = {
    story: 'max',
    script: 'max',
    article: 'standard',
    document: 'standard',
    cv: 'standard',
    post: 'standard',
    email: 'standard',
    summary: 'standard',
    fix: 'standard',
};
const writer = {
    name: 'Weë Writer',
    emoji: '✍️',
    defaultGoal: 'Un texto para publicar',
    questions: [
        q('what', '¿Qué escribimos?', [
            opt('post', '📱 Una publicación'),
            opt('story', '📖 Una historia o novela'),
            opt('script', '🎬 Un guion'),
            opt('article', '📰 Un artículo o blog'),
            opt('email', '✉️ Un email o carta'),
            opt('document', '📄 Un documento'),
            opt('cv', '🧑‍💼 Mi CV'),
            opt('cover', '📕 La portada de mi libro'),
            opt('translate', '🌐 Traducir'),
            opt('summary', '🗒️ Resumir'),
            opt('ideas', '💡 Ideas'),
            opt('fix', '✔️ Corregir'),
            opt('rewrite', '🔁 Reescribir'),
            opt('citations', '❝ Citas y referencias'),
            IDK,
        ]),
        q('tone', '¿Qué tono?', [
            opt('friendly', '😊 Cercano'),
            opt('pro', '💼 Profesional'),
            opt('fun', '😄 Divertido'),
            opt('emotional', '💛 Emotivo'),
            SURPRISE,
        ], true, (a) => { var _a; return !['translate', 'summary', 'fix', 'cover'].includes((_a = a.what) !== null && _a !== void 0 ? _a : ''); }),
        q('language', '¿A qué idioma?', [
            opt('en', '🇺🇸 Inglés'),
            opt('pt', '🇧🇷 Portugués'),
            opt('fr', '🇫🇷 Francés'),
            opt('it', '🇮🇹 Italiano'),
            IDK,
        ], true, (a) => a.what === 'translate'),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            translate: ['traducir', 'traduce', 'traducción', 'traduccion', 'en inglés', 'en ingles', 'al inglés', 'al ingles'],
            summary: ['resumir', 'resume', 'resumen', 'ideas clave'],
            fix: ['corregir', 'corrige', 'ortografía', 'ortografia', 'revisar'],
            rewrite: ['reescribir', 'mejorar este texto', 'acortar', 'alargar', 'desarrollar más', 'otro tono', 'reescribe', 'mejora este'],
            cover: ['portada'],
            cv: ['cv', 'currículum', 'curriculum', 'hoja de vida'],
            script: ['guion', 'guión'],
            email: ['email', 'correo', 'carta', 'mensaje para'],
            article: ['artículo', 'articulo', 'blog', 'nota'],
            story: ['historia', 'cuento', 'novela', 'relato', 'capítulo', 'capitulo'],
            document: ['documento', 'informe', 'plan', 'propuesta', 'ensayo'],
            ideas: ['ideas', 'bloqueo', 'no sé qué escribir', 'no se que escribir'],
            citations: ['cita', 'citas', 'referencia', 'referencias', 'bibliografía', 'bibliografia', 'fuentes'],
            post: ['publicación', 'publicacion', 'post', 'instagram', 'redes', 'caption'],
        });
        if (what)
            answers.what = what;
        const tone = inferByKeywords(goal, {
            pro: ['profesional', 'formal', 'cliente', 'empresa', 'trabajo'],
            fun: ['divertid', 'gracioso', 'humor'],
            emotional: ['emotivo', 'emocional', 'amor', 'sentimiento', 'mis hijos', 'para mi mamá', 'para mi mama'],
            friendly: ['cercano', 'amigable', 'informal'],
        });
        if (tone)
            answers.tone = tone;
        const language = inferByKeywords(goal, {
            en: ['inglés', 'ingles', 'english'],
            pt: ['portugués', 'portugues'],
            fr: ['francés', 'frances'],
            it: ['italiano'],
        });
        if (language)
            answers.language = language;
        return answers;
    },
    buildPlan: (goal, answers) => {
        const what = chosen(writer.questions[0], answers);
        const tone = chosen(writer.questions[1], answers);
        const language = chosen(writer.questions[2], answers);
        const kind = what.idk ? 'post' : what.id;
        const voice = tone.idk ? 'cercano' : tone.label.toLowerCase();
        const lang = language.idk ? 'inglés' : language.label.replace(/^\S+\s+/, '').toLowerCase();
        const one = (id, purpose, textKind, brief) => ({
            experience: 'writer',
            goal,
            steps: [step(id, 'text.generate', purpose, { input: { kind: textKind, brief, quality: TEXT_QUALITY[kind] } })],
            explainToUser: '',
        });
        switch (kind) {
            case 'citations': {
                // Una cita inventada es el peor error posible aquí: se buscan fuentes reales
                return {
                    experience: 'writer',
                    goal,
                    steps: [step('citations', 'text.search', 'Buscar las citas y sus fuentes', { input: { kind: 'ideas', brief: `citas y referencias verificables sobre ${goal}` } })],
                    explainToUser: 'Busco citas reales sobre el tema y te dejo la fuente de cada una para que puedas comprobarlas.',
                };
            }
            case 'translate': {
                const plan = one('translate', `Traducir al ${lang}`, 'translate', `al ${lang}`);
                plan.explainToUser = `Voy a traducir tu texto al ${lang} manteniendo el sentido y el tono.${decided(language.idk, 'lo traduzco al inglés')}`;
                return plan;
            }
            case 'summary': {
                const plan = one('summary', 'Resumir en ideas clave', 'summary', goal);
                plan.explainToUser = 'Voy a resumir tu texto en las ideas clave, en pocas líneas.';
                return plan;
            }
            case 'fix': {
                const plan = one('fix', 'Corregir ortografía, estilo y claridad', 'fix', goal);
                plan.explainToUser = 'Voy a corregir la ortografía, el estilo y la claridad sin cambiar lo que quisiste decir.';
                return plan;
            }
            case 'rewrite': {
                const plan = one('rewrite', 'Reescribir el texto', 'rewrite', `tono ${voice}`);
                plan.explainToUser = `Voy a reescribir tu texto con un tono ${voice}, manteniendo la idea.${decided(tone.idk, 'uso un tono cercano')}`;
                return plan;
            }
            case 'cover':
                return {
                    experience: 'writer',
                    goal,
                    steps: [
                        step('concept', 'text.generate', 'Definir el concepto de la portada', { input: { kind: 'concept', brief: goal } }),
                        step('covers', 'image.generate', 'Crear 3 propuestas de portada', { dependsOn: ['concept'], input: { count: 3, kind: 'cover', brief: goal } }),
                    ],
                    explainToUser: 'Voy a definir el concepto de la portada y crear tres propuestas para que elijas.',
                };
            case 'cv':
                return {
                    experience: 'writer',
                    goal,
                    steps: [step('cv', 'text.generate', 'Redactar tu CV', { input: { kind: 'cv', brief: `tono ${voice}` } })],
                    explainToUser: `Voy a redactar tu CV con un tono ${voice}, listo para usar en el editor y enviar.${decided(tone.idk, 'uso un tono profesional')}`,
                };
            case 'ideas': {
                const plan = one('ideas', 'Proponerte ideas para escribir', 'ideas', `tono ${voice}`);
                plan.explainToUser = 'Voy a proponerte varias ideas y un punto de partida para que escribas sin bloqueo.';
                return plan;
            }
            default: {
                const kinds = {
                    post: ['Escribir la publicación', 'copy'],
                    story: ['Escribir la historia', 'story'],
                    script: ['Escribir el guion', 'script'],
                    article: ['Escribir el artículo', 'article'],
                    email: ['Redactar el email', 'email'],
                    document: ['Redactar el documento', 'document'],
                };
                const [purpose, textKind] = kinds[kind] || kinds.post;
                return {
                    experience: 'writer',
                    goal,
                    steps: [
                        step('draft', 'text.generate', purpose, { input: { kind: textKind, brief: `tono ${voice}`, quality: TEXT_QUALITY[kind] } }),
                        step('polish', 'text.generate', 'Pulir el texto y dejarlo listo', { dependsOn: ['draft'], input: { kind: 'polish', brief: `tono ${voice}`, quality: TEXT_QUALITY[kind] === 'max' ? 'high' : TEXT_QUALITY[kind] } }),
                    ],
                    explainToUser: `Voy a ${purpose.toLowerCase()} con un tono ${voice} y después lo pulo para que quede listo.${decided(what.idk, 'empiezo por una publicación')}${decided(tone.idk, 'uso un tono cercano')}`,
                };
            }
        }
    },
};
const music = {
    name: 'Weë Music',
    emoji: '🎵',
    defaultGoal: 'Música para mi contenido',
    questions: [
        q('what', '¿Qué quieres crear?', [
            opt('song', '🎤 Una canción'),
            opt('instrumental', '🎹 Un beat o instrumental'),
            opt('jingle', '📣 Un jingle para mi marca'),
            opt('voice', '🗣️ Una voz o narración'),
            opt('lyrics', '📝 Una letra'),
            opt('mix', '🎚️ Mezclar y masterizar mi canción'),
            opt('video', '🎬 Un videoclip para mi canción'),
            IDK,
        ]),
        q('style', '¿Qué estilo?', [
            opt('pop', '🎵 Pop'),
            opt('urban', '🔥 Reggaetón o urbano'),
            opt('rock', '🎸 Rock'),
            opt('ballad', '🎹 Balada'),
            opt('electronic', '🎧 Electrónica'),
            SURPRISE,
        ], true, (a) => { var _a; return ['song', 'instrumental', 'jingle', 'video', 'lyrics', 'idk'].includes((_a = a.what) !== null && _a !== void 0 ? _a : 'idk'); }),
        q('mood', '¿Qué ánimo?', [
            opt('happy', '☀️ Alegre'),
            opt('calm', '🌙 Tranquilo'),
            opt('epic', '⚡ Épico'),
            opt('romantic', '💘 Romántico'),
            SURPRISE,
        ], true, (a) => { var _a; return ['song', 'instrumental', 'jingle', 'video', 'idk'].includes((_a = a.what) !== null && _a !== void 0 ? _a : 'idk'); }),
        q('voice', '¿Qué voz?', [
            opt('female', '👩 Femenina'),
            opt('male', '👨 Masculina'),
            opt('neutral', '🤖 Neutra'),
            SURPRISE,
        ], true, (a) => a.what === 'voice'),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            video: ['videoclip', 'video clip', 'video con ia', 'video'],
            mix: ['mezclar', 'masterizar', 'mezcla', 'máster', 'master'],
            lyrics: ['letra'],
            voice: ['voz', 'narración', 'narracion', 'locución', 'locucion', 'doblaje'],
            jingle: ['jingle', 'marca', 'comercial', 'anuncio', 'negocio', 'restaurante', 'tienda'],
            instrumental: ['beat', 'instrumental', 'pista', 'base musical'],
            song: ['canción', 'cancion', 'tema', 'song'],
        });
        if (what)
            answers.what = what;
        const style = inferByKeywords(goal, {
            urban: ['reggaet', 'urbano', 'trap', 'rap', 'hip hop', 'perreo'],
            rock: ['rock', 'metal', 'punk'],
            ballad: ['balada', 'lenta'],
            electronic: ['electrónic', 'electronic', 'techno', 'house', 'edm'],
            pop: ['pop'],
        });
        if (style)
            answers.style = style;
        const mood = inferByKeywords(goal, {
            happy: ['alegre', 'feliz', 'fiesta', 'divertid', 'bailar'],
            calm: ['tranquil', 'relaj', 'suave', 'calma', 'dormir'],
            epic: ['épic', 'epic', 'poderos', 'motivador', 'gym', 'deporte'],
            romantic: ['romántic', 'romantic', 'amor', 'enamorad'],
        });
        if (mood)
            answers.mood = mood;
        return answers;
    },
    buildPlan: (goal, answers) => {
        const what = chosen(music.questions[0], answers);
        const style = chosen(music.questions[1], answers);
        const mood = chosen(music.questions[2], answers);
        const voice = chosen(music.questions[3], answers);
        const genre = style.idk ? 'pop' : style.label.toLowerCase();
        const feel = mood.idk ? 'alegre' : mood.label.toLowerCase();
        const kind = what.idk ? 'song' : what.id;
        const brief = `${genre}, ánimo ${feel}`;
        let steps;
        let explain;
        switch (kind) {
            case 'voice': {
                const v = voice.idk ? 'una voz cálida y clara' : `una voz ${voice.label.toLowerCase()}`;
                steps = [
                    step('text', 'text.generate', 'Preparar el texto de la narración', { input: { kind: 'narration', brief: v } }),
                    step('audio', 'voice.tts', 'Grabar la voz', { dependsOn: ['text'], input: { voice: voice.id } }),
                ];
                explain = `Voy a preparar el texto y grabarlo con ${v}.${decided(voice.idk, 'elegí una voz cálida y clara')}`;
                break;
            }
            case 'lyrics':
                steps = [step('lyrics', 'text.generate', 'Escribir la letra completa', { input: { kind: 'lyrics', brief } })];
                explain = `Voy a escribir la letra completa, estilo ${genre}.${decided(style.idk, 'elegí un estilo pop')}`;
                break;
            case 'mix':
                steps = [
                    step('notes', 'text.generate', 'Escuchar tu canción y anotar la mezcla', { input: { kind: 'mixnotes', brief: goal } }),
                    step('master', 'music.generate', 'Mezclar y masterizar', { dependsOn: ['notes'], input: { mode: 'master' } }),
                ];
                explain = 'Voy a escuchar tu canción, mezclarla y masterizarla para que suene profesional.';
                break;
            case 'video':
                steps = [
                    step('concept', 'text.generate', 'Escribir la idea y la letra', { input: { kind: 'lyrics', brief } }),
                    step('song', 'music.generate', 'Crear la canción', { dependsOn: ['concept'], input: { mood: feel, genre } }),
                    step('scenes', 'image.generate', 'Crear las escenas del videoclip', { dependsOn: ['concept'], input: { count: 4, brief } }),
                    step('clip', 'video.compose', 'Armar el videoclip con tu canción', { dependsOn: ['song', 'scenes'] }),
                ];
                explain = `Voy a crear la canción (${genre}, ${feel}), las escenas y armar tu videoclip completo. No tienes que salir de Weë Music.${decided(style.idk, 'elegí un estilo pop')}${decided(mood.idk, 'con ánimo alegre')}`;
                break;
            case 'jingle':
            case 'instrumental':
                steps = [
                    step('idea', 'text.generate', kind === 'jingle' ? 'Escribir la frase del jingle' : 'Definir la idea musical', { input: { kind: 'lyrics', brief } }),
                    step('audio', 'music.generate', kind === 'jingle' ? 'Crear el jingle' : 'Crear el beat', { dependsOn: ['idea'], input: { mood: feel, genre } }),
                ];
                explain = `Voy a crear ${kind === 'jingle' ? 'un jingle corto y pegajoso' : 'un beat'} en estilo ${genre}, ánimo ${feel}.${decided(style.idk, 'elegí un estilo pop')}${decided(mood.idk, 'con ánimo alegre')}`;
                break;
            default:
                steps = [
                    step('lyrics', 'text.generate', 'Escribir la letra', { input: { kind: 'lyrics', brief } }),
                    step('song', 'music.generate', 'Crear la canción', { dependsOn: ['lyrics'], input: { mood: feel, genre } }),
                    step('cover', 'image.generate', 'Diseñar la portada', { dependsOn: ['lyrics'], input: { count: 1, brief } }),
                ];
                explain = `Voy a escribir la letra, crear la canción en estilo ${genre} con ánimo ${feel} y diseñar su portada.${decided(what.idk, 'empiezo por una canción')}${decided(style.idk, 'elegí un estilo pop')}${decided(mood.idk, 'con ánimo alegre')}`;
        }
        return { experience: 'music', goal, steps, explainToUser: explain };
    },
};
const beauty = {
    name: 'Weë Beauty',
    emoji: '💄',
    defaultGoal: 'Probar un cambio de look',
    questions: [
        q('what', '¿Qué quieres probar?', [
            opt('makeup', '💄 Un maquillaje'),
            opt('hair', '💇 Otro corte o peinado'),
            opt('haircolor', '🎨 Otro color de cabello'),
            opt('beard', '🧔 Barba o afeitado'),
            opt('outfit', '👗 Un outfit'),
            opt('nails', '💅 Uñas'),
            opt('accessories', '🕶️ Accesorios'),
            opt('skin', '🧴 Cuidado de la piel'),
            opt('face', '🪞 El estilo que va con mi rostro'),
            opt('transform', '✨ Un cambio de look completo'),
            SURPRISE,
        ]),
        q('occasion', '¿Para qué ocasión?', [
            opt('daily', '☕ Día a día'),
            opt('party', '🎉 Una fiesta'),
            opt('work', '💼 Trabajo'),
            opt('date', '💘 Una cita'),
            IDK,
        ], true, (a) => { var _a; return !['skin', 'face'].includes((_a = a.what) !== null && _a !== void 0 ? _a : ''); }),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            haircolor: ['color de cabello', 'color de pelo', 'rubio', 'rubia', 'castaño', 'castano', 'pelirroj', 'teñir', 'tenir', 'mechas', 'platinado'],
            hair: ['cabello', 'pelo', 'corte', 'peinado', 'flequillo', 'largo', 'corto'],
            makeup: ['maquillaje', 'labios', 'sombras', 'delineado', 'maquillar'],
            beard: ['barba', 'afeitad', 'bigote'],
            outfit: ['outfit', 'ropa', 'vestido', 'look casual', 'qué me pongo', 'que me pongo', 'combinar'],
            nails: ['uñas', 'unas', 'manicura'],
            accessories: ['lentes', 'gafas', 'accesorio', 'aretes', 'collar', 'bolso', 'sombrero'],
            skin: ['piel', 'rutina', 'acné', 'acne', 'manchas', 'hidrat', 'cuidado'],
            face: ['rostro', 'cara', 'mi tipo de cara', 'qué me queda', 'que me queda'],
            transform: ['cambio de look', 'transform', 'look completo', 'nueva imagen'],
        });
        if (what)
            answers.what = what;
        const occasion = inferByKeywords(goal, {
            party: ['fiesta', 'boda', 'noche', 'glam', 'evento', 'cumpleaños', 'cumpleanos'],
            work: ['trabajo', 'oficina', 'entrevista', 'profesional'],
            date: ['cita', 'romántic', 'romantic'],
            daily: ['día a día', 'dia a dia', 'diario', 'natural', 'casual'],
        });
        if (occasion)
            answers.occasion = occasion;
        return answers;
    },
    buildPlan: (goal, answers) => {
        const what = chosen(beauty.questions[0], answers);
        const occasion = chosen(beauty.questions[1], answers);
        const change = what.idk ? 'un cambio de look completo' : what.label.toLowerCase();
        const when = occasion.idk ? 'el día a día' : occasion.label.toLowerCase();
        if (what.id === 'skin') {
            return {
                experience: 'beauty',
                goal,
                steps: [
                    step('look', 'vision.describe', 'Mirar tu foto', { input: { kind: 'describe' } }),
                    step('routine', 'text.generate', 'Armar tu rutina de cuidado', { dependsOn: ['look'], input: { kind: 'skincare', brief: goal } }),
                ],
                explainToUser: 'Voy a mirar tu foto y armar una rutina de cuidado de la piel sencilla, con productos fáciles de conseguir.',
            };
        }
        if (what.id === 'face') {
            return {
                experience: 'beauty',
                goal,
                steps: [
                    step('look', 'vision.describe', 'Mirar tu rostro', { input: { kind: 'describe' } }),
                    step('advice', 'text.generate', 'Recomendarte cortes, lentes y estilos', { dependsOn: ['look'], input: { kind: 'facestyle', brief: goal } }),
                    step('try', 'image.identity_edit', 'Probar los dos estilos que mejor te van', { dependsOn: ['advice'], input: { count: 2, kind: 'look', quality: 'max', brief: 'estilos que favorecen el rostro' } }),
                ],
                explainToUser: 'Voy a mirar tu rostro, recomendarte los cortes y estilos que mejor te van y probarte dos en tu foto.',
            };
        }
        return {
            experience: 'beauty',
            goal,
            steps: [
                step('look', 'vision.describe', 'Mirar tu foto', { input: { kind: 'describe' } }),
                step('edit', what.id === 'outfit' ? 'image.try_on' : 'image.identity_edit', `Probar ${change} conservando tu rostro`, { dependsOn: ['look'], input: { count: what.id === 'outfit' ? 1 : 2, kind: 'look', quality: 'max', brief: `${change} para ${when}` } }),
            ],
            explainToUser: `Voy a probar ${change} para ${when} en dos versiones, conservando tu rostro, tu piel y la luz de la foto.${decided(what.idk, 'propongo un cambio de look completo')}${decided(occasion.idk, 'lo pensé para el día a día')}`,
        };
    },
};
const chef = {
    name: 'Weë Chef',
    emoji: '👨‍🍳',
    defaultGoal: 'Algo rico para comer hoy',
    questions: [
        q('what', '¿Qué quieres hacer?', [
            opt('recipe', '🍽️ Quiero una receta'),
            opt('cook', '🧊 Cocinar con lo que tengo'),
            opt('menu', '📋 Crear un menú'),
            opt('healthy', '🥗 Algo saludable'),
            opt('dessert', '🍰 Un postre'),
            opt('edit', '📸 Retocar la foto de mi plato'),
            opt('idk', '💡 No sé qué cocinar'),
        ]),
        /*
         * Qué cambiar en la foto. Solo aparece al retocar, y admite texto libre: la
         * persona puede elegir una de las cuatro cosas que más se piden o escribir la
         * suya ("quita la salsa del borde"). Es el mismo patrón que Weë Photo, con la
         * lista corta que pide esta primera versión.
         */
        q('change', '¿Qué quieres cambiar de la foto?', [
            opt('light', '💡 Mejorar la luz'),
            opt('background', '🪵 Cambiar el fondo'),
            opt('appetizing', '🤤 Que se vea más apetitoso'),
            opt('pro', '📷 Que parezca de restaurante'),
            opt('clean', '🧹 Quitar algo que sobra'),
            IDK,
        ], true, (a) => a.what === 'edit'),
        // Cuántos comen y cuánto tiempo hay solo importan si se va a cocinar.
        q('people', '¿Para cuántas personas?', [
            opt('1', '👤 Solo para mí'),
            opt('2', '👥 Para dos'),
            opt('4', '👨‍👩‍👧 Para la familia'),
            opt('8', '🎉 Para muchos'),
            IDK,
        ], true, (a) => a.what !== 'edit'),
        q('time', '¿Cuánto tiempo tienes?', [
            opt('15', '⚡ 15 minutos'),
            opt('30', '⏱️ Media hora'),
            opt('60', '🕐 Una hora o más'),
            opt('idk', '🤷 Da igual'),
        ], true, (a) => a.what !== 'menu' && a.what !== 'edit'),
        q('days', '¿Para cuántos días?', [
            opt('3', '📆 Tres días'),
            opt('7', '🗓️ Toda la semana'),
            IDK,
        ], true, (a) => a.what === 'menu'),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            menu: ['menú', 'menu', 'semana', 'plan de comidas', 'planificar'],
            cook: ['ingredientes', 'lo que tengo', 'nevera', 'refrigerador', 'refri', 'heladera', 'sobró', 'sobro', 'qué puedo hacer con', 'que puedo hacer con'],
            dessert: ['postre', 'torta', 'pastel', 'dulce', 'galletas', 'chocolate', 'helado'],
            healthy: ['saludable', 'sano', 'ligero', 'light', 'dieta', 'fit', 'vegan', 'vegetarian'],
            recipe: ['receta', 'cocinar', 'preparar', 'cena', 'almuerzo', 'desayuno', 'pollo', 'pasta', 'arroz', 'carne', 'pescado'],
        });
        if (what)
            answers.what = what;
        /*
         * Las claves llevan prefijo A PROPÓSITO: JavaScript enumera las propiedades que
         * parecen enteros de menor a mayor, así que esta tabla —escrita de más a menos
         * comensales— se recorría al revés (1, 2, 4, 8) y la opción más genérica ganaba
         * siempre. "Una receta para mi familia" acababa saliendo como "solo para mí".
         *
         * Y ya no está "para mi": es un posesivo que aparece en casi cualquier frase
         * ("para mi pareja", "para mis hijos", "para mi cumpleaños", "para mi jefe") y no
         * dice cuánta gente come. "para mí", con tilde, sí lo dice y se queda.
         *
         * Los números escritos con cifra ("para 4 personas") siguen sin deducirse aquí:
         * de eso se encarga el LLM, que sí sabe leerlos.
         */
        const people = inferByKeywords(goal, {
            p8: ['fiesta', 'reunión', 'reunion', 'muchos', 'invitados', 'cumpleaños', 'cumpleanos'],
            p4: ['familia', 'niños', 'ninos', 'hijos', 'cuatro'],
            p2: ['para dos', 'pareja', 'romántic', 'romantic'],
            p1: ['para mí', 'solo yo', 'una persona'],
        });
        // La clave lleva el prefijo para conservar el orden; el id de la opción es el número.
        if (people)
            answers.people = people.slice(1);
        const time = inferByKeywords(goal, {
            '15': ['rápid', 'rapid', '15 min', 'quince', 'express', 'algo rápido'],
            '30': ['media hora', '30 min', 'treinta'],
            '60': ['sin apuro', 'con tiempo', 'una hora', 'elaborad', 'fin de semana'],
        });
        if (time)
            answers.time = time;
        return answers;
    },
    buildPlan: (goal, answers) => {
        const what = chosen(chef.questions[0], answers);
        const people = chosen(chef.questions[2], answers);
        const time = chosen(chef.questions[3], answers);
        const days = chosen(chef.questions[4], answers);
        const kind = what.idk ? 'recipe' : what.id;
        /*
         * RETOCAR LA FOTO DEL PLATO.
         *
         * Aquí la foto es de la persona y el plato ya existe: no hay nada que inventar.
         * Va directa como referencia a image.edit, sin pasar por vision.describe — el
         * proveedor recibe la imagen entera, así que describírsela antes sería pagar una
         * llamada para contarle lo que ya está viendo.
         *
         * El resto de Chef sigue creando imágenes nuevas con image.generate: esta rama
         * es la única que edita.
         */
        if (kind === 'edit') {
            const change = chosen(chef.questions[1], answers);
            /*
             * Lo que se le pide al modelo y lo que se le cuenta a la persona son dos
             * textos distintos, y por eso van por separado.
             *
             * Antes se pegaba la respuesta detrás de "voy a", y con una opción colaba
             * ("voy a cambiar el fondo") pero con texto libre salía "voy a cambia el
             * fondo" y con "No sé", "voy a que se vea mejor". La frase que se lee justo
             * antes de gastar Credits no puede estar mal escrita.
             *
             * Con texto libre no se intenta encajar lo que escribió la persona en la
             * frase: se le dice que se hará eso y nada más.
             */
            const RETOQUES = {
                light: { encargo: 'mejorar la luz', frase: 'voy a mejorar la luz' },
                background: { encargo: 'cambiar el fondo', frase: 'voy a cambiar el fondo' },
                appetizing: { encargo: 'que se vea más apetitoso', frase: 'voy a hacer que se vea más apetitoso' },
                pro: { encargo: 'que parezca una foto de restaurante', frase: 'voy a darle aspecto de foto de restaurante' },
                clean: { encargo: 'quitar el objeto que sobra y rehacer lo que había detrás', frase: 'voy a quitar lo que sobra' },
                idk: { encargo: 'que se vea mejor sin cambiar el plato', frase: 'voy a mejorar su apariencia sin cambiar el plato' },
            };
            const retoque = RETOQUES[change.idk ? 'idk' : change.id];
            // Lo que viaja al proveedor: la opción elegida o, si escribió, sus palabras.
            const encargo = retoque ? retoque.encargo : change.label;
            // Lo que lee la persona: siempre una frase bien construida.
            const frase = retoque ? retoque.frase : 'aplicaré únicamente los cambios que me indicaste';
            return {
                experience: 'chef',
                goal,
                steps: [
                    step('dish', 'image.edit', 'Retocar la foto de tu plato', { input: { kind: 'dish_edit', brief: encargo, count: 1 } }),
                ],
                explainToUser: `Voy a partir de tu foto y ${frase}. El plato se queda exactamente como está.`,
            };
        }
        const forWhom = people.idk ? 'para dos' : people.label.toLowerCase();
        const minutes = time.idk ? 'sin apuro' : `en ${time.label.toLowerCase()}`;
        if (kind === 'menu') {
            const span = days.idk ? 'para la semana' : days.label.toLowerCase();
            return {
                experience: 'chef',
                goal,
                steps: [
                    step('menu', 'text.generate', 'Armar el menú', { input: { kind: 'menu', brief: `${span}, ${forWhom}` } }),
                    step('prices', 'text.search', 'Mirar cuánto cuestan los ingredientes', { dependsOn: ['menu'], input: { kind: 'shopping', brief: `precios actuales de los ingredientes del menú, con la fuente` } }),
                    step('list', 'text.generate', 'Hacer la lista de compras', { dependsOn: ['menu'], input: { kind: 'shopping', brief: 'lista de compras del menú' } }),
                ],
                explainToUser: `Voy a armar un menú ${span}, ${forWhom}, y te dejo la lista de compras.${decided(people.idk, 'lo pensé para dos')}${decided(days.idk, 'lo hago para toda la semana')}`,
            };
        }
        const piece = kind === 'cook' ? 'una receta con lo que tienes en casa' : kind === 'dessert' ? 'un postre' : kind === 'healthy' ? 'una receta saludable' : 'una receta paso a paso';
        const steps = [];
        if (kind === 'cook')
            steps.push(step('look', 'vision.describe', 'Mirar qué ingredientes tienes', { input: { kind: 'describe' } }));
        steps.push(step('recipe', 'text.generate', 'Escribir la receta paso a paso', { dependsOn: kind === 'cook' ? ['look'] : undefined, input: { kind: 'recipe', brief: `${piece} ${minutes}, ${forWhom}` } }));
        steps.push(step('dish', 'image.generate', 'Crear una foto del plato', { dependsOn: ['recipe'], input: { count: 1, kind: 'dish' } }));
        return {
            experience: 'chef',
            goal,
            steps,
            explainToUser: `Voy a preparar ${piece} ${minutes}, ${forWhom}, y una foto de cómo queda el plato.${decided(what.idk, 'te propongo algo rico y fácil con lo que sueles tener en casa')}${decided(people.idk, 'lo pensé para dos')}${decided(time.idk, 'sin apuro')}`,
        };
    },
};
/**
 * Identificadores que ya no tienen puerta propia pero siguen resolviendo.
 *
 * `remodel` era una intención aparte que armaba exactamente el mismo plan que
 * rediseñar. Se retira de la pantalla y se conserva aquí: un trabajo histórico
 * que la lleve en sus respuestas tiene que seguir abriendo (fase 2E-59).
 */
const HOME_ALIAS = { remodel: 'design' };
/**
 * Lo que cada intención cambia DE VERDAD, y lo que no debe tocar.
 *
 * Antes las seis intenciones de transformación mandaban el mismo texto al
 * modelo: elegir "Probar muebles" en vez de "Cambiar colores" no cambiaba una
 * palabra del prompt, así que tampoco cambiaba el resultado. Estas líneas son la
 * diferencia real —qué se altera y qué se deja quieto—, y van en inglés porque
 * es el idioma del resto del prompt de imagen (fase 2E-59).
 */
const HOME_FOCUS = {
    design: 'Redesign the whole room: change the furniture, the colours, the materials and the decoration to reach the requested style. Keep the walls, the windows, the doors and the proportions of the room exactly where they are.',
    furniture: 'Change ONLY the furniture: replace, add or remove furniture pieces and arrange them well. Keep the wall colour, the flooring, the ceiling, the windows and every finish exactly as they are in the photo.',
    colors: 'Change ONLY the colours, the materials, the textiles and the decorative lighting. Keep the same furniture pieces in the same places: this is a change of style and palette, not a change of furniture.',
    layout: 'Rearrange the furniture that is already in the photo to improve circulation and use of the space. Do not replace the furniture and do not redecorate: the same pieces, in better positions.',
    garden: 'Redesign this outdoor space: planting, paving, outdoor furniture and lighting. Keep the built structure — walls, façade, railings and boundaries — exactly as it is.',
    ideas: 'Create a reference interior image to inspire, in the requested style.',
};
const home = {
    name: 'Weë Home',
    emoji: '🏠',
    defaultGoal: 'Renovar un espacio de mi casa',
    questions: [
        /*
         * Seis intenciones que hacen seis cosas distintas, y una que no genera nada
         * (fase 2E-59). "Remodelar" se fue: era rediseñar con otro nombre.
         */
        q('what', '¿Qué quieres hacer?', [
            opt('design', '🏠 Rediseñar mi espacio'),
            opt('furniture', '🪑 Cambiar o probar muebles'),
            opt('colors', '🎨 Cambiar estilo y colores'),
            opt('layout', '📐 Mejorar la distribución'),
            opt('garden', '🌿 Exterior y jardín'),
            opt('ideas', '💡 Buscar ideas'),
            IDK,
        ]),
        q('space', '¿Qué espacio?', [
            opt('living', '🛋️ La sala'),
            opt('bedroom', '🛏️ Un dormitorio'),
            opt('kitchen', '🍳 La cocina'),
            opt('bath', '🛁 El baño'),
            opt('office', '💻 Mi oficina'),
            IDK,
        ], true, (a) => a.what !== 'garden'),
        /*
         * El estilo solo se pregunta donde decide algo. En "Mejorar la distribución"
         * lo que importa es dónde va cada mueble, y en "No sé qué hacer" todavía no
         * hay nada que estilizar: preguntarlo ahí es preguntar por simetría.
         */
        q('style', '¿Qué estilo?', [
            opt('modern', '🏙️ Moderno'),
            opt('cozy', '🕯️ Acogedor'),
            opt('minimal', '◻️ Minimalista'),
            opt('boho', '🌵 Boho'),
            SURPRISE,
        ], true, (a) => a.what !== 'layout' && a.what !== 'idk'),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            garden: ['jardín', 'jardin', 'terraza', 'patio', 'fachada', 'exterior', 'balcón', 'balcon'],
            colors: ['color', 'pintar', 'pintura', 'paleta'],
            furniture: ['mueble', 'sofá', 'sofa', 'mesa', 'silla', 'cama'],
            layout: ['distribución', 'distribucion', 'plano', 'espacio pequeño', 'espacio pequeno', 'aprovechar', 'organizar'],
            ideas: ['ideas', 'inspiración', 'inspiracion', 'tendencia'],
            // "Remodelar" ya no es una puerta: quien lo escribe quiere rediseñar, y se
            // le lleva ahí sin obligarle a elegir una opción que ya no existe (2E-59).
            design: ['remodel', 'reforma', 'renovar', 'piso', 'pared', 'diseñar', 'disenar', 'cómo se vería', 'como se veria', 'moderna', 'acogedor'],
        });
        if (what)
            answers.what = what;
        const space = inferByKeywords(goal, {
            living: ['sala', 'living', 'comedor'],
            bedroom: ['dormitorio', 'cuarto', 'habitación', 'habitacion', 'recámara', 'recamara'],
            kitchen: ['cocina'],
            bath: ['baño', 'bano'],
            office: ['oficina', 'escritorio', 'estudio'],
        });
        if (space)
            answers.space = space;
        const style = inferByKeywords(goal, {
            minimal: ['minimalista', 'simple', 'limpio'],
            cozy: ['acogedor', 'cálid', 'calid', 'rústic', 'rustic'],
            boho: ['boho', 'bohemio', 'plantas'],
            modern: ['moderno', 'moderna', 'contemporán', 'contemporan', 'industrial'],
        });
        if (style)
            answers.style = style;
        return answers;
    },
    buildPlan: (goal, answers) => {
        var _a, _b, _c;
        const what = chosen(home.questions[0], answers);
        const space = chosen(home.questions[1], answers);
        const style = chosen(home.questions[2], answers);
        /*
         * `remodel` ya no es una puerta propia (fase 2E-59): hacía exactamente lo
         * mismo que rediseñar. Su identificador sigue resolviendo aquí, porque un
         * trabajo antiguo que lo lleve en sus respuestas tiene que seguir armando su
         * plan. Se retiró de la pantalla, no del sistema.
         */
        const kind = (_b = HOME_ALIAS[(_a = answers.what) !== null && _a !== void 0 ? _a : '']) !== null && _b !== void 0 ? _b : (what.idk ? 'advise' : what.id);
        const room = kind === 'garden' ? 'tu exterior' : space.idk ? 'la sala' : space.label.toLowerCase();
        const look = style.idk ? 'acogedor' : style.label.toLowerCase();
        /*
         * "No sé qué hacer" no genera: mira y aconseja (fase 2E-59).
         *
         * Antes esta opción arrancaba un rediseño completo, que es decidir por quien
         * ha dicho justamente que no ha decidido —y cobrárselo—. Ahora Weë mira la
         * foto, cuenta qué ve y propone el camino; generar viene después, cuando la
         * persona ya sabe qué quiere.
         */
        if (kind === 'advise') {
            return {
                experience: 'home',
                goal,
                steps: [
                    step('look', 'vision.describe', 'Mirar la foto de tu espacio', { input: { kind: 'describe' } }),
                    step('advice', 'text.generate', 'Contarte qué veo y qué haría', { dependsOn: ['look'], input: { kind: 'advise', brief: room } }),
                ],
                explainToUser: `Voy a mirar ${room} y contarte qué cambiaría —muebles, colores, distribución— para que elijas por dónde empezar. Todavía no genero ninguna imagen.`,
            };
        }
        if (kind === 'ideas') {
            return {
                experience: 'home',
                goal,
                steps: [
                    step('ideas', 'image.generate', `Buscar ideas para ${room}`, { input: { count: 3, kind: 'space', focus: HOME_FOCUS.ideas, brief: `${room}, estilo ${look}` } }),
                    step('tips', 'text.generate', 'Explicarte cómo lograrlo', { dependsOn: ['ideas'], input: { kind: 'shopping', brief: `${room}, estilo ${look}` } }),
                ],
                explainToUser: `Voy a buscar tres ideas para ${room} en estilo ${look} y te explico cómo lograrlas.${decided(style.idk, 'elegí un estilo acogedor')}`,
            };
        }
        if (kind === 'layout') {
            return {
                experience: 'home',
                goal,
                steps: [
                    step('look', 'vision.describe', 'Mirar la foto del espacio', { input: { kind: 'describe' } }),
                    step('plan', 'text.generate', 'Proponer una distribución mejor', { dependsOn: ['look'], input: { kind: 'layout', brief: room } }),
                    step('view', 'image.space_restyle', 'Mostrarte cómo quedaría', { dependsOn: ['plan'], input: { count: 1, kind: 'space', focus: HOME_FOCUS.layout, brief: `${room}, la misma distribución nueva que acabas de proponer` } }),
                ],
                explainToUser: `Voy a mirar ${room}, proponerte una distribución que aproveche mejor el espacio y mostrarte cómo quedaría con tus mismos muebles.`,
            };
        }
        const action = kind === 'furniture' ? 'cambiar los muebles de' : kind === 'colors' ? 'cambiar el estilo y los colores de' : kind === 'garden' ? 'diseñar' : 'rediseñar';
        return {
            experience: 'home',
            goal,
            steps: [
                step('look', 'vision.describe', 'Mirar la foto del espacio', { input: { kind: 'describe' } }),
                step('restyle', 'image.space_restyle', `${action.replace(/^./, (c) => c.toUpperCase())} ${room} en estilo ${look}`, {
                    dependsOn: ['look'],
                    input: { count: 2, kind: 'space', focus: (_c = HOME_FOCUS[kind]) !== null && _c !== void 0 ? _c : HOME_FOCUS.design, brief: `${room}, estilo ${look}` },
                }),
                step('list', 'text.generate', 'Armar la lista de cambios y compras', { dependsOn: ['restyle'], input: { kind: 'shopping', brief: `${room}, estilo ${look}` } }),
            ],
            explainToUser: `Voy a ${action} ${room} en un estilo ${look}, en dos propuestas, y te dejo la lista de cambios y compras.${decided(space.idk && kind !== 'garden', 'empiezo por la sala')}${decided(style.idk, 'elegí un estilo acogedor')}`,
        };
    },
};
const business = {
    name: 'Weë Business',
    emoji: '💼',
    defaultGoal: 'Hacer crecer mi negocio',
    questions: [
        q('what', '¿En qué te ayudo?', [
            opt('idea', '💡 Ideas y estrategia'),
            opt('content', '✨ Crear contenido para mis redes'),
            opt('schedule', '📅 Programar publicaciones'),
            opt('publish', '🚀 Publicar en mis redes'),
            opt('reply', '💬 Responder a clientes'),
            opt('analyze', '📊 Analizar resultados'),
            opt('marketing', '📣 Una campaña o publicidad'),
            opt('cv', '📄 Mi CV'),
            opt('deck', '📽️ Una presentación'),
            opt('plan', '🗺️ Un plan o documento'),
            IDK,
        ]),
        q('tone', '¿Qué tan formal?', [
            opt('casual', '😊 Cercano'),
            opt('pro', '💼 Profesional'),
            IDK,
        ], true, (a) => { var _a; return !['schedule', 'publish', 'analyze'].includes((_a = a.what) !== null && _a !== void 0 ? _a : ''); }),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            reply: ['responder', 'respuesta', 'cliente', 'mensaje', 'comentario'],
            schedule: ['programar', 'calendario', 'horario', 'fecha'],
            publish: ['publicar', 'publica'],
            analyze: ['analizar', 'análisis', 'analisis', 'resultados', 'métricas', 'metricas', 'estadística', 'estadistica'],
            content: ['contenido', 'post', 'redes', 'instagram', 'tiktok', 'facebook'],
            marketing: ['campaña', 'campana', 'publicidad', 'anuncio', 'promoción', 'promocion', 'vender', 'ventas'],
            cv: ['cv', 'currículum', 'curriculum', 'hoja de vida', 'trabajo', 'carrera', 'entrevista', 'perfil profesional'],
            deck: ['presentación', 'presentacion', 'inversor', 'pitch', 'diapositiva'],
            plan: ['plan', 'documento', 'informe', 'propuesta'],
            idea: ['idea', 'emprend', 'estrategia', 'crecer'],
        });
        if (what)
            answers.what = what;
        const tone = inferByKeywords(goal, {
            pro: ['formal', 'profesional', 'inversor', 'corporativ', 'empresa'],
            casual: ['cercano', 'amigable', 'informal', 'divertido'],
        });
        if (tone)
            answers.tone = tone;
        return answers;
    },
    buildPlan: (goal, answers) => {
        const what = chosen(business.questions[0], answers);
        const tone = chosen(business.questions[1], answers);
        const voice = tone.idk ? 'profesional pero cercano' : tone.label.toLowerCase();
        const kind = what.idk ? 'idea' : what.id;
        const understand = step('analysis', 'text.generate', 'Entender tu negocio y tu objetivo', { input: { kind: 'analysis', brief: goal } });
        let steps;
        let explain;
        switch (kind) {
            case 'content':
                steps = [
                    understand,
                    step('copy', 'text.generate', 'Escribir la publicación', { dependsOn: ['analysis'], input: { kind: 'copy', brief: `tono ${voice}` } }),
                    step('image', 'image.generate', 'Crear la imagen para la publicación', { dependsOn: ['copy'], input: { count: 1, kind: 'business' } }),
                ];
                explain = `Voy a entender tu negocio, escribir la publicación con un tono ${voice} y crear la imagen que la acompaña.${decided(tone.idk, 'uso un tono profesional pero cercano')}`;
                break;
            case 'schedule':
                steps = [step('calendar', 'text.generate', 'Armar el calendario de publicaciones', { input: { kind: 'schedule', brief: goal } })];
                explain = 'Voy a armar tu calendario de publicaciones de la semana, con día, hora y red para cada una.';
                break;
            case 'publish':
                steps = [
                    step('copy', 'text.generate', 'Preparar la publicación', { input: { kind: 'copy', brief: 'lista para publicar' } }),
                    step('publish', 'text.generate', 'Dejarla lista en tus redes', { dependsOn: ['copy'], input: { kind: 'published', brief: goal } }),
                ];
                explain = 'Voy a preparar la publicación y dejarla lista en tus redes. Mientras las redes no habiliten sus permisos oficiales, la publicación es simulada.';
                break;
            case 'reply':
                steps = [step('reply', 'text.generate', 'Escribir la respuesta para tu cliente', { input: { kind: 'reply', brief: `tono ${voice}`, quality: 'standard' } })];
                explain = `Voy a escribir una respuesta amable y clara para tu cliente, lista para enviar.${decided(tone.idk, 'uso un tono cercano y profesional')}`;
                break;
            case 'analyze':
                steps = [step('metrics', 'text.generate', 'Revisar tus resultados y explicarlos', { input: { kind: 'metrics', brief: goal } })];
                explain = 'Voy a revisar tus resultados, contarte qué funcionó y qué conviene hacer esta semana.';
                break;
            case 'marketing':
                steps = [
                    understand,
                    step('campaign', 'text.generate', 'Diseñar la campaña', { dependsOn: ['analysis'], input: { kind: 'campaign', brief: `tono ${voice}` } }),
                    step('visual', 'image.generate', 'Crear la imagen de la campaña', { dependsOn: ['campaign'], input: { count: 1, kind: 'business' } }),
                ];
                explain = `Voy a entender tu negocio, diseñar la campaña con un tono ${voice} y crear su imagen principal.${decided(tone.idk, 'uso un tono profesional pero cercano')}`;
                break;
            case 'cv':
                steps = [
                    understand,
                    step('cv', 'text.generate', 'Redactar tu CV', { dependsOn: ['analysis'], input: { kind: 'cv', brief: `tono ${voice}` } }),
                ];
                explain = `Voy a entender tu experiencia y redactar tu CV con un tono ${voice}, listo para usar.${decided(tone.idk, 'uso un tono profesional')}`;
                break;
            case 'deck':
            case 'plan':
                steps = [
                    understand,
                    step('doc', 'text.generate', kind === 'deck' ? 'Escribir la presentación (diapositiva por diapositiva)' : 'Redactar el documento', { dependsOn: ['analysis'], input: { kind: 'business', brief: `tono ${voice}${kind === 'deck' ? ', organizado diapositiva por diapositiva' : ''}` } }),
                ];
                explain = `Primero entiendo tu negocio y después ${kind === 'deck' ? 'escribo la presentación diapositiva por diapositiva' : 'redacto el documento'} con un tono ${voice}.${decided(tone.idk, 'uso un tono profesional pero cercano')}`;
                break;
            default:
                // Estrategia: datos actuales del mercado con fuentes + razonamiento sobre ellos
                steps = [
                    understand,
                    step('market', 'text.search', 'Buscar cómo está tu mercado ahora', { dependsOn: ['analysis'], input: { kind: 'analysis', brief: `mercado, competencia y tendencias de ${goal}` } }),
                    step('ideas', 'text.generate', 'Proponer ideas y una estrategia', { dependsOn: ['analysis', 'market'], input: { kind: 'business', brief: `ideas para crecer, tono ${voice}`, quality: 'max' } }),
                ];
                explain = `Primero entiendo tu negocio y después te propongo ideas concretas y una estrategia para crecer.${decided(what.idk, 'empiezo por ideas concretas')}${decided(tone.idk, 'uso un tono profesional pero cercano')}`;
        }
        return { experience: 'business', goal, steps, explainToUser: explain };
    },
};
const brain = {
    name: 'Weë Brain',
    emoji: '🧠',
    defaultGoal: 'Necesito ayuda y no sé por dónde empezar',
    questions: [
        q('what', '¿En qué te ayudo?', [
            opt('learn', '📚 Quiero aprender algo'),
            opt('solve', '🧩 Resolver un problema'),
            opt('plan', '🗓️ Organizar o planear'),
            opt('translate', '🌐 Traducir o resumir'),
            opt('idk', '🤷 No sé por dónde empezar'),
        ]),
    ],
    buildPlan: (goal, answers) => {
        const what = chosen(brain.questions[0], answers);
        const need = what.idk ? 'encontrar por dónde empezar' : what.label.toLowerCase();
        return {
            experience: 'brain',
            goal,
            steps: [
                step('understand', 'text.generate', 'Entender bien lo que necesitas', { input: { kind: 'analysis', brief: need } }),
                step('answer', 'text.generate', 'Prepararte una respuesta clara con próximos pasos', { dependsOn: ['understand'], input: { kind: 'answer', brief: need } }),
            ],
            explainToUser: `Voy a entender bien lo que necesitas y te preparo una respuesta clara, con los próximos pasos.${decided(what.idk, 'te propongo un punto de partida y, si hace falta, te llevo al especialista de Weë que corresponda')}`,
        };
    },
};
exports.TEMPLATES = {
    design,
    studio,
    photo,
    writer,
    music,
    beauty,
    chef,
    home,
    business,
    brain,
};
//# sourceMappingURL=templates.js.map