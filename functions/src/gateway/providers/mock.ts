import { CapabilityId, ExperienceId } from '../../creator/types';
import { GatewayContext, ProviderAdapter, ProviderOutput, ProviderResult } from '../types';
import { MAX_PROPUESTAS_POR_PASO } from '../../engine/types';

/**
 * Proveedor de prueba (modo demo): devuelve resultados de muestra sin llamar a
 * ninguna API ni gastar dinero. Sirve para construir y probar toda la experiencia
 * guiada antes de conectar proveedores reales.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * Un emoji por experiencia. El Record es TOTAL sobre `ExperienceId` para que no
 * se repita lo de siempre: esto tenía diez y se quedó sin Weë Travel cuando
 * llegó la undécima, sin que nadie lo notara —el `?? '✨'` de abajo lo tapaba—.
 * El emoji de Travel es el que la experiencia ya tiene en la app, no uno nuevo.
 */
const EMOJI: Record<ExperienceId, string> = {
  design: '🎨', studio: '🎬', photo: '📸', writer: '✍️', music: '🎵',
  beauty: '💄', chef: '👨‍🍳', home: '🏠', business: '💼', travel: '✈️', brain: '🧠',
};

const escapeXml = (value: string) =>
  value.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));

const wrap = (text: string, maxChars: number, maxLines: number): string[] => {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
};

/** Imagen SVG de muestra (tarjeta blanca sobre amarillo Weë) como data URI. */
const demoImage = (title: string, subtitle: string, emoji: string): string => {
  const titleLines = wrap(title, 24, 5);
  const subtitleLines = wrap(subtitle, 40, 2);
  const titleSpans = titleLines
    .map((line, i) => `<tspan x="70" dy="${i === 0 ? 0 : 60}">${escapeXml(line)}</tspan>`)
    .join('');
  const subtitleSpans = subtitleLines
    .map((line, i) => `<tspan x="70" dy="${i === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">` +
    `<rect width="800" height="1000" fill="#F5B731"/>` +
    `<rect x="40" y="40" width="720" height="920" rx="36" fill="#FFFFFF"/>` +
    `<text x="70" y="170" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial, sans-serif" font-size="110">${emoji}</text>` +
    `<text x="70" y="330" font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="700" fill="#1F2937">${titleSpans}</text>` +
    `<text x="70" y="820" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#6B7280">${subtitleSpans}</text>` +
    `<text x="70" y="920" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="2" fill="#9A6A00">VISTA PREVIA · MODO DEMO</text>` +
    `</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
};

const DEMO_NOTE = 'Resultado de muestra (modo demo). Cuando esta experiencia esté conectada a sus IA, aquí verás el contenido real, en tu tono y listo para usar.';

/** Textos de muestra según el tipo de pieza que pidió la plantilla. */
const demoText = (kind: string, purpose: string, brief: string, ctx: GatewayContext): string => {
  const goal = ctx.goal;
  switch (kind) {
    case 'recipe':
      return [
        `🍽️ ${goal}`,
        '',
        'Ingredientes (2 personas):',
        '• 2 tazas del ingrediente principal',
        '• 1 cebolla, 2 dientes de ajo',
        '• Aceite de oliva, sal y pimienta',
        '• Hierbas frescas para terminar',
        '',
        'Paso a paso:',
        '1. Sofríe la cebolla y el ajo 3 minutos.',
        '2. Agrega el ingrediente principal y cocina a fuego medio.',
        '3. Ajusta sal y pimienta; termina con las hierbas.',
        '4. Sirve caliente. Listo en unos 25 minutos.',
        '',
        DEMO_NOTE,
      ].join('\n');
    case 'menu':
      return [
        `📋 Menú para: ${goal}`,
        '',
        'Lunes · Ensalada tibia con pollo',
        'Martes · Pasta con verduras asadas',
        'Miércoles · Sopa de lentejas y pan',
        'Jueves · Tacos de pescado',
        'Viernes · Pizza casera',
        '',
        DEMO_NOTE,
      ].join('\n');
    case 'script':
      return [
        `🎬 Guion · ${goal}`,
        '',
        'Escena 1 (0–4 s): plano cercano del producto con luz cálida. Texto: "Hoy toca algo especial".',
        'Escena 2 (4–8 s): manos preparándolo; sonido ambiente.',
        'Escena 3 (8–12 s): la persona lo disfruta; sonrisa.',
        'Escena 4 (12–15 s): logo + "Ven a probarlo".',
        '',
        `Estilo: ${brief || 'cercano y con ritmo'}.`,
        '',
        DEMO_NOTE,
      ].join('\n');
    case 'lyrics':
      return [
        `🎵 Idea musical · ${goal}`,
        '',
        'Estribillo:',
        '"Hoy el día empieza bien, / todo brilla otra vez, / ven conmigo, ven."',
        '',
        `Ánimo: ${brief || 'alegre'}. Tempo medio, voz cercana.`,
        '',
        DEMO_NOTE,
      ].join('\n');
    case 'narration':
      return `🗣️ Narración · ${goal}\n\n"Bienvenidos. Hoy quiero contarles algo que preparamos con mucho cariño…"\n\n${DEMO_NOTE}`;
    case 'shopping':
      return [
        `🛒 Cambios y compras · ${goal}`,
        '',
        '• Pintar la pared principal en un tono cálido',
        '• Una lámpara de pie junto al sofá',
        '• Cojines y una manta en dos tonos',
        '• Una planta grande cerca de la ventana',
        '',
        DEMO_NOTE,
      ].join('\n');
    case 'cv':
      return `📄 CV · ${goal}\n\nPerfil: profesional con experiencia comprobada, orientado a resultados y trabajo en equipo.\n\nExperiencia:\n• Puesto reciente — logros medibles\n• Puesto anterior — responsabilidades clave\n\nHabilidades: comunicación, organización, herramientas digitales.\n\n${DEMO_NOTE}`;
    case 'reply':
      return `💬 Respuesta para tu cliente\n\n"¡Hola! Gracias por escribirnos 😊 Sí, tenemos justo lo que buscas. Te cuento los detalles y, si quieres, te lo reservo ahora mismo. ¿Para cuándo lo necesitas?"\n\nConsejo: responde en menos de una hora; los clientes que reciben respuesta rápida compran el doble.\n\n${DEMO_NOTE}`;
    case 'schedule':
      return [
        `📅 Calendario de la semana · ${goal}`,
        '',
        'Lun 12:00 · Instagram · Foto del plato del día',
        'Mar 19:00 · Facebook · Promo 2x1',
        'Mié 18:00 · TikTok · Video corto detrás de cámaras',
        'Jue 12:00 · Instagram · Tips del chef',
        'Vie 19:00 · Facebook · Nuevo producto',
        'Sáb 18:00 · TikTok · Reseña de un cliente',
        'Dom 17:00 · Instagram · Resumen de la semana',
        '',
        'Weë todavía no publica por ti: revisa cada pieza y publícala tú.',
        '',
        DEMO_NOTE,
      ].join('\n');
    case 'published':
      return `🚀 Publicación lista para copiar\n\nRedes: Instagram · Facebook · TikTok\nTodavía no se ha publicado: cópiala y publícala tú en cada red.\n\n${DEMO_NOTE}`;
    case 'metrics':
      return [
        `📊 Resultados de la semana · ${goal}`,
        '',
        '• 24 publicaciones (+40%)',
        '• 125.4K personas alcanzadas (+60%)',
        '• 2.8K interacciones (+35%)',
        '• 186 mensajes recibidos (+70%)',
        '',
        'Qué funcionó: los videos cortos y las promos de martes.',
        '',
        'Qué hacer esta semana:',
        '1. Publica 2 videos cortos más.',
        '2. Responde los 12 mensajes pendientes hoy.',
        '3. Repite la promo del martes con otro producto.',
        '',
        DEMO_NOTE,
      ].join('\n');
    case 'campaign':
      return [
        `📣 Campaña · ${goal}`,
        '',
        'Objetivo: más clientes esta semana.',
        'Mensaje: "Ven a probarlo hoy: el sabor que todos comentan".',
        'Piezas: 3 publicaciones, 1 video corto y 1 promo.',
        'Calendario: martes, jueves y sábado a las 19:00.',
        'Presupuesto sugerido: bajo (orgánico) o medio (con anuncios).',
        '',
        DEMO_NOTE,
      ].join('\n');
    case 'copy':
      return `📱 Publicación lista · ${goal}\n\n"Hoy toca algo especial 🍽️ Ven a probar lo nuevo y cuéntanos qué te pareció. Te esperamos."\n\n#tunegocio #hechoconcariño #hoy\n\n${DEMO_NOTE}`;
    case 'skincare':
      return `🧴 Tu rutina de cuidado · ${goal}\n\nMañana:\n1. Limpiador suave\n2. Hidratante ligera\n3. Protector solar (todos los días)\n\nNoche:\n1. Limpiador\n2. Hidratante\n\nUna vez por semana: exfoliante suave.\n\n${DEMO_NOTE}`;
    case 'facestyle':
      return `🪞 Lo que mejor te va · ${goal}\n\nRostro: ovalado (demo).\nCortes: capas medias o corte a la mandíbula.\nLentes: marcos redondos o ligeramente cuadrados.\nEvita: flequillos muy rectos.\n\n${DEMO_NOTE}`;
    case 'layout':
      return `📐 Distribución propuesta · ${goal}\n\n1. Sofá contra la pared más larga, mirando a la ventana.\n2. Mesa de centro pequeña y ligera.\n3. Estantería vertical en la esquina para ganar suelo.\n4. Deja libre el paso de la puerta al balcón.\n\n${DEMO_NOTE}`;
    case 'story':
      return `📖 ${goal}\n\nCapítulo 1\n\nLa mañana en que todo cambió, nadie en el pueblo se dio cuenta. Solo Ana notó que el reloj de la plaza se había detenido a las 7:07…\n\n(Continúa con el conflicto, un giro y un cierre que deje ganas de seguir.)\n\n${DEMO_NOTE}`;
    case 'article':
      return `📰 ${goal}\n\nTítulo que engancha\n\nEntrada: en dos líneas, por qué esto importa hoy.\n\n1. La idea principal, explicada con un ejemplo.\n2. Un dato o historia que la respalde.\n3. Qué puede hacer el lector desde mañana.\n\nCierre con una pregunta para comentar.\n\n${DEMO_NOTE}`;
    case 'email':
      return `✉️ Asunto: ${goal}\n\nHola,\n\nTe escribo para… (contexto en una línea).\n\nLo que necesito / propongo: …\n\nQuedo atento a tu respuesta. ¡Gracias!\n\nSaludos,\n[Tu nombre]\n\n${DEMO_NOTE}`;
    case 'document':
      return `📄 ${goal}\n\n1. Resumen\n2. Contexto\n3. Propuesta\n4. Próximos pasos\n\nCada sección en 3–5 líneas, con lo importante primero.\n\n${DEMO_NOTE}`;
    case 'translate':
      return `🌐 Traducción (${brief || 'al inglés'})\n\n"Hello! Thanks for writing to us. We have exactly what you're looking for…"\n\n${DEMO_NOTE}`;
    case 'summary':
      return `🗒️ Resumen · ${goal}\n\n• Idea principal en una línea.\n• Segundo punto clave.\n• Tercer punto clave.\n\nEn una frase: lo esencial, sin rodeos.\n\n${DEMO_NOTE}`;
    case 'fix':
      return `✔️ Texto corregido\n\n(Aquí va tu texto con la ortografía, la puntuación y el estilo corregidos, sin cambiar lo que quisiste decir.)\n\nCambios: 3 tildes, 2 comas y una frase más clara.\n\n${DEMO_NOTE}`;
    case 'rewrite':
      return `🔁 Nueva versión (${brief || 'tono cercano'})\n\n(Aquí va tu texto reescrito con el nuevo tono, manteniendo la idea y el largo aproximado.)\n\n${DEMO_NOTE}`;
    case 'ideas':
      return `💡 Ideas para escribir · ${goal}\n\n1. Empieza por el momento más sorprendente.\n2. Cuéntalo como si fuera una carta a un amigo.\n3. Haz una lista de tres cosas que aprendiste.\n4. Describe un lugar con los cinco sentidos.\n\nPunto de partida: escribe solo la primera frase, sin corregir.\n\n${DEMO_NOTE}`;
    case 'analysis':
      return `🔎 Lo que entendí · ${goal}\n\nObjetivo: ${brief || 'avanzar con claridad'}.\nPúblico: personas como tus clientes actuales.\nPrioridad: algo concreto que puedas usar esta semana.\n\n${DEMO_NOTE}`;
    case 'answer':
      return `🧠 Respuesta · ${goal}\n\nEmpecemos por lo más simple: define qué quieres lograr en una frase. Después, elige una sola acción para hoy.\n\nPróximos pasos:\n1. Escribe tu objetivo en una línea.\n2. Elige el especialista de Weë que te ayuda con eso.\n3. Empieza con la versión más sencilla.\n\n${DEMO_NOTE}`;
    case 'describe':
      return `👀 Lo que veo en la foto (demo): una imagen bien iluminada, con el sujeto centrado y un fondo sencillo. Conservaré la luz y los colores originales.\n\n${DEMO_NOTE}`;
    case 'polish':
      return `✨ Versión final · ${goal}\n\nTexto pulido, sin repeticiones y con un cierre claro. Listo para publicar.\n\n${DEMO_NOTE}`;
    case 'concept':
      return `💡 Concepto · ${goal}\n\nIdea: ${brief || 'un diseño limpio y llamativo'}.\nTexto principal: "${goal}".\nColores: amarillo cálido, blanco y gris oscuro.\n\n${DEMO_NOTE}`;
    default:
      return `${purpose} · ${goal}\n\n${brief ? `Tuve en cuenta: ${brief}.\n\n` : ''}Este es un texto de muestra con la estructura que tendrá el resultado real: un inicio claro, el contenido principal y un cierre útil.\n\n${DEMO_NOTE}`;
  }
};

export const mockProvider: ProviderAdapter = {
  id: 'mock',
  supports: () => true,
  async run(capability: CapabilityId, input: Record<string, unknown>, ctx: GatewayContext): Promise<ProviderResult> {
    const start = Date.now();
    await sleep(600 + Math.floor(Math.random() * 500));
    const purpose = String(input.purpose ?? capability);
    const brief = String(input.brief ?? '');
    const kind = String(input.kind ?? '');
    /*
     * El `experienceId` del contexto es un `string` suelto —lo dice el propio
     * contrato del Gateway—, así que la búsqueda tiene que admitir una clave
     * que no sea ninguna experiencia. Por eso sigue el respaldo de abajo. Lo
     * que ya no puede pasar es que falte una experiencia REAL: eso lo sujeta
     * el tipo de la tabla, no esta línea.
     */
    const emoji = (EMOJI as Record<string, string | undefined>)[ctx.experienceId] ?? '✨';

    let output: ProviderOutput;
    if (capability.startsWith('text.') || capability === 'vision.describe') {
      const searchNote = capability === 'text.search' ? '\n\nFuentes (demo): en la versión conectada verás aquí las páginas consultadas.' : '';
      output = { kind: 'text', content: demoText(kind || (capability === 'vision.describe' ? 'describe' : ''), purpose, brief, ctx) + searchNote };
    } else if (capability === 'doc.render') {
      output = { kind: 'document', content: `📎 Documento listo (demo): "${ctx.goal}". En la versión real recibirás un PDF o una presentación para descargar.` };
    } else if (capability.startsWith('image.')) {
      const count = Math.max(1, Math.min(MAX_PROPUESTAS_POR_PASO, Number(input.count ?? 1)));
      const urls = Array.from({ length: count }, (_, i) =>
        demoImage(count > 1 ? `Propuesta ${i + 1}` : purpose, ctx.goal, emoji)
      );
      output = { kind: 'image', url: urls[0], urls: count > 1 ? urls : undefined };
    } else if (capability.startsWith('video.')) {
      output = { kind: 'video', url: demoImage('Video de 15 s', ctx.goal, emoji), content: 'Vista previa del video (demo). El video real llegará con narración, música y watermark Weë.' };
    } else {
      output = { kind: 'audio', content: `🔊 ${purpose} (demo). El audio real se generará en la versión conectada.` };
    }

    return { output, usage: { demoCalls: 1 }, costUSD: 0, latencyMs: Date.now() - start };
  },
};
