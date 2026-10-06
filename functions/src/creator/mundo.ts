import { createHash } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { EngineError, motivoDeNoDisponible, noDisponible, toEngineHttpsError } from '../engine/errors';
import { engine } from '../engine';
import { limiter } from '../engine/limits';
import { loadConfig } from '../engine/config';
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
  estadoDeMundoDelTrabajo,
  leerPeticionDeMundo3D,
  materialEsDeLaCuenta,
  operacionAbandonada,
  sePuedeCancelarElMundo,
} from '../core';
import {
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
 *     crear     Auth → contrato de Weë → puerta → jurisdicción del Perfil Real → elegibilidad (Router) → cupo →
 *               Credit Engine (reserva) → conductor → Gateway → adaptador → el proveedor ACEPTA y suelta.
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
 * por cuenta). No hay camino síncrono de mundos: con la puerta cerrada, un mundo «no está disponible». Y no conoce
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
 */
const CAPACIDAD_DEL_CANARY: CapabilityId = 'world.generate';
const EXPERIENCIA_DE_STUDIO = 'studio';

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
type Operacion = typeof OPERACIONES[number];

/**
 * LA FOTO, RESUELTA EN EL SERVIDOR a una dirección de la carpeta de la cuenta. Un material que no es de la cuenta, que
 * no es una imagen o que no está listo no vale; de él no se dice ni que exista.
 */
const resolverImagen = async (uid: string, peticion: PeticionDeMundo3D): Promise<string> => {
  if (peticion.imagen.tipo === 'storage') return peticion.imagen.url;
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
  const job = await trabajoDelMedioDeWee(db, uid, requestId);
  if (!job) {
    /* Sin trabajo: o se está creando ahora mismo (la reserva existe y está retenida) o se devolvió sin llegar a nadie. */
    const reserva = (await db.collection('creditTransactions').doc(usageTransactionId(requestId)).get()).data();
    if (!reserva || reserva.userId !== uid) throw new EngineError('INVALID_REQUEST', 'No encontramos esa creación.', { reason: 'no_existe' });
    return { contract: MUNDO3D_CONTRACT_VERSION, requestId, estado: reserva.status === 'AUTHORIZED' ? 'en_cola' : 'fallido' };
  }
  const estado = estadoDeMundoDelTrabajo(job.state) ?? 'generando';
  if (estado !== 'completado') return { contract: MUNDO3D_CONTRACT_VERSION, requestId, estado };
  const assetId = job.result?.outputRefs?.[0];
  /* Una lectura que LANZA sube como avería: «completado» sin el mundo sería contar otra cosa. Preguntar es repetible. */
  const material = assetId ? await leerMaterial(assetId) : null;
  if (!material || !materialEsDeLaCuenta(material, uid)) return { contract: MUNDO3D_CONTRACT_VERSION, requestId, estado };
  return {
    contract: MUNDO3D_CONTRACT_VERSION,
    requestId,
    estado,
    mundo: {
      assetId: material.assetId,
      kind: 'world',
      conVistaPrevia: (material.variants ?? []).some((v) => v.kind === VARIANTE_DE_LA_VISTA_PREVIA),
      ...(material.derechos ? { derechos: derechosVisibles(material.derechos) } : {}),
    },
  };
};

/** ¿Esta operación ya se reservó alguna vez? Si sí, repetirla no gasta cupo. Solo cuenta si es de quien pregunta. */
const yaReservada = async (uid: string, requestId: string): Promise<boolean> => {
  const snap = await getFirestore().collection('creditTransactions').doc(usageTransactionId(requestId)).get();
  return snap.exists && snap.data()?.userId === uid;
};

export const generateWorld = onCall({ region: 'us-central1', timeoutSeconds: PLAZO_DE_LA_PUERTA_MS / 1000, memory: '512MiB' }, async (request) => {
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as EntradaDeLaPuerta;
    const op: Operacion = OPERACIONES.includes(data.op as Operacion) ? (data.op as Operacion) : 'crear';

    if (op === 'cotizar') {
      const p = await prepararElMundo(uid, data.peticion);
      return { contract: MUNDO3D_CONTRACT_VERSION, status: 'QUOTED', credits: p.credits };
    }

    const requestId = assertRequestId(data.requestId);
    if (op === 'estado') return await estadoDelMundo(uid, requestId);

    if (op === 'cancelar') {
      const job = await trabajoDelMedioDeWee(getFirestore(), uid, requestId);
      if (!job) throw new EngineError('INVALID_REQUEST', 'No encontramos esa creación.', { reason: 'no_existe' });
      /* Lo que ya terminó, o ya se pidió parar, no se vuelve a pedir: se cuenta cómo está. */
      if (sePuedeCancelarElMundo(estadoDeMundoDelTrabajo(job.state))) {
        await pedirParada(paradaDeWee({ db: getFirestore() }), job, { userId: uid });
      }
      return await estadoDelMundo(uid, requestId);
    }

    /* ── crear ─────────────────────────────────────────────────────────── */
    const p = await prepararElMundo(uid, data.peticion);
    /* Se crea por lo que se enseñó: si el precio cambió, no se reserva y se vuelve a cotizar. */
    if (Number(data.creditosCotizados) !== p.credits) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'price_changed', credits: p.credits });

    const { settings } = await loadConfig();
    if (!(await yaReservada(uid, requestId))) await limiter.reserve(uid, { '3d': 1 }, settings.limits, requestId);
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
      meta: { estimatedUsd: p.usd },
    });

    /* Mismo requestId: UN REQUEST = UNA GENERACIÓN = UN COBRO. */
    if (spend.duplicate) {
      const db = getFirestore();
      /* Ya tiene trabajo: es la misma creación. Se cuenta cómo va; ni otra generación, ni otro cobro. */
      if (await trabajoDelMedioDeWee(db, uid, requestId)) return { ...(await estadoDelMundo(uid, requestId)), duplicate: true };
      if (spend.status === 'AUTHORIZED' && operacionAbandonada(true, (spend.authorizedAt ?? Infinity) + PLAZO_DE_LA_PUERTA_MS, Date.now())) {
        /* Se quedó colgada sin trabajo: nada llegó al proveedor. Se devuelve lo retenido y se dice. */
        await creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Studio · el intento anterior se quedó sin tiempo', source: 'weë-studio' });
        throw new EngineError('TIMEOUT', 'Ese intento se quedó sin tiempo y te devolví los Credits. Puedes volver a intentarlo.');
      }
      throw new EngineError('DUPLICATE_REQUEST');
    }

    const desenlace = await sinReservaHuerfana(uid, requestId, async () => {
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
        /* Para qué es: lo que escribió la persona, si escribió algo. Va al trabajo, nunca al proveedor. */
        proposito: p.peticion.descripcion ?? 'Crear un mundo 3D',
        contabilidad: {
          service: p.service,
          creditsEstimated: spend.amount,
          estimatedUsd: p.usd,
          creditTransactionId: usageTransactionId(requestId),
          creditRequestId: requestId,
        },
        contexto: { appId: 'wee', operationId: requestId },
        deadlineAt: Date.now() + PLAZOS_DE_MUNDO.vidaDelTrabajoMs,
      });
    }, 'Weë Studio · el mundo 3D no se pudo crear');

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
        await creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Studio · el mundo 3D no se pudo crear', source: 'weë-studio' })
          .catch((e) => console.error('Weë Studio · mundo 3D: no se pudo reembolsar', requestId, e));
        await firestoreLedger.settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: 0 })
          .catch((e) => console.error('Weë Studio · mundo 3D: no se pudo liquidar el libro', requestId, e));
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
