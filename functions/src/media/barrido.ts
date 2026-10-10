import { randomUUID } from 'crypto';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  EstadoDeConsumidores,
  InformeDeRecoleccion,
  JobState,
  MediaObject,
  POLITICA_DE_RECOLECCION,
  POLITICA_DEL_BARRIDO_DEL_INDICE,
  PoliticaDeBorradoFisico,
  PuertoDeAlmacenamiento,
  informeVacio,
} from '../core';
import { PROVEEDOR_WEE, entraEnElIndice } from '../content';
import {
  DepsDelIndice,
  cerrarBorrado,
  consumidoresDeProduccion,
  devolverBorrado,
  huellaDelIndice,
  leerFlagDelAlmacen,
  objetosParaElBarrido,
  operacionesDeProduccion,
  puertoDelStorageDeWee,
  reclamarParaBorrar,
  referenciasParaElBarrido,
} from '../content/indice';
import { DepsDeRecoleccion, recogerObjetosHuerfanos } from './recoleccion';

/**
 * H5/H2 · MC-5 CONECTADO: EL BARRIDO DEL ÍNDICE, COMPUESTO PARA PRODUCCIÓN.
 *
 * ── Qué es esto ─────────────────────────────────────────────────────────────
 *
 * Las dependencias de verdad del barrido de MC-5 (`recoleccion.ts`) sobre el
 * índice de referencias, y la tarea programada que lo pasaría. El barrido es el
 * de siempre —una decisión, una política—; aquí solo se le dan los hechos:
 *
 *   objetos       los del cerrojo (`borrando` y `candidato`), por lotes y con cursor
 *   referencias   las filas vivas del índice, o «no se sabe» si la cobertura no vale
 *   operaciones   «no se sabe»: no hay una fuente clara de trabajos por objeto
 *   almacenes     el Storage de Weë, que sabe borrar con generación
 *   reclamar      T2, con la decisión de borrado físico dentro de su transacción
 *   cerrar        T3, solo con la concesión propia
 *   devolver      de vuelta a `candidato`: 412, fallo del proveedor o sin precondición
 *
 * ── Lo que NO está, a propósito ─────────────────────────────────────────────
 *
 * NO se exporta desde `functions/src/index.ts`: no hay tarea programada en
 * ningún entorno. Activarla es una autorización del dueño (A-11 del diseño), y
 * primero en modo de solo decisión. Las claves `users/` no se barren (D-C): la
 * comprobación de aislamiento de MC-5 las protege como `fuera_de_su_cuenta`. Y
 * con los consumidores sin integrar (D-G, D-H), la decisión protege todo: hoy,
 * aunque corriera, no borraría nada.
 */

/** Lotes por pasada. Cada lote es el de MC-5 (cien objetos); con esto, una pasada nunca recorre sin fin. */
export const LOTES_POR_PASADA = 50;

export interface OpcionesDelBarridoDeActivos {
  db?: Firestore;
  almacenes?: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  consumidores?: (objeto: MediaObject, assetIds: readonly string[]) => Promise<EstadoDeConsumidores>;
  operaciones?: (objeto: MediaObject) => Promise<readonly JobState[] | undefined>;
  ahora?: () => number;
  sortear?: () => string;
  /** D-I · la gracia de los candidatos. Sin esto, la de la flag (siete días por defecto). */
  politica?: PoliticaDeBorradoFisico;
}

/** Las dependencias del índice que usa el barrido. Las de producción, salvo las que se inyecten (pruebas). */
export const depsDelIndiceParaElBarrido = (opciones: OpcionesDelBarridoDeActivos = {}): DepsDelIndice => ({
  db: opciones.db ?? getFirestore(),
  huella: huellaDelIndice,
  indexable: entraEnElIndice,
  almacenes: opciones.almacenes ?? { [PROVEEDOR_WEE]: puertoDelStorageDeWee(PROVEEDOR_WEE) },
  consumidores: opciones.consumidores ?? consumidoresDeProduccion,
  operaciones: opciones.operaciones ?? operacionesDeProduccion,
  ahora: opciones.ahora ?? Date.now,
  sortear: opciones.sortear ?? (() => randomUUID().replace(/-/g, '')),
});

/** De las dependencias del índice a las de MC-5. El barrido no sabe que hay un índice: sabe reclamar, cerrar y devolver. */
export const depsDelBarridoDeActivos = (indice: DepsDelIndice, politica: PoliticaDeBorradoFisico): DepsDeRecoleccion => ({
  objetos: (cursor, limite) => objetosParaElBarrido(indice, cursor, limite),
  referencias: (objeto) => referenciasParaElBarrido(indice, objeto),
  operaciones: (objeto) => indice.operaciones(objeto),
  almacenes: indice.almacenes,
  /* Con el cerrojo, el cierre lo hace `cerrar` con la concesión propia; un cierre sin concesión no existe. */
  marcarBorrado: async () => false,
  /* Con el cerrojo, el intento lo anota `devolver`, dentro de su transacción. */
  anotarIntento: async () => undefined,
  ahora: indice.ahora,
  politica: politica.recoleccion,
  reclamar: async (objeto) => {
    const r = await reclamarParaBorrar(indice, objeto.objectRef, objeto.accountId, politica);
    return r.reclamado
      ? { ok: true, concesionId: r.concesionId, generacion: r.generacion, esperado: r.esperado }
      : { ok: false, motivo: r.motivo };
  },
  cerrar: (objeto, concesionId, esperado) => cerrarBorrado(indice, objeto.objectRef, objeto.accountId, concesionId, esperado),
  devolver: (objeto, concesionId, esperado, motivo) =>
    devolverBorrado(indice, objeto.objectRef, objeto.accountId, concesionId, esperado, motivo, motivo === 'error_transitorio'),
});

/** Solo metadatos: contadores y motivos. Ni una clave de objeto, ni una dirección, ni de quién es nada. */
export const anotarBarridoDeActivos = (informe: InformeDeRecoleccion): void => {
  console.log(
    `WEË ACTIVOS · barrido=${informe.runId} ${informe.ms} ms · mirados=${informe.inspeccionados}`
    + ` candidatos=${informe.candidatos} borrados=${informe.borrados} ya_no_estaban=${informe.yaNoEstaban}`
    + ` protegidos=${informe.protegidos} errores=${informe.errores} sin_cerrar=${informe.fichasNoCerradas}`
    + ` motivos=${JSON.stringify(informe.porMotivo)}`,
  );
};

/**
 * UNA PASADA ENTERA: lote tras lote hasta que no quede cursor o se acaben los
 * lotes de la pasada. Con la flag cerrada no mira nada: el barrido del índice
 * solo existe para las cuentas que van por el camino nuevo, y cada reclamación
 * vuelve a comprobar la flag dentro de su transacción.
 */
export const pasarBarridoDeActivos = async (opciones: OpcionesDelBarridoDeActivos = {}): Promise<InformeDeRecoleccion[]> => {
  const indice = depsDelIndiceParaElBarrido(opciones);
  const flag = await leerFlagDelAlmacen(indice.db);
  const runId = `activos_${indice.sortear()}`;
  if (!flag.config.habilitado) {
    const vacio = { ...informeVacio(runId), porMotivo: Object.freeze({ flag_cerrada: 1 }) };
    anotarBarridoDeActivos(vacio);
    return [vacio];
  }
  const politica = opciones.politica ?? { ...POLITICA_DEL_BARRIDO_DEL_INDICE, recoleccion: POLITICA_DE_RECOLECCION, graciaDeCandidatoMs: flag.config.graciaDeCandidatoMs };
  const deps = depsDelBarridoDeActivos(indice, politica);
  const informes: InformeDeRecoleccion[] = [];
  let cursor: string | undefined;
  for (let lote = 0; lote < LOTES_POR_PASADA; lote++) {
    const informe = await recogerObjetosHuerfanos(deps, `${runId}_${lote}`, cursor);
    informes.push(informe);
    anotarBarridoDeActivos(informe);
    if (!informe.cursor) break;
    cursor = informe.cursor;
  }
  return informes;
};

/**
 * LA TAREA PROGRAMADA, PREPARADA Y SIN EXPORTAR. `crearBarridoDeActivos` deja
 * componerla con otras dependencias —las pruebas la llaman directamente con el
 * emulador y un almacén falso que registra las precondiciones—; la de
 * producción usa las de verdad. Una instancia y una petición a la vez, como el
 * barrido de la liquidación.
 */
export const crearBarridoDeActivos = (fabricar: () => OpcionesDelBarridoDeActivos = () => ({})) => onSchedule(
  {
    schedule: 'every 60 minutes',
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '256MiB',
    maxInstances: 1,
    concurrency: 1,
  },
  async () => {
    await pasarBarridoDeActivos(fabricar());
  },
);

/** NO exportada desde `functions/src/index.ts`: exportarla es activar la tarea (A-11). */
export const barridoDeActivos = crearBarridoDeActivos();
