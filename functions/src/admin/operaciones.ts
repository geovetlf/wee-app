import type { ClaseDeOperacion, ModoDeOperacion } from './autorizacion';
import { esLegado, tienePermiso, type Permiso, type SesionDeAuth } from './permisos';

/**
 * EL CATÁLOGO DE LAS OPERACIONES DE ADMINISTRACIÓN QUE YA EXISTÍAN: qué permiso pide cada una y cómo deja constancia.
 * Una tabla, para poder leerla entera de una vez y para que una prueba compruebe que no falta ninguna.
 *
 *   · `agregada`: no dice nada de ninguna persona. Comprueba el permiso y no audita.
 *   · `lectura`: mira datos de personas. Sin constancia, no salen los datos.
 *   · `escritura`: cambia algo. Sin constancia, no se hace; y el éxito se escribe cuando se sabe.
 *
 * No añade ninguna operación. De lo que llega solo pasa a la auditoría lo que identifica la operación: nunca textos libres
 * de terceros, ni modelos, límites o notas de configuración, ni el permiso de subida.
 *
 * ── LO QUE SE AUDITA TIENE QUE SER LO QUE SE EJECUTA ─────────────────────────
 *
 * Las callables antiguas convierten su entrada con `String()` y `Number()`, que aceptan un array: `{ userId: ['x'] }` llega
 * al motor como `'x'`. La auditoría solo guarda valores simples, así que esa operación se haría sin dejar a quién ni
 * cuánto. Por eso aquí una entrada compuesta, o una que el motor convertiría en otra cosa (`credits: null` → 0, `margin:
 * '0.5'` → texto que luego se concatena), es `entradaInvalida`: la puerta autoriza, deja constancia y contesta
 * `invalid-argument` sin ejecutar. Así no hace falta tocar los cuerpos ni el motor.
 *
 * Y la acción se calcula con la MISMA expresión que el cuerpo: si difirieran, algo podría clasificarse como lectura y
 * ejecutarse como escritura. Lo fija `admin-seguridad` A13.
 */
export const CATALOGO: Readonly<Record<string, { permiso: Permiso; modo: ModoDeOperacion }>> = Object.freeze({
  'spendCredits': { permiso: 'credits.spend', modo: 'escritura' },
  'grantCredits': { permiso: 'credits.grant', modo: 'escritura' },
  'refundCredits': { permiso: 'credits.refund', modo: 'escritura' },
  'creditsAdmin.stats': { permiso: 'finance.read', modo: 'agregada' },
  'creditsAdmin.costs': { permiso: 'finance.read', modo: 'agregada' },
  'creditsAdmin.userHistory': { permiso: 'finance.read', modo: 'lectura' },
  'creditsAdmin.balance': { permiso: 'finance.read', modo: 'lectura' },
  'creditsAdmin.failed': { permiso: 'finance.read', modo: 'lectura' },
  'creditsAdmin.setCost': { permiso: 'credits.cost', modo: 'escritura' },
  'engineAdmin.status': { permiso: 'ai.read', modo: 'agregada' },
  'engineAdmin.seedDefaults': { permiso: 'ai.config', modo: 'escritura' },
  'engineAdmin.setProvider': { permiso: 'ai.config', modo: 'escritura' },
  'engineAdmin.setRouting': { permiso: 'ai.config', modo: 'escritura' },
  'engineAdmin.setSettings': { permiso: 'ai.config', modo: 'escritura' },
  'engineAdmin.resetHealth': { permiso: 'ai.config', modo: 'escritura' },
  'moderationAdmin.list': { permiso: 'moderation.read', modo: 'lectura' },
  'moderationAdmin.history': { permiso: 'moderation.read', modo: 'lectura' },
  'moderationAdmin.review': { permiso: 'moderation.review', modo: 'escritura' },
  'evalRun': { permiso: 'evals.run', modo: 'escritura' },
  'mediaCanary.listar': { permiso: 'media.canary', modo: 'agregada' },
  'mediaCanary.subir': { permiso: 'media.canary', modo: 'escritura' },
  'mediaCanary.confirmar': { permiso: 'media.canary', modo: 'escritura' },
  'mediaCanary.procesar': { permiso: 'media.canary', modo: 'escritura' },
  'mediaCanary.entregar': { permiso: 'media.canary', modo: 'escritura' },
});

type Datos = Record<string, unknown>;

const texto = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
/** Un identificador: ni un correo, ni una frase, ni una ruta. */
const ID_SEGURO = /^[A-Za-z0-9_.:-]{1,128}$/;
/** Un valor de un filtro o de un parámetro: lo que no parezca eso no se copia a la auditoría. */
const FICHA = /^[A-Za-z0-9_.:/ -]{1,64}$/;
const sinVacios = (o: Datos): Datos => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && (typeof v !== 'string' || FICHA.test(v))));
export const soloFichas = sinVacios;
const recurso = (tipo: string, id?: unknown): { tipo: string; id?: string } => ({ tipo, ...(typeof id === 'string' && ID_SEGURO.test(id) ? { id } : {}) });

const compuesto = (v: unknown): boolean => typeof v === 'object' && v !== null;
const algunoCompuesto = (d: Datos, claves: string[]): boolean => claves.some((k) => compuesto(d[k]));
const clavePeligrosa = (v: unknown): boolean => typeof v === 'string' && v in Object.prototype;
const numeroClaro = (v: unknown): boolean => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)));

const clase = (accion: string, r: { tipo: string; id?: string }, metadatos: Datos = {}, motivo?: string, entradaInvalida = false): ClaseDeOperacion => ({
  ...CATALOGO[accion], accion, recurso: r, metadatos: sinVacios(metadatos), ...(motivo ? { motivo } : {}), ...(entradaInvalida ? { entradaInvalida: true } : {}),
});

/** Una acción que no existe no se registra con lo que escribiera quien llama: se comprueba el permiso de leer, y la callable contesta `invalid-argument`. */
const desconocida = (callable: string, permiso: Permiso): ClaseDeOperacion => ({ modo: 'agregada', permiso, accion: `${callable}.desconocida`, recurso: { tipo: callable } });

const conocida = (callable: string, accion: string): boolean => Object.prototype.hasOwnProperty.call(CATALOGO, `${callable}.${accion}`);

/** `requestId` viaja a la auditoría porque es la llave para conciliar un `intento` sin cierre con el libro de Credits. */
export const claseDeCredits = (nombre: 'spendCredits' | 'grantCredits' | 'refundCredits', userId: unknown, d: Datos): ClaseDeOperacion =>
  clase(nombre, recurso('creditAccount', userId), { requestId: d.requestId, service: d.service, amount: d.amount, force: d.force === true ? true : undefined }, texto(d.reason),
    compuesto(userId) || algunoCompuesto(d, ['requestId', 'amount', 'service', 'reason', 'generationId']));

export const claseDeCreditsAdmin = (d: Datos): ClaseDeOperacion => {
  /* La misma expresión que `creditsAdmin`. */
  const accion = String(d.action || 'stats');
  if (!conocida('creditsAdmin', accion)) return desconocida('creditsAdmin', 'finance.read');
  const nombre = `creditsAdmin.${accion}`;
  if (accion === 'userHistory' || accion === 'balance') return clase(nombre, recurso('creditAccount', d.userId), { limit: d.limit }, undefined, algunoCompuesto(d, ['userId', 'limit']));
  if (accion === 'failed') return clase(nombre, recurso('creditTransactions'), { limit: d.limit }, undefined, compuesto(d.limit));
  /* `Number(null)` y `Number('')` son 0: un descuido dejaría un servicio gratis. */
  if (accion === 'setCost') return clase(nombre, recurso('creditCosts', d.service), { credits: d.credits }, undefined, !numeroClaro(d.credits));
  return clase(nombre, recurso('creditStats'));
};

export const claseDelMotor = (accion: string, d: Datos): ClaseDeOperacion => {
  if (!conocida('engineAdmin', accion)) return desconocida('engineAdmin', 'ai.read');
  const nombre = `engineAdmin.${accion}`;
  if (accion === 'seedDefaults') return clase(nombre, recurso('aiConfig'), { overwrite: d.overwrite === true });
  /* `ADAPTERS['constructor']` existe: un id así pasaría la comprobación del cuerpo. */
  if (accion === 'setProvider') return clase(nombre, recurso('aiProviders', d.id), { enabled: d.enabled, priority: d.priority, cambiaModelos: d.models !== undefined, cambiaLimites: d.limits !== undefined }, undefined, compuesto(d.id) || clavePeligrosa(d.id));
  if (accion === 'setRouting') return clase(nombre, recurso('aiRouting', d.capability), { policy: d.policy, cambiaCadena: d.chain !== undefined }, undefined, compuesto(d.capability) || clavePeligrosa(d.capability));
  if (accion === 'setSettings') {
    /* Un número en texto pasa `validateSettings` y se guarda como texto: luego `1 + '0.5'` es '10.5' en el precio. */
    const margenMal = d.margin !== undefined && typeof d.margin !== 'number';
    const conversionMal = d.creditsPerUsd !== undefined && typeof d.creditsPerUsd !== 'number';
    const campos = Object.keys(d).filter((k) => ['pricingMode', 'creditsPerUsd', 'margin', 'defaultPolicy', 'allowMockFallback', 'timeoutsMs', 'circuitBreaker', 'iaDetenida', 'maxUsdPerDay'].includes(k)).join(' ');
    return clase(nombre, recurso('aiSettings', 'global'), { campos, pricingMode: d.pricingMode, margin: d.margin, creditsPerUsd: d.creditsPerUsd, iaDetenida: d.iaDetenida, maxUsdPerDay: d.maxUsdPerDay, defaultPolicy: d.defaultPolicy, allowMockFallback: d.allowMockFallback }, undefined, margenMal || conversionMal);
  }
  if (accion === 'resetHealth') return clase(nombre, recurso('aiHealth', d.id), {}, undefined, compuesto(d.id));
  return clase(nombre, recurso('aiConfig'));
};

export const claseDeModeracion = (d: Datos): ClaseDeOperacion => {
  const accion = String(d.action ?? '');
  if (!conocida('moderationAdmin', accion)) return desconocida('moderationAdmin', 'moderation.read');
  const nombre = `moderationAdmin.${accion}`;
  if (accion === 'list') return clase(nombre, recurso('reports'), { status: d.status, limit: d.limit });
  /* El `reason` de una revisión NO se copia: su sitio es el historial del reporte, donde ya queda. */
  if (accion === 'review') return clase(nombre, recurso('report', d.reportId), { to: d.to, outcome: d.outcome, decisionAction: d.decisionAction });
  return clase(nombre, recurso('report', d.reportId));
};

export const claseDelCanary = (accion: string, d: Datos): ClaseDeOperacion => {
  if (!conocida('mediaCanary', accion)) return desconocida('mediaCanary', 'media.canary');
  return clase(`mediaCanary.${accion}`, recurso('mediaCanary', d.operationId), accion === 'subir' ? { contentType: d.contentType, bytes: d.bytes } : {}, undefined, algunoCompuesto(d, ['operationId', 'contentType', 'bytes']));
};

/* `evalRunId` llega a `.doc()`: con barras, cancelar escribiría en otro documento. */
export const claseDeEval = (d: Datos): ClaseDeOperacion =>
  clase('evalRun', recurso('evalRuns', d.evalRunId), { dominio: d.dominio, cancelar: d.cancelar === true ? true : undefined, maxCasos: d.maxCasos }, undefined,
    algunoCompuesto(d, ['dominio', 'maxCasos', 'requestKey']) || (d.evalRunId !== undefined && !(typeof d.evalRunId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(d.evalRunId))));

const CLAVE_DE_COSTE = /cost|margin|creditsPerUsd|maxUsdPerDay|usd/i;
const sinCostes = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sinCostes);
  if (!compuesto(v) || v instanceof Date) return v;
  return Object.fromEntries(Object.entries(v as Datos).filter(([k]) => !CLAVE_DE_COSTE.test(k)).map(([k, x]) => [k, sinCostes(x)]));
};

/** `engineAdmin.status` lleva márgenes y costes de proveedor: sin `finance.read` se ve el estado, no el dinero. */
export const estadoDelMotorPara = <T>(estado: T, sesion: SesionDeAuth): T =>
  (esLegado(sesion) || tienePermiso(sesion, 'finance.read') ? estado : sinCostes(estado) as T);
