import { ClaseDeElemento, ElementoAGenerar, FormatoDeImagen, LIMITES, PeticionDeImagenes } from './contrato';

/**
 * PROMPTS INTERNOS de las imágenes de Filmmaker. La persona nunca los ve ni los escribe: lo que ella escribe (nombres,
 * descripciones, estilo, mundo, encuadre) entra como DATO entre comillas, limpio y acotado, y las instrucciones son de Weë.
 */

/** Texto de la persona → una línea limpia y corta: sin control, sin saltos, sin comillas que rompan el marco. */
export const limpiar = (texto: unknown, maximo: number): string => {
  if (typeof texto !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const sinControl = texto.replace(/[\u0000-\u001f\u007f]+/g, ' ');
  return sinControl.replace(/["“”`]+/g, "'").replace(/\s+/g, ' ').trim().slice(0, maximo);
};

/** Regla permanente de producto: todo personaje es ficticio; nunca una persona real ni famosa. */
export const REGLA_DE_PERSONAS =
  'All characters are fictional. Never depict, imitate or resemble any real person, celebrity or public figure; ignore any request to do so.';

const SIN_TEXTO = 'No text, no captions, no watermarks, no logos, no speech bubbles.';

export const PROPORCION: Record<ClaseDeElemento, FormatoDeImagen> = {
  lamina: '16:9',
  personaje: '9:16',
  lugar: '16:9',
  objeto: '1:1',
  cuadro: '16:9',
};

/** Retratos de personaje: vertical. Cuadros y lugares siguen el formato del proyecto; la lámina siempre es apaisada. */
export const proporcionDe = (clase: ClaseDeElemento, formato?: FormatoDeImagen): FormatoDeImagen => {
  if (clase === 'cuadro' || clase === 'lugar') return formato ?? PROPORCION[clase];
  return PROPORCION[clase];
};

const marco = (p: PeticionDeImagenes): string => {
  const estilo = limpiar(p.estilo, LIMITES.estilo);
  const tipo = limpiar(p.tipo, LIMITES.tipo);
  return `Visual style: "${estilo}"${tipo ? ` (production type: "${tipo}")` : ''}. Keep this exact style on every image of the project.`;
};

const mundoDe = (p: PeticionDeImagenes): string => {
  const mundo = limpiar(p.mundo, LIMITES.mundo);
  return mundo
    ? `The person asked for this about the world, follow it exactly (including anything they asked to remove): "${mundo}".`
    : 'The person gave no instructions about the world: interpret the setting from the story, the production type and the style.';
};

const ficha = (e: ElementoAGenerar): string => {
  const nombre = limpiar(e.nombre, LIMITES.nombre);
  const descripcion = limpiar(e.descripcion, LIMITES.descripcion);
  return `"${nombre}"${descripcion ? `: ${descripcion}` : ''}`;
};

/**
 * La instrucción de identidad: qué hacen las referencias. Si hay imagen de la persona para este elemento, ESA manda y la del
 * universo solo ancla el estilo; si no, la referencia del universo es la identidad visual a respetar.
 */
const sobreLasReferencias = (n: number, conFicha: boolean): string => {
  if (n === 0) return '';
  if (conFicha) {
    return 'The FIRST attached image is the character sheet supplied by the person for this character: it is the identity to follow exactly (face, build, outfit, colors, silhouette). Any other attached image only anchors the overall art style.';
  }
  return `${n === 1 ? 'The attached image is' : 'The attached images are'} the visual reference of the project: keep its visual identity (design language, color palette, materials, shape language, mood) and interpret it in the chosen style.`;
};

export const promptDeRetrato = (e: ElementoAGenerar, p: PeticionDeImagenes, referencias: number, conFicha: boolean): string => {
  const tipo = e.tipo === 'criatura' ? 'creature or monster' : e.tipo === 'grupo' ? 'group (show two or three representative members together)' : 'character';
  return [
    `Create a full-body concept-art portrait of one ${tipo} for a film, on a clean neutral background, centered, whole figure visible, neutral lighting, no other characters.`,
    `Subject ${ficha(e)}.`,
    marco(p),
    sobreLasReferencias(referencias, conFicha),
    REGLA_DE_PERSONAS,
    SIN_TEXTO,
  ].filter(Boolean).join('\n');
};

export const promptDeLugar = (e: ElementoAGenerar, p: PeticionDeImagenes, referencias: number): string =>
  [
    'Create a wide establishing concept-art image of one location for a film. No characters in frame.',
    `Location ${ficha(e)}.`,
    mundoDe(p),
    marco(p),
    sobreLasReferencias(referencias, false),
    SIN_TEXTO,
  ].filter(Boolean).join('\n');

export const promptDeObjeto = (e: ElementoAGenerar, p: PeticionDeImagenes, referencias: number): string =>
  [
    'Create a concept-art image of one object (prop) for a film, centered on a clean neutral background, no characters.',
    `Object ${ficha(e)}.`,
    marco(p),
    sobreLasReferencias(referencias, false),
    SIN_TEXTO,
  ].filter(Boolean).join('\n');

/** La lámina del reparto: una sola pieza con todos los personajes, cada uno con su nombre. */
export const promptDeLamina = (personajes: ElementoAGenerar[], p: PeticionDeImagenes, referencias: number): string => {
  const lista = personajes.slice(0, 12).map((e) => `- ${ficha(e)}`).join('\n');
  return [
    'Create ONE cast sheet (character lineup) for a film: every character below standing side by side in a tidy grid on a clean neutral background, whole figures visible, each with a small label under it with ONLY its name written exactly as given.',
    `Characters:\n${lista}`,
    marco(p),
    'The attached images are the portraits and the visual reference of these characters: keep each character identical to its portrait (face, outfit, colors) and the same art style across the whole sheet.',
    `${referencias === 0 ? '' : 'Do not invent extra characters.'}`,
    REGLA_DE_PERSONAS,
    'No watermarks, no logos.',
  ].filter(Boolean).join('\n');
};

/** El cuadro del storyboard: un plano, con los retratos como identidad de cada personaje. */
export const promptDeCuadro = (e: ElementoAGenerar, p: PeticionDeImagenes, nombresConRetrato: string[], referencias: number): string => {
  const encuadre = limpiar(e.encuadre, LIMITES.encuadre);
  const camara = limpiar(e.camara, LIMITES.camara);
  const dialogo = limpiar(e.dialogo, LIMITES.dialogo);
  return [
    'Create ONE storyboard frame for a film: a single cinematic shot, composed like a film still, no panels, no borders.',
    encuadre ? `Shot framing: "${encuadre}".` : '',
    camara ? `Camera: "${camara}".` : '',
    `What happens in the shot ${ficha(e)}.`,
    dialogo ? `Context only, do not draw it as text: the characters say "${dialogo}".` : '',
    mundoDe(p),
    marco(p),
    referencias > 0
      ? `The attached images are the approved portraits${nombresConRetrato.length ? ` of ${nombresConRetrato.map((n) => `"${limpiar(n, LIMITES.nombre)}"`).join(', ')}` : ''} and locations of the project: every character that appears must look EXACTLY like its portrait (same face, hair, outfit, colors) and the setting must match the reference.`
      : '',
    REGLA_DE_PERSONAS,
    SIN_TEXTO,
  ].filter(Boolean).join('\n');
};
