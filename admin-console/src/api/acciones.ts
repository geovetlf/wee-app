/*
 * LA LISTA PERMITIDA. Todo lo que la consola puede pedirle al servidor está aquí, y nada más.
 *
 * Solo lectura. Ocho acciones de tres callables que comprueban `assertAdmin` en el servidor, y las de `opsAdmin` y
 * `accountsAdmin`, que comprueban un permiso concreto y dejan constancia en `adminAudit` (functions/src/admin). Las acciones de escritura de esos mismos callables (`setProvider`, `setRouting`,
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
  'opsAdmin.quienSoy': { callable: 'opsAdmin', accion: 'quienSoy', parametros: [] },
  'opsAdmin.capacidades': { callable: 'opsAdmin', accion: 'capacidades', parametros: [] },
  'opsAdmin.trabajos': { callable: 'opsAdmin', accion: 'trabajos', parametros: ['estado', 'limit', 'cursor'] },
  'opsAdmin.atascados': { callable: 'opsAdmin', accion: 'atascados', parametros: ['minutos', 'limit'] },
  'opsAdmin.creaciones': { callable: 'opsAdmin', accion: 'creaciones', parametros: ['experiencia', 'estado', 'limit'] },
  'opsAdmin.producciones': { callable: 'opsAdmin', accion: 'producciones', parametros: ['limit'] },
  'opsAdmin.generaciones': { callable: 'opsAdmin', accion: 'generaciones', parametros: ['experiencia', 'limit'] },
  'opsAdmin.usoIa': { callable: 'opsAdmin', accion: 'usoIa', parametros: ['dia'] },
  'opsAdmin.reservas': { callable: 'opsAdmin', accion: 'reservas', parametros: ['minutos', 'limit'] },
  'opsAdmin.auditoria': { callable: 'opsAdmin', accion: 'auditoria', parametros: ['limit'] },
  'accountsAdmin.buscar': { callable: 'accountsAdmin', accion: 'buscar', parametros: ['uid', 'numeroDeCuenta'] },
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
  'opsAdmin.quienSoy': undefined;
  'opsAdmin.capacidades': undefined;
  'opsAdmin.trabajos': { estado?: string; limit?: number; cursor?: string };
  'opsAdmin.atascados': { minutos?: number; limit?: number };
  'opsAdmin.creaciones': { experiencia?: string; estado?: string; limit?: number };
  'opsAdmin.producciones': { limit?: number };
  'opsAdmin.generaciones': { experiencia?: string; limit?: number };
  'opsAdmin.usoIa': { dia?: string };
  'opsAdmin.reservas': { minutos?: number; limit?: number };
  'opsAdmin.auditoria': { limit?: number };
  'accountsAdmin.buscar': { uid?: string; numeroDeCuenta?: string };
}

export const ESTADOS_DE_TRABAJO = ['queued', 'running', 'waiting', 'cancel_requested', 'completed', 'failed', 'timed_out', 'cancelled'] as const;
export const ESTADOS_DE_CREACION = ['asking', 'planned', 'running', 'done', 'failed', 'cancelled'] as const;
/** Las experiencias con rastro en el servidor. Design y Music no están: no tienen operaciones que mirar. */
export const EXPERIENCIAS_CON_SERVIDOR = ['studio', 'photo', 'writer', 'beauty', 'chef', 'home', 'business', 'travel', 'brain'] as const;
/** Los nombres de Weë son marca: se escriben igual en todos los idiomas. */
export const NOMBRE_DE_EXPERIENCIA: Record<(typeof EXPERIENCIAS_CON_SERVIDOR)[number], string> = {
  studio: 'Weë Studio', photo: 'Weë Photo', writer: 'Weë Writer', beauty: 'Weë Beauty', chef: 'Weë Chef', home: 'Weë Home', business: 'Weë Business', travel: 'Weë Travel', brain: 'Weë Brain',
};
export const LIMITE_MAXIMO = 50;
export const FORMA_DE_ID_DE_REPORTE = /^rep_[0-9a-f]{32}$/;
