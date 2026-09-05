"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockProvider = void 0;
/**
 * Proveedor de prueba (modo demo): devuelve resultados de muestra sin llamar a
 * ninguna API ni gastar dinero. Sirve para construir y probar toda la experiencia
 * guiada antes de conectar proveedores reales.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const EMOJI = {
    design: '🎨', studio: '🎬', photo: '📸', writer: '✍️', music: '🎵',
    beauty: '💄', chef: '👨‍🍳', home: '🏠', business: '💼', brain: '🧠',
};
const escapeXml = (value) => value.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
const wrap = (text, maxChars, maxLines) => {
    const lines = [];
    let current = '';
    for (const word of text.split(/\s+/)) {
        if ((current + ' ' + word).trim().length > maxChars && current) {
            lines.push(current);
            current = word;
        }
        else {
            current = (current + ' ' + word).trim();
        }
        if (lines.length === maxLines)
            break;
    }
    if (current && lines.length < maxLines)
        lines.push(current);
    return lines;
};
/** Imagen SVG de muestra (tarjeta blanca sobre amarillo Weë) como data URI. */
const demoImage = (title, subtitle, emoji) => {
    const titleLines = wrap(title, 24, 5);
    const subtitleLines = wrap(subtitle, 40, 2);
    const titleSpans = titleLines
        .map((line, i) => `<tspan x="70" dy="${i === 0 ? 0 : 60}">${escapeXml(line)}</tspan>`)
        .join('');
    const subtitleSpans = subtitleLines
        .map((line, i) => `<tspan x="70" dy="${i === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
        .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">` +
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
const demoText = (kind, purpose, brief, ctx) => {
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
exports.mockProvider = {
    id: 'mock',
    supports: () => true,
    async run(capability, input, ctx) {
        var _a, _b, _c, _d;
        const start = Date.now();
        await sleep(600 + Math.floor(Math.random() * 500));
        const purpose = String((_a = input.purpose) !== null && _a !== void 0 ? _a : capability);
        const brief = String((_b = input.brief) !== null && _b !== void 0 ? _b : '');
        const kind = String((_c = input.kind) !== null && _c !== void 0 ? _c : '');
        const emoji = (_d = EMOJI[ctx.experienceId]) !== null && _d !== void 0 ? _d : '✨';
        let output;
        if (capability.startsWith('text.') || capability === 'vision.describe') {
            output = { kind: 'text', content: demoText(kind || (capability === 'vision.describe' ? 'describe' : ''), purpose, brief, ctx) };
        }
        else if (capability === 'doc.render') {
            output = { kind: 'document', content: `📎 Documento listo (demo): "${ctx.goal}". En la versión real recibirás un PDF o una presentación para descargar.` };
        }
        else if (capability.startsWith('image.')) {
            output = { kind: 'image', url: demoImage(purpose, ctx.goal, emoji) };
        }
        else if (capability.startsWith('video.')) {
            output = { kind: 'video', url: demoImage('Video de 15 s', ctx.goal, emoji), content: 'Vista previa del video (demo). El video real llegará con narración, música y watermark Weë.' };
        }
        else {
            output = { kind: 'audio', content: `🔊 ${purpose} (demo). El audio real se generará en la versión conectada.` };
        }
        return { output, usage: { demoCalls: 1 }, costUSD: 0, latencyMs: Date.now() - start };
    },
};
//# sourceMappingURL=mock.js.map