/**
 * EL BLOQUE EXACTO DE LA «CORRECCIÓN DE SEGURIDAD DE ADMINISTRACIÓN, 2026-10-30».
 *
 * El dueño pidió que los roles limiten también a las callables antiguas y que estas dejen constancia. Eso obliga a tocar
 * `credits/index.ts` y `engine/admin.ts`, congelados por las guardas de tamaño. No afloja ninguna: como en la retirada de
 * paquetes, es una lista EXACTA que cada guarda resta una vez, y sobre lo que queda sigue exigiendo lo de antes.
 *
 * El cambio solo ENVUELVE cada operación en su puerta (`admin/autorizacion.ts`): sus cuerpos, sus validaciones y lo
 * que le pasan al motor son los mismos. `assertAdmin` sigue donde estaba, delante. No entra aquí: el Credit Engine, la
 * idempotencia, el reembolso, los precios ni ningún otro archivo de Credits.
 */
export const ARCHIVOS_DE_LA_SEGURIDAD = ['functions/src/admin/autorizacion.ts', 'functions/src/admin/operaciones.ts', 'functions/src/media/canary.ts', 'functions/src/moderation/index.ts'];

export const CALLABLES = {
  quitadas: [
    'await creditEngine.ensureAccount(userId);',
    'return creditEngine.spendCredits({',
    'service: data.service,',
    '});',
    'return creditEngine.grantCredits({',
    'requestId: data.requestId || `admin_${Date.now()}`,',
    '});',
    'return creditEngine.refundCredits({',
    '});',
    '})',
    ');',
  ],
  nuevas: [
    "import { operacionAdmin } from '../admin/autorizacion';",
    "import { claseDeCredits, claseDeCreditsAdmin } from '../admin/operaciones';",
    'const service = data.service;',
    "return operacionAdmin(claseDeCredits('spendCredits', userId, data), request.auth as any, () => creditEngine.ensureAccount(userId).then(() => creditEngine.spendCredits({",
    'service,',
    '})));',
    'const requestId = data.requestId || `admin_${Date.now()}`;',
    "return operacionAdmin(claseDeCredits('grantCredits', data.userId, { ...data, requestId }), request.auth as any, () => creditEngine.grantCredits({",
    'requestId,',
    '}));',
    "return operacionAdmin(claseDeCredits('refundCredits', data.userId, data), request.auth as any, () => creditEngine.refundCredits({",
    '}));',
    'return operacionAdmin(claseDeCreditsAdmin(data), request.auth as any, () => atenderCreditsAdmin(data));',
    '})',
    ');',
    'const atenderCreditsAdmin = (data: Record<string, any>) =>',
    'run(async () => {',
    '});',
  ],
};

/** Lo que suma a `git diff --numstat` en credits/index.ts (añadidas, quitadas). */
const NUMSTAT = { 'functions/src/credits/index.ts': [19, 11] };

export const sumarSeguridad = (esperado) => esperado.split('\n').map((linea) => {
  const [mas, menos, archivo] = linea.split('\t');
  const delta = NUMSTAT[archivo];
  return delta ? `${Number(mas) + delta[0]}\t${Number(menos) + delta[1]}\t${archivo}` : linea;
}).join('\n');
