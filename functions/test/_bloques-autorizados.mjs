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
