/*
 * LEER UNA ENCUESTA (Bloque C).
 *
 * Las cuentas que hacen falta para dibujar una encuesta: si es de las antiguas,
 * si ya se cerró, cuántos votos tiene cada opción y qué porcentaje le toca.
 *
 * Está fuera del componente por lo mismo que `pollDraft`: así se puede EJECUTAR
 * en las pruebas. Los porcentajes y la detección del formato antiguo son
 * aritmética y reglas, no pintura, y son justo lo que hay que poder comprobar.
 *
 * Aquí no se vota ni se escribe nada: solo se lee lo que ya hay.
 */
import type { PostPoll } from '../services/firestoreService';

// ─── Fechas ──────────────────────────────────────────────────────────────────

/**
 * Milisegundos de un `endsAt`, venga como venga: Timestamp de Firestore,
 * Timestamp serializado, Date o número. Lo que no se entiende no abre nada.
 */
export const milisDe = (valor: unknown): number | null => {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor !== 'object') return null;
  const obj = valor as Record<string, any>;
  if (typeof obj.toMillis === 'function') {
    const ms = obj.toMillis();
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
  }
  const seg = typeof obj.seconds === 'number' ? obj.seconds : obj._seconds;
  if (typeof seg === 'number' && Number.isFinite(seg)) {
    const nanos = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : obj._nanoseconds;
    return seg * 1000 + Math.floor((typeof nanos === 'number' ? nanos : 0) / 1e6);
  }
  return null;
};

/** Una encuesta sin fecha entendible se considera cerrada, nunca abierta. */
export const estaCerrada = (poll: PostPoll | null | undefined, ahoraMs: number): boolean => {
  if (!poll) return true;
  const fin = milisDe(poll.endsAt);
  return fin === null || ahoraMs >= fin;
};

// ─── Formato antiguo ─────────────────────────────────────────────────────────

/*
 * Una encuesta HISTÓRICA es la que guarda los votos dentro de cada opción
 * (`votes` / `votedBy`) en vez de en `counts`, y sin ids de opción.
 *
 * Esta comprobación es la MISMA que hace el servidor en `votePoll`: si aquí
 * dijéramos que se puede votar y allí que no, la persona tocaría una opción para
 * recibir un error. Sus documentos no se migran ni se tocan: se leen y ya está.
 */
export const esHistorica = (poll: PostPoll | null | undefined): boolean => {
  const opciones = poll?.options;
  if (!Array.isArray(opciones) || opciones.length === 0) return false;
  return opciones.some((opt) => {
    const o = opt as unknown as Record<string, unknown> | null;
    if (!o) return true;
    return typeof o.id !== 'string' || o.id === '' || Array.isArray(o.votedBy) || typeof o.votes === 'number';
  });
};

// ─── Porcentajes ─────────────────────────────────────────────────────────────

/**
 * Reparte 100 puntos entre las opciones sin que falte ni sobre ninguno.
 *
 * Redondear cada porcentaje por su cuenta deja sumas de 99 o 101 —tres opciones
 * empatadas dan 33+33+33—, y eso se ve. Aquí se reparten los enteros y los
 * puntos que sobran van a las opciones con el resto más grande, que es el
 * reparto que menos se aleja del valor real.
 */
export const repartirPorcentajes = (votos: number[]): number[] => {
  const limpios = votos.map((v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0));
  const total = limpios.reduce((a, b) => a + b, 0);
  if (total <= 0) return limpios.map(() => 0);

  const exactos = limpios.map((v) => (v * 100) / total);
  const enteros = exactos.map((e) => Math.floor(e));
  let sobran = 100 - enteros.reduce((a, b) => a + b, 0);

  const porResto = exactos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);

  for (let k = 0; k < porResto.length && sobran > 0; k++, sobran--) enteros[porResto[k].i] += 1;
  return enteros;
};

// ─── Resultados ──────────────────────────────────────────────────────────────

export interface FilaEncuesta {
  /** El id real en el modelo nuevo. En una encuesta histórica es sintético y no sirve para votar. */
  id: string;
  text: string;
  votos: number;
  porcentaje: number;
}

export interface ResultadosEncuesta {
  historica: boolean;
  total: number;
  filas: FilaEncuesta[];
}

/**
 * Las filas de la encuesta con sus cifras ya hechas.
 *
 * Modelo nuevo: los votos salen de `counts[optionId]` y el total de
 * `totalVotes`, que es lo que escribe el servidor. Nunca se suman las opciones
 * para sacar el total: si alguna vez no cuadraran, manda el contador del
 * servidor.
 *
 * Modelo antiguo: los votos salen de `options[].votes` y, si no hay
 * `totalVotes`, se suman —es lo único que hay en esos documentos—.
 */
export const resultadosDe = (poll: PostPoll | null | undefined): ResultadosEncuesta => {
  const opciones = Array.isArray(poll?.options) ? poll!.options : [];
  const historica = esHistorica(poll);

  const votos = opciones.map((opt, i) => {
    if (historica) return typeof opt?.votes === 'number' && opt.votes > 0 ? opt.votes : 0;
    const n = poll?.counts ? poll.counts[opt.id as string] : 0;
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
  });

  const declarado = typeof poll?.totalVotes === 'number' && Number.isFinite(poll.totalVotes) ? poll.totalVotes : null;
  const total = declarado !== null ? Math.max(0, declarado) : votos.reduce((a, b) => a + b, 0);

  const porcentajes = repartirPorcentajes(votos);

  return {
    historica,
    total,
    filas: opciones.map((opt, i) => ({
      id: typeof opt?.id === 'string' && opt.id ? opt.id : `historica_${i}`,
      text: typeof opt?.text === 'string' ? opt.text : '',
      votos: votos[i],
      porcentaje: porcentajes[i],
    })),
  };
};

// ─── Cuánto queda ────────────────────────────────────────────────────────────

/** "2 días restantes", "5 horas restantes", "Menos de 1 hora" o "Encuesta finalizada". */
export const tiempoRestante = (poll: PostPoll | null | undefined, ahoraMs: number): string => {
  if (estaCerrada(poll, ahoraMs)) return 'Encuesta finalizada';
  const resta = (milisDe(poll!.endsAt) as number) - ahoraMs;
  const dias = Math.floor(resta / (1000 * 60 * 60 * 24));
  const horas = Math.floor((resta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (dias > 0) return `${dias} día${dias > 1 ? 's' : ''} restante${dias > 1 ? 's' : ''}`;
  if (horas > 0) return `${horas} hora${horas > 1 ? 's' : ''} restante${horas > 1 ? 's' : ''}`;
  return 'Menos de 1 hora';
};

/** "20 votos", "1 voto", "Sin votos todavía". */
export const textoVotos = (total: number): string => {
  if (total <= 0) return 'Sin votos todavía';
  return `${total} voto${total === 1 ? '' : 's'}`;
};
