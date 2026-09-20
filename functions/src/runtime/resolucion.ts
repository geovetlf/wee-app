import {
  ImplementationRef,
  ROUTER_CONTRACT_VERSION,
  Router,
  RouterRequest,
  RoutingCandidate,
  RoutingDecision,
} from '../core';

/**
 * WEË RUNTIME — CON QUÉ SE ATIENDE UN PASO.
 *
 * ── Quién elige ─────────────────────────────────────────────────────────────
 *
 * El Router del Core, y nadie más. Aquí no hay un segundo criterio de
 * selección: hay el puerto por el que el conductor le PREGUNTA, y una capa de
 * compatibilidad para que lo que hoy ya está decidido como producto siga
 * decidido mientras dura la migración.
 *
 * ── Por qué hace falta la capa de compatibilidad ────────────────────────────
 *
 * Medido en la Fase 12-A (`docs/RUNTIME.md` § 6): con la misma configuración,
 * el Router del Core y el router que atiende hoy eligen distinto en 15 de 28
 * capacidades. No es que uno esté mal: PUNTÚAN cosas distintas. El del Core
 * ordena candidatos por calidad, velocidad, coste y disponibilidad. El que
 * atiende hoy obedece CADENAS, y una cadena es una decisión de producto: el
 * vídeo es de una sola familia de modelos y no tiene respaldo en otra; Weë
 * Brain contesta con el modelo que se le cotizó a la persona, y si ese modelo
 * no está prefiere fallar a contestar con otro.
 *
 * Esa última es de dinero: el precio en Credits depende del modelo, así que
 * «el que se cotizó» y «el que se ejecuta» tienen que ser el mismo.
 *
 * El contrato del Router no admite forzar una implementación —`preference` es
 * una señal que pesa, no una orden, y `allowedProviders` lo rechaza entero— y
 * está bien que sea así. Reescribirlo para que obedezca cadenas sería meterle
 * al Core una decisión que es de producto.
 *
 * ── Cómo se resuelve sin tocar el Router ────────────────────────────────────
 *
 * Se separan dos preguntas que el router de hoy contesta juntas:
 *
 *   ¿QUIÉN PUEDE?   El Router del Core. Estado del proveedor y del modelo,
 *                   adaptador, modalidad, idioma, región, duración, calidad
 *                   mínima, presupuesto. Todos sus filtros duros, sin tocar.
 *   ¿EN QUÉ ORDEN?  La cadena de producto, que entra por un puerto.
 *
 * El resultado es el primer eslabón de la cadena que el Router considera
 * elegible. Si ninguno lo es, NO se sale de la cadena a buscar otro: «no hay
 * con qué» es la respuesta correcta, y la que el producto ya da hoy.
 *
 * Es una capa de TRANSICIÓN. El día que producto decida que una capacidad la
 * elija la puntuación del Core, se le quita la cadena a esa capacidad —el
 * puerto contesta `undefined`— y decide el Router solo. Nada más cambia.
 */

export type PeticionDeResolucion = Omit<RouterRequest, 'contract'>;

/**
 * LO QUE EL SERVIDOR YA TIENE DECIDIDO PARA ESTA OPERACIÓN.
 *
 * Lo pone quien PREPARA la ejecución —código de servidor—, exactamente como
 * hoy `creator/brain.ts` le pasa `allowedProviders` y `modelId` al router que
 * atiende. Jamás viene del cliente y jamás viaja dentro del workflow, que
 * rechaza cualquier clave de implementación: por eso va aparte.
 */
export interface PreferenciasDeRuteo {
  allowedProviders?: readonly string[];
  excludeProviders?: readonly string[];
  modelId?: string;
}

/** Un eslabón ya resuelto a modelo concreto, con lo que se estimó que costaría. */
export interface EslabonDeCadena {
  providerId: string;
  modelId: string;
  estimatedUsd?: number;
  estimatedCredits?: number;
}

/**
 * LA CADENA DE PRODUCTO. Un puerto: quien la implemente decide de dónde sale.
 *
 * `undefined` significa «para esta capacidad no hay cadena: que elija el
 * Router». Una lista vacía significa lo contrario: hay cadena y hoy no queda
 * nadie en ella.
 */
export interface CadenaDeProducto {
  cadena(consulta: {
    peticion: PeticionDeResolucion;
    /** La entrada del paso. La cadena de hoy la mira para deducir la calidad pedida; no sale de aquí. */
    input: Readonly<Record<string, unknown>>;
    preferencias?: PreferenciasDeRuteo;
  }): Promise<readonly EslabonDeCadena[] | undefined>;
}

export type Resolucion =
  | {
    ok: true;
    implementation: ImplementationRef;
    /** Los siguientes, en el orden en que tocaría probarlos. No se ejecutan aquí. */
    alternatives: readonly ImplementationRef[];
    /** La decisión ENTERA del Router, para poder explicar por qué. */
    decision: RoutingDecision;
    /** Quién puso el orden: la puntuación del Router o la cadena de producto. */
    origen: 'router' | 'cadena';
    estimado?: { usd?: number; credits?: number };
  }
  | {
    ok: false;
    /** `invalid` = arregla lo que pediste. `unavailable` = hoy no hay con qué. `chain_unavailable` = lo hay, pero no en la cadena. */
    reason: 'invalid' | 'unavailable' | 'chain_unavailable';
    decision: RoutingDecision;
  };

export interface ResolutorDeImplementacion {
  resolver(consulta: {
    peticion: PeticionDeResolucion;
    input: Readonly<Record<string, unknown>>;
    preferencias?: PreferenciasDeRuteo;
  }): Promise<Resolucion>;
}

const referenciaDe = (c: RoutingCandidate): ImplementationRef =>
  Object.freeze({ providerId: c.providerId, modelId: c.modelId, ...(c.adapterId ? { adapterId: c.adapterId } : {}) });

const clave = (providerId: string, modelId: string): string => `${providerId.length}.${providerId}:${modelId}`;

/** El Router del Core decide solo. Es el destino final de toda capacidad. */
export const resolutorDelRouter = (router: Router): ResolutorDeImplementacion => ({
  async resolver({ peticion }): Promise<Resolucion> {
    const decision = router.resolver({ contract: ROUTER_CONTRACT_VERSION, ...peticion });
    if (decision.status === 'routed' && decision.selected) {
      return { ok: true, implementation: decision.selected, alternatives: decision.alternatives, decision, origen: 'router' };
    }
    return { ok: false, reason: decision.status === 'invalid' ? 'invalid' : 'unavailable', decision };
  },
});

/**
 * El Router dice quién puede; la cadena de producto dice en qué orden.
 *
 * Ni un filtro propio: la elegibilidad de cada candidato se LEE de la decisión
 * del Router (`candidates[].eligible`), no se vuelve a calcular.
 */
export const resolutorPorCadena = (router: Router, producto: CadenaDeProducto): ResolutorDeImplementacion => {
  const soloRouter = resolutorDelRouter(router);
  return {
    async resolver(consulta): Promise<Resolucion> {
      const eslabones = await producto.cadena(consulta);
      if (eslabones === undefined) return soloRouter.resolver(consulta);

      const cabeza = eslabones[0];
      const decision = router.resolver({
        contract: ROUTER_CONTRACT_VERSION,
        ...consulta.peticion,
        /* La cabeza de la cadena viaja como preferencia para que la decisión que se guarda cuente lo que se quería. */
        ...(cabeza ? { preference: { providerId: cabeza.providerId, modelId: cabeza.modelId } } : {}),
      });
      if (decision.status === 'invalid') return { ok: false, reason: 'invalid', decision };

      const elegibles = new Map<string, RoutingCandidate>();
      for (const c of decision.candidates) if (c.eligible) elegibles.set(clave(c.providerId, c.modelId), c);

      const enOrden = eslabones
        .map((e) => ({ eslabon: e, candidato: elegibles.get(clave(e.providerId, e.modelId)) }))
        .filter((x): x is { eslabon: EslabonDeCadena; candidato: RoutingCandidate } => x.candidato !== undefined);

      /* Hay quien puede, pero no en la cadena: NO se sale de ella. Es una decisión de producto, no un despiste. */
      if (!enOrden.length) return { ok: false, reason: decision.status === 'routed' ? 'chain_unavailable' : 'unavailable', decision };

      const [primero, ...resto] = enOrden;
      const { estimatedUsd, estimatedCredits } = primero.eslabon;
      return {
        ok: true,
        implementation: referenciaDe(primero.candidato),
        alternatives: Object.freeze(resto.map((x) => referenciaDe(x.candidato))),
        decision,
        origen: 'cadena',
        ...(estimatedUsd !== undefined || estimatedCredits !== undefined
          ? { estimado: { ...(estimatedUsd !== undefined ? { usd: estimatedUsd } : {}), ...(estimatedCredits !== undefined ? { credits: estimatedCredits } : {}) } }
          : {}),
      };
    },
  };
};
