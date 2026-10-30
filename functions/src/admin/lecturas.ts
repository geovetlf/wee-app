import { FieldPath, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { HttpsError } from 'firebase-functions/v2/https';
import { assertLimit, assertUserId } from '../credits/creditValidation';
import type { JobState } from '../core/job';
import { normalizarNumeroDeCuenta } from '../core/account-identity';

/**
 * LO QUE ADMINISTRACIÓN PUEDE LEER DE LA OPERACIÓN. Solo lectura: aquí no hay ni un `set`, `update`, `delete` ni `add`
 * (lo vigila `admin-lecturas.test.mjs`), y nada ejecuta trabajos ni toca cuentas o Credits.
 *
 * No hay motores nuevos: cada función lee la colección del servicio que ya existe y le da forma. Reglas de TODAS:
 *
 *   · **Lista blanca de campos.** Se copia campo a campo: nunca el documento entero. Nunca salen el objetivo, las
 *     respuestas, los resultados, los prompts, las URLs de los materiales, `json` del trabajo ni correos completos.
 *   · **Techo de consulta** (`assertLimit`) y `examinados`/`truncado`: cuando se filtra en memoria sobre los últimos
 *     documentos, la respuesta dice cuántos miró, para que nadie lea «no hay» donde solo es «no en los últimos N».
 *   · **Sin índices nuevos**: cada consulta usa un índice automático o uno ya desplegado.
 *   · **Lo que no existe se dice** (`capacidades`): no se simula.
 */
const LIMITE_MAXIMO = 50;
/** Cuántos documentos recientes se miran, como mucho, al filtrar en memoria. */
const TECHO_EXAMINADOS = 200;

export const EXPERIENCIAS = ['design', 'studio', 'photo', 'writer', 'music', 'beauty', 'chef', 'home', 'business', 'travel', 'brain'] as const;
export const ESTADOS_DE_TRABAJO: readonly JobState[] = Object.freeze(['queued', 'running', 'waiting', 'cancel_requested', 'completed', 'failed', 'timed_out', 'cancelled']);
const ESTADOS_DE_CREACION = ['asking', 'planned', 'running', 'done', 'failed', 'cancelled'] as const;

export interface Pagina<T> {
  items: T[];
  fuente: string;
  /** Cuántos documentos se miraron, si se filtró en memoria. */
  examinados?: number;
  /** true si podría haber más de lo que se miró. */
  truncado: boolean;
  cursor?: string;
}

const argumento = (mensaje: string) => new HttpsError('invalid-argument', mensaje);

export const leerLimite = (v: unknown): number => {
  try { return assertLimit(v, 25, LIMITE_MAXIMO); } catch { throw argumento('limit inválido'); }
};
const leerCursor = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !/^j\.[A-Za-z0-9_.:-]{1,400}$/.test(v)) throw argumento('cursor inválido');
  return v;
};
export const leerMinutos = (v: unknown, porDefecto: number): number => {
  if (v === undefined || v === null) return porDefecto;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 5 || v > 43_200) throw argumento('minutos inválidos');
  return v;
};
const deLaLista = <T extends string>(v: unknown, lista: readonly T[], nombre: string): T | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !(lista as readonly string[]).includes(v)) throw argumento(`${nombre} inválido`);
  return v as T;
};
const leerUid = (v: unknown): string => {
  try { return assertUserId(v); } catch { throw argumento('uid inválido'); }
};
const leerDia = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw argumento('dia inválido');
  return v;
};

/** Timestamp, número en ms o nada → ms. Nunca lanza con un dato raro. */
const ms = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v instanceof Timestamp) return v.toMillis();
  const f = (v as { toMillis?: () => number } | null | undefined)?.toMillis;
  return typeof f === 'function' ? f.call(v) : null;
};
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const txt = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/**
 * La cuenta, entera solo para quien puede ver cuentas. El resto ve lo justo para reconocer que dos filas son de la
 * misma persona, sin poder buscarla: `Ab12…yz`.
 */
export const enmascarar = (cuenta: unknown, verEntera: boolean): string | null => {
  const c = txt(cuenta);
  if (!c) return null;
  if (verEntera) return c;
  return c.length <= 6 ? '…' : `${c.slice(0, 4)}…${c.slice(-2)}`;
};

export interface Visibilidad {
  /** Permiso `accounts.read`: ver identificadores de cuenta enteros. */
  cuentas: boolean;
  /** Permiso `finance.read`: ver costes de proveedor. */
  costes: boolean;
}

export interface DepsDeLectura {
  db: Firestore;
  auth: () => Pick<Auth, 'getUser'>;
  ahora?: () => number;
}

export const crearLecturas = ({ db, auth, ahora = Date.now }: DepsDeLectura) => {
  const filaDeTrabajo = (d: FirebaseFirestore.QueryDocumentSnapshot, ver: Visibilidad) => {
    const x = d.data();
    return {
      jobId: txt(x.jobId) ?? d.id,
      estado: txt(x.state),
      terminal: x.terminal === true,
      cuenta: enmascarar(x.ownerUserId, ver.cuentas),
      capacidad: txt(x.capability),
      tarea: txt(x.task),
      proveedor: txt(x.providerId),
      modelo: txt(x.modelId),
      creado: ms(x.createdAt),
      actualizado: ms(x.updatedAt),
      limite: ms(x.deadlineAt),
      intentos: num(x.attemptCount),
      liquidacion: txt(x.liquidacion),
    };
  };

  return {
    /** El Job Engine (`jobs`). Sin orden por fecha: igualdad + identificador, sin índice nuevo, como el barrendero. */
    async trabajos(d: Record<string, unknown>, ver: Visibilidad): Promise<Pagina<ReturnType<typeof filaDeTrabajo>>> {
      const limit = leerLimite(d.limit);
      const estado = deLaLista(d.estado, ESTADOS_DE_TRABAJO, 'estado');
      const cursor = leerCursor(d.cursor);
      let q: FirebaseFirestore.Query = estado ? db.collection('jobs').where('state', '==', estado) : db.collection('jobs').where('terminal', '==', false);
      q = q.orderBy(FieldPath.documentId()).limit(limit);
      if (cursor) q = q.startAfter(cursor);
      const snap = await q.get();
      return {
        items: snap.docs.map((x) => filaDeTrabajo(x, ver)),
        fuente: 'jobs',
        truncado: snap.size === limit,
        ...(snap.size === limit ? { cursor: snap.docs[snap.size - 1].id } : {}),
      };
    },

    /** Trabajos no terminados que llevan más de `minutos` sin moverse. Mismo criterio que `recuperables` del almacén. */
    async atascados(d: Record<string, unknown>, ver: Visibilidad) {
      const limit = leerLimite(d.limit);
      const minutos = leerMinutos(d.minutos, 30);
      const corte = ahora() - minutos * 60_000;
      const snap = await db.collection('jobs').where('terminal', '==', false).orderBy(FieldPath.documentId()).limit(TECHO_EXAMINADOS).get();
      const vencidos = snap.docs.filter((x) => { const u = ms(x.data().updatedAt); return u !== null && u <= corte; });
      return {
        items: vencidos.slice(0, limit).map((x) => filaDeTrabajo(x, ver)),
        fuente: 'jobs',
        minutos,
        examinados: snap.size,
        truncado: snap.size === TECHO_EXAMINADOS || vencidos.length > limit,
      };
    },

    /**
     * Lo que ejecuta producción hoy: `creatorJobs` (Weë Studio, Chef, Travel y las demás experiencias). Se miran los
     * últimos documentos y se filtra en memoria, sin índice nuevo. `abandonado`: en marcha y con el plazo vencido.
     */
    async creaciones(d: Record<string, unknown>, ver: Visibilidad) {
      const limit = leerLimite(d.limit);
      const experiencia = deLaLista(d.experiencia, EXPERIENCIAS, 'experiencia');
      const estado = deLaLista(d.estado, ESTADOS_DE_CREACION, 'estado');
      const uid = d.uid === undefined || d.uid === null || d.uid === '' ? undefined : leerUid(d.uid);
      if (uid && !ver.cuentas) throw new HttpsError('permission-denied', 'Buscar por cuenta exige ver cuentas');
      const base = db.collection('creatorJobs');
      const q = uid ? base.where('userId', '==', uid).orderBy('createdAt', 'desc') : base.orderBy('createdAt', 'desc');
      const snap = await q.limit(TECHO_EXAMINADOS).get();
      const t = ahora();
      const filtrados = snap.docs.filter((x) => {
        const j = x.data();
        return (!experiencia || j.experienceId === experiencia) && (!estado || j.status === estado);
      });
      return {
        items: filtrados.slice(0, limit).map((x) => {
          const j = x.data();
          const pasos: Array<{ status?: unknown }> = Array.isArray(j.steps) ? j.steps : [];
          const limite = ms(j.deadlineAt);
          return {
            id: x.id,
            cuenta: enmascarar(j.userId, ver.cuentas),
            experiencia: txt(j.experienceId),
            estado: txt(j.status),
            creado: ms(j.createdAt),
            actualizado: ms(j.updatedAt),
            limite,
            abandonado: j.status === 'running' && limite !== null && limite < t,
            demo: j.demo === true,
            calidad: txt(j.quality),
            modoDePrecio: txt(j.pricingMode),
            creditsEstimados: num(j.creditsEstimated),
            creditsCobrados: num(j.creditsCharged),
            pasos: pasos.length,
            pasosFallidos: pasos.filter((p) => p?.status === 'failed').length,
          };
        }),
        fuente: 'creatorJobs',
        examinados: snap.size,
        truncado: snap.size === TECHO_EXAMINADOS || filtrados.length > limit,
      };
    },

    /** El libro de generaciones (`aiGenerations`): qué proveedor y modelo, resultado y duración. El coste, solo con `finance.read`. */
    async generaciones(d: Record<string, unknown>, ver: Visibilidad) {
      const limit = leerLimite(d.limit);
      const experiencia = deLaLista(d.experiencia, EXPERIENCIAS, 'experiencia');
      const proveedor = typeof d.proveedor === 'string' && /^[a-z0-9_-]{1,40}$/.test(d.proveedor) ? d.proveedor : undefined;
      if (d.proveedor !== undefined && d.proveedor !== '' && !proveedor) throw argumento('proveedor inválido');
      const snap = await db.collection('aiGenerations').orderBy('createdAt', 'desc').limit(TECHO_EXAMINADOS).get();
      const filtrados = snap.docs.filter((x) => {
        const g = x.data();
        return (!experiencia || g.experienceId === experiencia) && (!proveedor || g.provider === proveedor);
      });
      return {
        items: filtrados.slice(0, limit).map((x) => {
          const g = x.data();
          return {
            id: x.id,
            cuenta: enmascarar(g.userId, ver.cuentas),
            experiencia: txt(g.experienceId),
            capacidad: txt(g.capability),
            proveedor: txt(g.provider),
            modelo: txt(g.model),
            estado: txt(g.status),
            intento: num(g.attempt),
            duracionMs: num(g.durationMs),
            creado: ms(g.createdAt),
            jobId: txt(g.jobId),
            creditsCobrados: num(g.creditsCharged),
            ...(ver.costes ? { costeProveedorUsd: num(g.providerCost), costeEstado: txt(g.providerCostStatus) } : {}),
          };
        }),
        fuente: 'aiGenerations',
        examinados: snap.size,
        truncado: snap.size === TECHO_EXAMINADOS || filtrados.length > limit,
      };
    },

    /** El agregado del día (`aiUsage/{día}`): por capacidad y proveedor. Si no hay documento, se dice que no hay. */
    async usoIa(d: Record<string, unknown>, ver: Visibilidad) {
      const dia = leerDia(d.dia) ?? new Date(ahora()).toISOString().slice(0, 10);
      const doc = await db.collection('aiUsage').doc(dia).get();
      const filas: Array<Record<string, unknown>> = [];
      for (const [capacidad, proveedores] of Object.entries(doc.data() ?? {})) {
        if (capacidad === 'updatedAt' || !proveedores || typeof proveedores !== 'object') continue;
        for (const [proveedor, p] of Object.entries(proveedores as Record<string, Record<string, unknown>>)) {
          if (!p || typeof p !== 'object') continue;
          filas.push({
            capacidad, proveedor, llamadas: num(p.calls), fallos: num(p.failed), credits: num(p.credits),
            ...(ver.costes ? { usd: num(p.usd), usdEnRiesgo: num(p.usdEnRiesgo) } : {}),
          });
        }
      }
      return { dia, existe: doc.exists, items: filas, fuente: 'aiUsage', truncado: false };
    },

    /** Reservas de Credits sin cerrar, por antigüedad. Mismo criterio que `ops/reconciliacion/reservas-colgadas.mjs`. */
    async reservas(d: Record<string, unknown>, ver: Visibilidad) {
      const limit = leerLimite(d.limit);
      const minutos = leerMinutos(d.minutos, 120);
      const corte = Timestamp.fromMillis(ahora() - minutos * 60_000);
      const snap = await db.collection('creditTransactions').where('status', '==', 'AUTHORIZED').where('createdAt', '<', corte).orderBy('createdAt', 'desc').limit(limit).get();
      return {
        items: snap.docs.map((x) => {
          const c = x.data();
          return { id: x.id, cuenta: enmascarar(c.userId, ver.cuentas), servicio: txt(c.service), importe: num(c.amount), creada: ms(c.createdAt) };
        }),
        fuente: 'creditTransactions',
        minutos,
        truncado: snap.size === limit,
      };
    },

    /** Filmmaker: el sobre de cada producción, sin su contenido (ni título, ni guion, ni escenas). */
    async producciones(d: Record<string, unknown>, ver: Visibilidad) {
      const limit = leerLimite(d.limit);
      const snap = await db.collection('productions').orderBy('updatedAt', 'desc').limit(limit).get();
      return {
        items: snap.docs.map((x) => {
          const p = x.data();
          return { id: x.id, cuenta: enmascarar(p.ownerAccountId, ver.cuentas), estado: txt(p.status), creada: ms(p.createdAt), actualizada: ms(p.updatedAt), archivada: ms(p.archivedAt) };
        }),
        fuente: 'productions',
        truncado: snap.size === limit,
      };
    },

    /**
     * Una cuenta, por su uid o por su número. Nunca búsqueda libre. Devuelve lo operativo: si existe, sus perfiles (solo
     * tipo e identificador, ni nombre ni foto), el estado de su cuenta y lo que Auth sabe de su acceso, sin correo
     * completo ni nada que sirva para entrar. `encontrada:false` es una respuesta, no un error.
     */
    async buscarCuenta(d: Record<string, unknown>) {
      const dadoUid = d.uid !== undefined && d.uid !== null && d.uid !== '';
      const dadoNumero = d.numeroDeCuenta !== undefined && d.numeroDeCuenta !== null && d.numeroDeCuenta !== '';
      if (dadoUid === dadoNumero) throw argumento('Indica uid o numeroDeCuenta, uno de los dos');
      let uid: string | null;
      if (dadoUid) uid = leerUid(d.uid);
      else {
        const numero = normalizarNumeroDeCuenta(d.numeroDeCuenta);
        if (!numero) throw argumento('numeroDeCuenta inválido');
        const indice = await db.collection('accountNumbers').doc(numero).get();
        uid = indice.exists ? txt(indice.data()?.accountId) : null;
      }
      if (!uid) return { encontrada: false as const, fuente: 'accountNumbers' };

      const [perfiles, caras, cuenta] = await Promise.all([
        db.collection('users').where('uid', '==', uid).limit(5).get(),
        db.collection('users').where('linkedAccountId', '==', uid).limit(5).get(),
        db.collection('accounts').doc(uid).get(),
      ]);
      let acceso: Record<string, unknown> | null = null;
      try {
        const u = await auth().getUser(uid);
        acceso = {
          deshabilitado: u.disabled,
          correoVerificado: u.emailVerified,
          tieneCorreo: !!u.email,
          proveedores: u.providerData.map((p) => p.providerId),
          creado: u.metadata.creationTime ?? null,
          ultimoAcceso: u.metadata.lastSignInTime ?? null,
        };
      } catch (e) {
        if ((e as { code?: unknown })?.code !== 'auth/user-not-found') throw e;
      }
      if (perfiles.empty && caras.empty && !cuenta.exists && !acceso) return { encontrada: false as const, fuente: 'users, accounts, auth' };

      const c = cuenta.data();
      const perfil = (x: FirebaseFirestore.QueryDocumentSnapshot) => {
        const p = x.data();
        return { id: x.id, tipo: p.profileType === 'hidi' ? 'wee' : 'real', creado: ms(p.createdAt) };
      };
      return {
        encontrada: true as const,
        uid,
        fuente: 'users, accounts, auth',
        perfiles: [...perfiles.docs, ...caras.docs].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i).map(perfil),
        cuenta: cuenta.exists ? { numero: txt(c?.accountNumber), estado: txt(c?.status), creada: ms(c?.createdAt) } : null,
        acceso,
        /* No existe ninguna operación que restrinja una cuenta: se dice, no se inventa. */
        restricciones: { disponible: false as const, motivo: 'sin-operacion-en-el-servidor' },
      };
    },
  };
};

/** Lo que el servidor puede y no puede enseñar hoy, sin consultar nada. */
export const capacidades = () => ({
  disponibles: [
    { id: 'trabajos', fuente: 'jobs', nota: 'runtime; vacío mientras las puertas del Core sigan cerradas' },
    { id: 'creaciones', fuente: 'creatorJobs', experiencias: ['studio', 'photo', 'writer', 'beauty', 'chef', 'home', 'business', 'travel', 'brain'] },
    { id: 'generaciones', fuente: 'aiGenerations' },
    { id: 'usoIa', fuente: 'aiUsage' },
    { id: 'reservas', fuente: 'creditTransactions' },
    { id: 'producciones', fuente: 'productions', nota: 'Filmmaker' },
    { id: 'cuentas', fuente: 'users, accounts, auth' },
    { id: 'auditoria', fuente: 'adminAudit' },
  ],
  noDisponibles: [
    { id: 'incidentes', motivo: 'sin-coleccion', dependencia: 'registro de incidentes' },
    { id: 'guardian', motivo: 'sin-servicio', dependencia: 'Motor Guardian (hoy, herramienta de CI)' },
    { id: 'saludPersistida', motivo: 'solo-memoria', dependencia: 'guardar la salud de proveedores (hoy, por instancia)' },
    { id: 'barrido', motivo: 'solo-logs', dependencia: 'informe del barrido de liquidación' },
    { id: 'music', motivo: 'experiencia-sin-conectar', dependencia: 'Weë Music' },
    { id: 'design', motivo: 'simulada-en-el-cliente', dependencia: 'servidor de Weë Design' },
    { id: 'totalesDeCuentas', motivo: 'sin-agregado', dependencia: 'agregado de cuentas, altas y actividad' },
    { id: 'restricciones', motivo: 'sin-operacion', dependencia: 'operación de restringir cuentas' },
  ],
});
