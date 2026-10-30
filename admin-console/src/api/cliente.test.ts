import { describe, expect, it, vi } from 'vitest';
import { ACCIONES, NOMBRES_DE_ACCION } from './acciones';
import { crearCliente } from './cliente';
import { ErrorDeAdmin, clasificarError } from './errores';

const ID_REPORTE = `rep_${'a'.repeat(32)}`;

describe('la lista permitida de acciones', () => {
  it('son exactamente las ocho de la Unidad 1', () => {
    expect([...NOMBRES_DE_ACCION].sort()).toEqual([
      'creditsAdmin.balance', 'creditsAdmin.costs', 'creditsAdmin.failed', 'creditsAdmin.stats', 'creditsAdmin.userHistory',
      'engineAdmin.status', 'moderationAdmin.history', 'moderationAdmin.list',
    ]);
  });

  it('ninguna es de escritura', () => {
    const prohibidas = ['seedDefaults', 'setProvider', 'setRouting', 'setSettings', 'resetHealth', 'setCost', 'review', 'grant', 'refund'];
    for (const a of Object.values(ACCIONES)) expect(prohibidas).not.toContain(a.accion);
    expect(new Set(Object.values(ACCIONES).map((a) => a.callable))).toEqual(new Set(['engineAdmin', 'creditsAdmin', 'moderationAdmin']));
  });
});

describe('el cliente', () => {
  const crear = (respuesta: unknown = {}) => {
    const invocar = vi.fn(async () => respuesta);
    return { invocar, cliente: crearCliente(invocar) };
  };

  it('invoca cada acción con su callable y su `action`', async () => {
    const { invocar, cliente } = crear();
    await cliente.llamar('engineAdmin.status');
    await cliente.llamar('creditsAdmin.stats');
    await cliente.llamar('creditsAdmin.costs');
    await cliente.llamar('creditsAdmin.balance', { userId: 'uid1' });
    await cliente.llamar('creditsAdmin.userHistory', { userId: 'uid1', limit: 25 });
    await cliente.llamar('creditsAdmin.failed', { limit: 10 });
    await cliente.llamar('moderationAdmin.list', { status: 'RECEIVED', limit: 25 });
    await cliente.llamar('moderationAdmin.history', { reportId: ID_REPORTE });
    expect(invocar.mock.calls).toEqual([
      ['engineAdmin', { action: 'status' }],
      ['creditsAdmin', { action: 'stats' }],
      ['creditsAdmin', { action: 'costs' }],
      ['creditsAdmin', { userId: 'uid1', action: 'balance' }],
      ['creditsAdmin', { userId: 'uid1', limit: 25, action: 'userHistory' }],
      ['creditsAdmin', { limit: 10, action: 'failed' }],
      ['moderationAdmin', { status: 'RECEIVED', limit: 25, action: 'list' }],
      ['moderationAdmin', { reportId: ID_REPORTE, action: 'history' }],
    ]);
  });

  it('rechaza una acción que no está en la lista, aunque se salten los tipos, sin llamar al servidor', async () => {
    const { invocar, cliente } = crear();
    for (const mala of ['creditsAdmin.setCost', 'engineAdmin.setSettings', 'moderationAdmin.review', 'grantCredits', '__proto__', 'constructor', 'toString']) {
      await expect((cliente.llamar as (a: string) => Promise<unknown>)(mala)).rejects.toMatchObject({ tipo: 'argumento' });
    }
    expect(invocar).not.toHaveBeenCalled();
  });

  it('solo envía los parámetros declarados y no deja que nadie cambie `action`', async () => {
    const { invocar, cliente } = crear();
    await (cliente.llamar as (a: string, p: unknown) => Promise<unknown>)('creditsAdmin.balance', { userId: 'uid1', action: 'setCost', service: 'ai_image', credits: 0, amount: 1000 });
    expect(invocar).toHaveBeenCalledWith('creditsAdmin', { userId: 'uid1', action: 'balance' });
    await (cliente.llamar as (a: string, p: unknown) => Promise<unknown>)('engineAdmin.status', { enabled: false, id: 'gemini', action: 'setProvider' });
    expect(invocar).toHaveBeenLastCalledWith('engineAdmin', { action: 'status' });
  });

  it('valida los parámetros antes de salir de la máquina', async () => {
    const { invocar, cliente } = crear();
    const llamar = cliente.llamar as (a: string, p?: unknown) => Promise<unknown>;
    const malos: [string, unknown][] = [
      ['creditsAdmin.balance', {}],
      ['creditsAdmin.balance', { userId: '' }],
      ['creditsAdmin.balance', { userId: 'a/b' }],
      ['creditsAdmin.balance', { userId: 'con espacio' }],
      ['creditsAdmin.balance', { userId: 42 }],
      ['creditsAdmin.userHistory', { userId: 'u', limit: 0 }],
      ['creditsAdmin.userHistory', { userId: 'u', limit: 500 }],
      ['creditsAdmin.failed', { limit: 1.5 }],
      ['moderationAdmin.list', { status: 'TODOS' }],
      ['moderationAdmin.history', { reportId: '../accounts/x' }],
      ['moderationAdmin.history', {}],
    ];
    for (const [accion, parametros] of malos) await expect(llamar(accion, parametros)).rejects.toMatchObject({ tipo: 'argumento' });
    expect(invocar).not.toHaveBeenCalled();
  });

  it('convierte los fallos de la API en errores tipados, sin filtrar el mensaje del servidor', async () => {
    const casos: [string, string][] = [
      ['functions/permission-denied', 'denegado'],
      ['functions/unauthenticated', 'sin-sesion'],
      ['functions/not-found', 'no-encontrado'],
      ['functions/invalid-argument', 'argumento'],
      ['functions/unavailable', 'sin-conexion'],
      ['functions/internal', 'servidor'],
      ['functions/lo-que-sea', 'desconocido'],
    ];
    for (const [code, tipo] of casos) {
      const cliente = crearCliente(async () => { throw Object.assign(new Error('ruta secreta /users/abc'), { code }); });
      const error = (await cliente.llamar('engineAdmin.status').catch((e: unknown) => e)) as ErrorDeAdmin;
      expect(error).toBeInstanceOf(ErrorDeAdmin);
      expect(error.tipo).toBe(tipo);
      expect(error.message).not.toContain('secreta');
    }
    expect(clasificarError(new TypeError('Failed to fetch')).tipo).toBe('desconocido');
    expect(clasificarError(undefined).tipo).toBe('desconocido');
  });
});
