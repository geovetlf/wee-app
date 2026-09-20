/**
 * WEË RUNTIME — POLICY & ELIGIBILITY: LAS RESTRICCIONES QUE ALGUIEN DECIDIÓ.
 *
 *   candidato del Router → ELEGIBILIDAD / POLÍTICA → política de ruteo → implementación
 *
 * ── Qué es, y sobre todo qué NO es ──────────────────────────────────────────
 *
 * NO es un segundo Router, ni un registro, ni un servicio. Y NO repite ningún
 * filtro que el Router del Core ya aplica. Esos son suyos, y siguen siéndolo:
 *
 *     capacidad compatible · proveedor habilitado · modelo habilitado ·
 *     adaptador activo · idioma · modalidad · duración · calidad mínima ·
 *     presupuesto · y la región TÉCNICA (dónde declara servir un modelo)
 *
 * Todo eso se deduce del REGISTRO: es lo que un proveedor puede hacer. Lo que el
 * registro no puede saber es lo que ALGUIEN DECIDIÓ que no se haga aunque se
 * pueda: «este modelo no, para peticiones de tal región», por un contrato, una
 * decisión de producto o un aviso legal. Eso es una REGLA, es un dato, tiene una
 * fuente, y es lo único que se evalúa aquí.
 *
 * ── La regla de esta capa: no inventar ──────────────────────────────────────
 *
 * Sin una regla conocida, NADA se bloquea. No hay lista de países, no hay
 * geolocalización, no hay consulta a nadie. Si una regla depende de la región y
 * la petición no trae región, la regla NO aplica: no saber dónde está alguien no
 * es saber que está donde no se puede. Bloquear por suposición sería inventarse
 * una restricción, que es justo lo que esta capa existe para no hacer.
 *
 * Hoy Weë no tiene NINGUNA regla de este tipo, y la composición arranca con la
 * lista vacía. La capa existe para que el día que aparezca la primera sea una
 * línea de configuración con su fuente, y no un `if` en el Router.
 *
 * ── Determinista ────────────────────────────────────────────────────────────
 *
 * Misma entrada y mismas reglas, misma respuesta. No lee el reloj, no tira
 * dados y no sale a la red. Es síncrona a propósito: así no puede hacerlo.
 */

export interface ContextoDePolitica {
  capability: string;
  providerId: string;
  modelId: string;
  appId?: string;
  workspaceId?: string;
  /** La región de la petición, SI se conoce. Nadie la deduce: o viene, o no está. */
  region?: string;
}

export interface VeredictoDePolitica {
  eligible: boolean;
  reason: 'no_rule_applies' | 'denied_by_rule' | 'policy_unreadable';
  /** Qué regla lo decidió. */
  rule?: string;
  /** De dónde sale esa regla. Sin fuente no hay regla conocida. */
  source?: string;
}

export interface PolicyEligibilityPort {
  evaluar(contexto: ContextoDePolitica): VeredictoDePolitica;
}

/** Una restricción EXPLÍCITA. Solo sabe negar: permitir es lo que pasa cuando ninguna aplica. */
export interface ReglaDePolitica {
  id: string;
  /** El contrato, la decisión o el aviso del que sale. Obligatoria: una regla sin fuente es una suposición. */
  source: string;
  effect: 'deny';
  /** A qué se aplica. Lo que falte vale para cualquiera. */
  providerId?: string;
  modelId?: string;
  capability?: string;
  /** Cuándo. TODAS las condiciones presentes tienen que cumplirse, y cumplirse con un dato CONOCIDO. */
  when?: { regions?: readonly string[]; appIds?: readonly string[] };
}

export const SIN_REGLAS: readonly ReglaDePolitica[] = Object.freeze([]);

const FORMA_DE_ETIQUETA = /^[A-Za-z0-9_.:-]{1,160}$/;
const MAX_REGLAS = 256;
const MAX_LISTA = 256;
const CLAVES_DE_REGLA = ['id', 'source', 'effect', 'providerId', 'modelId', 'capability', 'when'];
const CLAVES_DE_CUANDO = ['regions', 'appIds'];

const etiqueta = (v: unknown): v is string => typeof v === 'string' && FORMA_DE_ETIQUETA.test(v);
const lista = (v: unknown): readonly string[] | undefined =>
  (Array.isArray(v) && v.length > 0 && v.length <= MAX_LISTA && v.every(etiqueta) ? Object.freeze([...new Set(v as string[])]) : undefined);
const objeto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * De lo que haya guardado a reglas en las que se puede confiar.
 *
 * Estricta: una regla que no se entiende invalida la lista ENTERA. Media lista
 * de restricciones es peor que ninguna, porque parece que se están cumpliendo.
 * Qué hacer con una lista ilegible lo decide quien compone; `politicaCerrada`
 * existe para quien decida no ejecutar a ciegas.
 */
export const leerReglas = (crudo: unknown): { ok: true; reglas: readonly ReglaDePolitica[] } | { ok: false; field: string } => {
  if (crudo === undefined || crudo === null) return { ok: true, reglas: SIN_REGLAS };
  if (!Array.isArray(crudo) || crudo.length > MAX_REGLAS) return { ok: false, field: 'rules' };
  const reglas: ReglaDePolitica[] = [];
  const vistas = new Set<string>();
  for (let i = 0; i < crudo.length; i++) {
    const r = crudo[i];
    const en = (campo: string) => ({ ok: false as const, field: `rules[${i}].${campo}` });
    if (!objeto(r)) return en('');
    for (const k of Object.keys(r)) if (!CLAVES_DE_REGLA.includes(k)) return en(k.slice(0, 40));
    if (!etiqueta(r.id) || vistas.has(r.id)) return en('id');
    if (typeof r.source !== 'string' || !r.source.trim() || r.source.length > 300) return en('source');
    if (r.effect !== 'deny') return en('effect');
    for (const k of ['providerId', 'modelId', 'capability'] as const) if (r[k] !== undefined && !etiqueta(r[k])) return en(k);
    let when: ReglaDePolitica['when'];
    if (r.when !== undefined) {
      if (!objeto(r.when)) return en('when');
      for (const k of Object.keys(r.when)) if (!CLAVES_DE_CUANDO.includes(k)) return en(`when.${k.slice(0, 40)}`);
      const regions = r.when.regions === undefined ? undefined : lista(r.when.regions);
      const appIds = r.when.appIds === undefined ? undefined : lista(r.when.appIds);
      if (r.when.regions !== undefined && !regions) return en('when.regions');
      if (r.when.appIds !== undefined && !appIds) return en('when.appIds');
      when = Object.freeze({ ...(regions ? { regions } : {}), ...(appIds ? { appIds } : {}) });
    }
    vistas.add(r.id);
    reglas.push(Object.freeze({
      id: r.id, source: r.source.trim(), effect: 'deny' as const,
      ...(r.providerId !== undefined ? { providerId: r.providerId as string } : {}),
      ...(r.modelId !== undefined ? { modelId: r.modelId as string } : {}),
      ...(r.capability !== undefined ? { capability: r.capability as string } : {}),
      ...(when ? { when } : {}),
    }));
  }
  return { ok: true, reglas: Object.freeze(reglas) };
};

const aplica = (r: ReglaDePolitica, c: ContextoDePolitica): boolean => {
  if (r.providerId !== undefined && r.providerId !== c.providerId) return false;
  if (r.modelId !== undefined && r.modelId !== c.modelId) return false;
  if (r.capability !== undefined && r.capability !== c.capability) return false;
  /* Una condición sobre un dato que NO se conoce no se cumple. No saber la región no es estar en ella. */
  if (r.when?.regions && (c.region === undefined || !r.when.regions.includes(c.region))) return false;
  if (r.when?.appIds && (c.appId === undefined || !r.when.appIds.includes(c.appId))) return false;
  return true;
};

/** La política, sobre reglas ya leídas. La primera que aplica decide, en el orden en que se declararon. */
export const politicaPorReglas = (reglas: readonly ReglaDePolitica[]): PolicyEligibilityPort => ({
  evaluar(contexto) {
    const regla = reglas.find((r) => aplica(r, contexto));
    return regla
      ? { eligible: false, reason: 'denied_by_rule', rule: regla.id, source: regla.source }
      : { eligible: true, reason: 'no_rule_applies' };
  },
});

/** Para quien decida que, con las reglas ilegibles, no se ejecuta nada: una restricción que no se puede leer es una que se puede incumplir. */
export const politicaCerrada: PolicyEligibilityPort = Object.freeze({
  evaluar: (): VeredictoDePolitica => ({ eligible: false, reason: 'policy_unreadable' }),
});
