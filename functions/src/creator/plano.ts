import { CreativeParameters, creativosValidos } from '../core';

/**
 * WEË FILMMAKER · F1-D — DEL REQUISITO DE UN PLANO A UNA PETICIÓN DE VÍDEO.
 *
 * La app calcula el `ShotRequirement` del plano con el espejo de F1-A y lo manda
 * ESTRUCTURADO. Aquí se decide si F1-D puede generarlo y, si puede, se compone
 * el texto que llega al proveedor. El texto lo compone el SERVIDOR —la regla de
 * CLAUDE.md §6: los prompts internos viven en `creator/`— y nunca la app: armado
 * en el cliente con `t()`, el mismo plano daría otro texto en otro idioma, otra
 * huella de cobro y un reintento que choca con `idempotency_conflict`.
 *
 * ── Qué es esto y qué no ────────────────────────────────────────────────────
 *
 * Puro: ni Firestore, ni proveedores, ni Credits, ni el Core Runtime. No importa
 * `filmmaker/` —el dominio solo entra al servidor por `productions`, y esto es la
 * puerta del vídeo—: lee la FORMA de un requisito que llega de fuera, con una
 * lista cerrada de campos y de tamaños, y copia solo lo que F1-D usa. Lo demás no
 * se filtra: no se copia.
 *
 * ── Lo que F1-D genera, y lo que rechaza DICIÉNDOLO ─────────────────────────
 *
 * Solo `video.generate`: un plano descrito, sin primer fotograma, sin
 * referencias de imagen, vídeo ni audio, sin prompt avanzado y sin diálogo a
 * cámara. Lo que no se puede representar tal cual no se degrada ni se desvía a
 * otro camino: se rechaza con un motivo que la app traduce.
 *
 *     duración   se genera max(4, ceil(pedida)) segundos, hasta 15. Más de 15 se
 *                rechaza: se propone dividir el plano, nunca recortarlo.
 *     formato    4:5 no existe en esta ruta: se rechaza y se proponen los que sí.
 *     calidad    explícita, elegida por la persona. Si la resolución de la
 *                producción no cabe en el modelo de esa calidad, se rechaza: ni
 *                1080p → 720p ni «máxima» → «alta» sin que nadie lo sepa.
 *     sonido     solo si el plano lo pide; con «sin música» o «sin diálogo» no se
 *                puede prometer, así que se rechaza.
 *
 * ── El texto ────────────────────────────────────────────────────────────────
 *
 * Determinista y versionado (`PLANTILLA_DE_PLANO`): la misma entrada da el mismo
 * texto, y por tanto la misma huella de la operación. Etiquetas fijas en inglés
 * —el vocabulario cerrado del Core, que ya es inglés— y el contenido de la
 * persona TAL CUAL: lo que escribe una persona no se traduce. Cabe en 3000
 * caracteres: las secciones entran enteras, por orden de prioridad, o no entran.
 */

export const PLANTILLA_DE_PLANO = 'fm-plano-1';
export const MAX_PROMPT_DE_PLANO = 3000;

/** Lo que genera esta ruta, y hasta dónde. Números de producto, no de ningún proveedor. */
export const LIMITES_DE_PLANO = Object.freeze({
  duracionMinimaSec: 4,
  duracionMaximaSec: 15,
  proporciones: Object.freeze(['16:9', '9:16', '1:1', '4:3', '21:9'] as const),
  /** Cuando la proporción no está, estas son las que se proponen. */
  proporcionesSugeridas: Object.freeze(['9:16', '1:1'] as const),
  calidades: Object.freeze(['standard', 'high', 'max'] as const),
  resoluciones: Object.freeze(['480p', '720p', '1080p', '4k'] as const),
});

export type CalidadDePlano = typeof LIMITES_DE_PLANO.calidades[number];
export type ResolucionDePlano = typeof LIMITES_DE_PLANO.resoluciones[number];

/** Por qué un plano no se genera. Códigos: la frase la pone la app. */
export type MotivoDePlano =
  | 'shot_invalid'
  | 'capability_not_supported'
  | 'references_not_supported'
  | 'advanced_prompt_blocked'
  | 'dialogue_not_supported'
  | 'description_missing'
  | 'duration_too_long'
  | 'aspect_ratio_not_supported'
  | 'quality_required'
  | 'quality_not_representable'
  | 'sound_constraints_not_supported';

/* ── Leer lo que llega, con la forma justa ─────────────────────────────────── */

const MAX_TEXTO = 2000;
const MAX_NOMBRE = 120;
const MAX_LISTA = 16;
const MAX_ENTIDADES = 16;

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown, max = MAX_TEXTO): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : undefined;
};
const vocablo = (v: unknown): string | undefined => (typeof v === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(v) ? v : undefined);
const textos = (v: unknown, max = MAX_TEXTO): string[] =>
  Array.isArray(v) ? v.slice(0, MAX_LISTA).map((x) => texto(x, max)).filter((x): x is string => !!x) : [];
const cuantos = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

/** Una ficha de personaje, lugar u objeto, reducida a lo que se puede decir con palabras. */
export interface EntidadDePlano {
  readonly nombre: string;
  readonly descripcion?: string;
  readonly rasgos: readonly string[];
  readonly vestuario?: string;
  readonly notas?: string;
  readonly ambiente?: string;
}

/** El requisito de un plano, tal como lo usa F1-D. Nada más viaja. */
export interface RequisitoDePlano {
  readonly unitId: string;
  readonly sceneId: string;
  readonly shotId?: string;
  readonly implicito: boolean;
  readonly capacidad: string;
  readonly descripcion?: string;
  readonly descripcionDeEscena?: string;
  readonly proposito?: string;
  readonly creativo?: CreativeParameters;
  readonly look: Readonly<Record<string, string>>;
  readonly paleta: readonly string[];
  readonly momento?: string;
  readonly clima?: string;
  readonly lugar?: EntidadDePlano;
  readonly sujeto?: { readonly enfoque?: string; readonly descripcion?: string; readonly nombre?: string };
  readonly personajes: readonly EntidadDePlano[];
  readonly objetos: readonly EntidadDePlano[];
  readonly acciones: readonly string[];
  readonly lineasACamara: number;
  readonly referencias: number;
  readonly primerFotograma: boolean;
  readonly ultimoFotograma: boolean;
  readonly promptAvanzado: boolean;
  readonly duracionSec: number;
  readonly proporcion: string;
  readonly resolucion?: ResolucionDePlano;
  readonly calidad?: CalidadDePlano;
  readonly conSonido?: boolean;
  readonly restricciones: readonly string[];
  readonly continuidad?: { readonly conservar: readonly string[]; readonly fuerza?: string };
}

const RASGOS_LEIBLES = ['face', 'hair', 'body', 'wardrobe', 'accessories', 'makeup', 'materials', 'colors', 'lighting', 'visualStyle', 'environment'];

const entidad = (crudo: unknown): EntidadDePlano | undefined => {
  if (!esObj(crudo) || !esObj(crudo.definition)) return undefined;
  const d = crudo.definition;
  const nombre = texto(d.name, MAX_NOMBRE);
  if (!nombre) return undefined;
  const apariencia = esObj(d.appearance) ? d.appearance : {};
  const rasgos = RASGOS_LEIBLES
    .map((k) => (esObj(apariencia[k]) ? texto((apariencia[k] as Record<string, unknown>).description) : undefined))
    .filter((x): x is string => !!x);
  const estado = esObj(crudo.state) ? crudo.state : {};
  const descripcion = texto(d.identityDescription) ?? texto(d.description);
  const vestuario = texto(estado.wardrobe);
  const notas = texto(estado.appearanceNotes);
  const ambiente = vocablo(d.setting);
  return {
    nombre,
    ...(descripcion ? { descripcion } : {}),
    rasgos,
    ...(vestuario ? { vestuario } : {}),
    ...(notas ? { notas } : {}),
    ...(ambiente ? { ambiente } : {}),
  };
};

/**
 * EL REQUISITO, LEÍDO. `null` si no tiene la forma de un requisito de plano.
 *
 * Solo se copian los campos que F1-D usa, cada uno con su tope. Las referencias,
 * el diálogo y el prompt avanzado se CUENTAN —hacen falta para rechazar el plano
 * diciendo por qué— pero su contenido no viaja: ni ids de material, ni el texto
 * avanzado, ni lo que se dice a cámara.
 */
export const leerRequisitoDePlano = (crudo: unknown): RequisitoDePlano | null => {
  if (!esObj(crudo) || !esObj(crudo.input) || !esObj(crudo.format) || !esObj(crudo.output)) return null;
  const unitId = texto(crudo.unitId, 128);
  const sceneId = texto(crudo.sceneId, 128);
  const capacidad = texto(crudo.capability, 64);
  const duracion = crudo.durationSec;
  const formato = crudo.format;
  const salida = crudo.output;
  const proporcion = texto(formato.aspectRatio, 8);
  if (!unitId || !sceneId || !capacidad || !proporcion) return null;
  if (typeof duracion !== 'number' || !Number.isFinite(duracion) || duracion <= 0) return null;
  const i = crudo.input;
  const creativo = i.creative !== undefined && creativosValidos(i.creative) ? (i.creative as CreativeParameters) : undefined;
  const lookCrudo = esObj(i.look) ? i.look : {};
  const look: Record<string, string> = {};
  for (const k of ['visualStyle', 'mood', 'tone', 'sceneStyle', 'sceneMood', 'shotStyle', 'shotMood']) {
    const v = texto(lookCrudo[k]);
    if (v) look[k] = v;
  }
  const ritmo = vocablo(lookCrudo.pacing);
  if (ritmo) look.pacing = ritmo;
  const color = esObj(lookCrudo.color) ? lookCrudo.color : {};
  const gradacion = texto(color.grading);
  if (gradacion) look.grading = gradacion;
  const paleta = Array.isArray(color.palette)
    ? color.palette.slice(0, MAX_LISTA).filter((c): c is string => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c))
    : [];
  const entorno = esObj(i.environment) ? i.environment : {};
  const sujetoCrudo = esObj(i.subject) ? i.subject : undefined;
  const personajes = Array.isArray(i.characters) ? i.characters.slice(0, MAX_ENTIDADES).map(entidad).filter((x): x is EntidadDePlano => !!x) : [];
  const objetos = Array.isArray(i.objects) ? i.objects.slice(0, MAX_ENTIDADES).map(entidad).filter((x): x is EntidadDePlano => !!x) : [];
  const nombreDelSujeto = sujetoCrudo
    ? [...(Array.isArray(i.characters) ? i.characters : []), ...(Array.isArray(i.objects) ? i.objects : [])]
      .filter(esObj)
      .find((e) => e.id !== undefined && (e.id === sujetoCrudo.characterId || e.id === sujetoCrudo.objectId))
    : undefined;
  const continuidadCruda = esObj(crudo.continuity) ? crudo.continuity : undefined;
  const conservar = continuidadCruda && Array.isArray(continuidadCruda.preserve)
    ? continuidadCruda.preserve.slice(0, 32).filter((a): a is string => typeof a === 'string' && /^[a-z][A-Za-z.]{2,48}$/.test(a))
    : [];
  const resolucion = LIMITES_DE_PLANO.resoluciones.find((r) => r === formato.resolution);
  const calidad = LIMITES_DE_PLANO.calidades.find((q) => q === crudo.quality);
  const lugar = entidad(i.location);
  const descripcion = texto(i.description);
  const descripcionDeEscena = texto(i.sceneDescription);
  const proposito = vocablo(i.narrativePurpose);
  const momento = vocablo(entorno.timeOfDay);
  const clima = vocablo(entorno.weather);
  const sujeto = sujetoCrudo
    ? {
      ...(vocablo(sujetoCrudo.focus) ? { enfoque: vocablo(sujetoCrudo.focus) as string } : {}),
      ...(texto(sujetoCrudo.description) ? { descripcion: texto(sujetoCrudo.description) as string } : {}),
      ...(nombreDelSujeto && esObj(nombreDelSujeto.definition) && texto(nombreDelSujeto.definition.name, MAX_NOMBRE)
        ? { nombre: texto(nombreDelSujeto.definition.name, MAX_NOMBRE) as string } : {}),
    }
    : undefined;
  const fuerza = continuidadCruda ? vocablo(continuidadCruda.strength) : undefined;
  return {
    unitId,
    sceneId,
    ...(texto(crudo.shotId, 128) ? { shotId: texto(crudo.shotId, 128) as string } : {}),
    implicito: crudo.implicit === true,
    capacidad,
    ...(descripcion ? { descripcion } : {}),
    ...(descripcionDeEscena ? { descripcionDeEscena } : {}),
    ...(proposito ? { proposito } : {}),
    ...(creativo ? { creativo } : {}),
    look,
    paleta,
    ...(momento ? { momento } : {}),
    ...(clima ? { clima } : {}),
    ...(lugar ? { lugar } : {}),
    ...(sujeto && Object.keys(sujeto).length ? { sujeto } : {}),
    personajes,
    objetos,
    acciones: textos(i.actions, 280),
    lineasACamara: cuantos(i.dialogue),
    referencias: cuantos(i.references),
    primerFotograma: typeof i.firstFrameReferenceId === 'string',
    ultimoFotograma: typeof i.lastFrameReferenceId === 'string',
    promptAvanzado: typeof i.advancedPrompt === 'string' && i.advancedPrompt.length > 0,
    duracionSec: duracion,
    proporcion,
    ...(resolucion ? { resolucion } : {}),
    ...(calidad ? { calidad } : {}),
    ...(typeof salida.withSound === 'boolean' ? { conSonido: salida.withSound } : {}),
    restricciones: Array.isArray(crudo.constraints) ? crudo.constraints.filter((c): c is string => typeof c === 'string').slice(0, 8) : [],
    ...(conservar.length ? { continuidad: { conservar, ...(fuerza ? { fuerza } : {}) } } : {}),
  };
};

/* ── ¿Lo puede generar F1-D? ───────────────────────────────────────────────── */

/** Lo que se va a pedir de verdad, cuando se puede. */
export interface PlanoRepresentable {
  readonly ok: true;
  readonly duracionPedidaSec: number;
  readonly duracionSec: number;
  readonly proporcion: string;
  readonly resolucion?: ResolucionDePlano;
  readonly calidad: CalidadDePlano;
  readonly conSonido: boolean;
}

export interface PlanoRechazado {
  readonly ok: false;
  readonly motivo: MotivoDePlano;
  /** Para dividir: lo pedido y lo máximo. Para la proporción: las que sí. */
  readonly detalle?: Readonly<Record<string, string | number | readonly string[]>>;
}

export type EvaluacionDePlano = PlanoRepresentable | PlanoRechazado;

/**
 * LAS REGLAS DE F1-D, en el orden en que se rechaza. Pura.
 *
 * `calidad` es la que la persona eligió al generar: el requisito puede traer una,
 * pero la que manda es la que se ve y se acepta con su precio.
 */
export const evaluarPlano = (r: RequisitoDePlano, calidad: unknown): EvaluacionDePlano => {
  const no = (motivo: MotivoDePlano, detalle?: PlanoRechazado['detalle']): PlanoRechazado => ({ ok: false, motivo, ...(detalle ? { detalle } : {}) });
  if (r.capacidad !== 'video.generate') return no('capability_not_supported', { capability: r.capacidad });
  if (r.referencias > 0 || r.primerFotograma || r.ultimoFotograma) return no('references_not_supported');
  if (r.promptAvanzado) return no('advanced_prompt_blocked');
  if (r.lineasACamara > 0) return no('dialogue_not_supported');
  if (!r.descripcion && !r.descripcionDeEscena && !r.acciones.length) return no('description_missing');
  if (r.duracionSec > LIMITES_DE_PLANO.duracionMaximaSec) {
    return no('duration_too_long', { requestedSec: r.duracionSec, maxSec: LIMITES_DE_PLANO.duracionMaximaSec });
  }
  if (!(LIMITES_DE_PLANO.proporciones as readonly string[]).includes(r.proporcion)) {
    return no('aspect_ratio_not_supported', { aspectRatio: r.proporcion, suggestions: LIMITES_DE_PLANO.proporcionesSugeridas });
  }
  const elegida = LIMITES_DE_PLANO.calidades.find((q) => q === calidad);
  if (!elegida) return no('quality_required');
  const conSonido = r.conSonido === true;
  if (conSonido && r.restricciones.some((c) => c === 'no_music' || c === 'no_dialogue')) return no('sound_constraints_not_supported');
  return {
    ok: true,
    duracionPedidaSec: r.duracionSec,
    duracionSec: Math.max(LIMITES_DE_PLANO.duracionMinimaSec, Math.ceil(r.duracionSec)),
    proporcion: r.proporcion,
    ...(r.resolucion ? { resolucion: r.resolucion } : {}),
    calidad: elegida,
    conSonido,
  };
};

/**
 * ¿CABE LA RESOLUCIÓN EN LA CALIDAD ELEGIDA? Pura: recibe lo que el motor
 * haría con la calidad sola —su modelo y hasta dónde llega— y lo que haría con
 * la calidad y la resolución juntas, que es lo que de verdad se generaría.
 *
 * Dos formas de degradar en silencio, y las dos se rechazan:
 *   · la resolución obliga a OTRO modelo que el de la calidad (4k con «máxima»);
 *   · el modelo de la calidad no llega a la resolución (1080p con «estándar»).
 * Y se dice hasta dónde llega esa calidad, para elegir otra cosa sabiendo qué.
 */
export interface SalidaDelMotor {
  readonly modelo: string;
  readonly resolucion: string;
}

export const calidadRepresentable = (
  e: PlanoRepresentable,
  deLaCalidad: SalidaDelMotor,
  efectiva: SalidaDelMotor,
): PlanoRechazado | null => {
  if (!e.resolucion) return null;
  if (efectiva.modelo !== deLaCalidad.modelo || efectiva.resolucion !== e.resolucion) {
    return { ok: false, motivo: 'quality_not_representable', detalle: { quality: e.calidad, resolution: e.resolucion, reachable: deLaCalidad.resolucion } };
  }
  return null;
};

/* ── El texto para el proveedor ────────────────────────────────────────────── */

/** Una URL dentro del texto de la persona no aporta nada al vídeo y es una puerta. Fuera. */
const sinEnlaces = (t: string): string => t.replace(/https?:\/\/\S+/gi, '').replace(/\s{2,}/g, ' ').trim();
const palabra = (v: string): string => v.replace(/_/g, ' ');
const frase = (partes: readonly (string | undefined)[], sep = '; '): string => partes.filter((p): p is string => !!p && p.length > 0).join(sep);

const describirEntidad = (e: EntidadDePlano): string => {
  const detalle = frase([e.descripcion, ...e.rasgos, e.vestuario ? `wearing ${e.vestuario}` : undefined, e.notas, e.ambiente ? palabra(e.ambiente) : undefined]);
  return detalle ? `${e.nombre} (${detalle})` : e.nombre;
};

const describirCamara = (c: CreativeParameters | undefined): string => {
  if (!c) return '';
  return frase([
    c.shot?.type ? `${palabra(c.shot.type)} shot` : undefined,
    c.camera?.type ? `${palabra(c.camera.type)} camera` : undefined,
    c.camera?.perspective ? palabra(c.camera.perspective) : undefined,
    c.lens?.type ? `${palabra(c.lens.type)} lens${c.lens.focalLengthMm ? ` ${c.lens.focalLengthMm} mm` : ''}` : (c.lens?.focalLengthMm ? `${c.lens.focalLengthMm} mm lens` : undefined),
    c.movement?.type ? `movement ${palabra(c.movement.type)}${c.movement.speed ? ` (${palabra(c.movement.speed)})` : ''}` : undefined,
    c.motion?.smoothness ? `${palabra(c.motion.smoothness)} motion` : undefined,
    c.lighting?.type ? `${palabra(c.lighting.type)} lighting` : undefined,
    c.composition?.type ? `${palabra(c.composition.type)} composition` : undefined,
  ], ', ');
};

/**
 * EL TEXTO, por secciones y por orden de prioridad. Cada sección entra ENTERA o
 * no entra: un texto cortado a media frase le dice al proveedor otra cosa.
 */
export const componerPromptDePlano = (r: RequisitoDePlano): string => {
  const c = (t: string | undefined): string | undefined => (t ? sinEnlaces(t) : undefined);
  const secciones: string[] = [];
  const principal = c(r.descripcion) ?? c(r.descripcionDeEscena) ?? '';
  secciones.push(principal);
  if (r.acciones.length) secciones.push(`Action: ${r.acciones.map((a) => c(a)).filter(Boolean).join('; ')}.`);
  if (r.sujeto) {
    secciones.push(`Subject: ${frase([r.sujeto.nombre, r.sujeto.enfoque ? `${palabra(r.sujeto.enfoque)} framing` : undefined, c(r.sujeto.descripcion)], ', ')}.`);
  }
  if (r.personajes.length) secciones.push(`Characters: ${r.personajes.map(describirEntidad).map((x) => c(x)).join('. ')}.`);
  if (r.objetos.length) secciones.push(`Objects: ${r.objetos.map(describirEntidad).map((x) => c(x)).join('. ')}.`);
  if (r.lugar) secciones.push(`Location: ${c(describirEntidad(r.lugar))}.`);
  const escena = frase([
    r.descripcion && r.descripcionDeEscena ? c(r.descripcionDeEscena) : undefined,
    r.proposito ? `narrative purpose: ${palabra(r.proposito)}` : undefined,
    r.momento ? `time of day: ${palabra(r.momento)}` : undefined,
    r.clima ? `weather: ${palabra(r.clima)}` : undefined,
  ]);
  if (escena) secciones.push(`Scene: ${escena}.`);
  const look = frase([
    r.look.visualStyle ? `style ${c(r.look.visualStyle)}` : undefined,
    r.look.mood ? `mood ${c(r.look.mood)}` : undefined,
    r.look.tone ? `tone ${c(r.look.tone)}` : undefined,
    r.look.pacing ? `pacing ${palabra(r.look.pacing)}` : undefined,
    r.look.sceneStyle ? `scene style ${c(r.look.sceneStyle)}` : undefined,
    r.look.sceneMood ? `scene mood ${c(r.look.sceneMood)}` : undefined,
    r.look.shotStyle ? `shot style ${c(r.look.shotStyle)}` : undefined,
    r.look.shotMood ? `shot mood ${c(r.look.shotMood)}` : undefined,
    r.look.grading ? `color grading ${c(r.look.grading)}` : undefined,
    r.paleta.length ? `palette ${r.paleta.join(' ')}` : undefined,
  ]);
  if (look) secciones.push(`Look: ${look}.`);
  const camara = describirCamara(r.creativo);
  if (camara) secciones.push(`Camera: ${camara}.`);
  if (r.continuidad) {
    secciones.push(`Continuity: keep ${r.continuidad.conservar.join(', ')} consistent${r.continuidad.fuerza ? ` (${palabra(r.continuidad.fuerza)})` : ''}.`);
  }

  /* Dentro del tope, entera o nada, y en este orden. La primera siempre: es el plano. */
  let salida = secciones[0].slice(0, MAX_PROMPT_DE_PLANO);
  for (const s of secciones.slice(1)) {
    if (!s) continue;
    const siguiente = salida ? `${salida}\n${s}` : s;
    if (siguiente.length <= MAX_PROMPT_DE_PLANO) salida = siguiente;
  }
  return salida;
};
