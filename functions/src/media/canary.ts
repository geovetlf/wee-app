import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { Transformacion, mensajeDeCola } from '../core';
import { crearMotorDeTrabajosDeWee, crearTrabajo } from '../job';
import { atenderEntrega } from '../job/worker';
import { almacenDeTrabajos } from '../runtime/almacen';
import { colaDeInvocacion } from '../runtime/cola';
import { MEDIA_SECRETS } from '../secrets';
import { assertAdmin } from '../shared/admin';
import { almacenDeObjetosDeMedios } from './almacen';
import { adaptadoresDeMedios } from './catalogo';
import { crearEjecutorDeMedios, depsDeProcesoDeWee, solicitarProceso } from './proceso';
import { crearProcesadorDeImagen } from './procesador';

/**
 * WEE MEDIA CLOUD — EL PUENTE DEL CANARY. Composición, y nada más.
 *
 * ── Qué es esto, y sobre todo qué NO es ─────────────────────────────────────
 *
 * Es el único archivo de Media Cloud que una Function puede importar, y lo
 * único que hace es **atar piezas que ya existen**. No hay aquí un trabajador,
 * ni un motor de trabajos, ni una cola, ni lógica de ejecución: todo eso está
 * construido desde hace fases y se usa tal cual.
 *
 *     motor        `crearMotorDeTrabajosDeWee`   (Fase 8)
 *     almacén      `almacenDeTrabajos`           (Fase 12-D)
 *     cola         `colaDeInvocacion`            (Fase 12-D)
 *     trabajador   `atenderEntrega`              (Fase 12-A)
 *     ejecutor     `crearEjecutorDeMedios`       (MC-4)
 *     almacenes    `adaptadoresDeMedios`         (MC-1)
 *     procesador   `crearProcesadorDeImagen`     (MC-4)
 *
 * NO es una API de Media Cloud. No sube nada, no entrega nada, no acepta una
 * transformación de fuera y no está pensada para que la llame una persona: es
 * una puerta de administración para ejecutar UNA prueba controlada.
 *
 * ── La cola no es durable, y para esto basta ────────────────────────────────
 *
 * `colaDeInvocacion` vive dentro de la invocación y muere con ella. Para el
 * primer canary —una imagen pequeña, una miniatura, unos milisegundos de
 * trabajo— es exactamente el caso para el que se escribió: el trabajo empieza y
 * termina antes de responder.
 *
 * **Durable queue is not required for this first image-processing canary;
 * required before long-running media workloads.** El día que haya que procesar
 * un vídeo de veinte minutos, hace falta un transporte de verdad detrás de
 * `QueuePort` — y ni el motor, ni el trabajador, ni el almacén, ni este archivo
 * se enterarán del cambio.
 */

/**
 * LA TRANSFORMACIÓN DEL CANARY, FIJA EN EL CÓDIGO.
 *
 * Quien llama NO la elige, y esa es la mitad de la seguridad de esta puerta:
 * una miniatura pequeña en WebP, barata de hacer y trivial de comprobar. Si
 * algún día hay que probar otra, se cambia aquí y se vuelve a desplegar, que es
 * exactamente el nivel de fricción que debe tener.
 */
export const TRANSFORMACION_DEL_CANARY: Transformacion = Object.freeze({
  tipo: 'thumbnail',
  ancho: 400,
  alto: 400,
  ajuste: 'cover',
  formato: 'webp',
  calidad: 80,
});

/** Cuánto se le deja a un intento dentro de esta invocación. */
const VISIBILIDAD_MS = 60_000;
const MAX_VUELTAS = 8;

export interface ResumenDelCanary {
  assetId: string;
  /** Cuántos trabajos se crearon, y cuántos ya existían. */
  trabajos: number;
  creados: number;
  /** Lo que devolvió el trabajador por cada entrega atendida. */
  desenlaces: readonly string[];
  variantIds: readonly string[];
  ms: number;
}

/**
 * EJECUTAR EL CANARY SOBRE UN MATERIAL. Todo derivado del servidor.
 *
 * Quien llama manda **un solo dato**: cuál de SUS materiales. La cuenta sale de
 * la sesión, la transformación está escrita aquí, y el destino, el proveedor y
 * la identidad del derivado los deriva MC-4 como siempre. No hay ningún campo
 * de la petición que pueda cambiar dónde se escribe ni de quién es lo que salga.
 */
export const ejecutarCanaryDeMedios = async (
  accountId: string,
  assetId: string,
  ahora: () => number = () => Date.now(),
): Promise<ResumenDelCanary> => {
  const empezo = ahora();
  const db = getFirestore();

  /* Las piezas. Ninguna se construye aquí: todas se piden a quien ya las tiene. */
  const procesador = crearProcesadorDeImagen();
  const objetos = almacenDeObjetosDeMedios(db);
  const almacenes = adaptadoresDeMedios();
  const trabajos = almacenDeTrabajos(db);
  /* El motor de Weë viene envuelto con su política; lo que el trabajador pide es el motor. */
  const { motor } = crearMotorDeTrabajosDeWee();
  const cola = colaDeInvocacion(ahora);
  const ejecutor = crearEjecutorDeMedios({
    almacenes,
    procesador,
    objetos,
    anotarVariante: depsDeProcesoDeWee(db, procesador).anotarVariante,
    ahora,
  });

  /* 1 · Pedir el derivado. Esto NO mueve bytes: devuelve peticiones de trabajo. */
  const pedido = await solicitarProceso(
    { ...depsDeProcesoDeWee(db, procesador), objetos, ahora },
    {
      principalId: accountId,
      assetId,
      transformaciones: [TRANSFORMACION_DEL_CANARY],
      operationId: `canary-${assetId}`,
    },
  );
  if (!pedido.ok) throw new HttpsError('failed-precondition', `No se pudo preparar el derivado: ${pedido.motivo}`);

  /* 2 · Crear los trabajos en el motor que ya existe, y encolarlos. */
  let creados = 0;
  for (const solicitud of pedido.solicitudes) {
    const alta = await crearTrabajo(trabajos, motor, solicitud);
    if (!alta.ok) throw new HttpsError('internal', 'El motor no admitió el trabajo');
    if (alta.created) creados++;
    await cola.enqueue(mensajeDeCola(alta.job, ahora(), alta.created ? 'created' : 'requeued'));
  }

  /*
   * 3 · Atender lo encolado con el TRABAJADOR EXISTENTE. Aquí no se reimplementa
   * nada de lo que hace `atenderEntrega`: ni concesiones, ni reintentos, ni
   * transiciones, ni recuperación. Se le pasan sus dependencias y se le llama.
   */
  const deps = {
    store: trabajos,
    queue: cola,
    engine: motor,
    executor: ejecutor,
    config: { worker: `canary-medios`, visibilityMs: VISIBILIDAD_MS, backpressureDelayMs: 0 },
    now: ahora,
  };
  const desenlaces: string[] = [];
  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const entrega = await cola.claim({ worker: deps.config.worker, at: ahora(), visibilityMs: VISIBILIDAD_MS });
    if (!entrega) break;
    const r = await atenderEntrega(deps, entrega);
    desenlaces.push(r.outcome);
  }

  return {
    assetId,
    trabajos: pedido.solicitudes.length,
    creados,
    desenlaces: Object.freeze(desenlaces),
    variantIds: pedido.traza.variantIds ?? [],
    ms: ahora() - empezo,
  };
};

/**
 * LA PUERTA. Solo administración, y solo sobre material propio.
 *
 * Lleva `MEDIA_SECRETS` y **nada más**: ni una clave de modelo. Si el secreto de
 * R2 no existiera todavía en Secret Manager, lo único que no se desplegaría es
 * esta función — que es exactamente el aislamiento que se buscaba.
 *
 * La respuesta es un resumen de referencias y recuentos: ni una URL, ni una
 * firma, ni una credencial, ni nada del contenido de nadie.
 */
export const mediaCanary = onCall(
  { region: 'us-central1', timeoutSeconds: 120, memory: '1GiB', secrets: MEDIA_SECRETS },
  async (request) => {
    assertAdmin(request.auth);
    const assetId = String((request.data || {}).assetId || '');
    if (!assetId) throw new HttpsError('invalid-argument', 'Falta el material');
    /* LA CUENTA SALE DE LA SESIÓN. Quien llama no elige de quién es nada. */
    return ejecutarCanaryDeMedios(request.auth!.uid, assetId);
  },
);
