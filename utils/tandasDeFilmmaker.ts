/**
 * TANDAS Y STORYBOARD DE FILMMAKER (ola 3, 2026-11-17; constitución §12). Lógica PURA, sin React ni red, para poder probarla suelta.
 *
 * Una TANDA es un grupo de escenas del contrato (no hay temporadas ni episodios: «Serie» sigue cerrada). Un CUADRO del storyboard es un plano del
 * contrato: su encuadre, su cámara y su ritmo se guardan por RUTA del lenguaje creativo (`shot.type`, `movement.type`, `movement.speed`…), que es la
 * misma forma que ya usa Weë Studio; aquí no se inventa ningún vocabulario. Hoy todo vive en el estado de la pantalla: no hay contrato que persista
 * tandas ni storyboards (decisión de datos pendiente), y la interfaz lo dice.
 */
import { SeleccionCreativa, filtrarCreativo } from '../constants/camaraCinematica';

/** Estados de una tanda. `producing`, `done` y `error` los fijará la Producción (ola 4); hoy ninguna acción llega a ellos, pero la lista ya los sabe pintar. */
export type EstadoDeTanda = 'none' | 'review' | 'approved' | 'producing' | 'done' | 'error';
export const ESTADOS_DE_TANDA: readonly EstadoDeTanda[] = ['none', 'review', 'approved', 'producing', 'done', 'error'];

export type EstadoDeProduccion = 'producing' | 'done' | 'error';

/** Quién dice el texto de un cuadro: nadie, el narrador o un personaje (su identificador del universo). */
export const SIN_HABLANTE = '';
export const NARRADOR = 'narrator';

export interface CuadroDeStoryboard {
  readonly id: string;
  readonly texto: string;
  readonly hablante: string;
  /** Voz PROPIA del cuadro (id del catálogo o 'auto'); ausente/null = hereda la de la tanda y la del personaje (ver `utils/sonidoDeFilmmaker`). */
  readonly voz?: string | null;
  /** Segundos. */
  readonly duracion: number;
  /** Encuadre, cámara y ritmo por ruta del lenguaje creativo. El rótulo de plano de la rejilla sale de `shot.type`. */
  readonly creativo: SeleccionCreativa;
  /** Cuadro de ejemplo que Weë puso para enseñar el storyboard: se rotula «Ejemplo» y se quita de un toque. Al editarlo deja de serlo. */
  readonly ejemplo?: boolean;
}

export interface Tanda {
  readonly id: string;
  /** Vacío = la pantalla pone «Capítulo n»; es texto de la persona cuando lo escribe. */
  readonly titulo: string;
  /** Duración objetivo en segundos (≈ 3:00 por capítulo). */
  readonly objetivo: number;
  /** Voz propia de la tanda (la «escena» de la herencia); ausente/null = hereda la del personaje. */
  readonly voz?: string | null;
  readonly cuadros: readonly CuadroDeStoryboard[];
  /** La persona aprobó el storyboard. Cualquier cambio posterior lo deja «en revisión» (se invalida, no se borra nada). */
  readonly aprobada: boolean;
  /** Guardado en el almacén (de esta sesión mientras el almacén de la cuenta no exista). Solo con la tanda aprobada. */
  readonly almacen: boolean;
  /** Lo fija la Producción (ola 4). */
  readonly produccion?: EstadoDeProduccion;
  readonly ejemplo?: boolean;
}

export interface TandasDelTaller {
  readonly tandas: readonly Tanda[];
  readonly siguiente: number;
}

export const OBJETIVO_POR_TANDA = 180;
export const DURACION_DE_CUADRO_POR_DEFECTO = 6;
/** Tope de un cuadro hoy: 15 s (Seedance 2.0). 2.5 llega a 30 s, pero la presentación por modelo es la decisión D7, pendiente: se sube cambiando esta constante. */
export const TOPE_DE_CUADRO = 15;
export const TOPES_TANDAS = { tandas: 24, cuadros: 60, texto: 240, titulo: 60 } as const;
/** Lo que admite hoy el montaje final del contrato: se enseña, nunca se promete más. */
export const LIMITE_DEL_MONTAJE = { planos: 60, segundos: 600 } as const;
export const PLANO_POR_DEFECTO = 'medium';

export const tandasVacias = (): TandasDelTaller => ({ tandas: [], siguiente: 1 });

const recortar = (s: string, n: number): string => Array.from(s.replace(/\s+/g, ' ').trim()).slice(0, n).join('');
const acotar = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));
const entero = (n: number): number => Math.round(Number.isFinite(n) ? n : 0);

/** El estado visible de una tanda: lo de la Producción manda; si no, depende de si hay cuadros y de si se aprobó. */
export const estadoDe = (t: Tanda): EstadoDeTanda => {
  if (t.produccion) return t.produccion;
  if (t.cuadros.length === 0) return 'none';
  return t.aprobada ? 'approved' : 'review';
};

export const duracionDe = (t: Tanda): number => t.cuadros.reduce((n, c) => n + c.duracion, 0);

/** Minutos y segundos de un instante, para pintarlos con los dígitos del idioma. */
export const partirTiempo = (seg: number): { m: number; s: number } => {
  const total = Math.max(0, entero(seg));
  return { m: Math.floor(total / 60), s: total % 60 };
};

/** «0:00–0:06» como pares de inicio/fin acumulados, uno por cuadro. */
export const tiemposDe = (t: Tanda): readonly { inicio: number; fin: number }[] => {
  let acc = 0;
  return t.cuadros.map((c) => { const inicio = acc; acc += c.duracion; return { inicio, fin: acc }; });
};

export const totales = (s: TandasDelTaller): { tandas: number; cuadros: number; segundos: number } => ({
  tandas: s.tandas.length,
  cuadros: s.tandas.reduce((n, t) => n + t.cuadros.length, 0),
  segundos: s.tandas.reduce((n, t) => n + duracionDe(t), 0),
});

/** Si el conjunto pasa de lo que admite el montaje final del contrato (60 planos / 600 s). */
export const excesoDelMontaje = (s: TandasDelTaller): { planos: boolean; segundos: boolean } => {
  const x = totales(s);
  return { planos: x.cuadros > LIMITE_DEL_MONTAJE.planos, segundos: x.segundos > LIMITE_DEL_MONTAJE.segundos };
};

/* ── Tandas ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const mapear = (s: TandasDelTaller, id: string, f: (t: Tanda) => Tanda): TandasDelTaller => ({ ...s, tandas: s.tandas.map((t) => (t.id === id ? f(t) : t)) });
/** Tocar los cuadros invalida la aprobación y el almacén (no la producción: esa ya no se toca desde aquí). */
const invalidar = (t: Tanda): Tanda => ({ ...t, aprobada: false, almacen: false });

export const hayCupoDeTandas = (s: TandasDelTaller): boolean => s.tandas.length < TOPES_TANDAS.tandas;

export const anadirTanda = (s: TandasDelTaller, objetivo: number = OBJETIVO_POR_TANDA, titulo = ''): TandasDelTaller => {
  if (!hayCupoDeTandas(s)) return s;
  const t: Tanda = { id: `ta_${s.siguiente}`, titulo: recortar(titulo, TOPES_TANDAS.titulo), objetivo: acotar(entero(objetivo), 10, 3600), cuadros: [], aprobada: false, almacen: false };
  return { tandas: [...s.tandas, t], siguiente: s.siguiente + 1 };
};

/** «Weë lo hace por mí»: capítulos de ≈ 3:00 repartidos por igual según la duración total. Sustituye las tandas VACÍAS y conserva las que ya tienen cuadros. */
export const dividirPorDuracion = (s: TandasDelTaller, totalSeg: number): TandasDelTaller => {
  const conservadas = s.tandas.filter((t) => t.cuadros.length > 0);
  const hueco = TOPES_TANDAS.tandas - conservadas.length;
  const n = acotar(Math.ceil(Math.max(1, totalSeg) / OBJETIVO_POR_TANDA), 1, Math.max(1, hueco));
  const cada = Math.round(Math.max(1, totalSeg) / n);
  let sig = s.siguiente;
  const nuevas: Tanda[] = Array.from({ length: n }, () => ({ id: `ta_${sig++}`, titulo: '', objetivo: acotar(cada, 10, 3600), cuadros: [], aprobada: false, almacen: false }));
  return { tandas: [...conservadas, ...nuevas].slice(0, TOPES_TANDAS.tandas), siguiente: sig };
};

export const renombrarTanda = (s: TandasDelTaller, id: string, titulo: string): TandasDelTaller => mapear(s, id, (t) => ({ ...t, titulo: recortar(titulo, TOPES_TANDAS.titulo), ejemplo: false }));

export const cambiarObjetivo = (s: TandasDelTaller, id: string, objetivo: number): TandasDelTaller => mapear(s, id, (t) => ({ ...t, objetivo: acotar(entero(objetivo), 10, 3600) }));

export const quitarTanda = (s: TandasDelTaller, id: string): TandasDelTaller => ({ ...s, tandas: s.tandas.filter((t) => t.id !== id) });

export const moverTanda = (s: TandasDelTaller, id: string, delta: -1 | 1): TandasDelTaller => {
  const i = s.tandas.findIndex((t) => t.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= s.tandas.length) return s;
  const copia = [...s.tandas];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return { ...s, tandas: copia };
};

export const puedeUnirConSiguiente = (s: TandasDelTaller, id: string): boolean => {
  const i = s.tandas.findIndex((t) => t.id === id);
  if (i < 0 || i >= s.tandas.length - 1) return false;
  return s.tandas[i].cuadros.length + s.tandas[i + 1].cuadros.length <= TOPES_TANDAS.cuadros && !s.tandas[i].produccion && !s.tandas[i + 1].produccion;
};

/** Une una tanda con la siguiente: sus cuadros se suman, el objetivo también y vuelve a estar «en revisión». */
export const unirConSiguiente = (s: TandasDelTaller, id: string): TandasDelTaller => {
  if (!puedeUnirConSiguiente(s, id)) return s;
  const i = s.tandas.findIndex((t) => t.id === id);
  const a = s.tandas[i];
  const b = s.tandas[i + 1];
  const unida: Tanda = invalidar({ ...a, objetivo: acotar(a.objetivo + b.objetivo, 10, 3600), cuadros: [...a.cuadros, ...b.cuadros], ejemplo: !!a.ejemplo && !!b.ejemplo });
  return { ...s, tandas: [...s.tandas.slice(0, i), unida, ...s.tandas.slice(i + 2)] };
};

export const puedePartir = (s: TandasDelTaller, id: string): boolean => {
  const t = s.tandas.find((x) => x.id === id);
  return !!t && t.cuadros.length >= 2 && hayCupoDeTandas(s) && !t.produccion;
};

/** Parte una tanda en dos desde el cuadro `desdeIndice` (el cuadro pasa a abrir la segunda). Con `undefined` parte por la mitad. El objetivo se reparte en proporción. */
export const partirTanda = (s: TandasDelTaller, id: string, desdeIndice?: number): TandasDelTaller => {
  if (!puedePartir(s, id)) return s;
  const i = s.tandas.findIndex((t) => t.id === id);
  const t = s.tandas[i];
  const corte = acotar(desdeIndice ?? Math.ceil(t.cuadros.length / 2), 1, t.cuadros.length - 1);
  const total = Math.max(1, duracionDe(t));
  const antes = t.cuadros.slice(0, corte);
  const despues = t.cuadros.slice(corte);
  const dAntes = antes.reduce((n, c) => n + c.duracion, 0);
  const objAntes = acotar(Math.round((t.objetivo * dAntes) / total), 10, 3600);
  const primera: Tanda = invalidar({ ...t, cuadros: antes, objetivo: objAntes });
  const segunda: Tanda = invalidar({ id: `ta_${s.siguiente}`, titulo: '', objetivo: acotar(t.objetivo - objAntes, 10, 3600), cuadros: despues, aprobada: false, almacen: false, ejemplo: t.ejemplo });
  return { tandas: [...s.tandas.slice(0, i), primera, segunda, ...s.tandas.slice(i + 1)], siguiente: s.siguiente + 1 };
};

/* ── Cuadros ────────────────────────────────────────────────────────────────────────────────────────────────────── */

export const hayCupoDeCuadros = (t: Tanda): boolean => t.cuadros.length < TOPES_TANDAS.cuadros;

export const nuevoCuadro = (id: string, texto = ''): CuadroDeStoryboard => ({
  id, texto: recortar(texto, TOPES_TANDAS.texto), hablante: SIN_HABLANTE, duracion: DURACION_DE_CUADRO_POR_DEFECTO, creativo: { 'shot.type': PLANO_POR_DEFECTO },
});

export const anadirCuadro = (s: TandasDelTaller, tandaId: string, texto = ''): { estado: TandasDelTaller; cuadroId: string | null } => {
  const t = s.tandas.find((x) => x.id === tandaId);
  if (!t || !hayCupoDeCuadros(t) || t.produccion) return { estado: s, cuadroId: null };
  const cuadroId = `cu_${s.siguiente}`;
  return { estado: { tandas: s.tandas.map((x) => (x.id === tandaId ? invalidar({ ...x, cuadros: [...x.cuadros, nuevoCuadro(cuadroId, texto)] }) : x)), siguiente: s.siguiente + 1 }, cuadroId };
};

export interface CambiosDeCuadro { texto?: string; hablante?: string; voz?: string | null; duracion?: number; creativo?: SeleccionCreativa }

export const editarCuadro = (s: TandasDelTaller, tandaId: string, cuadroId: string, c: CambiosDeCuadro): TandasDelTaller =>
  mapear(s, tandaId, (t) => (t.produccion ? t : invalidar({
    ...t,
    cuadros: t.cuadros.map((q) => (q.id !== cuadroId ? q : {
      ...q,
      texto: c.texto !== undefined ? recortar(c.texto, TOPES_TANDAS.texto) : q.texto,
      hablante: c.hablante !== undefined ? c.hablante : q.hablante,
      voz: c.voz !== undefined ? c.voz : q.voz,
      duracion: c.duracion !== undefined ? acotar(entero(c.duracion), 1, TOPE_DE_CUADRO) : q.duracion,
      creativo: c.creativo !== undefined ? filtrarCreativo(c.creativo) : q.creativo,
      ejemplo: false,
    })),
  })));

export const quitarCuadro = (s: TandasDelTaller, tandaId: string, cuadroId: string): TandasDelTaller =>
  mapear(s, tandaId, (t) => (t.produccion ? t : invalidar({ ...t, cuadros: t.cuadros.filter((q) => q.id !== cuadroId) })));

export const moverCuadro = (s: TandasDelTaller, tandaId: string, cuadroId: string, delta: -1 | 1): TandasDelTaller =>
  mapear(s, tandaId, (t) => {
    const i = t.cuadros.findIndex((q) => q.id === cuadroId);
    const j = i + delta;
    if (t.produccion || i < 0 || j < 0 || j >= t.cuadros.length) return t;
    const copia = [...t.cuadros];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return invalidar({ ...t, cuadros: copia });
  });

export const duplicarCuadro = (s: TandasDelTaller, tandaId: string, cuadroId: string): TandasDelTaller => {
  const t = s.tandas.find((x) => x.id === tandaId);
  const i = t ? t.cuadros.findIndex((q) => q.id === cuadroId) : -1;
  if (!t || i < 0 || !hayCupoDeCuadros(t) || t.produccion) return s;
  const copia: CuadroDeStoryboard = { ...t.cuadros[i], id: `cu_${s.siguiente}`, ejemplo: false };
  return { tandas: s.tandas.map((x) => (x.id === tandaId ? invalidar({ ...x, cuadros: [...x.cuadros.slice(0, i + 1), copia, ...x.cuadros.slice(i + 1)] }) : x)), siguiente: s.siguiente + 1 };
};

/** Pone o quita (con `null`, o repitiendo el mismo valor) una ruta del lenguaje creativo de un cuadro. Lo que el contrato no admite se descarta. */
export const conCreativo = (creativo: SeleccionCreativa, ruta: string, valor: string | null): SeleccionCreativa => {
  const base: Record<string, string> = { ...creativo };
  if (valor === null || base[ruta] === valor) delete base[ruta];
  else base[ruta] = valor;
  return filtrarCreativo(base);
};

/* ── Aprobación y almacén ───────────────────────────────────────────────────────────────────────────────────────── */

export const puedeAprobar = (t: Tanda): boolean => t.cuadros.length >= 1 && !t.produccion;
export const aprobarTanda = (s: TandasDelTaller, id: string): TandasDelTaller => mapear(s, id, (t) => (puedeAprobar(t) ? { ...t, aprobada: true } : t));
export const puedeGuardarEnAlmacen = (t: Tanda): boolean => t.aprobada && t.cuadros.length >= 1;
export const guardarEnAlmacen = (s: TandasDelTaller, id: string): TandasDelTaller => mapear(s, id, (t) => (puedeGuardarEnAlmacen(t) ? { ...t, almacen: true } : t));
/** Todas las tandas con cuadros están aprobadas (y hay al menos una): lo que pide la etapa de Producción para abrirse. */
export const todasAprobadas = (s: TandasDelTaller): boolean => s.tandas.length > 0 && s.tandas.every((t) => t.cuadros.length > 0 && t.aprobada);

/** La primera tanda que pide la atención de la persona: sin storyboard o en revisión. */
export const siguientePendiente = (s: TandasDelTaller): Tanda | null => s.tandas.find((t) => { const e = estadoDe(t); return e === 'none' || e === 'review'; }) ?? null;

/* ── Ejemplo ────────────────────────────────────────────────────────────────────────────────────────────────────── */

export interface EjemploDeTanda { readonly objetivo: number; readonly cuadros: readonly { texto: string; hablante: string; duracion: number; plano: string; movimiento?: string }[] }

/** Añade tandas de ejemplo (con textos ya traducidos por quien llama). Los cuadros y las tandas quedan marcados «ejemplo». */
export const anadirEjemplos = (s: TandasDelTaller, ejemplos: readonly EjemploDeTanda[]): TandasDelTaller => {
  let sig = s.siguiente;
  const nuevas: Tanda[] = [];
  for (const e of ejemplos) {
    if (s.tandas.length + nuevas.length >= TOPES_TANDAS.tandas) break;
    nuevas.push({
      id: `ta_${sig++}`, titulo: '', objetivo: e.objetivo, aprobada: false, almacen: false, ejemplo: true,
      cuadros: e.cuadros.slice(0, TOPES_TANDAS.cuadros).map((c) => ({
        id: `cu_${sig++}`, texto: recortar(c.texto, TOPES_TANDAS.texto), hablante: c.hablante, duracion: acotar(entero(c.duracion), 1, TOPE_DE_CUADRO), ejemplo: true,
        creativo: filtrarCreativo({ 'shot.type': c.plano, ...(c.movimiento ? { 'movement.type': c.movimiento } : {}) }),
      })),
    });
  }
  return { tandas: [...s.tandas, ...nuevas], siguiente: sig };
};

export const hayEjemplos = (s: TandasDelTaller): boolean => s.tandas.some((t) => t.ejemplo || t.cuadros.some((c) => c.ejemplo));

/** Quita lo que era de ejemplo: las tandas enteras de ejemplo y, en las demás, solo los cuadros de ejemplo que sigan sin tocar. */
export const quitarEjemplos = (s: TandasDelTaller): TandasDelTaller => ({
  ...s,
  tandas: s.tandas
    .filter((t) => !(t.ejemplo && t.cuadros.every((c) => c.ejemplo)))
    .map((t) => (t.cuadros.some((c) => c.ejemplo) ? { ...t, cuadros: t.cuadros.filter((c) => !c.ejemplo), aprobada: false, almacen: false } : t)),
});

export const tandaEsDeEjemplo = (t: Tanda): boolean => t.cuadros.length > 0 && t.cuadros.every((c) => c.ejemplo);

/** Carga un capítulo de ejemplo DENTRO de una tanda existente (la vacía en la que está la persona), sin crear otra. Los cuadros quedan marcados «ejemplo». */
export const cargarEjemploEnTanda = (s: TandasDelTaller, tandaId: string, e: EjemploDeTanda): TandasDelTaller => {
  const t = s.tandas.find((x) => x.id === tandaId);
  if (!t || t.produccion) return s;
  let sig = s.siguiente;
  const cupo = TOPES_TANDAS.cuadros - t.cuadros.length;
  const nuevos: CuadroDeStoryboard[] = e.cuadros.slice(0, Math.max(0, cupo)).map((c) => ({
    id: `cu_${sig++}`, texto: recortar(c.texto, TOPES_TANDAS.texto), hablante: c.hablante, duracion: acotar(entero(c.duracion), 1, TOPE_DE_CUADRO), ejemplo: true,
    creativo: filtrarCreativo({ 'shot.type': c.plano, ...(c.movimiento ? { 'movement.type': c.movimiento } : {}) }),
  }));
  const cargada: Tanda = invalidar({ ...t, cuadros: [...t.cuadros, ...nuevos], ejemplo: t.cuadros.length === 0 ? true : t.ejemplo });
  return { tandas: s.tandas.map((x) => (x.id === tandaId ? cargada : x)), siguiente: sig };
};

/** La voz propia de la tanda (`null` = hereda). Cambiar la voz no invalida la aprobación del storyboard: no cambia ningún cuadro. */
export const cambiarVozDeTanda = (s: TandasDelTaller, id: string, voz: string | null): TandasDelTaller => mapear(s, id, (t) => ({ ...t, voz }));
