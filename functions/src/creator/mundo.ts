import { createHash } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall } from 'firebase-functions/v2/https';
import { EngineError, motivoDeNoDisponible, noDisponible, toEngineHttpsError } from '../engine/errors';
import { engine } from '../engine';
import { dayKey, limiter } from '../engine/limits';
import { loadConfig } from '../engine/config';
import { sanitizeForLog } from '../engine/sanitize';
import { jurisdiccionesDeLaCuenta } from '../engine/jurisdiccion';
import { firestoreLedger } from '../engine/ledger';
import { creditEngine } from '../credits/creditEngine';
import { assertRequestId } from '../credits/creditValidation';
import { loadCostOverrides, serviceForCapability } from '../credits/creditCosts';
import { usageTransactionId } from '../credits/creditTransactions';
import { leerMaterial } from '../content';
import { ensureAccount } from './credits';
import { sinReservaHuerfana } from './video';
import {
  CapabilityId,
  EntradaDeMundo3D,
  MUNDO3D_CONTRACT_VERSION,
  POLITICA_DE_TRABAJO,
  PeticionDeMundo3D,
  TrabajoDeMundo3D,
  VARIANTE_DE_LA_VISTA_PREVIA,
  derechosVisibles,
  entradaDeMundo3D,
  TIPO_DE_MATERIAL_DEL_MUNDO,
  estadoDeMundoDelTrabajo,
  leerPeticionDeMundo3D,
  materialEsDeLaCuenta,
  operacionAbandonada,
  rutaEnElStorageDeWee,
  sePuedeCancelarElMundo,
} from '../core';
import {
  CLAVE_DE_LA_OPERACION_DEL_CUPO,
  CLAVE_DEL_DIA_DEL_CUPO,
  PLAZOS_DE_MUNDO,
  conductorDeWee,
  configuracionDeLaPuerta,
  decidirRuntime,
  paradaDeWee,
  pedirMedio,
  pedirParada,
  politicaDe,
  trabajoDelMedioDeWee,
} from '../runtime';

/**
 * generateWorld — LA PUERTA DE «CREAR MUNDO 3D» (Weë Studio → 3D World). La TERCERA del conductor.
 *
 *   app → generateWorld({ op, requestId, peticion })
 *     cotizar   ¿se puede, y cuánto cuesta? Ni cupo, ni Credits, ni proveedor.
 *     crear     Auth → contrato de Weë → puerta (habilitada → capacidad → SU LISTA DE CUENTAS) → jurisdicción del Perfil
 *               Real → elegibilidad (Router) → ¿cabe en el cupo? → Credit Engine (reserva) → el hueco del cupo →
 *               conductor → Gateway → adaptador → el proveedor ACEPTA y suelta.
 *               Contesta en segundos con el trabajo: un mundo tarda minutos y NO depende de una llamada abierta.
 *     estado    cómo va (en cola, generando, cancelando, completado, fallido, cancelado) y, al final, el mundo.
 *     cancelar  pedir parar: el Job Engine lo registra y, si el proveedor sabe parar, se le pide.
 *
 *   después, sin nadie esperando: el barrido programado le PREGUNTA al proveedor (reconciliación), trae el mundo a
 *   casa con sus derechos y su vista previa (materialización) y cierra el dinero UNA vez (liquidación).
 *
 * ── Lo que esta puerta NO es ────────────────────────────────────────────────
 *
 * Ni otro gateway, ni otro router, ni otro motor de trabajos, ni otro sistema de Credits: es el conductor de siempre
 * con UNA capacidad más, por la misma puerta de configuración (`aiSettings/runtime`, CERRADA por defecto, que se abre
 * por capacidad y por cuenta). No hay camino síncrono de mundos: con la puerta cerrada, un mundo «no está disponible». Y no conoce
 * proveedores: qué modelo lo hace —y si es elegible en la jurisdicción de la operación— lo decide el Router; ni
 * siquiera monta la clave de ningún proveedor (activar uno es montarla aquí, una decisión del dueño).
 *
 * La autorización para esta tercera capacidad del conductor es la FASE 5 de la misión del dueño «cerrar los gaps de
 * world.generate» (2026-10-05): un trabajo largo que no dependa de una petición HTTP abierta, sobre el Job Engine que
 * ya existe. Las otras dos puertas no cambian.
 */

/**
 * ── EL CANDADO DEL CANARY DEL MUNDO ─────────────────────────────────────────
 *
 * UNA capacidad, escrita en el CÓDIGO, como en `creator/brain.ts` y `creator/video.ts`. La configuración de
 * `aiSettings/runtime` puede cerrar este canary —y lo está por defecto—, pero no puede ampliarlo: ni esta puerta puede
 * mandar al Core otra capacidad, ni las otras dos pueden abrir esta.
 *
 * Y CON SU PROPIA LISTA DE CUENTAS (decisión del dueño, 2026-10-06): solo pasan las que nombra
 * `aiSettings/runtime.porCapacidad['world.generate'].cuentas`. Sin esa lista, o con ella vacía, no pasa NADIE, y la
 * lista del vídeo o la de Weë Brain no sirven aquí. La obligación no la puede quitar la configuración: es de la puerta
 * del runtime (`runtime/puerta.ts`) y vale igual para las tres.
 */
const CAPACIDAD_DEL_CANARY: CapabilityId = 'world.generate';
const EXPERIENCIA_DE_STUDIO = 'studio';

/**
 * ── EL CUPO DEL DÍA: CINCO MUNDOS QUE SALGAN ────────────────────────────────
 *
 * «5 mundos al día» son cinco generaciones que SALEN (`DEFAULT_LIMITS.perUserPerDay['3d']`, cambiable en
 * `aiSettings/global.limits`). Un fallo técnico no gasta ninguno. Por el limitador de siempre (`engine/limits.ts`):
 *
 *   al cotizar y antes de    ¿cabe? (`comprobar`, sin apuntar nada): «hoy ya no» se dice antes de enseñar un precio y
 *   tocar Credits            no mueve dinero.
 *   reservado el dinero      se ocupa el hueco (`reserve`, idempotente por operación): si otra creación ocupó el último
 *                            entretanto, esta no sigue y lo reservado vuelve.
 *   el hueco sigue al dinero si la reserva queda DEVUELTA —error interno, plazo, fallo del proveedor, aviso perdido que
 *                            la reconciliación cierra como fallido, avería, nada llegó a nadie—, el hueco vuelve al día
 *                            en que se ocupó (`liberar`, que devuelve lo que la operación anotó): lo devuelve esta
 *                            puerta en sus fallos (`devolverLoReservado`, un solo sitio) y el barrido en los de después
 *                            (`liquidacionDeWee`, con la operación y el día que viajan en el trabajo).
 *   un mundo que sale        su hueco se queda: es uno de los cinco.
 *   la persona cancela con   el hueco se queda gastado (`consumir`): el proveedor ya trabajaba. El dinero sigue la regla
 *   el proveedor trabajando  de la parada (si el proveedor no llega a terminar, vuelve), y el COSTE queda «en riesgo»
 *                            (ver abajo). Cancelar antes de que nada llegue al proveedor no gasta el hueco.
 *   reintentar con el MISMO  es la misma operación: ni otro hueco, ni otro cobro.
 *   requestId
 *
 * LA OPERACIÓN DEL CUPO tiene nombre propio —la capacidad, «#» y el requestId—: el vídeo cuenta sus operaciones por el
 * requestId a secas, y «#» es un carácter que un requestId no admite (`assertRequestId`), así que ningún requestId que
 * contó para un vídeo, ni uno hecho a medida, puede hacer pasar un mundo por un hueco que no ocupó.
 *
 * Un mundo cuyo final no se sabe (salió y no volvió nadie) retiene su dinero y su hueco hasta saberse: se reconcilia.
 *
 * ── EL COSTE DE UN MUNDO ACEPTADO (RUNTIME §22.5, cerrado el 2026-10-06) ────
 *
 *   cotizar → reservar → el proveedor ACEPTA → genera → desenlace → libro y uso → liquidación → cobro o devolución
 *
 * Al aceptarlo, la fila del libro (`aiGenerations`) NO se cierra: queda en curso (`PROCESSING`) con el nombre que el
 * proveedor le dio a la tarea (`providerTaskId`), el mismo que guarda el intento del trabajo. La cierra UNA vez el
 * barrido, al liquidar (`liquidacionDeWee`), antes de mover el dinero: un mundo que SALE, con su coste de tarifa (por
 * petición: el que se cotizó, exacto); uno que falla o se cancela con el proveedor ya trabajando, con su coste «en
 * riesgo» (H0 #22: `usdEnRiesgo`, que ven los topes de gasto). Un final que no se sabe deja la fila en curso: se
 * reconcilia, no se adivina.
 */
const CUPO_DEL_MUNDO = { '3d': 1 } as const;
const operacionDelCupo = (requestId: string): string => `${CAPACIDAD_DEL_CANARY}#${requestId}`;

/** El proveedor coge la tarea y suelta: es lo único que tiene sentido para algo que tarda minutos. */
const ACEPTA_ASINCRONO = true;

/** Lo que vive ESTA llamada: un envío (segundos) y su contabilidad. Lo largo vive en el trabajo. */
const PLAZO_DE_LA_PUERTA_MS = 120_000;

/**
 * LA POLÍTICA DEL TRABAJO DE MUNDO: los relojes de `PLAZOS_DE_MUNDO` y UN intento. Reintentar un mundo sería otro
 * POST al proveedor —otra generación y otro coste—; con un intento, un fallo del proveedor es final y el barrido
 * devuelve la reserva exacta. Reintentar es cosa de la persona, con otra petición.
 */
const POLITICA_DEL_MUNDO = politicaDe(PLAZOS_DE_MUNDO, {
  ...POLITICA_DE_TRABAJO,
  retry: { ...POLITICA_DE_TRABAJO.retry, maxAttempts: 1 },
});

/** Los códigos del Core que dicen «no hay con qué», y no «falló»: para la persona, no disponible. */
const SIN_CON_QUE: ReadonlySet<string> = new Set(['CAPABILITY_UNAVAILABLE', 'PROVIDER_UNAVAILABLE', 'MODEL_UNAVAILABLE']);

interface EntradaDeLaPuerta {
  op?: unknown;
  requestId?: unknown;
  peticion?: unknown;
  /** Lo que se le enseñó a la persona. Si el precio cambió desde entonces, no se crea. */
  creditosCotizados?: unknown;
}

const OPERACIONES = ['cotizar', 'crear', 'estado', 'cancelar'] as const;
/** El servicio de Credits de un mundo: una reserva de otro servicio con el mismo requestId no es un mundo. */
const SERVICIO_DEL_MUNDO = serviceForCapability(CAPACIDAD_DEL_CANARY, {});
type Operacion = typeof OPERACIONES[number];

/**
 * LA FOTO, RESUELTA EN EL SERVIDOR a una dirección de la carpeta de la cuenta. Un material que no es de la cuenta, que
 * no es una imagen o que no está listo no vale; de él no se dice ni que exista.
 */
const resolverImagen = async (uid: string, peticion: PeticionDeMundo3D): Promise<string> => {
  if (peticion.imagen.tipo === 'storage') {
    /*
     * SOLO EL CUBO DE ESTE PROYECTO, y se reescribe como gs://. El contrato mira la RUTA (la carpeta de la cuenta);
     * aquí se exige además que el cubo sea el nuestro. Lo hizo primero esta puerta, cuando el lector de fotos, si el
     * Admin SDK no podía, la pedía por HTTP con la dirección original; desde la revisión de las direcciones del Storage
     * (2026-10-06) la regla es común para todo Weë (`direccionDeLaCuenta`, `engine/http.ts`) y el lector ya no sale a
     * la red con una dirección del Storage. Pasar esta puerta a la regla común queda como deuda registrada.
     */
    const ruta = rutaEnElStorageDeWee(peticion.imagen.url);
    const cubo = getStorage().bucket().name;
    if (!ruta || ruta.bucket !== cubo || !ruta.path.startsWith(`users/${uid}/`)) {
      throw new EngineError('INVALID_REQUEST', 'Sube una foto para que Weë pueda trabajar con ella.', { reason: 'needs_image' });
    }
    return `gs://${cubo}/${ruta.path}`;
  }
  /* `leerMaterial` contesta `null` si no existe; si LANZA es una avería, y una avería no se cuenta como «esa foto no vale». */
  const material = await leerMaterial(peticion.imagen.assetId);
  const ref = material?.storageRef;
  if (!material || !materialEsDeLaCuenta(material, uid) || material.kind !== 'image' || material.status !== 'ready'
    || !ref || ref.provider !== 'wee' || !ref.objectKey.startsWith(`users/${uid}/`)) {
    throw new EngineError('INVALID_REQUEST', 'Sube una foto para que Weë pueda trabajar con ella.', { reason: 'needs_image' });
  }
  return `gs://${ref.bucket}/${ref.objectKey}`;
};

/**
 * LA HUELLA DEL MUNDO PEDIDO. Con ella el Credit Engine sabe si un `requestId` repetido es de verdad ESTE mundo: la
 * misma petición da la misma huella, en orden canónico. Es un resumen: no guarda ni la dirección ni las palabras.
 */
const huellaDelMundo = (entrada: EntradaDeMundo3D): string => {
  const canonico = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonico);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, canonico(o[k])]));
    }
    return v;
  };
  return createHash('sha256').update(JSON.stringify(canonico({ operacion: 'mundo3d', entrada }))).digest('hex');
};

interface MundoPreparado {
  peticion: PeticionDeMundo3D;
  entrada: EntradaDeMundo3D;
  jurisdicciones?: readonly string[];
  credits: number;
  usd: number;
  service: ReturnType<typeof serviceForCapability>;
  /** Lo que eligió el Router al cotizar. Se fija al crear: lo que se cobra es el precio de ESTE modelo. */
  proveedor: string;
  modelo: string;
}

/**
 * ¿SE PUEDE, Y CUÁNTO CUESTA? Antes de tocar cupo o Credits: un «no» aquí no mueve nada.
 *
 *   contrato de Weë (estricto: un campo de un proveedor invalida la petición) → la foto, de la carpeta de la cuenta →
 *   la puerta del conductor → la jurisdicción, UNA vez y en el servidor (el país que declara el Perfil Real) → el
 *   Router con esa jurisdicción: sin candidato, NOT_AVAILABLE con su motivo público; con él, su precio.
 */
const prepararElMundo = async (uid: string, crudo: unknown): Promise<MundoPreparado> => {
  const lectura = leerPeticionDeMundo3D(crudo, uid);
  if (!lectura.ok) throw new EngineError('INVALID_REQUEST', undefined, { reason: lectura.motivo, ...(lectura.campo ? { field: lectura.campo } : {}) });
  const peticion = lectura.peticion;
  const entrada = entradaDeMundo3D(peticion, await resolverImagen(uid, peticion));

  const puerta = decidirRuntime(await configuracionDeLaPuerta(getFirestore()), {
    capability: CAPACIDAD_DEL_CANARY,
    userId: uid,
    experienceId: EXPERIENCIA_DE_STUDIO,
  });
  /* No hay otro camino para un mundo: sin el conductor, no está disponible —y no se dice por qué puerta—. */
  if (puerta.runtime !== 'core') throw noDisponible('no_disponible');

  /* Sin país declarado contesta `undefined` (y la regla común falla cerrado); si LANZA es una avería, que sube como tal:
     aquí aún no se ha movido nada, y una lectura caída no se le cuenta a la persona como «falta tu país». */
  const jurisdicciones = await jurisdiccionesDeLaCuenta(uid);
  await loadCostOverrides();
  const decision = await engine.route({
    capability: CAPACIDAD_DEL_CANARY,
    input: { ...entrada },
    userId: uid,
    ...(jurisdicciones?.length ? { jurisdicciones } : {}),
  });
  if (!decision.candidates.length) throw noDisponible(motivoDeNoDisponible(decision.skipped));
  const elegido = decision.candidates[0];
  return {
    peticion,
    entrada,
    ...(jurisdicciones?.length ? { jurisdicciones } : {}),
    credits: elegido.estimatedCredits,
    usd: elegido.estimatedUsd,
    proveedor: elegido.provider,
    modelo: elegido.model.id,
    service: serviceForCapability(CAPACIDAD_DEL_CANARY, { ...entrada }),
  };
};

/**
 * CÓMO VA UNA PETICIÓN, contado sin nada de dentro: el estado del trabajo del Job Engine traducido al del mundo y, al
 * final, el material por su id con su vista previa y sus derechos. Solo de la cuenta que pregunta: un `requestId` de
 * otra persona no encuentra nada (el trabajo se busca dentro del ámbito de la cuenta).
 */
const estadoDelMundo = async (uid: string, requestId: string): Promise<TrabajoDeMundo3D> => {
  const db = getFirestore();
  const job = await trabajoDelMundo(uid, requestId);
  if (!job) {
    /* Sin trabajo: o se está creando ahora mismo (la reserva existe y está retenida) o se devolvió sin llegar a nadie. */
    const reserva = (await db.collection('creditTransactions').doc(usageTransactionId(requestId)).get()).data();
    if (!reserva || reserva.userId !== uid || reserva.service !== SERVICIO_DEL_MUNDO) throw new EngineError('INVALID_REQUEST', 'No encontramos esa creación.', { reason: 'no_existe' });
    if (reserva.status !== 'AUTHORIZED') {
      await devolverElHuecoSiNoSalio(uid, requestId);
      return { contract: MUNDO3D_CONTRACT_VERSION, requestId, estado: 'fallido' };
    }
    /*
     * RETENIDA Y SIN TRABAJO MÁS ALLÁ DEL PLAZO DE LA PUERTA: la invocación que la hizo murió antes de crear el trabajo
     * y nada llegó al proveedor. La app pide cada mundo con un requestId nuevo y nunca repetiría este, así que es al
     * PREGUNTAR cuando se devuelve (idempotente) y se cuenta como fallido. Antes del plazo, se está creando: en cola.
     */
    const creada = reserva.createdAt;
    const autorizadaEn = typeof creada?.toMillis === 'function' ? creada.toMillis() : typeof creada === 'number' ? creada : Infinity;
    if (operacionAbandonada(true, autorizadaEn + PLAZO_DE_LA_PUERTA_MS, Date.now())) {
      await devolverLoReservado(uid, requestId, { reason: 'Weë Studio · el intento anterior se quedó sin tiempo', siFalla: 'sube' });
      return { contract: MUNDO3D_CONTRACT_VERSION, requestId, estado: 'fallido' };
    }
    return { contract: MUNDO3D_CONTRACT_VERSION, requestId, estado: 'en_cola' };
  }
  const estado = estadoDeMundoDelTrabajo(job.state) ?? 'generando';
  /* Acabó sin mundo: si el barrido ya devolvió el dinero, el hueco también (por si su devolución no llegó a escribirse). */
  if (estado === 'fallido' || estado === 'cancelado') await devolverElHuecoSiNoSalio(uid, requestId);
  if (estado !== 'completado') return { contract: MUNDO3D_CONTRACT_VERSION, requestId, estado };
  const assetId = job.result?.outputRefs?.[0];
  /* Una lectura que LANZA sube como avería: «completado» sin el mundo sería contar otra cosa. Preguntar es repetible. */
  const material = assetId ? await leerMaterial(assetId) : null;
  if (!material || !materialEsDeLaCuenta(material, uid) || material.kind !== TIPO_DE_MATERIAL_DEL_MUNDO) return { contract: MUNDO3D_CONTRACT_VERSION, requestId, estado };
  return {
    contract: MUNDO3D_CONTRACT_VERSION,
    requestId,
    estado,
    mundo: {
      assetId: material.assetId,
      kind: TIPO_DE_MATERIAL_DEL_MUNDO,
      conVistaPrevia: (material.variants ?? []).some((v) => v.kind === VARIANTE_DE_LA_VISTA_PREVIA),
      ...(material.derechos ? { derechos: derechosVisibles(material.derechos) } : {}),
    },
  };
};

/**
 * EL TRABAJO DE UN MUNDO DE ESA CUENTA, o nada. La clave del medio es (cuenta, requestId) y la comparten las puertas
 * del conductor: un trabajo de vídeo con el mismo requestId no es un mundo, y por esta puerta ni se cuenta ni se para.
 */
const trabajoDelMundo = async (uid: string, requestId: string) => {
  const job = await trabajoDelMedioDeWee(getFirestore(), uid, requestId);
  return job && job.capability === CAPACIDAD_DEL_CANARY ? job : null;
};

/** ¿Esta operación ya se reservó alguna vez? Si sí, repetirla no gasta cupo. Solo cuenta si es de quien pregunta. */
const yaReservada = async (uid: string, requestId: string): Promise<boolean> => {
  const snap = await getFirestore().collection('creditTransactions').doc(usageTransactionId(requestId)).get();
  return snap.exists && snap.data()?.userId === uid;
};

/**
 * EL HUECO SIGUE AL DINERO: si la reserva de ESTE mundo quedó devuelta, el mundo no salió y su hueco vuelve al día que
 * anotó la reserva. Idempotente; sin efecto si ya volvió, si la reserva sigue retenida o cobrada, o si la persona lo
 * gastó al cancelar. Una avería aquí no cambia la respuesta: deja a la persona con un hueco menos, nunca con uno de más,
 * se registra y se vuelve a intentar la próxima vez que pregunte por este mundo.
 */
const devolverElHuecoSiNoSalio = async (uid: string, requestId: string): Promise<void> => {
  try {
    const reserva = (await getFirestore().collection('creditTransactions').doc(usageTransactionId(requestId)).get()).data();
    const dia = reserva?.meta?.[CLAVE_DEL_DIA_DEL_CUPO];
    if (!reserva || reserva.userId !== uid || reserva.service !== SERVICIO_DEL_MUNDO || reserva.status !== 'REFUNDED' || typeof dia !== 'string') return;
    await limiter.liberar(uid, operacionDelCupo(requestId), dia);
  } catch (e) {
    console.error(`Weë Studio · mundo 3D: no se pudo devolver el hueco del día · requestId=${requestId}`, sanitizeForLog(e, 300));
  }
};

/**
 * DEVOLVER LO QUE ESTA PUERTA RESERVÓ: el dinero y, con él, el hueco del día. UN solo sitio, para que «el hueco sigue al
 * dinero» no dependa de acordarse en cada camino (revisión de código). `siFalla`: si el reembolso no se puede hacer,
 * ¿se sube el error —quien llama le va a decir a la persona que se le devolvió— o se registra —lo cerrará la
 * liquidación—? `libro`: si hay una fila del libro que cerrar a cero. Sin reembolso hecho, el hueco no vuelve.
 */
const devolverLoReservado = async (
  uid: string,
  requestId: string,
  opciones: { reason: string; siFalla: 'sube' | 'registra'; libro?: boolean },
): Promise<void> => {
  const reembolso = creditEngine.refundCredits({ userId: uid, requestId, reason: opciones.reason, source: 'weë-studio' });
  if (opciones.siFalla === 'sube') await reembolso;
  else await reembolso.catch((e) => console.error('Weë Studio · mundo 3D: no se pudo reembolsar', requestId, sanitizeForLog(e, 300)));
  if (opciones.libro) {
    await firestoreLedger.settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: 0 })
      .catch((e) => console.error('Weë Studio · mundo 3D: no se pudo liquidar el libro', requestId, sanitizeForLog(e, 300)));
  }
  await devolverElHuecoSiNoSalio(uid, requestId);
};

/**
 * LA PERSONA CANCELA UN MUNDO QUE EL PROVEEDOR YA TENÍA: su hueco se queda gastado (ver «el cupo del día»). Con el día
 * que viaja en el trabajo. Si no se puede anotar, se registra: la parada ya está pedida y es lo que la persona quería.
 */
const gastarElHueco = async (uid: string, requestId: string, metadata: Readonly<Record<string, unknown>> | undefined): Promise<void> => {
  const dia = metadata?.[CLAVE_DEL_DIA_DEL_CUPO];
  if (typeof dia !== 'string') return;
  await limiter.consumir(uid, operacionDelCupo(requestId), dia).catch((e) => {
    console.error(`Weë Studio · mundo 3D: no se pudo anotar el hueco gastado · requestId=${requestId}`, sanitizeForLog(e, 300));
  });
};

export const generateWorld = onCall({ region: 'us-central1', timeoutSeconds: PLAZO_DE_LA_PUERTA_MS / 1000, memory: '512MiB' }, async (request) => {
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as EntradaDeLaPuerta;
    /* Una operación que no existe se rechaza en la frontera: no se toma por «crear», que es la que cobra. */
    const op = data.op as Operacion;
    if (!OPERACIONES.includes(op)) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'op_desconocida' });

    if (op === 'cotizar') {
      const p = await prepararElMundo(uid, data.peticion);
      /* Si hoy ya no cabe otro mundo, se dice AHORA, antes de enseñar un precio (sin apuntar nada). */
      await limiter.comprobar(uid, CUPO_DEL_MUNDO, (await loadConfig()).settings.limits);
      return { contract: MUNDO3D_CONTRACT_VERSION, status: 'QUOTED', credits: p.credits };
    }

    const requestId = assertRequestId(data.requestId);
    if (op === 'estado') return await estadoDelMundo(uid, requestId);

    if (op === 'cancelar') {
      const job = await trabajoDelMundo(uid, requestId);
      if (!job) throw new EngineError('INVALID_REQUEST', 'No encontramos esa creación.', { reason: 'no_existe' });
      /*
       * Lo que ya terminó, o ya se pidió parar, no se vuelve a pedir: se cuenta cómo está. Y MIENTRAS SE ENVÍA
       * (`running`, el intento todavía sin la referencia del proveedor) tampoco: el Job Engine consumaría la parada en
       * cuanto llegara la aceptación, y la tarea seguiría viva en el proveedor sin nadie que le pida parar —el mundo
       * se tiraría y la reserva se devolvería—. Se cuenta «generando» y se puede volver a pedir en un momento.
       */
      if (sePuedeCancelarElMundo(estadoDeMundoDelTrabajo(job.state)) && job.state !== 'running') {
        const parada = await pedirParada(paradaDeWee({ db: getFirestore() }), job, { userId: uid });
        /* El proveedor ya lo tenía: es un mundo empezado que la persona decide parar, y su hueco del día se queda gastado. */
        if (parada.estado === 'pedida' && parada.job.attempts.some((a) => a.dispatched === true)) {
          await gastarElHueco(uid, requestId, parada.job.metadata);
        }
      }
      return await estadoDelMundo(uid, requestId);
    }

    /* ── crear ─────────────────────────────────────────────────────────── */
    const p = await prepararElMundo(uid, data.peticion);
    /* Se crea por lo que se enseñó: si el precio cambió, no se reserva y se vuelve a cotizar. */
    if (Number(data.creditosCotizados) !== p.credits) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'price_changed', credits: p.credits });

    const { settings } = await loadConfig();
    /* El día del cupo de ESTA petición: viaja en la reserva y en el trabajo, para que el hueco vuelva al día en que se ocupó. */
    const dia = dayKey();
    /* ¿Cabe? Antes de tocar Credits, y sin apuntar nada: «hoy ya no» no mueve dinero. Repetir la operación no pregunta. */
    if (!(await yaReservada(uid, requestId))) await limiter.comprobar(uid, CUPO_DEL_MUNDO, settings.limits, operacionDelCupo(requestId), dia);
    await ensureAccount(uid);
    const spend = await creditEngine.spendCredits({
      userId: uid,
      service: p.service,
      amount: p.credits,
      requestId,
      reason: 'Weë Studio · mundo 3D',
      source: 'weë-studio',
      /* Lo que se pide: un requestId repetido solo sirve para ESTE mundo. */
      fingerprint: huellaDelMundo(p.entrada),
      meta: { estimatedUsd: p.usd, [CLAVE_DEL_DIA_DEL_CUPO]: dia },
    });

    /* Mismo requestId: UN REQUEST = UNA GENERACIÓN = UN COBRO. */
    if (spend.duplicate) {
      /* Ya tiene trabajo: es la misma creación. Se cuenta cómo va; ni otra generación, ni otro cobro. */
      if (await trabajoDelMundo(uid, requestId)) return { ...(await estadoDelMundo(uid, requestId)), duplicate: true };
      if (spend.status === 'AUTHORIZED' && operacionAbandonada(true, (spend.authorizedAt ?? Infinity) + PLAZO_DE_LA_PUERTA_MS, Date.now())) {
        /* Se quedó colgada sin trabajo: nada llegó al proveedor. Se devuelve lo retenido —y su hueco del día— y se dice. */
        await devolverLoReservado(uid, requestId, { reason: 'Weë Studio · el intento anterior se quedó sin tiempo', siFalla: 'sube' });
        throw new EngineError('TIMEOUT', 'Ese intento se quedó sin tiempo y te devolví los Credits. Puedes volver a intentarlo.');
      }
      /* Cerrada (devuelta) sin trabajo: no está en marcha; se cuenta cómo acabó, para que un reintento converja. */
      if (spend.status !== 'AUTHORIZED') return { ...(await estadoDelMundo(uid, requestId)), duplicate: true };
      throw new EngineError('DUPLICATE_REQUEST');
    }

    /*
     * RESERVADO EL DINERO, EL HUECO, en el mismo día. Si otra creación ocupó el último entretanto (RATE_LIMITED) o el
     * limitador no contesta, este mundo no sigue: lo reservado vuelve entero, y si el hueco llegó a apuntarse, también.
     */
    try {
      await limiter.reserve(uid, CUPO_DEL_MUNDO, settings.limits, operacionDelCupo(requestId), dia);
    } catch (error) {
      /* Si el reembolso falla, sube ESE error: la app no sabe cómo acabó y pregunta por esta petición, que es lo que devuelve
         una reserva sin trabajo; si sale bien, el «hoy ya no» de siempre. */
      await devolverLoReservado(uid, requestId, { reason: 'Weë Studio · el mundo 3D no se pudo crear', siFalla: 'sube' });
      throw error;
    }

    let desenlace: Awaited<ReturnType<typeof pedirMedio>>;
    try {
      desenlace = await sinReservaHuerfana(uid, requestId, async () => {
        const conductor = await conductorDeWee({
          db: getFirestore(),
          aceptaAsincrono: ACEPTA_ASINCRONO,
          politica: POLITICA_DEL_MUNDO,
          /* La jurisdicción que se leyó arriba, la MISMA para el ejecutor y para la política. */
          ...(p.jurisdicciones ? { jurisdicciones: p.jurisdicciones } : {}),
        });
        return pedirMedio({
          conductor,
          principal: { userId: uid },
          trace: { traceId: requestId, requestId, userId: uid, workplace: EXPERIENCIA_DE_STUDIO },
          capability: CAPACIDAD_DEL_CANARY,
          input: { ...p.entrada },
          /* El modelo que se cotizó es el que se ejecuta (como en las otras dos puertas): se fija la decisión del Router, no se sustituye. */
          ruteo: { modelId: p.modelo, allowedProviders: [p.proveedor] },
          /* Para qué es: lo que escribió la persona, si escribió algo. Va al trabajo, nunca al proveedor. */
          proposito: p.peticion.descripcion ?? 'Crear un mundo 3D',
          contabilidad: {
            service: p.service,
            creditsEstimated: spend.amount,
            estimatedUsd: p.usd,
            creditTransactionId: usageTransactionId(requestId),
            creditRequestId: requestId,
            /* El hueco del cupo que ocupa: si el barrido devuelve la reserva, vuelve con ella a ESTE día. */
            [CLAVE_DE_LA_OPERACION_DEL_CUPO]: operacionDelCupo(requestId),
            [CLAVE_DEL_DIA_DEL_CUPO]: dia,
          },
          contexto: { appId: 'wee', operationId: requestId },
          deadlineAt: Date.now() + PLAZOS_DE_MUNDO.vidaDelTrabajoMs,
        });
      }, 'Weë Studio · el mundo 3D no se pudo crear');
    } catch (error) {
      /*
       * Si el trabajo EXISTE, lo pedido sigue su camino (la reserva la cierra la liquidación): se cuenta cómo va. Un
       * error aquí la app lo tomaría por un fallo y lo pediría otra vez —dos mundos, dos cobros—.
       */
      if (await trabajoDelMundo(uid, requestId)) return { ...(await estadoDelMundo(uid, requestId)), status: 'ACCEPTED', credits: spend.amount, duplicate: false };
      /* Sin trabajo, nada llegó a nadie: si lo reservado volvió (`sinReservaHuerfana`), vuelve también el hueco. */
      await devolverElHuecoSiNoSalio(uid, requestId);
      throw error;
    }

    if (desenlace.estado === 'en_marcha') {
      /* Aceptado y en marcha. Ni cobro, ni reembolso, ni segundo POST: se contesta y se sale. */
      return {
        contract: MUNDO3D_CONTRACT_VERSION,
        status: 'ACCEPTED',
        requestId,
        estado: estadoDeMundoDelTrabajo(desenlace.estadoDelTrabajo) ?? 'generando',
        credits: spend.amount,
        duplicate: false,
      };
    }
    if (desenlace.estado === 'fallado') {
      if (desenlace.reembolsoSeguro) {
        await devolverLoReservado(uid, requestId, { reason: 'Weë Studio · el mundo 3D no se pudo crear', siFalla: 'registra', libro: true });
      } else {
        console.warn(`WEË STUDIO · MUNDO 3D · fallo sin reembolso seguro · job=${desenlace.jobId ?? '?'}: lo cierra la liquidación`);
      }
      throw SIN_CON_QUE.has(desenlace.error.code) ? noDisponible('no_disponible') : new EngineError('PROVIDER_ERROR');
    }
    /*
     * Terminó dentro de la llamada (un proveedor que contestó del tirón). El material lo dejó el conductor y el dinero
     * lo cierra la liquidación, leyendo el trabajo, como en el camino asíncrono: un solo sitio que cobra.
     */
    return { ...(await estadoDelMundo(uid, requestId)), status: 'COMPLETED', credits: spend.amount, duplicate: false };
  } catch (error) {
    throw toEngineHttpsError(error);
  }
});
