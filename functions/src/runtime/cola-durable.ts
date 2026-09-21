import type { Firestore } from 'firebase-admin/firestore';
import { QueueDelivery, QueueMessage, QueuePort, leerMensajeDeCola } from '../core';

/**
 * WEË RUNTIME — LA COLA DURABLE. El mismo puerto, un transporte que sobrevive.
 *
 * ── Qué es, y qué NO es ─────────────────────────────────────────────────────
 *
 * Es UNA implementación de `QueuePort`, el puerto que la Fase 8 ya declaraba.
 * No es un segundo motor de trabajos, no es un segundo planificador y no es una
 * «cola de medios»: transporta avisos del Job Engine que ya existe, y no sabe
 * qué hay dentro de un trabajo. No conoce proveedores, ni capacidades, ni
 * materiales, ni cuentas, ni precios. Solo mueve `jobId`.
 *
 *     lo que decide      el Job Engine (F8)
 *     lo que transporta  esto
 *     lo que ejecuta     `atenderEntrega` (F12-A), sin cambiar una línea
 *
 * ── Por qué Firestore, y no otra cosa ───────────────────────────────────────
 *
 * Porque es la única infraestructura durable que el proyecto YA tiene y que ya
 * aloja el almacén de trabajos con su CAS. Cloud Tasks no está habilitado, y
 * los temas de Pub/Sub que existen son de Eventarc. Elegir cualquiera de los
 * dos significaría provisionar infraestructura, conceder permisos y desplegar
 * — y este transporte se puede construir, probar y ejercitar hoy sin tocar
 * nada de eso, porque el puerto los hace intercambiables.
 *
 * **No es la respuesta definitiva a escala.** Una cola sobre una base de datos
 * compite consigo misma por el extremo más antiguo de la cola, y eso tiene un
 * techo. Por eso hay particiones (abajo) y por eso el día que no basten, se
 * escribe otro adaptador de este mismo puerto y no se entera nadie más.
 *
 * ── El recibo es por ENTREGA, no por mensaje ────────────────────────────────
 *
 * Igual que en la cola de invocación, y por el mismo motivo: confirmar una
 * entrega vieja después de otra nueva no puede hacer nada. Aquí, además, el
 * recibo lleva dentro la REVISIÓN del aviso, y eso resuelve una carrera que la
 * otra cola no tiene: si mientras un trabajador ejecuta alguien vuelve a
 * encolar el mismo trabajo —un reintento—, su confirmación **no borra el
 * aviso**; suelta la concesión y lo deja visible. Sin eso, un `ack` legítimo se
 * tragaría un reintento legítimo, y el trabajo se quedaría esperando a nadie.
 */

export const COLECCION_DE_COLA = 'jobQueue';

/**
 * EN CUÁNTAS PARTICIONES SE REPARTE LA COLA.
 *
 * Una cola sobre una base de datos se lee siempre por el mismo sitio —lo más
 * antiguo primero— y eso concentra la contención en un punto. Repartir los
 * avisos por una partición derivada del `jobId` convierte ese punto en
 * dieciséis, que es la técnica de siempre y no cuesta infraestructura.
 *
 * Dieciséis no sale de ninguna medición y por tanto **no se presenta como un
 * número verificado**: es un reparto suficiente para que el reparto exista, y
 * el día que se mida se cambia aquí. Lo que sí es propiedad del diseño es que
 * la partición se DERIVA y nadie la elige.
 */
export const PARTICIONES_DE_COLA = 16;

export const particionDe = (jobId: string, particiones = PARTICIONES_DE_COLA): number => {
  let h = 0;
  for (let i = 0; i < jobId.length; i++) h = (h * 31 + jobId.charCodeAt(i)) | 0;
  return Math.abs(h) % Math.max(1, particiones);
};

/**
 * CUÁNTAS VECES SE ENTREGA UN AVISO ANTES DE APARTARLO.
 *
 * No es la política de reintentos del trabajo —esa es del Job Engine y no se
 * duplica aquí— sino la del MENSAJE: un aviso que se entrega una y otra vez sin
 * que nadie consiga cerrarlo es un aviso envenenado, y seguir entregándolo
 * gasta lecturas eternamente. Al apartarlo **no se pierde el trabajo**: sigue
 * guardado, terminal o no, y el barrido de recuperables lo vuelve a encontrar.
 */
export const MAX_ENTREGAS_POR_AVISO = 25;

/** Lo que se guarda de un aviso. Ni un dato del trabajo: solo cómo y cuándo entregarlo. */
interface AvisoGuardado {
  jobId: string;
  reason: string;
  enqueuedAt: number;
  /**
   * DESDE CUÁNDO LO PIDE QUIEN ENCOLÓ. La espera del negocio: el retraso de un
   * reintento, la fecha de un aviso programado.
   *
   * Va separado de `disponibleEn` porque si fueran el mismo campo, soltar una
   * concesión tendría que reinventar la espera —y la perdería—. Un reintento
   * encolado con diez segundos de espera mientras alguien ejecuta volvería a
   * ser visible en el acto, que es justo lo contrario de un reintento con
   * espera.
   */
  visibleEn: number;
  /**
   * DESDE CUÁNDO SE PUEDE COGER, que es `max(visibleEn, fin de la concesión)`.
   * Es lo ÚNICO por lo que se consulta: una sola desigualdad, un solo índice.
   */
  disponibleEn: number;
  particion: number;
  entregas: number;
  revision: number;
  /** Quién lo tiene ahora mismo, y hasta cuándo. */
  vuelo?: { deliveryId: string; until: number; worker: string };
  /** Apartado por envenenado. Se queda para poder mirarlo; no se vuelve a entregar. */
  apartado?: { desde: number; entregas: number };
}

export interface ColaDurable extends QueuePort {
  /** Cuántos avisos quedan sin confirmar en una partición. Para observar, no para decidir. */
  pendientes(particion: number): Promise<number>;
  /** Los apartados por envenenados. El sustituto de una cola de muertos mientras no haya una. */
  apartados(limite?: number): Promise<readonly { jobId: string; entregas: number; desde: number }[]>;
}

export interface OpcionesDeColaDurable {
  ahora: () => number;
  /** De qué partición atiende ESTE trabajador. Derivada por quien compone, nunca por un cliente. */
  particion?: number;
  particiones?: number;
  maxEntregas?: number;
  /** Cuántos candidatos se miran por intento de reclamo. Pequeño: se compite por los primeros. */
  candidatos?: number;
}

/** El documento de un aviso se llama por su trabajo: un trabajo, un aviso pendiente. */
const idDe = (jobId: string): string => `q.${jobId}`;

/**
 * UNA COLA QUE SOBREVIVE AL PROCESO.
 *
 * `enqueue` es idempotente por construcción: el documento se llama como el
 * trabajo, así que encolar dos veces el mismo trabajo deja UN aviso, con la
 * hora más temprana de las dos. Dos avisos para el mismo trabajo no aportan
 * nada —el trabajador relee el trabajo de todas formas— y sí gastan lecturas.
 */
export const colaDurableDeTrabajos = (db: Firestore, opciones: OpcionesDeColaDurable): ColaDurable => {
  const coleccion = db.collection(COLECCION_DE_COLA);
  const ahora = opciones.ahora;
  const particiones = opciones.particiones ?? PARTICIONES_DE_COLA;
  const maxEntregas = opciones.maxEntregas ?? MAX_ENTREGAS_POR_AVISO;
  const candidatos = Math.max(1, Math.min(opciones.candidatos ?? 5, 20));

  return {
    guarantee: 'at_least_once',

    async enqueue(message: QueueMessage): Promise<void> {
      /* Se valida con el MISMO lector que usa el trabajador: una sola forma de leer un mensaje. */
      const leido = leerMensajeDeCola(message);
      if (!leido.ok) throw new Error(`mensaje de cola inválido: ${leido.code}`);
      const m = leido.mensaje;
      const ref = coleccion.doc(idDe(m.jobId));
      const desde = m.notBefore ?? 0;

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          const nuevo: AvisoGuardado = {
            jobId: m.jobId,
            reason: m.reason,
            enqueuedAt: m.enqueuedAt,
            visibleEn: desde,
            disponibleEn: desde,
            particion: particionDe(m.jobId, particiones),
            entregas: 0,
            revision: 0,
          };
          tx.create(ref, nuevo);
          return;
        }
        const actual = snap.data() as AvisoGuardado;
        /*
         * Un aviso apartado NO se resucita por encolar: si lo hiciera, un
         * trabajo envenenado volvería al circuito cada vez que alguien lo
         * reintentara, que es exactamente lo que apartarlo evita. Se
         * desapartar a mano, mirando por qué se apartó.
         */
        if (actual.apartado) return;
        /*
         * La revisión sube SIEMPRE que alguien encola, aunque no cambie la
         * hora. Es lo que hace que la confirmación de una entrega anterior no
         * borre este aviso nuevo.
         */
        /* La más temprana manda: pedir antes no puede retrasar lo ya pedido. */
        const visibleEn = Math.min(actual.visibleEn ?? desde, desde);
        tx.update(ref, {
          revision: (actual.revision ?? 0) + 1,
          reason: m.reason,
          enqueuedAt: m.enqueuedAt,
          visibleEn,
          /* Mientras alguien lo tenga, sigue sin poder cogerse: la concesión manda sobre la espera. */
          disponibleEn: Math.max(visibleEn, actual.vuelo?.until ?? 0),
        });
      });
    },

    async claim({ worker, at, visibilityMs }): Promise<QueueDelivery | undefined> {
      const consulta = coleccion
        .where('particion', '==', opciones.particion ?? 0)
        .where('disponibleEn', '<=', at)
        .orderBy('disponibleEn')
        .limit(candidatos);
      const posibles = await consulta.get();

      for (const doc of posibles.docs) {
        const tomado = await db.runTransaction(async (tx) => {
          const snap = await tx.get(doc.ref);
          if (!snap.exists) return undefined;
          const a = snap.data() as AvisoGuardado;
          /* Se vuelve a comprobar TODO dentro de la transacción: la consulta es una pista, no una reserva. */
          if (a.apartado) return undefined;
          if ((a.disponibleEn ?? 0) > at) return undefined;
          if (a.vuelo && a.vuelo.until > at) return undefined;

          const entregas = (a.entregas ?? 0) + 1;
          const revision = (a.revision ?? 0) + 1;

          /* Envenenado: se aparta en vez de entregarse otra vez. El trabajo sigue guardado. */
          if (entregas > maxEntregas) {
            tx.update(doc.ref, { apartado: { desde: at, entregas: a.entregas ?? 0 }, vuelo: null, revision });
            return undefined;
          }

          /* El recibo lleva la revisión: por eso una confirmación vieja no puede borrar un aviso nuevo. */
          const deliveryId = `dur.${a.jobId}.${entregas}.${revision}`;
          /*
           * La espera que pidió quien encoló YA SE CUMPLIÓ: el aviso se está
           * entregando. Dejarla como estaba haría que un reintento encolado
           * durante la ejecución se combinara con una fecha ya gastada —«lo
           * antes posible»— y volviera a entregarse en el acto, perdiendo su
           * retraso. Desde aquí, lo más pronto que tiene sentido es el final de
           * esta concesión.
           */
          tx.update(doc.ref, {
            entregas,
            revision,
            visibleEn: at + visibilityMs,
            disponibleEn: at + visibilityMs,
            vuelo: { deliveryId, until: at + visibilityMs, worker },
          });
          return {
            deliveryId,
            message: { contract: '1.0', jobId: a.jobId, enqueuedAt: a.enqueuedAt, reason: a.reason } as unknown,
            deliveryCount: entregas,
            receivedAt: at,
          } as QueueDelivery;
        });
        if (tomado) return tomado;
      }
      return undefined;
    },

    async ack(deliveryId: string): Promise<void> {
      const jobId = trabajoDelRecibo(deliveryId);
      if (!jobId) return;
      const ref = coleccion.doc(idDe(jobId));
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const a = snap.data() as AvisoGuardado;
        /* Un recibo que no es el que está en vuelo no hace nada. Ni borra, ni suelta. */
        if (a.vuelo?.deliveryId !== deliveryId) return;
        /*
         * Y AQUÍ LA CARRERA QUE IMPORTA. Si mientras se ejecutaba alguien
         * volvió a encolar —un reintento—, la revisión del aviso ya no es la
         * del recibo: confirmar NO borra, solo suelta la concesión y devuelve
         * el aviso a la espera QUE PIDIÓ quien encoló. El reintento sobrevive a
         * la confirmación del intento anterior **y conserva su retraso**: sin
         * eso, un reintento con espera volvería a entregarse en el acto, que es
         * justo lo contrario de un reintento con espera.
         */
        if (revisionDelRecibo(deliveryId) !== a.revision) {
          tx.update(ref, { vuelo: null, disponibleEn: a.visibleEn ?? 0 });
          return;
        }
        tx.delete(ref);
      });
    },

    async nack(deliveryId: string, opcionesDeNack?: { delayMs?: number }): Promise<void> {
      const jobId = trabajoDelRecibo(deliveryId);
      if (!jobId) return;
      const ref = coleccion.doc(idDe(jobId));
      const espera = Math.max(0, opcionesDeNack?.delayMs ?? 0);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const a = snap.data() as AvisoGuardado;
        if (a.vuelo?.deliveryId !== deliveryId) return;
        const visibleEn = ahora() + espera;
        tx.update(ref, { vuelo: null, visibleEn, disponibleEn: visibleEn });
      });
    },

    async pendientes(particion: number): Promise<number> {
      const r = await coleccion.where('particion', '==', particion).count().get();
      return r.data().count;
    },

    async apartados(limite = 50): Promise<readonly { jobId: string; entregas: number; desde: number }[]> {
      const r = await coleccion.orderBy('apartado.desde').limit(Math.max(1, Math.min(limite, 200))).get();
      return Object.freeze(r.docs
        .map((d) => d.data() as AvisoGuardado)
        .filter((a) => !!a.apartado)
        .map((a) => ({ jobId: a.jobId, entregas: a.apartado!.entregas, desde: a.apartado!.desde })));
    },
  };
};

/* ── Los recibos ───────────────────────────────────────────────────────────── */

/**
 * `dur.<jobId>.<entrega>.<revisión>`.
 *
 * El `jobId` va dentro para no tener que consultar por el recibo: confirmar es
 * una lectura por identificador, no una búsqueda. Y como un `jobId` puede
 * llevar puntos, se lee por los DOS últimos, nunca partiendo por el primero.
 */
export const trabajoDelRecibo = (deliveryId: unknown): string | undefined => {
  if (typeof deliveryId !== 'string' || !deliveryId.startsWith('dur.')) return undefined;
  const partes = deliveryId.slice(4).split('.');
  if (partes.length < 3) return undefined;
  const jobId = partes.slice(0, -2).join('.');
  return jobId || undefined;
};

export const revisionDelRecibo = (deliveryId: unknown): number | undefined => {
  if (typeof deliveryId !== 'string') return undefined;
  const partes = deliveryId.split('.');
  const n = Number(partes[partes.length - 1]);
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
};
