/**
 * LOS BLOQUES AUTORIZADOS DE LA CERCA 63p de `job-queue.test.mjs` (Credit Engine = el desplegado de c3515b3 MÁS
 * estos bloques, byte a byte). Solo datos: la cerca, su reconstrucción y su comprobación siguen en job-queue; aquí
 * se mudaron las tablas en el cierre del 2026-10-01 para que la suite no pasara de las mil líneas. Añadir un bloque
 * es autorizar un cambio en el dinero: cada uno lleva su porqué y su prueba.
 */

/*
 * Y LO AUTORIZADO DESPUÉS: la revisión post-auditoría del 2026-10-01 (hallazgo
 * money/remigracion-por-segundo-perfil, demostrado por credits-perfil-duplicado.test.mjs). Son bloques EXACTOS
 * —lo que había y lo que queda, con una línea de contexto—, cada uno único, aplicados encima de la reconstrucción:
 * la comprobación sigue siendo «el desplegado más esto, byte a byte». Cualquier otro cambio la hace fallar.
 */
export const REVISION_POSTAUDITORIA = {
  "functions/src/credits/creditEngine.ts": [
    {
      "eran": [
        "",
        "  /** Perfil real de la persona (uid == auth uid). Los Credits son por cuenta, no por identidad. */",
        "  const findAccount = async (tx: CreditTx, userId: string): Promise<CreditDocSnap> => {",
        "    const snap = await tx.get(users().where('uid', '==', userId).limit(1));",
        "    if (snap.empty || !esElPerfilDeLaCuenta(userId, snap.docs[0])) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });",
        "    }",
        "    return snap.docs[0];",
        "  };"
      ],
      "quedan": [
        "",
        "  /*",
        "   * QUÉ PERFIL GUARDA EL SALDO CUANDO HAY MÁS DE UNO (revisión post-auditoría 2026-10-01,",
        "   * money/remigracion-por-segundo-perfil).",
        "   *",
        "   * Una cuenta puede tener más de un Perfil Real: en producción hay cuentas así",
        "   * (utils/perfilCanonico.ts), y las reglas dejan crear `users/<uid>` aunque ya",
        "   * exista uno con id automático, porque no pueden consultar. Firestore devuelve",
        "   * la consulta por `uid` ordenada por id de documento; quedarse con «el primero»",
        "   * podía saltar a un perfil vacío y dejar el saldo de verdad inalcanzable (y",
        "   * `ensureAccount` volvía a migrar la billetera antigua). El saldo vive en el",
        "   * perfil que YA está inicializado: ese manda. Si ninguno lo está, el primero,",
        "   * como siempre; si varios lo están, el primero de ellos, como siempre.",
        "   */",
        "  const PERFILES_POR_CUENTA = 10;",
        "  const perfilDelSaldo = (userId: string, docs: CreditDocSnap[]): CreditDocSnap | undefined => {",
        "    const suyos = docs.filter((d) => esElPerfilDeLaCuenta(userId, d));",
        "    return suyos.find((d) => typeof (d.data() || {}).creditsBalance === 'number') ?? suyos[0];",
        "  };",
        "",
        "  /** Perfil real de la persona (uid == auth uid). Los Credits son por cuenta, no por identidad. */",
        "  const findAccount = async (tx: CreditTx, userId: string): Promise<CreditDocSnap> => {",
        "    const snap = await tx.get(users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA));",
        "    const perfil = perfilDelSaldo(userId, snap.docs);",
        "    if (!perfil) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });",
        "    }",
        "    return perfil;",
        "  };"
      ]
    },
    {
      "eran": [
        "      const initialized = typeof data.creditsBalance === 'number';",
        "      const legacy = initialized ? null : await tx.get(db().collection('wallets').doc(userId));",
        "      const welcomeDoc = welcome > 0 ? await tx.get(transactions().doc(welcomeTransactionId(userId))) : null;"
      ],
      "quedan": [
        "      const initialized = typeof data.creditsBalance === 'number';",
        "      /*",
        "       * La billetera antigua se migra UNA vez por cuenta, no una vez por perfil: si",
        "       * ya hay un `migration_<uid>`, no se vuelve a acreditar (antes se sobrescribía).",
        "       */",
        "      const yaMigrada = initialized ? true : (await tx.get(transactions().doc(migrationTransactionId(userId)))).exists;",
        "      const legacy = initialized || yaMigrada ? null : await tx.get(db().collection('wallets').doc(userId));",
        "      const welcomeDoc = welcome > 0 ? await tx.get(transactions().doc(welcomeTransactionId(userId))) : null;"
      ]
    },
    {
      "eran": [
        "    const userId = assertUserId(rawUserId);",
        "    const snap = await users().where('uid', '==', userId).limit(1).get();",
        "    if (snap.empty || !esElPerfilDeLaCuenta(userId, snap.docs[0])) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });",
        "    }",
        "    const data = snap.docs[0].data() || {};",
        "    if (typeof data.creditsBalance !== 'number') {"
      ],
      "quedan": [
        "    const userId = assertUserId(rawUserId);",
        "    const snap = await users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA).get();",
        "    const perfil = perfilDelSaldo(userId, snap.docs);",
        "    if (!perfil) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });",
        "    }",
        "    const data = perfil.data() || {};",
        "    if (typeof data.creditsBalance !== 'number') {"
      ]
    },
    {
      "eran": [
        "    }",
        "    return balanceOf(snap.docs[0]);",
        "  };"
      ],
      "quedan": [
        "    }",
        "    return balanceOf(perfil);",
        "  };"
      ]
    }
  ]
};
/*
 * Y EL CIERRE POST-AUDITORÍA DEL 2026-10-01, con la misma forma: bloques EXACTOS sacados del diff real entre el
 * estado que dejó la revisión de arriba y el árbol de hoy (copiados del archivo, no reescritos), cada uno único
 * en el texto sobre el que se aplica, y aplicados DESPUÉS de los de la revisión. Lo que entró y su porqué:
 *  · creditEngine.ts — `readBalance` (money/admin-balance-con-efecto): el saldo de una cuenta, SOLO LEYENDO. Lo usa
 *    `creditsAdmin` · `balance`, que antes llamaba a `getBalance` → `ensureAccount` y, al consultar una cuenta sin
 *    inicializar, le migraba la billetera antigua y le regalaba la bienvenida. Mismo perfil del saldo
 *    (`perfilDelSaldo`, `PERFILES_POR_CUENTA`), ninguna escritura; y una palabra más en el objeto que devuelve el
 *    motor. Ni gasto, ni completar, ni reembolso, ni idempotencia, ni precios.
 *  · creditValidation.ts — `toHttpsError` (money/error-interno-al-cliente): un error que NO es un CreditError ya no
 *    le manda al cliente su mensaje crudo; sale `internal` · 'INTERNAL' y la causa queda en el registro, saneada con
 *    `sanitizeForLog` (engine/sanitize.ts). Los CreditError se traducen exactamente igual que antes.
 * Cualquier otro cambio —dentro o fuera de estos bloques— hace caer 63p.
 */
export const REVISION_CIERRE = {
  "functions/src/credits/creditEngine.ts": [
    {
      "eran": [
        "  };",
        "",
        "  /**",
        "   * ¿ES LA RESERVA GUARDADA LA DE ESTA OPERACIÓN?"
      ],
      "quedan": [
        "  };",
        "",
        "  /**",
        "   * EL SALDO, SOLO LEYENDO (cierre post-auditoría 2026-10-01, money/admin-balance-con-efecto).",
        "   *",
        "   * `getBalance` es la puerta de la app: si la cuenta no está inicializada, la inicializa",
        "   * (`ensureAccount`: migra la billetera antigua y da la bienvenida). Eso está bien cuando",
        "   * es la persona quien abre su saldo, y mal cuando es una CONSULTA de administración: mirar",
        "   * el saldo de alguien no puede regalarle la bienvenida ni migrarle nada. Esta lectura no",
        "   * escribe nunca: una cuenta sin inicializar se contesta con 0 y `initialized: false`.",
        "   */",
        "  const readBalance = async (rawUserId: string): Promise<AccountBalance & { initialized: boolean }> => {",
        "    const userId = assertUserId(rawUserId);",
        "    const snap = await users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA).get();",
        "    const perfil = perfilDelSaldo(userId, snap.docs);",
        "    if (!perfil) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });",
        "    }",
        "    if (typeof (perfil.data() || {}).creditsBalance !== 'number') {",
        "      return { userId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, initialized: false };",
        "    }",
        "    return { ...balanceOf(perfil), initialized: true };",
        "  };",
        "",
        "  /**",
        "   * ¿ES LA RESERVA GUARDADA LA DE ESTA OPERACIÓN?"
      ]
    },
    {
      "eran": [
        "",
        "  return { ensureAccount, getBalance, spendCredits, completeCredits, refundCredits, grantCredits, getCreditHistory, getCreditCost: getCost, CREDIT_FIELDS };",
        "}"
      ],
      "quedan": [
        "",
        "  return { ensureAccount, getBalance, readBalance, spendCredits, completeCredits, refundCredits, grantCredits, getCreditHistory, getCreditCost: getCost, CREDIT_FIELDS };",
        "}"
      ]
    }
  ],
  "functions/src/credits/creditValidation.ts": [
    {
      "eran": [
        "import { esIdDeCuenta } from '../core/identity';",
        ""
      ],
      "quedan": [
        "import { esIdDeCuenta } from '../core/identity';",
        "import { sanitizeForLog } from '../engine/sanitize';",
        ""
      ]
    },
    {
      "eran": [
        "  }",
        "  const message = error instanceof Error ? error.message : String(error);",
        "  return new HttpsError('internal', message);",
        "};"
      ],
      "quedan": [
        "  }",
        "  /*",
        "   * UN ERROR QUE NO ES DE CREDITS NO LE CUENTA NADA AL CLIENTE (cierre post-auditoría 2026-10-01,",
        "   * money/error-interno-al-cliente). Antes viajaba su mensaje crudo —el de Firestore, una ruta, un",
        "   * identificador, lo que fuera—. Ahora sale un código genérico y lo interno se queda en el registro",
        "   * del servidor, saneado con el mismo saneador que el resto (`engine/sanitize.ts`). Es la forma de",
        "   * `moderation/index.ts` (`aHttpsError`).",
        "   */",
        "  console.error('CREDITS: fallo interno', sanitizeForLog(error, 300));",
        "  return new HttpsError('internal', 'INTERNAL');",
        "};"
      ]
    }
  ]
};

/*
 * Y LA F-06 (2026-10-14, «el saldo de Credits es público»; plan aprobado en ronda-r9/LANZAMIENTO/f06-plan.md):
 * bloques EXACTOS generados del diff real entre origin/main (= el estado que dejan los bloques de arriba) y el árbol
 * de la rama f06/saldo-privado, cada uno único en el texto sobre el que se aplica, aplicados DESPUÉS del cierre.
 * Lo que entra y su porqué:
 *  · el saldo se muda de `users/{id}` (público) a `creditAccounts/{uid}` (solo su dueño) por fases (`FaseSaldo`:
 *    sombra · cuenta · contrato, variable CREDITS_FASE_SALDO, por defecto cuenta); `findAccount` pasa a
 *    `cargarCuenta` (lee los dos sitios), las cinco escrituras del saldo pasan a `escribirSaldo` (los dos sitios en la
 *    MISMA transacción, o solo el privado en contrato) y la migración perezosa es `sincronizarSiHaceFalta`;
 *  · `perfilQueGuardaElSaldo` y `PERFILES_POR_CUENTA` salen del cierre para que los scripts elijan el MISMO perfil.
 * Ni precios, ni idempotencia (`esLaMismaOperacion` intacta), ni libro, ni bienvenida, ni `migration_<uid>`.
 * Lo prueban credits-saldo-privado.test.mjs (en la cadena) y saldo-privado.emulator.mjs (carreras reales).
 */
export const REVISION_F06 = {
  "functions/src/credits/creditEngine.ts": [
    {
      "eran": [
        " *",
        " * Único responsable de leer y mover Credits. El saldo vive en el perfil real",
        " * de la persona (users/{doc con uid == auth.uid}: creditsBalance,",
        " * creditsLifetimeEarned, creditsLifetimeSpent) y cada movimiento queda en",
        " * creditTransactions/{id}. Todo cambio de saldo ocurre dentro de una",
        " * transacción de Firestore; el saldo nunca baja de cero; cada operación tiene",
        " * un id determinista (requestId) para que repetirla no cobre dos veces.",
        " */"
      ],
      "quedan": [
        " *",
        " * Único responsable de leer y mover Credits. El saldo de una cuenta vive en",
        " * `creditAccounts/{uid de la cuenta}` (F-06: solo lo lee su dueño y solo lo",
        " * escribe el servidor) y cada movimiento queda en creditTransactions/{id}.",
        " * Hasta la F-06 vivía en el perfil real (users/{doc con uid == auth.uid}:",
        " * creditsBalance, creditsLifetimeEarned, creditsLifetimeSpent), que es un",
        " * documento PÚBLICO; la mudanza va por fases (ver `FaseSaldo`). Todo cambio de",
        " * saldo ocurre dentro de una transacción de Firestore; el saldo nunca baja de",
        " * cero; cada operación tiene un id determinista (requestId) para que repetirla",
        " * no cobre dos veces.",
        " */"
      ]
    },
    {
      "eran": [
        "  loadCosts?: () => Promise<unknown>;",
        "}"
      ],
      "quedan": [
        "  loadCosts?: () => Promise<unknown>;",
        "  /** En qué fase de la mudanza del saldo está el motor (F-06). Por defecto, la del entorno. */",
        "  faseSaldo?: FaseSaldo;",
        "}"
      ]
    },
    {
      "eran": [
        "",
        "// ── Contratos ──"
      ],
      "quedan": [
        "",
        "/**",
        " * LA MUDANZA DEL SALDO (F-06), POR FASES: expandir → migrar → contraer.",
        " *",
        " * `users/{id}` es PÚBLICO (`allow read: if true`: el muro pinta nombre y foto",
        " * sin sesión) y llevaba el saldo. El saldo se muda a `creditAccounts/{uid}`,",
        " * que solo lee su dueño. Sin cortar a nadie a la mitad:",
        " *",
        " *  · `sombra` (P2): el PERFIL sigue mandando; el motor escribe ADEMÁS",
        " *    `creditAccounts` en la misma transacción. Quitar este despliegue no rompe",
        " *    nada: `creditAccounts` se ignora.",
        " *  · `cuenta` (P4): manda `creditAccounts`; si una cuenta aún no lo tiene, se",
        " *    migra PEREZOSAMENTE dentro de la misma transacción que la usa. El perfil",
        " *    se sigue ESPEJANDO para las apps viejas, que leen el saldo de ahí.",
        " *  · `contrato` (P6, SOLO PREPARADO): manda `creditAccounts` y el perfil ya no",
        " *    se escribe. Rompe las apps viejas (verían 0), así que solo se activa a",
        " *    propósito (`CREDITS_FASE_SALDO=contrato`) y tras el script de P6.",
        " *",
        " * En `sombra` y `cuenta` cada operación lee y escribe LOS DOS documentos en la",
        " * misma transacción, así que mezclar instancias de las dos fases durante un",
        " * despliegue es seguro: solo deciden quién gana si alguna vez difieren.",
        " * `creditTransactions`, los ids deterministas (requestId), la bienvenida y",
        " * `migration_<uid>` no cambian en ninguna fase: la idempotencia cruza el giro.",
        " */",
        "export type FaseSaldo = 'sombra' | 'cuenta' | 'contrato';",
        "export const FASES_SALDO: readonly FaseSaldo[] = Object.freeze(['sombra', 'cuenta', 'contrato'] as FaseSaldo[]);",
        "/** La fase de este código cuando nadie dice otra. P4: manda `creditAccounts` y se espeja el perfil. */",
        "export const FASE_SALDO_POR_DEFECTO: FaseSaldo = 'cuenta';",
        "/** La fase del entorno (`CREDITS_FASE_SALDO`). Un valor que no es una fase cae en la de por defecto, nunca en `contrato`. */",
        "export const faseSaldoDelEntorno = (valor: string | undefined = process.env.CREDITS_FASE_SALDO): FaseSaldo => {",
        "  const limpio = String(valor ?? '').trim().toLowerCase();",
        "  return (FASES_SALDO as readonly string[]).includes(limpio) ? (limpio as FaseSaldo) : FASE_SALDO_POR_DEFECTO;",
        "};",
        "/** La colección del saldo privado: un documento por cuenta, id = uid de Firebase Auth. */",
        "export const COLECCION_SALDO = 'creditAccounts';",
        "",
        "// ── Contratos ──"
      ]
    },
    {
      "eran": [
        "",
        "export function createCreditEngine(deps: CreditEngineDeps) {"
      ],
      "quedan": [
        "",
        "/*",
        " * EL DOCUMENTO QUE GUARDA EL SALDO TIENE QUE SER EL PERFIL REAL DE ESA CUENTA",
        " * (Fase 11.x-4A). Lo decide el resolutor canónico, el mismo de ËContact y del",
        " * push: el documento dice ser esa identidad y es de tipo real. Un documento",
        " * que diga otra cosa —otro tipo, otro uid— no guarda Credits de nadie.",
        " */",
        "const esElPerfilDeLaCuenta = (userId: string, account: { data(): Record<string, any> | undefined }): boolean =>",
        "  cuentaDeIdentidad(userId, (account.data() || {}) as PerfilDeIdentidad) === userId;",
        "",
        "/** Cuántos perfiles de una cuenta se miran a la vez (consulta por `uid`). */",
        "export const PERFILES_POR_CUENTA = 10;",
        "",
        "/*",
        " * QUÉ PERFIL GUARDA EL SALDO CUANDO HAY MÁS DE UNO (revisión post-auditoría 2026-10-01,",
        " * money/remigracion-por-segundo-perfil).",
        " *",
        " * Una cuenta puede tener más de un Perfil Real: en producción hay cuentas así",
        " * (utils/perfilCanonico.ts), y las reglas dejan crear `users/<uid>` aunque ya",
        " * exista uno con id automático, porque no pueden consultar. Firestore devuelve",
        " * la consulta por `uid` ordenada por id de documento; quedarse con «el primero»",
        " * podía saltar a un perfil vacío y dejar el saldo de verdad inalcanzable (y",
        " * `ensureAccount` volvía a migrar la billetera antigua). El saldo vive en el",
        " * perfil que YA está inicializado: ese manda. Si ninguno lo está, el primero,",
        " * como siempre; si varios lo están, el primero de ellos, como siempre.",
        " *",
        " * Exportada (F-06) para que los scripts de migración elijan EXACTAMENTE el",
        " * mismo perfil que el motor.",
        " */",
        "export const perfilQueGuardaElSaldo = <T extends { data(): Record<string, any> | undefined }>(userId: string, docs: T[]): T | undefined => {",
        "  const suyos = docs.filter((d) => esElPerfilDeLaCuenta(userId, d));",
        "  return suyos.find((d) => typeof (d.data() || {}).creditsBalance === 'number') ?? suyos[0];",
        "};",
        "",
        "export function createCreditEngine(deps: CreditEngineDeps) {"
      ]
    },
    {
      "eran": [
        "  const loadCosts = deps.loadCosts ?? loadCostOverrides;",
        ""
      ],
      "quedan": [
        "  const loadCosts = deps.loadCosts ?? loadCostOverrides;",
        "  const fase: FaseSaldo = deps.faseSaldo ?? faseSaldoDelEntorno();",
        ""
      ]
    },
    {
      "eran": [
        "  const users = () => db().collection('users');",
        "  const transactions = () => db().collection('creditTransactions');"
      ],
      "quedan": [
        "  const users = () => db().collection('users');",
        "  const saldos = () => db().collection(COLECCION_SALDO);",
        "  const transactions = () => db().collection('creditTransactions');"
      ]
    },
    {
      "eran": [
        "",
        "  /*",
        "   * EL DOCUMENTO QUE GUARDA EL SALDO TIENE QUE SER EL PERFIL REAL DE ESA CUENTA",
        "   * (Fase 11.x-4A). Lo decide el resolutor canónico, el mismo de ËContact y del",
        "   * push: el documento dice ser esa identidad y es de tipo real. Un documento",
        "   * que diga otra cosa —otro tipo, otro uid— no guarda Credits de nadie.",
        "   */",
        "  const esElPerfilDeLaCuenta = (userId: string, account: CreditDocSnap): boolean =>",
        "    cuentaDeIdentidad(userId, (account.data() || {}) as PerfilDeIdentidad) === userId;",
        ""
      ],
      "quedan": [
        "",
        "  /** El perfil que guarda (o guardaba) el saldo: la misma regla que usan los scripts de la F-06. */",
        "  const perfilDelSaldo = perfilQueGuardaElSaldo;",
        ""
      ]
    },
    {
      "eran": [
        "  /*",
        "   * QUÉ PERFIL GUARDA EL SALDO CUANDO HAY MÁS DE UNO (revisión post-auditoría 2026-10-01,",
        "   * money/remigracion-por-segundo-perfil).",
        "   *"
      ],
      "quedan": [
        "  /*",
        "   * LA CUENTA DE CREDITS DE UNA PERSONA, LEÍDA DE SUS DOS SITIOS (F-06).",
        "   *",
        "   * `creditAccounts/{uid}` (el sitio privado) y el Perfil Real (el sitio",
        "   * público de antes). Cuál manda lo dice la fase; en `sombra` y `cuenta` se",
        "   * leen siempre los dos para poder escribir los dos en la misma transacción.",
        "   * En `contrato` el perfil solo se lee si la cuenta aún no tiene su documento",
        "   * privado: es la migración perezosa de una cuenta que nunca se movió.",
        "   *"
      ]
    },
    {
      "eran": [
        "   *",
        "   * Una cuenta puede tener más de un Perfil Real: en producción hay cuentas así",
        "   * (utils/perfilCanonico.ts), y las reglas dejan crear `users/<uid>` aunque ya",
        "   * exista uno con id automático, porque no pueden consultar. Firestore devuelve",
        "   * la consulta por `uid` ordenada por id de documento; quedarse con «el primero»",
        "   * podía saltar a un perfil vacío y dejar el saldo de verdad inalcanzable (y",
        "   * `ensureAccount` volvía a migrar la billetera antigua). El saldo vive en el",
        "   * perfil que YA está inicializado: ese manda. Si ninguno lo está, el primero,",
        "   * como siempre; si varios lo están, el primero de ellos, como siempre.",
        "   */"
      ],
      "quedan": [
        "   *",
        "   * Sin documento privado inicializado hace falta el Perfil Real, como hasta",
        "   * ahora (`ACCOUNT_NOT_FOUND` si no lo hay): un uid sin perfil no guarda",
        "   * Credits de nadie, y una cara Weë tampoco.",
        "   */"
      ]
    },
    {
      "eran": [
        "   */",
        "  const PERFILES_POR_CUENTA = 10;",
        "  const perfilDelSaldo = (userId: string, docs: CreditDocSnap[]): CreditDocSnap | undefined => {",
        "    const suyos = docs.filter((d) => esElPerfilDeLaCuenta(userId, d));",
        "    return suyos.find((d) => typeof (d.data() || {}).creditsBalance === 'number') ?? suyos[0];",
        "  };",
        ""
      ],
      "quedan": [
        "   */",
        "  type Lector = Pick<CreditTx, 'get'>;",
        "  interface Estado { initialized: boolean; balance: number; earned: number; spent: number; initializedAt?: unknown }",
        "  interface CuentaDeCredits {",
        "    userId: string;",
        "    ref: CreditDocRef;",
        "    existe: boolean;",
        "    /** Lo que hay guardado en `creditAccounts/{uid}`, tal cual. */",
        "    privado: Record<string, any>;",
        "    /** El Perfil Real que guarda (o guardaba) el saldo, si se leyó y existe. */",
        "    perfil?: CreditDocSnap;",
        "    /** El saldo que manda en esta fase. */",
        "    estado: Estado;",
        "    /** De dónde salió `estado`. */",
        "    origen: 'cuenta' | 'perfil' | 'ninguno';",
        "    /** Algún documento que se debe escribir no tiene ya el saldo que manda. */",
        "    desfasada: boolean;",
        "  }",
        "",
        "  const estadoDe = (data: Record<string, any> | undefined): Estado => {",
        "    const d = data || {};",
        "    return {",
        "      initialized: typeof d.creditsBalance === 'number',",
        "      balance: num(d.creditsBalance),",
        "      earned: num(d.creditsLifetimeEarned),",
        "      spent: num(d.creditsLifetimeSpent),",
        "      ...(d.creditsInitializedAt !== undefined ? { initializedAt: d.creditsInitializedAt } : {}),",
        "    };",
        "  };",
        "  const mismoSaldo = (a: Estado, b: Estado): boolean =>",
        "    a.initialized === b.initialized && a.balance === b.balance && a.earned === b.earned && a.spent === b.spent;",
        ""
      ]
    },
    {
      "eran": [
        "",
        "  /** Perfil real de la persona (uid == auth uid). Los Credits son por cuenta, no por identidad. */",
        "  const findAccount = async (tx: CreditTx, userId: string): Promise<CreditDocSnap> => {",
        "    const snap = await tx.get(users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA));",
        "    const perfil = perfilDelSaldo(userId, snap.docs);",
        "    if (!perfil) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });"
      ],
      "quedan": [
        "",
        "  const cargarCuenta = async (lector: Lector, userId: string): Promise<CuentaDeCredits> => {",
        "    const ref = saldos().doc(userId);",
        "    const snap = await lector.get(ref);",
        "    const privado = (snap.exists ? snap.data() : undefined) || {};",
        "    const enCuenta = estadoDe(privado);",
        "    let perfil: CreditDocSnap | undefined;",
        "    if (fase !== 'contrato' || !enCuenta.initialized) {",
        "      const consulta = await lector.get(users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA));",
        "      perfil = perfilDelSaldo(userId, consulta.docs);",
        "    }",
        "    if (!perfil && !enCuenta.initialized) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });"
      ]
    },
    {
      "eran": [
        "    }",
        "    return perfil;",
        "  };"
      ],
      "quedan": [
        "    }",
        "    const enPerfil = estadoDe(perfil?.data());",
        "    const mandaElPerfil = fase === 'sombra' ? enPerfil.initialized || !enCuenta.initialized : !enCuenta.initialized && enPerfil.initialized;",
        "    const estado = mandaElPerfil ? enPerfil : enCuenta;",
        "    const origen: CuentaDeCredits['origen'] = !estado.initialized ? 'ninguno' : mandaElPerfil ? 'perfil' : 'cuenta';",
        "    const desfasada = estado.initialized && (",
        "      !snap.exists || !mismoSaldo(enCuenta, estado) || privado.uid !== userId",
        "      || (fase !== 'contrato' && perfil !== undefined && !mismoSaldo(enPerfil, estado))",
        "    );",
        "    return { userId, ref, existe: snap.exists, privado, perfil, estado, origen, desfasada };",
        "  };",
        "",
        "  /*",
        "   * ESCRIBE EL SALDO DONDE CORRESPONDE EN ESTA FASE, dentro de la transacción.",
        "   * Siempre en `creditAccounts/{uid}`; en `sombra` y `cuenta`, además en el",
        "   * Perfil Real (el espejo que leen las apps viejas). Va después de todas las",
        "   * lecturas de la transacción, como exige Firestore.",
        "   */",
        "  const escribirSaldo = (tx: CreditTx, cuenta: CuentaDeCredits, valores: { balance: number; earned: number; spent: number; initializedAt?: unknown }) => {",
        "    const at = now();",
        "    const initializedAt = valores.initializedAt ?? cuenta.estado.initializedAt ?? cuenta.privado.creditsInitializedAt;",
        "    const campos = strip({",
        "      creditsBalance: valores.balance,",
        "      creditsLifetimeEarned: valores.earned,",
        "      creditsLifetimeSpent: valores.spent,",
        "      creditsInitializedAt: initializedAt,",
        "    });",
        "    tx.set(cuenta.ref, strip({",
        "      ...campos,",
        "      uid: cuenta.userId,",
        "      profileRef: cuenta.perfil?.id ?? cuenta.privado.profileRef,",
        "      ...(!cuenta.existe ? { creadoAt: at, creadoDesde: cuenta.origen === 'perfil' ? 'perfil' : 'motor' } : {}),",
        "      updatedAt: at,",
        "    }), { merge: true });",
        "    if (fase !== 'contrato' && cuenta.perfil) {",
        "      tx.update(cuenta.perfil.ref, { ...campos, updatedAt: at });",
        "    }",
        "  };"
      ]
    },
    {
      "eran": [
        "",
        "  const balanceOf = (account: CreditDocSnap): AccountBalance => {",
        "    const data = account.data() || {};",
        "    return {",
        "      userId: String(data.uid),",
        "      balance: num(data.creditsBalance),",
        "      lifetimeEarned: num(data.creditsLifetimeEarned),",
        "      lifetimeSpent: num(data.creditsLifetimeSpent),",
        "    };",
        "  };"
      ],
      "quedan": [
        "",
        "  /** Ajusta los documentos que se quedaron atrás sin mover un Credit (migración perezosa). */",
        "  const sincronizarSiHaceFalta = (tx: CreditTx, cuenta: CuentaDeCredits) => {",
        "    if (!cuenta.desfasada) return;",
        "    escribirSaldo(tx, cuenta, { balance: cuenta.estado.balance, earned: cuenta.estado.earned, spent: cuenta.estado.spent });",
        "  };"
      ]
    },
    {
      "eran": [
        "",
        "  const writeStats = (tx: CreditTx, delta: StatsDelta) => {"
      ],
      "quedan": [
        "",
        "  const balanceOf = (cuenta: CuentaDeCredits): AccountBalance => ({",
        "    userId: cuenta.userId,",
        "    balance: cuenta.estado.balance,",
        "    lifetimeEarned: cuenta.estado.earned,",
        "    lifetimeSpent: cuenta.estado.spent,",
        "  });",
        "",
        "  const sinTransaccion: Lector = { get: ((target: CreditDocRef | CreditQuery) => target.get()) as CreditTx['get'] };",
        "",
        "  const writeStats = (tx: CreditTx, delta: StatsDelta) => {"
      ]
    },
    {
      "eran": [
        "    return db().runTransaction(async (tx) => {",
        "      const account = await findAccount(tx, userId);",
        "      const data = account.data() || {};",
        "      const initialized = typeof data.creditsBalance === 'number';",
        "      /*"
      ],
      "quedan": [
        "    return db().runTransaction(async (tx) => {",
        "      const cuenta = await cargarCuenta(tx, userId);",
        "      const initialized = cuenta.estado.initialized;",
        "      /*"
      ]
    },
    {
      "eran": [
        "",
        "      let balance = num(data.creditsBalance);",
        "      let earned = num(data.creditsLifetimeEarned);",
        "      let spent = num(data.creditsLifetimeSpent);",
        "      let migrated = 0;"
      ],
      "quedan": [
        "",
        "      let balance = cuenta.estado.balance;",
        "      let earned = cuenta.estado.earned;",
        "      let spent = cuenta.estado.spent;",
        "      let migrated = 0;"
      ]
    },
    {
      "eran": [
        "      let grantCount = 0;",
        "      const patch: Record<string, unknown> = {};",
        ""
      ],
      "quedan": [
        "      let grantCount = 0;",
        "      let initializedAt: unknown;",
        ""
      ]
    },
    {
      "eran": [
        "        spent = Math.max(0, Math.floor(num(wallet.totalSpent)));",
        "        patch.creditsInitializedAt = now();",
        "        if (migrated > 0) {"
      ],
      "quedan": [
        "        spent = Math.max(0, Math.floor(num(wallet.totalSpent)));",
        "        initializedAt = now();",
        "        if (migrated > 0) {"
      ]
    },
    {
      "eran": [
        "      if (!initialized || welcomeGranted) {",
        "        tx.update(account.ref, { ...patch, creditsBalance: balance, creditsLifetimeEarned: earned, creditsLifetimeSpent: spent, updatedAt: now() });",
        "      }"
      ],
      "quedan": [
        "      if (!initialized || welcomeGranted) {",
        "        escribirSaldo(tx, cuenta, { balance, earned, spent, initializedAt });",
        "      } else {",
        "        // Ningún Credit se mueve; pero si la cuenta aún no tiene su documento privado (o el espejo se quedó atrás), se migra aquí.",
        "        sincronizarSiHaceFalta(tx, cuenta);",
        "      }"
      ]
    },
    {
      "eran": [
        "    const userId = assertUserId(rawUserId);",
        "    const snap = await users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA).get();",
        "    const perfil = perfilDelSaldo(userId, snap.docs);",
        "    if (!perfil) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });",
        "    }",
        "    const data = perfil.data() || {};",
        "    if (typeof data.creditsBalance !== 'number') {",
        "      const created = await ensureAccount(userId);"
      ],
      "quedan": [
        "    const userId = assertUserId(rawUserId);",
        "    const cuenta = await cargarCuenta(sinTransaccion, userId);",
        "    /*",
        "     * Sin inicializar: se inicializa. Inicializada pero sin su documento privado",
        "     * (o con el espejo atrás): se migra en una transacción. Las dos cosas las hace",
        "     * `ensureAccount`, que vuelve a leer dentro de la transacción y es idempotente.",
        "     */",
        "    if (!cuenta.estado.initialized || cuenta.desfasada) {",
        "      const created = await ensureAccount(userId);"
      ]
    },
    {
      "eran": [
        "    }",
        "    return balanceOf(perfil);",
        "  };"
      ],
      "quedan": [
        "    }",
        "    return balanceOf(cuenta);",
        "  };"
      ]
    },
    {
      "eran": [
        "    const userId = assertUserId(rawUserId);",
        "    const snap = await users().where('uid', '==', userId).limit(PERFILES_POR_CUENTA).get();",
        "    const perfil = perfilDelSaldo(userId, snap.docs);",
        "    if (!perfil) {",
        "      throw new CreditError('ACCOUNT_NOT_FOUND', 'No encontramos el perfil de esta cuenta', { userId });",
        "    }",
        "    if (typeof (perfil.data() || {}).creditsBalance !== 'number') {",
        "      return { userId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, initialized: false };"
      ],
      "quedan": [
        "    const userId = assertUserId(rawUserId);",
        "    const cuenta = await cargarCuenta(sinTransaccion, userId);",
        "    if (!cuenta.estado.initialized) {",
        "      return { userId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, initialized: false };"
      ]
    },
    {
      "eran": [
        "    }",
        "    return { ...balanceOf(perfil), initialized: true };",
        "  };"
      ],
      "quedan": [
        "    }",
        "    return { ...balanceOf(cuenta), initialized: true };",
        "  };"
      ]
    },
    {
      "eran": [
        "",
        "      const account = await findAccount(tx, userId);",
        "      const current = balanceOf(account);",
        "      if (typeof (account.data() || {}).creditsBalance !== 'number') {",
        "        throw new CreditError('ACCOUNT_NOT_FOUND', 'La cuenta de Credits todavía no está inicializada', { userId });"
      ],
      "quedan": [
        "",
        "      const cuenta = await cargarCuenta(tx, userId);",
        "      const current = balanceOf(cuenta);",
        "      if (!cuenta.estado.initialized) {",
        "        throw new CreditError('ACCOUNT_NOT_FOUND', 'La cuenta de Credits todavía no está inicializada', { userId });"
      ]
    },
    {
      "eran": [
        "      });",
        "      tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: current.lifetimeSpent + amount, updatedAt: now() });",
        "      writeStats(tx, { totalSpent: amount, circulating: -amount, byService: { [service]: { spent: amount, count: 1 } }, transactions: { usage: 1 } });"
      ],
      "quedan": [
        "      });",
        "      escribirSaldo(tx, cuenta, { balance: balanceAfter, earned: current.lifetimeEarned, spent: current.lifetimeSpent + amount });",
        "      writeStats(tx, { totalSpent: amount, circulating: -amount, byService: { [service]: { spent: amount, count: 1 } }, transactions: { usage: 1 } });"
      ]
    },
    {
      "eran": [
        "      const diff = authorized - final;",
        "      const account = await findAccount(tx, userId);",
        "      const current = balanceOf(account);",
        ""
      ],
      "quedan": [
        "      const diff = authorized - final;",
        "      const cuenta = await cargarCuenta(tx, userId);",
        "      const current = balanceOf(cuenta);",
        ""
      ]
    },
    {
      "eran": [
        "        });",
        "        tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: Math.max(0, current.lifetimeSpent - diff), updatedAt: now() });",
        "        writeStats(tx, { totalRefunded: diff, circulating: diff, byService: data.service ? { [data.service as CreditService]: { refunded: diff } } : undefined, transactions: { refund: 1 } });"
      ],
      "quedan": [
        "        });",
        "        escribirSaldo(tx, cuenta, { balance: balanceAfter, earned: current.lifetimeEarned, spent: Math.max(0, current.lifetimeSpent - diff) });",
        "        writeStats(tx, { totalRefunded: diff, circulating: diff, byService: data.service ? { [data.service as CreditService]: { refunded: diff } } : undefined, transactions: { refund: 1 } });"
      ]
    },
    {
      "eran": [
        "        writeStats(tx, { totalRefunded: diff, circulating: diff, byService: data.service ? { [data.service as CreditService]: { refunded: diff } } : undefined, transactions: { refund: 1 } });",
        "      }"
      ],
      "quedan": [
        "        writeStats(tx, { totalRefunded: diff, circulating: diff, byService: data.service ? { [data.service as CreditService]: { refunded: diff } } : undefined, transactions: { refund: 1 } });",
        "      } else {",
        "        sincronizarSiHaceFalta(tx, cuenta);",
        "      }"
      ]
    },
    {
      "eran": [
        "      const amount = Math.max(0, authorized - alreadyAdjusted);",
        "      const account = await findAccount(tx, userId);",
        "      const current = balanceOf(account);",
        "      const balanceAfter = current.balance + amount;"
      ],
      "quedan": [
        "      const amount = Math.max(0, authorized - alreadyAdjusted);",
        "      const cuenta = await cargarCuenta(tx, userId);",
        "      const current = balanceOf(cuenta);",
        "      const balanceAfter = current.balance + amount;"
      ]
    },
    {
      "eran": [
        "      if (amount > 0) {",
        "        tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeSpent: Math.max(0, current.lifetimeSpent - amount), updatedAt: now() });",
        "      }"
      ],
      "quedan": [
        "      if (amount > 0) {",
        "        escribirSaldo(tx, cuenta, { balance: balanceAfter, earned: current.lifetimeEarned, spent: Math.max(0, current.lifetimeSpent - amount) });",
        "      } else {",
        "        sincronizarSiHaceFalta(tx, cuenta);",
        "      }"
      ]
    },
    {
      "eran": [
        "      }",
        "      const account = await findAccount(tx, userId);",
        "      const current = balanceOf(account);",
        "      const balanceAfter = current.balance + amount;"
      ],
      "quedan": [
        "      }",
        "      const cuenta = await cargarCuenta(tx, userId);",
        "      const current = balanceOf(cuenta);",
        "      const balanceAfter = current.balance + amount;"
      ]
    },
    {
      "eran": [
        "      });",
        "      tx.update(account.ref, { creditsBalance: balanceAfter, creditsLifetimeEarned: current.lifetimeEarned + amount, updatedAt: now() });",
        "      writeStats(tx, {"
      ],
      "quedan": [
        "      });",
        "      escribirSaldo(tx, cuenta, { balance: balanceAfter, earned: current.lifetimeEarned + amount, spent: current.lifetimeSpent });",
        "      writeStats(tx, {"
      ]
    },
    {
      "eran": [
        "",
        "  return { ensureAccount, getBalance, readBalance, spendCredits, completeCredits, refundCredits, grantCredits, getCreditHistory, getCreditCost: getCost, CREDIT_FIELDS };",
        "}"
      ],
      "quedan": [
        "",
        "  return { ensureAccount, getBalance, readBalance, spendCredits, completeCredits, refundCredits, grantCredits, getCreditHistory, getCreditCost: getCost, CREDIT_FIELDS, faseSaldo: fase };",
        "}"
      ]
    }
  ]
};

/*
 * GRAN MOTOR (2026-10-16) · lo autorizado DESPUÉS de F-06 en `creditEngine.ts`, aplicado el último. Solo datos.
 * Tres bloques exactos, cada uno único en el texto sobre el que se aplica:
 *  · C-2 (paquete C): un importe final que no es un número se rechaza (`INVALID_AMOUNT`) antes de tocar nada;
 *  · L-5 (paquete D): `completeCredits` devuelve además `duplicate` —true si fue una repetición sobre una reserva que
 *    ya no estaba AUTHORIZED, false si cobró de verdad—. Campo opcional y aditivo; el dinero, la idempotencia y los
 *    estados no cambian. Lo prueban gran-motor-c-creditos y gran-motor-d-workflow.
 */
export const REVISION_GRAN_MOTOR = {
  "functions/src/credits/creditEngine.ts": [
    {
      "eran": [
        "  const completeCredits = async (input: CompleteInput): Promise<{ status: TransactionStatus; refunded: number; balanceAfter: number }> => {",
        "    const userId = assertUserId(input.userId);",
        "    const requestId = assertRequestId(input.requestId);"
      ],
      "quedan": [
        "  /* Gran Motor · D (L-5): `duplicate` dice si esta llamada fue una repetición (la reserva ya no estaba AUTHORIZED) o la que cobró de verdad. Campo opcional y aditivo: quien no lo lee no cambia. */",
        "  const completeCredits = async (input: CompleteInput): Promise<{ status: TransactionStatus; refunded: number; balanceAfter: number; duplicate?: boolean }> => {",
        "    const userId = assertUserId(input.userId);",
        "    const requestId = assertRequestId(input.requestId);",
        "    /* Gran Motor · C-2: un importe final que no es un número (NaN) no se interpreta: antes dejaba el asiento COMPLETED con `finalAmount: NaN` y la diferencia sin devolver. Se rechaza sin tocar nada. */",
        "    if (input.finalAmount !== undefined && Number.isNaN(Number(input.finalAmount))) throw new CreditError('INVALID_AMOUNT', 'El importe final debe ser un número', { requestId });"
      ]
    },
    {
      "eran": [
        "        return { status, refunded: 0, balanceAfter: num(data.balanceAfter) };"
      ],
      "quedan": [
        "        return { status, refunded: 0, balanceAfter: num(data.balanceAfter), duplicate: true };"
      ]
    },
    {
      "eran": [
        "      return { status: 'COMPLETED', refunded: diff, balanceAfter };"
      ],
      "quedan": [
        "      return { status: 'COMPLETED', refunded: diff, balanceAfter, duplicate: false };"
      ]
    }
  ]
};
