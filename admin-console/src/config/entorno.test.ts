import { describe, expect, it } from 'vitest';
import { resolverEntorno } from './entorno';

describe('el entorno de la consola (Unidad 1: solo emuladores)', () => {
  it('por defecto: demo-wee en 127.0.0.1', () => {
    expect(resolverEntorno({})).toEqual({
      ok: true,
      entorno: { proyecto: 'demo-wee', region: 'us-central1', auth: { host: '127.0.0.1', port: 9099 }, functions: { host: '127.0.0.1', port: 5001 } },
    });
  });

  it('rechaza un proyecto que no es demo-*', () => {
    expect(resolverEntorno({ VITE_FIREBASE_PROJECT_ID: 'get-wee' })).toEqual({ ok: false, motivo: 'proyecto-no-demo' });
    expect(resolverEntorno({ VITE_FIREBASE_PROJECT_ID: 'wee-dev-geovet' })).toEqual({ ok: false, motivo: 'proyecto-no-demo' });
  });

  it('rechaza hosts que no son de esta máquina', () => {
    expect(resolverEntorno({ VITE_AUTH_EMULATOR_HOST: 'identitytoolkit.googleapis.com' })).toEqual({ ok: false, motivo: 'host-no-local' });
    expect(resolverEntorno({ VITE_FUNCTIONS_EMULATOR_HOST: '10.0.0.5' })).toEqual({ ok: false, motivo: 'host-no-local' });
  });

  it('rechaza puertos inválidos', () => {
    expect(resolverEntorno({ VITE_AUTH_EMULATOR_PORT: 'abc' })).toEqual({ ok: false, motivo: 'puerto-invalido' });
    expect(resolverEntorno({ VITE_FUNCTIONS_EMULATOR_PORT: '70000' })).toEqual({ ok: false, motivo: 'puerto-invalido' });
  });
});
