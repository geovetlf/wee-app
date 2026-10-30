import { createContext, useContext } from 'react';
import type { ClienteDeAdmin } from './api/cliente';
import type { ServicioDeSesion } from './auth/sesion';

/** Lo que la app necesita de fuera. En producción lo arma `main.tsx` con Firebase; en las pruebas, dobles. */
export interface Servicios {
  cliente: ClienteDeAdmin;
  sesion: ServicioDeSesion;
}

export const ContextoDeCliente = createContext<ClienteDeAdmin | null>(null);

/** El cliente que usan las vistas: el que vigila las respuestas de acceso denegado (ver `Consola`). */
export const useCliente = (): ClienteDeAdmin => {
  const cliente = useContext(ContextoDeCliente);
  if (!cliente) throw new Error('useCliente fuera de la consola');
  return cliente;
};
