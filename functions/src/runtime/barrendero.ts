import { Job } from '../core';
import { AccionDeLiquidacion, PuertoDeLiquidacion, decidirLiquidacion, reservaDe } from './liquidacion';

/**
 * WEË RUNTIME — EL BARRENDERO: QUÉ SE QUEDÓ SIN CERRAR.
 *
 * Alguien tiene que hacerse la pregunta que nadie se hace cuando un proceso
 * desaparece: «¿quedó dinero reservado sin cobrar ni devolver?». Esto es ese
 * alguien. Recorre trabajos guardados, le pregunta a `liquidacion.ts` qué toca,
 * y lo hace.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No es un segundo motor de trabajos: no reclama, no ejecuta, no reintenta y no
 * habla con ningún proveedor. No es un bucle: entra, recorre lo que le dejan
 * recorrer y sale. No tiene temporizadores por trabajo ni vive dentro de Weë
 * Brain. Quién lo llama y cada cuánto es de quien lo componga; aquí no se
 * decide.
 *
 * ── Por qué puede correr dos veces a la vez ─────────────────────────────────
 *
 * Porque no se fía de sí mismo. Dos barrenderos que miren el mismo trabajo
 * llamarán los dos al Credit Engine, y el Credit Engine ya es idempotente por
 * `requestId`: el primero mueve el dinero y al segundo le contesta «esto ya
 * está», sin tocar nada. La marca que deja este barrendero es para no volver a
 * mirar, NO para saber si ya se hizo. La verdad de si una reserva está cerrada
 * la tiene la transacción, y solo ella.
 *
 * Lo mismo vale para un barrendero y un trabajador corriendo a la vez, o para
 * un reintento y una liquidación: exactamente una transición financiera, porque
 * quien la aplica es el mismo motor de siempre y sabe decir que no.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA. No está programado, no hay nadie
 * llamándolo y no se despliega en este bloque.
 */

/** Lo que el barrendero necesita del almacén. Menos que el `JobStore` entero, a propósito. */
export interface FuenteDeTrabajosPorLiquidar {
  /** Trabajos que declaran una reserva y no constan como cerrados. Paginado, sin índice compuesto. */
  porLiquidar(consulta: { limit: number; cursor?: string }): Promise<{ jobs: readonly Job[]; cursor?: string }>;
  /**
   * Deja constancia de que este trabajo ya no hay que volver a mirarlo. Es un
   * campo de búsqueda del almacén, no del trabajo: no es una transición del
   * motor y no toca la verdad guardada.
   */
  marcarLiquidado(jobId: string): Promise<void>;
}

export interface BarrenderoDeps {
  trabajos: FuenteDeTrabajosPorLiquidar;
  liquidacion: PuertoDeLiquidacion;
  ahora: () => number;
  /** Cuántos por página. */
  porPagina?: number;
  /** Cuántas páginas como mucho en una pasada. Un barrendero que no termina nunca es un bucle. */
  maxPaginas?: number;
  /** Para poder verlo desde fuera sin que esto sepa cómo se registra nada. */
  observar?: (v: VistoPorElBarrendero) => void;
}

export interface VistoPorElBarrendero {
  jobId: string;
  ownerUserId: string;
  accion: AccionDeLiquidacion['tipo'];
  motivo?: string;
  desenlace?: string;
  estado?: string;
  /** Para poder correlacionarlo con todo lo demás. Identificadores, nunca contenido. */
  requestId?: string;
  attemptId?: string;
  operationId?: string;
  traceId?: string;
  capability?: string;
  providerId?: string;
  modelId?: string;
  service?: string;
  importe?: number;
}

export interface InformeDelBarrendero {
  mirados: number;
  /**
   * Cuántos QUEDARON cobrados. No dice cuántos cobró este barrendero: el Credit
   * Engine contesta lo mismo tanto si acaba de cobrar como si ya estaba cobrado
   * (`liquidacion.ts`), y contar lo que no se puede saber sería inventarlo.
   */
  liquidados: number;
  reembolsados: number;
  /** Seguían vivos o el motor de trabajos aún puede moverlos: no se tocan. */
  esperando: number;
  /** Salieron y no se sabe cómo acabaron. NO se reembolsan: alguien tiene que averiguarlo. */
  aReconciliar: number;
  /** Ya estaban cerradas: el Credit Engine lo dijo sin mover nada. */
  yaEstaban: number;
  fallos: number;
  /** Quedaron páginas sin mirar: la siguiente pasada sigue por aquí. */
  cursor?: string;
  vistos: readonly VistoPorElBarrendero[];
}

const POR_PAGINA = 100;
const MAX_PAGINAS = 10;

export const barrerLiquidaciones = async (deps: BarrenderoDeps): Promise<InformeDelBarrendero> => {
  const porPagina = Math.max(1, Math.min(Math.floor(deps.porPagina ?? POR_PAGINA), 500));
  const maxPaginas = Math.max(1, Math.min(Math.floor(deps.maxPaginas ?? MAX_PAGINAS), 100));
  const vistos: VistoPorElBarrendero[] = [];
  let mirados = 0; let liquidados = 0; let reembolsados = 0; let esperando = 0; let aReconciliar = 0; let yaEstaban = 0; let fallos = 0;
  let cursor: string | undefined;

  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    const { jobs, cursor: siguiente } = await deps.trabajos.porLiquidar({ limit: porPagina, ...(cursor ? { cursor } : {}) });
    for (const job of jobs) {
      mirados++;
      const reserva = reservaDe(job);
      const accion = decidirLiquidacion(job, deps.ahora());
      const intento = job.attempts[job.attempts.length - 1];
      const base: VistoPorElBarrendero = {
        jobId: job.jobId,
        ownerUserId: job.owner.userId,
        accion: accion.tipo,
        ...('motivo' in accion ? { motivo: accion.motivo } : {}),
        ...(reserva ? { requestId: reserva.requestId, ...(reserva.service ? { service: reserva.service } : {}) } : {}),
        ...(intento?.attemptId ? { attemptId: intento.attemptId } : {}),
        ...(job.context.operationId ? { operationId: job.context.operationId } : {}),
        ...(job.trace?.traceId ? { traceId: job.trace.traceId } : {}),
        ...(job.capability ? { capability: job.capability } : {}),
        ...(job.implementation ? { providerId: job.implementation.providerId, modelId: job.implementation.modelId } : {}),
      };

      /* Vivo, o del motor de trabajos: no se toca, y se vuelve a mirar en la siguiente pasada. */
      if (accion.tipo === 'esperar') { esperando++; vistos.push(base); deps.observar?.(base); continue; }
      /*
       * SALIÓ Y NO SE SABE. Ni se cobra ni se devuelve, y se deja marcado para
       * no volver a intentarlo en cada pasada: esto lo resuelve el aviso del
       * proveedor o una persona, no el paso del tiempo.
       */
      if (accion.tipo === 'reconciliar') {
        aReconciliar++;
        vistos.push(base); deps.observar?.(base);
        await deps.trabajos.marcarLiquidado(job.jobId).catch(() => undefined);
        continue;
      }
      /* Sin reserva no hay nada que cerrar; se marca para dejar de mirarlo. */
      if (accion.tipo === 'nada' || !reserva) {
        vistos.push(base); deps.observar?.(base);
        await deps.trabajos.marcarLiquidado(job.jobId).catch(() => undefined);
        continue;
      }

      const resultado = accion.tipo === 'liquidar'
        ? await deps.liquidacion.liquidar({ userId: job.owner.userId, reserva, importe: accion.importe, jobId: job.jobId })
        : await deps.liquidacion.reembolsar({ userId: job.owner.userId, reserva, motivo: accion.motivo, jobId: job.jobId });

      const visto = { ...base, desenlace: resultado.desenlace, ...(resultado.estado ? { estado: resultado.estado } : {}), ...(accion.tipo === 'liquidar' ? { importe: accion.importe } : {}) };
      vistos.push(visto); deps.observar?.(visto);

      if (resultado.desenlace === 'fallo') { fallos++; continue; }
      if (resultado.desenlace === 'ya_estaba') yaEstaban++;
      else if (resultado.desenlace === 'liquidada') liquidados++;
      else reembolsados++;
      /* Cerrado —ahora o antes—: que no vuelva a salir en la consulta. */
      await deps.trabajos.marcarLiquidado(job.jobId).catch(() => undefined);
    }
    cursor = siguiente;
    if (!cursor) break;
  }

  return { mirados, liquidados, reembolsados, esperando, aReconciliar, yaEstaban, fallos, ...(cursor ? { cursor } : {}), vistos };
};
