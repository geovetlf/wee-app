import { ProviderAdapter } from '../engine/types';
import { ADAPTERS, DEFAULT_PROVIDERS } from '../engine/registry';
import { DECLARED } from '../engine/verification';
import { Elegibilidad, elegibleEnAlgunaJurisdiccion, modeloElegible } from '../engine/elegibilidad';
import { PROVIDER_LANGUAGES } from '../engine/promptLanguage';
import { PROVIDER_CONTRACT_VERSION } from '../core/contracts';
import { ProviderStatus } from '../core/provider';
import {
  CAPABILITY_CATALOG,
  CoreCapabilityId,
  ModelDescriptor,
  Registry,
  RegisteredAdapter,
  RegisteredProvider,
  RegistryData,
  crearRegistro,
  validarRegistro,
} from '../core/registry';
import { MATRICES_PENDIENTES } from './matrices';
import { esAgregadorAprobado } from './excepciones';

/**
 * EL PUNTO DONDE EL CORE SE ENCUENTRA CON LOS ADAPTADORES.
 *
 * ── Por qué este archivo está fuera del Core ────────────────────────────────
 *
 * Porque aquí hay que nombrar proveedores, y el Core no puede: una prueba
 * falla si aparece el nombre de una matriz dentro de `core/`. Esa frontera es
 * lo que mantiene al Core model-agnostic, así que el cableado vive aquí.
 *
 * ── LA REGLA QUE EVITA LA SEGUNDA VERDAD ────────────────────────────────────
 *
 * Los modelos NO se escriben aquí: se DERIVAN del `ModelSpec` que cada
 * adaptador ya declara. Es la diferencia entre un registro y un catálogo
 * paralelo que se va separando del código real hasta que un día enruta a un
 * modelo que ya no existe.
 *
 * Lo único que el registro añade es lo que el adaptador no dice: idiomas
 * admitidos, límites documentados y estado. Y lo añade desde donde ya estaba
 * escrito —`promptLanguage.ts`, `verification.ts`— en vez de volver a
 * declararlo.
 *
 * ── Cómo entra una matriz nueva ─────────────────────────────────────────────
 *
 *     API oficial → adaptador en engine/providers/ → una línea en ADAPTERS
 *
 * Y ya está: aparece aquí sola, con sus modelos y sus capacidades. No hay que
 * tocar ningún Workplace, ni Brain, ni el planificador, ni el Composer. Si
 * alguna vez hiciera falta tocarlos, es que el registro se diseñó mal.
 */

/**
 * ESTADO DE INTEGRACIÓN ≠ DISPONIBILIDAD. No fundirlos es lo más importante
 * de este archivo.
 *
 * `status` describe el CÓDIGO: ¿hay adaptador?, ¿tiene modelos?, ¿está
 * documentada su API? Eso no cambia entre tu portátil, la máquina de pruebas y
 * producción, y por eso sirve como catálogo.
 *
 * `health` describe el ENTORNO: ¿hay credencial aquí y ahora? Eso sí cambia, y
 * mezclarlo con lo anterior fue el primer error de esta fase: sin claves, Gemini
 * salía `PENDING`, que es lo mismo que decimos de una matriz que nadie ha
 * integrado. Un registro que afirma cosas distintas según dónde se ejecute no
 * es un registro, es una fotografía.
 *
 * Quien pregunte «¿puedo usar esto AHORA?» mira las dos, y de eso ya se encarga
 * `evaluarUso` en el Core.
 */
const estadoDeProveedor = (adapter: ProviderAdapter, habilitado: boolean): ProviderStatus => {
  if (!habilitado) return 'DISABLED';
  /* Sin modelos no hay integración, por mucho adaptador que haya: es el caso
   * del hueco de música, que existe para fallar con criterio. */
  if (!adapter.models.length) return 'PENDING';
  const verificacion = DECLARED[adapter.id]?.state;
  if (verificacion === 'TESTED_WITH_MOCK') return 'BETA';
  /* Sin bloque de verificación no se puede afirmar que esté comprobada. Hoy le
   * pasa a DeepSeek: funciona en producción pero nadie escribió su ficha. */
  if (!verificacion) return 'UNVERIFIED';
  return 'READY';
};

/**
 * ¿Está disponible AQUÍ Y AHORA?
 *
 * La única pregunta que depende del entorno. Sin credencial no es que falle: es
 * que el router ni lo mira, así que decirlo como salud —y no como estado— es lo
 * que permite que el catálogo siga siendo el mismo en todas partes.
 */
const saludDeProveedor = (adapter: ProviderAdapter, estado: ProviderStatus) => {
  if (estado === 'DISABLED') return { state: 'UNAVAILABLE' as const, reason: 'desactivado en la configuración' };
  if (estado === 'PENDING') return { state: 'UNKNOWN' as const, reason: 'sin integración todavía' };
  if (!adapter.isConfigured()) return { state: 'UNAVAILABLE' as const, reason: 'sin credencial en este entorno' };
  return { state: 'AVAILABLE' as const };
};

/**
 * Estado de un modelo a partir del de su proveedor.
 *
 * Un modelo HEREDA el estado del proveedor, porque es lo que de verdad
 * determina si se puede pedir: READY, BETA, UNVERIFIED y DISABLED se copian tal
 * cual. Antes UNVERIFIED se degradaba a PENDING, y eso mentía en la dirección
 * peligrosa: PENDING significa «sin integrar», y los modelos de un proveedor
 * UNVERIFIED están integrados y sirviendo —es el caso de DeepSeek en Weë Brain—.
 * Lo que les falta es la ficha, y eso se llama UNVERIFIED, no PENDING.
 *
 * Y una excepción por encima de todo: si la administración apagó ESTE modelo
 * (`aiProviders/{id}.models[modelId].enabled = false`), está DISABLED aunque el
 * proveedor siga sano. Es el interruptor de incidente, y el registro tiene que
 * reflejarlo para que nadie lo ejecute leyendo solo el catálogo.
 */
const estadoDeModelo = (estadoProveedor: ProviderStatus, apagado: boolean): ModelDescriptor['status'] => {
  if (apagado) return 'DISABLED';
  if (estadoProveedor === 'READY' || estadoProveedor === 'BETA' || estadoProveedor === 'UNVERIFIED' || estadoProveedor === 'DISABLED') {
    return estadoProveedor;
  }
  return 'PENDING';
};

/**
 * Un modelo del adaptador, traducido al registro.
 *
 * `status` sale del proveedor, no del modelo: un modelo perfecto de un
 * proveedor sin clave no se puede pedir, y decir lo contrario sería mentir con
 * más precisión.
 */
const describirModelo = (
  spec: ProviderAdapter['models'][number],
  estadoProveedor: ProviderStatus,
  elegibilidad: Elegibilidad = { elegible: true, estado: 'ACTIVE' },
): ModelDescriptor => ({
  id: spec.id,
  providerId: spec.provider,
  capabilities: spec.capabilities as readonly CoreCapabilityId[],
  modalities: [],
  grades: { quality: spec.quality, speed: spec.speed },
  limits: spec.maxDurationSec ? { maxDurationSec: spec.maxDurationSec } : undefined,
  pricing: {
    unit: spec.cost.unit === 'mtoken' ? 'token' : spec.cost.unit,
    currency: 'USD',
    inputRate: spec.cost.unit === 'mtoken' ? spec.cost.usd : undefined,
    outputRate: spec.cost.usdOutput,
    mediaRate: spec.cost.unit === 'mtoken' ? undefined : spec.cost.usd,
    source: DECLARED[spec.provider]?.docsUrl,
    verifiedAt: DECLARED[spec.provider]?.documentedAt,
  },
  /*
   * La MISMA regla que el router vivo (`modeloElegible`), preguntada sin jurisdicción porque el catálogo no es de
   * ninguna operación: pendiente de revisión legal o con reglas territoriales → PENDING; bloqueado o desactivado →
   * DISABLED. Ninguno es usable en el Core (solo READY y BETA lo son), así que por ahí falla cerrado.
   */
  status: elegibilidad.estado === 'REVIEW_REQUIRED' || elegibilidad.estado === 'JURISDICTION_UNKNOWN'
    ? 'PENDING'
    : estadoDeModelo(estadoProveedor, !elegibilidad.elegible),
  metadata: spec.tags?.length ? { tags: spec.tags } : undefined,
});

/** Construye los datos del registro a partir de los adaptadores reales. */
export const datosDelRegistro = (
  adapters: Record<string, ProviderAdapter> = ADAPTERS,
  config: typeof DEFAULT_PROVIDERS = DEFAULT_PROVIDERS,
): RegistryData => {
  const providers: RegisteredProvider[] = [];
  const models: ModelDescriptor[] = [];
  const adaptadores: RegisteredAdapter[] = [];

  for (const [id, adapter] of Object.entries(adapters)) {
    const habilitado = config[id]?.enabled !== false;
    const estado = estadoDeProveedor(adapter, habilitado);
    const verificacion = DECLARED[id];

    /*
     * El catálogo no es de ninguna operación: un modelo territorial que es elegible en ALGUNA jurisdicción se puede
     * pedir, y cada operación lo vuelve a preguntar con SU jurisdicción (el ejecutor del Core, `jurisdiccionesDe`).
     * Uno que no lo es en ninguna, como hoy Hunyuan World, sigue PENDING.
     */
    const elegibilidad = (m: ProviderAdapter['models'][number]): Elegibilidad => {
      const ajuste = config[id]?.models?.[m.id];
      return m.territorio && elegibleEnAlgunaJurisdiccion(m, ajuste) ? { elegible: true, estado: 'ACTIVE' } : modeloElegible(m, ajuste);
    };
    const susModelos = adapter.models.map((m) => describirModelo(m, estado, elegibilidad(m)));
    models.push(...susModelos);

    /* Las capacidades del proveedor son la UNIÓN de las de sus modelos, no una
     * lista aparte que haya que mantener sincronizada. Salvo cuando no tiene
     * modelos: entonces se pregunta al adaptador, que es lo que pasa con el
     * hueco de música. */
    const deSusModelos = [...new Set(susModelos.flatMap((m) => m.capabilities))];
    const capacidades = deSusModelos.length
      ? deSusModelos
      : (CAPABILITY_CATALOG.filter((c) => adapter.supports(c.id as never)).map((c) => c.id));

    providers.push({
      id,
      name: adapter.name,
      /* El modo demo no es de nadie: no es una matriz y no debe contarse como
       * tal en ningún informe. */
      type: id === 'mock' ? 'internal' : esAgregadorAprobado(id) ? 'aggregator' : 'matrix',
      status: estado,
      contract: PROVIDER_CONTRACT_VERSION,
      docsUrl: verificacion?.docsUrl && verificacion.docsUrl !== '—' ? verificacion.docsUrl : undefined,
      credentialEnv: verificacion?.credential && verificacion.credential !== '—' ? verificacion.credential : undefined,
      modalities: adapter.modalities,
      capabilities: estado === 'PENDING' ? [] : capacidades,
      languages: PROVIDER_LANGUAGES[id],
      limits: config[id]?.limits,
      health: saludDeProveedor(adapter, estado),
      adapterId: `adapter:${id}`,
      note: config[id]?.note,
    });

    adaptadores.push({
      id: `adapter:${id}`,
      providerId: id,
      contract: PROVIDER_CONTRACT_VERSION,
      supportedCapabilities: CAPABILITY_CATALOG.filter((c) => adapter.supports(c.id as never)).map((c) => c.id),
      status: adapter.models.length ? 'ACTIVE' : 'PLACEHOLDER',
      verificationState: verificacion?.state,
    });
  }

  return {
    capabilities: CAPABILITY_CATALOG,
    providers: [...providers, ...MATRICES_PENDIENTES],
    models,
    adapters: adaptadores,
  };
};

/**
 * El registro de Weë.
 *
 * Se construye una vez y se reutiliza: los índices se pagan al arrancar, no en
 * cada petición. Quien necesite otro —una prueba, una configuración remota—
 * llama a `crearRegistro` con sus propios datos.
 */
let cache: Registry | undefined;

export const registroDeWee = (): Registry => {
  if (!cache) cache = crearRegistro(datosDelRegistro());
  return cache;
};

/** Para las pruebas: rehacer el registro desde cero. */
export const olvidarRegistro = (): void => {
  cache = undefined;
};

/** Problemas de integridad del registro real. Vacío es lo que debe salir. */
export const problemasDelRegistro = () => validarRegistro(datosDelRegistro());
