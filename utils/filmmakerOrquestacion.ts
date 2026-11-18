import { LIMITES, aplicarOperaciones, configuracionDePreset, produccionVacia } from '../services/filmmaker/dominio';
import type {
  AspectRatio, DialogueLine, FilmmakerOperation, FilmmakerProduction, FormatPresetId, ProductionCharacter, ProductionLocation,
  ProductionObject, ProductionScene, ProductionShot, ProductionType, ResolutionTarget,
} from '../services/filmmaker/dominio';
import { OPERACION_DE_LA_RUTA } from '../constants/filmmaker';
import type { Tanda, CuadroDeStoryboard, TandasDelTaller } from './tandasDeFilmmaker';
import { NARRADOR, OBJETIVO_POR_TANDA, SIN_HABLANTE } from './tandasDeFilmmaker';
import type { ElementoDeUniverso, UniversoDelTaller } from './universoDeFilmmaker';
import { VOCES_PREDETERMINADAS } from '../constants/filmmakerSonido';

/** La voz propia de un cuadro como el servidor la guarda (`DialogueLine.voice`): solo las voces reales del catálogo; las de ejemplo no viajan. */
export const vozDeLinea = (voz: string | null | undefined): { referenceId: string; description: string; language: string } | null => {
  const v = voz && voz !== 'auto' ? VOCES_PREDETERMINADAS.find((x) => x.id === voz && !x.ejemplo) : undefined;
  return v ? { referenceId: v.id, description: `${v.nombre} · ${v.tono}`, language: v.idioma } : null;
};

/**
 * WEË FILMMAKER · CAPA DE ORQUESTACIÓN DEL CLIENTE: de la EXPERIENCIA (tipo, estilo, idea, universo, tandas y cuadros) al CONTRATO del engine (la
 * producción de `productions`: personajes, lugares, objetos, escenas y planos). Lógica PURA, sin React ni red, para probarla suelta.
 *
 * Es el único sitio donde se decide qué es cada cosa en el servidor:
 *
 *   tipo de proyecto  → `intent.productionType` (+ `requestedDurationSec`)       estilo → `intent.style` y `creativeDirection.visualStyle`
 *   idea              → `intent.freeText` (tope 4000; «Pegar texto» admite 12000: ver NOTA-DE-INTEGRACION)
 *   personaje/lugar/objeto del universo → `characters` / `locations` / `objects` (id `ch_`/`lo_`/`ob_` + el id del universo)
 *   tanda (capítulo)  → una ESCENA        cuadro del storyboard → un PLANO (`durationSec`, `description`)
 *   cámara del cuadro → `change_camera` / `change_movement` / `change_lighting` sobre ese plano (las mismas operaciones de F1-A que usa Weë Studio)
 *   quien habla       → `dialogue` del plano: narrador = `narration`; personaje = `dialogue` (a cámara) o `voiceover` (en off)
 *
 * LO QUE NO VIAJA, y por qué (nunca se simula):
 *   · los elementos y cuadros marcados «Ejemplo» (no son trabajo de la persona);
 *   · la VOZ elegida (`voz` del personaje/cuadro/tanda): el contrato guarda `VoiceReference` (descripción/idioma/referencia), no un id del catálogo de
 *     voces; sin contrato 4 y sin `aiSettings/voces` abierta no hay a dónde mandarla → queda en el estado de la pantalla (ver `vozSinDestino`);
 *   · la imagen/ficha del personaje y los efectos cerrados (cámara lenta, zoom de impacto…): D1/contratos pendientes;
 *   · el «Proyecto» de sonido (música, efectos) por tanda: el contrato lo tiene como `audio.cues`, pero no hay cuadro de la experiencia que los escriba.
 */

/* ── Tipo de proyecto → tipo de producción del contrato ───────────────────── */

/** Los tipos de la experiencia que el contrato tiene. «Serie» no existe como tipo (una tanda no es una temporada): no hay entrada y se cierra.
 *  «Videoclip» NO es de Filmmaker (decisión del dueño, 2026-11-18: vive en la sección Vídeos): ni existe aquí ni se mapea a `music_video`. */
export const TIPO_DE_PRODUCCION: Readonly<Record<string, ProductionType>> = Object.freeze({
  short: 'short_film', film: 'cinematic', ad: 'ad',
});

/* ── Identificadores: el contrato pide 4–160 de [A-Za-z0-9_.:-] ───────────── */

const limpiarId = (s: string): string => s.replace(/[^A-Za-z0-9_.:-]/g, '_');
const conPrefijo = (prefijo: string, id: string): string => {
  const x = `${prefijo}${limpiarId(id)}`.slice(0, 160);
  return x.length >= 4 ? x : `${x}____`.slice(0, 4);
};
export const idDePersonaje = (id: string): string => conPrefijo('ch_', id);
export const idDeLugar = (id: string): string => conPrefijo('lo_', id);
export const idDeObjeto = (id: string): string => conPrefijo('ob_', id);
export const idDeEscena = (tandaId: string): string => conPrefijo('sc_', tandaId);
export const idDePlano = (cuadroId: string): string => conPrefijo('sh_', cuadroId);

/* ── Qué entra ────────────────────────────────────────────────────────────── */

export interface ExperienciaDeFilmmaker {
  readonly productionId: string;
  readonly idea: string;
  /** Id del tipo de la experiencia (`short`, `film`, `ad`; `series` se cierra). */
  readonly tipo: string;
  /** Id del estilo elegido (obligatorio en la experiencia: sin estilo no se avanza). */
  readonly estilo: string;
  readonly duracionSegundos?: number;
  readonly aspectRatio: AspectRatio;
  /** La resolución del nivel Avanzado (vacía = Auto). */
  readonly resolution?: ResolutionTarget;
  readonly preset?: FormatPresetId;
  readonly universo?: UniversoDelTaller;
  readonly tandas?: TandasDelTaller;
  /** El personaje que habla en pantalla: `dialogue` (a cámara, hoy NO se puede producir: contrato 6) o `voiceover` (voz en off, sí). Por defecto `dialogue`: es lo que la persona escribió. */
  readonly hablaComo?: 'dialogue' | 'voiceover';
}

export type MotivoDeOmision =
  | 'ejemplo' | 'cuadro_sin_texto' | 'tope_de_escenas' | 'tope_de_planos' | 'creativo_no_valido' | 'tipo_sin_equivalente';

export interface Omision { readonly motivo: MotivoDeOmision; readonly id?: string }

export interface ResultadoDelBorrador {
  readonly production: FilmmakerProduction;
  readonly omisiones: readonly Omision[];
  /** Voces elegidas que no tienen dónde guardarse hoy: [{ ownerId, voz }]. La pantalla las conserva y avisa; no se simulan. */
  readonly vozSinDestino: readonly { readonly ownerId: string; readonly voz: string }[];
}

const recorta = (s: string, n: number): string => Array.from(s.trim()).slice(0, n).join('');

/* ── Cámara: ruta del lenguaje creativo → operaciones de F1-A sobre un plano ─ */

export const operacionesDeCamaraDeUnPlano = (shotId: string, creativo: Readonly<Record<string, string>> | undefined): FilmmakerOperation[] => {
  const porOp = new Map<string, Record<string, string>>();
  for (const [ruta, valor] of Object.entries(creativo ?? {})) {
    const d = OPERACION_DE_LA_RUTA[ruta];
    if (!d || typeof valor !== 'string' || !valor) continue;
    porOp.set(d.op, { ...(porOp.get(d.op) ?? {}), [d.campo]: valor });
  }
  return [...porOp].map(([op, campos]) => ({ op, target: { scope: 'shot', shotId }, ...campos }) as unknown as FilmmakerOperation);
};

/* ── Cuadro → plano ───────────────────────────────────────────────────────── */

const lineaDeCuadro = (c: CuadroDeStoryboard, personajes: ReadonlySet<string>, hablaComo: 'dialogue' | 'voiceover'): DialogueLine | null => {
  if (c.hablante === SIN_HABLANTE || !c.texto.trim()) return null;
  const texto = recorta(c.texto, LIMITES.linea);
  const voz = vozDeLinea(c.voz);
  if (c.hablante === NARRADOR) return { id: conPrefijo('dl_', c.id), kind: 'narration', text: texto, ...(voz ? { voice: voz } : {}) };
  if (!personajes.has(c.hablante)) return null;
  return { id: conPrefijo('dl_', c.id), kind: hablaComo, characterId: idDePersonaje(c.hablante), text: texto, ...(voz ? { voice: voz } : {}) };
};

const planoDeCuadro = (c: CuadroDeStoryboard, personajes: ReadonlySet<string>, hablaComo: 'dialogue' | 'voiceover'): Omit<ProductionShot, 'order'> => {
  const linea = lineaDeCuadro(c, personajes, hablaComo);
  return {
    id: idDePlano(c.id),
    durationSec: c.duracion,
    description: recorta(c.texto, LIMITES.texto),
    ...(personajes.has(c.hablante) ? { characterIds: [idDePersonaje(c.hablante)] } : {}),
    ...(linea ? { dialogue: [linea] } : {}),
  };
};

/* ── La producción entera, como borrador en su revisión 0 ─────────────────── */

export const produccionDesdeLaExperiencia = (e: ExperienciaDeFilmmaker): ResultadoDelBorrador => {
  const omisiones: Omision[] = [];
  const vozSinDestino: { ownerId: string; voz: string }[] = [];
  const idea = recorta(e.idea, LIMITES.textoLibre);
  let prod: FilmmakerProduction = produccionVacia({ title: recorta(idea.split(/[\n.!?]/)[0] || idea, LIMITES.nombre) || 'Filmmaker', aspectRatio: e.aspectRatio, ...(e.resolution ? { resolution: e.resolution } : {}), id: e.productionId });
  if (e.preset) prod = { ...prod, ...configuracionDePreset(e.preset) };
  const tipo = TIPO_DE_PRODUCCION[e.tipo];
  if (!tipo) omisiones.push({ motivo: 'tipo_sin_equivalente', id: e.tipo });
  prod = {
    ...prod,
    intent: {
      freeText: idea,
      ...(tipo ? { productionType: tipo } : {}),
      style: e.estilo,
      ...(e.duracionSegundos && e.duracionSegundos > 0 ? { requestedDurationSec: e.duracionSegundos } : {}),
    },
    creativeDirection: { visualStyle: e.estilo },
  };

  /* Universo: solo lo de la persona. Lo marcado «Ejemplo» no viaja. */
  const reales = (e.universo?.elementos ?? []).filter((x: ElementoDeUniverso) => {
    if (x.ejemplo) { omisiones.push({ motivo: 'ejemplo', id: x.id }); return false; }
    return true;
  });
  const personajes: ProductionCharacter[] = [];
  const lugares: ProductionLocation[] = [];
  const objetos: ProductionObject[] = [];
  for (const x of reales) {
    const base = { name: recorta(x.nombre, LIMITES.nombre), description: x.linea ? recorta(x.linea, LIMITES.texto) : undefined };
    if (x.tipo === 'character') {
      personajes.push({ id: idDePersonaje(x.id), name: base.name, ...(base.description ? { identityDescription: base.description } : {}) });
      if (x.voz && x.voz !== 'auto') vozSinDestino.push({ ownerId: x.id, voz: x.voz });
    } else if (x.tipo === 'place') {
      lugares.push({ id: idDeLugar(x.id), name: base.name, ...(base.description ? { description: base.description } : {}) });
    } else {
      objetos.push({ id: idDeObjeto(x.id), name: base.name, ...(base.description ? { description: base.description } : {}) });
    }
  }
  const hablantes = new Set(reales.filter((x) => x.tipo === 'character').map((x) => x.id));

  /* Tandas → escenas; cuadros → planos. */
  const escenas: ProductionScene[] = [];
  const operaciones: FilmmakerOperation[] = [];
  let planos = 0;
  for (const t of e.tandas?.tandas ?? []) {
    if (t.ejemplo) { omisiones.push({ motivo: 'ejemplo', id: t.id }); continue; }
    if (escenas.length >= LIMITES.escenas) { omisiones.push({ motivo: 'tope_de_escenas', id: t.id }); continue; }
    if (t.voz && t.voz !== 'auto') vozSinDestino.push({ ownerId: t.id, voz: t.voz });
    const shots: ProductionShot[] = [];
    for (const c of t.cuadros) {
      if (c.ejemplo) { omisiones.push({ motivo: 'ejemplo', id: c.id }); continue; }
      if (!c.texto.trim()) { omisiones.push({ motivo: 'cuadro_sin_texto', id: c.id }); continue; }
      if (shots.length >= LIMITES.planosPorEscena || planos >= LIMITES.planos) { omisiones.push({ motivo: 'tope_de_planos', id: c.id }); continue; }
      if (c.voz && c.voz !== 'auto' && !(vozDeLinea(c.voz) && c.hablante !== SIN_HABLANTE)) vozSinDestino.push({ ownerId: c.id, voz: c.voz });
      shots.push({ ...planoDeCuadro(c, hablantes, e.hablaComo ?? 'dialogue'), order: shots.length });
      planos++;
      operaciones.push(...operacionesDeCamaraDeUnPlano(idDePlano(c.id), c.creativo));
    }
    if (!shots.length) continue;
    escenas.push({ id: idDeEscena(t.id), order: escenas.length, ...(t.titulo ? { title: recorta(t.titulo, LIMITES.nombre) } : {}), ...(t.aprobada ? { batch: { status: 'approved' as const, ...(t.almacen ? { stored: true } : {}) } } : {}), shots });
  }
  prod = { ...prod, characters: personajes, locations: lugares, objects: objetos, scenes: escenas };

  /* La cámara se pone con las operaciones de F1-A (las comprueba el dominio); si alguna no valiera, el plano nace sin ella: el cuadro no se pierde. */
  if (operaciones.length) {
    for (const op of operaciones) {
      const r = aplicarOperaciones(prod, [op]);
      if (r.ok) prod = { ...r.production, metadata: { ...r.production.metadata, revision: 0 } };
      else omisiones.push({ motivo: 'creativo_no_valido', id: (op as { target: { shotId?: string } }).target.shotId });
    }
  }
  return { production: prod, omisiones, vozSinDestino };
};

/* ── Estados: lo que dice el servidor ↔ lo que enseña la experiencia ──────── */

/** Lo que se sabe de UN cuadro/plano en el servidor, reducido a lo que la experiencia sabe pintar. Sale de `InstantaneaDeToma` (utils/controladorDeToma). */
export type EstadoDeCuadroEnServidor = 'sin_toma' | 'cotizada' | 'en_proceso' | 'lista' | 'fallida' | 'rechazada' | 'no_disponible';

export interface LecturaDeToma {
  readonly fase: string;
  readonly ultima?: { readonly estado: 'lista' | 'fallida' | 'sin_enlazar' } | null;
  readonly enElPlano?: unknown | null;
}

export const estadoDeCuadro = (t: LecturaDeToma): EstadoDeCuadroEnServidor => {
  if (t.enElPlano) return 'lista';
  switch (t.fase) {
    case 'pidiendo': case 'en_proceso': case 'terminando': return 'en_proceso';
    case 'cotizada': return 'cotizada';
    case 'rechazada': return 'rechazada';
    case 'error': return 'fallida';
    case 'no_disponible': case 'sin_unidad': return 'no_disponible';
    default:
      if (t.ultima?.estado === 'lista') return 'lista';
      if (t.ultima?.estado === 'fallida') return 'fallida';
      return 'sin_toma';
  }
};

/** Estado de la TANDA de la experiencia (`EstadoDeProduccion` de tandasDeFilmmaker: producing | done | error | ninguno) a partir de sus cuadros. */
export const produccionDeTanda = (cuadros: readonly EstadoDeCuadroEnServidor[]): 'producing' | 'done' | 'error' | undefined => {
  if (!cuadros.length) return undefined;
  if (cuadros.some((c) => c === 'en_proceso')) return 'producing';
  if (cuadros.every((c) => c === 'lista')) return 'done';
  if (cuadros.some((c) => c === 'fallida')) return 'error';
  if (cuadros.some((c) => c === 'lista')) return 'producing';
  return undefined;
};

/** La tanda con el estado de producción que dicen sus cuadros. Una tanda sin nada en marcha no lo lleva: vuelve a su estado de revisión/aprobada. */
export const conProduccion = (t: Tanda, porCuadro: Readonly<Record<string, EstadoDeCuadroEnServidor>>): Tanda => {
  const p = produccionDeTanda(t.cuadros.map((c) => porCuadro[c.id] ?? 'sin_toma'));
  return p ? { ...t, produccion: p } : { ...t, produccion: undefined };
};

/** Los planos que aún no tienen vídeo, en el orden de la historia: lo que «Producir» pediría, una toma por plano (cada una con su cotización y su confirmación). */
export const planosPorProducir = (t: Tanda, porCuadro: Readonly<Record<string, EstadoDeCuadroEnServidor>>): readonly string[] =>
  t.cuadros.filter((c) => !c.ejemplo && (porCuadro[c.id] ?? 'sin_toma') !== 'lista' && porCuadro[c.id] !== 'en_proceso').map((c) => idDePlano(c.id));

/** Cuadros cuya duración el generador no podría tomar tal cual: <4 s se genera en 4; >30 s se rechaza (`creator/plano.ts`: duración 4–30; 15 s si no hay modelo delante). */
export const AJUSTE_DE_TOMA = Object.freeze({ minimoSeg: 4, maximoSeg: 30 });
export const duracionFueraDeToma = (seg: number): 'corta' | 'larga' | null => (seg > AJUSTE_DE_TOMA.maximoSeg ? 'larga' : seg < AJUSTE_DE_TOMA.minimoSeg ? 'corta' : null);

/* ── Lo guardado → la experiencia (al reabrir una producción) ─────────────── */

const sinPrefijo = (prefijo: string, id: string): string => (id.startsWith(prefijo) ? id.slice(prefijo.length) : id);
const sufijo = (id: string): number => { const m = /(\d+)$/.exec(id); return m ? Number(m[1]) : 0; };
const delCreativo = (creativo: unknown, ruta: string): string | undefined => {
  let v: unknown = creativo;
  for (const k of ruta.split('.')) v = v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined;
  return typeof v === 'string' && v ? v : undefined;
};

/** Los tipos de la experiencia a partir del tipo del servidor (el inverso de `TIPO_DE_PRODUCCION`). */
export const tipoDeLaExperiencia = (tipo: string | undefined): string | null => Object.entries(TIPO_DE_PRODUCCION).find(([, v]) => v === tipo)?.[0] ?? null;

/** Escenas → capítulos y planos → cuadros, con su estado de aprobado y almacén y su cámara. Lo que la orquestación escribe, vuelto a leer. */
export const tandasDesdeLaProduccion = (prod: FilmmakerProduction): TandasDelTaller => {
  let max = 0;
  const tandas: Tanda[] = prod.scenes.map((s) => {
    const id = sinPrefijo('sc_', s.id); max = Math.max(max, sufijo(id));
    const cuadros: CuadroDeStoryboard[] = s.shots.map((p) => {
      const cid = sinPrefijo('sh_', p.id); max = Math.max(max, sufijo(cid));
      const linea = p.dialogue?.[0];
      const hablante = !linea ? SIN_HABLANTE : linea.kind === 'narration' ? NARRADOR : linea.characterId ? sinPrefijo('ch_', linea.characterId) : SIN_HABLANTE;
      const creativo: Record<string, string> = {};
      for (const ruta of Object.keys(OPERACION_DE_LA_RUTA)) { const v = delCreativo(p.visual?.creative, ruta); if (v) creativo[ruta] = v; }
      return { id: cid, texto: p.description ?? linea?.text ?? '', hablante, duracion: p.durationSec ?? 6, creativo, ...(linea?.voice?.referenceId ? { voz: linea.voice.referenceId } : {}) } as CuadroDeStoryboard;
    });
    const segundos = cuadros.reduce((n, c) => n + c.duracion, 0);
    return { id, titulo: s.title ?? '', objetivo: Math.max(10, Math.round(segundos) || OBJETIVO_POR_TANDA), cuadros, aprobada: s.batch?.status === 'approved', almacen: !!s.batch?.stored } as Tanda;
  });
  return { tandas, siguiente: max + 1 };
};

/** Personajes, lugares y objetos guardados → el universo de la pantalla (origen «Tuyo»). */
export const universoDesdeLaProduccion = (prod: FilmmakerProduction): UniversoDelTaller => {
  let max = 0;
  const hacer = (tipo: ElementoDeUniverso['tipo'], prefijo: string, x: { id: string; name: string }, linea: string | undefined): ElementoDeUniverso => {
    const id = sinPrefijo(prefijo, x.id); max = Math.max(max, sufijo(id));
    return { id, tipo, nombre: x.name, linea: linea ?? '', grupo: 'main', voz: 'auto', origen: 'usuario' };
  };
  const elementos = [
    ...prod.characters.map((x) => hacer('character', 'ch_', x, x.identityDescription)),
    ...prod.locations.map((x) => hacer('place', 'lo_', x, x.description)),
    ...prod.objects.map((x) => hacer('object', 'ob_', x, x.description)),
  ];
  return { elementos, aprobado: false, siguiente: max + 1 };
};

/** El tipo de la experiencia de una producción guardada (por defecto, cortometraje). */
export const tipoDeLaProduccion = (prod: FilmmakerProduction): string => tipoDeLaExperiencia(prod.intent?.productionType) ?? 'short';
