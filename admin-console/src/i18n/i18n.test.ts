import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { crearTraductor } from '../../../i18n/traducir';
import { ESTADOS_DE_REPORTE } from '../api/acciones';
import type { TipoDeError } from '../api/errores';
import { DICCIONARIOS_DE_LA_CONSOLA } from './i18n';
import { en } from './en';
import { es } from './es';

const aplanar = (nodo: unknown, prefijo = ''): string[] =>
  typeof nodo === 'string' ? [prefijo] : Object.entries(nodo as Record<string, unknown>).flatMap(([k, v]) => aplanar(v, prefijo ? `${prefijo}.${k}` : k));

const fuentes = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'pruebas' ? [] : fuentes(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });

describe('i18n de la consola', () => {
  const clavesEs = aplanar(es).sort();

  it('español e inglés tienen exactamente las mismas claves', () => {
    expect(aplanar(en).sort()).toEqual(clavesEs);
  });

  it('todas las claves escritas con t(\'…\') existen en los dos idiomas', () => {
    const raiz = path.resolve(__dirname, '..');
    const usadas = new Set<string>();
    for (const f of fuentes(raiz)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([\w.]+)'/g)) usadas.add(m[1]);
    expect(usadas.size).toBeGreaterThan(50);
    for (const clave of usadas) {
      const existe = clavesEs.includes(clave) || clavesEs.some((k) => k.startsWith(`${clave}_`));
      expect(existe, clave).toBe(true);
    }
  });

  it('las claves dinámicas (estados, errores, rutas, idiomas) existen', () => {
    const tipos: TipoDeError[] = ['sin-sesion', 'denegado', 'no-encontrado', 'argumento', 'sin-conexion', 'servidor', 'desconocido'];
    const esperadas = [
      ...tipos.map((t) => `admin.errores.${t}`),
      ...ESTADOS_DE_REPORTE.map((s) => `admin.moderacion.estados.${s}`),
      ...['resumen', 'credits', 'moderacion'].map((r) => `admin.nav.${r}`),
      'admin.idioma.es', 'admin.idioma.en',
      'admin.arranque.proyectoNoDemo', 'admin.arranque.hostNoLocal', 'admin.arranque.puertoInvalido',
      'admin.login.errorCredenciales', 'admin.login.errorDemasiados', 'admin.login.errorRed', 'admin.login.errorOtro',
    ];
    for (const k of esperadas) expect(clavesEs, k).toContain(k);
  });

  it('usa el traductor de Weë: plurales por Intl.PluralRules e interpolación', () => {
    const t = crearTraductor('en', DICCIONARIOS_DE_LA_CONSOLA);
    expect(t('admin.moderacion.contador', { contador: 1 })).toBe('1 report');
    expect(t('admin.moderacion.contador', { contador: 2 })).toBe('2 reports');
    expect(t('admin.sesion.conectadoComo', { email: 'a@b.c' })).toBe('Signed in: a@b.c');
    const tes = crearTraductor('es-PE', DICCIONARIOS_DE_LA_CONSOLA);
    expect(tes('admin.moderacion.contador', { contador: 3 })).toBe('3 reportes');
  });
});
