import {
  CheckoutDecision,
  CheckoutRequest,
  CreditDecision,
  CreditLedgerEntry,
  CreditMovementRequest,
  FINANCIAL_CORE_CONTRACT_VERSION,
  FinancialStore,
  Money,
  PaymentDecision,
  PaymentEffect,
  PaymentEngine,
  PaymentIntent,
  PaymentProviderProfile,
  PaymentRoutingPolicy,
  PaymentStatus,
  PaymentWebhookEvent,
  Principal,
  claveDeMovimiento,
  crearMotorDeCredits,
  crearMotorDePagos,
  prepararCheckout,
} from '../core';

/**
 * WEE FINANCIAL — LA COMPOSICIÓN.
 *
 * El Core financiero es puro: sabe decidir, pero no sabe guardar, ni cobrar, ni
 * qué pasarelas tiene Weë. Aquí está lo que le falta para ser útil sin dejar de
 * ser puro.
 *
 * ── Lo que NO hay aquí, y es casi todo ──────────────────────────────────────
 *
 * No hay ninguna pasarela real. Ni Stripe, ni dLocal, ni Adyen, ni ninguna: no
 * están sus SDK, no están sus claves, no están sus endpoints y no se ha
 * inventado ninguno. Lo que hay es el CONTRATO que tendrá que cumplir su
 * adaptador y una pasarela de MENTIRA para poder probar todo lo demás sin mover
 * un céntimo de nadie.
 *
 * Tampoco hay almacén. `FinancialStore` es un puerto y su implementación será
 * infraestructura. Y no hay precios: cuántos Credits da un pago es una política
 * con su versión, y esta fase no la inventa.
 *
 * ── La costura con el motor de Credits que ya cobra ─────────────────────────
 *
 * `credits/creditEngine.ts` lleva desde antes de esta fase moviendo Credits con
 * transacciones atómicas contra Firestore. Esta fase NO lo sustituye ni lo
 * duplica: le pone delante un contrato y una decisión pura. Los identificadores
 * de movimiento que produce el Core son LOS MISMOS que ese motor ya escribe
 * (`usage_<clave>`, `refund_<clave>`…), justamente para que no haya dos
 * convenciones y un reintento no caiga en otro documento.
 */

/* ── El adaptador de una pasarela ─────────────────────────────────────────── */

/**
 * LO QUE TENDRÁ QUE CUMPLIR CADA PASARELA.
 *
 * Deliberadamente mínimo. Tres cosas: cobrar, devolver y —la que más importa—
 * decir si un aviso viene de quien dice venir. La verificación de firma está
 * aquí y no en el Core porque quien tiene la clave es el adaptador; el Core
 * solo exige que alguien lo haya hecho, y rechaza el aviso que no lo trae.
 *
 * `perfil()` es lo que el Payment Router lee para elegir. Entra como dato, así
 * que añadir una pasarela es registrar un adaptador y no tocar ni una línea de
 * decisión.
 */
export interface PaymentProviderAdapter {
  perfil(): PaymentProviderProfile;
  /** Pedirle a la pasarela que cobre. Devuelve lo que contestó, ya normalizado. */
  cobrar(orden: OrdenDeCobro): Promise<RespuestaDePasarela>;
  /** Pedirle que devuelva. */
  devolver(orden: OrdenDeDevolucion): Promise<RespuestaDePasarela>;
  /** ¿Este aviso viene de verdad de esta pasarela? Lo comprueba quien tiene la clave. */
  verificarAviso(crudo: AvisoCrudo): PaymentWebhookEvent | undefined;
}

export interface OrdenDeCobro {
  paymentId: string;
  money: Money;
  method?: string;
  country?: string;
  /** La clave con la que la pasarela debe deduplicar. La misma del intento. */
  idempotencyKey: string;
}

export interface OrdenDeDevolucion {
  paymentId: string;
  refundId: string;
  money?: Money;
  idempotencyKey: string;
}

export interface RespuestaDePasarela {
  status: PaymentStatus;
  providerRef?: string;
  providerFee?: Money;
  /** Lo que la pasarela dijo que cobró. Se compara con lo pedido; no se cree a ciegas. */
  money?: Money;
  error?: { code: string; message?: string };
}

/** Lo que llega por HTTP. Opaco: quien lo entiende es el adaptador. */
export interface AvisoCrudo {
  providerId: string;
  headers: Readonly<Record<string, string>>;
  body: unknown;
}

/* ── La pasarela de mentira ───────────────────────────────────────────────── */

/** Lo que se le pide a la pasarela de pruebas que finja. */
export interface GuionDeSandbox {
  /** Qué contesta al cobrar. Por defecto, que salió bien. */
  alCobrar?: PaymentStatus;
  /** Qué contesta al devolver. */
  alDevolver?: PaymentStatus;
  /** Que se caiga. */
  fallar?: boolean;
  /** Que tarde y no conteste. */
  vencer?: boolean;
  /** Qué comisión declara. */
  fee?: Money;
  /** Que diga que cobró OTRO importe: el caso que ninguna prueba suele cubrir. */
  importeDistinto?: Money;
}

export const PASARELA_DE_PRUEBAS = 'sandbox';

/**
 * UNA PASARELA QUE NO MUEVE DINERO.
 *
 * Existe para poder probar de verdad lo que no se puede probar contra una
 * pasarela real sin gastar dinero de alguien: el aviso duplicado, el aviso
 * fuera de orden, el que llega tarde, el que dice otro importe, la caída a
 * mitad y la discrepancia al conciliar.
 *
 * Su identificador es `sandbox` a propósito, y no el nombre de ninguna empresa:
 * el día que alguien la vea en un libro contable tiene que saber en el acto que
 * eso no fue dinero.
 */
export const pasarelaDePruebas = (
  guion: GuionDeSandbox = {},
  perfilBase?: Partial<PaymentProviderProfile>,
): PaymentProviderAdapter => {
  const moneda = guion.fee?.currency ?? 'USD';
  const perfil: PaymentProviderProfile = Object.freeze({
    providerId: PASARELA_DE_PRUEBAS,
    countries: ['PE', 'BR', 'US', 'ES', 'MX'],
    currencies: ['PEN', 'BRL', 'USD', 'EUR', 'MXN'],
    methods: ['card', 'wallet', 'bank_transfer'],
    status: 'ACTIVE' as const,
    fee: { fixed: guion.fee ?? { amountMinor: 30, currency: moneda }, bps: 290 },
    approvalBps: 9_000,
    settlementDays: 2,
    ...perfilBase,
  });

  return Object.freeze({
    perfil: () => perfil,
    async cobrar(orden: OrdenDeCobro): Promise<RespuestaDePasarela> {
      if (guion.fallar) return { status: 'FAILED', error: { code: 'PROVIDER_ERROR' } };
      if (guion.vencer) return { status: 'PENDING' };
      return {
        status: guion.alCobrar ?? 'SUCCEEDED',
        providerRef: `sbx_${orden.paymentId}`,
        providerFee: { amountMinor: 30 + Math.ceil((orden.money.amountMinor * 290) / 10_000), currency: orden.money.currency },
        money: guion.importeDistinto ?? orden.money,
      };
    },
    async devolver(orden: OrdenDeDevolucion): Promise<RespuestaDePasarela> {
      if (guion.fallar) return { status: 'SUCCEEDED', error: { code: 'PROVIDER_ERROR' } };
      return { status: guion.alDevolver ?? 'REFUNDED', providerRef: `sbx_r_${orden.refundId}` };
    },
    /**
     * La firma de mentira: una cabecera con el identificador del aviso. Lo que
     * importa de esto no es el algoritmo —una pasarela de verdad usará HMAC—
     * sino que EXISTA el paso: un aviso sin firma comprobada no acredita nada,
     * y aquí se puede probar que efectivamente no lo hace.
     */
    verificarAviso(crudo: AvisoCrudo): PaymentWebhookEvent | undefined {
      if (crudo.providerId !== PASARELA_DE_PRUEBAS) return undefined;
      const body = crudo.body as Partial<PaymentWebhookEvent> | undefined;
      if (!body || typeof body !== 'object' || typeof body.eventId !== 'string') return undefined;
      const firma = crudo.headers['x-sandbox-signature'];
      return {
        ...(body as PaymentWebhookEvent),
        providerId: PASARELA_DE_PRUEBAS,
        signatureVerified: firma === `sig_${body.eventId}`,
      };
    },
  });
};

/* ── El sistema financiero de Weë ─────────────────────────────────────────── */

export interface SistemaFinancieroDeWee {
  credits: ReturnType<typeof crearMotorDeCredits>;
  pagos: PaymentEngine;
  /** Las pasarelas registradas, por identificador. */
  pasarelas: ReadonlyMap<string, PaymentProviderAdapter>;
  perfiles: readonly PaymentProviderProfile[];
  politicaDeRuta: Partial<PaymentRoutingPolicy>;
}

/**
 * El sistema financiero de Weë, sobre las pasarelas que se le registren.
 *
 * Se construye por petición y no guarda nada: un servidor puede desaparecer y
 * otro decidir exactamente lo mismo.
 */
export const crearSistemaFinancieroDeWee = (
  adaptadores: readonly PaymentProviderAdapter[] = [pasarelaDePruebas()],
  politicaDeRuta: Partial<PaymentRoutingPolicy> = {},
): SistemaFinancieroDeWee => {
  const pasarelas = new Map<string, PaymentProviderAdapter>();
  for (const a of adaptadores) pasarelas.set(a.perfil().providerId, a);
  return Object.freeze({
    credits: crearMotorDeCredits(),
    pagos: crearMotorDePagos(),
    pasarelas,
    perfiles: Object.freeze(adaptadores.map((a) => a.perfil())),
    politicaDeRuta,
  });
};

/** Preparar un cobro con las pasarelas registradas. No acredita nada. */
export const checkoutDeWee = (sistema: SistemaFinancieroDeWee, request: CheckoutRequest): CheckoutDecision =>
  prepararCheckout(request, sistema.perfiles, sistema.politicaDeRuta);

/**
 * UN AVISO DE PASARELA, DE PUNTA A PUNTA.
 *
 * El orden importa y por eso está escrito una vez:
 *
 *   1. el adaptador comprueba la firma —quien tiene la clave es él—;
 *   2. el motor decide, con su propia deduplicación y su orden de eventos;
 *   3. quien llama aplica la decisión contra la revisión que leyó.
 *
 * Lo que este camino NO hace es acreditar Credits. Dice que hay que hacerlo,
 * con qué clave, y se acabó: acreditar es otra escritura, en otro libro, y
 * fundirlas dejaría que un aviso HTTP escribiera directamente en el saldo de
 * alguien.
 */
export const procesarAviso = (
  sistema: SistemaFinancieroDeWee,
  intent: PaymentIntent,
  crudo: AvisoCrudo,
  at: number,
): PaymentDecision => {
  /*
   * Una pasarela que no está registrada y un aviso que no se entiende acaban en
   * el mismo sitio, y es el correcto: NO SE PUDO VERIFICAR. El `providerId` que
   * se le pasa al motor es el del INTENTO, no el que venía en el aviso, para
   * que la respuesta sea «esto no lo puedo dar por bueno» y no «el aviso está
   * mal formado» — que mandaría a revisar el código de alguien en vez de su
   * seguridad.
   */
  const noVerificado = (eventId: string): PaymentWebhookEvent => ({
    eventId, providerId: intent.providerId, paymentId: intent.paymentId,
    type: 'failed', at, signatureVerified: false,
  });
  const adaptador = sistema.pasarelas.get(crudo.providerId);
  if (!adaptador) return sistema.pagos.recibirAviso(intent, noVerificado('pasarela_desconocida'), at);
  const aviso = adaptador.verificarAviso(crudo);
  if (!aviso) return sistema.pagos.recibirAviso(intent, noVerificado('aviso_ilegible'), at);
  return sistema.pagos.recibirAviso(intent, aviso, at);
};

/**
 * DE UN PAGO COBRADO AL MOVIMIENTO DE CREDITS QUE LE TOCA.
 *
 * La costura entre los dos libros, y el sitio donde se ve que son dos. El pago
 * dice QUÉ efecto hace falta y con qué clave; esto lo convierte en la petición
 * del movimiento. Cuántos Credits da ese dinero NO se decide aquí: entra como
 * parámetro, porque es una política de precios con su versión y su historial, y
 * escribir aquí una equivalencia sería dejarla enterrada en el cableado.
 */
export const movimientoDe = (
  effect: PaymentEffect,
  datos: { principal: Principal; at: number; credits: number; paymentId: string; reason: string; source: string; attribution?: CreditMovementRequest['attribution'] },
): CreditMovementRequest | undefined => {
  if (effect.kind !== 'grant_credits' && effect.kind !== 'reverse_credits') return undefined;
  if (!Number.isSafeInteger(datos.credits) || datos.credits <= 0) return undefined;
  return {
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    principal: datos.principal,
    at: datos.at,
    /*
     * `purchase_reversal`, NO `refund`. Y es el defecto más caro de la fase.
     *
     * Decía `refund`, que en el motor SUMA —porque devolver Credits por un
     * trabajo que falló es sumarlos—. Así, devolverle el dinero a alguien le
     * duplicaba el saldo: tres ciclos de comprar y devolver daban seiscientos
     * Credits gratis con cero pagado. Se llaman parecido y son opuestos.
     */
    type: effect.kind === 'grant_credits' ? 'purchase' : 'purchase_reversal',
    amount: datos.credits,
    reason: datos.reason,
    source: datos.source,
    idempotencyKey: effect.idempotencyKey,
    paymentId: datos.paymentId,
    ...(effect.money ? { money: effect.money } : {}),
    ...(datos.attribution ? { attribution: datos.attribution } : {}),
  };
};

/**
 * APLICAR UN MOVIMIENTO DE CREDITS SIN QUE DOS LO APLIQUEN DOS VECES.
 *
 * El protocolo entero, en un sitio, porque hacerlo a mano es donde aparece la
 * carrera:
 *
 *   1. se busca el asiento por su identificador, que es determinista;
 *   2. el motor decide: aplicar, ya estaba, o conflicto;
 *   3. el almacén escribe la cuenta Y el asiento en el mismo commit, y solo si
 *      la cuenta sigue en la revisión que se leyó;
 *   4. si alguien escribió mientras tanto, se vuelve a leer y a decidir —con el
 *      saldo nuevo—, que es lo que impide que dos gastos simultáneos dejen el
 *      saldo en negativo.
 */
export const aplicarMovimiento = async (
  store: FinancialStore,
  motor: ReturnType<typeof crearMotorDeCredits>,
  request: CreditMovementRequest,
  intentos = 8,
): Promise<{ ok: true; decision: CreditDecision } | { ok: false; decision: CreditDecision; contended?: boolean }> => {
  const transactionId = claveDeMovimiento(request.type, request.idempotencyKey);
  let ultima: CreditDecision | undefined;
  for (let i = 0; i < Math.max(1, intentos); i++) {
    const cuenta = await store.cuenta(request.principal.userId);
    if (!cuenta) {
      return {
        ok: false,
        decision: Object.freeze({
          contract: FINANCIAL_CORE_CONTRACT_VERSION,
          status: 'invalid' as const,
          error: { code: 'INVALID_REQUEST' as const, source: 'financial', details: { reason: 'account_not_found' } },
        }),
      };
    }
    const existente: CreditLedgerEntry | undefined = await store.asientoDeCredits(transactionId);
    const decision = motor.mover(cuenta, request, existente);
    ultima = decision;
    if (decision.status === 'duplicate') return { ok: true, decision };
    if (decision.status !== 'applied') return { ok: false, decision };
    const { applied } = await store.aplicar(decision);
    if (applied) return { ok: true, decision };
    /* Alguien escribió mientras tanto: se vuelve a leer y a decidir con el saldo de ahora. */
  }
  /*
   * SE AGOTARON LOS INTENTOS, Y ESO NO ES «LA CUENTA NO EXISTE».
   *
   * Aquí se fabricaba la salida con `motor.mover({} as FinancialAccount, ...)`,
   * que muere en la comprobación de dueño y contesta «no encontrada»: un abono
   * legítimo perdido en una contienda se reportaba como si la cuenta no
   * existiera, y quien llamara no tenía forma de saber que lo suyo solo había
   * que reintentarlo. Ahora se dice lo que pasó y se marca como contienda, para
   * que arriba se pueda reintentar en vez de darlo por muerto.
   */
  return {
    ok: false,
    contended: true,
    decision: ultima ?? Object.freeze({
      contract: FINANCIAL_CORE_CONTRACT_VERSION,
      status: 'invalid' as const,
      error: { code: 'INVALID_REQUEST' as const, source: 'financial', details: { reason: 'contention_exhausted' } },
    }),
  };
};

export const CONTRATO_FINANCIERO = FINANCIAL_CORE_CONTRACT_VERSION;
