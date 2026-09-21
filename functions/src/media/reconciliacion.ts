import {
  Asset,
  HallazgoDeReconciliacion,
  MediaObject,
  MedidorDeUso,
  ObjetoListado,
  PoliticaDeReconciliacion,
  POLITICA_DE_RECONCILIACION,
  PuertoDeAlmacenamiento,
  StorageRef,
  assetDeLaClave,
  claveEsDeLaCuenta,
  decidirUploadAbandonado,
  MOTIVO_DE_SUBIDA_EXPIRADA,
  piezaDeLaClave,
  prefijoDeCuenta,
  puedeRecuperarFicha,
  reconciliarCuenta,
  usoDeOperacion,
} from '../core';
import { JobState } from '../core/job';

/**
 * MC-9 · EL PUENTE, EJECUTADO. Y lo único que escribe: fichas que faltaban.
 *
 * ── El patrón, otra vez ─────────────────────────────────────────────────────
 *
 * El mismo de MC-5, MC-6 y `runtime/barrendero.ts`: decisión pura en el Core y
 * aquí un recorrido por lotes con cursor. No hay cola nueva, ni trabajador, ni
 * planificador, ni un segundo sistema de trabajos. Y **no hay un segundo
 * recolector**: cuando llegue el momento de ejecutar esto periódicamente, lo
 * hará el Job Engine que ya existe.
 *
 * ── Lo que NO borra ─────────────────────────────────────────────────────────
 *
 * Nada. Ni un byte, ni una ficha, ni un material. Lo máximo que hace con unos
 * bytes huérfanos es **darles la ficha que nunca tuvieron**, y con eso entran
 * por la puerta de MC-5 —su edad mínima, sus referencias, su segunda pregunta y
 * su política entera, intactas—. La secuencia es:
 *
 *     MC-9 reconcilia  →  ficha del huérfano  →  MC-5 decide  →  MC-5 borra
 *
 * Darle a MC-9 la capacidad de borrar habría duplicado la política de borrado
 * en dos sitios, y dos políticas de borrado acaban discrepando exactamente el
 * día en que una de las dos se equivoca.
 *
 * ── Y la regla que gobierna las carreras ────────────────────────────────────
 *
 * **Una confirmación válida gana siempre.** Si entre que se mira y que se
 * escribe aparece una ficha, el material deja de ser una subida abandonada — y
 * por eso se vuelve a preguntar justo antes de tocar nada, igual que en MC-5.
 */

/* ── 1 · Lo que hace falta ─────────────────────────────────────────────────── */

export interface DepsDeReconciliacion {
  /** Los materiales de una cuenta que siguen esperando bytes. Por lotes, con cursor. */
  subiendo: (accountId: string, cursor: string | undefined, limite: number) => Promise<{ materiales: readonly Asset[]; cursor?: string }>;
  /** Las fichas de objeto de esa cuenta en ese proveedor. */
  fichas: (accountId: string, providerId: string) => Promise<readonly MediaObject[]>;
  /** La ficha de un destino concreto, para volver a preguntar antes de escribir. */
  ficha: (destino: StorageRef) => Promise<MediaObject | undefined>;
  /** Trabajos vivos sobre un material. Del Job Engine; aquí no hay estados nuevos. */
  operaciones: (material: Asset) => Promise<readonly JobState[]>;
  /** Los adaptadores, por su identidad. Esta capa no sabe de proveedores. */
  almacenes: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  /** A qué proveedor se le pregunta. Del registro del servidor, nunca de un cliente. */
  providerId: string;
  /** Cerrar un material que nunca recibió sus bytes. De la Fase 11. */
  marcarFallido: (accountId: string, assetId: string, motivo: string) => Promise<boolean>;
  /**
   * Dar ficha a unos bytes que no la tenían. Devuelve si la escribió ESTA
   * pasada: `false` significa que ya estaba, que es convergencia, no un fallo.
   */
  registrarHuerfano: (destino: StorageRef, accountId: string, assetId: string, pieza: string, visto: ObjetoListado) => Promise<boolean>;
  ahora: () => number;
  politica?: PoliticaDeReconciliacion;
  /** MC-7 · Por dónde sale la medida. Enumerar ES una operación que el proveedor cobra. */
  medidor?: MedidorDeUso;
}

/* ── 2 · Enumerar una cuenta, entera o nada ────────────────────────────────── */

export interface Enumeracion {
  objetos: readonly ObjetoListado[];
  /** ¿Se vio el prefijo ENTERO? Si no, ninguna ausencia prueba nada. */
  completo: boolean;
  paginas: number;
}

/**
 * PREGUNTARLE AL PROVEEDOR QUÉ TIENE DE ESTA CUENTA.
 *
 * El prefijo lo DERIVA Weë (`prefijoDeCuenta`); no hay forma de pedir otro. Se
 * recorre por páginas con el cursor del propio proveedor, nunca con un
 * desplazamiento, y se para en `maxPaginas` — pero pararse ahí devuelve
 * `completo: false`, que es lo que impide que un corte por tamaño se confunda
 * con «esto es todo lo que hay».
 *
 * Cualquier fallo intermedio también da `completo: false` con lo visto hasta
 * entonces: lo que se vio sigue siendo cierto, lo que falta sigue sin saberse.
 */
export const enumerarCuenta = async (
  deps: DepsDeReconciliacion,
  accountId: string,
): Promise<Enumeracion> => {
  const politica = deps.politica ?? POLITICA_DE_RECONCILIACION;
  const prefijo = prefijoDeCuenta(accountId);
  const puerto = deps.almacenes[deps.providerId];

  /*
   * Un proveedor que no sabe enumerar NO devuelve una lista vacía: devuelve
   * «no se supo». Fingir un listado vacío sería la peor respuesta posible,
   * porque «no hay nada» es justo lo que trataría como huérfano todo lo que sí
   * está — y aquí lo que no se sabe nunca autoriza nada.
   */
  if (!prefijo || !puerto?.listar) return { objetos: [], completo: false, paginas: 0 };

  const objetos: ObjetoListado[] = [];
  let cursor: string | undefined;
  let paginas = 0;

  while (paginas < politica.maxPaginas) {
    const pagina = await puerto.listar({ prefijo, limite: politica.porPagina, ...(cursor ? { cursor } : {}) });
    paginas++;

    /* MC-7 · enumerar es una petición al proveedor y se cobra como tal. */
    if (deps.medidor) {
      for (const u of usoDeOperacion({
        accountId,
        providerId: deps.providerId,
        operacion: 'object.list',
        occurredAt: deps.ahora(),
        ancla: { runId: `list:${accountId}`, objectRef: `p${paginas}` },
      })) deps.medidor.medir(u);
    }

    if (!pagina.ok) return { objetos, completo: false, paginas };
    objetos.push(...pagina.objetos);
    cursor = pagina.cursor;
    if (!cursor) return { objetos, completo: true, paginas };
  }

  /* Se acabaron las páginas permitidas y todavía había más: NO se vio todo. */
  return { objetos, completo: false, paginas };
};

/* ── 3 · El reaper ─────────────────────────────────────────────────────────── */

export interface InformeDelReaper {
  accountId: string;
  providerId: string;
  /** Si el listado no se vio entero, NADA de lo que sigue autoriza una escritura. */
  completo: boolean;
  inspeccionados: number;
  protegidos: number;
  ignorados: number;
  expirados: number;
  reconciliados: number;
  /** Fichas creadas para bytes que no la tenían. Es lo ÚNICO que este barrido escribe. */
  fichasRecuperadas: number;
  yaEstaban: number;
  errores: number;
  porMotivo: Readonly<Record<string, number>>;
  porClase: Readonly<Record<string, number>>;
  cursor?: string;
  ms: number;
}

const sumar = (m: Record<string, number>, k: string): Record<string, number> => ({ ...m, [k]: (m[k] ?? 0) + 1 });

const vacio = (accountId: string, providerId: string): InformeDelReaper & { porMotivo: Record<string, number>; porClase: Record<string, number> } => ({
  accountId, providerId, completo: false,
  inspeccionados: 0, protegidos: 0, ignorados: 0, expirados: 0, reconciliados: 0,
  fichasRecuperadas: 0, yaEstaban: 0, errores: 0,
  porMotivo: {}, porClase: {}, ms: 0,
});

/**
 * PASAR UNA VEZ POR UNA CUENTA. Una enumeración, un lote de materiales, un informe.
 *
 * Idempotente por construcción: repetirlo no crea materiales, no crea fichas de
 * más —la identidad del objeto se deriva del sitio y el alta es «crear si no
 * existe»— y no cambia un estado terminal. Lo que ya se expiró se ignora; lo
 * que ya tiene ficha se ignora; lo que no se supo, se protege.
 */
export const reconciliarSubidas = async (
  deps: DepsDeReconciliacion,
  accountId: string,
  cursorInicial?: string,
): Promise<InformeDelReaper> => {
  const politica = deps.politica ?? POLITICA_DE_RECONCILIACION;
  const empezo = deps.ahora();
  const informe = vacio(accountId, deps.providerId);

  const prefijo = prefijoDeCuenta(accountId);
  if (!prefijo) {
    return { ...informe, porMotivo: Object.freeze({ cuenta_invalida: 1 }), porClase: Object.freeze({}), ms: deps.ahora() - empezo };
  }

  /* 1 · Qué hay de verdad al otro lado. */
  const enumeracion = await enumerarCuenta(deps, accountId);
  informe.completo = enumeracion.completo;

  /* Solo las claves de ESTA cuenta cuentan como «hay bytes». Lo demás ni se mira. */
  const fisicas = new Map<string, ObjetoListado>();
  for (const o of enumeracion.objetos) {
    if (claveEsDeLaCuenta(o.objectKey, accountId)) fisicas.set(o.objectKey, o);
  }

  /* 2 · Qué cree Weë. */
  const lote = await deps.subiendo(accountId, cursorInicial, politica.maxPorEjecucion);
  const fichas = await deps.fichas(accountId, deps.providerId);
  const clavesConFicha = new Set(
    fichas.filter((f) => claveEsDeLaCuenta(f.objectKey, accountId)).map((f) => f.objectKey),
  );

  for (const material of lote.materiales) {
    informe.inspeccionados++;
    const clave = material?.storageRef?.objectKey;

    /*
     * AISLAMIENTO PRIMERO. Un material cuya clave no cae en la carpeta de su
     * cuenta no se toca jamás, ni para cerrarlo: es lo único que impide que una
     * decisión sobre una cuenta alcance los bytes de otra.
     */
    if (typeof clave !== 'string' || !claveEsDeLaCuenta(clave, accountId)) {
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, 'fuera_de_su_cuenta');
      continue;
    }

    const reunir = async () => ({
      material,
      accountId,
      objeto: await deps.ficha(material.storageRef as StorageRef),
      /*
       * `undefined` cuando NO se vio el prefijo entero: sin enumeración
       * completa, que una clave no aparezca no prueba que los bytes no estén.
       */
      hayBytes: enumeracion.completo ? fisicas.has(clave) || clavesConFicha.has(clave) : undefined,
      operaciones: await deps.operaciones(material),
    });

    const primera = decidirUploadAbandonado(await reunir(), politica, deps.ahora());

    if (primera.accion === 'proteger') {
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, primera.motivo);
      continue;
    }
    if (primera.accion === 'ignorar') {
      informe.ignorados++;
      informe.porMotivo = sumar(informe.porMotivo, primera.motivo);
      continue;
    }

    /*
     * LA SEGUNDA PREGUNTA. Entre elegir y escribir, alguien pudo confirmar la
     * subida. Si la segunda no vuelve a decir lo mismo, no se cierra nada — una
     * confirmación válida gana siempre frente al mantenimiento.
     */
    const segunda = decidirUploadAbandonado(await reunir(), politica, deps.ahora());
    if (segunda.accion !== primera.accion) {
      if (segunda.accion === 'ignorar') {
        informe.ignorados++;
        informe.porMotivo = sumar(informe.porMotivo, segunda.motivo);
      } else {
        informe.protegidos++;
        informe.porMotivo = sumar(informe.porMotivo, segunda.accion === 'proteger' ? segunda.motivo : 'cambio_en_curso');
      }
      continue;
    }

    const cerrado = await deps.marcarFallido(accountId, material.assetId, MOTIVO_DE_SUBIDA_EXPIRADA);
    if (!cerrado) {
      informe.errores++;
      informe.porMotivo = sumar(informe.porMotivo, 'no_se_pudo_cerrar');
      continue;
    }
    if (segunda.accion === 'expirar') informe.expirados++; else informe.reconciliados++;
  }

  /* 3 · Y los bytes que no tienen ficha, para que MC-5 pueda verlos. */
  const cruce = reconciliarCuenta({
    accountId,
    providerId: deps.providerId,
    objetos: enumeracion.objetos,
    fichas,
    subiendo: lote.materiales,
    completo: enumeracion.completo,
  }, politica, deps.ahora());

  if (cruce) {
    informe.porClase = { ...cruce.porClase };
    for (const h of cruce.hallazgos) {
      if (!puedeRecuperarFicha(h)) continue;
      const hecho = await recuperar(deps, h, fisicas.get(h.objectKey));
      if (hecho === 'creada') informe.fichasRecuperadas++;
      else if (hecho === 'ya_estaba') informe.yaEstaban++;
      else informe.errores++;
    }
  }

  return {
    ...informe,
    porMotivo: Object.freeze({ ...informe.porMotivo }),
    porClase: Object.freeze({ ...informe.porClase }),
    ...(lote.cursor ? { cursor: lote.cursor } : {}),
    ms: deps.ahora() - empezo,
  };
};

/**
 * DARLE FICHA A UNOS BYTES HUÉRFANOS. Lo único que esta fase escribe sobre el
 * mundo físico — y ni siquiera lo toca: escribe en Firestore.
 *
 * Antes de hacerlo se vuelve a mirar si apareció una ficha: entre clasificar y
 * escribir, un `confirmarSubida` pudo llegar, y entonces estos bytes ya no son
 * huérfanos. Crear una ficha encima no rompería nada —la identidad se deriva
 * del sitio, así que sería la misma— pero preguntarlo hace que el informe diga
 * la verdad en vez de apuntarse un rescate que no hizo.
 */
const recuperar = async (
  deps: DepsDeReconciliacion,
  h: HallazgoDeReconciliacion,
  visto: ObjetoListado | undefined,
): Promise<'creada' | 'ya_estaba' | 'no_se_pudo'> => {
  const assetId = assetDeLaClave(h.objectKey);
  const pieza = piezaDeLaClave(h.objectKey);
  if (!assetId || !pieza || !visto) return 'no_se_pudo';

  const puerto = deps.almacenes[deps.providerId];
  if (!puerto) return 'no_se_pudo';

  const destino: StorageRef = {
    provider: deps.providerId,
    ...(puerto.contenedor ? { bucket: puerto.contenedor } : {}),
    objectKey: h.objectKey,
  };

  if (await deps.ficha(destino)) return 'ya_estaba';
  return (await deps.registrarHuerfano(destino, h.accountId, assetId, pieza, visto)) ? 'creada' : 'ya_estaba';
};
