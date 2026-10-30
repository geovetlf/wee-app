/*
 * LA LISTA PERMITIDA. Todo lo que la consola puede pedirle al servidor está aquí, y nada más.
 *
 * Unidad 1 = solo lectura. Son exactamente ocho acciones de tres callables que ya existen y que comprueban
 * `assertAdmin` en el servidor. Las acciones de escritura de esos mismos callables (`setProvider`, `setRouting`,
 * `setSettings`, `seedDefaults`, `resetHealth`, `setCost`, `review`) y los callables `grantCredits` /
 * `refundCredits` NO están, y el cliente no tiene cómo construirlas: `cliente.ts` solo acepta una clave de este
 * mapa y solo copia los parámetros que aquí se declaran. El test `cliente.test.ts` fija la lista exacta.
 *
 * Esto es una cerradura de la CONSOLA, no de seguridad: la autorización real es `assertAdmin` en el servidor.
 */
export const ACCIONES = {
  'engineAdmin.status': { callable: 'engineAdmin', accion: 'status', parametros: [] },
  'creditsAdmin.stats': { callable: 'creditsAdmin', accion: 'stats', parametros: [] },
  'creditsAdmin.balance': { callable: 'creditsAdmin', accion: 'balance', parametros: ['userId'] },
  'creditsAdmin.userHistory': { callable: 'creditsAdmin', accion: 'userHistory', parametros: ['userId', 'limit'] },
  'creditsAdmin.failed': { callable: 'creditsAdmin', accion: 'failed', parametros: ['limit'] },
  'creditsAdmin.costs': { callable: 'creditsAdmin', accion: 'costs', parametros: [] },
  'moderationAdmin.list': { callable: 'moderationAdmin', accion: 'list', parametros: ['status', 'limit'] },
  'moderationAdmin.history': { callable: 'moderationAdmin', accion: 'history', parametros: ['reportId'] },
} as const;

export type NombreDeAccion = keyof typeof ACCIONES;

export const NOMBRES_DE_ACCION = Object.keys(ACCIONES) as NombreDeAccion[];

export const ESTADOS_DE_REPORTE = ['RECEIVED', 'REVIEWING', 'ACTIONED', 'DISMISSED', 'ESCALATED'] as const;
export type EstadoDeReporte = (typeof ESTADOS_DE_REPORTE)[number];

export interface ParametrosPorAccion {
  'engineAdmin.status': undefined;
  'creditsAdmin.stats': undefined;
  'creditsAdmin.balance': { userId: string };
  'creditsAdmin.userHistory': { userId: string; limit?: number };
  'creditsAdmin.failed': { limit?: number };
  'creditsAdmin.costs': undefined;
  'moderationAdmin.list': { status?: EstadoDeReporte; limit?: number };
  'moderationAdmin.history': { reportId: string };
}

export const LIMITE_MAXIMO = 50;
export const FORMA_DE_ID_DE_REPORTE = /^rep_[0-9a-f]{32}$/;
