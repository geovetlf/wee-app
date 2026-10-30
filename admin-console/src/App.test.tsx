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
/** Operaciones va por pestañas: solo se consulta, y solo se ve, la que está abierta. */
const pestana = async (nombre: string) => { await userEvent.click(await screen.findByRole('tab', { name: nombre })); };

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
    const { llamadas, sesion } = montar({ respuestas: { 'opsAdmin.quienSoy': falla('functions/permission-denied') } });
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
    window.location.hash = '#/resumen';
    montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR, 'creditsAdmin.stats': falla('functions/permission-denied') } });
    expect(await screen.findByText('ProveedorX')).toBeInTheDocument();
    await ir('credits');
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('ProveedorX');
  });

  it('una sesión caducada saca de la consola y pide volver a iniciar sesión', async () => {
    const { sesion } = montar({ respuestas: { 'opsAdmin.quienSoy': falla('functions/unauthenticated') } });
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
    const { llamadas } = montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR, 'opsAdmin.quienSoy': () => (++n === 1 ? new Promise((r) => { confirmar = r; }) : {}) } });
    expect(await screen.findByText('Checking permissions with the server…')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    /* Solo se ha pedido la comprobación; ninguna vista ha salido a buscar datos. */
    expect(llamadas.map((l) => `${l.callable}.${l.datos.action}`)).toEqual(['opsAdmin.quienSoy']);
    await act(async () => { confirmar({ rol: null, permisos: [] }); });
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('si la comprobación falla por la red, no entra: muestra el error y deja reintentar', async () => {
    let n = 0;
    montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR, 'opsAdmin.quienSoy': () => (++n === 1 ? falla('functions/unavailable') : {}) } });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('The server could not serve this request: no connection, or it could not check your permission or record the access. Try again.');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    await userEvent.click(within(alerta).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
  });
});

describe('Panorama (portada)', () => {
  const reporte = (i: number) => ({ reportId: `rep_${String(i).padStart(32, '0')}`, status: 'RECEIVED', reason: 'SPAM', createdAt: 1 });
  const base = {
    'engineAdmin.status': { ...ESTADO_MOTOR, providers: [...ESTADO_MOTOR.providers, { id: 'apagado', name: 'Apagado', configured: true, enabled: false }] },
    'creditsAdmin.stats': { global: { circulating: 5000, totalSpent: 120, totalRefunded: 7, failed: 2 }, daily: [] },
    'moderationAdmin.list': (d: Record<string, unknown>) => ({ reports: d.status === 'RECEIVED' ? Array.from({ length: 50 }, (_, i) => reporte(i)) : d.status === 'ESCALATED' ? [reporte(99)] : [] }),
  };

  it('es la portada y solo enseña datos con fuente, cada uno con su procedencia y su hora', async () => {
    montar({ respuestas: base });
    expect(await screen.findByRole('heading', { name: 'Overview', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('5,000')).toBeInTheDocument();
    /* Con clave Y habilitado: ProveedorX sí, Apagado no. */
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText(/^Source: engineAdmin\.status · read: /)).toBeInTheDocument();
    expect(screen.getByText(/^Source: creditsAdmin\.stats · read: /)).toBeInTheDocument();
    expect(await screen.findByText(/^Source: moderationAdmin\.list · read: /)).toBeInTheDocument();
  });

  it('las denuncias: si el servidor corta en 50 dice «50 o más», nunca un número exacto que no sabe', async () => {
    montar({ respuestas: base });
    expect(await screen.findByText('50 or more')).toBeInTheDocument();
    expect(screen.queryByText('50')).not.toBeInTheDocument();
  });

  it('lo que no se mide se dice, sin cifras inventadas', async () => {
    montar({ respuestas: base });
    const bloque = (await screen.findByRole('heading', { name: 'The 16 domains' })).closest('section')!;
    expect(within(bloque).getAllByRole('row').slice(1)).toHaveLength(16);
    /* Los cuatro sin nada real: Music, Design, Guardian y Copilot. */
    expect(within(bloque).getAllByText('Pending')).toHaveLength(4);
    expect(within(bloque).queryByText('Operational')).not.toBeInTheDocument();
    expect(bloque.querySelector('tbody')?.textContent).not.toMatch(/\d/);
  });

  it('lo que el servidor no dio no es un cero: «sin datos», y un error no pinta cifras', async () => {
    montar({ respuestas: { ...base, 'creditsAdmin.stats': { global: {}, daily: [] }, 'engineAdmin.status': falla('functions/internal'), 'moderationAdmin.list': falla('functions/internal') } });
    const credits = (await screen.findByRole('heading', { name: 'Credits', level: 2 })).closest('article')!;
    expect(await within(credits).findByText('No data')).toBeInTheDocument();
    const servicios = (await screen.findByRole('heading', { name: 'Weë AI', level: 2 })).closest('article')!;
    expect(await within(servicios).findByText('Error')).toBeInTheDocument();
    const denuncias = (await screen.findByRole('heading', { name: 'Open reports', level: 2 })).closest('article')!;
    await within(denuncias).findAllByRole('alert');
    for (const bloque of [credits, servicios, denuncias]) expect(bloque.textContent?.replace(/Source:.*/, '')).not.toMatch(/\d/);
  });

  it('un rol con todo ve los indicadores, y una lista cortada dice «N o más», nunca N', async () => {
    const lleno = (i: number) => ({ id: `c${i}`, experiencia: 'chef', estado: 'running', actualizado: 5 });
    montar({ respuestas: {
      ...base,
      'opsAdmin.quienSoy': { rol: 'owner', permisos: ['ops.read', 'ai.read', 'finance.read', 'accounts.read', 'audit.read', 'moderation.read'] },
      'opsAdmin.usoIa': { dia: '2026-10-30', existe: true, items: [{ capacidad: 'text.generate', proveedor: 'provx', llamadas: 7, fallos: 2, credits: 1 }], truncado: false },
      'opsAdmin.creacionesAtascadas': { items: Array.from({ length: 25 }, (_, i) => lleno(i)), truncado: true, cursor: 'c24' },
      'opsAdmin.atascados': { items: [{ jobId: 'en-plazo', estado: 'waiting', dentroDePlazo: true }], truncado: false },
      'opsAdmin.cola': { items: [{ jobId: 'q1', retrasado: true }], truncado: false },
      'opsAdmin.reservas': { items: [{ id: 'r1', servicio: 'ai_video', importe: 40 }], truncado: false },
      'opsAdmin.generaciones': { items: [{ id: 'g1', capacidad: 'image.generate', proveedor: 'provx', estado: 'FAILED' }], truncado: true },
      'opsAdmin.auditoria': { items: [{ en: 5, actorUid: 'duena', accion: 'opsAdmin.cola', resultado: 'denegado', correlationId: 'adm_9' }], truncado: true },
    } });
    const atencion = (await screen.findByRole('heading', { name: 'Jobs that need attention', level: 2 })).closest('article')!;
    /* 25 (cortada) + 0 (el que espera dentro de plazo no cuenta) + 0 apartados. */
    expect(await within(atencion).findAllByText('25 or more')).not.toHaveLength(0);
    expect(within(atencion).getByText('Needs attention')).toBeInTheDocument();
    expect(await screen.findByText('2 of 7 calls')).toBeInTheDocument();
    expect(await screen.findByText('Oldest first.', { exact: false })).toBeInTheDocument();
    expect((await screen.findAllByText('Denied')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Source not integrated').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Your role does not include:/)).not.toBeInTheDocument();
  });

  it('la cola no dice «Correcto» si tiene algo apartado o retrasado', async () => {
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read'] }, 'opsAdmin.cola': { items: [{ jobId: 'q1', apartado: true }], truncado: false } } });
    const cola = (await screen.findByRole('heading', { name: 'Operations queue', level: 2 })).closest('article')!;
    expect(await within(cola).findByText('Needs attention')).toBeInTheDocument();
    expect(within(cola).queryByText('OK')).not.toBeInTheDocument();
  });

  it('la actividad administrativa no oculta ninguna entrada: marca las de esta pantalla y destaca lo que hay que revisar', async () => {
    const entrada = (en: number, actorUid: string, accion: string, resultado: string) => ({ en, actorUid, accion, resultado, correlationId: `adm_${en}` });
    const { invocar } = montar({ respuestas: {
      ...base,
      'opsAdmin.quienSoy': { rol: 'owner', permisos: ['audit.read'] },
      'opsAdmin.auditoria': { items: [entrada(9, 'admin1', 'opsAdmin.auditoria', 'ok'), entrada(8, 'admin1', 'opsAdmin.cola', 'ok'), entrada(7, 'admin1', 'opsAdmin.cola', 'denegado'), entrada(6, 'otra', 'opsAdmin.reservas', 'ok'), entrada(5, 'admin1', 'accountsAdmin.buscar', 'ok')], truncado: false },
    } });
    const bloque = (await screen.findByRole('heading', { name: 'Administrative activity' })).closest('section')!;
    const ultimas = (await within(bloque).findByRole('heading', { name: 'Latest entries' })).parentElement!;
    /* Todas, en el orden en que llegan: también las lecturas propias de esta pantalla. */
    expect(within(ultimas).getAllByRole('listitem').map((f) => f.querySelector('.codigo')?.textContent)).toEqual(['opsAdmin.auditoria', 'opsAdmin.cola', 'opsAdmin.cola', 'opsAdmin.reservas', 'accountsAdmin.buscar']);
    /* Marcadas solo las de quien mira y de esta pantalla. */
    expect(within(ultimas).getAllByText('Read from this screen')).toHaveLength(3);
    const revisar = within(bloque).getByRole('heading', { name: 'Need review' }).parentElement!;
    expect(within(revisar).getAllByRole('listitem')).toHaveLength(1);
    expect(within(revisar).getByText('Denied')).toBeInTheDocument();
    expect(invocar).toHaveBeenCalledWith('opsAdmin', { limit: 50, action: 'auditoria' });
  });

  it('un refresco que falla no se presenta como actualizado, no pinta ceros, y al reintentar vuelve el dato', async () => {
    let falla_ = false;
    montar({ respuestas: { ...base, 'creditsAdmin.stats': () => (falla_ ? falla('functions/internal') : base['creditsAdmin.stats']) } });
    expect(await screen.findByText('5,000')).toBeInTheDocument();
    expect(await screen.findByText(/^Updated: /)).toBeInTheDocument();
    falla_ = true;
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    const alerta = await screen.findByRole('alert');
    expect(await screen.findByText(/^With errors · last successful read: /)).toBeInTheDocument();
    expect(screen.queryByText(/^Updated: /)).not.toBeInTheDocument();
    /* El dato viejo no se queda fingiendo que es el último, y tampoco aparece un cero. */
    expect(screen.queryByText('5,000')).not.toBeInTheDocument();
    const credits = screen.getByRole('heading', { name: 'Credits', level: 2 }).closest('article')!;
    expect(credits.textContent?.replace(/Source:.*/, '')).not.toMatch(/\d/);
    falla_ = false;
    await userEvent.click(within(alerta).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('5,000')).toBeInTheDocument();
    expect(await screen.findByText(/^Updated: /)).toBeInTheDocument();
  });

  it('el cajón móvil: el foco entra al abrir, Escape lo cierra y el foco vuelve al botón', async () => {
    montar({ respuestas: base });
    const abrir = await screen.findByRole('button', { name: 'Open the menu' });
    await userEvent.click(abrir);
    expect(screen.getByRole('button', { name: 'Close the menu' })).toHaveFocus();
    expect(abrir).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    expect(abrir).toHaveFocus();
  });

  it('al cambiar de sección el foco va al contenido', async () => {
    montar({ respuestas: base });
    await screen.findByText('5,000');
    await ir('dominios');
    await screen.findByRole('heading', { name: 'Weë domains', level: 1 });
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('«Actualizar» repite las lecturas y dice la hora; sin ninguna respuesta, la hora es desconocida', async () => {
    const { invocar } = montar({ respuestas: base });
    await screen.findByText('50 or more');
    expect(await screen.findByText(/^Updated: /)).toBeInTheDocument();
    const antes = invocar.mock.calls.filter(([c]) => c === 'creditsAdmin').length;
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(invocar.mock.calls.filter(([c]) => c === 'creditsAdmin').length).toBe(antes + 1));
    expect(await screen.findByText('5,000')).toBeInTheDocument();
    cleanup();
    montar({ respuestas: { 'engineAdmin.status': falla('functions/internal'), 'creditsAdmin.stats': falla('functions/internal'), 'moderationAdmin.list': falla('functions/internal') } });
    expect(await screen.findByText('Last update unknown')).toBeInTheDocument();
  });

  it('si un bloque falla, los demás siguen y el que falla se puede reintentar', async () => {
    montar({ respuestas: { ...base, 'creditsAdmin.stats': falla('functions/internal') } });
    expect(await screen.findByText('1 of 2')).toBeInTheDocument();
    expect(await screen.findByText('50 or more')).toBeInTheDocument();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('The server failed to respond, or could not be reached. Try again.');
    expect(within(alerta).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('SECRETO');
  });

  it('un «sin permiso» en cualquier bloque saca de la consola entera', async () => {
    montar({ respuestas: { ...base, 'moderationAdmin.list': falla('functions/permission-denied') } });
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('5,000');
  });

  it('solo pide acciones de lectura de la lista permitida', async () => {
    const { invocar } = montar({ respuestas: base });
    await screen.findByText('50 or more');
    const hechas = invocar.mock.calls.map(([c, d]) => `${c}.${d.action}`);
    expect(new Set(hechas)).toEqual(new Set(['engineAdmin.status', 'opsAdmin.quienSoy', 'creditsAdmin.stats', 'moderationAdmin.list']));
    expect(invocar).toHaveBeenCalledWith('moderationAdmin', { status: 'RECEIVED', limit: 50, action: 'list' });
  });
});

describe('Motor de IA (ruta resumen)', () => {
  beforeEach(() => { window.location.hash = '#/resumen'; });

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
    expect(alerta).toHaveTextContent('The server failed to respond, or could not be reached. Try again.');
    expect(document.body.textContent).not.toContain('SECRETO');
    await userEvent.click(within(alerta).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('ProveedorX')).toBeInTheDocument();
  });

  it('sin conexión con el servidor lo dice', async () => {
    montar({ respuestas: { 'engineAdmin.status': falla('functions/unavailable') } });
    expect(await screen.findByRole('alert')).toHaveTextContent('The server could not serve this request: no connection, or it could not check your permission or record the access. Try again.');
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

  it('consumo por servicio: tabla del Credit Engine, de más a menos gastado; vacío si no hay', async () => {
    montar({ respuestas: { ...respuestas, 'creditsAdmin.stats': { global: { circulating: 9, byService: { ai_text: { spent: 4, count: 2 }, ai_video: { spent: 26, count: 1 } } }, daily: [] } } });
    await ir('credits');
    const titulo = await screen.findByRole('heading', { name: 'Consumption by service' });
    const filas = within(titulo.nextElementSibling as HTMLElement).getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(filas).toEqual(['ai_video261—', 'ai_text42—']);
  });

  it('sin consumo por servicio lo dice', async () => {
    montar({ respuestas });
    await ir('credits');
    expect(await screen.findByText('There is no consumption by service yet.')).toBeInTheDocument();
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
    expect(await screen.findByText('Usage')).toBeInTheDocument();
    expect(invocar).toHaveBeenCalledWith('creditsAdmin', { userId: 'uidAna', action: 'balance' });
    expect(invocar).toHaveBeenCalledWith('creditsAdmin', { userId: 'uidAna', limit: 25, action: 'userHistory' });
    /* Se pidió a mano y queda en la auditoría: «Actualizar» repite la vista, no esa consulta. */
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(invocar.mock.calls.filter(([, d]) => d.action === 'stats').length).toBe(2));
    expect(invocar.mock.calls.filter(([, d]) => d.action === 'balance')).toHaveLength(1);
  });

  it('dice que las recargas están deshabilitadas, sin ofrecer ninguna compra', async () => {
    montar({ respuestas });
    await ir('credits');
    expect(await screen.findByText('Top-ups pending implementation and integration')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /buy|purchase|top.?up|grant/i })).not.toBeInTheDocument();
  });

  it('si el servidor no manda lo acumulado de una cuenta, no se inventa un cero', async () => {
    montar({ respuestas: { ...respuestas, 'creditsAdmin.balance': { userId: 'u3', balance: 5, initialized: true }, 'creditsAdmin.userHistory': { items: [] } } });
    await ir('credits');
    await userEvent.type(await screen.findByLabelText('account uid'), 'u3');
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }));
    const etiqueta = await screen.findByText('Earned in total');
    expect(etiqueta.nextElementSibling).toHaveTextContent('—');
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

describe('secciones por permiso (lo confirma el servidor con quienSoy)', () => {
  const OWNER = { rol: 'owner', permisos: ['ops.read', 'ai.read', 'finance.read', 'accounts.read', 'audit.read', 'moderation.read'], entorno: 'demo-wee' };
  const base = { 'engineAdmin.status': ESTADO_MOTOR };
  const enlaces = async () => within(await screen.findByRole('navigation')).getAllByRole('link').map((a) => a.textContent);

  it('administración sin rol: solo las secciones de siempre', async () => {
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: null, permisos: [] } } });
    await screen.findByRole('navigation');
    await act(async () => { await Promise.resolve(); });
    expect(await enlaces()).toEqual(['Overview', 'Domains', 'AI engine', 'Credits', 'Moderation']);
  });

  it('owner: también Operaciones, Cuentas y Auditoría, y dice su rol', async () => {
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': OWNER } });
    expect(await screen.findByRole('link', { name: 'Audit' })).toBeInTheDocument();
    expect(await enlaces()).toEqual(['Overview', 'Domains', 'AI engine', 'Operations', 'Credits', 'Accounts', 'Moderation', 'Audit']);
    expect(screen.getByText('Role: owner')).toBeInTheDocument();
  });

  it('si quienSoy falla, no se entra: nunca más de lo que el servidor confirmó', async () => {
    const { invocar } = montar({ respuestas: { ...base, 'opsAdmin.quienSoy': falla('functions/internal') } });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(invocar.mock.calls.map(([c, d]) => `${c}.${d.action}`)).toEqual(['opsAdmin.quienSoy']);
  });

  it('A1: un rol limitado solo ve lo suyo y no pide nada de lo que le denegarían', async () => {
    const { invocar } = montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'support', permisos: ['accounts.read'] } } });
    expect(await screen.findByRole('link', { name: 'Accounts' })).toBeInTheDocument();
    expect(await enlaces()).toEqual(['Overview', 'Domains', 'Accounts']);
    await act(async () => { await Promise.resolve(); });
    expect(invocar.mock.calls.every(([c, d]) => `${c}.${d.action}` === 'opsAdmin.quienSoy')).toBe(true);
    expect(screen.queryByRole('heading', { name: 'Access denied' })).not.toBeInTheDocument();
  });

  it('A1: finanzas entra en Credits sin pedir el estado del motor, que no le corresponde', async () => {
    window.location.hash = '#/credits';
    const { invocar } = montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'finance', permisos: ['finance.read'] } } });
    expect(await screen.findByRole('heading', { name: 'Credits', level: 1 })).toBeInTheDocument();
    await act(async () => { await Promise.resolve(); });
    expect(invocar.mock.calls.some(([c]) => c === 'engineAdmin')).toBe(false);
    expect(screen.queryByRole('heading', { name: 'Access denied' })).not.toBeInTheDocument();
  });

  it('revocación: si el rol cae a mitad de uso, la consola se va', async () => {
    window.location.hash = '#/operaciones';
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read'] }, 'opsAdmin.atascados': falla('functions/permission-denied') } });
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('M4: una ventana vacía y parcial no dice «no hay», y deja seguir mirando', async () => {
    window.location.hash = '#/operaciones';
    const { invocar } = montar({ respuestas: {
      ...base,
      'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read'] },
      'opsAdmin.creaciones': (d: Record<string, unknown>) => (d.cursor
        ? { items: [{ id: 'vieja', experiencia: 'chef', estado: 'done' }], truncado: false, parcial: false, examinados: 1 }
        : { items: [], truncado: true, parcial: true, examinados: 200, cursor: 'c200' }),
    } });
    await pestana('Creations and Filmmaker');
    expect(await screen.findByText('Nothing in what has been checked. That does not mean there is none: keep looking.')).toBeInTheDocument();
    expect(screen.queryByText('No creations match these filters.')).not.toBeInTheDocument();
    expect(screen.getByText(/The latest 200 documents were checked/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check the next ones' }));
    expect(await screen.findByText('vieja')).toBeInTheDocument();
    expect(invocar).toHaveBeenCalledWith('opsAdmin', { limit: 25, cursor: 'c200', action: 'creaciones' });
    await userEvent.click(screen.getByRole('button', { name: 'Back to the start' }));
    expect(await screen.findByText(/The latest 200 documents were checked/)).toBeInTheDocument();
  });

  it('M4: cambiar de filtro vuelve a empezar, sin arrastrar el punto de continuación', async () => {
    window.location.hash = '#/operaciones';
    const { invocar } = montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read'] }, 'opsAdmin.creaciones': { items: [], truncado: true, parcial: true, examinados: 200, cursor: 'c200' } } });
    await pestana('Creations and Filmmaker');
    await userEvent.click(await screen.findByRole('button', { name: 'Check the next ones' }));
    await userEvent.selectOptions(screen.getByLabelText('Experience'), 'travel');
    await waitFor(() => expect(invocar).toHaveBeenLastCalledWith('opsAdmin', expect.objectContaining({ experiencia: 'travel', action: 'creaciones' })));
    await waitFor(() => expect(invocar.mock.calls.at(-1)?.[1]).not.toHaveProperty('cursor'));
  });

  it('M5: toda lista cortada lo dice, también Reservas y Producciones', async () => {
    window.location.hash = '#/operaciones';
    montar({ respuestas: {
      ...base,
      'opsAdmin.quienSoy': { rol: 'owner', permisos: ['ops.read', 'finance.read'] },
      'opsAdmin.reservas': { items: [{ id: 't1', servicio: 'ai_video' }], truncado: true, cursor: 't1' },
      'opsAdmin.producciones': { items: [{ id: 'p1', estado: 'active' }], truncado: true, cursor: 'p1' },
    } });
    await pestana('Credits reservations');
    expect(await screen.findByText('ai_video')).toBeInTheDocument();
    expect(screen.getByText('There may be more than what is shown here.', { exact: false })).toBeInTheDocument();
    await pestana('Creations and Filmmaker');
    expect(await screen.findByText('p1')).toBeInTheDocument();
    expect(screen.getByText('There may be more than what is shown here.', { exact: false })).toBeInTheDocument();
  });

  it('Operaciones: solo consulta la pestaña abierta, y las pestañas se manejan con el teclado', async () => {
    window.location.hash = '#/operaciones';
    const { invocar } = montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read', 'ai.read'] }, 'opsAdmin.capacidades': { noDisponibles: [] } } });
    const primera = await screen.findByRole('tab', { name: 'Needs attention' });
    await waitFor(() => expect(invocar).toHaveBeenCalledWith('opsAdmin', expect.objectContaining({ action: 'cola' })));
    const hechas = () => invocar.mock.calls.map(([, d]) => d.action);
    expect(hechas()).not.toContain('creaciones');
    expect(hechas()).not.toContain('generaciones');
    primera.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Creations and Filmmaker' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Creations and Filmmaker' })).toHaveFocus();
    await waitFor(() => expect(hechas()).toContain('creaciones'));
    /* Finanzas no está en este rol: ni su pestaña existe. */
    expect(screen.queryByRole('tab', { name: 'Credits reservations' })).not.toBeInTheDocument();
  });

  it('Operaciones: sin permiso de finanzas no hay columna de coste', async () => {
    window.location.hash = '#/operaciones';
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read', 'ai.read'] }, 'opsAdmin.generaciones': { items: [{ id: 'g1', capacidad: 'image.generate', estado: 'COMPLETED' }], truncado: false } } });
    await pestana('Generations and AI');
    expect(await screen.findByText('image.generate')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Cost (USD)' })).not.toBeInTheDocument();
  });

  it('M6: la cola y las creaciones atascadas se ven, y la cola vacía no habla de las creaciones', async () => {
    window.location.hash = '#/operaciones';
    montar({ respuestas: {
      ...base,
      'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read'] },
      'opsAdmin.creacionesAtascadas': { items: [{ id: 'sin-plazo', experiencia: 'chef', estado: 'running' }], truncado: false },
      'opsAdmin.cola': { items: [] },
    } });
    expect(await screen.findByText('sin-plazo')).toBeInTheDocument();
    expect(await screen.findByText('The Job Engine queue is empty. This says nothing about creations.')).toBeInTheDocument();
  });

  it('M6: un trabajo dentro de plazo y un aviso apartado se distinguen de un atasco', async () => {
    window.location.hash = '#/operaciones';
    montar({ respuestas: {
      ...base,
      'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read'] },
      'opsAdmin.atascados': { items: [{ jobId: 'espera-video', estado: 'waiting', dentroDePlazo: true }], truncado: false },
      'opsAdmin.cola': { items: [{ jobId: 'envenenado', apartado: true }], truncado: false },
    } });
    expect(await screen.findByText('Within deadline')).toBeInTheDocument();
    expect(await screen.findByText('Set aside: will not be delivered again')).toBeInTheDocument();
    expect(screen.queryByText('Delayed')).not.toBeInTheDocument();
  });

  it('M8: una cuenta antigua sin número lo explica', async () => {
    window.location.hash = '#/cuentas';
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': OWNER, 'accountsAdmin.buscar': { encontrada: true, uid: 'uidVieja', perfiles: [], acceso: { proveedores: [] } } } });
    await userEvent.type(await screen.findByLabelText('uid or account number'), 'uidVieja');
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText('This account has no account number: it predates numbering. It is looked up by its uid.')).toBeInTheDocument();
  });

  it('una ruta directa a una sección sin permiso cae en la portada y no pide sus datos', async () => {
    window.location.hash = '#/auditoria';
    const { invocar } = montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read', 'ai.read'] } } });
    expect(await screen.findByRole('heading', { name: 'Overview', level: 1 })).toBeInTheDocument();
    /* Y lo dice: no se queda en silencio llevándote a otro sitio. */
    expect(screen.getByText(/Your role does not include the section you asked for/)).toBeInTheDocument();
    expect(screen.getByText(/Your role does not include: .*Audit/)).toBeInTheDocument();
    await act(async () => { await Promise.resolve(); });
    expect(invocar.mock.calls.some(([c, d]) => c === 'opsAdmin' && d.action === 'auditoria')).toBe(false);
  });

  it('si el servidor niega una sección nueva, la consola entera se va: ocultarla no era la seguridad', async () => {
    window.location.hash = '#/auditoria';
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': OWNER, 'opsAdmin.auditoria': falla('functions/permission-denied') } });
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('Operaciones: cada bloque solo si hay permiso, y sin pedir lo que no se puede ver', async () => {
    window.location.hash = '#/operaciones';
    const { invocar } = montar({ respuestas: {
      ...base,
      'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read', 'ai.read'] },
      'opsAdmin.atascados': { items: [{ jobId: 'job-a', estado: 'running', capacidad: 'video.generate', proveedor: 'seedance', modelo: 'm1', cuenta: 'cuen…23', actualizado: 5, intentos: 2 }], examinados: 2, truncado: false, fuente: 'jobs' },
      'opsAdmin.creaciones': { items: [{ id: 'c1', experiencia: 'chef', estado: 'running', abandonado: true, pasos: 2, pasosFallidos: 1, creditsCobrados: 0, cuenta: 'cuen…23' }], examinados: 2, truncado: false },
      'opsAdmin.capacidades': { noDisponibles: [{ id: 'incidentes', motivo: 'x', dependencia: 'registro de incidentes' }] },
    } });
    expect(await screen.findByText('job-a')).toBeInTheDocument();
    await pestana('Creations and Filmmaker');
    expect(await screen.findByText('Abandoned')).toBeInTheDocument();
    expect(await screen.findByText('2 (1 failed)')).toBeInTheDocument();
    await pestana('No source');
    expect(await screen.findByText('Incidents: an incident record is missing.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Open Credits reservations' })).not.toBeInTheDocument();
    expect(invocar.mock.calls.some(([, d]) => d.action === 'reservas')).toBe(false);
  });

  it('Operaciones: el filtro por experiencia llega al servidor, y un fallo de un bloque no tumba los demás', async () => {
    window.location.hash = '#/operaciones';
    const { invocar } = montar({ respuestas: { ...base, 'opsAdmin.quienSoy': { rol: 'operations', permisos: ['ops.read'] }, 'opsAdmin.atascados': falla('functions/internal'), 'opsAdmin.creaciones': { items: [] }, 'opsAdmin.trabajos': { items: [] } } });
    expect(await screen.findByText('The server failed to respond, or could not be reached. Try again.')).toBeInTheDocument();
    /* El fallo de un bloque no tapa los de su lado: la cola, en la misma pestaña, sigue. */
    expect(await screen.findByText('The Job Engine queue is empty. This says nothing about creations.')).toBeInTheDocument();
    await pestana('Creations and Filmmaker');
    expect(await screen.findByText('There are no creations with these filters.')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Experience'), 'travel');
    await waitFor(() => expect(invocar).toHaveBeenCalledWith('opsAdmin', { experiencia: 'travel', limit: 25, action: 'creaciones' }));
  });

  it('Cuentas: por uid o por número, con lo que dice el servidor; sin botones de suspender', async () => {
    window.location.hash = '#/cuentas';
    const { invocar } = montar({ respuestas: {
      ...base,
      'opsAdmin.quienSoy': OWNER,
      'accountsAdmin.buscar': (d: Record<string, unknown>) => (d.uid === 'nadie' ? { encontrada: false } : {
        encontrada: true, uid: 'uidAna', correlationId: 'adm_x',
        perfiles: [{ id: 'r1', tipo: 'real' }, { id: 'hidi_uidAna', tipo: 'wee' }],
        cuenta: { numero: '123456789', estado: 'ACTIVE' }, acceso: { deshabilitado: false, tieneCorreo: true, correoVerificado: true, proveedores: ['password'] },
      }),
    } });
    await userEvent.type(await screen.findByLabelText('uid or account number'), '123-456-789');
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText('uidAna')).toBeInTheDocument();
    expect(invocar).toHaveBeenCalledWith('accountsAdmin', { numeroDeCuenta: '123-456-789', action: 'buscar' });
    expect(screen.getByText('Weë Profile')).toBeInTheDocument();
    expect(screen.getByText('Query logged: adm_x')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend|restrict|delete|disable/i })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('uid or account number'));
    await userEvent.type(screen.getByLabelText('uid or account number'), 'nadie');
    await userEvent.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText('No account has that identifier. Older accounts may have no number: try their uid.')).toBeInTheDocument();
  });

  it('Auditoría: se lee y no ofrece ninguna acción sobre las entradas; su único botón abre el detalle', async () => {
    window.location.hash = '#/auditoria';
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': OWNER, 'opsAdmin.auditoria': { items: [{ en: 5, actorUid: 'duena', actorRol: 'owner', accion: 'accountsAdmin.buscar', recurso: { tipo: 'cuenta', id: 'uidAna' }, resultado: 'ok', correlationId: 'adm_1', entorno: 'demo-wee', codigoDeError: 'not-found', metadatos: { limit: 5, apiKey: 'SECRETO' } }], truncado: false } } });
    expect(await screen.findByText('accountsAdmin.buscar')).toBeInTheDocument();
    expect(screen.getByText('cuenta · uidAna')).toBeInTheDocument();
    expect(screen.getByText('adm_1')).toBeInTheDocument();
    const fila = screen.getByText('adm_1').closest('tr')!;
    expect(within(fila).getAllByRole('button').map((b) => b.textContent)).toEqual(['View']);
    await userEvent.click(within(fila).getByRole('button', { name: 'View' }));
    expect(await screen.findByText('not-found')).toBeInTheDocument();
    expect(screen.getByText('limit')).toBeInTheDocument();
    /* Lo que parezca una credencial no se pinta, aunque llegara. */
    expect(document.body.textContent).not.toContain('SECRETO');
    expect(document.body.textContent).not.toContain('apiKey');
  });

  it('Auditoría: un intento sin cierre se distingue, y uno cerrado no; denegadas y fallidas tienen su etiqueta', async () => {
    window.location.hash = '#/auditoria';
    montar({ respuestas: { ...base, 'opsAdmin.quienSoy': OWNER, 'opsAdmin.auditoria': { items: [
      { en: 9, accion: 'a.denegada', resultado: 'denegado', correlationId: 'adm_d' },
      { en: 8, accion: 'a.cierre', resultado: 'ok', correlationId: 'adm_c' },
      { en: 7, accion: 'a.abierto', resultado: 'intento', correlationId: 'adm_a' },
      { en: 6, accion: 'a.cerrado', resultado: 'intento', correlationId: 'adm_c' },
      { en: 5, accion: 'a.fallida', resultado: 'error', correlationId: 'adm_f' },
    ], truncado: true } } });
    const filaDe = async (accion: string) => (await screen.findByText(accion)).closest('tr')!;
    expect(within(await filaDe('a.abierto')).getByText('Not closed')).toBeInTheDocument();
    expect(within(await filaDe('a.cerrado')).queryByText('Not closed')).not.toBeInTheDocument();
    expect(within(await filaDe('a.denegada')).getByText('Denied')).toBeInTheDocument();
    expect(within(await filaDe('a.fallida')).getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('There may be more than what is shown here.', { exact: false })).toBeInTheDocument();
    /* Los filtros son sobre lo cargado, y lo dicen. */
    expect(screen.getByText(/Filters only act on the 5 loaded entries/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Result'), 'denegado');
    expect(screen.queryByText('a.fallida')).not.toBeInTheDocument();
    expect(screen.getByText('a.denegada')).toBeInTheDocument();
  });
});

describe('dominios A–P', () => {
  const OWNER = { rol: 'owner', permisos: ['ops.read', 'ai.read', 'finance.read', 'accounts.read', 'audit.read', 'moderation.read'] };

  it('el catálogo lista los 16, no pide nada al servidor y se puede filtrar por estado', async () => {
    window.location.hash = '#/dominios';
    const { invocar } = montar({ respuestas: { 'opsAdmin.quienSoy': OWNER } });
    const bloque = (await screen.findByRole('heading', { name: 'The 16 domains' })).closest('section')!;
    expect(within(bloque).getAllByRole('row').slice(1)).toHaveLength(16);
    expect(invocar.mock.calls.map(([c, d]) => `${c}.${d.action}`)).toEqual(['opsAdmin.quienSoy']);
    await userEvent.selectOptions(within(bloque).getByLabelText('Status'), 'pendiente');
    expect(within(bloque).getAllByRole('row').slice(1).map((f) => f.querySelector('.letra')?.textContent)).toEqual(['G', 'H', 'M', 'N']);
    await userEvent.selectOptions(within(bloque).getByLabelText('Status'), 'operativo');
    expect(within(bloque).getByText('No domain is in that state.')).toBeInTheDocument();
  });

  it('una ficha dice el estado de cada función, y un dominio pendiente no enseña ningún botón de acción', async () => {
    window.location.hash = '#/dominios/n';
    const { invocar } = montar({ respuestas: { 'opsAdmin.quienSoy': OWNER } });
    expect(await screen.findByRole('heading', { name: 'Admin AI Copilot', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('This domain has no screen: there is nothing real to show.')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryAllByRole('button')).toHaveLength(0);
    expect(within(screen.getByRole('main')).queryByRole('textbox')).not.toBeInTheDocument();
    expect(invocar.mock.calls.every(([, d]) => d.action === 'quienSoy')).toBe(true);
  });

  it('una ficha enlaza su sección solo si el rol la puede abrir', async () => {
    window.location.hash = '#/dominios/c';
    montar({ respuestas: { 'opsAdmin.quienSoy': { rol: 'support', permisos: ['accounts.read'] } } });
    expect(await screen.findByText('Your role does not include this section')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Credits' })).not.toBeInTheDocument();
    expect(screen.getByText('Top-ups: pending implementation and integration')).toBeInTheDocument();
  });

  it('un dominio que no existe lo dice y enseña el catálogo', async () => {
    window.location.hash = '#/dominios/zz';
    montar({ respuestas: { 'opsAdmin.quienSoy': OWNER } });
    expect(await screen.findByText('That domain does not exist. These are the ones there are.')).toBeInTheDocument();
  });

  it('cada vista dice a qué dominios pertenece, con su estado real', async () => {
    window.location.hash = '#/credits';
    montar({ respuestas: { 'opsAdmin.quienSoy': OWNER } });
    expect(await screen.findByRole('link', { name: 'Domain Credits, balances and financial operations: Partial' })).toHaveAttribute('href', '#/dominios/c');
  });
});

describe('orden y búsqueda sobre lo cargado', () => {
  const OWNER = { rol: 'owner', permisos: ['ops.read', 'moderation.read', 'audit.read'] };

  it('ordena desde la cabecera, lo dice, y no pide nada más al servidor', async () => {
    window.location.hash = '#/auditoria';
    const { invocar } = montar({ respuestas: { 'opsAdmin.quienSoy': OWNER, 'opsAdmin.auditoria': { items: [
      { en: 5, accion: 'b.acc', resultado: 'ok', correlationId: 'c1' }, { en: 9, accion: 'a.acc', resultado: 'ok', correlationId: 'c2' }, { en: 1, resultado: 'ok', correlationId: 'c3' },
    ], truncado: false } } });
    await screen.findByText('b.acc');
    const antes = invocar.mock.calls.length;
    expect(screen.queryByText(/Sorting only acts on what is loaded/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Action/ }));
    expect(screen.getByRole('columnheader', { name: /^Action/ })).toHaveAttribute('aria-sort', 'ascending');
    const filas = () => screen.getAllByRole('row').slice(1).map((f) => f.querySelector('td:nth-child(3)')?.textContent);
    /* Lo que no tiene dato, al final, también al invertir. */
    expect(filas()).toEqual(['a.acc', 'b.acc', '—']);
    await userEvent.click(screen.getByRole('button', { name: /^Action/ }));
    expect(filas()).toEqual(['b.acc', 'a.acc', '—']);
    expect(screen.getByText(/Sorting only acts on what is loaded/)).toBeInTheDocument();
    expect(invocar.mock.calls.length).toBe(antes);
  });

  it('buscar en una lista paginada no va al servidor y avisa de que solo mira lo cargado', async () => {
    window.location.hash = '#/operaciones';
    const { invocar } = montar({ respuestas: { 'opsAdmin.quienSoy': OWNER, 'opsAdmin.creaciones': { items: [{ id: 'crea-uno', estado: 'done' }, { id: 'crea-dos', estado: 'done' }], truncado: true, cursor: 'x' } } });
    await pestana('Creations and Filmmaker');
    await screen.findByText('crea-uno');
    const antes = invocar.mock.calls.filter(([, d]) => d.action === 'creaciones').length;
    expect(screen.getByText('Searches only what is loaded: the server does not search by this.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search by creation or account'), 'zzz');
    expect(screen.getByText('Nothing loaded matches the search.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Search by creation or account'));
    await userEvent.type(screen.getByLabelText('Search by creation or account'), 'dos');
    expect(screen.queryByText('crea-uno')).not.toBeInTheDocument();
    expect(screen.getByText('crea-dos')).toBeInTheDocument();
    expect(invocar.mock.calls.filter(([, d]) => d.action === 'creaciones').length).toBe(antes);
    /* Sigue el aviso de que puede haber más: buscar no convierte una página en la lista entera. */
    expect(screen.getByText('There may be more than what is shown here.', { exact: false })).toBeInTheDocument();
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

  it('M5: si la cola viene llena, avisa de que puede haber más', async () => {
    const llenos = Array.from({ length: 25 }, (_, i) => ({ ...reporte, reportId: `rep_${String(i).padStart(32, '0')}` }));
    montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR, 'moderationAdmin.list': { reports: llenos } } });
    await ir('moderacion');
    expect(await screen.findByText('There may be more than what is shown here.', { exact: false })).toBeInTheDocument();
  });

  it('error de la API en la cola: se muestra y se puede reintentar', async () => {
    montar({ respuestas: { 'engineAdmin.status': ESTADO_MOTOR, 'moderationAdmin.list': falla('functions/internal') } });
    await ir('moderacion');
    expect(await screen.findByRole('alert')).toHaveTextContent('The server failed to respond, or could not be reached. Try again.');
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
    await screen.findByText('Overview', { selector: 'h1' });
    await ir('resumen');
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
