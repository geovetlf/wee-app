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

/*
 * µCREDITS (autorización formal del dueño, 2026-11-07: «Está autorizado modificar el código del Credits Engine en una
 * rama independiente»). La precisión fraccionaria del MISMO saldo, solo para la traducción (`SERVICIOS_MICRO`):
 *   · creditEngine.ts: `fraccion`, `spentMicro` y `conMicro` en el estado del saldo (leídos, comparados y escritos con
 *     él, en las mismas fases y transacciones; una cuenta sin fracción no recibe ningún campo nuevo); `reservarMicro`,
 *     `liquidarMicro` y `devolverMicro` (mismo libro, mismos ids, misma idempotencia; liquidar por encima de lo
 *     autorizado se rechaza); `completeCredits` y `refundCredits` cierran en µCredits un asiento en µCredits (con
 *     importes enteros lo dejarían en 0); y la ruta de duplicado de `spendCredits` nunca toma un asiento en µCredits.
 *   · creditTransactions.ts: campos opcionales del asiento en µCredits y contadores de estadísticas aparte.
 * Ni precios, ni márgenes, ni límites, ni el catálogo, ni otra operación entera cambian. Lo demuestra
 * `credits-microcreditos.test.mjs` (casos, compatibilidad histórica, fases, concurrencia, fallos y 300 operaciones
 * aleatorias con la invariante «saldo = suma exacta del libro»). Generados del diff y comprobados por simulación: aplicados
 * en orden sobre lo anterior dan el archivo de hoy byte a byte.
 */
export const REVISION_MICROCREDITOS = {
  "functions/src/credits/creditEngine.ts": [
    {
      "eran": [
        "import { CreditService, getCreditCost, loadCostOverrides, SERVICE_LABEL, WELCOME_CREDITS } from './creditCosts';",
        "import { assertAmount, assertFingerprint, assertLimit, assertRequestId, assertService, assertUserId, cleanText, CreditError } from './creditValidation';",
        "import { cuentaDeIdentidad, PerfilDeIdentidad } from '../social/econtact';",
        "import {",
        "  adjustmentTransactionId,",
        "  CreditTransaction,"
      ],
      "quedan": [
        "import { CreditService, getCreditCost, loadCostOverrides, SERVICE_LABEL, WELCOME_CREDITS } from './creditCosts';",
        "import { assertAmount, assertFingerprint, assertLimit, assertRequestId, assertService, assertUserId, cleanText, CreditError } from './creditValidation';",
        "import { cuentaDeIdentidad, PerfilDeIdentidad } from '../social/econtact';",
        "import { assertImporteMicro, assertServicioMicro, ETIQUETA_DE_SERVICIO_MICRO, fraccionGuardada, partirMicro, ServicioMicro, totalMicro } from './microCreditos';",
        "import {",
        "  adjustmentTransactionId,",
        "  CreditTransaction,"
      ]
    },
    {
      "eran": [
        "  balance: number;",
        "  lifetimeEarned: number;",
        "  lifetimeSpent: number;",
        "}",
        "",
        "export interface SpendInput {"
      ],
      "quedan": [
        "  balance: number;",
        "  lifetimeEarned: number;",
        "  lifetimeSpent: number;",
        "  /*",
        "   * µCREDITS (2026-11-07). Solo aparecen si la cuenta movió alguna vez una fracción (`microCreditos.ts`): una cuenta que",
        "   * nunca la tuvo devuelve EXACTAMENTE los cuatro campos de siempre. `balance` sigue siendo los Credits enteros.",
        "   */",
        "  fraccionMicro?: number;",
        "  balanceMicro?: number;",
        "  lifetimeSpentMicro?: number;",
        "}",
        "",
        "/** Reservar en µCredits: solo los servicios de `SERVICIOS_MICRO` (la traducción), y siempre con la huella de lo que se autorizó. */",
        "export interface ReservaMicroInput {",
        "  userId: string;",
        "  service: ServicioMicro;",
        "  requestId: string;",
        "  amountMicro: number;",
        "  fingerprint: string;",
        "  reason?: string;",
        "  source: string;",
        "  meta?: Record<string, unknown>;",
        "}",
        "",
        "export interface ReservaMicroResult {",
        "  transactionId: string;",
        "  status: TransactionStatus;",
        "  amountMicro: number;",
        "  balanceBeforeMicro: number;",
        "  balanceAfterMicro: number;",
        "  duplicate: boolean;",
        "  authorizedAt?: number;",
        "}",
        "",
        "export interface LiquidacionMicroResult {",
        "  status: TransactionStatus;",
        "  refundedMicro: number;",
        "  balanceAfterMicro: number;",
        "  duplicate: boolean;",
        "}",
        "",
        "export interface DevolucionMicroResult {",
        "  transactionId: string;",
        "  amountMicro: number;",
        "  balanceAfterMicro: number;",
        "  duplicate: boolean;",
        "}",
        "",
        "export interface SpendInput {"
      ]
    },
    {
      "eran": [
        "   * Credits de nadie, y una cara Weë tampoco.",
        "   */",
        "  type Lector = Pick<CreditTx, 'get'>;",
        "  interface Estado { initialized: boolean; balance: number; earned: number; spent: number; initializedAt?: unknown }",
        "  interface CuentaDeCredits {",
        "    userId: string;",
        "    ref: CreditDocRef;"
      ],
      "quedan": [
        "   * Credits de nadie, y una cara Weë tampoco.",
        "   */",
        "  type Lector = Pick<CreditTx, 'get'>;",
        "  /*",
        "   * `fraccion` y `spentMicro` son la parte en µCredits del MISMO saldo (`microCreditos.ts`); `conMicro` dice si el",
        "   * documento ya tiene esos campos. Una cuenta que nunca movió una fracción tiene `conMicro: false` y ceros, y ninguna",
        "   * escritura entera le añade los campos: sus documentos quedan exactamente como antes.",
        "   */",
        "  interface Estado { initialized: boolean; balance: number; earned: number; spent: number; fraccion: number; spentMicro: number; conMicro: boolean; initializedAt?: unknown }",
        "  interface CuentaDeCredits {",
        "    userId: string;",
        "    ref: CreditDocRef;"
      ]
    },
    {
      "eran": [
        "      balance: num(d.creditsBalance),",
        "      earned: num(d.creditsLifetimeEarned),",
        "      spent: num(d.creditsLifetimeSpent),",
        "      ...(d.creditsInitializedAt !== undefined ? { initializedAt: d.creditsInitializedAt } : {}),",
        "    };",
        "  };",
        "  const mismoSaldo = (a: Estado, b: Estado): boolean =>",
        "    a.initialized === b.initialized && a.balance === b.balance && a.earned === b.earned && a.spent === b.spent;",
        "",
        "  const cargarCuenta = async (lector: Lector, userId: string): Promise<CuentaDeCredits> => {",
        "    const ref = saldos().doc(userId);"
      ],
      "quedan": [
        "      balance: num(d.creditsBalance),",
        "      earned: num(d.creditsLifetimeEarned),",
        "      spent: num(d.creditsLifetimeSpent),",
        "      fraccion: fraccionGuardada(d.creditsFraccionMicro),",
        "      spentMicro: num(d.creditsLifetimeSpentMicro),",
        "      conMicro: d.creditsFraccionMicro !== undefined || d.creditsLifetimeSpentMicro !== undefined,",
        "      ...(d.creditsInitializedAt !== undefined ? { initializedAt: d.creditsInitializedAt } : {}),",
        "    };",
        "  };",
        "  const mismoSaldo = (a: Estado, b: Estado): boolean =>",
        "    a.initialized === b.initialized && a.balance === b.balance && a.earned === b.earned && a.spent === b.spent",
        "    && a.fraccion === b.fraccion && a.spentMicro === b.spentMicro && a.conMicro === b.conMicro;",
        "",
        "  const cargarCuenta = async (lector: Lector, userId: string): Promise<CuentaDeCredits> => {",
        "    const ref = saldos().doc(userId);"
      ]
    },
    {
      "eran": [
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
        "    tx.set(cuenta.ref, strip({"
      ],
      "quedan": [
        "   * Perfil Real (el espejo que leen las apps viejas). Va después de todas las",
        "   * lecturas de la transacción, como exige Firestore.",
        "   */",
        "  const escribirSaldo = (tx: CreditTx, cuenta: CuentaDeCredits, valores: { balance: number; earned: number; spent: number; fraccion?: number; spentMicro?: number; initializedAt?: unknown }) => {",
        "    const at = now();",
        "    const initializedAt = valores.initializedAt ?? cuenta.estado.initializedAt ?? cuenta.privado.creditsInitializedAt;",
        "    /*",
        "     * µCredits: la fracción viaja con el saldo, en los mismos documentos. Una operación entera no la cambia (se conserva",
        "     * la guardada) y, en una cuenta que nunca la tuvo, no escribe los campos: el documento queda como antes.",
        "     */",
        "    const fraccion = valores.fraccion ?? cuenta.estado.fraccion;",
        "    const spentMicro = valores.spentMicro ?? cuenta.estado.spentMicro;",
        "    const conMicro = cuenta.estado.conMicro || valores.fraccion !== undefined || valores.spentMicro !== undefined;",
        "    const campos = strip({",
        "      creditsBalance: valores.balance,",
        "      creditsLifetimeEarned: valores.earned,",
        "      creditsLifetimeSpent: valores.spent,",
        "      ...(conMicro ? { creditsFraccionMicro: fraccionGuardada(fraccion), creditsLifetimeSpentMicro: spentMicro } : {}),",
        "      creditsInitializedAt: initializedAt,",
        "    });",
        "    tx.set(cuenta.ref, strip({"
      ]
    },
    {
      "eran": [
        "    balance: cuenta.estado.balance,",
        "    lifetimeEarned: cuenta.estado.earned,",
        "    lifetimeSpent: cuenta.estado.spent,",
        "  });",
        "",
        "  const sinTransaccion: Lector = { get: ((target: CreditDocRef | CreditQuery) => target.get()) as CreditTx['get'] };"
      ],
      "quedan": [
        "    balance: cuenta.estado.balance,",
        "    lifetimeEarned: cuenta.estado.earned,",
        "    lifetimeSpent: cuenta.estado.spent,",
        "    ...(cuenta.estado.conMicro ? {",
        "      fraccionMicro: cuenta.estado.fraccion,",
        "      balanceMicro: totalMicro(cuenta.estado.balance, cuenta.estado.fraccion),",
        "      lifetimeSpentMicro: cuenta.estado.spentMicro,",
        "    } : {}),",
        "  });",
        "",
        "  const sinTransaccion: Lector = { get: ((target: CreditDocRef | CreditQuery) => target.get()) as CreditTx['get'] };"
      ]
    },
    {
      "eran": [
        "        // Ningún Credit se mueve; pero si la cuenta aún no tiene su documento privado (o el espejo se quedó atrás), se migra aquí.",
        "        sincronizarSiHaceFalta(tx, cuenta);",
        "      }",
        "      return { userId, balance, lifetimeEarned: earned, lifetimeSpent: spent, migrated, welcomeGranted };",
        "    });",
        "  };",
        ""
      ],
      "quedan": [
        "        // Ningún Credit se mueve; pero si la cuenta aún no tiene su documento privado (o el espejo se quedó atrás), se migra aquí.",
        "        sincronizarSiHaceFalta(tx, cuenta);",
        "      }",
        "      /* µCredits: una cuenta que ya tiene fracción la conserva (escribirSaldo no la toca) y la devuelve; las demás, igual que siempre. */",
        "      const micro = cuenta.estado.conMicro",
        "        ? { fraccionMicro: cuenta.estado.fraccion, balanceMicro: totalMicro(balance, cuenta.estado.fraccion), lifetimeSpentMicro: cuenta.estado.spentMicro }",
        "        : {};",
        "      return { userId, balance, lifetimeEarned: earned, lifetimeSpent: spent, migrated, welcomeGranted, ...micro };",
        "    });",
        "  };",
        ""
      ]
    },
    {
      "eran": [
        "     */",
        "    if (!cuenta.estado.initialized || cuenta.desfasada) {",
        "      const created = await ensureAccount(userId);",
        "      return { userId, balance: created.balance, lifetimeEarned: created.lifetimeEarned, lifetimeSpent: created.lifetimeSpent };",
        "    }",
        "    return balanceOf(cuenta);",
        "  };"
      ],
      "quedan": [
        "     */",
        "    if (!cuenta.estado.initialized || cuenta.desfasada) {",
        "      const created = await ensureAccount(userId);",
        "      const micro = created.fraccionMicro !== undefined",
        "        ? { fraccionMicro: created.fraccionMicro, balanceMicro: created.balanceMicro, lifetimeSpentMicro: created.lifetimeSpentMicro }",
        "        : {};",
        "      return { userId, balance: created.balance, lifetimeEarned: created.lifetimeEarned, lifetimeSpent: created.lifetimeSpent, ...micro };",
        "    }",
        "    return balanceOf(cuenta);",
        "  };"
      ]
    },
    {
      "eran": [
        "   * mensaje puede moverse de un intento a otro porque el historial ya lo incluye.",
        "   */",
        "  const esLaMismaOperacion = (guardada: Record<string, unknown>, service: CreditService, amount: number, fingerprint: string | undefined): boolean => {",
        "    if (guardada.service !== service) return false;",
        "    const suya = typeof guardada.fingerprint === 'string' ? guardada.fingerprint : undefined;",
        "    if (suya === undefined && fingerprint === undefined) return true;"
      ],
      "quedan": [
        "   * mensaje puede moverse de un intento a otro porque el historial ya lo incluye.",
        "   */",
        "  const esLaMismaOperacion = (guardada: Record<string, unknown>, service: CreditService, amount: number, fingerprint: string | undefined): boolean => {",
        "    /* µCredits: una reserva en µCredits nunca es la de una operación entera (su `amount` vale 0: se daría por pagada gratis). */",
        "    if (guardada.unidad === 'micro') return false;",
        "    if (guardada.service !== service) return false;",
        "    const suya = typeof guardada.fingerprint === 'string' ? guardada.fingerprint : undefined;",
        "    if (suya === undefined && fingerprint === undefined) return true;"
      ]
    },
    {
      "eran": [
        "      if (!usage.exists) throw new CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });",
        "      const data = usage.data() || {};",
        "      if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');",
        "      const status = data.status as TransactionStatus;",
        "      if (status !== 'AUTHORIZED') {",
        "        // COMPLETED: repetición inofensiva. FAILED/REFUNDED: ya se devolvió; no hay nada que completar."
      ],
      "quedan": [
        "      if (!usage.exists) throw new CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });",
        "      const data = usage.data() || {};",
        "      if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');",
        "      /*",
        "       * µCredits: una reserva en µCredits se cierra en µCredits. Con importes enteros se leería como 0 (`amount` vale 0)",
        "       * y se perdería lo reservado. Sin importe final, se liquida lo autorizado; con un importe ENTERO, se rechaza: el",
        "       * importe de una operación en µCredits solo se da en µCredits (`liquidarMicro`).",
        "       */",
        "      if (data.unidad === 'micro') {",
        "        if (input.finalAmount !== undefined) throw new CreditError('INVALID_REQUEST', 'Una operación en µCredits se liquida en µCredits', { requestId });",
        "        const r = await liquidarMicroEnTx(tx, usage, data, userId, requestId, undefined, input.meta);",
        "        return { status: r.status, refunded: 0, balanceAfter: partirMicro(r.balanceAfterMicro).balance, duplicate: r.duplicate };",
        "      }",
        "      const status = data.status as TransactionStatus;",
        "      if (status !== 'AUTHORIZED') {",
        "        // COMPLETED: repetición inofensiva. FAILED/REFUNDED: ya se devolvió; no hay nada que completar."
      ]
    },
    {
      "eran": [
        "      if (!usage.exists) throw new CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });",
        "      const data = usage.data() || {};",
        "      if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');",
        "      const status = data.status as TransactionStatus;",
        "",
        "      if (status === 'REFUNDED') {"
      ],
      "quedan": [
        "      if (!usage.exists) throw new CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });",
        "      const data = usage.data() || {};",
        "      if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');",
        "      /* µCredits: se devuelve en µCredits lo que se reservó (con importes enteros saldría 0 y se perdería). */",
        "      if (data.unidad === 'micro') {",
        "        const r = await devolverMicroEnTx(tx, usage, data, userId, requestId, input);",
        "        return { transactionId: r.transactionId, amount: 0, balanceAfter: partirMicro(r.balanceAfterMicro).balance, duplicate: r.duplicate };",
        "      }",
        "      const status = data.status as TransactionStatus;",
        "",
        "      if (status === 'REFUNDED') {"
      ]
    },
    {
      "eran": [
        "    });",
        "  };",
        "",
        "  // ── Otorgar (compra validada, regalo, bienvenida) ────────────────────────",
        "  const grantCredits = async (input: GrantInput): Promise<GrantResult> => {",
        "    const userId = assertUserId(input.userId);"
      ],
      "quedan": [
        "    });",
        "  };",
        "",
        "  // ── µCredits (autorización del dueño, 2026-11-07): solo SERVICIOS_MICRO (la traducción) ─────────────────────────",
        "  /*",
        "   * El MISMO saldo, el MISMO libro y la MISMA idempotencia que las operaciones enteras: los asientos van a",
        "   * `creditTransactions` con los ids de siempre (usage_/adjust_/refund_ + requestId) y `unidad: 'micro'`, y el saldo se",
        "   * mueve en `creditsBalance` + `creditsFraccionMicro` dentro de una sola transacción. Un requestId es de una sola",
        "   * operación: si ya existe con otro servicio, otra huella u otro importe, se rechaza sin tocar nada.",
        "   */",
        "  const fechaEnMs = (creado: unknown): number | undefined => {",
        "    const c = creado as { toMillis?: () => number } | number | undefined;",
        "    if (typeof c === 'number') return c;",
        "    return c && typeof c.toMillis === 'function' ? c.toMillis() : undefined;",
        "  };",
        "",
        "  /** RESERVAR: se descuenta YA lo autorizado (como `spendCredits`). Sin saldo suficiente no se toca nada. */",
        "  const reservarMicro = async (input: ReservaMicroInput): Promise<ReservaMicroResult> => {",
        "    const userId = assertUserId(input.userId);",
        "    const service = assertServicioMicro(input.service);",
        "    const requestId = assertRequestId(input.requestId);",
        "    /* La huella es obligatoria: es la cotización exacta que la persona autorizó (texto, destino, tarifa y cota). */",
        "    const fingerprint = assertFingerprint(input.fingerprint);",
        "    const amountMicro = assertImporteMicro(input.amountMicro);",
        "    const reason = cleanText(input.reason, 140, ETIQUETA_DE_SERVICIO_MICRO[service]);",
        "    const source = cleanText(input.source, 60, 'wee');",
        "    const id = usageTransactionId(requestId);",
        "",
        "    return db().runTransaction(async (tx) => {",
        "      const existing = await tx.get(transactions().doc(id));",
        "      if (existing.exists) {",
        "        const data = existing.data() || {};",
        "        if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');",
        "        if (data.status === 'REFUNDED' || data.status === 'FAILED') {",
        "          throw new CreditError('ALREADY_REFUNDED', 'Esta operación ya fue reembolsada; inicia una nueva', { requestId, status: data.status });",
        "        }",
        "        const misma = data.unidad === 'micro' && data.service === service && data.fingerprint === fingerprint && num(data.authorizedAmountMicro) === amountMicro;",
        "        if (!misma) throw new CreditError('INVALID_REQUEST', 'Ese requestId pertenece a otra operación; inicia una nueva', { requestId, reason: 'idempotency_conflict' });",
        "        const authorizedAt = fechaEnMs(data.createdAt);",
        "        return {",
        "          transactionId: id,",
        "          status: data.status as TransactionStatus,",
        "          amountMicro,",
        "          balanceBeforeMicro: num(data.balanceBeforeMicro),",
        "          balanceAfterMicro: num(data.balanceAfterMicro),",
        "          duplicate: true,",
        "          ...(authorizedAt !== undefined ? { authorizedAt } : {}),",
        "        };",
        "      }",
        "",
        "      const cuenta = await cargarCuenta(tx, userId);",
        "      if (!cuenta.estado.initialized) throw new CreditError('ACCOUNT_NOT_FOUND', 'La cuenta de Credits todavía no está inicializada', { userId });",
        "      const antes = totalMicro(cuenta.estado.balance, cuenta.estado.fraccion);",
        "      if (antes < amountMicro) {",
        "        throw new CreditError('INSUFFICIENT_CREDITS', 'No tienes suficientes Credits', { requiredMicro: amountMicro, availableMicro: antes, service });",
        "      }",
        "      const despues = antes - amountMicro;",
        "      const { balance, fraccion } = partirMicro(despues);",
        "      record(tx, id, {",
        "        userId,",
        "        type: 'usage',",
        "        unidad: 'micro',",
        "        amount: 0,",
        "        amountMicro: -amountMicro,",
        "        balanceBefore: cuenta.estado.balance,",
        "        balanceAfter: balance,",
        "        balanceBeforeMicro: antes,",
        "        balanceAfterMicro: despues,",
        "        reason,",
        "        source,",
        "        service,",
        "        status: 'AUTHORIZED',",
        "        statusHistory: ['PENDING', 'AUTHORIZED'],",
        "        requestId,",
        "        authorizedAmountMicro: amountMicro,",
        "        fingerprint,",
        "        meta: strip(input.meta),",
        "      });",
        "      escribirSaldo(tx, cuenta, { balance, fraccion, earned: cuenta.estado.earned, spent: cuenta.estado.spent, spentMicro: cuenta.estado.spentMicro + amountMicro });",
        "      writeStats(tx, { totalSpentMicro: amountMicro, circulatingMicro: -amountMicro, byService: { [service]: { spentMicro: amountMicro, count: 1 } }, transactions: { usage: 1 } });",
        "      return { transactionId: id, status: 'AUTHORIZED', amountMicro, balanceBeforeMicro: antes, balanceAfterMicro: despues, duplicate: false };",
        "    });",
        "  };",
        "",
        "  /*",
        "   * LIQUIDAR dentro de una transacción ya abierta (la usan `liquidarMicro` y `completeCredits`). Lo final nunca supera lo",
        "   * autorizado: si lo supera se RECHAZA (no se recorta en silencio) y la reserva sigue como estaba, para devolverla o",
        "   * pedir otra autorización. Lo que sobra vuelve al saldo con un asiento de ajuste.",
        "   */",
        "  const liquidarMicroEnTx = async (",
        "    tx: CreditTx, usage: CreditDocSnap, data: Record<string, any>, userId: string, requestId: string, finalMicro: number | undefined, meta?: Record<string, unknown>,",
        "  ): Promise<LiquidacionMicroResult> => {",
        "    const status = data.status as TransactionStatus;",
        "    if (status !== 'AUTHORIZED') return { status, refundedMicro: 0, balanceAfterMicro: num(data.balanceAfterMicro), duplicate: true };",
        "    const authorized = num(data.authorizedAmountMicro);",
        "    const final = finalMicro === undefined ? authorized : finalMicro;",
        "    if (final > authorized) {",
        "      throw new CreditError('INVALID_AMOUNT', 'El importe final supera lo autorizado: hace falta una nueva autorización', { requestId, authorizedMicro: authorized, finalMicro: final, reason: 'excede_autorizacion' });",
        "    }",
        "    const diff = authorized - final;",
        "    const cuenta = await cargarCuenta(tx, userId);",
        "    const antes = totalMicro(cuenta.estado.balance, cuenta.estado.fraccion);",
        "    const history = [...(data.statusHistory || []), { status: 'COMPLETED', at: now() }];",
        "    const metaFinal = meta ? { ...(data.meta || {}), ...strip(meta) } : data.meta;",
        "    tx.update(usage.ref, strip({ status: 'COMPLETED', finalAmountMicro: final, statusHistory: history, completedAt: now(), updatedAt: now(), meta: metaFinal }));",
        "    let despues = antes;",
        "    if (diff > 0) {",
        "      despues = antes + diff;",
        "      const { balance, fraccion } = partirMicro(despues);",
        "      record(tx, adjustmentTransactionId(requestId), {",
        "        userId,",
        "        type: 'refund',",
        "        unidad: 'micro',",
        "        amount: 0,",
        "        amountMicro: diff,",
        "        balanceBefore: cuenta.estado.balance,",
        "        balanceAfter: balance,",
        "        balanceBeforeMicro: antes,",
        "        balanceAfterMicro: despues,",
        "        reason: 'Ajuste: costó menos de lo reservado',",
        "        source: cleanText(data.source, 60, 'wee'),",
        "        service: data.service,",
        "        status: 'COMPLETED',",
        "        requestId,",
        "        refundOf: usageTransactionId(requestId),",
        "      });",
        "      escribirSaldo(tx, cuenta, { balance, fraccion, earned: cuenta.estado.earned, spent: cuenta.estado.spent, spentMicro: Math.max(0, cuenta.estado.spentMicro - diff) });",
        "      writeStats(tx, { totalRefundedMicro: diff, circulatingMicro: diff, byService: { [data.service as ServicioMicro]: { refundedMicro: diff } }, transactions: { refund: 1 } });",
        "    } else {",
        "      sincronizarSiHaceFalta(tx, cuenta);",
        "    }",
        "    return { status: 'COMPLETED', refundedMicro: diff, balanceAfterMicro: despues, duplicate: false };",
        "  };",
        "",
        "  /* DEVOLVER dentro de una transacción ya abierta (la usan `devolverMicro` y `refundCredits`). Una sola vez. */",
        "  const devolverMicroEnTx = async (",
        "    tx: CreditTx, usage: CreditDocSnap, data: Record<string, any>, userId: string, requestId: string, input: { reason?: string; source?: string; force?: boolean },",
        "  ): Promise<DevolucionMicroResult> => {",
        "    const usageId = usageTransactionId(requestId);",
        "    const refundId = refundTransactionId(requestId);",
        "    const status = data.status as TransactionStatus;",
        "    if (status === 'REFUNDED') {",
        "      const previo = (await tx.get(transactions().doc(refundId))).data() || {};",
        "      return { transactionId: refundId, amountMicro: num(previo.amountMicro), balanceAfterMicro: num(previo.balanceAfterMicro), duplicate: true };",
        "    }",
        "    if (status === 'COMPLETED' && !input.force) throw new CreditError('NOT_REFUNDABLE', 'Esta operación ya se completó', { requestId, status });",
        "    const authorized = num(data.authorizedAmountMicro);",
        "    const yaAjustado = status === 'COMPLETED' && typeof data.finalAmountMicro === 'number' ? authorized - num(data.finalAmountMicro) : 0;",
        "    const amountMicro = Math.max(0, authorized - yaAjustado);",
        "    const cuenta = await cargarCuenta(tx, userId);",
        "    const antes = totalMicro(cuenta.estado.balance, cuenta.estado.fraccion);",
        "    const despues = antes + amountMicro;",
        "    const { balance, fraccion } = partirMicro(despues);",
        "    const history = [...(data.statusHistory || []), ...(status === 'FAILED' ? [] : [{ status: 'FAILED', at: now() }]), { status: 'REFUNDED', at: now() }];",
        "    tx.update(usage.ref, strip({ status: 'REFUNDED', statusHistory: history, refundedAt: now(), updatedAt: now(), failureReason: cleanText(input.reason, 140, undefined) }));",
        "    record(tx, refundId, {",
        "      userId,",
        "      type: 'refund',",
        "      unidad: 'micro',",
        "      amount: 0,",
        "      amountMicro,",
        "      balanceBefore: cuenta.estado.balance,",
        "      balanceAfter: balance,",
        "      balanceBeforeMicro: antes,",
        "      balanceAfterMicro: despues,",
        "      reason: cleanText(input.reason, 140, 'Reembolso por generación fallida'),",
        "      source: cleanText(input.source, 60, cleanText(data.source, 60, 'wee')),",
        "      service: data.service,",
        "      status: 'COMPLETED',",
        "      requestId,",
        "      refundOf: usageId,",
        "    });",
        "    if (amountMicro > 0) {",
        "      escribirSaldo(tx, cuenta, { balance, fraccion, earned: cuenta.estado.earned, spent: cuenta.estado.spent, spentMicro: Math.max(0, cuenta.estado.spentMicro - amountMicro) });",
        "    } else {",
        "      sincronizarSiHaceFalta(tx, cuenta);",
        "    }",
        "    writeStats(tx, { totalRefundedMicro: amountMicro, circulatingMicro: amountMicro, failed: 1, byService: { [data.service as ServicioMicro]: { refundedMicro: amountMicro } }, transactions: { refund: 1 } });",
        "    return { transactionId: refundId, amountMicro, balanceAfterMicro: despues, duplicate: false };",
        "  };",
        "",
        "  /** Lee la reserva en µCredits de un requestId dentro de la transacción, o lanza (otra cuenta, no existe, no es µCredits). */",
        "  const reservaMicroDe = async (tx: CreditTx, userId: string, requestId: string): Promise<{ usage: CreditDocSnap; data: Record<string, any> }> => {",
        "    const usage = await tx.get(transactions().doc(usageTransactionId(requestId)));",
        "    if (!usage.exists) throw new CreditError('TRANSACTION_NOT_FOUND', 'No existe esa operación', { requestId });",
        "    const data = usage.data() || {};",
        "    if (data.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta operación pertenece a otra cuenta');",
        "    if (data.unidad !== 'micro') throw new CreditError('INVALID_REQUEST', 'Esa operación no es en µCredits', { requestId });",
        "    return { usage, data };",
        "  };",
        "",
        "  /** LIQUIDAR con el consumo real (≤ lo autorizado). Repetirla no cobra dos veces. */",
        "  const liquidarMicro = async (input: { userId: string; requestId: string; finalAmountMicro: number; meta?: Record<string, unknown> }): Promise<LiquidacionMicroResult> => {",
        "    const userId = assertUserId(input.userId);",
        "    const requestId = assertRequestId(input.requestId);",
        "    const final = assertImporteMicro(input.finalAmountMicro, { permitirCero: true });",
        "    return db().runTransaction(async (tx) => {",
        "      const { usage, data } = await reservaMicroDe(tx, userId, requestId);",
        "      return liquidarMicroEnTx(tx, usage, data, userId, requestId, final, input.meta);",
        "    });",
        "  };",
        "",
        "  /** DEVOLVER todo lo reservado (fallo del proveedor, respuesta inválida, real > autorizado). Repetirla no devuelve dos veces. */",
        "  const devolverMicro = async (input: { userId: string; requestId: string; reason?: string; source?: string }): Promise<DevolucionMicroResult> => {",
        "    const userId = assertUserId(input.userId);",
        "    const requestId = assertRequestId(input.requestId);",
        "    return db().runTransaction(async (tx) => {",
        "      const { usage, data } = await reservaMicroDe(tx, userId, requestId);",
        "      return devolverMicroEnTx(tx, usage, data, userId, requestId, input);",
        "    });",
        "  };",
        "",
        "  // ── Otorgar (compra validada, regalo, bienvenida) ────────────────────────",
        "  const grantCredits = async (input: GrantInput): Promise<GrantResult> => {",
        "    const userId = assertUserId(input.userId);"
      ]
    },
    {
      "eran": [
        "    return getCreditCost(assertService(service));",
        "  };",
        "",
        "  return { ensureAccount, getBalance, readBalance, spendCredits, completeCredits, refundCredits, grantCredits, getCreditHistory, getCreditCost: getCost, CREDIT_FIELDS, faseSaldo: fase };",
        "}",
        "",
        "export type CreditEngine = ReturnType<typeof createCreditEngine>;"
      ],
      "quedan": [
        "    return getCreditCost(assertService(service));",
        "  };",
        "",
        "  return { ensureAccount, getBalance, readBalance, spendCredits, completeCredits, refundCredits, grantCredits, reservarMicro, liquidarMicro, devolverMicro, getCreditHistory, getCreditCost: getCost, CREDIT_FIELDS, faseSaldo: fase };",
        "}",
        "",
        "export type CreditEngine = ReturnType<typeof createCreditEngine>;"
      ]
    }
  ],
  "functions/src/credits/creditTransactions.ts": [
    {
      "eran": [
        "import { CreditService } from './creditCosts';",
        "",
        "/**",
        " * Transacciones de Credits: creditTransactions/{transactionId} (docs/CREDITS.md §2)."
      ],
      "quedan": [
        "import { CreditService } from './creditCosts';",
        "import { ServicioMicro } from './microCreditos';",
        "",
        "/**",
        " * Transacciones de Credits: creditTransactions/{transactionId} (docs/CREDITS.md §2)."
      ]
    },
    {
      "eran": [
        "  reason: string;",
        "  /** Quién originó el movimiento: weë-creator, wee-avatar, store:test, apple, google, stripe, welcome, migration, admin. */",
        "  source: string;",
        "  service?: CreditService;",
        "  generationId?: string;",
        "  purchaseId?: string;",
        "  status: TransactionStatus;"
      ],
      "quedan": [
        "  reason: string;",
        "  /** Quién originó el movimiento: weë-creator, wee-avatar, store:test, apple, google, stripe, welcome, migration, admin. */",
        "  source: string;",
        "  service?: CreditService | ServicioMicro;",
        "  generationId?: string;",
        "  purchaseId?: string;",
        "  status: TransactionStatus;"
      ]
    },
    {
      "eran": [
        "  fingerprint?: string;",
        "  finalAmount?: number;",
        "  refundOf?: string;",
        "  meta?: Record<string, unknown>;",
        "  createdAt: unknown;",
        "  updatedAt: unknown;"
      ],
      "quedan": [
        "  fingerprint?: string;",
        "  finalAmount?: number;",
        "  refundOf?: string;",
        "  /*",
        "   * µCREDITS (autorización del dueño, 2026-11-07). Solo en los asientos de los servicios con precisión fraccionaria",
        "   * (`SERVICIOS_MICRO`: la traducción). En ellos `amount` vale 0 y lo que cuenta va en µCredits (1 Credit = 10⁶):",
        "   * `amountMicro` con signo como `amount`, lo autorizado y lo final, y el saldo total antes y después. `balanceBefore` y",
        "   * `balanceAfter` siguen siendo los Credits ENTEROS del saldo. Los asientos enteros no llevan ninguno de estos campos.",
        "   */",
        "  unidad?: 'micro';",
        "  amountMicro?: number;",
        "  authorizedAmountMicro?: number;",
        "  finalAmountMicro?: number;",
        "  balanceBeforeMicro?: number;",
        "  balanceAfterMicro?: number;",
        "  meta?: Record<string, unknown>;",
        "  createdAt: unknown;",
        "  updatedAt: unknown;"
      ]
    },
    {
      "eran": [
        " * Acumulados para el panel de administración (creditStats/global y creditStats/daily_YYYY-MM-DD):",
        " * totalPurchased · totalGranted · totalSpent · totalRefunded · circulating · revenueUsd ·",
        " * byService.{servicio}.{spent, count, refunded} · transactions.{type} · failed",
        " */",
        "export interface StatsDelta {",
        "  totalPurchased?: number;"
      ],
      "quedan": [
        " * Acumulados para el panel de administración (creditStats/global y creditStats/daily_YYYY-MM-DD):",
        " * totalPurchased · totalGranted · totalSpent · totalRefunded · circulating · revenueUsd ·",
        " * byService.{servicio}.{spent, count, refunded} · transactions.{type} · failed",
        " * y, de los servicios en µCredits, totalSpentMicro · totalRefundedMicro · circulatingMicro · byService.{servicio}.{spentMicro, refundedMicro}",
        " */",
        "export interface StatsDelta {",
        "  totalPurchased?: number;"
      ]
    },
    {
      "eran": [
        "  circulating?: number;",
        "  revenueUsd?: number;",
        "  failed?: number;",
        "  byService?: Partial<Record<CreditService, { spent?: number; count?: number; refunded?: number }>>;",
        "  transactions?: Partial<Record<TransactionType, number>>;",
        "}",
        "",
        "/** Convierte un delta en un objeto de incrementos anidados (se escribe con merge). */",
        "export function statsUpdate(delta: StatsDelta, inc: (n: number) => unknown, now: () => unknown): Record<string, unknown> {",
        "  const out: Record<string, unknown> = { updatedAt: now() };",
        "  for (const key of ['totalPurchased', 'totalGranted', 'totalSpent', 'totalRefunded', 'circulating', 'revenueUsd', 'failed'] as const) {",
        "    const value = delta[key];",
        "    if (value) out[key] = inc(value);",
        "  }"
      ],
      "quedan": [
        "  circulating?: number;",
        "  revenueUsd?: number;",
        "  failed?: number;",
        "  totalSpentMicro?: number;",
        "  totalRefundedMicro?: number;",
        "  circulatingMicro?: number;",
        "  byService?: Partial<Record<CreditService | ServicioMicro, { spent?: number; count?: number; refunded?: number; spentMicro?: number; refundedMicro?: number }>>;",
        "  transactions?: Partial<Record<TransactionType, number>>;",
        "}",
        "",
        "/** Convierte un delta en un objeto de incrementos anidados (se escribe con merge). */",
        "export function statsUpdate(delta: StatsDelta, inc: (n: number) => unknown, now: () => unknown): Record<string, unknown> {",
        "  const out: Record<string, unknown> = { updatedAt: now() };",
        "  for (const key of ['totalPurchased', 'totalGranted', 'totalSpent', 'totalRefunded', 'circulating', 'revenueUsd', 'failed', 'totalSpentMicro', 'totalRefundedMicro', 'circulatingMicro'] as const) {",
        "    const value = delta[key];",
        "    if (value) out[key] = inc(value);",
        "  }"
      ]
    }
  ]
};

/** `functions/src/credits/microCreditos.ts` (nuevo, la unidad y la aritmética entera de los µCredits): solo vale ESTE archivo, por su huella. */
export const HUELLA_MICROCREDITOS = '9175820df233e7335e2e6313e798af320cde89f0089d540eac81e4da8ba641cb';
