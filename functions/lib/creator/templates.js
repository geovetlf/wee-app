"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATES = void 0;
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
const q = (id, text, options, allowFreeText = true) => ({
    id,
    text,
    options,
    allowFreeText,
});
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
                step('images', 'image.generate', `Crear ${count} propuestas de diseño`, { dependsOn: ['concept'], input: { count, brief: `${piece}, estilo ${look}` } }),
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
    ],
    buildPlan: (goal, answers) => {
        const type = chosen(studio.questions[0], answers);
        const style = chosen(studio.questions[1], answers);
        const kind = type.idk ? 'un video para tus redes' : type.label.toLowerCase();
        const look = style.idk ? 'cercano y con ritmo' : style.label.toLowerCase();
        return {
            experience: 'studio',
            goal,
            steps: [
                step('script', 'text.generate', 'Escribir el guion de 4 escenas', { input: { kind: 'script', brief: `${kind}, estilo ${look}, 15 segundos` } }),
                step('frames', 'image.generate', 'Crear las imágenes de cada escena', { dependsOn: ['script'], input: { count: 4 } }),
                step('voice', 'voice.tts', 'Grabar la narración', { dependsOn: ['script'] }),
                step('music', 'music.generate', 'Elegir la música', { dependsOn: ['script'], input: { mood: look } }),
                step('video', 'video.compose', 'Armar el video de 15 segundos con watermark Weë', { dependsOn: ['frames', 'voice', 'music'] }),
            ],
            explainToUser: `Voy a escribir un guion corto, crear las imágenes, grabar la narración y armar ${kind} de 15 segundos con estilo ${look}.${decided(type.idk, 'lo preparo para tus redes')}${decided(style.idk, 'elegí un estilo cercano y con ritmo')}`,
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
                action.id === 'restore' ? 'image.upscale' :
                    action.id === 'colorize' ? 'image.edit' :
                        action.id === 'retouch' ? 'image.identity_edit' :
                            action.id === 'transform' ? 'image.edit' :
                                action.id === 'generate' ? 'image.generate' : 'image.upscale';
        const what = action.idk ? 'mejorar la calidad' : action.label.toLowerCase();
        const how = detail.idk ? 'lo más natural posible' : detail.label.toLowerCase();
        const purpose = action.idk ? 'Mejorar la foto' : action.label.replace(/^./, (c) => c.toUpperCase());
        const steps = action.id === 'generate'
            ? [step('images', 'image.generate', 'Crear 3 imágenes', { input: { count: 3, brief: `${goal}, ${how}` } })]
            : [
                step('look', 'vision.describe', 'Mirar la foto para entender qué tiene', { input: { kind: 'describe' } }),
                step('edit', capability, purpose, { dependsOn: ['look'], input: { brief: `${what}, ${how}`, count: action.id === 'transform' ? 2 : 1 } }),
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
            opt('story', '📖 Una historia'),
            opt('script', '🎬 Un guion'),
            opt('email', '✉️ Un email o carta'),
            opt('fix', '✏️ Corregir un texto'),
            IDK,
        ]),
        q('tone', '¿Qué tono?', [
            opt('friendly', '😊 Cercano'),
            opt('pro', '💼 Profesional'),
            opt('fun', '😄 Divertido'),
            opt('emotional', '💛 Emotivo'),
            SURPRISE,
        ]),
    ],
    buildPlan: (goal, answers) => {
        const what = chosen(writer.questions[0], answers);
        const tone = chosen(writer.questions[1], answers);
        const piece = what.idk ? 'una publicación' : what.label.toLowerCase();
        const voice = tone.idk ? 'cercano' : tone.label.toLowerCase();
        return {
            experience: 'writer',
            goal,
            steps: [
                step('draft', 'text.generate', 'Escribir un primer borrador', { input: { kind: what.id === 'script' ? 'script' : 'copy', brief: `${piece}, tono ${voice}` } }),
                step('polish', 'text.generate', 'Pulir el texto y dejarlo listo', { dependsOn: ['draft'], input: { kind: 'polish', brief: `tono ${voice}` } }),
            ],
            explainToUser: `Voy a escribir ${piece} con un tono ${voice} y después la pulo para que quede lista para usar.${decided(what.idk, 'empiezo por una publicación')}${decided(tone.idk, 'elegí un tono cercano')}`,
        };
    },
};
const music = {
    name: 'Weë Music',
    emoji: '🎵',
    defaultGoal: 'Música para mi contenido',
    questions: [
        q('what', '¿Qué necesitas?', [
            opt('song', '🎤 Una canción'),
            opt('instrumental', '🎹 Música instrumental'),
            opt('jingle', '📣 Un jingle'),
            opt('voice', '🗣️ Una voz o narración'),
            IDK,
        ]),
        q('mood', '¿Qué ánimo?', [
            opt('happy', '☀️ Alegre'),
            opt('calm', '🌙 Tranquilo'),
            opt('epic', '⚡ Épico'),
            opt('romantic', '💘 Romántico'),
            SURPRISE,
        ]),
    ],
    buildPlan: (goal, answers) => {
        const what = chosen(music.questions[0], answers);
        const mood = chosen(music.questions[1], answers);
        const piece = what.idk ? 'una pista instrumental' : what.label.toLowerCase();
        const feel = mood.idk ? 'alegre' : mood.label.toLowerCase();
        const steps = [
            step('idea', 'text.generate', what.id === 'voice' ? 'Preparar el texto de la narración' : 'Escribir la idea y la letra', { input: { kind: what.id === 'voice' ? 'narration' : 'lyrics', brief: `${piece}, ánimo ${feel}` } }),
            what.id === 'voice'
                ? step('audio', 'voice.tts', 'Grabar la voz', { dependsOn: ['idea'] })
                : step('audio', 'music.generate', `Crear ${piece}`, { dependsOn: ['idea'], input: { mood: feel } }),
        ];
        return {
            experience: 'music',
            goal,
            steps,
            explainToUser: `Voy a preparar ${piece} con un ánimo ${feel}.${decided(what.idk, 'empiezo por una pista instrumental')}${decided(mood.idk, 'elegí un ánimo alegre')}`,
        };
    },
};
const beauty = {
    name: 'Weë Beauty',
    emoji: '💄',
    defaultGoal: 'Probar un cambio de look',
    questions: [
        q('what', '¿Qué quieres probar?', [
            opt('hair', '💇 Otro corte o color de cabello'),
            opt('makeup', '💄 Un maquillaje'),
            opt('beard', '🧔 Barba o afeitado'),
            opt('outfit', '👗 Un outfit'),
            SURPRISE,
        ]),
        q('occasion', '¿Para qué ocasión?', [
            opt('daily', '☕ Día a día'),
            opt('party', '🎉 Una fiesta'),
            opt('work', '💼 Trabajo'),
            opt('date', '💘 Una cita'),
            IDK,
        ]),
    ],
    buildPlan: (goal, answers) => {
        const what = chosen(beauty.questions[0], answers);
        const occasion = chosen(beauty.questions[1], answers);
        const change = what.idk ? 'un cambio de look completo' : what.label.toLowerCase();
        const when = occasion.idk ? 'el día a día' : occasion.label.toLowerCase();
        return {
            experience: 'beauty',
            goal,
            steps: [
                step('look', 'vision.describe', 'Mirar tu foto', { input: { kind: 'describe' } }),
                step('edit', 'image.identity_edit', `Probar ${change} conservando tu rostro`, { dependsOn: ['look'], input: { count: 2, brief: `${change} para ${when}` } }),
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
            opt('cook', '🍳 Quiero cocinar algo'),
            opt('recipe', '🍽️ Quiero una receta'),
            opt('menu', '📋 Quiero crear un menú'),
            opt('idk', '💡 No sé qué cocinar'),
        ]),
        q('time', '¿Cuánto tiempo tienes?', [
            opt('15', '⚡ 15 minutos'),
            opt('30', '⏱️ Media hora'),
            opt('60', '🕐 Una hora o más'),
            opt('idk', '🤷 Da igual'),
        ]),
    ],
    buildPlan: (goal, answers) => {
        const what = chosen(chef.questions[0], answers);
        const time = chosen(chef.questions[1], answers);
        const piece = what.id === 'menu' ? 'un menú' : 'una receta paso a paso';
        const minutes = time.idk ? 'sin apuro' : `en ${time.label.toLowerCase()}`;
        return {
            experience: 'chef',
            goal,
            steps: [
                step('recipe', 'text.generate', what.id === 'menu' ? 'Armar el menú' : 'Escribir la receta paso a paso', { input: { kind: what.id === 'menu' ? 'menu' : 'recipe', brief: `${piece} ${minutes}` } }),
                step('dish', 'image.generate', 'Crear una foto del plato', { dependsOn: ['recipe'], input: { count: 1 } }),
            ],
            explainToUser: `Voy a preparar ${piece} ${minutes} y una foto de cómo queda el plato.${decided(what.idk, 'te propongo algo rico y fácil con lo que sueles tener en casa')}`,
        };
    },
};
const home = {
    name: 'Weë Home',
    emoji: '🏠',
    defaultGoal: 'Renovar un espacio de mi casa',
    questions: [
        q('space', '¿Qué espacio?', [
            opt('living', '🛋️ La sala'),
            opt('bedroom', '🛏️ Un dormitorio'),
            opt('kitchen', '🍳 La cocina'),
            opt('garden', '🌿 Jardín o exterior'),
            IDK,
        ]),
        q('style', '¿Qué estilo?', [
            opt('modern', '🏙️ Moderno'),
            opt('cozy', '🕯️ Acogedor'),
            opt('minimal', '◻️ Minimalista'),
            opt('boho', '🌵 Boho'),
            SURPRISE,
        ]),
    ],
    buildPlan: (goal, answers) => {
        const space = chosen(home.questions[0], answers);
        const style = chosen(home.questions[1], answers);
        const room = space.idk ? 'la sala' : space.label.toLowerCase();
        const look = style.idk ? 'acogedor' : style.label.toLowerCase();
        return {
            experience: 'home',
            goal,
            steps: [
                step('look', 'vision.describe', 'Mirar la foto del espacio', { input: { kind: 'describe' } }),
                step('restyle', 'image.space_restyle', `Rediseñar ${room} en estilo ${look}`, { dependsOn: ['look'], input: { count: 2, brief: `${room}, estilo ${look}` } }),
                step('list', 'text.generate', 'Armar la lista de cambios y compras', { dependsOn: ['restyle'], input: { kind: 'shopping', brief: `${room}, estilo ${look}` } }),
            ],
            explainToUser: `Voy a rediseñar ${room} en un estilo ${look}, en dos propuestas, y te dejo la lista de cambios y compras.${decided(space.idk, 'empiezo por la sala')}${decided(style.idk, 'elegí un estilo acogedor')}`,
        };
    },
};
const business = {
    name: 'Weë Business',
    emoji: '💼',
    defaultGoal: 'Hacer crecer mi negocio',
    questions: [
        q('what', '¿En qué te ayudo?', [
            opt('idea', '💡 Ideas de negocio'),
            opt('marketing', '📣 Marketing o publicidad'),
            opt('cv', '📄 Mi CV'),
            opt('deck', '📊 Una presentación'),
            opt('plan', '🗺️ Un plan'),
            IDK,
        ]),
        q('tone', '¿Qué tan formal?', [
            opt('casual', '😊 Cercano'),
            opt('pro', '💼 Profesional'),
            IDK,
        ]),
    ],
    buildPlan: (goal, answers) => {
        const what = chosen(business.questions[0], answers);
        const tone = chosen(business.questions[1], answers);
        const piece = what.idk ? 'ideas para tu negocio' : what.label.toLowerCase();
        const voice = tone.idk ? 'profesional pero cercano' : tone.label.toLowerCase();
        const steps = [
            step('analysis', 'text.generate', 'Entender tu negocio y tu objetivo', { input: { kind: 'analysis', brief: piece } }),
            step('doc', 'text.generate', what.id === 'cv' ? 'Redactar tu CV' : what.id === 'deck' ? 'Escribir la presentación' : `Preparar ${piece}`, { dependsOn: ['analysis'], input: { kind: what.id === 'cv' ? 'cv' : 'business', brief: `${piece}, tono ${voice}` } }),
        ];
        if (what.id === 'cv' || what.id === 'deck' || what.id === 'plan') {
            steps.push(step('file', 'doc.render', what.id === 'deck' ? 'Armar las diapositivas' : 'Generar el documento listo para enviar', { dependsOn: ['doc'] }));
        }
        else if (what.id === 'marketing') {
            steps.push(step('visual', 'image.generate', 'Crear una imagen para la campaña', { dependsOn: ['doc'], input: { count: 1 } }));
        }
        return {
            experience: 'business',
            goal,
            steps,
            explainToUser: `Primero entiendo tu negocio y después preparo ${piece} con un tono ${voice}.${decided(what.idk, 'empiezo por ideas concretas para crecer')}${decided(tone.idk, 'uso un tono profesional pero cercano')}`,
        };
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