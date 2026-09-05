import { CapabilityId, ExperienceId, Plan, PlanStep, Question, QuestionOption } from './types';

/**
 * Plantillas por experiencia (docs/CREATOR.md §6 y §7): preguntas sencillas con
 * opciones (siempre con "🤷 No sé") y el plan de pasos que Weë ejecuta por dentro.
 *
 * Fase 0: Weë Brain usa estas plantillas de forma determinista.
 * Fase 1: el LLM (text.structure) las usa como base para preguntar y planificar.
 */
/** Pregunta de plantilla: puede depender de respuestas anteriores (when). */
export type TemplateQuestion = Question & {
  when?: (answers: Record<string, string>) => boolean;
};

/** Copia sin la condición, tal como se guarda y se envía a la app. */
export const plainQuestion = (question: TemplateQuestion): Question => ({
  id: question.id,
  text: question.text,
  options: question.options,
  allowFreeText: question.allowFreeText,
});

export interface ExperienceTemplate {
  name: string;
  emoji: string;
  /** Objetivo cuando la persona empieza sin escribir nada. */
  defaultGoal: string;
  questions: TemplateQuestion[];
  buildPlan: (goal: string, answers: Record<string, string>) => Plan;
  /** Respuestas que se deducen del texto de la persona (sin LLM): questionId → optionId. */
  infer?: (goal: string) => Record<string, string>;
}

/** Devuelve el optionId cuya lista de palabras aparece en el texto. */
const inferByKeywords = (text: string, table: Record<string, string[]>): string | undefined => {
  const lower = text.toLowerCase();
  for (const [optionId, words] of Object.entries(table)) {
    if (words.some((w) => lower.includes(w))) return optionId;
  }
  return undefined;
};

const IDK: QuestionOption = { id: 'idk', label: '🤷 No sé' };
const SURPRISE: QuestionOption = { id: 'idk', label: '🤷 Sorpréndeme' };
const opt = (id: string, label: string): QuestionOption => ({ id, label });

const step = (
  id: string,
  capability: CapabilityId,
  purpose: string,
  extra: { dependsOn?: string[]; input?: Record<string, unknown> } = {}
): PlanStep => ({ id, capability, purpose, ...extra });

/** Etiqueta legible de una opción (sin el emoji), o el texto libre de la persona. */
const chosen = (question: Question, answers: Record<string, string>): { id: string; label: string; idk: boolean } => {
  const value = answers[question.id] ?? 'idk';
  const option = question.options.find((o) => o.id === value);
  if (option) {
    return { id: option.id, label: option.label.replace(/^\S+\s+/, ''), idk: option.id === 'idk' };
  }
  return { id: 'free', label: value, idk: value.trim().length === 0 };
};

/** Frase didáctica cuando la persona eligió "No sé": Weë decide y lo explica. */
const decided = (idk: boolean, what: string) => (idk ? ` Como no estabas seguro, ${what}.` : '');

const q = (
  id: string,
  text: string,
  options: QuestionOption[],
  allowFreeText = true,
  when?: (answers: Record<string, string>) => boolean
): TemplateQuestion => ({
  id,
  text,
  options,
  allowFreeText,
  ...(when ? { when } : {}),
});

// ─────────────────────────────────────────────────────────────────────────────

const design: ExperienceTemplate = {
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
    const answers: Record<string, string> = {};
    const what = inferByKeywords(goal, {
      logo: ['logo', 'logotipo', 'identidad', 'marca'],
      poster: ['afiche', 'flyer', 'poster', 'póster', 'post ', 'publicidad', 'anuncio', 'redes', 'instagram', 'portada'],
      character: ['personaje', 'criatura', 'mascota', 'héroe', 'heroe', 'robot', 'monstruo', 'avatar'],
      scene: ['mundo', 'escena', 'paisaje', 'ciudad', 'ambiente', 'planeta'],
      product: ['botella', 'vaso', 'envase', 'empaque', 'packaging', 'zapatilla', 'ropa', 'mueble', 'silla', 'mesa', 'lámpara', 'lampara', 'producto', 'celular', 'reloj', 'juguete'],
      object: ['auto', 'carro', 'coche', 'vehículo', 'vehiculo', 'moto', 'helicóptero', 'helicoptero', 'avión', 'avion', 'dron', 'nave', 'casa', 'edificio', 'máquina', 'maquina', 'motor', 'invento'],
    });
    if (what) answers.what = what;
    const style = inferByKeywords(goal, {
      futuristic: ['futurista', 'del futuro', 'futuro', 'espacial', 'cyber'],
      realistic: ['realista', 'foto', 'real '],
      elegant: ['elegante', 'lujo', 'premium', 'sofisticad'],
      fun: ['divertid', 'infantil', 'caricatura', 'cartoon', 'para niños'],
      minimal: ['minimalista', 'simple', 'limpio', 'sencillo'],
    });
    if (style) answers.style = style;
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

const studio: ExperienceTemplate = {
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
    const answers: Record<string, string> = {};
    const type = inferByKeywords(goal, {
      animate: ['animar', 'anima', 'animación de una foto', 'cobre vida', 'mi foto', 'una foto', 'imagen'],
      promo: ['promocion', 'anuncio', 'publicidad', 'vender', 'oferta', 'negocio', 'restaurante', 'tienda', 'producto', 'comercial'],
      story: ['historia', 'cuento', 'relato', 'escena por escena', 'película', 'pelicula'],
      social: ['redes', 'instagram', 'tiktok', 'reel', 'youtube', 'saludo', 'mascota', 'presentación', 'presentacion'],
    });
    if (type) answers.type = type;
    const style = inferByKeywords(goal, {
      fun: ['divertid', 'gracioso', 'humor', 'mascota'],
      elegant: ['elegante', 'premium', 'lujo', 'sofisticad'],
      impact: ['impact', 'épic', 'epic', 'potente', 'fuerte'],
      warm: ['cercano', 'cálido', 'calido', 'familiar', 'saludo', 'especial'],
    });
    if (style) answers.style = style;
    const where = inferByKeywords(goal, {
      vertical: ['instagram', 'tiktok', 'reel', 'historia de instagram', 'vertical'],
      horizontal: ['youtube', 'horizontal', 'pantalla'],
      square: ['whatsapp', 'facebook'],
    });
    if (where) answers.where = where;
    return answers;
  },
  buildPlan: (goal, answers) => {
    const type = chosen(studio.questions[0], answers);
    const style = chosen(studio.questions[1], answers);
    const where = chosen(studio.questions[2], answers);
    const kind = type.idk ? 'un video para tus redes' : type.label.toLowerCase();
    const look = style.idk ? 'cercano y con ritmo' : style.label.toLowerCase();
    const format = where.id === 'horizontal' ? 'horizontal para YouTube' : where.id === 'square' ? 'cuadrado para WhatsApp y Facebook' : 'vertical para Instagram y TikTok';
    if (type.id === 'animate') {
      return {
        experience: 'studio',
        goal,
        steps: [
          step('look', 'vision.describe', 'Mirar tu foto', { input: { kind: 'describe' } }),
          step('motion', 'video.image_to_video', 'Darle movimiento a la foto', { dependsOn: ['look'], input: { brief: look } }),
          step('video', 'video.compose', 'Armar el video de 15 segundos con watermark Weë', { dependsOn: ['motion'] }),
        ],
        explainToUser: `Voy a mirar tu foto, darle movimiento con un estilo ${look} y armar un video de 15 segundos listo para compartir.${decided(style.idk, 'elegí un estilo cercano y con ritmo')}`,
      };
    }
    return {
      experience: 'studio',
      goal,
      steps: [
        step('script', 'text.generate', 'Escribir el guion de 4 escenas', { input: { kind: 'script', brief: `${kind}, estilo ${look}, 15 segundos, formato ${format}` } }),
        step('frames', 'image.generate', 'Crear las imágenes de cada escena', { dependsOn: ['script'], input: { count: 4 } }),
        step('voice', 'voice.tts', 'Grabar la narración', { dependsOn: ['script'] }),
        step('music', 'music.generate', 'Elegir la música', { dependsOn: ['script'], input: { mood: look } }),
        step('video', 'video.compose', `Armar el video ${format} de 15 segundos con watermark Weë`, { dependsOn: ['frames', 'voice', 'music'] }),
      ],
      explainToUser: `Voy a escribir un guion corto, crear las imágenes, grabar la narración y armar ${kind} de 15 segundos, ${format}, con estilo ${look}.${decided(type.idk, 'lo preparo para tus redes')}${decided(style.idk, 'elegí un estilo cercano y con ritmo')}${decided(where.idk, 'lo hago vertical, que sirve para Instagram y TikTok')}`,
    };
  },
};

const photo: ExperienceTemplate = {
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
    const answers: Record<string, string> = {};
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
    if (action) answers.action = action;
    const detail = inferByKeywords(goal, {
      vivid: ['vivos', 'vibrante', 'más color', 'mas color'],
      clean: ['fondo blanco', 'fondo limpio', 'limpio', 'blanco'],
      artistic: ['vintage', 'artístic', 'artistic', 'caricatura', 'anime', 'pintura'],
      natural: ['natural', 'que no se note', 'sutil'],
    });
    if (detail) answers.detail = detail;
    return answers;
  },
  buildPlan: (goal, answers) => {
    const action = chosen(photo.questions[0], answers);
    const detail = chosen(photo.questions[1], answers);
    const capability: CapabilityId =
      action.id === 'background' ? 'image.background_remove' :
      action.id === 'remove' ? 'image.object_remove' :
      action.id === 'restore' ? 'image.upscale' :
      action.id === 'colorize' ? 'image.edit' :
      action.id === 'retouch' ? 'image.identity_edit' :
      action.id === 'transform' ? 'image.edit' :
      action.id === 'generate' ? 'image.generate' : 'image.upscale';
    const what = action.idk ? 'mejorar la calidad' : action.label.toLowerCase();
    const how = detail.idk ? 'lo más natural posible' : detail.label.toLowerCase();
    const purpose = action.idk ? 'Mejorar la foto' : action.label.replace(/^./, (c) => c.toUpperCase());
    const steps: PlanStep[] =
      action.id === 'generate'
        ? [step('images', 'image.generate', 'Crear 3 imágenes', { input: { count: 3, brief: `${goal}, ${how}` } })]
        : [
            step('look', 'vision.describe', 'Mirar la foto para entender qué tiene', { input: { kind: 'describe' } }),
            step('edit', capability, purpose, { dependsOn: ['look'], input: { brief: `${what}, ${how}`, count: action.id === 'transform' ? 2 : 1 } }),
          ];
    return {
      experience: 'photo',
      goal,
      steps,
      explainToUser:
        action.id === 'generate'
          ? `Voy a crear 3 imágenes a partir de lo que me contaste, ${how}.${decided(detail.idk, 'las hago lo más naturales posible')}`
          : `Primero miro tu foto y después me encargo de ${what}, ${how}. Conservo todo lo demás tal cual.${decided(action.idk, 'empiezo por mejorar la calidad')}${decided(detail.idk, 'lo hago lo más natural posible')}`,
    };
  },
};

const writer: ExperienceTemplate = {
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

const music: ExperienceTemplate = {
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
    ], true, (a) => ['song', 'instrumental', 'jingle', 'video', 'lyrics', 'idk'].includes(a.what ?? 'idk')),
    q('mood', '¿Qué ánimo?', [
      opt('happy', '☀️ Alegre'),
      opt('calm', '🌙 Tranquilo'),
      opt('epic', '⚡ Épico'),
      opt('romantic', '💘 Romántico'),
      SURPRISE,
    ], true, (a) => ['song', 'instrumental', 'jingle', 'video', 'idk'].includes(a.what ?? 'idk')),
    q('voice', '¿Qué voz?', [
      opt('female', '👩 Femenina'),
      opt('male', '👨 Masculina'),
      opt('neutral', '🤖 Neutra'),
      SURPRISE,
    ], true, (a) => a.what === 'voice'),
  ],
  infer: (goal) => {
    const answers: Record<string, string> = {};
    const what = inferByKeywords(goal, {
      video: ['videoclip', 'video clip', 'video con ia', 'video'],
      mix: ['mezclar', 'masterizar', 'mezcla', 'máster', 'master'],
      lyrics: ['letra'],
      voice: ['voz', 'narración', 'narracion', 'locución', 'locucion', 'doblaje'],
      jingle: ['jingle', 'marca', 'comercial', 'anuncio', 'negocio', 'restaurante', 'tienda'],
      instrumental: ['beat', 'instrumental', 'pista', 'base musical'],
      song: ['canción', 'cancion', 'tema', 'song'],
    });
    if (what) answers.what = what;
    const style = inferByKeywords(goal, {
      urban: ['reggaet', 'urbano', 'trap', 'rap', 'hip hop', 'perreo'],
      rock: ['rock', 'metal', 'punk'],
      ballad: ['balada', 'lenta'],
      electronic: ['electrónic', 'electronic', 'techno', 'house', 'edm'],
      pop: ['pop'],
    });
    if (style) answers.style = style;
    const mood = inferByKeywords(goal, {
      happy: ['alegre', 'feliz', 'fiesta', 'divertid', 'bailar'],
      calm: ['tranquil', 'relaj', 'suave', 'calma', 'dormir'],
      epic: ['épic', 'epic', 'poderos', 'motivador', 'gym', 'deporte'],
      romantic: ['romántic', 'romantic', 'amor', 'enamorad'],
    });
    if (mood) answers.mood = mood;
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
    let steps: PlanStep[];
    let explain: string;
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

const beauty: ExperienceTemplate = {
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

const chef: ExperienceTemplate = {
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

const home: ExperienceTemplate = {
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

const business: ExperienceTemplate = {
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
    const steps: PlanStep[] = [
      step('analysis', 'text.generate', 'Entender tu negocio y tu objetivo', { input: { kind: 'analysis', brief: piece } }),
      step('doc', 'text.generate', what.id === 'cv' ? 'Redactar tu CV' : what.id === 'deck' ? 'Escribir la presentación' : `Preparar ${piece}`, { dependsOn: ['analysis'], input: { kind: what.id === 'cv' ? 'cv' : 'business', brief: `${piece}, tono ${voice}` } }),
    ];
    if (what.id === 'cv' || what.id === 'deck' || what.id === 'plan') {
      steps.push(step('file', 'doc.render', what.id === 'deck' ? 'Armar las diapositivas' : 'Generar el documento listo para enviar', { dependsOn: ['doc'] }));
    } else if (what.id === 'marketing') {
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

const brain: ExperienceTemplate = {
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

export const TEMPLATES: Record<ExperienceId, ExperienceTemplate> = {
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
