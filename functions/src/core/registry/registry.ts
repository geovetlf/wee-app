import { Modality } from '../capability';
import { CatalogEntry, CoreCapabilityId } from './capabilities';
import {
  CapabilityImplementation,
  ModelDescriptor,
  RegisteredAdapter,
  RegisteredProvider,
  RegistryData,
} from './types';

/**
 * WEE CORE — EL REGISTRO.
 *
 * ── Qué es y qué no ─────────────────────────────────────────────────────────
 *
 * Una función pura que recibe datos y devuelve algo a lo que preguntar. No lee
 * Firestore, no llama a nadie y no guarda estado de módulo. Quien quiera
 * alimentarlo desde configuración remota implementa el mismo contrato y nadie
 * más se entera — que es exactamente lo que pide poder crecer sin romper.
 *
 * ── Por qué índices y no `filter` ───────────────────────────────────────────
 *
 * Porque esto se va a consultar en el camino de cada petición, y con un par de
 * cientos de modelos un `find` lineal por lookup convierte cada request en un
 * recorrido completo del catálogo. Los índices se construyen UNA vez al crear
 * el registro; después todo es O(1) salvo lo que devuelve listas.
 *
 * ── La pregunta que de verdad importa ───────────────────────────────────────
 *
 * `findImplementations(capability)`. Es la que convierte «quiero una imagen» en
 * «esto puede dártela», y la que hace innecesario cualquier
 * `if (workplace === 'design')`. El Router de la Fase 7 se construye encima de
 * ella; hoy solo hace falta que responda bien y rápido.
 */

export interface Registry {
  getCapability(id: CoreCapabilityId): CatalogEntry | undefined;
  listCapabilities(): readonly CatalogEntry[];

  getModel(id: string): ModelDescriptor | undefined;
  listModels(): readonly ModelDescriptor[];

  getProvider(id: string): RegisteredProvider | undefined;
  listProviders(): readonly RegisteredProvider[];

  getAdapter(providerId: string): RegisteredAdapter | undefined;
  listAdapters(): readonly RegisteredAdapter[];

  getProviderModels(providerId: string): readonly ModelDescriptor[];

  /** Todo lo que declara cubrir esta capacidad, usable o no. */
  getCapabilityImplementations(capability: CoreCapabilityId): readonly CapabilityImplementation[];
  /** Solo lo que se puede pedir HOY. */
  findImplementations(capability: CoreCapabilityId): readonly CapabilityImplementation[];

  /** Capacidades con al menos una implementación usable. */
  capabilitiesDisponibles(): readonly CoreCapabilityId[];
  /** Modelos que aceptan una modalidad de entrada. */
  modelosQueAceptan(modalidad: Modality): readonly ModelDescriptor[];
}

/**
 * ¿Se puede pedir esto HOY?
 *
 * Tres condiciones, y se devuelve el PRIMER motivo por el que no. Devolver
 * solo `false` obligaría a quien pregunta a adivinar, y de ahí salen los
 * mensajes de «no disponible» que no ayudan a nadie.
 */
const evaluarUso = (
  model: ModelDescriptor,
  provider: RegisteredProvider,
): { usable: boolean; reason?: string } => {
  if (provider.status !== 'READY' && provider.status !== 'BETA') {
    return { usable: false, reason: `el proveedor está en ${provider.status}` };
  }
  if (model.status !== 'READY' && model.status !== 'BETA') {
    return { usable: false, reason: `el modelo está en ${model.status}` };
  }
  if (provider.health && provider.health.state === 'UNAVAILABLE') {
    return { usable: false, reason: provider.health.reason || 'el proveedor está caído' };
  }
  if (!provider.adapterId) {
    return { usable: false, reason: 'no hay adaptador que le hable' };
  }
  return { usable: true };
};

/**
 * Construye el registro a partir de los datos.
 *
 * No valida: para eso está `validarRegistro`, que se ejecuta aparte y devuelve
 * TODOS los problemas de golpe. Un constructor que lanza a la primera obliga a
 * arreglar los errores de uno en uno.
 */
export const crearRegistro = (datos: RegistryData): Registry => {
  const capacidades = new Map<CoreCapabilityId, CatalogEntry>();
  for (const c of datos.capabilities) capacidades.set(c.id, c);

  const modelos = new Map<string, ModelDescriptor>();
  const modelosPorProveedor = new Map<string, ModelDescriptor[]>();
  const modelosPorCapacidad = new Map<CoreCapabilityId, ModelDescriptor[]>();
  for (const m of datos.models) {
    modelos.set(m.id, m);
    const delProveedor = modelosPorProveedor.get(m.providerId) ?? [];
    delProveedor.push(m);
    modelosPorProveedor.set(m.providerId, delProveedor);
    for (const cap of m.capabilities) {
      const deLaCapacidad = modelosPorCapacidad.get(cap) ?? [];
      deLaCapacidad.push(m);
      modelosPorCapacidad.set(cap, deLaCapacidad);
    }
  }

  const proveedores = new Map<string, RegisteredProvider>();
  for (const p of datos.providers) proveedores.set(p.id, p);

  const adaptadores = new Map<string, RegisteredAdapter>();
  const adaptadorPorProveedor = new Map<string, RegisteredAdapter>();
  for (const a of datos.adapters) {
    adaptadores.set(a.id, a);
    adaptadorPorProveedor.set(a.providerId, a);
  }

  const implementacionesDe = (capability: CoreCapabilityId): CapabilityImplementation[] =>
    (modelosPorCapacidad.get(capability) ?? []).flatMap((model) => {
      const provider = proveedores.get(model.providerId);
      /* Un modelo cuyo proveedor no existe no es una implementación: es un
       * error de datos, y lo caza `validarRegistro`. Aquí se omite. */
      if (!provider) return [];
      const { usable, reason } = evaluarUso(model, provider);
      const adapter = provider.adapterId ? adaptadores.get(provider.adapterId) : undefined;
      return [{ capability, model, provider, adapter, usable, reason }];
    });

  return {
    getCapability: (id) => capacidades.get(id),
    listCapabilities: () => datos.capabilities,

    getModel: (id) => modelos.get(id),
    listModels: () => datos.models,

    getProvider: (id) => proveedores.get(id),
    listProviders: () => datos.providers,

    getAdapter: (providerId) => adaptadorPorProveedor.get(providerId),
    listAdapters: () => datos.adapters,

    getProviderModels: (providerId) => modelosPorProveedor.get(providerId) ?? [],

    getCapabilityImplementations: implementacionesDe,
    findImplementations: (capability) => implementacionesDe(capability).filter((i) => i.usable),

    capabilitiesDisponibles: () =>
      [...modelosPorCapacidad.keys()].filter((c) => implementacionesDe(c).some((i) => i.usable)),

    modelosQueAceptan: (modalidad) => {
      /* Un modelo acepta una modalidad si alguna de sus capacidades la acepta.
       * Se mira el catálogo y no el modelo: quien define qué entra en una
       * capacidad es la capacidad. */
      const capacidadesQueAceptan = new Set(
        datos.capabilities.filter((c) => c.accepts.includes(modalidad)).map((c) => c.id),
      );
      return datos.models.filter((m) => m.capabilities.some((c) => capacidadesQueAceptan.has(c)));
    },
  };
};
