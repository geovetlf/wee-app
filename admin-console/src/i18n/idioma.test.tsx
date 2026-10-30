import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { crearCliente } from '../api/cliente';
import type { ServicioDeSesion, UsuarioDeSesion } from '../auth/sesion';
import { en } from './en';
import { es } from './es';
import { CLAVE_DE_IDIOMA, IDIOMAS_DE_LA_CONSOLA, IDIOMA_POR_DEFECTO, leerIdiomaGuardado } from './i18n';

const ADMIN: UsuarioDeSesion = { uid: 'admin1', email: 'admin@demo.local' };

const montar = (usuario: UsuarioDeSesion | null = null, idiomaInicial?: 'es' | 'en') => {
  const sesion: ServicioDeSesion = {
    observar: (cb) => { cb(usuario); return () => undefined; },
    entrar: vi.fn(async () => undefined),
    salir: vi.fn(async () => undefined),
  };
  return render(<App servicios={{ cliente: crearCliente(async () => ({})), sesion }} idiomaInicial={idiomaInicial} />);
};

const selector = () => screen.getByRole('combobox') as HTMLSelectElement;

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
  document.documentElement.lang = '';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('idioma por defecto', () => {
  it('es el español, aunque el navegador pida inglés, y no se guarda por sí solo', async () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['en-US', 'en']);
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
    montar();
    expect(await screen.findByRole('heading', { name: 'Entrar a la consola' })).toBeInTheDocument();
    expect(IDIOMA_POR_DEFECTO).toBe('es');
    expect(selector().value).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expect(window.localStorage.getItem(CLAVE_DE_IDIOMA)).toBeNull();
  });

  it('solo hay dos idiomas: español e inglés', () => {
    expect([...IDIOMAS_DE_LA_CONSOLA]).toEqual(['es', 'en']);
    montar();
    expect(Array.from(selector().options).map((o) => o.value)).toEqual(['es', 'en']);
  });
});

describe('cambio de idioma', () => {
  it('cambia los textos, el atributo lang y la preferencia guardada, en los dos sentidos', async () => {
    montar();
    await userEvent.selectOptions(await screen.findByLabelText('Idioma'), 'en');
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem(CLAVE_DE_IDIOMA)).toBe('en');

    await userEvent.selectOptions(screen.getByLabelText('Language'), 'es');
    expect(await screen.findByRole('heading', { name: 'Entrar a la consola' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('es');
    expect(window.localStorage.getItem(CLAVE_DE_IDIOMA)).toBe('es');
  });

  it('también cambia dentro de la consola con sesión', async () => {
    montar(ADMIN);
    expect(await screen.findByRole('heading', { name: 'Resumen' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Idioma'), 'en');
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('persistencia', () => {
  it('lo elegido se recuerda al volver a abrir la consola', async () => {
    window.localStorage.setItem(CLAVE_DE_IDIOMA, 'en');
    const primera = montar();
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    primera.unmount();
    document.documentElement.lang = '';

    montar();
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('una elección hecha con el selector sobrevive a un «reinicio»', async () => {
    const primera = montar();
    await userEvent.selectOptions(await screen.findByLabelText('Idioma'), 'en');
    primera.unmount();
    montar();
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
  });

  it('un valor guardado que no es es/en se ignora y queda el español', async () => {
    for (const raro of ['fr', 'EN', '', 'es-PE', '{"idioma":"en"}']) {
      window.localStorage.setItem(CLAVE_DE_IDIOMA, raro);
      expect(leerIdiomaGuardado()).toBeNull();
      const vista = montar();
      expect(await screen.findByRole('heading', { name: 'Entrar a la consola' })).toBeInTheDocument();
      vista.unmount();
    }
  });

  it('si el almacenamiento falla, la consola funciona igual y no se rompe al cambiar', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    montar();
    expect(await screen.findByRole('heading', { name: 'Entrar a la consola' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Idioma'), 'en');
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('el idioma de arranque forzado (`inicial`) manda pero no se guarda hasta que alguien elige', async () => {
    window.localStorage.setItem(CLAVE_DE_IDIOMA, 'es');
    montar(null, 'en');
    expect(await screen.findByRole('heading', { name: 'Sign in to the console' })).toBeInTheDocument();
    expect(window.localStorage.getItem(CLAVE_DE_IDIOMA)).toBe('es');
  });
});

describe('todos los textos visibles están traducidos', () => {
  it('español e inglés tienen las mismas claves y solo coinciden en un listado cerrado de marcas y signos', () => {
    const aplanar = (nodo: unknown, prefijo = ''): [string, string][] =>
      typeof nodo === 'string' ? [[prefijo, nodo]] : Object.entries(nodo as Record<string, unknown>).flatMap(([k, v]) => aplanar(v, prefijo ? `${prefijo}.${k}` : k));
    const delEs = aplanar(es), delEn = Object.fromEntries(aplanar(en));
    expect(delEs.map(([k]) => k).sort()).toEqual(Object.keys(delEn).sort());
    const iguales = delEs.filter(([k, v]) => delEn[k] === v).map(([k]) => k).sort();
    expect(iguales).toEqual([
      'admin.app.titulo', 'admin.comun.no', 'admin.comun.sinDato', 'admin.credits.conversionValor', 'admin.credits.costeCredits', 'admin.credits.titulo',
      'admin.idioma.en', 'admin.idioma.es', 'admin.nav.credits', 'admin.resumen.preciosReal',
    ]);
  });

  it.each(['es', 'en'] as const)('en %s ninguna pantalla enseña una clave sin traducir', async (idioma) => {
    const patron = /\badmin\.[a-zA-Z]+\.[a-zA-Z_.]+/;
    const sesion = montar(null, idioma);
    expect(document.body.textContent).not.toMatch(patron);
    sesion.unmount();

    for (const ruta of ['resumen', 'credits', 'moderacion']) {
      window.location.hash = `#/${ruta}`;
      const vista = montar(ADMIN, idioma);
      await screen.findByRole('navigation');
      await act(async () => { await Promise.resolve(); });
      expect(document.body.textContent, `${idioma}/${ruta}`).not.toMatch(patron);
      vista.unmount();
    }
  });
});
