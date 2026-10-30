import { useCallback, useEffect, useRef, useState } from 'react';
import type { NombreDeAccion, ParametrosPorAccion } from './api/acciones';
import { ErrorDeAdmin, clasificarError } from './api/errores';
import { useCliente } from './servicios';

export type EstadoDeCarga<T> =
  | { fase: 'inactivo' }
  | { fase: 'cargando' }
  | { fase: 'vacio' }
  | { fase: 'ok'; datos: T }
  | { fase: 'error'; error: ErrorDeAdmin };

/**
 * Pide una acción de la lista permitida y la deja en uno de cinco estados. `parametros === null` = todavía no se
 * pide (por ejemplo, el formulario de una cuenta aún sin enviar). Una respuesta que llega tarde, de una petición
 * ya superada, se descarta. `esVacio` decide cuándo «ok» es en realidad «sin datos».
 */
export function useAccion<A extends NombreDeAccion, T>(
  accion: A,
  parametros: ParametrosPorAccion[A] | null,
  leer: (crudo: unknown) => T,
  esVacio: (datos: T) => boolean = () => false,
): { estado: EstadoDeCarga<T>; recargar: () => void } {
  const cliente = useCliente();
  const [estado, setEstado] = useState<EstadoDeCarga<T>>(parametros === null ? { fase: 'inactivo' } : { fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const ultimo = useRef(0);
  const clave = JSON.stringify(parametros);
  const leerRef = useRef(leer);
  const vacioRef = useRef(esVacio);
  leerRef.current = leer;
  vacioRef.current = esVacio;

  useEffect(() => {
    if (parametros === null) {
      setEstado({ fase: 'inactivo' });
      return;
    }
    const numero = ++ultimo.current;
    setEstado({ fase: 'cargando' });
    cliente.llamar(accion, parametros as ParametrosPorAccion[A]).then(
      (crudo) => {
        if (numero !== ultimo.current) return;
        const datos = leerRef.current(crudo);
        setEstado(vacioRef.current(datos) ? { fase: 'vacio' } : { fase: 'ok', datos });
      },
      (error) => {
        if (numero !== ultimo.current) return;
        setEstado({ fase: 'error', error: clasificarError(error) });
      },
    );
    return () => {
      ultimo.current++;
    };
    // `clave` representa a `parametros` por valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, accion, clave, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);
  return { estado, recargar };
}
