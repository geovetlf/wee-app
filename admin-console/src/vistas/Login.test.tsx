import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clasificarErrorDeInicio, validarAcceso, type ServicioDeSesion } from '../auth/sesion';
import { ProveedorDeIdioma } from '../i18n/i18n';
import { Login } from './Login';

const montar = (entrar: ServicioDeSesion['entrar'] = vi.fn(async () => undefined)) => {
  const sesion: ServicioDeSesion = { observar: () => () => undefined, entrar, salir: vi.fn(async () => undefined) };
  render(<ProveedorDeIdioma inicial="en"><Login sesion={sesion} /></ProveedorDeIdioma>);
  return { entrar };
};
const correo = () => screen.getByLabelText('Email');
const clave = () => screen.getByLabelText('Password');
const boton = () => screen.getByRole('button', { name: /^Sign(ing)? in/ });

afterEach(() => cleanup());

describe('validarAcceso', () => {
  it('correo vacío, mal formado y contraseña vacía; la longitud de la contraseña no se juzga', () => {
    expect(validarAcceso('', '')).toEqual({ correo: 'vacio', clave: 'vacia' });
    for (const malo of ['a', 'a@b', '@b.c', 'a b@c.d', 'a@b@c.d']) expect(validarAcceso(malo, 'x').correo).toBe('formato');
    expect(validarAcceso('a@b.c', 'x')).toEqual({});
  });
});

describe('clasificarErrorDeInicio', () => {
  it('no distingue una cuenta inexistente, deshabilitada o una contraseña mala', () => {
    for (const c of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/user-disabled']) expect(clasificarErrorDeInicio(new Error(c))).toBe('credenciales');
  });
  it('el resto de códigos, y lo que no es un error conocido', () => {
    expect(clasificarErrorDeInicio(new Error('auth/invalid-email'))).toBe('correo');
    expect(clasificarErrorDeInicio(new Error('auth/too-many-requests'))).toBe('demasiados');
    expect(clasificarErrorDeInicio(new Error('auth/network-request-failed'))).toBe('red');
    expect(clasificarErrorDeInicio(new Error('auth/operation-not-allowed'))).toBe('otro');
    expect(clasificarErrorDeInicio('cualquier cosa')).toBe('otro');
  });
});

describe('el formulario', () => {
  it('solo ofrece correo y contraseña: ningún otro método de entrada', () => {
    montar();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Show', 'Sign in']);
    expect(document.querySelectorAll('input')).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/google|apple|facebook|anonym|guest|invitad/i);
  });

  it('vacío: dice qué falta, marca los campos, va al primero y no llama al servidor', async () => {
    const { entrar } = montar();
    await userEvent.click(boton());
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(correo()).toHaveAttribute('aria-invalid', 'true');
    expect(correo()).toHaveAccessibleDescription('Enter your email.');
    expect(clave()).toHaveAccessibleDescription('Enter your password.');
    expect(correo()).toHaveFocus();
    expect(entrar).not.toHaveBeenCalled();
  });

  it('correo mal formado: lo dice y no llama al servidor; al corregirlo, el aviso se va', async () => {
    const { entrar } = montar();
    await userEvent.type(correo(), 'sin-arroba');
    await userEvent.type(clave(), 'x');
    await userEvent.click(boton());
    expect(screen.getByText('Enter a valid email, like name@domain.com.')).toBeInTheDocument();
    expect(entrar).not.toHaveBeenCalled();
    await userEvent.type(correo(), '@b.c');
    expect(screen.queryByText('Enter a valid email, like name@domain.com.')).not.toBeInTheDocument();
    expect(correo()).not.toHaveAttribute('aria-invalid');
  });

  it('envía el correo sin espacios y la contraseña tal cual, también con Intro', async () => {
    const { entrar } = montar();
    await userEvent.type(correo(), '  a@b.c ');
    await userEvent.type(clave(), ' clave con espacios {Enter}');
    expect(entrar).toHaveBeenCalledWith('a@b.c', ' clave con espacios ');
  });

  it('dos envíos en el mismo instante, y otros mientras espera: una sola petición', async () => {
    let terminar: () => void = () => undefined;
    const entrar = vi.fn(() => new Promise<void>((r) => { terminar = r; }));
    montar(entrar);
    await userEvent.type(correo(), 'a@b.c');
    await userEvent.type(clave(), 'x');
    const formulario = correo().closest('form')!;
    act(() => { fireEvent.submit(formulario); fireEvent.submit(formulario); });
    fireEvent.submit(formulario);
    await userEvent.type(clave(), '{Enter}');
    expect(entrar).toHaveBeenCalledTimes(1);
    await act(async () => { terminar(); });
  });

  it('mientras entra: botón ocupado, campos de solo lectura, y al terminar con error se puede repetir', async () => {
    let fallar: (e: Error) => void = () => undefined;
    const entrar = vi.fn(() => new Promise<void>((_, r) => { fallar = r; }));
    montar(entrar);
    await userEvent.type(correo(), 'a@b.c');
    await userEvent.type(clave(), 'x');
    await userEvent.click(boton());
    expect(boton()).toBeDisabled();
    expect(boton()).toHaveTextContent('Signing in…');
    expect(correo().closest('form')).toHaveAttribute('aria-busy', 'true');
    expect(correo()).toHaveAttribute('readonly');
    expect(clave()).toHaveAttribute('readonly');
    await act(async () => { fallar(new Error('auth/wrong-password')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
    expect(boton()).toBeEnabled();
    expect(clave()).toHaveFocus();
    await userEvent.click(boton());
    expect(entrar).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => { fallar(new Error('auth/network-request-failed')); });
  });

  it.each([
    ['auth/too-many-requests', 'Too many attempts. Wait a moment.'],
    ['auth/network-request-failed', 'Could not reach the Auth emulator. Is it running?'],
    ['auth/invalid-email', 'Enter a valid email, like name@domain.com.'],
    ['auth/internal-error', 'Could not sign in.'],
  ])('%s: un mensaje comprensible, sin el código', async (codigo, mensaje) => {
    montar(vi.fn(async () => { throw new Error(codigo); }));
    await userEvent.type(correo(), 'a@b.c');
    await userEvent.type(clave(), 'x');
    await userEvent.click(boton());
    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
    expect(document.body.textContent).not.toContain('auth/');
  });

  it('mostrar y ocultar la contraseña no envía nada, y al enviar se vuelve a ocultar', async () => {
    const { entrar } = montar();
    await userEvent.type(clave(), 'x');
    expect(clave()).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(clave()).toHaveAttribute('type', 'text');
    expect(clave()).toHaveValue('x');
    expect(entrar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(clave()).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    await userEvent.type(correo(), 'a@b.c');
    await userEvent.click(boton());
    await waitFor(() => expect(entrar).toHaveBeenCalled());
    expect(clave()).toHaveAttribute('type', 'password');
  });

  it('los campos ayudan al gestor de contraseñas y el orden del teclado es el natural', async () => {
    montar();
    expect(correo()).toHaveAttribute('autocomplete', 'username');
    expect(clave()).toHaveAttribute('autocomplete', 'current-password');
    correo().focus();
    await userEvent.tab();
    expect(clave()).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveFocus();
    await userEvent.tab();
    expect(boton()).toHaveFocus();
  });
});
