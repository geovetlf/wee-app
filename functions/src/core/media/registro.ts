import { CapacidadDeAlmacen } from './puerto';

/**
 * WEE MEDIA — EL REGISTRO DE PROVEEDORES DE ALMACENAMIENTO.
 *
 * Hermano del registro de proveedores de IA, y deliberadamente **mucho más
 * tonto**. Aquel tiene que elegir entre candidatos por calidad, coste, latencia
 * y cadena de respaldo; este no elige nada: dice quién está declarado, qué sabe
 * hacer y si está encendido. Convertirlo en un segundo Router sería construir
 * la pieza más cara de Weë dos veces para guardar archivos.
 *
 * ── Ni una credencial dentro ────────────────────────────────────────────────
 *
 * Igual que el de IA: se guarda el NOMBRE de la variable donde vive la clave,
 * nunca la clave. Un registro es un catálogo, y un catálogo no es un llavero.
 *
 * Todo aquí es puro: sin red, sin Firestore, sin reloj.
 */

/** En qué estado está una integración. No se pone a mano por optimismo. */
export type EstadoDeProveedorDeMedios =
  /* Verificado contra su documentación oficial y con una llamada real hecha. */
  | 'READY'
  /* Implementado y comprobado en pruebas, sin llamada real todavía. */
  | 'UNVERIFIED'
  /* Apagado a propósito. */
  | 'DISABLED';

/**
 * LO QUE EL REGISTRO SABE DE UN PROVEEDOR. Sin una sola credencial.
 */
export interface DescriptorDeProveedorDeMedios<C extends string = CapacidadDeAlmacen> {
  /** La identidad canónica, y la MISMA que aparece en `StorageRef.provider` y en las fichas. */
  id: string;
  name: string;
  estado: EstadoDeProveedorDeMedios;
  /** Lo que sabe hacer de verdad. Lo que no esté aquí, no se le pide. */
  capacidades: readonly C[];
  /** Regiones, cuando el proveedor las distingue. R2 usa `auto`. */
  regiones?: readonly string[];
  /** Nombres de las variables con sus credenciales. EL NOMBRE, nunca el valor. */
  credencialesEnv?: readonly string[];
  /** Documentación oficial en la que se basa el adaptador. */
  docsUrl?: string;
  /** Límites publicados por el proveedor. Solo lo documentado, nunca lo supuesto. */
  limites?: {
    maxBytesPorObjeto?: number;
    maxBytesDeUnaSubida?: number;
    maxLargoDeClave?: number;
    maxBytesDeMetadatos?: number;
  };
}

/** La misma forma que exige `StorageRef.provider`: si no encaja, no puede escribirse en un material. */
export const FORMA_DE_ID_DE_PROVEEDOR = /^[a-z][a-z0-9_-]{1,31}$/;

export type FalloDeRegistro =
  | 'id_invalido'
  | 'duplicado'
  | 'sin_capacidades'
  | 'capacidad_repetida';

export type AltaEnElRegistro =
  | { ok: true }
  | { ok: false; motivo: FalloDeRegistro };

export interface RegistroDeProveedoresDeMedios<C extends string = CapacidadDeAlmacen> {
  /** Todos los declarados, encendidos o no. */
  todos(): readonly DescriptorDeProveedorDeMedios<C>[];
  /** Uno por su identidad. `undefined` si no está declarado. */
  buscar(providerId: string): DescriptorDeProveedorDeMedios<C> | undefined;
  /**
   * ¿Puede este proveedor hacer esto AHORA? Un proveedor apagado no puede,
   * aunque lo declare: es la única pregunta que hace falta responder antes de
   * pedirle nada, y se contesta sin red.
   */
  puede(providerId: string, capacidad: C): boolean;
  /** Los que están encendidos. */
  disponibles(): readonly DescriptorDeProveedorDeMedios<C>[];
}

/**
 * CONSTRUIR EL REGISTRO. Rechaza lo que no puede convivir —dos proveedores con
 * el mismo nombre, un identificador que no cabría en un `StorageRef`, uno sin
 * capacidades— y devuelve lo aceptado junto a lo rechazado con su motivo.
 *
 * No lanza: un catálogo mal escrito es un dato, no una excepción, y quien lo
 * compone tiene que poder verlo entero antes de decidir.
 */
export const crearRegistroDeMedios = <C extends string = CapacidadDeAlmacen>(
  descriptores: readonly DescriptorDeProveedorDeMedios<C>[],
): { registro: RegistroDeProveedoresDeMedios<C>; rechazados: readonly { id: string; motivo: FalloDeRegistro }[] } => {
  const aceptados = new Map<string, DescriptorDeProveedorDeMedios<C>>();
  const rechazados: { id: string; motivo: FalloDeRegistro }[] = [];

  for (const d of descriptores ?? []) {
    const id = typeof d?.id === 'string' ? d.id : '';
    if (!FORMA_DE_ID_DE_PROVEEDOR.test(id)) { rechazados.push({ id: id || '(sin id)', motivo: 'id_invalido' }); continue; }
    if (aceptados.has(id)) { rechazados.push({ id, motivo: 'duplicado' }); continue; }
    const caps = d.capacidades ?? [];
    if (!caps.length) { rechazados.push({ id, motivo: 'sin_capacidades' }); continue; }
    if (new Set(caps).size !== caps.length) { rechazados.push({ id, motivo: 'capacidad_repetida' }); continue; }
    aceptados.set(id, Object.freeze({ ...d, capacidades: Object.freeze([...caps]) }));
  }

  const lista = Object.freeze([...aceptados.values()]);
  return {
    registro: Object.freeze({
      todos: () => lista,
      buscar: (providerId: string) => aceptados.get(providerId),
      puede: (providerId: string, capacidad: C) => {
        const d = aceptados.get(providerId);
        return !!d && d.estado !== 'DISABLED' && d.capacidades.includes(capacidad);
      },
      disponibles: () => lista.filter((d) => d.estado !== 'DISABLED'),
    }),
    rechazados: Object.freeze(rechazados),
  };
};

/**
 * ELEGIR CON QUÉ SE GUARDA. Y sí, es así de simple a propósito.
 *
 * Hoy hay un proveedor configurado y se usa ese. Cuando haya varios, la
 * elección podrá mirar región, coste, latencia, salud o política — pero eso es
 * de una fase posterior, y adelantarlo ahora significaría escribir un router
 * entero para decidir entre un candidato.
 *
 * Lo que sí está resuelto desde hoy es lo que importa: quien llama **no elige**
 * y **no conoce** al proveedor. Pide guardar; esto dice con cuál.
 */
export const proveedorParaGuardar = (
  registro: RegistroDeProveedoresDeMedios,
  configurado: string | undefined,
): DescriptorDeProveedorDeMedios | undefined => {
  if (!configurado) return undefined;
  return registro.puede(configurado, 'object.put') ? registro.buscar(configurado) : undefined;
};
