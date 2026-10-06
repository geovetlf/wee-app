import { DerechosDelMaterial, Job, JobEngine, JobStore, esTrabajoTerminal } from '../core';
import { AvisoNormalizado, leerAviso } from './aviso';
import { PuertoDeMaterializacion, identidadDelMaterial, procedenciaDe, tipoDeMaterialDe } from './materializacion';
import { BusquedaPorOperacion, identidadDeEvento } from './proveedor';

/**
 * WEË RUNTIME — QUÉ SE HACE CON LO QUE CUENTA UN PROVEEDOR.
 *
 * Aquí se juntan las tres piezas que por separado no sirven de nada: encontrar
 * de quién es el aviso (`proveedor.ts`), entender qué dice (`aviso.ts`) y
 * traerse el resultado antes de que caduque (`materializacion.ts`). El orden es
 * el que protege el dinero y el resultado:
 *
 *     1. ¿de quién es?      lo dice lo GUARDADO, nunca el mensaje
 *     2. ¿qué dice?         traducido por el adaptador, leído sin fiarse
 *     3. ¿está en casa?     un final bueno se guarda ANTES de cerrarse
 *     4. aplicar            una transición del motor de siempre, no otra
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No es un segundo motor de trabajos: no reclama, no reintenta, no decide
 * plazos y no mueve dinero. Lo único que hace es convertir un mensaje en un
 * `ProviderEvent` y dárselo al motor, que es quien decide siempre. Tampoco es
 * un servidor: no sabe de HTTP, ni de Firestore, ni de red. Todo eso entra por
 * puertos, y por eso esto se puede probar entero sin levantar nada.
 *
 * ── La respuesta hacia fuera es siempre la misma ────────────────────────────
 *
 * Una operación que no existe y una de otra cuenta se contestan IGUAL. Quien
 * manda un aviso no puede averiguar, probando nombres, si una tarea pertenece a
 * alguien: eso convertiría este puerto en un buscador de cuentas ajenas.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

export interface AtencionDeps {
  /** Encontrar el trabajo por cómo llama el proveedor a la operación. */
  trabajos: {
    porReferenciaDeProveedor(providerId: string, operationId: string): Promise<BusquedaPorOperacion>;
  };
  /** El MISMO motor de siempre. No hay otro. */
  motor: Pick<JobEngine, 'recibirEvento'>;
  almacen: Pick<JobStore, 'aplicar'>;
  /** Quien se trae el resultado a casa. Sin él, un final bueno no se cierra. */
  materializar: PuertoDeMaterializacion;
  ahora: () => number;
  /** Para poder verlo desde fuera sin que esto sepa cómo se registra nada. */
  observar?: (v: VistoAlAtender) => void;
  /**
   * DE QUÉ LICENCIA SON los resultados de un trabajo: los derechos del modelo que lo atendió, que lo sabe la
   * composición (el runtime no conoce proveedores). Sin esto, el material nace sin derechos.
   */
  derechosDe?: (job: Job) => DerechosDelMaterial | undefined;
  /** Cómo se llama el material de un trabajo (las palabras de quien lo pidió), si la composición lo sabe. */
  nombreDe?: (job: Job) => string | undefined;
}

export interface VistoAlAtender {
  estado: DesenlaceDeAtencion['estado'];
  motivo?: string;
  providerId: string;
  /** Identificadores, nunca contenido, nunca enlaces. */
  operationId: string;
  providerStatus: string;
  jobId?: string;
  attemptId?: string;
  assetId?: string;
}

export type DesenlaceDeAtencion =
  /* El motor lo aceptó y el trabajo se movió. */
  | { estado: 'aplicado'; jobId: string; terminal: boolean; assetId?: string }
  /* Ya se había atendido este mismo aviso, o llegó tarde. No cuesta nada y no cambia nada. */
  | { estado: 'repetido'; jobId?: string }
  /*
   * Se entendió y no mueve el trabajo: un estado que no conocemos, un avance sin
   * novedad. NO ES UN FALLO y no autoriza a devolver nada.
   */
  | { estado: 'sin_efecto'; motivo: string; jobId?: string }
  /* No hay trabajo para esa operación, o hay más de uno. Hacia fuera, lo mismo. */
  | { estado: 'no_encontrada' }
  /*
   * Se sabe que terminó bien y NO se pudo guardar el resultado. El trabajo se
   * queda como estaba —esperando— a propósito: el enlace del proveedor puede
   * seguir valiendo, y cerrarlo ahora perdería el vídeo para siempre.
   */
  | { estado: 'aplazado'; motivo: string; jobId: string };

const REINTENTOS_DE_ESCRITURA = 3;

/**
 * ATENDER UN AVISO. Una vez, de principio a fin, sin bucles y sin esperas.
 *
 * Sirve igual para el aviso que MANDA el proveedor y para lo que contesta
 * cuando se le PREGUNTA: los dos llegan aquí ya traducidos a un
 * `AvisoNormalizado`, y por eso el callback y la reconciliación no pueden
 * decidir cosas distintas sobre el mismo hecho.
 */
export const atenderAviso = async (deps: AtencionDeps, aviso: AvisoNormalizado): Promise<DesenlaceDeAtencion> => {
  const ver = (v: DesenlaceDeAtencion, extra: Partial<VistoAlAtender> = {}): DesenlaceDeAtencion => {
    deps.observar?.({
      estado: v.estado,
      ...('motivo' in v && v.motivo ? { motivo: v.motivo } : {}),
      providerId: aviso.providerId,
      operationId: aviso.operationId,
      providerStatus: aviso.providerStatus,
      ...extra,
    });
    return v;
  };

  /* 1 · ¿DE QUIÉN ES? Lo contesta el almacén buscando la operación, no el mensaje. */
  const busqueda = await deps.trabajos.porReferenciaDeProveedor(aviso.providerId, aviso.operationId);
  /*
   * `ambigua` es un fallo nuestro que hay que ver —dos trabajos no pueden
   * declarar la misma operación—, pero hacia fuera se contesta lo mismo que
   * «no existe»: quien pregunta no se entera de nada por haber acertado.
   */
  if (!busqueda.ok) return ver({ estado: 'no_encontrada' }, { motivo: busqueda.motivo });

  const { job, intento } = busqueda;
  const at = deps.ahora();

  /*
   * 2a · ¿ESTO YA ESTÁ ATENDIDO? Una comprobación barata, ANTES de gastar.
   *
   * ModelArk reintenta tres veces, y una reconciliación puede coincidir con
   * ellas. Sin esto, cada llegada sobre un trabajo ya cerrado seguiría hasta
   * pedirle el resultado al materializador —que contestaría «ya estaba», pero
   * después de una consulta— para que el motor dijera `noop` al final.
   *
   * NO es una segunda decisión: quien decide sigue siendo el motor, y lo que se
   * mira aquí son dos cosas GUARDADAS, no una regla. Si esto se equivocara por
   * de menos, el motor lo para igual; por de más no puede, porque un trabajo
   * terminal y un evento ya visto son exactamente lo que él también descarta.
   */
  const identidad = identidadDeEvento({
    providerId: aviso.providerId,
    operationId: aviso.operationId,
    providerStatus: aviso.providerStatus,
    ...(aviso.updatedAt !== undefined ? { updatedAt: aviso.updatedAt } : {}),
  });
  if (esTrabajoTerminal(job.state) || (identidad && job.seenEvents.includes(identidad))) {
    return ver({ estado: 'repetido', jobId: job.jobId }, { jobId: job.jobId, attemptId: intento.attemptId });
  }

  /* 3 · ¿ESTÁ EN CASA? Solo un final bueno necesita esto, y lo necesita ANTES de cerrarse. */
  let outputRefs: readonly string[] | undefined;
  let assetId: string | undefined;
  if (aviso.desenlace === 'terminado') {
    const guardado = await traerACasa(deps, job, busqueda.intento, aviso, at);
    if (!guardado.ok) return ver({ estado: 'aplazado', motivo: guardado.motivo, jobId: job.jobId }, { jobId: job.jobId, attemptId: intento.attemptId });
    outputRefs = [guardado.assetId];
    assetId = guardado.assetId;
  }

  /* 2 · ¿QUÉ DICE? */
  const lectura = leerAviso({ aviso, job, intento, at, ...(outputRefs ? { outputRefs } : {}) });
  if (!lectura.ok) {
    if (lectura.motivo === 'ilegible') return ver({ estado: 'no_encontrada' }, { motivo: 'ilegible' });
    return ver({ estado: 'sin_efecto', motivo: lectura.motivo, jobId: job.jobId }, { jobId: job.jobId, attemptId: intento.attemptId });
  }

  /* 4 · APLICAR. El motor decide; aquí solo se escribe lo que él diga, y se reintenta si otro escribió antes. */
  let actual: Job = job;
  for (let intentoDeEscritura = 0; intentoDeEscritura < REINTENTOS_DE_ESCRITURA; intentoDeEscritura++) {
    const decision = deps.motor.recibirEvento(actual, lectura.evento, at);
    if (decision.status === 'noop') {
      /* El motor ya lo había visto, o llegó fuera de orden. Repetirse no cuesta nada: es el objetivo. */
      return ver({ estado: 'repetido', jobId: actual.jobId }, { jobId: actual.jobId, attemptId: intento.attemptId, ...(assetId ? { assetId } : {}) });
    }
    if (decision.status !== 'transition' || !decision.transition) {
      return ver({ estado: 'sin_efecto', motivo: decision.status, jobId: actual.jobId }, { jobId: actual.jobId, attemptId: intento.attemptId });
    }
    const escrito = await deps.almacen.aplicar(decision.transition);
    if (escrito.applied) {
      return ver(
        { estado: 'aplicado', jobId: actual.jobId, terminal: lectura.terminal, ...(assetId ? { assetId } : {}) },
        { jobId: actual.jobId, attemptId: intento.attemptId, ...(assetId ? { assetId } : {}) },
      );
    }
    /*
     * Otro escribió primero —el trabajador que terminaba, otra llegada del mismo
     * aviso—. Se vuelve a decidir sobre lo que hay ahora, y normalmente la
     * segunda vuelta contesta `noop` porque el evento ya consta visto. Esa es la
     * defensa contra dos entregas simultáneas, y es la del motor, no una de aquí.
     */
    actual = escrito.job;
  }
  return ver({ estado: 'sin_efecto', motivo: 'no_se_pudo_escribir', jobId: actual.jobId }, { jobId: actual.jobId, attemptId: intento.attemptId });
};

/** El paso 3, aparte para que se lea: traerse el resultado antes de cerrar nada. */
const traerACasa = async (
  deps: AtencionDeps,
  job: Job,
  intento: { attemptId: string },
  aviso: AvisoNormalizado,
  at: number,
): Promise<{ ok: true; assetId: string } | { ok: false; motivo: string }> => {
  if (!aviso.recurso) return { ok: false, motivo: 'sin_resultado' };
  const assetId = identidadDelMaterial(job.jobId, intento.attemptId);
  if (!assetId) return { ok: false, motivo: 'sin_identidad' };
  const kind = tipoDeMaterialDe(job.capability);
  if (!kind) return { ok: false, motivo: 'tipo_desconocido' };
  const derechos = deps.derechosDe?.(job);
  const nombre = deps.nombreDe?.(job);

  const guardado = await deps.materializar.guardar({
    assetId,
    /* DE QUIÉN ES: del trabajo guardado. El aviso no tiene voz en esto. */
    userId: job.owner.userId,
    kind,
    recurso: aviso.recurso,
    provenance: procedenciaDe(job, aviso, at),
    metadata: Object.freeze({ providerStatus: aviso.providerStatus, providerOperationId: aviso.operationId }),
    /* De quién es la licencia: del modelo del TRABAJO guardado, nunca de lo que diga el aviso. */
    ...(derechos ? { derechos } : {}),
    ...(aviso.variantes?.length ? { variantes: aviso.variantes } : {}),
    ...(nombre ? { nombre } : {}),
  });
  return guardado.ok ? { ok: true, assetId: guardado.assetId } : { ok: false, motivo: guardado.motivo };
};
