import { CapabilityId, ExperienceId, Plan, PlanStep, Question, QuestionOption } from './types';

/**
 * Plantillas por experiencia (docs/CREATOR.md §6 y §7): preguntas sencillas con
 * opciones (siempre con "🤷 No sé") y el plan de pasos que Weë ejecuta por dentro.
 *
 * Fase 0: Weë Brain usa estas plantillas de forma determinista.
 * Fase 1: el LLM (text.structure) las usa como base para preguntar y planificar.
 */
export interface ExperienceTemplate {
  name: string;
  emoji: string;
  /** Objetivo cuando la persona empieza sin escribir nada. */
  defaultGoal: string;
  questions: Question[];
  buildPlan: (goal: string, answers: Record<string, string>) => Plan;
}

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

const q = (id: string, text: string, options: QuestionOption[], allowFreeText = true): Question => ({
  id,
  text,
  options,
  allowFreeText,
});

// ─────────────────────────────────────────────────────────────────────────────

const design: ExperienceTemplate = {
  name: 'Weë Design',
  emoji: '🎨',
  defaultGoal: 'Un diseño para mi marca',
  questions: [
    q('what', '¿Qué quieres crear?', [
      opt('logo', '🏷️ Un logo'),
      opt('post', '📱 Un post para redes'),
      opt('poster', '🖼️ Un afiche o flyer'),
      opt('cover', '📚 Una portada'),
      IDK,
    ]),
    q('style', '¿Qué estilo te gusta?', [
      opt('minimal', '✨ Limpio y minimalista'),
      opt('bold', '🔥 Llamativo'),
      opt('elegant', '🎩 Elegante'),
      opt('fun', '😄 Divertido'),
      SURPRISE,
    ]),
  ],
  buildPlan: (goal, answers) => {
    const what = chosen(design.questions[0], answers);
    const style = chosen(design.questions[1], answers);
    const piece = what.idk ? 'un post para redes' : what.label.toLowerCase();
    const look = style.idk ? 'limpio y llamativo' : style.label.toLowerCase();
    return {
      experience: 'design',
      goal,
      steps: [
        step('concept', 'text.generate', 'Pensar el concepto y los textos', { input: { kind: 'concept', brief: `${piece}, estilo ${look}` } }),
        step('images', 'image.generate', 'Crear dos propuestas de diseño', { dependsOn: ['concept'], input: { count: 2, brief: `${piece}, estilo ${look}` } }),
      ],
      explainToUser: `Voy a pensar el concepto y crear dos propuestas de ${piece} con un estilo ${look}.${decided(what.idk, 'empiezo por un post para redes, que es lo más útil')}${decided(style.idk, 'elegí un estilo limpio y llamativo')}`,
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

const photo: ExperienceTemplate = {
  name: 'Weë Photo',
  emoji: '📸',
  defaultGoal: 'Mejorar una foto',
  questions: [
    q('action', '¿Qué hacemos con tu foto?', [
      opt('enhance', '✨ Mejorar la calidad'),
      opt('background', '🪄 Cambiar o quitar el fondo'),
      opt('remove', '🧽 Quitar algo que sobra'),
      opt('restore', '🕰️ Restaurar una foto vieja'),
      IDK,
    ]),
  ],
  buildPlan: (goal, answers) => {
    const action = chosen(photo.questions[0], answers);
    const capability: CapabilityId =
      action.id === 'background' ? 'image.background_remove' :
      action.id === 'remove' ? 'image.object_remove' :
      action.id === 'restore' ? 'image.upscale' :
      action.id === 'enhance' ? 'image.upscale' : 'image.edit';
    const what = action.idk ? 'mejorar la foto y dejarla lo más natural posible' : action.label.toLowerCase();
    return {
      experience: 'photo',
      goal,
      steps: [
        step('look', 'vision.describe', 'Mirar la foto para entender qué tiene', { input: { kind: 'describe' } }),
        step('edit', capability, `${action.idk ? 'Mejorar la foto' : action.label.replace(/^./, (c) => c.toUpperCase())}`, { dependsOn: ['look'], input: { brief: what } }),
      ],
      explainToUser: `Primero miro tu foto y después me encargo de ${what}. Conservo todo lo demás tal cual.${decided(action.idk, 'empiezo por mejorar la calidad')}`,
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
    const steps: PlanStep[] = [
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
