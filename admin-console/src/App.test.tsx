import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { NOMBRES_DE_ACCION } from './api/acciones';
import { crearCliente } from './api/cliente';
import type { ServicioDeSesion, UsuarioDeSesion } from './auth/sesion';

const ADMIN: UsuarioDeSesion = { uid: 'admin1', email: 'admin@demo.local' };
const ID_REPORTE = `rep_${'b'.repeat(32)}`;

const falla = (code: string) => Object.assign(new Error('detalle interno /users/abc SECRETO'), { code });

const ESTADO_MOTOR = {
  source: 'defaults',
  settings: { pricingMode: 'simulated', creditsPerUsd: 100, margin: 0.5, defaultPolicy: 'balanced', allowMockFallback: true },
  providers: [{ id: 'provx', name: 'ProveedorX', modalities: ['text'], configured: true, enabled: true, priority: 5, health: { failures: 0 }, models: [{ id: 'modelo-1', cost: '$1' }] }],
  routing: [{ capability: 'text.generate', policy: 'balanced', chain: [{ provider: 'provx', model: 'modelo-1' }] }],
};

type Respuesta = unknown | ((datos: Record<string, unknown>) => unknown);

const montar = (opciones: { usuario?: UsuarioDeSesion | null; respuestas?: Record<string, Respuesta>; entrar?: ServicioDeSesion['entrar'] } = {}) => {
  const llamadas: { callable: string; datos: Record<string, unknown> }[] = [];
  const respuestas = opciones.respuestas ?? {};
  const invocar = vi.fn(async (callable: string, datos: Record<string, unknown>) => {
    llamadas.push({ callable, datos });
    const r = respuestas[`${callable}.${datos.action}`];
    const valor = typeof r === 'function' ? (r as (d: Record<string, unknown>) => unknown)(datos) : r;
    if (valor instanceof Error) throw valor;
    return valor ?? {};
  });
  let aviso: ((u: UsuarioDeSesion | null) => void) | undefined;
  const sesion: ServicioDeSesion = {
    observar: (cb) => { aviso = cb; cb(opciones.usuario === undefined ? ADMIN : opciones.usuario); return () => undefined; },
    entrar: opciones.entrar ?? vi.fn(async () => undefined),
    salir: vi.fn(async () => { aviso?.(null); }),
  };
  const utils = render(<App servicios={{ cliente: crearCliente(invocar), sesion }} idiomaInicial="en" />);
  return { ...utils, llamadas, invocar, sesion };
};

const ir = async (ruta: string) => { await act(async () => { window.location.hash = `#/${ruta}`; window.dispatchEvent(new HashChangeEvent('hashchange')); }); };

beforeEach(() => { window.location.hash = ''; });
afterEach(() => cleanup());

describe('acceso', () => {
  it('sin sesión muestra el formulario y no pide ningún dato', async () => {
    const { llamadas } = montar({ usuario: null });
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(llamadas).toEqual([]);
  });

  it('un error de inicio de sesión se muestra sin detalles técnicos', async () => {
    const entrar = vi.fn(async () => { throw new Error('auth/invalid-credential'); });
    montar({ usuario: null, entrar });
    await userEvent.type(await screen.findByLabelText('Email'), 'a@b.c');
    await userEvent.type(screen.getByLabelText('Password'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
    expect(entrar).toHaveBeenCalledWith('a@b.c', 'x');
  });

  it('acceso denegado: sin menú, sin vistas y sin ningún dato administrativo', async () => {
    const { llamadas, sesion } = montar({ respuestas: { 'engineAdmin.status': falla('functions/permission-denied') } });
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('ProveedorX');
    expect(document.body.textContent).not.toContain('SECRETO');
    expect(llamadas).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(sesion.salir).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
  });

  it('si el permiso se pierde a mitad de uso, los datos ya mostrados desaparecen', async () => {
    montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR, 'creditsAdmin.stats': falla('functions/permission-denied') } });
    expect(await screen.findByText('ProveedorX')).toBeInTheDocument();
    await ir('credits');
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('ProveedorX');
  });

  it('una sesión caducada saca de la consola y pide volver a iniciar sesión', async () => {
    const { sesion } = montar({ respuestas: { 'engineAdmin.status': falla('functions/unauthenticated') } });
    expect(await screen.findByRole('heading', { name: 'Sign in again' })).toBeInTheDocument();
    expect(screen.getByText('The session is no longer valid. Sign in again.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to sign in' }));
    expect(sesion.salir).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
  });

  it('mientras el servidor no confirma el permiso no se ve el menú ni ninguna vista', async () => {
    let confirmar: (v: unknown) => void = () => undefined;
    let n = 0;
    /* La primera llamada (la comprobación) queda pendiente hasta que el test la confirma; las siguientes (la vista Resumen) responden. */
    const { llamadas } = montar({ respuestas: { 'engineAdmin.status': () => (++n === 1 ? new Promise((r) => { confirmar = r; }) : ESTADO_MOTOR) } });
    expect(await screen.findByText('Checking permissions with the server…')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    /* Solo se ha pedido la comprobación; ninguna vista ha salido a buscar datos. */
    expect(llamadas.map((l) => `${l.callable}.${l.datos.action}`)).toEqual(['engineAdmin.status']);
    await act(async () => { confirmar(ESTADO_MOTOR); });
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
    expect(await screen.findByText('ProveedorX')).toBeInTheDocument();
  });

  it('si la comprobación falla por la red, no entra: muestra el error y deja reintentar', async () => {
    let n = 0;
    montar({ respuestas: { 'engineAdmin.status': () => (++n === 1 ? falla('functions/unavailable') : ESTADO_MOTOR) } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No connection to the server. Are the emulators running?');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    await userEvent.click(within(alerta).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
  });
});

describe('Resumen', () => {
  it('muestra el estado del motor que informa el servidor', async () => {
    montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR } });
    expect(await screen.findByText('ProveedorX')).toBeInTheDocument();
    expect(screen.getByText('Simulated')).toBeInTheDocument();
    expect(screen.getByText('text.generate')).toBeInTheDocument();
    expect(screen.getByText('provx/modelo-1')).toBeInTheDocument();
  });

  it('avisa si la IA está detenida', async () => {
    montar({ respuestas: { 'engineAdmin.status': { ...ESTADO_MOTOR, settings: { ...ESTADO_MOTOR.settings, iaDetenida: true } } } });
    expect(await screen.findByText('The stop switch is on: nothing new is generated.')).toBeInTheDocument();
  });

  it('error del servidor: mensaje traducido, sin filtrar el detalle, y se puede reintentar', async () => {
    let n = 0;
    montar({ respuestas: { 'engineAdmin.status': () => (++n === 1 ? falla('functions/internal') : ESTADO_MOTOR) } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('The server failed to respond. Try again.');
    expect(document.body.textContent).not.toContain('SECRETO');
    await userEvent.click(within(alerta).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('ProveedorX')).toBeInTheDocument();
  });

  it('sin conexión con el servidor lo dice', async () => {
    montar({ respuestas: { 'engineAdmin.status': falla('functions/unavailable') } });
    expect(await screen.findByRole('alert')).toHaveTextContent('No connection to the server. Are the emulators running?');
  });

  it('sin proveedores ni rutas: estados vacíos, no tablas vacías', async () => {
    montar({ respuestas: { 'engineAdmin.status': { source: 'defaults', settings: {}, providers: [], routing: [] } } });
    expect(await screen.findByText('The server did not report any provider.')).toBeInTheDocument();
    expect(screen.getByText('The server did not report any route.')).toBeInTheDocument();
  });
});

describe('Credits', () => {
  const respuestas = {
    'engineAdmin.status': ESTADO_MOTOR,
    'creditsAdmin.stats': { global: { circulating: 1234, totalSpent: 50 }, daily: [{ id: 'daily_2026-10-01', totalSpent: 5 }] },
    'creditsAdmin.failed': { items: [] },
    'creditsAdmin.costs': { costs: { ai_image: 12 } },
  };

  it('muestra la conversión, totales, costes y el estado vacío de las reembolsadas', async () => {
    montar({ respuestas });
    await ir('credits');
    expect(await screen.findByText('US$ 1 = 100 Credits')).toBeInTheDocument();
    expect(screen.queryByText(/different from the Weë reference/)).not.toBeInTheDocument();
    expect(await screen.findByText('1,234')).toBeInTheDocument();
    expect(await screen.findByText('ai_image')).toBeInTheDocument();
    expect(await screen.findByText('There are no refunded operations.')).toBeInTheDocument();
    expect(screen.getByText('2026-10-01')).toBeInTheDocument();
  });

  it('aunque el servidor siga mandando el catálogo heredado de paquetes, no se pinta ningún plan ni precio', async () => {
    montar({
      respuestas: {
        ...respuestas,
        'creditsAdmin.costs': {
          costs: { ai_image: 12 },
          packages: [{ id: 'basic', name: 'Básico', credits: 40, priceUsd: 4.99 }, { id: 'blackpro', name: 'Black Pro', credits: 200, priceUsd: 19.9 }],
        },
      },
    });
    await ir('credits');
    expect(await screen.findByText('ai_image')).toBeInTheDocument();
    /* La única mención permitida es la nota que dice que NO hay planes ni paquetes. */
    const texto = (document.body.textContent ?? '').replace('There are no plans, tiers or packages', '');
    for (const prohibido of [/black\s*pro/i, /básico/i, /\bpackages?\b/i, /\bplans?\b/i, /price \(usd\)/i, /19[.,]9/, /4[.,]99/]) {
      expect(texto).not.toMatch(prohibido);
    }
  });

  it('si el motor informa otra conversión, lo avisa en vez de esconderlo', async () => {
    montar({ respuestas: { ...respuestas, 'engineAdmin.status': { ...ESTADO_MOTOR, settings: { ...ESTADO_MOTOR.settings, creditsPerUsd: 80 } } } });
    await ir('credits');
    expect(await screen.findByText('US$ 1 = 80 Credits')).toBeInTheDocument();
    expect(screen.getByText(/different from the Weë reference \(US\$ 1 = 100 Credits\)/)).toBeInTheDocument();
  });

  it('si el motor no informa la conversión, lo dice sin inventarla', async () => {
    montar({ respuestas: { ...respuestas, 'engineAdmin.status': { ...ESTADO_MOTOR, settings: {} } } });
    await ir('credits');
    expect(await screen.findByText('The server did not report the conversion between dollars and Credits.')).toBeInTheDocument();
    expect(screen.queryByText(/US\$ 1 =/)).not.toBeInTheDocument();
  });

  it('sin estadísticas: dice que todavía no hay, sin ceros inventados', async () => {
    montar({ respuestas: { ...respuestas, 'creditsAdmin.stats': { global: {}, daily: [] } } });
    await ir('credits');
    expect(await screen.findByText('There are no Credits statistics yet.')).toBeInTheDocument();
  });

  it('consulta una cuenta: saldo e historial con los parámetros exactos', async () => {
    const { invocar } = montar({
      respuestas: {
        ...respuestas,
        'creditsAdmin.balance': { userId: 'uidAna', balance: 77, lifetimeEarned: 100, lifetimeSpent: 23, initialized: true },
        'creditsAdmin.userHistory': { items: [{ id: 'usage_1', type: 'usage', status: 'COMPLETED', amount: -3, service: 'ai_image', reason: 'Imagen', source: 'wee-creator', createdAt: 1_700_000_000_000 }] },
      },
    });
    await ir('credits');
    await userEvent.type(await screen.findByLabelText('account uid'), ' uidAna ');
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText('77')).toBeInTheDocument();
    expect(await screen.findByText('usage')).toBeInTheDocument();
    expect(invocar).toHaveBeenCalledWith('creditsAdmin', { userId: 'uidAna', action: 'balance' });
    expect(invocar).toHaveBeenCalledWith('creditsAdmin', { userId: 'uidAna', limit: 25, action: 'userHistory' });
  });

  it('cuenta sin inicializar: lo explica y no inventa movimientos', async () => {
    montar({ respuestas: { ...respuestas, 'creditsAdmin.balance': { userId: 'u2', balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, initialized: false }, 'creditsAdmin.userHistory': { items: [] } } });
    await ir('credits');
    await userEvent.type(await screen.findByLabelText('account uid'), 'u2');
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText(/no initialized balance yet/)).toBeInTheDocument();
    expect(await screen.findByText('This account has no movements.')).toBeInTheDocument();
  });

  it('cuenta inexistente: mensaje claro, sin pantalla de error técnica', async () => {
    montar({ respuestas: { ...respuestas, 'creditsAdmin.balance': falla('functions/not-found'), 'creditsAdmin.userHistory': falla('functions/not-found') } });
    await ir('credits');
    await userEvent.type(await screen.findByLabelText('account uid'), 'nadie');
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText('There is no Real Profile for that uid.')).toBeInTheDocument();
  });

  it('un uid con barras no llega a salir al servidor', async () => {
    const { llamadas } = montar({ respuestas });
    await ir('credits');
    await userEvent.type(await screen.findByLabelText('account uid'), 'a/b');
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(llamadas.some((l) => l.datos.action === 'balance')).toBe(false);
  });
});

describe('Moderación', () => {
  const reporte = { reportId: ID_REPORTE, status: 'RECEIVED', reason: 'SPAM', targetType: 'POST', targetId: 'post1', reporterAccountId: 'accA', details: '<b>texto</b> del denunciante', createdAt: 1_700_000_000_000, historyCount: 1 };

  it('lista los reportes, cambia de estado y abre el historial', async () => {
    const { invocar } = montar({
      respuestas: {
        'engineAdmin.status': ESTADO_MOTOR,
        'moderationAdmin.list': (d: Record<string, unknown>) => ({ reports: d.status === 'RECEIVED' ? [reporte] : [] }),
        'moderationAdmin.history': { history: [{ seq: 1, type: 'CREATED', at: 5, by: { kind: 'REPORTER', id: 'accA' } }] },
      },
    });
    await ir('moderacion');
    expect(await screen.findByText('POST · post1')).toBeInTheDocument();
    expect(invocar).toHaveBeenCalledWith('moderationAdmin', { status: 'RECEIVED', limit: 25, action: 'list' });

    await userEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(await screen.findByText('REPORTER · accA')).toBeInTheDocument();
    expect(invocar).toHaveBeenCalledWith('moderationAdmin', { reportId: ID_REPORTE, action: 'history' });
    /* El texto del denunciante se pinta como texto, nunca como HTML. */
    expect(screen.getByText('<b>texto</b> del denunciante')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismissed' }));
    expect(await screen.findByText('There are no reports in this status.')).toBeInTheDocument();
    expect(invocar).toHaveBeenCalledWith('moderationAdmin', { status: 'DISMISSED', limit: 25, action: 'list' });
    expect(screen.queryByText('Report detail')).not.toBeInTheDocument();
  });

  it('error de la API en la cola: se muestra y se puede reintentar', async () => {
    montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR, 'moderationAdmin.list': falla('functions/internal') } });
    await ir('moderacion');
    expect(await screen.findByRole('alert')).toHaveTextContent('The server failed to respond. Try again.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('un estado desconocido no existe en la interfaz: solo los cinco del contrato', async () => {
    montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR, 'moderationAdmin.list': { reports: [] } } });
    await ir('moderacion');
    const grupo = await screen.findByRole('group', { name: 'Status' });
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(['Received', 'In review', 'Actioned', 'Dismissed', 'Escalated']);
  });
});

describe('lo que la consola pide al servidor', () => {
  it('recorrer todas las vistas solo invoca acciones de la lista permitida, y ninguna escribe', async () => {
    const { invocar } = montar({
      respuestas: {
        'engineAdmin.status': ESTADO_MOTOR,
        'creditsAdmin.stats': { global: { circulating: 1 }, daily: [] },
        'creditsAdmin.failed': { items: [] },
        'creditsAdmin.costs': { costs: { ai_text: 1 } },
        'moderationAdmin.list': { reports: [] },
      },
    });
    await screen.findByText('ProveedorX');
    await ir('credits');
    await screen.findByText('ai_text');
    await ir('moderacion');
    await waitFor(() => expect(invocar).toHaveBeenCalledWith('moderationAdmin', expect.anything()));
    const permitidas = new Set(NOMBRES_DE_ACCION as string[]);
    const hechas = invocar.mock.calls.map(([callable, datos]) => `${callable}.${datos.action}`);
    expect(hechas.length).toBeGreaterThanOrEqual(5);
    for (const h of hechas) expect(permitidas.has(h), h).toBe(true);
  });
});
