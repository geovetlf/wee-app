import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NOMBRES_DE_ACCION } from './api/acciones';
import { DOMINIOS, estadoDeDominio } from './dominios';
import { es } from './i18n/es';
import { en } from './i18n/en';

/* El catálogo no es decoración: si dice que algo funciona, tiene que salir de una acción real, y el documento dice lo mismo. */
describe('catálogo de dominios', () => {
  it('son los 16, de la A a la P', () => {
    expect(DOMINIOS.map((d) => d.id).join('')).toBe('abcdefghijklmnop');
  });

  it('nada es operativo ni parcial sin una acción de la lista permitida detrás', () => {
    const permitidas = new Set<string>(NOMBRES_DE_ACCION);
    for (const d of DOMINIOS) for (const f of d.funciones) {
      if (f.estado === 'pendiente') expect(f.fuente, `${d.id}.${f.clave}`).toBeUndefined();
      else expect(f.fuente?.length, `${d.id}.${f.clave}`).toBeGreaterThan(0);
      for (const a of f.fuente ?? []) expect(permitidas.has(a), a).toBe(true);
    }
  });

  it('un dominio sin pantalla no puede tener nada real, y uno pendiente no tiene pantalla', () => {
    for (const d of DOMINIOS) expect(d.rutas.length === 0, d.id).toBe(estadoDeDominio(d) === 'pendiente');
  });

  it('las recargas siguen pendientes, y el Copilot no existe', () => {
    expect(DOMINIOS.find((d) => d.id === 'c')?.funciones.find((f) => f.clave === 'recargas')?.estado).toBe('pendiente');
    expect(estadoDeDominio(DOMINIOS.find((d) => d.id === 'n')!)).toBe('pendiente');
  });

  it('cada dominio y función tiene sus textos en los dos idiomas', () => {
    for (const d of DOMINIOS) for (const dic of [es, en]) {
      const entrada = (dic.admin.dominios.lista as Record<string, { nombre: string; funciones: Record<string, string> }>)[d.id];
      expect(entrada?.nombre, d.id).toBeTruthy();
      for (const f of d.funciones) expect(entrada.funciones[f.clave], `${d.id}.${f.clave}`).toBeTruthy();
    }
  });

  it('el documento dice el mismo estado que el código', () => {
    const doc = fs.readFileSync(path.resolve(__dirname, '../../docs/admin-console/WEE_ADMIN_CONSOLE_DOMAIN_CATALOG.md'), 'utf8');
    for (const d of DOMINIOS) {
      const fila = doc.match(new RegExp(`^\\| ${d.id.toUpperCase()} \\|[^|]*\\| \\*\\*(\\w+)\\*\\*`, 'm'));
      expect(fila?.[1]?.toLowerCase(), d.id).toBe(estadoDeDominio(d));
    }
  });
});
