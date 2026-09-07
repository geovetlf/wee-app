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
const design = {
    name: 'Weë Design',
    emoji: '🎨',
    defaultGoal: 'Diseñar algo que imagino',
    questions: [
        q('what', '¿Qué quieres diseñar?', [
            opt('object', '🚗 Un objeto o vehículo'),
            opt('product', '🧴 Un producto o envase'),
            opt('character', '🧑‍🚀 Un personaje o criatura'),
            opt('logo', '🏷️ Un logo o identidad'),
            opt('poster', '🪧 Un afiche o pieza para redes'),
            opt('scene', '🌄 Un mundo o escena'),
            IDK,
        ]),
        q('style', '¿Qué estilo buscas?', [
            opt('realistic', '📷 Realista'),
            opt('futuristic', '🚀 Futurista'),
            opt('elegant', '🎩 Elegante'),
            opt('fun', '😄 Divertido'),
            opt('minimal', '✨ Minimalista'),
            SURPRISE,
        ]),
        q('purpose', '¿Para qué lo necesitas?', [
            opt('pitch', '💼 Para vender una idea'),
            opt('brand', '🏷️ Para una marca'),
            opt('project', '📁 Para un proyecto'),
            opt('imagine', '🎨 Solo quiero imaginarlo'),
            IDK,
        ]),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            logo: ['logo', 'logotipo', 'identidad', 'marca'],
            poster: ['afiche', 'flyer', 'poster', 'póster', 'post ', 'publicidad', 'anuncio', 'redes', 'instagram', 'portada'],
            character: ['personaje', 'criatura', 'mascota', 'héroe', 'heroe', 'robot', 'monstruo', 'avatar'],
            scene: ['mundo', 'escena', 'paisaje', 'ciudad', 'ambiente', 'planeta'],
            product: ['botella', 'vaso', 'envase', 'empaque', 'packaging', 'zapatilla', 'ropa', 'mueble', 'silla', 'mesa', 'lámpara', 'lampara', 'producto', 'celular', 'reloj', 'juguete'],
            object: ['auto', 'carro', 'coche', 'vehículo', 'vehiculo', 'moto', 'helicóptero', 'helicoptero', 'avión', 'avion', 'dron', 'nave', 'casa', 'edificio', 'máquina', 'maquina', 'motor', 'invento'],
        });
        if (what)
            answers.what = what;
        const style = inferByKeywords(goal, {
            futuristic: ['futurista', 'del futuro', 'futuro', 'espacial', 'cyber'],
            realistic: ['realista', 'foto', 'real '],
            elegant: ['elegante', 'lujo', 'premium', 'sofisticad'],
            fun: ['divertid', 'infantil', 'caricatura', 'cartoon', 'para niños'],
            minimal: ['minimalista', 'simple', 'limpio', 'sencillo'],
        });
        if (style)
            answers.style = style;
        return answers;
    },
    buildPlan: (goal, answers) => {
        const what = chosen(design.questions[0], answers);
        const style = chosen(design.questions[1], answers);
        const purpose = chosen(design.questions[2], answers);
        const piece = what.idk ? 'lo que describiste' : what.label.toLowerCase();
        const look = style.idk ? 'realista y cuidado' : style.label.toLowerCase();
        const use = purpose.idk ? 'para que lo veas y decidas' : purpose.label.toLowerCase();
        const count = what.id === 'logo' ? 3 : 3;
        return {
            experience: 'design',
            goal,
            steps: [
                step('concept', 'text.generate', 'Definir el concepto', { input: { kind: 'concept', brief: `${piece}, estilo ${look}, ${use}` } }),
                step('images', 'image.generate', `Crear ${count} propuestas de diseño`, { dependsOn: ['concept'], input: { count, kind: what.id === 'logo' ? 'design' : 'design', brief: `${piece}, estilo ${look}` } }),
            ],
            explainToUser: `Voy a definir el concepto y crear ${count} propuestas de ${piece}, con un estilo ${look}, ${use}.${decided(what.idk, 'me guío por lo que escribiste')}${decided(style.idk, 'elegí un estilo realista y cuidado')}${decided(purpose.idk, 'lo preparo para que lo veas y decidas')}`,
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
                step('script', 'text.generate', 'Escribir el guion de 3 escenas', { input: { kind: 'script', brief: `${kind}, estilo ${look}, 10 segundos, formato ${format}` } }),
                step('clip', 'video.generate', 'Generar el video', { dependsOn: ['script'], input: { kind: 'clip', brief: `${kind}, estilo ${look}`, durationSec: 10, aspectRatio } }),
                step('voice', 'voice.tts', 'Grabar la narración', { dependsOn: ['script'], input: { kind: 'narration' } }),
            ],
            explainToUser: `Voy a escribir un guion corto, generar ${kind} de 10 segundos, ${format}, con estilo ${look}, y grabar la narración.${decided(type.idk, 'lo preparo para tus redes')}${decided(style.idk, 'elegí un estilo cercano y con ritmo')}${decided(where.idk, 'lo hago vertical, que sirve para Instagram y TikTok')}`,
        };
    },
};
const photo = {
    name: 'Weë Photo',
    emoji: '📸',
    defaultGoal: 'Mejorar una foto',
    questions: [
        q('action', '¿Qué hacemos con tu foto?', [
            opt('enhance', '✨ Mejorar la calidad'),
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
                step('edit', capability, purpose, { dependsOn: ['look'], input: { kind: editKind, brief: `${what}, ${how}`, count: action.id === 'transform' ? 2 : 1 } }),
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
            steps: [step(id, 'text.generate', purpose, { input: { kind: textKind, brief } })],
            explainToUser: '',
        });
        switch (kind) {
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
                        step('draft', 'text.generate', purpose, { input: { kind: textKind, brief: `tono ${voice}` } }),
                        step('polish', 'text.generate', 'Pulir el texto y dejarlo listo', { dependsOn: ['draft'], input: { kind: 'polish', brief: `tono ${voice}` } }),
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
                    step('try', 'image.identity_edit', 'Probar los dos estilos que mejor te van', { dependsOn: ['advice'], input: { count: 2, kind: 'look', brief: 'estilos que favorecen el rostro' } }),
                ],
                explainToUser: 'Voy a mirar tu rostro, recomendarte los cortes y estilos que mejor te van y probarte dos en tu foto.',
            };
        }
        return {
            experience: 'beauty',
            goal,
            steps: [
                step('look', 'vision.describe', 'Mirar tu foto', { input: { kind: 'describe' } }),
                step('edit', 'image.identity_edit', `Probar ${change} conservando tu rostro`, { dependsOn: ['look'], input: { count: 2, kind: 'look', brief: `${change} para ${when}` } }),
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
            opt('idk', '💡 No sé qué cocinar'),
        ]),
        q('people', '¿Para cuántas personas?', [
            opt('1', '👤 Solo para mí'),
            opt('2', '👥 Para dos'),
            opt('4', '👨‍👩‍👧 Para la familia'),
            opt('8', '🎉 Para muchos'),
            IDK,
        ]),
        q('time', '¿Cuánto tiempo tienes?', [
            opt('15', '⚡ 15 minutos'),
            opt('30', '⏱️ Media hora'),
            opt('60', '🕐 Una hora o más'),
            opt('idk', '🤷 Da igual'),
        ], true, (a) => a.what !== 'menu'),
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
        const people = inferByKeywords(goal, {
            '8': ['fiesta', 'reunión', 'reunion', 'muchos', 'invitados', 'cumpleaños', 'cumpleanos'],
            '4': ['familia', 'niños', 'ninos', 'hijos', 'cuatro'],
            '2': ['para dos', 'pareja', 'romántic', 'romantic'],
            '1': ['para mí', 'para mi', 'solo yo', 'una persona'],
        });
        if (people)
            answers.people = people;
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
        const people = chosen(chef.questions[1], answers);
        const time = chosen(chef.questions[2], answers);
        const days = chosen(chef.questions[3], answers);
        const kind = what.idk ? 'recipe' : what.id;
        const forWhom = people.idk ? 'para dos' : people.label.toLowerCase();
        const minutes = time.idk ? 'sin apuro' : `en ${time.label.toLowerCase()}`;
        if (kind === 'menu') {
            const span = days.idk ? 'para la semana' : days.label.toLowerCase();
            return {
                experience: 'chef',
                goal,
                steps: [
                    step('menu', 'text.generate', 'Armar el menú', { input: { kind: 'menu', brief: `${span}, ${forWhom}` } }),
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
const home = {
    name: 'Weë Home',
    emoji: '🏠',
    defaultGoal: 'Renovar un espacio de mi casa',
    questions: [
        q('what', '¿Qué quieres hacer?', [
            opt('design', '🛋️ Diseñar el espacio'),
            opt('remodel', '🧱 Remodelar'),
            opt('furniture', '🪑 Probar muebles'),
            opt('colors', '🎨 Cambiar colores'),
            opt('layout', '📐 Mejorar la distribución'),
            opt('ideas', '💡 Buscar ideas'),
            opt('garden', '🌿 Exterior y jardín'),
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
        q('style', '¿Qué estilo?', [
            opt('modern', '🏙️ Moderno'),
            opt('cozy', '🕯️ Acogedor'),
            opt('minimal', '◻️ Minimalista'),
            opt('boho', '🌵 Boho'),
            SURPRISE,
        ]),
    ],
    infer: (goal) => {
        const answers = {};
        const what = inferByKeywords(goal, {
            garden: ['jardín', 'jardin', 'terraza', 'patio', 'fachada', 'exterior', 'balcón', 'balcon'],
            colors: ['color', 'pintar', 'pintura', 'paleta'],
            furniture: ['mueble', 'sofá', 'sofa', 'mesa', 'silla', 'cama'],
            layout: ['distribución', 'distribucion', 'plano', 'espacio pequeño', 'espacio pequeno', 'aprovechar', 'organizar'],
            remodel: ['remodel', 'piso', 'pared', 'reforma', 'renovar'],
            ideas: ['ideas', 'inspiración', 'inspiracion', 'tendencia'],
            design: ['diseñar', 'disenar', 'cómo se vería', 'como se veria', 'moderna', 'acogedor'],
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
        const what = chosen(home.questions[0], answers);
        const space = chosen(home.questions[1], answers);
        const style = chosen(home.questions[2], answers);
        const kind = what.idk ? 'design' : what.id;
        const room = kind === 'garden' ? 'tu exterior' : space.idk ? 'la sala' : space.label.toLowerCase();
        const look = style.idk ? 'acogedor' : style.label.toLowerCase();
        if (kind === 'ideas') {
            return {
                experience: 'home',
                goal,
                steps: [
                    step('ideas', 'image.generate', `Buscar ideas para ${room}`, { input: { count: 3, kind: 'space', brief: `${room}, estilo ${look}` } }),
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
                    step('view', 'image.space_restyle', 'Mostrarte cómo quedaría', { dependsOn: ['plan'], input: { count: 1, kind: 'space', brief: `${room}, distribución nueva` } }),
                ],
                explainToUser: `Voy a mirar ${room}, proponerte una distribución que aproveche mejor el espacio y mostrarte cómo quedaría.`,
            };
        }
        const action = kind === 'remodel' ? 'remodelar' : kind === 'furniture' ? 'probar muebles nuevos en' : kind === 'colors' ? 'cambiar los colores de' : kind === 'garden' ? 'diseñar' : 'rediseñar';
        return {
            experience: 'home',
            goal,
            steps: [
                step('look', 'vision.describe', 'Mirar la foto del espacio', { input: { kind: 'describe' } }),
                step('restyle', 'image.space_restyle', `${action.replace(/^./, (c) => c.toUpperCase())} ${room} en estilo ${look}`, { dependsOn: ['look'], input: { count: 2, kind: 'space', brief: `${room}, estilo ${look}` } }),
                step('list', 'text.generate', 'Armar la lista de cambios y compras', { dependsOn: ['restyle'], input: { kind: 'shopping', brief: `${room}, estilo ${look}` } }),
            ],
            explainToUser: `Voy a ${action} ${room} en un estilo ${look}, en dos propuestas, y te dejo la lista de cambios y compras.${decided(what.idk, 'empiezo por rediseñarlo')}${decided(space.idk && kind !== 'garden', 'empiezo por la sala')}${decided(style.idk, 'elegí un estilo acogedor')}`,
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
                steps = [step('reply', 'text.generate', 'Escribir la respuesta para tu cliente', { input: { kind: 'reply', brief: `tono ${voice}` } })];
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
                steps = [
                    understand,
                    step('ideas', 'text.generate', 'Proponer ideas y una estrategia', { dependsOn: ['analysis'], input: { kind: 'business', brief: `ideas para crecer, tono ${voice}` } }),
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