import { Asset, materialEsDeLaCuenta, puedePasarA } from '../content/asset';
import { JobState, esTrabajoTerminal } from '../job';
import { FilaDeReferencia, FilaEsperada, coberturaVigente, filaDeReferenciaValida, registroEsDeLaCuenta } from './indice';
import { MarcaDelObjeto, MediaObject, claveEsDeLaCuenta, cuentaDeLaClave, prefijoDeCuenta } from './objeto';
import { ObjetoListado } from './puerto';

/**
 * MC-9 · EL PUENTE ENTRE LO QUE WEË CREE Y LO QUE EL PROVEEDOR TIENE.
 *
 * ── El agujero que esto tapa ────────────────────────────────────────────────
 *
 * MC-3 le da al cliente un permiso y el cliente escribe **directamente** en el
 * proveedor. Si después no llama a confirmar, quedan tres cosas rotas a la vez:
 *
 *   · el material se queda en `uploading` para siempre —y se le enseña a su
 *     dueño como «llegando», indefinidamente—;
 *   · los bytes están en el proveedor **sin ficha**;
 *   · y MC-5 barre FICHAS, así que esos bytes no los encuentra nadie. Nunca.
 *
 * Se pagan cada mes y no hay forma de llegar a ellos. Eso es lo que cierra esta
 * fase, y solo eso.
 *
 * ── Dos mundos, y quién manda en cada uno ───────────────────────────────────
 *
 *     WEË       material, permiso de subida, ficha de objeto
 *     PROVEEDOR clave y bytes
 *
 * Ninguno es autoridad sobre el otro. Weë no puede afirmar que unos bytes no
 * están —solo que no los ha visto—, y el proveedor no sabe de quién es nada.
 * Reconciliar es cruzarlos **sin que ninguna ausencia se convierta en permiso
 * para borrar**.
 *
 * ── Y lo que esto NO hace, que es la mitad del diseño ───────────────────────
 *
 * **No borra.** Ni bytes, ni fichas, ni materiales. Lo único que produce es una
 * FICHA para los bytes que no la tenían, y con eso el huérfano entra por la
 * puerta de MC-5 —con su edad mínima, sus referencias, su segunda pregunta y su
 * política entera intactas—. No hay un segundo recolector, no hay una segunda
 * política de borrado, y MC-9 no decide jamás que algo se elimine.
 *
 *     MC-9 reconcilia → ficha del huérfano → MC-5 decide y borra
 *
 * Puro como todo el Core: sin red, sin reloj, sin disco, sin azar y sin un solo
 * nombre de proveedor dentro.
 */

/* ── 1 · La política ───────────────────────────────────────────────────────── */

/**
 * CONSERVADORA, Y CADA NÚMERO CON SU MOTIVO.
 *
 * `graciaTrasExpirarMs` no es desconfianza del reloj: un PUT de dos gigas
 * empezado un segundo antes de que caduque el permiso sigue subiendo cuando el
 * permiso ya no vale, porque el proveedor comprueba la firma al EMPEZAR.
 * Expirar en el instante exacto mataría materiales que están llegando.
 *
 * `edadMinimaDeHuerfanoMs` protege el caso contrario: unos bytes recién
 * escritos cuyo `confirmar` viene de camino. Solo después de esa ventana se les
 * crea ficha — y aun entonces quien decide borrarlos es MC-5, que vuelve a
 * esperar SU propia edad mínima encima de esta.
 */
export interface PoliticaDeReconciliacion {
  graciaTrasExpirarMs: number;
  edadMinimaDeHuerfanoMs: number;
  maxPorEjecucion: number;
  /** Cuántas páginas de listado se piden como mucho en una pasada. */
  maxPaginas: number;
  porPagina: number;
}

export const POLITICA_DE_RECONCILIACION: PoliticaDeReconciliacion = Object.freeze({
  graciaTrasExpirarMs: 6 * 60 * 60 * 1000,
  edadMinimaDeHuerfanoMs: 24 * 60 * 60 * 1000,
  maxPorEjecucion: 50,
  maxPaginas: 20,
  porPagina: 500,
});

/* ── 2 · La subida abandonada ──────────────────────────────────────────────── */

export type MotivoDeProteccionDeSubida =
  /* El permiso todavía vale, o su gracia. */
  | 'permiso_vigente'
  /* Nadie ha dicho hasta cuándo valía. Sin autoridad no se expira. */
  | 'sin_caducidad_conocida'
  /* Hay un trabajo vivo sobre esto. */
  | 'operacion_en_curso'
  /* No se supo si hay bytes. No saber protege. */
  | 'fisico_incierto'
  /* La ficha del material no se sostiene. */
  | 'material_invalido'
  /* El material no admite pasar a fallido. */
  | 'transicion_no_permitida';

/**
 * QUÉ HACER CON UN MATERIAL QUE LLEVA DEMASIADO ESPERANDO BYTES.
 *
 *   proteger     todavía no, y por qué
 *   expirar      no llegaron bytes: el material pasa a fallido y ya está
 *   reconciliar  llegaron bytes pero nadie los confirmó: fallido **y** hay que
 *                darles ficha para que MC-5 pueda verlos
 *   ignorar      esto no es un caso de subida abandonada
 *
 * `ignorar` y `proteger` no son lo mismo y separarlos importa: lo primero es
 * «no va conmigo» —ya se confirmó, o el material nunca estuvo subiendo— y lo
 * segundo es «va conmigo y todavía no».
 */
export type VeredictoDeSubidaAbandonada =
  | { accion: 'proteger'; motivo: MotivoDeProteccionDeSubida }
  | { accion: 'expirar' }
  | { accion: 'reconciliar' }
  | { accion: 'ignorar'; motivo: 'ya_confirmado' | 'no_esta_subiendo' };

export interface EntradaDeSubidaAbandonada {
  /** El material ya leído. Un `assetId` que llegue de fuera no prueba nada. */
  material: Asset | undefined;
  /** La cuenta que se le atribuye, resuelta en el servidor. */
  accountId: string;
  /** Su ficha de objeto, si ya existiera. Que exista significa que se confirmó. */
  objeto: MediaObject | undefined;
  /**
   * ¿HAY BYTES AL OTRO LADO? `undefined` cuando no se pudo saber —el listado
   * salió truncado, el proveedor falló, no sabe enumerar—. Y no saberlo
   * protege: es la misma regla que en MC-5 con las referencias.
   */
  hayBytes: boolean | undefined;
  /** Trabajos vivos. Del Job Engine; MC-9 no declara estados de ejecución. */
  operaciones: readonly JobState[];
}

const hayOperacionViva = (operaciones: readonly JobState[]): boolean =>
  (operaciones ?? []).some((e) => !esTrabajoTerminal(e));

/**
 * LA DECISIÓN, PURA. La autoridad es la CADUCIDAD DEL PERMISO, no la edad.
 *
 * Que un material sea viejo no dice nada: el permiso pudo concederse hace un
 * minuto. Y al revés, un material de hace un mes cuyo permiso caducó hace un
 * mes lleva un mes muerto. Por eso lo único que autoriza a expirar es
 * `uploadExpiresAt`, y su ausencia protege en vez de autorizar.
 */
export const decidirUploadAbandonado = (
  entrada: EntradaDeSubidaAbandonada,
  politica: PoliticaDeReconciliacion = POLITICA_DE_RECONCILIACION,
  at: number = 0,
): VeredictoDeSubidaAbandonada => {
  if (!entrada || typeof entrada !== 'object') return { accion: 'proteger', motivo: 'material_invalido' };
  if (!Number.isFinite(at)) return { accion: 'proteger', motivo: 'material_invalido' };

  const m = entrada.material;
  if (!m || typeof m !== 'object') return { accion: 'proteger', motivo: 'material_invalido' };
  if (!materialEsDeLaCuenta(m, entrada.accountId)) return { accion: 'proteger', motivo: 'material_invalido' };

  /* No va conmigo: o ya se completó, o nunca estuvo esperando bytes. */
  if (m.status !== 'uploading') return { accion: 'ignorar', motivo: 'no_esta_subiendo' };

  /*
   * LA CONFIRMACIÓN GANA. Si ya hay ficha de objeto, alguien confirmó —puede
   * que hace un instante, en mitad de esta misma pasada— y entonces esto no es
   * una subida abandonada por mucho que el material todavía no se haya marcado.
   */
  if (entrada.objeto) return { accion: 'ignorar', motivo: 'ya_confirmado' };

  if (hayOperacionViva(entrada.operaciones)) return { accion: 'proteger', motivo: 'operacion_en_curso' };

  /* Sin caducidad declarada no hay autoridad para expirar nada. */
  const expira = typeof m.uploadExpiresAt === 'number' && Number.isFinite(m.uploadExpiresAt)
    ? m.uploadExpiresAt
    : undefined;
  if (expira === undefined) return { accion: 'proteger', motivo: 'sin_caducidad_conocida' };
  if (at < expira + politica.graciaTrasExpirarMs) return { accion: 'proteger', motivo: 'permiso_vigente' };

  /* Y el material tiene que poder llegar a fallido; si no, no se toca. */
  if (!puedePasarA(m.status, 'failed')) return { accion: 'proteger', motivo: 'transicion_no_permitida' };

  if (entrada.hayBytes === undefined) return { accion: 'proteger', motivo: 'fisico_incierto' };
  return entrada.hayBytes ? { accion: 'reconciliar' } : { accion: 'expirar' };
};

/** El motivo que se escribe en el material al expirarlo. Un literal, no una frase. */
export const MOTIVO_DE_SUBIDA_EXPIRADA = 'subida_no_confirmada';

/* ── 3 · Los dos mundos, cruzados ──────────────────────────────────────────── */

/**
 * EN QUÉ SITUACIÓN ESTÁ CADA COSA. Ocho, y las ocho del encargo.
 *
 *   conocido             hay ficha y hay bytes: todo cuadra
 *   fisico_sin_ficha     bytes sin ficha — el agujero que cierra esta fase
 *   ficha_sin_fisico     la ficha dice `guardado` y los bytes no están
 *   subiendo_sin_fisico  material en `uploading` y nada escrito
 *   subiendo_con_fisico  material en `uploading` con bytes: el caso crítico
 *   de_otra_cuenta       la clave no cae en la carpeta de esta cuenta
 *   ficha_invalida       la ficha no se sostiene por sí misma
 *   listado_incompleto   no se vio el prefijo entero
 *
 * `listado_incompleto` NO es una clase de objeto: es la del INFORME. Se declara
 * aquí porque es la que decide si las otras siete significan algo.
 */
export type ClaseDeReconciliacion =
  | 'conocido'
  | 'fisico_sin_ficha'
  | 'ficha_sin_fisico'
  | 'subiendo_sin_fisico'
  | 'subiendo_con_fisico'
  | 'de_otra_cuenta'
  | 'ficha_invalida'
  | 'listado_incompleto';

export interface HallazgoDeReconciliacion {
  clase: ClaseDeReconciliacion;
  objectKey: string;
  accountId: string;
  /** El material al que corresponde, cuando la clave lo dice. */
  assetId?: string;
  objectRef?: string;
  bytes?: number;
  contentType?: string;
  modificadoEn?: number;
  /**
   * ¿Puede ESTE hallazgo entrar en el camino de MC-5? Solo un huérfano físico
   * con edad suficiente, en un listado completo, y de su propia cuenta.
   */
  candidato: boolean;
}

/**
 * LO QUE SE SABE DE UNA CUENTA AL CRUZAR LOS DOS MUNDOS.
 *
 * `completo` es el campo que manda sobre todos los demás. Mientras sea falso,
 * **ninguna ausencia significa nada**: no se vio el prefijo entero, así que que
 * una ficha no tenga su objeto en la lista no prueba que el objeto no exista.
 */
export interface InformeDeReconciliacion {
  accountId: string;
  providerId: string;
  completo: boolean;
  objetosVistos: number;
  fichasVistas: number;
  materialesSubiendo: number;
  porClase: Readonly<Record<string, number>>;
  hallazgos: readonly HallazgoDeReconciliacion[];
  candidatos: number;
  cursor?: string;
  ms: number;
}

const contar = (m: Record<string, number>, k: string): Record<string, number> => ({ ...m, [k]: (m[k] ?? 0) + 1 });

export interface EntradaDeReconciliacion {
  accountId: string;
  providerId: string;
  /** Lo que el proveedor enumeró bajo el prefijo de ESTA cuenta. */
  objetos: readonly ObjetoListado[];
  /** Las fichas que Weë tiene de esta cuenta en ese proveedor. */
  fichas: readonly MediaObject[];
  /** Los materiales de esta cuenta que siguen esperando bytes. */
  subiendo: readonly Asset[];
  /**
   * ¿SE VIO EL PREFIJO ENTERO? Si no, nada de lo que falte prueba nada. Es el
   * campo que impide que un listado a medias autorice un borrado.
   */
  completo: boolean;
}

/**
 * CRUZAR LOS DOS MUNDOS. Pura, y no propone borrar nada.
 *
 * Lo único que marca como `candidato` es un objeto físico sin ficha, de su
 * propia cuenta, con la edad mínima cumplida y visto en un listado COMPLETO.
 * Todo lo demás se clasifica y se cuenta —que ya es más de lo que hoy se puede
 * saber— pero no habilita ninguna acción destructiva.
 */
export const reconciliarCuenta = (
  entrada: EntradaDeReconciliacion,
  politica: PoliticaDeReconciliacion = POLITICA_DE_RECONCILIACION,
  at: number = 0,
): InformeDeReconciliacion | undefined => {
  if (!entrada || typeof entrada !== 'object') return undefined;
  const prefijo = prefijoDeCuenta(entrada.accountId);
  if (!prefijo || typeof entrada.providerId !== 'string' || !entrada.providerId) return undefined;
  if (!Number.isFinite(at)) return undefined;

  const completo = entrada.completo === true;
  const hallazgos: HallazgoDeReconciliacion[] = [];
  let porClase: Record<string, number> = {};

  const anotar = (h: HallazgoDeReconciliacion) => {
    hallazgos.push(h);
    porClase = contar(porClase, h.clase);
  };

  /* Las fichas de esta cuenta, por su clave, para cruzarlas sin recorrer dos veces. */
  const fichasPorClave = new Map<string, MediaObject>();
  for (const f of entrada.fichas ?? []) {
    if (!f || typeof f !== 'object' || typeof f.objectKey !== 'string') continue;
    if (!claveEsDeLaCuenta(f.objectKey, entrada.accountId) || f.accountId !== entrada.accountId) {
      anotar({ clase: 'ficha_invalida', objectKey: '', accountId: entrada.accountId, candidato: false });
      continue;
    }
    fichasPorClave.set(f.objectKey, f);
  }

  const clavesFisicas = new Set<string>();

  for (const o of entrada.objetos ?? []) {
    if (!o || typeof o.objectKey !== 'string' || !o.objectKey) continue;

    /*
     * AISLAMIENTO ANTES QUE NADA. Que el proveedor haya devuelto una clave no
     * prueba de quién es: si no cae dentro de la carpeta de esta cuenta, se
     * marca y NO se toca, ni para clasificarla como huérfana. Una clave ajena
     * que pasara por huérfana sería exactamente cómo se borra lo de otro.
     */
    if (!claveEsDeLaCuenta(o.objectKey, entrada.accountId)) {
      anotar({ clase: 'de_otra_cuenta', objectKey: o.objectKey, accountId: entrada.accountId, candidato: false });
      continue;
    }
    clavesFisicas.add(o.objectKey);

    const ficha = fichasPorClave.get(o.objectKey);
    const base = {
      objectKey: o.objectKey,
      accountId: entrada.accountId,
      ...(o.bytes !== undefined ? { bytes: o.bytes } : {}),
      ...(o.contentType ? { contentType: o.contentType } : {}),
      ...(o.modificadoEn !== undefined ? { modificadoEn: o.modificadoEn } : {}),
    };

    if (ficha) {
      anotar({ ...base, clase: 'conocido', objectRef: ficha.objectRef, assetId: ficha.assetId, candidato: false });
      continue;
    }

    /*
     * Bytes sin ficha. Solo es candidato si el listado se vio entero y si ya
     * tiene edad: unos bytes recién escritos pueden tener su confirmación de
     * camino, y adelantarse a ella sería inventar un huérfano.
     */
    const edadSuficiente = typeof o.modificadoEn === 'number' && Number.isFinite(o.modificadoEn)
      ? at - o.modificadoEn >= politica.edadMinimaDeHuerfanoMs
      : false;
    anotar({
      ...base,
      clase: 'fisico_sin_ficha',
      ...(assetDeLaClave(o.objectKey) ? { assetId: assetDeLaClave(o.objectKey) } : {}),
      candidato: completo && edadSuficiente,
    });
  }

  /* Fichas que dicen tener bytes y no aparecieron. Solo significa algo si se vio todo. */
  for (const [clave, f] of fichasPorClave) {
    if (clavesFisicas.has(clave)) continue;
    if (f.estado !== 'guardado') continue;
    anotar({
      clase: completo ? 'ficha_sin_fisico' : 'listado_incompleto',
      objectKey: clave,
      accountId: entrada.accountId,
      objectRef: f.objectRef,
      assetId: f.assetId,
      candidato: false,
    });
  }

  /* Y los materiales que siguen esperando bytes. */
  let subiendo = 0;
  for (const m of entrada.subiendo ?? []) {
    if (!m || m.status !== 'uploading' || !materialEsDeLaCuenta(m, entrada.accountId)) continue;
    subiendo++;
    const clave = m.storageRef?.objectKey;
    if (typeof clave !== 'string' || !claveEsDeLaCuenta(clave, entrada.accountId)) {
      anotar({ clase: 'ficha_invalida', objectKey: clave ?? '', accountId: entrada.accountId, assetId: m.assetId, candidato: false });
      continue;
    }
    anotar({
      clase: clavesFisicas.has(clave) ? 'subiendo_con_fisico' : 'subiendo_sin_fisico',
      objectKey: clave,
      accountId: entrada.accountId,
      assetId: m.assetId,
      candidato: false,
    });
  }

  return {
    accountId: entrada.accountId,
    providerId: entrada.providerId,
    completo,
    objetosVistos: clavesFisicas.size,
    fichasVistas: fichasPorClave.size,
    materialesSubiendo: subiendo,
    porClase: Object.freeze({ ...porClase }),
    hallazgos: Object.freeze([...hallazgos]),
    candidatos: hallazgos.filter((h) => h.candidato).length,
    ms: 0,
  };
};

/** El material al que pertenece una clave, si la clave lo dice. No se adivina. */
export const assetDeLaClave = (objectKey: unknown): string | undefined => {
  if (typeof objectKey !== 'string') return undefined;
  const m = objectKey.match(/^accounts\/[A-Za-z0-9_-]{1,128}\/assets\/([A-Za-z0-9_-]{1,128})\/[a-z0-9][a-z0-9_-]{0,31}$/);
  return m ? m[1] : undefined;
};

/** La pieza a la que pertenece una clave. Misma regla: se lee la forma entera. */
export const piezaDeLaClave = (objectKey: unknown): string | undefined => {
  if (typeof objectKey !== 'string') return undefined;
  const m = objectKey.match(/^accounts\/[A-Za-z0-9_-]{1,128}\/assets\/[A-Za-z0-9_-]{1,128}\/([a-z0-9][a-z0-9_-]{0,31})$/);
  return m ? m[1] : undefined;
};

/**
 * ¿PUEDE ESTE HALLAZGO CONVERTIRSE EN FICHA? La última puerta antes de escribir.
 *
 * Se comprueba otra vez todo lo que ya comprobó la clasificación, y a propósito:
 * es lo único que separa «lo clasifiqué» de «voy a escribir una ficha que hará
 * que MC-5 mire estos bytes». Repetirlo cuesta nada y cierra el hueco por el que
 * un cambio futuro en la clasificación se convertiría en un borrado.
 */
export const puedeRecuperarFicha = (h: HallazgoDeReconciliacion | undefined): boolean =>
  !!h
  && h.clase === 'fisico_sin_ficha'
  && h.candidato === true
  && claveEsDeLaCuenta(h.objectKey, h.accountId)
  && cuentaDeLaClave(h.objectKey) === h.accountId
  && !!assetDeLaClave(h.objectKey)
  && !!piezaDeLaClave(h.objectKey);

/* ── 4 · H5/H2 · EL ÍNDICE DE REFERENCIAS, CRUZADO CON LAS FICHAS ────────────── */

/**
 * LAS CLASES DEL ÍNDICE (§7.10 del diseño H5/H2). Nueve, y la de otra cuenta es
 * la misma idea que `de_otra_cuenta` de arriba: lo ajeno se protege y se avisa,
 * no se toca.
 *
 *   fila_ausente         ficha viva con un objeto y sin fila viva para él
 *   fila_huerfana        fila viva cuya ficha está retirada, no existe o ya no usa el objeto
 *   fila_duplicada       dos filas vivas para la misma pareja (material, pieza)
 *   objeto_huerfano      `guardado`, sin filas vivas, con cobertura vigente y con edad
 *   ficha_sin_bytes      un objeto con uso vivo cuyos bytes no están
 *   estado_imposible     un objeto que se va (`borrando`, `borrado`) o espera (`candidato`) con un uso vivo
 *   generacion_distinta  los bytes de la clave no son los que se registraron
 *   de_otra_cuenta       una fila, una ficha o un registro de otra cuenta sobre este objeto
 *   cobertura_pendiente  un objeto cuya cobertura no está completa o ya no vale
 *
 * Y lo que NO hace, otra vez: no borra. Las reparaciones son filas y marcas. El
 * único borrado posible sigue siendo el de MC-5, con el cerrojo.
 */
export type ClaseDelIndice =
  | 'fila_ausente'
  | 'fila_huerfana'
  | 'fila_duplicada'
  | 'objeto_huerfano'
  | 'ficha_sin_bytes'
  | 'estado_imposible'
  | 'generacion_distinta'
  | 'de_otra_cuenta'
  | 'cobertura_pendiente';

export const CLASES_DEL_INDICE: readonly ClaseDelIndice[] = Object.freeze([
  'fila_ausente', 'fila_huerfana', 'fila_duplicada', 'objeto_huerfano', 'ficha_sin_bytes',
  'estado_imposible', 'generacion_distinta', 'de_otra_cuenta', 'cobertura_pendiente',
] as const);

/**
 * QUÉ SE REPARA. Ninguna de estas borra nada:
 *
 *   crear_fila    la fila viva que falta (y el registro del objeto si no existía)
 *   apagar_fila   `viva: false`; si el objeto se queda sin filas vivas, a `candidato` (D-B)
 *   a_candidato   un huérfano verificado pasa a `candidato`: decide MC-5
 *   rescatar      un `candidato` con uso vivo vuelve a `guardado`
 *   marcar        una marca en el registro que detiene cualquier decisión de borrado
 *   marcar_ficha  la ficha queda marcada `datos_incompletos`: dice tener un objeto que no está
 *   ninguna       se informa y no se escribe
 */
export type ReparacionDelIndice = 'crear_fila' | 'apagar_fila' | 'a_candidato' | 'rescatar' | 'marcar' | 'marcar_ficha' | 'ninguna';

/** Lo que se sabe de UN objeto de la cuenta al cruzar. Todo leído antes; aquí no se consulta nada. */
export interface ObjetoDelIndiceParaReconciliar {
  objectRef: string;
  registro: MediaObject | undefined;
  /** TODAS las filas del objeto, vivas y apagadas. */
  filas: readonly FilaDeReferencia[];
  /** `false` si la lectura de filas se cortó o falló: entonces no se sabe todo, y no se verifica cobertura. */
  filasCompletas: boolean;
  /** Lo que dijo el almacén. `undefined`: no se miró o no se pudo. */
  fisico: { existe: boolean; generacion?: string } | undefined;
  /** Fichas VIVAS de OTRAS cuentas con esta misma clave. `undefined`: no se pudo saber. */
  referenciasAjenas: number | undefined;
}

export interface EntradaDeReconciliacionDelIndice {
  accountId: string;
  /** Las filas que exigen TODAS las fichas de la cuenta (`filasEsperadasDeLaFicha`). */
  esperadas: readonly FilaEsperada[];
  /** El estado de cada ficha de la cuenta, por su id. */
  estadoDeFichas: Readonly<Record<string, 'viva' | 'retirada'>>;
  objetos: readonly ObjetoDelIndiceParaReconciliar[];
  /** ¿Se leyeron TODAS las fichas, todos los registros y todas las filas? Si no, nada se da por verificado. */
  completo: boolean;
  marcaDeCobertura: number | undefined;
  /** Edad mínima de un huérfano antes de proponerlo como candidato. */
  graciaDeHuerfanoMs: number;
}

export interface HallazgoDelIndice {
  clase: ClaseDelIndice;
  objectRef: string;
  reparacion: ReparacionDelIndice;
  assetId?: string;
  refId?: string;
  marca?: MarcaDelObjeto;
}

export interface InformeDelIndice {
  accountId: string;
  completo: boolean;
  objetosVistos: number;
  filasEsperadas: number;
  porClase: Readonly<Record<string, number>>;
  hallazgos: readonly HallazgoDelIndice[];
  /**
   * Los objetos cuya cobertura puede darse por completa DESPUÉS de aplicar las
   * reparaciones de esta pasada. Quien la marca lo vuelve a comprobar dentro de
   * su transacción: esto dice que se puede intentar, no que ya esté.
   */
  coberturaVerificable: readonly string[];
}

/**
 * CRUZAR EL ÍNDICE CON LAS FICHAS DE UNA CUENTA. Pura, y no propone borrar nada.
 *
 * Cada objeto se clasifica con lo que se leyó. Lo ajeno se informa y no se
 * toca. Lo que no se pudo saber —filas cortadas, una pasada incompleta, una
 * consulta de otras cuentas que falló— no se da nunca por verificado: el objeto
 * queda sin cobertura y, por tanto, protegido.
 */
export const reconciliarIndiceDeCuenta = (
  entrada: EntradaDeReconciliacionDelIndice,
  at: number,
): InformeDelIndice | undefined => {
  if (!entrada || typeof entrada !== 'object' || !Number.isFinite(at)) return undefined;
  const cuenta = entrada.accountId;
  if (typeof cuenta !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(cuenta)) return undefined;

  const hallazgos: HallazgoDelIndice[] = [];
  let porClase: Record<string, number> = {};
  const anotar = (h: HallazgoDelIndice) => {
    hallazgos.push(h);
    porClase = contar(porClase, h.clase);
  };

  const esperadasPorObjeto = new Map<string, FilaEsperada[]>();
  for (const e of entrada.esperadas ?? []) {
    if (!e || typeof e.objectRef !== 'string' || e.ownerAccountId !== cuenta) continue;
    esperadasPorObjeto.set(e.objectRef, [...(esperadasPorObjeto.get(e.objectRef) ?? []), e]);
  }
  const objetos = new Map<string, ObjetoDelIndiceParaReconciliar>();
  for (const o of entrada.objetos ?? []) if (o && typeof o.objectRef === 'string') objetos.set(o.objectRef, o);
  /* Un objeto que una ficha exige y del que no llegó nada: no se sabe nada de él, y eso no es «no tiene filas». */
  for (const ref of esperadasPorObjeto.keys()) {
    if (!objetos.has(ref)) objetos.set(ref, { objectRef: ref, registro: undefined, filas: [], filasCompletas: false, fisico: undefined, referenciasAjenas: undefined });
  }

  const verificables: string[] = [];
  const estado = entrada.estadoDeFichas ?? {};

  for (const [ref, o] of objetos) {
    const reg = o.registro;
    const esperadas = esperadasPorObjeto.get(ref) ?? [];
    const esperadasVivas = esperadas.filter((e) => e.viva);
    let bloquea = entrada.completo !== true || o.filasCompletas !== true;

    /* LO AJENO PRIMERO: un registro que no es de esta cuenta no se toca, ni para repararlo. */
    if (reg && !registroEsDeLaCuenta(reg, cuenta)) {
      anotar({ clase: 'de_otra_cuenta', objectRef: ref, reparacion: 'ninguna' });
      continue;
    }

    const filas = Array.isArray(o.filas) ? o.filas : [];
    const validas = filas.filter((f) => filaDeReferenciaValida(f) && f.objectRef === ref);
    if (validas.length !== filas.length) {
      /* Una fila que no se entiende no se repara sola: se informa y el objeto no se verifica. */
      anotar({ clase: 'fila_huerfana', objectRef: ref, reparacion: 'ninguna' });
      bloquea = true;
    }
    const ajenas = validas.filter((f) => f.ownerAccountId !== cuenta);
    if (ajenas.length > 0 || (typeof o.referenciasAjenas === 'number' && o.referenciasAjenas > 0)) {
      anotar({ clase: 'de_otra_cuenta', objectRef: ref, reparacion: 'marcar', marca: 'de_otra_cuenta' });
      bloquea = true;
    }
    if (typeof o.referenciasAjenas !== 'number') bloquea = true;
    const vivas = validas.filter((f) => f.ownerAccountId === cuenta && f.viva);
    const vivaPorRefId = new Map(vivas.map((f) => [f.refId, f]));
    /*
     * USO AJENO (A-2): una fila viva de OTRA cuenta sobre el objeto, o una ficha viva de otra cuenta sobre su clave, es un
     * uso. Un objeto con uso ajeno nunca es huérfano de esta cuenta, aunque esta no tenga ninguna fila ni ficha suya.
     */
    const usoAjeno = ajenas.some((f) => f.viva) || (typeof o.referenciasAjenas === 'number' && o.referenciasAjenas > 0);
    const usoVivo = vivas.length > 0 || esperadasVivas.length > 0 || usoAjeno;

    /* fila_ausente */
    for (const e of esperadasVivas) {
      if (vivaPorRefId.has(e.refId)) continue;
      const sinBytes = o.fisico?.existe === false;
      anotar({ clase: 'fila_ausente', objectRef: ref, assetId: e.assetId, refId: e.refId, reparacion: sinBytes ? 'marcar_ficha' : 'crear_fila' });
    }

    /* fila_huerfana: viva, y ninguna ficha viva de la cuenta la exige. Solo se concluye si se vio todo. */
    const exigidas = new Set(esperadasVivas.map((e) => e.refId));
    for (const f of vivas) {
      if (exigidas.has(f.refId)) continue;
      if (entrada.completo !== true) { bloquea = true; continue; }
      anotar({ clase: 'fila_huerfana', objectRef: ref, assetId: f.assetId, refId: f.refId, reparacion: 'apagar_fila' });
      if (estado[f.assetId] === 'viva') bloquea = true;
    }

    /* fila_duplicada: la misma pareja (material, pieza) con dos identidades vivas. */
    const porPareja = new Map<string, Set<string>>();
    for (const f of vivas) {
      const k = `${f.assetId}\n${f.pieza}`;
      porPareja.set(k, new Set([...(porPareja.get(k) ?? []), f.refId]));
    }
    for (const [k, ids] of porPareja) {
      if (ids.size < 2) continue;
      anotar({ clase: 'fila_duplicada', objectRef: ref, assetId: k.split('\n')[0], reparacion: 'marcar', marca: 'fila_duplicada' });
      bloquea = true;
    }

    /* estado_imposible: un uso vivo sobre un objeto que se va o que espera. */
    if (reg && usoVivo && (reg.estado === 'borrando' || reg.estado === 'borrado')) {
      anotar({ clase: 'estado_imposible', objectRef: ref, reparacion: 'marcar', marca: 'estado_imposible' });
      bloquea = true;
    } else if (reg && usoVivo && reg.estado === 'candidato') {
      const mismo = o.fisico?.existe === true && (reg.generacion === undefined || o.fisico.generacion === reg.generacion);
      if (mismo) anotar({ clase: 'estado_imposible', objectRef: ref, reparacion: 'rescatar' });
      else {
        anotar({ clase: 'estado_imposible', objectRef: ref, reparacion: 'marcar', marca: 'estado_imposible' });
        bloquea = true;
      }
    }

    /* ficha_sin_bytes */
    if (usoVivo && o.fisico?.existe === false) {
      anotar({ clase: 'ficha_sin_bytes', objectRef: ref, reparacion: 'marcar', marca: 'ficha_sin_bytes' });
    }

    /* generacion_distinta */
    if (reg && o.fisico?.existe === true && typeof o.fisico.generacion === 'string' && typeof reg.generacion === 'string'
      && o.fisico.generacion !== reg.generacion) {
      anotar({ clase: 'generacion_distinta', objectRef: ref, reparacion: 'marcar', marca: 'generacion_distinta' });
    }

    /* objeto_huerfano: sin uso vivo, con cobertura que vale y con la edad cumplida. Lo decide MC-5, no esto. */
    const edadCumplida = reg !== undefined && Number.isFinite(reg.createdAt) && at - reg.createdAt >= entrada.graciaDeHuerfanoMs;
    /* Huérfano solo si se ha visto TODO el uso, propio y ajeno: un uso ajeno desconocido no es ausencia de uso (A-2). */
    if (reg && reg.estado === 'guardado' && !usoVivo && !usoAjeno && typeof o.referenciasAjenas === 'number'
      && entrada.completo === true && o.filasCompletas === true && coberturaVigente(reg, entrada.marcaDeCobertura) && edadCumplida) {
      anotar({ clase: 'objeto_huerfano', objectRef: ref, reparacion: 'a_candidato' });
    }

    /* cobertura_pendiente */
    if (!reg || !coberturaVigente(reg, entrada.marcaDeCobertura)) {
      anotar({ clase: 'cobertura_pendiente', objectRef: ref, reparacion: 'ninguna' });
    }

    const hayMarca = typeof entrada.marcaDeCobertura === 'number' && Number.isFinite(entrada.marcaDeCobertura);
    if (!bloquea && hayMarca && (reg !== undefined || esperadasVivas.length > 0)) verificables.push(ref);
  }

  return {
    accountId: cuenta,
    completo: entrada.completo === true,
    objetosVistos: objetos.size,
    filasEsperadas: (entrada.esperadas ?? []).length,
    porClase: Object.freeze({ ...porClase }),
    hallazgos: Object.freeze([...hallazgos]),
    coberturaVerificable: Object.freeze([...verificables].sort()),
  };
};
