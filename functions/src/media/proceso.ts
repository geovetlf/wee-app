import type { Firestore } from 'firebase-admin/firestore';
import {
  Asset,
  AttemptReport,
  CapacidadDeProceso,
  DetalleDeProceso,
  JobDispatch,
  JobExecutor,
  JobRequest,
  JOB_ENGINE_CONTRACT_VERSION,
  LIMITES_DE_TRANSFORMACION,
  MediaObject,
  MotivoDeProceso,
  PIEZA_ORIGINAL,
  PuertoDeAlmacenamiento,
  PuertoDeProceso,
  StorageRef,
  claveDelObjeto,
  decidirProceso,
  errorDelCore,
  esTareaGeneral,
  leerPaqueteDeProceso,
  referenciaDelObjeto,
  varianteDeResultado,
} from '../core';
import { AssetDoc, anotarVariante, leerMaterial } from '../content';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import { AlmacenDeObjetosDeMedios, almacenDeObjetosDeMedios } from './almacen';
import { adaptadoresDeMedios } from './catalogo';
import { huellaDeMedios } from './huella';

/**
 * WEE MEDIA PROCESSING — DE UN MATERIAL SALE OTRO.
 *
 * ── Los dos planos, otra vez ────────────────────────────────────────────────
 *
 *     PEDIR    plano de control: autoriza, deriva y crea trabajos. Sin bytes.
 *     EJECUTAR plano de datos: dentro de un trabajador, con los bytes.
 *
 * Están en el mismo archivo porque son las dos mitades de una idea, pero no
 * corren en el mismo sitio y eso es lo importante: `solicitarProceso` no abre
 * un solo archivo —un vídeo de dos gigas no entra en una Function de control—,
 * y `crearEjecutorDeMedios` no decide nada —ya venía decidido en el paquete—.
 *
 * ── Y NO hay un segundo motor de trabajos ───────────────────────────────────
 *
 * El Job Engine de la Fase 8 admite tareas generales desde la Fase 11, y su
 * propio código explica por qué: «no hay un segundo motor, hay un segundo tipo
 * de paquete». El trabajador (`job/worker.ts`) tiene un solo puerto que toca el
 * mundo, `JobExecutor`, y F12-D ya puso ahí su implementación para operaciones
 * de IA. Esto es la otra: la de medios. Mismos estados, mismas concesiones,
 * mismos plazos, mismos reintentos, misma idempotencia.
 *
 *     Media Processing Request  →  JobRequest (tarea `media.*`)
 *     Job Engine                →  Job → Attempt → cola → trabajador
 *     trabajador                →  este ejecutor
 *     este ejecutor             →  traer · procesar · guardar · verificar
 *     resultado                 →  MediaObject (MC-1) + AssetVariant (F11)
 */

/* ── 1 · Pedir: el plano de control ────────────────────────────────────────── */

export interface DepsDeProceso {
  db: Firestore;
  /** La única puerta de Weë para «de qué cuenta puede actuar este principal». */
  cuentaDelPrincipal: (principalId: string, cuentaSolicitada?: string) => Promise<{ accountId: string } | null>;
  /** El material, de la Fase 11. */
  leerMaterial: (assetId: string) => Promise<AssetDoc | Asset | null | undefined>;
  /** Anotar la variante en el material. También de la Fase 11. */
  anotarVariante: typeof anotarVariante;
  objetos?: AlmacenDeObjetosDeMedios;
  adaptadores?: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  /** Quién transforma. Sin él no se puede saber qué capacidades hay. */
  procesador: PuertoDeProceso;
  ahora?: () => number;
}

export const depsDeProcesoDeWee = (db: Firestore, procesador: PuertoDeProceso): DepsDeProceso => ({
  db,
  cuentaDelPrincipal: (principalId, cuentaSolicitada) => cuentaDelPrincipalEnWee(db, principalId, cuentaSolicitada),
  leerMaterial: (assetId) => leerMaterial(assetId),
  anotarVariante,
  procesador,
});

export interface PeticionDeProcesoDeMedios {
  /** Quién pide. Del contexto autenticado, nunca del cuerpo de la petición. */
  principalId: string;
  cuentaSolicitada?: string;
  /** De qué material. LO ÚNICO que el cliente elige, además de qué quiere. */
  assetId: string;
  /** Qué derivados. Acotados y validados por el Core antes de tocar nada. */
  transformaciones: unknown;
  /** Su clave de idempotencia, para que un reintento de red no cree trabajos de más. */
  operationId: string;
}

export interface TrazaDeProceso {
  operationId?: string;
  accountId?: string;
  assetId?: string;
  providerId?: string;
  processorId?: string;
  resultado: 'solicitado' | 'procesado' | MotivoDeProceso;
  detalle: DetalleDeProceso | 'principal_invalido' | 'sin_cuenta' | 'sin_adaptador' | 'sin_destino' | 'ok';
  /** Cuántos derivados se pidieron. Nunca el contenido de ninguno. */
  derivados?: number;
  variantIds?: readonly string[];
  ms: number;
}

export type DesenlaceDeSolicitudDeProceso =
  | { ok: true; solicitudes: readonly JobRequest[]; traza: TrazaDeProceso }
  | { ok: false; motivo: MotivoDeProceso; traza: TrazaDeProceso };

/**
 * PEDIR DERIVADOS DE UN MATERIAL.
 *
 * Dos lecturas acotadas —el material por su identificador, la ficha por una
 * identidad derivada— y ninguna consulta. No abre ningún archivo, no llama a
 * ningún procesador y no escribe nada: **devuelve peticiones de trabajo**, que
 * es lo único que Media Cloud aporta al Job Engine. Quién las ejecuta, cuándo y
 * cuántas veces es del motor.
 *
 * ── Por qué repetir esto no duplica derivados ───────────────────────────────
 *
 *   la identidad del derivado  se DERIVA de (origen, transformación canónica)
 *   la clave de su objeto      se DERIVA de (cuenta, material, pieza)
 *   el `jobId`                 se DERIVA de la identidad del derivado
 *   los bytes                  se escriben con «solo si está libre»
 *
 * Así que pedir dos veces la misma miniatura pide el MISMO trabajo, hacia el
 * MISMO sitio, y el segundo no crea nada: lo dice el Job Engine con su propia
 * idempotencia, sin que MC-4 tenga que inventar ninguna.
 */
export const solicitarProceso = async (
  deps: DepsDeProceso,
  peticion: PeticionDeProcesoDeMedios,
): Promise<DesenlaceDeSolicitudDeProceso> => {
  const ahora = deps.ahora ?? (() => Date.now());
  const empezo = ahora();
  const fin = (t: Omit<TrazaDeProceso, 'ms' | 'operationId'>): TrazaDeProceso =>
    ({ operationId: peticion.operationId, ...t, ms: ahora() - empezo });
  const no = (motivo: MotivoDeProceso, t: Omit<TrazaDeProceso, 'ms' | 'operationId' | 'resultado'>): DesenlaceDeSolicitudDeProceso =>
    ({ ok: false, motivo, traza: fin({ ...t, resultado: motivo }) });

  if (typeof peticion.principalId !== 'string' || !peticion.principalId) {
    return no('no_disponible', { detalle: 'principal_invalido' });
  }
  const cuenta = await deps.cuentaDelPrincipal(peticion.principalId, peticion.cuentaSolicitada);
  if (!cuenta) return no('no_disponible', { detalle: 'sin_cuenta' });
  const accountId = cuenta.accountId;

  const material = (await deps.leerMaterial(peticion.assetId)) ?? undefined;
  const objectRef = material?.storageRef ? referenciaDelObjeto(huellaDeMedios, material.storageRef) : undefined;
  const objetos = deps.objetos ?? almacenDeObjetosDeMedios(deps.db);
  const objeto: MediaObject | undefined = objectRef ? await objetos.leer(objectRef, accountId) : undefined;

  const decision = decidirProceso({
    accountId,
    material,
    objeto,
    transformaciones: peticion.transformaciones,
    capacidadesDelProcesador: deps.procesador.capacidades,
    huella: huellaDeMedios,
  });
  if (!decision.permitida) {
    return no(decision.motivo, { accountId, assetId: peticion.assetId, processorId: deps.procesador.processorId, detalle: decision.detalle });
  }

  /* El destino de cada derivado: derivado en el servidor, dentro de la carpeta de su cuenta. */
  const origen = material!.storageRef as StorageRef;
  const at = ahora();
  const solicitudes: JobRequest[] = [];
  for (const d of decision.derivados) {
    const objectKey = claveDelObjeto(accountId, material!.assetId, d.pieza);
    if (!objectKey) return no('no_disponible', { accountId, assetId: peticion.assetId, detalle: 'sin_destino' });
    const destino: StorageRef = { provider: origen.provider, ...(origen.bucket ? { bucket: origen.bucket } : {}), objectKey };

    solicitudes.push({
      contract: JOB_ENGINE_CONTRACT_VERSION,
      principal: { userId: accountId },
      at,
      /* TAREA GENERAL, no operación de IA: ni capacidad ni implementación. */
      task: { name: d.tarea },
      input: {
        accountId,
        sourceAssetId: material!.assetId,
        variantId: d.variantId,
        origen,
        destino,
        transformacion: d.transformacion,
      },
      trace: { traceId: `media-${peticion.operationId}`, requestId: d.variantId, userId: accountId },
      /* La identidad del derivado ES la clave de deduplicación: repetir pide el mismo trabajo. */
      idempotencyKey: d.variantId,
    });
  }

  return {
    ok: true,
    solicitudes: Object.freeze(solicitudes),
    traza: fin({
      accountId, assetId: material!.assetId, providerId: origen.provider,
      processorId: deps.procesador.processorId, resultado: 'solicitado', detalle: 'ok',
      derivados: solicitudes.length, variantIds: decision.derivados.map((d) => d.variantId),
    }),
  };
};

/* ── 2 · Ejecutar: el plano de datos, dentro del trabajador ────────────────── */

/**
 * EL EJECUTOR DE MEDIOS. La otra implementación del único puerto del trabajador.
 *
 * Recibe un paquete ya decidido y hace cuatro cosas en orden, y el orden
 * importa: traer, procesar, guardar, verificar. Si algo falla antes de guardar,
 * no hay nada que limpiar; si falla después, el objeto está y el reintento lo
 * encuentra en vez de escribir otro.
 *
 * **No decide nada.** No elige transformación, ni destino, ni proveedor: eso ya
 * venía resuelto y autorizado cuando se creó el trabajo. Un ejecutor que
 * volviera a decidir sería una segunda autorización, y las segundas
 * autorizaciones son las que se olvidan de comprobar algo.
 */
export interface DepsDelEjecutorDeMedios {
  almacenes: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  procesador: PuertoDeProceso;
  objetos: AlmacenDeObjetosDeMedios;
  anotarVariante: typeof anotarVariante;
  ahora?: () => number;
}

export const crearEjecutorDeMedios = (deps: DepsDelEjecutorDeMedios): JobExecutor => {
  const ahora = deps.ahora ?? (() => Date.now());

  const noSalio = (dispatch: JobDispatch, reason: string): AttemptReport => ({
    attemptId: dispatch.attemptId,
    outcome: 'failed',
    /* NO SALIÓ: nada tocó al proveedor, así que el motor puede reintentar sin miedo. */
    dispatched: false,
    error: errorDelCore('INVALID_REQUEST', 'media', { details: { reason } }),
  });

  return {
    async ejecutar(dispatch: JobDispatch): Promise<AttemptReport> {
      if (!esTareaGeneral(dispatch) || !dispatch.task?.name.startsWith('media.')) {
        return noSalio(dispatch, 'no_es_tarea_de_medios');
      }
      const paquete = leerPaqueteDeProceso(dispatch.input);
      if (!paquete) return noSalio(dispatch, 'paquete_ilegible');

      /*
       * DOS ALMACENES, NO UNO. De dónde se lee y dónde se escribe se resuelven
       * por separado porque pueden ser proveedores distintos:
       *
       *     R2 → procesador → R2        (hoy)
       *     R2 → procesador → Qiniu     (el contrato no lo impide)
       *
       * Buscarlos con una sola variable habría metido «el origen y el destino
       * viven en el mismo sitio» en el código, que es justo lo que la regla de
       * agnosticismo prohíbe dar por supuesto.
       */
      const almacenDeOrigen = deps.almacenes[paquete.origen.provider];
      const almacenDeDestino = deps.almacenes[paquete.destino.provider];
      if (!almacenDeOrigen?.traer || !almacenDeDestino) return noSalio(dispatch, 'sin_adaptador');

      /* 1 · Los bytes del origen. Aquí SÍ viajan, y por eso esto corre en un trabajador. */
      const origen = await almacenDeOrigen.traer(paquete.origen);
      if (!origen.ok) {
        return { attemptId: dispatch.attemptId, outcome: 'failed', dispatched: true, error: errorDelCore('PROVIDER_ERROR', 'media', { details: { reason: 'origen_no_disponible' } }) };
      }
      const cuerpo = origen.cuerpo;
      if (!cuerpo?.length || cuerpo.length > LIMITES_DE_TRANSFORMACION.maxBytesDeOrigen) {
        return noSalio(dispatch, 'origen_fuera_de_limites');
      }

      /* 2 · La transformación. El procesador no sabe de quién es nada de esto. */
      const hecho = await deps.procesador.procesar({
        cuerpo,
        contentType: origen.objeto.contentType ?? 'application/octet-stream',
        transformacion: paquete.transformacion,
      });
      if (!hecho.ok) {
        return { attemptId: dispatch.attemptId, outcome: 'failed', dispatched: true, error: hecho.error };
      }

      /* 3 · Los bytes nuevos, y SOLO si la clave está libre: repetir no pisa. */
      const guardado = await almacenDeDestino.guardar({
        destino: paquete.destino,
        cuerpo: hecho.resultado.cuerpo,
        contentType: hecho.resultado.contentType,
        siNoExiste: true,
        metadatos: { assetid: paquete.sourceAssetId, variantid: paquete.variantId },
      });
      if (!guardado.ok) {
        return { attemptId: dispatch.attemptId, outcome: 'failed', dispatched: true, error: guardado.error };
      }

      /*
       * 4 · VERIFICAR. No basta con que el almacén haya dicho que sí: se mira lo
       * que hay. Una sola llamada, con el mismo `mirar` que ya usa la
       * confirmación de MC-3 — no hay un segundo sistema de verificación.
       */
      const visto = await almacenDeDestino.mirar(paquete.destino);
      if (!visto.ok || !visto.objeto.bytes) {
        return { attemptId: dispatch.attemptId, outcome: 'failed', dispatched: true, error: errorDelCore('PROVIDER_ERROR', 'media', { details: { reason: 'derivado_no_verificable' } }) };
      }

      /* 5 · La ficha del objeto físico: el `create` idempotente de MC-1. */
      const at = ahora();
      const objectRef = referenciaDelObjeto(huellaDeMedios, paquete.destino);
      if (!objectRef) return noSalio(dispatch, 'destino_sin_identidad');
      const alta = await deps.objetos.registrar({
        objectRef,
        providerId: paquete.destino.provider,
        accountId: paquete.accountId,
        assetId: paquete.sourceAssetId,
        pieza: paquete.destino.objectKey.split('/').pop() ?? PIEZA_ORIGINAL,
        ...(paquete.destino.bucket ? { bucket: paquete.destino.bucket } : {}),
        objectKey: paquete.destino.objectKey,
        ...(visto.objeto.etiquetaDelProveedor ? { etiquetaDelProveedor: visto.objeto.etiquetaDelProveedor } : {}),
        estado: 'guardado',
        bytes: visto.objeto.bytes,
        contentType: visto.objeto.contentType ?? hecho.resultado.contentType,
        createdAt: at,
        updatedAt: at,
      });
      if (!alta.ok) {
        return { attemptId: dispatch.attemptId, outcome: 'failed', dispatched: true, error: errorDelCore('INTERNAL_ERROR', 'media', { details: { reason: alta.motivo } }) };
      }

      /* 6 · Y la relación origen → derivado, en el material de la Fase 11. */
      const variante = varianteDeResultado(paquete.transformacion, paquete.destino, {
        contentType: alta.objeto.contentType,
        bytes: alta.objeto.bytes,
        ancho: hecho.resultado.ancho,
        alto: hecho.resultado.alto,
      });
      if (!variante) return noSalio(dispatch, 'variante_invalida');
      const anotada = await deps.anotarVariante(paquete.accountId, paquete.sourceAssetId, variante);
      if (!anotada) {
        return { attemptId: dispatch.attemptId, outcome: 'failed', dispatched: true, error: errorDelCore('INTERNAL_ERROR', 'media', { details: { reason: 'no_se_pudo_anotar' } }) };
      }

      return {
        attemptId: dispatch.attemptId,
        outcome: 'succeeded',
        dispatched: true,
        /*
         * El resultado, en el contrato que el Job Engine ya tiene:
         * `outputRefs` son REFERENCIAS —la identidad del objeto y la de la
         * variante— y nunca una URL. Una URL firmada guardada en un trabajo
         * sería una credencial persistida, que es justo lo que MC-2 prohibió.
         */
        result: {
          outputRefs: [objectRef, paquete.variantId],
          metadata: { variantId: paquete.variantId, bytes: alta.objeto.bytes ?? 0, contentType: alta.objeto.contentType ?? '' },
        },
      };
    },
  };
};

/** Las capacidades de proceso que Weë tiene hoy. Lo que no esté aquí, no se pide. */
export const capacidadesDeProcesoDeWee = (procesador: PuertoDeProceso): readonly CapacidadDeProceso[] =>
  procesador.capacidades;

/** Los almacenes vivos, para quien ejecute. El de mentira no está: es de las pruebas. */
export const almacenesParaProcesar = (): Readonly<Record<string, PuertoDeAlmacenamiento>> => adaptadoresDeMedios();
