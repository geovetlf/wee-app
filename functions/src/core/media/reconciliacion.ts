import { Asset, materialEsDeLaCuenta, puedePasarA } from '../content/asset';
import { JobState, esTrabajoTerminal } from '../job';
import { MediaObject, claveEsDeLaCuenta, cuentaDeLaClave, prefijoDeCuenta } from './objeto';
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
