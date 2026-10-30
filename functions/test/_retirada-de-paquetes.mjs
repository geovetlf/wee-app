/**
 * EL BLOQUE AUTORIZADO DE LA «RETIRADA DE PAQUETES, 2026-10-29».
 *
 * Decisión del dueño: Weë no tiene planes ni paquetes de Credits (US$ 1 = 100 Credits de referencia) y las recargas
 * quedan cerradas hasta un sistema de pagos aprobado. Eso obliga a tocar dos archivos congelados por las guardas de
 * gobernanza (credits/creditCosts.ts y credits/index.ts) y dos de pagos (payments/purchaseValidation.ts y
 * payments/providers/test.ts). El dueño autorizó actualizar SOLO las expectativas que exigían el catálogo retirado o
 * la implementación exacta de esas funciones; nada más.
 *
 * Por eso esto no afloja ninguna guarda: es una lista EXACTA. Cada guarda resta estas líneas —una vez cada una, ni una
 * más— y sigue exigiendo su expectativa de antes, intacta, sobre lo que quede. Si falta una línea del bloque (alguien
 * la cambió) o sobra otra (alguien añadió algo), la guarda cae. Las líneas se comparan sin sangría y, como en las
 * guardas, sin comentarios en el código nuevo.
 *
 * Qué NO entra aquí: grantCredits, spendCredits, refundCredits, completeCredits, el Credit Engine, la idempotencia,
 * las reglas, los permisos de administración, el Router, la cola o los trabajos asíncronos. Ninguno se toca.
 */
export const ETIQUETA = 'retirada de paquetes, 2026-10-29';

export const ARCHIVOS_DE_LA_RETIRADA = [
  'functions/src/credits/creditCosts.ts',
  'functions/src/credits/index.ts',
  'functions/src/payments/providers/test.ts',
  'functions/src/payments/purchaseValidation.ts',
];

/** credits/creditCosts.ts: fuera el catálogo (interfaz, lista y buscador); dentro la conversión de referencia. */
export const CREDIT_COSTS = {
  quitadas: [
    'export interface CreditPackage {',
    'id: string;',
    'name: string;',
    'credits: number;',
    'priceUsd: number;',
    'productId: string;',
    '}',
    'export const CREDIT_PACKAGES: CreditPackage[] = [',
    "{ id: 'basic', name: 'Básico', credits: 40, priceUsd: 4.99, productId: 'zone.wee.credits.basic' },",
    "{ id: 'plus', name: 'Plus', credits: 90, priceUsd: 9.99, productId: 'zone.wee.credits.plus' },",
    "{ id: 'blackpro', name: 'Black Pro', credits: 200, priceUsd: 19.9, productId: 'zone.wee.credits.blackpro' },",
    '];',
    'export const getPackage = (id: string): CreditPackage | undefined => CREDIT_PACKAGES.find((p) => p.id === id || p.productId === id);',
  ],
  nuevas: ['export const CREDITS_POR_USD_DE_REFERENCIA = 100;'],
};

/**
 * credits/index.ts: getCreditCost y creditsAdmin.costs sin `packages`; validatePurchase deja de inicializar la cuenta
 * (`ensureAccount`) antes de rechazar. Las `quitadas` incluyen su comentario porque las guardas de este archivo
 * cuentan todas las líneas quitadas, también las de comentario.
 */
export const CALLABLES = {
  quitadas: [
    "import { allCreditCosts, CREDIT_PACKAGES, invalidateCostOverrides, isCreditService, loadCostOverrides } from './creditCosts';",
    'return { costs, packages: CREDIT_PACKAGES };',
    '/** Compra: el proveedor valida el comprobante y el Credit Engine acredita el paquete. */',
    "const provider = data.provider || 'test';",
    'await creditEngine.ensureAccount(userId);',
    'return validatePurchase({ userId, provider, packageId: data.packageId, payload: data.payload });',
    'return { costs: allCreditCosts(), packages: CREDIT_PACKAGES };',
  ],
  nuevas: [
    "import { allCreditCosts, invalidateCostOverrides, isCreditService, loadCostOverrides } from './creditCosts';",
    'return { costs };',
    "return validatePurchase({ userId, provider: data.provider || 'test', packageId: data.packageId, payload: data.payload });",
    'return { costs: allCreditCosts() };',
  ],
};

/**
 * Lo que la retirada suma a `git diff --numstat` en cada archivo congelado (añadidas, quitadas), comentarios incluidos.
 * Las guardas que miden el tamaño exacto de Credits suman esto a sus cifras de antes con `sumarRetirada`.
 */
export const NUMSTAT = {
  'functions/src/credits/creditCosts.ts': [8, 18],
  'functions/src/credits/index.ts': [10, 7],
};

/** Suma el tamaño exacto de la retirada a un `numstat` esperado (una línea «añadidas\tquitadas\tarchivo» por archivo). */
export const sumarRetirada = (esperado) => esperado.split('\n').map((linea) => {
  const [mas, menos, archivo] = linea.split('\t');
  const delta = NUMSTAT[archivo];
  return delta ? `${Number(mas) + delta[0]}\t${Number(menos) + delta[1]}\t${archivo}` : linea;
}).join('\n');

/**
 * Quita de `lineas` cada línea de `bloque` una sola vez (comparando sin sangría). Devuelve lo que queda, en su orden
 * y con su forma original, y las líneas del bloque que NO estaban: si `faltan` no está vacío, el bloque no es el
 * autorizado y la guarda debe caer.
 */
export const restarBloque = (lineas, bloque) => {
  const resto = [...lineas];
  const faltan = [];
  for (const b of bloque) {
    const i = resto.findIndex((l) => l.trim() === b.trim());
    if (i === -1) faltan.push(b);
    else resto.splice(i, 1);
  }
  return { resto, faltan };
};
