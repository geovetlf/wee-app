import { describe, expect, it } from 'vitest';
import { CREDITS_POR_USD_DE_REFERENCIA, fechaEnMs, leerCostes, leerEstadisticasDeCredits, leerEstadoDelMotor, leerHistorial, leerReportes, leerSaldo, leerTransacciones } from './modelos';

describe('los lectores de respuestas', () => {
  it('toleran basura sin romper ni inventar datos', () => {
    for (const basura of [undefined, null, 5, 'x', [], {}, { providers: 'no', routing: 3, global: 'x', daily: {} }]) {
      expect(leerEstadoDelMotor(basura).proveedores).toEqual([]);
      expect(leerEstadisticasDeCredits(basura).vacio).toBe(true);
      expect(leerTransacciones(basura)).toEqual([]);
      expect(leerReportes(basura)).toEqual([]);
      expect(leerHistorial(basura)).toEqual([]);
      expect(leerCostes(basura)).toEqual({ servicios: [] });
    }
    expect(leerSaldo(null)).toBeNull();
    expect(leerSaldo({ balance: 'mucho' })).toBeNull();
  });

  it('leen el estado del motor con la forma que devuelve engineAdmin', () => {
    const m = leerEstadoDelMotor({
      source: 'defaults',
      settings: { pricingMode: 'simulated', creditsPerUsd: 100, margin: 0.5, defaultPolicy: 'balanced', allowMockFallback: true, iaDetenida: true },
      providers: [{ id: 'gemini', name: 'Gemini', modalities: ['text'], configured: false, enabled: true, priority: 10, health: { failures: 2 }, models: [{ id: 'g1', cost: '$1/1M', verified: true }] }],
      routing: [{ capability: 'text.generate', policy: 'balanced', chain: [{ provider: 'gemini', model: 'g1' }, { provider: 'deepseek' }] }],
    });
    expect(m.iaDetenida).toBe(true);
    expect(m.maxUsdPorDia).toBeUndefined();
    expect(m.proveedores[0]).toMatchObject({ id: 'gemini', configurado: false, habilitado: true, fallos: 2 });
    expect(m.rutas[0].cadena).toEqual(['gemini/g1', 'deepseek']);
  });

  it('leen saldo, historial y estadísticas', () => {
    expect(leerSaldo({ userId: 'u', balance: 7, lifetimeEarned: 10, lifetimeSpent: 3, initialized: false })).toEqual({ userId: 'u', saldo: 7, ganadoEnTotal: 10, gastadoEnTotal: 3, inicializado: false });
    expect(leerTransacciones({ items: [{ id: 'a', type: 'usage', amount: -3, createdAt: { _seconds: 10, _nanoseconds: 0 } }, 'x'] })).toEqual([
      { id: 'a', tipo: 'usage', estado: undefined, importe: -3, saldoDespues: undefined, servicio: undefined, motivo: undefined, origen: undefined, creada: 10000 },
    ]);
    const e = leerEstadisticasDeCredits({ global: { totalSpent: 5, circulating: 20 }, daily: [{ id: 'daily_2026-10-01', totalSpent: 1 }] });
    expect(e.vacio).toBe(false);
    expect(e.global.gastados).toBe(5);
    expect(e.diario[0].gastados).toBe(1);
  });

  it('los costes son solo Credits por servicio: el catálogo heredado de paquetes se ignora', () => {
    const c = leerCostes({
      costs: { ai_image: 10, ai_text: 2, raro: 'x' },
      packages: [{ id: 'blackpro', name: 'Black Pro', credits: 200, priceUsd: 19.9 }, { id: 'basic', name: 'Básico', credits: 40, priceUsd: 4.99 }],
    });
    expect(c).toEqual({ servicios: [{ servicio: 'ai_image', credits: 10 }, { servicio: 'ai_text', credits: 2 }] });
    expect(JSON.stringify(c)).not.toMatch(/black|pro\b|basic|básico|packages|priceUsd/i);
  });

  it('la conversión de referencia es US$ 1 = 100 Credits y se lee del motor', () => {
    expect(CREDITS_POR_USD_DE_REFERENCIA).toBe(100);
    expect(leerEstadoDelMotor({ settings: { creditsPerUsd: 100 } }).creditsPorUsd).toBe(100);
    expect(leerEstadoDelMotor({ settings: {} }).creditsPorUsd).toBeUndefined();
  });

  it('leen reportes e historial de moderación', () => {
    const r = leerReportes({ reports: [{ reportId: 'rep_x', status: 'RECEIVED', reason: 'SPAM', targetType: 'POST', targetId: 'p1', createdAt: 5, historyCount: 1 }] });
    expect(r[0]).toMatchObject({ id: 'rep_x', estado: 'RECEIVED', motivo: 'SPAM', creado: 5, entradasDeHistorial: 1 });
    const h = leerHistorial({ history: [{ seq: 1, type: 'CREATED', at: 9, by: { kind: 'REPORTER', id: 'acc' } }] });
    expect(h[0]).toMatchObject({ seq: 1, en: 9, quien: 'REPORTER · acc' });
  });

  it('entienden las formas de fecha de un callable', () => {
    expect(fechaEnMs(1234)).toBe(1234);
    expect(fechaEnMs({ _seconds: 2 })).toBe(2000);
    expect(fechaEnMs('2026-01-01T00:00:00Z')).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(fechaEnMs('no es fecha')).toBeUndefined();
    expect(fechaEnMs(null)).toBeUndefined();
  });
});
