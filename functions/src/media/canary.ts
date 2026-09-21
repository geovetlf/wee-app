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
import { confirmarSubida, depsDeSubidaDeWee, identidadDeMaterialDeSubida, solicitarSubida } from './subida';
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

/* ── Subir y confirmar: las dos mitades de MC-3, sin reescribir ninguna ────── */

/**
 * LO QUE EL CANARY ACEPTA SUBIR. Más estrecho que MC-3, y a propósito.
 *
 * MC-3 admite hasta el tope de la Fase 11; un canary no necesita nada de eso.
 * Una imagen pequeña y de un tipo que el procesador sepa abrir es todo lo que
 * hace falta para demostrar la cadena, y cuanto menos quepa por esta puerta,
 * menos hay que vigilar.
 */
export const MAX_BYTES_DEL_CANARY = 2 * 1024 * 1024;
export const TIPOS_DEL_CANARY: readonly string[] = Object.freeze(['image/png', 'image/jpeg', 'image/webp']);

/** Las tres cosas que sabe hacer esta puerta. No hay una cuarta. */
export type AccionDelCanary = 'subir' | 'confirmar' | 'procesar';
export const ACCIONES_DEL_CANARY: readonly AccionDelCanary[] = Object.freeze(['subir', 'confirmar', 'procesar'] as const);

/**
 * PEDIR PERMISO PARA SUBIR. Llama a `solicitarSubida` de MC-3 tal cual.
 *
 * Aquí no hay un segundo flujo de subida: se compone `depsDeSubidaDeWee` —que
 * ya ata la puerta de cuentas y las tres operaciones de la Fase 11— y se le
 * pasa una petición cuyos únicos datos variables son la clave de operación, el
 * tipo y el tamaño. El material, la clave del objeto, el contenedor y el
 * proveedor los sigue derivando MC-3 en el servidor.
 */
export const pedirSubidaDelCanary = async (
  accountId: string,
  operationId: string,
  contentType: string,
  bytes: number,
): Promise<unknown> => {
  if (!TIPOS_DEL_CANARY.includes(contentType)) throw new HttpsError('invalid-argument', 'Tipo no admitido por el canary');
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_BYTES_DEL_CANARY) {
    throw new HttpsError('invalid-argument', 'El canary solo admite una imagen pequeña');
  }
  const r = await solicitarSubida(depsDeSubidaDeWee(getFirestore()), {
    principalId: accountId,
    operationId,
    kind: 'image',
    contentType,
    bytes,
  });
  if (!r.ok) throw new HttpsError('failed-precondition', `No se concedió la subida: ${r.motivo}`);
  /* El intento entero: lleva la URL y las cabeceras OBLIGATORIAS, y ninguna credencial. */
  return { intento: r.intento, traza: r.traza };
};

/** CERRAR LA SUBIDA. `confirmarSubida` de MC-3, que va a MIRAR el objeto en vez de creerse nada. */
export const confirmarSubidaDelCanary = async (
  accountId: string,
  assetId: string,
  operationId: string,
): Promise<unknown> => {
  const r = await confirmarSubida(depsDeSubidaDeWee(getFirestore()), { principalId: accountId, assetId, operationId });
  if (!r.ok) throw new HttpsError('failed-precondition', `La subida no está confirmada: ${r.motivo}`);
  return { assetId: r.assetId, bytes: r.bytes, objectRef: r.objectRef, traza: r.traza };
};

/* ── La puerta ─────────────────────────────────────────────────────────────── */

/**
 * LA PUERTA. Solo administración, y solo sobre material propio.
 *
 * Lleva `MEDIA_SECRETS` y **nada más**: ni una clave de modelo. Si el secreto de
 * R2 no existiera todavía en Secret Manager, lo único que no se desplegaría es
 * esta función — que es exactamente el aislamiento que se buscaba.
 *
 * ── Lo único que quien llama elige ──────────────────────────────────────────
 *
 * Una **clave de operación**, y para subir, el tipo y el tamaño. **El material
 * NO se nombra**: se DERIVA de (cuenta, clave de operación) con la misma
 * función de MC-3, así que ni siquiera se puede apuntar a un material propio
 * que no haya creado este canary — y mucho menos a uno ajeno. La cuenta sale de
 * la sesión, y el contenedor, la clave, el proveedor y el destino los siguen
 * derivando MC-3 y MC-4.
 *
 * La respuesta es un resumen de referencias y recuentos, más —solo al subir— el
 * permiso temporal que hay que usar para mandar los bytes. Ni una credencial.
 */
export const mediaCanary = onCall(
  { region: 'us-central1', timeoutSeconds: 120, memory: '1GiB', secrets: MEDIA_SECRETS },
  async (request) => {
    assertAdmin(request.auth);
    const datos = (request.data || {}) as Record<string, unknown>;

    const accion = String(datos.accion ?? 'procesar') as AccionDelCanary;
    if (!ACCIONES_DEL_CANARY.includes(accion)) throw new HttpsError('invalid-argument', 'Acción desconocida');

    const operationId = String(datos.operationId ?? '');
    if (operationId.length < 8 || operationId.length > 128) {
      throw new HttpsError('invalid-argument', 'Falta una clave de operación utilizable');
    }

    /* LA CUENTA SALE DE LA SESIÓN. Quien llama no elige de quién es nada. */
    const accountId = request.auth!.uid;
    /* Y EL MATERIAL SE DERIVA. No llega ningún identificador de fuera. */
    const assetId = identidadDeMaterialDeSubida(accountId, operationId);
    if (!assetId) throw new HttpsError('invalid-argument', 'La clave de operación no produce material');

    if (accion === 'subir') {
      return pedirSubidaDelCanary(accountId, operationId, String(datos.contentType ?? ''), Number(datos.bytes));
    }
    if (accion === 'confirmar') return confirmarSubidaDelCanary(accountId, assetId, operationId);
    return ejecutarCanaryDeMedios(accountId, assetId);
  },
);
